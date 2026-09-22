import { CopyVariation, UploadedProductImage } from '../shared/types';
import { executeSpecialist } from './specialistSession';
import { COPY_SPECIALIST_ACTIVATION_PROMPT } from './specialistPrompts';
import { safeJSONParse } from '../../../utils';

export interface CopySpecialistInput {
    productName: string;
    productDescription?: string;
    productImage?: UploadedProductImage | null;
    apiKey?: string;
}

/**
 * Copy Specialist:
 * Request: EXACT COPY SPECIALIST ACTIVATION PROMPT + PRODUCT IMAGE + Current Product/User Input
 * In ONE single model generation request.
 *
 * Never performs fallback content generation; fails visibly on error.
 */
export async function executeCopySpecialist(input: CopySpecialistInput): Promise<CopyVariation[]> {
    const { productName, productDescription, productImage, apiKey = 'proxy-enabled' } = input;
    const cleanProductName = productName.trim() || 'Produto';

    const userInput = `DADOS DO PRODUTO PARA ANÁLISE E GERAÇÃO:
- Nome do Produto: "${cleanProductName}"
${productDescription ? `- Detalhes/Diferenciais: "${productDescription}"` : ''}
${productImage?.name ? `- Imagem anexada: "${productImage.name}"` : ''}

Por favor, analise a imagem e as características do produto e gere EXATAMENTE 8 variações distintas de roteiro com Scene 2 Copy e Scene 3 Copy no formato JSON solicitado.`;

    const rawOutput = await executeSpecialist({
        specialistId: 'Copy Specialist',
        activationPrompt: COPY_SPECIALIST_ACTIVATION_PROMPT,
        userInput,
        productImage,
        apiKey,
        temperature: 0.7,
        topP: 0.9,
        maxOutputTokens: 3000,
        responseMimeType: 'application/json'
    });

    const data = safeJSONParse(rawOutput, null);

    let parsedVariations: any[] = [];
    if (data && Array.isArray(data.variations)) {
        parsedVariations = data.variations;
    } else if (Array.isArray(data)) {
        parsedVariations = data;
    } else if (data && typeof data === 'object') {
        for (const k of Object.keys(data)) {
            if (Array.isArray(data[k]) && data[k].length > 0) {
                parsedVariations = data[k];
                break;
            }
        }
    }

    if (!parsedVariations || parsedVariations.length === 0) {
        throw new Error('O Copy Specialist não retornou variações estruturadas válidas.');
    }

    return parsedVariations.map((v: any, idx: number) => ({
        variationId: `var_${Date.now()}_${idx + 1}`,
        versionNumber: v.versionNumber || idx + 1,
        title: v.title ? (String(v.title).startsWith('Versão') ? v.title : `Versão ${idx + 1} • ${v.title}`) : `Versão ${idx + 1}`,
        hookStyle: v.hookStyle || 'Abordagem Estratégica',
        scene2Copy: v.scene2Copy || v.scene2 || v.scene_2_copy || '',
        scene3Copy: v.scene3Copy || v.scene3 || v.scene_3_copy || ''
    }));
}
