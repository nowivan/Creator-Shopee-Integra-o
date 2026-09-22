import React, { useState } from 'react';
import { useCredits } from '../../context/CreditContext';
import { getAllPlans, getPlan } from '../../services/planRegistry';
import { CreatorPlanId, CreditUsageLedgerEntry } from '../../types/credits';
import { CREDIT_ACTION_REGISTRY } from '../../services/creditActionRegistry';
import { LucideIcon } from '../Common';

export function PlanAndCreditsModal() {
  const { 
    account, 
    plan, 
    balance, 
    monthlyAllocation, 
    ledger, 
    isPlansModalOpen, 
    closePlansModal, 
    setUserPlan,
    grantBonusCredits
  } = useCredits();

  const [activeTab, setActiveTab] = useState<'extrato' | 'planos' | 'custos'>('extrato');
  const [isChangingPlan, setIsChangingPlan] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  if (!isPlansModalOpen) return null;

  const allPlans = getAllPlans();
  const isAdmin = plan.id === 'ADMIN' || account?.isAdminBypass;

  const daysUntilRenewal = account?.billingCycleEnd
    ? Math.max(0, Math.ceil((account.billingCycleEnd - Date.now()) / (1000 * 60 * 60 * 24)))
    : 30;

  const usagePercent = monthlyAllocation > 0
    ? Math.min(100, Math.max(0, Math.round(((monthlyAllocation - balance) / monthlyAllocation) * 100)))
    : 0;

  const handleSelectPlan = async (targetPlanId: CreatorPlanId) => {
    setIsChangingPlan(true);
    setFeedbackMsg(null);
    try {
      await setUserPlan(targetPlanId);
      setFeedbackMsg(`Plano alterado com sucesso para ${getPlan(targetPlanId).name}!`);
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch (e: any) {
      setFeedbackMsg(e.message || "Erro ao alterar plano.");
    } finally {
      setIsChangingPlan(false);
    }
  };

  const handleGrantBonus = async (amount: number) => {
    try {
      await grantBonusCredits(amount, `Recarga de teste (${amount} créditos)`);
      setFeedbackMsg(`+${amount} créditos adicionados ao seu saldo!`);
      setTimeout(() => setFeedbackMsg(null), 3000);
    } catch (e: any) {
      setFeedbackMsg(e.message || "Erro ao adicionar bônus.");
    }
  };

  const fmtDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit', 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getLedgerBadge = (entry: CreditUsageLedgerEntry) => {
    switch (entry.type) {
      case 'DEBIT':
        return (
          <span className="bg-red-950/70 border border-red-800/50 text-red-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded">
            DÉBITO
          </span>
        );
      case 'REFUND':
        return (
          <span className="bg-emerald-950/70 border border-emerald-800/50 text-emerald-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded">
            ESTORNO
          </span>
        );
      case 'INITIAL_GRANT':
      case 'MONTHLY_RENEWAL':
      case 'PLAN_UPGRADE':
        return (
          <span className="bg-indigo-950/70 border border-indigo-800/50 text-indigo-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded">
            RECARGA
          </span>
        );
      case 'ADMIN_ADJUSTMENT':
        return (
          <span className="bg-amber-950/70 border border-amber-800/50 text-amber-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded">
            AJUSTE
          </span>
        );
      default:
        return (
          <span className="bg-neutral-800 text-neutral-400 text-[10px] font-mono px-2 py-0.5 rounded">
            LOG
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div 
        className="bg-[#0D0D11] border border-neutral-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-neutral-200 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-neutral-800/80 bg-[#121216] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <LucideIcon name="coins" className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-white text-base tracking-tight font-sans">
                  Creator Intelligence Credits & Planos
                </h2>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-black uppercase tracking-wider border ${plan.badgeColor}`}>
                  {plan.id}
                </span>
              </div>
              <p className="text-xs text-neutral-400 font-sans mt-0.5">
                Controle central de consumo interno de créditos e permissões da suíte
              </p>
            </div>
          </div>

          <button
            onClick={closePlansModal}
            className="w-8 h-8 rounded-xl bg-neutral-800/60 hover:bg-neutral-700 text-neutral-400 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <LucideIcon name="x" className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 border-b border-neutral-800/60 bg-[#0A0A0D] flex gap-2 pt-2">
          <button
            onClick={() => setActiveTab('extrato')}
            className={`px-4 py-2.5 text-xs font-mono font-bold uppercase tracking-wider transition border-b-2 flex items-center gap-2 cursor-pointer ${activeTab === 'extrato' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-neutral-400 hover:text-neutral-200'}`}
          >
            <LucideIcon name="wallet" className="w-3.5 h-3.5" />
            <span>Meu Saldo & Extrato</span>
          </button>

          <button
            onClick={() => setActiveTab('planos')}
            className={`px-4 py-2.5 text-xs font-mono font-bold uppercase tracking-wider transition border-b-2 flex items-center gap-2 cursor-pointer ${activeTab === 'planos' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-neutral-400 hover:text-neutral-200'}`}
          >
            <LucideIcon name="sparkles" className="w-3.5 h-3.5" />
            <span>Planos & Entitlements</span>
          </button>

          <button
            onClick={() => setActiveTab('custos')}
            className={`px-4 py-2.5 text-xs font-mono font-bold uppercase tracking-wider transition border-b-2 flex items-center gap-2 cursor-pointer ${activeTab === 'custos' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-neutral-400 hover:text-neutral-200'}`}
          >
            <LucideIcon name="list" className="w-3.5 h-3.5" />
            <span>Tabela de Créditos por Ação</span>
          </button>
        </div>

        {/* Feedback alert */}
        {feedbackMsg && (
          <div className="mx-6 mt-4 p-3 bg-indigo-950/60 border border-indigo-600/40 text-indigo-200 text-xs rounded-xl flex items-center gap-2 animate-fade-in font-mono">
            <LucideIcon name="check-circle" className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
        )}

        {/* Body content based on activeTab */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {activeTab === 'extrato' && (
            <div className="space-y-6">
              {/* Account Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Balance Card */}
                <div className="bg-gradient-to-br from-[#121424] to-[#0D0D14] border border-indigo-500/25 p-5 rounded-2xl relative overflow-hidden">
                  <div className="flex items-center justify-between text-neutral-400 text-xs font-mono">
                    <span>SALDO ATUAL</span>
                    <LucideIcon name="coins" className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-white tracking-tight">
                      {isAdmin ? 'ILIMITADO' : balance.toLocaleString('pt-BR')}
                    </span>
                    <span className="text-xs font-mono text-indigo-400 font-bold">CR</span>
                  </div>
                  <div className="mt-3 text-[11px] text-neutral-400 flex items-center justify-between">
                    <span>Cota do ciclo:</span>
                    <span className="font-mono font-bold text-neutral-200">{monthlyAllocation.toLocaleString('pt-BR')} CR</span>
                  </div>
                </div>

                {/* Consumption Progress */}
                <div className="bg-[#121217] border border-neutral-800 p-5 rounded-2xl flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-neutral-400 text-xs font-mono">
                      <span>CICLO MENSAL</span>
                      <span className="text-[10px] text-indigo-400 font-bold">
                        {daysUntilRenewal} {daysUntilRenewal === 1 ? 'dia restante' : 'dias restantes'}
                      </span>
                    </div>
                    <div className="mt-3 flex items-baseline justify-between text-xs font-mono">
                      <span className="text-neutral-300">Uso do Ciclo:</span>
                      <span className="font-bold text-white">{isAdmin ? '0%' : `${usagePercent}%`}</span>
                    </div>
                    <div className="w-full h-2 bg-neutral-800 rounded-full mt-2 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${usagePercent > 85 ? 'bg-red-500' : usagePercent > 60 ? 'bg-amber-500' : 'bg-indigo-500'}`}
                        style={{ width: `${isAdmin ? 5 : usagePercent}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="mt-3 text-[10px] text-neutral-500 font-mono">
                    Renovação em: {account?.billingCycleEnd ? new Date(account.billingCycleEnd).toLocaleDateString('pt-BR') : '--'}
                  </div>
                </div>

                {/* Lifetime Stats */}
                <div className="bg-[#121217] border border-neutral-800 p-5 rounded-2xl flex flex-col justify-between">
                  <div className="flex items-center justify-between text-neutral-400 text-xs font-mono">
                    <span>HISTÓRICO TOTAL</span>
                    <LucideIcon name="activity" className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="space-y-1.5 mt-2 text-xs font-mono">
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Total Consumido:</span>
                      <span className="text-neutral-200 font-bold">{account?.lifetimeUsedCredits?.toLocaleString('pt-BR') || 0} CR</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Total Concedido:</span>
                      <span className="text-neutral-200 font-bold">{account?.lifetimeGrantedCredits?.toLocaleString('pt-BR') || monthlyAllocation} CR</span>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => handleGrantBonus(100)}
                      className="w-full py-1.5 px-2 bg-indigo-950/60 hover:bg-indigo-900/80 border border-indigo-800/50 text-indigo-300 hover:text-white rounded-lg text-[10px] font-mono font-bold uppercase transition cursor-pointer text-center"
                    >
                      +100 Teste
                    </button>
                    <button
                      onClick={() => handleGrantBonus(500)}
                      className="w-full py-1.5 px-2 bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-800/50 text-emerald-300 hover:text-white rounded-lg text-[10px] font-mono font-bold uppercase transition cursor-pointer text-center"
                    >
                      +500 Teste
                    </button>
                  </div>
                </div>
              </div>

              {/* Transaction Ledger Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                    <LucideIcon name="history" className="w-4 h-4 text-indigo-400" /> Extrato Detalhado de Transações
                  </h3>
                  <span className="text-[10px] text-neutral-500 font-mono">Últimos {ledger.length} registros</span>
                </div>

                {ledger.length === 0 ? (
                  <div className="bg-[#121217] border border-neutral-800/80 rounded-2xl p-8 text-center text-neutral-500 font-mono text-xs">
                    Nenhuma movimentação de créditos registrada ainda.
                  </div>
                ) : (
                  <div className="bg-[#121217] border border-neutral-800/80 rounded-2xl overflow-hidden">
                    <div className="max-h-72 overflow-y-auto custom-scrollbar">
                      <table className="w-full text-left text-xs font-mono">
                        <thead className="bg-neutral-900/70 border-b border-neutral-800 text-[10px] text-neutral-400 uppercase tracking-wider sticky top-0 backdrop-blur-sm">
                          <tr>
                            <th className="p-3">Data / Hora</th>
                            <th className="p-3">Tipo</th>
                            <th className="p-3">Ferramenta / Motivo</th>
                            <th className="p-3 text-right">Créditos</th>
                            <th className="p-3 text-right">Saldo Final</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-800/50">
                          {ledger.map((entry) => (
                            <tr key={entry.id} className="hover:bg-neutral-900/40 transition">
                              <td className="p-3 text-neutral-400 whitespace-nowrap text-[11px]">
                                {fmtDate(entry.timestamp)}
                              </td>
                              <td className="p-3 whitespace-nowrap">
                                {getLedgerBadge(entry)}
                              </td>
                              <td className="p-3 text-neutral-200">
                                <div className="font-medium truncate max-w-xs">{entry.reason || entry.toolLabel || entry.actionId}</div>
                                {entry.toolId && (
                                  <span className="text-[9px] text-neutral-500 font-mono">
                                    ID: {entry.toolId}
                                  </span>
                                )}
                              </td>
                              <td className={`p-3 text-right font-bold whitespace-nowrap ${entry.amount < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                {entry.amount > 0 ? `+${entry.amount}` : entry.amount} CR
                              </td>
                              <td className="p-3 text-right text-neutral-300 font-semibold whitespace-nowrap">
                                {entry.balanceAfter.toLocaleString('pt-BR')} CR
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'planos' && (
            <div className="space-y-6">
              <div className="text-center max-w-lg mx-auto space-y-1">
                <h3 className="text-base font-bold text-white">Compare os Planos Creator Intelligence</h3>
                <p className="text-xs text-neutral-400 font-sans">
                  Selecione um plano para testar o comportamento de bloqueios e limites da suíte em tempo real.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {allPlans.map((p) => {
                  const isCurrent = plan.id === p.id;

                  return (
                    <div 
                      key={p.id}
                      className={`rounded-2xl p-5 border flex flex-col justify-between transition-all duration-200 relative ${isCurrent ? 'bg-[#151728] border-indigo-500 shadow-lg shadow-indigo-500/10' : 'bg-[#121217] border-neutral-800 hover:border-neutral-700'}`}
                    >
                      {p.isPopular && (
                        <span className="absolute -top-2.5 right-4 bg-indigo-600 text-white text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full tracking-widest shadow-md">
                          MAIS POPULAR
                        </span>
                      )}

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-bold text-neutral-400 uppercase tracking-wider">{p.targetAudience}</span>
                          <span className={`text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded border ${p.badgeColor}`}>
                            {p.id}
                          </span>
                        </div>

                        <div>
                          <h4 className="font-extrabold text-white text-lg">{p.name}</h4>
                          <p className="text-[11px] text-neutral-400 leading-relaxed mt-1 font-sans">{p.description}</p>
                        </div>

                        <div className="pt-2 border-t border-neutral-800">
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-black text-white font-mono">
                              {p.monthlyCredits === 999999 ? 'ILIMITADO' : p.monthlyCredits.toLocaleString('pt-BR')}
                            </span>
                            <span className="text-xs text-neutral-400 font-mono">créditos/mês</span>
                          </div>
                        </div>

                        <ul className="space-y-1.5 text-xs text-neutral-300 pt-2 border-t border-neutral-800/60">
                          {p.features.map((feat, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <LucideIcon name="check" className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                              <span className="text-[11px] leading-snug">{feat}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="mt-6 pt-4 border-t border-neutral-800">
                        {isCurrent ? (
                          <div className="w-full py-2.5 bg-indigo-600/20 border border-indigo-500/40 text-indigo-300 text-xs font-mono font-bold uppercase rounded-xl text-center flex items-center justify-center gap-1.5">
                            <LucideIcon name="check-circle" className="w-4 h-4 text-indigo-400" />
                            <span>Plano Atual</span>
                          </div>
                        ) : (
                          <button
                            disabled={isChangingPlan}
                            onClick={() => handleSelectPlan(p.id)}
                            className="w-full py-2.5 bg-neutral-800 hover:bg-indigo-600 border border-neutral-700 hover:border-indigo-500 text-white text-xs font-mono font-bold uppercase rounded-xl transition cursor-pointer active:scale-95 disabled:opacity-50"
                          >
                            Ativar Plano {p.id}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'custos' && (
            <div className="space-y-4">
              <div className="text-left space-y-1">
                <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">Tabela de Custo em Créditos por Ferramenta</h3>
                <p className="text-xs text-neutral-400 font-sans">
                  Cada ação consome uma quantidade fixa e transparente de créditos no momento da execução:
                </p>
              </div>

              <div className="bg-[#121217] border border-neutral-800 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-neutral-900/70 border-b border-neutral-800 text-[10px] text-neutral-400 uppercase tracking-wider">
                    <tr>
                      <th className="p-3">Ação / Ferramenta</th>
                      <th className="p-3">Descrição Técnica</th>
                      <th className="p-3 text-right">Custo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/50">
                    {Object.values(CREDIT_ACTION_REGISTRY).map((act) => (
                      <tr key={act.actionId} className="hover:bg-neutral-900/40 transition">
                        <td className="p-3 font-semibold text-white">
                          <div>{act.label}</div>
                          {act.toolId && <span className="text-[9px] text-neutral-500 font-mono">Tool: {act.toolId}</span>}
                        </td>
                        <td className="p-3 text-neutral-400 text-[11px]">
                          {act.description || '--'}
                        </td>
                        <td className="p-3 text-right font-black text-indigo-400 whitespace-nowrap">
                          {act.creditCost} CR
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-800 bg-[#121216] flex items-center justify-between shrink-0 text-xs font-mono text-neutral-400">
          <div className="flex items-center gap-2">
            <LucideIcon name="shield-check" className="w-4 h-4 text-emerald-400" />
            <span>Motor de Créditos & Entitlements Ativo (V4.8.2)</span>
          </div>
          <button
            onClick={closePlansModal}
            className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition font-mono font-bold cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
