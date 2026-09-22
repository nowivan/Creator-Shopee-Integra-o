/**
 * REAL GENERATION VALIDATOR SERVICE — V1 FROZEN ARCHITECTURE
 * Part of Visual Reference Engine V1.0.0 (Release Candidate)
 * Responsibilities: Deterministic 6-way classification of multi-run generation samples.
 * Source of Truth: RealGenerationValidationRecord / ObservedGenerationResult
 * AI Budget: Strictly 0 AI calls (Local offline correlation matrix).
 */

import {
  ObservedDomainStatus,
  ObservedGenerationResult,
  RealGenerationBatchRecord,
  RealGenerationClassification,
  RealGenerationValidationRecord
} from '../types/realGenerationTypes';
import { VisualConsistencyValidation } from '../types/validationTypes';

export interface ClassifyGenerationParams {
  consistencyAudit: VisualConsistencyValidation;
  finalPrompt: string;
  observedResult: ObservedGenerationResult;
  isPromptCorrect?: boolean;
  notes?: string[];
}

/**
 * Classifies a single generation run based on the Pre-Generation Audit,
 * prompt correctness, and observed visual results.
 */
export function classifyRealGeneration(
  params: ClassifyGenerationParams
): { classification: RealGenerationClassification; findings: string[] } {
  const { consistencyAudit, observedResult, isPromptCorrect = true, notes = [] } = params;
  const findings: string[] = [...notes];

  const domainEntries = Object.entries(observedResult) as [string, ObservedDomainStatus][];
  const activeObservations = domainEntries.filter(([_, status]) => status !== 'NOT_APPLICABLE');

  // 1. Insufficient Evidence Check
  if (activeObservations.length === 0) {
    findings.push('Insufficient observed evidence: no active domains recorded.');
    return { classification: 'UNDETERMINED', findings };
  }

  const driftDomains = activeObservations
    .filter(([_, status]) => status === 'DRIFT')
    .map(([domain]) => domain);

  const hasDrift = driftDomains.length > 0;
  const auditPassed = consistencyAudit.overallStatus === 'PASS' || consistencyAudit.overallStatus === 'WARNING';
  const auditFailed = consistencyAudit.overallStatus === 'FAIL';

  // 2. Auditor Gap: Audit reported PASS, but prompt was actually incorrect/flawed
  if (auditPassed && isPromptCorrect === false) {
    findings.push('Auditor Gap: Pre-generation audit marked PASS, but prompt contained unflagged structural errors.');
    return { classification: 'AUDITOR_GAP', findings };
  }

  // 3. Pipeline Bug: Audit failed, prompt was flawed, and video showed drift/error
  if (auditFailed && (!isPromptCorrect || hasDrift)) {
    findings.push(
      `Pipeline Bug: Pre-generation audit failed and generated video exhibited drift in [${driftDomains.join(', ')}].`
    );
    return { classification: 'PIPELINE_BUG', findings };
  }

  // 4. Validated: Audit passed, prompt was correct, video matched all visual authorities
  if (auditPassed && isPromptCorrect && !hasDrift) {
    findings.push('Validated: Pre-generation audit passed, prompt correct, and video generation matched all visual specifications.');
    return { classification: 'VALIDATED', findings };
  }

  // 5. Flow Variance: Audit passed, prompt was correct, but stochastic generative model diverged
  if (auditPassed && isPromptCorrect && hasDrift) {
    findings.push(
      `Flow Variance: Pre-generation audit passed and prompt was correct, but generative model drifted on [${driftDomains.join(', ')}].`
    );
    return { classification: 'FLOW_VARIANCE', findings };
  }

  // Fallback for indeterminate state
  findings.push('Indeterminate state: observation patterns do not cleanly map to standard classification.');
  return { classification: 'UNDETERMINED', findings };
}

/**
 * Creates an immutable RealGenerationValidationRecord for a single generation run.
 */
export function createRealGenerationRecord(params: {
  scenario: string;
  consistencyAudit: VisualConsistencyValidation;
  finalPrompt: string;
  generationProvider?: string;
  generatedAssetReference?: string;
  observedResult: ObservedGenerationResult;
  isPromptCorrect?: boolean;
  notes?: string[];
}): RealGenerationValidationRecord {
  const id = `rec_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const { classification, findings } = classifyRealGeneration({
    consistencyAudit: params.consistencyAudit,
    finalPrompt: params.finalPrompt,
    observedResult: params.observedResult,
    isPromptCorrect: params.isPromptCorrect,
    notes: params.notes
  });

  return {
    id,
    scenario: params.scenario,
    consistencyAudit: params.consistencyAudit,
    finalPrompt: params.finalPrompt, // prompt is strictly preserved without mutation
    generationProvider: params.generationProvider || 'Flow / Veo',
    generatedAssetReference: params.generatedAssetReference,
    observedResult: params.observedResult,
    classification,
    notes: findings,
    createdAt: Date.now()
  };
}

/**
 * Aggregates multiple generation runs (typically 3 repeated executions of the exact same prompt)
 * to statistically distinguish systematic pipeline bugs from stochastic model variance.
 */
export function aggregateRealGenerationBatch(params: {
  scenario: string;
  finalPrompt: string;
  preGenerationAudit: VisualConsistencyValidation;
  runs: RealGenerationValidationRecord[];
  isPromptCorrect?: boolean;
}): RealGenerationBatchRecord {
  const { scenario, finalPrompt, preGenerationAudit, runs, isPromptCorrect = true } = params;
  const findings: string[] = [];

  if (!runs || runs.length === 0) {
    return {
      id: `batch_${Date.now()}`,
      scenario,
      finalPrompt,
      preGenerationAudit,
      generations: [],
      aggregateClassification: 'UNDETERMINED',
      findings: ['No generation runs in batch.'],
      createdAt: Date.now()
    };
  }

  const runCount = runs.length;
  const passedRuns = runs.filter((r) => r.classification === 'VALIDATED');
  const varianceRuns = runs.filter((r) => r.classification === 'FLOW_VARIANCE');
  const bugRuns = runs.filter((r) => r.classification === 'PIPELINE_BUG');
  const gapRuns = runs.filter((r) => r.classification === 'AUDITOR_GAP');

  let aggregateClassification: RealGenerationClassification = 'UNDETERMINED';

  const auditPassed = preGenerationAudit.overallStatus === 'PASS' || preGenerationAudit.overallStatus === 'WARNING';
  const auditFailed = preGenerationAudit.overallStatus === 'FAIL';

  // Rule 1: Auditor Gap detected in any run or explicitly noted
  if (gapRuns.length > 0 || (auditPassed && !isPromptCorrect)) {
    aggregateClassification = 'AUDITOR_GAP';
    findings.push('Auditor Gap: Pre-generation audit marked PASS, but prompt contained unflagged structural errors.');
  }
  // Rule 2: All runs passed
  else if (passedRuns.length === runCount && auditPassed && isPromptCorrect) {
    aggregateClassification = 'VALIDATED';
    findings.push(`All ${runCount}/${runCount} executions successfully validated.`);
  }
  // Rule 3: Explicit Pipeline Bug when audit failed or prompt was flawed
  else if ((auditFailed || !isPromptCorrect) && (bugRuns.length > 0 || runs.some(r => Object.values(r.observedResult).some(s => s === 'DRIFT')))) {
    aggregateClassification = 'PIPELINE_BUG';
    findings.push(`Pipeline Bug: Pre-generation audit failed or prompt was incorrect, resulting in generation drift.`);
  }
  // Rule 4: Multi-run Drift Analysis when Audit PASS and Prompt is correct
  else if (auditPassed && isPromptCorrect) {
    // Extract drift domains per run
    const runDriftMaps = runs.map((r) => {
      return Object.entries(r.observedResult)
        .filter(([_, status]) => status === 'DRIFT')
        .map(([domain]) => domain);
    });

    const allRunsDrifted = runDriftMaps.every((drifts) => drifts.length > 0);

    if (allRunsDrifted && runCount >= 3) {
      // Check if all runs drifted on the exact same domain(s)
      const firstRunDrifts = new Set(runDriftMaps[0]);
      const sameDriftInAll = runDriftMaps.every(
        (drifts) => drifts.length === firstRunDrifts.size && drifts.every((d) => firstRunDrifts.has(d))
      );

      if (sameDriftInAll) {
        // Audit passed + prompt correct + same drift in 3/3 -> MODEL_SYSTEMATIC_LIMITATION
        aggregateClassification = 'MODEL_SYSTEMATIC_LIMITATION';
        findings.push(
          'The pre-generation audit and compiled prompt are structurally correct, but the same generation drift reproduced consistently across all runs.'
        );
      } else {
        // Audit passed + prompt correct + different drifts across runs -> FLOW_VARIANCE
        aggregateClassification = 'FLOW_VARIANCE';
        findings.push(
          'Flow Variance: Multiple executions drifted, but in different domains or non-uniform manners.'
        );
      }
    } else if (passedRuns.length >= Math.ceil(runCount * 0.66)) {
      // e.g. 2/3 passed, 1/3 drifted -> FLOW_VARIANCE
      aggregateClassification = 'FLOW_VARIANCE';
      findings.push(
        `Flow Variance: Predominant consistency (${passedRuns.length}/${runCount} passed); isolated drift attributed to model variance.`
      );
    } else if (varianceRuns.length > 0) {
      aggregateClassification = 'FLOW_VARIANCE';
      findings.push(`Flow Variance detected across ${varianceRuns.length}/${runCount} run(s).`);
    } else {
      aggregateClassification = 'UNDETERMINED';
      findings.push('Insufficient data to distinguish model variance from other factors.');
    }
  } else {
    aggregateClassification = 'UNDETERMINED';
    findings.push('Insufficient or contradictory data for batch classification.');
  }

  return {
    id: `batch_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    scenario,
    finalPrompt,
    preGenerationAudit,
    generations: runs,
    aggregateClassification,
    findings,
    createdAt: Date.now()
  };
}
