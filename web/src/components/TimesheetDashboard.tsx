import React, { useState } from 'react';
import { TimesheetEntry, UserProfile, TIMESHEET_COLUMN_DEFS } from '../types';
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

  // Dynamic project & activity options derived directly from currentUser profile
  const availableProjects = currentUser.projects && currentUser.projects.length > 0
    ? currentUser.projects
    : [{ id: 'default', code: 'PRJ-GEN', name: 'General Work', activities: ['General Operations', 'Documentation', 'Meeting'] }];

  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10));
  const [newProject, setNewProject] = useState<string>(() => availableProjects[0]?.name || '');

  const currentProjObj = availableProjects.find(p => p.name === newProject) || availableProjects[0];
  const availableActivities = currentProjObj?.activities || [];
  const [newActivity, setNewActivity] = useState<string>(() => availableActivities[0] || '');
  const [newHours, setNewHours] = useState('4.0');
  const [newDesc, setNewDesc] = useState('');
  const [newComments, setNewComments] = useState('');

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

  // Dynamic CSV Export using column definitions schema
  const handleExportCsv = () => {
    const headers = TIMESHEET_COLUMN_DEFS.map(col => col.label);
    const rows = entries.map(e =>
      TIMESHEET_COLUMN_DEFS.map(col => {
        const val = e[col.key] ?? '';
        const strVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
        return `"${strVal.replace(/"/g, '""')}"`;
      })
    );

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
      activity: newActivity || 'General Operations',
      hours: parseFloat(newHours) || 4.0,
      taskDescription: newDesc || 'Manual timesheet entry',
      additionalComments: newComments || '',
      status: 'LOGGED',
      createdAt: new Date().toISOString(),
      verifiedAt: new Date().toISOString()
    };
    onAddEntry(entry);
    setShowAddModal(false);
    setNewDesc('');
    setNewComments('');
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

      {/* Dynamic Timesheet Data Table generated from TIMESHEET_COLUMN_DEFS */}
      <div className="bg-zinc-950 rounded-lg border border-zinc-800 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <h3 className="text-sm font-heading font-bold text-white flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-white" /> Mon–Sun Timesheet Stream
          </h3>
          <span className="text-xs text-zinc-400 font-mono">
            Showing {filteredEntries.length} of {entries.length} entries
          </span>
        </div>

        <div className="overflow-x-auto border-t border-zinc-800">
          <table className="w-full text-left text-xs border-collapse">
            {/* Dynamic Headers from TIMESHEET_COLUMN_DEFS */}
            <thead className="bg-black text-white font-bold text-xs tracking-wide border-b border-zinc-800">
              <tr>
                {TIMESHEET_COLUMN_DEFS.map((col, idx) => (
                  <th
                    key={String(col.key)}
                    className={`px-4 py-3 border-zinc-800/60 whitespace-nowrap ${
                      idx < TIMESHEET_COLUMN_DEFS.length - 1 ? 'border-r' : ''
                    }`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>

            {/* Dynamic Data Rows from TIMESHEET_COLUMN_DEFS */}
            <tbody className="divide-y divide-zinc-800/60 font-sans text-slate-200">
              {filteredEntries.map((e) => (
                <tr key={e.entryId} className="hover:bg-zinc-900/60 transition-colors">
                  {TIMESHEET_COLUMN_DEFS.map((col, idx) => {
                    const rawVal = e[col.key];
                    const isLast = idx === TIMESHEET_COLUMN_DEFS.length - 1;
                    const cellBorder = isLast ? '' : 'border-r border-zinc-800/60';

                    if (col.key === 'entryId') {
                      return (
                        <td key={col.key} className={`px-4 py-3 font-mono text-[11px] text-white font-semibold whitespace-nowrap ${cellBorder}`}>
                          {rawVal ? String(rawVal) : ''}
                        </td>
                      );
                    }
                    if (col.key === 'employeeCode' || col.key === 'workDate') {
                      return (
                        <td key={col.key} className={`px-4 py-3 font-mono text-zinc-300 whitespace-nowrap ${cellBorder}`}>
                          {rawVal ? String(rawVal) : ''}
                        </td>
                      );
                    }
                    if (col.key === 'employeeName' || col.key === 'project') {
                      return (
                        <td key={col.key} className={`px-4 py-3 text-white font-semibold whitespace-nowrap ${cellBorder}`}>
                          {rawVal ? String(rawVal) : ''}
                        </td>
                      );
                    }
                    if (col.key === 'activity') {
                      return (
                        <td key={col.key} className={`px-4 py-3 text-emerald-400 font-medium whitespace-nowrap ${cellBorder}`}>
                          {rawVal ? String(rawVal) : ''}
                        </td>
                      );
                    }
                    if (col.key === 'hours') {
                      return (
                        <td key={col.key} className={`px-4 py-3 font-mono font-bold text-white text-xs whitespace-nowrap ${cellBorder}`}>
                          {rawVal && Number(rawVal) > 0 ? `${rawVal} hrs` : ''}
                        </td>
                      );
                    }
                    if (col.key === 'taskDescription' || col.key === 'additionalComments') {
                      return (
                        <td key={col.key} className={`px-4 py-3 max-w-xs text-zinc-300 ${cellBorder}`}>
                          <p className="line-clamp-2">{rawVal ? String(rawVal) : ''}</p>
                        </td>
                      );
                    }
                    return (
                      <td key={col.key} className={`px-4 py-3 text-zinc-300 ${cellBorder}`}>
                        {rawVal ? String(rawVal) : ''}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dynamic Add Entry Modal driven by user profile projects catalog */}
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
              <label className="text-xs text-zinc-400 block mb-1">Project Name</label>
              <select
                value={newProject}
                onChange={(e) => {
                  const selectedName = e.target.value;
                  setNewProject(selectedName);
                  const projObj = availableProjects.find(p => p.name === selectedName);
                  if (projObj && projObj.activities.length > 0) {
                    setNewActivity(projObj.activities[0]);
                  } else {
                    setNewActivity('');
                  }
                }}
                className="w-full bg-black border border-zinc-800 text-white px-3 py-2 rounded text-xs focus:outline-none focus:border-white cursor-pointer font-medium"
              >
                {availableProjects.map((p) => (
                  <option key={p.id || p.code || p.name} value={p.name}>
                    {p.name} ({p.code || 'PRJ'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-zinc-400 block mb-1">Activity Type</label>
              {availableActivities.length > 0 ? (
                <select
                  value={newActivity}
                  onChange={(e) => setNewActivity(e.target.value)}
                  className="w-full bg-black border border-zinc-800 text-white px-3 py-2 rounded text-xs focus:outline-none focus:border-white cursor-pointer font-medium"
                >
                  {availableActivities.map((act) => (
                    <option key={act} value={act}>
                      {act}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={newActivity}
                  onChange={(e) => setNewActivity(e.target.value)}
                  placeholder="Enter activity type..."
                  className="w-full bg-black border border-zinc-800 text-white px-3 py-2 rounded text-xs focus:outline-none focus:border-white"
                  required
                />
              )}
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

            <div>
              <label className="text-xs text-zinc-400 block mb-1">Additional Comments (Optional)</label>
              <input
                type="text"
                value={newComments}
                onChange={(e) => setNewComments(e.target.value)}
                placeholder="Optional notes or comments..."
                className="w-full bg-black border border-zinc-800 text-white px-3 py-2 rounded text-xs focus:outline-none focus:border-white"
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
                className="flex-1 py-2 rounded bg-white text-black text-xs font-semibold transition-all cursor-pointer shadow-sm"
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
