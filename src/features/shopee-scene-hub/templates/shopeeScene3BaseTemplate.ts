/**
 * SHOPEE SCENE 3 BASE TEMPLATE — CODE-OWNED STRUCTURAL CONTRACT
 * 
 * Source of truth for Shopee Scene 3:
 * Conversion & CTA Closing (8.0 Seconds, 9:16 Vertical).
 * 
 * Invariants:
 * 1. Technical instructions in English.
 * 2. Spoken dialogue in PT-BR only.
 * 3. Continuity from Scene 2 end state.
 * 4. Exact spoken CTA byte-lock.
 * 5. CTA gesture synchronization.
 */

export const SHOPEE_SCENE_3_AVATAR_RULE = `The uploaded presenter/avatar element is strictly an identity reference for facial and physical traits. Do not inherit clothing from the avatar reference when it conflicts with the wardrobe specified in this prompt. The wardrobe specified in this prompt has absolute priority.`;

export const SHOPEE_SCENE_3_UNIVERSAL_NEGATIVE_CONSTRAINTS = `NO MUSIC. NO SOUNDTRACK. NO BACKGROUND MUSIC. NO VOICE-OVER. NO NARRATION. NO subtitles. NO captions. NO on-screen text. NO price. NO invented discount. NO invented deadline. NO invented stock. NO fake cart icon. NO fake button. NO graphical overlay. NO watermark. NO application interface. NO TikTok watermark. NO TikTok logo. NO Instagram/Reels watermark. NO Kwai watermark. NO CapCut watermark. NO username overlays. NO social handles. NO creator watermark. NO screen-recording UI. NO battery/status bar. NO repost framing. NO underexposed lighting. NO murky shadows obscuring the product. NO blown-out highlights hiding product detail. NO product deformation. NO camera cuts. NO transitions. NO cinematic color grading. NO visual effects.`;

export function getShopeeScene3MasterTemplateSkeleton(): string {
  return `=== SHOPEE SCENE 3: CONVERSION & CTA CLOSING (8 SECONDS) ===

[TECHNICAL SPECIFICATIONS]
- Scene: Scene 3 (Conversion & CTA Closing)
- Aspect Ratio: 9:16 Vertical (Smartphone Orientation)
- Exact Duration: 8.0 Seconds
- Shot Type: Single continuous uninterrupted take (NO cuts, NO transitions, NO visual effects, natural handheld smartphone camera motion with natural human micro-movements, authentic natural ambient lighting).
- Format: Brazilian Shopee UGC (User-Generated Content), conversion-focused closing.

[PRESENTER & ENVIRONMENT]
- Avatar Identity Reference Rule: ${SHOPEE_SCENE_3_AVATAR_RULE}
- Presenter Identity: {{PRESENTER_DESCRIPTION}}
- Presenter Wardrobe (Enforced Priority): {{WARDROBE_SPECIFICATION}}
{{BRAND_MARK_SECTION}}
- Location: {{ENVIRONMENT_SPECIFICATION}}

[PRODUCT IDENTITY & CONTINUITY]
- Product Identity: {{PRODUCT_IDENTITY}}
- Canonical Active Color: {{CANONICAL_COLOR}}
- Starting State: Inherited directly from Scene 2 resolved end state ({{PRODUCT_END_STATE}}).

[TEMPORAL ACTION PLAN & DIALOGUE LOCK]
- 0.0s - 2.0s: {{ACTION_0_2}}
- 2.0s - 4.0s: {{ACTION_2_4}}
- 4.0s - 6.0s: {{ACTION_4_6}}
- 6.0s - 8.0s: {{ACTION_6_8}}
- CTA Physical Gesture: {{CTA_GESTURE}}
- Audio Rules: Direct on-camera speech in Brazilian Portuguese (PT-BR). NO VOICE-OVER. NO NARRATION. Natural lip synchronization with spoken words, authentic conversational tone, and realistic room acoustics without background music.
- Exact Dialogue Lock: Say ONLY this exact phrase. Do not change, add, remove, shorten or repeat any word:
"{{SPOKEN_CTA}}"

[SPEECH AND PHYSICAL ACTION SYNCHRONIZATION]
{{SPEECH_ACTION_SYNC}}

[NEGATIVE CONSTRAINTS — STRICTLY FORBIDDEN]
${SHOPEE_SCENE_3_UNIVERSAL_NEGATIVE_CONSTRAINTS}`;
}
