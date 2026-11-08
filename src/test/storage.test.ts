import { describe, it, expect, beforeEach } from 'vitest';
import { storageService } from '@/infrastructure/storage/indexedDb';
import { createTour, createPropertyStop } from '@/domain/models/tour';
import { createVisitorSession, saveEvaluationDraft } from '@/domain/models/session';

describe('Infrastructure: Storage Service (IndexedDB + localStorage fallback)', () => {
  beforeEach(async () => {
    await storageService.clearAll();
  });

  it('saves and retrieves a tour losslessly', async () => {
    const tour = createTour({
      id: 'tour-test-01',
      title: 'Roteiro Mansões Alphaville',
      visitDate: '2026-11-08',
      brokerName: 'Roberto Silveira',
      visitorCount: 2,
      visitor1Name: 'Mariana Costa',
      visitor2Name: 'Eduardo Fontes',
      stops: [
        createPropertyStop(
          {
            id: 'stop-01',
            condominiumName: 'Alphaville 1',
            priceCents: 485000000,
            title: 'Mansão Lago',
            fullDescription: 'Descrição completa',
            facadeImageDataUrl: 'data:image/svg+xml;base64,placeholder',
          },
          1
        ),
      ],
    });

    await storageService.saveTour(tour);
    const retrieved = await storageService.getTour('tour-test-01');

    expect(retrieved).not.toBeNull();
    expect(retrieved?.id).toBe('tour-test-01');
    expect(retrieved?.title).toBe('Roteiro Mansões Alphaville');
    expect(retrieved?.stops).toHaveLength(1);
    expect(retrieved?.stops[0].priceCents).toBe(485000000);
  });

  it('retrieves all tours and deletes a tour', async () => {
    const tour1 = createTour({ id: 't1', title: 'Tour 1', visitDate: '2026-11-08', brokerName: 'B1', visitorCount: 1, visitor1Name: 'V1', stops: [] });
    const tour2 = createTour({ id: 't2', title: 'Tour 2', visitDate: '2026-11-08', brokerName: 'B2', visitorCount: 1, visitor1Name: 'V2', stops: [] });

    await storageService.saveTour(tour1);
    await storageService.saveTour(tour2);

    const all = await storageService.getAllTours();
    expect(all.length).toBeGreaterThanOrEqual(2);

    await storageService.deleteTour('t1');
    const retrievedT1 = await storageService.getTour('t1');
    expect(retrievedT1).toBeNull();
  });

  it('saves and retrieves visitor sessions', async () => {
    const tour = createTour({
      id: 'tour-sess',
      title: 'Tour',
      visitDate: '2026-11-08',
      brokerName: 'Broker',
      visitorCount: 2,
      visitor1Name: 'Alice',
      visitor2Name: 'Bob',
      stops: [],
    });

    let session = createVisitorSession(tour, 'VISITOR_1', 'sess-01');
    session = saveEvaluationDraft(session, 'prop-1', { decision: 'LIKED', notes: 'Muito bom' });

    await storageService.saveSession(session);

    const retrieved = await storageService.getSession('tour-sess', 'VISITOR_1');
    expect(retrieved).not.toBeNull();
    expect(retrieved?.visitorName).toBe('Alice');
    expect(retrieved?.evaluations['prop-1']?.decision).toBe('LIKED');
  });

  it('guarantees Zero Data Loss via immediate keystroke saveDraftNote', async () => {
    const tourId = 'tour-zdl';
    const slot = 'VISITOR_1';
    const propertyId = 'prop-abc';

    await storageService.saveDraftNote(tourId, slot, propertyId, {
      decision: 'LIKED',
      notes: 'Anotação digitada ao vivo',
      fencingToken: 1,
    });

    const draft = await storageService.getDraftNote(tourId, slot, propertyId);
    expect(draft).not.toBeNull();
    expect(draft?.decision).toBe('LIKED');
    expect(draft?.notes).toBe('Anotação digitada ao vivo');
    expect(draft?.fencingToken).toBe(1);
  });
});
