# WorkLog AI Lite — Required n8n Credentials

Companion to `sheet-setup.md`. Three credentials only for the Sheets-backed Lite track.

---

## 1. WorkLog Sheets
- **Type**: `Google Service Account`
- **Name**: `WorkLog Sheets`
- **Service Account Email**: `<from sheet-setup.md step 2>`
- **Private Key**: contents of the downloaded service-account JSON key
- Grant: the spreadsheet must be shared with this service account as **Editor** (`sheet-setup.md` step 2.6).

---

## 2. WorkLog Gemini
- **Type**: `Google Gemini API` (or `Google Vertex AI` service account credential)
- **Name**: `WorkLog Gemini`
- **API Key / Credentials**: Google Gemini API key, or GCP service account JSON if using Vertex AI
- **Region**: `asia-south1` (only if using Vertex AI for enterprise data terms)
- **Model**: a Flash-class Gemini model (per build-prompt doc §S4), temperature `0`, `maxOutputTokens` `800`, request timeout `8000` ms

---

## 3. WorkLog Pepper
- **Type**: `Header Auth` / `Generic Credential` OR Environment Variable `APP_PIN_PEPPER`
- **Name**: `WorkLog Pepper`
- **Secret**: A 32-byte (64 hex character) random hex string used as the HMAC-SHA256 secret key for peppered PIN hashing.
- **Usage**: Used by `WF-08 SUB Verify PIN` and `WF-13 PIN Enrolment` to hash 6-digit WorkLog PINs. Never stored in Google Sheets.

---

Never inline keys or pepper secrets in Code or HTTP Request nodes — reference them by credential name or environment variable only.
