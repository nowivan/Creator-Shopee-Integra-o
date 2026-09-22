import React, { useState, useRef, useEffect } from 'react';
import { LucideIcon } from '../../components/Common';
import { UploadedProductImage, AgentCopyVariation, AgenteDeCopySelectedData, AgenteDeCopyDiagnostics, SingleAttemptDiagnostic, ABDiagnosticResult, SingleABTestResult, AgenteDeCopyV2Result, AgenteDeCopyV3Result } from './types';
import { CopyEvaluationResult } from './evaluatorTypes';
import { executeAgenteDeCopy } from './service';
import { evaluateGeneratedCopies } from './evaluator';
import { executeAgenteDeCopyABTest } from './abTestService';
import { executeAgenteDeCopyV2 } from './v2Service';
import { executeAgenteDeCopyV3 } from './v3Service';
import { V2HomologationSection } from './V2HomologationSection';
import { V3Section } from './V3Section';
import { V2VsV3ComparisonTable } from './V2VsV3ComparisonTable';
import { copyToClipboard } from '../../utils';

const STORAGE_KEY_SELECTION = 'robizin_agente_de_copy_selection';
const STORAGE_KEY_STATE = 'robizin_agente_de_copy_state';

interface AgenteDeCopyViewProps {
    currentKey?: string;
}

export function AgenteDeCopyView({ currentKey = 'proxy-enabled' }: AgenteDeCopyViewProps) {
    const [productImage, setProductImage] = useState<UploadedProductImage | null>(null);
    const [productTitle, setProductTitle] = useState<string>('');
    const [productPrice, setProductPrice] = useState<string>('');
    const [productInfo, setProductInfo] = useState<string>('');
    const [isGenerating, setIsGenerating] = useState<boolean>(false);
    const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
    const [variations, setVariations] = useState<AgentCopyVariation[]>([]);
    const [rawOutput, setRawOutput] = useState<string>('');
    const [evaluation, setEvaluation] = useState<CopyEvaluationResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [evalError, setEvalError] = useState<string | null>(null);

    // Development Diagnostic State
    const [diagnostics, setDiagnostics] = useState<AgenteDeCopyDiagnostics | null>(null);
    const [selectedDiagAttempt, setSelectedDiagAttempt] = useState<number>(1);
    const [copiedRaw, setCopiedRaw] = useState<boolean>(false);

    // Controlled A/B Diagnostic State (Temporary)
    const [abResult, setAbResult] = useState<ABDiagnosticResult | null>(null);
    const [isExecutingAB, setIsExecutingAB] = useState<boolean>(false);
    const [abStep, setAbStep] = useState<'idle' | 'executing_a' | 'executing_b' | 'analyzing'>('idle');
    const [abError, setAbError] = useState<string | null>(null);
    const [copiedRawA, setCopiedRawA] = useState<boolean>(false);
    const [copiedRawB, setCopiedRawB] = useState<boolean>(false);

    // Experimental Agente de Copy V2 State
    const [v2Result, setV2Result] = useState<AgenteDeCopyV2Result | null>(null);
    const [isGeneratingV2, setIsGeneratingV2] = useState<boolean>(false);
    const [v2Error, setV2Error] = useState<string | null>(null);
    const [copiedRawV2, setCopiedRawV2] = useState<boolean>(false);
    const [copiedV2SceneKey, setCopiedV2SceneKey] = useState<string | null>(null);
    const [v2ProductLabel, setV2ProductLabel] = useState<string>('Blazer jeans');

    // Experimental Agente de Copy V3 State
    const [v3Result, setV3Result] = useState<AgenteDeCopyV3Result | null>(null);
    const [isGeneratingV3, setIsGeneratingV3] = useState<boolean>(false);
    const [v3Error, setV3Error] = useState<string | null>(null);

    // Independent selection states for Scene 2 and Scene 3
    const [selectedScene2Id, setSelectedScene2Id] = useState<number | null>(null);
    const [selectedScene3Id, setSelectedScene3Id] = useState<number | null>(null);

    const [copiedKey, setCopiedKey] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState<boolean>(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Restore stored state and selection on mount
    useEffect(() => {
        try {
            const savedSelectionRaw = localStorage.getItem(STORAGE_KEY_SELECTION);
            if (savedSelectionRaw) {
                const savedSelection: AgenteDeCopySelectedData = JSON.parse(savedSelectionRaw);
                if (savedSelection.selectedScene2VariationId) {
                    setSelectedScene2Id(savedSelection.selectedScene2VariationId);
                } else if (savedSelection.selectedVariationId) {
                    setSelectedScene2Id(savedSelection.selectedVariationId);
                }

                if (savedSelection.selectedScene3VariationId) {
                    setSelectedScene3Id(savedSelection.selectedScene3VariationId);
                } else if (savedSelection.selectedVariationId) {
                    setSelectedScene3Id(savedSelection.selectedVariationId);
                }
            }

            const savedStateRaw = localStorage.getItem(STORAGE_KEY_STATE);
            if (savedStateRaw) {
                const savedState = JSON.parse(savedStateRaw);
                if (savedState.productTitle) setProductTitle(savedState.productTitle);
                if (savedState.productPrice) setProductPrice(savedState.productPrice);
                if (savedState.productInfo) setProductInfo(savedState.productInfo);
                if (savedState.variations && Array.isArray(savedState.variations) && savedState.variations.length === 6) {
                    setVariations(savedState.variations);
                }
                if (savedState.rawOutput) setRawOutput(savedState.rawOutput);
                if (savedState.evaluation) setEvaluation(savedState.evaluation);
                if (savedState.productImage) setProductImage(savedState.productImage);
            }
        } catch (e) {
            console.warn('[Agente de Copy] Could not restore saved state:', e);
        }
    }, []);

    // Save state on change
    useEffect(() => {
        try {
            const stateToSave = {
                productTitle,
                productPrice,
                productInfo,
                variations,
                rawOutput,
                evaluation,
                productImage: productImage ? {
                    name: productImage.name,
                    dataUrl: productImage.dataUrl,
                    type: productImage.type
                } : null
            };
            localStorage.setItem(STORAGE_KEY_STATE, JSON.stringify(stateToSave));
        } catch (e) {
            console.warn('[Agente de Copy] Error saving local state:', e);
        }
    }, [productTitle, productPrice, productInfo, variations, rawOutput, evaluation, productImage]);

    // Handle image file selection
    const handleFileChange = (file: File) => {
        if (!file.type.startsWith('image/')) {
            setError('Por favor selecione um arquivo de imagem válido (PNG, JPG, WEBP).');
            return;
        }

        setError(null);
        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target?.result as string;
            setProductImage({
                file,
                dataUrl,
                name: file.name,
                size: file.size,
                type: file.type
            });
        };
        reader.readAsDataURL(file);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileChange(e.dataTransfer.files[0]);
        }
    };

    // Handle Generation + Evaluator Gate
    const handleGenerate = async () => {
        if (!productImage) {
            setError('Faça o upload da imagem original do produto para iniciar.');
            return;
        }

        setError(null);
        setEvalError(null);
        setIsGenerating(true);
        setEvaluation(null);

        let validatedVariations: AgentCopyVariation[] = [];

        try {
            // Generation step with built-in validation & controlled repair
            const result = await executeAgenteDeCopy({
                productImage,
                productTitle,
                productInfo,
                apiKey: currentKey
            });

            setRawOutput(result.rawText);
            setVariations(result.variations);
            setDiagnostics(result.diagnostics);
            if (result.diagnostics.history.length > 0) {
                setSelectedDiagAttempt(result.diagnostics.history.length);
            }
            validatedVariations = result.variations;

            // Automatically set Version 1 as initial active selection so shared state has immediate CTA
            setSelectedScene2Id(1);
            setSelectedScene3Id(1);
            persistSelection(1, 1, result.variations);
        } catch (err: any) {
            console.warn('[Agente de Copy] Generation stopped:', err);
            setError(err.message || 'Não foi possível gerar as 6 versões dentro do padrão do Agente de Copy. Tente gerar novamente.');
            if (err.diagnostics) {
                setDiagnostics(err.diagnostics);
                if (err.diagnostics.history.length > 0) {
                    setSelectedDiagAttempt(err.diagnostics.history.length);
                }
            }
            setVariations([]);
            setIsGenerating(false);
            return;
        } finally {
            setIsGenerating(false);
        }

        // Evaluator Gate: runs ONLY after exactly 6 valid variations pass contract & character limits
        if (validatedVariations && validatedVariations.length === 6) {
            setIsEvaluating(true);
            try {
                const evalResult = await evaluateGeneratedCopies({
                    variations: validatedVariations,
                    productImage,
                    productTitle,
                    productInfo,
                    apiKey: currentKey
                });
                setEvaluation(evalResult);

                // Auto-advance active selection to the recommended top combination
                if (evalResult.recommendedScene2Id && evalResult.recommendedScene3Id) {
                    setSelectedScene2Id(evalResult.recommendedScene2Id);
                    setSelectedScene3Id(evalResult.recommendedScene3Id);
                    persistSelection(evalResult.recommendedScene2Id, evalResult.recommendedScene3Id, validatedVariations);
                }
            } catch (evalErr: any) {
                console.warn('[Agente de Copy] Non-blocking evaluation error:', evalErr);
                setEvalError('Não foi possível carregar a avaliação automática das cópias, mas todas as 6 versões estão prontas para seleção manual.');
                setEvaluation(null);
            } finally {
                setIsEvaluating(false);
            }
        }
    };

    // Re-run evaluation manually if needed
    const handleReevaluate = async () => {
        if (variations.length !== 6) return;
        setIsEvaluating(true);
        setEvalError(null);
        try {
            const evalResult = await evaluateGeneratedCopies({
                variations,
                productImage,
                productTitle,
                productInfo,
                apiKey: currentKey
            });
            setEvaluation(evalResult);
        } catch (evalErr: any) {
            console.warn('[Agente de Copy] Manual re-evaluation error:', evalErr);
            setEvalError('Falha ao reavaliar as cópias.');
        } finally {
            setIsEvaluating(false);
        }
    };

    // Save selection changes to localStorage
    const persistSelection = (scene2Id: number | null, scene3Id: number | null, customVariations?: AgentCopyVariation[]) => {
        const pool = (customVariations && customVariations.length > 0) ? customVariations : variations;
        if (!scene2Id && !scene3Id && (!pool || pool.length === 0)) return;

        const s2Var = pool.find(v => v.id === scene2Id);
        const s3Var = pool.find(v => v.id === scene3Id);

        const selectionData: AgenteDeCopySelectedData = {
            productImage: productImage?.dataUrl || null,
            selectedVariationId: (scene2Id && scene3Id && scene2Id === scene3Id) ? scene2Id : null,
            selectedScene2VariationId: scene2Id || 0,
            selectedScene3VariationId: scene3Id || 0,
            selectedScene2Copy: s2Var ? s2Var.scene2 : '',
            selectedScene3Copy: s3Var ? s3Var.scene3 : '',
            savedAt: Date.now()
        };

        try {
            localStorage.setItem(STORAGE_KEY_SELECTION, JSON.stringify(selectionData));
            window.dispatchEvent(new Event('storage'));
        } catch (e) {
            console.warn('[Agente de Copy] Error persisting selection:', e);
        }
    };

    // Select individual Scene 2
    const handleSelectScene2 = (id: number) => {
        const nextId = selectedScene2Id === id ? null : id;
        setSelectedScene2Id(nextId);
        persistSelection(nextId, selectedScene3Id);
    };

    // Select individual Scene 3
    const handleSelectScene3 = (id: number) => {
        const nextId = selectedScene3Id === id ? null : id;
        setSelectedScene3Id(nextId);
        persistSelection(selectedScene2Id, nextId);
    };

    // Select entire variation (both Scene 2 and Scene 3)
    const handleSelectEntireVariation = (id: number) => {
        setSelectedScene2Id(id);
        setSelectedScene3Id(id);
        persistSelection(id, id);
    };

    // Select Recommended Combination
    const handleSelectRecommendedCombination = () => {
        if (!evaluation) return;
        setSelectedScene2Id(evaluation.recommendedScene2Id);
        setSelectedScene3Id(evaluation.recommendedScene3Id);
        persistSelection(evaluation.recommendedScene2Id, evaluation.recommendedScene3Id);
    };

    const handleCopyText = async (text: string, key: string) => {
        const ok = await copyToClipboard(text);
        if (ok) {
            setCopiedKey(key);
            setTimeout(() => setCopiedKey(null), 2000);
        }
    };

    const handleCopyRawResponse = async (text: string) => {
        const ok = await copyToClipboard(text);
        if (ok) {
            setCopiedRaw(true);
            setTimeout(() => setCopiedRaw(false), 2500);
        }
    };

    const handleExecuteABTest = async () => {
        if (!productImage) {
            setError('Faça o upload da imagem original do produto para executar o Teste A/B.');
            return;
        }

        setError(null);
        setAbError(null);
        setIsExecutingAB(true);
        setAbStep('executing_a');

        try {
            const result = await executeAgenteDeCopyABTest(
                {
                    productImage,
                    productTitle,
                    productInfo,
                    apiKey: currentKey
                },
                (step) => setAbStep(step)
            );
            setAbResult(result);
        } catch (err: any) {
            console.error('[Agente de Copy A/B Test Error]', err);
            setAbError(err?.message || 'Falha na execução do Teste A/B.');
        } finally {
            setIsExecutingAB(false);
            setAbStep('idle');
        }
    };

    const handleCopyRawA = async (text: string) => {
        const ok = await copyToClipboard(text);
        if (ok) {
            setCopiedRawA(true);
            setTimeout(() => setCopiedRawA(false), 2500);
        }
    };

    const handleCopyRawB = async (text: string) => {
        const ok = await copyToClipboard(text);
        if (ok) {
            setCopiedRawB(true);
            setTimeout(() => setCopiedRawB(false), 2500);
        }
    };

    const handleGenerateV2 = async () => {
        if (!productImage) {
            setError('Faça o upload da imagem do produto para testar o Agente de Copy V2.');
            return;
        }

        setError(null);
        setV2Error(null);
        setIsGeneratingV2(true);

        try {
            const result = await executeAgenteDeCopyV2({
                productImage,
                productTitle,
                productInfo,
                apiKey: currentKey
            });
            setV2Result(result);
        } catch (err: any) {
            console.error('[Agente de Copy V2 Error]', err);
            setV2Error(err?.message || 'Falha na geração com Agente de Copy V2.');
        } finally {
            setIsGeneratingV2(false);
        }
    };

    const handleGenerateV3 = async () => {
        if (!productImage) {
            setError('Faça o upload da imagem do produto para testar o Agente de Copy V3.');
            return;
        }

        setError(null);
        setV3Error(null);
        setIsGeneratingV3(true);

        try {
            const result = await executeAgenteDeCopyV3({
                productImage,
                productTitle,
                productInfo,
                apiKey: currentKey
            }, productPrice);
            setV3Result(result);
        } catch (err: any) {
            console.error('[Agente de Copy V3 Error]', err);
            setV3Error(err?.message || 'Falha na geração com Agente de Copy V3.');
        } finally {
            setIsGeneratingV3(false);
        }
    };

    const handleCopyRawV2 = async (text: string) => {
        const ok = await copyToClipboard(text);
        if (ok) {
            setCopiedRawV2(true);
            setTimeout(() => setCopiedRawV2(false), 2500);
        }
    };

    const handleCopyV2Text = async (text: string, key: string) => {
        const ok = await copyToClipboard(text);
        if (ok) {
            setCopiedV2SceneKey(key);
            setTimeout(() => setCopiedV2SceneKey(null), 2000);
        }
    };

    const getScene2Evaluation = (variationId: number) => {
        return evaluation?.scene2Ranking.find(item => item.variationId === variationId);
    };

    const getScene3Evaluation = (variationId: number) => {
        return evaluation?.scene3Ranking.find(item => item.variationId === variationId);
    };

    const selectedS2 = variations.find(v => v.id === selectedScene2Id);
    const selectedS3 = variations.find(v => v.id === selectedScene3Id);

    const isRecommendedComboActive = evaluation &&
        selectedScene2Id === evaluation.recommendedScene2Id &&
        selectedScene3Id === evaluation.recommendedScene3Id;

    // Active diagnostic attempt data
    const activeDiag: SingleAttemptDiagnostic | undefined = diagnostics?.history.find(
        (h) => h.attemptNumber === selectedDiagAttempt
    ) || diagnostics?.currentAttempt;

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in font-sans text-neutral-200">
            {/* Header */}
            <div className="border-b border-neutral-800 pb-5">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                        <LucideIcon name="file-text" className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-neutral-100 tracking-tight flex items-center gap-2">
                            Agente de Copy
                            <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/40 text-emerald-400">
                                V1 BRAIN
                            </span>
                        </h1>
                        <p className="text-sm text-neutral-400 mt-0.5">
                            Gera exatamente 6 versões de copy para Cena 2 e Cena 3 (160–175 caracteres por cena).
                        </p>
                    </div>
                </div>
            </div>

            {/* Error Message with Retry */}
            {error && (
                <div className="bg-red-950/40 border border-red-800/60 p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-red-300 text-sm">
                    <div className="flex items-start gap-3">
                        <LucideIcon name="alert-circle" className="w-5 h-5 shrink-0 text-red-400 mt-0.5" />
                        <div>
                            <p className="font-bold text-red-200">Validação do Agente de Copy</p>
                            <p className="text-xs text-red-300 mt-0.5">{error}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={handleGenerate}
                            disabled={isGenerating || !productImage}
                            className="px-4 py-2 rounded-xl bg-red-800 hover:bg-red-700 text-white text-xs font-mono font-bold uppercase transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                            <LucideIcon name="refresh-cw" className="w-3.5 h-3.5" />
                            Tentar Novamente
                        </button>
                        <button
                            onClick={() => setError(null)}
                            className="text-red-400 hover:text-red-200 p-1.5 cursor-pointer rounded-lg bg-red-950/60"
                        >
                            <LucideIcon name="x" className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Non-blocking Evaluation Warning */}
            {evalError && (
                <div className="bg-amber-950/30 border border-amber-800/50 p-3 rounded-xl flex items-center justify-between text-amber-300 text-xs">
                    <div className="flex items-center gap-2">
                        <LucideIcon name="alert-triangle" className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>{evalError}</span>
                    </div>
                    <button
                        onClick={handleReevaluate}
                        disabled={isEvaluating}
                        className="px-2.5 py-1 bg-amber-900/40 hover:bg-amber-900/70 border border-amber-700/50 rounded text-[10px] font-mono font-bold uppercase text-amber-200 cursor-pointer"
                    >
                        {isEvaluating ? 'Avaliando...' : 'Tentar Reavaliar'}
                    </button>
                </div>
            )}

            {/* Input Section */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-[#0E0E11] border border-neutral-800 p-6 rounded-2xl">
                {/* Upload Image Column */}
                <div className="lg:col-span-5 space-y-3">
                    <label className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                        <LucideIcon name="image" className="w-4 h-4 text-emerald-400" />
                        Imagem do Produto <span className="text-red-400">*</span>
                    </label>

                    <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
                        className="hidden"
                    />

                    {productImage ? (
                        <div className="relative border border-neutral-700 bg-neutral-900/60 rounded-xl p-3 flex items-center gap-4 group">
                            <img
                                src={productImage.dataUrl}
                                alt={productImage.name}
                                className="w-20 h-20 object-cover rounded-lg border border-neutral-700 shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-neutral-200 truncate">{productImage.name}</p>
                                <p className="text-[10px] font-mono text-neutral-500 mt-1">
                                    {(productImage.size ? (productImage.size / 1024).toFixed(1) + ' KB' : 'Imagem carregada')}
                                </p>
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="mt-2 text-[11px] font-mono font-bold text-emerald-400 hover:text-emerald-300 transition underline cursor-pointer"
                                >
                                    Trocar imagem
                                </button>
                            </div>
                            <button
                                onClick={() => setProductImage(null)}
                                className="p-1.5 rounded-lg bg-neutral-800 text-neutral-400 hover:text-red-400 transition cursor-pointer"
                                title="Remover imagem"
                            >
                                <LucideIcon name="trash-2" className="w-4 h-4" />
                            </button>
                        </div>
                    ) : (
                        <div
                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center min-h-[140px] ${
                                isDragging
                                    ? 'border-emerald-500 bg-emerald-950/20'
                                    : 'border-neutral-700 hover:border-neutral-500 bg-neutral-900/40'
                            }`}
                        >
                            <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center mb-2 text-neutral-400">
                                <LucideIcon name="upload" className="w-5 h-5" />
                            </div>
                            <p className="text-xs font-bold text-neutral-300">
                                Clique para selecionar ou arraste o produto
                            </p>
                            <p className="text-[10px] text-neutral-500 mt-1">
                                PNG, JPG ou WEBP (IA fará análise visual direta)
                            </p>
                        </div>
                    )}
                </div>

                {/* Optional Metadata Column */}
                <div className="lg:col-span-7 space-y-4 flex flex-col justify-between">
                    <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5 mb-1.5">
                                    <LucideIcon name="type" className="w-3.5 h-3.5 text-neutral-400" />
                                    Título do Produto <span className="text-neutral-500 font-normal">(Opcional)</span>
                                </label>
                                <input
                                    type="text"
                                    value={productTitle}
                                    onChange={(e) => setProductTitle(e.target.value)}
                                    placeholder="Ex: Smartwatch Ultra Titanium Pro"
                                    className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3.5 py-2 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5 mb-1.5">
                                    <LucideIcon name="tag" className="w-3.5 h-3.5 text-neutral-400" />
                                    Preço do Produto <span className="text-neutral-500 font-normal">(Opcional)</span>
                                </label>
                                <input
                                    type="text"
                                    value={productPrice}
                                    onChange={(e) => setProductPrice(e.target.value)}
                                    placeholder="Ex: 49,90 ou R$ 49,90"
                                    className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3.5 py-2 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5 mb-1.5">
                                <LucideIcon name="info" className="w-3.5 h-3.5 text-neutral-400" />
                                Informações adicionais <span className="text-neutral-500 font-normal">(Opcional)</span>
                            </label>
                            <textarea
                                value={productInfo}
                                onChange={(e) => setProductInfo(e.target.value)}
                                placeholder="Ex: Resistente a água, bateria de 7 dias, acabamento fosco..."
                                rows={2}
                                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3.5 py-2 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition resize-none"
                            />
                        </div>
                    </div>

                    <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                        {isEvaluating && (
                            <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 animate-pulse">
                                <LucideIcon name="sparkles" className="w-3.5 h-3.5 animate-spin" />
                                <span>Avaliando qualidade e conversão das 6 cópias...</span>
                            </div>
                        )}
                        <div className="ml-auto flex flex-wrap items-center gap-2.5">
                            <button
                                onClick={handleGenerate}
                                disabled={isGenerating || isGeneratingV2 || isGeneratingV3 || isEvaluating || !productImage}
                                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed text-neutral-200 font-mono font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                                title="Gerar com V1 (systemInstruction)"
                            >
                                {isGenerating ? (
                                    <>
                                        <LucideIcon name="loader-2" className="w-4 h-4 animate-spin text-white" />
                                        <span>GERANDO V1...</span>
                                    </>
                                ) : (
                                    <>
                                        <LucideIcon name="file-text" className="w-4 h-4 text-neutral-400" />
                                        <span>GERAR COPIES (V1)</span>
                                    </>
                                )}
                            </button>

                            <button
                                onClick={handleGenerateV2}
                                disabled={isGenerating || isGeneratingV2 || isGeneratingV3 || isEvaluating || !productImage}
                                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-700/60 disabled:opacity-50 disabled:cursor-not-allowed text-cyan-300 font-mono font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 shadow"
                                title="Gerar com V2 (Monobloco Texto Livre)"
                            >
                                {isGeneratingV2 ? (
                                    <>
                                        <LucideIcon name="loader-2" className="w-4 h-4 animate-spin text-cyan-300" />
                                        <span>GERANDO V2...</span>
                                    </>
                                ) : (
                                    <>
                                        <LucideIcon name="zap" className="w-4 h-4 text-cyan-400" />
                                        <span>GERAR COM V2</span>
                                    </>
                                )}
                            </button>

                            <button
                                onClick={handleGenerateV3}
                                disabled={isGenerating || isGeneratingV2 || isGeneratingV3 || isEvaluating || !productImage}
                                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-mono font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 cursor-pointer active:scale-95"
                                title="Gerar com V3 JSON (Structured Output)"
                            >
                                {isGeneratingV3 ? (
                                    <>
                                        <LucideIcon name="loader-2" className="w-4 h-4 animate-spin text-white" />
                                        <span>GERANDO V3 JSON...</span>
                                    </>
                                ) : (
                                    <>
                                        <LucideIcon name="sparkles" className="w-4 h-4 text-white" />
                                        <span>GERAR COM V3 JSON</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ========================================================================= */}
            {/* CONTROLLED A/B DIAGNOSTIC TEST (TEMPORARY - DEV ONLY) */}
            {/* ========================================================================= */}
            <div className="bg-[#0B0B0E] border-2 border-purple-500/40 rounded-2xl p-6 shadow-2xl space-y-6 animate-fade-in font-mono text-xs">
                {/* A/B Test Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-purple-900/40 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 font-bold">
                            ⚖️
                        </div>
                        <div>
                            <h3 className="text-sm font-bold uppercase tracking-wider text-purple-300 flex items-center gap-2">
                                TESTE CONTROLADO A/B — ENTREGA DO CÉREBRO
                                <span className="text-[10px] bg-purple-950 text-purple-400 border border-purple-800/60 px-2 py-0.5 rounded font-extrabold">
                                    DIAGNÓSTICO
                                </span>
                            </h3>
                            <p className="text-[11px] text-neutral-400 font-sans mt-0.5">
                                Comparação direta e controlada de entrega: <strong>A (systemInstruction nativo)</strong> vs <strong>B (monobloco em contents)</strong> usando exatamente as mesmas variáveis, o mesmo cérebro e sem solicitação de reparo.
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={handleExecuteABTest}
                        disabled={isExecutingAB || isGenerating || !productImage}
                        className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-mono font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-lg shadow-purple-950/40 cursor-pointer active:scale-95 shrink-0"
                    >
                        {isExecutingAB ? (
                            <>
                                <LucideIcon name="loader-2" className="w-4 h-4 animate-spin text-white" />
                                <span>
                                    {abStep === 'executing_a' ? '[1/2] EXECUTANDO TESTE A...' : (abStep === 'executing_b' ? '[2/2] EXECUTANDO TESTE B...' : 'ANALISANDO MÉTRICAS...')}
                                </span>
                            </>
                        ) : (
                            <>
                                <LucideIcon name="play" className="w-4 h-4 text-white" />
                                <span>EXECUTAR TESTE A/B</span>
                            </>
                        )}
                    </button>
                </div>

                {/* Input Status info / Helper */}
                {!productImage && (
                    <div className="bg-neutral-900/60 border border-neutral-800 p-3.5 rounded-xl flex items-center gap-2.5 text-neutral-400 text-[11px] font-sans">
                        <LucideIcon name="info" className="w-4 h-4 text-purple-400 shrink-0" />
                        <span>Faça o upload de uma imagem do produto acima para habilitar o teste A/B comparativo.</span>
                    </div>
                )}

                {/* A/B Execution Error Banner */}
                {abError && (
                    <div className="bg-red-950/60 border border-red-800 p-4 rounded-xl flex items-start gap-3 text-red-200 text-xs">
                        <LucideIcon name="alert-triangle" className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <span className="font-bold text-red-300">Falha no Teste A/B:</span>
                            <p className="font-sans text-[11px]">{abError}</p>
                        </div>
                    </div>
                )}

                {/* Frozen Snapshot Details Badge */}
                {abResult && (
                    <div className="bg-neutral-950 border border-purple-900/40 p-3 rounded-xl flex flex-wrap items-center justify-between gap-2 text-[10px] text-neutral-400">
                        <div className="flex items-center gap-2">
                            <span className="text-purple-400 font-bold uppercase">Snapshot Congelado:</span>
                            <span>Imagem: <strong>{abResult.inputSnapshot.imageName}</strong> ({Math.round(abResult.inputSnapshot.imageSize / 1024)} KB)</span>
                            <span className="text-neutral-600">•</span>
                            <span>Modelo: <strong>{abResult.inputSnapshot.model}</strong></span>
                            <span className="text-neutral-600">•</span>
                            <span>Temp: <strong>{abResult.inputSnapshot.temperature}</strong></span>
                            <span className="text-neutral-600">•</span>
                            <span>Reparo: <strong>DESATIVADO (1ª Geração Pura)</strong></span>
                        </div>
                        <span className="text-neutral-500 font-mono">
                            Executado em: {new Date(abResult.executedAt).toLocaleTimeString()}
                        </span>
                    </div>
                )}

                {/* Side-by-Side Comparison Container */}
                {abResult && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
                        {/* ------------------------------------------------------------- */}
                        {/* COLUMN A: SYSTEM INSTRUCTION */}
                        {/* ------------------------------------------------------------- */}
                        <div className="bg-[#0D0D11] border-2 border-indigo-500/50 rounded-2xl p-5 shadow-2xl space-y-5 flex flex-col justify-between">
                            {/* Header */}
                            <div className="border-b border-indigo-900/40 pb-3 space-y-1">
                                <div className="flex items-center justify-between">
                                    <span className="px-2.5 py-1 rounded font-bold text-[11px] uppercase tracking-wider bg-indigo-950 text-indigo-300 border border-indigo-700/50">
                                        {abResult.testA.name}
                                    </span>
                                    <span className="text-[10px] text-neutral-400 font-bold">
                                        {abResult.testA.rawLength} chars
                                    </span>
                                </div>
                                <p className="text-[11px] text-neutral-400 font-sans">
                                    {abResult.testA.description}
                                </p>
                            </div>

                            {/* 1. Transporte & Execução */}
                            <div className="bg-neutral-950/90 border border-neutral-800/80 p-3.5 rounded-xl space-y-2">
                                <span className="text-[10px] text-neutral-500 uppercase font-bold block border-b border-neutral-850 pb-1">
                                    1. Transporte &amp; Execução
                                </span>
                                <div className="grid grid-cols-2 gap-2 text-[11px]">
                                    <div>
                                        <span className="text-neutral-500 block text-[9px] uppercase">Status HTTP:</span>
                                        <span className={`font-bold ${abResult.testA.httpStatus.startsWith('200') ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {abResult.testA.httpStatus}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-neutral-500 block text-[9px] uppercase">Worker Version:</span>
                                        <span className="text-neutral-200 font-bold truncate block">
                                            {abResult.testA.workerVersion || 'N/A'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-neutral-500 block text-[9px] uppercase">Requested Model:</span>
                                        <span className="text-neutral-200 truncate block">
                                            {abResult.testA.requestedModel || 'N/A'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-neutral-500 block text-[9px] uppercase">Executed Model:</span>
                                        <span className="text-indigo-300 font-bold truncate block">
                                            {abResult.testA.executedModel || 'N/A'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-neutral-500 block text-[9px] uppercase">finishReason:</span>
                                        <span className={`font-bold ${abResult.testA.finishReason === 'STOP' ? 'text-emerald-400' : 'text-amber-400'}`}>
                                            {abResult.testA.finishReason}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-neutral-500 block text-[9px] uppercase">Raw Length:</span>
                                        <span className="text-neutral-200 font-bold">
                                            {abResult.testA.rawLength} caracteres
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* 2. Extração do Parser */}
                            <div className="bg-neutral-950/90 border border-neutral-800/80 p-3.5 rounded-xl space-y-2">
                                <span className="text-[10px] text-neutral-500 uppercase font-bold block border-b border-neutral-850 pb-1">
                                    2. Extração do Parser
                                </span>
                                <div className="grid grid-cols-2 gap-2 text-[11px]">
                                    <div>
                                        <span className="text-neutral-500 block text-[9px] uppercase">Versions:</span>
                                        <span className={`font-bold ${abResult.testA.versionBlocksDetected === 6 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                            {abResult.testA.versionBlocksDetected} detectados
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-neutral-500 block text-[9px] uppercase">Scene 2:</span>
                                        <span className={`font-bold ${abResult.testA.scene2BlocksDetected === 6 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                            {abResult.testA.scene2BlocksDetected} detectados
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-neutral-500 block text-[9px] uppercase">Scene 3:</span>
                                        <span className={`font-bold ${abResult.testA.scene3BlocksDetected === 6 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                            {abResult.testA.scene3BlocksDetected} detectados
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-neutral-500 block text-[9px] uppercase">Parser Result:</span>
                                        <span className={`font-bold ${abResult.testA.parsedVariationCount === 6 ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {abResult.testA.parsedVariationCount} / 6 versões
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* 3. Validação de Contrato */}
                            <div className="bg-neutral-950/90 border border-neutral-800/80 p-3.5 rounded-xl space-y-2">
                                <div className="flex items-center justify-between border-b border-neutral-850 pb-1">
                                    <span className="text-[10px] text-neutral-500 uppercase font-bold">
                                        3. Contract Validation
                                    </span>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${abResult.testA.scenesWithinRangeCount === 12 ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50' : 'bg-amber-950 text-amber-300 border border-amber-800/50'}`}>
                                        {abResult.testA.scenesWithinRangeCount}/12 scenes within 160–175
                                    </span>
                                </div>
                                <div className="space-y-1.5 pt-1">
                                    <div className="flex items-center justify-between text-[11px]">
                                        <span className="text-neutral-400">Exatamente 6 versões:</span>
                                        <span className={`font-bold ${abResult.testA.hasExactly6Versions ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {abResult.testA.hasExactly6Versions ? 'SIM' : 'NÃO'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-[11px]">
                                        <span className="text-neutral-400">Scene 1 detectada:</span>
                                        <span className={`font-bold ${abResult.testA.violations.scene1Detected ? 'text-red-400' : 'text-emerald-400'}`}>
                                            {abResult.testA.violations.scene1Detected ? 'SIM (VIOLAÇÃO)' : 'NÃO (CORRETO)'}
                                        </span>
                                    </div>

                                    {/* Detailed breakdown per version */}
                                    <div className="pt-2 border-t border-neutral-850 space-y-1">
                                        <span className="text-[9px] text-neutral-500 uppercase font-bold block">Contagem por cena (160–175 chars):</span>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                                            {abResult.testA.validation.characterCounts.map((c) => (
                                                <div key={c.id} className="bg-black/60 p-1.5 rounded border border-neutral-850 text-[10px] space-y-0.5">
                                                    <div className="font-bold text-neutral-300">V{c.id}:</div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-neutral-400">C2: {c.scene2Length} ch</span>
                                                        <span className={c.scene2Valid ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>{c.scene2Valid ? 'OK' : 'ERR'}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-neutral-400">C3: {c.scene3Length} ch</span>
                                                        <span className={c.scene3Valid ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>{c.scene3Valid ? 'OK' : 'ERR'}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 4. Violations & Policy Check */}
                            <div className="bg-neutral-950/90 border border-neutral-800/80 p-3.5 rounded-xl space-y-2">
                                <span className="text-[10px] text-neutral-500 uppercase font-bold block border-b border-neutral-850 pb-1">
                                    4. Violations / Diretrizes Detectadas
                                </span>
                                <div className="space-y-1.5 text-[11px]">
                                    <div className="flex items-center justify-between">
                                        <span className="text-neutral-400">Price:</span>
                                        <span className={abResult.testA.violations.priceDetected ? 'text-red-400 font-bold' : 'text-emerald-400'}>
                                            {abResult.testA.violations.priceDetected ? `DETECTADO (${abResult.testA.violations.priceMatches.join(', ')})` : 'NÃO'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-neutral-400">Discount:</span>
                                        <span className={abResult.testA.violations.discountDetected ? 'text-red-400 font-bold' : 'text-emerald-400'}>
                                            {abResult.testA.violations.discountDetected ? `DETECTADO (${abResult.testA.violations.discountMatches.join(', ')})` : 'NÃO'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-neutral-400">Coupon:</span>
                                        <span className={abResult.testA.violations.couponDetected ? 'text-red-400 font-bold' : 'text-emerald-400'}>
                                            {abResult.testA.violations.couponDetected ? `DETECTADO (${abResult.testA.violations.couponMatches.join(', ')})` : 'NÃO'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-neutral-400">Installment:</span>
                                        <span className={abResult.testA.violations.installmentDetected ? 'text-red-400 font-bold' : 'text-emerald-400'}>
                                            {abResult.testA.violations.installmentDetected ? `DETECTADO (${abResult.testA.violations.installmentMatches.join(', ')})` : 'NÃO'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-neutral-400">Scene 1:</span>
                                        <span className={abResult.testA.violations.scene1Detected ? 'text-red-400 font-bold' : 'text-emerald-400'}>
                                            {abResult.testA.violations.scene1Detected ? 'DETECTADO (VIOLAÇÃO)' : 'NÃO'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-neutral-400">Preamble:</span>
                                        <span className={abResult.testA.violations.preambleDetected ? 'text-amber-400 font-bold' : 'text-emerald-400'}>
                                            {abResult.testA.violations.preambleDetected ? 'DETECTADO' : 'NÃO'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-neutral-400">Strategic headings:</span>
                                        <span className={abResult.testA.violations.strategicHeadingsDetected ? 'text-amber-400 font-bold' : 'text-emerald-400'}>
                                            {abResult.testA.violations.strategicHeadingsDetected ? `DETECTADO (${abResult.testA.violations.strategicHeadingsMatches.join(', ')})` : 'NÃO'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between pt-1 border-t border-neutral-850">
                                        <span className="text-neutral-400 font-bold">Carrinho laranja:</span>
                                        <span className={abResult.testA.violations.carrinhoLaranjaPresent ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                                            {abResult.testA.violations.carrinhoLaranjaPresent ? 'YES' : 'NO'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* 5. P0 Observability */}
                            <div className="bg-neutral-950/90 border border-neutral-800/80 p-3.5 rounded-xl space-y-2">
                                <span className="text-[10px] text-neutral-500 uppercase font-bold block border-b border-neutral-850 pb-1">
                                    5. Observabilidade P0
                                </span>
                                <div className="grid grid-cols-2 gap-2 text-[10px]">
                                    <div>
                                        <span className="text-neutral-500 block text-[9px] uppercase">Request ID:</span>
                                        <span className="text-neutral-300 truncate block">{abResult.testA.p0Metadata.requestId || 'N/A'}</span>
                                    </div>
                                    <div>
                                        <span className="text-neutral-500 block text-[9px] uppercase">Rota Proxy:</span>
                                        <span className="text-neutral-300 truncate block">{abResult.testA.p0Metadata.proxyPath || 'N/A'}</span>
                                    </div>
                                    <div>
                                        <span className="text-neutral-500 block text-[9px] uppercase">Failover:</span>
                                        <span className={abResult.testA.p0Metadata.failoverUsed ? 'text-amber-400 font-bold' : 'text-neutral-300'}>{abResult.testA.p0Metadata.failoverUsed ? 'SIM' : 'NÃO'}</span>
                                    </div>
                                    <div>
                                        <span className="text-neutral-500 block text-[9px] uppercase">Fallback Sintético:</span>
                                        <span className={abResult.testA.p0Metadata.syntheticFallbackUsed ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>{abResult.testA.p0Metadata.syntheticFallbackUsed ? 'SIM' : 'NÃO'}</span>
                                    </div>
                                    <div className="col-span-2">
                                        <span className="text-neutral-500 block text-[9px] uppercase">systemInstruction (Recebido / Forward):</span>
                                        <span className="text-neutral-300 font-mono">
                                            {abResult.testA.p0Metadata.systemInstructionReceived !== null ? (abResult.testA.p0Metadata.systemInstructionReceived ? 'SIM' : 'NÃO') : 'N/A'} / {abResult.testA.p0Metadata.systemInstructionForwarded !== null ? (abResult.testA.p0Metadata.systemInstructionForwarded ? 'SIM' : 'NÃO') : 'N/A'}
                                        </span>
                                    </div>
                                    <div className="col-span-2">
                                        <span className="text-neutral-500 block text-[9px] uppercase">Imagem Inline (Recebido / Forward):</span>
                                        <span className="text-neutral-300 font-mono">
                                            {abResult.testA.p0Metadata.inlineImageReceived !== null ? (abResult.testA.p0Metadata.inlineImageReceived ? 'SIM' : 'NÃO') : 'N/A'} / {abResult.testA.p0Metadata.inlineImageForwarded !== null ? (abResult.testA.p0Metadata.inlineImageForwarded ? 'SIM' : 'NÃO') : 'N/A'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* 6. Complete RAW Output */}
                            <div className="space-y-2 pt-2 border-t border-neutral-800">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] text-neutral-400 uppercase font-bold">
                                        RAW Output A ({abResult.testA.rawLength} chars)
                                    </label>
                                    <button
                                        onClick={() => handleCopyRawA(abResult.testA.rawText)}
                                        disabled={!abResult.testA.rawText}
                                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-[10px] font-mono font-bold uppercase transition flex items-center gap-1.5 cursor-pointer shadow"
                                    >
                                        <LucideIcon name={copiedRawA ? 'check' : 'copy'} className="w-3.5 h-3.5" />
                                        {copiedRawA ? 'COPIADO COM SUCESSO!' : 'COPIAR RAW A'}
                                    </button>
                                </div>
                                <pre className="whitespace-pre-wrap break-words font-mono text-[10px] leading-relaxed text-neutral-300 bg-black p-3.5 rounded-xl border border-neutral-800 max-h-80 overflow-y-auto select-text">
                                    {abResult.testA.rawText || '<Resposta vazia retornada>'}
                                </pre>
                            </div>
                        </div>

                        {/* ------------------------------------------------------------- */}
                        {/* COLUMN B: MONOBLOCK CONTENTS */}
                        {/* ------------------------------------------------------------- */}
                        <div className="bg-[#0D0D11] border-2 border-purple-500/50 rounded-2xl p-5 shadow-2xl space-y-5 flex flex-col justify-between">
                            {/* Header */}
                            <div className="border-b border-purple-900/40 pb-3 space-y-1">
                                <div className="flex items-center justify-between">
                                    <span className="px-2.5 py-1 rounded font-bold text-[11px] uppercase tracking-wider bg-purple-950 text-purple-300 border border-purple-700/50">
                                        {abResult.testB.name}
                                    </span>
                                    <span className="text-[10px] text-neutral-400 font-bold">
                                        {abResult.testB.rawLength} chars
                                    </span>
                                </div>
                                <p className="text-[11px] text-neutral-400 font-sans">
                                    {abResult.testB.description}
                                </p>
                            </div>

                            {/* 1. Transporte & Execução */}
                            <div className="bg-neutral-950/90 border border-neutral-800/80 p-3.5 rounded-xl space-y-2">
                                <span className="text-[10px] text-neutral-500 uppercase font-bold block border-b border-neutral-850 pb-1">
                                    1. Transporte &amp; Execução
                                </span>
                                <div className="grid grid-cols-2 gap-2 text-[11px]">
                                    <div>
                                        <span className="text-neutral-500 block text-[9px] uppercase">Status HTTP:</span>
                                        <span className={`font-bold ${abResult.testB.httpStatus.startsWith('200') ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {abResult.testB.httpStatus}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-neutral-500 block text-[9px] uppercase">Worker Version:</span>
                                        <span className="text-neutral-200 font-bold truncate block">
                                            {abResult.testB.workerVersion || 'N/A'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-neutral-500 block text-[9px] uppercase">Requested Model:</span>
                                        <span className="text-neutral-200 truncate block">
                                            {abResult.testB.requestedModel || 'N/A'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-neutral-500 block text-[9px] uppercase">Executed Model:</span>
                                        <span className="text-purple-300 font-bold truncate block">
                                            {abResult.testB.executedModel || 'N/A'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-neutral-500 block text-[9px] uppercase">finishReason:</span>
                                        <span className={`font-bold ${abResult.testB.finishReason === 'STOP' ? 'text-emerald-400' : 'text-amber-400'}`}>
                                            {abResult.testB.finishReason}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-neutral-500 block text-[9px] uppercase">Raw Length:</span>
                                        <span className="text-neutral-200 font-bold">
                                            {abResult.testB.rawLength} caracteres
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* 2. Extração do Parser */}
                            <div className="bg-neutral-950/90 border border-neutral-800/80 p-3.5 rounded-xl space-y-2">
                                <span className="text-[10px] text-neutral-500 uppercase font-bold block border-b border-neutral-850 pb-1">
                                    2. Extração do Parser
                                </span>
                                <div className="grid grid-cols-2 gap-2 text-[11px]">
                                    <div>
                                        <span className="text-neutral-500 block text-[9px] uppercase">Versions:</span>
                                        <span className={`font-bold ${abResult.testB.versionBlocksDetected === 6 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                            {abResult.testB.versionBlocksDetected} detectados
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-neutral-500 block text-[9px] uppercase">Scene 2:</span>
                                        <span className={`font-bold ${abResult.testB.scene2BlocksDetected === 6 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                            {abResult.testB.scene2BlocksDetected} detectados
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-neutral-500 block text-[9px] uppercase">Scene 3:</span>
                                        <span className={`font-bold ${abResult.testB.scene3BlocksDetected === 6 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                            {abResult.testB.scene3BlocksDetected} detectados
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-neutral-500 block text-[9px] uppercase">Parser Result:</span>
                                        <span className={`font-bold ${abResult.testB.parsedVariationCount === 6 ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {abResult.testB.parsedVariationCount} / 6 versões
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* 3. Validação de Contrato */}
                            <div className="bg-neutral-950/90 border border-neutral-800/80 p-3.5 rounded-xl space-y-2">
                                <div className="flex items-center justify-between border-b border-neutral-850 pb-1">
                                    <span className="text-[10px] text-neutral-500 uppercase font-bold">
                                        3. Contract Validation
                                    </span>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${abResult.testB.scenesWithinRangeCount === 12 ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50' : 'bg-amber-950 text-amber-300 border border-amber-800/50'}`}>
                                        {abResult.testB.scenesWithinRangeCount}/12 scenes within 160–175
                                    </span>
                                </div>
                                <div className="space-y-1.5 pt-1">
                                    <div className="flex items-center justify-between text-[11px]">
                                        <span className="text-neutral-400">Exatamente 6 versões:</span>
                                        <span className={`font-bold ${abResult.testB.hasExactly6Versions ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {abResult.testB.hasExactly6Versions ? 'SIM' : 'NÃO'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-[11px]">
                                        <span className="text-neutral-400">Scene 1 detectada:</span>
                                        <span className={`font-bold ${abResult.testB.violations.scene1Detected ? 'text-red-400' : 'text-emerald-400'}`}>
                                            {abResult.testB.violations.scene1Detected ? 'SIM (VIOLAÇÃO)' : 'NÃO (CORRETO)'}
                                        </span>
                                    </div>

                                    {/* Detailed breakdown per version */}
                                    <div className="pt-2 border-t border-neutral-850 space-y-1">
                                        <span className="text-[9px] text-neutral-500 uppercase font-bold block">Contagem por cena (160–175 chars):</span>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                                            {abResult.testB.validation.characterCounts.map((c) => (
                                                <div key={c.id} className="bg-black/60 p-1.5 rounded border border-neutral-850 text-[10px] space-y-0.5">
                                                    <div className="font-bold text-neutral-300">V{c.id}:</div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-neutral-400">C2: {c.scene2Length} ch</span>
                                                        <span className={c.scene2Valid ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>{c.scene2Valid ? 'OK' : 'ERR'}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-neutral-400">C3: {c.scene3Length} ch</span>
                                                        <span className={c.scene3Valid ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>{c.scene3Valid ? 'OK' : 'ERR'}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 4. Violations & Policy Check */}
                            <div className="bg-neutral-950/90 border border-neutral-800/80 p-3.5 rounded-xl space-y-2">
                                <span className="text-[10px] text-neutral-500 uppercase font-bold block border-b border-neutral-850 pb-1">
                                    4. Violations / Diretrizes Detectadas
                                </span>
                                <div className="space-y-1.5 text-[11px]">
                                    <div className="flex items-center justify-between">
                                        <span className="text-neutral-400">Price:</span>
                                        <span className={abResult.testB.violations.priceDetected ? 'text-red-400 font-bold' : 'text-emerald-400'}>
                                            {abResult.testB.violations.priceDetected ? `DETECTADO (${abResult.testB.violations.priceMatches.join(', ')})` : 'NÃO'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-neutral-400">Discount:</span>
                                        <span className={abResult.testB.violations.discountDetected ? 'text-red-400 font-bold' : 'text-emerald-400'}>
                                            {abResult.testB.violations.discountDetected ? `DETECTADO (${abResult.testB.violations.discountMatches.join(', ')})` : 'NÃO'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-neutral-400">Coupon:</span>
                                        <span className={abResult.testB.violations.couponDetected ? 'text-red-400 font-bold' : 'text-emerald-400'}>
                                            {abResult.testB.violations.couponDetected ? `DETECTADO (${abResult.testB.violations.couponMatches.join(', ')})` : 'NÃO'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-neutral-400">Installment:</span>
                                        <span className={abResult.testB.violations.installmentDetected ? 'text-red-400 font-bold' : 'text-emerald-400'}>
                                            {abResult.testB.violations.installmentDetected ? `DETECTADO (${abResult.testB.violations.installmentMatches.join(', ')})` : 'NÃO'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-neutral-400">Scene 1:</span>
                                        <span className={abResult.testB.violations.scene1Detected ? 'text-red-400 font-bold' : 'text-emerald-400'}>
                                            {abResult.testB.violations.scene1Detected ? 'DETECTADO (VIOLAÇÃO)' : 'NÃO'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-neutral-400">Preamble:</span>
                                        <span className={abResult.testB.violations.preambleDetected ? 'text-amber-400 font-bold' : 'text-emerald-400'}>
                                            {abResult.testB.violations.preambleDetected ? 'DETECTADO' : 'NÃO'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-neutral-400">Strategic headings:</span>
                                        <span className={abResult.testB.violations.strategicHeadingsDetected ? 'text-amber-400 font-bold' : 'text-emerald-400'}>
                                            {abResult.testB.violations.strategicHeadingsDetected ? `DETECTADO (${abResult.testB.violations.strategicHeadingsMatches.join(', ')})` : 'NÃO'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between pt-1 border-t border-neutral-850">
                                        <span className="text-neutral-400 font-bold">Carrinho laranja:</span>
                                        <span className={abResult.testB.violations.carrinhoLaranjaPresent ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                                            {abResult.testB.violations.carrinhoLaranjaPresent ? 'YES' : 'NO'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* 5. P0 Observability */}
                            <div className="bg-neutral-950/90 border border-neutral-800/80 p-3.5 rounded-xl space-y-2">
                                <span className="text-[10px] text-neutral-500 uppercase font-bold block border-b border-neutral-850 pb-1">
                                    5. Observabilidade P0
                                </span>
                                <div className="grid grid-cols-2 gap-2 text-[10px]">
                                    <div>
                                        <span className="text-neutral-500 block text-[9px] uppercase">Request ID:</span>
                                        <span className="text-neutral-300 truncate block">{abResult.testB.p0Metadata.requestId || 'N/A'}</span>
                                    </div>
                                    <div>
                                        <span className="text-neutral-500 block text-[9px] uppercase">Rota Proxy:</span>
                                        <span className="text-neutral-300 truncate block">{abResult.testB.p0Metadata.proxyPath || 'N/A'}</span>
                                    </div>
                                    <div>
                                        <span className="text-neutral-500 block text-[9px] uppercase">Failover:</span>
                                        <span className={abResult.testB.p0Metadata.failoverUsed ? 'text-amber-400 font-bold' : 'text-neutral-300'}>{abResult.testB.p0Metadata.failoverUsed ? 'SIM' : 'NÃO'}</span>
                                    </div>
                                    <div>
                                        <span className="text-neutral-500 block text-[9px] uppercase">Fallback Sintético:</span>
                                        <span className={abResult.testB.p0Metadata.syntheticFallbackUsed ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>{abResult.testB.p0Metadata.syntheticFallbackUsed ? 'SIM' : 'NÃO'}</span>
                                    </div>
                                    <div className="col-span-2">
                                        <span className="text-neutral-500 block text-[9px] uppercase">systemInstruction (Recebido / Forward):</span>
                                        <span className="text-neutral-300 font-mono">
                                            {abResult.testB.p0Metadata.systemInstructionReceived !== null ? (abResult.testB.p0Metadata.systemInstructionReceived ? 'SIM' : 'NÃO') : 'N/A'} / {abResult.testB.p0Metadata.systemInstructionForwarded !== null ? (abResult.testB.p0Metadata.systemInstructionForwarded ? 'SIM' : 'NÃO') : 'N/A'}
                                        </span>
                                    </div>
                                    <div className="col-span-2">
                                        <span className="text-neutral-500 block text-[9px] uppercase">Imagem Inline (Recebido / Forward):</span>
                                        <span className="text-neutral-300 font-mono">
                                            {abResult.testB.p0Metadata.inlineImageReceived !== null ? (abResult.testB.p0Metadata.inlineImageReceived ? 'SIM' : 'NÃO') : 'N/A'} / {abResult.testB.p0Metadata.inlineImageForwarded !== null ? (abResult.testB.p0Metadata.inlineImageForwarded ? 'SIM' : 'NÃO') : 'N/A'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* 6. Complete RAW Output */}
                            <div className="space-y-2 pt-2 border-t border-neutral-800">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] text-neutral-400 uppercase font-bold">
                                        RAW Output B ({abResult.testB.rawLength} chars)
                                    </label>
                                    <button
                                        onClick={() => handleCopyRawB(abResult.testB.rawText)}
                                        disabled={!abResult.testB.rawText}
                                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-lg text-[10px] font-mono font-bold uppercase transition flex items-center gap-1.5 cursor-pointer shadow"
                                    >
                                        <LucideIcon name={copiedRawB ? 'check' : 'copy'} className="w-3.5 h-3.5" />
                                        {copiedRawB ? 'COPIADO COM SUCESSO!' : 'COPIAR RAW B'}
                                    </button>
                                </div>
                                <pre className="whitespace-pre-wrap break-words font-mono text-[10px] leading-relaxed text-neutral-300 bg-black p-3.5 rounded-xl border border-neutral-800 max-h-80 overflow-y-auto select-text">
                                    {abResult.testB.rawText || '<Resposta vazia retornada>'}
                                </pre>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ========================================================================= */}
            {/* AGENTE DE COPY V2 — EXPERIMENTAL (COEXISTENCE WITH V1) */}
            {/* ========================================================================= */}
            <div className="bg-[#0B0B0E] border-2 border-emerald-500/40 rounded-2xl p-6 shadow-2xl space-y-6 animate-fade-in font-mono text-xs">
                {/* V2 Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-emerald-900/40 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold text-base">
                            ⚡
                        </div>
                        <div>
                            <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-2">
                                AGENTE DE COPY V2 — EXPERIMENTAL
                                <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800/60 px-2 py-0.5 rounded font-extrabold">
                                    EXPERIMENTAL V2
                                </span>
                            </h3>
                            <p className="text-[11px] text-neutral-400 font-sans mt-0.5">
                                Entrega simplificada: <strong>Cérebro Fixo + Contexto Mínimo + Imagem Multimodal</strong> via <code>contents</code> (sem <code>systemInstruction</code> e sem solicitação de reparo automático).
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={handleGenerateV2}
                        disabled={isGeneratingV2 || isGenerating || !productImage}
                        className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 cursor-pointer active:scale-95"
                    >
                        {isGeneratingV2 ? (
                            <>
                                <LucideIcon name="loader-2" className="w-4 h-4 animate-spin text-white" />
                                <span>GERANDO COM V2...</span>
                            </>
                        ) : (
                            <>
                                <LucideIcon name="zap" className="w-4 h-4 text-white" />
                                <span>GERAR COM V2</span>
                            </>
                        )}
                    </button>
                </div>

                {v2Error && (
                    <div className="p-4 bg-red-950/40 border border-red-800/60 rounded-xl text-red-300 flex items-start gap-3">
                        <LucideIcon name="alert-circle" className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                        <div>
                            <span className="font-bold block uppercase text-red-200">Falha na Execução do Agente V2</span>
                            <span className="text-xs">{v2Error}</span>
                        </div>
                    </div>
                )}

                {/* V2 Results View */}
                {v2Result && (
                    <div className="space-y-6 pt-2">
                        {/* Summary Badges Banner */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            {/* Card 1: Status & Transport */}
                            <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-3.5 space-y-1">
                                <span className="text-[10px] text-neutral-500 uppercase font-bold block">Status & Modelo</span>
                                <div className="flex items-center justify-between">
                                    <span className="text-emerald-400 font-bold">{v2Result.httpStatus}</span>
                                    <span className="text-[10px] text-cyan-400 font-mono">{v2Result.executedModel || 'gemini-3.5-flash'}</span>
                                </div>
                                <span className="text-[10px] text-neutral-400 block font-mono">
                                    {v2Result.rawLength} caracteres | {v2Result.finishReason}
                                </span>
                            </div>

                            {/* Card 2: Structural Validity */}
                            <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-3.5 space-y-1">
                                <span className="text-[10px] text-neutral-500 uppercase font-bold block">Estrutura de Versões</span>
                                <div className="flex items-center justify-between">
                                    <span className={`font-bold ${v2Result.structure.isStructurallyComplete ? 'text-emerald-400' : 'text-amber-400'}`}>
                                        {v2Result.structure.versionsDetected}/6 Versões
                                    </span>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-extrabold ${
                                        v2Result.structure.isStructurallyComplete
                                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                                            : 'bg-amber-950 text-amber-400 border border-amber-800/60'
                                    }`}>
                                        {v2Result.structure.isStructurallyComplete ? 'ESTRUTURA COMPLETA' : 'INCOMPLETA'}
                                    </span>
                                </div>
                                <span className="text-[10px] text-neutral-400 block font-mono">
                                    C2: {v2Result.structure.scene2Detected}/6 | C3: {v2Result.structure.scene3Detected}/6 | C1: {v2Result.structure.scene1Detected ? 'SIM (VIOLAÇÃO)' : 'NÃO'}
                                </span>
                            </div>

                            {/* Card 3: Character Compliance */}
                            <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-3.5 space-y-1">
                                <span className="text-[10px] text-neutral-500 uppercase font-bold block">Conformidade de Caracteres</span>
                                <div className="flex items-center justify-between">
                                    <span className={`font-bold ${v2Result.characterCompliance.compliantCount === 12 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                        {v2Result.characterCompliance.compliantCount} / 12 Cenas
                                    </span>
                                    <span className="text-[10px] text-neutral-400">160–175 chars</span>
                                </div>
                                <span className="text-[10px] text-neutral-400 block">
                                    {v2Result.characterCompliance.isStrictRangeMet ? '100% no range estrito' : 'Variações menores detectadas'}
                                </span>
                            </div>

                            {/* Card 4: Violations Summary */}
                            <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-3.5 space-y-1">
                                <span className="text-[10px] text-neutral-500 uppercase font-bold block">Diretrizes & CTA</span>
                                <div className="flex items-center justify-between">
                                    <span className="text-neutral-300">Carrinho Laranja:</span>
                                    <span className={v2Result.violations.carrinhoLaranjaPresent ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                                        {v2Result.violations.carrinhoLaranjaPresent ? 'SIM' : 'NÃO'}
                                    </span>
                                </div>
                                <span className="text-[10px] text-neutral-400 block truncate">
                                    Preço: {v2Result.violations.priceDetected ? 'SIM (VIOL.)' : 'NÃO'} | Desc: {v2Result.violations.discountDetected ? 'SIM' : 'NÃO'}
                                </span>
                            </div>
                        </div>

                        {/* ========================================================================= */}
                        {/* DIAGNÓSTICO DE TRUNCAMENTO V2 */}
                        {/* ========================================================================= */}
                        {v2Result.truncationDiag && (
                            <div className="bg-neutral-950 p-4 rounded-xl border border-cyan-500/40 space-y-4 font-mono text-xs shadow-lg">
                                <div className="flex items-center justify-between border-b border-cyan-900/40 pb-2">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-2">
                                        <LucideIcon name="activity" className="w-4 h-4 text-cyan-400" />
                                        DIAGNÓSTICO DE TRUNCAMENTO V2
                                        <span className="text-[9px] bg-cyan-950 text-cyan-400 border border-cyan-800/60 px-2 py-0.5 rounded font-extrabold">
                                            PIPELINE AUDIT
                                        </span>
                                    </h4>
                                    <span className="text-[10px] text-neutral-400">
                                        L0 → L6 Rastreamento de Comprimento
                                    </span>
                                </div>

                                {/* Pipeline Parameters Grid */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                                    <div className="bg-neutral-900/90 p-2.5 rounded border border-neutral-800">
                                        <span className="text-neutral-500 block uppercase font-bold text-[9px]">MODEL:</span>
                                        <span className="text-cyan-300 font-bold">{v2Result.truncationDiag.model}</span>
                                    </div>
                                    <div className="bg-neutral-900/90 p-2.5 rounded border border-neutral-800">
                                        <span className="text-neutral-500 block uppercase font-bold text-[9px]">MAX OUTPUT TOKENS REQUESTED:</span>
                                        <span className="text-neutral-200 font-bold">{v2Result.truncationDiag.maxOutputTokensRequested}</span>
                                    </div>
                                    <div className="bg-neutral-900/90 p-2.5 rounded border border-neutral-800">
                                        <span className="text-neutral-500 block uppercase font-bold text-[9px]">MAX OUTPUT TOKENS AT WORKER:</span>
                                        <span className="text-neutral-200 font-bold">{v2Result.truncationDiag.maxOutputTokensAtWorker ?? 'N/D'}</span>
                                    </div>
                                    <div className="bg-neutral-900/90 p-2.5 rounded border border-neutral-800">
                                        <span className="text-neutral-500 block uppercase font-bold text-[9px]">GEMINI HTTP:</span>
                                        <span className="text-emerald-400 font-bold">{v2Result.truncationDiag.geminiHttpStatus}</span>
                                    </div>
                                    <div className="bg-neutral-900/90 p-2.5 rounded border border-neutral-800">
                                        <span className="text-neutral-500 block uppercase font-bold text-[9px]">GEMINI FINISH REASON:</span>
                                        <span className={`font-bold ${v2Result.truncationDiag.geminiFinishReason === 'STOP' ? 'text-emerald-400' : 'text-amber-400'}`}>
                                            {v2Result.truncationDiag.geminiFinishReason}
                                        </span>
                                    </div>
                                    <div className="bg-neutral-900/90 p-2.5 rounded border border-neutral-800">
                                        <span className="text-neutral-500 block uppercase font-bold text-[9px]">CANDIDATE COUNT:</span>
                                        <span className="text-neutral-200 font-bold">{v2Result.truncationDiag.candidateCount}</span>
                                    </div>
                                    <div className="bg-neutral-900/90 p-2.5 rounded border border-neutral-800">
                                        <span className="text-neutral-500 block uppercase font-bold text-[9px]">CANDIDATE PARTS:</span>
                                        <span className="text-neutral-200 font-bold">{v2Result.truncationDiag.candidatePartsCount} parte(s)</span>
                                    </div>
                                    <div className="bg-neutral-900/90 p-2.5 rounded border border-neutral-800">
                                        <span className="text-neutral-500 block uppercase font-bold text-[9px]">OUTPUT TOKEN COUNT:</span>
                                        <span className="text-neutral-200 font-bold">{v2Result.truncationDiag.outputTokenCount ?? 'N/D'}</span>
                                    </div>
                                </div>

                                {/* Numeric Checkpoints L0 -> L6 */}
                                <div className="bg-neutral-900/80 p-3 rounded-lg border border-neutral-800 space-y-2">
                                    <span className="text-[10px] text-neutral-400 block font-bold uppercase">
                                        CHECKPOINTS NUMÉRICOS DE COMPRIMENTO (L0 → L6):
                                    </span>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-1.5 text-center text-[10px]">
                                        <div className="bg-black/80 p-2 rounded border border-neutral-800">
                                            <span className="text-[9px] text-neutral-500 block">L0 Gemini</span>
                                            <span className="font-bold text-cyan-400 text-xs">{v2Result.truncationDiag.checkpoints.L0_geminiCandidate}</span>
                                        </div>
                                        <div className="bg-black/80 p-2 rounded border border-neutral-800">
                                            <span className="text-[9px] text-neutral-500 block">L1 Worker</span>
                                            <span className="font-bold text-cyan-400 text-xs">{v2Result.truncationDiag.checkpoints.L1_worker}</span>
                                        </div>
                                        <div className="bg-black/80 p-2 rounded border border-neutral-800">
                                            <span className="text-[9px] text-neutral-500 block">L2 Server Rec.</span>
                                            <span className="font-bold text-cyan-400 text-xs">{v2Result.truncationDiag.checkpoints.L2_serverReceived}</span>
                                        </div>
                                        <div className="bg-black/80 p-2 rounded border border-neutral-800">
                                            <span className="text-[9px] text-neutral-500 block">L3 /api/proxy</span>
                                            <span className="font-bold text-cyan-400 text-xs">{v2Result.truncationDiag.checkpoints.L3_apiProxy}</span>
                                        </div>
                                        <div className="bg-black/80 p-2 rounded border border-neutral-800">
                                            <span className="text-[9px] text-neutral-500 block">L4 postToWorker</span>
                                            <span className="font-bold text-cyan-400 text-xs">{v2Result.truncationDiag.checkpoints.L4_postToWorker}</span>
                                        </div>
                                        <div className="bg-black/80 p-2 rounded border border-neutral-800">
                                            <span className="text-[9px] text-neutral-500 block">L5 V2 rawText</span>
                                            <span className="font-bold text-cyan-400 text-xs">{v2Result.truncationDiag.checkpoints.L5_v2RawText}</span>
                                        </div>
                                        <div className="bg-black/80 p-2 rounded border border-neutral-800">
                                            <span className="text-[9px] text-neutral-500 block">L6 Parser Input</span>
                                            <span className="font-bold text-cyan-400 text-xs">{v2Result.truncationDiag.checkpoints.L6_parserInput}</span>
                                        </div>
                                    </div>
                                    <div className="text-center pt-1 text-[11px] font-mono text-neutral-300">
                                        Pipeline Chain: {v2Result.truncationDiag.checkpoints.L0_geminiCandidate} → {v2Result.truncationDiag.checkpoints.L1_worker} → {v2Result.truncationDiag.checkpoints.L2_serverReceived} → {v2Result.truncationDiag.checkpoints.L3_apiProxy} → {v2Result.truncationDiag.checkpoints.L4_postToWorker} → {v2Result.truncationDiag.checkpoints.L5_v2RawText} → {v2Result.truncationDiag.checkpoints.L6_parserInput}
                                    </div>
                                </div>

                                {/* Truncation Location Banner */}
                                <div className="bg-neutral-900 p-3 rounded-lg border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <span className="text-[10px] text-neutral-400 uppercase font-bold">TRUNCATION LOCATION:</span>
                                    <span className="text-xs font-bold text-amber-300 bg-amber-950/60 px-3 py-1 rounded border border-amber-800/40">
                                        {v2Result.truncationDiag.truncationLocation}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Detailed Metrics Tabs / Grids */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Left: Audit & Violations */}
                            <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-3">
                                <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider block border-b border-neutral-800 pb-1.5">
                                    Auditoria Factual de Diretrizes (V2)
                                </span>
                                <div className="grid grid-cols-2 gap-2 text-[10px]">
                                    <div className="flex justify-between items-center bg-neutral-900/70 p-2 rounded border border-neutral-850">
                                        <span className="text-neutral-400">Preço Explícito:</span>
                                        <span className={v2Result.violations.priceDetected ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
                                            {v2Result.violations.priceDetected ? `SIM (${v2Result.violations.priceMatches.slice(0, 2).join(', ')})` : 'NÃO'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center bg-neutral-900/70 p-2 rounded border border-neutral-850">
                                        <span className="text-neutral-400">Promessa Desconto:</span>
                                        <span className={v2Result.violations.discountDetected ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
                                            {v2Result.violations.discountDetected ? `SIM (${v2Result.violations.discountMatches.slice(0, 2).join(', ')})` : 'NÃO'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center bg-neutral-900/70 p-2 rounded border border-neutral-850">
                                        <span className="text-neutral-400">Cupom de Desconto:</span>
                                        <span className={v2Result.violations.couponDetected ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
                                            {v2Result.violations.couponDetected ? `SIM (${v2Result.violations.couponMatches.slice(0, 2).join(', ')})` : 'NÃO'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center bg-neutral-900/70 p-2 rounded border border-neutral-850">
                                        <span className="text-neutral-400">Parcelamento/Pagamento:</span>
                                        <span className={v2Result.violations.installmentDetected ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
                                            {v2Result.violations.installmentDetected ? `SIM (${v2Result.violations.installmentMatches.slice(0, 2).join(', ')})` : 'NÃO'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center bg-neutral-900/70 p-2 rounded border border-neutral-850">
                                        <span className="text-neutral-400">Cena 1 (Proibida):</span>
                                        <span className={v2Result.violations.scene1Detected ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
                                            {v2Result.violations.scene1Detected ? 'SIM (DETECTADA)' : 'NÃO'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center bg-neutral-900/70 p-2 rounded border border-neutral-850">
                                        <span className="text-neutral-400">Preâmbulo Explicativo:</span>
                                        <span className={v2Result.violations.preambleDetected ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
                                            {v2Result.violations.preambleDetected ? 'SIM (DETECTADO)' : 'NÃO'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center bg-neutral-900/70 p-2 rounded border border-neutral-850">
                                        <span className="text-neutral-400">Headings Estratégicos:</span>
                                        <span className={v2Result.violations.strategicHeadingsDetected ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
                                            {v2Result.violations.strategicHeadingsDetected ? 'SIM (DETECTADOS)' : 'NÃO'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center bg-neutral-900/70 p-2 rounded border border-neutral-850">
                                        <span className="text-neutral-400">Carrinho Laranja (CTA):</span>
                                        <span className={v2Result.violations.carrinhoLaranjaPresent ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                                            {v2Result.violations.carrinhoLaranjaPresent ? 'SIM' : 'NÃO'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Right: Character Count Audit Breakdown */}
                            <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-3">
                                <div className="flex items-center justify-between border-b border-neutral-800 pb-1.5">
                                    <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider block">
                                        Contrato de Caracteres por Cena (160–175)
                                    </span>
                                    <span className="text-[10px] text-neutral-500">
                                        {v2Result.characterCompliance.compliantCount}/12 OK
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-[10px]">
                                    {v2Result.characterCompliance.counts.map(c => (
                                        <div key={c.id} className="bg-neutral-900/80 p-2 rounded border border-neutral-850 flex items-center justify-between">
                                            <span className="font-bold text-neutral-300">VERSÃO {c.id}:</span>
                                            <div className="flex items-center gap-2">
                                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono ${
                                                    c.scene2Valid ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60' : 'bg-amber-950 text-amber-400 border border-amber-800/60'
                                                }`}>
                                                    C2: {c.scene2Length} ch
                                                </span>
                                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono ${
                                                    c.scene3Valid ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60' : 'bg-amber-950 text-amber-400 border border-amber-800/60'
                                                }`}>
                                                    C3: {c.scene3Length} ch
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-[10px] text-neutral-500 italic mt-1 font-sans">
                                    * Nota diagnóstica: Pequenas variações de caracteres não ocultam nem invalidam as cópias completas geradas pelo modelo.
                                </p>
                            </div>
                        </div>

                        {/* All 6 Parsed Variations Cards */}
                        {v2Result.variations.length > 0 && (
                            <div className="space-y-4 pt-2">
                                <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                                    <h4 className="text-xs font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-2">
                                        <LucideIcon name="file-text" className="w-4 h-4 text-emerald-400" />
                                        As 6 Versões Extraídas do Agente V2 ({v2Result.variations.length} variações)
                                    </h4>
                                    <span className="text-[10px] text-neutral-400">
                                        Parser padrão <code>parseAgenteDeCopyOutput</code>
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {v2Result.variations.map((v) => {
                                        const s2Len = v.scene2.length;
                                        const s3Len = v.scene3.length;
                                        const s2Valid = s2Len >= 160 && s2Len <= 175;
                                        const s3Valid = s3Len >= 160 && s3Len <= 175;

                                        return (
                                            <div
                                                key={v.id}
                                                className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-3 flex flex-col justify-between hover:border-emerald-500/40 transition shadow-md"
                                            >
                                                <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                                                    <span className="font-bold text-neutral-200 text-xs tracking-wider flex items-center gap-1.5">
                                                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                                        VERSÃO {v.id}
                                                    </span>
                                                    <button
                                                        onClick={() => handleCopyV2Text(`VERSÃO ${v.id}\n\nCENA 2:\n${v.scene2}\n\nCENA 3:\n${v.scene3}`, `v2_full_${v.id}`)}
                                                        className="text-[10px] px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition flex items-center gap-1 cursor-pointer"
                                                    >
                                                        <LucideIcon name="copy" className="w-3 h-3" />
                                                        <span>{copiedV2SceneKey === `v2_full_${v.id}` ? 'COPIADO' : 'COPIAR V' + v.id}</span>
                                                    </button>
                                                </div>

                                                {/* Scene 2 Box */}
                                                <div className="space-y-1.5 bg-neutral-950 p-3 rounded-lg border border-neutral-850">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[10px] font-bold text-indigo-400 uppercase">
                                                            CENA 2 (Gancho & Contexto)
                                                        </span>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                                                                s2Valid ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60' : 'bg-amber-950 text-amber-400 border border-amber-800/60'
                                                            }`}>
                                                                {s2Len} ch
                                                            </span>
                                                            <button
                                                                onClick={() => handleCopyV2Text(v.scene2, `v2_s2_${v.id}`)}
                                                                className="text-[9px] text-neutral-400 hover:text-white transition cursor-pointer"
                                                                title="Copiar Cena 2"
                                                            >
                                                                <LucideIcon name="copy" className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <p className="text-[11px] text-neutral-200 leading-relaxed font-sans select-text">
                                                        {v.scene2}
                                                    </p>
                                                </div>

                                                {/* Scene 3 Box */}
                                                <div className="space-y-1.5 bg-neutral-950 p-3 rounded-lg border border-neutral-850">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[10px] font-bold text-amber-400 uppercase">
                                                            CENA 3 (Apresentação & CTA)
                                                        </span>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                                                                s3Valid ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60' : 'bg-amber-950 text-amber-400 border border-amber-800/60'
                                                            }`}>
                                                                {s3Len} ch
                                                            </span>
                                                            <button
                                                                onClick={() => handleCopyV2Text(v.scene3, `v2_s3_${v.id}`)}
                                                                className="text-[9px] text-neutral-400 hover:text-white transition cursor-pointer"
                                                                title="Copiar Cena 3"
                                                            >
                                                                <LucideIcon name="copy" className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <p className="text-[11px] text-neutral-200 leading-relaxed font-sans select-text">
                                                        {v.scene3}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* ========================================================================= */}
                        {/* PAINEL DE HOMOLOGAÇÃO MANUAL MULTIPRODUTOS V2 */}
                        {/* ========================================================================= */}
                        <V2HomologationSection
                            v2Result={v2Result}
                            productLabel={v2ProductLabel}
                            onProductLabelChange={setV2ProductLabel}
                            productTitle={productTitle}
                            productPrice={productPrice}
                            productInfo={productInfo}
                            onCopyText={handleCopyV2Text}
                            copiedKey={copiedV2SceneKey}
                        />

                        {/* Raw Response Block */}
                        <div className="space-y-2 pt-3 border-t border-neutral-800">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] text-neutral-400 uppercase font-bold flex items-center gap-2">
                                    <LucideIcon name="code" className="w-3.5 h-3.5 text-neutral-400" />
                                    RAW Output V2 ({v2Result.rawLength} caracteres)
                                </label>
                                <button
                                    onClick={() => handleCopyRawV2(v2Result.rawText)}
                                    className="px-3 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[10px] font-bold transition flex items-center gap-1.5 cursor-pointer"
                                >
                                    <LucideIcon name="copy" className="w-3 h-3" />
                                    <span>{copiedRawV2 ? 'COPIADO!' : 'COPIAR RAW V2'}</span>
                                </button>
                            </div>
                            <pre className="whitespace-pre-wrap break-words font-mono text-[10px] leading-relaxed text-neutral-300 bg-black p-4 rounded-xl border border-neutral-800 max-h-96 overflow-y-auto select-text">
                                {v2Result.rawText || '<Nenhum texto retornado>'}
                            </pre>
                        </div>
                    </div>
                )}
            </div>

            {/* ========================================================================= */}
            {/* AGENTE DE COPY V3 — ORIGINAL BRAIN + STRUCTURED OUTPUT */}
            {/* ========================================================================= */}
            <V3Section
                v3Result={v3Result}
                isGeneratingV3={isGeneratingV3}
                v3Error={v3Error}
                onGenerateV3={handleGenerateV3}
                productImage={productImage}
                productTitle={productTitle}
                productPrice={productPrice}
                productInfo={productInfo}
            />

            {/* ========================================================================= */}
            {/* COMPARATIVE AUDIT TABLE: V2 VS V3 */}
            {/* ========================================================================= */}
            <V2VsV3ComparisonTable
                v2Result={v2Result}
                v3Result={v3Result}
            />

            {/* ========================================================================= */}
            {/* DEVELOPMENT-ONLY DIAGNOSTIC PANEL */}
            {/* ========================================================================= */}
            {diagnostics && activeDiag && (
                <div className="bg-[#0B0B0E] border-2 border-indigo-500/50 rounded-2xl p-6 shadow-2xl space-y-6 animate-fade-in font-mono text-xs">
                    {/* Diagnostic Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-indigo-900/40 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 font-bold">
                                🛠️
                            </div>
                            <div>
                                <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-2">
                                    PAINEL DE DIAGNÓSTICO
                                    <span className="text-[10px] bg-indigo-950 text-indigo-400 border border-indigo-800/60 px-2 py-0.5 rounded font-extrabold">
                                        DEV ONLY
                                    </span>
                                </h3>
                                <p className="text-[11px] text-neutral-400 font-sans mt-0.5">
                                    Inspeção completa da resposta recebida do modelo Gemini antes de qualquer alteração.
                                </p>
                            </div>
                        </div>

                        {/* Attempt Switcher Tabs if multiple attempts were made */}
                        {diagnostics.history.length > 1 && (
                            <div className="flex items-center gap-1.5 bg-neutral-900 p-1 rounded-xl border border-neutral-800">
                                {diagnostics.history.map((hist) => (
                                    <button
                                        key={hist.attemptNumber}
                                        onClick={() => setSelectedDiagAttempt(hist.attemptNumber)}
                                        className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase transition cursor-pointer ${
                                            selectedDiagAttempt === hist.attemptNumber
                                                ? 'bg-indigo-600 text-white shadow'
                                                : 'text-neutral-400 hover:text-neutral-200'
                                        }`}
                                    >
                                        Tentativa {hist.attemptNumber} {hist.attemptNumber === 2 ? '(Reparo)' : '(Inicial)'}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Pipeline & Observability Transport Verification */}
                    <div className="bg-neutral-950/90 border border-indigo-900/60 p-4 rounded-xl space-y-3">
                        <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                            <span className="text-[11px] text-indigo-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
                                <LucideIcon name="activity" className="w-3.5 h-3.5 text-indigo-400" />
                                Rastreamento de Execução Real (P0 Observability)
                            </span>
                            <span className="text-[10px] text-neutral-400 font-mono">
                                Request ID: <span className="text-neutral-200">{activeDiag.requestId || 'N/A'}</span>
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-[11px]">
                            {/* Worker Version */}
                            <div className="bg-neutral-900/80 border border-neutral-800 p-2.5 rounded-lg space-y-0.5">
                                <span className="text-[9px] text-neutral-500 uppercase font-bold block">Versão do Worker</span>
                                <span className="text-neutral-200 font-bold truncate block">
                                    {activeDiag.workerVersion || 'Aguardando deploy remoto / failover'}
                                </span>
                            </div>

                            {/* Proxy Path */}
                            <div className="bg-neutral-900/80 border border-neutral-800 p-2.5 rounded-lg space-y-0.5">
                                <span className="text-[9px] text-neutral-500 uppercase font-bold block">Rota de Execução (Proxy)</span>
                                <span className={`font-bold block ${activeDiag.proxyPath === 'cloudflare_worker' ? 'text-emerald-400' : 'text-amber-400'}`}>
                                    {activeDiag.proxyPath === 'cloudflare_worker' ? 'Cloudflare Worker' : (activeDiag.proxyPath === 'server_failover' ? 'Server Failover (Local)' : (activeDiag.proxyPath || 'N/A'))}
                                </span>
                            </div>

                            {/* Requested vs Executed Model */}
                            <div className="bg-neutral-900/80 border border-neutral-800 p-2.5 rounded-lg space-y-0.5">
                                <span className="text-[9px] text-neutral-500 uppercase font-bold block">Modelo Solicitado / Executado</span>
                                <span className="text-neutral-200 font-bold block truncate">
                                    {activeDiag.requestedModel || 'gemini-3.5-flash'} &rarr; <span className="text-indigo-300">{activeDiag.executedModel || activeDiag.modelUsed || 'N/A'}</span>
                                </span>
                            </div>

                            {/* Synthetic Fallback & Failover */}
                            <div className="bg-neutral-900/80 border border-neutral-800 p-2.5 rounded-lg space-y-0.5">
                                <span className="text-[9px] text-neutral-500 uppercase font-bold block">Fallback Sintético / Failover</span>
                                <span className={`font-bold block ${activeDiag.syntheticFallbackUsed ? 'text-red-400' : 'text-emerald-400'}`}>
                                    {activeDiag.syntheticFallbackUsed ? 'SIM (Sintético Ativado)' : (activeDiag.failoverUsed ? 'Failover Ativado' : 'NÃO (Resposta Real)')}
                                </span>
                            </div>
                        </div>

                        {/* Transport Flags: SystemInstruction & InlineImage */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-[11px]">
                            {/* systemInstruction transport */}
                            <div className="bg-neutral-900/60 border border-neutral-800/80 p-2.5 rounded-lg flex items-center justify-between">
                                <span className="text-neutral-400 font-medium">systemInstruction (Cérebro V1):</span>
                                <div className="flex items-center gap-2 font-bold text-[10px]">
                                    <span className={activeDiag.systemInstructionReceived !== false ? 'text-emerald-400' : 'text-red-400'}>
                                        Recebido: {activeDiag.systemInstructionReceived === true ? 'SIM' : (activeDiag.systemInstructionReceived === false ? 'NÃO' : 'N/A')}
                                    </span>
                                    <span className="text-neutral-600">|</span>
                                    <span className={activeDiag.systemInstructionForwarded !== false ? 'text-emerald-400' : 'text-red-400'}>
                                        Encaminhado p/ Gemini: {activeDiag.systemInstructionForwarded === true ? 'SIM' : (activeDiag.systemInstructionForwarded === false ? 'NÃO' : 'N/A')}
                                    </span>
                                </div>
                            </div>

                            {/* inlineImage transport */}
                            <div className="bg-neutral-900/60 border border-neutral-800/80 p-2.5 rounded-lg flex items-center justify-between">
                                <span className="text-neutral-400 font-medium">Imagem do Produto (Inline Base64):</span>
                                <div className="flex items-center gap-2 font-bold text-[10px]">
                                    <span className={activeDiag.inlineImageReceived !== false ? 'text-emerald-400' : 'text-amber-400'}>
                                        Recebido: {activeDiag.inlineImageReceived === true ? 'SIM' : (activeDiag.inlineImageReceived === false ? 'NÃO' : 'N/A')}
                                    </span>
                                    <span className="text-neutral-600">|</span>
                                    <span className={activeDiag.inlineImageForwarded !== false ? 'text-emerald-400' : 'text-amber-400'}>
                                        Encaminhado p/ Gemini: {activeDiag.inlineImageForwarded === true ? 'SIM' : (activeDiag.inlineImageForwarded === false ? 'NÃO' : 'N/A')}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section: INTEGRIDADE DA RESPOSTA (CHECKPOINTS A / B / C) */}
                    {activeDiag.integrityCheckpoints && (
                        <div className="bg-neutral-950/90 border border-indigo-900/60 p-4 rounded-xl space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800 pb-2.5">
                                <div className="flex items-center gap-2">
                                    <LucideIcon name="shield-check" className="w-4 h-4 text-indigo-400" />
                                    <span className="text-xs text-indigo-300 font-bold uppercase tracking-wider">
                                        INTEGRIDADE DA RESPOSTA (CHECKPOINTS A / B / C)
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {activeDiag.integrityCheckpoints.corruptionDetected ? (
                                        <span className="text-[10px] font-mono font-bold uppercase px-2.5 py-1 rounded bg-red-950 border border-red-700 text-red-300 flex items-center gap-1">
                                            <LucideIcon name="alert-triangle" className="w-3 h-3 text-red-400" />
                                            CORRUPÇÃO DETECTADA NO CHECKPOINT {activeDiag.integrityCheckpoints.firstCorruptedCheckpoint}
                                        </span>
                                    ) : (
                                        <span className="text-[10px] font-mono font-bold uppercase px-2.5 py-1 rounded bg-emerald-950/80 border border-emerald-800/60 text-emerald-400 flex items-center gap-1">
                                            <LucideIcon name="check" className="w-3 h-3" />
                                            SEM CORRUPÇÃO DETECTADA
                                        </span>
                                    )}
                                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                                        activeDiag.integrityCheckpoints.checkpointC.bEqualsC
                                            ? 'bg-neutral-900 border border-neutral-800 text-neutral-300'
                                            : 'bg-red-950 border border-red-800 text-red-300'
                                    }`}>
                                        B === C: {activeDiag.integrityCheckpoints.checkpointC.bEqualsC ? 'MATCH (100%)' : 'MISMATCH (DIVERGÊNCIA)'}
                                    </span>
                                </div>
                            </div>

                            {/* Corruption Warning Banner if triggered */}
                            {activeDiag.integrityCheckpoints.corruptionDetected && (
                                <div className="bg-red-950/50 border border-red-800 p-3 rounded-lg space-y-1.5 text-red-200 text-xs">
                                    <div className="font-bold flex items-center gap-1.5 text-red-300">
                                        <LucideIcon name="alert-circle" className="w-4 h-4 text-red-400 shrink-0" />
                                        Anotações numéricas ou corrupção de índice detectada no Checkpoint {activeDiag.integrityCheckpoints.firstCorruptedCheckpoint}!
                                    </div>
                                    {activeDiag.integrityCheckpoints.corruptionPatternMatches.length > 0 && (
                                        <div className="font-mono text-[11px] bg-black/60 p-2 rounded border border-red-900/60 text-red-300">
                                            <strong>Padrões encontrados:</strong> {activeDiag.integrityCheckpoints.corruptionPatternMatches.join(', ')}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* 3 Columns: Checkpoint A, B, C */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                                {/* Checkpoint A: Transport Response */}
                                <div className="bg-neutral-900/70 border border-neutral-800 p-3 rounded-xl space-y-2">
                                    <div className="flex items-center justify-between pb-1.5 border-b border-neutral-800">
                                        <span className="font-mono font-bold text-neutral-200 text-[11px]">
                                            CHECKPOINT A
                                        </span>
                                        <span className="text-[9px] font-mono text-neutral-500 uppercase">
                                            Transporte HTTP
                                        </span>
                                    </div>
                                    <div className="space-y-1 text-[11px] font-mono">
                                        <div className="text-neutral-400">
                                            Tipo: <span className="text-neutral-200">{activeDiag.integrityCheckpoints.checkpointA.type}</span>
                                        </div>
                                        <div className="text-neutral-400">
                                            Keys: <span className="text-neutral-300 truncate block text-[10px]">{activeDiag.integrityCheckpoints.checkpointA.keys.join(', ') || 'Nenhuma'}</span>
                                        </div>
                                        <div className="text-neutral-400">
                                            raw_text presente: <span className={activeDiag.integrityCheckpoints.checkpointA.rawTextPresent ? 'text-emerald-400' : 'text-neutral-400'}>{activeDiag.integrityCheckpoints.checkpointA.rawTextPresent ? 'SIM' : 'NÃO'}</span> ({activeDiag.integrityCheckpoints.checkpointA.rawTextLength} chars)
                                        </div>
                                        <div className="text-neutral-400">
                                            Candidato Textual: <span className="text-indigo-300">{activeDiag.integrityCheckpoints.checkpointA.textCandidateLength} chars</span>
                                        </div>
                                        <div className="text-neutral-400">
                                            Padrão Indexado: <span className={activeDiag.integrityCheckpoints.checkpointA.hasIndexPattern ? 'text-red-400 font-bold' : 'text-emerald-400'}>{activeDiag.integrityCheckpoints.checkpointA.hasIndexPattern ? 'SIM (DETECTADO)' : 'NÃO'}</span>
                                        </div>
                                    </div>
                                    <div className="pt-1">
                                        <span className="text-[9px] text-neutral-500 font-mono uppercase block mb-1">Amostra Inicial (100 chars):</span>
                                        <div className="bg-black/80 p-2 rounded border border-neutral-850 font-mono text-[10px] text-neutral-300 break-words whitespace-pre-wrap max-h-20 overflow-y-auto select-text">
                                            {activeDiag.integrityCheckpoints.checkpointA.sample100 || '<Vazio>'}
                                        </div>
                                    </div>
                                </div>

                                {/* Checkpoint B: Extracted Text */}
                                <div className="bg-neutral-900/70 border border-neutral-800 p-3 rounded-xl space-y-2">
                                    <div className="flex items-center justify-between pb-1.5 border-b border-neutral-800">
                                        <span className="font-mono font-bold text-neutral-200 text-[11px]">
                                            CHECKPOINT B
                                        </span>
                                        <span className="text-[9px] font-mono text-neutral-500 uppercase">
                                            Texto Extraído
                                        </span>
                                    </div>
                                    <div className="space-y-1 text-[11px] font-mono">
                                        <div className="text-neutral-400">
                                            Tamanho Extraído: <span className="text-indigo-300 font-bold">{activeDiag.integrityCheckpoints.checkpointB.textLength} chars</span>
                                        </div>
                                        <div className="text-neutral-400">
                                            Padrão Indexado: <span className={activeDiag.integrityCheckpoints.checkpointB.hasIndexPattern ? 'text-red-400 font-bold' : 'text-emerald-400'}>{activeDiag.integrityCheckpoints.checkpointB.hasIndexPattern ? 'SIM (DETECTADO)' : 'NÃO'}</span>
                                        </div>
                                        <div className="text-neutral-400">
                                            Fingerprint: <span className="text-neutral-300 text-[9px] block truncate font-mono bg-neutral-950 p-1 rounded border border-neutral-800 mt-0.5">{activeDiag.integrityCheckpoints.checkpointB.fingerprint}</span>
                                        </div>
                                    </div>
                                    <div className="pt-1">
                                        <span className="text-[9px] text-neutral-500 font-mono uppercase block mb-1">Amostra Inicial (100 chars):</span>
                                        <div className="bg-black/80 p-2 rounded border border-neutral-850 font-mono text-[10px] text-neutral-300 break-words whitespace-pre-wrap max-h-20 overflow-y-auto select-text">
                                            {activeDiag.integrityCheckpoints.checkpointB.sample100 || '<Vazio>'}
                                        </div>
                                    </div>
                                </div>

                                {/* Checkpoint C: Sent to Parser */}
                                <div className="bg-neutral-900/70 border border-neutral-800 p-3 rounded-xl space-y-2">
                                    <div className="flex items-center justify-between pb-1.5 border-b border-neutral-800">
                                        <span className="font-mono font-bold text-neutral-200 text-[11px]">
                                            CHECKPOINT C
                                        </span>
                                        <span className="text-[9px] font-mono text-neutral-500 uppercase">
                                            Entrada do Parser
                                        </span>
                                    </div>
                                    <div className="space-y-1 text-[11px] font-mono">
                                        <div className="text-neutral-400">
                                            Tamanho Entrada: <span className="text-indigo-300 font-bold">{activeDiag.integrityCheckpoints.checkpointC.textLength} chars</span>
                                        </div>
                                        <div className="text-neutral-400">
                                            Padrão Indexado: <span className={activeDiag.integrityCheckpoints.checkpointC.hasIndexPattern ? 'text-red-400 font-bold' : 'text-emerald-400'}>{activeDiag.integrityCheckpoints.checkpointC.hasIndexPattern ? 'SIM (DETECTADO)' : 'NÃO'}</span>
                                        </div>
                                        <div className="text-neutral-400">
                                            Fingerprint: <span className="text-neutral-300 text-[9px] block truncate font-mono bg-neutral-950 p-1 rounded border border-neutral-800 mt-0.5">{activeDiag.integrityCheckpoints.checkpointC.fingerprint}</span>
                                        </div>
                                    </div>
                                    <div className="pt-1">
                                        <span className="text-[9px] text-neutral-500 font-mono uppercase block mb-1">Amostra Inicial (100 chars):</span>
                                        <div className="bg-black/80 p-2 rounded border border-neutral-850 font-mono text-[10px] text-neutral-300 break-words whitespace-pre-wrap max-h-20 overflow-y-auto select-text">
                                            {activeDiag.integrityCheckpoints.checkpointC.sample100 || '<Vazio>'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Diagnostic Metrics Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {/* 1. HTTP / API Status */}
                        <div className="bg-neutral-950/80 border border-neutral-800 p-3 rounded-xl space-y-1">
                            <span className="text-[10px] text-neutral-500 uppercase font-bold">1. Status HTTP / API</span>
                            <div className="text-neutral-200 font-bold text-xs truncate">
                                {activeDiag.apiStatus}
                            </div>
                        </div>

                        {/* 2. Model Used */}
                        <div className="bg-neutral-950/80 border border-neutral-800 p-3 rounded-xl space-y-1">
                            <span className="text-[10px] text-neutral-500 uppercase font-bold">2. Modelo Utilizado</span>
                            <div className="text-neutral-200 font-bold text-xs truncate">
                                {activeDiag.modelUsed}
                            </div>
                        </div>

                        {/* 3. finishReason */}
                        <div className="bg-neutral-950/80 border border-neutral-800 p-3 rounded-xl space-y-1">
                            <span className="text-[10px] text-neutral-500 uppercase font-bold">3. finishReason</span>
                            <div className="flex items-center gap-1.5">
                                <span className={`w-2 h-2 rounded-full ${activeDiag.finishReason === 'STOP' ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                                <span className="text-neutral-200 font-bold text-xs">
                                    {activeDiag.finishReason || 'N/A'}
                                </span>
                            </div>
                        </div>

                        {/* 4. Raw Response Length */}
                        <div className="bg-neutral-950/80 border border-neutral-800 p-3 rounded-xl space-y-1">
                            <span className="text-[10px] text-neutral-500 uppercase font-bold">4. Tamanho Resposta Raw</span>
                            <div className="text-indigo-300 font-bold text-xs">
                                {activeDiag.rawResponseLength} caracteres
                            </div>
                        </div>

                        {/* 11. Request Type */}
                        <div className="bg-neutral-950/80 border border-neutral-800 p-3 rounded-xl space-y-1">
                            <span className="text-[10px] text-neutral-500 uppercase font-bold">11. Origem da Resposta</span>
                            <div className="text-neutral-200 font-bold text-xs">
                                {activeDiag.requestType}
                            </div>
                        </div>

                        {/* 6. VERSÃO blocks detected */}
                        <div className="bg-neutral-950/80 border border-neutral-800 p-3 rounded-xl space-y-1">
                            <span className="text-[10px] text-neutral-500 uppercase font-bold">6. Blocos "VERSÃO"</span>
                            <div className={`font-bold text-xs ${activeDiag.versionBlocksDetected === 6 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                {activeDiag.versionBlocksDetected} detectados (esperado: 6)
                            </div>
                        </div>

                        {/* 7. Scene 2 blocks detected */}
                        <div className="bg-neutral-950/80 border border-neutral-800 p-3 rounded-xl space-y-1">
                            <span className="text-[10px] text-neutral-500 uppercase font-bold">7. Marcadores "CENA 2"</span>
                            <div className={`font-bold text-xs ${activeDiag.scene2BlocksDetected === 6 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                {activeDiag.scene2BlocksDetected} detectados (esperado: 6)
                            </div>
                        </div>

                        {/* 8. Scene 3 blocks detected */}
                        <div className="bg-neutral-950/80 border border-neutral-800 p-3 rounded-xl space-y-1">
                            <span className="text-[10px] text-neutral-500 uppercase font-bold">8. Marcadores "CENA 3"</span>
                            <div className={`font-bold text-xs ${activeDiag.scene3BlocksDetected === 6 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                {activeDiag.scene3BlocksDetected} detectados (esperado: 6)
                            </div>
                        </div>

                        {/* 9. Parser Result Count */}
                        <div className="bg-neutral-950/80 border border-neutral-800 p-3 rounded-xl space-y-1">
                            <span className="text-[10px] text-neutral-500 uppercase font-bold">9. Versões Extraídas Parser</span>
                            <div className={`font-bold text-xs ${activeDiag.parsedVariationCount === 6 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {activeDiag.parsedVariationCount} versões estruturadas
                            </div>
                        </div>
                    </div>

                    {/* 10. Exact Parser Error or Issues */}
                    <div className="bg-neutral-950/80 border border-neutral-800 p-4 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] text-neutral-500 uppercase font-bold">10. Diagnóstico / Erro Exato do Parser</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${activeDiag.isValid ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40' : 'bg-red-950 text-red-400 border border-red-800/40'}`}>
                                {activeDiag.isValid ? 'ESTRUTURALMENTE COMPLETO' : 'FALHA DE EXTRAÇÃO'}
                            </span>
                        </div>
                        {activeDiag.exactParserError ? (
                            <p className="text-red-300 text-xs">{activeDiag.exactParserError}</p>
                        ) : (
                            <p className="text-emerald-400 text-xs">Nenhum erro de extração no parser.</p>
                        )}
                        {activeDiag.issues && activeDiag.issues.length > 0 && (
                            <div className="pt-2 border-t border-neutral-850 space-y-1">
                                <span className="text-[10px] text-neutral-500 uppercase font-bold">Apontamentos de Validação:</span>
                                <ul className="list-disc list-inside space-y-0.5 text-[11px] text-neutral-400">
                                    {activeDiag.issues.map((iss, i) => (
                                        <li key={i} className="text-amber-300/90">{iss}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    {/* 5. COMPLETE Raw Textual Response with Copy Button */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] text-neutral-400 uppercase font-bold flex items-center gap-2">
                                <span>5. Resposta Textual Raw Completa ({activeDiag.completeRawText.length} caracteres)</span>
                                <span className="text-[9px] text-neutral-500 font-normal">(Sem truncamento)</span>
                            </label>
                            <button
                                onClick={() => handleCopyRawResponse(activeDiag.completeRawText)}
                                disabled={!activeDiag.completeRawText}
                                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-[10px] font-mono font-bold uppercase transition flex items-center gap-1.5 cursor-pointer shadow"
                            >
                                <LucideIcon name={copiedRaw ? 'check' : 'copy'} className="w-3.5 h-3.5" />
                                {copiedRaw ? 'COPIADO COM SUCESSO!' : 'COPIAR RESPOSTA RAW'}
                            </button>
                        </div>
                        <pre className="whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-neutral-300 bg-black p-4 rounded-xl border border-neutral-800 max-h-96 overflow-y-auto select-text">
                            {activeDiag.completeRawText || '<Resposta vazia retornada>'}
                        </pre>
                    </div>
                </div>
            )}

            {/* Recommendation Banner */}
            {evaluation && variations.length === 6 && (
                <div className="bg-gradient-to-r from-[#0D1E18] via-[#11241C] to-[#0D1E18] border border-emerald-500/40 p-5 rounded-2xl shadow-xl space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-900/40 pb-3">
                        <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold">
                                🏆
                            </div>
                            <div>
                                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-300">
                                    Combinação Recomendada de Alta Conversão
                                </h3>
                                <p className="text-[11px] text-neutral-400">
                                    O Copy Evaluator analisou todas as cópias contra o produto e ranqueou as melhores de forma independente.
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={handleSelectRecommendedCombination}
                            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                                isRecommendedComboActive
                                    ? 'bg-emerald-500 text-neutral-950 font-extrabold shadow-md'
                                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/40'
                            }`}
                        >
                            <LucideIcon name={isRecommendedComboActive ? 'check' : 'wand-2'} className="w-3.5 h-3.5" />
                            {isRecommendedComboActive ? 'COMBINAÇÃO ATIVA ✓' : 'USAR COMBINAÇÃO RECOMENDADA'}
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Top Scene 2 */}
                        {(() => {
                            const topS2Item = evaluation.scene2Ranking.find(item => item.variationId === evaluation.recommendedScene2Id);
                            const topS2Var = variations.find(v => v.id === evaluation.recommendedScene2Id);
                            const isSelected = selectedScene2Id === evaluation.recommendedScene2Id;

                            return (
                                <div className={`bg-neutral-900/70 border rounded-xl p-3.5 space-y-2 ${isSelected ? 'border-emerald-500/80 ring-1 ring-emerald-500/40' : 'border-neutral-800'}`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-mono font-bold uppercase text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/50">
                                                Cena 2 • Versão {evaluation.recommendedScene2Id}
                                            </span>
                                            {isSelected && (
                                                <span className="text-[9px] font-mono text-emerald-400 font-bold">Selecionada ✓</span>
                                            )}
                                        </div>
                                        <span className="text-xs font-mono font-bold text-emerald-300">
                                            ★ {topS2Item?.score || 0}/100
                                        </span>
                                    </div>
                                    <p className="text-xs text-neutral-200 leading-relaxed font-sans line-clamp-2">
                                        "{topS2Var?.scene2}"
                                    </p>
                                    {topS2Item?.strengths && topS2Item.strengths.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 pt-1">
                                            {topS2Item.strengths.map((st, i) => (
                                                <span key={i} className="text-[9px] font-mono text-emerald-300 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-900/30">
                                                    ✓ {st}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })()}

                        {/* Top Scene 3 */}
                        {(() => {
                            const topS3Item = evaluation.scene3Ranking.find(item => item.variationId === evaluation.recommendedScene3Id);
                            const topS3Var = variations.find(v => v.id === evaluation.recommendedScene3Id);
                            const isSelected = selectedScene3Id === evaluation.recommendedScene3Id;

                            return (
                                <div className={`bg-neutral-900/70 border rounded-xl p-3.5 space-y-2 ${isSelected ? 'border-amber-500/80 ring-1 ring-amber-500/40' : 'border-neutral-800'}`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-mono font-bold uppercase text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800/50">
                                                Cena 3 • Versão {evaluation.recommendedScene3Id}
                                            </span>
                                            {isSelected && (
                                                <span className="text-[9px] font-mono text-amber-400 font-bold">Selecionada ✓</span>
                                            )}
                                        </div>
                                        <span className="text-xs font-mono font-bold text-amber-300">
                                            ★ {topS3Item?.score || 0}/100
                                        </span>
                                    </div>
                                    <p className="text-xs text-neutral-200 leading-relaxed font-sans line-clamp-2">
                                        "{topS3Var?.scene3}"
                                    </p>
                                    {topS3Item?.strengths && topS3Item.strengths.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 pt-1">
                                            {topS3Item.strengths.map((st, i) => (
                                                <span key={i} className="text-[9px] font-mono text-amber-300 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-900/30">
                                                    ✓ {st}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
                    </div>
                </div>
            )}

            {/* Current Active Selection Summary */}
            {variations.length === 6 && (selectedScene2Id || selectedScene3Id) && (
                <div className="bg-[#101014] border border-emerald-500/40 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold uppercase text-neutral-300">
                                Seleção Atual do Usuário:
                            </span>
                            <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/30 font-bold">
                                Salvo no Contrato ✓
                            </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-neutral-300">
                            <span>
                                <strong>Cena 2:</strong> {selectedScene2Id ? `Versão ${selectedScene2Id}` : '<Pendente>'}
                            </span>
                            <span className="text-neutral-600">•</span>
                            <span>
                                <strong>Cena 3:</strong> {selectedScene3Id ? `Versão ${selectedScene3Id}` : '<Pendente>'}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {selectedS2 && selectedS3 && (
                            <button
                                onClick={() => handleCopyText(`CENA 2 (Versão ${selectedScene2Id}):\n${selectedS2.scene2}\n\nCENA 3 (Versão ${selectedScene3Id}):\n${selectedS3.scene3}`, 'selected-combo')}
                                className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-mono font-bold uppercase flex items-center gap-1.5 transition cursor-pointer"
                            >
                                <LucideIcon name={copiedKey === 'selected-combo' ? 'check' : 'copy'} className="w-3.5 h-3.5 text-emerald-400" />
                                {copiedKey === 'selected-combo' ? 'Copiado!' : 'Copiar Seleção'}
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Exactly 6 Variations Grid */}
            {variations.length === 6 && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-2">
                            <LucideIcon name="layers" className="w-4 h-4 text-emerald-400" />
                            VARIAÇÕES GERADAS (6 VERSÕES)
                        </h2>
                        <span className="text-[11px] font-mono text-emerald-400 font-bold bg-emerald-950/40 border border-emerald-800/40 px-2.5 py-0.5 rounded">
                            Meta 160–175 caracteres atendida ✓
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {variations.map((variation) => {
                            const isS2Selected = selectedScene2Id === variation.id;
                            const isS3Selected = selectedScene3Id === variation.id;
                            const isFullySelected = isS2Selected && isS3Selected;

                            const s2Len = variation.scene2.length;
                            const s3Len = variation.scene3.length;

                            const s2Eval = getScene2Evaluation(variation.id);
                            const s3Eval = getScene3Evaluation(variation.id);

                            const isTopScene2 = evaluation?.recommendedScene2Id === variation.id;
                            const isTopScene3 = evaluation?.recommendedScene3Id === variation.id;

                            return (
                                <div
                                    key={variation.id}
                                    className={`bg-[#0F0F12] border rounded-2xl p-5 flex flex-col justify-between transition-all relative ${
                                        isFullySelected
                                            ? 'border-emerald-500 shadow-lg shadow-emerald-950/40 ring-1 ring-emerald-500/40'
                                            : isS2Selected || isS3Selected
                                                ? 'border-neutral-700 bg-neutral-900/40'
                                                : 'border-neutral-800 hover:border-neutral-700'
                                    }`}
                                >
                                    {/* Card Header */}
                                    <div className="flex items-center justify-between pb-3 border-b border-neutral-800/80 mb-3">
                                        <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                                            <span className="text-xs font-mono font-bold uppercase text-neutral-200">
                                                VERSÃO {variation.id}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => handleCopyText(`CENA 2:\n${variation.scene2}\n\nCENA 3:\n${variation.scene3}`, `all-${variation.id}`)}
                                            className="text-[10px] font-mono text-neutral-400 hover:text-white flex items-center gap-1 transition cursor-pointer"
                                            title="Copiar ambas as cenas desta versão"
                                        >
                                            <LucideIcon name={copiedKey === `all-${variation.id}` ? 'check' : 'copy'} className="w-3 h-3 text-emerald-400" />
                                            {copiedKey === `all-${variation.id}` ? 'Copiado' : 'Copiar Tudo'}
                                        </button>
                                    </div>

                                    {/* Scenes Section */}
                                    <div className="space-y-4 flex-1">
                                        {/* Scene 2 Block */}
                                        <div className={`space-y-2 p-3 rounded-xl transition ${isS2Selected ? 'bg-emerald-950/20 border border-emerald-500/30' : 'bg-neutral-950/40 border border-neutral-800/60'}`}>
                                            <div className="flex items-center justify-between gap-1 flex-wrap">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400">
                                                        CENA 2
                                                    </span>
                                                    {isTopScene2 && (
                                                        <span className="text-[9px] font-mono font-bold uppercase text-amber-300 bg-amber-950/60 border border-amber-800/50 px-1.5 py-0.2 rounded">
                                                            🏆 Top 1
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {s2Eval && (
                                                        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                                                            s2Eval.score >= 90
                                                                ? 'text-emerald-400 bg-emerald-950/80 border border-emerald-800/50'
                                                                : s2Eval.score >= 80
                                                                    ? 'text-emerald-300 bg-emerald-950/40'
                                                                    : 'text-neutral-400 bg-neutral-900'
                                                        }`}>
                                                            ★ {s2Eval.score}/100
                                                        </span>
                                                    )}
                                                    <span className={`text-[9px] font-mono font-bold ${
                                                        s2Len >= 160 && s2Len <= 175 ? 'text-emerald-400' : 'text-amber-400'
                                                    }`}>
                                                        {s2Len} caracteres
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="text-xs text-neutral-200 leading-relaxed font-sans select-text">
                                                {variation.scene2}
                                            </div>

                                            {/* Strengths / Warnings pills */}
                                            {s2Eval && (s2Eval.strengths.length > 0 || s2Eval.warnings.length > 0) && (
                                                <div className="flex flex-wrap gap-1 pt-1 text-[9px] font-mono">
                                                    {s2Eval.strengths.map((st, i) => (
                                                        <span key={i} className="text-emerald-400/90 bg-emerald-950/30 px-1.5 py-0.5 rounded">
                                                            + {st}
                                                        </span>
                                                    ))}
                                                    {s2Eval.warnings.map((wn, i) => (
                                                        <span key={i} className="text-amber-400/90 bg-amber-950/30 px-1.5 py-0.5 rounded">
                                                            ! {wn}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}

                                            <div className="pt-1 flex justify-end">
                                                <button
                                                    onClick={() => handleSelectScene2(variation.id)}
                                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase transition cursor-pointer flex items-center gap-1 ${
                                                        isS2Selected
                                                            ? 'bg-emerald-600 text-white font-extrabold shadow'
                                                            : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                                                    }`}
                                                >
                                                    <LucideIcon name={isS2Selected ? 'check' : 'mouse-pointer'} className="w-3 h-3" />
                                                    {isS2Selected ? 'Cena 2 Selecionada ✓' : 'Usar Cena 2'}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Scene 3 Block */}
                                        <div className={`space-y-2 p-3 rounded-xl transition ${isS3Selected ? 'bg-amber-950/20 border border-amber-500/30' : 'bg-neutral-950/40 border border-neutral-800/60'}`}>
                                            <div className="flex items-center justify-between gap-1 flex-wrap">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400">
                                                        CENA 3 / CTA
                                                    </span>
                                                    {isTopScene3 && (
                                                        <span className="text-[9px] font-mono font-bold uppercase text-amber-300 bg-amber-950/60 border border-amber-800/50 px-1.5 py-0.2 rounded">
                                                            🏆 Top 1
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {s3Eval && (
                                                        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                                                            s3Eval.score >= 90
                                                                ? 'text-amber-400 bg-amber-950/80 border border-amber-800/50'
                                                                : s3Eval.score >= 80
                                                                    ? 'text-amber-300 bg-amber-950/40'
                                                                    : 'text-neutral-400 bg-neutral-900'
                                                        }`}>
                                                            ★ {s3Eval.score}/100
                                                        </span>
                                                    )}
                                                    <span className={`text-[9px] font-mono font-bold ${
                                                        s3Len >= 160 && s3Len <= 175 ? 'text-amber-400' : 'text-amber-400'
                                                    }`}>
                                                        {s3Len} caracteres
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="text-xs text-neutral-200 leading-relaxed font-sans select-text">
                                                {variation.scene3}
                                            </div>

                                            {/* Strengths / Warnings pills */}
                                            {s3Eval && (s3Eval.strengths.length > 0 || s3Eval.warnings.length > 0) && (
                                                <div className="flex flex-wrap gap-1 pt-1 text-[9px] font-mono">
                                                    {s3Eval.strengths.map((st, i) => (
                                                        <span key={i} className="text-amber-400/90 bg-amber-950/30 px-1.5 py-0.5 rounded">
                                                            + {st}
                                                        </span>
                                                    ))}
                                                    {s3Eval.warnings.map((wn, i) => (
                                                        <span key={i} className="text-red-400/90 bg-red-950/30 px-1.5 py-0.5 rounded">
                                                            ! {wn}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}

                                            <div className="pt-1 flex justify-end">
                                                <button
                                                    onClick={() => handleSelectScene3(variation.id)}
                                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase transition cursor-pointer flex items-center gap-1 ${
                                                        isS3Selected
                                                            ? 'bg-amber-600 text-white font-extrabold shadow'
                                                            : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                                                    }`}
                                                >
                                                    <LucideIcon name={isS3Selected ? 'check' : 'mouse-pointer'} className="w-3 h-3" />
                                                    {isS3Selected ? 'Cena 3 Selecionada ✓' : 'Usar Cena 3'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Button: Select Whole Card */}
                                    <div className="pt-3 mt-3 border-t border-neutral-800/80">
                                        <button
                                            onClick={() => handleSelectEntireVariation(variation.id)}
                                            className={`w-full py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1.5 ${
                                                isFullySelected
                                                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                                                    : 'bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300'
                                            }`}
                                        >
                                            <LucideIcon
                                                name={isFullySelected ? 'check' : 'layers'}
                                                className="w-3.5 h-3.5"
                                            />
                                            {isFullySelected ? 'VERSÃO COMPLETA ATIVA ✓' : `USAR VERSÃO ${variation.id} COMPLETA`}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
