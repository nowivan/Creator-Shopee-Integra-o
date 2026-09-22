import React from 'react';
import { LucideIcon } from '../Common';
import { CostKpis } from '../../services/costIntelligenceService';
import { formatCurrencyBrl, formatCurrencyUsd, formatTokenCount } from '../../services/aiPricingRegistry';

interface CostKpiCardsProps {
  kpis: CostKpis;
  hasData: boolean;
  currency: 'BRL' | 'USD';
}

export function CostKpiCards({ kpis, hasData, currency }: CostKpiCardsProps) {
  const cards = [
    {
      id: 'tokens-total',
      title: 'Tokens Totais',
      value: hasData ? formatTokenCount(kpis.totalTokens) : '—',
      subtitle: hasData
        ? kpis.totalThinkingTokens > 0
          ? `In: ${formatTokenCount(kpis.totalInputTokens)} | Out: ${formatTokenCount(kpis.totalOutputTokens)} | Thk: ${formatTokenCount(kpis.totalThinkingTokens)}`
          : `In: ${formatTokenCount(kpis.totalInputTokens)} | Out: ${formatTokenCount(kpis.totalOutputTokens)}`
        : 'Aguardando telemetria',
      reconciledTag: hasData && kpis.totalTokens > 0 ? kpis.tokenReconciliationStatus : null,
      icon: 'cpu',
      accentColor: 'text-cyan-400',
      badgeBg: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
    },
    {
      id: 'cost-today',
      title: 'Custo API Hoje',
      value: hasData
        ? currency === 'BRL'
          ? formatCurrencyBrl(kpis.todayCostBrl)
          : formatCurrencyUsd(kpis.todayCostUsd)
        : '—',
      subtitle: hasData
        ? currency === 'BRL'
          ? `USD: ${formatCurrencyUsd(kpis.todayCostUsd)}`
          : `BRL: ${formatCurrencyBrl(kpis.todayCostBrl)}`
        : 'Gasto no dia atual',
      icon: 'clock',
      accentColor: 'text-emerald-400',
      badgeBg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
    },
    {
      id: 'cost-period',
      title: 'Custo no Período',
      value: hasData
        ? currency === 'BRL'
          ? formatCurrencyBrl(kpis.totalCostBrl)
          : formatCurrencyUsd(kpis.totalCostUsd)
        : '—',
      subtitle: hasData
        ? currency === 'BRL'
          ? `USD: ${formatCurrencyUsd(kpis.totalCostUsd)}`
          : `BRL: ${formatCurrencyBrl(kpis.totalCostBrl)}`
        : 'Consumo consolidado',
      icon: 'wallet',
      accentColor: 'text-indigo-400',
      badgeBg: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
    },
    {
      id: 'avg-cost',
      title: 'Custo Médio / Execução',
      value: hasData && kpis.avgCostPerRequestBrl !== null
        ? currency === 'BRL'
          ? formatCurrencyBrl(kpis.avgCostPerRequestBrl)
          : formatCurrencyUsd(kpis.avgCostPerRequestUsd)
        : '—',
      subtitle: hasData && kpis.avgTokensPerRequest !== null
        ? `~${formatTokenCount(kpis.avgTokensPerRequest)} tokens/req`
        : 'Média por geração',
      icon: 'zap',
      accentColor: 'text-amber-400',
      badgeBg: 'bg-amber-500/10 border-amber-500/20 text-amber-400'
    },
    {
      id: 'most-used-model',
      title: 'Modelo Mais Usado',
      value: hasData && kpis.mostUsedModel ? kpis.mostUsedModel.displayName : '—',
      subtitle: hasData && kpis.mostUsedModel
        ? `${kpis.mostUsedModel.count} reqs (${formatTokenCount(kpis.mostUsedModel.totalTokens)} tok)`
        : 'Volume por modelo',
      icon: 'sparkles',
      accentColor: 'text-purple-400',
      badgeBg: 'bg-purple-500/10 border-purple-500/20 text-purple-400'
    },
    {
      id: 'most-expensive-model',
      title: 'Modelo Mais Caro',
      value: hasData && kpis.mostExpensiveModel ? kpis.mostExpensiveModel.displayName : '—',
      subtitle: hasData && kpis.mostExpensiveModel
        ? currency === 'BRL'
          ? `${formatCurrencyBrl(kpis.mostExpensiveModel.totalCostBrl)} total`
          : `${formatCurrencyUsd(kpis.mostExpensiveModel.totalCostUsd)} total`
        : 'Maior custo acumulado',
      icon: 'dollar-sign',
      accentColor: 'text-rose-400',
      badgeBg: 'bg-rose-500/10 border-rose-500/20 text-rose-400'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {cards.map(card => (
        <div
          key={card.id}
          className="bg-[#0B0F19]/90 border border-slate-800/80 rounded-3xl p-4 md:p-5 flex flex-col justify-between shadow-xl relative overflow-hidden transition-all duration-300 hover:border-slate-700 group"
        >
          {/* Header & Icon */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 truncate">
              {card.title}
            </span>
            <div className={`w-8 h-8 rounded-xl border flex items-center justify-center ${card.badgeBg}`}>
              <LucideIcon name={card.icon} className="w-4 h-4" />
            </div>
          </div>

          {/* Metric Value */}
          <div className="mt-3">
            <div className="flex items-center gap-2">
              <div className={`text-xl md:text-2xl font-extrabold font-mono tracking-tight text-white truncate group-hover:${card.accentColor} transition-colors`}>
                {card.value}
              </div>
              {card.reconciledTag && (
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded uppercase tracking-wider border ${
                  card.reconciledTag === 'EXACT'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : card.reconciledTag === 'PARTIAL'
                    ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                }`}>
                  {card.reconciledTag === 'EXACT' ? 'Reconciliado' : card.reconciledTag === 'PARTIAL' ? 'Parcial' : 'Divergente'}
                </span>
              )}
            </div>
            <div className="text-[10px] text-slate-400 font-mono mt-1 truncate">
              {card.subtitle}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
