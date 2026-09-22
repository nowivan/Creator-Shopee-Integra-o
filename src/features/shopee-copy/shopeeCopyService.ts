/**
 * SHOPEE COPY SERVICE — ORCHESTRATION & GENERATION PIPELINE
 * 
 * Rules:
 * 1. Reuses canonical product authority (resolveProductInfoAuthority, extractCommercialEvidence).
 * 2. Compiles prompts strictly combining independent Structure and Style engines.
 * 3. Enforces 160–175 characters and Shopee-native conversion idioms.
 * 4. Micro-repairs deterministic errors (150–159 extension, 176–185 pruning).
 * 5. Persists output to isolated Shopee session storage ('creator_pro_shopee_copy_session_v1').
 */

import { resolveProductInfoAuthority } from '../agente-de-copy-clean/brief';
import { extractCommercialEvidence } from '../agente-de-copy-clean/validator';
import { GEMINI_MODEL, safeJSONParse } from '../../utils';
import { postToWorker } from '../../services/workerClient';
import {
  ShopeeCopyStructure,
  ShopeeCopyStyle,
  ShopeeCTAType,
  ShopeeCopyOutputMode,
  ShopeeCopyVariation,
  ShopeeCommercialEvidence,
  ShopeeCopyContext,
  ShopeeCopyResult,
  ShopeeCopyDiagnosticTrace,
  ShopeePreset,
  SHOPEE_MIN_CHARS,
  SHOPEE_MAX_CHARS,
  SHOPEE_SWEET_SPOT_MIN,
  SHOPEE_SWEET_SPOT_MAX
} from './types';
import { getShopeeStructureInstruction } from './shopeeStructureEngine';
import { getShopeeStyleInstruction } from './shopeeStyleEngine';
import { getShopeeCTAPromptGuidance } from './shopeeCTAResolver';
import { validateAndRepairShopeeVariation } from './shopeeCopyValidator';
import { saveShopeeSession } from './shopeeSessionStorage';

export const SHOPEE_COPY_SCHEMA = {
  type: "OBJECT",
  properties: {
    versions: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          id: { type: "INTEGER" },
          scene2: { type: "STRING" },
          scene3: { type: "STRING" }
        },
        required: ["id", "scene2", "scene3"]
      }
    }
  },
  required: ["versions"]
};

/**
 * Compiles the prompt for Shopee copy generation.
 */
export function buildShopeeCopyPrompt(params: {
  productName: string;
  productContext: string;
  structure: ShopeeCopyStructure;
  style: ShopeeCopyStyle;
  ctaType: ShopeeCTAType;
  evidence: ShopeeCommercialEvidence;
  outputMode?: ShopeeCopyOutputMode;
  preset?: ShopeePreset | 'SHOPEE_NATIVE_CREATOR';
}): string {
  const { productName, productContext, structure, style, ctaType, evidence, outputMode, preset } = params;

  const structureInstruction = getShopeeStructureInstruction(structure, evidence);
  const styleInstruction = getShopeeStyleInstruction(style, evidence);
  const ctaInstruction = getShopeeCTAPromptGuidance(ctaType, evidence);

  let outputModeInstruction = '';
  if (outputMode === ShopeeCopyOutputMode.SCENE_2) {
    outputModeInstruction = `
==================================================
PRIORIDADE DE SAÍDA: CENA 2 (DEMONSTRAÇÃO & BENEFÍCIO)
==================================================
- O usuário selecionou foco em CENA 2. Dê atenção minuciosa ao manuseio, utilidade prática e impacto visual.`;
  } else if (outputMode === ShopeeCopyOutputMode.SCENE_3) {
    outputModeInstruction = `
==================================================
PRIORIDADE DE SAÍDA: CENA 3 (FECHAMENTO & CTA SHOPEE)
==================================================
- O usuário selecionou foco em CENA 3. Dê prioridade e persuasão ao fechamento, aversão à perda e condução firme ao CTA.`;
  } else if (outputMode === ShopeeCopyOutputMode.SCENE_2_AND_3) {
    outputModeInstruction = `
==================================================
PRIORIDADE DE SAÍDA: CENA 2 + CENA 3 (PAR SINCRONIZADO)
==================================================
- Conecte harmonicamente a demonstração da Cena 2 com o fechamento da Cena 3 com transição oral suave.`;
  } else {
    outputModeInstruction = `
==================================================
PRIORIDADE DE SAÍDA: COPY COMPLETA
==================================================
- Gere variações com Cena 2 e Cena 3 balanceadas para o roteiro de alta conversão.`;
  }

  return `VOCÊ É O ESPECIALISTA SÊNIOR EM COPY FALADA PARA ANÚNCIOS DA SHOPEE (CREATOR PRO).
Sua missão é gerar exatamente 6 VERSÕES DE COPY FALADA (IDs de 1 a 6) para um vídeo de alta conversão na Shopee.
${outputModeInstruction}

==================================================
1. PRODUTO & AUTORIDADE FACTUAL (BASE DA VERDADE)
==================================================
PRODUTO: ${productName}
CONTEXTO FACTUAL OBSERVADO:
${productContext}

EVIDÊNCIA COMERCIAL DETECTADA:
- Desconto Explícito: ${evidence.hasExplicitDiscount ? 'SIM (comprovado)' : 'NÃO (proibido citar percentuais ou descontos)'}
- Cupom Visível: ${evidence.hasExplicitCoupon ? 'SIM (comprovado)' : 'NÃO (proibido citar cupons)'}
- Frete Grátis: ${evidence.hasExplicitShipping ? 'SIM (comprovado)' : 'NÃO (proibido citar frete grátis)'}
- Limite de Estoque: ${evidence.hasExplicitStockLimit ? 'SIM (comprovado)' : 'NÃO (proibido citar escassez forjada)'}
- Prazo / Oferta Relâmpago: ${evidence.hasExplicitDeadline ? 'SIM (comprovado)' : 'NÃO (proibido inventar prazos)'}
- Autenticidade: ${evidence.hasExplicitAuthenticity ? 'SIM (comprovado)' : 'NÃO (proibido afirmar "100% original" ou procedência)'}
- Avaliações / Estrelas: ${evidence.hasExplicitReviews ? 'SIM (comprovado)' : 'NÃO (proibido inventar avaliações ou estrelas)'}

==================================================
2. CONTRATO DE CARACTERES E FORMATO
==================================================
- Cada versão contém apenas: CENA 2 e CENA 3.
- CENA 2: Exatamente entre ${SHOPEE_MIN_CHARS} e ${SHOPEE_MAX_CHARS} caracteres (alvo: ${SHOPEE_SWEET_SPOT_MIN}–${SHOPEE_SWEET_SPOT_MAX}).
- CENA 3: Exatamente entre ${SHOPEE_MIN_CHARS} e ${SHOPEE_MAX_CHARS} caracteres (alvo: ${SHOPEE_SWEET_SPOT_MIN}–${SHOPEE_SWEET_SPOT_MAX}).
- Texto falado corrido em português brasileiro (PT-BR) natural, sem rótulos como "Cena 2:" ou "Cena 3:", sem rubricas de câmera, sem tópicos.
- PROIBIÇÕES ABSOLUTAS:
  * NUNCA cite valores em dinheiro (R$, reais, parcelas no cartão).
  * NUNCA use termos de direção de filmagem (close-up, câmera, vemos na imagem).
  * NUNCA use "carrinho laranja" ou termos de outras redes. A Shopee usa "${ctaType.toLowerCase().replace('_', ' ')}".

==================================================
3. DIRETRIZES DE ESTRUTURA, ESTILO E CTA
==================================================
PRESET ATIVO: SHOPEE_NATIVE_CREATOR (DIRETRIZ OFICIAL SHOPEE NATIVE CREATOR)
Sequência comprovada de retenção e conversão nativa da Shopee:
1. Product in Use (Produto em Uso)
→ 2. Feature Demonstration (Demonstração do Diferencial)
→ 3. Practical Benefit (Benefício Prático)
→ 4. Personal Opinion (Opinião / Review Pessoal)
→ 5. Native Shopee CTA (Chamada Nativa da Shopee)

Na CENA 2, priorize expressamente a prova física visível do benefício falado.
Estruturas preferenciais recomendadas: [Produto em Uso], [Diferencial → Benefício], [Review Pessoal].

${structureInstruction}

${styleInstruction}

${ctaInstruction}

==================================================
4. RETORNO OBRIGATÓRIO (JSON)
==================================================
Gere exatamente 6 variações completas no seguinte formato:
{
  "versions": [
    { "id": 1, "scene2": "...", "scene3": "..." },
    { "id": 2, "scene2": "...", "scene3": "..." },
    { "id": 3, "scene2": "...", "scene3": "..." },
    { "id": 4, "scene2": "...", "scene3": "..." },
    { "id": 5, "scene2": "...", "scene3": "..." },
    { "id": 6, "scene2": "...", "scene3": "..." }
  ]
}`;
}

/**
 * Orchestrates full generation of Shopee copies.
 */
export async function executeShopeeCopyGeneration(
  context: ShopeeCopyContext
): Promise<ShopeeCopyResult> {
  const startTime = Date.now();

  // 1. Resolve product truth through canonical authority hierarchy
  const authority = resolveProductInfoAuthority({
    title: context.productName,
    description: context.productFacts.join('\n'),
    userFacts: context.productFacts,
    imageComponents: context.productVisibleDetails
  });

  const effectiveProductName = authority.productType || context.productName || 'Produto Shopee';
  const effectiveContext = [
    authority.neutralDescription || context.productFacts.join('\n'),
    context.productVisibleDetails.length > 0 ? `Detalhes visíveis: ${context.productVisibleDetails.join(', ')}` : ''
  ].filter(Boolean).join('\n\n');

  // 2. Extract commercial evidence
  const evidence: ShopeeCommercialEvidence = {
    ...extractCommercialEvidence(effectiveContext),
    ...context.evidence
  };

  const preset = context.preset || ShopeePreset.SHOPEE_NATIVE_CREATOR;
  const structure = context.structure || ShopeeCopyStructure.PRODUCT_IN_USE;
  const style = context.style || ShopeeCopyStyle.UGC_NATURAL;
  const ctaType = context.ctaType || ShopeeCTAType.PRODUTO_MARCADO;
  const outputMode = context.outputMode || ShopeeCopyOutputMode.FULL_COPY;

  // 3. Compile prompt
  const prompt = buildShopeeCopyPrompt({
    productName: effectiveProductName,
    productContext: effectiveContext,
    structure,
    style,
    ctaType,
    evidence,
    outputMode,
    preset
  });

  // 4. Invoke LLM via Worker Client
  const payload: any = {
    model: GEMINI_MODEL,
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }]
      }
    ],
    generationConfig: {
      temperature: 0.7,
      topP: 0.95,
      responseMimeType: "application/json",
      responseSchema: SHOPEE_COPY_SCHEMA
    }
  };

  if (context.rawImageBase64) {
    const mimeType = context.imageMimeType || 'image/jpeg';
    payload.contents[0].parts.push({
      inlineData: {
        mimeType,
        data: context.rawImageBase64
      }
    });
  }

  let rawResponseData: any = null;
  try {
    const workerRes = await postToWorker('/api/gemini/generate', payload, {
      moduleName: 'ShopeeCopyService_Generate',
      timeoutMs: 90000
    });

    if (workerRes?.data && typeof workerRes.data === 'object') {
      rawResponseData = workerRes.data;
    } else if (workerRes?.raw_text) {
      rawResponseData = safeJSONParse(workerRes.raw_text, null);
    } else {
      const candidateText = workerRes?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (candidateText) {
        rawResponseData = safeJSONParse(candidateText, null);
      }
    }
  } catch (err: any) {
    console.warn('[ShopeeCopyService] Worker invocation failed or returned error:', err);
  }

  // 5. Parse variations from response
  const rawList: any[] = Array.isArray(rawResponseData?.versions) ? rawResponseData.versions : [];
  const processedVariations: ShopeeCopyVariation[] = [];

  let repairsCount = 0;
  const violationsSummary: Record<string, number> = {};

  for (let i = 1; i <= 6; i++) {
    const found = rawList.find(v => v.id === i) || rawList[i - 1];
    const s2 = found?.scene2 || '';
    const s3 = found?.scene3 || '';

    const validated = validateAndRepairShopeeVariation({
      id: i,
      scene2: s2,
      scene3: s3,
      structure,
      style,
      ctaType
    }, evidence);

    if (validated.repaired) {
      repairsCount++;
    }

    if (validated.validationErrors) {
      for (const err of validated.validationErrors) {
        violationsSummary[err] = (violationsSummary[err] || 0) + 1;
      }
    }

    processedVariations.push(validated);
  }

  const validCount = processedVariations.filter(v => v.isValid).length;
  const executionTimeMs = Date.now() - startTime;

  const diagnosticTrace: ShopeeCopyDiagnosticTrace = {
    timestamp: new Date().toISOString(),
    executionTimeMs,
    productName: effectiveProductName,
    structureUsed: structure,
    styleUsed: style,
    ctaTypeUsed: ctaType,
    evidence,
    initialGeneratedCount: rawList.length,
    validCount,
    repairsAppliedCount: repairsCount,
    violationsSummary
  };

  // 6. Persist to isolated Shopee session storage
  saveShopeeSession({
    schemaVersion: 1,
    savedAt: Date.now(),
    productContext: effectiveProductName,
    productImagePreview: context.rawImageBase64 ? `data:${context.imageMimeType || 'image/jpeg'};base64,${context.rawImageBase64}` : undefined,
    selectedStructure: structure,
    selectedStyle: style,
    selectedCtaType: ctaType,
    variations: processedVariations,
    selectedVariationId: processedVariations[0]?.id || 1,
    selectedScene3Copy: processedVariations[0]?.scene3
  });

  return {
    ok: validCount > 0,
    variations: processedVariations,
    evidence,
    productName: effectiveProductName,
    diagnosticTrace
  };
}
