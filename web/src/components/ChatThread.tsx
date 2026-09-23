import React, { useState, useEffect, useRef } from 'react';
import { Send, CheckCircle, XCircle, Edit2, AlertCircle } from 'lucide-react';
import { api, EngineResponse } from '../lib/api';

interface MessageItem {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  engineResponse?: EngineResponse;
}

export const ChatThread: React.FC = () => {
  const [messages, setMessages] = useState<MessageItem[]>([
    {
      id: '1',
      sender: 'bot',
      text: '👋 Hi! Tell me what you worked on today (e.g. "Worked 4 hours on Microsite UX design").',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    const userMsgId = crypto.randomUUID();
    setMessages((prev) => [...prev, { id: userMsgId, sender: 'user', text }]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.sendMessage(text, userMsgId);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          sender: 'bot',
          text: res.reply,
          engineResponse: res,
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          sender: 'bot',
          text: `⚠️ Error: ${err.message || 'Failed to reach server'}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    const clientMsgId = crypto.randomUUID();
    setLoading(true);
    try {
      const res = await api.confirmLog(clientMsgId);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          sender: 'bot',
          text: res.reply,
          engineResponse: res,
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          sender: 'bot',
          text: `⚠️ Error saving: ${err.message}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    const clientMsgId = crypto.randomUUID();
    setLoading(true);
    try {
      const res = await api.cancelLog(clientMsgId);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          sender: 'bot',
          text: res.reply,
          engineResponse: res,
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          sender: 'bot',
          text: `⚠️ Error cancelling: ${err.message}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
            WorkLog Conversational AI
          </h2>
          <p className="text-xs text-slate-400">Powered by Google Gemini & n8n Workflows</p>
        </div>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-2xl px-5 py-3.5 rounded-2xl text-sm leading-relaxed ${
                m.sender === 'user'
                  ? 'bg-sky-600 text-white rounded-br-none shadow-md'
                  : 'bg-slate-800 text-slate-100 border border-slate-700/80 rounded-bl-none'
              }`}
            >
              <p className="whitespace-pre-wrap">{m.text}</p>

              {/* Render Option Chips */}
              {m.engineResponse?.options && m.engineResponse.options.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {m.engineResponse.options.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => {
                        if (opt === 'Confirm') handleConfirm();
                        else if (opt === 'Cancel') handleCancel();
                        else handleSend(opt);
                      }}
                      className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/40 hover:bg-sky-500/30 transition-all cursor-pointer"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              {/* Render Summary Action Card if type === 'summary' */}
              {m.engineResponse?.type === 'summary' && (
                <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center gap-3">
                  <button
                    onClick={handleConfirm}
                    disabled={loading}
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg text-xs transition-all cursor-pointer"
                  >
                    <CheckCircle className="w-4 h-4" /> Confirm & Submit
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={loading}
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-rose-600/80 hover:bg-rose-600 text-white font-medium rounded-lg text-xs transition-all cursor-pointer"
                  >
                    <XCircle className="w-4 h-4" /> Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-800 text-slate-400 px-4 py-3 rounded-2xl text-xs flex items-center gap-2 border border-slate-700">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-bounce"></span>
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-bounce [animation-delay:0.4s]"></span>
              Extracting work log details...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Form */}
      <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center gap-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Describe your work (e.g., 'Worked 6 hours on Client Portal backend')..."
          className="flex-1 bg-slate-900 border border-slate-700 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
        />
        <button
          onClick={() => handleSend()}
          disabled={loading || !input.trim()}
          className="bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white p-3 rounded-xl transition-all cursor-pointer"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
