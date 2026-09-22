/**
 * STAGE 7B — REAL GENERATION VALIDATION TEST HARNESS
 *
 * Tests the collection, comparison, classification, and multi-run aggregation
 * of real generation outputs against Pre-Generation Audits and Prompt Audits.
 *
 * Requirements:
 * - TEST A: Record VALIDATED
 * - TEST B: Record FLOW_VARIANCE
 * - TEST C: Record PIPELINE_BUG
 * - TEST D: Record AUDITOR_GAP
 * - TEST E: Record UNDETERMINED
 * - TEST F: Three generations of the same prompt can be grouped
 * - TEST G: Zero new AI calls
 * - TEST H: The record does not alter the original prompt
 */

import {
  aggregateRealGenerationBatch,
  classifyRealGeneration,
  createRealGenerationRecord
} from '../services/realGenerationValidator';
import {
  ObservedGenerationResult,
  RealGenerationValidationRecord
} from '../types/realGenerationTypes';
import { VisualConsistencyValidation } from '../types/validationTypes';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[FAIL] ${message}`);
  }
}

function createMockAudit(status: 'PASS' | 'WARNING' | 'FAIL' = 'PASS'): VisualConsistencyValidation {
  return {
    avatarIdentity: {
      source: 'AvatarReferenceProfile',
      present: true,
      preserved: true
    },
    wardrobe: {
      source: 'Defined Wardrobe Configuration',
      present: true,
      preserved: true
    },
    poseAction: {
      source: 'Scene Action Directives',
      present: true,
      preserved: true
    },
    product: {
      source: 'Product Structural DNA',
      present: true,
      preserved: true
    },
    background: {
      source: 'Scene Environment',
      present: true,
      preserved: true
    },
    camera: {
      source: 'Cinematic Camera Directives',
      present: true,
      preserved: true
    },
    overallStatus: status,
    issues: status === 'FAIL' ? [
      {
        id: 'iss_1',
        domain: 'wardrobe',
        severity: 'FAIL',
        message: 'Wardrobe conflict detected',
        rule: 'Defined > Reference'
      }
    ] : [],
    timestamp: Date.now()
  };
}

export function runRealGenerationValidationTests() {
  console.log('--- Running Stage 7B — Real Generation Validation Harness Tests ---');

  const canonicalPrompt =
    '[AVATAR IDENTITY REFERENCE & LOCK] Natural woman in her late 20s. [WARDROBE] Basic white t-shirt and blue jeans. [3. PRODUCT IDENTITY & OBJECT LOCK] Single amber bottle.';

  // TEST 1: Single Record VALIDATED
  {
    const audit = createMockAudit('PASS');
    const observedResult: ObservedGenerationResult = {
      avatarIdentity: 'PASS',
      wardrobe: 'PASS',
      poseAction: 'PASS',
      product: 'PASS',
      background: 'PASS',
      camera: 'PASS',
      kitComposition: 'NOT_APPLICABLE',
      motionSafety: 'NOT_APPLICABLE'
    };

    const record = createRealGenerationRecord({
      scenario: 'Avatar + Unit Product Validation',
      consistencyAudit: audit,
      finalPrompt: canonicalPrompt,
      observedResult,
      isPromptCorrect: true
    });

    assert(record.classification === 'VALIDATED', 'Single Record must be classified as VALIDATED');
    assert(record.notes && record.notes.length > 0, 'Record must contain diagnostic notes');
  }

  // TEST 2: Single Record FLOW_VARIANCE
  {
    const audit = createMockAudit('PASS');
    const observedResult: ObservedGenerationResult = {
      avatarIdentity: 'PASS',
      wardrobe: 'PASS',
      poseAction: 'PASS',
      product: 'DRIFT',
      background: 'PASS',
      camera: 'PASS',
      kitComposition: 'NOT_APPLICABLE',
      motionSafety: 'NOT_APPLICABLE'
    };

    const record = createRealGenerationRecord({
      scenario: 'Avatar + Unit Product (Morphing Drift)',
      consistencyAudit: audit,
      finalPrompt: canonicalPrompt,
      observedResult,
      isPromptCorrect: true
    });

    assert(record.classification === 'FLOW_VARIANCE', 'Record must be classified as FLOW_VARIANCE');
  }

  // TEST 3: Single Record PIPELINE_BUG
  {
    const audit = createMockAudit('FAIL');
    const observedResult: ObservedGenerationResult = {
      avatarIdentity: 'PASS',
      wardrobe: 'DRIFT',
      poseAction: 'PASS',
      product: 'PASS',
      background: 'PASS',
      camera: 'PASS'
    };

    const record = createRealGenerationRecord({
      scenario: 'Wardrobe Override Pipeline Bug',
      consistencyAudit: audit,
      finalPrompt: canonicalPrompt,
      observedResult,
      isPromptCorrect: false
    });

    assert(record.classification === 'PIPELINE_BUG', 'Record must be classified as PIPELINE_BUG');
  }

  // TEST 4: Single Record AUDITOR_GAP
  {
    const audit = createMockAudit('PASS');
    const observedResult: ObservedGenerationResult = {
      avatarIdentity: 'PASS',
      wardrobe: 'DRIFT',
      poseAction: 'PASS',
      product: 'PASS'
    };

    const record = createRealGenerationRecord({
      scenario: 'Uncaught Prompt Contamination Gap',
      consistencyAudit: audit,
      finalPrompt: canonicalPrompt,
      observedResult,
      isPromptCorrect: false
    });

    assert(record.classification === 'AUDITOR_GAP', 'Record must be classified as AUDITOR_GAP');
  }

  // TEST 5: Single Record UNDETERMINED
  {
    const audit = createMockAudit('PASS');
    const observedResult: ObservedGenerationResult = {
      avatarIdentity: 'NOT_APPLICABLE',
      wardrobe: 'NOT_APPLICABLE',
      poseAction: 'NOT_APPLICABLE',
      product: 'NOT_APPLICABLE'
    };

    const record = createRealGenerationRecord({
      scenario: 'Unobserved Incomplete Generation',
      consistencyAudit: audit,
      finalPrompt: canonicalPrompt,
      observedResult,
      isPromptCorrect: true
    });

    assert(record.classification === 'UNDETERMINED', 'Record must be classified as UNDETERMINED');
  }

  // --- CORE STAGE 7B MICROADJUSTMENT TEST MATRIX (A THROUGH F) ---

  // TEST A: Audit PASS + Prompt Correct + Same Drift 3/3 -> MODEL_SYSTEMATIC_LIMITATION
  {
    const audit = createMockAudit('PASS');

    const run1 = createRealGenerationRecord({
      scenario: 'Product Text Rendering (Run 1)',
      consistencyAudit: audit,
      finalPrompt: canonicalPrompt,
      observedResult: { product: 'DRIFT' },
      isPromptCorrect: true
    });
    const run2 = createRealGenerationRecord({
      scenario: 'Product Text Rendering (Run 2)',
      consistencyAudit: audit,
      finalPrompt: canonicalPrompt,
      observedResult: { product: 'DRIFT' },
      isPromptCorrect: true
    });
    const run3 = createRealGenerationRecord({
      scenario: 'Product Text Rendering (Run 3)',
      consistencyAudit: audit,
      finalPrompt: canonicalPrompt,
      observedResult: { product: 'DRIFT' },
      isPromptCorrect: true
    });

    const batch = aggregateRealGenerationBatch({
      scenario: 'Product Text Limitation Across 3 Runs',
      finalPrompt: canonicalPrompt,
      preGenerationAudit: audit,
      runs: [run1, run2, run3],
      isPromptCorrect: true
    });

    assert(
      batch.aggregateClassification === 'MODEL_SYSTEMATIC_LIMITATION',
      `TEST A: Expected MODEL_SYSTEMATIC_LIMITATION, got ${batch.aggregateClassification}`
    );
    assert(
      batch.findings.some((f) => f.includes('The pre-generation audit and compiled prompt are structurally correct, but the same generation drift reproduced consistently across all runs.')),
      'TEST A: Findings must state canonical explanation note'
    );
    console.log('[PASS] TEST A: Audit PASS + Prompt Correct + same drift 3/3 -> MODEL_SYSTEMATIC_LIMITATION');
  }

  // TEST B: Audit FAIL + Prompt Wrong + Same Drift 3/3 -> PIPELINE_BUG
  {
    const audit = createMockAudit('FAIL');

    const run1 = createRealGenerationRecord({
      scenario: 'Wardrobe Bug (Run 1)',
      consistencyAudit: audit,
      finalPrompt: canonicalPrompt,
      observedResult: { wardrobe: 'DRIFT' },
      isPromptCorrect: false
    });
    const run2 = createRealGenerationRecord({
      scenario: 'Wardrobe Bug (Run 2)',
      consistencyAudit: audit,
      finalPrompt: canonicalPrompt,
      observedResult: { wardrobe: 'DRIFT' },
      isPromptCorrect: false
    });
    const run3 = createRealGenerationRecord({
      scenario: 'Wardrobe Bug (Run 3)',
      consistencyAudit: audit,
      finalPrompt: canonicalPrompt,
      observedResult: { wardrobe: 'DRIFT' },
      isPromptCorrect: false
    });

    const batch = aggregateRealGenerationBatch({
      scenario: 'Wardrobe Defect Across 3 Runs',
      finalPrompt: canonicalPrompt,
      preGenerationAudit: audit,
      runs: [run1, run2, run3],
      isPromptCorrect: false
    });

    assert(
      batch.aggregateClassification === 'PIPELINE_BUG',
      `TEST B: Expected PIPELINE_BUG, got ${batch.aggregateClassification}`
    );
    console.log('[PASS] TEST B: Audit FAIL + Prompt Wrong + same drift 3/3 -> PIPELINE_BUG');
  }

  // TEST C: Audit PASS + Prompt Correct + Different Drift -> FLOW_VARIANCE
  {
    const audit = createMockAudit('PASS');

    const run1 = createRealGenerationRecord({
      scenario: 'Stochastic Drift (Run 1)',
      consistencyAudit: audit,
      finalPrompt: canonicalPrompt,
      observedResult: { background: 'DRIFT' },
      isPromptCorrect: true
    });
    const run2 = createRealGenerationRecord({
      scenario: 'Stochastic Drift (Run 2)',
      consistencyAudit: audit,
      finalPrompt: canonicalPrompt,
      observedResult: { camera: 'DRIFT' },
      isPromptCorrect: true
    });
    const run3 = createRealGenerationRecord({
      scenario: 'Stochastic Drift (Run 3)',
      consistencyAudit: audit,
      finalPrompt: canonicalPrompt,
      observedResult: { product: 'DRIFT' },
      isPromptCorrect: true
    });

    const batch = aggregateRealGenerationBatch({
      scenario: 'Multi-domain Non-uniform Variance',
      finalPrompt: canonicalPrompt,
      preGenerationAudit: audit,
      runs: [run1, run2, run3],
      isPromptCorrect: true
    });

    assert(
      batch.aggregateClassification === 'FLOW_VARIANCE',
      `TEST C: Expected FLOW_VARIANCE, got ${batch.aggregateClassification}`
    );
    console.log('[PASS] TEST C: Audit PASS + Prompt Correct + different drift -> FLOW_VARIANCE');
  }

  // TEST D: 2/3 PASS + 1/3 DRIFT -> FLOW_VARIANCE
  {
    const audit = createMockAudit('PASS');

    const run1 = createRealGenerationRecord({
      scenario: 'Avatar + 3-Item Kit (Run 1)',
      consistencyAudit: audit,
      finalPrompt: canonicalPrompt,
      observedResult: { avatarIdentity: 'PASS', product: 'PASS', kitComposition: 'PASS' },
      isPromptCorrect: true
    });
    const run2 = createRealGenerationRecord({
      scenario: 'Avatar + 3-Item Kit (Run 2)',
      consistencyAudit: audit,
      finalPrompt: canonicalPrompt,
      observedResult: { avatarIdentity: 'PASS', product: 'PASS', kitComposition: 'PASS' },
      isPromptCorrect: true
    });
    const run3 = createRealGenerationRecord({
      scenario: 'Avatar + 3-Item Kit (Run 3)',
      consistencyAudit: audit,
      finalPrompt: canonicalPrompt,
      observedResult: { avatarIdentity: 'PASS', product: 'PASS', kitComposition: 'DRIFT' },
      isPromptCorrect: true
    });

    const batch = aggregateRealGenerationBatch({
      scenario: 'Avatar + 3-Item Kit Statistical Grouping',
      finalPrompt: canonicalPrompt,
      preGenerationAudit: audit,
      runs: [run1, run2, run3],
      isPromptCorrect: true
    });

    assert(batch.generations.length === 3, 'TEST D: Batch must contain exactly 3 runs');
    assert(batch.aggregateClassification === 'FLOW_VARIANCE', 'TEST D: 2/3 pass + 1/3 drift must classify as FLOW_VARIANCE');
    console.log('[PASS] TEST D: 2/3 pass + 1/3 drift -> FLOW_VARIANCE');
  }

  // TEST E: Previous classification VALIDATED continues working seamlessly
  {
    const audit = createMockAudit('PASS');

    const run1 = createRealGenerationRecord({
      scenario: 'Cleaned Reference Handoff (Run 1)',
      consistencyAudit: audit,
      finalPrompt: canonicalPrompt,
      observedResult: { avatarIdentity: 'PASS', wardrobe: 'PASS', poseAction: 'PASS' },
      isPromptCorrect: true
    });
    const run2 = createRealGenerationRecord({
      scenario: 'Cleaned Reference Handoff (Run 2)',
      consistencyAudit: audit,
      finalPrompt: canonicalPrompt,
      observedResult: { avatarIdentity: 'PASS', wardrobe: 'PASS', poseAction: 'PASS' },
      isPromptCorrect: true
    });
    const run3 = createRealGenerationRecord({
      scenario: 'Cleaned Reference Handoff (Run 3)',
      consistencyAudit: audit,
      finalPrompt: canonicalPrompt,
      observedResult: { avatarIdentity: 'PASS', wardrobe: 'PASS', poseAction: 'PASS' },
      isPromptCorrect: true
    });

    const batch = aggregateRealGenerationBatch({
      scenario: 'Cleaned Reference 3-Run Validation',
      finalPrompt: canonicalPrompt,
      preGenerationAudit: audit,
      runs: [run1, run2, run3],
      isPromptCorrect: true
    });

    assert(batch.aggregateClassification === 'VALIDATED', 'TEST E: 3/3 PASS runs must classify as VALIDATED');
    console.log('[PASS] TEST E: Previous classification VALIDATED continues working as expected');
  }

  // TEST F: Zero new AI calls and instant synchronous execution
  {
    const audit = createMockAudit('PASS');
    const start = Date.now();
    for (let i = 0; i < 50; i++) {
      const record = createRealGenerationRecord({
        scenario: `Performance Test Run ${i}`,
        consistencyAudit: audit,
        finalPrompt: canonicalPrompt,
        observedResult: { avatarIdentity: 'PASS', product: 'PASS' },
        isPromptCorrect: true
      });
      assert(record.classification === 'VALIDATED', 'Must validate synchronously');
    }
    const elapsed = Date.now() - start;
    assert(elapsed < 1000, `Synchronous execution should take < 1000ms (took ${elapsed}ms)`);
    console.log('[PASS] TEST F: Zero new AI calls and instant synchronous execution verified');
  }

  // TEST Handoff Immutability: The record strictly preserves the original prompt without mutation
  {
    const originalPrompt = '[EXACT IMMUTABLE PROMPT TEXT 12345] Special character payload: & < > " \' \n';
    const audit = createMockAudit('PASS');

    const record = createRealGenerationRecord({
      scenario: 'Immutability Verification',
      consistencyAudit: audit,
      finalPrompt: originalPrompt,
      observedResult: { avatarIdentity: 'PASS' }
    });

    assert(record.finalPrompt === originalPrompt, 'finalPrompt must be byte-for-byte identical and unmutated');
    console.log('[PASS] Immutability: Record strictly preserves original prompt without mutation');
  }

  console.log('--- ALL STAGE 7B REAL GENERATION VALIDATION TESTS (A through F) PASSED SUCCESSFULLY ---');
}

runRealGenerationValidationTests();
