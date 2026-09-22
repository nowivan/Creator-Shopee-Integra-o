import React from 'react';
import { CopyVariation } from '../shared/types';
import { VariationCard } from './VariationCard';
import { LucideIcon } from '../../../components/Common';

interface VariationGridProps {
    variations: CopyVariation[];
    selectedVariationId: string | null;
    onSelectVariation: (variation: CopyVariation) => void;
    isLoading?: boolean;
}

export const VariationGrid: React.FC<VariationGridProps> = ({
    variations,
    selectedVariationId,
    onSelectVariation,
    isLoading = false
}) => {
    if (isLoading) {
        return (
            <div className="bg-[#121214] border border-neutral-800 rounded-xl p-12 text-center flex flex-col items-center justify-center space-y-4">
                <div className="w-10 h-10 rounded-full border-2 border-emerald-500/20 border-t-emerald-500 animate-spin flex items-center justify-center"></div>
                <div>
                    <h4 className="text-sm font-bold font-mono text-neutral-200 uppercase tracking-wider">
                        Copy Specialist em Execução...
                    </h4>
                    <p className="text-xs text-neutral-500 mt-1">
                        Analisando produto e sintetizando 8 variações de alta conversão
                    </p>
                </div>
            </div>
        );
    }

    if (variations.length === 0) {
        return null;
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                        <LucideIcon name="layers" className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="text-xs font-bold font-mono tracking-wider uppercase text-neutral-200">
                            Variações Geradas ({variations.length})
                        </h3>
                        <p className="text-[11px] text-neutral-500">
                            Selecione a melhor versão de copy para salvar na sessão do projeto
                        </p>
                    </div>
                </div>

                <span className="text-[10px] font-mono text-neutral-500 bg-neutral-900 border border-neutral-800 px-2 py-1 rounded">
                    Exactly 8 Variations
                </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {variations.map((variation) => (
                    <VariationCard
                        key={variation.variationId}
                        variation={variation}
                        isSelected={selectedVariationId === variation.variationId}
                        onSelect={onSelectVariation}
                    />
                ))}
            </div>
        </div>
    );
};
