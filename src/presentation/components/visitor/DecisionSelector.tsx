import React from 'react';
import { ThumbsUp, ThumbsDown, HelpCircle } from 'lucide-react';
import type { DecisionType } from '@/domain/models/session';

export interface DecisionSelectorProps {
  selectedDecision?: DecisionType;
  onSelectDecision: (decision: DecisionType) => void;
}

/**
 * Tri-state interactive decision boxes following DESIGN.md chapter colors:
 * 1. Gostei (LIKED) -> Forest Ink (#0a2e0e) / Moss (#214224)
 * 2. Descartado (DISCARDED) -> Terracotta (#aa2d00) / Burnt Sienna (#912e1f)
 * 3. Em Dúvida (DOUBT) -> Marigold (#fcb42a) / Peach Glow (#fcab79)
 */
export const DecisionSelector: React.FC<DecisionSelectorProps> = ({
  selectedDecision,
  onSelectDecision,
}) => {
  const options: Array<{
    type: DecisionType;
    label: string;
    subtitle: string;
    testId: string;
    icon: React.ReactNode;
    activeClass: string;
    idleClass: string;
  }> = [
    {
      type: 'LIKED',
      label: 'Gostei',
      subtitle: 'Imóvel aprovado e alinhado ao perfil',
      testId: 'decision-button-LIKED',
      icon: <ThumbsUp className="w-6 h-6" />,
      activeClass: 'bg-[#0a2e0e] text-[#ffffff] border-[#214224] ring-4 ring-[#c7e5f2] shadow-subtle',
      idleClass: 'bg-[#ffffff] text-[#0a2e0e] border-[#214224]/40 hover:bg-[#faf5e8] hover:border-[#0a2e0e]',
    },
    {
      type: 'DISCARDED',
      label: 'Descartado',
      subtitle: 'Não atende aos critérios essenciais',
      testId: 'decision-button-DISCARDED',
      icon: <ThumbsDown className="w-6 h-6" />,
      activeClass: 'bg-[#aa2d00] text-[#ffffff] border-[#912e1f] ring-4 ring-[#fcab79] shadow-subtle',
      idleClass: 'bg-[#ffffff] text-[#aa2d00] border-[#912e1f]/40 hover:bg-[#faf5e8] hover:border-[#aa2d00]',
    },
    {
      type: 'DOUBT',
      label: 'Em Dúvida',
      subtitle: 'Pontos positivos, mas requer avaliação',
      testId: 'decision-button-DOUBT',
      icon: <HelpCircle className="w-6 h-6" />,
      activeClass: 'bg-[#fcb42a] text-[#181d26] border-[#fcab79] ring-4 ring-[#fcab79]/60 shadow-subtle',
      idleClass: 'bg-[#ffffff] text-[#181d26] border-[#fcb42a] hover:bg-[#faf5e8] hover:border-[#181d26]',
    },
  ];

  return (
    <div className="space-y-3" data-testid="decision-selector">
      <div className="flex items-center justify-between">
        <span className="font-sans text-xs font-bold uppercase tracking-wider text-[#040e20]">
          Sua Avaliação Obrigatória deste Imóvel *
        </span>
        {!selectedDecision && (
          <span
            className="text-xs font-semibold text-[#aa2d00]"
            data-testid="decision-required-badge"
          >
            Escolha 1 das 3 opções para liberar o avanço
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {options.map((opt) => {
          const isSelected = selectedDecision === opt.type;
          return (
            <button
              key={opt.type}
              type="button"
              role="radio"
              aria-checked={isSelected}
              data-testid={opt.testId}
              onClick={() => onSelectDecision(opt.type)}
              className={`p-4 rounded-cards border-2 text-left transition-all flex flex-col justify-between gap-2 cursor-pointer ${
                isSelected ? opt.activeClass : opt.idleClass
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="font-display font-black text-lg">{opt.label}</span>
                {opt.icon}
              </div>
              <p
                className={`font-sans text-xs leading-snug ${
                  isSelected
                    ? opt.type === 'DOUBT'
                      ? 'text-[#181d26]/90'
                      : 'text-white/90'
                    : 'text-[#525965]'
                }`}
              >
                {opt.subtitle}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
};
