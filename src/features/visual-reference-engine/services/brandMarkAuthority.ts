/**
 * BRAND & LOGO IDENTITY AUTHORITY SERVICE
 * 
 * Single source of truth for Presenter Brand & Logo Identity across scenes.
 * Rules:
 * 1. Reference Authority: The uploaded logo/garment mark reference is the visual authority
 *    for symbol shape, lettering, spacing, proportions, color, placement, orientation, and relative scale.
 * 2. No Logo Invention: If referenceImage is missing, enabled is false, or confidence is low,
 *    never invent or hallucinate substitute logo text. Prefer no logo over incorrect branding.
 * 3. Garment Anchor Behavior: Fixed graphic physically attached to the garment surface.
 *    Anchored to the designated region across frames (e.g. left_chest remains on left chest).
 * 4. Wardrobe Compatibility: Brand identity is persistent; wardrobe remains contextual.
 *    If active garment changes, preserve equivalent placement when physically plausible.
 * 5. Safe Metadata Access: Safe lookups with fallback objects to prevent runtime undefined access.
 */

import {
  BrandMarkProfile,
  BrandMarkType,
  BrandMarkAnchorRegion,
  BrandMarkFidelityLevel,
  BrandMarkResolutionResult
} from '../types/brandMarkTypes';

// ============================================================================
// SAFE METADATA ACCESS & LOCALIZATION LOOKUP TABLES
// ============================================================================

export const BRAND_MARK_TYPE_LABELS: Record<BrandMarkType, string> = {
  print: 'Estampa / Impressão (Print)',
  embroidery: 'Bordado (Embroidery)',
  patch: 'Patch / Emblema',
  badge: 'Distintivo / Escudo',
  pin: 'Pin / Broche',
  other: 'Outro (Personalizado)'
};

export const BRAND_MARK_ANCHOR_LABELS: Record<BrandMarkAnchorRegion, string> = {
  left_chest: 'Peito Esquerdo (Left Chest)',
  right_chest: 'Peito Direito (Right Chest)',
  center_chest: 'Centro do Peito (Center Chest)',
  left_sleeve: 'Manga Esquerda (Left Sleeve)',
  right_sleeve: 'Manga Direita (Right Sleeve)',
  custom: 'Personalizado (Custom)'
};

export const BRAND_MARK_FIDELITY_LABELS: Record<BrandMarkFidelityLevel, string> = {
  standard: 'Padrão (Standard)',
  high: 'Alta (High)',
  strict: 'Rigorosa (Strict)'
};

export const BRAND_MARK_SCALE_LABELS: Record<string, string> = {
  small: 'Pequeno / Discreto (Small)',
  medium: 'Médio / Proporcional (Medium)',
  large: 'Grande / Destaque (Large)'
};

/**
 * Safe resolver for Mark Type display label with fallback.
 */
export function getBrandMarkTypeLabel(type?: string | null): string {
  if (!type) return 'Estampa (Print)';
  return BRAND_MARK_TYPE_LABELS[type as BrandMarkType] || String(type);
}

/**
 * Safe resolver for Anchor Region display label with fallback.
 */
export function getBrandMarkAnchorLabel(region?: string | null, customRegion?: string | null): string {
  if (region === 'custom' && customRegion && customRegion.trim()) {
    return `Personalizado: ${customRegion.trim()}`;
  }
  if (!region) return 'Peito Esquerdo (Left Chest)';
  return BRAND_MARK_ANCHOR_LABELS[region as BrandMarkAnchorRegion] || String(region);
}

/**
 * Safe resolver for Fidelity Level display label with fallback.
 */
export function getBrandMarkFidelityLabel(level?: string | null): string {
  if (!level) return 'Padrão (Standard)';
  return BRAND_MARK_FIDELITY_LABELS[level as BrandMarkFidelityLevel] || String(level);
}

/**
 * Safe resolver for Scale display label with fallback.
 */
export function getBrandMarkScaleLabel(scale?: string | null): string {
  if (!scale) return 'Médio / Proporcional (Medium)';
  return BRAND_MARK_SCALE_LABELS[scale] || String(scale);
}

// ============================================================================
// BRAND MARK AUTHORITY RESOLVER
// ============================================================================

/**
 * Checks if a BrandMarkProfile is valid and actively enabled.
 * Strictly adheres to rule: If disabled or missing required authority without explicit visible text/image, return false.
 */
export function isBrandMarkActive(profile?: BrandMarkProfile | null): boolean {
  if (!profile || !profile.enabled) {
    return false;
  }
  // Must have at least a reference image or visible text or confirmed mark parameters
  const hasVisualAuthority = Boolean(
    (profile.referenceImage && profile.referenceImage.trim().length > 0) ||
    (profile.visibleText && profile.visibleText.trim().length > 0)
  );
  return hasVisualAuthority;
}

/**
 * Resolves concise inherited prompt language for video generation.
 */
export function renderBrandMarkVideoPrompt(profile?: BrandMarkProfile | null): string {
  if (!isBrandMarkActive(profile)) {
    return '';
  }

  const anchor = getBrandMarkAnchorLabel(profile?.anchorRegion, profile?.customAnchorRegion);
  const type = getBrandMarkTypeLabel(profile?.markType);

  return `[PRESENTER BRAND MARK]
Keep the registered garment logo consistent with the Identity Hub reference.
Preserve its visible shape, lettering, color, placement (${anchor}) and scale across frames.
Keep it physically anchored to the garment (${type}).
Avoid redraw, substitution or frame-to-frame mutation.`;
}

/**
 * Resolves camera readability recommendations for high/strict fidelity levels.
 */
export function renderBrandMarkCameraGuard(profile?: BrandMarkProfile | null): string {
  if (!isBrandMarkActive(profile)) {
    return '';
  }
  const fidelity = profile?.fidelityLevel || 'standard';
  if (fidelity === 'high' || fidelity === 'strict') {
    return `- Camera Readability Guard: Avoid excessive motion blur, avoid extreme torso rotation, avoid aggressive perspective changes, and keep branded garment region (${getBrandMarkAnchorLabel(profile?.anchorRegion, profile?.customAnchorRegion)}) reasonably visible.`;
  }
  return '';
}

/**
 * Resolves the canonical BrandMarkAuthority into a structured clause and prompt snippets.
 */
export function resolveBrandMarkAuthority(profile?: BrandMarkProfile | null): BrandMarkResolutionResult {
  const defaultSummary = {
    statusText: 'Desativado',
    anchorText: 'Não configurada',
    fidelityText: 'Padrão',
    markTypeText: 'Estampa',
    hasImage: false
  };

  if (!isBrandMarkActive(profile) || !profile) {
    return {
      active: false,
      clause: '',
      videoPrompt: '',
      cameraGuard: '',
      statusSummary: defaultSummary
    };
  }

  const markType = profile.markType || 'print';
  const anchorRegion = profile.anchorRegion || 'left_chest';
  const fidelityLevel = profile.fidelityLevel || 'standard';
  const relativeScale = profile.relativeScale || 'medium';
  const visibleText = (profile.visibleText || '').trim();
  const colorProfile = (profile.colorProfile || '').trim();

  const typeDesc = getBrandMarkTypeLabel(markType);
  const anchorDesc = getBrandMarkAnchorLabel(anchorRegion, profile.customAnchorRegion);
  const fidelityDesc = getBrandMarkFidelityLabel(fidelityLevel);
  const scaleDesc = getBrandMarkScaleLabel(relativeScale);
  const hasImage = Boolean(profile.referenceImage && profile.referenceImage.trim().length > 0);

  const lines: string[] = [
    `[PRESENTER BRAND MARK]`,
    `- Status: Registered Presenter Brand Mark ACTIVE (Identity Hub Authority)`,
    `- Reference Authority: The registered logo/garment mark reference is the visual authority for symbol shape, lettering, spacing, proportions, color, placement, orientation, and relative scale.`,
    `- Mark Type: ${typeDesc}`,
    `- Garment Anchor Region: ${anchorDesc}`,
    `- Relative Scale: ${scaleDesc}`,
    `- Fidelity Level: ${fidelityDesc}`
  ];

  if (colorProfile) {
    lines.push(`- Color Profile: ${colorProfile}`);
  }

  if (visibleText) {
    lines.push(`- Visible Lettering / Wordmark: "${visibleText}" (Preserve exact characters and spacing; do not translate, scramble, or alter)`);
  } else {
    lines.push(`- Logo Detail: Preserve exact symbol shape and lettering from reference; do not infer missing text or invent substitute typography.`);
  }

  lines.push(
    `- Physical Anchor Mandate: Treat the brand mark as a fixed graphic physically attached to the garment surface. Maintain the same symbol shape, lettering, spacing, color, relative scale and placement on the garment. Allow only natural deformation caused by fabric folds and perspective.`,
    `- Anchor Stability: Logo must stay anchored to ${anchorDesc} across all frames. No independent logo movement. No sliding across fabric. No frame-to-frame redesign. No symbol substitution. No letter mutation.`,
    `- Negative Constraints: Do not redraw, reinterpret, translate, replace, scramble, morph, duplicate, relocate, recolor, or invent lettering.`,
    `- Wardrobe Compatibility: Brand identity is persistent while wardrobe can remain contextual. If the active garment changes, preserve the same brand identity and equivalent placement when physically plausible. Fallback: Keep the registered brand mark visible on the active garment in the nearest physically plausible registered region.`
  );

  const cameraGuard = renderBrandMarkCameraGuard(profile);
  if (cameraGuard) {
    lines.push(cameraGuard);
  }

  const clause = lines.join('\n');
  const videoPrompt = renderBrandMarkVideoPrompt(profile);

  return {
    active: true,
    clause,
    videoPrompt,
    cameraGuard,
    statusSummary: {
      statusText: 'Logo configurado',
      anchorText: anchorDesc,
      fidelityText: fidelityDesc,
      markTypeText: typeDesc,
      hasImage
    }
  };
}
