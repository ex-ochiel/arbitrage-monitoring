import React, { useState, useEffect } from 'react';
import { Target, Play, Pause, Edit2, RefreshCw, X, CheckSquare, Square, MinusSquare } from 'lucide-react';
import { campaignService } from '../services/api';
import Pagination from '../components/ui/Pagination';
import SortableHeader, { useTableControls } from '../components/ui/SortableHeader';
import { useAccount } from '../context/AccountContext';

export default function Campaigns() {
  const [campaignsData, setCampaignsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [editForm, setEditForm] = useState({ bid: '', budget: '' });
  const [isSaving, setIsSaving] = useState(false);
  const { selectedAccountId } = useAccount();

  const { paginatedData, sort, setSort, page, setPage, pageSize, setPageSize, totalPages, totalItems } = useTableControls(campaignsData, 25);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const data = await campaignService.getCampaigns(selectedAccountId);
      setCampaignsData(data);
    } catch (error) {
      console.error("Failed to fetch campaigns", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusToggle = async (id, currentStatus) => {
    const newStatus = currentStatus.toLowerCase() === 'paused' || currentStatus.toLowerCase() === 'rejected' ? 'Active' : 'Paused';
    setUpdatingId(id);
    try {
      await campaignService.updateCampaignStatus(id, newStatus, selectedAccountId);
      setCampaignsData(prev => prev.map(c => 
        c.id === id ? { ...c, status: newStatus } : c
      ));
    } catch (error) {
      alert("Failed to update status: " + (error.response?.data?.error || error.message));
    } finally {
      setUpdatingId(null);
    }
  };

  // Bulk actions
  const handleBulkAction = async (action) => {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    const newStatus = action === 'pause' ? 'Paused' : 'Active';
    
    try {
      const promises = Array.from(selectedIds).map(id => 
        campaignService.updateCampaignStatus(id, newStatus, selectedAccountId)
      );
      await Promise.allSettled(promises);

      setCampaignsData(prev => prev.map(c => 
        selectedIds.has(c.id) ? { ...c, status: newStatus } : c
      ));
      setSelectedIds(new Set());
    } catch (error) {
      alert("Some bulk actions failed: " + (error.message || 'Unknown error'));
    } finally {
      setBulkLoading(false);
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedData.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedData.map(c => c.id)));
    }
  };

  const openEditModal = (campaign) => {
    setEditingCampaign(campaign);
    setEditForm({ 
      bid: campaign.bid || 0, 
      budget: campaign.budget || 0 
    });
    setIsModalOpen(true);
  };

  const closeEditModal = () => {
    setIsModalOpen(false);
    setEditingCampaign(null);
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await campaignService.updateCampaignSettings(editingCampaign.id, {
        bid: editForm.bid,
        budget: editForm.budget
      }, selectedAccountId);
      setCampaignsData(prev => prev.map(c => 
        c.id === editingCampaign.id ? { ...c, bid: parseFloat(editForm.bid), budget: parseFloat(editForm.budget) } : c
      ));
      closeEditModal();
    } catch (error) {
      alert("Failed to update settings: " + (error.response?.data?.error || error.message));
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-slate-700 rounded" />
        <div className="h-96 bg-slate-800 rounded-xl" />
      </div>
    );
  }

  const allSelected = paginatedData.length > 0 && selectedIds.size === paginatedData.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < paginatedData.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <Target className="text-neonGreen" /> PopAds Campaigns
        </h2>

        {/* Bulk action bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 bg-slate-800/80 border border-slate-600 rounded-xl px-4 py-2">
            <span className="text-xs text-slate-300 font-medium">
              {selectedIds.size} selected
            </span>
            <button
              onClick={() => handleBulkAction('pause')}
              disabled={bulkLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amberWarning/10 text-amberWarning hover:bg-amberWarning/20 transition-colors disabled:opacity-50"
            >
              <Pause size={14} /> Pause All
            </button>
            <button
              onClick={() => handleBulkAction('resume')}
              disabled={bulkLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-neonGreen/10 text-neonGreen hover:bg-neonGreen/20 transition-colors disabled:opacity-50"
            >
              <Play size={14} /> Resume All
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      <div className="bg-cardBg rounded-xl border border-slate-700 p-6 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase tracking-wider">
                <th className="pb-3 px-4 font-medium w-10">
                  <button onClick={toggleSelectAll} className="text-slate-400 hover:text-white transition-colors">
                    {allSelected ? <CheckSquare size={16} className="text-neonGreen" /> 
                      : someSelected ? <MinusSquare size={16} className="text-neonGreen" /> 
                      : <Square size={16} />}
                  </button>
                </th>
                <SortableHeader label="Campaign Name" sortKey="name" currentSort={sort} onSort={setSort} />
                <th className="pb-3 px-4 font-medium">ID</th>
                <SortableHeader label="Bid" sortKey="bid" currentSort={sort} onSort={setSort} />
                <SortableHeader label="Daily Budget" sortKey="budget" currentSort={sort} onSort={setSort} />
                <SortableHeader label="Spend" sortKey="spend" currentSort={sort} onSort={setSort} />
                <SortableHeader label="Status" sortKey="status" currentSort={sort} onSort={setSort} />
                <th className="pb-3 px-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 px-4 text-center text-slate-500">
                    <Target size={48} className="mx-auto mb-4 text-slate-600" />
                    <p className="text-lg font-medium text-slate-400">No campaigns found</p>
                    <p className="text-sm mt-1">Sync your PopAds data to see campaigns here.</p>
                  </td>
                </tr>
              ) : (
                paginatedData.map((campaign) => (
                  <tr key={campaign.id} className={`border-b border-slate-800 hover:bg-slate-800/50 transition-colors ${selectedIds.has(campaign.id) ? 'bg-neonGreen/5' : ''}`}>
                    <td className="py-4 px-4">
                      <button onClick={() => toggleSelect(campaign.id)} className="text-slate-400 hover:text-white transition-colors">
                        {selectedIds.has(campaign.id) 
                          ? <CheckSquare size={16} className="text-neonGreen" /> 
                          : <Square size={16} />}
                      </button>
                    </td>
                    <td className="py-4 px-4 font-bold text-slate-200">{campaign.name}</td>
                    <td className="py-4 px-4 text-slate-400">#{campaign.id}</td>
                    <td className="py-4 px-4 text-slate-300">${campaign.bid.toFixed(4)}</td>
                    <td className="py-4 px-4 text-slate-300">${campaign.budget.toFixed(2)}</td>
                    <td className="py-4 px-4 text-slate-300">${campaign.spend.toFixed(2)}</td>
                    <td className="py-4 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium uppercase ${
                        campaign.status.toLowerCase() === 'paused' || campaign.status.toLowerCase() === 'rejected' || campaign.status.toLowerCase() === 'out_of_money'
                          ? 'bg-slate-700 text-slate-400' 
                          : 'bg-neonGreen/10 text-neonGreen'
                      }`}>
                        {campaign.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-4 px-4 flex justify-end gap-2">
                      {updatingId === campaign.id ? (
                        <button className="p-1.5 rounded bg-slate-700 text-slate-400 cursor-not-allowed">
                          <RefreshCw size={16} className="animate-spin" />
                        </button>
                      ) : campaign.status.toLowerCase() === 'paused' || campaign.status.toLowerCase() === 'rejected' ? (
                        <button 
                          onClick={() => handleStatusToggle(campaign.id, campaign.status)}
                          className="p-1.5 rounded bg-neonGreen/10 text-neonGreen hover:bg-neonGreen/20 transition-colors" 
                          title="Resume"
                        >
                          <Play size={16} />
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleStatusToggle(campaign.id, campaign.status)}
                          className="p-1.5 rounded bg-amberWarning/10 text-amberWarning hover:bg-amberWarning/20 transition-colors" 
                          title="Pause"
                        >
                          <Pause size={16} />
                        </button>
                      )}
                      <button 
                        onClick={() => openEditModal(campaign)}
                        className="p-1.5 rounded bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors" 
                        title="Edit Bid/Budget"
                      >
                        <Edit2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
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

      {/* Edit Modal */}
      {isModalOpen && editingCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-cardBg border border-slate-700 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
              <h3 className="font-bold text-lg text-slate-100 flex items-center gap-2">
                <Edit2 size={18} className="text-neonGreen" />
                Edit Settings
              </h3>
              <button onClick={closeEditModal} className="text-slate-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSaveSettings} className="p-6 space-y-4">
              <div>
                <p className="text-sm text-slate-400 mb-4">
                  Updating settings for: <span className="font-bold text-white">{editingCampaign.name}</span> (#{editingCampaign.id})
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Max Bid ($)</label>
                <input
                  type="number"
                  step="0.0001"
                  min="0.0001"
                  required
                  value={editForm.bid}
                  onChange={(e) => setEditForm({...editForm, bid: e.target.value})}
                  className="w-full bg-darkBg border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-neonGreen"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Daily Budget ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={editForm.budget}
                  onChange={(e) => setEditForm({...editForm, budget: e.target.value})}
                  className="w-full bg-darkBg border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-neonGreen"
                />
              </div>

              <div className="pt-4 flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="bg-neonGreen hover:bg-emerald-400 text-darkBg px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <><RefreshCw size={16} className="animate-spin" /> Saving...</>
                  ) : (
                    "Save Changes"
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
