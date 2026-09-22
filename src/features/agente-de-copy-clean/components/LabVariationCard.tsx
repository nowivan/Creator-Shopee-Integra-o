import React from 'react';
import { LucideIcon } from '../../../components/Common';
import { CleanCopyVariation, CleanValidationResult, CleanVariantType } from '../types';
import { formatPairCopy, isVariationReady } from '../labWorkflow';

interface LabVariationCardProps {
    variation: CleanCopyVariation;
    validationResult: CleanValidationResult;
    variant: CleanVariantType;
    isUsed: boolean;
    onToggleUsed: (variationId: number, isReady: boolean) => void;
    onSingleSceneRepair: (versionId: number, scene: 'scene2' | 'scene3') => void;
    repairingScene: { versionId: number; scene: 'scene2' | 'scene3' } | null;
    isGenerating: boolean;
    repairError?: string;
    copiedKey: string | null;
    onCopy: (text: string, key: string) => void;
}

export const LabVariationCard: React.FC<LabVariationCardProps> = ({
    variation,
    validationResult,
    variant,
    isUsed,
    onToggleUsed,
    onSingleSceneRepair,
    repairingScene,
    isGenerating,
    repairError,
    copiedKey,
    onCopy
}) => {
    const s2Detail = validationResult.sceneValidations.find(s => s.versionId === variation.id && s.scene === 'scene2');
    const s3Detail = validationResult.sceneValidations.find(s => s.versionId === variation.id && s.scene === 'scene3');

    const s2Len = s2Detail?.characterCount || variation.scene2.length;
    const s3Len = s3Detail?.characterCount || variation.scene3.length;
    const s2Valid = s2Detail?.valid ?? false;
    const s3Valid = s3Detail?.valid ?? false;

    const ready = isVariationReady(s2Valid, s3Valid);

    const s2CopyKey = `lab_s2_${variation.id}`;
    const s3CopyKey = `lab_s3_${variation.id}`;
    const pairCopyKey = `lab_pair_${variation.id}`;

    const isS2Copiado = copiedKey === s2CopyKey;
    const isS3Copiado = copiedKey === s3CopyKey;
    const isPairCopiado = copiedKey === pairCopyKey;

    const isRepairingS2 = repairingScene?.versionId === variation.id && repairingScene?.scene === 'scene2';
    const isRepairingS3 = repairingScene?.versionId === variation.id && repairingScene?.scene === 'scene3';

    const handleCopyScene2 = () => {
        if (!s2Valid) return;
        onCopy(variation.scene2, s2CopyKey);
    };

    const handleCopyScene3 = () => {
        if (!s3Valid) return;
        onCopy(variation.scene3, s3CopyKey);
    };

    const handleCopyPair = () => {
        if (!ready) return;
        const formatted = formatPairCopy(variation.scene2, variation.scene3);
        onCopy(formatted, pairCopyKey);
    };

    return (
        <div
            id={`variation-card-${variation.id}`}
            className={`rounded-2xl p-5 space-y-4 flex flex-col justify-between transition-all duration-200 border shadow-lg ${
                isUsed
                    ? 'bg-[#0D0E12] border-neutral-800/80 opacity-90'
                    : 'bg-[#101116] border-neutral-800 hover:border-emerald-500/40'
            }`}
        >
            {/* Header: Title, Readiness & Used Status */}
            <div className="flex items-center justify-between border-b border-neutral-800/80 pb-3 gap-2 flex-wrap font-mono">
                <div className="flex items-center gap-2">
                    <span className="font-bold text-neutral-100 text-sm tracking-wider flex items-center gap-1.5">
                        <span className={`w-2.5 h-2.5 rounded-full ${ready ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                        VARIAÇÃO 0{variation.id}
                    </span>
                    {isUsed && (
                        <span className="px-2 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-300 text-[10px] font-bold uppercase tracking-wide flex items-center gap-1">
                            <LucideIcon name="check" className="w-3 h-3 text-emerald-400" />
                            Usada
                        </span>
                    )}
                </div>

                <span
                    className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                        ready
                            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80'
                            : 'bg-amber-950/80 text-amber-300 border-amber-800/80'
                    }`}
                >
                    {ready ? 'Pronta para usar' : 'Precisa de ajuste'}
                </span>
            </div>

            {/* CENA 2 Section */}
            <div className="space-y-2.5 bg-black/50 p-3.5 rounded-xl border border-neutral-850">
                <div className="flex items-center justify-between font-mono gap-2 flex-wrap">
                    <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wide flex items-center gap-1">
                        <LucideIcon name="mic" className="w-3 h-3 text-indigo-400" />
                        CENA 2
                    </span>
                    <span
                        className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold flex items-center gap-1 border ${
                            s2Valid
                                ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
                                : 'bg-amber-950/60 text-amber-400 border-amber-800/60'
                        }`}
                    >
                        {s2Valid ? `✅ Validada • ${s2Len} caracteres` : `⚠️ Precisa de reparo • ${s2Len} caracteres`}
                    </span>
                </div>

                {s2Detail?.violations && s2Detail.violations.length > 0 && (
                    <div className="text-[10px] text-amber-300 font-mono bg-amber-950/40 px-2.5 py-1 rounded border border-amber-900/60 leading-tight">
                        Falhas: {s2Detail.violations.join(', ')}
                    </div>
                )}

                <p className="text-xs text-neutral-200 leading-relaxed font-sans select-text min-h-[56px]">
                    {variation.scene2}
                </p>

                <div className="pt-2 border-t border-neutral-900 flex flex-col gap-2">
                    <button
                        type="button"
                        id={`btn-copy-s2-${variation.id}`}
                        disabled={!s2Valid}
                        onClick={handleCopyScene2}
                        title={!s2Valid ? 'Repare esta cena antes de copiar.' : 'Copiar texto exato da Cena 2'}
                        className={`w-full py-1.5 px-3 rounded-lg text-xs font-mono font-bold uppercase transition flex items-center justify-center gap-1.5 cursor-pointer ${
                            !s2Valid
                                ? 'bg-neutral-900 text-neutral-500 border border-neutral-800 cursor-not-allowed opacity-60'
                                : isS2Copiado
                                ? 'bg-emerald-600 text-white shadow-sm border border-emerald-500'
                                : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 hover:text-white'
                        }`}
                    >
                        <LucideIcon name={isS2Copiado ? 'check' : 'copy'} className="w-3.5 h-3.5" />
                        <span>{isS2Copiado ? '✓ Copiado' : 'Copiar Cena 2'}</span>
                    </button>

                    {!s2Valid && variant === 'D' && (
                        <button
                            type="button"
                            id={`btn-repair-s2-${variation.id}`}
                            disabled={repairingScene !== null || isGenerating}
                            onClick={() => onSingleSceneRepair(variation.id, 'scene2')}
                            className="w-full py-1.5 px-3 rounded-lg text-[11px] bg-amber-600/90 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-mono font-bold uppercase transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-98"
                        >
                            {isRepairingS2 ? (
                                <>
                                    <LucideIcon name="loader-2" className="w-3.5 h-3.5 animate-spin text-white" />
                                    <span>Reparando somente Cena 2...</span>
                                </>
                            ) : (
                                <>
                                    <LucideIcon name="wrench" className="w-3.5 h-3.5 text-amber-200" />
                                    <span>Reparar somente Cena 2</span>
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>

            {/* CENA 3 Section */}
            <div className="space-y-2.5 bg-black/50 p-3.5 rounded-xl border border-neutral-850">
                <div className="flex items-center justify-between font-mono gap-2 flex-wrap">
                    <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wide flex items-center gap-1">
                        <LucideIcon name="shopping-cart" className="w-3 h-3 text-amber-400" />
                        CENA 3
                    </span>
                    <span
                        className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold flex items-center gap-1 border ${
                            s3Valid
                                ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
                                : 'bg-amber-950/60 text-amber-400 border-amber-800/60'
                        }`}
                    >
                        {s3Valid ? `✅ Validada • ${s3Len} caracteres` : `⚠️ Precisa de reparo • ${s3Len} caracteres`}
                    </span>
                </div>

                {s3Detail?.violations && s3Detail.violations.length > 0 && (
                    <div className="text-[10px] text-amber-300 font-mono bg-amber-950/40 px-2.5 py-1 rounded border border-amber-900/60 leading-tight">
                        Falhas: {s3Detail.violations.join(', ')}
                    </div>
                )}

                <p className="text-xs text-neutral-200 leading-relaxed font-sans select-text min-h-[56px]">
                    {variation.scene3}
                </p>

                <div className="pt-2 border-t border-neutral-900 flex flex-col gap-2">
                    <button
                        type="button"
                        id={`btn-copy-s3-${variation.id}`}
                        disabled={!s3Valid}
                        onClick={handleCopyScene3}
                        title={!s3Valid ? 'Repare esta cena antes de copiar.' : 'Copiar texto exato da Cena 3'}
                        className={`w-full py-1.5 px-3 rounded-lg text-xs font-mono font-bold uppercase transition flex items-center justify-center gap-1.5 cursor-pointer ${
                            !s3Valid
                                ? 'bg-neutral-900 text-neutral-500 border border-neutral-800 cursor-not-allowed opacity-60'
                                : isS3Copiado
                                ? 'bg-emerald-600 text-white shadow-sm border border-emerald-500'
                                : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 hover:text-white'
                        }`}
                    >
                        <LucideIcon name={isS3Copiado ? 'check' : 'copy'} className="w-3.5 h-3.5" />
                        <span>{isS3Copiado ? '✓ Copiado' : 'Copiar Cena 3'}</span>
                    </button>

                    {!s3Valid && variant === 'D' && (
                        <button
                            type="button"
                            id={`btn-repair-s3-${variation.id}`}
                            disabled={repairingScene !== null || isGenerating}
                            onClick={() => onSingleSceneRepair(variation.id, 'scene3')}
                            className="w-full py-1.5 px-3 rounded-lg text-[11px] bg-amber-600/90 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-mono font-bold uppercase transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-98"
                        >
                            {isRepairingS3 ? (
                                <>
                                    <LucideIcon name="loader-2" className="w-3.5 h-3.5 animate-spin text-white" />
                                    <span>Reparando somente Cena 3...</span>
                                </>
                            ) : (
                                <>
                                    <LucideIcon name="wrench" className="w-3.5 h-3.5 text-amber-200" />
                                    <span>Reparar somente Cena 3</span>
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>

            {/* Card Global Error if any */}
            {repairError && (
                <div className="text-[10px] text-red-400 font-mono bg-red-950/40 p-2 rounded-lg border border-red-900/60">
                    {repairError}
                </div>
            )}

            {/* Primary Actions: Pair Copy & Used State Toggle (Visible only when variation is ready) */}
            {ready && (
                <div id={`variation-final-actions-${variation.id}`} className="pt-3 border-t border-neutral-800/80 flex flex-col sm:flex-row items-center gap-2 font-mono">
                    <button
                        type="button"
                        id={`btn-copy-pair-${variation.id}`}
                        disabled={!ready}
                        onClick={handleCopyPair}
                        title="Copiar Cena 2 + Cena 3 formatadas"
                        className={`w-full sm:flex-1 py-2 px-3 rounded-xl text-xs font-bold uppercase transition flex items-center justify-center gap-1.5 cursor-pointer ${
                            isPairCopiado
                                ? 'bg-emerald-600 text-white shadow-sm border border-emerald-500'
                                : 'bg-emerald-700/80 hover:bg-emerald-600 text-white border border-emerald-600/70 shadow-sm'
                        }`}
                    >
                        <LucideIcon name={isPairCopiado ? 'check' : 'layers'} className="w-3.5 h-3.5" />
                        <span>{isPairCopiado ? '✓ Copiado' : 'Copiar Cena 2 + Cena 3'}</span>
                    </button>

                    <button
                        type="button"
                        id={`btn-toggle-used-${variation.id}`}
                        onClick={() => onToggleUsed(variation.id, ready)}
                        title={isUsed ? 'Clique para marcar novamente como disponível' : 'Marcar variação como usada'}
                        className={`w-full sm:w-auto py-2 px-3 rounded-xl text-xs font-bold uppercase transition flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                            isUsed
                                ? 'bg-neutral-800 text-emerald-400 border border-emerald-700/60 hover:bg-neutral-750'
                                : 'bg-neutral-850 hover:bg-neutral-800 text-neutral-300 border border-neutral-750 hover:text-white'
                        }`}
                    >
                        <LucideIcon name={isUsed ? 'check-circle' : 'circle'} className={`w-3.5 h-3.5 ${isUsed ? 'text-emerald-400' : 'text-neutral-400'}`} />
                        <span>{isUsed ? '✓ Usada (Desmarcar)' : 'Marcar como usada'}</span>
                    </button>
                </div>
            )}
        </div>
    );
};
