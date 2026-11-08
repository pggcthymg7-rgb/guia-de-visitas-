/**
 * Domain Service: Validation & Domain Invariants Enforcement
 */

import { VisitTour, PropertyStop } from '../models/tour';
import { VisitorSession, PropertyEvaluation, DecisionType } from '../models/session';

export class DomainRuleViolationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'DomainRuleViolationError';
  }
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates that an evaluation decision belongs strictly to the allowed tri-state set.
 */
export function isDecisionValid(decision?: unknown): decision is DecisionType {
  return decision === 'LIKED' || decision === 'DISCARDED' || decision === 'DOUBT';
}

/**
 * Checks if a property evaluation is complete (decision chosen).
 */
export function isEvaluationComplete(evaluation?: PropertyEvaluation): boolean {
  return !!evaluation && isDecisionValid(evaluation.decision);
}

/**
 * Reactive guard: Checks if the visitor session is allowed to advance from the given property.
 * Used to disable/enable the primary CTA button in UI.
 */
export function canAdvanceSession(session: VisitorSession, propertyId: string): boolean {
  const evaluation = session.evaluations[propertyId];
  return isEvaluationComplete(evaluation);
}

/**
 * Invariant enforcement: Throws DomainRuleViolationError if advance is attempted without valid decision.
 * Enforces TC-03 compliance.
 */
export function assertCanAdvance(session: VisitorSession, propertyId: string): void {
  if (!canAdvanceSession(session, propertyId)) {
    throw new DomainRuleViolationError(
      'É obrigatório selecionar uma das opções (Gostei, Descartado ou Em Dúvida) antes de avançar.',
      'MANDATORY_DECISION_REQUIRED',
      { tourId: session.tourId, slot: session.visitorSlot, propertyId }
    );
  }
}

/**
 * Validates broker tour configuration metadata before finalizing.
 */
export function validateTourMetadata(tour: Partial<VisitTour>): ValidationResult {
  const errors: string[] = [];

  if (!tour.title || !tour.title.trim()) {
    errors.push('O título do roteiro é obrigatório.');
  }
  if (!tour.visitDate || !tour.visitDate.trim()) {
    errors.push('A data da visita é obrigatória.');
  }
  if (!tour.brokerName || !tour.brokerName.trim()) {
    errors.push('O nome do corretor é obrigatório.');
  }
  if (tour.visitorCount !== 1 && tour.visitorCount !== 2) {
    errors.push('A quantidade de visitantes deve ser 1 ou 2.');
  }
  if (!tour.visitor1Name || !tour.visitor1Name.trim()) {
    errors.push('O nome do Visitante 1 é obrigatório.');
  }
  if (tour.visitorCount === 2 && (!tour.visitor2Name || !tour.visitor2Name.trim())) {
    errors.push('O nome do Visitante 2 é obrigatório quando o roteiro é configurado para 2 pessoas.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates a single property stop.
 */
export function validatePropertyStop(stop: Partial<PropertyStop>): ValidationResult {
  const errors: string[] = [];

  if (!stop.condominiumName || !stop.condominiumName.trim()) {
    errors.push('O nome do condomínio é obrigatório.');
  }
  if (stop.priceCents === undefined || stop.priceCents === null || stop.priceCents < 0) {
    errors.push('O preço do imóvel deve ser um valor positivo.');
  }
  if (!stop.title || !stop.title.trim()) {
    errors.push('O título do imóvel é obrigatório.');
  }
  if (!stop.fullDescription || !stop.fullDescription.trim()) {
    errors.push('A descrição completa do imóvel é obrigatória.');
  }
  if (!stop.facadeImageDataUrl || !stop.facadeImageDataUrl.trim()) {
    errors.push('A foto da fachada é obrigatória.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates complete tour for finalization and link/PDF generation.
 */
export function validateCompleteTourForFinalization(tour: VisitTour): ValidationResult {
  const metaValidation = validateTourMetadata(tour);
  const errors = [...metaValidation.errors];

  if (!tour.stops || tour.stops.length === 0) {
    errors.push('O roteiro deve conter pelo menos 1 imóvel cadastrado.');
  } else {
    tour.stops.forEach((stop, index) => {
      const stopValidation = validatePropertyStop(stop);
      if (!stopValidation.valid) {
        errors.push(`Imóvel #${index + 1}: ${stopValidation.errors.join(', ')}`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
