import {
    ProductVisionData,
    CinematicShot,
    CommerceDemoFamily,
    CommerceShotFunction,
    CommerceInformationGain,
    CommerceShotPlan,
    CommerceStrategyPlanInput,
    CommerceStrategyPlanOutput
} from './types';

// =========================================================================
// COMMERCE DEMO FAMILIES METADATA & DEFINITIONS
// =========================================================================

export interface CommerceDemoFamilyDef {
    key: Exclude<CommerceDemoFamily, 'AUTO'>;
    label: string;
    description: string;
    recommendedCategories: string[];
    defaultCameraStyle: string;
    pacingTempo: 'snappy' | 'balanced' | 'fast_paced' | 'editorial';
    baseInformationPriority: CommerceInformationGain[];
}

export const COMMERCE_DEMO_FAMILIES: Record<Exclude<CommerceDemoFamily, 'AUTO'>, CommerceDemoFamilyDef> = {
    UGC_POV_NATURAL: {
        key: 'UGC_POV_NATURAL',
        label: 'UGC POV Natural',
        description: 'Autêntico, visão em primeira pessoa (POV), iluminação ambiente natural e manuseio orgânico.',
        recommendedCategories: ['utilidades', 'cozinha', 'organizacao', 'eletronicos', 'beleza', 'geral'],
        defaultCameraStyle: 'Organic handheld POV with subtle authentic motion and natural eye-level framing',
        pacingTempo: 'snappy',
        baseInformationPriority: ['use', 'scale', 'functional_interaction', 'result']
    },
    WEAR_DEMO: {
        key: 'WEAR_DEMO',
        label: 'Wear Demo (Caimento no Corpo/Pulso)',
        description: 'Focado em caimento, escala real no corpo/pulso e estética de uso em pessoas.',
        recommendedCategories: ['relogio', 'joias', 'moda', 'calcados', 'acessorios'],
        defaultCameraStyle: 'Smooth tracking on body part (wrist, torso, feet) with high sharpness and clean framing',
        pacingTempo: 'balanced',
        baseInformationPriority: ['fit', 'scale', 'appearance', 'clasp']
    },
    HAND_DEMO: {
        key: 'HAND_DEMO',
        label: 'Hand Demo (Manuseio & Toque)',
        description: 'Demonstração tátil guiada pelas mãos, mostrando escala, peso, botões e texturas.',
        recommendedCategories: ['eletronicos', 'gadgets', 'ferramentas', 'utilidades', 'skincare'],
        defaultCameraStyle: 'Stable medium close-up, following natural hand gestures and tactile manipulation',
        pacingTempo: 'snappy',
        baseInformationPriority: ['functional_interaction', 'mechanism', 'texture', 'scale']
    },
    MACRO_DETAIL: {
        key: 'MACRO_DETAIL',
        label: 'Macro Detail (Hiper-Detalhes & Acabamento)',
        description: 'Close-ups extremos destacando materiais premium, costuras, gravações e engastes.',
        recommendedCategories: ['joias', 'relogio', 'perfume', 'luxo', 'acessorios'],
        defaultCameraStyle: 'Ultra-sharp 85mm/100mm macro push-in with controlled specular highlights',
        pacingTempo: 'balanced',
        baseInformationPriority: ['texture', 'material', 'finish', 'engraving']
    },
    UNBOXING: {
        key: 'UNBOXING',
        label: 'Unboxing Ágil',
        description: 'Experiência de abertura de caixa, remoção de lacre, berço de embalagem e primeiro contato.',
        recommendedCategories: ['eletronicos', 'perfume', 'luxo', 'calcados', 'kits'],
        defaultCameraStyle: 'Top-down 45-degree angled view with smooth glide over open packaging and items',
        pacingTempo: 'snappy',
        baseInformationPriority: ['appearance', 'scale', 'mechanism', 'finish']
    },
    PREMIUM_STUDIO: {
        key: 'PREMIUM_STUDIO',
        label: 'Premium Studio Showcase',
        description: 'Estética comercial de luxo com iluminação 3 pontos calibrada, superfícies nobres e reflexos controlados.',
        recommendedCategories: ['luxo', 'relogio', 'perfume', 'joias', 'cosmeticos'],
        defaultCameraStyle: 'Polished studio motorized push-in, subtle 180 orbit or precise pan across premium surface',
        pacingTempo: 'balanced',
        baseInformationPriority: ['appearance', 'finish', 'material', 'texture']
    },
    LIFESTYLE: {
        key: 'LIFESTYLE',
        label: 'Lifestyle em Contexto Real',
        description: 'Produto inserido em ambiente de uso real cotidiano (escritório, sala, rua, café, academia).',
        recommendedCategories: ['moda', 'relogio', 'decoracao', 'casa', 'utilidades'],
        defaultCameraStyle: 'Dynamic contextual handheld or glide tracking in aesthetic real-world environment',
        pacingTempo: 'balanced',
        baseInformationPriority: ['context_of_use', 'fit', 'use', 'result']
    },
    EDITORIAL_LOOKBOOK: {
        key: 'EDITORIAL_LOOKBOOK',
        label: 'Editorial & Lookbook',
        description: 'Estética de alta moda, contrastes refinados, composição de revista e elegância visual.',
        recommendedCategories: ['moda', 'calcados', 'joias', 'oculos', 'bolsas'],
        defaultCameraStyle: 'Composed low-angle or full vertical framing with high-end editorial lighting',
        pacingTempo: 'editorial',
        baseInformationPriority: ['fit', 'appearance', 'material', 'context_of_use']
    },
    HIGH_ENERGY_VIRAL: {
        key: 'HIGH_ENERGY_VIRAL',
        label: 'High Energy Social / Viral',
        description: 'Cortes rápidos, ganchos visuais dinâmicos e ritmo veloz para TikTok, Reels e Shorts.',
        recommendedCategories: ['utilidades', 'promocao', 'ferramentas', 'gadgets', 'viral'],
        defaultCameraStyle: 'Snappy dynamic push-ins, quick tilts, and crisp punchy zooms keeping focus locked',
        pacingTempo: 'fast_paced',
        baseInformationPriority: ['use', 'result', 'appearance', 'functional_interaction']
    }
};

// =========================================================================
// SHOT FUNCTION SEMANTICS & INFORMATION GAIN MAPPING
// =========================================================================

export interface ShotFunctionMetadata {
    type: CommerceShotFunction;
    label: string;
    primaryInfo: CommerceInformationGain[];
    defaultVisualObjective: string;
    defaultFraming: string;
    baseCameraSuggestion: string;
    actionComplexity: 'static' | 'simple' | 'complex';
    cameraComplexity: 'minimal' | 'low' | 'moderate';
}

export const SHOT_FUNCTIONS_METADATA: Record<CommerceShotFunction, ShotFunctionMetadata> = {
    PRODUCT_HOOK: {
        type: 'PRODUCT_HOOK',
        label: 'Gancho Visual Imediato (0-2s)',
        primaryInfo: ['appearance', 'scale'],
        defaultVisualObjective: 'Apresentar o produto instantaneamente no primeiro segundo com clareza total de forma e apelo.',
        defaultFraming: 'Enquadramento centralizado 9:16 com produto ocupando 60-70% do quadro',
        baseCameraSuggestion: 'Short snappy push-in or slight dynamic punch-in, perfectly centered',
        actionComplexity: 'simple',
        cameraComplexity: 'low'
    },
    HERO_PRODUCT: {
        type: 'HERO_PRODUCT',
        label: 'Plano Principal do Produto',
        primaryInfo: ['appearance', 'finish'],
        defaultVisualObjective: 'Exibir a silhueta completa, marca e acabamento impecável do produto.',
        defaultFraming: 'Plano médio limpo 9:16 com foco cristalino',
        baseCameraSuggestion: 'Smooth subtle push-in or stable centered frame with gentle specular light shift',
        actionComplexity: 'static',
        cameraComplexity: 'moderate'
    },
    WEAR_DEMO: {
        type: 'WEAR_DEMO',
        label: 'Demonstração de Caimento / Uso no Corpo',
        primaryInfo: ['fit', 'scale', 'use'],
        defaultVisualObjective: 'Mostrar proporção, caimento e valor estético do produto quando vestido/usado no corpo.',
        defaultFraming: 'Plano vertical fechado no pulso, tronco, pés ou pescoço',
        baseCameraSuggestion: 'Subtle handheld tracking following natural body stance without shakiness',
        actionComplexity: 'simple',
        cameraComplexity: 'low'
    },
    HAND_DEMO: {
        type: 'HAND_DEMO',
        label: 'Interação e Manuseio por Mãos',
        primaryInfo: ['functional_interaction', 'scale', 'texture'],
        defaultVisualObjective: 'Provar a escala tátil e facilidade de manuseio com dedos e mãos realistas.',
        defaultFraming: 'Plano médio fechado focado nas mãos e no produto',
        baseCameraSuggestion: 'Stable lock-on camera with minimal pan, keeping hands and product fully in focus',
        actionComplexity: 'complex',
        cameraComplexity: 'minimal'
    },
    FEATURE_PROOF: {
        type: 'FEATURE_PROOF',
        label: 'Prova Visual de Funcionalidade / Benefício',
        primaryInfo: ['mechanism', 'functional_interaction', 'result'],
        defaultVisualObjective: 'Demonstrar na prática o funcionamento de uma característica-chave (clique, trava, resistência, acionamento).',
        defaultFraming: 'Plano fechado focado na área de ação funcional',
        baseCameraSuggestion: 'Stable locked-off camera with zero wobble to highlight the exact mechanism in action',
        actionComplexity: 'complex',
        cameraComplexity: 'minimal'
    },
    MACRO_DETAIL: {
        type: 'MACRO_DETAIL',
        label: 'Detalhe Hiper-Macro de Engenharia/Acabamento',
        primaryInfo: ['texture', 'material', 'finish'],
        defaultVisualObjective: 'Revelar a densidade de material nobre, textura e precisão milimétrica.',
        defaultFraming: 'Close-up extremo macro 4K com profundidade de campo rasa controlada',
        baseCameraSuggestion: 'Slow micro-glide with 85mm macro lens, keeping the specific detail razor-sharp',
        actionComplexity: 'static',
        cameraComplexity: 'low'
    },
    TEXTURE_DETAIL: {
        type: 'TEXTURE_DETAIL',
        label: 'Textura e Superfície Tátil',
        primaryInfo: ['texture', 'material'],
        defaultVisualObjective: 'Exibir a trama do tecido, granulação do couro, escovação do metal ou polimento do vidro.',
        defaultFraming: 'Close-up macro angular com luz rasante destacando relevos',
        baseCameraSuggestion: 'Gentle tilt or slow linear slide revealing textural topography and grain',
        actionComplexity: 'static',
        cameraComplexity: 'low'
    },
    MATERIAL_DETAIL: {
        type: 'MATERIAL_DETAIL',
        label: 'Qualidade do Material e Construção',
        primaryInfo: ['material', 'finish'],
        defaultVisualObjective: 'Comprovar a robustez e autenticidade da matéria-prima empregada.',
        defaultFraming: 'Plano fechado com iluminação refletindo o brilho ou fosco autêntico',
        baseCameraSuggestion: 'Controlled pan across the primary material surface with realistic reflection glide',
        actionComplexity: 'static',
        cameraComplexity: 'low'
    },
    CLASP_DETAIL: {
        type: 'CLASP_DETAIL',
        label: 'Fecho, Engaste e Encaixe de Segurança',
        primaryInfo: ['clasp', 'mechanism', 'fit'],
        defaultVisualObjective: 'Evidenciar a precisão da trava, fecho dobrável, fivela ou sistema de união.',
        defaultFraming: 'Macro focado no fecho ou terminal de junção',
        baseCameraSuggestion: 'Stable close-up as hands gently fasten or display the clasp mechanism',
        actionComplexity: 'simple',
        cameraComplexity: 'minimal'
    },
    ENGRAVING_DETAIL: {
        type: 'ENGRAVING_DETAIL',
        label: 'Gravação, Logotipo e Marcações',
        primaryInfo: ['engraving', 'finish', 'appearance'],
        defaultVisualObjective: 'Mostrar a nitidez das gravações em baixo relevo, logos e tipografia original.',
        defaultFraming: 'Macro cirúrgico nos grafismos e relevos da marca',
        baseCameraSuggestion: 'Crisp stable macro with specular light glinting over engraved edges',
        actionComplexity: 'static',
        cameraComplexity: 'minimal'
    },
    UNBOXING: {
        type: 'UNBOXING',
        label: 'Abertura de Embalagem & Primeiro Acesso',
        primaryInfo: ['appearance', 'scale', 'mechanism'],
        defaultVisualObjective: 'Transmitir o prazer de receber e abrir a embalagem oficial com todos os itens.',
        defaultFraming: 'Plano superior a 45 graus sobre a mesa de apresentação',
        baseCameraSuggestion: 'Smooth glide down and push-in as the box lid lifts cleanly',
        actionComplexity: 'simple',
        cameraComplexity: 'low'
    },
    OPEN_CLOSE: {
        type: 'OPEN_CLOSE',
        label: 'Abertura e Fechamento de Tampa / Mecanismo',
        primaryInfo: ['mechanism', 'functional_interaction'],
        defaultVisualObjective: 'Mostrar a vedação, dobradiça, clique magnético ou rosqueamento suave.',
        defaultFraming: 'Plano fechado no ponto de articulação/abertura',
        baseCameraSuggestion: 'Fixed tripod-style stability capturing the smooth open/close motion',
        actionComplexity: 'simple',
        cameraComplexity: 'minimal'
    },
    APPLICATION: {
        type: 'APPLICATION',
        label: 'Aplicação Prática (Spray / Espalhar / Utilizar)',
        primaryInfo: ['application', 'use', 'result'],
        defaultVisualObjective: 'Demonstrar o fluxo da aplicação (névoa de spray, dosagem de produto, toque na pele).',
        defaultFraming: 'Plano médio curto em ângulo favorável à iluminação da substância/fluxo',
        baseCameraSuggestion: 'High-speed style capture with slight tracking of the application trajectory',
        actionComplexity: 'complex',
        cameraComplexity: 'minimal'
    },
    LIFESTYLE_USE: {
        type: 'LIFESTYLE_USE',
        label: 'Uso em Contexto de Vida Real',
        primaryInfo: ['context_of_use', 'use', 'result'],
        defaultVisualObjective: 'Conectar o produto com o dia a dia do usuário e gerar identificação aspiracional.',
        defaultFraming: 'Plano médio dinâmico em ambiente realista (sala, escritório, rua, mesa)',
        baseCameraSuggestion: 'Natural handheld movement with organic pacing and shallow background blur',
        actionComplexity: 'simple',
        cameraComplexity: 'low'
    },
    RESULT_VISUAL: {
        type: 'RESULT_VISUAL',
        label: 'Resultado Visual Concluído / Transformação',
        primaryInfo: ['result', 'use'],
        defaultVisualObjective: 'Apresentar a transformação alcançada (espaço organizado, visual pronto, tarefa cumprida).',
        defaultFraming: 'Plano aberto limpo destacando o resultado satisfatório',
        baseCameraSuggestion: 'Smooth pull-back reveal showcasing the clean, rewarding outcome',
        actionComplexity: 'static',
        cameraComplexity: 'low'
    },
    ALTERNATE_ANGLE: {
        type: 'ALTERNATE_ANGLE',
        label: 'Ângulo Alternativo / Perspectiva 3D',
        primaryInfo: ['appearance', 'scale'],
        defaultVisualObjective: 'Oferecer ao cliente a visão de costas, perfil ou vista lateral completa do item.',
        defaultFraming: 'Plano em 45 graus ou perfil lateral limpo',
        baseCameraSuggestion: 'Controlled slight pan or smooth 90/180 arc showing the complete depth',
        actionComplexity: 'static',
        cameraComplexity: 'low'
    },
    FINAL_HERO: {
        type: 'FINAL_HERO',
        label: 'Hero Shot Final de Conversão',
        primaryInfo: ['appearance', 'finish'],
        defaultVisualObjective: 'Fixar a imagem definitiva de desejo do produto, pronto para a decisão de compra.',
        defaultFraming: 'Composição simétrica centralizada 9:16 com embalagem e produto',
        baseCameraSuggestion: 'Slow elegant pedestal settling into a confident, balanced closing frame',
        actionComplexity: 'static',
        cameraComplexity: 'low'
    },
    LOOP_RETURN: {
        type: 'LOOP_RETURN',
        label: 'Retorno para Loop Infinito (Social)',
        primaryInfo: ['appearance'],
        defaultVisualObjective: 'Finalizar com movimento que conecta perfeitamente com o primeiro segundo do vídeo.',
        defaultFraming: 'Enquadramento idêntico ao gancho inicial para loop perfeito',
        baseCameraSuggestion: 'Snap pull-back or rotation returning to initial starting position',
        actionComplexity: 'simple',
        cameraComplexity: 'low'
    }
};

// =========================================================================
// CATEGORY-AWARE FUNCTION MATRIX
// =========================================================================

export interface CategorySequenceStrategy {
    normalizedCategory: string;
    keywords: string[];
    defaultFamily: Exclude<CommerceDemoFamily, 'AUTO'>;
    eightSecondSequence: CommerceShotFunction[];
    tenSecondSequence: CommerceShotFunction[];
    fifteenSecondSequence: CommerceShotFunction[];
    forbiddenShotFunctions: CommerceShotFunction[];
}

export const CATEGORY_COMMERCE_STRATEGIES: Record<string, CategorySequenceStrategy> = {
    jewelry: {
        normalizedCategory: 'jewelry',
        keywords: ['joia', 'jewel', 'anel', 'colar', 'brinco', 'pingente', 'prata', 'ouro', 'diamante', 'pulseira'],
        defaultFamily: 'WEAR_DEMO',
        eightSecondSequence: ['PRODUCT_HOOK', 'WEAR_DEMO', 'MACRO_DETAIL', 'FINAL_HERO'],
        tenSecondSequence: ['PRODUCT_HOOK', 'WEAR_DEMO', 'TEXTURE_DETAIL', 'CLASP_DETAIL', 'FINAL_HERO'],
        fifteenSecondSequence: ['PRODUCT_HOOK', 'WEAR_DEMO', 'TEXTURE_DETAIL', 'CLASP_DETAIL', 'LIFESTYLE_USE', 'ALTERNATE_ANGLE', 'FINAL_HERO'],
        forbiddenShotFunctions: ['APPLICATION']
    },
    watches: {
        normalizedCategory: 'watches',
        keywords: ['watch', 'relogio', 'relógio', 'smartwatch', 'cronógrafo', 'pulso'],
        defaultFamily: 'WEAR_DEMO',
        eightSecondSequence: ['PRODUCT_HOOK', 'WEAR_DEMO', 'MACRO_DETAIL', 'FINAL_HERO'],
        tenSecondSequence: ['PRODUCT_HOOK', 'WEAR_DEMO', 'TEXTURE_DETAIL', 'CLASP_DETAIL', 'FINAL_HERO'],
        fifteenSecondSequence: ['PRODUCT_HOOK', 'WEAR_DEMO', 'TEXTURE_DETAIL', 'CLASP_DETAIL', 'FEATURE_PROOF', 'LIFESTYLE_USE', 'FINAL_HERO'],
        forbiddenShotFunctions: ['APPLICATION']
    },
    perfume: {
        normalizedCategory: 'perfume',
        keywords: ['perfume', 'fragrancia', 'fragrância', 'colonia', 'colônia', 'aroma', 'eau de parfum'],
        defaultFamily: 'PREMIUM_STUDIO',
        eightSecondSequence: ['PRODUCT_HOOK', 'OPEN_CLOSE', 'APPLICATION', 'FINAL_HERO'],
        tenSecondSequence: ['PRODUCT_HOOK', 'OPEN_CLOSE', 'MACRO_DETAIL', 'APPLICATION', 'FINAL_HERO'],
        fifteenSecondSequence: ['PRODUCT_HOOK', 'UNBOXING', 'OPEN_CLOSE', 'MACRO_DETAIL', 'APPLICATION', 'LIFESTYLE_USE', 'FINAL_HERO'],
        forbiddenShotFunctions: ['WEAR_DEMO', 'CLASP_DETAIL']
    },
    fashion: {
        normalizedCategory: 'fashion',
        keywords: ['moda', 'vestido', 'camisa', 'camiseta', 'calça', 'calca', 'jaqueta', 'casaco', 'roupa', 'blusa', 'saia'],
        defaultFamily: 'WEAR_DEMO',
        eightSecondSequence: ['PRODUCT_HOOK', 'WEAR_DEMO', 'MATERIAL_DETAIL', 'FINAL_HERO'],
        tenSecondSequence: ['PRODUCT_HOOK', 'WEAR_DEMO', 'MATERIAL_DETAIL', 'HAND_DEMO', 'FINAL_HERO'],
        fifteenSecondSequence: ['PRODUCT_HOOK', 'WEAR_DEMO', 'MATERIAL_DETAIL', 'HAND_DEMO', 'LIFESTYLE_USE', 'ALTERNATE_ANGLE', 'FINAL_HERO'],
        forbiddenShotFunctions: ['APPLICATION', 'CLASP_DETAIL', 'OPEN_CLOSE']
    },
    home_org: {
        normalizedCategory: 'home_org',
        keywords: ['organizacao', 'organizador', 'casa', 'cozinha', 'decoracao', 'estante', 'gaveta', 'pote', 'armario', 'mesa'],
        defaultFamily: 'UGC_POV_NATURAL',
        eightSecondSequence: ['PRODUCT_HOOK', 'HAND_DEMO', 'RESULT_VISUAL', 'FINAL_HERO'],
        tenSecondSequence: ['PRODUCT_HOOK', 'HAND_DEMO', 'FEATURE_PROOF', 'RESULT_VISUAL', 'FINAL_HERO'],
        fifteenSecondSequence: ['PRODUCT_HOOK', 'LIFESTYLE_USE', 'HAND_DEMO', 'OPEN_CLOSE', 'FEATURE_PROOF', 'RESULT_VISUAL', 'FINAL_HERO'],
        forbiddenShotFunctions: ['WEAR_DEMO', 'CLASP_DETAIL']
    },
    utility: {
        normalizedCategory: 'utility',
        keywords: ['utilidades', 'ferramenta', 'tool', 'suporte', 'chave', 'multiuso', 'lanterna', 'pratico', 'acessorio auto'],
        defaultFamily: 'HIGH_ENERGY_VIRAL',
        eightSecondSequence: ['PRODUCT_HOOK', 'HAND_DEMO', 'FEATURE_PROOF', 'RESULT_VISUAL'],
        tenSecondSequence: ['PRODUCT_HOOK', 'HAND_DEMO', 'FEATURE_PROOF', 'MATERIAL_DETAIL', 'RESULT_VISUAL'],
        fifteenSecondSequence: ['PRODUCT_HOOK', 'HAND_DEMO', 'FEATURE_PROOF', 'MATERIAL_DETAIL', 'RESULT_VISUAL', 'ALTERNATE_ANGLE', 'FINAL_HERO'],
        forbiddenShotFunctions: ['WEAR_DEMO']
    },
    electronics: {
        normalizedCategory: 'electronics',
        keywords: ['eletronico', 'gadget', 'fone', 'fone de ouvido', 'celular', 'carregador', 'teclado', 'mouse', 'caixa de som', 'smart'],
        defaultFamily: 'HAND_DEMO',
        eightSecondSequence: ['PRODUCT_HOOK', 'HAND_DEMO', 'FEATURE_PROOF', 'FINAL_HERO'],
        tenSecondSequence: ['PRODUCT_HOOK', 'HAND_DEMO', 'FEATURE_PROOF', 'MACRO_DETAIL', 'FINAL_HERO'],
        fifteenSecondSequence: ['PRODUCT_HOOK', 'UNBOXING', 'HAND_DEMO', 'FEATURE_PROOF', 'MACRO_DETAIL', 'RESULT_VISUAL', 'FINAL_HERO'],
        forbiddenShotFunctions: ['WEAR_DEMO', 'APPLICATION']
    },
    beauty_skincare: {
        normalizedCategory: 'beauty_skincare',
        keywords: ['skincare', 'beleza', 'creme', 'sérum', 'serum', 'batom', 'maquiagem', 'hidratante', 'tonico', 'facial', 'cosmetico'],
        defaultFamily: 'HAND_DEMO',
        eightSecondSequence: ['PRODUCT_HOOK', 'TEXTURE_DETAIL', 'APPLICATION', 'RESULT_VISUAL'],
        tenSecondSequence: ['PRODUCT_HOOK', 'OPEN_CLOSE', 'TEXTURE_DETAIL', 'APPLICATION', 'RESULT_VISUAL'],
        fifteenSecondSequence: ['PRODUCT_HOOK', 'UNBOXING', 'OPEN_CLOSE', 'TEXTURE_DETAIL', 'APPLICATION', 'RESULT_VISUAL', 'FINAL_HERO'],
        forbiddenShotFunctions: ['CLASP_DETAIL']
    },
    footwear: {
        normalizedCategory: 'footwear',
        keywords: ['tenis', 'tênis', 'sapato', 'calcado', 'calçado', 'bota', 'sandalia', 'sandália', 'chinelo', 'sneaker'],
        defaultFamily: 'WEAR_DEMO',
        eightSecondSequence: ['PRODUCT_HOOK', 'WEAR_DEMO', 'TEXTURE_DETAIL', 'FINAL_HERO'],
        tenSecondSequence: ['PRODUCT_HOOK', 'WEAR_DEMO', 'TEXTURE_DETAIL', 'LIFESTYLE_USE', 'FINAL_HERO'],
        fifteenSecondSequence: ['PRODUCT_HOOK', 'UNBOXING', 'WEAR_DEMO', 'TEXTURE_DETAIL', 'HAND_DEMO', 'LIFESTYLE_USE', 'FINAL_HERO'],
        forbiddenShotFunctions: ['APPLICATION']
    },
    food_beverage: {
        normalizedCategory: 'food_beverage',
        keywords: ['alimento', 'bebida', 'cafe', 'café', 'suco', 'vinho', 'garrafa', 'snack', 'chocolate', 'whey', 'suplemento'],
        defaultFamily: 'UGC_POV_NATURAL',
        eightSecondSequence: ['PRODUCT_HOOK', 'OPEN_CLOSE', 'APPLICATION', 'RESULT_VISUAL'],
        tenSecondSequence: ['PRODUCT_HOOK', 'OPEN_CLOSE', 'TEXTURE_DETAIL', 'APPLICATION', 'RESULT_VISUAL'],
        fifteenSecondSequence: ['PRODUCT_HOOK', 'UNBOXING', 'OPEN_CLOSE', 'TEXTURE_DETAIL', 'APPLICATION', 'RESULT_VISUAL', 'FINAL_HERO'],
        forbiddenShotFunctions: ['WEAR_DEMO', 'CLASP_DETAIL']
    },
    general: {
        normalizedCategory: 'general',
        keywords: [],
        defaultFamily: 'HAND_DEMO',
        eightSecondSequence: ['PRODUCT_HOOK', 'HAND_DEMO', 'FEATURE_PROOF', 'FINAL_HERO'],
        tenSecondSequence: ['PRODUCT_HOOK', 'HAND_DEMO', 'TEXTURE_DETAIL', 'FEATURE_PROOF', 'FINAL_HERO'],
        fifteenSecondSequence: ['PRODUCT_HOOK', 'HAND_DEMO', 'TEXTURE_DETAIL', 'FEATURE_PROOF', 'LIFESTYLE_USE', 'ALTERNATE_ANGLE', 'FINAL_HERO'],
        forbiddenShotFunctions: []
    }
};

// =========================================================================
// HELPER FUNCTIONS FOR RESOLUTION & PLANNING
// =========================================================================

/**
 * Resolves the best matching category strategy from vision data and product name.
 */
export function resolveCategoryCommerceStrategy(visionData?: ProductVisionData, productName?: string): CategorySequenceStrategy {
    const combinedText = `${visionData?.category || ''} ${visionData?.rawVisionSummary || ''} ${productName || ''}`.toLowerCase();

    for (const [key, strategy] of Object.entries(CATEGORY_COMMERCE_STRATEGIES)) {
        if (key === 'general') continue;
        if (strategy.keywords.some(kw => combinedText.includes(kw))) {
            return strategy;
        }
    }

    return CATEGORY_COMMERCE_STRATEGIES.general;
}

/**
 * Resolves the final Commerce Demo Family if AUTO is requested.
 */
export function resolveCommerceDemoFamily(
    requestedFamily: CommerceDemoFamily | undefined,
    strategy: CategorySequenceStrategy
): Exclude<CommerceDemoFamily, 'AUTO'> {
    if (requestedFamily && requestedFamily !== 'AUTO') {
        return requestedFamily;
    }
    return strategy.defaultFamily;
}

/**
 * Calculates beat count and exact duration slices for target video duration.
 */
export function calculateDurationPlan(durationSec: number = 10): { targetBeats: number; durations: number[] } {
    let targetBeats = 4;

    if (durationSec <= 8) {
        targetBeats = 4;
    } else if (durationSec <= 11) {
        targetBeats = 5;
    } else {
        targetBeats = 6;
    }

    const baseDuration = Number((durationSec / targetBeats).toFixed(1));
    const durations = new Array(targetBeats).fill(baseDuration);

    // Minor adjustment for exact sum
    const currentSum = durations.reduce((acc, v) => acc + v, 0);
    const diff = Number((durationSec - currentSum).toFixed(1));
    if (durations.length > 0) {
        durations[durations.length - 1] = Number((durations[durations.length - 1] + diff).toFixed(1));
    }

    return { targetBeats, durations };
}

/**
 * Eliminates consecutive redundant shot functions to uphold the core principle:
 * "Every shot must reveal new commercial information."
 */
export function sanitizeShotSequence(
    sequence: CommerceShotFunction[],
    forbidden: CommerceShotFunction[]
): CommerceShotFunction[] {
    const filtered = sequence.filter(fn => !forbidden.includes(fn));
    const sanitized: CommerceShotFunction[] = [];

    for (let i = 0; i < filtered.length; i++) {
        const current = filtered[i];
        const prev = sanitized[sanitized.length - 1];

        if (current === prev) {
            continue; // Skip consecutive duplicates
        }

        // Check if both reveal identical primary info with no variation
        if (prev) {
            const currentMeta = SHOT_FUNCTIONS_METADATA[current];
            const prevMeta = SHOT_FUNCTIONS_METADATA[prev];
            const hasOverlappingPrimary = currentMeta.primaryInfo.every(info => prevMeta.primaryInfo.includes(info));
            if (hasOverlappingPrimary && currentMeta.primaryInfo.length === prevMeta.primaryInfo.length && currentMeta.type === prevMeta.type) {
                continue;
            }
        }

        sanitized.push(current);
    }

    // Ensure at least 3 shots exist
    if (sanitized.length < 3) {
        if (!sanitized.includes('PRODUCT_HOOK')) sanitized.unshift('PRODUCT_HOOK');
        if (!sanitized.includes('FEATURE_PROOF')) sanitized.push('FEATURE_PROOF');
        if (!sanitized.includes('FINAL_HERO')) sanitized.push('FINAL_HERO');
    }

    return sanitized;
}

/**
 * Applies the camera complexity balancing law:
 * ACTION COMPLEXITY UP -> CAMERA COMPLEXITY DOWN
 * Handles explicit 180 and 360 orbit requests when provided.
 */
export function balanceCameraRule(
    shotMeta: ShotFunctionMetadata,
    familyDef: CommerceDemoFamilyDef,
    requestedOrbitMode?: 'none' | '180_orbit' | '360_orbit'
): { cameraDescription: string; cameraComplexity: 'minimal' | 'low' | 'moderate' } {
    // If user explicitly requested 360 orbit on a static/hero shot, allow it conditionally
    if (requestedOrbitMode === '360_orbit' && (shotMeta.actionComplexity === 'static' || shotMeta.type === 'HERO_PRODUCT' || shotMeta.type === 'FINAL_HERO' || shotMeta.type === 'PRODUCT_HOOK')) {
        return {
            cameraDescription: 'Controlled 360-degree orbital rotation with smooth steady glide around the product, strictly respecting Object Lock 360° geometry',
            cameraComplexity: 'moderate'
        };
    }

    if (requestedOrbitMode === '180_orbit' && shotMeta.actionComplexity === 'static') {
        return {
            cameraDescription: 'Controlled 180-degree semi-orbital arc pan highlighting front and side product contours with zero wobble',
            cameraComplexity: 'low'
        };
    }

    if (shotMeta.actionComplexity === 'complex') {
        // High action complexity -> Minimal camera movement for maximum clarity
        return {
            cameraDescription: `Stable locked-off camera with minimal micro-tracking, keeping the physical hand action and product mechanism in razor-sharp focus (${familyDef.defaultCameraStyle})`,
            cameraComplexity: 'minimal'
        };
    }

    if (shotMeta.actionComplexity === 'simple') {
        return {
            cameraDescription: `Short controlled push-in or gentle tracking keeping product centered and legible (${shotMeta.baseCameraSuggestion})`,
            cameraComplexity: 'low'
        };
    }

    // Static product shot -> Can have moderate camera movement
    return {
        cameraDescription: `Smooth cinematic push-in or subtle lateral pan (${shotMeta.baseCameraSuggestion})`,
        cameraComplexity: 'moderate'
    };
}

/**
 * Builds localized text & prompt templates for a single planned shot.
 */
function buildShotPrompts(
    fn: CommerceShotFunction,
    visionData: ProductVisionData,
    productName: string,
    cameraDesc: string,
    stepIndex: number
): { visualPromptEn: string; actionPromptEn: string; dialoguePtBr: string; handAction: string } {
    const pName = productName || 'Produto';
    const material = visionData.material || 'premium material';
    const color = visionData.color || 'original color';
    const finish = visionData.finish || 'refined finish';
    const logo = visionData.logo || 'authentic logo';

    let visualPromptEn = '';
    let actionPromptEn = '';
    let dialoguePtBr = '';
    let handAction = '';

    switch (fn) {
        case 'PRODUCT_HOOK':
            visualPromptEn = `Instant vertical 9:16 product hook of ${pName} in ${color} with ${finish} finish. Centered high-clarity framing against clean aesthetic background.`;
            actionPromptEn = `${cameraDesc}. Immediate eye-catching commercial presentation with zero slow fade-in.`;
            dialoguePtBr = `Dá uma olhada nisso! Se você busca praticidade e acabamento premium, esse ${pName} vai te surpreender.`;
            handAction = `Mãos posicionando o ${pName} com firmeza no centro do enquadramento`;
            break;

        case 'WEAR_DEMO':
            visualPromptEn = `Demonstration shot showing ${pName} worn naturally. Focus on realistic proportions, snug fit and authentic ${material} texture against skin or clothing.`;
            actionPromptEn = `${cameraDesc}. Subtle body posture movement highlighting natural comfort and daily wear aesthetic.`;
            dialoguePtBr = `Olha o caimento perfeito no dia a dia. É extremamente confortável e combina com qualquer ocasião.`;
            handAction = `Ajustando suavemente a posição do ${pName} para demonstrar o caimento ideal`;
            break;

        case 'HAND_DEMO':
            visualPromptEn = `Close-up hand interaction with ${pName}. Realistic fingers holding and handling the item to prove true scale, lightweight design and tactile quality.`;
            actionPromptEn = `${cameraDesc}. Hands rotate and handle the product smoothly without obstructing key branding or contours.`;
            dialoguePtBr = `Pegando na mão você sente a qualidade na hora. O acabamento é muito bem construído e resistente.`;
            handAction = `Manipulação tátil cuidadosa exibindo lados e contornos com dedos naturais`;
            break;

        case 'FEATURE_PROOF':
            visualPromptEn = `Direct functional proof shot of ${pName}. Clear focus on key mechanism, interface or primary problem-solving feature in active operation.`;
            actionPromptEn = `${cameraDesc}. Real-time effortless operation demonstrating immediate benefit and utility.`;
            dialoguePtBr = `Funciona de forma rápida e intuitiva. Resolve exatamente o que promete sem complicação.`;
            handAction = `Acionando a função ou mecanismo principal com precisão`;
            break;

        case 'MACRO_DETAIL':
            visualPromptEn = `Extreme macro 4K close-up of ${pName} highlighting ${material} construction, precision edges and crisp ${logo} engraving.`;
            actionPromptEn = `${cameraDesc}. Controlled specular glints revealing microscopic manufacturing quality and premium finish.`;
            dialoguePtBr = `Olha os detalhes de perto! Cada linha e acabamento foi pensado para durar muito tempo.`;
            handAction = `Segurando o produto estável para visualização cirúrgica dos detalhes`;
            break;

        case 'TEXTURE_DETAIL':
            visualPromptEn = `Macro texture focus on the ${visionData.texture || 'refined'} surface of ${pName}. Light sweeps across the grain and material relief.`;
            actionPromptEn = `${cameraDesc}. Subtle light transition exposing deep textural quality and authentic tactile finish.`;
            dialoguePtBr = `A textura tem um toque super agradável e acabamento de altíssimo nível.`;
            handAction = `Dedo indicador deslizando suavemente pela superfície para evidenciar a textura`;
            break;

        case 'MATERIAL_DETAIL':
            visualPromptEn = `Close inspection shot of ${material} elements on ${pName}. Authentic reflection and durable construction highlighted.`;
            actionPromptEn = `${cameraDesc}. Clear visual verification of solid material authenticity and build integrity.`;
            dialoguePtBr = `Feito em ${material}, garantindo durabilidade máxima para o seu uso diário.`;
            handAction = `Segurando a base para enfatizar o peso e solidez dos materiais`;
            break;

        case 'CLASP_DETAIL':
            visualPromptEn = `Detailed close-up on the clasp, buckle or locking mechanism of ${pName}. Razor-sharp focus on closure precision.`;
            actionPromptEn = `${cameraDesc}. Smooth fastening motion showing secure fit and effortless release.`;
            dialoguePtBr = `O fecho é super seguro e prático de colocar e tirar.`;
            handAction = `Demonstrando o encaixe e a trava de segurança com movimento suave`;
            break;

        case 'ENGRAVING_DETAIL':
            visualPromptEn = `Ultra-detailed macro shot of authentic ${logo} and laser-sharp engraving on ${pName}.`;
            actionPromptEn = `${cameraDesc}. Subtle glint across engraved markings with pristine typographic fidelity.`;
            dialoguePtBr = `Gravações e detalhes originais que atestam a procedência e o bom gosto.`;
            handAction = `Inclinando levemente sob a luz para revelar os relevos da marca`;
            break;

        case 'UNBOXING':
            visualPromptEn = `Clean unboxing view of ${pName} inside its ${visionData.packaging || 'original presentation box'}. Complete kit and accessories visible.`;
            actionPromptEn = `${cameraDesc}. Smooth lid opening revealing pristine, ready-to-use product nestled in its custom tray.`;
            dialoguePtBr = `Chega nessa embalagem impecável, pronta para presentear ou estrear com estilo.`;
            handAction = `Abrindo a embalagem e levantando delicadamente o produto da caixa`;
            break;

        case 'OPEN_CLOSE':
            visualPromptEn = `Close-up shot of ${pName} cap, lid or opening mechanism smoothly engaging and sealing.`;
            actionPromptEn = `${cameraDesc}. Effortless open and close motion displaying airtight or magnetic precision.`;
            dialoguePtBr = `Abre e fecha com facilidade total e vedação perfeita.`;
            handAction = `Abrindo e fechando a tampa de forma fluida e controlada`;
            break;

        case 'APPLICATION':
            visualPromptEn = `Dynamic practical application of ${pName}. Clear visualization of fine mist spray, precise droplet or direct contact.`;
            actionPromptEn = `${cameraDesc}. Capturing instantaneous, satisfying application with pristine clarity and natural lighting.`;
            dialoguePtBr = `Rende muito e tem aplicação suave e uniforme logo na primeira tentativa.`;
            handAction = `Pressionando o aplicador ou distribuindo o produto com delicadeza`;
            break;

        case 'LIFESTYLE_USE':
            visualPromptEn = `Lifestyle scene featuring ${pName} in a realistic, aspirational everyday environment.`;
            actionPromptEn = `${cameraDesc}. Natural interaction conveying effortless integration into the user's daily routine.`;
            dialoguePtBr = `Perfeito para levar com você ou usar no dia a dia com máxima praticidade.`;
            handAction = `Utilizando o produto com naturalidade no contexto cotidiano`;
            break;

        case 'RESULT_VISUAL':
            visualPromptEn = `Rewarding visual result shot showcasing the completed benefit and organized/enhanced outcome with ${pName}.`;
            actionPromptEn = `${cameraDesc}. Clear satisfying before-and-after resolution in high visual fidelity.`;
            dialoguePtBr = `O resultado é esse: tudo pronto, perfeito e sem dor de cabeça.`;
            handAction = `Apresentando o resultado final com gesto aberto`;
            break;

        case 'ALTERNATE_ANGLE':
            visualPromptEn = `Comprehensive 3D profile view of ${pName} showing side and back architecture.`;
            actionPromptEn = `${cameraDesc}. Smooth spatial turn revealing 360-degree dimensional balance without distortion.`;
            dialoguePtBr = `Bonito de todos os ângulos e com design compacto.`;
            handAction = `Girando suavemente a peça em 45 graus para mostrar o perfil`;
            break;

        case 'FINAL_HERO':
        default:
            visualPromptEn = `Sleek hero closing shot of ${pName} in ${color} standing alongside official packaging. Balanced commercial lighting.`;
            actionPromptEn = `${cameraDesc}. Crisp final frame designed for high-converting call to action.`;
            dialoguePtBr = `Aproveite a condição especial de hoje e garanta o seu agora mesmo no link abaixo!`;
            handAction = `Acomodando o produto em destaque para o fechamento da oferta`;
            break;
    }

    return { visualPromptEn, actionPromptEn, dialoguePtBr, handAction };
}

// =========================================================================
// MAIN COMMERCE SHOT STRATEGY PLANNER
// =========================================================================

/**
 * Plans a complete, category-aware, non-redundant Commerce Video Strategy.
 * Strictly adheres to COMMERCE_DEMO_DNA_V1.
 */
export function planCommerceShots(input: CommerceStrategyPlanInput): CommerceStrategyPlanOutput {
    const {
        visionData,
        family,
        durationSec = 10,
        productName = 'Produto',
        requestedOrbitMode = 'none'
    } = input;

    // 1. Resolve Category Strategy & Family
    const catStrategy = resolveCategoryCommerceStrategy(visionData, productName);
    const resolvedFamily = resolveCommerceDemoFamily(family, catStrategy);
    const familyDef = COMMERCE_DEMO_FAMILIES[resolvedFamily];

    // 2. Determine duration slice & target beat count
    const { targetBeats, durations } = calculateDurationPlan(durationSec);

    // 3. Select sequence from category matrix
    let rawSequence: CommerceShotFunction[] = [];
    if (durationSec <= 8) {
        rawSequence = [...catStrategy.eightSecondSequence];
    } else if (durationSec <= 11) {
        rawSequence = [...catStrategy.tenSecondSequence];
    } else {
        rawSequence = [...catStrategy.fifteenSecondSequence];
    }

    // 4. Sanitize sequence (remove forbidden functions & consecutive duplicates)
    const sanitizedSequence = sanitizeShotSequence(rawSequence, catStrategy.forbiddenShotFunctions);

    // Slice or pad to exact targetBeats count
    const finalFunctions: CommerceShotFunction[] = [];
    for (let i = 0; i < targetBeats; i++) {
        if (i < sanitizedSequence.length) {
            finalFunctions.push(sanitizedSequence[i]);
        } else {
            // Safe fallback filler if duration requested more beats
            const fallbackOptions: CommerceShotFunction[] = ['TEXTURE_DETAIL', 'FEATURE_PROOF', 'ALTERNATE_ANGLE', 'FINAL_HERO'];
            const nextSafe = fallbackOptions.find(f => !finalFunctions.includes(f) && !catStrategy.forbiddenShotFunctions.includes(f)) || 'FINAL_HERO';
            finalFunctions.push(nextSafe);
        }
    }

    // 5. Build CommerceShotPlan & CinematicShot arrays
    const shots: CommerceShotPlan[] = [];
    const cinematicShots: CinematicShot[] = [];

    finalFunctions.forEach((fn, idx) => {
        const shotMeta = SHOT_FUNCTIONS_METADATA[fn];
        const { cameraDescription, cameraComplexity } = balanceCameraRule(shotMeta, familyDef, requestedOrbitMode);
        const targetDuration = durations[idx] || 2.5;

        const prompts = buildShotPrompts(fn, visionData, productName, cameraDescription, idx);

        const shotPlan: CommerceShotPlan = {
            shotNumber: idx + 1,
            functionType: fn,
            informationGain: shotMeta.primaryInfo,
            stepName: `${idx + 1}. ${shotMeta.label}`,
            camera: cameraDescription,
            cameraComplexity,
            actionComplexity: shotMeta.actionComplexity,
            handAction: prompts.handAction,
            framing: shotMeta.defaultFraming,
            visualObjective: shotMeta.defaultVisualObjective,
            visualPromptEn: prompts.visualPromptEn,
            actionPromptEn: prompts.actionPromptEn,
            dialoguePtBr: prompts.dialoguePtBr,
            targetDurationSec: targetDuration
        };

        shots.push(shotPlan);

        cinematicShots.push({
            id: `commerce_shot_${idx + 1}_${fn.toLowerCase()}`,
            stepName: shotPlan.stepName,
            camera: shotPlan.camera,
            handAction: shotPlan.handAction,
            framing: shotPlan.framing,
            visualObjective: shotPlan.visualObjective,
            visualPromptEn: shotPlan.visualPromptEn,
            actionPromptEn: shotPlan.actionPromptEn,
            dialoguePtBr: shotPlan.dialoguePtBr
        });
    });

    // 6. Camera Guidelines for Commerce Mode
    const cameraGuidelines: string[] = [
        'Prefer slight handheld, short push-in, controlled tracking, and razor-sharp macro for maximum product readability.',
        'Action Complexity Up -> Camera Complexity Down: When hands manipulate mechanisms, keep camera locked and stable.',
        requestedOrbitMode === '360_orbit'
            ? '360-degree orbit enabled on hero frames with strict Object Lock 360° geometry preservation.'
            : 'Avoid unmotivated spinning or continuous 360 orbits that blur product features.'
    ];

    // 7. Commerce Negative Guidelines
    const negativeGuidelines: string[] = [
        'no slow cinematic reveal, no contemplative long shots, no decorative orbit with zero information gain',
        'no excessive shallow depth of field blurring functional elements, no treating product purely as motionless sculpture',
        'no repetitive hero shots without functional context, no camera movement that degrades product legibility',
        'no consecutive shots showing duplicate commercial information'
    ];

    return {
        family: family || 'AUTO',
        resolvedFamily,
        totalDurationSec: durationSec,
        targetBeats,
        shots,
        cinematicShots,
        cameraGuidelines,
        negativeGuidelines
    };
}
