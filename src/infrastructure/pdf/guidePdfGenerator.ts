import { jsPDF } from 'jspdf';
import type { VisitTour, PropertyStop } from '@/domain/models/tour';
import { centsToBrl } from '@/domain/value-objects/money';

export interface GeneratedPdfStructure {
  totalPages: number;
  page1Prologue: {
    title: string;
    visitDate: string;
    brokerName: string;
    visitorSummary: string;
    items: Array<{
      orderLabel: string;
      condominiumName: string;
      formattedPrice: string;
    }>;
  };
  propertyPages: Array<{
    pageNumber: number;
    orderLabel: string;
    condominiumName: string;
    formattedPrice: string;
    title: string;
    fullDescription: string;
    hasFacadeImage: boolean;
  }>;
  containsEvaluationFields: false;
}

/**
 * Cooperative yield to browser event loop to prevent main thread blocking on iOS/Mobile.
 */
async function yieldToMainThread(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(() => resolve());
    } else {
      setTimeout(resolve, 0);
    }
  });
}

/**
 * Safely renders an image dataURL or external URL onto a temporary canvas and returns a clean JPEG DataURL,
 * strictly respecting the WebKit < 30MB memory ceiling (zeroing width/height immediately).
 */
async function prepareImageForPdf(imageSource: string): Promise<string | null> {
  if (!imageSource) return null;

  // If already a JPEG/PNG data URL, return directly
  if (imageSource.startsWith('data:image/jpeg') || imageSource.startsWith('data:image/png')) {
    return imageSource;
  }

  if (typeof document === 'undefined') return null;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    let settled = false;

    const cleanup = () => {
      img.onload = null;
      img.onerror = null;
      img.src = '';
    };

    const timeoutId = setTimeout(() => {
      if (!settled) {
        settled = true;
        cleanup();
        resolve(null);
      }
    }, 350);

    img.onload = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      try {
        const maxDim = 1000;
        const origW = img.naturalWidth || img.width || 800;
        const origH = img.naturalHeight || img.height || 600;
        const scale = Math.min(1, maxDim / origW, maxDim / origH);
        const w = Math.max(1, Math.round(origW * scale));
        const h = Math.max(1, Math.round(origH * scale));

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) {
          cleanup();
          resolve(null);
          return;
        }
        ctx.fillStyle = '#faf5e8';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        const jpegUrl = canvas.toDataURL('image/jpeg', 0.78);

        // WebKit Jetsam prevention: immediately zero out canvas memory
        canvas.width = 0;
        canvas.height = 0;
        ctx.clearRect(0, 0, 0, 0);
        cleanup();
        resolve(jpegUrl);
      } catch {
        cleanup();
        resolve(null);
      }
    };

    img.onerror = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      cleanup();
      resolve(null);
    };

    img.src = imageSource;
  });
}

/**
 * Pure deterministic builder of the Pre-Visit Guide PDF structure.
 * Enforces TC-02 ("Apenas Isso"):
 * - Page 1: Prologue with ordered stops (#01..#N), Condominium Name, and Price in BRL.
 * - Pages 2..N+1: Exactly 1 page per property with Facade Photo, Condominium Name, Price, and Full Description.
 * - Strictly ZERO evaluation fields, decision boxes, or notes sections.
 */
export function buildGuidePdfStructure(tour: VisitTour): GeneratedPdfStructure {
  const orderedStops = [...tour.stops].sort((a, b) => a.orderIndex - b.orderIndex);

  const visitorSummary =
    tour.visitorCount === 2 && tour.visitor2Name
      ? `${tour.visitor1Name} & ${tour.visitor2Name}`
      : tour.visitor1Name;

  const page1Items = orderedStops.map((stop, idx) => ({
    orderLabel: `#${(idx + 1).toString().padStart(2, '0')}`,
    condominiumName: stop.condominiumName,
    formattedPrice: centsToBrl(stop.priceCents),
  }));

  const propertyPages = orderedStops.map((stop, idx) => ({
    pageNumber: idx + 2,
    orderLabel: `Imóvel ${(idx + 1).toString().padStart(2, '0')}`,
    condominiumName: stop.condominiumName,
    formattedPrice: centsToBrl(stop.priceCents),
    title: stop.title,
    fullDescription: stop.fullDescription,
    hasFacadeImage: Boolean(stop.facadeImageDataUrl && stop.facadeImageDataUrl.trim().length > 0),
  }));

  return {
    totalPages: 1 + orderedStops.length,
    page1Prologue: {
      title: tour.title,
      visitDate: tour.visitDate,
      brokerName: tour.brokerName,
      visitorSummary,
      items: page1Items,
    },
    propertyPages,
    containsEvaluationFields: false,
  };
}

/**
 * Generates the Pre-Visit Guide jsPDF document and optionally triggers download.
 */
export async function generateGuidePdf(
  tour: VisitTour,
  options: { autoDownload?: boolean } = { autoDownload: true }
): Promise<{ doc: jsPDF; structure: GeneratedPdfStructure; filename: string }> {
  const structure = buildGuidePdfStructure(tour);
  const orderedStops: PropertyStop[] = [...tour.stops].sort((a, b) => a.orderIndex - b.orderIndex);

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;

  // =========================================================================
  // PAGE 1: PROLOGUE / SUMÁRIO EXECUTIVO DO ROTEIRO
  // =========================================================================
  // Warm Parchment Cream background (#faf5e8)
  doc.setFillColor(250, 245, 232);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Top Header Editorial Banner (Onyx #181d26)
  doc.setFillColor(24, 29, 38);
  doc.roundedRect(margin, margin, contentWidth, 42, 4, 4, 'F');

  doc.setTextColor(199, 229, 242); // Pale Sky #c7e5f2
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('GUIA DE VISITAS IMOBILIÁRIAS — PRÓLOGO DO ROTEIRO', margin + 8, margin + 10);

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  const splitTitle = doc.splitTextToSize(structure.page1Prologue.title, contentWidth - 16);
  doc.text(splitTitle, margin + 8, margin + 20);

  doc.setTextColor(224, 226, 230);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(
    `Data: ${structure.page1Prologue.visitDate}   |   Cliente(s): ${structure.page1Prologue.visitorSummary}   |   Corretor: ${structure.page1Prologue.brokerName}`,
    margin + 8,
    margin + 36
  );

  // Section Title: Ordem das Visitas
  let yCursor = margin + 54;
  doc.setTextColor(4, 14, 32); // Midnight Indigo
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Ordem Oficial das Visitas do Dia', margin, yCursor);

  yCursor += 4;
  doc.setDrawColor(224, 226, 230);
  doc.line(margin, yCursor, pageWidth - margin, yCursor);
  yCursor += 8;

  // Ordered List of Properties on Page 1 (Order, Condominium Name, Price)
  structure.page1Prologue.items.forEach((item) => {
    if (yCursor > pageHeight - 30) {
      return;
    }

    // White Card Surface
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(224, 226, 230);
    doc.roundedRect(margin, yCursor, contentWidth, 16, 3, 3, 'FD');

    // Order Badge (#01, #02...)
    doc.setFillColor(24, 29, 38);
    doc.roundedRect(margin + 4, yCursor + 3, 14, 10, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(item.orderLabel, margin + 6.5, yCursor + 9.5);

    // Condominium Name
    doc.setTextColor(4, 14, 32);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    const condoText = doc.splitTextToSize(item.condominiumName, contentWidth - 75)[0] || item.condominiumName;
    doc.text(condoText, margin + 22, yCursor + 10);

    // Formatted Price (Right Aligned)
    doc.setTextColor(10, 46, 14); // Forest Ink
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(item.formattedPrice, pageWidth - margin - 6, yCursor + 10, { align: 'right' });

    yCursor += 20;
  });

  // Footer Page 1
  doc.setTextColor(146, 151, 160);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(
    `Página 1 de ${structure.totalPages} — Sumário Executivo do Roteiro`,
    pageWidth / 2,
    pageHeight - 10,
    { align: 'center' }
  );

  // =========================================================================
  // PAGES 2..N+1: 1 DEDICATED PAGE PER PROPERTY ("APENAS ISSO")
  // =========================================================================
  for (let i = 0; i < orderedStops.length; i++) {
    await yieldToMainThread();

    const stop = orderedStops[i];
    const pageMeta = structure.propertyPages[i];

    doc.addPage();

    // Warm Parchment Cream background
    doc.setFillColor(250, 245, 232);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // White Editorial Card Frame
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(224, 226, 230);
    doc.roundedRect(margin, margin, contentWidth, pageHeight - margin * 2 - 8, 4, 4, 'FD');

    let propY = margin + 10;

    // Order Chapter Pill + Price
    doc.setFillColor(24, 29, 38); // Onyx
    doc.roundedRect(margin + 8, propY, 32, 9, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text(pageMeta.orderLabel.toUpperCase(), margin + 11, propY + 6);

    // Price Badge
    doc.setTextColor(10, 46, 14); // Forest Ink
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(pageMeta.formattedPrice, pageWidth - margin - 8, propY + 6.5, { align: 'right' });

    propY += 16;

    // Condominium Name Headline
    doc.setTextColor(4, 14, 32); // Midnight Indigo
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    const condoLines = doc.splitTextToSize(stop.condominiumName, contentWidth - 16);
    doc.text(condoLines, margin + 8, propY);
    propY += condoLines.length * 7 + 2;

    // Property Subtitle / Title
    if (stop.title) {
      doc.setTextColor(82, 89, 101); // Graphite
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11.5);
      const titleLines = doc.splitTextToSize(stop.title, contentWidth - 16);
      doc.text(titleLines, margin + 8, propY);
      propY += titleLines.length * 5.5 + 4;
    }

    // Facade Image Box (Height ~85mm)
    const imgBoxHeight = 85;
    const imgBoxWidth = contentWidth - 16;
    doc.setFillColor(250, 245, 232);
    doc.setDrawColor(224, 226, 230);
    doc.roundedRect(margin + 8, propY, imgBoxWidth, imgBoxHeight, 3, 3, 'FD');

    const preparedImg = await prepareImageForPdf(stop.facadeImageDataUrl);
    if (preparedImg) {
      try {
        doc.addImage(preparedImg, 'JPEG', margin + 8, propY, imgBoxWidth, imgBoxHeight, undefined, 'FAST');
      } catch {
        doc.setTextColor(82, 89, 101);
        doc.setFontSize(10);
        doc.text(`Fachada: ${stop.condominiumName}`, pageWidth / 2, propY + imgBoxHeight / 2, {
          align: 'center',
        });
      }
    } else {
      doc.setTextColor(82, 89, 101);
      doc.setFontSize(10);
      doc.text(`Foto da Fachada — ${stop.condominiumName}`, pageWidth / 2, propY + imgBoxHeight / 2, {
        align: 'center',
      });
    }

    propY += imgBoxHeight + 10;

    // Full Description Section Header
    doc.setTextColor(4, 14, 32);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Descrição Completa do Imóvel', margin + 8, propY);

    propY += 3;
    doc.setDrawColor(224, 226, 230);
    doc.line(margin + 8, propY, pageWidth - margin - 8, propY);
    propY += 6;

    // Full Description Body Copy
    doc.setTextColor(51, 56, 64); // Charcoal
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    const maxDescHeight = pageHeight - margin - 20 - propY;
    const maxLines = Math.max(5, Math.floor(maxDescHeight / 5));
    const descLines = doc.splitTextToSize(stop.fullDescription, contentWidth - 16).slice(0, maxLines);
    doc.text(descLines, margin + 8, propY);

    // Page Footer
    doc.setTextColor(146, 151, 160);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(
      `Página ${pageMeta.pageNumber} de ${structure.totalPages} — ${pageMeta.orderLabel}: ${stop.condominiumName}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  const safeSlug = tour.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  const filename = `guia-visitas-${safeSlug || 'roteiro'}.pdf`;

  if (options.autoDownload && typeof window !== 'undefined') {
    try {
      doc.save(filename);
    } catch (err) {
      console.warn('[guidePdfGenerator] Failed to trigger browser download:', err);
    }
  }

  return { doc, structure, filename };
}
