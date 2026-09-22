import {
    ProductVisionData,
    CommerceFrameZeroConfig,
    StructuredNegativeLock,
    CommerceStabilityBundle,
    CommerceShotPlan
} from './types';

// =========================================================================
// 1. REFERENCE AUTHORITY CONTRACT
// =========================================================================

/**
 * Enforces REFERENCE_IMAGE = VISUAL_SOURCE_OF_TRUTH.
 * Aesthetic or cinematic instructions must never override product identity.
 */
export function buildReferenceAuthorityContract(
    visionData: ProductVisionData,
    productName: string = 'Produto'
): string[] {
    const fixedList = (visionData.fixedParts || []).join(', ') || 'overall geometry and structural body';
    const movingList = (visionData.movingParts || []).join(', ') || 'none (rigid structure)';
    const material = visionData.material || 'original reference material';
    const color = visionData.color || 'original reference color';
    const finish = visionData.finish || 'original surface finish';
    const logo = visionData.logo || 'authentic markings';

    return [
        `REFERENCE_IMAGE = VISUAL_SOURCE_OF_TRUTH. The generated product must match the reference image exactly in shape, geometry, proportions, visible scale, color palette (${color}), materials (${material}), finish (${finish}), and packaging.`,
        `Preserve all visible construction details and authentic markings (${logo}). Fixed non-deformable elements: [${fixedList}]. Permitted mobile elements: [${movingList}].`,
        `Aesthetic lighting, cinematic depth of field, or artistic stylization MUST NEVER override, modify, or compromise physical product identity.`
    ];
}

// =========================================================================
// 2. FRAME ZERO CONTRACT
// =========================================================================

/**
 * Defines immediate product readability at frame 0 / first visual beat.
 * Prevents slow empty establishing reveal by default.
 */
export function buildFrameZeroContract(
    visionData: ProductVisionData,
    config: CommerceFrameZeroConfig = {},
    productName: string = 'Produto'
): string {
    const qty = config.declaredQuantity || 1;
    const initialState = config.initialProductState || 'Pristine, ready-to-use commercial state';
    const person = config.avatarOrPerson ? `with ${config.avatarOrPerson}` : 'centered in frame ready for direct interaction';
    const env = config.environmentContext || 'clean aesthetic commercial setting with high contrast';
    const support = config.supportObjects && config.supportObjects.length > 0
        ? ` Support elements: [${config.supportObjects.join(', ')}].`
        : '';

    return `FRAME ZERO (T=0s): Instant product readability. Exactly ${qty} unit(s) of ${productName} present in ${initialState}, positioned ${person} within a ${env}.${support} No slow empty establishing shots; the product is immediately visible and legible in beat 1.`;
}

// =========================================================================
// 3. OBJECT COUNT PERSISTENCE CONTRACT
// =========================================================================

/**
 * Tracks declared/observed product quantity and prevents spontaneous duplication or disappearing items.
 */
export function buildObjectCountPersistenceContract(
    declaredQuantity: number = 1,
    productName: string = 'Produto'
): string {
    const unitLabel = declaredQuantity === 1 ? 'single unit' : `${declaredQuantity} units (exact count)`;
    return `OBJECT COUNT PERSISTENCE: Exactly ${declaredQuantity} (${unitLabel}) of ${productName} exists throughout the entire sequence. Strict prohibition on spontaneous item duplication, multiplying units, or vanishing parts. Quantity changes are only valid if an explicit physical unpacking/assembly action occurs.`;
}

// =========================================================================
// 4. REALISTIC SCALE LOCK CONTRACT
// =========================================================================

/**
 * Preserves plausible scale relative to hands, body, packaging, and surroundings.
 */
export function buildRealisticScaleContract(
    visionData: ProductVisionData,
    productName: string = 'Produto'
): string {
    return `REALISTIC SCALE LOCK: ${productName} must maintain 100% physically consistent scale relative to human hands (finger width, palm ratio), human body (wrist, torso, neck), packaging dimensions, and adjacent tabletop elements. No scale drift, miniature distortion, or oversized swelling across shots.`;
}

// =========================================================================
// 5. FRAME-TO-FRAME IDENTITY LOCK CONTRACT
// =========================================================================

/**
 * Enforces total temporal and geometric stability across shots.
 * In 180°/360° movement: CAMERA FREEDOM MUST NEVER CREATE PRODUCT DESIGN FREEDOM.
 */
export function buildFrameToFrameIdentityContract(
    visionData: ProductVisionData,
    requestedOrbitMode?: 'none' | '180_orbit' | '360_orbit'
): string[] {
    const orbitDirectives = requestedOrbitMode === '360_orbit' || requestedOrbitMode === '180_orbit'
        ? [
            `CAMERA FREEDOM MUST NEVER CREATE PRODUCT DESIGN FREEDOM. During ${requestedOrbitMode === '360_orbit' ? '360-degree' : '180-degree'} camera rotation, unseen reverse/side surfaces must be inferred conservatively based strictly on symmetrical industrial design.`,
            `Do NOT invent hallucinated ports, fictitious buttons, extra seams, unwarranted branding, random labels, or phantom mechanical elements on hidden angles.`
        ]
        : [
            `Angle transitions must preserve identical continuous geometry with zero morphing, surface mutation, or color shifting between shots.`
        ];

    return [
        `THE PRODUCT MUST REMAIN IDENTICAL AND PHYSICALLY STABLE FROM THE FIRST FRAME TO THE FINAL FRAME.`,
        `Strictly prohibit geometry drift, recoloring, material fluctuation, logo displacement, text hallucination, connector drift, missing components, or identity substitution.`,
        `Same Object Continuity: Camera movement and hand movement may change perspective, but must never require regeneration of an unseen product face. Different viewing angles must represent the same physical object, not a newly reconstructed version.`,
        ...orbitDirectives
    ];
}

// =========================================================================
// 6. STATE CONTINUITY CONTRACT
// =========================================================================

/**
 * Ensures valid physical state transitions: INITIAL_STATE -> ACTION -> PHYSICALLY_VALID_STATE_CHANGE -> RESULT.
 */
export function buildStateContinuityContract(
    shots: CommerceShotPlan[],
    productName: string = 'Produto'
): string[] {
    const directives: string[] = [
        `STATE CONTINUITY LAW: Every product state transformation must follow: INITIAL_STATE -> ACTION -> PHYSICALLY_VALID_STATE_CHANGE -> RESULT. Unexplained object-state teleportation or sudden magical assembly is strictly forbidden.`
    ];

    shots.forEach((s) => {
        if (s.functionType === 'UNBOXING') {
            directives.push(`Shot ${s.shotNumber} (UNBOXING): Box must open along its natural hinge/lid seam before product is removed.`);
        } else if (s.functionType === 'OPEN_CLOSE') {
            directives.push(`Shot ${s.shotNumber} (OPEN_CLOSE): Cap/lid must rotate or lift along physical threading/hinge before exposing internal nozzle or cavity.`);
        } else if (s.functionType === 'CLASP_DETAIL') {
            directives.push(`Shot ${s.shotNumber} (CLASP_DETAIL): Clasp/buckle must articulate along its physical pin/joint mechanism with clean tactile engagement.`);
        } else if (s.functionType === 'APPLICATION') {
            directives.push(`Shot ${s.shotNumber} (APPLICATION): Actuator depression directly produces a fine, natural mist/droplet trajectory with zero levitation.`);
        }
    });

    return directives;
}

// =========================================================================
// 7. INTERACTION VALIDITY CONTRACT
// =========================================================================

/**
 * Validates hand and tool interaction plausibility.
 * Rule: ACTION_COMPLEXITY_UP => CAMERA_COMPLEXITY_DOWN.
 */
export function buildInteractionValidityContract(shots: CommerceShotPlan[]): string[] {
    const hasComplexHand = shots.some(s => s.actionComplexity === 'complex');

    return [
        `INTERACTION VALIDITY: All human hand interactions must feature anatomically natural hands (5 distinct fingers per hand, realistic skin texture and joint articulation).`,
        `Prohibit impossible grips, fingers clipping through solid product geometry, floating objects without physical support, inverted hinges, and physically unsupported bending.`,
        hasComplexHand
            ? `ACTION COMPLEXITY BALANCING: During active manipulation or mechanism operation, the camera must remain stable and locked-off to prioritize clear product action over camera acrobatics.`
            : `Camera tracking must smoothly complement the natural handling motion without inducing motion blur.`
    ];
}

// =========================================================================
// 8. ENVIRONMENT FUNCTION LOCK CONTRACT
// =========================================================================

/**
 * Locks the environment to functional commerce context (use, category, contrast).
 * Product remains the visual priority.
 */
export function buildEnvironmentFunctionContract(
    category: string = 'geral',
    surface?: string,
    environmentDescription?: string
): string {
    const surfaceText = surface ? `on ${surface}` : 'on a premium clean surface';
    const envContext = environmentDescription ? ` Context: ${environmentDescription}.` : '';

    return `ENVIRONMENT FUNCTION LOCK: The environment (${surfaceText}) must functionally support the product category (${category}), providing clean visual contrast and authentic context of use.${envContext} The product occupies 60-70% of optical attention with no distracting, busy background props.`;
}

// =========================================================================
// 9. CLAIM SAFETY CONTRACT
// =========================================================================

const FORBIDDEN_UNVERIFIED_CLAIMS = [
    'waterproof', 'impermeável',
    'unbreakable', 'inquebrável',
    'hypoallergenic', 'hipoalergênico',
    'guaranteed durability', 'durabilidade garantida',
    'miracle', 'milagroso',
    'cure', 'cura',
    '100% effective',
    'limited stock', 'últimas unidades',
    '50% off', 'desconto exclusivo'
];

/**
 * Enforces observable descriptions only. Strips unverified factual marketing claims.
 */
export function buildClaimSafetyContract(visionData: ProductVisionData): string[] {
    return [
        `CLAIM SAFETY: Visual generation must describe strictly OBSERVABLE physical attributes (e.g., polished metal finish, visible woven texture, satin coating, precision engraved typography, solid hinge).`,
        `NEVER invent or visually assert unverified factual/legal claims (such as waterproofness, unbreakable resistance, medical hypoallergenic properties, or artificial promotional scarcity badges) unless explicitly documented in verified product specifications.`
    ];
}

/**
 * Validates a text snippet for unverified marketing claim words.
 */
export function checkClaimSafetyInText(text: string): { safe: boolean; flaggedTerms: string[] } {
    const lower = text.toLowerCase();
    const flaggedTerms = FORBIDDEN_UNVERIFIED_CLAIMS.filter(term => lower.includes(term));
    return {
        safe: flaggedTerms.length === 0,
        flaggedTerms
    };
}

// =========================================================================
// 10. STRUCTURED NEGATIVE LOCK
// =========================================================================

/**
 * Generates structured negative categories compiled at the prompt boundary.
 */
export function buildStructuredNegativeLock(
    visionData: ProductVisionData,
    requestedOrbitMode?: 'none' | '180_orbit' | '360_orbit',
    customNegativeAdditions: string[] = []
): StructuredNegativeLock {
    const color = visionData.color || 'original color';
    const logo = visionData.logo || 'original logo';

    return {
        productIdentity: [
            `recoloring, changing ${color} palette`,
            `replacing or misplacing ${logo}`,
            'altering printed typography, warped brand emblems',
            'material substitution, changing metallic/glass/fabric finish',
            'identity mutation, generic item replacement'
        ],
        objectGeometry: [
            'geometric deformation, bending rigid components',
            'hallucinated extra parts, missing essential components',
            'scale mutation, fluctuating proportions',
            'unsupported asymmetrical warping'
        ],
        temporalContinuity: [
            'morphing between cuts, shape shifting',
            'spontaneous duplication, multiplying product units',
            'vanishing product, disappearing accessories',
            'state teleportation without physical action'
        ],
        handInteraction: [
            'malformed hands, extra fingers, missing fingers, fused fingers',
            'impossible grip, fingers clipping through product mesh',
            'floating product with no physical support',
            'unrealistic wrist twisting, unnatural joint bending'
        ],
        camera: [
            requestedOrbitMode === '360_orbit' ? 'jerky unmotivated camera shake' : 'unnecessary disorienting 360 spin',
            'excessive motion blur, severe lens distortion',
            'camera movement compromising product readability',
            'abrupt unmotivated reframing, extreme shaky cam'
        ],
        textAndLogo: [
            'invented text, fake brand labels, gibberish lettering',
            'mirrored text, inverted logos, illegible typography',
            'hallucinated specification badges, fake discount stickers'
        ],
        scene: [
            'unrelated clutter, distracting background actors',
            'harsh blown-out lighting, muddy dark shadows obscuring details',
            'overly complex irrelevant props competing with product'
        ]
    };
}

// =========================================================================
// 11. BUNDLE COMPOSER
// =========================================================================

/**
 * Compiles the complete Commerce Stability Bundle.
 */
export function buildCommerceStabilityBundle(params: {
    visionData: ProductVisionData;
    shots: CommerceShotPlan[];
    productName?: string;
    surface?: string;
    environmentDescription?: string;
    frameZeroConfig?: CommerceFrameZeroConfig;
    requestedOrbitMode?: 'none' | '180_orbit' | '360_orbit';
    customNegativeAdditions?: string[];
}): CommerceStabilityBundle {
    const {
        visionData,
        shots,
        productName = 'Produto',
        surface,
        environmentDescription,
        frameZeroConfig = {},
        requestedOrbitMode = 'none',
        customNegativeAdditions = []
    } = params;

    return {
        referenceAuthority: buildReferenceAuthorityContract(visionData, productName),
        frameZero: buildFrameZeroContract(visionData, frameZeroConfig, productName),
        objectCountPersistence: buildObjectCountPersistenceContract(frameZeroConfig.declaredQuantity || 1, productName),
        realisticScaleLock: buildRealisticScaleContract(visionData, productName),
        frameToFrameIdentityLock: buildFrameToFrameIdentityContract(visionData, requestedOrbitMode),
        stateContinuityDirectives: buildStateContinuityContract(shots, productName),
        interactionValidityDirectives: buildInteractionValidityContract(shots),
        environmentFunctionLock: buildEnvironmentFunctionContract(visionData.category, surface, environmentDescription),
        audioDirectives: {
            voiceover: 'OFF',
            dialogue: 'NONE',
            lipSync: 'OFF',
            backgroundMusic: 'Clean, rhythmic commercial background beat (no spoken dialogue, no voiceover, no lip-sync required)'
        },
        claimSafetyDirectives: buildClaimSafetyContract(visionData),
        structuredNegativeLock: buildStructuredNegativeLock(visionData, requestedOrbitMode, customNegativeAdditions)
    };
}
