/**
 * BENCHMARK & PARITY VALIDATION CONTRACTS
 * Stage 9: Evaluates functional parity and improvements between Original Reference Agent and Visual Reference Agent.
 */

import { VisualReferenceAnalysis } from './visualReferenceTypes';

export type BenchmarkDomainStatus =
  | 'MATCH'
  | 'BETTER'
  | 'WORSE'
  | 'DIFFERENT_BUT_VALID'
  | 'NOT_APPLICABLE'
  | 'UNDETERMINED';

export interface BenchmarkDomainResult {
  status: BenchmarkDomainStatus;
  originalAgentObservation?: string;
  visualReferenceAgentObservation?: string;
  notes?: string;
}

export interface VisualReferenceBenchmarkComparison {
  subject: BenchmarkDomainResult;
  face: BenchmarkDomainResult;
  hair: BenchmarkDomainResult;
  skin: BenchmarkDomainResult;
  expression: BenchmarkDomainResult;
  pose: BenchmarkDomainResult;
  arms?: BenchmarkDomainResult;
  hands?: BenchmarkDomainResult;
  wardrobe: BenchmarkDomainResult;
  accessories: BenchmarkDomainResult;
  branding: BenchmarkDomainResult;
  objects: BenchmarkDomainResult;
  camera: BenchmarkDomainResult;
  crop: BenchmarkDomainResult;
  composition: BenchmarkDomainResult;
  lighting: BenchmarkDomainResult;
  background: BenchmarkDomainResult;
  texture: BenchmarkDomainResult;
  textClassification: BenchmarkDomainResult;
  preservation: BenchmarkDomainResult;
  promptStructure: BenchmarkDomainResult;
  cleaningQuality?: BenchmarkDomainResult;
}

export type BenchmarkOverallStatus =
  | 'PARITY'
  | 'IMPROVED'
  | 'PARTIAL_PARITY'
  | 'REGRESSION'
  | 'UNDETERMINED';

export type BenchmarkValidationMode =
  | 'HARNESS_VALIDATED'
  | 'REAL_PARITY_VALIDATED';

export type BaselineSource = 'MANUAL_REAL_INPUT' | 'SYNTHETIC_TEST' | 'PLACEHOLDER';

export type BaselineIntegrityStatus =
  | 'VALID'
  | 'MISSING'
  | 'PLACEHOLDER'
  | 'SYNTHETIC'
  | 'SUBJECT_MISMATCH'
  | 'UNVERIFIED';

export interface BaselineIntegrityError {
  code: 'BASELINE_INTEGRITY_ERROR';
  reason: string;
  field?: string;
  expected?: string;
  actual?: string;
}

export interface BenchmarkDomainSummaryCounts {
  total: 22;
  better: number;
  match: number;
  worse: number;
  differentButValid: number;
  notApplicable: number;
  undetermined: number;
}

export type BenchmarkSummaryIntegrityErrorCode = 'BENCHMARK_SUMMARY_INTEGRITY_ERROR';

export interface BenchmarkSummaryIntegrityError {
  code: BenchmarkSummaryIntegrityErrorCode;
  reason: string;
  expectedTotal: number;
  actualTotal: number;
  counts: {
    better: number;
    match: number;
    worse: number;
    differentButValid: number;
    notApplicable: number;
    undetermined: number;
  };
}

export interface VisualReferenceBenchmarkRecord {
  id: string;
  scenario: string;
  scenarioType: 'SIMPLE_PORTRAIT' | 'ASYMMETRIC_POSE' | 'TEXT_OVERLAY' | 'PERSON_PRODUCT' | 'COMPLEX_SCENE' | 'CUSTOM';
  inputReference: string;
  validationMode?: BenchmarkValidationMode;

  // Stage 9B.1 Baseline Integrity Fields
  baselineSourcePrompt?: string;
  baselineSource?: BaselineSource;
  baselineVerified?: boolean;
  baselineSynthetic?: boolean;
  baselineIntegrityStatus?: BaselineIntegrityStatus;
  baselineIntegrityError?: BaselineIntegrityError;

  originalAgent?: {
    prompt?: string;
    cleanedImage?: string;
    notes?: string[];
  };

  visualReferenceAgent: {
    analysis?: VisualReferenceAnalysis;
    prompt?: string;
    cleanedImage?: string;
  };

  comparison: VisualReferenceBenchmarkComparison;
  overallStatus: BenchmarkOverallStatus;
  summaryFindings: string[];
  createdAt: number;
  confirmedByOperator?: boolean;
}

export interface VisualReferenceBenchmarkSuite {
  id: string;
  name: string;
  records: VisualReferenceBenchmarkRecord[];
  summary: {
    totalRecords: number;
    parityCount: number;
    improvedCount: number;
    partialParityCount: number;
    regressionCount: number;
    undeterminedCount: number;
  };
  createdAt: number;
}
