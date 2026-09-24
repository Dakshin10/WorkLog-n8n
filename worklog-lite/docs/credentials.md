# WorkLog Sheet Chat — Required n8n Credentials

Companion to `sheet-setup.md`. Two credentials only.

---

## 1. WorkLog Sheets
- **Type**: `Google Service Account`
- **Name**: `WorkLog Sheets`
- **Service Account Email**: `<from sheet-setup.md step 2>`
- **Private Key**: contents of the downloaded service-account JSON key
- Grant: the spreadsheet must be shared with this service account as **Editor**
  (`sheet-setup.md` step 2.6).

---

## 2. WorkLog Gemini
- **Type**: `Google Gemini API` (or `Google Vertex AI` service account credential)
- **Name**: `WorkLog Gemini`
- **API Key / Credentials**: Google Gemini API key, or GCP service account JSON if using
  Vertex AI
- **Model**: `gemini-1.5-flash` (already set in the workflow), temperature `0`,
  `maxOutputTokens` `800`

---

Never inline either key in a Code or HTTP Request node — every Sheets/Gemini node in the
workflow references these by credential name only.
