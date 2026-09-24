import React, { useState } from 'react';
import { api } from '../lib/api';
import { UserProfile } from '../types';
import { Key, AlertCircle, CheckCircle } from 'lucide-react';

interface PinEnrolmentModalProps {
  currentUser: UserProfile;
}

export const PinEnrolmentModal: React.FC<PinEnrolmentModalProps> = ({ currentUser }) => {
  const [employeeCode, setEmployeeCode] = useState(currentUser.code);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (newPin.length !== 6) {
      setFeedback({ type: 'error', message: 'PIN must be exactly 6 numeric digits.' });
      return;
    }
    if (newPin !== confirmPin) {
      setFeedback({ type: 'error', message: 'New PIN and Confirm PIN do not match.' });
      return;
    }

    setLoading(true);
    try {
      const res = await api.enrolPin(employeeCode, newPin, confirmPin);
      if (res.ok) {
        setFeedback({ type: 'success', message: res.message });
        setNewPin('');
        setConfirmPin('');
      } else {
        setFeedback({ type: 'error', message: res.message });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to enrol PIN.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto bg-zinc-900 p-8 rounded-lg border border-zinc-800 shadow-sm space-y-6">
      <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
        <div className="w-9 h-9 rounded bg-black text-white border border-zinc-800 flex items-center justify-center">
          <Key className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-base font-heading font-bold text-white flex items-center gap-2">
            WorkLog PIN Enrolment <span className="text-xs font-mono bg-black text-zinc-300 px-2 py-0.5 rounded border border-zinc-800">WF-13</span>
          </h2>
          <p className="text-xs text-zinc-400">
            Set or reset employee 6-digit PIN used to sign off timesheet entries via n8n.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs text-zinc-400 block mb-1">Employee Code</label>
          <input
            type="text"
            value={employeeCode}
            onChange={(e) => setEmployeeCode(e.target.value.toUpperCase())}
            placeholder="e.g. EMP-1001"
            className="w-full bg-black border border-zinc-800 text-white font-mono px-4 py-2.5 rounded text-xs focus:outline-none focus:border-white"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-zinc-400 block mb-1">New 6-Digit PIN</label>
            <input
              type="password"
              maxLength={6}
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
              placeholder="• • • • • •"
              className="w-full bg-black border border-zinc-800 text-white font-mono tracking-widest text-center px-4 py-2.5 rounded text-sm focus:outline-none focus:border-white"
              required
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400 block mb-1">Confirm PIN</label>
            <input
              type="password"
              maxLength={6}
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
              placeholder="• • • • • •"
              className="w-full bg-black border border-zinc-800 text-white font-mono tracking-widest text-center px-4 py-2.5 rounded text-sm focus:outline-none focus:border-white"
              required
            />
          </div>
        </div>

        {feedback && (
          <div className={`p-3 rounded text-xs flex items-center gap-2 border ${
            feedback.type === 'success'
              ? 'bg-zinc-950 text-white border-zinc-700'
              : 'bg-zinc-950 text-zinc-300 border-zinc-700'
          }`}>
            {feedback.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{feedback.message}</span>
          </div>
        )}

        <div className="bg-black p-4 rounded border border-zinc-800 text-[11px] text-zinc-400 space-y-1 font-mono">
          <span className="font-bold text-white block mb-1">🔒 Security Rules:</span>
          <p>• Must be exactly 6 numeric digits (e.g., `849201`).</p>
          <p>• Simple sequences (`123456`, `000000`) or Employee Code numbers are rejected.</p>
          <p>• Hashed via peppered HMAC-SHA256 in n8n; secrets are never logged in plain text.</p>
        </div>

        <button
          type="submit"
          disabled={loading || newPin.length !== 6 || confirmPin.length !== 6}
          className="w-full py-3 bg-white text-black font-semibold rounded text-xs hover:bg-zinc-200 transition-all cursor-pointer disabled:opacity-40 shadow-sm"
        >
          {loading ? 'Processing Hash...' : 'Enrol / Update WorkLog PIN'}
        </button>
      </form>
    </div>
  );
};
