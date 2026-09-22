import { runAllScene2CompilerTests } from './promptCompiler.test';
import { runJsonRendererTests } from './jsonRenderer.test';
import { runScene3CompilerTests } from './scene3PromptCompiler.test';
import { runAllScene3BrainTests } from '../../services/__tests__/scene3BrainService.test';
import { runAllScene3IntegrationTests } from '../../services/__tests__/scene3Integration.test';
import { runAllScene3ProductImagePasteTests } from '../../services/__tests__/scene3ProductImagePaste.test';
import { runAllScene3CtaHandoffTests } from '../../services/__tests__/scene3CtaHandoff.test';
import { runAllScene2CopyBrainTests } from '../../services/__tests__/scene2CopyBrain.test';
import { runProductGroundingTests } from '../../services/__tests__/productGrounding.test';
import { runCanonicalProductResolverTests } from '../../services/__tests__/canonicalProductResolver.test';
import { runProductStructuralDNATests } from '../../services/__tests__/productStructuralDNA.test';
import { runPhysicalChoreographyTests } from '../../services/__tests__/physicalChoreographyResolver.test';

async function main() {
  console.log('\n======================================================');
  console.log('1. RUNNING PROMPT COMPILER TEST SUITE (FASE 1.0)');
  console.log('======================================================');
  const results = runAllScene2CompilerTests();
  console.log('\n--- COMPILED OUTPUT SAMPLE (TEST A — BATH TOWELS) ---');
  console.log(results.testA);
  console.log('\n--- COMPILED OUTPUT SAMPLE (TEST B — WRISTWATCH) ---');
  console.log(results.testB);

  console.log('\n======================================================');
  console.log('2. RUNNING DUAL RENDERER & JSON TEST SUITE (FASE 1.2B)');
  console.log('======================================================');
  runJsonRendererTests();

  console.log('\n======================================================');
  console.log('3. RUNNING SCENE 3 COMPILER TEST SUITE (PHASE 2.2)');
  console.log('======================================================');
  const scene3Results = runScene3CompilerTests();

  console.log('\n======================================================');
  console.log('4. RUNNING SCENE 3 BRAIN TEST SUITE (PHASE 2.3)');
  console.log('======================================================');
  const scene3BrainResults = await runAllScene3BrainTests();

  console.log('\n======================================================');
  console.log('5. RUNNING SCENE 3 END-TO-END INTEGRATION TEST SUITE (PHASE 2.4)');
  console.log('======================================================');
  const scene3IntegrationResults = await runAllScene3IntegrationTests();

  console.log('\n======================================================');
  console.log('6. RUNNING SCENE 3 IMAGE INPUT & PASTE TEST SUITE (PHASE 2.4.1)');
  console.log('======================================================');
  const scene3ImageResults = await runAllScene3ProductImagePasteTests();

  console.log('\n======================================================');
  console.log('7. RUNNING SCENE 3 EXPLICIT CTA HANDOFF TEST SUITE (PHASE 2.4.2)');
  console.log('======================================================');
  await runAllScene3CtaHandoffTests();

  console.log('\n======================================================');
  console.log('8. RUNNING COPY BRAIN C2 TEST SUITE (FASE 1.1)');
  console.log('======================================================');
  const copyBrainResults = await runAllScene2CopyBrainTests();
  copyBrainResults.summary.forEach(s => console.log(s));
  console.log(`\nCopy Brain Tests: ${copyBrainResults.passed} PASSED, ${copyBrainResults.failed} FAILED`);

  const groundingResults = await runProductGroundingTests();
  const canonicalResolverResults = await runCanonicalProductResolverTests();
  const dnaResults = await runProductStructuralDNATests();
  const physicalChoreographyResults = await runPhysicalChoreographyTests();

  if (
    copyBrainResults.failed > 0 ||
    groundingResults.failed > 0 ||
    canonicalResolverResults.failed > 0 ||
    dnaResults.failed > 0 ||
    physicalChoreographyResults.failed > 0 ||
    scene3Results.failed > 0 ||
    scene3BrainResults.failed > 0 ||
    scene3IntegrationResults.failed > 0 ||
    scene3ImageResults.failed > 0
  ) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});

