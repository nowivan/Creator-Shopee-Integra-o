import React, { useState } from 'react';
import { LucideIcon } from '../Common';
import {
  MonthlyProjection,
  SpendCap,
  DataQualityMetrics,
  saveMonthlySpendCapBrl
} from '../../services/costIntelligenceService';
import { formatCurrencyBrl } from '../../services/aiPricingRegistry';

interface CostProjectionAndSpendCapProps {
  projection: MonthlyProjection;
  spendCap: SpendCap;
  dataQuality: DataQualityMetrics;
  onSpendCapUpdated?: () => void;
}

export function CostProjectionAndSpendCap({
  projection,
  spendCap,
  dataQuality,
  onSpendCapUpdated
}: CostProjectionAndSpendCapProps) {
  const [isEditingCap, setIsEditingCap] = useState(false);
  const [customCapInput, setCustomCapInput] = useState(spendCap.monthlySpendCapBrl.toString());

  const handleSaveCap = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(customCapInput);
    if (Number.isFinite(val) && val > 0) {
      saveMonthlySpendCapBrl(val);
      setIsEditingCap(false);
      if (onSpendCapUpdated) onSpendCapUpdated();
    }
  };

  const getCapColor = () => {
    if (spendCap.percentageUsed >= 100) return 'bg-red-500 text-red-400 border-red-500';
    if (spendCap.percentageUsed >= 80) return 'bg-amber-500 text-amber-400 border-amber-500';
    return 'bg-indigo-500 text-indigo-400 border-indigo-500';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* 1. Monthly Projection Card */}
      <div className="lg:col-span-4 bg-[#0B0F19]/90 border border-slate-800/80 rounded-3xl p-5 md:p-6 shadow-xl flex flex-col justify-between relative overflow-hidden">
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 grid place-items-center text-purple-400">
                <LucideIcon name="trending-up" className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white tracking-tight">Projeção Mensal de Custo</h3>
            </div>
            <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-900 px-2 py-0.5 rounded-full border border-slate-800">
              Estimativa
            </span>
          </div>

          <div className="mt-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Gasto Atual no Mês:</span>
              <strong className="text-white font-mono">{formatCurrencyBrl(projection.currentAccumulatedBrl)}</strong>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Média Diária Ativa:</span>
              <span className="text-slate-300 font-mono">{formatCurrencyBrl(projection.dailyAverageActiveDaysBrl)}/dia</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Dias Restantes:</span>
              <span className="text-slate-300 font-mono">{projection.daysRemaining} de {projection.daysInMonth} dias</span>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between">
          <span className="text-xs text-slate-400 font-medium">Projeção Final:</span>
          <div className="text-lg font-extrabold font-mono text-purple-400">
            {formatCurrencyBrl(projection.projectedTotalBrl)}
          </div>
        </div>
      </div>

      {/* 2. Internal Spend Cap Card */}
      <div className="lg:col-span-5 bg-[#0B0F19]/90 border border-slate-800/80 rounded-3xl p-5 md:p-6 shadow-xl flex flex-col justify-between relative overflow-hidden">
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 grid place-items-center text-indigo-400">
                <LucideIcon name="target" className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white tracking-tight">Limite Interno de Gasto (Spend Cap)</h3>
            </div>
            <button
              onClick={() => setIsEditingCap(!isEditingCap)}
              className="text-[11px] font-mono text-indigo-400 hover:text-indigo-300 cursor-pointer flex items-center gap-1"
            >
              <LucideIcon name="edit-2" className="w-3 h-3" />
              {isEditingCap ? 'Cancelar' : 'Ajustar'}
            </button>
          </div>

          {isEditingCap ? (
            <form onSubmit={handleSaveCap} className="mt-4 p-3 bg-slate-900/90 rounded-2xl border border-indigo-500/30 flex items-center gap-2">
              <span className="text-xs font-mono text-slate-400">R$</span>
              <input
                type="number"
                step="5"
                min="10"
                max="5000"
                value={customCapInput}
                onChange={e => setCustomCapInput(e.target.value)}
                className="w-full bg-transparent text-sm font-mono text-white border-none outline-none"
                placeholder="Ex: 150"
              />
              <button
                type="submit"
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold font-mono cursor-pointer transition"
              >
                Salvar
              </button>
            </form>
          ) : (
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Gasto Atual / Teto:</span>
                <span className="font-mono font-bold text-white">
                  {formatCurrencyBrl(spendCap.currentSpendBrl)} / <span className="text-indigo-300">{formatCurrencyBrl(spendCap.monthlySpendCapBrl)}</span>
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div
                  style={{ width: `${Math.min(100, spendCap.percentageUsed)}%` }}
                  className={`h-full transition-all duration-500 rounded-full ${
                    spendCap.percentageUsed >= 100
                      ? 'bg-red-500 animate-pulse'
                      : spendCap.percentageUsed >= 80
                      ? 'bg-amber-500'
                      : 'bg-gradient-to-r from-indigo-600 to-cyan-400'
                  }`}
                />
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs">
          <span className="text-slate-400">Consumo do Teto:</span>
          <span className={`font-mono font-extrabold ${getCapColor().split(' ')[1]}`}>
            {spendCap.percentageUsed}% {spendCap.isExceeded ? '(Limite Excedido)' : ''}
          </span>
        </div>
      </div>

      {/* 3. Cost Data Quality Badges */}
      <div className="lg:col-span-3 bg-[#0B0F19]/90 border border-slate-800/80 rounded-3xl p-5 md:p-6 shadow-xl flex flex-col justify-between relative overflow-hidden">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 grid place-items-center text-emerald-400">
              <LucideIcon name="shield-check" className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white tracking-tight">Qualidade da Medição</h3>
          </div>

          <div className="mt-4 space-y-3">
            <div className="p-3 bg-slate-900/60 rounded-2xl border border-slate-800/80">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-mono text-[11px]">Token Coverage:</span>
                <span className="font-mono font-bold text-emerald-400">{dataQuality.tokenCoveragePercent}%</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {dataQuality.requestsWithTokens} de {dataQuality.totalFinishedRequests} requisições auditadas
              </p>
            </div>

            <div className="p-3 bg-slate-900/60 rounded-2xl border border-slate-800/80">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-mono text-[11px]">Pricing Coverage:</span>
                <span className="font-mono font-bold text-indigo-400">{dataQuality.pricingCoveragePercent}%</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Modelos com tabela de preço oficial vinculada
              </p>
            </div>

            <div className="p-3 bg-slate-900/60 rounded-2xl border border-slate-800/80">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-mono text-[11px]">Attribution Coverage:</span>
                <span className="font-mono font-bold text-cyan-400">{dataQuality.toolAttributionCoveragePercent}%</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Módulos mapeados para toolId canônico
              </p>
            </div>
          </div>
        </div>

        <div className="mt-3 text-[10px] font-mono text-slate-500 text-center">
          Garantia de Não-Estimativa Fantasma
        </div>
      </div>
    </div>
  );
}
