import LZString from 'lz-string';
import type { VisitTour } from '@/domain/models/tour';
import type { VisitorSession, PropertyEvaluation, VisitorSlot } from '@/domain/models/session';

export interface TourUrlPayload {
  v: 1;
  type: 'tour';
  tour: VisitTour;
  exportedAtIso: string;
}

export interface MergeTokenPayload {
  v: 1;
  type: 'merge';
  tourId: string;
  slot: VisitorSlot;
  visitorName: string;
  evaluations: Record<string, PropertyEvaluation>;
  exportedAtIso: string;
}

export interface SessionUrlPayload {
  v: 1;
  type: 'session';
  session: VisitorSession;
  exportedAtIso: string;
}

// 32 KB is the safe recommendation threshold for mobile Safari URL hash
export const SAFE_URL_CHAR_LIMIT = 32000;

export const urlCodec = {
  // Tour Compression
  compressTour(tour: VisitTour): string {
    const payload: TourUrlPayload = {
      v: 1,
      type: 'tour',
      tour,
      exportedAtIso: new Date().toISOString(),
    };
    const json = JSON.stringify(payload);
    return LZString.compressToEncodedURIComponent(json);
  },

  decompressTour(encoded: string): VisitTour | null {
    if (!encoded || typeof encoded !== 'string') return null;

    try {
      const decompressed = LZString.decompressFromEncodedURIComponent(encoded);
      if (!decompressed) return null;

      const payload = JSON.parse(decompressed) as Partial<TourUrlPayload>;
      if (payload && payload.type === 'tour' && payload.tour && payload.tour.id && Array.isArray(payload.tour.stops)) {
        return payload.tour;
      }
      return null;
    } catch (err) {
      console.warn('[urlCodec] Failed to decompress tour payload:', err);
      return null;
    }
  },

  // Merge Token Compression (Offline Cross-Device WhatsApp / QR Sync)
  compressMergeToken(token: Omit<MergeTokenPayload, 'v' | 'type' | 'exportedAtIso'>): string {
    const payload: MergeTokenPayload = {
      v: 1,
      type: 'merge',
      tourId: token.tourId,
      slot: token.slot,
      visitorName: token.visitorName,
      evaluations: token.evaluations,
      exportedAtIso: new Date().toISOString(),
    };
    const json = JSON.stringify(payload);
    return LZString.compressToEncodedURIComponent(json);
  },

  decompressMergeToken(encoded: string): MergeTokenPayload | null {
    if (!encoded || typeof encoded !== 'string') return null;

    try {
      const decompressed = LZString.decompressFromEncodedURIComponent(encoded);
      if (!decompressed) return null;

      const payload = JSON.parse(decompressed) as Partial<MergeTokenPayload>;
      if (payload && payload.type === 'merge' && payload.tourId && payload.slot && payload.evaluations) {
        return payload as MergeTokenPayload;
      }
      return null;
    } catch (err) {
      console.warn('[urlCodec] Failed to decompress merge token:', err);
      return null;
    }
  },

  // Session Compression
  compressSession(session: VisitorSession): string {
    const payload: SessionUrlPayload = {
      v: 1,
      type: 'session',
      session,
      exportedAtIso: new Date().toISOString(),
    };
    const json = JSON.stringify(payload);
    return LZString.compressToEncodedURIComponent(json);
  },

  decompressSession(encoded: string): VisitorSession | null {
    if (!encoded || typeof encoded !== 'string') return null;

    try {
      const decompressed = LZString.decompressFromEncodedURIComponent(encoded);
      if (!decompressed) return null;

      const payload = JSON.parse(decompressed) as Partial<SessionUrlPayload>;
      if (payload && payload.type === 'session' && payload.session && payload.session.sessionId) {
        return payload.session;
      }
      return null;
    } catch (err) {
      console.warn('[urlCodec] Failed to decompress session payload:', err);
      return null;
    }
  },

  // Helpers
  isPayloadTooLargeForUrl(encoded: string, limit = SAFE_URL_CHAR_LIMIT): boolean {
    return (encoded?.length || 0) > limit;
  },

  stripImagesForCompactUrl(tour: VisitTour): VisitTour {
    return {
      ...tour,
      stops: tour.stops.map((stop) => ({
        ...stop,
        // If image is a heavy base64 data URL, strip it to keep URL compact
        facadeImageDataUrl: stop.facadeImageDataUrl.startsWith('data:')
          ? ''
          : stop.facadeImageDataUrl,
      })),
    };
  },

  buildClientVisitHash(tourId: string, slot: VisitorSlot, encodedTourPayload?: string): string {
    const baseHash = `#/visit/${encodeURIComponent(tourId)}/${slot}`;
    if (encodedTourPayload && !this.isPayloadTooLargeForUrl(encodedTourPayload)) {
      return `${baseHash}?data=${encodedTourPayload}`;
    }
    return baseHash;
  },

  buildWhatsAppShareUrl(phone: string | undefined, message: string): string {
    const cleanPhone = phone?.replace(/\D/g, '') || '';
    const phoneParam = cleanPhone ? `phone=${cleanPhone}&` : '';
    return `https://api.whatsapp.com/send?${phoneParam}text=${encodeURIComponent(message)}`;
  },
};
