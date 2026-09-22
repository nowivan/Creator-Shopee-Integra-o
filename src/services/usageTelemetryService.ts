/**
 * USAGE TELEMETRY CORE (Etapa 1)
 * CREATOR INTELLIGENCE PRO
 *
 * Centralized telemetry service for tracking tool opens, AI generations,
 * latency, token consumption, success/error rates, and user workflow events.
 *
 * Guaranteed Non-blocking: Telemetry never interrupts or alters AI generation or UX.
 * Privacy-first: No prompts, copies, images, base64, keys, or private user data are recorded.
 */

import { auth } from './firebase';
import {
  TelemetryEventType,
  TelemetryRequestStatus,
  UsageTelemetryEvent,
  UsageTelemetryAiMeta,
  ToolRegistryItem,
  TelemetryStorageAdapter,
  TokenReconciliationStatus
} from '../types/telemetry';
import {
  GeminiRequestAbortedError,
  GeminiRequestTimeoutError,
  WorkerRequestError,
  isAbortError,
  isTimeoutError
} from './workerClient';

// ==========================================
// 1. TOOL REGISTRY & ALIASES
// ==========================================

export const TOOL_REGISTRY: Record<string, ToolRegistryItem> = {
  // Infrastructure screens / System
  'dashboard': { id: 'dashboard', label: 'Estatísticas', category: 'Hub Principal', role: 'INFRASTRUCTURE' },
  'history': { id: 'history', label: 'Histórico', category: 'Sistema', role: 'INFRASTRUCTURE' },
  'settings': { id: 'settings', label: 'Configurações', category: 'Sistema', role: 'INFRASTRUCTURE' },
  'billing': { id: 'billing', label: 'Planos & Créditos', category: 'Sistema', role: 'INFRASTRUCTURE' },

  // Productive Tools
  'chat': { id: 'chat', label: 'Consultor Viral IA', category: 'Hub Principal', role: 'PRODUCTIVE' },
  'identity-hub': { id: 'identity-hub', label: 'Identity Hub', category: 'Hub Principal', role: 'PRODUCTIVE' },

  'agente-de-copy-clean': { id: 'agente-de-copy-clean', label: 'Agente de Copy Clean', category: 'Criação & Copy', role: 'PRODUCTIVE' },
  'agente-de-copy': { id: 'agente-de-copy', label: 'Agente de Copy', category: 'Criação & Copy', role: 'PRODUCTIVE' },
  'ai-video-project': { id: 'ai-video-project', label: 'AI Video Project', category: 'Criação & Copy', role: 'PRODUCTIVE' },
  'create': { id: 'create', label: 'Creative Director AI', category: 'Criação & Copy', role: 'PRODUCTIVE' },
  'product-listing': { id: 'product-listing', label: 'Anúncios SEO & Tags', category: 'Criação & Copy', role: 'PRODUCTIVE' },
  'collage-studio': { id: 'collage-studio', label: 'Criador de Colagem', category: 'Criação & Copy', role: 'PRODUCTIVE' },
  'vanessa': { id: 'vanessa', label: 'Vanessa Copy Creator', category: 'Criação & Copy', role: 'PRODUCTIVE' },
  'copy-master': { id: 'copy-master', label: 'Copy Master', category: 'Criação & Copy', role: 'PRODUCTIVE' },
  'hooks': { id: 'hooks', label: 'Ganchos Virais', category: 'Criação & Copy', role: 'PRODUCTIVE' },
  'script-refiner': { id: 'script-refiner', label: 'Refinador de Script', category: 'Criação & Copy', role: 'PRODUCTIVE' },
  'ideador': { id: 'ideador', label: 'Ideador Viral', category: 'Criação & Copy', role: 'PRODUCTIVE' },

  'visual-reference-agent': { id: 'visual-reference-agent', label: 'Visual Reference Agent', category: 'Vídeo IA (Prompts)', role: 'PRODUCTIVE' },
  'reverse': { id: 'reverse', label: 'Engenharia Reversa', category: 'Vídeo IA (Prompts)', role: 'PRODUCTIVE' },
  'cinematic': { id: 'cinematic', label: 'Cinematic Engine', category: 'Vídeo IA (Prompts)', role: 'PRODUCTIVE' },
  'try-on': { id: 'try-on', label: 'Provador Virtual', category: 'Vídeo IA (Prompts)', role: 'PRODUCTIVE' },

  'translator': { id: 'translator', label: 'Tradutor Virtual', category: 'Estúdio Criativo', role: 'PRODUCTIVE' },
  'image-describer': { id: 'image-describer', label: 'Descrever Imagem', category: 'Estúdio Criativo', role: 'PRODUCTIVE' },
  'magic-enhancer': { id: 'magic-enhancer', label: 'Aprimorador Mágico', category: 'Estúdio Criativo', role: 'PRODUCTIVE' },
  'prompt-refiner': { id: 'prompt-refiner', label: 'Editar com IA', category: 'Estúdio Criativo', role: 'PRODUCTIVE' },
  'image-extractor': { id: 'image-extractor', label: 'Extrator de Prompt', category: 'Estúdio Criativo', role: 'PRODUCTIVE' },

  'lyria-music': { id: 'lyria-music', label: 'Lyria Music Engine', category: 'Áudio & Som', role: 'PRODUCTIVE' },
  'transcription': { id: 'transcription', label: 'Transcrição & Voz', category: 'Áudio & Som', role: 'PRODUCTIVE' },

  'tiktok-legal': { id: 'tiktok-legal', label: 'Advogado TikTok', category: 'Legal & Conformidade', role: 'PRODUCTIVE' },
  'audit': { id: 'audit', label: 'Auditoria Compliance', category: 'Legal & Conformidade', role: 'PRODUCTIVE' },

  'unknown_tool': { id: 'unknown_tool', label: 'Ferramenta Desconhecida', category: 'Sistema', role: 'PRODUCTIVE' }
};

const KNOWN_TOOL_ALIASES: Record<string, string> = {
  // Ideador Viral aliases
  'ideador': 'ideador',
  'ideador viral': 'ideador',
  'ideador_viral': 'ideador',
  'ideation': 'ideador',
  'ideation_view': 'ideador',
  'ideias': 'ideador',

  // Creative Director aliases
  'create': 'create',
  'creative-director': 'create',
  'creative_director': 'create',
  'creative director': 'create',
  'creative director ai': 'create',
  'diretor criativo': 'create',
  'diretor-criativo': 'create',
  'diretor_criativo': 'create',

  // Dashboard / Statistics
  'dashboard': 'dashboard',
  'estatisticas': 'dashboard',
  'estatísticas': 'dashboard',
  'statistics': 'dashboard',

  // History
  'history': 'history',
  'historico': 'history',
  'histórico': 'history',

  // Chat
  'chat': 'chat',
  'consultor': 'chat',
  'consultor viral': 'chat',
  'consultor viral ia': 'chat',

  // Identity Hub
  'identity-hub': 'identity-hub',
  'identity_hub': 'identity-hub',
  'identity': 'identity-hub',

  // Copy Clean
  'agente-de-copy-clean': 'agente-de-copy-clean',
  'agente_de_copy_clean': 'agente-de-copy-clean',
  'copy-clean': 'agente-de-copy-clean',
  'scene2_copy_brain': 'agente-de-copy-clean',
  'scene3_cta_engine': 'agente-de-copy-clean',

  // Agente de Copy
  'agente-de-copy': 'agente-de-copy',
  'agente_de_copy': 'agente-de-copy',
  'copy-agent': 'agente-de-copy',

  // Video Project
  'ai-video-project': 'ai-video-project',
  'ai_video_project': 'ai-video-project',
  'video-project': 'ai-video-project',

  // Product listing
  'product-listing': 'product-listing',
  'product_listing': 'product-listing',
  'anuncios-seo': 'product-listing',

  // Collage
  'collage-studio': 'collage-studio',
  'collage_studio': 'collage-studio',
  'colagem': 'collage-studio',

  // Vanessa
  'vanessa': 'vanessa',
  'vanessa-shop': 'vanessa',
  'vanessa_shop': 'vanessa',

  // Copy master
  'copy-master': 'copy-master',
  'copy_master': 'copy-master',

  // Hooks
  'hooks': 'hooks',
  'ganchos': 'hooks',
  'ganchos-virais': 'hooks',
  'viral-hooks': 'hooks',

  // Script refiner
  'script-refiner': 'script-refiner',
  'script_refiner': 'script-refiner',
  'refinador-script': 'script-refiner',

  // Visual Reference
  'visual-reference-agent': 'visual-reference-agent',
  'visual_reference_agent': 'visual-reference-agent',
  'visual-reference': 'visual-reference-agent',

  // Reverse engineering
  'reverse': 'reverse',
  'reverse-engineering': 'reverse',
  'reverse_engineering': 'reverse',
  'engenharia-reversa': 'reverse',

  // Cinematic
  'cinematic': 'cinematic',
  'cinematic-engine': 'cinematic',
  'cinematic_engine': 'cinematic',

  // Try-on
  'try-on': 'try-on',
  'try_on': 'try-on',
  'provador-virtual': 'try-on',

  // Translator
  'translator': 'translator',
  'tradutor': 'translator',

  // Image describer
  'image-describer': 'image-describer',
  'image_describer': 'image-describer',
  'descrever-imagem': 'image-describer',

  // Magic enhancer
  'magic-enhancer': 'magic-enhancer',
  'magic_enhancer': 'magic-enhancer',
  'aprimorador': 'magic-enhancer',

  // Prompt refiner
  'prompt-refiner': 'prompt-refiner',
  'prompt_refiner': 'prompt-refiner',
  'editar-com-ia': 'prompt-refiner',

  // Image extractor
  'image-extractor': 'image-extractor',
  'image_extractor': 'image-extractor',
  'extrator-prompt': 'image-extractor',

  // Lyria
  'lyria-music': 'lyria-music',
  'lyria_music': 'lyria-music',
  'music': 'lyria-music',

  // Transcription
  'transcription': 'transcription',
  'transcricao': 'transcription',
  'transcrição': 'transcription',

  // TikTok Legal
  'tiktok-legal': 'tiktok-legal',
  'tiktok_legal': 'tiktok-legal',
  'advogado-tiktok': 'tiktok-legal',

  // Audit
  'audit': 'audit',
  'compliance-audit': 'audit',
  'auditoria': 'audit'
};

/**
 * Resolves canonical tool ID and friendly label from known registry or aliases.
 * Never creates arbitrary unmapped autonomous tool IDs.
 */
export function resolveTool(toolId: string): ToolRegistryItem {
  if (!toolId || typeof toolId !== 'string' || !toolId.trim()) {
    return TOOL_REGISTRY['unknown_tool'];
  }

  const raw = toolId.trim();
  if (TOOL_REGISTRY[raw]) {
    return TOOL_REGISTRY[raw];
  }

  const normalized = raw.toLowerCase().replace(/[_\s]+/g, '-');
  if (TOOL_REGISTRY[normalized]) {
    return TOOL_REGISTRY[normalized];
  }

  const rawLower = raw.toLowerCase().trim();
  if (KNOWN_TOOL_ALIASES[rawLower] && TOOL_REGISTRY[KNOWN_TOOL_ALIASES[rawLower]]) {
    return TOOL_REGISTRY[KNOWN_TOOL_ALIASES[rawLower]];
  }

  if (KNOWN_TOOL_ALIASES[normalized] && TOOL_REGISTRY[KNOWN_TOOL_ALIASES[normalized]]) {
    return TOOL_REGISTRY[KNOWN_TOOL_ALIASES[normalized]];
  }

  // Check alias substring matching safely
  for (const [aliasKey, targetKey] of Object.entries(KNOWN_TOOL_ALIASES)) {
    if (rawLower === aliasKey || rawLower.includes(aliasKey)) {
      if (TOOL_REGISTRY[targetKey]) {
        return TOOL_REGISTRY[targetKey];
      }
    }
  }

  // If unmapped, log technical warning and fallback to canonical 'unknown_tool'
  if (process.env.NODE_ENV !== 'production') {
    console.warn(`[UsageTelemetryService] Unrecognized toolId identifier: "${toolId}". Attributing to 'unknown_tool'.`);
  }

  return TOOL_REGISTRY['unknown_tool'];
}

// ==========================================
// 2. SESSION & USER ID MANAGEMENT
// ==========================================

const SESSION_STORAGE_KEY = 'creator_session_id';

/**
 * Returns or initializes a unique session ID stored in sessionStorage.
 */
export function getOrCreateSessionId(): string {
  if (typeof window === 'undefined' || !window.sessionStorage) {
    return `sess_static_${Date.now()}`;
  }

  try {
    let sessionId = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!sessionId) {
      sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
    }
    return sessionId;
  } catch {
    return `sess_fallback_${Date.now()}`;
  }
}

/**
 * Returns the current authenticated user's internal UID without exposing private identifiers.
 */
export function getSanitizedUserId(): string | undefined {
  try {
    const currentUid = auth.currentUser?.uid;
    if (currentUid && typeof currentUid === 'string' && currentUid.trim()) {
      return currentUid.trim();
    }
  } catch {
    // Non-blocking
  }
  return undefined;
}

// ==========================================
// 3. PRIVACY & METADATA SANITIZATION
// ==========================================

const DISALLOWED_METADATA_KEYS = /prompt|copy|imagem|image|img|base64|key|token|auth|secret|pass|credential|script|text|body|input|output|response|content|email|phone|usuario|user_name/i;

/**
 * Strictly sanitizes metadata to prevent any prompt, image, key, or sensitive payload leak.
 */
export function sanitizeMetadata(
  rawMeta?: Record<string, any>
): Record<string, string | number | boolean | null> | undefined {
  if (!rawMeta || typeof rawMeta !== 'object') {
    return undefined;
  }

  const clean: Record<string, string | number | boolean | null> = {};
  for (const [key, val] of Object.entries(rawMeta)) {
    // Drop sensitive key names
    if (DISALLOWED_METADATA_KEYS.test(key)) {
      continue;
    }

    // Only allow scalar types
    if (typeof val === 'number' || typeof val === 'boolean' || val === null) {
      clean[key] = val;
    } else if (typeof val === 'string') {
      // Drop strings that look like base64, data urls, long paragraphs, or secrets
      if (val.startsWith('data:') || val.length > 120 || val.includes('\n')) {
        continue;
      }
      clean[key] = val;
    }
  }

  return Object.keys(clean).length > 0 ? clean : undefined;
}

// ==========================================
// 4. ERROR CLASSIFICATION
// ==========================================

export function mapErrorToTelemetryStatus(error: any): { status: TelemetryRequestStatus; errorCode: string } {
  if (isAbortError(error) || error instanceof GeminiRequestAbortedError) {
    return { status: 'ABORTED', errorCode: 'REQUEST_ABORTED' };
  }

  if (isTimeoutError(error) || error instanceof GeminiRequestTimeoutError) {
    return { status: 'TIMEOUT', errorCode: 'REQUEST_TIMEOUT' };
  }

  const errMsg = (error?.message || String(error || '')).toLowerCase();
  const status = error?.status || (error instanceof WorkerRequestError ? error.status : undefined);
  const errorObjCode = error?.code || error?.errorCode;

  if (status === 429 || errMsg.includes('quota') || errMsg.includes('rate limit') || errMsg.includes('resource-exhausted') || errMsg.includes('cota')) {
    return { status: 'ERROR', errorCode: 'BILLING_CAP_EXCEEDED' };
  }

  if (status === 401 || status === 403 || errMsg.includes('unauthorized') || errMsg.includes('token inválido')) {
    return { status: 'ERROR', errorCode: 'AUTH_FAILED' };
  }

  if (status === 0 || errMsg.includes('failed to fetch') || errMsg.includes('network') || errMsg.includes('conexão') || errMsg.includes('cors')) {
    return { status: 'ERROR', errorCode: 'NETWORK_ERROR' };
  }

  if (status === 400 || status === 413 || errMsg.includes('invalid') || errMsg.includes('payload')) {
    return { status: 'ERROR', errorCode: 'INVALID_RESPONSE' };
  }

  if (errMsg.includes('json') || errMsg.includes('parse') || errMsg.includes('syntaxerror')) {
    return { status: 'ERROR', errorCode: 'PARSER_ERROR' };
  }

  if (errMsg.includes('contract') || errMsg.includes('validation') || errMsg.includes('incompleto')) {
    return { status: 'ERROR', errorCode: 'VALIDATION_ERROR' };
  }

  if (typeof errorObjCode === 'string' && errorObjCode.trim()) {
    return { status: 'ERROR', errorCode: errorObjCode.trim() };
  }

  return { status: 'ERROR', errorCode: 'UNKNOWN_ERROR' };
}

// ==========================================
// 5. PRICING & COST ESTIMATION STUB
// ==========================================

export interface EstimatedAiCost {
  estimatedCostUsd?: number;
  estimatedCostBrl?: number;
}

/**
 * Standard cost estimator stub for future analytics (Stage 3).
 * Leaves values undefined if token usage was not provided by the API.
 */
export function estimateAiCost(
  model?: string,
  inputTokens?: number,
  outputTokens?: number
): EstimatedAiCost {
  if (typeof inputTokens !== 'number' || typeof outputTokens !== 'number') {
    return { estimatedCostUsd: undefined, estimatedCostBrl: undefined };
  }

  // Baseline reference rates for Gemini Flash per million tokens (USD)
  // Gemini 2.0 / 1.5 Flash: ~$0.10 / 1M input, ~$0.40 / 1M output
  const normalizedModel = (model || '').toLowerCase();
  let rateInputPerM = 0.10;
  let rateOutputPerM = 0.40;

  if (normalizedModel.includes('pro')) {
    rateInputPerM = 1.25;
    rateOutputPerM = 5.00;
  }

  const costUsd = (inputTokens / 1_000_000) * rateInputPerM + (outputTokens / 1_000_000) * rateOutputPerM;
  const costBrl = costUsd * 5.60; // Estimated exchange rate

  return {
    estimatedCostUsd: Math.round(costUsd * 1_000_000) / 1_000_000,
    estimatedCostBrl: Math.round(costBrl * 1_000_000) / 1_000_000
  };
}

// ==========================================
// 6. DEFAULT TELEMETRY STORAGE ADAPTER
// ==========================================

const LOCAL_STORAGE_EVENTS_KEY = 'creator_usage_telemetry_events';
const MAX_LOCAL_EVENTS = 200;
const MAX_MEMORY_EVENTS = 500;

export class LocalTelemetryStorageAdapter implements TelemetryStorageAdapter {
  private inMemoryEvents: UsageTelemetryEvent[] = [];

  constructor() {
    this.hydrateFromLocalStorage();
  }

  private hydrateFromLocalStorage(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_EVENTS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.inMemoryEvents = parsed.slice(-MAX_LOCAL_EVENTS);
        }
      }
    } catch {
      // Non-blocking
    }
  }

  private persistToLocalStorage(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const snapshot = this.inMemoryEvents.slice(-MAX_LOCAL_EVENTS);
      localStorage.setItem(LOCAL_STORAGE_EVENTS_KEY, JSON.stringify(snapshot));
    } catch {
      // Non-blocking
    }
  }

  async saveEvent(event: UsageTelemetryEvent): Promise<void> {
    try {
      this.inMemoryEvents.push(event);
      if (this.inMemoryEvents.length > MAX_MEMORY_EVENTS) {
        this.inMemoryEvents = this.inMemoryEvents.slice(-MAX_MEMORY_EVENTS);
      }
      this.persistToLocalStorage();
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[UsageTelemetryStorage] Failed to save telemetry event locally:', err);
      }
    }
  }

  async getEvents(query?: {
    limit?: number;
    toolId?: string;
    eventType?: TelemetryEventType;
    startTime?: number;
    endTime?: number;
  }): Promise<UsageTelemetryEvent[]> {
    let result = [...this.inMemoryEvents];

    if (query?.toolId) {
      result = result.filter(e => e.toolId === query.toolId);
    }
    if (query?.eventType) {
      result = result.filter(e => e.eventType === query.eventType);
    }
    if (query?.startTime) {
      result = result.filter(e => e.timestamp >= query.startTime!);
    }
    if (query?.endTime) {
      result = result.filter(e => e.timestamp <= query.endTime!);
    }

    if (query?.limit && query.limit > 0) {
      result = result.slice(-query.limit);
    }

    return result;
  }

  async clearEvents(): Promise<void> {
    this.inMemoryEvents = [];
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.removeItem(LOCAL_STORAGE_EVENTS_KEY);
      } catch {
        // Non-blocking
      }
    }
  }
}

// ==========================================
// 7. USAGE TELEMETRY SERVICE
// ==========================================

export class UsageTelemetryService {
  private static instance: UsageTelemetryService;
  private storageAdapter: TelemetryStorageAdapter;

  // Deduplication states
  private lastToolOpen: { toolId: string; timestamp: number } | null = null;
  private activeAiRequests: Map<string, { startTime: number; toolId: string; model?: string; provider?: string }> = new Map();

  constructor(adapter?: TelemetryStorageAdapter) {
    this.storageAdapter = adapter || new LocalTelemetryStorageAdapter();
  }

  public static getInstance(): UsageTelemetryService {
    if (!UsageTelemetryService.instance) {
      UsageTelemetryService.instance = new UsageTelemetryService();
    }
    return UsageTelemetryService.instance;
  }

  /**
   * Sets a custom storage adapter (e.g. for Firestore synchronization in Stage 3).
   */
  public setStorageAdapter(adapter: TelemetryStorageAdapter): void {
    this.storageAdapter = adapter;
  }

  /**
   * Core internal event dispatch method.
   */
  public async trackTelemetryEvent(
    event: Partial<UsageTelemetryEvent> & { eventType: TelemetryEventType; toolId: string }
  ): Promise<void> {
    try {
      const toolInfo = resolveTool(event.toolId);
      const timestamp = event.timestamp || Date.now();
      const sessionId = event.sessionId || getOrCreateSessionId();
      const userId = event.userId || getSanitizedUserId();
      const id = event.id || `evt_${timestamp}_${Math.random().toString(36).substring(2, 8)}`;

      const sanitizedMeta = sanitizeMetadata(event.metadata);

      const canonicalEvent: UsageTelemetryEvent = {
        id,
        userId,
        sessionId,
        toolId: toolInfo.id,
        toolName: toolInfo.label,
        eventType: event.eventType,
        timestamp,
        ...(event.ai ? { ai: event.ai } : {}),
        ...(sanitizedMeta ? { metadata: sanitizedMeta } : {})
      };

      await this.storageAdapter.saveEvent(canonicalEvent);

      if (process.env.NODE_ENV !== 'production') {
        console.debug('[Telemetry]', canonicalEvent.eventType, canonicalEvent.toolId, canonicalEvent.ai?.status || '');
      }
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[UsageTelemetryService] Error tracking telemetry event:', err);
      }
      // Non-blocking: never rethrow
    }
  }

  /**
   * Records a user opening or navigating to a tool.
   * Includes deduplication guard for rapid re-renders / StrictMode.
   */
  public trackToolOpen(toolId: string, metadata?: Record<string, any>): void {
    try {
      const now = Date.now();
      if (this.lastToolOpen && this.lastToolOpen.toolId === toolId && (now - this.lastToolOpen.timestamp) < 800) {
        // Suppress duplicate re-render trigger
        return;
      }
      this.lastToolOpen = { toolId, timestamp: now };

      this.trackTelemetryEvent({
        eventType: 'TOOL_OPEN',
        toolId,
        metadata
      });
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[UsageTelemetryService] trackToolOpen warning:', err);
      }
    }
  }

  /**
   * Records the start of an AI generation request with a unique requestId.
   */
  public trackGenerationStarted(params: {
    requestId: string;
    toolId?: string;
    model?: string;
    provider?: string;
    metadata?: Record<string, any>;
  }): void {
    try {
      const { requestId, toolId = 'create', model = 'gemini-3.5-flash', provider = 'google_gemini', metadata } = params;
      const now = performance.now();

      this.activeAiRequests.set(requestId, {
        startTime: now,
        toolId,
        model,
        provider
      });

      this.trackTelemetryEvent({
        id: `gen_start_${requestId}`,
        eventType: 'GENERATION_STARTED',
        toolId,
        ai: {
          provider,
          model,
          status: undefined
        },
        metadata: {
          requestId,
          ...metadata
        }
      });
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[UsageTelemetryService] trackGenerationStarted warning:', err);
      }
    }
  }

  /**
   * Records a successful AI generation response with latency, model, and token metrics.
   */
  public trackGenerationSuccess(params: {
    requestId: string;
    toolId?: string;
    model?: string;
    provider?: string;
    latencyMs?: number;
    inputTokens?: number;
    outputTokens?: number;
    thinkingTokens?: number;
    totalTokens?: number;
    tokenReconciliation?: TokenReconciliationStatus;
    metadata?: Record<string, any>;
  }): void {
    try {
      const { requestId, metadata } = params;
      const cached = this.activeAiRequests.get(requestId);
      if (cached) {
        this.activeAiRequests.delete(requestId);
      }

      const toolId = params.toolId || cached?.toolId || 'create';
      const model = params.model || cached?.model || 'gemini-3.5-flash';
      const provider = params.provider || cached?.provider || 'google_gemini';

      let latencyMs = params.latencyMs;
      if (latencyMs === undefined && cached?.startTime) {
        latencyMs = Math.round(performance.now() - cached.startTime);
      }

      const inputTokens = params.inputTokens;
      const outputTokens = params.outputTokens;
      const thinkingTokens = params.thinkingTokens;
      const totalTokens = params.totalTokens !== undefined
        ? params.totalTokens
        : (typeof inputTokens === 'number' && typeof outputTokens === 'number'
            ? inputTokens + outputTokens + (thinkingTokens || 0)
            : undefined);

      let tokenReconciliation = params.tokenReconciliation;
      if (!tokenReconciliation && typeof totalTokens === 'number') {
        const knownSum = (inputTokens || 0) + (outputTokens || 0) + (thinkingTokens || 0);
        if (inputTokens !== undefined && outputTokens !== undefined) {
          if (knownSum === totalTokens) {
            tokenReconciliation = 'EXACT';
          } else if (knownSum < totalTokens) {
            tokenReconciliation = 'PARTIAL';
          } else {
            tokenReconciliation = 'MISMATCH';
          }
        } else {
          tokenReconciliation = 'PARTIAL';
        }
      }

      const costs = estimateAiCost(model, inputTokens, outputTokens);

      const aiMeta: UsageTelemetryAiMeta = {
        provider,
        model,
        inputTokens,
        outputTokens,
        thinkingTokens,
        totalTokens,
        tokenReconciliation: tokenReconciliation || 'NONE',
        latencyMs,
        estimatedCostUsd: costs.estimatedCostUsd,
        estimatedCostBrl: costs.estimatedCostBrl,
        status: 'SUCCESS'
      };

      this.trackTelemetryEvent({
        id: `gen_ok_${requestId}`,
        eventType: 'GENERATION_SUCCESS',
        toolId,
        ai: aiMeta,
        metadata: {
          requestId,
          ...metadata
        }
      });
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[UsageTelemetryService] trackGenerationSuccess warning:', err);
      }
    }
  }

  /**
   * Records a failed, aborted, or timed-out AI generation request.
   */
  public trackGenerationError(params: {
    requestId: string;
    toolId?: string;
    model?: string;
    provider?: string;
    latencyMs?: number;
    error?: any;
    errorCode?: string;
    metadata?: Record<string, any>;
  }): void {
    try {
      const { requestId, error, metadata } = params;
      const cached = this.activeAiRequests.get(requestId);
      if (cached) {
        this.activeAiRequests.delete(requestId);
      }

      const toolId = params.toolId || cached?.toolId || 'create';
      const model = params.model || cached?.model || 'gemini-3.5-flash';
      const provider = params.provider || cached?.provider || 'google_gemini';

      let latencyMs = params.latencyMs;
      if (latencyMs === undefined && cached?.startTime) {
        latencyMs = Math.round(performance.now() - cached.startTime);
      }

      const { status, errorCode } = mapErrorToTelemetryStatus(error);
      const finalErrorCode = params.errorCode || errorCode;

      const aiMeta: UsageTelemetryAiMeta = {
        provider,
        model,
        latencyMs,
        status,
        errorCode: finalErrorCode
      };

      this.trackTelemetryEvent({
        id: `gen_err_${requestId}`,
        eventType: 'GENERATION_ERROR',
        toolId,
        ai: aiMeta,
        metadata: {
          requestId,
          ...metadata
        }
      });
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[UsageTelemetryService] trackGenerationError warning:', err);
      }
    }
  }

  /**
   * Records an image analysis event.
   */
  public trackImageAnalysis(params: {
    toolId?: string;
    latencyMs?: number;
    status: TelemetryRequestStatus;
    metadata?: Record<string, any>;
  }): void {
    try {
      this.trackTelemetryEvent({
        eventType: 'IMAGE_ANALYSIS',
        toolId: params.toolId || 'create',
        ai: {
          status: params.status,
          latencyMs: params.latencyMs
        },
        metadata: params.metadata
      });
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[UsageTelemetryService] trackImageAnalysis warning:', err);
      }
    }
  }

  /**
   * Records an export event (e.g. PDF, JSON, ZIP, CSV).
   */
  public trackExport(params: {
    toolId?: string;
    exportFormat: string;
    metadata?: Record<string, any>;
  }): void {
    try {
      this.trackTelemetryEvent({
        eventType: 'EXPORT',
        toolId: params.toolId || 'dashboard',
        metadata: {
          exportFormat: params.exportFormat,
          ...params.metadata
        }
      });
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[UsageTelemetryService] trackExport warning:', err);
      }
    }
  }

  /**
   * Records copying a generation or copy result to clipboard.
   */
  public trackCopyResult(params: {
    toolId?: string;
    target?: string;
    metadata?: Record<string, any>;
  }): void {
    try {
      this.trackTelemetryEvent({
        eventType: 'COPY_RESULT_TO_CLIPBOARD',
        toolId: params.toolId || 'create',
        metadata: {
          target: params.target || 'copy',
          ...params.metadata
        }
      });
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[UsageTelemetryService] trackCopyResult warning:', err);
      }
    }
  }

  /**
   * Returns recorded events from the current storage adapter.
   */
  public async getEvents(query?: {
    limit?: number;
    toolId?: string;
    eventType?: TelemetryEventType;
    startTime?: number;
    endTime?: number;
  }): Promise<UsageTelemetryEvent[]> {
    try {
      return await this.storageAdapter.getEvents(query);
    } catch {
      return [];
    }
  }
}

// Global Singleton Export
export const usageTelemetry = UsageTelemetryService.getInstance();
