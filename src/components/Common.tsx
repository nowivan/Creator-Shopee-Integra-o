import React, { useState, useEffect, useRef } from 'react';
import * as Icons from 'lucide-react';
import { VOICE_OPTIONS } from '../constants';

export const LucideIcon = ({ name, className = "w-5 h-5" }: { name: string; className?: string }) => {
    const [IconComponent, setIconComponent] = useState<any>(null);

    useEffect(() => {
        // Convert dash name (e.g. 'layout-grid') to PascalCase (e.g. 'LayoutGrid')
        const pascalName = name
            .split('-')
            .map(part => part.charAt(0).toUpperCase() + part.slice(1))
            .join('');

        const comp = (Icons as any)[pascalName];
        if (comp) {
            setIconComponent(() => comp);
        } else {
            // Fallback checking other capitalizations if needed, or default Icon
            setIconComponent(null);
        }
    }, [name]);

    if (!IconComponent) {
        return <span className={`inline-block bg-white/5 rounded-full ${className}`}></span>;
    }

    return <IconComponent className={className} />;
};

interface ButtonProps {
    children: React.ReactNode;
    onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
    variant?: 'primary' | 'secondary' | 'accent' | 'success' | 'danger' | 'ghost';
    className?: string;
    disabled?: boolean;
    icon?: string;
    type?: 'button' | 'submit' | 'reset';
    tabIndex?: number;
    title?: string;
}

export const Button = ({ 
    children, 
    onClick, 
    variant = 'primary', 
    className = '', 
    disabled = false, 
    icon,
    type = 'button',
    tabIndex,
    title
}: ButtonProps) => {
    const baseClass = "px-3.5 py-2.5 rounded font-mono text-[11px] font-bold tracking-wider uppercase transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed select-none active:translate-y-[1px]";
    const variants = {
        primary: "bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500/30",
        secondary: "bg-[#18181B] hover:bg-[#27272A] text-neutral-300 border border-neutral-800",
        accent: "bg-blue-600 hover:bg-blue-500 text-white border border-blue-500/30",
        success: "bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500/30",
        danger: "bg-red-950/45 hover:bg-red-900/55 text-red-400 border border-red-900/40", 
        ghost: "text-neutral-400 hover:text-white hover:bg-[#121214] border border-transparent"
    };
    return (
        <button 
            type={type}
            onClick={onClick} 
            className={`${baseClass} ${variants[variant]} ${className}`} 
            disabled={disabled}
            tabIndex={tabIndex}
            title={title}
        >
            {icon && <LucideIcon name={icon} className="w-4 h-4" />}
            {children}
        </button>
    );
};

export const Card = ({ children, className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={`bg-[#0F0F11] border border-neutral-800 rounded p-4 md:p-5 shadow-sm text-neutral-300 ${className}`} {...props}>
        {children}
    </div>
);

interface NavButtonProps {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
    icon: string;
    highlight?: boolean;
}

export const NavButton = ({ active, onClick, children, icon, highlight }: NavButtonProps) => (
    <button 
        onClick={onClick} 
        className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded font-mono text-[11px] font-bold uppercase tracking-wider transition-all duration-150 group ${active ? 'bg-[#121214] text-white border border-neutral-800' : 'text-neutral-400 border border-transparent hover:bg-[#0F0F11]/80 hover:text-neutral-100'} ${highlight && !active ? 'border border-emerald-500/35 text-emerald-400 hover:bg-emerald-500/10' : ''}`}
    >
        <LucideIcon name={icon} className={`w-4 h-4 transition-colors ${active ? 'text-emerald-400' : 'text-neutral-500 group-hover:text-neutral-200'} ${highlight && !active ? 'text-emerald-400' : ''}`} />
        {children}
    </button>
);

interface VoiceSelectorProps {
    selected: string;
    onChange: (val: string) => void;
    disabled?: boolean;
}

export const VoiceSelector = ({ selected, onChange, disabled }: VoiceSelectorProps) => (
    <div className="relative">
        <select 
            value={selected} 
            onChange={(e) => onChange(e.target.value)} 
            disabled={disabled}
            className="appearance-none bg-slate-800 text-white pl-9 pr-8 py-3 rounded-xl border border-slate-700 hover:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm font-medium w-full transition-colors cursor-pointer disabled:opacity-50"
        >
            {VOICE_OPTIONS.map(v => (
                <option key={v.name} value={v.name}>{v.label}</option>
            ))}
        </select>
        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-400">
            <LucideIcon name="mic-2" className="w-4 h-4" />
        </div>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
            <LucideIcon name="chevron-down" className="w-4 h-4" />
        </div>
    </div>
);

interface TeleprompterProps {
    text: string;
    onClose: () => void;
}

export const Teleprompter = ({ text, onClose }: TeleprompterProps) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1);
    const [fontSize, setFontSize] = useState(4);
    const [mirrored, setMirrored] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const animationRef = useRef<number | null>(null);

    useEffect(() => {
        const scroll = () => {
            if (scrollRef.current && isPlaying) {
                scrollRef.current.scrollTop += speed;
                animationRef.current = requestAnimationFrame(scroll);
            }
        };
        if (isPlaying) {
            animationRef.current = requestAnimationFrame(scroll);
        }
        return () => {
            if (animationRef.current !== null) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [isPlaying, speed]);

    return (
        <div className="fixed inset-0 bg-black z-[100] flex flex-col animate-fade-in text-white">
            <div className="bg-slate-900/90 backdrop-blur border-b border-slate-800 p-4 flex flex-wrap gap-4 items-center justify-between z-20">
                <div className="flex items-center gap-4">
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition">
                        <LucideIcon name="x" className="w-6 h-6" />
                    </button>
                    <span className="font-bold text-lg tracking-tight hidden md:block text-indigo-400">PROMPTER<span className="text-white">.PRO</span></span>
                </div>
                <div className="flex items-center gap-2 bg-slate-800/50 rounded-lg p-1 border border-slate-700">
                    <button onClick={() => setFontSize(Math.max(2, fontSize - 1))} className="w-8 h-8 flex items-center justify-center hover:bg-slate-700 rounded">A-</button>
                    <button onClick={() => setFontSize(Math.min(8, fontSize + 1))} className="w-8 h-8 flex items-center justify-center hover:bg-slate-700 rounded">A+</button>
                </div>
                <div className="flex items-center gap-2 bg-slate-800/50 rounded-lg p-1 border border-slate-700">
                    <LucideIcon name="turtle" className="w-4 h-4 text-slate-500 ml-2" />
                    <input 
                        type="range" 
                        min="0.5" 
                        max="5" 
                        step="0.1" 
                        value={speed} 
                        onChange={(e) => setSpeed(Number(e.target.value))} 
                        className="w-24 md:w-32 h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-indigo-500" 
                    />
                    <LucideIcon name="rabbit" className="w-4 h-4 text-slate-500 mr-2" />
                </div>
                <button 
                    onClick={() => setMirrored(!mirrored)} 
                    className={`p-2 rounded-lg border ${mirrored ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-slate-700 text-slate-400'}`} 
                    title="Espelhar"
                >
                    <LucideIcon name="flip-horizontal" className="w-5 h-5" />
                </button>
            </div>
            <div 
                ref={scrollRef} 
                className={`flex-1 overflow-y-auto relative no-scrollbar cursor-pointer ${mirrored ? 'scale-x-[-1]' : ''}`} 
                onClick={() => setIsPlaying(!isPlaying)}
            >
                <div className="fixed top-1/2 left-0 w-full flex items-center pointer-events-none z-10 opacity-50">
                    <div className="h-[2px] w-8 bg-red-500"></div>
                    <div className="flex-1 border-t border-dashed border-red-500/30"></div>
                    <div className="h-[2px] w-8 bg-red-500"></div>
                </div>
                <div 
                    className="max-w-4xl mx-auto px-8 pb-[50vh] pt-[45vh] text-center font-bold leading-relaxed transition-all duration-300 outline-none" 
                    style={{ fontSize: `${fontSize}rem`, lineHeight: '1.4' }}
                >
                    {text.split('\n').map((line, i) => (
                        <p key={i} className="mb-8">{line || <br />}</p>
                    ))}
                </div>
            </div>
            {!isPlaying && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/20 backdrop-blur-[2px]">
                    <div className="bg-indigo-600 text-white px-8 py-4 rounded-full shadow-2xl animate-pulse flex items-center gap-3 transform scale-125">
                        <LucideIcon name="play" className="w-6 h-6 fill-current" /> 
                        <span className="font-bold tracking-widest">TOCAR</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export const usePasteImageUpload = ({
    onImagePasted,
    allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
    isActive = true,
}: {
    onImagePasted: (file: File) => void;
    allowedTypes?: string[];
    isActive?: boolean;
}) => {
    const [feedback, setFeedback] = useState<{ name: string; size: string; message: string } | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isActive) return;

        const handlePaste = (e: ClipboardEvent) => {
            const items = e.clipboardData?.items;
            if (!items) return;

            let imageDetected = false;
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    imageDetected = true;
                    break;
                }
            }

            if (!imageDetected) return;

            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    const file = items[i].getAsFile();
                    if (file) {
                        e.preventDefault();
                        e.stopPropagation();

                        if (!allowedTypes.includes(file.type)) {
                            setError("Formato não suportado. Formatos aceitos: PNG, JPG, JPEG, WEBP.");
                            setFeedback(null);
                            return;
                        }

                        const sizeStr = file.size > 1024 * 1024
                            ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
                            : `${(file.size / 1024).toFixed(1)} KB`;

                        setError(null);
                        setFeedback({
                            name: file.name || 'imagem_colada.png',
                            size: sizeStr,
                            message: 'Imagem colada com sucesso'
                        });

                        onImagePasted(file);
                        break;
                    }
                }
            }
        };

        window.addEventListener('paste', handlePaste, true);
        return () => window.removeEventListener('paste', handlePaste, true);
    }, [onImagePasted, allowedTypes, isActive]);

    return {
        feedback,
        setFeedback,
        error,
        setError
    };
};

export const usePasteHandler = (onImagePasted: (file: File) => void) => {
    useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
            const items = e.clipboardData?.items;
            if (!items) return;
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    const file = items[i].getAsFile();
                    if (file) {
                        e.preventDefault();
                        onImagePasted(file);
                    }
                    break;
                }
            }
        };
        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [onImagePasted]);
};
