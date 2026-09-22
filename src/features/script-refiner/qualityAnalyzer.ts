import {
  ScriptRefinerResult,
  RefinerQualityStatus,
  VersionQualityReport,
  ScriptRefinerQualityReport
} from './types';
import {
  FORBIDDEN_PHRASES,
  extractScriptFacts,
  detectProductContamination,
  detectContextContamination
} from './safeRefinerEngine';

const HIGH_SIMILARITY_THRESHOLD = 0.78;
const CRITICAL_SIMILARITY_THRESHOLD = 0.90;

export const SUSPICIOUS_BROKEN_PATTERNS = [
  /\bprocurando\s+o\s+rel\b/i,
  /\bcole\b/i,
  /\bvis\b/i,
  /\bn\s+e\b/i,
  /\b\w+\s+n\s+e\b/i,
  /\brel\s+aparecem\b/i
];

function normalizeForComparison(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizeMeaningfulWords(text: string): string[] {
  const STOP_WORDS = new Set([
    "a", "o", "as", "os", "um", "uma", "uns", "umas", "de", "do", "da", "dos", "das",
    "em", "no", "na", "nos", "nas", "para", "por", "com", "sem", "sob", "sobre", "e",
    "ou", "mas", "que", "se", "como", "esta", "este", "isso", "esse", "essa", "ter",
    "ser", "ir", "tem", "sao", "foi", "seu", "sua", "seus", "suas", "meu", "minha"
  ]);
  const norm = normalizeForComparison(text);
  return norm.split(" ").filter(w => w.length > 1 && !STOP_WORDS.has(w));
}

export function calculateTokenSimilarity(original: string, generated: string): number {
  const origTokens = tokenizeMeaningfulWords(original);
  const genTokens = tokenizeMeaningfulWords(generated);
  if (origTokens.length === 0 || genTokens.length === 0) return 0;

  const genFreq = new Map<string, number>();
  for (const w of genTokens) genFreq.set(w, (genFreq.get(w) || 0) + 1);

  let matchCount = 0;
  for (const w of origTokens) {
    const count = genFreq.get(w) || 0;
    if (count > 0) {
      matchCount++;
      genFreq.set(w, count - 1);
    }
  }

  const similarity = (2 * matchCount) / (origTokens.length + genTokens.length);
  return Math.min(1, Math.max(0, similarity));
}

export function findCopiedPhrases(original: string, generated: string, minimumWords = 5): string[] {
  const origWords = normalizeForComparison(original).split(" ").filter(Boolean);
  const genWords = normalizeForComparison(generated).split(" ").filter(Boolean);
  if (origWords.length < minimumWords || genWords.length < minimumWords) return [];

  const copied: string[] = [];
  const origStr = " " + origWords.join(" ") + " ";

  for (let i = 0; i <= genWords.length - minimumWords; i++) {
    const phrase = genWords.slice(i, i + minimumWords).join(" ");
    if (origStr.includes(" " + phrase + " ")) {
      let end = i + minimumWords;
      while (end < genWords.length && origStr.includes(" " + genWords.slice(i, end + 1).join(" ") + " ")) {
        end++;
      }
      const fullPhrase = genWords.slice(i, end).join(" ");
      if (!copied.some(p => p.includes(fullPhrase))) {
        copied.push(fullPhrase);
      }
      i = end - 1;
    }
  }
  return copied;
}

export function extractPrices(text: string): string[] {
  if (!text) return [];
  const matches = text.match(/(?:(?:R\$\s*|BRL\s*)?\d+(?:[.,]\d{2,3})*(?:[.,]\d{2})|\b\d+\s*BRL\b|\b\d+\s*reais\b)/gi) || [];
  return matches.map(p => p.replace(/\s+/g, "").toUpperCase());
}

export function extractNumbers(text: string): string[] {
  if (!text) return [];
  const matches = text.match(/\b\d+\b/g) || [];
  return Array.from(new Set(matches));
}

export function detectBrokenWords(text: string): string[] {
  if (!text) return [];
  const issues: string[] = [];

  for (const pat of SUSPICIOUS_BROKEN_PATTERNS) {
    if (pat.test(text)) {
      const match = text.match(pat)?.[0] || "";
      issues.push(`Texto potencialmente corrompido: "${match}"`);
    }
  }

  const words = text.split(/\s+/);
  for (let i = 1; i < words.length - 1; i++) {
    const rawWord = words[i].trim();
    if (rawWord === "R$" || rawWord === "$" || rawWord === "€") continue;
    if (/^\d+$/.test(rawWord)) continue;
    const w = rawWord.replace(/[^\wÀ-ÿ]/gi, "").toLowerCase();
    if (w.length === 1 && !["a", "e", "o", "u", "q", "é", "à", "ó"].includes(w)) {
      issues.push(`Fragmento de palavra isolada: "${words[i]}"`);
    }
  }

  return Array.from(new Set(issues));
}

export function detectGenericCopy(text: string): string[] {
  if (!text) return [];
  const lower = text.toLowerCase();
  const detected: string[] = [];

  for (const phrase of FORBIDDEN_PHRASES) {
    if (lower.includes(phrase.toLowerCase())) {
      detected.push(phrase);
    }
  }
  return detected;
}

export function detectPossibleInventedClaims(original: string, generated: string): string[] {
  const warnings: string[] = [];
  const origPrices = extractPrices(original);
  const genPrices = extractPrices(generated);

  for (const gp of genPrices) {
    const normGp = gp.replace(/[^\d]/g, "");
    const matchesOrig = origPrices.some(op => op.replace(/[^\d]/g, "") === normGp);
    if (!matchesOrig && normGp.length >= 3) {
      warnings.push(`Preço (${gp}) não localizado no roteiro original.`);
    }
  }

  const URGENCY_TERMS = [
    "últimas unidades", "ultimas unidades",
    "só hoje", "so hoje",
    "promocao termina", "promoção termina",
    "uso há meses", "uso ha meses",
    "todo mundo está comprando",
    "100% comprovado"
  ];
  const origLower = original.toLowerCase();
  const genLower = generated.toLowerCase();

  for (const term of URGENCY_TERMS) {
    if (genLower.includes(term) && !origLower.includes(term)) {
      warnings.push(`Possível informação ou gatilho adicionado (${term}) que não consta no original.`);
    }
  }

  return warnings;
}

export function analyzeVersionQuality(
  versionKey: "quickDraft" | "mainRefined" | "antiCopy" | "ugcNatural" | "premium",
  originalScript: string,
  versionText: string
): VersionQualityReport {
  const warnings: string[] = [];

  const brokenWords = detectBrokenWords(versionText);
  if (brokenWords.length > 0) {
    warnings.push(...brokenWords);
  }

  const genericCopy = detectGenericCopy(versionText);
  if (genericCopy.length > 0) {
    warnings.push(`Contém frase genérica: "${genericCopy[0]}"`);
  }

  const similarityScore = calculateTokenSimilarity(originalScript, versionText);
  const copiedPhrases = findCopiedPhrases(originalScript, versionText, 5);

  if (copiedPhrases.length > 0) {
    warnings.push(`Trecho idêntico ao original: "${copiedPhrases[0].slice(0, 45)}..."`);
  } else if (similarityScore >= HIGH_SIMILARITY_THRESHOLD) {
    warnings.push(`Muito semelhante ao original (${Math.round(similarityScore * 100)}% de sobreposição)`);
  }

  const origPrices = extractPrices(originalScript);
  const genPrices = extractPrices(versionText);
  let preservedPrices = true;

  if (origPrices.length > 0 && versionKey !== "quickDraft") {
    for (const op of origPrices) {
      const normOp = op.replace(/[^\d]/g, "");
      const found = genPrices.some(gp => gp.replace(/[^\d]/g, "") === normOp);
      if (!found) {
        preservedPrices = false;
        warnings.push(`Preço do original (${op}) não identificado nesta versão.`);
      }
    }
  }

  const origNumbers = extractNumbers(originalScript);
  const genNumbers = extractNumbers(versionText);
  let preservedNumbers = true;

  if (origNumbers.length > 0 && versionKey !== "quickDraft") {
    for (const num of origNumbers) {
      if (!genNumbers.includes(num)) {
        preservedNumbers = false;
        warnings.push(`Número do original (${num}) não foi identificado nesta versão.`);
      }
    }
  }

  const inventedClaims = detectPossibleInventedClaims(originalScript, versionText);
  if (inventedClaims.length > 0) {
    warnings.push(...inventedClaims);
  }

  // PRODUCT & CONTEXT CONTAMINATION AUDIT VIA FACT LOCK & CONTEXT LOCK
  let productContamination = false;
  let productContaminationDetails: string[] = [];
  let contextContamination = false;
  let contextContaminationDetails: string[] = [];

  if (originalScript && versionText) {
    const facts = extractScriptFacts(originalScript);
    if (facts.productFactLock) {
      const check = detectProductContamination(versionText, facts.productFactLock);
      if (check.isContaminated) {
        productContamination = true;
        productContaminationDetails = check.contaminants;
        for (const contaminant of check.contaminants) {
          warnings.push(`Contaminação de produto detectada: menção indevida a "${contaminant}". O produto original é "${facts.productFactLock.product}".`);
        }
      }
      if (check.missingRequired) {
        warnings.push(`Aviso: O produto original (${facts.productFactLock.product}) pode estar ausente desta versão.`);
      }

      const contextLock = facts.contextLock || facts.productFactLock.contextLock;
      if (contextLock) {
        const contextCheck = detectContextContamination(versionText, contextLock);
        if (contextCheck.isContaminated) {
          contextContamination = true;
          contextContaminationDetails = contextCheck.contaminants;
          for (const contaminant of contextCheck.contaminants) {
            warnings.push(`Contaminação contextual detectada: termo indevido "${contaminant}" para a categoria "${contextLock.categoryTone}".`);
          }
        }
      }
    }
  }

  let status: RefinerQualityStatus = "approved";

  if (
    brokenWords.length > 0 ||
    genericCopy.length > 0 ||
    productContamination ||
    contextContamination ||
    similarityScore >= CRITICAL_SIMILARITY_THRESHOLD ||
    !preservedPrices
  ) {
    status = "critical";
  } else if (
    warnings.length > 0 ||
    similarityScore >= HIGH_SIMILARITY_THRESHOLD ||
    copiedPhrases.length > 0
  ) {
    status = "warning";
  }

  return {
    version: versionKey,
    status,
    similarityScore: Math.round(similarityScore * 100) / 100,
    preservedNumbers,
    preservedPrices,
    hasBrokenWords: brokenWords.length > 0,
    possibleGenericCopy: genericCopy.length > 0,
    possibleInventedClaims: inventedClaims.length > 0,
    productContamination,
    productContaminationDetails: productContaminationDetails.length > 0 ? productContaminationDetails : undefined,
    contextContamination,
    contextContaminationDetails: contextContaminationDetails.length > 0 ? contextContaminationDetails : undefined,
    warnings
  };
}

export function analyzeRefinerQuality(
  originalScript: string,
  result: ScriptRefinerResult
): ScriptRefinerQualityReport {
  const versions: ScriptRefinerQualityReport["versions"] = {
    quickDraft: analyzeVersionQuality("quickDraft", originalScript, result.quickDraft || ""),
    mainRefined: analyzeVersionQuality("mainRefined", originalScript, result.mainRefined || ""),
    antiCopy: analyzeVersionQuality("antiCopy", originalScript, result.antiCopy || ""),
    ugcNatural: analyzeVersionQuality("ugcNatural", originalScript, result.ugcNatural || ""),
    premium: analyzeVersionQuality("premium", originalScript, result.premium || "")
  };

  const globalWarnings: string[] = [];

  const criticals = Object.values(versions).filter(v => v.status === "critical");
  if (criticals.length > 0) {
    globalWarnings.push(`${criticals.length} versão(ões) com alertas que exigem atenção.`);
  }

  return {
    versions,
    globalWarnings
  };
}
