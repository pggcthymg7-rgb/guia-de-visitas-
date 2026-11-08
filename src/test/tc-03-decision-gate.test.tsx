import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ClientVisitView } from '@/presentation/components/visitor/ClientVisitView';
import { storageService } from '@/infrastructure/storage/indexedDb';
import { getDemoTour } from '@/infrastructure/demo/demoData';

describe('TC-03: Fluxo do Cliente — Início e Trava de Decisão Obrigatória', () => {
  beforeEach(async () => {
    await storageService.clearAll();
    await storageService.saveTour(getDemoTour());
  });

  it('locks navigation to Property 2 until visitor explicitly chooses Gostei, Descartado or Em Dúvida', async () => {
    render(
      <MemoryRouter initialEntries={['/visit/demo-tour-alphaville-2026/VISITOR_1']}>
        <Routes>
          <Route path="/visit/:tourId/:slot" element={<ClientVisitView />} />
        </Routes>
      </MemoryRouter>
    );

    // Wait for welcome cover to appear
    const startBtn = await screen.findByTestId('start-visits-button');
    expect(screen.getByTestId('visitor-welcome-cover')).toBeInTheDocument();

    // Click "Começar Visitas"
    fireEvent.click(startBtn);

    // Should now be on Property 01
    expect(await screen.findByTestId('active-property-visit-view')).toBeInTheDocument();
    expect(screen.getByTestId('active-stop-order-label')).toHaveTextContent('Imóvel 01 de 03');
    expect(screen.getByTestId('active-stop-condo-name')).toHaveTextContent('Residencial Alphaville 1');

    // Verify advance button is strictly DISABLED and lock warning is visible
    const advanceBtn = screen.getByTestId('advance-stop-button');
    expect(advanceBtn).toBeDisabled();
    expect(screen.getByTestId('decision-lock-warning')).toBeInTheDocument();

    // Attempt clicking disabled advance button -> must remain on Imóvel 01
    fireEvent.click(advanceBtn);
    expect(screen.getByTestId('active-stop-order-label')).toHaveTextContent('Imóvel 01 de 03');

    // Type observation notes
    const notesTextarea = screen.getByTestId('visitor-notes-textarea');
    fireEvent.change(notesTextarea, {
      target: { value: 'Acabamento impecável e ótima iluminação natural.' },
    });

    // Still locked because no decision box was chosen yet
    expect(advanceBtn).toBeDisabled();

    // Select "Gostei" (LIKED)
    fireEvent.click(screen.getByTestId('decision-button-LIKED'));

    // Now advance button must be ENABLED and lock warning disappears
    expect(advanceBtn).not.toBeDisabled();
    expect(screen.queryByTestId('decision-lock-warning')).not.toBeInTheDocument();

    // Click "Salvar Anotações e Ir para o Próximo Imóvel"
    fireEvent.click(advanceBtn);

    // Verify transition to Imóvel 02
    await waitFor(() => {
      expect(screen.getByTestId('active-stop-order-label')).toHaveTextContent('Imóvel 02 de 03');
    });
    expect(screen.getByTestId('active-stop-condo-name')).toHaveTextContent('Condomínio Aldeia do Vale');

    // And on Imóvel 02, the advance button is locked again until Imóvel 02 is evaluated
    expect(screen.getByTestId('advance-stop-button')).toBeDisabled();
  });
});
