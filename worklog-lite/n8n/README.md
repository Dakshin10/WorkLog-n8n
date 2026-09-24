# WorkLog Sheet Chat — n8n Workflow

A single importable n8n workflow: `workflows/WorkLog-Sheet-Chat.json`.

It's a chat agent that reads and writes directly to one real Google Sheet (see
`../docs/sheet-setup.md` for the sheet/spreadsheet ID), discovering that sheet's columns fresh
every turn rather than hardcoding a schema. See `../WORKLOG_LITE_BUILD_PROMPTS.md` for the full
design writeup — why it replaced the earlier multi-tab, PIN-based v1.1 build (still visible in
git history if you need that heavier design later).

## Import

1. Import `workflows/WorkLog-Sheet-Chat.json` into n8n (Workflows → Import from File).
2. Set credentials on the Google Sheets nodes (`Get all rows`, `Append row`, `Update row`) and
   the Gemini nodes (`Gemini Chat Model`, `Gemini Chat Model (Autofix)`) — see
   `../docs/credentials.md`.
3. The spreadsheet ID (`1sv08dlnTzV6tV6ECd60Od81zkDuemBocjibmOUghhqk`) and tab (`Sheet1`) are
   already filled in on every Sheets node. Update them if you point this at a different sheet.
4. Activate the workflow and open the Chat Trigger's chat URL.

## How it works

- **Column discovery**: `Get all rows` reads the whole sheet every turn; `Build context` takes
  the header keys of the first row as the column list. Gemini is only allowed to use those exact
  names as object keys.
- **Identity**: the first message in a session is treated as an Employee Code. It's looked up
  against existing rows (for a name) and kept in n8n's own workflow static data, keyed by the
  Chat Trigger's `sessionId` — not written to the sheet. No PIN.
- **Gemini** (`Extract query`, Basic LLM Chain + Structured Output Parser, no tools) turns one
  message into `{intent, entry, filters, target_entry_id, clarification}`.
- **Dispatch** (Code node) is the only place that decides what happens: `add` → build a full row
  and append it; `update` → find exactly one matching row and merge fields into it; anything else
  → reply only (read/help/off_topic/clarification), no sheet write.
- **Writes** use n8n's Google Sheets node in `autoMapInputData` mode — no manual per-column
  mapping to maintain when the sheet's columns change.

## Known simplifications (see the design doc's "what this doesn't do")

No roster-based access control beyond an Employee Code, no PIN/attestation, no append-only
correction history (`update` edits the matched row in place), no audit trail, no daily-hour caps
or duplicate detection. These were all present in the earlier v1.1 design and were deliberately
dropped for this simpler, single-sheet build — add them back only if you actually need them.
