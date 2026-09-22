import { UploadedProductImage } from '../shared/types';
import { executeSpecialist } from './specialistSession';
import { CTA_SPECIALIST_ACTIVATION_PROMPT } from './specialistPrompts';

export interface CTASpecialistInput {
    productImage?: UploadedProductImage | null;
    selectedCTACopy: string;
    apiKey?: string;
}

/**
 * Validates that the generated prompt contains the supplied copy verbatim.
 */
function validateCTACopyIntegrity(output: string, expectedCopy: string): void {
    const trimmedExpected = expectedCopy.trim();
    if (!trimmedExpected) return;

    const normalizedOutput = output.replace(/\r\n/g, '\n').replace(/\s+/g, ' ');
    const normalizedExpected = trimmedExpected.replace(/\r\n/g, '\n').replace(/\s+/g, ' ');

    if (!output.includes(trimmedExpected) && !normalizedOutput.includes(normalizedExpected)) {
        throw new Error(
            `[CTA Specialist Validation Error] O Specialist gerou um prompt que não contém a copy fornecida verbatim: "${trimmedExpected}". O Specialist deve incluir o diálogo/CTA exato sem reescrever ou alterar.`
        );
    }
}

/**
 * CTA Specialist Execution:
 * Replicates the exact validated manual workflow:
 * - EXACT CTA ACTIVATION PROMPT
 * - ORIGINAL PRODUCT IMAGE
 * - COPY REPLACEMENT INSTRUCTION with verbatim selectedCTACopy (selectedScene3Copy)
 */
export async function executeCTASpecialist(input: CTASpecialistInput): Promise<string> {
    const { productImage, selectedCTACopy, apiKey = 'proxy-enabled' } = input;

    if (!selectedCTACopy || !selectedCTACopy.trim()) {
        throw new Error('[CTA Specialist] CTA copy is required.');
    }

    const userInput = `Use the following copy as the exact spoken dialogue for Scene 3.

Replace the dialogue you would normally create with this supplied copy.

Do not rewrite, improve, shorten, expand, paraphrase or modify it.

COPY:
"${selectedCTACopy.trim()}"

Build your complete Scene 3 video prompt around this exact dialogue.

Follow all rules, reasoning, visual analysis, product consistency, urgency presentation, timing, camera direction, physical interaction, audio rules and negative constraints defined by your own Specialist instructions.

Return only the final complete Scene 3 prompt.`;

    const rawOutput = await executeSpecialist({
        specialistId: 'CTA Specialist',
        activationPrompt: CTA_SPECIALIST_ACTIVATION_PROMPT,
        userInput,
        productImage,
        apiKey,
        temperature: 0.7,
        topP: 0.9,
        maxOutputTokens: 2500
    });

    if (!rawOutput || !rawOutput.trim()) {
        throw new Error('[CTA Specialist] Retornou uma resposta vazia.');
    }

    const trimmedOutput = rawOutput.trim();
    validateCTACopyIntegrity(trimmedOutput, selectedCTACopy);

    return trimmedOutput;
}
