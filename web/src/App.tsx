import React, { useState, useEffect } from 'react';
import { ChatThread } from './components/ChatThread';
import { api, UserProfile } from './lib/api';
import { Clock, Calendar, CheckSquare, Bell, User } from 'lucide-react';

export const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'logs' | 'notifications'>('chat');

  useEffect(() => {
    api.getMe()
      .then(setUser)
      .catch((err) => console.error('Error fetching user profile:', err));
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <header className="bg-slate-900 border-b border-slate-800 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-emerald-500 flex items-center justify-center font-black text-white text-lg shadow-lg">
            W
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">WorkLog AI</h1>
            <p className="text-xs text-slate-400">n8n Orchestrated Work Logging</p>
          </div>
        </div>

        {/* User profile widget */}
        {user && (
          <div className="flex items-center gap-4 bg-slate-800/80 px-4 py-2 rounded-xl border border-slate-700">
            <div className="w-8 h-8 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-xs">
              <User className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white">{user.name}</p>
              <p className="text-[10px] text-slate-400">{user.role} • {user.department}</p>
            </div>
          </div>
        )}
      </header>

      {/* Main Body */}
      <div className="flex-1 flex px-8 py-6 gap-8 max-w-7xl mx-auto w-full">
        {/* Navigation Sidebar */}
        <aside className="w-64 flex flex-col gap-2">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all cursor-pointer ${
              activeTab === 'chat'
                ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30'
                : 'text-slate-400 hover:bg-slate-900 hover:text-white'
            }`}
          >
            <Clock className="w-5 h-5" /> AI Work Log Chat
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all cursor-pointer ${
              activeTab === 'logs'
                ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30'
                : 'text-slate-400 hover:bg-slate-900 hover:text-white'
            }`}
          >
            <Calendar className="w-5 h-5" /> My Timesheets
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all cursor-pointer ${
              activeTab === 'notifications'
                ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30'
                : 'text-slate-400 hover:bg-slate-900 hover:text-white'
            }`}
          >
            <Bell className="w-5 h-5" /> Notifications
          </button>
        </aside>

        {/* Content Area */}
        <main className="flex-1">
          {activeTab === 'chat' && <ChatThread />}
          {activeTab === 'logs' && (
            <div className="bg-slate-900 p-8 rounded-xl border border-slate-800">
              <h2 className="text-xl font-bold mb-4">My Weekly Timesheets</h2>
              <p className="text-slate-400 text-sm">Mon–Sun timesheet grid with version diff history.</p>
            </div>
          )}
          {activeTab === 'notifications' && (
            <div className="bg-slate-900 p-8 rounded-xl border border-slate-800">
              <h2 className="text-xl font-bold mb-4">Notifications Center</h2>
              <p className="text-slate-400 text-sm">Approvals and edit request decision alerts.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
