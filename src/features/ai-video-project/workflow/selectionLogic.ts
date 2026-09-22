import { CopyVariation, ProjectState, SavedProjectSessionData } from '../shared/types';
import { saveProjectSession } from '../session/projectSession';

export interface SelectionResult {
    success: boolean;
    savedData: SavedProjectSessionData | null;
    selectedScene2Copy: string;
    selectedScene3Copy: string;
    message: string;
    error?: string;
}

/**
 * Validates, formats, and persists the selected variation into the Project Session.
 * Splits the selected variation into selectedScene2Copy and selectedScene3Copy.
 */
export function handleSelectVariation(
    variation: CopyVariation,
    currentState: ProjectState
): SelectionResult {
    if (!variation || !variation.variationId) {
        return {
            success: false,
            savedData: null,
            selectedScene2Copy: '',
            selectedScene3Copy: '',
            message: '',
            error: 'Variação inválida selecionada.'
        };
    }

    const scene2Copy = variation.scene2Copy || '';
    const scene3Copy = variation.scene3Copy || '';

    const payload: SavedProjectSessionData = {
        projectId: currentState.projectId,
        productImage: currentState.productImage?.dataUrl || '',
        variations: currentState.variations || [],
        selectedVariationId: variation.variationId,
        selectedScene2Copy: scene2Copy,
        selectedScene3Copy: scene3Copy,
        scene2Prompt: currentState.scene2Prompt || '',
        scene3Prompt: currentState.scene3Prompt || '',
        scene2Status: currentState.scene2Status || 'idle',
        scene3Status: currentState.scene3Status || 'idle',
        scene2Error: currentState.scene2Error || null,
        scene3Error: currentState.scene3Error || null,
        workflowState: 'VARIATION_SELECTED',
        savedAt: Date.now()
    };

    const isSaved = saveProjectSession(payload);

    if (!isSaved) {
        return {
            success: false,
            savedData: null,
            selectedScene2Copy: '',
            selectedScene3Copy: '',
            message: '',
            error: 'Erro ao salvar a variação na sessão do projeto.'
        };
    }

    return {
        success: true,
        savedData: payload,
        selectedScene2Copy: scene2Copy,
        selectedScene3Copy: scene3Copy,
        message: 'Variation selected successfully.'
    };
}
