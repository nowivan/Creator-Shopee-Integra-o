/**
 * VISUAL REFERENCE ENGINE — PROMPT COMPOSER — V1 FROZEN ARCHITECTURE
 * Part of Visual Reference Engine V1.0.0 (Release Candidate)
 * Responsibilities: 100% deterministic local compilation of canonical prompt clauses across 18 ordered segments.
 * Source of Truth: Canonical Prompt Ordering & Evidence Confidence Gates (UNKNOWN fields omitted).
 * AI Budget: Strictly 0 AI calls (Local pure TypeScript computation).
 */

import {
  VisualReferenceAnalysis,
  VisualEvidence,
  VisualEvidenceStatus,
  VisualTextElement,
  PreservationContract
} from '../types/visualReferenceTypes';

export interface VisualPromptComposerInput {
  analysis: VisualReferenceAnalysis;
  mode?: 'RECONSTRUCTION' | 'IDENTITY_REFERENCE' | 'SCENE_REFERENCE';
}

export interface VisualPromptComposerOutput {
  prompt: string;
  format?: string;
  aspectRatio?: string;
  style?: string;
  includedSections: string[];
  omittedUnknownFields: string[];
}

interface EvidenceResolution {
  text: string;
  status: VisualEvidenceStatus;
}

/**
 * Recursively scans an analysis object to collect all field paths that have status === 'UNKNOWN'.
 */
function collectUnknownFieldPaths(obj: any, currentPath: string, collector: string[]) {
  if (!obj || typeof obj !== 'object') return;

  if ('status' in obj && obj.status === 'UNKNOWN') {
    collector.push(currentPath);
    return;
  }

  for (const [key, val] of Object.entries(obj)) {
    const nextPath = currentPath ? `${currentPath}.${key}` : key;
    if (val && typeof val === 'object') {
      if ('status' in val && val.status === 'UNKNOWN') {
        collector.push(nextPath);
      } else {
        collectUnknownFieldPaths(val, nextPath, collector);
      }
    }
  }
}

/**
 * Resolves a VisualEvidence field safely:
 * - VISIBLE: Included directly as factual visual evidence.
 * - PARTIAL: Included with restrained, non-extrapolating phrasing.
 * - INFERRED: Included with cautious non-absolute wording.
 * - UNKNOWN / Missing: Omitted completely and registered in omitted collector.
 */
function resolveEvidence<T>(
  evidence: VisualEvidence<T> | undefined,
  fieldName: string,
  omittedCollector: string[],
  formatter?: (val: T) => string
): EvidenceResolution | null {
  if (!evidence) {
    return null;
  }

  if (evidence.status === 'UNKNOWN') {
    omittedCollector.push(fieldName);
    return null;
  }

  const rawVal = evidence.value;
  if (rawVal === undefined || rawVal === null) {
    omittedCollector.push(fieldName);
    return null;
  }

  let formattedValue: string;
  if (formatter) {
    formattedValue = formatter(rawVal);
  } else if (Array.isArray(rawVal)) {
    formattedValue = rawVal.filter(Boolean).join(', ');
  } else {
    formattedValue = String(rawVal).trim();
  }

  if (!formattedValue) {
    omittedCollector.push(fieldName);
    return null;
  }

  if (evidence.status === 'VISIBLE') {
    return { text: formattedValue, status: 'VISIBLE' };
  }

  if (evidence.status === 'PARTIAL') {
    return { text: `partially visible ${formattedValue}`, status: 'PARTIAL' };
  }

  if (evidence.status === 'INFERRED') {
    return { text: `subtly appearing as ${formattedValue}`, status: 'INFERRED' };
  }

  return null;
}

/**
 * Formats multiple sub-field evidence values into a coherent sentence segment.
 */
function formatSubFields(
  fields: { name: string; res: EvidenceResolution | null; label?: string }[]
): string[] {
  const parts: string[] = [];
  for (const field of fields) {
    if (field.res && field.res.text) {
      if (field.label) {
        parts.push(`${field.label}: ${field.res.text}`);
      } else {
        parts.push(field.res.text);
      }
    }
  }
  return parts;
}

export function composeVisualPrompt(input: VisualPromptComposerInput): VisualPromptComposerOutput {
  const analysis = input.analysis || {};
  const mode = input.mode || 'RECONSTRUCTION';

  const includedSections: string[] = [];
  const omittedUnknownFields: string[] = [];

  // Collect all explicitly declared UNKNOWN fields
  collectUnknownFieldPaths(analysis, '', omittedUnknownFields);
  if (Array.isArray(analysis.unknown)) {
    analysis.unknown.forEach(u => {
      if (u) omittedUnknownFields.push(u);
    });
  }

  const frame = analysis.frame;
  const subject = analysis.subject;
  const identity = analysis.identity;
  const face = analysis.face;
  const hair = analysis.hair;
  const skin = analysis.skin;
  const sceneState = analysis.sceneState || {};
  const expression = sceneState.expression;
  const pose = sceneState.pose;
  const wardrobe = sceneState.wardrobe;
  const accessories = sceneState.accessories;
  const objects = sceneState.objects || analysis.objects || [];
  const background = sceneState.background;
  const lighting = sceneState.lighting;
  const camera = sceneState.camera;
  const composition = sceneState.composition;
  const texture = analysis.texture;
  const style = analysis.style;
  const textElements = analysis.textElements || [];
  const preservation = analysis.preservation || {};

  const promptSections: string[] = [];

  // =========================================================================
  // 1. GLOBAL FRAME / IMAGE TYPE
  // =========================================================================
  {
    const orientationRes = resolveEvidence(frame?.orientation, 'frame.orientation', omittedUnknownFields);
    const framingRes = resolveEvidence(frame?.framing, 'frame.framing', omittedUnknownFields);
    const realismRes = resolveEvidence(style?.realismLevel || style?.photographicVsRendered, 'style.realismLevel', omittedUnknownFields);

    const frameTokens: string[] = [];
    if (realismRes) frameTokens.push(realismRes.text);
    if (orientationRes && orientationRes.text !== 'unknown') frameTokens.push(`${orientationRes.text}-oriented`);
    if (framingRes) {
      frameTokens.push(framingRes.text);
    } else {
      frameTokens.push('photograph');
    }

    const frameSentence = frameTokens.length > 0
      ? `${frameTokens.join(' ').replace(/\b\w/g, c => c.toUpperCase())}.`
      : 'Photographic composition.';

    promptSections.push(frameSentence);
    includedSections.push('1. global frame / image type');
  }

  // =========================================================================
  // 2. PRINCIPAL SUBJECT
  // =========================================================================
  {
    const countRes = resolveEvidence(subject?.count, 'subject.count', omittedUnknownFields, c => `${c} subject${c > 1 ? 's' : ''}`);
    const typeRes = resolveEvidence(subject?.type, 'subject.type', omittedUnknownFields);
    const subjOrientRes = resolveEvidence(subject?.orientation, 'subject.orientation', omittedUnknownFields);
    const posRes = resolveEvidence(subject?.positionInFrame, 'subject.positionInFrame', omittedUnknownFields);
    const propRes = resolveEvidence(subject?.visibleProportions, 'subject.visibleProportions', omittedUnknownFields);

    const subjParts: string[] = [];
    if (countRes) subjParts.push(countRes.text);
    if (typeRes) subjParts.push(typeRes.text);
    if (subjOrientRes) subjParts.push(`oriented ${subjOrientRes.text}`);
    if (posRes) subjParts.push(`positioned ${posRes.text}`);
    if (propRes) subjParts.push(`with ${propRes.text}`);

    if (subjParts.length > 0) {
      promptSections.push(`Subject: ${subjParts.join(', ')}.`);
      includedSections.push('2. principal subject');
    }
  }

  // =========================================================================
  // 3. IDENTITY-RELATED APPEARANCE
  // =========================================================================
  {
    const appearanceRes = resolveEvidence(identity?.visibleFacialAppearance, 'identity.visibleFacialAppearance', omittedUnknownFields);
    const propRes = resolveEvidence(identity?.facialProportions, 'identity.facialProportions', omittedUnknownFields);
    const traitsRes = resolveEvidence(identity?.distinguishingTraits, 'identity.distinguishingTraits', omittedUnknownFields);

    const idParts: string[] = [];
    if (appearanceRes) idParts.push(appearanceRes.text);
    if (propRes) idParts.push(`facial proportions: ${propRes.text}`);
    if (traitsRes) idParts.push(`distinguishing traits: ${traitsRes.text}`);

    if (idParts.length > 0) {
      const prefix = mode === 'IDENTITY_REFERENCE' ? 'Core Identity Appearance' : 'Identity Appearance';
      promptSections.push(`${prefix}: ${idParts.join(', ')}.`);
      includedSections.push('3. identity-related appearance');
    }
  }

  // =========================================================================
  // 4. FACE
  // =========================================================================
  {
    const headOrientRes = resolveEvidence(face?.headOrientation, 'face.headOrientation', omittedUnknownFields);
    const eyeRes = resolveEvidence(face?.eyeAppearance, 'face.eyeAppearance', omittedUnknownFields);
    const eyebrowRes = resolveEvidence(face?.eyebrowAppearance, 'face.eyebrowAppearance', omittedUnknownFields);
    const noseRes = resolveEvidence(face?.noseAppearance, 'face.noseAppearance', omittedUnknownFields);
    const mouthRes = resolveEvidence(face?.mouthAppearance, 'face.mouthAppearance', omittedUnknownFields);
    const featRes = resolveEvidence(face?.distinguishingFeatures, 'face.distinguishingFeatures', omittedUnknownFields);

    const faceParts: string[] = [];
    if (headOrientRes) faceParts.push(`head oriented ${headOrientRes.text}`);
    if (eyeRes) faceParts.push(`eyes: ${eyeRes.text}`);
    if (eyebrowRes) faceParts.push(`eyebrows: ${eyebrowRes.text}`);
    if (noseRes) faceParts.push(`nose: ${noseRes.text}`);
    if (mouthRes) faceParts.push(`mouth: ${mouthRes.text}`);
    if (featRes) faceParts.push(`features: ${featRes.text}`);

    if (faceParts.length > 0) {
      promptSections.push(`Facial Structure: ${faceParts.join(', ')}.`);
      includedSections.push('4. face');
    }
  }

  // =========================================================================
  // 5. HAIR
  // =========================================================================
  {
    const hairCharsRes = resolveEvidence(identity?.hairCharacteristics, 'identity.hairCharacteristics', omittedUnknownFields);
    const colorRes = resolveEvidence(hair?.color, 'hair.color', omittedUnknownFields);
    const lengthRes = resolveEvidence(hair?.length, 'hair.length', omittedUnknownFields);
    const textureRes = resolveEvidence(hair?.texture, 'hair.texture', omittedUnknownFields);
    const styleRes = resolveEvidence(hair?.hairstyle, 'hair.hairstyle', omittedUnknownFields);
    const partingRes = resolveEvidence(hair?.parting, 'hair.parting', omittedUnknownFields);
    const strandRes = resolveEvidence(hair?.strandBehavior, 'hair.strandBehavior', omittedUnknownFields);

    const hairParts: string[] = [];
    if (hairCharsRes) hairParts.push(hairCharsRes.text);
    if (colorRes && (!hairCharsRes || !hairCharsRes.text.includes(colorRes.text))) hairParts.push(colorRes.text);
    if (lengthRes && (!hairCharsRes || !hairCharsRes.text.includes(lengthRes.text))) hairParts.push(lengthRes.text);
    if (textureRes && (!hairCharsRes || !hairCharsRes.text.includes(textureRes.text))) hairParts.push(textureRes.text);
    if (styleRes) hairParts.push(`styled as ${styleRes.text}`);
    if (partingRes) hairParts.push(`parted ${partingRes.text}`);
    if (strandRes) hairParts.push(strandRes.text);

    if (hairParts.length > 0) {
      promptSections.push(`Hair: ${hairParts.join(', ')}.`);
      includedSections.push('5. hair');
    }
  }

  // =========================================================================
  // 6. SKIN
  // =========================================================================
  {
    const skinCharsRes = resolveEvidence(identity?.skinCharacteristics, 'identity.skinCharacteristics', omittedUnknownFields);
    const toneRes = resolveEvidence(skin?.visibleTone, 'skin.visibleTone', omittedUnknownFields);
    const surfaceRes = resolveEvidence(skin?.surfaceTexture, 'skin.surfaceTexture', omittedUnknownFields);
    const highlightsRes = resolveEvidence(skin?.highlights, 'skin.highlights', omittedUnknownFields);
    const marksRes = resolveEvidence(skin?.visibleMarks, 'skin.visibleMarks', omittedUnknownFields);

    const skinParts: string[] = [];
    if (skinCharsRes) skinParts.push(skinCharsRes.text);
    if (toneRes && (!skinCharsRes || !skinCharsRes.text.includes(toneRes.text))) skinParts.push(`tone: ${toneRes.text}`);
    if (surfaceRes) skinParts.push(`texture: ${surfaceRes.text}`);
    if (highlightsRes) skinParts.push(`highlights: ${highlightsRes.text}`);
    if (marksRes) skinParts.push(`marks: ${marksRes.text}`);

    if (skinParts.length > 0) {
      promptSections.push(`Skin: ${skinParts.join(', ')}.`);
      includedSections.push('6. skin');
    }
  }

  // =========================================================================
  // 7. EXPRESSION / GAZE
  // =========================================================================
  {
    const eyeStateRes = resolveEvidence(expression?.eyeState, 'expression.eyeState', omittedUnknownFields);
    const mouthStateRes = resolveEvidence(expression?.mouthState, 'expression.mouthState', omittedUnknownFields);
    const tensionRes = resolveEvidence(expression?.facialTension, 'expression.facialTension', omittedUnknownFields);
    const gazeRes = resolveEvidence(expression?.gazeDirection, 'expression.gazeDirection', omittedUnknownFields);

    const exprParts: string[] = [];
    if (gazeRes) exprParts.push(`gaze directed ${gazeRes.text}`);
    if (eyeStateRes) exprParts.push(`eyes ${eyeStateRes.text}`);
    if (mouthStateRes) exprParts.push(`mouth ${mouthStateRes.text}`);
    if (tensionRes) exprParts.push(`expression ${tensionRes.text}`);

    if (exprParts.length > 0) {
      promptSections.push(`Expression & Gaze: ${exprParts.join(', ')}.`);
      includedSections.push('7. expression / gaze');
    }
  }

  // =========================================================================
  // 8. WARDROBE
  // =========================================================================
  {
    const top = wardrobe?.top;
    const bottom = wardrobe?.bottom;
    const footwear = wardrobe?.footwear;

    const wardrobeItems: string[] = [];

    if (top) {
      const topParts = formatSubFields([
        { name: 'top.color', res: resolveEvidence(top.color, 'wardrobe.top.color', omittedUnknownFields) },
        { name: 'top.fabricAppearance', res: resolveEvidence(top.fabricAppearance, 'wardrobe.top.fabricAppearance', omittedUnknownFields) },
        { name: 'top.fit', res: resolveEvidence(top.fit, 'wardrobe.top.fit', omittedUnknownFields) },
        { name: 'top.type', res: resolveEvidence(top.type, 'wardrobe.top.type', omittedUnknownFields) },
        { name: 'top.neckline', res: resolveEvidence(top.neckline, 'wardrobe.top.neckline', omittedUnknownFields, n => `with ${n} neckline`) },
        { name: 'top.sleeves', res: resolveEvidence(top.sleeves, 'wardrobe.top.sleeves', omittedUnknownFields, s => `with ${s} sleeves`) }
      ]);
      if (topParts.length > 0) wardrobeItems.push(`top: ${topParts.join(' ')}`);
    }

    if (bottom) {
      const bottomParts = formatSubFields([
        { name: 'bottom.color', res: resolveEvidence(bottom.color, 'wardrobe.bottom.color', omittedUnknownFields) },
        { name: 'bottom.fabricAppearance', res: resolveEvidence(bottom.fabricAppearance, 'wardrobe.bottom.fabricAppearance', omittedUnknownFields) },
        { name: 'bottom.fit', res: resolveEvidence(bottom.fit, 'wardrobe.bottom.fit', omittedUnknownFields) },
        { name: 'bottom.type', res: resolveEvidence(bottom.type, 'wardrobe.bottom.type', omittedUnknownFields) }
      ]);
      if (bottomParts.length > 0) wardrobeItems.push(`bottom: ${bottomParts.join(' ')}`);
    }

    if (footwear) {
      const footParts = formatSubFields([
        { name: 'footwear.color', res: resolveEvidence(footwear.color, 'wardrobe.footwear.color', omittedUnknownFields) },
        { name: 'footwear.type', res: resolveEvidence(footwear.type, 'wardrobe.footwear.type', omittedUnknownFields) }
      ]);
      if (footParts.length > 0) wardrobeItems.push(`footwear: ${footParts.join(' ')}`);
    }

    if (wardrobeItems.length > 0) {
      const prefix = mode === 'IDENTITY_REFERENCE' ? 'Reference Wardrobe (Contextual)' : 'Wardrobe';
      promptSections.push(`${prefix}: ${wardrobeItems.join(', ')}.`);
      includedSections.push('8. wardrobe');
    }
  }

  // =========================================================================
  // 9. ACCESSORIES / PHYSICAL BRANDING
  // =========================================================================
  {
    const jewelryRes = resolveEvidence(accessories?.jewelry, 'accessories.jewelry', omittedUnknownFields);
    const eyewearRes = resolveEvidence(accessories?.eyewear, 'accessories.eyewear', omittedUnknownFields);
    const watchesRes = resolveEvidence(accessories?.watches, 'accessories.watches', omittedUnknownFields);
    const headwearRes = resolveEvidence(accessories?.headwear, 'accessories.headwear', omittedUnknownFields);
    const bagsRes = resolveEvidence(accessories?.bags, 'accessories.bags', omittedUnknownFields);

    const physicalBrandingItems: string[] = [];

    // Filter textElements: ONLY physically attached branding / packaging text
    textElements.forEach(t => {
      const isPhysical =
        t.type === 'physical_logo' ||
        t.type === 'physical_text' ||
        t.type === 'packaging_text' ||
        (t.physicallyAttached && t.cleaningDefault === 'PRESERVE');

      // Reject overlay_text, captions, UI elements marked for removal
      if (isPhysical && t.content?.value) {
        const loc = t.location?.value ? ` located at ${t.location.value}` : '';
        physicalBrandingItems.push(`physical ${t.type.replace('_', ' ')} "${t.content.value}"${loc}`);
      }
    });

    const accParts: string[] = [];
    if (jewelryRes) accParts.push(`jewelry: ${jewelryRes.text}`);
    if (eyewearRes) accParts.push(`eyewear: ${eyewearRes.text}`);
    if (watchesRes) accParts.push(`watch: ${watchesRes.text}`);
    if (headwearRes) accParts.push(`headwear: ${headwearRes.text}`);
    if (bagsRes) accParts.push(`bag: ${bagsRes.text}`);
    if (physicalBrandingItems.length > 0) {
      accParts.push(`branding: ${physicalBrandingItems.join('; ')}`);
    }

    if (accParts.length > 0) {
      promptSections.push(`Accessories & Physical Branding: ${accParts.join(', ')}.`);
      includedSections.push('9. accessories / physical branding');
    }
  }

  // =========================================================================
  // 10. POSE / ARMS / HANDS (Detailed Bilateral Composition)
  // =========================================================================
  {
    const bodyOrientRes = resolveEvidence(pose?.bodyOrientation, 'pose.bodyOrientation', omittedUnknownFields);
    const torsoRes = resolveEvidence(pose?.torsoOrientation, 'pose.torsoOrientation', omittedUnknownFields);
    const shoulderRes = resolveEvidence(pose?.shoulderLine, 'pose.shoulderLine', omittedUnknownFields);
    const legRes = resolveEvidence(pose?.legConfiguration, 'pose.legConfiguration', omittedUnknownFields);

    const leftArm = pose?.leftArm;
    const rightArm = pose?.rightArm;
    const leftHand = pose?.leftHand;
    const rightHand = pose?.rightHand;

    const poseParts: string[] = [];
    if (bodyOrientRes) poseParts.push(`body oriented ${bodyOrientRes.text}`);
    if (torsoRes) poseParts.push(`torso: ${torsoRes.text}`);
    if (shoulderRes) poseParts.push(`shoulders: ${shoulderRes.text}`);

    // Left Arm articulation
    if (leftArm) {
      const leftArmParts = formatSubFields([
        { name: 'leftArm.upperArmDirection', res: resolveEvidence(leftArm.upperArmDirection, 'pose.leftArm.upperArmDirection', omittedUnknownFields) },
        { name: 'leftArm.elbowState', res: resolveEvidence(leftArm.elbowState, 'pose.leftArm.elbowState', omittedUnknownFields, e => `${e} elbow`) },
        { name: 'leftArm.forearmDirection', res: resolveEvidence(leftArm.forearmDirection, 'pose.leftArm.forearmDirection', omittedUnknownFields) }
      ]);
      if (leftArmParts.length > 0) poseParts.push(`left arm (viewer-relative left/subject left): ${leftArmParts.join(', ')}`);
    }

    // Right Arm articulation
    if (rightArm) {
      const rightArmParts = formatSubFields([
        { name: 'rightArm.upperArmDirection', res: resolveEvidence(rightArm.upperArmDirection, 'pose.rightArm.upperArmDirection', omittedUnknownFields) },
        { name: 'rightArm.elbowState', res: resolveEvidence(rightArm.elbowState, 'pose.rightArm.elbowState', omittedUnknownFields, e => `${e} elbow`) },
        { name: 'rightArm.forearmDirection', res: resolveEvidence(rightArm.forearmDirection, 'pose.rightArm.forearmDirection', omittedUnknownFields) }
      ]);
      if (rightArmParts.length > 0) poseParts.push(`right arm (viewer-relative right/subject right): ${rightArmParts.join(', ')}`);
    }

    // Left Hand articulation & interaction
    if (leftHand) {
      const leftHandParts = formatSubFields([
        { name: 'leftHand.fingerConfiguration', res: resolveEvidence(leftHand.fingerConfiguration, 'pose.leftHand.fingerConfiguration', omittedUnknownFields) },
        { name: 'leftHand.gesture', res: resolveEvidence(leftHand.gesture, 'pose.leftHand.gesture', omittedUnknownFields) },
        { name: 'leftHand.contactTarget', res: resolveEvidence(leftHand.contactTarget, 'pose.leftHand.contactTarget', omittedUnknownFields, c => `contacting ${c}`) }
      ]);
      if (leftHandParts.length > 0) poseParts.push(`left hand: ${leftHandParts.join(', ')}`);
    }

    // Right Hand articulation & interaction
    if (rightHand) {
      const rightHandParts = formatSubFields([
        { name: 'rightHand.fingerConfiguration', res: resolveEvidence(rightHand.fingerConfiguration, 'pose.rightHand.fingerConfiguration', omittedUnknownFields) },
        { name: 'rightHand.gesture', res: resolveEvidence(rightHand.gesture, 'pose.rightHand.gesture', omittedUnknownFields) },
        { name: 'rightHand.contactTarget', res: resolveEvidence(rightHand.contactTarget, 'pose.rightHand.contactTarget', omittedUnknownFields, c => `contacting ${c}`) }
      ]);
      if (rightHandParts.length > 0) poseParts.push(`right hand: ${rightHandParts.join(', ')}`);
    }

    if (legRes) poseParts.push(`legs: ${legRes.text}`);

    if (poseParts.length > 0) {
      const prefix = mode === 'IDENTITY_REFERENCE' ? 'Pose (Shot Reference)' : 'Pose & Articulation';
      promptSections.push(`${prefix}: ${poseParts.join('; ')}.`);
      includedSections.push('10. pose / arms / hands');
    }
  }

  // =========================================================================
  // 11. INTERACTING OBJECTS
  // =========================================================================
  {
    if (objects.length > 0) {
      const objectDescs: string[] = [];
      objects.forEach((obj, idx) => {
        const objParts = formatSubFields([
          { name: `objects[${idx}].color`, res: resolveEvidence(obj.color, `objects[${idx}].color`, omittedUnknownFields) },
          { name: `objects[${idx}].material`, res: resolveEvidence(obj.material, `objects[${idx}].material`, omittedUnknownFields) },
          { name: `objects[${idx}].type`, res: resolveEvidence(obj.type, `objects[${idx}].type`, omittedUnknownFields) },
          { name: `objects[${idx}].position`, res: resolveEvidence(obj.position, `objects[${idx}].position`, omittedUnknownFields, p => `placed ${p}`) },
          { name: `objects[${idx}].interactionWithSubject`, res: resolveEvidence(obj.interactionWithSubject, `objects[${idx}].interactionWithSubject`, omittedUnknownFields) }
        ]);
        if (objParts.length > 0) objectDescs.push(objParts.join(' '));
      });

      if (objectDescs.length > 0) {
        promptSections.push(`Interacting Objects: ${objectDescs.join('; ')}.`);
        includedSections.push('11. interacting objects');
      }
    }
  }

  // =========================================================================
  // 12. BACKGROUND
  // =========================================================================
  {
    const bgTypeRes = resolveEvidence(background?.type, 'background.type', omittedUnknownFields);
    const colorsRes = resolveEvidence(background?.dominantColors, 'background.dominantColors', omittedUnknownFields);
    const surfacesRes = resolveEvidence(background?.surfaces, 'background.surfaces', omittedUnknownFields);
    const depthRes = resolveEvidence(background?.depth, 'background.depth', omittedUnknownFields);
    const blurRes = resolveEvidence(background?.blur, 'background.blur', omittedUnknownFields);
    const envElementsRes = resolveEvidence(background?.visibleEnvironmentElements, 'background.visibleEnvironmentElements', omittedUnknownFields);

    const bgParts: string[] = [];
    if (bgTypeRes) bgParts.push(bgTypeRes.text);
    if (colorsRes) bgParts.push(`colors: ${colorsRes.text}`);
    if (surfacesRes) bgParts.push(`surfaces: ${surfacesRes.text}`);
    if (envElementsRes) bgParts.push(`environment elements: ${envElementsRes.text}`);
    if (depthRes) bgParts.push(`depth: ${depthRes.text}`);
    if (blurRes) bgParts.push(`blur: ${blurRes.text}`);

    if (bgParts.length > 0) {
      promptSections.push(`Background: ${bgParts.join(', ')}.`);
      includedSections.push('12. background');
    }
  }

  // =========================================================================
  // 13. LIGHTING
  // =========================================================================
  {
    const lightTypeRes = resolveEvidence(lighting?.lightType, 'lighting.lightType', omittedUnknownFields);
    const softnessRes = resolveEvidence(lighting?.softness, 'lighting.softness', omittedUnknownFields);
    const dirRes = resolveEvidence(lighting?.direction, 'lighting.direction', omittedUnknownFields);
    const shadowsRes = resolveEvidence(lighting?.shadows, 'lighting.shadows', omittedUnknownFields);
    const wbRes = resolveEvidence(lighting?.whiteBalance, 'lighting.whiteBalance', omittedUnknownFields);
    const expRes = resolveEvidence(lighting?.exposureStyle, 'lighting.exposureStyle', omittedUnknownFields);

    const lightParts: string[] = [];
    if (softnessRes) lightParts.push(`${softnessRes.text} lighting`);
    if (lightTypeRes) lightParts.push(lightTypeRes.text);
    if (dirRes) lightParts.push(`from ${dirRes.text}`);
    if (shadowsRes) lightParts.push(`shadows: ${shadowsRes.text}`);
    if (wbRes) lightParts.push(`white balance: ${wbRes.text}`);
    if (expRes) lightParts.push(`exposure: ${expRes.text}`);

    if (lightParts.length > 0) {
      promptSections.push(`Lighting: ${lightParts.join(', ')}.`);
      includedSections.push('13. lighting');
    }
  }

  // =========================================================================
  // 14. CAMERA VIEWPOINT
  // =========================================================================
  {
    const viewpointRes = resolveEvidence(camera?.viewpoint, 'camera.viewpoint', omittedUnknownFields);
    const heightRes = resolveEvidence(camera?.height, 'camera.height', omittedUnknownFields);
    const angleRes = resolveEvidence(camera?.angle, 'camera.angle', omittedUnknownFields);
    const distRes = resolveEvidence(camera?.distanceClass, 'camera.distanceClass', omittedUnknownFields);
    const persRes = resolveEvidence(camera?.perspective, 'camera.perspective', omittedUnknownFields);
    const dofRes = resolveEvidence(camera?.depthOfField, 'camera.depthOfField', omittedUnknownFields);

    const camParts: string[] = [];
    if (distRes) camParts.push(distRes.text);
    if (angleRes) camParts.push(`shot at ${angleRes.text}`);
    if (heightRes) camParts.push(`camera height: ${heightRes.text}`);
    if (viewpointRes) camParts.push(`viewpoint: ${viewpointRes.text}`);
    if (persRes) camParts.push(`perspective: ${persRes.text}`);
    if (dofRes) camParts.push(`depth of field: ${dofRes.text}`);

    if (camParts.length > 0) {
      promptSections.push(`Camera Viewpoint: ${camParts.join(', ')}.`);
      includedSections.push('14. camera viewpoint');
    }
  }

  // =========================================================================
  // 15. CROP / COMPOSITION
  // =========================================================================
  {
    const placeRes = resolveEvidence(composition?.subjectPlacement, 'composition.subjectPlacement', omittedUnknownFields);
    const balanceRes = resolveEvidence(composition?.visualBalance, 'composition.visualBalance', omittedUnknownFields);
    const negRes = resolveEvidence(composition?.negativeSpace, 'composition.negativeSpace', omittedUnknownFields);
    const cropRes = resolveEvidence(frame?.crop, 'frame.crop', omittedUnknownFields);
    const headroomRes = resolveEvidence(frame?.headroom, 'frame.headroom', omittedUnknownFields);

    const compParts: string[] = [];
    if (cropRes) compParts.push(`crop: ${cropRes.text}`);
    if (placeRes) compParts.push(`subject placement: ${placeRes.text}`);
    if (balanceRes) compParts.push(`balance: ${balanceRes.text}`);
    if (headroomRes) compParts.push(`headroom: ${headroomRes.text}`);
    if (negRes) compParts.push(`negative space: ${negRes.text}`);

    if (compParts.length > 0) {
      promptSections.push(`Composition: ${compParts.join(', ')}.`);
      includedSections.push('15. crop / composition');
    }
  }

  // =========================================================================
  // 16. TEXTURE / MATERIAL BEHAVIOR
  // =========================================================================
  {
    const skinTexRes = resolveEvidence(texture?.skinTexture, 'texture.skinTexture', omittedUnknownFields);
    const fabTexRes = resolveEvidence(texture?.fabricTexture, 'texture.fabricTexture', omittedUnknownFields);
    const surfTexRes = resolveEvidence(texture?.surfaceTexture, 'texture.surfaceTexture', omittedUnknownFields);
    const glossRes = resolveEvidence(texture?.gloss, 'texture.gloss', omittedUnknownFields);
    const refRes = resolveEvidence(texture?.reflections, 'texture.reflections', omittedUnknownFields);
    const fineRes = resolveEvidence(texture?.fineDetail, 'texture.fineDetail', omittedUnknownFields);

    const texParts: string[] = [];
    if (skinTexRes) texParts.push(`skin: ${skinTexRes.text}`);
    if (fabTexRes) texParts.push(`fabric: ${fabTexRes.text}`);
    if (surfTexRes) texParts.push(`surfaces: ${surfTexRes.text}`);
    if (glossRes) texParts.push(`finish: ${glossRes.text}`);
    if (refRes) texParts.push(`reflections: ${refRes.text}`);
    if (fineRes) texParts.push(`details: ${fineRes.text}`);

    if (texParts.length > 0) {
      promptSections.push(`Textures & Materials: ${texParts.join(', ')}.`);
      includedSections.push('16. texture / material behavior');
    }
  }

  // =========================================================================
  // 17. REALISM / STYLE
  // =========================================================================
  {
    const treatmentRes = resolveEvidence(style?.visualTreatment, 'style.visualTreatment', omittedUnknownFields);
    const retouchRes = resolveEvidence(style?.retouching, 'style.retouching', omittedUnknownFields);
    const plausRes = resolveEvidence(style?.materialPlausibility, 'style.materialPlausibility', omittedUnknownFields);

    const styleParts: string[] = [];
    if (treatmentRes) styleParts.push(treatmentRes.text);
    if (retouchRes) styleParts.push(`retouching: ${retouchRes.text}`);
    if (plausRes) styleParts.push(`material behavior: ${plausRes.text}`);

    if (styleParts.length > 0) {
      promptSections.push(`Style & Realism: ${styleParts.join(', ')}.`);
      includedSections.push('17. realism / style');
    }
  }

  // =========================================================================
  // 18. PRESERVATION CONSTRAINTS
  // =========================================================================
  {
    const constraints: string[] = [];

    if (preservation.preservePose) constraints.push('observed pose and limb articulation');
    if (preservation.preserveWardrobe) constraints.push('wardrobe garments and fit');
    if (preservation.preserveColors) constraints.push('garment and background color palette');
    if (preservation.preservePhysicalBranding) constraints.push('physical branding and labels');
    if (preservation.preserveRelativeProportions) constraints.push('relative proportions');
    if (preservation.preserveCrop) constraints.push('framing and crop relationships');
    if (preservation.preserveSubjectPlacement) constraints.push('subject placement');
    if (preservation.preserveOcclusions) constraints.push('natural occlusions');

    const ruleClauses: string[] = [];
    if (constraints.length > 0) {
      ruleClauses.push(`Preserve the ${constraints.join(', ')}.`);
    }

    if (preservation.avoidUnsupportedObjects) {
      ruleClauses.push('Do not add unsupported objects.');
    }
    if (preservation.avoidUnsupportedDetails || preservation.preferUnknownOverFabrication) {
      ruleClauses.push('Do not fabricate unseen or ambiguous details.');
    }

    if (ruleClauses.length > 0) {
      promptSections.push(`Preservation Constraints: ${ruleClauses.join(' ')}`);
      includedSections.push('18. preservation constraints');
    }
  }

  // Final Prompt Construction (Deterministic joining with double newline separation)
  const fullPrompt = promptSections.join('\n\n');

  // Metadata Extraction for Wrapper
  const extractedFormat = frame?.framing?.value || (frame?.orientation?.value ? `${frame.orientation.value} portrait` : 'photograph');
  const extractedAspectRatio = frame?.aspectRatio?.value || (frame?.orientation?.value === 'portrait' ? '3:4' : frame?.orientation?.value === 'landscape' ? '16:9' : '1:1');
  const extractedStyle = style?.realismLevel?.value || style?.visualTreatment?.value || 'photographic';

  return {
    prompt: fullPrompt,
    format: extractedFormat,
    aspectRatio: extractedAspectRatio,
    style: extractedStyle,
    includedSections,
    omittedUnknownFields: Array.from(new Set(omittedUnknownFields))
  };
}
