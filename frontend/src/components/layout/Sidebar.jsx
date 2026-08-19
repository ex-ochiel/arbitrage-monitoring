import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Target, 
  Globe, 
  Settings,
  LogOut,
  User,
  ChevronDown
} from 'lucide-react';
import clsx from 'clsx';
import { useAccount } from '../../context/AccountContext';

const navItems = [
  { name: 'Overview', path: '/', icon: LayoutDashboard },
  { name: 'Campaigns', path: '/campaigns', icon: Target },
  { name: 'GEO Reports', path: '/geo', icon: Globe },
  { name: 'Settings', path: '/settings', icon: Settings },
];

export default function Sidebar({ user, onLogout }) {
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const { accounts, selectedAccountId, selectedAccount, selectAccount } = useAccount();

  return (
    <div className="w-64 bg-cardBg border-r border-slate-700 h-screen flex flex-col">
      <div className="p-6 pb-3">
        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <span className="text-neonGreen">⚡</span> ArbitrageX
        </h1>
      </div>

      {/* Account Switcher */}
      {accounts.length > 0 && (
        <div className="px-4 pb-4">
          <div className="relative">
            <button
              onClick={() => setSwitcherOpen(!switcherOpen)}
              className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg bg-darkBg border border-slate-700 hover:border-slate-500 transition-colors text-sm"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-2 h-2 rounded-full bg-neonGreen shrink-0" />
                <span className="text-slate-200 font-medium truncate">
                  {selectedAccount?.label || 'Select Account'}
                </span>
              </div>
              <ChevronDown size={14} className={`text-slate-400 transition-transform ${switcherOpen ? 'rotate-180' : ''}`} />
            </button>

            {switcherOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-cardBg border border-slate-700 rounded-lg shadow-2xl overflow-hidden">
                {accounts.map(acc => (
                  <button
                    key={acc.id}
                    onClick={() => { selectAccount(acc.id); setSwitcherOpen(false); }}
                    className={clsx(
                      'w-full flex items-center gap-2 px-3 py-2.5 text-sm transition-colors text-left',
                      acc.id === selectedAccountId
                        ? 'bg-neonGreen/10 text-neonGreen'
                        : 'text-slate-300 hover:bg-slate-800'
                    )}
                  >
                    <div className={clsx(
                      'w-2 h-2 rounded-full shrink-0',
                      acc.id === selectedAccountId ? 'bg-neonGreen' : 'bg-slate-600'
                    )} />
                    <span className="truncate">{acc.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive 
                    ? 'bg-slate-800 text-neonGreen' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                )
              }
            >
              <Icon size={18} />
              <span className="flex-1">{item.name}</span>
            </NavLink>
          );
        })}
      </nav>
      
      {/* User Section */}
      <div className="p-4 border-t border-slate-700 space-y-3">
        {user && (
          <div className="flex items-center gap-3">
            <div className="p-2 bg-neonGreen/10 rounded-lg">
              <User size={16} className="text-neonGreen" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-200 truncate">{user.username}</p>
              <p className="text-xs text-slate-500 capitalize">{user.role}</p>
            </div>
          </div>
        )}
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:bg-red-500/10 hover:text-vibrantRed transition-colors"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </div>
  );
}
