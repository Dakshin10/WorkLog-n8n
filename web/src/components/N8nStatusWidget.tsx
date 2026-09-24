import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Server, RefreshCw } from 'lucide-react';

export const N8nStatusWidget: React.FC = () => {
  const [status, setStatus] = useState<{ connected: boolean; url: string; checking: boolean }>({
    connected: false,
    url: 'http://localhost:5678',
    checking: true,
  });

  const checkStatus = async () => {
    setStatus((prev) => ({ ...prev, checking: true }));
    const health = await api.checkHealth();
    setStatus({ connected: health.connected, url: health.url, checking: false });
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-2.5 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 shadow-sm">
      <Server className="w-3.5 h-3.5 text-zinc-400" />
      <span className="text-xs text-zinc-400 font-mono">n8n Engine:</span>

      <div className="flex items-center gap-1.5">
        <span
          className={`w-2 h-2 rounded-full ${
            status.connected ? 'bg-white' : 'bg-zinc-500'
          }`}
        ></span>
        <span
          className={`text-xs font-mono font-medium ${
            status.connected ? 'text-white' : 'text-zinc-400'
          }`}
        >
          {status.connected ? 'Localhost :5678 Live' : 'Simulation Mode'}
        </span>
      </div>

      <button
        onClick={checkStatus}
        disabled={status.checking}
        className="text-zinc-400 hover:text-white p-1 rounded transition-all cursor-pointer"
        title="Refresh n8n Engine Status"
      >
        <RefreshCw className={`w-3 h-3 ${status.checking ? 'animate-spin text-white' : ''}`} />
      </button>
    </div>
  );
};
