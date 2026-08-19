import React, { useState, useEffect } from 'react';
import { History, CheckCircle2, XCircle, Clock, RefreshCw } from 'lucide-react';
import { syncLogService, settingsService } from '../services/api';
import { useAccount } from '../context/AccountContext';

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

export default function SyncHistory() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const { selectedAccountId } = useAccount();

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const data = await syncLogService.getLogs(selectedAccountId);
      setLogs(data);
    } catch (error) {
      console.error("Failed to fetch sync logs", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await settingsService.triggerSync();
      await fetchLogs();
    } catch (err) {
      console.error("Sync failed:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  const successCount = logs.filter(l => l.status === 'success').length;
  const failedCount = logs.filter(l => l.status === 'failed').length;
  const lastSync = logs.length > 0 ? logs[0] : null;

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-slate-700 rounded" />
        <div className="grid grid-cols-3 gap-6">
          {[1,2,3].map(i => <div key={i} className="h-24 bg-slate-800 rounded-xl" />)}
        </div>
        <div className="h-96 bg-slate-800 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <History className="text-neonGreen" /> Sync History
        </h2>
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className="bg-neonGreen hover:bg-emerald-400 text-darkBg px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw size={16} className={isSyncing ? "animate-spin" : ""} />
          {isSyncing ? "Syncing..." : "Sync Now"}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-cardBg p-5 rounded-xl border border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-sky-500/10">
              <History size={20} className="text-sky-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Total Syncs</p>
              <p className="text-2xl font-bold text-slate-100">{logs.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-cardBg p-5 rounded-xl border border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <CheckCircle2 size={20} className="text-neonGreen" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Successful</p>
              <p className="text-2xl font-bold text-neonGreen">{successCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-cardBg p-5 rounded-xl border border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10">
              <XCircle size={20} className="text-vibrantRed" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Failed</p>
              <p className="text-2xl font-bold text-vibrantRed">{failedCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Last Sync Banner */}
      {lastSync && (
        <div className={`p-4 rounded-xl border flex items-center gap-3 ${
          lastSync.status === 'success'
            ? 'bg-emerald-500/5 border-emerald-500/20'
            : 'bg-red-500/5 border-red-500/20'
        }`}>
          {lastSync.status === 'success'
            ? <CheckCircle2 size={20} className="text-neonGreen shrink-0" />
            : <XCircle size={20} className="text-vibrantRed shrink-0" />
          }
          <div className="flex-1">
            <span className="text-sm text-slate-200 font-medium">
              Last sync: {lastSync.status === 'success' ? 'Completed successfully' : 'Failed'}
            </span>
            {lastSync.message && (
              <span className="text-xs text-slate-400 ml-2">— {lastSync.message}</span>
            )}
          </div>
          <span className="text-xs text-slate-500 flex items-center gap-1 shrink-0">
            <Clock size={12} /> {getTimeAgo(lastSync.createdAt)}
          </span>
        </div>
      )}

      {/* Logs Table */}
      <div className="bg-cardBg rounded-xl border border-slate-700 p-6 overflow-hidden">
        <h3 className="text-lg font-bold text-slate-100 mb-4">Sync Log</h3>
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead className="sticky top-0 bg-cardBg">
              <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase tracking-wider">
                <th className="pb-3 px-4 font-medium">Status</th>
                <th className="pb-3 px-4 font-medium">Provider</th>
                <th className="pb-3 px-4 font-medium">Message</th>
                <th className="pb-3 px-4 font-medium">Time</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan="4" className="py-12 px-4 text-center text-slate-500">
                    <History size={48} className="mx-auto mb-4 text-slate-600" />
                    <p className="text-lg font-medium text-slate-400">No sync history yet</p>
                    <p className="text-sm mt-1">Press "Sync Now" to start your first data sync.</p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-4">
                      {log.status === 'success' ? (
                        <span className="flex items-center gap-1.5 text-neonGreen text-xs font-medium">
                          <CheckCircle2 size={14} /> Success
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-vibrantRed text-xs font-medium">
                          <XCircle size={14} /> Failed
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 rounded text-xs font-medium bg-slate-700 text-slate-300 uppercase">
                        {log.provider}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-300 max-w-xs truncate">
                      {log.message || '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-xs">
                      <div>{new Date(log.createdAt).toLocaleDateString()}</div>
                      <div>{new Date(log.createdAt).toLocaleTimeString()}</div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
