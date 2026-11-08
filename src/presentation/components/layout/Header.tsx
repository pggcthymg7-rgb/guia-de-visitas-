import React from 'react';
import { Link } from 'react-router-dom';
import { Menu, Building2, Compass } from 'lucide-react';

export interface HeaderProps {
  mode: 'BROKER' | 'VISITOR' | 'REPORT';
  tourTitle?: string;
  currentStopNumber?: number;
  totalStops?: number;
  visitorName?: string;
  onOpenDrawer?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  mode,
  tourTitle,
  currentStopNumber,
  totalStops,
  visitorName,
  onOpenDrawer,
}) => {
  return (
    <header
      className="sticky top-0 z-30 bg-[#ffffff] border-b border-[#e0e2e6] shadow-header transition-all"
      data-testid="app-header"
    >
      <div className="max-w-page mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        {/* Left: Progress Badge or Brand Identity */}
        <div className="flex items-center gap-3 min-w-0">
          {mode === 'VISITOR' && currentStopNumber && totalStops ? (
            <span
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-tags bg-[#c7e5f2] text-[#040e20] font-sans text-xs sm:text-sm font-semibold whitespace-nowrap border border-[#1b61c9]/20"
              data-testid="visitor-progress-badge"
            >
              <Compass className="w-4 h-4 text-[#1b61c9]" />
              Imóvel {currentStopNumber.toString().padStart(2, '0')} de {totalStops.toString().padStart(2, '0')}
            </span>
          ) : (
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-[#040e20] hover:opacity-80 transition-opacity"
            >
              <div className="w-9 h-9 rounded-buttons bg-[#181d26] text-white flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <span className="font-display font-black text-lg tracking-normal hidden sm:inline">
                Guia de Visitas
              </span>
            </Link>
          )}
        </div>

        {/* Center: Tour Title */}
        <div className="flex-1 text-center truncate px-2">
          {tourTitle && (
            <div className="truncate">
              <p className="font-sans font-semibold text-sm sm:text-base text-[#040e20] truncate">
                {tourTitle}
              </p>
              {visitorName && (
                <p className="font-sans text-xs text-[#525965] truncate">
                  Visitante: <strong className="text-[#181d26]">{visitorName}</strong>
                </p>
              )}
            </div>
          )}
        </div>

        {/* Right: Hamburger Menu Button (Mode Visitor) or Broker Shortcut */}
        <div className="flex items-center gap-2 shrink-0">
          {mode === 'VISITOR' && onOpenDrawer && (
            <button
              type="button"
              onClick={onOpenDrawer}
              aria-label="Abrir Menu Hambúrguer de Consulta Rápida"
              data-testid="hamburger-menu-button"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-buttons bg-[#ffffff] border border-[#181d26] text-[#181d26] font-sans text-sm font-semibold hover:bg-[#faf5e8] active:scale-[0.99] transition-all"
            >
              <Menu className="w-5 h-5" />
              <span className="hidden sm:inline">Roteiro Completo</span>
            </button>
          )}

          {mode !== 'BROKER' && (
            <Link
              to="/"
              className="px-3 py-2 rounded-buttons text-xs sm:text-sm font-semibold text-[#525965] hover:text-[#181d26] hover:bg-[#faf5e8] transition-colors"
            >
              Painel do Corretor
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
