# WorkLog AI Lite — n8n Workflows

Importable n8n workflow JSON for the Sheets-backed "Lite" pilot track described in `../WORKLOG_LITE_BUILD_PROMPTS.md`.

## Workflows

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
