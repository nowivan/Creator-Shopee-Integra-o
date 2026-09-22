import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
    buildAffiliateThumbnailPrompt,
    buildThumbnailTextLock,
    buildAffiliateThumbnailNegativePrompt
} from '../affiliateThumbnailMode';

describe('Affiliate Video Thumbnail Mode (Capa para Vídeo)', () => {
    it('generates vertical 9:16 static composition directives without text when textMode is no_text', () => {
        const prompt = buildAffiliateThumbnailPrompt({
            platform: 'universal',
            textMode: 'no_text'
        });

        assert.ok(prompt.includes('AFFILIATE VIDEO THUMBNAIL IMAGE PROMPT:'));
        assert.ok(prompt.includes('Create one vertical 9:16 static product thumbnail image'));
        assert.ok(prompt.includes('NO TEXT OVERLAY MANDATE:'));
        assert.ok(prompt.includes('DO NOT add any text overlay, typography, captions, words, letters, numbers'));
    });

    it('generates exact verbatim headline directives without alterations when textMode is with_text', () => {
        const headline = 'ACHADINHO QUE VALE CADA CENTAVO!';
        const prompt = buildAffiliateThumbnailPrompt({
            platform: 'shopee',
            textMode: 'with_text',
            headline
        });

        assert.ok(prompt.includes('AFFILIATE VIDEO THUMBNAIL IMAGE PROMPT:'));
        assert.ok(prompt.includes('HEADLINE OVERLAY INSTRUCTIONS:'));
        assert.ok(prompt.includes(`"${headline}"`));
        assert.ok(prompt.includes('Preserve the headline character-for-character in its original language.'));
        assert.ok(prompt.includes('DO NOT translate the headline into English or any other language.'));
        assert.ok(prompt.includes('DO NOT paraphrase, fix typos, or alter the wording in any way.'));
    });

    it('enforces marketplace safety locks forbidding fake prices, discounts, and simulated UI', () => {
        const prompt = buildAffiliateThumbnailPrompt({
            platform: 'amazon',
            textMode: 'no_text'
        });

        assert.ok(prompt.includes('SAFETY LOCK:'));
        assert.ok(prompt.includes('Do not invent or display price, discount, coupon, free shipping'));
        assert.ok(prompt.includes('Do not create fake marketplace UI, fake cart icons, fake app screens'));
        assert.ok(prompt.includes('PRODUCT IDENTITY LOCK:'));
        assert.ok(prompt.includes('Preserve exact product shape, colors, materials, proportions'));
    });

    it('customizes platform name appropriately for TikTok Shop', () => {
        const prompt = buildAffiliateThumbnailPrompt({
            platform: 'tiktok_shop',
            textMode: 'no_text'
        });

        assert.ok(prompt.includes('Create one vertical 9:16 static product thumbnail image for TikTok Shop'));
        assert.ok(prompt.includes('Make the image visually clickable, simple and readable on a mobile feed'));
    });

    it('customizes platform name appropriately for Mercado Livre', () => {
        const prompt = buildAffiliateThumbnailPrompt({
            platform: 'mercado_livre',
            textMode: 'with_text',
            headline: 'MELHOR CUSTO BENEFÍCIO'
        });

        assert.ok(prompt.includes('Create one vertical 9:16 static product thumbnail image for Mercado Livre'));
        assert.ok(prompt.includes('"MELHOR CUSTO BENEFÍCIO"'));
    });

    it('falls back to clean composition when textMode is with_text but headline is empty or whitespace', () => {
        const textLock = buildThumbnailTextLock('with_text', '   ');

        assert.ok(textLock.includes('NO TEXT OVERLAY MANDATE:'));
        assert.ok(textLock.includes('The thumbnail must be completely clean and distraction-free'));

        const negativePrompt = buildAffiliateThumbnailNegativePrompt({
            textMode: 'with_text',
            headline: '   '
        });
        assert.ok(!negativePrompt.includes('translated headline'));
    });
});

