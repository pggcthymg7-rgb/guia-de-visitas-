import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { VisitTour } from '@/domain/models/tour';
import type { VisitorSession, DecisionType } from '@/domain/models/session';

export const DB_NAME = 'guia-visitas-db';
export const DB_VERSION = 1;

export interface GuiaVisitasDB extends DBSchema {
  tours: {
    key: string;
    value: VisitTour;
    indexes: { 'by-date': string };
  };
  sessions: {
    key: string;
    value: VisitorSession;
    indexes: {
      'by-tour': string;
      'by-tour-slot': [string, string];
    };
  };
}

export interface IStorageService {
  saveTour(tour: VisitTour): Promise<void>;
  getTour(tourId: string): Promise<VisitTour | null>;
  getAllTours(): Promise<VisitTour[]>;
  deleteTour(tourId: string): Promise<void>;

  saveSession(session: VisitorSession): Promise<void>;
  getSession(tourId: string, slot: 'VISITOR_1' | 'VISITOR_2'): Promise<VisitorSession | null>;
  getAllSessionsForTour(tourId: string): Promise<VisitorSession[]>;
  deleteSession(sessionId: string): Promise<void>;

  // Zero Data Loss: Immediate Keystroke Auto-Save
  saveDraftNote(
    tourId: string,
    slot: 'VISITOR_1' | 'VISITOR_2',
    propertyId: string,
    draft: { decision?: DecisionType; notes?: string; fencingToken?: number }
  ): Promise<void>;
  getDraftNote(
    tourId: string,
    slot: 'VISITOR_1' | 'VISITOR_2',
    propertyId: string
  ): Promise<{ decision?: DecisionType; notes?: string; fencingToken?: number } | null>;

  clearAll(): Promise<void>;
}

// LocalStorage fallback keys
const LS_PREFIX = 'guia_visitas_';
const LS_TOURS_KEY = `${LS_PREFIX}tours`;
const LS_SESSIONS_KEY = `${LS_PREFIX}sessions`;
const LS_DRAFT_PREFIX = `${LS_PREFIX}draft_`;

function safeLocalStorageGet<T>(key: string): T | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch (err) {
    console.warn(`[StorageFallback] Failed to read "${key}" from localStorage:`, err);
    return null;
  }
}

function safeLocalStorageSet(key: string, value: unknown): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.warn(`[StorageFallback] Failed to write "${key}" to localStorage:`, err);
    return false;
  }
}

function safeLocalStorageRemove(key: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
    }
  } catch (err) {
    console.warn(`[StorageFallback] Failed to remove "${key}" from localStorage:`, err);
  }
}

export class IndexedDbStorageService implements IStorageService {
  private dbPromise: Promise<IDBPDatabase<GuiaVisitasDB>> | null = null;
  private isIdbAvailable = true;

  private async getDb(): Promise<IDBPDatabase<GuiaVisitasDB> | null> {
    if (!this.isIdbAvailable || typeof window === 'undefined' || !('indexedDB' in window)) {
      this.isIdbAvailable = false;
      return null;
    }

    if (!this.dbPromise) {
      this.dbPromise = openDB<GuiaVisitasDB>(DB_NAME, DB_VERSION, {
        upgrade(db) {
          if (!db.objectStoreNames.contains('tours')) {
            const tourStore = db.createObjectStore('tours', { keyPath: 'id' });
            tourStore.createIndex('by-date', 'visitDate');
          }
          if (!db.objectStoreNames.contains('sessions')) {
            const sessionStore = db.createObjectStore('sessions', { keyPath: 'sessionId' });
            sessionStore.createIndex('by-tour', 'tourId');
            sessionStore.createIndex('by-tour-slot', ['tourId', 'visitorSlot']);
          }
        },
      }).catch((err) => {
        console.warn('[IndexedDbStorage] IndexedDB initialization failed, falling back to localStorage:', err);
        this.isIdbAvailable = false;
        return null as unknown as IDBPDatabase<GuiaVisitasDB>;
      });
    }

    const db = await this.dbPromise;
    if (!db) {
      this.isIdbAvailable = false;
      return null;
    }
    return db;
  }

  // Tour Management
  async saveTour(tour: VisitTour): Promise<void> {
    // 1. Dual-write to localStorage for immediate resilience
    const toursMap = safeLocalStorageGet<Record<string, VisitTour>>(LS_TOURS_KEY) || {};
    toursMap[tour.id] = tour;
    safeLocalStorageSet(LS_TOURS_KEY, toursMap);

    // 2. Primary write to IndexedDB
    try {
      const db = await this.getDb();
      if (db) {
        await db.put('tours', tour);
      }
    } catch (err) {
      console.warn('[IndexedDbStorage] Error saving tour to IndexedDB:', err);
    }
  }

  async getTour(tourId: string): Promise<VisitTour | null> {
    try {
      const db = await this.getDb();
      if (db) {
        const item = await db.get('tours', tourId);
        if (item) return item;
      }
    } catch (err) {
      console.warn('[IndexedDbStorage] Error reading tour from IndexedDB:', err);
    }

    // Fallback: localStorage
    const toursMap = safeLocalStorageGet<Record<string, VisitTour>>(LS_TOURS_KEY);
    return toursMap?.[tourId] || null;
  }

  async getAllTours(): Promise<VisitTour[]> {
    try {
      const db = await this.getDb();
      if (db) {
        return await db.getAll('tours');
      }
    } catch (err) {
      console.warn('[IndexedDbStorage] Error reading all tours from IndexedDB:', err);
    }

    // Fallback: localStorage
    const toursMap = safeLocalStorageGet<Record<string, VisitTour>>(LS_TOURS_KEY) || {};
    return Object.values(toursMap);
  }

  async deleteTour(tourId: string): Promise<void> {
    // 1. Remove from localStorage
    const toursMap = safeLocalStorageGet<Record<string, VisitTour>>(LS_TOURS_KEY) || {};
    delete toursMap[tourId];
    safeLocalStorageSet(LS_TOURS_KEY, toursMap);

    // 2. Remove from IndexedDB
    try {
      const db = await this.getDb();
      if (db) {
        await db.delete('tours', tourId);
      }
    } catch (err) {
      console.warn('[IndexedDbStorage] Error deleting tour from IndexedDB:', err);
    }
  }

  // Session Management
  async saveSession(session: VisitorSession): Promise<void> {
    // 1. Dual-write to localStorage
    const sessionsMap = safeLocalStorageGet<Record<string, VisitorSession>>(LS_SESSIONS_KEY) || {};
    sessionsMap[session.sessionId] = session;
    safeLocalStorageSet(LS_SESSIONS_KEY, sessionsMap);

    // 2. Primary write to IndexedDB
    try {
      const db = await this.getDb();
      if (db) {
        await db.put('sessions', session);
      }
    } catch (err) {
      console.warn('[IndexedDbStorage] Error saving session to IndexedDB:', err);
    }
  }

  async getSession(tourId: string, slot: 'VISITOR_1' | 'VISITOR_2'): Promise<VisitorSession | null> {
    const expectedSessionId = `${tourId}_${slot}`;

    try {
      const db = await this.getDb();
      if (db) {
        // Try direct key lookup
        const direct = await db.get('sessions', expectedSessionId);
        if (direct) return direct;

        // Try compound index lookup
        const indexed = await db.getFromIndex('sessions', 'by-tour-slot', [tourId, slot]);
        if (indexed) return indexed;
      }
    } catch (err) {
      console.warn('[IndexedDbStorage] Error reading session from IndexedDB:', err);
    }

    // Fallback: localStorage
    const sessionsMap = safeLocalStorageGet<Record<string, VisitorSession>>(LS_SESSIONS_KEY);
    if (!sessionsMap) return null;

    if (sessionsMap[expectedSessionId]) return sessionsMap[expectedSessionId];
    return Object.values(sessionsMap).find(
      (s) => s.tourId === tourId && s.visitorSlot === slot
    ) || null;
  }

  async getAllSessionsForTour(tourId: string): Promise<VisitorSession[]> {
    try {
      const db = await this.getDb();
      if (db) {
        return await db.getAllFromIndex('sessions', 'by-tour', tourId);
      }
    } catch (err) {
      console.warn('[IndexedDbStorage] Error reading sessions from IndexedDB:', err);
    }

    // Fallback: localStorage
    const sessionsMap = safeLocalStorageGet<Record<string, VisitorSession>>(LS_SESSIONS_KEY) || {};
    return Object.values(sessionsMap).filter((s) => s.tourId === tourId);
  }

  async deleteSession(sessionId: string): Promise<void> {
    const sessionsMap = safeLocalStorageGet<Record<string, VisitorSession>>(LS_SESSIONS_KEY) || {};
    delete sessionsMap[sessionId];
    safeLocalStorageSet(LS_SESSIONS_KEY, sessionsMap);

    try {
      const db = await this.getDb();
      if (db) {
        await db.delete('sessions', sessionId);
      }
    } catch (err) {
      console.warn('[IndexedDbStorage] Error deleting session from IndexedDB:', err);
    }
  }

  // Zero Data Loss: Immediate Keystroke Auto-Save
  async saveDraftNote(
    tourId: string,
    slot: 'VISITOR_1' | 'VISITOR_2',
    propertyId: string,
    draft: { decision?: DecisionType; notes?: string; fencingToken?: number }
  ): Promise<void> {
    const draftKey = `${LS_DRAFT_PREFIX}${tourId}_${slot}_${propertyId}`;
    
    // Synchronous immediate write to localStorage guarantees Zero Data Loss
    safeLocalStorageSet(draftKey, {
      ...draft,
      updatedAtIso: new Date().toISOString(),
    });

    // Update active session asynchronously in background
    try {
      const session = await this.getSession(tourId, slot);
      if (session) {
        const existing = session.evaluations[propertyId];
        session.evaluations[propertyId] = {
          propertyId,
          decision: draft.decision ?? existing?.decision ?? 'DOUBT',
          notes: draft.notes ?? existing?.notes ?? '',
          fencingToken: draft.fencingToken ?? (existing?.fencingToken ? existing.fencingToken + 1 : 1),
          idempotencyKey: `${tourId}_${slot}_${propertyId}_${Date.now()}`,
          updatedAtIso: new Date().toISOString(),
        };
        session.updatedAtIso = new Date().toISOString();
        await this.saveSession(session);
      }
    } catch (err) {
      console.warn('[IndexedDbStorage] Failed to update session evaluations during draft save:', err);
    }
  }

  async getDraftNote(
    tourId: string,
    slot: 'VISITOR_1' | 'VISITOR_2',
    propertyId: string
  ): Promise<{ decision?: DecisionType; notes?: string; fencingToken?: number } | null> {
    // 1. Try instant localStorage draft key
    const draftKey = `${LS_DRAFT_PREFIX}${tourId}_${slot}_${propertyId}`;
    const localDraft = safeLocalStorageGet<{ decision?: DecisionType; notes?: string; fencingToken?: number }>(draftKey);
    if (localDraft) return localDraft;

    // 2. Fall back to reading session evaluations
    const session = await this.getSession(tourId, slot);
    const evaluation = session?.evaluations[propertyId];
    if (evaluation) {
      return {
        decision: evaluation.decision,
        notes: evaluation.notes,
        fencingToken: evaluation.fencingToken,
      };
    }

    return null;
  }

  async clearAll(): Promise<void> {
    if (typeof window !== 'undefined' && window.localStorage) {
      const keysToRemove: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key && key.startsWith(LS_PREFIX)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => safeLocalStorageRemove(k));
    }

    try {
      const db = await this.getDb();
      if (db) {
        await db.clear('tours');
        await db.clear('sessions');
      }
    } catch (err) {
      console.warn('[IndexedDbStorage] Error clearing IndexedDB stores:', err);
    }
  }
}

export const storageService = new IndexedDbStorageService();
