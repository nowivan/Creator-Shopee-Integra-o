/**
 * VISUAL REFERENCE ENGINE V1 — ARCHITECTURE MANIFEST
 * 
 * Formal architectural registry of the 12 frozen production modules,
 * canonical contracts, sources of truth, precedence rules, AI budgets,
 * and security gates.
 */

import { VISUAL_REFERENCE_ENGINE_VERSION, VISUAL_REFERENCE_ENGINE_STATUS } from './version';

export interface ModuleManifestEntry {
  id: string;
  name: string;
  responsibility: string;
  inputs: string[];
  outputs: string[];
  aiCalls: string;
  sourceOfTruth: string;
  primaryDependencies: string[];
}

export const V1_ARCHITECTURE_MODULES: ModuleManifestEntry[] = [
  {
    id: 'M01',
    name: 'Visual Evidence Analyzer',
    responsibility: 'Empirical multimodal extraction of Visual DNA without hallucinations or ungrounded assumptions.',
    inputs: ['Base64 Image / Image URL', 'Analyzer Config'],
    outputs: ['VisualReferenceAnalysis', 'VisualEvidence<T> mappings'],
    aiCalls: '1 multimodal AI call per image (gemini-3.7-flash)',
    sourceOfTruth: 'VisualReferenceAnalysis / IdentityDNA',
    primaryDependencies: ['visualEvidenceAnalyzerPrompt', 'visualReferenceTypes']
  },
  {
    id: 'M02',
    name: 'Reference Cleaner',
    responsibility: 'Safe selective removal of synthetic overlays, captions, and watermarks while preserving physical identity.',
    inputs: ['Base64 Image', 'ReferenceCleaningContract', 'VisualReferenceAnalysis'],
    outputs: ['Cleaned Base64 Image', 'ReferenceCleaningOperations'],
    aiCalls: '0 or 1 image edit call (gemini-3.1-flash-image / clean fallback)',
    sourceOfTruth: 'cleaningDefault in VisualReferenceAnalysis.textElements',
    primaryDependencies: ['referenceCleanerPrompt', 'visualReferenceTypes']
  },
  {
    id: 'M03',
    name: 'Visual Prompt Composer',
    responsibility: '100% deterministic local compilation of canonical prompt clauses across 18 ordered segments.',
    inputs: ['VisualReferenceAnalysis', 'VisualPromptComposerOptions (mode)'],
    outputs: ['VisualPromptComposerOutput (prompt, metadata, omittedUnknowns)'],
    aiCalls: '0 AI calls (100% deterministic local TypeScript computation)',
    sourceOfTruth: 'Visual Prompt Composer canonical clause rules',
    primaryDependencies: ['visualReferenceTypes']
  },
  {
    id: 'M04',
    name: 'Visual Reference Agent',
    responsibility: 'Autonomous state coordinator orchestrating analysis, optional cleaning, prompt mode switches, and handoffs.',
    inputs: ['User Image', 'Agent Pipeline Actions'],
    outputs: ['VisualReferenceAgentState', 'UI Render State'],
    aiCalls: '1 for analysis, 0 for prompts/switches, 1 optional for cleaning',
    sourceOfTruth: 'VisualReferenceAgentState (Session-hydrated canonical store)',
    primaryDependencies: ['visualReferenceAgentService', 'visualEvidenceAnalyzer', 'visualPromptComposer', 'referenceCleaner']
  },
  {
    id: 'M05',
    name: 'Identity Hub Integration',
    responsibility: 'Management and persistent storage of reusable human and avatar profiles with cached visual DNA.',
    inputs: ['AvatarReferenceProfile Input'],
    outputs: ['AvatarReferenceProfile Store', 'VisualReferenceAnalysis Cache'],
    aiCalls: '0 for inspection/cache hits; 1 for initial profile creation',
    sourceOfTruth: 'AvatarReferenceProfile',
    primaryDependencies: ['avatarProfileService', 'visualReferenceTypes']
  },
  {
    id: 'M06',
    name: 'Avatar Identity Handoff',
    responsibility: 'Clean immutable projection of identity context to external engines (Director & Cinematic).',
    inputs: ['AvatarReferenceProfile / VisualReferenceAgentState'],
    outputs: ['AvatarIdentityContext', 'SceneReferenceContext'],
    aiCalls: '0 AI calls (instant pure projection)',
    sourceOfTruth: 'AvatarIdentityContext',
    primaryDependencies: ['avatarIdentityHandoff', 'visualReferenceTypes']
  },
  {
    id: 'M07',
    name: 'Product Structural DNA Integration',
    responsibility: 'Strict segregation between person identity and physical product geometry, materials, and count.',
    inputs: ['ProductStructuralDNA', 'AvatarIdentityContext'],
    outputs: ['Dual Lock Coexistence Payload'],
    aiCalls: '0 AI calls',
    sourceOfTruth: 'ProductStructuralDNA',
    primaryDependencies: ['productStructuralDNA', 'canonicalProductResolver']
  },
  {
    id: 'M08',
    name: 'Kit Composition Protocol',
    responsibility: 'Validates commercial kit integrity: confirms handled pieces while keeping remaining kit elements visible.',
    inputs: ['KitDefinition', 'SceneAction'],
    outputs: ['Kit Composition Directives', 'Component Visibility Map'],
    aiCalls: '0 AI calls',
    sourceOfTruth: 'Kit Composition Protocol rules',
    primaryDependencies: ['productGrounding', 'scene2KitComposition']
  },
  {
    id: 'M09',
    name: 'Visual Consistency Validator',
    responsibility: 'Comprehensive synchronous validation harness auditing 12 cross-module invariants.',
    inputs: ['Validation Context (Avatar, Product, Scene)'],
    outputs: ['VisualConsistencyValidation (status, checks, violations, lockCoexistence)'],
    aiCalls: '0 AI calls (100% offline synchronous verification)',
    sourceOfTruth: 'VisualConsistencyValidator rule matrix',
    primaryDependencies: ['validationTypes', 'visualReferenceTypes']
  },
  {
    id: 'M10',
    name: 'Real Generation Validator',
    responsibility: 'Automated 6-way classification of multi-run generation samples distinguishing model drift from pipeline bugs.',
    inputs: ['RealGenerationValidationRecord[]', 'Consistency Audit Results'],
    outputs: ['RealGenerationClassification', 'Diagnostic Root Cause'],
    aiCalls: '0 AI calls',
    sourceOfTruth: 'RealGenerationValidationRecord (Immutable multi-run store)',
    primaryDependencies: ['realGenerationTypes']
  },
  {
    id: 'M11',
    name: 'Benchmark Engine',
    responsibility: '22-key empirical parity comparison engine evaluating V1 against baseline images across all domains.',
    inputs: ['VisualReferenceAnalysis', 'Baseline Reference / Output'],
    outputs: ['VisualReferenceBenchmarkComparison (22 keys, macro domain counts)'],
    aiCalls: '0 AI calls',
    sourceOfTruth: 'VisualReferenceBenchmarkComparison',
    primaryDependencies: ['benchmarkTypes', 'visualReferenceBenchmark']
  },
  {
    id: 'M12',
    name: 'Production UX Layer',
    responsibility: 'Dual-mode interface (Simple linear default vs. Advanced diagnostics) with accessible WCAG AA compliance.',
    inputs: ['User Interaction', 'Agent State'],
    outputs: ['Rendered React Component', 'Action Triggers'],
    aiCalls: '0 AI calls',
    sourceOfTruth: 'VisualReferenceAgent React State',
    primaryDependencies: ['VisualReferenceAgent', 'VisualConsistencyAuditPanel', 'VisualReferenceBenchmarkPanel']
  }
];

/**
 * CANONICAL SOURCES OF TRUTH
 */
export const V1_SOURCES_OF_TRUTH = {
  visualIdentity: 'VisualReferenceAnalysis.identity (IdentityDNA)',
  avatarHandoff: 'AvatarIdentityContext',
  sceneState: 'VisualReferenceAnalysis.sceneState (ScenePhotoStateDNA) / SceneReferenceContext',
  product: 'ProductStructuralDNA',
  kitComposition: 'Kit Composition Protocol (confirmed kit components)',
  visualPrompt: 'Visual Prompt Composer (deterministic 18-clause builder)',
  cleanerDecision: 'VisualReferenceAnalysis.textElements[].cleaningDefault',
  consistencyDiagnostics: 'VisualConsistencyValidator result object',
  realGenerationDiagnosis: 'RealGenerationValidator classification matrix',
  benchmarkComparison: 'VisualReferenceBenchmarkComparison (22 comparison keys)'
} as const;

/**
 * PRECEDENCE RULES (Domain-Isolated Authority)
 */
export const V1_PRECEDENCE_RULES = [
  'Defined Wardrobe > Reference Wardrobe (Scene-specified clothing supersedes photo attire)',
  'Current Scene Action > Reference Pose (Dynamic scene staging supersedes static photo posture)',
  'cleanedReferenceImage > original reference image (Cleaned asset prioritized when available)',
  'ProductStructuralDNA > unsupported product assumptions (Strictly grounds physical packaging/count)',
  'Current Scene Environment > reference background (New setting supersedes reference backdrop)',
  'Current Camera Plan > reference camera state (Scene framing supersedes reference camera)'
] as const;

/**
 * OPERATIONAL AI CALL BUDGET
 */
export const V1_AI_CALL_BUDGET = {
  initialVisualAnalysis: '1 AI call (multimodal gemini-3.7-flash)',
  reanalyze: '1 AI call (strictly upon explicit user confirmation modal)',
  referenceCleaner: '0 or 1 image edit call (gemini-3.1-flash-image / safe clean fallback)',
  promptComposition: '0 AI calls (100% deterministic local computation)',
  visualDnaInspection: '0 AI calls (pure memory read)',
  avatarHandoff: '0 AI calls (pure context projection)',
  sceneHandoff: '0 AI calls (pure context projection)',
  benchmark: '0 AI calls (local key comparison)',
  consistencyValidator: '0 AI calls (local rule validation)',
  realGenerationValidator: '0 AI calls (local correlation matrix)'
} as const;

/**
 * EVIDENCE CONTRACT STATES
 */
export const V1_EVIDENCE_CONTRACT = {
  VISIBLE: 'Direct grounded description included in prompt and downstream locks.',
  PARTIAL: 'Limited strictly to observed cues without ungrounded extrapolation.',
  INFERRED: 'Explicitly qualified with lower weight or probabilistic caveat.',
  UNKNOWN: 'Strictly omitted from generated prompts and marked as unobserved.'
} as const;

/**
 * CLEANER CONTRACT
 */
export const V1_CLEANER_CONTRACT = {
  REMOVE: ['overlay_text', 'caption', 'ui_element', 'watermark_synthetic'],
  PRESERVE: ['physical_text', 'physical_logo', 'packaging_text', 'apparel_embroidery'],
  CONTEXT_DEPENDENT: 'PRESERVE by default (Safe failure rule: PRESERVE > REMOVE)',
  decisionAuthority: 'cleaningDefault is the canonical authority; physicallyAttached is auxiliary metadata.'
} as const;

/**
 * LOCK COEXISTENCE CONTRACT
 */
export const V1_LOCK_CONTRACT = {
  avatarIdentityLock: 'Locks facial features, eye color, skin tone/texture, hair, and facial landmarks.',
  productObjectLock: 'Locks product geometry, dimensions, material finishes, label typography, and kit count.',
  coexistenceGuarantee: 'Zero cross-domain contamination. Person modifications cannot alter product DNA and vice-versa.'
} as const;

/**
 * KIT COMPOSITION CONTRACT
 */
export const V1_KIT_CONTRACT = {
  initialState: 'Full kit components visible in tray or packaging.',
  handledState: 'Exactly 1 item may be actively held/applied; remaining items stay visible in tray.',
  completionState: 'Handled component returns to tray or finishes demonstration.',
  hallucinationRule: 'Legitimate confirmed kit components MUST NOT be classified or discarded as hallucinations.'
} as const;

/**
 * BENCHMARK BASELINE RECORD
 */
export const V1_BENCHMARK_BASELINES = {
  scenarioA_Portrait: { result: 'IMPROVED', regressionCount: 0 },
  scenarioB_AsymmetricPose: { result: 'IMPROVED', regressionCount: 0 },
  scenarioC_OverlayVsBranding: { result: 'IMPROVED', regressionCount: 0 },
  scenarioD_PersonPlusProduct: { result: 'IMPROVED', regressionCount: 0 },
  scenarioE_ComplexScene: { result: 'IMPROVED', regressionCount: 0 },
  totalComparisonKeys: 22,
  worseRegressionsAcrossSuite: 0
} as const;

/**
 * REAL GENERATION CLASSIFICATIONS
 */
export const V1_REAL_GENERATION_CLASSIFICATIONS = [
  'VALIDATED',
  'PIPELINE_BUG',
  'FLOW_VARIANCE',
  'MODEL_SYSTEMATIC_LIMITATION',
  'AUDITOR_GAP',
  'UNDETERMINED'
] as const;
