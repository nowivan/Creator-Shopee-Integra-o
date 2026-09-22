import React from 'react';
import { LucideIcon } from '../Common';
import { UserCostItem, SessionCostStats } from '../../services/costIntelligenceService';
import { formatCurrencyBrl, formatCurrencyUsd, formatTokenCount } from '../../services/aiPricingRegistry';

interface UserAndSessionCostPanelProps {
  userCosts: UserCostItem[];
  sessionStats: SessionCostStats;
  hasData: boolean;
  currency: 'BRL' | 'USD';
}

export function UserAndSessionCostPanel({
  userCosts,
  sessionStats,
  hasData,
  currency
}: UserAndSessionCostPanelProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* 1. Masked User Cost Breakdown */}
      <div className="lg:col-span-8 bg-[#0B0F19]/90 border border-slate-800/80 rounded-3xl p-5 md:p-6 shadow-xl relative overflow-hidden">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/60">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <LucideIcon name="users" className="w-4 h-4 text-cyan-400" />
              Consumo por Usuário (Mascarado)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Identificadores anônimos para auditoria de comportamento e cotas futuras
            </p>
          </div>
          <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-900 px-2.5 py-1 rounded-full border border-slate-800">
            {userCosts.length} usuários
          </span>
        </div>

        <div className="mt-4 overflow-x-auto custom-scrollbar">
          {!hasData || userCosts.length === 0 ? (
            <div className="py-8 text-center text-slate-500">
              <p className="text-xs">Nenhum dado de usuário registrado no período.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-mono text-[10px] uppercase tracking-wider">
                  <th className="py-2.5 px-3">ID Mascarado</th>
                  <th className="py-2.5 px-3 text-right">Sessões</th>
                  <th className="py-2.5 px-3 text-right">Requisições</th>
                  <th className="py-2.5 px-3 text-right">Tokens Totais</th>
                  <th className="py-2.5 px-3 text-right">Custo Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {userCosts.map(user => (
                  <tr key={user.maskedUserId} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-cyan-300">
                      {user.maskedUserId}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                      {user.sessionsCount}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                      {user.requestsCount}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                      {formatTokenCount(user.totalTokens)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
                      {currency === 'BRL'
                        ? formatCurrencyBrl(user.totalCostBrl)
                        : formatCurrencyUsd(user.totalCostUsd)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 2. Session Cost Averages Card */}
      <div className="lg:col-span-4 bg-[#0B0F19]/90 border border-slate-800/80 rounded-3xl p-5 md:p-6 shadow-xl flex flex-col justify-between relative overflow-hidden">
        <div>
          <div className="flex items-center gap-2 pb-4 border-b border-slate-800/60">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 grid place-items-center text-amber-400">
              <LucideIcon name="activity" className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-white tracking-tight">Comportamento por Sessão</h3>
          </div>

          <div className="mt-4 space-y-3">
            <div className="p-3.5 bg-slate-900/60 rounded-2xl border border-slate-800/80 flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-400">Custo Médio / Sessão:</div>
                <div className="text-[10px] text-slate-500">Gasto médio por visita</div>
              </div>
              <strong className="text-sm font-mono font-bold text-emerald-400">
                {sessionStats.avgCostPerSessionBrl !== null
                  ? formatCurrencyBrl(sessionStats.avgCostPerSessionBrl)
                  : '—'}
              </strong>
            </div>

            <div className="p-3.5 bg-slate-900/60 rounded-2xl border border-slate-800/80 flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-400">Tokens / Sessão:</div>
                <div className="text-[10px] text-slate-500">Volume médio processado</div>
              </div>
              <strong className="text-sm font-mono font-bold text-cyan-400">
                {sessionStats.avgTokensPerSession !== null
                  ? formatTokenCount(sessionStats.avgTokensPerSession)
                  : '—'}
              </strong>
            </div>

            <div className="p-3.5 bg-slate-900/60 rounded-2xl border border-slate-800/80 flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-400">Execuções / Sessão:</div>
                <div className="text-[10px] text-slate-500">Gerações por jornada</div>
              </div>
              <strong className="text-sm font-mono font-bold text-white">
                {sessionStats.avgExecutionsPerSession !== null
                  ? sessionStats.avgExecutionsPerSession
                  : '—'}
              </strong>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800/60 text-[10px] font-mono text-slate-500 text-center">
          Base para Modelagem de Planos Futuros
        </div>
      </div>
    </div>
  );
}
