/**
 * VISUAL CONSISTENCY VALIDATION & AUDIT CONTRACTS
 * Stage 7A: End-to-End Visual Consistency Validation Harness
 */

import {
  AvatarIdentityContext,
  AvatarReferenceProfile,
  IdentityDNA
} from './visualReferenceTypes';
import {
  ProductMotionSafety,
  ProductReferenceCoverage,
  ProductStructuralDNA
} from '../../creative-director/types/compilerTypes';

export type ValidationDomainName =
  | 'avatarIdentity'
  | 'wardrobe'
  | 'poseAction'
  | 'product'
  | 'kitComposition'
  | 'background'
  | 'camera'
  | 'referenceCoverage'
  | 'motionSafety';

export type ValidationStatus = 'PASS' | 'WARNING' | 'FAIL';

export interface VisualConsistencyIssue {
  id: string;
  domain: ValidationDomainName;
  severity: 'WARNING' | 'FAIL';
  message: string;
  rule: string;
  source?: string;
  detectedIn?: string;
  conflictingData?: {
    expected: string;
    found: string;
  };
}

export interface ValidationDomain {
  domainName?: ValidationDomainName;
  source: string;
  present: boolean;
  preserved: boolean;
  conflictingInstructions?: string[];
  notes?: string[];
}

export interface HandoffTraceStep {
  stepNumber: number;
  source: string;
  transform: string;
  consumer: string;
  payloadSummary: string;
  status: 'SUCCESS' | 'WARNING' | 'SKIPPED';
  timestamp: number;
}

export interface HandoffTraceLog {
  workflow: string;
  steps: HandoffTraceStep[];
  summary: string;
  generatedAt: number;
}

export interface VisualConsistencyValidation {
  avatarIdentity: ValidationDomain;
  wardrobe: ValidationDomain;
  poseAction: ValidationDomain;
  product: ValidationDomain;
  kitComposition?: ValidationDomain;
  background: ValidationDomain;
  camera: ValidationDomain;
  referenceCoverage?: ValidationDomain;
  motionSafety?: ValidationDomain;

  overallStatus: ValidationStatus;
  issues: VisualConsistencyIssue[];
  handoffTrace?: HandoffTraceLog;
  timestamp: number;
}

export interface ConsistencyAuditTarget {
  // Avatar
  avatarProfile?: AvatarReferenceProfile;
  avatarContext?: AvatarIdentityContext;

  // Product
  productName?: string;
  productIdentity?: string;
  productStructuralDNA?: ProductStructuralDNA;
  productCoverage?: ProductReferenceCoverage;
  productMotionSafety?: ProductMotionSafety;
  isKitConfirmed?: boolean;
  kitComponentCount?: number;
  handledComponentCount?: number;
  remainingVisibleComponentCount?: number;

  // Scene Context & Defined Slots
  wardrobe?: {
    topType?: string;
    topStyle?: string;
    topColor?: string;
    bottomType?: string;
    bottomColor?: string;
    footwearType?: string;
    footwearColor?: string;
    description?: string;
  };
  actions?: Record<string, string> | string[];
  environment?: string;
  cameraPlan?: string | Record<string, any>;

  // Compiled Models & Outputs
  compiledModel?: any;
  finalPromptText?: string;
  finalJsonOutput?: any;

  // Context metadata
  engineType?: 'SCENE_2' | 'SCENE_3' | 'CINEMATIC' | 'GENERIC';
}
