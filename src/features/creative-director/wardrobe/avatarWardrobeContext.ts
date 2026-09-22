/**
 * AVATAR WARDROBE CONTEXT & PERSISTENCE HELPER
 * Canonical extraction and synchronization of Identity Hub Avatar identity & wardrobe
 * for Creative Director Scene 2 and Scene 3.
 */

import {
  StoredAvatar,
  loadCanonicalAvatars,
  persistCanonicalAvatars
} from '../../../services/avatarStorageService';
import {
  AvatarIdentityContext,
  AvatarReferenceProfile
} from '../../visual-reference-engine/types/visualReferenceTypes';
import {
  resolveAvatarIdentityContext
} from '../../visual-reference-engine/services/avatarIdentityHandoff';
import {
  DetectedWardrobeProfile,
  WardrobeFieldOrigins
} from './wardrobeVisionExtractor';

export interface AvatarExtractedData {
  avatarId: number | string;
  avatarName: string;
  avatarImage: string;
  gender: 'female' | 'male';
  presenterIdentity: string;
  topType?: string;
  topStyle?: string;
  topColor?: string;
  bottomType?: string;
  bottomColor?: string;
  footwearType?: string;
  footwearColor?: string;
  wardrobeDescription?: string;
  accessories?: string[];
  hasWardrobe: boolean;
  identityContext: AvatarIdentityContext | null;
  rawProfile?: AvatarReferenceProfile | null;
}

/**
 * Extracts and synthesizes all available identity and wardrobe information
 * from a StoredAvatar into a clean, unified AvatarExtractedData object.
 */
export function extractAvatarFullContext(avatar?: StoredAvatar | null): AvatarExtractedData | null {
  if (!avatar) return null;

  const rawProfile = avatar.profile || null;
  const avatarId = avatar.id;
  const avatarName = (avatar.name || 'Avatar').trim();
  const avatarImage = avatar.image || (rawProfile as any)?.originalImage || '';

  // 1. Detect Gender
  let gender: 'female' | 'male' = 'female';
  const explicitGender = (avatar as any).gender || (rawProfile as any)?.presenterGender || (rawProfile as any)?.gender;
  if (explicitGender === 'male' || explicitGender === 'female') {
    gender = explicitGender;
  } else {
    const textToScan = [
      avatar.name,
      avatar.masterPrompt,
      rawProfile?.identityPrompt,
      (rawProfile as any)?.visualDescription,
      rawProfile?.analysis?.identity?.visibleFacialAppearance?.value,
      rawProfile?.analysis?.subject?.type?.value
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    if (/\b(homem|masculino|garoto|male|man|boy|senhor|rapaz|gentleman)\b/i.test(textToScan)) {
      gender = 'male';
    } else if (/\b(mulher|feminino|garota|female|woman|girl|senhora|moça|lady)\b/i.test(textToScan)) {
      gender = 'female';
    }
  }

  // 2. Presenter Identity / Neutral Visual Description
  const rawIdentity =
    rawProfile?.identityPrompt ||
    avatar.masterPrompt ||
    (rawProfile as any)?.visualDescription ||
    (avatar as any).visualDescription ||
    rawProfile?.analysis?.identity?.visibleFacialAppearance?.value ||
    '';

  const presenterIdentity = rawIdentity.trim()
    ? rawIdentity.trim()
    : `Adult Brazilian ${gender === 'female' ? 'woman' : 'man'} with natural UGC presence`;

  // 3. Extract Saved Wardrobe (from detectedWardrobe, profile.wardrobe, analysis.sceneState.wardrobe, or clothing)
  const savedDetected: DetectedWardrobeProfile | undefined =
    (rawProfile as any)?.detectedWardrobe ||
    (avatar as any).detectedWardrobe ||
    (rawProfile as any)?.wardrobeProfile;

  const sceneStateWardrobe = rawProfile?.analysis?.sceneState?.wardrobe || rawProfile?.sceneStateDNA?.wardrobe;
  const explicitWardrobeObj = (rawProfile as any)?.wardrobe || (avatar as any).wardrobe;

  const topType =
    savedDetected?.topType ||
    (typeof explicitWardrobeObj === 'object' ? explicitWardrobeObj?.topType || explicitWardrobeObj?.top : undefined) ||
    sceneStateWardrobe?.top?.type?.value ||
    undefined;

  const topColor =
    savedDetected?.topColor ||
    (typeof explicitWardrobeObj === 'object' ? explicitWardrobeObj?.topColor : undefined) ||
    sceneStateWardrobe?.top?.color?.value ||
    undefined;

  const topStyle =
    savedDetected?.topStyle ||
    (typeof explicitWardrobeObj === 'object' ? explicitWardrobeObj?.topStyle : undefined) ||
    sceneStateWardrobe?.top?.fit?.value ||
    sceneStateWardrobe?.top?.neckline?.value ||
    undefined;

  const bottomType =
    savedDetected?.bottomType ||
    (typeof explicitWardrobeObj === 'object' ? explicitWardrobeObj?.bottomType || explicitWardrobeObj?.bottom : undefined) ||
    sceneStateWardrobe?.bottom?.type?.value ||
    undefined;

  const bottomColor =
    savedDetected?.bottomColor ||
    (typeof explicitWardrobeObj === 'object' ? explicitWardrobeObj?.bottomColor : undefined) ||
    sceneStateWardrobe?.bottom?.color?.value ||
    undefined;

  const footwearType =
    savedDetected?.footwearType ||
    (typeof explicitWardrobeObj === 'object' ? explicitWardrobeObj?.footwearType || explicitWardrobeObj?.footwear : undefined) ||
    sceneStateWardrobe?.footwear?.type?.value ||
    undefined;

  const footwearColor =
    savedDetected?.footwearColor ||
    (typeof explicitWardrobeObj === 'object' ? explicitWardrobeObj?.footwearColor : undefined) ||
    sceneStateWardrobe?.footwear?.color?.value ||
    undefined;

  const accessories =
    savedDetected?.accessories ||
    (typeof explicitWardrobeObj === 'object' && Array.isArray(explicitWardrobeObj?.accessories) ? explicitWardrobeObj.accessories : undefined) ||
    undefined;

  // Synthesize or retrieve wardrobe description
  let wardrobeDescription: string | undefined = undefined;
  if (typeof explicitWardrobeObj === 'string' && explicitWardrobeObj.trim().length > 0) {
    wardrobeDescription = explicitWardrobeObj.trim();
  } else if (typeof explicitWardrobeObj === 'object' && typeof explicitWardrobeObj?.description === 'string' && explicitWardrobeObj.description.trim()) {
    wardrobeDescription = explicitWardrobeObj.description.trim();
  } else if (topType || bottomType) {
    const parts: string[] = [];
    if (topType) {
      parts.push(`${topColor ? topColor + ' ' : ''}${topType}${topStyle ? ` (${topStyle})` : ''}`);
    }
    if (bottomType) {
      parts.push(`${bottomColor ? bottomColor + ' ' : ''}${bottomType}`);
    }
    if (footwearType) {
      parts.push(`${footwearColor ? footwearColor + ' ' : ''}${footwearType}`);
    }
    wardrobeDescription = parts.join(' and ');
  }

  const hasWardrobe = Boolean(
    (topType && topType.trim().length > 0) ||
    (bottomType && bottomType.trim().length > 0) ||
    (wardrobeDescription && wardrobeDescription.trim().length > 0)
  );

  // 4. Resolve Avatar Identity Context
  const identityContext = resolveAvatarIdentityContext(avatar);

  return {
    avatarId,
    avatarName,
    avatarImage,
    gender,
    presenterIdentity,
    topType: topType?.trim(),
    topStyle: topStyle?.trim(),
    topColor: topColor?.trim(),
    bottomType: bottomType?.trim(),
    bottomColor: bottomColor?.trim(),
    footwearType: footwearType?.trim(),
    footwearColor: footwearColor?.trim(),
    wardrobeDescription: wardrobeDescription?.trim(),
    accessories,
    hasWardrobe,
    identityContext,
    rawProfile
  };
}

/**
 * Saves extracted wardrobe profile back to the canonical avatar in robizin_avatars
 * so subsequent selections load it instantaneously with zero latency or re-analysis.
 */
export function saveExtractedWardrobeToCanonicalAvatar(
  avatarId: number | string,
  detected: DetectedWardrobeProfile
): StoredAvatar | null {
  const avatars = loadCanonicalAvatars();
  const index = avatars.findIndex(a => String(a.id) === String(avatarId));
  if (index === -1) return null;

  const target = avatars[index];
  const updatedProfile: AvatarReferenceProfile = target.profile
    ? {
        ...target.profile,
        updatedAt: Date.now()
      }
    : {
        id: String(target.id),
        originalImage: target.image || '',
        analysis: {},
        identityPrompt: target.masterPrompt || '',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

  (updatedProfile as any).detectedWardrobe = detected;
  (updatedProfile as any).wardrobe = {
    topType: detected.topType,
    topColor: detected.topColor,
    topStyle: detected.topStyle,
    bottomType: detected.bottomType,
    bottomColor: detected.bottomColor,
    footwearType: detected.footwearType,
    footwearColor: detected.footwearColor,
    accessories: detected.accessories,
    description: detected.presenterDescription || undefined
  };

  const updatedAvatar: StoredAvatar = {
    ...target,
    profile: updatedProfile,
    ...(detected.presenterGender && (detected.presenterGender === 'female' || detected.presenterGender === 'male')
      ? { gender: detected.presenterGender }
      : {})
  };

  const updatedList = [...avatars];
  updatedList[index] = updatedAvatar;
  persistCanonicalAvatars(updatedList);

  return updatedAvatar;
}

/**
 * Constructs field origins based on whether fields were derived from an avatar or defaults.
 */
export function buildAvatarFieldOrigins(extracted: AvatarExtractedData | null): WardrobeFieldOrigins {
  if (!extracted) {
    return {
      presenterGender: 'default',
      topType: 'default',
      topColor: 'default',
      topStyle: 'default',
      bottomType: 'default',
      bottomColor: 'default',
      footwearType: 'default',
      footwearColor: 'default',
      presenterDescription: 'default'
    };
  }

  return {
    presenterGender: extracted.gender ? 'avatar_extraction' : 'default',
    topType: extracted.topType ? 'avatar_extraction' : 'default',
    topColor: extracted.topColor ? 'avatar_extraction' : 'default',
    topStyle: extracted.topStyle ? 'avatar_extraction' : 'default',
    bottomType: extracted.bottomType ? 'avatar_extraction' : 'default',
    bottomColor: extracted.bottomColor ? 'avatar_extraction' : 'default',
    footwearType: extracted.footwearType ? 'avatar_extraction' : 'default',
    footwearColor: extracted.footwearColor ? 'avatar_extraction' : 'default',
    presenterDescription: extracted.presenterIdentity ? 'avatar_extraction' : 'default'
  };
}
