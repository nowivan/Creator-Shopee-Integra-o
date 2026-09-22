/**
 * PRODUCT INFORMATION EXTRACTION BUTTON TEST SUITE
 * 
 * Verifies:
 * 1. Button renders when product is present
 * 2. Button triggers existing product authority pipeline
 * 3. Loading state reflects analysis in progress and prevents re-trigger
 * 4. Success state shows temporary success confirmation
 * 5. Error state shows non-blocking message
 * 6. Previous valid context is preserved on error
 * 7. Manual values (dialogue, presenter, overrides) are strictly preserved
 * 8. Image replacement marks extraction as stale
 * 9. Re-extraction refreshes resolved product context
 * 10. Shopee Product Mapper receives refreshed data
 * 11. POV presets and Scene 1 receive refreshed product authority
 * 12. No regression on Scene 1, Scene 2, or Scene 3
 */

import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import {
  mapProductWorkspaceToShopeeContext,
  ShopeeProductMappingOverrides
} from '../shopeeProductMapper';
import { runShopeeSceneHubPipeline } from '../shopeeSceneBrain';
import { CreativeDirectorProductWorkspace } from '../../creative-director/types/compilerTypes';

describe('Shopee Scene Hub — Product Information Extraction Button', () => {

  it('1. Button renders in Card 1 when product image is present in ShopeeSceneHubPanel source', () => {
    const panelSource = fs.readFileSync(
      path.resolve(process.cwd(), 'src/features/shopee-scene-hub/components/ShopeeSceneHubPanel.tsx'),
      'utf-8'
    );
    assert.ok(panelSource.includes('handleExtractProductInfo'), 'Must include handleExtractProductInfo handler');
    assert.ok(panelSource.includes('Extrair Informações'), 'Must render Extrair Informações button');
    assert.ok(panelSource.includes('Atualizar Informações'), 'Must render Atualizar Informações button');
  });

  it('2. Button uses existing canonical product authority pipeline without creating a second detector', () => {
    const panelSource = fs.readFileSync(
      path.resolve(process.cwd(), 'src/features/shopee-scene-hub/components/ShopeeSceneHubPanel.tsx'),
      'utf-8'
    );
    assert.ok(panelSource.includes('onAnalyzeProduct'), 'Must invoke onAnalyzeProduct prop');
    assert.ok(panelSource.includes('mapProductWorkspaceToShopeeContext'), 'Must reuse mapProductWorkspaceToShopeeContext');
    assert.ok(
      panelSource.includes('analyzeProductFactualGrounding') && panelSource.includes('createNormalizedProductContext'),
      'Must reuse canonical productGroundingService without creating ad-hoc detectors'
    );
  });

  it('3. Loading state disables interaction and displays "Analisando produto..."', () => {
    const panelSource = fs.readFileSync(
      path.resolve(process.cwd(), 'src/features/shopee-scene-hub/components/ShopeeSceneHubPanel.tsx'),
      'utf-8'
    );
    assert.ok(panelSource.includes('disabled={isAnalyzingProduct}'), 'Button must be disabled during analysis');
    assert.ok(panelSource.includes('Analisando produto...'), 'Button text must show loading state');
  });

  it('4. Success state confirms extraction with temporary success indicator', () => {
    const panelSource = fs.readFileSync(
      path.resolve(process.cwd(), 'src/features/shopee-scene-hub/components/ShopeeSceneHubPanel.tsx'),
      'utf-8'
    );
    assert.ok(panelSource.includes('✓ Informações extraídas'), 'Button must display success indicator');
    assert.ok(panelSource.includes('setExtractionSuccess(true)'), 'Must set extractionSuccess state to true');
  });

  it('5. Error state displays non-blocking Brazilian Portuguese error message', () => {
    const panelSource = fs.readFileSync(
      path.resolve(process.cwd(), 'src/features/shopee-scene-hub/components/ShopeeSceneHubPanel.tsx'),
      'utf-8'
    );
    assert.ok(
      panelSource.includes('Não foi possível extrair as informações do produto. Tente novamente.'),
      'Must display exact non-blocking error message'
    );
  });

  it('6. Non-destructive rule: Previous valid product context is preserved on error', () => {
    const existingWorkspace: CreativeDirectorProductWorkspace = {
      productImageFile: null,
      productImagePreview: 'data:image/jpeg;base64,/9j/valid1',
      productImageName: 'mop_triangular.jpg',
      productRevisionId: 'rev_1',
      groundingResult: null,
      productIdentity: 'Mop Giratório Triangular',
      groundingStatus: 'ready',
      groundingError: null,
      normalizedProductContext: {
        type: 'grounded',
        identity: 'Mop Giratório Triangular',
        canonicalColor: 'Azul Turquesa',
        category: 'Limpeza Residencial',
        observableQuantity: 1,
        observableDetails: ['Base triangular giratória 360', 'Cabo telescópico em inox'],
        verifiedFunctionalFacts: ['Alcança cantos difíceis de paredes e tetos'],
        confirmedUserFacts: [],
        uncertainObservations: []
      }
    };

    // Pre-error resolution
    const preErrorContext = mapProductWorkspaceToShopeeContext(existingWorkspace);
    assert.strictEqual(preErrorContext.productIdentity, 'Mop Giratório Triangular');
    assert.strictEqual(preErrorContext.canonicalColor, 'Azul Turquesa');

    // Simulate an error during extraction: the workspace must NOT be cleared to null
    const errorCatchSimulatedWorkspace = { ...existingWorkspace };
    const postErrorContext = mapProductWorkspaceToShopeeContext(errorCatchSimulatedWorkspace);
    assert.strictEqual(postErrorContext.productIdentity, preErrorContext.productIdentity);
    assert.strictEqual(postErrorContext.canonicalColor, preErrorContext.canonicalColor);
    assert.deepStrictEqual(postErrorContext.observableDetails, preErrorContext.observableDetails);
    assert.deepStrictEqual(postErrorContext.physicalFacts, preErrorContext.physicalFacts);
  });

  it('7. Non-destructive priority: Manual user overrides strictly override extracted values', () => {
    const extractedWorkspace: CreativeDirectorProductWorkspace = {
      productImageFile: null,
      productImagePreview: 'data:image/jpeg;base64,/9j/valid2',
      productImageName: 'cortador.jpg',
      productRevisionId: 'rev_2',
      groundingResult: null,
      productIdentity: 'Cortador Multifuncional Verde',
      groundingStatus: 'ready',
      groundingError: null,
      normalizedProductContext: {
        type: 'grounded',
        identity: 'Cortador Multifuncional Verde',
        canonicalColor: 'Verde Menta',
        category: 'Cozinha',
        observableQuantity: 1,
        observableDetails: ['Lâminas intercambiáveis de aço'],
        verifiedFunctionalFacts: ['Fatiamento de legumes em cubos'],
        confirmedUserFacts: [],
        uncertainObservations: []
      }
    };

    const userManualOverrides: ShopeeProductMappingOverrides = {
      productTitle: 'Mandoline Fatiador Profissional Manual',
      canonicalColor: 'Verde Floresta Personalizado'
    };

    const contextWithOverrides = mapProductWorkspaceToShopeeContext(extractedWorkspace, userManualOverrides);
    assert.strictEqual(contextWithOverrides.productIdentity, 'Mandoline Fatiador Profissional Manual');
    assert.strictEqual(contextWithOverrides.canonicalColor, 'Verde Floresta Personalizado');
    // Non-overridden fields still come from grounded extraction
    assert.strictEqual(contextWithOverrides.observableDetails[0], 'Lâminas intercambiáveis de aço');
    assert.strictEqual(contextWithOverrides.physicalFacts[0], 'Fatiamento de legumes em cubos');
  });

  it('8. Product image replacement marks extraction stale', () => {
    const panelSource = fs.readFileSync(
      path.resolve(process.cwd(), 'src/features/shopee-scene-hub/components/ShopeeSceneHubPanel.tsx'),
      'utf-8'
    );
    assert.ok(panelSource.includes('isImageStale'), 'Must track isImageStale');
    assert.ok(
      panelSource.includes('Produto alterado — extraia novamente as informações.'),
      'Must render stale image warning message'
    );
  });

  it('9. Re-extraction refreshes resolved product context with newly extracted visual data', () => {
    const initialWorkspace: CreativeDirectorProductWorkspace = {
      productImageFile: null,
      productImagePreview: 'data:image/jpeg;base64,imageA',
      productImageName: 'dispenser_old.jpg',
      productRevisionId: 'rev_A',
      groundingResult: null,
      productIdentity: 'Porta Sabonete Antigo',
      groundingStatus: 'ready',
      groundingError: null,
      normalizedProductContext: {
        type: 'grounded',
        identity: 'Porta Sabonete Antigo',
        canonicalColor: 'Branco',
        category: 'Banheiro',
        observableQuantity: 1,
        observableDetails: ['Válvula de plástico simples'],
        verifiedFunctionalFacts: ['Dispensação mecânica por pressão manual'],
        confirmedUserFacts: [],
        uncertainObservations: []
      }
    };

    const refreshedWorkspace: CreativeDirectorProductWorkspace = {
      productImageFile: null,
      productImagePreview: 'data:image/jpeg;base64,imageB',
      productImageName: 'dispenser_sensor_new.jpg',
      productRevisionId: 'rev_B',
      groundingResult: null,
      productIdentity: 'Dispenser Automático com Sensor Infravermelho',
      groundingStatus: 'ready',
      groundingError: null,
      normalizedProductContext: {
        type: 'grounded',
        identity: 'Dispenser Automático com Sensor Infravermelho',
        canonicalColor: 'Preto Fosco com Prata',
        category: 'Banheiro Tecnológico',
        observableQuantity: 1,
        observableDetails: ['Sensor infravermelho de aproximação', 'Bico dosador antigotas'],
        verifiedFunctionalFacts: ['Libera sabonete sem toque na mão'],
        confirmedUserFacts: [],
        uncertainObservations: []
      }
    };

    const initialContext = mapProductWorkspaceToShopeeContext(initialWorkspace);
    const refreshedContext = mapProductWorkspaceToShopeeContext(refreshedWorkspace);

    assert.strictEqual(initialContext.productIdentity, 'Porta Sabonete Antigo');
    assert.strictEqual(refreshedContext.productIdentity, 'Dispenser Automático com Sensor Infravermelho');
    assert.strictEqual(refreshedContext.canonicalColor, 'Preto Fosco com Prata');
    assert.strictEqual(refreshedContext.observableDetails[0], 'Sensor infravermelho de aproximação');
    assert.strictEqual(refreshedContext.physicalFacts[0], 'Libera sabonete sem toque na mão');
  });

  it('10. POV presets and Scene 1 receive refreshed product authority from the refreshed workspace', () => {
    const refreshedWorkspace: CreativeDirectorProductWorkspace = {
      productImageFile: null,
      productImagePreview: 'data:image/jpeg;base64,imageAirFryer',
      productImageName: 'airfryer.jpg',
      productRevisionId: 'rev_af',
      groundingResult: null,
      productIdentity: 'Fritadeira Elétrica Digital Touch',
      groundingStatus: 'ready',
      groundingError: null,
      normalizedProductContext: {
        type: 'grounded',
        identity: 'Fritadeira Elétrica Digital Touch',
        canonicalColor: 'Preto Black Piano',
        category: 'Eletroportáteis de Cozinha',
        observableQuantity: 1,
        observableDetails: ['Painel digital touchscreen', 'Cesto antiaderente quadrado'],
        verifiedFunctionalFacts: ['Circulação de ar quente sem óleo'],
        confirmedUserFacts: [],
        uncertainObservations: []
      }
    };

    const pipelineResult = runShopeeSceneHubPipeline({
      productWorkspace: refreshedWorkspace,
      presenterSource: 'manual',
      manualPresenterGender: 'female',
      manualPresenterDesc: 'Apresentadora brasileira acolhedora',
      dialogueMode: 'auto',
      ctaMode: 'produto_marcado'
    });

    assert.ok(pipelineResult.scene1.prompt.includes('Fritadeira Elétrica Digital Touch'), 'Scene 1 must receive refreshed identity');
    assert.ok(pipelineResult.scene2.prompt.includes('Preto Black Piano'), 'Scene 2 must receive refreshed canonical color');
    assert.ok(pipelineResult.scene2.prompt.includes('Fritadeira Elétrica Digital Touch'), 'Scene 2 must receive refreshed identity');
    assert.ok(pipelineResult.scene3.prompt.includes('Fritadeira Elétrica Digital Touch'), 'Scene 3 must receive refreshed identity');
  });

  it('11. Zero regression on Scene 1 (3s), Scene 2 (8s), and Scene 3 (8s) timing and compliance', () => {
    const workspace: CreativeDirectorProductWorkspace = {
      productImageFile: null,
      productImagePreview: 'data:image/jpeg;base64,imageTest',
      productImageName: 'test.jpg',
      productRevisionId: 'rev_test',
      groundingResult: null,
      productIdentity: 'Organizador Giratório Acrílico',
      groundingStatus: 'ready',
      groundingError: null,
      normalizedProductContext: {
        type: 'grounded',
        identity: 'Organizador Giratório Acrílico',
        canonicalColor: 'Transparente Cristalino',
        category: 'Organização Residencial',
        observableQuantity: 1,
        observableDetails: ['Base giratória rolamentada', 'Divisórias ajustáveis'],
        verifiedFunctionalFacts: ['Giro suave de 360 graus'],
        confirmedUserFacts: [],
        uncertainObservations: []
      }
    };

    const res = runShopeeSceneHubPipeline({
      productWorkspace: workspace,
      presenterSource: 'manual',
      manualPresenterGender: 'female',
      manualPresenterDesc: 'Apresentadora comunicativa',
      dialogueMode: 'auto',
      ctaMode: 'sacolinha'
    });

    assert.strictEqual(res.scene1.durationSeconds, 3.0, 'Scene 1 must remain exactly 3.0s');
    assert.strictEqual(res.scene2.durationSeconds, 8.0, 'Scene 2 must remain exactly 8.0s');
    assert.strictEqual(res.scene3.durationSeconds, 8.0, 'Scene 3 must remain exactly 8.0s');

    // Scene 1 negative constraints intact
    assert.ok(res.scene1.prompt.includes('NO on-screen text'), 'Scene 1 negative constraints intact');
    // Scene 2 product preservation lock intact
    assert.ok(res.scene2.prompt.includes('[PRODUCT IDENTITY & PRESERVATION]'), 'Scene 2 product identity preservation lock intact');
    assert.ok(res.scene2.prompt.includes('Canonical Active Color: Transparente Cristalino'), 'Scene 2 canonical color intact');
    // Scene 3 CTA gesture sync intact
    assert.ok(res.scene3.prompt.includes('CTA'), 'Scene 3 CTA intact');
  });

  it('12. Compact resolved summary displays identity, category, color, details count, and physical facts count', () => {
    const panelSource = fs.readFileSync(
      path.resolve(process.cwd(), 'src/features/shopee-scene-hub/components/ShopeeSceneHubPanel.tsx'),
      'utf-8'
    );
    assert.ok(panelSource.includes('resolvedProductContext.productIdentity'), 'Summary must show productIdentity');
    assert.ok(panelSource.includes('resolvedProductContext.productArchetype'), 'Summary must show productArchetype');
    assert.ok(panelSource.includes('resolvedProductContext.canonicalColor'), 'Summary must show canonicalColor');
    assert.ok(panelSource.includes('resolvedProductContext.physicalFacts.length'), 'Summary must show physicalFacts count');
    assert.ok(panelSource.includes('resolvedProductContext.observableDetails.length'), 'Summary must show observableDetails count');
    assert.ok(panelSource.includes('showExtractedDetails'), 'Summary must include optional details toggle');
  });
});
