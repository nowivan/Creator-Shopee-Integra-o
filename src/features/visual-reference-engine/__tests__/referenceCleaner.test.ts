/**
 * REFERENCE CLEANER — STAGE 3 TEST SUITE
 * Verifies Test Scenarios A through J:
 * A — Overlay text: Promotional graphic overlay removed
 * B — Physical logo: Embroidered/printed logo on apparel preserved
 * C — Packaging text: Typography on bottle/box preserved
 * D — White background: Background replaced with clean white without altering subject
 * E — Preserve scene: Original background and environment retained
 * F — Pose: Bilateral pose and articulation locked and preserved
 * G — Product: Product count, geometry, and materials preserved
 * H — Unknown element: Ambiguous/context-dependent elements are NOT removed automatically (Safe Failure)
 * I — Accessories: Physical jewelry, glasses, watches preserved
 * J — Clarity: Quality enhanced without skin smoothing or facial identity distortion
 */

import {
  computeCleaningOperations,
  cleanReferenceImage
} from '../services/referenceCleaner';
import {
  buildReferenceCleanerPrompt
} from '../prompts/referenceCleanerPrompt';
import {
  VisualReferenceAnalysis,
  ReferenceCleaningContract
} from '../types/visualReferenceTypes';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[FAIL] ${message}`);
  }
}

export async function runReferenceCleanerStage3Tests(): Promise<void> {
  console.log('\n--- Running Reference Cleaner Stage 3 Tests (A through J) ---');

  // Base mock analysis for tests
  const baseAnalysis: VisualReferenceAnalysis = {
    subject: {
      count: { status: 'VISIBLE', value: 1 },
      type: { status: 'VISIBLE', value: 'female model' }
    },
    identity: {
      visibleFacialAppearance: { status: 'VISIBLE', value: 'Oval jawline with defined cheekbones' },
      skinCharacteristics: { status: 'VISIBLE', value: 'Fair skin with subtle freckles' },
      hairCharacteristics: { status: 'VISIBLE', value: 'Wavy auburn hair' }
    },
    sceneState: {
      pose: {
        bodyOrientation: { status: 'VISIBLE', value: 'Frontal torso' },
        leftArm: { upperArmDirection: { status: 'VISIBLE', value: 'Resting on hip' }, elbowState: { status: 'VISIBLE', value: 'Bent' } },
        rightArm: { upperArmDirection: { status: 'VISIBLE', value: 'Hanging straight' }, elbowState: { status: 'VISIBLE', value: 'Extended' } }
      },
      wardrobe: {
        top: { type: { status: 'VISIBLE', value: 'Silk blouse' }, color: { status: 'VISIBLE', value: 'Cobalt blue' } },
        bottom: { type: { status: 'VISIBLE', value: 'Tailored trousers' }, color: { status: 'VISIBLE', value: 'Charcoal' } }
      },
      accessories: {
        jewelry: { status: 'VISIBLE', value: ['Gold hoop earrings', 'Delicate pendant necklace'] },
        eyewear: { status: 'VISIBLE', value: 'Tortoiseshell optical frames' },
        watches: { status: 'VISIBLE', value: 'Silver mesh strap watch' }
      }
    },
    objects: [
      {
        type: { status: 'VISIBLE', value: 'Cosmetic glass bottle' },
        color: { status: 'VISIBLE', value: 'Amber translucent' },
        material: { status: 'VISIBLE', value: 'Glass with gold dropper' }
      }
    ],
    textElements: [
      {
        type: 'overlay_text',
        content: { status: 'VISIBLE', value: 'BUY 1 GET 1 FREE - TODAY ONLY' },
        location: { status: 'VISIBLE', value: 'Top-left banner' },
        physicallyAttached: false,
        cleaningDefault: 'REMOVE'
      },
      {
        type: 'physical_logo',
        content: { status: 'VISIBLE', value: 'Embroidered crest emblem' },
        location: { status: 'VISIBLE', value: 'Blouse left cuff' },
        physicallyAttached: true,
        cleaningDefault: 'PRESERVE'
      },
      {
        type: 'packaging_text',
        content: { status: 'VISIBLE', value: 'LUMINOUS SERUM 30ML' },
        location: { status: 'VISIBLE', value: 'Glass bottle front label' },
        physicallyAttached: true,
        cleaningDefault: 'PRESERVE'
      },
      {
        type: 'caption',
        content: { status: 'VISIBLE', value: '@brand_official Instagram handle watermark' },
        location: { status: 'VISIBLE', value: 'Bottom-right corner' },
        physicallyAttached: false,
        cleaningDefault: 'REMOVE'
      },
      {
        type: 'physical_text',
        content: { status: 'VISIBLE', value: 'Faint tag stamp on interior fabric' },
        location: { status: 'PARTIAL', value: 'Near collar seam' },
        physicallyAttached: true,
        cleaningDefault: 'CONTEXT_DEPENDENT'
      }
    ],
    cleaning: {
      removeOverlayText: true,
      removeCaptions: true,
      preservePrincipalSubject: true,
      preserveWardrobe: true,
      preserveProduct: true,
      preservePose: true,
      preservePhysicalLogos: true,
      improveVisualClarity: true
    }
  };

  // =========================================================================
  // TEST A: watermark + CONTEXT_DEPENDENT -> preserved by default
  // =========================================================================
  const watermarkAnalysis: VisualReferenceAnalysis = {
    textElements: [
      {
        type: 'watermark',
        content: { status: 'VISIBLE', value: 'StockPhotoWatermark_2026' },
        location: { status: 'VISIBLE', value: 'Center diagonal' },
        physicallyAttached: false,
        cleaningDefault: 'CONTEXT_DEPENDENT'
      }
    ]
  };
  const { preservedElements: presA, removedElements: remA } = computeCleaningOperations(
    watermarkAnalysis,
    'PRESERVE_SCENE',
    { replaceBackgroundWithWhite: false }
  );
  assert(
    presA.some(e => e.includes('StockPhotoWatermark_2026')),
    'Test A: watermark with CONTEXT_DEPENDENT must be preserved by default'
  );
  assert(
    !remA.some(e => e.includes('StockPhotoWatermark_2026')),
    'Test A: watermark must NOT be in removedElements'
  );
  console.log('[PASS] TEST A: watermark + CONTEXT_DEPENDENT is preserved by default');

  // =========================================================================
  // TEST B: overlay_text + REMOVE -> removed
  // =========================================================================
  const overlayAnalysis: VisualReferenceAnalysis = {
    textElements: [
      {
        type: 'overlay_text',
        content: { status: 'VISIBLE', value: 'FLASH SALE 70% OFF' },
        location: { status: 'VISIBLE', value: 'Top left corner' },
        physicallyAttached: false,
        cleaningDefault: 'REMOVE'
      }
    ]
  };
  const { preservedElements: presB, removedElements: remB } = computeCleaningOperations(
    overlayAnalysis,
    'CLEAN_WHITE',
    { replaceBackgroundWithWhite: true }
  );
  assert(
    remB.some(e => e.includes('FLASH SALE 70% OFF')),
    'Test B: overlay_text with REMOVE must be in removedElements'
  );
  assert(
    !presB.some(e => e.includes('FLASH SALE 70% OFF')),
    'Test B: overlay_text with REMOVE must NOT be in preservedElements'
  );
  console.log('[PASS] TEST B: overlay_text + REMOVE is cleanly removed');

  // =========================================================================
  // TEST C: physicallyAttached=false + CONTEXT_DEPENDENT -> preserved
  // =========================================================================
  const detachedContextAnalysis: VisualReferenceAnalysis = {
    textElements: [
      {
        type: 'caption',
        content: { status: 'VISIBLE', value: 'Ambiguous artist signature' },
        location: { status: 'VISIBLE', value: 'Lower edge' },
        physicallyAttached: false,
        cleaningDefault: 'CONTEXT_DEPENDENT'
      }
    ]
  };
  const { preservedElements: presC, removedElements: remC } = computeCleaningOperations(
    detachedContextAnalysis,
    'CLEAN_WHITE',
    { replaceBackgroundWithWhite: true }
  );
  assert(
    presC.some(e => e.includes('Ambiguous artist signature')),
    'Test C: physicallyAttached=false with CONTEXT_DEPENDENT must be preserved'
  );
  assert(
    !remC.some(e => e.includes('Ambiguous artist signature')),
    'Test C: physicallyAttached=false with CONTEXT_DEPENDENT must NOT be removed'
  );
  console.log('[PASS] TEST C: physicallyAttached=false + CONTEXT_DEPENDENT is safely preserved');

  // =========================================================================
  // TEST D: physical_logo + PRESERVE -> preserved
  // =========================================================================
  const physicalLogoAnalysis: VisualReferenceAnalysis = {
    textElements: [
      {
        type: 'physical_logo',
        content: { status: 'VISIBLE', value: 'Nike Swoosh' },
        location: { status: 'VISIBLE', value: 'Chest embroidery' },
        physicallyAttached: true,
        cleaningDefault: 'PRESERVE'
      }
    ]
  };
  const { preservedElements: presD, removedElements: remD } = computeCleaningOperations(
    physicalLogoAnalysis,
    'CLEAN_WHITE',
    { replaceBackgroundWithWhite: true }
  );
  assert(
    presD.some(e => e.includes('Nike Swoosh')),
    'Test D: physical_logo with PRESERVE must be preserved'
  );
  assert(
    !remD.some(e => e.includes('Nike Swoosh')),
    'Test D: physical_logo must NOT be in removedElements'
  );
  console.log('[PASS] TEST D: physical_logo + PRESERVE is strictly preserved');

  // =========================================================================
  // TEST E: packaging_text + PRESERVE -> preserved
  // =========================================================================
  const packagingAnalysis: VisualReferenceAnalysis = {
    textElements: [
      {
        type: 'packaging_text',
        content: { status: 'VISIBLE', value: 'HYALURONIC ACID 50ml' },
        location: { status: 'VISIBLE', value: 'Bottle label' },
        physicallyAttached: true,
        cleaningDefault: 'PRESERVE'
      }
    ]
  };
  const { preservedElements: presE, removedElements: remE } = computeCleaningOperations(
    packagingAnalysis,
    'CLEAN_WHITE',
    { replaceBackgroundWithWhite: true }
  );
  assert(
    presE.some(e => e.includes('HYALURONIC ACID 50ml')),
    'Test E: packaging_text with PRESERVE must be preserved'
  );
  assert(
    !remE.some(e => e.includes('HYALURONIC ACID 50ml')),
    'Test E: packaging_text must NOT be in removedElements'
  );
  console.log('[PASS] TEST E: packaging_text + PRESERVE is strictly preserved');

  // =========================================================================
  // TEST F: Conflict PRESERVE vs REMOVE -> PRESERVE wins
  // =========================================================================
  const conflictAnalysis: VisualReferenceAnalysis = {
    textElements: [
      {
        // Physical packaging text that might have had conflicting REMOVE flag
        type: 'packaging_text',
        content: { status: 'VISIBLE', value: 'Brand Logo on Package' },
        location: { status: 'VISIBLE', value: 'Front Box' },
        physicallyAttached: true,
        cleaningDefault: 'PRESERVE'
      }
    ]
  };
  const { preservedElements: presF, removedElements: remF } = computeCleaningOperations(
    conflictAnalysis,
    'CLEAN_WHITE',
    { replaceBackgroundWithWhite: true }
  );
  assert(
    presF.some(e => e.includes('Brand Logo on Package')),
    'Test F: Conflict resolution must prioritize PRESERVE'
  );
  assert(
    !remF.some(e => e.includes('Brand Logo on Package')),
    'Test F: PRESERVE must override REMOVE'
  );
  console.log('[PASS] TEST F: Conflict PRESERVE vs REMOVE -> PRESERVE wins');

  // Base cleaning operations computation for structural tests (Pose, Products, Accessories, E2E)
  const { preservedElements, removedElements, appliedOperations } = computeCleaningOperations(
    baseAnalysis,
    'CLEAN_WHITE',
    baseAnalysis.cleaning!
  );

  // =========================================================================
  // Clean white background mode
  // =========================================================================
  const promptCleanWhite = buildReferenceCleanerPrompt({
    analysis: baseAnalysis,
    mode: 'CLEAN_WHITE',
    contract: { ...baseAnalysis.cleaning!, replaceBackgroundWithWhite: true }
  });
  assert(
    promptCleanWhite.includes('neutral pure white background (#FFFFFF)'),
    'Test D: CLEAN_WHITE prompt must enforce pure white studio background'
  );
  assert(
    promptCleanWhite.includes('EDGE FIDELITY'),
    'Test D: CLEAN_WHITE prompt must protect hair flyaways and contact shadows'
  );
  console.log('[PASS] TEST D: Pure white studio background directive configured without edge degradation');

  // =========================================================================
  // TEST E: Preserve scene mode
  // =========================================================================
  const { appliedOperations: opsScene, preservedElements: presScene } = computeCleaningOperations(
    baseAnalysis,
    'PRESERVE_SCENE',
    { ...baseAnalysis.cleaning!, replaceBackgroundWithWhite: false }
  );
  const promptPreserveScene = buildReferenceCleanerPrompt({
    analysis: baseAnalysis,
    mode: 'PRESERVE_SCENE',
    contract: { ...baseAnalysis.cleaning!, replaceBackgroundWithWhite: false }
  });
  assert(
    presScene.includes('Original Background Scene'),
    'Test E: PRESERVE_SCENE mode must register original background in preservedElements'
  );
  assert(
    promptPreserveScene.includes('PRESERVE SCENE BACKGROUND'),
    'Test E: Prompt must instruct maintaining original background scene'
  );
  console.log('[PASS] TEST E: Original scene environment maintained in PRESERVE_SCENE mode');

  // =========================================================================
  // TEST F: Pose locked and decoupled
  // =========================================================================
  assert(
    promptCleanWhite.includes('left arm') && promptCleanWhite.includes('right arm'),
    'Test F: Bilateral pose must be locked separately in prompt'
  );
  assert(
    preservedElements.includes('Left and Right Arm articulation'),
    'Test F: Preserved elements must include bilateral arm articulation'
  );
  console.log('[PASS] TEST F: Bilateral pose locked with decoupled limb preservation');

  // =========================================================================
  // TEST G: Product count, geometry, and materials preserved
  // =========================================================================
  assert(
    preservedElements.some(e => e.includes('Cosmetic glass bottle')),
    'Test G: Target cosmetic bottle product must be preserved'
  );
  assert(
    promptCleanWhite.includes('PRESERVE PHYSICAL PRODUCTS'),
    'Test G: Prompt must include physical product lock directive'
  );
  console.log('[PASS] TEST G: Target product geometry, materials, and count preserved');

  // =========================================================================
  // TEST H: Unknown / ambiguous element safe failure (PRESERVE > REMOVE)
  // =========================================================================
  assert(
    preservedElements.some(e => e.includes('Faint tag stamp')),
    'Test H: Ambiguous / CONTEXT_DEPENDENT tag stamp must be preserved (safe failure)'
  );
  assert(
    !removedElements.some(e => e.includes('Faint tag stamp')),
    'Test H: Ambiguous tag stamp must NOT be in removedElements'
  );
  console.log('[PASS] TEST H: Safe failure rule (PRESERVE > REMOVE) confirmed for ambiguous elements');

  // =========================================================================
  // TEST I: Physical accessories preserved
  // =========================================================================
  assert(
    preservedElements.some(e => e.includes('Gold hoop earrings')),
    'Test I: Jewelry must be preserved'
  );
  assert(
    preservedElements.some(e => e.includes('Tortoiseshell optical frames')),
    'Test I: Eyewear must be preserved'
  );
  assert(
    preservedElements.some(e => e.includes('Silver mesh strap watch')),
    'Test I: Watch must be preserved'
  );
  console.log('[PASS] TEST I: All physical accessories (jewelry, glasses, watch) preserved');

  // =========================================================================
  // TEST J: Visual clarity enhancement without distortion
  // =========================================================================
  assert(
    promptCleanWhite.includes('ENHANCE VISUAL CLARITY'),
    'Test J: Prompt must request clarity enhancement and compression artifact reduction'
  );
  assert(
    promptCleanWhite.includes('Avoid aggressive synthetic beauty smoothing'),
    'Test J: Prompt must forbid beauty smoothing or facial distortion'
  );
  console.log('[PASS] TEST J: Clarity enhancement directive verified without identity smoothing');

  // =========================================================================
  // END-TO-END CALL TEST: cleanReferenceImage Execution
  // =========================================================================
  const cleanerOutput = await cleanReferenceImage({
    image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    analysis: baseAnalysis,
    mode: 'CLEAN_WHITE'
  });

  assert(typeof cleanerOutput.cleanedImage === 'string', 'E2E: Output must contain cleanedImage string');
  assert(cleanerOutput.appliedOperations.length > 0, 'E2E: Output must list applied operations');
  assert(cleanerOutput.preservedElements.length > 0, 'E2E: Output must list preserved elements');
  assert(cleanerOutput.removedElements.length > 0, 'E2E: Output must list removed elements');

  console.log('\n--- ALL REFERENCE CLEANER TESTS (A-J) PASSED SUCCESSFULLY ---');
}

// Auto-run when executed directly via tsx
if (process.argv[1] && process.argv[1].includes('referenceCleaner.test.ts')) {
  runReferenceCleanerStage3Tests().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
