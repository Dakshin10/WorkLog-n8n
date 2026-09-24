import React, { useState } from 'react';
import { TimesheetEntry, UserProfile } from '../types';
import { Calendar as CalendarIcon, Clock, CheckCircle, Download, Plus, Filter, Search, FileText, User } from 'lucide-react';

interface TimesheetDashboardProps {
  entries: TimesheetEntry[];
  currentUser: UserProfile;
  onAddEntry: (entry: TimesheetEntry) => void;
}

export const TimesheetDashboard: React.FC<TimesheetDashboardProps> = ({
  entries,
  currentUser,
  onAddEntry
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [showAddModal, setShowAddModal] = useState(false);

  // New entry form state
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10));
  const [newProject, setNewProject] = useState('Client Portal Revamp');
  const [newActivity, setNewActivity] = useState('Frontend UI Development');
  const [newHours, setNewHours] = useState('6.5');
  const [newDesc, setNewDesc] = useState('');

  const filteredEntries = entries.filter((item) => {
    const matchesSearch =
      item.project.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.activity.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.taskDescription.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalHours = entries.reduce((sum, e) => sum + (e.status !== 'SUPERSEDED' ? e.hours : 0), 0);
  const targetHours = 40.0;
  const progressPct = Math.min(100, Math.round((totalHours / targetHours) * 100));

  const handleExportCsv = () => {
    const headers = ['Entry ID', 'Employee Code', 'Date', 'Project', 'Activity', 'Hours', 'Status', 'Description'];
    const rows = entries.map(e => [
      e.entryId,
      e.employeeCode,
      e.workDate,
      `"${e.project}"`,
      `"${e.activity}"`,
      e.hours,
      e.status,
      `"${e.taskDescription.replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `WorkLog_Timesheet_${currentUser.code}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCreateManual = (e: React.FormEvent) => {
    e.preventDefault();
    const entry: TimesheetEntry = {
      entryId: `WL-${newDate.replace(/-/g, '')}-${Math.random().toString(16).substring(2, 8).toUpperCase()}`,
      employeeCode: currentUser.code,
      employeeName: currentUser.name,
      workDate: newDate,
      project: newProject,
      activity: newActivity,
      hours: parseFloat(newHours) || 4.0,
      taskDescription: newDesc || 'Manual timesheet entry',
      status: 'LOGGED',
      createdAt: new Date().toISOString(),
      verifiedAt: new Date().toISOString()
    };
    onAddEntry(entry);
    setShowAddModal(false);
    setNewDesc('');
  };

  return (
    <div className="space-y-6">
      {/* Top Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-zinc-900 p-5 rounded-lg border border-zinc-800">
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
            <span>Total Logged Hours</span>
            <Clock className="w-4 h-4 text-white" />
          </div>
          <div className="text-2xl font-heading font-bold text-white font-mono">
            {totalHours.toFixed(1)} <span className="text-xs text-zinc-400 font-sans font-normal">/ {targetHours} hrs</span>
          </div>
          <div className="w-full bg-zinc-800 h-1 rounded-full mt-3 overflow-hidden">
            <div className="bg-white h-full rounded-full" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        <div className="bg-zinc-900 p-5 rounded-lg border border-zinc-800">
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
            <span>Compliance Score</span>
            <CheckCircle className="w-4 h-4 text-white" />
          </div>
          <div className="text-2xl font-heading font-bold text-white font-mono">
            100%
          </div>
          <p className="text-[11px] text-zinc-400 mt-2">Zero unallocated days</p>
        </div>

        <div className="bg-zinc-900 p-5 rounded-lg border border-zinc-800">
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
            <span>Approved Entries</span>
            <FileText className="w-4 h-4 text-white" />
          </div>
          <div className="text-2xl font-heading font-bold text-white font-mono">
            {entries.filter(e => e.status === 'APPROVED').length}
          </div>
          <p className="text-[11px] text-zinc-400 mt-2">Signed off by Manager</p>
        </div>

        <div className="bg-zinc-900 p-5 rounded-lg border border-zinc-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Actions</span>
            <User className="w-4 h-4 text-white" />
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex-1 py-2 px-3 bg-white text-black hover:bg-zinc-200 rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> Add Log
            </button>
            <button
              onClick={handleExportCsv}
              className="py-2 px-3 bg-zinc-950 border border-zinc-800 text-zinc-300 hover:text-white rounded text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer"
              title="Export to CSV"
            >
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-[240px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by project, activity, or description..."
              className="w-full bg-black border border-zinc-800 text-slate-100 pl-10 pr-4 py-2 rounded text-xs focus:outline-none focus:border-white"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
            <Filter className="w-3.5 h-3.5" /> Status:
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-black border border-zinc-800 text-slate-200 text-xs px-3 py-2 rounded focus:outline-none cursor-pointer font-medium"
          >
            <option value="ALL">All Statuses</option>
            <option value="LOGGED">LOGGED</option>
            <option value="APPROVED">APPROVED</option>
            <option value="SUPERSEDED">SUPERSEDED</option>
          </select>
        </div>
      </div>

      {/* Timesheet Data Table */}
      <div className="bg-zinc-950 rounded-lg border border-zinc-800 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <h3 className="text-sm font-heading font-bold text-white flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-white" /> Mon–Sun Timesheet Stream
          </h3>
          <span className="text-xs text-zinc-400 font-mono">
            Showing {filteredEntries.length} of {entries.length} entries
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-black text-zinc-400 font-mono uppercase text-[10px] tracking-wider border-b border-zinc-800">
              <tr>
                <th className="px-6 py-3">Entry ID</th>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Project & Activity</th>
                <th className="px-6 py-3">Hours</th>
                <th className="px-6 py-3">Task Description</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 font-sans">
              {filteredEntries.map((e) => (
                <tr key={e.entryId} className="hover:bg-zinc-900/60 transition-colors">
                  <td className="px-6 py-4 font-mono text-[11px] text-white font-medium">
                    {e.entryId}
                  </td>
                  <td className="px-6 py-4 font-mono text-zinc-300 whitespace-nowrap">
                    {e.workDate}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-semibold text-white">{e.project}</div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">{e.activity}</div>
                  </td>
                  <td className="px-6 py-4 font-mono font-bold text-white text-sm whitespace-nowrap">
                    {e.hours} hrs
                  </td>
                  <td className="px-6 py-4 max-w-xs text-zinc-300">
                    <p className="line-clamp-2">{e.taskDescription}</p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2.5 py-1 rounded text-[10px] font-mono font-bold tracking-wider uppercase border bg-zinc-900 text-zinc-300 border-zinc-700">
                      {e.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Entry Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <form onSubmit={handleCreateManual} className="bg-zinc-950 max-w-md w-full p-6 rounded-lg border border-zinc-800 space-y-4">
            <h3 className="text-base font-heading font-bold text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-white" /> Manual Timesheet Log
            </h3>

            <div>
              <label className="text-xs text-zinc-400 block mb-1">Date</label>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full bg-black border border-zinc-800 text-white px-3 py-2 rounded text-xs focus:outline-none focus:border-white"
                required
              />
            </div>

            <div>
              <label className="text-xs text-zinc-400 block mb-1">Project</label>
              <select
                value={newProject}
                onChange={(e) => setNewProject(e.target.value)}
                className="w-full bg-black border border-zinc-800 text-white px-3 py-2 rounded text-xs focus:outline-none focus:border-white"
              >
                <option value="Client Portal Revamp">Client Portal Revamp</option>
                <option value="Internal AI Agents Track">Internal AI Agents Track</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-zinc-400 block mb-1">Activity</label>
              <input
                type="text"
                value={newActivity}
                onChange={(e) => setNewActivity(e.target.value)}
                className="w-full bg-black border border-zinc-800 text-white px-3 py-2 rounded text-xs focus:outline-none focus:border-white"
                required
              />
            </div>

            <div>
              <label className="text-xs text-zinc-400 block mb-1">Contributed Hours</label>
              <input
                type="number"
                step="0.25"
                value={newHours}
                onChange={(e) => setNewHours(e.target.value)}
                className="w-full bg-black border border-zinc-800 text-white px-3 py-2 rounded text-xs focus:outline-none focus:border-white"
                required
              />
            </div>

            <div>
              <label className="text-xs text-zinc-400 block mb-1">Task Description</label>
              <textarea
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Describe your work..."
                rows={3}
                className="w-full bg-black border border-zinc-800 text-white px-3 py-2 rounded text-xs focus:outline-none focus:border-white"
                required
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-2 rounded border border-zinc-800 text-zinc-300 text-xs font-semibold hover:bg-zinc-900 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2 rounded bg-white text-black text-xs font-semibold transition-all cursor-pointer"
              >
                Save Entry
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
