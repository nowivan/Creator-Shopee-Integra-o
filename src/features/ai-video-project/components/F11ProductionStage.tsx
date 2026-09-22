import React, { useState } from 'react';
import { SpecialistExecutionStatus, UploadedProductImage } from '../shared/types';
import { LucideIcon } from '../../../components/Common';

interface F11ProductionStageProps {
    productImage: UploadedProductImage | null;
    selectedScene2Copy: string;
    selectedScene3Copy: string;
    scene2Prompt: string;
    scene3Prompt: string;
    scene2Status: SpecialistExecutionStatus;
    scene3Status: SpecialistExecutionStatus;
    scene2Error: string | null;
    scene3Error: string | null;
    onGenerateScene2: () => void;
    onGenerateScene3: () => void;
    onEditScene2Copy?: (copy: string) => void;
    onEditScene3Copy?: (copy: string) => void;
}

export const F11ProductionStage: React.FC<F11ProductionStageProps> = ({
    productImage,
    selectedScene2Copy,
    selectedScene3Copy,
    scene2Prompt,
    scene3Prompt,
    scene2Status,
    scene3Status,
    scene2Error,
    scene3Error,
    onGenerateScene2,
    onGenerateScene3,
    onEditScene2Copy,
    onEditScene3Copy
}) => {
    const [copiedScene2, setCopiedScene2] = useState(false);
    const [copiedScene3, setCopiedScene3] = useState(false);
    const [copiedBoth, setCopiedBoth] = useState(false);

    const isScene2Generating = scene2Status === 'generating';
    const isScene3Generating = scene3Status === 'generating';

    const bothPromptsReady = Boolean(scene2Prompt?.trim() && scene3Prompt?.trim());

    const handleCopyScene2 = () => {
        if (!scene2Prompt) return;
        navigator.clipboard.writeText(scene2Prompt);
        setCopiedScene2(true);
        setTimeout(() => setCopiedScene2(false), 2000);
    };

    const handleCopyScene3 = () => {
        if (!scene3Prompt) return;
        navigator.clipboard.writeText(scene3Prompt);
        setCopiedScene3(true);
        setTimeout(() => setCopiedScene3(false), 2000);
    };

    const handleCopyBoth = () => {
        if (!scene2Prompt || !scene3Prompt) return;
        const combined = `=== F11 CENA 2 PROMPT ===\n${scene2Prompt}\n\n=== F11 CENA 3 / CTA PROMPT ===\n${scene3Prompt}`;
        navigator.clipboard.writeText(combined);
        setCopiedBoth(true);
        setTimeout(() => setCopiedBoth(false), 2000);
    };

    return (
        <div className="space-y-6 pt-2">
            {/* Stage Title */}
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                        <LucideIcon name="film" className="w-3.5 h-3.5" />
                    </div>
                    <div>
                        <h3 className="text-xs font-bold font-mono tracking-wider uppercase text-white flex items-center gap-2">
                            F11 Specialists • Produção de Prompts
                            <span className="text-[9px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 px-1.5 py-0.2 rounded">
                                Independent Vision Execution
                            </span>
                        </h3>
                        <p className="text-[11px] text-neutral-500 font-mono">
                            Execução isolada de Cena 2 e Cena 3 / CTA com a imagem original do produto
                        </p>
                    </div>
                </div>

                {productImage?.dataUrl && (
                    <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1 text-[11px] font-mono text-neutral-400">
                        <img
                            src={productImage.dataUrl}
                            alt="Product preview"
                            className="w-5 h-5 object-cover rounded"
                        />
                        <span className="truncate max-w-[120px] text-neutral-300">{productImage.name}</span>
                    </div>
                )}
            </div>

            {/* Grid for Two Independent Specialists */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Specialist A: F11 — CENA 2 */}
                <div className="bg-[#121214] border border-neutral-800 rounded-xl p-5 flex flex-col justify-between space-y-4 hover:border-neutral-700/80 transition-colors">
                    <div className="space-y-4">
                        {/* Header */}
                        <div className="flex items-start justify-between border-b border-neutral-800/80 pb-3">
                            <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                                    <LucideIcon name="video" className="w-3.5 h-3.5" />
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold font-mono uppercase text-sky-400 tracking-wider">
                                        F11 — CENA 2
                                    </h4>
                                    <span className="text-[10px] text-neutral-500 font-mono">
                                        Scene 2 Specialist (Art Direction & Video Prompt)
                                    </span>
                                </div>
                            </div>
                            <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${
                                scene2Status === 'success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                                scene2Status === 'generating' ? 'bg-sky-500/10 text-sky-400 border-sky-500/30 animate-pulse' :
                                scene2Status === 'error' ? 'bg-red-500/10 text-red-400 border-red-500/30' :
                                'bg-neutral-800 text-neutral-400 border-neutral-700'
                            }`}>
                                {scene2Status === 'success' ? 'Pronto' :
                                 scene2Status === 'generating' ? 'Processando...' :
                                 scene2Status === 'error' ? 'Erro' : 'Pendente'}
                            </span>
                        </div>

                        {/* Copy Selecionada */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-mono uppercase font-bold text-neutral-400 flex items-center gap-1.5">
                                    <LucideIcon name="message-square" className="w-3 h-3 text-sky-400" />
                                    Copy selecionada:
                                </span>
                            </div>
                            {onEditScene2Copy ? (
                                <textarea
                                    value={selectedScene2Copy}
                                    onChange={(e) => onEditScene2Copy(e.target.value)}
                                    rows={3}
                                    className="w-full bg-[#0A0A0B] border border-neutral-800 rounded-lg p-2.5 text-xs text-neutral-200 focus:outline-none focus:border-sky-500/60 font-sans leading-relaxed resize-none"
                                    placeholder="Texto da Cena 2..."
                                />
                            ) : (
                                <p className="bg-[#0A0A0B] border border-neutral-800 rounded-lg p-2.5 text-xs text-neutral-200 font-sans leading-relaxed">
                                    {selectedScene2Copy || <span className="text-neutral-600 italic">Nenhuma copy informada</span>}
                                </p>
                            )}
                        </div>

                        {/* Error Message */}
                        {scene2Error && (
                            <div className="bg-red-950/30 border border-red-800/60 rounded-lg p-3 text-xs text-red-300 flex items-start gap-2">
                                <LucideIcon name="alert-circle" className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                    <span className="font-bold font-mono text-[10px] uppercase text-red-400 block">Falha no Scene 2 Specialist</span>
                                    <span>{scene2Error}</span>
                                </div>
                            </div>
                        )}

                        {/* Prompt Output Viewer */}
                        {scene2Prompt && (
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-mono uppercase font-bold text-sky-400 flex items-center gap-1.5">
                                        <LucideIcon name="sparkles" className="w-3 h-3" />
                                        Prompt Final Cena 2:
                                    </span>
                                    <button
                                        type="button"
                                        onClick={handleCopyScene2}
                                        className="text-[10px] font-mono text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer transition-colors bg-sky-500/10 hover:bg-sky-500/20 px-2 py-0.5 rounded border border-sky-500/20"
                                    >
                                        <LucideIcon name={copiedScene2 ? "check" : "copy"} className="w-3 h-3" />
                                        {copiedScene2 ? "Copiado!" : "Copiar Prompt Cena 2"}
                                    </button>
                                </div>
                                <div className="bg-[#0A0A0B] border border-sky-500/30 rounded-lg p-3 text-xs text-neutral-200 font-mono whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto custom-scrollbar select-text">
                                    {scene2Prompt}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="pt-2 flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onGenerateScene2}
                            disabled={isScene2Generating || !selectedScene2Copy}
                            className={`w-full py-2.5 px-4 rounded-lg text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                                isScene2Generating || !selectedScene2Copy
                                    ? 'bg-neutral-800 text-neutral-600 border border-neutral-800 cursor-not-allowed'
                                    : 'bg-sky-500 hover:bg-sky-400 text-black shadow-lg shadow-sky-500/10'
                            }`}
                        >
                            {isScene2Generating ? (
                                <>
                                    <div className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                                    Gerando Cena 2...
                                </>
                            ) : scene2Prompt ? (
                                <>
                                    <LucideIcon name="refresh-cw" className="w-3.5 h-3.5" />
                                    Regenerar Cena 2
                                </>
                            ) : (
                                <>
                                    <LucideIcon name="play" className="w-3.5 h-3.5 fill-current" />
                                    Gerar Cena 2
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Specialist B: F11 — CENA 3 / CTA */}
                <div className="bg-[#121214] border border-neutral-800 rounded-xl p-5 flex flex-col justify-between space-y-4 hover:border-neutral-700/80 transition-colors">
                    <div className="space-y-4">
                        {/* Header */}
                        <div className="flex items-start justify-between border-b border-neutral-800/80 pb-3">
                            <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                                    <LucideIcon name="zap" className="w-3.5 h-3.5" />
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold font-mono uppercase text-amber-400 tracking-wider">
                                        F11 — CENA 3 / CTA
                                    </h4>
                                    <span className="text-[10px] text-neutral-500 font-mono">
                                        CTA Specialist (Conversion & Closing Video Prompt)
                                    </span>
                                </div>
                            </div>
                            <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${
                                scene3Status === 'success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                                scene3Status === 'generating' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse' :
                                scene3Status === 'error' ? 'bg-red-500/10 text-red-400 border-red-500/30' :
                                'bg-neutral-800 text-neutral-400 border-neutral-700'
                            }`}>
                                {scene3Status === 'success' ? 'Pronto' :
                                 scene3Status === 'generating' ? 'Processando...' :
                                 scene3Status === 'error' ? 'Erro' : 'Pendente'}
                            </span>
                        </div>

                        {/* Copy Selecionada */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-mono uppercase font-bold text-neutral-400 flex items-center gap-1.5">
                                    <LucideIcon name="message-square" className="w-3 h-3 text-amber-400" />
                                    Copy selecionada:
                                </span>
                            </div>
                            {onEditScene3Copy ? (
                                <textarea
                                    value={selectedScene3Copy}
                                    onChange={(e) => onEditScene3Copy(e.target.value)}
                                    rows={3}
                                    className="w-full bg-[#0A0A0B] border border-neutral-800 rounded-lg p-2.5 text-xs text-neutral-200 focus:outline-none focus:border-amber-500/60 font-sans leading-relaxed resize-none"
                                    placeholder="Texto da Cena 3 / CTA..."
                                />
                            ) : (
                                <p className="bg-[#0A0A0B] border border-neutral-800 rounded-lg p-2.5 text-xs text-neutral-200 font-sans leading-relaxed">
                                    {selectedScene3Copy || <span className="text-neutral-600 italic">Nenhuma copy informada</span>}
                                </p>
                            )}
                        </div>

                        {/* Error Message */}
                        {scene3Error && (
                            <div className="bg-red-950/30 border border-red-800/60 rounded-lg p-3 text-xs text-red-300 flex items-start gap-2">
                                <LucideIcon name="alert-circle" className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                    <span className="font-bold font-mono text-[10px] uppercase text-red-400 block">Falha no CTA Specialist</span>
                                    <span>{scene3Error}</span>
                                </div>
                            </div>
                        )}

                        {/* Prompt Output Viewer */}
                        {scene3Prompt && (
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-mono uppercase font-bold text-amber-400 flex items-center gap-1.5">
                                        <LucideIcon name="sparkles" className="w-3 h-3" />
                                        Prompt Final Cena 3 / CTA:
                                    </span>
                                    <button
                                        type="button"
                                        onClick={handleCopyScene3}
                                        className="text-[10px] font-mono text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer transition-colors bg-amber-500/10 hover:bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/20"
                                    >
                                        <LucideIcon name={copiedScene3 ? "check" : "copy"} className="w-3 h-3" />
                                        {copiedScene3 ? "Copiado!" : "Copiar Prompt Cena 3"}
                                    </button>
                                </div>
                                <div className="bg-[#0A0A0B] border border-amber-500/30 rounded-lg p-3 text-xs text-neutral-200 font-mono whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto custom-scrollbar select-text">
                                    {scene3Prompt}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="pt-2 flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onGenerateScene3}
                            disabled={isScene3Generating || !selectedScene3Copy}
                            className={`w-full py-2.5 px-4 rounded-lg text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                                isScene3Generating || !selectedScene3Copy
                                    ? 'bg-neutral-800 text-neutral-600 border border-neutral-800 cursor-not-allowed'
                                    : 'bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/10'
                            }`}
                        >
                            {isScene3Generating ? (
                                <>
                                    <div className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                                    Gerando Cena 3...
                                </>
                            ) : scene3Prompt ? (
                                <>
                                    <LucideIcon name="refresh-cw" className="w-3.5 h-3.5" />
                                    Regenerar Cena 3
                                </>
                            ) : (
                                <>
                                    <LucideIcon name="play" className="w-3.5 h-3.5 fill-current" />
                                    Gerar Cena 3
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* FINAL STAGE: When both outputs exist */}
            {bothPromptsReady && (
                <div className="bg-gradient-to-r from-emerald-950/40 via-neutral-900 to-indigo-950/40 border border-emerald-500/50 rounded-xl p-5 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                                <LucideIcon name="check-check" className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold font-mono uppercase text-emerald-400 tracking-wider">
                                    Prompts F11 prontos para produção
                                </h3>
                                <p className="text-xs text-neutral-400">
                                    Cena 2 e Cena 3 geradas pelos respectivos Especialistas com análise visual do produto.
                                </p>
                            </div>
                        </div>

                        {/* Copy Buttons */}
                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                onClick={handleCopyScene2}
                                className="px-3 py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-sky-400 text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                                <LucideIcon name={copiedScene2 ? "check" : "copy"} className="w-3.5 h-3.5" />
                                {copiedScene2 ? "Copiado!" : "Copiar Cena 2"}
                            </button>

                            <button
                                type="button"
                                onClick={handleCopyScene3}
                                className="px-3 py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-amber-400 text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                                <LucideIcon name={copiedScene3 ? "check" : "copy"} className="w-3.5 h-3.5" />
                                {copiedScene3 ? "Copiado!" : "Copiar Cena 3"}
                            </button>

                            <button
                                type="button"
                                onClick={handleCopyBoth}
                                className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
                            >
                                <LucideIcon name={copiedBoth ? "check" : "layers"} className="w-3.5 h-3.5" />
                                {copiedBoth ? "Copiados!" : "Copiar Ambos"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
