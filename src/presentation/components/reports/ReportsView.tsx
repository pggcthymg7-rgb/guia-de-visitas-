import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import {
  FileDown,
  Users,
  User,
  Sparkles,
  CheckCircle2,
  HelpCircle,
  XCircle,
  MapPin,
  Download,
  RefreshCw,
} from 'lucide-react';
import type { VisitTour } from '@/domain/models/tour';
import {
  type VisitorSession,
  createVisitorSession,
  mergeEvaluationWithFencing,
} from '@/domain/models/session';
import {
  computeIndividualReport,
  computeCrossEvaluationReport,
  getDecisionLabel,
} from '@/domain/services/comparisonEngine';
import { centsToBrl } from '@/domain/value-objects/money';
import { storageService } from '@/infrastructure/storage/indexedDb';
import { urlCodec } from '@/infrastructure/codecs/urlCodec';
import {
  generateIndividualReportPdf,
  generateCrossReportPdf,
} from '@/infrastructure/pdf/reportPdfGenerator';
import { getDemoTour } from '@/infrastructure/demo/demoData';
import { Header } from '../layout/Header';

export const ReportsView: React.FC = () => {
  const { tourId = 'demo-tour-alphaville-2026' } = useParams<{ tourId: string }>();
  const [searchParams] = useSearchParams();

  const [tour, setTour] = useState<VisitTour | null>(null);
  const [session1, setSession1] = useState<VisitorSession | null>(null);
  const [session2, setSession2] = useState<VisitorSession | null>(null);
  const [activeTab, setActiveTab] = useState<'CROSS' | 'VISITOR_1' | 'VISITOR_2'>('CROSS');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [mergeTokenInput, setMergeTokenInput] = useState<string>('');
  const [mergeFeedback, setMergeFeedback] = useState<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);

  const loadReportsData = useCallback(async () => {
    setIsLoading(true);
    try {
      let resolvedTour = await storageService.getTour(tourId);
      if (!resolvedTour) {
        const demo = getDemoTour();
        resolvedTour = { ...demo, id: tourId };
        await storageService.saveTour(resolvedTour);
      }

      let s1 = await storageService.getSession(resolvedTour.id, 'VISITOR_1');
      if (!s1) {
        s1 = createVisitorSession(resolvedTour, 'VISITOR_1', `${resolvedTour.id}_VISITOR_1`);
      }

      let s2 = await storageService.getSession(resolvedTour.id, 'VISITOR_2');
      if (!s2) {
        s2 = createVisitorSession(resolvedTour, 'VISITOR_2', `${resolvedTour.id}_VISITOR_2`);
      }

      // Check if URL contains a merge token (?merge=...)
      const mergeParam = searchParams.get('merge');
      if (mergeParam) {
        const parsedMerge = urlCodec.decompressMergeToken(mergeParam);
        if (parsedMerge && parsedMerge.tourId === resolvedTour.id) {
          const targetSession = parsedMerge.slot === 'VISITOR_2' ? s2 : s1;
          const mergedEvals = { ...targetSession.evaluations };
          Object.entries(parsedMerge.evaluations).forEach(([propId, incomingEval]) => {
            const winner = mergeEvaluationWithFencing(mergedEvals[propId], incomingEval);
            if (winner) mergedEvals[propId] = winner;
          });
          const updatedTarget: VisitorSession = {
            ...targetSession,
            visitorName: parsedMerge.visitorName || targetSession.visitorName,
            evaluations: mergedEvals,
            status: 'COMPLETED',
            updatedAtIso: new Date().toISOString(),
          };
          await storageService.saveSession(updatedTarget);
          if (parsedMerge.slot === 'VISITOR_2') {
            s2 = updatedTarget;
          } else {
            s1 = updatedTarget;
          }
        }
      }

      setTour(resolvedTour);
      setSession1(s1);
      setSession2(s2);

      // Default tab based on visitorCount
      if (resolvedTour.visitorCount === 1) {
        setActiveTab('VISITOR_1');
      } else {
        setActiveTab('CROSS');
      }
    } finally {
      setIsLoading(false);
    }
  }, [tourId, searchParams]);

  useEffect(() => {
    void loadReportsData();
  }, [loadReportsData]);

  // Listen to BroadcastChannel for live updates from other tabs
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel(`guia_visitas_sync_${tourId}`);
      bc.onmessage = () => {
        void loadReportsData();
      };
    } catch {
      // ignore if unsupported
    }
    return () => {
      if (bc) bc.close();
    };
  }, [tourId, loadReportsData]);

  // Import External Merge Token (Offline Cross-Device Sync)
  const handleImportMergeToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mergeTokenInput.trim() || !tour || !session1 || !session2) return;

    const decoded = urlCodec.decompressMergeToken(mergeTokenInput.trim());
    if (!decoded) {
      setMergeFeedback('Código inválido. Verifique se copiou o código completo enviado pelo visitante.');
      return;
    }

    const target = decoded.slot === 'VISITOR_2' ? session2 : session1;
    const mergedEvals = { ...target.evaluations };

    Object.entries(decoded.evaluations).forEach(([propId, incomingEval]) => {
      const winner = mergeEvaluationWithFencing(mergedEvals[propId], incomingEval);
      if (winner) mergedEvals[propId] = winner;
    });

    const updatedSession: VisitorSession = {
      ...target,
      visitorName: decoded.visitorName || target.visitorName,
      evaluations: mergedEvals,
      status: 'COMPLETED',
      updatedAtIso: new Date().toISOString(),
    };

    await storageService.saveSession(updatedSession);
    if (decoded.slot === 'VISITOR_2') {
      setSession2(updatedSession);
    } else {
      setSession1(updatedSession);
    }

    setMergeTokenInput('');
    setMergeFeedback(`Respostas de ${updatedSession.visitorName} sincronizadas com sucesso!`);
  };

  const handleExportPdf = async () => {
    if (!tour || !session1 || !session2) return;
    setIsExportingPdf(true);
    try {
      if (tour.visitorCount === 1 || activeTab === 'VISITOR_1') {
        const report = computeIndividualReport(tour, session1);
        await generateIndividualReportPdf(report, { autoDownload: true });
      } else if (activeTab === 'VISITOR_2') {
        const report = computeIndividualReport(tour, session2);
        await generateIndividualReportPdf(report, { autoDownload: true });
      } else {
        const crossReport = computeCrossEvaluationReport(tour, session1, session2);
        await generateCrossReportPdf(crossReport, { autoDownload: true });
      }
    } finally {
      setIsExportingPdf(false);
    }
  };

  if (isLoading || !tour || !session1 || !session2) {
    return (
      <div className="min-h-screen bg-[#faf5e8] flex items-center justify-center p-6">
        <div className="bg-[#ffffff] rounded-cards p-6 border border-[#e0e2e6] text-center">
          <p className="font-display font-black text-lg text-[#040e20]">
            Consolidando Relatórios de Visita...
          </p>
        </div>
      </div>
    );
  }

  const individualReport1 = computeIndividualReport(tour, session1);
  const individualReport2 = computeIndividualReport(tour, session2);
  const crossReport = computeCrossEvaluationReport(tour, session1, session2);

  const renderDecisionBadge = (decision?: string) => {
    switch (decision) {
      case 'LIKED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-tags bg-[#0a2e0e] text-[#ffffff] font-sans text-xs font-bold">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#c7e5f2]" />
            Gostei
          </span>
        );
      case 'DISCARDED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-tags bg-[#aa2d00] text-[#ffffff] font-sans text-xs font-bold">
            <XCircle className="w-3.5 h-3.5" />
            Descartado
          </span>
        );
      case 'DOUBT':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-tags bg-[#fcb42a] text-[#181d26] font-sans text-xs font-bold">
            <HelpCircle className="w-3.5 h-3.5" />
            Em Dúvida
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-tags bg-[#f8fafc] text-[#9297a0] border border-[#e0e2e6] font-sans text-xs font-semibold">
            Não Avaliado
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#faf5e8] text-[#333840] pb-24">
      <Header mode="REPORT" tourTitle={tour.title} />

      <main className="max-w-page mx-auto px-4 sm:px-6 pt-8 space-y-8">
        {/* TOP EDITORIAL REPORT HEADER */}
        <section
          className="rounded-featurecards bg-[#181d26] p-6 sm:p-8 text-white shadow-subtle"
          data-testid="reports-header-section"
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-tags bg-[#c7e5f2] text-[#040e20] text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                {tour.visitorCount === 2
                  ? 'Relatório Consolidado & Matriz de Compatibilidade (2 Visitantes)'
                  : 'Relatório Final Individual de Visitas'}
              </span>
              <h1 className="font-display font-black text-3xl sm:text-4xl text-white">
                {tour.title}
              </h1>
              <p className="font-sans text-sm text-[#e0e2e6]">
                Data: <strong>{tour.visitDate}</strong> • Corretor: <strong>{tour.brokerName}</strong> •{' '}
                {tour.visitorCount === 2 ? (
                  <span>
                    Visitantes: <strong>{session1.visitorName}</strong> &{' '}
                    <strong>{session2.visitorName}</strong>
                  </span>
                ) : (
                  <span>
                    Visitante: <strong>{session1.visitorName}</strong>
                  </span>
                )}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleExportPdf}
                disabled={isExportingPdf}
                data-testid="export-report-pdf-button"
                className="px-6 py-3.5 rounded-buttons bg-[#fcb42a] text-[#181d26] font-sans font-bold text-sm sm:text-base shadow-subtle hover:bg-[#fcab79] transition-colors flex items-center gap-2"
              >
                <FileDown className="w-5 h-5" />
                <span>
                  {isExportingPdf
                    ? 'Exportando PDF...'
                    : tour.visitorCount === 2 && activeTab === 'CROSS'
                    ? 'Baixar Relatório Cruzado em PDF'
                    : 'Baixar Relatório Individual em PDF'}
                </span>
              </button>
            </div>
          </div>

          {/* Mode Tabs when VisitorCount === 2 */}
          {tour.visitorCount === 2 && (
            <div className="mt-6 pt-6 border-t border-white/15 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setActiveTab('CROSS')}
                data-testid="tab-cross-report"
                className={`px-4 py-2.5 rounded-buttons font-sans text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
                  activeTab === 'CROSS'
                    ? 'bg-[#ffffff] text-[#040e20]'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Relatório Cruzado (Match Matrix)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('VISITOR_1')}
                data-testid="tab-visitor1-report"
                className={`px-4 py-2.5 rounded-buttons font-sans text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
                  activeTab === 'VISITOR_1'
                    ? 'bg-[#ffffff] text-[#040e20]'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                <User className="w-4 h-4" />
                <span>Visão Individual: {session1.visitorName}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('VISITOR_2')}
                data-testid="tab-visitor2-report"
                className={`px-4 py-2.5 rounded-buttons font-sans text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
                  activeTab === 'VISITOR_2'
                    ? 'bg-[#ffffff] text-[#040e20]'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                <User className="w-4 h-4" />
                <span>Visão Individual: {session2.visitorName}</span>
              </button>
            </div>
          )}
        </section>

        {/* =========================================================================
            MODE A: DUAL VISITOR CROSS-EVALUATION REPORT (MATCH MATRIX — TC-06)
           ========================================================================= */}
        {tour.visitorCount === 2 && activeTab === 'CROSS' && (
          <section className="space-y-8" data-testid="cross-evaluation-report-view">
            {/* Executive Summary KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4" data-testid="match-matrix-summary">
              <div className="bg-[#0a2e0e] text-white rounded-cards p-4 border border-[#214224]">
                <span className="text-xs font-bold uppercase text-[#c7e5f2]">Match Perfeito!</span>
                <p
                  className="font-display font-black text-3xl mt-1"
                  data-testid="kpi-perfect-matches"
                >
                  {crossReport.summary.perfectMatchesCount}
                </p>
                <span className="text-xs text-[#e0e2e6]">Ambos escolheram Gostei</span>
              </div>

              <div className="bg-[#1b61c9] text-white rounded-cards p-4 border border-[#254fad]">
                <span className="text-xs font-bold uppercase text-[#c7e5f2]">
                  Alinhamento Parcial
                </span>
                <p
                  className="font-display font-black text-3xl mt-1"
                  data-testid="kpi-partial-alignments"
                >
                  {crossReport.summary.partialAlignmentsCount}
                </p>
                <span className="text-xs text-white/80">Gostei + Em Dúvida</span>
              </div>

              <div className="bg-[#aa2d00] text-white rounded-cards p-4 border border-[#912e1f]">
                <span className="text-xs font-bold uppercase text-[#fcab79]">Divergências</span>
                <p className="font-display font-black text-3xl mt-1" data-testid="kpi-divergences">
                  {crossReport.summary.divergencesCount}
                </p>
                <span className="text-xs text-white/80">Gostei vs Descartado</span>
              </div>

              <div className="bg-[#fcb42a] text-[#181d26] rounded-cards p-4 border border-[#fcab79]">
                <span className="text-xs font-bold uppercase">Dúvida Mútua</span>
                <p
                  className="font-display font-black text-3xl mt-1"
                  data-testid="kpi-mutual-doubts"
                >
                  {crossReport.summary.mutualDoubtsCount}
                </p>
                <span className="text-xs text-[#333840]">Ambos Em Dúvida</span>
              </div>

              <div className="bg-[#333840] text-white rounded-cards p-4 border border-[#525965] col-span-2 sm:col-span-1">
                <span className="text-xs font-bold uppercase text-[#e0e2e6]">Descartes</span>
                <p
                  className="font-display font-black text-3xl mt-1"
                  data-testid="kpi-consensual-discards"
                >
                  {crossReport.summary.consensualDiscardsCount}
                </p>
                <span className="text-xs text-white/80">Descarte Consensual</span>
              </div>
            </div>

            {/* Side-by-Side Property Match Matrix List */}
            <div className="space-y-6" data-testid="match-matrix-list">
              {crossReport.matches.map((match, idx) => {
                const orderCode = (idx + 1).toString().padStart(2, '0');
                const v1Eval = match.visitor1Evaluation;
                const v2Eval = match.visitor2Evaluation;

                return (
                  <article
                    key={match.propertyId}
                    data-testid={`cross-match-card-${idx + 1}`}
                    className="rounded-featurecards bg-[#ffffff] border-2 border-[#e0e2e6] p-6 shadow-subtle space-y-5"
                  >
                    {/* Top Row: Property Info & Match Status Seal */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#e0e2e6]">
                      <div className="flex items-center gap-4">
                        <span className="px-3.5 py-2 rounded-buttons bg-[#181d26] text-white font-display font-black text-base">
                          #{orderCode}
                        </span>
                        {match.stop.facadeImageDataUrl && (
                          <img
                            src={match.stop.facadeImageDataUrl}
                            alt={`Fachada ${match.stop.condominiumName}`}
                            className="w-20 h-16 object-cover rounded-buttons border border-[#e0e2e6] hidden sm:block"
                          />
                        )}
                        <div>
                          <h2 className="font-display font-black text-xl text-[#040e20] flex items-center gap-1.5">
                            <MapPin className="w-4 h-4 text-[#aa2d00] shrink-0" />
                            <span>{match.stop.condominiumName}</span>
                          </h2>
                          <p className="font-sans text-xs font-semibold text-[#525965]">
                            {match.stop.title} •{' '}
                            <strong className="text-[#0a2e0e]">
                              {centsToBrl(match.stop.priceCents)}
                            </strong>
                          </p>
                        </div>
                      </div>

                      {/* Deterministic Match Seal */}
                      <div data-testid={`match-status-seal-${idx + 1}`}>
                        {match.meta ? (
                          <div
                            style={{
                              backgroundColor: match.meta.bgHex,
                              color: match.meta.textHex,
                              borderColor: match.meta.borderHex,
                            }}
                            className="px-4 py-2 rounded-tags border-2 font-sans text-xs sm:text-sm font-black uppercase tracking-wider inline-flex items-center gap-2 shadow-sm"
                          >
                            <span>{match.meta.label}</span>
                          </div>
                        ) : (
                          <span className="px-4 py-2 rounded-tags bg-[#faf5e8] border border-[#e0e2e6] text-[#525965] font-sans text-xs font-bold uppercase">
                            Aguardando Avaliação de Ambos
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Side-by-Side Comparison Columns: Visitor 1 vs Visitor 2 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {/* Column 1: Visitor 1 */}
                      <div
                        className="rounded-cards bg-[#faf5e8] p-5 border border-[#e0e2e6] space-y-3"
                        data-testid={`cross-v1-col-${idx + 1}`}
                      >
                        <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#e0e2e6]">
                          <div>
                            <span className="text-[11px] font-bold uppercase text-[#525965] block">
                              Visitante 1
                            </span>
                            <h3 className="font-display font-black text-base text-[#040e20]">
                              {crossReport.visitor1Name}
                            </h3>
                          </div>
                          <div data-testid={`cross-v1-decision-${idx + 1}`}>
                            {renderDecisionBadge(v1Eval?.decision)}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <span className="text-xs font-bold text-[#333840]">
                            Observações Anotadas:
                          </span>
                          <p
                            className="font-sans text-sm text-[#333840] leading-relaxed whitespace-pre-line"
                            data-testid={`cross-v1-notes-${idx + 1}`}
                          >
                            {v1Eval?.notes?.trim()
                              ? v1Eval.notes
                              : 'Nenhuma observação anotada neste imóvel.'}
                          </p>
                        </div>
                      </div>

                      {/* Column 2: Visitor 2 */}
                      <div
                        className="rounded-cards bg-[#faf5e8] p-5 border border-[#e0e2e6] space-y-3"
                        data-testid={`cross-v2-col-${idx + 1}`}
                      >
                        <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#e0e2e6]">
                          <div>
                            <span className="text-[11px] font-bold uppercase text-[#525965] block">
                              Visitante 2
                            </span>
                            <h3 className="font-display font-black text-base text-[#040e20]">
                              {crossReport.visitor2Name}
                            </h3>
                          </div>
                          <div data-testid={`cross-v2-decision-${idx + 1}`}>
                            {renderDecisionBadge(v2Eval?.decision)}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <span className="text-xs font-bold text-[#333840]">
                            Observações Anotadas:
                          </span>
                          <p
                            className="font-sans text-sm text-[#333840] leading-relaxed whitespace-pre-line"
                            data-testid={`cross-v2-notes-${idx + 1}`}
                          >
                            {v2Eval?.notes?.trim()
                              ? v2Eval.notes
                              : 'Nenhuma observação anotada neste imóvel.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Offline / Cross-Device Merge Token Importer */}
            <div className="rounded-featurecards bg-[#c7e5f2] p-6 border border-[#1b61c9]/20 space-y-4">
              <div className="bg-[#ffffff] rounded-cards p-5 border border-[#e0e2e6] space-y-3">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-[#1b61c9]" />
                  <h3 className="font-display font-black text-lg text-[#040e20]">
                    Sincronizar Respostas de Outro Celular (Código de Pareamento Offline)
                  </h3>
                </div>
                <p className="text-xs text-[#525965]">
                  Se um dos visitantes realizou a visita em outro smartphone, cole abaixo o código rápido de pareamento gerado ao final da visita dele para fundir imediatamente as respostas:
                </p>

                {mergeFeedback && (
                  <div className="p-3 rounded-buttons bg-[#0a2e0e] text-white text-xs font-semibold">
                    {mergeFeedback}
                  </div>
                )}

                <form onSubmit={handleImportMergeToken} className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={mergeTokenInput}
                    onChange={(e) => setMergeTokenInput(e.target.value)}
                    placeholder="Cole aqui o código de pareamento enviado pelo visitante..."
                    data-testid="merge-token-input"
                    className="flex-1 px-3.5 py-2.5 rounded-buttons border border-[#e0e2e6] bg-[#faf5e8] text-sm"
                  />
                  <button
                    type="submit"
                    data-testid="apply-merge-token-button"
                    className="px-5 py-2.5 rounded-buttons bg-[#181d26] text-white font-sans text-xs sm:text-sm font-bold hover:bg-[#333840] shrink-0"
                  >
                    Cruzar Respostas Agora
                  </button>
                </form>
              </div>
            </div>
          </section>
        )}

        {/* =========================================================================
            MODE B: INDIVIDUAL VISITOR REPORT (1 VISITOR OR SELECTED TAB — TC-05)
           ========================================================================= */}
        {(tour.visitorCount === 1 || activeTab === 'VISITOR_1' || activeTab === 'VISITOR_2') && (
          <section className="space-y-6" data-testid="individual-report-view">
            {(() => {
              const activeReport =
                activeTab === 'VISITOR_2' ? individualReport2 : individualReport1;
              return (
                <>
                  {/* Summary Strip */}
                  <div
                    className="bg-[#ffffff] rounded-cards p-5 border border-[#e0e2e6] flex flex-wrap items-center justify-between gap-4"
                    data-testid="individual-report-summary"
                  >
                    <div>
                      <span className="text-xs font-bold uppercase text-[#525965]">
                        Relatório Consolidado de Visita
                      </span>
                      <h2 className="font-display font-black text-2xl text-[#040e20]">
                        Visitante: {activeReport.visitorName}
                      </h2>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <span
                        className="px-3.5 py-1.5 rounded-tags bg-[#0a2e0e] text-white text-xs font-bold"
                        data-testid="individual-liked-count"
                      >
                        Gostei: {activeReport.likedCount}
                      </span>
                      <span
                        className="px-3.5 py-1.5 rounded-tags bg-[#fcb42a] text-[#181d26] text-xs font-bold"
                        data-testid="individual-doubt-count"
                      >
                        Em Dúvida: {activeReport.doubtCount}
                      </span>
                      <span
                        className="px-3.5 py-1.5 rounded-tags bg-[#aa2d00] text-white text-xs font-bold"
                        data-testid="individual-discarded-count"
                      >
                        Descartados: {activeReport.discardedCount}
                      </span>
                    </div>
                  </div>

                  {/* Individual Evaluated Items List */}
                  <div className="space-y-4" data-testid="individual-report-items-list">
                    {activeReport.items.map((item, idx) => {
                      const orderCode = (idx + 1).toString().padStart(2, '0');
                      return (
                        <article
                          key={item.propertyId}
                          data-testid={`individual-report-item-${idx + 1}`}
                          className="bg-[#ffffff] rounded-cards p-6 border border-[#e0e2e6] shadow-sm space-y-4"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#e0e2e6]">
                            <div className="flex items-center gap-3">
                              <span className="px-3 py-1.5 rounded-buttons bg-[#181d26] text-white font-display font-black text-sm">
                                Imóvel {orderCode}
                              </span>
                              <div>
                                <h3
                                  className="font-display font-black text-xl text-[#040e20]"
                                  data-testid={`individual-item-condo-${idx + 1}`}
                                >
                                  {item.stop.condominiumName}
                                </h3>
                                <p className="text-xs font-semibold text-[#525965]">
                                  {item.stop.title} •{' '}
                                  <strong className="text-[#0a2e0e]">
                                    {centsToBrl(item.stop.priceCents)}
                                  </strong>
                                </p>
                              </div>
                            </div>

                            <div data-testid={`individual-item-decision-${idx + 1}`}>
                              {renderDecisionBadge(item.decision)}
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row gap-5">
                            {item.stop.facadeImageDataUrl && (
                              <img
                                src={item.stop.facadeImageDataUrl}
                                alt={`Fachada ${item.stop.condominiumName}`}
                                className="w-full sm:w-40 h-28 object-cover rounded-buttons border border-[#e0e2e6] shrink-0"
                              />
                            )}
                            <div className="flex-1 bg-[#faf5e8] rounded-cards p-4 border border-[#e0e2e6] space-y-1.5">
                              <span className="text-xs font-bold uppercase tracking-wider text-[#040e20]">
                                Observações Anotadas por {activeReport.visitorName} (
                                {getDecisionLabel(item.decision)}):
                              </span>
                              <p
                                className="font-sans text-sm text-[#333840] leading-relaxed whitespace-pre-line"
                                data-testid={`individual-item-notes-${idx + 1}`}
                              >
                                {item.notes?.trim()
                                  ? item.notes
                                  : 'Nenhuma observação registrada para este imóvel.'}
                              </p>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </>
              );
            })()}
          </section>
        )}

        {/* Bottom Navigation Links */}
        <div className="pt-4 flex flex-wrap items-center justify-between gap-4">
          <Link
            to="/"
            className="px-5 py-3 rounded-buttons border border-[#181d26] bg-[#ffffff] text-[#181d26] font-sans text-sm font-semibold hover:bg-[#faf5e8]"
          >
            ← Voltar ao Painel do Corretor
          </Link>

          <button
            type="button"
            onClick={handleExportPdf}
            data-testid="bottom-export-pdf-button"
            className="px-6 py-3 rounded-buttons bg-[#181d26] text-white font-sans text-sm font-semibold shadow-subtle hover:bg-[#333840] inline-flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Exportar Relatório em PDF</span>
          </button>
        </div>
      </main>
    </div>
  );
};
