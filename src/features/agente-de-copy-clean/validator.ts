import { 
    CleanCopyVariation, 
    CleanValidationResult, 
    CleanValidationSceneDetail, 
    CleanVariantType,
    CommercialEvidence,
    DEFAULT_COMMERCIAL_EVIDENCE,
    SceneValidation 
} from './types';

/**
 * Deterministic helper to extract commercial evidence from input context or metadata without extra AI calls.
 */
export function extractCommercialEvidence(
    contextText?: string,
    override?: Partial<CommercialEvidence>
): CommercialEvidence {
    const raw = (contextText || '').toLowerCase();
    const hasVisiblePrice = /(?:r\$\s*\d+|\b\d+(?:[.,]\d{2})?\s*reais|\bpreço\b|\$\s*\d+)/i.test(raw);
    const hasExplicitDiscount = /(?:\bdesconto\b|\boff\b|\bpromo[çc][ãa]o\b|\b\d+%\s*(?:de\s+desconto|off)?\b)/i.test(raw);
    const hasExplicitCoupon = /(?:\bcupom\b|\bvoucher\b|\bc[óo]digo\b)/i.test(raw);
    const hasExplicitOffer = /(?:\boferta\b|\boferta\s+rel[âa]mpago\b|\bliquida[çc][ãa]o\b)/i.test(raw);
    const hasExplicitDeadline = /(?:\bs[óo]\s+hoje\b|\b[uú]ltimas\s+horas\b|\btermina\b|\bdata\b|\bcron[ôo]metro\b|\bat[ée]\s+\d+)/i.test(raw);
    const hasExplicitStockLimit = /(?:\bestoque\s+limitado\b|\b[uú]ltim[ao]s\s+unidades\b|\brestam\s+\d+)/i.test(raw);
    const hasExplicitShipping = /(?:\bfrete\s+gr[áa]tis\b|\bfrete\s+gratuito\b|\bsem\s+custo\s+de\s+frete\b|\bentrega\s+gr[áa]tis\b)/i.test(raw);
    const hasExplicitGuarantee = /(?:\bgarantia\b|\bsatisfa[çc][ãa]o\s+garantida\b|\bdevolu[çc][ãa]o\s+garantida\b)/i.test(raw);

    let level: CommercialEvidence['level'] = 0;
    if (hasExplicitDeadline) {
        level = 3;
    } else if (hasExplicitDiscount || hasExplicitCoupon || hasExplicitOffer) {
        level = 2;
    } else if (hasVisiblePrice) {
        level = 1;
    }

    return {
        level,
        hasVisiblePrice,
        hasExplicitDiscount,
        hasExplicitCoupon,
        hasExplicitOffer,
        hasExplicitDeadline,
        hasExplicitStockLimit,
        hasExplicitShipping,
        hasExplicitGuarantee,
        ...override
    };
}

/**
 * Official JavaScript character count implementation.
 * Uses Array.from() to correctly count Unicode code points, emojis, and symbols.
 * Counts all letters, numbers, spaces, and punctuation.
 */
export function countCharacters(text: string): number {
    if (!text) return 0;
    return Array.from(text).length;
}

/**
 * Deterministic detection of audiovisual / camera / cinematic / storyboard descriptions.
 * Detects phrases explicitly describing filming, camera shots, actor actions, or visual staging.
 * Does NOT reject isolated common words like "visual", "estilo", "look", ou "produto".
 */
export function detectVisualDescription(text: string): boolean {
    if (!text) return false;

    const visualPatterns = [
        /\b(?:close-?up|c[âa]mera|camera|zoom|â?ngulo|[aâ]ngulo|enquadramento|plano\s+aberto|plano\s+fechado|plano\s+m[eé]dio|foco\s+em|corte\s+para|transi[çc][ãa]o)\b/i,
        /\b(?:mostra\s+o\s+produto|produto\s+sendo\s+mostrado|imagem\s+mostra|v[íi]deo\s+mostra|vemos\s+(?:o|a|um|uma|na|no)|vis[ãa]o\s+lateral|vis[ãa]o\s+traseira|como\s+vemos|na\s+imagem|na\s+foto)\b/i,
        /\b(?:homem|mulher|modelo|ator|atriz)\s+(?:usando|veste|vestindo|caminhando|segurando|mostrando|olhando|ajusta|ajustando)\b/i,
        /\b(?:caminhando\s+pela|caminhando\s+em|caminhando\s+no|caminha\s+pela)\b/i,
        /\b(?:cen[áa]rio|ilumina[çc][ãa]o|fundo\s+desfocado|bokeh|take|shot)\b/i
    ];

    return visualPatterns.some(pattern => pattern.test(text));
}

export const CLEAN_D_MIN_CHARS = 160;
export const CLEAN_D_MAX_CHARS = 175;

export const SCENE_2_SAFE_EXTENSIONS: readonly string[] = Object.freeze([
    'sem pesar no visual.',
    'com presença no dia a dia.',
    'para valorizar a sua rotina.',
    'trazendo mais praticidade ao seu dia.',
    'com acabamento pensado para o seu cotidiano.',
    'garantindo um toque especial no visual.',
    'com praticidade no seu dia a dia.',
    'no seu dia a dia.',
    'no cotidiano.',
    'com total elegância.',
    'com total praticidade.',
    'no visual.'
]);

export const SCENE_3_SAFE_EXTENSIONS: readonly string[] = Object.freeze([
    'e confira os detalhes do anúncio.',
    'para ver as informações completas.',
    'e garanta o seu com total praticidade.',
    'para aproveitar enquanto estiver disponível.',
    'e aproveite as condições do anúncio.',
    'e confira os detalhes.',
    'para ver os detalhes.',
    'enquanto estiver disponível.',
    'antes que termine.',
    'com tranquilidade.',
    'no anúncio.'
]);

export interface MicroRepairResult {
    repairedText: string;
    wasRepaired: boolean;
    repairType: 'NONE' | 'EXTENDED' | 'TRIMMED';
    originalLength: number;
    finalLength: number;
}

/**
 * Deterministic micro-repair for near-valid scenes (150–159 and 176–185 characters).
 * Preserves semantic meaning, respects Clean D Style DNA, and ensures "carrinho laranja" is preserved for Scene 3.
 */
export function microRepairSceneText(
    sceneType: 'scene2' | 'scene3',
    text: string,
    evidence: CommercialEvidence = DEFAULT_COMMERCIAL_EVIDENCE
): MicroRepairResult {
    if (!text || typeof text !== 'string') {
        return {
            repairedText: text || '',
            wasRepaired: false,
            repairType: 'NONE',
            originalLength: 0,
            finalLength: 0
        };
    }

    const clean = text.trim();
    const originalLength = countCharacters(clean);

    // If already in 160–175 range, no repair needed
    if (originalLength >= CLEAN_D_MIN_CHARS && originalLength <= CLEAN_D_MAX_CHARS) {
        return {
            repairedText: clean,
            wasRepaired: false,
            repairType: 'NONE',
            originalLength,
            finalLength: originalLength
        };
    }

    // Gaps beyond repair threshold are left for AI revision or manual intervention
    if (originalLength < 150 || originalLength > 185) {
        return {
            repairedText: clean,
            wasRepaired: false,
            repairType: 'NONE',
            originalLength,
            finalLength: originalLength
        };
    }

    // 1. EXTENSION (150–159 chars)
    if (originalLength >= 150 && originalLength <= 159) {
        const bank = sceneType === 'scene2' ? SCENE_2_SAFE_EXTENSIONS : SCENE_3_SAFE_EXTENSIONS;
        const base = clean.replace(/[.!…]+$/, '').trim();
        const candidates: string[] = [];

        for (const ext of bank) {
            // Connector 1: Comma join
            candidates.push(`${base}, ${ext}`);
            // Connector 2: Space join
            candidates.push(`${base} ${ext}`);
            // Connector 3: Sentence join
            const capitalizedExt = ext.charAt(0).toUpperCase() + ext.slice(1);
            candidates.push(`${base}. ${capitalizedExt}`);
            if (clean.endsWith('.')) {
                candidates.push(`${clean} ${capitalizedExt}`);
            }
        }

        const validCandidates = candidates.filter(c => {
            const len = countCharacters(c);
            if (len < CLEAN_D_MIN_CHARS || len > CLEAN_D_MAX_CHARS) return false;
            if (sceneType === 'scene3' && !/carrinho\s+laranja/i.test(c)) return false;
            if (/[,.]{2,}/.test(c)) return false;
            return true;
        });

        if (validCandidates.length > 0) {
            // Select candidate closest to ideal 170 chars
            validCandidates.sort((a, b) => {
                const diffA = Math.abs(countCharacters(a) - 170);
                const diffB = Math.abs(countCharacters(b) - 170);
                return diffA - diffB;
            });
            const best = validCandidates[0];
            return {
                repairedText: best,
                wasRepaired: true,
                repairType: 'EXTENDED',
                originalLength,
                finalLength: countCharacters(best)
            };
        }
    }

    // 2. TRIMMING (176–185 chars)
    if (originalLength >= 176 && originalLength <= 185) {
        const candidates: string[] = [];

        // Strategy A: Safe filler words removal
        const fillerWords = ['mesmo', 'já', 'agora', 'totalmente', 'diretamente', 'simplesmente', 'perfeitamente', 'realmente', 'super', 'demais'];
        for (const fw of fillerWords) {
            // Try removing filler word
            const regex = new RegExp(`\\b${fw}\\s+`, 'gi');
            if (regex.test(clean)) {
                const candidate = clean.replace(regex, '').replace(/\s{2,}/g, ' ').trim();
                candidates.push(candidate);
            }
        }

        // Strategy B: Prepositional clause trimming at end
        const endPatterns = [
            /\s+(?:no\s+seu\s+dia\s+a\s+dia|no\s+dia\s+a\s+dia|no\s+cotidiano|para\s+voc[êe]|na\s+sua\s+rotina|com\s+total\s+seguran[çc]a|na\s+sua\s+casa|com\s+toda\s+praticidade)\.?$/i,
            /\s+(?:de\s+forma\s+simples|com\s+facilidade|no\s+momento|em\s+qualquer\s+lugar)\.?$/i
        ];
        for (const ep of endPatterns) {
            if (ep.test(clean)) {
                const trimmed = clean.replace(ep, '').trim();
                const candidate = trimmed.endsWith('.') ? trimmed : `${trimmed}.`;
                candidates.push(candidate);
            }
        }

        const validCandidates = candidates.filter(c => {
            const len = countCharacters(c);
            if (len < CLEAN_D_MIN_CHARS || len > CLEAN_D_MAX_CHARS) return false;
            if (sceneType === 'scene3' && !/carrinho\s+laranja/i.test(c)) return false;
            return true;
        });

        if (validCandidates.length > 0) {
            validCandidates.sort((a, b) => {
                const diffA = Math.abs(countCharacters(a) - 170);
                const diffB = Math.abs(countCharacters(b) - 170);
                return diffA - diffB;
            });
            const best = validCandidates[0];
            return {
                repairedText: best,
                wasRepaired: true,
                repairType: 'TRIMMED',
                originalLength,
                finalLength: countCharacters(best)
            };
        }
    }

    return {
        repairedText: clean,
        wasRepaired: false,
        repairType: 'NONE',
        originalLength,
        finalLength: originalLength
    };
}

/**
 * Deterministic detection of raw product evidence echoes.
 * Identifies when a scene text is merely an un-transformed echo of a short product attribute/label.
 * (e.g. "Ferrari Red", "Ferrari Black", "4 Andares", "5 Andares", "Preto", "Kit com 2 perfumes", "Kit Ferrari Red + Black").
 * 
 * Conservative:
 * - Flags short strings (< 80 chars) that match known raw catalog tokens or passed evidence strings.
 * - NEVER blocks full spoken sentences (>= 160 chars) containing product terms.
 */
export function isRawEvidenceEcho(sceneText: string, evidenceValues?: string[]): boolean {
    if (!sceneText) return false;
    const clean = sceneText.trim().toLowerCase();
    if (clean.length === 0) return false;
    if (clean.length >= 80) return false; // Legitimate full sentences are not raw echoes

    // 1. Direct match with passed evidence values
    if (evidenceValues && Array.isArray(evidenceValues)) {
        for (const ev of evidenceValues) {
            if (typeof ev === 'string' && ev.trim().length > 0) {
                const cleanEv = ev.trim().toLowerCase();
                if (clean === cleanEv || clean === `kit ${cleanEv}` || clean === `modelo ${cleanEv}` || clean === `opção ${cleanEv}`) {
                    return true;
                }
            }
        }
    }

    // 2. Common raw catalog patterns
    const rawTokens = [
        /^(\d+)\s*(andares|andar|prateleiras?|gavetas?|pe[çc]as?|unidades?|itens)$/i,
        /^(preto|branco|azul|vermelho|cinza|amarelo|verde|rosa|marrom|bege|dourado|prata|prateado)$/i,
        /^(kit\s+com\s+\d+.*|kit\s+contendo.*|kit\s+\d+\s+pe[çc]as?)$/i,
        /^(ferrari\s+black|ferrari\s+red|scuderia\s+ferrari.*)$/i,
        /^(kit\s+ferrari.*)$/i
    ];

    return rawTokens.some(r => r.test(clean));
}

/**
 * Deterministic detection of catalog labels, SKU attributes, product variant specifications,
 * or bare noun phrases mistakenly outputted as spoken video copy.
 * 
 * Conservative Heuristics:
 * - Detects standalone short attribute labels (e.g. "4 Andares", "5 Andares", "Preto", "Branco", "Kit com 2 perfumes", "Ferrari Red", "Ferrari Black", "Kit Ferrari Red + Black").
 * - Detects product names with SKU suffixes (e.g. "Perfume Scuderia Ferrari Black individual", "Kit contendo os dois perfumes").
 * - Strong signals:
 *   - Very short text (< 80 chars) consisting solely of product attributes, quantities, dimensions, colors, or SKU options without conversational/locution verbs.
 *   - Standalone product configuration phrases.
 * 
 * IMPORTANT:
 * - NEVER rejects full persuasive sentences merely because they mention a factual color, quantity, or model name!
 *   (e.g., "Essa sapateira de 5 andares organiza todos os seus calçados..." has length >= 160 and normal spoken sentence verbs).
 */
export function detectSkuAttributeAsCopy(text: string, rawEvidenceList?: string[]): boolean {
    if (!text) return false;
    const clean = text.trim();
    if (clean.length === 0) return false;

    if (isRawEvidenceEcho(clean, rawEvidenceList)) {
        return true;
    }

    // Pattern 1: Direct isolated attribute phrases (< 80 chars)
    if (clean.length < 80) {
        const isolatedAttributePatterns = [
            /^\s*\d+\s*(?:andares|andar|prateleiras?|gavetas?|pe[çc]as?|unidades?|camadas?|n[íi]veis|vagas|divis[óo]rias|potes?)\s*$/i,
            /^\s*(?:preto|branco|azul|vermelho|cinza|rosa|amarelo|verde|marrom|bege|dourado|prateado|incolor|transparente)\s*$/i,
            /^\s*kit\s+(?:com|de|contendo)\s+\d+.*$/i,
            /^\s*kit\s+contendo\s+.*$/i,
            /^\s*kit\s+(?:ferrari|perfumes?|body\s+splash|blazer|sapateira).*\s*$/i,
            /^\s*(?:perfume|produto|item|kit|frasco|aparelho|sapateira|organizador)\s+.*(?:individual|kit|unidade|unidades)\s*$/i,
            /^\s*(?:modelo|tamanho|cor|capacidade|voltagem|voltagens|dimens[ãa]o|dimens[õo]es|vers[ãa]o)\s*:\s*.*$/i,
            /^\s*(?:tamanho|modelo|cor|vers[ãa]o)\s+(?:[a-z0-9]+|\d+\s*(?:cm|mm|m|l|ml|kg|g))\s*$/i,
            /^\s*(?:scuderia\s+)?ferrari\s+(?:black|red|yellow)\s*(?:individual)?\s*$/i,
            /^\s*(?:ferrari\s+red|ferrari\s+black)\s*$/i,
            /^\s*kit\s+ferrari\s*(?:red\s*\+\s*black|black\s*\+\s*red)\s*$/i
        ];

        if (isolatedAttributePatterns.some(pat => pat.test(clean))) {
            return true;
        }

        // Pattern 2: Short noun phrases (< 60 chars) without spoken locution verbs
        // Checks if text is just a product title / catalog label
        const containsSpokenVerb = /\b(?:traz|garante|ajuda|organiza|proporciona|facilita|protege|elimina|resolve|aproveite|clique|garanta|confira|vem|tem|conta\s+com|feito\s+para|ideal\s+para|perfeito\s+para|vai\s+te|deixa|transforma|encontre|aproveitar)\b/i.test(clean);
        const looksLikeCatalogSku = /^(?:perfume|sapateira|organizador|kit|conjunto|estojo|frasco|aparelho|suporte|gaveteiro|prateleira|blazer|camisa|vestido)\s+[a-z0-9\s-]+$/i.test(clean);
        
        if (clean.length < 50 && looksLikeCatalogSku && !containsSpokenVerb) {
            return true;
        }
    }

    return false;
}

/**
 * Validates a single scene against all deterministic rules and evidence awareness.
 * Strictly NEVER modifies, trims, or replaces the text.
 */
export function validateScene(
    versionId: number,
    sceneType: 'scene2' | 'scene3',
    text: string,
    minChars: number = CLEAN_D_MIN_CHARS,
    maxChars: number = CLEAN_D_MAX_CHARS,
    evidence: CommercialEvidence = DEFAULT_COMMERCIAL_EVIDENCE
): SceneValidation {
    const rawText = text || '';
    const characterCount = countCharacters(rawText);
    const charactersValid = characterCount >= minChars && characterCount <= maxChars;

    const violations: string[] = [];

    if (characterCount === 0) {
        violations.push(sceneType === 'scene2' ? 'MISSING_SCENE_2' : 'MISSING_SCENE_3');
        violations.push('CHARACTERS_BELOW_MIN');
    } else if (characterCount < minChars) {
        violations.push(sceneType === 'scene2' ? 'SCENE_2_TOO_SHORT' : 'SCENE_3_TOO_SHORT');
        violations.push('CHARACTERS_BELOW_MIN');
    } else if (characterCount > maxChars) {
        violations.push(sceneType === 'scene2' ? 'SCENE_2_TOO_LONG' : 'SCENE_3_TOO_LONG');
        violations.push('CHARACTERS_ABOVE_MAX');
    }

    // 1. Price violation (MONETARY VALUES ARE ALWAYS FORBIDDEN IN OUTPUT)
    const priceViolation = /(?:R\$\s*\d+|\b\d+(?:[.,]\d{2})?\s*reais\b|\b\d+\s*reais\b|\$\s*\d+)/i.test(rawText);
    if (priceViolation) {
        violations.push('PRICE');
    }

    // 2. Installment violation (EXPLICIT INSTALLMENTS ALWAYS FORBIDDEN IN OUTPUT)
    const installmentViolation = /(?:\b\d+x\b|\bparcelad[oa]\b|\bparcelamento\b|\bsem\s+juros\b|\bno\s+cart[ãa]o\b|\bvezes\s+sem\s+juros\b)/i.test(rawText);
    if (installmentViolation) {
        violations.push('INSTALLMENT');
    }

    // 3. Discount / coupon violation (EVIDENCE-AWARE)
    let discountViolation = false;
    const hasDiscountWords = /(?:\bdesconto\b|\bcupom\b|\boff\b|\bpromo[çc][ãa]o\b|\bgr[áa]tis\b|\bmetade\s+do\s+pre[çc]o\b|\bpela\s+metade\b|\b\d+%\s+de\s+desconto\b|\b\d+%\s+off\b|\b\d+%\b)/i.test(rawText);
    if (hasDiscountWords && !evidence.hasExplicitDiscount && !evidence.hasExplicitCoupon) {
        discountViolation = true;
        violations.push('DISCOUNT');
    }

    // 4. Stock / Invented scarcity violation (EVIDENCE-AWARE)
    let stockViolation = false;
    const hasStockWords = /(?:\bestoque\s+limitado\b|\b[uú]ltim[ao]s\s+(?:unidades|pe[çc]as|itens)\b|\bpoucas\s+unidades\b|\brestam\s+\d+\b|\b\d+\s+unidades\s+dispon[íi]veis\b|\bapenas\s+\d+\s+unidades\b|\besgotando\b)/i.test(rawText);
    if (hasStockWords && !evidence.hasExplicitStockLimit) {
        stockViolation = true;
        violations.push('STOCK');
    }

    // 5. Unsupported commercial claim violation (e.g. invented deadlines, shipping, ratings, or superlatives)
    let unsupportedCommercialClaim = /(?:\b\d+\s+unidades\s+vendidas\b|\b\d+\s+vendas\b|\bavalia[çc][ãa]o\s+de\s+\d+(?:[.,]\d+)?(?:\s+estrelas)?\b|\b\d+\s+estrelas\b|\bmais\s+vendido\b|\bcampe[ãa]o\s+de\s+vendas\b|\bl[íi]der\s+de\s+vendas\b|\bl[íi]der\s+de\s+mercado\b|\bproduto\s+n[úu]mero\s+1\b)/i.test(rawText);
    const hasDeadlineWords = /(?:\bs[óo]\s+hoje\b|\bapenas\s+hoje\b|\bacaba\s+hoje\b|\btermina\s+hoje\b|\b[uú]ltimas\s+horas\b|\b24h\b|\b48h\b|\bpor\s+tempo\s+limitado\b|\bcorre\s+que\s+vai\s+acabar\b)/i.test(rawText);
    if (hasDeadlineWords && !evidence.hasExplicitDeadline) {
        unsupportedCommercialClaim = true;
    }
    const hasUnsupportedShippingWords = /(?:\bfrete\s+gr[áa]tis\b|\bfrete\s+gratuito\b|\bsem\s+custo\s+de\s+frete\b|\bentrega\s+garantida\b|\bentrega\s+expressa\b|\benvio\s+r[áa]pido\b)/i.test(rawText);
    if (hasUnsupportedShippingWords && !evidence.hasExplicitShipping) {
        unsupportedCommercialClaim = true;
    }
    const hasUnsupportedSuperlatives = /(?:\bpre[çc]o\s+imperd[íi]vel\b|\bpre[çc]o\s+de\s+f[áa]brica\b|\bpre[çc]o\s+imbat[íi]vel\b|\bgarantia\s+incondicional\b|\bsatisfa[çc][ãa]o\s+garantida\b|\bdevolu[çc][ãa]o\s+garantida\b)/i.test(rawText);
    if (hasUnsupportedSuperlatives) {
        unsupportedCommercialClaim = true;
    }

    if (unsupportedCommercialClaim) {
        violations.push('UNSUPPORTED_COMMERCIAL_CLAIM');
    }

    // 6. Missing Orange Cart CTA (for scene3 only)
    let missingOrangeCartCTA = false;
    if (sceneType === 'scene3') {
        missingOrangeCartCTA = !/carrinho\s+laranja/i.test(rawText);
        if (missingOrangeCartCTA) {
            violations.push('MISSING_ORANGE_CART_CTA');
        }
    }

    // 7. Scene 1 forbidden marker
    const scene1Violation = /(?:cena\s*1\b|\[cena\s*1\]|scene\s*1\b)/i.test(rawText);
    if (scene1Violation) {
        violations.push('SCENE_1_DETECTED');
    }

    // 8. Audiovisual / Visual Description violation
    const visualDescriptionViolation = detectVisualDescription(rawText);
    if (visualDescriptionViolation) {
        violations.push('VISUAL_DESCRIPTION_DETECTED');
    }

    // 9. SKU / Catalog Attribute as Copy violation
    const skuAttributeViolation = detectSkuAttributeAsCopy(rawText);
    if (skuAttributeViolation) {
        violations.push('SKU_ATTRIBUTE_AS_COPY');
    }

    const valid = charactersValid &&
        !priceViolation &&
        !installmentViolation &&
        !discountViolation &&
        !stockViolation &&
        !unsupportedCommercialClaim &&
        !missingOrangeCartCTA &&
        !scene1Violation &&
        !visualDescriptionViolation &&
        !skuAttributeViolation;

    return {
        versionId,
        scene: sceneType,
        text: rawText,
        characterCount,
        charactersValid,
        priceViolation,
        installmentViolation,
        discountViolation,
        stockViolation,
        unsupportedCommercialClaim,
        missingOrangeCartCTA,
        visualDescriptionViolation,
        scene1Violation,
        skuAttributeViolation,
        violations,
        valid
    };
}

/**
 * Deterministic read-only validator for Agente de Copy Clean.
 * Observes and audits all 12 scenes (V1 C2 .. V6 C3).
 * Strictly NEVER modifies, trims, pads, or rewrites any scene or variation.
 */
export function validateCleanCopyResult(
    variations: CleanCopyVariation[],
    rawText: string,
    variant: CleanVariantType = 'D',
    evidence: CommercialEvidence = DEFAULT_COMMERCIAL_EVIDENCE
): CleanValidationResult {
    const minChars = CLEAN_D_MIN_CHARS; // 160
    const maxChars = CLEAN_D_MAX_CHARS; // 175

    const sceneDetails: CleanValidationSceneDetail[] = [];
    const sceneValidations: SceneValidation[] = [];

    let compliantCharCount = 0;
    let carrinhoLaranjaCount = 0;
    let scene2Count = 0;
    let scene3Count = 0;
    let explicitPriceDetected = false;
    let installmentDetected = false;
    let discountDetected = false;
    let stockDetected = false;
    let unsupportedClaimsDetected = false;
    let scene1Detected = false;
    let visualDescriptionViolationsCount = 0;
    let skuAttributeViolationsCount = 0;

    const seenIds = new Set<number>();

    for (let i = 0; i < variations.length; i++) {
        const v = variations[i];
        const versionId = v.id || (i + 1);
        seenIds.add(versionId);

        // Validate scene2
        const s2Validation = validateScene(versionId, 'scene2', v.scene2 || '', minChars, maxChars, evidence);
        sceneValidations.push(s2Validation);
        if (s2Validation.characterCount > 0) scene2Count++;
        if (s2Validation.charactersValid) compliantCharCount++;
        if (s2Validation.priceViolation) explicitPriceDetected = true;
        if (s2Validation.installmentViolation) installmentDetected = true;
        if (s2Validation.discountViolation) discountDetected = true;
        if (s2Validation.stockViolation) stockDetected = true;
        if (s2Validation.unsupportedCommercialClaim) unsupportedClaimsDetected = true;
        if (s2Validation.scene1Violation) scene1Detected = true;
        if (s2Validation.visualDescriptionViolation) visualDescriptionViolationsCount++;
        if (s2Validation.skuAttributeViolation) skuAttributeViolationsCount++;

        // Validate scene3
        const s3Validation = validateScene(versionId, 'scene3', v.scene3 || '', minChars, maxChars, evidence);
        sceneValidations.push(s3Validation);
        if (s3Validation.characterCount > 0) scene3Count++;
        if (s3Validation.charactersValid) compliantCharCount++;
        if (!s3Validation.missingOrangeCartCTA) carrinhoLaranjaCount++;
        if (s3Validation.priceViolation) explicitPriceDetected = true;
        if (s3Validation.installmentViolation) installmentDetected = true;
        if (s3Validation.discountViolation) discountDetected = true;
        if (s3Validation.stockViolation) stockDetected = true;
        if (s3Validation.unsupportedCommercialClaim) unsupportedClaimsDetected = true;
        if (s3Validation.scene1Violation) scene1Detected = true;
        if (s3Validation.visualDescriptionViolation) visualDescriptionViolationsCount++;
        if (s3Validation.skuAttributeViolation) skuAttributeViolationsCount++;

        sceneDetails.push({
            versionNumber: versionId,
            scene2Length: s2Validation.characterCount,
            scene2Valid: s2Validation.charactersValid,
            scene3Length: s3Validation.characterCount,
            scene3Valid: s3Validation.charactersValid,
            hasCarrinhoLaranja: !s3Validation.missingOrangeCartCTA,
            scene2Validation: s2Validation,
            scene3Validation: s3Validation
        });
    }

    // Check if IDs are uniquely 1..6
    let uniqueIds1to6 = variations.length === 6;
    for (let id = 1; id <= 6; id++) {
        if (!seenIds.has(id)) {
            uniqueIds1to6 = false;
            break;
        }
    }

    // Prohibitions & Contamination audit across full RAW text
    if (/(?:cena\s*1\b|\[cena\s*1\]|scene\s*1\b)/i.test(rawText)) scene1Detected = true;
    if (/(?:R\$\s*\d+|\b\d+,\d{2}\s*reais|\b\d+\s*reais\b|\$\s*\d+)/i.test(rawText)) explicitPriceDetected = true;
    if (!evidence.hasExplicitDiscount && !evidence.hasExplicitCoupon && /(?:\bdesconto\b|\bcupom\b|\boff\b|\bpromo[çc][ãa]o\b|\bgr[áa]tis\b|\bmetade do pre[çc]o\b|\bpela metade\b|\b\d+%\b)/i.test(rawText)) {
        discountDetected = true;
    }
    if (!evidence.hasExplicitStockLimit && /(?:\brestam\b|\b[uú]ltim[ao]s\s+(?:unidades|pe[çc]as|itens)\b|\besgot\b|\bestoque\b|\bpoucas unidades\b|\bapenas\s+\d+\s+unidades\b)/i.test(rawText)) {
        stockDetected = true;
    }

    // Invented deadline
    const hasDeadlineWordsRaw = /(?:\bs[óo] hoje\b|\bapenas hoje\b|\bacaba hoje\b|\btermina hoje\b|\b[uú]ltimas horas\b|\b24h\b|\b48h\b|\bpor tempo limitado\b|\bcorre que vai acabar\b)/i.test(rawText);
    const inventedDeadline = hasDeadlineWordsRaw && !evidence.hasExplicitDeadline;

    // Extra preamble/conversational output
    const trimmedRaw = (rawText || '').trim();
    const preambleDetected = !trimmedRaw.startsWith('{') && !trimmedRaw.startsWith('[');

    // Audiovisual description detection across raw
    const visualDescriptionDetected = visualDescriptionViolationsCount > 0 || detectVisualDescription(rawText);
    const skuAttributeDetected = skuAttributeViolationsCount > 0;

    const allScenesValid = sceneValidations.length === 12 && sceneValidations.every(s => s.valid);

    const homologationStatus: 'PASS' | 'PARTIAL' = (
        variations.length === 6 &&
        compliantCharCount === 12 &&
        carrinhoLaranjaCount === 6 &&
        !explicitPriceDetected &&
        !installmentDetected &&
        !discountDetected &&
        !stockDetected &&
        !unsupportedClaimsDetected &&
        !scene1Detected &&
        !visualDescriptionDetected &&
        visualDescriptionViolationsCount === 0 &&
        !skuAttributeDetected &&
        skuAttributeViolationsCount === 0 &&
        allScenesValid
    ) ? 'PASS' : 'PARTIAL';

    return {
        versionsCount: variations.length,
        scene2Count,
        scene3Count,
        characterComplianceCount: compliantCharCount,
        carrinhoLaranjaCount,
        visualDescriptionDetected,
        visualDescriptionViolationsCount,
        skuAttributeDetected,
        skuAttributeViolationsCount,
        scene1Detected,
        explicitPrice: explicitPriceDetected,
        installmentViolationDetected: installmentDetected,
        discountClaim: discountDetected,
        inventedStock: stockDetected,
        inventedDeadline,
        unsupportedClaimsDetected,
        preambleDetected,
        sceneDetails,
        sceneValidations,
        uniqueIds1to6,
        allScenesValid,
        homologationStatus
    };
}
