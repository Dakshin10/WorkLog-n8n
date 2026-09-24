# WorkLog AI — Autonomous Work Logging Engine (n8n & Gemini)

WorkLog AI is an enterprise-grade autonomous work logging platform powered by an **n8n Orchestration Engine** (13 deployed sub-workflows) and **Google Gemini AI**.

---

## 🔑 Demo Accounts & Passwords

Use the credentials below to log into the web conversational chat assistant (`http://localhost:3000`):

| Employee Code | Employee Name | Corporate Email | Role | Department | Secret 6-Digit PIN Password |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`EMP-1001`** | **Sarah Connor** | `sarah.connor@minori.io` | `EMPLOYEE` | Digital Product Engineering | **`849201`** |
| **`EMP-1002`** | **Alex Mercer** | `alex.mercer@minori.io` | `MANAGER` | AI Solutions Lab | **`123456`** |
| **`EMP-1003`** | **Elena Rostova** | `elena.rostova@minori.io` | `HR_ADMIN` | Human Resources & Ops | **`990011`** |

---

## 🚀 System Architecture & Quick Start

### 1. n8n Orchestrator Engine (`http://localhost:5678`)
Running in background listening on port `5678`.
Contains 13 active workflows:
- `WF-01 Chat Orchestrator`: State machine (`AWAIT_CODE` -> `AWAIT_PIN` -> `COLLECT` -> `SUMMARY` -> `SAVED`)
- `WF-02 SUB Session Store`: TTL session management
- `WF-03 SUB Identity`: Employee code and identity verification
- `WF-04 SUB Reference Data`: Projects catalog and settings cache
- `WF-05 SUB Scrub / Unscrub`: PII masking
- `WF-06 SUB Extract Gemini`: Gemini AI natural language parser
- `WF-07 SUB Validate Entry`: Deterministic validation rules (R1-R15)
- `WF-08 SUB Verify PIN`: HMAC-SHA256 password verification
- `WF-09 SUB Append Entry`: Timesheet persistence
- `WF-10 SUB Audit`: Compliance event logger
- `WF-11 Global Error Handler`: Webhook error handling
- `WF-12 Maintenance`: Nightly cleanup
- `WF-13 Daily Summary`: Automated summary generator

### 2. Production Web Client (`http://localhost:3000`)
```bash
cd web
npm install
npm run dev
```

### 3. Production Build
```bash
cd web
npm run build
```