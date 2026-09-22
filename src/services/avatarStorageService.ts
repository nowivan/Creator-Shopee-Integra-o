/**
 * AVATAR STORAGE & SYNCHRONIZATION SERVICE — CREATOR PRO
 * 
 * Canonical storage management, serialization, quota-safe persistence,
 * and cross-module synchronization for Identity Hub avatars.
 * 
 * Storage Key: 'robizin_avatars'
 * Update Event: 'creatorpro:avatars-updated'
 */

import { AvatarReferenceProfile, AvatarIdentityContext, BrandMarkProfile } from '../features/visual-reference-engine/types/visualReferenceTypes';

export const ROBIZIN_AVATARS_STORAGE_KEY = 'robizin_avatars';
export const AVATARS_UPDATED_EVENT_NAME = 'creatorpro:avatars-updated';

export interface StoredAvatar {
  id: number | string;
  name: string;
  image: string;
  masterPrompt: string;
  profile?: AvatarReferenceProfile;
  brandMarkProfile?: BrandMarkProfile;
}

/**
 * Sanitizes an AvatarReferenceProfile for persistence.
 * Removes redundant/large Base64 image payloads (originalImage / cleanedImage)
 * while strictly preserving identityDNA, sceneStateDNA, visual analysis,
 * identityPrompt, and brandMarkProfile for consistency.
 */
export function sanitizeProfileForStorage(
  profile?: AvatarReferenceProfile | null
): AvatarReferenceProfile | undefined {
  if (!profile) return undefined;

  return {
    id: profile.id,
    // Clear heavy duplicated Base64 strings: the compressed preview in avatar.image is the canonical visual reference
    originalImage: '',
    cleanedImage: undefined,
    analysis: profile.analysis,
    identityDNA: profile.identityDNA,
    sceneStateDNA: profile.sceneStateDNA,
    identityPrompt: profile.identityPrompt,
    brandMarkProfile: profile.brandMarkProfile,
    createdAt: profile.createdAt || Date.now(),
    updatedAt: profile.updatedAt || Date.now()
  };
}

/**
 * Serializes a single StoredAvatar for lightweight localStorage persistence.
 * Preserves id, name, compressed preview image, masterPrompt, identity DNA,
 * brandMarkProfile, and analysis while stripping heavy duplicate Base64 payloads from profile.
 */
export function serializeAvatarForStorage(avatar: StoredAvatar): StoredAvatar {
  if (!avatar) return avatar;

  const brandMarkProfile = avatar.brandMarkProfile || avatar.profile?.brandMarkProfile;

  return {
    id: avatar.id,
    name: avatar.name || 'Avatar',
    image: avatar.image || '',
    masterPrompt: avatar.masterPrompt || (avatar.profile?.identityPrompt || ''),
    brandMarkProfile,
    profile: sanitizeProfileForStorage(
      avatar.profile ? { ...avatar.profile, brandMarkProfile } : undefined
    )
  };
}

/**
 * Serializes an array of StoredAvatars for persistence.
 */
export function serializeAvatarsForStorage(avatars: StoredAvatar[]): StoredAvatar[] {
  if (!Array.isArray(avatars)) return [];
  return avatars.map(serializeAvatarForStorage);
}

/**
 * Deserializes and normalizes a stored avatar from localStorage.
 * Ensures backward compatibility with older formats and provides
 * fallbacks for visual reference, identity prompts, and brand mark profiles.
 */
export function deserializeStoredAvatar(raw: any): StoredAvatar {
  if (!raw || typeof raw !== 'object') {
    return {
      id: Date.now(),
      name: 'Avatar',
      image: '',
      masterPrompt: ''
    };
  }

  const brandMarkProfile: BrandMarkProfile | undefined =
    raw.brandMarkProfile || raw.profile?.brandMarkProfile || undefined;

  const profile = raw.profile ? {
    ...raw.profile,
    // Ensure originalImage fallback to raw.image if originalImage was sanitized/omitted
    originalImage: raw.profile.originalImage || raw.image || '',
    cleanedImage: raw.profile.cleanedImage || undefined,
    brandMarkProfile: raw.profile.brandMarkProfile || brandMarkProfile
  } : undefined;

  return {
    id: raw.id,
    name: raw.name || 'Avatar',
    image: raw.image || raw.profile?.originalImage || '',
    masterPrompt: raw.masterPrompt || raw.profile?.identityPrompt || '',
    brandMarkProfile,
    profile
  };
}

/**
 * Reads and returns the canonical list of avatars from localStorage.
 */
export function loadCanonicalAvatars(): StoredAvatar[] {
  try {
    const raw = localStorage.getItem(ROBIZIN_AVATARS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map(deserializeStoredAvatar);
    }
    return [];
  } catch (err) {
    console.warn('[AvatarStorageService] Failed to parse canonical avatars from localStorage:', err);
    return [];
  }
}

/**
 * Dispatches the same-tab update event to notify all active Creator Pro modules.
 */
export function notifyAvatarUpdates(avatarCount?: number): void {
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(
        new CustomEvent(AVATARS_UPDATED_EVENT_NAME, {
          detail: {
            timestamp: Date.now(),
            count: avatarCount
          }
        })
      );
    } catch (e) {
      console.warn('[AvatarStorageService] Failed to dispatch avatar update event:', e);
    }
  }
}

/**
 * Persists the given array of avatars to localStorage atomically.
 * Serializes data to prevent QuotaExceededError, writes to storage,
 * and notifies all active listeners on success.
 * 
 * Returns { success: boolean, error?: string }.
 */
export function persistCanonicalAvatars(
  avatars: StoredAvatar[]
): { success: boolean; error?: string } {
  try {
    const serialized = serializeAvatarsForStorage(avatars);
    const jsonString = JSON.stringify(serialized);

    localStorage.setItem(ROBIZIN_AVATARS_STORAGE_KEY, jsonString);

    // Notify same-tab listeners
    notifyAvatarUpdates(serialized.length);

    return { success: true };
  } catch (err: any) {
    console.error('[AvatarStorageService] Failed to persist avatars to localStorage:', err);

    // If quota exceeded, try emergency compression of preview images if any are still large
    if (err?.name === 'QuotaExceededError' || err?.code === 22 || err?.code === 1014) {
      try {
        const ultraLight = avatars.map((a) => ({
          id: a.id,
          name: a.name,
          image: a.image?.length > 100000 ? a.image.substring(0, 50000) : a.image,
          masterPrompt: a.masterPrompt,
          brandMarkProfile: a.brandMarkProfile || a.profile?.brandMarkProfile,
          profile: sanitizeProfileForStorage(a.profile)
        }));
        localStorage.setItem(ROBIZIN_AVATARS_STORAGE_KEY, JSON.stringify(ultraLight));
        notifyAvatarUpdates(ultraLight.length);
        return { success: true };
      } catch (e2: any) {
        console.error('[AvatarStorageService] Emergency persistence also failed:', e2);
        return {
          success: false,
          error: 'Limite de armazenamento do navegador excedido (QuotaExceededError). Não foi possível salvar o avatar.'
        };
      }
    }

    return {
      success: false,
      error: err?.message || 'Erro desconhecido ao salvar avatares.'
    };
  }
}

/**
 * Subscribes a callback to avatar update events from:
 * 1. Same-tab custom event ('creatorpro:avatars-updated')
 * 2. Cross-tab storage event ('storage' key 'robizin_avatars')
 * 3. Window focus event ('focus')
 * 
 * Returns an unsubscribe function.
 */
export function subscribeToAvatarUpdates(
  callback: (avatars: StoredAvatar[]) => void
): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleUpdate = () => {
    try {
      const updated = loadCanonicalAvatars();
      callback(updated);
    } catch (e) {
      console.warn('[AvatarStorageService] Error during avatar update callback:', e);
    }
  };

  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === ROBIZIN_AVATARS_STORAGE_KEY) {
      handleUpdate();
    }
  };

  window.addEventListener(AVATARS_UPDATED_EVENT_NAME, handleUpdate as EventListener);
  window.addEventListener('storage', handleStorageEvent);
  window.addEventListener('focus', handleUpdate);

  return () => {
    window.removeEventListener(AVATARS_UPDATED_EVENT_NAME, handleUpdate as EventListener);
    window.removeEventListener('storage', handleStorageEvent);
    window.removeEventListener('focus', handleUpdate);
  };
}
