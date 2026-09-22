import { PromptVaultItem } from './types';
import { DEFAULT_PROMPT_VAULT_ITEMS } from './promptVaultDefaults';
import { validateAndNormalizeVaultUrl } from './promptVaultUtils';

export const PROMPT_VAULT_STORAGE_KEY = 'creator_pro_prompt_link_vault';

/**
 * Loads all Prompt Vault items safely from localStorage.
 * - Falls back to DEFAULT_PROMPT_VAULT_ITEMS on first run
 * - Falls back to [] on corrupted JSON
 * - Prevents app crashes
 * - Cleanses non-string or dangerous fields
 */
export function loadPromptVaultItems(): PromptVaultItem[] {
  if (typeof window === 'undefined' || !window.localStorage) {
    return DEFAULT_PROMPT_VAULT_ITEMS;
  }

  try {
    const raw = localStorage.getItem(PROMPT_VAULT_STORAGE_KEY);
    if (!raw) {
      // First run: save defaults and return
      savePromptVaultItems(DEFAULT_PROMPT_VAULT_ITEMS);
      return DEFAULT_PROMPT_VAULT_ITEMS;
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      console.warn('[PromptVault] Storage contained non-array data, resetting to []');
      return [];
    }

    // Sanitize items ensuring required fields exist
    return parsed.map((item: any): PromptVaultItem => {
      const type = item.type === 'link' ? 'link' : 'prompt';
      const tags = Array.isArray(item.tags)
        ? item.tags.filter((t: any) => typeof t === 'string').map((t: string) => t.trim())
        : [];

      return {
        id: typeof item.id === 'string' && item.id ? item.id : `vault-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type,
        title: typeof item.title === 'string' ? item.title : 'Sem Título',
        category: typeof item.category === 'string' && item.category ? item.category : 'Outros',
        destinationTool: typeof item.destinationTool === 'string' ? item.destinationTool : undefined,
        mainPrompt: typeof item.mainPrompt === 'string' ? item.mainPrompt : undefined,
        negativePrompt: typeof item.negativePrompt === 'string' ? item.negativePrompt : undefined,
        url: typeof item.url === 'string' ? item.url : undefined,
        linkDescription: typeof item.linkDescription === 'string' ? item.linkDescription : undefined,
        domain: typeof item.domain === 'string' ? item.domain : undefined,
        productContext: typeof item.productContext === 'string' ? item.productContext : undefined,
        tags,
        notes: typeof item.notes === 'string' ? item.notes : undefined,
        favorite: Boolean(item.favorite),
        status: ['draft', 'tested', 'approved', 'archived'].includes(item.status) ? item.status : 'draft',
        createdAt: typeof item.createdAt === 'number' ? item.createdAt : Date.now(),
        updatedAt: typeof item.updatedAt === 'number' ? item.updatedAt : Date.now(),
        useCount: typeof item.useCount === 'number' ? item.useCount : 0,
        lastUsedAt: typeof item.lastUsedAt === 'number' ? item.lastUsedAt : null
      };
    });
  } catch (err) {
    console.error('[PromptVault] Error loading prompt vault items from localStorage:', err);
    return [];
  }
}

/**
 * Saves Prompt Vault items to localStorage safely.
 * Strips any potential binary/base64 data.
 */
export function savePromptVaultItems(items: PromptVaultItem[]): boolean {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }

  try {
    const sanitized = items.map(item => {
      // Ensure plain data only
      const clean: PromptVaultItem = {
        id: item.id,
        type: item.type,
        title: item.title?.slice(0, 300) || '',
        category: item.category || 'Outros',
        destinationTool: item.destinationTool || undefined,
        mainPrompt: item.mainPrompt || undefined,
        negativePrompt: item.negativePrompt || undefined,
        url: item.url || undefined,
        linkDescription: item.linkDescription || undefined,
        domain: item.domain || undefined,
        productContext: item.productContext || undefined,
        tags: Array.isArray(item.tags) ? item.tags.slice(0, 30) : [],
        notes: item.notes || undefined,
        favorite: Boolean(item.favorite),
        status: item.status || 'draft',
        createdAt: item.createdAt || Date.now(),
        updatedAt: Date.now(),
        useCount: item.useCount || 0,
        lastUsedAt: item.lastUsedAt || null
      };

      if (clean.type === 'link' && clean.url) {
        const norm = validateAndNormalizeVaultUrl(clean.url);
        if (norm.isValid) {
          clean.url = norm.normalizedUrl;
          clean.domain = norm.domain;
        }
      }

      return clean;
    });

    localStorage.setItem(PROMPT_VAULT_STORAGE_KEY, JSON.stringify(sanitized));
    return true;
  } catch (err) {
    console.error('[PromptVault] Error saving prompt vault items to localStorage:', err);
    return false;
  }
}

/**
 * Creates a new Prompt Vault item and adds it to the beginning of the list.
 */
export function createPromptVaultItem(
  partial: Omit<PromptVaultItem, 'id' | 'createdAt' | 'updatedAt' | 'useCount' | 'lastUsedAt'>
): PromptVaultItem {
  const current = loadPromptVaultItems();
  const now = Date.now();
  const id = `vault-${now}-${Math.random().toString(36).slice(2, 8)}`;

  let domain = partial.domain;
  let url = partial.url;

  if (partial.type === 'link' && url) {
    const val = validateAndNormalizeVaultUrl(url);
    if (val.isValid) {
      url = val.normalizedUrl;
      domain = val.domain;
    }
  }

  const newItem: PromptVaultItem = {
    ...partial,
    id,
    url,
    domain,
    createdAt: now,
    updatedAt: now,
    useCount: 0,
    lastUsedAt: null
  };

  const updated = [newItem, ...current];
  savePromptVaultItems(updated);
  return newItem;
}

/**
 * Updates an existing Prompt Vault item.
 */
export function updatePromptVaultItem(
  id: string,
  updates: Partial<Omit<PromptVaultItem, 'id' | 'createdAt'>>
): PromptVaultItem | null {
  const current = loadPromptVaultItems();
  const index = current.findIndex(it => it.id === id);
  if (index === -1) return null;

  const existing = current[index];
  let url = updates.url !== undefined ? updates.url : existing.url;
  let domain = updates.domain !== undefined ? updates.domain : existing.domain;

  if (updates.type === 'link' || (existing.type === 'link' && updates.type === undefined)) {
    if (url) {
      const val = validateAndNormalizeVaultUrl(url);
      if (val.isValid) {
        url = val.normalizedUrl;
        domain = val.domain;
      }
    }
  }

  const updatedItem: PromptVaultItem = {
    ...existing,
    ...updates,
    url,
    domain,
    updatedAt: Date.now()
  };

  current[index] = updatedItem;
  savePromptVaultItems(current);
  return updatedItem;
}

/**
 * Deletes a Prompt Vault item by id.
 */
export function deletePromptVaultItem(id: string): boolean {
  const current = loadPromptVaultItems();
  const filtered = current.filter(it => it.id !== id);
  if (filtered.length === current.length) return false;
  savePromptVaultItems(filtered);
  return true;
}

/**
 * Duplicates a Prompt Vault item with a fresh id and "(Cópia)" suffix.
 */
export function duplicatePromptVaultItem(id: string): PromptVaultItem | null {
  const current = loadPromptVaultItems();
  const existing = current.find(it => it.id === id);
  if (!existing) return null;

  const now = Date.now();
  const duplicated: PromptVaultItem = {
    ...existing,
    id: `vault-${now}-${Math.random().toString(36).slice(2, 8)}`,
    title: `${existing.title} (Cópia)`,
    favorite: false,
    useCount: 0,
    lastUsedAt: null,
    createdAt: now,
    updatedAt: now
  };

  const updated = [duplicated, ...current];
  savePromptVaultItems(updated);
  return duplicated;
}

/**
 * Records usage of a Prompt Vault item (increments useCount and updates lastUsedAt).
 */
export function recordPromptVaultUse(id: string): void {
  const current = loadPromptVaultItems();
  const item = current.find(it => it.id === id);
  if (item) {
    item.useCount = (item.useCount || 0) + 1;
    item.lastUsedAt = Date.now();
    savePromptVaultItems(current);
  }
}
