import {
    PromptComposerInput,
    PromptComposerOutput,
    ProductVisionData,
    MotionSuggestion,
    CinematicShot
} from './types';
import { buildFlowAgentInstructions } from './productMotionLockEngine';
import {
    renderProductStructuralDNA,
    renderReferenceCoverageAndMotionSafety,
    resolveProductMotionSafety
} from '../creative-director/services/productGroundingService';
import { renderAvatarIdentityBlock } from '../visual-reference-engine';

/**
 * Prompt Composer merges Vision Analyzer data, Motion Suggestion Engine locks, Shot Generator scenes,
 * Style choices, and Flow Agent directives into a unified, high-performance master cinematic prompt.
 */
export function composeCinematicPrompt(input: PromptComposerInput): PromptComposerOutput {
    const {
        visionData,
        motionSuggestion,
        shots,
        style,
        targetModel = 'Veo / Sora / Flow',
        lightingStyle = 'dramatic studio lighting with soft specular highlights',
        scenario = 'clean modern monochromatic studio environment',
        customProductName,
        avatarIdentityContext
    } = input;

    const pName = customProductName || 'Produto';

    // 1. Flow Agent Directives
    const flowAgent = buildFlowAgentInstructions({
        productName: pName,
        category: visionData.category,
        staticComponents: visionData.fixedParts,
        customComponentsText: `Partes Fixas: ${visionData.fixedParts.join(', ')}.`
    });

    // 2. Format Blocks for Output
    const blocks = shots.map((s, idx) => ({
        scene: `Cena ${idx + 1}: ${s.stepName}`,
        camera: s.camera,
        hand_action: s.handAction,
        framing: s.framing,
        visual_objective: s.visualObjective,
        visual_en: s.visualPromptEn,
        action_en: s.actionPromptEn,
        dialogue_pt_br: s.dialoguePtBr
    }));

    // Structural DNA and Reference Coverage blocks (if available)
    const structuralDnaBlock = renderProductStructuralDNA(visionData.structuralDNA);
    const coverage = visionData.referenceCoverage;
    const safety = visionData.motionSafety || (coverage ? resolveProductMotionSafety(coverage) : undefined);
    const coverageBlock = renderReferenceCoverageAndMotionSafety(coverage, safety);
    const avatarIdentityBlock = renderAvatarIdentityBlock(avatarIdentityContext);

    // 3. Assemble Full Text Prompt
    const promptHeader = `
=== MASTER CINEMATIC PROMPT (PRODUTO: ${pName.toUpperCase()}) ===
[ESTILO SELECIONADO]: ${style.toUpperCase()}
[MODELO IA ALVO]: ${targetModel}
[CATEGORIA DETECTADA]: ${visionData.category.toUpperCase()}

=== VISION ANALYZER (FONTE ÚNICA DE VERDADE) ===
- Produto: ${pName}
- Categoria: ${visionData.category}
- Material: ${visionData.material}
- Cor Primária/Secundária: ${visionData.color}
- Textura de Superfície: ${visionData.texture}
- Acabamento: ${visionData.finish}
- Logotipo & Identificação: ${visionData.logo}
- Embalagem Oficial: ${visionData.packaging}
- PARTES RIGIDAMENTE FIXAS: ${visionData.fixedParts.join(', ')}
- PARTES MÓVEIS PERMITIDAS: ${visionData.movingParts.join(', ')}
${structuralDnaBlock ? `\n${structuralDnaBlock}\n` : ''}${coverageBlock ? `\n${coverageBlock}\n` : ''}${avatarIdentityBlock ? `\n${avatarIdentityBlock}\n` : ''}
=== MOTION SUGGESTION ENGINE & FLOW AGENT LOCKS ===
${flowAgent.formatted_directives}

${motionSuggestion.motionLockPrompt}

=== CONFIGURAÇÃO DE CENÁRIO & ILUMINAÇÃO ===
- Cenário: ${scenario}
- Iluminação: ${lightingStyle}
- Estilo do Criador/Sujeito: ${style}

=== SEQUÊNCIA CINEMATOGRÁFICA DE CENAS (SHOT GENERATOR) ===
`.trim();

    const promptBody = shots.map((s, idx) => `
--- SCENE ${idx + 1}: ${s.stepName.toUpperCase()} ---
[CÂMERA & MOVIMENTO]: ${s.camera}
[AÇÃO DAS MÃOS / SUJEITO]: ${s.handAction}
[ENQUADRAMENTO]: ${s.framing}
[OBJETIVO VISUAL]: ${s.visualObjective}
[VISUAL PROMPT (ENG)]: ${s.visualPromptEn}
[ACTION DIRECTIVE (ENG)]: ${s.actionPromptEn}
[NARRATIVA / DIÁLOGO (PT-BR)]: "${s.dialoguePtBr}"
`).join('\n').trim();

    const finalPrompt = `${promptHeader}\n\n${promptBody}`;

    const negativePrompt = [
        'deforming product chassis',
        'morphing logos',
        'warping text',
        'distorting fixed parts',
        'changing materials',
        'surface liquefaction',
        'spinning internal cogs',
        'moving static gears',
        'flickering labels',
        'duplicate branding',
        ...motionSuggestion.negativePromptAdditions
    ].join(', ');

    return {
        finalPrompt,
        negativePrompt,
        structuredOutput: {
            product_name: pName,
            category: visionData.category,
            vision_data: visionData,
            motion_lock: motionSuggestion,
            style,
            target_model: targetModel,
            blocks
        }
    };
}
