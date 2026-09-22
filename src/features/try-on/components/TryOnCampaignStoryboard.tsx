import React, { useState } from 'react';
import { LucideIcon } from '../../../components/Common';
import { copyToClipboard } from '../../../utils';
import { TryOnCampaignResult, TryOnTake, TRY_ON_CAMPAIGN_TYPES, TRY_ON_PLATFORMS, TRY_ON_FORMATS, TRY_ON_SCENE_STYLES } from '../types';
import { formatTryOnCampaignClipboard, formatSingleTakeClipboard } from '../tryOnCampaignLogic';

interface TryOnCampaignStoryboardProps {
  campaign: TryOnCampaignResult;
}

export const TryOnCampaignStoryboard: React.FC<TryOnCampaignStoryboardProps> = ({ campaign }) => {
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedTakeIdx, setCopiedTakeIdx] = useState<number | null>(null);
  const [copiedPromptIdx, setCopiedPromptIdx] = useState<number | null>(null);
  const [copiedLockKey, setCopiedLockKey] = useState<string | null>(null);

  const matchedPreset = TRY_ON_CAMPAIGN_TYPES.find(t => t.id === campaign.campaign_type);
  const matchedPlatform = TRY_ON_PLATFORMS.find(p => p.id === campaign.platform);
  const matchedFormat = TRY_ON_FORMATS.find(f => f.id === campaign.format);
  const matchedScene = TRY_ON_SCENE_STYLES.find(s => s.id === campaign.scene_style);

  const isAffiliate = matchedPreset?.category === 'affiliate' || [
    'shopee_clean_demo',
    'tiktok_shop_fast_demo',
    'white_glove_packshot',
    'ugc_product_in_use',
    'before_after_comparison',
    'conversion_carousel'
  ].includes(campaign.campaign_type);

  const handleCopyAll = async () => {
    const text = formatTryOnCampaignClipboard(campaign);
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2500);
    }
  };

  const handleCopyTake = async (take: TryOnTake, idx: number) => {
    const text = formatSingleTakeClipboard(take, campaign.global_locks);
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedTakeIdx(idx);
      setTimeout(() => setCopiedTakeIdx(null), 2000);
    }
  };

  const handleCopyPromptOnly = async (prompt: string, idx: number) => {
    const ok = await copyToClipboard(prompt);
    if (ok) {
      setCopiedPromptIdx(idx);
      setTimeout(() => setCopiedPromptIdx(null), 2000);
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
      {/* Header bar */}
      <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            {isAffiliate && (
              <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                <LucideIcon name="shopping-bag" className="w-3 h-3" /> Campanha Afiliado
              </span>
            )}
            <span className="text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
              {campaign.detected_category || 'Produto / Look'}
            </span>
            <span className="text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
              {matchedPreset ? matchedPreset.label : campaign.campaign_type}
            </span>
            {matchedPlatform && (
              <span className="text-[10px] font-mono font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30 px-2 py-0.5 rounded-full">
                {matchedPlatform.label}
              </span>
            )}
            <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
              {campaign.takes.length} Takes
            </span>
          </div>
          <h3 className="text-sm font-bold text-white tracking-wide">
            {campaign.campaign_title || (isAffiliate ? 'Campanha Afiliado E-commerce' : 'Campanha Storyboard Try-On')}
          </h3>
          {(matchedFormat || matchedScene) && (
            <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
              {matchedFormat && <span>Formato: <strong className="text-slate-200">{matchedFormat.label}</strong></span>}
              {matchedFormat && matchedScene && <span>•</span>}
              {matchedScene && <span>Cena: <strong className="text-slate-200">{matchedScene.label}</strong></span>}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyAll}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm ${
              copiedAll
                ? 'bg-emerald-600 text-white border border-emerald-500'
                : 'bg-purple-600 hover:bg-purple-500 text-white border border-purple-500/40'
            }`}
          >
            <LucideIcon name={copiedAll ? 'check' : 'copy'} className="w-3.5 h-3.5" />
            {copiedAll ? 'Copiado com Sucesso!' : (isAffiliate ? 'Copiar Campanha' : 'Copiar Tudo')}
          </button>
        </div>
      </div>

      {/* Global Locks Card */}
      <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/90 space-y-3.5">
        <div className="flex items-center gap-2 border-b border-slate-800/70 pb-2">
          <LucideIcon name="lock" className="w-4 h-4 text-purple-400" />
          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
            Global Locks & Parâmetros de Fidelidade Invariante
          </h4>
        </div>

        <div className={`grid grid-cols-1 ${campaign.global_locks?.visual_reference_lock ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-3'} gap-3 text-xs`}>
          {/* Person Lock */}
          <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-indigo-400 font-mono uppercase tracking-wider flex items-center gap-1">
                <LucideIcon name="user" className="w-3 h-3" /> Person Identity Lock
              </span>
              <button
                type="button"
                onClick={() => handleCopyLock(campaign.global_locks.person_identity_lock, 'person')}
                className="text-slate-400 hover:text-white cursor-pointer"
                title="Copiar Person Lock"
              >
                <LucideIcon name={copiedLockKey === 'person' ? 'check' : 'copy'} className="w-3 h-3" />
              </button>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed font-mono">
              {campaign.global_locks.person_identity_lock}
            </p>
          </div>

          {/* Product Lock */}
          <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-purple-400 font-mono uppercase tracking-wider flex items-center gap-1">
                <LucideIcon name="tag" className="w-3 h-3" /> Product Identity Lock
              </span>
              <button
                type="button"
                onClick={() => handleCopyLock(campaign.global_locks.product_identity_lock, 'product')}
                className="text-slate-400 hover:text-white cursor-pointer"
                title="Copiar Product Lock"
              >
                <LucideIcon name={copiedLockKey === 'product' ? 'check' : 'copy'} className="w-3 h-3" />
              </button>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed font-mono">
              {campaign.global_locks.product_identity_lock}
            </p>
          </div>

          {/* Style Lock */}
          <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-pink-400 font-mono uppercase tracking-wider flex items-center gap-1">
                <LucideIcon name="sparkles" className="w-3 h-3" /> Commercial Style Lock
              </span>
              <button
                type="button"
                onClick={() => handleCopyLock(campaign.global_locks.campaign_style_lock, 'style')}
                className="text-slate-400 hover:text-white cursor-pointer"
                title="Copiar Style Lock"
              >
                <LucideIcon name={copiedLockKey === 'style' ? 'check' : 'copy'} className="w-3 h-3" />
              </button>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed font-mono">
              {campaign.global_locks.campaign_style_lock}
            </p>
          </div>

          {/* Visual Reference Lock (if provided) */}
          {campaign.global_locks?.visual_reference_lock && (
            <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-amber-400 font-mono uppercase tracking-wider flex items-center gap-1">
                  <LucideIcon name="image" className="w-3 h-3" /> Visual Reference Lock
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyLock(campaign.global_locks.visual_reference_lock!, 'visualRef')}
                  className="text-slate-400 hover:text-white cursor-pointer"
                  title="Copiar Visual Reference Lock"
                >
                  <LucideIcon name={copiedLockKey === 'visualRef' ? 'check' : 'copy'} className="w-3 h-3" />
                </button>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed font-mono">
                {campaign.global_locks.visual_reference_lock}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Takes Sequence */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
            <LucideIcon name="clapperboard" className="w-4 h-4 text-purple-400" />
            Storyboard Multi-Take ({campaign.takes.length} Takes Estruturados)
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            Prompts Técnicos em Inglês • Textos de Conversão em Português
          </span>
        </div>

        <div className="space-y-4">
          {campaign.takes.map((take, idx) => (
            <div
              key={idx}
              className="bg-slate-900/70 border border-slate-800 hover:border-purple-500/40 rounded-xl p-4 space-y-3.5 transition shadow-lg"
            >
              {/* Take Top Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono font-bold text-[10px] border border-purple-500/30">
                    TAKE {take.take_number}
                  </span>
                  <h4 className="text-xs font-bold text-white font-sans">
                    {take.title}
                  </h4>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopyTake(take, idx)}
                    className="text-[10px] text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded border border-slate-700 transition flex items-center gap-1 cursor-pointer font-mono font-medium"
                    title="Copiar Take Completo"
                  >
                    <LucideIcon name={copiedTakeIdx === idx ? 'check' : 'copy'} className="w-3 h-3 text-purple-400" />
                    {copiedTakeIdx === idx ? 'Take Copiado' : 'Copiar Take'}
                  </button>
                </div>
              </div>

              {/* Purpose & Action Row */}
              <div className="space-y-1.5 text-xs">
                {take.purpose && (
                  <div className="flex items-start gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider shrink-0 mt-0.5">
                      🎯 Objetivo:
                    </span>
                    <span className="text-slate-200 font-sans leading-relaxed">
                      {take.purpose}
                    </span>
                  </div>
                )}
                {take.visual_action && (
                  <div className="flex items-start gap-2">
                    <span className="text-[10px] font-bold text-indigo-400 uppercase font-mono tracking-wider shrink-0 mt-0.5">
                      🎬 Ação Visual:
                    </span>
                    <span className="text-slate-300 font-sans leading-relaxed">
                      {take.visual_action}
                    </span>
                  </div>
                )}
              </div>

              {/* Text on Screen / Spoken Speech Badges */}
              {(take.on_screen_text || take.optional_dialogue_pt_br) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-0.5">
                  {take.on_screen_text && (
                    <div className="bg-amber-950/30 border border-amber-500/30 p-2.5 rounded-lg space-y-1">
                      <span className="text-[9.5px] font-bold text-amber-300 uppercase font-mono tracking-wider flex items-center gap-1">
                        <LucideIcon name="type" className="w-3 h-3" /> Texto na Tela (Sugestão):
                      </span>
                      <p className="text-amber-100 font-bold font-sans text-xs">
                        "{take.on_screen_text}"
                      </p>
                    </div>
                  )}
                  {take.optional_dialogue_pt_br && (
                    <div className="bg-sky-950/30 border border-sky-500/30 p-2.5 rounded-lg space-y-1">
                      <span className="text-[9.5px] font-bold text-sky-300 uppercase font-mono tracking-wider flex items-center gap-1">
                        <LucideIcon name="mic" className="w-3 h-3" /> Fala Opcional (PT-BR):
                      </span>
                      <p className="text-sky-100 italic font-sans text-xs">
                        "{take.optional_dialogue_pt_br}"
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* English Diffusion Prompt Box */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[9.5px] font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <LucideIcon name="terminal" className="w-3 h-3 text-purple-400" /> Generation Prompt (EN)
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyPromptOnly(take.prompt_en, idx)}
                    className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer font-mono"
                  >
                    <LucideIcon name={copiedPromptIdx === idx ? 'check' : 'copy'} className="w-2.5 h-2.5" />
                    {copiedPromptIdx === idx ? 'Prompt Copiado' : 'Copiar Prompt EN'}
                  </button>
                </div>
                <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800/90 text-xs font-mono text-slate-200 leading-relaxed selection:bg-purple-900 selection:text-white relative group">
                  <p className="whitespace-pre-wrap">{take.prompt_en}</p>
                </div>
              </div>

              {/* Sub Locks & Constraints */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-[11px] pt-1">
                <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-850 space-y-0.5">
                  <span className="text-[9.5px] font-bold text-purple-400 uppercase font-mono tracking-wide block">
                    🔒 Trava do Produto / Âncora:
                  </span>
                  <p className="text-slate-300 leading-normal font-sans">
                    {take.product_lock_reminder}
                  </p>
                </div>

                <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-850 space-y-0.5">
                  <span className="text-[9.5px] font-bold text-rose-400 uppercase font-mono tracking-wide block">
                    🚫 Restrições Negativas:
                  </span>
                  <p className="text-slate-300 leading-normal font-sans">
                    {take.negative_constraints}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
