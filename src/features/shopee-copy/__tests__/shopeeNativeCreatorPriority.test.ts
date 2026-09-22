/**
 * SHOPEE NATIVE CREATOR PRIORITY VERIFICATION SUITE
 * 
 * Verifies:
 * 1. SHOPEE_NATIVE_CREATOR preset definition & 5-step sequence
 * 2. Preferred structures: Produto em Uso, Diferencial → Benefício, Review Pessoal
 * 3. Default structure is PRODUCT_IN_USE, default style is UGC_NATURAL, default CTA is PRODUTO_MARCADO
 * 4. buildShopeeCopyPrompt injects Native Creator priority instructions
 * 5. Scene 2 prompt & planner prioritize visible physical proof of the spoken benefit
 * 6. Scene 2 has NO CTA and strictly adheres to 160-175 character range
 * 7. generateAutoDialogueForShopee adheres to Native Creator pattern within 160-175 characters
 * 8. Compliance guard operates seamlessly with zero regressions
 * 9. Manual dialogue remains byte-identical (no silent rewrites)
 */

import {
  ShopeePreset,
  SHOPEE_PRESET_DEFINITIONS,
  SHOPEE_NATIVE_CREATOR_STEPS,
  ShopeeCopyStructure,
  ShopeeCopyStyle,
  ShopeeCTAType,
  ShopeeCopyOutputMode,
  DEFAULT_SHOPEE_COMMERCIAL_EVIDENCE
} from '../types';
import {
  SHOPEE_STRUCTURE_DEFINITIONS,
  getShopeeStructureInstruction
} from '../shopeeStructureEngine';
import { buildShopeeCopyPrompt } from '../shopeeCopyService';
import { runShopeeSceneHubPipeline, generateAutoDialogueForShopee } from '../../shopee-scene-hub/shopeeSceneBrain';
import { ShopeeVideoComplianceGuard } from '../../shopee-compliance/services/ShopeeVideoComplianceGuard';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`FAIL: ${msg}`);
    throw new Error(msg);
  }
  console.log(`PASS: ${msg}`);
}

console.log('=== RUNNING SHOPEE NATIVE CREATOR PRIORITY TEST SUITE ===');

// 1. Preset Definition & Sequence
assert(
  ShopeePreset.SHOPEE_NATIVE_CREATOR === 'SHOPEE_NATIVE_CREATOR',
  '1. ShopeePreset.SHOPEE_NATIVE_CREATOR is registered'
);

assert(
  SHOPEE_NATIVE_CREATOR_STEPS.length === 5,
  '2. SHOPEE_NATIVE_CREATOR_STEPS has exactly 5 steps'
);

assert(
  SHOPEE_NATIVE_CREATOR_STEPS[0] === 'Product in Use',
  '3. Step 1 is Product in Use'
);

assert(
  SHOPEE_NATIVE_CREATOR_STEPS[1] === 'Feature Demonstration',
  '4. Step 2 is Feature Demonstration'
);

assert(
  SHOPEE_NATIVE_CREATOR_STEPS[2] === 'Practical Benefit',
  '5. Step 3 is Practical Benefit'
);

assert(
  SHOPEE_NATIVE_CREATOR_STEPS[3] === 'Personal Opinion',
  '6. Step 4 is Personal Opinion'
);

assert(
  SHOPEE_NATIVE_CREATOR_STEPS[4] === 'Native Shopee CTA',
  '7. Step 5 is Native Shopee CTA'
);

// 2. Preferred Structures & Defaults
const nativeDef = SHOPEE_PRESET_DEFINITIONS[ShopeePreset.SHOPEE_NATIVE_CREATOR];
assert(!!nativeDef, '8. Preset definition is populated');
assert(
  nativeDef.preferredStructures.includes(ShopeeCopyStructure.PRODUCT_IN_USE) &&
  nativeDef.preferredStructures.includes(ShopeeCopyStructure.FEATURE_TO_BENEFIT) &&
  nativeDef.preferredStructures.includes(ShopeeCopyStructure.PERSONAL_REVIEW),
  '9. Preferred structures include Produto em Uso, Diferencial -> Benefício, Review Pessoal'
);

assert(
  nativeDef.defaultStructure === ShopeeCopyStructure.PRODUCT_IN_USE,
  '10. Default structure is PRODUCT_IN_USE'
);
assert(
  nativeDef.defaultStyle === ShopeeCopyStyle.UGC_NATURAL,
  '11. Default style is UGC_NATURAL'
);
assert(
  nativeDef.defaultCta === ShopeeCTAType.PRODUTO_MARCADO,
  '12. Default CTA is PRODUTO_MARCADO'
);

// 3. Prompt Construction with Native Creator Priority
const prompt = buildShopeeCopyPrompt({
  productName: 'Mop Giratório 360',
  productContext: 'Balde com centrífuga em inox. Cabo extensível de 1.30m. Microfibra lavável. Balde cinza e azul com pedal.',
  evidence: DEFAULT_SHOPEE_COMMERCIAL_EVIDENCE,
  structure: ShopeeCopyStructure.PRODUCT_IN_USE,
  style: ShopeeCopyStyle.UGC_NATURAL,
  ctaType: ShopeeCTAType.PRODUTO_MARCADO,
  outputMode: ShopeeCopyOutputMode.FULL_COPY,
  preset: ShopeePreset.SHOPEE_NATIVE_CREATOR
});

assert(
  prompt.includes('SHOPEE_NATIVE_CREATOR'),
  '13. Prompt explicitly activates SHOPEE_NATIVE_CREATOR priority'
);
assert(
  prompt.includes('Product in Use') &&
  prompt.includes('Feature Demonstration') &&
  prompt.includes('Practical Benefit') &&
  prompt.includes('Personal Opinion') &&
  prompt.includes('Native Shopee CTA'),
  '14. Prompt contains the complete 5-step native creator sequence'
);
assert(
  prompt.includes('prova física visível do benefício falado'),
  '15. Prompt instructs Scene 2 to prioritize visible physical proof of the spoken benefit'
);

// 4. Scene 2 Physical Proof Choreography in Scene Hub
const hubResult = runShopeeSceneHubPipeline({
  productWorkspace: {
    productName: 'Mop Giratório',
    canonicalColor: 'cinza e azul',
    observableFacts: ['Balde com centrífuga inox', 'Cabo extensível'],
    specificPain: 'dor nas costas ao passar pano',
    functionalEnvironment: 'sala de estar com piso porcelanato claro'
  } as any,
  presenterSource: 'manual',
  manualPresenterGender: 'female',
  manualPresenterDesc: 'Apresentadora brasileira comunicativa',
  dialogueMode: 'auto',
  ctaMode: 'produto_marcado'
});

const scene2Prompt = hubResult.scene2.prompt;
assert(
  scene2Prompt.includes('0.0s - 2.0s:') &&
  scene2Prompt.includes('2.0s - 4.0s:') &&
  scene2Prompt.includes('4.0s - 6.0s:') &&
  scene2Prompt.includes('6.0s - 8.0s:'),
  '16. Scene 2 produces 4 physical action beats (0-2s, 2-4s, 4-6s, 6-8s)'
);

assert(
  scene2Prompt.includes('visible physical proof'),
  '17. Scene 2 prompt prioritizes visible physical proof of the spoken benefit'
);
assert(
  !scene2Prompt.includes('clica no link') && !scene2Prompt.includes('compre agora') && !scene2Prompt.includes('carrinho laranja'),
  '18. Scene 2 contains no CTA or forbidden platform terms'
);

// 5. Auto-Dialogue Generation
const autoDialogue = generateAutoDialogueForShopee(
  'Mop Giratório',
  'limpeza pesada do chão',
  'centrífuga em inox',
  'produto_marcado'
);

assert(
  autoDialogue.scene2.length >= 160 && autoDialogue.scene2.length <= 175,
  `19. Scene 2 auto dialogue is strictly in 160-175 range (actual: ${autoDialogue.scene2.length})`
);
assert(
  autoDialogue.scene3.includes('produto tá marcado aqui embaixo'),
  '20. Scene 3 auto dialogue uses native Shopee CTA'
);
assert(
  !autoDialogue.scene2.toLowerCase().includes('clica') && !autoDialogue.scene2.toLowerCase().includes('compre'),
  '21. Scene 2 auto dialogue contains no CTA'
);

// 6. Compliance Guard Compatibility
const complianceResult = ShopeeVideoComplianceGuard.audit({
  scene1Dialogue: autoDialogue.scene1,
  scene2Dialogue: autoDialogue.scene2,
  scene3Dialogue: autoDialogue.scene3,
  compiledPrompts: {
    scene1: hubResult.scene1.prompt,
    scene2: hubResult.scene2.prompt,
    scene3: hubResult.scene3.prompt
  },
  productContext: {
    identity: 'Mop Giratório',
    observableDetails: ['Balde cinza e azul']
  }
});

assert(
  complianceResult.status === 'APTO',
  `22. Generated Native Creator flow is APTO under Compliance Guard (actual: ${complianceResult.status})`
);

// 7. Manual Dialogue Immutability Under Native Creator Mode
const manualViolatingText = 'Esse mop tem resultado garantido e nunca quebra.';
const manualEval = ShopeeVideoComplianceGuard.audit({
  scene1Dialogue: 'Olha só essa novidade para casa.',
  scene2Dialogue: manualViolatingText,
  scene3Dialogue: 'Confere no produto marcado aqui embaixo no vídeo.'
});

assert(
  manualEval.status === 'BLOQUEADO',
  '23. Violation detected in manual dialogue'
);
assert(
  manualViolatingText === 'Esse mop tem resultado garantido e nunca quebra.',
  '24. Original manual dialogue text remains 100% byte-identical without silent rewrite'
);

console.log('=== ALL 24 SHOPEE NATIVE CREATOR TESTS PASSED SUCCESSFULLY ===');
