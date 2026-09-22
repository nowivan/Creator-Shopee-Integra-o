import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, Button, LucideIcon, usePasteImageUpload } from './Common';
import { processGeminiAPI, safeJSONParse, copyToClipboard, WORKER_URL, WORKER_TOKEN, safeSaveHistory } from '../utils';
import { postToWorker, isAbortError, isTimeoutError } from '../services/workerClient';
import { checkWorkerHealth, canGenerateWithProxy, getNormalizedProxyStatus } from '../utils/api';
import {
    CreativeDirectorSavedSession,
    CreativeDirectorFinalPromptStructureSnapshot,
    CreativeDirectorScene2CompilerSnapshot,
    CreativeDirectorScene3CompilerSnapshot,
    hasValidScene2CompiledOutput,
    hasValidScene3CompiledOutput,
    hasValidFinalPromptOutput,
    saveCreativeDirectorSession,
    loadCreativeDirectorSession,
    clearCreativeDirectorSession,
    isValidCreativeDirectorSession,
    shouldOfferCreativeDirectorRestore
} from '../features/creative-director/creativeDirectorSessionStorage';
import {
    analyzeCreativeDirectorProductImage,
    buildCreativeDirectorObjectLock,
    CreativeDirectorProductImageAnalysis,
    CreativeDirectorObjectLock
} from '../features/creative-director/analyzeCreativeDirectorProductImage';
import { Scene2CompilerPanel } from '../features/creative-director/components/Scene2CompilerPanel';
import { Scene3CompilerPanel } from '../features/creative-director/components/Scene3CompilerPanel';
import { ShopeeSceneHubPanel } from '../features/shopee-scene-hub/components/ShopeeSceneHubPanel';
import { ShopeeSceneHubSnapshot } from '../features/shopee-scene-hub/types';
import { Scene3CtaHandoff } from '../features/creative-director/types/scene3';
import {
    CreativeDirectorProductWorkspace,
    ProductGroundingResult,
    Scene2ProductContext
} from '../features/creative-director/types/compilerTypes';
import {
    analyzeProductFactualGrounding,
    createNormalizedProductContext
} from '../features/creative-director/services/productGroundingService';
import { ViralHandoffBanner } from '../features/creative-director/components/ViralHandoffBanner';
import { 
    compileViralIdeaToScenes, 
    ViralTemplateContext, 
    ViralSpeechMode, 
    ViralExecutionStyle, 
    ViralTargetAi 
} from '../features/creative-director/templates/viralSceneTemplates';
import { ViralIdeaPayload } from '../utils/viralHandoff';
// Helper to save successful generations to history
function saveToHistory(tool: string, title: string, content: string) {
    safeSaveHistory({
        date: new Date().toLocaleString(),
        tool,
        title,
        content
    });
}

interface CreativeDirectorViewProps {
    currentKey: string;
}

export const VOICE_STYLE_OPTIONS = [
    'Authoritative Male',
    'Conversational Male',
    'UGC Female',
    'Premium Female',
    'Young Energetic',
    'Documentary Narrator',
    'Commercial Narrator',
    'No Narration'
];

export const VOICE_STYLE_EXAMPLES: Record<string, string> = {
    'Authoritative Male': 'Com mais de uma década de testes comprovados, este mecanismo de engenharia entrega segurança sem concessões.',
    'Conversational Male': 'Sabe quando você está tentando se arrumar de manhã, e tudo parece uma completa bagunça?',
    'UGC Female': 'Gente, eu estava super cética no começo de verdade, mas olha só que incrível que ficou a minha mesa da cozinha!',
    'Premium Female': 'Esculpido com materiais premium de alta densidade, desenhado exclusivamente para quem exige a perfeição absoluta.',
    'Young Energetic': 'Meu Deus gente, vocês não vão acreditar no que acabou de lançar! Isso aqui literalmente mudou tudo!',
    'Documentary Narrator': 'Nas profundezas da paisagem montanhosa, um raro fenômeno se revela, mostrando a origem dos materiais sustentáveis.',
    'Commercial Narrator': 'Experimente a elite da performance da próxima geração. Disponível hoje nas melhores lojas comerciais.',
    'No Narration': 'Apenas visual com efeitos sonoros dinâmicos, transições rítmicas e legendas de alto impacto na tela.'
};

export const VOICE_STYLE_LABELS: Record<string, string> = {
    'Authoritative Male': 'Masculina Autoritária',
    'Conversational Male': 'Masculina Conversacional',
    'UGC Female': 'Feminina UGC',
    'Premium Female': 'Feminina Premium',
    'Young Energetic': 'Jovem Energética',
    'Documentary Narrator': 'Narrador Documentário',
    'Commercial Narrator': 'Narrador Comercial',
    'No Narration': 'Sem Narração'
};

export const HOOK_STYLE_OPTIONS = [
    'Curiosity',
    'Problem → Solution',
    'Direct Question',
    'Shock / Surprise',
    'Social Proof',
    'Personal Story',
    'Comparison',
    'Result First',
    'Common Mistake',
    'Irresistible Offer'
];

export const HOOK_STYLE_LABELS: Record<string, string> = {
    'Curiosity': 'Curiosidade',
    'Problem → Solution': 'Problema → Solução',
    'Direct Question': 'Pergunta Direta',
    'Shock / Surprise': 'Choque / Surpresa',
    'Social Proof': 'Prova Social',
    'Personal Story': 'História Pessoal',
    'Comparison': 'Comparação',
    'Result First': 'Resultado Primeiro',
    'Common Mistake': 'Erro Comum',
    'Irresistible Offer': 'Oferta Irresistível'
};

export const EMOTIONAL_TRIGGER_OPTIONS = [
    'Urgency',
    'Scarcity',
    'Curiosity',
    'Desire',
    'Fear of Missing Out',
    'Authority',
    'Trust',
    'Exclusivity',
    'Transformation',
    'Aspiration'
];

export const EMOTIONAL_TRIGGER_LABELS: Record<string, string> = {
    'Urgency': 'Urgência',
    'Scarcity': 'Escassez',
    'Curiosity': 'Curiosidade',
    'Desire': 'Desejo',
    'Fear of Missing Out': 'Medo de Perder',
    'Authority': 'Autoridade',
    'Trust': 'Confiança',
    'Exclusivity': 'Exclusividade',
    'Transformation': 'Transformação',
    'Aspiration': 'Aspiração'
};

export const AUDIENCE_TYPE_OPTIONS = [
    'Cold Audience',
    'Warm Audience',
    'Hot Audience',
    'Impulse Buyers',
    'Women',
    'Men',
    'Parents',
    'Young Adults',
    'Professionals',
    'Entrepreneurs'
];

export const AUDIENCE_TYPE_LABELS: Record<string, string> = {
    'Cold Audience': 'Público Frio',
    'Warm Audience': 'Público Morno',
    'Hot Audience': 'Público Quente',
    'Impulse Buyers': 'Compradores Impulsivos',
    'Women': 'Mulheres',
    'Men': 'Homens',
    'Parents': 'Pais',
    'Young Adults': 'Jovens',
    'Professionals': 'Profissionais',
    'Entrepreneurs': 'Empreendedores'
};

export const PRESENTER_STYLE_OPTIONS = [
    'UGC Creator',
    'Expert',
    'Real Customer',
    'Invisible Narrator',
    'Influencer',
    'Salesperson',
    'Reporter',
    'Character Actor',
    'AI Avatar',
    'No Presenter'
];

export const PRESENTER_STYLE_LABELS: Record<string, string> = {
    'UGC Creator': 'Criador UGC',
    'Expert': 'Especialista',
    'Real Customer': 'Cliente Real',
    'Invisible Narrator': 'Narrador Invisível',
    'Influencer': 'Influenciador',
    'Salesperson': 'Vendedor',
    'Reporter': 'Repórter',
    'Character Actor': 'Personagem',
    'AI Avatar': 'Avatar IA',
    'No Presenter': 'Sem Apresentador'
};

export const CAMERA_STYLE_OPTIONS = [
    'Static',
    'Handheld',
    'Cinematic',
    'Drone',
    'POV',
    'Macro',
    'Tracking Shot',
    'Product Showcase',
    'Documentary'
];

export const CAMERA_STYLE_LABELS: Record<string, string> = {
    'Static': 'Estático',
    'Handheld': 'Câmera na Mão',
    'Cinematic': 'Cinematográfico',
    'Drone': 'Drone',
    'POV': 'POV',
    'Macro': 'Macro',
    'Tracking Shot': 'Travelling',
    'Product Showcase': 'Exposição de Produto',
    'Documentary': 'Documentário'
};

export const ENERGY_LEVEL_OPTIONS = [
    'Very Calm',
    'Calm',
    'Moderate',
    'Energetic',
    'Viral',
    'Extremely Viral'
];

export const ENERGY_LEVEL_LABELS: Record<string, string> = {
    'Very Calm': 'Muito Calmo',
    'Calm': 'Calmo',
    'Moderate': 'Moderado',
    'Energetic': 'Energético',
    'Viral': 'Viral',
    'Extremely Viral': 'Extremamente Viral'
};

export const OPTIMIZATION_LEVEL_OPTIONS = [
    'Organic',
    'Hybrid',
    'Conversion',
    'Scale',
    'Marketplace'
];

export const OPTIMIZATION_LEVEL_LABELS: Record<string, string> = {
    'Organic': 'Orgânico',
    'Hybrid': 'Híbrido',
    'Conversion': 'Conversão',
    'Scale': 'Escala',
    'Marketplace': 'Marketplace'
};

export const STRATEGIC_PRODUCT_CATEGORY_OPTIONS = [
    'Beauty',
    'Fashion',
    'Watches',
    'Electronics',
    'Home',
    'Kitchen',
    'Fitness',
    'Health',
    'Children',
    'Automotive',
    'Courses',
    'Software',
    'Accessories',
    'Jewelry',
    'Shoes',
    'Bags',
    'Pet',
    'Tools',
    'Other'
];

export const STRATEGIC_PRODUCT_CATEGORY_LABELS: Record<string, string> = {
    'Beauty': 'Beleza',
    'Fashion': 'Moda',
    'Watches': 'Relógios',
    'Electronics': 'Eletrônicos',
    'Home': 'Casa',
    'Kitchen': 'Cozinha',
    'Fitness': 'Fitness',
    'Health': 'Saúde',
    'Children': 'Infantil',
    'Automotive': 'Automotivo',
    'Courses': 'Cursos',
    'Software': 'Software',
    'Accessories': 'Acessórios',
    'Jewelry': 'Joias',
    'Shoes': 'Calçados',
    'Bags': 'Bolsas',
    'Pet': 'Pet',
    'Tools': 'Ferramentas',
    'Other': 'Outro'
};

export const VIRAL_FRAMEWORK_OPTIONS = [
    'AIDA',
    'PAS',
    'BAB',
    'Storytelling',
    'UGC Review',
    'TikTok Viral',
    'Problem Agitation',
    'Before & After',
    'Demonstration',
    'Authority'
];

export const VIRAL_FRAMEWORK_LABELS: Record<string, string> = {
    'AIDA': 'AIDA',
    'PAS': 'PAS',
    'BAB': 'BAB',
    'Storytelling': 'Storytelling',
    'UGC Review': 'Review UGC',
    'TikTok Viral': 'TikTok Viral',
    'Problem Agitation': 'Problema e Agitação',
    'Before & After': 'Antes e Depois',
    'Demonstration': 'Demonstração',
    'Authority': 'Autoridade'
};

const PLATFORMS_INTELLIGENCE: Record<string, {
    name: string;
    icon: string;
    color: string;
    bgHover: string;
    borderActive: string;
    textActive: string;
    characteristics: string[];
    optimize: string[];
    ctaHint: string;
    durationHint: string;
    defaultVoiceStyle: string;
    defaultCtaStyle: 'AJUDA_INDIRETA' | 'DIRETO' | 'BUG';
    defaultDuration: string;
}> = {
    'TikTok Shop': {
        name: 'TikTok Shop',
        icon: 'smartphone',
        color: 'rose',
        bgHover: 'hover:bg-red-500/5',
        borderActive: 'border-rose-500/40 bg-red-950/20 text-red-400',
        textActive: 'text-rose-450',
        characteristics: [
            'Gancho rápido nos primeiros 3s',
            'Forte interrupção visual (interruption pattern)',
            'Voz enérgica e ágil de vendedor UGC',
            'Demonstração imediata e prova do produto',
            'Duração compacta de 15 a 30 segundos'
        ],
        optimize: [
            'Rápido gancho (Hook)',
            'Energia vocal extrema (Voice Energy)',
            'Urgência com foco em carrinho'
        ],
        ctaHint: 'Carrinho laranja',
        durationHint: '15-25s',
        defaultVoiceStyle: 'Vendedor TikTok',
        defaultCtaStyle: 'DIRETO',
        defaultDuration: 'Short (20s)'
    },
    'Shopee Vídeo': {
        name: 'Shopee Vídeo',
        icon: 'shopping-bag',
        color: 'orange',
        bgHover: 'hover:bg-orange-500/5',
        borderActive: 'border-orange-500/40 bg-orange-950/20 text-orange-400',
        textActive: 'text-orange-400',
        characteristics: [
            'Totalmente direcionado a preço e oferta',
            'Ganchos com forte apelo de economia imediata',
            'Destaque para frete grátis e cupons ativos',
            'Apresentação rápida dos benefícios'
        ],
        optimize: [
            'Margem de economia (Savings)',
            'Posicionamento de descontos e preços',
            'Exibição de benefícios e cupons'
        ],
        ctaHint: 'Produto marcado',
        durationHint: '20-35s',
        defaultVoiceStyle: 'Urgência',
        defaultCtaStyle: 'BUG',
        defaultDuration: 'Medium (30s)'
    },
    'Mercado Livre': {
        name: 'Mercado Livre',
        icon: 'shield',
        color: 'yellow',
        bgHover: 'hover:bg-yellow-500/5',
        borderActive: 'border-yellow-500/40 bg-yellow-950/20 text-yellow-500',
        textActive: 'text-yellow-400',
        characteristics: [
            'Credibilidade, garantia e procedência',
            'Exposição de especificações precisas',
            'Segurança e facilidades de compra sem atritos',
            'Reforço de entrega rápida (Full)'
        ],
        optimize: [
            'Sensação de segurança (Credibility)',
            'Especificações técnicas e materiais',
            'Compra garantida'
        ],
        ctaHint: 'Link no anúncio / Produto no anúncio',
        durationHint: '20-30s',
        defaultVoiceStyle: 'Autoridade',
        defaultCtaStyle: 'AJUDA_INDIRETA',
        defaultDuration: 'Medium (30s)'
    },
    'Facebook Reels': {
        name: 'Facebook Reels',
        icon: 'facebook',
        color: 'blue',
        bgHover: 'hover:bg-blue-500/5',
        borderActive: 'border-blue-500/40 bg-blue-950/20 text-blue-400',
        textActive: 'text-blue-400',
        characteristics: [
            'Storytelling natural com tom humanizado',
            'Conexão com dramas reais ou vivências comuns',
            'Abordagem de venda menos agressiva e de alta empatia',
            'Estilo de diálogo fluído para interação'
        ],
        optimize: [
            'Narrativa empática e envolvente',
            'Estímulo de comentários (engagement)',
            'Provocar curiosidade prolongada'
        ],
        ctaHint: 'Soft engagement (Comentários)',
        durationHint: '30-60s',
        defaultVoiceStyle: 'Storytelling',
        defaultCtaStyle: 'AJUDA_INDIRETA',
        defaultDuration: 'Long (45s)'
    },
    'Instagram Reels': {
        name: 'Instagram Reels',
        icon: 'instagram',
        color: 'pink',
        bgHover: 'hover:bg-pink-500/5',
        borderActive: 'border-pink-500/40 bg-pink-950/20 text-pink-400',
        textActive: 'text-pink-450',
        characteristics: [
            'Estética visual sofisticada e refinada (Lifestyle)',
            'Desejo instantâneo com forte identidade de marca',
            'Presença de provas sociais elegantes e dinâmicas',
            'Valorização de cenários, paletas e design'
        ],
        optimize: [
            'Design e atratividade visual requintada',
            'Experiência aspiracional de marca',
            'Desejo e status'
        ],
        ctaHint: 'Link na bio ou "Chame no direct"',
        durationHint: '15-30s',
        defaultVoiceStyle: 'Premium',
        defaultCtaStyle: 'AJUDA_INDIRETA',
        defaultDuration: 'Medium (30s)'
    },
    'YouTube Shorts': {
        name: 'YouTube Shorts',
        icon: 'youtube',
        color: 'rose',
        bgHover: 'hover:bg-rose-500/5',
        borderActive: 'border-rose-500/40 bg-rose-950/20 text-rose-400',
        textActive: 'text-rose-400',
        characteristics: [
            'Retenção cirúrgica focada em tempo de exibição',
            'Loops criativos de final integrado ao início',
            'Ângulos instrutivos, demonstrações e hacks breves',
            'Ritmo dinâmico sem pausas ou momentos ociosos'
        ],
        optimize: [
            'Watch time (retenção sustentada)',
            'Loop contínuo (Curiosity Loops)',
            'Evitar vácuos de narrativa'
        ],
        ctaHint: 'Retention-focused (Comentários fixados)',
        durationHint: '30-60s',
        defaultVoiceStyle: 'Educacional',
        defaultCtaStyle: 'DIRETO',
        defaultDuration: 'Long (45s)'
    }
};

export const TARGET_DURATION_OPTIONS = ['6s', '8s', '10s', '15s', '20s', '30s', '45s', '60s'];

export const VISUAL_AESTHETIC_OPTIONS = [
    'UGC Realista',
    'Cinematográfico Premium',
    'Produto Luxo',
    'Unboxing Natural',
    'Review de Criador',
    'Demonstração Prática',
    'Novela / Drama',
    'Lifestyle',
    'Estúdio Branco',
    'Fundo Preto Premium',
    'POV Hands Only',
    'TikTok Shop Viral',
    'Shopee Achadinhos'
];

export const ASPECT_RATIO_OPTIONS = [
    '9:16 Vertical',
    '16:9 Horizontal',
    '1:1 Square',
    '4:5 Feed',
    '3:4 Marketplace'
];

export const OBJECTIVE_OPTIONS = [
    'Vender Produto',
    'Demonstrar Produto',
    'Gerar Curiosidade',
    'Criar Prova Social',
    'Comparar Antes e Depois',
    'Apresentar Benefícios',
    'Resolver Objeção',
    'Criar Urgência',
    'Storytelling',
    'Unboxing',
    'Review Honesta',
    'Tutorial Rápido',
    'Novela / Cena de Drama',
    'Recriar Criativo Viral',
    'Adaptar para Novo Produto'
];

export const CTA_STYLE_OPTIONS = [
    'Carrinho Laranja',
    'Produto Marcado',
    'Link do Anúncio',
    'Chame no Direct',
    'Comente “eu quero”',
    'Salve para ver depois',
    'Clique para conferir',
    'Aproveite antes que acabe',
    'Oferta por tempo limitado',
    'Ver avaliações',
    'Comparar preço',
    'Comprar agora',
    'CTA Suave',
    'CTA Urgente',
    'CTA de Curiosidade'
];

export function CreativeDirectorView({ currentKey }: CreativeDirectorViewProps) {
    const [productName, setProductName] = useState('');
    const [scene3CtaHandoff, setScene3CtaHandoff] = useState<Scene3CtaHandoff | null>(null);

    // Phase 2.4.2B: Authoritative Shared Product Workspace for Scene 2 and Scene 3
    const [productWorkspace, setProductWorkspace] = useState<CreativeDirectorProductWorkspace>({
        productImageFile: null,
        productImagePreview: null,
        productImageName: null,
        productRevisionId: null,
        groundingResult: null,
        normalizedProductContext: null,
        productIdentity: null,
        groundingStatus: 'idle',
        groundingError: null
    });

    const handleSharedProductImage = (file: File) => {
        if (!file) return;
        const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
        if (!validTypes.includes(file.type.toLowerCase())) {
            alert('Formato inválido. Por favor envie uma imagem PNG, JPG, JPEG ou WEBP.');
            return;
        }

        const revId = `rev_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = reader.result as string;
            setProductWorkspace({
                productImageFile: file,
                productImagePreview: dataUrl,
                productImageName: file.name || 'product-reference.png',
                productRevisionId: revId,
                groundingResult: null,
                normalizedProductContext: null,
                productIdentity: null,
                groundingStatus: 'idle',
                groundingError: null
            });
            // Product replacement invalidates any stale CTA handoff from prior product revision
            setScene3CtaHandoff(null);
        };
        reader.readAsDataURL(file);
    };

    const handleRemoveSharedProduct = () => {
        setProductWorkspace({
            productImageFile: null,
            productImagePreview: null,
            productImageName: null,
            productRevisionId: null,
            groundingResult: null,
            normalizedProductContext: null,
            productIdentity: null,
            groundingStatus: 'idle',
            groundingError: null
        });
        setScene3CtaHandoff(null);
    };

    const handleAnalyzeSharedProduct = async (overrides?: {
        productName?: string;
        category?: string;
        userFacts?: string[];
        productQuantity?: string | number;
        observableDetails?: string[];
        verifiedFacts?: string[];
        uncertainObservations?: string[];
        forceReanalyze?: boolean;
    }): Promise<{ grounding: ProductGroundingResult; normalized: Scene2ProductContext } | null> => {
        if (!productWorkspace.productImagePreview) {
            throw new Error('Nenhuma imagem de produto carregada para análise.');
        }

        // Exact Token-Saving Reusability Contract:
        // If grounding is already ready for current productRevisionId and no forceReanalyze is requested, reuse it!
        if (
            !overrides?.forceReanalyze &&
            productWorkspace.groundingStatus === 'ready' &&
            productWorkspace.groundingResult &&
            productWorkspace.normalizedProductContext
        ) {
            return {
                grounding: productWorkspace.groundingResult,
                normalized: productWorkspace.normalizedProductContext
            };
        }

        setProductWorkspace(prev => ({
            ...prev,
            groundingStatus: 'analyzing',
            groundingError: null
        }));

        try {
            const grounding = await analyzeProductFactualGrounding(
                {
                    imageInput: {
                        file: productWorkspace.productImageFile || undefined,
                        base64: productWorkspace.productImagePreview
                    },
                    productName: overrides?.productName || productWorkspace.productIdentity || undefined,
                    category: overrides?.category || undefined,
                    userFacts: overrides?.userFacts
                },
                currentKey
            );

            const normalized = createNormalizedProductContext(
                grounding,
                overrides?.userFacts || [],
                overrides
            );

            setProductWorkspace(prev => ({
                ...prev,
                groundingResult: grounding,
                normalizedProductContext: normalized,
                productIdentity: normalized.identity,
                groundingStatus: 'ready',
                groundingError: null
            }));

            return {
                grounding,
                normalized
            };
        } catch (err: any) {
            console.error('Shared Grounding Analysis Error:', err);
            const isAborted = isAbortError(err);
            const isTimeout = isTimeoutError(err);
            
            let errMsg = err.message || 'Erro ao analisar a imagem do produto.';
            if (isAborted) {
                errMsg = 'Análise cancelada. Clique em "Analisar Produto" para tentar novamente.';
            } else if (isTimeout) {
                errMsg = 'Tempo limite esgotado ao analisar o produto. Tente novamente.';
            }

            setProductWorkspace(prev => ({
                ...prev,
                groundingStatus: isAborted ? 'idle' : 'error',
                groundingError: errMsg
            }));
            throw err;
        }
    };

    const handleUpdateSharedProductContext = (updatedContext: Scene2ProductContext) => {
        setProductWorkspace(prev => ({
            ...prev,
            normalizedProductContext: updatedContext,
            productIdentity: updatedContext.identity
        }));
    };

    const [category, setCategory] = useState('👗 Roupas Femininas & Lingerie');
    const [platform, setPlatform] = useState('TikTok Shop');
    const [objective, setObjective] = useState('Vender Produto');
    const [visualStyle, setVisualStyle] = useState('UGC Realista');
    const [ctaStyle, setCtaStyle] = useState('Carrinho Laranja');
    const [duration, setDuration] = useState('15s');
    const [format, setFormat] = useState('9:16 Vertical');
    const [extraInstructions, setExtraInstructions] = useState('');

    // Strategic Creative Controls
    const [hookStyle, setHookStyle] = useState('Curiosity');
    const [emotionalTrigger, setEmotionalTrigger] = useState('Desire');
    const [audienceType, setAudienceType] = useState('Cold Audience');
    const [presenterStyle, setPresenterStyle] = useState('UGC Creator');
    const [cameraStyle, setCameraStyle] = useState('Handheld');
    const [energyLevel, setEnergyLevel] = useState('Energetic');
    const [optimizationLevel, setOptimizationLevel] = useState('Conversion');
    const [productCategory, setProductCategory] = useState('Electronics');
    const [viralFramework, setViralFramework] = useState('UGC Review');

    // State trackers to protect manually edited fields from silent auto-overwriting
    const [hasUserEditedProductName, setHasUserEditedProductName] = useState(false);
    const [hasUserEditedProductCategory, setHasUserEditedProductCategory] = useState(false);
    const [hasUserEditedCategory, setHasUserEditedCategory] = useState(false);
    
    const [hasUserEditedCbProductName, setHasUserEditedCbProductName] = useState(false);
    const [hasUserEditedCbProductCategory, setHasUserEditedCbProductCategory] = useState(false);
    const [hideRecommendation, setHideRecommendation] = useState(false);

    function detectStrategicProductCategoryFromAnalysis(analysis: string): string {
        const text = analysis.toLowerCase();

        const patterns: { key: string; keywords: string[] }[] = [
            { key: 'Watches', keywords: ['relógio', 'watch', 'dial', 'strap', 'chronograph', 'cronógrafo'] },
            { key: 'Electronics', keywords: ['fone', 'earbuds', 'smartphone', 'charger', 'speaker', 'eletrônico', 'fones', 'carregador', 'cabo usb', 'smartwatch', 'smart watch'] },
            { key: 'Beauty', keywords: ['perfume', 'maquiagem', 'skincare', 'serum', 'beleza', 'perfumaria', 'cosmético', 'batom', 'base líquida', 'creme', 'rímel'] },
            { key: 'Fashion', keywords: ['roupa', 'vestido', 'camiseta', 'calça', 'moda', 'vestuário', 'jaqueta', 'casaco', 'blusa'] },
            { key: 'Shoes', keywords: ['tênis', 'sapato', 'sandália', 'calçado', 'bota', 'chinelo', 'sapatilha'] },
            { key: 'Bags', keywords: ['bolsa', 'mochila', 'handbag', 'bag', 'carteira'] },
            { key: 'Jewelry', keywords: ['anel', 'colar', 'pulseira', 'brinco', 'joia', 'ouro', 'prata', 'pingente', 'joias'] },
            { key: 'Kitchen', keywords: ['panela', 'air fryer', 'utensílio', 'cozinha', 'eletroportátil', 'frigideira', 'talher', 'copo', 'batedeira', 'liquidificador'] },
            { key: 'Home', keywords: ['luminária', 'decoracao', 'decoração', 'organizador', 'casa', 'móvel', 'almofada', 'quarto', 'sala'] },
            { key: 'Health', keywords: ['suplemento', 'massageador', 'saúde', 'saude', 'vitamina', 'termogênico', 'medicamento', 'remédio'] },
            { key: 'Fitness', keywords: ['halter', 'treino', 'academia', 'exercício', 'fitness', 'esporte', 'pesos', 'whey'] },
            { key: 'Children', keywords: ['brinquedo', 'bebê', 'bebe', 'criança', 'infantil', 'chupeta', 'fralda'] },
            { key: 'Tools', keywords: ['furadeira', 'ferramenta', 'parafuso', 'chave fenda', 'alicates'] },
            { key: 'Pet', keywords: ['cachorro', 'gato', 'coleira', 'pet', 'ração', 'gatos', 'cães'] },
            { key: 'Courses', keywords: ['curso', 'ebook', 'mentoria', 'treinamento', 'digital product', 'e-book'] },
            { key: 'Software', keywords: ['app', 'saas', 'plataforma', 'software', 'sistema', 'aplicativo'] }
        ];

        for (const pattern of patterns) {
            if (pattern.keywords.some(keyword => text.includes(keyword))) {
                return pattern.key;
            }
        }

        return 'Other';
    }

    const handlePlatformChangeInternal = (platName: string) => {
        setPlatform(platName);
        const intel = PLATFORMS_INTELLIGENCE[platName];
        if (intel) {
            setVoiceStyle(intel.defaultVoiceStyle);
            
            // Map duration appropriately
            if (platName === 'TikTok Shop') setDuration('15s');
            else if (platName === 'Shopee Vídeo') setDuration('20s');
            else if (platName === 'Mercado Livre') setDuration('30s');
            else if (platName === 'Facebook Reels') setDuration('45s');
            else if (platName === 'Instagram Reels') setDuration('30s');
            else if (platName === 'YouTube Shorts') setDuration('15s');
            
            // Map objective appropriately
            if (platName === 'TikTok Shop') setObjective('Vender Produto');
            else if (platName === 'Shopee Vídeo') setObjective('Apresentar Benefícios');
            else if (platName === 'Mercado Livre') setObjective('Demonstrar Produto');
            else if (platName === 'Facebook Reels') setObjective('Storytelling');
            else if (platName === 'Instagram Reels') setObjective('Gerar Curiosidade');
            else if (platName === 'YouTube Shorts') setObjective('Tutorial Rápido');

            // Map visualStyle appropriately
            if (platName === 'Instagram Reels') setVisualStyle('Cinematográfico Premium');
            else if (platName === 'YouTube Shorts') setVisualStyle('Review de Criador');
            else if (platName === 'Mercado Livre') setVisualStyle('Demonstração Prática');
            else if (platName === 'Facebook Reels') setVisualStyle('Lifestyle');
            else if (platName === 'TikTok Shop') setVisualStyle('TikTok Shop Viral');
            else if (platName === 'Shopee Vídeo') setVisualStyle('Shopee Achadinhos');
            else setVisualStyle('UGC Realista');

            // Map ctaStyle appropriately
            if (platName === 'TikTok Shop') setCtaStyle('Carrinho Laranja');
            else if (platName === 'Shopee Vídeo') setCtaStyle('Produto Marcado');
            else if (platName === 'Mercado Livre') setCtaStyle('Link do Anúncio');
            else if (platName === 'Instagram Reels') setCtaStyle('Chame no Direct');
            else if (platName === 'Facebook Reels') setCtaStyle('Clique para conferir');
            else if (platName === 'YouTube Shorts') setCtaStyle('Comente “eu quero”');

            // Strategic Controls Auto-mapping presets
            if (platName === 'TikTok Shop') {
                setHookStyle('Result First');
                setEnergyLevel('Extremely Viral');
                setOptimizationLevel('Marketplace');
                setViralFramework('UGC Review');
                setVoiceStyle('Young Energetic');
                setPresenterStyle('UGC Creator');
                setCameraStyle('Handheld');
                setEmotionalTrigger('Desire');
                setAudienceType('Impulse Buyers');
            } else if (platName === 'Instagram Reels') {
                setHookStyle('Curiosity');
                setEnergyLevel('Viral');
                setOptimizationLevel('Hybrid');
                setViralFramework('Storytelling');
                setVoiceStyle('Premium Female');
                setPresenterStyle('Influencer');
                setCameraStyle('Cinematic');
                setEmotionalTrigger('Aspiration');
                setAudienceType('Warm Audience');
            } else if (platName === 'Shopee Vídeo') {
                setHookStyle('Curiosity');
                setEnergyLevel('Viral');
                setOptimizationLevel('Marketplace');
                setViralFramework('Demonstration');
                setVoiceStyle('UGC Female');
                setPresenterStyle('Real Customer');
                setCameraStyle('Handheld');
                setEmotionalTrigger('Scarcity');
                setAudienceType('Impulse Buyers');
            } else if (platName === 'YouTube Shorts') {
                setHookStyle('Problem → Solution');
                setEnergyLevel('Extremely Viral');
                setOptimizationLevel('Conversion');
                setViralFramework('UGC Review');
                setVoiceStyle('Conversational Male');
                setPresenterStyle('UGC Creator');
                setCameraStyle('POV');
                setEmotionalTrigger('Curiosity');
                setAudienceType('Cold Audience');
            } else if (platName === 'Mercado Livre') {
                setHookStyle('Direct Question');
                setEnergyLevel('Moderate');
                setOptimizationLevel('Scale');
                setViralFramework('BAB');
                setVoiceStyle('Authoritative Male');
                setPresenterStyle('Expert');
                setCameraStyle('Product Showcase');
                setEmotionalTrigger('Trust');
                setAudienceType('Hot Audience');
            } else if (platName === 'Facebook Reels') {
                setHookStyle('Personal Story');
                setEnergyLevel('Calm');
                setOptimizationLevel('Organic');
                setViralFramework('Storytelling');
                setVoiceStyle('Conversational Male');
                setPresenterStyle('Real Customer');
                setCameraStyle('Handheld');
                setEmotionalTrigger('Trust');
                setAudienceType('Cold Audience');
            }
        }
    };

    // Previews & base64 states for inputs
    const [productImage, setProductImage] = useState<any>(null);
    const [scenarioImage, setScenarioImage] = useState<any>(null);
    const [avatarImage, setAvatarImage] = useState<any>(null);
    const [refVideo, setRefVideo] = useState<any>(null);
    const [refImage, setRefImage] = useState<any>(null);

    const [creativeMode, setCreativeMode] = useState<'commercial' | 'novel'>('commercial');
    const [characters, setCharacters] = useState<any[]>([]);
    const [editingCharacter, setEditingCharacter] = useState<any | null>(null);
    const [showCharacterForm, setShowCharacterForm] = useState(false);

    // Character Form draft states
    const [charName, setCharName] = useState('');
    const [charRole, setCharRole] = useState('Main Character');
    const [charRefImg, setCharRefImg] = useState<string | null>(null);
    const [charAge, setCharAge] = useState('');
    const [charHeight, setCharHeight] = useState('');
    const [charSkin, setCharSkin] = useState('');
    const [charNationality, setCharNationality] = useState('');
    const [charBody, setCharBody] = useState('');
    const [charFace, setCharFace] = useState('');
    const [charHairCol, setCharHairCol] = useState('');
    const [charHairSty, setCharHairSty] = useState('');
    const [charEyeCol, setCharEyeCol] = useState('');
    const [charClothing, setCharClothing] = useState('');
    const [charSocial, setCharSocial] = useState('');
    const [charPersonality, setCharPersonality] = useState('');
    const [charEmotion, setCharEmotion] = useState('');
    const [charRelation, setCharRelation] = useState('');
    const [charVoice, setCharVoice] = useState('');
    const [charSpeech, setCharSpeech] = useState('');

    const handleAddCharacterClick = () => {
        setEditingCharacter(null);
        setCharName('');
        setCharRole('Main Character');
        setCharRefImg(null);
        setCharAge('');
        setCharHeight('');
        setCharSkin('');
        setCharNationality('');
        setCharBody('');
        setCharFace('');
        setCharHairCol('');
        setCharHairSty('');
        setCharEyeCol('');
        setCharClothing('');
        setCharSocial('');
        setCharPersonality('');
        setCharEmotion('');
        setCharRelation('');
        setCharVoice('');
        setCharSpeech('');
        setShowCharacterForm(true);
    };

    const handleEditCharacterClick = (char: any) => {
        setEditingCharacter(char.id);
        setCharName(char.name || '');
        setCharRole(char.role || 'Main Character');
        setCharRefImg(char.refImg || null);
        setCharAge(char.age || '');
        setCharHeight(char.height || '');
        setCharSkin(char.skinTone || '');
        setCharNationality(char.nationalityVisualOrigin || '');
        setCharBody(char.bodyType || '');
        setCharFace(char.faceShape || '');
        setCharHairCol(char.hairColor || '');
        setCharHairSty(char.hairStyle || '');
        setCharEyeCol(char.eyeColor || '');
        setCharClothing(char.clothing || '');
        setCharSocial(char.socialStyle || '');
        setCharPersonality(char.personality || '');
        setCharEmotion(char.mainEmotion || '');
        setCharRelation(char.relationshipToOtherCharacters || '');
        setCharVoice(char.voiceType || '');
        setCharSpeech(char.speechStyle || '');
        setShowCharacterForm(true);
    };

    const handleDeleteCharacter = (id: string) => {
        setCharacters(prev => prev.filter(c => c.id !== id));
    };

    const handleSaveCharacter = () => {
        if (!charName.trim()) {
            alert("Por favor, preencha o campo do Nome do Personagem.");
            return;
        }

        const newChar = {
            id: editingCharacter || Date.now().toString(),
            name: charName,
            role: charRole,
            refImg: charRefImg,
            age: charAge,
            height: charHeight,
            skinTone: charSkin,
            nationalityVisualOrigin: charNationality,
            bodyType: charBody,
            faceShape: charFace,
            hairColor: charHairCol,
            hairStyle: charHairSty,
            eyeColor: charEyeCol,
            clothing: charClothing,
            socialStyle: charSocial,
            personality: charPersonality,
            mainEmotion: charEmotion,
            relationshipToOtherCharacters: charRelation,
            voiceType: charVoice,
            speechStyle: charSpeech
        };

        if (editingCharacter) {
            setCharacters(prev => prev.map(c => c.id === editingCharacter ? newChar : c));
        } else {
            setCharacters(prev => [...prev, newChar]);
        }

        setShowCharacterForm(false);
        setEditingCharacter(null);
    };

    const [voiceStyle, setVoiceStyle] = useState('UGC Female');
    const [directorMode, setDirectorMode] = useState<'simple_brief' | 'ugc_tiktok_shop_production'>('simple_brief');
    const [aiAnalysis, setAiAnalysis] = useState<any>(null);
    const [analyzingImage, setAnalyzingImage] = useState(false);
    const [productAnalysisTriggerSource, setProductAnalysisTriggerSource] = useState<'product_upload' | 'product_paste' | 'manual_analyze_click' | null>(null);
    const [analysisWarning, setAnalysisWarning] = useState<string | null>(null);
    const [debugMode, setDebugMode] = useState(false);
    const [debugData, setDebugData] = useState<any>(null);

    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [amberWarning, setAmberWarning] = useState<string | null>(null);
    const [workerInfo, setWorkerInfo] = useState<{ request_id?: string | null; mode?: string | null; ok?: boolean; partial?: boolean; warnings?: string[] } | null>(null);
    const [result, setResult] = useState<any>(null);
    const [finalPromptStructure, setFinalPromptStructure] = useState<CreativeDirectorFinalPromptStructureSnapshot | null>(null);
    const [scene2CompilerSnapshot, setScene2CompilerSnapshot] = useState<CreativeDirectorScene2CompilerSnapshot | null>(null);
    const [scene3CompilerSnapshot, setScene3CompilerSnapshot] = useState<CreativeDirectorScene3CompilerSnapshot | null>(null);
    const [shopeeSceneHubSnapshot, setShopeeSceneHubSnapshot] = useState<ShopeeSceneHubSnapshot | null>(null);
    const [activeTab, setActiveTab] = useState<'creator' | 'veo' | 'sora' | 'grok' | 'json' | 'scene_blocks'>('creator');
    const [modelStructureSource, setModelStructureSource] = useState<'veo' | 'sora' | 'grok'>('veo');

    // Main Tab Selection between Creative Director, Campaign Builder, Scene 2 Compiler, Scene 3 Compiler, and Shopee Scene Hub
    const [mainTab, setMainTab] = useState<'director' | 'campaign' | 'scene2_compiler' | 'scene3_compiler' | 'shopee_scenes'>('director');

    // Campaign Builder parameters
    const [cbProductImages, setCbProductImages] = useState<string[]>([]);
    const [cbProductName, setCbProductName] = useState('');
    const [cbProductCategory, setCbProductCategory] = useState('👗 Roupas Femininas & Lingerie');
    const [cbMainBenefit, setCbMainBenefit] = useState('');
    const [cbMainPainSolved, setCbMainPainSolved] = useState('');
    const [cbPriceRange, setCbPriceRange] = useState('');
    const [cbUniqueDifferentiator, setCbUniqueDifferentiator] = useState('');

    const [cbAvatarImage, setCbAvatarImage] = useState<string | null>(null);
    const [cbCreatorGender, setCbCreatorGender] = useState<'Female' | 'Male' | 'Neutral / Not specified'>('Neutral / Not specified');
    const [cbCreatorAgeStyle, setCbCreatorAgeStyle] = useState<'Young Adult' | 'Adult' | 'Mature Adult'>('Young Adult');
    const [cbCreatorPersona, setCbCreatorPersona] = useState('UGC Influencer Real');
    const [cbSpeakingEnergy, setCbSpeakingEnergy] = useState<number>(70);
    const [cbSpeakingPace, setCbSpeakingPace] = useState<'Slow' | 'Normal' | 'Fast' | 'TikTok Fast'>('Normal');

    const [cbScenarioImage, setCbScenarioImage] = useState<string | null>(null);
    const [cbScenarioDescription, setCbScenarioDescription] = useState('');
    const [cbBackgroundStrategy, setCbBackgroundStrategy] = useState('Automatic');

    const [cbRefVideo, setCbRefVideo] = useState<string | null>(null);
    const [cbSocialProofImages, setCbSocialProofImages] = useState<string[]>([]);

    const [cbPlatform, setCbPlatform] = useState('TikTok Shop');
    const [cbNumScenes, setCbNumScenes] = useState<number>(4);
    const [cbSecondsPerScene, setCbSecondsPerScene] = useState<'8s' | '10s' | '15s'>('8s');
    const [cbCampaignStyle, setCbCampaignStyle] = useState('UGC Influencer Real');
    const [cbRemodelingIntensity, setCbRemodelingIntensity] = useState<number>(70);
    const [cbProductLock, setCbProductLock] = useState<boolean>(true);

    // Precision Object Lock states
    const [objectLockEnabled, setObjectLockEnabled] = useState<boolean>(true);
    const [objectLockLevel, setObjectLockLevel] = useState<'basic' | 'advanced' | 'micro'>('micro');
    const [olBrand, setOlBrand] = useState<string>('');
    const [olProductName, setOlProductName] = useState<string>('');
    const [olPrimaryColor, setOlPrimaryColor] = useState<string>('');
    const [olSecondaryColor, setOlSecondaryColor] = useState<string>('');
    const [olMaterial, setOlMaterial] = useState<string>('');
    const [olShape, setOlShape] = useState<string>('');
    const [olLogoDescription, setOlLogoDescription] = useState<string>('');
    const [olUniqueFeatures, setOlUniqueFeatures] = useState<string>('');
    const [isObjectLockPanelExpanded, setIsObjectLockPanelExpanded] = useState<boolean>(true);

    // Object Lock Image and Analysis states (TASK 1 & TASK 3 & TASK 4)
    const [productImageFile, setProductImageFile] = useState<File | null>(null);
    const [productImagePreview, setProductImagePreview] = useState<string | null>(null);
    const [productImageBase64, setProductImageBase64] = useState<string | null>(null);
    const [productImageAnalysis, setProductImageAnalysis] = useState<CreativeDirectorProductImageAnalysis | null>(null);
    const [isAnalyzingObjectLockImage, setIsAnalyzingObjectLockImage] = useState<boolean>(false);
    const [objectLockWarning, setObjectLockWarning] = useState<string | null>(null);

    // Object Lock Manual Correction Fields (TASK 6)
    const [olVisualIdentity, setOlVisualIdentity] = useState<string>('');
    const [olFrontView, setOlFrontView] = useState<string>('');
    const [olSideView, setOlSideView] = useState<string>('');
    const [olBackView, setOlBackView] = useState<string>('');
    const [olTopView, setOlTopView] = useState<string>('');
    const [olColorsFinish, setOlColorsFinish] = useState<string>('');
    const [olMaterials, setOlMaterials] = useState<string>('');
    const [olLogosText, setOlLogosText] = useState<string>('');
    const [olPackaging, setOlPackaging] = useState<string>('');
    const [olDoNotChange, setOlDoNotChange] = useState<string>('');
    const [olAllowedMotion, setOlAllowedMotion] = useState<string>('');

    // Active object lock for output rendering (TASK 8)
    const [activeObjectLock, setActiveObjectLock] = useState<CreativeDirectorObjectLock | null>(null);

    const populateManualFieldsFromAnalysis = (analysis: CreativeDirectorProductImageAnalysis) => {
        if (!analysis) return;
        if (analysis.visual_identity) setOlVisualIdentity(analysis.visual_identity);
        if (analysis.front_view) setOlFrontView(analysis.front_view);
        if (analysis.side_view_inferred) setOlSideView(analysis.side_view_inferred);
        if (analysis.back_view_inferred) setOlBackView(analysis.back_view_inferred);
        if (analysis.top_view_inferred) setOlTopView(analysis.top_view_inferred);
        if (analysis.dominant_colors) {
            setOlColorsFinish(Array.isArray(analysis.dominant_colors) ? analysis.dominant_colors.join(', ') : String(analysis.dominant_colors));
        }
        if (analysis.materials_and_texture) {
            setOlMaterials(Array.isArray(analysis.materials_and_texture) ? analysis.materials_and_texture.join(', ') : String(analysis.materials_and_texture));
        }
        if (analysis.visible_logo_text) {
            setOlLogosText(Array.isArray(analysis.visible_logo_text) ? analysis.visible_logo_text.join(', ') : String(analysis.visible_logo_text));
        }
        if (analysis.packaging_details) setOlPackaging(analysis.packaging_details);
        if (analysis.do_not_change) {
            setOlDoNotChange(Array.isArray(analysis.do_not_change) ? analysis.do_not_change.join(', ') : String(analysis.do_not_change));
        }
        if (analysis.allowed_motion) {
            setOlAllowedMotion(Array.isArray(analysis.allowed_motion) ? analysis.allowed_motion.join(', ') : String(analysis.allowed_motion));
        }
    };

    const handleObjectLockImageFile = (file: File) => {
        if (!file) return;
        if (!['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(file.type)) {
            setObjectLockWarning("Formato não suportado. Use PNG, JPG, JPEG ou WEBP.");
            return;
        }
        setProductImageFile(file);
        const reader = new FileReader();
        reader.onload = () => {
            const res = reader.result as string;
            setProductImagePreview(res);
            setProductImageBase64(res);
            setObjectLockWarning(null);
            runObjectLockImageAnalysis(res);
        };
        reader.readAsDataURL(file);
    };

    const runObjectLockImageAnalysis = async (imgData: string) => {
        if (!imgData) return;
        setIsAnalyzingObjectLockImage(true);
        setObjectLockWarning(null);
        try {
            const analysis = await analyzeCreativeDirectorProductImage(
                { base64: imgData },
                productName,
                category,
                currentKey
            );
            setProductImageAnalysis(analysis);
            populateManualFieldsFromAnalysis(analysis);
        } catch (err: any) {
            console.warn("Análise de imagem para Trava de Objeto falhou:", err);
            setObjectLockWarning("Não foi possível analisar a imagem; usando trava baseada na descrição.");
        } finally {
            setIsAnalyzingObjectLockImage(false);
        }
    };

    const handleClearObjectLockImage = () => {
        setProductImageFile(null);
        setProductImagePreview(null);
        setProductImageBase64(null);
        setProductImageAnalysis(null);
        setObjectLockWarning(null);
    };

    const [cbResult, setCbResult] = useState<any>(null);
    const [cbLoading, setCbLoading] = useState<boolean>(false);
    const [cbErrorMsg, setCbErrorMsg] = useState<string | null>(null);
    const [cbActiveOutputTab, setCbActiveOutputTab] = useState<'overview' | 'scenes' | 'flow' | 'sora' | 'grok' | 'json'>('overview');

    // Upgraded Creative Director states
    const [activeUploadSlot, setActiveUploadSlot] = useState<string>('product');
    const [detectedProductData, setDetectedProductData] = useState<any>(null);
    const [isProductPanelOpen, setIsProductPanelOpen] = useState<boolean>(true);
    const [mismatchWarning, setMismatchWarning] = useState<string | null>(null);
    const [mismatchBypassed, setMismatchBypassed] = useState<boolean>(false);
    const lastAnalyzedImgRef = useRef<string | null>(null);

    // Worker proxy and diagnostics states
    const [workerUrl, setWorkerUrl] = useState(() => localStorage.getItem('cb_worker_url') || WORKER_URL || '');
    const [clientToken, setClientToken] = useState(() => localStorage.getItem('cb_client_token') || WORKER_TOKEN || '');
    const [localProxyStatus, setLocalProxyStatus] = useState<string>('Checking');
    const [healthCheckDetails, setHealthCheckDetails] = useState<{
        urlCalled?: string;
        routeCalled?: string;
        httpStatus?: number | string;
        headersPermitted?: string;
        payloadSent?: string;
        rawResponse?: string;
        detailedError?: string;
        timestamp?: string;
    } | null>(null);
    const [isDebugMode, setIsDebugMode] = useState<boolean>(true);
    const [generationDiagnostics, setGenerationDiagnostics] = useState<{
        endpoint: string;
        route: string;
        status: string;
        possibleCause: string;
        recommendedAction: string;
        payload?: any;
        httpCode?: string | number;
        errorText?: string;
    } | null>(null);
    const [isProxyPanelExpanded, setIsProxyPanelExpanded] = useState<boolean>(false);

    // Persist proxy settings on change
    useEffect(() => {
        localStorage.setItem('cb_worker_url', workerUrl);
    }, [workerUrl]);

    useEffect(() => {
        localStorage.setItem('cb_client_token', clientToken);
    }, [clientToken]);

    const runHealthCheck = async () => {
        setLocalProxyStatus('Checking');
        setHealthCheckDetails(null);
        
        const result = await checkWorkerHealth(workerUrl, clientToken);
        setLocalProxyStatus(result.status);
        setHealthCheckDetails({
            urlCalled: workerUrl.trim(),
            routeCalled: '/health',
            httpStatus: result.httpStatus || 'Falha de Conectividade',
            rawResponse: result.rawResponse ? result.rawResponse.slice(0, 1000) : '',
            detailedError: result.detailedError,
            timestamp: result.timestamp
        });
    };

    // Run health check on mount
    useEffect(() => {
        runHealthCheck();
    }, []);

    // Session Restore and Persistence States
    const isRestoringRef = useRef<boolean>(false);
    const [pendingRestoreSession, setPendingRestoreSession] = useState<CreativeDirectorSavedSession | null>(null);
    const [lastSavedTimestamp, setLastSavedTimestamp] = useState<number | null>(null);
    const [isSaving, setIsSaving] = useState<boolean>(false);

    // Helper to build a comprehensive Final Prompt Structure Snapshot
    const buildFinalPromptStructureSnapshot = (
        res: any,
        cbRes: any,
        currentTab?: string,
        structSource?: string,
        lockObj?: any,
        existing?: CreativeDirectorFinalPromptStructureSnapshot | null
    ): CreativeDirectorFinalPromptStructureSnapshot | undefined => {
        if (!res && !cbRes && !existing) {
            return undefined;
        }

        const sceneBlocks: Array<{
            sceneId: string;
            sceneTitle?: string;
            compiledPrompt?: string;
            technicalSpecs?: string;
            spokenText?: string;
            onScreenText?: string;
            negativePrompt?: string;
        }> = [];

        if (res) {
            const blocks = (structSource === 'sora' && Array.isArray(res.sora_structure) && res.sora_structure.length > 0)
                ? res.sora_structure
                : (structSource === 'grok' && Array.isArray(res.grok_structure) && res.grok_structure.length > 0)
                ? res.grok_structure
                : (Array.isArray(res.veo_structure) && res.veo_structure.length > 0)
                ? res.veo_structure
                : (Array.isArray(res.scene_scripts) && res.scene_scripts.length > 0)
                ? res.scene_scripts
                : [];

            blocks.forEach((block: any, idx: number) => {
                sceneBlocks.push({
                    sceneId: String(block.scene_id || block.block_id || idx + 1),
                    sceneTitle: block.scene_name || block.objective || `Cena ${idx + 1}`,
                    compiledPrompt: block.visual_prompt_en || block.visual_context_en || block.visual_prompt || block.scene_description || '',
                    technicalSpecs: block.voice_description_en || block.action || '',
                    spokenText: block.script_pt_br || block.dialogue_pt_br || block.dialogue_pt || block.text || '',
                    onScreenText: block.on_screen_text || block.overlay_text || '',
                    negativePrompt: block.negative_prompt || ''
                });
            });
        } else if (cbRes && Array.isArray(cbRes.scenes)) {
            cbRes.scenes.forEach((s: any, idx: number) => {
                sceneBlocks.push({
                    sceneId: String(s.scene_number || s.id || idx + 1),
                    sceneTitle: s.name || s.title || `Cena ${idx + 1}`,
                    compiledPrompt: s.visual_prompt_en || s.visual || s.description || '',
                    technicalSpecs: s.audio_direction || s.camera || '',
                    spokenText: s.script || s.dialogue || '',
                    onScreenText: s.on_screen_text || '',
                    negativePrompt: s.negative_prompt || ''
                });
            });
        }

        const promptSections: Array<{
            id: string;
            title?: string;
            content?: string;
            order?: number;
        }> = [];

        if (res?.production_strategy) {
            promptSections.push({
                id: 'production_strategy',
                title: 'Estratégia de Produção',
                content: typeof res.production_strategy === 'object' ? JSON.stringify(res.production_strategy, null, 2) : String(res.production_strategy),
                order: 1
            });
        }
        if (res?.platform_adaptation_report) {
            promptSections.push({
                id: 'platform_adaptation_report',
                title: 'Relatório de Adaptação',
                content: typeof res.platform_adaptation_report === 'object' ? JSON.stringify(res.platform_adaptation_report, null, 2) : String(res.platform_adaptation_report),
                order: 2
            });
        }
        if (res?.final_validation) {
            promptSections.push({
                id: 'final_validation',
                title: 'Validação Final',
                content: typeof res.final_validation === 'object' ? JSON.stringify(res.final_validation, null, 2) : String(res.final_validation),
                order: 3
            });
        }

        const compiledText = res?.creator_prompt || cbRes?.compiled_text || cbRes?.creator_prompt || (sceneBlocks.length > 0 ? sceneBlocks.map(s => `[${s.sceneTitle}]\n${s.compiledPrompt}\n${s.spokenText}`).join('\n\n') : existing?.compiledText || '');

        const lockStr = lockObj?.object_lock_prompt_en || (typeof lockObj === 'object' ? JSON.stringify(lockObj) : lockObj) || existing?.activeObjectLock;

        return {
            compiledText: compiledText || existing?.compiledText,
            negativePrompt: res?.negative_prompt || cbRes?.negative_prompt || existing?.negativePrompt,
            promptSections: promptSections.length > 0 ? promptSections : existing?.promptSections,
            sceneBlocks: sceneBlocks.length > 0 ? sceneBlocks : existing?.sceneBlocks,
            slotsJson: res || cbRes || existing?.slotsJson,
            modelStructureSource: structSource || existing?.modelStructureSource,
            activeOutputTab: currentTab || existing?.activeOutputTab,
            activeObjectLock: lockStr,
            campaignBuilderOutput: cbRes || existing?.campaignBuilderOutput,
            generatedAt: existing?.generatedAt || Date.now(),
            updatedAt: Date.now()
        };
    };

    // Create the state object for Autosave & Recovery
    const currentState: CreativeDirectorSavedSession = {
        schemaVersion: 1,
        savedAt: Date.now(),
        productName,
        category,
        platform,
        objective,
        visualStyle,
        ctaStyle,
        duration,
        format,
        extraInstructions,
        productImage,
        scenarioImage,
        avatarImage,
        refVideo,
        refImage,
        result,
        activeTab,
        modelStructureSource,
        voiceStyle,
        aiAnalysis,
        creativeMode,
        directorMode,
        characters,
        
        hookStyle,
        emotionalTrigger,
        audienceType,
        presenterStyle,
        cameraStyle,
        energyLevel,
        optimizationLevel,
        productCategory,
        viralFramework,

        mainTab,
        cbProductImages,
        cbProductName,
        cbProductCategory,
        cbMainBenefit,
        cbMainPainSolved,
        cbPriceRange,
        cbUniqueDifferentiator,
        cbAvatarImage,
        cbCreatorGender,
        cbCreatorAgeStyle,
        cbCreatorPersona,
        cbSpeakingEnergy,
        cbSpeakingPace,
        cbScenarioImage,
        cbScenarioDescription,
        cbBackgroundStrategy,
        cbRefVideo,
        cbSocialProofImages,
        cbPlatform,
        cbNumScenes,
        cbSecondsPerScene,
        cbCampaignStyle,
        cbRemodelingIntensity,
        cbProductLock,
        cbResult,
        cbActiveOutputTab,
        objectLockEnabled,
        objectLockLevel,
        olBrand,
        olProductName,
        olPrimaryColor,
        olSecondaryColor,
        olMaterial,
        olShape,
        olLogoDescription,
        olUniqueFeatures,

        // Object Lock manual correction fields and active output state
        olVisualIdentity,
        olFrontView,
        olSideView,
        olBackView,
        olTopView,
        olColorsFinish,
        olMaterials,
        olLogosText,
        olPackaging,
        olDoNotChange,
        olAllowedMotion,
        activeObjectLock,
        detectedProductData,
        amberWarning,
        workerInfo,
        debugData,

        // Phase 2.4.3D: Consolidated Workspace Persistence
        productWorkspace,
        scene3CtaHandoff,

        // Scene 2 Compiler Output Snapshot
        scene2CompilerSnapshot: hasValidScene2CompiledOutput(scene2CompilerSnapshot) ? scene2CompilerSnapshot : undefined,

        // Scene 3 Compiler Output Snapshot (Conditional Output Restore)
        scene3CompilerSnapshot: hasValidScene3CompiledOutput(scene3CompilerSnapshot) ? scene3CompilerSnapshot : undefined,

        // Shopee Scene Hub Output Snapshot
        shopeeSceneHubSnapshot: shopeeSceneHubSnapshot || undefined,

        // Final Prompt Structure Snapshot
        finalPromptStructure: (finalPromptStructure && hasValidFinalPromptOutput(finalPromptStructure))
            ? finalPromptStructure
            : (hasValidFinalPromptOutput(buildFinalPromptStructureSnapshot(result, cbResult, activeTab, modelStructureSource, activeObjectLock, finalPromptStructure))
                ? buildFinalPromptStructureSnapshot(result, cbResult, activeTab, modelStructureSource, activeObjectLock, finalPromptStructure)
                : undefined)
    };

    const handleRestore = (saved: any) => {
        if (!saved) return;
        isRestoringRef.current = true;
        try {
            if (saved.objectLockEnabled !== undefined) setObjectLockEnabled(saved.objectLockEnabled);
            if (saved.objectLockLevel !== undefined) setObjectLockLevel(saved.objectLockLevel);
            if (saved.olBrand !== undefined) setOlBrand(saved.olBrand);
            if (saved.olProductName !== undefined) setOlProductName(saved.olProductName);
            if (saved.olPrimaryColor !== undefined) setOlPrimaryColor(saved.olPrimaryColor);
            if (saved.olSecondaryColor !== undefined) setOlSecondaryColor(saved.olSecondaryColor);
            if (saved.olMaterial !== undefined) setOlMaterial(saved.olMaterial);
            if (saved.olShape !== undefined) setOlShape(saved.olShape);
            if (saved.olLogoDescription !== undefined) setOlLogoDescription(saved.olLogoDescription);
            if (saved.olUniqueFeatures !== undefined) setOlUniqueFeatures(saved.olUniqueFeatures);

            // Object Lock manual correction fields
            if (saved.olVisualIdentity !== undefined) setOlVisualIdentity(saved.olVisualIdentity);
            if (saved.olFrontView !== undefined) setOlFrontView(saved.olFrontView);
            if (saved.olSideView !== undefined) setOlSideView(saved.olSideView);
            if (saved.olBackView !== undefined) setOlBackView(saved.olBackView);
            if (saved.olTopView !== undefined) setOlTopView(saved.olTopView);
            if (saved.olColorsFinish !== undefined) setOlColorsFinish(saved.olColorsFinish);
            if (saved.olMaterials !== undefined) setOlMaterials(saved.olMaterials);
            if (saved.olLogosText !== undefined) setOlLogosText(saved.olLogosText);
            if (saved.olPackaging !== undefined) setOlPackaging(saved.olPackaging);
            if (saved.olDoNotChange !== undefined) setOlDoNotChange(saved.olDoNotChange);
            if (saved.olAllowedMotion !== undefined) setOlAllowedMotion(saved.olAllowedMotion);

            if (saved.productName !== undefined) setProductName(saved.productName);
            if (saved.category !== undefined) setCategory(saved.category);
            if (saved.platform !== undefined) setPlatform(saved.platform);
            if (saved.objective !== undefined) setObjective(saved.objective);
            if (saved.visualStyle !== undefined) setVisualStyle(saved.visualStyle);
            if (saved.ctaStyle !== undefined) setCtaStyle(saved.ctaStyle);
            if (saved.duration !== undefined) setDuration(saved.duration);
            if (saved.format !== undefined) setFormat(saved.format);
            if (saved.extraInstructions !== undefined) setExtraInstructions(saved.extraInstructions);
            if (saved.productImage !== undefined) setProductImage(saved.productImage);
            if (saved.scenarioImage !== undefined) setScenarioImage(saved.scenarioImage);
            if (saved.avatarImage !== undefined) setAvatarImage(saved.avatarImage);
            if (saved.refVideo !== undefined) setRefVideo(saved.refVideo);
            if (saved.refImage !== undefined) setRefImage(saved.refImage);

            // Restore Final Compiled Prompt Output & Panels & Final Prompt Structure
            if (saved.result !== undefined) setResult(saved.result);
            if (saved.finalPromptStructure !== undefined && saved.finalPromptStructure !== null) {
                setFinalPromptStructure(saved.finalPromptStructure);
                if (!saved.result && saved.finalPromptStructure.slotsJson) {
                    setResult(saved.finalPromptStructure.slotsJson);
                }
            }
            if (saved.activeTab !== undefined) setActiveTab(saved.activeTab);
            if (saved.modelStructureSource !== undefined) setModelStructureSource(saved.modelStructureSource);
            if (saved.activeObjectLock !== undefined) setActiveObjectLock(saved.activeObjectLock);
            if (saved.detectedProductData !== undefined) setDetectedProductData(saved.detectedProductData);
            if (saved.amberWarning !== undefined) setAmberWarning(saved.amberWarning);
            if (saved.workerInfo !== undefined) setWorkerInfo(saved.workerInfo);
            if (saved.debugData !== undefined) setDebugData(saved.debugData);

            if (saved.voiceStyle !== undefined) setVoiceStyle(saved.voiceStyle);
            if (saved.aiAnalysis !== undefined) setAiAnalysis(saved.aiAnalysis);
            if (saved.creativeMode !== undefined) setCreativeMode(saved.creativeMode);
            if (saved.directorMode !== undefined) setDirectorMode(saved.directorMode);
            if (saved.characters !== undefined) setCharacters(saved.characters);

            if (saved.hookStyle !== undefined) setHookStyle(saved.hookStyle);
            if (saved.emotionalTrigger !== undefined) setEmotionalTrigger(saved.emotionalTrigger);
            if (saved.audienceType !== undefined) setAudienceType(saved.audienceType);
            if (saved.presenterStyle !== undefined) setPresenterStyle(saved.presenterStyle);
            if (saved.cameraStyle !== undefined) setCameraStyle(saved.cameraStyle);
            if (saved.energyLevel !== undefined) setEnergyLevel(saved.energyLevel);
            if (saved.optimizationLevel !== undefined) setOptimizationLevel(saved.optimizationLevel);
            if (saved.productCategory !== undefined) setProductCategory(saved.productCategory);
            if (saved.viralFramework !== undefined) setViralFramework(saved.viralFramework);

            if (saved.mainTab !== undefined) setMainTab(saved.mainTab);
            if (saved.cbProductImages !== undefined) setCbProductImages(saved.cbProductImages);
            if (saved.cbProductName !== undefined) setCbProductName(saved.cbProductName);
            if (saved.cbProductCategory !== undefined) setCbProductCategory(saved.cbProductCategory);
            if (saved.cbMainBenefit !== undefined) setCbMainBenefit(saved.cbMainBenefit);
            if (saved.cbMainPainSolved !== undefined) setCbMainPainSolved(saved.cbMainPainSolved);
            if (saved.cbPriceRange !== undefined) setCbPriceRange(saved.cbPriceRange);
            if (saved.cbUniqueDifferentiator !== undefined) setCbUniqueDifferentiator(saved.cbUniqueDifferentiator);
            if (saved.cbAvatarImage !== undefined) setCbAvatarImage(saved.cbAvatarImage);
            if (saved.cbCreatorGender !== undefined) setCbCreatorGender(saved.cbCreatorGender);
            if (saved.cbCreatorAgeStyle !== undefined) setCbCreatorAgeStyle(saved.cbCreatorAgeStyle);
            if (saved.cbCreatorPersona !== undefined) setCbCreatorPersona(saved.cbCreatorPersona);
            if (saved.cbSpeakingEnergy !== undefined) setCbSpeakingEnergy(saved.cbSpeakingEnergy);
            if (saved.cbSpeakingPace !== undefined) setCbSpeakingPace(saved.cbSpeakingPace);
            if (saved.cbScenarioImage !== undefined) setCbScenarioImage(saved.cbScenarioImage);
            if (saved.cbScenarioDescription !== undefined) setCbScenarioDescription(saved.cbScenarioDescription);
            if (saved.cbBackgroundStrategy !== undefined) setCbBackgroundStrategy(saved.cbBackgroundStrategy);
            if (saved.cbRefVideo !== undefined) setCbRefVideo(saved.cbRefVideo);
            if (saved.cbSocialProofImages !== undefined) setCbSocialProofImages(saved.cbSocialProofImages);
            if (saved.cbPlatform !== undefined) setCbPlatform(saved.cbPlatform);
            if (saved.cbNumScenes !== undefined) setCbNumScenes(saved.cbNumScenes);
            if (saved.cbSecondsPerScene !== undefined) setCbSecondsPerScene(saved.cbSecondsPerScene);
            if (saved.cbCampaignStyle !== undefined) setCbCampaignStyle(saved.cbCampaignStyle);
            if (saved.cbRemodelingIntensity !== undefined) setCbRemodelingIntensity(saved.cbRemodelingIntensity);
            if (saved.cbProductLock !== undefined) setCbProductLock(saved.cbProductLock);
            if (saved.cbResult !== undefined) setCbResult(saved.cbResult);
            if (saved.cbActiveOutputTab !== undefined) setCbActiveOutputTab(saved.cbActiveOutputTab);

            // Phase 2.4.3D: Restore Shared Product Workspace & CTA Handoff
            if (saved.productWorkspace !== undefined && saved.productWorkspace !== null) {
                setProductWorkspace(saved.productWorkspace);
            }
            if (saved.scene3CtaHandoff !== undefined) {
                setScene3CtaHandoff(saved.scene3CtaHandoff);
            }

            // Restore Scene 2 Compiler Output Snapshot (Conditional - only if valid compiled output exists)
            if (saved.scene2CompilerSnapshot !== undefined && saved.scene2CompilerSnapshot !== null && hasValidScene2CompiledOutput(saved.scene2CompilerSnapshot)) {
                setScene2CompilerSnapshot(saved.scene2CompilerSnapshot);
            }

            // Restore Scene 3 Compiler Output Snapshot (Conditional - only if valid compiled output exists)
            if (saved.scene3CompilerSnapshot !== undefined && saved.scene3CompilerSnapshot !== null && hasValidScene3CompiledOutput(saved.scene3CompilerSnapshot)) {
                setScene3CompilerSnapshot(saved.scene3CompilerSnapshot);
            }

            // Restore Shopee Scene Hub Output Snapshot
            if (saved.shopeeSceneHubSnapshot !== undefined && saved.shopeeSceneHubSnapshot !== null) {
                setShopeeSceneHubSnapshot(saved.shopeeSceneHubSnapshot);
            }
        } finally {
            setTimeout(() => {
                isRestoringRef.current = false;
            }, 200);
        }
    };

    // Helper to persist current session to local storage
    const persistCurrentSession = useCallback((stateToPersist: CreativeDirectorSavedSession) => {
        if (!shouldOfferCreativeDirectorRestore(stateToPersist)) {
            return;
        }
        setIsSaving(true);
        const success = saveCreativeDirectorSession(stateToPersist);
        setIsSaving(false);
        if (success) {
            setLastSavedTimestamp(Date.now());
        }
    }, []);

    // Reference to hold latest state to prevent stale closures during lifecycle events
    const latestStateRef = useRef<CreativeDirectorSavedSession>(currentState);

    useEffect(() => {
        latestStateRef.current = currentState;
    });

    // Check for saved session on initial mount
    useEffect(() => {
        try {
            const saved = loadCreativeDirectorSession();
            if (saved && shouldOfferCreativeDirectorRestore(saved)) {
                setPendingRestoreSession(saved);
            }
        } catch (err) {
            console.warn('[CreativeDirectorView] Error loading initial saved session:', err);
        }
    }, []);

    // Debounced auto-save on state change
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            const s = latestStateRef.current;
            if (shouldOfferCreativeDirectorRestore(s)) {
                persistCurrentSession(s);
            }
        }, 1200);

        return () => clearTimeout(timeoutId);
    }, [
        productName,
        category,
        platform,
        objective,
        visualStyle,
        ctaStyle,
        duration,
        format,
        extraInstructions,
        productImage,
        scenarioImage,
        avatarImage,
        refVideo,
        refImage,
        result,
        activeTab,
        modelStructureSource,
        voiceStyle,
        aiAnalysis,
        creativeMode,
        directorMode,
        characters,
        hookStyle,
        emotionalTrigger,
        audienceType,
        presenterStyle,
        cameraStyle,
        energyLevel,
        optimizationLevel,
        productCategory,
        viralFramework,
        mainTab,
        cbProductImages,
        cbProductName,
        cbProductCategory,
        cbMainBenefit,
        cbMainPainSolved,
        cbPriceRange,
        cbUniqueDifferentiator,
        cbAvatarImage,
        cbCreatorGender,
        cbCreatorAgeStyle,
        cbCreatorPersona,
        cbSpeakingEnergy,
        cbSpeakingPace,
        cbScenarioImage,
        cbScenarioDescription,
        cbBackgroundStrategy,
        cbRefVideo,
        cbSocialProofImages,
        cbPlatform,
        cbNumScenes,
        cbSecondsPerScene,
        cbCampaignStyle,
        cbRemodelingIntensity,
        cbProductLock,
        cbResult,
        cbActiveOutputTab,
        objectLockEnabled,
        objectLockLevel,
        olBrand,
        olProductName,
        olPrimaryColor,
        olSecondaryColor,
        olMaterial,
        olShape,
        olLogoDescription,
        olUniqueFeatures,
        olVisualIdentity,
        olFrontView,
        olSideView,
        olBackView,
        olTopView,
        olColorsFinish,
        olMaterials,
        olLogosText,
        olPackaging,
        olDoNotChange,
        olAllowedMotion,
        activeObjectLock,
        detectedProductData,
        amberWarning,
        workerInfo,
        debugData,
        productWorkspace,
        scene3CtaHandoff,
        scene2CompilerSnapshot,
        finalPromptStructure,
        persistCurrentSession
    ]);

    // Browser and tab lifecycle persistence safeguards (beforeunload, pagehide, visibilitychange, unmount)
    useEffect(() => {
        const executeLifecycleSave = () => {
            const s = latestStateRef.current;
            if (shouldOfferCreativeDirectorRestore(s)) {
                saveCreativeDirectorSession(s);
            }
        };

        const handleBeforeUnload = () => {
            executeLifecycleSave();
        };

        const handlePageHide = () => {
            executeLifecycleSave();
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                executeLifecycleSave();
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        window.addEventListener('pagehide', handlePageHide);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            executeLifecycleSave();
            window.removeEventListener('beforeunload', handleBeforeUnload);
            window.removeEventListener('pagehide', handlePageHide);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    const isEmptyOrInitial = (state: any) => {
        const dEmpty = !state.productName || (!state.productName.trim() && !state.extraInstructions.trim() && !state.result);
        const cEmpty = !state.cbProductName || (!state.cbProductName.trim() && !state.cbResult);
        const pwEmpty = !state.productWorkspace?.productImagePreview && !state.productWorkspace?.productIdentity;
        const s2Empty = !state.scene2CompilerSnapshot?.compiledPrompt && !state.scene2CompilerSnapshot?.pipelineResult;
        return dEmpty && cEmpty && pwEmpty && s2Empty;
    };

    const runVisualAnalysis = async (imgDataBase64: any) => {
        setAnalyzingImage(true);
        setHideRecommendation(false);
        setAnalysisWarning(null);
        setMismatchWarning(null);
        setMismatchBypassed(false);

        try {
            if (!imgDataBase64 || typeof imgDataBase64 !== 'string') {
                throw new Error("A imagem fornecida está vazia ou não é uma string válida.");
            }
            const commaIndex = imgDataBase64.indexOf(',');
            if (commaIndex === -1) {
                throw new Error("Formato de imagem inválido (faltando delimitador base64).");
            }
            const mimeType = imgDataBase64.substring(imgDataBase64.indexOf(':') + 1, imgDataBase64.indexOf(';'));
            const base64Data = imgDataBase64.substring(commaIndex + 1);

            const visionPrompt = `
You are a Senior Product UX Architect and Visual Analyst.
Analyze this product image and extract key attributes to autofill a short-form video script director form.
Output ONLY a strict JSON object with zero additional text, markdown block wraps or comments.

Select the category strictly from this list of options:
- "👗 Roupas Femininas & Lingerie"
- "💄 Beleza & Cuidados Pessoais"
- "📱 Celulares & Eletrônicos"
- "💪 Saúde & Bem-Estar"
- "⌚ Relógios & Joias"
- "🏠 Casa & Cozinha"

Select the productCategory strictly from these options (or "Other" if none fit):
- "Beauty"
- "Fashion"
- "Watches"
- "Electronics"
- "Home"
- "Kitchen"
- "Fitness"
- "Health"
- "Children"
- "Automotive"
- "Courses"
- "Software"
- "Accessories"
- "Jewelry"
- "Shoes"
- "Bags"
- "Pet"
- "Tools"
- "Other"

Select the voiceStyle strictly from this list of options:
- "Inspirador"
- "Autoridade"
- "Conversacional"
- "Emocional"
- "Urgência"
- "Premium"
- "Educacional"
- "Storytelling"
- "Espiritual"
- "Motivacional"
- "Review UGC"
- "Vendedor TikTok"

Select the ctaStyle strictly from this list of options:
- "AJUDA_INDIRETA"
- "DIRETO"
- "BUG"

The JSON object must contain the following fields:
{
  "productName": "Detected short commercial name of the product",
  "category": "One of the strict category options listed above",
  "productDescription": "A professional short description outlining what the product is, its features and use case",
  "mainBenefit": "Main commercial benefit or outcome of using the product (e.g. Remove frizz in 15 seconds)",
  "mainPainSolved": "Main pain point or challenge solved by this product (e.g. Frizzy, unmanageable hair on humid days)",
  "uniqueDifferentiator": "Unique Selling Proposition or competitive advantage (e.g. Ionic heating tech that is 100% hair-safe)",
  "materialTexture": "Detailed material description (e.g. Matte plastic body, ceramic pins)",
  "dominantColors": "Primary and secondary colors visible (e.g. Midnight Black and Rose Gold)",
  "visibleTextLogo": "Any visible brand logo, trademark or typography on the product body",
  "productType": "Type of product (e.g. Skincare tool, smart accessory, apparel)",
  "suggestedPlatform": "Recommended primary platform (e.g. TikTok Shop, Instagram Reels, Shopee Vídeo)",
  "suggestedCtaStyle": "Suggested CTA approach (e.g. DIRETO, AJUDA_INDIRETA)",

  "object_lock": {
    "brand": "Identified brand of the product (or empty string)",
    "product_name": "Identified exact commercial name of the product (or empty string)",
    "primary_color": "Dominant/primary color (or empty string)",
    "secondary_color": "Sub-color or accent color (or empty string)",
    "material": "Estimated build materials like ceramic, matte plastic, leather (or empty string)",
    "shape": "Geometric form and shape features (or empty string)",
    "logo": "Brand logo description or typography styling description (or empty string)",
    "features": ["String list of key visual features/elements like buttons, engravings, dial components"]
  },

  "product_dna": {
    "product_identity": "Specific exact commercial identity of this product model",
    "product_shape": "Geometric form and shape features",
    "product_color": "Exact color palette",
    "product_material": "Estimated build materials",
    "product_texture": "Tactile surface texture details",
    "visible_logo": "Identified brand names/logos",
    "visible_text": "Strict transcript of any letters/words on the item",
    "key_visual_features": "Critical highlight details (e.g. indicator lights, curves, buttons)",
    "product_quantity": "Number of items visible inside the set",
    "product_accessories": "Accompanying cables, brushes, or boxes"
  },
  
  "product_lock_prompt_en": "Keep the uploaded product exactly identical to the reference image. The item is a specific product with design features, shape, colored in exact colors. Crafted from material with smooth/textured surface. Keep all branding, visible text and labels completely untouched. Key highlights include specific shapes. Physical quantity is 1 with its original accessories. Do NOT alter, mutate, recolor, or change its visual identity, style, labels, or elements in any generated prompt scene.",

  "objective": "Creative goal/objective for video ads (e.g. Conversão de Vendas, Desejo e Status, Demonstração Impactante)",
  "visualStyle": "Suggested aesthetic style (e.g. Estética UGC Realista, Cinematic Premium, Clean Minimalista, Dark Mode Tech)",
  "ctaStyle": "One of: DIRETO, AJUDA_INDIRETA, BUG",
  "voiceStyle": "One of: Conversacional, Autoridade, Inspirador, Emocional, Urgência, Premium, Educacional, Storytelling, Review UGC, Vendedor TikTok",
  "productNameConfidence": 95,
  "categoryConfidence": 90,
  "voiceStyleConfidence": 92,
  "detectedName": "Detected Name for insights card",
  "detectedCategory": "Detected Category for insights card",
  "targetAudience": "Suggested target audience (e.g. Mulheres de 25-45 anos)",
  "communicationTone": "Communication tone style description",
  "recommendedVoiceStyle": "Recommended voice delivery tone explained",
  "recommendedStructure": "Recommended block flow sequence"
}
`;

            const payload = {
                contents: [{
                    parts: [
                        { text: visionPrompt },
                        { inlineData: { mimeType, data: base64Data } }
                    ]
                }]
            };

            const response = await processGeminiAPI(currentKey, payload);
            
            if (response && response.raw && response.raw.skipped) {
                console.log("Analysis skipped:", response.raw.reason);
                setAnalyzingImage(false);
                return;
            }

            if (response && !response.ok) {
                const cause = response.errorMessage || response.message || "Erro de resposta";
                setAnalysisWarning(`⚠️ A análise automática do produto falhou: ${cause}. Você ainda pode continuar usando os dados manuais.`);
                setAnalyzingImage(false);
                return;
            }

            let rawText = response?.raw_text;
            if (!rawText) {
                throw new Error("Não foi possível obter resposta do servidor de análise visual.");
            }

            const parsed = response.data || safeJSONParse(rawText);
            if (!parsed) {
                throw new Error("A resposta não pôde ser analisada como JSON válido.");
            }

            const detectedStrCat = detectStrategicProductCategoryFromAnalysis(
                (parsed.productDescription || "") + " " + (parsed.productName || "") + " " + (parsed.category || "") + " " + rawText
            );
            parsed.detectedStrategicCategory = detectedStrCat;

            // Populate the state fields automatically ONLY IF NOT MANUALLY EDITED BY USER
            if (mainTab === 'director') {
                if (!hasUserEditedProductName && parsed.productName) {
                    setProductName(parsed.productName);
                }
                if (!hasUserEditedProductCategory) {
                    setProductCategory(detectedStrCat);
                }
                if (!hasUserEditedCategory && parsed.category) {
                    setCategory(parsed.category);
                }
                if (!objective && parsed.objective) setObjective(parsed.objective);
                if (!visualStyle && parsed.visualStyle) setVisualStyle(parsed.visualStyle);
                if (!ctaStyle && parsed.ctaStyle) setCtaStyle(parsed.ctaStyle);
                if (!voiceStyle && parsed.voiceStyle) setVoiceStyle(parsed.voiceStyle);
            } else {
                if (!hasUserEditedCbProductName && parsed.productName) {
                    setCbProductName(parsed.productName);
                }
                if (!hasUserEditedCbProductCategory) {
                    setCbProductCategory(detectedStrCat);
                }
                if (!cbMainBenefit.trim() && parsed.mainBenefit) setCbMainBenefit(parsed.mainBenefit);
                if (!cbMainPainSolved.trim() && parsed.mainPainSolved) setCbMainPainSolved(parsed.mainPainSolved);
                if (!cbUniqueDifferentiator.trim() && parsed.uniqueDifferentiator) setCbUniqueDifferentiator(parsed.uniqueDifferentiator);
            }

            // Populate Precision Object Lock automatically as requested
            const finalLock = parsed.object_lock || {
                brand: parsed.product_dna?.visible_logo || parsed.visibleTextLogo || '',
                product_name: parsed.productName || '',
                primary_color: parsed.product_dna?.product_color || parsed.dominantColors || '',
                secondary_color: parsed.dominantColors ? (parsed.dominantColors.split('and')[1] || '').trim() : '',
                material: parsed.product_dna?.product_material || parsed.materialTexture || '',
                shape: parsed.product_dna?.product_shape || '',
                logo: parsed.product_dna?.visible_logo || parsed.visibleTextLogo || '',
                features: Array.isArray(parsed.product_dna?.key_visual_features) 
                    ? parsed.product_dna.key_visual_features 
                    : [parsed.product_dna?.key_visual_features].filter(Boolean)
            };

            if (finalLock) {
                if (finalLock.brand) setOlBrand(finalLock.brand);
                if (finalLock.product_name) setOlProductName(finalLock.product_name);
                if (finalLock.primary_color) setOlPrimaryColor(finalLock.primary_color);
                if (finalLock.secondary_color) setOlSecondaryColor(finalLock.secondary_color);
                if (finalLock.material) setOlMaterial(finalLock.material);
                if (finalLock.shape) setOlShape(finalLock.shape);
                if (finalLock.logo) setOlLogoDescription(finalLock.logo);
                if (finalLock.features) {
                    const featStr = Array.isArray(finalLock.features) ? finalLock.features.join(', ') : finalLock.features;
                    setOlUniqueFeatures(featStr);
                }
            }

            setDetectedProductData(parsed);
            setAiAnalysis(parsed);
        } catch (err: any) {
            console.error("Visual Analysis Error:", err);
            const cause = err.message || "Erro desconhecido";
            setAnalysisWarning(`⚠️ A análise automática do produto falhou: ${cause}. Você ainda pode continuar usando os dados manuais.`);
        } finally {
            setAnalyzingImage(false);
        }
    };

    const handleImportViralBriefing = (payload: ViralIdeaPayload) => {
        const briefingBlock = `[BRIEFING IMPORTADO DO IDEADOR VIRAL]
Título: ${payload.title || ''}
Nicho: ${payload.niche || ''}
Ângulo: ${payload.angle || ''}
Gancho: ${payload.hook || ''}
Visual 3s: ${payload.sceneConcept || ''}
Uso do Produto: ${payload.productUse || ''}
CTA: ${payload.cta || ''}
Prompt Visual EN: ${payload.suggestedVisualPromptEn || ''}
Diálogo Base PT-BR: ${payload.dialoguePtBr || ''}
Por que funciona: ${payload.why || ''}

[VOICE MODE IMPORT RULE]
Voice-over externo: usar lógica visual, ângulo e conceito; entregar texto pronto para narração externa, sem gerar voz interna.
Ator/lip sync: usar diálogo base como semente e aplicar minutagem curta.
Sem fala: usar a copy como intenção visual.
[/VOICE MODE IMPORT RULE]

[COPY LENGTH CONTRACT]
Voice-over externo: até 170 caracteres por cena de 8s.
Ator em câmera: até 125 caracteres por cena de 8s.
Hook: até 15 palavras no conceito; até 12 palavras para ator em câmera.
CTA: 1 frase curta.
Não alongar a copy original sem necessidade.
[/COPY LENGTH CONTRACT]
[/BRIEFING IMPORTADO DO IDEADOR VIRAL]`;

        setExtraInstructions(prev => prev ? `${prev}\n\n${briefingBlock}` : briefingBlock);
    };

    const handleCompileViralScenes = (payload: ViralIdeaPayload) => {
        // Infer speechMode
        let speechMode: ViralSpeechMode = 'ON_CAMERA_DIALOGUE';
        if (voiceStyle === 'No Narration' || voiceStyle === 'Sem Narração') {
            speechMode = 'NO_DIALOGUE';
        } else if (voiceStyle?.toLowerCase().includes('narrador') || voiceStyle?.toLowerCase().includes('narrator') || voiceStyle?.toLowerCase().includes('voice-over') || voiceStyle?.toLowerCase().includes('locução')) {
            speechMode = 'VOICE_OVER_EXTERNAL';
        }

        // Infer executionStyle
        let executionStyle: ViralExecutionStyle = 'tiktok_shop';
        const platLower = (platform || '').toLowerCase();
        const visLower = (visualStyle || '').toLowerCase();
        if (platLower.includes('shop') || platLower.includes('shopee') || visLower.includes('shop')) {
            executionStyle = 'tiktok_shop';
        } else if (visLower.includes('cinemat') || visLower.includes('luxo') || visLower.includes('drama')) {
            executionStyle = 'storytelling_cinematic';
        } else if (visLower.includes('demonstra') || visLower.includes('vender') || objective.toLowerCase().includes('vender')) {
            executionStyle = 'quick_sales';
        } else {
            executionStyle = 'ugc_organic';
        }

        // Object lock
        const objLock = objectLockEnabled ? getPrecisionObjectLockPrompt() : '';

        const context: ViralTemplateContext = {
            idea: {
                niche: payload.niche,
                title: payload.title,
                angle: payload.angle,
                hook: payload.hook,
                sceneConcept: payload.sceneConcept,
                productUse: payload.productUse,
                cta: payload.cta,
                suggestedVisualPromptEn: payload.suggestedVisualPromptEn,
                dialoguePtBr: payload.dialoguePtBr,
                why: payload.why
            },
            productName: productName || cbProductName || payload.niche || payload.title,
            productCategory: productCategory || category || payload.niche,
            objectLockPrompt: objLock || undefined,
            executionStyle,
            speechMode,
            targetAi: 'veo3',
            totalScenes: 3,
            avatarVisualDna: (avatarImage || cbAvatarImage) ? 'Consistent avatar appearance matched from reference visual' : undefined,
            negativePromptPreset: undefined,
            userCustomNotes: extraInstructions ? extraInstructions.slice(0, 300) : undefined
        };

        const compiledScenes = compileViralIdeaToScenes(context);

        const sceneBlocksText = compiledScenes.map((s) => {
            const timingFormatted = s.timingBlocks.map(tb => `  • ${tb.label}: ${tb.direction}`).join('\n');
            return `Cena ${s.sceneIndex} — ${s.sceneName}
Objetivo: ${s.objective}
Duração: ${s.durationSeconds}s
Timing (Blocos de 2s):
${timingFormatted}
Direção Visual: ${s.visualDirection}
Diálogo Falado / Copy: "${s.spokenDialogue}"
Sincronização de Áudio: ${s.audioSyncNotes}
Start Frame Prompt: ${s.startFramePrompt}
End Frame Prompt: ${s.endFramePrompt}
Prompt de Vídeo (Veo/Flow):
${s.videoPrompt}
Negative Prompt:
${s.negativePrompt}
Trava de Continuidade: ${s.continuityLock}`;
        }).join('\n\n----------------------------------------\n\n');

        const flowBlocksOutput = `[BLOCOS FLOW-READY DO IDEADOR VIRAL]
${sceneBlocksText}
[/BLOCOS FLOW-READY DO IDEADOR VIRAL]`;

        setExtraInstructions(prev => prev ? `${prev}\n\n${flowBlocksOutput}` : flowBlocksOutput);
    };

    const handleApplyDetectedData = () => {
        if (!detectedProductData) return;
        
        const detectedStrCat = detectedProductData.detectedStrategicCategory || detectStrategicProductCategoryFromAnalysis(
            (detectedProductData.productDescription || "") + " " + (detectedProductData.productName || "") + " " + (detectedProductData.category || "")
        );
        
        if (mainTab === 'director') {
            if (detectedProductData.productName) setProductName(detectedProductData.productName);
            setProductCategory(detectedStrCat);
            if (detectedProductData.category) setCategory(detectedProductData.category);
            if (detectedProductData.objective) setObjective(detectedProductData.objective);
            if (detectedProductData.visualStyle) setVisualStyle(detectedProductData.visualStyle);
            if (detectedProductData.ctaStyle) setCtaStyle(detectedProductData.ctaStyle);
            if (detectedProductData.voiceStyle) setVoiceStyle(detectedProductData.voiceStyle);
            if (detectedProductData.productDescription) {
                setExtraInstructions(prev => 
                    prev ? prev + "\n" + detectedProductData.productDescription : detectedProductData.productDescription
                );
            }
            // Allow overwriting states
            setHasUserEditedProductName(false);
            setHasUserEditedProductCategory(false);
            setHasUserEditedCategory(false);
        } else {
            if (detectedProductData.productName) setCbProductName(detectedProductData.productName);
            setCbProductCategory(detectedStrCat);
            if (detectedProductData.mainBenefit) setCbMainBenefit(detectedProductData.mainBenefit);
            if (detectedProductData.mainPainSolved) setCbMainPainSolved(detectedProductData.mainPainSolved);
            if (detectedProductData.uniqueDifferentiator) setCbUniqueDifferentiator(detectedProductData.uniqueDifferentiator);
            if (detectedProductData.productDescription) {
                setCbScenarioDescription(prev =>
                    prev ? prev + " - " + detectedProductData.productDescription : detectedProductData.productDescription
                );
            }
            setHasUserEditedCbProductName(false);
            setHasUserEditedCbProductCategory(false);
        }
    };

    const checkProductMismatch = (): { hasMismatch: boolean; msg: string | null } => {
        if (!detectedProductData) return { hasMismatch: false, msg: null };

        const nameInput = mainTab === 'director' ? productName : cbProductName;
        const categoryInput = mainTab === 'director' ? category : cbProductCategory;
        const extraInput = mainTab === 'director' ? extraInstructions : cbScenarioDescription;

        const nameLower = nameInput.toLowerCase();
        const catLower = categoryInput.toLowerCase();
        const extraLower = extraInput.toLowerCase();

        const detectedName = (detectedProductData.productName || '').toLowerCase();
        const detectedCat = (detectedProductData.category || '').toLowerCase();
        const detectedDesc = (detectedProductData.productDescription || '').toLowerCase();
        const detectedColors = (detectedProductData.dominantColors || '').toLowerCase();

        // 1. Check category mismatches
        const categories = {
            watch: ['relógio', 'joia', 'relogio', 'pulseira', 'ring', 'jewel', 'watch'],
            perfume: ['perfume', 'fragrance', 'colônia', 'colonia', 'scent', 'odor'],
            clothing: ['roupas', 'lingerie', 'vestido', 'camisa', 'clothing', 'dress', 'shirt', 'shorts', 'calça'],
            electronic: ['celular', 'phone', 'eletrônico', 'fone', 'headphone', 'charger', 'carregador', 'caixa de som', 'usb'],
            kitchen: ['cozinha', 'casa', 'panela', 'copo', 'prato', 'garrafa', 'liquidificador', 'air fryer', 'kitchen', 'home']
        };

        let activeCatKey = '';
        if (catLower.includes('relógio') || catLower.includes('joias')) activeCatKey = 'watch';
        else if (catLower.includes('roupas') || catLower.includes('lingerie')) activeCatKey = 'clothing';
        else if (catLower.includes('eletrônic') || catLower.includes('celular')) activeCatKey = 'electronic';
        else if (catLower.includes('casa') || catLower.includes('cozinha')) activeCatKey = 'kitchen';

        let detectedCatKey = '';
        if (detectedCat.includes('relógio') || detectedCat.includes('joias') || detectedName.includes('relógio') || detectedName.includes('watch') || detectedDesc.includes('watch')) detectedCatKey = 'watch';
        else if (detectedCat.includes('roupas') || detectedCat.includes('lingerie') || detectedName.includes('vestido') || detectedName.includes('roupa')) detectedCatKey = 'clothing';
        else if (detectedCat.includes('eletrônic') || detectedCat.includes('celular') || detectedName.includes('phone') || detectedName.includes('fone')) detectedCatKey = 'electronic';
        else if (detectedCat.includes('casa') || detectedCat.includes('cozinha') || detectedName.includes('panela') || detectedName.includes('cozinha')) detectedCatKey = 'kitchen';

        if (activeCatKey && detectedCatKey && activeCatKey !== detectedCatKey) {
            return {
                hasMismatch: true,
                msg: `Categoria do formulário (${categoryInput}) difere do produto detectado na imagem (parece ser um ${detectedProductData.productName}).`
            };
        }

        // 2. Specific item mismatch (Perfume vs Watch)
        if ((detectedName.includes('watch') || detectedName.includes('reló') || detectedDesc.includes('watch') || detectedDesc.includes('reló')) &&
            (nameLower.includes('perfume') || nameLower.includes('colonia') || nameLower.includes('colônia') || extraLower.includes('perfume'))) {
            return {
                hasMismatch: true,
                msg: "A imagem enviada contém um relógio, mas o formulário descreve um perfume."
            };
        }

        if ((detectedName.includes('perfume') || detectedName.includes('colonia') || detectedName.includes('scent') || detectedDesc.includes('perfume')) &&
            (nameLower.includes('reló') || nameLower.includes('watch') || extraLower.includes('reló'))) {
            return {
                hasMismatch: true,
                msg: "A imagem enviada contém um perfume, mas o formulário descreve um relógio."
            };
        }

        // 3. Decor vs watch
        if ((nameLower.includes('reló') || nameLower.includes('watch')) && 
            (detectedCatKey === 'kitchen' || detectedName.includes('vaso') || detectedName.includes('quadro') || detectedName.includes('almofada') || detectedName.includes('decor'))) {
            return {
                hasMismatch: true,
                msg: "A imagem enviada parece ser decoração, mas o formulário descreve um relógio."
            };
        }

        // 4. Color mismatches
        if (detectedColors) {
            const colorsList = ['azul', 'vermelho', 'preto', 'branco', 'verde', 'rosa', 'amarelo', 'dourado', 'prata', 'black', 'white', 'red', 'blue', 'gold', 'silver', 'pink'];
            for (const col of colorsList) {
                if (nameLower.includes(col) || extraLower.includes(col)) {
                    if (!detectedColors.includes(col)) {
                        return {
                            hasMismatch: true,
                            msg: `A cor descrita (${col}) diverge das cores predominantes da imagem (${detectedProductData.dominantColors}).`
                        };
                    }
                }
            }
        }

        return { hasMismatch: false, msg: null };
    };

    const handleBypassAndGenerate = (isCb: boolean) => {
        setMismatchBypassed(true);
        setMismatchWarning(null);
        if (isCb) {
            setTimeout(() => {
                handleCbGenerate();
            }, 50);
        } else {
            setTimeout(() => {
                handleGenerate();
            }, 50);
        }
    };

    const [pasteFeedback, setPasteFeedback] = useState<any>(null);
    const [pasteError, setPasteError] = useState<string | null>(null);

    // Universal clipboard paste listener that targets the active slot
    useEffect(() => {
        const handleClipboardPaste = (e: ClipboardEvent) => {
            const items = e.clipboardData?.items;
            if (!items) return;

            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                if (item.type.indexOf('image') !== -1) {
                    const file = item.getAsFile();
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = () => {
                            const resultStr = reader.result as string;
                            
                            // Check file size limit (approx 4.5MB for safety)
                            if (file.size > 4.5 * 1024 * 1024) {
                                setPasteError("Imagem muito grande. Limite de 4.5MB.");
                                return;
                            }

                            // Route clipboard to current focused upload slot
                            if (activeUploadSlot === 'product') {
                                setProductAnalysisTriggerSource('product_paste');
                                setProductImage(resultStr);
                            } else if (activeUploadSlot === 'scenario') {
                                setScenarioImage(resultStr);
                            } else if (activeUploadSlot === 'avatar') {
                                setAvatarImage(resultStr);
                            } else if (activeUploadSlot === 'refImage') {
                                setRefImage(resultStr);
                            } else if (activeUploadSlot === 'cbProduct') {
                                setProductAnalysisTriggerSource('product_paste');
                                setCbProductImages(prev => [...prev, resultStr]);
                            } else if (activeUploadSlot === 'cbScenario') {
                                setCbScenarioImage(resultStr);
                            } else if (activeUploadSlot === 'cbAvatar') {
                                setCbAvatarImage(resultStr);
                            } else if (activeUploadSlot === 'cbSocialProof') {
                                setCbSocialProofImages(prev => [...prev, resultStr]);
                            }

                            setPasteFeedback({
                                message: "Imagem colada da área de transferência!",
                                name: file.name || "Pasted_Image",
                                size: (file.size / 1024).toFixed(1) + " KB"
                            });
                            setPasteError(null);
                            setTimeout(() => setPasteFeedback(null), 3500);
                        };
                        reader.readAsDataURL(file);
                    }
                    e.preventDefault();
                    break;
                } else if (item.type.indexOf('video') !== -1) {
                    const file = item.getAsFile();
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = () => {
                            const resultStr = reader.result as string;
                            if (activeUploadSlot === 'refVideo') {
                                setRefVideo(resultStr);
                            } else if (activeUploadSlot === 'cbRefVideo') {
                                setCbRefVideo(resultStr);
                            }
                            setPasteFeedback({
                                message: "Vídeo colado com sucesso!",
                                name: file.name || "Pasted_Video",
                                size: (file.size / (1024 * 1024)).toFixed(1) + " MB"
                            });
                            setPasteError(null);
                            setTimeout(() => setPasteFeedback(null), 3500);
                        };
                        reader.readAsDataURL(file);
                    }
                    e.preventDefault();
                    break;
                }
            }
        };

        window.addEventListener('paste', handleClipboardPaste);
        return () => window.removeEventListener('paste', handleClipboardPaste);
    }, [activeUploadSlot]);

    // Handle automated state mismatches validation resets
    useEffect(() => {
        if (isRestoringRef.current) return;
        setMismatchBypassed(false);
        setMismatchWarning(null);
    }, [productImage, cbProductImages, productName, cbProductName]);

    // Downstream dual visual analysis trigger
    useEffect(() => {
        if (isRestoringRef.current) return;
        const isDirector = mainTab === 'director';
        const targetImg = isDirector ? productImage : (cbProductImages[0] || null);

        if (!targetImg) {
            setAiAnalysis(null);
            setDetectedProductData(null);
            lastAnalyzedImgRef.current = null;
            return;
        }

        if (!productAnalysisTriggerSource || !['product_upload', 'product_paste', 'manual_analyze_click'].includes(productAnalysisTriggerSource)) {
            return;
        }

        const isManual = productAnalysisTriggerSource === 'manual_analyze_click';
        if (typeof targetImg === 'string' && targetImg.startsWith('data:image/') && (isManual || targetImg !== lastAnalyzedImgRef.current)) {
            lastAnalyzedImgRef.current = targetImg;
            runVisualAnalysis(targetImg);
            // Reset the trigger source after starting analysis to prevent unwanted runs
            setProductAnalysisTriggerSource(null);
        }
    }, [productImage, cbProductImages, mainTab, productAnalysisTriggerSource]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string | null) => void) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => setter(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleProductFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                setProductAnalysisTriggerSource('product_upload');
                setProductImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleClearInputs = () => {
        setProductName('');
        setCategory('👗 Roupas Femininas & Lingerie');
        setPlatform('TikTok Shop');
        setObjective('Conversão de Vendas (Direct Sales)');
        setVisualStyle('Estética UGC (Realista)');
        setCtaStyle('AJUDA_INDIRETA');
        setVoiceStyle('Conversacional');
        setAiAnalysis(null);
        setDuration('Medium (30s)');
        setFormat('9:16 (Vertical)');
        setExtraInstructions('');
        setProductImage(null);
        setScenarioImage(null);
        setAvatarImage(null);
        setRefVideo(null);
        setRefImage(null);
        setResult(null);
        setFinalPromptStructure(null);
        setErrorMsg(null);
    };

    const getPrecisionObjectLockPrompt = () => {
        if (!objectLockEnabled) {
            return "";
        }

        const brandVal = olBrand || cbProductName || productName || "";
        const nameVal = olProductName || cbProductName || productName || "";
        const primaryColor = olPrimaryColor || "";
        const secondaryColor = olSecondaryColor || "";
        const materialVal = olMaterial || "";
        const shapeVal = olShape || "";
        const logoVal = olLogoDescription || "";
        const featuresVal = olUniqueFeatures || "";

        let levelDescription = "";
        if (objectLockLevel === "basic") {
            levelDescription = `
LOCK LEVEL: BASIC
Identify and protect these brand visual essentials:
- Brand Name: ${brandVal}
- Product Name: ${nameVal}
- Primary Color: ${primaryColor}
- Shape: ${shapeVal}
- Material: ${materialVal}
- Logo & Mark placement: ${logoVal}
`;
        } else if (objectLockLevel === "advanced") {
            levelDescription = `
LOCK LEVEL: ADVANCED
Identify and protect basic traits plus fine physical finishes:
- Brand Name: ${brandVal}
- Product Name: ${nameVal}
- Primary & Secondary Color: ${primaryColor} and ${secondaryColor}
- Shape & Silhouette geometry: ${shapeVal}
- Main Material composition: ${materialVal}
- Logo Description: ${logoVal}
- Texture & Surface texture: Maintain exact tactile texture and reflective physical shine. Do NOT alter matte, gloss, satin, polished surface rules.
- Outer Buttons & Interface layout: Buttons, crown knobs, screen displays, and dial faces must stay in their exact physical coordinates.
- Retail Packaging: The retail box style, colors, and layout must stay identical if visualized.
- Additional features: ${featuresVal}
`;
        } else {
            levelDescription = `
LOCK LEVEL: MICRO DEEP DETAIL
Identify and protect every physical feature down to the sub-millimeter level:
- Brand Name: ${brandVal}
- Product Name: ${nameVal}
- Primary & Secondary Color: ${primaryColor} and ${secondaryColor}
- Shape & Silhouette geometry: ${shapeVal}
- Main Material: ${materialVal}
- Logo, Branding & Typography style: ${logoVal}
- Fine Elements: Preserve exact typography font styling on dials, marker geometry, date window position, dial subdials, precise number sequence alignment, small symbols, crown knob engravings, outer decorative embellishments.
- Anomalies/Identifiers: Preserve any product defects, unique physical serial marks, engravings, small imperfections list: ${featuresVal}
`;
        }

        return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔒 STRICT PRECISION OBJECT LOCK PROMPT PROTOCOL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${levelDescription}

STRICT PROMPT INJECTION RULES (MANDATORY):
Do not modify, replace, redesign, simplify, remove or hallucinate any locked object characteristics listed above. 
You are strictly forbidden from altering, simplifying, or reimagining the product's visual identity.
All generated visual scenes, prompts, text prompts, character activities, and camera parameters must preserve the exact locked attributes across every shot and camera angle.
Apply these locked properties strictly in:
* VISUAL_PROMPT_EN
* ACTION_PROMPT_EN
* SCENE_DESCRIPTIONS (or scene detail parameter entries)
* VEO_STRUCTURE / SORA_STRUCTURE / GROK_STRUCTURE
* STORYBOARD (visual prompts inside storyboard scenes)
* SHOT LIST (detailed shot prompts/descriptions)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
    };

    const getLockScoreAndLevel = () => {
        if (!objectLockEnabled) return { score: 0, level: 'Desativado', color: 'text-slate-500 bg-slate-950/50 border-slate-900', pct: 0 };
        let filledCount = 0;
        if (olBrand?.trim()) filledCount++;
        if (olProductName?.trim()) filledCount++;
        if (olPrimaryColor?.trim()) filledCount++;
        if (olSecondaryColor?.trim()) filledCount++;
        if (olMaterial?.trim()) filledCount++;
        if (olShape?.trim()) filledCount++;
        if (olLogoDescription?.trim()) filledCount++;
        if (olUniqueFeatures?.trim()) filledCount++;

        let basePct = (filledCount / 8) * 100;
        let levelStr = 'Weak';
        let colorStyle = 'text-rose-400 bg-rose-950/30 border-rose-900/30';
        
        if (filledCount >= 7) {
            levelStr = 'Maximum';
            colorStyle = 'text-emerald-400 bg-emerald-950/30 border-emerald-900/40 font-bold';
        } else if (filledCount >= 5) {
            levelStr = 'Strong';
            colorStyle = 'text-cyan-400 bg-cyan-950/30 border-cyan-900/40 font-bold';
        } else if (filledCount >= 3) {
            levelStr = 'Medium';
            colorStyle = 'text-amber-400 bg-amber-950/30 border-amber-900/40';
        }

        return { score: filledCount, level: levelStr, color: colorStyle, pct: basePct };
    };

function enforceUgcTiktokShopProductionSchema(data: any, productName: string, format: string): any {
    const allowedFormats = [
        "Take único UGC",
        "Conversa com amiga",
        "Minha opinião sincera",
        "Achei sem querer",
        "Testando comigo",
        "GRWM",
        "Arrume-se comigo",
        "Storytime",
        "POV",
        "Review",
        "Demonstração"
    ];

    let chosenFormat = data?.production_strategy?.chosen_format;
    if (!chosenFormat || !allowedFormats.includes(chosenFormat)) {
        chosenFormat = "Minha opinião sincera";
    }

    const fixScriptLength = (scriptStr: string, sceneId: number, hasCta: boolean) => {
        let clean = (scriptStr || "").trim();

        // Enforce NO CTA in scenes 1 & 2, Enforce CTA in scene 3
        if (!hasCta) {
            clean = clean.replace(/cliqu[ea]\s+no\s+carrinho\s+laranja/gi, "veja o resultado")
                         .replace(/cliqu[ea]\s+no\s+link/gi, "dá uma olhada")
                         .replace(/garant[ea]\s+o\s+seu/gi, "vale a pena conferir")
                         .replace(/compr[ea]\s+agora/gi, "fica a dica")
                         .replace(/carrinho\s+laranja/gi, "produto em mãos");
        } else {
            if (!/carrinho|link|compr|garant|cliqu/i.test(clean)) {
                clean += " Clica no carrinho laranja aqui embaixo para garantir o seu hoje mesmo!";
            }
        }

        // Enforce 175 to 195 characters strictly
        if (clean.length < 175) {
            const fillersScene1 = [
                " Sério gente, eu fiquei completamente chocada quando testei isso na minha rotina do dia a dia!",
                " Não imaginava que funcionaria tão bem assim de primeira, superou todas as minhas expectativas!",
                " Fiquei impressionada de verdade com a qualidade, parecia bom demais para ser verdade!"
            ];
            const fillersScene2 = [
                " Facilita demais o dia a dia e economiza muito tempo prático que eu nem tinha antes!",
                " A diferença de qualidade é surreal e todo mundo que vê pergunta onde eu consegui comprar!",
                " Transforma completamente a experiência diária e entrega exatamente o que promete!"
            ];
            const fillersScene3 = [
                " Clica agora no carrinho laranja antes que acabe o estoque promocional de hoje mesmo!",
                " Aproveita a promoção exclusiva no link antes que esgoste, você não vai se arrepender!",
                " Garanta o seu hoje mesmo com preço especial direto no botão do carrinho laranja!"
            ];

            const fillers = sceneId === 1 ? fillersScene1 : (sceneId === 2 ? fillersScene2 : fillersScene3);
            let fillerIdx = 0;
            while (clean.length < 175 && fillerIdx < fillers.length) {
                const add = fillers[fillerIdx];
                if (clean.length + add.length <= 195) {
                    clean += add;
                } else {
                    const remaining = 188 - clean.length;
                    if (remaining > 15) {
                        clean += add.substring(0, remaining - 1) + ".";
                    } else {
                        break;
                    }
                }
                fillerIdx++;
            }

            while (clean.length < 175) {
                const addStr = " É bom demais!";
                if (clean.length + addStr.length <= 195) {
                    clean += addStr;
                } else {
                    clean = clean.padEnd(178, "!");
                }
            }
        }

        if (clean.length > 195) {
            clean = clean.substring(0, 185);
            const lastDot = clean.lastIndexOf('.');
            const lastExcl = clean.lastIndexOf('!');
            const bestCut = Math.max(lastDot, lastExcl);
            if (bestCut > 150) {
                clean = clean.substring(0, bestCut + 1);
            } else {
                const lastSpace = clean.lastIndexOf(' ');
                if (lastSpace > 150) {
                    clean = clean.substring(0, lastSpace) + "!";
                }
            }

            while (clean.length < 175) {
                clean += " É incrível!";
            }
        }

        return clean;
    };

    const rawScenes = Array.isArray(data?.scene_scripts) ? data.scene_scripts : [];

    const defaultSceneObjectives = [
        "Interromper o scroll, criar curiosidade e gerar interesse visual imediato",
        "Aumentar o desejo, demonstrar benefícios práticos e gerar identificação com o público",
        "Converter o espectador, reforçar o valor do produto e estimular a ação com CTA"
    ];

    const defaultSceneStrategies = [
        "Abertura de alto impacto visual e pergunta intrigante para reter os primeiros 3 segundos",
        "Demonstração em uso real mostrando a solução do problema principal",
        "Chamada para ação direta com senso de oportunidade e indicação clara do botão"
    ];

    const defaultSceneTriggers = [
        "Curiosidade e Novidade",
        "Desejo e Prova Visual",
        "Urgência e Ação Direta"
    ];

    const defaultSceneDescriptions = [
        `Pessoa real gravando com o celular na mão, mostrando o ${productName} em ângulo de câmera frontal espontâneo`,
        `Cena em close-up das mãos utilizando o ${productName} no ambiente do dia a dia com iluminação natural`,
        `Apresentador apontando para o canto inferior da tela em direção ao carrinho laranja do TikTok Shop`
    ];

    const defaultSceneActions = [
        `Segura o ${productName} perto da câmera com expressão de surpresa e entusiasmo natural`,
        `Aplica/utiliza o ${productName} demonstrando a facilidade e eficácia do resultado`,
        `Sorri, aponta para baixo indicando o carrinho e faz gesto convidativo de compra`
    ];

    const defaultRawScripts = [
        `Gente, eu preciso mostrar isso aqui para vocês porque eu simplesmente fiquei chocada! Olhem só o que acabou de chegar e como isso mudou completamente minha rotina diária no dia a dia!`,
        `O ${productName} é super prático de usar e resolve exatamente aquele problema que todo mundo tem. A qualidade é surreal e a eficiência me surpreendeu demais desde a primeira vez!`,
        `E o melhor de tudo é que tá com desconto especial agora! Clica no carrinho laranja aqui embaixo na tela e garanta o seu hoje mesmo antes que acabe o estoque promocional!`
    ];

    const scene_scripts = [1, 2, 3].map((sceneId, idx) => {
        const raw = rawScenes[idx] || {};
        const isCtaScene = sceneId === 3;
        const initialScript = raw.script_pt_br || defaultRawScripts[idx];
        const fixedScript = fixScriptLength(initialScript, sceneId, isCtaScene);

        return {
            scene_id: sceneId,
            duration_seconds: 8,
            objective: raw.objective || defaultSceneObjectives[idx],
            format: raw.format || chosenFormat,
            strategy: raw.strategy || defaultSceneStrategies[idx],
            trigger: raw.trigger || defaultSceneTriggers[idx],
            scene_description: raw.scene_description || defaultSceneDescriptions[idx],
            action: raw.action || defaultSceneActions[idx],
            script_pt_br: fixedScript
        };
    });

    return {
        mode: "ugc_tiktok_shop_production",
        production_strategy: {
            chosen_format: chosenFormat,
            reason_for_choice: data?.production_strategy?.reason_for_choice || `O formato ${chosenFormat} foi selecionado devido ao alto potencial de demonstração visual do produto ${productName}, conectando com o público do TikTok Shop através de naturalidade e alta taxa de conversão.`,
            main_hook: data?.production_strategy?.main_hook || `Interrupção de padrão visual com pergunta de alta curiosidade sobre o ${productName}.`,
            mental_triggers: Array.isArray(data?.production_strategy?.mental_triggers) && data.production_strategy.mental_triggers.length > 0
                ? data.production_strategy.mental_triggers
                : ["Curiosidade", "Prova Social", "Urgência"],
            conversion_strategy: {
                scene_1: data?.production_strategy?.conversion_strategy?.scene_1 || "Capturar atenção nos primeiros 3 segundos com quebra de padrão e curiosidade.",
                scene_2: data?.production_strategy?.conversion_strategy?.scene_2 || "Demonstrar benefícios claros e gerar identificação imediata com a dor do cliente.",
                scene_3: data?.production_strategy?.conversion_strategy?.scene_3 || "Lançar oferta imperdível e direcionar clique para o carrinho laranja."
            }
        },
        scene_scripts: scene_scripts,
        final_validation: {
            ugc_feeling: data?.final_validation?.ugc_feeling || "Alta autenticidade. Sensação de vídeo gravado espontaneamente com câmera de celular por um consumidor real.",
            continuity: data?.final_validation?.continuity || "Fluidez perfeita entre a atração inicial, demonstração prática do produto e encerramento comercial.",
            copy_quality: data?.final_validation?.copy_quality || "Linguagem brasileira natural, frases curtas, ritmo dinâmico e tom de recomendação pessoal sem parecer anúncio engessado.",
            product_focus: data?.final_validation?.product_focus || `Foco contínuo nas qualidades e uso prático do ${productName} em contexto do dia a dia.`,
            conversion_flow: data?.final_validation?.conversion_flow || "Funil de 3 etapas otimizado para TikTok Shop: Gancho → Desejo/Benefício → Chamada para Ação no Carrinho Laranja.",
            warnings: Array.isArray(data?.final_validation?.warnings) ? data.final_validation.warnings : []
        }
    };
}

    const handleGenerate = async () => {
        if (!productName.trim()) {
            setErrorMsg("Informe pelo menos o nome do produto para gerar.");
            return;
        }

        // Product mismatch warning validator
        setLoading(true);
        setErrorMsg(null);
        setAmberWarning(null);
        setWorkerInfo(null);

        const payload: Record<string, any> = {
            productName,
            category,
            platform,
            objective,
            visualStyle,
            ctaStyle,
            voiceStyle,
            duration,
            format,
            extraInstructions,
            target_duration: duration,
            visual_aesthetic: visualStyle,
            aspect_ratio: format,
            cta_style: ctaStyle,
            hook_style: hookStyle,
            emotional_trigger: emotionalTrigger,
            audience_type: audienceType,
            presenter_style: presenterStyle,
            camera_style: cameraStyle,
            energy_level: energyLevel,
            optimization_level: optimizationLevel,
            product_category: productCategory,
            viral_framework: viralFramework,
            hasProductImg: !!productImage,
            hasScenarioImg: !!scenarioImage,
            hasAvatarImg: !!avatarImage,
            hasRefVideo: !!refVideo,
            hasRefImg: !!refImage,
            product_image: productImage || null,
            product_analysis: detectedProductData || null,
            product_dna: detectedProductData?.product_dna || null,
            product_lock_prompt_en: detectedProductData?.product_lock_prompt_en || null,
            product_accuracy_lock_enabled: true,
            // Precision Object Lock parameters
            object_lock_enabled: objectLockEnabled,
            object_lock_level: objectLockLevel,
            locked_attributes: {
                brand: olBrand || "",
                product_name: olProductName || "",
                primary_color: olPrimaryColor || "",
                secondary_color: olSecondaryColor || "",
                material: olMaterial || "",
                shape: olShape || "",
                logo: olLogoDescription || "",
                features: olUniqueFeatures ? olUniqueFeatures.split(',').map(s => s.trim()).filter(Boolean) : []
            },
            // Novel / Cast / Mode variables
            creativeMode,
            directorMode,
            characters: characters.map(c => ({
                name: c.name,
                role: c.role,
                age: c.age,
                height: c.height,
                skinTone: c.skinTone,
                nationalityVisualOrigin: c.nationalityVisualOrigin,
                bodyType: c.bodyType,
                faceShape: c.faceShape,
                hairColor: c.hairColor,
                hairStyle: c.hairStyle,
                eyeColor: c.eyeColor,
                clothing: c.clothing,
                socialStyle: c.socialStyle,
                personality: c.personality,
                mainEmotion: c.mainEmotion,
                relationshipToOtherCharacters: c.relationshipToOtherCharacters,
                voiceType: c.voiceType,
                speechStyle: c.speechStyle,
                hasRefImg: !!c.refImg
            }))
        };

        if (directorMode === 'ugc_tiktok_shop_production') {
            let ugcSystemPrompt = `
You are an expert Creative Director specializing in UGC TikTok Shop video production.
Your task is to generate a complete UGC TikTok Shop Production plan for the product "${productName}".

Output ONLY a valid JSON object matching this EXACT schema:
{
  "mode": "ugc_tiktok_shop_production",
  "production_strategy": {
    "chosen_format": "<Selected format from allowed list>",
    "reason_for_choice": "<Strategic explanation based on product, audience, demonstration potential, and conversion intent>",
    "main_hook": "<Main hook description>",
    "mental_triggers": ["<Trigger 1>", "<Trigger 2>", "<Trigger 3>"],
    "conversion_strategy": {
      "scene_1": "<Scroll interrupter strategy>",
      "scene_2": "<Desire and identification strategy>",
      "scene_3": "<Conversion and action strategy>"
    }
  },
  "scene_scripts": [
    {
      "scene_id": 1,
      "duration_seconds": 8,
      "objective": "Interrupt scroll, create curiosity, create immediate visual interest",
      "format": "<chosen format>",
      "strategy": "<Scene 1 strategy>",
      "trigger": "<Mental trigger for scene 1>",
      "scene_description": "<Visual description of what is on screen>",
      "action": "<Presenter or camera action>",
      "script_pt_br": "<Spoken script in natural Brazilian Portuguese. MUST BE 175 TO 195 CHARACTERS. DO NOT INCLUDE ANY CTA IN SCENE 1.>"
    },
    {
      "scene_id": 2,
      "duration_seconds": 8,
      "objective": "Increase desire, show benefit, create identification",
      "format": "<chosen format>",
      "strategy": "<Scene 2 strategy>",
      "trigger": "<Mental trigger for scene 2>",
      "scene_description": "<Visual description>",
      "action": "<Action direction>",
      "script_pt_br": "<Spoken script in natural Brazilian Portuguese. MUST BE 175 TO 195 CHARACTERS. DO NOT INCLUDE ANY CTA IN SCENE 2.>"
    },
    {
      "scene_id": 3,
      "duration_seconds": 8,
      "objective": "Convert, reinforce value, stimulate action",
      "format": "<chosen format>",
      "strategy": "<Scene 3 strategy>",
      "trigger": "<Mental trigger for scene 3>",
      "scene_description": "<Visual description>",
      "action": "<Action direction with CTA gesture/pointing>",
      "script_pt_br": "<Spoken script in natural Brazilian Portuguese with clear CTA. MUST BE 175 TO 195 CHARACTERS. ONLY SCENE 3 CONTAINS CTA.>"
    }
  ],
  "final_validation": {
    "ugc_feeling": "<Evaluation of UGC authenticity and natural cell phone recording vibe>",
    "continuity": "<Evaluation of narrative flow between scenes>",
    "copy_quality": "<Evaluation of naturalness, Brazilian Portuguese tone, and persuasion>",
    "product_focus": "<Evaluation of product demonstration and benefit presentation>",
    "conversion_flow": "<Evaluation of hook-desire-action progression>",
    "warnings": []
  }
}

ALLOWED FORMATS (Choose the single best format for conversion):
- Take único UGC
- Conversa com amiga
- Minha opinião sincera
- Achei sem querer
- Testando comigo
- GRWM
- Arrume-se comigo
- Storytime
- POV
- Review
- Demonstração

STRICT PRODUCTION RULES:
1. Always create exactly 3 scenes of 8 seconds each (24 seconds total).
2. Each scene must have one main idea with NO repeated arguments, benefits, or emotions.
3. Progression:
   - Scene 1: Interrupt scroll, curiosity, immediate visual interest. NO CTA.
   - Scene 2: Increase desire, show benefit, create identification. NO CTA.
   - Scene 3: Convert, reinforce value, stimulate action. MUST CONTAIN THE CTA.
4. Language Rules:
   - Must sound like a real Brazilian person speaking naturally into a cell phone camera.
   - Use short sentences, natural pauses, emotion, curiosity, enthusiasm, spontaneous recommendation.
   - NO corporate jargon, traditional ad language, robotic scripts, or catalog styles.
5. SCRIPT LENGTH MANDATE:
   - Each 'script_pt_br' MUST BE BETWEEN 175 AND 195 CHARACTERS LONG (target ~185 characters). Count exact character length before writing!
6. Visual Philosophy:
   - Vibe: "Uma pessoa real gravando com o celular algo que acabou de descobrir."
   - Spontaneity, proximity, naturalness, routine feeling.

Input Parameters:
- Product Name: ${productName}
- Category: ${category}
- Platform: ${platform}
- Target Objective: ${objective}
- Extra Instructions: ${extraInstructions}
- Hook Style: ${hookStyle}
- Emotional Trigger: ${emotionalTrigger}
- Audience Type: ${audienceType}
- Presenter Style: ${presenterStyle}
`;

            if (objectLockEnabled && activeObjectLock?.object_lock_prompt_en) {
                ugcSystemPrompt += `\n\n=== OBJECT LOCK GUIDELINE ===\n${activeObjectLock.object_lock_prompt_en}\n`;
            }

            const contents = [{ parts: [{ text: ugcSystemPrompt }] }];
            let aiData: any = null;

            try {
                aiData = await processGeminiAPI(currentKey, {
                    contents,
                    generationConfig: {
                        responseMimeType: "application/json"
                    },
                    ...payload,
                    director_mode: "ugc_tiktok_shop_production"
                });
            } catch (err: any) {
                console.error("UGC Mode Generation Error:", err);
                const fallbackRes = enforceUgcTiktokShopProductionSchema(null, productName, format);
                setResult(fallbackRes);
                const fallbackUgcSnap = buildFinalPromptStructureSnapshot(fallbackRes, null, activeTab, modelStructureSource, activeObjectLock);
                if (fallbackUgcSnap) setFinalPromptStructure(fallbackUgcSnap);
                setLoading(false);
                return;
            }

            let rawText = aiData?.raw_text || "";
            let parsed = aiData?.data;
            if (!parsed && rawText) {
                parsed = safeJSONParse(rawText);
            }

            const finalUgcRes = enforceUgcTiktokShopProductionSchema(parsed, productName, format);
            setResult(finalUgcRes);
            const finalUgcSnap = buildFinalPromptStructureSnapshot(finalUgcRes, null, activeTab, modelStructureSource, activeObjectLock);
            if (finalUgcSnap) setFinalPromptStructure(finalUgcSnap);
            saveToHistory("Creative Director AI - UGC Production", productName, JSON.stringify(finalUgcRes, null, 2));

            setDebugData({
                payload,
                directorMode,
                rawAIResponse: rawText
            });
            setLoading(false);
            return;
        }

        console.log("Creative Director AI Request Payload:", payload);

        try {
            const isNovel = creativeMode === 'novel' || creativeMode === 'novela';
            
            const veoStructurePrompt = `
  "veo_structure": [
     {
       "block_id": 1,
       "scene_name": "HOOK",
       "estimated_time": "8s",
       "visual_prompt_en": "Detailed English dynamic prompt for video generation tools like Veo 3 / Flow reflecting the visual style.",
       "action_prompt_en": "Detailed English action direction with eye-catching movement and camera zooms reflecting target objective.",
       "voice_description_en": "Detailed English voice description of the visible avatar/person and their tone/expression/appearance.",
       "dialogue_pt_br": "Highly persuasive caption/dialogue in Brazilian Portuguese of max 15 words."
     },
     {
       "block_id": 2,
       "scene_name": "PROMPT",
       "estimated_time": "8s",
       "visual_prompt_en": "Detailed English video prompt describing product demonstration.",
       "action_prompt_en": "Detailed English action direction detailing the presenter's manual handling, unboxing, or showing details.",
       "voice_description_en": "Detailed English voice description of the visible avatar/person and their tone/expression/appearance.",
       "dialogue_pt_br": "Portuguese benefit explanation of max 15 words."
     },
     {
       "block_id": 3,
       "scene_name": "PROOF",
       "estimated_time": "8s",
       "visual_prompt_en": "Close up camera angle prompt showing high quality and sensory details.",
       "action_prompt_en": "Detailed English action direction for social proof, showing product close up and presenter's reactions.",
       "voice_description_en": "Detailed English voice description of the visible avatar/person and their tone/expression/appearance.",
       "dialogue_pt_br": "Portuguese social proof or objection-killing line of max 15 words."
     },
     {
       "block_id": 4,
       "scene_name": "CTA",
       "estimated_time": "6s",
       "visual_prompt_en": "English call to action scene prompt showing hand clicking/pointing to orange cart.",
       "action_prompt_en": "Detailed English CTA action direction, pointing, showing the orange cart or link, pressing a button.",
       "voice_description_en": "Detailed English voice description of the visible avatar/person and their tone/expression/appearance.",
       "dialogue_pt_br": "Portuguese urgent call-to-action sentence."
     }
  ]`;

            const soraStructurePrompt = `
  "sora_structure": [
     {
       "block_id": 1,
       "scene_name": "HOOK",
       "estimated_time": "15s",
       "visual_prompt_en": "High cinema description of hook scene for Sora 2.",
       "action_prompt_en": "High-impact opening action sequence, camera sweep movement for Sora 2.",
       "voice_description_en": "Detailed English voice description of the visible avatar/person and their tone/expression/appearance for Sora 2.",
       "dialogue_pt_br": "Portuguese voiceover/text prompt of max 15 words."
     },
     {
       "block_id": 2,
       "scene_name": "BENEFIT",
       "estimated_time": "15s",
       "visual_prompt_en": "Advanced scene transition or high fidelity product shot for Sora 2.",
       "action_prompt_en": "Elegant physical hand gestures or camera tracking motion for Sora 2.",
       "voice_description_en": "Detailed English voice description of the visible avatar/person and their tone/expression/appearance for Sora 2.",
       "dialogue_pt_br": "Portuguese value voiceover of max 15 words."
     },
     {
       "block_id": 3,
       "scene_name": "CTA",
       "estimated_time": "10s",
       "visual_prompt_en": "Sora 2 call to action cinematic visual prompt.",
       "action_prompt_en": "Direct conversion gesture, pointing, and beautiful closing sequence for Sora 2.",
       "voice_description_en": "Detailed English voice description of the visible avatar/person and their tone/expression/appearance for Sora 2.",
       "dialogue_pt_br": "Portuguese direct CTA of max 15 words."
     }
  ]`;

            const grokStructurePrompt = `
  "grok_structure": [
     {
       "block_id": 1,
       "scene_name": "HOOK",
       "estimated_time": "6s",
       "visual_prompt_en": "Fast dynamic action shot for Grok model.",
       "action_prompt_en": "Fast kinetic action direction, instant focus push for Grok.",
       "voice_description_en": "Detailed English voice description of visible avatar/person and their tone/expression for Grok.",
       "dialogue_pt_br": "Grok hook in Portuguese (max 12 words)"
     },
     {
       "block_id": 2,
       "scene_name": "BENEFIT",
       "estimated_time": "6s",
       "visual_prompt_en": "Product feature shot for Grok model.",
       "action_prompt_en": "Close up product function trigger motion for Grok.",
       "voice_description_en": "Detailed English voice description of visible avatar/person and their tone/expression for Grok.",
       "dialogue_pt_br": "Grok benefit detail in Portuguese (max 12 words)"
     },
     {
       "block_id": 3,
       "scene_name": "CTA",
       "estimated_time": "6s",
       "visual_prompt_en": "Final checkout arrow prompt for Grok model.",
       "action_prompt_en": "Rapid pointing gesture to bottom action bar for Grok.",
       "voice_description_en": "Detailed English voice description of visible avatar/person and their tone/expression for Grok.",
       "dialogue_pt_br": "Grok CTA in Portuguese (max 12 words)"
     }
  ]`;

            const veoStructurePromptNovel = `
  "veo_structure": [
     {
        "block_id": 1,
        "scene_name": "SCENE 1 — HOOK / DRAMA",
        "estimated_time": "10s",
        "visual_prompt_en": "Detailed English cinematic prompt describing all characters, environment, emotion, and camera angles. Focus on close-up shots of characters and high identity consistency.",
        "action_prompt_en": "Detailed English action prompt detailing precise movements, camera movements, and tension gestures under selected visual aesthetic.",
        "character_profiles_en": "Complete profiles for all characters in this scene.",
        "character_lock_en": "Rules to preserve each character’s age, face, skin tone, body type, hair, clothing and visual identity consistently across all scenes.",
        "speaker_timing": "SPEAKER_TIMING: Explicit timing description of who speaks, when, and how other characters react during this scene.",
        "voice_description_en": "Voice descriptions per character in this scene.",
        "dialogue_pt_br": "SpeakerName1: \\"dialogue or hook in Portuguese\\"\nSpeakerName2: \\"other dialogue or hook in Portuguese\\"",
        "reaction_directions_en": "Detailed instructions on how non-speaking characters react through facial expressions, posture, gestures, and visual emotion."
     },
     {
        "block_id": 2,
        "scene_name": "SCENE 2 — DEVELOPMENT / TENSION",
        "estimated_time": "10s",
        "visual_prompt_en": "Detailed English cinematic prompt describing characters interacting or showing product benefit. Focus on close-up shots of characters and high identity consistency.",
        "action_prompt_en": "Detailed English action prompt detailing precise physical moves, camera pans or dollies, and interactive gestures under selected visual aesthetic.",
        "character_profiles_en": "Complete profiles for all characters in this scene.",
        "character_lock_en": "Rules to preserve each character’s age, face, skin tone, body type, hair, clothing and visual identity consistently across all scenes.",
        "speaker_timing": "SPEAKER_TIMING: Explicit timing description of who speaks, when, and how other characters react during this scene.",
        "voice_description_en": "Voice descriptions per character in this scene.",
        "dialogue_pt_br": "SpeakerName1: \\"persuasive dialogue in Portuguese\\"\nSpeakerName2: \\"other dialogue in Portuguese\\"",
        "reaction_directions_en": "Detailed instructions on how non-speaking characters react through facial expressions, posture, gestures, and visual emotion."
     },
     {
        "block_id": 3,
        "scene_name": "SCENE 3 — RESOLUTION / CTA",
        "estimated_time": "10s",
        "visual_prompt_en": "Detailed English cinematic prompt describing characters solving the problem using the product and showing physical call to action. Focus on close-up shots of characters and high identity consistency.",
        "action_prompt_en": "Detailed English action prompt for the final scene, detailing precise hands, look, and visual CTA gesture under selected visual aesthetic.",
        "character_profiles_en": "Complete profiles for all characters in this scene.",
        "character_lock_en": "Rules to preserve each character’s age, face, skin tone, body type, hair, clothing and visual identity consistently across all scenes.",
        "speaker_timing": "SPEAKER_TIMING: Explicit timing description of who speaks, when, and how other characters react during this scene.",
        "voice_description_en": "Voice descriptions per character in this scene.",
        "dialogue_pt_br": "SpeakerName1: \\"persuasive call to action dialogue in Portuguese\\"\nSpeakerName2: \\"other dialogue in Portuguese\\"",
        "reaction_directions_en": "Detailed instructions on how non-speaking characters react through facial expressions, posture, gestures, and visual emotion."
     }
  ]`;

            const soraStructurePromptNovel = `
  "sora_structure": [
     {
        "block_id": 1,
        "scene_name": "SCENE 1 — HOOK / DRAMA",
        "estimated_time": "15s",
        "visual_prompt_en": "Cinematic Sora 2 optimized scenic dynamic prompt with intense details, cinematic lighting, extreme character depth.",
        "action_prompt_en": "Detailed physical actions, camera sweeps, zoom velocity, and actor body language for Sora 2.",
        "character_profiles_en": "Complete profiles for all characters in this scene.",
        "character_lock_en": "Rules to preserve each character’s age, face, skin tone, body type, hair, clothing and visual identity consistently across all scenes.",
        "speaker_timing": "SPEAKER_TIMING: Explicit timing description of who speaks, when, and how other characters react during this scene.",
        "voice_description_en": "Voice descriptions per character in this scene.",
        "dialogue_pt_br": "SpeakerName1: \\"dialogue in Portuguese\\"",
        "reaction_directions_en": "Detailed instructions on how non-speaking characters react."
     },
     {
        "block_id": 2,
        "scene_name": "SCENE 2 — DEVELOPMENT / TENSION",
        "estimated_time": "15s",
        "visual_prompt_en": "Cinematic Sora 2 optimized development prompt representing product benefit and character situations.",
        "action_prompt_en": "Character movement and physical pacing actions representing product integration for Sora 2.",
        "character_profiles_en": "Complete profiles for all characters in this scene.",
        "character_lock_en": "Rules to preserve each character’s age, face, skin tone, body type, hair, clothing and visual identity consistently across all scenes.",
        "speaker_timing": "SPEAKER_TIMING: Explicit timing description of who speaks, when, and how other characters react during this scene.",
        "voice_description_en": "Voice descriptions per character in this scene.",
        "dialogue_pt_br": "SpeakerName2: \\"dialogue in Portuguese\\"",
        "reaction_directions_en": "Detailed instructions on how non-speaking characters react."
     },
     {
        "block_id": 3,
        "scene_name": "SCENE 3 — RESOLUTION / CTA",
        "estimated_time": "10s",
        "visual_prompt_en": "Cinematic Sora 2 optimized resolution and CTA prompt.",
        "action_prompt_en": "CTA hand moves, body gestures, and final scene cinematic action for Sora 2.",
        "character_profiles_en": "Complete profiles for all characters in this scene.",
        "character_lock_en": "Rules to preserve each character’s age, face, skin tone, body type, hair, clothing and visual identity consistently across all scenes.",
        "speaker_timing": "SPEAKER_TIMING: Explicit timing description of who speaks, when, and how other characters react during this scene.",
        "voice_description_en": "Voice descriptions per character in this scene.",
        "dialogue_pt_br": "SpeakerName1: \\"dialogue in Portuguese\\"",
        "reaction_directions_en": "Detailed instructions on how non-speaking characters react."
     }
  ]`;

            const grokStructurePromptNovel = `
  "grok_structure": [
     {
        "block_id": 1,
        "scene_name": "SCENE 1 — HOOK / DRAMA",
        "estimated_time": "6s",
        "visual_prompt_en": "Grok optimized dramatic visual prompt with striking close ups.",
        "action_prompt_en": "Highly kinetic actions, swift head turns, or facial twitches suited for Grok.",
        "character_profiles_en": "Complete profiles for all characters in this scene.",
        "character_lock_en": "Rules to preserve each character’s age, face, skin tone, body type, hair, clothing and visual identity consistently across all scenes.",
        "speaker_timing": "SPEAKER_TIMING: Explicit timing description of who speaks, when, and how other characters react during this scene.",
        "voice_description_en": "Voice descriptions per character in this scene.",
        "dialogue_pt_br": "SpeakerName1: \\"dialogue in Portuguese\\"",
        "reaction_directions_en": "Detailed instructions on how non-speaking characters react."
     },
     {
        "block_id": 2,
        "scene_name": "SCENE 2 — DEVELOPMENT / TENSION",
        "estimated_time": "6s",
        "visual_prompt_en": "Grok optimized development prompt for product benefits.",
        "action_prompt_en": "Rapid hand motions, product interactions, and focal changes for Grok.",
        "character_profiles_en": "Complete profiles for all characters in this scene.",
        "character_lock_en": "Rules to preserve each character’s age, face, skin tone, body type, hair, clothing and visual identity consistently across all scenes.",
        "speaker_timing": "SPEAKER_TIMING: Explicit timing description of who speaks, when, and how other characters react during this scene.",
        "voice_description_en": "Voice descriptions per character in this scene.",
        "dialogue_pt_br": "SpeakerName2: \\"dialogue in Portuguese\\"",
        "reaction_directions_en": "Detailed instructions on how non-speaking characters react."
     },
     {
        "block_id": 3,
        "scene_name": "SCENE 3 — RESOLUTION / CTA",
        "estimated_time": "6s",
        "visual_prompt_en": "Grok optimized checkout / call to action prompt.",
        "action_prompt_en": "Grok focus zoom, explicit conversion gesture, and direct look.",
        "character_profiles_en": "Complete profiles for all characters in this scene.",
        "character_lock_en": "Rules to preserve each character’s age, face, skin tone, body type, hair, clothing and visual identity consistently across all scenes.",
        "speaker_timing": "SPEAKER_TIMING: Explicit timing description of who speaks, when, and how other characters react during this scene.",
        "voice_description_en": "Voice descriptions per character in this scene.",
        "dialogue_pt_br": "SpeakerName1: \\"dialogue in Portuguese\\"",
        "reaction_directions_en": "Detailed instructions on how non-speaking characters react."
     }
  ]`;

            const activeStructurePrompt = modelStructureSource === 'veo' ? veoStructurePrompt : (modelStructureSource === 'sora' ? soraStructurePrompt : grokStructurePrompt);
            const activeStructurePromptNovel = modelStructureSource === 'veo' ? veoStructurePromptNovel : (modelStructureSource === 'sora' ? soraStructurePromptNovel : grokStructurePromptNovel);

            let systemPrompt = '';

            if (isNovel) {
                systemPrompt = `
You are the world's best Creative Director AI, Conversion Intelligence Engineer, and AI Video Prompt Architect.
Your task is to take the product specifications, visual preferences, destination platform properties, and the full Cast list configured by the user, and generate an outstanding multi-character cinematic script (Novela / Drama) from scratch.

Each character has a full profile that MUST be strictly maintained and locked for consistency.

You must reply with a valid JSON object. Do not wrap the JSON output in markdown blocks like \`\`\`json. Respond with raw JSON only.

The JSON structure MUST contain the following properties:
{
  "creator_prompt": "A continuous textual description of the overall director instructions and character directions for Novela / Drama production.",
  "tiktok_caption": "A trendy, dramatic caption for TikTok or the chosen platform with hashtags based on the product and characters.",
  "platform_adaptation_report": {
    "platform_selected": "${platform}",
    "hook_strategy": "Explain the tension/drama hook copy and video hook strategy tailored specifically for ${platform} in Portuguese.",
    "cta_strategy": "Explain the conversion optimized Call-to-action strategy for ${platform} integrated into the character dialogue.",
    "recommended_duration": "E.g., 30s-60s based on ${platform} intelligence guidelines for dramatic scenes.",
    "voice_style": "Vocal style profiles of characters tailored specifically to the destination platform ${platform}.",
    "recommended_pacing": "Recommended video pacing, close-up cuts, reactions cadence, and visual tension."
  },
  "character_locks": [
    // For EACH character defined in the Cast (or invented), generate a high-consistency Lock item:
    {
       "character_name": "NAME OF THE CHARACTER",
       "character_profile_en": "Complete detailed English character description describing age, face shape, skin tone, body type, hair style/color, clothing style, personality, etc., combining any user parameters with cinematic detail.",
       "character_lock_en": "Preserve this character’s age, face, skin tone, body type, hair, clothing, personality and visual identity consistently across all scenes.",
       "voice_description_en": "Detailed English description of their voice type (e.g. deep baritone, energetic, raspy, soft), speech style, and emotional delivery.",
       "dialogue_pt_br": "Sample dialogue of this character demonstrating their speech style in Brazilian Portuguese."
    }
  ],
  "__veo_marker_for_replace__": ""
       "visual_prompt_en": "Detailed English cinematic prompt describing all characters, environment, emotion, and camera angles. Focus on close-up shots of characters and high identity consistency.",
       "action_prompt_en": "Detailed English action prompt detailing precise movements, camera movements, and tension gestures under selected visual aesthetic.",
       "character_profiles_en": "Complete profiles for all characters in this scene.",
       "character_lock_en": "Rules to preserve each character’s age, face, skin tone, body type, hair, clothing and visual identity consistently across all scenes.",
       "speaker_timing": "SPEAKER_TIMING: Explicit timing description of who speaks, when, and how other characters react during this scene.",
       "voice_description_en": "Voice descriptions per character in this scene.",
       "dialogue_pt_br": "SpeakerName1: \\"dialogue or hook in Portuguese\\"\nSpeakerName2: \\"other dialogue or hook in Portuguese\\"",
       "reaction_directions_en": "Detailed instructions on how non-speaking characters react through facial expressions, posture, gestures, and visual emotion."
     },
     {
       "block_id": 2,
       "scene_name": "SCENE 2 — DEVELOPMENT / TENSION",
       "estimated_time": "10s",
       "visual_prompt_en": "Detailed English cinematic prompt describing characters interacting or showing product benefit. Focus on close-up shots of characters and high identity consistency.",
       "action_prompt_en": "Detailed English action prompt detailing precise physical moves, camera pans or dollies, and interactive gestures under selected visual aesthetic.",
       "character_profiles_en": "Complete profiles for all characters in this scene.",
       "character_lock_en": "Rules to preserve each character’s age, face, skin tone, body type, hair, clothing and visual identity consistently across all scenes.",
       "speaker_timing": "SPEAKER_TIMING: Explicit timing description of who speaks, when, and how other characters react during this scene.",
       "voice_description_en": "Voice descriptions per character in this scene.",
       "dialogue_pt_br": "SpeakerName1: \\"persuasive dialogue in Portuguese\\"\nSpeakerName2: \\"other dialogue in Portuguese\\"",
       "reaction_directions_en": "Detailed instructions on how non-speaking characters react through facial expressions, posture, gestures, and visual emotion."
     },
     {
       "block_id": 3,
       "scene_name": "SCENE 3 — RESOLUTION / CTA",
       "estimated_time": "10s",
       "visual_prompt_en": "Detailed English cinematic prompt describing characters solving the problem using the product and showing physical call to action. Focus on close-up shots of characters and high identity consistency.",
       "action_prompt_en": "Detailed English action prompt for the final scene, detailing precise hands, look, and visual CTA gesture under selected visual aesthetic.",
       "character_profiles_en": "Complete profiles for all characters in this scene.",
       "character_lock_en": "Rules to preserve each character’s age, face, skin tone, body type, hair, clothing and visual identity consistently across all scenes.",
       "speaker_timing": "SPEAKER_TIMING: Explicit timing description of who speaks, when, and how other characters react during this scene.",
       "voice_description_en": "Voice descriptions per character in this scene.",
       "dialogue_pt_br": "SpeakerName1: \\"persuasive call to action dialogue in Portuguese\\"\nSpeakerName2: \\"other dialogue in Portuguese\\"",
       "reaction_directions_en": "Detailed instructions on how non-speaking characters react through facial expressions, posture, gestures, and visual emotion."
     }
  ],
  "sora_structure": [
     // Same 3 scenes as veo_structure structured beautifully for Sora 2 limitations (with complete profiles, speaker timing, dialogue, reactions)
     {
       "block_id": 1,
       "scene_name": "SCENE 1 — HOOK / DRAMA",
       "estimated_time": "15s",
       "visual_prompt_en": "Cinematic Sora 2 optimized scenic dynamic prompt with intense details, cinematic lighting, extreme character depth.",
       "action_prompt_en": "Detailed physical actions, camera sweeps, zoom velocity, and actor body language for Sora 2.",
       "character_profiles_en": "Complete profiles for all characters in this scene.",
       "character_lock_en": "Rules to preserve each character’s age, face, skin tone, body type, hair, clothing and visual identity consistently across all scenes.",
       "speaker_timing": "SPEAKER_TIMING: Explicit timing description of who speaks, when, and how other characters react during this scene.",
       "voice_description_en": "Voice descriptions per character in this scene.",
       "dialogue_pt_br": "SpeakerName1: \\"dialogue in Portuguese\\"",
       "reaction_directions_en": "Detailed instructions on how non-speaking characters react."
     },
     {
       "block_id": 2,
       "scene_name": "SCENE 2 — DEVELOPMENT / TENSION",
       "estimated_time": "15s",
       "visual_prompt_en": "Cinematic Sora 2 optimized development prompt representing product benefit and character situations.",
       "action_prompt_en": "Character movement and physical pacing actions representing product integration for Sora 2.",
       "character_profiles_en": "Complete profiles for all characters in this scene.",
       "character_lock_en": "Rules to preserve each character’s age, face, skin tone, body type, hair, clothing and visual identity consistently across all scenes.",
       "speaker_timing": "SPEAKER_TIMING: Explicit timing description of who speaks, when, and how other characters react during this scene.",
       "voice_description_en": "Voice descriptions per character in this scene.",
       "dialogue_pt_br": "SpeakerName2: \\"dialogue in Portuguese\\"",
       "reaction_directions_en": "Detailed instructions on how non-speaking characters react."
     },
     {
       "block_id": 3,
       "scene_name": "SCENE 3 — RESOLUTION / CTA",
       "estimated_time": "10s",
       "visual_prompt_en": "Cinematic Sora 2 optimized resolution and CTA prompt.",
       "action_prompt_en": "CTA hand moves, body gestures, and final scene cinematic action for Sora 2.",
       "character_profiles_en": "Complete profiles for all characters in this scene.",
       "character_lock_en": "Rules to preserve each character’s age, face, skin tone, body type, hair, clothing and visual identity consistently across all scenes.",
       "speaker_timing": "SPEAKER_TIMING: Explicit timing description of who speaks, when, and how other characters react during this scene.",
       "voice_description_en": "Voice descriptions per character in this scene.",
       "dialogue_pt_br": "SpeakerName1: \\"dialogue in Portuguese\\"",
       "reaction_directions_en": "Detailed instructions on how non-speaking characters react."
     }
  ],
  "grok_structure": [
     // Same 3 scenes as veo_structure structured beautifully for Grok model limitations (with complete profiles, speaker timing, dialogue, reactions)
     {
       "block_id": 1,
       "scene_name": "SCENE 1 — HOOK / DRAMA",
       "estimated_time": "6s",
       "visual_prompt_en": "Grok optimized dramatic visual prompt with striking close ups.",
       "action_prompt_en": "Highly kinetic actions, swift head turns, or facial twitches suited for Grok.",
       "character_profiles_en": "Complete profiles for all characters in this scene.",
       "character_lock_en": "Rules to preserve each character’s age, face, skin tone, body type, hair, clothing and visual identity consistently across all scenes.",
       "speaker_timing": "SPEAKER_TIMING: Explicit timing description of who speaks, when, and how other characters react during this scene.",
       "voice_description_en": "Voice descriptions per character in this scene.",
       "dialogue_pt_br": "SpeakerName1: \\"dialogue in Portuguese\\"",
       "reaction_directions_en": "Detailed instructions on how non-speaking characters react."
     },
     {
       "block_id": 2,
       "scene_name": "SCENE 2 — DEVELOPMENT / TENSION",
       "estimated_time": "6s",
       "visual_prompt_en": "Grok optimized development prompt for product benefits.",
       "action_prompt_en": "Rapid hand motions, product interactions, and focal changes for Grok.",
       "character_profiles_en": "Complete profiles for all characters in this scene.",
       "character_lock_en": "Rules to preserve each character’s age, face, skin tone, body type, hair, clothing and visual identity consistently across all scenes.",
       "speaker_timing": "SPEAKER_TIMING: Explicit timing description of who speaks, when, and how other characters react during this scene.",
       "voice_description_en": "Voice descriptions per character in this scene.",
       "dialogue_pt_br": "SpeakerName2: \\"dialogue in Portuguese\\"",
       "reaction_directions_en": "Detailed instructions on how non-speaking characters react."
     },
     {
       "block_id": 3,
       "scene_name": "SCENE 3 — RESOLUTION / CTA",
       "estimated_time": "6s",
       "visual_prompt_en": "Grok optimized checkout / call to action prompt.",
       "action_prompt_en": "Grok focus zoom, explicit conversion gesture, and direct look.",
       "character_profiles_en": "Complete profiles for all characters in this scene.",
       "character_lock_en": "Rules to preserve each character’s age, face, skin tone, body type, hair, clothing and visual identity consistently across all scenes.",
       "speaker_timing": "SPEAKER_TIMING: Explicit timing description of who speaks, when, and how other characters react during this scene.",
       "voice_description_en": "Voice descriptions per character in this scene.",
       "dialogue_pt_br": "SpeakerName1: \\"dialogue in Portuguese\\"",
       "reaction_directions_en": "Detailed instructions on how non-speaking characters react."
     }
  ]
}

CRITICAL ADAPTATION & PARAMETER CONTROLS:
All output elements MUST dynamically adapt to the requested parameters:
- **target_duration: ${duration}** -> Adjust total video pace, character dialog counts, dialogue length and speed (such as fast-talking or pauses) of voice_description_en to fit the estimated_time blocks.
- **visual_aesthetic: ${visualStyle}** -> Refine the entire scenario backdrop, lighting, camera treatment, character clothing, and style references inside visual_prompt_en under this visual aesthetic style (e.g. UGC Realista, Cinematográfico Premium, Unboxing Natural, etc.).
- **aspect_ratio: ${format}** -> Write precise video layout / camera boundaries framing descriptions inside visual_prompt_en (e.g., vertical camera framing close-ups for '9:16 Vertical', standard widescreen for '16:9 Horizontal', square focused shots for '1:1 Square', etc.).
- **objective: ${objective}** -> Embed custom copywriting persuasion, tension hooks, and dialogues centered strictly on this conversion objective (e.g., Vender Produto, Demonstrar Produto, Comparar Antes e Depois, etc.).
- **cta_style: ${ctaStyle}** -> Tailor the final scene's visual_prompt_en, action_prompt_en, cta_strategy and the characters' spoken dialogue dialogue_pt_br CTA strictly to match this style (e.g., Carrinho Laranja, Comente "eu quero", Chame no Direct, etc.).
- **hook_style: ${hookStyle}** -> Force the opening scene's visual setup, first 3 seconds kinetic hook, first dialogue line, and title captions to strictly implement this hook style.
- **emotional_trigger: ${emotionalTrigger}** -> Infuse the entire narration tone, visual pacing, persuasion triggers, and active close-up framing with this emotional trigger.
- **audience_type: ${audienceType}** -> Calibrate script pacing, vocabulary complexity, objection handling, trust building, and social proof density to perfectly resonate with this audience.
- **presenter_style: ${presenterStyle}** -> Force characters' behavior, dialogue posture, camera-eye interaction, and scene composition to strictly embody this presenter style.
- **camera_style: ${cameraStyle}** -> Structure all camera pathways, framing fields, kinetic pans/zooms, and tracking speeds inside visual_prompt_en and action_prompt_en to reflect this camera style.
- **energy_level: ${energyLevel}** -> Dynamically dictate cut frequency, transition velocity, on-screen text caption density, and scene-to-scene momentum (e.g., extremely viral translates to rapid close-up cuts every 1-2s; very calm translates to long continuous takes).
- **optimization_level: ${optimizationLevel}** -> Calibrate script flow, CTA aggressiveness, emotional resonance, and product exposure duration to fit this marketing goal.
- **voice_style: ${voiceStyle}** -> Ensure voice_description_en contains strict directions instructing TTS tools on accurate gender, tone warmth, delivery energy, and pronunciation cadence matching this voice profile.
- **product_category: ${productCategory}** -> Pre-condition category-specific benefits, aesthetic staging backdrops, native objections, and common buyer motivations.
- **viral_framework: ${viralFramework}** -> Structure all scene blocks, hooks, benefit developments, and final actions strictly according to this marketing framework template.

CRITICAL MULTI-SPEAKER DIALOGUE RULES:
1. Each dialogue line must clearly identify the speaker (e.g. SpeakerName: "dialogue").
2. Only the active speaker moves lips during their line.
3. Non-speaking characters must remain silent.
4. Non-speaking characters may react naturally through facial expressions, eye movement, posture, and gestures.
5. No voice-over unless explicitly selected.
6. No narrator unless explicitly selected.
7. No off-screen dialogue unless explicitly selected.

NOVELA (DRAMA) MODE PRIORITIES:
- Character consistency: All descriptions must strictly look and behave like their profile.
- Age consistency: Lock ages and keep them realistic.
- Relationship dynamics: Make dialogues and interactions reflect their stated feelings and roles.
- Emotional acting: Describe extreme close-ups, dynamic tension, nervous eye movements, facial twitches, tears, smiles, or gasp actions inside visual prompts and reaction directions.
- Realistic dialogue: Brazilian Portuguese dialogue must be natural, engaging, and high-impact.
- Cinematic close-ups and reaction shots: Explicit camera directions for close-up and reaction shots.

🎯 PLATFORM INTELLIGENCE FOR "${platform}":
- TikTok Shop: Fast dramatic hook, high tension, UGC dramatic scenario. Cart link in dialogue CTA.
- Shopee Vídeo: Direct engagement, coupon and discount references in character conversation.
- Mercado Livre: Characters talking about product reliability and warranty in a natural situation.
- Facebook Reels: Relatable family/social drama, strong emotional empathy.
- Instagram Reels: Aspirational lifestyle aesthetics, high-end drama, modern high-key styling.
- YouTube Shorts: High attention hook, swift cuts between close-up and intense reactions.

Input Parameters:
- Product Name: ${productName}
- Product Category: ${category}
- Platform: ${platform}
- Target Objective: ${objective}
- Visual Preference: ${visualStyle}
- CTA Style: ${ctaStyle}
- Estilo de Voz: ${voiceStyle}
- Duration constraint: ${duration}
- Output format: ${format}
- Special requests: ${extraInstructions}
- Hook Style: ${hookStyle}
- Emotional Trigger: ${emotionalTrigger}
- Audience Type: ${audienceType}
- Presenter Style: ${presenterStyle}
- Camera Style: ${cameraStyle}
- Energy Level: ${energyLevel}
- Platform Optimization Level: ${optimizationLevel}
- Voice Style Reference: ${voiceStyle}
- Strategic Product Category Context: ${productCategory}
- Viral Framework: ${viralFramework}

=== CONFIGURED CAST (ELENCO DE PERSONAGENS) ===
${characters.length > 0 ? JSON.stringify(characters, null, 2) : "No specific cast configured manually. You must invent a stunning, highly appropriate multi-character cast of 2-3 characters (identifying names, role, age, clothes, look, personality, emotions, relationship) for this drama / dialogue scene based on the product and requirements!"}
`;
            } else {
                systemPrompt = `
You are the world's best Creative Director AI, Conversion Intelligence Engineer, and Product Architect for short-form video ads (TikTok Shop, Shopee Vídeo, Mercado Livre, Reels, YouTube Shorts).
Your task is to take the product specifications, visual preferences, destination platform properties, and conversion intelligence, and generate an outstanding, highly tailored script structure from scratch.

You must reply with a valid JSON object. Do not wrap the JSON output in markdown blocks like \`\`\`json. Respond with raw JSON only.

The JSON structure MUST contain the following properties:
{
  "creator_prompt": "A continuous textual description of the overall director instructions.",
  "tiktok_caption": "A trendy, casual caption for TikTok or the chosen platform with hashtags based on the product.",
  "platform_adaptation_report": {
    "platform_selected": "${platform}",
    "hook_strategy": "Explain the hook copy and video hook strategy tailored specifically for ${platform} in Portuguese.",
    "cta_strategy": "Explain the conversion optimized Call-to-action strategy for ${platform} in Portuguese (e.g. Orange cart reference for TikTok Shop, coupon code/marked product for Shopee, specifications/trust link for Mercado Livre).",
    "recommended_duration": "E.g., 15-25s or 30-60s based on ${platform} intelligence guidelines.",
    "voice_style": "Vocal style profile and delivery energy tailored specifically to the destination platform ${platform} under the selected voice profile ${voiceStyle}.",
    "recommended_pacing": "Recommended video pacing, clip cuts, patterns, and visual cadence."
  },
  "veo_structure": [
     {
       "block_id": 1,
       "scene_name": "HOOK",
       "estimated_time": "8s",
       "visual_prompt_en": "Detailed English dynamic prompt for video generation tools like Veo 3 / Flow reflecting the visual style.",
       "action_prompt_en": "Detailed English action direction with eye-catching movement and camera zooms reflecting target objective.",
       "voice_description_en": "Detailed English voice description of the visible avatar/person and their tone/expression/appearance.",
       "dialogue_pt_br": "Highly persuasive caption/dialogue in Brazilian Portuguese of max 15 words."
     },
     {
       "block_id": 2,
       "scene_name": "PROMPT",
       "estimated_time": "8s",
       "visual_prompt_en": "Detailed English video prompt describing product demonstration.",
       "action_prompt_en": "Detailed English action direction detailing the presenter's manual handling, unboxing, or showing details.",
       "voice_description_en": "Detailed English voice description of the visible avatar/person and their tone/expression/appearance.",
       "dialogue_pt_br": "Portuguese benefit explanation of max 15 words."
     },
     {
       "block_id": 3,
       "scene_name": "PROOF",
       "estimated_time": "8s",
       "visual_prompt_en": "Close up camera angle prompt showing high quality and sensory details.",
       "action_prompt_en": "Detailed English action direction for social proof, showing product close up and presenter's reactions.",
       "voice_description_en": "Detailed English voice description of the visible avatar/person and their tone/expression/appearance.",
       "dialogue_pt_br": "Portuguese social proof or objection-killing line of max 15 words."
     },
     {
       "block_id": 4,
       "scene_name": "CTA",
       "estimated_time": "6s",
       "visual_prompt_en": "English call to action scene prompt showing hand clicking/pointing to orange cart.",
       "action_prompt_en": "Detailed English CTA action direction, pointing, showing the orange cart or link, pressing a button.",
       "voice_description_en": "Detailed English voice description of the visible avatar/person and their tone/expression/appearance.",
       "dialogue_pt_br": "Portuguese urgent call-to-action sentence."
     }
  ],
  "sora_structure": [
     {
       "block_id": 1,
       "scene_name": "HOOK",
       "estimated_time": "15s",
       "visual_prompt_en": "High cinema description of hook scene for Sora 2.",
       "action_prompt_en": "High-impact opening action sequence, camera sweep movement for Sora 2.",
       "voice_description_en": "Detailed English voice description of the visible avatar/person and their tone/expression/appearance for Sora 2.",
       "dialogue_pt_br": "Portuguese voiceover/text prompt of max 15 words."
     },
     {
       "block_id": 2,
       "scene_name": "BENEFIT",
       "estimated_time": "15s",
       "visual_prompt_en": "Advanced scene transition or high fidelity product shot for Sora 2.",
       "action_prompt_en": "Elegant physical hand gestures or camera tracking motion for Sora 2.",
       "voice_description_en": "Detailed English voice description of the visible avatar/person and their tone/expression/appearance for Sora 2.",
       "dialogue_pt_br": "Portuguese value voiceover of max 15 words."
     },
     {
       "block_id": 3,
       "scene_name": "CTA",
       "estimated_time": "10s",
       "visual_prompt_en": "Sora 2 call to action cinematic visual prompt.",
       "action_prompt_en": "Direct conversion gesture, pointing, and beautiful closing sequence for Sora 2.",
       "voice_description_en": "Detailed English voice description of the visible avatar/person and their tone/expression/appearance for Sora 2.",
       "dialogue_pt_br": "Portuguese direct CTA of max 15 words."
     }
  ],
  "grok_structure": [
     {
       "block_id": 1,
       "scene_name": "HOOK",
       "estimated_time": "6s",
       "visual_prompt_en": "Fast dynamic action shot for Grok model.",
       "action_prompt_en": "Fast kinetic action direction, instant focus push for Grok.",
       "voice_description_en": "Detailed English voice description of visible avatar/person and their tone/expression for Grok.",
       "dialogue_pt_br": "Grok hook in Portuguese (max 12 words)"
     },
     {
       "block_id": 2,
       "scene_name": "BENEFIT",
       "estimated_time": "6s",
       "visual_prompt_en": "Product feature shot for Grok model.",
       "action_prompt_en": "Close up product function trigger motion for Grok.",
       "voice_description_en": "Detailed English voice description of visible avatar/person and their tone/expression for Grok.",
       "dialogue_pt_br": "Grok benefit detail in Portuguese (max 12 words)"
     },
     {
       "block_id": 3,
       "scene_name": "CTA",
       "estimated_time": "6s",
       "visual_prompt_en": "Final checkout arrow prompt for Grok model.",
       "action_prompt_en": "Rapid pointing gesture to bottom action bar for Grok.",
       "voice_description_en": "Detailed English voice description of visible avatar/person and their tone/expression for Grok.",
       "dialogue_pt_br": "Grok CTA in Portuguese (max 12 words)"
     }
  ]
}

CRITICAL RULES:
1. Visual prompts and action prompts must always be in English.
2. Voice descriptions must always be in English. They must describe the avatar/person's appearance, vocal delivery profile, expression, and mood. The tone, speed, delivery, and emotional attitude described inside "voice_description_en" MUST strictly correspond to the selected Voice Style / Estilo de Voz parameter: "${voiceStyle}".
3. Dialogue must always be in Brazilian Portuguese.
4. Creative Director AI is purely for creating custom high-converting ad scripts from scratch, not cloning reference videos. Do not simply describe a copy of other videos.

CRITICAL ADAPTATION & PARAMETER CONTROLS:
All output elements MUST dynamically adapt to the requested parameters:
- **target_duration: ${duration}** -> Adjust total video pace, scene blocks counts, dialogue lengths, and speaking pacing of voice_description_en to fit the estimated_time blocks.
- **visual_aesthetic: ${visualStyle}** -> Refine the entire scenario backdrop, lighting, camera treatment, close up styling, and aesthetic quality inside visual_prompt_en and action_prompt_en (e.g. UGC Realista, Cinematográfico Premium, Produto Luxo, Unboxing Natural, etc.).
- **aspect_ratio: ${format}** -> Write precise video layout / camera boundaries framing descriptions inside visual_prompt_en (e.g., vertical camera framing close-ups for '9:16 Vertical', standard widescreen for '16:9 Horizontal', square focused shots for '1:1 Square', etc.).
- **objective: ${objective}** -> Embed custom copywriting persuasion, hooks, and dialogues centered strictly on this conversion objective (e.g., Vender Produto, Demonstrar Produto, Gerar Curiosidade, Criar Prova Social, etc.).
- **cta_style: ${ctaStyle}** -> Tailor the final scene's visual_prompt_en, action_prompt_en, cta_strategy and the spoken dialogue_pt_br CTA strictly to match this style (e.g., Carrinho Laranja, Produto Marcado, Link do Anúncio, Comente "eu quero", etc.).
- **hook_style: ${hookStyle}** -> Refine first 3 sec visual setups, kinetic hooks, visual prompts, and caption dialogue lines to strictly map to this strategy (e.g. Curiosity, Problem -> Solution, Direct Question, Shock / Surprise, Social Proof, Comparison, Result First, Common Mistake, Irresistible Offer, etc.).
- **emotional_trigger: ${emotionalTrigger}** -> Direct active script copy, dialogue urgency, close-up camera emphasis, and presenter expressions with this trigger (e.g. Urgency, Scarcity, Curiosity, Desire, FOMO, Trust, Exclusivity, Transformation, Aspiration, etc.).
- **audience_type: ${audienceType}** -> Adjust narrative, language, objection handles, rhythm, trust indicators, and social proof depth (e.g. Cold, Warm, Hot, Impulse Buyers, Parents, Professionals, etc.).
- **presenter_style: ${presenterStyle}** -> Structure scene presentation role, script tone, eye-tracking directions, and spoken posture (e.g. UGC Creator, Expert, Real Customer, Invisible Narrator, AI Avatar, etc.).
- **camera_style: ${cameraStyle}** -> Structure all camera pathways, framing fields, kinetic pans/zooms, and tracking speeds inside visual_prompt_en and action_prompt_en to reflect this camera style.
- **energy_level: ${energyLevel}** -> Command transition speed, cut cadence, caption text density, and flow intensity (e.g. extremely viral means rapid micro-cuts every 1-2 seconds; very calm means longer clips).
- **optimization_level: ${optimizationLevel}** -> Refine funnel structure, commercial push depth, CTA directness, and product demonstration priority (e.g. Organic, Hybrid, Conversion, Scale, Marketplace).
- **voice_style: ${voiceStyle}** -> Infuse vocal directions to strictly specify gender, warmth, energy, rhythm, and cadence matching this voice profile in voice_description_en.
- **product_category: ${productCategory}** -> Lock industry-specific hooks, benefits, staging locations, and common consumer objections.
- **viral_framework: ${viralFramework}** -> Build script sequence blocks (HOOK, PROMPT, PROOF, CTA) strictly aligning with this structure's template format.

🎯 PLATFORM INTELLIGENCE & ADAPTABILITY RULES FOR "${platform}":
Each platform requires entirely different marketing angles, hooks, and CTAs. Ensure the generated VISUAL_PROMPT_EN, VOICE_DESCRIPTION_EN, DIALOGUE_PT_BR, CTA, and HOOK strictly leverage these guidelines:

- TikTok Shop: Fast hook, strong interruption pattern, high energy, UGC style review, product proof. Final CTA MUST refer to clicking the orange cart/sacola ("carrinho laranja").
- Shopee Vídeo: Price-driven, offer-focused, coupon and frete grátis focused. Emphasize savings, discount, coupon. CTA MUST refer to "produto marcado" or Shopee link.
- Mercado Livre: Extreme trust on product specs, product quality, purchase confidence. Optimize credibility, specs, full delivery guarantee. CTA MUST refer to "link do anúncio" or the advertisement page.
- Facebook Reels: Casual storytelling, emotional connection, warm family/social contexts, empathetic non-aggressive presentation. CTA should use soft engagement (linking in comments).
- Instagram Reels: Highly aesthetic appeal, aspirational lifestyle, professional elegant product presentation, social proof. CTA must reference "link na bio", toque no link, or "chame no direct".
- YouTube Shorts: High-attention hook, curiosity loop (seamless loop between end and beginning is encouraged), educational/demo hack. CTA must be brief and retention-focused (comments pin).

Your output MUST reflect this intelligence for "${platform}" with deep strategic craft.

Input Parameters:
- Product Name: ${productName}
- Product Category: ${category}
- Platform: ${platform}
- Target Objective: ${objective}
- Visual Preference: ${visualStyle}
- CTA Style: ${ctaStyle}
- Estilo de Voz (Tone/Voice Style): ${voiceStyle}
- Duration constraint: ${duration}
- Output format ratio: ${format}
- Special requests: ${extraInstructions}
- Hook Style: ${hookStyle}
- Emotional Trigger: ${emotionalTrigger}
- Audience Type: ${audienceType}
- Presenter Style: ${presenterStyle}
- Camera Style: ${cameraStyle}
- Energy Level: ${energyLevel}
- Platform Optimization Level: ${optimizationLevel}
- Voice Style Reference: ${voiceStyle}
- Strategic Product Category Context: ${productCategory}
- Viral Framework: ${viralFramework}
${detectedProductData?.product_lock_prompt_en ? `- PRODUCT SPECIFIC LOCK PROMPT (ENG):
${detectedProductData.product_lock_prompt_en}
(You MUST append this PRODUCT SPECIFIC LOCK PROMPT strictly into all generated scene "visual_prompt_en" properties to enforce absolute product consistency!)` : ""}
${productImage ? "[Product Photo uploaded and analysed]" : ""}
${scenarioImage ? "[Scenario Photo uploaded]" : ""}
${avatarImage ? "[Avatar character reference uploaded]" : ""}
${refVideo ? "[Reference video uploaded]" : ""}
${refImage ? "[Reference moodboard image uploaded]" : ""}

${characters.length > 0 ? `=== CONFIGURED CAST (ELENCO DE PERSONAGENS) ===\n${JSON.stringify(characters, null, 2)}` : ""}
`;
            }

            if (objectLockEnabled) {
                let currentAnalysis = productImageAnalysis;
                const inputImg = productImagePreview || productImageBase64 || productImage;
                if (inputImg && !currentAnalysis) {
                    try {
                        currentAnalysis = await analyzeCreativeDirectorProductImage(
                            { base64: inputImg },
                            productName,
                            category,
                            currentKey
                        );
                        setProductImageAnalysis(currentAnalysis);
                        populateManualFieldsFromAnalysis(currentAnalysis);
                    } catch (analysisErr) {
                        console.warn("Análise de imagem no envio falhou:", analysisErr);
                        currentAnalysis = null;
                    }
                }

                const manualOverrides = {
                    enabled: objectLockEnabled,
                    product_identity: olVisualIdentity || olBrand || olProductName,
                    front_view: olFrontView,
                    side_view: olSideView,
                    back_view: olBackView,
                    top_view: olTopView,
                    colors_and_finish: olColorsFinish || (olPrimaryColor ? `${olPrimaryColor} ${olSecondaryColor}` : ''),
                    material_and_texture: olMaterials || olMaterial,
                    logos_and_text: olLogosText || olLogoDescription,
                    packaging: olPackaging,
                    do_not_change: olDoNotChange ? olDoNotChange.split(',').map(s => s.trim()).filter(Boolean) : undefined,
                    allowed_motion: olAllowedMotion ? olAllowedMotion.split(',').map(s => s.trim()).filter(Boolean) : undefined,
                };

                const builtLock = buildCreativeDirectorObjectLock(
                    currentAnalysis,
                    manualOverrides,
                    {
                        productName,
                        category,
                        description: extraInstructions,
                        detectedProductData
                    }
                );

                setActiveObjectLock(builtLock);
                payload.object_lock = builtLock;

                systemPrompt += "\n" + getPrecisionObjectLockPrompt();
                if (builtLock && builtLock.object_lock_prompt_en) {
                    systemPrompt += `\n\n=== STRICT OBJECT LOCK GUIDELINE ===\nUse the following product object lock rules for strict product consistency:\n${builtLock.object_lock_prompt_en}\n`;
                }
            }

            // Target IA Economy - Strip other structure definitions and instruct Gemini to only generate the chosen one
            if (modelStructureSource === 'veo') {
                systemPrompt = systemPrompt
                    .replace(/"sora_structure":\s*\[[\s\S]*?\],?/g, '"sora_structure": []')
                    .replace(/"grok_structure":\s*\[[\s\S]*?\],?/g, '"grok_structure": []');
                systemPrompt += "\nCRITICAL ECONOMY RULE: You MUST ONLY generate the detailed scenes for 'veo_structure' inside your JSON output. Keep 'sora_structure' and 'grok_structure' as empty arrays [] to minimize token usage.";
            } else if (modelStructureSource === 'sora') {
                systemPrompt = systemPrompt
                    .replace(/"veo_structure":\s*\[[\s\S]*?\],?/g, '"veo_structure": []')
                    .replace(/"grok_structure":\s*\[[\s\S]*?\],?/g, '"grok_structure": []');
                systemPrompt += "\nCRITICAL ECONOMY RULE: You MUST ONLY generate the detailed scenes for 'sora_structure' inside your JSON output. Keep 'veo_structure' and 'grok_structure' as empty arrays [] to minimize token usage.";
            } else if (modelStructureSource === 'grok') {
                systemPrompt = systemPrompt
                    .replace(/"veo_structure":\s*\[[\s\S]*?\],?/g, '"veo_structure": []')
                    .replace(/"sora_structure":\s*\[[\s\S]*?\],?/g, '"sora_structure": []');
                systemPrompt += "\nCRITICAL ECONOMY RULE: You MUST ONLY generate the detailed scenes for 'grok_structure' inside your JSON output. Keep 'veo_structure' and 'sora_structure' as empty arrays [] to minimize token usage.";
            }

            const contents = [{ parts: [{ text: systemPrompt }] }];
            let aiData: any = null;

            try {
                // Call standard Worker proxy
                aiData = await processGeminiAPI(currentKey, {
                    contents,
                    generationConfig: { 
                        responseMimeType: "application/json"
                    },
                    ...payload
                });
            } catch (error: any) {
                console.error("=== WORKER/API COMMUNICATION ERROR ===", error);
                console.log("=== GENERATION INPUT PAYLOAD ===", payload);
                setErrorMsg("Falha na comunicação com o Worker. Verifique o Proxy Online.");
                
                // Fallback to minimal generation package in case of API/Worker failures
                const fallbackDialog = `Apresentador UGC: "Gente, vocês não têm noção do poder do ${productName}! Ele é perfeito para o seu dia a dia. Praticidade incrível, alta qualidade e o melhor custo-benefício do mercado! Quem comprou, amou."`;
                const fallbackResult = {
                    creator_prompt: `RESULTADO DA DIREÇÃO (MÍNIMO DE RESGATE)\n\nVISUAL_PROMPT_EN\nCreate a high-converting TikTok Shop product video for ${productName}, using a realistic UGC-style presenter, fast hook, product demonstration, benefit-driven explanation, and direct CTA.\n\nVOICE_DESCRIPTION_EN\nNatural Brazilian Portuguese UGC creator voice, persuasive, clear, energetic, trustworthy.\n\nDIALOGUE_PT_BR\n${fallbackDialog}\n\nCTA_PT_BR\n"Confira no carrinho laranja."\n\nNEGATIVE_PROMPT\nDo not show a different product, do not invent false claims, do not display misleading features.`,
                    tiktok_caption: `#shorts #${productName.replace(/\s+/g, '')} #ugc #review`,
                    platform_adaptation_report: {
                        platform_selected: platform,
                        recommended_duration: "15s-30s",
                        voice_style: "UGC Persuasivo",
                        recommended_pacing: "Rápido / Dinâmico",
                        hook_strategy: "Segurar a atenção do usuário nos primeiros 3 segundos mostrando o produto em ação imediata.",
                        cta_strategy: "Instruir o usuário a clicar no carrinho laranja abaixo."
                    },
                    veo_structure: [
                        {
                            block_id: 1,
                            scene_name: "HOOK",
                            estimated_time: "5s",
                            visual_prompt_en: `Realistic UGC presenter holding ${productName}, expressive face, looking at camera, high detail, high-converting TikTok Shop style.`,
                            voice_description_en: `Natural Brazilian Portuguese UGC creator voice, persuasive, clear, energetic, trustworthy.`,
                            dialogue_pt_br: `Gente, vocês não têm noção do poder do ${productName}!`
                        },
                        {
                            block_id: 2,
                            scene_name: "PROMPT",
                            estimated_time: "10s",
                            visual_prompt_en: `Product demonstration of ${productName} showing high-quality texture and practical use.`,
                            voice_description_en: `Persuasive tone explaining main benefits and quality specs.`,
                            dialogue_pt_br: `Ele é perfeito para o seu dia a dia. Praticidade incrível!`
                        },
                        {
                            block_id: 3,
                            scene_name: "CTA",
                            estimated_time: "5s",
                            visual_prompt_en: `UGC presenter pointing down, finger gesture towards where the orange cart would be in TikTok Shop.`,
                            voice_description_en: `Energetic call to action.`,
                            dialogue_pt_br: `Confira no carrinho laranja.`
                        }
                    ],
                    sora_structure: [],
                    grok_structure: [],
                    character_locks: []
                };

                setResult(fallbackResult);
                const fallbackSnap = buildFinalPromptStructureSnapshot(fallbackResult, null, activeTab, modelStructureSource, activeObjectLock);
                if (fallbackSnap) setFinalPromptStructure(fallbackSnap);
                setDebugData({
                    payload,
                    creativeMode,
                    platform,
                    hasProductImage: !!productImage,
                    hasVideoReference: !!refVideo,
                    hasMoodboard: !!refImage,
                    hasAvatar: !!avatarImage,
                    rawAIResponse: null,
                    parsingError: error.message || "Worker/API failure"
                });
                setLoading(false);
                return;
            }

            console.log("Creative Director AI Normalized Response Payload:", aiData);

            if (!aiData) {
                throw new Error("A IA retornou uma resposta nula.");
            }

            setWorkerInfo({
                request_id: aiData.request_id || null,
                mode: aiData.mode || null,
                ok: aiData.ok,
                partial: aiData.partial,
                warnings: aiData.warnings || []
            });

            let rawText = aiData.raw_text || "";
            let parsed = aiData.data;

            // Handle partial success
            if (aiData.partial) {
                setAmberWarning("⚠️ Resultado parcial gerado. Alguns blocos podem estar incompletos.");
            }

            // Handle warnings list from worker
            if (aiData.warnings && aiData.warnings.length > 0) {
                const warningsStr = aiData.warnings.join("\n");
                setAmberWarning((prev) => prev ? prev + "\n" + warningsStr : warningsStr);
            }

            // Check if ok is false
            if (!aiData.ok) {
                const isFallbackAllowed = aiData.raw?.fallback_allowed;
                if (isFallbackAllowed && (parsed || rawText)) {
                    setAmberWarning(`⚠️ Geração de prompts falhou no servidor ou retornou recusa: ${aiData.errorMessage || "Recusa de conteúdo"}. Usando estrutura básica de contingência.`);
                } else {
                    setErrorMsg(aiData.errorMessage || "A geração dos prompts falhou.");
                    setDebugData({
                        payload,
                        creativeMode,
                        platform,
                        hasProductImage: !!productImage,
                        hasVideoReference: !!refVideo,
                        hasMoodboard: !!refImage,
                        hasAvatar: !!avatarImage,
                        rawAIResponse: rawText,
                        parsingError: aiData.errorMessage || "Ok is false and no fallback allowed",
                        request_id: aiData.request_id,
                        mode: aiData.mode,
                        ok: aiData.ok,
                        partial: aiData.partial,
                        warnings: aiData.warnings,
                        raw: aiData.raw
                    });
                    setLoading(false);
                    return;
                }
            }

            if (typeof parsed === 'string') {
                try {
                    parsed = safeJSONParse(parsed, null);
                } catch (e) {}
            }

            if (!parsed && rawText) {
                try {
                    parsed = safeJSONParse(rawText, null);
                } catch (e) {}
            }

            if (parsed && typeof parsed === 'object' && parsed.data && typeof parsed.data === 'object') {
                parsed = parsed.data;
            }

            // Minimal dynamic fallback generator if no parsing or text was usable
            if (!parsed && !rawText) {
                const fallbackDialog = `Apresentador UGC: "Gente, você precisa conhecer o ${productName}! Ele é ideal para quem quer praticidade e os melhores resultados. Clique abaixo e garanta o seu na promoção de hoje!"`;
                parsed = {
                    creator_prompt: `RESULTADO DA DIREÇÃO (PLANO DE CONTINGÊNCIA)\n\nVISUAL_PROMPT_EN\nCreate a high-converting video for ${productName} on ${platform}, using a realistic UGC-style presenter, fast hook, product demonstration, benefit-driven explanation, and direct CTA.\n\nVOICE_DESCRIPTION_EN\nNatural Brazilian Portuguese voice, persuasive, clear, energetic, trustworthy.\n\nDIALOGUE_PT_BR\n${fallbackDialog}\n\nCTA_PT_BR\n"Clique para conferir as ofertas."\n\nNEGATIVE_PROMPT\nDo not show a different product, do not invent false claims, do not display misleading features.`,
                    tiktok_caption: `#video #${productName.replace(/\s+/g, '')} #review`,
                    platform_adaptation_report: {
                        platform_selected: platform,
                        recommended_duration: "30s",
                        voice_style: "UGC Persuasivo",
                        recommended_pacing: "Dinâmico",
                        hook_strategy: "Gatilho mental de facilidade extrema nos primeiros 3 segundos.",
                        cta_strategy: "Direcionar ao link de compra oficial."
                    },
                    veo_structure: [
                        {
                            block_id: 1,
                            scene_name: "HOOK",
                            estimated_time: "5s",
                            visual_prompt_en: `Realistic presenter showcasing ${productName} with high enthusiasm.`,
                            voice_description_en: `Natural energetic Brazilian Portuguese voice.`,
                            dialogue_pt_br: `Gente, você precisa conhecer o ${productName}!`
                        },
                        {
                            block_id: 2,
                            scene_name: "PROVA",
                            estimated_time: "15s",
                            visual_prompt_en: `Close up demonstrating benefits of ${productName}.`,
                            voice_description_en: `Conversational explanations.`,
                            dialogue_pt_br: `Ele é ideal para quem quer praticidade e os melhores resultados.`
                        },
                        {
                            block_id: 3,
                            scene_name: "CTA",
                            estimated_time: "10s",
                            visual_prompt_en: `UGC presenter smiling, showing screen click motion.`,
                            voice_description_en: `Clear urgent call to action.`,
                            dialogue_pt_br: `Clique abaixo e garanta o seu na promoção de hoje!`
                        }
                    ],
                    sora_structure: [],
                    grok_structure: [],
                    character_locks: []
                };
            }

            if (parsed) {
                if (payload.object_lock) {
                    parsed.object_lock = payload.object_lock;
                } else if (activeObjectLock) {
                    parsed.object_lock = activeObjectLock;
                }

                // If veo_structure was named differently by model (e.g. scenes or scene_blocks)
                if (!parsed.veo_structure && Array.isArray(parsed.scenes)) {
                    parsed.veo_structure = parsed.scenes;
                } else if (!parsed.veo_structure && Array.isArray(parsed.scene_blocks)) {
                    parsed.veo_structure = parsed.scene_blocks;
                }
            }

            const hasValidContent = parsed && typeof parsed === 'object' && (
                Boolean(parsed.creator_prompt) ||
                (Array.isArray(parsed.veo_structure) && parsed.veo_structure.length > 0) ||
                (Array.isArray(parsed.sora_structure) && parsed.sora_structure.length > 0) ||
                (Array.isArray(parsed.grok_structure) && parsed.grok_structure.length > 0)
            );

            if (!parsed || !hasValidContent) {
                const parseErrorMsg = !parsed
                    ? "A resposta da IA não pôde ser convertida em formato estruturado."
                    : "A resposta da IA não contém os campos esperados de roteiro ou cenas.";
                console.warn("=== PROMPT PROCESSING NOTICE ===", parseErrorMsg, { parsed, rawText });
                console.log("=== GENERATION INPUT PAYLOAD ===", payload);

                setErrorMsg("A resposta foi gerada, mas não pôde ser estruturada automaticamente. Veja a resposta bruta abaixo.");

                // Structured fallback container wrapper so standard panels still display gracefully
                parsed = {
                    creator_prompt: `RESULTADO DA DIREÇÃO\n\n${rawText || 'Sem conteúdo bruto retornado.'}`,
                    tiktok_caption: `#${productName.replace(/\s+/g, '')} #review`,
                    platform_adaptation_report: {
                        platform_selected: platform,
                        recommended_duration: "30s",
                        voice_style: voiceStyle,
                        recommended_pacing: "Dinâmico",
                        hook_strategy: "Gatilho de curiosidade instantâneo nos primeiros segundos.",
                        cta_strategy: "CTA direcionado para conversão imediata."
                    },
                    veo_structure: [
                        {
                            block_id: 1,
                            scene_name: "SCENE 1",
                            estimated_time: "15s",
                            visual_prompt_en: `Visual instructions for ${productName} (raw text fallback)`,
                            voice_description_en: `Natural voice customized for ${platform}`,
                            dialogue_pt_br: `Confira todos os detalhes na resposta bruta.`
                        }
                    ],
                    sora_structure: [],
                    grok_structure: [],
                    character_locks: []
                };

                setResult(parsed);
                const fallbackParsedSnap = buildFinalPromptStructureSnapshot(parsed, null, activeTab, modelStructureSource, activeObjectLock);
                if (fallbackParsedSnap) setFinalPromptStructure(fallbackParsedSnap);
                setDebugData({
                    payload,
                    creativeMode,
                    platform,
                    hasProductImage: !!productImage,
                    hasVideoReference: !!refVideo,
                    hasMoodboard: !!refImage,
                    hasAvatar: !!avatarImage,
                    rawAIResponse: rawText,
                    parsingError: parseErrorMsg || "Response lacks creator_prompt or structure keys",
                    request_id: aiData.request_id,
                    mode: aiData.mode,
                    ok: aiData.ok,
                    partial: aiData.partial,
                    warnings: aiData.warnings,
                    raw: aiData.raw
                });
            } else {
                setResult(parsed);
                const parsedSnap = buildFinalPromptStructureSnapshot(parsed, null, activeTab, modelStructureSource, activeObjectLock);
                if (parsedSnap) setFinalPromptStructure(parsedSnap);
                // Save to history
                const historyText = `Produto: ${productName}\nVisual: ${visualStyle}\n\n=== CREATOR PROMPT ===\n${parsed.creator_prompt || ''}\n\n=== CAPTION ===\n${parsed.tiktok_caption || ''}`;
                saveToHistory("Creative Director AI", productName, historyText);

                setDebugData({
                    payload,
                    creativeMode,
                    platform,
                    hasProductImage: !!productImage,
                    hasVideoReference: !!refVideo,
                    hasMoodboard: !!refImage,
                    hasAvatar: !!avatarImage,
                    rawAIResponse: rawText,
                    parsingError: null,
                    request_id: aiData.request_id,
                    mode: aiData.mode,
                    ok: aiData.ok,
                    partial: aiData.partial,
                    warnings: aiData.warnings,
                    raw: aiData.raw
                });
            }

        } catch (err: any) {
            const errorDetails = err?.message || String(err || "Erro desconhecido");
            console.error("=== PROMPT PROCESSING ERROR ===", errorDetails);
            console.log("=== GENERATION INPUT PAYLOAD ===", payload);
            setErrorMsg("Erro interno ao preparar o roteiro. Veja o painel de debug.");
            
            setDebugData({
                payload,
                creativeMode,
                platform,
                hasProductImage: !!productImage,
                hasVideoReference: !!refVideo,
                hasMoodboard: !!refImage,
                hasAvatar: !!avatarImage,
                rawAIResponse: null,
                parsingError: errorDetails
            });
        } finally {
            setLoading(false);
        }
    };

    // Copy handlers
    const handleCopyUgcStrategy = () => {
        if (!result?.production_strategy) return;
        const s = result.production_strategy;
        const text = `ESTRATÉGIA DE PRODUÇÃO (UGC TIKTOK SHOP)\n\n` +
            `Formato Escolhido: ${s.chosen_format}\n` +
            `Motivo da Escolha: ${s.reason_for_choice}\n` +
            `Gancho Principal: ${s.main_hook}\n` +
            `Gatilhos Mentais: ${(s.mental_triggers || []).join(', ')}\n\n` +
            `Estratégia de Conversão:\n` +
            `- Cena 1: ${s.conversion_strategy?.scene_1 || ''}\n` +
            `- Cena 2: ${s.conversion_strategy?.scene_2 || ''}\n` +
            `- Cena 3: ${s.conversion_strategy?.scene_3 || ''}`;
        copyToClipboard(text).then(ok => ok && alert("Estratégia de Produção copiada!"));
    };

    const handleCopyUgcScenes = () => {
        if (!result?.scene_scripts) return;
        const scenes = result.scene_scripts;
        const text = scenes.map((sc: any) => 
            `CENA ${sc.scene_id} (${sc.duration_seconds}s)\n` +
            `Objetivo: ${sc.objective}\n` +
            `Formato: ${sc.format}\n` +
            `Estratégia: ${sc.strategy}\n` +
            `Gatilho: ${sc.trigger}\n` +
            `Descrição da Cena: ${sc.scene_description}\n` +
            `Ação: ${sc.action}\n` +
            `Script PT-BR (${sc.script_pt_br?.length || 0} chars):\n"${sc.script_pt_br}"`
        ).join('\n\n----------------------------------------\n\n');
        copyToClipboard(`ROTEIRO COMPLETO DAS CENAS (UGC TIKTOK SHOP)\n\n${text}`).then(ok => ok && alert("Roteiro das Cenas copiado!"));
    };

    const handleCopyUgcValidation = () => {
        if (!result?.final_validation) return;
        const v = result.final_validation;
        const text = `VALIDAÇÃO FINAL (UGC TIKTOK SHOP)\n\n` +
            `Sensação UGC: ${v.ugc_feeling}\n` +
            `Continuidade: ${v.continuity}\n` +
            `Qualidade da Copy: ${v.copy_quality}\n` +
            `Foco no Produto: ${v.product_focus}\n` +
            `Fluxo de Conversão: ${v.conversion_flow}\n` +
            `Avisos: ${(v.warnings || []).length > 0 ? v.warnings.join(', ') : 'Nenhum'}`;
        copyToClipboard(text).then(ok => ok && alert("Validação Final copiada!"));
    };

    const handleCopyUgcFullProduction = () => {
        if (!result) return;
        const strategyText = result.production_strategy ? (
            `=== ESTRATÉGIA DE PRODUÇÃO ===\n` +
            `Formato Escolhido: ${result.production_strategy.chosen_format}\n` +
            `Motivo: ${result.production_strategy.reason_for_choice}\n` +
            `Gancho Principal: ${result.production_strategy.main_hook}\n` +
            `Gatilhos Mentais: ${(result.production_strategy.mental_triggers || []).join(', ')}\n\n`
        ) : '';

        const scenesText = Array.isArray(result.scene_scripts) ? (
            `=== ROTEIRO COMPLETO DAS CENAS ===\n` +
            result.scene_scripts.map((sc: any) => 
                `[CENA ${sc.scene_id} - ${sc.duration_seconds}s]\n` +
                `Objetivo: ${sc.objective}\n` +
                `Formato: ${sc.format}\n` +
                `Estratégia: ${sc.strategy}\n` +
                `Gatilho: ${sc.trigger}\n` +
                `Descrição da Cena: ${sc.scene_description}\n` +
                `Ação: ${sc.action}\n` +
                `Script: "${sc.script_pt_br}" (${sc.script_pt_br?.length || 0} chars)`
            ).join('\n\n') + '\n\n'
        ) : '';

        const validationText = result.final_validation ? (
            `=== VALIDAÇÃO FINAL ===\n` +
            `Sensação UGC: ${result.final_validation.ugc_feeling}\n` +
            `Continuidade: ${result.final_validation.continuity}\n` +
            `Qualidade da Copy: ${result.final_validation.copy_quality}\n` +
            `Foco no Produto: ${result.final_validation.product_focus}\n` +
            `Fluxo de Conversão: ${result.final_validation.conversion_flow}`
        ) : '';

        const fullText = `PRODUÇÃO COMPLETA UGC TIKTOK SHOP\nProduto: ${productName}\n\n${strategyText}${scenesText}${validationText}`;
        copyToClipboard(fullText).then(ok => ok && alert("Produção Completa copiada!"));
    };

    const handleCopyUgcJson = () => {
        if (!result) return;
        copyToClipboard(JSON.stringify(result, null, 2)).then(ok => ok && alert("JSON da Produção copiado!"));
    };

    const handleCopyAll = () => {
        if (!result) return;
        const text = `CREATIVE DIRECTOR AI PROMPT\n\nPRODUTO: ${productName}\n\n${result.creator_prompt || ''}\n\nTiktok Caption:\n${result.tiktok_caption || ''}`;
        copyToClipboard(text).then(ok => ok && alert("Diretrizes de prompt copiadas!"));
    };

    const getSceneTitle = (idx: number, optName?: string) => {
        const SCENE_TYPES = ["HOOK", "DEMO", "PROOF", "CTA"];
        if (idx < 4) return SCENE_TYPES[idx];
        return optName ? optName.toUpperCase() : "DEMO";
    };

    const getActiveBlocks = () => {
        if (!result) return [];
        if (activeTab === 'veo') return result.veo_structure || [];
        if (activeTab === 'sora') return result.sora_structure || [];
        if (activeTab === 'grok') return result.grok_structure || [];
        return result.veo_structure || [];
    };

    const getActiveStructureKey = (): 'veo' | 'sora' | 'grok' => {
        if (activeTab === 'sora') return 'sora';
        if (activeTab === 'grok') return 'grok';
        if (activeTab === 'scene_blocks') return modelStructureSource;
        return 'veo';
    };

    const getActiveStructureBlocks = () => {
        if (!result) return [];
        const key = getActiveStructureKey();
        if (key === 'veo') return result.veo_structure || [];
        if (key === 'sora') return result.sora_structure || [];
        if (key === 'grok') return result.grok_structure || [];
        return [];
    };

    const formatSceneText = (block: any, idx: number) => {
        const title = block.scene_name ? block.scene_name.toUpperCase() : getSceneTitle(idx);
        const visual = block.visual_prompt_en || block.visual_context_en || block.visual_prompt || '';
        const voice = block.voice_description_en || '';
        const dialogue = block.dialogue_pt_br || block.dialogue_pt || block.text || '';
        
        let extra = '';
        if (block.character_profiles_en) {
            const charStr = typeof block.character_profiles_en === 'object' ? JSON.stringify(block.character_profiles_en, null, 2) : block.character_profiles_en;
            extra += `\n\nCHARACTER_PROFILES_EN\n\n${charStr}`;
        }
        if (block.character_lock_en) {
            extra += `\n\nCHARACTER_LOCK_EN\n\n${block.character_lock_en}`;
        }
        if (block.speaker_timing) {
            extra += `\n\nSPEAKER_TIMING\n\n${block.speaker_timing}`;
        }
        if (block.reaction_directions_en || block.reaction_directions) {
            extra += `\n\nREACTION_DIRECTIONS_EN\n\n${block.reaction_directions_en || block.reaction_directions}`;
        }

        return `SCENE ${idx + 1} — ${title}\n\nVISUAL_PROMPT_EN\n\n${visual}\n\nVOICE_DESCRIPTION_EN\n\n${voice}\n\nDIALOGUE_PT_BR\n\n${dialogue}${extra}`;
    };

    const handleCopyAllScenes = () => {
        const blocks = getActiveStructureBlocks();
        if (blocks.length === 0) return;
        const text = blocks.map((block: any, idx: number) => formatSceneText(block, idx)).join('\n\n\n');
        copyToClipboard(text).then(ok => ok && alert("Copy All Scenes: Concluído!"));
    };

    const handleCopyAllVisualPrompts = () => {
        const blocks = getActiveStructureBlocks();
        if (blocks.length === 0) return;
        const text = blocks.map((block: any) => block.visual_prompt_en || block.visual_context_en || block.visual_prompt || '').join('\n\n');
        copyToClipboard(text).then(ok => ok && alert("Copy All Visual Prompts EN: Concluído!"));
    };

    const handleCopyAllDialogues = () => {
        const blocks = getActiveStructureBlocks();
        if (blocks.length === 0) return;
        const text = blocks.map((block: any) => block.dialogue_pt_br || block.dialogue_pt || block.text || '').join('\n\n');
        copyToClipboard(text).then(ok => ok && alert("Copy All Dialogue PT-BR: Concluído!"));
    };

    const handleCopyJSON = () => {
        if (!result) return;
        copyToClipboard(JSON.stringify(result, null, 2)).then(ok => ok && alert("Copy JSON: Concluído!"));
    };

    // Task 9 Copy Buttons
    const handleCopyObjectLock = () => {
        const lock: CreativeDirectorObjectLock | null = activeObjectLock || result?.object_lock;
        if (!lock) return;
        const sourceText = lock.source === 'image_analysis' 
            ? 'Análise da Imagem do Produto' 
            : lock.source === 'manual' 
            ? 'Configuração Manual' 
            : 'Descrição do Produto';

        const text = `TRAVA DE OBJETO DO PRODUTO
Fonte: ${sourceText}
Identidade Visual: ${lock.product_identity || 'N/A'}
Frente: ${lock.front_view || 'N/A'}
Lateral: ${lock.side_view || 'N/A'}
Traseira: ${lock.back_view || 'N/A'}
Topo: ${lock.top_view || 'N/A'}
Cores e Acabamento: ${lock.colors_and_finish || 'N/A'}
Materiais e Textura: ${lock.material_and_texture || 'N/A'}
Logos e Textos: ${lock.logos_and_text || 'N/A'}
Embalagem: ${lock.packaging || 'N/A'}
Não Alterar: ${Array.isArray(lock.do_not_change) ? lock.do_not_change.join(', ') : lock.do_not_change || 'N/A'}
Movimento Permitido: ${Array.isArray(lock.allowed_motion) ? lock.allowed_motion.join(', ') : lock.allowed_motion || 'N/A'}
Regras de Consistência: ${lock.angle_consistency_rules || 'N/A'}`;

        copyToClipboard(text).then(ok => ok && alert("Copiar Trava de Objeto: Concluído!"));
    };

    const handleCopyLockPrompt = () => {
        const lock: CreativeDirectorObjectLock | null = activeObjectLock || result?.object_lock;
        if (!lock?.object_lock_prompt_en) return;
        copyToClipboard(lock.object_lock_prompt_en).then(ok => ok && alert("Copiar Prompt de Trava: Concluído!"));
    };

    const handleCopyBriefWithLock = () => {
        if (!result) return;
        const lock: CreativeDirectorObjectLock | null = activeObjectLock || result?.object_lock;
        const lockText = lock ? `\n=== TRAVA DE OBJETO ===\nIdentidade: ${lock.product_identity}\nFrente: ${lock.front_view}\nCores: ${lock.colors_and_finish}\nMateriais: ${lock.material_and_texture}\nLogos: ${lock.logos_and_text}\nPrompt de Trava (EN): ${lock.object_lock_prompt_en}\n` : '';

        const fullBrief = `BRIEF DE DIREÇÃO CRIATIVA\n\nPRODUTO: ${productName}\nCATEGORIA: ${category}\nPLATAFORMA: ${platform}\n${lockText}\nPROMPT CRIADOR:\n${result.creator_prompt || ''}\n\nLEGENDA TIKTOK:\n${result.tiktok_caption || ''}`;

        copyToClipboard(fullBrief).then(ok => ok && alert("Copiar Brief com Trava: Concluído!"));
    };

    const renderSceneCard = (block: any, idx: number) => {
        const title = block.scene_name ? block.scene_name.toUpperCase() : getSceneTitle(idx);
        const visualText = block.visual_prompt_en || block.visual_context_en || block.visual_prompt || '';
        const voiceText = block.voice_description_en || '';
        const dialogueText = block.dialogue_pt_br || block.dialogue_pt || block.text || '';
        
        // Novel / Character properties
        const charProfilesText = block.character_profiles_en ? (typeof block.character_profiles_en === 'object' ? JSON.stringify(block.character_profiles_en, null, 2) : block.character_profiles_en) : '';
        const charLockText = block.character_lock_en || '';
        const speakerTimingText = block.speaker_timing || '';
        const reactionDirectionsText = block.reaction_directions_en || block.reaction_directions || '';

        const copyScene = () => {
            const text = formatSceneText(block, idx);
            copyToClipboard(text).then(ok => ok && alert(`Cena ${idx + 1} copiada!`));
        };
        const copyVisual = () => {
            copyToClipboard(visualText).then(ok => ok && alert("Copy Visual Prompt EN: Concluído!"));
        };
        const copyVoice = () => {
            copyToClipboard(voiceText).then(ok => ok && alert("Copy Voice Description EN: Concluído!"));
        };
        const copyDialogue = () => {
            copyToClipboard(dialogueText).then(ok => ok && alert("Copy Dialogue PT-BR: Concluído!"));
        };
        const copyCharProfiles = () => {
            copyToClipboard(charProfilesText).then(ok => ok && alert("Copy Character Profiles: Concluído!"));
        };
        const copySpeakerTiming = () => {
            copyToClipboard(speakerTimingText).then(ok => ok && alert("Copy Speaker Timing: Concluído!"));
        };
        const copyReactions = () => {
            copyToClipboard(reactionDirectionsText).then(ok => ok && alert("Copy Reaction Directions: Concluído!"));
        };

        return (
            <div key={idx} className="bg-slate-900/40 p-4 border border-slate-800 rounded-xl space-y-4 hover:border-slate-700 transition">
                <div className="flex justify-between items-center border-b border-slate-800/60 pb-2">
                    <span className="text-indigo-400 font-bold text-xs uppercase tracking-wider font-sans">Cena {idx + 1} — {title}</span>
                    <span className="text-[9px] font-mono text-slate-500">{block.estimated_time || block.duration || 'Auto'}</span>
                </div>

                <div className="space-y-3 font-mono">
                    <div className="bg-black/40 p-3 rounded-lg border border-slate-850/80">
                        <span className="text-[9px] uppercase tracking-wider text-rose-455 font-bold block mb-1">VISUAL_PROMPT_EN</span>
                        <p className="text-xs text-slate-300 italic leading-relaxed font-sans">{visualText || '...'}</p>
                    </div>

                    {charProfilesText && (
                        <div className="bg-black/40 p-3 rounded-lg border border-slate-850/80 animate-fade-in">
                            <span className="text-[9px] uppercase tracking-wider text-indigo-400 font-bold block mb-1">CHARACTER_PROFILES_EN</span>
                            <pre className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed font-mono">{charProfilesText}</pre>
                        </div>
                    )}

                    {charLockText && (
                        <div className="bg-black/40 p-3 rounded-lg border border-slate-850/80 animate-fade-in">
                            <span className="text-[9px] uppercase tracking-wider text-teal-400 font-bold block mb-1">CHARACTER_LOCK_EN</span>
                            <p className="text-xs text-slate-300 italic leading-relaxed font-sans">{charLockText}</p>
                        </div>
                    )}

                    {speakerTimingText && (
                        <div className="bg-black/40 p-3 rounded-lg border border-slate-850/80 animate-fade-in">
                            <span className="text-[9px] uppercase tracking-wider text-purple-400 font-bold block mb-1">SPEAKER_TIMING</span>
                            <p className="text-xs text-slate-300 leading-relaxed font-sans">{speakerTimingText}</p>
                        </div>
                    )}

                    <div className="bg-black/40 p-3 rounded-lg border border-slate-850/80">
                        <span className="text-[9px] uppercase tracking-wider text-amber-500 font-bold block mb-1">VOICE_DESCRIPTION_EN</span>
                        <p className="text-xs text-slate-300 italic leading-relaxed font-sans">{voiceText || '...'}</p>
                    </div>

                    <div className="bg-black/40 p-3 rounded-lg border border-slate-850/80">
                        <span className="text-[9px] uppercase tracking-wider text-emerald-400 font-bold block mb-1">DIALOGUE_PT_BR</span>
                        <p className="text-xs text-indigo-300 font-semibold leading-relaxed font-sans">"{dialogueText || '...'}"</p>
                    </div>

                    {reactionDirectionsText && (
                        <div className="bg-black/40 p-3 rounded-lg border border-slate-850/80 animate-fade-in">
                            <span className="text-[9px] uppercase tracking-wider text-blue-400 font-bold block mb-1">REACTION_DIRECTIONS_EN</span>
                            <p className="text-xs text-slate-300 italic leading-relaxed font-sans">{reactionDirectionsText}</p>
                        </div>
                    )}
                </div>

                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-800/60 text-[8px] font-bold font-mono">
                    <button onClick={copyScene} className="bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white py-1.5 px-2 rounded border border-slate-755 transition cursor-pointer flex justify-center items-center gap-1">
                        <LucideIcon name="copy" className="w-3 h-3 text-indigo-400" /> {creativeMode === 'novel' ? 'Copy Full Novela Scene' : 'Copy Full Scene'}
                    </button>
                    <button onClick={copyVisual} className="bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white py-1.5 px-2 rounded border border-slate-755 transition cursor-pointer flex justify-center items-center gap-1">
                        <LucideIcon name="image" className="w-3 h-3 text-blue-400" /> Copy Visual Prompt EN
                    </button>
                    {charProfilesText && (
                        <button onClick={copyCharProfiles} className="bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white py-1.5 px-2 rounded border border-slate-755 transition cursor-pointer flex justify-center items-center gap-1 animate-fade-in">
                            <LucideIcon name="users" className="w-3 h-3 text-indigo-400" /> {creativeMode === 'novel' ? 'Copy Character Profiles' : 'Copy Profiles EN'}
                        </button>
                    )}
                    {speakerTimingText && (
                        <button onClick={copySpeakerTiming} className="bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white py-1.5 px-2 rounded border border-slate-755 transition cursor-pointer flex justify-center items-center gap-1 animate-fade-in">
                            <LucideIcon name="clock" className="w-3 h-3 text-purple-400" /> Copy Speaker Timing
                        </button>
                    )}
                    <button onClick={copyVoice} className="bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white py-1.5 px-2 rounded border border-slate-755 transition cursor-pointer flex justify-center items-center gap-1">
                        <LucideIcon name="mic" className="w-3 h-3 text-pink-400" /> {creativeMode === 'novel' ? 'Copy Voice Descriptions' : 'Copy Voice Description EN'}
                    </button>
                    <button onClick={copyDialogue} className="bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white py-1.5 px-2 rounded border border-slate-755 transition cursor-pointer flex justify-center items-center gap-1">
                        <LucideIcon name="message-square" className="w-3 h-3 text-emerald-400" /> Copy Dialogue PT-BR
                    </button>
                    {reactionDirectionsText && (
                        <button onClick={copyReactions} className="bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white py-1.5 px-2 rounded border border-slate-755 transition cursor-pointer flex justify-center items-center gap-1 animate-fade-in">
                            <LucideIcon name="smile" className="w-3 h-3 text-blue-400" /> Copy Reactions EN
                        </button>
                    )}
                </div>
            </div>
        );
    };

    // --- CAMPAIGN BUILDER CORE LOGIC & ACTIONS ---
    const [cbCopyStatus, setCbCopyStatus] = useState<string | null>(null);

    const cbCopyToClipboardText = (text: string, label: string) => {
        copyToClipboard(text).then(ok => {
            if (ok) {
                setCbCopyStatus(`✓ ${label} copiado!`);
                setTimeout(() => setCbCopyStatus(null), 2500);
            }
        });
    };

    const handleAddImageToArray = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<string[]>>, isProduct: boolean = false) => {
        const files = e.target.files;
        if (files) {
            if (isProduct) {
                setProductAnalysisTriggerSource('product_upload');
            }
            Array.from(files).forEach(file => {
                const reader = new FileReader();
                reader.onload = () => {
                    setter(prev => [...prev, reader.result as string]);
                };
                reader.readAsDataURL(file as any);
            });
        }
    };

    const handleRemoveImageFromArray = (idx: number, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
        setter(prev => prev.filter((_, i) => i !== idx));
    };

    const handleCbClearInputs = () => {
        setCbProductImages([]);
        setCbProductName('');
        setCbProductCategory('👗 Roupas Femininas & Lingerie');
        setCbMainBenefit('');
        setCbMainPainSolved('');
        setCbPriceRange('');
        setCbUniqueDifferentiator('');
        setCbAvatarImage(null);
        setCbCreatorGender('Neutral / Not specified');
        setCbCreatorAgeStyle('Young Adult');
        setCbCreatorPersona('UGC Influencer Real');
        setCbSpeakingEnergy(70);
        setCbSpeakingPace('Normal');
        setCbScenarioImage(null);
        setCbScenarioDescription('');
        setCbBackgroundStrategy('Automatic');
        setCbRefVideo(null);
        setCbSocialProofImages([]);
        setCbPlatform('TikTok Shop');
        setCbNumScenes(4);
        setCbSecondsPerScene('8s');
        setCbCampaignStyle('UGC Influencer Real');
        setCbRemodelingIntensity(70);
        setCbProductLock(true);
        setCbResult(null);
        setCbErrorMsg(null);
    };

    const handleCbGenerate = async (variantType?: string) => {
        if (!cbProductName.trim()) {
            setCbErrorMsg("Por favor, preencha no mínimo o campo Nome do Produto.");
            return;
        }

        // Product mismatch warning validator
        const mismatch = checkProductMismatch();
        if (mismatch.hasMismatch && !mismatchBypassed) {
            setMismatchWarning(mismatch.msg);
            setCbLoading(false);
            return;
        }

        setCbLoading(true);
        setCbErrorMsg(null);

        try {
            const parts: any[] = [];
            let variantInstructions = "";
            if (variantType) {
                variantInstructions = `\nREGENERATE VARIANT DIRECTION: Please optimize and rewrite this campaign structure to favor being severely: "${variantType}". Adjust spoken dialogues, voice tone, action descriptions and hooks to reflect this focus, while strictly keeping same product identity, images and properties.`;
            }

            const promptText = `
SYSTEM ROLE:
You are an expert World-Class Creative Director, Conversion Intelligence Strategist for TikTok Shop / Reels / Shopee, and AI Video Workflow Architect.
Your task is to build a high-performance video campaign structure in Brazilian Portuguese from product raw assets, influencer profiles, reference video DNA and reviews.

This must be a complete campaign structure, not just a single prompt.

CAMPAIGN PARAMETERS:
- Destination Platform: ${cbPlatform}
- Number of Scenes requested: ${cbNumScenes}
- Scene Duration target: ${cbSecondsPerScene}
- Campaign Style Recipe: ${cbCampaignStyle}
- Background Surrounding Remodel level: ${cbRemodelingIntensity}%
- Product Lock Status: ${cbProductLock ? 'ENABLED' : 'DISABLED'}
${variantInstructions}

PRODUCT DATA:
- Name: ${cbProductName}
- Category: ${cbProductCategory}
- Core Benefit: ${cbMainBenefit || '(Deduce based on product name/images)'}
- Key Pain Solved: ${cbMainPainSolved || '(Deduce based on category/images)'}
- Price Range: ${cbPriceRange || '(Affordable / Competitive)'}
- Unique Differentiator: ${cbUniqueDifferentiator || '(Deduce smart premium value proposition)'}

AVATAR / CREATOR INFLUENCER SPEC:
- Gender: ${cbCreatorGender}
- Age style: ${cbCreatorAgeStyle}
- Creator Persona Archetype: ${cbCreatorPersona}
- Spoken Communication Energy: ${cbSpeakingEnergy}% (Apply exclamation marks, snappy pauses, high charm or expert authority)
- Spoken Cadence (Pace): ${cbSpeakingPace}

SCENARIO STRATEGY:
- Scenery Details: ${cbScenarioDescription || '(Deduce matching campaign theme)'}
- Background Strategy Mode: ${cbBackgroundStrategy}

REFERENCE VIDEO ANALYTICAL GOALS (If uploaded):
Extract and infer the following DNA to inspire the campaign rather than copying it:
- HOOK_DNA: Capture the same type of visual hook, pace, and initial frame trick
- VOICE_DNA: Capture the rhythm, pause pattern, and emotion progression
- VISUAL_DNA: Match the visual pacing, camera movement style (pan, dolly, close-up)
- EDITING_DNA: Adapt the sequence structure, font styles, overlays, text animation style
- CTA_DNA: Match the conversion trigger (link in bio, orange cart click, coupon urgency)

SOCIAL PROOF INPUTS:
Analyse image/text of buyer reviews to extract the following:
- review_summary: (Summary of positive customer experiences)
- trust_points: (Points proving authenticity)
- customer_objections: (Addressing hesitations directly)
- proof_phrases: (Quotes like 'This is life-changing', 'Best purchase ever')
- credibility_angle: (Why they should trust this over rivals)
- usable_dialogue_lines: (Short actual testimonial quotes to inject)

DIALOGUE RULES (CRITICAL):
Dialogue must sound like a natural, living, breathing Brazilian UGC companion, NOT a commercial presentation or announcer.
AVOID: "Apresentamos...", "Conheça este produto incrível...", "Este item foi desenvolvido para...", institutional jargon, or robotic sales copy.
PREFER: "Gente, olha isso...", "Eu vi esse aqui e achei muito bonito...", "Olha esse detalhe...", "Sério, isso muda muito o ambiente...", "Eu fui olhar as avaliações e entendi por que tanta gente está comprando...".
- Language must be adapted perfectly to Creator Gender: "${cbCreatorGender}", and Creator Persona "${cbCreatorPersona}".

VOICE_DESCRIPTION_EN RULES (CRITICAL):
Every scene must include VOICE_DESCRIPTION_EN.
Example: "Natural Brazilian Portuguese UGC influencer voice, direct-to-camera, authentic, conversational, warm, realistic, product recommendation style, not a formal presenter, not a commercial announcer. Gender: ${cbCreatorGender}, Persona: ${cbCreatorPersona}, Pace: ${cbSpeakingPace}, Speaking energy: ${cbSpeakingPace} or ${cbSpeakingEnergy}%."

PRODUCT LOCK RULE (CRITICAL):
Since Product Lock is ${cbProductLock ? 'ENABLED' : 'DISABLED'}, you MUST include this exact paragraph inside "product_lock_prompt_en" for ALL scenes:
"Keep the original product exactly identical to the uploaded product reference. Do not alter shape, color, material, texture, typography, text, logo, size, proportions, packaging, arrangement or product identity. Only the surrounding environment, camera movement, creator behavior and scene context may change. ${detectedProductData?.product_lock_prompt_en ? "Specific properties to maintain: " + detectedProductData.product_lock_prompt_en : ""}"

PLATFORM INTELLIGENCE PROTOCOLS:
- TikTok Shop: fast hook (first 2s), high energy, direct UGC recommendation, product proof, orange cart CTA reference ("carrinho laranja").
- Shopee Vídeo: price-driven, coupon codes focus, free shipping ("frete grátis") alerts, urgent product marked CTA.
- Mercado Livre: extreme trust triggers, safety guarantee, detailed specifications, full shipment speed highlights.
- Instagram Reels: aesthetic/lifestyle showcase, aspirational vibes, elegant layouts, softer direct-message / link in bio CTA.
- Facebook Reels: warm family / home storytelling, friendly advice, high empathy, relaxed pace.
- YouTube Shorts: high curiosity hook, rapid editing, watch-time loop trick (ensure final CTA naturally cycles back into first scene hook).

Return a strict, valid raw JSON object. Do not wrap code blocks in standard markdown ticks. Return ONLY structural text.

SCHEMA EXPECTED:
{
  "campaign_name": "String (Portuguese campaign campaign_name)",
  "product_angle": "String (Campaign conversion angle)",
  "hook_strategy": "String (Explanation of hook DNA used)",
  "platform_strategy": "String (Detailing how it fits ${cbPlatform})",
  "cta_strategy": "String (Explicit CTA trigger used)",
  "target_audience": "String (Niche description)",
  "estimated_duration": "String (E.g. ${cbNumScenes} scenes - ${cbSecondsPerScene})",
  "social_proof_usage": "String (Explanation of how social proof is used across scenes)",
  "product_lock_status": "Enabled" | "Disabled",
  "social_proof_dna": {
    "review_summary": "String",
    "trust_points": "String",
    "customer_objections": "String",
    "proof_phrases": "String",
    "credibility_angle": "String",
    "usable_dialogue_lines": "String"
  },
  "hook_dna": "String",
  "voice_dna": "String",
  "visual_dna": "String",
  "editing_dna": "String",
  "cta_dna": "String",
  "scenes": [
    {
      "scene_number": 1,
      "title": "String (e.g. HOOK, PROBLEM, VALUE, PROOF, CTA)",
      "visual_prompt_en": "String (Highly descriptive English visual prompt for video generation like Veo 3/Sora/Grok)",
      "action_prompt_en": "String (English detail of action occurring, camera moves, dollies or zooms)",
      "voice_description_en": "String (English vocal delivery guidance matching vocal rules)",
      "dialogue_pt_br": "String (Persuasive natural Brazilian spoken dialogue style)",
      "product_lock_prompt_en": "String (Include product lock English prompt here if enabled)",
      "social_proof_usage": "String (Details of how social proof review quotes or overlays are visualised, if used)"
    }
  ],
  "product_lock_prompt_en": "String (product lock rule prompt if enabled)"
}
`;

            let finalPromptText = promptText;
            if (objectLockEnabled) {
                finalPromptText += "\n" + getPrecisionObjectLockPrompt();
            }

            parts.push({ text: finalPromptText });

            // Attach product image if available
            if (cbProductImages && cbProductImages.length > 0) {
                const img = cbProductImages[0];
                if (img && typeof img === 'string') {
                    const commaIdx = img.indexOf(',');
                    if (commaIdx !== -1) {
                        const mime = img.substring(img.indexOf(':') + 1, img.indexOf(';'));
                        const b64 = img.substring(commaIdx + 1);
                        parts.push({ inlineData: { mimeType: mime, data: b64 } });
                    }
                }
            }

            // Attach social proof image if available
            if (cbSocialProofImages && cbSocialProofImages.length > 0) {
                const img = cbSocialProofImages[0];
                if (img && typeof img === 'string') {
                    const commaIdx = img.indexOf(',');
                    if (commaIdx !== -1) {
                        const mime = img.substring(img.indexOf(':') + 1, img.indexOf(';'));
                        const b64 = img.substring(commaIdx + 1);
                        parts.push({ inlineData: { mimeType: mime, data: b64 } });
                    }
                }
            }

            // Attach avatar image if available
            if (cbAvatarImage && typeof cbAvatarImage === 'string') {
                const commaIdx = cbAvatarImage.indexOf(',');
                if (commaIdx !== -1) {
                    const mime = cbAvatarImage.substring(cbAvatarImage.indexOf(':') + 1, cbAvatarImage.indexOf(';'));
                    const b64 = cbAvatarImage.substring(commaIdx + 1);
                    parts.push({ inlineData: { mimeType: mime, data: b64 } });
                }
            }

            // Attach scenario image if available
            if (cbScenarioImage && typeof cbScenarioImage === 'string') {
                const commaIdx = cbScenarioImage.indexOf(',');
                if (commaIdx !== -1) {
                    const mime = cbScenarioImage.substring(cbScenarioImage.indexOf(':') + 1, cbScenarioImage.indexOf(';'));
                    const b64 = cbScenarioImage.substring(commaIdx + 1);
                    parts.push({ inlineData: { mimeType: mime, data: b64 } });
                }
            }

            const payload = {
                contents: [{ parts }],
                generationConfig: {
                    responseMimeType: "application/json"
                },
                product_image: cbProductImages[0] || null,
                product_analysis: detectedProductData || null,
                product_dna: detectedProductData?.product_dna || null,
                product_lock_prompt_en: detectedProductData?.product_lock_prompt_en || null,
                product_accuracy_lock_enabled: true,
                // Precision Object Lock parameters
                object_lock_enabled: objectLockEnabled,
                object_lock_level: objectLockLevel,
                locked_attributes: {
                    brand: olBrand || "",
                    product_name: olProductName || "",
                    primary_color: olPrimaryColor || "",
                    secondary_color: olSecondaryColor || "",
                    material: olMaterial || "",
                    shape: olShape || "",
                    logo: olLogoDescription || "",
                    features: olUniqueFeatures ? olUniqueFeatures.split(',').map(s => s.trim()).filter(Boolean) : []
                }
            };

            setGenerationDiagnostics(null); // Reset diagnostics on new generation run

            const targetUrl = workerUrl.trim();
            if (!targetUrl) {
                const errMsg = "Falha de validação: WORKER_URL não está configurada.";
                setCbErrorMsg(errMsg);
                setGenerationDiagnostics({
                    endpoint: "Vazio",
                    route: "POST /",
                    status: "Proxy Offline",
                    possibleCause: "A URL do Worker não foi preenchida ou está incorreta.",
                    recommendedAction: "Preencha a URL nas configurações do Worker à esquerda e teste a conexão."
                });
                throw new Error(errMsg);
            }

            if (!clientToken.trim()) {
                const errMsg = "Falha de validação: CLIENT_TOKEN é obrigatório.";
                setCbErrorMsg(errMsg);
                setGenerationDiagnostics({
                    endpoint: targetUrl,
                    route: "POST /",
                    status: "Token Inválido",
                    possibleCause: "Nenhum chave secreta ou token do cliente (X-Client-Token) foi configurado para a autenticação.",
                    recommendedAction: "Preencha o Token de acesso secreto no painel de controle e clique em Testar."
                });
                throw new Error(errMsg);
            }

            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
                console.warn("Time limit exceeded for campaign builder");
                controller.abort();
            }, 180000); // 3-minute timeout

            if (isDebugMode) {
                console.log("=== INICIANDO CONEXÃO DE GERAÇÃO COM WORKER ===");
                console.log("URL de Destino:", targetUrl);
                console.log("Headers Permitidos: Content-Type: application/json, X-Client-Token: ***", clientToken.trim() ? clientToken.trim().slice(-4) : "Vazio");
                console.log("Payload Enviado:", { ...payload, contents: "[...]" });
            }

            let rawJSON: any = null;
            let responseStatus = 200;
            try {
                const response = await postToWorker<any>('/', payload, {
                    moduleName: "Diretor Criativo Campanha",
                    workerUrl: targetUrl,
                    clientToken: clientToken
                });

                if (response.ok) {
                    rawJSON = response.raw;
                } else {
                    let errorTitle = "Proxy Offline";
                    let cause = `O Worker retornou uma falha ou erro de rede.`;
                    let action = "Analise o log bruto de erro retornado para identificar inconformidades.";
                    responseStatus = response.status || 500;

                    if (responseStatus === 401) {
                        errorTitle = "Token Inválido";
                        cause = "O cabeçalho 'X-Client-Token' enviado na requisição de geração foi explicitamente rejeitado pelo Worker (HTTP 401 Unauthorized).";
                        action = "Revise e redigite a sua chave/token nas configurações de conectividade à esquerda.";
                    } else if (responseStatus === 404) {
                        errorTitle = "Rota Inexistente";
                        cause = "O endpoint foi alcançado, mas a rota principal de IA respondeu com HTTP 404 Not Found.";
                        action = "Confirme a estrutura de sub-rotas da URL do Worker ou reinstale o script do Worker.";
                    } else if (responseStatus === 400) {
                        errorTitle = "Payload Inválido";
                        cause = "O Worker rejeitou os parâmetros de prompt enviados, respondendo com HTTP 400 Bad Request.";
                        action = "Reduza os textos extras ou a resolução das imagens carregadas nas abas de preenchimento.";
                    } else if (responseStatus === 500) {
                        errorTitle = "Proxy Offline";
                        cause = "Houve uma pane ou travamento interno crítico no servidor do Worker de IA (HTTP 500 Internal Error).";
                        action = "Consulte os consoles de monitoramento e de erro do painel Cloudflare do seu Worker.";
                    }

                    setGenerationDiagnostics({
                        endpoint: targetUrl,
                        route: "POST /",
                        status: errorTitle,
                        possibleCause: cause,
                        recommendedAction: action,
                        payload,
                        httpCode: responseStatus,
                        errorText: response.errorMessage || "Instabilidade na leitura corporal da resposta."
                    });

                    throw new Error(`Falha na comunicação com o Worker. Verifique o Proxy Online. (${response.errorMessage || 'HTTP ' + responseStatus})`);
                }
            } catch (err: any) {
                if (err.message && err.message.includes("Falha na comunicação")) {
                    throw err;
                }
                console.error("Erro crítico de fetch na geração:", err);
                
                let errStatus = "Proxy Offline";
                let cause = "Não foi possível conectar ao Worker de inteligência. A URL pode estar digitada incorretamente ou o servidor do Worker está fora do ar.";
                let action = "Revise se a URL do Worker está acessível externamente e execute o 'Testar Conexão' no menu lateral.";

                if (err.message && err.message.includes('CORS')) {
                    errStatus = "Erro de CORS";
                    cause = "A solicitação foi impedida por regras de CORS (Ausência do cabeçalho de permissão de Origem) ou o servidor está offline.";
                    action = "Experimente rodar a ferramenta em uma Nova Aba para evitar o sandboxing rígido de iFrame do dev server.";
                } else if (err.message && err.message.includes('timeout')) {
                    cause = "O tempo limite de processamento de IA expirou (3 minutos de limite excedidos).";
                    action = "Crie uma campanha com menos cenas ou remova arquivos pesados anexados.";
                }

                setGenerationDiagnostics({
                    endpoint: targetUrl,
                    route: "POST /",
                    status: errStatus,
                    possibleCause: cause,
                    recommendedAction: action,
                    payload,
                    errorText: err.toString()
                });
                
                throw new Error(`Falha na comunicação com o Worker. Verifique o Proxy Online. (${errStatus})`);
            }

            if (isDebugMode) {
                console.log("Resposta bruta de Sucesso codificada pelo Worker:", rawJSON);
            }

            if (!rawJSON) {
                setGenerationDiagnostics({
                    endpoint: targetUrl,
                    route: "POST /",
                    status: "Payload Inválido",
                    possibleCause: "A resposta do Worker retornou vazia ou em formato textual/binário impossível de desserializar em JSON.",
                    recommendedAction: "Garanta que as definições de saída do script do Cloudflare Worker retornem um objeto JSON perfeitamente estruturado.",
                    payload,
                    httpCode: responseStatus
                });
                throw new Error("Worker respondeu sucesso, mas os dados retornados não contêm formato coerente.");
            }

            // Extract real structure data from potential nesting patterns
            let parsedResult: any = null;
            if (rawJSON.candidates?.[0]?.content?.parts?.[0]?.text) {
                const text = rawJSON.candidates[0].content.parts[0].text;
                parsedResult = safeJSONParse(text);
            } else if (typeof rawJSON === 'object' && rawJSON !== null) {
                if (rawJSON.scenes) {
                    parsedResult = rawJSON;
                } else if (rawJSON.data?.scenes) {
                    parsedResult = rawJSON.data;
                } else if (rawJSON.data && typeof rawJSON.data === 'string') {
                    parsedResult = safeJSONParse(rawJSON.data);
                } else if (rawJSON.raw_text) {
                    parsedResult = safeJSONParse(rawJSON.raw_text);
                }
            }

            if (!parsedResult || !parsedResult.scenes) {
                const fallbackText = typeof rawJSON === 'string' ? rawJSON : JSON.stringify(rawJSON);
                const retryParse = safeJSONParse(fallbackText);
                if (retryParse?.scenes) {
                    parsedResult = retryParse;
                } else {
                    setGenerationDiagnostics({
                        endpoint: targetUrl,
                        route: "POST /",
                        status: "Payload Inválido",
                        possibleCause: "A resposta do modelo foi enviada em formato de texto livre ou em um JSON sem a matriz principal de cenas (Scenes/Blocks).",
                        recommendedAction: "Certifique-se de que a IA configurada no Cloudflare não aplique markdown envolvente e retorne o JSON estruturado esperado.",
                        payload,
                        httpCode: responseStatus,
                        errorText: JSON.stringify(rawJSON, null, 2)
                    });
                    throw new Error("O Worker enviou resposta, mas ela violou a estrutura do modelo JSON esperada (Falta a chave 'scenes').");
                }
            }

            setCbResult(parsedResult);
            const cbSnap = buildFinalPromptStructureSnapshot(null, parsedResult, cbActiveOutputTab, 'veo', null);
            if (cbSnap) setFinalPromptStructure(cbSnap);
            saveToHistory("Campaign Builder", parsedResult.campaign_name || cbProductName, `Plataforma: ${cbPlatform}\n\n=== RESULT ===\n${JSON.stringify(parsedResult, null, 2)}`);

        } catch (err: any) {
            console.error("Campaign Builder error detail:", err);
            setCbErrorMsg(err.message || "Erro desconhecido ao processar campanha.");
            // If diagnostic wasn't populated yet, populate general fallback
            setGenerationDiagnostics(prev => prev || {
                endpoint: workerUrl || "Não configurado",
                route: "POST /",
                status: "Proxy Offline",
                possibleCause: err.message || "Falha indeterminada na troca de dados com o Worker de IA.",
                recommendedAction: "Garanta a conformidade dos parâmetros e refaça testes de status do IP do Cloudflare."
            });
            // Ensure result is cleared so we don't display the successful output screen
            setCbResult(null);
        } finally {
            setCbLoading(false);
        }
    };

    const handleCbCopyFullCampaign = () => {
        if (!cbResult) return;
        let text = `CAMPANHA: ${cbResult.campaign_name || ''}
PLATAFORMA: ${cbPlatform}
ESTILO: ${cbCampaignStyle}

=== GENERAL OVERVIEW ===
Product Angle: ${cbResult.product_angle || ''}
Hook Strategy: ${cbResult.hook_strategy || ''}
Platform Strategy: ${cbResult.platform_strategy || ''}
CTA Strategy: ${cbResult.cta_strategy || ''}
Target Audience: ${cbResult.target_audience || ''}
Estimated Duration: ${cbResult.estimated_duration || ''}
Social Proof Usage: ${cbResult.social_proof_usage || ''}
Product Lock: ${cbResult.product_lock_status || (cbProductLock ? 'Enabled' : 'Disabled')}

=== SCENE BLOCKS ===
`;
        cbResult.scenes?.forEach((scene: any) => {
            text += `\nSCENE ${scene.scene_number || ''} — ${scene.title || ''}
VISUAL_PROMPT_EN: ${scene.visual_prompt_en || ''}
ACTION_PROMPT_EN: ${scene.action_prompt_en || ''}
VOICE_DESCRIPTION_EN: ${scene.voice_description_en || ''}
DIALOGUE_PT_BR: "${scene.dialogue_pt_br || ''}"
${scene.product_lock_prompt_en ? `PRODUCT_LOCK_PROMPT_EN: ${scene.product_lock_prompt_en}\n` : ''}${scene.social_proof_usage ? `SOCIAL_PROOF_USAGE: ${scene.social_proof_usage}\n` : ''}--------------------------------------------------\n`;
        });
        cbCopyToClipboardText(text, "Campanha Completa");
    };

    const handleCbCopyAllDialogues = () => {
        if (!cbResult) return;
        const dialogues = cbResult.scenes?.map((s: any) => `Cena ${s.scene_number || ''}: "${s.dialogue_pt_br || ''}"`).join('\n\n');
        cbCopyToClipboardText(dialogues, "Todos os Diálogos");
    };

    const handleCbCopyAllVisualPrompts = () => {
        if (!cbResult) return;
        const visuals = cbResult.scenes?.map((s: any) => `Cena ${s.scene_number || ''} Visual Prompt:\n${s.visual_prompt_en || ''}`).join('\n\n');
        cbCopyToClipboardText(visuals, "Todos os Prompts Visuais");
    };

    const handleCbCopyFlowPackage = () => {
        if (!cbResult) return;
        let flowText = `FLOW/VEO PACKAGE: ${cbResult.campaign_name || ''}\n\n`;
        cbResult.scenes?.forEach((scene: any) => {
            flowText += `SCENE BLOCK ${scene.scene_number || ''} - ${scene.title || ''}\n`;
            flowText += `Visual: ${scene.visual_prompt_en || ''}\n`;
            flowText += `Audio/Dialogue: ${scene.dialogue_pt_br || ''}\n`;
            if (scene.product_lock_prompt_en) {
                flowText += `Product Lock: ${scene.product_lock_prompt_en}\n`;
            }
            flowText += `Voice Details: ${scene.voice_description_en || ''}\n\n`;
        });
        cbCopyToClipboardText(flowText, "Pacote Flow/Veo");
    };

    const handleCbCopyJSON = () => {
        if (!cbResult) return;
        cbCopyToClipboardText(JSON.stringify(cbResult, null, 2), "JSON Estruturado");
    };

    const handleCbExportTxt = () => {
        if (!cbResult) return;
        let txt = `CAMPANHA: ${cbResult.campaign_name || ''}
PLATAFORMA: ${cbPlatform}
ESTILO: ${cbCampaignStyle}

=== GENERAL OVERVIEW ===
Product Angle: ${cbResult.product_angle || ''}
Hook Strategy: ${cbResult.hook_strategy || ''}
Platform Strategy: ${cbResult.platform_strategy || ''}
CTA Strategy: ${cbResult.cta_strategy || ''}
Target Audience: ${cbResult.target_audience || ''}
Estimated Duration: ${cbResult.estimated_duration || ''}
Social Proof Usage: ${cbResult.social_proof_usage || ''}
Product Lock: ${cbResult.product_lock_status || (cbProductLock ? 'Enabled' : 'Disabled')}

=== SOCIAL PROOF DNA ===
Summary: ${cbResult.social_proof_dna?.review_summary || ''}
Objections Solved: ${cbResult.social_proof_dna?.customer_objections || ''}
Quotes: ${cbResult.social_proof_dna?.proof_phrases || ''}

=== SCENE BLOCKS ===
`;
        cbResult.scenes?.forEach((scene: any) => {
            txt += `\nCENA ${scene.scene_number || ''} — ${scene.title || ''}
VISUAL_PROMPT_EN: ${scene.visual_prompt_en || ''}
ACTION_PROMPT_EN: ${scene.action_prompt_en || ''}
VOICE_DESCRIPTION_EN: ${scene.voice_description_en || ''}
DIALOGUE_PT_BR: "${scene.dialogue_pt_br || ''}"
${scene.product_lock_prompt_en ? `PRODUCT_LOCK_PROMPT_EN: ${scene.product_lock_prompt_en}\n` : ''}${scene.social_proof_usage ? `SOCIAL_PROOF_USAGE: ${scene.social_proof_usage}\n` : ''}--------------------------------------------------\n`;
        });

        const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${(cbResult.campaign_name || 'campanha_roteiro').toLowerCase().replace(/\s+/g, '_')}_creative_director.txt`;
        link.click();
        URL.revokeObjectURL(url);
        
        setCbCopyStatus("✓ TXT Exportado com sucesso!");
        setTimeout(() => setCbCopyStatus(null), 2500);
    };

    const getGrokFormat = (scene: any) => {
        return `Grok Realtime Video Action Format:\n\nSCENE ACTION INSTRUCTIONS:\n${scene.action_prompt_en || ''}\n\nSCENERY BACKGROUND:\n${scene.visual_prompt_en || ''}\n\nVOICEOVER DIALOGUE (PT_BR):\n"${scene.dialogue_pt_br || ''}"`;
    };

    const getSoraFormat = (scene: any) => {
        return `Sora 2 Cinematic Continuity Prompt:\n\nVISUAL CAMERA PROMPT (ENG):\n${scene.visual_prompt_en || ''}\n\nACTION DIRECTION:\n${scene.action_prompt_en || ''}\n\nCHARACTER / AVATAR VOICE DESCRIPTION (ENG):\n${scene.voice_description_en || ''}\n\nDIALOGUE AUDIO SUBTITLE (PT-BR):\n"${scene.dialogue_pt_br || ''}"`;
    };

    const renderCampaignBuilder = () => {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in text-slate-100 font-sans">
                {/* INPUTS COLUMN */}
                <div className="lg:col-span-5 space-y-4">
                    {/* Controle de Proxy & Conectividade (Health Check) */}
                    <Card className="bg-slate-900/80 border-slate-800/90 p-4 space-y-3 shadow-lg select-none">
                        <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsProxyPanelExpanded(!isProxyPanelExpanded)}>
                            <div className="flex items-center gap-2">
                                <LucideIcon name="cpu" className={`w-4 h-4 ${localProxyStatus === 'Proxy Online' ? 'text-emerald-400' : 'text-slate-400'}`} />
                                <span className="text-xs font-bold font-sans text-slate-200">Controle de Proxy & Conectividade</span>
                            </div>
                            <div className="flex items-center gap-2">
                                {/* Color-coded Status Badge based on real health check */}
                                {localProxyStatus === 'Checking' && (
                                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-bold font-mono bg-slate-950 text-slate-400 border border-slate-800">
                                        <LucideIcon name="loader2" className="w-2.5 h-2.5 animate-spin text-slate-405" />
                                        Checking
                                    </span>
                                )}
                                {localProxyStatus === 'Proxy Online' && (
                                    <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold font-mono bg-[#122A1E] text-emerald-400 border border-emerald-500/35">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                        ONLINE
                                    </span>
                                )}
                                {localProxyStatus === 'Proxy Online — Method mismatch' && (
                                    <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold font-mono bg-[#2A1D0B] text-amber-400 border border-amber-500/35" title="Worker está online mas rejeitou método GET com 405 (Exige POST)">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                                        MÉTODO 405 (MISMATCH)
                                    </span>
                                )}
                                {localProxyStatus === 'Proxy Offline' && (
                                    <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold font-mono bg-[#2D1616] text-red-400 border border-red-500/35 border-rose-800/30">
                                        <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                                        OFFLINE
                                    </span>
                                )}
                                {localProxyStatus === 'Token Inválido' && (
                                    <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold font-mono bg-amber-950/80 text-amber-450 border border-amber-805/30">
                                        <LucideIcon name="key" className="w-2.5 h-2.5 text-amber-400" />
                                        TOKEN OUT
                                    </span>
                                )}
                                {localProxyStatus === 'Rota Inexistente' && (
                                    <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold font-mono bg-purple-950/80 text-purple-400 border border-purple-800/30">
                                        <LucideIcon name="alert-triangle" className="w-2.5 h-2.5" />
                                        ROTA 404
                                    </span>
                                )}
                                {localProxyStatus === 'Erro de CORS' && (
                                    <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold font-mono bg-red-950/70 text-rose-300 border border-red-800/25">
                                        <LucideIcon name="shield-alert" className="w-2.5 h-2.5" />
                                        CORS BLOCKED
                                    </span>
                                )}
                                {localProxyStatus === 'Payload Inválido' && (
                                    <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold font-mono bg-red-950/80 text-red-500 border border-red-800/30">
                                        <LucideIcon name="database" className="w-2.5 h-2.5" />
                                        BAD PAYLOAD
                                    </span>
                                )}
                                <LucideIcon name={isProxyPanelExpanded ? "chevron-up" : "chevron-down"} className="w-4 h-4 text-slate-500" />
                            </div>
                        </div>

                        {/* Expandable settings detail form */}
                        {isProxyPanelExpanded && (
                            <div className="space-y-3 pt-3 border-t border-slate-800/60 animate-fade-in text-[10.5px]">
                                <div className="space-y-2">
                                    <div>
                                        <label className="block text-[10px] text-slate-450 mb-1 font-semibold uppercase tracking-wider">Worker URL Target</label>
                                        <input
                                            type="text"
                                            value={workerUrl}
                                            onChange={(e) => setWorkerUrl(e.target.value)}
                                            placeholder="https://..."
                                            className="w-full bg-slate-950 border border-slate-850 rounded px-2.5 py-1.5 text-xs text-slate-350 outline-none focus:border-indigo-500 transition font-mono"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-slate-450 mb-1 font-semibold uppercase tracking-wider">X-Client-Token (Chave do Cliente)</label>
                                        <input
                                            type="password"
                                            value={clientToken}
                                            onChange={(e) => setClientToken(e.target.value)}
                                            placeholder="Digite o token de autenticação"
                                            className="w-full bg-slate-950 border border-slate-850 rounded px-2.5 py-1.5 text-xs text-slate-350 outline-none focus:border-indigo-500 transition font-mono"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-2 justify-between items-center pt-1.5">
                                    <button
                                        type="button"
                                        onClick={runHealthCheck}
                                        disabled={localProxyStatus === 'Checking'}
                                        className="px-3 py-1.5 rounded-lg text-[10px] font-bold font-sans bg-slate-850 hover:bg-slate-800 border border-slate-750 text-slate-300 hover:text-white transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                    >
                                        <LucideIcon name={localProxyStatus === 'Checking' ? 'loader2' : 'activity'} className={`w-3.5 h-3.5 ${localProxyStatus === 'Checking' ? 'animate-spin' : ''}`} />
                                        Testar Conexão
                                    </button>
                                    
                                    <button
                                        type="button"
                                        onClick={() => setIsDebugMode(!isDebugMode)}
                                        className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold font-mono transition flex items-center gap-1 cursor-pointer border ${
                                            isDebugMode 
                                                ? 'bg-indigo-950/80 border-indigo-500/30 text-indigo-400' 
                                                : 'bg-slate-950 border-slate-850 text-slate-500'
                                        }`}
                                    >
                                        <LucideIcon name="terminal" className="w-3.5 h-3.5" />
                                        Debug: {isDebugMode ? 'ON' : 'OFF'}
                                    </button>
                                </div>

                                {/* Diagnosis details printed dynamically */}
                                {healthCheckDetails && (
                                    <div className="bg-slate-950 border border-slate-855 rounded-lg p-2.5 space-y-1.5 font-mono text-[9px] text-slate-400 leading-normal animate-fade-in relative text-left">
                                        <span className="absolute top-1.5 right-2 text-[8px] text-slate-600 font-bold">LOG DE EVENTOS</span>
                                        <p><span className="text-slate-500">Timestamp:</span> {healthCheckDetails.timestamp}</p>
                                        <p><span className="text-slate-500">Endpoint testado:</span> {healthCheckDetails.urlCalled}</p>
                                        <p><span className="text-slate-500">Código HTTP de Resposta:</span> <span className={localProxyStatus === 'Proxy Online' ? 'text-emerald-400' : localProxyStatus === 'Proxy Online — Method mismatch' ? 'text-amber-400' : 'text-rose-400 font-semibold'}>{healthCheckDetails.httpStatus || 'Falha de Conectividade'}</span></p>
                                        {healthCheckDetails.detailedError && (
                                            <p className="border-t border-slate-900 pt-1 mt-1 font-sans text-[9.5px] leading-relaxed">
                                                <span className="text-slate-500 block font-mono text-[8px] uppercase font-bold tracking-wider mb-0.5">Diagnóstico:</span>
                                                <span className={localProxyStatus === 'Proxy Online' ? 'text-emerald-300' : localProxyStatus === 'Proxy Online — Method mismatch' ? 'text-amber-300' : 'text-rose-300'}>{healthCheckDetails.detailedError}</span>
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </Card>

                    <Card className="bg-slate-900/60 border-slate-800/80 p-5 space-y-6">
                        <div className="flex justify-between items-center border-b border-slate-800/60 pb-3">
                            <span className="text-xs uppercase font-bold text-indigo-400 tracking-wider font-mono">
                                Configurações de Campanha
                            </span>
                            <button
                                onClick={handleCbClearInputs}
                                className="text-[10px] text-slate-400 hover:text-rose-450 font-mono transition cursor-pointer hover:underline"
                            >
                                Limpar Tudo
                            </button>
                        </div>

                        {/* SECTION 1: PRODUTO */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-white uppercase tracking-wide border-l-2 border-indigo-500 pl-2">
                                <LucideIcon name="shopping-bag" className="w-3.5 h-3.5 text-indigo-400" />
                                <span>1. Informações do Produto</span>
                            </div>

                            <div className="space-y-3 text-xs">
                                {/* Multiple Product Image upload */}
                                <div>
                                    <label className="block text-slate-400 mb-1 font-semibold">Fotos de Referência (Múltiplas)</label>
                                    <div className="flex gap-2 flex-wrap mb-2">
                                        {cbProductImages.map((img, idx) => (
                                            <div key={idx} className="relative w-12 h-12 bg-slate-950 border border-slate-800 rounded overflow-hidden">
                                                <img src={img} className="w-full h-full object-cover" />
                                                <button
                                                    onClick={() => handleRemoveImageFromArray(idx, setCbProductImages)}
                                                    className="absolute top-0 right-0 bg-black/70 hover:bg-black/90 text-slate-400 hover:text-rose-500 p-0.5 rounded cursor-pointer"
                                                >
                                                    <LucideIcon name="x" className="w-2.5 h-2.5" />
                                                </button>
                                            </div>
                                        ))}
                                        <label className="w-12 h-12 bg-slate-950 hover:bg-slate-900 border border-dashed border-slate-850 hover:border-slate-700 rounded flex flex-col items-center justify-center text-slate-500 hover:text-slate-300 cursor-pointer transition">
                                            <LucideIcon name="plus" className="w-4 h-4" />
                                            <input
                                                type="file"
                                                multiple
                                                accept="image/*"
                                                onChange={(e) => handleAddImageToArray(e, setCbProductImages, true)}
                                                className="hidden"
                                            />
                                        </label>
                                    </div>
                                    <span className="text-[9px] text-slate-550 block">PNG, JPG, WEBP de alta qualidade. A primeira será usada na análise.</span>
                                    {cbProductImages.length > 0 && (
                                        <button
                                            type="button"
                                            id="btn-analyze-product-cb"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                e.preventDefault();
                                                setProductAnalysisTriggerSource('manual_analyze_click');
                                                runVisualAnalysis(cbProductImages[0]);
                                            }}
                                            disabled={analyzingImage}
                                            className="mt-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-850 disabled:text-slate-400 text-white py-1 px-2.5 rounded font-mono text-[9px] font-bold cursor-pointer transition flex items-center gap-1 shadow"
                                        >
                                            <LucideIcon name="sparkles" className="w-3 h-3" />
                                            Analisar Produto
                                        </button>
                                    )}
                                    {analysisWarning && (
                                        <div className="mt-1.5 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded p-1.5 text-[9px] leading-normal font-sans animate-fade-in flex items-start gap-1">
                                            <LucideIcon name="alert-triangle" className="w-3 h-3 mt-0.5 shrink-0 text-amber-500" />
                                            <span>{analysisWarning}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Form fields */}
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-slate-400 mb-0.5 font-semibold">Nome do Produto *</label>
                                        <input
                                            type="text"
                                            value={cbProductName}
                                            onChange={(e) => { setCbProductName(e.target.value); setHasUserEditedCbProductName(true); }}
                                            placeholder="Ex: Escova Rotativa X"
                                            className="w-full bg-slate-950 border border-slate-850 rounded px-2.5 py-1.5 text-white placeholder-slate-650 focus:border-indigo-600 outline-none transition"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-slate-400 mb-0.5 font-semibold">Categoria</label>
                                        <select
                                            value={cbProductCategory}
                                            onChange={(e) => { setCbProductCategory(e.target.value); setHasUserEditedCbProductCategory(true); }}
                                            className="w-full bg-slate-950 border border-slate-855 rounded px-2 py-1.5 text-white focus:border-indigo-600 outline-none transition"
                                        >
                                            <option value="👗 Roupas Femininas & Lingerie">👗 Roupas Femininas & Lingerie</option>
                                            <option value="💄 Maquiagem & Cosméticos">💄 Maquiagem & Cosméticos</option>
                                            <option value="🧴 Cuidados com a Pele & Cabelo">🧴 Cuidados com a Pele & Cabelo</option>
                                            <option value="🧸 Brinquedos & Kids">🧸 Brinquedos & Kids</option>
                                            <option value="👟 Calçados & Tênis">👟 Calçados & Tênis</option>
                                            <option value="🏡 Casa, Cozinha & Decor">🏡 Casa, Cozinha & Decor</option>
                                            <option value="📱 Gadgets & Eletrônicos">📱 Gadgets & Eletrônicos</option>
                                            <option value="👟 Fitness & Esportes">👟 Fitness & Esportes</option>
                                            <option value="📦 Outros Utilitários">📦 Outros Utilitários</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-slate-400 mb-0.5 font-semibold">Principal Benefício</label>
                                    <input
                                        type="text"
                                        value={cbMainBenefit}
                                        onChange={(e) => setCbMainBenefit(e.target.value)}
                                        placeholder="Ex: Seca e alisa em 5 minutos"
                                        className="w-full bg-slate-950 border border-slate-850 rounded px-2.5 py-1.5 text-white placeholder-slate-650 focus:border-indigo-600 outline-none transition"
                                    />
                                </div>

                                <div>
                                    <label className="block text-slate-400 mb-0.5 font-semibold">Dor Principal Solucionada</label>
                                    <input
                                        type="text"
                                        value={cbMainPainSolved}
                                        onChange={(e) => setCbMainPainSolved(e.target.value)}
                                        placeholder="Ex: Frizz extremo no tempo úmido"
                                        className="w-full bg-slate-950 border border-slate-850 rounded px-2.5 py-1.5 text-white placeholder-slate-650 focus:border-indigo-600 outline-none transition"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-slate-400 mb-0.5 font-semibold">Faixa de Preço</label>
                                        <input
                                            type="text"
                                            value={cbPriceRange}
                                            onChange={(e) => setCbPriceRange(e.target.value)}
                                            placeholder="Ex: R$ 149 - R$ 199"
                                            className="w-full bg-slate-950 border border-slate-850 rounded px-2.5 py-1.5 text-white placeholder-slate-650 focus:border-indigo-600 outline-none transition"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-slate-400 mb-0.5 font-semibold">Diferencial Único (USP)</label>
                                        <input
                                            type="text"
                                            value={cbUniqueDifferentiator}
                                            onChange={(e) => setCbUniqueDifferentiator(e.target.value)}
                                            placeholder="Ex: Cerâmica revestida a íons"
                                            className="w-full bg-slate-950 border border-slate-850 rounded px-2.5 py-1.5 text-white placeholder-slate-650 focus:border-indigo-600 outline-none transition"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* SECTION 2: CREATOR INFLUENCER PROFILE */}
                        <div className="space-y-4 pt-3 border-t border-slate-800/40">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-white uppercase tracking-wide border-l-2 border-indigo-500 pl-2">
                                <LucideIcon name="user" className="w-3.5 h-3.5 text-pink-400" />
                                <span>2. Avatar / Influenciador</span>
                            </div>

                            <div className="space-y-3 text-xs">
                                <div className="flex items-center gap-3">
                                    {/* Creator image reference path */}
                                    <div className="w-12 h-12 rounded bg-slate-950 border border-slate-800 flex items-center justify-center relative overflow-hidden shrink-0">
                                        {cbAvatarImage ? (
                                            <>
                                                <img src={cbAvatarImage} className="w-full h-full object-cover" />
                                                <button
                                                    onClick={() => setCbAvatarImage(null)}
                                                    className="absolute top-0 right-0 bg-black/70 hover:bg-black/95 text-slate-400 p-0.5 rounded"
                                                >
                                                    <LucideIcon name="x" className="w-2.5 h-2.5" />
                                                </button>
                                            </>
                                        ) : (
                                            <LucideIcon name="user" className="w-5 h-5 text-slate-600" />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-[10px] text-slate-400 mb-1 font-semibold">Foto Referência do Criador (Opcional)</label>
                                        <label className="bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-750 text-[10px] text-slate-350 py-1.5 px-3 rounded cursor-pointer transition select-none font-bold inline-block">
                                            Carregar Foto
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => {
                                                    const f = e.target.files?.[0];
                                                    if (f) {
                                                        const reader = new FileReader();
                                                        reader.onload = () => setCbAvatarImage(reader.result as string);
                                                        reader.readAsDataURL(f);
                                                    }
                                                }}
                                                className="hidden"
                                            />
                                        </label>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-slate-400 mb-0.5 font-semibold">Gênero</label>
                                        <select
                                            value={cbCreatorGender}
                                            onChange={(e: any) => setCbCreatorGender(e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-850 rounded px-2 py-1.5 text-white focus:border-indigo-600 outline-none transition"
                                        >
                                            <option value="Neutral / Not specified">Neutral / Not specified</option>
                                            <option value="Female">Female</option>
                                            <option value="Male">Male</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-slate-400 mb-0.5 font-semibold">Estilo de Idade</label>
                                        <select
                                            value={cbCreatorAgeStyle}
                                            onChange={(e: any) => setCbCreatorAgeStyle(e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-850 rounded px-2 py-1.5 text-white focus:border-indigo-600 outline-none transition"
                                        >
                                            <option value="Young Adult">Young Adult</option>
                                            <option value="Adult">Adult</option>
                                            <option value="Mature Adult">Mature Adult</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-slate-400 mb-0.5 font-semibold">Persona</label>
                                        <select
                                            value={cbCreatorPersona}
                                            onChange={(e) => setCbCreatorPersona(e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-850 rounded px-2 py-1.5 text-white focus:border-indigo-600 outline-none transition"
                                        >
                                            <option value="UGC Influencer Real">UGC Influencer Real Archetype</option>
                                            <option value="TikTok Shop Seller">TikTok Shop Seller</option>
                                            <option value="Product Reviewer">Product Reviewer</option>
                                            <option value="Lifestyle Creator">Lifestyle Creator</option>
                                            <option value="Casual Friend">Casual Friend</option>
                                            <option value="Authority Expert">Authority Expert</option>
                                            <option value="Luxury Presenter">Luxury Presenter</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-slate-400 mb-0.5 font-semibold">Ritmo de Fala</label>
                                        <select
                                            value={cbSpeakingPace}
                                            onChange={(e: any) => setCbSpeakingPace(e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-850 rounded px-2 py-1.5 text-white focus:border-indigo-600 outline-none transition"
                                        >
                                            <option value="Slow">Slow Voice</option>
                                            <option value="Normal">Normal Dialogue</option>
                                            <option value="Fast">Fast Pace</option>
                                            <option value="TikTok Fast">TikTok Fast Pitch</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between items-center text-[10px] text-slate-400 mb-1">
                                        <span className="font-semibold">Energia do Diálogo</span>
                                        <span className="font-mono text-indigo-400 font-bold">{cbSpeakingEnergy}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={cbSpeakingEnergy}
                                        onChange={(e) => setCbSpeakingEnergy(parseInt(e.target.value))}
                                        className="w-full accent-indigo-500 h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer"
                                    />
                                    <div className="flex justify-between text-[8px] text-slate-600 font-mono mt-0.5">
                                        <span>Calmo / Soft</span>
                                        <span>Neutro</span>
                                        <span>Entusiasmado / Shop Seller</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* SECTION 3: CENÁRIO */}
                        <div className="space-y-4 pt-3 border-t border-slate-800/40">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-white uppercase tracking-wide border-l-2 border-indigo-500 pl-2">
                                <LucideIcon name="image" className="w-3.5 h-3.5 text-blue-400" />
                                <span>3. Cenário & Fundo</span>
                            </div>

                            <div className="space-y-3 text-xs">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded bg-slate-950 border border-slate-800 flex items-center justify-center relative overflow-hidden shrink-0">
                                        {cbScenarioImage ? (
                                            <>
                                                <img src={cbScenarioImage} className="w-full h-full object-cover" />
                                                <button
                                                    onClick={() => setCbScenarioImage(null)}
                                                    className="absolute top-0 right-0 bg-black/70 hover:bg-black/95 text-slate-400 p-0.5 rounded"
                                                >
                                                    <LucideIcon name="x" className="w-2.5 h-2.5" />
                                                </button>
                                            </>
                                        ) : (
                                            <LucideIcon name="image" className="w-5 h-5 text-slate-600" />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-[10px] text-slate-400 mb-1 font-semibold">Foto do Ambiente Real (Opcional)</label>
                                        <label className="bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-750 text-[10px] text-slate-350 py-1.5 px-3 rounded cursor-pointer transition select-none font-bold inline-block">
                                            Carregar Ambiente
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => {
                                                    const f = e.target.files?.[0];
                                                    if (f) {
                                                        const reader = new FileReader();
                                                        reader.onload = () => setCbScenarioImage(reader.result as string);
                                                        reader.readAsDataURL(f);
                                                    }
                                                }}
                                                className="hidden"
                                            />
                                        </label>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div className="col-span-2">
                                        <label className="block text-slate-400 mb-0.5 font-semibold">Estratégia de Fundo</label>
                                        <select
                                            value={cbBackgroundStrategy}
                                            onChange={(e) => setCbBackgroundStrategy(e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-850 rounded px-2 py-1.5 text-white focus:border-indigo-600 outline-none transition"
                                        >
                                            <option value="Automatic">Automatic (Intelligent Selection)</option>
                                            <option value="White Studio">White Studio Room</option>
                                            <option value="Luxury Room">Luxury Living Location</option>
                                            <option value="Similar Environment">Extend uploaded Reference Environment</option>
                                            <option value="Product Locked + Background Remodel">Product Locked + Full Background Remodel</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-slate-400 mb-0.5 font-semibold">Descrição Adicional do Cenário</label>
                                    <input
                                        type="text"
                                        value={cbScenarioDescription}
                                        onChange={(e) => setCbScenarioDescription(e.target.value)}
                                        placeholder="Ex: Quarto moderno minimalista bem iluminado"
                                        className="w-full bg-slate-950 border border-slate-850 rounded px-2.5 py-1.5 text-white placeholder-slate-650 focus:border-indigo-600 outline-none transition"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* SECTION 4: VÍDEO DE REFERÊNCIA */}
                        <div className="space-y-4 pt-3 border-t border-slate-800/40">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-white uppercase tracking-wide border-l-2 border-indigo-500 pl-2">
                                <LucideIcon name="video" className="w-3.5 h-3.5 text-amber-500" />
                                <span>4. Vídeo de Referência (Reconstrução de DNA)</span>
                            </div>

                            <div className="space-y-3 text-xs">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded bg-slate-950 border border-slate-800 flex flex-col items-center justify-center shrink-0 relative overflow-hidden">
                                        {cbRefVideo ? (
                                            <>
                                                <LucideIcon name="check-circle" className="w-5 h-5 text-emerald-500" />
                                                <button
                                                    onClick={() => setCbRefVideo(null)}
                                                    className="absolute top-0 right-0 bg-black/70 hover:bg-black/95 text-slate-400 p-0.5 rounded cursor-pointer"
                                                >
                                                    <LucideIcon name="x" className="w-2" />
                                                </button>
                                            </>
                                        ) : (
                                            <LucideIcon name="film" className="w-5 h-5 text-slate-650 animate-pulse" />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-[10px] text-slate-400 mb-1 font-semibold">Roteiro / Vídeo Referência (.mp4 / .mov)</label>
                                        <label className="bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-750 text-[10px] text-slate-350 py-1.5 px-3 rounded cursor-pointer transition select-none font-bold inline-block">
                                            {cbRefVideo ? "Trocar Vídeo" : "Carregar Vídeo"}
                                            <input
                                                type="file"
                                                accept="video/*"
                                                onChange={(e) => {
                                                    const f = e.target.files?.[0];
                                                    if (f) {
                                                        // Storing mock path / base64 sequence handle
                                                        setCbRefVideo(f.name);
                                                    }
                                                }}
                                                className="hidden"
                                            />
                                        </label>
                                    </div>
                                </div>
                                <span className="text-[9px] text-indigo-350 block">O modelo processará o arquivo para extrair HOOK_DNA, VOICE_DNA, VISUAL_DNA, EDITING_DNA e CTA_DNA de forma reversa.</span>
                            </div>
                        </div>

                        {/* SECTION 5: PROVA SOCIAL */}
                        <div className="space-y-4 pt-3 border-t border-slate-800/40">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-white uppercase tracking-wide border-l-2 border-indigo-500 pl-2">
                                <LucideIcon name="star" className="w-3.5 h-3.5 text-emerald-400" />
                                <span>5. Prova Social (Garantia de Conversão)</span>
                            </div>

                            <div className="space-y-3 text-xs">
                                <div>
                                    <label className="block text-slate-400 mb-1 font-semibold">Screenshots de Avaliações / Depoimentos</label>
                                    <div className="flex gap-2 flex-wrap mb-2">
                                        {cbSocialProofImages.map((img, idx) => (
                                            <div key={idx} className="relative w-12 h-12 bg-slate-950 border border-slate-800 rounded overflow-hidden">
                                                <img src={img} className="w-full h-full object-cover" />
                                                <button
                                                    onClick={() => handleRemoveImageFromArray(idx, setCbSocialProofImages)}
                                                    className="absolute top-0 right-0 bg-black/70 hover:bg-black/90 text-slate-400 hover:text-rose-500 p-0.5 rounded cursor-pointer"
                                                >
                                                    <LucideIcon name="x" className="w-2.5 h-2.5" />
                                                </button>
                                            </div>
                                        ))}
                                        <label className="w-12 h-12 bg-slate-950 hover:bg-slate-900 border border-dashed border-slate-850 hover:border-slate-700 rounded flex flex-col items-center justify-center text-slate-500 hover:text-slate-300 cursor-pointer transition">
                                            <LucideIcon name="plus" className="w-4 h-4" />
                                            <input
                                                type="file"
                                                multiple
                                                accept="image/*"
                                                onChange={(e) => handleAddImageToArray(e, setCbSocialProofImages)}
                                                className="hidden"
                                            />
                                        </label>
                                    </div>
                                    <span className="text-[9px] text-slate-550 block">Anexe capturas de tela contendo conversas, avaliações escritas ou de marketplaces.</span>
                                </div>
                            </div>
                        </div>

                        {/* SECTION 6: CONFIGURAÇÃO DA CAMPANHA */}
                        <div className="space-y-4 pt-3 border-t border-slate-800/40">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-white uppercase tracking-wide border-l-2 border-indigo-500 pl-2">
                                <LucideIcon name="settings" className="w-3.5 h-3.5 text-slate-400" />
                                <span>6. Configuração de Geração de Campanha</span>
                            </div>

                            <div className="space-y-3 text-xs">
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-slate-400 mb-0.5 font-semibold">Plataforma Canal</label>
                                        <select
                                            value={cbPlatform}
                                            onChange={(e) => setCbPlatform(e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-850 rounded px-2 py-1.5 text-white focus:border-indigo-600 outline-none transition"
                                        >
                                            <option value="TikTok Shop">TikTok Shop</option>
                                            <option value="Shopee Vídeo">Shopee Vídeo</option>
                                            <option value="Mercado Livre">Mercado Livre</option>
                                            <option value="Instagram Reels">Instagram Reels</option>
                                            <option value="Facebook Reels">Facebook Reels</option>
                                            <option value="YouTube Shorts">YouTube Shorts</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-slate-400 mb-0.5 font-semibold">Quantidade de Cenas</label>
                                        <select
                                            value={cbNumScenes}
                                            onChange={(e) => setCbNumScenes(parseInt(e.target.value))}
                                            className="w-full bg-slate-950 border border-slate-850 rounded px-2 py-1.5 text-white focus:border-indigo-600 outline-none transition"
                                        >
                                            {[3,4,5,6,7,8].map(n => (
                                                <option key={n} value={n}>{n} Roteiros / Cenas</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-slate-400 mb-0.5 font-semibold">Duração por Cena</label>
                                        <select
                                            value={cbSecondsPerScene}
                                            onChange={(e: any) => setCbSecondsPerScene(e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-850 rounded px-2 py-1.5 text-white focus:border-indigo-600 outline-none transition"
                                        >
                                            <option value="8s">8 segundos</option>
                                            <option value="10s">10 segundos</option>
                                            <option value="15s">15 segundos</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-slate-400 mb-0.5 font-semibold">Estilo / Fórmula de Conversão</label>
                                        <select
                                            value={cbCampaignStyle}
                                            onChange={(e) => setCbCampaignStyle(e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-850 rounded px-2 py-1.5 text-white focus:border-indigo-600 outline-none transition"
                                        >
                                            <option value="UGC Influencer Real">UGC Influencer Real</option>
                                            <option value="Oferta Urgente">Oferta Urgente / Venda Direta</option>
                                            <option value="Review Natural">Review Natural Testemunho</option>
                                            <option value="Storytelling Casual">Storytelling Casual / Daily Vlogs</option>
                                            <option value="Humor Viral">Humor Viral / Ironia do Quotidiano</option>
                                            <option value="Novela / Drama">Novela / Drama de Impacto</option>
                                            <option value="Luxury Soft Sell">Luxury Soft Sell</option>
                                            <option value="Autoridade Especialista">Autoridade Especialista de Saúde/Beleza</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 items-center pt-1.5">
                                    <div className="col-span-2">
                                        <div className="flex justify-between items-center text-[10px] text-slate-400 mb-1">
                                            <span className="font-semibold">Similariade de Remodelação</span>
                                            <span className="font-mono text-indigo-400 font-bold">{cbRemodelingIntensity}%</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            value={cbRemodelingIntensity}
                                            onChange={(e) => setCbRemodelingIntensity(parseInt(e.target.value))}
                                            className="w-full accent-indigo-500 h-1 bg-slate-950 rounded appearance-none cursor-pointer"
                                        />
                                    </div>
                                </div>

                                {/* PRECISION OBJECT LOCK */}
                                <div className="pt-3 border-t border-slate-850 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <button
                                            type="button"
                                            onClick={() => setIsObjectLockPanelExpanded(!isObjectLockPanelExpanded)}
                                            className="flex items-center gap-1.5 text-xs font-bold text-white uppercase tracking-wide border-l-2 border-indigo-500 pl-2 cursor-pointer w-full text-left"
                                        >
                                            <span>🔒 Precision Object Lock</span>
                                            <LucideIcon name={isObjectLockPanelExpanded ? "chevron-up" : "chevron-down"} className="w-3.5 h-3.5 text-slate-550 ml-auto" />
                                        </button>
                                    </div>

                                    {isObjectLockPanelExpanded && (
                                        <div className="space-y-4 bg-slate-950/40 border border-slate-850/80 p-3.5 rounded-xl text-left animate-fade-in">
                                            {/* Main toggle (TASK 2) */}
                                            <div className="flex items-center justify-between border-b border-slate-850 pb-2.5">
                                                <div>
                                                    <span className="text-[10.5px] font-bold text-white block">Ativar Trava de Objeto</span>
                                                    <span className="text-[8.5px] text-slate-500 leading-normal block">Garanta consistência física de marca, proporções e detalhes visuais</span>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    {objectLockEnabled && (
                                                        <span className="text-[8px] uppercase font-mono px-1 rounded bg-indigo-950/60 text-indigo-400 border border-indigo-900/40 font-bold">
                                                            ATIVADO
                                                        </span>
                                                    )}
                                                    <input
                                                        type="checkbox"
                                                        checked={objectLockEnabled}
                                                        onChange={(e) => {
                                                            setObjectLockEnabled(e.target.checked);
                                                            setCbProductLock(e.target.checked);
                                                        }}
                                                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-950 cursor-pointer accent-indigo-500"
                                                    />
                                                </div>
                                            </div>

                                            {objectLockEnabled && (
                                                <>
                                                    {/* TASK 1: PRODUCT IMAGE UPLOAD FOR OBJECT LOCK */}
                                                    <div className="space-y-2 bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                                                        <div>
                                                            <label className="block text-[10px] font-bold text-indigo-400 uppercase font-mono">
                                                                Imagem do Produto para Trava de Objeto
                                                            </label>
                                                            <p className="text-[9px] text-slate-400 leading-relaxed mt-0.5">
                                                                Envie uma imagem do produto para a IA extrair formato, cores, materiais, textos, logos, embalagem e detalhes que não podem mudar.
                                                            </p>
                                                        </div>

                                                        {/* Image Drop & Preview Zone */}
                                                        <div 
                                                            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                                            onDrop={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                                                    handleObjectLockImageFile(e.dataTransfer.files[0]);
                                                                }
                                                            }}
                                                            className="border-2 border-dashed border-slate-800 hover:border-indigo-500/50 bg-slate-950 rounded-lg p-3 transition text-center flex flex-col items-center justify-center relative cursor-pointer group"
                                                        >
                                                            {productImagePreview || productImageBase64 || productImage ? (
                                                                <div className="relative w-full max-h-40 flex items-center justify-center overflow-hidden rounded">
                                                                    <img 
                                                                        src={productImagePreview || productImageBase64 || productImage} 
                                                                        alt="Preview da Trava de Objeto" 
                                                                        className="max-h-36 object-contain rounded border border-slate-800"
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleClearObjectLockImage();
                                                                        }}
                                                                        className="absolute top-1 right-1 bg-black/80 hover:bg-rose-950 text-slate-300 hover:text-rose-300 p-1 rounded-full border border-slate-700 transition"
                                                                        title="Remover imagem"
                                                                    >
                                                                        <LucideIcon name="x" className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <label className="cursor-pointer w-full flex flex-col items-center justify-center py-2">
                                                                    <LucideIcon name="upload-cloud" className="w-6 h-6 text-slate-500 group-hover:text-indigo-400 transition mb-1" />
                                                                    <span className="text-[10px] text-slate-300 font-medium">
                                                                        Clique para selecionar, arraste a imagem aqui ou cole via Ctrl+V
                                                                    </span>
                                                                    <span className="text-[8.5px] text-slate-500 font-mono mt-0.5">
                                                                        Formatos aceitos: PNG, JPG, JPEG, WEBP
                                                                    </span>
                                                                    <input 
                                                                        type="file" 
                                                                        accept="image/png, image/jpeg, image/jpg, image/webp"
                                                                        onChange={(e) => {
                                                                            if (e.target.files && e.target.files[0]) {
                                                                                handleObjectLockImageFile(e.target.files[0]);
                                                                            }
                                                                        }}
                                                                        className="hidden" 
                                                                    />
                                                                </label>
                                                            )}
                                                        </div>

                                                        {/* Trigger manual re-analysis button */}
                                                        {(productImagePreview || productImageBase64 || productImage) && (
                                                            <button
                                                                type="button"
                                                                onClick={() => runObjectLockImageAnalysis(productImagePreview || productImageBase64 || productImage)}
                                                                disabled={isAnalyzingObjectLockImage}
                                                                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white font-mono text-[9.5px] font-bold py-1.5 px-3 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
                                                            >
                                                                <LucideIcon name={isAnalyzingObjectLockImage ? "loader-2" : "sparkles"} className={`w-3.5 h-3.5 ${isAnalyzingObjectLockImage ? "animate-spin" : ""}`} />
                                                                {isAnalyzingObjectLockImage ? "Analisando Detalhes do Produto..." : "Analisar Imagem do Produto"}
                                                            </button>
                                                        )}

                                                        {/* Warning notice */}
                                                        {objectLockWarning && (
                                                            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 p-2 rounded-lg text-[9.5px] leading-tight flex items-start gap-1.5 animate-fade-in">
                                                                <LucideIcon name="alert-triangle" className="w-3.5 h-3.5 shrink-0 text-amber-400 mt-0.5" />
                                                                <span>{objectLockWarning}</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Lock level options */}
                                                    <div className="space-y-1.5">
                                                        <span className="block text-[9px] uppercase font-mono text-slate-400 font-bold">Nível de Rigidez (Lock Level)</span>
                                                        <div className="grid grid-cols-3 gap-1.5">
                                                            {(['basic', 'advanced', 'micro'] as const).map((lvl) => {
                                                                const label = lvl === 'basic' ? 'Basic' : lvl === 'advanced' ? 'Advanced' : 'Micro Detail';
                                                                const isSelected = objectLockLevel === lvl;
                                                                return (
                                                                    <button
                                                                        type="button"
                                                                        key={lvl}
                                                                        onClick={() => setObjectLockLevel(lvl)}
                                                                        className={`p-1.5 rounded-lg text-center cursor-pointer border transition text-[9px] uppercase font-bold flex flex-col items-center justify-center gap-0.5 ${
                                                                            isSelected 
                                                                            ? 'bg-indigo-600/25 border-indigo-550 text-indigo-300' 
                                                                            : 'bg-slate-950 border-slate-850 text-slate-450 hover:bg-slate-900'
                                                                        }`}
                                                                    >
                                                                        <span>{label}</span>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>

                                                    {/* TASK 6: MANUAL CORRECTION FIELDS */}
                                                    <div className="space-y-2 border-t border-slate-850 pt-2.5">
                                                        <div className="flex items-center justify-between">
                                                            <span className="block text-[9.5px] uppercase font-mono text-slate-300 font-bold">Campos de Correção Manual da Trava</span>
                                                            {productImageAnalysis && (
                                                                <span className="text-[8.5px] text-emerald-400 flex items-center gap-0.5 font-bold">
                                                                    <LucideIcon name="check-circle" className="w-3 h-3 text-emerald-400" /> Preenchido via Imagem
                                                                </span>
                                                            )}
                                                        </div>

                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                                            <div className="col-span-1 sm:col-span-2">
                                                                <label className="text-[9px] text-slate-400 font-bold block mb-0.5 uppercase font-mono">Identidade Visual</label>
                                                                <input 
                                                                    type="text" 
                                                                    value={olVisualIdentity}
                                                                    onChange={(e) => setOlVisualIdentity(e.target.value)}
                                                                    placeholder="Ex: Frasco cilíndrico de perfume em vidro azul cobalto com tampa dourada"
                                                                    className="w-full bg-slate-950 border border-slate-850 rounded p-1.5 text-white placeholder-slate-700 outline-none focus:border-indigo-550 transition text-[9.5px]"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="text-[9px] text-slate-400 font-bold block mb-0.5 uppercase font-mono">Visão Frontal (Frente)</label>
                                                                <input 
                                                                    type="text" 
                                                                    value={olFrontView}
                                                                    onChange={(e) => setOlFrontView(e.target.value)}
                                                                    placeholder="Ex: Rótulo branco centralizado com logo em relevo"
                                                                    className="w-full bg-slate-950 border border-slate-850 rounded p-1.5 text-white placeholder-slate-700 outline-none focus:border-indigo-550 transition text-[9.5px]"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="text-[9px] text-slate-400 font-bold block mb-0.5 uppercase font-mono">Visão Lateral</label>
                                                                <input 
                                                                    type="text" 
                                                                    value={olSideView}
                                                                    onChange={(e) => setOlSideView(e.target.value)}
                                                                    placeholder="Ex: Perfil curvado com costura metálica visível"
                                                                    className="w-full bg-slate-950 border border-slate-850 rounded p-1.5 text-white placeholder-slate-700 outline-none focus:border-indigo-550 transition text-[9.5px]"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="text-[9px] text-slate-400 font-bold block mb-0.5 uppercase font-mono">Visão Traseira</label>
                                                                <input 
                                                                    type="text" 
                                                                    value={olBackView}
                                                                    onChange={(e) => setOlBackView(e.target.value)}
                                                                    placeholder="Ex: Tabela de ingredientes e código de barras"
                                                                    className="w-full bg-slate-950 border border-slate-850 rounded p-1.5 text-white placeholder-slate-700 outline-none focus:border-indigo-550 transition text-[9.5px]"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="text-[9px] text-slate-400 font-bold block mb-0.5 uppercase font-mono">Visão Superior (Topo)</label>
                                                                <input 
                                                                    type="text" 
                                                                    value={olTopView}
                                                                    onChange={(e) => setOlTopView(e.target.value)}
                                                                    placeholder="Ex: Borrifador dourado fosco com gravação circular"
                                                                    className="w-full bg-slate-950 border border-slate-850 rounded p-1.5 text-white placeholder-slate-700 outline-none focus:border-indigo-550 transition text-[9.5px]"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="text-[9px] text-slate-400 font-bold block mb-0.5 uppercase font-mono">Cores e Acabamento</label>
                                                                <input 
                                                                    type="text" 
                                                                    value={olColorsFinish}
                                                                    onChange={(e) => setOlColorsFinish(e.target.value)}
                                                                    placeholder="Ex: Azul cobalto brilhante, detalhes em dourado metálico 24k"
                                                                    className="w-full bg-slate-950 border border-slate-850 rounded p-1.5 text-white placeholder-slate-700 outline-none focus:border-indigo-550 transition text-[9.5px]"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="text-[9px] text-slate-400 font-bold block mb-0.5 uppercase font-mono">Materiais</label>
                                                                <input 
                                                                    type="text" 
                                                                    value={olMaterials}
                                                                    onChange={(e) => setOlMaterials(e.target.value)}
                                                                    placeholder="Ex: Vidro pesado temperado, alumínio escovado"
                                                                    className="w-full bg-slate-950 border border-slate-850 rounded p-1.5 text-white placeholder-slate-700 outline-none focus:border-indigo-550 transition text-[9.5px]"
                                                                />
                                                            </div>
                                                            <div className="col-span-1 sm:col-span-2">
                                                                <label className="text-[9px] text-slate-400 font-bold block mb-0.5 uppercase font-mono">Logos e Textos Visíveis</label>
                                                                <input 
                                                                    type="text" 
                                                                    value={olLogosText}
                                                                    onChange={(e) => setOlLogosText(e.target.value)}
                                                                    placeholder="Ex: 'EAU DE PARFUM 100ML' em caixa alta dourada"
                                                                    className="w-full bg-slate-950 border border-slate-850 rounded p-1.5 text-white placeholder-slate-700 outline-none focus:border-indigo-550 transition text-[9.5px]"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="text-[9px] text-slate-400 font-bold block mb-0.5 uppercase font-mono">Embalagem</label>
                                                                <input 
                                                                    type="text" 
                                                                    value={olPackaging}
                                                                    onChange={(e) => setOlPackaging(e.target.value)}
                                                                    placeholder="Ex: Caixa rígida de papelão matte preta com berço interno"
                                                                    className="w-full bg-slate-950 border border-slate-850 rounded p-1.5 text-white placeholder-slate-700 outline-none focus:border-indigo-550 transition text-[9.5px]"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="text-[9px] text-rose-400 font-bold block mb-0.5 uppercase font-mono">Não Alterar</label>
                                                                <input 
                                                                    type="text" 
                                                                    value={olDoNotChange}
                                                                    onChange={(e) => setOlDoNotChange(e.target.value)}
                                                                    placeholder="Ex: Formato do frasco, cor da tampa, logotipo, proporções"
                                                                    className="w-full bg-slate-950 border border-slate-850 rounded p-1.5 text-white placeholder-slate-700 outline-none focus:border-rose-900 transition text-[9.5px]"
                                                                />
                                                            </div>
                                                            <div className="col-span-1 sm:col-span-2">
                                                                <label className="text-[9px] text-emerald-400 font-bold block mb-0.5 uppercase font-mono">Movimento Permitido</label>
                                                                <input 
                                                                    type="text" 
                                                                    value={olAllowedMotion}
                                                                    onChange={(e) => setOlAllowedMotion(e.target.value)}
                                                                    placeholder="Ex: Rotação 360°, abertura da tampa, spray borrifando líquido"
                                                                    className="w-full bg-slate-950 border border-slate-850 rounded p-1.5 text-white placeholder-slate-700 outline-none focus:border-emerald-900 transition text-[9.5px]"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* SUBMIT BUTTON */}
                        <div className="pt-3 border-t border-slate-800">
                            {mismatchWarning && (
                                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2.5 mb-3 space-y-2 text-[10.5px] leading-relaxed animate-fade-in">
                                    <div className="flex items-start gap-1.5 text-amber-400">
                                        <LucideIcon name="alert-triangle" className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                                        <div>
                                            <span className="font-mono font-bold uppercase block tracking-wide text-[9px] mb-0.5">Aviso de Inconsistência Detectada</span>
                                            <p className="text-slate-300 font-sans">{mismatchWarning}</p>
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-2 pt-1">
                                        <button
                                            type="button"
                                            onClick={() => setMismatchWarning(null)}
                                            className="px-2.5 py-1 text-[9px] font-mono font-bold rounded bg-slate-950 border border-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                                        >
                                            Corrigir Formulário
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleBypassAndGenerate(true)}
                                            className="px-2.5 py-1 text-[9px] font-mono font-bold rounded bg-amber-600 hover:bg-amber-500 text-slate-950 hover:text-black font-extrabold transition cursor-pointer flex items-center gap-0.5 shadow"
                                        >
                                            Ignorar e Continuar <LucideIcon name="chevron-right" className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {cbErrorMsg && (
                                <div className="bg-rose-500/10 border border-rose-500/20 rounded p-2.5 mb-3 text-rose-450 text-[10.5px] leading-relaxed">
                                    {cbErrorMsg}
                                </div>
                            )}

                            <button
                                onClick={() => handleCbGenerate()}
                                disabled={cbLoading || !canGenerateWithProxy(localProxyStatus)}
                                className={`w-full py-2.5 rounded-xl text-xs font-bold font-sans transition-all cursor-pointer flex justify-center items-center gap-2 ${
                                    (cbLoading || !canGenerateWithProxy(localProxyStatus))
                                        ? 'bg-slate-850 text-slate-500 cursor-not-allowed border border-slate-800'
                                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg border border-indigo-500 hover:scale-[1.01] active:scale-[0.99]'
                                }`}
                            >
                                <LucideIcon name={(cbLoading || localProxyStatus === 'Checking') ? 'loader2' : 'sparkles'} className={`w-4 h-4 ${(cbLoading || localProxyStatus === 'Checking') ? 'animate-spin text-slate-500' : 'text-amber-300'}`} />
                                {localProxyStatus === 'Checking' ? 'Verificando Proxy...' :
                                 getNormalizedProxyStatus(localProxyStatus) === 'method_mismatch' ? 'Health check 405 — adicione GET /health no Worker' :
                                 !canGenerateWithProxy(localProxyStatus) ? 'Proxy Requerido Offline' :
                                 cbLoading ? 'Compilando Inteligência de Campanha...' : 'Construir Campanha de Conversão'}
                            </button>
                        </div>
                    </Card>
                </div>

                {/* OUTPUTS COLUMN */}
                <div className="lg:col-span-7 space-y-4">
                    {/* Copy toast notifier */}
                    {cbCopyStatus && (
                        <div className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold py-2 px-3 rounded-lg flex items-center justify-between shadow-lg animate-bounce">
                            <span>{cbCopyStatus}</span>
                            <LucideIcon name="check" className="w-3.5 h-3.5" />
                        </div>
                    )}

                    {cbLoading ? (
                        <Card className="bg-slate-900/60 border-slate-800/80 p-8 flex flex-col items-center justify-center min-h-[500px] text-center space-y-4">
                            <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-full animate-spin">
                                <LucideIcon name="loader2" className="w-8 h-8 text-indigo-400" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-sm font-bold text-white font-sans uppercase tracking-wider animate-pulse">Gerando Campanha Completa (DNA Model Matrix)</h3>
                                <p className="text-xs text-slate-400 max-w-md font-sans">
                                    Nossos engenheiros neurais estão compilando o Roteiro Narrativo, os Prompts de Veo 3 / Sora 2 / Grok, aplicando a Prova Social, e travando a consistência visual via Product Lock...
                                </p>
                            </div>
                            <div className="w-64 h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-850 relative">
                                <div className="absolute top-0 left-0 h-full bg-indigo-500 animate-[pulse_1.5s_infinite] w-full rounded-full" />
                            </div>
                        </Card>
                    ) : cbResult ? (
                        <div className="space-y-4">
                            {/* RESULTS HEADER TAB BAR */}
                            <div className="flex flex-wrap gap-1.5 p-1 bg-slate-950 border border-slate-850 rounded-xl select-none text-[10px] font-bold font-sans">
                                {[
                                    { id: 'overview', label: 'Campaign Overview', icon: 'info' },
                                    { id: 'scenes', label: 'Scene Blocks', icon: 'film' },
                                    { id: 'flow', label: 'Flow / Veo 3', icon: 'zap' },
                                    { id: 'sora', label: 'Sora 2', icon: 'youtube' },
                                    { id: 'grok', label: 'Grok', icon: 'message-square' },
                                    { id: 'json', label: 'Structured JSON', icon: 'file-text' }
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setCbActiveOutputTab(tab.id as any)}
                                        className={`flex-1 min-w-[70px] py-2 px-2.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                                            cbActiveOutputTab === tab.id
                                                ? 'bg-slate-850 text-indigo-400 border border-slate-750 shadow'
                                                : 'text-slate-450 hover:text-slate-200 hover:bg-slate-900/40'
                                        }`}
                                    >
                                        <LucideIcon name={tab.icon as any} className="w-3.5 h-3.5" />
                                        <span className="hidden md:inline">{tab.label}</span>
                                    </button>
                                ))}
                            </div>

                            {/* GLOBAL ACTIONS PANEL */}
                            <div className="p-3 bg-slate-900/70 border border-slate-800/80 rounded-xl flex flex-wrap items-center justify-between gap-2.5 text-[9.5px] font-bold font-mono">
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleCbCopyFullCampaign}
                                        className="bg-slate-850 hover:bg-slate-800 text-indigo-400 hover:text-indigo-300 py-1.5 px-2.5 rounded border border-slate-750 transition cursor-pointer flex items-center gap-1"
                                    >
                                        <LucideIcon name="copy" className="w-3 h-3" /> Copy Full Campaign
                                    </button>
                                    <button
                                        onClick={handleCbCopyAllDialogues}
                                        className="bg-slate-850 hover:bg-slate-800 text-emerald-400 hover:text-emerald-300 py-1.5 px-2.5 rounded border border-slate-750 transition cursor-pointer flex items-center gap-1"
                                    >
                                        <LucideIcon name="message-square" className="w-3 h-3" /> Copy All Dialogues
                                    </button>
                                    <button
                                        onClick={handleCbCopyAllVisualPrompts}
                                        className="bg-slate-850 hover:bg-slate-800 text-blue-400 hover:text-blue-300 py-1.5 px-2.5 rounded border border-slate-750 transition cursor-pointer flex items-center gap-1"
                                    >
                                        <LucideIcon name="image" className="w-3 h-3" /> Copy Visual Prompts
                                    </button>
                                    <button
                                        onClick={handleCbExportTxt}
                                        className="bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white py-1.5 px-2.5 rounded border border-slate-750 transition cursor-pointer flex items-center gap-1"
                                    >
                                        <LucideIcon name="download" className="w-3 h-3" /> Export TXT
                                    </button>
                                </div>

                                <div className="flex items-center gap-2">
                                    <span className="text-slate-500 uppercase tracking-wide">Plataforma:</span>
                                    <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full font-sans font-bold">
                                        {cbPlatform}
                                    </span>
                                </div>
                            </div>

                            {/* OUTPUT VIEW RENDERING */}
                            <Card className="bg-slate-900/60 border-slate-800/80 p-5 space-y-4 min-h-[450px]">
                                {cbActiveOutputTab === 'overview' && (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between border-b border-indigo-500/20 pb-3">
                                            <div className="flex items-center gap-2">
                                                <div className="p-1 px-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-xs font-bold text-indigo-400">
                                                    CAMPANHA
                                                </div>
                                                <h3 className="text-base font-bold text-white font-sans">
                                                    {cbResult.campaign_name || 'Estrutura Gerada'}
                                                </h3>
                                            </div>
                                            <span className="text-[10px] text-indigo-350 font-mono">Duração Estimada: {cbResult.estimated_duration || 'Auto'}</span>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="bg-black/30 p-3 rounded-xl border border-slate-850/80">
                                                <span className="text-[9px] uppercase tracking-wider text-indigo-450 font-bold block mb-1">Ângulo Comercial</span>
                                                <p className="text-xs text-slate-300 leading-relaxed font-sans">{cbResult.product_angle || '...'}</p>
                                            </div>
                                            <div className="bg-black/30 p-3 rounded-xl border border-slate-850/80">
                                                <span className="text-[9px] uppercase tracking-wider text-rose-455 font-bold block mb-1">Estratégia do Gancho (Hook DNA)</span>
                                                <p className="text-xs text-slate-300 leading-relaxed font-sans">{cbResult.hook_strategy || '...'}</p>
                                            </div>
                                            <div className="bg-black/30 p-3 rounded-xl border border-slate-850/80">
                                                <span className="text-[9px] uppercase tracking-wider text-blue-450 font-bold block mb-1">Canal e Mecânica ({cbPlatform})</span>
                                                <p className="text-xs text-slate-300 leading-relaxed font-sans">{cbResult.platform_strategy || '...'}</p>
                                            </div>
                                            <div className="bg-black/30 p-3 rounded-xl border border-slate-850/80">
                                                <span className="text-[9px] uppercase tracking-wider text-emerald-400 font-bold block mb-1">Ação de Chamada (CTA Trigger)</span>
                                                <p className="text-xs text-slate-300 leading-relaxed font-sans">{cbResult.cta_strategy || '...'}</p>
                                            </div>
                                        </div>

                                        <div className="bg-black/40 p-4 rounded-xl border border-slate-850 space-y-2">
                                            <span className="text-[10px] uppercase font-bold text-emerald-450 block tracking-wider font-mono">Social Proof Real Application (DNA Prova Social)</span>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-sans text-slate-350 pt-1">
                                                <div>
                                                    <span className="text-[9px] font-mono text-slate-500 block">Desejos & Avaliações Unificados:</span>
                                                    <p className="text-xs text-slate-300 italic">"{cbResult.social_proof_dna?.review_summary || 'N/A'}"</p>
                                                </div>
                                                <div>
                                                    <span className="text-[9px] font-mono text-slate-500 block">Injeção de Testemunhos Diretos:</span>
                                                    <p className="text-xs text-emerald-300 font-semibold italic">"{cbResult.social_proof_dna?.usable_dialogue_lines || 'N/A'}"</p>
                                                </div>
                                            </div>
                                            <p className="text-[10px] text-slate-400 border-t border-slate-850/90 pt-2 font-sans mt-2">
                                                <span className="font-bold text-slate-200">Como é aplicada no Roteiro:</span> {cbResult.social_proof_usage || 'Incorporada como legendas e quebras de objeções diretas.'}
                                            </p>
                                        </div>

                                        <div className="flex select-none items-center justify-between p-3 bg-indigo-950/20 border border-indigo-900/30 rounded-xl">
                                            <div className="flex items-center gap-2">
                                                <LucideIcon name="shield-check" className="w-5 h-5 text-indigo-400" />
                                                <div>
                                                    <p className="text-xs font-bold text-white font-sans">Visual Product Lock Consistency</p>
                                                    <p className="text-[10px] text-slate-400 font-sans">Garantiu-se que todos os prompts incluam a matriz de replicação idêntica do produto.</p>
                                                </div>
                                            </div>
                                            <span className="text-[10.5px] font-mono font-bold bg-indigo-500/20 text-indigo-400 py-1 px-2.5 rounded-lg border border-indigo-500/30">
                                                ENABLED
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {cbActiveOutputTab === 'scenes' && (
                                    <div className="space-y-4">
                                        {cbResult.scenes?.map((scene: any, idx: number) => (
                                            <div key={idx} className="bg-slate-950/60 p-4 border border-slate-850/90 rounded-xl space-y-4 hover:border-slate-800 transition">
                                                <div className="flex justify-between items-center border-b border-slate-850 pb-2">
                                                    <span className="text-indigo-400 font-bold text-xs uppercase tracking-wider font-sans">
                                                        Cena {scene.scene_number || (idx + 1)} — {scene.title || 'DETALHE'}
                                                    </span>
                                                    <span className="text-[9px] font-mono text-slate-500">{cbSecondsPerScene}</span>
                                                </div>

                                                <div className="space-y-3 font-mono">
                                                    <div className="bg-black/30 p-2.5 rounded-lg border border-slate-900">
                                                        <div className="flex justify-between items-center mb-1">
                                                            <span className="text-[8.5px] uppercase tracking-wider text-rose-450 font-bold block">VISUAL_PROMPT_EN</span>
                                                            <button
                                                                onClick={() => cbCopyToClipboardText(scene.visual_prompt_en, `Visual Prompt (Cena ${idx+1})`)}
                                                                className="text-[9px] text-slate-500 hover:text-white flex items-center gap-1"
                                                            >
                                                                <LucideIcon name="copy" className="w-2.5 h-2.5" /> Copy
                                                            </button>
                                                        </div>
                                                        <p className="text-xs text-slate-300 italic leading-relaxed font-sans">{scene.visual_prompt_en || '...'}</p>
                                                    </div>

                                                    <div className="bg-black/30 p-2.5 rounded-lg border border-slate-900">
                                                        <div className="flex justify-between items-center mb-1">
                                                            <span className="text-[8.5px] uppercase tracking-wider text-blue-450 font-bold block">ACTION_PROMPT_EN</span>
                                                            <button
                                                                onClick={() => cbCopyToClipboardText(scene.action_prompt_en, `Action Prompt (Cena ${idx+1})`)}
                                                                className="text-[9px] text-slate-500 hover:text-white flex items-center gap-1"
                                                            >
                                                                <LucideIcon name="copy" className="w-2.5 h-2.5" /> Copy
                                                            </button>
                                                        </div>
                                                        <p className="text-xs text-slate-300 italic leading-relaxed font-sans">{scene.action_prompt_en || '...'}</p>
                                                    </div>

                                                    <div className="bg-black/30 p-2.5 rounded-lg border border-slate-900">
                                                        <div className="flex justify-between items-center mb-1">
                                                            <span className="text-[8.5px] uppercase tracking-wider text-pink-450 font-bold block">VOICE_DESCRIPTION_EN</span>
                                                            <button
                                                                onClick={() => cbCopyToClipboardText(scene.voice_description_en, `Voice description (Cena ${idx+1})`)}
                                                                className="text-[9px] text-slate-500 hover:text-white flex items-center gap-1"
                                                            >
                                                                <LucideIcon name="copy" className="w-2.5 h-2.5" /> Copy
                                                            </button>
                                                        </div>
                                                        <p className="text-xs text-slate-400 leading-relaxed font-sans">{scene.voice_description_en || '...'}</p>
                                                    </div>

                                                    <div className="bg-indigo-950/20 p-3 rounded-lg border border-indigo-900/30">
                                                        <div className="flex justify-between items-center mb-1">
                                                            <span className="text-[8.5px] uppercase tracking-wider text-emerald-400 font-bold block">DIALOGUE_PT_BR (Locução)</span>
                                                            <button
                                                                onClick={() => cbCopyToClipboardText(scene.dialogue_pt_br, `Diálogo (Cena ${idx+1})`)}
                                                                className="text-[9px] text-slate-500 hover:text-emerald-355 flex items-center gap-1 font-bold"
                                                            >
                                                                <LucideIcon name="copy" className="w-2.5 h-2.5 text-emerald-450" /> Copy Dialogue
                                                            </button>
                                                        </div>
                                                        <p className="text-xs text-indigo-300 font-bold leading-relaxed font-sans">
                                                            "{scene.dialogue_pt_br || '...'}"
                                                        </p>
                                                    </div>

                                                    {cbProductLock && scene.product_lock_prompt_en && (
                                                        <div className="bg-indigo-950/10 p-2 rounded-lg border border-indigo-950/40 text-[9px]">
                                                            <span className="text-[8px] uppercase tracking-wider text-indigo-400 font-mono font-bold block mb-0.5">Product Lock Constraint</span>
                                                            <p className="text-slate-450 italic leading-relaxed">{scene.product_lock_prompt_en}</p>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex justify-end pt-1 border-t border-slate-850/60 pb-1">
                                                    <button
                                                        onClick={() => {
                                                            const txt = `CENA MODULE ${scene.scene_number || (idx+1)}: ${scene.title || ''}\nVisual: ${scene.visual_prompt_en || ''}\nAction: ${scene.action_prompt_en || ''}\nVoice: ${scene.voice_description_en || ''}\nSpoken: "${scene.dialogue_pt_br || ''}"\nProduct Lock: ${scene.product_lock_prompt_en || ''}`;
                                                            cbCopyToClipboardText(txt, `Cena ${idx+1} Completa`);
                                                        }}
                                                        className="bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-400 hover:text-white px-2.5 py-1 text-[9px] rounded font-bold cursor-pointer transition flex items-center gap-1.5"
                                                    >
                                                        <LucideIcon name="copy" className="w-3 h-3 text-indigo-455" /> Copiar Cena Completa (Bundle)
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {cbActiveOutputTab === 'flow' && (
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                                            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">FLOW / VEO 3 TIMELINE ACCELERATOR PACK</h4>
                                            <button
                                                onClick={handleCbCopyFlowPackage}
                                                className="bg-slate-850 hover:bg-slate-800 text-[10px] text-indigo-400 border border-slate-750 py-1 px-2.5 rounded flex items-center gap-1 cursor-pointer font-mono font-bold"
                                            >
                                                <LucideIcon name="copy" className="w-3 h-3" /> Copy Package
                                            </button>
                                        </div>
                                        <div className="bg-black/40 p-4 border border-slate-850 rounded-xl space-y-4 font-mono text-[11px] leading-relaxed text-slate-300">
                                            {cbResult.scenes?.map((scene: any, idx: number) => (
                                                <div key={idx} className="pb-3 border-b border-slate-900/80 last:border-0 last:pb-0">
                                                    <p className="text-indigo-450 font-bold font-sans">BLOCK {scene.scene_number || (idx + 1)} [{scene.title || 'SCENE'}] ({cbSecondsPerScene})</p>
                                                    <p className="text-rose-400"><span className="text-slate-500 font-bold">VISUAL_PROMPT_EN:</span> {scene.visual_prompt_en || ''}</p>
                                                    <p className="text-blue-400"><span className="text-slate-500 font-bold">CAMERA / ACTION:</span> {scene.action_prompt_en || ''}</p>
                                                    <p className="text-emerald-400"><span className="text-slate-500 font-bold">DIALOGUE_PT_BR:</span> "{scene.dialogue_pt_br || ''}"</p>
                                                    <p className="text-pink-400"><span className="text-slate-500 font-bold">VOICE:</span> {scene.voice_description_en || ''}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {cbActiveOutputTab === 'sora' && (
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                                            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">SORA 2 CONTINUITY SCRIPT SYNTHESIS</h4>
                                            <button
                                                onClick={() => {
                                                    const soraPkg = cbResult.scenes?.map((s: any) => `[Sora Section ${s.scene_number || ''}]\n${getSoraFormat(s)}`).join('\n\n');
                                                    cbCopyToClipboardText(soraPkg, "Pacote Sora 2");
                                                }}
                                                className="bg-slate-850 hover:bg-slate-800 text-[10px] text-indigo-400 border border-slate-750 py-1 px-2.5 rounded flex items-center gap-1 cursor-pointer font-mono font-bold"
                                            >
                                                <LucideIcon name="copy" className="w-3 h-3" /> Copy Sora Package
                                            </button>
                                        </div>
                                        <div className="space-y-4">
                                            {cbResult.scenes?.map((scene: any, idx: number) => (
                                                <div key={idx} className="bg-black/35 p-3.5 border border-slate-850/80 rounded-xl space-y-2 font-mono text-[10.5px]">
                                                    <p className="text-indigo-400 font-bold uppercase tracking-wider text-[9.5px]">Prompt de Transição Sora — Cena {idx + 1}</p>
                                                    <pre className="text-slate-350 italic break-words whitespace-pre-wrap leading-relaxed font-sans select-all p-3 bg-slate-950 border border-slate-900 rounded-lg">
                                                        {getSoraFormat(scene)}
                                                    </pre>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {cbActiveOutputTab === 'grok' && (
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                                            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">GROK VIDEO REALTIME GENERATIVE PROMPTS</h4>
                                            <button
                                                onClick={() => {
                                                    const grokPkg = cbResult.scenes?.map((s: any) => `[Grok Prompt ${s.scene_number || ''}]\n${getGrokFormat(s)}`).join('\n\n');
                                                    cbCopyToClipboardText(grokPkg, "Pacote Grok");
                                                }}
                                                className="bg-slate-850 hover:bg-slate-800 text-[10px] text-indigo-400 border border-slate-750 py-1 px-2.5 rounded flex items-center gap-1 cursor-pointer font-mono font-bold"
                                            >
                                                <LucideIcon name="copy" className="w-3 h-3" /> Copy Grok Package
                                            </button>
                                        </div>
                                        <div className="space-y-4">
                                            {cbResult.scenes?.map((scene: any, idx: number) => (
                                                <div key={idx} className="bg-black/35 p-3.5 border border-slate-850/80 rounded-xl space-y-2 font-mono text-[10.5px]">
                                                    <p className="text-indigo-450 font-bold uppercase tracking-wider text-[9.5px]">Grok Compiler Instruction — Scene {idx + 1}</p>
                                                    <pre className="text-slate-350 italic break-words whitespace-pre-wrap leading-relaxed font-sans select-all p-3 bg-slate-950 border border-slate-900 rounded-lg">
                                                        {getGrokFormat(scene)}
                                                    </pre>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {cbActiveOutputTab === 'json' && (
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                                            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">ESTRUTURA COMPLETA DA CAMPANHA (JSON RAW)</h4>
                                            <button
                                                onClick={handleCbCopyJSON}
                                                className="bg-slate-850 hover:bg-slate-800 text-[10px] text-indigo-400 border border-slate-750 py-1 px-2.5 rounded flex items-center gap-1 cursor-pointer font-mono font-bold"
                                            >
                                                <LucideIcon name="copy" className="w-3 h-3" /> Copy JSON Raw
                                            </button>
                                        </div>
                                        <pre className="text-[10px] text-slate-350 bg-black/50 p-4 border border-slate-850 rounded-xl font-mono overflow-auto max-h-[500px]">
                                            {JSON.stringify(cbResult, null, 2)}
                                        </pre>
                                    </div>
                                )}
                            </Card>

                            {/* REGENERATE VARIANTS SEGMENT */}
                            <Card className="bg-slate-900/40 p-4 border border-slate-800/80 select-none space-y-3">
                                <div className="flex items-center gap-2">
                                    <LucideIcon name="refresh-cw" className="w-4 h-4 text-indigo-400" />
                                    <div>
                                        <h4 className="text-[11.5px] font-bold text-white font-sans uppercase">Gerador Instantâneo de Variantes Adaptadas</h4>
                                        <p className="text-[9.5px] text-slate-400 font-sans">
                                            Gere versões alternativas com re-modelagem tonal completa mantendo seus assets intactos.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                    {[
                                        { key: 'Mais UGC', label: 'Mais UGC', style: 'border-indigo-500/30' },
                                        { key: 'Mais vendedor', label: 'Mais Vendedor (TikTok Shop)', style: 'border-pink-500/30' },
                                        { key: 'Mais emocional', label: 'Mais Emocional (Novela)', style: 'border-orange-500/30' },
                                        { key: 'Mais direto', label: 'Mais Direto & Gancho Ultra Rápido', style: 'border-blue-500/30' },
                                        { key: 'Mais premium', label: 'Mais Premium (Luxury Soft Sell)', style: 'border-amber-500/30' }
                                    ].map((variant) => (
                                        <button
                                            key={variant.key}
                                            onClick={() => handleCbGenerate(variant.key)}
                                            disabled={cbLoading}
                                            className="bg-slate-950 border border-slate-850 hover:bg-slate-850 text-slate-300 hover:text-white font-mono text-[9px] font-bold px-3 py-1.5 rounded-lg cursor-pointer transition flex items-center gap-1 hover:border-slate-700"
                                        >
                                            <LucideIcon name="zap" className="w-3 h-3 text-amber-400" />
                                            {variant.label}
                                        </button>
                                    ))}
                                </div>
                            </Card>
                        </div>
                    ) : generationDiagnostics ? (
                        <div className="space-y-4 animate-fade-in text-left">
                            <Card className="bg-slate-900 border-rose-500/30 p-6 space-y-5 rounded-2xl shadow-xl relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-rose-500 to-orange-500" />
                                
                                <div className="flex gap-4 items-start border-b border-slate-800 pb-4">
                                    <div className="p-3 bg-red-950/80 border border-red-800/40 text-red-450 rounded-xl">
                                        <LucideIcon name="alert-octagon" className="w-6 h-6 animate-pulse" />
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="text-base font-bold text-slate-100 font-sans tracking-wide">
                                            Falha na Conexão ou Resposta do Worker
                                        </h3>
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-rose-950/60 text-rose-300 border border-rose-800/25">
                                                Causa: {generationDiagnostics.status}
                                            </span>
                                            {generationDiagnostics.httpCode && (
                                                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800/25">
                                                    HTTP {generationDiagnostics.httpCode}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3.5">
                                    <div className="space-y-1 bg-red-950/15 border border-red-900/10 p-3.5 rounded-xl">
                                        <span className="block text-[10px] font-bold text-red-400 uppercase tracking-widest font-mono">
                                            Diagnóstico do Sistema
                                        </span>
                                        <p className="text-xs text-slate-200 leading-relaxed font-sans">
                                            {generationDiagnostics.possibleCause}
                                        </p>
                                    </div>

                                    <div className="space-y-1 bg-indigo-950/15 border border-indigo-900/10 p-3.5 rounded-xl">
                                        <span className="block text-[10px] font-bold text-indigo-400 uppercase tracking-widest font-mono">
                                            Instruções de Resolução Recomendadas
                                        </span>
                                        <p className="text-xs text-slate-200 leading-relaxed font-sans">
                                            {generationDiagnostics.recommendedAction}
                                        </p>
                                    </div>
                                </div>

                                {/* Expandable tech logs for troubleshooting */}
                                <div className="space-y-2 border-t border-slate-850 pt-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                            Logs Neurais Brutos do Worker
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (generationDiagnostics.payload) {
                                                    copyToClipboard(JSON.stringify(generationDiagnostics.payload, null, 2));
                                                    alert("Payload de depuração copiado para área de transferência!");
                                                }
                                            }}
                                            className="text-[9.5px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer font-mono font-bold"
                                        >
                                            <LucideIcon name="copy" className="w-3 h-3" /> Copiar Payload
                                        </button>
                                    </div>

                                    <div className="bg-slate-950 border border-slate-850 p-3 rounded-xl space-y-2 font-mono text-[9px] text-slate-400 leading-normal max-h-[300px] overflow-auto text-left">
                                        <p><span className="text-slate-500">Method & Endpoint:</span> POST {generationDiagnostics.endpoint}</p>
                                        <p><span className="text-slate-500">Headers Permitidos:</span> Content-Type: application/json, X-Client-Token: [RETREATED]</p>
                                        
                                        {generationDiagnostics.errorText && (
                                            <div className="border-t border-slate-900 pt-2 mt-2">
                                                <span className="text-slate-500 block text-[8px] uppercase tracking-wider mb-1 font-bold">Conteúdo Bruto do Erro:</span>
                                                <pre className="text-red-300 font-mono text-[9.5px] leading-relaxed whitespace-pre-wrap select-text break-words bg-red-950/20 p-2.5 rounded border border-red-900/25 max-h-[140px] overflow-auto">
                                                    {generationDiagnostics.errorText}
                                                </pre>
                                            </div>
                                        )}

                                        {generationDiagnostics.payload && (
                                            <div className="border-t border-slate-900 pt-2">
                                                <span className="text-slate-500 block text-[8px] uppercase tracking-wider mb-1 font-bold">Payload de Entrada (Campos de Prompts):</span>
                                                <pre className="text-slate-350 font-mono text-[9px] max-h-[150px] overflow-auto p-2 bg-slate-900 rounded border border-slate-850">
                                                    {JSON.stringify({
                                                        prompt_count: generationDiagnostics.payload.contents?.[0]?.parts?.length || 0,
                                                        payload_mime: generationDiagnostics.payload.generationConfig?.responseMimeType,
                                                        product_accuracy_lock_enabled: generationDiagnostics.payload.product_accuracy_lock_enabled,
                                                        product_analysis_summary: generationDiagnostics.payload.product_analysis ? "Present" : "None"
                                                    }, null, 2)}
                                                </pre>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex gap-2 justify-end pt-2">
                                    <button
                                        type="button"
                                        onClick={() => runHealthCheck()}
                                        className="px-4 py-2 bg-slate-850 hover:bg-slate-850 border border-slate-750 text-slate-300 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                                    >
                                        <LucideIcon name="activity" className="w-3.5 h-3.5" />
                                        Re-testar Canal
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleCbGenerate()}
                                        disabled={cbLoading}
                                        className="px-4.5 py-2 bg-indigo-650 hover:bg-indigo-600 border border-indigo-550/30 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
                                    >
                                        <LucideIcon name="refresh-cw" className="w-3.5 h-3.5" />
                                        Continuar Geração
                                    </button>
                                </div>
                            </Card>
                        </div>
                    ) : (
                        <Card className="bg-slate-900/60 border-slate-800/80 p-8 flex flex-col items-center justify-center min-h-[500px] text-center text-slate-450 space-y-4">
                            <div className="w-16 h-16 bg-slate-950 border border-slate-850 rounded-2xl flex items-center justify-center relative">
                                <LucideIcon name="sparkles" className="w-8 h-8 text-slate-700" />
                                <div className="absolute top-0 right-0 h-2.5 w-2.5 bg-indigo-500 rounded-full animate-ping" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-sm font-bold text-slate-300 font-sans uppercase tracking-wider">Aguardando Parâmetros para Compilação</h3>
                                <p className="text-xs text-slate-500 max-w-sm font-sans mx-auto leading-relaxed">
                                    Configure os dados do produto, carregue prova social e defina o arquétipo do seu avatar à esquerda. Clique em "Construir Campanha" para compilar a matriz completa.
                                </p>
                            </div>
                        </Card>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="max-w-7xl mx-auto animate-fade-in space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
                        <LucideIcon name="clapperboard" className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white font-sans text-left">Creative Director AI</h2>
                        <p className="text-xs text-slate-400 font-sans text-left">Criação de prompts e roteirização inteligente de alta retenção a partir do zero.</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    {/* Navegação entre abas principais */}
                    <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-850/85">
                        <button
                            type="button"
                            onClick={() => setMainTab('director')}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-sans text-xs font-bold transition-all cursor-pointer ${
                                mainTab === 'director'
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/15'
                                    : 'text-slate-450 hover:text-slate-200'
                            }`}
                        >
                            <LucideIcon name="film" className="w-4 h-4" />
                            <span>Creative Director</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setMainTab('campaign')}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-sans text-xs font-bold transition-all cursor-pointer ${
                                mainTab === 'campaign'
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/15'
                                    : 'text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            <LucideIcon name="package" className="w-4 h-4 text-indigo-400" />
                            <span>Campaign Builder</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setMainTab('scene2_compiler')}
                            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-sans text-xs font-bold transition-all cursor-pointer ${
                                mainTab === 'scene2_compiler'
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/15'
                                    : 'text-emerald-400 hover:text-emerald-300'
                            }`}
                            title="Contrato Arquitetural P0: Compilador Determinístico para Cena 2"
                        >
                            <LucideIcon name="cpu" className="w-4 h-4 text-emerald-400" />
                            <span>Scene 2 Compiler</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setMainTab('scene3_compiler')}
                            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-sans text-xs font-bold transition-all cursor-pointer ${
                                mainTab === 'scene3_compiler'
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/15'
                                    : 'text-emerald-400 hover:text-emerald-300'
                            }`}
                            title="Contrato Arquitetural P0: Compilador Determinístico para Cena 3"
                        >
                            <LucideIcon name="zap" className="w-4 h-4 text-emerald-400" />
                            <span>Scene 3 Compiler</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setMainTab('shopee_scenes')}
                            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-sans text-xs font-bold transition-all cursor-pointer ${
                                mainTab === 'shopee_scenes'
                                    ? 'bg-orange-600 text-white shadow-lg shadow-orange-500/20'
                                    : 'text-orange-400 hover:text-orange-300'
                            }`}
                            title="Shopee Scene Hub: 3 Cenas UGC Sequenciais (Gancho 3s + Demonstração 8s + CTA 8s)"
                        >
                            <LucideIcon name="video" className="w-4 h-4 text-orange-400" />
                            <span>Shopee Scene Hub</span>
                        </button>
                    </div>
                    {lastSavedTimestamp && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-900/80 border border-slate-800 rounded-lg text-[10px] font-mono text-slate-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            <span>Salvo {new Date(lastSavedTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                        </div>
                    )}
                </div>
            </div>

            {pendingRestoreSession && (
                <div className="bg-indigo-950/90 border border-indigo-500/40 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xl backdrop-blur-sm animate-fade-in">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg border border-indigo-500/30">
                            <LucideIcon name="history" className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-white font-sans">
                                Sessão salva do Creative Director encontrada
                            </h4>
                            <p className="text-xs text-slate-300 font-sans">
                                {pendingRestoreSession.productName || pendingRestoreSession.cbProductName 
                                    ? `Produto: "${pendingRestoreSession.productName || pendingRestoreSession.cbProductName}" • Salvo em ${new Date(pendingRestoreSession.savedAt).toLocaleTimeString()}`
                                    : `Trabalho salvo em ${new Date(pendingRestoreSession.savedAt).toLocaleTimeString()}`}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                            type="button"
                            onClick={() => {
                                handleRestore(pendingRestoreSession);
                                setPendingRestoreSession(null);
                            }}
                            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold font-sans transition flex items-center gap-1.5 cursor-pointer shadow-md"
                        >
                            <LucideIcon name="rotate-ccw" className="w-3.5 h-3.5" />
                            Restaurar Sessão
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                clearCreativeDirectorSession();
                                setPendingRestoreSession(null);
                            }}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-bold font-sans transition cursor-pointer"
                        >
                            Descartar
                        </button>
                    </div>
                </div>
            )}

            <ViralHandoffBanner 
                onImportBriefing={handleImportViralBriefing}
                onCompileScenes={handleCompileViralScenes}
            />

            <div className={mainTab === 'scene2_compiler' ? 'block' : 'hidden'}>
                <Scene2CompilerPanel
                    currentKey={currentKey}
                    defaultProductName={productName || cbProductName}
                    defaultCategory={category || cbProductCategory}
                    defaultProductImage={productImage || cbProductImages[0]}
                    defaultAvatarImage={avatarImage || cbAvatarImage}
                    detectedFacts={aiAnalysis?.key_shape_features || []}
                    detectedVisibleDetails={aiAnalysis?.materials_and_texture || []}
                    ctaHandoff={scene3CtaHandoff}
                    onSendCtaToScene3={(handoff) => setScene3CtaHandoff(handoff)}
                    onClearCtaHandoff={() => setScene3CtaHandoff(null)}
                    productWorkspace={productWorkspace}
                    onUploadProductImage={handleSharedProductImage}
                    onRemoveProductImage={handleRemoveSharedProduct}
                    onAnalyzeProduct={handleAnalyzeSharedProduct}
                    onUpdateProductContext={handleUpdateSharedProductContext}
                    compilerSnapshot={scene2CompilerSnapshot}
                    onCompilerSnapshotChange={setScene2CompilerSnapshot}
                    isRestoring={isRestoringRef.current}
                />
            </div>

            <div className={mainTab === 'scene3_compiler' ? 'block' : 'hidden'}>
                <Scene3CompilerPanel
                    currentKey={currentKey}
                    defaultProductName={productName || cbProductName}
                    defaultCategory={category || cbProductCategory}
                    defaultProductImage={productImage || cbProductImages[0]}
                    defaultAvatarImage={avatarImage || cbAvatarImage}
                    detectedFacts={aiAnalysis?.key_shape_features || []}
                    detectedVisibleDetails={aiAnalysis?.materials_and_texture || []}
                    ctaHandoff={scene3CtaHandoff}
                    onClearCtaHandoff={() => setScene3CtaHandoff(null)}
                    productWorkspace={productWorkspace}
                    onUploadProductImage={handleSharedProductImage}
                    onRemoveProductImage={handleRemoveSharedProduct}
                    onAnalyzeProduct={handleAnalyzeSharedProduct}
                    onUpdateProductContext={handleUpdateSharedProductContext}
                    compilerSnapshot={scene3CompilerSnapshot}
                    onCompilerSnapshotChange={setScene3CompilerSnapshot}
                    isRestoring={isRestoringRef.current}
                />
            </div>

            <div className={mainTab === 'shopee_scenes' ? 'block' : 'hidden'}>
                <ShopeeSceneHubPanel
                    productWorkspace={productWorkspace}
                    onUploadProductImage={handleSharedProductImage}
                    onRemoveProductImage={handleRemoveSharedProduct}
                    onAnalyzeProduct={handleAnalyzeSharedProduct}
                    onUpdateProductContext={handleUpdateSharedProductContext}
                    sessionSnapshot={shopeeSceneHubSnapshot}
                    onSessionSnapshotChange={setShopeeSceneHubSnapshot}
                />
            </div>

            <div className={mainTab === 'campaign' ? 'block' : 'hidden'}>
                {renderCampaignBuilder()}
            </div>

            <div className={(mainTab !== 'scene2_compiler' && mainTab !== 'scene3_compiler' && mainTab !== 'campaign' && mainTab !== 'shopee_scenes') ? 'block' : 'hidden'}>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* INPUT PANEL */}
                <div className="lg:col-span-5 space-y-4">
                    <Card className="bg-slate-900/60 border-slate-800/80 p-5 space-y-4">
                        <span className="text-[10px] uppercase font-bold text-indigo-400 block tracking-wider font-mono">Painel de Inputs Criativos</span>
                        
                        <div className="space-y-3 font-sans text-xs">
                            {/* Product Image input */}
                            <div 
                                onClick={() => setActiveUploadSlot('product')}
                                className={`p-3 rounded-xl border transition-all duration-200 cursor-pointer ${
                                    activeUploadSlot === 'product' 
                                        ? 'border-indigo-500 bg-indigo-950/15 shadow-indigo-500/10 shadow-lg' 
                                        : 'border-slate-800 bg-slate-950/20 hover:border-slate-700'
                                }`}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <label className="block text-slate-400 font-semibold text-xs flex items-center gap-1.5">
                                        Foto do Produto (Análise Visual)
                                        {activeUploadSlot === 'product' && (
                                            <span className="text-[8px] bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded-full font-mono uppercase font-bold animate-pulse">Ativo para Paste (Ctrl+V)</span>
                                        )}
                                    </label>
                                </div>
                                <div className="grid grid-cols-5 gap-2 items-center">
                                    <div className="col-span-2 h-14 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-center relative overflow-hidden">
                                        {productImage && (typeof productImage === 'object' || (productImage as any).warning) ? (
                                            <div className="flex flex-col items-center justify-center p-2 text-center text-[9px] text-rose-450 leading-tight">
                                                <LucideIcon name="alert-triangle" className="w-4 h-4 text-rose-500 mb-0.5 animate-pulse" />
                                                <span>Reenvio necessário</span>
                                            </div>
                                        ) : productImage ? (
                                            <>
                                                <img src={productImage} className="max-h-full max-w-full object-cover" />
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setProductImage(null);
                                                        setAiAnalysis(null);
                                                        setDetectedProductData(null);
                                                    }}
                                                    className="absolute top-1 right-1 bg-black/60 hover:bg-black/95 text-slate-400 hover:text-white p-0.5 rounded cursor-pointer transition z-10"
                                                    title="Remover Imagem"
                                                >
                                                    <LucideIcon name="x" className="w-3 h-3" />
                                                </button>
                                            </>
                                        ) : (
                                            <LucideIcon name="image" className="w-5 h-5 text-slate-600" />
                                        )}
                                    </div>
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveUploadSlot('product');
                                        }}
                                        onChange={handleProductFileChange} 
                                        className="col-span-3 bg-slate-950 border border-slate-800 p-1 rounded font-mono text-[9px] cursor-pointer" 
                                    />
                                </div>
                                <p className="text-[10px] text-slate-500 mt-1">
                                    Upload, arraste ou pressione Ctrl+V para colar imagem
                                </p>
                                {productImage && (
                                    <button
                                        type="button"
                                        id="btn-analyze-product"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            e.preventDefault();
                                            setProductAnalysisTriggerSource('manual_analyze_click');
                                            runVisualAnalysis(productImage);
                                        }}
                                        disabled={analyzingImage}
                                        className="mt-2 w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-850 disabled:text-slate-400 text-white py-1 px-2.5 rounded font-mono text-[10px] font-bold cursor-pointer transition flex justify-center items-center gap-1.5 shadow-sm"
                                    >
                                        <LucideIcon name="sparkles" className="w-3.5 h-3.5" />
                                        Analisar Produto
                                    </button>
                                )}
                                {analysisWarning && (
                                    <div className="mt-2 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-lg p-2 text-[10px] leading-normal font-sans animate-fade-in flex items-start gap-1">
                                        <LucideIcon name="alert-triangle" className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-500" />
                                        <span>{analysisWarning}</span>
                                    </div>
                                )}
                                {pasteError && activeUploadSlot === 'product' && (
                                    <p className="text-[10px] text-red-400 mt-1 leading-tight font-sans">
                                        {pasteError}
                                    </p>
                                )}
                                {pasteFeedback && activeUploadSlot === 'product' && (
                                    <p className="text-[10px] text-emerald-450 mt-1 leading-tight font-sans animate-fade-in">
                                        ✓ {pasteFeedback.message} ({pasteFeedback.name})
                                    </p>
                                )}
                            </div>

                            {/* Scanning state */}
                            {analyzingImage && (
                                <div className="p-4 bg-indigo-950/20 border border-indigo-500/20 rounded-xl space-y-3 animate-pulse">
                                    <div className="flex items-center gap-2 text-indigo-400">
                                        <LucideIcon name="loader-2" className="w-4 h-4 animate-spin" />
                                        <span className="font-mono text-xs font-bold uppercase tracking-wider">Escaneando Produto por IA...</span>
                                    </div>
                                    <div className="h-1 bg-indigo-500/10 rounded-full overflow-hidden">
                                        <div className="h-full bg-indigo-500 w-1/2 rounded-full animate-pulse"></div>
                                    </div>
                                    <p className="text-[10px] text-slate-400 leading-normal">
                                        Analisando pixels, reconhecendo marca/categoria, público-alvo ideal e projetando estilo de voz de alta conversão...
                                    </p>
                                </div>
                            )}

                            {/* NEW: AUTOMATICALLY DETECTED PRODUCT PANEL */}
                            {detectedProductData && !analyzingImage && !hideRecommendation && (
                                <div className="p-4 bg-slate-900 border-2 border-indigo-500/40 rounded-xl space-y-3 shadow-2xl animate-fade-in relative">
                                    <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/10 rounded-full blur-xl pointer-events-none"></div>
                                    <div className="flex items-center gap-2 text-indigo-400 font-sans font-bold text-xs select-none border-b border-slate-800 pb-2">
                                        <LucideIcon name="tag" className="w-4 h-4 text-indigo-400" />
                                        <span>Produto Detectado Automaticamente</span>
                                        <span className="ml-auto bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[9px] px-1.5 py-0.5 rounded font-mono font-bold tracking-wider">
                                            IA SUGGESTION
                                        </span>
                                    </div>

                                    <div className="space-y-2 text-xs">
                                        <div className="grid grid-cols-2 gap-2 bg-slate-950/70 p-2.5 rounded-lg border border-slate-850">
                                            <div>
                                                <span className="text-[9px] text-slate-500 block uppercase font-mono font-bold">Nome Sugerido</span>
                                                <span className="font-extrabold text-slate-100 font-sans block truncate">{detectedProductData.productName || 'Não identificado'}</span>
                                            </div>
                                            <div>
                                                <span className="text-[9px] text-slate-500 block uppercase font-mono font-bold">Nicho Sugerido</span>
                                                <span className="font-extrabold text-indigo-400 font-sans block truncate">
                                                    {STRATEGIC_PRODUCT_CATEGORY_LABELS[detectedProductData.detectedStrategicCategory] || detectedProductData.detectedStrategicCategory || 'Outro'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex justify-between items-center text-[11px] leading-none px-1">
                                            <span className="text-slate-450 uppercase font-mono font-bold text-[9px]">Confiança</span>
                                            <span className="text-emerald-450 font-mono font-extrabold flex items-center gap-1 text-xs">
                                                <span className="relative flex h-2 w-2">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                                </span>
                                                {Math.max(detectedProductData.productNameConfidence || 92, detectedProductData.categoryConfidence || 87)}%
                                            </span>
                                        </div>

                                        {/* Visual Evidences */}
                                        <div className="bg-slate-950/40 border border-slate-850/60 p-2.5 rounded-lg space-y-1">
                                            <span className="text-[9px] text-slate-500 block uppercase font-mono font-bold select-none">Evidências Visuais Detectadas</span>
                                            <p className="text-[10.5px] text-slate-300 leading-normal font-sans italic">
                                                "{detectedProductData.productDescription || detectedProductData.product_dna?.visible_logo || 'Atributos e marcas visuais identificados pela visão computacional do modelo.'}"
                                            </p>
                                        </div>

                                        {/* Action buttons */}
                                        <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-800/60 select-none">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    handleApplyDetectedData();
                                                    // Trigger notification
                                                    setCbCopyStatus("✓ Dados da análise aplicados com sucesso!");
                                                    setTimeout(() => setCbCopyStatus(""), 3000);
                                                }}
                                                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-1.5 px-3 rounded text-[10.5px] cursor-pointer transition flex justify-center items-center gap-1 shadow-sm font-sans"
                                            >
                                                <LucideIcon name="check" className="w-3.5 h-3.5" />
                                                Aplicar
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setHideRecommendation(true)}
                                                className="flex-1 bg-slate-800 hover:bg-slate-700 hover:text-white text-slate-300 font-bold py-1.5 px-3 rounded text-[10.5px] cursor-pointer transition flex justify-center items-center gap-1 border border-slate-700 font-sans"
                                            >
                                                <LucideIcon name="x" className="w-3.5 h-3.5" />
                                                Ignorar
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    // Scroll to the input fields of product identity
                                                    const targetEl = document.getElementById("product-name-input") || document.getElementById("creative-mode-select");
                                                    if (targetEl) {
                                                        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                        targetEl.focus();
                                                    }
                                                }}
                                                className="w-full bg-slate-950/85 hover:bg-slate-90/80 hover:text-white border border-slate-800 text-slate-400 font-bold py-1.5 px-3 rounded text-[10.5px] cursor-pointer transition flex justify-center items-center gap-1 font-sans"
                                            >
                                                <LucideIcon name="edit-3" className="w-3.5 h-3.5" />
                                                Editar manualmente
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* PRODUCT INSIGHTS PANEL & CONFIDENCE SCORES */}
                            {aiAnalysis && !analyzingImage && (
                                <div className="p-4 bg-[#0F172A]/70 border border-slate-800 rounded-xl space-y-4 shadow-xl animate-fade-in relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>

                                    <div className="flex items-center justify-between border-b border-indigo-500/10 pb-2">
                                        <div className="flex items-center gap-1.5 text-indigo-400">
                                            <LucideIcon name="zoom-in" className="w-4 h-4 text-indigo-500" />
                                            <span className="font-mono text-[9px] font-black uppercase tracking-wider font-bold">DNA Diagnóstico do Produto</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleApplyDetectedData}
                                            className="text-[9px] bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-0.5 rounded-full font-mono font-bold cursor-pointer transition animate-pulse flex items-center gap-0.5 shadow"
                                        >
                                            <LucideIcon name="sparkles" className="w-2.5 h-2.5" /> Autofill Formulário
                                        </button>
                                    </div>

                                    {/* Confidence Scores Grid */}
                                    <div className="grid grid-cols-3 gap-1 bg-slate-950/60 p-2 rounded-lg border border-slate-850/60 text-center">
                                        <div>
                                            <span className="text-[8px] text-slate-500 block uppercase font-mono font-bold">Produto</span>
                                            <span className="text-[11px] font-mono font-bold text-emerald-450">{aiAnalysis.productNameConfidence || 92}%</span>
                                        </div>
                                        <div className="border-x border-slate-800/80">
                                            <span className="text-[8px] text-slate-500 block uppercase font-mono font-bold">Categoria</span>
                                            <span className="text-[11px] font-mono font-bold text-indigo-400">{aiAnalysis.categoryConfidence || 87}%</span>
                                        </div>
                                        <div>
                                            <span className="text-[8px] text-slate-500 block uppercase font-mono font-bold">Estilo Voz</span>
                                            <span className="text-[11px] font-mono font-bold text-amber-400">{aiAnalysis.voiceStyleConfidence || 95}%</span>
                                        </div>
                                    </div>

                                    {/* Collapsible Details toggle */}
                                    <div className="flex justify-center border-t border-slate-800/60 pt-2">
                                        <button 
                                            type="button"
                                            onClick={() => setIsProductPanelOpen(!isProductPanelOpen)}
                                            className="px-3 py-1 font-mono text-[9px] text-slate-400 hover:text-white rounded bg-slate-950 border border-slate-850 hover:border-slate-700 flex items-center gap-1 cursor-pointer transition"
                                        >
                                            <LucideIcon name={isProductPanelOpen ? "chevron-up" : "chevron-down"} className="w-3.5 h-3.5 text-indigo-450" />
                                            {isProductPanelOpen ? "Recolher Diagnóstico" : "Ver Diagnóstico Detalhado"}
                                        </button>
                                    </div>

                                    {isProductPanelOpen && (
                                        <div className="space-y-2.5 border-t border-slate-800/40 pt-2.5 text-[11px] text-slate-350 animate-fade-in">
                                            <div>
                                                <span className="uppercase text-[8px] text-slate-500 block font-mono font-extrabold tracking-wide">Público-Alvo Ideal</span>
                                                <p className="text-slate-200 leading-normal">{aiAnalysis.targetAudience}</p>
                                            </div>

                                            <div>
                                                <span className="uppercase text-[8px] text-slate-500 block font-mono font-extrabold tracking-wide">Tom de Comunicação</span>
                                                <p className="text-slate-200 leading-normal">{aiAnalysis.communicationTone}</p>
                                            </div>

                                            <div>
                                                <span className="uppercase text-[8px] text-slate-500 block font-mono font-extrabold tracking-wide">Estilo de Voz</span>
                                                <p className="text-slate-200 leading-normal">{aiAnalysis.recommendedVoiceStyle}</p>
                                            </div>
                                        </div>
                                    )}

                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-2">
                                <div 
                                    onClick={() => setActiveUploadSlot('scenario')}
                                    className={`p-2 rounded-xl border transition-all duration-200 cursor-pointer ${
                                        activeUploadSlot === 'scenario' 
                                            ? 'border-indigo-500 bg-indigo-950/15 shadow-indigo-500/10' 
                                            : 'border-slate-800 bg-slate-950/20 hover:border-slate-700'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="block text-[10px] text-slate-400 font-semibold">Cenário Ref</label>
                                        {activeUploadSlot === 'scenario' && (
                                            <span className="text-[7px] bg-indigo-500/30 text-indigo-300 px-1 rounded font-mono uppercase">Ctrl+V</span>
                                        )}
                                    </div>
                                    <div className="h-10 bg-slate-950 rounded border border-slate-850 flex items-center justify-center overflow-hidden relative mb-1">
                                        {scenarioImage ? (
                                            <>
                                                <img src={scenarioImage} className="max-h-full max-w-full object-cover" />
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setScenarioImage(null); }}
                                                    className="absolute top-0.5 right-0.5 bg-black/60 hover:bg-black text-slate-400 hover:text-white p-0.5 rounded cursor-pointer transition z-10"
                                                >
                                                    <LucideIcon name="x" className="w-2.5 h-2.5" />
                                                </button>
                                            </>
                                        ) : (
                                            <LucideIcon name="landscape" className="w-4 h-4 text-slate-600" />
                                        )}
                                    </div>
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        onClick={(e) => { e.stopPropagation(); setActiveUploadSlot('scenario'); }}
                                        onChange={(e) => handleFileChange(e, setScenarioImage)} 
                                        className="w-full bg-slate-950 border border-slate-800 p-0.5 rounded font-mono text-[8.5px]" 
                                    />
                                    {scenarioImage && typeof scenarioImage === 'object' && (
                                        <p className="text-[8px] text-rose-450 mt-0.5 font-sans leading-tight">✓ Reenvio necessário.</p>
                                    )}
                                </div>

                                <div 
                                    onClick={() => setActiveUploadSlot('avatar')}
                                    className={`p-2 rounded-xl border transition-all duration-200 cursor-pointer ${
                                        activeUploadSlot === 'avatar' 
                                            ? 'border-indigo-500 bg-indigo-950/15 shadow-indigo-500/10' 
                                            : 'border-slate-800 bg-slate-950/20 hover:border-slate-700'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="block text-[10px] text-slate-400 font-semibold">Avatar de IA</label>
                                        {activeUploadSlot === 'avatar' && (
                                            <span className="text-[7px] bg-indigo-500/30 text-indigo-300 px-1 rounded font-mono uppercase">Ctrl+V</span>
                                        )}
                                    </div>
                                    <div className="h-10 bg-slate-950 rounded border border-slate-850 flex items-center justify-center overflow-hidden relative mb-1">
                                        {avatarImage ? (
                                            <>
                                                <img src={avatarImage} className="max-h-full max-w-full object-cover" />
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setAvatarImage(null); }}
                                                    className="absolute top-0.5 right-0.5 bg-black/60 hover:bg-black text-slate-400 hover:text-white p-0.5 rounded cursor-pointer transition z-10"
                                                >
                                                    <LucideIcon name="x" className="w-2.5 h-2.5" />
                                                </button>
                                            </>
                                        ) : (
                                            <LucideIcon name="user" className="w-4 h-4 text-slate-600" />
                                        )}
                                    </div>
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        onClick={(e) => { e.stopPropagation(); setActiveUploadSlot('avatar'); }}
                                        onChange={(e) => handleFileChange(e, setAvatarImage)} 
                                        className="w-full bg-slate-950 border border-slate-800 p-0.5 rounded font-mono text-[8.5px]" 
                                    />
                                    {avatarImage && typeof avatarImage === 'object' && (
                                        <p className="text-[8px] text-rose-450 mt-0.5 font-sans leading-tight">✓ Reenvio necessário.</p>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div 
                                    onClick={() => setActiveUploadSlot('refVideo')}
                                    className={`p-2 rounded-xl border transition-all duration-200 cursor-pointer ${
                                        activeUploadSlot === 'refVideo' 
                                            ? 'border-indigo-500 bg-indigo-950/15 shadow-indigo-500/10' 
                                            : 'border-slate-800 bg-slate-950/20 hover:border-slate-700'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="block text-[10px] text-slate-400 font-semibold">Vídeo Ref</label>
                                        {activeUploadSlot === 'refVideo' && (
                                            <span className="text-[7px] bg-indigo-500/30 text-indigo-300 px-1 rounded font-mono uppercase">Ctrl+V</span>
                                        )}
                                    </div>
                                    <div className="h-10 bg-slate-950 rounded border border-slate-850 flex items-center justify-center overflow-hidden relative mb-1 p-1 text-center">
                                        {refVideo ? (
                                            <div className="flex items-center gap-1 justify-center">
                                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                                <span className="text-[8.5px] text-slate-350 truncate max-w-[80px]">Vídeo pronto</span>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setRefVideo(null); }}
                                                    className="absolute top-0.5 right-0.5 bg-black/60 hover:bg-black text-slate-400 hover:text-white p-0.5 rounded cursor-pointer transition z-10"
                                                >
                                                    <LucideIcon name="x" className="w-2.5 h-2.5" />
                                                </button>
                                            </div>
                                        ) : (
                                            <LucideIcon name="video" className="w-4 h-4 text-slate-600" />
                                        )}
                                    </div>
                                    <input 
                                        type="file" 
                                        accept="video/*" 
                                        onClick={(e) => { e.stopPropagation(); setActiveUploadSlot('refVideo'); }}
                                        onChange={(e) => handleFileChange(e, setRefVideo)} 
                                        className="w-full bg-slate-950 border border-slate-800 p-0.5 rounded font-mono text-[8.5px]" 
                                    />
                                    {refVideo && typeof refVideo === 'object' && (
                                        <p className="text-[8px] text-rose-450 mt-0.5 font-sans leading-tight">✓ Reenvio necessário.</p>
                                    )}
                                </div>

                                <div 
                                    onClick={() => setActiveUploadSlot('refImage')}
                                    className={`p-2 rounded-xl border transition-all duration-200 cursor-pointer ${
                                        activeUploadSlot === 'refImage' 
                                            ? 'border-indigo-500 bg-indigo-950/15 shadow-indigo-500/10' 
                                            : 'border-slate-800 bg-slate-950/20 hover:border-slate-700'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="block text-[10px] text-slate-400 font-semibold">Moodboard (Img)</label>
                                        {activeUploadSlot === 'refImage' && (
                                            <span className="text-[7px] bg-indigo-500/30 text-indigo-300 px-1 rounded font-mono uppercase">Ctrl+V</span>
                                        )}
                                    </div>
                                    <div className="h-10 bg-slate-950 rounded border border-slate-850 flex items-center justify-center overflow-hidden relative mb-1">
                                        {refImage ? (
                                            <>
                                                <img src={refImage} className="max-h-full max-w-full object-cover" />
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setRefImage(null); }}
                                                    className="absolute top-0.5 right-0.5 bg-black/60 hover:bg-black text-slate-400 hover:text-white p-0.5 rounded cursor-pointer transition z-10"
                                                >
                                                    <LucideIcon name="x" className="w-2.5 h-2.5" />
                                                </button>
                                            </>
                                        ) : (
                                            <LucideIcon name="image" className="w-4 h-4 text-slate-600" />
                                        )}
                                    </div>
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        onClick={(e) => { e.stopPropagation(); setActiveUploadSlot('refImage'); }}
                                        onChange={(e) => handleFileChange(e, setRefImage)} 
                                        className="w-full bg-slate-950 border border-slate-800 p-0.5 rounded font-mono text-[8.5px]" 
                                    />
                                    {refImage && typeof refImage === 'object' && (
                                        <p className="text-[8px] text-rose-450 mt-0.5 font-sans leading-tight">✓ Reenvio necessário.</p>
                                    )}
                                </div>
                            </div>

                            {/* 🎯 Target IA Selection */}
                            <div className="bg-slate-900/40 p-3.5 rounded-xl border border-slate-850 space-y-2 mb-1.5">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block font-mono flex items-center gap-1">
                                        <LucideIcon name="cpu" className="w-3.5 h-3.5 text-indigo-400" />
                                        Engine Otimizadora Alvo (Economia de Tokens)
                                    </label>
                                    <span className="text-[8px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full font-mono font-bold">
                                        Target IA
                                    </span>
                                </div>
                                <div className="grid grid-cols-3 gap-1.5 text-[10px] font-mono">
                                    {['veo', 'sora', 'grok'].map(m => (
                                        <button 
                                            key={m} 
                                            type="button"
                                            onClick={() => setModelStructureSource(m as 'veo' | 'sora' | 'grok')} 
                                            className={`p-1.5 rounded border transition-all cursor-pointer text-center font-bold uppercase ${
                                                modelStructureSource === m 
                                                    ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300 shadow-md shadow-indigo-500/5' 
                                                    : 'border-slate-800 hover:border-slate-750 bg-slate-950 text-slate-400 hover:text-slate-200'
                                            }`}
                                        >
                                            {m === 'veo' ? 'Veo 3 / Flow' : m === 'sora' ? 'Sora 2' : 'Grok'}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-[8.5px] text-slate-500 leading-tight font-sans">
                                    Selecione o modelo de IA de vídeo alvo. O Creative Director irá estruturar e gerar prompts especificamente calibrados para este modelo, economizando até 70% de tokens e gerando respostas mais rápidas.
                                </p>
                            </div>

                            {/* Basic descriptors */}
                            <div>
                                <label className="block text-slate-400 mb-1 font-semibold">Nome do Produto</label>
                                <input 
                                    type="text" 
                                    value={productName} 
                                    onChange={(e) => { setProductName(e.target.value); setHasUserEditedProductName(true); }} 
                                    placeholder="Ex: Escova Elétrica Anti-Frizz" 
                                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 outline-none focus:border-indigo-500 transition" 
                                />
                            </div>

                            {/* 🎯 Adaptar para Plataforma */}
                            <div className="space-y-2 border-t border-slate-800/60 pt-3">
                                <label className="block text-slate-400 mb-1.5 font-semibold flex items-center gap-1.5 text-xs">
                                    <LucideIcon name="smartphone" className="w-4 h-4 text-indigo-400" />
                                    Adaptar para Plataforma (Inteligência Ativa)
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-[10px]">
                                    {Object.keys(PLATFORMS_INTELLIGENCE).map((platName) => {
                                        const intel = PLATFORMS_INTELLIGENCE[platName];
                                        const isSelected = platform === platName;
                                        return (
                                            <button
                                                key={platName}
                                                type="button"
                                                onClick={() => handlePlatformChangeInternal(platName)}
                                                className={`p-2 rounded-xl border transition-all text-left flex flex-col justify-between h-[74px] cursor-pointer ${
                                                    isSelected 
                                                        ? intel.borderActive + " ring-1 ring-indigo-500/20" 
                                                        : "bg-slate-950/60 border-slate-800/80 text-slate-400 " + intel.bgHover
                                                }`}
                                            >
                                                <div className="flex items-center gap-1">
                                                    <LucideIcon name={intel.icon} className={`w-3.5 h-3.5 ${isSelected ? 'text-indigo-400' : 'text-slate-500'}`} />
                                                    <span className={`font-bold truncate text-[9px] ${isSelected ? 'text-white' : ''}`}>{intel.name}</span>
                                                </div>
                                                <div className="space-y-0.5 mt-1 border-t border-slate-800/40 pt-1 w-full">
                                                    <span className="text-[7.5px] text-slate-400 block truncate font-sans">CTA: {intel.ctaHint}</span>
                                                    <span className="text-[7.5px] text-slate-500 block font-sans">Tempo: {intel.durationHint}</span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Active Platform Conversion Intelligence Details card */}
                                {platform && PLATFORMS_INTELLIGENCE[platform] && (() => {
                                    const intel = PLATFORMS_INTELLIGENCE[platform];
                                    return (
                                        <div className="bg-slate-950/40 border border-slate-850 rounded-xl p-3 space-y-2 animate-fade-in text-xs font-sans mt-2">
                                            <div className="flex items-center justify-between border-b border-indigo-500/10 pb-1.5">
                                                <div className="flex items-center gap-1.5 text-indigo-400 font-bold uppercase tracking-wider font-mono text-[9px]">
                                                    <LucideIcon name="eye" className="w-3.5 h-3.5 text-indigo-450" />
                                                    Inteligência de Canal — {intel.name}
                                                </div>
                                                <span className="text-[8px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full font-mono font-bold">
                                                    Autofill Active
                                                </span>
                                            </div>

                                            <div className="space-y-1 text-slate-300">
                                                <span className="text-[8px] uppercase font-bold text-slate-500 block font-mono">Características de Conversão:</span>
                                                <ul className="space-y-0.5 text-[10px]">
                                                    {intel.characteristics.map((char, i) => (
                                                        <li key={i} className="text-slate-400 leading-tight flex items-start gap-1">
                                                            <span className="text-indigo-500 font-bold">•</span>
                                                            {char}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-slate-800/65 text-[10px]">
                                                <div>
                                                    <span className="text-[8.5px] uppercase font-bold text-slate-550 block font-mono">Chamada (CTA) Padrão:</span>
                                                    <span className="text-indigo-300 font-semibold font-sans italic">"{intel.ctaHint}"</span>
                                                </div>
                                                <div>
                                                    <span className="text-[8.5px] uppercase font-bold text-slate-550 block font-mono">Voz Recomendada:</span>
                                                    <span className="text-slate-300 font-semibold">{intel.defaultVoiceStyle} ({intel.durationHint})</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-slate-400 mb-1">Nicho / Categoria</label>
                                    <select value={category} onChange={(e) => { setCategory(e.target.value); setHasUserEditedCategory(true); }} className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-1.5 text-slate-300">
                                        <option>👗 Roupas Femininas & Lingerie</option>
                                        <option>💄 Beleza & Cuidados Pessoais</option>
                                        <option>📱 Celulares & Eletrônicos</option>
                                        <option>💪 Saúde & Bem-Estar</option>
                                        <option>⌚ Relógios & Joias</option>
                                        <option>🏠 Casa & Cozinha</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-slate-400 mb-1">Duração Alvo</label>
                                    <select value={duration} onChange={(e) => setDuration(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-1.5 text-slate-300">
                                        {TARGET_DURATION_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-slate-400 mb-1">Objetivo</label>
                                    <select value={objective} onChange={(e) => setObjective(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-1.5 text-slate-300">
                                        {OBJECTIVE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-slate-400 mb-1">Estilo Visual</label>
                                    <select value={visualStyle} onChange={(e) => setVisualStyle(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-1.5 text-slate-300">
                                        {VISUAL_AESTHETIC_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div className="relative group/voice">
                                    <div className="flex items-center justify-between">
                                        <label className="block text-slate-400 mb-1">Estilo de Voz</label>
                                        <div className="inline-flex items-center gap-1 text-[10px] text-slate-500 cursor-pointer group-hover/voice:text-indigo-400 transition-colors mr-1">
                                            <LucideIcon name="help-circle" className="w-3.5 h-3.5" />
                                        </div>
                                    </div>
                                    <select value={voiceStyle} onChange={(e) => setVoiceStyle(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-1.5 text-slate-300">
                                        {VOICE_STYLE_OPTIONS.map(opt => <option key={opt} value={opt}>{VOICE_STYLE_LABELS[opt] || opt}</option>)}
                                    </select>
                                    
                                    {/* Hover Preview Tooltip */}
                                    <div className="absolute left-0 bottom-full mb-2 w-72 p-3 bg-slate-900/95 backdrop-blur border border-indigo-500/30 text-[11px] text-slate-200 rounded-xl shadow-2xl hidden group-hover/voice:block group-focus-within/voice:block z-30 pointer-events-none transition-all duration-200 animate-fade-in">
                                        <div className="flex items-center gap-1.5 text-indigo-400 font-mono text-[9px] font-bold uppercase tracking-wider mb-1.5 pb-1 border-b border-indigo-500/10">
                                            <LucideIcon name="volume-2" className="w-3.5 h-3.5 text-indigo-400" />
                                            <span>Tom: {VOICE_STYLE_LABELS[voiceStyle] || voiceStyle}</span>
                                        </div>
                                        <p className="italic text-slate-300 leading-relaxed font-sans">
                                            "{VOICE_STYLE_EXAMPLES[voiceStyle] || 'Tom de voz altamente convincente adaptado ao produto.'}"
                                        </p>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-slate-400 mb-1">Proporção</label>
                                    <select value={format} onChange={(e) => setFormat(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-1.5 text-slate-300">
                                        {ASPECT_RATIO_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-slate-400 mb-1">CTA Estilo</label>
                                <select value={ctaStyle} onChange={(e) => setCtaStyle(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-1.5 text-slate-300">
                                    {CTA_STYLE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-slate-400 mb-1">Diretivas Extras</label>
                                <textarea 
                                    value={extraInstructions} 
                                    onChange={(e) => setExtraInstructions(e.target.value)} 
                                    placeholder="Instruções para a voz, ritmo, sons adicionais..." 
                                    className="w-full h-16 bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 resize-none outline-none focus:border-indigo-500 transition"
                                />
                            </div>

                            {/* ⚡ Controles Criativos Estratégicos */}
                            <div className="space-y-3 border-t border-slate-900 pt-3">
                                <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-300 tracking-wide uppercase">
                                    <LucideIcon name="sliders" className="w-4 h-4 text-emerald-400" />
                                    Controles Criativos Estratégicos
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-[11px] text-slate-400 mb-1">Hook Style (Gancho)</label>
                                        <select value={hookStyle} onChange={(e) => setHookStyle(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-1.5 text-xs text-slate-300 outline-none focus:border-indigo-500 transition cursor-pointer">
                                            {HOOK_STYLE_OPTIONS.map(opt => <option key={opt} value={opt}>{HOOK_STYLE_LABELS[opt] || opt}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[11px] text-slate-400 mb-1">Gatilho Emocional</label>
                                        <select value={emotionalTrigger} onChange={(e) => setEmotionalTrigger(e.target.value)} className="w-full bg-slate-950 border border-slate-880 rounded px-1.5 py-1.5 text-xs text-slate-300 outline-none focus:border-indigo-500 transition cursor-pointer">
                                            {EMOTIONAL_TRIGGER_OPTIONS.map(opt => <option key={opt} value={opt}>{EMOTIONAL_TRIGGER_LABELS[opt] || opt}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-[11px] text-slate-400 mb-1">Tipo de Público</label>
                                        <select value={audienceType} onChange={(e) => setAudienceType(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-1.5 text-xs text-slate-300 outline-none focus:border-indigo-500 transition cursor-pointer">
                                            {AUDIENCE_TYPE_OPTIONS.map(opt => <option key={opt} value={opt}>{AUDIENCE_TYPE_LABELS[opt] || opt}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[11px] text-slate-400 mb-1">Estilo de Apresentador</label>
                                        <select value={presenterStyle} onChange={(e) => setPresenterStyle(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-1.5 text-xs text-slate-300 outline-none focus:border-indigo-500 transition cursor-pointer">
                                            {PRESENTER_STYLE_OPTIONS.map(opt => <option key={opt} value={opt}>{PRESENTER_STYLE_LABELS[opt] || opt}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-[11px] text-slate-400 mb-1">Câmera e Enquadramento</label>
                                        <select value={cameraStyle} onChange={(e) => setCameraStyle(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-1.5 text-xs text-slate-300 outline-none focus:border-indigo-500 transition cursor-pointer">
                                            {CAMERA_STYLE_OPTIONS.map(opt => <option key={opt} value={opt}>{CAMERA_STYLE_LABELS[opt] || opt}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[11px] text-slate-400 mb-1">Nível de Energia</label>
                                        <select value={energyLevel} onChange={(e) => setEnergyLevel(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-1.5 text-xs text-slate-300 outline-none focus:border-indigo-500 transition cursor-pointer">
                                            {ENERGY_LEVEL_OPTIONS.map(opt => <option key={opt} value={opt}>{ENERGY_LEVEL_LABELS[opt] || opt}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-[11px] text-slate-400 mb-1">Otimização de Funil</label>
                                        <select value={optimizationLevel} onChange={(e) => setOptimizationLevel(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-1.5 text-xs text-slate-300 outline-none focus:border-indigo-500 transition cursor-pointer">
                                            {OPTIMIZATION_LEVEL_OPTIONS.map(opt => <option key={opt} value={opt}>{OPTIMIZATION_LEVEL_LABELS[opt] || opt}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[11px] text-slate-400 mb-1">Estrutura (Framework)</label>
                                        <select value={viralFramework} onChange={(e) => setViralFramework(e.target.value)} className="w-full bg-slate-950 border border-slate-855 rounded px-1.5 py-1.5 text-xs text-slate-300 outline-none focus:border-indigo-500 transition cursor-pointer">
                                            {VIRAL_FRAMEWORK_OPTIONS.map(opt => <option key={opt} value={opt}>{VIRAL_FRAMEWORK_LABELS[opt] || opt}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[11px] text-slate-400 mb-1">Segmento Estratégico (Segmento)</label>
                                    <select value={productCategory} onChange={(e) => { setProductCategory(e.target.value); setHasUserEditedProductCategory(true); }} className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-300 outline-none focus:border-indigo-500 transition cursor-pointer">
                                        {STRATEGIC_PRODUCT_CATEGORY_OPTIONS.map(opt => <option key={opt} value={opt}>{STRATEGIC_PRODUCT_CATEGORY_LABELS[opt] || opt}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* MODO DO DIRECTOR */}
                            <div className="border-t border-slate-900 pt-3">
                                <label className="block text-slate-400 mb-1 flex items-center gap-1.5 font-semibold text-xs tracking-wide">
                                    <LucideIcon name="clapperboard" className="w-3.5 h-3.5 text-indigo-400" />
                                    Modo do Director
                                </label>
                                <select 
                                    id="director-mode-select"
                                    value={directorMode} 
                                    onChange={(e) => setDirectorMode(e.target.value as any)} 
                                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-300 outline-none focus:border-indigo-500 transition cursor-pointer"
                                >
                                    <option value="simple_brief">Brief Criativo Simples</option>
                                    <option value="ugc_tiktok_shop_production">UGC TikTok Shop Production</option>
                                </select>
                            </div>

                            {/* MODO DE CRIAÇÃO */}
                            <div className="border-t border-slate-900 pt-3">
                                <label className="block text-slate-400 mb-1 flex items-center gap-1.5 font-semibold text-xs tracking-wide">
                                    <LucideIcon name="sliders" className="w-3.5 h-3.5 text-indigo-400" />
                                    MODO DE CRIAÇÃO
                                </label>
                                <select 
                                    id="creative-mode-select"
                                    value={creativeMode} 
                                    onChange={(e) => setCreativeMode(e.target.value as any)} 
                                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-300 outline-none focus:border-indigo-500 transition cursor-pointer"
                                >
                                    <option value="commercial">Padrão Comercial / UGC Tradicional</option>
                                    <option value="novel">Novela / Cena de Drama (Elenco, Diálogos)</option>
                                </select>
                            </div>

                            {/* ELENCO DA CENA */}
                            <div className="border-t border-slate-900 pt-3 space-y-2">
                                <div className="flex justify-between items-center">
                                    <label className="block text-slate-400 flex items-center gap-1.5 font-semibold text-xs tracking-wide">
                                        <LucideIcon name="users" className="w-3.5 h-3.5 text-indigo-400" />
                                        ELENCO DA CENA
                                        <span className="bg-indigo-950 text-indigo-400 border border-indigo-800/50 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full">
                                            {characters.length}
                                        </span>
                                    </label>
                                    {!showCharacterForm && (
                                        <button
                                            id="add-character-btn"
                                            type="button"
                                            onClick={handleAddCharacterClick}
                                            className="px-2 py-1 text-[10px] font-mono font-bold rounded bg-indigo-950 hover:bg-indigo-900 border border-indigo-800 text-indigo-300 hover:text-white transition cursor-pointer flex items-center gap-1"
                                        >
                                            <LucideIcon name="plus" className="w-3 h-3" /> Adicionar
                                        </button>
                                    )}
                                </div>

                                {/* Form to Add/Edit Character */}
                                {showCharacterForm && (
                                    <div className="bg-slate-950/80 border border-indigo-950 rounded-lg p-3 space-y-3 animate-fade-in text-[11px]">
                                        <div className="flex justify-between items-center border-b border-slate-900 pb-1.5">
                                            <span className="font-mono font-bold text-indigo-300 uppercase tracking-wider text-[10px]">
                                                {editingCharacter ? 'Editar Personagem' : 'Novo Personagem'}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => setShowCharacterForm(false)}
                                                className="text-slate-500 hover:text-slate-300 transition"
                                            >
                                                <LucideIcon name="x" className="w-4 h-4" />
                                            </button>
                                        </div>

                                        {/* Character fields */}
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="block text-slate-400 mb-0.5 font-mono text-[9px] uppercase">Nome do Personagem*</label>
                                                <input
                                                    type="text"
                                                    value={charName}
                                                    onChange={(e) => setCharName(e.target.value)}
                                                    placeholder="Ex: Carlos, Ana..."
                                                    className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-slate-200 text-xs text-sans animate-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-slate-400 mb-0.5 font-mono text-[9px] uppercase">Papel na Cena</label>
                                                <select
                                                    value={charRole}
                                                    onChange={(e) => setCharRole(e.target.value)}
                                                    className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-slate-300 text-xs"
                                                >
                                                    <option value="Main Character">Main Character (Principal)</option>
                                                    <option value="Secondary Character">Secondary Character</option>
                                                    <option value="Supporting Character">Supporting Character</option>
                                                    <option value="Extra">Extra</option>
                                                </select>
                                            </div>
                                        </div>

                                        {/* Row of physical attributes */}
                                        <div className="grid grid-cols-3 gap-1.5">
                                            <div>
                                                <label className="block text-slate-400 mb-0.5 font-mono text-[9px] uppercase">Idade</label>
                                                <input
                                                    type="text"
                                                    placeholder="28"
                                                    value={charAge}
                                                    onChange={(e) => setCharAge(e.target.value)}
                                                    className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-slate-200 text-xs text-sans animate-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-slate-400 mb-0.5 font-mono text-[9px] uppercase">Altura</label>
                                                <input
                                                    type="text"
                                                    placeholder="1.75m"
                                                    value={charHeight}
                                                    onChange={(e) => setCharHeight(e.target.value)}
                                                    className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-slate-200 text-xs text-sans animate-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-slate-400 mb-0.5 font-mono text-[9px] uppercase">Tom de Pele</label>
                                                <input
                                                    type="text"
                                                    placeholder="Parda, Clara..."
                                                    value={charSkin}
                                                    onChange={(e) => setCharSkin(e.target.value)}
                                                    className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-slate-200 text-xs text-sans animate-none"
                                                />
                                            </div>
                                        </div>

                                        {/* Face & Body Attributes */}
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="block text-slate-400 mb-0.5 font-mono text-[9px] uppercase">Nacionalidade / Origem</label>
                                                <input
                                                    type="text"
                                                    placeholder="Brasileira Latina"
                                                    value={charNationality}
                                                    onChange={(e) => setCharNationality(e.target.value)}
                                                    className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-slate-200 text-xs text-sans animate-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-slate-400 mb-0.5 font-mono text-[9px] uppercase">Estrutura Corporal</label>
                                                <input
                                                    type="text"
                                                    placeholder="Atlética, Magra..."
                                                    value={charBody}
                                                    onChange={(e) => setCharBody(e.target.value)}
                                                    className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-slate-200 text-xs text-sans animate-none"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="block text-slate-400 mb-0.5 font-mono text-[9px] uppercase">Formato do Rosto</label>
                                                <input
                                                    type="text"
                                                    placeholder="Oval, Quadrado..."
                                                    value={charFace}
                                                    onChange={(e) => setCharFace(e.target.value)}
                                                    className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-slate-200 text-xs text-sans animate-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-slate-400 mb-0.5 font-mono text-[9px] uppercase">Cor dos Olhos</label>
                                                <input
                                                    type="text"
                                                    placeholder="Castanho, Verde..."
                                                    value={charEyeCol}
                                                    onChange={(e) => setCharEyeCol(e.target.value)}
                                                    className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-slate-200 text-xs text-sans animate-none"
                                                />
                                            </div>
                                        </div>

                                        {/* Hair */}
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="block text-slate-400 mb-0.5 font-mono text-[9px] uppercase">Cor do Cabelo</label>
                                                <input
                                                    type="text"
                                                    placeholder="Preto, Loiro..."
                                                    value={charHairCol}
                                                    onChange={(e) => setCharHairCol(e.target.value)}
                                                    className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-slate-200 text-xs text-sans animate-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-slate-400 mb-0.5 font-mono text-[9px] uppercase">Estilo de Cabelo</label>
                                                <input
                                                    type="text"
                                                    placeholder="Curto ondulado, Longo..."
                                                    value={charHairSty}
                                                    onChange={(e) => setCharHairSty(e.target.value)}
                                                    className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-slate-200 text-xs text-sans animate-none"
                                                />
                                            </div>
                                        </div>

                                        {/* Clothes & Style */}
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="block text-slate-400 mb-0.5 font-mono text-[9px] uppercase">Vestuário / Roupa</label>
                                                <input
                                                    type="text"
                                                    placeholder="Terno elegante, Jeans..."
                                                    value={charClothing}
                                                    onChange={(e) => setCharClothing(e.target.value)}
                                                    className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-slate-200 text-xs text-sans animate-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-slate-400 mb-0.5 font-mono text-[9px] uppercase">Estilo Social</label>
                                                <input
                                                    type="text"
                                                    placeholder="Executivo, Casual, Urbano..."
                                                    value={charSocial}
                                                    onChange={(e) => setCharSocial(e.target.value)}
                                                    className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-slate-200 text-xs text-sans animate-none"
                                                />
                                            </div>
                                        </div>

                                        {/* Psychology */}
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="block text-slate-400 mb-0.5 font-mono text-[9px] uppercase">Personalidade</label>
                                                <input
                                                    type="text"
                                                    placeholder="Carismático, Misterioso..."
                                                    value={charPersonality}
                                                    onChange={(e) => setCharPersonality(e.target.value)}
                                                    className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-slate-200 text-xs text-sans animate-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-slate-400 mb-0.5 font-mono text-[9px] uppercase">Emoção Principal</label>
                                                <input
                                                    type="text"
                                                    placeholder="Determinação, Preocupação..."
                                                    value={charEmotion}
                                                    onChange={(e) => setCharEmotion(e.target.value)}
                                                    className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-slate-200 text-xs text-sans animate-none"
                                                />
                                            </div>
                                        </div>

                                        {/* Relationships */}
                                        <div>
                                            <label className="block text-slate-400 mb-0.5 font-mono text-[9px] uppercase">Relação com os Outros</label>
                                            <input
                                                type="text"
                                                placeholder="Sócio da Ana, Rival do Carlos..."
                                                value={charRelation}
                                                onChange={(e) => setCharRelation(e.target.value)}
                                                className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-slate-200 text-xs text-sans animate-none"
                                            />
                                        </div>

                                        {/* Voice properties */}
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="block text-slate-400 mb-0.5 font-mono text-[9px] uppercase">Tipo de Voz</label>
                                                <input
                                                    type="text"
                                                    placeholder="Grave, rouca, suave, aveludada"
                                                    value={charVoice}
                                                    onChange={(e) => setCharVoice(e.target.value)}
                                                    className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-slate-200 text-xs text-sans animate-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-slate-400 mb-0.5 font-mono text-[9px] uppercase">Estilo de Fala</label>
                                                <input
                                                    type="text"
                                                    placeholder="Rápida, articulada, pausas dramáticas"
                                                    value={charSpeech}
                                                    onChange={(e) => setCharSpeech(e.target.value)}
                                                    className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-slate-200 text-xs text-sans animate-none"
                                                />
                                            </div>
                                        </div>

                                        {/* Image Upload inside Character form */}
                                        <div>
                                            <label className="block text-slate-400 mb-1 font-mono text-[9px] uppercase">Foto de Referência (Opcional)</label>
                                            <div className="flex items-center gap-2">
                                                {charRefImg ? (
                                                    <div className="relative w-12 h-12 bg-slate-950 border border-slate-800 rounded-lg overflow-hidden shrink-0 group">
                                                        <img src={charRefImg} alt="Character preview" className="w-full h-full object-cover" />
                                                        <button
                                                            type="button"
                                                            onClick={() => setCharRefImg(null)}
                                                            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-red-500 hover:text-red-400 cursor-pointer"
                                                        >
                                                            <LucideIcon name="trash-2" className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="w-12 h-12 bg-slate-950/40 border border-dashed border-slate-800 rounded-lg flex items-center justify-center shrink-0">
                                                        <LucideIcon name="image" className="w-4 h-4 text-slate-600" />
                                                    </div>
                                                )}
                                                <label className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-850 rounded text-[10px] text-slate-400 hover:text-white transition cursor-pointer text-center font-mono uppercase font-bold">
                                                    Selecionar Foto
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        onChange={async (e) => {
                                                            const file = e.target.files?.[0];
                                                            if (file) {
                                                                const reader = new FileReader();
                                                                reader.onload = () => {
                                                                    setCharRefImg(reader.result as string);
                                                                };
                                                                reader.readAsDataURL(file);
                                                            }
                                                        }}
                                                    />
                                                </label>
                                            </div>
                                        </div>

                                        {/* Action Buttons for Form */}
                                        <div className="flex justify-end gap-2 pt-2 border-t border-slate-900">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setShowCharacterForm(false);
                                                    setEditingCharacter(null);
                                                }}
                                                className="px-2.5 py-1 text-[10px] font-mono font-bold rounded bg-slate-950 border border-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleSaveCharacter}
                                                className="px-3 py-1 text-[10px] font-mono font-bold rounded bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold transition cursor-pointer"
                                            >
                                                Salvar Perfil
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Characters List */}
                                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                    {characters.length === 0 ? (
                                        <div className="text-center py-4 bg-slate-950/20 border border-slate-900 rounded-lg">
                                            <p className="text-[10px] text-slate-500 italic">Nenhum personagem configurado no elenco.</p>
                                        </div>
                                    ) : (
                                        characters.map((char) => (
                                            <div key={char.id} className="flex items-center justify-between bg-slate-950/40 border border-slate-900 rounded px-2.5 py-1.5 text-xs hover:border-slate-800 transition">
                                                <div className="flex items-center gap-2">
                                                    {char.refImg ? (
                                                        <img src={char.refImg} alt={char.name} className="w-6 h-6 rounded-full object-cover border border-slate-800 shrink-0" />
                                                    ) : (
                                                        <div className="w-6 h-6 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0">
                                                            <LucideIcon name="user" className="w-3 h-3 text-slate-600" />
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div className="font-bold text-slate-300 flex items-center gap-1 text-sans">
                                                            {char.name}
                                                            <span className="text-[9px] px-1 bg-slate-900 border border-slate-900 text-slate-500 font-mono font-normal">
                                                                {char.age ? `${char.age}a` : 'N/A'}
                                                            </span>
                                                        </div>
                                                        <div className="text-[10px] text-indigo-400 font-mono">{char.role}</div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleEditCharacterClick(char)}
                                                        className="p-1 hover:text-indigo-400 text-slate-500 transition cursor-pointer"
                                                        title="Editar Perfil"
                                                    >
                                                        <LucideIcon name="edit-2" className="w-3 h-3" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteCharacter(char.id)}
                                                        className="p-1 hover:text-red-500 text-slate-500 transition cursor-pointer"
                                                        title="Excluir Personagem"
                                                    >
                                                        <LucideIcon name="trash-2" className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {mismatchWarning && (
                                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2.5 mb-2.5 space-y-2 text-[10.5px] leading-relaxed animate-fade-in">
                                    <div className="flex items-start gap-1.5 text-amber-400">
                                        <LucideIcon name="alert-triangle" className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                                        <div>
                                            <span className="font-mono font-bold uppercase block tracking-wide text-[9px] mb-0.5">Aviso de Inconsistência Detectada</span>
                                            <p className="text-slate-300 font-sans">{mismatchWarning}</p>
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-2 pt-1">
                                        <button
                                            type="button"
                                            onClick={() => setMismatchWarning(null)}
                                            className="px-2.5 py-1 text-[9px] font-mono font-bold rounded bg-slate-950 border border-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                                        >
                                            Corrigir Formulário
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleBypassAndGenerate(false)}
                                            className="px-2.5 py-1 text-[9px] font-mono font-bold rounded bg-amber-600 hover:bg-amber-500 text-slate-950 hover:text-black font-extrabold transition cursor-pointer flex items-center gap-0.5 shadow"
                                        >
                                            Ignorar e Continuar <LucideIcon name="chevron-right" className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-2 pt-1">
                                <Button 
                                    onClick={handleGenerate} 
                                    disabled={loading || !productName.trim() || !canGenerateWithProxy(localProxyStatus)} 
                                    className="flex-1 py-3 text-xs bg-indigo-600 hover:bg-indigo-500 border-indigo-500/20"
                                    icon={loading ? "loader-2" : "sparkles"}
                                >
                                    {localProxyStatus === 'Checking' ? 'Verificando Proxy...' :
                                     getNormalizedProxyStatus(localProxyStatus) === 'method_mismatch' ? 'Health check 405 — adicione GET /health no Worker' :
                                     !canGenerateWithProxy(localProxyStatus) ? 'Proxy Requerido Offline' :
                                     loading ? "Roteirizando..." : "Gerar Roteiro Direto"}
                                </Button>
                                <button onClick={handleClearInputs} className="bg-slate-950 border border-slate-800 p-2 text-slate-400 hover:text-red-400 rounded-lg transition-colors cursor-pointer" title="Resetar">
                                    <LucideIcon name="trash-2" className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* OUTPUT PANEL */}
                <div className="lg:col-span-7 flex flex-col font-sans">
                    <Card className="bg-slate-900/60 border-slate-800/80 p-5 flex-1 flex flex-col min-h-[450px]">
                        {/* Tab Headers */}
                        <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                            <span className="text-[10px] uppercase font-bold text-indigo-400 font-mono tracking-wider">Resultado da Direção</span>
                            <div className="flex items-center gap-2">
                                <button 
                                    type="button"
                                    onClick={() => setDebugMode(!debugMode)} 
                                    className={`text-[9px] px-2 py-1 rounded border transition cursor-pointer flex items-center gap-1 font-mono ${debugMode ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-slate-800/40 text-slate-400 border-slate-800/40 hover:text-slate-200'}`}
                                >
                                    <LucideIcon name="bug" className="w-3 h-3" /> Debug {debugMode ? 'ON' : 'OFF'}
                                </button>
                                {result && (
                                    <button onClick={handleCopyAll} className="text-[9px] bg-indigo-500/10 text-indigo-400 hover:text-white px-2.5 py-1 rounded border border-indigo-500/20 transition cursor-pointer flex items-center gap-1 font-mono">
                                        <LucideIcon name="copy" className="w-3 h-3" /> Copiar Tudo
                                    </button>
                                )}
                            </div>
                        </div>

                        {debugMode && (
                            <div className="bg-slate-950 border border-amber-500/20 rounded-xl p-4 my-3 font-mono text-[10px] space-y-3 leading-relaxed text-slate-300">
                                <div className="flex justify-between items-center border-b border-slate-800 pb-1.5 border-amber-550/10">
                                    <span className="text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1.5 text-[9px]">
                                        <LucideIcon name="bug" className="w-3.5 h-3.5" /> Painel de Debug
                                    </span>
                                    <button 
                                        type="button"
                                        onClick={() => setDebugData(null)} 
                                        className="text-[8px] hover:text-white bg-slate-900 border border-slate-800 px-1 py-0.5 rounded transition cursor-pointer"
                                    >
                                        Limpar Registro
                                    </button>
                                </div>
                                
                                {debugData ? (
                                    <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                                        <div className="grid grid-cols-2 gap-2 text-[9px]">
                                            <div className="bg-slate-900/60 p-1.5 rounded border border-slate-850">
                                                <span className="text-slate-500 block">Creative Mode:</span>
                                                <span className="text-white font-bold">{debugData.creativeMode}</span>
                                            </div>
                                            <div className="bg-slate-900/60 p-1.5 rounded border border-slate-850">
                                                <span className="text-slate-500 block">Selected Platform:</span>
                                                <span className="text-white font-bold">{debugData.platform}</span>
                                            </div>
                                            <div className="bg-slate-900/60 p-1.5 rounded border border-slate-850">
                                                <span className="text-slate-500 block">Has Product Image:</span>
                                                <span className={`font-bold ${debugData.hasProductImage ? 'text-emerald-400' : 'text-slate-400'}`}>{debugData.hasProductImage ? 'SIM' : 'NÃO'}</span>
                                            </div>
                                            <div className="bg-slate-900/60 p-1.5 rounded border border-slate-850">
                                                <span className="text-slate-500 block">Has Video Ref:</span>
                                                <span className={`font-bold ${debugData.hasVideoReference ? 'text-emerald-400' : 'text-slate-400'}`}>{debugData.hasVideoReference ? 'SIM' : 'NÃO'}</span>
                                            </div>
                                            <div className="bg-slate-900/60 p-1.5 rounded border border-slate-850">
                                                <span className="text-slate-500 block">Has Moodboard:</span>
                                                <span className={`font-bold ${debugData.hasMoodboard ? 'text-emerald-400' : 'text-slate-400'}`}>{debugData.hasMoodboard ? 'SIM' : 'NÃO'}</span>
                                            </div>
                                            <div className="bg-slate-900/60 p-1.5 rounded border border-slate-850">
                                                <span className="text-slate-500 block">Has Avatar Image:</span>
                                                <span className={`font-bold ${debugData.hasAvatar ? 'text-emerald-400' : 'text-slate-400'}`}>{debugData.hasAvatar ? 'SIM' : 'NÃO'}</span>
                                            </div>
                                            <div className="bg-slate-900/60 p-1.5 rounded border border-slate-850">
                                                <span className="text-slate-500 block">Request ID:</span>
                                                <span className="text-white font-bold">{debugData.request_id || 'N/A'}</span>
                                            </div>
                                            <div className="bg-slate-900/60 p-1.5 rounded border border-slate-850">
                                                <span className="text-slate-500 block">Execution Mode:</span>
                                                <span className="text-white font-bold">{debugData.mode || 'N/A'}</span>
                                            </div>
                                            <div className="bg-slate-900/60 p-1.5 rounded border border-slate-850">
                                                <span className="text-slate-500 block">Status OK:</span>
                                                <span className={`font-bold ${debugData.ok !== undefined ? (debugData.ok ? 'text-emerald-400' : 'text-rose-400') : 'N/A'}`}>{debugData.ok !== undefined ? (debugData.ok ? 'SIM' : 'NÃO') : 'N/A'}</span>
                                            </div>
                                            <div className="bg-slate-900/60 p-1.5 rounded border border-slate-850">
                                                <span className="text-slate-500 block">Partial Success:</span>
                                                <span className={`font-bold ${debugData.partial ? 'text-amber-400' : 'text-slate-400'}`}>{debugData.partial ? 'SIM' : 'NÃO'}</span>
                                            </div>
                                        </div>

                                        {debugData.warnings && debugData.warnings.length > 0 && (
                                            <div className="bg-amber-950/20 border border-amber-500/20 p-2 rounded text-amber-400 text-[9px] leading-normal font-mono">
                                                <span className="text-slate-500 block uppercase font-bold text-[8px] mb-0.5">Worker Warnings:</span>
                                                <ul className="list-disc pl-3 space-y-0.5">
                                                    {debugData.warnings.map((w: string, idx: number) => (
                                                        <li key={idx}>{w}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {debugData.parsingError && (
                                            <div className="bg-red-950/20 border border-red-500/20 p-2 rounded text-red-400 text-[9px] leading-normal font-mono">
                                                <span className="text-slate-500 block uppercase font-bold text-[8px] mb-0.5">Erro de Parsing / Execução:</span>
                                                {debugData.parsingError}
                                            </div>
                                        )}

                                        <div className="bg-slate-900/60 p-2 rounded border border-slate-850">
                                            <span className="text-slate-500 block uppercase font-bold text-[8px] mb-1">Input Payload:</span>
                                            <pre className="text-[9px] text-indigo-300 max-h-[120px] overflow-y-auto whitespace-pre-wrap select-all bg-black/40 p-1.5 rounded border border-slate-850">
                                                {JSON.stringify(debugData.payload, null, 2)}
                                            </pre>
                                        </div>

                                        <div className="bg-slate-900/60 p-2 rounded border border-slate-850">
                                            <span className="text-slate-500 block uppercase font-bold text-[8px] mb-1">Raw Text Response Code:</span>
                                            <pre className="text-[9px] text-zinc-300 max-h-[120px] overflow-y-auto whitespace-pre-wrap select-all bg-black/40 p-1.5 rounded border border-slate-850">
                                                {debugData.raw_text || debugData.rawAIResponse || '(Sem texto bruto)'}
                                            </pre>
                                        </div>

                                        <div className="bg-slate-900/60 p-2 rounded border border-slate-850">
                                            <span className="text-slate-500 block uppercase font-bold text-[8px] mb-1">Full Raw JSON Payload:</span>
                                            <pre className="text-[9px] text-cyan-300 max-h-[120px] overflow-y-auto whitespace-pre-wrap select-all bg-black/40 p-1.5 rounded border border-slate-850">
                                                {JSON.stringify(debugData.raw || debugData.payload, null, 2)}
                                            </pre>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-slate-500 italic text-[9px]">Aguardando próxima geração para registrar métricas de debug...</p>
                                )}
                            </div>
                        )}

                        {amberWarning && (
                            <div className="bg-amber-950/20 text-amber-500 border border-amber-500/20 rounded-lg p-3 text-xs font-mono my-3 leading-normal whitespace-pre-wrap flex items-start gap-2 animate-fade-in">
                                <LucideIcon name="alert-triangle" className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
                                <div>
                                    {amberWarning}
                                </div>
                            </div>
                        )}

                        {errorMsg && (
                            <div className="bg-red-950/20 text-red-400 border border-red-500/20 rounded-lg p-3 text-xs font-mono my-3 leading-normal">
                                <strong>Erro ao gerar:</strong> {errorMsg}
                            </div>
                        )}

                        {!result ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-600 py-16">
                                <LucideIcon name="clapperboard" className="w-12 h-12 mb-2 animate-pulse" />
                                <p className="text-xs font-mono">Aguardando dados de entrada para criação...</p>
                            </div>
                        ) : result.mode === 'ugc_tiktok_shop_production' ? (
                            <div className="flex-1 flex flex-col mt-3 space-y-5 font-sans animate-fade-in text-xs">
                                {/* Top Control Bar with Copy Buttons */}
                                <div className="bg-slate-950/80 p-3 rounded-xl border border-indigo-500/30 flex flex-wrap items-center justify-between gap-2 shadow-lg">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                        <span className="font-mono font-bold text-xs text-indigo-300 uppercase tracking-wider">
                                            UGC TikTok Shop Production Engine
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px]">
                                        <button
                                            type="button"
                                            onClick={handleCopyUgcStrategy}
                                            className="bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/40 px-2.5 py-1 rounded transition cursor-pointer flex items-center gap-1 font-semibold"
                                        >
                                            <LucideIcon name="copy" className="w-3 h-3" /> Copiar Estratégia
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleCopyUgcScenes}
                                            className="bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 border border-purple-500/40 px-2.5 py-1 rounded transition cursor-pointer flex items-center gap-1 font-semibold"
                                        >
                                            <LucideIcon name="clapperboard" className="w-3 h-3" /> Copiar Roteiro das Cenas
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleCopyUgcValidation}
                                            className="bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/40 px-2.5 py-1 rounded transition cursor-pointer flex items-center gap-1 font-semibold"
                                        >
                                            <LucideIcon name="check-circle" className="w-3 h-3" /> Copiar Validação
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleCopyUgcFullProduction}
                                            className="bg-gradient-to-r from-indigo-600/40 to-purple-600/40 hover:from-indigo-600/60 hover:to-purple-600/60 text-white border border-indigo-400/50 px-3 py-1 rounded transition cursor-pointer flex items-center gap-1 font-bold shadow-sm"
                                        >
                                            <LucideIcon name="sparkles" className="w-3 h-3 text-amber-300" /> Copiar Produção Completa
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleCopyUgcJson}
                                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-2.5 py-1 rounded transition cursor-pointer flex items-center gap-1 font-semibold"
                                        >
                                            <LucideIcon name="code" className="w-3 h-3" /> Copiar JSON
                                        </button>
                                    </div>
                                </div>

                                {/* SECTION 1: Estratégia de Produção */}
                                <div className="bg-slate-950/60 border border-indigo-500/20 rounded-xl p-4 space-y-3">
                                    <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                                        <LucideIcon name="target" className="w-4 h-4 text-indigo-400" />
                                        <h3 className="font-bold text-sm text-white uppercase font-mono tracking-wider">1. Estratégia de Produção</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                        <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 space-y-1">
                                            <span className="text-[10px] uppercase font-mono font-bold text-indigo-400 block">Formato Escolhido</span>
                                            <p className="text-white font-bold text-sm">{result.production_strategy?.chosen_format}</p>
                                        </div>
                                        <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 space-y-1">
                                            <span className="text-[10px] uppercase font-mono font-bold text-indigo-400 block">Gancho Principal</span>
                                            <p className="text-slate-200 font-medium">{result.production_strategy?.main_hook}</p>
                                        </div>
                                        <div className="md:col-span-2 bg-slate-900/60 p-3 rounded-lg border border-slate-800 space-y-1">
                                            <span className="text-[10px] uppercase font-mono font-bold text-indigo-400 block">Motivo da Escolha do Formato</span>
                                            <p className="text-slate-300 leading-relaxed">{result.production_strategy?.reason_for_choice}</p>
                                        </div>
                                        <div className="md:col-span-2 bg-slate-900/60 p-3 rounded-lg border border-slate-800 space-y-1">
                                            <span className="text-[10px] uppercase font-mono font-bold text-indigo-400 block">Gatilhos Mentais Aplicados</span>
                                            <div className="flex flex-wrap gap-1.5 mt-1">
                                                {(result.production_strategy?.mental_triggers || []).map((tr: string, i: number) => (
                                                    <span key={i} className="bg-indigo-950 text-indigo-300 border border-indigo-800/50 text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold">
                                                        {tr}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        {result.production_strategy?.conversion_strategy && (
                                            <div className="md:col-span-2 bg-slate-900/40 p-3 rounded-lg border border-slate-800/80 space-y-2">
                                                <span className="text-[10px] uppercase font-mono font-bold text-purple-400 block">Estratégia de Conversão por Cena</span>
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                                                    <div className="bg-slate-950 p-2.5 rounded border border-slate-800/60">
                                                        <span className="text-indigo-400 font-mono font-bold block text-[9px]">CENA 1 (Atenção)</span>
                                                        <p className="text-slate-300 mt-1">{result.production_strategy.conversion_strategy.scene_1}</p>
                                                    </div>
                                                    <div className="bg-slate-950 p-2.5 rounded border border-slate-800/60">
                                                        <span className="text-purple-400 font-mono font-bold block text-[9px]">CENA 2 (Desejo)</span>
                                                        <p className="text-slate-300 mt-1">{result.production_strategy.conversion_strategy.scene_2}</p>
                                                    </div>
                                                    <div className="bg-slate-950 p-2.5 rounded border border-slate-800/60">
                                                        <span className="text-emerald-400 font-mono font-bold block text-[9px]">CENA 3 (Conversão)</span>
                                                        <p className="text-slate-300 mt-1">{result.production_strategy.conversion_strategy.scene_3}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* SECTION 2: Roteiro Completo das Cenas */}
                                <div className="bg-slate-950/60 border border-indigo-500/20 rounded-xl p-4 space-y-4">
                                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                                        <div className="flex items-center gap-2">
                                            <LucideIcon name="clapperboard" className="w-4 h-4 text-purple-400" />
                                            <h3 className="font-bold text-sm text-white uppercase font-mono tracking-wider">2. Roteiro Completo das Cenas (3 Cenas)</h3>
                                        </div>
                                        <span className="text-[10px] font-mono bg-purple-950 text-purple-300 px-2.5 py-0.5 rounded border border-purple-800/50">
                                            24s Total (8s por cena)
                                        </span>
                                    </div>

                                    <div className="space-y-4">
                                        {(result.scene_scripts || []).map((scene: any) => {
                                            const charCount = scene.script_pt_br?.length || 0;
                                            const isLengthOk = charCount >= 175 && charCount <= 195;
                                            const isScene3 = scene.scene_id === 3;

                                            return (
                                                <div key={scene.scene_id} className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3 relative hover:border-slate-700 transition">
                                                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className="bg-indigo-600 text-white font-mono font-bold text-xs px-2.5 py-0.5 rounded-md">
                                                                Cena {scene.scene_id}
                                                            </span>
                                                            <span className="text-xs font-mono font-semibold text-slate-400">
                                                                ⏱️ {scene.duration_seconds}s
                                                            </span>
                                                            <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                                                                Formato: {scene.format}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {isScene3 ? (
                                                                <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-mono px-2 py-0.5 rounded font-bold">
                                                                    🎯 Com CTA (Conversão)
                                                                </span>
                                                            ) : (
                                                                <span className="bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-mono px-2 py-0.5 rounded">
                                                                    🚫 Sem CTA (Retenção)
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                                                        <div className="bg-slate-950/80 p-2.5 rounded border border-slate-800/80">
                                                            <span className="text-[9px] uppercase font-mono font-bold text-indigo-400 block mb-0.5">Objetivo da Cena</span>
                                                            <p className="text-slate-200">{scene.objective}</p>
                                                        </div>
                                                        <div className="bg-slate-950/80 p-2.5 rounded border border-slate-800/80">
                                                            <span className="text-[9px] uppercase font-mono font-bold text-purple-400 block mb-0.5">Estratégia Aplicada</span>
                                                            <p className="text-slate-200">{scene.strategy}</p>
                                                        </div>
                                                        <div className="bg-slate-950/80 p-2.5 rounded border border-slate-800/80">
                                                            <span className="text-[9px] uppercase font-mono font-bold text-pink-400 block mb-0.5">Gatilho Mental</span>
                                                            <p className="text-slate-200">{scene.trigger}</p>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                                                        <div className="bg-slate-950/80 p-2.5 rounded border border-slate-800/80">
                                                            <span className="text-[9px] uppercase font-mono font-bold text-cyan-400 block mb-0.5">Descrição da Cena (Visual)</span>
                                                            <p className="text-slate-200 leading-relaxed">{scene.scene_description}</p>
                                                        </div>
                                                        <div className="bg-slate-950/80 p-2.5 rounded border border-slate-800/80">
                                                            <span className="text-[9px] uppercase font-mono font-bold text-amber-400 block mb-0.5">Ação do Apresentador / Câmera</span>
                                                            <p className="text-slate-200 leading-relaxed">{scene.action}</p>
                                                        </div>
                                                    </div>

                                                    {/* Script PT-BR Box */}
                                                    <div className="bg-indigo-950/20 border border-indigo-500/30 rounded-lg p-3 space-y-1.5">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[10px] uppercase font-mono font-bold text-indigo-300 flex items-center gap-1">
                                                                <LucideIcon name="message-square" className="w-3 h-3 text-indigo-400" />
                                                                Script Falado (PT-BR)
                                                            </span>
                                                            <span className={`text-[9.5px] font-mono px-2 py-0.5 rounded font-bold ${
                                                                isLengthOk 
                                                                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' 
                                                                    : 'bg-amber-950 text-amber-400 border border-amber-800'
                                                            }`}>
                                                                {charCount} caracteres {isLengthOk ? '✓ (175-195)' : '⚠️'}
                                                            </span>
                                                        </div>
                                                        <p className="text-slate-100 font-sans text-xs leading-relaxed font-medium bg-black/40 p-2.5 rounded border border-slate-800 select-all">
                                                            "{scene.script_pt_br}"
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* SECTION 3: Validação Final */}
                                <div className="bg-slate-950/60 border border-emerald-500/20 rounded-xl p-4 space-y-3">
                                    <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                                        <LucideIcon name="check-circle" className="w-4 h-4 text-emerald-400" />
                                        <h3 className="font-bold text-sm text-white uppercase font-mono tracking-wider">3. Validação Final de Produção</h3>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                        <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 space-y-1">
                                            <span className="text-[10px] uppercase font-mono font-bold text-emerald-400 block">Sensação UGC & Autenticidade</span>
                                            <p className="text-slate-200">{result.final_validation?.ugc_feeling}</p>
                                        </div>
                                        <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 space-y-1">
                                            <span className="text-[10px] uppercase font-mono font-bold text-emerald-400 block">Continuidade Narrativa</span>
                                            <p className="text-slate-200">{result.final_validation?.continuity}</p>
                                        </div>
                                        <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 space-y-1">
                                            <span className="text-[10px] uppercase font-mono font-bold text-emerald-400 block">Qualidade da Copy</span>
                                            <p className="text-slate-200">{result.final_validation?.copy_quality}</p>
                                        </div>
                                        <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 space-y-1">
                                            <span className="text-[10px] uppercase font-mono font-bold text-emerald-400 block">Foco no Produto</span>
                                            <p className="text-slate-200">{result.final_validation?.product_focus}</p>
                                        </div>
                                        <div className="md:col-span-2 bg-slate-900/60 p-3 rounded-lg border border-slate-800 space-y-1">
                                            <span className="text-[10px] uppercase font-mono font-bold text-emerald-400 block">Fluxo de Conversão</span>
                                            <p className="text-slate-200">{result.final_validation?.conversion_flow}</p>
                                        </div>
                                        {Array.isArray(result.final_validation?.warnings) && result.final_validation.warnings.length > 0 && (
                                            <div className="md:col-span-2 bg-amber-950/20 border border-amber-500/30 p-3 rounded-lg space-y-1">
                                                <span className="text-[10px] uppercase font-mono font-bold text-amber-400 block">⚠️ Avisos e Recomendações</span>
                                                <ul className="list-disc list-inside text-amber-200 space-y-0.5">
                                                    {result.final_validation.warnings.map((w: string, i: number) => (
                                                        <li key={i}>{w}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col mt-3 space-y-4 font-sans">
                                {/* 🎯 Platform Adaptation Report */}
                                {((result.platform_adaptation_report) || (result._meta?.platform_adaptation_report)) && (() => {
                                    const report = result.platform_adaptation_report || result._meta?.platform_adaptation_report;
                                    return (
                                        <div className="bg-slate-950/65 border border-indigo-500/20 rounded-xl p-4 space-y-3 shadow-lg hover:border-indigo-500/30 transition animate-fade-in text-xs font-sans">
                                            <div className="flex items-center gap-1.5 border-b border-slate-800 pb-2">
                                                <LucideIcon name="smartphone" className="w-4 h-4 text-indigo-400 animate-pulse" />
                                                <span className="text-[10px] uppercase font-mono font-bold text-indigo-400 tracking-wider">🎯 Relatório de Adaptação de Plataforma</span>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 leading-tight">
                                                <div>
                                                    <span className="text-[8.5px] uppercase font-bold text-slate-500 block font-mono">Plataforma Alvo:</span>
                                                    <span className="text-white font-bold">{report.platform_selected || platform}</span>
                                                </div>
                                                <div>
                                                    <span className="text-[8.5px] uppercase font-bold text-slate-500 block font-mono">Duração Ideal Estimada:</span>
                                                    <span className="text-emerald-400 font-bold font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 text-[10px] inline-block mt-0.5">{report.recommended_duration || PLATFORMS_INTELLIGENCE[platform]?.durationHint || 'Auto'}</span>
                                                </div>
                                                <div>
                                                    <span className="text-[8.5px] uppercase font-bold text-slate-500 block font-mono">Diretriz Vocal (Voice Style):</span>
                                                    <span className="text-slate-300 font-medium">{report.voice_style || 'N/A'}</span>
                                                </div>
                                                <div>
                                                    <span className="text-[8.5px] uppercase font-bold text-slate-550 block font-mono">Ritmo Aconselhado (Pacing):</span>
                                                    <span className="text-slate-300 font-medium">{report.recommended_pacing || 'N/A'}</span>
                                                </div>
                                                <div className="sm:col-span-2 border-t border-slate-850 pt-2 text-xs">
                                                    <span className="text-[8.5px] uppercase font-bold text-indigo-400 block font-mono mb-1">Estratégia de Gancho Otimizada:</span>
                                                    <p className="text-slate-200 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80 leading-normal text-[11px] font-sans">
                                                        {report.hook_strategy || 'N/A'}
                                                    </p>
                                                </div>
                                                <div className="sm:col-span-2 border-t border-slate-850 pt-2 text-xs">
                                                    <span className="text-[8.5px] uppercase font-bold text-pink-400 block font-mono mb-1">Estratégia de CTA de Conversão:</span>
                                                    <p className="text-slate-200 bg-pink-950/10 p-2.5 rounded-lg border border-pink-500/10 leading-normal text-[11px] font-sans italic">
                                                        "{report.cta_strategy || 'N/A'}"
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* 🔒 Active Object Lock Card */}
                                {(() => {
                                    const lock: CreativeDirectorObjectLock | null = result?.object_lock || activeObjectLock;
                                    if (!lock) return null;
                                    return (
                                        <div className="bg-slate-950/65 border border-cyan-500/30 rounded-xl p-4 space-y-3 shadow-lg hover:border-cyan-500/40 transition animate-fade-in text-xs font-sans">
                                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                                                <div className="flex items-center gap-1.5">
                                                    <LucideIcon name="lock" className="w-4 h-4 text-cyan-400" />
                                                    <span className="text-[10px] uppercase font-mono font-bold text-cyan-400 tracking-wider">🔒 Trava de Objeto Ativa</span>
                                                    <span className="bg-cyan-500/20 text-cyan-300 text-[9px] font-mono px-2 py-0.5 rounded border border-cyan-500/30">
                                                        {lock.source === 'image_analysis' ? 'Visão Computacional' : lock.source === 'manual' ? 'Modo Manual' : 'Descrição'}
                                                    </span>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={handleCopyObjectLock}
                                                        className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[9px] font-mono px-2 py-1 rounded transition cursor-pointer flex items-center gap-1"
                                                        title="Copiar Trava de Objeto"
                                                    >
                                                        <LucideIcon name="copy" className="w-3 h-3" /> Lock (JSON)
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={handleCopyLockPrompt}
                                                        className="bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[9px] font-mono px-2 py-1 rounded transition cursor-pointer flex items-center gap-1"
                                                        title="Copiar Prompt EN"
                                                    >
                                                        <LucideIcon name="file-text" className="w-3 h-3" /> Prompt EN
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={handleCopyBriefWithLock}
                                                        className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-mono px-2 py-1 rounded transition cursor-pointer flex items-center gap-1"
                                                        title="Copiar Briefing + Lock"
                                                    >
                                                        <LucideIcon name="layers" className="w-3 h-3" /> Brief + Lock
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                                                <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
                                                    <span className="text-[9px] font-mono font-bold text-slate-400 uppercase block mb-0.5">Identidade</span>
                                                    <p className="text-white font-medium">{lock.product_identity || 'N/A'}</p>
                                                </div>
                                                <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
                                                    <span className="text-[9px] font-mono font-bold text-slate-400 uppercase block mb-0.5">Cores & Acabamento</span>
                                                    <p className="text-slate-200">{lock.colors_and_finish || 'N/A'}</p>
                                                </div>
                                                <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
                                                    <span className="text-[9px] font-mono font-bold text-slate-400 uppercase block mb-0.5">Materiais & Texturas</span>
                                                    <p className="text-slate-200">{lock.material_and_texture || 'N/A'}</p>
                                                </div>
                                                <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
                                                    <span className="text-[9px] font-mono font-bold text-slate-400 uppercase block mb-0.5">Logos & Marcas</span>
                                                    <p className="text-slate-200">{lock.logos_and_text || 'N/A'}</p>
                                                </div>
                                            </div>

                                            {lock.object_lock_prompt_en && (
                                                <div className="border-t border-slate-850 pt-2 space-y-1">
                                                    <span className="text-[9px] font-mono font-bold text-cyan-400 uppercase block">Prompt de Trava Injetado (English):</span>
                                                    <pre className="text-[10px] text-cyan-200 bg-black/60 p-2 rounded-lg border border-cyan-500/20 font-mono whitespace-pre-wrap max-h-[120px] overflow-y-auto custom-scrollbar">
                                                        {lock.object_lock_prompt_en}
                                                    </pre>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}

                                {/* Navigation tabs for output formats */}
                                <div className="flex border-b border-slate-850 gap-1.5 pb-2 overflow-x-auto select-none">
                                    {[
                                        { id: 'creator', label: 'Creator Prompt' },
                                        { id: 'veo', label: 'Veo 3 / Flow' },
                                        { id: 'sora', label: 'Sora 2' },
                                        { id: 'grok', label: 'Grok' },
                                        { id: 'json', label: 'JSON' },
                                        { id: 'scene_blocks', label: 'Scene Blocks' }
                                    ].map(tab => (
                                        <button 
                                            key={tab.id} 
                                            onClick={() => {
                                                setActiveTab(tab.id as any);
                                                if (['veo', 'sora', 'grok'].includes(tab.id)) {
                                                    setModelStructureSource(tab.id as any);
                                                }
                                            }} 
                                            className={`pb-1 px-3 text-[10px] font-bold cursor-pointer transition whitespace-nowrap ${activeTab === tab.id ? 'border-b-2 border-indigo-500 text-indigo-400 font-bold' : 'text-slate-500 hover:text-slate-300'}`}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>

                                {/* Global copy control buttons */}
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 bg-slate-950/40 p-2.5 border border-slate-850 rounded-xl font-mono text-[9px]">
                                    <button 
                                        onClick={handleCopyAllScenes} 
                                        className="bg-indigo-600/5 hover:bg-indigo-600/15 text-indigo-400 hover:text-white py-1.5 px-2 rounded border border-indigo-500/25 transition cursor-pointer flex justify-center items-center gap-1.5 font-bold"
                                        title="Copy All Scenes formatted with labels"
                                    >
                                        <LucideIcon name="copy" className="w-3 h-3" /> Copy All Scenes
                                    </button>
                                    <button 
                                        onClick={handleCopyAllVisualPrompts} 
                                        className="bg-blue-600/5 hover:bg-blue-600/15 text-blue-400 hover:text-white py-1.5 px-2 rounded border border-blue-500/25 transition cursor-pointer flex justify-center items-center gap-1.5 font-bold"
                                        title="Copy all English visual prompts"
                                    >
                                        <LucideIcon name="image" className="w-3 h-3" /> Copy All Visual Prompts EN
                                    </button>
                                    <button 
                                        onClick={handleCopyAllDialogues} 
                                        className="bg-emerald-600/5 hover:bg-emerald-600/15 text-emerald-400 hover:text-white py-1.5 px-2 rounded border border-emerald-500/25 transition cursor-pointer flex justify-center items-center gap-1.5 font-bold"
                                        title="Copy all Brazilian Portuguese dialogues"
                                    >
                                        <LucideIcon name="message-square" className="w-3 h-3" /> Copy All Dialogue PT-BR
                                    </button>
                                    <button 
                                        onClick={handleCopyJSON} 
                                        className="bg-purple-600/5 hover:bg-purple-600/15 text-purple-400 hover:text-white py-1.5 px-2 rounded border border-purple-500/25 transition cursor-pointer flex justify-center items-center gap-1.5 font-bold"
                                        title="Copy raw JSON payload"
                                    >
                                        <LucideIcon name="code" className="w-3 h-3" /> Copy JSON
                                    </button>
                                </div>

                                {/* Active content rendering */}
                                <div className="flex-1 max-h-[380px] overflow-y-auto custom-scrollbar bg-black/40 border border-slate-850 rounded-xl p-4">
                                    {activeTab === 'creator' && (
                                        <div className="space-y-3">
                                            <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">{result.creator_prompt || 'Nenhum prompt criador retornado.'}</p>
                                            {result.tiktok_caption && (
                                                <div className="p-3 bg-indigo-500/5 rounded border border-indigo-500/10 mt-4">
                                                    <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider block mb-1">Legenda Recomendada:</span>
                                                    <p className="text-xs text-slate-300">{result.tiktok_caption}</p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {activeTab === 'json' && (
                                        <pre className="text-[9px] text-indigo-200 font-mono select-all leading-normal whitespace-pre-wrap">
                                            {JSON.stringify(result, null, 2)}
                                        </pre>
                                    )}

                                    {['veo', 'sora', 'grok'].includes(activeTab) && (
                                        <div className="space-y-4">
                                            {getActiveBlocks().map((block: any, idx: number) => renderSceneCard(block, idx))}
                                        </div>
                                    )}

                                    {activeTab === 'scene_blocks' && (
                                        <div className="space-y-4 animate-fade-in text-sans">
                                            <div className="flex items-center justify-between border-b border-slate-850 pb-3">
                                                <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">Estrutura de Vídeo:</span>
                                                <div className="flex gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                                                    {[
                                                        { id: 'veo', label: 'Veo 3 / Flow' },
                                                        { id: 'sora', label: 'Sora 2' },
                                                        { id: 'grok', label: 'Grok 6s' }
                                                    ].map(opt => (
                                                        <button
                                                            key={opt.id}
                                                            onClick={() => setModelStructureSource(opt.id as any)}
                                                            className={`text-[9px] font-semibold px-2 py-1 rounded transition-all cursor-pointer ${modelStructureSource === opt.id ? 'bg-indigo-600/30 text-indigo-400 border border-indigo-500/20' : 'text-slate-500 hover:text-slate-200 border border-transparent'}`}
                                                        >
                                                            {opt.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="space-y-4 pt-1">
                                                {getActiveStructureBlocks().length === 0 ? (
                                                    <p className="text-xs font-mono text-slate-500">Nenhuma cena gerada para este formato.</p>
                                                ) : (
                                                    getActiveStructureBlocks().map((block: any, idx: number) => renderSceneCard(block, idx))
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </Card>
                </div>
            </div>
            </div>
        </div>
    );
}
