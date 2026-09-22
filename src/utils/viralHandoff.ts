/**
 * Safe Staged Handoff Utility for Ideador Viral → Creative Director
 * Single-use, client-only, 100% deterministic persistence.
 */

export const VIRAL_HANDOFF_STORAGE_KEY = "creator_pro_viral_idea_handoff";
export const VIRAL_HANDOFF_TTL_MS = 30 * 60 * 1000; // 30 minutes

export interface ViralIdeaPayload {
  version: "1.0";
  source: "ideador_viral";
  sourceHash: string;
  createdAt: number;
  status: "pending";
  niche: string;
  title: string;
  angle: string;
  hook: string;
  sceneConcept: string;
  productUse: string;
  cta: string;
  suggestedVisualPromptEn: string;
  dialoguePtBr: string;
  why: string;
}

export interface RawIdeaInput {
  title?: string;
  angle?: string;
  hook?: string;
  sceneConcept?: string;
  productUse?: string;
  cta?: string;
  suggestedVisualPromptEn?: string;
  dialoguePtBr?: string;
  why?: string;
}

/**
 * Creates a normalized single-use ViralIdeaPayload from an Idea object and current niche.
 */
export function createViralIdeaPayload(idea: RawIdeaInput, niche: string): ViralIdeaPayload {
  const title = (idea.title || "").trim();
  const createdAt = Date.now();
  const sourceHash = `idea_${Math.abs(hashString(title + niche))}_${createdAt}`;

  return {
    version: "1.0",
    source: "ideador_viral",
    sourceHash,
    createdAt,
    status: "pending",
    niche: (niche || "").trim(),
    title,
    angle: (idea.angle || "").trim(),
    hook: (idea.hook || "").trim(),
    sceneConcept: (idea.sceneConcept || "").trim(),
    productUse: (idea.productUse || "").trim(),
    cta: (idea.cta || "").trim(),
    suggestedVisualPromptEn: (idea.suggestedVisualPromptEn || "").trim(),
    dialoguePtBr: (idea.dialoguePtBr || "").trim(),
    why: (idea.why || "").trim(),
  };
}

/**
 * Saves the payload to localStorage.
 */
export function saveViralHandoffPayload(payload: ViralIdeaPayload): void {
  try {
    localStorage.setItem(VIRAL_HANDOFF_STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.error("Failed to save viral handoff payload to localStorage:", err);
  }
}

/**
 * Checks if the payload has exceeded its TTL (30 minutes).
 */
export function isViralHandoffExpired(payload: ViralIdeaPayload): boolean {
  if (!payload || !payload.createdAt) return true;
  return Date.now() - payload.createdAt > VIRAL_HANDOFF_TTL_MS;
}

/**
 * Retrieves the pending payload if valid, non-expired, and in pending status.
 * Automatically purges corrupted or expired payloads.
 */
export function getPendingViralHandoff(): ViralIdeaPayload | null {
  try {
    const raw = localStorage.getItem(VIRAL_HANDOFF_STORAGE_KEY);
    if (!raw) return null;

    const payload = JSON.parse(raw) as ViralIdeaPayload;
    if (!payload || payload.source !== "ideador_viral" || payload.status !== "pending") {
      clearViralHandoff();
      return null;
    }

    if (isViralHandoffExpired(payload)) {
      clearViralHandoff();
      return null;
    }

    return payload;
  } catch (err) {
    clearViralHandoff();
    return null;
  }
}

/**
 * Clears the payload from storage (making it single-use).
 */
export function clearViralHandoff(): void {
  try {
    localStorage.removeItem(VIRAL_HANDOFF_STORAGE_KEY);
  } catch (err) {
    console.error("Failed to clear viral handoff payload:", err);
  }
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash;
}
