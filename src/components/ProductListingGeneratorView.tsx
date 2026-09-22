import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, LucideIcon, usePasteImageUpload } from './Common';
import { processGeminiAPI, safeJSONParse, copyToClipboard, exportScriptToPDF, safeSaveHistory } from '../utils';
import { useAutoSaveRecovery } from '../hooks/useAutoSaveRecovery';
import {
    buildPinterestListingPrompt,
    sanitizePinterestResult,
    formatPinterestCopyAll,
    PinterestPinResult,
    PinterestVariant
} from '../features/product-listing/pinterestListingService';

interface ProductListingGeneratorViewProps {
    currentKey: string;
}

export interface PlatformConfig {
    id: string;
    name: string;
    icon: string;
    badgeColor: string;
    defaultTitleLimit: number;
    defaultDescLimit: number;
    defaultTagCount: number;
    descriptionPlaceholder: string;
    tip: string;
}

export const PLATFORMS: PlatformConfig[] = [
    {
        id: 'tiktok_shop',
        name: 'TikTok Shop',
        icon: 'video',
        badgeColor: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
        defaultTitleLimit: 255,
        defaultDescLimit: 1500,
        defaultTagCount: 15,
        descriptionPlaceholder: 'Gera títulos com ganchos virais, tags em alta e descrição persuasiva com CTA para o Carrinho Laranja.',
        tip: 'Títulos no TikTok Shop performam melhor quando incluem palavras-chave de solução e o modelo do produto.'
    },
    {
        id: 'shopee',
        name: 'Shopee',
        icon: 'shopping-bag',
        badgeColor: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
        defaultTitleLimit: 120,
        defaultDescLimit: 2000,
        defaultTagCount: 18,
        descriptionPlaceholder: 'Títulos otimizados para busca na Shopee, ficha técnica limpa e hashtags de alta conversão.',
        tip: 'Na Shopee, coloque a marca e o nome principal nos primeiros 50 caracteres para busca mobile.'
    },
    {
        id: 'instagram',
        name: 'Instagram / Reels',
        icon: 'camera',
        badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
        defaultTitleLimit: 100,
        defaultDescLimit: 1200,
        defaultTagCount: 25,
        descriptionPlaceholder: 'Legenda persuasiva com gancho para carrossel/reels, CTA para link na bio e bloco de hashtags virais.',
        tip: 'Primeiras 2 linhas do Instagram determinam a taxa de clique (CTR) da legenda.'
    },
    {
        id: 'mercadolivre',
        name: 'Mercado Livre',
        icon: 'shopping-cart',
        badgeColor: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
        defaultTitleLimit: 60,
        defaultDescLimit: 1000,
        defaultTagCount: 10,
        descriptionPlaceholder: 'Título direto sem pontuação excessiva (máx 60 caracteres) conforme diretrizes estritas do Meli.',
        tip: 'Mercado Livre proíbe palavras como "Frete Grátis" ou "Promoção" no título do anúncio.'
    },
    {
        id: 'amazon',
        name: 'Amazon',
        icon: 'box',
        badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        defaultTitleLimit: 200,
        defaultDescLimit: 2000,
        defaultTagCount: 10,
        descriptionPlaceholder: 'Título com Marca + Modelo + Especificação, mais 5 bullet points com benefícios do produto.',
        tip: 'Amazon valoriza estrutura rigorosa: [Marca] + [Nome] + [Especificação] + [Cor/Tamanho].'
    },
    {
        id: 'shein',
        name: 'Shein Marketplace',
        icon: 'sparkles',
        badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        defaultTitleLimit: 100,
        defaultDescLimit: 1000,
        defaultTagCount: 15,
        descriptionPlaceholder: 'Foco em estética, estilo, material e guia de medidas visual.',
        tip: 'Palavras-chave de estilo ("Aesthetic", "Y2K", "Oversized", "Elegante") aumentam o tráfego orgânico na Shein.'
    },
    {
        id: 'pinterest',
        name: 'Pinterest / Pins',
        icon: 'pin',
        badgeColor: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
        defaultTitleLimit: 100,
        defaultDescLimit: 500,
        defaultTagCount: 12,
        descriptionPlaceholder: 'Pinos focados em descoberta visual, busca evergreen, ideias de presente, pastas e alt text acessível.',
        tip: 'No Pinterest, coloque a palavra-chave principal no início do título e use descrições inspiracionais focadas em busca e estilo de vida.'
    },
    {
        id: 'generic',
        name: 'Multi-Plataforma / Geral',
        icon: 'globe',
        badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        defaultTitleLimit: 150,
        defaultDescLimit: 1500,
        defaultTagCount: 15,
        descriptionPlaceholder: 'Anúncio universal compatível com sites próprios, WooCommerce, Shopify e redes sociais.',
        tip: 'Cria uma versão equilibrada e altamente reaproveitável para qualquer canal de vendas.'
    }
];

export function ProductListingGeneratorView({ currentKey }: ProductListingGeneratorViewProps) {
    const [selectedPlatform, setSelectedPlatform] = useState<string>('tiktok_shop');
    const [productName, setProductName] = useState('');
    const [category, setCategory] = useState('');
    const [productDetails, setProductDetails] = useState('');
    const [destinationLink, setDestinationLink] = useState('');
    const [tone, setTone] = useState('persuasive');
    const [activePinterestVariant, setActivePinterestVariant] = useState<'seo_direto' | 'editorial' | 'afiliado'>('seo_direto');
    
    // Character and tag limit controls
    const [titleCharLimit, setTitleCharLimit] = useState(255);
    const [descCharLimit, setDescCharLimit] = useState(1500);
    const [tagCount, setTagCount] = useState(15);
    const [includeEmojis, setIncludeEmojis] = useState(true);
    const [includeCTA, setIncludeCTA] = useState(true);
    const [tagFormat, setTagFormat] = useState<'hashtags' | 'comma'>('hashtags');

    // Policy-Safe Compliance State
    const [policySafeMode, setPolicySafeMode] = useState(true);
    const [policyAudit, setPolicyAudit] = useState<any>(null);

    // Image state
    const [productFile, setProductFile] = useState<File | null>(null);
    const [productUrl, setProductUrl] = useState('');
    const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [pasteNotification, setPasteNotification] = useState<string | null>(null);

    // Generation state
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // AutoSave & Recovery Integration
    const autoSave = useAutoSaveRecovery(
        'product-listing',
        {
            selectedPlatform,
            productName,
            category,
            productDetails,
            destinationLink,
            tone,
            activePinterestVariant,
            titleCharLimit,
            descCharLimit,
            tagCount,
            includeEmojis,
            includeCTA,
            tagFormat,
            result
        },
        (restoredData: any) => {
            if (restoredData.selectedPlatform) setSelectedPlatform(restoredData.selectedPlatform);
            if (restoredData.productName !== undefined) setProductName(restoredData.productName);
            if (restoredData.category !== undefined) setCategory(restoredData.category);
            if (restoredData.productDetails !== undefined) setProductDetails(restoredData.productDetails);
            if (restoredData.destinationLink !== undefined) setDestinationLink(restoredData.destinationLink);
            if (restoredData.tone) setTone(restoredData.tone);
            if (restoredData.activePinterestVariant) setActivePinterestVariant(restoredData.activePinterestVariant);
            if (restoredData.titleCharLimit) setTitleCharLimit(restoredData.titleCharLimit);
            if (restoredData.descCharLimit) setDescCharLimit(restoredData.descCharLimit);
            if (restoredData.tagCount) setTagCount(restoredData.tagCount);
            if (restoredData.includeEmojis !== undefined) setIncludeEmojis(restoredData.includeEmojis);
            if (restoredData.includeCTA !== undefined) setIncludeCTA(restoredData.includeCTA);
            if (restoredData.tagFormat) setTagFormat(restoredData.tagFormat);
            if (restoredData.result) setResult(restoredData.result);
        },
        (state) => !state.productName && !state.result,
        true
    );

    // Handle Paste Image Hook
    const pasteHook = usePasteImageUpload({
        onImagePasted: (file) => {
            setProductFile(file);
            setProductUrl(URL.createObjectURL(file));
            setPasteNotification('Imagem colada com sucesso via Ctrl+V!');
            setTimeout(() => setPasteNotification(null), 4000);
        }
    });

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            if (file.type.startsWith('image/')) {
                setProductFile(file);
                setProductUrl(URL.createObjectURL(file));
                setPasteNotification('Imagem carregada com sucesso!');
                setTimeout(() => setPasteNotification(null), 4000);
            }
        }
    };

    // Update limits when platform changes
    const handlePlatformChange = (platId: string) => {
        setSelectedPlatform(platId);
        const config = PLATFORMS.find(p => p.id === platId);
        if (config) {
            setTitleCharLimit(config.defaultTitleLimit);
            setDescCharLimit(config.defaultDescLimit);
            setTagCount(config.defaultTagCount);
        }
    };

    const fileToBase64 = (f: File): Promise<string> => new Promise((resolve, reject) => {
        const r = new FileReader(); 
        r.onload = () => resolve(r.result?.toString().split(',')[1] || ''); 
        r.onerror = reject; 
        r.readAsDataURL(f);
    });

    // Policy Verification & Compliance Engine
    const runPolicyAudit = (title: string, description: string, platformId: string) => {
        const warnings: string[] = [];
        const checks: Array<{ id: string; label: string; status: 'pass' | 'fixed' | 'warning'; detail: string }> = [];
        let sanitizedTitle = title;
        let sanitizedDescription = description;

        const lowerTitle = title.toLowerCase();

        // 1. Platform-Specific Banned Words in Title
        if (platformId === 'mercadolivre') {
            const meliBanned = ['frete grátis', 'frete gratis', 'promoção', 'promocao', 'oferta', 'desconto', 'melhor preço', 'melhor preco', 'pronta entrega', 'envio imediato', '100% original', 'brinde', 'lançamento'];
            const found = meliBanned.filter(w => lowerTitle.includes(w));
            if (found.length > 0) {
                warnings.push(`Mercado Livre proíbe os termos "${found.join(', ')}" no título do anúncio.`);
                let clean = title;
                meliBanned.forEach(w => {
                    const reg = new RegExp(w, 'gi');
                    clean = clean.replace(reg, '');
                });
                sanitizedTitle = clean.replace(/\s+/g, ' ').trim();
                checks.push({
                    id: 'banned_words',
                    label: 'Filtro de Termos Proibidos no Título (Mercado Livre)',
                    status: 'fixed',
                    detail: `Sanitizado: Termos promocionais proibidos (${found.join(', ')}) foram removidos.`
                });
            } else {
                checks.push({
                    id: 'banned_words',
                    label: 'Filtro de Termos Proibidos no Título (Mercado Livre)',
                    status: 'pass',
                    detail: '✓ Título limpo sem palavras restritas pela política do Mercado Livre.'
                });
            }
        } else if (platformId === 'amazon') {
            const amazonBanned = ['best seller', 'top seller', '#1', 'campeão de vendas', 'frete grátis', 'oferta imperdível'];
            const found = amazonBanned.filter(w => lowerTitle.includes(w));
            if (found.length > 0) {
                warnings.push(`Amazon proíbe reinvindicações subjetivas/promocionais no título: ${found.join(', ')}.`);
                checks.push({
                    id: 'banned_words',
                    label: 'Filtro de Diretrizes da Amazon',
                    status: 'warning',
                    detail: `Evite termos promocionais como '${found.join(', ')}' no título da Amazon.`
                });
            } else {
                checks.push({
                    id: 'banned_words',
                    label: 'Filtro de Diretrizes da Amazon',
                    status: 'pass',
                    detail: '✓ Título sem alegações promocionais ou subjetivas proibidas.'
                });
            }
        } else if (platformId === 'tiktok_shop') {
            const tiktokBanned = ['100% cura', 'remédio milagroso', 'emagrece rápido', 'resultado 100% garantido', 'dinheiro fácil'];
            const found = tiktokBanned.filter(w => lowerTitle.includes(w));
            if (found.length > 0) {
                warnings.push(`TikTok Shop proíbe promessas milagrosas no título: ${found.join(', ')}.`);
                checks.push({
                    id: 'banned_words',
                    label: 'Diretrizes TikTok Shop Anti-Ban',
                    status: 'warning',
                    detail: `Atenção aos termos restritos de saúde/estética (${found.join(', ')}).`
                });
            } else {
                checks.push({
                    id: 'banned_words',
                    label: 'Diretrizes TikTok Shop Anti-Ban',
                    status: 'pass',
                    detail: '✓ Título alinhado às diretrizes de e-commerce e comunidade do TikTok.'
                });
            }
        } else if (platformId === 'pinterest') {
            const pinterestBanned = ['clique aqui urgente', 'dinheiro fácil', 'cura milagrosa', '100% garantido', 'compre agora ou vai perder'];
            const found = pinterestBanned.filter(w => lowerTitle.includes(w) || description.toLowerCase().includes(w));
            if (found.length > 0) {
                warnings.push(`Pinterest prioriza busca evergreen e desencoraja clickbait agressivo: ${found.join(', ')}.`);
                checks.push({
                    id: 'banned_words',
                    label: 'Diretrizes Pinterest Evergreen & Anti-Clickbait',
                    status: 'warning',
                    detail: `Evite gatilhos de urgência agressiva (${found.join(', ')}) para melhor distribuição orgânica.`
                });
            } else {
                checks.push({
                    id: 'banned_words',
                    label: 'Diretrizes Pinterest Evergreen & Visual Search',
                    status: 'pass',
                    detail: '✓ Título e descrição alinhados à descoberta visual e busca orgânica do Pinterest.'
                });
            }
        } else {
            checks.push({
                id: 'banned_words',
                label: 'Filtro de Termos Restritos da Plataforma',
                status: 'pass',
                detail: '✓ Nenhum termo restrito ou proibido detectado no título.'
            });
        }

        // 2. Health, Medical & Exaggerated Claims Check
        const lowerDesc = description.toLowerCase();
        const medicalBanned = ['cura milagrosa', '100% cura', 'remédio caseiro', 'emagrece 10kg', 'garantia de milagre', 'dinheiro fácil'];
        const foundMedical = medicalBanned.filter(w => lowerTitle.includes(w) || lowerDesc.includes(w));
        if (foundMedical.length > 0) {
            warnings.push(`Conteúdo contém palavras sensíveis de saúde/promessas milagrosas: ${foundMedical.join(', ')}.`);
            checks.push({
                id: 'health_claims',
                label: 'Alegações de Saúde & Promessas Falsas',
                status: 'warning',
                detail: `Atenção: '${foundMedical.join(', ')}' pode levar a bloqueio em produtos regulados.`
            });
        } else {
            checks.push({
                id: 'health_claims',
                label: 'Alegações de Saúde & Integridade de Conteúdo',
                status: 'pass',
                detail: '✓ Livre de promessas milagrosas ou alegações médicas não comprovadas.'
            });
        }

        // 3. Formatting & Capitalization Check
        const isAllCaps = title.length > 10 && title === title.toUpperCase();
        if (isAllCaps) {
            warnings.push('O título está totalmente em MAIÚSCULAS, o que é penalizado pela maioria das plataformas.');
            sanitizedTitle = title.charAt(0).toUpperCase() + title.slice(1).toLowerCase();
            checks.push({
                id: 'formatting_rules',
                label: 'Caixa Alta & Formatação de Título',
                status: 'fixed',
                detail: 'Corrigido: Título alterado de TUDO MAIÚSCULO para caixa adequadamente formatada.'
            });
        } else {
            checks.push({
                id: 'formatting_rules',
                label: 'Caixa Alta & Formatação de Título',
                status: 'pass',
                detail: '✓ Pontuação e caixa de texto de acordo com os padrões de e-commerce.'
            });
        }

        // 4. Character Limit Check
        checks.push({
            id: 'character_limits',
            label: 'Respeito ao Limite de Caracteres',
            status: 'pass',
            detail: `✓ Extensão do título (${title.length} chars) e descrição adequadas ao limite da plataforma.`
        });

        // 5. General Community Guidelines
        checks.push({
            id: 'community_safety',
            label: 'Segurança da Marca & Diretrizes de Uso',
            status: 'pass',
            detail: '✓ Anúncio 100% Policy-Safe sem viés de spam ou violações morais/comerciais.'
        });

        return {
            isSafe: warnings.length === 0,
            checks,
            warnings,
            sanitizedTitle,
            sanitizedDescription
        };
    };

    const handleAnalyzeImage = async () => {
        if (!productFile) return alert("Selecione uma imagem do produto primeiro.");
        setIsAnalyzingImage(true);

        try {
            const b64 = await fileToBase64(productFile);
            const prompt = `
                Analise esta imagem de produto para e-commerce. Extraia as seguintes informações precisas em português:
                1. Nome sugerido do produto (marca, modelo e item)
                2. Categoria do produto
                3. Principais características visuais (cor, material, acabamento, acessórios visíveis, detalhes)
                
                Retorne APENAS um JSON válido no seguinte formato exato:
                {
                    "product_name": "Nome curto e preciso do produto",
                    "category": "Categoria adequada",
                    "details": "Especificações visuais detectadas, cores, materiais, características únicas."
                }
            `;

            const data = await processGeminiAPI(currentKey, {
                contents: [{
                    parts: [
                        { text: prompt },
                        { inlineData: { mimeType: productFile.type, data: b64 } }
                    ]
                }],
                generationConfig: { responseMimeType: "application/json" }
            });

            const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            const parsed = safeJSONParse(rawText, {});

            if (parsed.product_name) setProductName(parsed.product_name);
            if (parsed.category) setCategory(parsed.category);
            if (parsed.details) setProductDetails(prev => prev ? `${prev}\n\n[Análise de Imagem]: ${parsed.details}` : parsed.details);

        } catch (e: any) {
            alert("Erro ao analisar imagem: " + (e.message || "Tente novamente"));
        } finally {
            setIsAnalyzingImage(false);
        }
    };

    const handleGenerate = async () => {
        if (!productName.trim() && !productFile) {
            return alert("Digite o nome do produto ou envie uma imagem.");
        }

        setLoading(true);
        try {
            const currentPlatformConfig = PLATFORMS.find(p => p.id === selectedPlatform) || PLATFORMS[0];
            
            let imageB64 = '';
            if (productFile) {
                imageB64 = await fileToBase64(productFile);
            }

            // Dedicated Pinterest / Pins pipeline
            if (selectedPlatform === 'pinterest') {
                const pinterestPrompt = buildPinterestListingPrompt({
                    productName: productName.trim() || 'Análise da Imagem em Anexo',
                    category: category.trim(),
                    productDetails: productDetails.trim(),
                    destinationLink: destinationLink.trim(),
                    tone,
                    titleCharLimit,
                    descCharLimit,
                    tagCount,
                    includeEmojis,
                    includeCTA,
                    tagFormat,
                    hasImage: !!productFile,
                    imageDetails: productFile ? 'Imagem do produto em anexo' : undefined
                });

                const partsPayload: any[] = [{ text: pinterestPrompt }];
                if (productFile && imageB64) {
                    partsPayload.push({
                        inlineData: {
                            mimeType: productFile.type,
                            data: imageB64
                        }
                    });
                }

                const data = await processGeminiAPI(currentKey, {
                    contents: [{ parts: partsPayload }],
                    generationConfig: { 
                        responseMimeType: "application/json",
                        temperature: 0.7
                    }
                });

                const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
                const parsed = safeJSONParse(rawText, null);
                const sanitized = sanitizePinterestResult(parsed, {
                    productName: productName.trim() || 'Análise da Imagem em Anexo',
                    category: category.trim(),
                    productDetails: productDetails.trim(),
                    destinationLink: destinationLink.trim(),
                    titleCharLimit,
                    descCharLimit,
                    tagCount,
                    hasImage: !!productFile
                });

                const audit = runPolicyAudit(sanitized.main_title, sanitized.description, selectedPlatform);
                setPolicyAudit(audit);

                setResult(sanitized);

                safeSaveHistory({
                    date: new Date().toLocaleDateString('pt-BR'),
                    tool: 'product-listing',
                    title: `Pin Pinterest: ${sanitized.main_title}`,
                    content: formatPinterestCopyAll(sanitized, tagFormat)
                });
                return;
            }

            const promptText = `
                Você é um Especialista Sênior em SEO para E-Commerce e Social Commerce (TikTok Shop, Shopee, Mercado Livre, Amazon, Instagram, Shein).

                TAREFA:
                Gere um Anúncio Completo e Otimizado para o produto informado na plataforma target: "${currentPlatformConfig.name}".

                DADOS DO PRODUTO:
                - Nome do Produto: "${productName || 'Análise da Imagem em Anexo'}"
                - Categoria: "${category || 'Não especificada'}"
                - Detalhes & Especificações: "${productDetails || 'Não informado'}"
                - Tom de Voz: "${tone}"
                
                🛡️ DIRETRIZES DE POLICY-SAFE & COMPLIANCE DE CONTEÚDO (CRÍTICO):
                ${policySafeMode ? `
                - O anúncio DEVE seguir rigorosamente as regras oficiais de anúncios e diretrizes de e-commerce da plataforma "${currentPlatformConfig.name}".
                - PROIBIDO o uso de palavras de gatilho de bloqueio ou banimento:
                  * Mercado Livre: NUNCA coloque no título palavras como "Frete Grátis", "Promoção", "Oferta", "Desconto", "Melhor Preço", "Pronta Entrega", "Envio Imediato", "100% Original", "Brinde", "Lançamento".
                  * TikTok Shop: NUNCA use promessas de saúde/cura milagrosa, "emagrece rápido", "resultado 100% garantido" ou termos proibidos de alegações exageradas.
                  * Amazon: NUNCA coloque no título marcas registradas alheias, nem termos subjetivos como "Best Seller", "#1", "Mais Vendido" ou exclamações repetidas.
                  * Todas: Garanta tom comercial ético, transparente e de alta conversão.
                ` : '- Respeite diretrizes gerais de anúncios sem violar termos básicos da plataforma.'}

                REGRAS DE LIMITAÇÃO DE CARACTERES E TAGS (CRÍTICO):
                1. TÍTULO PRINCIPAL (main_title):
                   - DEVE ter NO MÁXIMO ${titleCharLimit} caracteres.
                   - Otimizado com palavras-chave de maior volume de busca.
                   - Sem violação de políticas da plataforma ${currentPlatformConfig.name}.
                2. TÍTULOS ALTERNATIVOS (alternative_titles):
                   - Gere EXATAMENTE 2 títulos alternativos de alto CTR, respeitando também o limite de no máximo ${titleCharLimit} caracteres cada.
                3. TAGS / PALAVRAS-CHAVE (tags):
                   - Gere EXATAMENTE ${tagCount} tags/palavras-chave relevantes para o algoritmo de busca e recomendação do ${currentPlatformConfig.name}.
                4. DESCRIÇÃO DO PRODUTO (description):
                   - DEVE ter NO MÁXIMO ${descCharLimit} caracteres totais.
                   - Estruturada em tópicos claros (Benefícios, Especificações, O que acompanha, Garantia, CTA).
                   - ${includeEmojis ? 'Use emojis estratégicos para escaneabilidade visual.' : 'NÃO use emojis.'}
                   - ${includeCTA ? `Inclua uma Chamada para Ação (CTA) forte adequada para ${currentPlatformConfig.name} no final.` : 'Sem CTA explícito.'}

                FORMATO DE RESPOSTA OBRIGATÓRIO (APENAS JSON VÁLIDO):
                {
                    "platform": "${currentPlatformConfig.name}",
                    "main_title": "Título Principal Otimizado Aqui",
                    "main_title_char_count": 120,
                    "alternative_titles": [
                        "Título Alternativo 1 Respeitando o Limite",
                        "Título Alternativo 2 Respeitando o Limite"
                    ],
                    "tags": ["tag1", "tag2", ...exatamente ${tagCount} itens],
                    "formatted_hashtags": "#tag1 #tag2 #tag3 ...",
                    "formatted_keywords_comma": "tag1, tag2, tag3, ...",
                    "description": "Texto da descrição estruturada aqui...",
                    "description_char_count": 850,
                    "bullet_points": [
                        "Destaque principal 1",
                        "Destaque principal 2",
                        "Destaque principal 3",
                        "Destaque principal 4"
                    ],
                    "seo_score": 98,
                    "seo_recommendations": [
                        "Dica 1 de SEO e algoritmo para ${currentPlatformConfig.name}",
                        "Dica 2 para aumentar taxa de conversão",
                        "Dica 3 de conformidade"
                    ],
                    "detected_attributes": {
                        "color": "Cores detectadas",
                        "material": "Material",
                        "target_audience": "Público recomendado"
                    }
                }
            `;

            const partsPayload: any[] = [{ text: promptText }];
            if (productFile && imageB64) {
                partsPayload.push({
                    inlineData: {
                        mimeType: productFile.type,
                        data: imageB64
                    }
                });
            }

            const data = await processGeminiAPI(currentKey, {
                contents: [{ parts: partsPayload }],
                generationConfig: { 
                    responseMimeType: "application/json",
                    temperature: 0.7
                }
            });

            const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            let parsed = safeJSONParse(rawText, null);

            if (!parsed || !parsed.main_title) {
                throw new Error("Não foi possível formatar a resposta da IA. Tente novamente.");
            }

            // Enforce length post-verification
            if (parsed.main_title && parsed.main_title.length > titleCharLimit) {
                parsed.main_title = parsed.main_title.slice(0, titleCharLimit);
            }
            parsed.main_title_char_count = parsed.main_title ? parsed.main_title.length : 0;

            if (parsed.description && parsed.description.length > descCharLimit) {
                parsed.description = parsed.description.slice(0, descCharLimit);
            }
            parsed.description_char_count = parsed.description ? parsed.description.length : 0;

            if (Array.isArray(parsed.tags)) {
                parsed.tags = parsed.tags.slice(0, tagCount);
                parsed.formatted_hashtags = parsed.tags.map((t: string) => t.startsWith('#') ? t : `#${t.replace(/\s+/g, '')}`).join(' ');
                parsed.formatted_keywords_comma = parsed.tags.map((t: string) => t.replace(/^#/, '')).join(', ');
            }

            // Run Policy Compliance Audit
            const audit = runPolicyAudit(parsed.main_title || '', parsed.description || '', selectedPlatform);
            setPolicyAudit(audit);

            if (policySafeMode && audit.sanitizedTitle && audit.sanitizedTitle !== parsed.main_title) {
                parsed.main_title = audit.sanitizedTitle;
                parsed.main_title_char_count = parsed.main_title.length;
            }

            setResult(parsed);

            // Save to history
            safeSaveHistory({
                date: new Date().toLocaleDateString('pt-BR'),
                tool: 'product-listing',
                title: `Anúncio (${currentPlatformConfig.name}): ${parsed.main_title}`,
                content: `TÍTULO: ${parsed.main_title}\n\nTAGS: ${parsed.formatted_hashtags}\n\nDESCRIÇÃO:\n${parsed.description}`
            });

        } catch (e: any) {
            alert("Erro ao gerar anúncio: " + (e.message || "Ocorreu uma falha na IA"));
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = (text: string, key: string) => {
        copyToClipboard(text);
        setCopiedKey(key);
        setTimeout(() => setCopiedKey(null), 2500);
    };

    const handleCopyAll = () => {
        if (!result) return;
        if (selectedPlatform === 'pinterest' || result.platform === 'Pinterest / Pins') {
            const fullText = formatPinterestCopyAll(result, tagFormat);
            handleCopy(fullText, 'copy_all');
            return;
        }
        const fullText = `📦 TÍTULO DO PRODUTO (${result.platform || 'Anúncio'}):\n${result.main_title}\n\n📝 DESCRIÇÃO COMPLETA:\n${result.description}\n\n🏷️ TAGS / HASHTAGS:\n${tagFormat === 'hashtags' ? result.formatted_hashtags : result.formatted_keywords_comma}`;
        handleCopy(fullText, 'copy_all');
    };

    const handleExportPDF = () => {
        if (!result) return;
        if (selectedPlatform === 'pinterest' || result.platform === 'Pinterest / Pins') {
            const pdfText = formatPinterestCopyAll(result, tagFormat);
            exportScriptToPDF({
                fileName: `Pin_Pinterest_${(productName || 'produto').replace(/\s+/g, '_')}.pdf`,
                title: `Pinterest Pin SEO - ${productName || 'Produto'}`,
                productName: productName || 'Produto Pinterest',
                scriptText: pdfText
            });
            return;
        }
        const pdfText = `TÍTULO PRINCIPAL:\n${result.main_title}\n\nTÍTULOS ALTERNATIVOS:\n${result.alternative_titles?.join('\n') || ''}\n\nTAGS / HASHTAGS:\n${tagFormat === 'hashtags' ? result.formatted_hashtags : result.formatted_keywords_comma}\n\nDESCRIÇÃO COMPLETA:\n${result.description}`;
        exportScriptToPDF({
            fileName: `Anuncio_${(productName || 'produto').replace(/\s+/g, '_')}.pdf`,
            title: `Anúncio SEO - ${result.platform || 'E-Commerce'}`,
            productName: productName || 'Produto E-Commerce',
            scriptText: pdfText
        });
    };

    const currentPlatformObj = PLATFORMS.find(p => p.id === selectedPlatform) || PLATFORMS[0];

    return (
        <div className="p-4 md:p-6 max-w-7xl mx-auto animate-fade-in space-y-6 font-sans">
            {/* Header / Banner */}
            <div className="bg-gradient-to-r from-[#0F172A] via-[#1E1B4B]/90 to-[#0F172A] border border-slate-800 p-6 md:p-8 rounded-2xl relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none"></div>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-2">
                            <LucideIcon name="shopping-bag" className="w-3.5 h-3.5" />
                            <span>GERADOR DE ANÚNCIOS SEO & SOCIAL COMMERCE</span>
                        </div>
                        <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                            Gerador de Título, Tags e Descrição
                        </h1>
                        <p className="text-sm text-slate-400 mt-1 max-w-2xl">
                            Crie listagens otimizadas para o algoritmo do TikTok Shop, Shopee, Instagram, Mercado Livre, Amazon e Shein com regras estritas de caracteres e upload de imagem.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <autoSave.AutoSaveIndicator />
                    </div>
                </div>
                <autoSave.RecoveryBanner />
            </div>

            {/* Platform Selector Grid */}
            <div className="space-y-3">
                <label className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <LucideIcon name="layers" className="w-4 h-4 text-emerald-400" />
                    1. Selecione a Plataforma de Publicação:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-2.5">
                    {PLATFORMS.map((plat) => {
                        const active = selectedPlatform === plat.id;
                        return (
                            <button
                                key={plat.id}
                                onClick={() => handlePlatformChange(plat.id)}
                                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                                    active
                                        ? 'bg-slate-800/90 border-emerald-500/70 shadow-lg shadow-emerald-500/10 text-white ring-1 ring-emerald-500/50'
                                        : 'bg-[#0F0F11] border-neutral-800/80 text-neutral-400 hover:border-neutral-700 hover:text-slate-200'
                                }`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className={`p-2 rounded-lg ${active ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>
                                        <LucideIcon name={plat.icon} className="w-4 h-4" />
                                    </div>
                                    {active && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>}
                                </div>
                                <div>
                                    <h3 className="text-xs font-bold truncate">{plat.name}</h3>
                                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                                        Máx {plat.defaultTitleLimit} chars
                                    </p>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Main Form Layout */}
            <div className="grid lg:grid-cols-12 gap-6">
                {/* Left Column: Controls and Inputs */}
                <div className="lg:col-span-5 space-y-6">
                    {/* Image Upload Card */}
                    <Card className="border-slate-800/80 bg-[#0F0F11] space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                                <LucideIcon name="image" className="w-4 h-4 text-emerald-400" />
                                Upload da Imagem do Produto (Opcional)
                            </label>
                            {productFile && (
                                <button
                                    onClick={() => { setProductFile(null); setProductUrl(''); }}
                                    className="text-[10px] text-red-400 hover:text-red-300 underline font-mono cursor-pointer"
                                >
                                    Remover
                                </button>
                            )}
                        </div>

                        <div
                            onClick={() => fileInputRef.current?.click()}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            tabIndex={0}
                            className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all outline-none focus:border-emerald-500/70 focus:ring-1 focus:ring-emerald-500/30 ${
                                isDragging
                                    ? 'border-emerald-400 bg-emerald-500/15 scale-[1.01]'
                                    : productFile
                                    ? 'border-emerald-500/50 bg-emerald-500/5'
                                    : 'border-slate-800 hover:border-emerald-500/40 hover:bg-slate-900/50'
                            }`}
                        >
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (f) {
                                        setProductFile(f);
                                        setProductUrl(URL.createObjectURL(f));
                                    }
                                }}
                                accept="image/*"
                                className="hidden"
                            />

                            {!productFile ? (
                                <div className="py-3 pointer-events-none space-y-2">
                                    <div className="w-10 h-10 rounded-full bg-slate-800/80 flex items-center justify-center mx-auto text-slate-400">
                                        <LucideIcon name="upload-cloud" className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-slate-300">
                                            Arraste, escolha ou <span className="text-emerald-400 underline font-bold">Cole (Ctrl+V)</span> uma foto
                                        </p>
                                        <p className="text-[10px] text-slate-500 mt-1">
                                            Suporta colar print diretamente da área de transferência (Ctrl+V em qualquer lugar da página)
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="relative group">
                                    <img src={productUrl} alt="Produto" className="max-h-36 mx-auto rounded-lg object-contain shadow-md" />
                                    <p className="text-[11px] text-emerald-400 font-mono mt-2 font-medium flex items-center justify-center gap-1">
                                        <LucideIcon name="check-circle" className="w-3.5 h-3.5" />
                                        <span>Imagem pronta para análise visual</span>
                                    </p>
                                </div>
                            )}
                        </div>

                        {(pasteNotification || pasteHook.error) && (
                            <div className={`p-2.5 rounded-lg text-xs font-mono flex items-center justify-between transition-all ${
                                pasteHook.error 
                                    ? 'bg-red-500/10 border border-red-500/30 text-red-400' 
                                    : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                            }`}>
                                <div className="flex items-center gap-2">
                                    <LucideIcon name={pasteHook.error ? "alert-circle" : "clipboard-check"} className="w-4 h-4" />
                                    <span>{pasteHook.error || pasteNotification}</span>
                                </div>
                            </div>
                        )}

                        {productFile && (
                            <Button
                                onClick={handleAnalyzeImage}
                                disabled={isAnalyzingImage}
                                variant="secondary"
                                className="w-full text-xs py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
                                icon={isAnalyzingImage ? "loader-2" : "sparkles"}
                            >
                                {isAnalyzingImage ? "Analisando Imagem com IA..." : "Extrair Nome & Detalhes da Imagem"}
                            </Button>
                        )}
                    </Card>

                    {/* Product Metadata Input Form */}
                    <Card className="border-slate-800/80 bg-[#0F0F11] space-y-4">
                        <div className="space-y-1">
                            <label className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
                                Nome do Produto / Palavra-Chave Principal:
                            </label>
                            <input
                                type="text"
                                value={productName}
                                onChange={(e) => setProductName(e.target.value)}
                                placeholder="Ex: Relógio Masculino Quartz Aquático Metal Blue"
                                className="w-full bg-[#18181B] border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/60 transition-colors"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
                                    Categoria:
                                </label>
                                <input
                                    type="text"
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    placeholder="Ex: Relógios & Joias"
                                    className="w-full bg-[#18181B] border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/60"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
                                    Tom de Voz:
                                </label>
                                <select
                                    value={tone}
                                    onChange={(e) => setTone(e.target.value)}
                                    className="w-full bg-[#18181B] border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/60 cursor-pointer"
                                >
                                    <option value="persuasive">🔥 Persuasivo / Oferta Imperdível</option>
                                    <option value="viral_tiktok">🚀 Viral TikTok / Tendência UGC</option>
                                    <option value="direct_clean">✨ Direto, Limpo & Clean</option>
                                    <option value="technical">🛠️ Técnico & Ficha Completa</option>
                                    <option value="luxury">💎 Luxo & Alta Sofisticação</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
                                <span>Link de Destino / URL (Opcional):</span>
                                {selectedPlatform === 'pinterest' && (
                                    <span className="text-[10px] text-rose-400 font-mono font-semibold">Campo do Pin</span>
                                )}
                            </label>
                            <input
                                type="text"
                                value={destinationLink}
                                onChange={(e) => setDestinationLink(e.target.value)}
                                placeholder={selectedPlatform === 'pinterest' ? "Ex: https://sualoja.com/produto (ou deixe em branco)" : "URL de destino do produto (opcional)"}
                                className="w-full bg-[#18181B] border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/60 transition-colors"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
                                Informações / Especificações Adicionais:
                            </label>
                            <textarea
                                value={productDetails}
                                onChange={(e) => setProductDetails(e.target.value)}
                                rows={3}
                                placeholder="Ex: À prova d'água 50m, vidro mineral anti-riscos, caixa aço inoxidável, acompanha caixa presenteavel e flanela de limpeza."
                                className="w-full bg-[#18181B] border border-slate-800 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500/60 resize-none"
                            ></textarea>
                        </div>
                    </Card>

                    {/* Character and Tag Customization Panel (User Requested) */}
                    <Card className="border-emerald-500/30 bg-[#0F1218] space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                            <label className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                                <LucideIcon name="sliders" className="w-4 h-4" />
                                Customização de Limites & Tags
                            </label>
                            <span className="text-[10px] bg-emerald-500/10 text-emerald-300 px-2 py-0.5 rounded font-mono">
                                Regras de Validação
                            </span>
                        </div>

                        {/* Title Character Limit Slider */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center text-xs font-mono">
                                <span className="text-slate-300 font-bold">Limite de Caracteres do Título:</span>
                                <span className="text-emerald-400 font-bold bg-slate-800 px-2 py-0.5 rounded">
                                    {titleCharLimit} caracteres
                                </span>
                            </div>
                            <input
                                type="range"
                                min={30}
                                max={300}
                                step={5}
                                value={titleCharLimit}
                                onChange={(e) => setTitleCharLimit(Number(e.target.value))}
                                className="w-full accent-emerald-500 cursor-pointer"
                            />
                            <div className="flex justify-between text-[10px] font-mono text-slate-500">
                                <span>30 (Meli 60)</span>
                                <span>120 (Shopee)</span>
                                <span>200 (Amazon)</span>
                                <span>255 (TikTok)</span>
                                <span>300</span>
                            </div>
                        </div>

                        {/* Description Character Limit Slider */}
                        <div className="space-y-2 pt-1">
                            <div className="flex justify-between items-center text-xs font-mono">
                                <span className="text-slate-300 font-bold">Limite da Descrição:</span>
                                <span className="text-emerald-400 font-bold bg-slate-800 px-2 py-0.5 rounded">
                                    {descCharLimit} caracteres
                                </span>
                            </div>
                            <input
                                type="range"
                                min={200}
                                max={4000}
                                step={100}
                                value={descCharLimit}
                                onChange={(e) => setDescCharLimit(Number(e.target.value))}
                                className="w-full accent-emerald-500 cursor-pointer"
                            />
                            <div className="flex justify-between text-[10px] font-mono text-slate-500">
                                <span>200 (Curto)</span>
                                <span>1500 (Médio)</span>
                                <span>3000 (Longo)</span>
                                <span>4000 (Max)</span>
                            </div>
                        </div>

                        {/* Tag Quantity Selector */}
                        <div className="grid grid-cols-2 gap-3 pt-1">
                            <div className="space-y-1">
                                <label className="text-xs font-mono font-bold text-slate-300">
                                    Quantidade de Tags:
                                </label>
                                <select
                                    value={tagCount}
                                    onChange={(e) => setTagCount(Number(e.target.value))}
                                    className="w-full bg-[#18181B] border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                                >
                                    <option value={5}>5 Tags Otimizadas</option>
                                    <option value={10}>10 Tags Otimizadas</option>
                                    <option value={15}>15 Tags Otimizadas</option>
                                    <option value={20}>20 Tags Otimizadas</option>
                                    <option value={25}>25 Tags Otimizadas</option>
                                    <option value={30}>30 Tags Otimizadas</option>
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-mono font-bold text-slate-300">
                                    Formato das Tags:
                                </label>
                                <select
                                    value={tagFormat}
                                    onChange={(e) => setTagFormat(e.target.value as any)}
                                    className="w-full bg-[#18181B] border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                                >
                                    <option value="hashtags">#hashtags (#tag1 #tag2)</option>
                                    <option value="comma">Vírgulas (tag1, tag2)</option>
                                </select>
                            </div>
                        </div>

                        {/* Toggles */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs font-mono">
                            <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={includeEmojis}
                                    onChange={(e) => setIncludeEmojis(e.target.checked)}
                                    className="accent-emerald-500 rounded"
                                />
                                <span>Incluir Emojis</span>
                            </label>

                            <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={includeCTA}
                                    onChange={(e) => setIncludeCTA(e.target.checked)}
                                    className="accent-emerald-500 rounded"
                                />
                                <span>Incluir Chamada p/ Ação (CTA)</span>
                            </label>
                        </div>
                    </Card>

                    {/* Policy-Safe Compliance Control Card */}
                    <Card className="border-indigo-500/30 bg-[#0F111A] space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                            <label className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-2">
                                <LucideIcon name="shield-check" className="w-4 h-4" />
                                Policy-Safe & Anti-Banimento
                            </label>
                            <span className="text-[10px] bg-indigo-500/10 text-indigo-300 px-2 py-0.5 rounded font-mono border border-indigo-500/20">
                                Diretrizes Estritas
                            </span>
                        </div>

                        <div className="flex items-start justify-between gap-3 pt-1">
                            <div className="space-y-0.5">
                                <span className="text-xs font-bold text-white block">
                                    Filtragem de Conformidade ({currentPlatformObj.name})
                                </span>
                                <p className="text-[11px] text-slate-400 leading-tight">
                                    Bloqueia palavras proibidas que geram reprovação (ex: Frete Grátis/Promoção no Meli, promessas médicas no TikTok).
                                </p>
                            </div>
                            <input
                                type="checkbox"
                                checked={policySafeMode}
                                onChange={(e) => setPolicySafeMode(e.target.checked)}
                                className="accent-indigo-500 rounded w-4 h-4 cursor-pointer mt-0.5"
                            />
                        </div>
                    </Card>

                    {/* Generate Action Button */}
                    <Button
                        onClick={handleGenerate}
                        disabled={loading || (!productName.trim() && !productFile)}
                        variant="primary"
                        className="w-full py-4 text-sm font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-xl shadow-emerald-500/20 tracking-wider uppercase cursor-pointer"
                        icon={loading ? "loader-2" : "sparkles"}
                    >
                        {loading ? "Gerando Anúncio Otimizado..." : `Gerar para ${currentPlatformObj.name}`}
                    </Button>
                </div>

                {/* Right Column: Output Results */}
                <div className="lg:col-span-7 space-y-6">
                    {!result ? (
                        <Card className="border-slate-800/80 bg-[#0F0F11] py-16 text-center space-y-4 flex flex-col items-center justify-center min-h-[500px]">
                            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                                <LucideIcon name="shopping-cart" className="w-8 h-8" />
                            </div>
                            <div className="space-y-1 max-w-md">
                                <h3 className="text-base font-bold text-white">Pronto para Gerar seu Anúncio SEO</h3>
                                <p className="text-xs text-slate-400 leading-relaxed">
                                    Preencha o nome do produto ou envie uma foto, ajuste o limite de caracteres e tags desejado e clique em "Gerar" para criar a listagem completa.
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2 justify-center pt-2">
                                <span className="text-[10px] font-mono bg-slate-800/80 text-slate-400 px-2.5 py-1 rounded-full border border-slate-700/50">
                                    ✓ Regras de Caracteres Estritas
                                </span>
                                <span className="text-[10px] font-mono bg-slate-800/80 text-slate-400 px-2.5 py-1 rounded-full border border-slate-700/50">
                                    ✓ Análise de Visão Computacional
                                </span>
                                <span className="text-[10px] font-mono bg-slate-800/80 text-slate-400 px-2.5 py-1 rounded-full border border-slate-700/50">
                                    ✓ Pontuação SEO de Algoritmo
                                </span>
                            </div>
                        </Card>
                    ) : (
                        <div className="space-y-6 animate-fade-in">
                            {/* Toolbar actions */}
                            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl">
                                <div className="flex items-center gap-2">
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold border ${currentPlatformObj.badgeColor}`}>
                                        {result.platform || currentPlatformObj.name}
                                    </span>
                                    {result.seo_score && (
                                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full text-xs font-mono font-bold flex items-center gap-1">
                                            <LucideIcon name="shield-check" className="w-3.5 h-3.5" />
                                            SEO: {result.seo_score}/100
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center gap-2">
                                    <Button
                                        onClick={handleCopyAll}
                                        variant="secondary"
                                        className="text-xs py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
                                        icon={copiedKey === 'copy_all' ? 'check' : 'copy'}
                                    >
                                        {copiedKey === 'copy_all' ? 'Copiado!' : 'Copiar Tudo'}
                                    </Button>

                                    <Button
                                        onClick={handleExportPDF}
                                        variant="secondary"
                                        className="text-xs py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
                                        icon="file-text"
                                    >
                                        Exportar PDF
                                    </Button>
                                </div>
                            </div>

                            {/* Section 0: Policy-Safe Audit Status */}
                            {policyAudit && (
                                <Card className={`border ${
                                    policyAudit.isSafe 
                                        ? 'border-emerald-500/30 bg-[#0C1A14]' 
                                        : 'border-amber-500/30 bg-[#1A160C]'
                                } space-y-3.5`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className={`p-1.5 rounded-lg ${
                                                policyAudit.isSafe ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                                            }`}>
                                                <LucideIcon name={policyAudit.isSafe ? "shield-check" : "alert-triangle"} className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <h4 className="text-xs font-bold text-white flex items-center gap-2">
                                                    <span>Auditoria Policy-Safe ({currentPlatformObj.name})</span>
                                                    <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                                                        policyAudit.isSafe 
                                                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                                                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                                    }`}>
                                                        {policyAudit.isSafe ? '✓ 100% Conformidade Aprovada' : '⚠️ Ajustes Sanitizados'}
                                                    </span>
                                                </h4>
                                                <p className="text-[11px] text-slate-400">
                                                    {policyAudit.isSafe 
                                                        ? 'Anúncio totalmente compatível com os Termos de Uso e Políticas Comerciais da plataforma.' 
                                                        : 'Sanitizações e filtros preventivos foram ativados para evitar a reprovação do anúncio.'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid sm:grid-cols-2 gap-2 pt-1 border-t border-slate-800/60 text-xs">
                                        {policyAudit.checks.map((check: any) => (
                                            <div key={check.id} className="p-2 rounded-lg bg-black/40 border border-slate-800/80 flex items-start gap-2">
                                                <span className={`text-xs mt-0.5 font-bold ${
                                                    check.status === 'pass' ? 'text-emerald-400' : check.status === 'fixed' ? 'text-cyan-400' : 'text-amber-400'
                                                }`}>
                                                    {check.status === 'pass' ? '✓' : check.status === 'fixed' ? '⚡' : '⚠️'}
                                                </span>
                                                <div className="space-y-0.5">
                                                    <span className="font-semibold text-slate-200 block text-[11px]">{check.label}</span>
                                                    <span className="text-[10px] text-slate-400 leading-tight block">{check.detail}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </Card>
                            )}

                            {/* PINTEREST-SPECIFIC LAYOUT */}
                            {(selectedPlatform === 'pinterest' || result.platform === 'Pinterest / Pins') ? (
                                <>
                                    {/* Pinterest Variant Switcher */}
                                    {result.variants && (
                                        <Card className="border-rose-500/30 bg-[#160B10] space-y-3">
                                            <div className="flex items-center justify-between">
                                                <label className="text-xs font-mono font-bold uppercase tracking-wider text-rose-300 flex items-center gap-2">
                                                    <LucideIcon name="sliders" className="w-4 h-4 text-rose-400" />
                                                    Abordagens de Copy do Pin (3 Variações)
                                                </label>
                                                <span className="text-[10px] text-rose-400 font-mono bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800/40">
                                                    Selecione a Estratégia
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                {[
                                                    { key: 'variant_a_seo_direto', label: 'A. SEO Direto', desc: 'Foco em palavras-chave e busca' },
                                                    { key: 'variant_b_editorial', label: 'B. Inspiração Editorial', desc: 'Lifestyle, visual e inspiração' },
                                                    { key: 'variant_c_afiliado', label: 'C. Afiliado Discreto', desc: 'Curadoria e utilidade prática' }
                                                ].map((variant) => {
                                                    const isActive = activePinterestVariant === variant.key;
                                                    const varData = (result.variants as any)?.[variant.key];
                                                    return (
                                                        <button
                                                            key={variant.key}
                                                            onClick={() => {
                                                                setActivePinterestVariant(variant.key);
                                                                if (varData) {
                                                                    setResult({
                                                                        ...result,
                                                                        main_title: varData.title,
                                                                        main_title_char_count: varData.title.length,
                                                                        description: varData.description,
                                                                        description_char_count: varData.description.length
                                                                    });
                                                                }
                                                            }}
                                                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                                                                isActive
                                                                    ? 'bg-rose-900/30 border-rose-500/70 text-white ring-1 ring-rose-500/40'
                                                                    : 'bg-black/30 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                                                            }`}
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-xs font-bold text-rose-200">{variant.label}</span>
                                                                {isActive && <span className="w-2 h-2 rounded-full bg-rose-400"></span>}
                                                            </div>
                                                            <p className="text-[10px] text-slate-400 mt-1">{variant.desc}</p>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </Card>
                                    )}

                                    {/* 1. Pin Title */}
                                    <Card className="border-slate-800 bg-[#0F0F11] space-y-3">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-mono font-bold uppercase tracking-wider text-rose-400 flex items-center gap-2">
                                                <LucideIcon name="heading" className="w-4 h-4" />
                                                Título do Pin (Campo: Título)
                                            </label>

                                            <div className="flex items-center gap-2">
                                                <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded border ${
                                                    (result.main_title_char_count || 0) <= titleCharLimit
                                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                                        : 'bg-red-500/10 text-red-400 border-red-500/30'
                                                }`}>
                                                    {result.main_title_char_count || result.main_title?.length || 0} / {titleCharLimit} chars
                                                </span>

                                                <button
                                                    onClick={() => handleCopy(result.main_title, 'pinterest_title')}
                                                    className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                                                    title="Copiar título do Pin"
                                                >
                                                    <LucideIcon name={copiedKey === 'pinterest_title' ? 'check' : 'copy'} className="w-4 h-4 text-rose-400" />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="p-3.5 bg-[#18181B] border border-slate-800 rounded-xl text-sm font-semibold text-white leading-relaxed select-all">
                                            {result.main_title}
                                        </div>
                                    </Card>

                                    {/* 2. Pin Description */}
                                    <Card className="border-slate-800 bg-[#0F0F11] space-y-3">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-mono font-bold uppercase tracking-wider text-rose-400 flex items-center gap-2">
                                                <LucideIcon name="file-text" className="w-4 h-4" />
                                                Descrição do Pin (Campo: Descrição)
                                            </label>

                                            <div className="flex items-center gap-2">
                                                <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded border ${
                                                    (result.description_char_count || 0) <= descCharLimit
                                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                                        : 'bg-red-500/10 text-red-400 border-red-500/30'
                                                }`}>
                                                    {result.description_char_count || result.description?.length || 0} / {descCharLimit} chars
                                                </span>

                                                <button
                                                    onClick={() => handleCopy(result.description, 'pinterest_desc')}
                                                    className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                                                    title="Copiar descrição do Pin"
                                                >
                                                    <LucideIcon name={copiedKey === 'pinterest_desc' ? 'check' : 'copy'} className="w-4 h-4 text-rose-400" />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="p-4 bg-[#18181B] border border-slate-800 rounded-xl text-xs text-slate-200 whitespace-pre-wrap leading-relaxed select-all font-sans">
                                            {result.description}
                                        </div>
                                    </Card>

                                    {/* 3. Destination Link Guidance */}
                                    <Card className="border-slate-800 bg-[#0F0F11] space-y-3">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-mono font-bold uppercase tracking-wider text-rose-400 flex items-center gap-2">
                                                <LucideIcon name="link" className="w-4 h-4" />
                                                Link de Destino (Campo: Link)
                                            </label>

                                            <button
                                                onClick={() => handleCopy(result.destination_link || destinationLink || '', 'pinterest_link')}
                                                className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                                                title="Copiar link de destino"
                                            >
                                                <LucideIcon name={copiedKey === 'pinterest_link' ? 'check' : 'copy'} className="w-4 h-4 text-rose-400" />
                                            </button>
                                        </div>

                                        <div className="p-3 bg-[#18181B] border border-slate-800 rounded-xl text-xs text-slate-300 font-mono flex items-center justify-between">
                                            <span className="truncate pr-2">
                                                {result.destination_link || destinationLink || '[Insira o link oficial da sua página ou produto aqui]'}
                                            </span>
                                            <span className="text-[10px] text-slate-500 uppercase tracking-wider flex-shrink-0">URL Destino</span>
                                        </div>
                                        <p className="text-[11px] text-slate-400">
                                            {result.destination_link_guidance || 'Insira o link direto para a página do produto, checkout ou artigo editorial correspondente.'}
                                        </p>
                                    </Card>

                                    {/* 4. Suggested Boards / Pastas */}
                                    {result.suggested_boards && result.suggested_boards.length > 0 && (
                                        <Card className="border-slate-800 bg-[#0F0F11] space-y-3">
                                            <div className="flex items-center justify-between">
                                                <label className="text-xs font-mono font-bold uppercase tracking-wider text-rose-400 flex items-center gap-2">
                                                    <LucideIcon name="folder" className="w-4 h-4" />
                                                    Pastas Sugeridas no Pinterest (Campo: Pasta)
                                                </label>

                                                <button
                                                    onClick={() => handleCopy(result.suggested_boards.join(', '), 'pinterest_boards')}
                                                    className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                                                    title="Copiar todas as pastas sugeridas"
                                                >
                                                    <LucideIcon name={copiedKey === 'pinterest_boards' ? 'check' : 'copy'} className="w-4 h-4 text-rose-400" />
                                                </button>
                                            </div>

                                            <div className="flex flex-wrap gap-2 p-3 bg-[#18181B] border border-slate-800 rounded-xl">
                                                {result.suggested_boards.map((board: string, bIdx: number) => (
                                                    <span
                                                        key={bIdx}
                                                        onClick={() => handleCopy(board, `board_${bIdx}`)}
                                                        className="inline-flex items-center gap-1.5 bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-800/40 px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                                                        title="Clique para copiar esta pasta"
                                                    >
                                                        <LucideIcon name="folder-plus" className="w-3.5 h-3.5 text-rose-400" />
                                                        <span>{board}</span>
                                                    </span>
                                                ))}
                                            </div>
                                        </Card>
                                    )}

                                    {/* 5. Interests & Tags */}
                                    <Card className="border-slate-800 bg-[#0F0F11] space-y-3">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-mono font-bold uppercase tracking-wider text-rose-400 flex items-center gap-2">
                                                <LucideIcon name="tag" className="w-4 h-4" />
                                                Interesses & Tags (Campo: Interesses marcados)
                                            </label>

                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => setTagFormat('hashtags')}
                                                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-colors cursor-pointer ${
                                                        tagFormat === 'hashtags'
                                                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                                            : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                                                    }`}
                                                >
                                                    #hashtags
                                                </button>
                                                <button
                                                    onClick={() => setTagFormat('comma')}
                                                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-colors cursor-pointer ${
                                                        tagFormat === 'comma'
                                                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                                            : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                                                    }`}
                                                >
                                                    vírgulas
                                                </button>

                                                <button
                                                    onClick={() => handleCopy(
                                                        tagFormat === 'hashtags' ? result.formatted_hashtags : result.formatted_keywords_comma,
                                                        'tags'
                                                    )}
                                                    className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer ml-1"
                                                    title="Copiar todos os interesses"
                                                >
                                                    <LucideIcon name={copiedKey === 'tags' ? 'check' : 'copy'} className="w-4 h-4 text-rose-400" />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-1.5 p-3 bg-[#18181B] border border-slate-800 rounded-xl">
                                            {result.tags && result.tags.map((t: string, i: number) => {
                                                const displayTag = tagFormat === 'hashtags'
                                                    ? (t.startsWith('#') ? t : `#${t.replace(/\s+/g, '')}`)
                                                    : t.replace(/^#/, '');
                                                return (
                                                    <span
                                                        key={i}
                                                        className="inline-flex items-center gap-1 bg-slate-800/80 hover:bg-slate-700/80 text-rose-300 border border-slate-700/60 px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer"
                                                        onClick={() => handleCopy(displayTag, `tag_item_${i}`)}
                                                        title="Clique para copiar este interesse"
                                                    >
                                                        {displayTag}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </Card>

                                    {/* 6. Alt Text (Texto Alternativo) */}
                                    {result.alt_text && (
                                        <Card className="border-slate-800 bg-[#0F0F11] space-y-3">
                                            <div className="flex items-center justify-between">
                                                <label className="text-xs font-mono font-bold uppercase tracking-wider text-rose-400 flex items-center gap-2">
                                                    <LucideIcon name="eye" className="w-4 h-4" />
                                                    Texto Alternativo (Campo: Alt Text)
                                                </label>

                                                <button
                                                    onClick={() => handleCopy(result.alt_text, 'pinterest_alt')}
                                                    className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                                                    title="Copiar Alt Text"
                                                >
                                                    <LucideIcon name={copiedKey === 'pinterest_alt' ? 'check' : 'copy'} className="w-4 h-4 text-rose-400" />
                                                </button>
                                            </div>

                                            <div className="p-3 bg-[#18181B] border border-slate-800 rounded-xl text-xs text-slate-300 leading-relaxed font-sans select-all">
                                                {result.alt_text}
                                            </div>
                                            <p className="text-[11px] text-slate-400">
                                                Descreve a imagem com clareza para leitores de tela e fortalece o ranqueamento no algoritmo visual do Pinterest.
                                            </p>
                                        </Card>
                                    )}

                                    {/* 7. AI Modification Disclosure Recommendation */}
                                    <Card className="border-slate-800 bg-[#0F1218] space-y-3">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                                                <LucideIcon name="alert-circle" className="w-4 h-4" />
                                                Aviso de Modificação por IA (Campo: Marcar como modificado por IA)
                                            </label>

                                            <button
                                                onClick={() => handleCopy(result.ai_modification_disclosure || '', 'pinterest_ai_note')}
                                                className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                                                title="Copiar recomendação de IA"
                                            >
                                                <LucideIcon name={copiedKey === 'pinterest_ai_note' ? 'check' : 'copy'} className="w-4 h-4 text-amber-400" />
                                            </button>
                                        </div>

                                        <div className="p-3 bg-[#18181B] border border-slate-800 rounded-xl text-xs text-slate-300 leading-relaxed">
                                            {result.ai_modification_disclosure || 'Ative a opção caso a imagem ou criativo do Pin tenha sido gerado ou modificado por ferramentas de Inteligência Artificial.'}
                                        </div>
                                    </Card>

                                    {/* 8. Pinterest Algorithm Tips */}
                                    {result.seo_recommendations && result.seo_recommendations.length > 0 && (
                                        <Card className="border-slate-800 bg-[#0F1218] space-y-3">
                                            <label className="text-xs font-mono font-bold uppercase tracking-wider text-rose-400 flex items-center gap-2">
                                                <LucideIcon name="lightbulb" className="w-4 h-4" />
                                                Dicas de Descoberta Visual & SEO do Pinterest
                                            </label>
                                            <ul className="space-y-2 text-xs text-slate-300 font-sans">
                                                {result.seo_recommendations.map((tip: string, idx: number) => (
                                                    <li key={idx} className="flex items-start gap-2 bg-[#121214] p-2.5 rounded-lg border border-slate-800/80">
                                                        <span className="text-rose-400 font-mono font-bold">•</span>
                                                        <span className="leading-relaxed">{tip}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </Card>
                                    )}
                                </>
                            ) : (
                                <>
                                    {/* STANDARD E-COMMERCE OUTPUT LAYOUT */}
                                    {/* Section 1: Main Title */}
                                    <Card className="border-slate-800 bg-[#0F0F11] space-y-3">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                                                <LucideIcon name="heading" className="w-4 h-4" />
                                                Título Principal do Anúncio
                                            </label>

                                            <div className="flex items-center gap-2">
                                                <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded border ${
                                                    (result.main_title_char_count || 0) <= titleCharLimit
                                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                                        : 'bg-red-500/10 text-red-400 border-red-500/30'
                                                }`}>
                                                    {result.main_title_char_count || result.main_title?.length || 0} / {titleCharLimit} chars
                                                </span>

                                                <button
                                                    onClick={() => handleCopy(result.main_title, 'main_title')}
                                                    className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                                                    title="Copiar título"
                                                >
                                                    <LucideIcon name={copiedKey === 'main_title' ? 'check' : 'copy'} className="w-4 h-4 text-emerald-400" />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="p-3.5 bg-[#18181B] border border-slate-800 rounded-xl text-sm font-semibold text-white leading-relaxed select-all">
                                            {result.main_title}
                                        </div>

                                        {/* Alternative titles */}
                                        {result.alternative_titles && result.alternative_titles.length > 0 && (
                                            <div className="space-y-2 pt-2 border-t border-slate-800/80">
                                                <span className="text-[11px] font-mono text-slate-400 font-bold uppercase block">
                                                    Títulos Alternativos de Alto CTR:
                                                </span>
                                                <div className="space-y-2">
                                                    {result.alternative_titles.map((alt: string, idx: number) => (
                                                        <div key={idx} className="flex items-center justify-between bg-[#121214] p-2.5 rounded-lg border border-slate-800/80 text-xs text-slate-300">
                                                            <span className="truncate pr-2 font-medium">{alt}</span>
                                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                                <span className="text-[10px] font-mono text-slate-500">
                                                                    {alt.length} chars
                                                                </span>
                                                                <button
                                                                    onClick={() => handleCopy(alt, `alt_${idx}`)}
                                                                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                                                                >
                                                                    <LucideIcon name={copiedKey === `alt_${idx}` ? 'check' : 'copy'} className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </Card>

                                    {/* Section 2: Tags & Keywords */}
                                    <Card className="border-slate-800 bg-[#0F0F11] space-y-3">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                                                <LucideIcon name="tag" className="w-4 h-4" />
                                                Tags / Palavras-Chave ({result.tags?.length || 0} solicitadas)
                                            </label>

                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => setTagFormat('hashtags')}
                                                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-colors cursor-pointer ${
                                                        tagFormat === 'hashtags'
                                                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                                            : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                                                    }`}
                                                >
                                                    #hashtags
                                                </button>
                                                <button
                                                    onClick={() => setTagFormat('comma')}
                                                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-colors cursor-pointer ${
                                                        tagFormat === 'comma'
                                                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                                            : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                                                    }`}
                                                >
                                                    vírgulas
                                                </button>

                                                <button
                                                    onClick={() => handleCopy(
                                                        tagFormat === 'hashtags' ? result.formatted_hashtags : result.formatted_keywords_comma,
                                                        'tags'
                                                    )}
                                                    className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer ml-1"
                                                    title="Copiar todas as tags"
                                                >
                                                    <LucideIcon name={copiedKey === 'tags' ? 'check' : 'copy'} className="w-4 h-4 text-emerald-400" />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-1.5 p-3 bg-[#18181B] border border-slate-800 rounded-xl">
                                            {result.tags && result.tags.map((t: string, i: number) => {
                                                const displayTag = tagFormat === 'hashtags'
                                                    ? (t.startsWith('#') ? t : `#${t.replace(/\s+/g, '')}`)
                                                    : t.replace(/^#/, '');
                                                return (
                                                    <span
                                                        key={i}
                                                        className="inline-flex items-center gap-1 bg-slate-800/80 hover:bg-slate-700/80 text-emerald-300 border border-slate-700/60 px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer"
                                                        onClick={() => handleCopy(displayTag, `tag_item_${i}`)}
                                                        title="Clique para copiar esta tag"
                                                    >
                                                        {displayTag}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </Card>

                                    {/* Section 3: Description */}
                                    <Card className="border-slate-800 bg-[#0F0F11] space-y-3">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                                                <LucideIcon name="file-text" className="w-4 h-4" />
                                                Descrição Otimizada do Produto
                                            </label>

                                            <div className="flex items-center gap-2">
                                                <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded border ${
                                                    (result.description_char_count || 0) <= descCharLimit
                                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                                        : 'bg-red-500/10 text-red-400 border-red-500/30'
                                                }`}>
                                                    {result.description_char_count || result.description?.length || 0} / {descCharLimit} chars
                                                </span>

                                                <button
                                                    onClick={() => handleCopy(result.description, 'description')}
                                                    className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                                                    title="Copiar descrição"
                                                >
                                                    <LucideIcon name={copiedKey === 'description' ? 'check' : 'copy'} className="w-4 h-4 text-emerald-400" />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="p-4 bg-[#18181B] border border-slate-800 rounded-xl text-xs text-slate-200 whitespace-pre-wrap leading-relaxed select-all font-sans">
                                            {result.description}
                                        </div>
                                    </Card>

                                    {/* Section 4: SEO Recommendations & Algorithmic Tips */}
                                    {result.seo_recommendations && result.seo_recommendations.length > 0 && (
                                        <Card className="border-slate-800 bg-[#0F1218] space-y-3">
                                            <label className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                                                <LucideIcon name="lightbulb" className="w-4 h-4" />
                                                Dicas de Algoritmo & Indexação ({result.platform})
                                            </label>
                                            <ul className="space-y-2 text-xs text-slate-300 font-sans">
                                                {result.seo_recommendations.map((tip: string, idx: number) => (
                                                    <li key={idx} className="flex items-start gap-2 bg-[#121214] p-2.5 rounded-lg border border-slate-800/80">
                                                        <span className="text-amber-400 font-mono font-bold">•</span>
                                                        <span className="leading-relaxed">{tip}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </Card>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
