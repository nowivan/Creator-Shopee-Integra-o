/**
 * COMBINED VARIATIONS SERVICE — SCENE 2 + SCENE 3
 * 
 * Objectives:
 * 1. Single Gemini AI call to generate cohesive Scene 2 + Scene 3 pairs.
 * 2. Quantity semantics:
 *    - 1: Individual mode (user chooses Scene 2 only OR Scene 3 CTA only)
 *    - 2: 1 Pair (1 Scene 2 + 1 Scene 3 CTA)
 *    - 4: 2 Pairs (2 Scene 2 + 2 Scene 3 CTA)
 *    - 6: 3 Pairs (3 Scene 2 + 3 Scene 3 CTA)
 * 3. Commercial Coherence:
 *    - Same sales angle per pair
 *    - Different scene function (Scene 2 = Benefit/Practical Demonstration, Scene 3 = Closing/CTA)
 *    - Strict prohibition on semantic repetition / parroting
 * 4. Preserves strict validation rules:
 *    - Scene 2: [140..180] chars, spoken PT-BR, zero commercial terms, zero camera commands
 *    - Scene 3: [160..175] chars, mandatory "carrinho laranja", no invented prices/deadlines, zero camera commands
 */

import { processGeminiAPI, safeJSONParse } from '../../../utils';
import { COPY_CONTRACT, validateCopyContract } from '../../copy-contract';
import {
  CombinedVariationQuantity,
  IndividualModeChoice,
  GeneratedScenePair,
  CombinedVariationsInput,
  CombinedVariationsResult,
  CombinedVariationsDiagnostics
} from '../types/combinedVariations';

export class CombinedVariationsError extends Error {
  public readonly code: string;
  public readonly diagnostics?: Partial<CombinedVariationsDiagnostics>;

  constructor(message: string, code = 'COMBINED_VARIATIONS_ERROR', diagnostics?: Partial<CombinedVariationsDiagnostics>) {
    super(message);
    this.name = 'CombinedVariationsError';
    this.code = code;
    this.diagnostics = diagnostics;
  }
}

/**
 * Counts characters using Unicode code point awareness (Array.from).
 */
export function countCharacters(text: string): number {
  if (!text) return 0;
  return Array.from(text).length;
}

/**
 * Item descriptor for non-compliant copies requiring granular retry.
 */
export interface NonCompliantItem {
  pairIndex: number;
  field: 'scene2Copy' | 'scene3Cta' | 'missing_pair';
  currentText?: string;
  charCount?: number;
  issue: string;
  salesAngle: string;
}

export interface AdaptiveDelta {
  currentLength: number;
  targetLength: number;
  direction: 'EXPAND' | 'REDUCE' | 'PERFECT';
  minDelta: number;
  idealDelta: number;
  maxDelta: number;
  instructionText: string;
}

export interface RetryTelemetryItem {
  scene: 'Scene2' | 'Scene3' | 'Pair';
  pairIndex: number;
  attempt: number;
  beforeLength: number;
  targetLength: number;
  direction: 'EXPAND' | 'REDUCE' | 'PERFECT';
  minDelta: number;
  idealDelta: number;
  maxDelta: number;
  afterLength?: number;
  valid?: boolean;
}

/**
 * Calculates exact deterministic delta for expanding or compressing copies toward TARGET (168 ch).
 */
export function calculateAdaptiveDelta(currentLength: number): AdaptiveDelta {
  const MIN = COPY_CONTRACT.minChars; // 160
  const MAX = COPY_CONTRACT.maxChars; // 175
  const TARGET = 168; // Convergence midpoint

  if (currentLength < MIN) {
    const minAdd = MIN - currentLength;
    const idealAdd = TARGET - currentLength;
    const maxAdd = MAX - currentLength;
    return {
      currentLength,
      targetLength: TARGET,
      direction: 'EXPAND',
      minDelta: minAdd,
      idealDelta: idealAdd,
      maxDelta: maxAdd,
      instructionText: `Adicione aproximadamente ${idealAdd} caracteres. A expansão permitida está entre ${minAdd} e ${maxAdd} caracteres. Alvo final aproximado: ${TARGET} caracteres.`
    };
  } else if (currentLength > MAX) {
    const minRemove = currentLength - MAX;
    const idealRemove = currentLength - TARGET;
    const maxRemove = currentLength - MIN;
    return {
      currentLength,
      targetLength: TARGET,
      direction: 'REDUCE',
      minDelta: minRemove,
      idealDelta: idealRemove,
      maxDelta: maxRemove,
      instructionText: `Remova aproximadamente ${idealRemove} caracteres. A redução permitida está entre ${minRemove} e ${maxRemove} caracteres. Alvo final aproximado: ${TARGET} caracteres.`
    };
  } else {
    return {
      currentLength,
      targetLength: TARGET,
      direction: 'PERFECT',
      minDelta: 0,
      idealDelta: 0,
      maxDelta: 0,
      instructionText: `Texto já está dentro do contrato (${MIN}-${MAX} caracteres).`
    };
  }
}

/**
 * Evaluates working pairs against COPY_CONTRACT (160–175 chars, complete sentence, punctuation, 'carrinho laranja')
 * and returns all items requiring granular retry/correction.
 */
export function getNonCompliantItems(
  pairs: GeneratedScenePair[],
  expectedPairCount: number,
  quantity: CombinedVariationQuantity,
  individualTarget?: IndividualModeChoice
): NonCompliantItem[] {
  const items: NonCompliantItem[] = [];

  for (let i = 1; i <= expectedPairCount; i++) {
    const pair = pairs.find(p => p.pairIndex === i);
    if (!pair) {
      items.push({
        pairIndex: i,
        field: 'missing_pair',
        issue: 'Par ausente na resposta.',
        salesAngle: `Ângulo Comercial ${i}`
      });
      continue;
    }

    const salesAngle = pair.salesAngle || `Ângulo Comercial ${i}`;

    if (quantity === 1) {
      if (individualTarget === 'scene2') {
        const val = validateCopyContract(pair.scene2Copy || '');
        if (!pair.scene2Copy || !val.valid) {
          items.push({
            pairIndex: i,
            field: 'scene2Copy',
            currentText: pair.scene2Copy,
            charCount: val.charCount,
            issue: val.errors.length > 0 ? val.errors.join('; ') : `Copy fora do contrato ${COPY_CONTRACT.minChars}-${COPY_CONTRACT.maxChars} ch`,
            salesAngle
          });
        }
      } else {
        const val = validateCopyContract(pair.scene3Cta || '');
        const hasCarrinho = /carrinho\s+laranja/i.test(pair.scene3Cta || '');
        if (!pair.scene3Cta || !val.valid || !hasCarrinho) {
          const errors = [...val.errors];
          if (!hasCarrinho) errors.push("CTA não contém a expressão 'carrinho laranja'");
          items.push({
            pairIndex: i,
            field: 'scene3Cta',
            currentText: pair.scene3Cta,
            charCount: val.charCount,
            issue: errors.join('; ') || `CTA fora do contrato ${COPY_CONTRACT.minChars}-${COPY_CONTRACT.maxChars} ch`,
            salesAngle
          });
        }
      }
    } else {
      // Pairs mode (quantity 2, 4, 6)
      const valS2 = validateCopyContract(pair.scene2Copy || '');
      if (!pair.scene2Copy || !valS2.valid) {
        items.push({
          pairIndex: i,
          field: 'scene2Copy',
          currentText: pair.scene2Copy,
          charCount: valS2.charCount,
          issue: valS2.errors.length > 0 ? valS2.errors.join('; ') : `Cena 2 fora do contrato ${COPY_CONTRACT.minChars}-${COPY_CONTRACT.maxChars} ch`,
          salesAngle
        });
      }

      const valS3 = validateCopyContract(pair.scene3Cta || '');
      const hasCarrinho = /carrinho\s+laranja/i.test(pair.scene3Cta || '');
      if (!pair.scene3Cta || !valS3.valid || !hasCarrinho) {
        const errors = [...valS3.errors];
        if (!hasCarrinho) errors.push("CTA não contém a expressão 'carrinho laranja'");
        items.push({
          pairIndex: i,
          field: 'scene3Cta',
          currentText: pair.scene3Cta,
          charCount: valS3.charCount,
          issue: errors.join('; ') || `Cena 3 CTA fora do contrato ${COPY_CONTRACT.minChars}-${COPY_CONTRACT.maxChars} ch`,
          salesAngle
        });
      }
    }
  }

  return items;
}

/**
 * Extracts and cleans JSON string from AI responses.
 */
export function extractJsonFromResponse(raw: string): any {
  if (!raw || typeof raw !== 'string') {
    throw new CombinedVariationsError('Resposta vazia da IA.', 'EMPTY_RESPONSE');
  }

  const trimmed = raw.trim();

  // Try direct parse first
  try {
    return JSON.parse(trimmed);
  } catch {
    // Continue to markdown unwrap
  }

  // Handle ```json markdown code block
  const jsonMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (jsonMatch && jsonMatch[1]) {
    try {
      return JSON.parse(jsonMatch[1].trim());
    } catch {
      // Continue
    }
  }

  // Handle first '{' to last '}'
  const startIdx = trimmed.indexOf('{');
  const endIdx = trimmed.lastIndexOf('}');
  if (startIdx !== -1 && endIdx > startIdx) {
    try {
      return JSON.parse(trimmed.slice(startIdx, endIdx + 1));
    } catch {
      // Continue
    }
  }

  // Fallback to safeJSONParse
  const fallback = safeJSONParse(trimmed);
  if (fallback && typeof fallback === 'object') {
    return fallback;
  }

  throw new CombinedVariationsError('Não foi possível interpretar a resposta JSON da IA.', 'JSON_PARSE_ERROR');
}

/**
 * Deterministically parses raw AI JSON output into validated GeneratedScenePair array.
 */
export function parseCombinedVariationsOutput(
  rawJson: any,
  requestedQuantity: CombinedVariationQuantity,
  productRevisionId: string,
  individualTarget?: IndividualModeChoice
): GeneratedScenePair[] {
  if (!rawJson || typeof rawJson !== 'object') {
    throw new CombinedVariationsError('JSON estruturado inválido.', 'INVALID_JSON_STRUCTURE');
  }

  let pairsArray: any[] = [];

  if (Array.isArray(rawJson.pairs)) {
    pairsArray = rawJson.pairs;
  } else if (Array.isArray(rawJson.variations)) {
    pairsArray = rawJson.variations;
  } else if (Array.isArray(rawJson)) {
    pairsArray = rawJson;
  } else if (rawJson.pair && typeof rawJson.pair === 'object') {
    pairsArray = [rawJson.pair];
  } else if (rawJson.scene2Copy || rawJson.scene3Cta) {
    pairsArray = [rawJson];
  }

  if (!pairsArray || pairsArray.length === 0) {
    throw new CombinedVariationsError('Nenhum par de variação encontrado no JSON retornado.', 'NO_PAIRS_FOUND');
  }

  // Expected pair count:
  // 1 -> 1
  // 2 -> 1
  // 4 -> 2
  // 6 -> 3
  const expectedPairCount = requestedQuantity === 1 ? 1 : requestedQuantity / 2;

  const resultPairs: GeneratedScenePair[] = [];

  for (let i = 0; i < pairsArray.length && i < expectedPairCount; i++) {
    const raw = pairsArray[i];
    const index = i + 1;
    const salesAngle = (raw.salesAngle || raw.angle || raw.angulo || raw.angleName || `Ângulo Comercial ${index}`).trim();

    let scene2Copy: string | undefined = undefined;
    let scene3Cta: string | undefined = undefined;

    if (requestedQuantity === 1) {
      if (individualTarget === 'scene2') {
        const rawCopy = raw.scene2Copy ?? raw.scene2 ?? raw.copy ?? raw.text ?? '';
        scene2Copy = typeof rawCopy === 'string' ? rawCopy.trim() : '';
      } else {
        const rawCta = raw.scene3Cta ?? raw.scene3 ?? raw.cta ?? raw.text ?? '';
        scene3Cta = typeof rawCta === 'string' ? rawCta.trim() : '';
      }
    } else {
      const rawCopy = raw.scene2Copy ?? raw.scene2 ?? raw.copy ?? '';
      const rawCta = raw.scene3Cta ?? raw.scene3 ?? raw.cta ?? '';
      scene2Copy = typeof rawCopy === 'string' ? rawCopy.trim() : '';
      scene3Cta = typeof rawCta === 'string' ? rawCta.trim() : '';
    }

    const countS2 = scene2Copy ? countCharacters(scene2Copy) : undefined;
    const countS3 = scene3Cta ? countCharacters(scene3Cta) : undefined;

    const validationS2 = scene2Copy !== undefined ? validateCopyContract(scene2Copy) : undefined;
    const validationS3 = scene3Cta !== undefined ? validateCopyContract(scene3Cta) : undefined;

    const isValidS2 = validationS2 !== undefined ? validationS2.valid : true;
    const isValidS3 = validationS3 !== undefined ? (
      validationS3.valid &&
      /carrinho\s+laranja/i.test(scene3Cta || '')
    ) : true;

    resultPairs.push({
      id: `pair_${productRevisionId}_${index}_${Date.now()}`,
      pairIndex: index,
      salesAngle,
      scene2Copy: scene2Copy || undefined,
      scene3Cta: scene3Cta || undefined,
      characterCountScene2: countS2,
      characterCountScene3: countS3,
      productRevisionId,
      isValidScene2: isValidS2,
      isValidScene3: isValidS3
    });
  }

  if (resultPairs.length === 0) {
    throw new CombinedVariationsError('Não foi possível extrair variações válidas.', 'PARSER_EMPTY_RESULT');
  }

  return resultPairs;
}

/**
 * Merges granular retry corrections into the working pairs list.
 */
export function applyGranularCorrections(
  currentPairs: GeneratedScenePair[],
  rawCorrectionsJson: any,
  invalidItems: NonCompliantItem[],
  productRevisionId: string
): GeneratedScenePair[] {
  let correctionsList: any[] = [];
  if (Array.isArray(rawCorrectionsJson.corrections)) {
    correctionsList = rawCorrectionsJson.corrections;
  } else if (Array.isArray(rawCorrectionsJson.pairs)) {
    correctionsList = rawCorrectionsJson.pairs;
  } else if (Array.isArray(rawCorrectionsJson.variations)) {
    correctionsList = rawCorrectionsJson.variations;
  } else if (Array.isArray(rawCorrectionsJson)) {
    correctionsList = rawCorrectionsJson;
  } else if (rawCorrectionsJson.correction && typeof rawCorrectionsJson.correction === 'object') {
    correctionsList = [rawCorrectionsJson.correction];
  } else if (rawCorrectionsJson.pair && typeof rawCorrectionsJson.pair === 'object') {
    correctionsList = [rawCorrectionsJson.pair];
  }

  const updatedPairs = [...currentPairs];

  invalidItems.forEach((item, itemIdx) => {
    const correction = correctionsList.find(c => Number(c.pairIndex) === item.pairIndex) || correctionsList[itemIdx];
    if (!correction) return;

    let targetPair = updatedPairs.find(p => p.pairIndex === item.pairIndex);
    if (!targetPair) {
      targetPair = {
        id: `pair_${productRevisionId}_${item.pairIndex}_${Date.now()}`,
        pairIndex: item.pairIndex,
        salesAngle: (correction.salesAngle || item.salesAngle || `Ângulo Comercial ${item.pairIndex}`).trim(),
        productRevisionId
      };
      updatedPairs.push(targetPair);
    }

    if (item.field === 'scene2Copy' || item.field === 'missing_pair') {
      const rawCopy = correction.scene2Copy ?? correction.scene2 ?? correction.copy ?? '';
      if (typeof rawCopy === 'string' && rawCopy.trim().length > 0) {
        targetPair.scene2Copy = rawCopy.trim();
        targetPair.characterCountScene2 = countCharacters(targetPair.scene2Copy);
        const val = validateCopyContract(targetPair.scene2Copy);
        targetPair.isValidScene2 = val.valid;
      }
    }

    if (item.field === 'scene3Cta' || item.field === 'missing_pair') {
      const rawCta = correction.scene3Cta ?? correction.scene3 ?? correction.cta ?? '';
      if (typeof rawCta === 'string' && rawCta.trim().length > 0) {
        targetPair.scene3Cta = rawCta.trim();
        targetPair.characterCountScene3 = countCharacters(targetPair.scene3Cta);
        const val = validateCopyContract(targetPair.scene3Cta);
        targetPair.isValidScene3 = val.valid && /carrinho\s+laranja/i.test(targetPair.scene3Cta);
      }
    }

    if (correction.salesAngle && typeof correction.salesAngle === 'string') {
      targetPair.salesAngle = correction.salesAngle.trim();
    }
  });

  updatedPairs.sort((a, b) => a.pairIndex - b.pairIndex);
  return updatedPairs;
}

/**
 * Builds the granular retry / correction prompt for non-compliant items using Adaptive Delta V1.
 */
export function buildGranularCorrectionPrompt(
  input: CombinedVariationsInput,
  invalidItems: NonCompliantItem[]
): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = `VOCÊ É O DIRETOR CRIATIVO E AGENTE DE COPY SÊNIOR RESPONSÁVEL PELO COMPLIANCE ESTRITO DO CONTRATO DE COPY (160–175 CARACTERES).

REGRAS INVIOLÁVEIS DO CONTRATO DE COPY:
1. EXTENSÃO ESTRITA: cada copy deve ter EXATAMENTE entre ${COPY_CONTRACT.minChars} e ${COPY_CONTRACT.maxChars} caracteres (contagem real). Ponto focal de calibração interna: ~168 caracteres.
2. PONTUAÇÃO FINAL OBRIGATÓRIA: deve terminar com ponto final, exclamação ou interrogação ('.', '!' ou '?').
3. FRASE COMPLETA: nunca truncar no meio da frase. Deve fazer sentido completo do início ao fim.
4. SEM TRUNCAMENTO MECÂNICO: proibido cortar mecanicamente. Ajuste o texto e a seleção de palavras para atingir o intervalo exato organicamente.
5. EDITAR, NÃO RECRIAR DO ZERO: preserve a ideia principal, fatos confirmados e a função da cena. Realize a MENOR edição necessária para atingir o target de caracteres.
6. CENA 2: foco estrito no benefício prático e demonstração. Zero termos comerciais, zero preços, zero comandos de câmera.
7. CENA 3: fechamento com urgência/escassez no mesmo ângulo e presença OBRIGATÓRIA da expressão "carrinho laranja". Zero invenção de preços numéricos ou promoções não confirmadas.

SUA TAREFA:
Corrija ESTRITAMENTE os itens solicitados aplicando as orientações de expansão/compressão de caracteres. Não altere itens não solicitados.
Retorne um JSON estruturado com a chave "corrections".`;

  const itemsList = invalidItems.map((item, idx) => {
    if (item.field === 'missing_pair') {
      return `Item ${idx + 1}: PAR ${item.pairIndex} (Completo)
- Ângulo Comercial: "${item.salesAngle}"
- Ação Obrigatória: Gerar Cena 2 (${COPY_CONTRACT.minChars}-${COPY_CONTRACT.maxChars} ch, benefício prático, alvo ~168 ch) e Cena 3 (${COPY_CONTRACT.minChars}-${COPY_CONTRACT.maxChars} ch, contendo "carrinho laranja", alvo ~168 ch).`;
    }

    const currentLen = item.charCount || (item.currentText ? countCharacters(item.currentText) : 0);
    const delta = calculateAdaptiveDelta(currentLen);

    if (item.field === 'scene2Copy') {
      let deltaGuidance = '';
      if (delta.direction === 'EXPAND') {
        deltaGuidance = `Comprimento atual: ${currentLen} caracteres.
Faixa válida do contrato: ${COPY_CONTRACT.minChars}–${COPY_CONTRACT.maxChars} caracteres.
Alvo de calibração: aproximadamente ${delta.targetLength} caracteres.

A copy está muito curta.
${delta.instructionText}

Instrução de Edição Mínima:
- Preservar a frase existente e expandi-la minimamente.
- Não reescrever do zero.`;
      } else if (delta.direction === 'REDUCE') {
        deltaGuidance = `Comprimento atual: ${currentLen} caracteres.
Faixa válida do contrato: ${COPY_CONTRACT.minChars}–${COPY_CONTRACT.maxChars} caracteres.
Alvo de calibração: aproximadamente ${delta.targetLength} caracteres.

A copy está muito longa.
${delta.instructionText}

Instrução de Edição Mínima:
- Preservar a frase existente e comprimi-la minimamente.
- Não reescrever do zero.`;
      } else {
        deltaGuidance = `Comprimento atual: ${currentLen} caracteres (dentro da faixa ${COPY_CONTRACT.minChars}–${COPY_CONTRACT.maxChars}).
Ajuste apenas pontuação final (. ! ?) ou complete a frase mantendo o comprimento alvo de ~${delta.targetLength} ch.
Faça a menor edição necessária. Não reescreva do zero.`;
      }

      return `Item ${idx + 1}: PAR ${item.pairIndex} — CENA 2 (Benefício/Demonstração)
- Ângulo Comercial: "${item.salesAngle}"
- Texto Anterior: "${item.currentText || ''}"
- Diagnóstico: ${item.issue}
${deltaGuidance}

Diretrizes Específicas da Cena 2:
- Preservar: Português natural (PT-BR), papel de benefício/demonstração prática da Cena 2, fatos confirmados do produto, sentido original.
- Realizar a menor edição possível. Não reescrever do zero.
- NÃO adicionar CTA nem menções comerciais.
- NÃO inventar benefícios inexistentes.
- Retornar uma única frase completa com pontuação final (. ! ?).`;
    }

    // item.field === 'scene3Cta'
    let deltaGuidance = '';
    if (delta.direction === 'EXPAND') {
      deltaGuidance = `Comprimento atual: ${currentLen} caracteres.
Faixa válida do contrato: ${COPY_CONTRACT.minChars}–${COPY_CONTRACT.maxChars} caracteres.
Alvo de calibração: aproximadamente ${delta.targetLength} caracteres.

A CTA está muito curta.
${delta.instructionText}

Instrução de Edição Mínima:
- Preservar a frase existente e expandi-la minimamente.
- Não reescrever do zero.`;
    } else if (delta.direction === 'REDUCE') {
      deltaGuidance = `Comprimento atual: ${currentLen} caracteres.
Faixa válida do contrato: ${COPY_CONTRACT.minChars}–${COPY_CONTRACT.maxChars} caracteres.
Alvo de calibração: aproximadamente ${delta.targetLength} caracteres.

A CTA está muito longa.
${delta.instructionText}

Instrução de Edição Mínima:
- Preservar a frase existente e comprimi-la minimamente.
- Não reescrever do zero.`;
    } else {
      deltaGuidance = `Comprimento atual: ${currentLen} caracteres (dentro da faixa ${COPY_CONTRACT.minChars}–${COPY_CONTRACT.maxChars}).
Ajuste a presença obrigatória de "carrinho laranja" ou pontuação final (. ! ?) mantendo o comprimento alvo de ~${delta.targetLength} ch.
Faça a menor edição necessária. Não reescreva do zero.`;
    }

    return `Item ${idx + 1}: PAR ${item.pairIndex} — CENA 3 (CTA/Fechamento)
- Ângulo Comercial: "${item.salesAngle}"
- Texto Anterior: "${item.currentText || ''}"
- Diagnóstico: ${item.issue}
${deltaGuidance}

Diretrizes Específicas da Cena 3:
- Preservar: papel de CTA/Fechamento da Cena 3, presença OBRIGATÓRIA da expressão "carrinho laranja", fatos comerciais confirmados, estrutura do texto anterior.
- Realizar a menor edição possível. Não reescrever do zero.
- NÃO inventar desconto não confirmado, estoque não confirmado, prazo não confirmado ou promoção não confirmada.
- Retornar uma única frase completa com pontuação final (. ! ?).`;
  }).join('\n\n');

  const userPrompt = `PRODUTO: ${input.productIdentity}
CATEGORIA: ${input.category || 'Geral'}

ITENS QUE DEVEM SER CORRIGIDOS COM EDIÇÃO MÍNIMA E ADAPTIVE DELTA (ALVO ~168 CH | FAIXA ${COPY_CONTRACT.minChars}-${COPY_CONTRACT.maxChars} CH):
${itemsList}

ESTRUTURA JSON EXIGIDA DE RETORNO:
{
  "corrections": [
    ${invalidItems.map(item => `{
      "pairIndex": ${item.pairIndex},
      ${item.field === 'missing_pair' || item.field === 'scene2Copy' ? `"scene2Copy": "Texto Cena 2 (${COPY_CONTRACT.minChars}-${COPY_CONTRACT.maxChars} caracteres com pontuação final)",` : ''}
      ${item.field === 'missing_pair' || item.field === 'scene3Cta' ? `"scene3Cta": "Texto Cena 3 (${COPY_CONTRACT.minChars}-${COPY_CONTRACT.maxChars} caracteres com 'carrinho laranja' e pontuação final)",` : ''}
      "salesAngle": "${item.salesAngle}"
    }`).join(',\n    ')}
  ]
}`;

  return { systemPrompt, userPrompt };
}

/**
 * Builds the initial prompt for combined Scene 2 + Scene 3 variations.
 */
export function buildCombinedVariationsPrompt(input: CombinedVariationsInput): { systemPrompt: string; userPrompt: string } {
  const {
    quantity,
    individualTarget = 'scene2',
    productIdentity,
    category = 'Geral',
    quantityDescription,
    verifiedFacts,
    visibleDetails,
    primaryBenefit
  } = input;

  const targetPairs = quantity === 1 ? 1 : quantity / 2;

  let taskDescription = '';
  let formatSpecification = '';

  if (quantity === 1) {
    if (individualTarget === 'scene2') {
      taskDescription = `Gere exatamente 1 variação de COPY para a CENA 2 (Benefício/Demonstração Prática).
NÃO gere Cena 3 nem CTA.`;
      formatSpecification = `{
  "pairs": [
    {
      "salesAngle": "Ângulo comercial principal",
      "scene2Copy": "Copy falada da Cena 2 com ${COPY_CONTRACT.minChars} a ${COPY_CONTRACT.maxChars} caracteres exatos, terminando com pontuação final válida."
    }
  ]
}`;
    } else {
      taskDescription = `Gere exatamente 1 variação de CTA para a CENA 3 (Fechamento/Chamada para Ação).
NÃO gere Cena 2 nem copy de benefício.`;
      formatSpecification = `{
  "pairs": [
    {
      "salesAngle": "Ângulo comercial de fechamento",
      "scene3Cta": "CTA falada da Cena 3 com ${COPY_CONTRACT.minChars} a ${COPY_CONTRACT.maxChars} caracteres exatos contendo 'carrinho laranja' e terminando com pontuação final válida."
    }
  ]
}`;
    }
  } else {
    taskDescription = `Gere exatamente ${targetPairs} ${targetPairs === 1 ? 'PAR' : 'PARES'} coerentes de [Cena 2 + Cena 3] (Total de ${quantity} saídas de copy).

REGRAS DE COERÊNCIA E NÃO-REPETIÇÃO:
1. Cada par deve compartilhar o MESMO ângulo comercial (ex: Praticidade diária, Durabilidade, Custo-benefício).
2. REGRA DE OURO: Same sales angle, different scene function, NO semantic repetition!
   - A Cena 2 desenvolve o benefício físico, o desejo e a demonstração prática.
   - A Cena 3 executa o fechamento com urgência/escassez e chamada para ação no carrinho laranja.
   - A Cena 3 NÃO pode papaguear ou repetir as mesmas palavras e frases ditas na Cena 2.`;

    formatSpecification = `{
  "pairs": [
    ${Array.from({ length: targetPairs }, (_, idx) => `{
      "salesAngle": "Ângulo do Par ${idx + 1} (ex: Praticidade no dia a dia)",
      "scene2Copy": "Copy falada da Cena 2 (${COPY_CONTRACT.minChars}-${COPY_CONTRACT.maxChars} caracteres com pontuação final) focada no benefício funcional.",
      "scene3Cta": "CTA falada da Cena 3 (${COPY_CONTRACT.minChars}-${COPY_CONTRACT.maxChars} caracteres com pontuação final) com 'carrinho laranja' e urgência no mesmo ângulo."
    }`).join(',\n    ')}
  ]
}`;
  }

  const systemPrompt = `VOCÊ É O DIRETOR CRIATIVO E AGENTE DE COPY SÊNIOR ESPECIALISTA EM VÍDEOS UGC DE ALTA CONVERSÃO (TIKTOK / REELS / SHORTS).

SUA MISSÃO:
${taskDescription}

DIRETRIZES ESTRITAS DA CENA 2 (BENEFÍCIO / DEMONSTRAÇÃO PRÁTICA):
- Extensão obrigatória: exatamente entre ${COPY_CONTRACT.minChars} e ${COPY_CONTRACT.maxChars} caracteres (calibre para o ponto ideal de ~168 caracteres, aproximadamente 24 a 28 palavras).
- Pontuação final obrigatória: deve terminar com ponto final, exclamação ou interrogação ('.', '!' ou '?'). Nunca truncar no meio da frase.
- Tom de voz: falado natural, brasileiro coloquial autêntico ("você", ritmo fluído de criador UGC).
- Ancoragem: baseada estritamente nos fatos físicos e visuais verificados do produto.
- PROIBIDO na Cena 2:
  * NENHUM termo comercial (preço, R$, desconto, promoção, frete grátis, cupom, compre agora, link, clique, carrinho).
  * NENHUM comando de câmera ou direção técnica (câmera, close-up, mostra, corta, zoom, enquadramento).
  * NENHUM adjetivo estético vazio sem função prática comprovada.

DIRETRIZES ESTRITAS DA CENA 3 (CTA / FECHAMENTO):
- Extensão obrigatória: exatamente entre ${COPY_CONTRACT.minChars} e ${COPY_CONTRACT.maxChars} caracteres (calibre para o ponto ideal de ~168 caracteres, aproximadamente 24 a 28 palavras).
- Pontuação final obrigatória: deve terminar com ponto final, exclamação ou interrogação ('.', '!' ou '?'). Nunca truncar no meio da frase.
- CTA DIRETA OBRIGATÓRIA: deve conter explicitamente a expressão "carrinho laranja".
- Gatilho: aversão à perda, senso de oportunidade ou urgência de compra coerente com o ângulo do par.
- PROIBIDO na Cena 3:
  * NENHUMA invenção de preços numéricos específicos ou condições de parcelamento (ex: "por apenas R$ 49", "em 12x").
  * NENHUMA alegação de prazo, estoque ou cupom que não conste nos fatos verificados.
  * NENHUM comando de câmera ou direção técnica.

SAÍDA OBRIGATÓRIA:
Retorne ESTRITAMENTE um JSON válido com a chave "pairs", sem texto adicional fora do JSON.`;

  const factsList = verifiedFacts && verifiedFacts.length > 0
    ? verifiedFacts.map((f, i) => `  ${i + 1}. ${f}`).join('\n')
    : '  - Nenhum fato específico informado (utilizar dados gerais do produto).';

  const detailsList = visibleDetails && visibleDetails.length > 0
    ? visibleDetails.map((d, i) => `  ${i + 1}. ${d}`).join('\n')
    : '  - Detalhes visuais padrão do produto.';

  const userPrompt = `DADOS DO PRODUTO:
- Nome do Produto: ${productIdentity}
- Categoria: ${category}
${quantityDescription ? `- Quantidade / Apresentação: ${quantityDescription}` : ''}
${primaryBenefit ? `- Benefício Principal Informado pelo Usuário: "${primaryBenefit}"` : ''}

FATOS FÍSICOS VERIFICADOS:
${factsList}

DETALHES VISUAIS OBSERVÁVEIS:
${detailsList}

ESTRUTURA JSON EXIGIDA:
${formatSpecification}`;

  return { systemPrompt, userPrompt };
}

/**
 * Executes generation of combined Scene 2 + Scene 3 variations with
 * strict COPY COMPLIANCE LOCK, PAIR COUNT LOCK, and GRANULAR RETRY.
 */
export async function generateCombinedSceneVariations(
  input: CombinedVariationsInput
): Promise<CombinedVariationsResult> {
  const {
    quantity,
    individualTarget = 'scene2',
    productRevisionId,
    apiKey
  } = input;

  const expectedPairCount = quantity === 1 ? 1 : quantity / 2;
  const maxAttempts = 3;
  let attempt = 0;
  let geminiCallCount = 0;
  const issues: string[] = [];
  const retryTelemetry: RetryTelemetryItem[] = [];
  const modelUsed = 'gemini-3.5-flash';

  let workingPairs: GeneratedScenePair[] = [];

  while (attempt < maxAttempts) {
    attempt++;

    if (attempt === 1) {
      // ATTEMPT 1: Initial generation
      geminiCallCount++;
      const { systemPrompt, userPrompt } = buildCombinedVariationsPrompt(input);
      let rawResponse = '';
      try {
        const apiResponse = await processGeminiAPI(
          apiKey || '',
          {
            mode: 'combined_variations_hub',
            moduleName: 'Hub Variações Cena 2 + Cena 3',
            model: modelUsed,
            require_json: true,
            generationConfig: {
              temperature: 0.7,
              topP: 0.95,
              topK: 40,
              maxOutputTokens: 2048,
              response_mime_type: 'application/json'
            },
            contents: [
              {
                parts: [
                  { text: systemPrompt },
                  { text: userPrompt }
                ]
              }
            ]
          }
        );

        rawResponse = typeof apiResponse === 'string'
          ? apiResponse
          : (apiResponse?.raw_text || apiResponse?.candidates?.[0]?.content?.parts?.[0]?.text || JSON.stringify(apiResponse));
      } catch (err: any) {
        throw new CombinedVariationsError(
          `Falha na chamada da IA para geração de variações: ${err.message || err}`,
          'GEMINI_CALL_FAILED'
        );
      }

      const parsedJson = extractJsonFromResponse(rawResponse);
      workingPairs = parseCombinedVariationsOutput(parsedJson, quantity, productRevisionId, individualTarget);
    } else {
      // ATTEMPT 2 or 3: Granular correction retry
      const itemsToFix = getNonCompliantItems(workingPairs, expectedPairCount, quantity, individualTarget);
      if (itemsToFix.length === 0 && workingPairs.length === expectedPairCount) {
        break; // All valid!
      }

      // Record pre-retry telemetry entries
      const attemptTelemetryEntries = itemsToFix.map(item => {
        const currentLen = item.charCount || (item.currentText ? countCharacters(item.currentText) : 0);
        const delta = calculateAdaptiveDelta(currentLen);
        const scene: 'Scene2' | 'Scene3' | 'Pair' = item.field === 'scene2Copy' ? 'Scene2' : item.field === 'scene3Cta' ? 'Scene3' : 'Pair';
        const entry: RetryTelemetryItem = {
          scene,
          pairIndex: item.pairIndex,
          attempt,
          beforeLength: currentLen,
          targetLength: delta.targetLength,
          direction: delta.direction,
          minDelta: delta.minDelta,
          idealDelta: delta.idealDelta,
          maxDelta: delta.maxDelta
        };
        return { item, entry };
      });

      geminiCallCount++;
      const { systemPrompt, userPrompt } = buildGranularCorrectionPrompt(input, itemsToFix);
      let rawResponse = '';
      try {
        const apiResponse = await processGeminiAPI(
          apiKey || '',
          {
            mode: 'combined_variations_hub_retry',
            moduleName: 'Hub Variações (Correção Granular)',
            model: modelUsed,
            require_json: true,
            generationConfig: {
              temperature: 0.4,
              topP: 0.95,
              topK: 40,
              maxOutputTokens: 2048,
              response_mime_type: 'application/json'
            },
            contents: [
              {
                parts: [
                  { text: systemPrompt },
                  { text: userPrompt }
                ]
              }
            ]
          }
        );

        rawResponse = typeof apiResponse === 'string'
          ? apiResponse
          : (apiResponse?.raw_text || apiResponse?.candidates?.[0]?.content?.parts?.[0]?.text || JSON.stringify(apiResponse));
      } catch (err: any) {
        issues.push(`Tentativa ${attempt}: Falha na API de correção granular: ${err.message || err}`);
        continue;
      }

      const parsedCorrectionJson = extractJsonFromResponse(rawResponse);
      workingPairs = applyGranularCorrections(workingPairs, parsedCorrectionJson, itemsToFix, productRevisionId);

      // Finalize telemetry entries for this attempt
      attemptTelemetryEntries.forEach(({ item, entry }) => {
        const pair = workingPairs.find(p => p.pairIndex === item.pairIndex);
        if (pair) {
          if (item.field === 'scene2Copy' && pair.scene2Copy) {
            entry.afterLength = pair.characterCountScene2;
            entry.valid = pair.isValidScene2;
          } else if (item.field === 'scene3Cta' && pair.scene3Cta) {
            entry.afterLength = pair.characterCountScene3;
            entry.valid = pair.isValidScene3;
          }
        }
        retryTelemetry.push(entry);
      });
    }

    // Check compliance after current attempt
    const remainingItemsToFix = getNonCompliantItems(workingPairs, expectedPairCount, quantity, individualTarget);
    if (remainingItemsToFix.length === 0 && workingPairs.length === expectedPairCount) {
      break;
    } else {
      issues.push(`Tentativa ${attempt}/${maxAttempts}: ${remainingItemsToFix.length} item(ns) fora do contrato após execução.`);
    }
  }

  // FINALIZATION GATE CHECK: Only accept if validPairs === expectedPairs and all pass validateCopyContract
  const finalItemsToFix = getNonCompliantItems(workingPairs, expectedPairCount, quantity, individualTarget);

  if (finalItemsToFix.length > 0 || workingPairs.length !== expectedPairCount) {
    const errorDetails = finalItemsToFix.map(it => `Par ${it.pairIndex} (${it.field}): ${it.issue}`).join('; ');
    throw new CombinedVariationsError(
      'Geração incompleta. Não foi possível produzir todas as copies dentro do contrato 160–175.',
      'GENERATION_INCOMPLETE',
      {
        productRevisionId,
        requestedQuantity: quantity,
        pairsCount: workingPairs.length,
        geminiCallCount,
        modelUsed,
        issues: [...issues, errorDetails],
        retryTelemetry
      }
    );
  }

  const characterCountsScene2 = workingPairs
    .map(p => p.characterCountScene2)
    .filter((c): c is number => typeof c === 'number');

  const characterCountsScene3 = workingPairs
    .map(p => p.characterCountScene3)
    .filter((c): c is number => typeof c === 'number');

  const salesAnglesUsed = workingPairs.map(p => p.salesAngle);

  return {
    quantity,
    pairs: workingPairs,
    diagnostics: {
      productRevisionId,
      requestedQuantity: quantity,
      individualTarget: quantity === 1 ? individualTarget : undefined,
      pairsCount: workingPairs.length,
      salesAnglesUsed,
      geminiCallCount,
      modelUsed,
      characterCountsScene2,
      characterCountsScene3,
      issues,
      retryTelemetry
    }
  };
}

