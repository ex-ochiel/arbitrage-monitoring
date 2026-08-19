import React, { useState, useEffect } from 'react';
import { User, Shield, Trash2, Plus, Lock } from 'lucide-react';
import { authService } from '../services/api';

export default function AccountSettings() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const currentUser = authService.getUser();

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await authService.getUsers();
      setUsers(data);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch users:", err);
      setError("Failed to load users. Are you an admin?");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreating(true);
    setFormError('');
    setSuccessMsg('');

    try {
      await authService.createUser(username, password, role);
      setSuccessMsg(`User ${username} created successfully!`);
      setUsername('');
      setPassword('');
      setRole('user');
      fetchUsers(); // Refresh list
    } catch (err) {
      setFormError(err.response?.data?.error || err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteUser = async (id, usernameToDelete) => {
    if (id === currentUser?.id) {
      alert("You cannot delete your own account!");
      return;
    }
    
    if (window.confirm(`Are you sure you want to delete user "${usernameToDelete}"?`)) {
      try {
        await authService.deleteUser(id);
        fetchUsers();
      } catch (err) {
        alert("Failed to delete user: " + (err.response?.data?.error || err.message));
      }
    }
  };

  if (currentUser?.role !== 'admin') {
    return (
      <div className="p-8 text-center bg-cardBg rounded-xl border border-vibrantRed/30 text-vibrantRed">
        <Shield className="mx-auto mb-4" size={48} />
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="mt-2 text-sm">You do not have permission to view this page. Super Admin access required.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold text-slate-100">Account Settings</h2>
        <p className="text-slate-400 text-sm mt-1">Manage users and roles (Admin only)</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Create User Form */}
        <div className="bg-cardBg rounded-xl border border-slate-700 p-6 h-fit">
          <h3 className="text-lg font-bold mb-4 text-slate-100 flex items-center gap-2">
            <Plus size={20} className="text-neonGreen" /> Create New User
          </h3>
          
          <form onSubmit={handleCreateUser} className="space-y-4">
            {formError && (
              <div className="bg-vibrantRed/10 border border-vibrantRed/20 text-vibrantRed text-sm p-3 rounded-lg">
                {formError}
              </div>
            )}
            {successMsg && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm p-3 rounded-lg">
                {successMsg}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Username</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  placeholder="Enter username"
                  className="w-full bg-darkBg border border-slate-600 rounded-lg pl-10 pr-4 py-2 text-slate-200 text-sm focus:border-neonGreen outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Min. 6 characters"
                  className="w-full bg-darkBg border border-slate-600 rounded-lg pl-10 pr-4 py-2 text-slate-200 text-sm focus:border-neonGreen outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Role</label>
              <div className="relative">
                <Shield size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-darkBg border border-slate-600 rounded-lg pl-10 pr-4 py-2 text-slate-200 text-sm focus:border-neonGreen outline-none appearance-none"
                >
                  <option value="user">Regular User</option>
                  <option value="admin">Super Admin</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={creating}
              className="w-full bg-neonGreen hover:bg-emerald-400 text-darkBg font-bold py-2 rounded-lg text-sm transition-colors mt-2 disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create Account'}
            </button>
          </form>
        </div>

        {/* User List */}
        <div className="md:col-span-2 bg-cardBg rounded-xl border border-slate-700 p-6 overflow-hidden">
          <h3 className="text-lg font-bold mb-4 text-slate-100 flex items-center gap-2">
            <User size={20} className="text-sky-400" /> Existing Users
          </h3>

          {loading ? (
            <div className="animate-pulse space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-12 bg-slate-800 rounded" />)}
            </div>
          ) : error ? (
            <div className="text-vibrantRed text-sm">{error}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase tracking-wider">
                    <th className="pb-3 font-medium">Username</th>
                    <th className="pb-3 font-medium">Role</th>
                    <th className="pb-3 font-medium">Joined</th>
                    <th className="pb-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {users.map(user => (
                    <tr key={user.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                      <td className="py-4 text-slate-200 font-medium">
                        {user.username}
                        {user.id === currentUser?.id && <span className="ml-2 text-xs bg-sky-500/20 text-sky-400 px-2 py-0.5 rounded">You</span>}
                      </td>
                      <td className="py-4">
                        <span className={`text-xs px-2 py-1 rounded ${user.role === 'admin' ? 'bg-amberWarning/20 text-amberWarning' : 'bg-slate-700 text-slate-300'}`}>
                          {user.role === 'admin' ? 'Super Admin' : 'User'}
                        </span>
                      </td>
                      <td className="py-4 text-slate-400">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-4 text-right">
                        {user.id !== currentUser?.id && (
                          <button
                            onClick={() => handleDeleteUser(user.id, user.username)}
                            className="text-slate-500 hover:text-vibrantRed transition-colors p-1"
                            title="Delete user"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
