/**
 * IDENTITY HUB INJECTION BRIDGE — ETAPA 4B
 * Creator Intelligence Pro
 * 
 * Responsabilidade Única:
 * Conectar a identidade visual e de voz persistente do Identity Hub (AvatarReferenceProfile,
 * StoredAvatar, IdentityDNA) e os campos legados de criador da Engenharia Reversa, normalizando-os
 * para o contrato canônico IdentityInjectionContext.
 * 
 * Princípios:
 * 1. Pura, determinística, imutável e null-safe.
 * 2. Isolamento Rígido: A identidade vem EXCLUSIVAMENTE do target (Identity Hub / seleção do usuário).
 *    Nenhum traço visual (rosto, cabelo, roupas) do vídeo de referência original é copiado ou inferido.
 * 3. Prioridade Canônica: Identity Hub > Session Overrides > Legacy Creator Fields > Defaults.
 * 4. Separação de Responsabilidades:
 *    - IdentityInjectionContext define QUEM apresenta (aparência, voz base, guarda-roupa, locks).
 *    - CopyViralDNA / ViralStructureDNA definem COMO a persuasão e ritmo são estruturados.
 * 5. Suporte nativo a POV e Hands-Only.
 */

import {
  AvatarReferenceProfile,
  IdentityDNA,
  FaceDNA,
  HairDNA,
  SkinDNA,
  WardrobeDNA,
} from '../visual-reference-engine';
import {
  IdentityInjectionContext,
  VisualIdentityData,
  WardrobeData,
  VoiceDeliveryData,
  IdentityLocks,
  IdentitySourceMeta,
  PresenterVisibility,
  IdentitySourceOrigin,
} from './types';
import {
  ReverseVoiceProfile,
  VoiceGender,
  VoiceAudience,
  VoiceStyle,
  buildVoiceDescription,
  DEFAULT_VOICE_PROFILE,
} from './voiceProfile';

// ============================================================================
// CONTRATOS DE ENTRADA
// ============================================================================

export interface StoredAvatarLike {
  id: number | string;
  name: string;
  image: string;
  masterPrompt: string;
  profile?: AvatarReferenceProfile;
}

export interface LegacyCreatorFields {
  creatorGender?: 'Female' | 'Male' | 'Neutral / Not specified' | string;
  creatorAge?: 'Young Adult' | 'Adult' | 'Mature Adult' | string;
  creatorPersona?: string;
  speakingEnergy?: number;
  speakingPace?: 'Slow' | 'Normal' | 'Fast' | 'TikTok Fast' | string;
  voiceProfile?: Partial<ReverseVoiceProfile>;
}

export interface SessionIdentityOverrides {
  avatarId?: number | string;
  avatarName?: string;
  masterPrompt?: string;
  referenceImage?: string;
  cleanedReferenceImage?: string;
  gender?: string;
  persona?: string;
  speakingEnergy?: number;
  speakingPace?: string;
}

export interface BuildIdentityInjectionInput {
  storedAvatar?: StoredAvatarLike | null;
  avatarProfile?: AvatarReferenceProfile | null;
  sessionOverrides?: SessionIdentityOverrides | null;
  legacyCreatorFields?: LegacyCreatorFields | null;
  isPOVMode?: boolean;
  isHandsOnly?: boolean;
  locks?: Partial<IdentityLocks> | null;
}

// ============================================================================
// FUNÇÕES DETERMINÍSTICAS DE EXTRAÇÃO VISUAL E GUARDA-ROUPA
// ============================================================================

export function derivePresenterVisibility(options: {
  isPOVMode?: boolean;
  isHandsOnly?: boolean;
  hasAvatar?: boolean;
  hasFaceDNA?: boolean;
  framingHint?: string;
}): PresenterVisibility {
  if (options.isPOVMode) {
    return 'POV';
  }
  if (options.isHandsOnly) {
    return 'HANDS_ONLY';
  }

  const hint = (options.framingHint || '').toLowerCase();
  if (/hands|m[ãa]os|close-up m[ãa]os|primeira pessoa|pov/i.test(hint)) {
    return 'HANDS_ONLY';
  }

  if (options.hasAvatar || options.hasFaceDNA) {
    return 'UPPER_BODY';
  }

  return 'UPPER_BODY';
}

function extractVisualFromProfile(
  profile?: AvatarReferenceProfile | null,
  masterPrompt?: string,
  storedAvatar?: StoredAvatarLike | null
): { visual: VisualIdentityData; fieldOrigins: Record<string, IdentitySourceOrigin> } {
  const fieldOrigins: Record<string, IdentitySourceOrigin> = {};

  const analysis = profile?.analysis;
  const identityDNA: IdentityDNA | undefined = analysis?.identity;
  const faceDNA: FaceDNA | undefined = analysis?.face;
  const hairDNA: HairDNA | undefined = analysis?.hair;
  const skinDNA: SkinDNA | undefined = analysis?.skin;

  const hairDesc = [
    hairDNA?.color?.value,
    hairDNA?.length?.value,
    hairDNA?.texture?.value,
    hairDNA?.hairstyle?.value,
  ]
    .filter(Boolean)
    .join(', ');

  const skinDesc = [
    skinDNA?.visibleTone?.value,
    skinDNA?.surfaceTexture?.value,
  ]
    .filter(Boolean)
    .join(', ');

  const faceDesc = [
    faceDNA?.eyeAppearance?.value,
    faceDNA?.noseAppearance?.value,
    faceDNA?.mouthAppearance?.value,
  ]
    .filter(Boolean)
    .join(', ');

  const rawMasterPrompt = profile?.identityPrompt || masterPrompt || storedAvatar?.masterPrompt || undefined;
  if (rawMasterPrompt) {
    fieldOrigins['masterPrompt'] = 'IDENTITY_HUB';
  }

  const visual: VisualIdentityData = {
    avatarId: storedAvatar?.id ?? profile?.id,
    avatarName: storedAvatar?.name,
    faceDescriptors: faceDesc || undefined,
    hairDescriptors: hairDesc || undefined,
    skinDescriptors: skinDesc || undefined,
    persistentAppearancePrompt: profile?.identityPrompt || undefined,
    masterPrompt: rawMasterPrompt,
    referenceImage: profile?.originalImage || storedAvatar?.image,
    cleanedReferenceImage: profile?.cleanedImage,
    identityDNA,
    faceDNA,
    hairDNA,
    skinDNA,
  };

  return { visual, fieldOrigins };
}

function extractWardrobeFromProfile(
  profile?: AvatarReferenceProfile | null,
  wardrobeLock: boolean = true
): WardrobeData {
  const sceneState = profile?.analysis?.sceneState;
  const wardrobeDNA: WardrobeDNA | undefined = sceneState?.wardrobe;

  if (!wardrobeDNA) {
    return {
      wardrobeLock: wardrobeLock,
    };
  }

  const top = [
    wardrobeDNA.top?.color?.value,
    wardrobeDNA.top?.type?.value,
    wardrobeDNA.top?.fit?.value,
  ].filter(Boolean).join(' ');

  const bottom = [
    wardrobeDNA.bottom?.color?.value,
    wardrobeDNA.bottom?.type?.value,
  ].filter(Boolean).join(' ');

  const footwear = [
    wardrobeDNA.footwear?.color?.value,
    wardrobeDNA.footwear?.type?.value,
  ].filter(Boolean).join(' ');

  return {
    top: top || undefined,
    bottom: bottom || undefined,
    footwear: footwear || undefined,
    wardrobeLock,
    wardrobeDNA,
  };
}

// ============================================================================
// NORMALIZAÇÃO DE VOZ E LOCUÇÃO
// ============================================================================

function mapGenderToVoiceGender(genderStr?: string): VoiceGender {
  if (!genderStr) return 'auto';
  const lower = genderStr.toLowerCase();
  if (lower.includes('fem') || lower === 'female' || lower === 'mulher') return 'female';
  if (lower.includes('masc') || lower === 'male' || lower === 'homem') return 'male';
  return 'auto';
}

function mapPersonaToAudience(persona?: string): VoiceAudience {
  if (!persona) return 'tiktok_shop';
  const lower = persona.toLowerCase();
  if (lower.includes('luxury') || lower.includes('luxo')) return 'premium';
  if (lower.includes('expert') || lower.includes('authorit') || lower.includes('profissional')) return 'professional';
  if (lower.includes('beauty') || lower.includes('beleza')) return 'beauty';
  if (lower.includes('friend') || lower.includes('casual')) return 'general';
  if (lower.includes('lifestyle')) return 'fashion';
  return 'tiktok_shop';
}

function mapPersonaToStyle(persona?: string): VoiceStyle {
  if (!persona) return 'natural';
  const lower = persona.toLowerCase();
  if (lower.includes('luxury') || lower.includes('luxo')) return 'elegant';
  if (lower.includes('ugc') || lower.includes('friend')) return 'casual';
  if (lower.includes('seller') || lower.includes('tiktok')) return 'energetic';
  if (lower.includes('expert') || lower.includes('authorit')) return 'confident';
  if (lower.includes('reviewer')) return 'narrative';
  return 'natural';
}

// ============================================================================
// ADAPTERS PUROS E CONSTRUTORES DE CONTEXTO
// ============================================================================

/**
 * Normaliza os campos legados do criador (creatorGender, creatorAge, etc.)
 * para um contexto parcial sem mutação dos dados originais.
 */
export function normalizeLegacyCreatorProfile(
  creatorFields?: LegacyCreatorFields | null
): Partial<IdentityInjectionContext> {
  if (!creatorFields) return {};

  const gender = creatorFields.creatorGender;
  const ageRange = creatorFields.creatorAge;
  const persona = creatorFields.creatorPersona;
  const speakingEnergy = creatorFields.speakingEnergy ?? 70;
  const speakingPace = creatorFields.speakingPace || 'Normal';

  const voiceProfile = creatorFields.voiceProfile;
  const resolvedVoiceGender = voiceProfile?.gender || mapGenderToVoiceGender(gender);
  const resolvedVoiceAudience = voiceProfile?.audience || mapPersonaToAudience(persona);
  const resolvedVoiceStyle = voiceProfile?.style || mapPersonaToStyle(persona);

  const voiceDesc = buildVoiceDescription(
    {
      gender: resolvedVoiceGender,
      audience: resolvedVoiceAudience,
      style: resolvedVoiceStyle,
    },
    {
      detectedGender: resolvedVoiceGender === 'female' ? 'female' : resolvedVoiceGender === 'male' ? 'male' : undefined,
      ageStyle: ageRange?.toLowerCase().includes('young') ? 'young' : 'adult',
    }
  );

  return {
    visual: {
      gender,
      ageRange,
    },
    voiceDelivery: {
      gender: resolvedVoiceGender,
      audience: resolvedVoiceAudience,
      style: resolvedVoiceStyle,
      speakingEnergy,
      speakingPace,
      persona,
      voiceDescription: voiceDesc,
      profile: {
        gender: resolvedVoiceGender,
        audience: resolvedVoiceAudience,
        style: resolvedVoiceStyle,
      },
    },
    presenterVisibility: 'UPPER_BODY',
    sourceMeta: {
      primarySource: 'LEGACY_REVERSE',
      confidenceScore: 0.75,
      fieldOrigins: {
        gender: 'LEGACY_REVERSE',
        ageRange: 'LEGACY_REVERSE',
        persona: 'LEGACY_REVERSE',
        speakingEnergy: 'LEGACY_REVERSE',
        speakingPace: 'LEGACY_REVERSE',
      },
    },
  };
}

/**
 * Constrói o IdentityInjectionContext canônico consolidando as fontes de dados com prioridade estrita:
 * 1. Identity Hub (storedAvatar / avatarProfile)
 * 2. Session Overrides (seleção atual na sessão)
 * 3. Legacy Creator Fields (campos de criador do Reverse Engineering)
 * 4. Defaults seguros
 * 
 * Garante Isolamento Rígido: nenhuma característica do vídeo de referência é copiada.
 */
export function buildIdentityInjectionContext(
  input: BuildIdentityInjectionInput
): IdentityInjectionContext {
  const storedAvatar = input.storedAvatar || null;
  const avatarProfile = input.avatarProfile || storedAvatar?.profile || null;
  const session = input.sessionOverrides || null;
  const legacy = input.legacyCreatorFields || null;
  const isPOVMode = Boolean(input.isPOVMode);
  const isHandsOnly = Boolean(input.isHandsOnly);

  const fieldOrigins: Record<string, IdentitySourceOrigin> = {};

  // 1. Determinação da autoridade primária
  let primarySource: IdentitySourceMeta['primarySource'] = 'UNKNOWN';
  if (storedAvatar || avatarProfile) {
    primarySource = 'IDENTITY_HUB';
  } else if (session && (session.avatarName || session.masterPrompt || session.gender)) {
    primarySource = 'SESSION_SELECTION';
  } else if (legacy && (legacy.creatorGender || legacy.creatorPersona || legacy.speakingEnergy !== undefined)) {
    primarySource = 'LEGACY_REVERSE';
  }

  // 2. Extração Visual
  const { visual: profileVisual, fieldOrigins: visualOrigins } = extractVisualFromProfile(
    avatarProfile,
    session?.masterPrompt,
    storedAvatar
  );
  Object.assign(fieldOrigins, visualOrigins);

  const resolvedGender =
    session?.gender ||
    legacy?.creatorGender ||
    undefined;

  const resolvedAgeRange =
    legacy?.creatorAge ||
    undefined;

  const resolvedMasterPrompt =
    session?.masterPrompt ||
    profileVisual.masterPrompt ||
    storedAvatar?.masterPrompt ||
    undefined;

  if (session?.masterPrompt) {
    fieldOrigins['masterPrompt'] = 'SESSION_SELECTION';
  } else if (profileVisual.masterPrompt) {
    fieldOrigins['masterPrompt'] = 'IDENTITY_HUB';
  }

  if (resolvedGender) {
    fieldOrigins['gender'] = session?.gender
      ? 'SESSION_SELECTION'
      : legacy?.creatorGender
        ? 'LEGACY_REVERSE'
        : 'UNKNOWN';
  }

  const visual: VisualIdentityData = {
    ...profileVisual,
    avatarId: session?.avatarId ?? profileVisual.avatarId,
    avatarName: session?.avatarName ?? profileVisual.avatarName,
    gender: resolvedGender,
    ageRange: resolvedAgeRange,
    masterPrompt: resolvedMasterPrompt,
    referenceImage: session?.referenceImage ?? profileVisual.referenceImage,
    cleanedReferenceImage: session?.cleanedReferenceImage ?? profileVisual.cleanedReferenceImage,
  };

  // 3. Extração de Guarda-Roupa
  const wardrobeLock = input.locks?.wardrobeLock ?? true;
  const wardrobe: WardrobeData = extractWardrobeFromProfile(avatarProfile, wardrobeLock);

  // 4. Locução e Entrega de Voz
  const persona = session?.persona || legacy?.creatorPersona || (storedAvatar ? 'UGC Influencer Real' : undefined);
  if (persona) {
    fieldOrigins['persona'] = session?.persona
      ? 'SESSION_SELECTION'
      : legacy?.creatorPersona
        ? 'LEGACY_REVERSE'
        : 'IDENTITY_HUB';
  }

  const speakingEnergy = session?.speakingEnergy ?? legacy?.speakingEnergy ?? 70;
  const speakingPace = session?.speakingPace || legacy?.speakingPace || 'Normal';

  const userVoiceProfile = legacy?.voiceProfile;
  const voiceGender: VoiceGender = userVoiceProfile?.gender || mapGenderToVoiceGender(resolvedGender);
  const voiceAudience: VoiceAudience = userVoiceProfile?.audience || mapPersonaToAudience(persona);
  const voiceStyle: VoiceStyle = userVoiceProfile?.style || mapPersonaToStyle(persona);

  const voiceDesc = buildVoiceDescription(
    {
      gender: voiceGender,
      audience: voiceAudience,
      style: voiceStyle,
    },
    {
      detectedGender: voiceGender === 'female' ? 'female' : voiceGender === 'male' ? 'male' : undefined,
      ageStyle: resolvedAgeRange?.toLowerCase().includes('young') ? 'young' : 'adult',
    }
  );

  const voiceDelivery: VoiceDeliveryData = {
    gender: voiceGender,
    audience: voiceAudience,
    style: voiceStyle,
    speakingEnergy,
    speakingPace,
    persona,
    voiceDescription: voiceDesc,
    profile: {
      gender: voiceGender,
      audience: voiceAudience,
      style: voiceStyle,
    },
  };

  // 5. Locks de Identidade
  const locks: IdentityLocks = {
    appearanceLock: input.locks?.appearanceLock ?? Boolean(storedAvatar || avatarProfile),
    wardrobeLock: input.locks?.wardrobeLock ?? Boolean(avatarProfile?.analysis?.sceneState?.wardrobe),
    brandIdentityLock: input.locks?.brandIdentityLock ?? false,
    avatarConsistency: input.locks?.avatarConsistency ?? Boolean(storedAvatar || avatarProfile),
  };

  // 6. Visibilidade do Apresentador
  const presenterVisibility = derivePresenterVisibility({
    isPOVMode,
    isHandsOnly,
    hasAvatar: Boolean(storedAvatar || avatarProfile || session?.avatarName),
    hasFaceDNA: Boolean(visual.faceDNA || visual.identityDNA),
  });

  const sourceMeta: IdentitySourceMeta = {
    primarySource,
    confidenceScore: primarySource === 'IDENTITY_HUB' ? 0.95 : primarySource === 'SESSION_SELECTION' ? 0.85 : 0.7,
    fieldOrigins,
  };

  return {
    visual,
    wardrobe,
    voiceDelivery,
    locks,
    presenterVisibility,
    sourceMeta,
    isPOVMode: isPOVMode || undefined,
    isHandsOnly: isHandsOnly || undefined,
    rawProfile: avatarProfile || undefined,
    rawStoredAvatar: storedAvatar || undefined,
  };
}
