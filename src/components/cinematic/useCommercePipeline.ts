import {
    ProductVisionData,
    CommerceDemoFamily,
    planCommerceShots,
    compileCommercePrompt,
    buildCommerceStabilityBundle
} from '../../features/cinematic';
import {
    CommerceUIState,
    CommerceDurationOption,
    CommerceGenerationResult
} from './CommerceTypes';

export interface ExecuteCommercePipelineParams {
    productName: string;
    category: string;
    productFile: File | null;
    productPreview: string;
    productDetails: string;
    uiState: CommerceUIState;
    currentKey?: string;
}

/**
 * Builds default vision data from inputs and category context
 */
export function deriveVisionData(
    productName: string,
    category: string,
    productDetails: string
): ProductVisionData {
    const cat = (category || 'Geral').toLowerCase();
    const name = (productName || 'Produto').toLowerCase();
    const details = productDetails || '';

    let defaultMaterial = 'high-grade premium materials matching the reference';
    let defaultColor = 'original authentic reference color';
    let defaultTexture = 'smooth premium finish';
    let defaultFinish = 'clean satin/matte finish with crisp highlights';
    let defaultLogo = 'authentic brand insignia as seen on product';
    let defaultPackaging = 'original commercial presentation box';
    let defaultFixed = ['main chassis', 'core structural body'];
    let defaultMoving = ['functional moving components'];

    if (cat.includes('relo') || cat.includes('watch') || name.includes('relo') || name.includes('watch')) {
        defaultMaterial = 'polished 316L stainless steel, sapphire crystal glass, ceramic bezel';
        defaultColor = 'silver with black dial and luminous index markers';
        defaultTexture = 'brushed steel bracelet and polished case bevels';
        defaultFinish = 'mirror polished edges and anti-reflective coated sapphire glass';
        defaultLogo = 'micro-engraved brand logo centered below 12 o\'clock';
        defaultPackaging = 'luxury velvet-lined presentation watch box';
        defaultFixed = ['watch case', 'dial face', 'indices', 'lugs'];
        defaultMoving = ['hands', 'crown', 'rotating bezel', 'clasp mechanism'];
    } else if (cat.includes('perfum') || cat.includes('fragran') || cat.includes('cosmet') || cat.includes('beleza') || name.includes('perfum')) {
        defaultMaterial = 'heavy transparent glass flacon with metallic atomizer cap';
        defaultColor = 'crystal clear glass with amber/gold liquid tint';
        defaultTexture = 'glossy crystal glass body with precision metal collar';
        defaultFinish = 'luxurious high-gloss reflective glass with crisp geometric facets';
        defaultLogo = 'embossed metallic brand lettering on front bottle face';
        defaultPackaging = 'rigid matte textured luxury perfume box';
        defaultFixed = ['glass bottle body', 'base weight', 'neck'];
        defaultMoving = ['removable magnetic cap', 'spray nozzle pump'];
    } else if (cat.includes('mod') || cat.includes('roup') || cat.includes('cloth') || cat.includes('vestu') || name.includes('shirt') || name.includes('jaquet')) {
        defaultMaterial = 'heavyweight combed organic cotton, precision double stitching';
        defaultColor = 'deep solid monochrome dye matching reference';
        defaultTexture = 'natural woven fabric drape with soft tactile handfeel';
        defaultFinish = 'matte natural textile texture without synthetic shine';
        defaultLogo = 'embroidered or heat-pressed brand emblem on chest';
        defaultPackaging = 'branded recyclable garment sleeve';
        defaultFixed = ['collar structure', 'shoulder seam', 'hem'];
        defaultMoving = ['fabric drape', 'sleeves', 'zipper/button fastening'];
    } else if (cat.includes('joia') || cat.includes('jewel') || cat.includes('colar') || cat.includes('anel') || cat.includes('brinco')) {
        defaultMaterial = '18k gold / 925 sterling silver with precision pavé gemstones';
        defaultColor = 'lustrous yellow gold / bright silver with brilliant stone fire';
        defaultTexture = 'ultra-smooth polished precious metal surfaces';
        defaultFinish = 'high-refraction mirror polish catching dynamic rim light';
        defaultLogo = 'hallmark stamp engraved on inner band or clasp';
        defaultPackaging = 'soft-touch jewelry gift box with satin cushion';
        defaultFixed = ['gemstone mountings', 'ring band', 'pendant body'];
        defaultMoving = ['lobster clasp', 'chain links', 'hinged closure'];
    } else if (cat.includes('eletr') || cat.includes('gadg') || cat.includes('fone') || cat.includes('headphon') || cat.includes('celul')) {
        defaultMaterial = 'anodized aerospace aluminum, matte polycarbonate, silicone seals';
        defaultColor = 'space gray / matte black with subtle metallic accents';
        defaultTexture = 'ultra-fine sandblasted aluminum and soft-touch rubberized accents';
        defaultFinish = 'matte anti-fingerprint coating with chamfered polished edges';
        defaultLogo = 'laser-etched minimalist brand badge';
        defaultPackaging = 'precision-molded paper pulp retail unboxing box';
        defaultFixed = ['housing shell', 'display surface', 'port connectors'];
        defaultMoving = ['mechanical buttons', 'hinge / ear cup pivots', 'charging lid'];
    }

    if (details) {
        defaultTexture += ` (${details})`;
    }

    return {
        category: category || 'Geral',
        material: defaultMaterial,
        color: defaultColor,
        texture: defaultTexture,
        finish: defaultFinish,
        logo: defaultLogo,
        packaging: defaultPackaging,
        fixedParts: defaultFixed,
        movingParts: defaultMoving,
        rawVisionSummary: details || undefined
    };
}

/**
 * Builds environment description based on mode and settings
 */
export function buildEnvironmentDescription(
    uiState: CommerceUIState,
    category: string
): { surface: string; environmentDescription: string; lighting: string } {
    const env = uiState.environment;
    let surface = env.surface;
    let environmentDescription = env.customDescription;
    let lighting = env.lightingStyle;

    if (!surface) {
        switch (env.mode) {
            case 'clean_studio':
                surface = 'Seamless matte pedestal in a minimalist commercial studio';
                break;
            case 'luxury_retail':
                surface = 'Polished Italian marble counter inside an exclusive boutique showroom';
                break;
            case 'lifestyle_home':
                surface = 'Natural warm oak tabletop in a sunlit modern interior';
                break;
            case 'outdoor_street':
                surface = 'Textured architectural concrete ledge in soft outdoor daylight';
                break;
            case 'ambient_match':
                surface = 'Environmentally matched contextual surface seamlessly aligned with reference';
                break;
            case 'custom':
            default:
                surface = 'Clean premium surface with soft ambient contact shadows';
                break;
        }
    }

    if (!environmentDescription) {
        switch (env.mode) {
            case 'clean_studio':
                environmentDescription = 'Minimalist contemporary studio environment with soft neutral backdrop and subtle gradient depth';
                break;
            case 'luxury_retail':
                environmentDescription = 'High-end luxury flagship store with warm architectural lighting, softly blurred designer displays in the background';
                break;
            case 'lifestyle_home':
                environmentDescription = 'Contemporary aesthetic living space with organic indoor plants, tasteful warm textures and soft window light';
                break;
            case 'outdoor_street':
                environmentDescription = 'Urban architectural environment during golden hour with warm backlight and soft atmospheric depth';
                break;
            case 'ambient_match':
                environmentDescription = 'Matched context derived from reference frame, maintaining aesthetic harmony while isolating the product';
                break;
            case 'custom':
            default:
                environmentDescription = 'Clean, uncluttered commercial environment prioritizing total product clarity';
                break;
        }
    }

    if (!lighting) {
        lighting = 'Clean commercial studio 3-point lighting with soft fill and crisp edge definition';
    }

    return { surface, environmentDescription, lighting };
}

/**
 * Executes the complete Commerce pipeline
 */
export function executeCommercePipeline(
    params: ExecuteCommercePipelineParams
): CommerceGenerationResult {
    const {
        productName = 'Produto',
        category = 'Geral',
        productDetails = '',
        uiState
    } = params;

    const visionData = deriveVisionData(productName, category, productDetails);

    const planOutput = planCommerceShots({
        visionData,
        family: uiState.demoFamily,
        durationSec: uiState.duration,
        productName,
        requestedOrbitMode: uiState.camera.orbitMode,
        customFocus: productDetails
    });

    const { surface, environmentDescription, lighting } = buildEnvironmentDescription(uiState, category);

    let avatarContext = '';
    if (uiState.avatar.mode !== 'none') {
        const { gender, presenterStyle, wardrobe } = uiState.avatar;
        const wardrobeItems = [
            wardrobe.top && `Top: ${wardrobe.top}`,
            wardrobe.bottom && `Bottom: ${wardrobe.bottom}`,
            wardrobe.footwear && `Footwear: ${wardrobe.footwear}`,
            wardrobe.accessories && `Accessories: ${wardrobe.accessories}`,
            wardrobe.customDescription
        ].filter(Boolean).join(', ');

        avatarContext = `Presenter Profile: ${gender !== 'ai_decide' ? gender : 'Professional presenter'}, ${presenterStyle || 'friendly confident demeanor'}. Wardrobe: [${wardrobeItems || 'clean minimalist styling'}]. Avatar Identity Lock: ${uiState.avatar.identityLock ? 'ACTIVE (Invariant facial identity across all cuts)' : 'Standard'}.`;
    }

    const compiledOutput = compileCommercePrompt({
        planOutput,
        visionData,
        productName,
        aspectRatio: uiState.aspectRatio,
        surface,
        lighting,
        environmentDescription,
        frameZeroConfig: {
            declaredQuantity: 1,
            avatarOrPerson: avatarContext || undefined,
            environmentContext: environmentDescription,
            initialProductState: 'Pristine, fully assembled and ready for visual demonstration'
        },
        requestedOrbitMode: uiState.camera.orbitMode,
        customNegativeAdditions: uiState.customNegative ? [uiState.customNegative] : []
    });

    return {
        planOutput: {
            family: planOutput.family,
            resolvedFamily: planOutput.resolvedFamily,
            totalDurationSec: planOutput.totalDurationSec,
            targetBeats: planOutput.targetBeats,
            shots: planOutput.shots,
            cameraGuidelines: planOutput.cameraGuidelines,
            negativeGuidelines: planOutput.negativeGuidelines
        },
        compiledOutput,
        visionData,
        productName,
        category,
        generatedAt: new Date().toISOString()
    };
}
