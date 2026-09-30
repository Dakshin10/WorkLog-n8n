import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, X, Check, Copy, ExternalLink, RefreshCw, Link as LinkIcon, Database } from 'lucide-react';
import { getStoredSheetId, setStoredSheetUrlOrId, DEFAULT_SHEET_ID } from '../lib/api';

const SERVICE_ACCOUNT = '743944491549-compute@developer.gserviceaccount.com';

interface GoogleSheetUrlModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUrlUpdated?: (newUrl: string) => void;
}

export const GoogleSheetUrlModal: React.FC<GoogleSheetUrlModalProps> = ({
  isOpen,
  onClose,
  onUrlUpdated,
}) => {
  const [sheetInput, setSheetInput] = useState<string>('');
  const [copiedSa, setCopiedSa] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      const stored = localStorage.getItem('worklog_sheet_url_id') || '';
      setSheetInput(stored === DEFAULT_SHEET_ID ? '' : stored);
      setSavedSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const extractedId = React.useMemo(() => {
    const trimmed = sheetInput.trim();
    if (trimmed.includes('/spreadsheets/d/')) {
      const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (match && match[1]) return match[1];
    }
    return trimmed;
  }, [sheetInput]);

  const previewUrl = `https://docs.google.com/spreadsheets/d/${extractedId || DEFAULT_SHEET_ID}/edit?usp=sharing`;

  const handleCopySa = () => {
    navigator.clipboard.writeText(SERVICE_ACCOUNT);
    setCopiedSa(true);
    setTimeout(() => setCopiedSa(false), 2000);
  };

  const handleSave = () => {
    const savedId = setStoredSheetUrlOrId(sheetInput);
    const finalUrl = `https://docs.google.com/spreadsheets/d/${savedId}/edit?usp=sharing`;
    setSavedSuccess(true);
    if (onUrlUpdated) onUrlUpdated(finalUrl);
    setTimeout(() => {
      onClose();
    }, 600);
  };

  const handleSaveAndOpen = () => {
    const savedId = setStoredSheetUrlOrId(sheetInput);
    const finalUrl = `https://docs.google.com/spreadsheets/d/${savedId}/edit?usp=sharing`;
    if (onUrlUpdated) onUrlUpdated(finalUrl);
    window.open(finalUrl, '_blank');
    onClose();
  };

  const handleResetDefault = () => {
    setSheetInput(DEFAULT_SHEET_ID);
    setStoredSheetUrlOrId(DEFAULT_SHEET_ID);
    if (onUrlUpdated) {
      onUrlUpdated(`https://docs.google.com/spreadsheets/d/${DEFAULT_SHEET_ID}/edit?usp=sharing`);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-5 text-white relative">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold font-heading text-white">Google Sheet Link</h3>
              <p className="text-xs text-zinc-400">Configure or paste your custom Google Sheet link</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Controls */}
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1.5 flex items-center justify-between">
              <span>Google Sheet URL or ID</span>
              {extractedId && extractedId !== sheetInput && (
                <span className="text-[10px] text-emerald-400 font-mono">ID Extracted Cleanly</span>
              )}
            </label>
            <div className="relative">
              <div className="absolute left-3 top-3 text-zinc-500 pointer-events-none">
                <LinkIcon className="w-4 h-4" />
              </div>
              <input
                type="text"
                autoFocus
                value={sheetInput}
                onChange={(e) => setSheetInput(e.target.value)}
                placeholder="Paste Google Sheet URL (e.g. https://docs.google.com/spreadsheets/d/...)"
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500 rounded-lg pl-9 pr-3 py-2.5 text-xs text-white font-mono placeholder:text-zinc-600 focus:outline-none transition-all"
              />
            </div>
          </div>

          {/* Clean ID & Preview Link */}
          <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-lg p-3 text-xs space-y-1.5 font-mono">
            <div className="flex items-center justify-between text-zinc-400">
              <span>Extracted Sheet ID:</span>
              <span className="text-emerald-400 font-bold">{extractedId || '—'}</span>
            </div>
            <div className="flex items-center justify-between text-zinc-400 text-[11px] truncate pt-1 border-t border-zinc-900">
              <span className="shrink-0 mr-2">Target Link:</span>
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-300 hover:text-white underline truncate"
              >
                {previewUrl}
              </a>
            </div>
          </div>

          {/* Service Account Sharing Notice */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-zinc-300">n8n Service Account Email (Editor Access)</span>
              <button
                onClick={handleCopySa}
                className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer font-mono"
              >
                {copiedSa ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copiedSa ? 'Copied!' : 'Copy Email'}
              </button>
            </div>
            <p className="text-[11px] font-mono text-zinc-400 select-all bg-zinc-900 px-2.5 py-1.5 rounded border border-zinc-800">
              {SERVICE_ACCOUNT}
            </p>
          </div>
        </div>

        {/* Feedback Banner */}
        {savedSuccess && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-xs flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>Google Sheet link updated and saved successfully!</span>
          </div>
        )}

        {/* Actions Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-800 gap-3">
          <button
            onClick={handleResetDefault}
            className="text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer font-mono underline"
          >
            Reset to Default
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-medium text-xs border border-zinc-700 transition-all cursor-pointer"
            >
              Save Link
            </button>
            <button
              onClick={handleSaveAndOpen}
              className="px-4 py-2 rounded-lg bg-white hover:bg-zinc-200 text-black font-semibold text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Save & Open ↗
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
