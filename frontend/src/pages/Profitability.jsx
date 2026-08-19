import React, { useState, useEffect } from 'react';
import { CircleDollarSign, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Download } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Area } from 'recharts';
import { reportService, exportService } from '../services/api';
import { useAccount } from '../context/AccountContext';

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-xl text-xs">
      <p className="text-slate-400 font-medium mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="flex items-center gap-2" style={{ color: p.color }}>
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          {p.name}: <span className="font-bold">
            {p.name === 'ROI' ? `${p.value?.toFixed(1)}%` : `$${p.value?.toFixed(2)}`}
          </span>
        </p>
      ))}
    </div>
  );
};

export default function Profitability() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const todayStr = new Date().toISOString().split('T')[0];
  // Default: last 7 days
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 6);
  const [startDate, setStartDate] = useState(weekAgo.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(todayStr);
  const { selectedAccountId } = useAccount();

  const fetchData = async () => {
    try {
      setLoading(true);
      const result = await reportService.getProfitability(startDate, endDate, selectedAccountId);
      setData(result);
    } catch (error) {
      console.error("Failed to fetch profitability data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate]);

  // Quick date presets
  const setPreset = (days) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - (days - 1));
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-64 bg-slate-700 rounded" />
        <div className="grid grid-cols-4 gap-6">
          {[1,2,3,4].map(i => <div key={i} className="h-32 bg-slate-800 rounded-xl" />)}
        </div>
        <div className="h-72 bg-slate-800 rounded-xl" />
      </div>
    );
  }
  if (!data) return <div className="p-8 text-vibrantRed">Failed to load data.</div>;

  const { summary, daily } = data;

  // Prepare chart data with short date labels
  const chartData = daily.map(d => ({
    ...d,
    label: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }));

  const summaryCards = [
    {
      label: 'Total Spend',
      value: `$${summary.totalSpend.toFixed(2)}`,
      icon: CircleDollarSign,
      color: 'text-sky-400',
      bg: 'bg-sky-500/10'
    },
    {
      label: 'Total Revenue',
      value: `$${summary.totalRevenue.toFixed(2)}`,
      icon: TrendingUp,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10'
    },
    {
      label: 'Net Profit',
      value: `${summary.totalProfit >= 0 ? '+' : ''}$${summary.totalProfit.toFixed(2)}`,
      icon: summary.totalProfit >= 0 ? TrendingUp : TrendingDown,
      color: summary.totalProfit >= 0 ? 'text-neonGreen' : 'text-vibrantRed',
      bg: summary.totalProfit >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'
    },
    {
      label: 'Avg ROI',
      value: `${summary.avgRoi >= 0 ? '+' : ''}${summary.avgRoi.toFixed(1)}%`,
      icon: summary.avgRoi >= 0 ? ArrowUpRight : ArrowDownRight,
      color: summary.avgRoi >= 0 ? 'text-neonGreen' : 'text-vibrantRed',
      bg: summary.avgRoi >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <CircleDollarSign className="text-neonGreen" /> Profitability Report
        </h2>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Quick presets */}
          <div className="flex gap-1">
            {[
              { label: '7D', days: 7 },
              { label: '14D', days: 14 },
              { label: '30D', days: 30 },
            ].map(p => (
              <button
                key={p.label}
                onClick={() => setPreset(p.days)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-cardBg border border-slate-700 text-slate-300 hover:border-neonGreen hover:text-neonGreen transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">From</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-cardBg border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-neonGreen"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">To</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-cardBg border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-neonGreen"
            />
          </div>
          <button
            onClick={() => exportService.downloadProfitability(startDate, endDate, selectedAccountId)}
            className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2"
          >
            <Download size={16} /> CSV
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {summaryCards.map((card, i) => (
          <div key={i} className="bg-cardBg p-6 rounded-xl border border-slate-700">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-400 text-sm font-medium">{card.label}</p>
                <p className="text-3xl font-bold text-slate-100 mt-2">{card.value}</p>
              </div>
              <div className={`p-3 rounded-lg ${card.bg} ${card.color}`}>
                <card.icon size={20} />
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-3">{summary.startDate} — {summary.endDate}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      {chartData.length > 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Spend vs Revenue vs Profit */}
          <div className="bg-cardBg rounded-xl border border-slate-700 p-6">
            <h3 className="text-base font-bold text-slate-100 mb-4">Spend / Revenue / Profit</h3>
            <ResponsiveContainer width="100%" height={250}>
              <ComposedChart data={chartData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="label" tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="spend" name="Spend" fill="#3B82F6" radius={[3, 3, 0, 0]} opacity={0.7} />
                <Bar dataKey="revenue" name="Revenue" fill="#10B981" radius={[3, 3, 0, 0]} opacity={0.7} />
                <Area type="monotone" dataKey="profit" name="Profit" stroke="#F59E0B" fill="url(#profitGrad)" strokeWidth={2} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* ROI Trend */}
          <div className="bg-cardBg rounded-xl border border-slate-700 p-6">
            <h3 className="text-base font-bold text-slate-100 mb-4">ROI Trend (%)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="label" tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                <Tooltip content={<ChartTooltip />} />
                {/* Zero reference line */}
                <Line type="monotone" dataKey={() => 0} stroke="#475569" strokeDasharray="5 5" dot={false} name="" legendType="none" />
                <Line 
                  type="monotone" 
                  dataKey="roi" 
                  name="ROI" 
                  stroke="#F59E0B" 
                  strokeWidth={2.5}
                  dot={{ fill: '#F59E0B', strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6, fill: '#F59E0B', strokeWidth: 2, stroke: '#0F172A' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Daily Breakdown Table */}
      <div className="bg-cardBg rounded-xl border border-slate-700 p-6 overflow-hidden">
        <h3 className="text-lg font-bold text-slate-100 mb-4">Daily Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase tracking-wider">
                <th className="pb-3 px-4 font-medium">Date</th>
                <th className="pb-3 px-4 font-medium">Imp (PopAds)</th>
                <th className="pb-3 px-4 font-medium">Imp (Adsterra)</th>
                <th className="pb-3 px-4 font-medium">Spend</th>
                <th className="pb-3 px-4 font-medium">Revenue</th>
                <th className="pb-3 px-4 font-medium">Profit</th>
                <th className="pb-3 px-4 font-medium">ROI</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {daily.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 px-4 text-center text-slate-500">
                    No data available for this date range. Press "Sync Now" on the Overview page first.
                  </td>
                </tr>
              ) : (
                daily.map((row, i) => {
                  const isProfitable = row.profit >= 0;
                  return (
                    <tr key={i} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                      <td className="py-4 px-4 font-bold text-slate-200">{row.date}</td>
                      <td className="py-4 px-4 text-slate-300">{row.impPopads.toLocaleString()}</td>
                      <td className="py-4 px-4 text-slate-300">{row.impAdsterra.toLocaleString()}</td>
                      <td className="py-4 px-4 text-slate-300">${row.spend.toFixed(2)}</td>
                      <td className="py-4 px-4 text-slate-300">${row.revenue.toFixed(2)}</td>
                      <td className={`py-4 px-4 font-medium ${isProfitable ? 'text-neonGreen' : 'text-vibrantRed'}`}>
                        {isProfitable ? '+' : ''}${row.profit.toFixed(2)}
                      </td>
                      <td className={`py-4 px-4 font-medium ${isProfitable ? 'text-neonGreen' : 'text-vibrantRed'}`}>
                        <span className="flex items-center gap-1">
                          {isProfitable ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                          {row.roi >= 0 ? '+' : ''}{row.roi.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {daily.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-slate-600 font-bold">
                  <td className="py-4 px-4 text-slate-100">TOTAL</td>
                  <td className="py-4 px-4 text-slate-300">{daily.reduce((s, d) => s + d.impPopads, 0).toLocaleString()}</td>
                  <td className="py-4 px-4 text-slate-300">{daily.reduce((s, d) => s + d.impAdsterra, 0).toLocaleString()}</td>
                  <td className="py-4 px-4 text-slate-300">${summary.totalSpend.toFixed(2)}</td>
                  <td className="py-4 px-4 text-slate-300">${summary.totalRevenue.toFixed(2)}</td>
                  <td className={`py-4 px-4 ${summary.totalProfit >= 0 ? 'text-neonGreen' : 'text-vibrantRed'}`}>
                    {summary.totalProfit >= 0 ? '+' : ''}${summary.totalProfit.toFixed(2)}
                  </td>
                  <td className={`py-4 px-4 ${summary.avgRoi >= 0 ? 'text-neonGreen' : 'text-vibrantRed'}`}>
                    {summary.avgRoi >= 0 ? '+' : ''}{summary.avgRoi.toFixed(1)}%
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
