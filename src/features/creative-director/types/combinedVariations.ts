/**
 * COMBINED VARIATIONS TYPES — SCENE 2 + SCENE 3 VARIATION HUB
 * Phase 2.4.3 Architecture — Single-Call Cohesive Copy Generation
 */

export type CombinedVariationQuantity = 1 | 2 | 4 | 6;
export type IndividualModeChoice = 'scene2' | 'scene3';

export interface GeneratedScenePair {
  id: string;
  pairIndex: number;
  salesAngle: string;
  scene2Copy?: string;
  scene3Cta?: string;
  characterCountScene2?: number;
  characterCountScene3?: number;
  productRevisionId?: string;
  isValidScene2?: boolean;
  isValidScene3?: boolean;
}

export interface CombinedVariationsInput {
  quantity: CombinedVariationQuantity; // 1 (individual), 2 (1 pair), 4 (2 pairs), 6 (3 pairs)
  individualTarget?: IndividualModeChoice; // 'scene2' | 'scene3' (when quantity === 1)
  productRevisionId: string;
  productIdentity: string;
  category?: string;
  quantityDescription?: string | null;
  verifiedFacts: string[];
  visibleDetails: string[];
  primaryBenefit?: string;
  apiKey?: string;
}

export interface CombinedVariationsDiagnostics {
  productRevisionId: string;
  requestedQuantity: CombinedVariationQuantity;
  individualTarget?: IndividualModeChoice;
  pairsCount: number;
  salesAnglesUsed: string[];
  geminiCallCount: number;
  modelUsed: string;
  characterCountsScene2: number[];
  characterCountsScene3: number[];
  issues: string[];
  retryTelemetry?: any[];
}

export interface CombinedVariationsResult {
  quantity: CombinedVariationQuantity;
  pairs: GeneratedScenePair[];
  diagnostics: CombinedVariationsDiagnostics;
}
