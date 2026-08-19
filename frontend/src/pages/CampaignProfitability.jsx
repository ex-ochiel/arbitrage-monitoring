import React, { useState, useEffect } from 'react';
import { BarChart3, ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown, CircleDollarSign, Target } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { reportService } from '../services/api';
import { useAccount } from '../context/AccountContext';

const ChartTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-xl text-xs space-y-1">
      <p className="text-slate-200 font-bold">{d.name}</p>
      <p className="text-sky-400">Spend: <span className="font-bold">${d.spend?.toFixed(2)}</span></p>
      <p className="text-emerald-400">Revenue: <span className="font-bold">${d.revenue?.toFixed(2)}</span></p>
      <p className={d.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}>
        Profit: <span className="font-bold">{d.profit >= 0 ? '+' : ''}${d.profit?.toFixed(2)}</span>
      </p>
      <p className={d.roi >= 0 ? 'text-emerald-400' : 'text-red-400'}>
        ROI: <span className="font-bold">{d.roi?.toFixed(1)}%</span>
      </p>
    </div>
  );
};

export default function CampaignProfitability() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const { selectedAccountId } = useAccount();

  const fetchData = async () => {
    try {
      setLoading(true);
      const result = await reportService.getCampaignProfitability(selectedDate, selectedAccountId);
      setData(result);
    } catch (error) {
      console.error("Failed to fetch campaign profitability", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-64 bg-slate-700 rounded" />
        <div className="grid grid-cols-4 gap-6">
          {[1,2,3,4].map(i => <div key={i} className="h-24 bg-slate-800 rounded-xl" />)}
        </div>
        <div className="h-72 bg-slate-800 rounded-xl" />
      </div>
    );
  }

  if (!data) return <div className="p-8 text-vibrantRed">Failed to load data.</div>;

  const { summary, campaigns } = data;
  const profitableCount = campaigns.filter(c => c.profit >= 0).length;
  const losingCount = campaigns.filter(c => c.profit < 0).length;

  // Chart data - top 10 campaigns for readability
  const chartCampaigns = campaigns.slice(0, 10).map(c => ({
    ...c,
    shortName: c.name.length > 15 ? c.name.substring(0, 15) + '…' : c.name
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <BarChart3 className="text-neonGreen" /> Campaign Profitability
        </h2>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-cardBg border border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-neonGreen"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-cardBg p-5 rounded-xl border border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-sky-500/10">
              <Target size={20} className="text-sky-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Total Campaigns</p>
              <p className="text-2xl font-bold text-slate-100">{summary.campaignCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-cardBg p-5 rounded-xl border border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <TrendingUp size={20} className="text-neonGreen" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Profitable</p>
              <p className="text-2xl font-bold text-neonGreen">{profitableCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-cardBg p-5 rounded-xl border border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10">
              <TrendingDown size={20} className="text-vibrantRed" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Losing</p>
              <p className="text-2xl font-bold text-vibrantRed">{losingCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-cardBg p-5 rounded-xl border border-slate-700">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${summary.totalProfit >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
              <CircleDollarSign size={20} className={summary.totalProfit >= 0 ? 'text-neonGreen' : 'text-vibrantRed'} />
            </div>
            <div>
              <p className="text-sm text-slate-400">Net Profit</p>
              <p className={`text-2xl font-bold ${summary.totalProfit >= 0 ? 'text-neonGreen' : 'text-vibrantRed'}`}>
                {summary.totalProfit >= 0 ? '+' : ''}${summary.totalProfit.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Profit Chart */}
      {chartCampaigns.length > 0 && (
        <div className="bg-cardBg rounded-xl border border-slate-700 p-6">
          <h3 className="text-base font-bold text-slate-100 mb-4">Profit by Campaign (Top 10)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartCampaigns} margin={{ top: 5, right: 5, left: -10, bottom: 5 }} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis type="number" tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
              <YAxis type="category" dataKey="shortName" tick={{ fill: '#94A3B8', fontSize: 11 }} width={120} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="profit" radius={[0, 4, 4, 0]} barSize={18}>
                {chartCampaigns.map((entry, index) => (
                  <Cell key={index} fill={entry.profit >= 0 ? '#10B981' : '#EF4444'} fillOpacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Campaign Table */}
      <div className="bg-cardBg rounded-xl border border-slate-700 p-6 overflow-hidden">
        <h3 className="text-lg font-bold text-slate-100 mb-4">All Campaigns — {selectedDate}</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase tracking-wider">
                <th className="pb-3 px-4 font-medium">Campaign</th>
                <th className="pb-3 px-4 font-medium">Status</th>
                <th className="pb-3 px-4 font-medium">Imp (PopAds)</th>
                <th className="pb-3 px-4 font-medium">Spend</th>
                <th className="pb-3 px-4 font-medium">Revenue</th>
                <th className="pb-3 px-4 font-medium">Profit</th>
                <th className="pb-3 px-4 font-medium">ROI</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {campaigns.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 px-4 text-center text-slate-500">
                    <BarChart3 size={48} className="mx-auto mb-4 text-slate-600" />
                    <p className="text-lg font-medium text-slate-400">No campaign data</p>
                    <p className="text-sm mt-1">Sync your data first to see per-campaign profitability.</p>
                  </td>
                </tr>
              ) : (
                campaigns.map((camp, i) => {
                  const isProfitable = camp.profit >= 0;
                  return (
                    <tr key={i} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                      <td className="py-4 px-4">
                        <div className="font-bold text-slate-200">{camp.name}</div>
                        <div className="text-xs text-slate-500">#{camp.campaignId}</div>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium uppercase ${
                          camp.status.toLowerCase() === 'active' 
                            ? 'bg-neonGreen/10 text-neonGreen' 
                            : 'bg-slate-700 text-slate-400'
                        }`}>
                          {camp.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-slate-300">{camp.impPopads.toLocaleString()}</td>
                      <td className="py-4 px-4 text-slate-300">${camp.spend.toFixed(2)}</td>
                      <td className="py-4 px-4 text-slate-300">${camp.revenue.toFixed(2)}</td>
                      <td className={`py-4 px-4 font-medium ${isProfitable ? 'text-neonGreen' : 'text-vibrantRed'}`}>
                        {isProfitable ? '+' : ''}${camp.profit.toFixed(2)}
                      </td>
                      <td className={`py-4 px-4 font-medium ${isProfitable ? 'text-neonGreen' : 'text-vibrantRed'}`}>
                        <span className="flex items-center gap-1">
                          {isProfitable ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                          {camp.roi >= 0 ? '+' : ''}{camp.roi.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {campaigns.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-slate-600 font-bold">
                  <td className="py-4 px-4 text-slate-100">TOTAL ({summary.campaignCount})</td>
                  <td className="py-4 px-4" />
                  <td className="py-4 px-4 text-slate-300">{campaigns.reduce((s, c) => s + c.impPopads, 0).toLocaleString()}</td>
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
