/**
 * URL validation and safety helpers for Prompt & Link Vault IA
 */

export interface UrlValidationResult {
  isValid: boolean;
  normalizedUrl: string;
  domain?: string;
  error?: string;
}

const BLOCKED_PROTOCOLS = [
  'javascript:',
  'data:',
  'file:',
  'blob:',
  'about:',
  'chrome:',
  'vbscript:',
  'ws:',
  'wss:'
];

/**
 * Validates and normalizes raw user-provided URLs.
 * - Allows only http:// and https://
 * - Auto-prefixes https:// if protocol is missing
 * - Blocks dangerous protocols (javascript:, data:, file:, etc.)
 * - Extracts clean hostname domain
 */
export function validateAndNormalizeVaultUrl(rawUrl: string | undefined | null): UrlValidationResult {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { isValid: false, normalizedUrl: '', error: 'A URL não pode estar vazia.' };
  }

  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return { isValid: false, normalizedUrl: '', error: 'A URL não pode estar vazia.' };
  }

  const lower = trimmed.toLowerCase();

  for (const blocked of BLOCKED_PROTOCOLS) {
    if (lower.startsWith(blocked)) {
      return {
        isValid: false,
        normalizedUrl: '',
        error: `Protocolo perigoso ou inválido bloqueado: "${blocked}". Apenas HTTP e HTTPS são permitidos.`
      };
    }
  }

  let candidate = trimmed;
  if (!/^https?:\/\//i.test(candidate)) {
    candidate = `https://${candidate}`;
  }

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return {
        isValid: false,
        normalizedUrl: '',
        error: `Protocolo "${parsed.protocol}" não permitido. Utilize http:// ou https://.`
      };
    }

    if (!parsed.hostname || !parsed.hostname.includes('.') || parsed.hostname.length < 3) {
      // Allow localhost for dev testing
      if (parsed.hostname !== 'localhost') {
        return {
          isValid: false,
          normalizedUrl: '',
          error: 'Domínio de URL inválido.'
        };
      }
    }

    return {
      isValid: true,
      normalizedUrl: parsed.toString(),
      domain: parsed.hostname
    };
  } catch {
    return {
      isValid: false,
      normalizedUrl: '',
      error: 'Formato de URL inválido.'
    };
  }
}

/**
 * Safely opens a validated URL in a new window/tab with noopener,noreferrer
 */
export function openVaultUrl(url: string | undefined | null): boolean {
  const result = validateAndNormalizeVaultUrl(url);
  if (!result.isValid || !result.normalizedUrl) {
    console.warn('[PromptVault] Blocked opening unsafe or invalid URL:', url, result.error);
    return false;
  }

  if (typeof window !== 'undefined' && window.open) {
    window.open(result.normalizedUrl, '_blank', 'noopener,noreferrer');
    return true;
  }
  return false;
}

/**
 * Copies text to clipboard safely
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    // Fallback
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('[PromptVault] Failed to copy to clipboard:', err);
    return false;
  }
}

/**
 * Formats all populated fields of a PromptVaultItem into a single plain-text copy bundle.
 * Only includes fields that exist and are non-empty.
 */
export function formatPromptVaultItemCopyAll(item: {
  title?: string;
  category?: string;
  destinationTool?: string;
  status?: string;
  tags?: string[];
  mainPrompt?: string;
  negativePrompt?: string;
  productContext?: string;
  notes?: string;
  url?: string;
  linkDescription?: string;
  domain?: string;
}): string {
  const sections: { label: string; value: string }[] = [];

  if (item.title && item.title.trim()) {
    sections.push({ label: 'TÍTULO', value: item.title.trim() });
  }

  if (item.category && item.category.trim()) {
    sections.push({ label: 'CATEGORIA', value: item.category.trim() });
  }

  if (item.destinationTool && item.destinationTool.trim()) {
    sections.push({ label: 'DESTINO', value: item.destinationTool.trim() });
  }

  if (item.status && item.status.trim()) {
    sections.push({ label: 'STATUS', value: item.status.trim() });
  }

  if (Array.isArray(item.tags) && item.tags.length > 0) {
    const validTags = item.tags.map(t => t.trim()).filter(Boolean);
    if (validTags.length > 0) {
      sections.push({ label: 'TAGS', value: validTags.join(', ') });
    }
  }

  if (item.mainPrompt && item.mainPrompt.trim()) {
    sections.push({ label: 'PROMPT PRINCIPAL', value: item.mainPrompt.trim() });
  }

  if (item.negativePrompt && item.negativePrompt.trim()) {
    sections.push({ label: 'NEGATIVE PROMPT', value: item.negativePrompt.trim() });
  }

  if (item.productContext && item.productContext.trim()) {
    sections.push({ label: 'CONTEXTO DO PRODUTO', value: item.productContext.trim() });
  }

  if (item.notes && item.notes.trim()) {
    sections.push({ label: 'NOTAS', value: item.notes.trim() });
  }

  if (item.url && item.url.trim()) {
    sections.push({ label: 'URL', value: item.url.trim() });
  }

  if (item.linkDescription && item.linkDescription.trim()) {
    sections.push({ label: 'DESCRIÇÃO DO LINK', value: item.linkDescription.trim() });
  }

  if (item.domain && item.domain.trim()) {
    sections.push({ label: 'DOMÍNIO', value: item.domain.trim() });
  }

  return sections.map(s => `${s.label}:\n${s.value}`).join('\n\n');
}
