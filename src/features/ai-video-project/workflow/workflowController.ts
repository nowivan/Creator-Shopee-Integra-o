import { CopyVariation, ProjectState, SavedProjectSessionData, UploadedProductImage } from '../shared/types';
import { createInitialProjectState } from '../session/projectState';
import { executeCopySpecialist } from '../specialists/copySpecialist';
import { executeScene2Specialist } from '../specialists/scene2Specialist';
import { executeCTASpecialist } from '../specialists/ctaSpecialist';
import { handleSelectVariation } from './selectionLogic';
import { saveProjectSession } from '../session/projectSession';

export class WorkflowController {
    private state: ProjectState;
    private listeners: Array<(state: ProjectState) => void> = [];

    constructor(initialState?: ProjectState) {
        this.state = initialState || createInitialProjectState();
    }

    public getState(): ProjectState {
        return { ...this.state };
    }

    public subscribe(listener: (state: ProjectState) => void): () => void {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private emit() {
        const stateCopy = this.getState();
        this.listeners.forEach(listener => listener(stateCopy));
    }

    private persistSession() {
        if (!this.state.projectId) return;
        const sessionData: SavedProjectSessionData = {
            projectId: this.state.projectId,
            productImage: this.state.productImage?.dataUrl || '',
            variations: this.state.variations || [],
            selectedVariationId: this.state.selectedVariationId || '',
            selectedScene2Copy: this.state.selectedScene2Copy || '',
            selectedScene3Copy: this.state.selectedScene3Copy || '',
            scene2Prompt: this.state.scene2Prompt || '',
            scene3Prompt: this.state.scene3Prompt || '',
            scene2Status: this.state.scene2Status,
            scene3Status: this.state.scene3Status,
            scene2Error: this.state.scene2Error,
            scene3Error: this.state.scene3Error,
            workflowState: this.state.workflowState,
            savedAt: Date.now()
        };
        saveProjectSession(sessionData);
        this.state.savedSessionData = sessionData;
    }

    public createNewProject(name?: string): void {
        this.state = createInitialProjectState();
        if (name) {
            this.state.projectName = name;
        }
        this.emit();
    }

    public setProductName(name: string): void {
        this.state.productName = name;
        this.state.updatedAt = Date.now();
        this.emit();
    }

    public setProductDescription(desc: string): void {
        this.state.productDescription = desc;
        this.state.updatedAt = Date.now();
        this.emit();
    }

    public setProductImage(image: UploadedProductImage | null): void {
        this.state.productImage = image;
        if (this.state.workflowState === 'IDLE' || this.state.workflowState === 'IMAGE_UPLOADED') {
            this.state.workflowState = image ? 'IMAGE_UPLOADED' : 'IDLE';
        }
        this.state.error = null;
        this.state.updatedAt = Date.now();
        this.persistSession();
        this.emit();
    }

    public async generateCopies(apiKey: string = 'proxy-enabled'): Promise<void> {
        if (!this.state.productImage && !this.state.productName) {
            this.state.error = 'Por favor, faça o upload de uma imagem do produto ou insira o nome do produto.';
            this.emit();
            return;
        }

        try {
            this.state.workflowState = 'GENERATING_COPIES';
            this.state.error = null;
            this.state.selectionMessage = null;
            this.emit();

            const variations = await executeCopySpecialist({
                productName: this.state.productName || this.state.productImage?.name?.replace(/\.[^/.]+$/, "") || 'Produto',
                productDescription: this.state.productDescription,
                productImage: this.state.productImage,
                apiKey
            });

            this.state.variations = variations;
            this.state.workflowState = 'COPIES_GENERATED';
            this.state.updatedAt = Date.now();
            this.persistSession();
            this.emit();
        } catch (err: any) {
            this.state.error = err.message || 'Falha ao executar o Copy Specialist.';
            this.state.workflowState = this.state.productImage ? 'IMAGE_UPLOADED' : 'IDLE';
            this.emit();
        }
    }

    public selectVariation(variation: CopyVariation): boolean {
        const result = handleSelectVariation(variation, this.state);

        if (!result.success) {
            this.state.error = result.error || 'Erro ao selecionar a variação.';
            this.emit();
            return false;
        }

        this.state.selectedVariation = variation;
        this.state.selectedVariationId = variation.variationId;
        this.state.selectedScene2Copy = result.selectedScene2Copy;
        this.state.selectedScene3Copy = result.selectedScene3Copy;
        this.state.savedSessionData = result.savedData;
        this.state.selectionMessage = result.message; // "Variation selected successfully."
        this.state.workflowState = (this.state.scene2Prompt && this.state.scene3Prompt) ? 'PROMPTS_READY' : 'VARIATION_SELECTED';
        this.state.error = null;
        this.state.updatedAt = Date.now();
        this.persistSession();
        this.emit();
        return true;
    }

    public setScene2Copy(copy: string): void {
        this.state.selectedScene2Copy = copy;
        this.state.updatedAt = Date.now();
        this.persistSession();
        this.emit();
    }

    public setScene3Copy(copy: string): void {
        this.state.selectedScene3Copy = copy;
        this.state.updatedAt = Date.now();
        this.persistSession();
        this.emit();
    }

    public async generateScene2(apiKey: string = 'proxy-enabled'): Promise<void> {
        if (!this.state.selectedScene2Copy || !this.state.selectedScene2Copy.trim()) {
            this.state.scene2Error = 'Nenhuma Scene 2 Copy selecionada ou informada.';
            this.state.scene2Status = 'error';
            this.emit();
            return;
        }

        try {
            this.state.scene2Status = 'generating';
            this.state.scene2Error = null;
            this.emit();

            const promptResult = await executeScene2Specialist({
                productImage: this.state.productImage,
                selectedScene2Copy: this.state.selectedScene2Copy,
                apiKey
            });

            this.state.scene2Prompt = promptResult;
            this.state.scene2Status = 'success';
            this.state.scene2Error = null;

            if (this.state.scene3Prompt && this.state.scene3Prompt.trim().length > 0) {
                this.state.workflowState = 'PROMPTS_READY';
            }

            this.state.updatedAt = Date.now();
            this.persistSession();
            this.emit();
        } catch (err: any) {
            this.state.scene2Status = 'error';
            this.state.scene2Error = err.message || 'Falha ao executar o Scene 2 Specialist.';
            this.persistSession();
            this.emit();
        }
    }

    public async generateScene3(apiKey: string = 'proxy-enabled'): Promise<void> {
        if (!this.state.selectedScene3Copy || !this.state.selectedScene3Copy.trim()) {
            this.state.scene3Error = 'Nenhuma Scene 3 Copy / CTA selecionada ou informada.';
            this.state.scene3Status = 'error';
            this.emit();
            return;
        }

        try {
            this.state.scene3Status = 'generating';
            this.state.scene3Error = null;
            this.emit();

            const promptResult = await executeCTASpecialist({
                productImage: this.state.productImage,
                selectedCTACopy: this.state.selectedScene3Copy,
                apiKey
            });

            this.state.scene3Prompt = promptResult;
            this.state.scene3Status = 'success';
            this.state.scene3Error = null;

            if (this.state.scene2Prompt && this.state.scene2Prompt.trim().length > 0) {
                this.state.workflowState = 'PROMPTS_READY';
            }

            this.state.updatedAt = Date.now();
            this.persistSession();
            this.emit();
        } catch (err: any) {
            this.state.scene3Status = 'error';
            this.state.scene3Error = err.message || 'Falha ao executar o CTA Specialist.';
            this.persistSession();
            this.emit();
        }
    }

    public reset(): void {
        this.state = createInitialProjectState();
        this.emit();
    }
}
