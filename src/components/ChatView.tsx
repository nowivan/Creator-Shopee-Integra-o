import { useState, useEffect, useRef } from 'react';
import { LucideIcon } from './Common';
import { WORKER_URL, WORKER_TOKEN, sessionStore } from '../utils';
import { postToWorker } from '../services/workerClient';

interface Message {
    role: 'user' | 'model';
    text: string;
}

interface ChatViewProps {
    currentKey: string;
}

export function ChatView({ currentKey }: ChatViewProps) {
    const [messages, setMessages] = useState<Message[]>(() => sessionStore.get('chat_messages', [
        { role: 'model', text: 'Olá! Sou o Assistente de Inteligência do Creator Intelligence Pro, seu consultor estratégico. Quer ideias de trends, ganchos persuasivos ou ajuda com algum roteiro viral?' }
    ]));
    const [input, setInput] = useState(() => sessionStore.get('chat_input', ''));
    const [loading, setLoading] = useState(false);
    const endRef = useRef<HTMLDivElement>(null);

    // Persist messages and input in sessionStore when modified
    useEffect(() => {
        sessionStore.set('chat_messages', messages);
    }, [messages]);

    useEffect(() => {
        sessionStore.set('chat_input', input);
    }, [input]);

    const sendMessage = async () => {
        if (!input.trim()) return;

        const userMsg = input; 
        setInput(''); 
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]); 
        
        setLoading(true); 
        
        try {
            const fullPrompt = `Atue como um Especialista Sênior em TikTok Shop, Copywriting e Marketing Digital. 
            Responda de forma estratégica, direta e altamente acionável à seguinte dúvida/nicho do usuário:
            \n\n"${userMsg}"`; 
            
            const payload = { 
                contents: [{ parts: [{ text: fullPrompt }] }] 
            };

            const response = await postToWorker<any>('/', payload, {
                moduleName: "Consultor IA Chat",
                workerUrl: WORKER_URL,
                clientToken: WORKER_TOKEN
            });

            if (!response.ok) {
                throw new Error(response.errorMessage || "Erro desconhecido na API.");
            }

            const responseText = response.raw_text;
            
            if (!responseText) throw new Error("A IA não retornou texto válido.");
            
            setMessages(prev => [...prev, { role: 'model', text: responseText }]); 
            
        } catch (err: any) {
            console.error("Erro no Consultor IA:", err);
            setMessages(prev => [...prev, { role: 'model', text: `🚨 Falha ao consultar o especialista:\n${err.message}` }]);
        } finally {
            setLoading(false); 
        }
    };
    
    useEffect(() => { 
        endRef.current?.scrollIntoView({ behavior: 'smooth' }); 
    }, [messages]);

    return (
        <div className="max-w-4xl mx-auto h-[600px] flex flex-col glass-panel overflow-hidden animate-fade-in rounded-2xl bg-slate-900/40 border border-slate-700">
            <div className="p-4 bg-slate-800/50 border-b border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                        <LucideIcon name="bot" className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h3 className="font-bold text-white flex items-center gap-2">
                            Consultor Viral IA
                        </h3>
                        <p className="text-xs text-emerald-400 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Online
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-1 bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded text-[10px] font-bold border border-emerald-500/20">
                    <LucideIcon name="shield-check" className="w-3 h-3" /> POLICY SAFE
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-900/30">
                {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] p-4 rounded-2xl ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none shadow-lg' : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'}`}>
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.text}</p>
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-slate-800 p-4 rounded-2xl flex gap-2 rounded-tl-none">
                            <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-75"></div>
                            <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-150"></div>
                        </div>
                    </div>
                )}
                <div ref={endRef}></div>
            </div>
            <div className="p-4 bg-slate-800/50 border-t border-slate-700 flex gap-2">
                <input 
                    type="text" 
                    value={input} 
                    onChange={(e) => setInput(e.target.value)} 
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()} 
                    placeholder="Digite sua dúvida..." 
                    className="flex-grow bg-slate-900 border border-slate-700 rounded-xl px-4 text-white focus:ring-1 focus:ring-indigo-500 outline-none h-12 text-sm" 
                />
                <button onClick={sendMessage} disabled={loading} className="bg-indigo-600 hover:bg-indigo-500 text-white p-3 rounded-xl disabled:opacity-50 transition-colors h-12 w-12 flex items-center justify-center cursor-pointer">
                    <LucideIcon name="send" className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}
