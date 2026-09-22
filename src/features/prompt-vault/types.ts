/**
 * Prompt & Link Vault IA - Types definition
 */

export type PromptVaultItemType = 'prompt' | 'link';

export type PromptVaultStatus =
  | 'draft'
  | 'tested'
  | 'approved'
  | 'archived';

export interface PromptVaultItem {
  id: string;
  type: PromptVaultItemType;

  title: string;
  category: string;
  destinationTool?: string;

  mainPrompt?: string;
  negativePrompt?: string;

  url?: string;
  linkDescription?: string;
  domain?: string;

  productContext?: string;
  tags: string[];
  notes?: string;

  favorite: boolean;
  status: PromptVaultStatus;

  createdAt: number;
  updatedAt: number;

  useCount: number;
  lastUsedAt?: number | null;
}

export type PromptVaultFilterTab = 'all' | 'prompts' | 'links' | 'favorites';

export type PromptVaultStatusFilter = 'all' | PromptVaultStatus;

export const PROMPT_VAULT_CATEGORIES = [
  'Provador Virtual',
  'Creative Director',
  'Ideador Viral',
  'Script Refiner',
  'CTA',
  'Flow / Veo',
  'Google Vids',
  'GPT / Agente',
  'Shopee / Afiliado',
  'Product Lock',
  'Negative Prompt',
  'Cena 1 Hook',
  'Cena 2 Demonstração',
  'Cena 3 CTA',
  'Outros'
] as const;

export const PROMPT_VAULT_DESTINATION_TOOLS = [
  'Creator Pro',
  'Flow',
  'Veo',
  'Google Vids',
  'ChatGPT / GPT',
  'Gemini',
  'Shopee',
  'CapCut',
  'Runway',
  'Kling',
  'Luma',
  'Outros'
] as const;
