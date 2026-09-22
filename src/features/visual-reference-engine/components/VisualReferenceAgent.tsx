import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  Eye,
  Layers,
  ChevronDown,
  ChevronRight,
  User,
  Sliders,
  FileCode,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  Info,
  Zap,
  Shield,
  BarChart3,
  Trash2,
  HelpCircle,
  Activity,
  Cpu,
  Layers2,
  X,
  AlertCircle
} from 'lucide-react';
import {
  VisualReferenceAnalysis,
  VisualEvidence,
  VisualEvidenceStatus,
  AvatarIdentityContext
} from '../types/visualReferenceTypes';
import {
  VisualReferenceAgentState,
  createInitialAgentState,
  executeAgentAnalysis,
  executeAgentCleaning,
  executeAgentPromptComposition,
  exportAvatarIdentityContext,
  getPrimaryReferenceStatus,
  saveAgentStateToSession,
  loadAgentStateFromSession,
  clearAgentStateFromSession,
  AgentAnalysisMode,
  AgentCleaningMode,
  AgentPromptMode,
  PrimaryReferenceStatus
} from '../services/visualReferenceAgentService';
import { VisualReferenceBenchmarkPanel } from './VisualReferenceBenchmarkPanel';

interface VisualReferenceAgentProps {
  currentKey?: string;
  initialImage?: string;
  onUseAsAvatar?: (context: AvatarIdentityContext) => void;
  onUseAsSceneReference?: (analysis: VisualReferenceAnalysis) => void;
}

// Sample test presets for quick empirical testing
const SAMPLE_PRESETS = [
  {
    name: 'Retrato de Estúdio (Mulher)',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80',
    type: 'portrait'
  },
  {
    name: 'Cena Urbana Comercial (Homem)',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&auto=format&fit=crop&q=80',
    type: 'commercial'
  },
  {
    name: 'Produto & Apresentador',
    url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80',
    type: 'product_presenter'
  }
];

export const VisualReferenceAgent: React.FC<VisualReferenceAgentProps> = ({
  currentKey,
  initialImage,
  onUseAsAvatar,
  onUseAsSceneReference
}) => {
  // 1. Primary canonical agent state with session hydration
  const [state, setState] = useState<VisualReferenceAgentState>(() => {
    const saved = loadAgentStateFromSession();
    if (saved && saved.image) {
      return saved;
    }
    const init = createInitialAgentState();
    if (initialImage) {
      init.image = initialImage;
    }
    return init;
  });

  // 2. UX Modes & Tabs (Simple Mode is Default)
  const [uiMode, setUiMode] = useState<'SIMPLE' | 'ADVANCED'>('SIMPLE');
  const [advancedTab, setAdvancedTab] = useState<'DNA' | 'CONTRACT' | 'PROMPT_METRICS' | 'TELEMETRY' | 'BENCHMARK'>('DNA');
  const [activeDnaTab, setActiveDnaTab] = useState<'IDENTITY' | 'SCENE'>('IDENTITY');

  // 3. Transient UI controls & Modals
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [showAdvancedDnaConfidence, setShowAdvancedDnaConfidence] = useState(false);
  const [showReanalyzeModal, setShowReanalyzeModal] = useState(false);
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [handoffToast, setHandoffToast] = useState<{ type: 'avatar' | 'scene' | 'info'; message: string } | null>(null);

  // Accordion sections state for Visual DNA tree
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    identity: true,
    face: true,
    hair: true,
    skin: true,
    pose: true,
    wardrobe: true,
    camera: true,
    lighting: true,
    branding: true,
    textElements: true
  });

  // Session persistence synchronization
  useEffect(() => {
    saveAgentStateToSession(state);
  }, [state]);

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Status computation
  const primaryStatus: PrimaryReferenceStatus = getPrimaryReferenceStatus(state);

  // ==========================================
  // HANDLERS & PIPELINE ACTIONS
  // ==========================================

  const handleImageLoad = (src: string) => {
    setState((prev) => ({
      ...prev,
      image: src,
      cleanedImage: null,
      activePreviewMode: 'ORIGINAL',
      analysis: null,
      promptOutput: null,
      cleaningOperations: null,
      analysisStatus: 'NOT_STARTED',
      cleaningStatus: 'NOT_USED',
      dnaStatus: 'NOT_STARTED',
      promptStatus: 'NOT_STARTED',
      analysisError: null,
      imageEditError: null,
      promptCompositionError: null
    }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        handleImageLoad(event.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // 1. ANALYZE REFERENCE (1 AI call)
  const handleAnalyze = async () => {
    if (!state.image) return;
    setState((prev) => ({ ...prev, analysisStatus: 'PROCESSING', analysisError: null }));
    const nextState = await executeAgentAnalysis(state, {
      apiKey: currentKey
    });
    setState(nextState);

    // Auto-generate prompt deterministically upon successful analysis
    if (nextState.analysis) {
      const promptedState = executeAgentPromptComposition(nextState, {
        promptMode: nextState.promptMode
      });
      setState(promptedState);
    }
  };

  // Confirm Re-analyze execution
  const handleConfirmReanalyze = async () => {
    setShowReanalyzeModal(false);
    await handleAnalyze();
  };

  // 2. CLEAN REFERENCE (1 AI call or offline fallback; isolated error)
  const handleClean = async () => {
    if (!state.image) return;
    setState((prev) => ({ ...prev, cleaningStatus: 'PROCESSING', imageEditError: null }));
    const nextState = await executeAgentCleaning(state, {
      apiKey: currentKey
    });
    setState(nextState);
  };

  // 3. GENERATE PROMPT (0 AI calls — 100% deterministic local computation)
  const handleComposePrompt = (mode?: AgentPromptMode) => {
    const targetMode = mode || state.promptMode;
    const nextState = executeAgentPromptComposition(state, {
      promptMode: targetMode
    });
    setState(nextState);
  };

  // Instant mode change with zero AI calls
  const handlePromptModeChange = (mode: AgentPromptMode) => {
    setState((prev) => ({ ...prev, promptMode: mode }));
    if (state.analysis) {
      const nextState = executeAgentPromptComposition({ ...state, promptMode: mode }, {
        promptMode: mode
      });
      setState(nextState);
    }
  };

  // 4. COPY PROMPT
  const handleCopyPrompt = () => {
    if (!state.promptOutput?.prompt) return;
    navigator.clipboard.writeText(state.promptOutput.prompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2500);
  };

  // 5. HANDOFF ACTIONS (0 AI calls — instant immutable context sharing)
  const handleHandoffAvatar = () => {
    const ctx = exportAvatarIdentityContext(state);
    if (!ctx) return;
    if (onUseAsAvatar) {
      onUseAsAvatar(ctx);
    }
    setHandoffToast({
      type: 'avatar',
      message: 'Avatar reference ready'
    });
    setTimeout(() => setHandoffToast(null), 4000);
  };

  const handleHandoffScene = () => {
    if (!state.analysis) return;
    if (onUseAsSceneReference) {
      onUseAsSceneReference(state.analysis);
    }
    setHandoffToast({
      type: 'scene',
      message: 'Scene reference ready'
    });
    setTimeout(() => setHandoffToast(null), 4000);
  };

  // 6. CLEAR REFERENCE (Local Reset)
  const handleClearReference = () => {
    clearAgentStateFromSession();
    setState(createInitialAgentState());
    setImageUrlInput('');
    setShowClearConfirmModal(false);
    setHandoffToast({
      type: 'info',
      message: 'Referência limpa com sucesso.'
    });
    setTimeout(() => setHandoffToast(null), 3000);
  };

  // ==========================================
  // RENDER HELPERS
  // ==========================================

  const renderStatusBadge = (status?: VisualEvidenceStatus) => {
    switch (status) {
      case 'VISIBLE':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            VISIBLE
          </span>
        );
      case 'PARTIAL':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            PARTIAL
          </span>
        );
      case 'INFERRED':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
            INFERRED
          </span>
        );
      case 'UNKNOWN':
      default:
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-neutral-800 text-neutral-400 border border-neutral-700">
            UNKNOWN
          </span>
        );
    }
  };

  const renderEvidenceField = (
    label: string,
    evidence?: VisualEvidence<any> | { status?: VisualEvidenceStatus; value?: any; confidence?: number; description?: string }
  ) => {
    if (!evidence) {
      return (
        <div className="flex items-center justify-between py-1 border-b border-neutral-800/60 text-xs">
          <span className="text-neutral-400">{label}</span>
          {renderStatusBadge('UNKNOWN')}
        </div>
      );
    }

    const valText = Array.isArray(evidence.value)
      ? evidence.value.join(', ')
      : typeof evidence.value === 'object'
      ? JSON.stringify(evidence.value)
      : String(evidence.value ?? '—');

    return (
      <div className="flex items-start justify-between py-1.5 border-b border-neutral-800/60 text-xs gap-2">
        <div className="flex flex-col">
          <span className="text-neutral-300 font-medium">{label}</span>
          {evidence.status !== 'UNKNOWN' && (
            <span className="text-neutral-400 text-[11px] mt-0.5 break-words">
              {valText}
            </span>
          )}
          {showAdvancedDnaConfidence && evidence.confidence !== undefined && (
            <span className="text-[10px] text-neutral-500 font-mono mt-0.5">
              Confiança: {Math.round(evidence.confidence * 100)}%
            </span>
          )}
        </div>
        <div className="shrink-0">{renderStatusBadge(evidence.status)}</div>
      </div>
    );
  };

  // Primary status UI representation
  const renderPrimaryStatusPill = () => {
    switch (primaryStatus) {
      case 'ANALYZING':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ANALYZING
          </span>
        );
      case 'CLEANING':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            CLEANING
          </span>
        );
      case 'READY':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            READY
          </span>
        );
      case 'ERROR':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            ERROR
          </span>
        );
      case 'EMPTY':
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-neutral-800 text-neutral-400 border border-neutral-700 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-neutral-500"></span>
            EMPTY
          </span>
        );
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-6 space-y-6 text-neutral-200">
      {/* ======================================================== */}
      {/* TOP HEADER & OPERATIONAL STATUS                          */}
      {/* ======================================================== */}
      <div className="bg-[#121214] border border-neutral-800 rounded-xl p-5 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-lg font-bold text-neutral-100">Visual Reference Agent</h1>
                {state.analysis && (
                  <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/30">
                    REFERENCE ANALYZED
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                {uiMode === 'SIMPLE'
                  ? 'Geração e harmonização de referências visuais para avatares e cenas.'
                  : 'Pipeline empírico de extração de DNA visual, contratos de limpeza e compilação determinística.'}
              </p>
            </div>
          </div>

          {/* Right Side: Status Badge, Mode Switcher & Reset Button */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Primary Reference Status */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-mono text-neutral-400">Reference Status:</span>
              {renderPrimaryStatusPill()}
            </div>

            {/* Simple / Advanced Mode Switcher */}
            <div className="flex bg-[#18181B] p-1 rounded-lg border border-neutral-800 text-xs font-semibold">
              <button
                onClick={() => setUiMode('SIMPLE')}
                className={`px-3 py-1 rounded-md transition ${
                  uiMode === 'SIMPLE'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Simple Mode
              </button>
              <button
                onClick={() => setUiMode('ADVANCED')}
                className={`px-3 py-1 rounded-md transition flex items-center gap-1.5 ${
                  uiMode === 'ADVANCED'
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Sliders className="w-3 h-3" />
                Advanced Mode
              </button>
            </div>

            {/* Clear Reference Button */}
            {state.image && (
              <button
                onClick={() => {
                  if (state.analysis) {
                    setShowClearConfirmModal(true);
                  } else {
                    handleClearReference();
                  }
                }}
                className="px-2.5 py-1.5 rounded-lg bg-neutral-800/80 hover:bg-neutral-700 text-neutral-400 hover:text-rose-400 text-xs font-medium flex items-center gap-1.5 transition border border-neutral-700/60"
                title="Limpar referência ativa da sessão"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Clear Reference</span>
              </button>
            )}
          </div>
        </div>

        {/* Advanced Mode Navigation Sub-bar */}
        {uiMode === 'ADVANCED' && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 mt-3 border-t border-neutral-800/80">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setAdvancedTab('DNA')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  advancedTab === 'DNA'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-neutral-800/60 text-neutral-400 hover:text-neutral-200 border border-neutral-700/40'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Visual DNA
              </button>
              <button
                onClick={() => setAdvancedTab('CONTRACT')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  advancedTab === 'CONTRACT'
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                    : 'bg-neutral-800/60 text-neutral-400 hover:text-neutral-200 border border-neutral-700/40'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                Cleaning Contract
              </button>
              <button
                onClick={() => setAdvancedTab('PROMPT_METRICS')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  advancedTab === 'PROMPT_METRICS'
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                    : 'bg-neutral-800/60 text-neutral-400 hover:text-neutral-200 border border-neutral-700/40'
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                Prompt Structure
              </button>
              <button
                onClick={() => setAdvancedTab('TELEMETRY')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  advancedTab === 'TELEMETRY'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-neutral-800/60 text-neutral-400 hover:text-neutral-200 border border-neutral-700/40'
                }`}
              >
                <Cpu className="w-3.5 h-3.5" />
                AI Telemetry
              </button>
              <button
                onClick={() => setAdvancedTab('BENCHMARK')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  advancedTab === 'BENCHMARK'
                    ? 'bg-purple-600 text-white border border-purple-500/40'
                    : 'bg-neutral-800/60 text-neutral-400 hover:text-neutral-200 border border-neutral-700/40'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                Benchmark & Diagnostics
              </button>
            </div>

            {/* Reanalyze Action (Advanced Mode explicit trigger) */}
            {state.analysis && (
              <button
                onClick={() => setShowReanalyzeModal(true)}
                className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reanalyze Reference
              </button>
            )}
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* SEGREGATED ERROR BANNERS (Independent isolation)        */}
      {/* ======================================================== */}
      {state.analysisError && (
        <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold uppercase tracking-wider text-[11px] block">ANALYSIS ERROR</span>
            <p>{state.analysisError}</p>
          </div>
        </div>
      )}

      {state.imageEditError && (
        <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold uppercase tracking-wider text-[11px] block">CLEANER ERROR</span>
            <p>{state.imageEditError}</p>
            <p className="text-amber-400/80 text-[11px]">
              Nota: A análise visual original e o Visual DNA foram rigorosamente preservados.
            </p>
          </div>
        </div>
      )}

      {state.promptCompositionError && (
        <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold uppercase tracking-wider text-[11px] block">PROMPT COMPOSITION ERROR</span>
            <p>{state.promptCompositionError}</p>
            <p className="text-neutral-400 text-[11px]">
              Nota: A referência visual não foi reanalisada; o erro ocorreu apenas no compositor sintático local.
            </p>
          </div>
        </div>
      )}

      {/* Handoff Confirmation Toast */}
      {handoffToast && (
        <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-between shadow-lg animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="font-medium">{handoffToast.message}</span>
          </div>
          <button
            onClick={() => setHandoffToast(null)}
            className="text-neutral-400 hover:text-white text-xs"
          >
            Fechar
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* SIMPLE MODE VIEW (DEFAULT)                               */}
      {/* ======================================================== */}
      {uiMode === 'SIMPLE' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column (5 Cols): Upload & Image Comparison */}
          <div className="lg:col-span-5 space-y-6">
            {/* Upload Card */}
            <div className="bg-[#121214] border border-neutral-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-emerald-400" />
                  Imagem de Referência
                </h2>
                <span className="text-[11px] text-neutral-400 font-mono">Upload / URL / Presets</span>
              </div>

              {/* Quick Presets */}
              <div className="flex flex-wrap gap-2">
                {SAMPLE_PRESETS.map((preset, i) => (
                  <button
                    key={i}
                    onClick={() => handleImageLoad(preset.url)}
                    className="px-2.5 py-1 text-xs rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 transition"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>

              {/* URL Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Colar URL da imagem (https://...)"
                  value={imageUrlInput}
                  onChange={(e) => setImageUrlInput(e.target.value)}
                  className="flex-1 bg-[#18181B] border border-neutral-700 rounded-lg px-3 py-2 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                />
                <button
                  onClick={() => {
                    if (imageUrlInput.trim()) {
                      handleImageLoad(imageUrlInput.trim());
                      setImageUrlInput('');
                    }
                  }}
                  disabled={!imageUrlInput.trim()}
                  className="px-3 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-xs font-semibold text-neutral-200 transition"
                >
                  Carregar
                </button>
              </div>

              {/* File Dropzone */}
              <label className="border-2 border-dashed border-neutral-700 hover:border-emerald-500/50 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition bg-neutral-900/30 group">
                <ImageIcon className="w-6 h-6 text-neutral-500 group-hover:text-emerald-400 transition mb-1.5" />
                <span className="text-xs text-neutral-300 font-medium">
                  Clique para selecionar ou arraste uma imagem
                </span>
                <span className="text-[10px] text-neutral-500 mt-0.5">PNG, JPG, WEBP até 10MB</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Preview Card (Original vs Cleaned Switcher) */}
            <div className="bg-[#121214] border border-neutral-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-emerald-400" />
                  Visualização
                </h2>
                {state.cleanedImage && (
                  <div className="flex bg-neutral-900 p-0.5 rounded-lg border border-neutral-800 text-xs">
                    <button
                      onClick={() => setState((p) => ({ ...p, activePreviewMode: 'ORIGINAL' }))}
                      className={`px-2.5 py-1 rounded-md transition font-medium text-[11px] ${
                        state.activePreviewMode === 'ORIGINAL'
                          ? 'bg-neutral-800 text-neutral-100 shadow'
                          : 'text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      Original
                    </button>
                    <button
                      onClick={() => setState((p) => ({ ...p, activePreviewMode: 'CLEANED' }))}
                      className={`px-2.5 py-1 rounded-md transition font-medium text-[11px] ${
                        state.activePreviewMode === 'CLEANED'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      Limpa
                    </button>
                  </div>
                )}
              </div>

              {state.image ? (
                <div className="space-y-3">
                  <div className="relative rounded-lg overflow-hidden border border-neutral-800 bg-[#09090B] flex items-center justify-center min-h-[260px] max-h-[360px]">
                    <img
                      src={
                        state.activePreviewMode === 'CLEANED' && state.cleanedImage
                          ? state.cleanedImage
                          : state.image
                      }
                      alt="Referência Visual"
                      className="max-h-[350px] w-full object-contain rounded"
                    />
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-black/70 backdrop-blur-sm text-neutral-300 border border-neutral-700">
                      {state.activePreviewMode === 'CLEANED' && state.cleanedImage
                        ? 'REFERÊNCIA LIMPA'
                        : 'REFERÊNCIA ORIGINAL'}
                    </div>
                  </div>

                  {/* Dual Thumbnails when cleaned reference is ready */}
                  {state.cleanedImage && (
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div
                        onClick={() => setState((p) => ({ ...p, activePreviewMode: 'ORIGINAL' }))}
                        className={`p-2 rounded-lg border cursor-pointer transition ${
                          state.activePreviewMode === 'ORIGINAL'
                            ? 'border-emerald-500 bg-emerald-500/5'
                            : 'border-neutral-800 bg-[#18181B] hover:border-neutral-700'
                        }`}
                      >
                        <span className="text-[10px] font-bold text-neutral-400 block mb-1">ORIGINAL</span>
                        <img src={state.image} alt="Original" className="h-16 w-full object-cover rounded" />
                      </div>
                      <div
                        onClick={() => setState((p) => ({ ...p, activePreviewMode: 'CLEANED' }))}
                        className={`p-2 rounded-lg border cursor-pointer transition ${
                          state.activePreviewMode === 'CLEANED'
                            ? 'border-emerald-500 bg-emerald-500/5'
                            : 'border-neutral-800 bg-[#18181B] hover:border-neutral-700'
                        }`}
                      >
                        <span className="text-[10px] font-bold text-emerald-400 block mb-1">LIMPA</span>
                        <img src={state.cleanedImage} alt="Limpa" className="h-16 w-full object-cover rounded" />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-48 rounded-lg border border-neutral-800 bg-[#18181B]/50 flex flex-col items-center justify-center text-neutral-500 text-xs">
                  <ImageIcon className="w-8 h-8 mb-2 opacity-40" />
                  Nenhuma imagem carregada
                </div>
              )}
            </div>
          </div>

          {/* Right Column (7 Cols): Sequential Action Steps & Clean Output */}
          <div className="lg:col-span-7 space-y-6">
            {/* Primary Action Card (Sequence Flow) */}
            <div className="bg-[#121214] border border-neutral-800 rounded-xl p-5 space-y-5">
              <h2 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-400" />
                Pipeline de Referência Visual
              </h2>

              {/* Step 1: Analisar Referência */}
              <div className="p-4 rounded-lg bg-[#18181B] border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                      state.analysis ? 'bg-emerald-500 text-black' : 'bg-neutral-800 text-neutral-300'
                    }`}>
                      1
                    </div>
                    <span className="text-xs font-semibold text-neutral-200">Analisar Referência</span>
                  </div>
                  {state.analysis && (
                    <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Analisada
                    </span>
                  )}
                </div>

                <p className="text-xs text-neutral-400">
                  Extrai o Visual DNA completo da imagem (proporções faciais, pele, pose, iluminação e enquadramento).
                </p>

                <button
                  onClick={handleAnalyze}
                  disabled={!state.image || state.analysisStatus === 'PROCESSING'}
                  className="w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-950/40"
                >
                  {state.analysisStatus === 'PROCESSING' ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Analisando Referência...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      {state.analysis ? 'Reanalisar Referência' : 'Analisar Referência'}
                    </>
                  )}
                </button>
              </div>

              {/* Step 2: Limpar Referência (Opcional) */}
              <div className={`p-4 rounded-lg border space-y-3 transition ${
                state.analysis ? 'bg-[#18181B] border-neutral-800' : 'bg-[#18181B]/40 border-neutral-800/40 opacity-60'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                      state.cleanedImage ? 'bg-emerald-500 text-black' : 'bg-neutral-800 text-neutral-300'
                    }`}>
                      2
                    </div>
                    <span className="text-xs font-semibold text-neutral-200">Limpar Referência (Opcional)</span>
                  </div>
                  {state.cleanedImage && (
                    <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Limpeza Aplicada
                    </span>
                  )}
                </div>

                <div className="p-2.5 rounded bg-neutral-900/80 border border-neutral-800 text-[11px] grid grid-cols-2 gap-2 text-neutral-300">
                  <div>
                    <span className="text-rose-400 font-semibold block text-[10px]">REMOVER:</span>
                    <span className="text-neutral-400 text-[10px]">textos, legendas, UI e poluição</span>
                  </div>
                  <div>
                    <span className="text-emerald-400 font-semibold block text-[10px]">PRESERVAR:</span>
                    <span className="text-neutral-400 text-[10px]">pessoa, produto, logos e roupas</span>
                  </div>
                </div>

                <button
                  onClick={handleClean}
                  disabled={!state.analysis || state.cleaningStatus === 'PROCESSING'}
                  className="w-full py-2 px-4 rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-neutral-200 font-semibold text-xs flex items-center justify-center gap-2 transition border border-neutral-700"
                >
                  {state.cleaningStatus === 'PROCESSING' ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                      Limpando Referência...
                    </>
                  ) : (
                    <>
                      <Shield className="w-3.5 h-3.5 text-emerald-400" />
                      {state.cleanedImage ? 'Refazer Limpeza' : 'Limpar Referência'}
                    </>
                  )}
                </button>
              </div>

              {/* Step 3: Gerar Prompt & Handoff */}
              <div className={`p-4 rounded-lg border space-y-3 transition ${
                state.analysis ? 'bg-[#18181B] border-neutral-800' : 'bg-[#18181B]/40 border-neutral-800/40 opacity-60'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                      state.promptOutput ? 'bg-emerald-500 text-black' : 'bg-neutral-800 text-neutral-300'
                    }`}>
                      3
                    </div>
                    <span className="text-xs font-semibold text-neutral-200">Gerar Prompt de Produção</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-mono font-bold">0 Chamadas de IA</span>
                </div>

                {/* Prompt Modes Selector */}
                <div className="grid grid-cols-3 gap-1.5">
                  {(['RECONSTRUCTION', 'IDENTITY_REFERENCE', 'SCENE_REFERENCE'] as AgentPromptMode[]).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => handlePromptModeChange(mode)}
                      disabled={!state.analysis}
                      className={`py-1.5 px-2 rounded text-[11px] font-medium transition ${
                        state.promptMode === mode
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-neutral-800 text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      {mode === 'RECONSTRUCTION'
                        ? 'Reconstrução'
                        : mode === 'IDENTITY_REFERENCE'
                        ? 'Referência Avatar'
                        : 'Referência Cena'}
                    </button>
                  ))}
                </div>

                {/* Direct Action Handoffs */}
                <div className="pt-2 border-t border-neutral-800 flex gap-2">
                  <button
                    onClick={handleHandoffAvatar}
                    disabled={!state.analysis}
                    className="flex-1 py-2 px-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 text-neutral-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition border border-neutral-700"
                  >
                    <User className="w-3.5 h-3.5 text-emerald-400" />
                    Usar como Avatar
                  </button>
                  <button
                    onClick={handleHandoffScene}
                    disabled={!state.analysis}
                    className="flex-1 py-2 px-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 text-neutral-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition border border-neutral-700"
                  >
                    <Layers className="w-3.5 h-3.5 text-sky-400" />
                    Usar como Cena
                  </button>
                </div>
              </div>
            </div>

            {/* Prompt Output Card */}
            <div className="bg-[#121214] border border-neutral-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-indigo-400" />
                    Prompt Gerado ({state.promptMode})
                  </h2>
                  <span className="text-[11px] text-neutral-400">
                    Pronto para renderização em geradores de imagem/vídeo
                  </span>
                </div>

                {state.promptOutput && (
                  <button
                    onClick={handleCopyPrompt}
                    className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition border border-neutral-700"
                  >
                    {copiedPrompt ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copiar Prompt
                      </>
                    )}
                  </button>
                )}
              </div>

              {state.promptOutput ? (
                <div className="rounded-lg bg-[#09090B] border border-neutral-800 p-4 font-mono text-xs text-neutral-300 overflow-x-auto max-h-[280px]">
                  <pre className="text-[11px] leading-relaxed whitespace-pre-wrap">
                    {state.promptOutput.prompt}
                  </pre>
                </div>
              ) : (
                <div className="p-8 text-center text-neutral-500 text-xs space-y-2">
                  <FileCode className="w-8 h-8 mx-auto opacity-30" />
                  <p>Analise a imagem para gerar automaticamente o prompt determinístico.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ======================================================== */
        /* ADVANCED MODE VIEW (FULL DIAGNOSTICS & TELEMETRY)        */
        /* ======================================================== */
        <div className="space-y-6">
          {/* Sub-view: BENCHMARK & DIAGNOSTICS */}
          {advancedTab === 'BENCHMARK' ? (
            <VisualReferenceBenchmarkPanel
              currentAnalysis={state.analysis}
              currentCleanedImage={state.cleanedImage}
              currentImage={state.image}
            />
          ) : advancedTab === 'TELEMETRY' ? (
            /* Sub-view: TELEMETRY DETAIL */
            <div className="bg-[#121214] border border-neutral-800 rounded-xl p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <h2 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-amber-400" />
                  Auditoria de Telemetria de Chamadas de IA
                </h2>
                <span className="text-xs font-mono text-neutral-400">Total Consumido: {state.aiCallCount}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-[#18181B] border border-neutral-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-neutral-400 font-mono">Analysis AI Calls</span>
                    <span className="text-xs font-bold text-emerald-400 font-mono">
                      {state.telemetry?.analysisCalls ?? (state.analysis ? 1 : 0)}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-500">Consumo de IA para extração empírica de evidências (1 por imagem).</p>
                </div>

                <div className="p-4 rounded-lg bg-[#18181B] border border-neutral-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-neutral-400 font-mono">Image Edit Calls</span>
                    <span className="text-xs font-bold text-sky-400 font-mono">
                      {state.telemetry?.imageEditCalls ?? (state.cleanedImage ? 1 : 0)}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-500">Executado somente ao disparar a limpeza de referência.</p>
                </div>

                <div className="p-4 rounded-lg bg-[#18181B] border border-neutral-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-neutral-400 font-mono">Prompt AI Calls</span>
                    <span className="text-xs font-bold text-emerald-400 font-mono">
                      {state.telemetry?.promptCompositionCalls ?? 0} (100% Determinístico Local)
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-500">Composições de prompt locais nunca consom tokens ou chamadas de IA.</p>
                </div>
              </div>
            </div>
          ) : advancedTab === 'CONTRACT' ? (
            /* Sub-view: CLEANING CONTRACT */
            <div className="bg-[#121214] border border-neutral-800 rounded-xl p-6 space-y-5">
              <h2 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
                <Shield className="w-4 h-4 text-sky-400" />
                Contrato de Limpeza de Referência
              </h2>

              {state.cleaningOperations ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-[#18181B] border border-neutral-800 space-y-2">
                    <span className="text-xs font-bold text-neutral-300 uppercase block">Operações Aplicadas</span>
                    <ul className="text-xs text-neutral-400 space-y-1">
                      {state.cleaningOperations.appliedOperations.map((op, i) => (
                        <li key={i} className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>{op}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-4 rounded-lg bg-[#18181B] border border-neutral-800 space-y-2">
                    <span className="text-xs font-bold text-emerald-400 uppercase block">Elementos Preservados</span>
                    <ul className="text-xs text-neutral-400 space-y-1">
                      {state.cleaningOperations.preservedElements.map((el, i) => (
                        <li key={i} className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>{el}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-4 rounded-lg bg-[#18181B] border border-neutral-800 space-y-2">
                    <span className="text-xs font-bold text-rose-400 uppercase block">Elementos Removidos</span>
                    <ul className="text-xs text-neutral-400 space-y-1">
                      {state.cleaningOperations.removedElements.map((el, i) => (
                        <li key={i} className="flex items-center gap-1.5">
                          <X className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          <span>{el}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-neutral-500 text-xs">
                  Nenhuma operação de limpeza executada nesta referência.
                </div>
              )}
            </div>
          ) : advancedTab === 'PROMPT_METRICS' ? (
            /* Sub-view: PROMPT STRUCTURE & METRICS */
            <div className="bg-[#121214] border border-neutral-800 rounded-xl p-6 space-y-5">
              <h2 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
                <FileCode className="w-4 h-4 text-indigo-400" />
                Estrutura Canônica de Prompt
              </h2>

              {state.promptOutput ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
                    <div className="p-3 rounded bg-[#18181B] border border-neutral-800">
                      <span className="text-neutral-500 block text-[10px]">FORMATO</span>
                      <span className="text-neutral-200 font-bold">{state.promptOutput.format || 'cinematic'}</span>
                    </div>
                    <div className="p-3 rounded bg-[#18181B] border border-neutral-800">
                      <span className="text-neutral-500 block text-[10px]">ASPECT RATIO</span>
                      <span className="text-neutral-200 font-bold">{state.promptOutput.aspectRatio || '9:16'}</span>
                    </div>
                    <div className="p-3 rounded bg-[#18181B] border border-neutral-800">
                      <span className="text-neutral-500 block text-[10px]">SEÇÕES INCLUÍDAS</span>
                      <span className="text-emerald-400 font-bold">{state.promptOutput.includedSections?.length || 0}</span>
                    </div>
                    <div className="p-3 rounded bg-[#18181B] border border-neutral-800">
                      <span className="text-neutral-500 block text-[10px]">UNKNOWN OMITIDOS</span>
                      <span className="text-amber-400 font-bold">{state.promptOutput.omittedUnknownFields?.length || 0}</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-[#09090B] border border-neutral-800 font-mono text-xs text-neutral-300">
                    <pre className="text-[11px] leading-relaxed whitespace-pre-wrap">
                      {JSON.stringify(state.promptOutput, null, 2)}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-neutral-500 text-xs">
                  Prompt ainda não gerado.
                </div>
              )}
            </div>
          ) : (
            /* Sub-view: VISUAL DNA TREE (DEFAULT ADVANCED) */
            <div className="bg-[#121214] border border-neutral-800 rounded-xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800 pb-3">
                <div>
                  <h2 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-400" />
                    Visual DNA Estruturado
                  </h2>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Evidências empíricas extraídas com status de certeza (VISIBLE, PARTIAL, INFERRED, UNKNOWN).
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowAdvancedDnaConfidence(!showAdvancedDnaConfidence)}
                    className={`px-2 py-1 rounded text-[11px] font-medium border transition ${
                      showAdvancedDnaConfidence
                        ? 'bg-neutral-700 text-white border-neutral-600'
                        : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-neutral-200'
                    }`}
                  >
                    {showAdvancedDnaConfidence ? 'Ocultar Confiança' : 'Ver Confiança'}
                  </button>
                </div>
              </div>

              {/* Tab Selector: Identity-Related vs Scene / Photo State */}
              <div className="flex bg-[#18181B] p-1 rounded-lg border border-neutral-800 text-xs">
                <button
                  onClick={() => setActiveDnaTab('IDENTITY')}
                  className={`flex-1 py-2 rounded-md font-semibold text-xs flex items-center justify-center gap-2 transition ${
                    activeDnaTab === 'IDENTITY'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  IDENTITY-RELATED APPEARANCE
                </button>
                <button
                  onClick={() => setActiveDnaTab('SCENE')}
                  className={`flex-1 py-2 rounded-md font-semibold text-xs flex items-center justify-center gap-2 transition ${
                    activeDnaTab === 'SCENE'
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  SCENE / PHOTO STATE
                </button>
              </div>

              {/* Visual DNA Content Tree */}
              {state.analysis ? (
                <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
                  {activeDnaTab === 'IDENTITY' ? (
                    <div className="space-y-3">
                      {/* Identity DNA */}
                      <div className="border border-neutral-800 rounded-lg bg-[#18181B]/70 overflow-hidden">
                        <button
                          onClick={() => toggleSection('identity')}
                          className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-semibold text-neutral-200 hover:bg-neutral-800/50 transition"
                        >
                          <span className="flex items-center gap-2">
                            <User className="w-3.5 h-3.5 text-emerald-400" />
                            Identity DNA (Características Intrínsecas)
                          </span>
                          {expandedSections.identity ? <ChevronDown className="w-3.5 h-3.5 text-neutral-400" /> : <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />}
                        </button>
                        {expandedSections.identity && (
                          <div className="p-3.5 pt-0 space-y-1">
                            {renderEvidenceField('Aparência Facial Visível', state.analysis.identity?.visibleFacialAppearance)}
                            {renderEvidenceField('Proporções Faciais', state.analysis.identity?.facialProportions)}
                            {renderEvidenceField('Características da Pele', state.analysis.identity?.skinCharacteristics)}
                            {renderEvidenceField('Características do Cabelo', state.analysis.identity?.hairCharacteristics)}
                            {renderEvidenceField('Traços Distintivos', state.analysis.identity?.distinguishingTraits)}
                          </div>
                        )}
                      </div>

                      {/* Face DNA */}
                      <div className="border border-neutral-800 rounded-lg bg-[#18181B]/70 overflow-hidden">
                        <button
                          onClick={() => toggleSection('face')}
                          className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-semibold text-neutral-200 hover:bg-neutral-800/50 transition"
                        >
                          <span>Face DNA (Olhos, Sobrancelhas, Nariz, Boca)</span>
                          {expandedSections.face ? <ChevronDown className="w-3.5 h-3.5 text-neutral-400" /> : <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />}
                        </button>
                        {expandedSections.face && (
                          <div className="p-3.5 pt-0 space-y-1">
                            {renderEvidenceField('Visibilidade Facial', state.analysis.face?.visibility)}
                            {renderEvidenceField('Orientação da Cabeça', state.analysis.face?.headOrientation)}
                            {renderEvidenceField('Aparência dos Olhos', state.analysis.face?.eyeAppearance)}
                            {renderEvidenceField('Sobrancelhas', state.analysis.face?.eyebrowAppearance)}
                            {renderEvidenceField('Nariz', state.analysis.face?.noseAppearance)}
                            {renderEvidenceField('Boca', state.analysis.face?.mouthAppearance)}
                          </div>
                        )}
                      </div>

                      {/* Hair DNA */}
                      <div className="border border-neutral-800 rounded-lg bg-[#18181B]/70 overflow-hidden">
                        <button
                          onClick={() => toggleSection('hair')}
                          className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-semibold text-neutral-200 hover:bg-neutral-800/50 transition"
                        >
                          <span>Hair DNA (Cor, Comprimento, Textura, Penteado)</span>
                          {expandedSections.hair ? <ChevronDown className="w-3.5 h-3.5 text-neutral-400" /> : <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />}
                        </button>
                        {expandedSections.hair && (
                          <div className="p-3.5 pt-0 space-y-1">
                            {renderEvidenceField('Cor', state.analysis.hair?.color)}
                            {renderEvidenceField('Comprimento', state.analysis.hair?.length)}
                            {renderEvidenceField('Textura', state.analysis.hair?.texture)}
                            {renderEvidenceField('Densidade', state.analysis.hair?.density)}
                            {renderEvidenceField('Penteado', state.analysis.hair?.style)}
                          </div>
                        )}
                      </div>

                      {/* Skin DNA */}
                      <div className="border border-neutral-800 rounded-lg bg-[#18181B]/70 overflow-hidden">
                        <button
                          onClick={() => toggleSection('skin')}
                          className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-semibold text-neutral-200 hover:bg-neutral-800/50 transition"
                        >
                          <span>Skin DNA (Tom Visível, Textura, Iluminação e Sombras)</span>
                          {expandedSections.skin ? <ChevronDown className="w-3.5 h-3.5 text-neutral-400" /> : <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />}
                        </button>
                        {expandedSections.skin && (
                          <div className="p-3.5 pt-0 space-y-1">
                            {renderEvidenceField('Tom Visível', state.analysis.skin?.visibleTone)}
                            {renderEvidenceField('Textura de Superfície', state.analysis.skin?.surfaceTexture)}
                            {renderEvidenceField('Pontos de Luz (Highlights)', state.analysis.skin?.highlights)}
                            {renderEvidenceField('Variação de Sombra', state.analysis.skin?.shadowVariation)}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* TAB 2: SCENE / PHOTO STATE */
                    <div className="space-y-3">
                      {/* Pose DNA */}
                      <div className="border border-neutral-800 rounded-lg bg-[#18181B]/70 overflow-hidden">
                        <button
                          onClick={() => toggleSection('pose')}
                          className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-semibold text-neutral-200 hover:bg-neutral-800/50 transition"
                        >
                          <span className="flex items-center gap-2">
                            <Sliders className="w-3.5 h-3.5 text-sky-400" />
                            Pose & Body State (Ombros, Braços, Mãos, Alinhamento)
                          </span>
                          {expandedSections.pose ? <ChevronDown className="w-3.5 h-3.5 text-neutral-400" /> : <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />}
                        </button>
                        {expandedSections.pose && (
                          <div className="p-3.5 pt-0 space-y-1">
                            {renderEvidenceField('Orientação do Corpo', state.analysis.sceneState?.pose?.bodyOrientation)}
                            {renderEvidenceField('Linha dos Ombros', state.analysis.sceneState?.pose?.shoulderLine)}
                            {renderEvidenceField('Braço Esquerdo', state.analysis.sceneState?.pose?.leftArm?.upperArmDirection)}
                            {renderEvidenceField('Braço Direito', state.analysis.sceneState?.pose?.rightArm?.upperArmDirection)}
                            {renderEvidenceField('Mão Esquerda', state.analysis.sceneState?.pose?.leftHand?.visibility)}
                            {renderEvidenceField('Mão Direita', state.analysis.sceneState?.pose?.rightHand?.visibility)}
                          </div>
                        )}
                      </div>

                      {/* Wardrobe DNA */}
                      <div className="border border-neutral-800 rounded-lg bg-[#18181B]/70 overflow-hidden">
                        <button
                          onClick={() => toggleSection('wardrobe')}
                          className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-semibold text-neutral-200 hover:bg-neutral-800/50 transition"
                        >
                          <span>Wardrobe (Vestuário, Tecidos, Cores e Ajuste)</span>
                          {expandedSections.wardrobe ? <ChevronDown className="w-3.5 h-3.5 text-neutral-400" /> : <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />}
                        </button>
                        {expandedSections.wardrobe && (
                          <div className="p-3.5 pt-0 space-y-1">
                            {renderEvidenceField('Peça Superior (Top)', state.analysis.sceneState?.wardrobe?.top?.type)}
                            {renderEvidenceField('Cor Top', state.analysis.sceneState?.wardrobe?.top?.color)}
                            {renderEvidenceField('Tecido Top', state.analysis.sceneState?.wardrobe?.top?.fabricAppearance)}
                            {renderEvidenceField('Peça Inferior (Bottom)', state.analysis.sceneState?.wardrobe?.bottom?.type)}
                            {renderEvidenceField('Cor Bottom', state.analysis.sceneState?.wardrobe?.bottom?.color)}
                          </div>
                        )}
                      </div>

                      {/* Camera & Lighting */}
                      <div className="border border-neutral-800 rounded-lg bg-[#18181B]/70 overflow-hidden">
                        <button
                          onClick={() => toggleSection('camera')}
                          className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-semibold text-neutral-200 hover:bg-neutral-800/50 transition"
                        >
                          <span>Câmera, Enquadramento & Iluminação</span>
                          {expandedSections.camera ? <ChevronDown className="w-3.5 h-3.5 text-neutral-400" /> : <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />}
                        </button>
                        {expandedSections.camera && (
                          <div className="p-3.5 pt-0 space-y-1">
                            {renderEvidenceField('Enquadramento', state.analysis.frame?.framing)}
                            {renderEvidenceField('Ponto de Vista', state.analysis.sceneState?.camera?.viewpoint)}
                            {renderEvidenceField('Ângulo de Câmera', state.analysis.sceneState?.camera?.angle)}
                            {renderEvidenceField('Profundidade de Campo', state.analysis.sceneState?.camera?.depthOfField)}
                            {renderEvidenceField('Tipo de Luz', state.analysis.sceneState?.lighting?.lightType)}
                            {renderEvidenceField('Suavidade', state.analysis.sceneState?.lighting?.softness)}
                            {renderEvidenceField('Direção da Luz', state.analysis.sceneState?.lighting?.direction)}
                          </div>
                        )}
                      </div>

                      {/* Branding & Text Elements */}
                      <div className="border border-neutral-800 rounded-lg bg-[#18181B]/70 overflow-hidden">
                        <button
                          onClick={() => toggleSection('branding')}
                          className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-semibold text-neutral-200 hover:bg-neutral-800/50 transition"
                        >
                          <span>Branding & Elementos de Texto</span>
                          {expandedSections.branding ? <ChevronDown className="w-3.5 h-3.5 text-neutral-400" /> : <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />}
                        </button>
                        {expandedSections.branding && (
                          <div className="p-3.5 pt-0 space-y-2">
                            {state.analysis.textElements && state.analysis.textElements.length > 0 ? (
                              state.analysis.textElements.map((el, idx) => (
                                <div key={idx} className="p-2 rounded bg-neutral-900 border border-neutral-800 text-xs flex items-center justify-between">
                                  <div>
                                    <span className="font-mono text-[11px] font-bold text-neutral-200">{el.type}</span>
                                    <span className="text-neutral-400 block text-[11px]">{el.content?.value || '—'}</span>
                                  </div>
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    el.cleaningDefault === 'PRESERVE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                                  }`}>
                                    {el.cleaningDefault}
                                  </span>
                                </div>
                              ))
                            ) : (
                              <span className="text-neutral-500 text-xs italic">Nenhum elemento de texto identificado na referência.</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center text-neutral-500 text-xs space-y-2">
                  <Layers className="w-8 h-8 mx-auto opacity-30" />
                  <p>Clique em <strong>Analisar Referência</strong> para extrair a árvore completa de Visual DNA.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* REANALYZE CONFIRMATION MODAL                             */}
      {/* ======================================================== */}
      {showReanalyzeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-[#121214] border border-neutral-700 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-amber-400">
              <AlertCircle className="w-6 h-6" />
              <h3 className="text-base font-bold text-white">Confirmar Reanálise Visual</h3>
            </div>
            <p className="text-xs text-neutral-300 leading-relaxed">
              This will perform a new visual analysis. Esta ação consumirá 1 chamada de IA para reprocessar a evidência empírica da imagem de referência.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowReanalyzeModal(false)}
                className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmReanalyze}
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Confirmar Reanálise
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* CLEAR REFERENCE CONFIRMATION MODAL                       */}
      {/* ======================================================== */}
      {showClearConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-[#121214] border border-neutral-700 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <Trash2 className="w-6 h-6" />
              <h3 className="text-base font-bold text-white">Limpar Referência da Sessão</h3>
            </div>
            <p className="text-xs text-neutral-300 leading-relaxed">
              Tem certeza que deseja resetar a referência atual? Isso limpará a imagem, a análise e os prompts desta sessão sem afetar o Identity Hub ou outros módulos.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowClearConfirmModal(false)}
                className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleClearReference}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Limpar Referência
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
