/**
 * Session Persistence and Restore Engine for Creative Director AI.
 * Follows the non-blocking, quota-safe storage pattern from Agente de Copy and Engenharia Reversa.
 */

export const CREATIVE_DIRECTOR_SESSION_KEY = 'creator_pro_creative_director_session_v1';

export interface CreativeDirectorFinalPromptStructureSnapshot {
  compiledText?: string;
  negativePrompt?: string;
  promptSections?: Array<{
    id: string;
    title?: string;
    content?: string;
    order?: number;
  }>;
  sceneBlocks?: Array<{
    sceneId: string;
    sceneTitle?: string;
    compiledPrompt?: string;
    technicalSpecs?: string;
    spokenText?: string;
    onScreenText?: string;
    negativePrompt?: string;
  }>;
  slotsJson?: unknown;
  guaranteesState?: unknown;
  modelStructureSource?: string;
  activeOutputTab?: string;
  activePromptView?: 'prompt' | 'json';
  activeObjectLock?: string;
  manualCorrections?: Record<string, unknown>;
  campaignBuilderOutput?: unknown;
  debugMetrics?: Record<string, unknown>;
  generatedAt?: number;
  updatedAt?: number;
}

export interface CreativeDirectorScene2CompilerSnapshot {
  compiledPrompt?: string;
  compiledJson?: unknown;
  compiledJsonString?: string;
  groundingFactual?: unknown;
  copyBrainC2?: unknown;
  sceneBrainC2?: unknown;
  slotsJson?: unknown;
  guaranteesP0?: unknown;
  activeOutputTab?: string;
  activePromptView?: 'prompt' | 'json';
  characterCount?: number;
  status?: 'idle' | 'compiled' | 'error';
  compiledAt?: number;
  metadata?: Record<string, unknown>;
  pipelineResult?: any;
}

export interface CreativeDirectorScene3CompilerSnapshot {
  compiledPrompt?: string;
  finalPrompt?: string;
  compiledJson?: unknown;
  compiledJsonString?: string;
  spokenCta?: string;
  brainResult?: unknown;
  dynamicSlots?: unknown;
  diagnosticTrace?: unknown;
  activeOutputTab?: string;
  characterCount?: number;
  status?: 'idle' | 'compiled' | 'error';
  compiledAt?: number;
  metadata?: Record<string, unknown>;
  generationResult?: any;
}

export interface CreativeDirectorSavedSession {
  schemaVersion: 1;
  savedAt: number;
  mainTab?: 'director' | 'campaign_builder' | 'campaign' | 'scene2_compiler' | 'scene3_compiler' | 'shopee_scenes';

  // Director Mode Fields
  productName?: string;
  category?: string;
  productCategory?: string;
  platform?: string;
  objective?: string;
  visualStyle?: string;
  ctaStyle?: string;
  voiceStyle?: string;
  duration?: string;
  format?: string;
  extraInstructions?: string;
  productImage?: string | null;
  scenarioImage?: string | null;
  avatarImage?: string | null;
  refVideo?: string | null;
  refImage?: string | null;
  result?: any;
  activeTab?: string;
  modelStructureSource?: string;
  aiAnalysis?: any;
  creativeMode?: string;
  directorMode?: string;
  characters?: any[];
  hookStyle?: string;
  emotionalTrigger?: string;
  audienceType?: string;
  presenterStyle?: string;
  cameraStyle?: string;
  energyLevel?: number;
  optimizationLevel?: string;
  viralFramework?: string;

  // Object Lock Fields
  objectLockEnabled?: boolean;
  objectLockLevel?: string;
  olBrand?: string;
  olProductName?: string;
  olPrimaryColor?: string;
  olSecondaryColor?: string;
  olMaterial?: string;
  olShape?: string;
  olLogoDescription?: string;
  olUniqueFeatures?: string;
  olVisualIdentity?: string;
  olFrontView?: string;
  olSideView?: string;
  olBackView?: string;
  olTopView?: string;
  olColorsFinish?: string;
  olMaterials?: string;
  olLogosText?: string;
  olPackaging?: string;
  olDoNotChange?: string;
  olAllowedMotion?: string;
  activeObjectLock?: any;
  detectedProductData?: any;
  amberWarning?: string | null;
  workerInfo?: any;
  debugData?: any;

  // Campaign Builder Fields
  cbProductImages?: string[];
  cbProductName?: string;
  cbProductCategory?: string;
  cbMainBenefit?: string;
  cbMainPainSolved?: string;
  cbPriceRange?: string;
  cbUniqueDifferentiator?: string;
  cbAvatarImage?: string | null;
  cbCreatorGender?: string;
  cbCreatorAgeStyle?: string;
  cbCreatorPersona?: string;
  cbSpeakingEnergy?: number;
  cbSpeakingPace?: string;
  cbScenarioImage?: string | null;
  cbScenarioDescription?: string;
  cbBackgroundStrategy?: string;
  cbRefVideo?: string | null;
  cbSocialProofImages?: string[];
  cbPlatform?: string;
  cbNumScenes?: number;
  cbSecondsPerScene?: string;
  cbCampaignStyle?: string;
  cbRemodelingIntensity?: number;
  cbProductLock?: boolean;
  cbResult?: any;
  cbActiveOutputTab?: string;

  // Consolidated Product Workspace & Scene 3 CTA Handoff
  productWorkspace?: any;
  scene3CtaHandoff?: any;

  // Final Prompt Structure Snapshot
  finalPromptStructure?: CreativeDirectorFinalPromptStructureSnapshot;

  // Scene 2 Compiler Output Snapshot (Phase 1.2 / 2.4 Restore)
  scene2CompilerSnapshot?: CreativeDirectorScene2CompilerSnapshot;

  // Scene 3 Compiler Output Snapshot (Conditional Output Restore)
  scene3CompilerSnapshot?: CreativeDirectorScene3CompilerSnapshot;

  // Shopee Scene Hub Output Snapshot
  shopeeSceneHubSnapshot?: any;
}

/**
 * Checks if a Scene 2 compiler snapshot contains real, valid compiled output.
 * Rejects empty objects, tab-only objects, and status-only objects.
 */
export function hasValidScene2CompiledOutput(snapshot?: unknown): boolean {
  if (!snapshot || typeof snapshot !== 'object') {
    return false;
  }

  const s = snapshot as Record<string, unknown>;

  // Check direct compiled prompt string
  if (typeof s.compiledPrompt === 'string' && s.compiledPrompt.trim().length > 0) {
    return true;
  }

  // Check compiled json string
  if (typeof s.compiledJsonString === 'string' && s.compiledJsonString.trim().length > 0) {
    return true;
  }

  // Check structured JSON object (must have keys)
  if (s.compiledJson && typeof s.compiledJson === 'object' && Object.keys(s.compiledJson).length > 0) {
    return true;
  }

  // Check nested pipelineResult if present
  if (s.pipelineResult && typeof s.pipelineResult === 'object') {
    const pr = s.pipelineResult as Record<string, unknown>;
    if (typeof pr.compiledPrompt === 'string' && pr.compiledPrompt.trim().length > 0) {
      return true;
    }
    if (typeof pr.compiledJsonString === 'string' && pr.compiledJsonString.trim().length > 0) {
      return true;
    }
    if (pr.compiledJson && typeof pr.compiledJson === 'object' && Object.keys(pr.compiledJson).length > 0) {
      return true;
    }
  }

  return false;
}

/**
 * Checks if a Scene 3 compiler snapshot contains real, valid compiled output.
 * Rejects empty objects, CTA-only data, tab-only objects, and status-only objects.
 */
export function hasValidScene3CompiledOutput(snapshot?: unknown): boolean {
  if (!snapshot || typeof snapshot !== 'object') {
    return false;
  }

  const s = snapshot as Record<string, unknown>;

  // Check direct compiled / final prompt string
  if (typeof s.compiledPrompt === 'string' && s.compiledPrompt.trim().length > 0) {
    return true;
  }
  if (typeof s.finalPrompt === 'string' && s.finalPrompt.trim().length > 0) {
    return true;
  }

  // Check compiled json string
  if (typeof s.compiledJsonString === 'string' && s.compiledJsonString.trim().length > 0) {
    return true;
  }

  // Check compiled json object (must have keys)
  if (s.compiledJson && typeof s.compiledJson === 'object' && Object.keys(s.compiledJson).length > 0) {
    return true;
  }

  // Check nested generationResult if present
  if (s.generationResult && typeof s.generationResult === 'object') {
    const gr = s.generationResult as Record<string, unknown>;
    if (typeof gr.finalPrompt === 'string' && gr.finalPrompt.trim().length > 0) {
      return true;
    }
    if (typeof gr.compiledJsonString === 'string' && gr.compiledJsonString.trim().length > 0) {
      return true;
    }
    if (gr.dynamicSlots && typeof gr.dynamicSlots === 'object' && Object.keys(gr.dynamicSlots).length > 0) {
      return true;
    }
  }

  // Note: CTA data alone (e.g. s.spokenCta), activeOutputTab alone, or status alone is NOT compiled output!
  return false;
}

/**
 * Checks if a final prompt structure snapshot contains real, valid generated output.
 * Rejects empty objects, tab-only objects, and metadata-only objects.
 */
export function hasValidFinalPromptOutput(snapshot?: unknown): boolean {
  if (!snapshot || typeof snapshot !== 'object') {
    return false;
  }

  const s = snapshot as Record<string, unknown>;

  if (typeof s.compiledText === 'string' && s.compiledText.trim().length > 0) {
    return true;
  }

  if (Array.isArray(s.sceneBlocks) && s.sceneBlocks.length > 0) {
    return true;
  }

  if (Array.isArray(s.promptSections) && s.promptSections.length > 0) {
    return true;
  }

  if (s.campaignBuilderOutput && typeof s.campaignBuilderOutput === 'object' && Object.keys(s.campaignBuilderOutput).length > 0) {
    return true;
  }

  if (s.slotsJson && typeof s.slotsJson === 'object' && Object.keys(s.slotsJson).length > 0) {
    return true;
  }

  return false;
}

/**
 * Validates whether an unknown object conforms to the CreativeDirectorSavedSession contract.
 * Allows 'finalPromptStructure', 'scene2CompilerSnapshot', and 'scene3CompilerSnapshot' as optional snapshot fields while ensuring legacy sessions
 * without this structure remain valid and successfully restore.
 */
export function isValidCreativeDirectorSession(value: unknown): value is CreativeDirectorSavedSession {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  if (candidate.schemaVersion !== 1) {
    return false;
  }

  if (typeof candidate.savedAt !== 'number' || candidate.savedAt <= 0) {
    return false;
  }

  // Optional: finalPromptStructure if present must be an object
  if (candidate.finalPromptStructure !== undefined && candidate.finalPromptStructure !== null) {
    if (typeof candidate.finalPromptStructure !== 'object') {
      return false;
    }
  }

  // Optional: scene2CompilerSnapshot if present must be an object
  if (candidate.scene2CompilerSnapshot !== undefined && candidate.scene2CompilerSnapshot !== null) {
    if (typeof candidate.scene2CompilerSnapshot !== 'object') {
      return false;
    }
  }

  // Optional: scene3CompilerSnapshot if present must be an object
  if (candidate.scene3CompilerSnapshot !== undefined && candidate.scene3CompilerSnapshot !== null) {
    if (typeof candidate.scene3CompilerSnapshot !== 'object') {
      return false;
    }
  }

  // Legacy sessions without snapshots are valid as long as schemaVersion and savedAt match
  return true;
}

/**
 * Checks if a saved session has meaningful work to offer restoration.
 */
export function shouldOfferCreativeDirectorRestore(session: CreativeDirectorSavedSession): boolean {
  if (!isValidCreativeDirectorSession(session)) {
    return false;
  }

  const hasDirectorData = Boolean(
    (session.productName && session.productName.trim().length > 0) ||
    (session.extraInstructions && session.extraInstructions.trim().length > 0) ||
    session.result ||
    session.aiAnalysis ||
    (Array.isArray(session.characters) && session.characters.length > 0)
  );

  const hasCampaignBuilderData = Boolean(
    (session.cbProductName && session.cbProductName.trim().length > 0) ||
    (session.cbMainBenefit && session.cbMainBenefit.trim().length > 0) ||
    session.cbResult
  );

  const hasWorkspaceData = Boolean(
    session.productWorkspace?.productIdentity ||
    session.productWorkspace?.productDescription ||
    session.scene3CtaHandoff
  );

  const hasFinalPromptStructure = hasValidFinalPromptOutput(session.finalPromptStructure);

  const hasScene2CompilerData = hasValidScene2CompiledOutput(session.scene2CompilerSnapshot);

  const hasScene3CompilerData = hasValidScene3CompiledOutput(session.scene3CompilerSnapshot);

  return hasDirectorData || hasCampaignBuilderData || hasWorkspaceData || hasFinalPromptStructure || hasScene2CompilerData || hasScene3CompilerData;
}

/**
 * Saves the current creative director session to localStorage with quota-safe fallback.
 */
export function saveCreativeDirectorSession(session: CreativeDirectorSavedSession): boolean {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }

  try {
    const sessionToSave: CreativeDirectorSavedSession = {
      ...session,
      schemaVersion: 1,
      savedAt: Date.now()
    };

    try {
      localStorage.setItem(CREATIVE_DIRECTOR_SESSION_KEY, JSON.stringify(sessionToSave));
      return true;
    } catch (writeErr) {
      // QuotaExceededError or write failure - retry with stripped large base64 images
      // NOTE: finalPromptStructure, compiled text, scene blocks, slots JSON, and manual corrections must ALWAYS be preserved
      const fallbackSession: CreativeDirectorSavedSession = {
        ...sessionToSave,
        productImage: undefined,
        scenarioImage: undefined,
        avatarImage: undefined,
        refImage: undefined,
        refVideo: undefined,
        cbProductImages: undefined,
        cbAvatarImage: undefined,
        cbScenarioImage: undefined,
        cbRefVideo: undefined,
        cbSocialProofImages: undefined,
        productWorkspace: sessionToSave.productWorkspace ? {
          ...sessionToSave.productWorkspace,
          productImagePreview: undefined
        } : undefined,
        finalPromptStructure: sessionToSave.finalPromptStructure,
        scene2CompilerSnapshot: sessionToSave.scene2CompilerSnapshot,
        scene3CompilerSnapshot: sessionToSave.scene3CompilerSnapshot
      };

      try {
        localStorage.setItem(CREATIVE_DIRECTOR_SESSION_KEY, JSON.stringify(fallbackSession));
        return true;
      } catch {
        return false;
      }
    }
  } catch (err) {
    console.warn('[CreativeDirectorSessionStorage] Unexpected save error:', err);
    return false;
  }
}

/**
 * Loads and validates a saved creative director session from localStorage.
 */
export function loadCreativeDirectorSession(): CreativeDirectorSavedSession | null {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }

  try {
    const raw = localStorage.getItem(CREATIVE_DIRECTOR_SESSION_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (isValidCreativeDirectorSession(parsed)) {
      return parsed;
    }

    return null;
  } catch (err) {
    console.warn('[CreativeDirectorSessionStorage] Failed to load/parse saved session:', err);
    return null;
  }
}

/**
 * Clears the saved creative director session from localStorage.
 */
export function clearCreativeDirectorSession(): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  try {
    localStorage.removeItem(CREATIVE_DIRECTOR_SESSION_KEY);
  } catch (err) {
    console.warn('[CreativeDirectorSessionStorage] Failed to clear session:', err);
  }
}
