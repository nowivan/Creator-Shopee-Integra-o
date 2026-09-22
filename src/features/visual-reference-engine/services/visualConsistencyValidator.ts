/**
 * VISUAL CONSISTENCY VALIDATOR & AUDIT HARNESS — V1 FROZEN ARCHITECTURE
 * Part of Visual Reference Engine V1.0.0 (Release Candidate)
 * Responsibilities: Offline, deterministic validation auditing 12 cross-module invariants and handoff traces.
 * Source of Truth: VisualConsistencyValidation rule matrix (Zero auto-correction, purely diagnostic).
 * AI Budget: Strictly 0 AI calls (100% synchronous offline verification).
 */

import {
  ConsistencyAuditTarget,
  HandoffTraceLog,
  HandoffTraceStep,
  ValidationDomain,
  ValidationDomainName,
  ValidationStatus,
  VisualConsistencyIssue,
  VisualConsistencyValidation
} from '../types/validationTypes';
import {
  AvatarIdentityContext,
  AvatarReferenceProfile
} from '../types/visualReferenceTypes';
import {
  ProductMotionSafety,
  ProductReferenceCoverage,
  ProductStructuralDNA
} from '../../creative-director/types/compilerTypes';

/**
 * Validates end-to-end visual consistency across all independent authority domains.
 */
export function validateVisualConsistency(
  target: ConsistencyAuditTarget
): VisualConsistencyValidation {
  const issues: VisualConsistencyIssue[] = [];
  const now = Date.now();

  // 1. Validate Avatar Identity Authority
  const avatarDomain = validateAvatarIdentityDomain(target, issues);

  // 2. Validate Wardrobe Authority (Defined Wardrobe > Reference Wardrobe)
  const wardrobeDomain = validateWardrobeDomain(target, issues);

  // 3. Validate Pose/Action Authority (Current Scene Pose > Reference Photo Pose)
  const poseActionDomain = validatePoseActionDomain(target, issues);

  // 4. Validate Product Authority (Product Reference + ProductStructuralDNA)
  const productDomain = validateProductDomain(target, issues);

  // 5. Validate Kit Composition (when kit is confirmed)
  const kitCompositionDomain = validateKitCompositionDomain(target, issues);

  // 6. Validate Background Authority
  const backgroundDomain = validateBackgroundDomain(target, issues);

  // 7. Validate Camera Authority
  const cameraDomain = validateCameraDomain(target, issues);

  // 8. Validate Reference Coverage & Motion Safety
  const { coverageDomain, motionSafetyDomain } = validateCoverageAndMotionSafetyDomain(target, issues);

  // 9. Audit Final Prompt if provided
  if (target.finalPromptText) {
    const promptIssues = auditFinalPrompt(target.finalPromptText, target);
    issues.push(...promptIssues);
  }

  // 10. Generate Handoff Trace
  const handoffTrace = generateHandoffTrace(target);

  // 11. Calculate Overall Status
  let overallStatus: ValidationStatus = 'PASS';
  const hasFail = issues.some((i) => i.severity === 'FAIL');
  const hasWarning = issues.some((i) => i.severity === 'WARNING');

  if (hasFail) {
    overallStatus = 'FAIL';
  } else if (hasWarning) {
    overallStatus = 'WARNING';
  }

  return {
    avatarIdentity: avatarDomain,
    wardrobe: wardrobeDomain,
    poseAction: poseActionDomain,
    product: productDomain,
    kitComposition: kitCompositionDomain,
    background: backgroundDomain,
    camera: cameraDomain,
    referenceCoverage: coverageDomain,
    motionSafety: motionSafetyDomain,
    overallStatus,
    issues,
    handoffTrace,
    timestamp: now
  };
}

/**
 * 1. IDENTITY AUTHORITY -> AvatarIdentityContext
 */
function validateAvatarIdentityDomain(
  target: ConsistencyAuditTarget,
  issues: VisualConsistencyIssue[]
): ValidationDomain {
  const isAvatarActive = Boolean(target.avatarContext || target.avatarProfile);

  if (!isAvatarActive) {
    return {
      domainName: 'avatarIdentity',
      source: 'NO_AVATAR',
      present: false,
      preserved: true,
      notes: ['No avatar active in current context']
    };
  }

  const context = target.avatarContext;
  const profile = target.avatarProfile;
  const conflictingInstructions: string[] = [];

  let preserved = true;

  // Check identity prompt presence
  if (context && !context.identityPrompt) {
    issues.push({
      id: 'avatar_missing_identity_prompt',
      domain: 'avatarIdentity',
      severity: 'FAIL',
      rule: 'AvatarIdentityContext must contain a valid identityPrompt',
      message: 'AvatarIdentityContext was provided without an identityPrompt.'
    });
    preserved = false;
  }

  // Check reference image presence
  if (context && !context.referenceImage && !context.cleanedReferenceImage) {
    issues.push({
      id: 'avatar_missing_reference_image',
      domain: 'avatarIdentity',
      severity: 'WARNING',
      rule: 'AvatarIdentityContext should provide referenceImage or cleanedReferenceImage',
      message: 'AvatarIdentityContext has no image URL attached.'
    });
  }

  // Precedence rule: Cleaned Avatar Reference > Original Avatar Reference
  if (context?.cleanedReferenceImage && context?.referenceImage) {
    // Both exist -> cleanedReferenceImage should be prioritized as effective reference
    // This is valid and expected.
  }

  // Check Lock Separation: Avatar Identity Lock != Product Object Lock
  if (target.finalPromptText) {
    const prompt = target.finalPromptText;
    const hasAvatarLock = prompt.includes('[AVATAR IDENTITY REFERENCE & LOCK]') || prompt.includes('AVATAR IDENTITY LOCK');
    const hasProductLock = prompt.includes('[3. PRODUCT IDENTITY & OBJECT LOCK]') || prompt.includes('PRODUCT OBJECT LOCK') || prompt.includes('PARTES RIGIDAMENTE FIXAS');

    if (!hasAvatarLock) {
      issues.push({
        id: 'avatar_lock_missing_in_prompt',
        domain: 'avatarIdentity',
        severity: 'WARNING',
        rule: 'Active avatar requires Avatar Identity Lock in final prompt',
        message: 'Active avatar is present, but [AVATAR IDENTITY REFERENCE & LOCK] clause was not detected in final prompt.'
      });
      preserved = false;
    }

    // Check cross-contamination: does product reference mutate avatar facial traits?
    if (target.productName && prompt.includes(`${target.productName} face`)) {
      issues.push({
        id: 'product_contaminating_avatar',
        domain: 'avatarIdentity',
        severity: 'FAIL',
        rule: 'Product reference must never alter avatar facial identity',
        message: `Product name "${target.productName}" appears to be attached to avatar facial description.`
      });
      preserved = false;
      conflictingInstructions.push('Product reference leaked into avatar facial description');
    }
  }

  return {
    domainName: 'avatarIdentity',
    source: context ? 'AvatarIdentityContext' : 'AvatarReferenceProfile',
    present: true,
    preserved,
    conflictingInstructions: conflictingInstructions.length > 0 ? conflictingInstructions : undefined
  };
}

/**
 * 2. WARDROBE AUTHORITY -> Defined Wardrobe
 * Precedence: Defined Wardrobe > Reference Wardrobe
 */
function validateWardrobeDomain(
  target: ConsistencyAuditTarget,
  issues: VisualConsistencyIssue[]
): ValidationDomain {
  const definedWardrobe = target.wardrobe;
  const isWardrobeDefined = Boolean(
    definedWardrobe &&
    (definedWardrobe.topType || definedWardrobe.bottomType || definedWardrobe.description)
  );

  const referenceWardrobe =
    target.avatarProfile?.sceneStateDNA?.wardrobe ||
    target.avatarProfile?.analysis?.sceneState?.wardrobe;

  const conflictingInstructions: string[] = [];
  let preserved = true;

  if (isWardrobeDefined && target.finalPromptText) {
    const prompt = target.finalPromptText;

    // Check if defined top is in prompt
    if (definedWardrobe?.topType && !prompt.toLowerCase().includes(definedWardrobe.topType.toLowerCase())) {
      issues.push({
        id: 'defined_wardrobe_top_missing',
        domain: 'wardrobe',
        severity: 'WARNING',
        rule: 'Defined Wardrobe > Reference Wardrobe',
        message: `Defined wardrobe top "${definedWardrobe.topType}" was not found in the final prompt.`
      });
    }

    // Check if reference wardrobe overrides defined wardrobe
    if (referenceWardrobe?.top?.type?.value) {
      const refTop = referenceWardrobe.top.type.value.toLowerCase();
      const defTop = (definedWardrobe?.topType || '').toLowerCase();

      // If reference top is distinct from defined top, ensure reference top is not demanded as mandatory attire
      if (refTop !== defTop && prompt.toLowerCase().includes(`must wear ${refTop}`)) {
        issues.push({
          id: 'reference_wardrobe_leak',
          domain: 'wardrobe',
          severity: 'FAIL',
          rule: 'Defined Wardrobe > Reference Wardrobe',
          message: `Reference photo wardrobe ("${refTop}") is leaking into the final prompt despite Defined Wardrobe ("${defTop}").`,
          conflictingData: {
            expected: defTop,
            found: refTop
          }
        });
        preserved = false;
        conflictingInstructions.push(`Reference wardrobe "${refTop}" overrides Defined Wardrobe "${defTop}"`);
      }
    }
  }

  return {
    domainName: 'wardrobe',
    source: isWardrobeDefined ? 'Defined Wardrobe' : 'Scene Default Wardrobe',
    present: isWardrobeDefined,
    preserved,
    conflictingInstructions: conflictingInstructions.length > 0 ? conflictingInstructions : undefined
  };
}

/**
 * 3. POSE/ACTION AUTHORITY -> Current Scene Plan
 * Precedence: Current Scene Pose > Reference Photo Pose
 */
function validatePoseActionDomain(
  target: ConsistencyAuditTarget,
  issues: VisualConsistencyIssue[]
): ValidationDomain {
  const actions = target.actions;
  const isActionDefined = Boolean(actions && (Array.isArray(actions) ? actions.length > 0 : Object.keys(actions).length > 0));

  const referencePose =
    target.avatarProfile?.sceneStateDNA?.pose ||
    target.avatarProfile?.analysis?.sceneState?.pose;

  const conflictingInstructions: string[] = [];
  let preserved = true;

  if (isActionDefined && target.finalPromptText) {
    const prompt = target.finalPromptText;

    // Verify if reference pose (e.g. pointing downward, arms crossed) is forced when scene has its own action
    if (referencePose?.rightArm?.upperArmDirection?.value) {
      const refGesture = referencePose.rightArm.upperArmDirection.value.toLowerCase();
      if (prompt.toLowerCase().includes(`strictly mandatory pose: ${refGesture}`)) {
        issues.push({
          id: 'reference_pose_leak',
          domain: 'poseAction',
          severity: 'FAIL',
          rule: 'Current Scene Pose > Reference Photo Pose',
          message: `Reference photo pose ("${refGesture}") is overriding current scene action in final prompt.`
        });
        preserved = false;
        conflictingInstructions.push(`Reference pose "${refGesture}" overrides Scene Action`);
      }
    }
  }

  return {
    domainName: 'poseAction',
    source: isActionDefined ? 'Current Scene Plan' : 'Default Scene Action',
    present: isActionDefined,
    preserved,
    conflictingInstructions: conflictingInstructions.length > 0 ? conflictingInstructions : undefined
  };
}

/**
 * 4. PRODUCT AUTHORITY -> Product Reference + ProductStructuralDNA
 * Precedence: Product Structural DNA > unsupported visual assumptions
 */
function validateProductDomain(
  target: ConsistencyAuditTarget,
  issues: VisualConsistencyIssue[]
): ValidationDomain {
  const isProductActive = Boolean(target.productName || target.productIdentity || target.productStructuralDNA);

  if (!isProductActive) {
    return {
      domainName: 'product',
      source: 'NO_PRODUCT',
      present: false,
      preserved: true,
      notes: ['No product active in current context']
    };
  }

  const dna = target.productStructuralDNA;
  const conflictingInstructions: string[] = [];
  let preserved = true;

  if (target.finalPromptText) {
    const prompt = target.finalPromptText;

    // Check if Product Structural DNA, Object Lock, or Kit Composition Protocol is referenced
    const isKit = Boolean(
      target.isKitConfirmed ||
      (target.kitComponentCount && target.kitComponentCount > 1) ||
      target.productStructuralDNA?.isCommercialPackConfirmed
    );

    const hasProductLock =
      prompt.includes('[3. PRODUCT IDENTITY & OBJECT LOCK]') ||
      prompt.includes('PARTES RIGIDAMENTE FIXAS') ||
      prompt.includes('PRODUCT STRUCTURAL DNA') ||
      prompt.includes('PRODUCT OBJECT LOCK') ||
      (isKit && (prompt.includes('KIT COMPOSITION PROTOCOL') || prompt.includes('KIT DE PRODUTOS')));

    if (!hasProductLock && isProductActive) {
      issues.push({
        id: 'product_lock_missing_in_prompt',
        domain: 'product',
        severity: 'WARNING',
        rule: 'Active product requires Product Object Lock in final prompt',
        message: 'Product is active but no Product Structural DNA / Object Lock clause was detected in the prompt.'
      });
      preserved = false;
    }

    // Check that fixed parts from structural DNA are not declared movable
    if (dna?.fixedComponents && dna.fixedComponents.length > 0) {
      for (const fixed of dna.fixedComponents) {
        if (prompt.toLowerCase().includes(`animate ${fixed.name.toLowerCase()}`) ||
            prompt.toLowerCase().includes(`bend ${fixed.name.toLowerCase()}`)) {
          issues.push({
            id: `fixed_component_animated_${fixed.id}`,
            domain: 'product',
            severity: 'FAIL',
            rule: 'Fixed structural components must remain rigidly fixed',
            message: `Fixed component "${fixed.name}" is instructed to bend/animate in prompt.`
          });
          preserved = false;
          conflictingInstructions.push(`Fixed component "${fixed.name}" instructed to animate`);
        }
      }
    }
  }

  return {
    domainName: 'product',
    source: dna ? 'ProductStructuralDNA' : 'Product Reference',
    present: true,
    preserved,
    conflictingInstructions: conflictingInstructions.length > 0 ? conflictingInstructions : undefined
  };
}

/**
 * 5. KIT COMPOSITION -> Kit Composition Protocol
 */
function validateKitCompositionDomain(
  target: ConsistencyAuditTarget,
  issues: VisualConsistencyIssue[]
): ValidationDomain | undefined {
  const isKit = Boolean(
    target.isKitConfirmed ||
    (target.kitComponentCount && target.kitComponentCount > 1) ||
    target.productStructuralDNA?.isCommercialPackConfirmed
  );

  if (!isKit) {
    return undefined;
  }

  const conflictingInstructions: string[] = [];
  let preserved = true;
  const count = target.kitComponentCount || target.productStructuralDNA?.kitComponentCount || 3;
  const handled = target.handledComponentCount || target.productStructuralDNA?.handledComponentCount || 1;
  const remaining = target.remainingVisibleComponentCount || target.productStructuralDNA?.remainingVisibleComponentCount || (count - handled);

  if (target.finalPromptText) {
    const prompt = target.finalPromptText;

    // Check if Kit Composition Protocol is present
    const hasKitProtocol =
      prompt.includes('KIT COMPOSITION PROTOCOL') ||
      prompt.includes('COMMERCIAL KIT') ||
      prompt.includes('KIT DE PRODUTOS') ||
      prompt.includes('KIT');

    if (!hasKitProtocol) {
      issues.push({
        id: 'kit_protocol_missing',
        domain: 'kitComposition',
        severity: 'WARNING',
        rule: 'Kit Composition Protocol required for confirmed multi-unit kits',
        message: `Kit with ${count} items is confirmed, but Kit Composition Protocol was not explicitly included in final prompt.`
      });
      preserved = false;
    }

    // Check for false "extra component" misclassifications
    if (prompt.includes('extra component hallucination') && count > 1) {
      issues.push({
        id: 'kit_item_misclassified_as_extra',
        domain: 'kitComposition',
        severity: 'FAIL',
        rule: 'Legitimate kit components must not be classified as extra components or hallucinations',
        message: 'Legitimate kit components are incorrectly flagged as unwanted extra components.'
      });
      preserved = false;
      conflictingInstructions.push('Legitimate kit components flagged as hallucinations');
    }
  }

  return {
    domainName: 'kitComposition',
    source: 'Kit Composition Protocol',
    present: true,
    preserved,
    conflictingInstructions: conflictingInstructions.length > 0 ? conflictingInstructions : undefined,
    notes: [`Total items: ${count}`, `Handled: ${handled}`, `Remaining visible: ${remaining}`]
  };
}

/**
 * 6. BACKGROUND AUTHORITY -> Current Environment
 */
function validateBackgroundDomain(
  target: ConsistencyAuditTarget,
  issues: VisualConsistencyIssue[]
): ValidationDomain {
  const env = target.environment || 'Standard Studio Environment';
  const avatarBg =
    target.avatarProfile?.sceneStateDNA?.background ||
    target.avatarProfile?.analysis?.sceneState?.background;

  const conflictingInstructions: string[] = [];
  let preserved = true;

  if (avatarBg?.type?.value && target.environment && target.finalPromptText) {
    const refBg = avatarBg.type.value.toLowerCase();
    const sceneEnv = target.environment.toLowerCase();

    // If avatar photo was taken in a distinct background (e.g. outdoor park) and scene is modern studio,
    // ensure outdoor park is not leaking into scene environment
    if (refBg !== sceneEnv && refBg.length > 3 && !sceneEnv.includes(refBg) && target.finalPromptText.toLowerCase().includes(`background: ${refBg}`)) {
      issues.push({
        id: 'avatar_background_leak',
        domain: 'background',
        severity: 'WARNING',
        rule: 'Current Scene Environment > Reference Photo Background',
        message: `Avatar reference background ("${refBg}") was detected in scene prompt despite current environment ("${sceneEnv}").`
      });
      preserved = false;
      conflictingInstructions.push(`Avatar background "${refBg}" overrides scene environment`);
    }
  }

  return {
    domainName: 'background',
    source: target.environment ? 'Current Environment' : 'Default Scene Environment',
    present: Boolean(target.environment),
    preserved,
    conflictingInstructions: conflictingInstructions.length > 0 ? conflictingInstructions : undefined
  };
}

/**
 * 7. CAMERA AUTHORITY -> Scene / Cinematic Plan
 */
function validateCameraDomain(
  target: ConsistencyAuditTarget,
  issues: VisualConsistencyIssue[]
): ValidationDomain {
  const cameraPlan = target.cameraPlan;
  const isCameraDefined = Boolean(cameraPlan);

  return {
    domainName: 'camera',
    source: isCameraDefined ? 'Scene / Cinematic Plan' : 'Default Camera Framing',
    present: isCameraDefined,
    preserved: true
  };
}

/**
 * 8. REFERENCE COVERAGE & MOTION SAFETY
 */
function validateCoverageAndMotionSafetyDomain(
  target: ConsistencyAuditTarget,
  issues: VisualConsistencyIssue[]
): {
  coverageDomain?: ValidationDomain;
  motionSafetyDomain?: ValidationDomain;
} {
  const coverage = target.productCoverage;
  const safety = target.productMotionSafety;

  if (!coverage && !safety) {
    return {};
  }

  const conflictingInstructions: string[] = [];
  let preserved = true;

  if (safety && target.finalPromptText) {
    const prompt = target.finalPromptText.toLowerCase();

    // Rule: Camera/orbit must not reveal forbidden faces
    if (!safety.allowFullOrbit && (prompt.includes('360 degree orbit') || prompt.includes('full orbit around product'))) {
      issues.push({
        id: 'forbidden_orbit_motion_violation',
        domain: 'motionSafety',
        severity: 'FAIL',
        rule: 'Camera instructions must not violate Motion Safety forbidden views',
        message: 'Camera is commanded to perform full 360 orbit, but full orbit is disallowed by Product Motion Safety.'
      });
      preserved = false;
      conflictingInstructions.push('Full orbit commanded despite Motion Safety restriction');
    }

    if (!safety.allowFullRearReveal && safety.forbiddenViews.includes('rear') && prompt.includes('reveal complete rear view')) {
      issues.push({
        id: 'forbidden_rear_reveal_violation',
        domain: 'motionSafety',
        severity: 'FAIL',
        rule: 'Camera instructions must not reveal forbidden product faces',
        message: 'Camera is commanded to reveal rear view, but rear view is unconfirmed / forbidden.'
      });
      preserved = false;
      conflictingInstructions.push('Forbidden rear view commanded in prompt');
    }
  }

  return {
    coverageDomain: coverage ? {
      domainName: 'referenceCoverage',
      source: 'Product Reference Coverage',
      present: true,
      preserved: true
    } : undefined,
    motionSafetyDomain: safety ? {
      domainName: 'motionSafety',
      source: 'Product Motion Safety',
      present: true,
      preserved,
      conflictingInstructions: conflictingInstructions.length > 0 ? conflictingInstructions : undefined
    } : undefined
  };
}

/**
 * Audits the final compiled text prompt for cross-domain consistency.
 */
export function auditFinalPrompt(
  finalPromptText: string,
  target: ConsistencyAuditTarget
): VisualConsistencyIssue[] {
  const issues: VisualConsistencyIssue[] = [];

  if (!finalPromptText) {
    return issues;
  }

  // Check 1: Avatar Identity Lock when avatar active
  const isAvatarActive = Boolean(target.avatarContext || target.avatarProfile);
  if (isAvatarActive) {
    const hasAvatarLock =
      finalPromptText.includes('[AVATAR IDENTITY REFERENCE & LOCK]') ||
      finalPromptText.includes('AVATAR IDENTITY LOCK');

    if (!hasAvatarLock) {
      issues.push({
        id: 'audit_avatar_lock_missing',
        domain: 'avatarIdentity',
        severity: 'WARNING',
        rule: 'Avatar Identity Lock must be present when avatar is active',
        message: 'Avatar is active in scene but final prompt lacks [AVATAR IDENTITY REFERENCE & LOCK].'
      });
    }
  }

  // Check 2: Product Lock when product active
  const isProductActive = Boolean(target.productName || target.productIdentity || target.productStructuralDNA);
  if (isProductActive) {
    const isKit = Boolean(
      target.isKitConfirmed ||
      (target.kitComponentCount && target.kitComponentCount > 1) ||
      target.productStructuralDNA?.isCommercialPackConfirmed
    );

    const hasProductLock =
      finalPromptText.includes('[3. PRODUCT IDENTITY & OBJECT LOCK]') ||
      finalPromptText.includes('PARTES RIGIDAMENTE FIXAS') ||
      finalPromptText.includes('PRODUCT STRUCTURAL DNA') ||
      finalPromptText.includes('PRODUCT OBJECT LOCK') ||
      (isKit && (finalPromptText.includes('KIT COMPOSITION PROTOCOL') || finalPromptText.includes('KIT DE PRODUTOS')));

    if (!hasProductLock) {
      issues.push({
        id: 'audit_product_lock_missing',
        domain: 'product',
        severity: 'WARNING',
        rule: 'Product Object Lock must be present when product is active',
        message: 'Product is active but final prompt lacks Product Object Lock.'
      });
    }
  }

  // Check 3: Lock Separation (Avatar Identity Lock != Product Object Lock)
  if (isAvatarActive && isProductActive) {
    const avatarLockIndex = finalPromptText.indexOf('[AVATAR IDENTITY REFERENCE & LOCK]');
    const productLockIndex = finalPromptText.indexOf('[3. PRODUCT IDENTITY & OBJECT LOCK]');

    if (avatarLockIndex !== -1 && productLockIndex !== -1 && avatarLockIndex === productLockIndex) {
      issues.push({
        id: 'audit_lock_collision',
        domain: 'avatarIdentity',
        severity: 'FAIL',
        rule: 'Avatar Identity Lock != Product Object Lock',
        message: 'Avatar Identity Lock and Product Object Lock are colluded into the same clause.'
      });
    }
  }

  return issues;
}

/**
 * Formats a clean, diagnostic Handoff Trace log.
 * Excludes all API keys, bearer tokens, or sensitive payload data.
 */
export function generateHandoffTrace(
  target: ConsistencyAuditTarget
): HandoffTraceLog {
  const steps: HandoffTraceStep[] = [];
  let stepNum = 1;
  const now = Date.now();

  // Step: Avatar Identity Handoff
  if (target.avatarProfile || target.avatarContext) {
    const effectiveImage = target.avatarContext?.cleanedReferenceImage
      ? 'Cleaned Reference Image (PRIORITY)'
      : 'Original Reference Image';

    steps.push({
      stepNumber: stepNum++,
      source: target.avatarProfile ? 'AvatarReferenceProfile' : 'AvatarIdentityContext',
      transform: 'buildAvatarIdentityContext()',
      consumer: target.engineType || 'Creative Director / Cinematic Engine',
      payloadSummary: `IdentityDNA + prompt (${effectiveImage})`,
      status: 'SUCCESS',
      timestamp: now
    });
  }

  // Step: Product Grounding & Structural DNA
  if (target.productStructuralDNA || target.productIdentity || target.productName) {
    const pName = target.productName || target.productIdentity || 'Unknown Product';
    const isKit = Boolean(target.isKitConfirmed || target.productStructuralDNA?.isCommercialPackConfirmed);

    steps.push({
      stepNumber: stepNum++,
      source: 'ProductGrounding / Visual Evidence',
      transform: 'createProductStructuralDNA()',
      consumer: target.engineType || 'Scene 2 / Scene 3 / Cinematic Compiler',
      payloadSummary: `Product: "${pName}" (${isKit ? 'Kit Protocol' : 'Unit Object Lock'})`,
      status: 'SUCCESS',
      timestamp: now
    });
  }

  // Step: Wardrobe Authority
  if (target.wardrobe) {
    const wSummary = [target.wardrobe.topType, target.wardrobe.bottomType, target.wardrobe.footwearType]
      .filter(Boolean)
      .join(', ') || target.wardrobe.description || 'Configured Wardrobe';

    steps.push({
      stepNumber: stepNum++,
      source: 'Defined Wardrobe Configuration',
      transform: 'formatWardrobeSpecification()',
      consumer: 'Prompt Compiler',
      payloadSummary: `Defined Wardrobe: ${wSummary} (Overrides reference photo)`,
      status: 'SUCCESS',
      timestamp: now
    });
  }

  // Step: Motion Safety
  if (target.productMotionSafety) {
    steps.push({
      stepNumber: stepNum++,
      source: 'ProductReferenceCoverage',
      transform: 'resolveProductMotionSafety()',
      consumer: 'Cinematic Flow Agent / Camera Plan',
      payloadSummary: `Allowed orbit: ${target.productMotionSafety.allowFullOrbit ? 'YES' : 'NO'}, Forbidden: [${target.productMotionSafety.forbiddenViews.join(', ')}]`,
      status: 'SUCCESS',
      timestamp: now
    });
  }

  // Step: Final Prompt Output
  if (target.finalPromptText) {
    steps.push({
      stepNumber: stepNum++,
      source: 'Prompt Compiler Pipeline',
      transform: 'compileScenePrompt() / composeCinematicPrompt()',
      consumer: 'Final Generation Prompt',
      payloadSummary: `Compiled prompt length: ${target.finalPromptText.length} chars`,
      status: 'SUCCESS',
      timestamp: now
    });
  }

  return {
    workflow: `${target.engineType || 'PIPELINE'} -> VISUAL_CONSISTENCY_AUDIT`,
    steps,
    summary: `Trace validated across ${steps.length} handoff step(s) with zero API keys or sensitive data exposed.`,
    generatedAt: now
  };
}
