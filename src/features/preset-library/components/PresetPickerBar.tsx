import React, { useState } from 'react';
import { SlidersHorizontal, Sparkles, X, Plus, BookOpen, Bookmark } from 'lucide-react';
import { PresetDefinition, PresetModule } from '../types';
import { PresetLibraryModal } from './PresetLibraryModal';
import { getPresetByCode, extractSlashCommands } from '../presetSearch';
import { getFavoritePresetCodes } from '../presetRegistry';

interface PresetPickerBarProps {
  selectedPresets: PresetDefinition[];
  onAddPreset: (preset: PresetDefinition) => void;
  onRemovePreset: (presetCode: string) => void;
  onClearAllPresets?: () => void;
  activeModule?: PresetModule;
  compact?: boolean;
}

export const PresetPickerBar: React.FC<PresetPickerBarProps> = ({
  selectedPresets,
  onAddPreset,
  onRemovePreset,
  onClearAllPresets,
  activeModule = 'virtual_tryon',
  compact = false
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [slashInput, setSlashInput] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);

  // Quick suggestions based on active module
  const quickSuggestions = [
    '/shopee-clean-demo',
    '/tiktokshop-fast-demo',
    '/white-glove-packshot',
    '/editorial-premium',
    '/movieposter',
    '/ugc-natural'
  ];

  const handleQuickAdd = (code: string) => {
    const preset = getPresetByCode(code);
    if (preset) {
      if (!selectedPresets.some((p) => p.code === preset.code)) {
        onAddPreset(preset);
      }
    }
  };

  const handleSlashSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!slashInput.trim()) return;

    const detected = extractSlashCommands(slashInput);
    if (detected.length > 0) {
      detected.forEach((preset) => {
        if (!selectedPresets.some((p) => p.code === preset.code)) {
          onAddPreset(preset);
        }
      });
      setSlashInput('');
      setInputError(null);
    } else {
      // Try single search term
      const single = getPresetByCode(slashInput.trim());
      if (single) {
        if (!selectedPresets.some((p) => p.code === single.code)) {
          onAddPreset(single);
        }
        setSlashInput('');
        setInputError(null);
      } else {
        setInputError(`Código "${slashInput}" não encontrado. Abra a biblioteca.`);
        setTimeout(() => setInputError(null), 3000);
      }
    }
  };

  return (
    <div id="preset-picker-bar" className="w-full bg-slate-900/60 border border-slate-800 rounded-xl p-3 space-y-2.5">
      {/* Top Row: Title, Slash Input & Modal Trigger */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-200">
              Biblioteca Mestre de Códigos & Presets
            </span>
            <span className="hidden sm:inline text-[11px] text-slate-400 ml-2">
              (Use <code className="text-indigo-300 font-mono">/codigo</code> para direcionar o estilo)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick slash input */}
          <form onSubmit={handleSlashSubmit} className="relative flex items-center">
            <input
              id="slash-command-input"
              type="text"
              value={slashInput}
              onChange={(e) => setSlashInput(e.target.value)}
              placeholder="/shopee, /movie..."
              className="w-36 sm:w-44 px-2.5 py-1 text-xs font-mono bg-slate-950 border border-slate-700/80 rounded-lg text-indigo-300 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              className="ml-1 px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg transition"
              title="Adicionar código"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Open Master Library Modal */}
          <button
            id="open-master-preset-library-btn"
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700/80 transition"
          >
            <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
            <span>Explorar Biblioteca</span>
          </button>
        </div>
      </div>

      {inputError && (
        <div className="text-[11px] text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-lg">
          {inputError}
        </div>
      )}

      {/* Applied Presets Chips */}
      {selectedPresets.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-800/80">
          <span className="text-[11px] text-slate-400 font-medium mr-1">
            Presets Ativos:
          </span>
          {selectedPresets.map((preset) => (
            <span
              key={preset.code}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-950/60 text-indigo-200 border border-indigo-500/30 shadow-sm"
            >
              <span className="font-mono font-bold text-indigo-300">{preset.code}</span>
              <span className="text-slate-300 text-[11px]">({preset.label})</span>
              <button
                type="button"
                onClick={() => onRemovePreset(preset.code)}
                className="ml-1 text-slate-400 hover:text-rose-400 transition"
                title="Remover preset"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
          {selectedPresets.length > 1 && onClearAllPresets && (
            <button
              type="button"
              onClick={onClearAllPresets}
              className="text-[11px] text-slate-400 hover:text-slate-200 underline ml-1"
            >
              Limpar todos
            </button>
          )}
        </div>
      )}

      {/* Quick Clickable Suggestions Bar */}
      <div className="flex flex-wrap items-center gap-1 text-[11px] text-slate-400">
        <span className="flex items-center gap-1 text-slate-400 mr-1">
          <Sparkles className="w-3 h-3 text-amber-400" />
          Sugestões rápidas:
        </span>
        {quickSuggestions.map((code) => {
          const isApplied = selectedPresets.some((p) => p.code === code);
          return (
            <button
              key={code}
              type="button"
              onClick={() => handleQuickAdd(code)}
              className={`font-mono px-2 py-0.5 rounded text-[11px] transition ${
                isApplied
                  ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/30'
                  : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-indigo-300 border border-slate-700/50'
              }`}
            >
              {code}
            </button>
          );
        })}
      </div>

      {/* Full Modal */}
      <PresetLibraryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelectPreset={onAddPreset}
        activeModule={activeModule}
        selectedPresetCodes={selectedPresets.map((p) => p.code)}
      />
    </div>
  );
};
