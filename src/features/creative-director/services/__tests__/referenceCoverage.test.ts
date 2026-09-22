/**
 * REFERENCE COVERAGE + MOTION SAFETY TEST SUITE
 */

import {
  resolveProductReferenceCoverage,
  resolveProductMotionSafety,
  renderReferenceCoverageAndMotionSafety,
  createNormalizedProductContext,
  ProductReferenceCoverage,
  ProductMotionSafety,
  ProductStructuralDNA
} from '../productGroundingService';
import { compileScene2Prompt, buildCompiledScene2Model } from '../../compiler/promptCompiler';
import { compileScene3Prompt, buildCompiledScene3Model } from '../../compiler/scene3PromptCompiler';
import { Scene2DynamicSlots } from '../../types/compilerTypes';
import { Scene3DynamicSlots } from '../../types/scene3';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

export function runAllReferenceCoverageTests() {
  // Test A: Single front reference image -> front confirmed, other faces unknown, conservative rotation 15-30°
  {
    const details = [
      'Front panel with digital display screen',
      'Matte black finish on forward chassis',
      'White printed brand logo centered on front'
    ];
    const facts = ['Digital control panel with LED indicators', 'Standard 110V power'];

    const coverage = resolveProductReferenceCoverage({
      observableDetails: details,
      rawDetails: facts
    });
    assert(coverage.front === 'confirmed', 'Test A: front should be confirmed');
    assert(coverage.rear === 'unknown', 'Test A: rear should be unknown');
    assert(coverage.bottom === 'unknown', 'Test A: bottom should be unknown');

    const safety = resolveProductMotionSafety(coverage);
    assert((safety.maxRotationDegrees ?? 0) <= 30 && (safety.maxRotationDegrees ?? 0) >= 15, 'Test A: rotation between 15 and 30');
    assert(safety.preferredViews.length > 0, 'Test A: preferred views present');
    assert(safety.forbiddenViews.some(a => a.toLowerCase().includes('rear') || a.toLowerCase().includes('back')), 'Test A: forbidden rear angles');
  }

  // Test B: Front + partial side reference -> front confirmed, side partial, rotation 30-45°
  {
    const details = [
      'Front dial with sunray brushing',
      'Left side profile showing partial crown button and beveled case edge',
      'Stainless steel bezel'
    ];
    const facts = ['Analog quartz movement', '38mm diameter case'];

    const coverage = resolveProductReferenceCoverage({
      observableDetails: details,
      rawDetails: facts
    });
    assert(coverage.front === 'confirmed', 'Test B: front should be confirmed');
    assert(coverage.leftSide === 'partial', 'Test B: leftSide should be partial');
    assert(coverage.rear === 'unknown', 'Test B: rear should be unknown');

    const safety = resolveProductMotionSafety(coverage);
    assert((safety.maxRotationDegrees ?? 0) <= 45 && (safety.maxRotationDegrees ?? 0) >= 30, 'Test B: rotation between 30 and 45');
    assert(safety.forbiddenViews.length > 0, 'Test B: forbidden angles present');
  }

  // Test C: Camera module presence respects specific coverage constraints
  {
    const details = [
      'Front lens element with 50mm f/1.8 optical barrel',
      'Top hot shoe mount with metallic contacts',
      'Left grip texture with rubberized diamond pattern'
    ];
    const facts = ['Interchangeable lens mirrorless camera', '4K 60fps video capture'];

    const coverage = resolveProductReferenceCoverage({
      observableDetails: details,
      rawDetails: facts
    });
    assert(coverage.front === 'confirmed', 'Test C: front confirmed');
    assert(coverage.top === 'confirmed', 'Test C: top confirmed');
    assert(coverage.leftSide === 'confirmed', 'Test C: leftSide confirmed');
    assert(coverage.rear === 'unknown', 'Test C: rear unknown');

    const safety = resolveProductMotionSafety(coverage);
    assert((safety.maxRotationDegrees ?? 0) <= 90, 'Test C: maxRotationDegrees <= 90');
    assert(safety.preferredViews.length >= 1, 'Test C: preferred views >= 1');
    assert(safety.forbiddenViews.some(a => a.toLowerCase().includes('rear') || a.toLowerCase().includes('back')), 'Test C: forbidden rear');
  }

  // Test D: resolveProductMotionSafety calculations are strictly bounded
  {
    // Scenario 1: Only 1 face confirmed
    const singleCoverage: ProductReferenceCoverage = {
      front: 'confirmed',
      rear: 'unknown',
      leftSide: 'unknown',
      rightSide: 'unknown',
      top: 'unknown',
      bottom: 'unknown',
      confidence: 0.9
    };
    const safety1 = resolveProductMotionSafety(singleCoverage);
    assert(safety1.maxRotationDegrees === 30, 'Test D1: 30 deg');

    // Scenario 2: 1 face confirmed + 1 face partial
    const partialSideCoverage: ProductReferenceCoverage = {
      front: 'confirmed',
      rear: 'unknown',
      leftSide: 'partial',
      rightSide: 'unknown',
      top: 'unknown',
      bottom: 'unknown',
      confidence: 0.85
    };
    const safety2 = resolveProductMotionSafety(partialSideCoverage);
    assert(safety2.maxRotationDegrees === 45, 'Test D2: 45 deg');

    // Scenario 3: 2 faces confirmed (e.g. front + top)
    const multiFaceCoverage: ProductReferenceCoverage = {
      front: 'confirmed',
      rear: 'unknown',
      leftSide: 'unknown',
      rightSide: 'unknown',
      top: 'confirmed',
      bottom: 'unknown',
      confidence: 0.95
    };
    const safety3 = resolveProductMotionSafety(multiFaceCoverage);
    assert(safety3.maxRotationDegrees === 30, 'Test D3: 30 deg');

    // Scenario 4: All unknown
    const unknownCoverage: ProductReferenceCoverage = {
      front: 'unknown',
      rear: 'unknown',
      leftSide: 'unknown',
      rightSide: 'unknown',
      top: 'unknown',
      bottom: 'unknown',
      confidence: 0.2
    };
    const safety4 = resolveProductMotionSafety(unknownCoverage);
    assert(safety4.maxRotationDegrees === 15, 'Test D4: 15 deg');
  }

  // Test E: renderReferenceCoverageAndMotionSafety outputs prompt block with Same Object Continuity
  {
    const coverage: ProductReferenceCoverage = {
      front: 'confirmed',
      rear: 'unknown',
      leftSide: 'partial',
      rightSide: 'unknown',
      top: 'unknown',
      bottom: 'unknown'
    };
    const safety = resolveProductMotionSafety(coverage);

    const rendered = renderReferenceCoverageAndMotionSafety(coverage, safety);
    assert(rendered.includes('REFERENCE COVERAGE & MOTION SAFETY'), 'Test E: header');
    assert(rendered.includes('maximum rotation approximately 45°'), 'Test E: 45 rotation');
    assert(rendered.includes('Confirmed views:'), 'Test E: confirmed views');
    assert(rendered.includes('Unknown views:'), 'Test E: unknown views');
    assert(rendered.includes('Camera movement and hand movement may change perspective'), 'Test E: continuity');
  }

  // Test F: createNormalizedProductContext automatically attaches coverage and motion safety
  {
    const context = createNormalizedProductContext(
      {
        product_identity: 'Pro Blender 3000',
        category: 'Kitchen Appliances',
        observable_details: ['Clear glass pitcher with measurement marks', 'Front chrome control dial'],
        verified_functional_facts: ['1200W motor', 'Pulse mode function']
      },
      ['1200W motor', 'Pulse mode function']
    );

    assert(Boolean(context.referenceCoverage), 'Test F: referenceCoverage exists');
    assert(context.referenceCoverage?.front === 'confirmed', 'Test F: front confirmed');
    assert(Boolean(context.motionSafety), 'Test F: motionSafety exists');
    assert((context.motionSafety?.maxRotationDegrees ?? 0) <= 45, 'Test F: rotation <= 45');
  }

  // Test G: Scene 2 Prompt Compiler renders coverage and motion safety without drift
  {
    const coverage: ProductReferenceCoverage = {
      front: 'confirmed',
      rear: 'unknown',
      leftSide: 'partial',
      rightSide: 'unknown',
      top: 'unknown',
      bottom: 'unknown'
    };
    const safety = resolveProductMotionSafety(coverage);

    const slots: Scene2DynamicSlots = {
      productIdentity: 'Smart Termo Garrafa 500ml',
      productFacts: ['Aço inoxidável 316', 'Mantém temperatura por 12 horas'],
      productVisibleDetails: ['Tampa com display digital frontal', 'Acabamento preto fosco'],
      presenter: {
        gender: 'female',
        description: 'Authentic 28-year-old Brazilian woman'
      },
      wardrobe: {
        topType: 'camiseta',
        topColor: 'branca',
        bottomType: 'calça jeans',
        bottomColor: 'azul',
        footwearType: 'tênis',
        footwearColor: 'branco'
      },
      environment: 'cozinha residencial moderna com luz natural',
      primaryBenefit: 'Mantém água gelada o dia inteiro',
      spokenCopy: 'Gente, essa garrafa segura gelado o dia todinho!',
      actions: {
        action0to2: 'Apresentadora segura a garrafa mostrando o visor frontal.',
        action2to4: 'Mostra o acabamento térmico enquanto fala com entusiasmo.',
        action4to6: 'Dá um gole refrescante e sorri para a câmera.',
        action6to8: 'Segura a garrafa na altura do peito com aceno positivo.'
      },
      speechActionSync: [
        { phrase: 'essa garrafa segura gelado', action: 'Segura a garrafa mostrando o visor frontal.' }
      ],
      referenceCoverage: coverage,
      motionSafety: safety
    };

    const model = buildCompiledScene2Model(slots);
    assert(Boolean(model.product.referenceCoverage), 'Test G: model coverage');
    assert(Boolean(model.product.motionSafety), 'Test G: model safety');

    const promptText = compileScene2Prompt(slots);
    assert(promptText.includes('REFERENCE COVERAGE & MOTION SAFETY'), 'Test G: rendered prompt');
    assert(promptText.includes('maximum rotation approximately 45°'), 'Test G: prompt rotation');
    assert(promptText.includes('Camera movement and hand movement may change perspective'), 'Test G: prompt continuity');
  }

  // Test H: Scene 3 Prompt Compiler embeds referenceCoverage and motionSafety deterministically
  {
    const coverage: ProductReferenceCoverage = {
      front: 'confirmed',
      rear: 'unknown',
      leftSide: 'unknown',
      rightSide: 'unknown',
      top: 'unknown',
      bottom: 'unknown'
    };
    const safety = resolveProductMotionSafety(coverage);

    const slots: Scene3DynamicSlots = {
      presenter: {
        identity: 'Brazilian creator Lucas',
        gender: 'male'
      },
      wardrobe: {
        description: 'Camisa polo azul marinho e calça chino bege',
        topType: 'polo',
        topColor: 'azul marinho',
        bottomType: 'calça chino',
        bottomColor: 'bege'
      },
      product: {
        identity: 'Cafeteira Expressa Manual',
        visibleDetails: ['Bico vaporizador em inox', 'Manômetro frontal analógico'],
        knownPhysicalFacts: ['Pressão 15 bar', 'Bandeja coletora removível'],
        referenceCoverage: coverage,
        motionSafety: safety
      },
      environment: 'cozinha residencial moderna',
      spokenCta: 'Garanta a sua agora no link da bio com frete grátis!',
      actions: {
        action0to2: 'Lucas posiciona a cafeteira no balcão e olha para a lente.',
        action2to4: 'Toca suavemente o manômetro frontal destacando a precisão.',
        action4to6: 'Aproxima a xícara do bico vaporizador com expressão confiante.',
        action6to8: 'Aponta cordialmente para a frente com aceno afirmativo.'
      },
      ctaGesture: 'Gesto convidativo com mão aberta apontando para o link.',
      speechActionSync: [
        { spokenSegment: 'Garanta a sua agora', physicalAction: 'Aponta cordialmente para a frente.' }
      ],
      productSpecificNegatives: ['NO distorted pressure gauge']
    };

    const model = buildCompiledScene3Model(slots);
    assert(Boolean(model.productContract.referenceCoverage), 'Test H: model coverage');
    assert(Boolean(model.productContract.motionSafety), 'Test H: model safety');

    const promptText = compileScene3Prompt(slots);
    assert(promptText.includes('REFERENCE COVERAGE & MOTION SAFETY'), 'Test H: rendered prompt');
    assert(promptText.includes('maximum rotation approximately 30°'), 'Test H: prompt rotation');
    assert(promptText.includes('Camera movement and hand movement may change perspective'), 'Test H: prompt continuity');
  }

  // Test I: Zero regression on structural DNA, category modules, and identity lock
  {
    const context = createNormalizedProductContext(
      {
        product_identity: 'Lens Pro Cup',
        category: 'Drinkware / Novelty',
        observable_details: ['Front lens replica element', 'Rubberized focus ring texture'],
        verified_functional_facts: ['Insulated travel mug', '400ml volume']
      },
      ['Insulated travel mug', '400ml volume']
    );

    assert(Boolean(context.structuralDNA), 'Test I: structuralDNA exists');
    assert(Boolean(context.referenceCoverage), 'Test I: referenceCoverage exists');
    assert(Boolean(context.motionSafety), 'Test I: motionSafety exists');
  }

  return true;
}
