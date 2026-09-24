# WorkLog AI Lite — n8n Workflows

Importable n8n workflow JSON for the Sheets-backed "Lite" pilot track described in `../WORKLOG_LITE_BUILD_PROMPTS.md`.

## Combined single-file workflow

`workflows/WorkLog-Lite-Combined.json` packages all 13 workflows below into **one importable
n8n workflow** ("WorkLog AI Lite — Combined"). Every `Execute Workflow` node has been inlined
with a full copy of the target sub-workflow's node graph (including nested calls, e.g. WF-10
Audit is inlined again inside the inlined copies of WF-08 and WF-09), so there are no
cross-workflow `workflowId` references left to break. The three independently-triggered
workflows (WF-11 Error Handler, WF-12 Maintenance, WF-13 PIN Enrolment) sit as disconnected,
sticky-note-labeled branches on the same canvas.

This is an alternative to importing the 13 separate `v1/` files — pick whichever suits your
n8n setup. Import order and per-workflow setup below still applies to the `v1/` split version;
see the combined file's own caveats (self-referencing Error Workflow, `saveExecutionProgress`,
duplicated Audit logic) in this README's final section.

## Workflows (v1 — split files)

| File | Workflow | Trigger |
| --- | --- | --- |
| `WF-01_Chat_Orchestrator.json` | Chat Orchestrator — the main workflow users touch | Chat Trigger |
| `WF-02_SUB_Session_Store.json` | Session get / upsert / clear against `Sessions` | Execute Workflow |
| `WF-03_SUB_Identity.json` | Employee Code → lookup identity & assignment | Execute Workflow |
| `WF-04_SUB_Reference_Data.json` | `Settings` + `Catalog`, 5-minute cache | Execute Workflow |
| `WF-05_SUB_Scrub_Unscrub.json` | Mask/unmask PII & standalone PIN digits before/after Gemini | Execute Workflow |
| `WF-06_SUB_Extract_Gemini.json` | Gemini extraction (Basic LLM Chain + Structured Output Parser) | Execute Workflow |
| `WF-07_SUB_Validate_Entry.json` | Deterministic rule engine (R1–R15, W1–W2) | Execute Workflow |
| `WF-08_SUB_Verify_PIN.json` | WorkLog PIN HMAC-SHA256 verification (no exec logs) | Execute Workflow |
| `WF-09_SUB_Append_Entry.json` | The only `Timesheet` append node, idempotent & gated | Execute Workflow |
| `WF-10_SUB_Audit.json` | Append-only audit trail (sanitizes secrets) | Execute Workflow |
| `WF-11_Global_Error_Handler.json` | Error Workflow for all of the above | Error Trigger |
| `WF-12_Maintenance.json` | Session expiry, cleanup, lockout resets | Schedule Trigger |
| `WF-13_PIN_Enrolment.json` | HR PIN setting & resetting form (no exec logs) | Form Trigger |

## Import order

Import in dependency order so each Execute Workflow node's `workflowId` can be pointed at the imported sub-workflow:

1. `WF-05_SUB_Scrub_Unscrub.json`, `WF-10_SUB_Audit.json` (no sub-workflow dependencies)
2. `WF-02_SUB_Session_Store.json`, `WF-03_SUB_Identity.json`, `WF-04_SUB_Reference_Data.json`
3. `WF-06_SUB_Extract_Gemini.json` (depends on WF-05)
4. `WF-07_SUB_Validate_Entry.json` (depends on WF-02–04)
5. `WF-08_SUB_Verify_PIN.json` (depends on WF-10)
6. `WF-09_SUB_Append_Entry.json` (depends on WF-10)
7. `WF-01_Chat_Orchestrator.json` (depends on WF-02–10)
8. `WF-11_Global_Error_Handler.json`, `WF-12_Maintenance.json`, `WF-13_PIN_Enrolment.json`

## After import — required setup

- Create credentials **`WorkLog Sheets`** (Google Service Account), **`WorkLog Gemini`** (Google Gemini API), and **`WorkLog Pepper`** (Header Auth/Generic or `APP_PIN_PEPPER` env var) per `../docs/credentials.md`.
- Replace `REPLACE_WITH_SPREADSHEET_ID` placeholders with the real spreadsheet ID.
- Replace `REPLACE_WITH_WF-0X_ID` placeholders with actual imported workflow IDs.
- Ensure `saveExecutionProgress` is set to `false` on `WF-08_SUB_Verify_PIN` and `WF-13_PIN_Enrolment`.

## Combined file caveats

`WorkLog-Lite-Combined.json` is a single workflow, so a few things that were per-file settings
in the `v1/` split version now apply (or don't apply) differently:

- **`saveExecutionProgress`** is a workflow-level setting. The combined file can't set it to
  `false` only for the inlined WF-08/WF-13 sections — if you need "no execution logs" for PIN
  handling specifically, keep using the split `v1/` workflows, or set `saveExecutionProgress:
  false` for the whole combined workflow (loses execution history for everything else too).
- **Error Workflow self-reference**: WF-11 Global Error Handler is inlined as a disconnected
  branch on the same canvas. n8n does not allow a workflow to name itself as its own Error
  Workflow, so the combined file's `settings.errorWorkflow` is left unset. If you want automatic
  error trapping, either keep `v1/WF-11_Global_Error_Handler.json` as a separate, standalone
  workflow and point the combined workflow's Settings → Error Workflow at it, or trigger the
  inlined WF-11 branch manually/via a second thin workflow.
- **Duplicated Audit logic**: because sub-workflow reuse was flattened, the WF-10 Audit node
  graph now appears multiple times in the combined file (once per original call-site: WF-01's
  turn-level audit, inside the inlined WF-03 Identity, WF-08 Verify PIN, WF-09 Append Entry, and
  WF-13 PIN Enrolment). Functionally equivalent to before, just no longer a single shared
  sub-workflow — a change to audit behavior now needs to be made in every copy, or you should
  edit the `v1/WF-10_SUB_Audit.json` source and re-run the merge script instead of hand-editing
  the combined file.
- Credential placeholders (`WorkLog Sheets`, `WorkLog Gemini`, `WorkLog Pepper`,
  `REPLACE_WITH_SPREADSHEET_ID`) still need to be filled in exactly as in the split version —
  merging did not touch credentials.
