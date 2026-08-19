import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Target, AlertTriangle, RefreshCw, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { dashboardService, alertService, settingsService, campaignService, clearApiCache } from '../services/api';
import { useAccount } from '../context/AccountContext';

// Toast notification component
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  const bg = type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
    : type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-400'
      : 'bg-sky-500/10 border-sky-500/30 text-sky-400';

  return (
    <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl border shadow-2xl backdrop-blur-sm text-sm font-medium flex items-center gap-2 animate-slide-in ${bg}`}>
      {type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'} {message}
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isForceSyncing, setIsForceSyncing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [alerts, setAlerts] = useState([]);
  const [toast, setToast] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const autoRefreshRef = useRef(null);
  const navigate = useNavigate();
  const { selectedAccountId, hasAccounts } = useAccount();

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type });
  }, []);

  const fetchDashboardData = useCallback(async (showLoading = true) => {
    if (!selectedAccountId) return;
    try {
      if (showLoading) setLoading(true);
      const result = await dashboardService.getOverview(selectedDate, selectedAccountId);
      setData(result);
      setError(null);
      setLastRefresh(new Date());
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
      setError("Failed to connect to the backend server.");
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [selectedDate, selectedAccountId]);

  const fetchAlerts = useCallback(async () => {
    if (!selectedAccountId) return;
    try {
      const summary = await alertService.getSummary(selectedAccountId);
      setAlerts(summary.recentAlerts || []);
    } catch (e) {
      console.error("Failed to fetch alerts:", e);
    }
  }, [selectedAccountId]);

  // Initial load
  useEffect(() => {
    fetchDashboardData();
    fetchAlerts();
  }, [selectedDate, fetchDashboardData, fetchAlerts]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    autoRefreshRef.current = setInterval(() => {
      fetchDashboardData(false);
      fetchAlerts();
    }, 5 * 60 * 1000);

    return () => {
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    };
  }, [fetchDashboardData, fetchAlerts]);

  const handleRefresh = async () => {
    setIsSyncing(true);
    try {
      clearApiCache();
      await fetchDashboardData(false);
      await fetchAlerts();
      showToast("Data refreshed successfully!", "success");
    } catch (err) {
      showToast("Refresh failed: " + err.message, "error");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleForceSync = async () => {
    setIsForceSyncing(true);
    try {
      const res = await settingsService.triggerSync();
      if (res.success) {
        clearApiCache();
        await fetchDashboardData(false);
        await fetchAlerts();
        showToast("Real-time data synced successfully!", "success");
      }
    } catch (err) {
      showToast("Sync failed: " + (err.response?.data?.error || err.message), "error");
    } finally {
      setIsForceSyncing(false);
    }
  };

  const handlePauseCampaign = async (campName) => {
    try {
      const campaigns = await campaignService.getCampaigns(selectedAccountId);
      const match = campaigns.find(c => c.name === campName);
      if (match) {
        await campaignService.updateCampaignStatus(match.id, 'Paused', selectedAccountId);
        await fetchDashboardData(false);
        showToast(`Campaign "${campName}" paused.`, "success");
      } else {
        showToast('Campaign not found in database.', "error");
      }
    } catch (err) {
      showToast("Failed to pause: " + (err.response?.data?.error || err.message), "error");
    }
  };

  if (!hasAccounts) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-lg font-medium text-slate-400 mb-2">No account configured</p>
          <p className="text-sm text-slate-500">Go to Settings to add an account pair first.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-slate-700 rounded" />
        <div className="grid grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-slate-800 rounded-xl" />)}
        </div>
        <div className="h-64 bg-slate-800 rounded-xl" />
      </div>
    );
  }

  if (error) return <div className="p-8 text-vibrantRed">{error}</div>;

  const stats = [
    { label: 'Total Spend', value: `$${data.totalSpend.toFixed(2)}`, trend: `${data.trends.spend > 0 ? '+' : ''}${data.trends.spend}%`, isPositive: data.trends.spend <= 0, icon: DollarSign },
    { label: 'Total Revenue', value: `$${data.totalRevenue.toFixed(2)}`, trend: `${data.trends.revenue > 0 ? '+' : ''}${data.trends.revenue}%`, isPositive: data.trends.revenue >= 0, icon: TrendingUp },
    { label: 'Net Profit', value: `${data.netProfit >= 0 ? '+' : ''}$${data.netProfit.toFixed(2)}`, trend: `${data.trends.profit > 0 ? '+' : ''}${data.trends.profit}%`, isPositive: data.netProfit >= 0, icon: DollarSign },
    { label: 'Avg ROI', value: `${data.roi >= 0 ? '+' : ''}${data.roi.toFixed(1)}%`, trend: ``, isPositive: data.roi >= 0, icon: Target },
  ];

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Overview Dashboard</h2>
          {lastRefresh && (
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <Clock size={12} /> Last updated: {lastRefresh.toLocaleTimeString()} · Auto-refresh: 5min
            </p>
          )}
        </div>
        <div className="flex gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-cardBg border border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-neonGreen"
          />
          <button
            onClick={handleForceSync}
            disabled={isForceSyncing || isSyncing}
            className="bg-transparent border border-slate-600 hover:bg-slate-800 text-slate-300 px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 disabled:opacity-50"
            title="Force real-time sync from Ad Networks"
          >
            <RefreshCw size={16} className={isForceSyncing ? "animate-spin text-neonGreen" : ""} />
            {isForceSyncing ? "Syncing..." : "Force Sync"}
          </button>
          <button
            onClick={handleRefresh}
            disabled={isSyncing || isForceSyncing}
            className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw size={16} className={isSyncing ? "animate-spin" : ""} />
            {isSyncing ? "Fetching..." : "Get Data"}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-cardBg p-6 rounded-xl border border-slate-700 hover:border-slate-600 transition-colors">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-400 text-sm font-medium">{stat.label}</p>
                <p className="text-3xl font-bold text-slate-100 mt-2">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-lg ${stat.isPositive ? 'bg-emerald-500/10 text-neonGreen' : 'bg-red-500/10 text-vibrantRed'}`}>
                <stat.icon size={20} />
              </div>
            </div>
            {stat.trend && (
              <div className="mt-4 flex items-center text-sm">
                <span className={stat.isPositive ? 'text-neonGreen' : 'text-vibrantRed'}>
                  {stat.trend}
                </span>
                <span className="text-slate-500 ml-2">vs previous day</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Campaigns Table */}
        <div className="lg:col-span-2 bg-cardBg rounded-xl border border-slate-700 p-6">
          <h3 className="text-lg font-bold mb-4 text-slate-100">Top Campaigns by Spend</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400 text-sm">
                  <th className="pb-3 font-medium">Campaign Name</th>
                  <th className="pb-3 font-medium">Spend</th>
                  <th className="pb-3 font-medium">Revenue</th>
                  <th className="pb-3 font-medium">Profit</th>
                  <th className="pb-3 font-medium">ROI</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {data.topCampaigns && data.topCampaigns.length > 0 ? (
                  data.topCampaigns.map((camp, i) => (
                    <tr key={i} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                      <td className="py-4">{camp.name}</td>
                      <td className="py-4">${camp.spend.toFixed(2)}</td>
                      <td className="py-4">${camp.revenue.toFixed(2)}</td>
                      <td className={`py-4 ${camp.profit >= 0 ? 'text-neonGreen' : 'text-vibrantRed'}`}>
                        {camp.profit >= 0 ? '+' : ''}${camp.profit.toFixed(2)}
                      </td>
                      <td className={`py-4 ${camp.profit >= 0 ? 'text-neonGreen' : 'text-vibrantRed'}`}>
                        {camp.roi >= 0 ? '+' : ''}{camp.roi.toFixed(1)}%
                      </td>
                      <td className="py-4">
                        <button
                          onClick={() => navigate('/campaigns')}
                          className="bg-neonGreen/10 text-neonGreen px-3 py-1 rounded text-xs font-medium hover:bg-neonGreen/20 transition-colors mr-2"
                        >Scale</button>
                        <button
                          onClick={() => handlePauseCampaign(camp.name)}
                          className="bg-slate-700 text-slate-300 px-3 py-1 rounded text-xs font-medium hover:bg-slate-600 transition-colors"
                        >Pause</button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-slate-500">
                      No campaign data yet. Sync data to see your top performers.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Smart Alerts */}
        <div className="bg-cardBg rounded-xl border border-slate-700 p-6">
          <h3 className="text-lg font-bold mb-4 text-slate-100">Smart Alerts</h3>
          <div className="space-y-3">
            {alerts.length === 0 ? (
              <p className="text-sm text-slate-500">No alerts. Data looks clean! 🎉</p>
            ) : (
              alerts.map(alert => (
                <div key={alert.id} className={`p-4 rounded-lg border ${alert.severity === 'critical'
                    ? 'bg-vibrantRed/10 border-vibrantRed/20'
                    : 'bg-amberWarning/10 border-amberWarning/20'
                  }`}>
                  <div className="flex gap-3">
                    <AlertTriangle className={`shrink-0 ${alert.severity === 'critical' ? 'text-vibrantRed' : 'text-amberWarning'
                      }`} size={20} />
                    <div>
                      <h4 className="text-sm font-medium text-slate-200">
                        {alert.severity === 'critical' ? 'Campaign Loss Detected' : 'Spending Without Revenue'}
                      </h4>
                      <p className="text-xs text-slate-400 mt-1">{alert.message}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
