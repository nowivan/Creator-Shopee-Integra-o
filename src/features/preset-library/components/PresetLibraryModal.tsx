import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  SlidersHorizontal,
  Bookmark,
  Sparkles,
  Layers,
  ShoppingBag,
  Box,
  Users,
  Shirt,
  Film,
  LayoutGrid,
  Camera,
  Sun,
  Image as ImageIcon,
  Type,
  Wand2,
  Check,
  Copy,
  Plus,
  X,
  ChevronRight,
  Info
} from 'lucide-react';
import { PresetDefinition, PresetCategory, CompatibleModule } from '../types';
import {
  PRESET_CATEGORIES,
  toggleFavoritePreset,
  isFavoritePreset,
  recordRecentPreset
} from '../presetRegistry';
import { searchPresets } from '../presetSearch';

interface PresetLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPreset: (preset: PresetDefinition) => void;
  activeModule?: CompatibleModule;
  selectedPresetCodes?: string[];
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  all: <Sparkles className="w-4 h-4" />,
  favorites: <Bookmark className="w-4 h-4 text-amber-400" />,
  affiliate_marketplace: <ShoppingBag className="w-4 h-4" />,
  product_packshot: <Box className="w-4 h-4" />,
  ugc_lifestyle: <Users className="w-4 h-4" />,
  tryon_fashion: <Shirt className="w-4 h-4" />,
  beauty_cosmetics: <Sparkles className="w-4 h-4" />,
  cinematic_poster: <Film className="w-4 h-4" />,
  social_thumbnail: <LayoutGrid className="w-4 h-4" />,
  camera_angle: <Camera className="w-4 h-4" />,
  lighting_mood: <Sun className="w-4 h-4" />,
  background_scene: <ImageIcon className="w-4 h-4" />,
  text_typography: <Type className="w-4 h-4" />,
  technical_3d: <Layers className="w-4 h-4" />,
  editing_transform: <Wand2 className="w-4 h-4" />
};

export const PresetLibraryModal: React.FC<PresetLibraryModalProps> = ({
  isOpen,
  onClose,
  onSelectPreset,
  activeModule = 'virtual_tryon',
  selectedPresetCodes = []
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<PresetCategory | 'all' | 'favorites'>('all');
  const [selectedPresetDetail, setSelectedPresetDetail] = useState<PresetDefinition | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [favUpdateTrigger, setFavUpdateTrigger] = useState(0);

  // Close on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const filteredPresets = useMemo(() => {
    return searchPresets({
      searchQuery,
      category: selectedCategory,
      compatibleModule: activeModule as CompatibleModule | undefined
    });
  }, [searchQuery, selectedCategory, activeModule, favUpdateTrigger]);

  // Set initial selected preset for detail view if list has items
  useEffect(() => {
    if (filteredPresets.length > 0 && (!selectedPresetDetail || !filteredPresets.some(p => p.code === selectedPresetDetail.code))) {
      setSelectedPresetDetail(filteredPresets[0]);
    } else if (filteredPresets.length === 0) {
      setSelectedPresetDetail(null);
    }
  }, [filteredPresets]);

  const handleToggleFavorite = (e: React.MouseEvent, code: string) => {
    e.stopPropagation();
    toggleFavoritePreset(code);
    setFavUpdateTrigger((prev) => prev + 1);
  };

  const handleCopyCode = (e: React.MouseEvent, code: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleApply = (preset: PresetDefinition) => {
    recordRecentPreset(preset.code);
    onSelectPreset(preset);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in">
      <div 
        id="preset-library-modal"
        className="flex flex-col w-full max-w-5xl h-[88vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 text-indigo-400">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                Biblioteca Mestre de Presets & Slash Commands
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {filteredPresets.length} disponíveis
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Digite um comando <code className="px-1 py-0.5 rounded bg-slate-800 text-indigo-300 font-mono">/codigo</code> ou selecione um preset profissional para direcionar o motor criativo.
              </p>
            </div>
          </div>
          <button
            id="close-preset-library-btn"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
            title="Fechar (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar & Categories */}
        <div className="px-6 py-3 border-b border-slate-800 bg-slate-950/60 space-y-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              id="preset-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por código (/shopee, /movieposter), estilo, nicho ou palavra-chave..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs px-1.5 py-0.5 rounded bg-slate-800"
              >
                Limpar
              </button>
            )}
          </div>

          {/* Categories Pill Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-800">
            <button
              id="filter-category-all"
              onClick={() => setSelectedCategory('all')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                selectedCategory === 'all'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {CATEGORY_ICONS.all}
              Todos
            </button>
            <button
              id="filter-category-favorites"
              onClick={() => setSelectedCategory('favorites')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                selectedCategory === 'favorites'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {CATEGORY_ICONS.favorites}
              Favoritos
            </button>
            <div className="w-px h-5 bg-slate-800 mx-1 flex-shrink-0" />
            {PRESET_CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  id={`filter-category-${cat.id}`}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  {CATEGORY_ICONS[cat.id] || <Sparkles className="w-3.5 h-3.5" />}
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Body: Split Left (List) and Right (Detail Inspection) */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Preset List Grid */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2.5 border-r border-slate-800 scrollbar-thin scrollbar-thumb-slate-800">
            {filteredPresets.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center p-6 text-slate-400">
                <SlidersHorizontal className="w-10 h-10 text-slate-600 mb-3" />
                <p className="font-semibold text-slate-300">Nenhum preset encontrado</p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  Tente buscar por termos mais genéricos como "vídeo", "estúdio", "roupa", "cinema" ou troque de categoria.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredPresets.map((preset) => {
                  const isSelected = selectedPresetDetail?.code === preset.code;
                  const isAlreadyApplied = selectedPresetCodes.includes(preset.code);
                  const isFav = isFavoritePreset(preset.code);

                  return (
                    <div
                      key={preset.code}
                      id={`preset-card-${preset.code.replace('/', '')}`}
                      onClick={() => setSelectedPresetDetail(preset)}
                      className={`group relative p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'bg-indigo-950/30 border-indigo-500/60 ring-1 ring-indigo-500/30'
                          : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800/80 hover:border-slate-600'
                      }`}
                    >
                      <div>
                        {/* Top Code & Actions */}
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                            {preset.code}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => handleToggleFavorite(e, preset.code)}
                              className={`p-1 rounded hover:bg-slate-700 transition ${
                                isFav ? 'text-amber-400' : 'text-slate-500 hover:text-slate-300'
                              }`}
                              title={isFav ? 'Remover dos favoritos' : 'Favoritar preset'}
                            >
                              <Bookmark className="w-3.5 h-3.5" fill={isFav ? 'currentColor' : 'none'} />
                            </button>
                            <button
                              onClick={(e) => handleCopyCode(e, preset.code)}
                              className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-slate-700 transition"
                              title="Copiar código"
                            >
                              {copiedCode === preset.code ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Label */}
                        <h3 className="text-sm font-semibold text-slate-200 group-hover:text-white transition">
                          {preset.label}
                        </h3>

                        {/* Description */}
                        <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                          {preset.description}
                        </p>
                      </div>

                      {/* Bottom Tags / Meta */}
                      <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-slate-700/40 text-[11px]">
                        <span className="text-slate-400 truncate max-w-[150px]">
                          {preset.bestFor[0] || 'Geral'}
                        </span>
                        {isAlreadyApplied ? (
                          <span className="text-emerald-400 font-medium flex items-center gap-1">
                            <Check className="w-3 h-3" /> Aplicado
                          </span>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApply(preset);
                            }}
                            className="text-indigo-400 group-hover:text-indigo-300 font-medium flex items-center gap-0.5 hover:underline"
                          >
                            Aplicar <ChevronRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: Detailed Preset Inspector */}
          <div className="w-80 lg:w-96 flex flex-col bg-slate-950/70 p-5 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
            {selectedPresetDetail ? (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-sm font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                      {selectedPresetDetail.code}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">
                      {PRESET_CATEGORIES.find((c) => c.id === selectedPresetDetail.category)?.label || selectedPresetDetail.category}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-100 mt-2">
                    {selectedPresetDetail.label}
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    {selectedPresetDetail.description}
                  </p>
                </div>

                {/* Best For */}
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                  <div className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Ideal para:
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {selectedPresetDetail.bestFor.map((item, idx) => (
                      <span key={idx} className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Visual DNA */}
                {selectedPresetDetail.visualDNA && (
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-indigo-400" />
                      Visual DNA (Regras de Estilo):
                    </div>
                    <ul className="text-xs text-slate-300 space-y-1 pl-4 list-disc marker:text-indigo-400">
                      {selectedPresetDetail.visualDNA.map((dna, idx) => (
                        <li key={idx} className="leading-snug">{dna}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Commercial DNA (if available) */}
                {selectedPresetDetail.commercialDNA && (
                  <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20 space-y-1.5">
                    <div className="text-[11px] font-semibold text-emerald-300 flex items-center gap-1.5">
                      <ShoppingBag className="w-3.5 h-3.5 text-emerald-400" />
                      DNA Comercial:
                    </div>
                    <ul className="text-[11px] text-emerald-200/90 space-y-1 pl-4 list-disc marker:text-emerald-400">
                      {selectedPresetDetail.commercialDNA.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Technical Prompt Injections */}
                <div className="space-y-2">
                  <div className="text-[11px] font-semibold text-slate-300">
                    Injeção de Prompt (Inglês):
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300 leading-relaxed max-h-28 overflow-y-auto">
                    {selectedPresetDetail.promptAdditions.join(' ')}
                  </div>
                </div>

                {/* Apply Button */}
                <div className="pt-2">
                  <button
                    id="apply-preset-modal-btn"
                    onClick={() => handleApply(selectedPresetDetail)}
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium text-xs rounded-xl shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 transition"
                  >
                    <Check className="w-4 h-4" />
                    Aplicar Preset ao Módulo Ativo
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 text-center text-xs">
                <Info className="w-8 h-8 text-slate-600 mb-2" />
                Selecione um preset para ver os detalhes completos de estilo, prompt e parâmetros.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
