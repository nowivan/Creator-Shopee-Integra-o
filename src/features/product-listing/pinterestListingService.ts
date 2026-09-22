/**
 * Pinterest Pin Listing Service
 * Specialized module for generating SEO-friendly, evergreen, discovery-oriented Pinterest Pin listings.
 * 
 * Complies with Pinterest Pin creation UI fields:
 * - Título do Pin (Pin Title)
 * - Descrição do Pin (Pin Description)
 * - Link de Destino (Destination Link Guidance)
 * - Pasta Sugerida (Suggested Board/Pasta)
 * - Interesses / Tags Sugeridas (Suggested Interests/Tags)
 * - Texto Alternativo / Alt Text
 * - Nota de Modificação por IA (AI Disclosure Note)
 * 
 * Includes 3 distinct variants:
 * A. SEO Direto
 * B. Inspiração Editorial
 * C. Afiliado Discreto
 */

export interface PinterestVariant {
    id: 'seo_direto' | 'editorial' | 'afiliado';
    variant_name: string;
    title: string;
    description: string;
    suggested_boards: string[];
    suggested_interests: string[];
    alt_text: string;
}

export interface PinterestPinResult {
    platform: string;
    main_title: string;
    main_title_char_count: number;
    description: string;
    description_char_count: number;
    destination_link: string;
    suggested_boards: string[];
    suggested_interests: string[];
    alt_text: string;
    ai_disclosure_note: string;
    variants: PinterestVariant[];
    tags: string[];
    formatted_hashtags: string;
    formatted_keywords_comma: string;
    seo_score: number;
    seo_recommendations: string[];
    detected_attributes?: {
        color?: string;
        material?: string;
        target_audience?: string;
        style?: string;
    };
}

export interface PinterestListingInput {
    productName: string;
    category?: string;
    productDetails?: string;
    destinationLink?: string;
    tone?: string;
    titleCharLimit?: number;
    descCharLimit?: number;
    tagCount?: number;
    includeEmojis?: boolean;
    includeCTA?: boolean;
    tagFormat?: 'hashtags' | 'comma';
    hasImage?: boolean;
    imageDetails?: string;
}

/**
 * Builds the specialized prompt for Pinterest Pin generation with strict factual locks.
 */
export function buildPinterestListingPrompt(input: PinterestListingInput): string {
    const titleLimit = input.titleCharLimit || 100;
    const descLimit = input.descCharLimit || 500;
    const tagCount = input.tagCount || 12;
    const linkGuidance = input.destinationLink && input.destinationLink.trim()
        ? input.destinationLink.trim()
        : 'Inserir link do produto';

    return `
Você é um Especialista Sênior em Descoberta Visual, SEO Evergreen e Criação de Conteúdo para o PINTEREST (Pinterest Pins).

TAREFA:
Gere uma Listagem Completa de Pin para o Pinterest perfeitamente adaptada aos campos oficiais da interface de criação de Pins.

DADOS DO PRODUTO (AUTORIDADE SEMÂNTICA):
- Nome do Produto (Autoridade Máxima): "${input.productName || 'Análise da Imagem em Anexo'}"
- Categoria Informada: "${input.category || 'Geral'}"
- Detalhes & Especificações Reais: "${input.productDetails || 'Não informado'}"
- Link de Destino Informado: "${input.destinationLink || ''}"
- Tom de Voz Selecionado: "${input.tone || 'inspiracional'}"

🔒 BLOQUEIOS FÁCTICOS & DIRETRIZES DE SEGURANÇA (ESTRITO):
1. NUNCA invente:
   - Preços, descontos, promoções, "50% off", cupom ou liquidação.
   - Frete grátis ou prazos de entrega específicos.
   - Garantias (ex: "garantia de 1 ano", "devolução grátis em 30 dias") a menos que explicitado nos detalhes.
   - Reivindicações de "100% original", "autêntico de fábrica", "marca oficial" não declaradas.
   - Resultados milagrosos, promessas infalíveis ou escassez artificial ("últimas unidades").
2. AUTORIDADE SEMÂNTICA DO PRODUTO:
   - O título e descrição fornecidos pelo usuário são a autoridade soberana sobre o que o produto é.
   - A imagem visual preenche detalhes visuais (cores, materiais observáveis, acabamento).
   - A imagem NUNCA deve transformar um item unitário em "kit", "combo" ou "conjunto" a menos que expressamente informado no texto pelo usuário.
3. ESTILO DE COPY DO PINTEREST:
   - Focado em descoberta visual, busca evergreen, estilo de vida e inspiração.
   - Menos agressivo e menos direto que Shopee/TikTok Shop.
   - Ângulos preferidos: ideia de presente, visual premium, acessório sofisticado, combinação com look, inspiração de compra, composição estética.
   - Português brasileiro fluído, refinado e natural.

REGRAS DE CAMPOS DO PINTEREST:
1. TÍTULO DO PIN (Título):
   - Máximo de ${titleLimit} caracteres.
   - Conciso, altamente pesquisável, com a palavra-chave principal perto do início.
   - Sem clickbait sensacionalista.
2. DESCRIÇÃO DO PIN (Descrição):
   - 1 parágrafo fluido (máximo de ${descLimit} caracteres).
   - Inclua tipo do produto, caso de uso/estilo, contexto estético e intenção de busca.
   - ${input.includeEmojis ? 'Use emojis sutis e estéticos se enriquecer a leitura.' : 'Não use emojis.'}
   - ${input.includeCTA ? 'Finalize com convite natural à inspiração ou salvamento da pasta.' : 'Sem CTA forçado.'}
3. LINK DE DESTINO (Link):
   - Se foi informado link ("${input.destinationLink || ''}"), utilize-o. Caso contrário, retorne exatamente: "Inserir link do produto". Nunca invente URLs falsas.
4. PASTAS SUGERIDAS (Pasta):
   - Sugira de 1 a 3 nomes de pastas ideais para o nicho (ex: Acessórios Masculinos, Relógios Masculinos, Ideias de Presente Masculino, Moda Masculina, Inspiração de Look, etc.).
5. INTERESSES / TAGS SUGERIDAS (Interesses marcados):
   - Exatamente ${tagCount} termos (entre 8 e 15), em minúsculas.
   - Abrangendo categoria, estilo, público-alvo, nicho estético e uso.
6. TEXTO ALTERNATIVO / ALT TEXT (Texto alternativo):
   - Descreva a imagem de forma puramente visual e acessível para leitores de tela.
   - Mencione o produto e o contexto visível na foto.
   - Sem termos de vendas, sem jargões de marketing, sem dados não visíveis.
7. NOTA DE IA (Marcar como modificado por IA):
   - Se imagem foi gerada/modificada por IA ou se for criação sintética: recomendar ativar "Marcar como modificado por IA".
   - Se indeterminado: "Verifique se a imagem foi criada ou modificada por IA antes de publicar."
8. 3 VARIAÇÕES DE PIN (VARIANTS):
   - Gere 3 variações completas com ângulos distintos:
     A. "A. SEO Direto" (foco em termos de busca diretos e intenção de produto)
     B. "B. Inspiração Editorial" (foco em estética, composição de visual e lifestyle)
     C. "C. Afiliado Discreto" (foco em achadinho curado, recomendação elegante e ideia de presente)
   - Cada variação deve conter: title, description, suggested_boards, suggested_interests, alt_text.

FORMATO DE RESPOSTA OBRIGATÓRIO (APENAS JSON VÁLIDO):
{
    "platform": "Pinterest / Pins",
    "main_title": "Título principal do Pin baseado no produto (até ${titleLimit} chars)",
    "main_title_char_count": 80,
    "description": "Descrição envolvente em 1 parágrafo para o Pinterest (até ${descLimit} chars)...",
    "description_char_count": 320,
    "destination_link": "${linkGuidance}",
    "suggested_boards": ["Pasta 1", "Pasta 2", "Pasta 3"],
    "suggested_interests": ["termo 1", "termo 2", ...],
    "alt_text": "Descrição visual acessível e detalhada da imagem do produto sem texto publicitário.",
    "ai_disclosure_note": "Recomendação sobre a opção Marcar como modificado por IA",
    "variants": [
        {
            "id": "seo_direto",
            "variant_name": "A. SEO Direto",
            "title": "Título SEO Direto",
            "description": "Descrição focada em busca orgânica direta...",
            "suggested_boards": ["Pasta A1", "Pasta A2"],
            "suggested_interests": ["tag 1", "tag 2"],
            "alt_text": "Texto alternativo descritivo visual..."
        },
        {
            "id": "editorial",
            "variant_name": "B. Inspiração Editorial",
            "title": "Título Editorial Inspiracional",
            "description": "Descrição com ângulo de estilo e estética...",
            "suggested_boards": ["Pasta B1", "Pasta B2"],
            "suggested_interests": ["tag 1", "tag 2"],
            "alt_text": "Texto alternativo descritivo visual..."
        },
        {
            "id": "afiliado",
            "variant_name": "C. Afiliado Discreto",
            "title": "Título Achadinho / Ideia de Presente",
            "description": "Descrição com tom de recomendação elegante...",
            "suggested_boards": ["Pasta C1", "Pasta C2"],
            "suggested_interests": ["tag 1", "tag 2"],
            "alt_text": "Texto alternativo descritivo visual..."
        }
    ],
    "tags": ["tag1", "tag2", ...],
    "formatted_hashtags": "#tag1 #tag2 ...",
    "formatted_keywords_comma": "tag1, tag2, ...",
    "seo_score": 98,
    "seo_recommendations": [
        "Dica 1 de SEO para Pins e buscas visuais no Pinterest",
        "Dica 2 para organização em pastas temáticas",
        "Dica 3 sobre imagens verticais de proporção 2:3 (1000x1500px)"
    ],
    "detected_attributes": {
        "color": "Cores detectadas",
        "material": "Material observado",
        "target_audience": "Público recomendado",
        "style": "Estilo visual do produto"
    }
}
`;
}

/**
 * Sanitizes and enforces factual locks and fallback guarantees on the raw AI response for Pinterest.
 */
export function sanitizePinterestResult(
    rawParsed: any,
    input: PinterestListingInput
): PinterestPinResult {
    const titleLimit = input.titleCharLimit || 100;
    const descLimit = input.descCharLimit || 500;
    const tagCount = input.tagCount || 12;

    const fallbackTitle = input.productName 
        ? `${input.productName}`.slice(0, titleLimit)
        : 'Inspiração de Produto para o seu Estilo';

    const fallbackLink = input.destinationLink && input.destinationLink.trim()
        ? input.destinationLink.trim()
        : 'Inserir link do produto';

    const raw = rawParsed && typeof rawParsed === 'object' ? rawParsed : {};

    let mainTitle = (raw.main_title || fallbackTitle).trim();
    if (mainTitle.length > titleLimit) {
        mainTitle = mainTitle.slice(0, titleLimit).trim();
    }

    let description = (raw.description || `Confira esta inspiração de ${input.productName || 'produto'}. Ideal para compor seu estilo com sofisticação e elegância no dia a dia.`).trim();
    if (description.length > descLimit) {
        description = description.slice(0, descLimit).trim();
    }

    // Sanitization: Remove any accidentally hallucinated price/discount/free shipping buzzwords
    const bannedPhrases = [
        /frete\s+gr[aá]tis/gi,
        /\d+%\s*off/gi,
        /\d+%\s*de\s*desconto/gi,
        /desconto\s*de\s*\d+%/gi,
        /com\s+\d+%\s+de\s+desconto/gi,
        /apenas\s*r\$\s*\d+([.,]\d+)?/gi,
        /por\s*apenas\s*r\$\s*\d+([.,]\d+)?/gi,
        /r\$\s*\d+([.,]\d+)?/gi,
        /100%\s*original(\s*de\s*f[áa]brica)?/gi,
        /garantia\s*vital[íi]cia/gi,
        /compre\s*agora\s*antes\s*que\s*acabe/gi,
        /últimas\s*unidades/gi,
        /ultimas\s*unidades/gi
    ];
    bannedPhrases.forEach(rgx => {
        mainTitle = mainTitle.replace(rgx, '').replace(/\s+/g, ' ').trim();
        description = description.replace(rgx, '').replace(/\s+/g, ' ').trim();
    });

    const destinationLink = (raw.destination_link && raw.destination_link.trim() && raw.destination_link !== 'undefined')
        ? raw.destination_link.trim()
        : fallbackLink;

    let suggestedBoards: string[] = [];
    if (Array.isArray(raw.suggested_boards) && raw.suggested_boards.length > 0) {
        suggestedBoards = raw.suggested_boards.map(b => String(b).trim()).filter(Boolean);
    } else {
        const cat = input.category || 'Moda & Acessórios';
        suggestedBoards = [cat, 'Ideias de Presente', 'Inspiração de Estilo'];
    }
    if (suggestedBoards.length > 3) {
        suggestedBoards = suggestedBoards.slice(0, 3);
    }

    let suggestedInterests: string[] = [];
    if (Array.isArray(raw.suggested_interests) && raw.suggested_interests.length > 0) {
        suggestedInterests = raw.suggested_interests.map(t => String(t).toLowerCase().trim().replace(/^#/, '')).filter(Boolean);
    } else if (Array.isArray(raw.tags) && raw.tags.length > 0) {
        suggestedInterests = raw.tags.map(t => String(t).toLowerCase().trim().replace(/^#/, '')).filter(Boolean);
    } else {
        suggestedInterests = [
            'moda masculina', 'acessórios', 'ideias de presente', 'estilo masculino',
            'look do dia', 'relógios', 'inspiração', 'achadinhos'
        ];
    }
    if (suggestedInterests.length > tagCount) {
        suggestedInterests = suggestedInterests.slice(0, tagCount);
    }

    const altText = (raw.alt_text && String(raw.alt_text).trim())
        ? String(raw.alt_text).trim()
        : `Foto destacando ${input.productName || 'produto'} com iluminação nítida e detalhes de acabamento visíveis.`;

    const aiDisclosureNote = (raw.ai_disclosure_note && String(raw.ai_disclosure_note).trim())
        ? String(raw.ai_disclosure_note).trim()
        : (input.hasImage
            ? "Verifique se a imagem foi criada ou modificada por IA antes de publicar para marcar a opção nas configurações do Pin."
            : "Verifique se a imagem foi criada ou modificada por IA antes de publicar.");

    // Process 3 variants
    const rawVariants = Array.isArray(raw.variants) ? raw.variants : [];
    const defaultVariants: PinterestVariant[] = [
        {
            id: 'seo_direto',
            variant_name: 'A. SEO Direto',
            title: mainTitle,
            description: description,
            suggested_boards: suggestedBoards,
            suggested_interests: suggestedInterests,
            alt_text: altText
        },
        {
            id: 'editorial',
            variant_name: 'B. Inspiração Editorial',
            title: `${input.productName || 'Acessório Sofisticado'}: Detalhes que Transformam o Visual`.slice(0, titleLimit),
            description: `Uma dose de inspiração para quem aprecia elegância e design refinado. Veja como ${input.productName || 'este produto'} eleva qualquer composição.`.slice(0, descLimit),
            suggested_boards: ['Inspiração de Look', 'Estilo & Design', ...suggestedBoards].slice(0, 3),
            suggested_interests: suggestedInterests,
            alt_text: altText
        },
        {
            id: 'afiliado',
            variant_name: 'C. Afiliado Discreto',
            title: `Achadinho Premium: ${input.productName || 'Ideia de Presente Sofisticado'}`.slice(0, titleLimit),
            description: `Excelente sugestão de presente para quem busca sofisticação sem complicações. Salve na sua pasta de achadinhos.`.slice(0, descLimit),
            suggested_boards: ['Ideias de Presente', 'Achadinhos', ...suggestedBoards].slice(0, 3),
            suggested_interests: suggestedInterests,
            alt_text: altText
        }
    ];

    const variants: PinterestVariant[] = defaultVariants.map((defVar) => {
        const found = rawVariants.find((v: any) => v.id === defVar.id || v.variant_name?.toLowerCase().includes(defVar.id.slice(0, 3)));
        if (!found) return defVar;
        let vTitle = (found.title || defVar.title).slice(0, titleLimit);
        let vDesc = (found.description || defVar.description).slice(0, descLimit);
        bannedPhrases.forEach(rgx => {
            vTitle = vTitle.replace(rgx, '').replace(/\s+/g, ' ').trim();
            vDesc = vDesc.replace(rgx, '').replace(/\s+/g, ' ').trim();
        });
        return {
            id: defVar.id,
            variant_name: found.variant_name || defVar.variant_name,
            title: vTitle,
            description: vDesc,
            suggested_boards: Array.isArray(found.suggested_boards) && found.suggested_boards.length > 0 
                ? found.suggested_boards.slice(0, 3) 
                : defVar.suggested_boards,
            suggested_interests: Array.isArray(found.suggested_interests) && found.suggested_interests.length > 0
                ? found.suggested_interests.slice(0, tagCount)
                : defVar.suggested_interests,
            alt_text: found.alt_text || defVar.alt_text
        };
    });

    const tags = suggestedInterests;
    const formatted_hashtags = tags.map(t => `#${t.replace(/\s+/g, '')}`).join(' ');
    const formatted_keywords_comma = tags.join(', ');

    return {
        platform: "Pinterest / Pins",
        main_title: mainTitle,
        main_title_char_count: mainTitle.length,
        description: description,
        description_char_count: description.length,
        destination_link: destinationLink,
        suggested_boards: suggestedBoards,
        suggested_interests: suggestedInterests,
        alt_text: altText,
        ai_disclosure_note: aiDisclosureNote,
        variants: variants,
        tags: tags,
        formatted_hashtags: formatted_hashtags,
        formatted_keywords_comma: formatted_keywords_comma,
        seo_score: typeof raw.seo_score === 'number' ? raw.seo_score : 98,
        seo_recommendations: Array.isArray(raw.seo_recommendations) && raw.seo_recommendations.length > 0
            ? raw.seo_recommendations
            : [
                "Utilize imagens verticais de proporção 2:3 (1000x1500px) para máxima área visual no feed do Pinterest.",
                "Adicione o Pin a pastas relevantes e ricas em palavras-chave para acelerar a indexação algorítmica.",
                "Mantenha o texto alternativo preciso para reforçar o SEO visual e garantir total acessibilidade."
            ],
        detected_attributes: raw.detected_attributes
    };
}

/**
 * Formats full Pinterest Pin output for the Copy All button.
 */
export function formatPinterestCopyAll(result: PinterestPinResult, tagFormat: 'hashtags' | 'comma' = 'comma'): string {
    const interestsText = tagFormat === 'hashtags' 
        ? result.formatted_hashtags 
        : result.formatted_keywords_comma;

    let text = `📌 PINTEREST PIN - LISTING COMPLETO\n\n`;
    text += `1. TÍTULO DO PIN:\n${result.main_title}\n\n`;
    text += `2. DESCRIÇÃO DO PIN:\n${result.description}\n\n`;
    text += `3. LINK DE DESTINO:\n${result.destination_link}\n\n`;
    text += `4. PASTA(S) SUGERIDA(S):\n${result.suggested_boards.join(' | ')}\n\n`;
    text += `5. INTERESSES / TAGS SUGERIDAS:\n${interestsText}\n\n`;
    text += `6. TEXTO ALTERNATIVO (ALT TEXT):\n${result.alt_text}\n\n`;
    text += `7. NOTA DE MODIFICAÇÃO POR IA:\n${result.ai_disclosure_note}\n\n`;

    if (result.variants && result.variants.length > 0) {
        text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        text += `VARIAÇÕES ADICIONAIS DE PIN:\n\n`;
        result.variants.forEach((v) => {
            text += `[${v.variant_name}]\n`;
            text += `• Título: ${v.title}\n`;
            text += `• Descrição: ${v.description}\n`;
            text += `• Pastas: ${v.suggested_boards.join(', ')}\n`;
            text += `• Tags: ${v.suggested_interests.join(', ')}\n`;
            text += `• Alt Text: ${v.alt_text}\n\n`;
        });
    }

    return text.trim();
}
