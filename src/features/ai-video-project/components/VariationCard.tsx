import React from 'react';
import { CopyVariation } from '../shared/types';
import { LucideIcon } from '../../../components/Common';

interface VariationCardProps {
    variation: CopyVariation;
    isSelected: boolean;
    onSelect: (variation: CopyVariation) => void;
    disabled?: boolean;
}

export const VariationCard: React.FC<VariationCardProps> = ({
    variation,
    isSelected,
    onSelect,
    disabled = false
}) => {
    return (
        <div
            className={`flex flex-col justify-between rounded-xl border p-4 transition-all duration-200 ${
                isSelected
                    ? 'bg-emerald-950/20 border-emerald-500/80 shadow-[0_0_20px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/50'
                    : 'bg-[#121214] border-neutral-800 hover:border-neutral-700'
            }`}
        >
            {/* Header: Version Number & Tag */}
            <div className="flex items-center justify-between border-b border-neutral-800/80 pb-2.5 mb-3">
                <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase tracking-wider bg-neutral-800 text-neutral-200 border border-neutral-700">
                        Version {variation.versionNumber}
                    </span>
                    {variation.hookStyle && (
                        <span className="text-[10px] text-neutral-400 font-mono truncate max-w-[130px]" title={variation.hookStyle}>
                            {variation.hookStyle}
                        </span>
                    )}
                </div>

                {isSelected && (
                    <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30">
                        <LucideIcon name="check-circle" className="w-3 h-3" /> Selecionada
                    </span>
                )}
            </div>

            {/* Body: Scene 2 & Scene 3 Copies */}
            <div className="space-y-3.5 flex-1 mb-4 text-left">
                {/* Scene 2 Copy */}
                <div className="bg-[#0A0A0B] p-2.5 rounded-lg border border-neutral-850">
                    <span className="text-[9px] font-mono font-bold text-indigo-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
                        <LucideIcon name="film" className="w-3 h-3" /> Scene 2 Copy
                    </span>
                    <p className="text-xs text-neutral-300 leading-relaxed">
                        {variation.scene2Copy || '(Nenhum texto gerado para a cena 2)'}
                    </p>
                </div>

                {/* Scene 3 Copy */}
                <div className="bg-[#0A0A0B] p-2.5 rounded-lg border border-neutral-850">
                    <span className="text-[9px] font-mono font-bold text-emerald-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
                        <LucideIcon name="sparkles" className="w-3 h-3" /> Scene 3 Copy
                    </span>
                    <p className="text-xs text-neutral-300 leading-relaxed">
                        {variation.scene3Copy || '(Nenhum texto gerado para a cena 3)'}
                    </p>
                </div>
            </div>

            {/* Footer: Select Button */}
            <button
                type="button"
                onClick={() => onSelect(variation)}
                disabled={disabled}
                className={`w-full py-2 px-3 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    isSelected
                        ? 'bg-emerald-500 text-black hover:bg-emerald-400 shadow-sm'
                        : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 hover:border-neutral-600'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                <LucideIcon name={isSelected ? "check" : "mouse-pointer-click"} className="w-3.5 h-3.5" />
                {isSelected ? "Selected" : "Select"}
            </button>
        </div>
    );
};
