import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LucideIcon } from './Common';
import { useFirebase } from '../context/FirebaseContext';
import { validateAuthInputs } from '../services/authService';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'login' | 'register' | 'forgot';
}

export function AuthModal({ isOpen, onClose, initialTab = 'login' }: AuthModalProps) {
  const { 
    loginWithEmail, 
    registerWithEmail, 
    loginWithGoogle, 
    sendResetPassword 
  } = useFirebase();

  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'forgot'>(initialTab);
  
  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Status states
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleTabChange = (tab: 'login' | 'register' | 'forgot') => {
    setActiveTab(tab);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const validationError = validateAuthInputs(email, password);
    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    setIsLoading(true);
    try {
      await loginWithEmail(email, password);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Erro desconhecido ao entrar.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const validationError = validateAuthInputs(email, password, name, true);
    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    setIsLoading(true);
    try {
      await registerWithEmail(email, password, name);
      setSuccessMsg("Conta criada. Enviamos um link de verificação para seu e-mail.");
      // Clear password field
      setPassword('');
    } catch (err: any) {
      setErrorMsg(err.message || "Erro desconhecido ao criar conta.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const validationError = validateAuthInputs(email);
    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    setIsLoading(true);
    try {
      await sendResetPassword(email);
      setSuccessMsg("Enviamos um link de recuperação para seu e-mail.");
    } catch (err: any) {
      setErrorMsg(err.message || "Erro desconhecido ao enviar recuperação.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoading(true);
    try {
      await loginWithGoogle();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Erro desconhecido ao entrar com Google.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="auth-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.2 }}
        id="auth-modal-container"
        className="w-full max-w-md bg-[#0F0F11] border border-neutral-800 rounded-3xl overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] text-neutral-300"
      >
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-5 border-b border-neutral-900/80 bg-neutral-950/20">
          <div className="flex items-center gap-2">
            <LucideIcon name="cloud" className="w-5 h-5 text-emerald-450" />
            <span className="font-mono text-xs font-bold uppercase tracking-widest text-neutral-200">
              {activeTab === 'forgot' ? 'Recuperar Acesso' : 'Nuvem Intelligence'}
            </span>
          </div>
          <button 
            onClick={onClose}
            className="text-neutral-500 hover:text-white hover:bg-[#1E1E22] p-1.5 rounded-full transition cursor-pointer"
          >
            <LucideIcon name="x" className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selector */}
        {activeTab !== 'forgot' && (
          <div className="flex border-b border-neutral-900/60 bg-[#141417]/30 p-1.5 mx-6 mt-5 rounded-2xl border border-neutral-800/40">
            <button
              onClick={() => handleTabChange('login')}
              className={`flex-1 py-2.5 rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider transition ${
                activeTab === 'login' 
                  ? 'bg-[#1D1D22] text-white shadow-sm border border-neutral-800/60' 
                  : 'text-neutral-500 hover:text-neutral-200'
              }`}
            >
              Entrar
            </button>
            <button
              onClick={() => handleTabChange('register')}
              className={`flex-1 py-2.5 rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider transition ${
                activeTab === 'register' 
                  ? 'bg-[#1D1D22] text-white shadow-sm border border-neutral-800/60' 
                  : 'text-neutral-500 hover:text-neutral-200'
              }`}
            >
              Criar Conta
            </button>
          </div>
        )}

        <div className="p-6">
          {/* Alerts */}
          <AnimatePresence mode="wait">
            {errorMsg && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-4 flex items-start gap-2.5 p-3 rounded-2xl bg-red-950/25 border border-red-500/35 text-red-400 text-[11px]"
              >
                <LucideIcon name="alert-circle" className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </motion.div>
            )}

            {successMsg && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-4 flex items-start gap-2.5 p-3 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 text-emerald-400 text-[11px]"
              >
                <LucideIcon name="check-circle" className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* FORMS */}
          {activeTab === 'login' && (
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <label className="block text-[9px] font-mono font-bold text-neutral-500 uppercase tracking-widest mb-1.5">Email</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-600">
                    <LucideIcon name="mail" className="w-4 h-4" />
                  </span>
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="exemplo@dominio.com"
                    required
                    disabled={isLoading}
                    className="w-full bg-[#141417] border border-neutral-800 focus:border-neutral-700 rounded-2xl pl-10 pr-4 py-3 text-xs text-neutral-100 outline-none transition focus:ring-1 focus:ring-neutral-700"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-[9px] font-mono font-bold text-neutral-500 uppercase tracking-widest">Senha</label>
                  <button 
                    type="button"
                    onClick={() => handleTabChange('forgot')}
                    className="text-[9px] font-mono font-bold text-emerald-500/80 hover:text-emerald-400 uppercase tracking-wider"
                  >
                    Esqueceu?
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-600">
                    <LucideIcon name="key-round" className="w-4 h-4" />
                  </span>
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    disabled={isLoading}
                    className="w-full bg-[#141417] border border-neutral-800 focus:border-neutral-700 rounded-2xl pl-10 pr-4 py-3 text-xs text-neutral-100 outline-none transition focus:ring-1 focus:ring-neutral-700"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500/30 py-3 rounded-2xl text-[11px] font-mono font-bold uppercase tracking-wider transition active:scale-[0.98] disabled:opacity-40"
              >
                {isLoading ? 'Entrando...' : 'Entrar com E-mail'}
              </button>
            </form>
          )}

          {activeTab === 'register' && (
            <form onSubmit={handleEmailRegister} className="space-y-4">
              <div>
                <label className="block text-[9px] font-mono font-bold text-neutral-500 uppercase tracking-widest mb-1.5">Nome de exibição (Opcional)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-600">
                    <LucideIcon name="user" className="w-4 h-4" />
                  </span>
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu Nome"
                    disabled={isLoading}
                    className="w-full bg-[#141417] border border-neutral-800 focus:border-neutral-700 rounded-2xl pl-10 pr-4 py-3 text-xs text-neutral-100 outline-none transition focus:ring-1 focus:ring-neutral-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-mono font-bold text-neutral-500 uppercase tracking-widest mb-1.5">Email</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-600">
                    <LucideIcon name="mail" className="w-4 h-4" />
                  </span>
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="exemplo@dominio.com"
                    required
                    disabled={isLoading}
                    className="w-full bg-[#141417] border border-neutral-800 focus:border-neutral-700 rounded-2xl pl-10 pr-4 py-3 text-xs text-neutral-100 outline-none transition focus:ring-1 focus:ring-neutral-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-mono font-bold text-neutral-500 uppercase tracking-widest mb-1.5">Senha (Mínimo 6 caracteres)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-600">
                    <LucideIcon name="key-round" className="w-4 h-4" />
                  </span>
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    disabled={isLoading}
                    className="w-full bg-[#141417] border border-neutral-800 focus:border-neutral-700 rounded-2xl pl-10 pr-4 py-3 text-xs text-neutral-100 outline-none transition focus:ring-1 focus:ring-neutral-700"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500/30 py-3 rounded-2xl text-[11px] font-mono font-bold uppercase tracking-wider transition active:scale-[0.98] disabled:opacity-40"
              >
                {isLoading ? 'Processando...' : 'Criar Conta'}
              </button>
            </form>
          )}

          {activeTab === 'forgot' && (
            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div>
                <label className="block text-[9px] font-mono font-bold text-neutral-500 uppercase tracking-widest mb-1.5">Seu E-mail registrado</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-600">
                    <LucideIcon name="mail" className="w-4 h-4" />
                  </span>
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="exemplo@dominio.com"
                    required
                    disabled={isLoading}
                    className="w-full bg-[#141417] border border-neutral-800 focus:border-neutral-700 rounded-2xl pl-10 pr-4 py-3 text-xs text-neutral-100 outline-none transition focus:ring-1 focus:ring-neutral-700"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleTabChange('login')}
                  className="flex-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-850 hover:border-neutral-850 text-neutral-300 py-3 rounded-2xl text-[10px] font-mono font-bold uppercase tracking-wider transition"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-[2] bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500/30 py-3 rounded-2xl text-[10px] font-mono font-bold uppercase tracking-wider transition active:scale-[0.98] disabled:opacity-40"
                >
                  {isLoading ? 'Enviando...' : 'Enviar Link'}
                </button>
              </div>
            </form>
          )}

          {/* Social login divider */}
          {activeTab !== 'forgot' && (
            <>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-neutral-900/60"></div>
                </div>
                <div className="relative flex justify-center text-[9px] uppercase tracking-widest font-mono">
                  <span className="bg-[#0F0F11] px-3.5 text-neutral-500">ou conecte via</span>
                </div>
              </div>

              {/* Google Button */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2.5 bg-[#141417] hover:bg-[#1C1C20] border border-neutral-850 hover:border-neutral-800 text-neutral-200 hover:text-white py-3 rounded-2xl text-[11px] font-mono font-bold uppercase tracking-wider transition active:scale-[0.98] disabled:opacity-40 cursor-pointer"
              >
                <svg className="w-4 h-4 text-neutral-300" viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                </svg>
                Entrar com Google
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
