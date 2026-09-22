import React, { useState } from 'react';
import { LucideIcon } from '../../../components/Common';
import {
  VIDEO_EDIT_MODES,
  VIDEO_EDIT_CATEGORIES,
  STYLE_TRANSFER_PRESETS,
  PERSON_BASED_VIDEO_MODES,
  VideoEditModeId,
  VideoEditCategory,
  VideoEditTextMode,
  VideoEditPromptResult,
  buildVideoEditPrompt,
  saveVideoEditPromptToVault,
} from '../videoEditModes';

interface VideoEditModesPanelProps {
  onSavedToVault?: () => void;
  defaultExpanded?: boolean;
}

export function VideoEditModesPanel({ onSavedToVault, defaultExpanded = false }: VideoEditModesPanelProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [selectedCategory, setSelectedCategory] = useState<VideoEditCategory | 'all'>('all');
  const [selectedModeId, setSelectedModeId] = useState<VideoEditModeId>('STYLE_TRANSFER');
  
  // Inputs
  const [sourceContext, setSourceContext] = useState('');
  const [targetEditDescription, setTargetEditDescription] = useState('');
  const [secondaryDetails, setSecondaryDetails] = useState('');
  const [visibleTextPt, setVisibleTextPt] = useState('');
  const [textMode, setTextMode] = useState<VideoEditTextMode>('no_text');
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9' | '1:1' | '4:5'>('9:16');
  
  // Results & Feedback
  const [result, setResult] = useState<VideoEditPromptResult | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [savedToVault, setSavedToVault] = useState(false);

  const activeMode = VIDEO_EDIT_MODES.find(m => m.id === selectedModeId) || VIDEO_EDIT_MODES[0];
  const isPersonMode = PERSON_BASED_VIDEO_MODES.includes(selectedModeId);

  const handleGenerate = () => {
    const res = buildVideoEditPrompt({
      modeId: selectedModeId,
      sourceContext: sourceContext.trim() || 'Video footage with subject/product in action',
      targetEditDescription: targetEditDescription.trim() || activeMode.fieldLabels.targetEditPlaceholder.split(';')[0],
      secondaryDetails: secondaryDetails.trim() || undefined,
      visibleTextPt: textMode === 'with_text' ? visibleTextPt.trim() || undefined : undefined,
      textMode,
      aspectRatio,
    });
    setResult(res);
    setSavedToVault(false);
  };

  const handleCopy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2500);
    } catch (e) {
      console.error('Failed to copy', e);
    }
  };

  const handleSaveVault = () => {
    if (!result) return;
    saveVideoEditPromptToVault(result);
    setSavedToVault(true);
    if (onSavedToVault) onSavedToVault();
  };

  const filteredModes = VIDEO_EDIT_MODES.filter(
    m => selectedCategory === 'all' || m.category === selectedCategory
  );

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl transition-all">
      {/* Collapsible Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4.5 sm:p-5 flex items-center justify-between bg-slate-900 hover:bg-slate-850 transition cursor-pointer text-left border-b border-slate-800/80"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <LucideIcon name="video" className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-100 text-sm sm:text-base flex items-center gap-1.5">
                Edição Inteligente de Vídeo
              </h3>
              <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full font-mono font-bold">
                9 Modos • Video Presets
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Presets técnicos de edição e inpainting com Face & Identity Lock e Trava Global para Google Vids / Omni.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-400 hidden sm:inline-block">
            {isExpanded ? 'Recolher' : 'Expandir Modos'}
          </span>
          <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300">
            <LucideIcon name={isExpanded ? 'chevron-up' : 'chevron-down'} className="w-4 h-4" />
          </div>
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-4 sm:p-6 space-y-6 animate-fade-in">
          {/* Locks Callout: Global Preservation & Face Identity Lock */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-purple-950/30 border border-purple-500/30 rounded-xl p-3.5 flex items-start gap-3">
              <LucideIcon name="shield-check" className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="text-xs font-bold text-purple-300 uppercase tracking-wider font-mono">
                  Trava Global de Preservação Ativa
                </span>
                <p className="text-xs text-slate-300/90 leading-relaxed font-sans">
                  Garante proporções, corte de cabelo, tom de pele, dinâmica de movimento original e integridade do produto sem mutações.
                </p>
              </div>
            </div>

            <div className="bg-indigo-950/30 border border-indigo-500/30 rounded-xl p-3.5 flex items-start gap-3">
              <LucideIcon name="user-check" className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider font-mono">
                  Face & Identity Lock (Automático)
                </span>
                <p className="text-xs text-slate-300/90 leading-relaxed font-sans">
                  Protege estrutura facial, olhos, nariz, boca, idade aparente, textura de pele e expressões quadro a quadro contra morphing.
                </p>
              </div>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-950/80 p-1.5 rounded-xl border border-slate-800">
            {VIDEO_EDIT_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20 font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <LucideIcon name={cat.icon} className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
              </button>
            ))}
          </div>

          {/* 9 Modes Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {filteredModes.map((mode) => {
              const isSelected = selectedModeId === mode.id;
              const isPMode = PERSON_BASED_VIDEO_MODES.includes(mode.id);
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => {
                    setSelectedModeId(mode.id);
                    setResult(null);
                  }}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between relative group ${
                    isSelected
                      ? 'bg-purple-950/50 border-purple-500 text-white shadow-md ring-1 ring-purple-500/40'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <div
                          className={`w-6 h-6 rounded-md flex items-center justify-center ${
                            isSelected
                              ? 'bg-purple-500/20 text-purple-300'
                              : 'bg-slate-800 text-slate-400 group-hover:text-purple-300'
                          }`}
                        >
                          <LucideIcon name={mode.icon} className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-bold font-sans text-slate-200">
                          {mode.labelPt}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {isPMode && (
                          <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30" title="Face & Identity Lock Ativo">
                            ID Lock
                          </span>
                        )}
                        {mode.badge && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30 whitespace-nowrap">
                            {mode.badge}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug line-clamp-2">
                      {mode.shortDescriptionPt}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Mode Configuration Form */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
              <div>
                <span className="text-xs font-bold text-purple-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <LucideIcon name={activeMode.icon} className="w-4 h-4" /> Modo Selecionado: {activeMode.labelPt}
                </span>
                <p className="text-xs text-slate-400 mt-0.5">{activeMode.descriptionPt}</p>
              </div>

              {/* Aspect Ratio Selector */}
              <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-800 shrink-0">
                <span className="text-[10px] text-slate-400 px-1 font-mono uppercase font-bold">Formato:</span>
                {(['9:16', '16:9', '1:1', '4:5'] as const).map((ratio) => (
                  <button
                    key={ratio}
                    type="button"
                    onClick={() => setAspectRatio(ratio)}
                    className={`px-2 py-0.5 rounded text-[10.5px] font-mono font-bold transition cursor-pointer ${
                      aspectRatio === ratio
                        ? 'bg-purple-600 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>

            {/* Suggestions Chips for STYLE_TRANSFER */}
            {selectedModeId === 'STYLE_TRANSFER' && (
              <div className="space-y-1.5 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                <label className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <LucideIcon name="sparkles" className="w-3.5 h-3.5 text-purple-400" />
                  Sugestões de Estilo Visual (Clique para aplicar):
                </label>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {STYLE_TRANSFER_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setTargetEditDescription(preset)}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                        targetEditDescription === preset
                          ? 'bg-purple-600 text-white border-purple-500 font-bold'
                          : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-purple-500/50 hover:text-white'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Contexto do Vídeo Original */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <LucideIcon name="video" className="w-3.5 h-3.5 text-purple-400" />
                    Descrição do Vídeo / Cena de Origem
                  </span>
                  <span className="text-[10px] text-slate-500 font-normal">Contexto</span>
                </label>
                <textarea
                  rows={2}
                  value={sourceContext}
                  onChange={(e) => setSourceContext(e.target.value)}
                  placeholder="Ex: Mulher usando casaco bege caminhando em rua urbana com luz natural..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500 transition resize-none"
                />
              </div>

              {/* Modificação Alvo do Modo */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <LucideIcon name="edit-3" className="w-3.5 h-3.5 text-purple-400" />
                    {activeMode.fieldLabels.targetEditLabel}
                  </span>
                  <span className="text-[10px] text-purple-400 font-bold font-mono">Obrigatório</span>
                </label>
                <textarea
                  rows={2}
                  value={targetEditDescription}
                  onChange={(e) => setTargetEditDescription(e.target.value)}
                  placeholder={activeMode.fieldLabels.targetEditPlaceholder}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500 transition resize-none"
                />
              </div>

              {/* Detalhes Secundários / Refinamento */}
              {activeMode.fieldLabels.secondaryLabel && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <LucideIcon name="sliders" className="w-3.5 h-3.5 text-purple-400" />
                      {activeMode.fieldLabels.secondaryLabel}
                    </span>
                    <span className="text-[10px] text-slate-500 font-normal">Opcional</span>
                  </label>
                  <input
                    type="text"
                    value={secondaryDetails}
                    onChange={(e) => setSecondaryDetails(e.target.value)}
                    placeholder={activeMode.fieldLabels.secondaryPlaceholder}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500 transition"
                  />
                </div>
              )}

              {/* Controle de Modo de Texto */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <LucideIcon name="type" className="w-3.5 h-3.5 text-purple-400" />
                    Tratamento de Texto no Vídeo
                  </label>
                  <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[10px] font-mono">
                    <button
                      type="button"
                      onClick={() => setTextMode('no_text')}
                      className={`px-2 py-0.5 rounded cursor-pointer transition ${
                        textMode === 'no_text' ? 'bg-purple-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Sem Texto
                    </button>
                    <button
                      type="button"
                      onClick={() => setTextMode('with_text')}
                      className={`px-2 py-0.5 rounded cursor-pointer transition ${
                        textMode === 'with_text' ? 'bg-purple-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Com Texto
                    </button>
                    <button
                      type="button"
                      onClick={() => setTextMode('reserved_space_no_text')}
                      className={`px-2 py-0.5 rounded cursor-pointer transition ${
                        textMode === 'reserved_space_no_text' ? 'bg-purple-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Espaço Limpo
                    </button>
                  </div>
                </div>

                {textMode === 'with_text' ? (
                  <input
                    type="text"
                    value={visibleTextPt}
                    onChange={(e) => setVisibleTextPt(e.target.value)}
                    placeholder="Ex: LANÇAMENTO EXCLUSIVO, QUALIDADE PREMIUM..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500 transition"
                  />
                ) : textMode === 'reserved_space_no_text' ? (
                  <p className="text-[11px] text-slate-400 bg-slate-900/50 p-2 rounded-lg border border-slate-800/80">
                    O gerador preservará espaço negativo sem elementos visuais para sobreposição pós-produção.
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-500 bg-slate-900/40 p-2 rounded-lg border border-slate-800/60">
                    Nenhum texto na tela será gerado (bloqueio total de tipografia artificial).
                  </p>
                )}
              </div>
            </div>

            {/* Botão de Geração */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleGenerate}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-600/25 flex items-center justify-center gap-2 cursor-pointer transition"
              >
                <LucideIcon name="wand-2" className="w-4 h-4" />
                <span>Gerar Prompt Estruturado de Edição ({activeMode.labelPt})</span>
              </button>
            </div>
          </div>

          {/* Generated Result Output */}
          {result && (
            <div className="bg-slate-950 border border-purple-500/30 rounded-xl p-4 sm:p-5 space-y-4 animate-fade-in shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400">
                    <LucideIcon name="check-circle" className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                      Prompt de Edição Pronto: {result.modeLabelPt}
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30">
                        {result.aspectRatio}
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Instruções técnicas em inglês com texto visível preservado e travas ativas.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleCopy(result.masterPromptEn, 'master')}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-purple-300 border border-purple-500/30 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition"
                  >
                    <LucideIcon name={copiedKey === 'master' ? 'check' : 'copy'} className="w-3.5 h-3.5 text-purple-400" />
                    <span>{copiedKey === 'master' ? 'Copiado!' : 'Copiar Master Prompt'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopy(result.googleVidsStructuredPrompt, 'vids')}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-indigo-300 border border-indigo-500/30 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition"
                  >
                    <LucideIcon name={copiedKey === 'vids' ? 'check' : 'copy'} className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{copiedKey === 'vids' ? 'Copiado!' : 'Copiar Google Vids / Omni'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveVault}
                    disabled={savedToVault}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition ${
                      savedToVault
                        ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                        : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow'
                    }`}
                  >
                    <LucideIcon name={savedToVault ? 'check' : 'bookmark'} className="w-3.5 h-3.5" />
                    <span>{savedToVault ? 'Salvo no Prompt Vault!' : 'Salvar no Prompt Vault'}</span>
                  </button>
                </div>
              </div>

              {/* Master Prompt Display */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1">
                  <LucideIcon name="terminal" className="w-3 h-3 text-purple-400" />
                  Master Technical Prompt (Video Diffusion / Google Vids / Omni)
                </span>
                <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 text-xs font-mono text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {result.masterPromptEn}
                </div>
              </div>

              {/* Structured Instructions Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-900/70 p-3 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-purple-400 font-bold font-mono text-[10.5px] uppercase tracking-wider flex items-center gap-1">
                    <LucideIcon name="sliders" className="w-3 h-3" /> Diretriz Técnica do Modo:
                  </span>
                  <p className="text-slate-300 leading-relaxed font-sans">{result.technicalDirectivesEn}</p>
                </div>

                <div className="bg-slate-900/70 p-3 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-indigo-400 font-bold font-mono text-[10.5px] uppercase tracking-wider flex items-center gap-1">
                    <LucideIcon name="shield-check" className="w-3 h-3" /> Travas Ativas:
                  </span>
                  <p className="text-slate-300 leading-relaxed font-sans">
                    {result.faceAndIdentityLock ? 'Global Preservation Lock + Face & Identity Lock Ativos' : 'Global Preservation Lock Ativo'}
                  </p>
                </div>
              </div>

              {/* Negative Prompt */}
              <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800/80 space-y-1 text-xs">
                <span className="text-red-400 font-bold font-mono text-[10.5px] uppercase tracking-wider flex items-center gap-1">
                  <LucideIcon name="ban" className="w-3 h-3" /> Negative Prompt (EN):
                </span>
                <p className="text-slate-400 font-mono text-[11px] leading-relaxed">{result.negativePromptEn}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
