/**
 * Creator Intelligence Pro — Plan Registry (Etapa 4A).
 * Centralized definition of plans, tier levels, monthly credits and tool entitlements.
 */

import { CreatorPlanId, CreatorPlanDefinition } from '../types/credits';

export const CREATOR_PLANS: Record<CreatorPlanId, CreatorPlanDefinition> = {
  FREE: {
    id: 'FREE',
    label: 'Free Starter',
    name: 'Plano Gratuito',
    description: 'Experimente as ferramentas essenciais de copy e roteirização com cota inicial mensal.',
    tierLevel: 0,
    monthlyCredits: 50,
    rolloverCredits: false,
    maxDailyGenerations: 15,
    badgeColor: 'bg-neutral-800 text-neutral-300 border-neutral-700',
    accentColor: '#737373',
    suggestedPriceBrl: 0,
    isPopular: false,
    targetAudience: 'Iniciantes & Testes',
    allowedToolIds: [
      'shopee-copy',
      'dashboard',
      'chat',
      'copy-master',
      'hooks',
      'script-refiner',
      'ideador',
      'product-listing',
      'translator',
      'magic-enhancer',
      'prompt-refiner',
      'prompt-vault',
      'history'
    ],
    features: [
      '50 créditos/mês para geração de conteúdo',
      'Acesso a ferramentas de copy e ganchos essenciais',
      'Consultor Viral IA básico',
      'Histórico de até 10 itens',
      'Comunidade e documentação padrão'
    ]
  },

  STARTER: {
    id: 'STARTER',
    label: 'Starter Creator',
    name: 'Plano Starter',
    description: 'Para criadores e afiliados que produzem vídeos e anúncios diariamente.',
    tierLevel: 1,
    monthlyCredits: 300,
    rolloverCredits: false,
    badgeColor: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60',
    accentColor: '#10b981',
    suggestedPriceBrl: 47,
    isPopular: false,
    targetAudience: 'Criadores em Crescimento',
    allowedToolIds: [
      'shopee-copy',
      'dashboard',
      'chat',
      'agente-de-copy-clean',
      'agente-de-copy',
      'create',
      'product-listing',
      'collage-studio',
      'vanessa',
      'copy-master',
      'hooks',
      'script-refiner',
      'ideador',
      'image-describer',
      'image-extractor',
      'translator',
      'magic-enhancer',
      'prompt-refiner',
      'tiktok-legal',
      'audit',
      'prompt-vault',
      'history'
    ],
    features: [
      '300 créditos/mês (renovação automática)',
      'Agente de Copy Clean & Vanessa Engine',
      'Creative Director AI completo',
      'Auditoria de conformidade TikTok Shop',
      'Favoritos e sincronização na nuvem ilimitados',
      'Suporte prioritário via tickets'
    ]
  },

  PRO: {
    id: 'PRO',
    label: 'Creator Pro',
    name: 'Plano Pro Viral',
    description: 'A suíte completa de IA multimodal, engenharia reversa e prompts cinematográficos.',
    tierLevel: 2,
    monthlyCredits: 1000,
    rolloverCredits: true,
    badgeColor: 'bg-indigo-950/80 text-indigo-300 border-indigo-700/60 shadow-[0_0_12px_rgba(99,102,241,0.25)]',
    accentColor: '#6366f1',
    suggestedPriceBrl: 97,
    isPopular: true,
    targetAudience: 'Criadores & Agências',
    allowedToolIds: '*', // Unlocks all tools
    features: [
      '1.000 créditos/mês com acúmulo de saldo não utilizado',
      'Todas as 25+ ferramentas de IA desbloqueadas',
      'Engenharia Reversa & DNA Estrutural de Produto',
      'Cinematic Engine & Provador Virtual IA',
      'Visual Reference Agent & AI Video Project',
      'Lyria Music Engine & Transcrição de Áudio',
      'Processamento de alta velocidade e prioridade no Worker'
    ]
  },

  SCALE: {
    id: 'SCALE',
    label: 'Scale Agency',
    name: 'Plano Scale',
    description: 'Volume massivo de créditos para agências, infoprodutores e operações de escala.',
    tierLevel: 3,
    monthlyCredits: 3000,
    rolloverCredits: true,
    badgeColor: 'bg-amber-950/80 text-amber-300 border-amber-700/60 shadow-[0_0_15px_rgba(245,158,11,0.25)]',
    accentColor: '#f59e0b',
    suggestedPriceBrl: 247,
    isPopular: false,
    targetAudience: 'Operações de Escala',
    allowedToolIds: '*',
    features: [
      '3.000 créditos/mês com acúmulo garantido',
      'Acesso irrestrito a todas as ferramentas presentes e futuras',
      'Geração em lote e exportação automatizada',
      'Atendimento dedicado com especialista de produto',
      'Acesso antecipado a novos modelos e releases'
    ]
  },

  ENTERPRISE: {
    id: 'ENTERPRISE',
    label: 'Enterprise Max',
    name: 'Plano Enterprise',
    description: 'Créditos ilimitados sob demanda, suporte dedicado e SLAs customizados.',
    tierLevel: 4,
    monthlyCredits: 10000,
    rolloverCredits: true,
    badgeColor: 'bg-purple-950/80 text-purple-300 border-purple-700/60',
    accentColor: '#a855f7',
    suggestedPriceBrl: 697,
    isPopular: false,
    targetAudience: 'Grandes Marcas & Redes',
    allowedToolIds: '*',
    features: [
      '10.000 créditos/mês',
      'Suporte VIP via WhatsApp e canal direto',
      'Treinamento de equipe e onboarding personalizado',
      'Configuração de modelos customizados sob medida'
    ]
  },

  ADMIN: {
    id: 'ADMIN',
    label: 'System Admin',
    name: 'Acesso Administrativo',
    description: 'Acesso total de desenvolvimento, testes e auditoria de sistema com bypass de créditos.',
    tierLevel: 99,
    monthlyCredits: 999999,
    rolloverCredits: true,
    badgeColor: 'bg-rose-950/80 text-rose-300 border-rose-700/60 shadow-[0_0_15px_rgba(244,63,94,0.3)]',
    accentColor: '#f43f5e',
    suggestedPriceBrl: 0,
    isPopular: false,
    targetAudience: 'Engenharia & Administração',
    allowedToolIds: '*',
    features: [
      'Bypass total de consumo de créditos (uso ilimitado)',
      'Desbloqueio universal de todas as ferramentas e rotas',
      'Acesso completo a telemetria, custos e logs analíticos',
      'Ferramentas de diagnóstico e inspeção de payloads'
    ]
  }
};

/**
 * Gets a plan definition by ID or returns the default FREE plan.
 */
export function getPlan(planId?: string | null): CreatorPlanDefinition {
  if (!planId) return CREATOR_PLANS.FREE;
  const upper = planId.toUpperCase() as CreatorPlanId;
  return CREATOR_PLANS[upper] || CREATOR_PLANS.FREE;
}

/**
 * Returns all available plans as an array sorted by tier level.
 */
export function getAllPlans(): CreatorPlanDefinition[] {
  return Object.values(CREATOR_PLANS).sort((a, b) => a.tierLevel - b.tierLevel);
}

/**
 * Checks if a specific tool is unlocked for the user's plan.
 */
export function isToolAllowedForPlan(planId: CreatorPlanId | string | undefined, toolId: string): boolean {
  const plan = getPlan(planId);
  if (plan.id === 'ADMIN') return true;
  if (plan.allowedToolIds === '*') return true;
  if (!toolId) return true;
  return plan.allowedToolIds.includes(toolId);
}

/**
 * Returns default initial plan for new users.
 */
export function getDefaultPlanId(): CreatorPlanId {
  return 'FREE';
}

/**
 * Compares two plan tiers. Returns true if userPlan tier >= requiredPlan tier.
 */
export function isPlanSufficient(userPlanId: CreatorPlanId, requiredPlanId: CreatorPlanId): boolean {
  const userPlan = getPlan(userPlanId);
  const requiredPlan = getPlan(requiredPlanId);
  return userPlan.tierLevel >= requiredPlan.tierLevel;
}
