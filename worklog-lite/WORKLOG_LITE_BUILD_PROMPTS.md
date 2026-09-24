# WorkLog Sheet Chat — Conversational Timesheet, Direct to One Google Sheet

**Design doc — v2 (simplified).** This replaces the earlier multi-tab, PIN-verified v1.1 design.
Scope: a chat agent that reads and writes directly to **one real, existing Google Sheet** — no
separate Employees/Catalog/Settings/Sessions/Audit tabs, no PIN. Channel: **n8n Chat Trigger**.
AI: **Google Gemini** (extraction only, no tools, no Sheets access). Backend: **Google Sheets**,
the single sheet at:

`https://docs.google.com/spreadsheets/d/1sv08dlnTzV6tV6ECd60Od81zkDuemBocjibmOUghhqk/edit#gid=0`
(tab `Sheet1`)

## Why this replaced v1.1

The earlier build (still visible in git history) added a full multi-tab data model — Employees,
Catalog, Settings, Sessions, Audit — plus a PIN-based two-stage identity and verification flow.
That's the right shape for a rollout with HR-managed rosters, lockouts and an attestation
requirement. It is not what was asked for here: a single real spreadsheet that already has its
own columns, where the bot should understand *those* columns and read/write to *that* sheet only.

## What "understand the columns" means here

The workflow never hardcodes column letters or a fixed schema. Every turn, it does one
`Get all rows` read against the sheet and takes `Object.keys()` of the first returned row as the
column list — whatever the sheet's header row actually says. That list is:

1. Passed to Gemini as the only vocabulary it's allowed to use as object keys.
2. Used to append/update rows via n8n's Google Sheets node in **`autoMapInputData`** mode, which
   maps a JS object's keys to matching sheet columns by header name — no manual column mapping.

If you rename a column, add one, or remove one, the bot picks it up on the very next turn. No
workflow edit required. (A fallback list matching this sheet's current headers is used only if
the sheet has zero data rows and header discovery would otherwise fail.)

Current columns on this sheet: `Entry ID`, `Employee Code`, `Employee Name`, `Date`,
`Project Name`, `Activity Type`, `Contributed Hours`, `Task Description`, `Additional Comments`.

## Identity: Employee Code only, no PIN

There is no separate roster tab, so there's nothing to validate a code *against* except the
sheet's own history:

- First message in a session is always treated as the Employee Code.
- The bot searches existing rows for that code. Found → greets by the most recent
  `Employee Name` on file. Not found → treats it as a brand-new code, asks the employee to state
  their name the first time they log something (so it lands in `Employee Name` on the new row).
- The code (and name, once known) is kept in **n8n's own workflow static data**, keyed by the
  Chat Trigger's `sessionId` — never written to the sheet as session state, and cleared when the
  session/workflow data is cleared. No PIN, no lockouts, no attestation step.

This is intentionally light — anyone who knows (or invents) an Employee Code can log time under
it. That's an accepted tradeoff for a quick, single-sheet pilot; see the "what this doesn't do"
note below if you need real access control later.

## Conversation flow

```
Bot   Hi! I'm your WorkLog assistant. What's your Employee Code?
You   EVS-114
Bot   Welcome back, Renu! You have 3 entries on file. What would you like to log or look up?
You   Log 4 hours of UX for Evonsys today, did screen prototyping for the client
Bot   ✅ Logged. Date: 2026-09-25 | Project Name: Evonsys | Activity Type: UX |
      Contributed Hours: 4 | Task Description: Screen prototyping for the client.
      (Entry ID WL-20260925-7F3A9C).
You   How many hours have I logged this week?
Bot   Found 4 entries (14h total):
      • WL-... — EVS-114 — Renu — 2026-09-25 — Evonsys — UX — 4 — Screen prototyping...
      • ...
You   Actually change today's hours to 5
Bot   ✅ Updated entry WL-20260925-7F3A9C.
```

One message can fill everything the sheet needs for an `add`; the bot only asks a follow-up
question when a required column is genuinely missing or a request is ambiguous (e.g. "update"
matching more than one row).

## Architecture — one workflow

Unlike the v1.1 design's 13 sub-workflows, this is **one importable workflow**
(`n8n/workflows/WorkLog-Sheet-Chat.json`):

```
Chat Trigger → Load session (static data) → Get all rows (Sheets, no filter)
  → Build context (discover columns, this employee's rows, today/weekday)
  → Need employee code?
      yes → Capture code & greet → reply
      no  → Extract query (Gemini: Basic LLM Chain + Structured Output Parser, no tools)
              → Post-process → Dispatch (Code: decides add / update / reply_only)
              → Action switch
                  append → Prep row → Sheets Append (autoMapInputData) → reply
                  update → Prep row → Sheets Update (match on Entry ID, autoMapInputData) → reply
                  reply_only → reply directly (read / help / off_topic / clarification)
```

### Design decisions

| # | Decision | Why |
| --- | --- | --- |
| D1 | Gemini has no tools and no Sheets access | It only proposes `{intent, entry, filters, target_entry_id, clarification}`; the `Dispatch` Code node decides what actually happens. |
| D2 | Columns discovered every turn from the sheet itself | No hardcoded schema — works even if the sheet's columns change. |
| D3 | Sheets writes use `autoMapInputData` | Matches an object's keys to sheet columns by header name; no manual per-column mapping to maintain. |
| D4 | Exactly one Append node, one Update node | Adds create new rows; corrections edit the matched row in place (no append-only/supersede model — deliberately simpler than v1.1). |
| D5 | Session state (Employee Code/Name) lives in n8n workflow static data | Not written to the sheet — the sheet holds only timesheet rows. |
| D6 | No PIN | Employee Code is the only gate. See the tradeoff note above. |

### Credentials needed

- **`WorkLog Sheets`** — Google Service Account, shared as Editor on this spreadsheet.
- **`WorkLog Gemini`** — Google Gemini API key (or Vertex AI service account).

No pepper, no PIN credential — this design dropped both. See `docs/credentials.md`.

## What this doesn't do (by design)

No approvals, no manager visibility, no roster-based access control, no audit trail, no
duplicate/limit guardrails beyond what's described above, no append-only correction history —
`update` edits the matched row directly. If you need any of those, the v1.1 multi-tab/PIN design
(previous commits in this repo) or the full Postgres-backed product (`../PRD.md`,
`../N8N_BUILD_PROMPTS.md`) are the places to add them back.

---

*Document v2 · replaces the v1.1 PIN-based design · targets the real sheet
`1sv08dlnTzV6tV6ECd60Od81zkDuemBocjibmOUghhqk`.*
