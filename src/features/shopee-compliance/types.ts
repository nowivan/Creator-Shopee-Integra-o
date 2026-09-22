/**
 * SHOPEE COMPLIANCE CONTRACTS & RESULT TYPES
 * 
 * Isolated compliance types for Shopee Video Account Health & Safety Guard.
 */

import { ShopeeCommercialEvidence } from '../shopee-copy/types';
import { ShopeeCTAMode } from '../shopee-scene-hub/types';

export type ShopeeComplianceSeverity = 'info' | 'warning' | 'critical';

export type ShopeeComplianceStatus = 'APTO' | 'REVISAO_NECESSARIA' | 'BLOQUEADO';

export type ShopeeComplianceCategory =
  | 'product_clarity'
  | 'realistic_benefit'
  | 'false_information'
  | 'guarantee_miracle'
  | 'unrealistic_promise'
  | 'commercial_claims'
  | 'watermark_recycled'
  | 'privacy_pii'
  | 'prohibited_illegal'
  | 'engagement_manipulation'
  | 'cta_compliance';

export interface ShopeeComplianceViolation {
  code: string;
  severity: ShopeeComplianceSeverity;
  category: ShopeeComplianceCategory;
  message: string;
  offendingText?: string;
  suggestedAction?: string;
  requiresConfirmation: boolean;
  blocking: boolean;
  field?: string;
}

export interface ShopeeComplianceChecklist {
  productVisible: boolean;
  benefitGrounded: boolean;
  noUnsupportedGuarantee: boolean;
  commercialConditionsValid: boolean;
  noExternalWatermarkOrUI: boolean;
  privacyProtected: boolean;
  ctaValid: boolean;
}

export interface ShopeeComplianceReport {
  status: ShopeeComplianceStatus;
  violations: ShopeeComplianceViolation[];
  isApto: boolean;
  isBlocked: boolean;
  requiresReview: boolean;
  checklist: ShopeeComplianceChecklist;
  summary: {
    criticalCount: number;
    warningCount: number;
    infoCount: number;
    passedChecks: string[];
  };
  timestamp: number;
}

export interface ShopeePreflightInput {
  copyText?: string;
  scene1Dialogue?: string;
  scene2Dialogue?: string;
  scene3Dialogue?: string;
  compiledPrompts?: {
    scene1?: string;
    scene2?: string;
    scene3?: string;
  } | string[];
  commercialEvidence?: ShopeeCommercialEvidence;
  ctaMode?: ShopeeCTAMode | string;
  productContext?: {
    identity?: string;
    observableDetails?: string[];
    verifiedFunctionalFacts?: string[];
  };
  presenterDescription?: string;
  environmentDescription?: string;
}
