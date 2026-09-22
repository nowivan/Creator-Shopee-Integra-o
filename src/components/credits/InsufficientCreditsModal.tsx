import React from 'react';
import { useCredits } from '../../context/CreditContext';
import { LucideIcon } from '../Common';

export function InsufficientCreditsModal() {
  const { 
    isInsufficientCreditsModalOpen, 
    closeInsufficientCreditsModal, 
    insufficientCreditsDetail, 
    balance,
    openPlansModal 
  } = useCredits();

  if (!isInsufficientCreditsModalOpen) return null;

  const required = insufficientCreditsDetail?.requiredCredits || 3;
  const missing = Math.max(0, required - balance);

  const handleUpgradeClick = () => {
    closeInsufficientCreditsModal();
    openPlansModal();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div 
        className="bg-[#121217] border border-red-500/40 rounded-3xl w-full max-w-md p-6 shadow-2xl text-neutral-200 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-500 via-amber-500 to-indigo-500"></div>

        <div className="flex items-center justify-between mt-2">
          <div className="w-12 h-12 rounded-2xl bg-red-950/60 border border-red-800/60 flex items-center justify-center text-red-400">
            <LucideIcon name="alert-triangle" className="w-6 h-6" />
          </div>
          <button
            onClick={closeInsufficientCreditsModal}
            className="w-8 h-8 rounded-xl bg-neutral-800/60 hover:bg-neutral-700 text-neutral-400 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <LucideIcon name="x" className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4 space-y-2">
          <h3 className="text-lg font-bold text-white font-sans">
            Créditos Insuficientes
          </h3>
          <p className="text-xs text-neutral-400 leading-relaxed font-sans">
            Você não possui créditos suficientes para executar esta operação de Inteligência Artificial.
          </p>
        </div>

        {/* Balance metrics */}
        <div className="mt-4 p-4 bg-[#0A0A0D] border border-neutral-800 rounded-2xl space-y-2 font-mono text-xs">
          <div className="flex justify-between items-center text-neutral-400">
            <span>Seu Saldo Atual:</span>
            <span className="font-bold text-white text-sm">{balance} CR</span>
          </div>
          <div className="flex justify-between items-center text-neutral-400">
            <span>Custo desta Operação:</span>
            <span className="font-bold text-indigo-400 text-sm">{required} CR</span>
          </div>
          <div className="pt-2 border-t border-neutral-800 flex justify-between items-center text-red-400 font-bold">
            <span>Faltam:</span>
            <span>{missing} CR</span>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2">
          <button
            onClick={handleUpgradeClick}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-xs font-mono font-bold uppercase rounded-xl transition shadow-lg shadow-indigo-600/20 cursor-pointer flex items-center justify-center gap-2 active:scale-95"
          >
            <LucideIcon name="sparkles" className="w-4 h-4" />
            <span>Ver Planos & Recarregar Créditos</span>
          </button>

          <button
            onClick={closeInsufficientCreditsModal}
            className="w-full py-2.5 bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 text-xs font-mono font-bold uppercase rounded-xl transition cursor-pointer text-center"
          >
            Voltar
          </button>
        </div>
      </div>
    </div>
  );
}
