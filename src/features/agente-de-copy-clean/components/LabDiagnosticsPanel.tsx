import React, { useState } from 'react';
import { LucideIcon } from '../../../components/Common';
import { AgenteDeCopyCleanResult, CleanVariantType } from '../types';

interface LabDiagnosticsPanelProps {
    activeResult: AgenteDeCopyCleanResult;
    resultsByVariant: Record<CleanVariantType, AgenteDeCopyCleanResult | null>;
    copiedRaw: boolean;
    copiedR1: boolean;
    copiedR2: boolean;
    onCopyRaw: (text: string, type: 'init' | 'r1' | 'r2') => void;
}

export const LabDiagnosticsPanel: React.FC<LabDiagnosticsPanelProps> = ({
    activeResult,
    resultsByVariant,
    copiedRaw,
    copiedR1,
    copiedR2,
    onCopyRaw
}) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div id="diagnostics-panel" className="bg-[#0B0B0E] border border-neutral-800 rounded-2xl p-6 shadow-xl space-y-4 font-mono text-xs">
            {/* Header Accordion Toggle */}
            <div
                onClick={() => setIsOpen(prev => !prev)}
                className="flex items-center justify-between cursor-pointer select-none py-1 group"
            >
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-neutral-850 border border-neutral-750 flex items-center justify-center text-neutral-400 group-hover:text-emerald-400 transition">
                        <LucideIcon name="terminal" className="w-3.5 h-3.5" />
                    </div>
                    <div>
                        <h4 className="text-xs font-bold text-neutral-200 uppercase tracking-wider group-hover:text-emerald-300 transition flex items-center gap-2">
                            <span>Diagnóstico Técnico & Homologação</span>
                            {activeResult.cleanDTrace && (
                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                                    activeResult.cleanDTrace.finalHomologationStatus === 'PASS'
                                        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                                        : 'bg-amber-950/80 text-amber-300 border-amber-800'
                                }`}>
                                    {activeResult.cleanDTrace.finalHomologationStatus}
                                </span>
                            )}
                        </h4>
                        <p className="text-[10px] text-neutral-500 font-sans">
                            Trace determinístico, métricas de conformidade, quadro comparativo e RAW JSON
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-400 group-hover:text-white transition flex items-center gap-1 text-[11px]"
                >
                    <span>{isOpen ? 'Ocultar' : 'Expandir'}</span>
                    <LucideIcon name={isOpen ? 'chevron-up' : 'chevron-down'} className="w-4 h-4" />
                </button>
            </div>

            {isOpen && (
                <div className="space-y-6 pt-4 border-t border-neutral-850 animate-fade-in">
                    {/* Clean D Execution & Validation Pipeline Panel */}
                    {activeResult.cleanDTrace && (
                        <div className="bg-neutral-950/80 border border-neutral-800 rounded-xl p-5 space-y-4">
                            <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                                <span className="font-bold text-emerald-400 uppercase text-[11px]">
                                    Pipeline de Execução Determinística
                                </span>
                                <span className="text-[10px] text-neutral-400">
                                    Chamadas Gemini: {activeResult.cleanDTrace.totalGeminiCalls}/3
                                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px]">
                                {/* Step 1: Initial */}
                                {(() => {
                                    const initVisualViolations = activeResult.cleanDTrace.initial.scenes.filter(s => s.visualDescriptionViolation).length;
                                    const initMetrics = activeResult.cleanDTrace.initial.initialMetrics;
                                    return (
                                        <div className="bg-neutral-900/80 p-3 rounded-lg border border-neutral-800 space-y-1.5">
                                            <div className="flex items-center justify-between border-b border-neutral-800 pb-1">
                                                <span className="text-emerald-400 font-bold uppercase">1. GERAÇÃO INICIAL</span>
                                                <span className="text-[9px] text-neutral-500">{activeResult.cleanDTrace.initial.executionTimeMs}ms</span>
                                            </div>
                                            <div className="space-y-1 text-[10px]">
                                                <div className="flex justify-between"><span className="text-neutral-500">Payload:</span><span className="text-emerald-400 font-bold">Multimodal</span></div>
                                                <div className="flex justify-between"><span className="text-neutral-500">Request:</span><span className="text-neutral-300 truncate max-w-[110px]">{activeResult.cleanDTrace.initial.requestId}</span></div>
                                                <div className="flex justify-between"><span className="text-neutral-500">FinishReason:</span><span className="text-emerald-400">{activeResult.cleanDTrace.initial.finishReason}</span></div>
                                                <div className="flex justify-between"><span className="text-neutral-500">Tokens / RAW:</span><span className="text-neutral-300">{activeResult.cleanDTrace.initial.outputTokenCount ?? 'N/D'} / {activeResult.cleanDTrace.initial.rawLength} ch</span></div>
                                                <div className="flex justify-between"><span className="text-neutral-500">Visual Violations:</span><span className={initVisualViolations === 0 ? 'text-emerald-400' : 'text-amber-400 font-bold'}>{initVisualViolations}</span></div>
                                                {initMetrics && (
                                                    <div className="bg-neutral-950/60 p-2 rounded border border-neutral-850 space-y-0.5 text-[9px] text-neutral-400">
                                                        <div className="flex justify-between font-bold text-neutral-300">
                                                            <span>Válidas Iniciais:</span>
                                                            <span className={initMetrics.initialValidScenes === 12 ? 'text-emerald-400' : 'text-amber-400'}>
                                                                {initMetrics.initialValidScenes}/12
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between"><span>Cena 2:</span><span>{initMetrics.scene2Valid}/6</span></div>
                                                        <div className="flex justify-between"><span>Cena 3:</span><span>{initMetrics.scene3Valid}/6</span></div>
                                                    </div>
                                                )}
                                                <div className="flex justify-between font-bold pt-1 border-t border-neutral-850">
                                                    <span className="text-neutral-400">Validação #1:</span>
                                                    <span className={activeResult.cleanDTrace.initial.invalidScenesCount === 0 ? 'text-emerald-400' : 'text-amber-400'}>
                                                        {activeResult.cleanDTrace.initial.validScenesCount}/12 válidas
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* Step 2: Revision 1 */}
                                {(() => {
                                    const r1Diag = activeResult.cleanDTrace.revision1;
                                    return (
                                        <div className="bg-neutral-900/80 p-3 rounded-lg border border-neutral-800 space-y-1.5">
                                            <div className="flex items-center justify-between border-b border-neutral-800 pb-1">
                                                <span className="text-amber-400 font-bold uppercase">2. REVISÃO SELETIVA #1</span>
                                                <span className="text-[9px] text-neutral-500">
                                                    {r1Diag?.executed ? `${r1Diag.executionTimeMs}ms` : 'NÃO EXECUTADA'}
                                                </span>
                                            </div>
                                            {r1Diag?.executed ? (
                                                <div className="space-y-1 text-[10px]">
                                                    <div className="flex justify-between">
                                                        <span className="text-neutral-500">Modo:</span>
                                                        <span className={r1Diag.reviewerGroundingMode === 'text_only' ? 'text-cyan-400 font-bold' : 'text-neutral-300'}>
                                                            {r1Diag.reviewerGroundingMode === 'text_only' ? 'Text-Only' : 'Multimodal'}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between"><span className="text-neutral-500">Cenas Enviadas:</span><span className="text-amber-300 font-bold">{r1Diag.scenesSentCount} cena(s)</span></div>
                                                    <div className="flex justify-between"><span className="text-neutral-500">Request:</span><span className="text-neutral-300 truncate max-w-[110px]">{r1Diag.requestId}</span></div>
                                                    <div className="flex justify-between font-bold pt-1 border-t border-neutral-850">
                                                        <span className="text-neutral-400">Validação #2:</span>
                                                        <span className={activeResult.cleanDTrace.validationAfterRev1?.invalidScenesCount === 0 ? 'text-emerald-400' : 'text-amber-400'}>
                                                            {activeResult.cleanDTrace.validationAfterRev1?.validScenesCount}/12 válidas
                                                        </span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="py-4 text-center text-neutral-500 text-[10px]">
                                                    Desnecessária (12/12 válidas de primeira)
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}

                                {/* Step 3: Revision 2 */}
                                {(() => {
                                    const r2Diag = activeResult.cleanDTrace.revision2;
                                    return (
                                        <div className="bg-neutral-900/80 p-3 rounded-lg border border-neutral-800 space-y-1.5">
                                            <div className="flex items-center justify-between border-b border-neutral-800 pb-1">
                                                <span className="text-indigo-400 font-bold uppercase">3. REVISÃO SELETIVA #2</span>
                                                <span className="text-[9px] text-neutral-500">
                                                    {r2Diag?.executed ? `${r2Diag.executionTimeMs}ms` : 'NÃO EXECUTADA'}
                                                </span>
                                            </div>
                                            {r2Diag?.executed ? (
                                                <div className="space-y-1 text-[10px]">
                                                    <div className="flex justify-between">
                                                        <span className="text-neutral-500">Modo:</span>
                                                        <span className={r2Diag.reviewerGroundingMode === 'text_only' ? 'text-cyan-400 font-bold' : 'text-neutral-300'}>
                                                            {r2Diag.reviewerGroundingMode === 'text_only' ? 'Text-Only' : 'Multimodal'}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between"><span className="text-neutral-500">Cenas Enviadas:</span><span className="text-indigo-300 font-bold">{r2Diag.scenesSentCount} cena(s)</span></div>
                                                    <div className="flex justify-between font-bold pt-1 border-t border-neutral-850">
                                                        <span className="text-neutral-400">Validação Final:</span>
                                                        <span className={activeResult.cleanDTrace.validationAfterRev2?.invalidScenesCount === 0 ? 'text-emerald-400' : 'text-amber-400'}>
                                                            {activeResult.cleanDTrace.validationAfterRev2?.validScenesCount}/12 válidas
                                                        </span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="py-4 text-center text-neutral-500 text-[10px]">
                                                    {activeResult.cleanDTrace.revision1?.executed ? 'Não necessária (resolvido na Rev 1)' : 'Desnecessária'}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Manual Single-Scene Repairs Trace */}
                            {activeResult.cleanDTrace.manualRepairs && activeResult.cleanDTrace.manualRepairs.length > 0 && (
                                <div className="bg-neutral-900/90 p-3 rounded-xl border border-amber-800/60 space-y-2">
                                    <div className="flex items-center justify-between border-b border-neutral-800 pb-1.5">
                                        <span className="text-amber-400 font-bold uppercase text-[11px] flex items-center gap-1.5">
                                            <LucideIcon name="wrench" className="w-3.5 h-3.5 text-amber-400" />
                                            Histórico de Reparos Manuais Direcionados ({activeResult.cleanDTrace.manualRepairs.length})
                                        </span>
                                        <span className="text-[9px] text-neutral-400 font-mono">
                                            Determinístico & Isolado
                                        </span>
                                    </div>
                                    <div className="space-y-1.5 text-[10px]">
                                        {activeResult.cleanDTrace.manualRepairs.map((r, idx) => (
                                            <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-1.5 bg-neutral-950 rounded border border-neutral-800 gap-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-neutral-200">V{r.versionId} • {r.scene === 'scene2' ? 'Cena 2' : 'Cena 3'}</span>
                                                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${r.accepted ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-red-950 text-red-400 border border-red-800'}`}>
                                                        {r.accepted ? 'ACEITO & MESCLADO' : `REJEITADO (${r.acceptanceReason})`}
                                                    </span>
                                                </div>
                                                <div className="text-neutral-400 text-[9px]">
                                                    {r.previousCharacterCount}ch → {r.candidateCharacterCount}ch • {r.executionTimeMs}ms • {r.requestId}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Final Compliance Checklist */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2 text-[10px]">
                                <div className="bg-neutral-900/90 p-2 rounded border border-neutral-800 text-center">
                                    <span className="text-neutral-500 block text-[9px]">VERSIONS</span>
                                    <span className="text-emerald-300 font-bold">{activeResult.validation.versionsCount}/6</span>
                                </div>
                                <div className="bg-neutral-900/90 p-2 rounded border border-neutral-800 text-center">
                                    <span className="text-neutral-500 block text-[9px]">CHARS 160-175</span>
                                    <span className={`font-bold ${activeResult.validation.characterComplianceCount === 12 ? 'text-emerald-300' : 'text-amber-400'}`}>
                                        {activeResult.validation.characterComplianceCount}/12
                                    </span>
                                </div>
                                <div className="bg-neutral-900/90 p-2 rounded border border-neutral-800 text-center">
                                    <span className="text-neutral-500 block text-[9px]">CTA CARRINHO</span>
                                    <span className={`font-bold ${activeResult.validation.carrinhoLaranjaCount === 6 ? 'text-emerald-300' : 'text-amber-400'}`}>
                                        {activeResult.validation.carrinhoLaranjaCount}/6
                                    </span>
                                </div>
                                <div className="bg-neutral-900/90 p-2 rounded border border-neutral-800 text-center">
                                    <span className="text-neutral-500 block text-[9px]">DESC. VISUAL</span>
                                    <span className={`font-bold ${activeResult.validation.visualDescriptionViolationsCount === 0 ? 'text-emerald-300' : 'text-red-400'}`}>
                                        {activeResult.validation.visualDescriptionViolationsCount === 0 ? '0/12' : `${activeResult.validation.visualDescriptionViolationsCount}/12`}
                                    </span>
                                </div>
                                <div className="bg-neutral-900/90 p-2 rounded border border-neutral-800 text-center">
                                    <span className="text-neutral-500 block text-[9px]">PREÇO EXP.</span>
                                    <span className={`font-bold ${!activeResult.validation.explicitPrice ? 'text-emerald-300' : 'text-red-400'}`}>
                                        {activeResult.validation.explicitPrice ? 'VIOLAÇÃO' : '0'}
                                    </span>
                                </div>
                                <div className="bg-neutral-900/90 p-2 rounded border border-neutral-800 text-center">
                                    <span className="text-neutral-500 block text-[9px]">PARCELAMENTO</span>
                                    <span className={`font-bold ${!activeResult.validation.installmentViolationDetected ? 'text-emerald-300' : 'text-red-400'}`}>
                                        {activeResult.validation.installmentViolationDetected ? 'VIOLAÇÃO' : '0'}
                                    </span>
                                </div>
                                <div className="bg-neutral-900/90 p-2 rounded border border-neutral-800 text-center">
                                    <span className="text-neutral-500 block text-[9px]">DESCONTO</span>
                                    <span className={`font-bold ${!activeResult.validation.discountClaim ? 'text-emerald-300' : 'text-red-400'}`}>
                                        {activeResult.validation.discountClaim ? 'VIOLAÇÃO' : '0'}
                                    </span>
                                </div>
                                <div className="bg-neutral-900/90 p-2 rounded border border-neutral-800 text-center">
                                    <span className="text-neutral-500 block text-[9px]">ESTOQUE</span>
                                    <span className={`font-bold ${!activeResult.validation.inventedStock ? 'text-emerald-300' : 'text-red-400'}`}>
                                        {activeResult.validation.inventedStock ? 'VIOLAÇÃO' : '0'}
                                    </span>
                                </div>
                                <div className="bg-neutral-900/90 p-2 rounded border border-neutral-800 text-center">
                                    <span className="text-neutral-500 block text-[9px]">ALEGAÇÕES</span>
                                    <span className={`font-bold ${!activeResult.validation.unsupportedClaimsDetected ? 'text-emerald-300' : 'text-red-400'}`}>
                                        {activeResult.validation.unsupportedClaimsDetected ? 'VIOLAÇÃO' : '0'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Experimental Comparison Table (Clean A vs Clean B vs Clean C vs Clean D) */}
                    <div className="bg-neutral-950/80 border border-neutral-800 rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                            <span className="font-bold text-neutral-300 uppercase text-[11px]">
                                Quadro Comparativo dos Experimentos Controlados
                            </span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-[11px]">
                                <thead>
                                    <tr className="border-b border-neutral-800 text-neutral-400 text-[10px] uppercase">
                                        <th className="py-2 px-3">Métrica / Restrição</th>
                                        <th className="py-2 px-3 text-center">CLEAN A</th>
                                        <th className="py-2 px-3 text-center">CLEAN B</th>
                                        <th className="py-2 px-3 text-center">CLEAN C</th>
                                        <th className="py-2 px-3 text-center text-emerald-400">CLEAN D</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-850">
                                    <tr>
                                        <td className="py-1.5 px-3 text-neutral-400">Versions</td>
                                        <td className="py-1.5 px-3 text-center">{resultsByVariant.A ? `${resultsByVariant.A.validation.versionsCount}/6` : '—'}</td>
                                        <td className="py-1.5 px-3 text-center">{resultsByVariant.B ? `${resultsByVariant.B.validation.versionsCount}/6` : '—'}</td>
                                        <td className="py-1.5 px-3 text-center">{resultsByVariant.C ? `${resultsByVariant.C.validation.versionsCount}/6` : '—'}</td>
                                        <td className="py-1.5 px-3 text-center font-bold text-emerald-400">{resultsByVariant.D ? `${resultsByVariant.D.validation.versionsCount}/6` : '—'}</td>
                                    </tr>
                                    <tr>
                                        <td className="py-1.5 px-3 text-neutral-400">Chars Conformes (160–175)</td>
                                        <td className="py-1.5 px-3 text-center">{resultsByVariant.A ? `${resultsByVariant.A.validation.characterComplianceCount}/12` : '—'}</td>
                                        <td className="py-1.5 px-3 text-center">{resultsByVariant.B ? `${resultsByVariant.B.validation.characterComplianceCount}/12` : '—'}</td>
                                        <td className="py-1.5 px-3 text-center">{resultsByVariant.C ? `${resultsByVariant.C.validation.characterComplianceCount}/12` : '—'}</td>
                                        <td className="py-1.5 px-3 text-center font-bold text-emerald-400">{resultsByVariant.D ? `${resultsByVariant.D.validation.characterComplianceCount}/12` : '—'}</td>
                                    </tr>
                                    <tr>
                                        <td className="py-1.5 px-3 text-neutral-400">CTA Carrinho Laranja</td>
                                        <td className="py-1.5 px-3 text-center">{resultsByVariant.A ? `${resultsByVariant.A.validation.carrinhoLaranjaCount}/6` : '—'}</td>
                                        <td className="py-1.5 px-3 text-center">{resultsByVariant.B ? `${resultsByVariant.B.validation.carrinhoLaranjaCount}/6` : '—'}</td>
                                        <td className="py-1.5 px-3 text-center">{resultsByVariant.C ? `${resultsByVariant.C.validation.carrinhoLaranjaCount}/6` : '—'}</td>
                                        <td className="py-1.5 px-3 text-center font-bold text-emerald-400">{resultsByVariant.D ? `${resultsByVariant.D.validation.carrinhoLaranjaCount}/6` : '—'}</td>
                                    </tr>
                                    <tr>
                                        <td className="py-1.5 px-3 text-neutral-400">Homologação</td>
                                        <td className="py-1.5 px-3 text-center">{resultsByVariant.A ? resultsByVariant.A.validation.homologationStatus : '—'}</td>
                                        <td className="py-1.5 px-3 text-center">{resultsByVariant.B ? resultsByVariant.B.validation.homologationStatus : '—'}</td>
                                        <td className="py-1.5 px-3 text-center">{resultsByVariant.C ? resultsByVariant.C.validation.homologationStatus : '—'}</td>
                                        <td className="py-1.5 px-3 text-center font-bold text-emerald-400">{resultsByVariant.D ? resultsByVariant.D.validation.homologationStatus : '—'}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Raw JSON Boxes */}
                    <div className="space-y-3 font-mono">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] text-neutral-400 uppercase font-bold flex items-center gap-2">
                                <LucideIcon name="code" className="w-3.5 h-3.5 text-neutral-400" />
                                RAW INITIAL JSON ({activeResult.cleanDTrace?.initial.rawLength || activeResult.rawLength} caracteres)
                            </label>
                            <button
                                onClick={() => onCopyRaw(activeResult.cleanDTrace?.initial.rawText || activeResult.rawText, 'init')}
                                className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[10px] font-bold transition flex items-center gap-1.5 cursor-pointer"
                            >
                                <LucideIcon name="copy" className="w-3 h-3" />
                                <span>{copiedRaw ? 'COPIADO!' : 'COPIAR RAW INITIAL'}</span>
                            </button>
                        </div>
                        <pre className="whitespace-pre-wrap break-words font-mono text-[10px] leading-relaxed text-neutral-300 bg-black p-3.5 rounded-xl border border-neutral-800 max-h-48 overflow-y-auto select-text">
                            {activeResult.cleanDTrace?.initial.rawText || activeResult.rawText || '<Nenhum JSON retornado>'}
                        </pre>

                        {/* RAW Revision 1 */}
                        {activeResult.cleanDTrace?.revision1?.executed && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] text-amber-400 uppercase font-bold flex items-center gap-2">
                                        <LucideIcon name="code" className="w-3.5 h-3.5 text-amber-400" />
                                        RAW REVISION 1 JSON ({activeResult.cleanDTrace.revision1.rawLength} caracteres)
                                    </label>
                                    <button
                                        onClick={() => onCopyRaw(activeResult.cleanDTrace?.revision1?.rawText || '', 'r1')}
                                        className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[10px] font-bold transition flex items-center gap-1.5 cursor-pointer"
                                    >
                                        <LucideIcon name="copy" className="w-3 h-3" />
                                        <span>{copiedR1 ? 'COPIADO!' : 'COPIAR RAW REV 1'}</span>
                                    </button>
                                </div>
                                <pre className="whitespace-pre-wrap break-words font-mono text-[10px] leading-relaxed text-amber-200/90 bg-black p-3.5 rounded-xl border border-neutral-800 max-h-48 overflow-y-auto select-text">
                                    {activeResult.cleanDTrace.revision1.rawText}
                                </pre>
                            </div>
                        )}

                        {/* RAW Revision 2 */}
                        {activeResult.cleanDTrace?.revision2?.executed && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] text-indigo-400 uppercase font-bold flex items-center gap-2">
                                        <LucideIcon name="code" className="w-3.5 h-3.5 text-indigo-400" />
                                        RAW REVISION 2 JSON ({activeResult.cleanDTrace.revision2.rawLength} caracteres)
                                    </label>
                                    <button
                                        onClick={() => onCopyRaw(activeResult.cleanDTrace?.revision2?.rawText || '', 'r2')}
                                        className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[10px] font-bold transition flex items-center gap-1.5 cursor-pointer"
                                    >
                                        <LucideIcon name="copy" className="w-3 h-3" />
                                        <span>{copiedR2 ? 'COPIADO!' : 'COPIAR RAW REV 2'}</span>
                                    </button>
                                </div>
                                <pre className="whitespace-pre-wrap break-words font-mono text-[10px] leading-relaxed text-indigo-200/90 bg-black p-3.5 rounded-xl border border-neutral-800 max-h-48 overflow-y-auto select-text">
                                    {activeResult.cleanDTrace.revision2.rawText}
                                </pre>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
