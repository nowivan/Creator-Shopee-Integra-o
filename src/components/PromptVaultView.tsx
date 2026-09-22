import React, { useState, useEffect, useMemo } from 'react';
import { LucideIcon, Button, Card } from './Common';
import { PromptVaultItemViewer } from './PromptVaultItemViewer';
import {
  PromptVaultItem,
  PromptVaultItemType,
  PromptVaultStatus,
  PromptVaultFilterTab,
  PromptVaultStatusFilter,
  PROMPT_VAULT_CATEGORIES,
  PROMPT_VAULT_DESTINATION_TOOLS
} from '../features/prompt-vault/types';
import {
  loadPromptVaultItems,
  createPromptVaultItem,
  updatePromptVaultItem,
  deletePromptVaultItem,
  duplicatePromptVaultItem,
  recordPromptVaultUse
} from '../features/prompt-vault/promptVaultStorage';
import {
  validateAndNormalizeVaultUrl,
  openVaultUrl,
  copyToClipboard
} from '../features/prompt-vault/promptVaultUtils';

interface PromptVaultViewProps {
  currentKey?: string;
}

export function PromptVaultView({ currentKey }: PromptVaultViewProps) {
  const [items, setItems] = useState<PromptVaultItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<PromptVaultFilterTab>('all');
  const [statusFilter, setStatusFilter] = useState<PromptVaultStatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [toolFilter, setToolFilter] = useState<string>('all');

  // Viewer Modal State
  const [viewingItem, setViewingItem] = useState<PromptVaultItem | null>(null);

  // Edit / Create Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PromptVaultItem | null>(null);
  const [modalType, setModalType] = useState<PromptVaultItemType>('prompt');

  // Form fields
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<string>('Outros');
  const [formDestinationTool, setFormDestinationTool] = useState<string>('Creator Pro');
  const [formMainPrompt, setFormMainPrompt] = useState('');
  const [formNegativePrompt, setFormNegativePrompt] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formLinkDescription, setFormLinkDescription] = useState('');
  const [formProductContext, setFormProductContext] = useState('');
  const [formTags, setFormTags] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formStatus, setFormStatus] = useState<PromptVaultStatus>('approved');
  const [formFavorite, setFormFavorite] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Copy feedback toast
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // Load items on mount
  useEffect(() => {
    refreshItems();
  }, []);

  const refreshItems = () => {
    const loaded = loadPromptVaultItems();
    setItems(loaded);
  };

  const showToast = (msg: string) => {
    setCopyFeedback(msg);
    setTimeout(() => setCopyFeedback(null), 3000);
  };

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Tab filter
      if (filterTab === 'prompts' && item.type !== 'prompt') return false;
      if (filterTab === 'links' && item.type !== 'link') return false;
      if (filterTab === 'favorites' && !item.favorite) return false;

      // Status filter
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;

      // Category filter
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;

      // Tool filter
      if (toolFilter !== 'all' && item.destinationTool !== toolFilter) return false;

      // Search query across fields
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inTitle = item.title.toLowerCase().includes(q);
        const inCategory = item.category.toLowerCase().includes(q);
        const inTool = item.destinationTool?.toLowerCase().includes(q) ?? false;
        const inContext = item.productContext?.toLowerCase().includes(q) ?? false;
        const inTags = item.tags.some(t => t.toLowerCase().includes(q));
        const inNotes = item.notes?.toLowerCase().includes(q) ?? false;
        const inPrompt = item.mainPrompt?.toLowerCase().includes(q) ?? false;
        const inNegative = item.negativePrompt?.toLowerCase().includes(q) ?? false;
        const inUrl = item.url?.toLowerCase().includes(q) ?? false;
        const inDesc = item.linkDescription?.toLowerCase().includes(q) ?? false;

        return (
          inTitle ||
          inCategory ||
          inTool ||
          inContext ||
          inTags ||
          inNotes ||
          inPrompt ||
          inNegative ||
          inUrl ||
          inDesc
        );
      }

      return true;
    });
  }, [items, filterTab, statusFilter, categoryFilter, toolFilter, searchQuery]);

  // Open modal for Create
  const handleOpenCreate = (type: PromptVaultItemType) => {
    setEditingItem(null);
    setModalType(type);
    setFormTitle('');
    setFormCategory(type === 'prompt' ? 'Product Lock' : 'GPT / Agente');
    setFormDestinationTool(type === 'prompt' ? 'Creator Pro' : 'ChatGPT / GPT');
    setFormMainPrompt('');
    setFormNegativePrompt('');
    setFormUrl('');
    setFormLinkDescription('');
    setFormProductContext('');
    setFormTags('');
    setFormNotes('');
    setFormStatus('approved');
    setFormFavorite(false);
    setFormError(null);
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEdit = (item: PromptVaultItem) => {
    setEditingItem(item);
    setModalType(item.type);
    setFormTitle(item.title);
    setFormCategory(item.category || 'Outros');
    setFormDestinationTool(item.destinationTool || 'Creator Pro');
    setFormMainPrompt(item.mainPrompt || '');
    setFormNegativePrompt(item.negativePrompt || '');
    setFormUrl(item.url || '');
    setFormLinkDescription(item.linkDescription || '');
    setFormProductContext(item.productContext || '');
    setFormTags(item.tags.join(', '));
    setFormNotes(item.notes || '');
    setFormStatus(item.status);
    setFormFavorite(item.favorite);
    setFormError(null);
    setIsModalOpen(true);
  };

  // Save Modal (Create or Update)
  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formTitle.trim()) {
      setFormError('Por favor, informe um título.');
      return;
    }

    if (modalType === 'link') {
      const urlCheck = validateAndNormalizeVaultUrl(formUrl);
      if (!urlCheck.isValid) {
        setFormError(urlCheck.error || 'URL inválida.');
        return;
      }
    } else {
      if (!formMainPrompt.trim()) {
        setFormError('Por favor, insira o prompt principal.');
        return;
      }
    }

    const tagsArray = formTags
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    if (editingItem) {
      updatePromptVaultItem(editingItem.id, {
        type: modalType,
        title: formTitle.trim(),
        category: formCategory,
        destinationTool: formDestinationTool || undefined,
        mainPrompt: modalType === 'prompt' ? formMainPrompt.trim() : undefined,
        negativePrompt: modalType === 'prompt' && formNegativePrompt.trim() ? formNegativePrompt.trim() : undefined,
        url: modalType === 'link' ? formUrl.trim() : undefined,
        linkDescription: modalType === 'link' && formLinkDescription.trim() ? formLinkDescription.trim() : undefined,
        productContext: formProductContext.trim() || undefined,
        tags: tagsArray,
        notes: formNotes.trim() || undefined,
        status: formStatus,
        favorite: formFavorite
      });
      showToast('Item atualizado com sucesso!');
    } else {
      createPromptVaultItem({
        type: modalType,
        title: formTitle.trim(),
        category: formCategory,
        destinationTool: formDestinationTool || undefined,
        mainPrompt: modalType === 'prompt' ? formMainPrompt.trim() : undefined,
        negativePrompt: modalType === 'prompt' && formNegativePrompt.trim() ? formNegativePrompt.trim() : undefined,
        url: modalType === 'link' ? formUrl.trim() : undefined,
        linkDescription: modalType === 'link' && formLinkDescription.trim() ? formLinkDescription.trim() : undefined,
        productContext: formProductContext.trim() || undefined,
        tags: tagsArray,
        notes: formNotes.trim() || undefined,
        status: formStatus,
        favorite: formFavorite
      });
      showToast('Item criado no Vault!');
    }

    setIsModalOpen(false);
    refreshItems();
  };

  const handleDelete = (id: string, title: string) => {
    if (window.confirm(`Deseja realmente excluir "${title}" do Vault?`)) {
      deletePromptVaultItem(id);
      refreshItems();
      showToast('Item removido do Vault.');
    }
  };

  const handleDuplicate = (id: string) => {
    const dup = duplicatePromptVaultItem(id);
    if (dup) {
      refreshItems();
      showToast('Item duplicado com sucesso!');
    }
  };

  const handleToggleFavorite = (item: PromptVaultItem) => {
    updatePromptVaultItem(item.id, { favorite: !item.favorite });
    refreshItems();
  };

  const handleCopyPrompt = async (item: PromptVaultItem) => {
    if (item.mainPrompt) {
      const ok = await copyToClipboard(item.mainPrompt);
      if (ok) {
        recordPromptVaultUse(item.id);
        refreshItems();
        showToast('Prompt principal copiado!');
      }
    }
  };

  const handleCopyNegative = async (item: PromptVaultItem) => {
    if (item.negativePrompt) {
      const ok = await copyToClipboard(item.negativePrompt);
      if (ok) {
        recordPromptVaultUse(item.id);
        refreshItems();
        showToast('Negative prompt copiado!');
      }
    }
  };

  const handleCopyUrl = async (item: PromptVaultItem) => {
    if (item.url) {
      const ok = await copyToClipboard(item.url);
      if (ok) {
        recordPromptVaultUse(item.id);
        refreshItems();
        showToast('URL copiada!');
      }
    }
  };

  const handleOpenLink = (item: PromptVaultItem) => {
    if (item.url) {
      recordPromptVaultUse(item.id);
      refreshItems();
      openVaultUrl(item.url);
    }
  };

  const getStatusBadge = (status: PromptVaultStatus) => {
    switch (status) {
      case 'approved':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">APROVADO</span>;
      case 'tested':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-blue-950/80 text-blue-400 border border-blue-800/60">TESTADO</span>;
      case 'draft':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-950/80 text-amber-400 border border-amber-800/60">RASCUNHO</span>;
      case 'archived':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-neutral-900 text-neutral-400 border border-neutral-800">ARQUIVADO</span>;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0A0A0B] text-neutral-200 overflow-y-auto p-4 md:p-8 space-y-6">
      {/* Toast Feedback */}
      {copyFeedback && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-lg shadow-xl font-mono text-xs flex items-center gap-2 animate-fade-in border border-emerald-400/40">
          <LucideIcon name="check-circle" className="w-4 h-4" />
          {copyFeedback}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-800/80 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
              <LucideIcon name="shield-check" className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Prompt Vault IA
                <span className="px-2 py-0.5 text-[10px] font-mono uppercase bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 rounded">PRO</span>
              </h1>
              <p className="text-xs md:text-sm text-neutral-400 mt-0.5">
                Biblioteca local de prompts, negative prompts, locks e links úteis.
              </p>
            </div>
          </div>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            icon="plus"
            onClick={() => handleOpenCreate('prompt')}
            className="shadow-md"
          >
            Novo Prompt
          </Button>
          <Button
            variant="secondary"
            icon="link"
            onClick={() => handleOpenCreate('link')}
            className="shadow-md"
          >
            Novo Link
          </Button>
        </div>
      </div>

      {/* Control Bar: Search & Filter Tabs */}
      <div className="space-y-3">
        {/* Search Bar */}
        <div className="relative">
          <LucideIcon name="search" className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            placeholder="Pesquisar por título, tags, prompt, categoria, link, ferramenta..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-[#121214] border border-neutral-800 rounded-lg pl-10 pr-10 py-2.5 text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all font-sans"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300"
            >
              <LucideIcon name="x" className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Pills & Selectors */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Main Filter Tabs */}
          <div className="flex items-center gap-1.5 bg-[#121214] p-1 rounded-lg border border-neutral-800">
            <button
              onClick={() => setFilterTab('all')}
              className={`px-3 py-1.5 rounded font-mono text-[11px] uppercase transition-all ${
                filterTab === 'all'
                  ? 'bg-neutral-800 text-white font-bold shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Todos ({items.length})
            </button>
            <button
              onClick={() => setFilterTab('prompts')}
              className={`px-3 py-1.5 rounded font-mono text-[11px] uppercase transition-all flex items-center gap-1.5 ${
                filterTab === 'prompts'
                  ? 'bg-emerald-600 text-white font-bold shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <LucideIcon name="file-text" className="w-3.5 h-3.5" />
              Prompts ({items.filter(i => i.type === 'prompt').length})
            </button>
            <button
              onClick={() => setFilterTab('links')}
              className={`px-3 py-1.5 rounded font-mono text-[11px] uppercase transition-all flex items-center gap-1.5 ${
                filterTab === 'links'
                  ? 'bg-blue-600 text-white font-bold shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <LucideIcon name="link" className="w-3.5 h-3.5" />
              Links ({items.filter(i => i.type === 'link').length})
            </button>
            <button
              onClick={() => setFilterTab('favorites')}
              className={`px-3 py-1.5 rounded font-mono text-[11px] uppercase transition-all flex items-center gap-1.5 ${
                filterTab === 'favorites'
                  ? 'bg-amber-600 text-white font-bold shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <LucideIcon name="star" className="w-3.5 h-3.5" />
              Favoritos ({items.filter(i => i.favorite).length})
            </button>
          </div>

          {/* Secondary Select Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Category Dropdown */}
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="bg-[#121214] border border-neutral-800 rounded px-2.5 py-1.5 text-xs text-neutral-300 focus:outline-none focus:border-neutral-600"
            >
              <option value="all">Todas Categorias</option>
              {PROMPT_VAULT_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            {/* Destination Tool Dropdown */}
            <select
              value={toolFilter}
              onChange={e => setToolFilter(e.target.value)}
              className="bg-[#121214] border border-neutral-800 rounded px-2.5 py-1.5 text-xs text-neutral-300 focus:outline-none focus:border-neutral-600"
            >
              <option value="all">Todas Ferramentas</option>
              {PROMPT_VAULT_DESTINATION_TOOLS.map(tool => (
                <option key={tool} value={tool}>{tool}</option>
              ))}
            </select>

            {/* Status Dropdown */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as PromptVaultStatusFilter)}
              className="bg-[#121214] border border-neutral-800 rounded px-2.5 py-1.5 text-xs text-neutral-300 focus:outline-none focus:border-neutral-600"
            >
              <option value="all">Todos Status</option>
              <option value="approved">Aprovado</option>
              <option value="tested">Testado</option>
              <option value="draft">Rascunho</option>
              <option value="archived">Arquivado</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid of Items */}
      {filteredItems.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center border-dashed border-neutral-800 bg-[#0c0c0e]">
          <div className="w-12 h-12 rounded-full bg-neutral-900 flex items-center justify-center text-neutral-600 mb-3">
            <LucideIcon name="folder-open" className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-neutral-300">Nenhum item encontrado no Vault</h3>
          <p className="text-xs text-neutral-500 max-w-sm mt-1">
            {searchQuery || filterTab !== 'all' || categoryFilter !== 'all' || toolFilter !== 'all' || statusFilter !== 'all'
              ? 'Tente ajustar ou limpar os filtros de busca aplicados.'
              : 'Clique em "Novo Prompt" ou "Novo Link" para salvar seus primeiros templates e conexões.'}
          </p>
          <div className="flex gap-2 mt-4">
            <Button variant="primary" icon="plus" onClick={() => handleOpenCreate('prompt')}>
              Novo Prompt
            </Button>
            <Button variant="secondary" icon="link" onClick={() => handleOpenCreate('link')}>
              Novo Link
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map(item => (
            <Card
              key={item.id}
              className="flex flex-col justify-between bg-[#111114] hover:border-neutral-700 transition-all border-neutral-800/90 shadow-md group relative overflow-hidden"
            >
              <div className="space-y-3">
                {/* Top Row: Type, Category, Tool & Favorite */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {item.type === 'prompt' ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/60 flex items-center gap-1">
                        <LucideIcon name="file-text" className="w-3 h-3" />
                        PROMPT
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-950 text-blue-400 border border-blue-800/60 flex items-center gap-1">
                        <LucideIcon name="link" className="w-3 h-3" />
                        LINK
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono text-neutral-400 bg-neutral-900 border border-neutral-800">
                      {item.category}
                    </span>
                    {item.destinationTool && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono text-purple-400 bg-purple-950/60 border border-purple-900/40">
                        {item.destinationTool}
                      </span>
                    )}
                    {getStatusBadge(item.status)}
                  </div>

                  {/* Favorite Button */}
                  <button
                    onClick={() => handleToggleFavorite(item)}
                    className={`p-1 rounded transition-colors ${
                      item.favorite
                        ? 'text-amber-400 hover:text-amber-300'
                        : 'text-neutral-600 hover:text-neutral-400'
                    }`}
                    title={item.favorite ? 'Remover dos favoritos' : 'Favoritar'}
                  >
                    <LucideIcon name="star" className={`w-4 h-4 ${item.favorite ? 'fill-amber-400' : ''}`} />
                  </button>
                </div>

                {/* Title */}
                <div>
                  <h3 className="font-semibold text-white text-sm line-clamp-1 group-hover:text-emerald-300 transition-colors">
                    {item.title}
                  </h3>
                  {item.productContext && (
                    <p className="text-[11px] text-neutral-400 line-clamp-1 mt-0.5">
                      <span className="text-neutral-500">Contexto:</span> {item.productContext}
                    </p>
                  )}
                </div>

                {/* Content Preview */}
                {item.type === 'prompt' ? (
                  <div className="space-y-2">
                    {item.mainPrompt && (
                      <div className="bg-[#0A0A0B] p-2.5 rounded border border-neutral-800 text-xs text-neutral-300 font-mono line-clamp-3 leading-relaxed select-all">
                        {item.mainPrompt}
                      </div>
                    )}
                    {item.negativePrompt && (
                      <div className="text-[10px] font-mono text-red-400/90 bg-red-950/20 px-2 py-1 rounded border border-red-900/30 line-clamp-1">
                        <span className="font-bold text-red-400">NEGATIVO:</span> {item.negativePrompt}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {item.url && (
                      <div className="flex items-center gap-2 bg-[#0A0A0B] p-2 rounded border border-neutral-800 text-xs text-blue-400 font-mono line-clamp-1">
                        <LucideIcon name="globe" className="w-3.5 h-3.5 shrink-0 text-neutral-500" />
                        <span className="truncate">{item.url}</span>
                      </div>
                    )}
                    {item.linkDescription && (
                      <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed">
                        {item.linkDescription}
                      </p>
                    )}
                  </div>
                )}

                {/* Tags & Notes */}
                {item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {item.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-1.5 py-0.5 rounded text-[9px] font-mono text-neutral-400 bg-neutral-900/80 border border-neutral-800"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Card Footer Actions */}
              <div className="pt-4 mt-3 border-t border-neutral-800/80 flex items-center justify-between gap-2">
                {/* Primary Action Buttons */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <Button
                    variant="ghost"
                    icon="eye"
                    onClick={() => setViewingItem(item)}
                    className="text-[10px] py-1.5 px-2 bg-neutral-900/90 text-neutral-300 hover:text-white hover:bg-neutral-800 border border-neutral-700/60"
                    title="Ver conteúdo completo do item"
                  >
                    Ver Prompt
                  </Button>
                  {item.type === 'prompt' ? (
                    <>
                      <Button
                        variant="primary"
                        icon="copy"
                        onClick={() => handleCopyPrompt(item)}
                        className="text-[10px] py-1.5 px-2.5"
                      >
                        Copiar
                      </Button>
                      {item.negativePrompt && (
                        <Button
                          variant="secondary"
                          icon="shield-alert"
                          onClick={() => handleCopyNegative(item)}
                          className="text-[10px] py-1.5 px-2 text-red-400 hover:text-red-300"
                          title="Copiar Negative Prompt"
                        >
                          Negativo
                        </Button>
                      )}
                    </>
                  ) : (
                    <>
                      <Button
                        variant="accent"
                        icon="external-link"
                        onClick={() => handleOpenLink(item)}
                        className="text-[10px] py-1.5 px-2.5"
                      >
                        Abrir
                      </Button>
                      <Button
                        variant="secondary"
                        icon="copy"
                        onClick={() => handleCopyUrl(item)}
                        className="text-[10px] py-1.5 px-2"
                        title="Copiar URL"
                      >
                        Link
                      </Button>
                    </>
                  )}
                </div>

                {/* Secondary Utility Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(item)}
                    className="p-1.5 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
                    title="Editar"
                  >
                    <LucideIcon name="edit" className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDuplicate(item.id)}
                    className="p-1.5 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
                    title="Duplicar"
                  >
                    <LucideIcon name="copy" className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id, item.title)}
                    className="p-1.5 rounded hover:bg-red-950 text-neutral-500 hover:text-red-400 transition-colors"
                    title="Excluir"
                  >
                    <LucideIcon name="trash" className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Prompt / Link Full Viewer Modal */}
      <PromptVaultItemViewer
        item={viewingItem}
        isOpen={Boolean(viewingItem)}
        onClose={() => setViewingItem(null)}
        onItemCopied={(itemId, message) => {
          recordPromptVaultUse(itemId);
          refreshItems();
          showToast(message);
        }}
      />

      {/* Modal for Create / Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111114] border border-neutral-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
              <div className="flex items-center gap-2">
                <LucideIcon
                  name={modalType === 'prompt' ? 'file-text' : 'link'}
                  className={`w-5 h-5 ${modalType === 'prompt' ? 'text-emerald-400' : 'text-blue-400'}`}
                />
                <h2 className="text-lg font-bold text-white">
                  {editingItem ? 'Editar Item no Vault' : modalType === 'prompt' ? 'Novo Prompt no Vault' : 'Novo Link no Vault'}
                </h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-white p-1 rounded hover:bg-neutral-800"
              >
                <LucideIcon name="x" className="w-5 h-5" />
              </button>
            </div>

            {/* Error banner */}
            {formError && (
              <div className="p-3 bg-red-950/60 border border-red-800/60 rounded text-xs text-red-300 flex items-center gap-2">
                <LucideIcon name="alert-circle" className="w-4 h-4 shrink-0 text-red-400" />
                <span>{formError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSaveModal} className="space-y-4">
              {/* Type Switcher (only for new items) */}
              {!editingItem && (
                <div className="flex items-center gap-2 p-1 bg-[#0A0A0B] rounded border border-neutral-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setModalType('prompt')}
                    className={`flex-1 py-1.5 rounded font-mono font-bold uppercase transition-all flex items-center justify-center gap-1.5 ${
                      modalType === 'prompt'
                        ? 'bg-emerald-600 text-white shadow'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    <LucideIcon name="file-text" className="w-3.5 h-3.5" />
                    Prompt / Lock
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalType('link')}
                    className={`flex-1 py-1.5 rounded font-mono font-bold uppercase transition-all flex items-center justify-center gap-1.5 ${
                      modalType === 'link'
                        ? 'bg-blue-600 text-white shadow'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    <LucideIcon name="link" className="w-3.5 h-3.5" />
                    Link / Agente
                  </button>
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-xs font-mono font-semibold text-neutral-300 mb-1">
                  Título do Item *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Skeleton Watch Advanced Lock, Prompt UGC Shopee..."
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  className="w-full bg-[#161619] border border-neutral-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Row: Category & Destination Tool */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono font-semibold text-neutral-300 mb-1">
                    Categoria
                  </label>
                  <select
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value)}
                    className="w-full bg-[#161619] border border-neutral-700 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    {PROMPT_VAULT_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono font-semibold text-neutral-300 mb-1">
                    Ferramenta de Destino
                  </label>
                  <select
                    value={formDestinationTool}
                    onChange={e => setFormDestinationTool(e.target.value)}
                    className="w-full bg-[#161619] border border-neutral-700 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    {PROMPT_VAULT_DESTINATION_TOOLS.map(tool => (
                      <option key={tool} value={tool}>{tool}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Specific fields for Link */}
              {modalType === 'link' ? (
                <>
                  <div>
                    <label className="block text-xs font-mono font-semibold text-neutral-300 mb-1">
                      URL de Destino *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="https://chatgpt.com/g/... ou https://flow.google..."
                      value={formUrl}
                      onChange={e => setFormUrl(e.target.value)}
                      className="w-full bg-[#161619] border border-neutral-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-semibold text-neutral-300 mb-1">
                      Descrição / Instruções do Link
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Ex: Agente GPT configurado com regras de ganchos virais para Shopee..."
                      value={formLinkDescription}
                      onChange={e => setFormLinkDescription(e.target.value)}
                      className="w-full bg-[#161619] border border-neutral-700 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 resize-y"
                    />
                  </div>
                </>
              ) : (
                /* Specific fields for Prompt */
                <>
                  <div>
                    <label className="block text-xs font-mono font-semibold text-neutral-300 mb-1">
                      Prompt Principal / Lock *
                    </label>
                    <textarea
                      rows={4}
                      required
                      placeholder="Insira o texto completo do prompt, lock ou mold..."
                      value={formMainPrompt}
                      onChange={e => setFormMainPrompt(e.target.value)}
                      className="w-full bg-[#161619] border border-neutral-700 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono resize-y"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-semibold text-neutral-300 mb-1 flex items-center justify-between">
                      <span>Negative Prompt (Opcional)</span>
                      <span className="text-[10px] text-neutral-500">Elementos a proibir</span>
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Ex: moving gears, subtitles, on-screen text, cartoon, low quality..."
                      value={formNegativePrompt}
                      onChange={e => setFormNegativePrompt(e.target.value)}
                      className="w-full bg-[#161619] border border-neutral-700 rounded px-3 py-2 text-xs text-red-300 focus:outline-none focus:border-red-500 font-mono resize-y"
                    />
                  </div>
                </>
              )}

              {/* Product Context */}
              <div>
                <label className="block text-xs font-mono font-semibold text-neutral-300 mb-1">
                  Contexto de Produto (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Relógio mecânico, Vestido floral, Suplemento, Cosméticos..."
                  value={formProductContext}
                  onChange={e => setFormProductContext(e.target.value)}
                  className="w-full bg-[#161619] border border-neutral-700 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Row: Tags & Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono font-semibold text-neutral-300 mb-1">
                    Tags (separadas por vírgula)
                  </label>
                  <input
                    type="text"
                    placeholder="relogio, lock, shopee, ugc"
                    value={formTags}
                    onChange={e => setFormTags(e.target.value)}
                    className="w-full bg-[#161619] border border-neutral-700 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-semibold text-neutral-300 mb-1">
                    Status de Validação
                  </label>
                  <select
                    value={formStatus}
                    onChange={e => setFormStatus(e.target.value as PromptVaultStatus)}
                    className="w-full bg-[#161619] border border-neutral-700 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="approved">Aprovado</option>
                    <option value="tested">Testado</option>
                    <option value="draft">Rascunho</option>
                    <option value="archived">Arquivado</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-mono font-semibold text-neutral-300 mb-1">
                  Notas Pessoais
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Testado no Flow com excelente resultado em vídeos de 8s..."
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  className="w-full bg-[#161619] border border-neutral-700 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 resize-y"
                />
              </div>

              {/* Favorite Checkbox */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="vault-favorite"
                  checked={formFavorite}
                  onChange={e => setFormFavorite(e.target.checked)}
                  className="rounded border-neutral-700 bg-neutral-900 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="vault-favorite" className="text-xs text-neutral-300 cursor-pointer select-none">
                  Marcar como Favorito
                </label>
              </div>

              {/* Submit / Cancel buttons */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-neutral-800">
                <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </Button>
                <Button variant="primary" type="submit" icon="check">
                  {editingItem ? 'Salvar Alterações' : 'Adicionar ao Vault'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
