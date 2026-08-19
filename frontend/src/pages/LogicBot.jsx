import React, { useState, useEffect } from 'react';
import { Bot, Plus, Trash2, Power, AlertTriangle } from 'lucide-react';
import { botLogicService } from '../services/api';
import { useAccount } from '../context/AccountContext';

export default function LogicBot() {
  const { currentAccount } = useAccount();
  const [rules, setRules] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({ campaignId: '', threshold: '1.0' });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (currentAccount) {
      loadRules();
    } else {
      setRules([]);
      setIsLoading(false);
    }
  }, [currentAccount]);

  const loadRules = async () => {
    setIsLoading(true);
    try {
      const data = await botLogicService.getAll(currentAccount.id);
      setRules(data);
    } catch (error) {
      console.error('Failed to load bot rules:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = async (id, currentStatus) => {
    try {
      // Optimistic update
      setRules(rules.map(r => r.id === id ? { ...r, isActive: !currentStatus } : r));
      await botLogicService.toggleActive(id, !currentStatus);
    } catch (error) {
      // Revert on error
      alert('Failed to toggle rule.');
      setRules(rules.map(r => r.id === id ? { ...r, isActive: currentStatus } : r));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this bot rule?')) return;
    try {
      await botLogicService.delete(id);
      setRules(rules.filter(r => r.id !== id));
    } catch (error) {
      alert('Failed to delete rule.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentAccount) return;
    
    setIsSaving(true);
    try {
      await botLogicService.create(currentAccount.id, form.campaignId, form.threshold);
      setIsModalOpen(false);
      setForm({ campaignId: '', threshold: '1.0' });
      loadRules();
    } catch (error) {
      alert('Failed to save rule: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsSaving(false);
    }
  };

  if (!currentAccount) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400">
        <Bot size={48} className="mb-4 opacity-20" />
        <p>Please select an account in the sidebar to configure Logic Bot.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Bot className="text-neonGreen" /> Logic Bot
          </h2>
          <p className="text-sm text-slate-400 mt-1">Automate your campaign optimizations based on performance metrics.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-neonGreen hover:bg-emerald-400 text-darkBg px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
        >
          <Plus size={16} /> Add Rule
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex gap-3 items-start">
        <AlertTriangle className="text-amber-400 shrink-0 mt-0.5" size={20} />
        <div>
          <p className="text-sm text-slate-200 font-medium">How it works</p>
          <p className="text-xs text-slate-400 mt-1">
            Logic Bot runs automatically every time your data syncs (e.g. every 5-15 mins).
            If a country's CPM falls below your specified threshold, the bot will <b>automatically</b> exclude it from your PopAds campaign.
            <br/><br/>
            Currently bound to Account Pair: <span className="font-bold text-white">{currentAccount.label}</span>
          </p>
        </div>
      </div>

      {/* Rules List */}
      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-neonGreen border-t-transparent rounded-full animate-spin"></div></div>
      ) : rules.length === 0 ? (
        <div className="bg-cardBg rounded-xl border border-slate-700 p-12 text-center">
          <Bot size={48} className="text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-400">No active rules</h3>
          <p className="text-sm text-slate-500 mt-1 mb-6">
            Add a CPM protection rule to start automating your arbitrage.
          </p>
          <button onClick={() => setIsModalOpen(true)} className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-2 rounded-lg text-sm transition-colors">
            Create First Rule
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {rules.map(rule => (
            <div key={rule.id} className="bg-cardBg border border-slate-700 rounded-xl p-5 relative overflow-hidden group hover:border-slate-500 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="text-xs text-slate-500 font-mono mb-1">PopAds Campaign ID</div>
                  <div className="text-xl font-bold text-white">{rule.campaignId}</div>
                </div>
                <button
                  onClick={() => handleToggle(rule.id, rule.isActive)}
                  className={`p-1.5 rounded-full transition-colors ${rule.isActive ? 'bg-neonGreen/20 text-neonGreen' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
                  title={rule.isActive ? 'Active - Click to pause' : 'Paused - Click to activate'}
                >
                  <Power size={18} />
                </button>
              </div>

              <div className="bg-darkBg rounded-lg p-3 border border-slate-700 mb-4">
                <div className="text-xs text-slate-400 mb-1">Action Condition</div>
                <div className="text-sm font-medium text-sky-400">Exclude Country if CPM &lt; {rule.threshold.toFixed(2)}</div>
              </div>

              <div className="flex justify-between items-center text-xs text-slate-500">
                <span>Created {new Date(rule.createdAt).toLocaleDateString()}</span>
                <button
                  onClick={() => handleDelete(rule.id)}
                  className="text-slate-400 hover:text-vibrantRed transition-colors flex items-center gap-1"
                >
                  <Trash2 size={14} /> Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-cardBg border border-slate-700 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-slate-700 bg-slate-800/50">
              <h3 className="font-bold text-lg text-slate-100 flex items-center gap-2">
                <Bot size={18} className="text-neonGreen" /> New Logic Rule
              </h3>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">PopAds Campaign ID</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 123456"
                  value={form.campaignId}
                  onChange={(e) => setForm({...form, campaignId: e.target.value})}
                  className="w-full bg-darkBg border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-neonGreen"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Minimum CPM Threshold</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={form.threshold}
                  onChange={(e) => setForm({...form, threshold: e.target.value})}
                  className="w-full bg-darkBg border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-neonGreen"
                />
                <p className="text-xs text-slate-500 mt-1">If a country's CPM falls below this value, it will be excluded.</p>
              </div>

              <div className="pt-4 flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="bg-neonGreen hover:bg-emerald-400 text-darkBg px-6 py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-70"
                >
                  {isSaving ? "Saving..." : "Add Rule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
