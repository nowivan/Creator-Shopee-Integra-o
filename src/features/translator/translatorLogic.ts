export type TranslationMode =
  | 'faithful'
  | 'natural_localization'
  | 'short_overlay'
  | 'dubbing'
  | 'tiktok_shop_natural';

export interface TranslationModeOption {
  value: TranslationMode;
  label: string;
  description: string;
}

export const TRANSLATION_MODES: TranslationModeOption[] = [
  {
    value: 'faithful',
    label: 'Tradução Fiel',
    description: 'Tradução literal e natural sem alterar fatos, estrutura ou tom original.'
  },
  {
    value: 'natural_localization',
    label: 'Localização Natural',
    description: 'Adapta a fluência para o idioma de destino mantendo 100% das informações.'
  },
  {
    value: 'short_overlay',
    label: 'Overlay Curto',
    description: 'Sintetiza texto para telas mantendo mensagem central sem inventar fatos.'
  },
  {
    value: 'dubbing',
    label: 'Dublagem/Narração',
    description: 'Ajusta o ritmo para locução verbal mantendo a ordem e os fatos do texto.'
  },
  {
    value: 'tiktok_shop_natural',
    label: 'TikTok Shop Natural',
    description: 'Tom nativo de criador para TikTok sem inventar preços, frete ou garantias.'
  }
];

export interface LanguageOption {
  code: string;
  label: string;
}

export const SOURCE_LANGUAGES: LanguageOption[] = [
  { code: 'auto', label: 'Auto detectar' },
  { code: 'en', label: 'Inglês (EN)' },
  { code: 'pt', label: 'Português (PT-BR)' },
  { code: 'es', label: 'Espanhol (ES)' },
  { code: 'fr', label: 'Francês (FR)' },
  { code: 'de', label: 'Alemão (DE)' },
  { code: 'it', label: 'Italiano (IT)' }
];

export const TARGET_LANGUAGES: LanguageOption[] = [
  { code: 'pt', label: 'Português (PT-BR)' },
  { code: 'en', label: 'Inglês (EN)' },
  { code: 'es', label: 'Espanhol (ES)' },
  { code: 'fr', label: 'Francês (FR)' },
  { code: 'de', label: 'Alemão (DE)' },
  { code: 'it', label: 'Italiano (IT)' }
];

export interface TranslationFaithfulnessResult {
  has_invented_sentences: boolean;
  preserves_numbers: boolean;
  preserves_product_names: boolean;
  preserves_line_breaks: boolean;
  same_topic: boolean;
  is_valid: boolean;
  notes: string[];
}

/**
  * TASK 6 — Extract protected terms:
  * Product names, brand names, model names, technical terms, measurements, numbers, acronyms.
  */
export function extractProtectedTerms(text: string): string[] {
  if (!text) return [];

  const termsSet = new Set<string>();

  // Specific multi-word brand / tech terms
  const knownTechBrands = [
    'MacBook Neo', 'MacBook Pro', 'MacBook Air', 'MacBook', 'Liquid Retina',
    'Magic Keyboard', 'multi-touch trackpad', 'multitouch trackpad', 'Touch ID',
    'Retina display', 'TikTok Shop', 'DualSense', 'PlayStation', 'PS5', 'Xbox',
    'iPhone', 'iPad', 'Apple Watch', 'Galaxy', 'AirPods', 'USB-C', 'OLED', 'AMOLED',
    'Full HD', 'Ultra HD'
  ];

  for (const term of knownTechBrands) {
    const regex = new RegExp(`\\b${term.replace(/[-[\]{}()*+?Target=^\s$]/g, '\\$&')}\\b`, 'gi');
    if (regex.test(text)) {
      termsSet.add(term);
    }
  }

  // Numbers & measurements (e.g. 13-inch, 13", 825GB, 16GB, 4K, 120Hz, 1080p, $100, R$50, 100%)
  const numberMeasurementRegex = /\b\d+(?:[\.,]\d+)?\s*(?:-inch|"|'|GB|MB|TB|GHz|Hz|p|K|fps|mm|cm|m|kg|g|%|GB|RAM|SSD|V|W)?\b/gi;
  const numMatches = text.match(numberMeasurementRegex);
  if (numMatches) {
    numMatches.forEach(m => {
      if (m.trim().length > 0) termsSet.add(m.trim());
    });
  }

  // Model codes & acronyms (e.g., M1, M2, M3, RTX4090, PS5, SSD, CPU, GPU)
  const acronymRegex = /\b[A-Z0-9]{2,10}\b/g;
  const acronymMatches = text.match(acronymRegex);
  if (acronymMatches) {
    acronymMatches.forEach(a => {
      if (!['THE', 'AND', 'FOR', 'ITS', 'THIS', 'THAT', 'NOT', 'YOU', 'CAN', 'SEE', 'NEW'].includes(a)) {
        termsSet.add(a);
      }
    });
  }

  return Array.from(termsSet);
}

/**
  * TASK 7 — Preserve translation formatting:
  * Preserve line breaks, paragraph structure, bullets, numbering, quotes.
  */
export function preserveTranslationFormatting(
  originalText: string,
  translatedText: string,
  mode: TranslationMode = 'faithful'
): string {
  if (!originalText || !translatedText) return translatedText || '';

  let normalized = translatedText.trim();

  // If mode is dubbing, single continuous speech flow is allowed, but keep quotes intact
  if (mode === 'dubbing') {
    return normalized;
  }

  // Count paragraph breaks in original
  const origParagraphs = originalText.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  const transParagraphs = normalized.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);

  // If original has multiple paragraphs and translation merged them into one, try to break translation into paragraphs
  if (origParagraphs.length > 1 && transParagraphs.length === 1) {
    // Attempt line break restoration if double newlines were flattened into single newlines or periods
    const singleLines = normalized.split(/\n/).map(l => l.trim()).filter(Boolean);
    if (singleLines.length === origParagraphs.length) {
      normalized = singleLines.join('\n\n');
    }
  }

  // Preserve bullet points structure if original had bullets
  const origHasBullets = /^\s*[\-\*\•\d+\.]/m.test(originalText);
  if (origHasBullets && !/^\s*[\-\*\•\d+\.]/m.test(normalized)) {
    const origLines = originalText.split('\n').filter(l => l.trim());
    const transLines = normalized.split('\n').filter(l => l.trim());
    if (origLines.length === transLines.length) {
      normalized = transLines.map((line, idx) => {
        const origPrefixMatch = origLines[idx]?.match(/^\s*([\-\*\•]|\d+\.)\s*/);
        if (origPrefixMatch && !line.match(/^\s*([\-\*\•]|\d+\.)\s*/)) {
          return `${origPrefixMatch[1]} ${line}`;
        }
        return line;
      }).join('\n');
    }
  }

  return normalized;
}

/**
  * TASK 8 — No-invention validator:
  * Validates that the translated output is faithful and has not hallucinated or invented facts.
  */
export function validateTranslationFaithfulness(
  originalText: string,
  translatedText: string,
  targetLanguage: string
): TranslationFaithfulnessResult {
  const notes: string[] = [];

  if (!originalText || !translatedText) {
    return {
      has_invented_sentences: false,
      preserves_numbers: true,
      preserves_product_names: true,
      preserves_line_breaks: true,
      same_topic: true,
      is_valid: true,
      notes: ['Texto vazio']
    };
  }

  const origLower = originalText.toLowerCase();
  const transLower = translatedText.toLowerCase();

  // Banned hallucinated marketing claims / fake additions if not present in original
  const forbiddenMarketingPhrases = [
    'reimagined how to build',
    'surprising price',
    'recycled material',
    'preço surpreendente',
    'reimaginamos como',
    'material reciclado',
    'compre agora',
    'desconto exclusivo',
    'frete grátis',
    'garantia de 1 ano',
    'preço imperdível'
  ];

  let hasInventedSentences = false;
  for (const phrase of forbiddenMarketingPhrases) {
    if (transLower.includes(phrase) && !origLower.includes(phrase)) {
      hasInventedSentences = true;
      notes.push(`Encontrada frase inventada ou não presente no original: "${phrase}"`);
    }
  }

  // Check if original did not mention price/currency, but translation invented price
  const priceRegex = /(\$\d+|\b\d+\s*dólares|\br\$\s*\d+|\b\d+\s*reais|\bprice\b|\bpreço\b|\bdesconto\b)/i;
  if (!priceRegex.test(origLower) && priceRegex.test(transLower)) {
    hasInventedSentences = true;
    notes.push('A tradução introduziu menções a preço/desconto que não existem no texto original.');
  }

  // Extract digits/numbers from original and check presence in translation
  const origNumbers: string[] = originalText.match(/\b\d+\b/g) || [];
  const transNumbers: string[] = translatedText.match(/\b\d+\b/g) || [];
  let preservesNumbers = true;

  for (const num of origNumbers) {
    if (!transNumbers.includes(num)) {
      preservesNumbers = false;
      notes.push(`Número ${num} presente no original não foi encontrado na tradução.`);
    }
  }

  // Extract key protected terms (product & brand names)
  const protectedTerms = extractProtectedTerms(originalText);
  let preservesProductNames = true;

  for (const term of protectedTerms) {
    // Check if term or equivalent is in translation
    const termRegex = new RegExp(term.replace(/[-[\]{}()*+?Target=^\s$]/g, '\\$&'), 'i');
    if (!termRegex.test(translatedText)) {
      // Check common translations for terms like "13-inch" -> "13 polegadas"
      if (term.toLowerCase().includes('inch') && (transLower.includes('polegada') || transLower.includes('13"'))) {
        continue;
      }
      preservesProductNames = false;
      notes.push(`Termo protegido "${term}" do produto não foi preservado no texto traduzido.`);
    }
  }

  // Check line breaks / paragraph alignment
  const origParagraphs = originalText.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  const transParagraphs = translatedText.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  let preservesLineBreaks = true;

  if (origParagraphs.length > 1 && transParagraphs.length === 1) {
    preservesLineBreaks = false;
    notes.push(`O texto original possui ${origParagraphs.length} parágrafos, mas a tradução unificou em apenas 1.`);
  }

  const sameTopic = !hasInventedSentences;
  const isValid = !hasInventedSentences && preservesNumbers && preservesProductNames;

  return {
    has_invented_sentences: hasInventedSentences,
    preserves_numbers: preservesNumbers,
    preserves_product_names: preservesProductNames,
    preserves_line_breaks: preservesLineBreaks,
    same_topic: sameTopic,
    is_valid: isValid,
    notes
  };
}

/**
  * TASK 5 — Build prompt for Gemini API
  */
export function buildTranslationPrompt(
  text: string,
  sourceLang: string,
  targetLang: string,
  mode: TranslationMode
): string {
  const targetLanguageLabel =
    targetLang === 'pt' ? 'Português do Brasil (PT-BR)' :
    targetLang === 'en' ? 'Inglês (EN)' :
    targetLang === 'es' ? 'Espanhol (ES)' :
    targetLang === 'fr' ? 'Francês (FR)' :
    targetLang === 'de' ? 'Alemão (DE)' :
    targetLang === 'it' ? 'Italiano (IT)' : 'Português do Brasil (PT-BR)';

  const sourceLanguageInstruction =
    sourceLang && sourceLang !== 'auto'
      ? `Idioma de origem informado: ${sourceLang}.`
      : 'Identifique o idioma de origem automaticamente.';

  const protectedTerms = extractProtectedTerms(text);
  const protectedTermsInstruction = protectedTerms.length > 0
    ? `Manter obrigatoriamente os seguintes nomes de produtos, especificações e termos técnicos fiéis ao original sem inventar ou alterar: [${protectedTerms.join(', ')}].`
    : 'Manter todos os nomes de produtos, marcas, modelos, números e termos técnicos fiéis ao original.';

  let modeInstruction = '';
  switch (mode) {
    case 'faithful':
      modeInstruction = 'Modo de Tradução: Tradução Fiel. Realize uma tradução literal e natural. Mantenha exatamente o mesmo significado, estrutura, parágrafos, tom e ordem de ideias sem acrescentar nenhuma frase nova.';
      break;
    case 'natural_localization':
      modeInstruction = 'Modo de Tradução: Localização Natural. Adapte a expressão para soar fluida e nativa no idioma de destino, mas sem alterar nenhum fato, sem adicionar novos benefícios e mantendo 100% da veracidade do texto.';
      break;
    case 'short_overlay':
      modeInstruction = 'Modo de Tradução: Overlay Curto. Mantenha as frases concisas e ideais para legendas de tela sem inventar dados, mantendo a mensagem central rigorosamente fiel ao original.';
      break;
    case 'dubbing':
      modeInstruction = 'Modo de Tradução: Dublagem/Narração. Adapte a pontuação e ritmo para leitura verbal natural em voz alta, preservando todos os fatos, nomes e ordem de ideias do texto.';
      break;
    case 'tiktok_shop_natural':
      modeInstruction = 'Modo de Tradução: TikTok Shop Natural. Adapte para tom natural de criador do TikTok sem inventar chamadas de urgência, preços, descontos, frete grátis ou garantias que não estejam no texto original.';
      break;
  }

  return `You are a faithful translation engine. Translate only the user-provided text into the selected target language. Do not rewrite as a new advertisement. Do not invent facts, benefits, price, warranty, shipping, discount, platform, product features, or marketing claims. Preserve names, numbers, technical terms, line breaks, and the original order of ideas. Return only the translated text unless JSON output is explicitly requested.

DADOS DA TRADUÇÃO:
- Idioma de destino: ${targetLanguageLabel}
- ${sourceLanguageInstruction}
- ${modeInstruction}
- ${protectedTermsInstruction}

TEXTO ORIGINAL A SER TRADUZIDO:
"""
${text}
"""

Retorne EXCLUSIVAMENTE o texto traduzido, sem explicações, sem marcadores de markdown adicionais, sem aspas externas e sem criar nenhum conteúdo novo.`;
}

/**
  * Strict retry prompt if first translation fails validation
  */
export function buildStrictRetryPrompt(
  text: string,
  targetLang: string
): string {
  const targetLanguageLabel =
    targetLang === 'pt' ? 'Português do Brasil (PT-BR)' :
    targetLang === 'en' ? 'Inglês (EN)' :
    targetLang === 'es' ? 'Espanhol (ES)' : 'Português do Brasil (PT-BR)';

  return `CRITICAL DIRECTIVE: Translate the following text into ${targetLanguageLabel} STRICTLY and WORD-FOR-WORD where natural.
DO NOT ADD ANY MARKETING CLAIMS, DO NOT ADD PRICES, DO NOT ADD WORDS NOT IN ORIGINAL.
Keep all product names (e.g., MacBook Neo, Liquid Retina, Magic Keyboard, multi-touch trackpad), numbers (e.g., 13-inch, 13 polegadas, 825GB), and exact paragraph breaks intact.

TEXTO ORIGINAL:
"""
${text}
"""

OUTPUT ONLY THE FAITHFUL TRANSLATION:`;
}

/**
  * TASK 11 — Format All for copying:
  */
export function formatCopyAllText(
  sourceLangLabel: string,
  targetLangLabel: string,
  modeLabel: string,
  originalText: string,
  translatedText: string
): string {
  return `TRADUÇÃO
Idioma de origem: ${sourceLangLabel}
Idioma de destino: ${targetLangLabel}
Modo: ${modeLabel}

TEXTO ORIGINAL:
${originalText}

TEXTO TRADUZIDO:
${translatedText}`;
}
