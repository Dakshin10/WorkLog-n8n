# WorkLog AI — Production Web Client & Conversational Assistant

WorkLog AI is an autonomous, natural language work-logging platform powered by an **n8n Orchestration Engine** and **Google Gemini AI**. This web client provides a production-grade, monochrome conversational experience with built-in multi-factor identification, HMAC-SHA256 PIN authentication, real-time work log extraction, and timesheet management.

---

## 🔑 Demo Login Accounts & Passwords

Use the credentials below to log into the interactive conversational chat assistant or test role-based capabilities:

| Employee Code | Employee Name | Corporate Email | Role | Department | Secret 6-Digit PIN Password |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`EMP-1001`** | **Sarah Connor** | `sarah.connor@minori.io` | `EMPLOYEE` | Digital Product Engineering | **`849201`** |
| **`EMP-1002`** | **Alex Mercer** | `alex.mercer@minori.io` | `MANAGER` | AI Solutions Lab | **`123456`** |
| **`EMP-1003`** | **Elena Rostova** | `elena.rostova@minori.io` | `HR_ADMIN` | Human Resources & Ops | **`990011`** |

> Each employee's PIN is matched exactly — a random 6-digit number will be rejected. Use the PIN listed for that employee's code.

---

## 🚀 Quick Start Instructions

### Prerequisites
- **Node.js**: v18.0 or higher
- **n8n Instance**: Running on `http://localhost:5678` (or configured via `.env`)

### Installation & Launch

1. **Navigate to Web directory**:
   ```bash
   cd web
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Start Development Server**:
   ```bash
   npm run dev
   ```
   *The web app will open at `http://localhost:3000/`.*

4. **Build Production Bundle**:
   ```bash
   npm run build
   ```

---

## 💬 Conversational Authentication & Work Logging Flow

The web interface runs an active state machine (`WF-01 Chat Orchestrator`):

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│   AWAIT_CODE    │ ────> │    AWAIT_PIN    │ ────> │     COLLECT     │ ────> │     SUMMARY     │ ────> │      SAVED      │
│ (Employee Code) │       │ (6-Digit Auth)  │       │ (Natural Log)   │       │ (Sign-off Card) │       │ (Timesheet DB)  │
└─────────────────┘       └─────────────────┘       └─────────────────┘       └─────────────────┘       └─────────────────┘
```

1. **Step 1: Identification (`AWAIT_CODE`)**
   - On page load, the assistant prompts: *"To start your work logging session, please enter your Employee Code or Corporate Email to sign in."*
   - Type `EMP-1001` (or `sarah.connor@minori.io`).

2. **Step 2: Security Verification (`AWAIT_PIN`)**
   - The assistant asks for your 6-digit PIN / Password.
   - The input field automatically turns into a secure password input with character masking and an eye-toggle.
   - Type `849201`.

3. **Step 3: Work Log Intent (`COLLECT`)**
   - Upon authentication, the bot greets the user, lists assigned active projects, and prompts for daily work.
   - Type natural text (e.g. *"Worked 6.5 hours on Client Portal Frontend UI Development"*).

4. **Step 4: Extracted Summary & Verification (`SUMMARY`)**
   - Gemini / n8n extracts the Project Name, Activity Type, Date, and Hours into a structured card.
   - Click **Confirm & Save** to submit.

5. **Step 5: Timesheet Update (`SAVED`)**
   - Entry ID is generated (e.g. `WL-20260924-A8F12C`) and appended to your active Timesheet grid.

---

## 🎨 Design System & Aesthetics

- **Strict Monochrome Theme**: Pure black `#000000`, dark zinc `#09090b` / `#121215`, high-contrast white text, zero gradients.
- **Modern Typography**: Powered by Google Fonts (`Inter`, `Outfit`, `JetBrains Mono`).
- **Production UI Details**: Password masking toggles, stage progress bar, payload debug inspector, voice input simulation, and timesheet dashboards.
