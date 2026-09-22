/**
 * SHOPEE PRIVACY & PII VALIDATOR
 * 
 * Scans copy, dialogue, prompts, and metadata for personal data (LGPD / Shopee account health).
 * Detects phone numbers, emails, CPF, CNPJ, RG, CEP, residential street addresses, Pix keys, and contact links.
 * Returns blocking critical violations requiring explicit user confirmation (no silent removal).
 */

import { ShopeeComplianceViolation } from '../types';

interface PrivacyPatternDef {
  pattern: RegExp;
  code: string;
  type: string;
  message: string;
  suggestedAction: string;
}

const PRIVACY_PATTERNS: PrivacyPatternDef[] = [
  // Email Addresses
  {
    pattern: /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/,
    code: 'PII_EMAIL_DETECTED',
    type: 'E-mail',
    message: 'Endereço de e-mail detectado. Divulgação de dados pessoais é estritamente proibida nos vídeos da Shopee.',
    suggestedAction: 'Remova qualquer e-mail para evitar suspensão de conta pela moderação.'
  },
  // Brazilian Phone Numbers & WhatsApp numbers
  // Matches: (11) 98765-4321, 11 98765-4321, 98765-4321, +55 11 98765-4321
  {
    pattern: /(?:(?:\+?55\s*)?(?:\(?\s*\d{2}\s*\)?\s*)?(?:9\s*\d{4}|\d{4})[-.\s]?\d{4})\b/,
    code: 'PII_PHONE_NUMBER_DETECTED',
    type: 'Telefone/WhatsApp',
    message: 'Número de telefone ou contato pessoal detectado.',
    suggestedAction: 'Remova números de telefone ou direcionamentos para fora da Shopee.'
  },
  // WhatsApp / Invite Direct Links
  {
    pattern: /\b(?:wa\.me|api\.whatsapp\.com|chat\.whatsapp\.com|t\.me|linktree|chama\s+no\s+(?:zap|whatsapp))\b/iu,
    code: 'PII_OFF_PLATFORM_CONTACT_LINK',
    type: 'Link de Contato Externo',
    message: 'Direcionamento para WhatsApp, Telegram ou link externo detectado.',
    suggestedAction: 'Remova links de contato externo. O tráfego de conversão deve permanecer estritamente no ecossistema Shopee.'
  },
  // CPF (123.456.789-00 or CPF: 12345678900)
  {
    pattern: /(?:\b\d{3}\.\d{3}\.\d{3}-\d{2}\b|\bcpf[:\s]*\d{11}\b|\bcpf[:\s]*\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b)/iu,
    code: 'PII_CPF_DETECTED',
    type: 'CPF',
    message: 'Número de CPF detectado. Dados governamentais e fiscais não podem constar no conteúdo de vídeo.',
    suggestedAction: 'Remova o CPF imediatamente.'
  },
  // CNPJ (12.345.678/0001-90 or CNPJ: 12345678000190)
  {
    pattern: /(?:\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b|\bcnpj[:\s]*\d{14}\b|\bcnpj[:\s]*\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b)/iu,
    code: 'PII_CNPJ_DETECTED',
    type: 'CNPJ',
    message: 'Número de CNPJ detectado.',
    suggestedAction: 'Remova o número de CNPJ do texto ou prompt.'
  },
  // RG / Identity
  {
    pattern: /\b(?:rg|registro\s+geral)[:\s]*\d{1,2}\.?\d{3}\.?\d{3}-?[0-9xX]\b/iu,
    code: 'PII_RG_DETECTED',
    type: 'RG',
    message: 'Número de RG ou documento de identidade detectado.',
    suggestedAction: 'Remova o documento de identidade.'
  },
  // Postal Code (CEP)
  {
    pattern: /(?:\bcep[:\s]*\d{5}-?\d{3}\b|\b\d{5}-\d{3}\b)/iu,
    code: 'PII_CEP_DETECTED',
    type: 'CEP',
    message: 'CEP residencial ou comercial detectado.',
    suggestedAction: 'Remova o código postal do conteúdo de vídeo.'
  },
  // Residential / Street Address
  {
    pattern: /\b(?:rua|avenida|av\.|travessa|alameda|rodovia)\s+[A-Z\p{L}0-9\s,.-]+,\s*(?:n[ºo°]?\s*)?\d+\b/iu,
    code: 'PII_STREET_ADDRESS_DETECTED',
    type: 'Endereço Físico',
    message: 'Endereço residencial ou comercial com logradouro e número detectado.',
    suggestedAction: 'Remova endereços físicos do roteiro.'
  },
  // Pix Keys & Bank Account Data
  {
    pattern: /\b(?:chave\s+pix|pix[:\s]+[a-zA-Z0-9._%+-]+|ag[êe]ncia[:\s]*\d+|conta\s+corrente[:\s]*\d+)\b/iu,
    code: 'PII_BANK_DATA_DETECTED',
    type: 'Dados Bancários / Pix',
    message: 'Dados bancários ou chave Pix detectados. Toda transação financeira deve ocorrer exclusivamente pelo checkout oficial da Shopee.',
    suggestedAction: 'Remova chaves Pix e dados bancários.'
  }
];

export function validatePrivacyAndPii(text: string, fieldName: string = 'text'): ShopeeComplianceViolation[] {
  if (!text || typeof text !== 'string') return [];
  const violations: ShopeeComplianceViolation[] = [];

  for (const def of PRIVACY_PATTERNS) {
    const match = text.match(def.pattern);
    if (match) {
      violations.push({
        code: def.code,
        severity: 'critical',
        category: 'privacy_pii',
        message: def.message,
        offendingText: match[0],
        suggestedAction: def.suggestedAction,
        requiresConfirmation: true,
        blocking: true,
        field: fieldName
      });
    }
  }

  return violations;
}
