import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { BrokerDashboardView } from '@/presentation/components/broker/BrokerDashboardView';
import { storageService } from '@/infrastructure/storage/indexedDb';

describe('TC-01: Cadastro Ordenado de Roteiro pelo Corretor', () => {
  beforeEach(async () => {
    await storageService.clearAll();
  });

  it('starts with the 3 demo properties in order (#01, #02, #03) and allows adding and reordering stops', async () => {
    render(
      <MemoryRouter>
        <BrokerDashboardView />
      </MemoryRouter>
    );

    // Verify initial demo stops are displayed in exact order (01, 02, 03)
    expect(screen.getByTestId('stop-order-badge-1')).toHaveTextContent('Imóvel 01');
    expect(screen.getByTestId('stop-condo-name-1')).toHaveTextContent('Residencial Alphaville 1');

    expect(screen.getByTestId('stop-order-badge-2')).toHaveTextContent('Imóvel 02');
    expect(screen.getByTestId('stop-condo-name-2')).toHaveTextContent('Condomínio Aldeia do Vale');

    expect(screen.getByTestId('stop-order-badge-3')).toHaveTextContent('Imóvel 03');
    expect(screen.getByTestId('stop-condo-name-3')).toHaveTextContent('Jardins Paris');

    // Clear tour to test adding 3 custom stops from scratch and reordering
    fireEvent.click(screen.getByTestId('new-blank-tour-button'));
    expect(screen.getByTestId('empty-stops-placeholder')).toBeInTheDocument();

    const stopsToCreate = [
      {
        condo: 'Condomínio Quinta da Baroneza',
        price: '750000000', // R$ 7.500.000,00
        title: 'Casa de Campo Contemporânea',
        desc: 'Ampla casa com vista panorâmica para o golfe e 6 suítes.',
      },
      {
        condo: 'Fazenda Boa Vista',
        price: '1200000000', // R$ 12.000.000,00
        title: 'Residência Assinada por Isay Weinfeld',
        desc: 'Terreno de 4.000m² com piscina em pedra vulcânica e spa.',
      },
      {
        condo: 'Terras de São José',
        price: '590000000', // R$ 5.900.000,00
        title: 'Mansão Clássica Integrada ao Verde',
        desc: 'Área gourmet completa, quadra de tênis oficial e pomar.',
      },
    ];

    for (const item of stopsToCreate) {
      fireEvent.change(screen.getByTestId('condominium-name-input'), {
        target: { value: item.condo },
      });
      fireEvent.change(screen.getByTestId('property-price-input'), {
        target: { value: item.price },
      });
      fireEvent.change(screen.getByTestId('property-title-input'), {
        target: { value: item.title },
      });
      fireEvent.change(screen.getByTestId('property-description-input'), {
        target: { value: item.desc },
      });
      fireEvent.click(screen.getByTestId('submit-property-stop-button'));
    }

    // Verify all 3 added in sequence
    expect(screen.getByTestId('stop-condo-name-1')).toHaveTextContent('Condomínio Quinta da Baroneza');
    expect(screen.getByTestId('stop-price-1')).toHaveTextContent('R$ 7.500.000,00');

    expect(screen.getByTestId('stop-condo-name-2')).toHaveTextContent('Fazenda Boa Vista');
    expect(screen.getByTestId('stop-price-2')).toHaveTextContent('R$ 12.000.000,00');

    expect(screen.getByTestId('stop-condo-name-3')).toHaveTextContent('Terras de São José');
    expect(screen.getByTestId('stop-price-3')).toHaveTextContent('R$ 5.900.000,00');

    // Reorder: Move stop #2 ("Fazenda Boa Vista") UP to #1
    fireEvent.click(screen.getByTestId('move-up-button-2'));

    expect(screen.getByTestId('stop-order-badge-1')).toHaveTextContent('Imóvel 01');
    expect(screen.getByTestId('stop-condo-name-1')).toHaveTextContent('Fazenda Boa Vista');

    expect(screen.getByTestId('stop-order-badge-2')).toHaveTextContent('Imóvel 02');
    expect(screen.getByTestId('stop-condo-name-2')).toHaveTextContent('Condomínio Quinta da Baroneza');

    // Move stop #2 DOWN to #3
    fireEvent.click(screen.getByTestId('move-down-button-2'));

    expect(screen.getByTestId('stop-condo-name-2')).toHaveTextContent('Terras de São José');
    expect(screen.getByTestId('stop-condo-name-3')).toHaveTextContent('Condomínio Quinta da Baroneza');
  });
});
