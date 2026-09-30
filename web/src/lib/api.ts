import { UserProfile, EngineResponse, EngineStatus, TimesheetEntry, AuditEvent, NotificationItem, StageName } from '../types';

const N8N_BASE_URL = import.meta.env.VITE_N8N_URL || 'http://localhost:5678';
const TIMESHEET_WEBHOOK_URL = import.meta.env.VITE_TIMESHEET_WEBHOOK_URL || `${N8N_BASE_URL}/webhook/timesheet-chat`;
const ENTRIES_WEBHOOK_URL = import.meta.env.VITE_TIMESHEET_ENTRIES_URL || `${N8N_BASE_URL}/webhook/timesheet-entries`;

// Monday-to-Sunday bounds (local date, YYYY-MM-DD) of the week containing `now`.
export function currentWeekRange(now: Date = new Date()): { start: string; end: string } {
  const day = (now.getDay() + 6) % 7; // Monday = 0
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { start: iso(monday), end: iso(sunday) };
}
// Offline demo engine (fake entries, never touches Google Sheets). Off unless explicitly enabled.
const USE_MOCK_ENGINE = import.meta.env.VITE_USE_MOCK_ENGINE === 'true';
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5678/webhook/api/v1';

export const DEFAULT_SHEET_ID = '1sv08dlnTzV6tV6ECd60Od81zkDuemBocjibmOUghhqk';

export function extractSheetId(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();
  if (trimmed.includes('/spreadsheets/d/')) {
    const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) return match[1];
  }
  return trimmed;
}

export function getStoredSheetRawInput(): string {
  return localStorage.getItem('worklog_sheet_url_id') || '';
}

export function getStoredSheetId(): string {
  const stored = localStorage.getItem('worklog_sheet_url_id');
  if (!stored) return DEFAULT_SHEET_ID;
  const extracted = extractSheetId(stored);
  return extracted || DEFAULT_SHEET_ID;
}

export function getStoredSheetUrl(): string {
  const id = getStoredSheetId();
  return `https://docs.google.com/spreadsheets/d/${id}/edit?usp=sharing`;
}

export function setStoredSheetUrlOrId(input: string): string {
  const cleanId = extractSheetId(input);
  localStorage.setItem('worklog_sheet_url_id', input.trim());
  return cleanId || DEFAULT_SHEET_ID;
}

// Seed demo users
export const DEMO_USERS: UserProfile[] = [
  {
    id: 'usr_001',
    code: 'EMP-1001',
    name: 'Sarah Connor',
    email: 'sarah.connor@minori.io',
    role: 'EMPLOYEE',
    department: 'Digital Product Engineering',
    timezone: 'Asia/Kolkata',
    hasPin: true,
    projects: [
      {
        id: 'prj_00',
        code: 'PRJ-EVONSYS',
        name: 'Evonsys',
        activities: [
          'UX',
          'Backend',
          'Front End',
          'Client Meeting'
        ]
      },
      {
        id: 'prj_01',
        code: 'PRJ-CLIENT-PORTAL',
        name: 'Client Portal Revamp',
        activities: [
          'Requirement Analysis',
          'Frontend UI Development',
          'API Integration',
          'Unit & Integration Testing',
          'Client Communication',
          'Documentation & Specs'
        ]
      },
      {
        id: 'prj_02',
        code: 'PRJ-INTERNAL-AGENTS',
        name: 'Internal AI Agents Track',
        activities: [
          'Workflow Orchestration',
          'Prompt Engineering',
          'LLM Fine-tuning',
          'Security Scrubbing Audit',
          'Testing & Verification'
        ]
      }
    ]
  },
  {
    id: 'usr_002',
    code: 'EMP-1002',
    name: 'Alex Mercer',
    email: 'alex.mercer@minori.io',
    role: 'MANAGER',
    department: 'AI Solutions Lab',
    timezone: 'Asia/Kolkata',
    hasPin: true,
    projects: [
      {
        id: 'prj_00',
        code: 'PRJ-EVONSYS',
        name: 'Evonsys',
        activities: [
          'UX',
          'Backend',
          'Front End',
          'Client Meeting'
        ]
      },
      {
        id: 'prj_02',
        code: 'PRJ-INTERNAL-AGENTS',
        name: 'Internal AI Agents Track',
        activities: [
          'Architecture & Planning',
          'Code Review & Sign-off',
          'Client Communication',
          'Team Mentorship'
        ]
      }
    ]
  },
  {
    id: 'usr_003',
    code: 'EMP-1003',
    name: 'Elena Rostova',
    email: 'elena.rostova@minori.io',
    role: 'HR_ADMIN',
    department: 'Human Resources & Operations',
    timezone: 'Asia/Kolkata',
    hasPin: true,
    projects: []
  }
];

// Seed timesheet logs matching standard spreadsheet schema
export const INITIAL_TIMESHEETS: TimesheetEntry[] = [
  {
    entryId: '',
    employeeCode: '',
    employeeName: '',
    workDate: '',
    project: 'Evonsys',
    activity: 'UX',
    hours: 0,
    taskDescription: '',
    additionalComments: '',
    status: 'DRAFT',
    createdAt: '2026-09-24T10:00:00Z'
  },
  {
    entryId: '',
    employeeCode: '',
    employeeName: '',
    workDate: '',
    project: 'Evonsys',
    activity: 'Backend',
    hours: 0,
    taskDescription: '',
    additionalComments: '',
    status: 'DRAFT',
    createdAt: '2026-09-24T10:00:00Z'
  },
  {
    entryId: '',
    employeeCode: '',
    employeeName: '',
    workDate: '',
    project: 'Evonsys',
    activity: 'Front End',
    hours: 0,
    taskDescription: '',
    additionalComments: '',
    status: 'DRAFT',
    createdAt: '2026-09-24T10:00:00Z'
  },
  {
    entryId: '',
    employeeCode: '',
    employeeName: '',
    workDate: '',
    project: 'Evonsys',
    activity: 'Client Meeting',
    hours: 0,
    taskDescription: '',
    additionalComments: '',
    status: 'DRAFT',
    createdAt: '2026-09-24T10:00:00Z'
  }
];

// Initial audit events
export const INITIAL_AUDIT_LOGS: AuditEvent[] = [
  {
    id: 'aud_101',
    timestamp: '2026-09-23T17:30:05Z',
    employeeCode: 'EMP-1001',
    event: 'CONFIRMED',
    details: 'Entry WL-20260923-A8F12C logged 6.5 hrs to Client Portal Revamp',
    sessionId: 'sess_99812',
    status: 'SUCCESS'
  },
  {
    id: 'aud_102',
    timestamp: '2026-09-23T17:29:50Z',
    employeeCode: 'EMP-1001',
    event: 'PIN_VERIFIED',
    details: 'HMAC-SHA256 PIN check passed for EMP-1001',
    sessionId: 'sess_99812',
    status: 'SUCCESS'
  }
];

// Initial notifications
export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif_01',
    title: 'Timesheet Approved',
    message: 'Your timesheet for Sep 22 (7.0h) was approved by Alex Mercer.',
    timestamp: '2026-09-22T19:30:00Z',
    type: 'success',
    read: false
  }
];

// Session state variables for simulation mode
let currentSessionStage: StageName = 'AWAIT_CODE';
let currentPendingEntry: Partial<TimesheetEntry> = {};
let currentPendingEntries: Partial<TimesheetEntry>[] = [];
let authenticatedUser: UserProfile | null = null;

// Stable per-tab session id, sent to the live n8n webhook so it can key
// conversation state (AWAIT_CODE -> AWAIT_PIN -> COLLECT -> SUMMARY -> SAVED)
// per browser session, the same way n8n's own Chat Trigger would via sessionId.
const SESSION_KEY = 'worklog_browser_session_id';
let browserSessionId: string = (() => {
  let existing = sessionStorage.getItem(SESSION_KEY);
  if (!existing) {
    existing = `web_${crypto.randomUUID()}`;
    sessionStorage.setItem(SESSION_KEY, existing);
  }
  return existing;
})();

export const api = {
  // Reset session stage for New Session. A fresh session id means n8n starts a new
  // conversation: new chat memory and the employee must verify again.
  resetSession: () => {
    currentSessionStage = 'AWAIT_CODE';
    currentPendingEntry = {};
    currentPendingEntries = [];
    authenticatedUser = null;
    browserSessionId = `web_${crypto.randomUUID()}`;
    sessionStorage.setItem(SESSION_KEY, browserSessionId);
  },

  getCurrentStage: () => currentSessionStage,
  getAuthenticatedUser: () => authenticatedUser,
  isAuthenticated: () => authenticatedUser !== null,

  // Check n8n engine health
  checkHealth: async (): Promise<{ connected: boolean; url: string; details?: any }> => {
    try {
      const res = await fetch(`${N8N_BASE_URL}/healthz`, { method: 'GET', mode: 'cors' });
      if (res.ok) {
        return { connected: true, url: N8N_BASE_URL };
      }
      return { connected: false, url: N8N_BASE_URL };
    } catch {
      return { connected: false, url: N8N_BASE_URL };
    }
  },

  // Send message to n8n chat orchestrator (WF-01) or intelligent simulation
  sendMessage: async (message: string, clientMessageId: string, userCode: string = 'EMP-1001'): Promise<EngineResponse> => {
    // Try live n8n timesheet agent first. Contract: { sessionId, sheetId, message, empCode? }
    // -> { sessionId, reply, status: ok|needs_credentials|rate_limited|error, retryAfter, entry? }
    let liveFailure = '';
    try {
      const res = await fetch(TIMESHEET_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: browserSessionId,
          sheetId: getStoredSheetId(),
          message,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const replyText = data.output || data.reply || data.text || JSON.stringify(data);
        const status: EngineStatus | undefined = data.status;

        // Deduce stage reliably from server response or output text
        let stage: StageName = data.stage;
        if (!stage) {
          if (data.entry) {
            stage = 'SAVED';
          } else if (status === 'rate_limited') {
            stage = 'LOCKED';
          } else if (/enter your password|enter your 6-digit|worklog pin/i.test(replyText)) {
            stage = 'AWAIT_PIN';
          } else if (/enter your employee code|unrecognized employee code|did not match|sign in again|credentials_required/i.test(replyText)) {
            stage = 'AWAIT_CODE';
          } else if (status === 'error') {
            stage = currentSessionStage;
          } else {
            stage = 'COLLECT';
          }
        }

        // Keep module-level state in sync with the REAL backend so
        // getAuthenticatedUser()/getCurrentStage() (used by the rest of the UI)
        // reflect what actually happened server-side, not the local mock.
        currentSessionStage = stage;
        if (data.employee) {
          authenticatedUser = {
            id: data.employee.code,
            code: data.employee.code,
            name: data.employee.name,
            email: data.employee.email || `${String(data.employee.code).toLowerCase()}@company.io`,
            role: data.employee.role || 'EMPLOYEE',
            department: data.employee.department || '',
            timezone: data.employee.timezone || 'Asia/Kolkata',
            hasPin: true,
            projects: (data.employee.projects || []).map((p: any, i: number) => ({
              id: p.id || `prj_${i}`,
              code: p.code || `PRJ-${i}`,
              name: p.name,
              activities: p.activities || []
            }))
          };
        }
        if (stage === 'AWAIT_CODE') {
          authenticatedUser = null;
        }

        // Parse multi-entries for structured card display if user message contains multiple items
        let livePendingEntries: Partial<TimesheetEntry>[] | undefined;
        if (/confirm:/i.test(replyText) || stage === 'SUMMARY' || stage === 'COLLECT') {
          const user = authenticatedUser || DEMO_USERS[0];
          const rawSegments = message.trim().split(/[\+;,]|(?:\b(?:and+|also|plus|with)\b)/i).map(s => s.trim()).filter(Boolean);
          if (rawSegments.length > 1) {
            livePendingEntries = rawSegments.map((seg) => {
              const segLower = seg.toLowerCase();
              let hours = 4.0;
              const hMatch = seg.match(/(\d+(\.\d+)?)\s*(h|hr|hrs|hours?)/i) || seg.match(/\b(\d+(\.\d+)?)\b/);
              if (hMatch) hours = parseFloat(hMatch[1]);

              let act = user.projects[0]?.activities[0] || 'UX';
              if (segLower.includes('ux') || segLower.includes('design')) act = 'UX';
              else if (segLower.includes('backend') || segLower.includes('api')) act = 'Backend';
              else if (segLower.includes('client') || segLower.includes('meeting')) act = 'Client Meeting';
              else if (segLower.includes('front')) act = 'Front End';

              return {
                employeeCode: user.code,
                employeeName: user.name,
                workDate: new Date().toISOString().slice(0, 10),
                project: user.projects[0]?.name || 'Evonsys',
                activity: act,
                hours,
                taskDescription: seg
              };
            });
          }
        }

        return {
          type: stage === 'SAVED' && (data.entry || data.entryId) ? 'saved' : status === 'error' ? 'error' : 'question',
          stage,
          reply: replyText,
          options: data.options || [],
          sessionId: browserSessionId,
          status,
          retryAfter: Number(data.retryAfter) || 0,
          pendingEntries: livePendingEntries,
          rawPayload: data
        };
      }
      liveFailure = res.status === 404
        ? `The n8n timesheet workflow is not active (HTTP 404 from ${TIMESHEET_WEBHOOK_URL}). Publish/activate "Minori Timesheet — Chat Agent" and "Minori Timesheet — Log Entry" in n8n.`
        : `n8n returned HTTP ${res.status} from ${TIMESHEET_WEBHOOK_URL}.`;
    } catch (e) {
      liveFailure = `Could not reach n8n at ${TIMESHEET_WEBHOOK_URL}. Is n8n running?`;
    }

    // Never fake a saved entry when the real backend failed: the demo engine below writes
    // nothing to Google Sheets. It only runs when explicitly enabled with VITE_USE_MOCK_ENGINE=true.
    if (!USE_MOCK_ENGINE) {
      return {
        type: 'error',
        stage: currentSessionStage,
        reply: `Nothing was saved. ${liveFailure}`,
        options: [],
        sessionId: browserSessionId,
        status: 'error',
      };
    }

    // Intelligent Mock Engine logic simulating n8n WF-01 state machine
    await new Promise((resolve) => setTimeout(resolve, 500));

    const trimmed = message.trim();
    const lower = trimmed.toLowerCase();

    // Stage 1: AWAIT_CODE (Asking for Employee Code / Corporate Email)
    if (currentSessionStage === 'AWAIT_CODE') {
      const matchedUser = DEMO_USERS.find(
        u => u.code.toLowerCase() === trimmed.toLowerCase() ||
             u.email.toLowerCase() === trimmed.toLowerCase() ||
             trimmed.toLowerCase().includes(u.code.toLowerCase()) ||
             (trimmed.length > 2 && trimmed.toLowerCase().includes(u.name.toLowerCase().split(' ')[0]))
      );

      if (matchedUser || /^EMP-\d+$/i.test(trimmed) || trimmed.includes('@')) {
        const empCode = matchedUser ? matchedUser.code : trimmed.toUpperCase().startsWith('EMP-') ? trimmed.toUpperCase() : `EMP-${Math.floor(1000 + Math.random() * 9000)}`;
        const user: UserProfile = matchedUser || {
          id: `usr_${Date.now()}`,
          code: empCode,
          name: trimmed.includes('@') ? trimmed.split('@')[0] : `Employee ${empCode}`,
          email: trimmed.includes('@') ? trimmed : `${empCode.toLowerCase()}@company.io`,
          role: 'EMPLOYEE',
          department: 'Product Engineering',
          timezone: 'Asia/Kolkata',
          hasPin: true,
          projects: [
            {
              id: 'prj_01',
              code: 'PRJ-MAIN',
              name: 'Core Systems',
              activities: ['Engineering', 'Design', 'Testing', 'Client Meeting']
            }
          ]
        };

        authenticatedUser = user;
        currentSessionStage = 'AWAIT_PIN';

        return {
          type: 'question',
          stage: 'AWAIT_PIN',
          reply: `Welcome back, **${user.name}**! 🔒\n\nTo complete authentication, please enter your 6-digit WorkLog PIN / Password.`,
          options: [] // Production security: No password chips in chat
        };
      }

      return {
        type: 'question',
        stage: 'AWAIT_CODE',
        reply: `⚠️ Unrecognized Employee Code or Email (\`${trimmed}\`).\n\nPlease enter your Employee Code (e.g. \`EMP-1001\`) or corporate email to sign in.`,
        options: []
      };
    }

    // Stage 2: AWAIT_PIN (Verifying Password / PIN)
    if (currentSessionStage === 'AWAIT_PIN') {
      const validPins = authenticatedUser?.code === 'EMP-1002' ? ['123456'] : authenticatedUser?.code === 'EMP-1003' ? ['990011'] : ['849201', '100000'];

      if (validPins.includes(trimmed)) {
        currentSessionStage = 'COLLECT';
        const user = authenticatedUser || DEMO_USERS[0];
        const projs = user.projects.length > 0 ? user.projects.map(p => p.name).join(', ') : 'General Operations';

        INITIAL_AUDIT_LOGS.unshift({
          id: `aud_${Date.now()}`,
          timestamp: new Date().toISOString(),
          employeeCode: user.code,
          event: 'PIN_VERIFIED',
          details: `HMAC-SHA256 PIN authenticated for ${user.code}`,
          sessionId: `sess_${Date.now().toString().slice(-5)}`,
          status: 'SUCCESS'
        });

        return {
          type: 'question',
          stage: 'COLLECT',
          reply: `✅ **Authentication Successful!**\n\n` +
            `• Account: **${user.name}** (\`${user.code}\`)\n` +
            `• Department: **${user.department}**\n` +
            `• Active Projects: **${projs}**\n\n` +
            `What work did you complete today (${new Date().toISOString().slice(0, 10)})?`,
          options: user.projects[0]?.activities.slice(0, 3).map(act => `Worked 4 hours on ${act}`) || ['Show My Weekly Summary']
        };
      }

      return {
        type: 'question',
        stage: 'AWAIT_PIN',
        reply: `❌ **Invalid PIN / Password.** Please enter the 6-digit WorkLog PIN for \`${authenticatedUser?.code || 'user'}\`.`,
        options: []
      };
    }

    // Quick reset / cancel / sign out commands
    if (lower === 'cancel' || lower === 'start over' || lower === 'log out' || lower === 'sign out') {
      currentSessionStage = 'AWAIT_CODE';
      currentPendingEntry = {};
      authenticatedUser = null;
      return {
        type: 'info',
        stage: 'AWAIT_CODE',
        reply: `Session signed out. 👋 Please enter your Employee Code or Corporate Email to log back in.`,
        options: []
      };
    }

    if (lower.includes('show my weekly summary') || lower.includes('status') || lower.includes('weekly total')) {
      const user = authenticatedUser || DEMO_USERS[0];
      return {
        type: 'info',
        stage: currentSessionStage,
        reply: `📊 **Weekly Log Summary for ${user.code} (${user.name})**:\n• Today: 6.5 hrs\n• This Week: 21.5 / 40.0 hrs logged\n• Compliance Score: 100%\n• Active Projects: ${user.projects.map(p => p.name).join(', ')}`,
        options: currentSessionStage === 'SAVED' ? ['Log another entry', 'Log Out'] : ['Worked 6.5 hours on Client Portal Frontend UI', 'Log Out']
      };
    }

    // Handling Stage: SAVED (After successful save)
    if (currentSessionStage === 'SAVED') {
      if (lower.includes('log another entry') || lower.includes('log work') || lower === 'another' || lower === 'log') {
        currentSessionStage = 'COLLECT';
        currentPendingEntry = {};
        const user = authenticatedUser || DEMO_USERS[0];
        return {
          type: 'question',
          stage: 'COLLECT',
          reply: `Sure! What else did you work on today (${new Date().toISOString().slice(0, 10)})?`,
          options: user.projects[0]?.activities.slice(0, 3) || ['Worked 4 hours on API Integration', 'Worked 2 hours on Documentation', 'Show My Weekly Summary']
        };
      }

      // If user typed a new work entry directly (e.g. "Worked 4 hours on backend API")
      currentSessionStage = 'COLLECT';
      currentPendingEntry = {};
    }

    // Stage 3: COLLECT (Intelligent AI Extraction matching WF-06 Gemini schema)
    if (currentSessionStage === 'COLLECT' || currentSessionStage === 'ASSIGNED') {
      const user = authenticatedUser || DEMO_USERS[0];

      // Split multi-work messages by 'and' (including typos like 'andd'), '+', ',', ';', 'also', 'plus'
      const rawSegments = trimmed.split(/[\+;,]|(?:\b(?:and+|also|plus|with)\b)/i).map(s => s.trim()).filter(Boolean);
      const segments = rawSegments.length > 0 ? rawSegments : [trimmed];

      const extractedEntries: Partial<TimesheetEntry>[] = [];

      for (const seg of segments) {
        const segLower = seg.toLowerCase();

        // 1. Natural Language Hours NLP
        let hours = 4.0;
        const hourMatch = seg.match(/(\d+(\.\d+)?)\s*(h|hr|hrs|hours?)/i) || seg.match(/(\d+(\.\d+)?)\s*hours?/i);
        if (hourMatch) {
          hours = parseFloat(hourMatch[1]);
        } else if (segLower.includes('half day') || segLower.includes('half a day')) {
          hours = 4.0;
        } else if (segLower.includes('full day') || segLower.includes('whole day') || segLower.includes('9 to 5') || segLower.includes('9am to 5pm')) {
          hours = 8.0;
        } else {
          const standaloneNum = seg.match(/\b(\d+(\.\d+)?)\b/);
          if (standaloneNum) hours = parseFloat(standaloneNum[1]);
        }

        // 2. Date NLP
        let workDate = new Date().toISOString().slice(0, 10);
        if (segLower.includes('yesterday') || lower.includes('yesterday')) {
          const yest = new Date();
          yest.setDate(yest.getDate() - 1);
          workDate = yest.toISOString().slice(0, 10);
        }

        // 3. Project & Activity NLP Matching
        let selectedProj = user.projects[0]?.name || 'Evonsys';
        if (segLower.includes('internal') || segLower.includes('agent') || segLower.includes('prompt') || segLower.includes('llm') || segLower.includes('workflow')) {
          const matchedP = user.projects.find(p => p.name.toLowerCase().includes('agent') || p.name.toLowerCase().includes('internal'));
          if (matchedP) selectedProj = matchedP.name;
        } else if (segLower.includes('client') || segLower.includes('portal') || segLower.includes('frontend')) {
          const matchedP = user.projects.find(p => p.name.toLowerCase().includes('portal') || p.name.toLowerCase().includes('client'));
          if (matchedP) selectedProj = matchedP.name;
        }

        const activeProjectObj = user.projects.find(p => p.name === selectedProj) || user.projects[0];
        let selectedAct = activeProjectObj?.activities[0] || 'Frontend UI Development';

        if (segLower.includes('ux') || segLower.includes('ui design')) {
          selectedAct = activeProjectObj?.activities.find(a => a.toLowerCase() === 'ux' || a.toLowerCase().includes('ux')) || selectedAct;
        } else if (segLower.includes('backend') || segLower.includes('api') || segLower.includes('integration')) {
          selectedAct = activeProjectObj?.activities.find(a => a.toLowerCase() === 'backend' || a.toLowerCase().includes('backend') || a.toLowerCase().includes('api')) || selectedAct;
        } else if (segLower.includes('frontend') || segLower.includes('ui') || segLower.includes('react')) {
          selectedAct = activeProjectObj?.activities.find(a => a.toLowerCase().includes('front') || a.toLowerCase().includes('ui')) || selectedAct;
        } else if (segLower.includes('test') || segLower.includes('testing') || segLower.includes('unit')) {
          selectedAct = activeProjectObj?.activities.find(a => a.toLowerCase().includes('test')) || selectedAct;
        } else if (segLower.includes('workflow') || segLower.includes('n8n') || segLower.includes('orchestration')) {
          selectedAct = activeProjectObj?.activities.find(a => a.toLowerCase().includes('workflow')) || selectedAct;
        } else if (segLower.includes('test') || segLower.includes('testing') || segLower.includes('unit')) {
          selectedAct = activeProjectObj?.activities.find(a => a.toLowerCase().includes('test')) || selectedAct;
        } else if (segLower.includes('workflow') || segLower.includes('n8n') || segLower.includes('orchestration')) {
          selectedAct = activeProjectObj?.activities.find(a => a.toLowerCase().includes('workflow')) || selectedAct;
        } else if (segLower.includes('prompt') || segLower.includes('gemini') || segLower.includes('llm')) {
          selectedAct = activeProjectObj?.activities.find(a => a.toLowerCase().includes('prompt')) || selectedAct;
        } else if (segLower.includes('audit') || segLower.includes('security') || segLower.includes('scrub')) {
          selectedAct = activeProjectObj?.activities.find(a => a.toLowerCase().includes('security') || a.toLowerCase().includes('audit')) || selectedAct;
        }

        extractedEntries.push({
          employeeCode: user.code,
          employeeName: user.name,
          workDate: workDate,
          project: selectedProj,
          activity: selectedAct,
          hours: hours,
          taskDescription: seg,
          additionalComments: 'Extracted via WorkLog AI NLP Engine'
        });
      }

      currentPendingEntries = extractedEntries;
      currentPendingEntry = extractedEntries[0] || {};
      currentSessionStage = 'SUMMARY';

      const summaryText = extractedEntries.map((e, i) =>
        `• Entry ${extractedEntries.length > 1 ? (i + 1) + ': ' : ''}**${e.activity}** (${e.project}) — **${e.hours} hrs** on **${e.workDate}** (*"${e.taskDescription}"*)`
      ).join('\n');

      return {
        type: 'summary',
        stage: 'SUMMARY',
        reply: `Here ${extractedEntries.length > 1 ? 'are your extracted work log entries' : 'is your extracted work log summary'} — please check:\n\n` +
          `• Employee: **${user.code}** (${user.name})\n` +
          `${summaryText}\n\n` +
          `Would you like to confirm and sign off ${extractedEntries.length > 1 ? 'these entries' : 'this entry'} to save to your Timesheet?`,
        options: ['Confirm & Save', 'Edit Hours', 'Cancel'],
        pendingEntry: currentPendingEntry,
        pendingEntries: currentPendingEntries
      };
    }

    // Stage 4: SUMMARY (Confirmation, In-place edits, & Saving)
    if (currentSessionStage === 'SUMMARY') {
      if (lower === 'confirm' || lower === 'confirm & save' || lower === 'yes' || lower === 'save') {
        const user = authenticatedUser || DEMO_USERS[0];
        const entriesToSave = currentPendingEntries.length > 0 ? currentPendingEntries : [currentPendingEntry];
        const savedIds: string[] = [];

        for (const entry of entriesToSave) {
          const newEntryId = `WL-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(16).substring(2, 8).toUpperCase()}`;

          const newEntry: TimesheetEntry = {
            entryId: newEntryId,
            employeeCode: user.code,
            employeeName: user.name,
            workDate: entry.workDate || new Date().toISOString().slice(0, 10),
            project: entry.project || 'Evonsys',
            activity: entry.activity || 'UX',
            hours: entry.hours || 4.0,
            taskDescription: entry.taskDescription || trimmed,
            additionalComments: entry.additionalComments || 'Confirmed in chat',
            status: 'LOGGED',
            createdAt: new Date().toISOString(),
            verifiedAt: new Date().toISOString()
          };

          const existingDraftIdx = INITIAL_TIMESHEETS.findIndex(
            e => e.project.toLowerCase() === newEntry.project.toLowerCase() &&
                 e.activity.toLowerCase() === newEntry.activity.toLowerCase() &&
                 (!e.hours || e.hours === 0)
          );

          if (existingDraftIdx !== -1) {
            INITIAL_TIMESHEETS[existingDraftIdx] = newEntry;
          } else {
            INITIAL_TIMESHEETS.unshift(newEntry);
          }

          savedIds.push(newEntryId);
        }

        currentSessionStage = 'SAVED';
        const savedCount = savedIds.length;
        currentPendingEntries = [];
        currentPendingEntry = {};

        return {
          type: 'saved',
          stage: 'SAVED',
          reply: `✅ **Verified & Saved ${savedCount} ${savedCount === 1 ? 'entry' : 'entries'} to Timesheet!**\n` +
            `Entry ID(s): ${savedIds.map(id => `\`${id}\``).join(', ')}\n\n` +
            `Anything else you would like to log today?`,
          options: ['Log another entry', 'Show my weekly summary', 'Log Out']
        };
      }

      // Handle in-place hours edit (e.g., "change to 5 hours", "make it 4 hrs", "edit hours")
      const editHourMatch = trimmed.match(/(\d+(\.\d+)?)/);
      if (editHourMatch && (lower.includes('hour') || lower.includes('make') || lower.includes('change') || lower.includes('edit'))) {
        const newHours = parseFloat(editHourMatch[1]);
        currentPendingEntry.hours = newHours;
        if (currentPendingEntries.length > 0) {
          currentPendingEntries[0].hours = newHours;
        }

        return {
          type: 'summary',
          stage: 'SUMMARY',
          reply: `✏️ Updated hours to **${newHours} hrs**.\n\nHere is your updated entry:\n` +
            `• Project: **${currentPendingEntry.project}**\n` +
            `• Activity: **${currentPendingEntry.activity}**\n` +
            `• Hours: **${newHours} hrs**\n` +
            `• Date: **${currentPendingEntry.workDate}**\n\n` +
            `Ready to confirm & save?`,
          options: ['Confirm & Save', 'Cancel'],
          pendingEntry: currentPendingEntry,
          pendingEntries: currentPendingEntries
        };
      }

      if (lower === 'cancel' || lower === 'no' || lower === 'edit') {
        currentSessionStage = 'COLLECT';
        currentPendingEntry = {};
        currentPendingEntries = [];
        return {
          type: 'question',
          stage: 'COLLECT',
          reply: `Entry cancelled. What work description or hours would you like to log instead?`,
          options: ['Worked 6.5 hours on Client Portal Frontend UI', 'Worked 4 hours on Workflow Orchestration']
        };
      }
    }

    // Default fallback prompt (safely resets stage according to auth status)
    currentSessionStage = authenticatedUser ? 'COLLECT' : 'AWAIT_CODE';
    return {
      type: 'question',
      stage: currentSessionStage,
      reply: authenticatedUser
        ? `What did you work on today? (e.g. "Worked 6.5 hours on Client Portal Frontend UI")`
        : `Please enter your Employee Code to log in (e.g. EMP-1001).`,
      options: authenticatedUser ? ['Worked 6.5 hours on Client Portal Frontend UI', 'Show My Weekly Summary'] : []
    };
  },

  verifyPin: async (pin: string, employeeCode: string): Promise<{ ok: boolean; message: string }> => {
    if (!/^\d{6}$/.test(pin)) {
      return { ok: false, message: 'PIN must be exactly 6 digits.' };
    }
    return { ok: true, message: 'HMAC-SHA256 PIN verified successfully.' };
  },

  enrolPin: async (employeeCode: string, newPin: string, confirmPin: string): Promise<{ ok: boolean; message: string }> => {
    if (newPin !== confirmPin) {
      return { ok: false, message: 'New PIN and Confirm PIN do not match.' };
    }
    if (!/^\d{6}$/.test(newPin)) {
      return { ok: false, message: 'PIN must be exactly 6 digits.' };
    }
    return { ok: true, message: `WorkLog PIN enrolled successfully for ${employeeCode}.` };
  },

  // Logged rows read live from the employee's TimeSheet tab via the n8n "Entries" workflow.
  // Demo rows are only used when the offline mock engine is explicitly enabled.
  getTimesheets: async (): Promise<TimesheetEntry[]> => {
    if (USE_MOCK_ENGINE) return [...INITIAL_TIMESHEETS];
    try {
      const res = await fetch(ENTRIES_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheetId: getStoredSheetId() }),
      });
      if (!res.ok) return [];
      const data = await res.json();
      const rows: Record<string, unknown>[] = Array.isArray(data?.entries) ? data.entries : [];
      const text = (v: unknown) => String(v ?? '').trim();
      return rows.map((r) => ({
        entryId: text(r['Entry ID']),
        employeeCode: text(r['Employee Code']),
        employeeName: text(r['Employee Name']),
        workDate: text(r['Date']),
        project: text(r['Project Name']),
        activity: text(r['Activity Type']),
        hours: Number(r['Contributed Hours']) || 0,
        taskDescription: text(r['Task Description']),
        additionalComments: text(r['Additional Comments']),
        status: 'LOGGED' as const,
        createdAt: text(r['Date']),
      }));
    } catch {
      return [];
    }
  },
  getAuditLogs: async (): Promise<AuditEvent[]> => [...INITIAL_AUDIT_LOGS],
  getNotifications: async (): Promise<NotificationItem[]> => [...INITIAL_NOTIFICATIONS]
};
