export type VoiceGender = 'auto' | 'female' | 'male';

export type VoiceAudience =
  | 'general'
  | 'tiktok_shop'
  | 'christian'
  | 'gaming'
  | 'beauty'
  | 'fashion'
  | 'technology'
  | 'fitness'
  | 'home'
  | 'automotive'
  | 'professional'
  | 'premium';

export type VoiceStyle =
  | 'natural'
  | 'warm'
  | 'confident'
  | 'energetic'
  | 'casual'
  | 'elegant'
  | 'calm'
  | 'enthusiastic'
  | 'narrative';

export interface ReverseVoiceProfile {
  gender: VoiceGender;
  audience: VoiceAudience;
  style: VoiceStyle;
}

export const DEFAULT_VOICE_PROFILE: ReverseVoiceProfile = {
  gender: 'auto',
  audience: 'tiktok_shop',
  style: 'natural',
};

export const VOICE_GENDER_OPTIONS: { value: VoiceGender; label: string }[] = [
  { value: 'auto', label: 'Automática' },
  { value: 'female', label: 'Feminina' },
  { value: 'male', label: 'Masculina' },
];

export const VOICE_AUDIENCE_OPTIONS: { value: VoiceAudience; label: string }[] = [
  { value: 'general', label: 'Geral' },
  { value: 'tiktok_shop', label: 'TikTok Shop' },
  { value: 'christian', label: 'Cristão' },
  { value: 'gaming', label: 'Gamer' },
  { value: 'beauty', label: 'Beleza' },
  { value: 'fashion', label: 'Moda' },
  { value: 'technology', label: 'Tecnologia' },
  { value: 'fitness', label: 'Fitness' },
  { value: 'home', label: 'Casa & Decoração' },
  { value: 'automotive', label: 'Automotivo' },
  { value: 'professional', label: 'Profissional' },
  { value: 'premium', label: 'Luxo / Premium' },
];

export const VOICE_STYLE_OPTIONS: { value: VoiceStyle; label: string }[] = [
  { value: 'natural', label: 'Natural' },
  { value: 'warm', label: 'Acolhedor' },
  { value: 'confident', label: 'Confiante' },
  { value: 'energetic', label: 'Energético' },
  { value: 'casual', label: 'Descontraído' },
  { value: 'elegant', label: 'Elegante' },
  { value: 'calm', label: 'Calmo' },
  { value: 'enthusiastic', label: 'Entusiasmado' },
  { value: 'narrative', label: 'Narrativo' },
];

/**
 * Builds a deterministic voice description in Portuguese based on the Voice Profile.
 */
export function buildVoiceDescription(
  profile?: Partial<ReverseVoiceProfile>,
  context?: {
    detectedGender?: 'female' | 'male';
    ageStyle?: 'young' | 'adult';
  }
): string {
  const genderOption = profile?.gender || DEFAULT_VOICE_PROFILE.gender;
  const audienceOption = profile?.audience || DEFAULT_VOICE_PROFILE.audience;
  const styleOption = profile?.style || DEFAULT_VOICE_PROFILE.style;

  // 1. Resolve Gender
  let resolvedGender: 'female' | 'male' | 'neutral' = 'neutral';
  if (genderOption === 'female') {
    resolvedGender = 'female';
  } else if (genderOption === 'male') {
    resolvedGender = 'male';
  } else if (genderOption === 'auto') {
    if (context?.detectedGender === 'female') {
      resolvedGender = 'female';
    } else if (context?.detectedGender === 'male') {
      resolvedGender = 'male';
    } else {
      resolvedGender = 'neutral';
    }
  }

  // 2. Resolve Subject Noun
  let subjectNoun = 'A pessoa';
  if (resolvedGender === 'female') {
    if (context?.ageStyle === 'adult') {
      subjectNoun = 'Essa mulher';
    } else if (context?.ageStyle === 'young') {
      subjectNoun = 'Essa jovem';
    } else {
      subjectNoun = ['tiktok_shop', 'gaming', 'beauty', 'fashion'].includes(audienceOption)
        ? 'Essa jovem'
        : 'Essa mulher';
    }
  } else if (resolvedGender === 'male') {
    if (context?.ageStyle === 'adult') {
      subjectNoun = 'Esse homem';
    } else if (context?.ageStyle === 'young') {
      subjectNoun = 'Esse jovem';
    } else {
      subjectNoun = ['tiktok_shop', 'gaming', 'technology', 'automotive'].includes(audienceOption)
        ? 'Esse jovem'
        : 'Esse homem';
    }
  }

  // 3. Resolve Style Description (modifying "voz" -> feminine in Portuguese)
  let styleDesc = 'natural';

  switch (styleOption) {
    case 'warm':
      styleDesc = 'natural, acolhedora e serena';
      break;
    case 'confident':
      styleDesc = 'segura, clara e objetiva';
      break;
    case 'energetic':
      styleDesc = 'natural, energética e descontraída';
      break;
    case 'casual':
      styleDesc = 'descontraída e natural';
      break;
    case 'elegant':
      styleDesc = 'elegante, segura e natural';
      break;
    case 'calm':
      styleDesc = 'calma e controlada';
      break;
    case 'enthusiastic':
      styleDesc = 'entusiasmada e expressiva';
      break;
    case 'narrative':
      styleDesc = 'narrativa e envolvente';
      break;
    case 'natural':
    default:
      styleDesc = 'natural';
      break;
  }

  // 4. Resolve Audience / Creator Noun & Suffix
  if (audienceOption === 'tiktok_shop') {
    let creatorNoun = 'de criador de TikTok Shop';
    if (resolvedGender === 'female') {
      creatorNoun = 'de influenciadora de TikTok Shop';
    } else if (resolvedGender === 'male') {
      creatorNoun = 'de influenciador de TikTok Shop';
    }
    return `${subjectNoun} fala com voz ${styleDesc} ${creatorNoun} em português brasileiro.`;
  }

  let audienceSuffix = '';
  switch (audienceOption) {
    case 'gaming':
      if (styleOption === 'energetic') {
        audienceSuffix = ', com ritmo ágil e comunicação adequada ao público gamer.';
      } else {
        audienceSuffix = ', com comunicação descontraída, dinâmica e envolvente, adequada ao público gamer.';
      }
      break;
    case 'christian':
      if (styleOption === 'warm') {
        audienceSuffix = ', com comunicação respeitosa e próxima, adequada ao público cristão.';
      } else {
        audienceSuffix = ', adequada ao público cristão.';
      }
      break;
    case 'technology':
      if (styleOption === 'confident') {
        audienceSuffix = ', adequada a conteúdos de tecnologia.';
      } else {
        audienceSuffix = ', com comunicação clara, objetiva e confiável, adequada a conteúdos de tecnologia.';
      }
      break;
    case 'premium':
      if (styleOption === 'elegant') {
        audienceSuffix = ', com ritmo controlado e comunicação sofisticada.';
      } else {
        audienceSuffix = ', com comunicação refinada, elegante e controlada.';
      }
      break;
    case 'beauty':
      audienceSuffix = ', com comunicação leve, próxima e confiante, adequada a conteúdos de beleza.';
      break;
    case 'fashion':
      audienceSuffix = ', com comunicação moderna, natural e segura, adequada a conteúdos de moda.';
      break;
    case 'fitness':
      audienceSuffix = ', com comunicação motivadora, direta e energética, adequada a conteúdos de fitness.';
      break;
    case 'home':
      audienceSuffix = ', com comunicação prática, amigável e natural, adequada a conteúdos de casa e decoração.';
      break;
    case 'automotive':
      audienceSuffix = ', com comunicação segura, direta e entusiasmada, adequada a conteúdos automotivos.';
      break;
    case 'professional':
      audienceSuffix = ', com comunicação clara, segura e profissional, adequada a conteúdos profissionais.';
      break;
    case 'general':
    default:
      audienceSuffix = ', com comunicação natural e acessível.';
      break;
  }

  return `${subjectNoun} fala com voz ${styleDesc} em português brasileiro${audienceSuffix}`;
}
