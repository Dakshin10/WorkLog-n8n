import React, { useState } from 'react';
import { AuditEvent } from '../types';
import { ShieldCheck, Lock, Search, Filter, Terminal } from 'lucide-react';

interface AuditLogViewProps {
  logs: AuditEvent[];
}

export const AuditLogView: React.FC<AuditLogViewProps> = ({ logs }) => {
  const [filterEvent, setFilterEvent] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');

  const filtered = logs.filter((log) => {
    const matchesEvent = filterEvent === 'ALL' || log.event === filterEvent;
    const matchesSearch =
      log.employeeCode.toLowerCase().includes(search.toLowerCase()) ||
      log.details.toLowerCase().includes(search.toLowerCase()) ||
      log.sessionId.toLowerCase().includes(search.toLowerCase());
    return matchesEvent && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header Info Panel */}
      <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-heading font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-white" /> Security & Audit Trail
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-black text-zinc-300 border border-zinc-800">
              WF-10 Active
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Append-only audit stream. PII data and PIN secrets sanitized automatically before logging.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded bg-black border border-zinc-800 text-xs font-mono text-zinc-300 flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-white" /> Peppered HMAC-SHA256
          </div>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-800 flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Employee Code, detail or session..."
            className="w-full bg-black border border-zinc-800 text-slate-100 pl-10 pr-4 py-2 rounded text-xs focus:outline-none focus:border-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-zinc-400" />
          <select
            value={filterEvent}
            onChange={(e) => setFilterEvent(e.target.value)}
            className="bg-black border border-zinc-800 text-slate-200 text-xs px-3 py-2 rounded focus:outline-none font-medium cursor-pointer"
          >
            <option value="ALL">All Events</option>
            <option value="CONFIRMED">CONFIRMED</option>
            <option value="PIN_VERIFIED">PIN_VERIFIED</option>
            <option value="SUMMARY_SHOWN">SUMMARY_SHOWN</option>
            <option value="IDENTITY_VERIFIED">IDENTITY_VERIFIED</option>
            <option value="RATE_LIMITED">RATE_LIMITED</option>
          </select>
        </div>
      </div>

      {/* Audit table */}
      <div className="bg-zinc-950 rounded-lg border border-zinc-800 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <h3 className="text-xs font-heading font-bold text-white flex items-center gap-2">
            <Terminal className="w-4 h-4 text-white" /> Audit Log Stream
          </h3>
          <span className="text-xs font-mono text-zinc-400">
            {filtered.length} Events Logged
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-black text-zinc-400 font-mono uppercase text-[10px] tracking-wider border-b border-zinc-800">
              <tr>
                <th className="px-6 py-3">Timestamp</th>
                <th className="px-6 py-3">Employee</th>
                <th className="px-6 py-3">Event Type</th>
                <th className="px-6 py-3">Session ID</th>
                <th className="px-6 py-3">Event Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 font-sans">
              {filtered.map((log) => (
                <tr key={log.id} className="hover:bg-zinc-900/60 transition-colors">
                  <td className="px-6 py-4 font-mono text-zinc-400 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'medium' })}
                  </td>
                  <td className="px-6 py-4 font-mono text-white font-medium">
                    {log.employeeCode}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase border bg-zinc-900 text-zinc-300 border-zinc-700">
                      {log.event}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-zinc-400 text-[11px]">
                    {log.sessionId}
                  </td>
                  <td className="px-6 py-4 text-zinc-200 font-mono text-[11px]">
                    {log.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
