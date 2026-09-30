# Adding the `Profile` and `Activities` tabs to an employee's sheet

Every employee has their own Google Sheet. The agent reads the `TimeSheet` tab that already
exists and two tabs you add once per employee. Don't rename, reorder or add columns in `TimeSheet`.

## Fastest route: copy the template

1. Open a sheet that is already set up (e.g. Dakshin's), then **File → Make a copy**.
2. Clear the old rows in `TimeSheet`, but keep row 1 (the header). Keep any partly filled rows
   you want the agent to complete.
3. Edit the single data row in `Profile` (see below).
4. Share the new sheet with the n8n service account as **Editor** (see the README, step 2).
5. Give the employee the sheet link. They paste it into the web app's **Google Sheet** dialog,
   and the app sends its ID as `sheetId`.

## Manual route: add the tabs to an existing sheet

### 1. `Profile` tab

Add a tab named exactly `Profile`. Row 1 is the header and row 2 is the only data row.

| A | B | C | D | E |
|---|---|---|---|---|
| `emp_code` | `emp_name` | `project_name` | `active` | `password` |
| EMP-1001 | Dakshin | Evonsys | TRUE | 100000 |

> **`password` must be column E.** The agent's `get_my_profile` tool reads only `A:D`, which keeps
> the password out of the language model entirely. The build spec listed `password` third. It was moved
> last on purpose, because Google Sheets reads can't skip a column in the middle.

- `emp_code`: the code the employee types to sign in, e.g. `EMP-1001`. Upper and lower case are treated the same.
- `password`: e.g. a 6-digit PIN such as `100000`. It is checked exactly. Format column E as plain text so leading zeros are kept.
- `project_name`: must match `project_name` in `Activities` exactly (case is ignored).
- `active`: `TRUE` or `FALSE`. When it is `FALSE`, every log attempt is refused as `invalid_credentials`.
- Optional: select column E and use **Format → Number → Plain text**, so a password such as `0199`
  keeps its leading zero.

### 2. `Activities` tab

Add a tab named exactly `Activities`. Seed it with the distinct `Activity Type` values that already
appear in `TimeSheet`:

| A | B | C | D |
|---|---|---|---|
| `activity_id` | `project_name` | `activity_name` | `active` |
| A1 | Evonsys | UX | TRUE |
| A2 | Evonsys | Backend | TRUE |
| A3 | Evonsys | Front End | TRUE |
| A4 | Evonsys | Client Meeting | TRUE |

- To retire an activity, set `active` to `FALSE` instead of deleting the row.
- `activity_name` must match the `Activity Type` text used in `TimeSheet`. That text is how the
  agent finds the blank row to complete.

### 3. Check the `TimeSheet` tab

Row 1 must be exactly:

`Entry ID | Employee Code | Employee Name | Date | Project Name | Activity Type | Contributed Hours | Task Description | Additional Comments`

- `Date` values must be `YYYY-MM-DD`. The agent writes dates as plain text in that format, so they
  compare exactly. If older rows show `25/09/2026`, the duplicate and daily-cap checks will not match them.
- A row the agent should complete has `Project Name` and `Activity Type` filled in and `Entry ID`
  left blank. The agent fills the oldest such row for that activity first. It appends a new row only
  when no blank row is left.

## Onboarding checklist

- [ ] `Profile` has one data row, with `password` in column E
- [ ] `Activities` lists the project's activities, all with `active = TRUE`
- [ ] `TimeSheet` header is unchanged
- [ ] The sheet is shared with the service account as Editor
- [ ] The employee has pasted the sheet link into the web app
