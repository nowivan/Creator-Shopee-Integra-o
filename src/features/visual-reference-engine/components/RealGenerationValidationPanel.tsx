import React, { useState } from 'react';
import {
  RealGenerationBatchRecord,
  RealGenerationClassification,
  RealGenerationValidationRecord
} from '../types/realGenerationTypes';

interface RealGenerationValidationPanelProps {
  batchRecord: RealGenerationBatchRecord;
  defaultExpanded?: boolean;
}

export const RealGenerationValidationPanel: React.FC<RealGenerationValidationPanelProps> = ({
  batchRecord,
  defaultExpanded = true
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const getClassificationBadge = (classification: RealGenerationClassification) => {
    switch (classification) {
      case 'VALIDATED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            VALIDATED
          </span>
        );
      case 'FLOW_VARIANCE':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            FLOW_VARIANCE
          </span>
        );
      case 'MODEL_SYSTEMATIC_LIMITATION':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            MODEL SYSTEMATIC LIMITATION
          </span>
        );
      case 'PIPELINE_BUG':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            PIPELINE_BUG
          </span>
        );
      case 'AUDITOR_GAP':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            AUDITOR_GAP
          </span>
        );
      case 'UNDETERMINED':
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-neutral-800 text-neutral-400 border border-neutral-700">
            UNDETERMINED
          </span>
        );
    }
  };

  const getRunBadge = (run: RealGenerationValidationRecord) => {
    const isPass = run.classification === 'VALIDATED';
    const hasDrift = Object.values(run.observedResult).some((s) => s === 'DRIFT');

    if (isPass) {
      return (
        <span className="text-xs font-medium text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
          PASS
        </span>
      );
    }

    if (hasDrift) {
      const driftedDomains = Object.entries(run.observedResult)
        .filter(([_, status]) => status === 'DRIFT')
        .map(([k]) => k)
        .join(', ');

      return (
        <span className="text-xs font-medium text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/40">
          DRIFT ({driftedDomains})
        </span>
      );
    }

    return (
      <span className="text-xs font-medium text-neutral-400 bg-neutral-800/40 px-2 py-0.5 rounded border border-neutral-700">
        {run.classification}
      </span>
    );
  };

  return (
    <div
      id="real-generation-validation-panel"
      className="rounded-lg border border-neutral-800 bg-neutral-900/70 p-4 text-neutral-200 text-sm font-sans"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Real Generation Validation
          </span>
          {getClassificationBadge(batchRecord.aggregateClassification)}
        </div>
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs text-neutral-400 hover:text-neutral-200 px-2 py-1 rounded bg-neutral-800/80 transition-colors"
        >
          {isExpanded ? 'Collapse' : 'Expand'}
        </button>
      </div>

      <div className="mt-2 text-xs text-neutral-400">
        <span className="font-semibold text-neutral-300">Scenario:</span> {batchRecord.scenario}
      </div>

      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-neutral-800 space-y-3">
          {/* Pre-Generation Audit Status */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded bg-neutral-950/40 border border-neutral-800">
              <span className="text-neutral-400 block mb-0.5">Pre-Generation Audit</span>
              <span className="font-semibold text-emerald-400">
                {batchRecord.preGenerationAudit.overallStatus}
              </span>
            </div>
            <div className="p-2 rounded bg-neutral-950/40 border border-neutral-800">
              <span className="text-neutral-400 block mb-0.5">Prompt Audit</span>
              <span className="font-semibold text-emerald-400">
                {batchRecord.preGenerationAudit.issues.length === 0 ? 'PASS (0 issues)' : `${batchRecord.preGenerationAudit.issues.length} issue(s)`}
              </span>
            </div>
          </div>

          {/* Generation Runs List */}
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-neutral-400">Generation Executions:</span>
            {batchRecord.generations.map((run, idx) => (
              <div
                key={run.id}
                className="flex items-center justify-between px-3 py-2 rounded bg-neutral-950/60 border border-neutral-800/60 text-xs"
              >
                <span className="text-neutral-300 font-mono">Generation {idx + 1}:</span>
                <div className="flex items-center gap-2">
                  {getRunBadge(run)}
                </div>
              </div>
            ))}
          </div>

          {/* Classification & Summary */}
          <div className="p-2.5 rounded bg-neutral-950/50 border border-neutral-800 text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-neutral-400">Aggregate Classification:</span>
              {getClassificationBadge(batchRecord.aggregateClassification)}
            </div>
            {batchRecord.findings.map((finding, idx) => (
              <p key={idx} className="text-neutral-300 leading-relaxed text-[11px]">
                • {finding}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
