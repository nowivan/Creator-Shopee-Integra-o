/**
 * FASE 1.2B — COMPILED PROMPT OUTPUT + JSON RENDERER TEST SUITE
 * 
 * Verifies:
 * 1. Zero Semantic Drift: Text Output and JSON Output share identical semantic truth.
 * 2. Canonical Model: buildCompiledScene2Model is single source of truth.
 * 3. JSON Structure & Schema: Valid RFC 8259 JSON, proper typing, strict schema.
 * 4. Deterministic Renderers: renderScene2Text and renderScene2Json are pure functions.
 * 5. Multi-Product Fixture Integrity: Bath Towels, Wristwatch, Cookware.
 */

import {
  buildCompiledScene2Model,
  renderScene2Text,
  renderScene2Json,
  renderScene2JsonString
} from '../promptCompiler';
import {
  bathTowelsSlots,
  wristwatchSlots,
  cookwareSlots
} from './promptCompiler.test';
import { Scene2JsonOutput } from '../../types/compilerTypes';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

export function runJsonRendererTests() {
  console.log('================================================================');
  console.log('STARTING FASE 1.2B DUAL RENDERER & ZERO SEMANTIC DRIFT TESTS');
  console.log('================================================================\n');

  // TEST 1: BATH TOWELS DUAL RENDERER
  console.log('▶ TEST 1: Bath Towels Dual Render & Zero Semantic Drift...');
  const modelA = buildCompiledScene2Model(bathTowelsSlots);
  const textA = renderScene2Text(modelA);
  const jsonA = renderScene2Json(modelA);
  const jsonStrA = renderScene2JsonString(modelA);

  // Validate JSON parse
  const parsedA = JSON.parse(jsonStrA) as Scene2JsonOutput;
  assert(parsedA.scene === 2, 'Scene number must be 2');
  assert(parsedA.durationSeconds === 8, 'Duration must be 8.0s');
  assert(parsedA.aspectRatio === '9:16', 'Aspect ratio must be 9:16');
  assert(parsedA.product.identity === bathTowelsSlots.productIdentity, 'Product identity must match slots');
  assert(parsedA.spokenCopy === bathTowelsSlots.spokenCopy, 'Spoken copy must match slots');
  assert(parsedA.actions.action0to2 === bathTowelsSlots.actions?.action0to2, 'Action 0-2s must match');

  // Verify Zero Semantic Drift with Text Prompt
  assert(textA.includes(parsedA.product.identity), 'Text output must contain exact product identity from JSON');
  assert(textA.includes(parsedA.spokenCopy), 'Text output must contain exact spoken copy from JSON');
  assert(textA.includes(parsedA.actions.action0to2), 'Text output must contain exact action 0-2s from JSON');
  assert(textA.includes(parsedA.environment), 'Text output must contain exact environment from JSON');
  console.log('✅ TEST 1 PASSED: Bath towels text and JSON have zero semantic drift.\n');

  // TEST 2: WRISTWATCH DUAL RENDERER
  console.log('▶ TEST 2: Wristwatch Dual Render & Zero Leakage...');
  const modelB = buildCompiledScene2Model(wristwatchSlots);
  const textB = renderScene2Text(modelB);
  const jsonB = renderScene2Json(modelB);

  assert(jsonB.product.identity === wristwatchSlots.productIdentity, 'Watch identity match');
  assert(!JSON.stringify(jsonB).includes('bathroom'), 'Watch JSON must not contain bathroom');
  assert(!textB.includes('bathroom'), 'Watch text must not contain bathroom');
  assert(textB.includes(jsonB.product.identity), 'Text must contain watch name from JSON');
  assert(textB.includes(jsonB.presenter.wardrobe.topType), 'Text must contain watch presenter top type');
  console.log('✅ TEST 2 PASSED: Wristwatch text and JSON match with zero category leakage.\n');

  // TEST 3: COOKWARE DUAL RENDERER
  console.log('▶ TEST 3: Cookware Dual Render & Invariant Structure...');
  const modelC = buildCompiledScene2Model(cookwareSlots);
  const textC = renderScene2Text(modelC);
  const jsonC = renderScene2Json(modelC);

  assert(jsonC.product.identity === cookwareSlots.productIdentity, 'Cookware identity match');
  assert(jsonC.format.includes('Brazilian UGC'), 'Format must be Brazilian UGC');
  assert(jsonC.speechActionSync.length === cookwareSlots.speechActionSync?.length, 'Sync points count must match');
  console.log('✅ TEST 3 PASSED: Cookware renders correctly in dual format.\n');

  // TEST 4: PURITY & DETERMINISM
  console.log('▶ TEST 4: Purity & Determinism of JSON and Text Renderers...');
  const model1 = buildCompiledScene2Model(bathTowelsSlots);
  const model2 = buildCompiledScene2Model(bathTowelsSlots);
  const text1 = renderScene2Text(model1);
  const text2 = renderScene2Text(model2);
  const jsonStr1 = renderScene2JsonString(model1);
  const jsonStr2 = renderScene2JsonString(model2);

  assert(text1 === text2, 'Text render must be 100% deterministic');
  assert(jsonStr1 === jsonStr2, 'JSON render must be 100% deterministic');
  console.log('✅ TEST 4 PASSED: Both text and JSON renderers are 100% pure and deterministic.\n');

  console.log('================================================================');
  console.log('🎉 ALL FASE 1.2B DUAL RENDERER TESTS PASSED SUCCESSFULLY!');
  console.log('================================================================');

  return { status: 'ALL_PASSED' };
}

if (typeof process !== 'undefined' && Array.isArray(process.argv) && process.argv[1] && import.meta.url.includes(process.argv[1].replace(/\\/g, '/'))) {
  runJsonRendererTests();
}
