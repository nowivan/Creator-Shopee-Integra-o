/**
 * SHOPEE WATERMARK & EXTERNAL PLATFORM VALIDATOR
 * 
 * Detects 3P social media watermarks, logos, external platform handles,
 * screen-recording UI artifacts, battery/status bars, and forbidden terms (carrinho laranja, rede vizinha).
 */

import { ShopeeComplianceViolation } from '../types';

interface WatermarkPatternDef {
  pattern: RegExp;
  code: string;
  name: string;
  severity: 'critical' | 'warning';
  message: string;
  suggestedAction: string;
}

const WATERMARK_AND_PLATFORM_PATTERNS: WatermarkPatternDef[] = [
  // TikTok Watermark / Logo / Platform
  {
    pattern: /\b(?:tiktok\s*watermark|tiktok\s*logo|marca\s*d['']?[aá]gua\s*do\s*tiktok|selo\s*do\s*tiktok|vídeo\s*do\s*tiktok)\b/iu,
    code: 'TIKTOK_WATERMARK_DETECTED',
    name: 'TikTok Watermark',
    severity: 'critical',
    message: 'Marca d\'água ou menção explícita ao TikTok detectada. Vídeos reciclados com selos externos são banidos ou desmonetizados.',
    suggestedAction: 'Exporte o vídeo limpo sem a marca d\'água do TikTok.'
  },
  // Instagram / Reels Watermark
  {
    pattern: /\b(?:instagram\s*watermark|reels?\s*badge|instagram\s*reels|marca\s*d['']?[aá]gua\s*do\s*instagram|selo\s*do\s*reels?)\b/iu,
    code: 'INSTAGRAM_WATERMARK_DETECTED',
    name: 'Instagram / Reels Watermark',
    severity: 'critical',
    message: 'Marca d\'água ou selo do Instagram / Reels detectado.',
    suggestedAction: 'Remova logomarcas e referências ao ecossistema Meta/Instagram.'
  },
  // Kwai Watermark
  {
    pattern: /\b(?:kwai\s*watermark|marca\s*d['']?[aá]gua\s*do\s*kwai|selo\s*do\s*kwai|vídeo\s*do\s*kwai)\b/iu,
    code: 'KWAI_WATERMARK_DETECTED',
    name: 'Kwai Watermark',
    severity: 'critical',
    message: 'Marca d\'água do Kwai detectada.',
    suggestedAction: 'Remova a marca d\'água do Kwai antes de veicular na Shopee.'
  },
  // CapCut Watermark
  {
    pattern: /\b(?:capcut\s*watermark|cap\s*cut\s*watermark|marca\s*d['']?[aá]gua\s*do\s*capcut|encerramento\s*do\s*capcut)\b/iu,
    code: 'CAPCUT_WATERMARK_DETECTED',
    name: 'CapCut Watermark',
    severity: 'critical',
    message: 'Encerramento ou marca d\'água do editor CapCut detectada.',
    suggestedAction: 'Corte os últimos segundos ou desative o encerramento padrão do CapCut.'
  },
  // Username / Social Handles Overlays
  {
    pattern: /(?:^|[^\w])@[a-zA-Z0-9_.]{3,30}\b/,
    code: 'USERNAME_OVERLAY_DETECTED',
    name: 'Nome de Usuário / Handle',
    severity: 'critical',
    message: 'Identificador de rede social (@usuario) detectado. Sobreposições de perfis externos prejudicam a conformidade.',
    suggestedAction: 'Remova @handles ou arrobas externas.'
  },
  // Screen-Recording UI / Battery / Status Bar
  {
    pattern: /\b(?:screen[- ]recording|grava[çc][ãa]o\s+de\s+tela|battery\s+bar|status\s+bar|barra\s+de\s+bateria|barra\s+de\s+status|notifica[çc][ãa]o\s+de\s+celular)\b/iu,
    code: 'SCREEN_RECORDING_UI_DETECTED',
    name: 'Interface de Gravação de Tela',
    severity: 'critical',
    message: 'Artefatos de gravação de tela, barra de bateria ou status de smartphone detectados.',
    suggestedAction: 'Utilize arquivo original gravado pela câmera, não gravação de tela com interface de celular.'
  },
  // App Interface Overlays
  {
    pattern: /\b(?:app\s+interface|interface\s+do\s+app|overlay\s+de\s+app|menu\s+do\s+aplicativo|bot[ãa]o\s+de\s+curtir\s+na\s+tela)\b/iu,
    code: 'APP_INTERFACE_OVERLAY_DETECTED',
    name: 'Interface de Aplicativo Sobreposta',
    severity: 'critical',
    message: 'Sobreposição gráfica simulando interface de aplicativo detectada.',
    suggestedAction: 'Mantenha o vídeo limpo de botões falsos e barras de interface gráfica.'
  },
  // Reposted Content Framing
  {
    pattern: /\b(?:reposted\s+content|v[ií]deo\s+repostado|moldura\s+de\s+repost|borda\s+de\s+repost)\b/iu,
    code: 'REPOSTED_CONTENT_FRAMING_DETECTED',
    name: 'Enquadramento de Conteúdo Repostado',
    severity: 'critical',
    message: 'Indicação de conteúdo repostado ou moldura de reenvio detectada.',
    suggestedAction: 'Utilize enquadramento 9:16 direto sem bordas de repost.'
  },
  // Forbidden Platform Terms (Carrinho Laranja / Rede Vizinha / TikTok direct)
  {
    pattern: /\bcarrinho\s+laranja\b/iu,
    code: 'FORBIDDEN_CARRINHO_LARANJA',
    name: 'Termo Proibido (Carrinho Laranja)',
    severity: 'critical',
    message: '"Carrinho laranja" é termo do TikTok Shop. Na Shopee, utilize "produto marcado", "sacolinha" ou "link".',
    suggestedAction: 'Substitua por "produto marcado aqui embaixo" ou "sacolinha".'
  },
  {
    pattern: /\brede\s+vizinha\b/iu,
    code: 'FORBIDDEN_REDE_VIZINHA',
    name: 'Termo Proibido (Rede Vizinha)',
    severity: 'critical',
    message: 'Termo evasivo "rede vizinha" detectado. O conteúdo deve ser nativo e direcionar para recursos oficiais da Shopee.',
    suggestedAction: 'Remova menções a outras plataformas.'
  }
];

export function validateWatermarksAndPlatforms(text: string, fieldName: string = 'text'): ShopeeComplianceViolation[] {
  if (!text || typeof text !== 'string') return [];
  const violations: ShopeeComplianceViolation[] = [];

  for (const def of WATERMARK_AND_PLATFORM_PATTERNS) {
    const matches = Array.from(text.matchAll(new RegExp(def.pattern.source, def.pattern.flags.includes('g') ? def.pattern.flags : def.pattern.flags + 'g')));
    
    for (const match of matches) {
      const matchIndex = match.index ?? 0;
      // Check if preceded by negative constraint prefix like "NO ", "WITHOUT ", "SEM "
      const preceding = text.substring(Math.max(0, matchIndex - 30), matchIndex).trim();
      const isNegation = /\b(?:no|without|sem|not|proibido|forbidden)\b/i.test(preceding);

      // If it's a negative constraint (e.g. "NO TikTok watermark"), it's compliant, not a violation!
      if (isNegation) {
        continue;
      }

      violations.push({
        code: def.code,
        severity: def.severity,
        category: 'watermark_recycled',
        message: def.message,
        offendingText: match[0],
        suggestedAction: def.suggestedAction,
        requiresConfirmation: true,
        blocking: def.severity === 'critical',
        field: fieldName
      });
      break; // Only push once per pattern definition per field
    }
  }

  return violations;
}
