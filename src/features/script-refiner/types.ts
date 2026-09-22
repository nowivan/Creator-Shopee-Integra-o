export type RefinerQualityStatus =
  | "approved"
  | "warning"
  | "critical";

export type CategoryTone =
  | "aspirational"
  | "functional"
  | "technical"
  | "fashion"
  | "beauty"
  | "home"
  | "electronic"
  | "accessory"
  | "wellness"
  | "generic";

export type AudienceGender =
  | "masculine"
  | "feminine"
  | "unisex"
  | "male"
  | "female"
  | "neutral"
  | "unknown";

export interface ContextLock {
  categoryTone: CategoryTone;
  audienceGender?: AudienceGender;
  allowedSemanticFields: string[];
  forbiddenContextTerms: string[];
  preferredBenefitAngles?: string[];
  forbiddenBenefitAngles?: string[];
  safeProductReferences?: string[];
}

export interface ProductFactLock {
  product: string;
  category: string;
  requiredProductTerms: string[];
  forbiddenProducts: string[];
  forbiddenAttributes: string[];
  verifiedFacts: string[];
  originalScript: string;
  contextLock?: ContextLock;
}

export interface VersionQualityReport {
  version:
    | "quickDraft"
    | "mainRefined"
    | "antiCopy"
    | "ugcNatural"
    | "premium";
  status: RefinerQualityStatus;
  similarityScore: number;
  preservedNumbers: boolean;
  preservedPrices: boolean;
  hasBrokenWords: boolean;
  possibleGenericCopy: boolean;
  possibleInventedClaims: boolean;
  productContamination?: boolean;
  productContaminationDetails?: string[];
  contextContamination?: boolean;
  contextContaminationDetails?: string[];
  warnings: string[];
}

export interface ScriptRefinerQualityReport {
  versions: Record<
    "quickDraft" | "mainRefined" | "antiCopy" | "ugcNatural" | "premium",
    VersionQualityReport
  >;
  globalWarnings: string[];
}

export interface ScriptFacts {
  product?: string;
  category?: string;
  problem?: string[];
  solution?: string;
  benefits?: string[];
  quantities?: string[];
  prices?: string[];
  platforms?: string[];
  materials?: string[];
  ctaIntent?: string;
  factualClaims?: string[];
  productFactLock?: ProductFactLock;
  contextLock?: ContextLock;
}

export type ModelingStrategy =
  | "main"
  | "antiCopy"
  | "ugc"
  | "premium"
  | "quickDraft";

export interface QuickDraftObject {
  draft: string;
  word_count: number;
  source: "ai" | "local_fallback";
  quality_notes: string[];
  sourceScriptHash?: string;
  sourceScriptSnapshot?: string;
  sourceProduct?: string;
  sourceCategory?: string;
  contextTone?: CategoryTone;
}

export interface ScriptRefinerResult {
  // Required standard prompt fields
  quickDraft: string;
  mainRefined: string;
  antiCopy: string;
  ugcNatural: string;
  premium: string;
  alternativeHooks: string[];
  alternativeCtas: string[];

  // Backward compatibility & detailed UI layout fields
  mode?: "script_refiner";
  duration_seconds?: number;
  refined_script?: string;
  anti_copy_script?: string;
  ugc_script?: string;
  premium_script?: string;
  hooks?: string[];
  ctas?: string[];
  quick_draft?: QuickDraftObject;
  detected_facts?: {
    product: string;
    price: string;
    platform: string;
    benefits: string[];
    cta: string;
    urgency: string;
    shipping: string;
    claims: string[];
    forbidden_or_risky_terms: string[];
  };
  retention_structure?: {
    hook: string;
    curiosity: string;
    value_build: string;
    proof_or_detail: string;
    cta: string;
  };
  scene_blocks?: Array<{
    block: number;
    duration_seconds: number;
    narration: string;
    visual_direction: string;
    retention_goal: string;
  }>;
  anti_copy_report?: {
    copied_phrases_removed: string[];
    structure_preserved: boolean;
    originality_score: number;
    risk_notes: string[];
  };
  compliance_notes?: string[];
  quality_score?: {
    clarity: number;
    retention: number;
    fact_preservation: number;
    anti_copy: number;
    duration_fit: number;
  };
  source_type?: "ai" | "local_fallback";
  source_script_snapshot?: string;
  source_script_hash?: string;
}

export interface ScriptAnchors {
  numbers: string[];
  prices: string[];
  currencies: string[];
  platforms: string[];
  quantities: string[];
  keywords: string[];
}

export interface RefinerOptions {
  duration_seconds?: number;
  style?: string;
  target_audience?: string;
  tone?: string;
  cta?: string;
  productOrNiche?: string;
  platform?: string;
}

export interface ScriptAnalysis {
  hook: string;
  benefits: string[];
  cta: string;
  product_terms: string[];
  price_terms: string[];
  platform_terms: string[];
  proof_terms: string[];
  guarantee_terms: string[];
  urgency_terms: string[];
  style_detected: string;
}
