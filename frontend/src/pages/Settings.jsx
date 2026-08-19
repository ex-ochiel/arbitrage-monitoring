import React, { useState } from 'react';
import { Settings as SettingsIcon, Plus, Edit2, Trash2, X, RefreshCw, Eye, EyeOff, Shield } from 'lucide-react';
import { accountService, settingsService } from '../services/api';
import { useAccount } from '../context/AccountContext';

export default function Settings() {
  const { accounts, refreshAccounts } = useAccount();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [form, setForm] = useState({ label: '', popadsApiKey: '', adsterraApiKey: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showKeys, setShowKeys] = useState({});
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const openCreateModal = () => {
    setEditingAccount(null);
    setForm({ label: '', popadsApiKey: '', adsterraApiKey: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (acc) => {
    setEditingAccount(acc);
    setForm({
      label: acc.label,
      popadsApiKey: acc.popadsKey,   // masked value
      adsterraApiKey: acc.adsterraKey // masked value
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingAccount(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editingAccount) {
        await accountService.update(editingAccount.id, form);
      } else {
        await accountService.create(form.label, form.popadsApiKey, form.adsterraApiKey);
      }
      await refreshAccounts();
      closeModal();
    } catch (error) {
      alert('Failed to save: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await accountService.delete(id);
      await refreshAccounts();
      setDeleteConfirm(null);
    } catch (error) {
      alert('Failed to delete: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const res = await settingsService.triggerSync();
      alert(res.message || 'Sync completed!');
    } catch (err) {
      alert('Sync failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsSyncing(false);
    }
  };

  const toggleShowKey = (id, field) => {
    setShowKeys(prev => ({ ...prev, [`${id}_${field}`]: !prev[`${id}_${field}`] }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <SettingsIcon className="text-neonGreen" /> Settings
        </h2>
        <div className="flex gap-3">
          <button
            onClick={handleSync}
            disabled={isSyncing || accounts.length === 0}
            className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw size={16} className={isSyncing ? "animate-spin" : ""} />
            {isSyncing ? "Syncing All..." : "Sync All Accounts"}
          </button>
          <button
            onClick={openCreateModal}
            className="bg-neonGreen hover:bg-emerald-400 text-darkBg px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <Plus size={16} /> Add Account Pair
          </button>
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-sky-500/5 border border-sky-500/20 rounded-xl p-4 flex gap-3 items-start">
        <Shield className="text-sky-400 shrink-0 mt-0.5" size={20} />
        <div>
          <p className="text-sm text-slate-200 font-medium">Account Pairs</p>
          <p className="text-xs text-slate-400 mt-1">
            Each pair bundles 1 PopAds API key + 1 Adsterra API key. All data is synced and viewed per-pair.
            Use the Account Switcher in the sidebar to switch between accounts.
          </p>
        </div>
      </div>

      {/* Account list */}
      {accounts.length === 0 ? (
        <div className="bg-cardBg rounded-xl border border-slate-700 p-12 text-center">
          <SettingsIcon size={48} className="text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-400">No accounts configured</h3>
          <p className="text-sm text-slate-500 mt-1 mb-6">
            Add your first account pair to start monitoring your arbitrage performance.
          </p>
          <button
            onClick={openCreateModal}
            className="bg-neonGreen hover:bg-emerald-400 text-darkBg px-6 py-3 rounded-lg text-sm font-bold transition-colors inline-flex items-center gap-2"
          >
            <Plus size={18} /> Add Your First Account
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {accounts.map(acc => (
            <div key={acc.id} className="bg-cardBg rounded-xl border border-slate-700 p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-3 h-3 rounded-full bg-neonGreen" />
                    <h3 className="text-lg font-bold text-slate-100">{acc.label}</h3>
                    {acc.isActive && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neonGreen/10 text-neonGreen uppercase">Active</span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* PopAds Key */}
                    <div className="bg-darkBg rounded-lg p-4 border border-slate-700">
                      <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-medium">PopAds API Key</p>
                      <div className="flex items-center gap-2">
                        <code className="text-sm text-sky-400 font-mono flex-1 truncate">
                          {showKeys[`${acc.id}_popads`] ? 'Encrypted — edit to change' : acc.popadsKey}
                        </code>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neonGreen/10 text-neonGreen uppercase">Configured</span>
                      </div>
                    </div>

                    {/* Adsterra Key */}
                    <div className="bg-darkBg rounded-lg p-4 border border-slate-700">
                      <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-medium">Adsterra API Key</p>
                      <div className="flex items-center gap-2">
                        <code className="text-sm text-sky-400 font-mono flex-1 truncate">
                          {showKeys[`${acc.id}_adsterra`] ? 'Encrypted — edit to change' : acc.adsterraKey}
                        </code>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neonGreen/10 text-neonGreen uppercase">Configured</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => openEditModal(acc)}
                    className="p-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
                    title="Edit"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(acc.id)}
                    className="p-2 rounded-lg bg-red-500/10 text-vibrantRed hover:bg-red-500/20 transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Delete confirm */}
              {deleteConfirm === acc.id && (
                <div className="mt-4 p-4 rounded-lg bg-red-500/5 border border-red-500/20 flex items-center justify-between">
                  <p className="text-sm text-vibrantRed">Delete "{acc.label}"? All data for this account will be permanently removed.</p>
                  <div className="flex gap-2 shrink-0 ml-4">
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleDelete(acc.id)}
                      className="px-3 py-1.5 text-xs font-bold bg-vibrantRed text-white rounded-lg hover:bg-red-600 transition-colors"
                    >
                      Yes, Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-cardBg border border-slate-700 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
              <h3 className="font-bold text-lg text-slate-100 flex items-center gap-2">
                {editingAccount ? <Edit2 size={18} className="text-neonGreen" /> : <Plus size={18} className="text-neonGreen" />}
                {editingAccount ? 'Edit Account Pair' : 'New Account Pair'}
              </h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Account Label</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Akun Utama, Site A"
                  value={form.label}
                  onChange={(e) => setForm({...form, label: e.target.value})}
                  className="w-full bg-darkBg border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-neonGreen placeholder:text-slate-600"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">PopAds API Key</label>
                <input
                  type="text"
                  required={!editingAccount}
                  placeholder={editingAccount ? "Leave unchanged or paste new key" : "Paste your PopAds API key"}
                  value={form.popadsApiKey}
                  onFocus={() => { if (form.popadsApiKey.startsWith('••••')) setForm({...form, popadsApiKey: ''}); }}
                  onChange={(e) => setForm({...form, popadsApiKey: e.target.value})}
                  className="w-full bg-darkBg border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-neonGreen font-mono text-sm placeholder:text-slate-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Adsterra API Key</label>
                <input
                  type="text"
                  required={!editingAccount}
                  placeholder={editingAccount ? "Leave unchanged or paste new key" : "Paste your Adsterra API key"}
                  value={form.adsterraApiKey}
                  onFocus={() => { if (form.adsterraApiKey.startsWith('••••')) setForm({...form, adsterraApiKey: ''}); }}
                  onChange={(e) => setForm({...form, adsterraApiKey: e.target.value})}
                  className="w-full bg-darkBg border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-neonGreen font-mono text-sm placeholder:text-slate-600"
                />
              </div>

              <div className="pt-2 flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2.5 text-sm font-medium text-slate-300 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="bg-neonGreen hover:bg-emerald-400 text-darkBg px-6 py-2.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <><RefreshCw size={16} className="animate-spin" /> Saving...</>
                  ) : editingAccount ? (
                    "Update Account"
                  ) : (
                    "Create Account"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
