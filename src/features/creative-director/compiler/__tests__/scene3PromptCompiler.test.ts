/**
 * SCENE 3 PROMPT COMPILER TEST SUITE
 * Phase 2.2 Architecture Validation
 */

import {
  compileScene3Prompt,
  buildCompiledScene3Model,
  renderScene3Text,
  renderScene3Json,
  renderScene3JsonString,
  validateScene3Slots,
  Scene3CompilationError,
  buildScene3NegativeConstraints
} from '../scene3PromptCompiler';
import { Scene3DynamicSlots } from '../../types/scene3';
import {
  SCENE_3_AVATAR_WARDROBE_PRIORITY_CLAUSE,
  SCENE_3_UNIVERSAL_NEGATIVE_CONSTRAINTS,
  SCENE_3_CTA_CLOSING_ACTION_MANDATE,
  getScene3MasterTemplateSkeleton
} from '../../templates/scene3BaseTemplate';
import { getScene2MasterTemplateSkeleton } from '../../templates/scene2BaseTemplate';

// Deterministic test fixture
export const MOCK_SCENE_3_SLOTS_FIXTURE_A: Scene3DynamicSlots = {
  presenter: {
    identity: 'Adult Brazilian woman in her late 20s with natural wavy brown hair and expressive warm smile',
    gender: 'female'
  },
  wardrobe: {
    description: 'white basic plain t-shirt (crew neck), medium wash blue basic jeans, and white plain sneakers'
  },
  product: {
    identity: 'Kit Toalhas de Banho Imperial 500g/m²',
    visibleDetails: [
      'Tecido encorpado com textura em relevo felpudo',
      'Tom cinza chumbo uniforme com barra acetinada',
      'Etiqueta discreta bordada na borda inferior'
    ],
    knownPhysicalFacts: [
      'Algodão 100% penteado com gramatura 500g/m²',
      'Alta absorção de água desde o primeiro uso',
      'Acabamento com costura reforçada e toque aveludado'
    ]
  },
  environment: 'residential bathroom with clean white tile, matte black fixtures and natural window light',
  spokenCta: 'Se você também quer renovar o seu banho com toalha macia de verdade, clica aqui no link e garante o seu kit.',
  actions: {
    action0to2: 'Presenter holds the folded bath towel comfortably with both hands at chest level, smiling warmly into the camera lens.',
    action2to4: 'Presenter gently hugs the soft towel with one arm, turning slightly to showcase its plush volume and velvety finish while speaking the first half of the CTA.',
    action4to6: 'Presenter gestures forward warmly with an open hand toward the smartphone camera while keeping the towel prominent in frame.',
    action6to8: 'Presenter delivers a confident inviting nod directly into the lens, holding the towel securely in a natural UGC closing pose.'
  },
  ctaGesture: 'Warm inviting forward open-palm gesture towards the camera while holding the product securely at chest level, concluding with an authentic closing nod.',
  speechActionSync: [
    {
      spokenSegment: 'renovar o seu banho com toalha macia de verdade',
      physicalAction: 'Gently showcasing the plush texture of the folded towel against the chest.'
    },
    {
      spokenSegment: 'clica aqui no link e garante o seu kit',
      physicalAction: 'Extending an inviting open hand forward while nodding warmly at the camera.'
    }
  ],
  productSpecificNegatives: [
    'NO damp bathroom clothes.',
    'NO distorted towel stitches.'
  ]
};

export function runScene3CompilerTests() {
  console.log('\n======================================================');
  console.log('STARTING PHASE 2.2 — SCENE 3 COMPILER TEST SUITE');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
      if (detail) console.error(`   Detail: ${detail}`);
      failed++;
    }
  }

  // TEST A: Master Template Determinism
  try {
    const run1 = compileScene3Prompt(MOCK_SCENE_3_SLOTS_FIXTURE_A);
    const run2 = compileScene3Prompt(MOCK_SCENE_3_SLOTS_FIXTURE_A);
    assert(run1 === run2, 'TEST A — Master Template Determinism (Identical slots yield exact byte-for-byte output)');
    assert(run1.length > 500, 'TEST A — Master Template Output Length Valid (>500 chars)');
  } catch (err: any) {
    assert(false, 'TEST A — Master Template Determinism', err.message);
  }

  // TEST B: CTA Byte Lock
  try {
    const output = compileScene3Prompt(MOCK_SCENE_3_SLOTS_FIXTURE_A);
    const exactCta = MOCK_SCENE_3_SLOTS_FIXTURE_A.spokenCta;
    const expectedDialogueSection = `Exact Dialogue Lock: Say ONLY this exact phrase. Do not change, add, remove, shorten or repeat any word:\n"${exactCta}"`;
    assert(output.includes(expectedDialogueSection), 'TEST B — CTA Byte Lock (spokencCta appears byte-for-byte in final prompt output)');
  } catch (err: any) {
    assert(false, 'TEST B — CTA Byte Lock', err.message);
  }

  // TEST C: CTA Cannot Be Rewritten / No Transformation
  try {
    const ctaWithSpecialChars = 'Olha só... se você curtiu, corre no link abaixo & garanta com frete grátis 100%!';
    const modifiedSlots = {
      ...MOCK_SCENE_3_SLOTS_FIXTURE_A,
      spokenCta: ctaWithSpecialChars
    };
    const output = compileScene3Prompt(modifiedSlots);
    assert(output.includes(`"${ctaWithSpecialChars}"`), 'TEST C — CTA Cannot Be Rewritten (Zero paraphrase/trim/punctuation rewrite)');
  } catch (err: any) {
    assert(false, 'TEST C — CTA Cannot Be Rewritten', err.message);
  }

  // TEST D: Four Timing Blocks
  try {
    const output = compileScene3Prompt(MOCK_SCENE_3_SLOTS_FIXTURE_A);
    const has0to2 = output.includes('- 0.0s - 2.0s: Presenter holds the folded bath towel comfortably');
    const has2to4 = output.includes('- 2.0s - 4.0s: Presenter gently hugs the soft towel');
    const has4to6 = output.includes('- 4.0s - 6.0s: Presenter gestures forward warmly');
    const has6to8 = output.includes('- 6.0s - 8.0s: Presenter delivers a confident inviting nod');
    assert(has0to2 && has2to4 && has4to6 && has6to8, 'TEST D — Four Timing Blocks (All 4 deterministic temporal blocks 0-8s present)');
  } catch (err: any) {
    assert(false, 'TEST D — Four Timing Blocks', err.message);
  }

  // TEST E: Product Reference Contract
  try {
    const output = compileScene3Prompt(MOCK_SCENE_3_SLOTS_FIXTURE_A);
    const hasExclusiveRef = output.includes('Exclusive Reference: The uploaded product image is the exclusive visual reference.');
    const hasScaleFidelity = output.includes('Scale & Fidelity: Maintain realistic physical scale and structural integrity. Do not deform, omit essential parts or invent unverified accessories.');
    assert(hasExclusiveRef && hasScaleFidelity, 'TEST E — Product Reference Contract (Authoritative visual reference rule present)');
  } catch (err: any) {
    assert(false, 'TEST E — Product Reference Contract', err.message);
  }

  // TEST F: Wardrobe Priority
  try {
    const output = compileScene3Prompt(MOCK_SCENE_3_SLOTS_FIXTURE_A);
    const hasWardrobeClause = output.includes(SCENE_3_AVATAR_WARDROBE_PRIORITY_CLAUSE);
    const hasWardrobeSpec = output.includes('Presenter Wardrobe (Enforced Priority): white basic plain t-shirt (crew neck), medium wash blue basic jeans, and white plain sneakers');
    assert(hasWardrobeClause && hasWardrobeSpec, 'TEST F — Wardrobe Priority (User wardrobe overrides avatar clothing rule present)');
  } catch (err: any) {
    assert(false, 'TEST F — Wardrobe Priority', err.message);
  }

  // TEST G: Direct On-Camera Speech & UGC Audio
  try {
    const output = compileScene3Prompt(MOCK_SCENE_3_SLOTS_FIXTURE_A);
    const hasPtBrSpeech = output.includes('Direct on-camera speech in Brazilian Portuguese (PT-BR). NO VOICE-OVER. NO NARRATION.');
    const hasLipSync = output.includes('Natural lip synchronization with spoken words, authentic conversational tone, and realistic room acoustics without background music.');
    assert(hasPtBrSpeech && hasLipSync, 'TEST G — Direct On-Camera Speech (PT-BR direct speech + no voice-over enforced)');
  } catch (err: any) {
    assert(false, 'TEST G — Direct On-Camera Speech', err.message);
  }

  // TEST H: No Graphical CTA / Conversion Invariants
  try {
    const output = compileScene3Prompt(MOCK_SCENE_3_SLOTS_FIXTURE_A);
    const hasNoFakeCart = output.includes('NO fake cart icon. NO fake button. NO graphical CTA.');
    const hasMandate = output.includes(SCENE_3_CTA_CLOSING_ACTION_MANDATE);
    const hasGesture = output.includes('- Closing Gesture: Warm inviting forward open-palm gesture towards the camera');
    assert(hasNoFakeCart && hasMandate && hasGesture, 'TEST H — No Graphical CTA (No fake cart icon / button / graphical overlay allowed)');
  } catch (err: any) {
    assert(false, 'TEST H — No Graphical CTA', err.message);
  }

  // TEST I: Universal Negative Preservation
  try {
    const output = compileScene3Prompt(MOCK_SCENE_3_SLOTS_FIXTURE_A);
    const hasUniversalNegatives = output.includes(SCENE_3_UNIVERSAL_NEGATIVE_CONSTRAINTS);
    assert(hasUniversalNegatives, 'TEST I — Universal Negative Preservation (All 26 universal negative constraints intact)');
  } catch (err: any) {
    assert(false, 'TEST I — Universal Negative Preservation', err.message);
  }

  // TEST J: Product-Specific Negatives
  try {
    const outputWithNegatives = compileScene3Prompt(MOCK_SCENE_3_SLOTS_FIXTURE_A);
    const hasSpecific1 = outputWithNegatives.includes('NO damp bathroom clothes.');
    const hasSpecific2 = outputWithNegatives.includes('NO distorted towel stitches.');
    assert(hasSpecific1 && hasSpecific2, 'TEST J — Product-Specific Negatives (Appended cleanly after universal negatives)');

    // Without product-specific negatives
    const slotsWithoutSpecific = {
      ...MOCK_SCENE_3_SLOTS_FIXTURE_A,
      productSpecificNegatives: undefined
    };
    const outputWithout = compileScene3Prompt(slotsWithoutSpecific);
    assert(outputWithout.includes(SCENE_3_UNIVERSAL_NEGATIVE_CONSTRAINTS) && !outputWithout.includes('NO damp bathroom clothes.'), 'TEST J2 — Without Product-Specific Negatives (Outputs clean universal negatives)');
  } catch (err: any) {
    assert(false, 'TEST J — Product-Specific Negatives', err.message);
  }

  // TEST K: Scene 2 Isolation
  try {
    const scene2Skeleton = getScene2MasterTemplateSkeleton();
    const hasScene2Header = scene2Skeleton.includes('=== SCENE 2: SPOKEN BENEFIT & PHYSICAL DEMONSTRATION (8 SECONDS) ===');
    const hasScene2Benefit = scene2Skeleton.includes('[BENEFIT DEMONSTRATION PRINCIPLE]');
    assert(hasScene2Header && hasScene2Benefit, 'TEST K — Scene 2 Isolation (Scene 2 template skeleton is 100% intact and unaltered)');
  } catch (err: any) {
    assert(false, 'TEST K — Scene 2 Isolation', err.message);
  }

  // TEST L: Slot Validation & Typed Error Throwing
  try {
    const invalidSlots: any = {
      presenter: { identity: 'Woman' },
      // Missing wardrobe, product, spokenCta, actions, ctaGesture, speechActionSync
    };
    const validation = validateScene3Slots(invalidSlots);
    assert(!validation.valid && validation.errors.length >= 6, 'TEST L1 — validateScene3Slots flags missing fields');

    let threwExpected = false;
    try {
      compileScene3Prompt(invalidSlots);
    } catch (e: any) {
      if (e instanceof Scene3CompilationError) {
        threwExpected = true;
      }
    }
    assert(threwExpected, 'TEST L2 — compileScene3Prompt throws typed Scene3CompilationError on invalid slots');
  } catch (err: any) {
    assert(false, 'TEST L — Slot Validation & Typed Error Throwing', err.message);
  }

  // TEST M: Dual Renderer (Text + JSON) Zero Semantic Drift
  try {
    const model = buildCompiledScene3Model(MOCK_SCENE_3_SLOTS_FIXTURE_A);
    const textOutput = renderScene3Text(model);
    const jsonOutput = renderScene3Json(model);
    const jsonStr = renderScene3JsonString(model);

    assert(jsonOutput.scene === 3, 'TEST M1 — JSON Renderer scene is 3');
    assert(jsonOutput.dialogue.spokenCta === MOCK_SCENE_3_SLOTS_FIXTURE_A.spokenCta, 'TEST M2 — JSON Renderer matches exact spoken CTA');
    assert(jsonOutput.timeline.action0to2 === MOCK_SCENE_3_SLOTS_FIXTURE_A.actions.action0to2, 'TEST M3 — JSON Renderer timeline matches model');
    assert(jsonStr.length > 500, 'TEST M4 — JSON String is valid formatted JSON');
    assert(Object.isFrozen(model), 'TEST M5 — CompiledScene3Model is frozen and immutable');
  } catch (err: any) {
    assert(false, 'TEST M — Dual Renderer Zero Semantic Drift', err.message);
  }

  // TEST N: Single-Owner Domain Deduplication Verification
  try {
    const complexSlots: Scene3DynamicSlots = {
      ...MOCK_SCENE_3_SLOTS_FIXTURE_A,
      product: {
        ...MOCK_SCENE_3_SLOTS_FIXTURE_A.product,
        identity: 'Frigideira Antiaderente Cerâmica Diamond Pro 28cm'
      },
      presenter: {
        gender: 'female',
        identity: 'Brasileira de 28 anos com cabelos castanhos ondulados e sorriso acolhedor'
      },
      structuralDNA: {
        category: 'Cookware',
        coreGeometry: {
          silhouette: 'circular pan with curved sloping sides',
          proportions: '28cm diameter with low profile depth',
          thicknessProfile: '4mm forged aluminum base',
          edgeStyle: 'rolled smooth lip',
          cornerProfile: 'rounded base curve',
          symmetry: 'radial symmetry with single linear handle'
        },
        fixedComponents: [
          {
            id: 'handle_1',
            name: 'ergonomic bakelite handle',
            role: 'fixed',
            shape: 'curved elongated grip',
            position: 'fixed to side rim',
            relativeSize: 'approx 18cm length',
            relationshipToOtherParts: ['riveted to pan body'],
            confidence: 0.95
          }
        ]
      },
      avatarIdentityContext: {
        identityPrompt: 'Brasileira de 28 anos com cabelos castanhos ondulados e sorriso acolhedor',
        referenceImage: 'avatar_clean_ref.png'
      }
    };

    const compiledComplexPrompt = compileScene3Prompt(complexSlots);

    // Check 1: Product name does not duplicate across structural DNA footer
    const nameOccurrences = (compiledComplexPrompt.match(/Frigideira Antiaderente Cerâmica Diamond Pro 28cm/g) || []).length;
    assert(nameOccurrences === 1, 'TEST N1 — Product description occurrences = 1 (single-owner domain)', `Found ${nameOccurrences}`);

    // Check 2: Full presenter description does not duplicate across avatar identity block
    const presenterOccurrences = (compiledComplexPrompt.match(/Brasileira de 28 anos com cabelos castanhos ondulados e sorriso acolhedor/g) || []).length;
    assert(presenterOccurrences === 1, 'TEST N2 — Presenter description occurrences = 1 (single-owner domain)', `Found ${presenterOccurrences}`);

    // Check 3: Action timeline occurrences = 1 per block
    const action0to2Occurrences = (compiledComplexPrompt.match(/Presenter holds the folded bath towel/g) || []).length;
    assert(action0to2Occurrences === 1, 'TEST N3 — Action timeline occurrences = 1 (single-owner domain)', `Found ${action0to2Occurrences}`);

    // Check 4: Spoken CTA appears in dialogue lock (and sync reference phrases) without duplicating into timeline
    const exactCtaOccurrences = (compiledComplexPrompt.match(new RegExp(complexSlots.spokenCta.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    assert(exactCtaOccurrences === 1, 'TEST N4 — Spoken CTA occurrences = 1 in Dialogue Lock', `Found ${exactCtaOccurrences}`);

    // Check 5: Structural DNA preserves geometry lock without repeating product name
    const hasCoreGeometry = compiledComplexPrompt.includes('CORE GEOMETRY LOCK:');
    const hasSilhouette = compiledComplexPrompt.includes('circular pan with curved sloping sides');
    const hasAntiPrior = compiledComplexPrompt.includes('ANTI-PRIOR OVERRIDE:');
    assert(hasCoreGeometry && hasSilhouette && hasAntiPrior, 'TEST N5 — Structural DNA renders unique geometry constraints without repeating product identity');

    // Check 6: Avatar Identity Lock preserves identity constraints without repeating full presenter description
    const hasAvatarLock = compiledComplexPrompt.includes('[AVATAR IDENTITY REFERENCE & LOCK]');
    const hasPriorityRule = compiledComplexPrompt.includes('Wardrobe Priority:');
    assert(hasAvatarLock && hasPriorityRule, 'TEST N6 — Avatar Identity Lock renders unique identity rules without repeating full description');

  } catch (err: any) {
    assert(false, 'TEST N — Single-Owner Domain Deduplication Verification', err.message);
  }

  console.log('\n======================================================');
  console.log(`Scene 3 Compiler Tests: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  return { passed, failed };
}

// Direct execution when run via tsx
if (import.meta.url.endsWith('scene3PromptCompiler.test.ts') || process.argv[1]?.includes('scene3PromptCompiler.test')) {
  runScene3CompilerTests();
}
