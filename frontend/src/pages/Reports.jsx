import React, { useState } from 'react';
import { Download, FileSpreadsheet, Globe, TrendingUp } from 'lucide-react';
import { exportService } from '../services/api';

export default function Reports() {
  const todayStr = new Date().toISOString().split('T')[0];
  const [profitStart, setProfitStart] = useState(todayStr);
  const [profitEnd, setProfitEnd] = useState(todayStr);
  const [geoDate, setGeoDate] = useState(todayStr);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
        <FileSpreadsheet className="text-neonGreen" /> Export Reports
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profitability Export */}
        <div className="bg-cardBg rounded-xl border border-slate-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-400">
              <TrendingUp size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100">Profitability Report</h3>
              <p className="text-sm text-slate-400">Daily spend, revenue, profit & ROI</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 flex-1">
                <span className="text-sm text-slate-400 whitespace-nowrap">From</span>
                <input
                  type="date"
                  value={profitStart}
                  onChange={(e) => setProfitStart(e.target.value)}
                  className="bg-darkBg border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-neonGreen w-full"
                />
              </div>
              <div className="flex items-center gap-2 flex-1">
                <span className="text-sm text-slate-400 whitespace-nowrap">To</span>
                <input
                  type="date"
                  value={profitEnd}
                  onChange={(e) => setProfitEnd(e.target.value)}
                  className="bg-darkBg border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-neonGreen w-full"
                />
              </div>
            </div>
            <button
              onClick={() => exportService.downloadProfitability(profitStart, profitEnd)}
              className="w-full bg-neonGreen hover:bg-emerald-400 text-darkBg px-4 py-3 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2"
            >
              <Download size={16} /> Download CSV
            </button>
          </div>
        </div>

        {/* GEO Export */}
        <div className="bg-cardBg rounded-xl border border-slate-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-lg bg-sky-500/10 text-sky-400">
              <Globe size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100">GEO Report</h3>
              <p className="text-sm text-slate-400">Per-country breakdown with impressions</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 flex-1">
                <span className="text-sm text-slate-400 whitespace-nowrap">Date</span>
                <input
                  type="date"
                  value={geoDate}
                  onChange={(e) => setGeoDate(e.target.value)}
                  className="bg-darkBg border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-neonGreen w-full"
                />
              </div>
            </div>
            <button
              onClick={() => exportService.downloadGeo(geoDate)}
              className="w-full bg-sky-500 hover:bg-sky-400 text-white px-4 py-3 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2"
            >
              <Download size={16} /> Download CSV
            </button>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="bg-cardBg rounded-xl border border-slate-700 p-5">
        <p className="text-sm text-slate-400">
          💡 <strong className="text-slate-300">Tip:</strong> CSV files can be opened in Excel, Google Sheets, or any spreadsheet application. 
          Make sure to sync your data first before exporting to get the latest numbers.
        </p>
      </div>
    </div>
  );
}
