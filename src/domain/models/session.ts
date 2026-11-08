/**
 * Bounded Context: ActiveVisitExecutionContext
 * Aggregate Root: VisitorSession
 * Value Object: PropertyEvaluation
 */

import { VisitTour } from './tour';

export type DecisionType = 'LIKED' | 'DISCARDED' | 'DOUBT';
export type VisitorSlot = 'VISITOR_1' | 'VISITOR_2';
export type SessionStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

export interface PropertyEvaluation {
  propertyId: string;
  decision: DecisionType;
  notes: string;
  fencingToken: number; // Monotonically increasing counter (1, 2, 3...)
  idempotencyKey: string; // Deterministic idempotency token
  updatedAtIso: string;
}

export interface VisitorSession {
  sessionId: string;
  tourId: string;
  visitorSlot: VisitorSlot;
  visitorName: string;
  status: SessionStatus;
  currentStopIndex: number; // 0-based index (0..N-1)
  evaluations: Record<string, PropertyEvaluation>; // Keyed by propertyId
  updatedAtIso: string;
}

/**
 * Generates deterministic RFC-9110 compliant idempotency key.
 */
export function generateIdempotencyKey(
  tourId: string,
  slot: VisitorSlot,
  propertyId: string,
  fencingToken: number
): string {
  return `${tourId}:${slot}:${propertyId}:${fencingToken}`;
}

/**
 * Initializes a new visitor session for a tour slot.
 */
export function createVisitorSession(
  tour: VisitTour,
  slot: VisitorSlot,
  sessionId?: string
): VisitorSession {
  const visitorName = slot === 'VISITOR_1' ? tour.visitor1Name : (tour.visitor2Name || 'Visitante 2');
  return {
    sessionId: sessionId || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `sess-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`),
    tourId: tour.id,
    visitorSlot: slot,
    visitorName,
    status: 'NOT_STARTED',
    currentStopIndex: 0,
    evaluations: {},
    updatedAtIso: new Date().toISOString(),
  };
}

/**
 * Transitions session from NOT_STARTED to IN_PROGRESS.
 */
export function startVisitorSession(session: VisitorSession): VisitorSession {
  if (session.status !== 'NOT_STARTED') return session;
  return {
    ...session,
    status: 'IN_PROGRESS',
    updatedAtIso: new Date().toISOString(),
  };
}

/**
 * Saves or updates an evaluation draft with atomic monotonic fencing token increment.
 */
export function saveEvaluationDraft(
  session: VisitorSession,
  propertyId: string,
  draft: { decision?: DecisionType; notes?: string }
): VisitorSession {
  const existing = session.evaluations[propertyId];
  const fencingToken = (existing?.fencingToken || 0) + 1;
  const decision = draft.decision ?? existing?.decision ?? 'DOUBT';
  const notes = draft.notes !== undefined ? draft.notes : (existing?.notes || '');
  const updatedAtIso = new Date().toISOString();

  const evaluation: PropertyEvaluation = {
    propertyId,
    decision,
    notes,
    fencingToken,
    idempotencyKey: generateIdempotencyKey(session.tourId, session.visitorSlot, propertyId, fencingToken),
    updatedAtIso,
  };

  return {
    ...session,
    status: session.status === 'NOT_STARTED' ? 'IN_PROGRESS' : session.status,
    evaluations: {
      ...session.evaluations,
      [propertyId]: evaluation,
    },
    updatedAtIso,
  };
}

/**
 * Advances the session stop index or completes session if at last stop.
 */
export function advanceSessionStop(
  session: VisitorSession,
  totalStops: number
): VisitorSession {
  const isLastStop = session.currentStopIndex >= totalStops - 1;
  const nextIndex = isLastStop ? session.currentStopIndex : session.currentStopIndex + 1;
  const nextStatus: SessionStatus = isLastStop ? 'COMPLETED' : 'IN_PROGRESS';

  return {
    ...session,
    currentStopIndex: nextIndex,
    status: nextStatus,
    updatedAtIso: new Date().toISOString(),
  };
}

/**
 * Reconciles concurrent evaluation writes using Kleppmann monotonic fencing tokens.
 * Higher fencingToken wins.
 */
export function mergeEvaluationWithFencing(
  current?: PropertyEvaluation,
  incoming?: PropertyEvaluation
): PropertyEvaluation | undefined {
  if (!current) return incoming;
  if (!incoming) return current;
  return incoming.fencingToken > current.fencingToken ? incoming : current;
}
