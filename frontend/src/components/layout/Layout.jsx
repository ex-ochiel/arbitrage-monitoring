import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import Sidebar from './Sidebar';

export default function Layout({ user, onLogout }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Auto-close sidebar on navigation (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex h-screen bg-darkBg text-slate-200 font-sans">
      {/* Desktop sidebar — always visible */}
      <div className="hidden lg:block">
        <Sidebar user={user} onLogout={onLogout} />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          {/* Sidebar panel */}
          <div className="relative z-50 animate-slide-in-left">
            <Sidebar user={user} onLogout={onLogout} />
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-[-48px] p-2 rounded-lg bg-cardBg border border-slate-700 text-slate-400 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {/* Mobile header bar */}
        <div className="lg:hidden sticky top-0 z-30 bg-cardBg/95 backdrop-blur-sm border-b border-slate-700 px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <Menu size={20} />
          </button>
          <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <span className="text-neonGreen">⚡</span> ArbitrageX
          </h1>
        </div>
        
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
