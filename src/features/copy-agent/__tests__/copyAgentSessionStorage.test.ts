import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import {
  saveCopyAgentSession,
  loadCopyAgentSession,
  clearCopyAgentSession,
  isValidCopyAgentSession,
  shouldOfferCopyAgentRestore,
  COPY_AGENT_SESSION_KEY,
  CopyAgentSavedSession
} from '../copyAgentSessionStorage';

// Mock localStorage for Node environment
let mockStore: Record<string, string> = {};
let mockSetItemHook: ((key: string, val: string) => void) | null = null;

const mockLocalStorage = {
  getItem: (key: string) => mockStore[key] ?? null,
  setItem: (key: string, val: string) => {
    if (mockSetItemHook) {
      mockSetItemHook(key, val);
    }
    mockStore[key] = String(val);
  },
  removeItem: (key: string) => {
    delete mockStore[key];
  },
  clear: () => {
    mockStore = {};
  }
};

(globalThis as any).window = {
  localStorage: mockLocalStorage
};
(globalThis as any).localStorage = mockLocalStorage;

describe('Copy Agent Session Storage (Suite Clean)', () => {
  beforeEach(() => {
    mockStore = {};
    mockSetItemHook = null;
  });

  const sampleSession: CopyAgentSavedSession = {
    schemaVersion: 1,
    savedAt: 1710000000000,
    activeMode: 'clean_d',
    productContext: 'Mini Processador de Alimentos Elétrico USB Portátil',
    productImagePreview: 'data:image/jpeg;base64,samplebase64data',
    selectedPlatform: 'tiktok_shop',
    cartGuidance: 'carrinho laranja',
    characterContract: {
      min: 160,
      max: 175
    },
    variations: [
      {
        id: '1',
        text: 'CENA 2:\nPique temperos e legumes em segundos sem esforço e sem deixar cheiro nas mãos com lâminas de aço inoxidável super afiadas.\n\nCENA 3:\nAproveite a oferta especial por tempo limitado no link abaixo e garanta o seu hoje mesmo clicando no carrinho laranja.',
        mode: 'clean_d',
        isFavorite: true,
        isUsed: false,
        isSelected: true,
        createdAt: 1710000000000
      }
    ],
    labVariations: [
      {
        id: 'lab_1',
        text: 'CENA 2:\nTenha praticidade total no preparo de receitas diárias triturando alho e cebola rapidamente com um simples toque de botão.\n\nCENA 3:\nGaranta frete com desconto e entrega rápida para sua região clicando agora no botão do carrinho laranja.',
        mode: 'clean_d_lab',
        isFavorite: false,
        isUsed: true,
        isSelected: false,
        createdAt: 1710000000000
      }
    ]
  };

  it('1. saves and loads a valid session', () => {
    const saved = saveCopyAgentSession(sampleSession);
    assert.strictEqual(saved, true);

    const loaded = loadCopyAgentSession();
    assert.notStrictEqual(loaded, null);
    assert.strictEqual(loaded?.schemaVersion, 1);
    assert.strictEqual(loaded?.activeMode, 'clean_d');
    assert.strictEqual(loaded?.productContext, 'Mini Processador de Alimentos Elétrico USB Portátil');
    assert.strictEqual(loaded?.variations.length, 1);
    assert.strictEqual(loaded?.labVariations?.length, 1);
  });

  it('2. corrupted JSON returns null without throwing', () => {
    mockLocalStorage.setItem(COPY_AGENT_SESSION_KEY, '{{corrupted-invalid-json}}');
    assert.doesNotThrow(() => {
      const result = loadCopyAgentSession();
      assert.strictEqual(result, null);
    });
  });

  it('3. invalid schemaVersion returns null', () => {
    const invalid = { ...sampleSession, schemaVersion: 99 };
    mockLocalStorage.setItem(COPY_AGENT_SESSION_KEY, JSON.stringify(invalid));
    assert.strictEqual(loadCopyAgentSession(), null);
  });

  it('4. clear removes saved session', () => {
    saveCopyAgentSession(sampleSession);
    assert.notStrictEqual(loadCopyAgentSession(), null);

    clearCopyAgentSession();
    assert.strictEqual(loadCopyAgentSession(), null);
    assert.strictEqual(mockLocalStorage.getItem(COPY_AGENT_SESSION_KEY), null);
  });

  it('5. shouldOfferCopyAgentRestore returns true when variations exist', () => {
    const sessionWithVars: CopyAgentSavedSession = {
      schemaVersion: 1,
      savedAt: Date.now(),
      activeMode: 'clean_a',
      productContext: 'Produto teste',
      selectedPlatform: 'shopee',
      variations: [
        {
          id: 'v1',
          text: 'Texto de teste com conteúdo gerado',
          mode: 'clean_a',
          createdAt: Date.now()
        }
      ]
    };
    assert.strictEqual(shouldOfferCopyAgentRestore(sessionWithVars), true);
  });

  it('6. shouldOfferCopyAgentRestore returns true when labVariations exist', () => {
    const sessionWithLabVars: CopyAgentSavedSession = {
      schemaVersion: 1,
      savedAt: Date.now(),
      activeMode: 'clean_d_lab',
      productContext: 'Produto teste',
      selectedPlatform: 'tiktok_shop',
      variations: [],
      labVariations: [
        {
          id: 'lab1',
          text: 'Variação de laboratório gerada',
          mode: 'clean_d_lab',
          createdAt: Date.now()
        }
      ]
    };
    assert.strictEqual(shouldOfferCopyAgentRestore(sessionWithLabVars), true);
  });

  it('7. shouldOfferCopyAgentRestore returns false for empty session', () => {
    const emptySession: CopyAgentSavedSession = {
      schemaVersion: 1,
      savedAt: Date.now(),
      activeMode: 'clean_d',
      productContext: '',
      selectedPlatform: 'tiktok_shop',
      variations: [],
      labVariations: []
    };
    assert.strictEqual(shouldOfferCopyAgentRestore(emptySession), false);
  });

  it('8. favorite/used/selected flags survive roundtrip', () => {
    saveCopyAgentSession(sampleSession);
    const loaded = loadCopyAgentSession();

    assert.strictEqual(loaded?.variations[0].isFavorite, true);
    assert.strictEqual(loaded?.variations[0].isUsed, false);
    assert.strictEqual(loaded?.variations[0].isSelected, true);

    assert.strictEqual(loaded?.labVariations?.[0].isFavorite, false);
    assert.strictEqual(loaded?.labVariations?.[0].isUsed, true);
    assert.strictEqual(loaded?.labVariations?.[0].isSelected, false);
  });

  it('9. Clean D Lab variations remain isolated from normal variations', () => {
    saveCopyAgentSession(sampleSession);
    const loaded = loadCopyAgentSession();

    assert.deepStrictEqual(loaded?.variations.map(v => v.mode), ['clean_d']);
    assert.deepStrictEqual(loaded?.labVariations?.map(v => v.mode), ['clean_d_lab']);
    assert.strictEqual(loaded?.variations[0].id, '1');
    assert.strictEqual(loaded?.labVariations?.[0].id, 'lab_1');
  });

  it('10. productImagePreview is stored only once at session top level', () => {
    const sessionWithNestedImages = {
      ...sampleSession,
      variations: [
        {
          ...sampleSession.variations[0],
          productImagePreview: 'should-not-exist'
        }
      ]
    } as unknown as CopyAgentSavedSession;

    saveCopyAgentSession(sessionWithNestedImages);
    const raw = JSON.parse(mockLocalStorage.getItem(COPY_AGENT_SESSION_KEY) || '{}');

    assert.strictEqual(raw.productImagePreview, 'data:image/jpeg;base64,samplebase64data');
    assert.strictEqual(raw.variations[0].productImagePreview, undefined);
  });

  it('11. quota failure retries without productImagePreview', () => {
    let callCount = 0;

    mockSetItemHook = () => {
      callCount++;
      if (callCount === 1) {
        throw new Error('QuotaExceededError: DOM Exception 22');
      }
    };

    const saved = saveCopyAgentSession(sampleSession);
    assert.strictEqual(saved, true);
    assert.strictEqual(callCount, 2);

    const loaded = loadCopyAgentSession();
    assert.notStrictEqual(loaded, null);
    assert.strictEqual(loaded?.productImagePreview, undefined);
    assert.strictEqual(loaded?.variations.length, 1);
  });

  it('12. quota fallback preserves textual variations and context', () => {
    let callCount = 0;

    mockSetItemHook = () => {
      callCount++;
      if (callCount === 1) {
        throw new Error('QuotaExceededError');
      }
    };

    saveCopyAgentSession(sampleSession);
    const loaded = loadCopyAgentSession();

    assert.strictEqual(loaded?.productContext, 'Mini Processador de Alimentos Elétrico USB Portátil');
    assert.ok(loaded?.variations[0].text.includes('Pique temperos e legumes em segundos'));
    assert.ok(loaded?.labVariations?.[0].text.includes('Tenha praticidade total no preparo'));
    assert.strictEqual(loaded?.cartGuidance, 'carrinho laranja');
  });
});
