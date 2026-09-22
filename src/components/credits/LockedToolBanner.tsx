import React from 'react';
import { useCredits } from '../../context/CreditContext';
import { LucideIcon } from '../Common';

interface LockedToolBannerProps {
  toolName?: string;
  requiredPlan?: string;
}

export function LockedToolBanner({ toolName = 'Esta ferramenta', requiredPlan = 'PRO' }: LockedToolBannerProps) {
  const { plan, openPlansModal } = useCredits();

  return (
    <div className="flex flex-col items-center justify-center p-8 md:p-12 text-center bg-gradient-to-b from-[#121217] to-[#0A0A0D] border border-neutral-800 rounded-3xl max-w-xl mx-auto my-8 shadow-2xl animate-fade-in text-neutral-200">
      <div className="w-16 h-16 rounded-3xl bg-indigo-950/60 border border-indigo-700/50 flex items-center justify-center text-indigo-400 mb-4 shadow-lg shadow-indigo-500/10">
        <LucideIcon name="lock" className="w-8 h-8" />
      </div>

      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-700 text-neutral-400 text-xs font-mono mb-3 uppercase tracking-wider">
        <span>Seu plano atual:</span>
        <span className="font-bold text-white">{plan.name}</span>
      </div>

      <h3 className="text-xl font-black text-white font-sans tracking-tight">
        Ferramenta Exclusiva para {requiredPlan}
      </h3>

      <p className="text-sm text-neutral-400 font-sans mt-2 max-w-md leading-relaxed">
        {toolName} faz parte da suíte avançada de IA para criadores e exige o nível <strong className="text-indigo-300">{requiredPlan}</strong> para execução ilimitada de prompts e geração de mídia.
      </p>

      <div className="mt-6 flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
        <button
          onClick={openPlansModal}
          className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-xs font-mono font-bold uppercase rounded-xl transition shadow-lg shadow-indigo-600/25 cursor-pointer flex items-center justify-center gap-2 active:scale-95"
        >
          <LucideIcon name="sparkles" className="w-4 h-4" />
          <span>Fazer Upgrade para {requiredPlan}</span>
        </button>
      </div>
    </div>
  );
}
