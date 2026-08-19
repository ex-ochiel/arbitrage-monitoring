import React, { useState, useEffect } from 'react';
import { Zap, Lock, User, Eye, EyeOff, ArrowRight, Shield, UserPlus, LogIn } from 'lucide-react';
import { authService } from '../services/api';

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await authService.checkSetupStatus();
        setNeedsSetup(res.needsSetup);
      } catch (e) {
        console.error('Failed to check auth status:', e);
      } finally {
        setCheckingStatus(false);
      }
    };
    checkStatus();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let result;
      if (needsSetup) {
        result = await authService.register(username, password);
      } else {
        result = await authService.login(username, password);
      }

      if (result.token) {
        onLoginSuccess(result.user);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Connection failed. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  if (checkingStatus) {
    return (
      <div className="min-h-screen bg-darkBg flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-neonGreen/30 border-t-neonGreen rounded-full animate-spin" />
          <span className="text-slate-400 text-sm">Connecting to server...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-darkBg flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-neonGreen/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="p-3 bg-neonGreen/10 rounded-xl border border-neonGreen/20">
              <Zap size={32} className="text-neonGreen" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-slate-100">ArbitrageX</h1>
          <p className="text-slate-500 mt-2 text-sm">
            Arbitrage Monitoring Dashboard
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-cardBg border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
          
          {/* Header */}
          <div className="p-6 border-b border-slate-700 bg-slate-800/20 text-center">
            <h2 className="text-xl font-bold text-slate-100">
              {needsSetup ? 'Create Initial Admin' : 'Sign In'}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {needsSetup ? 'Set up your master account to get started.' : 'Welcome back to ArbitrageX.'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {error && (
              <div className="bg-vibrantRed/10 border border-vibrantRed/20 text-vibrantRed text-sm p-3 rounded-lg flex items-center gap-2">
                <Lock size={14} className="shrink-0" />
                {error}
              </div>
            )}

            {needsSetup && (
              <div className="bg-neonGreen/5 border border-neonGreen/20 text-neonGreen text-xs p-3 rounded-lg flex items-center gap-2">
                <Shield size={14} className="shrink-0" />
                No admin account detected. Create your first account below.
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Username</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  required
                  autoFocus
                  className="w-full bg-darkBg border border-slate-600 rounded-lg pl-10 pr-4 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-neonGreen focus:ring-1 focus:ring-neonGreen text-sm transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={needsSetup ? 'Create a password (min 6 chars)' : 'Enter password'}
                  required
                  minLength={needsSetup ? 6 : 1}
                  className="w-full bg-darkBg border border-slate-600 rounded-lg pl-10 pr-12 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-neonGreen focus:ring-1 focus:ring-neonGreen text-sm transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-neonGreen hover:bg-emerald-400 text-darkBg font-bold py-3 rounded-lg text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-neonGreen/20 hover:shadow-neonGreen/30"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-darkBg/30 border-t-darkBg rounded-full animate-spin" />
              ) : (
                <>
                  {needsSetup ? (
                    <><UserPlus size={16} /> Create Account</>
                  ) : (
                    <><LogIn size={16} /> Sign In</>
                  )}
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="p-4 border-t border-slate-700 bg-slate-800/20">
            <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
              <Shield size={12} className="text-neonGreen" />
              Protected with JWT Authentication
            </div>
          </div>
        </div>

        {/* Bottom text */}
        <p className="text-center text-xs text-slate-600 mt-6">
          ArbitrageX Monitoring Dashboard v1.0
        </p>
      </div>
    </div>
  );
}
