export interface CopyVariation {
    variationId: string;
    versionNumber: number;
    title?: string;
    hookStyle?: string;
    scene2Copy: string;
    scene3Copy: string;
}

export interface UploadedProductImage {
    file?: File | null;
    dataUrl: string;
    name: string;
    size?: number;
    type?: string;
}

export type WorkflowStep = 
    | 'IDLE'
    | 'IMAGE_UPLOADED'
    | 'GENERATING_COPIES'
    | 'COPIES_GENERATED'
    | 'VARIATION_SELECTED'
    | 'PROMPTS_READY';

export type SpecialistExecutionStatus = 'idle' | 'generating' | 'success' | 'error';

export interface SavedProjectSessionData {
    projectId: string;
    productImage: string;
    variations: CopyVariation[];
    selectedVariationId: string;
    selectedScene2Copy: string;
    selectedScene3Copy: string;
    scene2Prompt: string;
    scene3Prompt: string;
    scene2Status: SpecialistExecutionStatus;
    scene3Status: SpecialistExecutionStatus;
    scene2Error?: string | null;
    scene3Error?: string | null;
    workflowState: WorkflowStep;
    savedAt: number;
}

export interface ProjectState {
    projectId: string;
    projectName: string;
    productName: string;
    productDescription?: string;
    productImage: UploadedProductImage | null;
    workflowState: WorkflowStep;
    variations: CopyVariation[];
    selectedVariation: CopyVariation | null;
    selectedVariationId: string | null;
    selectedScene2Copy: string;
    selectedScene3Copy: string;
    scene2Prompt: string;
    scene3Prompt: string;
    scene2Status: SpecialistExecutionStatus;
    scene3Status: SpecialistExecutionStatus;
    scene2Error: string | null;
    scene3Error: string | null;
    savedSessionData: SavedProjectSessionData | null;
    selectionMessage: string | null;
    error: string | null;
    createdAt: number;
    updatedAt: number;
}
