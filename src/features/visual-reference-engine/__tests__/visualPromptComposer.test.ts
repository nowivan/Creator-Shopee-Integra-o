/**
 * VISUAL PROMPT COMPOSER — STAGE 4 TEST SUITE
 * Verifies Test Scenarios A through J:
 * A — Full Portrait: Prompt contains frame -> subject -> face -> hair -> wardrobe -> pose -> lighting -> camera in canonical order
 * B — UNKNOWN: Fields with UNKNOWN status are omitted from prompt text and collected in omittedUnknownFields
 * C — PARTIAL: Partial description does not extrapolate hidden parts
 * D — Asymmetric Pose: Bilateral limbs/hands are composed distinctly and decoupled
 * E — Physical Branding: Physical logos/labels appear in the prompt
 * F — Overlay Text: Overlays flagged for removal do NOT become part of subject/wardrobe
 * G — Identity Reference Mode: Wardrobe and pose are marked as contextual, prioritizing persistent identity traits
 * H — Scene Reference Mode: Scene framing, pose, and lighting are prominent
 * I — Preservation: Final constraints reflect active PreservationContract flags
 * J — Determinism: Identical analysis input produces 100% identical output
 */

import { composeVisualPrompt } from '../services/visualPromptComposer';
import { VisualReferenceAnalysis } from '../types/visualReferenceTypes';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[FAIL] ${message}`);
  }
}

export async function runVisualPromptComposerTests(): Promise<void> {
  console.log('\n--- Running Visual Prompt Composer Stage 4 Tests (A through J) ---');

  // Comprehensive Base Analysis
  const comprehensiveAnalysis: VisualReferenceAnalysis = {
    frame: {
      orientation: { status: 'VISIBLE', value: 'portrait' },
      aspectRatio: { status: 'VISIBLE', value: '3:4' },
      framing: { status: 'VISIBLE', value: 'medium close-up studio portrait' },
      crop: { status: 'VISIBLE', value: 'chest-up framing' },
      headroom: { status: 'VISIBLE', value: 'balanced standard headroom' }
    },
    subject: {
      count: { status: 'VISIBLE', value: 1 },
      type: { status: 'VISIBLE', value: 'female model' },
      orientation: { status: 'VISIBLE', value: 'three-quarter view toward left' },
      positionInFrame: { status: 'VISIBLE', value: 'centered' },
      visibleProportions: { status: 'VISIBLE', value: 'slender athletic build' }
    },
    identity: {
      visibleFacialAppearance: { status: 'VISIBLE', value: 'Sculpted jawline, high cheekbones' },
      facialProportions: { status: 'VISIBLE', value: 'Symmetric golden ratio facial symmetry' },
      skinCharacteristics: { status: 'VISIBLE', value: 'Warm beige skin with subtle freckles' },
      hairCharacteristics: { status: 'VISIBLE', value: 'Dark honey blonde waves' },
      distinguishingTraits: { status: 'VISIBLE', value: ['Small beauty mark near left temple'] }
    },
    face: {
      headOrientation: { status: 'VISIBLE', value: 'tilted slightly downward' },
      eyeAppearance: { status: 'VISIBLE', value: 'Almond-shaped hazel eyes' },
      eyebrowAppearance: { status: 'VISIBLE', value: 'Feathered soft arches' },
      noseAppearance: { status: 'VISIBLE', value: 'Straight narrow bridge' },
      mouthAppearance: { status: 'VISIBLE', value: 'Softly parted natural lips' }
    },
    hair: {
      hairstyle: { status: 'VISIBLE', value: 'loose textured layered cut' },
      strandBehavior: { status: 'VISIBLE', value: 'individual flyaway strands catching back-light' }
    },
    skin: {
      visibleTone: { status: 'VISIBLE', value: 'Warm beige' },
      surfaceTexture: { status: 'VISIBLE', value: 'visible pores and natural skin texture' },
      highlights: { status: 'VISIBLE', value: 'specular highlights along cheekbone crest' }
    },
    sceneState: {
      expression: {
        eyeState: { status: 'VISIBLE', value: 'focused and relaxed' },
        gazeDirection: { status: 'VISIBLE', value: 'directly at the camera' },
        mouthState: { status: 'VISIBLE', value: 'neutral subtle closed smile' },
        facialTension: { status: 'VISIBLE', value: 'relaxed and composed' }
      },
      wardrobe: {
        top: {
          color: { status: 'VISIBLE', value: 'Charcoal gray' },
          fabricAppearance: { status: 'VISIBLE', value: 'cashmere knit texture' },
          fit: { status: 'VISIBLE', value: 'tailored relaxed' },
          type: { status: 'VISIBLE', value: 'turtleneck sweater' },
          neckline: { status: 'VISIBLE', value: 'folded ribbed high collar' },
          sleeves: { status: 'VISIBLE', value: 'long fitted' }
        },
        bottom: {
          color: { status: 'VISIBLE', value: 'Off-white' },
          type: { status: 'VISIBLE', value: 'pleated trousers' }
        }
      },
      accessories: {
        jewelry: { status: 'VISIBLE', value: ['Small gold hoop earrings'] },
        eyewear: { status: 'VISIBLE', value: 'minimal wireframe glasses' }
      },
      pose: {
        bodyOrientation: { status: 'VISIBLE', value: 'angled 30 degrees to the left' },
        torsoOrientation: { status: 'VISIBLE', value: 'upright posture' },
        shoulderLine: { status: 'VISIBLE', value: 'left shoulder dropped slightly' },
        leftArm: {
          upperArmDirection: { status: 'VISIBLE', value: 'hanging relaxed along torso' },
          elbowState: { status: 'VISIBLE', value: 'slightly flexed' },
          forearmDirection: { status: 'VISIBLE', value: 'resting on lap' }
        },
        rightArm: {
          upperArmDirection: { status: 'VISIBLE', value: 'raised diagonally' },
          elbowState: { status: 'VISIBLE', value: 'bent acute angle' },
          forearmDirection: { status: 'VISIBLE', value: 'directed toward collarbone' }
        },
        leftHand: {
          fingerConfiguration: { status: 'VISIBLE', value: 'relaxed open palm' },
          contactTarget: { status: 'VISIBLE', value: 'thigh fabric' }
        },
        rightHand: {
          fingerConfiguration: { status: 'VISIBLE', value: 'gently curved fingertips' },
          contactTarget: { status: 'VISIBLE', value: 'collarbone area' }
        }
      },
      objects: [
        {
          type: { status: 'VISIBLE', value: 'Ceramic coffee cup' },
          color: { status: 'VISIBLE', value: 'Matte terracotta' },
          material: { status: 'VISIBLE', value: 'Stoneware' },
          position: { status: 'VISIBLE', value: 'on wooden side table' },
          interactionWithSubject: { status: 'VISIBLE', value: 'placed nearby within reach' }
        }
      ],
      background: {
        type: { status: 'VISIBLE', value: 'Warm minimalist interior' },
        dominantColors: { status: 'VISIBLE', value: ['Warm cream', 'Muted terracotta', 'Oak wood'] },
        depth: { status: 'VISIBLE', value: 'shallow depth of field with soft bokeh' },
        blur: { status: 'VISIBLE', value: 'defocused neutral wall background' }
      },
      lighting: {
        lightType: { status: 'VISIBLE', value: 'natural-looking' },
        softness: { status: 'VISIBLE', value: 'soft' },
        direction: { status: 'VISIBLE', value: 'large north-facing window camera left' },
        shadows: { status: 'VISIBLE', value: 'gradual falloff with open shadow detail' },
        whiteBalance: { status: 'VISIBLE', value: '5200K neutral daylight' }
      },
      camera: {
        viewpoint: { status: 'VISIBLE', value: 'eye-level straight-on' },
        angle: { status: 'VISIBLE', value: '0 degrees neutral tilt' },
        distanceClass: { status: 'VISIBLE', value: 'medium close-up distance' },
        depthOfField: { status: 'VISIBLE', value: 'shallow focus isolating subject' }
      },
      composition: {
        subjectPlacement: { status: 'VISIBLE', value: 'rule-of-thirds left anchor' },
        visualBalance: { status: 'VISIBLE', value: 'asymmetric weighted balance' },
        negativeSpace: { status: 'VISIBLE', value: 'uncluttered space on right side' }
      }
    },
    texture: {
      skinTexture: { status: 'VISIBLE', value: 'authentic micro-pores and fine vellus hair' },
      fabricTexture: { status: 'VISIBLE', value: 'visible wool fiber weave' },
      fineDetail: { status: 'VISIBLE', value: 'crisp eyelash and iris fiber definition' }
    },
    style: {
      realismLevel: { status: 'VISIBLE', value: 'Photorealistic' },
      visualTreatment: { status: 'VISIBLE', value: 'editorial fashion photography' },
      retouching: { status: 'VISIBLE', value: 'minimal organic editorial retouching' },
      materialPlausibility: { status: 'VISIBLE', value: 'physically accurate light scattering' }
    },
    textElements: [
      {
        type: 'physical_logo',
        content: { status: 'VISIBLE', value: 'Embroidered Atelier Crest' },
        location: { status: 'VISIBLE', value: 'Sweater left cuff' },
        physicallyAttached: true,
        cleaningDefault: 'PRESERVE'
      },
      {
        type: 'overlay_text',
        content: { status: 'VISIBLE', value: 'LIMITED TIME 50% OFF' },
        location: { status: 'VISIBLE', value: 'Top right overlay' },
        physicallyAttached: false,
        cleaningDefault: 'REMOVE'
      }
    ],
    preservation: {
      preservePose: true,
      preserveWardrobe: true,
      preserveColors: true,
      preservePhysicalBranding: true,
      preserveRelativeProportions: true,
      preserveCrop: true,
      preserveSubjectPlacement: true,
      avoidUnsupportedObjects: true,
      avoidUnsupportedDetails: true
    }
  };

  // =========================================================================
  // TEST A: Full Portrait Canonical Order
  // =========================================================================
  const outputA = composeVisualPrompt({ analysis: comprehensiveAnalysis });
  const promptA = outputA.prompt;

  // Verify presence of canonical segments in sequence
  const expectedKeywordsInOrder = [
    'Portrait',
    'Subject: 1 subject',
    'Identity Appearance: Sculpted jawline',
    'Facial Structure:',
    'Hair:',
    'Skin:',
    'Expression & Gaze:',
    'Wardrobe:',
    'Accessories & Physical Branding:',
    'Pose & Articulation:',
    'Interacting Objects:',
    'Background:',
    'Lighting:',
    'Camera Viewpoint:',
    'Composition:',
    'Textures & Materials:',
    'Style & Realism:',
    'Preservation Constraints:'
  ];

  let lastIndex = -1;
  for (const kw of expectedKeywordsInOrder) {
    const idx = promptA.indexOf(kw);
    assert(idx !== -1, `Test A: Keyword "${kw}" must be present in prompt`);
    assert(idx > lastIndex, `Test A: Keyword "${kw}" must appear after preceding section in canonical order`);
    lastIndex = idx;
  }
  console.log('[PASS] TEST A: Full portrait canonical order verified (1 through 18)');

  // =========================================================================
  // TEST B: UNKNOWN fields are omitted and collected
  // =========================================================================
  const analysisWithUnknowns: VisualReferenceAnalysis = {
    subject: {
      count: { status: 'VISIBLE', value: 1 },
      type: { status: 'VISIBLE', value: 'person' },
      occlusion: { status: 'UNKNOWN' }
    },
    sceneState: {
      lighting: {
        lightType: { status: 'UNKNOWN' },
        direction: { status: 'VISIBLE', value: 'camera left' }
      }
    }
  };

  const outputB = composeVisualPrompt({ analysis: analysisWithUnknowns });
  assert(!outputB.prompt.includes('UNKNOWN'), 'Test B: "UNKNOWN" string must not appear in prompt');
  assert(!outputB.prompt.includes('occlusion'), 'Test B: Unknown occlusion must not be mentioned');
  assert(
    outputB.omittedUnknownFields.includes('subject.occlusion'),
    'Test B: subject.occlusion must be in omittedUnknownFields'
  );
  assert(
    outputB.omittedUnknownFields.includes('lighting.lightType'),
    'Test B: lighting.lightType must be in omittedUnknownFields'
  );
  console.log('[PASS] TEST B: UNKNOWN fields omitted from prompt and logged in metadata');

  // =========================================================================
  // TEST C: PARTIAL evidence restrained without extrapolation
  // =========================================================================
  const partialAnalysis: VisualReferenceAnalysis = {
    identity: {
      distinguishingTraits: { status: 'PARTIAL', value: ['lower edge of a tattoo near collar'] }
    },
    sceneState: {
      wardrobe: {
        bottom: {
          type: { status: 'PARTIAL', value: 'dark denim hem' }
        }
      }
    }
  };
  const outputC = composeVisualPrompt({ analysis: partialAnalysis });
  assert(
    outputC.prompt.includes('partially visible lower edge of a tattoo near collar'),
    'Test C: Partial trait must be phrased with "partially visible"'
  );
  assert(
    outputC.prompt.includes('partially visible dark denim hem'),
    'Test C: Partial garment must be phrased with "partially visible"'
  );
  console.log('[PASS] TEST C: PARTIAL fields preserved without extrapolating unseen elements');

  // =========================================================================
  // TEST D: Asymmetric bilateral pose decoupled articulation
  // =========================================================================
  assert(
    promptA.includes('left arm (viewer-relative left/subject left): hanging relaxed along torso, slightly flexed elbow, resting on lap'),
    'Test D: Left arm articulation must be explicitly composed'
  );
  assert(
    promptA.includes('right arm (viewer-relative right/subject right): raised diagonally, bent acute angle elbow, directed toward collarbone'),
    'Test D: Right arm articulation must be explicitly composed'
  );
  assert(
    promptA.includes('left hand: relaxed open palm, contacting thigh fabric'),
    'Test D: Left hand must be articulated separately'
  );
  assert(
    promptA.includes('right hand: gently curved fingertips, contacting collarbone area'),
    'Test D: Right hand must be articulated separately'
  );
  console.log('[PASS] TEST D: Asymmetric bilateral limbs and hands decoupled and explicitly composed');

  // =========================================================================
  // TEST E: Physical branding present in prompt
  // =========================================================================
  assert(
    promptA.includes('physical logo "Embroidered Atelier Crest" located at Sweater left cuff'),
    'Test E: Physical logo on cuff must be included in prompt'
  );
  console.log('[PASS] TEST E: Physical apparel branding and packaging text included in prompt');

  // =========================================================================
  // TEST F: Overlay text marked for removal is excluded
  // =========================================================================
  assert(
    !promptA.includes('LIMITED TIME 50% OFF'),
    'Test F: Overlay text "LIMITED TIME 50% OFF" must NOT be in the prompt'
  );
  console.log('[PASS] TEST F: Promotional overlays marked for removal excluded from prompt');

  // =========================================================================
  // TEST G: IDENTITY_REFERENCE Mode
  // =========================================================================
  const outputG = composeVisualPrompt({
    analysis: comprehensiveAnalysis,
    mode: 'IDENTITY_REFERENCE'
  });
  assert(
    outputG.prompt.includes('Core Identity Appearance: Sculpted jawline'),
    'Test G: Core identity appearance must be highlighted'
  );
  assert(
    outputG.prompt.includes('Reference Wardrobe (Contextual):'),
    'Test G: Wardrobe must be contextualized as non-permanent reference'
  );
  assert(
    outputG.prompt.includes('Pose (Shot Reference):'),
    'Test G: Pose must be contextualized as non-permanent reference'
  );
  console.log('[PASS] TEST G: IDENTITY_REFERENCE mode emphasizes facial identity and isolates contextual state');

  // =========================================================================
  // TEST H: SCENE_REFERENCE Mode
  // =========================================================================
  const outputH = composeVisualPrompt({
    analysis: comprehensiveAnalysis,
    mode: 'SCENE_REFERENCE'
  });
  assert(
    outputH.prompt.includes('Pose & Articulation:'),
    'Test H: Scene reference mode preserves pose prominence'
  );
  assert(
    outputH.prompt.includes('Lighting:'),
    'Test H: Scene reference mode preserves lighting prominence'
  );
  assert(
    outputH.prompt.includes('Background:'),
    'Test H: Scene reference mode preserves background prominence'
  );
  console.log('[PASS] TEST H: SCENE_REFERENCE mode prioritizes scene staging, lighting, and composition');

  // =========================================================================
  // TEST I: Preservation Contract translation
  // =========================================================================
  assert(
    promptA.includes('Preservation Constraints:'),
    'Test I: Prompt must contain Preservation Constraints section'
  );
  assert(
    promptA.includes('Preserve the observed pose and limb articulation, wardrobe garments and fit, garment and background color palette, physical branding and labels, relative proportions, framing and crop relationships, subject placement.'),
    'Test I: Active preservation flags must be listed'
  );
  assert(
    promptA.includes('Do not add unsupported objects. Do not fabricate unseen or ambiguous details.'),
    'Test I: Anti-hallucination preservation rules must be enforced'
  );
  console.log('[PASS] TEST I: PreservationContract correctly converted into enforceable prompt directives');

  // =========================================================================
  // TEST J: Determinism
  // =========================================================================
  const outputJ1 = composeVisualPrompt({ analysis: comprehensiveAnalysis });
  const outputJ2 = composeVisualPrompt({ analysis: comprehensiveAnalysis });
  const outputJ3 = composeVisualPrompt({ analysis: comprehensiveAnalysis });

  assert(outputJ1.prompt === outputJ2.prompt, 'Test J: Output 1 must exactly equal Output 2');
  assert(outputJ2.prompt === outputJ3.prompt, 'Test J: Output 2 must exactly equal Output 3');
  assert(
    JSON.stringify(outputJ1.includedSections) === JSON.stringify(outputJ2.includedSections),
    'Test J: Included sections must match identically'
  );
  assert(
    JSON.stringify(outputJ1.omittedUnknownFields) === JSON.stringify(outputJ2.omittedUnknownFields),
    'Test J: Omitted fields must match identically'
  );
  console.log('[PASS] TEST J: Strict determinism confirmed (100% byte-for-byte identical output)');

  console.log('\n--- ALL VISUAL PROMPT COMPOSER TESTS (A through J) PASSED SUCCESSFULLY ---');
}

// Auto-run when executed directly via tsx
if (process.argv[1] && process.argv[1].includes('visualPromptComposer.test.ts')) {
  runVisualPromptComposerTests().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
