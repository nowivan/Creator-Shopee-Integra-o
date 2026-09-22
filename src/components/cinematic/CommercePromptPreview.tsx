import React, { useState } from 'react';
import { LucideIcon, Button } from '../Common';
import { copyToClipboard } from '../../utils';
import { CommerceGenerationResult } from './CommerceTypes';

interface CommercePromptPreviewProps {
    result: CommerceGenerationResult;
    aiTarget?: string;
}

export const CommercePromptPreview: React.FC<CommercePromptPreviewProps> = ({
    result,
    aiTarget = 'Flow'
}) => {
    const [actionPlanOpen, setActionPlanOpen] = useState(true);
    const [fullPromptOpen, setFullPromptOpen] = useState(true);
    const [stabilityOpen, setStabilityOpen] = useState(false);
    const [negativeOpen, setNegativeOpen] = useState(true);
    const [copiedSection, setCopiedSection] = useState<string | null>(null);

    const handleCopy = (text: string, sectionName: string) => {
        copyToClipboard(text).then((ok) => {
            if (ok) {
                setCopiedSection(sectionName);
                setTimeout(() => setCopiedSection(null), 2500);
            }
        });
    };

    const { planOutput, compiledOutput, productName, category } = result;
    const { rawSections, negativePromptCompiled, formattedFullPrompt, stabilityBundle } = compiledOutput;

    return (
        <div className="glass-panel p-5 md:p-6 rounded-xl border border-pink-500/30 h-full flex flex-col bg-slate-900/60 shadow-2xl space-y-4 font-sans">
            {/* Header */}
            <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <LucideIcon name="clapperboard" className="w-5 h-5 text-pink-400" />
                    <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                            <span>Commerce Demo Compiled Output</span>
                            <span className="text-[9px] bg-pink-500/20 text-pink-300 border border-pink-500/30 px-2 py-0.5 rounded font-mono">
                                V1 HOMOLOGADO
                            </span>
                        </h3>
                    </div>
                </div>

                {copiedSection && (
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded font-bold animate-fade-in flex items-center gap-1">
                        <LucideIcon name="check" className="w-3 h-3 text-emerald-400" />
                        {copiedSection} Copiado!
                    </span>
                )}
            </div>

            {/* Badges Bar */}
            <div className="flex flex-wrap gap-1.5 p-2.5 bg-slate-950/70 rounded-lg border border-slate-800 text-[10px] font-mono font-bold">
                <span className="bg-slate-900 border border-slate-700 text-white px-2 py-1 rounded flex items-center gap-1">
                    <LucideIcon name="box" className="w-3 h-3 text-pink-400" /> {productName}
                </span>
                <span className="bg-slate-900 border border-slate-700 text-purple-300 px-2 py-1 rounded flex items-center gap-1">
                    <LucideIcon name="tag" className="w-3 h-3 text-purple-400" /> {category}
                </span>
                <span className="bg-pink-950/40 border border-pink-500/30 text-pink-300 px-2 py-1 rounded flex items-center gap-1">
                    <LucideIcon name="sparkles" className="w-3 h-3 text-pink-400" /> {planOutput.resolvedFamily}
                </span>
                <span className="bg-slate-900 border border-slate-700 text-yellow-300 px-2 py-1 rounded flex items-center gap-1">
                    <LucideIcon name="clock" className="w-3 h-3 text-yellow-400" /> {planOutput.totalDurationSec}s ({planOutput.targetBeats} beats)
                </span>
                <span className="bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 px-2 py-1 rounded flex items-center gap-1">
                    <LucideIcon name="shield-check" className="w-3 h-3 text-emerald-400" /> REF_AUTHORITY
                </span>
            </div>

            {/* Scrollable Content */}
            <div className="space-y-3 overflow-y-auto custom-scrollbar pr-1 flex-1 max-h-[720px]">
                
                {/* 1. Sequential Shot & Action Plan */}
                <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
                    <div
                        role="button"
                        tabIndex={0}
                        onClick={() => setActionPlanOpen(!actionPlanOpen)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setActionPlanOpen(!actionPlanOpen);
                            }
                        }}
                        className="w-full p-3.5 flex items-center justify-between bg-slate-900/80 hover:bg-slate-900 transition text-left cursor-pointer border-b border-transparent hover:border-slate-800 select-none"
                    >
                        <div className="flex items-center gap-2">
                            <LucideIcon name="play-circle" className="w-4 h-4 text-purple-400" />
                            <span className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                                1. Sequential Shot & Action Plan ({planOutput.shots.length} Beats)
                            </span>
                        </div>
                        <LucideIcon
                            name={actionPlanOpen ? 'chevron-up' : 'chevron-down'}
                            className="w-4 h-4 text-slate-400"
                        />
                    </div>

                    {actionPlanOpen && (
                        <div className="p-3.5 space-y-3 animate-fade-in bg-black/20">
                            {planOutput.shots.map((shot, idx) => (
                                <div
                                    key={idx}
                                    className="bg-slate-900/80 border border-slate-800 rounded-lg p-3 space-y-2 text-xs"
                                >
                                    <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-pink-400">
                                                BEAT {idx + 1}: {shot.functionType}
                                            </span>
                                            {shot.targetDurationSec && (
                                                <span className="text-[10px] bg-slate-950 border border-slate-700 text-slate-300 px-1.5 py-0.5 rounded font-mono">
                                                    ~{shot.targetDurationSec}s
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {shot.informationGain.map((g) => (
                                                <span
                                                    key={g}
                                                    className="text-[9px] bg-purple-500/10 text-purple-300 border border-purple-500/20 px-1.5 py-0.2 rounded"
                                                >
                                                    {g}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-1 text-slate-300">
                                        <p>
                                            <strong className="text-slate-400 font-mono text-[10px] uppercase block">Visual:</strong>
                                            {shot.visualPromptEn}
                                        </p>
                                        <p>
                                            <strong className="text-slate-400 font-mono text-[10px] uppercase block">Action & Camera:</strong>
                                            {shot.actionPromptEn}
                                        </p>
                                        <p>
                                            <strong className="text-slate-400 font-mono text-[10px] uppercase block">Interaction / Framing:</strong>
                                            {shot.handAction} ({shot.framing})
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* 2. Full 13-Section Compiled Prompt */}
                <div className="border border-pink-500/30 rounded-xl overflow-hidden bg-slate-950/40">
                    <div
                        role="button"
                        tabIndex={0}
                        onClick={() => setFullPromptOpen(!fullPromptOpen)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setFullPromptOpen(!fullPromptOpen);
                            }
                        }}
                        className="w-full p-3.5 flex items-center justify-between bg-slate-900/80 hover:bg-slate-900 transition text-left cursor-pointer border-b border-transparent hover:border-slate-800 select-none"
                    >
                        <div className="flex items-center gap-2">
                            <LucideIcon name="terminal" className="w-4 h-4 text-pink-400" />
                            <span className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                                2. Flow / Runway / Veo 13-Section Prompt
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopy(formattedFullPrompt, 'Prompt 13 Seções');
                                }}
                                className="text-[10px] bg-pink-600/20 hover:bg-pink-600/40 text-pink-300 border border-pink-500/30 px-2 py-1 rounded flex items-center gap-1 cursor-pointer"
                            >
                                <LucideIcon name="copy" className="w-3 h-3" />
                                Copiar Prompt
                            </button>
                            <LucideIcon
                                name={fullPromptOpen ? 'chevron-up' : 'chevron-down'}
                                className="w-4 h-4 text-slate-400"
                            />
                        </div>
                    </div>

                    {fullPromptOpen && (
                        <div className="p-3.5 animate-fade-in bg-black/30">
                            <pre className="text-xs font-mono text-slate-200 bg-slate-950/80 p-3 rounded-lg border border-slate-800 whitespace-pre-wrap break-words max-h-80 overflow-y-auto leading-relaxed custom-scrollbar">
                                {formattedFullPrompt}
                            </pre>
                        </div>
                    )}
                </div>

                {/* 3. Stability Directives & Frame Zero */}
                <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
                    <div
                        role="button"
                        tabIndex={0}
                        onClick={() => setStabilityOpen(!stabilityOpen)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setStabilityOpen(!stabilityOpen);
                            }
                        }}
                        className="w-full p-3.5 flex items-center justify-between bg-slate-900/80 hover:bg-slate-900 transition text-left cursor-pointer border-b border-transparent hover:border-slate-800 select-none"
                    >
                        <div className="flex items-center gap-2">
                            <LucideIcon name="shield-check" className="w-4 h-4 text-emerald-400" />
                            <span className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                                3. Stability Directives & Frame Zero
                            </span>
                        </div>
                        <LucideIcon
                            name={stabilityOpen ? 'chevron-up' : 'chevron-down'}
                            className="w-4 h-4 text-slate-400"
                        />
                    </div>

                    {stabilityOpen && (
                        <div className="p-3.5 space-y-2 animate-fade-in bg-black/20 text-xs">
                            <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 space-y-1">
                                <span className="font-bold text-emerald-400 text-[10px] uppercase block">
                                    Reference Authority (Visual Source of Truth)
                                </span>
                                <p className="text-slate-300 text-[11px] leading-relaxed">
                                    {stabilityBundle.referenceAuthority.join(' ')}
                                </p>
                            </div>

                            <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 space-y-1">
                                <span className="font-bold text-emerald-400 text-[10px] uppercase block">
                                    Frame Zero Contract
                                </span>
                                <p className="text-slate-300 text-[11px] leading-relaxed">
                                    {stabilityBundle.frameZero}
                                </p>
                            </div>

                            <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 space-y-1">
                                <span className="font-bold text-emerald-400 text-[10px] uppercase block">
                                    Realistic Scale & Object Count Lock
                                </span>
                                <p className="text-slate-300 text-[11px] leading-relaxed">
                                    {stabilityBundle.realisticScaleLock} | {stabilityBundle.objectCountPersistence}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* 4. 7-Category Structured Negative Lock */}
                <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
                    <div
                        role="button"
                        tabIndex={0}
                        onClick={() => setNegativeOpen(!negativeOpen)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setNegativeOpen(!negativeOpen);
                            }
                        }}
                        className="w-full p-3.5 flex items-center justify-between bg-slate-900/80 hover:bg-slate-900 transition text-left cursor-pointer border-b border-transparent hover:border-slate-800 select-none"
                    >
                        <div className="flex items-center gap-2">
                            <LucideIcon name="shield-alert" className="w-4 h-4 text-red-400" />
                            <span className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                                4. 7-Category Structured Negative Shield
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopy(negativePromptCompiled, 'Negative Prompt');
                                }}
                                className="text-[10px] bg-red-600/20 hover:bg-red-600/40 text-red-300 border border-red-500/30 px-2 py-1 rounded flex items-center gap-1 cursor-pointer"
                            >
                                <LucideIcon name="copy" className="w-3 h-3" />
                                Copiar Negativas
                            </button>
                            <LucideIcon
                                name={negativeOpen ? 'chevron-up' : 'chevron-down'}
                                className="w-4 h-4 text-slate-400"
                            />
                        </div>
                    </div>

                    {negativeOpen && (
                        <div className="p-3.5 space-y-2 animate-fade-in bg-black/20 text-xs">
                            <p className="text-red-200/90 bg-red-950/20 border border-red-900/30 p-3 rounded-lg font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-words">
                                {negativePromptCompiled}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Action Buttons Footer */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-800">
                <Button
                    onClick={() => handleCopy(formattedFullPrompt, 'Prompt Completo')}
                    variant="primary"
                    className="w-full py-2.5 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-xs cursor-pointer"
                    icon="copy"
                >
                    Copiar Prompt Completo (13 Seções)
                </Button>

                <Button
                    onClick={() => handleCopy(JSON.stringify(result, null, 2), 'JSON Completo')}
                    variant="secondary"
                    className="w-full py-2.5 border-purple-500/30 hover:border-purple-500 text-xs cursor-pointer"
                    icon="file-json"
                >
                    Copiar JSON Estruturado
                </Button>
            </div>
        </div>
    );
};
