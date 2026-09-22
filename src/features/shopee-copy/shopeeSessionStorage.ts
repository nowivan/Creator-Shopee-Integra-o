/**
 * SHOPEE COPY SESSION STORAGE — ISOLATED PERSISTENCE ENGINE
 * 
 * Rules:
 * 1. Strictly isolated key: 'creator_pro_shopee_copy_session_v1'.
 * 2. Does NOT reuse 'creator_pro_copy_agent_suite_clean_session_v1'.
 * 3. Does NOT write legacy 'robizin_*' keys.
 * 4. Quota-safe save with automatic fallback (stripping heavy image payload if quota exceeded).
 * 5. Validates schema integrity (schemaVersion === 1).
 */

import { safeJSONParse } from '../../utils';
import {
  ShopeeCopySavedSession,
  ShopeeCopyVariation,
  ShopeeCopyStructure,
  ShopeeCopyStyle,
  ShopeeCTAType,
  SHOPEE_SESSION_KEY
} from './types';

export const SHOPEE_COPY_SESSION_KEY = SHOPEE_SESSION_KEY;
export { SHOPEE_SESSION_KEY };

/**
 * Type-guard validating whether an unknown object conforms to ShopeeCopySavedSession.
 */
export function isValidShopeeSession(value: unknown): value is ShopeeCopySavedSession {
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

  if (typeof candidate.productContext !== 'string') {
    return false;
  }

  if (!Array.isArray(candidate.variations)) {
    return false;
  }

  for (const v of candidate.variations) {
    if (!v || typeof v !== 'object') return false;
    const item = v as Record<string, unknown>;
    if (typeof item.id !== 'number') return false;
    if (typeof item.scene2 !== 'string' || typeof item.scene3 !== 'string') return false;
  }

  return true;
}

/**
 * Saves a Shopee copy session to localStorage with quota-safe protection.
 */
export function saveShopeeSession(
  session: Omit<ShopeeCopySavedSession, 'schemaVersion' | 'savedAt'> & Partial<Pick<ShopeeCopySavedSession, 'schemaVersion' | 'savedAt'>>
): boolean {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }

  try {
    const sessionToSave: ShopeeCopySavedSession = {
      ...session,
      schemaVersion: 1,
      savedAt: session.savedAt || Date.now()
    };

    try {
      localStorage.setItem(SHOPEE_SESSION_KEY, JSON.stringify(sessionToSave));
      return true;
    } catch (writeErr) {
      // QuotaExceededError - retry without heavy base64 image preview
      if (sessionToSave.productImagePreview) {
        const fallbackSession: ShopeeCopySavedSession = {
          ...sessionToSave,
          productImagePreview: undefined
        };
        try {
          localStorage.setItem(SHOPEE_SESSION_KEY, JSON.stringify(fallbackSession));
          return true;
        } catch {
          return false;
        }
      }
      return false;
    }
  } catch (err) {
    console.warn('[ShopeeSessionStorage] Unexpected save error:', err);
    return false;
  }
}

/**
 * Loads and validates a saved Shopee copy session from localStorage.
 */
export function loadShopeeSession(): ShopeeCopySavedSession | null {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }

  try {
    const raw = localStorage.getItem(SHOPEE_SESSION_KEY);
    if (!raw) {
      return null;
    }

    const parsed = safeJSONParse(raw, null);
    if (isValidShopeeSession(parsed)) {
      return parsed;
    }

    return null;
  } catch (err) {
    console.warn('[ShopeeSessionStorage] Failed to load/parse saved session:', err);
    return null;
  }
}

/**
 * Clears the saved Shopee copy session from localStorage.
 */
export function clearShopeeSession(): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  try {
    localStorage.removeItem(SHOPEE_SESSION_KEY);
  } catch (err) {
    console.warn('[ShopeeSessionStorage] Failed to clear session:', err);
  }
}

/**
 * Toggles or marks a Shopee variation as used.
 */
export function markShopeeVariationUsed(variationId: number): number[] {
  const current = loadShopeeSession();
  if (!current) return [variationId];

  const currentUsed = current.usedVariationIds || [];
  const nextUsed = currentUsed.includes(variationId)
    ? currentUsed.filter((id) => id !== variationId)
    : [...currentUsed, variationId];

  saveShopeeSession({
    ...current,
    usedVariationIds: nextUsed
  });

  return nextUsed;
}

// Aliases for clear naming conventions
export const loadShopeeCopySession = loadShopeeSession;
export const saveShopeeCopySession = saveShopeeSession;
export const clearShopeeCopySession = clearShopeeSession;

/**
 * Records an explicit user selection of a Shopee variation or scene 3 CTA.
 */
export function recordShopeeSelection(variationId: number, scene3Text?: string): boolean {
  const current = loadShopeeSession();
  if (!current) {
    return false;
  }

  const updatedUsed = Array.from(new Set([...(current.usedVariationIds || []), variationId]));
  const targetVar = current.variations.find(v => v.id === variationId);

  const updatedSession: ShopeeCopySavedSession = {
    ...current,
    selectedVariationId: variationId,
    selectedScene3Copy: scene3Text || targetVar?.scene3 || current.selectedScene3Copy,
    usedVariationIds: updatedUsed,
    savedAt: Date.now()
  };

  return saveShopeeSession(updatedSession);
}

/**
 * Reads the authoritative selection from the Shopee session for downstream handoffs.
 */
export function getShopeeAuthoritativeSelection(): {
  selectedVariationId: number;
  scene3: string;
  savedAt: number;
  productTitle?: string;
  characterCount: number;
} | null {
  const session = loadShopeeSession();
  if (!session || !Array.isArray(session.variations) || session.variations.length === 0) {
    return null;
  }

  // 1. Explicit scene3 copy selection
  if (session.selectedScene3Copy && typeof session.selectedScene3Copy === 'string' && session.selectedScene3Copy.trim().length > 0) {
    const versionId = session.selectedVariationId || 1;
    return {
      selectedVariationId: versionId,
      scene3: session.selectedScene3Copy,
      savedAt: session.savedAt,
      productTitle: session.productContext,
      characterCount: session.selectedScene3Copy.length
    };
  }

  // 2. Selected variation ID lookup
  if (typeof session.selectedVariationId === 'number') {
    const target = session.variations.find(v => v.id === session.selectedVariationId);
    if (target && typeof target.scene3 === 'string' && target.scene3.trim().length > 0) {
      return {
        selectedVariationId: target.id,
        scene3: target.scene3,
        savedAt: session.savedAt,
        productTitle: session.productContext,
        characterCount: target.scene3.length
      };
    }
  }

  // 3. Fallback to the first valid variation in the session
  const firstValid = session.variations.find(v => v.isValid && typeof v.scene3 === 'string' && v.scene3.trim().length > 0) || session.variations[0];
  if (firstValid && typeof firstValid.scene3 === 'string' && firstValid.scene3.trim().length > 0) {
    return {
      selectedVariationId: firstValid.id,
      scene3: firstValid.scene3,
      savedAt: session.savedAt,
      productTitle: session.productContext,
      characterCount: firstValid.scene3.length
    };
  }

  return null;
}
