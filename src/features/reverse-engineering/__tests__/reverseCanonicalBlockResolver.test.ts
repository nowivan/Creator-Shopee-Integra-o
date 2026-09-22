import { resolveCanonicalReverseBlocks } from '../reverseCanonicalBlockResolver';

console.log('======================================================');
console.log('STARTING REVERSE CANONICAL BLOCK RESOLVER TEST SUITE');
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

// A. veo_structure populated
const resA = resolveCanonicalReverseBlocks({
    veo_structure: [
        { scene_name: 'Hook', visual_prompt_en: 'Close-up of product', dialogue_pt_br: 'Veja isso!' },
        { scene_name: 'Demo', visual_prompt_en: 'Action shot', dialogue_pt_br: 'Funciona perfeitamente.' }
    ]
}, 'veo');
assert(resA.blocks.length === 2 && resA.sourceUsed === 'veo_structure', 'A: veo_structure populated');
assert(resA.blocks[0].scene_name === 'Hook' && resA.blocks[0].visual_prompt_en === 'Close-up of product', 'A: fields mapped correctly');

// B. sora_structure populated
const resB = resolveCanonicalReverseBlocks({
    sora_structure: [
        { sceneTitle: 'Abertura', visualDescription: 'Wide angle scene', spokenCopy: 'Confira agora' }
    ]
}, 'sora');
assert(resB.blocks.length === 1 && resB.sourceUsed === 'sora_structure', 'B: sora_structure populated');
assert(resB.blocks[0].scene_name === 'Abertura' && resB.blocks[0].visual_prompt_en === 'Wide angle scene', 'B: aliases mapped');

// C. grok_structure populated
const resC = resolveCanonicalReverseBlocks({
    grok_structure: [
        { title: 'Cena 1', action_prompt_en: 'Hand opens box', dialogue: 'Incrível' }
    ]
}, 'grok');
assert(resC.blocks.length === 1 && resC.sourceUsed === 'grok_structure', 'C: grok_structure populated');

// D. blocks populated
const resD = resolveCanonicalReverseBlocks({
    blocks: [
        { scene_id: 'sc_01', scene_name: 'Intro', visual_prompt_en: 'Studio shot' }
    ]
});
assert(resD.blocks.length === 1 && resD.sourceUsed === 'blocks', 'D: blocks populated');
assert(resD.blocks[0].sceneId === 'sc_01', 'D: scene_id alias mapped to sceneId');

// E. scenes populated
const resE = resolveCanonicalReverseBlocks({
    scenes: [
        { id: 'scn_1', name: 'Showcase', visual_en: 'Dynamic spin', dialogue_pt: 'Olha só' }
    ]
});
assert(resE.blocks.length === 1 && resE.sourceUsed === 'scenes', 'E: scenes populated');
assert(resE.blocks[0].dialogue_pt_br === 'Olha só', 'E: dialogue_pt alias mapped');

// F. scene_blocks populated
const resF = resolveCanonicalReverseBlocks({
    scene_blocks: [
        { block_id: 10, title: 'Hook', visual_prompt: 'Hands holding gadget' }
    ]
});
assert(resF.blocks.length === 1 && resF.sourceUsed === 'scene_blocks', 'F: scene_blocks populated');

// G. reverseBlocks populated
const resG = resolveCanonicalReverseBlocks({
    reverseBlocks: [
        { id: 'rb_1', scene_name: 'Outro', visualDescription: 'CTA screen' }
    ]
});
assert(resG.blocks.length === 1 && resG.sourceUsed === 'reverseBlocks', 'G: reverseBlocks populated');

// H. data.scenes populated
const resH = resolveCanonicalReverseBlocks({
    data: {
        scenes: [
            { scene_name: 'Nested Scene', visual_prompt_en: 'Kitchen setup' }
        ]
    }
});
assert(resH.blocks.length === 1 && resH.sourceUsed === 'data.scenes', 'H: data.scenes populated');

// I. active model empty but blocks populated (Empty Array Fallback)
const resI = resolveCanonicalReverseBlocks({
    veo_structure: [],
    blocks: [
        { scene_name: 'Fallback Block 1', visual_prompt_en: 'View 1' },
        { scene_name: 'Fallback Block 2', visual_prompt_en: 'View 2' }
    ]
}, 'veo');
assert(resI.blocks.length === 2 && resI.sourceUsed === 'blocks', 'I: empty veo_structure falls back to blocks');

// J. direct array input
const resJ = resolveCanonicalReverseBlocks([
    { scene_name: 'Direct 1', visual_prompt_en: 'Camera pans left' },
    { scene_name: 'Direct 2', visual_prompt_en: 'Camera pans right' }
]);
assert(resJ.blocks.length === 2 && resJ.sourceUsed === 'direct_array', 'J: direct array input resolved');

// K. numeric object scenes
const resK = resolveCanonicalReverseBlocks({
    scenes: {
        "0": { scene_name: 'Scene Zero', visual_prompt_en: 'First shot' },
        "1": { scene_name: 'Scene One', visual_prompt_en: 'Second shot' }
    }
});
assert(resK.blocks.length === 2 && resK.sourceUsed.startsWith('numeric_object'), 'K: numeric object scenes resolved');
assert(resK.blocks[0].scene_name === 'Scene Zero', 'K: correct numerical order');

// L. single scene-like object
const resL = resolveCanonicalReverseBlocks({
    visual_prompt_en: 'Single standalone scene',
    dialogue_pt_br: 'Narrador falando sobre o produto',
    scene_name: 'Single Hook'
});
assert(resL.blocks.length === 1 && resL.sourceUsed === 'single_scene_fallback', 'L: single scene-like object resolved');

// M. action normalization
const resM1 = resolveCanonicalReverseBlocks({
    blocks: [{ scene_name: 'Action Test 1', action_prompt_en: 'Actor picks up mug' }]
});
assert(resM1.blocks[0].actions.length === 1 && resM1.blocks[0].actions[0] === 'Actor picks up mug', 'M1: action_prompt_en converted to actions array');

const resM2 = resolveCanonicalReverseBlocks({
    blocks: [{ scene_name: 'Action Test 2', motion_lock_addition: 'Smooth continuous dolly-in' }]
});
assert(resM2.blocks[0].actions.length === 1 && resM2.blocks[0].actions[0] === 'Smooth continuous dolly-in', 'M2: motion_lock_addition converted to actions');

const resM3 = resolveCanonicalReverseBlocks({
    blocks: [{ scene_name: 'Action Test 3', actions: ['Step 1', 'Step 2'] }]
});
assert(resM3.blocks[0].actions.length === 2 && resM3.blocks[0].actions[0] === 'Step 1', 'M3: existing actions array preserved');

// N. all structures empty
const resN = resolveCanonicalReverseBlocks({});
assert(resN.blocks.length === 0 && resN.sourceUsed === 'none', 'N: all structures empty returns empty array');

const resNNull = resolveCanonicalReverseBlocks(null);
assert(resNNull.blocks.length === 0 && resNNull.sourceUsed === 'none', 'N: null returns empty array');

// Active model priority test:
const multiModel = {
    veo_structure: [{ scene_name: 'Veo 1', visual_prompt_en: 'Veo visual' }],
    sora_structure: [{ scene_name: 'Sora 1', visual_prompt_en: 'Sora visual' }],
    grok_structure: [{ scene_name: 'Grok 1', visual_prompt_en: 'Grok visual' }]
};
const resPrioritySora = resolveCanonicalReverseBlocks(multiModel, 'sora');
assert(resPrioritySora.sourceUsed === 'sora_structure' && resPrioritySora.blocks[0].scene_name === 'Sora 1', 'Active Model Priority: sora matches sora_structure');

const resPriorityGrok = resolveCanonicalReverseBlocks(multiModel, 'grok');
assert(resPriorityGrok.sourceUsed === 'grok_structure' && resPriorityGrok.blocks[0].scene_name === 'Grok 1', 'Active Model Priority: grok matches grok_structure');

console.log('======================================================');
console.log(`ALL ${passedTests}/${totalTests} TESTS PASSED`);
console.log('======================================================');
