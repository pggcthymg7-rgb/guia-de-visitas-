import React from 'react';
import { X, MapPin, CheckCircle2, HelpCircle, XCircle, Clock } from 'lucide-react';
import type { VisitTour } from '@/domain/models/tour';
import type { PropertyEvaluation } from '@/domain/models/session';
import { centsToBrl } from '@/domain/value-objects/money';
import { getDecisionLabel } from '@/domain/services/comparisonEngine';

export interface HamburgerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  tour: VisitTour;
  currentStopIndex: number;
  evaluations: Record<string, PropertyEvaluation>;
}

/**
 * Non-destructive Quick Compare Hamburger Drawer (TC-04).
 * Purely read-only query overlay (CQRS Query) that NEVER unmounts or navigates away
 * from the active property visit form.
 */
export const HamburgerDrawer: React.FC<HamburgerDrawerProps> = ({
  isOpen,
  onClose,
  tour,
  currentStopIndex,
  evaluations,
}) => {
  if (!isOpen) return null;

  const orderedStops = [...tour.stops].sort((a, b) => a.orderIndex - b.orderIndex);

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-[#040e20]/60 backdrop-blur-[2px] animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-label="Consulta Rápida do Roteiro Completo"
      data-testid="hamburger-drawer-overlay"
    >
      {/* Backdrop click to close */}
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      {/* Drawer Sheet over Parchment Cream (#faf5e8) */}
      <aside
        className="relative z-10 w-full max-w-lg bg-[#faf5e8] h-full max-h-screen overflow-y-auto shadow-2xl border-l border-[#e0e2e6] flex flex-col justify-between"
        data-testid="hamburger-drawer-content"
      >
        {/* Sticky Drawer Header */}
        <div className="sticky top-0 z-20 bg-[#ffffff] border-b border-[#e0e2e6] px-6 py-4 flex items-center justify-between">
          <div>
            <span className="inline-block px-2.5 py-0.5 rounded-tags bg-[#c7e5f2] text-[#040e20] text-xs font-semibold uppercase tracking-wider">
              Consulta Sem Sair da Visita
            </span>
            <h2 className="font-display font-black text-xl text-[#040e20] mt-1">
              Resumo Geral do Roteiro
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar Menu Hambúrguer"
            data-testid="close-hamburger-drawer-button"
            className="p-2 rounded-buttons border border-[#181d26] bg-[#ffffff] text-[#181d26] hover:bg-[#faf5e8] font-semibold text-sm flex items-center gap-1.5"
          >
            <X className="w-5 h-5" />
            <span>Fechar</span>
          </button>
        </div>

        {/* Stops List */}
        <div className="p-6 space-y-4 flex-1">
          <div className="bg-[#ffffff] border border-[#e0e2e6] rounded-cards p-4 text-xs text-[#525965]">
            Consulte os detalhes de qualquer imóvel do dia ou compare com suas anotações anteriores. Suas observações atuais estão salvas e protegidas.
          </div>

          {orderedStops.map((stop, idx) => {
            const isCurrent = idx === currentStopIndex;
            const evaluation = evaluations[stop.id];
            const orderBadge = `#${(idx + 1).toString().padStart(2, '0')}`;

            return (
              <div
                key={stop.id}
                data-testid={`drawer-stop-card-${idx + 1}`}
                className={`rounded-cards bg-[#ffffff] p-5 border-2 transition-all ${
                  isCurrent
                    ? 'border-[#181d26] ring-2 ring-[#c7e5f2]'
                    : 'border-[#e0e2e6]'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-buttons bg-[#181d26] text-white font-mono text-xs font-bold">
                      {orderBadge}
                    </span>
                    {isCurrent && (
                      <span
                        className="px-3 py-1 rounded-tags bg-[#fcb42a] text-[#181d26] font-sans text-xs font-bold"
                        data-testid="drawer-current-stop-indicator"
                      >
                        Imóvel Atual em Visita
                      </span>
                    )}
                  </div>
                  <span className="font-sans font-bold text-sm text-[#0a2e0e]">
                    {centsToBrl(stop.priceCents)}
                  </span>
                </div>

                {/* Facade Thumbnail + Info */}
                <div className="flex flex-col sm:flex-row gap-4">
                  {stop.facadeImageDataUrl && (
                    <img
                      src={stop.facadeImageDataUrl}
                      alt={`Fachada ${stop.condominiumName}`}
                      className="w-full sm:w-28 h-28 object-cover rounded-buttons border border-[#e0e2e6] shrink-0 bg-[#faf5e8]"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display font-black text-base text-[#040e20] flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-[#aa2d00] shrink-0" />
                      <span>{stop.condominiumName}</span>
                    </h3>
                    <p className="font-sans font-semibold text-xs text-[#333840] mt-0.5">
                      {stop.title}
                    </p>
                    <p className="font-sans text-xs text-[#525965] mt-2 leading-relaxed">
                      {stop.fullDescription}
                    </p>
                  </div>
                </div>

                {/* Previous Evaluation & Notes if recorded */}
                <div className="mt-4 pt-3 border-t border-[#e0e2e6] flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#525965]">Sua Avaliação:</span>
                    {evaluation?.decision === 'LIKED' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-tags bg-[#0a2e0e] text-white text-xs font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {getDecisionLabel('LIKED')}
                      </span>
                    )}
                    {evaluation?.decision === 'DOUBT' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-tags bg-[#fcb42a] text-[#181d26] text-xs font-semibold">
                        <HelpCircle className="w-3.5 h-3.5" />
                        {getDecisionLabel('DOUBT')}
                      </span>
                    )}
                    {evaluation?.decision === 'DISCARDED' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-tags bg-[#aa2d00] text-white text-xs font-semibold">
                        <XCircle className="w-3.5 h-3.5" />
                        {getDecisionLabel('DISCARDED')}
                      </span>
                    )}
                    {!evaluation?.decision && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-tags bg-[#f8fafc] text-[#9297a0] border border-[#e0e2e6] text-xs font-medium">
                        <Clock className="w-3.5 h-3.5" />
                        Pendente
                      </span>
                    )}
                  </div>
                  {evaluation?.notes && (
                    <div className="bg-[#faf5e8] rounded-buttons p-2.5 text-xs text-[#333840] border border-[#e0e2e6]">
                      <strong className="text-[#040e20]">Suas notas:</strong> {evaluation.notes}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Sticky Bottom Return Button */}
        <div className="sticky bottom-0 z-20 bg-[#ffffff] border-t border-[#e0e2e6] p-4">
          <button
            type="button"
            onClick={onClose}
            data-testid="return-to-current-visit-button"
            className="w-full py-3.5 px-6 rounded-buttons bg-[#181d26] text-white font-sans font-semibold text-base shadow-subtle hover:bg-[#333840] transition-colors"
          >
            Voltar para a Visita Atual
          </button>
        </div>
      </aside>
    </div>
  );
};
