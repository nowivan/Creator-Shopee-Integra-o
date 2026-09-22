import React, { useState, useEffect, useMemo } from 'react';
import { LucideIcon } from '../../components/Common';
import {
    AgenteDeCopyV2Result,
    V2HomologationSessionRecord,
    V2VariationManualReview,
    V2HomologationRejectionReason
} from './types';
import {
    auditRuleCompliance,
    calculateCharacterBreakdown,
    getHomologationSessions,
    saveHomologationSession,
    deleteHomologationSession,
    clearHomologationSessions
} from './homologationService';
import { copyToClipboard } from '../../utils';

interface V2HomologationSectionProps {
    v2Result: AgenteDeCopyV2Result;
    productLabel: string;
    onProductLabelChange: (label: string) => void;
    productTitle?: string;
    productPrice?: string;
    productInfo?: string;
    onCopyText: (text: string, key: string) => void;
    copiedKey: string | null;
}

const REFERENCE_PRODUCTS = [
    'Blazer jeans',
    'Porta papel higiênico',
    'Protetor solar facial',
    'Kit de crochê'
];

const REJECTION_REASONS: V2HomologationRejectionReason[] = [
    'benefício não comprovado',
    'genérica demais',
    'exagero/promessa',
    'urgência artificial',
    'CTA fraco',
    'linguagem pouco natural',
    'outro'
];

export function V2HomologationSection({
    v2Result,
    productLabel,
    onProductLabelChange,
    productTitle,
    productPrice,
    productInfo,
    onCopyText,
    copiedKey
}: V2HomologationSectionProps) {
    // 1. Audit rules and character metrics
    const ruleReport = useMemo(() => {
        return auditRuleCompliance(v2Result.rawText, v2Result.variations, productPrice);
    }, [v2Result.rawText, v2Result.variations, productPrice]);

    const charBreakdown = useMemo(() => {
        return calculateCharacterBreakdown(v2Result.characterCompliance.counts);
    }, [v2Result.characterCompliance.counts]);

    // 2. Manual semantic reviews state for variations 1 to 6
    const [manualReviews, setManualReviews] = useState<V2VariationManualReview[]>(() => {
        return Array.from({ length: 6 }, (_, i) => ({
            variationIndex: i + 1,
            status: 'PENDENTE' as const,
            rejectionReason: null,
            customNote: ''
        }));
    });

    // 3. Persisted sessions state
    const [sessions, setSessions] = useState<V2HomologationSessionRecord[]>([]);
    const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
    const [copiedSummary, setCopiedSummary] = useState<boolean>(false);

    // Refresh sessions on mount
    useEffect(() => {
        setSessions(getHomologationSessions());
    }, []);

    // Helper to calculate approval summary count
    const approvalsCount = useMemo(() => {
        return manualReviews.filter(r => r.status === 'APROVADA').length;
    }, [manualReviews]);

    const reviewedCount = useMemo(() => {
        return manualReviews.filter(r => r.status !== 'PENDENTE').length;
    }, [manualReviews]);

    // Handle manual review update
    const handleSetVariationStatus = (index: number, status: 'APROVADA' | 'REPROVADA' | 'PENDENTE') => {
        setManualReviews(prev => {
            const next = [...prev];
            const existing = next.find(r => r.variationIndex === index);
            if (existing) {
                existing.status = status;
                if (status === 'APROVADA') {
                    existing.rejectionReason = null;
                }
            } else {
                next.push({
                    variationIndex: index,
                    status,
                    rejectionReason: null,
                    customNote: ''
                });
            }
            return next;
        });
    };

    const handleSetRejectionReason = (index: number, reason: V2HomologationRejectionReason) => {
        setManualReviews(prev => {
            const next = [...prev];
            const existing = next.find(r => r.variationIndex === index);
            if (existing) {
                existing.rejectionReason = reason;
            }
            return next;
        });
    };

    const handleSetCustomNote = (index: number, note: string) => {
        setManualReviews(prev => {
            const next = [...prev];
            const existing = next.find(r => r.variationIndex === index);
            if (existing) {
                existing.customNote = note;
            }
            return next;
        });
    };

    // Save current homologation record
    const handleSaveCurrentSession = () => {
        const activeLabel = productLabel.trim() || productTitle?.trim() || 'Produto Não Identificado';
        const recordId = `homologation_${Date.now()}_${activeLabel.replace(/\s+/g, '_').toLowerCase()}`;
        const whetherPriceWasProvided = Boolean(productPrice && productPrice.trim().length > 0);
        const whetherAdditionalInfoWasProvided = Boolean(productInfo && productInfo.trim().length > 0);

        const newRecord: V2HomologationSessionRecord = {
            id: recordId,
            productLabel: activeLabel,
            productTitle: productTitle || undefined,
            whetherPriceWasProvided,
            whetherAdditionalInfoWasProvided,
            timestamp: new Date().toISOString(),
            structure: {
                versionsDetected: v2Result.structure.versionsDetected,
                scene2Detected: v2Result.structure.scene2Detected,
                scene3Detected: v2Result.structure.scene3Detected,
                scene1Detected: v2Result.structure.scene1Detected
            },
            characters: charBreakdown,
            rules: ruleReport,
            manualReviews,
            summary: {
                structureDisplay: `${v2Result.structure.versionsDetected}/6`,
                charsDisplay: `${charBreakdown.compliantScenes}/12`,
                ctaDisplay: `${ruleReport.scene3WithCarrinhoLaranjaCount}/6`,
                violationsCount: ruleReport.totalViolationsCount,
                manualApprovalDisplay: `${approvalsCount}/6`
            }
        };

        saveHomologationSession(newRecord);
        setSessions(getHomologationSessions());
        setSaveSuccessMessage(`Homologação de "${activeLabel}" salva com sucesso!`);
        setTimeout(() => setSaveSuccessMessage(null), 3500);
    };

    // Delete a session record
    const handleDeleteSession = (id: string) => {
        deleteHomologationSession(id);
        setSessions(getHomologationSessions());
    };

    // Clear all session records
    const handleClearAllSessions = () => {
        if (window.confirm('Tem certeza de que deseja limpar todo o histórico de homologação salvo localmente?')) {
            clearHomologationSessions();
            setSessions([]);
        }
    };

    // Copy formatted homologation summary text
    const handleCopyHomologationSummary = async () => {
        if (sessions.length === 0) return;

        let reportText = `==================================================\n`;
        reportText += `RELATÓRIO DE HOMOLOGAÇÃO MANUAL — AGENTE DE COPY V2\n`;
        reportText += `Data de Exportação: ${new Date().toLocaleString('pt-BR')}\n`;
        reportText += `Total de Produtos Testados: ${sessions.length}\n`;
        reportText += `==================================================\n\n`;

        reportText += `PRODUCT | STRUCTURE | CHARS | CTA | VIOLATIONS | MANUAL APPROVAL\n`;
        reportText += `-----------------------------------------------------------------\n`;

        sessions.forEach(s => {
            reportText += `${s.productLabel.padEnd(24)} | ${s.summary.structureDisplay.padEnd(9)} | ${s.summary.charsDisplay.padEnd(5)} | ${s.summary.ctaDisplay.padEnd(3)} | ${String(s.summary.violationsCount).padEnd(10)} | ${s.summary.manualApprovalDisplay}\n`;
        });

        reportText += `\n==================================================\n`;
        reportText += `DETALHAMENTO POR PRODUTO:\n`;
        reportText += `==================================================\n\n`;

        sessions.forEach((s, idx) => {
            reportText += `[${idx + 1}] PRODUTO: ${s.productLabel} (${new Date(s.timestamp).toLocaleString('pt-BR')})\n`;
            reportText += `- Estrutura: Versões ${s.structure.versionsDetected}/6 | Cena 2: ${s.structure.scene2Detected}/6 | Cena 3: ${s.structure.scene3Detected}/6 | Cena 1 Detectada: ${s.structure.scene1Detected ? 'SIM' : 'NÃO'}\n`;
            reportText += `- Caracteres: ${s.characters.compliantScenes}/12 conformes (160-175ch) | Abaixo de 160: ${s.characters.below160} | Acima de 175: ${s.characters.above175}\n`;
            reportText += `- CTA Audit: ${s.rules.scene3WithCarrinhoLaranjaCount}/6 com "carrinho laranja"\n`;
            reportText += `- Violações Detectadas (${s.rules.totalViolationsCount}):\n`;
            reportText += `  * Preço: ${s.rules.explicitPrice ? 'SIM' : 'NÃO'} | Desconto: ${s.rules.explicitDiscount ? 'SIM' : 'NÃO'} | Cupom: ${s.rules.coupon ? 'SIM' : 'NÃO'}\n`;
            reportText += `  * Estoque Inventado: ${s.rules.inventedStockClaim ? 'SIM' : 'NÃO'} | Prazo Inventado: ${s.rules.inventedDeadline ? 'SIM' : 'NÃO'}\n`;
            reportText += `  * Parcelamento: ${s.rules.installmentTerms ? 'SIM' : 'NÃO'} | Preâmbulo: ${s.rules.preambleDetected ? 'SIM' : 'NÃO'} | Headings: ${s.rules.strategicHeadings ? 'SIM' : 'NÃO'}\n`;
            reportText += `  * Anotações de Caracteres no RAW: ${s.rules.characterCountAnnotations ? 'SIM' : 'NÃO'}\n`;
            reportText += `- Avaliação Semântica Manual: ${s.summary.manualApprovalDisplay} Aprovadas\n`;
            s.manualReviews.forEach(mr => {
                reportText += `  * Versão ${mr.variationIndex}: [${mr.status}]${mr.rejectionReason ? ` - Motivo: ${mr.rejectionReason}` : ''}${mr.customNote ? ` (${mr.customNote})` : ''}\n`;
            });
            reportText += `\n--------------------------------------------------\n\n`;
        });

        const ok = await copyToClipboard(reportText);
        if (ok) {
            setCopiedSummary(true);
            setTimeout(() => setCopiedSummary(false), 2500);
        }
    };

    return (
        <div className="space-y-6 pt-2 font-mono text-xs">
            {/* Header and Product Selection Category Bar */}
            <div className="bg-neutral-900 border border-emerald-500/30 rounded-2xl p-5 space-y-4 shadow-xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-neutral-800 pb-3">
                    <div className="flex items-center gap-2.5">
                        <span className="text-base">📋</span>
                        <div>
                            <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-2">
                                PAINEL DE HOMOLOGAÇÃO MANUAL V2
                                <span className="text-[9px] bg-emerald-950 text-emerald-400 border border-emerald-800/60 px-2 py-0.5 rounded font-extrabold">
                                    QA BENCHMARK
                                </span>
                            </h3>
                            <p className="text-[11px] text-neutral-400 font-sans mt-0.5">
                                Validação factual de conformidade estrutural, volumetria e revisão semântica manual para múltiplas categorias.
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={handleSaveCurrentSession}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-md cursor-pointer active:scale-95"
                    >
                        <LucideIcon name="save" className="w-4 h-4 text-white" />
                        <span>SALVAR HOMOLOGAÇÃO DESTE PRODUTO</span>
                    </button>
                </div>

                {saveSuccessMessage && (
                    <div className="p-3 bg-emerald-950/60 border border-emerald-700/60 rounded-xl text-emerald-300 flex items-center gap-2 text-xs">
                        <LucideIcon name="check-circle" className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>{saveSuccessMessage}</span>
                    </div>
                )}

                {/* Reference Category Selection Pills */}
                <div className="space-y-2">
                    <span className="text-[10px] text-neutral-400 uppercase font-bold block">
                        CATEGORIA DE PRODUTO EM TESTE (REFERÊNCIA DE HOMOLOGAÇÃO):
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                        {REFERENCE_PRODUCTS.map((refProd, idx) => {
                            const isSelected = productLabel === refProd;
                            return (
                                <button
                                    key={refProd}
                                    onClick={() => onProductLabelChange(refProd)}
                                    className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                                        isSelected
                                            ? 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-950/60'
                                            : 'bg-neutral-950 text-neutral-300 border-neutral-800 hover:border-neutral-700 hover:text-white'
                                    }`}
                                >
                                    <span className="text-[10px] opacity-70">#{idx + 1}</span>
                                    <span>{refProd}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Custom Label Input */}
                    <div className="pt-1 flex items-center gap-2">
                        <span className="text-[10px] text-neutral-500 whitespace-nowrap">Rótulo Atual:</span>
                        <input
                            type="text"
                            value={productLabel}
                            onChange={(e) => onProductLabelChange(e.target.value)}
                            placeholder="Ex: Blazer jeans, Porta papel higiênico, etc."
                            className="bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-emerald-500 flex-1 font-mono"
                        />
                    </div>
                </div>
            </div>

            {/* ========================================================================= */}
            {/* 1. STRUCTURE & 2. CHARACTER COMPLIANCE & 3. RULE COMPLIANCE */}
            {/* ========================================================================= */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Structure Card */}
                <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-3">
                    <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                        <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                            <LucideIcon name="layers" className="w-3.5 h-3.5 text-indigo-400" />
                            STRUCTURE
                        </h4>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-extrabold ${
                            v2Result.structure.isStructurallyComplete
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                                : 'bg-amber-950 text-amber-400 border border-amber-800/60'
                        }`}>
                            {v2Result.structure.versionsDetected}/6 VERSÕES
                        </span>
                    </div>

                    <div className="space-y-2 text-xs">
                        <div className="flex justify-between items-center bg-neutral-900/80 p-2 rounded border border-neutral-850">
                            <span className="text-neutral-400">Versions:</span>
                            <span className="font-bold text-neutral-200">{v2Result.structure.versionsDetected} / 6</span>
                        </div>
                        <div className="flex justify-between items-center bg-neutral-900/80 p-2 rounded border border-neutral-850">
                            <span className="text-neutral-400">Scene 2:</span>
                            <span className="font-bold text-indigo-300">{v2Result.structure.scene2Detected} / 6</span>
                        </div>
                        <div className="flex justify-between items-center bg-neutral-900/80 p-2 rounded border border-neutral-850">
                            <span className="text-neutral-400">Scene 3:</span>
                            <span className="font-bold text-amber-300">{v2Result.structure.scene3Detected} / 6</span>
                        </div>
                        <div className="flex justify-between items-center bg-neutral-900/80 p-2 rounded border border-neutral-850">
                            <span className="text-neutral-400">Scene 1 detected:</span>
                            <span className={`font-bold ${v2Result.structure.scene1Detected ? 'text-red-400' : 'text-emerald-400'}`}>
                                {v2Result.structure.scene1Detected ? 'SIM (VIOLAÇÃO)' : 'NÃO'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Character Compliance Card */}
                <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-3">
                    <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                        <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                            <LucideIcon name="type" className="w-3.5 h-3.5 text-cyan-400" />
                            CHARACTER COMPLIANCE
                        </h4>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-extrabold ${
                            charBreakdown.compliantScenes === 12
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                                : 'bg-amber-950 text-amber-400 border border-amber-800/60'
                        }`}>
                            {charBreakdown.compliantScenes}/12 OK
                        </span>
                    </div>

                    <div className="space-y-2 text-xs">
                        <div className="flex justify-between items-center bg-neutral-900/80 p-2 rounded border border-neutral-850">
                            <span className="text-neutral-400">compliant scenes:</span>
                            <span className="font-bold text-emerald-400">{charBreakdown.compliantScenes} / 12</span>
                        </div>
                        <div className="flex justify-between items-center bg-neutral-900/80 p-2 rounded border border-neutral-850">
                            <span className="text-neutral-400">below 160:</span>
                            <span className={`font-bold ${charBreakdown.below160 > 0 ? 'text-amber-400' : 'text-neutral-300'}`}>
                                {charBreakdown.below160}
                            </span>
                        </div>
                        <div className="flex justify-between items-center bg-neutral-900/80 p-2 rounded border border-neutral-850">
                            <span className="text-neutral-400">above 175:</span>
                            <span className={`font-bold ${charBreakdown.above175 > 0 ? 'text-amber-400' : 'text-neutral-300'}`}>
                                {charBreakdown.above175}
                            </span>
                        </div>
                        <div className="flex justify-between items-center bg-neutral-900/80 p-2 rounded border border-neutral-850 text-[10px]">
                            <span className="text-neutral-400">Range Estrito:</span>
                            <span className="text-neutral-300 font-mono">160–175 caracteres</span>
                        </div>
                    </div>
                </div>

                {/* CTA Audit & Safety Summary Card */}
                <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-3">
                    <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                        <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                            <LucideIcon name="shopping-cart" className="w-3.5 h-3.5 text-amber-400" />
                            CTA AUDIT
                        </h4>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-extrabold ${
                            ruleReport.scene3WithCarrinhoLaranjaCount === 6
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                                : 'bg-amber-950 text-amber-400 border border-amber-800/60'
                        }`}>
                            {ruleReport.scene3WithCarrinhoLaranjaCount}/6 CTA
                        </span>
                    </div>

                    <div className="space-y-2 text-xs">
                        <div className="flex justify-between items-center bg-neutral-900/80 p-2 rounded border border-neutral-850">
                            <span className="text-neutral-400">Scene 3 com "carrinho laranja":</span>
                            <span className="font-bold text-amber-400">{ruleReport.scene3WithCarrinhoLaranjaCount} / 6</span>
                        </div>
                        <div className="flex justify-between items-center bg-neutral-900/80 p-2 rounded border border-neutral-850">
                            <span className="text-neutral-400">Total Violações Fatuais:</span>
                            <span className={`font-bold ${ruleReport.totalViolationsCount > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                {ruleReport.totalViolationsCount}
                            </span>
                        </div>
                        <div className="flex justify-between items-center bg-neutral-900/80 p-2 rounded border border-neutral-850">
                            <span className="text-neutral-400">Revisão Manual:</span>
                            <span className="font-bold text-neutral-200">
                                {approvalsCount}/6 Aprovadas ({reviewedCount}/6 avaliadas)
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Detailed Table of all 12 Scenes Character Breakdown */}
            <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                    <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider block">
                        DETALHAMENTO DE CARACTERES DAS 12 CENAS (160–175 CARACTERES)
                    </span>
                    <span className="text-[10px] text-neutral-400">
                        {charBreakdown.compliantScenes} de 12 cenas no range estrito
                    </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                    {charBreakdown.sceneDetails.map(item => (
                        <div key={item.versionNumber} className="bg-neutral-900/80 p-2.5 rounded-lg border border-neutral-850 space-y-2">
                            <span className="text-[10px] font-bold text-neutral-300 block border-b border-neutral-800 pb-1">
                                VERSÃO {item.versionNumber}
                            </span>
                            <div className="flex items-center justify-between text-[10px]">
                                <span className="text-neutral-400">Cena 2:</span>
                                <span className={`px-1.5 py-0.5 rounded font-mono font-bold ${
                                    item.scene2Compliant ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60' : 'bg-amber-950 text-amber-400 border border-amber-800/60'
                                }`}>
                                    {item.scene2Length} ch ({item.scene2Compliant ? 'SIM' : 'NÃO'})
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-[10px]">
                                <span className="text-neutral-400">Cena 3:</span>
                                <span className={`px-1.5 py-0.5 rounded font-mono font-bold ${
                                    item.scene3Compliant ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60' : 'bg-amber-950 text-amber-400 border border-amber-800/60'
                                }`}>
                                    {item.scene3Length} ch ({item.scene3Compliant ? 'SIM' : 'NÃO'})
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Complete Rule Compliance Audit Grid */}
            <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                    <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider block">
                        RULE COMPLIANCE (AUDITORIA FATUAL DO TEXTO RAW SEM REESCRITA)
                    </span>
                    <span className="text-[10px] text-neutral-500">
                        Inspeção determinística de regras
                    </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 text-[10px]">
                    <div className="bg-neutral-900/80 p-2.5 rounded-lg border border-neutral-850 flex flex-col justify-between">
                        <span className="text-neutral-400">Explicit price:</span>
                        <span className={`font-bold mt-1 text-xs ${ruleReport.explicitPrice ? 'text-red-400' : 'text-emerald-400'}`}>
                            {ruleReport.explicitPrice ? `SIM (${ruleReport.priceMatches.slice(0, 1).join('')})` : 'NÃO'}
                        </span>
                    </div>

                    <div className="bg-neutral-900/80 p-2.5 rounded-lg border border-neutral-850 flex flex-col justify-between">
                        <span className="text-neutral-400">Exact price leak:</span>
                        <span className={`font-bold mt-1 text-xs ${
                            !productPrice?.trim()
                                ? 'text-neutral-400 font-normal'
                                : ruleReport.exactPriceLeak
                                ? 'text-red-400'
                                : 'text-emerald-400'
                        }`}>
                            {!productPrice?.trim()
                                ? 'N/A (sem preço)'
                                : ruleReport.exactPriceLeak
                                ? `SIM (${ruleReport.exactPriceMatches.slice(0, 1).join('')})`
                                : 'NÃO'}
                        </span>
                    </div>

                    <div className="bg-neutral-900/80 p-2.5 rounded-lg border border-neutral-850 flex flex-col justify-between">
                        <span className="text-neutral-400">Explicit discount:</span>
                        <span className={`font-bold mt-1 text-xs ${ruleReport.explicitDiscount ? 'text-red-400' : 'text-emerald-400'}`}>
                            {ruleReport.explicitDiscount ? `SIM (${ruleReport.discountMatches.slice(0, 1).join('')})` : 'NÃO'}
                        </span>
                    </div>

                    <div className="bg-neutral-900/80 p-2.5 rounded-lg border border-neutral-850 flex flex-col justify-between">
                        <span className="text-neutral-400">Coupon:</span>
                        <span className={`font-bold mt-1 text-xs ${ruleReport.coupon ? 'text-red-400' : 'text-emerald-400'}`}>
                            {ruleReport.coupon ? `SIM (${ruleReport.couponMatches.slice(0, 1).join('')})` : 'NÃO'}
                        </span>
                    </div>

                    <div className="bg-neutral-900/80 p-2.5 rounded-lg border border-neutral-850 flex flex-col justify-between">
                        <span className="text-neutral-400">Invented stock claim:</span>
                        <span className={`font-bold mt-1 text-xs ${ruleReport.inventedStockClaim ? 'text-red-400' : 'text-emerald-400'}`}>
                            {ruleReport.inventedStockClaim ? `SIM (${ruleReport.stockMatches.slice(0, 1).join('')})` : 'NÃO'}
                        </span>
                    </div>

                    <div className="bg-neutral-900/80 p-2.5 rounded-lg border border-neutral-850 flex flex-col justify-between">
                        <span className="text-neutral-400">Invented deadline:</span>
                        <span className={`font-bold mt-1 text-xs ${ruleReport.inventedDeadline ? 'text-red-400' : 'text-emerald-400'}`}>
                            {ruleReport.inventedDeadline ? `SIM (${ruleReport.deadlineMatches.slice(0, 1).join('')})` : 'NÃO'}
                        </span>
                    </div>

                    <div className="bg-neutral-900/80 p-2.5 rounded-lg border border-neutral-850 flex flex-col justify-between">
                        <span className="text-neutral-400">Installment/payment terms:</span>
                        <span className={`font-bold mt-1 text-xs ${ruleReport.installmentTerms ? 'text-red-400' : 'text-emerald-400'}`}>
                            {ruleReport.installmentTerms ? `SIM (${ruleReport.installmentMatches.slice(0, 1).join('')})` : 'NÃO'}
                        </span>
                    </div>

                    <div className="bg-neutral-900/80 p-2.5 rounded-lg border border-neutral-850 flex flex-col justify-between">
                        <span className="text-neutral-400">Scene 1 (Proibida):</span>
                        <span className={`font-bold mt-1 text-xs ${ruleReport.scene1Detected ? 'text-red-400' : 'text-emerald-400'}`}>
                            {ruleReport.scene1Detected ? 'SIM (DETECTADA)' : 'NÃO'}
                        </span>
                    </div>

                    <div className="bg-neutral-900/80 p-2.5 rounded-lg border border-neutral-850 flex flex-col justify-between">
                        <span className="text-neutral-400">Preamble/explanation:</span>
                        <span className={`font-bold mt-1 text-xs ${ruleReport.preambleDetected ? 'text-red-400' : 'text-emerald-400'}`}>
                            {ruleReport.preambleDetected ? 'SIM (DETECTADO)' : 'NÃO'}
                        </span>
                    </div>

                    <div className="bg-neutral-900/80 p-2.5 rounded-lg border border-neutral-850 flex flex-col justify-between">
                        <span className="text-neutral-400">Strategic headings:</span>
                        <span className={`font-bold mt-1 text-xs ${ruleReport.strategicHeadings ? 'text-red-400' : 'text-emerald-400'}`}>
                            {ruleReport.strategicHeadings ? 'SIM (DETECTADOS)' : 'NÃO'}
                        </span>
                    </div>

                    <div className="bg-neutral-900/80 p-2.5 rounded-lg border border-neutral-850 flex flex-col justify-between">
                        <span className="text-neutral-400">Character annotations in RAW:</span>
                        <span className={`font-bold mt-1 text-xs ${ruleReport.characterCountAnnotations ? 'text-red-400' : 'text-emerald-400'}`}>
                            {ruleReport.characterCountAnnotations ? 'SIM (DETECTADAS)' : 'NÃO'}
                        </span>
                    </div>
                </div>
            </div>

            {/* ========================================================================= */}
            {/* SEMANTIC REVIEW — MANUAL REVIEW (DO NOT AUTO-CORRECT) */}
            {/* ========================================================================= */}
            <div className="bg-neutral-950 p-5 rounded-2xl border border-indigo-500/40 space-y-4 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-900/40 pb-3">
                    <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-2">
                            <LucideIcon name="check-square" className="w-4 h-4 text-indigo-400" />
                            SEMANTIC REVIEW — AVALIAÇÃO MANUAL HUMANA
                            <span className="text-[9px] bg-indigo-950 text-indigo-400 border border-indigo-800/60 px-2 py-0.5 rounded font-extrabold">
                                NO AUTO-CORRECT
                            </span>
                        </h4>
                        <p className="text-[11px] text-neutral-400 font-sans mt-0.5">
                            Revise cada variação manualmente. Estas marcações são estritamente dados de homologação e <strong>não alteram</strong> o cérebro ou o modelo.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-neutral-900 text-neutral-300 px-2.5 py-1 rounded-lg border border-neutral-800 font-bold">
                            Aprovadas: {approvalsCount} / 6
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {v2Result.variations.map((v) => {
                        const review = manualReviews.find(r => r.variationIndex === v.id) || {
                            variationIndex: v.id,
                            status: 'PENDENTE' as const,
                            rejectionReason: null,
                            customNote: ''
                        };

                        const s2Len = v.scene2.length;
                        const s3Len = v.scene3.length;

                        return (
                            <div
                                key={v.id}
                                className={`bg-neutral-900 border rounded-xl p-4 space-y-3 flex flex-col justify-between transition ${
                                    review.status === 'APROVADA'
                                        ? 'border-emerald-500/60 shadow-lg shadow-emerald-950/30'
                                        : review.status === 'REPROVADA'
                                        ? 'border-red-500/60 shadow-lg shadow-red-950/30'
                                        : 'border-neutral-800'
                                }`}
                            >
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                                        <span className="font-bold text-neutral-200 text-xs tracking-wider flex items-center gap-1.5">
                                            <span className={`w-2.5 h-2.5 rounded-full ${
                                                review.status === 'APROVADA'
                                                    ? 'bg-emerald-500'
                                                    : review.status === 'REPROVADA'
                                                    ? 'bg-red-500'
                                                    : 'bg-neutral-600'
                                            }`}></span>
                                            VERSÃO {v.id}
                                        </span>

                                        <button
                                            onClick={() => onCopyText(`VERSÃO ${v.id}\n\nCENA 2:\n${v.scene2}\n\nCENA 3:\n${v.scene3}`, `v2_full_${v.id}`)}
                                            className="text-[10px] px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition flex items-center gap-1 cursor-pointer"
                                        >
                                            <LucideIcon name="copy" className="w-3 h-3" />
                                            <span>{copiedKey === `v2_full_${v.id}` ? 'COPIADO' : 'COPIAR'}</span>
                                        </button>
                                    </div>

                                    {/* Scene 2 & Scene 3 Copy Texts */}
                                    <div className="space-y-1 bg-neutral-950 p-2.5 rounded-lg border border-neutral-850 text-xs">
                                        <div className="flex items-center justify-between text-[10px]">
                                            <span className="text-indigo-400 font-bold uppercase">CENA 2 ({s2Len} ch):</span>
                                        </div>
                                        <p className="text-[11px] text-neutral-300 leading-relaxed font-sans select-text">
                                            {v.scene2}
                                        </p>
                                    </div>

                                    <div className="space-y-1 bg-neutral-950 p-2.5 rounded-lg border border-neutral-850 text-xs">
                                        <div className="flex items-center justify-between text-[10px]">
                                            <span className="text-amber-400 font-bold uppercase">CENA 3 ({s3Len} ch):</span>
                                        </div>
                                        <p className="text-[11px] text-neutral-300 leading-relaxed font-sans select-text">
                                            {v.scene3}
                                        </p>
                                    </div>
                                </div>

                                {/* Manual Decision Controls */}
                                <div className="pt-2 border-t border-neutral-800 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleSetVariationStatus(v.id, review.status === 'APROVADA' ? 'PENDENTE' : 'APROVADA')}
                                            className={`flex-1 py-1.5 rounded-lg font-bold text-[10px] uppercase tracking-wider transition flex items-center justify-center gap-1.5 cursor-pointer ${
                                                review.status === 'APROVADA'
                                                    ? 'bg-emerald-600 text-white shadow-md'
                                                    : 'bg-neutral-950 text-neutral-400 border border-neutral-800 hover:text-emerald-400 hover:border-emerald-700'
                                            }`}
                                        >
                                            <LucideIcon name="check" className="w-3.5 h-3.5" />
                                            <span>[ APROVADA ]</span>
                                        </button>

                                        <button
                                            onClick={() => handleSetVariationStatus(v.id, review.status === 'REPROVADA' ? 'PENDENTE' : 'REPROVADA')}
                                            className={`flex-1 py-1.5 rounded-lg font-bold text-[10px] uppercase tracking-wider transition flex items-center justify-center gap-1.5 cursor-pointer ${
                                                review.status === 'REPROVADA'
                                                    ? 'bg-red-600 text-white shadow-md'
                                                    : 'bg-neutral-950 text-neutral-400 border border-neutral-800 hover:text-red-400 hover:border-red-700'
                                            }`}
                                        >
                                            <LucideIcon name="x" className="w-3.5 h-3.5" />
                                            <span>[ REPROVADA ]</span>
                                        </button>
                                    </div>

                                    {/* Rejection Reasons Options */}
                                    {review.status === 'REPROVADA' && (
                                        <div className="bg-red-950/40 p-2.5 rounded-lg border border-red-900/60 space-y-2 animate-fade-in">
                                            <span className="text-[9px] text-red-300 uppercase font-bold block">
                                                Motivo de Reprovação (Opcional):
                                            </span>
                                            <div className="flex flex-wrap gap-1">
                                                {REJECTION_REASONS.map(reason => {
                                                    const isSelected = review.rejectionReason === reason;
                                                    return (
                                                        <button
                                                            key={reason}
                                                            onClick={() => handleSetRejectionReason(v.id, reason)}
                                                            className={`px-2 py-0.5 rounded text-[9px] font-sans transition cursor-pointer ${
                                                                isSelected
                                                                    ? 'bg-red-600 text-white font-bold'
                                                                    : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
                                                            }`}
                                                        >
                                                            {reason}
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                            <input
                                                type="text"
                                                value={review.customNote || ''}
                                                onChange={(e) => handleSetCustomNote(v.id, e.target.value)}
                                                placeholder="Observação manual opcional..."
                                                className="w-full bg-black/60 border border-neutral-800 rounded px-2 py-1 text-[10px] text-neutral-300 focus:outline-none focus:border-red-500 font-sans"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ========================================================================= */}
            {/* SESSION SUMMARY TABLE (LOCAL PERSISTENCE) */}
            {/* ========================================================================= */}
            <div className="bg-neutral-950 p-5 rounded-2xl border border-neutral-800 space-y-4 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-3">
                    <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-2">
                            <LucideIcon name="table" className="w-4 h-4 text-emerald-400" />
                            RESUMO DA SESSÃO DE HOMOLOGAÇÃO MULTIPRODUTOS
                        </h4>
                        <p className="text-[11px] text-neutral-400 font-sans mt-0.5">
                            Histórico consolidado salvo localmente para comparação entre as categorias homologadas.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        {sessions.length > 0 && (
                            <>
                                <button
                                    onClick={handleCopyHomologationSummary}
                                    className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                                >
                                    <LucideIcon name="copy" className="w-3.5 h-3.5" />
                                    <span>{copiedSummary ? 'COPIADO!' : 'COPIAR TABELA'}</span>
                                </button>
                                <button
                                    onClick={handleClearAllSessions}
                                    className="px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-red-950 text-neutral-400 hover:text-red-300 border border-neutral-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                                >
                                    <LucideIcon name="trash-2" className="w-3.5 h-3.5" />
                                    <span>LIMPAR</span>
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {sessions.length === 0 ? (
                    <div className="p-6 text-center text-neutral-500 bg-neutral-900/40 rounded-xl border border-neutral-850">
                        <span className="block text-sm mb-1">Nenhum produto homologado salvo na sessão ainda.</span>
                        <span className="text-[11px] font-sans">
                            Clique em <strong>[ SALVAR HOMOLOGAÇÃO DESTE PRODUTO ]</strong> acima após gerar com V2 para registrar Blazer jeans, Porta papel, Protetor solar ou Kit de crochê.
                        </span>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="border-b border-neutral-800 text-[10px] text-neutral-400 uppercase bg-neutral-900/60">
                                    <th className="p-3 font-bold">PRODUCT</th>
                                    <th className="p-3 font-bold text-center">STRUCTURE</th>
                                    <th className="p-3 font-bold text-center">CHARS</th>
                                    <th className="p-3 font-bold text-center">CTA</th>
                                    <th className="p-3 font-bold text-center">VIOLATIONS</th>
                                    <th className="p-3 font-bold text-center">MANUAL APPROVAL</th>
                                    <th className="p-3 font-bold text-center">TIMESTAMP</th>
                                    <th className="p-3 font-bold text-right">AÇÃO</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-850">
                                {sessions.map((s) => (
                                    <tr key={s.id} className="hover:bg-neutral-900/50 transition">
                                        <td className="p-3 font-bold text-neutral-200">
                                            {s.productLabel}
                                        </td>
                                        <td className="p-3 text-center">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                s.structure.versionsDetected === 6
                                                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                                                    : 'bg-amber-950 text-amber-400 border border-amber-800/60'
                                            }`}>
                                                {s.summary.structureDisplay}
                                            </span>
                                        </td>
                                        <td className="p-3 text-center">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                s.characters.compliantScenes === 12
                                                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                                                    : 'bg-amber-950 text-amber-400 border border-amber-800/60'
                                            }`}>
                                                {s.summary.charsDisplay}
                                            </span>
                                        </td>
                                        <td className="p-3 text-center font-mono text-amber-300">
                                            {s.summary.ctaDisplay}
                                        </td>
                                        <td className="p-3 text-center">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                s.summary.violationsCount === 0
                                                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                                                    : 'bg-red-950 text-red-400 border border-red-800/60'
                                            }`}>
                                                {s.summary.violationsCount}
                                            </span>
                                        </td>
                                        <td className="p-3 text-center">
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-800/60">
                                                {s.summary.manualApprovalDisplay}
                                            </span>
                                        </td>
                                        <td className="p-3 text-center text-[10px] text-neutral-500 font-mono">
                                            {new Date(s.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td className="p-3 text-right">
                                            <button
                                                onClick={() => handleDeleteSession(s.id)}
                                                className="text-neutral-500 hover:text-red-400 transition p-1 cursor-pointer"
                                                title="Remover este registro"
                                            >
                                                <LucideIcon name="trash-2" className="w-3.5 h-3.5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
