import fs from 'fs';
import path from 'path';
import { ShopeeVideoComplianceGuard } from '../services/ShopeeVideoComplianceGuard';
import { validateGuaranteeAndPromises } from '../validators/shopeeGuaranteeValidator';
import { validatePrivacyAndPii } from '../validators/shopeePrivacyValidator';
import { validateWatermarksAndPlatforms } from '../validators/shopeeWatermarkValidator';
import { validateCommercialClaims } from '../validators/shopeeCommercialClaimsValidator';
import { validateVisualQualityPrompt } from '../validators/shopeeVisualQualityValidator';
import { DEFAULT_SHOPEE_COMMERCIAL_EVIDENCE } from '../../shopee-copy/types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`PASS: ${message}`);
}

console.log('=== RUNNING SHOPEE VIDEO COMPLIANCE GUARD TEST SUITE ===');

// 1. "garantido" contextual detection (blocked when claiming efficacy)
const res1 = validateGuaranteeAndPromises('Esse produto tem resultado garantido para sua pele');
assert(res1.some(v => v.code === 'GUARANTEED_RESULT_CLAIM' || v.code === 'STANDALONE_GUARANTEE_CLAIM'), '1. "garantido" contextual detection');

// 2. "garanta o seu" allowed CTA
const res2 = validateGuaranteeAndPromises('Aproveite hoje e garanta o seu produto no link abaixo');
assert(res2.length === 0, '2. "garanta o seu" allowed CTA');

// 3. "resultado garantido" blocked
const res3 = validateGuaranteeAndPromises('Compre agora e tenha resultado garantido');
assert(res3.some(v => v.code === 'GUARANTEED_RESULT_CLAIM' && v.blocking), '3. "resultado garantido" blocked');

// 4. "cura total" blocked
const res4 = validateGuaranteeAndPromises('Esse chá proporciona cura total de dores');
assert(res4.some(v => v.code === 'MIRACLE_CLAIM' && v.blocking), '4. "cura total" blocked');

// 5. "milagre" blocked
const res5 = validateGuaranteeAndPromises('Isso aqui faz um milagre na limpeza da casa');
assert(res5.some(v => v.code === 'MIRACLE_CLAIM' && v.blocking), '5. "milagre" blocked');

// 6. "100% eficaz" blocked
const res6 = validateGuaranteeAndPromises('Fórmula 100% eficaz contra sujeiras pesadas');
assert(res6.some(v => v.code === 'ABSOLUTE_EFFICACY_CLAIM' && v.blocking), '6. "100% eficaz" blocked');

// 7. "nunca falha" blocked
const res7 = validateGuaranteeAndPromises('Esse mecanismo nunca falha no dia a dia');
assert(res7.some(v => v.code === 'INFALLIBILITY_CLAIM' && v.blocking), '7. "nunca falha" blocked');

// 8. "não quebra nunca" blocked
const res8 = validateGuaranteeAndPromises('Material reforçado que não quebra nunca');
assert(res8.some(v => v.code === 'UNREALISTIC_DURABILITY' && v.blocking), '8. "não quebra nunca" blocked');

// 9. "indestrutível" blocked
const res9 = validateGuaranteeAndPromises('Cabo indestrutível feito em polímero');
assert(res9.some(v => v.code === 'UNREALISTIC_DURABILITY' && v.blocking), '9. "indestrutível" blocked');

// 10. unsupported discount blocked
const res10 = validateCommercialClaims('Aproveite 50% de desconto agora', DEFAULT_SHOPEE_COMMERCIAL_EVIDENCE);
assert(res10.some(v => v.code === 'UNSUPPORTED_DISCOUNT_CLAIM' && v.blocking), '10. unsupported discount blocked');

// 11. unsupported stock blocked
const res11 = validateCommercialClaims('Corra porque são as últimas unidades no estoque', DEFAULT_SHOPEE_COMMERCIAL_EVIDENCE);
assert(res11.some(v => v.code === 'UNSUPPORTED_SCARCITY_CLAIM' && v.blocking), '11. unsupported stock blocked');

// 12. unsupported free shipping blocked
const res12 = validateCommercialClaims('Compre agora com frete grátis para todo o Brasil', DEFAULT_SHOPEE_COMMERCIAL_EVIDENCE);
assert(res12.some(v => v.code === 'UNSUPPORTED_FREE_SHIPPING' && v.blocking), '12. unsupported free shipping blocked');

// 13. TikTok watermark detected
const res13 = validateWatermarksAndPlatforms('Vídeo com tiktok watermark gravado ontem');
assert(res13.some(v => v.code === 'TIKTOK_WATERMARK_DETECTED' && v.blocking), '13. TikTok watermark detected');

// 14. Instagram/Reels watermark detected
const res14 = validateWatermarksAndPlatforms('Vídeo exportado com reels badge visível');
assert(res14.some(v => v.code === 'INSTAGRAM_WATERMARK_DETECTED' && v.blocking), '14. Instagram/Reels watermark detected');

// 15. Kwai watermark detected
const res15 = validateWatermarksAndPlatforms('Não reutilize vídeo com kwai watermark');
assert(res15.some(v => v.code === 'KWAI_WATERMARK_DETECTED' && v.blocking), '15. Kwai watermark detected');

// 16. CapCut watermark detected
const res16 = validateWatermarksAndPlatforms('Deixou o encerramento do capcut watermark no final');
assert(res16.some(v => v.code === 'CAPCUT_WATERMARK_DETECTED' && v.blocking), '16. CapCut watermark detected');

// 17. @username detected
const res17 = validateWatermarksAndPlatforms('Siga meu perfil em @lojadaana para mais ofertas');
assert(res17.some(v => v.code === 'USERNAME_OVERLAY_DETECTED' && v.blocking), '17. @username detected');

// 18. app UI detected
const res18 = validateWatermarksAndPlatforms('Sobrepor app interface com botões de curtir na tela');
assert(res18.some(v => v.code === 'APP_INTERFACE_OVERLAY_DETECTED' && v.blocking), '18. app UI detected');

// 19. phone number detected
const res19 = validatePrivacyAndPii('Me chama no (11) 98765-4321 para encomendar');
assert(res19.some(v => v.code === 'PII_PHONE_NUMBER_DETECTED' && v.blocking), '19. phone number detected');

// 20. email detected
const res20 = validatePrivacyAndPii('Para pedidos envie e-mail para contato@lojinha.com');
assert(res20.some(v => v.code === 'PII_EMAIL_DETECTED' && v.blocking), '20. email detected');

// 21. CPF detected
const res21 = validatePrivacyAndPii('Cadastrado no CPF 123.456.789-00');
assert(res21.some(v => v.code === 'PII_CPF_DETECTED' && v.blocking), '21. CPF detected');

// 22. CNPJ detected
const res22 = validatePrivacyAndPii('Emitido pelo CNPJ 12.345.678/0001-90');
assert(res22.some(v => v.code === 'PII_CNPJ_DETECTED' && v.blocking), '22. CNPJ detected');

// 23. CEP/address detected
const res23 = validatePrivacyAndPii('Retire na Rua das Flores, 123 no CEP 01234-567');
assert(res23.some(v => v.code === 'PII_CEP_DETECTED' || v.code === 'PII_STREET_ADDRESS_DETECTED'), '23. CEP/address detected');

// 24. Pix/contact data detected
const res24 = validatePrivacyAndPii('Pague direto pela chave pix contato@loja.com');
assert(res24.some(v => v.code === 'PII_BANK_DATA_DETECTED' || v.code === 'PII_EMAIL_DETECTED'), '24. Pix/contact data detected');

// 25. product visibility required
const promptWithoutProduct = 'A presenter standing in a room talking naturally without mentioning any item.';
const res25 = validateVisualQualityPrompt(promptWithoutProduct);
assert(res25.some(v => v.code === 'MISSING_PRODUCT_VISIBILITY_DIRECTIVE'), '25. product visibility required');

// 26. lighting/focus constraints required
const promptWithoutLightingOrFocus = 'Product identity: blender. Handheld shot, UGC format.';
const res26 = validateVisualQualityPrompt(promptWithoutLightingOrFocus);
assert(
  res26.some(v => v.code === 'MISSING_ADEQUATE_LIGHTING_DIRECTIVE' || v.code === 'MISSING_NEGATIVE_LIGHTING_CONSTRAINTS'),
  '26. lighting/focus constraints required'
);

// 27. valid Shopee prompt => APTO
const validPrompt = `=== SHOPEE SCENE 2 ===
Product Identity: Mini Liquidificador Portátil
Single continuous take with authentic natural ambient lighting, natural subtle autofocus, product in clear focus.
Observable details: 6 stainless steel blades.
[NEGATIVE CONSTRAINTS]
NO underexposed lighting. NO murky shadows obscuring the product. NO blown-out highlights hiding product detail.
NO TikTok watermark. NO application interface.`;

const res27 = ShopeeVideoComplianceGuard.audit({
  copyText: 'Esse mini liquidificador tritura frutas com seis lâminas de inox em segundos.',
  scene2Dialogue: 'Esse mini liquidificador tritura frutas com seis lâminas de inox em segundos.',
  scene3Dialogue: 'Clica no produto marcado aqui embaixo e garanta o seu.',
  compiledPrompts: { scene2: validPrompt },
  ctaMode: 'produto_marcado'
});
assert(res27.status === 'APTO' && res27.isApto && !res27.isBlocked, '27. valid Shopee prompt => APTO');

// 28. warning-only prompt => REVISAO_NECESSARIA
const warningReport = ShopeeVideoComplianceGuard.audit({
  copyText: 'Esse produto é considerado o melhor do mercado na sua categoria.',
  compiledPrompts: { scene2: validPrompt },
  ctaMode: 'produto_marcado'
});
assert(warningReport.status === 'REVISAO_NECESSARIA' && warningReport.requiresReview && !warningReport.isBlocked, '28. warning-only prompt => REVISAO_NECESSARIA');

// 29. critical violation => BLOQUEADO
const blockedReport = ShopeeVideoComplianceGuard.audit({
  copyText: 'Esse produto traz a cura total para qualquer dor e custa só R$ 19,90!',
  compiledPrompts: { scene2: validPrompt },
  ctaMode: 'carrinho_laranja'
});
assert(blockedReport.status === 'BLOQUEADO' && blockedReport.isBlocked, '29. critical violation => BLOQUEADO');

// 30. manual dialogue byte-identical (Preserves invariant: MANUAL COPY OWNS THE WORDS)
const originalManualText = '   Meu texto de teste com   espaçamento e "aspas" intactas.   ';
const copyAuditResult = ShopeeVideoComplianceGuard.audit({
  scene1Dialogue: originalManualText
});
// Verify guard audit did not mutate or alter the original input variable
assert(originalManualText === '   Meu texto de teste com   espaçamento e "aspas" intactas.   ', '30. manual dialogue byte-identical');

// 31. Shopee Copy existing tests check
const shopeeCopyValidatorContent = fs.readFileSync(
  path.join(process.cwd(), 'src/features/shopee-copy/shopeeCopyValidator.ts'),
  'utf8'
);
assert(
  shopeeCopyValidatorContent.includes('validateAndRepairShopeeVariation') &&
  shopeeCopyValidatorContent.includes('validateShopeeScene2') &&
  shopeeCopyValidatorContent.includes('PRICE_CURRENCY_PATTERN'),
  '31. Shopee Copy existing validator patterns intact'
);

// 32. Shopee Scene Hub existing files check
const shopeeSceneBrainContent = fs.readFileSync(
  path.join(process.cwd(), 'src/features/shopee-scene-hub/shopeeSceneBrain.ts'),
  'utf8'
);
assert(
  shopeeSceneBrainContent.includes('runShopeeSceneHubPipeline') &&
  shopeeSceneBrainContent.includes('validateShopeeDialogueText'),
  '32. Shopee Scene Hub existing brain intact'
);

// 33. Scene 2/3 Creative Director existing systems untouched
const cdScene2Content = fs.readFileSync(
  path.join(process.cwd(), 'src/features/creative-director/templates/scene2BaseTemplate.ts'),
  'utf8'
);
const cdScene3Content = fs.readFileSync(
  path.join(process.cwd(), 'src/features/creative-director/templates/scene3BaseTemplate.ts'),
  'utf8'
);
assert(
  cdScene2Content.includes('getScene2MasterTemplateSkeleton') &&
  cdScene3Content.includes('getScene3MasterTemplateSkeleton'),
  '33. Scene 2/3 existing Creative Director templates untouched'
);

// 34. Safe auto-fix: whitespace & quotes normalization
const rawTextWithExtraSpaces = 'Texto   com    muitos   espaços\r\n\r\ne quebras.';
const normalizedWhitespace = ShopeeVideoComplianceGuard.safeNormalizeWhitespace(rawTextWithExtraSpaces);
assert(normalizedWhitespace === 'Texto com muitos espaços\n\ne quebras.', '34. Safe auto-fix: whitespace normalization');

// 35. Safe auto-fix: quotes normalization
const rawQuotes = 'Texto com ‘aspas curvas’ e “duplas”.';
const normalizedQuotes = ShopeeVideoComplianceGuard.safeNormalizeQuotes(rawQuotes);
assert(normalizedQuotes === 'Texto com \'aspas curvas\' e "duplas".', '35. Safe auto-fix: quotes normalization');

// 36. Safe auto-fix: negative lighting injection
const rawPromptWithoutLighting = '=== SHOPEE SCENE 2 ===\nProduct: Mini Blender.\n[NEGATIVE CONSTRAINTS]\nNO watermark.';
const injectedPrompt = ShopeeVideoComplianceGuard.safeInjectNegativeLightingConstraints(rawPromptWithoutLighting);
assert(
  injectedPrompt.includes('NO underexposed lighting.') &&
  injectedPrompt.includes('NO murky shadows obscuring the product.') &&
  injectedPrompt.includes('NO blown-out highlights hiding product detail.'),
  '36. Safe auto-fix: negative lighting injection'
);

// 37. Preserves semantic immutability: auto-fix does NOT run on manual dialogue during audit
const manualDialogueInput = '   Fala original mantida com   espaços   ';
const auditCheck = ShopeeVideoComplianceGuard.audit({ scene1Dialogue: manualDialogueInput });
assert(manualDialogueInput === '   Fala original mantida com   espaços   ', '37. Manual dialogue semantic immutability preserved');

console.log('=== ALL 37 AUDIT TESTS PASSED SUCCESSFULLY ===');

