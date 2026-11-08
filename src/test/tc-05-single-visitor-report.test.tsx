import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppRoutes } from '@/App';
import { storageService } from '@/infrastructure/storage/indexedDb';
import { getDemoTour } from '@/infrastructure/demo/demoData';

describe('TC-05: Modo 1 Visitante — Relatório Final Individual', () => {
  beforeEach(async () => {
    await storageService.clearAll();
    const singleVisitorTour = {
      ...getDemoTour(),
      id: 'tour-single-visitor-test',
      visitorCount: 1 as const,
      visitor1Name: 'Carlos Eduardo',
      visitor2Name: undefined,
    };
    await storageService.saveTour(singleVisitorTour);
  });

  it('completes all N stops for 1 visitor and renders the consolidated Individual Report with decisions, notes, and PDF export', async () => {
    render(
      <MemoryRouter initialEntries={['/visit/tour-single-visitor-test/VISITOR_1']}>
        <AppRoutes />
      </MemoryRouter>
    );

    // Start tour
    fireEvent.click(await screen.findByTestId('start-visits-button'));

    // Stop 1: LIKED
    await screen.findByTestId('active-property-visit-view');
    fireEvent.change(screen.getByTestId('visitor-notes-textarea'), {
      target: { value: 'Amei a piscina de borda infinita da casa 1.' },
    });
    fireEvent.click(screen.getByTestId('decision-button-LIKED'));
    fireEvent.click(screen.getByTestId('advance-stop-button'));

    // Stop 2: DOUBT
    await waitFor(() => {
      expect(screen.getByTestId('active-stop-order-label')).toHaveTextContent('Imóvel 02 de 03');
    });
    fireEvent.change(screen.getByTestId('visitor-notes-textarea'), {
      target: { value: 'Terreno lindo, mas preciso medir a distância até o colégio.' },
    });
    fireEvent.click(screen.getByTestId('decision-button-DOUBT'));
    fireEvent.click(screen.getByTestId('advance-stop-button'));

    // Stop 3: DISCARDED
    await waitFor(() => {
      expect(screen.getByTestId('active-stop-order-label')).toHaveTextContent('Imóvel 03 de 03');
    });
    fireEvent.change(screen.getByTestId('visitor-notes-textarea'), {
      target: { value: 'Escada muito alta para o nosso cachorro.' },
    });
    fireEvent.click(screen.getByTestId('decision-button-DISCARDED'));
    fireEvent.click(screen.getByTestId('advance-stop-button'));

    // Completion screen -> Click "Gerar Relatórios"
    const genReportsBtn = await screen.findByTestId('generate-reports-button');
    fireEvent.click(genReportsBtn);

    // Verify Consolidated Individual Report View
    expect(await screen.findByTestId('individual-report-view')).toBeInTheDocument();
    expect(screen.getByTestId('individual-liked-count')).toHaveTextContent('Gostei: 1');
    expect(screen.getByTestId('individual-doubt-count')).toHaveTextContent('Em Dúvida: 1');
    expect(screen.getByTestId('individual-discarded-count')).toHaveTextContent('Descartados: 1');

    expect(screen.getByTestId('individual-item-condo-1')).toHaveTextContent('Residencial Alphaville 1');
    expect(screen.getByTestId('individual-item-decision-1')).toHaveTextContent('Gostei');
    expect(screen.getByTestId('individual-item-notes-1')).toHaveTextContent(
      'Amei a piscina de borda infinita da casa 1.'
    );

    expect(screen.getByTestId('individual-item-condo-2')).toHaveTextContent('Condomínio Aldeia do Vale');
    expect(screen.getByTestId('individual-item-decision-2')).toHaveTextContent('Em Dúvida');

    expect(screen.getByTestId('individual-item-condo-3')).toHaveTextContent('Jardins Paris');
    expect(screen.getByTestId('individual-item-decision-3')).toHaveTextContent('Descartado');

    // Trigger PDF export button
    const exportBtn = screen.getByTestId('export-report-pdf-button');
    fireEvent.click(exportBtn);
  });
});
