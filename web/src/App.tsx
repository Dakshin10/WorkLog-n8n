import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar, TabType } from './components/Sidebar';
import { ChatThread } from './components/ChatThread';
import { TimesheetDashboard } from './components/TimesheetDashboard';
import { AuditLogView } from './components/AuditLogView';
import { GoogleSheetsConnectView } from './components/GoogleSheetsConnectView';
import { NotificationsModal } from './components/NotificationsModal';
import { api, DEMO_USERS } from './lib/api';
import { UserProfile, TimesheetEntry, AuditEvent, NotificationItem } from './types';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<UserProfile>(DEMO_USERS[0]);
  const [activeTab, setActiveTab] = useState<TabType>('chat');

  // Application Data States
  const [timesheets, setTimesheets] = useState<TimesheetEntry[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditEvent[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);

  const loadData = async () => {
    try {
      const [tsData, audData, notifData] = await Promise.all([
        api.getTimesheets(),
        api.getAuditLogs(),
        api.getNotifications()
      ]);
      setTimesheets(tsData);
      setAuditLogs(audData);
      setNotifications(notifData);
    } catch (err) {
      console.error('Failed loading data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleResetSession = () => {
    api.resetSession();
    setActiveTab('chat');
  };

  const handleAddManualEntry = (entry: TimesheetEntry) => {
    setTimesheets((prev) => [entry, ...prev]);
    setAuditLogs((prev) => [
      {
        id: `aud_${Date.now()}`,
        timestamp: new Date().toISOString(),
        employeeCode: entry.employeeCode,
        event: 'CONFIRMED',
        details: `Manual entry ${entry.entryId} logged ${entry.hours}h to ${entry.project}`,
        sessionId: 'MANUAL_GRID',
        status: 'SUCCESS'
      },
      ...prev
    ]);
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col font-sans antialiased selection:bg-white selection:text-black">
      {/* Top Header Bar */}
      <Header
        currentUser={currentUser}
        onUserSelect={setCurrentUser}
        unreadCount={notifications.filter((n) => !n.read).length}
        onOpenNotifications={() => setShowNotifications(true)}
      />

      {/* Main Layout Area */}
      <div className="flex-1 flex flex-col md:flex-row px-4 md:px-8 py-6 gap-6 max-w-[1600px] mx-auto w-full">
        {/* Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          userRole={currentUser.role}
          logCount={timesheets.length}
          onResetSession={handleResetSession}
        />

        {/* Content View Container */}
        <main className="flex-1 min-w-0">
          {activeTab === 'chat' && (
            <ChatThread
              currentUser={currentUser}
              onEntrySaved={loadData}
              onResetSession={handleResetSession}
            />
          )}

          {activeTab === 'timesheets' && (
            <TimesheetDashboard
              entries={timesheets}
              currentUser={currentUser}
              onAddEntry={handleAddManualEntry}
            />
          )}

          {activeTab === 'sheets' && (
            <GoogleSheetsConnectView />
          )}

          {activeTab === 'audit' && (
            <AuditLogView logs={auditLogs} />
          )}
        </main>
      </div>

      {/* Notifications Slide-over Drawer */}
      <NotificationsModal
        notifications={notifications}
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
      />
    </div>
  );
};

export default App;

