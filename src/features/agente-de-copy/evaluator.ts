import { CopyEvaluationResult, CopyEvaluatorInput, SceneEvaluationItem } from './evaluatorTypes';
import { postToWorker } from '../../services/workerClient';
import { GEMINI_MODEL, API_TIMEOUT_MS, safeJSONParse } from '../../utils';

const COPY_EVALUATOR_SYSTEM_PROMPT = `Você é o COPY EVALUATOR & AUDITOR independente para roteiros de vídeos curtos de alta conversão (TikTok Shop, Shopee, Reels).

Sua ÚNICA função é AVALIAR e RANQUEAR cópias existentes.
Você NUNCA deve reescrever, melhorar, resumir, expandir ou gerar novo texto de copy.

MISSÃO:
Avaliar 6 versões geradas para CENA 2 e CENA 3 de forma 100% INDEPENDENTE.

==================================================
AVALIAÇÃO DE CENA 2 (0 a 100)
==================================================
Critérios:
- Especificidade com o produto visível na imagem e informações fornecidas
- Clareza do benefício real e resultado prático
- Geração de desejo genuíno
- Linguagem natural UGC brasileira conversacional
- Diferenciação de propaganda tradicional chata
- Potencial de retenção e conversão
- Fidelidade visual ao produto (não prometer o que o produto não é)

Penalidades severas:
- Texto genérico que serviria para qualquer produto (-15 a -30)
- Benefícios vagos ou confusos (-10 a -20)
- Repetições mecânicas e tom robótico (-15 a -25)
- Tom de anúncio institucional/comercial antigo de TV (-20 a -35)
- Promessas não suportadas pelo produto visível (-20 a -40)

==================================================
AVALIAÇÃO DE CENA 3 / CTA (0 a 100)
==================================================
Critérios:
- Força e clareza do CTA direcionando para o carrinho laranja
- Urgência e medo de perder a oportunidade (FOMO)
- Naturalidade e espontaneidade conversacional
- Percepção de condição vantajosa sem citar preço exato
- Fluidez na linguagem brasileira

Penalidades severas:
- CTA fraco, genérico ou esquecer do carrinho laranja (-20 a -40)
- Urgência forçada, robótica ou histérica (-15 a -25)
- Invenção de estoque falso ("só restam 3 unidades"), prazo inventado ou desconto inventado (-25 a -45)
- Texto duro ou artificial (-10 a -20)

==================================================
REGRA DE OURO DA COMBINAÇÃO
==================================================
CENA 2 e CENA 3 DEVEM ser ranqueadas separadamente.
A melhor CENA 2 NÃO precisa pertencer à mesma versão da melhor CENA 3.
Você deve identificar a melhor Cena 2 (recommendedScene2Id) e a melhor Cena 3 (recommendedScene3Id) de forma autônoma.

==================================================
CONTRATO DE RESPOSTA (JSON OBRIGATÓRIO)
==================================================
Retorne APENAS um objeto JSON com a seguinte estrutura:

{
  "scene2Ranking": [
    {
      "variationId": 1,
      "score": 93,
      "strengths": ["Benefício específico", "Boa conexão com o produto"],
      "warnings": []
    }
  ],
  "scene3Ranking": [
    {
      "variationId": 2,
      "score": 95,
      "strengths": ["CTA forte no carrinho laranja", "Urgência natural"],
      "warnings": []
    }
  ],
  "recommendedScene2Id": 1,
  "recommendedScene3Id": 2
}

Ordene os rankings do maior score para o menor.
Mantenha strengths e warnings concisos (máx 2 itens curtos cada).`;

/**
 * Evaluates the 6 variations of Scene 2 and Scene 3 independently.
 * Does NOT alter or generate copy text.
 */
export async function evaluateGeneratedCopies(input: CopyEvaluatorInput): Promise<CopyEvaluationResult> {
    const { variations, productImage, productTitle, productInfo, apiKey = 'proxy-enabled' } = input;

    if (!variations || variations.length === 0) {
        throw new Error('[CopyEvaluator] Nenhuma variação foi fornecida para avaliação.');
    }

    // 1. Build copies presentation text for evaluation
    const copiesPresentation = variations.map(v => `---
VERSÃO ${v.id}:

CENA 2:
${v.scene2}

CENA 3:
${v.scene3}
---`).join('\n\n');

    let userPromptText = `Avalie as seguintes ${variations.length} versões de cópias para o produto:\n\n`;
    if (productTitle?.trim()) {
        userPromptText += `Título do Produto: ${productTitle.trim()}\n`;
    }
    if (productInfo?.trim()) {
        userPromptText += `Informações adicionais: ${productInfo.trim()}\n`;
    }
    userPromptText += `\nCÓPIAS A SEREM AVALIADAS:\n\n${copiesPresentation}\n\nRetorne a avaliação estruturada em JSON seguindo rigorosamente todos os critérios de penalidade e pontuação independente.`;

    // 2. Build contents parts with visual context when available
    const parts: Array<{
        text?: string;
        inlineData?: {
            mimeType: string;
            data: string;
        };
    }> = [];

    const fullInstruction = `${COPY_EVALUATOR_SYSTEM_PROMPT}\n\n---\n\n${userPromptText}`;
    parts.push({ text: fullInstruction });

    if (productImage?.dataUrl && productImage.dataUrl.startsWith('data:image/')) {
        const matches = productImage.dataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
        if (matches) {
            parts.push({
                inlineData: {
                    mimeType: matches[1],
                    data: matches[2]
                }
            });
        }
    }

    const payload: any = {
        model: GEMINI_MODEL,
        contents: [
            {
                role: 'user',
                parts
            }
        ],
        systemInstruction: {
            parts: [{ text: COPY_EVALUATOR_SYSTEM_PROMPT }]
        },
        generationConfig: {
            temperature: 0.2, // low temperature for objective analytical consistency
            topP: 0.8,
            maxOutputTokens: 2000,
            responseMimeType: 'application/json'
        }
    };

    const response = await postToWorker<any>('/', payload, {
        timeoutMs: API_TIMEOUT_MS,
        moduleName: 'Copy Evaluator'
    });

    const rawText =
        response?.raw_text ||
        response?.candidates?.[0]?.content?.parts?.[0]?.text ||
        (typeof response?.data === 'string' ? response.data : JSON.stringify(response?.data || ''));

    if (!rawText || !rawText.trim()) {
        throw new Error('[CopyEvaluator] Resposta vazia do avaliador.');
    }

    const parsedJson = typeof response?.data === 'object' && response?.data !== null && response.data.scene2Ranking
        ? response.data
        : safeJSONParse(rawText, null);

    if (!parsedJson || !Array.isArray(parsedJson.scene2Ranking) || !Array.isArray(parsedJson.scene3Ranking)) {
        throw new Error('[CopyEvaluator] Formato de resposta JSON inválido retornado pelo avaliador.');
    }

    // Sanitize and sort rankings
    const scene2Ranking: SceneEvaluationItem[] = parsedJson.scene2Ranking
        .map((item: any) => ({
            variationId: Number(item.variationId || item.id),
            score: Math.min(100, Math.max(0, Math.round(Number(item.score) || 0))),
            strengths: Array.isArray(item.strengths) ? item.strengths.slice(0, 3) : [],
            warnings: Array.isArray(item.warnings) ? item.warnings.slice(0, 3) : []
        }))
        .sort((a: SceneEvaluationItem, b: SceneEvaluationItem) => b.score - a.score);

    const scene3Ranking: SceneEvaluationItem[] = parsedJson.scene3Ranking
        .map((item: any) => ({
            variationId: Number(item.variationId || item.id),
            score: Math.min(100, Math.max(0, Math.round(Number(item.score) || 0))),
            strengths: Array.isArray(item.strengths) ? item.strengths.slice(0, 3) : [],
            warnings: Array.isArray(item.warnings) ? item.warnings.slice(0, 3) : []
        }))
        .sort((a: SceneEvaluationItem, b: SceneEvaluationItem) => b.score - a.score);

    const recommendedScene2Id = parsedJson.recommendedScene2Id || (scene2Ranking[0]?.variationId ?? 1);
    const recommendedScene3Id = parsedJson.recommendedScene3Id || (scene3Ranking[0]?.variationId ?? 1);

    return {
        scene2Ranking,
        scene3Ranking,
        recommendedScene2Id,
        recommendedScene3Id,
        evaluatedAt: Date.now()
    };
}
