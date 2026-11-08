import { describe, it, expect } from 'vitest';
import { urlCodec } from '@/infrastructure/codecs/urlCodec';
import { createTour, createPropertyStop } from '@/domain/models/tour';
import { createVisitorSession, saveEvaluationDraft } from '@/domain/models/session';

describe('Infrastructure: URL Codec (lz-string)', () => {
  const tour = createTour({
    id: 'tour-codec-test',
    title: 'Roteiro de Mansões',
    visitDate: '2026-11-08',
    brokerName: 'Roberto Silveira',
    visitorCount: 2,
    visitor1Name: 'Mariana Costa',
    visitor2Name: 'Eduardo Fontes',
    stops: [
      createPropertyStop(
        {
          id: 'p1',
          condominiumName: 'Alphaville 1',
          priceCents: 485000000,
          title: 'Mansão',
          fullDescription: 'Descrição',
          facadeImageDataUrl: 'https://example.com/facade.jpg',
        },
        1
      ),
    ],
  });

  it('compresses and decompresses a tour losslessly', () => {
    const encoded = urlCodec.compressTour(tour);
    expect(typeof encoded).toBe('string');
    expect(encoded.length).toBeGreaterThan(0);

    const decoded = urlCodec.decompressTour(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded?.id).toBe(tour.id);
    expect(decoded?.title).toBe(tour.title);
    expect(decoded?.stops).toHaveLength(1);
    expect(decoded?.stops[0].priceCents).toBe(485000000);
  });

  it('compresses and decompresses merge tokens for offline QR/WhatsApp sync', () => {
    let session = createVisitorSession(tour, 'VISITOR_1');
    session = saveEvaluationDraft(session, 'p1', { decision: 'LIKED', notes: 'Gostei muito' });

    const encodedToken = urlCodec.compressMergeToken({
      tourId: session.tourId,
      slot: session.visitorSlot,
      visitorName: session.visitorName,
      evaluations: session.evaluations,
    });

    expect(typeof encodedToken).toBe('string');
    // Merge token is very compact
    expect(encodedToken.length).toBeLessThan(1000);

    const decodedToken = urlCodec.decompressMergeToken(encodedToken);
    expect(decodedToken).not.toBeNull();
    expect(decodedToken?.tourId).toBe(session.tourId);
    expect(decodedToken?.slot).toBe('VISITOR_1');
    expect(decodedToken?.evaluations['p1']?.decision).toBe('LIKED');
  });

  it('compresses and decompresses sessions losslessly', () => {
    const session = createVisitorSession(tour, 'VISITOR_2');
    const encoded = urlCodec.compressSession(session);
    const decoded = urlCodec.decompressSession(encoded);

    expect(decoded).not.toBeNull();
    expect(decoded?.sessionId).toBe(session.sessionId);
    expect(decoded?.visitorSlot).toBe('VISITOR_2');
  });

  it('handles invalid or corrupted payloads gracefully by returning null', () => {
    expect(urlCodec.decompressTour('corrupted_random_payload_12345')).toBeNull();
    expect(urlCodec.decompressTour('')).toBeNull();
    expect(urlCodec.decompressMergeToken('invalid')).toBeNull();
    expect(urlCodec.decompressSession('invalid')).toBeNull();
  });

  it('builds client visit hash with data param', () => {
    const hash = urlCodec.buildClientVisitHash('tour-123', 'VISITOR_1', 'abc123compressed');
    expect(hash).toBe('#/visit/tour-123/VISITOR_1?data=abc123compressed');

    const hashWithoutData = urlCodec.buildClientVisitHash('tour-123', 'VISITOR_2');
    expect(hashWithoutData).toBe('#/visit/tour-123/VISITOR_2');
  });

  it('builds WhatsApp share URLs with encoded text', () => {
    const url = urlCodec.buildWhatsAppShareUrl('+55 11 99999-8888', 'Olá! Aqui está seu roteiro: #/visit/tour-1/VISITOR_1');
    expect(url).toContain('https://api.whatsapp.com/send?phone=5511999998888&text=');
    expect(url).toContain(encodeURIComponent('Olá! Aqui está seu roteiro: #/visit/tour-1/VISITOR_1'));
  });

  it('strips heavy base64 images to keep URL compact when needed', () => {
    const tourWithBase64 = createTour({
      ...tour,
      stops: [
        {
          ...tour.stops[0],
          facadeImageDataUrl: 'data:image/jpeg;base64,veryLargeBase64ImageContentHere',
        },
      ],
    });

    const stripped = urlCodec.stripImagesForCompactUrl(tourWithBase64);
    expect(stripped.stops[0].facadeImageDataUrl).toBe('');
  });
});
