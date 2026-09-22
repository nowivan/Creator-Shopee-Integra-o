import { ProjectState } from '../shared/types';

/**
 * Creates a fresh initial project state
 */
export function createInitialProjectState(): ProjectState {
    return {
        projectId: `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        projectName: 'New AI Video Project',
        productName: '',
        productDescription: '',
        productImage: null,
        workflowState: 'IDLE',
        variations: [],
        selectedVariation: null,
        selectedVariationId: null,
        selectedScene2Copy: '',
        selectedScene3Copy: '',
        scene2Prompt: '',
        scene3Prompt: '',
        scene2Status: 'idle',
        scene3Status: 'idle',
        scene2Error: null,
        scene3Error: null,
        savedSessionData: null,
        selectionMessage: null,
        error: null,
        createdAt: Date.now(),
        updatedAt: Date.now()
    };
}
