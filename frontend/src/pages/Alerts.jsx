import React, { useState, useEffect } from 'react';
import { AlertTriangle, Bell, CheckCheck, XCircle, Info, Clock } from 'lucide-react';
import { alertService } from '../services/api';
import Pagination from '../components/ui/Pagination';
import { useAccount } from '../context/AccountContext';

const severityConfig = {
  critical: { color: 'text-vibrantRed', bg: 'bg-vibrantRed/10', border: 'border-vibrantRed/20', icon: XCircle, label: 'Critical' },
  warning: { color: 'text-amberWarning', bg: 'bg-amberWarning/10', border: 'border-amberWarning/20', icon: AlertTriangle, label: 'Warning' },
  info: { color: 'text-sky-400', bg: 'bg-sky-400/10', border: 'border-sky-400/20', icon: Info, label: 'Info' },
};

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const { selectedAccountId } = useAccount();

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const data = await alertService.getAlerts(selectedAccountId);
      setAlerts(data);
    } catch (error) {
      console.error("Failed to fetch alerts", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await alertService.markRead(id);
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, isRead: true } : a));
    } catch (e) {
      console.error("Failed to mark alert as read", e);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await alertService.markAllRead(selectedAccountId);
      setAlerts(prev => prev.map(a => ({ ...a, isRead: true })));
    } catch (e) {
      console.error("Failed to mark all as read", e);
    }
  };

  const [alertPage, setAlertPage] = useState(1);
  const alertPageSize = 15;

  const filteredAlerts = alerts.filter(a => {
    if (filter === 'unread') return !a.isRead;
    if (filter === 'critical') return a.severity === 'critical';
    if (filter === 'warning') return a.severity === 'warning';
    return true;
  });

  const totalAlertPages = Math.ceil(filteredAlerts.length / alertPageSize);
  const paginatedAlerts = filteredAlerts.slice((alertPage - 1) * alertPageSize, alertPage * alertPageSize);

  // Reset page when filter changes
  useEffect(() => { setAlertPage(1); }, [filter]);

  const unreadCount = alerts.filter(a => !a.isRead).length;

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-slate-700 rounded" />
        <div className="flex gap-2">{[1,2,3,4].map(i => <div key={i} className="h-10 w-24 bg-slate-700 rounded-lg" />)}</div>
        {[1,2,3].map(i => <div key={i} className="h-24 bg-slate-800 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <Bell className="text-neonGreen" /> Smart Alerts
          {unreadCount > 0 && (
            <span className="bg-vibrantRed text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </h2>
        <div className="flex gap-3">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2"
            >
              <CheckCheck size={16} /> Mark All Read
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {[
          { key: 'all', label: 'All' },
          { key: 'unread', label: `Unread (${unreadCount})` },
          { key: 'critical', label: 'Critical' },
          { key: 'warning', label: 'Warning' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === tab.key
                ? 'bg-neonGreen text-darkBg'
                : 'bg-cardBg border border-slate-700 text-slate-300 hover:border-slate-500'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Alert List */}
      <div className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <div className="bg-cardBg rounded-xl border border-slate-700 p-12 text-center">
            <Bell size={48} className="text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-400">No alerts</h3>
            <p className="text-sm text-slate-500 mt-1">
              {filter === 'all' 
                ? 'Alerts will appear here after you sync data. Press "Sync Now" on Overview.'
                : 'No alerts match this filter.'}
            </p>
          </div>
        ) : (
          <>
            {paginatedAlerts.map(alert => {
            const config = severityConfig[alert.severity] || severityConfig.info;
            const Icon = config.icon;
            const timeAgo = getTimeAgo(alert.createdAt);

            return (
              <div
                key={alert.id}
                className={`p-5 rounded-xl border transition-all ${config.bg} ${config.border} ${
                  !alert.isRead ? 'shadow-lg' : 'opacity-60'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded-lg ${config.bg} ${config.color} shrink-0`}>
                    <Icon size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-bold uppercase ${config.color}`}>
                        {config.label}
                      </span>
                      {!alert.isRead && (
                        <span className="bg-neonGreen text-darkBg text-[10px] font-bold px-1.5 py-0.5 rounded">NEW</span>
                      )}
                      <span className="text-xs text-slate-500 flex items-center gap-1 ml-auto">
                        <Clock size={12} /> {timeAgo}
                      </span>
                    </div>
                    <p className="text-sm text-slate-200">{alert.message}</p>
                    {alert.campaignName && (
                      <p className="text-xs text-slate-500 mt-1">Campaign: {alert.campaignName}</p>
                    )}
                  </div>
                  {!alert.isRead && (
                    <button
                      onClick={() => handleMarkRead(alert.id)}
                      className="text-slate-500 hover:text-slate-300 transition-colors shrink-0 text-xs"
                      title="Mark as read"
                    >
                      ✓ Read
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          <Pagination
            currentPage={alertPage}
            totalPages={totalAlertPages}
            onPageChange={setAlertPage}
            pageSize={alertPageSize}
            totalItems={filteredAlerts.length}
          />
          </>
        )}
      </div>
    </div>
  );
}

function getTimeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHrs / 24);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
