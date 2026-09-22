import React, { useState } from 'react';
import { LucideIcon, Button } from './Common';
import { PromptVaultItem, PromptVaultStatus } from '../features/prompt-vault/types';
import {
  copyToClipboard,
  formatPromptVaultItemCopyAll,
  openVaultUrl
} from '../features/prompt-vault/promptVaultUtils';

interface PromptVaultItemViewerProps {
  item: PromptVaultItem | null;
  isOpen: boolean;
  onClose: () => void;
  onItemCopied?: (itemId: string, message: string) => void;
}

export function PromptVaultItemViewer({
  item,
  isOpen,
  onClose,
  onItemCopied
}: PromptVaultItemViewerProps) {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  if (!isOpen || !item) return null;

  const handleCopySection = async (sectionKey: string, text: string, successLabel: string) => {
    if (!text) return;
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedSection(sectionKey);
      setTimeout(() => setCopiedSection(null), 2500);
      onItemCopied?.(item.id, successLabel);
    }
  };

  const handleCopyAll = async () => {
    const formatted = formatPromptVaultItemCopyAll(item);
    if (!formatted) return;
    const ok = await copyToClipboard(formatted);
    if (ok) {
      setCopiedSection('all');
      setTimeout(() => setCopiedSection(null), 2500);
      onItemCopied?.(item.id, 'Todos os dados copiados!');
    }
  };

  const getStatusBadge = (status: PromptVaultStatus) => {
    switch (status) {
      case 'approved':
        return (
          <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
            APROVADO
          </span>
        );
      case 'tested':
        return (
          <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-blue-950/80 text-blue-400 border border-blue-800/60">
            TESTADO
          </span>
        );
      case 'draft':
        return (
          <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-950/80 text-amber-400 border border-amber-800/60">
            RASCUNHO
          </span>
        );
      case 'archived':
        return (
          <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-neutral-900 text-neutral-400 border border-neutral-800">
            ARQUIVADO
          </span>
        );
    }
  };

  const formatDate = (timestamp?: number | null) => {
    if (!timestamp) return null;
    try {
      return new Date(timestamp).toLocaleString('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short'
      });
    } catch {
      return null;
    }
  };

  const hasMainPrompt = Boolean(item.mainPrompt && item.mainPrompt.trim());
  const hasNegativePrompt = Boolean(item.negativePrompt && item.negativePrompt.trim());
  const hasProductContext = Boolean(item.productContext && item.productContext.trim());
  const hasNotes = Boolean(item.notes && item.notes.trim());
  const hasUrl = Boolean(item.url && item.url.trim());
  const hasLinkDescription = Boolean(item.linkDescription && item.linkDescription.trim());
  const hasDomain = Boolean(item.domain && item.domain.trim());

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 md:p-6"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[#111114] border border-neutral-800 rounded-xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-neutral-800 bg-[#141418] shrink-0 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {item.type === 'prompt' ? (
                <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/60 flex items-center gap-1.5">
                  <LucideIcon name="file-text" className="w-3.5 h-3.5" />
                  PROMPT
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-blue-950 text-blue-400 border border-blue-800/60 flex items-center gap-1.5">
                  <LucideIcon name="link" className="w-3.5 h-3.5" />
                  LINK
                </span>
              )}
              <span className="px-2.5 py-1 rounded text-xs font-mono text-neutral-300 bg-neutral-900 border border-neutral-800">
                {item.category}
              </span>
              {item.destinationTool && (
                <span className="px-2.5 py-1 rounded text-xs font-mono text-purple-300 bg-purple-950/60 border border-purple-900/40">
                  {item.destinationTool}
                </span>
              )}
              {getStatusBadge(item.status)}
              {item.favorite && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono text-amber-400 bg-amber-950/50 border border-amber-800/40 flex items-center gap-1">
                  <LucideIcon name="star" className="w-3 h-3 fill-amber-400" />
                  Favorito
                </span>
              )}
            </div>

            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-white p-1.5 rounded-lg hover:bg-neutral-800 transition-colors shrink-0"
              title="Fechar (ESC)"
            >
              <LucideIcon name="x" className="w-5 h-5" />
            </button>
          </div>

          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight break-words">
              {item.title}
            </h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-neutral-400">
              {item.createdAt && (
                <span>
                  Criado em: <strong className="text-neutral-300 font-mono">{formatDate(item.createdAt)}</strong>
                </span>
              )}
              {item.updatedAt && (
                <span>
                  Atualizado em: <strong className="text-neutral-300 font-mono">{formatDate(item.updatedAt)}</strong>
                </span>
              )}
              <span>
                Usos: <strong className="text-emerald-400 font-mono">{item.useCount || 0}</strong>
              </span>
            </div>
          </div>

          {/* Tags */}
          {item.tags && item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {item.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded text-[10px] font-mono text-neutral-300 bg-neutral-900/90 border border-neutral-800"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Section 1: Prompt Principal */}
          {hasMainPrompt && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <LucideIcon name="file-text" className="w-3.5 h-3.5" />
                  1. Prompt Principal
                </label>
                <button
                  onClick={() => handleCopySection('mainPrompt', item.mainPrompt!, 'Prompt principal copiado!')}
                  className={`px-2.5 py-1 rounded text-xs font-mono font-semibold transition-all flex items-center gap-1 border ${
                    copiedSection === 'mainPrompt'
                      ? 'bg-emerald-600 text-white border-emerald-500'
                      : 'bg-neutral-900 text-neutral-300 hover:text-white border-neutral-700 hover:border-neutral-600'
                  }`}
                >
                  <LucideIcon
                    name={copiedSection === 'mainPrompt' ? 'check' : 'copy'}
                    className="w-3 h-3"
                  />
                  {copiedSection === 'mainPrompt' ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
              <div className="bg-[#0A0A0B] p-3.5 rounded-lg border border-neutral-800 text-xs sm:text-sm text-neutral-200 font-mono leading-relaxed whitespace-pre-wrap select-all">
                {item.mainPrompt}
              </div>
            </div>
          )}

          {/* Section 2: Negative Prompt */}
          {hasNegativePrompt && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono font-bold uppercase tracking-wider text-red-400 flex items-center gap-1.5">
                  <LucideIcon name="shield-alert" className="w-3.5 h-3.5" />
                  2. Negative Prompt
                </label>
                <button
                  onClick={() => handleCopySection('negativePrompt', item.negativePrompt!, 'Negative prompt copiado!')}
                  className={`px-2.5 py-1 rounded text-xs font-mono font-semibold transition-all flex items-center gap-1 border ${
                    copiedSection === 'negativePrompt'
                      ? 'bg-red-600 text-white border-red-500'
                      : 'bg-neutral-900 text-neutral-300 hover:text-white border-neutral-700 hover:border-neutral-600'
                  }`}
                >
                  <LucideIcon
                    name={copiedSection === 'negativePrompt' ? 'check' : 'copy'}
                    className="w-3 h-3"
                  />
                  {copiedSection === 'negativePrompt' ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
              <div className="bg-red-950/15 p-3.5 rounded-lg border border-red-900/30 text-xs sm:text-sm text-red-300 font-mono leading-relaxed whitespace-pre-wrap select-all">
                {item.negativePrompt}
              </div>
            </div>
          )}

          {/* Section 3: Contexto do Produto */}
          {hasProductContext && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-1.5">
                  <LucideIcon name="package" className="w-3.5 h-3.5 text-amber-400" />
                  3. Contexto do Produto
                </label>
                <button
                  onClick={() => handleCopySection('productContext', item.productContext!, 'Contexto do produto copiado!')}
                  className={`px-2.5 py-1 rounded text-xs font-mono font-semibold transition-all flex items-center gap-1 border ${
                    copiedSection === 'productContext'
                      ? 'bg-amber-600 text-white border-amber-500'
                      : 'bg-neutral-900 text-neutral-300 hover:text-white border-neutral-700 hover:border-neutral-600'
                  }`}
                >
                  <LucideIcon
                    name={copiedSection === 'productContext' ? 'check' : 'copy'}
                    className="w-3 h-3"
                  />
                  {copiedSection === 'productContext' ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
              <div className="bg-[#0A0A0B] p-3.5 rounded-lg border border-neutral-800 text-xs sm:text-sm text-neutral-300 font-mono leading-relaxed whitespace-pre-wrap select-all">
                {item.productContext}
              </div>
            </div>
          )}

          {/* Section 4: Notas */}
          {hasNotes && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-1.5">
                  <LucideIcon name="clipboard-list" className="w-3.5 h-3.5 text-blue-400" />
                  4. Notas
                </label>
                <button
                  onClick={() => handleCopySection('notes', item.notes!, 'Notas copiadas!')}
                  className={`px-2.5 py-1 rounded text-xs font-mono font-semibold transition-all flex items-center gap-1 border ${
                    copiedSection === 'notes'
                      ? 'bg-blue-600 text-white border-blue-500'
                      : 'bg-neutral-900 text-neutral-300 hover:text-white border-neutral-700 hover:border-neutral-600'
                  }`}
                >
                  <LucideIcon
                    name={copiedSection === 'notes' ? 'check' : 'copy'}
                    className="w-3 h-3"
                  />
                  {copiedSection === 'notes' ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
              <div className="bg-[#0A0A0B] p-3.5 rounded-lg border border-neutral-800 text-xs sm:text-sm text-neutral-300 font-sans leading-relaxed whitespace-pre-wrap select-all">
                {item.notes}
              </div>
            </div>
          )}

          {/* Section 5: Link / URL */}
          {hasUrl && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                  <LucideIcon name="globe" className="w-3.5 h-3.5" />
                  5. Link / URL
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      openVaultUrl(item.url!);
                      onItemCopied?.(item.id, 'Link aberto no navegador');
                    }}
                    className="px-2.5 py-1 rounded text-xs font-mono font-semibold transition-all flex items-center gap-1 bg-blue-950/80 text-blue-300 hover:text-white border border-blue-800/60 hover:border-blue-700"
                  >
                    <LucideIcon name="external-link" className="w-3 h-3" />
                    Abrir Link
                  </button>
                  <button
                    onClick={() => handleCopySection('url', item.url!, 'URL copiada!')}
                    className={`px-2.5 py-1 rounded text-xs font-mono font-semibold transition-all flex items-center gap-1 border ${
                      copiedSection === 'url'
                        ? 'bg-blue-600 text-white border-blue-500'
                        : 'bg-neutral-900 text-neutral-300 hover:text-white border-neutral-700 hover:border-neutral-600'
                    }`}
                  >
                    <LucideIcon
                      name={copiedSection === 'url' ? 'check' : 'copy'}
                      className="w-3 h-3"
                    />
                    {copiedSection === 'url' ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
              </div>
              <div className="bg-[#0A0A0B] p-3 rounded-lg border border-neutral-800 text-xs sm:text-sm text-blue-400 font-mono break-all select-all">
                {item.url}
              </div>
            </div>
          )}

          {/* Section 6: Descrição do Link */}
          {hasLinkDescription && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-1.5">
                  <LucideIcon name="info" className="w-3.5 h-3.5 text-blue-400" />
                  6. Descrição do Link
                </label>
                <button
                  onClick={() => handleCopySection('linkDescription', item.linkDescription!, 'Descrição do link copiada!')}
                  className={`px-2.5 py-1 rounded text-xs font-mono font-semibold transition-all flex items-center gap-1 border ${
                    copiedSection === 'linkDescription'
                      ? 'bg-blue-600 text-white border-blue-500'
                      : 'bg-neutral-900 text-neutral-300 hover:text-white border-neutral-700 hover:border-neutral-600'
                  }`}
                >
                  <LucideIcon
                    name={copiedSection === 'linkDescription' ? 'check' : 'copy'}
                    className="w-3 h-3"
                  />
                  {copiedSection === 'linkDescription' ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
              <div className="bg-[#0A0A0B] p-3.5 rounded-lg border border-neutral-800 text-xs sm:text-sm text-neutral-300 font-sans leading-relaxed whitespace-pre-wrap select-all">
                {item.linkDescription}
              </div>
            </div>
          )}

          {/* Section 7: Domínio */}
          {hasDomain && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                  <LucideIcon name="server" className="w-3.5 h-3.5 text-neutral-400" />
                  7. Domínio
                </label>
                <button
                  onClick={() => handleCopySection('domain', item.domain!, 'Domínio copiado!')}
                  className={`px-2.5 py-1 rounded text-xs font-mono font-semibold transition-all flex items-center gap-1 border ${
                    copiedSection === 'domain'
                      ? 'bg-neutral-700 text-white border-neutral-600'
                      : 'bg-neutral-900 text-neutral-300 hover:text-white border-neutral-700 hover:border-neutral-600'
                  }`}
                >
                  <LucideIcon
                    name={copiedSection === 'domain' ? 'check' : 'copy'}
                    className="w-3 h-3"
                  />
                  {copiedSection === 'domain' ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
              <div className="bg-[#0A0A0B] p-2.5 rounded-lg border border-neutral-800 text-xs font-mono text-neutral-300 select-all">
                {item.domain}
              </div>
            </div>
          )}
        </div>

        {/* Global Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-neutral-800 bg-[#141418] shrink-0 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {hasMainPrompt && (
              <Button
                variant="primary"
                icon="file-text"
                onClick={() => handleCopySection('mainPrompt', item.mainPrompt!, 'Prompt principal copiado!')}
                className="text-xs"
              >
                Copiar Prompt Principal
              </Button>
            )}
            {hasNegativePrompt && (
              <Button
                variant="secondary"
                icon="shield-alert"
                onClick={() => handleCopySection('negativePrompt', item.negativePrompt!, 'Negative prompt copiado!')}
                className="text-xs text-red-400 hover:text-red-300"
              >
                Copiar Negative
              </Button>
            )}
            <Button
              variant="accent"
              icon={copiedSection === 'all' ? 'check' : 'copy'}
              onClick={handleCopyAll}
              className="text-xs"
            >
              {copiedSection === 'all' ? 'Tudo Copiado!' : 'Copiar Tudo'}
            </Button>
          </div>

          <Button variant="ghost" onClick={onClose} className="text-xs">
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}
