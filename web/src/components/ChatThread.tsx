import React, { useState, useEffect, useRef } from 'react';
import { Send, XCircle, Lock, Mic, MicOff, Code, RefreshCw, ShieldCheck, Terminal, Eye, EyeOff, UserCheck, KeyRound, LogOut, FileSpreadsheet, Settings } from 'lucide-react';
import { api, getStoredSheetUrl } from '../lib/api';
import { UserProfile, StageName, EngineResponse } from '../types';

interface MessageItem {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
  engineResponse?: EngineResponse;
}

interface ChatThreadProps {
  currentUser?: UserProfile | null;
  onAuthSuccess?: (user: UserProfile) => void;
  onEntrySaved?: () => void;
  onResetSession?: () => void;
  onOpenSheets?: () => void;
  onConfigureSheets?: () => void;
}

// The agent ends its confirmation question with "(yes/no)"; those messages get Yes / No buttons.
const YES_NO_SUFFIX = /\s*\(yes\s*\/\s*no\)\s*$/i;
const isYesNoQuestion = (m: MessageItem) => m.sender === 'bot' && YES_NO_SUFFIX.test(m.text);

const STAGES: { key: StageName; label: string }[] = [
  { key: 'AWAIT_CODE', label: '1. Login' },
  { key: 'AWAIT_PIN', label: '2. Password' },
  { key: 'COLLECT', label: '3. Work Log' },
  { key: 'SUMMARY', label: '4. Summary' },
  { key: 'SAVED', label: '5. Saved' },
];

export const ChatThread: React.FC<ChatThreadProps> = ({ currentUser, onAuthSuccess, onEntrySaved, onResetSession, onOpenSheets, onConfigureSheets }) => {
  const [messages, setMessages] = useState<MessageItem[]>([
    {
      id: 'init-1',
      sender: 'bot',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: `Hello, welcome to the Minori Labs Timesheet Agent.\n\nPlease enter your Employee Code.`,
      engineResponse: {
        type: 'question',
        stage: 'AWAIT_CODE',
        reply: `Hello, welcome to the Minori Labs Timesheet Agent.\n\nPlease enter your Employee Code.`,
        options: []
      }
    }
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentStage, setCurrentStage] = useState<StageName>('AWAIT_CODE');
  const [showPassword, setShowPassword] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [rawDebugData, setRawDebugData] = useState<any>(null);
  // Rate limiting: the backend returns status 'rate_limited' + retryAfter (seconds).
  const [retryUntil, setRetryUntil] = useState<number>(0);
  const [retrySeconds, setRetrySeconds] = useState<number>(0);

  useEffect(() => {
    if (!retryUntil) return;
    const tick = () => {
      const left = Math.max(0, Math.ceil((retryUntil - Date.now()) / 1000));
      setRetrySeconds(left);
      if (left === 0) setRetryUntil(0);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [retryUntil]);

  // Speech simulation state
  const [isListening, setIsListening] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [currentStage]);

  const handleResetSession = () => {
    api.resetSession();
    setCurrentStage('AWAIT_CODE');
    setMessages([
      {
        id: crypto.randomUUID(),
        sender: 'bot',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `Hello, welcome to the Minori Labs Timesheet Agent.\n\nPlease enter your Employee Code.`,
        engineResponse: {
          type: 'question',
          stage: 'AWAIT_CODE',
          reply: `Hello, welcome to the Minori Labs Timesheet Agent.\n\nPlease enter your Employee Code.`,
          options: []
        }
      }
    ]);
    if (onResetSession) onResetSession();
  };

  const handleSend = async (textToSend?: string) => {
    let text = (textToSend || input).trim();
    if (text.includes('(') && text.includes(')')) {
      const match = text.match(/EMP-\d+/i);
      if (match) text = match[0];
    }

    if (!text || loading || retrySeconds > 0) return;

    const userMsgId = crypto.randomUUID();
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Mask the password in the chat bubble: "Emp Code - 500410 - Password - 199", "500410 / 199" or a bare PIN
    const maskPassword = (t: string) => {
      if (/^\d+$/.test(t)) return '• '.repeat(t.length).trim();
      const keyword = t.replace(/\b(password|passwd|pwd)(\s*(?:is\s+)?[:=\-–—]*\s*)(\S+)/i, (_m, k, sep, v) => `${k}${sep}${'•'.repeat(v.length)}`);
      if (keyword !== t) return keyword;
      return t.replace(/^(\s*[A-Za-z]*-?\d{3,}\s*[/|,]\s*)(\S+)\s*$/, (_m, head, v) => `${head}${'•'.repeat(v.length)}`);
    };
    const displayUserText = currentStage === 'AWAIT_PIN' && !showPassword ? maskPassword(text) : text;

    setMessages((prev) => [
      ...prev,
      { id: userMsgId, sender: 'user', text: displayUserText, timestamp: nowTime }
    ]);
    setInput('');
    setLoading(true);

    try {
      const activeUserCode = api.getAuthenticatedUser()?.code || currentUser?.code || '';
      const res = await api.sendMessage(text, userMsgId, activeUserCode);
      setRawDebugData(res);
      if (res.status === 'rate_limited' && res.retryAfter) {
        setRetryUntil(Date.now() + res.retryAfter * 1000);
      } else if (res.stage) {
        setCurrentStage(res.stage);
      }

      // Check if authentication just succeeded
      const authUser = api.getAuthenticatedUser();
      if (authUser && (res.stage === 'COLLECT' || res.stage === 'SUMMARY' || res.stage === 'SAVED')) {
        if (onAuthSuccess) {
          onAuthSuccess(authUser);
        }
      }

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          sender: 'bot',
          text: res.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          engineResponse: res
        }
      ]);

      if (res.type === 'saved' && onEntrySaved) {
        onEntrySaved();
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          sender: 'bot',
          text: `⚠️ Error processing request: ${err.message || 'Server error'}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const toggleMic = () => {
    setIsListening(!isListening);
    if (!isListening) {
      setTimeout(() => {
        if (currentStage === 'AWAIT_CODE') {
          setInput('EMP-1001');
        } else if (currentStage === 'AWAIT_PIN') {
          setInput('849201');
        } else {
          setInput('Worked 4 hours on Frontend Development');
        }
        setIsListening(false);
      }, 1500);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6.5rem)] bg-zinc-950 rounded-lg overflow-hidden border border-zinc-800 shadow-sm">
      {/* Header Bar */}
      <div className="bg-[#09090b] px-6 py-3 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
          <div>
            <h2 className="text-sm font-heading font-bold text-white flex items-center gap-2">
              WorkLog Conversational AI
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-900 text-zinc-300 border border-zinc-800">
                WF-01 Chat Flow
              </span>
            </h2>
            <p className="text-xs text-zinc-400">Interactive auth & work logging conversation</p>
          </div>
        </div>

        {/* Stage Stepper */}
        <div className="hidden lg:flex items-center gap-2 bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800">
          {STAGES.map((s, idx) => {
            const isActive = currentStage === s.key;
            return (
              <React.Fragment key={s.key}>
                <div className={`flex items-center gap-1.5 text-[11px] font-medium ${isActive ? 'text-white font-bold' : 'text-zinc-500'}`}>
                  <span className={`w-4 h-4 rounded text-[9px] flex items-center justify-center font-mono ${
                    isActive ? 'bg-white text-black font-bold' : 'bg-zinc-800 text-zinc-400'
                  }`}>
                    {idx + 1}
                  </span>
                  <span>{s.label}</span>
                </div>
                {idx < STAGES.length - 1 && <span className="text-zinc-700 text-[10px]">›</span>}
              </React.Fragment>
            );
          })}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center rounded bg-zinc-900 border border-zinc-800 p-0.5">
            <button
              onClick={() => {
                if (onOpenSheets) {
                  onOpenSheets();
                } else {
                  window.open(getStoredSheetUrl(), '_blank');
                }
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono text-emerald-400 hover:text-white hover:bg-zinc-800 rounded transition-all cursor-pointer"
              title="Open Google Sheets Database Page"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" /> Google Sheets ↗
            </button>
            {onConfigureSheets && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onConfigureSheets();
                }}
                className="flex items-center gap-1 px-2 py-1 text-xs font-mono text-zinc-300 hover:text-white hover:bg-zinc-800 rounded transition-colors cursor-pointer border-l border-zinc-800 ml-0.5"
                title="Configure Google Sheet Link / ID"
              >
                <Settings className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[11px]">Edit Link</span>
              </button>
            )}
          </div>

          <button
            onClick={handleResetSession}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800 cursor-pointer transition-all"
            title="Reset Login Session"
          >
            <LogOut className="w-3.5 h-3.5" /> Re-login
          </button>

          <button
            onClick={() => setShowDebug(!showDebug)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono transition-all cursor-pointer ${
              showDebug ? 'bg-white text-black font-semibold' : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            <Code className="w-3.5 h-3.5" /> Debug Payload
          </button>
        </div>
      </div>

      {/* Main Chat Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-2xl px-5 py-4 rounded-lg text-sm leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-white text-black rounded-br-none shadow-sm font-medium'
                    : 'bg-zinc-900 text-zinc-100 border border-zinc-800 rounded-bl-none'
                }`}
              >
                <div className="flex items-center justify-between gap-4 mb-1.5">
                  <span className={`text-[10px] font-bold tracking-wider uppercase font-mono ${
                    m.sender === 'user' ? 'text-zinc-700' : 'text-zinc-400'
                  }`}>
                    {m.sender === 'user' ? 'You' : 'WorkLog AI'}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {m.timestamp}
                  </span>
                </div>

                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {isYesNoQuestion(m) ? m.text.replace(YES_NO_SUFFIX, '').trimEnd() : m.text}
                </p>

                {/* Yes / No buttons for the agent's confirmation question. Only the latest one is clickable. */}
                {isYesNoQuestion(m) && (
                  <div className="mt-3.5 flex gap-2 pt-3 border-t border-zinc-800">
                    {(['Yes', 'No'] as const).map((answer) => {
                      const isLatest = m.id === messages[messages.length - 1]?.id;
                      return (
                        <button
                          key={answer}
                          type="button"
                          onClick={() => handleSend(answer.toLowerCase())}
                          disabled={!isLatest || loading || retrySeconds > 0}
                          className={`px-5 py-2 rounded text-sm font-semibold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                            answer === 'Yes'
                              ? 'bg-white text-black hover:bg-zinc-200'
                              : 'bg-zinc-950 text-zinc-200 border border-zinc-700 hover:bg-zinc-800'
                          }`}
                        >
                          {answer}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Structured Pending Entry Cards */}
                {(m.engineResponse?.pendingEntries || (m.engineResponse?.pendingEntry ? [m.engineResponse.pendingEntry] : [])).map((entry, idx) => (
                  <div key={idx} className="mt-4 p-4 rounded bg-black border border-zinc-800 font-sans">
                    <div className="flex items-center justify-between text-xs text-white font-bold mb-3 border-b border-zinc-800 pb-2">
                      <span className="flex items-center gap-1.5 font-mono">
                        <Terminal className="w-3.5 h-3.5 text-zinc-400" /> Extracted Work Log Details {m.engineResponse?.pendingEntries && m.engineResponse.pendingEntries.length > 1 ? `#${idx + 1}` : ''}
                      </span>
                      <span className="text-[10px] font-mono bg-zinc-900 text-zinc-300 px-2 py-0.5 rounded border border-zinc-800">
                        Confidence 98%
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-zinc-400 text-[10px] block font-mono">Employee Code</span>
                        <span className="font-semibold text-white">{entry.employeeCode || currentUser?.code || '—'}</span>
                      </div>
                      <div>
                        <span className="text-zinc-400 text-[10px] block font-mono">Project</span>
                        <span className="font-semibold text-white">{entry.project || '—'}</span>
                      </div>
                      <div>
                        <span className="text-zinc-400 text-[10px] block font-mono">Activity</span>
                        <span className="font-semibold text-white">{entry.activity || '—'}</span>
                      </div>
                      <div>
                        <span className="text-zinc-400 text-[10px] block font-mono">Hours</span>
                        <span className="font-mono font-bold text-white text-sm">{entry.hours} hrs</span>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Interactive Option Chips */}
                {m.engineResponse?.options && m.engineResponse.options.length > 0 && (
                  <div className="mt-3.5 flex flex-wrap gap-2 pt-2 border-t border-zinc-800">
                    {m.engineResponse.options.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => handleSend(opt)}
                        className={`px-3 py-1.5 rounded text-xs font-medium transition-all cursor-pointer ${
                          m.sender === 'user'
                            ? 'bg-zinc-200 text-black border border-zinc-300 hover:bg-zinc-300'
                            : 'bg-zinc-950 text-zinc-200 border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-zinc-900 text-zinc-400 px-4 py-3 rounded text-xs flex items-center gap-3 border border-zinc-800">
                <RefreshCw className="w-4 h-4 text-white animate-spin" />
                <span>Processing turn in n8n engine...</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Debug Payload Drawer */}
        {showDebug && (
          <div className="w-80 bg-[#09090b] border-l border-zinc-800 p-4 font-mono text-xs overflow-y-auto">
            <div className="flex items-center justify-between mb-3 text-zinc-400 font-bold border-b border-zinc-800 pb-2">
              <span className="flex items-center gap-1.5 text-white">
                <Code className="w-4 h-4" /> n8n Payload Inspector
              </span>
              <button onClick={() => setShowDebug(false)} className="text-zinc-500 hover:text-white cursor-pointer">✕</button>
            </div>
            <p className="text-[10px] text-zinc-500 mb-2">Current Session Stage: <span className="text-white font-bold">{currentStage}</span></p>
            <pre className="text-[11px] text-zinc-300 bg-zinc-950 p-3 rounded border border-zinc-800 overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(rawDebugData || { info: 'Send a message to view live n8n stream' }, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Quick Contextual Prompts Bar */}
      <div className="px-6 py-2 bg-[#09090b] border-t border-zinc-800 flex items-center gap-2 overflow-x-auto text-xs text-zinc-400">
        <span className="text-[11px] font-semibold text-zinc-500 shrink-0 font-mono">Quick Input:</span>

        {currentStage === 'AWAIT_CODE' && (
          <span className="text-[11px] text-zinc-400 font-mono">
            Enter your Employee Code to begin authentication
          </span>
        )}

        {currentStage === 'AWAIT_PIN' && (
          <span className="text-[11px] text-zinc-400 font-mono">
            🔒 Enter your 6-digit PIN password
          </span>
        )}

        {(currentStage === 'COLLECT' || currentStage === 'SAVED') && (
          <>
            {currentUser?.projects && currentUser.projects.length > 0 ? (
              currentUser.projects.slice(0, 2).map((p) => (
                <button
                  key={p.id || p.code}
                  onClick={() => handleSend(`Worked 4 hours on ${p.name} ${p.activities[0] || ''}`)}
                  className="px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 shrink-0 cursor-pointer"
                >
                  + 4h {p.name}
                </button>
              ))
            ) : (
              <button
                onClick={() => handleSend('Worked 4 hours on General Project Tasks')}
                className="px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 shrink-0 cursor-pointer"
              >
                + 4h General Tasks
              </button>
            )}
            <button
              onClick={() => handleSend('Show My Weekly Summary')}
              className="px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 shrink-0 cursor-pointer"
            >
              📊 Weekly Log Summary
            </button>
          </>
        )}
      </div>

      {/* Input Form Bar */}
      <div className="p-4 bg-[#09090b] border-t border-zinc-800 flex items-center gap-3">
        <button
          onClick={toggleMic}
          className={`p-3 rounded border transition-all cursor-pointer ${
            isListening ? 'bg-white text-black border-white animate-pulse' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
          }`}
          title="Voice input simulation"
        >
          {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        <div className="relative flex-1 flex items-center">
          {currentStage === 'AWAIT_PIN' && (
            <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 z-10 pointer-events-none" />
          )}

          <input
            ref={inputRef}
            type={currentStage === 'AWAIT_PIN' && !showPassword ? 'password' : 'text'}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            disabled={retrySeconds > 0}
            placeholder={
              retrySeconds > 0
                ? `Too many messages. You can send again in ${retrySeconds}s...`
                : currentStage === 'AWAIT_CODE'
                ? "Enter your Employee Code (e.g. EMP-1001)..."
                : currentStage === 'AWAIT_PIN'
                ? "Enter your 6-digit PIN password..."
                : "Describe your work (e.g. 'Worked 4 hours on Frontend UI Development')..."
            }
            className={`w-full bg-zinc-900 border border-zinc-800 text-white py-3 rounded focus:outline-none focus:border-zinc-500 text-sm placeholder-zinc-500 ${
              currentStage === 'AWAIT_PIN' ? 'pl-10 pr-10 font-mono tracking-wider' : 'px-4'
            }`}
          />

          {currentStage === 'AWAIT_PIN' && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 text-zinc-400 hover:text-white cursor-pointer z-10"
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          )}
        </div>

        <button
          onClick={() => handleSend()}
          disabled={loading || !input.trim() || retrySeconds > 0}
          className="bg-white hover:bg-zinc-200 disabled:opacity-40 text-black font-semibold px-5 py-3 rounded text-sm transition-all cursor-pointer flex items-center gap-2 shadow-sm"
        >
          <Send className="w-4 h-4" /> {retrySeconds > 0 ? `${retrySeconds}s` : 'Send'}
        </button>
      </div>
    </div>
  );
};




