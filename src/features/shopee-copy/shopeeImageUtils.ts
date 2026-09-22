/**
 * Shopee Copy Agent - Canonical Image Ingestion & Clipboard Paste Utilities
 *
 * Provides a single source of truth for validating, extracting, and processing
 * product reference images across file input, drag-and-drop, and Ctrl+V / Cmd+V clipboard paste.
 */

export const SHOPEE_MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export const SHOPEE_ALLOWED_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp'
];

export interface ShopeeImageValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Canonical validator for product images (used by File Upload, Drag & Drop, and Clipboard Paste).
 */
export function validateShopeeProductImage(
  file: { type: string; size: number } | null | undefined
): ShopeeImageValidationResult {
  if (!file) {
    return { valid: false, error: 'Arquivo inválido ou ausente.' };
  }

  const normalizedType = file.type?.toLowerCase();
  if (!normalizedType || !SHOPEE_ALLOWED_IMAGE_TYPES.includes(normalizedType)) {
    return {
      valid: false,
      error: 'Formato não suportado. Envie ou cole uma imagem PNG, JPG ou WEBP.'
    };
  }

  if (file.size > SHOPEE_MAX_IMAGE_SIZE_BYTES) {
    return {
      valid: false,
      error: 'A imagem excede o limite máximo permitido de 5MB.'
    };
  }

  return { valid: true };
}

/**
 * Extracts a valid image File from a DataTransfer object (clipboard or drag-drop).
 */
export function extractImageFileFromClipboard(
  clipboardData: {
    items?: ArrayLike<{ kind: string; type: string; getAsFile?: () => File | null }>;
    files?: ArrayLike<File>;
  } | null | undefined
): File | null {
  if (!clipboardData) return null;

  // 1. Try DataTransferItemList
  if (clipboardData.items && clipboardData.items.length > 0) {
    for (let i = 0; i < clipboardData.items.length; i++) {
      const item = clipboardData.items[i];
      if (item.kind === 'file' && item.type.toLowerCase().startsWith('image/')) {
        if (typeof item.getAsFile === 'function') {
          const file = item.getAsFile();
          if (file) return file;
        }
      }
    }
  }

  // 2. Fallback to FileList
  if (clipboardData.files && clipboardData.files.length > 0) {
    for (let i = 0; i < clipboardData.files.length; i++) {
      const file = clipboardData.files[i];
      if (file && file.type && file.type.toLowerCase().startsWith('image/')) {
        return file;
      }
    }
  }

  return null;
}

/**
 * Checks whether the clipboard contains text content.
 */
export function clipboardHasText(
  clipboardData: {
    getData?: (format: string) => string;
    items?: ArrayLike<{ kind: string; type: string }>;
  } | null | undefined
): boolean {
  if (!clipboardData) return false;

  try {
    if (typeof clipboardData.getData === 'function') {
      const text = clipboardData.getData('text/plain') || clipboardData.getData('text');
      if (text && text.trim().length > 0) {
        return true;
      }
    }
  } catch {
    // Graceful fallback if getData throws in restricted environments
  }

  if (clipboardData.items && clipboardData.items.length > 0) {
    for (let i = 0; i < clipboardData.items.length; i++) {
      const item = clipboardData.items[i];
      if (item.kind === 'string') {
        return true;
      }
    }
  }

  return false;
}

/**
 * Determines whether the event target is an interactive text input element.
 */
export function isEditableElement(target: unknown): boolean {
  if (!target || typeof target !== 'object') return false;

  const el = target as {
    tagName?: string;
    isContentEditable?: boolean;
    getAttribute?: (name: string) => string | null;
  };

  const tagName = el.tagName?.toUpperCase();
  if (tagName === 'INPUT' || tagName === 'TEXTAREA') {
    return true;
  }

  if (el.isContentEditable) {
    return true;
  }

  if (typeof el.getAttribute === 'function' && el.getAttribute('contenteditable') === 'true') {
    return true;
  }

  return false;
}

/**
 * Decision gate for clipboard paste events.
 *
 * Logic:
 * - If no image is present in clipboard -> do nothing (allow normal event flow).
 * - If target is an editable element (input/textarea) AND clipboard also contains text -> preserve normal text paste.
 * - If target is an editable element BUT clipboard has only an image -> consume event and handle image.
 * - If target is not an editable element AND clipboard has an image -> consume event and handle image.
 */
export function shouldHandleClipboardImagePaste(
  target: unknown,
  clipboardData: any
): { shouldHandle: boolean; file: File | null } {
  if (!clipboardData) {
    return { shouldHandle: false, file: null };
  }

  const imageFile = extractImageFileFromClipboard(clipboardData);
  if (!imageFile) {
    return { shouldHandle: false, file: null };
  }

  const isEditable = isEditableElement(target);
  const hasText = clipboardHasText(clipboardData);

  // Preserve normal text paste inside text fields when text is present
  if (isEditable && hasText) {
    return { shouldHandle: false, file: null };
  }

  return { shouldHandle: true, file: imageFile };
}
