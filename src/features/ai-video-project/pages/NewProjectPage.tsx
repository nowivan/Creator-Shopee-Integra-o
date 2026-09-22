import React, { useState, useEffect } from 'react';
import { ProjectState, CopyVariation, UploadedProductImage } from '../shared/types';
import { WorkflowController } from '../workflow/workflowController';
import { ProductUpload } from '../components/ProductUpload';
import { VariationGrid } from '../components/VariationGrid';
import { F11ProductionStage } from '../components/F11ProductionStage';
import { LucideIcon } from '../../../components/Common';

interface NewProjectPageProps {
    currentKey?: string;
}

export const NewProjectPage: React.FC<NewProjectPageProps> = ({ currentKey = 'proxy-enabled' }) => {
    // Instantiate WorkflowController with React state subscription
    const [controller] = useState(() => new WorkflowController());
    const [state, setState] = useState<ProjectState>(() => controller.getState());

    useEffect(() => {
        const unsubscribe = controller.subscribe((newState) => {
            setState(newState);
        });
        return unsubscribe;
    }, [controller]);

    const handleImageChange = (image: UploadedProductImage | null) => {
        controller.setProductImage(image);
    };

    const handleNameChange = (name: string) => {
        controller.setProductName(name);
    };

    const handleDescriptionChange = (desc: string) => {
        controller.setProductDescription(desc);
    };

    const handleGenerateCopies = () => {
        controller.generateCopies(currentKey);
    };

    const handleSelectVariation = (variation: CopyVariation) => {
        controller.selectVariation(variation);
    };

    const handleGenerateScene2 = () => {
        controller.generateScene2(currentKey);
    };

    const handleGenerateScene3 = () => {
        controller.generateScene3(currentKey);
    };

    const handleEditScene2Copy = (copy: string) => {
        controller.setScene2Copy(copy);
    };

    const handleEditScene3Copy = (copy: string) => {
        controller.setScene3Copy(copy);
    };

    const handleNewProject = () => {
        controller.createNewProject();
    };

    const isGeneratingCopies = state.workflowState === 'GENERATING_COPIES';
    const canGenerateCopies = (state.productImage !== null || state.productName.trim().length > 0) && !isGeneratingCopies;
    const isVariationSelected = Boolean(state.selectedVariationId || state.selectedVariation || state.selectedScene2Copy);

    return (
        <div className="flex flex-col h-full bg-[#0A0A0B] text-neutral-200 overflow-y-auto custom-scrollbar">
            {/* Header */}
            <div className="border-b border-neutral-800 bg-[#0F0F11]/80 backdrop-blur-md px-6 py-4 sticky top-0 z-20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                        <LucideIcon name="video" className="w-4 h-4" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-sm font-bold font-mono tracking-wider uppercase text-white">
                                AI Video Project • F11 Production Workflow
                            </h1>
                            <span className="text-[9px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                                F11 Stage
                            </span>
                        </div>
                        <p className="text-[11px] text-neutral-500 font-mono">
                            Copy Specialist • Scene 2 Specialist • CTA Specialist
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handleNewProject}
                        className="px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-neutral-400 hover:text-white text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                        <LucideIcon name="plus" className="w-3.5 h-3.5" /> Novo Projeto
                    </button>
                </div>
            </div>

            {/* Main Content Body */}
            <div className="max-w-6xl w-full mx-auto p-6 space-y-6">
                {/* Global Error Banner */}
                {state.error && (
                    <div className="bg-red-950/40 border border-red-800/80 rounded-xl p-4 flex items-center gap-3 text-red-200 text-xs">
                        <LucideIcon name="alert-triangle" className="w-5 h-5 text-red-400 shrink-0" />
                        <span className="flex-1">{state.error}</span>
                    </div>
                )}

                {/* Section 1: Upload Product */}
                <ProductUpload
                    productImage={state.productImage}
                    productName={state.productName}
                    productDescription={state.productDescription}
                    onImageChange={handleImageChange}
                    onNameChange={handleNameChange}
                    onDescriptionChange={handleDescriptionChange}
                    disabled={isGeneratingCopies}
                />

                {/* Section 2: Action Button Generate Copies */}
                <div className="flex items-center justify-between bg-[#121214] border border-neutral-800 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-400">
                            <LucideIcon name="sparkles" className="w-4 h-4 text-amber-400" />
                        </div>
                        <div>
                            <h4 className="text-xs font-bold font-mono uppercase text-neutral-200">
                                Executar Especialista de Copy
                            </h4>
                            <p className="text-[11px] text-neutral-500">
                                Gera variações com Scene 2 Copy e Scene 3 Copy estruturadas
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleGenerateCopies}
                        disabled={!canGenerateCopies}
                        className={`px-5 py-2.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                            canGenerateCopies
                                ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/10'
                                : 'bg-neutral-800 text-neutral-600 border border-neutral-800 cursor-not-allowed opacity-60'
                        }`}
                    >
                        {isGeneratingCopies ? (
                            <>
                                <div className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                                Gerando...
                            </>
                        ) : (
                            <>
                                <LucideIcon name="zap" className="w-3.5 h-3.5" />
                                Generate Copies
                            </>
                        )}
                    </button>
                </div>

                {/* Section 3: Display Variations Grid */}
                <VariationGrid
                    variations={state.variations}
                    selectedVariationId={state.selectedVariationId || state.selectedVariation?.variationId || null}
                    onSelectVariation={handleSelectVariation}
                    isLoading={isGeneratingCopies}
                />

                {/* Section 4: Selection Feedback & Session Persistence Summary */}
                {isVariationSelected && state.selectedVariation && (
                    <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold font-mono uppercase">
                                <LucideIcon name="check-circle-2" className="w-4 h-4" />
                                <span>{state.selectionMessage || "Variation selected successfully."}</span>
                            </div>
                            <span className="text-[10px] font-mono text-neutral-500">
                                Variação ID: <span className="text-neutral-300 font-bold">{state.selectedVariationId}</span>
                            </span>
                        </div>
                    </div>
                )}

                {/* Section 5: F11 Production Stage (Revealed immediately upon selection) */}
                {isVariationSelected && (
                    <F11ProductionStage
                        productImage={state.productImage}
                        selectedScene2Copy={state.selectedScene2Copy}
                        selectedScene3Copy={state.selectedScene3Copy}
                        scene2Prompt={state.scene2Prompt}
                        scene3Prompt={state.scene3Prompt}
                        scene2Status={state.scene2Status}
                        scene3Status={state.scene3Status}
                        scene2Error={state.scene2Error}
                        scene3Error={state.scene3Error}
                        onGenerateScene2={handleGenerateScene2}
                        onGenerateScene3={handleGenerateScene3}
                        onEditScene2Copy={handleEditScene2Copy}
                        onEditScene3Copy={handleEditScene3Copy}
                    />
                )}
            </div>
        </div>
    );
};
