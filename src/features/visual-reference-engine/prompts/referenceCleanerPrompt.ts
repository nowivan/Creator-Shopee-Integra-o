/**
 * REFERENCE CLEANER PROMPT BUILDER
 * Generates prompt instructions for the Reference Cleaner module,
 * strictly driven by VisualReferenceAnalysis and ReferenceCleaningContract.
 */

import {
  VisualReferenceAnalysis,
  VisualTextElement,
  ReferenceCleaningContract
} from '../types/visualReferenceTypes';

export interface ReferenceCleanerPromptOptions {
  analysis: VisualReferenceAnalysis;
  mode: 'CLEAN_WHITE' | 'PRESERVE_SCENE';
  contract: ReferenceCleaningContract;
}

export function buildReferenceCleanerPrompt(options: ReferenceCleanerPromptOptions): string {
  const { analysis, mode, contract } = options;

  const preservationDirectives: string[] = [];
  const removalDirectives: string[] = [];
  const qualityDirectives: string[] = [];

  // 1. SUBJECT LOCK
  preservationDirectives.push(
    'PRESERVE PRINCIPAL SUBJECT: Preserve the principal subject exactly in visible facial identity, facial proportions, skin tone, hair texture, eye appearance, body pose, limb positions, proportions, clothing, accessories, physical branding, and relative scale.'
  );

  // 2. POSE LOCK
  if (analysis.sceneState?.pose) {
    const pose = analysis.sceneState.pose;
    const poseParts: string[] = [];
    if (pose.bodyOrientation?.value) poseParts.push(`body orientation (${pose.bodyOrientation.value})`);
    if (pose.headOrientation?.value) poseParts.push(`head orientation (${pose.headOrientation.value})`);
    if (pose.shoulderLine?.value) poseParts.push(`shoulder line (${pose.shoulderLine.value})`);
    if (pose.leftArm?.upperArmDirection?.value || pose.leftArm?.elbowState?.value) {
      poseParts.push(`left arm (${pose.leftArm.upperArmDirection?.value || ''}, elbow: ${pose.leftArm.elbowState?.value || ''})`);
    }
    if (pose.rightArm?.upperArmDirection?.value || pose.rightArm?.elbowState?.value) {
      poseParts.push(`right arm (${pose.rightArm.upperArmDirection?.value || ''}, elbow: ${pose.rightArm.elbowState?.value || ''})`);
    }
    if (poseParts.length > 0) {
      preservationDirectives.push(`PRESERVE EXACT POSE: Maintain ${poseParts.join(', ')}. Do NOT alter gesture, weight distribution, or bilateral limb geometry.`);
    }
  }

  // 3. WARDROBE LOCK
  if (analysis.sceneState?.wardrobe) {
    const w = analysis.sceneState.wardrobe;
    const wardrobeParts: string[] = [];
    if (w.top?.type?.value) wardrobeParts.push(`top: ${w.top.color?.value || ''} ${w.top.type.value} (${w.top.fabricAppearance?.value || ''})`);
    if (w.bottom?.type?.value) wardrobeParts.push(`bottom: ${w.bottom.color?.value || ''} ${w.bottom.type.value}`);
    if (w.footwear?.type?.value && w.footwear.type.status !== 'UNKNOWN') {
      wardrobeParts.push(`footwear: ${w.footwear.color?.value || ''} ${w.footwear.type.value}`);
    }
    if (wardrobeParts.length > 0) {
      preservationDirectives.push(`PRESERVE EXACT WARDROBE: Maintain ${wardrobeParts.join(', ')}. Keep original colors, fabric drape, seams, and physical fit.`);
    }
  }

  // 4. ACCESSORIES LOCK
  if (analysis.sceneState?.accessories) {
    const acc = analysis.sceneState.accessories;
    const accParts: string[] = [];
    if (acc.jewelry?.value) accParts.push(`jewelry (${acc.jewelry.value.join(', ')})`);
    if (acc.eyewear?.value) accParts.push(`eyewear (${acc.eyewear.value})`);
    if (acc.headwear?.value) accParts.push(`headwear (${acc.headwear.value})`);
    if (acc.watches?.value) accParts.push(`watch (${acc.watches.value})`);
    if (acc.bags?.value) accParts.push(`bag (${acc.bags.value})`);
    if (accParts.length > 0) {
      preservationDirectives.push(`PRESERVE PHYSICAL ACCESSORIES: Retain ${accParts.join(', ')}. Do NOT remove or modify attached physical jewelry or accessories.`);
    }
  }

  // 5. PRODUCT & PACKAGING LOCK
  if (analysis.objects && analysis.objects.length > 0) {
    const objDescs = analysis.objects
      .map(o => `${o.color?.value || ''} ${o.type?.value || ''} (${o.material?.value || ''})`.trim())
      .filter(Boolean);
    if (objDescs.length > 0) {
      preservationDirectives.push(
        `PRESERVE PHYSICAL PRODUCTS: Maintain target product geometry, count, scale, physical packaging, materials, and colors for: ${objDescs.join('; ')}.`
      );
    }
  }

  // 6. TEXT / BRANDING RULES (PRESERVATION vs REMOVAL)
  // Single Source of Truth: cleaningDefault with PRESERVE > REMOVE priority
  const textElements: VisualTextElement[] = analysis.textElements || [];
  const removalCandidates: VisualTextElement[] = [];
  const preservationCandidates: VisualTextElement[] = [];

  textElements.forEach(t => {
    const isPhysicalType =
      t.type === 'physical_text' ||
      t.type === 'physical_logo' ||
      t.type === 'packaging_text';

    // Conflict & Precedence: PRESERVE wins over REMOVE.
    if (t.cleaningDefault === 'PRESERVE' || isPhysicalType) {
      preservationCandidates.push(t);
    } else if (t.cleaningDefault === 'REMOVE') {
      removalCandidates.push(t);
    } else {
      // CONTEXT_DEPENDENT, watermark, or unclassified -> PRESERVE by default (Safe Failure)
      preservationCandidates.push(t);
    }
  });

  if (preservationCandidates.length > 0) {
    const physDescs = preservationCandidates.map(t => {
      const content = t.content?.value ? `"${t.content.value}"` : 'text element';
      const loc = t.location?.value ? ` at ${t.location.value}` : '';
      return `${t.type} [${content}${loc}]`;
    });
    preservationDirectives.push(
      `PRESERVE PHYSICAL BRANDING, LABELS & TEXT: Strictly preserve: ${physDescs.join(', ')}. Do NOT smudge, alter or erase them.`
    );
  }

  if (analysis.branding?.elements && analysis.branding.elements.length > 0) {
    const brandDescs = analysis.branding.elements
      .filter(b => b.physicallyAttached)
      .map(b => `${b.type} (${b.description?.value || ''} at ${b.location?.value || ''})`.trim());
    if (brandDescs.length > 0) {
      preservationDirectives.push(
        `PRESERVE EMBEDDED LOGOS: Retain all physical brand markings: ${brandDescs.join(', ')}.`
      );
    }
  }

  // REMOVALS (Only explicitly authorized REMOVE elements)
  if (removalCandidates.length > 0) {
    const overlayDescs = removalCandidates.map(t => {
      const content = t.content?.value ? `"${t.content.value}"` : 'overlay';
      const loc = t.location?.value ? ` at ${t.location.value}` : '';
      return `${t.type} [${content}${loc}]`;
    });
    removalDirectives.push(
      `REMOVE GRAPHIC OVERLAYS: Cleanly inpaint and erase floating synthetic overlays, graphic captions, UI elements, and price stickers: ${overlayDescs.join(', ')}.`
    );
  } else if (contract.removeOverlayText || contract.removeCaptions || contract.removeUiElements) {
    removalDirectives.push(
      'REMOVE GRAPHIC OVERLAYS: Cleanly remove floating digital overlays, promotional banners, prices, or UI graphics present in the image.'
    );
  }

  if (contract.removeUnrelatedClutter) {
    removalDirectives.push(
      'REMOVE CLUTTER: Remove transient extraneous clutter or artificial digital watermarks that do not belong to the physical scene.'
    );
  }

  // 7. BACKGROUND TREATMENT
  if (mode === 'CLEAN_WHITE') {
    removalDirectives.push(
      'BACKGROUND REPLACEMENT: Replace the entire background environment with a clean, seamless, studio-grade neutral pure white background (#FFFFFF).'
    );
    preservationDirectives.push(
      'EDGE FIDELITY: Seamlessly preserve subject boundary edges, hair flyaways, translucent materials, and soft natural contact shadows on the ground/surface to prevent an artificial sticker or cutout appearance.'
    );
  } else {
    preservationDirectives.push(
      'PRESERVE SCENE BACKGROUND: Maintain the original background environment, surfaces, depth of field, perspective, and natural room lighting exactly as captured.'
    );
  }

  // 8. QUALITY ENHANCEMENT
  qualityDirectives.push(
    'ENHANCE VISUAL CLARITY: Eliminate digital compression artifacts, improve fine edge definition, preserve natural skin pores and realistic fabric micro-textures. Avoid aggressive synthetic beauty smoothing or altering the subject biometric identity.'
  );

  // 9. SAFE FAILURE PRIORITY
  const safeFailureNotice =
    'CRITICAL CONFLICT RESOLUTION: When in doubt between removing an element or preserving a legitimate physical item, ALWAYS PRESERVE (PRESERVE > REMOVE). Never erase real clothing seams, buttons, physical bottle labels, or real anatomy.';

  return `TASK: REFERENCE IMAGE CLEANING & ARTIFACT STRIPPING
OPERATION MODE: ${mode}

=== PRESERVATION DIRECTIVES (HARD LOCKS) ===
${preservationDirectives.map((d, i) => `${i + 1}. ${d}`).join('\n')}

=== REMOVAL DIRECTIVES ===
${removalDirectives.length > 0 ? removalDirectives.map((d, i) => `${i + 1}. ${d}`).join('\n') : 'None.'}

=== QUALITY ENHANCEMENT DIRECTIVES ===
${qualityDirectives.map((d, i) => `${i + 1}. ${d}`).join('\n')}

=== CONFLICT & SAFETY RULES ===
${safeFailureNotice}
`;
}
