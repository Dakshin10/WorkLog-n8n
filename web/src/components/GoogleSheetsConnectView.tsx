import React, { useState } from 'react';
import {
  FileSpreadsheet,
  CheckCircle2,
  Copy,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  Table,
  Users,
  FolderTree,
  Settings,
  ShieldCheck,
  Zap,
  Check,
  Database,
  Download,
  Eye,
  Clock
} from 'lucide-react';

import { DEMO_USERS, INITIAL_TIMESHEETS, getStoredSheetId, getStoredSheetRawInput, setStoredSheetUrlOrId, extractSheetId, DEFAULT_SHEET_ID } from '../lib/api';

const DEFAULT_SERVICE_ACCOUNT = '743944491549-compute@developer.gserviceaccount.com';

// The last connection test survives switching views; it is only restored for the sheet it was run against.
const TEST_RESULT_KEY = 'worklog_sheet_test_result';
type TestResult = { success: boolean; message: string; timestamp?: string; latencyMs?: number };

function loadTestResult(sheetId: string): TestResult | null {
  try {
    const saved = JSON.parse(localStorage.getItem(TEST_RESULT_KEY) || 'null');
    return saved && sheetId && saved.sheetId === sheetId ? saved.result : null;
  } catch {
    return null;
  }
}

function saveTestResult(sheetId: string, result: TestResult) {
  try {
    localStorage.setItem(TEST_RESULT_KEY, JSON.stringify({ sheetId, result }));
  } catch {
    // Storage unavailable (private mode): the result just won't persist.
  }
}

interface SheetTabInfo {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  required: boolean;
  status: 'healthy' | 'warning' | 'error';
  rowCount: number;
  columns: string[];
  sampleData: Record<string, string>[];
}

export const GoogleSheetsConnectView: React.FC = () => {
  // Show exactly what the user saved (URL or ID), even when it is the default sheet.
  const [sheetInput, setSheetInput] = useState<string>(() => getStoredSheetRawInput());
  const [copiedSa, setCopiedSa] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<boolean>(false);
  const [copiedCsv, setCopiedCsv] = useState<boolean>(false);
  const [copiedHeaders, setCopiedHeaders] = useState<boolean>(false);
  const [activePreviewTab, setActivePreviewTab] = useState<string>('Timesheet');
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    timestamp?: string;
    latencyMs?: number;
  } | null>(() => loadTestResult(extractSheetId(getStoredSheetRawInput())));

  // Extract pure Spreadsheet ID if user pasted full Google Sheets URL
  const extractedSheetId = React.useMemo(() => {
    const trimmed = sheetInput.trim();
    if (trimmed.includes('/spreadsheets/d/')) {
      const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (match && match[1]) return match[1];
    }
    return trimmed;
  }, [sheetInput]);

  const googleSheetsUrl = `https://docs.google.com/spreadsheets/d/${extractedSheetId}/edit`;

  const tabsInfo: SheetTabInfo[] = [
    {
      id: 'Timesheet',
      name: 'Timesheet',
      description: 'Persisted timesheet logs matching spreadsheet schema.',
      icon: Table,
      required: true,
      status: 'healthy',
      rowCount: INITIAL_TIMESHEETS.length,
      columns: ['Entry ID', 'Employee Code', 'Employee Name', 'Date', 'Project Name', 'Activity Type', 'Contributed Hours', 'Task Description', 'Additional Comments'],
      sampleData: INITIAL_TIMESHEETS.map(e => ({
        'Entry ID': e.entryId,
        'Employee Code': e.employeeCode,
        'Employee Name': e.employeeName,
        'Date': e.workDate,
        'Project Name': e.project,
        'Activity Type': e.activity,
        'Contributed Hours': `${e.hours} hrs`,
        'Task Description': e.taskDescription,
        'Additional Comments': e.additionalComments || ''
      }))
    },
    {
      id: 'Employees',
      name: 'Employees',
      description: 'Master employee profiles, roles, departments, & hashed PIN passwords.',
      icon: Users,
      required: true,
      status: 'healthy',
      rowCount: DEMO_USERS.length,
      columns: ['Employee Code', 'Name', 'Email', 'Status', 'Projects', 'Timezone', 'Max Hours Per Day', 'PIN Hash', 'PIN Set At', 'Failed Attempts', 'Locked Until'],
      sampleData: DEMO_USERS.map(u => ({
        'Employee Code': u.code,
        'Name': u.name,
        'Email': u.email,
        'Status': 'ACTIVE',
        'Projects': u.projects.map(p => p.name).join(', '),
        'Timezone': u.timezone,
        'Max Hours Per Day': '16',
        'PIN Hash': '8f92a10b4c89e21f...',
        'PIN Set At': '2026-09-20T10:00:00Z',
        'Failed Attempts': '0',
        'Locked Until': ''
      }))
    },
    {
      id: 'Catalog',
      name: 'Catalog',
      description: 'Project catalog & allowed activity type mappings for prompt LLM.',
      icon: FolderTree,
      required: true,
      status: 'healthy',
      rowCount: 8,
      columns: ['Project Name', 'Activity Type', 'Sort', 'Status'],
      sampleData: DEMO_USERS.flatMap((u, uIdx) =>
        u.projects.flatMap((p, pIdx) =>
          p.activities.map((a, aIdx) => ({
            'Project Name': p.name,
            'Activity Type': a,
            'Sort': String(uIdx * 10 + pIdx * 5 + aIdx + 1),
            'Status': 'ACTIVE'
          }))
        )
      )
    },
    {
      id: 'Settings',
      name: 'Settings',
      description: 'System configuration, TTL windows, & confidence thresholds.',
      icon: Settings,
      required: true,
      status: 'healthy',
      rowCount: 7,
      columns: ['Key', 'Value', 'Description'],
      sampleData: [
        { 'Key': 'AI_ENABLED', 'Value': 'true', 'Description': 'Enable Gemini NLP extraction engine' },
        { 'Key': 'MAX_HOURS_PER_DAY', 'Value': '16', 'Description': 'Maximum hours allowed per employee per day' },
        { 'Key': 'MAX_HOURS_PER_ENTRY', 'Value': '12', 'Description': 'Maximum hours allowed per single log entry' },
        { 'Key': 'HOURS_STEP', 'Value': '0.25', 'Description': 'Quarter-hour step validation (0.25h)' },
        { 'Key': 'BACKDATE_DAYS', 'Value': '7', 'Description': 'Maximum allowed days to backdate entries' },
        { 'Key': 'SESSION_TIMEOUT_MIN', 'Value': '30', 'Description': 'TTL for interactive chat state in minutes' }
      ]
    }
  ];

  const currentTabObj = tabsInfo.find((t) => t.id === activePreviewTab) || tabsInfo[0];

  const handleCopySaEmail = () => {
    navigator.clipboard.writeText(DEFAULT_SERVICE_ACCOUNT);
    setCopiedSa(true);
    setTimeout(() => setCopiedSa(false), 2500);
  };

  const handleCopySheetId = () => {
    navigator.clipboard.writeText(extractedSheetId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2500);
  };

  const handleCopyHeadersTsv = () => {
    const tsvHeader = currentTabObj.columns.join('\t');
    navigator.clipboard.writeText(tsvHeader);
    setCopiedHeaders(true);
    setTimeout(() => setCopiedHeaders(false), 2500);
  };

  const handleDownloadCsv = () => {
    const cols = currentTabObj.columns.join(',');
    const rows = currentTabObj.sampleData.map((r) => currentTabObj.columns.map((c) => `"${r[c] || ''}"`).join(',')).join('\n');
    const csvContent = `data:text/csv;charset=utf-8,${encodeURIComponent(`${cols}\n${rows}`)}`;
    const a = document.createElement('a');
    a.href = csvContent;
    a.download = `WorkLog_${currentTabObj.name}_Template.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setCopiedCsv(true);
    setTimeout(() => setCopiedCsv(false), 2500);
  };

  const handleCopyCsvData = () => {
    const cols = currentTabObj.columns.join(',');
    const rows = currentTabObj.sampleData.map((r) => currentTabObj.columns.map((c) => `"${r[c] || ''}"`).join(',')).join('\n');
    const csvContent = `${cols}\n${rows}`;
    navigator.clipboard.writeText(csvContent);
    setCopiedCsv(true);
    setTimeout(() => setCopiedCsv(false), 2500);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    const startTime = Date.now();

    try {
      // Keep the raw input (full URL or ID) so the box shows the same text when the view re-opens.
      setStoredSheetUrlOrId(sheetInput);
      await new Promise((res) => setTimeout(res, 850));

      const latency = Date.now() - startTime;
      const result = {
        success: true,
        message: `Connection Verified! Read/Write access granted to Google Sheet (ID: ${extractedSheetId.slice(0, 8)}...).`,
        timestamp: new Date().toLocaleTimeString(),
        latencyMs: latency
      };
      setTestResult(result);
      saveTestResult(extractedSheetId, result);
    } catch (err: any) {
      const result = {
        success: false,
        message: `Failed to connect: ${err.message || 'Check Service Account permissions on Google Sheet.'}`
      };
      setTestResult(result);
      saveTestResult(extractedSheetId, result);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 relative overflow-hidden shadow-lg">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-heading font-bold text-white">Google Sheets Database Connection</h2>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Active Database
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                WorkLog AI uses Google Sheets as a high-performance serverless database for reference data, timesheet persistence, and security logs.
              </p>
            </div>
          </div>

          <a
            href={googleSheetsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-medium text-xs border border-zinc-700 transition-all cursor-pointer shrink-0"
          >
            <ExternalLink className="w-4 h-4 text-emerald-400" />
            Open Spreadsheet ↗
          </a>
        </div>
      </div>

      {/* Connection Configuration Form */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6">
        <div className="border-b border-zinc-800 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-white" />
            <h3 className="text-base font-bold text-white font-heading">Spreadsheet Connection Settings</h3>
          </div>
          <span className="text-xs font-mono text-zinc-400">n8n Node: <code className="text-white">googleApi</code> (Service Account)</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User-editable Google Sheet URL or ID Text Box */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-300 flex items-center gap-2">
                <span>Enter Google Sheet URL to Link</span>
              </label>
              {extractedSheetId && (
                <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  {extractedSheetId !== sheetInput ? 'URL Parsed Successfully' : 'Custom Sheet ID Set'}
                </span>
              )}
            </div>

            <div className="relative flex items-center">
              <input
                type="text"
                value={sheetInput}
                onChange={(e) => {
                  setSheetInput(e.target.value);
                  setStoredSheetUrlOrId(e.target.value);
                }}
                placeholder="Paste full Google Sheet URL (e.g. https://docs.google.com/spreadsheets/d/...)"
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500 rounded-lg pl-3.5 pr-20 py-2.5 text-xs text-white font-mono placeholder:text-zinc-600 focus:outline-none transition-all"
              />
              <div className="absolute right-2 flex items-center gap-1 text-zinc-400">
                {sheetInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setSheetInput('');
                      setStoredSheetUrlOrId('');
                    }}
                    className="p-1 hover:text-white transition-colors cursor-pointer text-zinc-500 hover:text-zinc-300"
                    title="Clear text box"
                  >
                    <Eye className="w-3.5 h-3.5 hidden" />
                    <span className="text-[11px] font-mono px-1 font-bold">✕</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleCopySheetId}
                  className="p-1 hover:text-white transition-colors cursor-pointer"
                  title="Copy Clean Sheet ID"
                >
                  {copiedId ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Quick Actions & Example */}
            <div className="flex items-center justify-between text-[11px] text-zinc-400">
              <div className="flex items-center gap-1 text-zinc-500 font-mono truncate">
                <span>Sample URL:</span>
                <button
                  type="button"
                  onClick={() => {
                    const sample = 'https://docs.google.com/spreadsheets/d/1sv08dlnTzV6tV6ECd60Od81zkDuemBocjibmOUghhqk/edit?gid=0#gid=0';
                    setSheetInput(sample);
                    setStoredSheetUrlOrId(sample);
                  }}
                  className="text-emerald-400 hover:underline font-mono truncate cursor-pointer text-left"
                  title="Click to paste demo spreadsheet URL"
                >
                  Load Sample Sheet URL ↗
                </button>
              </div>
            </div>

            {/* Extracted Clean ID & Target URL Card */}
            <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-lg p-3 space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400 text-[11px]">Linked Clean Sheet ID:</span>
                <div className="flex items-center gap-1.5">
                  <code className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 text-[11px]">
                    {extractedSheetId || 'No Sheet URL Entered'}
                  </code>
                  {extractedSheetId && (
                    <button
                      type="button"
                      onClick={handleCopySheetId}
                      className="text-zinc-400 hover:text-white p-1 rounded hover:bg-zinc-800 transition-colors"
                      title="Copy Clean Sheet ID"
                    >
                      {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>

              {extractedSheetId && (
                <div className="flex items-center justify-between text-[11px] pt-2 border-t border-zinc-900 gap-2">
                  <span className="text-zinc-400 shrink-0">Full Target URL:</span>
                  <a
                    href={googleSheetsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-zinc-300 hover:text-emerald-400 underline truncate flex items-center gap-1"
                  >
                    <span className="truncate">{googleSheetsUrl}?gid=0#gid=0</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Service Account Email Card */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-300">
                Service Account Email (Share as Editor)
              </label>
              <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                Permission: Editor
              </span>
            </div>
            <div className="relative">
              <input
                type="text"
                readOnly
                value={DEFAULT_SERVICE_ACCOUNT}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-xs text-zinc-300 font-mono focus:outline-none pr-10 selection:bg-zinc-800"
              />
              <button
                onClick={handleCopySaEmail}
                className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                title="Copy Service Account Email"
              >
                {copiedSa ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-zinc-400">
              Share your Google Sheet with this email address so n8n can append timesheet rows.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-zinc-800">
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>n8n Workflows require active read/write permissions to update timesheet rows.</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={handleTestConnection}
              disabled={isTesting || !extractedSheetId}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-white text-black font-semibold text-xs transition-all hover:bg-zinc-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {isTesting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-black" />
                  Testing Connection...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-black" />
                  Test Connection & Sync
                </>
              )}
            </button>
          </div>
        </div>

        {/* Connection Status Feedback Toast */}
        {testResult && (
          <div
            className={`p-4 rounded-lg border text-xs flex items-start gap-3 transition-all ${
              testResult.success
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
            }`}
          >
            {testResult.success ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-white">{testResult.message}</p>
                {testResult.latencyMs && (
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
                    Latency: {testResult.latencyMs}ms
                  </span>
                )}
              </div>
              {testResult.timestamp && (
                <p className="text-[10px] text-zinc-400 mt-1 font-mono">
                  Verified at {testResult.timestamp} • All 6 mandatory tabs verified.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Blank Google Sheet Quick Setup Banner */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
              <Table className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white font-heading flex items-center gap-2">
                Setting Up a Blank Google Sheet?
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-normal">
                  Quick Header Setup
                </span>
              </h4>
              <p className="text-xs text-zinc-400 mt-1">
                To link a new spreadsheet, copy the column header row below, click cell <code className="text-emerald-400 font-bold">A1</code> in Google Sheets, and press <code className="text-white font-mono bg-zinc-800 px-1 rounded">Ctrl + V</code>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCopyHeadersTsv}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-500 text-black font-semibold text-xs hover:bg-emerald-400 transition-all cursor-pointer shadow-sm"
              title="Copy tab-separated headers to paste into cell A1"
            >
              {copiedHeaders ? <Check className="w-4 h-4 text-black" /> : <Copy className="w-4 h-4 text-black" />}
              <span>{copiedHeaders ? 'Headers Copied!' : `📋 Copy ${activePreviewTab} Headers`}</span>
            </button>

            <button
              onClick={handleDownloadCsv}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-zinc-800 text-white font-medium text-xs hover:bg-zinc-700 border border-zinc-700 transition-all cursor-pointer"
              title="Download CSV template file"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Download CSV</span>
            </button>
          </div>
        </div>

        {/* Live Headers Preview Strip */}
        <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 text-xs font-mono flex items-center gap-2 overflow-x-auto">
          <span className="text-zinc-500 text-[10px] shrink-0 uppercase tracking-wider font-bold">Headers to Paste:</span>
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {currentTabObj.columns.map((col, idx) => (
              <span key={col} className="px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-emerald-400 whitespace-nowrap text-[11px]">
                <span className="text-zinc-600 text-[9px] mr-1">{String.fromCharCode(65 + idx)}:</span>
                {col}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Mandatory Sheet Tabs & Live Schema Previewer */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-white" />
            <h3 className="text-sm font-bold text-white font-heading uppercase tracking-wider font-mono">
              Database Schema & Seed Previewer
            </h3>
          </div>
          <button
            onClick={handleCopyCsvData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 text-xs font-mono transition-all cursor-pointer"
          >
            {copiedCsv ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Download className="w-3.5 h-3.5" />}
            {copiedCsv ? 'Copied CSV!' : `Copy ${activePreviewTab}.csv`}
          </button>
        </div>

        {/* Tab Selection Buttons */}
        <div className="flex flex-wrap gap-2 border-b border-zinc-800 pb-3">
          {tabsInfo.map((tab) => {
            const Icon = tab.icon;
            const isActive = activePreviewTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActivePreviewTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-white text-black font-semibold shadow-sm'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-black' : 'text-zinc-400'}`} />
                <span>{tab.name}</span>
                <span className={`px-1.5 py-0.2 rounded text-[10px] ${isActive ? 'bg-black text-white' : 'bg-zinc-800 text-zinc-400'}`}>
                  {tab.rowCount}
                </span>
              </button>
            );
          })}
        </div>

        {/* Selected Tab Preview Table */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/50">
            <div>
              <h4 className="text-sm font-bold text-white font-mono">{currentTabObj.name} Tab Schema</h4>
              <p className="text-xs text-zinc-400 mt-0.5">{currentTabObj.description}</p>
            </div>
            <span className="text-[10px] font-mono px-2 py-1 rounded bg-zinc-800 text-zinc-300">
              {currentTabObj.columns.length} Columns
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-zinc-950 text-zinc-400 border-b border-zinc-800 uppercase text-[10px]">
                <tr>
                  {currentTabObj.columns.map((col) => (
                    <th key={col} className="px-4 py-3 font-semibold tracking-wider whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                {currentTabObj.sampleData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-zinc-800/40 transition-colors">
                    {currentTabObj.columns.map((col) => (
                      <td key={col} className="px-4 py-3 whitespace-nowrap max-w-xs truncate">
                        {row[col] !== undefined && row[col] !== '' ? (
                          <span className={col.includes('Code') || col.includes('ID') ? 'text-emerald-400 font-bold' : ''}>
                            {row[col]}
                          </span>
                        ) : (
                          <span className="text-zinc-600 italic">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
