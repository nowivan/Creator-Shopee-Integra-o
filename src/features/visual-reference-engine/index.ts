/**
 * VISUAL REFERENCE ENGINE — MODULE ENTRY POINT
 * Stage 1: Core types and contracts.
 */

export * from './types/visualReferenceTypes';
export * from './types/brandMarkTypes';
export * from './services/brandMarkAuthority';
export * from './services/visualEvidenceAnalyzer';
export * from './prompts/visualEvidenceAnalyzerPrompt';
export * from './services/referenceCleaner';
export * from './prompts/referenceCleanerPrompt';
export * from './services/visualPromptComposer';
export * from './services/avatarProfileService';
export * from './services/avatarIdentityHandoff';
export * from '../../services/avatarStorageService';
export * from './types/validationTypes';
export * from './services/visualConsistencyValidator';
export * from './components/VisualConsistencyAuditPanel';
export * from './types/realGenerationTypes';
export * from './services/realGenerationValidator';
export * from './components/RealGenerationValidationPanel';
export * from './services/visualReferenceAgentService';
export * from './components/VisualReferenceAgent';
export * from './types/benchmarkTypes';
export * from './services/visualReferenceBenchmark';
export * from './components/VisualReferenceBenchmarkPanel';
export * from './version';
export * from './manifest';
