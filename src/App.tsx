import { useState, useEffect, useRef } from 'react';
import { LucideIcon, Button } from './components/Common';
import { useFirebase } from './context/FirebaseContext';
import { sessionStore, WORKER_URL, WORKER_TOKEN } from './utils';
import { usageTelemetry } from './services/usageTelemetryService';
import { checkWorkerHealth } from './utils/api';
import { DashboardView } from './components/DashboardView';
import { VanessaShopView } from './components/VanessaShopView';
import { IdentityHub } from './components/IdentityHub';
import { ChatView } from './components/ChatView';
import { IdeationView } from './components/IdeationView';
import { CopyMasterView } from './components/CopyMasterView';
import { ScriptRefinerView } from './components/ScriptRefinerView';
import { HookGeneratorView } from './components/HookGeneratorView';
import { ReverseEngineeringView, CinematicEngineView } from './components/ReverseEngineeringView';
import { CreativeDirectorView } from './components/CreativeDirectorView';
import { CollageStudioView } from './components/CollageStudioView';
import { ProductListingGeneratorView } from './components/ProductListingGeneratorView';
import { 
    TryOnView, 
    TranslatorView, 
    ImageDescriberView, 
    MagicPromptView, 
    PromptRefinerView, 
    ImagePromptExtractorView 
} from './components/CreativeStudio';
import { TikTokLegalView, AuditView } from './components/ComplianceTools';
import { LyriaMusicView, TranscriptionView } from './components/AudioTools';
import { HistoryView, NotFoundView, ErrorBoundary } from './components/UtilityViews';
import { PromptVaultView } from './components/PromptVaultView';
import { NewProjectPage } from './features/ai-video-project';
import { AgenteDeCopyView } from './features/agente-de-copy';
import { AgenteDeCopyCleanView } from './features/agente-de-copy-clean';
import { ShopeeCopyView } from './features/shopee-copy';
import { VisualReferenceAgent } from './features/visual-reference-engine';
import { GlobalSearch } from './components/GlobalSearch';
import { BookmarkModal } from './components/BookmarkModal';
import { AuthModal } from './components/AuthModal';
import { AuthGate } from './components/AuthGate';
import { useCredits } from './context/CreditContext';
import { CreditBalanceBadge } from './components/credits/CreditBalanceBadge';
import { PlanAndCreditsModal } from './components/credits/PlanAndCreditsModal';
import { InsufficientCreditsModal } from './components/credits/InsufficientCreditsModal';
import { LockedToolBanner } from './components/credits/LockedToolBanner';
import { VideoEngineHealthPanel } from './components/telemetry/VideoEngineHealthPanel';
import { isToolAllowedForPlan } from './services/planRegistry';

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

let appRenderCount = 0;

export default function App() {
    const { 
        user, 
        login, 
        logout, 
        preferences, 
        savePreferences, 
        addHistory, 
        isEmailVerified, 
        resendEmailVerification, 
        refreshVerificationStatus,
        authLoading,
        isAuthenticated,
        isQuotaExceeded
    } = useFirebase();

    const { plan } = useCredits();

    if (process.env.NODE_ENV !== 'production') {
        appRenderCount++;
        console.log(`[DEBUG] App render count: ${appRenderCount} | authLoading: ${authLoading} | isAuthenticated: ${isAuthenticated}`);
    }

    useEffect(() => {
        if (process.env.NODE_ENV !== 'production') {
            console.log('[DEBUG] App (MainAppShell) component MOUNTED');
            return () => {
                console.log('[DEBUG] App (MainAppShell) component UNMOUNTED');
            };
        }
    }, []);

    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [authModalTab, setAuthModalTab] = useState<'login' | 'register' | 'forgot'>('login');
    const [resendingEmail, setResendingEmail] = useState(false);
    const [resendNotification, setResendNotification] = useState<string | null>(null);

    const handleResendEmail = async () => {
        setResendingEmail(true);
        setResendNotification(null);
        try {
            await resendEmailVerification();
            setResendNotification("Link enviado com sucesso!");
            setTimeout(() => setResendNotification(null), 5000);
        } catch (err: any) {
            setResendNotification(err.message || "Erro ao reenviar link.");
            setTimeout(() => setResendNotification(null), 5000);
        } finally {
            setResendingEmail(false);
        }
    };

    const [activeView, setActiveView] = useState('dashboard');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const isRestoringRef = useRef(false);

    useEffect(() => {
        if (process.env.NODE_ENV !== 'production') {
            console.log(`[DEBUG] activeView changed to: ${activeView}`);
        }
        if (activeView) {
            usageTelemetry.trackToolOpen(activeView);
        }
    }, [activeView]);

    // Deep-link protection and delayed local storage state restoration
    useEffect(() => {
        if (!authLoading) {
            if (isAuthenticated) {
                try {
                    const saved = localStorage.getItem('robizin_active_view');
                    if (saved) {
                        setActiveView(saved);
                    }
                } catch (e) {
                    console.warn('[AUTOSAVE] Error reading initial active view:', e);
                }

                try {
                    const saved = localStorage.getItem('robizin_is_sidebar_open');
                    if (saved !== null) {
                        setIsSidebarOpen(saved === 'true');
                    }
                } catch (e) {
                    console.warn('[AUTOSAVE] Error reading initial sidebar state:', e);
                }
            } else {
                // Hard reset active view to dashboard for unauthenticated sessions
                setActiveView('dashboard');
            }
        }
    }, [authLoading, isAuthenticated]);

    // Listener for custom open-auth-modal event
    useEffect(() => {
        const handleOpenAuth = () => {
            setAuthModalTab('login');
            setIsAuthModalOpen(true);
        };
        window.addEventListener('open-auth-modal', handleOpenAuth);
        return () => window.removeEventListener('open-auth-modal', handleOpenAuth);
    }, []);

    // Synchronize Firestore preferences if they are loaded
    useEffect(() => {
        if (authLoading || !isAuthenticated) return;
        if (preferences) {
            let changed = false;
            if (preferences.activeView && preferences.activeView !== activeView) {
                isRestoringRef.current = true;
                setActiveView(preferences.activeView);
                changed = true;
            }
            if (preferences.isSidebarOpen !== undefined && preferences.isSidebarOpen !== isSidebarOpen) {
                isRestoringRef.current = true;
                setIsSidebarOpen(preferences.isSidebarOpen);
                changed = true;
            }
            if (!changed) {
                isRestoringRef.current = false;
            }
        }
    }, [preferences, authLoading, isAuthenticated]);

    const [proxyStatus, setProxyStatus] = useState<'checking' | 'online' | 'offline' | 'network_error' | 'error_cors' | 'method_mismatch' | 'invalid_token' | 'route_missing'>('checking');
    const [isBookmarkModalOpen, setIsBookmarkModalOpen] = useState(false);
    const [bookmarkUpdateTrigger, setBookmarkUpdateTrigger] = useState(0);
    const [lastSaveSecs, setLastSaveSecs] = useState(0);

    // Automatically persist active view and sidebar states immediately on change
    useEffect(() => {
        if (authLoading || !isAuthenticated) return;
        
        sessionStore.set('activeView', activeView);
        sessionStore.set('isSidebarOpen', isSidebarOpen);
        
        try {
            localStorage.setItem('robizin_active_view', activeView);
            localStorage.setItem('robizin_is_sidebar_open', JSON.stringify(isSidebarOpen));
        } catch (e) {
            console.warn('[AUTOSAVE] Error persisting UI states on change:', e);
        }

        // If we are currently restoring preferences from Firestore, skip writing them back
        if (isRestoringRef.current) {
            isRestoringRef.current = false;
            return;
        }

        // Prevent writing to Firestore if the values are already in sync with preferences
        const preferencesDiffers = !preferences || 
            preferences.activeView !== activeView || 
            preferences.isSidebarOpen !== isSidebarOpen;

        if (user && preferencesDiffers) {
            savePreferences(activeView, isSidebarOpen);
        }
    }, [activeView, isSidebarOpen, user, authLoading, isAuthenticated]);

    // Add to history on activeView change
    useEffect(() => {
        if (authLoading || !isAuthenticated) return;
        addHistory(activeView);
    }, [activeView, authLoading, isAuthenticated]);

    // Background ticking auto-save: enforces a hard write of view state metadata to localStorage every 30 seconds
    useEffect(() => {
        if (authLoading || !isAuthenticated) return;
        const timer = setInterval(() => {
            setLastSaveSecs(prev => {
                if (prev >= 29) {
                    try {
                        localStorage.setItem('robizin_active_view', activeView);
                        localStorage.setItem('robizin_is_sidebar_open', JSON.stringify(isSidebarOpen));
                        localStorage.setItem('robizin_last_view_state_save', new Date().toISOString());
                        console.log(`[AUTOSAVE Engine] Autowrote state of active view "${activeView}" to localStorage.`);
                    } catch (e) {
                        console.error('[AUTOSAVE Engine] Autowrite state check exception:', e);
                    }
                    return 0;
                }
                return prev + 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [activeView, isSidebarOpen, authLoading, isAuthenticated]);

    // Permanent API Key config for the proxy connection as required by rules
    const apiKey = "proxy-enabled";

    // Startup health check to verify Cloudflare Worker proxy connection using checkWorkerHealth
    useEffect(() => {
        const checkProxy = async () => {
            try {
                const result = await checkWorkerHealth(WORKER_URL, WORKER_TOKEN);
                const httpStatus = result.httpStatus;

                if (result.status === 'Proxy Online') {
                    setProxyStatus('online');
                } else if (result.status === 'Proxy Online — Method mismatch' || httpStatus === 405) {
                    setProxyStatus('method_mismatch');
                } else if (result.status === 'Token Inválido' || httpStatus === 401) {
                    setProxyStatus('invalid_token');
                } else if (result.status === 'Rota Inexistente' || httpStatus === 404) {
                    setProxyStatus('route_missing');
                } else if (result.status === 'Erro de CORS') {
                    setProxyStatus('error_cors');
                } else {
                    const lowercaseErr = (result.detailedError || "").toLowerCase();
                    const isNetworkOrConnectionError = 
                        lowercaseErr.includes("tempo limite") || 
                        lowercaseErr.includes("timeout") || 
                        lowercaseErr.includes("fetch") || 
                        lowercaseErr.includes("rede") || 
                        lowercaseErr.includes("conexão") ||
                        lowercaseErr.includes("network") ||
                        lowercaseErr.includes("dns") ||
                        lowercaseErr.includes("cors") ||
                        lowercaseErr.includes("endpoint") ||
                        result.status === 'Checking' ||
                        httpStatus === 502 ||
                        httpStatus === 503 ||
                        httpStatus === 504 ||
                        httpStatus === 'Falha de Conectividade';

                    if (isNetworkOrConnectionError) {
                        setProxyStatus('network_error');
                    } else {
                        setProxyStatus('offline');
                    }
                }
            } catch (err: any) {
                console.warn("Proxy connection check error fallback:", err);
                setProxyStatus('network_error');
            }
        };

        checkProxy();
        const interval = setInterval(checkProxy, 15000); // Poll status every 15s to keep real-time
        return () => clearInterval(interval);
    }, []);

    // Navigation dispatch event listener for cross-panel integrations
    useEffect(() => {
        const handleViewChange = (e: Event) => {
            const customEvent = e as CustomEvent;
            if (customEvent.detail) {
                setActiveView(customEvent.detail);
            }
        };
        window.addEventListener('change-active-view', handleViewChange);
        return () => window.removeEventListener('change-active-view', handleViewChange);
    }, []);

    const navigationSections: NavigationSection[] = [
        {
            title: "Hub Principal",
            items: [
                { id: 'dashboard', label: 'Estatísticas', icon: 'layout-dashboard' },
                { id: 'chat', label: 'Consultor Viral IA', icon: 'bot' },
                { id: 'identity-hub', label: 'Identity Hub', icon: 'user-cog' },
            ]
        },
        {
            title: "Criação & Copy",
            items: [
                { id: 'shopee-copy', label: 'Shopee Copy Agent', icon: 'shopping-bag', badge: 'SHOPEE' },
                { id: 'agente-de-copy-clean', label: 'Agente de Copy Clean', icon: 'sparkles', badge: 'CLEAN' },
                { id: 'agente-de-copy', label: 'Agente de Copy', icon: 'file-text', badge: 'LEGADO' },
                { id: 'ai-video-project', label: 'AI Video Project', icon: 'video', badge: 'M1' },
                { id: 'create', label: 'Creative Director AI', icon: 'clapperboard' },
                { id: 'product-listing', label: 'Anúncios SEO & Tags', icon: 'tag' },
                { id: 'collage-studio', label: 'Criador de Colagem', icon: 'layout-grid' },
                { id: 'vanessa', label: 'Vanessa Copy Creator', icon: 'sparkles' },
                { id: 'copy-master', label: 'Copy Master', icon: 'pen-tool' },
                { id: 'hooks', label: 'Ganchos Virais', icon: 'anchor' },
                { id: 'script-refiner', label: 'Refinador de Script', icon: 'refresh-cw' },
                { id: 'ideador', label: 'Ideador Viral', icon: 'lightbulb' },
            ]
        },
        {
            title: "Vídeo IA (Prompts)",
            items: [
                { id: 'visual-reference-agent', label: 'Visual Reference Agent', icon: 'sparkles', badge: 'NEW' },
                { id: 'reverse', label: 'Engenharia Reversa', icon: 'scan-face' },
                { id: 'cinematic', label: 'Cinematic Engine', icon: 'clapperboard' },
                { id: 'try-on', label: 'Provador Virtual', icon: 'shirt' },
            ]
        },
        {
            title: "Estúdio Criativo",
            items: [
                { id: 'translator', label: 'Tradutor Virtual', icon: 'languages' },
                { id: 'image-describer', label: 'Descrever Imagem', icon: 'camera' },
                { id: 'magic-enhancer', label: 'Aprimorador Mágico', icon: 'wand' },
                { id: 'prompt-refiner', label: 'Editar com IA', icon: 'edit' },
                { id: 'image-extractor', label: 'Extrator de Prompt', icon: 'image' },
            ]
        },
        {
            title: "Áudio & Som",
            items: [
                { id: 'lyria-music', label: 'Lyria Music Engine', icon: 'music' },
                { id: 'transcription', label: 'Transcrição & Voz', icon: 'mic' },
            ]
        },
        {
            title: "Legal & Conformidade",
            items: [
                { id: 'tiktok-legal', label: 'Advogado TikTok', icon: 'shield-check' },
                { id: 'audit', label: 'Auditoria Compliance', icon: 'shield-alert' },
            ]
        },
        {
            title: "Sistema",
            items: [
                { id: 'prompt-vault', label: 'Prompt Vault IA', icon: 'shield-check', badge: 'PRO' },
                { id: 'history', label: 'Histórico', icon: 'history' },
            ]
        }
    ];

    const renderActiveView = () => {
        // Plan Entitlement Check: If active view is locked on current plan, show LockedToolBanner
        if (activeView !== 'dashboard' && activeView !== 'history' && !isToolAllowedForPlan(plan.id, activeView)) {
            let toolTitle = activeView;
            for (const sec of navigationSections) {
                const found = sec.items.find(it => it.id === activeView);
                if (found) {
                    toolTitle = found.label;
                    break;
                }
            }
            return <LockedToolBanner toolName={toolTitle} requiredPlan="PRO" />;
        }

        switch (activeView) {
            case 'dashboard':
                return <DashboardView onOpenTool={setActiveView} bookmarkUpdateTrigger={bookmarkUpdateTrigger} />;
            case 'prompt-vault':
                return <PromptVaultView currentKey={apiKey} />;
            case 'shopee-copy':
                return <ShopeeCopyView currentKey={apiKey} onNavigate={setActiveView} />;
            case 'agente-de-copy-clean':
                return <AgenteDeCopyCleanView currentKey={apiKey} />;
            case 'visual-reference-agent':
                return <VisualReferenceAgent currentKey={apiKey} />;
            case 'agente-de-copy':
                return <AgenteDeCopyView currentKey={apiKey} />;
            case 'ai-video-project':
                return <NewProjectPage currentKey={apiKey} />;
            case 'create':
                return <CreativeDirectorView currentKey={apiKey} />;
            case 'product-listing':
                return <ProductListingGeneratorView currentKey={apiKey} />;
            case 'collage-studio':
                return <CollageStudioView currentKey={apiKey} />;
            case 'vanessa':
                return <VanessaShopView currentKey={apiKey} />;
            case 'identity-hub':
                return <IdentityHub currentKey={apiKey} />;
            case 'chat':
                return <ChatView currentKey={apiKey} />;
            case 'ideador':
                return <IdeationView currentKey={apiKey} onNavigate={setActiveView} />;
            case 'copy-master':
                return <CopyMasterView currentKey={apiKey} />;
            case 'script-refiner':
                return <ScriptRefinerView currentKey={apiKey} />;
            case 'hooks':
                return <HookGeneratorView currentKey={apiKey} />;
            case 'reverse':
                return <ReverseEngineeringView currentKey={apiKey} />;
            case 'cinematic':
                return <CinematicEngineView currentKey={apiKey} />;
            case 'try-on':
                return <TryOnView currentKey={apiKey} />;
            case 'translator':
                return <TranslatorView currentKey={apiKey} />;
            case 'image-describer':
                return <ImageDescriberView currentKey={apiKey} />;
            case 'magic-enhancer':
                return <MagicPromptView currentKey={apiKey} />;
            case 'prompt-refiner':
                return <PromptRefinerView currentKey={apiKey} />;
            case 'image-extractor':
                return <ImagePromptExtractorView currentKey={apiKey} />;
            case 'tiktok-legal':
                return <TikTokLegalView currentKey={apiKey} />;
            case 'audit':
                return <AuditView currentKey={apiKey} />;
            case 'lyria-music':
                return <LyriaMusicView currentKey={apiKey} />;
            case 'transcription':
                return <TranscriptionView currentKey={apiKey} />;
            case 'history':
                return <HistoryView />;
            default:
                return <NotFoundView onNavigate={setActiveView} />;
        }
    };

    return (
        <AuthGate>
            <div className="flex h-screen bg-[#0A0A0B] text-neutral-300 overflow-hidden font-sans">
            {/* Sidebar Desktop */}
            <aside className={`bg-[#0F0F11] border-r border-neutral-800 transition-all duration-300 flex flex-col h-full overflow-hidden ${isSidebarOpen ? 'w-64' : 'w-0 md:w-20'}`}>
                <div className="p-4 border-b border-neutral-800 flex items-center justify-between h-14 shrink-0 bg-[#121214]">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-8 h-8 bg-emerald-500/20 border border-emerald-500/40 rounded flex items-center justify-center shrink-0">
                            <div className="w-3 h-3 bg-emerald-500 rounded-sm"></div>
                        </div>
                        {isSidebarOpen && (
                            <div className="flex flex-col">
                                <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest leading-none font-mono">Specialist Module</span>
                                <span className="font-extrabold text-neutral-100 text-[10px] whitespace-nowrap tracking-wider font-mono">CREATOR PRO IA</span>
                            </div>
                        )}
                    </div>
                    <button 
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
                        className="hidden md:block text-neutral-500 hover:text-white cursor-pointer"
                    >
                        <LucideIcon name="chevron-left" className={`w-4 h-4 transition-transform ${!isSidebarOpen ? 'rotate-180' : ''}`} />
                    </button>
                </div>

                <nav className="flex-grow p-3 space-y-5 overflow-y-auto custom-scrollbar">
                    {navigationSections.map((section, idx) => (
                        <div key={idx} className="space-y-1">
                            {isSidebarOpen && (
                                <span className="text-[10px] font-mono font-bold text-neutral-500 uppercase tracking-widest px-3 block mb-2">
                                    {section.title}
                                </span>
                            )}
                            {section.items.map(item => {
                                const isLocked = item.id !== 'dashboard' && item.id !== 'history' && !isToolAllowedForPlan(plan.id, item.id);
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => setActiveView(item.id)}
                                        className={`w-full text-left px-3 py-2.5 rounded text-xs font-mono font-bold uppercase tracking-wider transition flex items-center justify-between group cursor-pointer border ${activeView === item.id ? 'bg-[#121214] text-white border-neutral-800' : 'text-neutral-400 border-transparent hover:text-neutral-100 hover:bg-[#121214]/60'}`}
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <LucideIcon name={item.icon} className={`w-4 h-4 shrink-0 transition-colors ${activeView === item.id ? 'text-emerald-400' : 'text-neutral-500 group-hover:text-neutral-300'}`} />
                                            {isSidebarOpen && <span className="truncate">{item.label}</span>}
                                        </div>
                                        {isSidebarOpen && (
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                {isLocked && (
                                                    <span className="bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[8px] font-bold px-1 py-0.5 rounded uppercase">
                                                        PRO
                                                    </span>
                                                )}
                                                {item.badge && (
                                                    <span className="bg-red-950/50 border border-red-900/30 text-red-400 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase scale-90">
                                                        {item.badge}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    ))}
                </nav>

                <div className="p-4 border-t border-neutral-800 bg-neutral-950/30 text-center shrink-0">
                    <p className="text-[10px] text-neutral-500 font-mono font-bold">EXECUTION ENGINE v4.8.2</p>
                </div>
            </aside>

            {/* Main view content */}
            <div className="flex-1 flex flex-col h-full min-w-0 bg-[#050505]">
                {/* Header */}
                <header className="h-14 border-b border-neutral-800 bg-[#121214] flex items-center justify-between px-6 shrink-0 gap-4">
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
                            className="md:hidden text-neutral-400 hover:text-white cursor-pointer"
                        >
                            <LucideIcon name="menu" className="w-5 h-5" />
                        </button>
                        <div className="flex flex-col">
                            <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest font-mono">Specialist Execution Context</span>
                            <h1 className="font-bold text-[#E5E5E5] text-sm tracking-tight font-sans capitalize leading-none pt-0.5">
                                {activeView === 'dashboard' ? 'Overview Cockpit' : activeView.replace('-', ' ')}
                            </h1>
                        </div>
                    </div>

                    <GlobalSearch navigationSections={navigationSections} onSelectView={setActiveView} activeView={activeView} />

                    <div className="flex items-center gap-4">
                        {/* Creator Intelligence Credit Balance Badge (Etapa 4A) */}
                        <CreditBalanceBadge />

                        {activeView !== 'dashboard' && activeView !== 'history' && (
                            <button
                                onClick={() => setIsBookmarkModalOpen(true)}
                                className="flex items-center gap-1.5 bg-[#064E3B]/80 hover:bg-[#064E3B] border border-emerald-500/35 text-emerald-300 hover:text-white px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition active:scale-95 cursor-pointer shrink-0"
                                title="Salvar configuração ou geração atual desta ferramenta como Favorito"
                            >
                                <LucideIcon name="bookmark" className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="hidden sm:inline">Favoritar</span>
                            </button>
                        )}

                        {isQuotaExceeded && (
                            <button 
                                onClick={() => {
                                    if (typeof window !== 'undefined') {
                                        localStorage.removeItem('robizin_quota_exceeded');
                                        localStorage.removeItem('robizin_quota_exceeded_time');
                                        window.location.reload();
                                    }
                                }}
                                className="flex items-center gap-1.5 bg-[#2D1616] hover:bg-[#3d1e1e] border border-amber-500/35 hover:border-amber-500 text-amber-300 px-3 py-1 rounded text-[10px] font-mono font-bold tracking-wider uppercase transition-colors shrink-0 cursor-pointer" 
                                title="Limite de cota do banco de dados atingido. O modo de persistência local está ativo. Clique para tentar reconectar."
                            >
                                <LucideIcon name="database" className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                                <span>MODO OFFLINE (RECONECTAR)</span>
                            </button>
                        )}

                        {/* Permanent Proxy Mode active indicators */}
                        <div className="hidden sm:flex items-center gap-1.5 bg-[#0F172A] border border-blue-500/35 text-blue-400 px-3 py-1 rounded text-[10px] font-mono font-bold tracking-wider uppercase">
                            <LucideIcon name="cpu" className="w-3.5 h-3.5 animate-pulse" />
                            PROXY MODE ACTIVE
                        </div>
                        
                        {proxyStatus === 'checking' && (
                            <div className="flex items-center gap-1.5 bg-neutral-900 border border-neutral-800 text-neutral-400 px-3 py-1 rounded text-[10px] font-mono font-bold tracking-wider uppercase">
                                <LucideIcon name="loader-2" className="w-3.5 h-3.5 animate-spin" />
                                CHECKING
                            </div>
                        )}
                        {proxyStatus === 'online' && (
                            <div className="flex items-center gap-1.5 bg-[#122A1E] border border-emerald-500/35 text-emerald-400 px-3 py-1 rounded text-[10px] font-mono font-bold tracking-wider uppercase">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                PROXY ONLINE
                            </div>
                        )}
                        {proxyStatus === 'offline' && (
                            <div className="flex items-center gap-1.5 bg-[#2D1616] border border-red-500/35 text-red-400 px-3 py-1 rounded text-[10px] font-mono font-bold tracking-wider uppercase">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                                PROXY OFFLINE
                            </div>
                        )}
                        {proxyStatus === 'error_cors' && (
                            <div className="flex items-center gap-1.5 bg-[#2A1D0B] border border-amber-500/35 text-amber-400 px-3 py-1 rounded text-[10px] font-mono font-bold tracking-wider uppercase" title="Erro de CORS">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                                ERRO DE CORS
                            </div>
                        )}
                        {proxyStatus === 'network_error' && (
                            <div className="flex items-center gap-1.5 bg-[#2D1616] border border-red-500/35 text-red-400 px-3 py-1 rounded text-[10px] font-mono font-bold tracking-wider uppercase" title="Erro de Conexão de Rede">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                                ERRO DE REDE
                            </div>
                        )}
                        {proxyStatus === 'method_mismatch' && (
                            <div className="flex items-center gap-1.5 bg-[#2A1D0B] border border-amber-500/35 text-amber-400 px-3 py-1 rounded text-[10px] font-mono font-bold tracking-wider uppercase" title="Método 405 Incorreto (Use POST)">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                                MÉTODO 405 (MISMATCH)
                            </div>
                        )}
                        {proxyStatus === 'invalid_token' && (
                            <div className="flex items-center gap-1.5 bg-[#2A1D0B] border border-amber-500/35 text-amber-400 px-3 py-1 rounded text-[10px] font-mono font-bold tracking-wider uppercase" title="Autenticação Rejeitada (Token Inválido)">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                TOKEN OUT (401)
                            </div>
                        )}
                        {proxyStatus === 'route_missing' && (
                            <div className="flex items-center gap-1.5 bg-[#231E2A] border border-fuchsia-500/35 text-fuchsia-450 px-3 py-1 rounded text-[10px] font-mono font-bold tracking-wider uppercase" title="Rota /health não encontrada">
                                <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400"></span>
                                ROTA 404 (HEALTH)
                            </div>
                        )}
                        
                        <div className="h-6 w-px bg-neutral-800"></div>

                        {/* Firebase Authentication Component */}
                        <div className="flex items-center gap-2.5 shrink-0">
                            {user ? (
                                <div className="flex items-center gap-2.5 bg-neutral-900/60 border border-neutral-800 px-3 py-1.5 rounded-2xl shrink-0 transition duration-200">
                                    {user.photoURL ? (
                                        <img src={user.photoURL} className="w-5 h-5 rounded-full border border-neutral-700" referrerPolicy="no-referrer" />
                                    ) : (
                                        <div className="w-5 h-5 bg-emerald-600 rounded-full flex items-center justify-center text-[10px] text-white font-mono font-bold uppercase leading-none">
                                            {user.displayName?.[0] || user.email?.[0] || 'U'}
                                        </div>
                                    )}
                                    
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-mono font-bold text-neutral-200 truncate max-w-[95px]">
                                            {user.displayName?.split(' ')[0] || user.email?.split('@')[0]}
                                        </span>
                                        {/* Verification Badge */}
                                        <div className="flex items-center gap-1 mt-0.5">
                                            {isEmailVerified ? (
                                                <span className="text-[8px] font-mono font-bold text-emerald-450 uppercase flex items-center gap-0.5">
                                                    <span className="w-1 h-1 rounded-full bg-emerald-400"></span>
                                                    Verificado
                                                </span>
                                            ) : (
                                                <span className="text-[8px] font-mono font-bold text-amber-500 uppercase flex items-center gap-0.5">
                                                    <span className="w-1 h-1 rounded-full bg-amber-500 animate-pulse"></span>
                                                    Não verificado
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="w-px h-5 bg-neutral-800 ml-1"></div>

                                    <button 
                                        onClick={logout}
                                        className="text-neutral-500 hover:text-red-400 p-1 rounded-lg hover:bg-neutral-800 transition cursor-pointer"
                                        title="Sair da Conta"
                                    >
                                        <LucideIcon name="log-out" className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => {
                                            setAuthModalTab('login');
                                            setIsAuthModalOpen(true);
                                        }}
                                        className="flex items-center gap-1.5 bg-[#141417] hover:bg-[#1E1E22] border border-neutral-800 text-neutral-300 px-3 py-1.5 rounded-2xl text-[10px] font-mono font-bold uppercase transition active:scale-95 cursor-pointer shrink-0"
                                        title="Fazer Login"
                                    >
                                        <LucideIcon name="log-in" className="w-3 h-3 text-neutral-450" />
                                        <span>Entrar</span>
                                    </button>
                                    <button 
                                        onClick={() => {
                                            setAuthModalTab('register');
                                            setIsAuthModalOpen(true);
                                        }}
                                        className="flex items-center gap-1.5 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/30 text-emerald-450 px-3 py-1.5 rounded-2xl text-[10px] font-mono font-bold uppercase transition active:scale-95 cursor-pointer shrink-0"
                                        title="Cadastrar uma conta gratuita"
                                    >
                                        <LucideIcon name="user-plus" className="w-3 h-3" />
                                        <span>Criar conta</span>
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="h-6 w-px bg-neutral-800 hidden sm:block"></div>

                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                <span className="text-[10px] font-mono text-emerald-500 uppercase font-bold tracking-wider hidden sm:inline">System Online</span>
                            </div>
                            <div className="h-6 w-px bg-neutral-800 hidden md:block"></div>
                            <div className="hidden md:flex items-center gap-3 text-[10px] font-mono font-bold select-none">
                                <span className="text-neutral-500">CPU: <span className="text-neutral-300">12.4%</span></span>
                                <span className="text-neutral-500">MEM: <span className="text-neutral-300">2.1GB</span></span>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Warning Banner for unverified email users */}
                {user && !isEmailVerified && (
                    <div className="bg-amber-950/25 border-b border-amber-900/30 px-6 py-3 flex flex-col sm:flex-row items-center justify-between text-xs text-amber-350 gap-3">
                        <div className="flex items-center gap-2.5">
                            <LucideIcon name="alert-triangle" className="w-4 h-4 text-amber-400 shrink-0" />
                            <span className="font-medium text-[11px] tracking-wide">
                                <strong>Sincronização pendente:</strong> Verifique seu e-mail para ativar a sincronização em nuvem e salvar seus favoritos com segurança.
                            </span>
                        </div>
                        <div className="flex items-center gap-2.5 shrink-0">
                            {resendNotification ? (
                                <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-950/40 border border-amber-900/40 px-2.5 py-1 rounded-xl">
                                    {resendNotification}
                                </span>
                            ) : (
                                <button 
                                    onClick={handleResendEmail}
                                    disabled={resendingEmail}
                                    className="bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/35 text-amber-200 px-3 py-1.5 rounded-xl text-[9px] font-mono uppercase font-bold transition active:scale-95 disabled:opacity-50 cursor-pointer animate-pulse"
                                >
                                    {resendingEmail ? 'Enviando...' : 'Reenviar verificação'}
                                </button>
                            )}
                            <button 
                                onClick={refreshVerificationStatus}
                                className="bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-350 px-3 py-1.5 rounded-xl text-[9px] font-mono uppercase font-bold transition active:scale-95 cursor-pointer"
                                title="Verificar se o e-mail já foi confirmado"
                            >
                                Verificar Status
                            </button>
                        </div>
                    </div>
                )}

                {/* Main page container */}
                <main className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar bg-[#050505] relative">
                    <div className="relative z-10 max-w-7xl mx-auto h-full">
                        <ErrorBoundary key={activeView}>
                            {renderActiveView()}
                        </ErrorBoundary>
                    </div>
                </main>

                {/* Footer: System Logs & Video Engine Health Dashboard */}
                <footer className="h-10 border-t border-neutral-800 bg-[#121214] flex items-center px-4 md:px-6 justify-between shrink-0 text-[10px] font-mono font-bold relative z-40">
                    <div className="flex gap-4 md:gap-6 items-center">
                        <div className="flex items-center gap-1.5 hidden sm:flex">
                            <span className="text-neutral-600 uppercase">Status</span>
                            <span className="text-emerald-500">IDLE_READY</span>
                        </div>

                        {/* Video Engine Latency & Health Dashboard Panel */}
                        <VideoEngineHealthPanel />

                        <div className="flex items-center gap-1.5 border-l border-neutral-800 pl-4 md:pl-6 hidden md:flex">
                            <span className="text-neutral-600 uppercase">Terminal</span>
                            <span className="text-neutral-400">tty/1</span>
                        </div>
                        <div className="flex items-center gap-1.5 border-l border-neutral-800 pl-4 md:pl-6 hidden lg:flex">
                            <span className="text-neutral-600 uppercase">Auto-Save</span>
                            <span className={`${lastSaveSecs < 3 ? 'text-emerald-400 font-extrabold animate-pulse' : 'text-neutral-300 font-medium'}`}>
                                {lastSaveSecs < 3 ? '✓ GRAVADO' : `SYNC EM ${30 - lastSaveSecs}S`}
                            </span>
                        </div>
                    </div>
                    <div className="text-neutral-600 select-none flex items-center gap-4">
                        <span className="hidden sm:inline">SESSION: AE-9442-KL-00</span>
                    </div>
                </footer>
            </div>

            {isBookmarkModalOpen && (
                <BookmarkModal
                    activeView={activeView}
                    onClose={() => setIsBookmarkModalOpen(false)}
                    onSaveSuccess={() => setBookmarkUpdateTrigger(prev => prev + 1)}
                />
            )}

            <AuthModal
                isOpen={isAuthModalOpen}
                initialTab={authModalTab}
                onClose={() => setIsAuthModalOpen(false)}
            />

            {/* Creator Intelligence Pro — Plan and Credits Modals (Etapa 4A) */}
            <PlanAndCreditsModal />
            <InsufficientCreditsModal />
        </div>
      </AuthGate>
    );
}
