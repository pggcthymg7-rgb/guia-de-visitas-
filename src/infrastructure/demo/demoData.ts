import type { VisitTour, PropertyStop } from '@/domain/models/tour';

export const DEMO_TOUR_ID = 'demo-tour-alphaville-2026';

export const DEMO_PROPERTIES: PropertyStop[] = [
  {
    id: 'prop-demo-01',
    orderIndex: 1,
    condominiumName: 'Residencial Alphaville 1',
    priceCents: 485000000, // R$ 4.850.000,00
    title: 'Mansão Contemporânea com Vista para o Lago',
    fullDescription:
      'Espetacular residência contemporânea com 620 m² de área construída em terreno plano de 1.100 m². Possui 4 suítes plenas com closet (máster com hidromassagem e cuba dupla), amplo living com pé-direito duplo de 6 metros, lavabo finamente decorado, home cinema integrado e cozinha gourmet com ilha central em quartzo Calacatta. Área externa cinematográfica com piscina de borda infinita aquecida, sauna molhada, varanda gourmet completa com churrasqueira a carvão, irrigação automatizada e paisagismo exuberante. Garagem coberta para 4 veículos.',
    facadeImageDataUrl:
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'prop-demo-02',
    orderIndex: 2,
    condominiumName: 'Condomínio Aldeia do Vale',
    priceCents: 620000000, // R$ 6.200.000,00
    title: 'Casa Térrea Neoclássica em Bosque Nativo',
    fullDescription:
      'Exuberante casa térrea com arquitetura neoclássica e 780 m² de área construída em lote privativo de 2.400 m² cercado por mata nativa e lago privativo. Dispõe de 5 suítes com varanda privativa e vista para o bosque, salão principal em mármore Travertino Romano, adega subterrânea climatizada para 600 garrafas, escritório executivo e cozinha planejada com copa integrada. Quintal privativo com pomar produtivo, quadra de beach tennis privativa, piscina com raia de 20 metros e spa integrado. Sistema completo de energia fotovoltaica e poço artesiano.',
    facadeImageDataUrl:
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'prop-demo-03',
    orderIndex: 3,
    condominiumName: 'Jardins Paris',
    priceCents: 540000000, // R$ 5.400.000,00
    title: 'Residência Minimalista com Rooftop e Spa',
    fullDescription:
      'Projeto assinado por arquiteto renomado com 540 m² de área útil em conceito aberto e linhas retas minimalistas. Conta com 4 suítes máster com varandas integradas e brises metálicos móveis, living com esquadrias piso-teto que proporcionam integração total com o jardim e espelho d’água. Cozinha italiana com bancadas em Dekton e despensa walk-in. Destaque exclusivo para o rooftop lounge com spa aquecido para 8 pessoas, lareira externa ecológica e vista panorâmica para o skyline da cidade. Garagem subterrânea para 6 carros.',
    facadeImageDataUrl:
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
  },
];

export function getDemoTour(): VisitTour {
  return {
    id: DEMO_TOUR_ID,
    title: 'Roteiro Exclusivo de Mansões em Condomínio Fechado',
    visitDate: '2026-11-08',
    brokerName: 'Roberto Silveira — Private Broker',
    visitorCount: 2,
    visitor1Name: 'Dra. Mariana Costa',
    visitor2Name: 'Dr. Eduardo Fontes',
    stops: DEMO_PROPERTIES.map((p) => ({ ...p })),
    createdAtIso: '2026-11-08T10:00:00.000Z',
    updatedAtIso: '2026-11-08T10:00:00.000Z',
  };
}

export function createFreshDemoTour(titleSuffix?: string): VisitTour {
  const timestamp = new Date().toISOString();
  const dateFormatted = timestamp.slice(0, 10);
  const randomSuffix = Math.random().toString(36).substring(2, 8);

  return {
    id: `tour-${dateFormatted}-${randomSuffix}`,
    title: titleSuffix ? `Roteiro Exclusivo — ${titleSuffix}` : 'Roteiro Exclusivo de Mansões em Condomínio Fechado',
    visitDate: dateFormatted,
    brokerName: 'Roberto Silveira — Private Broker',
    visitorCount: 2,
    visitor1Name: 'Dra. Mariana Costa',
    visitor2Name: 'Dr. Eduardo Fontes',
    stops: DEMO_PROPERTIES.map((p, index) => ({
      ...p,
      id: `prop-${randomSuffix}-${index + 1}`,
      orderIndex: index + 1,
    })),
    createdAtIso: timestamp,
    updatedAtIso: timestamp,
  };
}

export function isDemoTour(tourId: string): boolean {
  return tourId === DEMO_TOUR_ID || tourId.startsWith('demo-');
}
