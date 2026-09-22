/**
 * SCENE 3 CTA HUB TYPES & INTERFACES
 * Dedicated CTA-Only Hub Architecture (Scene 3 Exclusive)
 */

import { Scene3CtaEngineDiagnostics, SemanticEvidenceViolation, VerifiedCommercialFacts } from '../services/scene3CtaEngine';

export type Scene3CtaHubQuantity = 1 | 2 | 3;

export interface Scene3CtaVariation {
  id: string;
  variationIndex: number;
  text: string;
  characterCount: number;
  isValid: boolean;
  productRevisionId: string;
  semanticEvidenceValid?: boolean;
  semanticViolations?: SemanticEvidenceViolation[];
}

export interface Scene3CtaHubInput {
  quantity: Scene3CtaHubQuantity;
  productRevisionId: string;
  productIdentity: string;
  category?: string;
  quantityDescription?: string | null;
  verifiedFacts: string[];
  visibleDetails: string[];
  commercialFacts?: VerifiedCommercialFacts;
  apiKey?: string;
}

export interface Scene3CtaHubResult {
  quantity: Scene3CtaHubQuantity;
  variations: Scene3CtaVariation[];
  diagnostics?: Scene3CtaEngineDiagnostics;
}
