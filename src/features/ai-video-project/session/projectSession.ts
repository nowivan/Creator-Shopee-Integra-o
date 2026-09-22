import { SavedProjectSessionData } from '../shared/types';

const SESSION_STORAGE_KEY_PREFIX = 'ai_video_project_session_';
const LAST_ACTIVE_SESSION_KEY = 'ai_video_project_active_session_id';

// Fallback in-memory session cache for environments where sessionStorage is limited
const memorySessionStore = new Map<string, SavedProjectSessionData>();

/**
 * Saves project variation and workflow data into Project Session
 */
export function saveProjectSession(data: SavedProjectSessionData): boolean {
    if (!data || !data.projectId) {
        console.warn('[ProjectSession] Cannot save session without valid projectId');
        return false;
    }

    try {
        memorySessionStore.set(data.projectId, data);
        const storageKey = `${SESSION_STORAGE_KEY_PREFIX}${data.projectId}`;
        
        // Lightweight serialization: if productImage is an enormous string, store metadata or truncated preview in sessionStorage
        let serialized = JSON.stringify(data);
        try {
            sessionStorage.setItem(storageKey, serialized);
            sessionStorage.setItem(LAST_ACTIVE_SESSION_KEY, data.projectId);
        } catch (storageErr) {
            console.warn('[ProjectSession] sessionStorage write warning, fallback to memory cache:', storageErr);
        }
        return true;
    } catch (err) {
        console.error('[ProjectSession] Failed to save session:', err);
        return false;
    }
}

/**
 * Retrieves the saved Project Session data by projectId (or the most recent active session)
 */
export function getProjectSession(projectId?: string): SavedProjectSessionData | null {
    const targetId = projectId || (() => {
        try {
            return sessionStorage.getItem(LAST_ACTIVE_SESSION_KEY);
        } catch {
            return null;
        }
    })();

    if (!targetId) return null;

    // Check memory store first
    if (memorySessionStore.has(targetId)) {
        return memorySessionStore.get(targetId) || null;
    }

    // Check sessionStorage
    try {
        const raw = sessionStorage.getItem(`${SESSION_STORAGE_KEY_PREFIX}${targetId}`);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
                memorySessionStore.set(targetId, parsed);
                return parsed;
            }
        }
    } catch (err) {
        console.warn('[ProjectSession] Error reading project session:', err);
    }

    return null;
}

/**
 * Clears project session from memory and storage
 */
export function clearProjectSession(projectId: string): void {
    if (!projectId) return;
    memorySessionStore.delete(projectId);
    try {
        sessionStorage.removeItem(`${SESSION_STORAGE_KEY_PREFIX}${projectId}`);
        const activeId = sessionStorage.getItem(LAST_ACTIVE_SESSION_KEY);
        if (activeId === projectId) {
            sessionStorage.removeItem(LAST_ACTIVE_SESSION_KEY);
        }
    } catch (err) {
        console.warn('[ProjectSession] Error clearing session:', err);
    }
}
