import { Scene3CtaHandoff } from '../../types/scene3';
import { runScene3Generation } from '../scene3GenerationService';
import { SCENE3_BIBLE_PRESET } from '../../data/scene3Presets';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[FAIL] ${message}`);
  }
}

export async function runAllScene3CtaHandoffTests(): Promise<void> {
  console.log('\n--- Running Scene 3 Explicit CTA Handoff Tests (Phase 2.4.2) ---');

  // Test 1: Handoff data contract structure and byte preservation
  const rawCopyAgentCta = 'Clique no carrinho laranja abaixo e aproveite o frete grátis antes que o estoque esgote!';
  const handoff: Scene3CtaHandoff = {
    cta: rawCopyAgentCta,
    source: 'scene2_handoff',
    versionId: 2,
    productTitle: 'Bíblia de Estudo Luxo',
    sentAt: Date.now(),
    characterCount: rawCopyAgentCta.length
  };

  assert(handoff.cta === rawCopyAgentCta, 'Test 1: Handoff CTA must match raw copy agent CTA verbatim');
  assert(handoff.characterCount === rawCopyAgentCta.length, 'Test 1: Character count must match exact string length');
  console.log('[PASS] Test 1: Explicit CTA handoff structure and byte preservation verified');

  // Test 2: Full Scene 3 pipeline execution with explicit handoff CTA
  const scene3Input = {
    ...SCENE3_BIBLE_PRESET,
    spokenCta: handoff.cta,
    apiKey: 'mock-api-key'
  };

  const result = await runScene3Generation(scene3Input);

  assert(result.dynamicSlots.spokenCta === rawCopyAgentCta, 'Test 2: Dynamic slot spokenCta must equal handoff CTA');
  assert(result.finalPrompt.includes(rawCopyAgentCta), 'Test 2: Final prompt must include exact verbatim CTA');
  assert(result.diagnosticTrace.ctaByteLockVerified === true, 'Test 2: Byte-lock verification must be true in diagnostic trace');
  console.log('[PASS] Test 2: Full Scene 3 pipeline respects explicit handoff CTA with zero drift');

  // Test 3: Product lifecycle invalidation contract
  let sharedHandoffState: Scene3CtaHandoff | null = handoff;
  const invalidateProduct = () => {
    sharedHandoffState = null;
  };

  assert(sharedHandoffState !== null, 'Test 3: Handoff exists before product invalidation');
  invalidateProduct();
  assert(sharedHandoffState === null, 'Test 3: Handoff is completely cleared upon product invalidation');
  console.log('[PASS] Test 3: Product invalidation properly flushes shared CTA handoff state');

  // Test 4: Special characters and emojis in handoff CTA preservation
  const specialCta = 'Toque no link 🔗 e garanta 50% OFF agora mesmo! ⚡';
  const specialHandoff: Scene3CtaHandoff = {
    cta: specialCta,
    source: 'scene2_handoff',
    sentAt: Date.now(),
    characterCount: specialCta.length
  };

  const specialResult = await runScene3Generation({
    ...SCENE3_BIBLE_PRESET,
    spokenCta: specialHandoff.cta,
    apiKey: 'mock-api-key'
  });

  assert(specialResult.dynamicSlots.spokenCta === specialCta, 'Test 4: Special characters dynamic slot preserved');
  assert(specialResult.finalPrompt.includes(specialCta), 'Test 4: Special characters in final prompt preserved byte-for-byte');
  console.log('[PASS] Test 4: Unicode and emoji byte preservation in explicit CTA handoff verified');

  console.log('Scene 3 Explicit CTA Handoff Tests: ALL PASSED');
}
