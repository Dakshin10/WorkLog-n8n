import React from 'react';
import { NotificationItem } from '../types';
import { Bell, X } from 'lucide-react';

interface NotificationsModalProps {
  notifications: NotificationItem[];
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  notifications,
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex justify-end">
      <div className="w-full max-w-sm bg-zinc-950 h-full p-6 border-l border-zinc-800 shadow-xl flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-4 border-b border-zinc-800 mb-4">
            <h3 className="text-sm font-heading font-bold text-white flex items-center gap-2">
              <Bell className="w-4 h-4 text-white" /> Notifications Center
            </h3>
            <button onClick={onClose} className="text-zinc-400 hover:text-white p-1 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-10rem)]">
            {notifications.map((item) => (
              <div key={item.id} className="p-4 rounded bg-zinc-900 border border-zinc-800 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white">
                    {item.title}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500">
                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-zinc-400 leading-relaxed">{item.message}</p>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold cursor-pointer"
        >
          Close Notifications
        </button>
      </div>
    </div>
  );
};
