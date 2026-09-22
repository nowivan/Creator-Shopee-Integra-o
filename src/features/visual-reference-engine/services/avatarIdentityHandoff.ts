/**
 * SHARED AVATAR IDENTITY HANDOFF SERVICE
 * Stage 6: Unified canonical source of truth for Avatar Identity across Creative Director and Cinematic Engine.
 * 
 * Rules:
 * 1. Global Precedence:
 *    AVATAR IDENTITY (AvatarIdentityContext)
 *    > WARDROBE (Scene/Engine configuration)
 *    > POSE / ACTION (Scene Brain / Cinematic plan)
 *    > PRODUCT (Product Reference + ProductStructuralDNA)
 *    > BACKGROUND (Environment / Scene configuration)
 *    > CAMERA (Scene / Cinematic configuration)
 * 2. DEFINED WARDROBE > REFERENCE WARDROBE
 * 3. CURRENT SCENE POSE/ACTION > REFERENCE PHOTO POSE
 * 4. AVATAR IDENTITY LOCK ≠ PRODUCT OBJECT LOCK
 * 5. Prefer cleanedReferenceImage over original referenceImage when available.
 * 6. Zero re-analysis or duplicate Gemini calls across engines.
 */

import {
  AvatarIdentityContext,
  AvatarReferenceProfile,
  IdentityDNA,
  BrandMarkProfile
} from '../types/visualReferenceTypes';
import {
  resolveBrandMarkAuthority,
  isBrandMarkActive
} from './brandMarkAuthority';

/**
 * Homologated shared Avatar Identity Clause.
 * Single source of truth for prompt templates.
 */
export const SHARED_AVATAR_IDENTITY_CLAUSE = `AVATAR IDENTITY REFERENCE

Use the supplied avatar identity reference only to preserve the visible identity-related appearance of the presenter.

Preserve facial appearance, visible facial proportions, hair characteristics, skin characteristics and confirmed distinguishing traits.

Do not inherit pose, wardrobe, jewelry, background, camera framing, objects or lighting from the avatar reference unless explicitly requested by the current scene.`;

export const SHARED_AVATAR_WARDROBE_PRIORITY_RULE = `The wardrobe specified in this prompt has absolute priority over any clothing visible in the avatar reference image (DEFINED WARDROBE > REFERENCE WARDROBE).`;

export const SHARED_AVATAR_POSE_PRIORITY_RULE = `The physical actions and body language specified in this prompt have absolute priority over any pose or gesture in the avatar reference image (CURRENT SCENE POSE/ACTION > REFERENCE PHOTO POSE).`;

export interface AvatarIdentityStatusInfo {
  active: boolean;
  source: 'Identity Hub' | 'Direct Reference' | 'None';
  cleanReference: 'ACTIVE' | 'ORIGINAL' | 'NONE';
  hasIdentityDNA: boolean;
  hasIdentityPrompt: boolean;
  hasBrandMark: boolean;
}

/**
 * Constructs an AvatarIdentityContext from an AvatarReferenceProfile.
 */
export function buildAvatarIdentityContext(
  profile: AvatarReferenceProfile
): AvatarIdentityContext {
  return {
    identityDNA: profile.identityDNA,
    identityPrompt: profile.identityPrompt,
    referenceImage: profile.originalImage || (profile as any).sourceReference?.originalImageUrl,
    cleanedReferenceImage: profile.cleanedImage || (profile as any).sourceReference?.cleanedImageUrl,
    brandMarkProfile: profile.brandMarkProfile
  };
}

/**
 * Returns the effective reference image URL/base64 to be supplied to AI models or UI previews.
 * Strictly prioritizes cleanedReferenceImage when present.
 */
export function getEffectiveAvatarReferenceImage(
  context?: AvatarIdentityContext | null
): string | undefined {
  if (!context) return undefined;
  return context.cleanedReferenceImage || context.referenceImage || undefined;
}

/**
 * Formats a discrete diagnostic/status readout for UI badges and telemetry.
 */
export function getAvatarIdentityStatus(
  context?: AvatarIdentityContext | null
): AvatarIdentityStatusInfo {
  if (!context || (!context.referenceImage && !context.identityPrompt && !context.identityDNA && !isBrandMarkActive(context.brandMarkProfile))) {
    return {
      active: false,
      source: 'None',
      cleanReference: 'NONE',
      hasIdentityDNA: false,
      hasIdentityPrompt: false,
      hasBrandMark: false
    };
  }

  const hasClean = Boolean(context.cleanedReferenceImage);
  return {
    active: true,
    source: 'Identity Hub',
    cleanReference: hasClean ? 'ACTIVE' : 'ORIGINAL',
    hasIdentityDNA: Boolean(context.identityDNA),
    hasIdentityPrompt: Boolean(context.identityPrompt && context.identityPrompt.trim().length > 0),
    hasBrandMark: isBrandMarkActive(context.brandMarkProfile)
  };
}

/**
 * Formats the shared Avatar Identity Clause for inline template injection.
 */
export function renderAvatarIdentityClause(): string {
  return SHARED_AVATAR_IDENTITY_CLAUSE;
}

/**
 * Sanitizes an avatar identity prompt or free-text description for Scene 3.
 * Strictly preserves identity-safe traits:
 * - facial appearance
 * - facial proportions
 * - hair
 * - skin
 * - stable distinguishing traits
 * - allowed identity accessories
 *
 * Strictly excludes:
 * - reference background / backdrop / cenário / fundo
 * - studio lighting / softbox / iluminação
 * - pose / arms / posture / postura
 * - camera viewpoint / framing / enquadramento / angle
 * - crop / composition
 * - scene objects / interacting objects / props
 * - wardrobe / clothing unless explicitly inherited
 * - jewelry unless explicitly allowed
 */
export function sanitizeAvatarIdentityText(rawText: string): string {
  if (!rawText || typeof rawText !== 'string') return '';

  // Split by clauses, sentences, or structured section prefixes
  const segments = rawText.split(/(?<=[.;\n])\s+/);
  const cleanSegments: string[] = [];

  for (const seg of segments) {
    const trimmed = seg.trim();
    if (!trimmed) continue;

    const lower = trimmed.toLowerCase();

    // Check structured prefixes like "Background:", "Lighting:", "Pose:", "Camera Viewpoint:", "Wardrobe:", "Reference Wardrobe (Contextual):"
    if (/^(?:reference\s+)?(?:background|backdrop|cen[áa]rio|fundo)\s*:/i.test(lower)) continue;
    if (/^(?:lighting|studio\s+lighting|ilumina[çc][ãa]o)\s*:/i.test(lower)) continue;
    if (/^(?:pose|postur[ae]|arms|hands)\s*(?:\([^)]*\))?\s*:/i.test(lower)) continue;
    if (/^(?:camera|viewpoint|enquadramento|angle)\s*:/i.test(lower)) continue;
    if (/^(?:crop|composition|composi[çc][ãa]o)\s*:/i.test(lower)) continue;
    if (/^(?:interacting\s+objects|objects|scene\s+objects)\s*:/i.test(lower)) continue;
    if (/^(?:reference\s+wardrobe|wardrobe|vestimenta|clothing)\s*(?:\([^)]*\))?\s*:/i.test(lower)) continue;
    if (/^(?:jewelry|joias|j[óo]ias)\s*:/i.test(lower)) continue;

    // Check standalone sentences that describe excluded domains
    if (
      /\b(?:studio\s+background|seamless\s+backdrop|plain\s+backdrop|studio\s+backdrop|white\s+background)\b/i.test(lower) ||
      /\b(?:studio\s+(?:softbox\s+)?lighting|softbox\s+lighting|diffused\s+studio\s+lighting|key\s+light)\b/i.test(lower) ||
      /\b(?:arms\s+crossed(?:\s+squared\s+to\s+camera)?|standing\s+static|hands\s+on\s+hips)\b/i.test(lower) ||
      /\b(?:medium\s+close-?up|eye-?level\s+angle|camera\s+framing|centered\s+viewpoint)\b/i.test(lower)
    ) {
      continue;
    }

    cleanSegments.push(trimmed);
  }

  return cleanSegments.join(' ').replace(/\s{2,}/g, ' ').trim();
}

/**
 * Serializes only identity-safe traits for Scene 3 Identity Lock.
 * Priority:
 *   1. IdentityDNA verified traits if available (facial appearance, facial proportions, hair, skin, distinguishing traits).
 *   2. Sanitized IdentityPrompt free text (stripping background, lighting, pose, camera framing, wardrobe, objects).
 * Guarantees zero pollution of reference background or ephemeral scene state.
 */
export function serializeScene3CleanAvatarIdentity(
  context?: AvatarIdentityContext | null
): string {
  if (!context) return '';

  // 1. If identityPrompt is provided, sanitize it to strip background, lighting, pose, camera, objects, wardrobe
  if (context.identityPrompt && context.identityPrompt.trim().length > 0) {
    const cleaned = sanitizeAvatarIdentityText(context.identityPrompt);
    if (cleaned.length > 0) {
      return cleaned;
    }
  }

  // 2. Otherwise derive from identityDNA verified traits
  const traits: string[] = [];

  if (context.identityDNA) {
    const dna = context.identityDNA;

    if (dna.visibleFacialAppearance?.value && dna.visibleFacialAppearance.value !== 'unknown') {
      traits.push(`Facial Appearance: ${dna.visibleFacialAppearance.value.trim()}`);
    }
    if (dna.facialProportions?.value && dna.facialProportions.value !== 'unknown') {
      traits.push(`Facial Proportions: ${dna.facialProportions.value.trim()}`);
    }
    if (dna.hair) {
      const hairParts: string[] = [];
      if (dna.hair.color?.value && dna.hair.color.value !== 'unknown') hairParts.push(dna.hair.color.value);
      if (dna.hair.length?.value && dna.hair.length.value !== 'unknown') hairParts.push(dna.hair.length.value);
      if (dna.hair.texture?.value && dna.hair.texture.value !== 'unknown') hairParts.push(dna.hair.texture.value);
      if (dna.hair.style?.value && dna.hair.style.value !== 'unknown') hairParts.push(dna.hair.style.value);
      if (hairParts.length > 0) {
        traits.push(`Hair: ${hairParts.join(', ')}`);
      }
    }
    if (dna.skin) {
      const skinParts: string[] = [];
      if (dna.skin.visibleTone?.value && dna.skin.visibleTone.value !== 'unknown') skinParts.push(`tone: ${dna.skin.visibleTone.value}`);
      if (dna.skin.surfaceTexture?.value && dna.skin.surfaceTexture.value !== 'unknown') skinParts.push(`texture: ${dna.skin.surfaceTexture.value}`);
      if (skinParts.length > 0) {
        traits.push(`Skin: ${skinParts.join(', ')}`);
      }
    }
    if (dna.distinguishingTraits?.value && Array.isArray(dna.distinguishingTraits.value)) {
      const validTraits = dna.distinguishingTraits.value.filter(t => t && t !== 'unknown' && t !== 'none');
      if (validTraits.length > 0) {
        traits.push(`Distinguishing Traits: ${validTraits.join(', ')}`);
      }
    }
  }

  if (traits.length > 0) {
    return traits.join('; ');
  }

  return '';
}

/**
 * Renders the structured Avatar Identity Reference block for master prompts in Creative Director and Cinematic Engine.
 * Ensures strict separation between avatar identity and product object locks, and inherits brand mark when active.
 */
export function renderAvatarIdentityBlock(
  context?: AvatarIdentityContext | null
): string {
  if (!context) {
    return '';
  }

  const status = getAvatarIdentityStatus(context);
  if (!status.active) {
    return '';
  }

  const lines: string[] = [
    `[AVATAR IDENTITY REFERENCE & LOCK]`,
    `- Status: Avatar Identity ACTIVE (Source: ${status.source})`,
    `- Clean Reference: ${status.cleanReference}`,
    `- Rule: Use the supplied avatar identity reference only to preserve the visible identity-related appearance of the presenter.`,
    `- Preserved Traits: Preserve facial appearance, visible facial proportions, hair characteristics, skin characteristics and confirmed distinguishing traits.`,
    `- Exclusion Mandate: Do not inherit pose, wardrobe, jewelry, background, camera framing, objects or lighting from the avatar reference unless explicitly requested by the current scene.`,
    `- Wardrobe Priority: ${SHARED_AVATAR_WARDROBE_PRIORITY_RULE}`,
    `- Action Priority: ${SHARED_AVATAR_POSE_PRIORITY_RULE}`,
    `- Lock Separation: AVATAR IDENTITY LOCK is strictly distinct from PRODUCT OBJECT LOCK. Avatar reference locks the human presenter only.`
  ];

  const cleanIdentity = serializeScene3CleanAvatarIdentity(context);
  if (cleanIdentity && cleanIdentity.length > 0) {
    lines.push(`- Intrinsic Identity Profile: ${cleanIdentity}`);
  }

  if (isBrandMarkActive(context.brandMarkProfile)) {
    const brandMarkResult = resolveBrandMarkAuthority(context.brandMarkProfile);
    if (brandMarkResult.active && brandMarkResult.clause) {
      lines.push('');
      lines.push(brandMarkResult.clause);
    }
  }

  return lines.join('\n');
}

/**
 * Builds an AvatarIdentityContext safely from an AvatarReferenceProfile or fallback object.
 * Guarantees zero re-analysis.
 */
export function resolveAvatarIdentityContext(
  profileOrContext?: AvatarReferenceProfile | AvatarIdentityContext | { image: string; profile?: AvatarReferenceProfile; masterPrompt?: string; brandMarkProfile?: BrandMarkProfile } | null
): AvatarIdentityContext | null {
  if (!profileOrContext) return null;

  // Already an AvatarIdentityContext
  if ('referenceImage' in profileOrContext && typeof profileOrContext.referenceImage === 'string') {
    return profileOrContext as AvatarIdentityContext;
  }

  // An AvatarReferenceProfile
  if ('identityPrompt' in profileOrContext || 'analysis' in profileOrContext || ('originalImage' in profileOrContext && typeof profileOrContext.originalImage === 'string')) {
    const p = profileOrContext as AvatarReferenceProfile;
    const refImage = p.originalImage || (p as any).image || (p as any).referenceImage || '';
    if (refImage || p.identityDNA || p.identityPrompt || p.brandMarkProfile) {
      return {
        identityDNA: p.identityDNA,
        identityPrompt: p.identityPrompt || '',
        referenceImage: refImage,
        cleanedReferenceImage: p.cleanedImage,
        brandMarkProfile: p.brandMarkProfile
      };
    }
  }

  // A StoredAvatar wrapper
  if ('image' in profileOrContext && typeof profileOrContext.image === 'string') {
    const raw = profileOrContext as { image: string; profile?: AvatarReferenceProfile; masterPrompt?: string; brandMarkProfile?: BrandMarkProfile };
    const brandMark = raw.brandMarkProfile || raw.profile?.brandMarkProfile;
    if (raw.profile) {
      return {
        identityDNA: raw.profile.identityDNA,
        identityPrompt: raw.profile.identityPrompt || raw.masterPrompt || '',
        referenceImage: raw.profile.originalImage || raw.image,
        cleanedReferenceImage: raw.profile.cleanedImage,
        brandMarkProfile: brandMark
      };
    }
    return {
      identityPrompt: raw.masterPrompt || '',
      referenceImage: raw.image,
      cleanedReferenceImage: undefined,
      brandMarkProfile: brandMark
    };
  }

  return null;
}
