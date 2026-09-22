import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  validateAndNormalizeVaultUrl,
  formatPromptVaultItemCopyAll
} from '../promptVaultUtils';
import {
  PROMPT_VAULT_STORAGE_KEY,
  loadPromptVaultItems,
  savePromptVaultItems,
  createPromptVaultItem,
  updatePromptVaultItem,
  deletePromptVaultItem,
  duplicatePromptVaultItem,
  recordPromptVaultUse
} from '../promptVaultStorage';
import { PromptVaultItem } from '../types';

// Mock localStorage for Node test runner
const mockStore: Record<string, string> = {};
const mockLocalStorage = {
  getItem: (key: string) => mockStore[key] ?? null,
  setItem: (key: string, val: string) => {
    mockStore[key] = String(val);
  },
  removeItem: (key: string) => {
    delete mockStore[key];
  },
  clear: () => {
    for (const k in mockStore) delete mockStore[k];
  }
};

(globalThis as any).window = {
  localStorage: mockLocalStorage
};
(globalThis as any).localStorage = mockLocalStorage;

describe('Prompt & Link Vault IA Unit Tests', () => {
  it('1. load empty storage returns default seeded items on first run or empty array when reset', () => {
    (global as any).window.localStorage.clear();
    const items = loadPromptVaultItems();
    assert.ok(Array.isArray(items));
    assert.ok(items.length >= 3);
  });

  it('2. invalid JSON in localStorage returns empty array without throwing', () => {
    (global as any).window.localStorage.setItem(PROMPT_VAULT_STORAGE_KEY, '{invalidJson}');
    const items = loadPromptVaultItems();
    assert.deepStrictEqual(items, []);
  });

  it('3. save/load roundtrip preserves items faithfully', () => {
    const testItems: PromptVaultItem[] = [
      {
        id: 'test-1',
        type: 'prompt',
        title: 'Custom Prompt Test',
        category: 'Product Lock',
        destinationTool: 'Creator Pro',
        mainPrompt: 'Main prompt text',
        negativePrompt: 'Negative prompt text',
        tags: ['test', 'lock'],
        favorite: true,
        status: 'approved',
        createdAt: 1000,
        updatedAt: 1000,
        useCount: 0,
        lastUsedAt: null
      }
    ];

    savePromptVaultItems(testItems);
    const loaded = loadPromptVaultItems();
    assert.strictEqual(loaded.length, 1);
    assert.strictEqual(loaded[0].title, 'Custom Prompt Test');
    assert.strictEqual(loaded[0].favorite, true);
    assert.strictEqual(loaded[0].status, 'approved');
  });

  it('4. create prompt item adds item to beginning of storage', () => {
    const newItem = createPromptVaultItem({
      type: 'prompt',
      title: 'New Created Prompt',
      category: 'Cena 1 Hook',
      destinationTool: 'Flow',
      mainPrompt: 'Hook video demonstration prompt',
      tags: ['hook', 'cena1'],
      favorite: false,
      status: 'tested'
    });

    assert.ok(newItem.id.startsWith('vault-'));
    assert.strictEqual(newItem.title, 'New Created Prompt');
    const loaded = loadPromptVaultItems();
    assert.strictEqual(loaded[0].id, newItem.id);
  });

  it('5. create link item normalizes URL and extracts domain', () => {
    const newLink = createPromptVaultItem({
      type: 'link',
      title: 'Shopee Affiliate Portal',
      category: 'Shopee / Afiliado',
      destinationTool: 'Shopee',
      url: 'shopee.com.br/affiliate',
      tags: ['shopee', 'afiliado'],
      favorite: true,
      status: 'approved'
    });

    assert.strictEqual(newLink.url, 'https://shopee.com.br/affiliate');
    assert.strictEqual(newLink.domain, 'shopee.com.br');
  });

  it('6. duplicate item creates new id and (Cópia) title suffix', () => {
    const original = createPromptVaultItem({
      type: 'prompt',
      title: 'Original Template',
      category: 'Script Refiner',
      mainPrompt: 'Original prompt content',
      tags: ['orig'],
      favorite: true,
      status: 'approved'
    });

    const dup = duplicatePromptVaultItem(original.id);
    assert.ok(dup !== null);
    assert.notStrictEqual(dup?.id, original.id);
    assert.strictEqual(dup?.title, 'Original Template (Cópia)');
    assert.strictEqual(dup?.favorite, false); // reset favorite
  });

  it('7. delete item removes only target item', () => {
    const item1 = createPromptVaultItem({
      type: 'prompt',
      title: 'Item to Keep',
      category: 'Outros',
      mainPrompt: 'Keep me',
      tags: [],
      favorite: false,
      status: 'draft'
    });

    const item2 = createPromptVaultItem({
      type: 'prompt',
      title: 'Item to Delete',
      category: 'Outros',
      mainPrompt: 'Delete me',
      tags: [],
      favorite: false,
      status: 'draft'
    });

    const deleted = deletePromptVaultItem(item2.id);
    assert.strictEqual(deleted, true);

    const loaded = loadPromptVaultItems();
    assert.ok(loaded.some(it => it.id === item1.id));
    assert.ok(!loaded.some(it => it.id === item2.id));
  });

  it('8. URL validation accepts https://chatgpt.com/g/...', () => {
    const res = validateAndNormalizeVaultUrl('https://chatgpt.com/g/g-abc123-custom-agent');
    assert.strictEqual(res.isValid, true);
    assert.strictEqual(res.normalizedUrl, 'https://chatgpt.com/g/g-abc123-custom-agent');
    assert.strictEqual(res.domain, 'chatgpt.com');
  });

  it('9. URL validation prefixes https:// when missing', () => {
    const res = validateAndNormalizeVaultUrl('flow.google.com/studio');
    assert.strictEqual(res.isValid, true);
    assert.strictEqual(res.normalizedUrl, 'https://flow.google.com/studio');
    assert.strictEqual(res.domain, 'flow.google.com');
  });

  it('10. URL validation blocks javascript:', () => {
    const res = validateAndNormalizeVaultUrl('javascript:alert(1)');
    assert.strictEqual(res.isValid, false);
    assert.ok(res.error?.includes('javascript:'));
  });

  it('11. URL validation blocks data:', () => {
    const res = validateAndNormalizeVaultUrl('data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==');
    assert.strictEqual(res.isValid, false);
    assert.ok(res.error?.includes('data:'));
  });

  it('12. filters correctly separate prompt, link, favorite, and category', () => {
    (global as any).window.localStorage.clear();
    const p1 = createPromptVaultItem({
      type: 'prompt',
      title: 'P1',
      category: 'Provador Virtual',
      mainPrompt: 'Test P1',
      tags: ['tag1'],
      favorite: true,
      status: 'approved'
    });

    const l1 = createPromptVaultItem({
      type: 'link',
      title: 'L1',
      category: 'GPT / Agente',
      url: 'https://chatgpt.com',
      tags: ['gpt'],
      favorite: false,
      status: 'draft'
    });

    const all = loadPromptVaultItems();
    const promptsOnly = all.filter(i => i.type === 'prompt');
    const linksOnly = all.filter(i => i.type === 'link');
    const favoritesOnly = all.filter(i => i.favorite);
    const provadorOnly = all.filter(i => i.category === 'Provador Virtual');

    assert.ok(promptsOnly.some(i => i.id === p1.id));
    assert.ok(!promptsOnly.some(i => i.id === l1.id));

    assert.ok(linksOnly.some(i => i.id === l1.id));
    assert.ok(!linksOnly.some(i => i.id === p1.id));

    assert.ok(favoritesOnly.some(i => i.id === p1.id));
    assert.ok(!favoritesOnly.some(i => i.id === l1.id));

    assert.ok(provadorOnly.some(i => i.id === p1.id));
    assert.ok(!provadorOnly.some(i => i.id === l1.id));
  });

  it('13. formatPromptVaultItemCopyAll includes only populated fields in exact format', () => {
    const item: PromptVaultItem = {
      id: 'vault-1',
      type: 'prompt',
      title: 'Cinematic UGC Hook',
      category: 'Cena 1 Hook',
      destinationTool: 'Flow',
      status: 'approved',
      tags: ['ugc', 'hook', 'viral'],
      mainPrompt: 'Extreme close up on product texture with natural sunlight.',
      negativePrompt: 'blurry, distorted, low quality',
      productContext: 'Relógio esportivo',
      notes: 'Testado com 8s de duração.',
      favorite: true,
      createdAt: 1000,
      updatedAt: 1000,
      useCount: 2,
      lastUsedAt: 1000
    };

    const formatted = formatPromptVaultItemCopyAll(item);
    assert.ok(formatted.includes('TÍTULO:\nCinematic UGC Hook'));
    assert.ok(formatted.includes('CATEGORIA:\nCena 1 Hook'));
    assert.ok(formatted.includes('DESTINO:\nFlow'));
    assert.ok(formatted.includes('STATUS:\napproved'));
    assert.ok(formatted.includes('TAGS:\nugc, hook, viral'));
    assert.ok(formatted.includes('PROMPT PRINCIPAL:\nExtreme close up on product texture with natural sunlight.'));
    assert.ok(formatted.includes('NEGATIVE PROMPT:\nblurry, distorted, low quality'));
    assert.ok(formatted.includes('CONTEXTO DO PRODUTO:\nRelógio esportivo'));
    assert.ok(formatted.includes('NOTAS:\nTestado com 8s de duração.'));
    // Ensure URL/Link fields are not present since they are undefined
    assert.ok(!formatted.includes('URL:'));
    assert.ok(!formatted.includes('DESCRIÇÃO DO LINK:'));
    assert.ok(!formatted.includes('DOMÍNIO:'));
  });

  it('14. formatPromptVaultItemCopyAll omits empty or whitespace-only fields', () => {
    const item = {
      title: 'Minimal Item',
      category: 'Outros',
      mainPrompt: 'Only main prompt here',
      negativePrompt: '   ',
      productContext: '',
      tags: []
    };

    const formatted = formatPromptVaultItemCopyAll(item);
    assert.ok(formatted.includes('TÍTULO:\nMinimal Item'));
    assert.ok(formatted.includes('CATEGORIA:\nOutros'));
    assert.ok(formatted.includes('PROMPT PRINCIPAL:\nOnly main prompt here'));
    assert.ok(!formatted.includes('NEGATIVE PROMPT:'));
    assert.ok(!formatted.includes('CONTEXTO DO PRODUTO:'));
    assert.ok(!formatted.includes('TAGS:'));
    assert.ok(!formatted.includes('DESTINO:'));
  });

  it('15. formatPromptVaultItemCopyAll handles link items with url, description, and domain', () => {
    const linkItem: PromptVaultItem = {
      id: 'vault-link-1',
      type: 'link',
      title: 'GPT Agente Creator',
      category: 'GPT / Agente',
      destinationTool: 'ChatGPT / GPT',
      status: 'tested',
      tags: ['agente', 'gpt'],
      url: 'https://chatgpt.com/g/g-test',
      linkDescription: 'Agente especializado em roteiros',
      domain: 'chatgpt.com',
      favorite: false,
      createdAt: 2000,
      updatedAt: 2000,
      useCount: 1,
      lastUsedAt: 2000
    };

    const formatted = formatPromptVaultItemCopyAll(linkItem);
    assert.ok(formatted.includes('TÍTULO:\nGPT Agente Creator'));
    assert.ok(formatted.includes('URL:\nhttps://chatgpt.com/g/g-test'));
    assert.ok(formatted.includes('DESCRIÇÃO DO LINK:\nAgente especializado em roteiros'));
    assert.ok(formatted.includes('DOMÍNIO:\nchatgpt.com'));
    assert.ok(!formatted.includes('PROMPT PRINCIPAL:'));
    assert.ok(!formatted.includes('NEGATIVE PROMPT:'));
  });

  it('16. opening viewer does not mutate useCount, copying section or all increments useCount', () => {
    (global as any).window.localStorage.clear();
    const created = createPromptVaultItem({
      type: 'prompt',
      title: 'Usage Test Prompt',
      category: 'Product Lock',
      mainPrompt: 'Main text',
      negativePrompt: 'Negative text',
      tags: [],
      favorite: false,
      status: 'draft'
    });

    assert.strictEqual(created.useCount, 0);

    // Simulating viewing (read-only inspection): items in storage unchanged
    let loaded = loadPromptVaultItems();
    let current = loaded.find(i => i.id === created.id);
    assert.strictEqual(current?.useCount, 0);

    // Simulating copying a section or copy all
    recordPromptVaultUse(created.id);
    loaded = loadPromptVaultItems();
    current = loaded.find(i => i.id === created.id);
    assert.strictEqual(current?.useCount, 1);
    assert.ok(current?.lastUsedAt !== null);

    // Second copy action increments once more
    recordPromptVaultUse(created.id);
    loaded = loadPromptVaultItems();
    current = loaded.find(i => i.id === created.id);
    assert.strictEqual(current?.useCount, 2);
  });

  it('17. plain text formatting preserves multi-line line breaks and characters safely without HTML tags', () => {
    const rawPrompt = 'Line 1: <div>test</div>\nLine 2: "quotes" & \'ampersands\'\nLine 3: 100% realistic';
    const item = {
      title: 'Multi Line Safety Test',
      category: 'Product Lock',
      mainPrompt: rawPrompt
    };

    const formatted = formatPromptVaultItemCopyAll(item);
    assert.ok(formatted.includes(rawPrompt));
    assert.strictEqual(typeof formatted, 'string');
  });
});
