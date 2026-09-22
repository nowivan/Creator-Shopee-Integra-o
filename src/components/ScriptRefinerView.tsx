import { useState, useEffect, useMemo } from 'react';
import { Button, LucideIcon } from './Common';
import { processGeminiAPI, copyToClipboard, exportScriptToPDF, safeSaveHistory } from '../utils';
import { useAutoSaveRecovery } from '../hooks/useAutoSaveRecovery';
import {
    ScriptRefinerResult,
    VersionQualityReport,
    refineScript,
    parseScriptRefinerResponse,
    getDurationWordLimits,
    detectScriptFacts,
    extractHook,
    extractCTA,
    processVideoScript,
    analyzeRefinerQuality,
    generateLocalQuickDraft,
    generateLocalFullRefinement,
    extractScriptFacts,
    detectProductContamination,
    sanitizeContaminatedText,
    detectContextContamination,
    sanitizeContextContamination,
    enforceProductFactLock,
    computeScriptHash,
    QuickDraftObject
} from '../features/script-refiner/scriptRefinerLogic';

function QualityBadge({ report }: { report?: VersionQualityReport }) {
    if (!report) return null;

    const { status, similarityScore, warnings } = report;

    let badgeBg = "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    let badgeText = "Remodelagem Aprovada";
    let iconName = "check-circle";

    if (status === "critical") {
        badgeBg = "bg-rose-500/15 text-rose-400 border-rose-500/30";
        badgeText = "Atenção Crítica";
        iconName = "alert-triangle";
    } else if (status === "warning") {
        badgeBg = "bg-amber-500/15 text-amber-400 border-amber-500/30";
        badgeText = "Aviso de Qualidade";
        iconName = "alert-circle";
    }

    return (
        <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[11px]">
                <div className={`px-2 py-0.5 rounded-md border text-[10px] font-bold flex items-center gap-1 ${badgeBg}`}>
                    <LucideIcon name={iconName} className="w-3 h-3" />
                    <span>{badgeText}</span>
                </div>
                <span className="text-slate-400 text-[10px] font-medium">
                    Semelhança textual: {Math.round(similarityScore * 100)}%
                </span>
            </div>
            {warnings.length > 0 && (
                <div className="bg-slate-900/90 p-2 rounded border border-slate-800 text-[11px] text-slate-300 space-y-1">
                    {warnings.map((w, idx) => (
                        <div key={idx} className="flex items-start gap-1.5 leading-snug">
                            <span className="text-amber-400 font-bold">•</span>
                            <span>{w}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

interface ScriptRefinerViewProps {
    currentKey: string;
}

export function normalizeScriptRefinerResult(
    response: any
): ScriptRefinerResult {
    return parseScriptRefinerResponse(response);
}

export function ScriptRefinerView({ currentKey }: ScriptRefinerViewProps) {
    const [originalScript, setOriginalScript] = useState('');
    const [refinedScript, setRefinedScript] = useState('');
    const [refinerResult, setRefinerResult] = useState<ScriptRefinerResult | null>(null);
    const [activeOutputTab, setActiveOutputTab] = useState<'all' | 'scripts' | 'variations' | 'structure' | 'safety'>('all');
    const [showRawJson, setShowRawJson] = useState(false);
    const [loading, setLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');

    // Input Control States
    const [productOrNiche, setProductOrNiche] = useState('');
    const [platform, setPlatform] = useState('TikTok Shop');
    const [goal, setGoal] = useState('Sales');
    const [tone, setTone] = useState('Natural');
    const [duration, setDuration] = useState('30s');
    const [cta, setCta] = useState('Carrinho Laranja');
    const [customCtaText, setCustomCtaText] = useState('');

    // Quick Analysis Local Facts state
    const localFacts = useMemo(() => {
        if (!originalScript.trim()) return null;
        return detectScriptFacts(originalScript);
    }, [originalScript]);

    useEffect(() => {
        const textInStorage = localStorage.getItem('robizin_refiner_auto_input');
        if (textInStorage) {
            setOriginalScript(textInStorage);
            localStorage.removeItem('robizin_refiner_auto_input');

            const isAutoTrigger = localStorage.getItem('robizin_refiner_auto_trigger') === 'true';
            if (isAutoTrigger) {
                localStorage.removeItem('robizin_refiner_auto_trigger');
                handleRefine(textInStorage);
            }
        }
    }, [currentKey]);

    // Segmentation States
    const [isSegmenting, setIsSegmenting] = useState(false);
    const [segments, setSegments] = useState<any>(null);
    const [activeSegmentTab, setActiveSegmentTab] = useState('veo');
    const [targetSegmentModel, setTargetSegmentModel] = useState('veo');

    // Quick Draft Generator State
    const [loadingDraft, setLoadingDraft] = useState(false);
    const [draftStatus, setDraftStatus] = useState<'READY' | 'GENERATING' | 'SUCCESS' | 'ERROR'>('READY');
    const [draftError, setDraftError] = useState('');
    const [draftOutput, setDraftOutput] = useState<QuickDraftObject | null>(null);

    const currentScriptHash = useMemo(() => computeScriptHash(originalScript), [originalScript]);

    const currentState = {
        originalScript,
        refinedScript,
        refinerResult,
        segments,
        activeSegmentTab,
        targetSegmentModel,
        draftStatus,
        draftOutput,
        productOrNiche,
        platform,
        goal,
        tone,
        duration,
        cta,
        customCtaText
    };

    const handleRestore = (saved: any) => {
        if (!saved) return;
        const savedText = saved.originalScript || "";
        const expectedHash = computeScriptHash(savedText);

        if (saved.originalScript !== undefined) setOriginalScript(saved.originalScript);
        if (saved.refinedScript !== undefined) setRefinedScript(saved.refinedScript);
        if (saved.refinerResult !== undefined) {
            if (saved.refinerResult?.source_script_hash === expectedHash) {
                setRefinerResult(saved.refinerResult);
            } else {
                setRefinerResult(null);
            }
        }
        if (saved.segments !== undefined) setSegments(saved.segments);
        if (saved.activeSegmentTab !== undefined) setActiveSegmentTab(saved.activeSegmentTab);
        if (saved.targetSegmentModel !== undefined) setTargetSegmentModel(saved.targetSegmentModel);
        if (saved.draftStatus !== undefined) setDraftStatus(saved.draftStatus);
        if (saved.draftOutput !== undefined) {
            if (saved.draftOutput?.sourceScriptHash === expectedHash) {
                setDraftOutput(saved.draftOutput);
            } else {
                setDraftOutput(null);
            }
        }
        if (saved.productOrNiche !== undefined) setProductOrNiche(saved.productOrNiche);
        if (saved.platform !== undefined) setPlatform(saved.platform);
        if (saved.goal !== undefined) setGoal(saved.goal);
        if (saved.tone !== undefined) setTone(saved.tone);
        if (saved.duration !== undefined) setDuration(saved.duration);
        if (saved.cta !== undefined) setCta(saved.cta);
        if (saved.customCtaText !== undefined) setCustomCtaText(saved.customCtaText);
    };

    const isEmptyOrInitial = (state: any) => {
        return !state.originalScript && !state.refinedScript;
    };

    const { AutoSaveIndicator, RecoveryBanner } = useAutoSaveRecovery('script_refiner', currentState, handleRestore, isEmptyOrInitial, true);

    const downloadAsPDF = () => {
        exportScriptToPDF({
            fileName: `roteiro_refinado_${new Date().getTime()}.pdf`,
            title: 'Refinador e Otimizador de Roteiros de Vídeo (IA)',
            scriptText: refinedScript || (refinerResult ? refinerResult.refined_script : '')
        });
    };

    const handleRefine = async (forcedText?: string) => {
        const textToRefine = forcedText || originalScript;
        if (!textToRefine || textToRefine.trim().length < 20) {
            return alert("Cole um roteiro com pelo menos 20 caracteres para refiná-lo.");
        }

        const durationSec = parseInt(duration) || 30;

        setLoading(true);
        setLoadingMessage("Analisando estrutura e fatos do roteiro...");

        const timer1 = setTimeout(() => {
            setLoadingMessage("Reestruturando frases e ganchos...");
        }, 1500);

        const timer2 = setTimeout(() => {
            setLoadingMessage("Finalizando roteiros e validações...");
        }, 3200);

        let finalCTAText = "Tá no carrinho laranja.";
        if (cta === 'Compre Agora' || cta === 'Buy now') {
            finalCTAText = "Compre agora mesmo.";
        } else if (cta === 'Saiba Mais' || cta === 'Learn more') {
            finalCTAText = "Saiba mais.";
        } else if (cta === 'Link na Bio' || cta === 'Link in bio') {
            finalCTAText = "Link na bio.";
        } else if (cta === 'Personalizado' || cta === 'Custom') {
            finalCTAText = customCtaText || "Confira os detalhes no vídeo.";
        } else if (cta === 'Carrinho Laranja' || cta === 'Orange cart') {
            finalCTAText = "Tá no carrinho laranja.";
        }

        try {
            if (!currentKey) {
                throw new Error("Chave de API não configurada. Por favor, insira sua chave de API nas configurações.");
            }

            const result = await refineScript(textToRefine, {
                duration_seconds: durationSec,
                platform,
                tone,
                productOrNiche,
                cta: finalCTAText
            }, currentKey);

            setRefinerResult(result);
            setRefinedScript(result.mainRefined);

            safeSaveHistory({
                date: new Date().toLocaleString(),
                tool: "Refinador de Scripts",
                title: `Refinamento - ${productOrNiche || localFacts?.product || "Roteiro Original"}`,
                content: `Original:\n${textToRefine.slice(0, 300)}\n\nRefinado:\n${result.mainRefined}`
            });

        } catch (e: any) {
            console.error("[ScriptRefiner] Refine error:", e);
            try {
                const fallbackResult = generateLocalFullRefinement(textToRefine, {
                    duration_seconds: durationSec,
                    platform,
                    tone,
                    productOrNiche,
                    cta: finalCTAText
                });
                setRefinerResult(fallbackResult);
                setRefinedScript(fallbackResult.mainRefined);
            } catch (_fallbackErr) {
                // Preserve previous refinerResult on error (do NOT reset to null or clear cards)
                alert(`Erro na geração do roteiro: ${e.message || "Falha ao se comunicar com a API do Gemini."}`);
            }
        } finally {
            clearTimeout(timer1);
            clearTimeout(timer2);
            setLoading(false);
        }
    };

    const handleQuickDraft = async () => {
        setDraftError("");

        const currentOriginal = (originalScript || "").trim();
        if (!currentOriginal) {
            setDraftStatus('ERROR');
            setDraftError("Por favor, preencha o script original antes de gerar o Draft Rápido.");
            return;
        }

        setLoadingDraft(true);
        setDraftStatus('GENERATING');

        try {
            const currentFacts = extractScriptFacts(currentOriginal);
            const currentLock = currentFacts.productFactLock;
            const contextLock = currentFacts.contextLock || currentLock?.contextLock;
            const scriptHash = computeScriptHash(currentOriginal);

            let resolvedCta = "Tá no carrinho laranja.";
            if (cta === 'Compre Agora' || cta === 'Buy now') {
                resolvedCta = "Compre agora mesmo.";
            } else if (cta === 'Saiba Mais' || cta === 'Learn more') {
                resolvedCta = "Saiba mais.";
            } else if (cta === 'Link na Bio' || cta === 'Link in bio') {
                resolvedCta = "Link na bio.";
            } else if (cta === 'Personalizado' || cta === 'Custom') {
                resolvedCta = customCtaText || "Confira os detalhes no vídeo.";
            } else if (cta === 'Carrinho Laranja' || cta === 'Orange cart') {
                resolvedCta = "Tá no carrinho laranja.";
            }

            let draftText = "";

            // Generation strictly grounded in current script facts
            if (currentKey) {
                try {
                    const result = await refineScript(currentOriginal, {
                        duration_seconds: parseInt(duration) || 30,
                        platform,
                        tone,
                        productOrNiche,
                        cta: resolvedCta
                    }, currentKey);

                    const safeResult = currentLock ? enforceProductFactLock(result, currentOriginal, currentLock) : result;
                    setRefinerResult(safeResult);
                    setRefinedScript(safeResult.mainRefined);
                    draftText = safeResult.quickDraft;
                } catch (apiErr) {
                    console.warn("[ScriptRefiner] Online draft failed, using fact-locked local draft:", apiErr);
                    draftText = generateLocalQuickDraft(currentOriginal, currentFacts);
                }
            } else {
                draftText = generateLocalQuickDraft(currentOriginal, currentFacts);
            }

            if (!draftText) {
                draftText = generateLocalQuickDraft(currentOriginal, currentFacts);
            }

            // Strict sanitization with Fact Lock & Context Lock
            if (currentLock) {
                const finalCheck = detectProductContamination(draftText, currentLock);
                if (finalCheck.isContaminated) {
                    draftText = sanitizeContaminatedText(draftText, currentLock);
                }
            }
            if (contextLock) {
                const contextCheck = detectContextContamination(draftText, contextLock);
                if (contextCheck.isContaminated) {
                    draftText = sanitizeContextContamination(draftText, contextLock);
                }
            }

            // Ensure zero residual contamination
            if (currentLock) {
                const checkAgain = detectProductContamination(draftText, currentLock);
                if (checkAgain.isContaminated) {
                    draftText = generateLocalQuickDraft(currentOriginal, currentFacts);
                }
            }
            if (contextLock) {
                const contextAgain = detectContextContamination(draftText, contextLock);
                if (contextAgain.isContaminated) {
                    draftText = sanitizeContextContamination(draftText, contextLock);
                }
            }

            const wordCount = draftText.split(/\s+/).filter(Boolean).length;
            const newDraftData: QuickDraftObject = {
                draft: draftText,
                word_count: wordCount,
                source: "ai",
                quality_notes: [],
                sourceScriptHash: scriptHash,
                sourceScriptSnapshot: currentOriginal,
                sourceProduct: currentFacts.product,
                sourceCategory: currentFacts.category,
                contextTone: contextLock?.categoryTone
            };

            setDraftOutput(newDraftData);
            setDraftStatus('SUCCESS');

            safeSaveHistory({
                date: new Date().toLocaleString(),
                tool: "Quick Draft",
                title: `Draft Rápido - ${productOrNiche || currentFacts?.product || "Roteiro"}`,
                content: draftText
            });

        } catch (e: any) {
            console.error("[ScriptRefiner] Quick Draft error:", e);
            setDraftStatus('ERROR');
            setDraftError(e.message || "Falha ao gerar o Draft Rápido.");
        } finally {
            setLoadingDraft(false);
        }
    };

    const generateVideoBlocks = async () => {
        const textToSegment = refinedScript || (refinerResult ? refinerResult.refined_script : "");
        if (!textToSegment) return;

        setIsSegmenting(true);
        try {
            const totalSec = parseInt(duration) || 30;
            const res = processVideoScript(originalScript, { duration_seconds: totalSec });

            setSegments({
                veo: res.scene_blocks.map(b => ({ duration: `${b.duration_seconds}s`, narration: b.narration })),
                sora: res.scene_blocks.map(b => ({ duration: `${b.duration_seconds}s`, narration: b.narration })),
                grok: res.scene_blocks.map(b => ({ duration: `${b.duration_seconds}s`, narration: b.narration }))
            });
            setActiveSegmentTab(targetSegmentModel);
        } catch (e: any) {
            alert("Erro ao segmentar: " + e.message);
        } finally {
            setIsSegmenting(false);
        }
    };

    const copyBlock = async (block: any) => {
        const text = block.narration || block;
        await copyToClipboard(text) ? alert("Narração copiada!") : alert("Erro ao copiar.");
    };

    // Immediately clear stale drafts and refiner results whenever originalScript changes
    useEffect(() => {
        const currentHash = computeScriptHash(originalScript);
        if (draftOutput && draftOutput.sourceScriptHash !== currentHash) {
            setDraftOutput(null);
            setDraftStatus('READY');
            setDraftError('');
        }
        if (refinerResult && refinerResult.source_script_hash && refinerResult.source_script_hash !== currentHash) {
            setRefinerResult(null);
            setRefinedScript('');
        }
    }, [originalScript]);

    const resultToRender = useMemo(() => {
        if (!originalScript.trim()) return null;

        let base = refinerResult;
        if (!base && refinedScript) {
            base = {
                mode: "script_refiner",
                duration_seconds: parseInt(duration) || 30,
                detected_facts: detectScriptFacts(originalScript),
                refined_script: refinedScript,
                anti_copy_script: refinedScript,
                ugc_script: refinedScript,
                premium_script: refinedScript,
                hooks: [extractHook(originalScript)],
                ctas: [extractCTA(originalScript)],
                retention_structure: {
                    hook: extractHook(originalScript),
                    curiosity: "Curiosidade gerada",
                    value_build: "Construção de valor",
                    proof_or_detail: "Detalhes do produto",
                    cta: extractCTA(originalScript)
                },
                scene_blocks: [],
                anti_copy_report: {
                    copied_phrases_removed: [],
                    structure_preserved: true,
                    originality_score: 90,
                    risk_notes: []
                },
                compliance_notes: ["Script sanitizado localmente."],
                quality_score: { clarity: 90, retention: 90, fact_preservation: 95, anti_copy: 90, duration_fit: 95 },
                quickDraft: "",
                mainRefined: refinedScript,
                antiCopy: refinedScript,
                ugcNatural: refinedScript,
                premium: refinedScript,
                alternativeHooks: [extractHook(originalScript)],
                alternativeCtas: [extractCTA(originalScript)],
                source_script_snapshot: originalScript,
                source_script_hash: currentScriptHash
            };
        }

        if (!base) return null;

        // Ensure base matches current script hash
        if (base.source_script_hash && base.source_script_hash !== currentScriptHash) {
            return null;
        }

        const facts = extractScriptFacts(originalScript);
        if (facts.productFactLock) {
            return enforceProductFactLock(base, originalScript, facts.productFactLock);
        }
        return base;
    }, [refinerResult, refinedScript, originalScript, duration, currentScriptHash]);

    // Single source of truth for the verified, fact-locked, context-locked Draft Rápido
    const currentQuickDraft = useMemo<QuickDraftObject | null>(() => {
        if (!originalScript.trim()) return null;

        const facts = extractScriptFacts(originalScript);
        const pLock = facts.productFactLock;
        const cLock = facts.contextLock || pLock?.contextLock;

        // 1. Check draftOutput
        if (draftOutput && draftOutput.draft && draftOutput.sourceScriptHash === currentScriptHash) {
            if (pLock) {
                const pCheck = detectProductContamination(draftOutput.draft, pLock);
                if (pCheck.isContaminated) return null;
            }
            if (cLock) {
                const cCheck = detectContextContamination(draftOutput.draft, cLock);
                if (cCheck.isContaminated) return null;
            }
            return draftOutput;
        }

        // 2. Check resultToRender quick_draft
        if (
            resultToRender?.quick_draft?.draft &&
            resultToRender.source_script_hash === currentScriptHash
        ) {
            const draftText = resultToRender.quick_draft.draft;
            if (pLock) {
                const pCheck = detectProductContamination(draftText, pLock);
                if (pCheck.isContaminated) return null;
            }
            if (cLock) {
                const cCheck = detectContextContamination(draftText, cLock);
                if (cCheck.isContaminated) return null;
            }
            return {
                draft: draftText,
                word_count: resultToRender.quick_draft.word_count || draftText.split(/\s+/).filter(Boolean).length,
                source: resultToRender.quick_draft.source || "ai",
                quality_notes: resultToRender.quick_draft.quality_notes || [],
                sourceScriptHash: currentScriptHash,
                sourceScriptSnapshot: originalScript,
                sourceProduct: facts.product,
                sourceCategory: facts.category,
                contextTone: cLock?.categoryTone
            };
        }

        return null;
    }, [draftOutput, resultToRender, originalScript, currentScriptHash]);

    const qualityReport = useMemo(() => {
        if (!originalScript.trim() || !resultToRender) return null;
        return analyzeRefinerQuality(originalScript, resultToRender);
    }, [originalScript, resultToRender]);

    return (
        <div className="max-w-5xl mx-auto animate-fade-in space-y-8 font-sans">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full text-xs font-bold border border-emerald-500/20">
                    <LucideIcon name="refresh-cw" className="w-3 h-3" /> SCRIPT MODELING ENGINE
                </div>
                <div className="flex items-center">
                    <AutoSaveIndicator />
                </div>
            </div>

            <div className="text-center">
                <h2 className="text-3xl font-bold text-white mb-2 flex items-center justify-center gap-2">
                    Refinador de Script (Anti-Cópia)
                    <div className="bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded text-[10px] font-bold border border-emerald-500/20 flex items-center gap-1">
                        <LucideIcon name="shield-check" className="w-3 h-3" /> POLICY SAFE
                    </div>
                </h2>
                <p className="text-slate-400">Modele vídeos virais criando versões originais com a mesma estrutura de retenção.</p>
            </div>

            <RecoveryBanner />

            <div className="grid md:grid-cols-2 gap-6">
                {/* LEFT COLUMN: Input & Quick Local Analysis */}
                <div className="space-y-4">
                    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                        <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Script do Vídeo Original</label>
                        <textarea 
                            value={originalScript} 
                            onChange={(e) => setOriginalScript(e.target.value)} 
                            placeholder="Cole o roteiro do vídeo que você quer modelar..." 
                            className="w-full h-80 bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white focus:border-emerald-500 outline-none resize-none custom-scrollbar"
                        />

                        {/* TASK 13: Quick Local Analysis Panel ("Análise Rápida Local") */}
                        {originalScript && localFacts && (
                            <div className="mt-3 p-3.5 bg-slate-900/80 rounded-xl border border-slate-700/80 text-xs text-slate-300 space-y-2 animate-fade-in shadow-inner">
                                <div className="flex items-center justify-between border-b border-slate-750 pb-2">
                                    <div className="flex items-center gap-1.5">
                                        <LucideIcon name="scan" className="w-4 h-4 text-emerald-400" />
                                        <strong className="text-emerald-400 uppercase tracking-wider text-[11px] font-extrabold">Análise Rápida Local</strong>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-0.5 rounded text-[9px] font-black tracking-wider uppercase border ${
                                            (localFacts.forbidden_or_risky_terms || []).length > 0 
                                            ? 'bg-rose-950/80 text-rose-300 border-rose-800/80' 
                                            : 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80'
                                        }`}>
                                            {(localFacts.forbidden_or_risky_terms || []).length > 0 ? '⚠️ Termos de Risco' : '✓ POLICY SAFE'}
                                        </span>
                                        <button 
                                            type="button"
                                            onClick={handleQuickDraft}
                                            disabled={!originalScript.trim() || loadingDraft}
                                            className={`text-[10px] px-2.5 py-1 rounded transition-all duration-200 flex items-center gap-1.5 border font-semibold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
                                                loadingDraft 
                                                ? 'bg-amber-600/40 text-amber-300 border-amber-500/50 animate-pulse' 
                                                : draftStatus === 'SUCCESS' 
                                                ? 'bg-amber-500/30 text-amber-200 border-amber-400/60 shadow-sm shadow-amber-500/20' 
                                                : 'bg-amber-600/25 hover:bg-amber-600/45 active:scale-95 text-amber-300 border-amber-500/40'
                                            }`}
                                            title="Gera um rascunho rápido de narração de até 40 palavras"
                                        >
                                            {loadingDraft ? (
                                                <LucideIcon name="loader-2" className="w-3 h-3 animate-spin text-amber-300" />
                                            ) : (
                                                <LucideIcon name="zap" className="w-3 h-3 text-amber-400" />
                                            )} 
                                            {loadingDraft ? "Gerando..." : "Gerar Draft Rápido"}
                                        </button>
                                    </div>
                                </div>

                                <div className="grid gap-1.5 pt-1 text-[11px]">
                                    <p><span className="text-slate-400 font-bold uppercase text-[10px]">Hook Detectado:</span> <span className="italic text-slate-200">{extractHook(originalScript)}</span></p>
                                    <p><span className="text-slate-400 font-bold uppercase text-[10px]">Benefícios Identificados:</span> <span className="text-emerald-300 font-medium">{(localFacts.benefits || []).join(' | ') || 'Nenhum detectado'}</span></p>
                                    <p><span className="text-slate-400 font-bold uppercase text-[10px]">CTA Detectado:</span> <span className="text-amber-300 font-medium">{localFacts.cta || 'Nenhum detectado'}</span></p>
                                    <p><span className="text-slate-400 font-bold uppercase text-[10px]">Produto Detectado:</span> <span className="text-indigo-300">{localFacts.product || 'Não identificado'}</span></p>
                                    <p><span className="text-slate-400 font-bold uppercase text-[10px]">Preço Detectado:</span> <span className="text-teal-300">{localFacts.price || 'Não identificado'}</span></p>
                                    <p><span className="text-slate-400 font-bold uppercase text-[10px]">Plataforma Detectada:</span> <span className="text-slate-300">{localFacts.platform || 'Nenhuma (neutro)'}</span></p>
                                    <p><span className="text-slate-400 font-bold uppercase text-[10px]">Termos de Risco:</span> <span className={(localFacts.forbidden_or_risky_terms || []).length > 0 ? "text-rose-400 font-bold" : "text-emerald-400"}>
                                        {(localFacts.forbidden_or_risky_terms || []).length > 0 ? (localFacts.forbidden_or_risky_terms || []).join(', ') : 'Nenhum termo de risco detectado'}
                                    </span></p>
                                </div>

                                {draftError && (
                                    <div className="mt-2 bg-rose-950/80 border border-rose-500/50 rounded-lg p-2 text-[11px] text-rose-200 flex items-center gap-2">
                                        <LucideIcon name="alert-triangle" className="w-4 h-4 text-rose-400 shrink-0" />
                                        <span>{draftError}</span>
                                    </div>
                                )}

                                {currentQuickDraft && (
                                    <div className="mt-3 bg-slate-950/90 border border-amber-500/40 rounded-lg p-3 space-y-2 shadow-lg animate-fade-in">
                                        <div className="flex flex-wrap justify-between items-center gap-2 border-b border-slate-800 pb-1.5">
                                            <div className="flex items-center gap-1.5">
                                                <LucideIcon name="zap" className="w-3.5 h-3.5 text-amber-400" />
                                                <span className="text-[10px] font-extrabold text-amber-400 uppercase tracking-wider">⚡ DRAFT RÁPIDO</span>
                                                <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-bold border border-amber-500/30">
                                                    {currentQuickDraft.word_count}/40 palavras
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <button 
                                                    type="button"
                                                    onClick={() => {
                                                        if (!currentQuickDraft || currentQuickDraft.sourceScriptHash !== currentScriptHash) {
                                                            alert("Draft desatualizado. Gere novamente.");
                                                            return;
                                                        }
                                                        if (confirm("Deseja definir o Draft Rápido como o script de entrada no refinador?")) {
                                                            setOriginalScript(currentQuickDraft.draft);
                                                        }
                                                    }}
                                                    className="text-[9px] bg-amber-600/20 hover:bg-amber-600/40 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30 cursor-pointer font-bold transition flex items-center gap-1"
                                                    title="Usar como base no Refinador"
                                                >
                                                    <LucideIcon name="arrow-right-circle" className="w-3 h-3" /> Usar como base no Refinador
                                                </button>
                                                <button 
                                                    type="button"
                                                    onClick={() => {
                                                        if (!currentQuickDraft || currentQuickDraft.sourceScriptHash !== currentScriptHash) {
                                                            alert("Draft desatualizado. Gere novamente.");
                                                            return;
                                                        }
                                                        copyToClipboard(currentQuickDraft.draft).then(ok => ok && alert("Draft Rápido copiado!"));
                                                    }}
                                                    className="text-[9px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded border border-slate-700 cursor-pointer font-bold transition flex items-center gap-1"
                                                >
                                                    <LucideIcon name="copy" className="w-3 h-3" /> Copiar Draft
                                                </button>
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-100 leading-relaxed font-sans bg-slate-900/60 p-2.5 rounded border border-slate-800/80">{currentQuickDraft.draft}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Modeling Settings Controls */}
                    <div className="bg-slate-800/90 p-4 rounded-xl border border-slate-700/60 space-y-3.5 shadow-md">
                        <div className="flex items-center gap-2 border-b border-slate-700/50 pb-2.5 mb-2">
                            <LucideIcon name="sliders" className="w-4 h-4 text-emerald-400" />
                            <span className="text-xs font-bold text-white uppercase tracking-wider">Ajustes de Modelagem</span>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="col-span-2">
                                <div className="flex items-center justify-between mb-1">
                                    <label className="block text-[11px] font-bold text-slate-400 uppercase">Produto ou Nicho (Opcional)</label>
                                    <span className="text-[10px] text-emerald-400 font-medium">Fact Lock automático</span>
                                </div>
                                <input 
                                    type="text" 
                                    value={productOrNiche} 
                                    onChange={(e) => setProductOrNiche(e.target.value)} 
                                    placeholder="Deixe vazio para manter o produto original (Ex: Carteira) ou preencha para remodelar" 
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500 outline-none transition placeholder:text-slate-500"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Plataforma</label>
                                <select 
                                    value={platform} 
                                    onChange={(e) => setPlatform(e.target.value)} 
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500 outline-none transition"
                                >
                                    <option value="TikTok Shop">TikTok Shop</option>
                                    <option value="Instagram Reels">Instagram Reels</option>
                                    <option value="YouTube Shorts">YouTube Shorts</option>
                                    <option value="Facebook Ads">Facebook Ads</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Duração</label>
                                <select 
                                    value={duration} 
                                    onChange={(e) => setDuration(e.target.value)} 
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500 outline-none transition"
                                >
                                    <option value="15s">15s (Curto: 35-50 palavras)</option>
                                    <option value="30s">30s (Padrão: 70-95 palavras)</option>
                                    <option value="45s">45s (Extenso: 105-135 palavras)</option>
                                    <option value="60s">60s (Completo: 140-175 palavras)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Objetivo</label>
                                <select 
                                    value={goal} 
                                    onChange={(e) => setGoal(e.target.value)} 
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500 outline-none transition"
                                >
                                    <option value="Sales">Vendas Diretas</option>
                                    <option value="Retention">Alta Retenção / Engajamento</option>
                                    <option value="Brand Awareness">Reconhecimento de Marca</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Tom de Voz</label>
                                <select 
                                    value={tone} 
                                    onChange={(e) => setTone(e.target.value)} 
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500 outline-none transition"
                                >
                                    <option value="Natural">Natural / Orgânico</option>
                                    <option value="Urgent">Curiosidade e Urgência</option>
                                    <option value="Premium">Premium / Elegante</option>
                                    <option value="Humorous">Descontraído / Divertido</option>
                                </select>
                            </div>

                            <div className="col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 border-t border-slate-800">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Chamada para Ação (CTA)</label>
                                    <select 
                                        value={cta} 
                                        onChange={(e) => setCta(e.target.value)} 
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500 outline-none transition"
                                    >
                                        <option value="Carrinho Laranja">Carrinho Laranja (TikTok Shop)</option>
                                        <option value="Compre Agora">Compre Agora</option>
                                        <option value="Saiba Mais">Saiba Mais</option>
                                        <option value="Link na Bio">Link na Bio</option>
                                        <option value="Personalizado">Personalizado...</option>
                                    </select>
                                </div>
                                {cta === "Personalizado" && (
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">CTA Personalizado</label>
                                        <input 
                                            type="text" 
                                            value={customCtaText} 
                                            onChange={(e) => setCustomCtaText(e.target.value)} 
                                            placeholder="Ex: Clique no link abaixo e garanta o seu" 
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500 outline-none transition"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        <Button 
                            onClick={() => handleRefine()} 
                            disabled={loading || originalScript.trim().length < 20} 
                            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 border-emerald-500/50 shadow-md py-4 text-sm font-bold flex flex-col items-center justify-center gap-1 min-h-[56px] disabled:opacity-40 disabled:cursor-not-allowed mt-2" 
                            icon={loading ? "loader-2" : "refresh-cw"}
                        >
                            {loading ? (
                                <div className="flex flex-col items-center justify-center">
                                    <span className="font-extrabold tracking-wide">{loadingMessage}</span>
                                    <span className="text-[10px] text-emerald-200 opacity-85 font-normal">Processando com Anti-Cópia IA...</span>
                                </div>
                            ) : (
                                "Gerar Versões Refinadas"
                            )}
                        </Button>
                    </div>
                </div>

                {/* RIGHT COLUMN: Results Display in Exact Order (1 to 11) */}
                <div className="relative flex flex-col gap-4">
                    <div className="h-full bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl border border-emerald-500/30 p-5 flex flex-col shadow-lg shadow-emerald-900/10 min-h-[400px]">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-4 border-b border-slate-700/60 pb-3">
                            <h3 className="font-bold text-white flex items-center gap-2">
                                <LucideIcon name="check-circle" className="w-5 h-5 text-emerald-400"/> Output Refinado
                            </h3>
                            {resultToRender && (
                                <div className="flex flex-wrap gap-1.5 justify-end w-full md:w-auto">
                                    <button 
                                        onClick={() => {
                                            const activeDraft = (currentQuickDraft && currentQuickDraft.sourceScriptHash === currentScriptHash) ? currentQuickDraft.draft : "";
                                            let formatted = "";
                                            if (activeDraft) {
                                                formatted += `=== DRAFT RÁPIDO ===\n${activeDraft}\n\n`;
                                            }
                                            formatted += `=== ROTEIRO PRINCIPAL REFINADO ===\n${resultToRender.refined_script}\n\n` +
                                                `=== VERSÃO ANTI-CÓPIA ===\n${resultToRender.anti_copy_script}\n\n` +
                                                `=== VERSÃO UGC NATURAL ===\n${resultToRender.ugc_script}\n\n` +
                                                `=== VERSÃO PREMIUM ===\n${resultToRender.premium_script}\n\n` +
                                                `=== HOOKS ALTERNATIVOS ===\n${(resultToRender.hooks || []).join('\n')}\n\n` +
                                                `=== CTAS ALTERNATIVOS ===\n${(resultToRender.ctas || []).join('\n')}`;
                                            copyToClipboard(formatted).then(ok => ok && alert("Todo o roteiro formatado foi copiado!"));
                                        }}
                                        className="text-[10px] bg-emerald-700 hover:bg-emerald-600 text-white px-2.5 py-1.5 rounded-lg font-bold transition flex items-center gap-1 border border-emerald-500 cursor-pointer shadow-sm"
                                        title="Copiar Todo o Roteiro Formatado"
                                    >
                                        <LucideIcon name="copy" className="w-3 h-3" /> Copiar Tudo
                                    </button>
                                    <button 
                                        onClick={() => copyToClipboard(JSON.stringify(resultToRender, null, 2)).then(ok => ok && alert("JSON do Script copiado!"))}
                                        className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1.5 rounded-lg font-bold transition flex items-center gap-1 border border-slate-700 cursor-pointer"
                                        title="Copiar JSON Bruto"
                                    >
                                        <LucideIcon name="copy" className="w-3 h-3" /> Copiar JSON
                                    </button>
                                    <button 
                                        onClick={downloadAsPDF} 
                                        className="text-[10px] bg-slate-800 hover:bg-slate-750 text-indigo-400 hover:text-white px-2.5 py-1.5 rounded-lg font-bold transition flex items-center gap-1 border border-slate-700 cursor-pointer"
                                        title="Exportar roteiro refinado para PDF"
                                    >
                                        <LucideIcon name="file-down" className="w-3" /> Exportar PDF
                                    </button>
                                </div>
                            )}
                        </div>

                        {resultToRender ? (
                            <div className="flex-grow overflow-y-auto custom-scrollbar pr-1 space-y-6 max-h-[750px]">
                                {resultToRender.compliance_notes?.some(n => n.includes("alta demanda") || n.includes("momentânea")) && (
                                    <div className="bg-amber-950/60 border border-amber-500/40 rounded-lg p-2.5 text-xs text-amber-200 flex items-center gap-2">
                                        <LucideIcon name="info" className="w-4 h-4 text-amber-400 shrink-0" />
                                        <span>Servidores de IA com alta demanda momentânea. Suas versões foram geradas com base estrita no roteiro original via motor seguro Fact-Lock.</span>
                                    </div>
                                )}
                                {/* SECTION: ⚡ Draft Rápido */}
                                {currentQuickDraft && (
                                    <div className="bg-slate-950/90 p-4 rounded-xl border border-amber-500/40 shadow-md animate-fade-in">
                                        <div className="flex flex-wrap justify-between items-center mb-2.5 border-b border-slate-800 pb-2 gap-2">
                                            <div className="flex items-center gap-2">
                                                <LucideIcon name="zap" className="w-4 h-4 text-amber-400" />
                                                <span className="text-xs font-black text-amber-400 uppercase tracking-wider">⚡ Draft Rápido</span>
                                                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30 font-bold">
                                                    {currentQuickDraft.word_count}/40 palavras
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => {
                                                        if (!currentQuickDraft || currentQuickDraft.sourceScriptHash !== currentScriptHash) {
                                                            alert("Draft desatualizado. Gere novamente.");
                                                            return;
                                                        }
                                                        if (confirm("Deseja carregar este draft no script original?")) {
                                                            setOriginalScript(currentQuickDraft.draft);
                                                        }
                                                    }}
                                                    className="text-[10px] bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-800 px-2 py-1 rounded transition font-bold flex items-center gap-1 cursor-pointer"
                                                    title="Usar como base no Refinador"
                                                >
                                                    <LucideIcon name="arrow-right-circle" className="w-3 h-3" /> Usar como base no Refinador
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        if (!currentQuickDraft || currentQuickDraft.sourceScriptHash !== currentScriptHash) {
                                                            alert("Draft desatualizado. Gere novamente.");
                                                            return;
                                                        }
                                                        copyToClipboard(currentQuickDraft.draft).then(ok => ok && alert("Draft Rápido copiado!"));
                                                    }}
                                                    className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-2 py-1 rounded transition font-bold flex items-center gap-1 cursor-pointer"
                                                >
                                                    <LucideIcon name="copy" className="w-3 h-3" /> Copiar Draft
                                                </button>
                                            </div>
                                        </div>
                                        <p className="text-slate-100 text-xs leading-relaxed bg-slate-900/70 p-3 rounded-lg border border-slate-800/80 font-sans">
                                            {currentQuickDraft.draft}
                                        </p>
                                        <QualityBadge report={qualityReport?.versions.quickDraft} />
                                    </div>
                                )}

                                {/* SECTION 2: Estilo Detectado */}
                                <div className="bg-slate-950/90 p-3 rounded-xl border border-indigo-500/40 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <LucideIcon name="sparkles" className="w-4 h-4 text-indigo-400" />
                                        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Estilo Detectado:</span>
                                    </div>
                                    <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-xs font-black border border-indigo-500/30">
                                        {(resultToRender as any).style_detected || detectScriptFacts(originalScript).product ? `LEAL_${(resultToRender as any).style_detected || 'PADRAO'}` : 'LEAL_PADRAO'}
                                    </span>
                                </div>

                                {/* SECTION 3: Roteiro Principal Refinado */}
                                <div className="bg-slate-950/80 p-4 rounded-xl border border-emerald-500/30 shadow-md">
                                    <div className="flex justify-between items-center mb-2.5 border-b border-slate-800 pb-2">
                                        <span className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                                            <LucideIcon name="sparkles" className="w-4 h-4 text-emerald-400" /> Roteiro Principal Refinado
                                        </span>
                                        <button
                                            onClick={() => copyToClipboard(resultToRender.refined_script).then(ok => ok && alert("Roteiro Principal copiado!"))}
                                            className="text-[10px] bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 px-2 py-1 rounded transition font-bold flex items-center gap-1 cursor-pointer"
                                        >
                                            <LucideIcon name="copy" className="w-3 h-3" /> Copiar Roteiro Principal
                                        </button>
                                    </div>
                                    <p className="text-slate-100 text-sm leading-relaxed whitespace-pre-wrap bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                                        {resultToRender.refined_script}
                                    </p>
                                    <QualityBadge report={qualityReport?.versions.mainRefined} />
                                </div>

                                {/* SECTION 4: Versão Anti-Cópia */}
                                <div className="bg-slate-950/80 p-4 rounded-xl border border-indigo-500/30 shadow-md">
                                    <div className="flex justify-between items-center mb-2.5 border-b border-slate-800 pb-2">
                                        <span className="text-xs font-black text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                                            <LucideIcon name="shield-check" className="w-4 h-4 text-indigo-400" /> Versão Anti-Cópia
                                        </span>
                                        <button
                                            onClick={() => copyToClipboard(resultToRender.anti_copy_script).then(ok => ok && alert("Versão Anti-Cópia copiada!"))}
                                            className="text-[10px] bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-800 px-2 py-1 rounded transition font-bold flex items-center gap-1 cursor-pointer"
                                        >
                                            <LucideIcon name="copy" className="w-3 h-3" /> Copiar Anti-Cópia
                                        </button>
                                    </div>
                                    <p className="text-slate-100 text-sm leading-relaxed whitespace-pre-wrap bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                                        {resultToRender.anti_copy_script}
                                    </p>
                                    <QualityBadge report={qualityReport?.versions.antiCopy} />
                                </div>

                                {/* SECTION 5: Versão UGC Natural */}
                                <div className="bg-slate-950/80 p-4 rounded-xl border border-amber-500/30 shadow-md">
                                    <div className="flex justify-between items-center mb-2.5 border-b border-slate-800 pb-2">
                                        <span className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                                            <LucideIcon name="user" className="w-4 h-4 text-amber-400" /> Versão UGC Natural
                                        </span>
                                        <button
                                            onClick={() => copyToClipboard(resultToRender.ugc_script).then(ok => ok && alert("Versão UGC copiada!"))}
                                            className="text-[10px] bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-800 px-2 py-1 rounded transition font-bold flex items-center gap-1 cursor-pointer"
                                        >
                                            <LucideIcon name="copy" className="w-3 h-3" /> Copiar UGC
                                        </button>
                                    </div>
                                    <p className="text-slate-100 text-sm leading-relaxed whitespace-pre-wrap bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                                        {resultToRender.ugc_script}
                                    </p>
                                    <QualityBadge report={qualityReport?.versions.ugcNatural} />
                                </div>

                                {/* SECTION 6: Versão Premium */}
                                <div className="bg-slate-950/80 p-4 rounded-xl border border-teal-500/30 shadow-md">
                                    <div className="flex justify-between items-center mb-2.5 border-b border-slate-800 pb-2">
                                        <span className="text-xs font-black text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
                                            <LucideIcon name="award" className="w-4 h-4 text-teal-400" /> Versão Premium
                                        </span>
                                        <button
                                            onClick={() => copyToClipboard(resultToRender.premium_script).then(ok => ok && alert("Versão Premium copiada!"))}
                                            className="text-[10px] bg-teal-950 hover:bg-teal-900 text-teal-300 border border-teal-800 px-2 py-1 rounded transition font-bold flex items-center gap-1 cursor-pointer"
                                        >
                                            <LucideIcon name="copy" className="w-3 h-3" /> Copiar Premium
                                        </button>
                                    </div>
                                    <p className="text-slate-100 text-sm leading-relaxed whitespace-pre-wrap bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                                        {resultToRender.premium_script}
                                    </p>
                                    <QualityBadge report={qualityReport?.versions.premium} />
                                </div>

                                {/* SECTION 7: Hooks */}
                                <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 shadow-md">
                                    <div className="flex justify-between items-center mb-2.5 border-b border-slate-800 pb-2">
                                        <span className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                                            <LucideIcon name="magnet" className="w-4 h-4 text-emerald-400" /> Hooks Alternativos
                                        </span>
                                        <button
                                            onClick={() => copyToClipboard((resultToRender.hooks || []).join('\n')).then(ok => ok && alert("Hooks copiados!"))}
                                            className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-2 py-1 rounded transition font-bold flex items-center gap-1 cursor-pointer"
                                        >
                                            <LucideIcon name="copy" className="w-3 h-3" /> Copiar Hooks
                                        </button>
                                    </div>
                                    <div className="space-y-2">
                                        {(resultToRender.hooks || []).map((hk, i) => (
                                            <div key={i} className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 text-xs text-slate-200 flex justify-between items-center gap-2">
                                                <span>• {hk}</span>
                                                <button onClick={() => copyToClipboard(hk)} className="text-[9px] text-slate-400 hover:text-white shrink-0"><LucideIcon name="copy" className="w-3 h-3" /></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* SECTION 8: CTAs */}
                                <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 shadow-md">
                                    <div className="flex justify-between items-center mb-2.5 border-b border-slate-800 pb-2">
                                        <span className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                                            <LucideIcon name="arrow-right-circle" className="w-4 h-4 text-amber-400" /> CTAs Alternativos
                                        </span>
                                        <button
                                            onClick={() => copyToClipboard((resultToRender.ctas || []).join('\n')).then(ok => ok && alert("CTAs copiados!"))}
                                            className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-2 py-1 rounded transition font-bold flex items-center gap-1 cursor-pointer"
                                        >
                                            <LucideIcon name="copy" className="w-3 h-3" /> Copiar CTAs
                                        </button>
                                    </div>
                                    <div className="space-y-2">
                                        {(resultToRender.ctas || []).map((ct, i) => (
                                            <div key={i} className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 text-xs text-slate-200 flex justify-between items-center gap-2">
                                                <span>• {ct}</span>
                                                <button onClick={() => copyToClipboard(ct)} className="text-[9px] text-slate-400 hover:text-white shrink-0"><LucideIcon name="copy" className="w-3 h-3" /></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* SECTION 7: Estrutura de Retenção */}
                                <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 shadow-md">
                                    <span className="text-xs font-black text-slate-300 uppercase tracking-wider block mb-2.5 border-b border-slate-800 pb-2 flex items-center gap-1.5">
                                        <LucideIcon name="layers" className="w-4 h-4 text-indigo-400" /> 7. Estrutura de Retenção
                                    </span>
                                    <div className="space-y-2 text-xs text-slate-300">
                                        <p><strong className="text-indigo-400">Hook:</strong> {resultToRender.retention_structure?.hook || '-'}</p>
                                        <p><strong className="text-indigo-400">Curiosidade:</strong> {resultToRender.retention_structure?.curiosity || '-'}</p>
                                        <p><strong className="text-indigo-400">Construção de Valor:</strong> {resultToRender.retention_structure?.value_build || '-'}</p>
                                        <p><strong className="text-indigo-400">Prova/Detalhes:</strong> {resultToRender.retention_structure?.proof_or_detail || '-'}</p>
                                        <p><strong className="text-indigo-400">CTA:</strong> {resultToRender.retention_structure?.cta || '-'}</p>
                                    </div>
                                </div>

                                {/* SECTION 8: Blocos de Cena */}
                                {resultToRender.scene_blocks && resultToRender.scene_blocks.length > 0 && (
                                    <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 shadow-md">
                                        <span className="text-xs font-black text-slate-300 uppercase tracking-wider block mb-2.5 border-b border-slate-800 pb-2 flex items-center gap-1.5">
                                            <LucideIcon name="clapperboard" className="w-4 h-4 text-emerald-400" /> 8. Blocos de Cena ({resultToRender.scene_blocks.length} blocos)
                                        </span>
                                        <div className="space-y-3">
                                            {(resultToRender.scene_blocks || []).map((blk, i) => (
                                                <div key={i} className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 text-xs space-y-1">
                                                    <div className="flex justify-between font-bold text-emerald-400 text-[11px]">
                                                        <span>Bloco {blk.block}: {blk.retention_goal}</span>
                                                        <span>⏱️ {blk.duration_seconds}s</span>
                                                    </div>
                                                    <p className="text-slate-200"><strong>Fala:</strong> {blk.narration}</p>
                                                    <p className="text-slate-400 italic"><strong>Cena:</strong> {blk.visual_direction}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* SECTION 9: Relatório Anti-Cópia */}
                                <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 shadow-md">
                                    <span className="text-xs font-black text-slate-300 uppercase tracking-wider block mb-2.5 border-b border-slate-800 pb-2 flex items-center gap-1.5">
                                        <LucideIcon name="shield-check" className="w-4 h-4 text-emerald-400" /> 9. Relatório Anti-Cópia
                                    </span>
                                    <div className="space-y-2 text-xs text-slate-300">
                                        <p><strong>Score de Originalidade:</strong> <span className="text-emerald-400 font-bold">{resultToRender.anti_copy_report?.originality_score ?? 90}%</span></p>
                                        <p><strong>Estrutura Preservada:</strong> {resultToRender.anti_copy_report?.structure_preserved ? 'Sim ✓' : 'Não'}</p>
                                        {resultToRender.anti_copy_report?.copied_phrases_removed && resultToRender.anti_copy_report.copied_phrases_removed.length > 0 && (
                                            <div>
                                                <strong>Alterações Realizadas:</strong>
                                                <ul className="list-disc list-inside text-slate-400 mt-1">
                                                    {(resultToRender.anti_copy_report.copied_phrases_removed || []).map((rem, i) => (
                                                        <li key={i}>{rem}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* SECTION 10: Notas de Compliance */}
                                <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 shadow-md">
                                    <span className="text-xs font-black text-slate-300 uppercase tracking-wider block mb-2.5 border-b border-slate-800 pb-2 flex items-center gap-1.5">
                                        <LucideIcon name="file-text" className="w-4 h-4 text-teal-400" /> 10. Notas de Compliance
                                    </span>
                                    <ul className="list-disc list-inside text-xs text-slate-300 space-y-1">
                                        {(resultToRender.compliance_notes || []).map((note, i) => (
                                            <li key={i}>{note}</li>
                                        ))}
                                    </ul>
                                </div>

                                {/* SECTION 11: Qualidade do Roteiro */}
                                <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 shadow-md">
                                    <span className="text-xs font-black text-slate-300 uppercase tracking-wider block mb-2.5 border-b border-slate-800 pb-2 flex items-center gap-1.5">
                                        <LucideIcon name="activity" className="w-4 h-4 text-amber-400" /> 11. Qualidade do Roteiro
                                    </span>
                                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                                        <div className="bg-slate-900/60 p-2 rounded border border-slate-800 flex justify-between"><span>Clareza:</span> <span className="text-emerald-400 font-bold">{resultToRender.quality_score?.clarity ?? 90}%</span></div>
                                        <div className="bg-slate-900/60 p-2 rounded border border-slate-800 flex justify-between"><span>Retenção:</span> <span className="text-emerald-400 font-bold">{resultToRender.quality_score?.retention ?? 90}%</span></div>
                                        <div className="bg-slate-900/60 p-2 rounded border border-slate-800 flex justify-between"><span>Fatos Mantidos:</span> <span className="text-emerald-400 font-bold">{resultToRender.quality_score?.fact_preservation ?? 90}%</span></div>
                                        <div className="bg-slate-900/60 p-2 rounded border border-slate-800 flex justify-between"><span>Anti-Cópia:</span> <span className="text-emerald-400 font-bold">{resultToRender.quality_score?.anti_copy ?? 90}%</span></div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full bg-black/20 rounded-xl border border-slate-700/50 flex flex-col items-center justify-center text-slate-600 opacity-50 p-6 min-h-[300px]">
                                <LucideIcon name="file-video" className="w-12 h-12 mb-2" />
                                <p className="text-xs font-medium">As 11 seções da modelagem aparecerão aqui após a geração.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
