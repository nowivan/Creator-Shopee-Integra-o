import React, { useState, useRef, useEffect, useCallback } from 'react';
import { LucideIcon } from '../../components/Common';
import { executeAgenteDeCopyClean, repairSingleInvalidScene } from './service';
import {
    AgenteDeCopyCleanResult,
    CleanVariantType,
    CleanDBrainVariant,
    CleanDReviewerGroundingMode,
    VariationFilter,
    CleanCopyVariation
} from './types';
import {
    filterVariations,
    calculateUsageStats,
    toggleUsedVariation,
    getResultIdentity,
    loadWorkflowState,
    saveWorkflowState
} from './labWorkflow';
import { LabVariationCard } from './components/LabVariationCard';
import { LabDiagnosticsPanel } from './components/LabDiagnosticsPanel';
import {
    saveCopyAgentSession,
    loadCopyAgentSession,
    clearCopyAgentSession,
    shouldOfferCopyAgentRestore,
    CopyAgentSavedSession,
    CopyAgentSavedMode,
    CopyAgentSavedVariation
} from '../copy-agent/copyAgentSessionStorage';

interface AgenteDeCopyCleanViewProps {
    currentKey?: string;
}

const VARIANT_METADATA: Record<CleanVariantType, { title: string; model: string; temperature: string }> = {
    A: { title: 'Variante A (Baseline)', model: 'gemini-3.5-flash', temperature: '0.65' },
    B: { title: 'Variante B (Formatação Reforçada)', model: 'gemini-3.5-flash', temperature: '0.65' },
    C: { title: 'Variante C (Contrato Estrito)', model: 'gemini-3.5-flash', temperature: '0.65' },
    D: { title: 'Variante D (Copy Variation Lab)', model: 'gemini-3.5-flash', temperature: '0.65' }
};

export const AgenteDeCopyCleanView: React.FC<AgenteDeCopyCleanViewProps> = () => {
    const [selectedVariant, setSelectedVariant] = useState<CleanVariantType>('D');
    const [brainVariant, setBrainVariant] = useState<CleanDBrainVariant>('CURRENT');
    const [reviewerGroundingMode, setReviewerGroundingMode] = useState<CleanDReviewerGroundingMode>('text_only');
    const [isAdvancedSettingsOpen, setIsAdvancedSettingsOpen] = useState<boolean>(false);
    const [productImage, setProductImage] = useState<string | null>(null);
    const [imageMimeType, setImageMimeType] = useState<string>('image/jpeg');
    const [imageFileName, setImageFileName] = useState<string>('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [repairingScene, setRepairingScene] = useState<{ versionId: number; scene: 'scene2' | 'scene3' } | null>(null);
    const [sceneRepairErrors, setSceneRepairErrors] = useState<Record<string, string>>({});

    // Store latest results per variant for side-by-side comparison
    const [resultsByVariant, setResultsByVariant] = useState<Record<CleanVariantType, AgenteDeCopyCleanResult | null>>({
        A: null,
        B: null,
        C: null,
        D: null
    });

    // Workflow State: Used variation IDs and UI visibility filter
    const [usedVariationIds, setUsedVariationIds] = useState<number[]>([]);
    const [activeFilter, setActiveFilter] = useState<VariationFilter>('all');

    const [error, setError] = useState<string | null>(null);
    const [copiedKey, setCopiedKey] = useState<string | null>(null);
    const [copiedRaw, setCopiedRaw] = useState(false);
    const [copiedR1, setCopiedR1] = useState(false);
    const [copiedR2, setCopiedR2] = useState(false);

    // Session Persistence State
    const [savedSessionToRestore, setSavedSessionToRestore] = useState<CopyAgentSavedSession | null>(null);
    const [lastSavedTimestamp, setLastSavedTimestamp] = useState<number | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const activeResult = resultsByVariant[selectedVariant];
    const resultId = getResultIdentity(activeResult);

    // Check for saved session on mount
    useEffect(() => {
        try {
            const saved = loadCopyAgentSession();
            if (saved && shouldOfferCopyAgentRestore(saved)) {
                setSavedSessionToRestore(saved);
            }
        } catch (err) {
            console.warn('[AgenteDeCopyCleanView] Error loading initial saved session:', err);
        }
    }, []);

    // Helper to persist current session to local storage
    const persistCurrentSession = useCallback((
        resultsMap: Record<CleanVariantType, AgenteDeCopyCleanResult | null>,
        usedIds: number[],
        currentVariant: CleanVariantType,
        currentImage: string | null,
        currentFileName: string,
        currentFilter: VariationFilter,
        currentBrain: CleanDBrainVariant,
        currentReviewer: CleanDReviewerGroundingMode
    ) => {
        const active = resultsMap[currentVariant];
        const hasAnyResult = Object.values(resultsMap).some(r => r && r.variations && r.variations.length > 0);
        if (!hasAnyResult && (!active || !active.variations || active.variations.length === 0)) {
            return;
        }

        const activeVariations = (active?.variations || []).filter(v => 
            v && 
            typeof v.scene2 === 'string' && 
            typeof v.scene3 === 'string' && 
            !v.scene2.includes('CHARACTER_RULE_FAIL') && 
            !v.scene3.includes('CHARACTER_RULE_FAIL') &&
            !v.scene2.includes('FALHA:') &&
            !v.scene3.includes('FALHA:')
        );

        if (activeVariations.length === 0 && !hasAnyResult) {
            return;
        }
        const savedMode: CopyAgentSavedMode = currentVariant === 'D' ? 'clean_d_lab' : (`clean_${currentVariant.toLowerCase()}` as CopyAgentSavedMode);

        const mappedVariations: CopyAgentSavedVariation[] = activeVariations.map(v => ({
            id: String(v.id),
            text: `CENA 2:\n${v.scene2}\n\nCENA 3:\n${v.scene3}`,
            mode: savedMode,
            isUsed: usedIds.includes(v.id),
            createdAt: Date.now()
        }));

        const sessionToSave: CopyAgentSavedSession = {
            schemaVersion: 1,
            savedAt: Date.now(),
            activeMode: savedMode,
            productContext: currentFileName || (currentImage ? 'Foto do Produto' : 'Contexto do Produto'),
            productImagePreview: currentImage || undefined,
            selectedPlatform: 'tiktok_shop',
            cartGuidance: 'carrinho laranja',
            characterContract: {
                min: 160,
                max: 175
            },
            variations: mappedVariations,
            labVariations: currentVariant === 'D' ? mappedVariations : undefined,
            cleanResultsByVariant: resultsMap,
            brainVariant: currentBrain,
            reviewerGroundingMode: currentReviewer,
            usedVariationIds: usedIds,
            activeFilter: currentFilter
        };

        const success = saveCopyAgentSession(sessionToSave);
        if (success) {
            setLastSavedTimestamp(Date.now());
        }
    }, []);

    // Reference to hold latest state to prevent stale closures during lifecycle events
    const latestStateRef = useRef({
        resultsByVariant,
        usedVariationIds,
        selectedVariant,
        productImage,
        imageFileName,
        activeFilter,
        brainVariant,
        reviewerGroundingMode
    });

    useEffect(() => {
        latestStateRef.current = {
            resultsByVariant,
            usedVariationIds,
            selectedVariant,
            productImage,
            imageFileName,
            activeFilter,
            brainVariant,
            reviewerGroundingMode
        };
    });

    // Browser and tab lifecycle persistence safeguards (beforeunload, pagehide, visibilitychange, unmount)
    useEffect(() => {
        const executeLifecycleSave = () => {
            const s = latestStateRef.current;
            persistCurrentSession(
                s.resultsByVariant,
                s.usedVariationIds,
                s.selectedVariant,
                s.productImage,
                s.imageFileName,
                s.activeFilter,
                s.brainVariant,
                s.reviewerGroundingMode
            );
        };

        const handleBeforeUnload = () => {
            executeLifecycleSave();
        };

        const handlePageHide = () => {
            executeLifecycleSave();
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                executeLifecycleSave();
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        window.addEventListener('pagehide', handlePageHide);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            executeLifecycleSave();
            window.removeEventListener('beforeunload', handleBeforeUnload);
            window.removeEventListener('pagehide', handlePageHide);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [persistCurrentSession]);

    // Sync workflow state when active result changes
    useEffect(() => {
        if (!resultId) {
            setUsedVariationIds([]);
            setActiveFilter('all');
            return;
        }
        const loaded = loadWorkflowState(resultId);
        setUsedVariationIds(loaded.usedVariationIds);
        setActiveFilter(loaded.filter);
    }, [resultId]);

    // Save workflow state when modified
    const handleUpdateUsedIds = (newIds: number[]) => {
        setUsedVariationIds(newIds);
        if (resultId) {
            saveWorkflowState({
                resultId,
                usedVariationIds: newIds,
                filter: activeFilter
            });
        }
        persistCurrentSession(
            resultsByVariant,
            newIds,
            selectedVariant,
            productImage,
            imageFileName,
            activeFilter,
            brainVariant,
            reviewerGroundingMode
        );
    };

    const handleUpdateFilter = (newFilter: VariationFilter) => {
        setActiveFilter(newFilter);
        if (resultId) {
            saveWorkflowState({
                resultId,
                usedVariationIds,
                filter: newFilter
            });
        }
        persistCurrentSession(
            resultsByVariant,
            usedVariationIds,
            selectedVariant,
            productImage,
            imageFileName,
            newFilter,
            brainVariant,
            reviewerGroundingMode
        );
    };

    const handleRestoreSession = () => {
        if (!savedSessionToRestore) return;

        const modeToVariant: Record<CopyAgentSavedMode, CleanVariantType> = {
            clean_a: 'A',
            clean_b: 'B',
            clean_c: 'C',
            clean_d: 'D',
            clean_d_lab: 'D'
        };

        const targetVariant = modeToVariant[savedSessionToRestore.activeMode] || 'D';
        setSelectedVariant(targetVariant);

        if (savedSessionToRestore.productImagePreview) {
            setProductImage(savedSessionToRestore.productImagePreview);
        }
        if (savedSessionToRestore.productContext) {
            setImageFileName(savedSessionToRestore.productContext);
        }
        if (savedSessionToRestore.brainVariant && (savedSessionToRestore.brainVariant === 'CURRENT' || savedSessionToRestore.brainVariant === 'CORE_SHORT')) {
            setBrainVariant(savedSessionToRestore.brainVariant as CleanDBrainVariant);
        }
        if (savedSessionToRestore.reviewerGroundingMode && (savedSessionToRestore.reviewerGroundingMode === 'text_only' || savedSessionToRestore.reviewerGroundingMode === 'multimodal')) {
            setReviewerGroundingMode(savedSessionToRestore.reviewerGroundingMode as CleanDReviewerGroundingMode);
        }

        if (savedSessionToRestore.cleanResultsByVariant) {
            setResultsByVariant(savedSessionToRestore.cleanResultsByVariant as Record<CleanVariantType, AgenteDeCopyCleanResult | null>);
        } else {
            // Reconstruct results if cleanResultsByVariant wasn't serialized
            const rawVars = (targetVariant === 'D' && savedSessionToRestore.labVariations && savedSessionToRestore.labVariations.length > 0)
                ? savedSessionToRestore.labVariations
                : savedSessionToRestore.variations;

            const reconstructedVariations: CleanCopyVariation[] = rawVars.map((v, idx) => {
                const parts = v.text.split(/CENA 3:\s*/i);
                const s2 = parts[0]?.replace(/CENA 2:\s*/i, '').trim() || '';
                const s3 = parts[1]?.trim() || '';
                return {
                    id: Number(v.id) || idx + 1,
                    scene2: s2,
                    scene3: s3
                };
            });

            const fallbackResult: AgenteDeCopyCleanResult = {
                ok: true,
                variant: targetVariant,
                brainVariant: (savedSessionToRestore.brainVariant as CleanDBrainVariant) || 'CURRENT',
                reviewerGroundingMode: (savedSessionToRestore.reviewerGroundingMode as CleanDReviewerGroundingMode) || 'text_only',
                variations: reconstructedVariations,
                variationsRecoveredCount: reconstructedVariations.length,
                rawText: rawVars.map(v => v.text).join('\n\n'),
                rawLength: rawVars.map(v => v.text).join('\n\n').length,
                finishReason: 'RESTORED_SESSION',
                diagnostics: {
                    httpStatus: 200,
                    requestId: `restored_${savedSessionToRestore.savedAt || Date.now()}`,
                    requestedModel: 'local_storage',
                    executedModel: 'local_storage',
                    finishReason: 'RESTORED',
                    outputTokenCount: null,
                    candidatePartsCount: 1,
                    textPartsCount: 1,
                    rawLength: rawVars.map(v => v.text).join('\n\n').length,
                    jsonParseStatus: 'SUCCESS',
                    brainDelivery: 'systemInstruction',
                    brainOccurrences: 1,
                    executionTimeMs: 0,
                    proxyPath: '/local-storage'
                },
                validation: {
                    versionsCount: reconstructedVariations.length,
                    scene2Count: reconstructedVariations.filter(v => Boolean(v.scene2)).length,
                    scene3Count: reconstructedVariations.filter(v => Boolean(v.scene3)).length,
                    characterComplianceCount: reconstructedVariations.filter(v => v.scene2.length >= 160 && v.scene2.length <= 175).length + reconstructedVariations.filter(v => v.scene3.length >= 160 && v.scene3.length <= 175).length,
                    carrinhoLaranjaCount: reconstructedVariations.filter(v => v.scene3.toLowerCase().includes('carrinho')).length,
                    visualDescriptionDetected: false,
                    visualDescriptionViolationsCount: 0,
                    scene1Detected: false,
                    explicitPrice: false,
                    installmentViolationDetected: false,
                    discountClaim: false,
                    inventedStock: false,
                    inventedDeadline: false,
                    unsupportedClaimsDetected: false,
                    preambleDetected: false,
                    sceneDetails: reconstructedVariations.map(v => ({
                        versionNumber: v.id,
                        scene2Length: v.scene2.length,
                        scene2Valid: v.scene2.length >= 160 && v.scene2.length <= 175,
                        scene3Length: v.scene3.length,
                        scene3Valid: v.scene3.length >= 160 && v.scene3.length <= 175,
                        hasCarrinhoLaranja: v.scene3.toLowerCase().includes('carrinho')
                    })),
                    sceneValidations: [],
                    uniqueIds1to6: true,
                    allScenesValid: true,
                    homologationStatus: 'PASS'
                }
            };

            setResultsByVariant(prev => ({
                ...prev,
                [targetVariant]: fallbackResult
            }));
        }

        if (Array.isArray(savedSessionToRestore.usedVariationIds)) {
            setUsedVariationIds(savedSessionToRestore.usedVariationIds);
        } else {
            const derivedUsed = (savedSessionToRestore.labVariations || savedSessionToRestore.variations)
                .filter(v => v.isUsed)
                .map(v => Number(v.id))
                .filter(id => !isNaN(id));
            setUsedVariationIds(derivedUsed);
        }

        if (savedSessionToRestore.activeFilter && ['all', 'available', 'used'].includes(savedSessionToRestore.activeFilter)) {
            setActiveFilter(savedSessionToRestore.activeFilter as VariationFilter);
        }

        setLastSavedTimestamp(savedSessionToRestore.savedAt || Date.now());
        setSavedSessionToRestore(null);
        setError(null);
    };

    const handleDiscardSavedSession = () => {
        clearCopyAgentSession();
        setSavedSessionToRestore(null);
    };

    const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

    const handleImageUpload = (file: File) => {
        if (!file.type || !ALLOWED_IMAGE_TYPES.includes(file.type.toLowerCase())) {
            setError('Formato de imagem não suportado.');
            return;
        }

        setImageMimeType(file.type || 'image/jpeg');
        setImageFileName(file.name || 'imagem_colada.png');
        setError(null);

        const reader = new FileReader();
        reader.onload = (e) => {
            const base64 = e.target?.result as string;
            setProductImage(base64);
        };
        reader.readAsDataURL(file);
    };

    // Global Paste (Ctrl+V / Cmd+V) Image Handler for Product Photo
    useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
            const items = e.clipboardData?.items;
            if (!items || items.length === 0) return;

            let imageItem: DataTransferItem | null = null;
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.startsWith('image/')) {
                    imageItem = items[i];
                    break;
                }
            }

            // If clipboard does not contain an image, allow normal text paste in inputs/textareas
            if (!imageItem) return;

            // Image detected in clipboard -> prevent default and load image into Product Photo
            e.preventDefault();
            e.stopPropagation();

            const file = imageItem.getAsFile();
            if (!file) return;

            handleImageUpload(file);
        };

        window.addEventListener('paste', handlePaste);
        return () => {
            window.removeEventListener('paste', handlePaste);
        };
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleImageUpload(file);
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file) {
            handleImageUpload(file);
        }
    };

    const handleGenerate = async () => {
        if (!productImage) {
            setError('Selecione a foto do produto antes de gerar.');
            return;
        }

        setIsGenerating(true);
        setError(null);
        setSceneRepairErrors({});

        try {
            const result = await executeAgenteDeCopyClean(
                productImage,
                imageMimeType,
                selectedVariant,
                brainVariant,
                reviewerGroundingMode
            );

            // Invariant: New generation resets workflow usage state
            const newResultId = getResultIdentity(result);
            setUsedVariationIds([]);
            setActiveFilter('all');
            if (newResultId) {
                saveWorkflowState({
                    resultId: newResultId,
                    usedVariationIds: [],
                    filter: 'all'
                });
            }

            const newResults = {
                ...resultsByVariant,
                [selectedVariant]: result
            };

            setResultsByVariant(newResults);

            if (result.ok && result.variations && result.variations.length > 0) {
                persistCurrentSession(
                    newResults,
                    [],
                    selectedVariant,
                    productImage,
                    imageFileName,
                    'all',
                    brainVariant,
                    reviewerGroundingMode
                );
            }

            if (!result.ok && result.errorMessage) {
                setError(result.errorMessage);
            }
        } catch (err: any) {
            setError(err.message || 'Erro inesperado na geração de copies.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSingleSceneRepair = async (versionId: number, scene: 'scene2' | 'scene3') => {
        if (!activeResult) return;

        const errorKey = `v${versionId}_${scene}`;
        setRepairingScene({ versionId, scene });
        setSceneRepairErrors(prev => ({ ...prev, [errorKey]: '' }));

        try {
            const repairResult = await repairSingleInvalidScene({
                versionId,
                scene,
                currentVariations: activeResult.variations,
                validationResult: activeResult.validation,
                commercialEvidence: activeResult.commercialEvidence,
                reviewerGroundingMode,
                productImageBase64: productImage,
                imageMimeType
            });

            if (!repairResult.ok) {
                setSceneRepairErrors(prev => ({
                    ...prev,
                    [errorKey]: repairResult.errorMessage || 'Falha ao reparar a cena.'
                }));
                return;
            }

            // Successfully repaired and verified
            const current = resultsByVariant[selectedVariant];
            if (!current) return;

            const updatedTrace = current.cleanDTrace ? {
                ...current.cleanDTrace,
                finalHomologationStatus: repairResult.validationResult.homologationStatus,
                manualRepairs: [
                    ...(current.cleanDTrace.manualRepairs || []),
                    repairResult.repairDiagnostic
                ]
            } : undefined;

            const updatedResults = {
                ...resultsByVariant,
                [selectedVariant]: {
                    ...current,
                    variations: repairResult.mergedVariations,
                    validation: repairResult.validationResult,
                    cleanDTrace: updatedTrace
                }
            };

            setResultsByVariant(updatedResults);

            persistCurrentSession(
                updatedResults,
                usedVariationIds,
                selectedVariant,
                productImage,
                imageFileName,
                activeFilter,
                brainVariant,
                reviewerGroundingMode
            );
        } catch (err: any) {
            setSceneRepairErrors(prev => ({
                ...prev,
                [errorKey]: err.message || 'Erro inesperado no reparo da cena.'
            }));
        } finally {
            setRepairingScene(null);
        }
    };

    const handleCopy = (text: string, key: string) => {
        navigator.clipboard.writeText(text);
        setCopiedKey(key);
        setTimeout(() => {
            setCopiedKey((curr) => (curr === key ? null : curr));
        }, 1800);
    };

    const handleCopyRaw = (text: string, type: 'init' | 'r1' | 'r2') => {
        navigator.clipboard.writeText(text);
        if (type === 'init') {
            setCopiedRaw(true);
            setTimeout(() => setCopiedRaw(false), 1800);
        } else if (type === 'r1') {
            setCopiedR1(true);
            setTimeout(() => setCopiedR1(false), 1800);
        } else if (type === 'r2') {
            setCopiedR2(true);
            setTimeout(() => setCopiedR2(false), 1800);
        }
    };

    const handleToggleUsed = (variationId: number, isReady: boolean) => {
        const nextUsed = toggleUsedVariation(usedVariationIds, variationId, isReady);
        handleUpdateUsedIds(nextUsed);
    };

    const handleClearUsed = () => {
        handleUpdateUsedIds([]);
    };

    // Calculate usage and filtered view
    const totalVariations = activeResult?.variations.length || 6;
    const usageStats = calculateUsageStats(totalVariations, usedVariationIds);
    const visibleVariations = activeResult
        ? filterVariations(activeResult.variations, usedVariationIds, activeFilter)
        : [];

    return (
        <div id="agente-de-copy-clean-container" className="max-w-7xl mx-auto px-4 py-8 space-y-8 font-sans">
            {/* Header: Suite Clean & Copy Variation Lab */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-800 pb-6">
                <div>
                    <div className="flex items-center gap-3">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-emerald-950 border border-emerald-800 text-emerald-300">
                            CLEAN D (VALIDATED) • COPY VARIATION LAB
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono text-neutral-400 bg-neutral-900 border border-neutral-800">
                            6 Variações • 160–175 Chars • Carrinho Laranja
                        </span>
                    </div>
                    <h1 className="text-2xl font-bold text-neutral-100 tracking-tight mt-2 flex items-center gap-2">
                        <LucideIcon name="flask-conical" className="w-6 h-6 text-emerald-400" />
                        AGENTE DE COPY — SUITE CLEAN
                    </h1>
                    <p className="text-sm text-neutral-400 mt-1 max-w-3xl">
                        Gere 6 variações, use uma no seu vídeo e marque como usada. Depois volte aqui para testar novas copies mantendo a mesma estrutura visual.
                    </p>
                </div>

                {/* Variant Switcher */}
                <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded-xl p-1 font-mono text-xs self-start md:self-auto">
                    {(['A', 'B', 'C', 'D'] as CleanVariantType[]).map(v => (
                        <button
                            key={v}
                            type="button"
                            onClick={() => {
                                setSelectedVariant(v);
                                persistCurrentSession(
                                    resultsByVariant,
                                    usedVariationIds,
                                    v,
                                    productImage,
                                    imageFileName,
                                    activeFilter,
                                    brainVariant,
                                    reviewerGroundingMode
                                );
                            }}
                            className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                                selectedVariant === v
                                    ? v === 'D'
                                        ? 'bg-emerald-500 text-neutral-950 shadow-sm'
                                        : 'bg-neutral-700 text-white'
                                    : 'text-neutral-400 hover:text-neutral-200'
                            }`}
                        >
                            <span>CLEAN {v}</span>
                            {v === 'D' && (
                                <span className={`text-[9px] px-1 py-0.2 rounded font-mono ${selectedVariant === 'D' ? 'bg-neutral-950 text-emerald-300' : 'bg-emerald-950 text-emerald-400'}`}>
                                    LAB
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Non-Blocking Session Restore Banner */}
            {savedSessionToRestore && (
                <div
                    id="copy-agent-restore-banner"
                    className="bg-[#0e1612] border border-emerald-500/50 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl backdrop-blur-sm animate-fade-in"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
                            <LucideIcon name="history" className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-mono font-bold text-emerald-300 uppercase">
                                    Sessão Salva do Agente de Copy
                                </span>
                                <span className="text-[10px] font-mono text-neutral-300 bg-neutral-900 px-2 py-0.5 rounded border border-neutral-750">
                                    {savedSessionToRestore.activeMode.toUpperCase().replace('_', ' ')}
                                </span>
                            </div>
                            <p className="text-xs text-neutral-300 mt-0.5">
                                {savedSessionToRestore.productContext ? `"${savedSessionToRestore.productContext}" • ` : ''}
                                {savedSessionToRestore.variations.length || savedSessionToRestore.labVariations?.length || 6} variações preservadas ({new Date(savedSessionToRestore.savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                        <button
                            type="button"
                            id="btn-discard-copy-session"
                            onClick={handleDiscardSavedSession}
                            className="px-3 py-1.5 rounded-lg text-xs font-mono text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition cursor-pointer"
                        >
                            Começar Novo
                        </button>
                        <button
                            type="button"
                            id="btn-restore-copy-session"
                            onClick={handleRestoreSession}
                            className="px-4 py-1.5 rounded-lg text-xs font-mono font-bold bg-emerald-500 hover:bg-emerald-400 text-neutral-950 transition flex items-center gap-1.5 cursor-pointer shadow-md active:scale-98"
                        >
                            <LucideIcon name="rotate-ccw" className="w-3.5 h-3.5" />
                            Restaurar Sessão
                        </button>
                    </div>
                </div>
            )}

            {/* Input & Generation Card */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 bg-[#0B0B0E] border border-neutral-800 rounded-2xl p-6 shadow-xl">
                {/* Image Dropzone */}
                <div className="lg:col-span-1 space-y-3">
                    <label className="text-xs font-mono font-bold text-neutral-300 uppercase flex items-center gap-2">
                        <LucideIcon name="image" className="w-4 h-4 text-emerald-400" />
                        Foto do Produto
                    </label>

                    <div
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition flex flex-col items-center justify-center min-h-[190px] relative overflow-hidden group ${
                            productImage
                                ? 'border-emerald-500/50 bg-emerald-950/10'
                                : 'border-neutral-750 hover:border-neutral-600 bg-neutral-900/50'
                        }`}
                    >
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept="image/png,image/jpeg,image/webp"
                            className="hidden"
                        />

                        {productImage ? (
                            <div className="relative w-full h-full flex flex-col items-center justify-center">
                                <img
                                    src={productImage}
                                    alt="Produto Selecionado"
                                    className="max-h-36 object-contain rounded-lg shadow-md"
                                />
                                <div className="mt-2 text-[11px] font-mono text-neutral-300 bg-black/60 px-2 py-0.5 rounded truncate max-w-full">
                                    {imageFileName || 'Imagem carregada'}
                                </div>
                                <span className="text-[10px] text-emerald-400 font-mono mt-1 opacity-0 group-hover:opacity-100 transition">
                                    Clique ou cole (Ctrl+V / Cmd+V) para trocar
                                </span>
                            </div>
                        ) : (
                            <div className="space-y-2 flex flex-col items-center">
                                <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-400 group-hover:text-emerald-400 transition">
                                    <LucideIcon name="upload-cloud" className="w-5 h-5" />
                                </div>
                                <div className="text-xs text-neutral-300 font-medium">
                                    Arraste, clique ou cole com <span className="text-emerald-400 underline font-bold">Ctrl+V / Cmd+V</span>
                                </div>
                                <p className="text-[10px] text-neutral-500 font-mono">PNG, JPG, WEBP</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Configuration and Brain Info */}
                <div className="lg:col-span-2 flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-mono font-bold text-neutral-300 uppercase flex items-center gap-2">
                                    <LucideIcon name="cpu" className="w-4 h-4 text-emerald-400" />
                                    Motor — {VARIANT_METADATA[selectedVariant].title}
                                </span>
                                {selectedVariant === 'D' && (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 flex items-center gap-1">
                                        <LucideIcon name="shield-check" className="w-3 h-3 text-emerald-400" />
                                        Modo homologado ativo
                                    </span>
                                )}
                            </div>
                            <span className="text-[10px] font-mono text-neutral-400 bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800">
                                {VARIANT_METADATA[selectedVariant].model} • Temp {VARIANT_METADATA[selectedVariant].temperature}
                            </span>
                        </div>

                        {/* Clean D Advanced Controls (Collapsible, collapsed by default) */}
                        {selectedVariant === 'D' && (
                            <div className="border border-neutral-800 rounded-xl overflow-hidden bg-neutral-950/50">
                                <button
                                    type="button"
                                    id="toggle-advanced-settings"
                                    onClick={() => setIsAdvancedSettingsOpen(!isAdvancedSettingsOpen)}
                                    className="w-full px-3.5 py-2.5 bg-neutral-900/60 hover:bg-neutral-900 flex items-center justify-between text-xs font-mono text-neutral-300 transition cursor-pointer"
                                >
                                    <span className="flex items-center gap-2 font-bold">
                                        <LucideIcon name="sliders" className="w-3.5 h-3.5 text-emerald-400" />
                                        Configurações avançadas do motor
                                    </span>
                                    <div className="flex items-center gap-2">
                                        {(brainVariant !== 'CURRENT' || reviewerGroundingMode !== 'text_only') && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-mono">
                                                Personalizado
                                            </span>
                                        )}
                                        <LucideIcon
                                            name={isAdvancedSettingsOpen ? "chevron-up" : "chevron-down"}
                                            className="w-4 h-4 text-neutral-400 transition-transform"
                                        />
                                    </div>
                                </button>

                                {isAdvancedSettingsOpen && (
                                    <div id="advanced-settings-panel" className="p-3.5 space-y-3.5 border-t border-neutral-800 bg-neutral-950/90 text-xs font-mono">
                                        <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-900/50 text-[11px] text-amber-300/90 font-sans flex items-start gap-2">
                                            <LucideIcon name="info" className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                                            <span>Use estas opções apenas para testes e diagnóstico. O modo padrão já utiliza a configuração homologada.</span>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-[11px] text-neutral-400 block mb-1 font-bold">CÉREBRO INICIAL</label>
                                                <select
                                                    id="select-brain-variant"
                                                    value={brainVariant}
                                                    onChange={(e) => setBrainVariant(e.target.value as CleanDBrainVariant)}
                                                    className="w-full bg-neutral-900 border border-neutral-750 text-neutral-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-emerald-500 cursor-pointer"
                                                >
                                                    <option value="CURRENT">Cérebro D Atual (Sem formatação markdown)</option>
                                                    <option value="CORE_SHORT">Cérebro D Curto (Core Short Prompt)</option>
                                                </select>
                                            </div>

                                            <div>
                                                <label className="text-[11px] text-neutral-400 block mb-1 font-bold">REVISOR AUTOMÁTICO</label>
                                                <select
                                                    id="select-reviewer-mode"
                                                    value={reviewerGroundingMode}
                                                    onChange={(e) => setReviewerGroundingMode(e.target.value as CleanDReviewerGroundingMode)}
                                                    className="w-full bg-neutral-900 border border-neutral-750 text-neutral-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-emerald-500 cursor-pointer"
                                                >
                                                    <option value="text_only">Texto Apenas (Recomendado • Anti-Visual)</option>
                                                    <option value="multimodal">Multimodal (Imagem no revisor)</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="pt-2 flex justify-end">
                                            <button
                                                type="button"
                                                id="btn-reset-homologated"
                                                onClick={() => {
                                                    setBrainVariant('CURRENT');
                                                    setReviewerGroundingMode('text_only');
                                                }}
                                                disabled={brainVariant === 'CURRENT' && reviewerGroundingMode === 'text_only'}
                                                className="px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold transition flex items-center gap-1.5 cursor-pointer bg-neutral-850 hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed text-neutral-300 hover:text-white border border-neutral-750"
                                            >
                                                <LucideIcon name="rotate-ccw" className="w-3 h-3 text-neutral-400" />
                                                <span>Restaurar configuração homologada</span>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-850 text-xs text-neutral-400 space-y-1 font-mono">
                            <div className="text-neutral-300 font-bold flex items-center gap-1.5">
                                <LucideIcon name="shield-check" className="w-3.5 h-3.5 text-emerald-400" />
                                Contrato Inviolável da Suite Clean
                            </div>
                            <p className="text-[11px] leading-relaxed text-neutral-400 font-sans">
                                6 variações completas. Cada cena (Cena 2 e Cena 3) deve ter entre 160 e 175 caracteres falados. A Cena 3 exige "carrinho laranja". Proibido inventar preço, desconto, parcelamento ou estoque.
                            </p>
                        </div>
                    </div>

                    {/* Primary Generation Button */}
                    <div className="space-y-2 pt-2">
                        {error && (
                            <div className="p-3 rounded-xl bg-red-950/60 border border-red-900/80 text-red-300 text-xs font-mono flex items-center gap-2">
                                <LucideIcon name="alert-triangle" className="w-4 h-4 text-red-400 flex-shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        <button
                            type="button"
                            id="btn-generate-copies"
                            disabled={isGenerating || !productImage}
                            onClick={handleGenerate}
                            className={`w-full py-3.5 px-6 rounded-xl font-mono font-bold text-sm uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-99 ${
                                isGenerating || !productImage
                                    ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-750'
                                    : 'bg-emerald-500 hover:bg-emerald-400 text-neutral-950 shadow-emerald-950/30'
                            }`}
                        >
                            {isGenerating ? (
                                <>
                                    <LucideIcon name="loader-2" className="w-4 h-4 animate-spin text-neutral-950" />
                                    <span>Executando Suite Clean...</span>
                                </>
                            ) : activeResult ? (
                                <>
                                    <LucideIcon name="refresh-cw" className="w-4 h-4 text-neutral-950" />
                                    <span>Gerar novas 6 variações</span>
                                </>
                            ) : (
                                <>
                                    <LucideIcon name="sparkles" className="w-4 h-4 text-neutral-950" />
                                    <span>Gerar copies — Clean {selectedVariant}</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Results Section — The Copy Variation Lab */}
            {activeResult && (
                <div id="copy-variation-lab-results" className="space-y-6 animate-fade-in">
                    {/* Workflow & Usage Control Bar */}
                    <div className="bg-[#0B0B0E] border border-neutral-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono">
                        {/* Usage Counter Stats */}
                        <div className="flex items-center gap-4 flex-wrap">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse"></div>
                                <span className="text-sm font-bold text-neutral-100">
                                    {usageStats.usedCount} de {usageStats.total} variações usadas
                                </span>
                            </div>
                            <span className="text-xs text-neutral-400 bg-neutral-900 px-2.5 py-1 rounded-lg border border-neutral-800">
                                {usageStats.availableCount} disponíveis
                            </span>

                            {usageStats.usedCount > 0 && (
                                <button
                                    type="button"
                                    id="btn-clear-usage"
                                    onClick={handleClearUsed}
                                    className="text-xs text-neutral-400 hover:text-amber-300 underline underline-offset-4 transition cursor-pointer flex items-center gap-1"
                                >
                                    <LucideIcon name="rotate-ccw" className="w-3 h-3" />
                                    Limpar marcações de uso
                                </button>
                            )}
                        </div>

                        {/* Local Filters: Todas, Disponíveis, Usadas */}
                        <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded-xl p-1 text-xs self-start md:self-auto">
                            <button
                                type="button"
                                id="filter-all"
                                onClick={() => handleUpdateFilter('all')}
                                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                                    activeFilter === 'all'
                                        ? 'bg-neutral-800 text-white shadow-sm'
                                        : 'text-neutral-400 hover:text-neutral-200'
                                }`}
                            >
                                Todas ({totalVariations})
                            </button>
                            <button
                                type="button"
                                id="filter-available"
                                onClick={() => handleUpdateFilter('available')}
                                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                                    activeFilter === 'available'
                                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/80 shadow-sm'
                                        : 'text-neutral-400 hover:text-neutral-200'
                                }`}
                            >
                                Disponíveis ({usageStats.availableCount})
                            </button>
                            <button
                                type="button"
                                id="filter-used"
                                onClick={() => handleUpdateFilter('used')}
                                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                                    activeFilter === 'used'
                                        ? 'bg-neutral-800 text-neutral-200 border border-neutral-700 shadow-sm'
                                        : 'text-neutral-400 hover:text-neutral-200'
                                }`}
                            >
                                Usadas ({usageStats.usedCount})
                            </button>
                        </div>
                    </div>

                    {/* 6 Variation Cards Grid */}
                    {visibleVariations.length === 0 ? (
                        <div className="bg-[#0B0B0E] border border-neutral-800 rounded-2xl p-12 text-center space-y-3 font-mono">
                            <LucideIcon name="inbox" className="w-8 h-8 text-neutral-500 mx-auto" />
                            <p className="text-sm text-neutral-400">
                                Nenhuma variação encontrada para o filtro <span className="text-emerald-400 uppercase font-bold">"{activeFilter}"</span>.
                            </p>
                            <button
                                type="button"
                                onClick={() => handleUpdateFilter('all')}
                                className="px-4 py-2 rounded-xl bg-neutral-850 hover:bg-neutral-800 text-neutral-200 text-xs font-bold transition cursor-pointer"
                            >
                                Mostrar todas as variações
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {visibleVariations.map((v) => (
                                <LabVariationCard
                                    key={v.id}
                                    variation={v}
                                    validationResult={activeResult.validation}
                                    variant={selectedVariant}
                                    isUsed={usedVariationIds.includes(v.id)}
                                    onToggleUsed={handleToggleUsed}
                                    onSingleSceneRepair={handleSingleSceneRepair}
                                    repairingScene={repairingScene}
                                    isGenerating={isGenerating}
                                    repairError={sceneRepairErrors[`v${v.id}_scene2`] || sceneRepairErrors[`v${v.id}_scene3`]}
                                    copiedKey={copiedKey}
                                    onCopy={handleCopy}
                                />
                            ))}
                        </div>
                    )}

                    {/* Advanced Diagnostics Panel (Collapsed by Default) */}
                    <LabDiagnosticsPanel
                        activeResult={activeResult}
                        resultsByVariant={resultsByVariant}
                        copiedRaw={copiedRaw}
                        copiedR1={copiedR1}
                        copiedR2={copiedR2}
                        onCopyRaw={handleCopyRaw}
                    />
                </div>
            )}

            {/* Footer Sync & Session Status Bar */}
            <div className="pt-4 border-t border-neutral-850 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] font-mono text-neutral-500">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${lastSavedTimestamp ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-600'}`}></div>
                    <span className="text-neutral-400 font-semibold">AUTO-SAVE SYNC</span>
                    {lastSavedTimestamp ? (
                        <span className="text-neutral-400">
                            • Sessão salva às {new Date(lastSavedTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                    ) : (
                        <span className="text-neutral-500">• Aguardando geração de copies</span>
                    )}
                </div>
                <div className="flex items-center gap-3 text-neutral-400">
                    <span>SUITE CLEAN • PERSISTÊNCIA DURÁVEL</span>
                </div>
            </div>
        </div>
    );
};
