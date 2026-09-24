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

export interface EngineResponse {
  type: 'question' | 'summary' | 'saved' | 'info' | 'error' | 'form_fallback';
  reply: string;
  stage?: StageName;
  options?: string[];
  pendingEntry?: Partial<TimesheetEntry>;
  missingFields?: string[];
  sessionId?: string;
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
