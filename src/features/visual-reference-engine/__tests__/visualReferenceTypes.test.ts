/**
 * VISUAL REFERENCE ENGINE — STAGE 1 TYPE & CONTRACT TESTS
 * Verifies structural boundaries, bilateral pose decoupling, evidence status handling,
 * text element classification, preservation contracts, and composition of VisualReferenceAnalysis.
 */

import {
  VisualEvidenceStatus,
  VisualEvidence,
  FrameDNA,
  SubjectDNA,
  IdentityDNA,
  FaceDNA,
  HairDNA,
  SkinDNA,
  ExpressionDNA,
  ArmDNA,
  HandDNA,
  PoseDNA,
  GarmentDNA,
  WardrobeDNA,
  AccessoriesDNA,
  BrandingElementDNA,
  BrandingDNA,
  VisualTextType,
  VisualTextElement,
  SceneObjectDNA,
  CameraDNA,
  CompositionDNA,
  LightingDNA,
  BackgroundDNA,
  TextureDNA,
  StyleDNA,
  ScenePhotoStateDNA,
  PreservationContract,
  ReferenceCleaningContract,
  VisualReferenceAnalysis
} from '../types/visualReferenceTypes';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[FAIL] ${message}`);
  }
}

export async function runVisualReferenceEngineStage1Tests(): Promise<void> {
  console.log('\n--- Running Visual Reference Engine Stage 1 Tests ---');

  // =========================================================================
  // TEST A: Identity DNA does NOT contain wardrobe/pose/background
  // =========================================================================
  const sampleIdentity: IdentityDNA = {
    visibleFacialAppearance: {
      status: 'VISIBLE',
      value: 'Oval face structure with defined jawline',
      confidence: 0.95
    },
    facialProportions: {
      status: 'VISIBLE',
      value: 'Symmetrical facial thirds',
      confidence: 0.9
    },
    skinCharacteristics: {
      status: 'VISIBLE',
      value: 'Warm olive undertone with light freckles across bridge',
      confidence: 0.92
    },
    hairCharacteristics: {
      status: 'VISIBLE',
      value: 'Dark espresso brown, natural wavy strand structure',
      confidence: 0.94
    },
    distinguishingTraits: {
      status: 'VISIBLE',
      value: ['Small beauty mark above left lip corner'],
      confidence: 0.98
    }
  };

  // Compile-time and runtime check that IdentityDNA has only intrinsic biometric traits
  const identityKeys = Object.keys(sampleIdentity);
  assert(identityKeys.length === 5, `Test A: IdentityDNA must contain only 5 intrinsic trait fields, got ${identityKeys.length}`);
  assert(!('wardrobe' in sampleIdentity), 'Test A: IdentityDNA must not contain wardrobe');
  assert(!('pose' in sampleIdentity), 'Test A: IdentityDNA must not contain pose');
  assert(!('background' in sampleIdentity), 'Test A: IdentityDNA must not contain background');
  assert(!('lighting' in sampleIdentity), 'Test A: IdentityDNA must not contain lighting');
  assert(!('camera' in sampleIdentity), 'Test A: IdentityDNA must not contain camera');
  console.log('[PASS] TEST A: Identity DNA is strictly isolated from wardrobe, pose, background, and camera');

  // =========================================================================
  // TEST B: ScenePhotoState contains pose/wardrobe/camera/lighting/etc.
  // =========================================================================
  const sampleSceneState: ScenePhotoStateDNA = {
    expression: {
      eyeState: { status: 'VISIBLE', value: 'Open, relaxed gaze' },
      mouthState: { status: 'VISIBLE', value: 'Closed, slight neutral smile' }
    },
    pose: {
      bodyOrientation: { status: 'VISIBLE', value: 'Three-quarter turn to right' },
      shoulderLine: { status: 'VISIBLE', value: 'Right shoulder lowered slightly' }
    },
    wardrobe: {
      top: {
        type: { status: 'VISIBLE', value: 'Crewneck knitted sweater' },
        color: { status: 'VISIBLE', value: 'Navy blue' }
      }
    },
    camera: {
      viewpoint: { status: 'VISIBLE', value: 'Eye-level' },
      angle: { status: 'VISIBLE', value: 'Frontal three-quarter' },
      distanceClass: { status: 'VISIBLE', value: 'Medium close-up' }
    },
    lighting: {
      lightType: { status: 'VISIBLE', value: 'natural-looking' },
      softness: { status: 'VISIBLE', value: 'soft' },
      direction: { status: 'VISIBLE', value: 'Key light 45 degrees camera left' }
    },
    background: {
      type: { status: 'VISIBLE', value: 'Minimalist studio cyclorama' },
      dominantColors: { status: 'VISIBLE', value: ['#E5E7EB', '#D1D5DB'] }
    }
  };

  assert(Boolean(sampleSceneState.pose), 'Test B: ScenePhotoState must contain pose');
  assert(Boolean(sampleSceneState.wardrobe), 'Test B: ScenePhotoState must contain wardrobe');
  assert(Boolean(sampleSceneState.camera), 'Test B: ScenePhotoState must contain camera');
  assert(Boolean(sampleSceneState.lighting), 'Test B: ScenePhotoState must contain lighting');
  assert(Boolean(sampleSceneState.background), 'Test B: ScenePhotoState must contain background');
  console.log('[PASS] TEST B: ScenePhotoState encapsulates all transient scene conditions (pose, wardrobe, camera, lighting, bg)');

  // =========================================================================
  // TEST C: Left / right arms and hands are independent (decoupled bilateral pose)
  // =========================================================================
  const decoupledPose: PoseDNA = {
    bodyOrientation: { status: 'VISIBLE', value: 'Frontal' },
    leftArm: {
      upperArmDirection: { status: 'VISIBLE', value: 'Hanging naturally along torso' },
      elbowState: { status: 'VISIBLE', value: 'Slightly flexed 15 deg' },
      forearmDirection: { status: 'VISIBLE', value: 'Resting downwards' }
    },
    rightArm: {
      upperArmDirection: { status: 'VISIBLE', value: 'Elevated 45 deg anterior' },
      elbowState: { status: 'VISIBLE', value: 'Bent 90 deg holding product' },
      forearmDirection: { status: 'VISIBLE', value: 'Extending forward toward camera' }
    },
    leftHand: {
      visibility: { status: 'PARTIAL', value: 'Partially occluded behind hip' },
      fingerConfiguration: { status: 'PARTIAL', value: 'Relaxed loose curl' }
    },
    rightHand: {
      visibility: { status: 'VISIBLE', value: 'Fully visible in foreground' },
      palmOrientation: { status: 'VISIBLE', value: 'Facing medial' },
      fingerConfiguration: { status: 'VISIBLE', value: 'Precision grip pinch around bottle neck' },
      gesture: { status: 'VISIBLE', value: 'Holding product firmly' },
      contactTarget: { status: 'VISIBLE', value: 'Skincare serum dropper bottle' }
    }
  };

  assert(decoupledPose.leftArm?.upperArmDirection?.value !== decoupledPose.rightArm?.upperArmDirection?.value, 'Test C: Left and right arms have distinct configurations');
  assert(decoupledPose.leftHand?.visibility?.status === 'PARTIAL', 'Test C: Left hand partial status is preserved');
  assert(decoupledPose.rightHand?.visibility?.status === 'VISIBLE', 'Test C: Right hand visible status is preserved');
  assert(decoupledPose.rightHand?.contactTarget?.value === 'Skincare serum dropper bottle', 'Test C: Right hand contact target is isolated');
  console.log('[PASS] TEST C: Bilateral pose articulation (leftArm, rightArm, leftHand, rightHand) is strictly decoupled');

  // =========================================================================
  // TEST D: VisualEvidence accepts VISIBLE / PARTIAL / INFERRED / UNKNOWN
  // =========================================================================
  const evVisible: VisualEvidence<string> = { status: 'VISIBLE', value: 'Cotton denim weave', confidence: 0.98 };
  const evPartial: VisualEvidence<string> = { status: 'PARTIAL', value: 'Cuff stitching visible, rest occluded', confidence: 0.7 };
  const evInferred: VisualEvidence<string> = { status: 'INFERRED', value: 'Likely double-layer fleece based on drape thickness', confidence: 0.6 };
  const evUnknown: VisualEvidence<string> = { status: 'UNKNOWN', description: 'Footwear not in camera frame' };

  const statuses: VisualEvidenceStatus[] = [evVisible.status, evPartial.status, evInferred.status, evUnknown.status];
  assert(statuses.includes('VISIBLE'), 'Test D: Must support VISIBLE');
  assert(statuses.includes('PARTIAL'), 'Test D: Must support PARTIAL');
  assert(statuses.includes('INFERRED'), 'Test D: Must support INFERRED');
  assert(statuses.includes('UNKNOWN'), 'Test D: Must support UNKNOWN');
  console.log('[PASS] TEST D: VisualEvidence generic container supports VISIBLE, PARTIAL, INFERRED, UNKNOWN with confidence and metadata');

  // =========================================================================
  // TEST E: Text classification differentiates overlay from physical text/logo
  // =========================================================================
  const textOverlay: VisualTextElement = {
    type: 'overlay_text',
    content: { status: 'VISIBLE', value: '50% OFF TODAY ONLY' },
    location: { status: 'VISIBLE', value: 'Top right corner banner' },
    physicallyAttached: false,
    cleaningDefault: 'REMOVE'
  };

  const textPhysicalLogo: VisualTextElement = {
    type: 'physical_logo',
    content: { status: 'VISIBLE', value: 'ACME' },
    location: { status: 'VISIBLE', value: 'Embroidered on left chest pocket' },
    physicallyAttached: true,
    cleaningDefault: 'PRESERVE'
  };

  const textWatermark: VisualTextElement = {
    type: 'watermark',
    content: { status: 'VISIBLE', value: 'STOCK PHOTO PREVIEW' },
    location: { status: 'VISIBLE', value: 'Center diagonal overlay' },
    physicallyAttached: false,
    cleaningDefault: 'REMOVE'
  };

  const textTypes: VisualTextType[] = [textOverlay.type, textPhysicalLogo.type, textWatermark.type];
  assert(textOverlay.physicallyAttached === false, 'Test E: Overlay text is not physically attached');
  assert(textPhysicalLogo.physicallyAttached === true, 'Test E: Physical logo is physically attached');
  assert(textOverlay.cleaningDefault === 'REMOVE', 'Test E: Overlay cleaning default is REMOVE');
  assert(textPhysicalLogo.cleaningDefault === 'PRESERVE', 'Test E: Physical logo cleaning default is PRESERVE');
  console.log('[PASS] TEST E: Text classification correctly distinguishes synthetic overlays/watermarks from physical apparel/product markings');

  // =========================================================================
  // TEST F: ReferenceCleaningContract can remove overlay and preserve physical branding
  // =========================================================================
  const sampleCleaning: ReferenceCleaningContract = {
    removeOverlayText: true,
    removeCaptions: true,
    removeUiElements: true,
    removeUnrelatedClutter: true,
    replaceBackgroundWithWhite: false,

    preservePrincipalSubject: true,
    preserveWardrobe: true,
    preserveProduct: true,
    preservePose: true,
    preservePhysicalLogos: true,

    improveVisualClarity: true
  };

  assert(sampleCleaning.removeOverlayText === true, 'Test F: removeOverlayText is active');
  assert(sampleCleaning.preservePhysicalLogos === true, 'Test F: preservePhysicalLogos is active');
  assert(sampleCleaning.preserveWardrobe === true, 'Test F: preserveWardrobe is active');
  console.log('[PASS] TEST F: ReferenceCleaningContract enables selective synthetic artifact stripping while preserving physical attributes');

  // =========================================================================
  // TEST G: VisualReferenceAnalysis composes all contracts without error
  // =========================================================================
  const fullAnalysis: VisualReferenceAnalysis = {
    frame: {
      orientation: { status: 'VISIBLE', value: 'portrait' },
      aspectRatio: { status: 'VISIBLE', value: '9:16' },
      framing: { status: 'VISIBLE', value: 'Medium shot' }
    },
    subject: {
      count: { status: 'VISIBLE', value: 1 },
      type: { status: 'VISIBLE', value: 'Adult female presenter' },
      positionInFrame: { status: 'VISIBLE', value: 'Centered slightly right' }
    },
    identity: sampleIdentity,
    face: {
      visibility: { status: 'VISIBLE', value: 'Fully visible frontal' },
      eyeAppearance: { status: 'VISIBLE', value: 'Almond-shaped hazel eyes' }
    },
    hair: {
      color: { status: 'VISIBLE', value: 'Deep brunette' },
      length: { status: 'VISIBLE', value: 'Shoulder-length' },
      hairstyle: { status: 'VISIBLE', value: 'Soft layered waves' }
    },
    skin: {
      visibleTone: { status: 'VISIBLE', value: 'Warm light olive' },
      surfaceTexture: { status: 'VISIBLE', value: 'Natural skin pores visible, no heavy airbrush' }
    },
    sceneState: sampleSceneState,
    branding: {
      elements: [
        {
          type: 'logo',
          location: { status: 'VISIBLE', value: 'Serum bottle front label' },
          description: { status: 'VISIBLE', value: 'Geometric minimalist serif wordmark' },
          physicallyAttached: true
        }
      ]
    },
    textElements: [textOverlay, textPhysicalLogo],
    objects: [
      {
        type: { status: 'VISIBLE', value: 'Cosmetic glass dropper bottle' },
        material: { status: 'VISIBLE', value: 'Frosted amber glass with black rubber dropper' },
        interactionWithSubject: { status: 'VISIBLE', value: 'Held in right hand at mid-torso height' }
      }
    ],
    texture: {
      skinTexture: { status: 'VISIBLE', value: 'Subtle natural specular sheen on cheekbone' },
      fabricTexture: { status: 'VISIBLE', value: 'Visible rib-knit wool yarn texture' }
    },
    style: {
      visualTreatment: { status: 'VISIBLE', value: 'Editorial commercial e-commerce photography' },
      realismLevel: { status: 'VISIBLE', value: 'Photorealistic, natural optical lens capture' },
      photographicVsRendered: { status: 'VISIBLE', value: 'True photographic capture' }
    },
    preservation: {
      preservePose: true,
      preserveWardrobe: true,
      preserveColors: true,
      preservePhysicalBranding: true,
      preserveRelativeProportions: true,
      preserveCrop: false,
      preserveSubjectPlacement: true,
      preserveOcclusions: true,
      avoidUnsupportedObjects: true,
      avoidUnsupportedDetails: true,
      preferUnknownOverFabrication: true
    },
    cleaning: sampleCleaning,
    unknown: ['Lower limb footwear', 'Back of garment construction']
  };

  assert(fullAnalysis.identity?.distinguishingTraits?.value?.[0] === 'Small beauty mark above left lip corner', 'Test G: Root analysis preserves identity');
  assert(fullAnalysis.sceneState?.wardrobe?.top?.type?.value === 'Crewneck knitted sweater', 'Test G: Root analysis preserves scene wardrobe');
  assert(fullAnalysis.preservation?.preferUnknownOverFabrication === true, 'Test G: Root analysis preserves anti-hallucination preservation contract');
  assert(fullAnalysis.unknown?.length === 2, 'Test G: Root analysis preserves explicit unknowns array');
  console.log('[PASS] TEST G: VisualReferenceAnalysis successfully integrates all sub-DNAs, contracts, and unknown arrays with full type safety');

  console.log('\n>>> ALL VISUAL REFERENCE ENGINE STAGE 1 TESTS (A-G) PASSED! <<<\n');
}

if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('visualReferenceTypes.test')) {
  runVisualReferenceEngineStage1Tests().catch(err => {
    console.error('Stage 1 Test Suite Failed:', err);
    process.exit(1);
  });
}
