import React, { useState, useEffect } from 'react';
import { Link2, RefreshCw, Search } from 'lucide-react';
import { sourceService } from '../services/api';
import { useAccount } from '../context/AccountContext';

export default function Sources() {
  const [sourcesData, setSourcesData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [hasLoaded, setHasLoaded] = useState(false);
  const { selectedAccountId } = useAccount();

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await sourceService.getSources(selectedDate, selectedAccountId);
      setSourcesData(data);
      setHasLoaded(true);
    } catch (error) {
      console.error("Failed to fetch sources", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSources = sourcesData.filter(s =>
    s.sourceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.campaign.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <Link2 className="text-neonGreen" /> Traffic Sources
        </h2>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-cardBg border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-neonGreen"
          />
          <button
            onClick={fetchData}
            disabled={loading}
            className="bg-neonGreen hover:bg-emerald-400 text-darkBg px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            {loading ? "Loading..." : "Load Data"}
          </button>
        </div>
      </div>

      {!hasLoaded ? (
        <div className="bg-cardBg rounded-xl border border-slate-700 p-12 text-center">
          <Link2 size={48} className="text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-400">Select a date and click "Load Data"</h3>
          <p className="text-sm text-slate-500 mt-1">Source data is fetched live from PopAds API.</p>
        </div>
      ) : (
        <>
          {/* Search bar */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search by Source ID or Campaign..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-cardBg border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-neonGreen"
            />
          </div>

          <div className="bg-cardBg rounded-xl border border-slate-700 p-6 overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-slate-400">{filteredSources.length} sources found</p>
              <p className="text-sm text-slate-500">Total Spend: ${sourcesData.reduce((s, d) => s + d.spend, 0).toFixed(2)}</p>
            </div>
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead className="sticky top-0 bg-cardBg">
                  <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase tracking-wider">
                    <th className="pb-3 px-4 font-medium">Source ID</th>
                    <th className="pb-3 px-4 font-medium">Campaign</th>
                    <th className="pb-3 px-4 font-medium">Impressions</th>
                    <th className="pb-3 px-4 font-medium">Spend ($)</th>
                    <th className="pb-3 px-4 font-medium">Bid ($)</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {filteredSources.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-8 px-4 text-center text-slate-500">
                        No source data found for this date.
                      </td>
                    </tr>
                  ) : (
                    filteredSources.map((row, index) => (
                      <tr key={index} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-200">#{row.sourceId}</td>
                        <td className="py-3 px-4 text-slate-300">{row.campaign}</td>
                        <td className="py-3 px-4 text-slate-300">{row.imp.toLocaleString()}</td>
                        <td className="py-3 px-4 text-slate-300">${row.spend.toFixed(4)}</td>
                        <td className="py-3 px-4 text-slate-300">${row.bid.toFixed(5)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
