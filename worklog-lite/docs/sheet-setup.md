# WorkLog Sheet Chat — Google Sheet Setup

Companion to `../WORKLOG_LITE_BUILD_PROMPTS.md`. This design talks to **one existing, real
Google Sheet** — there is nothing to create or seed. Your columns stay whatever they already are.

## 1. The sheet

- URL: `https://docs.google.com/spreadsheets/d/1sv08dlnTzV6tV6ECd60Od81zkDuemBocjibmOUghhqk/edit#gid=0`
- Spreadsheet ID (already wired into the workflow): `1sv08dlnTzV6tV6ECd60Od81zkDuemBocjibmOUghhqk`
- Tab: `Sheet1`
- Current columns (row 1): `Entry ID`, `Employee Code`, `Employee Name`, `Date`, `Project Name`,
  `Activity Type`, `Contributed Hours`, `Task Description`, `Additional Comments`.

If you rename, add, or remove a column, you don't need to change the workflow — it re-reads the
header row every turn. The only thing to keep stable is that a **header row exists on row 1** and
each column header is unique.

## 2. Google Cloud service account

1. In Google Cloud Console, create (or reuse) a project.
2. Enable the **Google Sheets API** for that project.
3. Create a **Service Account** (IAM & Admin → Service Accounts → Create). No project-level
   roles needed — access is granted per-spreadsheet in the next step.
4. Create a JSON key for the service account and store it securely (never commit it to git).
5. Note the service account's email, e.g. `worklog-sheet-chat@<project-id>.iam.gserviceaccount.com`.
6. Open the spreadsheet above → **Share** → add the service-account email as **Editor**.

## 3. n8n credentials

See `credentials.md` in this folder for the two credentials to create in n8n:
`WorkLog Sheets` and `WorkLog Gemini`. No PIN, no pepper — this design dropped both.

## 4. Import and run

1. Import `../n8n/workflows/WorkLog-Sheet-Chat.json` into n8n.
2. Set the `WorkLog Sheets` and `WorkLog Gemini` credentials on the imported workflow's Google
   Sheets / Gemini nodes (the spreadsheet ID and tab name are already filled in — double-check
   they still match if you ever copy the sheet).
3. Activate the workflow and open its Chat Trigger's production/test chat URL.
4. First message: any Employee Code. If it matches existing rows, the bot greets you by name; if
   not, it treats it as a new code and asks for your name the first time you log something.

## 5. Acceptance check

Open the chat, enter a test Employee Code, say something like "log 2 hours of testing today,
verified the setup", and confirm a new row appears on `Sheet1` with the right values in the right
columns. Then ask "how many hours have I logged today?" and confirm it reads that same row back.
