import React, { useState, useRef } from 'react';
import { LucideIcon, Button } from '../Common';
import {
    CommerceUIState,
    CinematicUIMode,
    CommerceDurationOption,
    CommerceAudioMode,
    CommerceEnvironmentMode,
    CommerceCameraStrategy
} from './CommerceTypes';
import {
    CommerceDemoFamily,
    COMMERCE_DEMO_FAMILIES
} from '../../features/cinematic';

interface CommerceControlCardsProps {
    uiState: CommerceUIState;
    onChange: (updater: (prev: CommerceUIState) => CommerceUIState) => void;
    // Product & Base fields
    productName: string;
    setProductName: (name: string) => void;
    category: string;
    setCategory: (cat: string) => void;
    productFile: File | null;
    productPreview: string;
    productDetails: string;
    setProductDetails: (d: string) => void;
    onProductFileSelect: (f: File) => void;
    onProductClear: () => void;
    onExtractDetails?: () => void;
    isExtractingDetails?: boolean;
    isAnalyzingProduct?: boolean;
    productPasteFeedback?: { message: string; name: string; size: string } | null;
    productPasteError?: string | null;
}

/**
 * 1. Cinematic Mode Selector: Classic vs Commerce Demo
 */
export const CinematicModeSelector: React.FC<{
    mode: CinematicUIMode;
    onSelectMode: (mode: CinematicUIMode) => void;
}> = ({ mode, onSelectMode }) => {
    return (
        <div className="bg-slate-950/80 p-1.5 rounded-xl border border-slate-800 flex items-center gap-1.5 shadow-inner">
            <button
                type="button"
                onClick={() => onSelectMode('commerce')}
                className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    mode === 'commerce'
                        ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-lg shadow-pink-500/25 border border-pink-500/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
            >
                <LucideIcon name="shopping-bag" className="w-4 h-4 text-pink-300" />
                <span>Commerce Demo V1</span>
                <span className="text-[9px] bg-pink-400/20 text-pink-200 px-1.5 py-0.5 rounded font-mono uppercase">Novo</span>
            </button>
            <button
                type="button"
                onClick={() => onSelectMode('classic')}
                className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    mode === 'classic'
                        ? 'bg-slate-800 text-white shadow border border-slate-700'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
            >
                <LucideIcon name="film" className="w-4 h-4 text-slate-400" />
                <span>Classic Cinematic</span>
                <span className="text-[9px] text-slate-500 font-mono">Legado</span>
            </button>
        </div>
    );
};

/**
 * 2. Product Reference Card (Visual Source of Truth)
 */
export const ProductReferenceCard: React.FC<{
    productName: string;
    setProductName: (name: string) => void;
    category: string;
    setCategory: (cat: string) => void;
    productFile: File | null;
    productPreview: string;
    productDetails: string;
    setProductDetails: (d: string) => void;
    onProductFileSelect: (f: File) => void;
    onProductClear: () => void;
    onExtractDetails?: () => void;
    isExtractingDetails?: boolean;
    isAnalyzingProduct?: boolean;
    productPasteFeedback?: { message: string; name: string; size: string } | null;
    productPasteError?: string | null;
}> = ({
    productName,
    setProductName,
    category,
    setCategory,
    productFile,
    productPreview,
    productDetails,
    setProductDetails,
    onProductFileSelect,
    onProductClear,
    onExtractDetails,
    isExtractingDetails,
    isAnalyzingProduct,
    productPasteFeedback,
    productPasteError
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (f) onProductFileSelect(f);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const f = e.dataTransfer.files?.[0];
        if (f) onProductFileSelect(f);
    };

    return (
        <div className="bg-slate-900/90 border border-pink-500/20 rounded-xl p-4 md:p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                    <div className="bg-pink-500/10 text-pink-400 p-2 rounded-lg">
                        <LucideIcon name="box" className="w-4 h-4" />
                    </div>
                    <div>
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                            Product Reference (Visual Source of Truth)
                        </h4>
                        <p className="text-[10px] text-slate-400">
                            A imagem enviada é a autoridade visual máxima para geometria, materiais e cor.
                        </p>
                    </div>
                </div>
                <div className="inline-flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] px-2 py-0.5 rounded font-mono font-bold">
                    <LucideIcon name="shield-check" className="w-3 h-3" />
                    REFERENCE AUTHORITY
                </div>
            </div>

            {/* Upload Area */}
            <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => !isAnalyzingProduct && fileInputRef.current?.click()}
                className={`relative group border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                    productPreview
                        ? 'border-pink-500/60 bg-pink-500/5'
                        : 'border-slate-700 hover:border-pink-400 hover:bg-slate-850'
                }`}
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                />

                {!productPreview ? (
                    <div className="py-6 pointer-events-none space-y-1.5">
                        <LucideIcon
                            name="image-plus"
                            className="w-8 h-8 mx-auto text-slate-500 group-hover:text-pink-400 transition-colors"
                        />
                        <p className="text-xs text-slate-200 font-semibold">
                            Upload da Imagem do Produto
                        </p>
                        <p className="text-[10px] text-slate-400">
                            Arraste, selecione arquivo ou pressione Ctrl+V para colar
                        </p>
                        {productPasteError && (
                            <p className="text-[10px] text-red-400 mt-1 font-sans">{productPasteError}</p>
                        )}
                        {productPasteFeedback && (
                            <p className="text-[10px] text-emerald-400 mt-1 font-sans">
                                ✓ {productPasteFeedback.message} ({productPasteFeedback.name})
                            </p>
                        )}
                    </div>
                ) : (
                    <div className="relative flex flex-col items-center">
                        <img
                            src={productPreview}
                            alt="Product Reference"
                            className="max-h-44 object-contain rounded-lg shadow-md"
                        />
                        {isAnalyzingProduct && (
                            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center rounded-lg backdrop-blur-sm z-10">
                                <LucideIcon name="scan-eye" className="w-7 h-7 text-pink-400 mb-1.5 animate-pulse" />
                                <span className="text-[10px] font-bold text-pink-300">Analisando produto...</span>
                            </div>
                        )}
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onProductClear();
                                if (fileInputRef.current) fileInputRef.current.value = '';
                            }}
                            className="absolute top-1 right-1 bg-red-600/90 hover:bg-red-600 text-white rounded-full p-1.5 shadow-lg transition-transform hover:scale-105 z-20 cursor-pointer"
                            title="Remover imagem"
                        >
                            <LucideIcon name="x" className="w-3.5 h-3.5" />
                        </button>
                    </div>
                )}
            </div>

            {/* Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1">
                        <LucideIcon name="tag" className="w-3 h-3 text-pink-400" /> Nome do Produto
                    </label>
                    <input
                        type="text"
                        value={productName}
                        onChange={(e) => setProductName(e.target.value)}
                        placeholder="Ex: Relógio Chrono Silver Classic"
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white focus:border-pink-500 outline-none"
                    />
                </div>

                <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1">
                        <LucideIcon name="bookmark" className="w-3 h-3 text-pink-400" /> Categoria
                    </label>
                    <input
                        type="text"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        placeholder="Ex: Relógios de Luxo / Acessórios"
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white focus:border-pink-500 outline-none"
                    />
                </div>

                <div className="sm:col-span-2">
                    <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                            <LucideIcon name="sparkles" className="w-3 h-3 text-pink-400" />
                            Detalhes Visuais & Foco do Produto
                        </label>
                        {onExtractDetails && productPreview && (
                            <button
                                type="button"
                                onClick={onExtractDetails}
                                disabled={isExtractingDetails}
                                className="text-[10px] bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 border border-pink-500/30 px-2 py-0.5 rounded flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            >
                                {isExtractingDetails ? (
                                    <LucideIcon name="loader-2" className="w-3 h-3 animate-spin" />
                                ) : (
                                    <LucideIcon name="wand-2" className="w-3 h-3" />
                                )}
                                <span>Auto-Extrair</span>
                            </button>
                        )}
                    </div>
                    <textarea
                        value={productDetails}
                        onChange={(e) => setProductDetails(e.target.value)}
                        rows={2}
                        placeholder="Ex: Mostrador preto fosco, pulseira de aço escovado, bezel cerâmico polido, ponteiros luminescentes, coroa com logo gravado..."
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white focus:border-pink-500 outline-none resize-none"
                    />
                </div>
            </div>
        </div>
    );
};

/**
 * 3. Avatar Reference Card (Independent Image with Identity Lock)
 */
export const AvatarReferenceCard: React.FC<{
    avatarState: CommerceUIState['avatar'];
    onAvatarChange: (updater: (prev: CommerceUIState['avatar']) => CommerceUIState['avatar']) => void;
}> = ({ avatarState, onAvatarChange }) => {
    const avatarInputRef = useRef<HTMLInputElement>(null);

    const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (f) {
            onAvatarChange((prev) => ({
                ...prev,
                avatarFile: f,
                avatarPreview: URL.createObjectURL(f),
                mode: prev.mode === 'none' ? 'custom' : prev.mode
            }));
        }
    };

    return (
        <div className="bg-slate-900/90 border border-purple-500/20 rounded-xl p-4 md:p-5 space-y-3 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                    <div className="bg-purple-500/10 text-purple-400 p-2 rounded-lg">
                        <LucideIcon name="user-check" className="w-4 h-4" />
                    </div>
                    <div>
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                            Avatar Reference & Identity Lock
                        </h4>
                        <p className="text-[10px] text-slate-400">
                            Carregue a referência da pessoa/apresentador com trava de identidade invariante.
                        </p>
                    </div>
                </div>

                <label className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-lg border border-purple-500/30 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={avatarState.identityLock}
                        onChange={(e) =>
                            onAvatarChange((prev) => ({ ...prev, identityLock: e.target.checked }))
                        }
                        className="w-3.5 h-3.5 accent-purple-500 cursor-pointer"
                    />
                    <span className="text-[10px] font-bold text-purple-300">Identity Lock ON</span>
                </label>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 items-center">
                <div
                    onClick={() => avatarInputRef.current?.click()}
                    className={`w-full sm:w-28 h-24 rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${
                        avatarState.avatarPreview
                            ? 'border-purple-500 bg-purple-500/10'
                            : 'border-slate-700 hover:border-purple-400 hover:bg-slate-850'
                    }`}
                >
                    <input
                        type="file"
                        ref={avatarInputRef}
                        onChange={handleAvatarSelect}
                        accept="image/*"
                        className="hidden"
                    />
                    {avatarState.avatarPreview ? (
                        <div className="relative w-full h-full p-1">
                            <img
                                src={avatarState.avatarPreview}
                                alt="Avatar Reference"
                                className="w-full h-full object-cover rounded"
                            />
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onAvatarChange((prev) => ({
                                        ...prev,
                                        avatarFile: null,
                                        avatarPreview: ''
                                    }));
                                    if (avatarInputRef.current) avatarInputRef.current.value = '';
                                }}
                                className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full p-1 shadow hover:bg-red-700 cursor-pointer"
                            >
                                <LucideIcon name="x" className="w-3 h-3" />
                            </button>
                        </div>
                    ) : (
                        <div className="text-center p-2">
                            <LucideIcon name="user-plus" className="w-5 h-5 mx-auto text-slate-500 mb-1" />
                            <span className="text-[9px] text-slate-400 font-bold block">Foto do Avatar</span>
                        </div>
                    )}
                </div>

                <div className="flex-1 space-y-2 text-xs w-full">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Modo do Avatar</span>
                        <select
                            value={avatarState.mode}
                            onChange={(e) =>
                                onAvatarChange((prev) => ({
                                    ...prev,
                                    mode: e.target.value as any
                                }))
                            }
                            className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white outline-none"
                        >
                            <option value="none">Nenhum (Apenas Mãos / Foco no Produto)</option>
                            <option value="ai_auto">Automático (IA Sugere Apresentador)</option>
                            <option value="custom">Apresentador Customizado</option>
                        </select>
                    </div>

                    <input
                        type="text"
                        value={avatarState.presenterStyle}
                        onChange={(e) =>
                            onAvatarChange((prev) => ({ ...prev, presenterStyle: e.target.value }))
                        }
                        placeholder="Ex: Apresentadora profissional de 20-30 anos com sorriso acolhedor..."
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white focus:border-purple-500 outline-none"
                    />
                </div>
            </div>
        </div>
    );
};

/**
 * 4. Avatar & Wardrobe Control Card (Collapsible)
 */
export const AvatarWardrobeCard: React.FC<{
    avatarState: CommerceUIState['avatar'];
    onAvatarChange: (updater: (prev: CommerceUIState['avatar']) => CommerceUIState['avatar']) => void;
}> = ({ avatarState, onAvatarChange }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full p-4 flex items-center justify-between bg-slate-900 hover:bg-slate-850 transition text-left cursor-pointer"
            >
                <div className="flex items-center gap-2">
                    <div className="bg-indigo-500/10 text-indigo-400 p-2 rounded-lg">
                        <LucideIcon name="shirt" className="w-4 h-4" />
                    </div>
                    <div>
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                            Avatar & Wardrobe Controls
                        </h4>
                        <p className="text-[10px] text-slate-400">
                            Customização de roupas (Top, Bottom, Calçado, Acessórios) sem alterar a identidade.
                        </p>
                    </div>
                </div>
                <LucideIcon
                    name={isOpen ? 'chevron-up' : 'chevron-down'}
                    className="w-4 h-4 text-slate-400"
                />
            </button>

            {isOpen && (
                <div className="p-4 border-t border-slate-800 space-y-4 animate-fade-in bg-slate-950/40">
                    <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center gap-2">
                        <LucideIcon name="alert-circle" className="w-4 h-4 text-amber-400 shrink-0" />
                        <span className="text-[10px] text-amber-200">
                            <strong>Aviso de Estabilidade:</strong> Os controles de vestuário alteram as roupas do avatar, mas a identidade facial permanece estritamente invariante.
                        </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">
                                Top / Parte Superior
                            </label>
                            <input
                                type="text"
                                value={avatarState.wardrobe.top}
                                onChange={(e) =>
                                    onAvatarChange((prev) => ({
                                        ...prev,
                                        wardrobe: { ...prev.wardrobe, top: e.target.value }
                                    }))
                                }
                                placeholder="Ex: Camiseta preta oversized minimalista"
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white focus:border-indigo-500 outline-none"
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">
                                Bottom / Parte Inferior
                            </label>
                            <input
                                type="text"
                                value={avatarState.wardrobe.bottom}
                                onChange={(e) =>
                                    onAvatarChange((prev) => ({
                                        ...prev,
                                        wardrobe: { ...prev.wardrobe, bottom: e.target.value }
                                    }))
                                }
                                placeholder="Ex: Calça de alfaiataria escura"
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white focus:border-indigo-500 outline-none"
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">
                                Calçado / Footwear
                            </label>
                            <input
                                type="text"
                                value={avatarState.wardrobe.footwear}
                                onChange={(e) =>
                                    onAvatarChange((prev) => ({
                                        ...prev,
                                        wardrobe: { ...prev.wardrobe, footwear: e.target.value }
                                    }))
                                }
                                placeholder="Ex: Sneakers brancos minimalistas limpos"
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white focus:border-indigo-500 outline-none"
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">
                                Acessórios
                            </label>
                            <input
                                type="text"
                                value={avatarState.wardrobe.accessories}
                                onChange={(e) =>
                                    onAvatarChange((prev) => ({
                                        ...prev,
                                        wardrobe: { ...prev.wardrobe, accessories: e.target.value }
                                    }))
                                }
                                placeholder="Ex: Anel prateado fino, sem joias chamativas"
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white focus:border-indigo-500 outline-none"
                            />
                        </div>

                        <div className="sm:col-span-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">
                                Descrição Geral do Look
                            </label>
                            <input
                                type="text"
                                value={avatarState.wardrobe.customDescription}
                                onChange={(e) =>
                                    onAvatarChange((prev) => ({
                                        ...prev,
                                        wardrobe: { ...prev.wardrobe, customDescription: e.target.value }
                                    }))
                                }
                                placeholder="Ex: Estilo clean luxury contemporâneo com tecidos premium..."
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white focus:border-indigo-500 outline-none"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

/**
 * 5. Environment & Lighting Control Card
 */
export const EnvironmentCard: React.FC<{
    envState: CommerceUIState['environment'];
    onEnvChange: (updater: (prev: CommerceUIState['environment']) => CommerceUIState['environment']) => void;
}> = ({ envState, onEnvChange }) => {
    return (
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 md:p-5 space-y-4 shadow-xl">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <div className="bg-blue-500/10 text-blue-400 p-2 rounded-lg">
                    <LucideIcon name="map-pin" className="w-4 h-4" />
                </div>
                <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                        Environment, Surface & Lighting
                    </h4>
                    <p className="text-[10px] text-slate-400">
                        Definições de cenário, superfície física de apoio e iluminação comercial de estúdio.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">
                        Modo do Cenário
                    </label>
                    <select
                        value={envState.mode}
                        onChange={(e) =>
                            onEnvChange((prev) => ({ ...prev, mode: e.target.value as CommerceEnvironmentMode }))
                        }
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white outline-none cursor-pointer"
                    >
                        <option value="clean_studio">✨ Clean Studio (Estúdio Comercial Minimalista)</option>
                        <option value="luxury_retail">🏛️ Luxury Retail (Boutique de Luxo / Vitrine)</option>
                        <option value="lifestyle_home">🏡 Lifestyle Home (Ambiente Residencial Contemporâneo)</option>
                        <option value="outdoor_street">🌆 Outdoor Street / Golden Hour (Exterior Urbano)</option>
                        <option value="ambient_match">🔄 Ambient Match AI (Alinhado com a Referência)</option>
                        <option value="custom">🛠️ Personalizado (Custom)</option>
                    </select>
                </div>

                <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">
                        Estilo de Iluminação
                    </label>
                    <select
                        value={envState.lightingStyle}
                        onChange={(e) =>
                            onEnvChange((prev) => ({ ...prev, lightingStyle: e.target.value }))
                        }
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white outline-none cursor-pointer"
                    >
                        <option value="Clean commercial studio 3-point lighting with soft fill and crisp edge definition">
                            Soft Commercial Studio (3-Point Pro)
                        </option>
                        <option value="Dramatic high-contrast rim lighting with crisp specular reflections">
                            High-Contrast Dramatic & Rim Lights
                        </option>
                        <option value="Warm natural golden hour window light with gentle wrap-around fill">
                            Natural Daylight / Warm Golden Hour
                        </option>
                        <option value="Luxury boutique spotlights with diffused ambient ceiling bounce">
                            Luxury Boutique Spotlights
                        </option>
                        <option value="Cyberpunk high-tech neon accents with deep moody contrast">
                            Neon Tech / Cyberpunk Accent
                        </option>
                    </select>
                </div>

                <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">
                        Superfície de Apoio
                    </label>
                    <input
                        type="text"
                        value={envState.surface}
                        onChange={(e) =>
                            onEnvChange((prev) => ({ ...prev, surface: e.target.value }))
                        }
                        placeholder="Ex: Pedestal fosco minimalista / Tampo de mármore italiano"
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white focus:border-blue-500 outline-none"
                    />
                </div>

                <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">
                        Profundidade do Fundo (Bokeh)
                    </label>
                    <select
                        value={envState.backgroundActivity}
                        onChange={(e) =>
                            onEnvChange((prev) => ({
                                ...prev,
                                backgroundActivity: e.target.value as any
                            }))
                        }
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white outline-none cursor-pointer"
                    >
                        <option value="soft_blur">Fundo suavemente desfocado (Bokeh cinematográfico)</option>
                        <option value="clean_static">Fundo estático e limpo (Sem distrações)</option>
                        <option value="active_subtle">Movimento sutil no fundo (Ambiente vivo)</option>
                    </select>
                </div>
            </div>
        </div>
    );
};

/**
 * 6. Commerce Demo Style Card (Demo Family Selector)
 */
export const CommerceDemoStyleCard: React.FC<{
    demoFamily: CommerceDemoFamily;
    onSelectFamily: (fam: CommerceDemoFamily) => void;
}> = ({ demoFamily, onSelectFamily }) => {
    const selectedDef = demoFamily !== 'AUTO' ? COMMERCE_DEMO_FAMILIES[demoFamily] : null;

    return (
        <div className="bg-slate-900/90 border border-pink-500/20 rounded-xl p-4 md:p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                    <div className="bg-pink-500/10 text-pink-400 p-2 rounded-lg">
                        <LucideIcon name="sparkles" className="w-4 h-4" />
                    </div>
                    <div>
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                            Commerce Demo Style & Shot Strategy
                        </h4>
                        <p className="text-[10px] text-slate-400">
                            Selecione a família de demonstração focada em conversão e retenção social.
                        </p>
                    </div>
                </div>
            </div>

            <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">
                    Família de Demonstração Comercial
                </label>
                <select
                    value={demoFamily}
                    onChange={(e) => onSelectFamily(e.target.value as CommerceDemoFamily)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:border-pink-500 outline-none cursor-pointer"
                >
                    <option value="AUTO">🤖 AUTO (Recomendado - IA Decide pelo Tipo de Produto)</option>
                    <option value="UGC_POV_NATURAL">📱 UGC POV Natural (Autêntico, 1ª Pessoa, Manuseio Orgânico)</option>
                    <option value="WEAR_DEMO">👗 Wear Demo (Caimento no Corpo/Pulso & Escala Real)</option>
                    <option value="HAND_DEMO">🖐️ Hand Demo (Manuseio & Toque Tátil Guiado)</option>
                    <option value="MACRO_DETAIL">🔍 Macro Detail (Close Extremo em Materiais & Mecanismos)</option>
                    <option value="UNBOXING">🎁 Unboxing (Abertura de Embalagem & Revelação)</option>
                    <option value="PREMIUM_STUDIO">✨ Premium Studio (Comercial de Estúdio Clean & Polido)</option>
                    <option value="LIFESTYLE">☕ Lifestyle (Contexto Real de Uso no Cotidiano)</option>
                    <option value="EDITORIAL_LOOKBOOK">📸 Editorial Lookbook (Estética High-Fashion & Vitrine)</option>
                    <option value="HIGH_ENERGY_VIRAL">⚡ High-Energy Viral (Cortes Dinâmicos & Pacing TikTok)</option>
                </select>
            </div>

            {selectedDef && (
                <div className="p-3 bg-pink-950/20 border border-pink-500/20 rounded-xl space-y-1.5 animate-fade-in text-xs">
                    <div className="flex items-center justify-between">
                        <span className="font-bold text-pink-300">{selectedDef.label}</span>
                        <span className="text-[9px] bg-pink-500/20 text-pink-300 px-2 py-0.5 rounded font-mono font-bold">
                            {selectedDef.pacingTempo}
                        </span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">{selectedDef.description}</p>
                    <div className="flex flex-wrap gap-1 pt-1">
                        {selectedDef.baseInformationPriority.map((info) => (
                            <span
                                key={info}
                                className="text-[9px] bg-slate-900 text-slate-300 border border-slate-700 px-2 py-0.5 rounded"
                            >
                                + {info}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

/**
 * 7. Camera & Motion Control Card
 */
export const CameraMotionCard: React.FC<{
    cameraState: CommerceUIState['camera'];
    onCameraChange: (updater: (prev: CommerceUIState['camera']) => CommerceUIState['camera']) => void;
}> = ({ cameraState, onCameraChange }) => {
    return (
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 md:p-5 space-y-4 shadow-xl">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <div className="bg-emerald-500/10 text-emerald-400 p-2 rounded-lg">
                    <LucideIcon name="video" className="w-4 h-4" />
                </div>
                <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                        Camera & Motion Controls
                    </h4>
                    <p className="text-[10px] text-slate-400">
                        Estratégia de movimento de câmera e balanceamento de complexidade.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">
                        Estratégia de Câmera
                    </label>
                    <select
                        value={cameraState.strategy}
                        onChange={(e) =>
                            onCameraChange((prev) => ({
                                ...prev,
                                strategy: e.target.value as CommerceCameraStrategy
                            }))
                        }
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white outline-none cursor-pointer"
                    >
                        <option value="auto">Automático / Balanceado</option>
                        <option value="handheld_ugc">Handheld UGC (Micro-shakes orgânicos)</option>
                        <option value="smooth_commercial">Smooth Commercial (Movimentos fluidos de estúdio)</option>
                        <option value="dynamic_orbit">Dynamic Orbit (Órbita suave ao redor do produto)</option>
                        <option value="macro_push">Macro Push-in (Aproximação em texturas)</option>
                        <option value="static_tripod">Static Tripod (Tripé estático estável)</option>
                    </select>
                </div>

                <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">
                        Modo Órbita 360° (Object Lock 360°)
                    </label>
                    <select
                        value={cameraState.orbitMode}
                        onChange={(e) =>
                            onCameraChange((prev) => ({
                                ...prev,
                                orbitMode: e.target.value as any
                            }))
                        }
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white outline-none cursor-pointer"
                    >
                        <option value="none">Desativado (Câmera frontal / lateral)</option>
                        <option value="180_orbit">Semi-Órbita 180° Suave</option>
                        <option value="360_orbit">Órbita 360° Completa (Object Lock Ativo)</option>
                    </select>
                </div>

                <div className="sm:col-span-2 flex flex-wrap gap-4 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={cameraState.handheldMicroShakes}
                            onChange={(e) =>
                                onCameraChange((prev) => ({
                                    ...prev,
                                    handheldMicroShakes: e.target.checked
                                }))
                            }
                            className="w-3.5 h-3.5 accent-emerald-500 cursor-pointer"
                        />
                        <span className="text-[11px] text-slate-300">Micro-shakes handheld orgânicos</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={cameraState.macroFocus}
                            onChange={(e) =>
                                onCameraChange((prev) => ({
                                    ...prev,
                                    macroFocus: e.target.checked
                                }))
                            }
                            className="w-3.5 h-3.5 accent-emerald-500 cursor-pointer"
                        />
                        <span className="text-[11px] text-slate-300">Foco macro dinâmico em detalhes</span>
                    </label>
                </div>
            </div>
        </div>
    );
};

/**
 * 8. Duration & Audio Card
 */
export const DurationAudioCard: React.FC<{
    duration: CommerceDurationOption;
    onDurationChange: (dur: CommerceDurationOption) => void;
    audioMode: CommerceAudioMode;
    onAudioModeChange: (mode: CommerceAudioMode) => void;
    aspectRatio: '9:16' | '16:9' | '1:1';
    onAspectRatioChange: (ar: '9:16' | '16:9' | '1:1') => void;
}> = ({
    duration,
    onDurationChange,
    audioMode,
    onAudioModeChange,
    aspectRatio,
    onAspectRatioChange
}) => {
    return (
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 md:p-5 space-y-4 shadow-xl">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <div className="bg-yellow-500/10 text-yellow-400 p-2 rounded-lg">
                    <LucideIcon name="clock" className="w-4 h-4" />
                </div>
                <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                        Duration, Format & Audio
                    </h4>
                    <p className="text-[10px] text-slate-400">
                        Tempo de execução em beats, formato de vídeo e diretrizes sonoras.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                {/* Duration */}
                <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">
                        Duração do Vídeo
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                        {([8, 10, 15] as CommerceDurationOption[]).map((d) => (
                            <button
                                key={d}
                                type="button"
                                onClick={() => onDurationChange(d)}
                                className={`py-2 rounded-lg font-bold text-xs transition cursor-pointer ${
                                    duration === d
                                        ? 'bg-pink-600 text-white shadow'
                                        : 'bg-slate-950 text-slate-400 hover:bg-slate-850 hover:text-white'
                                }`}
                            >
                                {d}s
                            </button>
                        ))}
                    </div>
                </div>

                {/* Aspect Ratio */}
                <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">
                        Formato / Aspect Ratio
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                        {(['9:16', '16:9', '1:1'] as const).map((ar) => (
                            <button
                                key={ar}
                                type="button"
                                onClick={() => onAspectRatioChange(ar)}
                                className={`py-2 rounded-lg font-bold text-xs transition cursor-pointer ${
                                    aspectRatio === ar
                                        ? 'bg-purple-600 text-white shadow'
                                        : 'bg-slate-950 text-slate-400 hover:bg-slate-850 hover:text-white'
                                }`}
                            >
                                {ar}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Audio Mode */}
                <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">
                        Diretriz Sonora
                    </label>
                    <select
                        value={audioMode}
                        onChange={(e) => onAudioModeChange(e.target.value as CommerceAudioMode)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white outline-none cursor-pointer"
                    >
                        <option value="music_only">🎵 Music Only (Sem Fala / Beat Comercial)</option>
                        <option value="voiceover_pt">🎙️ Voiceover PT-BR (Locução Opcional)</option>
                        <option value="dialogue">💬 Diálogo em Cena</option>
                    </select>
                </div>
            </div>
        </div>
    );
};

/**
 * 9. Advanced Stability & Anti-Morph Card
 */
export const AdvancedStabilityCard: React.FC<{
    customNegative: string;
    onCustomNegativeChange: (val: string) => void;
}> = ({ customNegative, onCustomNegativeChange }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full p-4 flex items-center justify-between bg-slate-900 hover:bg-slate-850 transition text-left cursor-pointer"
            >
                <div className="flex items-center gap-2">
                    <div className="bg-emerald-500/10 text-emerald-400 p-2 rounded-lg">
                        <LucideIcon name="shield-check" className="w-4 h-4" />
                    </div>
                    <div>
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                            Advanced Stability Contracts (5 Active Locks)
                        </h4>
                        <p className="text-[10px] text-slate-400">
                            Blindagem contra mutações, duplicações de produtos e quebras anatômicas.
                        </p>
                    </div>
                </div>
                <LucideIcon
                    name={isOpen ? 'chevron-up' : 'chevron-down'}
                    className="w-4 h-4 text-slate-400"
                />
            </button>

            {isOpen && (
                <div className="p-4 border-t border-slate-800 space-y-3 animate-fade-in bg-slate-950/40 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="p-2 bg-emerald-950/20 border border-emerald-500/20 rounded-lg flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-400" />
                            <span className="text-[11px] text-emerald-300 font-semibold">Reference Authority Lock</span>
                        </div>
                        <div className="p-2 bg-emerald-950/20 border border-emerald-500/20 rounded-lg flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-400" />
                            <span className="text-[11px] text-emerald-300 font-semibold">Object Count Persistence</span>
                        </div>
                        <div className="p-2 bg-emerald-950/20 border border-emerald-500/20 rounded-lg flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-400" />
                            <span className="text-[11px] text-emerald-300 font-semibold">Realistic Scale Lock</span>
                        </div>
                        <div className="p-2 bg-emerald-950/20 border border-emerald-500/20 rounded-lg flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-400" />
                            <span className="text-[11px] text-emerald-300 font-semibold">Frame-to-Frame Continuity</span>
                        </div>
                        <div className="sm:col-span-2 p-2 bg-emerald-950/20 border border-emerald-500/20 rounded-lg flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-400" />
                            <span className="text-[11px] text-emerald-300 font-semibold">
                                7-Category Structured Negative Shield (Product, Geometry, Temporal, Hands, Camera, Text, Scene)
                            </span>
                        </div>
                    </div>

                    <div className="pt-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">
                            Negativas Customizadas Adicionais (Opcional)
                        </label>
                        <input
                            type="text"
                            value={customNegative}
                            onChange={(e) => onCustomNegativeChange(e.target.value)}
                            placeholder="Ex: no oversaturated neon reflections, no plastic glare..."
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white focus:border-emerald-500 outline-none"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};
