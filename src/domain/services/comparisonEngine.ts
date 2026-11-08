/**
 * Domain Service: ComparisonEngine
 * Computes deterministic 9-cell Match Matrix and cross-evaluation reports.
 */

import { VisitTour } from '../models/tour';
import { VisitorSession, DecisionType, PropertyEvaluation } from '../models/session';
import {
  MatchStatus,
  MATCH_STATUS_CATALOG,
  PropertyComparisonMatch,
  CrossEvaluationSummary,
  CrossEvaluationReport,
  IndividualReport,
  IndividualEvaluationItem,
} from '../models/comparison';

/**
 * Deterministic 9-cell Match Matrix lookup table:
 * Matrix[V1][V2] -> MatchStatus
 */
export const MATCH_MATRIX_RULES: Record<DecisionType, Record<DecisionType, MatchStatus>> = {
  LIKED: {
    LIKED: 'MATCH_POSITIVE',          // Both LIKED
    DOUBT: 'PARTIAL_ALIGNMENT',        // LIKED + DOUBT
    DISCARDED: 'DIVERGENCE',          // LIKED + DISCARDED
  },
  DOUBT: {
    LIKED: 'PARTIAL_ALIGNMENT',        // DOUBT + LIKED
    DOUBT: 'MUTUAL_DOUBT',            // Both DOUBT
    DISCARDED: 'CONSENSUAL_DISCARD',  // DOUBT + DISCARDED
  },
  DISCARDED: {
    LIKED: 'DIVERGENCE',              // DISCARDED + LIKED
    DOUBT: 'CONSENSUAL_DISCARD',      // DISCARDED + DOUBT
    DISCARDED: 'CONSENSUAL_DISCARD',  // Both DISCARDED
  },
};

/**
 * Resolves match status for a pair of decisions.
 * Returns 'PENDING' if either visitor has not evaluated the stop yet.
 */
export function resolveMatchStatus(
  v1Decision?: DecisionType,
  v2Decision?: DecisionType
): MatchStatus | 'PENDING' {
  if (!v1Decision || !v2Decision) {
    return 'PENDING';
  }
  return MATCH_MATRIX_RULES[v1Decision]?.[v2Decision] || 'PENDING';
}

/**
 * Builds the comprehensive CrossEvaluationReport by joining stops with V1 and V2 sessions.
 * Linear O(N) complexity over the tour stops.
 */
export function computeCrossEvaluationReport(
  tour: VisitTour,
  session1: VisitorSession,
  session2: VisitorSession
): CrossEvaluationReport {
  let evaluatedByBoth = 0;
  let pendingCount = 0;
  let perfectMatchesCount = 0;
  let partialAlignmentsCount = 0;
  let mutualDoubtsCount = 0;
  let divergencesCount = 0;
  let consensualDiscardsCount = 0;

  const matches: PropertyComparisonMatch[] = tour.stops.map(stop => {
    const v1Eval = session1.evaluations[stop.id];
    const v2Eval = session2.evaluations[stop.id];

    const status = resolveMatchStatus(v1Eval?.decision, v2Eval?.decision);
    const meta = status !== 'PENDING' ? MATCH_STATUS_CATALOG[status] : undefined;

    if (status === 'PENDING') {
      pendingCount++;
    } else {
      evaluatedByBoth++;
      switch (status) {
        case 'MATCH_POSITIVE':
          perfectMatchesCount++;
          break;
        case 'PARTIAL_ALIGNMENT':
          partialAlignmentsCount++;
          break;
        case 'MUTUAL_DOUBT':
          mutualDoubtsCount++;
          break;
        case 'DIVERGENCE':
          divergencesCount++;
          break;
        case 'CONSENSUAL_DISCARD':
          consensualDiscardsCount++;
          break;
      }
    }

    return {
      propertyId: stop.id,
      stop,
      visitor1Evaluation: v1Eval,
      visitor2Evaluation: v2Eval,
      status,
      meta,
    };
  });

  const summary: CrossEvaluationSummary = {
    totalProperties: tour.stops.length,
    evaluatedByBoth,
    pendingCount,
    perfectMatchesCount,
    partialAlignmentsCount,
    mutualDoubtsCount,
    divergencesCount,
    consensualDiscardsCount,
  };

  return {
    tourId: tour.id,
    tourTitle: tour.title,
    visitDate: tour.visitDate,
    brokerName: tour.brokerName,
    visitor1Name: session1.visitorName,
    visitor2Name: session2.visitorName,
    matches,
    summary,
    generatedAtIso: new Date().toISOString(),
  };
}

/**
 * Builds the IndividualReport for single-visitor tours or individual client view.
 */
export function computeIndividualReport(
  tour: VisitTour,
  session: VisitorSession
): IndividualReport {
  let likedCount = 0;
  let doubtCount = 0;
  let discardedCount = 0;
  let evaluatedStopsCount = 0;

  const items: IndividualEvaluationItem[] = tour.stops.map(stop => {
    const evaluation: PropertyEvaluation | undefined = session.evaluations[stop.id];
    const decision: DecisionType | 'NOT_EVALUATED' = evaluation ? evaluation.decision : 'NOT_EVALUATED';
    const notes = evaluation ? evaluation.notes : '';

    if (decision !== 'NOT_EVALUATED') {
      evaluatedStopsCount++;
      if (decision === 'LIKED') likedCount++;
      else if (decision === 'DOUBT') doubtCount++;
      else if (decision === 'DISCARDED') discardedCount++;
    }

    return {
      propertyId: stop.id,
      stop,
      decision,
      notes,
      evaluatedAtIso: evaluation?.updatedAtIso,
    };
  });

  return {
    tourId: tour.id,
    tourTitle: tour.title,
    visitDate: tour.visitDate,
    brokerName: tour.brokerName,
    visitorName: session.visitorName,
    visitorSlot: session.visitorSlot,
    totalStops: tour.stops.length,
    evaluatedStopsCount,
    likedCount,
    doubtCount,
    discardedCount,
    items,
    generatedAtIso: new Date().toISOString(),
  };
}

/**
 * Returns localized label for evaluation decisions.
 */
export function getDecisionLabel(decision?: DecisionType | 'NOT_EVALUATED'): string {
  switch (decision) {
    case 'LIKED':
      return 'Gostei';
    case 'DOUBT':
      return 'Em Dúvida';
    case 'DISCARDED':
      return 'Descartado';
    default:
      return 'Não Avaliado';
  }
}

/**
 * Returns DESIGN.md color tokens for a decision card/chip.
 */
export function getDecisionTokens(decision?: DecisionType): {
  bgHex: string;
  textHex: string;
  borderHex: string;
} {
  switch (decision) {
    case 'LIKED':
      return { bgHex: '#0a2e0e', textHex: '#ffffff', borderHex: '#214224' }; // Forest Ink / Moss
    case 'DOUBT':
      return { bgHex: '#fcb42a', textHex: '#181d26', borderHex: '#fcab79' }; // Marigold / Peach Glow
    case 'DISCARDED':
      return { bgHex: '#aa2d00', textHex: '#ffffff', borderHex: '#912e1f' }; // Terracotta / Burnt Sienna
    default:
      return { bgHex: '#ffffff', textHex: '#9297a0', borderHex: '#e0e2e6' }; // Steel / Silver Border
  }
}
