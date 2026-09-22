/**
 * SHOPEE VISUAL QUALITY VALIDATOR
 * 
 * Validates prompt completeness for:
 * 1. Clear product visibility
 * 2. Adequate lighting (ambient/natural/well-lit)
 * 3. Product in focus (sharp focus, autofocus)
 * 4. Readable product details / observable components
 * 5. Realistic presentation (continuous take, UGC realism)
 * 6. Hard negative lighting constraints (NO underexposed lighting, NO murky shadows, NO blown-out highlights)
 * 
 * Note: This validator assesses prompt instruction completeness and compliance before AI rendering.
 */

import { ShopeeComplianceViolation } from '../types';

export const REQUIRED_NEGATIVE_LIGHTING_CONSTRAINTS = [
  'NO underexposed lighting',
  'NO murky shadows obscuring the product',
  'NO blown-out highlights hiding product detail'
];

export function validateVisualQualityPrompt(promptText: string, sceneName: string = 'Prompt'): ShopeeComplianceViolation[] {
  if (!promptText || typeof promptText !== 'string') {
    return [{
      code: 'EMPTY_PROMPT_CONTENT',
      severity: 'critical',
      category: 'product_clarity',
      message: `${sceneName} está vazio. O prompt para o gerador de vídeo não foi construído.`,
      requiresConfirmation: false,
      blocking: true,
      field: sceneName
    }];
  }

  const violations: ShopeeComplianceViolation[] = [];
  const lower = promptText.toLowerCase();

  // 1. Product Visibility
  const hasProductVisibility =
    lower.includes('product') &&
    (lower.includes('visible') ||
      lower.includes('clear view') ||
      lower.includes('focus') ||
      lower.includes('presentation') ||
      lower.includes('product identity'));

  if (!hasProductVisibility) {
    violations.push({
      code: 'MISSING_PRODUCT_VISIBILITY_DIRECTIVE',
      severity: 'critical',
      category: 'product_clarity',
      message: `${sceneName}: O prompt não contém instrução explícita de visibilidade clara do produto.`,
      suggestedAction: 'Assegure que a identificação e presença visual do produto estejam definidas no prompt.',
      requiresConfirmation: false,
      blocking: true,
      field: sceneName
    });
  }

  // 2. Adequate Lighting Directive
  const hasLightingDirective =
    lower.includes('lighting') ||
    lower.includes('iluminação') ||
    lower.includes('ambient light') ||
    lower.includes('natural light');

  if (!hasLightingDirective) {
    violations.push({
      code: 'MISSING_ADEQUATE_LIGHTING_DIRECTIVE',
      severity: 'warning',
      category: 'product_clarity',
      message: `${sceneName}: O prompt carece de instrução de iluminação adequada (authentic natural ambient lighting).`,
      suggestedAction: 'Inclua "authentic natural ambient lighting" nas especificações técnicas do prompt.',
      requiresConfirmation: false,
      blocking: false,
      field: sceneName
    });
  }

  // 3. Product in Focus
  const hasFocusDirective =
    lower.includes('focus') ||
    lower.includes('autofocus') ||
    lower.includes('foco') ||
    lower.includes('sharp');

  if (!hasFocusDirective) {
    violations.push({
      code: 'MISSING_FOCUS_DIRECTIVE',
      severity: 'warning',
      category: 'product_clarity',
      message: `${sceneName}: O prompt não especifica foco nítido no mecanismo ou corpo do produto.`,
      suggestedAction: 'Inclua "product in clear focus" ou "natural subtle autofocus".',
      requiresConfirmation: false,
      blocking: false,
      field: sceneName
    });
  }

  // 4. Realistic Product Presentation
  const hasRealismDirective =
    lower.includes('ugc') ||
    lower.includes('continuous') ||
    lower.includes('realism') ||
    lower.includes('handheld') ||
    lower.includes('authentic');

  if (!hasRealismDirective) {
    violations.push({
      code: 'MISSING_REALISTIC_PRESENTATION',
      severity: 'info',
      category: 'realistic_benefit',
      message: `${sceneName}: Recomenda-se reforçar a autenticidade UGC e tomada contínua (single continuous take).`,
      suggestedAction: 'Adicione menção ao formato UGC e tomada sem cortes artificiais.',
      requiresConfirmation: false,
      blocking: false,
      field: sceneName
    });
  }

  // 5. Negative Lighting Constraints Check
  const missingNegativeConstraints: string[] = [];
  if (!lower.includes('no underexposed lighting')) {
    missingNegativeConstraints.push('NO underexposed lighting');
  }
  if (!lower.includes('no murky shadows')) {
    missingNegativeConstraints.push('NO murky shadows obscuring the product');
  }
  if (!lower.includes('no blown-out highlights')) {
    missingNegativeConstraints.push('NO blown-out highlights hiding product detail');
  }

  if (missingNegativeConstraints.length > 0) {
    violations.push({
      code: 'MISSING_NEGATIVE_LIGHTING_CONSTRAINTS',
      severity: 'warning',
      category: 'product_clarity',
      message: `${sceneName}: Restrições negativas de iluminação ausentes (${missingNegativeConstraints.join(', ')}).`,
      suggestedAction: 'Adicione restrições contra subexposição e sombras escuras para manter conformidade visual.',
      requiresConfirmation: false,
      blocking: false,
      field: sceneName
    });
  }

  return violations;
}

/**
 * Safe auto-fix: Injects missing negative lighting constraints into a prompt without modifying scene choreography or user words.
 */
export function injectMissingNegativeLightingConstraints(promptText: string): string {
  if (!promptText) return promptText;
  let updated = promptText;
  const lower = updated.toLowerCase();

  const toAdd: string[] = [];
  if (!lower.includes('no underexposed lighting')) {
    toAdd.push('NO underexposed lighting.');
  }
  if (!lower.includes('no murky shadows')) {
    toAdd.push('NO murky shadows obscuring the product.');
  }
  if (!lower.includes('no blown-out highlights')) {
    toAdd.push('NO blown-out highlights hiding product detail.');
  }

  if (toAdd.length > 0) {
    const addition = ' ' + toAdd.join(' ');
    // Append to negative constraints section if present
    if (updated.includes('[NEGATIVE CONSTRAINTS')) {
      updated = updated.replace(/(\[NEGATIVE CONSTRAINTS[^\]]*\][\s\S]*)/, `$1\n${toAdd.join(' ')}`);
    } else {
      updated = updated + '\n' + toAdd.join(' ');
    }
  }

  return updated;
}
