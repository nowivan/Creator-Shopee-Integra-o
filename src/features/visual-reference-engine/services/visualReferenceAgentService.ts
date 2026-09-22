/**
 * VISUAL REFERENCE AGENT SERVICE
 * Stage 8: Orchestrates the Visual Reference Engine pipeline into a reusable agent state machine.
 * 
 * Rules & Guarantees:
 * 1. Uses EXCLUSIVELY existing services:
 *    - analyzeVisualEvidence()
 *    - cleanReferenceImage()
 *    - composeVisualPrompt()
 *    - buildAvatarIdentityContext()
 * 2. Token economy:
 *    - 1 visual analysis per reference image
 *    - 0 AI calls for prompt composing (100% synchronous/deterministic)
 *    - 1 edit call only when Reference Cleaner is triggered
 * 3. Error resilience:
 *    - Cleaner failure never destroys analysis
 *    - Prompt composer failure never triggers re-analysis
 * 4. Immutable contract handoffs (AvatarIdentityContext, SceneReference).
 */

import {
  VisualReferenceAnalysis,
  AvatarIdentityContext
} from '../types/visualReferenceTypes';
import {
  analyzeVisualEvidence,
  VisualEvidenceAnalyzerInput
} from './visualEvidenceAnalyzer';
import {
  cleanReferenceImage,
  computeCleaningOperations,
  ReferenceCleanerOutput
} from './referenceCleaner';
import {
  composeVisualPrompt,
  VisualPromptComposerOutput
} from './visualPromptComposer';
import { buildAvatarIdentityContext } from './avatarIdentityHandoff';

export type AgentAnalysisMode = 'FULL' | 'IDENTITY' | 'SCENE';
export type AgentCleaningMode = 'CLEAN_WHITE' | 'PRESERVE_SCENE';
export type AgentPromptMode = 'RECONSTRUCTION' | 'IDENTITY_REFERENCE' | 'SCENE_REFERENCE';
export type PrimaryReferenceStatus = 'EMPTY' | 'ANALYZING' | 'READY' | 'CLEANING' | 'ERROR';

export interface VisualReferenceTelemetry {
  analysisCalls: number;
  imageEditCalls: number;
  promptCompositionCalls: number;
}

export interface VisualReferenceAgentState {
  image: string | null;
  cleanedImage: string | null;
  activePreviewMode: 'ORIGINAL' | 'CLEANED';
  analysisMode: AgentAnalysisMode;
  cleaningMode: AgentCleaningMode;
  promptMode: AgentPromptMode;

  // Pipeline Outputs
  analysis: VisualReferenceAnalysis | null;
  promptOutput: VisualPromptComposerOutput | null;
  cleaningOperations: {
    appliedOperations: string[];
    preservedElements: string[];
    removedElements: string[];
  } | null;

  // Pipeline Statuses
  analysisStatus: 'NOT_STARTED' | 'PROCESSING' | 'READY';
  cleaningStatus: 'NOT_USED' | 'PROCESSING' | 'READY';
  dnaStatus: 'NOT_STARTED' | 'READY';
  promptStatus: 'NOT_STARTED' | 'READY';

  // Segregated Errors
  analysisError: string | null;
  imageEditError: string | null;
  promptCompositionError: string | null;

  // Telemetry & Efficiency
  aiCallCount: number;
  telemetry: VisualReferenceTelemetry;
}

export function createInitialAgentState(): VisualReferenceAgentState {
  return {
    image: null,
    cleanedImage: null,
    activePreviewMode: 'ORIGINAL',
    analysisMode: 'FULL',
    cleaningMode: 'CLEAN_WHITE',
    promptMode: 'RECONSTRUCTION',

    analysis: null,
    promptOutput: null,
    cleaningOperations: null,

    analysisStatus: 'NOT_STARTED',
    cleaningStatus: 'NOT_USED',
    dnaStatus: 'NOT_STARTED',
    promptStatus: 'NOT_STARTED',

    analysisError: null,
    imageEditError: null,
    promptCompositionError: null,

    aiCallCount: 0,
    telemetry: {
      analysisCalls: 0,
      imageEditCalls: 0,
      promptCompositionCalls: 0
    }
  };
}

/**
 * Computes single primary visual reference status for user interface.
 */
export function getPrimaryReferenceStatus(state: VisualReferenceAgentState): PrimaryReferenceStatus {
  if (state.analysisError) return 'ERROR';
  if (state.analysisStatus === 'PROCESSING') return 'ANALYZING';
  if (state.cleaningStatus === 'PROCESSING') return 'CLEANING';
  if (state.analysisStatus === 'READY' && state.analysis) return 'READY';
  if (!state.image) return 'EMPTY';
  return 'EMPTY';
}

const SESSION_STORAGE_KEY = 'visual_reference_agent_active_session';

/**
 * Persists visual reference active session safely (no credentials / secrets).
 */
export function saveAgentStateToSession(state: VisualReferenceAgentState): void {
  if (typeof window === 'undefined') return;
  try {
    const safeState = {
      image: state.image,
      cleanedImage: state.cleanedImage,
      activePreviewMode: state.activePreviewMode,
      analysisMode: state.analysisMode,
      cleaningMode: state.cleaningMode,
      promptMode: state.promptMode,
      analysis: state.analysis,
      promptOutput: state.promptOutput,
      cleaningOperations: state.cleaningOperations,
      analysisStatus: state.analysisStatus,
      cleaningStatus: state.cleaningStatus,
      dnaStatus: state.dnaStatus,
      promptStatus: state.promptStatus,
      telemetry: state.telemetry || {
        analysisCalls: state.analysis ? 1 : 0,
        imageEditCalls: state.cleanedImage ? 1 : 0,
        promptCompositionCalls: 0
      }
    };
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(safeState));
  } catch (_err) {
    // Graceful fallback for quota limits
  }
}

/**
 * Restores visual reference active session if available.
 */
export function loadAgentStateFromSession(): VisualReferenceAgentState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      const initial = createInitialAgentState();
      const telemetry: VisualReferenceTelemetry = {
        analysisCalls: parsed.telemetry?.analysisCalls || (parsed.analysis ? 1 : 0),
        imageEditCalls: parsed.telemetry?.imageEditCalls || (parsed.cleanedImage ? 1 : 0),
        promptCompositionCalls: parsed.telemetry?.promptCompositionCalls || 0
      };
      return {
        ...initial,
        ...parsed,
        analysisError: null,
        imageEditError: null,
        promptCompositionError: null,
        telemetry,
        aiCallCount: telemetry.analysisCalls + telemetry.imageEditCalls
      };
    }
  } catch (_err) {
    // Ignore parse error
  }
  return null;
}

/**
 * Clears active visual reference session.
 */
export function clearAgentStateFromSession(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } catch (_err) {}
}

/**
 * Executes Visual Reference Analysis using analyzeVisualEvidence().
 * Consumes 1 AI call.
 */
export async function executeAgentAnalysis(
  state: VisualReferenceAgentState,
  params: {
    image?: string;
    analysisMode?: AgentAnalysisMode;
    apiKey?: string;
  }
): Promise<VisualReferenceAgentState> {
  const targetImage = params.image || state.image;
  if (!targetImage) {
    return {
      ...state,
      analysisError: 'ANALYSIS ERROR: Nenhuma imagem fornecida para análise.',
      analysisStatus: 'NOT_STARTED'
    };
  }

  const mode = params.analysisMode || state.analysisMode;

  try {
    const analysis = await analyzeVisualEvidence({
      image: targetImage,
      analysisMode: mode,
      apiKey: params.apiKey
    });

    const analysisCalls = (state.telemetry?.analysisCalls || 0) + 1;
    const imageEditCalls = state.telemetry?.imageEditCalls || 0;
    const promptCompositionCalls = state.telemetry?.promptCompositionCalls || 0;

    return {
      ...state,
      image: targetImage,
      analysisMode: mode,
      analysis,
      analysisStatus: 'READY',
      dnaStatus: 'READY',
      analysisError: null,
      telemetry: {
        analysisCalls,
        imageEditCalls,
        promptCompositionCalls
      },
      aiCallCount: analysisCalls + imageEditCalls
    };
  } catch (err: any) {
    return {
      ...state,
      analysisError: `ANALYSIS ERROR: ${err?.message || 'Falha ao analisar evidências visuais da imagem.'}`,
      analysisStatus: 'NOT_STARTED'
    };
  }
}

/**
 * Executes Reference Cleaner using cleanReferenceImage().
 * Consumes 1 AI call (or offline fallback).
 * IMPORTANT: If cleaning fails, the existing analysis is strictly preserved.
 */
export async function executeAgentCleaning(
  state: VisualReferenceAgentState,
  params: {
    cleaningMode?: AgentCleaningMode;
    apiKey?: string;
  }
): Promise<VisualReferenceAgentState> {
  if (!state.image) {
    return {
      ...state,
      imageEditError: 'IMAGE EDIT ERROR: Imagem original necessária para limpeza.',
      cleaningStatus: 'NOT_USED'
    };
  }

  if (!state.analysis) {
    return {
      ...state,
      imageEditError: 'IMAGE EDIT ERROR: É necessário analisar a referência antes de executar a limpeza orientada.',
      cleaningStatus: 'NOT_USED'
    };
  }

  const mode = params.cleaningMode || state.cleaningMode;

  try {
    const cleanerResult: ReferenceCleanerOutput = await cleanReferenceImage({
      image: state.image,
      analysis: state.analysis,
      mode,
      apiKey: params.apiKey
    });

    const analysisCalls = state.telemetry?.analysisCalls || 0;
    const imageEditCalls = (state.telemetry?.imageEditCalls || 0) + 1;
    const promptCompositionCalls = state.telemetry?.promptCompositionCalls || 0;

    return {
      ...state,
      cleaningMode: mode,
      cleanedImage: cleanerResult.cleanedImage,
      cleaningOperations: {
        appliedOperations: cleanerResult.appliedOperations,
        preservedElements: cleanerResult.preservedElements,
        removedElements: cleanerResult.removedElements
      },
      cleaningStatus: 'READY',
      activePreviewMode: 'CLEANED',
      imageEditError: null,
      telemetry: {
        analysisCalls,
        imageEditCalls,
        promptCompositionCalls
      },
      aiCallCount: analysisCalls + imageEditCalls
    };
  } catch (err: any) {
    // Preserve analysis untouched on cleaning error!
    return {
      ...state,
      imageEditError: `IMAGE EDIT ERROR: ${err?.message || 'Falha ao processar limpeza da imagem de referência.'}`,
      cleaningStatus: 'NOT_USED'
    };
  }
}

/**
 * Composes reconstruction or reference prompt using composeVisualPrompt().
 * Consumes 0 AI calls (100% deterministic local computation).
 * IMPORTANT: If composition fails, the existing analysis is NOT re-analyzed.
 */
export function executeAgentPromptComposition(
  state: VisualReferenceAgentState,
  params?: {
    promptMode?: AgentPromptMode;
  }
): VisualReferenceAgentState {
  if (!state.analysis) {
    return {
      ...state,
      promptCompositionError: 'PROMPT COMPOSITION ERROR: Análise visual necessária antes de compor o prompt.',
      promptStatus: 'NOT_STARTED'
    };
  }

  const mode = params?.promptMode || state.promptMode;

  try {
    const promptOutput = composeVisualPrompt({
      analysis: state.analysis,
      mode
    });

    return {
      ...state,
      promptMode: mode,
      promptOutput,
      promptStatus: 'READY',
      promptCompositionError: null
      // aiCallCount remains strictly unincremented (0 AI calls)
    };
  } catch (err: any) {
    return {
      ...state,
      promptCompositionError: `PROMPT COMPOSITION ERROR: ${err?.message || 'Erro ao compor prompt determinístico.'}`,
      promptStatus: 'NOT_STARTED'
    };
  }
}

/**
 * Prepares Avatar Identity Context for downstream handoff.
 * Reuses existing canonical avatarIdentityHandoff module.
 */
export function exportAvatarIdentityContext(
  state: VisualReferenceAgentState
): AvatarIdentityContext | null {
  if (!state.analysis || !state.image) {
    return null;
  }

  const promptOutput = state.promptOutput || composeVisualPrompt({
    analysis: state.analysis,
    mode: 'IDENTITY_REFERENCE'
  });

  return {
    identityDNA: state.analysis.identity,
    identityPrompt: promptOutput.prompt,
    referenceImage: state.image,
    cleanedReferenceImage: state.cleanedImage || undefined
  };
}
