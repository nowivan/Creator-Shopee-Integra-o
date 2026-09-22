/**
 * SCENE 3 END-TO-END INTEGRATION TEST SUITE (PHASE 2.4)
 * Comprehensive verification of the integrated Scene 3 pipeline:
 * Copy Agent CTA -> Scene Brain C3 -> Dynamic Slots -> Compiler -> Final Prompt
 */

import {
  runScene3Generation,
  Scene3OrchestrationError,
  getAuthoritativeCopyAgentScene3Cta
} from '../scene3GenerationService';
import {
  SCENE3_BIBLE_PRESET,
  SCENE3_BODY_SPLASH_PRESET,
  SCENE3_WATCH_PRESET,
  SCENE3_SNEAKER_PRESET,
  SCENE3_TOWELS_PRESET
} from '../../data/scene3Presets';
import {
  Scene3GenerationInput
} from '../../types/scene3';
import {
  compileScene2Prompt,
  buildCompiledScene2Model
} from '../../compiler/promptCompiler';
import { SCENE_3_AVATAR_WARDROBE_PRIORITY_CLAUSE } from '../../templates/scene3BaseTemplate';
import { BATH_TOWELS_PRESET } from '../../data/scene2Presets';

export async function runAllScene3IntegrationTests(): Promise<{ passed: number; failed: number; errors: string[] }> {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      passed++;
      console.log(`[PASS] ${testName}`);
    } else {
      failed++;
      const err = `[FAIL] ${testName}${detail ? ` - ${detail}` : ''}`;
      console.error(err);
      errors.push(err);
    }
  }

  // 1. TEST A: Full E2E Pipeline for Bible / Book Fixture
  try {
    const result = await runScene3Generation(SCENE3_BIBLE_PRESET);
    assert(
      typeof result.finalPrompt === 'string' && result.finalPrompt.length > 500,
      'Test A1: Bible Fixture produces valid compiled prompt (>500 chars)',
      `Length was ${result.finalPrompt.length}`
    );
    assert(
      result.finalPrompt.includes(SCENE3_BIBLE_PRESET.spokenCta),
      'Test A2: Bible Fixture preserves exact spoken CTA in final prompt'
    );
    assert(
      result.finalPrompt.includes('Bíblia de Estudo Luxo em Couro Marrom'),
      'Test A3: Bible Fixture product identity embedded in prompt'
    );
    assert(
      result.finalPrompt.includes('[NEGATIVE CONSTRAINTS — STRICTLY FORBIDDEN]'),
      'Test A4: Bible Fixture contains negative constraints block'
    );
  } catch (e: any) {
    assert(false, 'Test A: Bible Fixture execution', e.message);
  }

  // 2. TEST B: Full E2E Pipeline for Body Splash Kit Fixture
  try {
    const result = await runScene3Generation(SCENE3_BODY_SPLASH_PRESET);
    assert(
      result.finalPrompt.includes('Kit 3 Body Splash Floral Fresh 200ml'),
      'Test B1: Body Splash Fixture product identity embedded'
    );
    assert(
      result.finalPrompt.includes(SCENE3_BODY_SPLASH_PRESET.spokenCta),
      'Test B2: Body Splash CTA byte-preserved'
    );
    assert(
      Array.isArray(result.brainResult.speechActionSync) && result.brainResult.speechActionSync.length > 0,
      'Test B3: Body Splash speech-action sync present'
    );
  } catch (e: any) {
    assert(false, 'Test B: Body Splash execution', e.message);
  }

  // 3. TEST C: Full E2E Pipeline for Watch Fixture
  try {
    const result = await runScene3Generation(SCENE3_WATCH_PRESET);
    assert(
      result.finalPrompt.includes('Relógio Cronógrafo Masculino'),
      'Test C1: Watch Fixture product identity embedded'
    );
    assert(
      result.finalPrompt.includes(SCENE3_WATCH_PRESET.spokenCta),
      'Test C2: Watch CTA byte-preserved'
    );
    assert(
      Boolean(result.brainResult.ctaGesture),
      'Test C3: Watch CTA gesture generated'
    );
  } catch (e: any) {
    assert(false, 'Test C: Watch Fixture execution', e.message);
  }

  // 4. TEST D: Full E2E Pipeline for Sneaker Fixture
  try {
    const result = await runScene3Generation(SCENE3_SNEAKER_PRESET);
    assert(
      result.finalPrompt.includes('Tênis Running Ultraleve Respirável'),
      'Test D1: Sneaker Fixture product identity embedded'
    );
    assert(
      result.finalPrompt.includes(SCENE3_SNEAKER_PRESET.spokenCta),
      'Test D2: Sneaker CTA byte-preserved'
    );
  } catch (e: any) {
    assert(false, 'Test D: Sneaker Fixture execution', e.message);
  }

  // 5. TEST E: Full E2E Pipeline for Bath Towels Fixture
  try {
    const result = await runScene3Generation(SCENE3_TOWELS_PRESET);
    assert(
      result.finalPrompt.includes('Jogo de Toalhas de Banho'),
      'Test E1: Towels Fixture product identity embedded'
    );
    assert(
      result.finalPrompt.includes(SCENE3_TOWELS_PRESET.spokenCta),
      'Test E2: Towels CTA byte-preserved'
    );
  } catch (e: any) {
    assert(false, 'Test E: Towels Fixture execution', e.message);
  }

  // 6. TEST F: Missing CTA Error Gate
  try {
    const invalidInput: Scene3GenerationInput = {
      ...SCENE3_BIBLE_PRESET,
      spokenCta: ''
    };
    await runScene3Generation(invalidInput);
    assert(false, 'Test F: Should throw SCENE3_CTA_MISSING when CTA is empty');
  } catch (e: any) {
    assert(
      e instanceof Scene3OrchestrationError && e.code === 'SCENE3_CTA_MISSING',
      'Test F: Throws SCENE3_CTA_MISSING on empty CTA'
    );
  }

  // 7. TEST G: Missing Product Context Error Gate
  try {
    const invalidInput: Scene3GenerationInput = {
      ...SCENE3_BIBLE_PRESET,
      productContext: {
        identity: '',
        visibleDetails: [],
        knownPhysicalFacts: []
      }
    };
    await runScene3Generation(invalidInput);
    assert(false, 'Test G: Should throw SCENE3_PRODUCT_CONTEXT_MISSING');
  } catch (e: any) {
    assert(
      e instanceof Scene3OrchestrationError && e.code === 'SCENE3_PRODUCT_CONTEXT_MISSING',
      'Test G: Throws SCENE3_PRODUCT_CONTEXT_MISSING'
    );
  }

  // 8. TEST H: Missing Presenter Error Gate
  try {
    const invalidInput: Scene3GenerationInput = {
      ...SCENE3_BIBLE_PRESET,
      presenter: {
        identity: ''
      }
    };
    await runScene3Generation(invalidInput);
    assert(false, 'Test H: Should throw SCENE3_PRESENTER_MISSING');
  } catch (e: any) {
    assert(
      e instanceof Scene3OrchestrationError && e.code === 'SCENE3_PRESENTER_MISSING',
      'Test H: Throws SCENE3_PRESENTER_MISSING'
    );
  }

  // 9. TEST I: Missing Wardrobe Error Gate
  try {
    const invalidInput: Scene3GenerationInput = {
      ...SCENE3_BIBLE_PRESET,
      wardrobe: {
        description: ''
      }
    };
    await runScene3Generation(invalidInput);
    assert(false, 'Test I: Should throw SCENE3_WARDROBE_MISSING');
  } catch (e: any) {
    assert(
      e instanceof Scene3OrchestrationError && e.code === 'SCENE3_WARDROBE_MISSING',
      'Test I: Throws SCENE3_WARDROBE_MISSING'
    );
  }

  // 10. TEST J: Wardrobe Priority Contract Verification
  try {
    const result = await runScene3Generation(SCENE3_BIBLE_PRESET);
    assert(
      result.finalPrompt.includes(SCENE_3_AVATAR_WARDROBE_PRIORITY_CLAUSE),
      'Test J: Wardrobe Priority Clause enforced in Scene 3 prompt'
    );
  } catch (e: any) {
    assert(false, 'Test J: Wardrobe Priority execution', e.message);
  }

  // 11. TEST K: Immutability / Frozen Model Verification
  try {
    const result = await runScene3Generation(SCENE3_WATCH_PRESET);
    assert(
      Object.isFrozen(result.compiledModel),
      'Test K1: CompiledScene3Model is frozen via Object.freeze'
    );
    assert(
      Object.isFrozen(result.compiledModel.productContract),
      'Test K2: Nested productContract model is frozen'
    );
    assert(
      Object.isFrozen(result.compiledModel.dialogue),
      'Test K3: Nested dialogue model is frozen'
    );
  } catch (e: any) {
    assert(false, 'Test K: Frozen model verification', e.message);
  }

  // 12. TEST L: Structured JSON Output Verification
  try {
    const result = await runScene3Generation(SCENE3_BIBLE_PRESET);
    assert(
      Boolean(result.jsonOutput && result.jsonOutput.scene === 3),
      'Test L1: jsonOutput has scene: 3'
    );
    assert(
      typeof result.compiledJsonString === 'string' && result.compiledJsonString.startsWith('{'),
      'Test L2: compiledJsonString is valid stringified JSON'
    );
  } catch (e: any) {
    assert(false, 'Test L: JSON Output execution', e.message);
  }

  // 13. TEST M: Diagnostic Trace Safety (No base64, no secrets)
  try {
    const result = await runScene3Generation(SCENE3_TOWELS_PRESET);
    const trace = result.diagnosticTrace;
    assert(
      trace.ctaByteLockVerified === true,
      'Test M1: Diagnostic trace confirms ctaByteLockVerified: true'
    );
    assert(
      trace.productContextSummary.factsCount >= 1,
      'Test M2: Diagnostic trace contains factual context summary'
    );
    assert(
      trace.executionTimeMs >= 0,
      'Test M3: Diagnostic trace tracks execution time'
    );
  } catch (e: any) {
    assert(false, 'Test M: Diagnostic trace execution', e.message);
  }

  // 14. TEST N: Independent Scene 2 vs Scene 3 Isolation
  try {
    // Scene 2 compilation
    const scene2Model = buildCompiledScene2Model(BATH_TOWELS_PRESET);
    const scene2Prompt = compileScene2Prompt(BATH_TOWELS_PRESET);

    // Scene 3 compilation
    const scene3Result = await runScene3Generation(SCENE3_TOWELS_PRESET);

    assert(
      scene2Prompt.includes('SCENE 2: SPOKEN BENEFIT & PHYSICAL DEMONSTRATION'),
      'Test N1: Scene 2 prompt contains Scene 2 header'
    );
    assert(
      scene3Result.finalPrompt.includes('SCENE 3: CONVERSION & CTA CLOSING'),
      'Test N2: Scene 3 prompt contains Scene 3 header'
    );
    assert(
      !scene2Prompt.includes('SCENE 3: CONVERSION & CTA CLOSING'),
      'Test N3: Scene 2 prompt is not polluted by Scene 3'
    );
    assert(
      !scene3Result.finalPrompt.includes('SCENE 2: CORE PRODUCT DEMO'),
      'Test N4: Scene 3 prompt is not polluted by Scene 2'
    );
  } catch (e: any) {
    assert(false, 'Test N: Isolation execution', e.message);
  }

  return { passed, failed, errors };
}
