/**
 * REAL GENERATION VALIDATION CONTRACTS
 * Stage 7B: Real Generation Validation
 *
 * Captures, tracks, and classifies visual generation runs from Flow / Veo
 * against Pre-Generation Audits, Prompt Audits, and observed runtime outputs.
 */

import { VisualConsistencyValidation } from './validationTypes';

export type ObservedDomainStatus = 'PASS' | 'DRIFT' | 'NOT_APPLICABLE';

export interface ObservedGenerationResult {
  avatarIdentity?: ObservedDomainStatus;
  wardrobe?: ObservedDomainStatus;
  poseAction?: ObservedDomainStatus;
  product?: ObservedDomainStatus;
  kitComposition?: ObservedDomainStatus;
  background?: ObservedDomainStatus;
  camera?: ObservedDomainStatus;
  motionSafety?: ObservedDomainStatus;
}

export type RealGenerationClassification =
  | 'VALIDATED'
  | 'PIPELINE_BUG'
  | 'FLOW_VARIANCE'
  | 'MODEL_SYSTEMATIC_LIMITATION'
  | 'AUDITOR_GAP'
  | 'UNDETERMINED';

export interface RealGenerationValidationRecord {
  id: string;
  scenario: string;
  consistencyAudit: VisualConsistencyValidation;
  finalPrompt: string;
  generationProvider: string;
  generatedAssetReference?: string;
  observedResult: ObservedGenerationResult;
  classification: RealGenerationClassification;
  notes?: string[];
  createdAt: number;
}

export interface RealGenerationBatchRecord {
  id: string;
  scenario: string;
  finalPrompt: string;
  preGenerationAudit: VisualConsistencyValidation;
  generations: RealGenerationValidationRecord[];
  aggregateClassification: RealGenerationClassification;
  findings: string[];
  createdAt: number;
}
