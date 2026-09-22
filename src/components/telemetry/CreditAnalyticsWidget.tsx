import React from 'react';
import { UsageTelemetryEvent } from '../../types/telemetry';
import { useCredits } from '../../context/CreditContext';
import { resolveCreditAction } from '../../services/creditActionRegistry';
import { LucideIcon } from '../Common';

interface CreditAnalyticsWidgetProps {
  events: UsageTelemetryEvent[];
}

export function CreditAnalyticsWidget({ events }: CreditAnalyticsWidgetProps) {
  const { account, plan, balance, monthlyAllocation, openPlansModal } = useCredits();

  const successfulEvents = events.filter(
    e => e.eventType === 'GENERATION_SUCCESS' || e.ai?.status === 'SUCCESS'
  );

  // Compute total credits consumed by events in the active telemetry period
  const toolCreditMap = new Map<string, { label: string; count: number; totalCredits: number }>();
  let totalCreditsConsumedInPeriod = 0;

  for (const ev of successfulEvents) {
    const mode = (ev.metadata?.mode || '').toString();
    const actionDef = resolveCreditAction(ev.toolId, mode);
    const cost = actionDef.creditCost;
    totalCreditsConsumedInPeriod += cost;

    const existing = toolCreditMap.get(ev.toolId) || {
      label: actionDef.label,
      count: 0,
      totalCredits: 0
    };
    existing.count += 1;
    existing.totalCredits += cost;
    toolCreditMap.set(ev.toolId, existing);
  }

  const sortedTools = Array.from(toolCreditMap.entries())
    .map(([toolId, data]) => ({ toolId, ...data }))
    .sort((a, b) => b.totalCredits - a.totalCredits)
    .slice(0, 4);

  const avgCreditsPerGen = successfulEvents.length > 0 
    ? (totalCreditsConsumedInPeriod / successfulEvents.length).toFixed(1)
    : '0.0';

  return (
    <div className="bg-[#121217] border border-indigo-500/20 rounded-2xl p-6 space-y-5 shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <LucideIcon name="coins" className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-white text-sm font-sans tracking-tight">
              Inteligência de Créditos do Creator
            </h3>
            <p className="text-[11px] text-neutral-400 font-sans">
              Métricas de consumo interno de créditos vs quota mensal
            </p>
          </div>
        </div>

        <button
          onClick={openPlansModal}
          className="px-3 py-1.5 bg-indigo-950/70 hover:bg-indigo-900/80 border border-indigo-700/50 text-indigo-300 hover:text-white rounded-lg text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer"
        >
          <span>Gerenciar Plano</span>
          <LucideIcon name="external-link" className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[#0D0D12] border border-neutral-800 p-4 rounded-xl">
          <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider block">Créditos no Período</span>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-white font-mono">{totalCreditsConsumedInPeriod.toLocaleString('pt-BR')}</span>
            <span className="text-xs font-mono text-indigo-400 font-bold">CR</span>
          </div>
          <span className="text-[10px] text-neutral-500 font-mono mt-1 block">em {successfulEvents.length} gerações</span>
        </div>

        <div className="bg-[#0D0D12] border border-neutral-800 p-4 rounded-xl">
          <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider block">Média por Execução</span>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-white font-mono">{avgCreditsPerGen}</span>
            <span className="text-xs font-mono text-neutral-400 font-bold">CR / gen</span>
          </div>
          <span className="text-[10px] text-neutral-500 font-mono mt-1 block">ponderado por ferramenta</span>
        </div>

        <div className="bg-[#0D0D12] border border-neutral-800 p-4 rounded-xl">
          <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider block">Saldo do Usuário</span>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-emerald-400 font-mono">{balance.toLocaleString('pt-BR')}</span>
            <span className="text-xs font-mono text-neutral-400 font-bold">/ {monthlyAllocation.toLocaleString('pt-BR')} CR</span>
          </div>
          <span className="text-[10px] text-neutral-500 font-mono mt-1 block">Plano: {plan.name}</span>
        </div>

        <div className="bg-[#0D0D12] border border-neutral-800 p-4 rounded-xl">
          <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider block">Total Histórico Consumido</span>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-indigo-300 font-mono">{account?.lifetimeUsedCredits?.toLocaleString('pt-BR') || 0}</span>
            <span className="text-xs font-mono text-indigo-400 font-bold">CR</span>
          </div>
          <span className="text-[10px] text-neutral-500 font-mono mt-1 block">desde a ativação da conta</span>
        </div>
      </div>

      {/* Top Credit-Consuming Tools Breakdown */}
      {sortedTools.length > 0 && (
        <div className="bg-[#0D0D12] border border-neutral-800/80 rounded-xl p-4 space-y-3">
          <span className="text-xs font-mono font-bold text-neutral-300 uppercase tracking-wider block">
            Top Ferramentas por Consumo de Créditos
          </span>

          <div className="space-y-2">
            {sortedTools.map((t) => {
              const pct = totalCreditsConsumedInPeriod > 0
                ? Math.round((t.totalCredits / totalCreditsConsumedInPeriod) * 100)
                : 0;

              return (
                <div key={t.toolId} className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-neutral-200 font-medium truncate max-w-xs">{t.label}</span>
                    <span className="text-indigo-400 font-bold">{t.totalCredits} CR ({pct}%)</span>
                  </div>
                  <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
