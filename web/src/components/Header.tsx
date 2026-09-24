import React, { useState } from 'react';
import { UserProfile } from '../types';
import { DEMO_USERS } from '../lib/api';
import { N8nStatusWidget } from './N8nStatusWidget';
import { UserCheck, Shield, Bell, Key, X } from 'lucide-react';

interface HeaderProps {
  currentUser: UserProfile;
  onUserSelect: (user: UserProfile) => void;
  unreadCount: number;
  onOpenNotifications: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onUserSelect,
  unreadCount,
  onOpenNotifications
}) => {
  const [showCredsModal, setShowCredsModal] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-[#09090b] border-b border-zinc-800 px-6 py-3.5 flex items-center justify-between shadow-sm">
      {/* Brand logo & tagline */}
      <div className="flex items-center gap-4">
        <div className="w-9 h-9 rounded-lg bg-white text-black flex items-center justify-center font-heading font-black text-xl shadow-sm">
          W
        </div>

        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-heading font-bold text-white tracking-tight">
              WorkLog AI
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium uppercase bg-zinc-800 text-zinc-300 border border-zinc-700">
              Production 2.0
            </span>
          </div>
          <p className="text-xs text-zinc-400 hidden sm:block">
            Autonomous Work Logging • n8n Orchestrator Engine
          </p>
        </div>
      </div>

      {/* Center n8n Status ping */}
      <div className="hidden lg:flex items-center">
        <N8nStatusWidget />
      </div>

      {/* User profile dropdown switcher & notifications */}
      <div className="flex items-center gap-3">
        {/* Demo Credentials Modal Button */}
        <button
          onClick={() => setShowCredsModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 text-xs font-mono transition-all cursor-pointer"
          title="View Demo Credentials"
        >
          <Key className="w-3.5 h-3.5 text-white" /> Demo Credentials
        </button>

        {/* Notification Bell */}
        <button
          onClick={onOpenNotifications}
          className="relative p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-all cursor-pointer"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-white text-black text-[10px] font-bold flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>

        {/* User Switcher */}
        <div className="relative flex items-center gap-2.5 bg-zinc-900 border border-zinc-800 rounded-lg p-1.5 px-3">
          <div className="w-7 h-7 rounded bg-zinc-800 text-white flex items-center justify-center font-bold text-xs">
            {currentUser.role === 'HR_ADMIN' ? <Shield className="w-3.5 h-3.5 text-zinc-300" /> : <UserCheck className="w-3.5 h-3.5 text-zinc-300" />}
          </div>

          <div className="text-left hidden sm:block pr-2">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-white leading-none">{currentUser.name}</span>
              <span className="text-[10px] font-mono text-zinc-400">{currentUser.code}</span>
            </div>
            <p className="text-[10px] text-zinc-400 mt-0.5">
              {currentUser.role === 'EMPLOYEE' && 'Employee'}
              {currentUser.role === 'MANAGER' && 'Manager'}
              {currentUser.role === 'HR_ADMIN' && 'HR Admin'}
            </p>
          </div>

          <select
            value={currentUser.id}
            onChange={(e) => {
              const selected = DEMO_USERS.find(u => u.id === e.target.value);
              if (selected) onUserSelect(selected);
            }}
            className="bg-transparent text-xs text-zinc-300 focus:outline-none cursor-pointer border-l border-zinc-800 pl-2 font-medium"
            aria-label="Switch User Profile"
          >
            {DEMO_USERS.map((user) => (
              <option key={user.id} value={user.id} className="bg-zinc-900 text-white">
                {user.name} ({user.role})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Demo Credentials Modal */}
      {showCredsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-zinc-950 max-w-md w-full p-6 rounded-lg border border-zinc-800 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-white" />
                <h3 className="text-sm font-bold text-white font-heading">Production Demo Accounts</h3>
              </div>
              <button
                onClick={() => setShowCredsModal(false)}
                className="text-zinc-500 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-400">
              Use these employee credentials to sign in directly within the interactive chat assistant:
            </p>

            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 bg-zinc-900 rounded border border-zinc-800 space-y-1">
                <div className="flex items-center justify-between text-white font-bold">
                  <span>Sarah Connor (Employee)</span>
                  <span className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded text-zinc-300">EMP-1001</span>
                </div>
                <p className="text-[11px] text-zinc-400">Employee Code: <code className="text-white">EMP-1001</code></p>
                <p className="text-[11px] text-zinc-400">PIN / Password: <code className="text-white">849201</code></p>
              </div>

              <div className="p-3 bg-zinc-900 rounded border border-zinc-800 space-y-1">
                <div className="flex items-center justify-between text-white font-bold">
                  <span>Alex Mercer (Manager)</span>
                  <span className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded text-zinc-300">EMP-1002</span>
                </div>
                <p className="text-[11px] text-zinc-400">Employee Code: <code className="text-white">EMP-1002</code></p>
                <p className="text-[11px] text-zinc-400">PIN / Password: <code className="text-white">123456</code></p>
              </div>

              <div className="p-3 bg-zinc-900 rounded border border-zinc-800 space-y-1">
                <div className="flex items-center justify-between text-white font-bold">
                  <span>Elena Rostova (HR Admin)</span>
                  <span className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded text-zinc-300">EMP-1003</span>
                </div>
                <p className="text-[11px] text-zinc-400">Employee Code: <code className="text-white">EMP-1003</code></p>
                <p className="text-[11px] text-zinc-400">PIN / Password: <code className="text-white">990011</code></p>
              </div>
            </div>

            <button
              onClick={() => setShowCredsModal(false)}
              className="w-full py-2.5 bg-white text-black font-semibold rounded text-xs transition-all cursor-pointer hover:bg-zinc-200"
            >
              Close Window
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

