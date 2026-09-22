import { ProductVisionData, CinematicShot } from './types';
import { suggestCinematicScenes } from './cinematicLibrary';

export interface ShotGeneratorInput {
    visionData: ProductVisionData;
    productName?: string;
    style?: string;
    creatorProfile?: string;
}

/**
 * Replaces placeholders in templates with ProductVisionData properties.
 */
function fillShotTemplate(template: string, visionData: ProductVisionData, productName?: string): string {
    const pName = productName || 'Produto';
    return template
        .replace(/\{product_name\}/g, pName)
        .replace(/\{category\}/g, visionData.category)
        .replace(/\{material\}/g, visionData.material)
        .replace(/\{color\}/g, visionData.color)
        .replace(/\{texture\}/g, visionData.texture)
        .replace(/\{finish\}/g, visionData.finish)
        .replace(/\{logo\}/g, visionData.logo)
        .replace(/\{packaging\}/g, visionData.packaging);
}

/**
 * Generates a sequence of tailored cinematic shots for a product based on its ProductVisionData and category library.
 */
export function generateCinematicShots(input: ShotGeneratorInput): CinematicShot[] {
    const { visionData, productName } = input;
    const libCategory = suggestCinematicScenes(visionData.category, visionData);

    const shots: CinematicShot[] = libCategory.defaultShots.map((shotPreset, index) => {
        const visualPromptEn = fillShotTemplate(shotPreset.visualPromptTemplateEn, visionData, productName);
        const actionPromptEn = fillShotTemplate(shotPreset.actionPromptTemplateEn, visionData, productName);
        const dialoguePtBr = fillShotTemplate(shotPreset.dialogueTemplatePtBr, visionData, productName);

        return {
            id: `shot_${index + 1}_${libCategory.categoryKey}`,
            stepName: shotPreset.stepName,
            camera: shotPreset.camera,
            handAction: shotPreset.handAction,
            framing: shotPreset.framing,
            visualObjective: shotPreset.visualObjective,
            visualPromptEn,
            actionPromptEn,
            dialoguePtBr
        };
    });

    return shots;
}
