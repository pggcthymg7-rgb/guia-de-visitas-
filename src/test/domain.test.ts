import { describe, it, expect } from 'vitest';
import {
  createTour,
  createPropertyStop,
  reorderStops,
  moveStopUp,
  moveStopDown,
  addStop,
  removeStop,
  updateStop,
  PropertyStop,
} from '@/domain/models/tour';
import {
  createVisitorSession,
  startVisitorSession,
  saveEvaluationDraft,
  advanceSessionStop,
  mergeEvaluationWithFencing,
  generateIdempotencyKey,
  PropertyEvaluation,
} from '@/domain/models/session';
import {
  centsToBrl,
  brlToCents,
  maskBrlInput,
  formatBrlCompact,
  isValidPriceCents,
} from '@/domain/value-objects/money';
import {
  resolveMatchStatus,
  computeCrossEvaluationReport,
  computeIndividualReport,
  getDecisionLabel,
  getDecisionTokens,
} from '@/domain/services/comparisonEngine';
import {
  canAdvanceSession,
  assertCanAdvance,
  validateTourMetadata,
  validatePropertyStop,
  validateCompleteTourForFinalization,
  DomainRuleViolationError,
} from '@/domain/services/validation';

describe('Domain: Money Value Object', () => {
  it('formats integer cents to BRL formatted currency', () => {
    expect(centsToBrl(250000000)).toBe('R$ 2.500.000,00');
    expect(centsToBrl(485000000)).toBe('R$ 4.850.000,00');
    expect(centsToBrl(0)).toBe('R$ 0,00');
    expect(centsToBrl(50)).toBe('R$ 0,50');
    expect(centsToBrl(100)).toBe('R$ 1,00');
    expect(centsToBrl(null)).toBe('R$ 0,00');
    expect(centsToBrl(-50)).toBe('R$ 0,00');
  });

  it('parses raw BRL strings and numbers to integer cents', () => {
    expect(brlToCents('R$ 2.500.000,00')).toBe(250000000);
    expect(brlToCents('2.500.000,00')).toBe(250000000);
    expect(brlToCents('R$ 0,50')).toBe(50);
    expect(brlToCents(485000000)).toBe(485000000);
    expect(brlToCents('')).toBe(0);
    expect(brlToCents(null)).toBe(0);
  });

  it('masks keystrokes in real time into BRL currency format', () => {
    expect(maskBrlInput('')).toBe('');
    expect(maskBrlInput('2')).toBe('R$ 0,02');
    expect(maskBrlInput('250')).toBe('R$ 2,50');
    expect(maskBrlInput('250000000')).toBe('R$ 2.500.000,00');
  });

  it('formats cents into compact BRL string for badges and summaries', () => {
    expect(formatBrlCompact(250000000)).toBe('R$ 2,5M');
    expect(formatBrlCompact(85000000)).toBe('R$ 850 mil');
    expect(formatBrlCompact(50000)).toBe('R$ 500,00');
    expect(formatBrlCompact(0)).toBe('R$ 0');
  });

  it('validates price cents correctly', () => {
    expect(isValidPriceCents(1000)).toBe(true);
    expect(isValidPriceCents(0)).toBe(true);
    expect(isValidPriceCents(-10)).toBe(false);
    expect(isValidPriceCents(10.5)).toBe(false);
    expect(isValidPriceCents('1000')).toBe(false);
  });
});

describe('Domain: Tour & Stop Aggregates', () => {
  const sampleStops: PropertyStop[] = [
    createPropertyStop(
      {
        condominiumName: 'Condomínio A',
        priceCents: 100000000,
        title: 'Casa A',
        fullDescription: 'Descrição A',
        facadeImageDataUrl: 'https://example.com/a.jpg',
      },
      1
    ),
    createPropertyStop(
      {
        condominiumName: 'Condomínio B',
        priceCents: 200000000,
        title: 'Casa B',
        fullDescription: 'Descrição B',
        facadeImageDataUrl: 'https://example.com/b.jpg',
      },
      2
    ),
    createPropertyStop(
      {
        condominiumName: 'Condomínio C',
        priceCents: 300000000,
        title: 'Casa C',
        fullDescription: 'Descrição C',
        facadeImageDataUrl: 'https://example.com/c.jpg',
      },
      3
    ),
  ];

  it('creates tour with 1-based order indexes on stops', () => {
    const tour = createTour({
      title: 'Roteiro de Teste',
      visitDate: '2026-11-08',
      brokerName: 'Corretor Silva',
      visitorCount: 2,
      visitor1Name: 'Cliente 1',
      visitor2Name: 'Cliente 2',
      stops: sampleStops,
    });

    expect(tour.stops).toHaveLength(3);
    expect(tour.stops[0].orderIndex).toBe(1);
    expect(tour.stops[1].orderIndex).toBe(2);
    expect(tour.stops[2].orderIndex).toBe(3);
  });

  it('reorders stops and maintains 1..N orderIndex sequence', () => {
    const reordered = reorderStops(sampleStops, 2, 0); // Move index 2 (Casa C) to index 0
    expect(reordered[0].title).toBe('Casa C');
    expect(reordered[0].orderIndex).toBe(1);
    expect(reordered[1].title).toBe('Casa A');
    expect(reordered[1].orderIndex).toBe(2);
    expect(reordered[2].title).toBe('Casa B');
    expect(reordered[2].orderIndex).toBe(3);
  });

  it('moves stop up with boundary locking at index 0', () => {
    const movedUp = moveStopUp(sampleStops, 1); // Move index 1 (Casa B) up
    expect(movedUp[0].title).toBe('Casa B');
    expect(movedUp[0].orderIndex).toBe(1);
    expect(movedUp[1].title).toBe('Casa A');
    expect(movedUp[1].orderIndex).toBe(2);

    // Boundary check at 0
    const boundaryCheck = moveStopUp(sampleStops, 0);
    expect(boundaryCheck).toBe(sampleStops);
  });

  it('moves stop down with boundary locking at last index', () => {
    const movedDown = moveStopDown(sampleStops, 0); // Move index 0 (Casa A) down
    expect(movedDown[0].title).toBe('Casa B');
    expect(movedDown[1].title).toBe('Casa A');

    // Boundary check at last
    const boundaryCheck = moveStopDown(sampleStops, 2);
    expect(boundaryCheck).toBe(sampleStops);
  });

  it('adds, updates, and removes stops while preserving 1..N orderIndex', () => {
    const added = addStop(sampleStops, {
      condominiumName: 'Condomínio D',
      priceCents: 400000000,
      title: 'Casa D',
      fullDescription: 'Descrição D',
      facadeImageDataUrl: 'https://example.com/d.jpg',
    });
    expect(added).toHaveLength(4);
    expect(added[3].orderIndex).toBe(4);

    const updated = updateStop(added, {
      ...added[1],
      title: 'Casa B Atualizada',
    });
    expect(updated[1].title).toBe('Casa B Atualizada');
    expect(updated[1].orderIndex).toBe(2);

    const removed = removeStop(updated, added[1].id);
    expect(removed).toHaveLength(3);
    expect(removed[0].orderIndex).toBe(1);
    expect(removed[1].orderIndex).toBe(2);
    expect(removed[2].orderIndex).toBe(3);
  });
});

describe('Domain: Session & Evaluation Lifecycle', () => {
  const tour = createTour({
    title: 'Tour',
    visitDate: '2026-11-08',
    brokerName: 'Broker',
    visitorCount: 2,
    visitor1Name: 'Alice',
    visitor2Name: 'Bob',
    stops: [
      createPropertyStop(
        {
          id: 'p1',
          condominiumName: 'Condo 1',
          priceCents: 100,
          title: 'Title 1',
          fullDescription: 'Desc 1',
          facadeImageDataUrl: 'url',
        },
        1
      ),
      createPropertyStop(
        {
          id: 'p2',
          condominiumName: 'Condo 2',
          priceCents: 200,
          title: 'Title 2',
          fullDescription: 'Desc 2',
          facadeImageDataUrl: 'url',
        },
        2
      ),
    ],
  });

  it('initializes session and transitions to in_progress', () => {
    let session = createVisitorSession(tour, 'VISITOR_1');
    expect(session.status).toBe('NOT_STARTED');
    expect(session.visitorName).toBe('Alice');

    session = startVisitorSession(session);
    expect(session.status).toBe('IN_PROGRESS');
  });

  it('saves evaluation draft with monotonic fencingToken and idempotency key', () => {
    let session = createVisitorSession(tour, 'VISITOR_1');
    session = saveEvaluationDraft(session, 'p1', { decision: 'LIKED', notes: 'Excelente acabamento' });

    const evalP1 = session.evaluations['p1'];
    expect(evalP1.decision).toBe('LIKED');
    expect(evalP1.notes).toBe('Excelente acabamento');
    expect(evalP1.fencingToken).toBe(1);
    expect(evalP1.idempotencyKey).toBe(generateIdempotencyKey(tour.id, 'VISITOR_1', 'p1', 1));

    // Save again: increments fencingToken monotonically
    session = saveEvaluationDraft(session, 'p1', { notes: 'Excelente acabamento e vista linda' });
    expect(session.evaluations['p1'].fencingToken).toBe(2);
    expect(session.evaluations['p1'].decision).toBe('LIKED'); // preserves decision
    expect(session.evaluations['p1'].notes).toBe('Excelente acabamento e vista linda');
  });

  it('advances session stop index until completed', () => {
    let session = createVisitorSession(tour, 'VISITOR_1');
    expect(session.currentStopIndex).toBe(0);

    session = advanceSessionStop(session, tour.stops.length);
    expect(session.currentStopIndex).toBe(1);
    expect(session.status).toBe('IN_PROGRESS');

    session = advanceSessionStop(session, tour.stops.length);
    expect(session.currentStopIndex).toBe(1);
    expect(session.status).toBe('COMPLETED');
  });

  it('reconciles concurrent evaluations with higher fencingToken winning', () => {
    const eval1: PropertyEvaluation = {
      propertyId: 'p1',
      decision: 'DOUBT',
      notes: 'Nota antiga',
      fencingToken: 1,
      idempotencyKey: 'k1',
      updatedAtIso: '2026-11-08T10:00:00Z',
    };
    const eval2: PropertyEvaluation = {
      propertyId: 'p1',
      decision: 'LIKED',
      notes: 'Nota recente',
      fencingToken: 2,
      idempotencyKey: 'k2',
      updatedAtIso: '2026-11-08T10:01:00Z',
    };

    expect(mergeEvaluationWithFencing(eval1, eval2)).toBe(eval2);
    expect(mergeEvaluationWithFencing(eval2, eval1)).toBe(eval2);
  });
});

describe('Domain: Mandatory Decision Guard & Validation (TC-03 Invariant)', () => {
  const tour = createTour({
    title: 'Tour',
    visitDate: '2026-11-08',
    brokerName: 'Broker',
    visitorCount: 1,
    visitor1Name: 'Alice',
    stops: [
      createPropertyStop(
        {
          id: 'p1',
          condominiumName: 'Condo 1',
          priceCents: 100,
          title: 'Title 1',
          fullDescription: 'Desc 1',
          facadeImageDataUrl: 'url',
        },
        1
      ),
    ],
  });

  it('blocks advance when no decision has been chosen', () => {
    const session = createVisitorSession(tour, 'VISITOR_1');
    expect(canAdvanceSession(session, 'p1')).toBe(false);

    expect(() => assertCanAdvance(session, 'p1')).toThrow(DomainRuleViolationError);
  });

  it('allows advance when decision is LIKED, DISCARDED, or DOUBT', () => {
    let session = createVisitorSession(tour, 'VISITOR_1');

    session = saveEvaluationDraft(session, 'p1', { decision: 'LIKED' });
    expect(canAdvanceSession(session, 'p1')).toBe(true);
    expect(() => assertCanAdvance(session, 'p1')).not.toThrow();

    session = saveEvaluationDraft(session, 'p1', { decision: 'DOUBT' });
    expect(canAdvanceSession(session, 'p1')).toBe(true);

    session = saveEvaluationDraft(session, 'p1', { decision: 'DISCARDED' });
    expect(canAdvanceSession(session, 'p1')).toBe(true);
  });

  it('validates tour metadata thoroughly', () => {
    const validResult = validateTourMetadata({
      title: 'Roteiro Válido',
      visitDate: '2026-11-08',
      brokerName: 'Roberto',
      visitorCount: 1,
      visitor1Name: 'Mariana',
    });
    expect(validResult.valid).toBe(true);
    expect(validResult.errors).toHaveLength(0);

    const invalidResult = validateTourMetadata({
      title: '',
      visitDate: '',
      brokerName: '',
      visitorCount: 2,
      visitor1Name: 'Mariana',
      visitor2Name: '', // missing visitor 2
    });
    expect(invalidResult.valid).toBe(false);
    expect(invalidResult.errors.length).toBeGreaterThanOrEqual(4);
  });

  it('validates property stop fields', () => {
    const invalidStop = validatePropertyStop({
      condominiumName: '',
      priceCents: -5,
      title: '',
      fullDescription: '',
      facadeImageDataUrl: '',
    });
    expect(invalidStop.valid).toBe(false);
    expect(invalidStop.errors.length).toBe(5);
  });

  it('validates complete tour for finalization', () => {
    const incompleteTour = createTour({
      title: 'Tour',
      visitDate: '2026-11-08',
      brokerName: 'Broker',
      visitorCount: 1,
      visitor1Name: 'Alice',
      stops: [],
    });
    const result = validateCompleteTourForFinalization(incompleteTour);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('O roteiro deve conter pelo menos 1 imóvel cadastrado.');
  });
});

describe('Domain: Deterministic 9-Cell Match Matrix & Reporting', () => {
  it('covers all 9 combinations in the deterministic matrix', () => {
    // 1. LIKED + LIKED -> MATCH_POSITIVE
    expect(resolveMatchStatus('LIKED', 'LIKED')).toBe('MATCH_POSITIVE');

    // 2. LIKED + DOUBT -> PARTIAL_ALIGNMENT
    expect(resolveMatchStatus('LIKED', 'DOUBT')).toBe('PARTIAL_ALIGNMENT');

    // 3. DOUBT + LIKED -> PARTIAL_ALIGNMENT
    expect(resolveMatchStatus('DOUBT', 'LIKED')).toBe('PARTIAL_ALIGNMENT');

    // 4. DOUBT + DOUBT -> MUTUAL_DOUBT
    expect(resolveMatchStatus('DOUBT', 'DOUBT')).toBe('MUTUAL_DOUBT');

    // 5. LIKED + DISCARDED -> DIVERGENCE
    expect(resolveMatchStatus('LIKED', 'DISCARDED')).toBe('DIVERGENCE');

    // 6. DISCARDED + LIKED -> DIVERGENCE
    expect(resolveMatchStatus('DISCARDED', 'LIKED')).toBe('DIVERGENCE');

    // 7. DOUBT + DISCARDED -> CONSENSUAL_DISCARD
    expect(resolveMatchStatus('DOUBT', 'DISCARDED')).toBe('CONSENSUAL_DISCARD');

    // 8. DISCARDED + DOUBT -> CONSENSUAL_DISCARD
    expect(resolveMatchStatus('DISCARDED', 'DOUBT')).toBe('CONSENSUAL_DISCARD');

    // 9. DISCARDED + DISCARDED -> CONSENSUAL_DISCARD
    expect(resolveMatchStatus('DISCARDED', 'DISCARDED')).toBe('CONSENSUAL_DISCARD');

    // Incomplete evaluation -> PENDING
    expect(resolveMatchStatus('LIKED', undefined)).toBe('PENDING');
    expect(resolveMatchStatus(undefined, 'DOUBT')).toBe('PENDING');
  });

  it('computes full cross-evaluation report and summary counts', () => {
    const stops: PropertyStop[] = [
      createPropertyStop({ id: 's1', condominiumName: 'C1', priceCents: 100, title: 'T1', fullDescription: 'D1', facadeImageDataUrl: 'img' }, 1),
      createPropertyStop({ id: 's2', condominiumName: 'C2', priceCents: 200, title: 'T2', fullDescription: 'D2', facadeImageDataUrl: 'img' }, 2),
      createPropertyStop({ id: 's3', condominiumName: 'C3', priceCents: 300, title: 'T3', fullDescription: 'D3', facadeImageDataUrl: 'img' }, 3),
      createPropertyStop({ id: 's4', condominiumName: 'C4', priceCents: 400, title: 'T4', fullDescription: 'D4', facadeImageDataUrl: 'img' }, 4),
      createPropertyStop({ id: 's5', condominiumName: 'C5', priceCents: 500, title: 'T5', fullDescription: 'D5', facadeImageDataUrl: 'img' }, 5),
    ];
    const tour = createTour({
      title: 'Tour 2 Visitantes',
      visitDate: '2026-11-08',
      brokerName: 'Broker',
      visitorCount: 2,
      visitor1Name: 'Alice',
      visitor2Name: 'Bob',
      stops,
    });

    let s1 = createVisitorSession(tour, 'VISITOR_1');
    let s2 = createVisitorSession(tour, 'VISITOR_2');

    // S1: LIKED / LIKED -> MATCH_POSITIVE
    s1 = saveEvaluationDraft(s1, 's1', { decision: 'LIKED', notes: 'Gostei muito' });
    s2 = saveEvaluationDraft(s2, 's1', { decision: 'LIKED', notes: 'Perfeito' });

    // S2: LIKED / DOUBT -> PARTIAL_ALIGNMENT
    s1 = saveEvaluationDraft(s1, 's2', { decision: 'LIKED' });
    s2 = saveEvaluationDraft(s2, 's2', { decision: 'DOUBT' });

    // S3: DOUBT / DOUBT -> MUTUAL_DOUBT
    s1 = saveEvaluationDraft(s1, 's3', { decision: 'DOUBT' });
    s2 = saveEvaluationDraft(s2, 's3', { decision: 'DOUBT' });

    // S4: LIKED / DISCARDED -> DIVERGENCE
    s1 = saveEvaluationDraft(s1, 's4', { decision: 'LIKED' });
    s2 = saveEvaluationDraft(s2, 's4', { decision: 'DISCARDED' });

    // S5: DISCARDED / DISCARDED -> CONSENSUAL_DISCARD
    s1 = saveEvaluationDraft(s1, 's5', { decision: 'DISCARDED' });
    s2 = saveEvaluationDraft(s2, 's5', { decision: 'DISCARDED' });

    const report = computeCrossEvaluationReport(tour, s1, s2);

    expect(report.summary.totalProperties).toBe(5);
    expect(report.summary.evaluatedByBoth).toBe(5);
    expect(report.summary.pendingCount).toBe(0);
    expect(report.summary.perfectMatchesCount).toBe(1);
    expect(report.summary.partialAlignmentsCount).toBe(1);
    expect(report.summary.mutualDoubtsCount).toBe(1);
    expect(report.summary.divergencesCount).toBe(1);
    expect(report.summary.consensualDiscardsCount).toBe(1);
  });

  it('computes individual report correctly', () => {
    const stops: PropertyStop[] = [
      createPropertyStop({ id: 's1', condominiumName: 'C1', priceCents: 100, title: 'T1', fullDescription: 'D1', facadeImageDataUrl: 'img' }, 1),
      createPropertyStop({ id: 's2', condominiumName: 'C2', priceCents: 200, title: 'T2', fullDescription: 'D2', facadeImageDataUrl: 'img' }, 2),
    ];
    const tour = createTour({
      title: 'Tour 1',
      visitDate: '2026-11-08',
      brokerName: 'Broker',
      visitorCount: 1,
      visitor1Name: 'Alice',
      stops,
    });

    let s1 = createVisitorSession(tour, 'VISITOR_1');
    s1 = saveEvaluationDraft(s1, 's1', { decision: 'LIKED', notes: 'Top' });

    const indReport = computeIndividualReport(tour, s1);
    expect(indReport.totalStops).toBe(2);
    expect(indReport.evaluatedStopsCount).toBe(1);
    expect(indReport.likedCount).toBe(1);
    expect(indReport.doubtCount).toBe(0);
    expect(indReport.discardedCount).toBe(0);
    expect(indReport.items[0].decision).toBe('LIKED');
    expect(indReport.items[1].decision).toBe('NOT_EVALUATED');
  });

  it('returns appropriate decision labels and design tokens', () => {
    expect(getDecisionLabel('LIKED')).toBe('Gostei');
    expect(getDecisionLabel('DOUBT')).toBe('Em Dúvida');
    expect(getDecisionLabel('DISCARDED')).toBe('Descartado');
    expect(getDecisionLabel('NOT_EVALUATED')).toBe('Não Avaliado');

    const likedTokens = getDecisionTokens('LIKED');
    expect(likedTokens.bgHex).toBe('#0a2e0e');
  });
});
