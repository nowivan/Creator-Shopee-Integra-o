/**
 * CANONICAL COPY CONTRACT & DETERMINISTIC VALIDATION GATE
 * 
 * Central authoritative source of truth for Copy constraints across all modules:
 * - Scene 2 Spoken Copy
 * - Scene 3 Spoken CTA
 * - Combined Variations Hub (Scene 2 + Scene 3)
 * - Agente de Copy
 * 
 * Rules:
 * - MIN_CHARS = 160
 * - MAX_CHARS = 175
 * - Copy must end with valid sentence punctuation ('.', '!' or '?')
 * - Never mechanically truncate with slice/substring/substr
 * - Never accept incomplete sentences to fit limits
 * - Pure validation: no mutations, no auto-corrections, no rewrites
 */

export interface CopyContractConfig {
  readonly minChars: number;
  readonly maxChars: number;
}

export const COPY_CONTRACT: CopyContractConfig = Object.freeze({
  minChars: 160,
  maxChars: 175
});

export interface CopyContractValidationResult {
  valid: boolean;
  charCount: number;
  lengthValid: boolean;
  sentenceComplete: boolean;
  errors: string[];
}

/**
 * Counts characters using Unicode code point awareness (Array.from).
 */
export function countCopyCharacters(text: string): number {
  if (!text) return 0;
  return Array.from(text).length;
}

/**
 * Deterministically validates copy against the canonical contract.
 * Pure function: does NOT modify, rewrite, or truncate the input text.
 */
export function validateCopyContract(text: string | null | undefined): CopyContractValidationResult {
  const errors: string[] = [];

  if (typeof text !== 'string') {
    return {
      valid: false,
      charCount: 0,
      lengthValid: false,
      sentenceComplete: false,
      errors: ['Texto de copy nulo ou indefinido.']
    };
  }

  // Trim ONLY for evaluation, never modifying original text
  const trimmed = text.trim();
  const charCount = Array.from(trimmed).length;

  const lengthValid = charCount >= COPY_CONTRACT.minChars && charCount <= COPY_CONTRACT.maxChars;
  const sentenceComplete = /[.!?]$/.test(trimmed);

  if (!lengthValid) {
    errors.push(
      `Extensão inválida (${charCount} caracteres). Esperado: exatamente entre ${COPY_CONTRACT.minChars} e ${COPY_CONTRACT.maxChars} caracteres.`
    );
  }

  if (!sentenceComplete) {
    errors.push(
      `Frase incompleta. A copy deve terminar com pontuação final válida ('.', '!' ou '?').`
    );
  }

  return {
    valid: lengthValid && sentenceComplete,
    charCount,
    lengthValid,
    sentenceComplete,
    errors
  };
}
