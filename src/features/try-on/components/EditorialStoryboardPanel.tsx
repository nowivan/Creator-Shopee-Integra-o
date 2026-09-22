import React, { useState } from 'react';
import { LucideIcon } from '../../../components/Common';
import { copyToClipboard } from '../../../utils';
import {
  EditorialStoryboardResult,
  EditorialStoryboardShot,
  EDITORIAL_BRAND_SAFETY_WARNING,
  formatGoogleVidsPrompt,
  formatEditorialModelPrompt,
  formatEditorialStoryboardClipboard,
  saveEditorialStoryboardToVault,
  EditorialTextMode
} from '../editorialStoryboardMode';

interface EditorialStoryboardPanelProps {
  result: EditorialStoryboardResult;
  textMode?: EditorialTextMode;
  customText?: string;
  onSavedToVault?: () => void;
}

export const EditorialStoryboardPanel: React.FC<EditorialStoryboardPanelProps> = ({
  result,
  textMode = 'no_text',
  customText,
  onSavedToVault
}) => {
  const [activeExportPreset, setActiveExportPreset] = useState<'all' | 'google_vids' | 'model_prompt'>('all');
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedGoogleVids, setCopiedGoogleVids] = useState(false);
  const [copiedModelPrompt, setCopiedModelPrompt] = useState(false);
  const [copiedShotIdx, setCopiedShotIdx] = useState<number | null>(null);
  const [copiedShotPromptIdx, setCopiedShotPromptIdx] = useState<number | null>(null);
  const [copiedLockKey, setCopiedLockKey] = useState<string | null>(null);
  const [vaultSaved, setVaultSaved] = useState(false);

  const handleCopyAll = async () => {
    const text = formatEditorialStoryboardClipboard(result);
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2500);
    }
  };

  const handleCopyGoogleVids = async () => {
    const text = formatGoogleVidsPrompt(result, textMode as EditorialTextMode, customText);
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedGoogleVids(true);
      setTimeout(() => setCopiedGoogleVids(false), 2500);
    }
  };

  const handleCopyModelPrompt = async () => {
    const text = formatEditorialModelPrompt(result);
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedModelPrompt(true);
      setTimeout(() => setCopiedModelPrompt(false), 2500);
    }
  };

  const handleSaveToVault = () => {
    try {
      saveEditorialStoryboardToVault(result);
      setVaultSaved(true);
      onSavedToVault?.();
      setTimeout(() => setVaultSaved(false), 3000);
    } catch (err) {
      console.error('Failed to save to Prompt Vault:', err);
    }
  };

  const handleCopyShot = async (shot: EditorialStoryboardShot, idx: number) => {
    const lines = [
      `📽️ [SHOT ${shot.shot_number}] ${shot.title.toUpperCase()}`,
      `🎬 Ação: ${shot.visual_action}`,
      `🎥 Câmera / Lente: ${shot.camera_framing}`,
      `💡 Iluminação: ${shot.lighting}`,
      `🔒 Trava do Produto: ${shot.product_lock}`,
      shot.visible_text_pt_br ? `💬 Texto Visível: "${shot.visible_text_pt_br}"` : '',
      `\nPROMPT (EN):\n${shot.prompt_en}`,
      `🚫 Negativos: ${shot.negative_constraints}`
    ].filter(Boolean);

    const ok = await copyToClipboard(lines.join('\n'));
    if (ok) {
      setCopiedShotIdx(idx);
      setTimeout(() => setCopiedShotIdx(null), 2000);
    }
  };

  const handleCopyShotPromptOnly = async (prompt: string, idx: number) => {
    const ok = await copyToClipboard(prompt);
    if (ok) {
      setCopiedShotPromptIdx(idx);
      setTimeout(() => setCopiedShotPromptIdx(null), 2000);
    }
  };

  const handleCopyLock = async (text: string, key: string) => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedLockKey(key);
      setTimeout(() => setCopiedLockKey(null), 2000);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in text-slate-100 font-sans">
      {/* Brand Safety Warning Banner */}
      <div className="bg-amber-950/40 border border-amber-500/30 p-3.5 rounded-xl flex items-center gap-3 text-amber-200 text-xs shadow-sm">
        <LucideIcon name="shield-alert" className="w-5 h-5 text-amber-400 shrink-0" />
        <p className="leading-relaxed">
          <strong className="font-semibold text-amber-300">Diretriz de Segurança de Marca: </strong>
          {EDITORIAL_BRAND_SAFETY_WARNING}
        </p>
      </div>

      {/* Header bar */}
      <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
              <LucideIcon name="gem" className="w-3 h-3" /> Storyboard Editorial
            </span>
            <span className="text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
              {result.shots.length} Shots Sequenciais
            </span>
            <span className="text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
              Single-Stream (Anti-Grid)
            </span>
          </div>
          <h3 className="text-base font-bold text-white tracking-wide">
            {result.title || 'Campanha Storyboard Editorial de Produto'}
          </h3>
          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono flex-wrap">
            <span>Mood: <strong className="text-slate-200">{result.campaign_mood}</strong></span>
            <span>•</span>
            <span>Paleta: <strong className="text-slate-200">{result.color_palette}</strong></span>
            <span>•</span>
            <span>Luz: <strong className="text-slate-200">{result.lighting_style}</strong></span>
          </div>
        </div>

        {/* Quick Action Presets */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleSaveToVault}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm ${
              vaultSaved
                ? 'bg-emerald-600 text-white border border-emerald-500'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
            title="Salvar como molde reutilizável no Prompt Vault"
          >
            <LucideIcon name={vaultSaved ? 'check' : 'bookmark'} className="w-3.5 h-3.5 text-amber-400" />
            {vaultSaved ? 'Salvo no Vault!' : 'Salvar no Vault'}
          </button>

          <button
            type="button"
            onClick={handleCopyAll}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm ${
              copiedAll
                ? 'bg-emerald-600 text-white border border-emerald-500'
                : 'bg-amber-600 hover:bg-amber-500 text-white border border-amber-500/40'
            }`}
          >
            <LucideIcon name={copiedAll ? 'check' : 'copy'} className="w-3.5 h-3.5" />
            {copiedAll ? 'Copiado!' : 'Copiar Tudo'}
          </button>
        </div>
      </div>

      {/* Export Presets Tabs */}
      <div className="bg-slate-900/90 p-1.5 rounded-xl border border-slate-800 flex items-center gap-1.5 text-xs font-medium">
        <button
          type="button"
          onClick={() => setActiveExportPreset('all')}
          className={`flex-1 py-2 px-3 rounded-lg transition flex items-center justify-center gap-2 cursor-pointer ${
            activeExportPreset === 'all'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <LucideIcon name="layout-list" className="w-4 h-4" />
          Visão Completa dos Shots ({result.shots.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveExportPreset('google_vids')}
          className={`flex-1 py-2 px-3 rounded-lg transition flex items-center justify-center gap-2 cursor-pointer ${
            activeExportPreset === 'google_vids'
              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-bold shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <LucideIcon name="video" className="w-4 h-4" />
          Exportar Google Vids / Omni
        </button>

        <button
          type="button"
          onClick={() => setActiveExportPreset('model_prompt')}
          className={`flex-1 py-2 px-3 rounded-lg transition flex items-center justify-center gap-2 cursor-pointer ${
            activeExportPreset === 'model_prompt'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <LucideIcon name="sparkles" className="w-4 h-4" />
          Prompt Master Imagem / Vídeo
        </button>
      </div>

      {/* Preset View 1: Google Vids / Omni Plain Structured Text */}
      {activeExportPreset === 'google_vids' && (
        <div className="bg-slate-950/80 p-4 rounded-xl border border-indigo-900/40 space-y-3 shadow-lg">
          <div className="flex items-center justify-between border-b border-indigo-900/30 pb-2.5">
            <div className="flex items-center gap-2">
              <LucideIcon name="video" className="w-4 h-4 text-indigo-400" />
              <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider font-mono">
                Preset de Exportação: Google Vids / Omni (Texto Estruturado Plano)
              </h4>
            </div>
            <button
              type="button"
              onClick={handleCopyGoogleVids}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                copiedGoogleVids
                  ? 'bg-emerald-600 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white'
              }`}
            >
              <LucideIcon name={copiedGoogleVids ? 'check' : 'copy'} className="w-3.5 h-3.5" />
              {copiedGoogleVids ? 'Copiado!' : 'Copiar Google Vids'}
            </button>
          </div>
          <pre className="text-xs text-slate-300 font-mono bg-slate-900/90 p-3.5 rounded-lg border border-slate-800 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
            {formatGoogleVidsPrompt(result, textMode as EditorialTextMode, customText)}
          </pre>
        </div>
      )}

      {/* Preset View 2: Master Image/Video Model Prompt */}
      {activeExportPreset === 'model_prompt' && (
        <div className="bg-slate-950/80 p-4 rounded-xl border border-purple-900/40 space-y-3 shadow-lg">
          <div className="flex items-center justify-between border-b border-purple-900/30 pb-2.5">
            <div className="flex items-center gap-2">
              <LucideIcon name="sparkles" className="w-4 h-4 text-purple-400" />
              <h4 className="text-xs font-bold text-purple-300 uppercase tracking-wider font-mono">
                Preset de Exportação: Prompt Master para Modelos de Imagem / Vídeo
              </h4>
            </div>
            <button
              type="button"
              onClick={handleCopyModelPrompt}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                copiedModelPrompt
                  ? 'bg-emerald-600 text-white'
                  : 'bg-purple-600 hover:bg-purple-500 text-white'
              }`}
            >
              <LucideIcon name={copiedModelPrompt ? 'check' : 'copy'} className="w-3.5 h-3.5" />
              {copiedModelPrompt ? 'Copiado!' : 'Copiar Prompt Master'}
            </button>
          </div>
          <div className="text-xs text-slate-200 font-mono bg-slate-900/90 p-3.5 rounded-lg border border-slate-800 leading-relaxed whitespace-pre-wrap">
            {formatEditorialModelPrompt(result)}
          </div>
        </div>
      )}

      {/* Global Locks Card */}
      <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/90 space-y-3.5">
        <div className="flex items-center gap-2 border-b border-slate-800/70 pb-2">
          <LucideIcon name="lock" className="w-4 h-4 text-amber-400" />
          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
            Global Locks & Fidelidade Editorial Invariante
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          {/* Product Lock */}
          <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-amber-400 font-mono uppercase tracking-wider flex items-center gap-1">
                <LucideIcon name="shopping-bag" className="w-3 h-3" /> Product Identity Lock
              </span>
              <button
                type="button"
                onClick={() => handleCopyLock(result.global_locks.product_identity_lock, 'product')}
                className="text-slate-400 hover:text-white cursor-pointer"
                title="Copiar Product Lock"
              >
                <LucideIcon name={copiedLockKey === 'product' ? 'check' : 'copy'} className="w-3 h-3" />
              </button>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed font-mono">
              {result.global_locks.product_identity_lock}
            </p>
          </div>

          {/* Editorial Storyboard Lock */}
          <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-purple-400 font-mono uppercase tracking-wider flex items-center gap-1">
                <LucideIcon name="clapperboard" className="w-3 h-3" /> Editorial Reference Lock
              </span>
              <button
                type="button"
                onClick={() => handleCopyLock(result.global_locks.editorial_storyboard_lock, 'editorial')}
                className="text-slate-400 hover:text-white cursor-pointer"
                title="Copiar Editorial Lock"
              >
                <LucideIcon name={copiedLockKey === 'editorial' ? 'check' : 'copy'} className="w-3 h-3" />
              </button>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed font-mono">
              {result.global_locks.editorial_storyboard_lock}
            </p>
          </div>

          {/* Anti-Grid & Text Mode Lock */}
          <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-indigo-400 font-mono uppercase tracking-wider flex items-center gap-1">
                <LucideIcon name="shield-check" className="w-3 h-3" /> Anti-Grid & Text Lock
              </span>
              <button
                type="button"
                onClick={() => handleCopyLock(result.global_locks.text_mode_lock, 'text_lock')}
                className="text-slate-400 hover:text-white cursor-pointer"
                title="Copiar Text Lock"
              >
                <LucideIcon name={copiedLockKey === 'text_lock' ? 'check' : 'copy'} className="w-3 h-3" />
              </button>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed font-mono">
              {result.global_locks.no_grid_lock}
            </p>
            <p className="text-[10px] text-indigo-300/90 font-mono pt-1 border-t border-slate-800">
              {result.global_locks.text_mode_lock}
            </p>
          </div>
        </div>
      </div>

      {/* Shot-by-Shot Cards List */}
      {activeExportPreset === 'all' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-2">
              <LucideIcon name="film" className="w-4 h-4 text-amber-400" />
              Sequência Editorial Shot-by-Shot ({result.shots.length} Planos)
            </h4>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {result.shots.map((shot, idx) => (
              <div
                key={shot.shot_number || idx}
                className="bg-slate-950/70 p-4 rounded-xl border border-slate-800/90 hover:border-amber-500/30 transition space-y-3 shadow-md"
              >
                <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2.5 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center text-xs font-mono font-bold">
                      {shot.shot_number}
                    </span>
                    <span className="text-xs font-bold text-white font-mono uppercase tracking-wide">
                      {shot.title || `Shot ${shot.shot_number}`}
                    </span>
                    <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                      {shot.shot_type}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopyShotPromptOnly(shot.prompt_en, idx)}
                      className={`text-[11px] px-2.5 py-1 rounded-md font-medium transition flex items-center gap-1 cursor-pointer border ${
                        copiedShotPromptIdx === idx
                          ? 'bg-emerald-600/30 border-emerald-500 text-emerald-200'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                      }`}
                      title="Copiar apenas o prompt técnico em inglês"
                    >
                      <LucideIcon name={copiedShotPromptIdx === idx ? 'check' : 'sparkles'} className="w-3 h-3 text-amber-400" />
                      {copiedShotPromptIdx === idx ? 'Prompt Copiado!' : 'Copiar Prompt'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopyShot(shot, idx)}
                      className={`text-[11px] px-2.5 py-1 rounded-md font-medium transition flex items-center gap-1 cursor-pointer border ${
                        copiedShotIdx === idx
                          ? 'bg-emerald-600/30 border-emerald-500 text-emerald-200'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                      }`}
                      title="Copiar todos os dados deste take"
                    >
                      <LucideIcon name={copiedShotIdx === idx ? 'check' : 'copy'} className="w-3 h-3" />
                      {copiedShotIdx === idx ? 'Shot Copiado!' : 'Copiar Shot'}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 font-mono uppercase">🎬 Ação Visual</span>
                    <p className="text-slate-200 mt-0.5 leading-relaxed">{shot.visual_action}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 font-mono uppercase">🎥 Câmera & Lente</span>
                    <p className="text-slate-200 mt-0.5 leading-relaxed font-mono text-[11px]">{shot.camera_framing}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 font-mono uppercase">💡 Iluminação</span>
                    <p className="text-slate-200 mt-0.5 leading-relaxed font-mono text-[11px]">{shot.lighting}</p>
                  </div>
                </div>

                {shot.visible_text_pt_br && (
                  <div className="bg-purple-950/30 p-2.5 rounded-lg border border-purple-800/40 text-xs">
                    <span className="text-[10px] font-bold text-purple-300 font-mono uppercase flex items-center gap-1">
                      <LucideIcon name="type" className="w-3 h-3" /> Texto Visível Renderizado (PT-BR)
                    </span>
                    <p className="text-white font-medium mt-0.5">"{shot.visible_text_pt_br}"</p>
                  </div>
                )}

                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-amber-300 font-mono uppercase flex items-center gap-1">
                    <LucideIcon name="terminal" className="w-3 h-3" /> Prompt Técnico (EN)
                  </span>
                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-200 leading-relaxed whitespace-pre-wrap">
                    {shot.prompt_en}
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1 border-t border-slate-800/60 flex-wrap gap-2">
                  <span>🔒 <strong className="text-slate-300">Produto:</strong> {shot.product_lock}</span>
                  <span className="text-red-300/80">🚫 <strong className="text-red-300">Negativos:</strong> {shot.negative_constraints}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
