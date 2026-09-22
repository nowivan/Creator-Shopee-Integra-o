import { resolveCanonicalReverseBlocks } from '../reverseCanonicalBlockResolver';
import { executeReverseRemodelPipeline } from '../reverseRemodelPipeline';
import { finalSceneProjectToLegacyReverseResult } from '../finalSceneAssembler';
import { enrichReverseEngineeringResult } from '../realismStabilityLayer';

console.log('======================================================');
console.log('STARTING PIPELINE & RESOLVER INTEGRATION TEST SUITE');
console.log('======================================================');

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string) {
    totalTests++;
    if (condition) {
        passedTests++;
        console.log(`✅ PASS: ${testName}`);
    } else {
        console.error(`❌ FAIL: ${testName}`);
        process.exit(1);
    }
}

// 1. Current Reverse Analysis bridged result
const mockRawAnalysis = {
    blocks: [
        {
            block_id: 1,
            scene_name: 'Gancho Visual',
            estimated_time: '0-3s',
            visual_prompt_en: 'Close up shot of product in luxury marble setting',
            action_prompt_en: 'Presenter reveals device with smooth rotation',
            dialogue_pt_br: 'Você nunca viu nada igual a isso.',
            voice_description_en: 'Confident and warm voiceover'
        },
        {
            block_id: 2,
            scene_name: 'Demonstração de Benefício',
            estimated_time: '3-7s',
            visual_prompt_en: 'Side angle demo with lighting accent',
            action_prompt_en: 'Device operating seamlessly',
            dialogue_pt_br: 'Ele resolve o seu problema em segundos.',
            voice_description_en: 'Energetic and convincing'
        },
        {
            block_id: 3,
            scene_name: 'Chamada para Ação',
            estimated_time: '7-10s',
            visual_prompt_en: 'Hero packshot with offer badge',
            action_prompt_en: 'Camera slowly pulls back',
            dialogue_pt_br: 'Clique no botão abaixo para garantir o seu.',
            voice_description_en: 'Urgent and clear'
        }
    ],
    veo_structure: [
        {
            scene_id: 'veo_1',
            scene_name: 'Gancho Visual (Veo)',
            visual_prompt_en: 'Veo optimized prompt 1',
            actions: ['Action 1'],
            dialogue_pt_br: 'Você nunca viu nada igual a isso.'
        },
        {
            scene_id: 'veo_2',
            scene_name: 'Demonstração de Benefício (Veo)',
            visual_prompt_en: 'Veo optimized prompt 2',
            actions: ['Action 2'],
            dialogue_pt_br: 'Ele resolve o seu problema em segundos.'
        },
        {
            scene_id: 'veo_3',
            scene_name: 'Chamada para Ação (Veo)',
            visual_prompt_en: 'Veo optimized prompt 3',
            actions: ['Action 3'],
            dialogue_pt_br: 'Clique no botão abaixo para garantir o seu.'
        }
    ]
};

const enrichedAnalysis = enrichReverseEngineeringResult(mockRawAnalysis, {
    creatorGender: 'female',
    creatorPersona: 'expert',
    speakingEnergy: 'high',
    speakingPace: 'dynamic'
});

const resolvedVeo = resolveCanonicalReverseBlocks(enrichedAnalysis, 'veo');
assert(resolvedVeo.blocks.length === 3, 'Current Analysis: 3 Veo scenes resolved');
assert(resolvedVeo.sourceUsed === 'veo_structure', 'Current Analysis: veo_structure source used');

const resolvedBlocksFallback = resolveCanonicalReverseBlocks(enrichedAnalysis, 'sora');
// Since sora_structure is missing, it falls back to canonical blocks array
assert(resolvedBlocksFallback.blocks.length === 3, 'Current Analysis: falls back to 3 canonical blocks for sora');
assert(resolvedBlocksFallback.sourceUsed === 'blocks', 'Current Analysis: blocks source used on missing model');

// 2. Remodel / Adaptation pipeline result
const pipelineOutput = executeReverseRemodelPipeline({
    rawReferenceResult: enrichedAnalysis,
    productBridgeInput: {
        userFields: {
            productName: 'SmartWatch Apex',
            productType: 'Smartwatch esportivo',
            targetAudience: 'Atletas e profissionais',
            mainDifferentiator: 'Bateria dura 14 dias com monitoramento cardíaco contínuo'
        }
    },
    adaptationContractOverride: {
        remodelingIntensity: 50,
        preserveElements: ['hook', 'conversion_structure', 'visual_style']
    }
});

assert(pipelineOutput.status === 'READY' || pipelineOutput.status === 'READY_WITH_WARNINGS', 'Pipeline status is READY');
assert(pipelineOutput.finalSceneProject !== undefined, 'finalSceneProject is produced');

const expectedScenesCount = pipelineOutput.finalSceneProject!.scenes.length;
const remodeledLegacy = finalSceneProjectToLegacyReverseResult(pipelineOutput.finalSceneProject!);
const resolvedRemodeled = resolveCanonicalReverseBlocks(remodeledLegacy, 'veo');
assert(resolvedRemodeled.blocks.length === expectedScenesCount && expectedScenesCount > 0, 'Current Adaptation: remodeled scenes resolved');
assert(resolvedRemodeled.blocks[0].scene_name !== undefined, 'Current Adaptation: Scene names present');
assert(resolvedRemodeled.blocks[0].visual_prompt_en.length > 0, 'Current Adaptation: Visual prompts present');
assert(resolvedRemodeled.blocks[0].dialogue_pt_br.length > 0, 'Current Adaptation: Dialogue present');

// 3. 4-Scene Realism and Structured Action Preservation Verification
const mock4SceneAnalysis = {
    scenes: [
        {
            scene_id: 'sc_1',
            scene_name: 'Cena 1 - Hook',
            visual_prompt_en: 'Macro shot of product packaging opening',
            actions: ['Hands unbox the sleek matte case'],
            dialogue_pt_br: 'Você precisa conhecer este lançamento.',
            voice_description_en: 'Warm Brazilian Portuguese tone'
        },
        {
            scene_id: 'sc_2',
            scene_name: 'Cena 2 - Pain Point',
            visual_prompt_en: 'Split screen comparing old versus new version',
            actions: ['Presenter gestures to the side-by-side demonstration'],
            dialogue_pt_br: 'Chega de perder tempo com soluções que não funcionam.',
            voice_description_en: 'Warm Brazilian Portuguese tone'
        },
        {
            scene_id: 'sc_3',
            scene_name: 'Cena 3 - Solution',
            visual_prompt_en: 'Dynamic camera track around glowing interface',
            actions: ['Smooth touch gesture on high-resolution display'],
            dialogue_pt_br: 'Com apenas um toque, tudo fica pronto.',
            voice_description_en: 'Warm Brazilian Portuguese tone'
        },
        {
            scene_id: 'sc_4',
            scene_name: 'Cena 4 - Call to Action',
            visual_prompt_en: 'Hero product shot with limited edition badge',
            actions: ['Product rotates into center framed hero shot'],
            dialogue_pt_br: 'Clique no link e garanta o seu com desconto exclusivo.',
            voice_description_en: 'Warm Brazilian Portuguese tone'
        }
    ]
};

const resolved4ScenesVeo = resolveCanonicalReverseBlocks(mock4SceneAnalysis, 'veo');
assert(resolved4ScenesVeo.blocks.length === 4, '4-Scene Analysis: 4 Veo scenes resolved');
assert(resolved4ScenesVeo.blocks[0].actions.length > 0, '4-Scene Analysis: Structured actions preserved on scene 1');
assert(resolved4ScenesVeo.blocks[0].actions[0] === 'Hands unbox the sleek matte case', '4-Scene Analysis: Action content matches exact upstream string');
assert(resolved4ScenesVeo.blocks[3].actions[0] === 'Product rotates into center framed hero shot', '4-Scene Analysis: Action content matches exact scene 4');

const resolved4ScenesSora = resolveCanonicalReverseBlocks(mock4SceneAnalysis, 'sora');
assert(resolved4ScenesSora.blocks.length === 4, '4-Scene Analysis: 4 Sora scenes resolved from canonical fallback');

const resolved4ScenesGrok = resolveCanonicalReverseBlocks(mock4SceneAnalysis, 'grok');
assert(resolved4ScenesGrok.blocks.length === 4, '4-Scene Analysis: 4 Grok scenes resolved from canonical fallback');

console.log('======================================================');
console.log(`ALL ${passedTests}/${totalTests} INTEGRATION TESTS PASSED`);
console.log('======================================================');
