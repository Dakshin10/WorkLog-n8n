export type UserRole = 'EMPLOYEE' | 'MANAGER' | 'HR_ADMIN';

export interface UserProject {
  id: string;
  code: string;
  name: string;
  activities: string[];
}

export interface UserProfile {
  id: string;
  code: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  timezone: string;
  projects: UserProject[];
  hasPin: boolean;
}

export type StageName = 
  | 'AWAIT_CODE'
  | 'ASSIGNED'
  | 'COLLECT'
  | 'SUMMARY'
  | 'AWAIT_PIN'
  | 'SAVED'
  | 'LOCKED'
  | 'PIN_LOCKED';

export interface TimesheetEntry {
  entryId: string;
  employeeCode: string;
  employeeName: string;
  workDate: string; // YYYY-MM-DD
  project: string;
  activity: string;
  hours: number;
  taskDescription: string;
  additionalComments?: string;
  status: 'LOGGED' | 'SUPERSEDED' | 'APPROVED' | 'DRAFT';
  createdAt: string;
  verifiedAt?: string;
}

export interface ColumnDef {
  key: keyof TimesheetEntry;
  label: string;
  isMono?: boolean;
}

export const TIMESHEET_COLUMN_DEFS: ColumnDef[] = [
  { key: 'entryId', label: 'Entry ID', isMono: true },
  { key: 'employeeCode', label: 'Employee Code', isMono: true },
  { key: 'employeeName', label: 'Employee Name' },
  { key: 'workDate', label: 'Date', isMono: true },
  { key: 'project', label: 'Project Name' },
  { key: 'activity', label: 'Activity Type' },
  { key: 'hours', label: 'Contributed Hours', isMono: true },
  { key: 'taskDescription', label: 'Task Description' },
  { key: 'additionalComments', label: 'Additional Comments' },
];

export type EngineStatus = 'ok' | 'needs_credentials' | 'rate_limited' | 'error';

export interface EngineResponse {
  type: 'question' | 'summary' | 'saved' | 'info' | 'error' | 'form_fallback';
  reply: string;
  stage?: StageName;
  options?: string[];
  pendingEntry?: Partial<TimesheetEntry>;
  pendingEntries?: Partial<TimesheetEntry>[];
  missingFields?: string[];
  sessionId?: string;
  status?: EngineStatus;
  retryAfter?: number; // seconds; set when status is 'rate_limited'
  rawPayload?: any;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  employeeCode: string;
  event: 'IDENTITY_VERIFIED' | 'IDENTITY_REJECTED' | 'SUMMARY_SHOWN' | 'PIN_VERIFIED' | 'CONFIRMED' | 'CANCELLED' | 'RATE_LIMITED' | 'VALIDATION_FAILED';
  details: string;
  sessionId: string;
  status: 'SUCCESS' | 'WARN' | 'ERROR';
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  actionUrl?: string;
}
