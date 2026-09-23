# WorkLog AI Lite — Google Sheet Setup

Companion to `WORKLOG_LITE_BUILD_PROMPTS.md` §3 and Segment S1. This is the Sheets-backed pilot track — separate from the Postgres build in `../../n8n`, `../../db`.

## 1. Create the spreadsheet

1. Create a new Google Sheet named **"WorkLog AI — Timesheet"**.
2. Create six tabs, named exactly: `Timesheet`, `Employees`, `Catalog`, `Settings`, `Sessions`, `Audit`.
3. Import each seed file from `../sheet-seed/` into its matching tab (File → Import → Upload, "Replace current sheet", comma-separated).
4. Formatting (per §3 of the build-prompt doc):
   - `Timesheet!A` (Entry ID) → Format → Number → **Plain text**.
   - `Timesheet!C` (Date) → Format → Number → **Date** → `YYYY-MM-DD`.
   - `Timesheet!F` (Contributed Hours) → Format → Number → **Number**, 2 decimals.
   - `Timesheet!I`, `Timesheet!J` (Logged At UTC, Verified At UTC) → **Date time**.
5. Freeze row 1 on every tab (View → Freeze → 1 row).
6. Protect `Settings`, `Employees`, and `Catalog` (Data → Protect sheets and ranges) so only HR editors can change them. Hide the `PIN Hash` column in `Employees`.

Record the resulting **Spreadsheet ID** (from the URL, between `/d/` and `/edit`) — you'll need it in every Google Sheets node across WF-01 through WF-13.

## 2. Google Cloud service account

1. In Google Cloud Console, create (or reuse) a project for WorkLog AI Lite.
2. Enable the **Google Sheets API** for that project.
3. Create a **Service Account** (IAM & Admin → Service Accounts → Create). No project-level roles needed.
4. Create a JSON key for the service account and store it securely (never commit to git).
5. Share the WorkLog spreadsheet with the service-account email as **Editor**.

## 3. n8n credentials

See `credentials.md` in this folder for the credentials to create in n8n (`WorkLog Sheets`, `WorkLog Gemini`, `WorkLog Pepper`).

## 4. HR guide: managing employees, PIN enrolment, projects & activities

### Set/Reset Employee PIN (WF-13 PIN Enrolment)
1. Open the HR PIN Enrolment form URL (`WF-13 PIN Enrolment`).
2. Enter the Employee Code, new 6-digit PIN, and confirm PIN.
3. WF-13 hashes the PIN using HMAC-SHA256 with the `WorkLog Pepper` and updates `Employees!PIN Hash`, `PIN Set At`, resets `Failed Attempts` to 0, and clears `Locked Until`.
4. **Never manually type a PIN into the spreadsheet.**

### Add an employee
1. Open `Employees`, add a new row with `Employee Code`, `Name`, `Email`, `Status` (`ACTIVE`), `Projects` (comma-separated), `Timezone`, `Max Hours Per Day`.
2. Run WF-13 PIN Enrolment to set the employee's initial 6-digit PIN.

### Add a project & activity
1. Open `Catalog`, add rows specifying `Project Name`, `Activity Type`, `Sort` (menu number), and `Status` (`ACTIVE`).
2. Assign the project to employees by adding its exact name to their `Employees!Projects` cell.

## 5. Acceptance check

Run a test workflow reading `Settings` and verifying that `WF-13 PIN Enrolment` successfully sets a hash for a test employee.
