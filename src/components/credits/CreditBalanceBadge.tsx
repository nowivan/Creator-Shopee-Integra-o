import React from 'react';
import { useCredits } from '../../context/CreditContext';
import { LucideIcon } from '../Common';

export function CreditBalanceBadge() {
  const { account, plan, balance, monthlyAllocation, isLoading, openPlansModal } = useCredits();

  if (isLoading && !account) {
    return (
      <div className="flex items-center gap-1.5 bg-neutral-900 border border-neutral-800 text-neutral-400 px-3 py-1.5 rounded-lg text-xs font-mono font-bold tracking-wider animate-pulse">
        <LucideIcon name="loader-2" className="w-3.5 h-3.5 animate-spin text-neutral-500" />
        <span className="hidden sm:inline">CRÉDITOS...</span>
      </div>
    );
  }

  const isAdmin = plan.id === 'ADMIN' || account?.planId === 'ADMIN' || account?.isAdminBypass;

  // Visual policy: Hide credit balance badge for ADMIN accounts
  if (isAdmin) {
    return null;
  }

  const isLowCredits = balance <= 10;
  const isZeroCredits = balance <= 0;

  let badgeBorderColor = "border-indigo-500/30 hover:border-indigo-400/60";
  let badgeBgColor = "bg-[#0F172A]/90 hover:bg-[#1E1B4B]";
  let textColor = "text-indigo-300";

  if (isZeroCredits) {
    badgeBorderColor = "border-red-500/50 hover:border-red-400 animate-pulse";
    badgeBgColor = "bg-[#2D1616]/90 hover:bg-[#3d1e1e]";
    textColor = "text-red-300";
  } else if (isLowCredits) {
    badgeBorderColor = "border-amber-500/50 hover:border-amber-400";
    badgeBgColor = "bg-[#2A1D0B]/90 hover:bg-[#3A2810]";
    textColor = "text-amber-300";
  }

  return (
    <button
      onClick={openPlansModal}
      className={`flex items-center gap-2 border px-3 py-1.5 rounded-xl text-xs font-mono font-bold tracking-wider transition-all duration-200 cursor-pointer shadow-sm active:scale-95 group ${badgeBorderColor} ${badgeBgColor} ${textColor}`}
      title="Clique para ver extrato de consumo e gerenciar seu Plano de Créditos"
    >
      <div className="flex items-center gap-1.5">
        <div className={`w-2 h-2 rounded-full ${isZeroCredits ? 'bg-red-400' : isLowCredits ? 'bg-amber-400 animate-pulse' : 'bg-indigo-400'}`}></div>
        
        {/* Plan pill */}
        <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/40 border border-white/10 uppercase tracking-widest font-black">
          {plan.id}
        </span>
      </div>

      <div className="flex items-baseline gap-1">
        <span className="font-extrabold text-white text-xs">
          {balance.toLocaleString('pt-BR')}
        </span>
        <span className="text-[10px] opacity-70 font-normal">
          / {monthlyAllocation.toLocaleString('pt-BR')} CR
        </span>
      </div>

      <LucideIcon name="chevron-right" className="w-3 h-3 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
    </button>
  );
}
