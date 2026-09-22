import React, { useState, useEffect, useMemo } from 'react';
import { Card, LucideIcon } from '../../../components/Common';
import { copyToClipboard } from '../../../utils';
import { StoredAvatar, loadCanonicalAvatars, subscribeToAvatarUpdates } from '../../../services/avatarStorageService';
import { isBrandMarkActive } from '../../visual-reference-engine/services/brandMarkAuthority';
import {
  ShopeeDialogueMode,
  ShopeeCTAMode,
  ShopeePresenterSource,
  ShopeeSceneHubSnapshot,
  ShopeeSceneHubResult,
  ShopeeSceneHubPanelProps
} from '../types';
import { runShopeeSceneHubPipeline, validateShopeeDialogueText } from '../shopeeSceneBrain';
import {
  ShopeeVideoComplianceGuard,
  ShopeeCompliancePreflightPanel
} from '../../shopee-compliance';

export const ShopeeSceneHubPanel: React.FC<ShopeeSceneHubPanelProps> = ({
  productWorkspace,
  onUploadProductImage,
  onRemoveProductImage,
  onAnalyzeProduct,
  sessionSnapshot,
  onSessionSnapshotChange
}) => {
  // Session / Form State
  const [dialogueMode, setDialogueMode] = useState<ShopeeDialogueMode>(
    sessionSnapshot?.dialogueMode || 'auto'
  );
  const [presenterSource, setPresenterSource] = useState<ShopeePresenterSource>(
    sessionSnapshot?.presenterSource || 'manual'
  );
  const [manualPresenterGender, setManualPresenterGender] = useState<'female' | 'male'>(
    sessionSnapshot?.manualPresenterGender || 'female'
  );
  const [manualPresenterDesc, setManualPresenterDesc] = useState<string>(
    sessionSnapshot?.manualPresenterDesc || 'Apresentadora brasileira com visual moderno, comunicativa e acolhedora'
  );
  const [selectedAvatarId, setSelectedAvatarId] = useState<string | number | undefined>(
    sessionSnapshot?.selectedAvatarId
  );
  const [scene1ManualDialogue, setScene1ManualDialogue] = useState<string>(
    sessionSnapshot?.scene1ManualDialogue || ''
  );
  const [scene2ManualDialogue, setScene2ManualDialogue] = useState<string>(
    sessionSnapshot?.scene2ManualDialogue || ''
  );
  const [scene3ManualDialogue, setScene3ManualDialogue] = useState<string>(
    sessionSnapshot?.scene3ManualDialogue || ''
  );
  const [ctaMode, setCtaMode] = useState<ShopeeCTAMode>(
    sessionSnapshot?.ctaMode || 'produto_marcado'
  );
  const [compiledResult, setCompiledResult] = useState<ShopeeSceneHubResult | null>(
    sessionSnapshot?.compiledResult || null
  );

  // UI state
  const [avatars, setAvatars] = useState<StoredAvatar[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Shopee Video Compliance Preflight Reports
  const complianceReport = useMemo(() => {
    if (!compiledResult) return null;
    return ShopeeVideoComplianceGuard.audit({
      scene1Dialogue: compiledResult.scene1.spokenDialogue,
      scene2Dialogue: compiledResult.scene2.spokenDialogue,
      scene3Dialogue: compiledResult.scene3.spokenDialogue,
      compiledPrompts: {
        scene1: compiledResult.scene1.prompt,
        scene2: compiledResult.scene2.prompt,
        scene3: compiledResult.scene3.prompt
      },
      ctaMode: compiledResult.sequenceContext.ctaMode
    });
  }, [compiledResult]);

  const scene1Report = useMemo(() => {
    if (!compiledResult) return null;
    return ShopeeVideoComplianceGuard.audit({
      scene1Dialogue: compiledResult.scene1.spokenDialogue,
      compiledPrompts: { scene1: compiledResult.scene1.prompt },
      ctaMode: compiledResult.sequenceContext.ctaMode
    });
  }, [compiledResult]);

  const scene2Report = useMemo(() => {
    if (!compiledResult) return null;
    return ShopeeVideoComplianceGuard.audit({
      scene2Dialogue: compiledResult.scene2.spokenDialogue,
      compiledPrompts: { scene2: compiledResult.scene2.prompt },
      ctaMode: compiledResult.sequenceContext.ctaMode
    });
  }, [compiledResult]);

  const scene3Report = useMemo(() => {
    if (!compiledResult) return null;
    return ShopeeVideoComplianceGuard.audit({
      scene3Dialogue: compiledResult.scene3.spokenDialogue,
      compiledPrompts: { scene3: compiledResult.scene3.prompt },
      ctaMode: compiledResult.sequenceContext.ctaMode
    });
  }, [compiledResult]);

  // Load avatars
  useEffect(() => {
    try {
      const loaded = loadCanonicalAvatars();
      setAvatars(loaded);
      if (!selectedAvatarId && loaded.length > 0) {
        setSelectedAvatarId(loaded[0].id);
      }
    } catch (e) {
      console.warn('Erro ao carregar avatares canônicos:', e);
    }

    const unsub = subscribeToAvatarUpdates((updated) => {
      setAvatars(updated);
    });
    return () => unsub();
  }, []);

  // Sync state to snapshot
  useEffect(() => {
    if (onSessionSnapshotChange) {
      const snapshot: ShopeeSceneHubSnapshot = {
        dialogueMode,
        presenterSource,
        manualPresenterGender,
        manualPresenterDesc,
        selectedAvatarId,
        scene1ManualDialogue,
        scene2ManualDialogue,
        scene3ManualDialogue,
        ctaMode,
        compiledResult,
        updatedAt: Date.now()
      };
      onSessionSnapshotChange(snapshot);
    }
  }, [
    dialogueMode,
    presenterSource,
    manualPresenterGender,
    manualPresenterDesc,
    selectedAvatarId,
    scene1ManualDialogue,
    scene2ManualDialogue,
    scene3ManualDialogue,
    ctaMode,
    compiledResult
  ]);

  // Selected avatar resolution
  const selectedAvatar = useMemo(() => {
    return avatars.find((a) => String(a.id) === String(selectedAvatarId)) || avatars[0] || null;
  }, [avatars, selectedAvatarId]);

  // Product workspace status
  const normCtx = productWorkspace?.normalizedProductContext;
  const hasProduct = Boolean(
    productWorkspace?.productImagePreview ||
    normCtx?.identity ||
    productWorkspace?.productIdentity
  );
  const isGrounded = productWorkspace?.sourceOfTruthStatus === 'grounded' || Boolean(normCtx?.identity);

  // Copy helpers
  const handleCopy = async (text: string, key: string) => {
    await copyToClipboard(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleCopyAll = async () => {
    if (!compiledResult) return;
    const all = `=== SHOPEE 3 CENAS UGC (ROTEIRO & PROMPTS) ===\n\n` +
      `----------------------------------------\n` +
      `PROMPT 1: ${compiledResult.scene1.title} (${compiledResult.scene1.durationSeconds}s)\n` +
      `FALA PT-BR: "${compiledResult.scene1.spokenDialogue}"\n\n` +
      `${compiledResult.scene1.prompt}\n\n` +
      `----------------------------------------\n` +
      `PROMPT 2: ${compiledResult.scene2.title} (${compiledResult.scene2.durationSeconds}s)\n` +
      `FALA PT-BR: "${compiledResult.scene2.spokenDialogue}"\n\n` +
      `${compiledResult.scene2.prompt}\n\n` +
      `----------------------------------------\n` +
      `PROMPT 3: ${compiledResult.scene3.title} (${compiledResult.scene3.durationSeconds}s)\n` +
      `FALA PT-BR: "${compiledResult.scene3.spokenDialogue}"\n\n` +
      `${compiledResult.scene3.prompt}`;

    await handleCopy(all, 'all');
  };

  // Run pipeline
  const handleGenerate = () => {
    setIsGenerating(true);
    try {
      const result = runShopeeSceneHubPipeline({
        productWorkspace,
        presenterSource,
        manualPresenterGender,
        manualPresenterDesc,
        selectedAvatar,
        dialogueMode,
        scene1ManualDialogue,
        scene2ManualDialogue,
        scene3ManualDialogue,
        ctaMode
      });
      setCompiledResult(result);
    } catch (err) {
      console.error('Erro na compilação do Shopee Scene Hub:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Warning checks for manual fields
  const warnings = useMemo(() => {
    const list: string[] = [];
    if (dialogueMode === 'manual') {
      list.push(...validateShopeeDialogueText(scene1ManualDialogue, 'Cena 1'));
      list.push(...validateShopeeDialogueText(scene2ManualDialogue, 'Cena 2'));
      list.push(...validateShopeeDialogueText(scene3ManualDialogue, 'Cena 3'));

      if (/clica|compre|link|sacolinha|carrinho|cupom|desconto|preço|r\$/i.test(scene1ManualDialogue)) {
        list.push('Aviso: Cena 1 (Gancho) não deve conter chamadas para ação (CTA) ou menções de preço.');
      }
      if (/clica|compre|link|sacolinha|carrinho|cupom|desconto|preço|r\$/i.test(scene2ManualDialogue)) {
        list.push('Aviso: Cena 2 (Demonstração) deve focar no benefício e no uso prático, sem CTA.');
      }
    }
    return list;
  }, [dialogueMode, scene1ManualDialogue, scene2ManualDialogue, scene3ManualDialogue]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-orange-950/70 via-slate-900 to-indigo-950/70 border border-orange-500/30 rounded-2xl p-6 shadow-2xl backdrop-blur-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider font-mono uppercase bg-orange-500/20 text-orange-400 border border-orange-500/30">
                Shopee Scene Hub
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-orange-500/20 text-orange-300 border border-orange-500/30">
                Preset: SHOPEE_NATIVE_CREATOR
              </span>
              <span className="text-slate-400 text-xs font-mono">Fase 1 — Core 3 Cenas UGC</span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <LucideIcon name="video" className="w-6 h-6 text-orange-400" />
              Gerador Sequencial de 3 Cenas Shopee
            </h2>
            <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
              Prioriza o padrão oficial <strong className="text-orange-300">Shopee Native Creator</strong>: 
              <span className="text-orange-300 font-semibold"> Produto em Uso</span> → 
              <span className="text-emerald-300 font-semibold"> Demonstração do Diferencial</span> → 
              <span className="text-indigo-300 font-semibold"> Benefício Prático</span> → 
              <span className="text-amber-300 font-semibold"> Opinião Pessoal</span> → 
              <span className="text-rose-300 font-semibold"> CTA Nativo</span>. 
              Cena 2 prioriza a prova física visível do benefício falado. Continuidade determinística absoluta.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 shadow-lg shadow-orange-500/20 transition-all cursor-pointer disabled:opacity-50 active:scale-98"
            >
              <LucideIcon name={isGenerating ? 'loader' : 'sparkles'} className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>{isGenerating ? 'Compilando...' : 'GERAR 3 CENAS SHOPEE'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2-COLUMN CONFIGURATION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: CONTROLS (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* 1. PRODUCT STATUS CARD */}
          <Card className="bg-slate-900/70 border-slate-800 p-5 space-y-4 rounded-xl">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <span className="text-[11px] uppercase font-bold text-orange-400 tracking-wider font-mono flex items-center gap-1.5">
                <LucideIcon name="package" className="w-4 h-4" /> 1. Autoridade do Produto
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                  isGrounded
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}
              >
                {isGrounded ? 'GROUNDED ATIVO' : hasProduct ? 'IMAGEM CARREGADA' : 'SEM PRODUTO'}
              </span>
            </div>

            {hasProduct ? (
              <div className="flex items-start gap-4 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                {productWorkspace?.productImagePreview ? (
                  <img
                    src={productWorkspace.productImagePreview}
                    alt="Produto"
                    className="w-16 h-16 object-cover rounded-lg border border-slate-700 shrink-0 shadow-md"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                    <LucideIcon name="image" className="w-6 h-6" />
                  </div>
                )}
                <div className="space-y-1 min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-white truncate">
                    {normCtx?.identity || productWorkspace?.productIdentity || 'Produto Físico Detectado'}
                  </h4>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Cor: <span className="text-orange-300">{normCtx?.canonicalColor || 'Cor Original'}</span>
                  </p>
                  {normCtx?.observableDetails && normCtx.observableDetails.length > 0 && (
                    <p className="text-[10px] text-slate-400 truncate">
                      {normCtx.observableDetails[0]}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-5 px-4 bg-slate-950/40 rounded-lg border border-dashed border-slate-800 space-y-2">
                <LucideIcon name="upload-cloud" className="w-8 h-8 text-slate-500 mx-auto" />
                <p className="text-xs text-slate-300">Nenhum produto carregado no Creative Director</p>
                <p className="text-[10px] text-slate-500">
                  Faça o upload da imagem do produto na aba principal do Creative Director ou utilize a geração de teste.
                </p>
                {onUploadProductImage && (
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 border border-orange-500/30 rounded-lg text-xs font-semibold cursor-pointer transition-colors">
                    <LucideIcon name="upload" className="w-3.5 h-3.5" />
                    <span>Upload de Foto</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) onUploadProductImage(file);
                      }}
                    />
                  </label>
                )}
              </div>
            )}
          </Card>

          {/* 2. PRESENTER SOURCE */}
          <Card className="bg-slate-900/70 border-slate-800 p-5 space-y-4 rounded-xl">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <span className="text-[11px] uppercase font-bold text-orange-400 tracking-wider font-mono flex items-center gap-1.5">
                <LucideIcon name="user" className="w-4 h-4" /> 2. Origem do Apresentador
              </span>
              <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px]">
                <button
                  type="button"
                  onClick={() => setPresenterSource('manual')}
                  className={`px-3 py-1 rounded-md transition-all cursor-pointer font-medium ${
                    presenterSource === 'manual'
                      ? 'bg-orange-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Manual
                </button>
                <button
                  type="button"
                  onClick={() => setPresenterSource('identity_hub')}
                  className={`px-3 py-1 rounded-md transition-all cursor-pointer font-medium ${
                    presenterSource === 'identity_hub'
                      ? 'bg-orange-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Identity Hub
                </button>
              </div>
            </div>

            {presenterSource === 'manual' ? (
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1 font-medium">Gênero</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setManualPresenterGender('female')}
                      className={`px-3 py-1.5 text-xs rounded-lg border text-center transition-all cursor-pointer font-medium ${
                        manualPresenterGender === 'female'
                          ? 'bg-orange-500/20 text-orange-300 border-orange-500/50'
                          : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      Feminino
                    </button>
                    <button
                      type="button"
                      onClick={() => setManualPresenterGender('male')}
                      className={`px-3 py-1.5 text-xs rounded-lg border text-center transition-all cursor-pointer font-medium ${
                        manualPresenterGender === 'male'
                          ? 'bg-orange-500/20 text-orange-300 border-orange-500/50'
                          : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      Masculino
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1 font-medium">
                    Descrição do Apresentador
                  </label>
                  <input
                    type="text"
                    value={manualPresenterDesc}
                    onChange={(e) => setManualPresenterDesc(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-orange-500"
                    placeholder="Ex: Apresentadora brasileira jovem, visual natural e comunicativo"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {avatars.length === 0 ? (
                  <div className="text-center py-4 bg-slate-950/50 rounded-lg border border-slate-800 text-xs text-slate-400">
                    Nenhum avatar cadastrado no Identity Hub. Crie um no Identity Hub ou use o modo Manual.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                    {avatars.map((av) => {
                      const isSelected = String(av.id) === String(selectedAvatarId);
                      const hasBrand = isBrandMarkActive(av.brandMarkProfile);
                      return (
                        <div
                          key={av.id}
                          onClick={() => setSelectedAvatarId(av.id)}
                          className={`flex items-center gap-2.5 p-2 rounded-lg border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-orange-500/20 border-orange-500/50 text-white shadow'
                              : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          {av.image ? (
                            <img
                              src={av.image}
                              alt={av.name}
                              className="w-10 h-10 rounded-full object-cover border border-slate-700 shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center shrink-0">
                              <LucideIcon name="user" className="w-5 h-5 text-slate-400" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold truncate text-white">{av.name}</div>
                            {hasBrand && (
                              <span className="inline-block px-1.5 py-0.2 text-[9px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded font-mono">
                                LOGO
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* 3. CTA MODE */}
          <Card className="bg-slate-900/70 border-slate-800 p-5 space-y-4 rounded-xl">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <span className="text-[11px] uppercase font-bold text-orange-400 tracking-wider font-mono flex items-center gap-1.5">
                <LucideIcon name="mouse-pointer" className="w-4 h-4" /> 3. Formato do CTA Shopee
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {[
                { id: 'produto_marcado', label: 'Produto Marcado', desc: 'No vídeo da Shopee' },
                { id: 'sacolinha', label: 'Sacolinha', desc: 'Ícone inferior esquerdo' },
                { id: 'link_shopee', label: 'Link da Shopee', desc: 'Na bio / descrição' },
                { id: 'icone_produto', label: 'Ícone do Produto', desc: 'Sticker no anúncio' },
                { id: 'manual', label: 'Personalizado', desc: 'Gesto direto na câmera' }
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setCtaMode(item.id as ShopeeCTAMode)}
                  className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                    ctaMode === item.id
                      ? 'bg-orange-500/20 border-orange-500/50 text-white shadow'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="font-bold text-white text-xs">{item.label}</div>
                  <div className="text-[10px] text-slate-500">{item.desc}</div>
                </button>
              ))}
            </div>

            <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800 flex items-start gap-2 text-[11px] text-slate-400">
              <LucideIcon name="shield-check" className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
              <span>
                Proteção de plataforma: menções a termos externos como <em>"carrinho laranja"</em> são sinalizadas para evitar restrições algorítmicas na Shopee.
              </span>
            </div>
          </Card>
        </div>

        {/* RIGHT COLUMN: SCRIPT & DIALOGUE (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="bg-slate-900/70 border-slate-800 p-5 space-y-4 rounded-xl">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <span className="text-[11px] uppercase font-bold text-orange-400 tracking-wider font-mono flex items-center gap-1.5">
                <LucideIcon name="mic" className="w-4 h-4" /> 4. Roteiro & Falas Faladas (PT-BR)
              </span>
              <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px]">
                <button
                  type="button"
                  onClick={() => setDialogueMode('auto')}
                  className={`px-3 py-1 rounded-md transition-all cursor-pointer font-medium ${
                    dialogueMode === 'auto'
                      ? 'bg-orange-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Modo Automático
                </button>
                <button
                  type="button"
                  onClick={() => setDialogueMode('manual')}
                  className={`px-3 py-1 rounded-md transition-all cursor-pointer font-medium ${
                    dialogueMode === 'manual'
                      ? 'bg-orange-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Modo Manual
                </button>
              </div>
            </div>

            {dialogueMode === 'auto' ? (
              <div className="p-4 bg-slate-950/70 rounded-xl border border-slate-800 space-y-3 text-xs text-slate-300 leading-relaxed">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-orange-400 font-bold">
                    <LucideIcon name="sparkles" className="w-4 h-4" />
                    <span>Shopee Native Creator — Brain Ativo</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-orange-500/20 text-orange-300 border border-orange-500/30">
                    Preset: SHOPEE_NATIVE_CREATOR
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-orange-950/20 border border-orange-500/20 text-[11px] space-y-1.5">
                  <div className="font-semibold text-orange-300">Padrão Nativo Shopee (Sequência de Retenção):</div>
                  <div className="flex flex-wrap items-center gap-1.5 text-slate-300">
                    <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-orange-300 font-medium">1. Produto em Uso</span>
                    <span className="text-slate-600">→</span>
                    <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-orange-300 font-medium">2. Diferencial</span>
                    <span className="text-slate-600">→</span>
                    <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-orange-300 font-medium">3. Benefício Prático</span>
                    <span className="text-slate-600">→</span>
                    <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-orange-300 font-medium">4. Opinião Pessoal</span>
                    <span className="text-slate-600">→</span>
                    <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-orange-300 font-medium">5. CTA Nativo</span>
                  </div>
                </div>

                <ul className="list-disc list-inside text-slate-400 space-y-1 pl-1 text-[11px]">
                  <li><strong>Cena 1 (3s):</strong> Gancho curto contextualizando o produto em uso e problema no dia a dia.</li>
                  <li><strong>Cena 2 (8s):</strong> Prioriza a prova física visível do benefício falado + demonstração funcional (160–175 caracteres).</li>
                  <li><strong>Cena 3 (8s):</strong> Opinião e fechamento seguro com CTA nativo Shopee ({ctaMode}).</li>
                </ul>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-amber-500/10 border border-amber-500/30 p-2.5 rounded-lg text-[11px] text-amber-300 flex items-center gap-2 font-mono">
                  <LucideIcon name="lock" className="w-3.5 h-3.5 shrink-0" />
                  <span>REGRA DE OURO: Suas palavras manuais são 100% preservadas byte-a-byte.</span>
                </div>

                {/* SCENE 1 DIALOGUE */}
                <div>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span className="font-semibold text-slate-300">Cena 1 — Gancho & Problema (3.0s)</span>
                    <span className="font-mono text-orange-400 text-[10px]">Sem CTA / Sem Preço</span>
                  </div>
                  <textarea
                    rows={2}
                    value={scene1ManualDialogue}
                    onChange={(e) => setScene1ManualDialogue(e.target.value)}
                    placeholder="Ex: Se você também perde tempo tentando limpar esses cantos difíceis, você precisa ver isso aqui."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-orange-500"
                  />
                </div>

                {/* SCENE 2 DIALOGUE */}
                <div>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span className="font-semibold text-slate-300">Cena 2 — Benefício & Demonstração (8.0s)</span>
                    <span className="font-mono text-slate-500 text-[10px]">
                      {scene2ManualDialogue.length} caracteres (Ideal: 160-175)
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    value={scene2ManualDialogue}
                    onChange={(e) => setScene2ManualDialogue(e.target.value)}
                    placeholder="Ex: Esse esfregão articulado alcança qualquer cantinho com leveza total. A microfibra puxa a sujeira de primeira sem esforço nenhum aqui em casa."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-orange-500"
                  />
                </div>

                {/* SCENE 3 DIALOGUE */}
                <div>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span className="font-semibold text-slate-300">Cena 3 — Conversão & CTA (8.0s)</span>
                    <span className="font-mono text-slate-500 text-[10px]">
                      {scene3ManualDialogue.length} caracteres
                    </span>
                  </div>
                  <textarea
                    rows={2}
                    value={scene3ManualDialogue}
                    onChange={(e) => setScene3ManualDialogue(e.target.value)}
                    placeholder="Ex: Aproveita e clica no produto marcado aqui no vídeo para garantir o seu antes que acabe o estoque!"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>
            )}

            {/* WARNINGS */}
            {warnings.length > 0 && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg space-y-1">
                {warnings.map((w, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-amber-300">
                    <LucideIcon name="alert-triangle" className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* OUTPUT AREA */}
      {compiledResult && (
        <div className="space-y-6 pt-4 border-t border-slate-800">
          {/* Shopee Video Health Preflight Panel */}
          {complianceReport && (
            <ShopeeCompliancePreflightPanel
              report={complianceReport}
              title="SHOPEE VIDEO HEALTH — CONFORMIDADE GERAL DO VÍDEO"
            />
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30">
                <LucideIcon name="check-circle" className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">3 Cenas Compiladas com Sucesso</h3>
                <p className="text-xs text-slate-400">
                  Pronto para gerar no Kling / Runway / Luma / Sora com áudio em Português
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={complianceReport?.isBlocked}
              onClick={() => !complianceReport?.isBlocked && handleCopyAll()}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold shadow-lg transition-all ${
                complianceReport?.isBlocked
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer'
              }`}
              title={
                complianceReport?.isBlocked
                  ? 'Exportação bloqueada: corrija as violações de conformidade de conta antes de exportar'
                  : 'Copiar Todos os 3 Prompts'
              }
            >
              <LucideIcon name={copiedKey === 'all' ? 'check' : 'copy'} className="w-3.5 h-3.5" />
              <span>
                {complianceReport?.isBlocked
                  ? 'Exportação Bloqueada'
                  : copiedKey === 'all'
                  ? 'Copiado!'
                  : 'Copiar Todos os 3 Prompts'}
              </span>
            </button>
          </div>

          {/* 3 PROMPT CARDS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* SCENE 1 CARD */}
            <Card className="bg-slate-900/80 border-slate-800 rounded-xl p-5 space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30">
                    CENA 1 (3.0s)
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">Gancho & Problema</span>
                </div>
                <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800 text-xs">
                  <span className="text-[10px] text-slate-500 block font-mono">FALA PT-BR:</span>
                  <span className="text-slate-200 font-medium">"{compiledResult.scene1.spokenDialogue}"</span>
                </div>
                <textarea
                  readOnly
                  rows={12}
                  value={compiledResult.scene1.prompt}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-[11px] font-mono text-slate-300 leading-relaxed resize-none focus:outline-none"
                />
              </div>

              <button
                type="button"
                disabled={scene1Report?.isBlocked}
                onClick={() => !scene1Report?.isBlocked && handleCopy(compiledResult.scene1.prompt, 'scene1')}
                className={`w-full py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                  scene1Report?.isBlocked
                    ? 'bg-slate-800/80 text-slate-500 cursor-not-allowed border border-slate-700/50'
                    : 'bg-slate-800 hover:bg-slate-700 text-white cursor-pointer'
                }`}
                title={
                  scene1Report?.isBlocked
                    ? 'Bloqueado por violação de conformidade de conta'
                    : 'Copiar Prompt 1'
                }
              >
                <LucideIcon name={copiedKey === 'scene1' ? 'check' : 'copy'} className="w-3.5 h-3.5 text-orange-400" />
                <span>
                  {scene1Report?.isBlocked
                    ? 'Bloqueado para Exportação'
                    : copiedKey === 'scene1'
                    ? 'Copiado!'
                    : 'Copiar Prompt 1'}
                </span>
              </button>
            </Card>

            {/* SCENE 2 CARD */}
            <Card className="bg-slate-900/80 border-slate-800 rounded-xl p-5 space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    CENA 2 (8.0s)
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">Benefício & Demonstração</span>
                </div>
                <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800 text-xs">
                  <span className="text-[10px] text-slate-500 block font-mono">FALA PT-BR:</span>
                  <span className="text-slate-200 font-medium">"{compiledResult.scene2.spokenDialogue}"</span>
                </div>
                <textarea
                  readOnly
                  rows={12}
                  value={compiledResult.scene2.prompt}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-[11px] font-mono text-slate-300 leading-relaxed resize-none focus:outline-none"
                />
              </div>

              <button
                type="button"
                disabled={scene2Report?.isBlocked}
                onClick={() => !scene2Report?.isBlocked && handleCopy(compiledResult.scene2.prompt, 'scene2')}
                className={`w-full py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                  scene2Report?.isBlocked
                    ? 'bg-slate-800/80 text-slate-500 cursor-not-allowed border border-slate-700/50'
                    : 'bg-slate-800 hover:bg-slate-700 text-white cursor-pointer'
                }`}
                title={
                  scene2Report?.isBlocked
                    ? 'Bloqueado por violação de conformidade de conta'
                    : 'Copiar Prompt 2'
                }
              >
                <LucideIcon name={copiedKey === 'scene2' ? 'check' : 'copy'} className="w-3.5 h-3.5 text-emerald-400" />
                <span>
                  {scene2Report?.isBlocked
                    ? 'Bloqueado para Exportação'
                    : copiedKey === 'scene2'
                    ? 'Copiado!'
                    : 'Copiar Prompt 2'}
                </span>
              </button>
            </Card>

            {/* SCENE 3 CARD */}
            <Card className="bg-slate-900/80 border-slate-800 rounded-xl p-5 space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                    CENA 3 (8.0s)
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">Conversão & CTA</span>
                </div>
                <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800 text-xs">
                  <span className="text-[10px] text-slate-500 block font-mono">FALA PT-BR:</span>
                  <span className="text-slate-200 font-medium">"{compiledResult.scene3.spokenDialogue}"</span>
                </div>
                <textarea
                  readOnly
                  rows={12}
                  value={compiledResult.scene3.prompt}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-[11px] font-mono text-slate-300 leading-relaxed resize-none focus:outline-none"
                />
              </div>

              <button
                type="button"
                disabled={scene3Report?.isBlocked}
                onClick={() => !scene3Report?.isBlocked && handleCopy(compiledResult.scene3.prompt, 'scene3')}
                className={`w-full py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                  scene3Report?.isBlocked
                    ? 'bg-slate-800/80 text-slate-500 cursor-not-allowed border border-slate-700/50'
                    : 'bg-slate-800 hover:bg-slate-700 text-white cursor-pointer'
                }`}
                title={
                  scene3Report?.isBlocked
                    ? 'Bloqueado por violação de conformidade de conta'
                    : 'Copiar Prompt 3'
                }
              >
                <LucideIcon name={copiedKey === 'scene3' ? 'check' : 'copy'} className="w-3.5 h-3.5 text-indigo-400" />
                <span>
                  {scene3Report?.isBlocked
                    ? 'Bloqueado para Exportação'
                    : copiedKey === 'scene3'
                    ? 'Copiado!'
                    : 'Copiar Prompt 3'}
                </span>
              </button>
            </Card>
          </div>

          {/* CONTINUITY FOOTER DIAGNOSTICS */}
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-3 text-[10px] font-mono text-slate-400">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>Continuidade Ativa:</span>
              <span className="text-white">{compiledResult.sequenceContext.product.productIdentity}</span>
            </div>
            <div className="flex items-center gap-3">
              <span>Vestuário Hash: <strong className="text-slate-300">{compiledResult.sequenceContext.continuityMetadata.wardrobeContractHash}</strong></span>
              <span>Marca / Logo: <strong className="text-slate-300">{compiledResult.sequenceContext.continuityMetadata.brandMarkActive ? 'Ativo' : 'Inativo'}</strong></span>
              <span>Modo CTA: <strong className="text-orange-300">{compiledResult.sequenceContext.ctaMode}</strong></span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
