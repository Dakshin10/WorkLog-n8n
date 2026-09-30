import React from 'react';
import { MessageSquare, Calendar, ShieldCheck, LogOut, FileSpreadsheet } from 'lucide-react';
import { UserRole } from '../types';

export type TabType = 'chat' | 'timesheets' | 'sheets';

interface SidebarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  userRole?: UserRole;
  logCount: number;
  onResetSession?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  logCount,
  onResetSession
}) => {
  const menuItems = [
    {
      id: 'chat' as TabType,
      label: 'AI Chat Assistant',
      icon: MessageSquare,
      badge: 'Live'
    },
    {
      id: 'timesheets' as TabType,
      label: 'My Timesheets',
      icon: Calendar,
      count: logCount
    },
    {
      id: 'sheets' as TabType,
      label: 'Google Sheet Database',
      icon: FileSpreadsheet,
      badge: 'Synced'
    }
  ];

  return (
    <aside className="w-full md:w-64 flex flex-col gap-3 shrink-0">
      <div className="px-3 py-1 text-[11px] font-bold tracking-wider text-zinc-400 uppercase font-mono">
        Navigation
      </div>

      <nav className="flex flex-col gap-1.5">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex items-center justify-between px-4 py-3 rounded-lg font-medium text-sm transition-all cursor-pointer ${
                isActive
                  ? 'bg-white text-black font-semibold shadow-sm'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-black' : 'text-zinc-400'}`} />
                <span>{item.label}</span>
              </div>

              {item.badge && (
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                  isActive ? 'bg-black text-white' : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                }`}>
                  {item.badge}
                </span>
              )}

              {item.count !== undefined && item.count > 0 && (
                <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                  isActive ? 'bg-black text-white' : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                }`}>
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Reset Session / Re-Login Button */}
      {onResetSession && (
        <button
          onClick={onResetSession}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-medium bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800 transition-all cursor-pointer mt-auto"
        >
          <LogOut className="w-3.5 h-3.5" /> Start New Login Session
        </button>
      )}
    </aside>
  );
};

