export interface FlowAgentInstructionsInput {
    productName?: string;
    category?: string;
    staticComponents?: string[];
    customComponentsText?: string;
}

export interface FlowAgentInstructionsOutput {
    universal_instruction: string;
    preserved_elements: string[];
    allowed_motion: string[];
    forbidden_motion: string[];
    sensitive_product_rules: string[];
    category_overlay?: string;
    formatted_directives: string;
}

/**
 * Builds universal Flow Agent Directives applicable to ANY product.
 * Guarantees rigid physical identity, shape, color, logo, packaging, and details preservation.
 * Category-specific overlays are optional and only appended if a category matches.
 */
export function buildFlowAgentInstructions(input?: FlowAgentInstructionsInput): FlowAgentInstructionsOutput {
    const preserved_elements = [
        "shape",
        "proportion",
        "color",
        "material",
        "texture",
        "finish",
        "logo",
        "printed text",
        "numbers",
        "labels",
        "packaging",
        "seams",
        "buttons",
        "screens",
        "dials",
        "tags",
        "fixed visible details",
        "product identity"
    ];

    const allowed_motion = [
        "natural hand movement",
        "slight product tilt",
        "subtle camera movement",
        "soft light reflections",
        "natural shadows",
        "very light background movement",
        "realistic physical interaction"
    ];

    const forbidden_motion = [
        "animating fixed product parts",
        "moving logos, texts, labels, numbers or tags",
        "deforming the product",
        "morphing",
        "warping",
        "melting",
        "duplicating product parts",
        "changing color, material, texture or proportions",
        "redesigning the product",
        "transforming it into another model"
    ];

    const sensitive_product_rules = [
        "screens must remain stable unless explicitly requested",
        "labels and packaging must remain fixed and legible",
        "dials, hands, markers and decorative gears must stay frozen",
        "stitching, zippers, buttons and hardware must preserve design",
        "bottles, caps, labels, liquid and transparency must remain consistent"
    ];

    const pName = input?.productName?.trim();
    const productContext = pName ? `para "${pName}"` : "para qualquer produto";

    const universal_instruction = `DIRETRIZES DO AGENTE FLOW (UNIVERSAL PRODUCT INTEGRITY):
Preservar 100% da identidade, forma e detalhes do produto ${productContext}.

ELEMENTOS PRESERVADOS / PRESERVED ELEMENTS:
${preserved_elements.map(item => `- ${item}`).join('\n')}

MOVIMENTO PERMITIDO / ALLOWED MOTION:
${allowed_motion.map(item => `- ${item}`).join('\n')}

MOVIMENTO PROIBIDO / FORBIDDEN MOTION:
${forbidden_motion.map(item => `- ${item}`).join('\n')}

REGRAS DE PRODUTOS SENSÍVEIS / SENSITIVE PRODUCT RULES:
${sensitive_product_rules.map(item => `- ${item}`).join('\n')}`;

    let category_overlay: string | undefined = undefined;
    const catLower = (input?.category || "").toLowerCase();
    const pLower = (input?.productName || "").toLowerCase();

    if (catLower.includes("watch") || catLower.includes("relo") || pLower.includes("watch") || pLower.includes("relo") || catLower.includes("joia") || pLower.includes("clock")) {
        category_overlay = "OVERLAY DE CATEGORIA (RELÓGIOS & JOIAS - OPCIONAL): Congelar mostrador, marcadores, numeração, janela de data, ponteiros e engrenagens decorativas internas.";
    } else if (catLower.includes("perfum") || catLower.includes("cosmet") || catLower.includes("beauty") || catLower.includes("skincare") || catLower.includes("beleza")) {
        category_overlay = "OVERLAY DE CATEGORIA (COSMÉTICOS & PERFUMES - OPCIONAL): Manter frasco, tampa, rótulo impresso, líquido e transparência consistentes.";
    } else if (catLower.includes("elec") || catLower.includes("tech") || catLower.includes("phone") || catLower.includes("gadget") || catLower.includes("eletrôn")) {
        category_overlay = "OVERLAY DE CATEGORIA (ELETRÔNICOS - OPCIONAL): Manter telas estáveis e bordas, botões e portas de conexão rígidos.";
    } else if (catLower.includes("moda") || catLower.includes("apparel") || catLower.includes("fashion") || catLower.includes("vestu") || catLower.includes("tênis") || catLower.includes("tenis") || catLower.includes("shoe")) {
        category_overlay = "OVERLAY DE CATEGORIA (MODA & VESTUÁRIO - OPCIONAL): Preservar costuras, zíperes, botões, etiquetas e ferragens do design.";
    }

    let formatted_directives = universal_instruction;
    if (category_overlay) {
        formatted_directives += `\n\n${category_overlay}`;
    }

    return {
        universal_instruction,
        preserved_elements,
        allowed_motion,
        forbidden_motion,
        sensitive_product_rules,
        category_overlay,
        formatted_directives
    };
}

export interface ProductMotionLockInput {
    enabled: boolean;
    mode: 'auto' | 'watch_skeleton' | 'universal_product' | 'manual_region';
    productName?: string;
    category?: string;
    staticComponents?: string[];
    customComponentsText?: string;
    manualRegion?: {
        label?: string;
        coordinates?: string;
        instruction?: string;
        motion?: string;
    };
}

export interface ProductMotionLockOutput {
    enabled: boolean;
    mode_used: 'watch_skeleton' | 'universal_product' | 'manual_region' | 'none';
    prompt_addition: string;
    negative_prompt_addition: string;
    flow_agent_instructions?: FlowAgentInstructionsOutput;
    settings_addition: {
        motion_bucket?: number;
        camera_motion?: string;
        structure_preservation?: string;
        lock_mode?: string;
    };
    locks: {
        static_lock_prompt: string;
        non_deformable_lock: string;
        logo_text_lock: string;
        motion_isolation: string;
        camera_only_motion: string;
    };
    region_locks_template?: Array<{
        region_id: string;
        label: string;
        coordinates: string;
        allowed_motion: string;
        forbidden_motion: string;
    }>;
}

const WATCH_KEYWORDS = [
    'watch', 'clock', 'relogio', 'relógio', 'dial', 'skeleton', 'gear', 
    'engrenagem', 'quartz', 'ourstart', 'chronograph', 'bezel', 'joia', 'jewel'
];

export function buildProductMotionLock(input: ProductMotionLockInput): ProductMotionLockOutput {
    const flowAgent = buildFlowAgentInstructions({
        productName: input.productName,
        category: input.category,
        staticComponents: input.staticComponents,
        customComponentsText: input.customComponentsText
    });

    if (!input.enabled) {
        return {
            enabled: false,
            mode_used: 'none',
            prompt_addition: '',
            negative_prompt_addition: '',
            flow_agent_instructions: flowAgent,
            settings_addition: {},
            locks: {
                static_lock_prompt: '',
                non_deformable_lock: '',
                logo_text_lock: '',
                motion_isolation: '',
                camera_only_motion: ''
            },
            region_locks_template: []
        };
    }

    let effectiveMode: 'watch_skeleton' | 'universal_product' | 'manual_region' = 'universal_product';

    if (input.mode === 'auto') {
        const textToAnalyze = [
            input.productName || '',
            input.category || '',
            ...(input.staticComponents || []),
            input.customComponentsText || ''
        ].join(' ').toLowerCase();

        const isWatch = WATCH_KEYWORDS.some(kw => textToAnalyze.includes(kw));
        effectiveMode = isWatch ? 'watch_skeleton' : 'universal_product';
    } else {
        effectiveMode = input.mode;
    }

    if (effectiveMode === 'watch_skeleton') {
        const customParts = input.customComponentsText?.trim();
        const basePrompt = "Static component lock: Freeze all decorative and static watch details: dial markers, Roman numerals, logo text, date window, printed numbers, bezel facets, crown, bracelet links, screws, decorative gears, skeleton-style visible components, and all internal non-functional details. Only the gloved hands, camera movement, and lighting reflections may move.";
        const promptAddition = customParts ? `${basePrompt} Specific locked parts: ${customParts}.` : basePrompt;

        return {
            enabled: true,
            mode_used: 'watch_skeleton',
            prompt_addition: promptAddition,
            negative_prompt_addition: "moving dial gears, spinning internal cogs, warping watch face, shifting date window, deforming bracelet, distorting Roman numerals, changing printed numbers, melting hands, morphing bezel",
            flow_agent_instructions: flowAgent,
            settings_addition: {
                motion_bucket: 12,
                camera_motion: "subtle camera pan or tilt only",
                structure_preservation: "strict",
                lock_mode: "watch_skeleton"
            },
            locks: {
                static_lock_prompt: "All internal gears, cogs, dial text, Roman numerals, and date windows remain 100% frozen.",
                non_deformable_lock: "Watch body, bezel, glass, and metal links are completely non-deformable.",
                logo_text_lock: "Zero drift or alteration on logo and text.",
                motion_isolation: "Motion is strictly isolated to gloved hands, camera movement, and specular light reflections.",
                camera_only_motion: "Product geometry is locked; camera motion drives the scene."
            },
            region_locks_template: [
                {
                    region_id: "region_watch_dial",
                    label: "Watch Dial / Face / Gears",
                    coordinates: "[0.3, 0.3, 0.7, 0.7]",
                    allowed_motion: "specular reflections, subtle lighting passes",
                    forbidden_motion: "internal gear spinning, cog rotation, number warping, hand deformation"
                },
                {
                    region_id: "region_watch_body",
                    label: "Case / Bezel / Strap",
                    coordinates: "[0.2, 0.2, 0.8, 0.8]",
                    allowed_motion: "rigid 3D rotation with camera",
                    forbidden_motion: "stretching, bending, liquefying, link deformation"
                }
            ]
        };
    }

    if (effectiveMode === 'universal_product') {
        const customParts = input.customComponentsText?.trim();
        const basePrompt = "Static component lock: Maintain rigid structural integrity for the entire product body. All printed text, logos, buttons, seams, hardware, and surface details must remain completely unmoving, non-deformable, and unchanged. Only camera motion and lighting reflections are permitted.";
        const promptAddition = customParts ? `${basePrompt} Specific locked elements: ${customParts}.` : basePrompt;

        return {
            enabled: true,
            mode_used: 'universal_product',
            prompt_addition: promptAddition,
            negative_prompt_addition: "deforming product body, shifting logos, warping text, melting materials, twisting structure, changing geometry, flickering labels, surface liquefaction",
            flow_agent_instructions: flowAgent,
            settings_addition: {
                motion_bucket: 15,
                camera_motion: "smooth camera movement",
                structure_preservation: "high",
                lock_mode: "universal_product"
            },
            locks: {
                static_lock_prompt: "Product chassis, labels, buttons, and logos are strictly frozen.",
                non_deformable_lock: "Product geometry is locked against warping, bending, or melting.",
                logo_text_lock: "Logos and labels remain sharp and unmutated.",
                motion_isolation: "Motion is limited to background depth, camera movement, and specular highlights.",
                camera_only_motion: "Camera pan/tilt/zoom creates motion while product remains rigid."
            },
            region_locks_template: [
                {
                    region_id: "region_product_core",
                    label: "Product Core Body",
                    coordinates: "[0.25, 0.25, 0.75, 0.75]",
                    allowed_motion: "rigid camera parallax, light glints",
                    forbidden_motion: "bending, surface morphing, shape deformation"
                }
            ]
        };
    }

    // manual_region
    const regLabel = input.manualRegion?.label || "Target Region Lock";
    const regCoords = input.manualRegion?.coordinates || "[0.2, 0.2, 0.8, 0.8]";
    const regInstruction = input.manualRegion?.instruction || "Freeze region completely against deformation.";
    const regMotion = input.manualRegion?.motion || "Camera parallax and specular reflections only.";

    return {
        enabled: true,
        mode_used: 'manual_region',
        prompt_addition: `Static component lock: Region lock on ${regLabel} (${regCoords}). Instruction: ${regInstruction} Allowed motion: ${regMotion}`,
        negative_prompt_addition: "deforming region, warping target surface, morphing manual area, shifting locked section",
        flow_agent_instructions: flowAgent,
        settings_addition: {
            motion_bucket: 10,
            camera_motion: "controlled camera movement",
            structure_preservation: "strict_region",
            lock_mode: "manual_region"
        },
        locks: {
            static_lock_prompt: regInstruction,
            non_deformable_lock: "Target region remains completely rigid.",
            logo_text_lock: "Region details, logos, and labels frozen.",
            motion_isolation: regMotion,
            camera_only_motion: "Camera movement active; target region frozen."
        },
        region_locks_template: [
            {
                region_id: "region_manual_lock",
                label: regLabel,
                coordinates: regCoords,
                allowed_motion: regMotion,
                forbidden_motion: regInstruction
            }
        ]
    };
}

export function formatFlowReadyMotionLock(lock: ProductMotionLockOutput): string {
    if (!lock.enabled) return "PRODUCT MOTION LOCK: DISABLED";

    const flowDirectives = lock.flow_agent_instructions?.formatted_directives || "";

    return `=== PRODUCT MOTION LOCK (FLOW / VEO / SORA READY) ===
[LOCK MODE]: ${lock.mode_used.toUpperCase()}

[DIRETRIZES PARA AGENTE FLOW]:
${flowDirectives}

[PROMPT ADDITION]:
${lock.prompt_addition}

[NEGATIVE PROMPT ADDITION]:
${lock.negative_prompt_addition}

[SETTINGS]:
- Motion Bucket: ${lock.settings_addition.motion_bucket ?? 15}
- Camera Motion: ${lock.settings_addition.camera_motion ?? "smooth camera movement"}
- Structure Preservation: ${lock.settings_addition.structure_preservation ?? "strict"}
- Lock Mode: ${lock.settings_addition.lock_mode ?? lock.mode_used}

[GLOBAL RULES & LOCKS]:
- Static Lock: ${lock.locks.static_lock_prompt}
- Non-Deformable: ${lock.locks.non_deformable_lock}
- Logo/Text Lock: ${lock.locks.logo_text_lock}
- Motion Isolation: ${lock.locks.motion_isolation}
- Camera Motion Only: ${lock.locks.camera_only_motion}

[REGION LOCKS]:
${(lock.region_locks_template || []).map(r => `  * [${r.region_id}] ${r.label} @ ${r.coordinates}\n    Allowed: ${r.allowed_motion}\n    Forbidden: ${r.forbidden_motion}`).join('\n')}`;
}
