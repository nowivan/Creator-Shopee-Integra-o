import React, { useState, useEffect, useRef } from 'react';
import { LucideIcon } from './Common';

interface NavigationItem {
    id: string;
    label: string;
    icon: string;
    badge?: string;
}

interface NavigationSection {
    title: string;
    items: NavigationItem[];
}

interface GlobalSearchProps {
    navigationSections: NavigationSection[];
    onSelectView: (viewId: string) => void;
    activeView: string;
}

export function GlobalSearch({ navigationSections, onSelectView, activeView }: GlobalSearchProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const resultsContainerRef = useRef<HTMLDivElement>(null);

    // Flatten all items with their section headers for easier search and consistent keyboard nav
    const allItems = React.useMemo(() => {
        const list: { item: NavigationItem; sectionTitle: string }[] = [];
        navigationSections.forEach(section => {
            section.items.forEach(item => {
                list.push({ item, sectionTitle: section.title });
            });
        });
        return list;
    }, [navigationSections]);

    // Filter results based on search term
    const matchedItems = React.useMemo(() => {
        if (!searchTerm.trim()) {
            return allItems; // default shows all grouped
        }
        const term = searchTerm.toLowerCase().trim();
        return allItems.filter(entry => {
            return (
                entry.item.label.toLowerCase().includes(term) ||
                entry.item.id.toLowerCase().includes(term) ||
                entry.sectionTitle.toLowerCase().includes(term)
            );
        });
    }, [searchTerm, allItems]);

    // Reset cursor when query changes
    useEffect(() => {
        setSelectedIndex(0);
    }, [searchTerm]);

    // Keyboard Shortcuts listener (Ctrl+K, Cmd+K, '/')
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Hotkeys: Ctrl+K or Cmd+K or '/' (only if not already typing in another input element)
            const isInputFocused = 
                document.activeElement?.tagName === 'INPUT' || 
                document.activeElement?.tagName === 'TEXTAREA' || 
                (document.activeElement as any)?.isContentEditable === true;

            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setIsOpen(prev => !prev);
            } else if (e.key === '/' && !isInputFocused) {
                e.preventDefault();
                setIsOpen(true);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Focus input when search gets opened
    useEffect(() => {
        if (isOpen) {
            // small delay to allow DOM transition rendering
            const timer = setTimeout(() => {
                inputRef.current?.focus();
            }, 50);
            return () => clearTimeout(timer);
        } else {
            setSearchTerm('');
        }
    }, [isOpen]);

    // Auto-scroll selected item into view inside the dropdown box
    useEffect(() => {
        if (resultsContainerRef.current) {
            const container = resultsContainerRef.current;
            const selectedElement = container.children[selectedIndex] as HTMLElement;
            if (selectedElement) {
                const containerTop = container.scrollTop;
                const containerBottom = containerTop + container.clientHeight;
                const elemTop = selectedElement.offsetTop;
                const elemBottom = elemTop + selectedElement.clientHeight;

                if (elemTop < containerTop) {
                    container.scrollTop = elemTop;
                } else if (elemBottom > containerBottom) {
                    container.scrollTop = elemBottom - container.clientHeight;
                }
            }
        }
    }, [selectedIndex]);

    const handleSelect = (viewId: string) => {
        onSelectView(viewId);
        setIsOpen(false);
        setSearchTerm('');
    };

    // Keyboard navigation inside open palette modal
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev + 1) % Math.max(1, matchedItems.length));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev - 1 + matchedItems.length) % Math.max(1, matchedItems.length));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (matchedItems[selectedIndex]) {
                handleSelect(matchedItems[selectedIndex].item.id);
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            setIsOpen(false);
        }
    };

    return (
        <div className="relative font-sans text-neutral-300">
            {/* Search Trigger Button in Header */}
            <button
                id="header-search-trigger"
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-[#0F0F11] border border-neutral-800 rounded-lg text-xs font-mono font-bold text-neutral-500 hover:text-neutral-300 hover:border-neutral-700 transition duration-150 cursor-pointer select-none max-w-xs md:w-64 text-left w-auto sm:w-48"
            >
                <LucideIcon name="search" className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                <span className="truncate flex-grow hidden sm:inline">Buscar ferramenta...</span>
                <span className="truncate flex-grow inline sm:hidden text-[10px]">Buscar</span>
                <kbd className="hidden md:inline-flex h-4 select-none items-center gap-0.5 rounded border border-neutral-800 bg-neutral-950 px-1 font-mono text-[9px] font-medium text-neutral-600">
                    <span className="text-[8px]">⌘</span>K
                </kbd>
            </button>

            {/* Modal Command Palette Backdrop */}
            {isOpen && (
                <div 
                    id="search-backdrop"
                    className="fixed inset-0 bg-black/85 backdrop-blur-md z-[150] flex items-start justify-center pt-20 px-4 transition-all duration-200 animate-fade-in"
                    onClick={() => setIsOpen(false)}
                >
                    {/* Panel Container */}
                    <div 
                        id="search-palette-modal"
                        className="bg-[#0F0F11] border border-neutral-800 rounded-xl w-full max-w-lg shadow-2xl shadow-black/90 overflow-hidden flex flex-col max-h-[460px] animate-scale-up"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Search Input Bar */}
                        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-neutral-800 bg-[#121214]">
                            <LucideIcon name="search" className="w-4 h-4 text-emerald-400 shrink-0" />
                            <input
                                ref={inputRef}
                                type="text"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Para onde gostaria de navegar? (ex: Copy Master)"
                                className="bg-transparent text-sm font-sans font-medium text-neutral-100 placeholder-neutral-500 outline-none w-full"
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="p-1 hover:bg-neutral-800 rounded text-neutral-500 hover:text-neutral-350 transition"
                                >
                                    <LucideIcon name="x" className="w-3.5 h-3.5" />
                                </button>
                            )}
                            <div className="text-[10px] font-mono font-bold text-neutral-600 bg-neutral-950 border border-neutral-800 px-1.5 py-0.5 rounded uppercase select-none shrink-0">
                                ESC
                            </div>
                        </div>

                        {/* Search Results Display */}
                        <div 
                            ref={resultsContainerRef}
                            className="flex-grow overflow-y-auto max-h-[340px] p-2 space-y-1 custom-scrollbar bg-[#09090B]"
                        >
                            {matchedItems.length > 0 ? (
                                matchedItems.map((entry, index) => {
                                    const isCurrent = entry.item.id === activeView;
                                    const isFocused = index === selectedIndex;
                                    return (
                                        <button
                                            key={entry.item.id}
                                            onClick={() => handleSelect(entry.item.id)}
                                            onMouseEnter={() => setSelectedIndex(index)}
                                            className={`w-full text-left p-2.5 rounded-lg transition-all flex items-center justify-between group text-xs cursor-pointer ${isFocused ? 'bg-[#121214] border border-neutral-800 text-white' : 'border border-transparent text-neutral-400 hover:text-neutral-200'}`}
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className={`p-1.5 rounded-md ${isFocused ? 'bg-[#18181C] text-emerald-400' : 'bg-[#0E0E10] text-neutral-500 group-hover:text-neutral-350'}`}>
                                                    <LucideIcon name={entry.item.icon} className="w-4 h-4" />
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className={`font-semibold font-sans ${isFocused ? 'text-white' : 'text-neutral-200'}`}>
                                                        {entry.item.label}
                                                    </span>
                                                    <span className="text-[10px] text-neutral-500 font-mono uppercase tracking-wider leading-none mt-0.5">
                                                        {entry.sectionTitle}
                                                    </span>
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center gap-2 shrink-0">
                                                {entry.item.badge && (
                                                    <span className="bg-emerald-950/40 border border-emerald-900/30 text-emerald-400 text-[8px] font-mono font-extrabold px-1.5 py-0.5 rounded-md scale-95 uppercase">
                                                        {entry.item.badge}
                                                    </span>
                                                )}
                                                {isCurrent && (
                                                    <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/25 px-1.5 py-0.5 rounded uppercase leading-none">
                                                        Atual
                                                    </span>
                                                )}
                                                {isFocused && (
                                                    <div className="text-[9px] font-mono text-neutral-500 uppercase font-bold tracking-wider hidden sm:inline-flex items-center gap-1 opacity-75">
                                                        <span>Selecionar</span>
                                                        <LucideIcon name="corner-down-left" className="w-2.5 h-2.5" />
                                                    </div>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })
                            ) : (
                                <div className="py-12 text-center text-neutral-500 space-y-2">
                                    <LucideIcon name="alert-circle" className="w-8 h-8 text-neutral-600 mx-auto animate-bounce" />
                                    <p className="text-xs font-sans font-semibold">Nenhuma ferramenta de criação encontrada</p>
                                    <p className="text-[10px] text-neutral-600 font-mono uppercase">Tente consultar outro termo ou categoria</p>
                                </div>
                            )}
                        </div>

                        {/* Search Panel Tip Footer */}
                        <div className="px-4 py-2 bg-[#0C0C0E] border-t border-neutral-800 flex justify-between items-center text-[9px] font-mono font-bold text-neutral-500 select-none">
                            <div className="flex items-center gap-3">
                                <span className="flex items-center gap-1">
                                    <kbd className="border border-neutral-800 bg-neutral-900 px-1 rounded">↑</kbd>
                                    <kbd className="border border-neutral-800 bg-neutral-900 px-1 rounded">↓</kbd>
                                    Navegar
                                </span>
                                <span className="flex items-center gap-1">
                                    <kbd className="border border-neutral-800 bg-neutral-900 px-1 rounded">Enter</kbd>
                                    Abrir
                                </span>
                            </div>
                            <div>
                                {matchedItems.length} resultado{matchedItems.length !== 1 && 's'}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
