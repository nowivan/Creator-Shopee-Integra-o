/**
 * SCENE 2 BRAIN SERVICES & PIPELINE ORCHESTRATOR
 * 
 * Implements:
 * 1. Copy Brain C2: Produces purely spoken value/benefit copy (PT-BR) without visual directions.
 * 2. Scene Brain C2: Resolves functional environment, temporal actions (0-8s), and speech sync.
 * 3. runScene2CompilerPipeline: Complete deterministic orchestration.
 */

import { processGeminiAPI, safeJSONParse } from '../../../utils';
import {
  Scene2CopyBrainInput,
  Scene2CopyBrainOutput,
  Scene2SceneBrainInput,
  Scene2SceneBrainOutput,
  Scene2DynamicSlots,
  Scene2CompilerDiagnosticTrace,
  Scene2Presenter,
  Scene2Wardrobe,
  Scene2ProductContext,
  ProductGroundingResult,
  CompiledScene2Model,
  Scene2JsonOutput,
  Scene2PipelineResult,
  AvatarIdentityContext
} from '../types/compilerTypes';
import {
  compileScene2Prompt,
  validateScene2Slots,
  validatePreCompilationSemanticGate,
  buildCompiledScene2Model,
  renderScene2Text,
  renderScene2Json,
  renderScene2JsonString
} from '../compiler/promptCompiler';
import { runScene2CopyBrain, classifyBenefit } from './scene2CopyBrain';
import { createNormalizedProductContext, extractDataFromGeminiResponse } from './productGroundingService';
import { resolvePhysicalActionChoreography } from './physicalChoreographyResolver';
import {
  ResolvedWardrobeContract,
  WardrobeConsistencyLock
} from '../wardrobe/wardrobePriorityResolver';
export { runScene2CopyBrain, classifyBenefit };

/**
 * SCENE BRAIN — SCENE 2
 * Focus: Resolves functional environment, 4 temporal physical actions (0-8s), and speech synchronization.
 * Crucial Rule: Action must physically demonstrate the spoken benefit.
 */
export async function runScene2SceneBrain(
  input: Scene2SceneBrainInput,
  apiKey: string = ''
): Promise<Scene2SceneBrainOutput> {
  const isKit = Boolean(input.isCommercialPackConfirmed && (input.kitComponentCount ?? 0) > 1);
  const kitN = input.kitComponentCount ?? 2;
  const remainingN = input.remainingVisibleComponentCount ?? (kitN - 1);

  const temporalRules = isKit ? `
3. MANDATORY KIT COMPOSITION PROTOCOL (${kitN} CONFIRMED PHYSICAL COMPONENTS):
   This product is a confirmed commercial pack / kit consisting of ${kitN} components.
   - action0to2 (0.0s - 2.0s): All ${kitN} components of the complete kit are clearly visible arranged together on a functional surface (counter, vanity, table, shelf, or support) coherent with the room. Presenter begins speaking directly to camera while presenting the complete set.
   - action2to4 (2.0s - 4.0s): Presenter selects and picks up ONLY 1 component from the set to demonstrate, while the other ${remainingN} components remain clearly visible and undisturbed on the surface in the shot.
   - action4to6 (4.0s - 6.0s): Presenter physically tests or demonstrates the chosen single component (application, spray, texture, or benefit) while the remaining ${remainingN} components continue clearly visible on the surface.
   - action6to8 (6.0s - 8.0s): Presenter repositions or returns the handled component alongside the rest of the set on the support surface. The complete ${kitN}-piece kit remains clearly visible and framed together in the final shot. DO NOT say "holds product at chest level".
` : `
3. TEMPORAL BLOCKS (8 SECONDS TOTAL):
   - action0to2 (0.0s - 2.0s): Presenter begins real handling or functional demonstration.
   - action2to4 (2.0s - 4.0s): Physical demonstration of the primary benefit while speaking.
   - action4to6 (4.0s - 6.0s): Visible practical result or tangible texture/quality check.
   - action6to8 (6.0s - 8.0s): Presenter holds product naturally, speaking to camera with natural nod.
`;

  const syncRule = isKit ? `
4. SPEECH/ACTION SYNCHRONIZATION:
   Map 1 to 3 key phrases from the EXACT SPOKEN COPY to their corresponding bodily movements.
   If the spoken copy mentions kit quantity (e.g. "três", "conjunto", "kit") or selecting/varying between options (e.g. "escolho um", "um dos", "vario"), synchronize the exact physical gesture (e.g. gesturing to the set, picking 1 item, or placing it back beside the others).
` : `
4. SPEECH/ACTION SYNCHRONIZATION:
   Map 1 to 3 key phrases from the EXACT SPOKEN COPY to their corresponding bodily movements.
`;

  const systemPrompt = `You are the SCENE 2 SCENE BRAIN, a specialized UGC physical action director.
Your task is to structure the physical environment and 4 temporal action blocks (0.0s - 8.0s) for Scene 2.

MANDATORY RULES:
1. ENVIRONMENT RESOLUTION:
   Deduce a realistic, functional everyday environment based strictly on:
   PRODUCT FUNCTION + PHYSICAL ACTION.
   - Bath towel / Skincare → Real bathroom
   - Cookware / Kitchen gadget → Real kitchen
   - Organizer / Bedding / Pillow → Real bedroom / closet
   - Electronics / Gadgets → Living room / desk setup
   - Fashion / Accessories / Watch → Natural indoor / everyday setting
   NEVER pick an environment merely because of a studio catalog photo.

2. PHYSICAL ACTION PRINCIPLE:
   ACTION MUST PHYSICALLY SUPPORT THE SPOKEN BENEFIT.
   If the product has a coherent physical function, show the presenter actually using, feeling, testing, or demonstrating it.
   DO NOT generate lazy static actions like:
   - just holding the box
   - pointing at the packaging
   - posing statically for camera
${temporalRules}
${syncRule}
5. REFERENCE COVERAGE & MOTION SAFETY:
   - Product rotation limit: Max ${input.motionSafety?.maxRotationDegrees ?? 30}° rotation.
   - Forbidden angles: ${(input.motionSafety?.forbiddenViews ?? []).join(', ') || 'Unseen / unverified product faces'}.
   - Same Object Continuity: Camera movement and hand movement may change perspective, but must never require regeneration of an unseen product face. Different viewing angles must represent the same physical object, not a newly reconstructed version.

Return ONLY valid JSON matching this schema:
{
  "environment": "Short description of the real functional room (e.g. 'residential bathroom with clean tile and natural window light')",
  "actions": {
    "action0to2": "English description of action from 0.0s to 2.0s",
    "action2to4": "English description of action from 2.0s to 4.0s",
    "action4to6": "English description of action from 4.0s to 6.0s",
    "action6to8": "English description of action from 6.0s to 8.0s"
  },
  "speechActionSync": [
    {
      "phrase": "Exact short phrase from the spoken copy",
      "action": "Physical demonstration movement performed during this spoken phrase"
    }
  ]
}`;

  const userContext = `PRODUCT & SCENE CONTEXT:
- Product: ${input.productName}
- Category: ${input.category}
- Verified Facts: ${input.productFacts.join('; ')}
- Observable Details: ${input.productVisibleDetails.join('; ')}
- Primary Benefit: ${input.primaryBenefit}
- FINALIZED SPOKEN COPY: "${input.spokenCopy}"
- Presenter: ${input.presenter.description} (${input.presenter.gender})
- Wardrobe: ${input.wardrobe.topColor} ${input.wardrobe.topType}, ${input.wardrobe.bottomColor} ${input.wardrobe.bottomType}
${isKit ? `- CONFIRMED COMMERCIAL KIT: ${kitN} units total in pack. Presenter handles 1 item, remaining ${remainingN} items stay visible.` : ''}

Generate the functional environment and 4 temporal action blocks now.`;

  const response = await processGeminiAPI(apiKey, {
    mode: "scene2_scene_brain",
    moduleName: "Scene 2 Scene Brain",
    model: "gemini-3.5-flash",
    require_json: true,
    contents: [
      {
        parts: [
          { text: systemPrompt },
          { text: userContext }
        ]
      }
    ]
  });

  const parsed = extractDataFromGeminiResponse(response);
  if (!parsed || !parsed.actions || !parsed.environment) {
    // Deterministic fallback actions
    const defaultEnv = input.category.toLowerCase().includes('cozinha') || input.category.toLowerCase().includes('kitchen')
      ? 'modern residential kitchen with natural daylight'
      : input.category.toLowerCase().includes('banho') || input.category.toLowerCase().includes('towel') || input.category.toLowerCase().includes('beleza')
      ? 'contemporary bathroom with bright natural ambient light'
      : 'bright everyday living room with authentic natural light';

    if (isKit) {
      return {
        environment: defaultEnv,
        actions: {
          action0to2: `All ${kitN} components of the complete ${input.productName} are neatly arranged and clearly visible on the support surface, as the presenter begins speaking to camera.`,
          action2to4: `Presenter selects and picks up 1 component from the set to demonstrate, while the other ${remainingN} items remain clearly visible on the support surface.`,
          action4to6: `Presenter physically tests and demonstrates the chosen item's functional benefit, with the rest of the kit remaining visible in frame.`,
          action6to8: `Presenter brings the handled component back alongside the other items on the surface, with the complete ${kitN}-piece kit clearly framed and visible in the final shot.`
        },
        speechActionSync: [
          {
            phrase: input.spokenCopy.slice(0, 30),
            action: `Selecting 1 item from the complete set of ${kitN} visible on the surface while demonstrating its functional use.`
          }
        ]
      };
    }

    return {
      environment: defaultEnv,
      actions: {
        action0to2: `Presenter holds the ${input.productName} naturally, showing its authentic texture while beginning to speak directly to the phone camera.`,
        action2to4: `Presenter practically demonstrates the key feature of ${input.productName}, testing its functional benefit with hands in continuous motion.`,
        action4to6: `Presenter shows the tangible result of ${input.productName} up close, expressing natural satisfaction with facial and hand gestures.`,
        action6to8: `Presenter brings the product to chest level, speaking the final words directly into the lens with an affirmative nod.`
      },
      speechActionSync: [
        {
          phrase: input.spokenCopy.slice(0, 30),
          action: `Handling the ${input.productName} and demonstrating its real functional benefit.`
        }
      ]
    };
  }

  let finalAction6to8 = parsed.actions?.action6to8 || (isKit
    ? `Presenter brings the handled component back alongside the other items on the surface, with the complete ${kitN}-piece kit clearly visible and framed together.`
    : `Presenter holds product steadily, finishing dialogue directly to camera.`);

  if (isKit && /chest level|altura do peito/i.test(finalAction6to8)) {
    finalAction6to8 = finalAction6to8
      .replace(/holds? (?:the )?product (?:at|to) chest level/gi, `positions the handled component back with the complete ${kitN}-piece kit on the surface`)
      .replace(/at chest level/gi, `beside the remaining kit items on the surface`);
  }

  return {
    environment: parsed.environment,
    actions: {
      action0to2: parsed.actions?.action0to2 || (isKit
        ? `All ${kitN} items of the complete ${input.productName} are neatly arranged and clearly visible on the surface as the presenter begins speaking.`
        : `Presenter begins demonstration of ${input.productName} while addressing camera.`),
      action2to4: parsed.actions?.action2to4 || (isKit
        ? `Presenter selects and picks up 1 item to demonstrate while the remaining ${remainingN} items stay clearly visible.`
        : `Presenter demonstrates the primary benefit in practical use.`),
      action4to6: parsed.actions?.action4to6 || `Presenter inspects the tangible outcome with genuine confidence.`,
      action6to8: finalAction6to8
    },
    speechActionSync: Array.isArray(parsed.speechActionSync) && parsed.speechActionSync.length > 0
      ? parsed.speechActionSync
      : [
          {
            phrase: input.spokenCopy.slice(0, 25),
            action: isKit
              ? `Handling 1 item from the visible ${kitN}-piece kit while demonstrating its practical function.`
              : `Demonstrating the product functionality naturally on camera.`
          }
        ]
  };
}

/**
 * COMPLETE PIPELINE ORCHESTRATOR FOR SCENE 2
 * 
 * Pipeline Flow:
 * Product Input + Facts + Wardrobe
 *   ↓
 * Copy Brain C2 (Produces Spoken Copy)
 *   ↓
 * Scene Brain C2 (Produces Environment + Temporal Actions + Sync)
 *   ↓
 * Deterministic Prompt Compiler (Produces Final Video Prompt)
 */
export async function runScene2CompilerPipeline(
  params: {
    productName: string;
    category: string;
    productFacts: string[];
    productVisibleDetails: string[];
    productQuantity?: string;
    primaryBenefit: string;
    presenter: Scene2Presenter;
    wardrobe: Scene2Wardrobe;
    resolvedWardrobeContract?: ResolvedWardrobeContract;
    wardrobeConsistencyLock?: WardrobeConsistencyLock;
    avatarIdentityContext?: AvatarIdentityContext;
    targetAudience?: string;
    toneStyle?: string;
    groundingResult?: ProductGroundingResult;
    productContext?: Scene2ProductContext;
  },
  apiKey: string = ''
): Promise<Scene2PipelineResult> {
  const startTime = Date.now();

  // Establish normalized single source of truth for product context
  const productContext = params.productContext || createNormalizedProductContext(
    params.groundingResult || {
      product_identity: params.productName,
      category: params.category,
      verified_functional_facts: params.productFacts,
      observable_details: params.productVisibleDetails,
      observable_quantity: params.productQuantity ? parseInt(params.productQuantity, 10) || null : null
    },
    params.productFacts,
    {
      productName: params.productName,
      category: params.category,
      productQuantity: params.productQuantity,
      observableDetails: params.productVisibleDetails,
      verifiedFacts: params.productFacts
    }
  );

  // Classify and validate the primary benefit against verified facts
  const benefitCheck = classifyBenefit(params.primaryBenefit, productContext.verifiedFunctionalFacts);

  // If primaryBenefit is empty or an aesthetic-only attribute ("Elegante"), use grounding fact anchor
  const actionableBenefit = benefitCheck.isAestheticOnly
    ? `Qualidade e acabamento refinado com ${productContext.verifiedFunctionalFacts[0] || productContext.identity}`
    : (params.primaryBenefit || productContext.verifiedFunctionalFacts[0] || 'Praticidade comprovada no uso diário');

  // Step 1: Run Copy Brain C2
  const copyBrainOutput = await runScene2CopyBrain(
    {
      productName: productContext.identity,
      category: productContext.category || params.category,
      productFacts: productContext.verifiedFunctionalFacts,
      productVisibleDetails: productContext.observableDetails,
      productQuantity: productContext.observableQuantity ? String(productContext.observableQuantity) : undefined,
      primaryBenefit: actionableBenefit,
      targetAudience: params.targetAudience,
      toneStyle: params.toneStyle
    },
    apiKey
  );

  // Step 2: Run Scene Brain C2 (Receives finalized copy)
  const isPack = Boolean(
    productContext.isCommercialPackConfirmed &&
    ((productContext.kitComponentCount ?? productContext.activeSceneQuantity ?? productContext.observableQuantity ?? 0) > 1)
  );
  const kitCount = isPack
    ? (productContext.kitComponentCount || productContext.referenceTotalUnitsVisible || productContext.activeSceneQuantity || productContext.observableQuantity || undefined)
    : undefined;
  const handledCount = isPack && kitCount ? 1 : undefined;
  const remainingCount = isPack && kitCount ? kitCount - 1 : undefined;

  const sceneBrainOutput = await runScene2SceneBrain(
    {
      productName: productContext.identity,
      category: productContext.category || params.category,
      productFacts: productContext.verifiedFunctionalFacts,
      productVisibleDetails: productContext.observableDetails,
      primaryBenefit: actionableBenefit,
      spokenCopy: copyBrainOutput.spokenCopy,
      presenter: params.presenter,
      wardrobe: params.wardrobe,
      referenceCoverage: productContext.referenceCoverage,
      motionSafety: productContext.motionSafety,
      isCommercialPackConfirmed: isPack,
      kitComponentCount: kitCount,
      handledComponentCount: handledCount,
      remainingVisibleComponentCount: remainingCount
    },
    apiKey
  );

  // Step 2.5: Run Deterministic Physical Action Choreography Resolver
  const physicalChoreography = resolvePhysicalActionChoreography({
    actions: sceneBrainOutput.actions,
    environment: sceneBrainOutput.environment,
    productIdentity: productContext.identity,
    category: productContext.category || params.category,
    productFacts: productContext.verifiedFunctionalFacts,
    productVisibleDetails: productContext.observableDetails,
    spokenCopy: copyBrainOutput.spokenCopy,
    speechActionSync: sceneBrainOutput.speechActionSync,
    structuralDNA: productContext.structuralDNA || params.groundingResult?.structuralDNA,
    referenceCoverage: productContext.referenceCoverage,
    isCommercialPackConfirmed: isPack,
    kitComponentCount: kitCount
  });

  // Reconcile speechActionSync with dialogue-locked anchors
  const validatedSpeechActionSync = physicalChoreography.speechActionAnchors && physicalChoreography.speechActionAnchors.length > 0
    ? physicalChoreography.speechActionAnchors
    : sceneBrainOutput.speechActionSync;

  // Step 3: Construct Dynamic Slots
  const dynamicSlots: Scene2DynamicSlots = {
    productIdentity: productContext.identity,
    productFacts: productContext.verifiedFunctionalFacts,
    productQuantity: productContext.observableQuantity ? String(productContext.observableQuantity) : undefined,
    productVisibleDetails: productContext.observableDetails,
    presenter: params.presenter,
    wardrobe: params.wardrobe,
    resolvedWardrobeContract: params.resolvedWardrobeContract,
    wardrobeConsistencyLock: params.wardrobeConsistencyLock,
    avatarIdentityContext: params.avatarIdentityContext || params.presenter.avatarIdentityContext,
    environment: sceneBrainOutput.environment,
    primaryBenefit: actionableBenefit,
    spokenCopy: copyBrainOutput.spokenCopy,
    actions: sceneBrainOutput.actions,
    speechActionSync: validatedSpeechActionSync,
    structuralDNA: productContext.structuralDNA || params.groundingResult?.structuralDNA,
    referenceCoverage: productContext.referenceCoverage || params.groundingResult?.referenceCoverage,
    motionSafety: productContext.motionSafety || params.groundingResult?.motionSafety,
    isCommercialPackConfirmed: isPack,
    kitComponentCount: kitCount,
    handledComponentCount: handledCount,
    remainingVisibleComponentCount: remainingCount,
    physicalChoreography
  };

  // Step 4: Validate Pre-Compilation Gate & Build Canonical Compiled Model
  const preCompilationValidation = validatePreCompilationSemanticGate(dynamicSlots);
  if (!preCompilationValidation.valid) {
    console.error('Pre-Compilation Semantic Gate Failed:', preCompilationValidation.errors);
  }

  // Canonical source of truth: CompiledScene2Model
  const compiledModel = buildCompiledScene2Model(dynamicSlots);

  // Derive both formats from the exact same compiledModel (Zero Semantic Drift)
  const compiledPrompt = renderScene2Text(compiledModel);
  const compiledJson = renderScene2Json(compiledModel);
  const compiledJsonString = renderScene2JsonString(compiledModel);

  const executionTimeMs = Date.now() - startTime;

  const diagnosticTrace: Scene2CompilerDiagnosticTrace = {
    timestamp: new Date().toISOString(),
    groundingResult: params.groundingResult,
    productContext,
    productFacts: productContext.verifiedFunctionalFacts,
    primaryBenefit: params.primaryBenefit,
    benefitClassification: benefitCheck.classification,
    copyBrainOutput,
    sceneBrainSlots: sceneBrainOutput,
    wardrobeContract: {
      userWardrobe: params.wardrobe,
      avatarIdentityPriorityEnforced: true,
      resolvedWardrobeContract: compiledModel.presenter.resolvedWardrobeContract,
      wardrobeConsistencyLock: compiledModel.presenter.wardrobeConsistencyLock
    },
    avatarIdentityContext: params.avatarIdentityContext || params.presenter.avatarIdentityContext,
    compiledPrompt,
    compiledJson,
    executionTimeMs,
    totalCalls: 2,
    preCompilationValidation
  };

  return {
    dynamicSlots,
    compiledModel,
    compiledPrompt,
    compiledJson,
    compiledJsonString,
    diagnosticTrace
  };
}

