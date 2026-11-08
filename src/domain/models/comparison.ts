/**
 * Bounded Context: ReportingAndComparisonContext
 * Models: MatchStatus, PropertyComparisonMatch, CrossEvaluationReport, IndividualReport
 */

import { PropertyStop } from './tour';
import { PropertyEvaluation, DecisionType, VisitorSlot } from './session';

export type MatchStatus =
  | 'MATCH_POSITIVE'       // Both LIKED ("Match Perfeito!")
  | 'PARTIAL_ALIGNMENT'   // One LIKED, one DOUBT ("Alinhamento Parcial / Ponto de Debate")
  | 'MUTUAL_DOUBT'        // Both DOUBT ("Dúvida em Conjunto")
  | 'DIVERGENCE'           // One LIKED, one DISCARDED ("Ponto de Debate / Divergência")
  | 'CONSENSUAL_DISCARD'; // Both DISCARDED, or DISCARDED + DOUBT ("Descarte Consensual")

export interface MatchStatusMeta {
  status: MatchStatus;
  label: string;
  shortLabel: string;
  description: string;
  bgHex: string;
  textHex: string;
  borderHex: string;
  badgeClass: string;
}

export const MATCH_STATUS_CATALOG: Record<MatchStatus, MatchStatusMeta> = {
  MATCH_POSITIVE: {
    status: 'MATCH_POSITIVE',
    label: 'Match Perfeito!',
    shortLabel: 'Match',
    description: 'Ambos os visitantes amaram o imóvel.',
    bgHex: '#0a2e0e',
    textHex: '#c7e5f2',
    borderHex: '#214224',
    badgeClass: 'bg-forest-ink text-pale-sky border-moss',
  },
  PARTIAL_ALIGNMENT: {
    status: 'PARTIAL_ALIGNMENT',
    label: 'Alinhamento Parcial',
    shortLabel: 'Alinhamento',
    description: 'Um visitante gostou e o outro ficou em dúvida. Ótimo ponto para conversa.',
    bgHex: '#1b61c9',
    textHex: '#ffffff',
    borderHex: '#254fad',
    badgeClass: 'bg-cobalt-blue text-white border-sapphire',
  },
  MUTUAL_DOUBT: {
    status: 'MUTUAL_DOUBT',
    label: 'Dúvida em Conjunto',
    shortLabel: 'Dúvida',
    description: 'Ambos os visitantes ficaram em dúvida. Necessita reavaliação de prós e contras.',
    bgHex: '#fcb42a',
    textHex: '#181d26',
    borderHex: '#fcab79',
    badgeClass: 'bg-marigold text-onyx border-peach-glow',
  },
  DIVERGENCE: {
    status: 'DIVERGENCE',
    label: 'Ponto de Debate (Divergência)',
    shortLabel: 'Divergência',
    description: 'Opiniões opostas: um visitante gostou e o outro descartou.',
    bgHex: '#aa2d00',
    textHex: '#ffffff',
    borderHex: '#912e1f',
    badgeClass: 'bg-terracotta text-white border-burnt-sienna',
  },
  CONSENSUAL_DISCARD: {
    status: 'CONSENSUAL_DISCARD',
    label: 'Descarte Consensual',
    shortLabel: 'Descartado',
    description: 'Ambos descartaram ou um descartou e o outro está em dúvida.',
    bgHex: '#333840',
    textHex: '#ffffff',
    borderHex: '#525965',
    badgeClass: 'bg-charcoal text-white border-graphite',
  },
};

export interface PropertyComparisonMatch {
  propertyId: string;
  stop: PropertyStop;
  visitor1Evaluation?: PropertyEvaluation;
  visitor2Evaluation?: PropertyEvaluation;
  status: MatchStatus | 'PENDING';
  meta?: MatchStatusMeta;
}

export interface CrossEvaluationSummary {
  totalProperties: number;
  evaluatedByBoth: number;
  pendingCount: number;
  perfectMatchesCount: number;      // MATCH_POSITIVE
  partialAlignmentsCount: number;   // PARTIAL_ALIGNMENT
  mutualDoubtsCount: number;        // MUTUAL_DOUBT
  divergencesCount: number;         // DIVERGENCE
  consensualDiscardsCount: number;  // CONSENSUAL_DISCARD
}

export interface CrossEvaluationReport {
  tourId: string;
  tourTitle: string;
  visitDate: string;
  brokerName: string;
  visitor1Name: string;
  visitor2Name: string;
  matches: PropertyComparisonMatch[];
  summary: CrossEvaluationSummary;
  generatedAtIso: string;
}

export interface IndividualEvaluationItem {
  propertyId: string;
  stop: PropertyStop;
  decision: DecisionType | 'NOT_EVALUATED';
  notes: string;
  evaluatedAtIso?: string;
}

export interface IndividualReport {
  tourId: string;
  tourTitle: string;
  visitDate: string;
  brokerName: string;
  visitorName: string;
  visitorSlot: VisitorSlot;
  totalStops: number;
  evaluatedStopsCount: number;
  likedCount: number;
  doubtCount: number;
  discardedCount: number;
  items: IndividualEvaluationItem[];
  generatedAtIso: string;
}
