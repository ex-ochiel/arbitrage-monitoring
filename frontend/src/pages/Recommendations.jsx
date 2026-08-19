import React, { useState, useEffect } from 'react';
import { Lightbulb, PauseCircle, TrendingDown, Rocket, RefreshCw, XCircle, AlertTriangle, Info } from 'lucide-react';
import { recommendationService } from '../services/api';
import { useAccount } from '../context/AccountContext';

const typeConfig = {
  pause: { icon: PauseCircle, color: 'text-vibrantRed', bg: 'bg-vibrantRed/10', border: 'border-vibrantRed/20', action: 'Pause Campaign' },
  reduce_bid: { icon: TrendingDown, color: 'text-amberWarning', bg: 'bg-amberWarning/10', border: 'border-amberWarning/20', action: 'Lower Bid' },
  scale: { icon: Rocket, color: 'text-neonGreen', bg: 'bg-neonGreen/10', border: 'border-neonGreen/20', action: 'Scale Up' },
  sync: { icon: RefreshCw, color: 'text-sky-400', bg: 'bg-sky-400/10', border: 'border-sky-400/20', action: 'Sync Now' },
};

const severityIcons = {
  critical: XCircle,
  warning: AlertTriangle,
  info: Info,
};

export default function Recommendations() {
  const [recs, setRecs] = useState([]);
  const [loading, setLoading] = useState(true);
  const { selectedAccountId } = useAccount();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await recommendationService.getRecommendations(selectedAccountId);
        setRecs(data);
      } catch (error) {
        console.error("Failed to fetch recommendations", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="p-8 text-slate-400">Analyzing data...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <Lightbulb className="text-neonGreen" /> Recommendations
        </h2>
        <p className="text-sm text-slate-500">Based on today's performance data</p>
      </div>

      {recs.length === 0 ? (
        <div className="bg-cardBg rounded-xl border border-slate-700 p-12 text-center">
          <Lightbulb size={48} className="text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-400">All looks good!</h3>
          <p className="text-sm text-slate-500 mt-1">No actionable recommendations at the moment.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {recs.map((rec, i) => {
            const config = typeConfig[rec.type] || typeConfig.sync;
            const Icon = config.icon;
            const SevIcon = severityIcons[rec.severity] || Info;

            return (
              <div key={i} className={`p-5 rounded-xl border ${config.bg} ${config.border} transition-all hover:shadow-lg`}>
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg ${config.bg} ${config.color} shrink-0`}>
                    <Icon size={24} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <SevIcon size={14} className={config.color} />
                      <span className={`text-xs font-bold uppercase ${config.color}`}>
                        {rec.severity}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-100">{rec.title}</h3>
                    <p className="text-sm text-slate-400 mt-1">{rec.message}</p>
                  </div>
                  <div className="shrink-0">
                    <span className={`px-3 py-1.5 rounded-lg text-xs font-bold ${config.bg} ${config.color} border ${config.border}`}>
                      {config.action}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="bg-cardBg rounded-xl border border-slate-700 p-5">
        <p className="text-sm text-slate-400">
          💡 <strong className="text-slate-300">How it works:</strong> Recommendations are generated automatically by analyzing today's synced data.
          Campaigns with ROI below -60% get "Pause" suggestions. Countries with ROI above +30% get "Scale Up" suggestions.
        </p>
      </div>
    </div>
  );
}
