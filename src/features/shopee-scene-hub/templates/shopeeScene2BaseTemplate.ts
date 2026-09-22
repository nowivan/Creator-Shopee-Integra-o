/**
 * SHOPEE SCENE 2 BASE TEMPLATE — CODE-OWNED STRUCTURAL CONTRACT
 * 
 * Source of truth for Shopee Scene 2:
 * Spoken Benefit & Physical Demonstration (8.0 Seconds, 9:16 Vertical).
 * 
 * Invariants:
 * 1. Technical instructions in English.
 * 2. Spoken dialogue in PT-BR only.
 * 3. 4 action beats: 0-2s, 2-4s, 4-6s, 6-8s.
 * 4. Strictly NO CTA, NO price, NO discount, NO promotion.
 */

export const SHOPEE_SCENE_2_AVATAR_RULE = `The uploaded presenter/avatar element is strictly an identity reference for facial and physical traits. Do not inherit clothing from the avatar reference when it conflicts with the wardrobe specified in this prompt. The wardrobe specified in this prompt has absolute priority.`;

export const SHOPEE_SCENE_2_NEGATIVE_CONSTRAINTS = `NO MUSIC. NO SOUNDTRACK. NO BACKGROUND MUSIC. NO VOICE-OVER. NO NARRATION. NO subtitles. NO captions. NO on-screen text. NO price. NO discount. NO promotion. NO coupon. NO free shipping. NO urgency. NO scarcity. NO CTA. NO call to action. NO cart mention. NO link mention. NO watermark. NO application interface. NO TikTok watermark. NO TikTok logo. NO Instagram/Reels watermark. NO Kwai watermark. NO CapCut watermark. NO username overlays. NO social handles. NO creator watermark. NO screen-recording UI. NO battery/status bar. NO repost framing. NO underexposed lighting. NO murky shadows obscuring the product. NO blown-out highlights hiding product detail. NO product deformation. NO invented extra accessories. NO camera cuts. NO transitions. NO cinematic color grading. NO visual effects.`;

export function getShopeeScene2MasterTemplateSkeleton(): string {
  return `=== SHOPEE SCENE 2: SPOKEN BENEFIT & PHYSICAL DEMONSTRATION (8 SECONDS) ===

[TECHNICAL SPECIFICATIONS]
- Scene: Scene 2 (Spoken Benefit & Physical Demonstration)
- Aspect Ratio: 9:16 Vertical (Smartphone Orientation)
- Exact Duration: 8.0 Seconds
- Shot Type: Single continuous uninterrupted take (NO cuts, NO transitions, NO visual effects, NO artificial zooms, natural subtle autofocus, realistic handheld smartphone camera motion with natural human micro-movements, authentic natural ambient lighting).
- Format: Brazilian Shopee UGC (User-Generated Content), authentic everyday demonstration realism.

[PRESENTER & ENVIRONMENT]
- Avatar Identity Reference Rule: ${SHOPEE_SCENE_2_AVATAR_RULE}
- Presenter Identity: {{PRESENTER_DESCRIPTION}}
- Presenter Wardrobe (Enforced Priority): {{WARDROBE_SPECIFICATION}}
{{BRAND_MARK_SECTION}}
- Location: {{ENVIRONMENT_SPECIFICATION}}

[PRODUCT IDENTITY & PRESERVATION]
- Product Identity: {{PRODUCT_IDENTITY}}
- Canonical Active Color: {{CANONICAL_COLOR}}
- Verified Observable Details: {{PRODUCT_VISIBLE_DETAILS}}
- Known Physical Facts: {{PRODUCT_FACTS}}
- Allowed Physical Interactions: {{ALLOWED_INTERACTIONS}}
- Blocked Physical Interactions: {{BLOCKED_INTERACTIONS}}
- Visible Benefit Proof: {{VISIBLE_BENEFIT_PROOF}}

[TEMPORAL ACTION PLAN & DIALOGUE LOCK]
- 0.0s - 2.0s: {{ACTION_0_2}}
- 2.0s - 4.0s: {{ACTION_2_4}}
- 4.0s - 6.0s: {{ACTION_4_6}}
- 6.0s - 8.0s: {{ACTION_6_8}}
- Audio Rules: Direct on-camera speech in Brazilian Portuguese (PT-BR). NO VOICE-OVER. NO NARRATION. Natural lip synchronization with spoken words, authentic conversational tone, and realistic room acoustics without background music.
- Exact Dialogue Lock: Say ONLY this exact phrase. Do not change, add, remove, shorten or repeat any word:
"{{SPOKEN_COPY}}"

[SPEECH AND PHYSICAL ACTION SYNCHRONIZATION]
{{SPEECH_ACTION_SYNC}}

[NEGATIVE CONSTRAINTS & STRUCTURE LOCK]
${SHOPEE_SCENE_2_NEGATIVE_CONSTRAINTS}`;
}
