/**
 * Clean Product Brief Fact Extraction Engine (Copy Master Core Adoption)
 * Extracts structured verified facts from input text and evidence without hallucinations.
 * Provides Anti-SKU term detection and commercial signal classification.
 */

import {
    CleanDVideoFactSelection,
    CleanProductBrief,
    CommercialEvidence,
    CommercialEvidenceLevel,
    DEFAULT_COMMERCIAL_EVIDENCE,
    ProductInfoAuthorityInput,
    ProductInfoAuthorityResult,
    ProductInfoAuthoritySource
} from './types';

// Standalone SKU pattern keywords that must never be emitted as solitary scene copy
const COMMON_SKU_TERMS = [
    '4 andares', '5 andares', '3 andares', '6 andares',
    'preto', 'branco', 'azul', 'vermelho', 'cinza', 'rosa', 'dourado', 'prata',
    'ferrari black', 'ferrari red', 'kit com 2 perfumes', 'kit ferrari red + black',
    'scuderia ferrari black individual', 'kit contendo os dois perfumes',
    '100ml', '50ml', '200ml', 'p', 'm', 'g', 'gg', 'tam p', 'tam m', 'tam g',
    '110v', '220v', 'bivolt', 'unidade única', 'kit 2x', 'kit 3x', 'combo 2 em 1'
];

/**
 * Generic / Insufficient title patterns that must not be treated as a definitive product identity.
 */
export const GENERIC_TITLE_PATTERNS: readonly string[] = Object.freeze([
    'produto',
    'produto premium',
    'produto em destaque',
    'item',
    'imagem enviada',
    'oferta especial',
    'presente',
    'acessório',
    'acessorio',
    'sem título',
    'sem titulo',
    'untitled',
    'product',
    'image',
    'foto',
    'foto do produto',
    'imagem',
    'n/a',
    'desconhecido',
    'unknown'
]);

/**
 * Deterministically checks whether a product title is missing, generic, or insufficient.
 */
export function isGenericOrInsufficientTitle(title?: string | null): boolean {
    if (!title || typeof title !== 'string') return true;
    const clean = title.trim().toLowerCase();
    if (clean.length <= 2) return true;
    if (GENERIC_TITLE_PATTERNS.includes(clean)) return true;
    if (/^(?:produto|item|product|image|foto|oferta)\s*(?:[0-9]+|premium|destaque|novo|especial)?$/i.test(clean)) return true;
    return false;
}

/**
 * Regex for detecting commercial bundle/kit keywords.
 */
export const BUNDLE_TERMS_REGEX = /\b(kit|combo|bundle|set|conjunto|pacote\s+completo|pack|cole[çc][ãa]o)\b/i;

export const BUNDLE_TERMS_LIST: readonly string[] = Object.freeze([
    'kit',
    'combo',
    'bundle',
    'set',
    'conjunto',
    'pacote completo',
    'pack',
    'coleção'
]);

/**
 * Deterministically checks whether bundle/kit terms are explicitly authorized by high-priority sources
 * (product title, product identity, product description, or user-provided manual facts).
 * 
 * Commercial bundle terms are strictly FORBIDDEN if they only originate from visual image observations.
 */
export function isBundleTermAuthorized(sources: {
    title?: string | null;
    identity?: string | null;
    description?: string | null;
    userFacts?: (string | null | undefined)[] | null;
} | string | null | undefined): boolean {
    if (!sources) return false;

    if (typeof sources === 'string') {
        return BUNDLE_TERMS_REGEX.test(sources);
    }

    const textParts = [
        sources.title,
        sources.identity,
        sources.description,
        ...(Array.isArray(sources.userFacts) ? sources.userFacts : [])
    ].filter((p): p is string => typeof p === 'string' && Boolean(p.trim()));

    return textParts.some(t => BUNDLE_TERMS_REGEX.test(t));
}

/**
 * Clean trailing catalog/SKU codes from product name strings.
 */
export function cleanCatalogCodeSuffix(name: string): string {
    if (!name) return '';
    return name
        // Strip trailing alphanumeric model codes like MGSS1159D2KX, REF1234, SKU-999
        .replace(/\b(?:MGSS[A-Z0-9]+|REF[:\s]?[A-Z0-9]+|SKU[:\s]?[A-Z0-9]+|[A-Z]{2,4}\d{4,8}[A-Z0-9]*)\b/gi, '')
        // Strip trailing punctuation / spaces
        .replace(/[-–—,:;]\s*$/, '')
        .trim();
}

/**
 * Resolves product information using the strict 5-level Semantic Authority Fallback Hierarchy:
 * 1. Product title / product identity
 * 2. Product description
 * 3. User-provided manual facts
 * 4. Image-observed components
 * 5. Safe generic fallback
 * 
 * Rules:
 * - Higher-priority sources override lower-priority sources.
 * - Lower-priority sources may fill missing information, but must not contradict, exaggerate, or commercially upgrade higher-priority sources.
 * - If product title or description clearly defines the product type: follow it, use image only to confirm visible components, do not infer kit/combo from image alone.
 * - If title/description is empty/generic: use image-observed components to structure product description with neutral component wording.
 * - Commercial bundle terms (kit, combo, bundle, set, conjunto, pacote completo, pack, coleção) are authorized ONLY when explicitly present in sources 1, 2, or 3.
 */
export function resolveProductInfoAuthority(input: ProductInfoAuthorityInput | string): ProductInfoAuthorityResult {
    let title: string | undefined;
    let description: string | undefined;
    let userFacts: string[] = [];
    let imageComponents: string[] = [];
    let imageContextText: string | undefined;

    if (typeof input === 'string') {
        const raw = input.trim();
        // Check for explicit "Produto: ..." or "Nome: ..." prefixes
        const explicitMatch = raw.match(/(?:produto|nome(?:\s+do\s+produto)?|item)\s*:\s*([^\n,.;]+)/i);
        if (explicitMatch && explicitMatch[1]?.trim()) {
            title = explicitMatch[1].trim();
        } else {
            const firstLine = raw.split('\n')[0].replace(/^#+\s*/, '').replace(/^[-*•\d.)]+\s*/, '').trim();
            title = firstLine;
        }

        const lines = raw.split(/\n+/).map(l => l.trim()).filter(Boolean);
        description = lines.length > 1 ? lines.slice(1).join('\n') : undefined;
        userFacts = lines;
    } else if (input && typeof input === 'object') {
        title = input.title ? input.title.trim() : undefined;
        description = input.description ? input.description.trim() : undefined;
        userFacts = Array.isArray(input.userFacts) ? input.userFacts.filter((f): f is string => typeof f === 'string' && Boolean(f.trim())) : [];
        imageComponents = Array.isArray(input.imageComponents) ? input.imageComponents.filter((c): c is string => typeof c === 'string' && Boolean(c.trim())) : [];
        imageContextText = input.imageContextText ? input.imageContextText.trim() : undefined;
    }

    // Determine bundle authorization strictly from high-priority sources (1, 2, 3)
    const isBundleAuthorized = isBundleTermAuthorized({
        title,
        description,
        userFacts
    });

    const authorizedBundleTerms = isBundleAuthorized
        ? BUNDLE_TERMS_LIST.filter(term => {
            const regex = new RegExp(`\\b${term}\\b`, 'i');
            return (title && regex.test(title)) ||
                   (description && regex.test(description)) ||
                   userFacts.some(f => regex.test(f));
        })
        : [];

    let primaryProductName = 'Produto em Destaque';
    let productType = 'Produto';
    let selectedAuthoritySource: ProductInfoAuthoritySource = 'generic_fallback';
    const visibleComponents: string[] = [...imageComponents];

    // Priority 1: Product title / product identity
    if (title && !isGenericOrInsufficientTitle(title)) {
        const cleanedTitle = cleanCatalogCodeSuffix(title);
        if (cleanedTitle.length > 2 && !isGenericOrInsufficientTitle(cleanedTitle)) {
            primaryProductName = cleanedTitle;
            productType = cleanedTitle;
            selectedAuthoritySource = 'title';
        }
    }

    // Priority 2: Product description (if title is absent or generic)
    if (selectedAuthoritySource === 'generic_fallback' && description && description.length > 3) {
        const descTitle = extractCleanProductName(description);
        if (!isGenericOrInsufficientTitle(descTitle)) {
            primaryProductName = descTitle;
            productType = descTitle;
            selectedAuthoritySource = 'description';
        }
    }

    // Priority 3: User-provided manual facts (if title and description are absent or generic)
    if (selectedAuthoritySource === 'generic_fallback' && userFacts.length > 0) {
        for (const fact of userFacts) {
            if (fact && fact.length > 3 && !isGenericOrInsufficientTitle(fact)) {
                const factTitle = extractCleanProductName(fact);
                if (!isGenericOrInsufficientTitle(factTitle)) {
                    primaryProductName = factTitle;
                    productType = factTitle;
                    selectedAuthoritySource = 'user_facts';
                    break;
                }
            }
        }
    }

    // Priority 4: Image-observed components (when title/desc/facts are missing or generic)
    if (selectedAuthoritySource === 'generic_fallback') {
        if (visibleComponents.length > 0) {
            selectedAuthoritySource = 'image_components';
            if (visibleComponents.length === 1) {
                primaryProductName = visibleComponents[0];
                productType = visibleComponents[0];
            } else if (visibleComponents.length === 2) {
                primaryProductName = `${visibleComponents[0]} e ${visibleComponents[1]} apresentados juntos`;
                productType = `${visibleComponents[0]} e ${visibleComponents[1]}`;
            } else {
                primaryProductName = `Itens exibidos juntos: ${visibleComponents.slice(0, 3).join(', ')}`;
                productType = 'Itens exibidos juntos';
            }
        } else if (imageContextText && imageContextText.length > 3) {
            const imgTitle = extractCleanProductName(imageContextText);
            if (!isGenericOrInsufficientTitle(imgTitle)) {
                primaryProductName = imgTitle;
                productType = imgTitle;
                selectedAuthoritySource = 'image_components';
            }
        }
    }

    // Neutral visual description construction for multiple components
    let neutralDescription = '';
    if (visibleComponents.length > 1) {
        if (!isBundleAuthorized) {
            neutralDescription = `Componentes visíveis exibidos individualmente: ${visibleComponents.join(' + ')}. (Não inferir kit/combo/conjunto sem autorização explícita).`;
        } else {
            neutralDescription = `Itens do conjunto/kit autorizado: ${visibleComponents.join(', ')}.`;
        }
    } else if (visibleComponents.length === 1) {
        neutralDescription = `Componente visível: ${visibleComponents[0]}.`;
    }

    // Combine video relevant facts according to authority
    const videoRelevantFacts: string[] = [];
    if (selectedAuthoritySource === 'title' || selectedAuthoritySource === 'description' || selectedAuthoritySource === 'user_facts') {
        videoRelevantFacts.push(primaryProductName);
        for (const comp of visibleComponents) {
            const compFact = `Componente visível: ${comp}`;
            if (!videoRelevantFacts.includes(compFact) && !videoRelevantFacts.includes(comp)) {
                videoRelevantFacts.push(compFact);
            }
        }
    } else if (selectedAuthoritySource === 'image_components') {
        if (visibleComponents.length > 0) {
            for (const comp of visibleComponents) {
                videoRelevantFacts.push(comp);
            }
        } else {
            videoRelevantFacts.push(primaryProductName);
        }
    } else {
        videoRelevantFacts.push('Produto em Destaque');
    }

    const compressedContext = [
        `PRODUTO: ${primaryProductName}`,
        `FONTE DE AUTORIDADE: ${selectedAuthoritySource.toUpperCase()}`,
        isBundleAuthorized
            ? `TERMOS DE CONJUNTO/KIT AUTORIZADOS: ${authorizedBundleTerms.join(', ') || 'Sim'}`
            : `TERMOS DE CONJUNTO/KIT: PROIBIDOS (descrever componentes individualmente de forma neutra)`,
        neutralDescription ? `DESCRIÇÃO NEUTRA: ${neutralDescription}` : '',
        videoRelevantFacts.length > 0 ? `FATOS VERIFICADOS:\n${videoRelevantFacts.map(f => `- ${f}`).join('\n')}` : ''
    ].filter(Boolean).join('\n\n');

    return {
        primaryProductName,
        productType,
        selectedAuthoritySource,
        isBundleAuthorized,
        authorizedBundleTerms,
        visibleComponents,
        neutralDescription,
        videoRelevantFacts,
        compressedContext
    };
}

/**
 * Extract clean product title/name from user input context
 */
export function extractCleanProductName(input: string): string {
    if (!input || typeof input !== 'string') return 'Produto';

    const clean = input.trim();

    // Check for explicit "Produto: ..." or "Nome: ..." prefixes
    const explicitMatch = clean.match(/(?:produto|nome(?:\s+do\s+produto)?|item)\s*:\s*([^\n,.;]+)/i);
    if (explicitMatch && explicitMatch[1]?.trim()) {
        const extracted = cleanCatalogCodeSuffix(explicitMatch[1].trim());
        if (extracted.length > 2) return extracted;
    }

    // Check first line if descriptive
    const firstLine = clean.split('\n')[0].replace(/^#+\s*/, '').replace(/^[-*•\d.)]+\s*/, '').trim();
    if (firstLine.length > 3 && firstLine.length <= 80) {
        const cleanedFirstLine = cleanCatalogCodeSuffix(firstLine);
        // If first line mentions a specific brand/product, keep it
        if (/rel[oó]gio|sapateira|perfume|hidratante|fone|lumin[aá]ria|organizador|escova/i.test(cleanedFirstLine)) {
            return cleanedFirstLine;
        }
    }

    // Check known categories/products
    if (/sapateira/i.test(clean)) return 'Sapateira Organizadora';
    if (/scuderia\s+ferrari|ferrari\s+black|ferrari\s+red|perfume/i.test(clean)) return 'Perfume Importado Masculino';
    if (/hidratante\s+facial|creme\s+facial|sérum\s+facial/i.test(clean)) return 'Hidratante Facial';
    if (/fone\s+(?:de\s+ouvido|sem\s+fio|bluetooth)|airdots|earbuds/i.test(clean)) return 'Fone de Ouvido Sem Fio';
    if (/rel[oó]gio/i.test(clean)) return 'Relógio de Pulso';
    if (/smartwatch/i.test(clean)) return 'Smartwatch';
    if (/lumin[aá]ria|abajur/i.test(clean)) return 'Luminária';
    if (/organizador/i.test(clean)) return 'Organizador Multiuso';
    if (/escova\s+alisadora|escova\s+secadora/i.test(clean)) return 'Escova Secadora';

    if (firstLine.length > 0 && firstLine.length <= 60) {
        return cleanCatalogCodeSuffix(firstLine) || firstLine;
    }

    return 'Produto em Destaque';
}

/**
 * Detect product category from text
 */
export function detectProductCategory(input: string): string {
    const lower = (input || '').toLowerCase();
    if (/sapateira|organizador|cabide|prateleira|gaveteiro/i.test(lower)) return 'Casa & Organização';
    if (/perfume|fragr[aâ]ncia|col[oô]nia|ferrari/i.test(lower)) return 'Perfumaria & Beleza';
    if (/hidratante|pele|facial|s[eé]rum|rugas|anti-idade|cosm[eé]tico/i.test(lower)) return 'Cuidados com a Pele & Cosméticos';
    if (/rel[oó]gio|smartwatch/i.test(lower)) return 'Relógios & Acessórios';
    if (/fone|bluetooth|celular|cabo|carregador|eletr[oô]nico/i.test(lower)) return 'Eletrônicos & Tecnologia';
    if (/panela|cozinha|faca|utens[ií]lio|garrafa|copo/i.test(lower)) return 'Cozinha & Utilidades';
    if (/camisa|vestido|cal[cç]a|roupa|moda/i.test(lower)) return 'Moda & Acessórios';
    return 'Geral';
}

/**
 * Deterministically filters, selects, and compresses product facts for Clean D Lab video generation.
 * Enforces Semantic Authority Fallback Hierarchy:
 * Title/Identity > Description > User Facts > Image Components > Generic Fallback.
 * Strips CNPJs, vendor/legal metadata, excessive catalog measurements, and unverified store slogans.
 * Selects 2-4 video-relevant, buyer-friendly facts without fabricating commercial bundles.
 */
export function selectCleanDVideoFacts(
    productContext: string | ProductInfoAuthorityInput,
    imageContextText?: string
): CleanDVideoFactSelection {
    const authorityResult = resolveProductInfoAuthority(productContext);

    let raw = '';
    if (typeof productContext === 'string') {
        raw = productContext.trim();
    } else if (productContext && typeof productContext === 'object') {
        const parts = [
            productContext.title,
            productContext.description,
            ...(productContext.userFacts || []),
            productContext.imageContextText || imageContextText
        ].filter(Boolean);
        raw = parts.join('\n');
    }

    if (!raw) {
        return {
            primaryProductName: authorityResult.primaryProductName || 'Produto em Destaque',
            videoRelevantFacts: [],
            ignoredMetadata: [],
            safeClaimWarnings: [
                'Não inventar preço, desconto, parcelamento ou escassez de estoque.',
                'Utilizar 2 a 3 fatos por variação para respeitar o limite de 160 a 175 caracteres.',
                'Não usar termos de kit, combo, bundle, set ou conjunto sem autorização explícita em texto.'
            ],
            compressedContext: authorityResult.compressedContext || 'Produto em Destaque.',
            authorityResult
        };
    }

    const primaryProductName = authorityResult.primaryProductName || extractCleanProductName(raw);
    const ignoredMetadata: string[] = [];
    const videoRelevantFacts: string[] = [];
    const safeClaimWarnings: string[] = [
        'Ignorar CNPJ, metadados fiscais e informações cadastrais de fornecedor.',
        'Não citar medidas técnicas excessivas de catálogo que não agregam valor à locução do vídeo.',
        'Não inventar preços, parcelamentos, descontos, prazos ou garantias não comprovadas.',
        'Usar estritamente 2 a 3 fatos selecionados por variação para respeitar o limite de 160 a 175 caracteres.',
        ...(authorityResult.isBundleAuthorized
            ? [`Termos de conjunto/kit autorizados pelo contexto: ${authorityResult.authorizedBundleTerms.join(', ') || 'sim'}.`]
            : ['Não usar termos de kit, combo, bundle, set ou conjunto (descrever componentes individualmente de forma neutra).'])
    ];

    const lines = raw.split(/\n+/).map(l => l.trim()).filter(Boolean);

    for (const line of lines) {
        const cleanLine = line.replace(/^(?:[-*•]|\d+[.)])\s*/, '').trim();
        const lower = cleanLine.toLowerCase();

        // 1. Detect CNPJ / CPF / Tax / Legal metadata
        if (/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b|\bCNPJ\b|\bCPF\b|\bInscrição\s+Estadual\b|\bIE\b/i.test(cleanLine)) {
            ignoredMetadata.push(`${cleanLine} (CNPJ / dados fiscais e cadastrais)`);
            continue;
        }

        // 2. Detect Vendor / Supplier / Distributor / Corporate legal details
        if (/\b(?:fornecedor|fornecedores|fabricante|razão\s+social|distribuidor|distribuído\s+por|importado\s+por|sac@|email\s+de\s+contato|atendimento\s+ao\s+cliente|s\.?a\.?|ltda)\b/i.test(lower)) {
            ignoredMetadata.push(`${cleanLine} (metadados de fornecedor / dados corporativos)`);
            continue;
        }

        // 3. Detect Warranty / Guarantee (unless explicitly needed)
        if (/\b(?:garantia\s+de\s+\d+|garantia\s+do\s+fornecedor|\d+\s+ano(?:s)?\s+de\s+garantia|\d+\s+meses\s+de\s+garantia|garantia\s+de\s+fábrica)\b/i.test(lower)) {
            ignoredMetadata.push(`${cleanLine} (garantia / termo de fornecedor)`);
            continue;
        }

        // 4. Detect Store Marketing Slogans / Generic Store Claims
        if (/\b(?:maior\s+loja\s+do\s+brasil|melhor\s+loja|líder\s+em\s+vendas|satisfação\s+100%\s+garantida|compre\s+com\s+quem\s+entende|loja\s+oficial|envio\s+imediato|pronta\s+entrega)\b/i.test(lower)) {
            ignoredMetadata.push(`${cleanLine} (slogan ou alegação genérica de loja)`);
            continue;
        }

        // 5. Detect Excessive Catalog Micro-Measurements (e.g. 0.9 cm espessura, 4.4 cm diâmetro, 26 cm comprimento, peso 142g)
        if (
            /\d+(?:[.,]\d+)?\s*(?:cm|mm|m|pol|polegadas?)\s*(?:de\s+)?(?:di[aáâã]metro|espessura|largura|altura|comprimento|profundidade)/i.test(lower) ||
            /(?:di[aáâã]metro|espessura|largura|altura|comprimento|profundidade)\s*(?:de|:)?\s*\d+(?:[.,]\d+)?\s*(?:cm|mm|m|pol|polegadas?)/i.test(lower) ||
            /(?:peso|peso\s+l[ií]quido)\s*(?:de|:)?\s*\d+(?:[.,]\d+)?\s*(?:g|kg|gramas)/i.test(lower) ||
            /^\s*\d+(?:[.,]\d+)?\s*(?:cm|mm|m|g|kg)\s*$/i.test(lower)
        ) {
            ignoredMetadata.push(`${cleanLine} (medidas técnicas excessivas de catálogo)`);
            continue;
        }

        // 6. Detect Video-Relevant Product Facts
        // Positive signals: materials, visual finishes, mechanisms, practical features, utility, styling
        const isMaterial = /aço|dourad[oa]|pratead[oa]|couro|metal|vidro|safira|cerâmica|silicone|resina|madeira|algodão|tecido/i.test(lower);
        const isMechanismOrFeature = /anal[oó]gico|digital|cronógrafo|calend[aá]rio|resist[êe]ncia\s+[àa]\s+[áa]gua|\d+\s*atm|water\s*resist|fecho|bot[õo]es|dobr[aá]vel|bateria|bluetooth|camadas|andares|gavetas|fórmula|toque\s+seco|ativação|instalador|dvd|cartão/i.test(lower);
        const isStyleOrBenefit = /esportiv[oa]|cl[aá]ssic[oa]|elegante|masculin[oa]|feminin[oa]|casual|modern[oa]|confort[aá]vel|organiza|pr[aá]tic[oa]|dur[aá]vel/i.test(lower);

        if ((isMaterial || isMechanismOrFeature || isStyleOrBenefit) && cleanLine.length >= 6 && cleanLine.length <= 110) {
            // Avoid duplicates
            if (!videoRelevantFacts.some(f => f.toLowerCase() === cleanLine.toLowerCase())) {
                videoRelevantFacts.push(cleanLine);
            }
        }
    }

    // If no specific facts were extracted by regex, fall back to safe non-metadata lines
    if (videoRelevantFacts.length === 0) {
        for (const line of lines) {
            const cleanLine = line.replace(/^(?:[-*•]|\d+[.)])\s*/, '').trim();
            if (cleanLine.length >= 6 && cleanLine.length <= 100 && !ignoredMetadata.some(im => im.startsWith(cleanLine))) {
                videoRelevantFacts.push(cleanLine);
                if (videoRelevantFacts.length >= 4) break;
            }
        }
    }

    // If authority provided facts/components that aren't yet in videoRelevantFacts, append them safely
    if (authorityResult.videoRelevantFacts && authorityResult.videoRelevantFacts.length > 0) {
        for (const af of authorityResult.videoRelevantFacts) {
            if (!videoRelevantFacts.some(vf => vf.toLowerCase() === af.toLowerCase())) {
                videoRelevantFacts.push(af);
            }
        }
    }

    // Limit to max 5 video-relevant facts so model has a tight, high-signal bank
    const finalFacts = videoRelevantFacts.slice(0, 5);

    // Build concise compressed context incorporating authority guidelines
    const factsList = finalFacts.length > 0
        ? finalFacts.map(f => `- ${f}`).join('\n')
        : `- ${primaryProductName}`;

    const authoritySection = authorityResult.isBundleAuthorized
        ? `TERMOS DE CONJUNTO/KIT AUTORIZADOS: ${authorityResult.authorizedBundleTerms.join(', ') || 'Sim'}`
        : `TERMOS DE CONJUNTO/KIT: PROIBIDOS (descrever componentes individualmente de forma neutra)`;

    const compressedContext = [
        `PRODUTO: ${primaryProductName}`,
        `FONTE DE AUTORIDADE: ${authorityResult.selectedAuthoritySource.toUpperCase()}`,
        authoritySection,
        authorityResult.neutralDescription ? `DESCRIÇÃO NEUTRA DOS COMPONENTES: ${authorityResult.neutralDescription}` : '',
        `FATOS RELEVANTES PARA VÍDEO (ESCOLHA 2 OU 3 POR VARIAÇÃO):\n${factsList}`,
        ignoredMetadata.length > 0 ? `METADADOS IGNORADOS (NÃO USAR NA COPY):\n${ignoredMetadata.slice(0, 5).map(m => `- ${m}`).join('\n')}` : ''
    ].filter(Boolean).join('\n\n');

    return {
        primaryProductName,
        videoRelevantFacts: finalFacts,
        ignoredMetadata,
        safeClaimWarnings,
        compressedContext,
        authorityResult
    };
}

/**
 * Extract confirmed factual features without hallucinations
 */
export function extractConfirmedFeatures(input: string): string[] {
    if (!input) return [];
    const selection = selectCleanDVideoFacts(input);
    if (selection.videoRelevantFacts.length > 0) {
        return selection.videoRelevantFacts;
    }

    const features: string[] = [];
    const lines = input.split(/\n+/).map(l => l.trim()).filter(Boolean);

    for (const line of lines) {
        const cleanLine = line.replace(/^[-*•\d.)]+\s*/, '').trim();
        if (cleanLine.length > 5 && cleanLine.length < 120) {
            if (
                /material|capacidade|tamanho|andares|ml|g|bateria|autonomia|potência|ingredientes|fórmula|acabamento|design|camadas/i.test(cleanLine) ||
                cleanLine.split(' ').length <= 15
            ) {
                if (!features.includes(cleanLine) && !cleanLine.toLowerCase().startsWith('http')) {
                    features.push(cleanLine);
                }
            }
        }
    }

    return features.slice(0, 6);
}

/**
 * Extract confirmed practical benefits
 */
export function extractConfirmedBenefits(input: string): string[] {
    if (!input) return [];
    const benefits: string[] = [];
    const lower = input.toLowerCase();

    if (/otimiza|espaço|organiza|arruma/i.test(lower)) {
        benefits.push('Otimiza o espaço no ambiente e mantém tudo organizado com facilidade');
    }
    if (/absorção|toque seco|sem oleosidade|hidrata/i.test(lower)) {
        benefits.push('Hidrata profundamente com toque aveludado sem pesar na pele');
    }
    if (/fixação|aroma|marcant|duradouro/i.test(lower)) {
        benefits.push('Fragrância marcante e sofisticada com excelente durabilidade');
    }
    if (/praticidade|fácil de usar|fácil de montar|dia a dia/i.test(lower)) {
        benefits.push('Praticidade imediata para a rotina diária');
    }
    if (/resistente|durável|alta qualidade/i.test(lower)) {
        benefits.push('Estrutura durável e resistente projetada para longa vida útil');
    }

    return benefits;
}

/**
 * Extract isolated SKU terms present in the context to construct strict anti-SKU guardrails
 */
export function extractForbiddenSkuTerms(input: string): string[] {
    if (!input) return [];
    const lower = input.toLowerCase();
    const detected: string[] = [];

    for (const term of COMMON_SKU_TERMS) {
        if (lower.includes(term.toLowerCase())) {
            detected.push(term);
        }
    }

    // Also match regex patterns for floor counts or kit counts (e.g. "\d+ andares", "kit com \d+")
    const dynamicMatches = input.match(/\b\d+\s+(?:andares|prateleiras|gavetas|peças|unidades|pares|perfumes)\b/gi) || [];
    for (const m of dynamicMatches) {
        const cleanM = m.trim().toLowerCase();
        if (!detected.includes(cleanM)) {
            detected.push(cleanM);
        }
    }

    return detected;
}

/**
 * Build structured CleanProductBrief from user inputs and commercial evidence.
 * Integrates Copy Master's fact extraction precision while adhering strictly to Clean D constraints.
 */
export function buildCleanProductBrief(
    input: string | ProductInfoAuthorityInput,
    commercialEvidence?: CommercialEvidence,
    imageContextText?: string
): CleanProductBrief {
    let rawContext = '';
    if (typeof input === 'string') {
        rawContext = [input, imageContextText].filter(Boolean).join('\n\n').trim();
    } else if (input && typeof input === 'object') {
        rawContext = [
            input.title,
            input.description,
            ...(input.userFacts || []),
            input.imageContextText || imageContextText
        ].filter(Boolean).join('\n\n').trim();
    }

    const videoFactSelection = selectCleanDVideoFacts(input, imageContextText);
    const productName = videoFactSelection.primaryProductName || extractCleanProductName(rawContext);
    const category = detectProductCategory(rawContext);
    const confirmedFeatures = videoFactSelection.videoRelevantFacts.length > 0
        ? videoFactSelection.videoRelevantFacts
        : extractConfirmedFeatures(rawContext);
    const confirmedBenefits = extractConfirmedBenefits(rawContext);
    const forbiddenSkuTerms = extractForbiddenSkuTerms(rawContext);

    // Extract commercial signals
    const hasPrice = /(?:R\$|R\s*\$|preço|valor)\s*[\d.,]+/i.test(rawContext);
    const priceMatch = rawContext.match(/(?:a\s+partir\s+de\s+)?R\$\s*[\d.,]+/i);
    const priceText = priceMatch ? priceMatch[0] : undefined;

    const hasDiscount = /(?:\d+%\s*off|desconto|economize|promoção)/i.test(rawContext);
    const discountMatch = rawContext.match(/(?:\d+%\s*off|R\$\s*[\d.,]+\s+de\s+desconto)/i);
    const discountText = discountMatch ? discountMatch[0] : undefined;

    const hasUrgencyOrDeadline = /(?:oferta\s+rel[âa]mpago|só\s+hoje|tempo\s+limitado|prazo|termina\s+em)/i.test(rawContext);
    const hasStockLimit = /(?:últim[ao]s?\s+unidades|poucas\s+peças|estoque\s+limitado)/i.test(rawContext);
    const hasFreeShipping = /frete\s*gr[áa]tis/i.test(rawContext);
    const hasGuarantee = /garantia/i.test(rawContext);
    const hasTikTokShop = /tiktok\s+shop|carrinho\s+laranja|sacola/i.test(rawContext);
    const hasSocialProof = /avaliaç|vendidos|estrelas|positivas/i.test(rawContext);

    // Compute evidence level aligned with CommercialEvidence
    let evidenceLevel: CommercialEvidenceLevel = 0;
    if (commercialEvidence) {
        evidenceLevel = commercialEvidence.level;
    } else if (hasDiscount || hasUrgencyOrDeadline) {
        evidenceLevel = 2;
    } else if (hasPrice) {
        evidenceLevel = 1;
    }

    return {
        productName,
        category,
        confirmedFeatures,
        confirmedBenefits,
        commercialSignals: {
            hasPrice,
            priceText,
            hasDiscount,
            discountText,
            hasUrgencyOrDeadline,
            hasStockLimit,
            hasFreeShipping,
            hasGuarantee,
            hasTikTokShop,
            hasSocialProof
        },
        evidenceLevel,
        forbiddenSkuTerms,
        rawContext,
        videoFactSelection
    };
}

