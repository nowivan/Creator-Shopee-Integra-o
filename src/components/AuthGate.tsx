import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useFirebase } from '../context/FirebaseContext';
import { LucideIcon } from './Common';
import { AuthModal } from './AuthModal';

interface AuthGateProps {
  children: React.ReactNode;
}

let authGateRenderCount = 0;

export function AuthGate({ children }: AuthGateProps) {
  const {
    user,
    authLoading,
    isAuthenticated,
    loginWithGoogle
  } = useFirebase();

  if (process.env.NODE_ENV !== 'production') {
    authGateRenderCount++;
    console.log(`[DEBUG] AuthGate render count: ${authGateRenderCount} | authLoading: ${authLoading} | isAuthenticated: ${isAuthenticated}`);
  }

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'login' | 'register' | 'forgot'>('login');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 1. If authLoading is true, show full-screen loading state
  if (authLoading) {
    return (
      <div 
        id="auth-loading-screen" 
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#050505] text-neutral-200"
      >
        <div className="relative flex flex-col items-center">
          {/* Pulsing visual halo */}
          <div className="absolute w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl animate-pulse"></div>
          
          <div className="relative flex items-center justify-center w-16 h-16 bg-[#121214] border border-neutral-800 rounded-2xl mb-5 shadow-2xl">
            <LucideIcon name="loader-2" className="w-7 h-7 text-emerald-450 animate-spin" />
          </div>
          
          <h2 className="text-sm font-mono font-bold uppercase tracking-widest text-neutral-300">
            Verificando sessão...
          </h2>
          <p className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider mt-2.5">
            Estabelecendo conexão segura
          </p>
        </div>
      </div>
    );
  }

  // 2. If isAuthenticated is false, render locked screen
  if (!isAuthenticated) {
    const handleGoogleLogin = async () => {
      setErrorMsg(null);
      setGoogleLoading(true);
      try {
        await loginWithGoogle();
      } catch (err: any) {
        setErrorMsg(err.message || "Erro desconhecido ao entrar com o Google.");
      } finally {
        setGoogleLoading(false);
      }
    };

    const openLogin = () => {
      setModalTab('login');
      setIsModalOpen(true);
    };

    const openRegister = () => {
      setModalTab('register');
      setIsModalOpen(true);
    };

    return (
      <div 
        id="auth-locked-screen" 
        className="fixed inset-0 z-50 flex items-center justify-center bg-[#050505] p-4 text-neutral-300 overflow-y-auto"
      >
        {/* Soft atmospheric glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-emerald-950/10 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] bg-indigo-950/5 rounded-full blur-[100px] pointer-events-none"></div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="relative w-full max-w-md bg-[#0F0F11] border border-neutral-800/80 rounded-3xl p-8 shadow-[0_30px_70px_rgba(0,0,0,0.9)] text-center overflow-hidden"
        >
          {/* Top subtle decoration line */}
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent"></div>

          {/* Icon Header */}
          <div className="flex justify-center mb-6">
            <div className="relative flex items-center justify-center w-14 h-14 bg-emerald-950/20 border border-emerald-500/30 rounded-2xl shadow-inner">
              <LucideIcon name="lock" className="w-6 h-6 text-emerald-450" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            </div>
          </div>

          {/* Title and Subtitle */}
          <div className="space-y-3 mb-8">
            <span className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-neutral-500 block">
              Acesso Restrito • Creator Pro IA
            </span>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white font-sans">
              Entre para acessar o Creator Pro IA
            </h1>
            <p className="text-xs text-neutral-400 leading-relaxed max-w-xs mx-auto">
              Suas ferramentas, favoritos, histórico e preferências ficam protegidos na sua conta.
            </p>
          </div>

          {/* Social login errors */}
          <AnimatePresence mode="wait">
            {errorMsg && (
              <motion.div 
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mb-5 flex items-start gap-2.5 p-3 rounded-2xl bg-red-950/25 border border-red-500/35 text-red-400 text-left text-[11px]"
              >
                <LucideIcon name="alert-circle" className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Authentication Actions */}
          <div className="space-y-3.5">
            {/* Google Login Option */}
            <button
              onClick={handleGoogleLogin}
              disabled={googleLoading}
              className="w-full flex items-center justify-center gap-3 bg-[#141417] hover:bg-[#1C1C20] border border-neutral-850 hover:border-neutral-800 text-neutral-200 hover:text-white py-3.5 px-4 rounded-2xl text-[11px] font-mono font-bold uppercase tracking-wider transition active:scale-[0.98] disabled:opacity-40 cursor-pointer"
            >
              {googleLoading ? (
                <LucideIcon name="loader-2" className="w-4 h-4 animate-spin text-neutral-450" />
              ) : (
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                </svg>
              )}
              <span>{googleLoading ? 'Conectando...' : 'Continuar com Google'}</span>
            </button>

            {/* Email/Password Option — Dual Actions */}
            <div className="flex gap-3">
              <button
                onClick={openLogin}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500/20 py-3.5 rounded-2xl text-[10px] font-mono font-bold uppercase tracking-wider transition active:scale-[0.98] cursor-pointer"
              >
                Entrar
              </button>
              <button
                onClick={openRegister}
                className="flex-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-850 hover:border-neutral-800 text-neutral-300 hover:text-white py-3.5 rounded-2xl text-[10px] font-mono font-bold uppercase tracking-wider transition active:scale-[0.98] cursor-pointer"
              >
                Criar conta
              </button>
            </div>
          </div>

          {/* Small Note */}
          <div className="mt-8 pt-5 border-t border-neutral-900 flex items-center justify-center gap-1.5 text-neutral-500 text-[10px] font-mono">
            <LucideIcon name="shield-check" className="w-3.5 h-3.5 text-neutral-600" />
            <span>É necessário autenticar para acessar o painel.</span>
          </div>
        </motion.div>

        {/* Embedded AuthModal */}
        <AuthModal 
          isOpen={isModalOpen}
          initialTab={modalTab}
          onClose={() => setIsModalOpen(false)}
        />
      </div>
    );
  }

  // 3. If authenticated, render children normally
  return <>{children}</>;
}
