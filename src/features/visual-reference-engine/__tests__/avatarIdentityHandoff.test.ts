import {
  buildAvatarIdentityContext,
  renderAvatarIdentityBlock,
  getEffectiveAvatarReferenceImage
} from '../services/avatarIdentityHandoff';
import {
  AvatarIdentityContext,
  AvatarReferenceProfile,
  IdentityDNA,
  VisualReferenceAnalysis
} from '../types/visualReferenceTypes';
import {
  buildCompiledScene2Model,
  renderScene2Text,
  renderScene2Json
} from '../../creative-director/compiler/promptCompiler';
import {
  buildCompiledScene3Model,
  renderScene3Text,
  renderScene3Json
} from '../../creative-director/compiler/scene3PromptCompiler';
import {
  compileCommercePrompt
} from '../../cinematic/commercePromptCompiler';
import {
  composeCinematicPrompt
} from '../../cinematic/promptComposer';
import {
  CommerceStrategyPlanOutput
} from '../../cinematic/types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[FAIL] ${message}`);
  }
}

export async function runAvatarIdentityHandoffTests(): Promise<void> {
  console.log('\n--- Running Stage 6 — Shared Avatar Identity Handoff Tests ---');

  const mockIdentityDNA: IdentityDNA = {
    visibleFacialAppearance: {
      status: 'VISIBLE',
      value: 'Oval face with naturally defined jawline, almond-shaped dark brown eyes, gently arched eyebrows'
    },
    facialProportions: {
      status: 'VISIBLE',
      value: 'Balanced symmetry, medium forehead ratio'
    },
    skinCharacteristics: {
      status: 'VISIBLE',
      value: 'Smooth natural warm undertone skin texture'
    },
    hairCharacteristics: {
      status: 'VISIBLE',
      value: 'Rich dark chestnut wavy hair parted slightly off-center'
    },
    distinguishingTraits: {
      status: 'VISIBLE',
      value: ['Minimalist silver huggie earrings']
    }
  };

  const mockAnalysis: VisualReferenceAnalysis = {
    frame: {
      orientation: { status: 'VISIBLE', value: 'square' },
      aspectRatio: { status: 'VISIBLE', value: '1:1' }
    },
    identity: mockIdentityDNA
  };

  const mockProfile: AvatarReferenceProfile = {
    id: 'avatar_test_001',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    originalImage: 'data:image/jpeg;base64,ORIGINAL_AVATAR_BASE64',
    cleanedImage: 'data:image/jpeg;base64,CLEANED_AVATAR_BASE64',
    analysis: mockAnalysis,
    identityDNA: mockIdentityDNA,
    identityPrompt: 'A 30-year-old Latina woman with almond dark brown eyes, soft oval face, long wavy chestnut hair, athletic build.'
  };

  // 1. Canonical Context Construction & Image Selection
  const context = buildAvatarIdentityContext(mockProfile);
  assert(context.identityDNA === mockIdentityDNA, 'Context identityDNA matches profile');
  assert(context.identityPrompt === mockProfile.identityPrompt, 'Context identityPrompt matches profile');
  assert(context.referenceImage === mockProfile.originalImage, 'Context referenceImage matches profile originalImage');
  assert(context.cleanedReferenceImage === mockProfile.cleanedImage, 'Context cleanedReferenceImage matches profile cleanedImage');
  console.log('[PASS] TEST 1: buildAvatarIdentityContext() builds canonical AvatarIdentityContext');

  const effectiveImageCleaned = getEffectiveAvatarReferenceImage(context);
  assert(effectiveImageCleaned === 'data:image/jpeg;base64,CLEANED_AVATAR_BASE64', 'Prioritizes cleanedReferenceImage');

  const uncleanedContext: AvatarIdentityContext = {
    identityDNA: mockIdentityDNA,
    identityPrompt: 'Avatar description',
    referenceImage: 'data:image/jpeg;base64,RAW_IMAGE_ONLY'
  };
  const effectiveImageRaw = getEffectiveAvatarReferenceImage(uncleanedContext);
  assert(effectiveImageRaw === 'data:image/jpeg;base64,RAW_IMAGE_ONLY', 'Falls back to referenceImage');
  assert(getEffectiveAvatarReferenceImage(undefined) === undefined, 'Returns undefined when context missing');
  console.log('[PASS] TEST 2: getEffectiveAvatarReferenceImage() correctly prioritizes cleaned image');

  // 2. Avatar Identity Block Rendering & Lock Separation
  const block = renderAvatarIdentityBlock(context);
  assert(block.includes('[AVATAR IDENTITY REFERENCE & LOCK]'), 'Block contains main heading');
  assert(block.includes('A 30-year-old Latina woman with almond dark brown eyes'), 'Block includes identity prompt');
  assert(block.includes('Lock Separation: AVATAR IDENTITY LOCK is strictly distinct from PRODUCT OBJECT LOCK'), 'Enforces Lock Separation');
  assert(block.includes('DEFINED WARDROBE > REFERENCE WARDROBE'), 'Enforces wardrobe priority');
  assert(block.includes('CURRENT SCENE POSE/ACTION > REFERENCE PHOTO POSE'), 'Enforces action priority');
  assert(block.includes('Avatar Identity ACTIVE'), 'Indicates status');
  assert(renderAvatarIdentityBlock(undefined) === '', 'Returns empty string for undefined context');
  console.log('[PASS] TEST 3: renderAvatarIdentityBlock() renders structured clause with strict lock separation');

  // 3. Creative Director Scene 2 Handoff Integration
  const scene2Slots = {
    presenter: {
      gender: 'female' as const,
      description: 'A confident digital creator speaking directly to camera',
      avatarIdentityContext: context
    },
    wardrobe: {
      topType: 'Oversized Blazer',
      topStyle: 'Tailored minimalist',
      topColor: 'Charcoal Grey',
      bottomType: 'Tailored Trousers',
      bottomColor: 'Black',
      footwearType: 'Clean Leather Loafers',
      footwearColor: 'Black'
    },
    environment: 'Modern minimalist studio with warm architectural lighting',
    productIdentity: 'UltraHydrate Facial Serum',
    productFacts: ['Contains 5% Hyaluronic Acid', 'Pump bottle dispenser with frosted glass'],
    productVisibleDetails: ['Frosted glass bottle with white dropper pump', 'Clear viscous serum'],
    primaryBenefit: 'Deep 24-hour hydration without greasy residue',
    spokenCopy: 'Sua pele merece uma hidratação profunda que dura o dia todo.',
    actions: {
      action0to2: 'Presenter holds serum next to face while speaking to camera',
      action2to4: 'Presenter dispenses one drop onto the back of her hand',
      action4to6: 'Presenter blends serum smoothly showing fast absorption',
      action6to8: 'Presenter smiles confidently pointing towards the serum bottle'
    },
    speechActionSync: [
      { phrase: 'Sua pele merece', action: 'Holding serum beside face' }
    ]
  };

  const scene2Model = buildCompiledScene2Model(scene2Slots);
  assert(Boolean(scene2Model.presenter.avatarIdentityContext), 'Scene 2 model retains avatarIdentityContext');
  const scene2Text = renderScene2Text(scene2Model);
  assert(scene2Text.includes('[AVATAR IDENTITY REFERENCE & LOCK]'), 'Scene 2 prompt contains identity block');
  assert(scene2Text.includes('A 30-year-old Latina woman'), 'Scene 2 prompt includes avatar profile');
  assert(scene2Text.includes('DEFINED WARDROBE > REFERENCE WARDROBE'), 'Scene 2 prompt retains wardrobe priority');
  assert(scene2Text.includes('Oversized Blazer'), 'Scene 2 prompt retains defined wardrobe');

  const scene2Json = renderScene2Json(scene2Model);
  assert(Boolean(scene2Json.presenter.avatarIdentityContext), 'Scene 2 JSON output includes avatarIdentityContext');
  console.log('[PASS] TEST 4: Scene 2 compiler consumes avatarIdentityContext seamlessly');

  // 4. Creative Director Scene 3 Handoff Integration
  const scene3Slots = {
    presenter: {
      identity: 'A confident digital creator speaking directly to camera',
      gender: 'female' as const,
      avatarIdentityContext: context
    },
    wardrobe: {
      description: 'Wearing charcoal blazer with black top',
      topType: 'Oversized Blazer',
      topColor: 'Charcoal Grey',
      bottomType: 'Tailored Trousers',
      bottomColor: 'Black',
      footwearType: 'Clean Leather Loafers',
      footwearColor: 'Black'
    },
    environment: 'Modern minimalist studio with warm architectural lighting',
    product: {
      identity: 'UltraHydrate Facial Serum',
      visibleDetails: ['Frosted glass bottle with white dropper pump'],
      knownPhysicalFacts: ['Contains 5% Hyaluronic Acid']
    },
    actions: {
      action0to2: 'Presenter steps forward delivering closing CTA directly on camera',
      action2to4: 'Presenter gestures towards the product on the table',
      action4to6: 'Presenter raises the product at chest level clearly displaying label',
      action6to8: 'Presenter gives a confident nod with inviting warm expression'
    },
    spokenCta: 'Garanta o seu hoje mesmo com frete grátis!',
    ctaGesture: 'Direct two-hand presentation of product towards camera',
    speechActionSync: [
      { spokenSegment: 'Garanta o seu hoje', physicalAction: 'Presenting product to viewer' }
    ]
  };

  const scene3Model = buildCompiledScene3Model(scene3Slots);
  assert(Boolean(scene3Model.presenterContract.avatarIdentityContext), 'Scene 3 model retains avatarIdentityContext');
  const scene3Text = renderScene3Text(scene3Model);
  assert(scene3Text.includes('[AVATAR IDENTITY REFERENCE & LOCK]'), 'Scene 3 prompt contains identity block');
  assert(scene3Text.includes('Garanta o seu hoje mesmo com frete grátis!'), 'Scene 3 prompt includes spoken CTA');
  assert(scene3Text.includes('DEFINED WARDROBE > REFERENCE WARDROBE'), 'Scene 3 prompt includes wardrobe rule');

  const scene3Json = renderScene3Json(scene3Model);
  assert(Boolean(scene3Json.presenter.avatarIdentityContext), 'Scene 3 JSON output includes avatarIdentityContext');
  console.log('[PASS] TEST 5: Scene 3 compiler consumes avatarIdentityContext seamlessly');

  // 5. Continuity Across Scene 2 and Scene 3
  assert(
    scene2Model.presenter.avatarIdentityContext === scene3Model.presenterContract.avatarIdentityContext,
    'Exact same AvatarIdentityContext instance reused across Scene 2 and Scene 3 without re-analysis'
  );
  console.log('[PASS] TEST 6: Continuity verified across Scene 2 and Scene 3 without re-analysis');

  // 6. Cinematic Engine Handoff Integration
  const mockPlanOutput: CommerceStrategyPlanOutput = {
    family: 'UGC_POV_NATURAL',
    resolvedFamily: 'UGC_POV_NATURAL',
    totalDurationSec: 10,
    targetBeats: 3,
    shots: [
      {
        shotNumber: 1,
        functionType: 'PRODUCT_HOOK',
        informationGain: ['context_of_use'],
        stepName: 'Hook & Problem',
        camera: 'Medium shot static eye level',
        cameraComplexity: 'minimal',
        actionComplexity: 'simple',
        handAction: 'Holding serum bottle',
        framing: 'Waist-up presenter framed center',
        visualObjective: 'Introduce problem and product solution',
        visualPromptEn: 'A presenter holding the serum bottle in front of camera',
        actionPromptEn: 'Presenter gestures with product',
        dialoguePtBr: 'Cansado de pele ressecada?',
        targetDurationSec: 3
      }
    ],
    cinematicShots: [],
    cameraGuidelines: ['Keep stable camera angles', 'Smooth transitions'],
    negativeGuidelines: ['No blurred labels', 'No extra limbs']
  };

  const commerceCompilerResult = compileCommercePrompt({
    planOutput: mockPlanOutput,
    visionData: {
      category: 'Skincare',
      material: 'Glass and plastic',
      color: 'Frosted white and silver',
      texture: 'Smooth glass',
      finish: 'Frosted matte',
      logo: 'UltraHydrate',
      packaging: 'Bottle with dropper',
      fixedParts: ['Glass body', 'Cap collar'],
      movingParts: ['Dropper rubber bulb']
    },
    productName: 'UltraHydrate Serum',
    avatarIdentityContext: context
  });

  assert(commerceCompilerResult.formattedFullPrompt.includes('[AVATAR IDENTITY REFERENCE & LOCK]'), 'Commerce prompt includes avatar identity block');
  assert(commerceCompilerResult.formattedFullPrompt.includes('A 30-year-old Latina woman'), 'Commerce prompt includes identity description');
  assert(commerceCompilerResult.formattedFullPrompt.includes('[3. PRODUCT IDENTITY & OBJECT LOCK]'), 'Commerce prompt preserves product object lock');
  console.log('[PASS] TEST 7: Cinematic Commerce Prompt Compiler embeds avatarIdentityContext alongside product locks');

  const cinematicResult = composeCinematicPrompt({
    visionData: {
      category: 'Beauty',
      material: 'Glass',
      color: 'Frosted white',
      texture: 'Matte',
      finish: 'Smooth',
      logo: 'UltraHydrate',
      packaging: 'Bottle',
      fixedParts: ['Bottle body'],
      movingParts: ['Cap']
    },
    motionSuggestion: {
      category: 'Beauty',
      allowedMotion: ['Smooth tilt', 'gentle pump'],
      forbiddenMotion: ['Deforming glass'],
      sensitiveRules: ['Keep label legible'],
      motionLockPrompt: 'MAINTAIN RIGID GLASS BOTTLE GEOMETRY',
      negativePromptAdditions: ['warped glass', 'melted dropper']
    },
    shots: [
      {
        id: 'shot_1',
        stepName: 'Opening reveal',
        camera: 'Slow push in',
        handAction: 'Holding bottle gently',
        framing: 'Medium close-up',
        visualObjective: 'Highlight texture and design',
        visualPromptEn: 'Close-up of frosted bottle',
        actionPromptEn: 'Presenter brings bottle forward',
        dialoguePtBr: 'Conheça o novo hidratante.'
      }
    ],
    style: 'UGC',
    customProductName: 'UltraHydrate Serum',
    avatarIdentityContext: context
  });

  assert(cinematicResult.finalPrompt.includes('[AVATAR IDENTITY REFERENCE & LOCK]'), 'Master cinematic prompt includes avatar identity block');
  assert(cinematicResult.finalPrompt.includes('A 30-year-old Latina woman'), 'Master cinematic prompt includes identity description');
  assert(cinematicResult.finalPrompt.includes('PARTES RIGIDAMENTE FIXAS'), 'Master cinematic prompt preserves product fixed parts');
  console.log('[PASS] TEST 8: composeCinematicPrompt embeds avatarIdentityContext in master prompt header');

  console.log('\n--- ALL STAGE 6 SHARED AVATAR IDENTITY HANDOFF TESTS PASSED SUCCESSFULLY ---');
}

// Auto-run when executed directly via tsx
if (process.argv[1] && process.argv[1].includes('avatarIdentityHandoff.test.ts')) {
  runAvatarIdentityHandoffTests().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
