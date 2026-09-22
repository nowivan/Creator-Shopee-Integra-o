/**
 * VISUAL EVIDENCE ANALYZER — STAGE 2 TEST SUITE
 * Verifies Test Scenarios A through J:
 * A — Portrait analysis without hallucinations
 * B — Occlusion handling (PARTIAL without imaginary reconstruction)
 * C — Out of frame handling (UNKNOWN for out-of-frame items)
 * D — Asymmetric pose (bilateral limb separation)
 * E — Overlay text classification (overlay_text -> REMOVE, physicallyAttached: false)
 * F — Physical logo classification (physical_logo -> PRESERVE, physicallyAttached: true)
 * G — Packaging text classification (packaging_text -> PRESERVE, physicallyAttached: true)
 * H — Identity vs Scene State strict separation
 * I — Unknown over fabrication principle
 * J — Normalization and sanitization of malformed/invalid inputs
 */

import {
  normalizeVisualReferenceAnalysis,
  derivePreservationContract,
  deriveCleaningContract,
  normalizeVisualEvidence
} from '../services/visualEvidenceAnalyzer';
import {
  VisualReferenceAnalysis,
  IdentityDNA,
  PoseDNA,
  WardrobeDNA,
  VisualTextElement
} from '../types/visualReferenceTypes';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[FAIL] ${message}`);
  }
}

export async function runVisualEvidenceAnalyzerStage2Tests(): Promise<void> {
  console.log('\n--- Running Visual Evidence Analyzer Stage 2 Tests (A through J) ---');

  // =========================================================================
  // TEST A: Portrait (person on simple background)
  // =========================================================================
  const rawPortrait = {
    frame: {
      orientation: { status: 'VISIBLE', value: 'portrait' },
      framing: { status: 'VISIBLE', value: 'Medium close-up' }
    },
    subject: {
      count: { status: 'VISIBLE', value: 1 },
      type: { status: 'VISIBLE', value: 'single female human subject' },
      orientation: { status: 'VISIBLE', value: 'Facing camera directly' }
    },
    identity: {
      visibleFacialAppearance: { status: 'VISIBLE', value: 'Soft oval contour with defined cheekbones', confidence: 0.95 },
      facialProportions: { status: 'VISIBLE', value: 'Balanced facial thirds', confidence: 0.9 },
      skinCharacteristics: { status: 'VISIBLE', value: 'Light beige tone with subtle cheek warmth', confidence: 0.92 },
      hairCharacteristics: { status: 'VISIBLE', value: 'Dark brown straight strands', confidence: 0.94 }
    },
    sceneState: {
      pose: {
        bodyOrientation: { status: 'VISIBLE', value: 'Frontal alignment' },
        shoulderLine: { status: 'VISIBLE', value: 'Horizontal, level' },
        headOrientation: { status: 'VISIBLE', value: 'Level, eye contact with lens' }
      },
      wardrobe: {
        top: {
          type: { status: 'VISIBLE', value: 'Crewneck knit sweater' },
          color: { status: 'VISIBLE', value: 'Cream white' },
          fabricAppearance: { status: 'VISIBLE', value: 'Ribbed wool texture' }
        }
      },
      camera: {
        viewpoint: { status: 'VISIBLE', value: 'Eye level' },
        angle: { status: 'VISIBLE', value: 'Direct front' },
        depthOfField: { status: 'VISIBLE', value: 'Shallow' }
      },
      lighting: {
        lightType: { status: 'VISIBLE', value: 'natural-looking' },
        softness: { status: 'VISIBLE', value: 'soft' },
        direction: { status: 'VISIBLE', value: 'Diffused front-left' }
      }
    }
  };

  const portraitResult: VisualReferenceAnalysis = normalizeVisualReferenceAnalysis(rawPortrait);
  assert(portraitResult.subject?.count?.value === 1, 'Test A: Subject count must be 1');
  assert(portraitResult.identity?.visibleFacialAppearance?.status === 'VISIBLE', 'Test A: Facial appearance must be VISIBLE');
  assert(portraitResult.sceneState?.wardrobe?.top?.type?.value === 'Crewneck knit sweater', 'Test A: Wardrobe top must be accurately captured');
  assert(portraitResult.sceneState?.lighting?.lightType?.value === 'natural-looking', 'Test A: Lighting type must be natural-looking');
  assert(portraitResult.preservation.preservePose === true, 'Test A: Default preservation must be active');
  console.log('[PASS] TEST A: Portrait parsed and filled with empirical data without hallucinations');

  // =========================================================================
  // TEST B: Occlusion (hand partially hidden behind jacket flap)
  // =========================================================================
  const rawOcclusion = {
    sceneState: {
      pose: {
        leftHand: {
          visibility: { status: 'PARTIAL', value: 'Partially occluded inside jacket pocket' },
          fingerConfiguration: { status: 'PARTIAL', value: 'Thumb rests on exterior pocket seam; remaining digits obscured inside pocket lining' }
        }
      }
    }
  };

  const occlusionResult = normalizeVisualReferenceAnalysis(rawOcclusion);
  const leftHand = occlusionResult.sceneState?.pose?.leftHand;
  assert(leftHand?.visibility?.status === 'PARTIAL', 'Test B: Partially hidden hand must have status PARTIAL');
  assert(leftHand?.fingerConfiguration?.status === 'PARTIAL', 'Test B: Obscured digits must be marked PARTIAL, not invented');
  console.log('[PASS] TEST B: Occlusion correctly flagged as PARTIAL without imaginary reconstruction');

  // =========================================================================
  // TEST C: Out of frame (shoes out of frame)
  // =========================================================================
  const rawOutOfFrame = {
    sceneState: {
      wardrobe: {
        top: {
          type: { status: 'VISIBLE', value: 'Cotton T-Shirt' }
        },
        footwear: {
          type: { status: 'UNKNOWN' },
          color: { status: 'UNKNOWN' }
        }
      }
    },
    unknown: ['Footwear and lower extremities are cut off below the knee']
  };

  const outOfFrameResult = normalizeVisualReferenceAnalysis(rawOutOfFrame);
  const footwear = outOfFrameResult.sceneState?.wardrobe?.footwear;
  assert(footwear?.type?.status === 'UNKNOWN', 'Test C: Footwear out of frame must have status UNKNOWN');
  assert(footwear?.type?.value === undefined, 'Test C: UNKNOWN footwear must not have a fabricated value');
  assert(outOfFrameResult.unknown && outOfFrameResult.unknown.length > 0, 'Test C: Unknown list must retain out-of-frame notes');
  console.log('[PASS] TEST C: Out-of-frame footwear retained as UNKNOWN without fabrication');

  // =========================================================================
  // TEST D: Asymmetric pose (one arm raised, other lowered)
  // =========================================================================
  const rawAsymmetricPose = {
    sceneState: {
      pose: {
        leftArm: {
          upperArmDirection: { status: 'VISIBLE', value: 'Elevated 45 degrees upward away from torso' },
          elbowState: { status: 'VISIBLE', value: 'Bent at 90-degree angle' },
          forearmDirection: { status: 'VISIBLE', value: 'Reaching toward hair' }
        },
        rightArm: {
          upperArmDirection: { status: 'VISIBLE', value: 'Resting vertically downward along torso' },
          elbowState: { status: 'VISIBLE', value: 'Extended straight' },
          forearmDirection: { status: 'VISIBLE', value: 'Hanging beside right hip' }
        },
        leftHand: {
          visibility: { status: 'VISIBLE', value: 'Visible near temple' },
          fingerConfiguration: { status: 'VISIBLE', value: 'Fingers lightly touching hair strands' }
        },
        rightHand: {
          visibility: { status: 'VISIBLE', value: 'Visible beside thigh' },
          fingerConfiguration: { status: 'VISIBLE', value: 'Relaxed open palm facing inward' }
        }
      }
    }
  };

  const asymmetricResult = normalizeVisualReferenceAnalysis(rawAsymmetricPose);
  const pose = asymmetricResult.sceneState?.pose;
  assert(pose?.leftArm?.upperArmDirection?.value !== pose?.rightArm?.upperArmDirection?.value, 'Test D: Left and right arms must remain distinct');
  assert(pose?.leftArm?.elbowState?.value === 'Bent at 90-degree angle', 'Test D: Left arm elbow must be bent');
  assert(pose?.rightArm?.elbowState?.value === 'Extended straight', 'Test D: Right arm elbow must be extended');
  console.log('[PASS] TEST D: Asymmetric bilateral limbs preserved independently');

  // =========================================================================
  // TEST E: Overlay text (promotional graphic text)
  // =========================================================================
  const rawOverlayText = {
    textElements: [
      {
        type: 'overlay_text',
        content: { status: 'VISIBLE', value: 'LIMITED TIME OFFER - 50% OFF' },
        location: { status: 'VISIBLE', value: 'Top-right corner banner' },
        physicallyAttached: false,
        cleaningDefault: 'REMOVE'
      }
    ]
  };

  const overlayResult = normalizeVisualReferenceAnalysis(rawOverlayText);
  const textEl = overlayResult.textElements?.[0];
  assert(textEl?.type === 'overlay_text', 'Test E: Must classify as overlay_text');
  assert(textEl?.physicallyAttached === false, 'Test E: Overlay text must NOT be physically attached');
  assert(textEl?.cleaningDefault === 'REMOVE', 'Test E: Overlay text cleaningDefault must be REMOVE');
  assert(overlayResult.cleaning.removeOverlayText === true, 'Test E: Cleaning contract must flag removeOverlayText: true');
  console.log('[PASS] TEST E: Promotional graphic overlay correctly marked for REMOVE');

  // =========================================================================
  // TEST F: Physical logo (embroidered logo on shirt)
  // =========================================================================
  const rawPhysicalLogo = {
    textElements: [
      {
        type: 'physical_logo',
        content: { status: 'VISIBLE', value: 'Nike Swoosh emblem' },
        location: { status: 'VISIBLE', value: 'Left chest of sweatshirt' },
        physicallyAttached: true,
        cleaningDefault: 'PRESERVE'
      }
    ],
    branding: {
      elements: [
        {
          type: 'logo',
          location: { status: 'VISIBLE', value: 'Left chest' },
          description: { status: 'VISIBLE', value: 'Embroidered white swoosh on black fleece' },
          physicallyAttached: true
        }
      ]
    }
  };

  const physicalLogoResult = normalizeVisualReferenceAnalysis(rawPhysicalLogo);
  const physLogo = physicalLogoResult.textElements?.[0];
  assert(physLogo?.type === 'physical_logo', 'Test F: Must classify as physical_logo');
  assert(physLogo?.physicallyAttached === true, 'Test F: Physical logo MUST be physically attached');
  assert(physLogo?.cleaningDefault === 'PRESERVE', 'Test F: Physical logo must be PRESERVE');
  assert(physicalLogoResult.branding?.elements?.[0]?.physicallyAttached === true, 'Test F: Branding element must be physically attached');
  console.log('[PASS] TEST F: Physical embroidered logo correctly marked for PRESERVE');

  // =========================================================================
  // TEST G: Packaging (physical packaging text)
  // =========================================================================
  const rawPackaging = {
    textElements: [
      {
        type: 'packaging_text',
        content: { status: 'VISIBLE', value: 'HYDRATING MOISTURIZER 50ml' },
        location: { status: 'VISIBLE', value: 'Front face of glass pump bottle' },
        physicallyAttached: true,
        cleaningDefault: 'PRESERVE'
      }
    ]
  };

  const packagingResult = normalizeVisualReferenceAnalysis(rawPackaging);
  const pkgText = packagingResult.textElements?.[0];
  assert(pkgText?.type === 'packaging_text', 'Test G: Must classify as packaging_text');
  assert(pkgText?.physicallyAttached === true, 'Test G: Packaging text must be physically attached');
  assert(pkgText?.cleaningDefault === 'PRESERVE', 'Test G: Packaging text must be PRESERVE');
  console.log('[PASS] TEST G: Physical packaging typography classified as PRESERVE');

  // =========================================================================
  // TEST H: Identity vs Scene State strict separation
  // =========================================================================
  const rawIdentityVsScene = {
    identity: {
      visibleFacialAppearance: { status: 'VISIBLE', value: 'High cheekbones, almond brown eyes', confidence: 0.95 },
      skinCharacteristics: { status: 'VISIBLE', value: 'Warm golden undertone', confidence: 0.9 }
    },
    sceneState: {
      expression: {
        mouthState: { status: 'VISIBLE', value: 'Wide open smile showing upper teeth' },
        eyeState: { status: 'VISIBLE', value: 'Crinkled at corners with genuine laughter' }
      },
      pose: {
        bodyOrientation: { status: 'VISIBLE', value: 'Turned 45 degrees left' }
      },
      wardrobe: {
        top: { type: { status: 'VISIBLE', value: 'Emerald green silk blouse' } }
      }
    }
  };

  const idVsSceneResult = normalizeVisualReferenceAnalysis(rawIdentityVsScene);
  const idKeys = Object.keys(idVsSceneResult.identity || {});
  assert(!idKeys.includes('wardrobe'), 'Test H: Wardrobe must never be in Identity');
  assert(!idKeys.includes('pose'), 'Test H: Pose must never be in Identity');
  assert(!idKeys.includes('expression'), 'Test H: Expression must never be in Identity');
  assert(idVsSceneResult.sceneState?.expression?.mouthState?.value?.includes('smile') === true, 'Test H: Smile belongs in SceneState expression');
  assert(idVsSceneResult.sceneState?.wardrobe?.top?.type?.value?.includes('blouse') === true, 'Test H: Blouse belongs in SceneState wardrobe');
  console.log('[PASS] TEST H: Strict separation between Identity DNA and Scene State DNA verified');

  // =========================================================================
  // TEST I: Unknown over fabrication principle
  // =========================================================================
  const rawFabricationAttempt = {
    sceneState: {
      background: {
        surfaces: { status: 'UNKNOWN' },
        blur: { status: 'VISIBLE', value: 'Heavy bokeh blur obscuring all distant shapes' }
      }
    },
    unknown: ['Distant background objects are completely indistinct due to optical defocus']
  };

  const unknownResult = normalizeVisualReferenceAnalysis(rawFabricationAttempt);
  assert(unknownResult.sceneState?.background?.surfaces?.status === 'UNKNOWN', 'Test I: Unknown surface must maintain UNKNOWN status');
  assert(unknownResult.sceneState?.background?.surfaces?.value === undefined, 'Test I: No surfaces value should be fabricated');
  console.log('[PASS] TEST I: Unknown over fabrication respected (no fabricated values)');

  // =========================================================================
  // TEST J: Normalization of invalid enums, confidences, and malformed structures
  // =========================================================================
  const rawMalformed = {
    frame: {
      orientation: { status: 'INVALID_STATUS', value: 'DIAGONAL_CUSTOM', confidence: 1.8 }
    },
    identity: {
      visibleFacialAppearance: { status: 'VISIBLE', value: 'Diamond face shape', confidence: -0.5 },
      distinguishingTraits: { status: 'VISIBLE', value: 'Single string instead of array' }
    },
    sceneState: {
      lighting: {
        lightType: { status: 'VISIBLE', value: 'ALIEN_LASER_BEAM' },
        softness: { status: 'VISIBLE', value: 'SUPER_EXTREME' }
      }
    },
    textElements: [
      {
        type: 'UNRECOGNIZED_BAD_TYPE',
        content: { status: 'VISIBLE', value: 'Some text' },
        cleaningDefault: 'INVALID_CLEANING_ACTION'
      }
    ]
  };

  const sanitizedResult = normalizeVisualReferenceAnalysis(rawMalformed);
  
  // Status sanitization: invalid status -> UNKNOWN
  assert(sanitizedResult.frame?.orientation?.status === 'UNKNOWN', 'Test J: Invalid status must fallback to UNKNOWN');
  // Enum sanitization: orientation 'DIAGONAL_CUSTOM' -> 'unknown'
  assert(sanitizedResult.frame?.orientation?.value === 'unknown', 'Test J: Invalid orientation must fallback to unknown');
  // Confidence sanitization: confidence > 1 -> 1.0, confidence < 0 -> 0.0
  assert(sanitizedResult.identity?.visibleFacialAppearance?.confidence === 0, 'Test J: Negative confidence must clamp to 0.0');
  // Array sanitization: single string converted to array
  assert(Array.isArray(sanitizedResult.identity?.distinguishingTraits?.value), 'Test J: String distinguishing trait must be normalized to array');
  // Lighting enums: invalid lightType -> 'indeterminate', invalid softness -> 'mixed'
  assert(sanitizedResult.sceneState?.lighting?.lightType?.value === 'indeterminate', 'Test J: Invalid lightType must fallback to indeterminate');
  assert(sanitizedResult.sceneState?.lighting?.softness?.value === 'mixed', 'Test J: Invalid softness must fallback to mixed');
  // Text element types: fallback to physical_text and default action
  assert(sanitizedResult.textElements?.[0]?.type === 'physical_text', 'Test J: Invalid text type must fallback to physical_text');
  assert(sanitizedResult.textElements?.[0]?.cleaningDefault === 'PRESERVE', 'Test J: Invalid cleaning default must fallback safely');

  console.log('[PASS] TEST J: Comprehensive normalization and sanitization verified');
  console.log('\n--- ALL VISUAL EVIDENCE ANALYZER TESTS (A-J) PASSED SUCCESSFULLY ---');
}

// Auto-run when executed directly via tsx
if (process.argv[1] && process.argv[1].includes('visualEvidenceAnalyzer.test.ts')) {
  runVisualEvidenceAnalyzerStage2Tests().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
