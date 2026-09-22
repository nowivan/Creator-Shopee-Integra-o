import { processGeminiAPI } from '../../../utils';
import { UploadedProductImage } from '../shared/types';

export interface ExecuteSpecialistParams {
    specialistId: string;
    activationPrompt: string;
    userInput: string;
    productImage?: UploadedProductImage | { dataUrl: string; name?: string } | null;
    apiKey?: string;
    temperature?: number;
    topP?: number;
    maxOutputTokens?: number;
    responseMimeType?: string;
}

/**
 * Specialist Executor
 * Executes the Specialist in ONE single model generation request containing:
 * 1. The COMPLETE and EXACT Specialist Activation Prompt (as system instruction and prompt context).
 * 2. The current user input.
 * 3. The actual product image when provided (for vision-capable models).
 *
 * Removes artificial initialization/READY cycles.
 * Never performs fallback content generation; fails visibly on error.
 */
export async function executeSpecialist(
    params: ExecuteSpecialistParams
): Promise<string> {
    const {
        specialistId,
        activationPrompt,
        userInput,
        productImage,
        apiKey = 'proxy-enabled',
        temperature = 0.7,
        topP = 0.9,
        maxOutputTokens = 3000,
        responseMimeType
    } = params;

    // 1. Validate inputs
    if (!specialistId) {
        throw new Error('[SpecialistExecutor] specialistId is required.');
    }
    if (!activationPrompt || typeof activationPrompt !== 'string' || !activationPrompt.trim()) {
        throw new Error(`[SpecialistExecutor] Exact activation prompt is required for ${specialistId}.`);
    }

    // 2. Build contents parts with exact Activation Prompt and User Input
    const parts: Array<{
        text?: string;
        inlineData?: {
            mimeType: string;
            data: string;
        };
    }> = [];

    const fullInstruction = `${activationPrompt}\n\n---\n\n${userInput || ''}`.trim();
    parts.push({ text: fullInstruction });

    // 3. Attach product image when available (base64 inlineData for visual analysis)
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

    // 4. Construct provider request
    const payload: any = {
        contents: [
            {
                role: 'user',
                parts
            }
        ],
        systemInstruction: {
            parts: [{ text: activationPrompt }]
        },
        generationConfig: {
            temperature,
            topP,
            maxOutputTokens
        }
    };

    if (responseMimeType) {
        payload.generationConfig.responseMimeType = responseMimeType;
    }

    // 5. Execute ONE generation request
    const response = await processGeminiAPI(apiKey, payload);

    // 6. Validate non-empty response
    const outputText =
        response?.raw_text ||
        response?.candidates?.[0]?.content?.parts?.[0]?.text ||
        (typeof response?.data === 'string' ? response.data : null);

    if (!outputText || !outputText.trim()) {
        throw new Error(`[SpecialistExecutor] Specialist "${specialistId}" retornou uma resposta vazia.`);
    }

    return outputText.trim();
}

/**
 * Backward compatibility wrapper class
 */
export class SpecialistSession {
    public readonly specialistName: string;
    private activationPrompt: string;
    private apiKey: string;
    private config: any;

    constructor(config: {
        specialistName: string;
        activationPrompt: string;
        apiKey?: string;
        temperature?: number;
        topP?: number;
        maxOutputTokens?: number;
        responseMimeType?: string;
    }) {
        this.specialistName = config.specialistName;
        this.activationPrompt = config.activationPrompt;
        this.apiKey = config.apiKey || 'proxy-enabled';
        this.config = config;
    }

    public async execute(userInput: string, imageDataUrl?: string | null): Promise<string> {
        return executeSpecialist({
            specialistId: this.specialistName,
            activationPrompt: this.activationPrompt,
            userInput,
            productImage: imageDataUrl ? { dataUrl: imageDataUrl } : null,
            apiKey: this.apiKey,
            temperature: this.config.temperature,
            topP: this.config.topP,
            maxOutputTokens: this.config.maxOutputTokens,
            responseMimeType: this.config.responseMimeType
        });
    }

    public destroy(): void {
        // No-op for single request execution
    }
}
