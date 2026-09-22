import { ProductVisionData, MotionSuggestion } from './types';
import { findCategoryInLibrary } from './cinematicLibrary';
import { buildProductMotionLock } from './productMotionLockEngine';

/**
 * Receives ProductVisionData and generates intelligent category-specific Motion Suggestion rules and MotionLock.
 */
export function buildMotionSuggestion(visionData: ProductVisionData, productName?: string): MotionSuggestion {
    const libCategory = findCategoryInLibrary(visionData.category, productName);

    const allowedMotion = [
        ...libCategory.allowedMotion,
        `interação natural das mãos em torno do produto sem deformar o corpo de ${visionData.material}`,
        `iluminação dinâmica de estúdio deslizando suavemente por ${visionData.color} e ${visionData.finish}`
    ];

    const forbiddenMotion = [
        ...libCategory.forbiddenMotion,
        `quaisquer deformações ou movimento em partes fixas identificadas: ${visionData.fixedParts.join(', ')}`,
        `modificação, alteração de fonte, distorção ou duplicação do logotipo (${visionData.logo})`,
        `mudança nas cores originais (${visionData.color}) ou textura (${visionData.texture})`
    ];

    const sensitiveRules = [
        `Partes fixas congeladas 100%: ${visionData.fixedParts.join(', ')}`,
        `Permitida articulação exclusivamente em partes móveis: ${visionData.movingParts.join(', ')}`,
        `Manter a geometria 3D rígida sem derretimento, torção ou morphing.`
    ];

    // Build the motion lock prompt text
    const motionLockPrompt = `
DIRETRIZES DE BLOQUEIO DE MOVIMENTO (MOTION LOCK):
- PRODUTO: ${productName || 'Detectado'}
- CATEGORIA: ${visionData.category}
- PARTES RIGIDAMENTE CONGELADAS: ${visionData.fixedParts.join(', ')}
- MOVIMENTOS PERMITIDOS:
${allowedMotion.map(m => `  * ${m}`).join('\n')}
- MOVIMENTOS PROIBIDOS:
${forbiddenMotion.map(m => `  * ${m}`).join('\n')}
`.trim();

    const negativePromptAdditions = [
        'deforming product chassis',
        'warping logo',
        'distorting text',
        'morphing fixed parts',
        'changing materials',
        'surface liquefaction',
        'spinning internal cogs',
        'moving static gears',
        'flickering labels',
        'duplicate branding'
    ];

    return {
        category: visionData.category,
        allowedMotion,
        forbiddenMotion,
        sensitiveRules,
        motionLockPrompt,
        negativePromptAdditions,
        motionBucket: visionData.category.toLowerCase().includes('relógi') ? 12 : 15
    };
}

/**
 * Creates a complete ProductMotionLock object wrapping ProductVisionData and MotionSuggestion.
 */
export function createProductMotionLockFromVision(visionData: ProductVisionData, productName?: string) {
    const motionSuggestion = buildMotionSuggestion(visionData, productName);

    const rawLock = buildProductMotionLock({
        enabled: true,
        mode: 'auto',
        productName: productName,
        category: visionData.category,
        staticComponents: visionData.fixedParts,
        customComponentsText: `Partes fixas: ${visionData.fixedParts.join(', ')}. Partes móveis permitidas: ${visionData.movingParts.join(', ')}.`
    });

    return {
        motionSuggestion,
        rawLock
    };
}
