import React from 'react';
import { UserProfile } from '../types';
import { N8nStatusWidget } from './N8nStatusWidget';
import { UserCheck, FileSpreadsheet, Settings } from 'lucide-react';
import { getStoredSheetUrl } from '../lib/api';

interface HeaderProps {
  currentUser?: UserProfile | null;
  onOpenSheets?: () => void;
  onConfigureSheets?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentUser, onOpenSheets, onConfigureSheets }) => {
  const handleOpenSheets = () => {
    if (onOpenSheets) {
      onOpenSheets();
    } else {
      window.open(getStoredSheetUrl(), '_blank');
    }
  };

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

      {/* Right Controls: Google Sheets + User Badge + n8n Status ping */}
      <div className="flex items-center gap-3">
        <div className="inline-flex items-center rounded-lg bg-zinc-900 border border-zinc-800 p-0.5">
          <button
            onClick={handleOpenSheets}
            className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono text-emerald-400 hover:bg-zinc-800 cursor-pointer transition-all"
            title="Open Google Sheets Database Page"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Google Sheets ↗</span>
          </button>
          {onConfigureSheets && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onConfigureSheets();
              }}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-mono text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-md transition-colors cursor-pointer border-l border-zinc-800"
              title="Configure Google Sheet Link / ID Popup"
            >
              <Settings className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[11px] hidden sm:inline">Edit Link</span>
            </button>
          )}
        </div>

        {currentUser && (
          <div className="hidden sm:flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg text-xs">
            <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-white font-medium">{currentUser.name}</span>
            <span className="text-[10px] font-mono text-zinc-400 bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800">
              {currentUser.code}
            </span>
          </div>
        )}
        <N8nStatusWidget />
      </div>
    </header>
  );
};


