import React, { useState, useEffect, useMemo } from 'react';
import { Globe, ArrowDownRight, ArrowUpRight, RefreshCw, Download } from 'lucide-react';
import { reportService, settingsService, exportService, clearApiCache } from '../services/api';
import Pagination from '../components/ui/Pagination';
import SortableHeader, { useTableControls } from '../components/ui/SortableHeader';
import { useAccount } from '../context/AccountContext';

const getCountryName = (code) => {
  if (!code || code === 'Unknown' || code === 'ALL') return code;
  try {
    const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
    const fullName = regionNames.of(code);
    if (fullName === code) return code;
    return `${fullName} (${code})`;
  } catch (e) {
    return code;
  }
};

export default function GeoReports() {
  const [geoData, setGeoData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const { selectedAccountId } = useAccount();

  // Enrich data with computed fields for sorting
  const enrichedData = useMemo(() => geoData.map(row => {
    const impMatch = row.impPopads > 0 ? (row.impAdsterra / row.impPopads) * 100 : 0;
    const profit = row.rev - row.spend;
    const roi = row.spend > 0 ? (profit / row.spend) * 100 : 0;
    return { ...row, impMatch, profit, roi };
  }), [geoData]);

  const { paginatedData, sort, setSort, page, setPage, pageSize, setPageSize, totalPages, totalItems } = useTableControls(enrichedData, 25);

  const fetchData = async (showLoadingState = true) => {
    try {
      if (showLoadingState) setLoading(true);
      const data = await reportService.getGeoReports(selectedDate, selectedAccountId);
      setGeoData(data);
    } catch (error) {
      console.error("Failed to fetch geo reports", error);
    } finally {
      if (showLoadingState) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  const handleRefresh = async () => {
    setIsSyncing(true);
    try {
      clearApiCache();
      await fetchData(false);
    } catch (err) {
      console.error("Refresh failed:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-slate-700 rounded" />
        <div className="h-96 bg-slate-800 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <Globe className="text-neonGreen" /> GEO Reports
        </h2>
        <div className="flex gap-3 flex-wrap">
          <input 
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-cardBg border border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-neonGreen"
          />
          <button 
            onClick={handleRefresh}
            disabled={isSyncing}
            className="bg-neonGreen hover:bg-emerald-400 text-darkBg px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw size={16} className={isSyncing ? "animate-spin" : ""} /> 
            {isSyncing ? "Fetching..." : "Get Data"}
          </button>
          <button 
            onClick={() => exportService.downloadGeo(selectedDate, selectedAccountId)}
            className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2"
          >
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      <div className="bg-cardBg rounded-xl border border-slate-700 p-6 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase tracking-wider">
                <SortableHeader label="Country" sortKey="country" currentSort={sort} onSort={setSort} />
                <SortableHeader label="Bid (PopAds)" sortKey="bid" currentSort={sort} onSort={setSort} />
                <SortableHeader label="CPM (Adsterra)" sortKey="cpm" currentSort={sort} onSort={setSort} />
                <SortableHeader label="Imp (PopAds)" sortKey="impPopads" currentSort={sort} onSort={setSort} />
                <SortableHeader label="Imp (Adsterra)" sortKey="impAdsterra" currentSort={sort} onSort={setSort} />
                <SortableHeader label="% Imp Match" sortKey="impMatch" currentSort={sort} onSort={setSort} />
                <SortableHeader label="Spent" sortKey="spend" currentSort={sort} onSort={setSort} />
                <SortableHeader label="Revenue" sortKey="rev" currentSort={sort} onSort={setSort} />
                <SortableHeader label="Profit" sortKey="profit" currentSort={sort} onSort={setSort} />
                <SortableHeader label="ROI" sortKey="roi" currentSort={sort} onSort={setSort} />
              </tr>
            </thead>
            <tbody className="text-sm">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan="10" className="py-12 px-4 text-center text-slate-500">
                    <Globe size={48} className="mx-auto mb-4 text-slate-600" />
                    <p className="text-lg font-medium text-slate-400">No GEO data</p>
                    <p className="text-sm mt-1">Sync data to see country-level breakdown.</p>
                  </td>
                </tr>
              ) : (
                paginatedData.map((row, index) => {
                  const isProfitable = row.profit >= 0;
                  return (
                    <tr key={index} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                      <td className="py-4 px-4 font-bold text-slate-200">{getCountryName(row.country)}</td>
                      <td className="py-4 px-4">${row.bid.toFixed(5)}</td>
                      <td className="py-4 px-4">${row.cpm.toFixed(2)}</td>
                      <td className="py-4 px-4 text-slate-300">{row.impPopads.toLocaleString()}</td>
                      <td className="py-4 px-4 text-slate-300">{row.impAdsterra.toLocaleString()}</td>
                      <td className="py-4 px-4">
                        <span className={`px-2 py-1 rounded text-xs ${row.impMatch >= 80 ? 'bg-neonGreen/10 text-neonGreen' : 'bg-amberWarning/10 text-amberWarning'}`}>
                          {row.impMatch.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-4 px-4 text-slate-300">${row.spend.toFixed(2)}</td>
                      <td className="py-4 px-4 text-slate-300">${row.rev.toFixed(2)}</td>
                      <td className={`py-4 px-4 font-medium ${isProfitable ? 'text-neonGreen' : 'text-vibrantRed'}`}>
                        {row.profit >= 0 ? '+' : ''}${row.profit.toFixed(2)}
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
          </table>
        </div>

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          totalItems={totalItems}
        />
      </div>
    </div>
  );
}
