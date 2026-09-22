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

  if (context.identityPrompt && context.identityPrompt.trim().length > 0) {
    lines.push(`- Intrinsic Identity Profile: ${context.identityPrompt.trim()}`);
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
