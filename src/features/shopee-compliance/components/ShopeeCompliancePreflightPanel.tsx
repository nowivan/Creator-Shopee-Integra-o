/**
 * SHOPEE COMPLIANCE PREFLIGHT PANEL COMPONENT
 * 
 * Compact, high-visibility UI component rendering Shopee Video Account Health status:
 * [ APTO ] | [ REVISÃO NECESSÁRIA ] | [ BLOQUEADO ]
 * 
 * Displays the 7 core safety checklist items and detailed violation alerts with offending phrases.
 */

import React, { useState } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Info,
  Lock
} from 'lucide-react';
import { ShopeeComplianceReport, ShopeeComplianceViolation } from '../types';

interface ShopeeCompliancePreflightPanelProps {
  report: ShopeeComplianceReport;
  className?: string;
  title?: string;
}

export const ShopeeCompliancePreflightPanel: React.FC<ShopeeCompliancePreflightPanelProps> = ({
  report,
  className = '',
  title = 'SHOPEE VIDEO HEALTH — CONFORMIDADE DE CONTA'
}) => {
  const [isExpanded, setIsExpanded] = useState(report.status === 'BLOQUEADO');

  // Status Styling
  const statusBadge = (() => {
    switch (report.status) {
      case 'APTO':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>APTO PARA VEICULAÇÃO</span>
          </div>
        );
      case 'REVISAO_NECESSARIA':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>REVISÃO NECESSÁRIA</span>
          </div>
        );
      case 'BLOQUEADO':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-300 border border-red-500/40">
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>BLOQUEADO (RISCO DE CONTA)</span>
          </div>
        );
    }
  })();

  const checklistItems = [
    { label: 'Produto visível', ok: report.checklist.productVisible },
    { label: 'Benefício factual', ok: report.checklist.benefitGrounded },
    { label: 'Promessas e garantias', ok: report.checklist.noUnsupportedGuarantee },
    { label: 'Condições comerciais', ok: report.checklist.commercialConditionsValid },
    { label: "Marca d'água / UI externa", ok: report.checklist.noExternalWatermarkOrUI },
    { label: 'Privacidade', ok: report.checklist.privacyProtected },
    { label: 'CTA Shopee', ok: report.checklist.ctaValid }
  ];

  return (
    <div
      className={`rounded-xl border transition-all text-xs ${
        report.status === 'BLOQUEADO'
          ? 'bg-red-950/20 border-red-800/60 shadow-lg shadow-red-950/20'
          : report.status === 'REVISAO_NECESSARIA'
          ? 'bg-amber-950/20 border-amber-800/60'
          : 'bg-emerald-950/15 border-emerald-800/40'
      } ${className}`}
    >
      {/* Header Bar */}
      <div className="p-3.5 flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800/60">
        <div className="flex items-center gap-2">
          <ShieldCheck
            className={`w-4 h-4 ${
              report.status === 'BLOQUEADO'
                ? 'text-red-400'
                : report.status === 'REVISAO_NECESSARIA'
                ? 'text-amber-400'
                : 'text-emerald-400'
            }`}
          />
          <span className="font-bold tracking-wider uppercase text-neutral-200 text-[11px]">
            {title}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {statusBadge}
          {report.violations.length > 0 && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 text-neutral-400 hover:text-white rounded hover:bg-neutral-800/60 transition-colors"
              title={isExpanded ? 'Recolher detalhes' : 'Ver violações e avisos'}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Checklist Grid */}
      <div className="p-3.5 bg-neutral-950/40">
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
          {checklistItems.map((item, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium border ${
                item.ok
                  ? 'bg-emerald-950/20 border-emerald-800/30 text-emerald-300'
                  : 'bg-red-950/30 border-red-800/40 text-red-300'
              }`}
            >
              {item.ok ? (
                <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
              ) : (
                <AlertOctagon className="w-3 h-3 text-red-400 shrink-0" />
              )}
              <span className="truncate">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Expanded Violations Details */}
      {isExpanded && report.violations.length > 0 && (
        <div className="p-3.5 space-y-2.5 border-t border-neutral-800/60 bg-neutral-950/60">
          <div className="flex items-center justify-between text-[11px] text-neutral-400 font-semibold">
            <span>Violações Identificadas ({report.violations.length})</span>
            <span className="text-[10px] text-amber-400 flex items-center gap-1">
              <Lock className="w-3 h-3" />
              Palavras manuais não são alteradas automaticamente.
            </span>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {report.violations.map((v: ShopeeComplianceViolation, idx: number) => (
              <div
                key={idx}
                className={`p-2.5 rounded-lg border text-left space-y-1 ${
                  v.severity === 'critical'
                    ? 'bg-red-950/30 border-red-800/50 text-red-200'
                    : 'bg-amber-950/25 border-amber-800/50 text-amber-200'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 font-bold text-[11px]">
                    {v.severity === 'critical' ? (
                      <AlertOctagon className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    )}
                    <span>{v.code}</span>
                    {v.field && (
                      <span className="text-neutral-400 font-normal">({v.field})</span>
                    )}
                  </div>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-mono uppercase font-bold ${
                      v.blocking ? 'bg-red-500/30 text-red-300' : 'bg-amber-500/30 text-amber-300'
                    }`}
                  >
                    {v.blocking ? 'Bloqueante' : 'Aviso'}
                  </span>
                </div>

                <p className="text-xs leading-relaxed text-neutral-300">{v.message}</p>

                {v.offendingText && (
                  <div className="text-[11px] font-mono bg-black/40 px-2 py-1 rounded text-red-300">
                    <span className="text-neutral-500">Termo detectado:</span> &quot;{v.offendingText}&quot;
                  </div>
                )}

                {v.suggestedAction && (
                  <div className="text-[11px] text-neutral-400 flex items-start gap-1 pt-0.5">
                    <Info className="w-3 h-3 text-neutral-500 shrink-0 mt-0.5" />
                    <span><strong className="text-neutral-300">Ação recomendada:</strong> {v.suggestedAction}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
