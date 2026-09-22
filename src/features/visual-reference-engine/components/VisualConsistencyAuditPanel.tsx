import React, { useState } from 'react';
import {
  VisualConsistencyValidation,
  ValidationDomain,
  VisualConsistencyIssue,
  HandoffTraceLog
} from '../types/validationTypes';

interface VisualConsistencyAuditPanelProps {
  validation: VisualConsistencyValidation;
  isCompact?: boolean;
  defaultExpanded?: boolean;
}

export const VisualConsistencyAuditPanel: React.FC<VisualConsistencyAuditPanelProps> = ({
  validation,
  isCompact = false,
  defaultExpanded = false
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [showTrace, setShowTrace] = useState(false);

  const getStatusBadge = (status: 'PASS' | 'WARNING' | 'FAIL' | undefined) => {
    switch (status) {
      case 'PASS':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            PASS
          </span>
        );
      case 'WARNING':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            WARNING
          </span>
        );
      case 'FAIL':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
            FAIL
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-neutral-800 text-neutral-400 border border-neutral-700">
            N/A
          </span>
        );
    }
  };

  const getDomainStatus = (domain?: ValidationDomain): 'PASS' | 'WARNING' | 'FAIL' => {
    if (!domain || !domain.present) return 'PASS';
    if (!domain.preserved) {
      return (domain.conflictingInstructions && domain.conflictingInstructions.length > 0) ? 'FAIL' : 'WARNING';
    }
    return 'PASS';
  };

  const domains: { label: string; domain?: ValidationDomain }[] = [
    { label: 'Avatar Identity', domain: validation.avatarIdentity },
    { label: 'Wardrobe', domain: validation.wardrobe },
    { label: 'Pose / Action', domain: validation.poseAction },
    { label: 'Product Object', domain: validation.product },
    { label: 'Kit Composition', domain: validation.kitComposition },
    { label: 'Background', domain: validation.background },
    { label: 'Camera', domain: validation.camera },
    { label: 'Motion Safety', domain: validation.motionSafety }
  ];

  return (
    <div
      id="visual-consistency-audit-panel"
      className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-4 text-neutral-200 text-sm font-sans"
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Visual Consistency Audit
          </span>
          {getStatusBadge(validation.overallStatus)}
          {validation.issues.length > 0 && (
            <span className="text-xs text-neutral-400">
              ({validation.issues.length} {validation.issues.length === 1 ? 'issue' : 'issues'})
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {validation.handoffTrace && (
            <button
              type="button"
              onClick={() => setShowTrace(!showTrace)}
              className="text-xs text-neutral-400 hover:text-neutral-200 underline transition-colors"
            >
              {showTrace ? 'Hide Trace' : 'Show Trace'}
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-neutral-400 hover:text-neutral-200 px-2 py-1 rounded bg-neutral-800/80 transition-colors"
          >
            {isExpanded ? 'Collapse' : 'Expand'}
          </button>
        </div>
      </div>

      {/* Domain Badges Grid */}
      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
        {domains.map((item) => {
          const isPresent = item.domain?.present;
          const status = isPresent ? getDomainStatus(item.domain) : undefined;

          return (
            <div
              key={item.label}
              className="flex items-center justify-between px-2.5 py-1.5 rounded bg-neutral-950/40 border border-neutral-800/80 text-xs"
            >
              <span className="text-neutral-400">{item.label}</span>
              {getStatusBadge(status)}
            </div>
          );
        })}
      </div>

      {/* Expanded Details & Issues */}
      {isExpanded && (
        <div className="mt-4 pt-3 border-t border-neutral-800 space-y-3">
          {validation.issues.length === 0 ? (
            <p className="text-xs text-emerald-400">
              All visual authorities verified: zero cross-contamination detected across avatar, wardrobe, pose, and product locks.
            </p>
          ) : (
            <div className="space-y-2">
              <span className="text-xs font-semibold text-neutral-400">Audit Findings:</span>
              {validation.issues.map((issue) => (
                <div
                  key={issue.id}
                  className={`p-2.5 rounded border text-xs ${
                    issue.severity === 'FAIL'
                      ? 'bg-rose-950/20 border-rose-800/40 text-rose-300'
                      : 'bg-amber-950/20 border-amber-800/40 text-amber-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-semibold">{issue.severity}: {issue.rule}</span>
                    <span className="text-[10px] uppercase opacity-75 font-mono">{issue.domain}</span>
                  </div>
                  <p className="text-neutral-300 leading-relaxed">{issue.message}</p>
                  {issue.conflictingData && (
                    <div className="mt-1.5 pt-1.5 border-t border-neutral-800/60 font-mono text-[11px] text-neutral-400">
                      <div>Expected: <span className="text-emerald-400">{issue.conflictingData.expected}</span></div>
                      <div>Found: <span className="text-rose-400">{issue.conflictingData.found}</span></div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Collapsible Handoff Trace */}
      {showTrace && validation.handoffTrace && (
        <div className="mt-4 pt-3 border-t border-neutral-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-neutral-400">Handoff Diagnostics Trace</span>
            <span className="text-[10px] text-neutral-500 font-mono">
              {new Date(validation.handoffTrace.generatedAt).toLocaleTimeString()}
            </span>
          </div>

          <div className="space-y-2 font-mono text-xs">
            {validation.handoffTrace.steps.map((step) => (
              <div
                key={step.stepNumber}
                className="p-2 rounded bg-neutral-950/60 border border-neutral-800/60 text-neutral-300"
              >
                <div className="flex items-center gap-2 text-neutral-400 text-[11px] mb-1">
                  <span className="text-neutral-500">[{step.stepNumber}]</span>
                  <span className="text-neutral-300 font-semibold">{step.source}</span>
                  <span>→</span>
                  <span className="text-sky-400">{step.transform}</span>
                  <span>→</span>
                  <span className="text-neutral-300">{step.consumer}</span>
                </div>
                <div className="text-[11px] text-neutral-400 pl-4 border-l border-neutral-800">
                  {step.payloadSummary}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-neutral-500">{validation.handoffTrace.summary}</p>
        </div>
      )}
    </div>
  );
};
