import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Play,
  ArrowRight,
  CheckCircle2,
  MapPin,
  Lock,
  Sparkles,
  FileText,
  Share2,
  Copy,
  Check,
} from 'lucide-react';
import type { VisitTour } from '@/domain/models/tour';
import {
  type VisitorSession,
  type VisitorSlot,
  type DecisionType,
  createVisitorSession,
  startVisitorSession,
  saveEvaluationDraft,
  advanceSessionStop,
} from '@/domain/models/session';
import { assertCanAdvance } from '@/domain/services/validation';
import { centsToBrl } from '@/domain/value-objects/money';
import { storageService } from '@/infrastructure/storage/indexedDb';
import { urlCodec } from '@/infrastructure/codecs/urlCodec';
import { getDemoTour } from '@/infrastructure/demo/demoData';
import { Header } from '../layout/Header';
import { HamburgerDrawer } from '../layout/HamburgerDrawer';
import { DecisionSelector } from './DecisionSelector';

export const ClientVisitView: React.FC = () => {
  const { tourId = 'demo-tour-alphaville-2026', slot = 'VISITOR_1' } = useParams<{
    tourId: string;
    slot: string;
  }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const normalizedSlot: VisitorSlot = slot === 'VISITOR_2' ? 'VISITOR_2' : 'VISITOR_1';

  const [tour, setTour] = useState<VisitTour | null>(null);
  const [session, setSession] = useState<VisitorSession | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  // Active Property Controlled Form State (Guaranteed Zero Data Loss on every keystroke)
  const [currentNotes, setCurrentNotes] = useState<string>('');
  const [currentDecision, setCurrentDecision] = useState<DecisionType | undefined>(undefined);
  const [gateError, setGateError] = useState<string | null>(null);
  const [copiedMergeToken, setCopiedMergeToken] = useState<boolean>(false);

  // Load Tour & Session on mount
  useEffect(() => {
    let active = true;

    const loadContext = async () => {
      setIsLoading(true);
      try {
        // 1. Check compressed URL payload first (?data=...)
        const encodedData = searchParams.get('data');
        let resolvedTour: VisitTour | null = null;

        if (encodedData) {
          resolvedTour = urlCodec.decompressTour(encodedData);
        }

        // 2. Check IndexedDB / localStorage
        if (!resolvedTour) {
          resolvedTour = await storageService.getTour(tourId);
        }

        // 3. Fallback to Demo Tour if matching or not found
        if (!resolvedTour) {
          const demo = getDemoTour();
          resolvedTour = { ...demo, id: tourId };
        }

        await storageService.saveTour(resolvedTour);

        // Load or Initialize VisitorSession
        let resolvedSession = await storageService.getSession(resolvedTour.id, normalizedSlot);
        if (!resolvedSession) {
          resolvedSession = createVisitorSession(
            resolvedTour,
            normalizedSlot,
            `${resolvedTour.id}_${normalizedSlot}`
          );
          await storageService.saveSession(resolvedSession);
        }

        // Hydrate current stop draft if any
        const orderedStops = [...resolvedTour.stops].sort((a, b) => a.orderIndex - b.orderIndex);
        const activeStop = orderedStops[resolvedSession.currentStopIndex];
        let initialNotes = '';
        let initialDecision: DecisionType | undefined = undefined;

        if (activeStop) {
          const savedEval = resolvedSession.evaluations[activeStop.id];
          const savedDraft = await storageService.getDraftNote(
            resolvedTour.id,
            normalizedSlot,
            activeStop.id
          );

          initialNotes = savedDraft?.notes ?? savedEval?.notes ?? '';
          initialDecision = savedDraft?.decision ?? savedEval?.decision;
        }

        if (active) {
          setTour(resolvedTour);
          setSession(resolvedSession);
          setCurrentNotes(initialNotes);
          setCurrentDecision(initialDecision);
        }
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void loadContext();
    return () => {
      active = false;
    };
  }, [tourId, normalizedSlot, searchParams]);

  const orderedStops = tour ? [...tour.stops].sort((a, b) => a.orderIndex - b.orderIndex) : [];
  const activeStop =
    session && orderedStops.length > 0
      ? orderedStops[Math.min(session.currentStopIndex, orderedStops.length - 1)]
      : undefined;

  // BroadcastChannel for live same-device / cross-tab sync
  const broadcastSessionUpdate = useCallback((updatedSession: VisitorSession) => {
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel(`guia_visitas_sync_${updatedSession.tourId}`);
        bc.postMessage({ type: 'SESSION_UPDATED', session: updatedSession });
        bc.close();
      }
    } catch {
      // ignore if BroadcastChannel is unsupported in environment
    }
  }, []);

  // Zero Data Loss: Immediate Auto-Save on every keystroke in Notes textarea
  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setCurrentNotes(newText);

    if (!tour || !session || !activeStop) return;

    // Update session state if decision was already chosen, or keep evaluation draft updated
    const existingEval = session.evaluations[activeStop.id];
    const nextFencing = (existingEval?.fencingToken || 0) + 1;

    // Immediate synchronous localStorage + async IndexedDB draft write
    void storageService.saveDraftNote(tour.id, normalizedSlot, activeStop.id, {
      decision: currentDecision,
      notes: newText,
      fencingToken: nextFencing,
    });

    if (currentDecision) {
      const updatedSession = saveEvaluationDraft(session, activeStop.id, {
        decision: currentDecision,
        notes: newText,
      });
      setSession(updatedSession);
      void storageService.saveSession(updatedSession);
      broadcastSessionUpdate(updatedSession);
    }
  };

  // Immediate Auto-Save when selecting one of the 3 Decision boxes
  const handleSelectDecision = (decision: DecisionType) => {
    setCurrentDecision(decision);
    setGateError(null);

    if (!tour || !session || !activeStop) return;

    const updatedSession = saveEvaluationDraft(session, activeStop.id, {
      decision,
      notes: currentNotes,
    });
    setSession(updatedSession);

    void storageService.saveDraftNote(tour.id, normalizedSlot, activeStop.id, {
      decision,
      notes: currentNotes,
      fencingToken: updatedSession.evaluations[activeStop.id]?.fencingToken || 1,
    });
    void storageService.saveSession(updatedSession);
    broadcastSessionUpdate(updatedSession);
  };

  // Start Guided Tour from Opening Cover
  const handleStartTour = async () => {
    if (!session || !tour) return;
    const started = startVisitorSession(session);
    setSession(started);
    await storageService.saveSession(started);

    const firstStop = orderedStops[started.currentStopIndex];
    if (firstStop) {
      const draft = await storageService.getDraftNote(tour.id, normalizedSlot, firstStop.id);
      const existing = started.evaluations[firstStop.id];
      setCurrentNotes(draft?.notes ?? existing?.notes ?? '');
      setCurrentDecision(draft?.decision ?? existing?.decision);
    }
  };

  // Strict State Machine Gate: Save & Advance to Next Property (TC-03)
  const handleSaveAndAdvance = async () => {
    if (!tour || !session || !activeStop) return;

    if (!currentDecision) {
      setGateError(
        'Por favor, escolha uma das opções (Gostei, Descartado ou Em Dúvida) antes de avançar para o próximo imóvel.'
      );
      return;
    }

    // Ensure evaluation is saved on session object
    const sessionWithEval = saveEvaluationDraft(session, activeStop.id, {
      decision: currentDecision,
      notes: currentNotes,
    });

    // Enforce Domain Invariant (throws DomainRuleViolationError if invalid)
    try {
      assertCanAdvance(sessionWithEval, activeStop.id);
    } catch (err) {
      setGateError(err instanceof Error ? err.message : 'Escolha uma decisão obrigatória.');
      return;
    }

    // Advance stop index or complete session
    const advancedSession = advanceSessionStop(sessionWithEval, orderedStops.length);

    // Pre-hydrate next stop's notes/decision BEFORE committing state so UI locks immediately on the new stop
    if (advancedSession.status !== 'COMPLETED') {
      const nextStop = orderedStops[advancedSession.currentStopIndex];
      const nextEval = nextStop ? advancedSession.evaluations[nextStop.id] : undefined;
      setCurrentDecision(nextEval?.decision);
      setCurrentNotes(nextEval?.notes ?? '');
      setGateError(null);

      if (nextStop) {
        void storageService
          .getDraftNote(tour.id, normalizedSlot, nextStop.id)
          .then((nextDraft) => {
            if (nextDraft) {
              if (nextDraft.notes !== undefined) setCurrentNotes(nextDraft.notes);
              if (nextDraft.decision !== undefined) setCurrentDecision(nextDraft.decision);
            }
          });
      }

      if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
        try {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch {
          // ignore in headless test environments
        }
      }
    }

    setSession(advancedSession);
    await storageService.saveSession(advancedSession);
    broadcastSessionUpdate(advancedSession);
  };

  // Navigate to Consolidated Report View
  const handleGoToReport = () => {
    if (!tour || !session) return;
    const mergeCode = urlCodec.compressMergeToken({
      tourId: tour.id,
      slot: session.visitorSlot,
      visitorName: session.visitorName,
      evaluations: session.evaluations,
    });
    navigate(`/report/${encodeURIComponent(tour.id)}?slot=${session.visitorSlot}&merge=${mergeCode}`);
  };

  const handleCopyMergeCode = async () => {
    if (!tour || !session) return;
    const mergeCode = urlCodec.compressMergeToken({
      tourId: tour.id,
      slot: session.visitorSlot,
      visitorName: session.visitorName,
      evaluations: session.evaluations,
    });
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(mergeCode);
      }
      setCopiedMergeToken(true);
      setTimeout(() => setCopiedMergeToken(false), 2500);
    } catch {
      setCopiedMergeToken(true);
    }
  };

  if (isLoading || !tour || !session) {
    return (
      <div className="min-h-screen bg-[#faf5e8] flex items-center justify-center p-6">
        <div className="bg-[#ffffff] rounded-cards p-6 border border-[#e0e2e6] text-center">
          <p className="font-display font-black text-lg text-[#040e20]">
            Carregando seu Guia de Visitas...
          </p>
        </div>
      </div>
    );
  }

  const isLastStop = session.currentStopIndex >= orderedStops.length - 1;
  const isAdvanceUnlocked = Boolean(
    currentDecision && ['LIKED', 'DISCARDED', 'DOUBT'].includes(currentDecision)
  );

  // Merge evaluation map with current live typing so Hamburger Drawer always shows live state
  const liveEvaluations = activeStop
    ? {
        ...session.evaluations,
        [activeStop.id]: {
          propertyId: activeStop.id,
          decision: currentDecision || session.evaluations[activeStop.id]?.decision || ('DOUBT' as DecisionType),
          notes: currentNotes,
          fencingToken: (session.evaluations[activeStop.id]?.fencingToken || 0) + 1,
          idempotencyKey: 'live',
          updatedAtIso: new Date().toISOString(),
        },
      }
    : session.evaluations;

  return (
    <div className="min-h-screen bg-[#faf5e8] text-[#333840] pb-24">
      <Header
        mode="VISITOR"
        tourTitle={tour.title}
        visitorName={session.visitorName}
        currentStopNumber={
          session.status === 'IN_PROGRESS' ? session.currentStopIndex + 1 : undefined
        }
        totalStops={orderedStops.length}
        onOpenDrawer={() => setIsDrawerOpen(true)}
      />

      {/* Non-Destructive Quick Compare Hamburger Drawer (TC-04) */}
      <HamburgerDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        tour={tour}
        currentStopIndex={session.currentStopIndex}
        evaluations={
          currentDecision
            ? liveEvaluations
            : {
                ...session.evaluations,
                ...(activeStop && currentNotes
                  ? {
                      [activeStop.id]: {
                        ...session.evaluations[activeStop.id],
                        propertyId: activeStop.id,
                        notes: currentNotes,
                      } as never,
                    }
                  : {}),
              }
        }
      />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-8">
        {/* =========================================================================
            VIEW 1: OPENING WELCOME COVER (status === 'NOT_STARTED')
           ========================================================================= */}
        {session.status === 'NOT_STARTED' && (
          <section
            className="rounded-featurecards bg-[#181d26] p-6 sm:p-8 text-white shadow-subtle space-y-6"
            data-testid="visitor-welcome-cover"
          >
            <div className="space-y-3">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-tags bg-[#c7e5f2] text-[#040e20] text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                Guia Exclusivo de Visita
              </span>
              <h1 className="font-display font-black text-3xl sm:text-4xl text-white">
                Olá, {session.visitorName}!
              </h1>
              <p className="font-sans text-sm sm:text-base text-[#e0e2e6] leading-relaxed">
                Bem-vindo(a) ao seu roteiro <strong>{tour.title}</strong> preparado por{' '}
                <strong>{tour.brokerName}</strong> para o dia <strong>{tour.visitDate}</strong>.
              </p>
            </div>

            {/* Summary of Stops */}
            <div className="bg-[#ffffff] text-[#333840] rounded-cards p-5 border border-[#e0e2e6] space-y-3">
              <h2 className="font-display font-black text-lg text-[#040e20]">
                Resumo da Ordem das Visitas de Hoje ({orderedStops.length} Imóveis)
              </h2>
              <div className="divide-y divide-[#e0e2e6]">
                {orderedStops.map((stop, idx) => (
                  <div key={stop.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="px-2.5 py-1 rounded-buttons bg-[#181d26] text-white font-mono text-xs font-bold shrink-0">
                        #{(idx + 1).toString().padStart(2, '0')}
                      </span>
                      <div className="truncate">
                        <p className="font-sans font-bold text-sm text-[#040e20] truncate">
                          {stop.condominiumName}
                        </p>
                        <p className="font-sans text-xs text-[#525965] truncate">{stop.title}</p>
                      </div>
                    </div>
                    <span className="font-sans font-bold text-xs sm:text-sm text-[#0a2e0e] shrink-0">
                      {centsToBrl(stop.priceCents)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleStartTour}
              data-testid="start-visits-button"
              className="w-full py-4 px-6 rounded-buttons bg-[#fcb42a] text-[#181d26] font-sans font-black text-lg shadow-subtle hover:bg-[#fcab79] transition-colors flex items-center justify-center gap-2.5"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Começar Visitas</span>
            </button>
          </section>
        )}

        {/* =========================================================================
            VIEW 2: ACTIVE SEQUENTIAL PROPERTY VISIT (status === 'IN_PROGRESS')
           ========================================================================= */}
        {session.status === 'IN_PROGRESS' && activeStop && (
          <section
            className="rounded-featurecards bg-[#c7e5f2] p-4 sm:p-6 shadow-subtle space-y-6"
            data-testid="active-property-visit-view"
          >
            <div className="bg-[#ffffff] rounded-cards p-5 sm:p-7 border border-[#e0e2e6] space-y-6">
              {/* Top Order Badge & Price */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#e0e2e6]">
                <div className="flex items-center gap-2.5">
                  <span
                    className="px-3.5 py-1.5 rounded-buttons bg-[#181d26] text-white font-display font-black text-sm"
                    data-testid="active-stop-order-label"
                  >
                    Imóvel {(session.currentStopIndex + 1).toString().padStart(2, '0')} de{' '}
                    {orderedStops.length.toString().padStart(2, '0')}
                  </span>
                </div>
                <span
                  className="px-4 py-1.5 rounded-tags bg-[#0a2e0e] text-[#ffffff] font-sans font-bold text-base"
                  data-testid="active-stop-price"
                >
                  {centsToBrl(activeStop.priceCents)}
                </span>
              </div>

              {/* Condominium & Title */}
              <div>
                <h1
                  className="font-display font-black text-2xl sm:text-3xl text-[#040e20] flex items-center gap-2"
                  data-testid="active-stop-condo-name"
                >
                  <MapPin className="w-6 h-6 text-[#aa2d00] shrink-0" />
                  <span>{activeStop.condominiumName}</span>
                </h1>
                <p className="font-sans font-semibold text-base text-[#525965] mt-1">
                  {activeStop.title}
                </p>
              </div>

              {/* High-Clarity Facade Photo */}
              {activeStop.facadeImageDataUrl && (
                <div className="rounded-cards overflow-hidden border border-[#e0e2e6] bg-[#faf5e8]">
                  <img
                    src={activeStop.facadeImageDataUrl}
                    alt={`Fachada ${activeStop.condominiumName}`}
                    data-testid="active-stop-facade-img"
                    className="w-full h-64 sm:h-80 object-cover"
                  />
                </div>
              )}

              {/* Full Property Description */}
              <div className="bg-[#faf5e8] rounded-cards p-5 border border-[#e0e2e6] space-y-2">
                <h2 className="font-display font-black text-base text-[#040e20]">
                  Descrição Completa da Casa / Imóvel
                </h2>
                <p
                  className="font-sans text-sm sm:text-base text-[#333840] leading-relaxed whitespace-pre-line"
                  data-testid="active-stop-description"
                >
                  {activeStop.fullDescription}
                </p>
              </div>

              {/* Notes Textarea with Instant Keystroke Auto-Save (Zero Data Loss) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="visitor-notes-textarea"
                    className="font-sans text-xs font-bold uppercase tracking-wider text-[#040e20]"
                  >
                    Suas Observações e Impressões sobre este Imóvel
                  </label>
                  <span className="text-xs font-medium text-[#0a2e0e]">
                    ✓ Salvo automaticamente a cada tecla
                  </span>
                </div>
                <textarea
                  id="visitor-notes-textarea"
                  data-testid="visitor-notes-textarea"
                  rows={4}
                  value={currentNotes}
                  onChange={handleNotesChange}
                  placeholder="Anote aqui o que você mais gostou, pontos de atenção, iluminação, acabamento, espaço gourmet..."
                  className="w-full p-4 rounded-cards border-2 border-[#e0e2e6] bg-[#faf5e8] text-[#040e20] font-sans text-base focus:outline-none focus:border-[#181d26] transition-colors"
                />
              </div>

              {/* Tri-State Decision Boxes (Gostei, Descartado, Em Dúvida) */}
              <DecisionSelector
                selectedDecision={currentDecision}
                onSelectDecision={handleSelectDecision}
              />

              {/* Gate Warning Alert if locked */}
              {!isAdvanceUnlocked && (
                <div
                  role="status"
                  data-testid="decision-lock-warning"
                  className="p-3.5 rounded-buttons bg-[#faf5e8] border border-[#e0e2e6] text-[#525965] text-xs sm:text-sm font-medium flex items-center gap-2.5"
                >
                  <Lock className="w-4 h-4 text-[#aa2d00] shrink-0" />
                  <span>
                    Bloqueio de segurança ativo: selecione <strong>Gostei</strong>,{' '}
                    <strong>Descartado</strong> ou <strong>Em Dúvida</strong> acima para liberar o avanço ao próximo imóvel.
                  </span>
                </div>
              )}

              {gateError && (
                <div
                  role="alert"
                  className="p-3.5 rounded-buttons bg-[#aa2d00] text-white text-xs sm:text-sm font-semibold"
                >
                  {gateError}
                </div>
              )}

              {/* Primary CTA Button: Strict Lock until decision is selected (TC-03) */}
              <button
                type="button"
                disabled={!isAdvanceUnlocked}
                onClick={handleSaveAndAdvance}
                data-testid="advance-stop-button"
                className={`w-full py-4 px-6 rounded-buttons font-sans font-semibold text-base transition-all flex items-center justify-center gap-2 ${
                  isAdvanceUnlocked
                    ? 'bg-[#181d26] text-white shadow-subtle hover:bg-[#333840] cursor-pointer'
                    : 'bg-[#e0e2e6] text-[#9297a0] cursor-not-allowed'
                }`}
              >
                <span>
                  {isLastStop
                    ? 'Salvar e Finalizar Visitas'
                    : 'Salvar Anotações e Ir para o Próximo Imóvel'}
                </span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </section>
        )}

        {/* =========================================================================
            VIEW 3: COMPLETION SCREEN ("GERAR RELATÓRIOS" — status === 'COMPLETED')
           ========================================================================= */}
        {session.status === 'COMPLETED' && (
          <section
            className="rounded-featurecards bg-[#0a2e0e] p-6 sm:p-8 text-white shadow-subtle space-y-6"
            data-testid="visit-completed-screen"
          >
            <div className="bg-[#ffffff] text-[#333840] rounded-cards p-6 sm:p-8 border border-[#e0e2e6] space-y-6 text-center">
              <div className="w-16 h-16 rounded-full bg-[#c7e5f2] text-[#0a2e0e] mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div className="space-y-2">
                <span className="px-3 py-1 rounded-tags bg-[#0a2e0e] text-white text-xs font-bold uppercase">
                  Roteiro Concluído com Sucesso
                </span>
                <h1 className="font-display font-black text-3xl text-[#040e20]">
                  Parabéns, {session.visitorName}!
                </h1>
                <p className="font-sans text-sm sm:text-base text-[#525965] max-w-xl mx-auto">
                  Você concluiu a visita e avaliação de todos os {orderedStops.length} imóveis do roteiro{' '}
                  <strong>{tour.title}</strong>. Suas escolhas e observações estão salvas.
                </p>
              </div>

              <div className="pt-2 space-y-3">
                <button
                  type="button"
                  onClick={handleGoToReport}
                  data-testid="generate-reports-button"
                  className="w-full py-4 px-6 rounded-buttons bg-[#181d26] text-white font-sans font-bold text-lg shadow-subtle hover:bg-[#333840] transition-colors flex items-center justify-center gap-2.5"
                >
                  <FileText className="w-5 h-5" />
                  <span>Gerar Relatórios</span>
                </button>

                {tour.visitorCount === 2 && (
                  <div className="p-4 rounded-cards bg-[#faf5e8] border border-[#e0e2e6] text-left space-y-3">
                    <p className="font-sans font-bold text-xs uppercase text-[#254fad]">
                      Sincronização Instantânea • 2 Visitantes
                    </p>
                    <p className="text-xs text-[#525965]">
                      Caso o outro visitante esteja em outro celular, compartilhe seu código rápido para cruzar as avaliações instantaneamente:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={handleCopyMergeCode}
                        data-testid="copy-merge-token-button"
                        className="px-4 py-2.5 rounded-buttons border border-[#181d26] bg-[#ffffff] text-[#181d26] text-xs font-bold flex items-center gap-1.5"
                      >
                        {copiedMergeToken ? <Check className="w-4 h-4 text-[#0a2e0e]" /> : <Copy className="w-4 h-4" />}
                        <span>
                          {copiedMergeToken
                            ? 'Código de Pareamento Copiado!'
                            : 'Copiar Código de Pareamento'}
                        </span>
                      </button>

                      <a
                        href={urlCodec.buildWhatsAppShareUrl(
                          undefined,
                          `Concluí minhas avaliações do roteiro ${tour.title}! Use este código de pareamento no Relatório Cruzado: ${urlCodec.compressMergeToken({
                            tourId: tour.id,
                            slot: session.visitorSlot,
                            visitorName: session.visitorName,
                            evaluations: session.evaluations,
                          })}`
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2.5 rounded-buttons bg-[#214224] text-white text-xs font-bold flex items-center gap-1.5"
                      >
                        <Share2 className="w-4 h-4" />
                        <span>Enviar Respostas no WhatsApp</span>
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};
