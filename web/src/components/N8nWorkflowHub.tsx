import React from 'react';
import { Workflow, ExternalLink } from 'lucide-react';

const COMBINED_WORKFLOW_ID = 'WorkLog-Lite-Combined';

const WORKFLOWS = [
  { id: COMBINED_WORKFLOW_ID, name: 'Chat Orchestrator', type: 'Chat Trigger', desc: 'Main chat state machine for WorkLog AI Lite (Length, Session, Gemini, Rules, PIN, Audit)', status: 'ACTIVE' },
  { id: COMBINED_WORKFLOW_ID, name: 'SUB Session Store', type: 'Inlined branch', desc: 'Read/write state & verification window in Sessions tab', status: 'ACTIVE' },
  { id: COMBINED_WORKFLOW_ID, name: 'SUB Identity', type: 'Inlined branch', desc: 'Employee Code → lookup identity & project assignment', status: 'ACTIVE' },
  { id: COMBINED_WORKFLOW_ID, name: 'SUB Reference Data', type: 'Inlined branch', desc: 'Settings + Catalog with 5-minute memory cache', status: 'ACTIVE' },
  { id: COMBINED_WORKFLOW_ID, name: 'SUB Scrub / Unscrub', type: 'Inlined branch', desc: 'Mask & unmask PII terms & standalone PIN digits before Gemini', status: 'ACTIVE' },
  { id: COMBINED_WORKFLOW_ID, name: 'SUB Extract Gemini', type: 'Inlined branch', desc: 'Gemini extraction with Basic LLM Chain & Structured Output Parser', status: 'ACTIVE' },
  { id: COMBINED_WORKFLOW_ID, name: 'SUB Validate Entry', type: 'Inlined branch', desc: 'Deterministic rule engine checking rules R1–R15, W1–W2', status: 'ACTIVE' },
  { id: COMBINED_WORKFLOW_ID, name: 'SUB Verify PIN', type: 'Inlined branch', desc: 'HMAC-SHA256 verification (no execution logs saved)', status: 'ACTIVE' },
  { id: COMBINED_WORKFLOW_ID, name: 'SUB Append Entry', type: 'Inlined branch', desc: 'The only Timesheet append node, idempotent & gated', status: 'ACTIVE' },
  { id: COMBINED_WORKFLOW_ID, name: 'SUB Audit', type: 'Inlined branch', desc: 'Append-only audit trail in Google Sheets', status: 'ACTIVE' },
  { id: COMBINED_WORKFLOW_ID, name: 'Global Error Handler', type: 'Error Trigger', desc: 'Error Workflow handling failures across all sub-workflows', status: 'ACTIVE' },
  { id: COMBINED_WORKFLOW_ID, name: 'Maintenance', type: 'Schedule Trigger', desc: 'Session expiry, cleanup, lockout resets scheduled every 15m', status: 'ACTIVE' },
  { id: COMBINED_WORKFLOW_ID, name: 'PIN Enrolment', type: 'Form Trigger', desc: 'HR PIN setting & resetting form', status: 'ACTIVE' },
];

export const N8nWorkflowHub: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-heading font-bold text-white flex items-center gap-2">
              <Workflow className="w-5 h-5 text-white" /> n8n Orchestration Engine
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-black text-zinc-300 border border-zinc-800">
              1 Combined Workflow · 13 Stages
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Running on <code className="text-white font-mono">http://localhost:5678</code>. All 13 stages are inlined into a single importable workflow (<code className="text-white font-mono">{COMBINED_WORKFLOW_ID}</code>).
          </p>
        </div>

        <a
          href="http://localhost:5678"
          target="_blank"
          rel="noreferrer"
          className="px-4 py-2 bg-white text-black hover:bg-zinc-200 text-xs font-semibold rounded flex items-center gap-2 transition-all shadow-sm"
        >
          <ExternalLink className="w-4 h-4" /> Open n8n Canvas
        </a>
      </div>

      {/* Grid of 13 stages, all inlined into one workflow */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {WORKFLOWS.map((wf, idx) => (
          <div key={`${wf.id}-${idx}`} className="mono-card-interactive p-5 rounded-lg border border-zinc-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[10px] font-mono font-bold text-white px-2 py-0.5 rounded bg-black border border-zinc-800">
                  STAGE {String(idx + 1).padStart(2, '0')}
                </span>
                <span className="text-[10px] font-mono text-zinc-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                  {wf.status}
                </span>
              </div>

              <h3 className="text-sm font-heading font-bold text-white mb-1">{wf.name}</h3>
              <p className="text-xs text-zinc-400 line-clamp-2 mb-3">{wf.desc}</p>
            </div>

            <div className="pt-3 border-t border-zinc-800 flex items-center justify-between text-[11px]">
              <span className="text-zinc-500 font-mono">Trigger: {wf.type}</span>
              <a
                href={`http://localhost:5678/workflow/${wf.id}`}
                target="_blank"
                rel="noreferrer"
                className="text-white hover:underline font-semibold flex items-center gap-1"
              >
                Inspect <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
