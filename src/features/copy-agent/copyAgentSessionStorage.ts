/**
 * Session Persistence and Restore Engine for Agente de Copy — Suite Clean.
 * Follows the non-blocking, quota-safe storage pattern from Engenharia Reversa.
 */

export type CopyAgentSavedMode =
  | 'clean_a'
  | 'clean_b'
  | 'clean_c'
  | 'clean_d'
  | 'clean_d_lab';

export interface CopyAgentSavedVariation {
  id: string;
  text: string;
  mode: CopyAgentSavedMode;
  headline?: string;
  hookType?: string;
  wordCount?: number;
  characterCount?: number;
  isFavorite?: boolean;
  isUsed?: boolean;
  isSelected?: boolean;
  createdAt: number;
}

export interface CopyAgentSavedSession {
  schemaVersion: 1;
  savedAt: number;
  activeMode: CopyAgentSavedMode;
  productContext: string;
  productImagePreview?: string;
  selectedPlatform: string;
  cartGuidance?: string;
  characterContract?: {
    min?: number;
    max?: number;
  };
  variations: CopyAgentSavedVariation[];
  labVariations?: CopyAgentSavedVariation[];
  customNotes?: string;
  cleanResultsByVariant?: Record<string, any>;
  brainVariant?: string;
  reviewerGroundingMode?: string;
  usedVariationIds?: number[];
  activeFilter?: string;
}

export const COPY_AGENT_SESSION_KEY =
  'creator_pro_copy_agent_suite_clean_session_v1';

/**
 * Validates whether an unknown object conforms to the CopyAgentSavedSession contract.
 */
export function isValidCopyAgentSession(value: unknown): value is CopyAgentSavedSession {
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

  const validModes: CopyAgentSavedMode[] = [
    'clean_a',
    'clean_b',
    'clean_c',
    'clean_d',
    'clean_d_lab'
  ];

  if (typeof candidate.activeMode !== 'string' || !validModes.includes(candidate.activeMode as CopyAgentSavedMode)) {
    return false;
  }

  if (typeof candidate.productContext !== 'string' && typeof candidate.productContext !== 'undefined') {
    return false;
  }

  if (!Array.isArray(candidate.variations)) {
    return false;
  }

  for (const item of candidate.variations) {
    if (!item || typeof item !== 'object') return false;
    const v = item as Record<string, unknown>;
    if (typeof v.id !== 'string' && typeof v.id !== 'number') return false;
    if (typeof v.text !== 'string') return false;
    if (typeof v.mode !== 'string' || !validModes.includes(v.mode as CopyAgentSavedMode)) return false;
  }

  if (candidate.labVariations !== undefined) {
    if (!Array.isArray(candidate.labVariations)) return false;
    for (const item of candidate.labVariations) {
      if (!item || typeof item !== 'object') return false;
      const v = item as Record<string, unknown>;
      if (typeof v.id !== 'string' && typeof v.id !== 'number') return false;
      if (typeof v.text !== 'string') return false;
    }
  }

  return true;
}

/**
 * Checks if a saved session has meaningful generated content to offer restoration.
 */
export function shouldOfferCopyAgentRestore(session: CopyAgentSavedSession): boolean {
  if (!isValidCopyAgentSession(session)) {
    return false;
  }

  const hasRegularVariations = Array.isArray(session.variations) &&
    session.variations.some(v => typeof v.text === 'string' && v.text.trim().length > 0);

  const hasLabVariations = Array.isArray(session.labVariations) &&
    session.labVariations.some(v => typeof v.text === 'string' && v.text.trim().length > 0);

  const hasCleanResults = session.cleanResultsByVariant &&
    typeof session.cleanResultsByVariant === 'object' &&
    Object.values(session.cleanResultsByVariant).some(
      (res: any) => res && Array.isArray(res.variations) && res.variations.length > 0
    );

  return Boolean(hasRegularVariations || hasLabVariations || hasCleanResults);
}

/**
 * Saves the current copy agent session to localStorage with quota-safe fallback.
 */
export function saveCopyAgentSession(session: CopyAgentSavedSession): boolean {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }

  try {
    const sessionToSave: CopyAgentSavedSession = {
      ...session,
      savedAt: Date.now()
    };

    // Sanitize variations to guarantee image previews are not duplicated inside each variation
    if (Array.isArray(sessionToSave.variations)) {
      sessionToSave.variations = sessionToSave.variations.map(v => {
        const copy = { ...v };
        delete (copy as any).productImagePreview;
        delete (copy as any).image;
        return copy;
      });
    }

    if (Array.isArray(sessionToSave.labVariations)) {
      sessionToSave.labVariations = sessionToSave.labVariations.map(v => {
        const copy = { ...v };
        delete (copy as any).productImagePreview;
        delete (copy as any).image;
        return copy;
      });
    }

    try {
      localStorage.setItem(COPY_AGENT_SESSION_KEY, JSON.stringify(sessionToSave));
      return true;
    } catch (writeErr) {
      // QuotaExceededError or write failure - retry without image preview
      if (sessionToSave.productImagePreview) {
        const fallbackSession: CopyAgentSavedSession = {
          ...sessionToSave,
          productImagePreview: undefined
        };
        try {
          localStorage.setItem(COPY_AGENT_SESSION_KEY, JSON.stringify(fallbackSession));
          return true;
        } catch {
          return false;
        }
      }
      return false;
    }
  } catch (err) {
    console.warn('[CopyAgentSessionStorage] Unexpected save error:', err);
    return false;
  }
}

/**
 * Loads and validates a saved copy agent session from localStorage.
 */
export function loadCopyAgentSession(): CopyAgentSavedSession | null {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }

  try {
    const raw = localStorage.getItem(COPY_AGENT_SESSION_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (isValidCopyAgentSession(parsed)) {
      return parsed;
    }

    return null;
  } catch (err) {
    console.warn('[CopyAgentSessionStorage] Failed to load/parse saved session:', err);
    return null;
  }
}

/**
 * Clears the saved copy agent session from localStorage.
 */
export function clearCopyAgentSession(): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  try {
    localStorage.removeItem(COPY_AGENT_SESSION_KEY);
  } catch (err) {
    console.warn('[CopyAgentSessionStorage] Failed to clear session:', err);
  }
}
