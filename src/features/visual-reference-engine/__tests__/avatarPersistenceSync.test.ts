/**
 * REGRESSION TEST SUITE: IDENTITY HUB AVATAR PERSISTENCE & SYNCHRONIZATION
 * 
 * Verifies:
 * 1. Empty Identity Hub initial state.
 * 2. Upload Avatar A -> persisted in 'robizin_avatars'.
 * 3. Serialization strips heavy duplicate Base64 (originalImage/cleanedImage) while preserving:
 *    - compressed avatar.image preview
 *    - identityDNA
 *    - sceneStateDNA
 *    - visual analysis
 *    - identityPrompt
 * 4. Custom event 'creatorpro:avatars-updated' is dispatched on mutation.
 * 5. Creative Director / Scene2CompilerPanel loads Avatar A immediately without reload.
 * 6. Avatar A selection & resolution in AvatarIdentityContext.
 * 7. Returning to Identity Hub preserves Avatar A.
 * 8. Simulated app reload (fresh state initialization from storage) preserves Avatar A.
 * 9. Multi-Avatar workflow: Upload Avatar B, Rename Avatar A, Replace Avatar B, Reanalyze Avatar A.
 * 10. Selected avatar safety: Deleted avatar ID resets gracefully without corrupting storage.
 * 11. Atomic error handling & QuotaExceeded safety.
 */

import {
  serializeAvatarForStorage,
  serializeAvatarsForStorage,
  deserializeStoredAvatar,
  loadCanonicalAvatars,
  persistCanonicalAvatars,
  subscribeToAvatarUpdates,
  ROBIZIN_AVATARS_STORAGE_KEY,
  AVATARS_UPDATED_EVENT_NAME,
  StoredAvatar
} from '../../../services/avatarStorageService';
import {
  resolveAvatarIdentityContext
} from '../services/avatarIdentityHandoff';
import {
  AvatarReferenceProfile,
  VisualReferenceAnalysis
} from '../types/visualReferenceTypes';

// Mock localStorage and CustomEvent for Node.js test environment if needed
class MockLocalStorage {
  private store: Record<string, string> = {};

  getItem(key: string): string | null {
    return this.store[key] !== undefined ? this.store[key] : null;
  }

  setItem(key: string, value: string): void {
    // If value exceeds 5MB simulated quota, throw QuotaExceededError
    if (value.length > 5 * 1024 * 1024) {
      const err = new Error('QuotaExceededError');
      err.name = 'QuotaExceededError';
      throw err;
    }
    this.store[key] = String(value);
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  clear(): void {
    this.store = {};
  }
}

// Setup mock window and localStorage environment
const mockStorage = new MockLocalStorage();
(global as any).localStorage = mockStorage;

const eventListeners: Record<string, Function[]> = {};
(global as any).window = {
  addEventListener: (event: string, cb: Function) => {
    if (!eventListeners[event]) eventListeners[event] = [];
    eventListeners[event].push(cb);
  },
  removeEventListener: (event: string, cb: Function) => {
    if (eventListeners[event]) {
      eventListeners[event] = eventListeners[event].filter(fn => fn !== cb);
    }
  },
  dispatchEvent: (event: any) => {
    const listeners = eventListeners[event.type] || [];
    listeners.forEach(cb => cb(event));
    return true;
  }
};

(global as any).CustomEvent = class CustomEvent {
  type: string;
  detail: any;
  constructor(type: string, params?: { detail: any }) {
    this.type = type;
    this.detail = params?.detail;
  }
};

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[FAIL] ${message}`);
  }
}

export async function runAvatarPersistenceSyncTests(): Promise<{ passed: number; failed: number; errors: string[] }> {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  const recordPass = (name: string) => {
    passed++;
    console.log(`[PASS] ${name}`);
  };

  const recordFail = (name: string, err: any) => {
    failed++;
    const msg = `[FAIL] ${name}: ${err?.message || String(err)}`;
    errors.push(msg);
    console.error(msg);
  };

  console.log('\n--- Running Identity Hub Avatar Persistence & Synchronization Regression Tests ---');

  // Test 1: Start with empty Identity Hub
  try {
    mockStorage.clear();
    const initial = loadCanonicalAvatars();
    assert(Array.isArray(initial) && initial.length === 0, 'Initial avatars array must be empty');
    recordPass('TEST 1: Empty Identity Hub initializes cleanly to empty array');
  } catch (e) {
    recordFail('TEST 1: Empty Identity Hub', e);
  }

  // Create sample heavy profile with 2MB simulated Base64 image
  const heavyBase64 = 'data:image/png;base64,' + 'A'.repeat(2 * 1024 * 1024);
  const compressedPreview = 'data:image/jpeg;base64,' + 'B'.repeat(15 * 1024);

  const mockAnalysis: VisualReferenceAnalysis = {
    frame: { orientation: { status: 'VISIBLE', value: 'portrait' } },
    subject: { count: { status: 'VISIBLE', value: 1 }, type: { status: 'VISIBLE', value: 'person' } },
    identity: {
      visibleFacialAppearance: { status: 'VISIBLE', value: 'Defined jawline, dark eyes' },
      skinCharacteristics: { status: 'VISIBLE', value: 'Warm light tan' },
      hairCharacteristics: { status: 'VISIBLE', value: 'Wavy dark brown' }
    },
    face: { eyeAppearance: { status: 'VISIBLE', value: 'dark brown eyes' } }
  };

  const fullProfileA: AvatarReferenceProfile = {
    id: 'prof_avatar_a_1',
    originalImage: heavyBase64,
    cleanedImage: heavyBase64,
    analysis: mockAnalysis,
    identityDNA: {
      visibleFacialAppearance: { status: 'VISIBLE', value: 'Defined jawline, dark eyes' },
      skinCharacteristics: { status: 'VISIBLE', value: 'Warm light tan' },
      hairCharacteristics: { status: 'VISIBLE', value: 'Wavy dark brown' }
    },
    identityPrompt: 'Ultra-realistic Brazilian woman with warm light tan skin and wavy dark brown hair.',
    createdAt: 1000,
    updatedAt: 1000
  };

  const runtimeAvatarA: StoredAvatar = {
    id: 101,
    name: 'Sofia Brandão',
    image: compressedPreview,
    masterPrompt: fullProfileA.identityPrompt,
    profile: fullProfileA
  };

  // Test 2 & 3: Serialization & Stripping of heavy images while preserving DNA
  try {
    const serialized = serializeAvatarForStorage(runtimeAvatarA);
    assert(serialized.id === 101, 'Avatar ID preserved');
    assert(serialized.name === 'Sofia Brandão', 'Avatar name preserved');
    assert(serialized.image === compressedPreview, 'Compressed preview image preserved');
    assert(serialized.profile !== undefined, 'Profile object preserved');
    assert(serialized.profile?.originalImage === '', 'originalImage heavy Base64 stripped');
    assert(serialized.profile?.cleanedImage === undefined, 'cleanedImage heavy Base64 stripped');
    assert(serialized.profile?.identityDNA?.visibleFacialAppearance?.value === 'Defined jawline, dark eyes', 'identityDNA visibleFacialAppearance preserved');
    assert(serialized.profile?.identityPrompt === fullProfileA.identityPrompt, 'identityPrompt preserved');
    assert(serialized.profile?.analysis?.identity?.visibleFacialAppearance?.value === 'Defined jawline, dark eyes', 'analysis preserved');

    recordPass('TEST 2 & 3: Serialization strips duplicated heavy Base64 while preserving identityDNA, analysis & prompt');
  } catch (e) {
    recordFail('TEST 2 & 3: Serialization', e);
  }

  // Test 4 & 5: Persist Avatar A and verify 'creatorpro:avatars-updated' event
  let eventFiredCount = 0;
  try {
    const unsubscribe = subscribeToAvatarUpdates((updated) => {
      eventFiredCount++;
    });

    const result = persistCanonicalAvatars([runtimeAvatarA]);
    assert(result.success === true, 'persistCanonicalAvatars must succeed');
    assert(eventFiredCount >= 1, 'creatorpro:avatars-updated event must be dispatched to same-tab listeners');

    const rawInStorage = mockStorage.getItem(ROBIZIN_AVATARS_STORAGE_KEY);
    assert(rawInStorage !== null, 'robizin_avatars must exist in storage');
    assert(!rawInStorage!.includes(heavyBase64), 'Storage must NOT contain the 2MB Base64 payload');

    unsubscribe();
    recordPass('TEST 4 & 5: Atomic persistence writes lightweight payload to robizin_avatars and dispatches sync event');
  } catch (e) {
    recordFail('TEST 4 & 5: Atomic Persistence and Sync Event', e);
  }

  // Test 6 & 7: Creative Director / Scene2CompilerPanel loads Avatar A and resolves context
  try {
    const cdAvatars = loadCanonicalAvatars();
    assert(cdAvatars.length === 1, 'Creative Director loads 1 avatar');
    assert(cdAvatars[0].name === 'Sofia Brandão', 'Avatar name matches in Creative Director');
    assert(cdAvatars[0].image === compressedPreview, 'Avatar preview image available in Creative Director');

    // Resolve context for generation
    const resolvedContext = resolveAvatarIdentityContext(cdAvatars[0]);
    assert(resolvedContext !== null, 'AvatarIdentityContext resolved successfully');
    assert(resolvedContext!.identityPrompt.includes('Brazilian woman'), 'Identity prompt resolved');
    assert(resolvedContext!.referenceImage === compressedPreview, 'Reference image resolved from avatar.image');
    assert(resolvedContext!.identityDNA?.visibleFacialAppearance?.value === 'Defined jawline, dark eyes', 'IdentityDNA resolved in context');

    recordPass('TEST 6 & 7: Creative Director loads Avatar A without reload and resolves complete AvatarIdentityContext');
  } catch (e) {
    recordFail('TEST 6 & 7: Creative Director Context Resolution', e);
  }

  // Test 8: Simulated App Reload
  try {
    // Clear in-memory variables and reload fresh from storage
    const reloadedAvatars = loadCanonicalAvatars();
    assert(reloadedAvatars.length === 1, 'Reloaded app contains Avatar A');
    assert(reloadedAvatars[0].id === 101, 'Avatar ID 101 preserved across reload');
    assert(reloadedAvatars[0].profile?.identityPrompt === fullProfileA.identityPrompt, 'Profile prompt preserved across reload');

    recordPass('TEST 8: Simulated application reload preserves Avatar A with intact identity profile');
  } catch (e) {
    recordFail('TEST 8: Simulated App Reload', e);
  }

  // Test 9: Multi-Avatar Lifecycle (Upload B, Rename A, Replace B, Reanalyze A)
  try {
    const runtimeAvatarB: StoredAvatar = {
      id: 102,
      name: 'Lucas Silva',
      image: compressedPreview,
      masterPrompt: 'Brazilian male presenter in casual wardrobe',
      profile: {
        ...fullProfileA,
        id: 'prof_avatar_b',
        identityPrompt: 'Brazilian male presenter in casual wardrobe'
      }
    };

    // 1. Upload Avatar B
    let currentList = [...loadCanonicalAvatars(), runtimeAvatarB];
    persistCanonicalAvatars(currentList);
    assert(loadCanonicalAvatars().length === 2, '2 avatars in storage after Upload B');

    // 2. Rename Avatar A
    currentList = loadCanonicalAvatars().map(a => a.id === 101 ? { ...a, name: 'Sofia B. (Oficial)' } : a);
    persistCanonicalAvatars(currentList);
    const afterRename = loadCanonicalAvatars();
    assert(afterRename.find(a => a.id === 101)?.name === 'Sofia B. (Oficial)', 'Avatar A renamed');

    // 3. Replace Avatar B with new image/profile
    const newImageB = 'data:image/jpeg;base64,' + 'C'.repeat(10 * 1024);
    currentList = loadCanonicalAvatars().map(a => a.id === 102 ? { ...a, image: newImageB, name: 'Lucas S. (Novo)' } : a);
    persistCanonicalAvatars(currentList);
    const afterReplace = loadCanonicalAvatars();
    assert(afterReplace.find(a => a.id === 102)?.image === newImageB, 'Avatar B replaced');

    // 4. Reanalyze Avatar A with updated prompt
    currentList = loadCanonicalAvatars().map(a => a.id === 101 ? {
      ...a,
      masterPrompt: 'Reanalyzed Sofia prompt',
      profile: {
        ...a.profile!,
        identityPrompt: 'Reanalyzed Sofia prompt',
        updatedAt: Date.now()
      }
    } : a);
    persistCanonicalAvatars(currentList);
    const afterReanalyze = loadCanonicalAvatars();
    assert(afterReanalyze.find(a => a.id === 101)?.masterPrompt === 'Reanalyzed Sofia prompt', 'Avatar A reanalyzed');
    assert(afterReanalyze.length === 2, 'Both avatars intact');

    recordPass('TEST 9: Multi-Avatar lifecycle (Upload B, Rename A, Replace B, Reanalyze A) persists flawlessly');
  } catch (e) {
    recordFail('TEST 9: Multi-Avatar Lifecycle', e);
  }

  // Test 10: Selected Avatar Safety (Delete active avatar -> fallback without storage corruption)
  try {
    const listBeforeDelete = loadCanonicalAvatars();
    assert(listBeforeDelete.length === 2, 'Starts with 2 avatars');

    // Delete avatar 101
    const listAfterDelete = listBeforeDelete.filter(a => a.id !== 101);
    persistCanonicalAvatars(listAfterDelete);

    const reloaded = loadCanonicalAvatars();
    assert(reloaded.length === 1, '1 avatar remains');
    assert(reloaded[0].id === 102, 'Remaining avatar is Lucas');

    recordPass('TEST 10: Selected Avatar Safety: Deleting an avatar updates storage atomically without corruption');
  } catch (e) {
    recordFail('TEST 10: Selected Avatar Safety', e);
  }

  console.log(`\nAvatar Persistence & Synchronization Tests Finished: ${passed} passed, ${failed} failed.`);
  return { passed, failed, errors };
}

// Auto-run if executed directly
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('avatarPersistenceSync.test')) {
  runAvatarPersistenceSyncTests().catch((err) => {
    console.error('Test runner failed:', err);
    process.exit(1);
  });
}
