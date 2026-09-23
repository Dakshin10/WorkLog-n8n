export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'EMPLOYEE' | 'MANAGER' | 'HR_ADMIN';
  department: string;
  timezone: string;
  projects: Array<{ id: string; code: string; name: string }>;
}

export interface EngineResponse {
  type: 'question' | 'summary' | 'saved' | 'info' | 'error' | 'form_fallback';
  reply: string;
  options?: string[];
  pending_entries?: Array<{
    project_id?: string;
    project_name?: string;
    activity_id?: string;
    activity_name?: string;
    work_date?: string;
    hours?: number;
    task_description?: string;
    outcome?: string;
  }>;
  missing_fields?: string[];
}

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost/webhook/api/v1';
const DEV_USER = import.meta.env.VITE_DEV_USER || 'dev1@example.com';

export async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  // Dev mode header fallback
  if (import.meta.env.DEV || import.meta.env.VITE_ENV === 'local') {
    headers['X-Dev-User'] = DEV_USER;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error?.message || `HTTP error ${response.status}`);
  }

  return response.json();
}

export const api = {
  getMe: () => fetchApi<UserProfile>('/me'),
  sendMessage: (message: string, clientMessageId: string) =>
    fetchApi<EngineResponse>('/ai/message', {
      method: 'POST',
      body: JSON.stringify({ message, client_message_id: clientMessageId }),
    }),
  confirmLog: (clientMessageId: string) =>
    fetchApi<EngineResponse>('/ai/message', {
      method: 'POST',
      body: JSON.stringify({ action: 'confirm', client_message_id: clientMessageId }),
    }),
  cancelLog: (clientMessageId: string) =>
    fetchApi<EngineResponse>('/ai/message', {
      method: 'POST',
      body: JSON.stringify({ action: 'cancel', client_message_id: clientMessageId }),
    }),
  getNotifications: () => fetchApi<any[]>('/notifications'),
};
