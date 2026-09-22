/**
 * Creator Intelligence Pro — Credit Action Registry (Etapa 4A).
 * Maps actions, AI capabilities, and tools to internal credit costs.
 */

import { CreditActionId, CreditActionDefinition } from '../types/credits';

export const CREDIT_ACTION_REGISTRY: Record<CreditActionId, CreditActionDefinition> = {
  AGENTE_COPY_CLEAN: {
    actionId: 'AGENTE_COPY_CLEAN',
    label: 'Agente de Copy Clean (Cena 2 / Cena 3)',
    creditCost: 3,
    toolId: 'agente-de-copy-clean',
    description: 'Geração estruturada de variações de copy de alta conversão sem emojis.'
  },
  AGENTE_COPY_GENERATION: {
    actionId: 'AGENTE_COPY_GENERATION',
    label: 'Agente de Copy (Legado)',
    creditCost: 3,
    toolId: 'agente-de-copy',
    description: 'Geração de roteiros e variações de copy para produtos.'
  },
  AI_VIDEO_PROJECT: {
    actionId: 'AI_VIDEO_PROJECT',
    label: 'AI Video Project (Módulo M1)',
    creditCost: 5,
    toolId: 'ai-video-project',
    description: 'Direção estruturada e blueprint de cenas para produção de vídeo.'
  },
  VISUAL_REFERENCE: {
    actionId: 'VISUAL_REFERENCE',
    label: 'Visual Reference Agent',
    creditCost: 5,
    toolId: 'visual-reference-agent',
    description: 'Análise de referências visuais e geração de frames guiados.'
  },
  CREATIVE_DIRECTOR: {
    actionId: 'CREATIVE_DIRECTOR',
    label: 'Creative Director AI',
    creditCost: 4,
    toolId: 'create',
    description: 'Geração completa de roteiros virais e prompts de vídeo.'
  },
  PRODUCT_LISTING_SEO: {
    actionId: 'PRODUCT_LISTING_SEO',
    label: 'Gerador Título, Tags & SEO',
    creditCost: 2,
    toolId: 'product-listing',
    description: 'Otimização de títulos e tags para TikTok Shop, Shopee e Mercado Livre.'
  },
  COLLAGE_STUDIO: {
    actionId: 'COLLAGE_STUDIO',
    label: 'Criador de Colagem & Layout',
    creditCost: 2,
    toolId: 'collage-studio',
    description: 'Composições visuais e layouts para criativos de produto.'
  },
  VANESSA_COPY: {
    actionId: 'VANESSA_COPY',
    label: 'Vanessa Copy Creator V2',
    creditCost: 3,
    toolId: 'vanessa',
    description: 'Criativos persuasivos e páginas de alta conversão para produtos.'
  },
  IDENTITY_HUB: {
    actionId: 'IDENTITY_HUB',
    label: 'Identity Hub & DNA Criativo',
    creditCost: 2,
    toolId: 'identity-hub',
    description: 'Consolidação de identidade e parâmetros da marca.'
  },
  VIRAL_CHAT: {
    actionId: 'VIRAL_CHAT',
    label: 'Consultor Viral IA (Chat)',
    creditCost: 1,
    toolId: 'chat',
    description: 'Consultoria estratégica e respostas especializadas sobre marketing e criativos.'
  },
  VIRAL_IDEATION: {
    actionId: 'VIRAL_IDEATION',
    label: 'Ideador Viral',
    creditCost: 2,
    toolId: 'ideador',
    description: 'Geração rápida de ganchos, ângulos de venda e ideias de conteúdo.'
  },
  COPY_MASTER: {
    actionId: 'COPY_MASTER',
    label: 'Copy Master',
    creditCost: 2,
    toolId: 'copy-master',
    description: 'Headlines, CTAs e bullets prontos para campanhas.'
  },
  SCRIPT_REFINER: {
    actionId: 'SCRIPT_REFINER',
    label: 'Refinador de Script (Anti-Cópia)',
    creditCost: 2,
    toolId: 'script-refiner',
    description: 'Remodelagem e polimento de roteiros existentes.'
  },
  HOOK_GENERATOR: {
    actionId: 'HOOK_GENERATOR',
    label: 'Gerador de Ganchos Virais',
    creditCost: 2,
    toolId: 'hooks',
    description: 'Criação de ganchos magnéticos para os primeiros 3 segundos.'
  },
  REVERSE_ENGINEERING: {
    actionId: 'REVERSE_ENGINEERING',
    label: 'Engenharia Reversa & Remodelagem',
    creditCost: 6,
    toolId: 'reverse',
    description: 'Desconstrução profunda de vídeos virais e extração de DNA de conversão.'
  },
  CINEMATIC_ENGINE: {
    actionId: 'CINEMATIC_ENGINE',
    label: 'Cinematic Engine (Vídeo Prompts)',
    creditCost: 5,
    toolId: 'cinematic',
    description: 'Geração de prompts cinematográficos para Runway, Sora, Luma e Veo.'
  },
  TRY_ON: {
    actionId: 'TRY_ON',
    label: 'Provador Virtual IA (Try-On)',
    creditCost: 5,
    toolId: 'try-on',
    description: 'Experimentação virtual de peças e vestuário com IA.'
  },
  TRANSLATOR: {
    actionId: 'TRANSLATOR',
    label: 'Tradutor Virtual de Prompts',
    creditCost: 2,
    toolId: 'translator',
    description: 'Tradução fluida de prompts entre múltiplos idiomas.'
  },
  IMAGE_DESCRIBER: {
    actionId: 'IMAGE_DESCRIBER',
    label: 'Descrever Imagem com IA',
    creditCost: 3,
    toolId: 'image-describer',
    description: 'Análise detalhada e descrição técnica de imagens de produtos.'
  },
  MAGIC_ENHANCER: {
    actionId: 'MAGIC_ENHANCER',
    label: 'Aprimorador Mágico de Prompts',
    creditCost: 2,
    toolId: 'magic-enhancer',
    description: 'Transformação de ideias simples em prompts ricos e detalhados.'
  },
  PROMPT_REFINER: {
    actionId: 'PROMPT_REFINER',
    label: 'Refinador de Prompts',
    creditCost: 2,
    toolId: 'prompt-refiner',
    description: 'Ajuste fino de parâmetros visuais e textuais.'
  },
  IMAGE_EXTRACTOR: {
    actionId: 'IMAGE_EXTRACTOR',
    label: 'Extrator de Prompt de Imagem',
    creditCost: 3,
    toolId: 'image-extractor',
    description: 'Descoberta e engenharia reversa do prompt original de imagens.'
  },
  TIKTOK_LEGAL: {
    actionId: 'TIKTOK_LEGAL',
    label: 'Advogado TikTok Shop',
    creditCost: 4,
    toolId: 'tiktok-legal',
    description: 'Elaboração de recursos e conformidade para reverter punições.'
  },
  AUDIT_COMPLIANCE: {
    actionId: 'AUDIT_COMPLIANCE',
    label: 'Auditoria de Conformidade',
    creditCost: 4,
    toolId: 'audit',
    description: 'Auditoria rigorosa de regras de anúncio e diretrizes de plataforma.'
  },
  LYRIA_MUSIC: {
    actionId: 'LYRIA_MUSIC',
    label: 'Lyria Music Engine',
    creditCost: 5,
    toolId: 'lyria-music',
    description: 'Composição de trilhas sonoras e áudios originais para vídeos.'
  },
  TRANSCRIPTION_AUDIO: {
    actionId: 'TRANSCRIPTION_AUDIO',
    label: 'Transcrição & Voz IA',
    creditCost: 4,
    toolId: 'transcription',
    description: 'Transcrição de áudios e conversão em roteiros estruturados.'
  },
  GENERIC_AI_ACTION: {
    actionId: 'GENERIC_AI_ACTION',
    label: 'Ação de Inteligência Artificial',
    creditCost: 2,
    description: 'Processamento geral com modelo Gemini Pro/Flash.'
  }
};

/**
 * Returns the action definition by actionId.
 */
export function getCreditActionDefinition(actionId: CreditActionId): CreditActionDefinition {
  return CREDIT_ACTION_REGISTRY[actionId] || CREDIT_ACTION_REGISTRY.GENERIC_AI_ACTION;
}

/**
 * Returns the credit cost for a given action ID.
 */
export function getCreditCost(actionId: CreditActionId): number {
  return getCreditActionDefinition(actionId).creditCost;
}

/**
 * Resolves the appropriate CreditActionId based on toolId and mode.
 */
export function resolveCreditAction(toolId?: string, mode?: string): CreditActionDefinition {
  const t = (toolId || '').toLowerCase().trim();
  const m = (mode || '').toLowerCase().trim();

  if (t === 'agente-de-copy-clean' || m.includes('scene2') || m.includes('scene3') || m.includes('copy_clean')) {
    return CREDIT_ACTION_REGISTRY.AGENTE_COPY_CLEAN;
  }
  if (t === 'agente-de-copy') return CREDIT_ACTION_REGISTRY.AGENTE_COPY_GENERATION;
  if (t === 'ai-video-project') return CREDIT_ACTION_REGISTRY.AI_VIDEO_PROJECT;
  if (t === 'visual-reference-agent') return CREDIT_ACTION_REGISTRY.VISUAL_REFERENCE;
  if (t === 'create') return CREDIT_ACTION_REGISTRY.CREATIVE_DIRECTOR;
  if (t === 'product-listing') return CREDIT_ACTION_REGISTRY.PRODUCT_LISTING_SEO;
  if (t === 'collage-studio') return CREDIT_ACTION_REGISTRY.COLLAGE_STUDIO;
  if (t === 'vanessa') return CREDIT_ACTION_REGISTRY.VANESSA_COPY;
  if (t === 'identity-hub') return CREDIT_ACTION_REGISTRY.IDENTITY_HUB;
  if (t === 'chat' || t.includes('consultor')) return CREDIT_ACTION_REGISTRY.VIRAL_CHAT;
  if (t === 'ideador' || t.includes('ideador') || t.includes('ideation')) return CREDIT_ACTION_REGISTRY.VIRAL_IDEATION;
  if (t === 'copy-master') return CREDIT_ACTION_REGISTRY.COPY_MASTER;
  if (t === 'script-refiner') return CREDIT_ACTION_REGISTRY.SCRIPT_REFINER;
  if (t === 'hooks' || t.includes('gancho')) return CREDIT_ACTION_REGISTRY.HOOK_GENERATOR;
  if (t === 'reverse' || m.includes('reverse') || m.includes('dna')) return CREDIT_ACTION_REGISTRY.REVERSE_ENGINEERING;
  if (t === 'cinematic') return CREDIT_ACTION_REGISTRY.CINEMATIC_ENGINE;
  if (t === 'try-on' || t === 'ai-try-on' || t.includes('provador')) return CREDIT_ACTION_REGISTRY.TRY_ON;
  if (t === 'translator' || t.includes('tradutor')) return CREDIT_ACTION_REGISTRY.TRANSLATOR;
  if (t === 'image-describer') return CREDIT_ACTION_REGISTRY.IMAGE_DESCRIBER;
  if (t === 'magic-enhancer') return CREDIT_ACTION_REGISTRY.MAGIC_ENHANCER;
  if (t === 'prompt-refiner') return CREDIT_ACTION_REGISTRY.PROMPT_REFINER;
  if (t === 'image-extractor') return CREDIT_ACTION_REGISTRY.IMAGE_EXTRACTOR;
  if (t === 'tiktok-legal' || t.includes('advogado')) return CREDIT_ACTION_REGISTRY.TIKTOK_LEGAL;
  if (t === 'audit' || t.includes('compliance')) return CREDIT_ACTION_REGISTRY.AUDIT_COMPLIANCE;
  if (t === 'lyria-music' || t.includes('lyria')) return CREDIT_ACTION_REGISTRY.LYRIA_MUSIC;
  if (t === 'transcription' || t.includes('transcri')) return CREDIT_ACTION_REGISTRY.TRANSCRIPTION_AUDIO;
  if (t === 'create' || t.includes('creative') || t.includes('diretor')) return CREDIT_ACTION_REGISTRY.CREATIVE_DIRECTOR;

  // Fallback by mode string
  for (const def of Object.values(CREDIT_ACTION_REGISTRY)) {
    if (def.toolId && t === def.toolId) return def;
  }

  return CREDIT_ACTION_REGISTRY.GENERIC_AI_ACTION;
}
