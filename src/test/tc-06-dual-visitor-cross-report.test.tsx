import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppRoutes } from '@/App';
import { storageService } from '@/infrastructure/storage/indexedDb';
import { getDemoTour } from '@/infrastructure/demo/demoData';
import { createVisitorSession, saveEvaluationDraft } from '@/domain/models/session';

describe('TC-06: Modo 2 Visitantes — Páginas Individuais e Relatório Cruzado (Match Matrix)', () => {
  beforeEach(async () => {
    await storageService.clearAll();
    const dualTour = getDemoTour(); // Configured for 2 visitors: Dra. Mariana Costa & Dr. Eduardo Fontes
    await storageService.saveTour(dualTour);

    // Populate Visitor 1 Session:
    // Stop 1: LIKED ("Amei a vista para o lago")
    // Stop 2: LIKED ("Bosque maravilhoso")
    // Stop 3: DISCARDED ("Faltou gramado")
    let s1 = createVisitorSession(dualTour, 'VISITOR_1', `${dualTour.id}_VISITOR_1`);
    s1 = saveEvaluationDraft(s1, 'prop-demo-01', {
      decision: 'LIKED',
      notes: 'Amei a vista para o lago e o espaço gourmet.',
    });
    s1 = saveEvaluationDraft(s1, 'prop-demo-02', {
      decision: 'LIKED',
      notes: 'Bosque maravilhoso e casa térrea perfeita.',
    });
    s1 = saveEvaluationDraft(s1, 'prop-demo-03', {
      decision: 'DISCARDED',
      notes: 'Faltou gramado para as crianças.',
    });
    s1.status = 'COMPLETED';
    await storageService.saveSession(s1);

    // Populate Visitor 2 Session:
    // Stop 1: LIKED ("Garagem excelente e acabamento nota 10") -> MATCH_POSITIVE (Match Perfeito!)
    // Stop 2: DISCARDED ("Achei o terreno muito grande para manter") -> DIVERGENCE (Ponto de Debate)
    // Stop 3: DISCARDED ("Não gostei da fachada minimalista") -> CONSENSUAL_DISCARD (Descarte Consensual)
    let s2 = createVisitorSession(dualTour, 'VISITOR_2', `${dualTour.id}_VISITOR_2`);
    s2 = saveEvaluationDraft(s2, 'prop-demo-01', {
      decision: 'LIKED',
      notes: 'Garagem excelente e acabamento nota 10.',
    });
    s2 = saveEvaluationDraft(s2, 'prop-demo-02', {
      decision: 'DISCARDED',
      notes: 'Achei o terreno muito grande para manter.',
    });
    s2 = saveEvaluationDraft(s2, 'prop-demo-03', {
      decision: 'DISCARDED',
      notes: 'Não gostei da fachada minimalista.',
    });
    s2.status = 'COMPLETED';
    await storageService.saveSession(s2);
  });

  it('cross-evaluates Visitor 1 and Visitor 2 side-by-side displaying Match Matrix statuses, notes, and PDF export', async () => {
    render(
      <MemoryRouter initialEntries={['/report/demo-tour-alphaville-2026']}>
        <AppRoutes />
      </MemoryRouter>
    );

    expect(await screen.findByTestId('cross-evaluation-report-view')).toBeInTheDocument();

    // Executive KPI counts check
    expect(screen.getByTestId('kpi-perfect-matches')).toHaveTextContent('1');
    expect(screen.getByTestId('kpi-divergences')).toHaveTextContent('1');
    expect(screen.getByTestId('kpi-consensual-discards')).toHaveTextContent('1');

    // Stop 1: Match Perfeito! (Both LIKED)
    expect(screen.getByTestId('match-status-seal-1')).toHaveTextContent('Match Perfeito!');
    expect(screen.getByTestId('cross-v1-decision-1')).toHaveTextContent('Gostei');
    expect(screen.getByTestId('cross-v1-notes-1')).toHaveTextContent(
      'Amei a vista para o lago e o espaço gourmet.'
    );
    expect(screen.getByTestId('cross-v2-decision-1')).toHaveTextContent('Gostei');
    expect(screen.getByTestId('cross-v2-notes-1')).toHaveTextContent(
      'Garagem excelente e acabamento nota 10.'
    );

    // Stop 2: Ponto de Debate (Divergência) (LIKED vs DISCARDED)
    expect(screen.getByTestId('match-status-seal-2')).toHaveTextContent(
      'Ponto de Debate (Divergência)'
    );
    expect(screen.getByTestId('cross-v1-decision-2')).toHaveTextContent('Gostei');
    expect(screen.getByTestId('cross-v2-decision-2')).toHaveTextContent('Descartado');

    // Stop 3: Descarte Consensual (Both DISCARDED)
    expect(screen.getByTestId('match-status-seal-3')).toHaveTextContent('Descarte Consensual');
    expect(screen.getByTestId('cross-v1-decision-3')).toHaveTextContent('Descartado');
    expect(screen.getByTestId('cross-v2-decision-3')).toHaveTextContent('Descartado');

    // Export Cross Report PDF
    fireEvent.click(screen.getByTestId('export-report-pdf-button'));
  });
});
