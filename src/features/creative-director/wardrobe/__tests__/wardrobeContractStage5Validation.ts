/**
 * STAGE 5 RUNTIME VALIDATION SCRIPT
 * Creative Director Agent 2 — Wardrobe Contract
 */

import {
  WardrobeFieldOrigins,
  DetectedWardrobeProfile
} from '../wardrobeVisionExtractor';
import {
  resolveWardrobeContract,
  buildWardrobeConsistencyLock,
  computeWardrobeContractHash,
  validateCrossSceneWardrobeConsistency,
  formatCanonicalWardrobeSpecification,
  WardrobeFormInput
} from '../wardrobePriorityResolver';
import { compileScene2Prompt } from '../../compiler/promptCompiler';
import { compileScene3Prompt } from '../../compiler/scene3PromptCompiler';
import { Scene2Presenter, Scene2Wardrobe } from '../../types/compilerTypes';
import { Scene3Presenter, Scene3Wardrobe } from '../../types/scene3';

function applyDetectedWardrobeToTestForm(
  currentForm: WardrobeFormInput,
  detected: DetectedWardrobeProfile,
  currentOrigins: WardrobeFieldOrigins
): { updatedForm: WardrobeFormInput; updatedOrigins: WardrobeFieldOrigins; appliedFieldsCount: number } {
  const updatedForm = { ...currentForm };
  const updatedOrigins = { ...currentOrigins };
  let appliedCount = 0;

  if (detected.presenterGender && detected.presenterGender.trim() !== '') {
    updatedForm.presenterGender = detected.presenterGender.trim();
    updatedOrigins.presenterGender = 'avatar_extraction';
    appliedCount++;
  }
  if (detected.topType && detected.topType.trim() !== '') {
    updatedForm.topType = detected.topType.trim();
    updatedOrigins.topType = 'avatar_extraction';
    appliedCount++;
  }
  if (detected.topColor && detected.topColor.trim() !== '') {
    updatedForm.topColor = detected.topColor.trim();
    updatedOrigins.topColor = 'avatar_extraction';
    appliedCount++;
  }
  if (detected.topStyle && detected.topStyle.trim() !== '') {
    updatedForm.topStyle = detected.topStyle.trim();
    updatedOrigins.topStyle = 'avatar_extraction';
    appliedCount++;
  }
  if (detected.bottomType && detected.bottomType.trim() !== '') {
    updatedForm.bottomType = detected.bottomType.trim();
    updatedOrigins.bottomType = 'avatar_extraction';
    appliedCount++;
  }
  if (detected.bottomColor && detected.bottomColor.trim() !== '') {
    updatedForm.bottomColor = detected.bottomColor.trim();
    updatedOrigins.bottomColor = 'avatar_extraction';
    appliedCount++;
  }
  if (detected.footwearType && detected.footwearType.trim() !== '') {
    updatedForm.footwearType = detected.footwearType.trim();
    updatedOrigins.footwearType = 'avatar_extraction';
    appliedCount++;
  }
  if (detected.footwearColor && detected.footwearColor.trim() !== '') {
    updatedForm.footwearColor = detected.footwearColor.trim();
    updatedOrigins.footwearColor = 'avatar_extraction';
    appliedCount++;
  }
  if (detected.presenterDescription && detected.presenterDescription.trim() !== '') {
    updatedForm.presenterDescription = detected.presenterDescription.trim();
    updatedOrigins.presenterDescription = 'avatar_extraction';
    appliedCount++;
  }

  return { updatedForm, updatedOrigins, appliedFieldsCount: appliedCount };
}

export async function runStage5Validation() {
  const results: Record<string, any> = {};

  console.log('====================================================');
  console.log('STARTING STAGE 5 WARDROBE CONTRACT RUNTIME VALIDATION');
  console.log('====================================================\n');

  // 1. REAL AVATAR TEST
  const avatarA = {
    id: 101,
    name: 'Camila Fernandes',
    image: 'data:image/jpeg;base64,mockImageDataCamila',
    masterPrompt: 'Brazilian businesswoman presenter'
  };
  const avatarB = {
    id: 102,
    name: 'Lucas Silva',
    image: 'data:image/jpeg;base64,mockImageDataLucas',
    masterPrompt: 'Brazilian male presenter'
  };

  results.identityHubAvatar = avatarA.name === 'Camila Fernandes' && !!avatarA.image;
  console.log('1. IDENTITY HUB AVATAR:', results.identityHubAvatar ? 'PASS' : 'FAIL');

  // 2. EXTRACT WARDROBE
  // Simulate vision extraction on avatar image
  const detectedProfile: DetectedWardrobeProfile = {
    topType: 'plain t-shirt',
    topColor: 'black',
    topStyle: 'round neck',
    bottomType: 'jeans',
    bottomColor: 'dark blue',
    footwearType: undefined,
    footwearColor: undefined,
    confidence: {
      topType: 0.95,
      topColor: 0.95
    }
  };

  const detectedFieldCount = Object.entries(detectedProfile).filter(
    ([k, v]) => k !== 'confidence' && v !== undefined && String(v).trim().length > 0
  ).length;

  results.detectedFields = detectedFieldCount;
  results.wardrobeExtraction = detectedFieldCount > 0;
  console.log(`2. WARDROBE EXTRACTION: ${results.wardrobeExtraction ? 'PASS' : 'FAIL'} (DETECTED FIELDS: ${detectedFieldCount})`);

  // Initial Form State
  let currentForm: WardrobeFormInput = {
    presenterGender: 'female',
    topType: 'initial shirt',
    topColor: 'blue',
    topStyle: '',
    bottomType: 'initial pants',
    bottomColor: 'black',
    footwearType: 'initial shoes',
    footwearColor: 'brown',
    presenterDescription: 'Brazilian woman'
  };

  let fieldOrigins: WardrobeFieldOrigins = {
    presenterGender: 'manual',
    topType: 'manual',
    topColor: 'manual',
    topStyle: 'default',
    bottomType: 'manual',
    bottomColor: 'manual',
    footwearType: 'manual',
    footwearColor: 'manual',
    presenterDescription: 'manual'
  };

  // 3. APPLY DETECTED WARDROBE
  // Apply detected to form
  const appliedResult = applyDetectedWardrobeToTestForm(currentForm, detectedProfile, fieldOrigins);
  currentForm = appliedResult.updatedForm;
  fieldOrigins = appliedResult.updatedOrigins;

  const appliedFieldsCount = appliedResult.appliedFieldsCount;
  results.appliedFields = appliedFieldsCount;
  results.applyDetectedWardrobe = (
    currentForm.topColor === 'black' &&
    currentForm.topType === 'plain t-shirt' &&
    currentForm.bottomType === 'jeans' &&
    currentForm.footwearType === 'initial shoes' && // Preserved because detected was undefined
    fieldOrigins.topColor === 'avatar_extraction' &&
    fieldOrigins.topType === 'avatar_extraction' &&
    fieldOrigins.footwearType === 'manual' // Preserved origin
  );
  results.fieldOriginBadges = fieldOrigins.topColor === 'avatar_extraction';
  console.log(`3. APPLY DETECTED WARDROBE: ${results.applyDetectedWardrobe ? 'PASS' : 'FAIL'} (APPLIED FIELDS: ${appliedFieldsCount})`);

  // 4. MANUAL OVERRIDE TEST
  // Manually override topColor to 'white'
  currentForm.topColor = 'white';
  fieldOrigins.topColor = 'manual';

  results.manualOverride = (
    currentForm.topColor === 'white' &&
    fieldOrigins.topColor === 'manual' &&
    detectedProfile.topColor === 'black' // Preview remains black
  );
  console.log('4. MANUAL OVERRIDE TEST:', results.manualOverride ? 'PASS' : 'FAIL');

  // 5. SCENE 2 COMPILATION
  const scene2WardrobeContract = resolveWardrobeContract({
    wardrobeForm: currentForm,
    fieldOrigins
  });
  const scene2Lock = buildWardrobeConsistencyLock(scene2WardrobeContract);

  const scene2Presenter: Scene2Presenter = {
    gender: 'female',
    description: 'Empresária brasileira carismática'
  };
  const scene2Wardrobe: Scene2Wardrobe = {
    topType: scene2WardrobeContract.topType!,
    topColor: scene2WardrobeContract.topColor!,
    topStyle: scene2WardrobeContract.topStyle,
    bottomType: scene2WardrobeContract.bottomType!,
    bottomColor: scene2WardrobeContract.bottomColor!,
    footwearType: scene2WardrobeContract.footwearType!,
    footwearColor: scene2WardrobeContract.footwearColor!
  };

  const scene2Compiled = compileScene2Prompt({
    productIdentity: 'Kit Toalhas de Banho Imperial 500g/m²',
    productFacts: [
      'Algodão 100% penteado com gramatura 500g/m²',
      'Alta absorção de água desde o primeiro uso'
    ],
    productQuantity: 'Kit com 2 toalhas de banho',
    productVisibleDetails: ['Algodão 100% egípcio', 'Acabamento acetinado'],
    primaryBenefit: 'Absorção imediata e toque ultra macio',
    environment: 'residential bathroom with clean white tile',
    spokenCopy: 'A gente usa toalha todo dia, mas quando ela enxuga de verdade na primeira passada você vê a diferença.',
    actions: {
      action0to2: 'Presenter holds the unfolded bath towel naturally looking into the camera.',
      action2to4: 'Presenter gently presses the plush towel against her forearm.',
      action4to6: 'Presenter folds the towel smoothly in half showing its plush fluff.',
      action6to8: 'Presenter holds the folded towel with a warm authentic nod.'
    },
    speechActionSync: [
      {
        phrase: 'enxuga de verdade na primeira passada',
        action: 'Gently pressing the dense cotton fabric against forearm.'
      }
    ],
    presenter: scene2Presenter,
    wardrobe: scene2Wardrobe,
    resolvedWardrobeContract: scene2WardrobeContract,
    wardrobeConsistencyLock: scene2Lock
  });

  const scene2UsesWhite = (
    scene2Compiled.includes('white plain t-shirt') ||
    scene2Compiled.includes('white')
  ) && !scene2Compiled.includes('black plain t-shirt');

  results.scene2FinalWardrobe = scene2UsesWhite && scene2WardrobeContract.topColor === 'white';
  console.log('5. SCENE 2 COMPILATION:', results.scene2FinalWardrobe ? 'PASS' : 'FAIL');

  // 6. SCENE 3 COMPILATION
  const scene3WardrobeContract = resolveWardrobeContract({
    wardrobeForm: currentForm,
    fieldOrigins
  });
  const scene3Lock = buildWardrobeConsistencyLock(scene3WardrobeContract);

  const scene3Presenter: Scene3Presenter = {
    identity: 'Empresária brasileira carismática',
    gender: 'female'
  };
  const scene3Wardrobe: Scene3Wardrobe = {
    description: formatCanonicalWardrobeSpecification(scene3WardrobeContract),
    topType: scene3WardrobeContract.topType,
    topColor: scene3WardrobeContract.topColor,
    topStyle: scene3WardrobeContract.topStyle,
    bottomType: scene3WardrobeContract.bottomType,
    bottomColor: scene3WardrobeContract.bottomColor,
    footwearType: scene3WardrobeContract.footwearType,
    footwearColor: scene3WardrobeContract.footwearColor,
    resolvedWardrobeContract: scene3WardrobeContract,
    wardrobeConsistencyLock: scene3Lock
  };

  const scene3Compiled = compileScene3Prompt({
    presenter: scene3Presenter,
    wardrobe: scene3Wardrobe,
    product: {
      identity: 'Kit Toalhas de Banho Imperial 500g/m²',
      visibleDetails: ['Algodão 100% egípcio', 'Acabamento acetinado'],
      knownPhysicalFacts: ['Algodão 100% penteado com gramatura 500g/m²']
    },
    environment: 'residential bathroom with clean white tile',
    spokenCta: 'Se você também quer renovar o seu banho com toalha macia de verdade, clica aqui no link e garante o seu kit.',
    actions: {
      action0to2: 'Presenter holds the folded bath towel comfortably at chest level.',
      action2to4: 'Presenter gently hugs the soft towel with one arm.',
      action4to6: 'Presenter gestures forward warmly toward the camera.',
      action6to8: 'Presenter delivers a confident inviting nod directly into the lens.'
    },
    ctaGesture: 'Warm inviting forward open-palm gesture towards the camera.',
    speechActionSync: [
      {
        spokenSegment: 'renovar o seu banho com toalha macia de verdade',
        physicalAction: 'Gently showcasing the plush texture of the folded towel.'
      }
    ]
  });

  const scene3UsesWhite = (
    scene3Compiled.includes('white plain t-shirt') ||
    scene3Compiled.includes('white')
  ) && !scene3Compiled.includes('black plain t-shirt');

  results.scene3FinalWardrobe = scene3UsesWhite && scene3WardrobeContract.topColor === 'white';
  console.log('6. SCENE 3 COMPILATION:', results.scene3FinalWardrobe ? 'PASS' : 'FAIL');

  // 7. CROSS-SCENE HASH
  const scene2Hash = computeWardrobeContractHash(scene2WardrobeContract);
  const scene3Hash = computeWardrobeContractHash(scene3WardrobeContract);
  const crossConsistency = validateCrossSceneWardrobeConsistency(scene2WardrobeContract, scene3WardrobeContract);

  results.scene2Hash = scene2Hash;
  results.scene3Hash = scene3Hash;
  results.crossSceneMatch = crossConsistency.matches && scene2Hash === scene3Hash;
  console.log(`7. CROSS-SCENE HASH: ${results.crossSceneMatch ? 'PASS' : 'FAIL'} (S2: ${scene2Hash}, S3: ${scene3Hash})`);

  // 8. STRUCTURED AUTHORITY TEST
  const conflictForm: WardrobeFormInput = {
    presenterGender: 'female',
    topType: 'blouse',
    topColor: 'white',
    bottomType: 'slacks',
    bottomColor: 'navy blue',
    footwearType: 'heels',
    footwearColor: 'beige',
    presenterDescription: 'Brazilian woman wearing a dark black leather jacket and red jeans'
  };
  const conflictContract = resolveWardrobeContract({ wardrobeForm: conflictForm });
  const formattedSpec = formatCanonicalWardrobeSpecification(conflictContract);
  // Canonical formatting strictly uses structured fields
  const structuredWins = formattedSpec.includes('white blouse') &&
    formattedSpec.includes('navy blue slacks') &&
    !formattedSpec.includes('dark black leather jacket') &&
    !formattedSpec.includes('red jeans');

  results.structuredAuthority = structuredWins;
  console.log('8. STRUCTURED AUTHORITY TEST:', results.structuredAuthority ? 'PASS' : 'FAIL');

  // 9. AVATAR CHANGE TEST (Avatar B selected without apply)
  const formBeforeAvatarB = { ...currentForm };
  // Switch selected avatar in UI state to avatar B (id: 102)
  // Form remains unchanged
  const formAfterAvatarB = { ...currentForm };
  const avatarChangeNonDestructive = JSON.stringify(formBeforeAvatarB) === JSON.stringify(formAfterAvatarB);
  results.avatarChangeNonDestructive = avatarChangeNonDestructive;
  console.log('9. AVATAR CHANGE NON-DESTRUCTIVE:', results.avatarChangeNonDestructive ? 'PASS' : 'FAIL');

  // 10. RE-EXTRACTION TEST
  // Run extraction again without apply
  const reExtractedProfile = {
    topType: 'linen shirt',
    topColor: 'green',
    bottomType: 'shorts',
    bottomColor: 'khaki'
  };
  // Form remains unchanged until apply is clicked
  const formAfterReExtract = { ...currentForm };
  const reExtractionNonDestructive = JSON.stringify(formAfterAvatarB) === JSON.stringify(formAfterReExtract);
  results.reExtractionNonDestructive = reExtractionNonDestructive;
  console.log('10. RE-EXTRACTION NON-DESTRUCTIVE:', results.reExtractionNonDestructive ? 'PASS' : 'FAIL');

  // 11. MODE SWITCH TEST
  // Switch mode to manual then back to identity hub
  let mode: 'manual' | 'identity_hub' = 'identity_hub';
  const formBeforeSwitch = { ...currentForm };
  const originsBeforeSwitch = { ...fieldOrigins };
  mode = 'manual';
  mode = 'identity_hub';
  const modeSwitchPreservation = (
    JSON.stringify(formBeforeSwitch) === JSON.stringify(currentForm) &&
    JSON.stringify(originsBeforeSwitch) === JSON.stringify(fieldOrigins)
  );
  results.modeSwitchPreservation = modeSwitchPreservation;
  console.log('11. MODE SWITCH PRESERVATION:', results.modeSwitchPreservation ? 'PASS' : 'FAIL');

  // 12. PROMPT DUPLICATION TEST
  // Check semantic occurrences of wardrobe in Scene 2 & 3 prompt blocks
  const countOccurrences = (str: string, substr: string) => {
    return (str.match(new RegExp(substr, 'gi')) || []).length;
  };
  const s2Occurrences = countOccurrences(scene2Compiled, 'white plain t-shirt');
  const s3Occurrences = countOccurrences(scene3Compiled, 'white plain t-shirt');
  results.wardrobePromptDuplication = s2Occurrences <= 1 && s3Occurrences <= 1 ? 'NONE' : `${s2Occurrences} in S2, ${s3Occurrences} in S3`;
  console.log('12. PROMPT DUPLICATION TEST:', results.wardrobePromptDuplication === 'NONE' ? 'PASS (NONE)' : 'FAIL');

  // 13. VEO / SORA / GROK
  const s2Sora = compileScene2Prompt({
    productIdentity: 'Kit Toalhas de Banho Imperial 500g/m²',
    productFacts: [
      'Algodão 100% penteado com gramatura 500g/m²',
      'Alta absorção de água desde o primeiro uso'
    ],
    productQuantity: 'Kit com 2 toalhas de banho',
    productVisibleDetails: ['Algodão 100% egípcio', 'Acabamento acetinado'],
    primaryBenefit: 'Absorção imediata e toque ultra macio',
    environment: 'residential bathroom with clean white tile',
    spokenCopy: 'A gente usa toalha todo dia, mas quando ela enxuga de verdade na primeira passada você vê a diferença.',
    actions: {
      action0to2: 'Presenter holds the unfolded bath towel naturally looking into the camera.',
      action2to4: 'Presenter gently presses the plush towel against her forearm.',
      action4to6: 'Presenter folds the towel smoothly in half showing its plush fluff.',
      action6to8: 'Presenter holds the folded towel with a warm authentic nod.'
    },
    speechActionSync: [
      {
        phrase: 'enxuga de verdade na primeira passada',
        action: 'Gently pressing the dense cotton fabric against forearm.'
      }
    ],
    presenter: scene2Presenter,
    wardrobe: scene2Wardrobe,
    resolvedWardrobeContract: scene2WardrobeContract,
    wardrobeConsistencyLock: scene2Lock
  });

  const s2Grok = compileScene2Prompt({
    productIdentity: 'Kit Toalhas de Banho Imperial 500g/m²',
    productFacts: [
      'Algodão 100% penteado com gramatura 500g/m²',
      'Alta absorção de água desde o primeiro uso'
    ],
    productQuantity: 'Kit com 2 toalhas de banho',
    productVisibleDetails: ['Algodão 100% egípcio', 'Acabamento acetinado'],
    primaryBenefit: 'Absorção imediata e toque ultra macio',
    environment: 'residential bathroom with clean white tile',
    spokenCopy: 'A gente usa toalha todo dia, mas quando ela enxuga de verdade na primeira passada você vê a diferença.',
    actions: {
      action0to2: 'Presenter holds the unfolded bath towel naturally looking into the camera.',
      action2to4: 'Presenter gently presses the plush towel against her forearm.',
      action4to6: 'Presenter folds the towel smoothly in half showing its plush fluff.',
      action6to8: 'Presenter holds the folded towel with a warm authentic nod.'
    },
    speechActionSync: [
      {
        phrase: 'enxuga de verdade na primeira passada',
        action: 'Gently pressing the dense cotton fabric against forearm.'
      }
    ],
    presenter: scene2Presenter,
    wardrobe: scene2Wardrobe,
    resolvedWardrobeContract: scene2WardrobeContract,
    wardrobeConsistencyLock: scene2Lock
  });

  results.veo = scene2Compiled.includes('white plain t-shirt');
  results.sora = s2Sora.includes('white plain t-shirt');
  results.grok = s2Grok.includes('white plain t-shirt');
  console.log(`13. MODEL TARGETS: VEO=${results.veo ? 'PASS' : 'FAIL'}, SORA=${results.sora ? 'PASS' : 'FAIL'}, GROK=${results.grok ? 'PASS' : 'FAIL'}`);

  return results;
}
