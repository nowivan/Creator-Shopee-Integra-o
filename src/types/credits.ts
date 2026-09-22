/**
 * Canonical Types for Plan Entitlements and Internal Credit Engine (Etapa 4A).
 * Creator Intelligence Pro.
 */

export type CreatorPlanId =
  | 'FREE'
  | 'STARTER'
  | 'PRO'
  | 'SCALE'
  | 'ENTERPRISE'
  | 'ADMIN';

export interface CreatorPlanDefinition {
  id: CreatorPlanId;
  label: string;
  name: string;
  description: string;
  tierLevel: number;
  monthlyCredits: number;
  rolloverCredits: boolean;
  allowedToolIds: string[] | '*';
  maxDailyGenerations?: number;
  badgeColor: string;
  accentColor: string;
  features: string[];
  isPopular?: boolean;
  targetAudience?: string;
  suggestedPriceBrl?: number;
}

export type CreditActionId =
  | 'AGENTE_COPY_GENERATION'
  | 'AGENTE_COPY_CLEAN'
  | 'AI_VIDEO_PROJECT'
  | 'CREATIVE_DIRECTOR'
  | 'PRODUCT_LISTING_SEO'
  | 'COLLAGE_STUDIO'
  | 'VANESSA_COPY'
  | 'IDENTITY_HUB'
  | 'VIRAL_CHAT'
  | 'VIRAL_IDEATION'
  | 'COPY_MASTER'
  | 'SCRIPT_REFINER'
  | 'HOOK_GENERATOR'
  | 'REVERSE_ENGINEERING'
  | 'CINEMATIC_ENGINE'
  | 'TRY_ON'
  | 'TRANSLATOR'
  | 'IMAGE_DESCRIBER'
  | 'MAGIC_ENHANCER'
  | 'PROMPT_REFINER'
  | 'IMAGE_EXTRACTOR'
  | 'TIKTOK_LEGAL'
  | 'AUDIT_COMPLIANCE'
  | 'LYRIA_MUSIC'
  | 'TRANSCRIPTION_AUDIO'
  | 'VISUAL_REFERENCE'
  | 'GENERIC_AI_ACTION';

export interface CreditActionDefinition {
  actionId: CreditActionId;
  label: string;
  creditCost: number;
  toolId?: string;
  description?: string;
}

export type CreditTransactionType =
  | 'INITIAL_GRANT'
  | 'MONTHLY_RENEWAL'
  | 'DEBIT'
  | 'REFUND'
  | 'ADMIN_ADJUSTMENT'
  | 'PLAN_UPGRADE';

export interface CreditUsageLedgerEntry {
  id: string;
  userId: string;
  type: CreditTransactionType;
  amount: number; // Negative for debits, positive for grants/refunds
  balanceAfter: number;
  actionId?: CreditActionId;
  toolId?: string;
  toolLabel?: string;
  requestId?: string;
  reason?: string;
  metadata?: Record<string, any>;
  timestamp: number;
}

export interface UserCreditAccount {
  userId: string;
  planId: CreatorPlanId;
  balance: number;
  monthlyAllocation: number;
  billingCycleStart: number;
  billingCycleEnd: number;
  lifetimeUsedCredits: number;
  lifetimeGrantedCredits: number;
  lastDebitTimestamp?: number;
  isAdminBypass?: boolean;
  createdAt: number;
  updatedAt: number;
}

export type UsagePermissionStatus =
  | 'ALLOWED'
  | 'INSUFFICIENT_CREDITS'
  | 'PLAN_TOOL_LOCKED'
  | 'DAILY_LIMIT_REACHED'
  | 'AUTH_REQUIRED';

export interface UsagePermissionResult {
  allowed: boolean;
  reason: UsagePermissionStatus;
  requiredCredits: number;
  currentBalance: number;
  planId: CreatorPlanId;
  toolId?: string;
  actionId?: CreditActionId;
  message: string;
}
