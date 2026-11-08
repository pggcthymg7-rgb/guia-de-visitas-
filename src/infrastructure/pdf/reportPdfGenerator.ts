import { jsPDF } from 'jspdf';
import type { IndividualReport, CrossEvaluationReport } from '@/domain/models/comparison';
import { getDecisionLabel } from '@/domain/services/comparisonEngine';
import { centsToBrl } from '@/domain/value-objects/money';

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
 * Generates and downloads the Individual Visit Report PDF (TC-05).
 */
export async function generateIndividualReportPdf(
  report: IndividualReport,
  options: { autoDownload?: boolean } = { autoDownload: true }
): Promise<{ doc: jsPDF; filename: string }> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;

  const paintPageBackground = () => {
    doc.setFillColor(250, 245, 232); // Parchment Cream #faf5e8
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
  };

  paintPageBackground();

  // Header Banner
  doc.setFillColor(24, 29, 38); // Onyx #181d26
  doc.roundedRect(margin, margin, contentWidth, 38, 4, 4, 'F');

  doc.setTextColor(199, 229, 242);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('RELATÓRIO INDIVIDUAL DE VISITAS IMOBILIÁRIAS', margin + 8, margin + 10);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  const titleLines = doc.splitTextToSize(report.tourTitle, contentWidth - 16);
  doc.text(titleLines, margin + 8, margin + 19);

  doc.setTextColor(224, 226, 230);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(
    `Visitante: ${report.visitorName}   |   Data: ${report.visitDate}   |   Corretor: ${report.brokerName}`,
    margin + 8,
    margin + 33
  );

  // Summary KPI Row
  let y = margin + 45;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(224, 226, 230);
  doc.roundedRect(margin, y, contentWidth, 16, 3, 3, 'FD');

  doc.setTextColor(4, 14, 32);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(
    `Resumo: ${report.likedCount} Gostei   •   ${report.doubtCount} Em Dúvida   •   ${report.discardedCount} Descartado(s)   (Total: ${report.totalStops} imóveis)`,
    margin + 6,
    y + 10
  );

  y += 24;

  // Iterate over items
  for (let i = 0; i < report.items.length; i++) {
    await yieldToMainThread();
    const item = report.items[i];
    const orderStr = `#${item.stop.orderIndex.toString().padStart(2, '0')}`;
    const priceStr = centsToBrl(item.stop.priceCents);
    const decisionStr = getDecisionLabel(item.decision);
    const notesText = item.notes?.trim() ? item.notes.trim() : 'Sem observações registradas.';
    const noteLines = doc.splitTextToSize(`Observações: ${notesText}`, contentWidth - 16);
    const cardHeight = Math.max(36, 24 + noteLines.length * 5);

    if (y + cardHeight > pageHeight - 20) {
      doc.addPage();
      paintPageBackground();
      y = margin;
    }

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(224, 226, 230);
    doc.roundedRect(margin, y, contentWidth, cardHeight, 3, 3, 'FD');

    // Order + Condominium + Price
    doc.setTextColor(4, 14, 32);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11.5);
    doc.text(`${orderStr} — ${item.stop.condominiumName} (${priceStr})`, margin + 6, y + 9);

    // Decision Pill
    if (item.decision === 'LIKED') {
      doc.setFillColor(10, 46, 14); // Forest Ink
      doc.setTextColor(255, 255, 255);
    } else if (item.decision === 'DISCARDED') {
      doc.setFillColor(170, 45, 0); // Terracotta
      doc.setTextColor(255, 255, 255);
    } else {
      doc.setFillColor(252, 180, 42); // Marigold
      doc.setTextColor(24, 29, 38);
    }
    doc.roundedRect(pageWidth - margin - 38, y + 3.5, 32, 8, 2, 2, 'F');
    doc.setFontSize(8.5);
    doc.text(decisionStr.toUpperCase(), pageWidth - margin - 22, y + 9, { align: 'center' });

    // Property Title
    doc.setTextColor(82, 89, 101);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.text(item.stop.title, margin + 6, y + 15.5);

    // Notes
    doc.setTextColor(51, 56, 64);
    doc.setFontSize(9.5);
    doc.text(noteLines, margin + 6, y + 23);

    y += cardHeight + 6;
  }

  const safeVisitor = report.visitorName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  const filename = `relatorio-individual-${safeVisitor || 'visitante'}.pdf`;

  if (options.autoDownload && typeof window !== 'undefined') {
    try {
      doc.save(filename);
    } catch (err) {
      console.warn('[reportPdfGenerator] Failed to save individual PDF:', err);
    }
  }

  return { doc, filename };
}

/**
 * Generates and downloads the Cross-Evaluation Report PDF (Match Matrix for 2 Visitors - TC-06).
 */
export async function generateCrossReportPdf(
  report: CrossEvaluationReport,
  options: { autoDownload?: boolean } = { autoDownload: true }
): Promise<{ doc: jsPDF; filename: string }> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;

  const paintPageBackground = () => {
    doc.setFillColor(250, 245, 232); // Parchment Cream #faf5e8
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
  };

  paintPageBackground();

  // Header Banner
  doc.setFillColor(24, 29, 38); // Onyx
  doc.roundedRect(margin, margin, contentWidth, 40, 4, 4, 'F');

  doc.setTextColor(250, 145, 224); // Petal Pink accent
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('RELATÓRIO CRUZADO (MATCH MATRIX) — 2 VISITANTES', margin + 8, margin + 10);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  const titleLines = doc.splitTextToSize(report.tourTitle, contentWidth - 16);
  doc.text(titleLines, margin + 8, margin + 19);

  doc.setTextColor(224, 226, 230);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(
    `Visitantes: ${report.visitor1Name} & ${report.visitor2Name}   |   Data: ${report.visitDate}`,
    margin + 8,
    margin + 34
  );

  // Executive Summary Bar
  let y = margin + 46;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(224, 226, 230);
  doc.roundedRect(margin, y, contentWidth, 16, 3, 3, 'FD');

  doc.setTextColor(4, 14, 32);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text(
    `Match Perfeito: ${report.summary.perfectMatchesCount}  |  Alinhamento Parcial: ${report.summary.partialAlignmentsCount}  |  Divergências: ${report.summary.divergencesCount}  |  Dúvidas: ${report.summary.mutualDoubtsCount}  |  Descartes: ${report.summary.consensualDiscardsCount}`,
    margin + 6,
    y + 10
  );

  y += 22;

  for (let i = 0; i < report.matches.length; i++) {
    await yieldToMainThread();
    const match = report.matches[i];
    const orderStr = `#${match.stop.orderIndex.toString().padStart(2, '0')}`;
    const priceStr = centsToBrl(match.stop.priceCents);
    const statusLabel = match.meta?.label || 'Aguardando Avaliação';

    const v1Decision = getDecisionLabel(match.visitor1Evaluation?.decision);
    const v1Notes = match.visitor1Evaluation?.notes?.trim() || 'Sem observações.';
    const v2Decision = getDecisionLabel(match.visitor2Evaluation?.decision);
    const v2Notes = match.visitor2Evaluation?.notes?.trim() || 'Sem observações.';

    const colWidth = (contentWidth - 18) / 2;
    const v1Lines = doc.splitTextToSize(`${report.visitor1Name} (${v1Decision}): ${v1Notes}`, colWidth);
    const v2Lines = doc.splitTextToSize(`${report.visitor2Name} (${v2Decision}): ${v2Notes}`, colWidth);
    const maxLines = Math.max(v1Lines.length, v2Lines.length, 2);
    const cardHeight = 24 + maxLines * 5;

    if (y + cardHeight > pageHeight - 20) {
      doc.addPage();
      paintPageBackground();
      y = margin;
    }

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(224, 226, 230);
    doc.roundedRect(margin, y, contentWidth, cardHeight, 3, 3, 'FD');

    // Header Row inside Match Card
    doc.setTextColor(4, 14, 32);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`${orderStr} — ${match.stop.condominiumName} (${priceStr})`, margin + 6, y + 9);

    // Match Status Badge
    doc.setFillColor(24, 29, 38);
    doc.roundedRect(pageWidth - margin - 56, y + 3.5, 50, 8, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text(statusLabel.toUpperCase(), pageWidth - margin - 31, y + 9, { align: 'center' });

    // Divider line
    doc.setDrawColor(224, 226, 230);
    doc.line(margin + 6, y + 14, pageWidth - margin - 6, y + 14);

    // Side-by-side Visitor Columns
    doc.setTextColor(51, 56, 64);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(v1Lines, margin + 6, y + 20);
    doc.text(v2Lines, margin + 12 + colWidth, y + 20);

    y += cardHeight + 6;
  }

  const filename = `relatorio-cruzado-match-matrix.pdf`;

  if (options.autoDownload && typeof window !== 'undefined') {
    try {
      doc.save(filename);
    } catch (err) {
      console.warn('[reportPdfGenerator] Failed to save cross report PDF:', err);
    }
  }

  return { doc, filename };
}
