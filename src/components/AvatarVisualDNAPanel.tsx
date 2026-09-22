import React, { useState } from 'react';
import { LucideIcon } from './Common';
import {
  AvatarReferenceProfile,
  VisualEvidence,
  VisualEvidenceStatus,
  BrandMarkProfile,
  BrandMarkType,
  BrandMarkAnchorRegion,
  BrandMarkFidelityLevel,
  getBrandMarkTypeLabel,
  getBrandMarkAnchorLabel,
  getBrandMarkFidelityLabel,
  getBrandMarkScaleLabel,
  resolveBrandMarkAuthority,
  isBrandMarkActive
} from '../features/visual-reference-engine';

interface AvatarVisualDNAPanelProps {
  profile?: AvatarReferenceProfile;
  originalImage: string;
  avatarName: string;
  isAnalyzing: boolean;
  onReanalyze: (cleanReference: boolean) => void;
  onReplaceImage: () => void;
  onDelete: () => void;
  onUpdateName?: (name: string) => void;
  onUpdateBrandMark?: (brandMark: BrandMarkProfile) => void;
}

export const AvatarVisualDNAPanel: React.FC<AvatarVisualDNAPanelProps> = ({
  profile,
  originalImage,
  avatarName,
  isAnalyzing,
  onReanalyze,
  onReplaceImage,
  onDelete,
  onUpdateName,
  onUpdateBrandMark
}) => {
  const [activeImageTab, setActiveImageTab] = useState<'original' | 'cleaned'>('original');
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [showDebugEvidence, setShowDebugEvidence] = useState(false);
  const [cleanReferenceOnReanalyze, setCleanReferenceOnReanalyze] = useState(
    profile?.cleanedImage ? true : false
  );
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInputValue, setNameInputValue] = useState(avatarName);
  const [isLogoDragOver, setIsLogoDragOver] = useState(false);

  // Local Brand Mark state initialized from profile
  const initialBrandMark: BrandMarkProfile = profile?.brandMarkProfile || {
    enabled: false,
    referenceImage: undefined,
    markType: 'print',
    anchorRegion: 'left_chest',
    customAnchorRegion: '',
    relativeScale: 'medium',
    colorProfile: '',
    visibleText: '',
    fidelityLevel: 'standard',
    preserveAcrossScenes: true
  };

  const [brandMarkState, setBrandMarkState] = useState<BrandMarkProfile>(initialBrandMark);

  // Sync brand mark when profile changes
  React.useEffect(() => {
    if (profile?.brandMarkProfile) {
      setBrandMarkState(profile.brandMarkProfile);
    }
  }, [profile?.brandMarkProfile]);

  const handleUpdateBrandMarkField = <K extends keyof BrandMarkProfile>(
    field: K,
    value: BrandMarkProfile[K]
  ) => {
    const nextBrandMark: BrandMarkProfile = {
      ...brandMarkState,
      [field]: value
    };
    setBrandMarkState(nextBrandMark);
    if (onUpdateBrandMark) {
      onUpdateBrandMark(nextBrandMark);
    }
  };

  const handleLogoFileUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Selecione um arquivo de imagem válido (PNG, JPG, SVG, WebP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const resultStr = e.target?.result as string;
      if (resultStr) {
        handleUpdateBrandMarkField('referenceImage', resultStr);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCopyPrompt = () => {
    if (profile?.identityPrompt) {
      navigator.clipboard.writeText(profile.identityPrompt);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2000);
    }
  };

  const handleSaveName = () => {
    if (onUpdateName && nameInputValue.trim()) {
      onUpdateName(nameInputValue.trim());
    }
    setIsEditingName(false);
  };

  const renderEvidenceTag = (status?: VisualEvidenceStatus) => {
    if (!showDebugEvidence || !status) return null;
    const badgeColors: Record<VisualEvidenceStatus, string> = {
      VISIBLE: 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30',
      PARTIAL: 'bg-amber-950/60 text-amber-300 border-amber-500/30',
      INFERRED: 'bg-sky-950/60 text-sky-300 border-sky-500/30',
      UNKNOWN: 'bg-slate-800 text-slate-400 border-slate-700'
    };
    return (
      <span
        className={`ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider border ${badgeColors[status] || 'bg-slate-800 text-slate-400'}`}
      >
        {status}
      </span>
    );
  };

  const formatEvidenceValue = <T,>(
    evidence?: VisualEvidence<T>,
    fallback = 'Não observado'
  ): { text: string; isUnknown: boolean; status?: VisualEvidenceStatus } => {
    if (!evidence) {
      return { text: fallback, isUnknown: true, status: 'UNKNOWN' };
    }
    if (evidence.status === 'UNKNOWN') {
      return { text: 'Não observado / Desconhecido', isUnknown: true, status: 'UNKNOWN' };
    }
    if (Array.isArray(evidence.value)) {
      return {
        text: evidence.value.join(', ') || fallback,
        isUnknown: false,
        status: evidence.status
      };
    }
    if (evidence.value !== undefined && evidence.value !== null) {
      return {
        text: String(evidence.value),
        isUnknown: false,
        status: evidence.status
      };
    }
    return { text: fallback, isUnknown: true, status: evidence.status };
  };

  const identity = profile?.identityDNA || profile?.analysis?.identity;
  const face = profile?.analysis?.face;
  const hair = profile?.analysis?.hair;
  const skin = profile?.analysis?.skin;
  const sceneState = profile?.sceneStateDNA || profile?.analysis?.sceneState;
  const wardrobe = sceneState?.wardrobe;
  const pose = sceneState?.pose;
  const accessories = sceneState?.accessories;
  const background = sceneState?.background;
  const lighting = sceneState?.lighting;
  const camera = sceneState?.camera;

  const displayImage =
    activeImageTab === 'cleaned' && profile?.cleanedImage
      ? profile.cleanedImage
      : originalImage || profile?.originalImage;

  return (
    <div className="bg-[#0b102b] border border-indigo-500/30 rounded-2xl p-5 md:p-6 shadow-2xl space-y-6 animate-fade-in">
      {/* 1. TOP HEADER & METADATA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-indigo-500/20">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-300">
            <LucideIcon name="dna" className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              {isEditingName ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={nameInputValue}
                    onChange={(e) => setNameInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                    className="bg-slate-900 border border-indigo-500/50 rounded px-2 py-0.5 text-sm font-bold text-white focus:outline-none focus:border-indigo-400"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveName}
                    className="p-1 text-emerald-400 hover:text-emerald-300 transition"
                    title="Salvar Nome"
                  >
                    <LucideIcon name="check" className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white tracking-wide">{avatarName}</h3>
                  <button
                    onClick={() => setIsEditingName(true)}
                    className="text-slate-400 hover:text-indigo-300 transition"
                    title="Renomear"
                  >
                    <LucideIcon name="edit-3" className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              <span className="text-[10px] font-mono bg-indigo-950/80 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30">
                AVATAR VISUAL DNA
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Identidade biométrica visual consistente com separação estrita de estado de cena.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowPromptModal(true)}
            disabled={!profile?.identityPrompt}
            className="px-3 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-40"
          >
            <LucideIcon name="file-text" className="w-3.5 h-3.5" />
            <span>Ver Identity Prompt</span>
          </button>

          <button
            onClick={onReplaceImage}
            disabled={isAnalyzing}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition"
          >
            <LucideIcon name="image" className="w-3.5 h-3.5" />
            <span>Substituir Foto</span>
          </button>

          <button
            onClick={onDelete}
            disabled={isAnalyzing}
            className="px-3 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/40 text-xs font-medium flex items-center gap-1.5 transition"
          >
            <LucideIcon name="trash-2" className="w-3.5 h-3.5" />
            <span>Excluir</span>
          </button>
        </div>
      </div>

      {/* 2. STATUS INDICATORS & CONTROLS BAR */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-[#070b20] p-3.5 rounded-xl border border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Identity Analysis</span>
            <span className="text-xs font-bold text-emerald-400">
              {profile?.analysis ? 'READY' : isAnalyzing ? 'ANALYZING...' : 'PENDING'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${profile?.cleanedImage ? 'bg-emerald-400' : 'bg-slate-600'}`}
          ></div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Reference Cleaner</span>
            <span
              className={`text-xs font-bold ${profile?.cleanedImage ? 'text-emerald-400' : 'text-slate-400'}`}
            >
              {profile?.cleanedImage ? 'READY (CLEAN_WHITE)' : 'NOT USED'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Identity Prompt</span>
            <span className="text-xs font-bold text-emerald-400">
              {profile?.identityPrompt ? 'READY' : 'PENDING'}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between md:justify-end gap-2 border-t md:border-t-0 border-slate-800 pt-2 md:pt-0">
          <button
            onClick={() => setShowDebugEvidence(!showDebugEvidence)}
            className={`px-2.5 py-1 rounded text-[11px] font-medium border flex items-center gap-1 transition ${
              showDebugEvidence
                ? 'bg-indigo-900/60 text-indigo-200 border-indigo-500/50'
                : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
            title="Exibir status de evidência (VISIBLE, PARTIAL, INFERRED, UNKNOWN)"
          >
            <LucideIcon name="activity" className="w-3 h-3" />
            <span>{showDebugEvidence ? 'Ocultar Evidências' : 'Inspecionar Evidências'}</span>
          </button>
        </div>
      </div>

      {/* 3. VISUAL PREVIEWS & REANALYSIS BAR */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Avatar Preview with Original / Cleaned Toggle */}
        <div className="lg:col-span-4 bg-[#070b20] border border-slate-800/90 rounded-xl p-4 flex flex-col items-center space-y-4">
          <div className="flex items-center justify-between w-full">
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Preview Visual</span>
            {profile?.cleanedImage && (
              <div className="flex bg-slate-900 rounded-lg p-0.5 border border-slate-700 text-[10px] font-semibold">
                <button
                  onClick={() => setActiveImageTab('original')}
                  className={`px-2 py-0.5 rounded transition ${
                    activeImageTab === 'original'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Original
                </button>
                <button
                  onClick={() => setActiveImageTab('cleaned')}
                  className={`px-2 py-0.5 rounded transition ${
                    activeImageTab === 'cleaned'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Limpa
                </button>
              </div>
            )}
          </div>

          <div className="relative w-48 h-48 rounded-2xl overflow-hidden border-2 border-indigo-500/40 bg-slate-950 shadow-inner group">
            {displayImage ? (
              <img
                referrerPolicy="no-referrer"
                src={displayImage}
                alt={avatarName}
                className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 p-4 text-center">
                <LucideIcon name="user" className="w-12 h-12 mb-2 opacity-50" />
                <span className="text-xs">Nenhuma imagem carregada</span>
              </div>
            )}

            {activeImageTab === 'cleaned' && profile?.cleanedImage && (
              <div className="absolute top-2 right-2 bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[9px] font-bold px-1.5 py-0.5 rounded backdrop-blur">
                CLEAN_WHITE
              </div>
            )}
          </div>

          {/* Reanalysis with Cleaner Option */}
          <div className="w-full pt-2 border-t border-slate-800 space-y-2.5">
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-300 hover:text-white">
              <input
                type="checkbox"
                checked={cleanReferenceOnReanalyze}
                onChange={(e) => setCleanReferenceOnReanalyze(e.target.checked)}
                className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5"
              />
              <span className="font-medium">Limpar referência (Clean White)</span>
            </label>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Remove overlays de texto e aplica fundo branco de estúdio mantendo rosto, roupas, pose e marcas.
            </p>

            <button
              onClick={() => onReanalyze(cleanReferenceOnReanalyze)}
              disabled={isAnalyzing}
              className="w-full py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition shadow-lg shadow-indigo-600/20 disabled:opacity-50"
            >
              {isAnalyzing ? (
                <>
                  <LucideIcon name="loader-2" className="w-3.5 h-3.5 animate-spin" />
                  <span>Analisando Visual DNA...</span>
                </>
              ) : (
                <>
                  <LucideIcon name="refresh-cw" className="w-3.5 h-3.5" />
                  <span>Reanalisar Avatar</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Side: DNA Data Breakdown (Strictly separated Identity vs Scene State) */}
        <div className="lg:col-span-8 space-y-5">
          {/* SECTION A: IDENTIDADE DO AVATAR (Intrinsic Traits) */}
          <div className="bg-[#080d24] border border-emerald-500/30 rounded-xl p-4 space-y-3.5 shadow-md">
            <div className="flex items-center justify-between pb-2 border-b border-emerald-500/20">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                  <LucideIcon name="user-check" className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                    IDENTIDADE DO AVATAR (Traços Intrínsecos)
                  </h4>
                  <span className="text-[10px] text-slate-400">
                    Constantes biométricas imutáveis (Rosto, Cabelo, Pele e Traços)
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-mono bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded">
                PERMANENTE
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Face */}
              <div className="bg-[#05091a] p-2.5 rounded-lg border border-slate-800/80 space-y-1">
                <div className="flex items-center justify-between text-slate-400 font-semibold text-[11px]">
                  <span className="flex items-center gap-1.5">
                    <LucideIcon name="smile" className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Rosto & Olhos</span>
                  </span>
                  {renderEvidenceTag(
                    face?.eyeAppearance?.status || identity?.visibleFacialAppearance?.status
                  )}
                </div>
                <p className="text-slate-200">
                  {formatEvidenceValue(
                    identity?.visibleFacialAppearance || face?.eyeAppearance,
                    'Estrutura facial natural'
                  ).text}
                </p>
                {face?.headOrientation?.value && (
                  <p className="text-[10px] text-slate-400">
                    Orientação: {face.headOrientation.value}
                  </p>
                )}
              </div>

              {/* Hair */}
              <div className="bg-[#05091a] p-2.5 rounded-lg border border-slate-800/80 space-y-1">
                <div className="flex items-center justify-between text-slate-400 font-semibold text-[11px]">
                  <span className="flex items-center gap-1.5">
                    <LucideIcon name="scissors" className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Cabelo & Penteado</span>
                  </span>
                  {renderEvidenceTag(hair?.hairstyle?.status || identity?.hairCharacteristics?.status)}
                </div>
                <p className="text-slate-200">
                  {formatEvidenceValue(
                    identity?.hairCharacteristics || hair?.hairstyle,
                    'Corte e estilo visíveis na referência'
                  ).text}
                </p>
                {hair?.color?.value && (
                  <p className="text-[10px] text-slate-400">Cor: {hair.color.value}</p>
                )}
              </div>

              {/* Skin */}
              <div className="bg-[#05091a] p-2.5 rounded-lg border border-slate-800/80 space-y-1">
                <div className="flex items-center justify-between text-slate-400 font-semibold text-[11px]">
                  <span className="flex items-center gap-1.5">
                    <LucideIcon name="sun" className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Pele & Textura</span>
                  </span>
                  {renderEvidenceTag(skin?.visibleTone?.status || identity?.skinCharacteristics?.status)}
                </div>
                <p className="text-slate-200">
                  {formatEvidenceValue(
                    identity?.skinCharacteristics || skin?.visibleTone,
                    'Textura de pele autêntica com poros naturais'
                  ).text}
                </p>
                {skin?.surfaceTexture?.value && (
                  <p className="text-[10px] text-slate-400">
                    Textura: {skin.surfaceTexture.value}
                  </p>
                )}
              </div>

              {/* Distinguishing Traits */}
              <div className="bg-[#05091a] p-2.5 rounded-lg border border-slate-800/80 space-y-1">
                <div className="flex items-center justify-between text-slate-400 font-semibold text-[11px]">
                  <span className="flex items-center gap-1.5">
                    <LucideIcon name="sparkles" className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Traços Distintivos</span>
                  </span>
                  {renderEvidenceTag(identity?.distinguishingTraits?.status)}
                </div>
                <p className="text-slate-200">
                  {formatEvidenceValue(
                    identity?.distinguishingTraits,
                    'Sem marcas anômalas ou tatuagens intrusivas'
                  ).text}
                </p>
              </div>
            </div>
          </div>

          {/* SECTION B: ESTADO DA FOTO DE REFERÊNCIA (Contextual / Transient) */}
          <div className="bg-[#080d24] border border-indigo-500/20 rounded-xl p-4 space-y-3.5 shadow-md">
            <div className="flex items-center justify-between pb-2 border-b border-indigo-500/20">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
                  <LucideIcon name="camera" className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                    ESTADO DA FOTO DE REFERÊNCIA (Contextual)
                  </h4>
                  <span className="text-[10px] text-slate-400">
                    Condições transitórias do momento da foto (Pose, Roupa, Câmera e Luz)
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-mono bg-indigo-950/60 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded">
                TRANSITÓRIO
              </span>
            </div>

            {/* Wardrobe & Pose Handoff Notice */}
            <div className="bg-amber-950/30 border border-amber-500/30 rounded-lg p-2.5 flex items-start gap-2.5 text-[11px] text-amber-200/90">
              <LucideIcon name="info" className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-amber-300 font-bold">Regra de Handoff de Figurino & Pose:</strong> A roupa
                e a pose observadas na referência são puramente contextuais. Quando o Diretor Criativo ou
                Cinematic Engine definirem o vestuário ou ação:{' '}
                <span className="text-white font-mono font-bold">Defined Wardrobe &gt; Reference Wardrobe</span>. O
                avatar fornece identidade fisionômica, não trava o figurino.
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              {/* Pose */}
              <div className="bg-[#05091a] p-2.5 rounded-lg border border-slate-800/80 space-y-1">
                <div className="flex items-center justify-between text-slate-400 font-semibold text-[11px]">
                  <span className="flex items-center gap-1.5">
                    <LucideIcon name="user" className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Pose Observada</span>
                  </span>
                  {renderEvidenceTag(pose?.bodyOrientation?.status)}
                </div>
                <p className="text-slate-200">
                  {formatEvidenceValue(pose?.bodyOrientation, 'Postura natural').text}
                </p>
                {pose?.leftArm?.upperArmDirection?.value && (
                  <p className="text-[10px] text-slate-400 truncate">
                    Braço E: {pose.leftArm.upperArmDirection.value}
                  </p>
                )}
                {pose?.rightArm?.upperArmDirection?.value && (
                  <p className="text-[10px] text-slate-400 truncate">
                    Braço D: {pose.rightArm.upperArmDirection.value}
                  </p>
                )}
              </div>

              {/* Wardrobe */}
              <div className="bg-[#05091a] p-2.5 rounded-lg border border-slate-800/80 space-y-1">
                <div className="flex items-center justify-between text-slate-400 font-semibold text-[11px]">
                  <span className="flex items-center gap-1.5">
                    <LucideIcon name="shirt" className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Roupa de Referência</span>
                  </span>
                  {renderEvidenceTag(wardrobe?.top?.type?.status)}
                </div>
                <p className="text-slate-200">
                  {formatEvidenceValue(wardrobe?.top?.type, 'Vestuário casual').text}
                </p>
                {wardrobe?.top?.color?.value && (
                  <p className="text-[10px] text-slate-400">
                    Cor: {wardrobe.top.color.value}
                  </p>
                )}
              </div>

              {/* Lighting & Camera */}
              <div className="bg-[#05091a] p-2.5 rounded-lg border border-slate-800/80 space-y-1">
                <div className="flex items-center justify-between text-slate-400 font-semibold text-[11px]">
                  <span className="flex items-center gap-1.5">
                    <LucideIcon name="sun" className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Luz & Câmera</span>
                  </span>
                  {renderEvidenceTag(lighting?.lightType?.status)}
                </div>
                <p className="text-slate-200">
                  {formatEvidenceValue(lighting?.lightType, 'Luz suave de estúdio').text}
                </p>
                {camera?.viewpoint?.value && (
                  <p className="text-[10px] text-slate-400">
                    Câmera: {camera.viewpoint.value}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* 3.5 BRAND / LOGO IDENTITY (Marca / Logo da Apresentadora) */}
          <div className="bg-[#070c22] p-4 rounded-xl border border-indigo-500/20 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-indigo-500/10">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                  <LucideIcon name="tag" className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-2">
                    <span>Marca / Logo da Apresentadora</span>
                    <span className="text-[9px] font-mono text-slate-400 font-normal">
                      (Brand & Logo Identity Authority)
                    </span>
                  </h4>
                  <span className="text-[10px] text-slate-400">
                    Preserve logos, bordados e estampas da roupa de forma consistente entre as cenas
                  </span>
                </div>
              </div>

              {/* Status Badges */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                    brandMarkState.enabled
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                      : 'bg-slate-900 text-slate-400 border-slate-700'
                  }`}
                >
                  {brandMarkState.enabled ? 'Logo Configurado' : 'Desativado'}
                </span>
                {brandMarkState.enabled && (
                  <>
                    <span className="text-[10px] font-mono bg-indigo-950/80 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded">
                      Âncora: {getBrandMarkAnchorLabel(brandMarkState.anchorRegion, brandMarkState.customAnchorRegion)}
                    </span>
                    <span className="text-[10px] font-mono bg-sky-950/80 text-sky-300 border border-sky-500/30 px-2 py-0.5 rounded">
                      Fidelidade: {getBrandMarkFidelityLabel(brandMarkState.fidelityLevel)}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Enable Toggle & Cross-Scene Checkbox */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[#05091a] p-3 rounded-lg border border-slate-800">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-slate-200">
                <input
                  type="checkbox"
                  checked={brandMarkState.enabled}
                  onChange={(e) => handleUpdateBrandMarkField('enabled', e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-800 border-slate-600 text-emerald-500 focus:ring-0 cursor-pointer"
                />
                <span>Ativar preservação da marca/logo no vestuário</span>
              </label>

              {brandMarkState.enabled && (
                <label className="flex items-center gap-2 cursor-pointer text-[11px] text-indigo-300">
                  <input
                    type="checkbox"
                    checked={brandMarkState.preserveAcrossScenes}
                    onChange={(e) => handleUpdateBrandMarkField('preserveAcrossScenes', e.target.checked)}
                    className="w-3.5 h-3.5 rounded bg-slate-800 border-slate-600 text-indigo-500 focus:ring-0 cursor-pointer"
                  />
                  <span>Preservar entre cenas (Scene 2, Scene 3, Storyboard e Vids)</span>
                </label>
              )}
            </div>

            {brandMarkState.enabled && (
              <div className="space-y-4 pt-1 animate-fade-in">
                {/* Visual Reference & Configuration Grid */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  {/* Left Column: Reference Image Upload & Preview */}
                  <div className="md:col-span-4 space-y-2">
                    <label className="block text-[11px] font-semibold text-slate-300">
                      Referência Visual da Marca / Logo
                    </label>

                    {brandMarkState.referenceImage ? (
                      <div className="relative group rounded-xl overflow-hidden border border-emerald-500/30 bg-black/50 p-2 text-center">
                        <img
                          referrerPolicy="no-referrer"
                          src={brandMarkState.referenceImage}
                          alt="Brand Mark Reference"
                          className="max-h-36 mx-auto object-contain rounded-lg"
                        />
                        <div className="mt-2 flex items-center justify-center gap-2">
                          <label className="text-[10px] text-indigo-300 hover:text-indigo-200 bg-indigo-950/80 px-2.5 py-1 rounded border border-indigo-500/30 cursor-pointer">
                            Trocar
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleLogoFileUpload(file);
                              }}
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => handleUpdateBrandMarkField('referenceImage', undefined)}
                            className="text-[10px] text-red-400 hover:text-red-300 bg-red-950/60 px-2.5 py-1 rounded border border-red-500/30"
                          >
                            Remover
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsLogoDragOver(true);
                        }}
                        onDragLeave={() => setIsLogoDragOver(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsLogoDragOver(false);
                          const file = e.dataTransfer.files?.[0];
                          if (file) handleLogoFileUpload(file);
                        }}
                        className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                          isLogoDragOver
                            ? 'border-emerald-400 bg-emerald-950/30'
                            : 'border-slate-700 bg-[#05091a] hover:border-emerald-500/50'
                        }`}
                      >
                        <label className="cursor-pointer block space-y-1">
                          <LucideIcon name="upload" className="w-5 h-5 text-emerald-400 mx-auto" />
                          <span className="text-[11px] font-semibold text-slate-200 block">
                            Upload do Logo / Estampa
                          </span>
                          <span className="text-[9px] text-slate-400 block">
                            Arraste ou clique para carregar a arte do logo
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleLogoFileUpload(file);
                            }}
                          />
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Controls */}
                  <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Mark Type */}
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                        Tipo da Marca
                      </label>
                      <select
                        value={brandMarkState.markType || 'print'}
                        onChange={(e) => handleUpdateBrandMarkField('markType', e.target.value as BrandMarkType)}
                        className="w-full text-xs bg-[#05091a] border border-slate-700 rounded-lg p-2 text-slate-200 focus:border-emerald-500 focus:outline-none"
                      >
                        <option value="print">Estampa / Impressão (Print)</option>
                        <option value="embroidery">Bordado (Embroidery)</option>
                        <option value="patch">Patch / Emblema</option>
                        <option value="badge">Distintivo / Escudo</option>
                        <option value="pin">Pin / Broche Metálico</option>
                        <option value="other">Outro / Customizado</option>
                      </select>
                    </div>

                    {/* Anchor Region */}
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                        Posição na Roupa (Âncora)
                      </label>
                      <select
                        value={brandMarkState.anchorRegion || 'left_chest'}
                        onChange={(e) =>
                          handleUpdateBrandMarkField('anchorRegion', e.target.value as BrandMarkAnchorRegion)
                        }
                        className="w-full text-xs bg-[#05091a] border border-slate-700 rounded-lg p-2 text-slate-200 focus:border-emerald-500 focus:outline-none"
                      >
                        <option value="left_chest">Peito Esquerdo (Left Chest)</option>
                        <option value="right_chest">Peito Direito (Right Chest)</option>
                        <option value="center_chest">Centro do Peito (Center Chest)</option>
                        <option value="left_sleeve">Manga Esquerda (Left Sleeve)</option>
                        <option value="right_sleeve">Manga Direita (Right Sleeve)</option>
                        <option value="custom">Personalizado (Custom)</option>
                      </select>
                    </div>

                    {/* Custom Anchor Region (if custom selected) */}
                    {brandMarkState.anchorRegion === 'custom' && (
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                          Descrição da Posição Personalizada
                        </label>
                        <input
                          type="text"
                          value={brandMarkState.customAnchorRegion || ''}
                          onChange={(e) => handleUpdateBrandMarkField('customAnchorRegion', e.target.value)}
                          placeholder="Ex: Gola polo frontal, bolso superior esquerdo"
                          className="w-full text-xs bg-[#05091a] border border-slate-700 rounded-lg p-2 text-slate-200 focus:border-emerald-500 focus:outline-none"
                        />
                      </div>
                    )}

                    {/* Relative Scale */}
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                        Escala Relativa
                      </label>
                      <select
                        value={brandMarkState.relativeScale || 'medium'}
                        onChange={(e) => handleUpdateBrandMarkField('relativeScale', e.target.value)}
                        className="w-full text-xs bg-[#05091a] border border-slate-700 rounded-lg p-2 text-slate-200 focus:border-emerald-500 focus:outline-none"
                      >
                        <option value="small">Pequeno / Discreto (Small)</option>
                        <option value="medium">Médio / Proporcional (Medium)</option>
                        <option value="large">Grande / Destaque (Large)</option>
                      </select>
                    </div>

                    {/* Fidelity Level */}
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                        Nível de Fidelidade
                      </label>
                      <select
                        value={brandMarkState.fidelityLevel || 'standard'}
                        onChange={(e) =>
                          handleUpdateBrandMarkField('fidelityLevel', e.target.value as BrandMarkFidelityLevel)
                        }
                        className="w-full text-xs bg-[#05091a] border border-slate-700 rounded-lg p-2 text-slate-200 focus:border-emerald-500 focus:outline-none"
                      >
                        <option value="standard">Padrão (Standard)</option>
                        <option value="high">Alta (High)</option>
                        <option value="strict">Rigorosa / Estrita (Strict)</option>
                      </select>
                    </div>

                    {/* Visible Text / Wordmark (Optional) */}
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                        Texto / Letreiro Visível da Marca (Opcional)
                      </label>
                      <input
                        type="text"
                        value={brandMarkState.visibleText || ''}
                        onChange={(e) => handleUpdateBrandMarkField('visibleText', e.target.value)}
                        placeholder="Ex: NOME DA MARCA (deixe vazio se for apenas símbolo ou não puder ler)"
                        className="w-full text-xs bg-[#05091a] border border-slate-700 rounded-lg p-2 text-slate-200 focus:border-emerald-500 focus:outline-none"
                      />
                      <p className="text-[9px] text-slate-500 mt-1">
                        Regra anti-alucinação: se o texto não for perfeitamente legível na imagem, deixe em branco. O sistema não inventará letras.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Compatibility & Camera Safety Guidance */}
                <div className="bg-[#05091a] p-2.5 rounded-lg border border-slate-800 text-[11px] text-slate-300 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-emerald-400">
                    <LucideIcon name="shield-check" className="w-3.5 h-3.5" />
                    <span>Regra de Autoridade e Ancoragem:</span>
                  </div>
                  <p className="text-slate-400 text-[10px] leading-relaxed">
                    O logo permanece fixo na região definida ({getBrandMarkAnchorLabel(brandMarkState.anchorRegion, brandMarkState.customAnchorRegion)}).
                    Se a roupa mudar no Diretor Criativo, a identidade da marca permanece na região correspondente sem redesenho ou mutação.
                  </p>
                  {(brandMarkState.fidelityLevel === 'high' || brandMarkState.fidelityLevel === 'strict') && (
                    <div className="pt-1 text-[10px] text-amber-300/90 flex items-center gap-1.5 border-t border-slate-800/80 mt-1">
                      <LucideIcon name="video" className="w-3 h-3 text-amber-400 shrink-0" />
                      <span>
                        Guarda de Leitura de Câmera ativa: movimentos com foco na região marcada para evitar motion blur excessivo.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. IDENTITY PROMPT MODAL */}
      {showPromptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0a0f2c] border border-indigo-500/40 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-indigo-500/20">
              <div className="flex items-center gap-2">
                <LucideIcon name="file-text" className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Master Identity Prompt (Modo: IDENTITY_REFERENCE)
                </h3>
              </div>
              <button
                onClick={() => setShowPromptModal(false)}
                className="text-slate-400 hover:text-white transition"
              >
                <LucideIcon name="x" className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-slate-400 leading-relaxed">
                Este prompt foi gerado deterministicamente pelo{' '}
                <strong className="text-indigo-300">Visual Prompt Composer</strong> em modo{' '}
                <span className="font-mono text-emerald-300">IDENTITY_REFERENCE</span>. Ele prioriza as
                características biométricas do avatar enquanto contextualiza a pose e o figurino.
              </p>
              <div className="max-h-80 overflow-y-auto p-3.5 rounded-xl bg-[#05091a] border border-slate-800 text-xs font-mono text-slate-200 leading-relaxed select-all">
                {profile?.identityPrompt || 'Nenhum prompt disponível.'}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-slate-400">
                {profile?.identityPrompt?.length || 0} caracteres • Estrutura canônica validada
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyPrompt}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 transition"
                >
                  <LucideIcon name={copiedPrompt ? 'check' : 'copy'} className="w-4 h-4" />
                  <span>{copiedPrompt ? 'Copiado!' : 'Copiar Prompt'}</span>
                </button>
                <button
                  onClick={() => setShowPromptModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
