# Minori Labs Timesheet Agent (n8n + Gemini + Google Sheets)

> *We are prompt-based integrators.* Filling in a timesheet becomes a short conversation.

```
User:  Hi                                          1. greeting
Agent: Hello, welcome to the Minori Labs Timesheet Agent. Please enter your Employee Code.
User:  EMP-1001                                    2. employee code
Agent: Thank you. Please enter your Password.
User:  •••                                         3. password (masked; checked immediately)
Agent: Thank you, Dakshin — you are verified for Evonsys. There are 4 activities:
       1. UX 2. Backend 3. Front End 4. Client Meeting. What did you work on, and for how many hours?
User:  6 hours on Client Meeting, weekly sync      4. the work
Agent: Please confirm: Client Meeting, 6 hours on 2026-09-25, task: weekly sync.
       Shall I save this entry? (yes/no)
User:  yes                                         5. confirm
Agent: Thank you — your entry is saved for today. Have a good day!
```

**How the password is handled in this flow.** `Parse Credentials` swaps the password for `[password provided]`
before Gemini sees the message. It treats a one-word reply as the password only when the agent's previous reply
asked for one, and pairs it with the Employee Code sent just before. A fixed `Verify Credentials` step (workflow B in `verify` mode) then checks it against the `Profile` tab *before* Gemini runs. Gemini only receives the outcome, `(verification result: ok — emp_name …)` or `invalid_credentials`, so it cannot skip the check or claim success.
On success, n8n remembers *this chat session is verified as EMP-1001* for 30 minutes, keyed by `sessionId:sheetId`.
The step-5 save relies on that flag instead of the password, which is never stored. **Re-login** in the web app
starts a new session ID, so the employee has to verify again. Workflow B still refuses to write unless it gets
either a correct password or a session verified for the same Employee Code.

Google Sheets is the only datastore. Each request reads the employee's own live spreadsheet and
writes back to it. There is no cache, mirror or local database.

## Files

| File | What it is |
|---|---|
| `n8n/timesheet-agent.workflow.json` | **A**: the webhook front door, with the rate limiter, the Gemini agent and four tools |
| `n8n/timesheet-log-entry.workflow.json` | **B**: the validating writer. It checks credentials, activity, hours, the daily cap and duplicates, then updates a blank row or appends one |
| `n8n/timesheet-entries.workflow.json` | **C**: read-only feed for the web dashboard. `POST /webhook/timesheet-entries` with `{ sheetId }` returns `{ status, entries }`, the logged rows of the `TimeSheet` tab. It never reads `Profile`. Drives the **Weekly Target** (Monday–Sunday) and the **My Timesheets** table. |
| `n8n/workflows.json` | A, B and C as one array, for `n8n import:workflow` |
| `setup-tabs.md` | How to add the `Profile` and `Activities` tabs to an employee's sheet |

## Setup (9 steps)

1. **Add the two tabs** to each employee's sheet, following [`setup-tabs.md`](setup-tabs.md).
2. **Share each sheet with the service account** as *Editor*. Use the `client_email` from its JSON
   key, e.g. `timesheet-bot@your-project.iam.gserviceaccount.com`. For the alternative, see *Access routes* below.
3. **Create the credential `Minori Sheets`**: *Google Service Account API*. Paste the service
   account email and private key. Leave impersonation off unless you use route (b).
4. **Create the credential `Minori Gemini`**: *Google Gemini (PaLM) API*, with an API key from
   Google AI Studio.
5. **Import both workflows.** With the CLI, import B before A so the tool link resolves:
   ```bash
   n8n import:workflow --input=timesheet-agent/n8n/workflows.json
   ```
   Or import through the UI: *Workflows → Import from File*, B first, then A.
6. **Link B into A.** Open A, then the `log_timesheet_entry` node, and pick *Minori Timesheet — Log Entry*
   under *Workflow*. A CLI import keeps B's fixed ID (`MinoriTsLogEntry`) and needs no change. A UI
   import gives B a new ID, so you must re-select it.
7. **Check the credentials are linked.** Create the credentials in steps 3–4 *before* importing, with
   exactly those names: a CLI import links each node to the credential of the same name. If you imported
   first, or through the UI, open each flagged node and select the credential: the three Sheets tools in A,
   the five Sheets nodes in B, and the Gemini model in A.
8. **Activate both workflows.** Static data, which the rate limiter depends on, only persists for
   production executions.
9. **Point `./web` at the production URL.** The default is
   `http://localhost:5678/webhook/timesheet-chat`. To override it, add
   `VITE_TIMESHEET_WEBHOOK_URL=https://<your-n8n>/webhook/timesheet-chat` to `web/.env`, then restart `npm run dev`.

## Access routes (the most likely production failure)

The `Minori Sheets` credential has to be able to open **every** employee's spreadsheet.

- **(a) Share each sheet with the service account.** This is the simplest route and the one the
  workflows are configured for. It is one share per new employee, and `setup-tabs.md` includes it as a checklist item.
- **(b) Workspace domain-wide delegation.** In the Google Admin console, go to *Security → API controls →
  Domain-wide delegation* and add the service account's client ID with scopes
  `https://www.googleapis.com/auth/spreadsheets` and `https://www.googleapis.com/auth/drive.file`. Then, in the
  `Minori Sheets` credential, turn on **Impersonate a User** and enter a Workspace user who can open the
  sheets. A shared drive or folder owned by that user works well.

If you would rather use OAuth2, switch each Sheets node's *Authentication* to *OAuth2* and select an OAuth2
credential. The signed-in Google user then needs access to every sheet.

### Troubleshooting: every message fails and nothing reaches the sheet

If every execution of A fails at `get_my_profile` (or any Sheets node) with

```
Node "get_my_profile" uses invalid credential
Please recreate the credential.
```

the node isn't linked to a credential ID. Open the node, select `Minori Sheets` under *Credential*, save,
and repeat for all 8 Sheets nodes (3 in A, 5 in B). Alternatively, re-run step 5 now that the credential
exists. A CLI import deactivates both workflows, so switch them back to **Active** afterwards.

### Troubleshooting: `The connection timed out` on every Sheets call

If every Sheets node fails with `The connection timed out` (the three retries take about 60 s), check whether
IPv6 to Google's token endpoint is broken on your network. Before every call, the service-account credential fetches a
token from `oauth2.googleapis.com`. On a network where that host resolves to IPv6 first but IPv6 doesn't reach it,
the request hangs. Start n8n preferring IPv4:

```bash
$env:NODE_OPTIONS="--dns-result-order=ipv4first"; npx n8n
```

(`export NODE_OPTIONS=--dns-result-order=ipv4first` on macOS/Linux, or `NODE_OPTIONS` in docker-compose.)

### Troubleshooting: `Sheet with name Profile not found`

The agent looks tabs up by exact name: `TimeSheet`, `Profile` and `Activities`. A new Google Sheet starts with a single
tab called `Sheet1`. Rename it to `TimeSheet` and add the other two tabs, following [`setup-tabs.md`](setup-tabs.md).
The spreadsheet's file name doesn't matter.

### Troubleshooting: "I don't have access to your timesheet yet"

When a sheet is not shared with the credential, the Google Sheets node fails with one of these errors,
which n8n shows in the execution log:

```
Forbidden - perhaps check your credentials?
The caller does not have permission
```

or, for a sheet the account cannot see at all, or a wrong ID:

```
The resource you are requesting could not be found
Requested entity was not found.
```

Workflow B maps both errors to `reason: "sheet_access_denied"`. The user then sees *"I don't have access to your
timesheet yet — please ask your manager to share it."*, and the response has `status: "error"`. **Fix:** share the sheet
with the service account email as Editor (route a), or check the impersonated user's access (route b).
Any other Sheets failure, such as a timeout, 429 or 5xx, becomes `sheet_unavailable` with *"I couldn't reach your
timesheet right now…"*

## Webhook contract

`POST /webhook/timesheet-chat`

```json
{ "sessionId": "web_…", "sheetId": "1AbC…", "message": "Please log 6 hours today for Client Meeting", "empCode": "EMP-1001" }
```

`sheetId` is required. It must look like a Google spreadsheet ID (`[A-Za-z0-9_-]{20,}`), or the request is answered
with `status: "error"` and *"I don't know which timesheet to open. Please sign in again."* `empCode` is optional.

The response is always HTTP 200 and JSON:

```json
{
  "sessionId": "web_…",
  "reply": "Thank you — verified. Your entry is completed for today. Have a good day!",
  "status": "ok",
  "retryAfter": 0,
  "entry": { "entryId": "…", "rowNumber": 5, "action": "updated", "date": "2026-09-25",
             "hours": 6, "activity": "Client Meeting", "project": "Evonsys" }
}
```

`status` is one of `ok`, `needs_credentials`, `rate_limited` or `error`. `entry` appears only when a row was written.
`action` is `updated` (a blank row was completed in place) or `appended`.

**What changed in `./web` to match.** `web/src/lib/api.ts` used to post `{chatInput, message, userCode, sessionId}`
to `/webhook/worklog-chat`. It now posts `{sessionId, sheetId, message}` to `/webhook/timesheet-chat`. The `sheetId` is
the one the user saved in the Google Sheet dialog. The client derives the UI stage from `status`/`entry`: `needs_credentials`
maps to the masked password input, and `entry` maps to *Saved*. On `rate_limited`, `ChatThread.tsx` disables the input and
counts down `retryAfter`. Passwords are also masked in the chat bubble. The web app does not send `empCode`, because its
demo users are not the codes stored in the sheets.

## How it works

### Workflow A: `Minori Timesheet — Chat Agent`

```
Receive Chat Message → Rate Limiter → Throttled? ─yes→ Throttled Reply ─────────────┐
                                        └no→ Has Sheet ID? ─no→ Missing Sheet Reply ─┤
                                              └yes→ Parse Credentials → Today in Kolkata│
                                                    → Normalise Request → Timesheet Agent ─error→ Log Agent Failure → Agent Error Reply ┤
                                                         ├ Google Gemini (gemini-3.6-flash, temp 0.2)                  │
                                                         ├ Chat Memory (window 10)                                      │
                                                         ├ get_my_profile · list_activities · read_my_entries (Sheets)  │
                                                         └ log_timesheet_entry → workflow B                             │
                                                    → Record Credential Outcome → Entry Written? → Reply With/Without Entry ┴→ Respond to Chat
```

### Workflow B: `Minori Timesheet — Log Entry`

Built only from built-in nodes. Every Google Sheets node runs with `continueRegularOutput`, and an `…Failed?` If node
routes its error into `Sheet Error`.

```
Receive Log Request → Resolve Work Date → Normalise Input → Password Supplied? → Read Profile → Verify Employee
→ Read Activities → Active On Project → Match Activity → Collect Matches → Exactly One Activity?
→ Hours Valid? → Date Valid? → Read TimeSheet ─┬ Rows On Work Date → Sum Hours On Date → Day Total ────────┐
                                               ├ Existing Entry For Activity → Duplicate Check ────────────┼→ Combine Checks
                                               └ Blank Rows For Activity → Take First Row (sheet order = oldest) → Target Row ┘
→ Within Daily Cap? → Already Logged? → Blank Row Found? ─yes→ New Entry ID → Complete Blank Row (Update Row by row_number) → Row Updated
                                                          └no→ New Entry ID → Append New Row → Row Appended
```

Reason codes returned to the agent are `invalid_credentials`, `credentials_required`, `unknown_activity` (with `available`),
`invalid_hours`, `invalid_date`, `daily_limit` (with `already_logged`), `duplicate_entry` (with `existing_hours`),
`sheet_access_denied` and `sheet_unavailable`.

- **Edit before append.** The update writes only `Entry ID`, `Employee Code`, `Employee Name`, `Date`, `Contributed Hours`,
  `Task Description` and `Additional Comments`. `Project Name` and `Activity Type` are left as they are. A row that
  already has an `Entry ID` is never selected.
- **Activity matching** is case-insensitive and trimmed, and accepts partial matches in either direction, so
  "client meet" resolves to *Client Meeting*. If there are zero matches or several, the result is `unknown_activity`
  with the list of valid activities.
- The LLM never checks a password, the cap or duplicates. It calls B and reports what B returns.

## Working-day rules

- **Standard day: 8 hours.** After every saved entry, workflow B returns the day's totals (`day_total_hours`, `remaining_hours`, `overtime_hours`). The chat workflow then appends one line to the reply itself, never through the model:
  - under 8 h: *"You have logged 6 of 8 hours today. 2 hours remaining."*
  - exactly 8 h: *"You have completed your 8 hours for today."*
  - over 8 h: *"You have worked 10 hours today, which is 2 hours above the standard 8 hours."*
  The same totals are returned in the response's `entry` (`dayTotalHours`, `remainingHours`, `overtimeHours`). Change `STANDARD_HOURS` to use a different standard day.
- **Hard limit: 12 hours per day.** An entry that would take the day above 12 h is refused (`daily_limit`).

## Rate limiter

One Code node, `Rate Limiter`, runs straight after the webhook and uses `$getWorkflowStaticData('global')`:

| Bucket | Key | Limit | Window |
|---|---|---|---|
| Chat volume | `sessionId` | 20 | 10 min |
| Per-sheet volume | `sheetId` | 60 | 10 min |
| Global spend guard | instance | 300 | 1 hour |
| Failed credentials | `sheetId` + `empCode` | 5 failures | 15 min lockout |

- A throttled request short-circuits **before** Parse Credentials, the agent and any Sheets read, so there is no Gemini call
  and no Sheets quota is spent. Every throttled response includes `retryAfter` in seconds.
- Expired timestamps are pruned on every call.
- Failures are counted on the **response path**. `Record Credential Outcome` reads the agent's intermediate steps and counts
  only results where workflow B returned `invalid_credentials`. After 5 failures in 15 minutes the key is locked for 15
  minutes, so the 6th attempt gets *"Too many failed attempts…"*. A successful log clears that counter.
- Because each sheet belongs to one employee and the web app doesn't send `empCode`, a lock on any code for a sheet blocks
  that sheet.
- **Static data is per instance and resets on restart.** That is acceptable here. If you later run several n8n
  workers (queue mode), replace the two limiter Code nodes with Redis `INCR` + `EXPIRE`. Nothing else in the workflow
  needs to change.
- Static data is not saved for manual "Test workflow" runs. Test the limits against the **production** URL of the
  activated workflow.

## Code nodes: three in total, all in workflow A

| Node | Permitted job |
|---|---|
| `Rate Limiter` | #1, rate limiter: check and record the volume buckets and the lockout |
| `Record Credential Outcome` | #1, rate limiter, response side: counts `invalid_credentials` results from B (static data can't be reached from any built-in node) |
| `Parse Credentials` | #2, loose credential parsing |

Final response assembly uses Set nodes, so permitted job #3 was not needed. Workflow B has no Code nodes.

## Password handling

- `Parse Credentials` removes the password from the message **before** the agent runs. For example,
  `Emp Code - EMP-1001 - Password - 100000` becomes `Emp Code - EMP-1001 - Password - [provided]`. Gemini and the chat memory only
  ever see `[provided]`. The real value goes into `log_timesheet_entry` from that node, and the model cannot set it through
  `$fromAI`. The same is true of `sheetId`.
- `get_my_profile` reads `Profile!A:D`, which leaves out the `password` column (column E).
- Workflow B has **Save successful executions = off**, so its inputs are not stored. Error executions are still saved.
- **Known limit:** n8n stores the raw webhook body with each workflow A execution, and that body includes the message
  exactly as the user typed it. Once acceptance testing is finished, open A's settings and set *Save successful production
  executions* to *Do not save*. If the password must never reach the server in plain text, the web app would need to
  collect it in a separate field and send a hash. That would change the contract, so it has not been built.

## Other deviations from the build spec

- **Chat memory** is keyed on `sessionId:sheetId`, not `sessionId` alone. This is what the "no bleed" acceptance test
  requires: pointing the same session at another employee's sheet starts clean.
- **Rule 1 of the prompt.** The agent only asks for the Employee Code if `get_my_profile` returns nothing. Otherwise the
  scripted first answer ("You are assigned to Evonsys") couldn't happen without an extra question first.
- **`read_my_entries`** returns every row and the model filters by date. A Sheets filter bound to an optional
  `$fromAI('date')` would match blank-date rows whenever the date is omitted.
- **Extra reason codes:** `credentials_required` (no password on this turn, not counted as a failure) and `invalid_date`.

## Definition-of-done checklist

Run these against a real sheet shaped like the example, through the production URL:

- [ ] Acceptance conversation: the `Client Meeting` blank row is **updated in place**, with the same row number and
      `Project Name`/`Activity Type` untouched
- [ ] An activity with no blank row: `action: "appended"`
- [ ] The same activity twice on the same date: `duplicate_entry`
- [ ] A wrong password writes nothing. After 6 consecutive wrong passwords the 6th attempt is locked for 15 minutes
- [ ] 21 messages in 10 minutes on one `sessionId`: `rate_limited` with `retryAfter`, and that execution shows no Agent or Sheets node run
- [ ] `log 20 hours` is rejected. 6 h then 8 h on the same date: the second is rejected with `daily_limit`
- [ ] `log 6 hours for client meet` resolves to *Client Meeting*
- [ ] The same `sessionId` on a different `sheetId` reads that employee's data only
- [ ] No password appears in any response body or in the model's context
