/**
 * AVATAR PROFILE SERVICE — V1 FROZEN ARCHITECTURE
 * Part of Visual Reference Engine V1.0.0 (Release Candidate)
 * Responsibilities: Transforms reference images into structured AvatarReferenceProfiles and builds AvatarIdentityContext.
 * Source of Truth: AvatarReferenceProfile / AvatarIdentityContext
 * AI Budget: 1 for initial creation; 0 for profile inspection / cache hits.
 */

import {
  AvatarReferenceProfile,
  AvatarIdentityContext,
  VisualReferenceAnalysis,
  IdentityDNA,
  ScenePhotoStateDNA
} from '../types/visualReferenceTypes';
import { analyzeVisualEvidence } from './visualEvidenceAnalyzer';
import { cleanReferenceImage } from './referenceCleaner';
import { composeVisualPrompt } from './visualPromptComposer';

export interface CreateAvatarProfileOptions {
  id?: string;
  image: string; // Base64 data URL, raw base64, or image URI
  cleanReference?: boolean;
  apiKey?: string;
  analysisOverride?: VisualReferenceAnalysis;
}

export interface ReanalyzeAvatarProfileOptions {
  profile: AvatarReferenceProfile;
  image?: string; // Optional new image if replacing reference
  cleanReference?: boolean;
  apiKey?: string;
}

/**
 * Creates an AvatarReferenceProfile from an avatar reference image.
 * 
 * Pipeline:
 * 1. analyzeVisualEvidence(mode: 'IDENTITY') -> VisualReferenceAnalysis
 * 2. Extract IdentityDNA (intrinsic facial, hair, skin, traits)
 * 3. Extract ScenePhotoStateDNA (transient pose, wardrobe, lighting, camera)
 * 4. Optionally clean reference image (Reference Cleaner -> CLEAN_WHITE) if requested
 * 5. composeVisualPrompt(mode: 'IDENTITY_REFERENCE') -> identityPrompt
 * 6. Store and return the complete AvatarReferenceProfile
 */
export async function createAvatarReferenceProfile(
  options: CreateAvatarProfileOptions
): Promise<AvatarReferenceProfile> {
  const { id, image, cleanReference = false, apiKey, analysisOverride } = options;

  if (!image) {
    throw new Error('[AvatarProfileService] Image data is required to create an avatar profile.');
  }

  // 1. Analyze Visual Evidence in IDENTITY mode
  const analysis: VisualReferenceAnalysis = analysisOverride || await analyzeVisualEvidence({
    image,
    analysisMode: 'IDENTITY',
    apiKey
  });

  // 2. Extract IdentityDNA (strictly intrinsic traits)
  const identityDNA: IdentityDNA | undefined = analysis.identity || {
    visibleFacialAppearance: analysis.face?.distinguishingFeatures ? {
      status: 'VISIBLE',
      value: Array.isArray(analysis.face.distinguishingFeatures.value)
        ? analysis.face.distinguishingFeatures.value.join(', ')
        : (analysis.face.distinguishingFeatures.value as any)
    } : undefined,
    skinCharacteristics: analysis.skin?.visibleTone ? {
      status: analysis.skin.visibleTone.status,
      value: analysis.skin.visibleTone.value
    } : undefined,
    hairCharacteristics: analysis.hair?.hairstyle ? {
      status: analysis.hair.hairstyle.status,
      value: analysis.hair.hairstyle.value
    } : undefined
  };

  // 3. Extract ScenePhotoStateDNA (transient scene context: pose, wardrobe, camera, lighting, etc.)
  const sceneStateDNA: ScenePhotoStateDNA | undefined = analysis.sceneState;

  // 4. Reference Cleaner (Optional)
  let cleanedImage: string | undefined = undefined;
  if (cleanReference) {
    const cleanResult = await cleanReferenceImage({
      image,
      analysis,
      mode: 'CLEAN_WHITE',
      apiKey
    });
    cleanedImage = cleanResult.cleanedImage;
  }

  // 5. Prompt Composer in IDENTITY_REFERENCE mode
  const composedResult = composeVisualPrompt({
    analysis,
    mode: 'IDENTITY_REFERENCE'
  });
  const identityPrompt = composedResult.prompt;

  const now = Date.now();
  const profileId = id || `avatar_${now}_${Math.random().toString(36).slice(2, 8)}`;

  return {
    id: profileId,
    originalImage: image,
    cleanedImage,
    analysis,
    identityDNA,
    sceneStateDNA,
    identityPrompt,
    createdAt: now,
    updatedAt: now
  };
}

/**
 * Re-analyzes an existing avatar profile on user request.
 */
export async function reanalyzeAvatarReferenceProfile(
  options: ReanalyzeAvatarProfileOptions
): Promise<AvatarReferenceProfile> {
  const { profile, image, cleanReference, apiKey } = options;
  const targetImage = image || profile.originalImage || (profile as any).image;
  if (!targetImage) {
    throw new Error('[AvatarProfileService] Nenhuma imagem de referência disponível para reanálise.');
  }
  const shouldClean = cleanReference !== undefined ? cleanReference : !!profile.cleanedImage;

  const updatedProfile = await createAvatarReferenceProfile({
    id: profile.id,
    image: targetImage,
    cleanReference: shouldClean,
    apiKey
  });

  return {
    ...updatedProfile,
    createdAt: profile.createdAt,
    updatedAt: Date.now()
  };
}

export { buildAvatarIdentityContext } from './avatarIdentityHandoff';
