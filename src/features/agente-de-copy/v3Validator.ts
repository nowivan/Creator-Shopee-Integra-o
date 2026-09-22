import { AgentCopyVariation, AgenteDeCopyV3ValidationResult, V3SceneDetail } from './types';
import { findExactPriceLeaks } from './homologationService';

/**
 * Pure read-only compliance validator for Agente de Copy V3.
 * Evaluates whether the generated output strictly obeys the original brain rules.
 * NEVER alters, polishes, or rewrites the copy text.
 */
export function validateV3Compliance(
    rawText: string,
    variations: AgentCopyVariation[],
    inputProductPrice?: string
): AgenteDeCopyV3ValidationResult {
    // 1. Structural counts
    const versionsDetected = variations.length;
    let scene2PresentCount = 0;
    let scene3PresentCount = 0;

    // 2. Character counts and per-scene details (160 to 175 chars)
    let characterComplianceCount = 0;
    const sceneDetails: V3SceneDetail[] = [];

    for (let i = 0; i < variations.length; i++) {
        const v = variations[i];
        const s2 = v.scene2 || '';
        const s3 = v.scene3 || '';

        if (s2.trim().length > 0) scene2PresentCount++;
        if (s3.trim().length > 0) scene3PresentCount++;

        const s2Len = s2.length;
        const s3Len = s3.length;
        const s2Valid = s2Len >= 160 && s2Len <= 175;
        const s3Valid = s3Len >= 160 && s3Len <= 175;

        if (s2Valid) characterComplianceCount++;
        if (s3Valid) characterComplianceCount++;

        sceneDetails.push({
            versionNumber: v.id || i + 1,
            scene2Length: s2Len,
            scene2Valid: s2Valid,
            scene3Length: s3Len,
            scene3Valid: s3Valid,
            scene2Text: s2,
            scene3Text: s3
        });
    }

    // 3. Prohibited Scene 1 detection
    const scene1Regex = /(?:\bCENA\s*1\b|\bCENA\s*01\b|\bSCENE\s*1\b|\bSCENE\s*01\b)/gi;
    const scene1Matches = rawText.match(scene1Regex) || [];

    // 4. CTA Audit: Carrinho laranja in scene3
    const carrinhoLaranjaRegex = /carrinho\s*laranja/i;
    let carrinhoLaranjaCount = 0;
    const carrinhoLaranjaMatches: string[] = [];

    for (const v of variations) {
        if (v.scene3 && carrinhoLaranjaRegex.test(v.scene3)) {
            carrinhoLaranjaCount++;
            const match = v.scene3.match(carrinhoLaranjaRegex);
            if (match) carrinhoLaranjaMatches.push(match[0]);
        }
    }

    // 5. Prohibited explicit price & exact price leaks
    const priceRegex = /(?:R\$\s*\d+(?:[.,]\d+)?|\b\d+\s*reais\b|\bpreço(?:\s+é|\s+de|\s+por)?\s*R?\$?\s*\d+)/gi;
    const priceMatches = rawText.match(priceRegex) || [];
    const exactPriceMatches = findExactPriceLeaks(rawText, inputProductPrice);

    // 6. Prohibited discounts
    const discountRegex = /(?:\b\d+%\s*de\s*desconto\b|\bdesconto\s+de\s+\d+%?|\bdesconto\s+exclusivo\b|\bcom\s+\d+%\s*off\b|\bpor\s+metade\s+do\s+preço\b|\bdescontão\b)/gi;
    const discountMatches = rawText.match(discountRegex) || [];

    // 7. Prohibited invented stock claims
    const stockRegex = /(?:\búltimas\s+unidades\b|\bestoque\s+acabando\b|\brestam\s+apenas\b|\bpoucas\s+unidades\b|\bapenas\s+\d+\s+unidades\b|\bacabando\s+o\s+estoque\b|\búltimos\s+pares\b|\búltimas\s+peças\b|\bestoque\s+limitado\b|\bqueima\s+de\s+estoque\b)/gi;
    const stockMatches = rawText.match(stockRegex) || [];

    // 8. Prohibited invented deadlines
    const deadlineRegex = /(?:\bsó\s+até\s+hoje\b|\bválid[oa]\s+por\s+\d+\s*horas?\b|\bencerra\s+à\s+meia[- ]noite\b|\bsó\s+hoje\b|\btermina\s+hoje\b|\búltimas\s+horas\b|\bcorre\s+que\s+acaba\s+hoje\b|\bprazo\s+limitado\b|\boferta\s+relâmpago\b|\bapenas\s+hoje\b)/gi;
    const deadlineMatches = rawText.match(deadlineRegex) || [];

    // 9. Prohibited preambles outside JSON or in text
    const preambleRegex = /(?:^(?:[\s\S]*?(?:aqui\s+estão|com\s+certeza|olá|como\s+solicitado|segue\s+abaixo|claro|analisando\s+a\s+imagem|com\s+base\s+na\s+imagem)[\s\S]*?)(?:\{|VERSÃO))/i;
    const preambleMatches = rawText.match(preambleRegex) || [];

    // 10. Check if IDs are unique 1-6
    const ids = variations.map(v => v.id);
    const uniqueIds = new Set(ids);
    const uniqueIds1to6 = ids.length === 6 && uniqueIds.size === 6 && [1, 2, 3, 4, 5, 6].every(num => uniqueIds.has(num));

    // Calculate total unique violations count
    let totalViolationsCount = 0;
    if (scene1Matches.length > 0) totalViolationsCount++;
    if (priceMatches.length > 0) totalViolationsCount++;
    if (exactPriceMatches.length > 0) totalViolationsCount++;
    if (discountMatches.length > 0) totalViolationsCount++;
    if (stockMatches.length > 0) totalViolationsCount++;
    if (deadlineMatches.length > 0) totalViolationsCount++;
    if (preambleMatches.length > 0) totalViolationsCount++;

    return {
        versionsDetected,
        scene2PresentCount,
        scene3PresentCount,
        characterComplianceCount,
        sceneDetails,
        scene1Detected: scene1Matches.length > 0,
        scene1Matches: Array.from(new Set(scene1Matches.map(m => m.trim()))),
        carrinhoLaranjaCount,
        carrinhoLaranjaMatches: Array.from(new Set(carrinhoLaranjaMatches)),
        explicitPrice: priceMatches.length > 0,
        priceMatches: Array.from(new Set(priceMatches.map(m => m.trim()))),
        exactPriceLeak: exactPriceMatches.length > 0,
        exactPriceMatches,
        discountClaim: discountMatches.length > 0,
        discountMatches: Array.from(new Set(discountMatches.map(m => m.trim()))),
        inventedStock: stockMatches.length > 0,
        stockMatches: Array.from(new Set(stockMatches.map(m => m.trim()))),
        inventedDeadline: deadlineMatches.length > 0,
        deadlineMatches: Array.from(new Set(deadlineMatches.map(m => m.trim()))),
        preambleDetected: preambleMatches.length > 0,
        preambleMatches: Array.from(new Set(preambleMatches.map(m => m.trim().slice(0, 80)))),
        uniqueIds1to6,
        totalViolationsCount
    };
}
