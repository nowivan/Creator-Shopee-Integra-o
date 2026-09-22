import {
    AgentCopyVariation,
    SceneCharacterCount,
    V2RuleComplianceReport,
    V2HomologationSessionRecord,
    V2VariationManualReview
} from './types';

const STORAGE_KEY = 'agente_de_copy_v2_homologation_sessions';

/**
 * Detects if the exact supplied price leaked into the generated copy.
 * E.g. input "49,90" or "R$ 49,90" -> output "aproveite por R$ 49,90".
 */
export function findExactPriceLeaks(rawText: string, inputPrice?: string): string[] {
    if (!inputPrice || !inputPrice.trim()) {
        return [];
    }

    const trimmed = inputPrice.trim();
    const foundMatches: string[] = [];

    // 1. Literal match of the trimmed input price string
    if (trimmed.length >= 2) {
        const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s*');
        const literalRegex = new RegExp(escaped, 'gi');
        const literalHits = rawText.match(literalRegex);
        if (literalHits) {
            foundMatches.push(...literalHits);
        }
    }

    // 2. Numeric component match (e.g. "49,90" -> 49 and 90, "179.90" -> 179 and 90)
    const numMatch = trimmed.match(/\b(\d+)(?:[.,](\d{1,2}))?\b/);
    if (numMatch) {
        const intPart = numMatch[1];
        const decPart = numMatch[2];

        if (decPart) {
            // Numbers with cents / decimal (e.g., 49,90 or 49.90)
            const pattern = new RegExp(`(?:R\\$\\s*)?\\b${intPart}[.,]${decPart}\\b(?:\\s*reais)?`, 'gi');
            const hits = rawText.match(pattern);
            if (hits) {
                foundMatches.push(...hits);
            }
        } else if (intPart.length >= 2) {
            // Integer price >= 10 (with currency context to prevent false matching with character counts like 165)
            const pattern = new RegExp(`(?:R\\$\\s*\\b${intPart}\\b|\\b${intPart}\\s*reais\\b)`, 'gi');
            const hits = rawText.match(pattern);
            if (hits) {
                foundMatches.push(...hits);
            }
        }
    }

    return Array.from(new Set(foundMatches.map(m => m.trim())));
}

/**
 * Pure factual audit of the RAW text without rewriting or modifying it.
 * Evaluates all specified safety, guideline, and structural rules.
 */
export function auditRuleCompliance(
    rawText: string,
    variations: AgentCopyVariation[],
    inputProductPrice?: string
): V2RuleComplianceReport {
    // 1. Explicit price (R$, reais, preço X)
    const priceRegex = /(?:R\$\s*\d+(?:[.,]\d+)?|\b\d+\s*reais\b|\bpreço(?:\s+é|\s+de|\s+por)?\s*R?\$?\s*\d+)/gi;
    
    // 2. Explicit discount (% de desconto, % off, etc.)
    const discountRegex = /(?:\b\d+%\s*de\s*desconto\b|\bdesconto\s+de\s+\d+%?|\bdesconto\s+exclusivo\b|\bcom\s+\d+%\s*off\b|\bpor\s+metade\s+do\s+preço\b|\bdescontão\b)/gi;
    
    // 3. Coupon
    const couponRegex = /(?:\bcupom\b|\bcódigo\s+promocional\b|\bcupom\s+de\s+desconto\b|\buse\s+o\s+cupom\b)/gi;
    
    // 4. Invented stock claim (últimas unidades, estoque acabando, etc.)
    const stockRegex = /(?:\búltimas\s+unidades\b|\bestoque\s+acabando\b|\brestam\s+apenas\b|\bpoucas\s+unidades\b|\bapenas\s+\d+\s+unidades\b|\bacabando\s+o\s+estoque\b|\búltimos\s+pares\b|\búltimas\s+peças\b|\bestoque\s+limitado\b|\bqueima\s+de\s+estoque\b)/gi;
    
    // 5. Invented deadline/time limit (só até hoje, válido por 24h, etc.)
    const deadlineRegex = /(?:\bsó\s+até\s+hoje\b|\bválid[oa]\s+por\s+\d+\s*horas?\b|\bencerra\s+à\s+meia[- ]noite\b|\bsó\s+hoje\b|\btermina\s+hoje\b|\búltimas\s+horas\b|\bcorre\s+que\s+acaba\s+hoje\b|\bprazo\s+limitado\b|\boferta\s+relâmpago\b|\bapenas\s+hoje\b)/gi;
    
    // 6. Installment / payment terms (12x sem juros, parcelas, etc.)
    const installmentRegex = /(?:\b\d+x\s+sem\s+juros\b|\bparcelad[oa]\b|\bparcelas?\s+de\s+R\$|\bno\s+cartão\s+em\s+\d+x\b|\bpagamento\s+único\b|\bmensalidade\b|\bvitalíci[oa]\b)/gi;
    
    // 7. Scene 1 (Forbidden)
    const scene1Regex = /(?:\bCENA\s*1\b|\bCENA\s*01\b|\bSCENE\s*1\b|\bSCENE\s*01\b)/gi;
    
    // 8. Preamble / explanation
    const preambleRegex = /(?:^(?:[\s\S]*?(?:aqui\s+estão|com\s+certeza|olá|como\s+solicitado|segue\s+abaixo|claro|analisando\s+a\s+imagem|com\s+base\s+na\s+imagem)[\s\S]*?)(?:---|VERSÃO))/i;
    
    // 9. Strategic headings
    const strategicHeadingsRegex = /(?:Ângulo|Estratégia|Opção\s+\d+|Versão\s+\d+\s*[-–:]\s*[A-Za-zÀ-ÿ]+|Foco\s+em|Abordagem|Gancho\s+\d+|Hook\s+\d+)/gi;
    
    // 10. Character-count annotations in RAW (e.g. "(165 caracteres)")
    const charCountAnnotationRegex = /(?:\(\s*\d+\s*(?:caracteres|chars|letras)\s*\)|\[\s*\d+\s*(?:caracteres|chars|letras)\s*\]|\b\d+\s*caracteres\s*:)/gi;

    const priceMatches = rawText.match(priceRegex) || [];
    const exactPriceMatches = findExactPriceLeaks(rawText, inputProductPrice);
    const discountMatches = rawText.match(discountRegex) || [];
    const couponMatches = rawText.match(couponRegex) || [];
    const stockMatches = rawText.match(stockRegex) || [];
    const deadlineMatches = rawText.match(deadlineRegex) || [];
    const installmentMatches = rawText.match(installmentRegex) || [];
    const scene1Matches = rawText.match(scene1Regex) || [];
    const preambleMatches = rawText.match(preambleRegex) || [];
    const strategicHeadingsMatches = rawText.match(strategicHeadingsRegex) || [];
    const charCountAnnotationMatches = rawText.match(charCountAnnotationRegex) || [];

    // CTA Audit: Count variations where scene3 contains "carrinho laranja"
    let scene3WithCarrinhoLaranjaCount = 0;
    const carrinhoLaranjaRegex = /carrinho\s*laranja/i;

    for (const v of variations) {
        if (v.scene3 && carrinhoLaranjaRegex.test(v.scene3)) {
            scene3WithCarrinhoLaranjaCount++;
        }
    }

    // Count total unique violation categories present
    let totalViolationsCount = 0;
    if (priceMatches.length > 0) totalViolationsCount++;
    if (discountMatches.length > 0) totalViolationsCount++;
    if (couponMatches.length > 0) totalViolationsCount++;
    if (stockMatches.length > 0) totalViolationsCount++;
    if (deadlineMatches.length > 0) totalViolationsCount++;
    if (installmentMatches.length > 0) totalViolationsCount++;
    if (scene1Matches.length > 0) totalViolationsCount++;
    if (preambleMatches.length > 0) totalViolationsCount++;
    if (strategicHeadingsMatches.length > 0) totalViolationsCount++;
    if (charCountAnnotationMatches.length > 0) totalViolationsCount++;

    return {
        explicitPrice: priceMatches.length > 0,
        priceMatches: Array.from(new Set(priceMatches.map(m => m.trim()))),
        exactPriceLeak: exactPriceMatches.length > 0,
        exactPriceMatches,
        explicitDiscount: discountMatches.length > 0,
        discountMatches: Array.from(new Set(discountMatches.map(m => m.trim()))),
        coupon: couponMatches.length > 0,
        couponMatches: Array.from(new Set(couponMatches.map(m => m.trim()))),
        inventedStockClaim: stockMatches.length > 0,
        stockMatches: Array.from(new Set(stockMatches.map(m => m.trim()))),
        inventedDeadline: deadlineMatches.length > 0,
        deadlineMatches: Array.from(new Set(deadlineMatches.map(m => m.trim()))),
        installmentTerms: installmentMatches.length > 0,
        installmentMatches: Array.from(new Set(installmentMatches.map(m => m.trim()))),
        scene1Detected: scene1Matches.length > 0,
        scene1Matches: Array.from(new Set(scene1Matches.map(m => m.trim()))),
        preambleDetected: preambleMatches.length > 0,
        preambleMatches: Array.from(new Set(preambleMatches.map(m => m.trim().slice(0, 80)))),
        strategicHeadings: strategicHeadingsMatches.length > 0,
        strategicHeadingsMatches: Array.from(new Set(strategicHeadingsMatches.map(m => m.trim()))),
        characterCountAnnotations: charCountAnnotationMatches.length > 0,
        characterCountAnnotationMatches: Array.from(new Set(charCountAnnotationMatches.map(m => m.trim()))),
        scene3WithCarrinhoLaranjaCount,
        totalViolationsCount
    };
}

/**
 * Calculates character breakdown metrics across the 12 scenes.
 */
export function calculateCharacterBreakdown(counts: SceneCharacterCount[]) {
    let compliantScenes = 0;
    let below160 = 0;
    let above175 = 0;

    const sceneDetails = counts.map(c => {
        if (c.scene2Valid) compliantScenes++;
        else if (c.scene2Length < 160) below160++;
        else if (c.scene2Length > 175) above175++;

        if (c.scene3Valid) compliantScenes++;
        else if (c.scene3Length < 160) below160++;
        else if (c.scene3Length > 175) above175++;

        return {
            versionNumber: c.id,
            scene2Length: c.scene2Length,
            scene2Compliant: c.scene2Valid,
            scene3Length: c.scene3Length,
            scene3Compliant: c.scene3Valid
        };
    });

    return {
        compliantScenes,
        below160,
        above175,
        totalScenes: 12,
        sceneDetails
    };
}

/**
 * Retrieves persisted homologation session records from local storage.
 * Does NOT contain base64 images.
 */
export function getHomologationSessions(): V2HomologationSessionRecord[] {
    try {
        if (typeof window === 'undefined') return [];
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        console.warn('Erro ao carregar sessões de homologação do localStorage:', e);
        return [];
    }
}

/**
 * Persists a new or updated homologation session record to local storage.
 */
export function saveHomologationSession(record: V2HomologationSessionRecord): void {
    try {
        if (typeof window === 'undefined') return;
        const current = getHomologationSessions();
        const existingIndex = current.findIndex(s => s.id === record.id);
        
        let updated: V2HomologationSessionRecord[];
        if (existingIndex >= 0) {
            updated = [...current];
            updated[existingIndex] = record;
        } else {
            updated = [record, ...current];
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
        console.warn('Erro ao salvar sessão de homologação no localStorage:', e);
    }
}

/**
 * Deletes a single homologation session record by id.
 */
export function deleteHomologationSession(id: string): void {
    try {
        if (typeof window === 'undefined') return;
        const current = getHomologationSessions();
        const updated = current.filter(s => s.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
        console.warn('Erro ao deletar sessão de homologação no localStorage:', e);
    }
}

/**
 * Clears all homologation session records from local storage.
 */
export function clearHomologationSessions(): void {
    try {
        if (typeof window === 'undefined') return;
        localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
        console.warn('Erro ao limpar sessões de homologação:', e);
    }
}
