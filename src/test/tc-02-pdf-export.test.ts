import { describe, it, expect } from 'vitest';
import { getDemoTour } from '@/infrastructure/demo/demoData';
import {
  buildGuidePdfStructure,
  generateGuidePdf,
} from '@/infrastructure/pdf/guidePdfGenerator';

describe('TC-02: Exportação do Guia em PDF ("Apenas Isso")', () => {
  it('builds Page 1 Prologue and exactly 1 page per property (Pages 2..N+1) with zero evaluation fields', async () => {
    const demoTour = getDemoTour(); // Has 3 stops
    const structure = buildGuidePdfStructure(demoTour);

    // Total pages must be strictly 1 (Prologue) + N (3 stops) = 4 pages
    expect(structure.totalPages).toBe(4);
    expect(structure.containsEvaluationFields).toBe(false);

    // Page 1 Prologue checks
    expect(structure.page1Prologue.items).toHaveLength(3);
    expect(structure.page1Prologue.items[0]).toEqual({
      orderLabel: '#01',
      condominiumName: 'Residencial Alphaville 1',
      formattedPrice: 'R$ 4.850.000,00',
    });
    expect(structure.page1Prologue.items[1]).toEqual({
      orderLabel: '#02',
      condominiumName: 'Condomínio Aldeia do Vale',
      formattedPrice: 'R$ 6.200.000,00',
    });
    expect(structure.page1Prologue.items[2]).toEqual({
      orderLabel: '#03',
      condominiumName: 'Jardins Paris',
      formattedPrice: 'R$ 5.400.000,00',
    });

    // Pages 2..4 dedicated property pages check
    expect(structure.propertyPages).toHaveLength(3);
    expect(structure.propertyPages[0].pageNumber).toBe(2);
    expect(structure.propertyPages[0].condominiumName).toBe('Residencial Alphaville 1');
    expect(structure.propertyPages[0].hasFacadeImage).toBe(true);
    expect(structure.propertyPages[0].fullDescription).toContain('620 m²');

    expect(structure.propertyPages[1].pageNumber).toBe(3);
    expect(structure.propertyPages[1].condominiumName).toBe('Condomínio Aldeia do Vale');

    expect(structure.propertyPages[2].pageNumber).toBe(4);
    expect(structure.propertyPages[2].condominiumName).toBe('Jardins Paris');

    // Generate actual jsPDF document and verify page count in PDF engine
    const { doc, filename } = await generateGuidePdf(demoTour, { autoDownload: false });
    expect(doc.getNumberOfPages()).toBe(4);
    expect(filename).toContain('guia-visitas-');
    expect(filename.endsWith('.pdf')).toBe(true);
  });
});
