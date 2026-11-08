import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ClientVisitView } from '@/presentation/components/visitor/ClientVisitView';
import { storageService } from '@/infrastructure/storage/indexedDb';
import { getDemoTour } from '@/infrastructure/demo/demoData';

describe('TC-04: Consulta no Menu Hambúrguer sem Sair da Visita Atual (Zero Data Loss)', () => {
  beforeEach(async () => {
    await storageService.clearAll();
    await storageService.saveTour(getDemoTour());
  });

  it('allows opening Hamburger Drawer on Property 2, inspecting Property 1 and 3, and closing with 100% intact notes on Property 2', async () => {
    render(
      <MemoryRouter initialEntries={['/visit/demo-tour-alphaville-2026/VISITOR_1']}>
        <Routes>
          <Route path="/visit/:tourId/:slot" element={<ClientVisitView />} />
        </Routes>
      </MemoryRouter>
    );

    // Start visit
    fireEvent.click(await screen.findByTestId('start-visits-button'));

    // Complete Property 1 to reach Property 2
    await screen.findByTestId('active-property-visit-view');
    fireEvent.change(screen.getByTestId('visitor-notes-textarea'), {
      target: { value: 'Notas da casa 1: vista incrível para o lago.' },
    });
    fireEvent.click(screen.getByTestId('decision-button-LIKED'));
    fireEvent.click(screen.getByTestId('advance-stop-button'));

    // Now on Property 2
    await waitFor(() => {
      expect(screen.getByTestId('active-stop-order-label')).toHaveTextContent('Imóvel 02 de 03');
    });
    expect(screen.getByTestId('active-stop-condo-name')).toHaveTextContent('Condomínio Aldeia do Vale');

    // Visitor types live observation notes on Property 2 WITHOUT advancing yet
    const liveNoteText =
      'Estou digitando este parágrafo detalhado no Imóvel 02 sobre o bosque privativo e a adega subterrânea.';
    const textarea = screen.getByTestId('visitor-notes-textarea') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: liveNoteText } });
    expect(textarea.value).toBe(liveNoteText);

    // Open Hamburger Menu Drawer
    fireEvent.click(screen.getByTestId('hamburger-menu-button'));

    // Drawer overlay appears with all 3 properties
    expect(screen.getByTestId('hamburger-drawer-overlay')).toBeInTheDocument();
    expect(screen.getByTestId('drawer-stop-card-1')).toHaveTextContent('Residencial Alphaville 1');
    expect(screen.getByTestId('drawer-stop-card-1')).toHaveTextContent(
      'Notas da casa 1: vista incrível para o lago.'
    );
    expect(screen.getByTestId('drawer-stop-card-2')).toHaveTextContent('Condomínio Aldeia do Vale');
    expect(screen.getByTestId('drawer-current-stop-indicator')).toHaveTextContent(
      'Imóvel Atual em Visita'
    );
    expect(screen.getByTestId('drawer-stop-card-3')).toHaveTextContent('Jardins Paris');

    // Close Hamburger Menu Drawer
    fireEvent.click(screen.getByTestId('close-hamburger-drawer-button'));
    expect(screen.queryByTestId('hamburger-drawer-overlay')).not.toBeInTheDocument();

    // Verify client is STILL on Property 2 and the typed text is 100% intact (Zero Data Loss)
    expect(screen.getByTestId('active-stop-order-label')).toHaveTextContent('Imóvel 02 de 03');
    expect(screen.getByTestId('active-stop-condo-name')).toHaveTextContent('Condomínio Aldeia do Vale');
    expect((screen.getByTestId('visitor-notes-textarea') as HTMLTextAreaElement).value).toBe(
      liveNoteText
    );
  });
});
