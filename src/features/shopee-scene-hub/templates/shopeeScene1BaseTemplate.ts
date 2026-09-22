/**
 * SHOPEE SCENE 1 BASE TEMPLATE — CODE-OWNED STRUCTURAL CONTRACT
 * 
 * Source of truth for Shopee Scene 1:
 * Hook & Instant Everyday Problem (3.0 Seconds, 9:16 Vertical).
 * 
 * Invariants:
 * 1. Technical instructions in English.
 * 2. Spoken dialogue in PT-BR only.
 * 3. Strictly NO CTA, NO price, NO discount, NO promotion, NO urgency.
 */

export const SHOPEE_SCENE_1_AVATAR_RULE = `The uploaded presenter/avatar element is strictly an identity reference for facial and physical traits. Do not inherit clothing from the avatar reference when it conflicts with the wardrobe specified in this prompt. The wardrobe specified in this prompt has absolute priority.`;

export const SHOPEE_SCENE_1_NEGATIVE_CONSTRAINTS = `NO MUSIC. NO SOUNDTRACK. NO BACKGROUND MUSIC. NO VOICE-OVER. NO NARRATION. NO subtitles. NO captions. NO on-screen text. NO price. NO discount. NO promotion. NO coupon. NO free shipping. NO urgency. NO scarcity. NO CTA. NO call to action. NO cart mention. NO link mention. NO watermark. NO application interface. NO TikTok watermark. NO TikTok logo. NO Instagram/Reels watermark. NO Kwai watermark. NO CapCut watermark. NO username overlays. NO social handles. NO creator watermark. NO screen-recording UI. NO battery/status bar. NO repost framing. NO underexposed lighting. NO murky shadows obscuring the product. NO blown-out highlights hiding product detail. NO camera cuts. NO transitions. NO cinematic color grading. NO visual effects.`;

export function getShopeeScene1MasterTemplateSkeleton(): string {
  return `=== SHOPEE SCENE 1: HOOK & INSTANT PROBLEM (3 SECONDS) ===

[TECHNICAL SPECIFICATIONS]
- Scene: Scene 1 (Hook & Instant Problem)
- Aspect Ratio: 9:16 Vertical (Smartphone Orientation)
- Exact Duration: 3.0 Seconds
- Shot Type: Single continuous uninterrupted take (NO cuts, NO transitions, NO visual effects, NO artificial zooms, natural subtle autofocus, realistic handheld smartphone camera motion with natural human micro-movements, authentic natural ambient lighting).
- Format: Brazilian Shopee UGC (User-Generated Content), authentic relatable everyday realism.

[PRESENTER & WARDROBE]
- Avatar Identity Reference Rule: ${SHOPEE_SCENE_1_AVATAR_RULE}
- Presenter Identity: {{PRESENTER_DESCRIPTION}}
- Presenter Wardrobe (Enforced Priority): {{WARDROBE_SPECIFICATION}}
{{BRAND_MARK_SECTION}}

[ENVIRONMENT & PRODUCT]
- Location: {{ENVIRONMENT_SPECIFICATION}}
- Product Identity: {{PRODUCT_IDENTITY}}
- Context & Everyday Friction: {{PROBLEM_CONTEXT}}

[TEMPORAL ACTION PLAN & DIALOGUE LOCK]
- 0.0s - 1.5s: {{ACTION_0_1_5}}
- 1.5s - 3.0s: {{ACTION_1_5_3}}
- Audio Rules: Direct on-camera speech in Brazilian Portuguese (PT-BR). NO VOICE-OVER. NO NARRATION. Natural lip synchronization with spoken words, authentic conversational tone, and realistic room acoustics without background music.
- Exact Dialogue Lock: Say ONLY this exact phrase. Do not change, add, remove, shorten or repeat any word:
"{{SPOKEN_HOOK}}"

[NEGATIVE CONSTRAINTS — STRICTLY FORBIDDEN]
${SHOPEE_SCENE_1_NEGATIVE_CONSTRAINTS}`;
}
