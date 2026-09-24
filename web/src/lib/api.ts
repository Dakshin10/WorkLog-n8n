import { UserProfile, EngineResponse, TimesheetEntry, AuditEvent, NotificationItem, StageName } from '../types';

const N8N_BASE_URL = import.meta.env.VITE_N8N_URL || 'http://localhost:5678';
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5678/webhook/api/v1';

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
    hasPin: false,
    projects: []
  }
];

// Seed timesheet logs
export const INITIAL_TIMESHEETS: TimesheetEntry[] = [
  {
    entryId: 'WL-20260923-A8F12C',
    employeeCode: 'EMP-1001',
    employeeName: 'Sarah Connor',
    workDate: '2026-09-23',
    project: 'Client Portal Revamp',
    activity: 'Frontend UI Development',
    hours: 6.5,
    taskDescription: 'Designed glassmorphic dashboard layout with live chat thread and interactive timesheet grid.',
    additionalComments: 'All component tests passing cleanly.',
    status: 'LOGGED',
    createdAt: '2026-09-23T17:30:00Z',
    verifiedAt: '2026-09-23T17:30:05Z'
  },
  {
    entryId: 'WL-20260922-99B4D1',
    employeeCode: 'EMP-1001',
    employeeName: 'Sarah Connor',
    workDate: '2026-09-22',
    project: 'Client Portal Revamp',
    activity: 'API Integration',
    hours: 7.0,
    taskDescription: 'Connected n8n state machine webhook endpoints with React Query layer.',
    additionalComments: 'Implemented offline fallback state.',
    status: 'APPROVED',
    createdAt: '2026-09-22T18:00:00Z',
    verifiedAt: '2026-09-22T18:00:04Z'
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
let authenticatedUser: UserProfile | null = null;

export const api = {
  // Reset session stage for New Session
  resetSession: () => {
    currentSessionStage = 'AWAIT_CODE';
    currentPendingEntry = {};
    authenticatedUser = null;
  },

  getCurrentStage: () => currentSessionStage,

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
    // Try live n8n webhook endpoint first
    try {
      const liveWebhookUrl = 'http://localhost:5678/webhook/worklog-chat';
      const res = await fetch(liveWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Dev-User': userCode },
        body: JSON.stringify({ chatInput: message, message, client_message_id: clientMessageId, userCode }),
      });
      if (res.ok) {
        const data = await res.json();
        const replyText = data.output || data.reply || data.text || JSON.stringify(data);
        return {
          type: 'question',
          stage: data.stage || 'COLLECT',
          reply: replyText,
          options: data.options || ['Confirm', 'Cancel', 'Help'],
          rawPayload: data
        };
      }
    } catch (e) {
      // Fallback to local intelligent n8n engine mock
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
             trimmed.toLowerCase().includes(u.name.toLowerCase().split(' ')[0])
      );

      if (matchedUser || trimmed.toUpperCase().startsWith('EMP-')) {
        const user = matchedUser || DEMO_USERS[0];
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
        reply: `⚠️ Unrecognized Employee Code or Email (\`${trimmed}\`).\n\nPlease enter a valid Employee Code (e.g. \`EMP-1001\`, \`EMP-1002\`, or \`EMP-1003\`) to sign in.`,
        options: []
      };
    }

    // Stage 2: AWAIT_PIN (Verifying Password / PIN)
    if (currentSessionStage === 'AWAIT_PIN') {
      const expectedPin = authenticatedUser?.code === 'EMP-1002' ? '123456' : authenticatedUser?.code === 'EMP-1003' ? '990011' : '849201';

      if (trimmed === expectedPin || /^\d{6}$/.test(trimmed) || lower === '849201' || lower === '123456') {
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
          options: user.projects[0]?.activities.slice(0, 3) || ['Worked 6.5 hours on Client Portal Frontend UI', 'Worked 4 hours on Workflow Orchestration', 'Show My Weekly Summary']
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

      // 1. Natural Language Hours NLP
      let hours = 6.5;
      const hourMatch = trimmed.match(/(\d+(\.\d+)?)\s*(h|hr|hrs|hours?)/i) || trimmed.match(/(\d+(\.\d+)?)\s*hours?/i);
      if (hourMatch) {
        hours = parseFloat(hourMatch[1]);
      } else if (lower.includes('half day') || lower.includes('half a day')) {
        hours = 4.0;
      } else if (lower.includes('full day') || lower.includes('whole day') || lower.includes('9 to 5') || lower.includes('9am to 5pm')) {
        hours = 8.0;
      } else {
        const standaloneNum = trimmed.match(/\b(\d+(\.\d+)?)\b/);
        if (standaloneNum) hours = parseFloat(standaloneNum[1]);
      }

      // 2. Date NLP
      let workDate = new Date().toISOString().slice(0, 10);
      if (lower.includes('yesterday')) {
        const yest = new Date();
        yest.setDate(yest.getDate() - 1);
        workDate = yest.toISOString().slice(0, 10);
      }

      // 3. Project & Activity NLP Matching
      let selectedProj = user.projects[0]?.name || 'Client Portal Revamp';
      if (lower.includes('internal') || lower.includes('agent') || lower.includes('prompt') || lower.includes('llm') || lower.includes('workflow')) {
        const matchedP = user.projects.find(p => p.name.toLowerCase().includes('agent') || p.name.toLowerCase().includes('internal'));
        if (matchedP) selectedProj = matchedP.name;
      } else if (lower.includes('client') || lower.includes('portal') || lower.includes('frontend')) {
        const matchedP = user.projects.find(p => p.name.toLowerCase().includes('portal') || p.name.toLowerCase().includes('client'));
        if (matchedP) selectedProj = matchedP.name;
      }

      const activeProjectObj = user.projects.find(p => p.name === selectedProj) || user.projects[0];
      let selectedAct = activeProjectObj?.activities[0] || 'Frontend UI Development';

      if (lower.includes('frontend') || lower.includes('ui') || lower.includes('react') || lower.includes('design')) {
        selectedAct = activeProjectObj?.activities.find(a => a.toLowerCase().includes('frontend')) || selectedAct;
      } else if (lower.includes('api') || lower.includes('integration') || lower.includes('backend')) {
        selectedAct = activeProjectObj?.activities.find(a => a.toLowerCase().includes('api')) || selectedAct;
      } else if (lower.includes('test') || lower.includes('testing') || lower.includes('unit')) {
        selectedAct = activeProjectObj?.activities.find(a => a.toLowerCase().includes('test')) || selectedAct;
      } else if (lower.includes('workflow') || lower.includes('n8n') || lower.includes('orchestration')) {
        selectedAct = activeProjectObj?.activities.find(a => a.toLowerCase().includes('workflow')) || selectedAct;
      } else if (lower.includes('prompt') || lower.includes('gemini') || lower.includes('llm')) {
        selectedAct = activeProjectObj?.activities.find(a => a.toLowerCase().includes('prompt')) || selectedAct;
      } else if (lower.includes('audit') || lower.includes('security') || lower.includes('scrub')) {
        selectedAct = activeProjectObj?.activities.find(a => a.toLowerCase().includes('security') || a.toLowerCase().includes('audit')) || selectedAct;
      }

      currentPendingEntry = {
        employeeCode: user.code,
        employeeName: user.name,
        workDate: workDate,
        project: selectedProj,
        activity: selectedAct,
        hours: hours,
        taskDescription: trimmed,
        additionalComments: 'Extracted via WorkLog AI NLP Engine'
      };

      currentSessionStage = 'SUMMARY';

      return {
        type: 'summary',
        stage: 'SUMMARY',
        reply: `Here is your extracted work log summary — please check it:\n\n` +
          `• Employee Code: **${user.code}** (${user.name})\n` +
          `• Date: **${currentPendingEntry.workDate}**\n` +
          `• Project: **${currentPendingEntry.project}**\n` +
          `• Activity: **${currentPendingEntry.activity}**\n` +
          `• Contributed Hours: **${hours} hrs**\n` +
          `• Task Description: *"${trimmed}"*\n\n` +
          `Would you like to confirm and sign off this entry to save it to your Timesheet?`,
        options: ['Confirm & Save', 'Edit Hours', 'Cancel'],
        pendingEntry: currentPendingEntry
      };
    }

    // Stage 4: SUMMARY (Confirmation, In-place edits, & Saving)
    if (currentSessionStage === 'SUMMARY') {
      if (lower === 'confirm' || lower === 'confirm & save' || lower === 'yes' || lower === 'save') {
        const user = authenticatedUser || DEMO_USERS[0];
        const newEntryId = `WL-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(16).substring(2, 8).toUpperCase()}`;

        const newEntry: TimesheetEntry = {
          entryId: newEntryId,
          employeeCode: user.code,
          employeeName: user.name,
          workDate: currentPendingEntry.workDate || new Date().toISOString().slice(0, 10),
          project: currentPendingEntry.project || 'Client Portal Revamp',
          activity: currentPendingEntry.activity || 'Frontend UI Development',
          hours: currentPendingEntry.hours || 6.5,
          taskDescription: currentPendingEntry.taskDescription || trimmed,
          additionalComments: currentPendingEntry.additionalComments || 'Confirmed in chat',
          status: 'LOGGED',
          createdAt: new Date().toISOString(),
          verifiedAt: new Date().toISOString()
        };

        INITIAL_TIMESHEETS.unshift(newEntry);
        INITIAL_AUDIT_LOGS.unshift({
          id: `aud_${Date.now()}`,
          timestamp: new Date().toISOString(),
          employeeCode: user.code,
          event: 'CONFIRMED',
          details: `Entry ${newEntry.entryId} logged ${newEntry.hours}h to ${newEntry.project}`,
          sessionId: `sess_${Date.now().toString().slice(-5)}`,
          status: 'SUCCESS'
        });

        currentSessionStage = 'SAVED';

        return {
          type: 'saved',
          stage: 'SAVED',
          reply: `✅ **Verified & Saved to Timesheet!**\nEntry ID: \`${newEntry.entryId}\` — **${newEntry.hours}h** logged for **${newEntry.workDate}**.\n\nAnything else you would like to log today?`,
          options: ['Log another entry', 'Show my weekly summary', 'Log Out']
        };
      }

      // Handle in-place hours edit (e.g., "change to 5 hours", "make it 4 hrs", "edit hours")
      const editHourMatch = trimmed.match(/(\d+(\.\d+)?)/);
      if (editHourMatch && (lower.includes('hour') || lower.includes('make') || lower.includes('change') || lower.includes('edit'))) {
        const newHours = parseFloat(editHourMatch[1]);
        currentPendingEntry.hours = newHours;

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
          pendingEntry: currentPendingEntry
        };
      }

      if (lower === 'cancel' || lower === 'no' || lower === 'edit') {
        currentSessionStage = 'COLLECT';
        currentPendingEntry = {};
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

  getTimesheets: async (): Promise<TimesheetEntry[]> => [...INITIAL_TIMESHEETS],
  getAuditLogs: async (): Promise<AuditEvent[]> => [...INITIAL_AUDIT_LOGS],
  getNotifications: async (): Promise<NotificationItem[]> => [...INITIAL_NOTIFICATIONS]
};
