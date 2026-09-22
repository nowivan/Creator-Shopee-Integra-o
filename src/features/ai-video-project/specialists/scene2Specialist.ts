import { UploadedProductImage } from '../shared/types';
import { executeSpecialist } from './specialistSession';
import { SCENE2_SPECIALIST_ACTIVATION_PROMPT } from './specialistPrompts';

export interface Scene2SpecialistInput {
    productImage?: UploadedProductImage | null;
    selectedScene2Copy: string;
    apiKey?: string;
}

/**
 * Validates that the generated prompt contains the supplied copy verbatim.
 */
function validateScene2CopyIntegrity(output: string, expectedCopy: string): void {
    const trimmedExpected = expectedCopy.trim();
    if (!trimmedExpected) return;

    const normalizedOutput = output.replace(/\r\n/g, '\n').replace(/\s+/g, ' ');
    const normalizedExpected = trimmedExpected.replace(/\r\n/g, '\n').replace(/\s+/g, ' ');

    if (!output.includes(trimmedExpected) && !normalizedOutput.includes(normalizedExpected)) {
        throw new Error(
            `[Scene 2 Specialist Validation Error] O Specialist gerou um prompt que não contém a copy fornecida verbatim: "${trimmedExpected}". O Specialist deve incluir o diálogo exato sem reescrever ou alterar.`
        );
    }
}

/**
 * Scene 2 Specialist Execution:
 * Replicates the exact validated manual workflow:
 * - EXACT SCENE 2 ACTIVATION PROMPT
 * - ORIGINAL PRODUCT IMAGE
 * - COPY REPLACEMENT INSTRUCTION with verbatim selectedScene2Copy
 */
export async function executeScene2Specialist(input: Scene2SpecialistInput): Promise<string> {
    const { productImage, selectedScene2Copy, apiKey = 'proxy-enabled' } = input;

    if (!selectedScene2Copy || !selectedScene2Copy.trim()) {
        throw new Error('[Scene 2 Specialist] Scene 2 copy is required.');
    }

    const userInput = `Use the following copy as the exact spoken dialogue for Scene 2.

Replace the dialogue you would normally create with this supplied copy.

Do not rewrite, improve, shorten, expand, paraphrase or modify it.

COPY:
"${selectedScene2Copy.trim()}"

Build your complete Scene 2 video prompt around this exact dialogue.

Follow all rules, reasoning, visual analysis, product consistency, timing, camera direction, physical interaction, audio rules and negative constraints defined by your own Specialist instructions.

Return only the final complete Scene 2 prompt.`;

    const rawOutput = await executeSpecialist({
        specialistId: 'Scene 2 Specialist',
        activationPrompt: SCENE2_SPECIALIST_ACTIVATION_PROMPT,
        userInput,
        productImage,
        apiKey,
        temperature: 0.7,
        topP: 0.9,
        maxOutputTokens: 2500
    });

    if (!rawOutput || !rawOutput.trim()) {
        throw new Error('[Scene 2 Specialist] Retornou uma resposta vazia.');
    }

    const trimmedOutput = rawOutput.trim();
    validateScene2CopyIntegrity(trimmedOutput, selectedScene2Copy);

    return trimmedOutput;
}
