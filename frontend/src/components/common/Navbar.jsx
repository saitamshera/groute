import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Navigation, Users, MapPin, Shield, LogOut, Radio } from 'lucide-react';
import useAuthStore from '../../store/authStore.js';
import useTripStore from '../../store/tripStore.js';

export function Navbar() {
  const { user, logout, isAuthenticated } = useAuthStore();
  const { connectionStatus, trip } = useTripStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!isAuthenticated) return null;

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/dashboard" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-brand-500/20 group-hover:scale-105 transition-transform">
            <Navigation className="w-5 h-5 text-white transform -rotate-45" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display text-xl font-bold tracking-tight text-white">
                Group<span className="text-brand-400">Route</span>
              </span>
              <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-400 border border-brand-500/20">
                Live
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">Location Intelligence Platform</p>
          </div>
        </Link>

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center gap-1">
          <Link
            to="/dashboard"
            className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
              location.pathname === '/dashboard'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            Dashboard
          </Link>

          {trip && trip.status === 'ACTIVE' && (
            <Link
              to={`/trips/${trip.id}`}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium bg-brand-500/15 text-brand-300 border border-brand-500/30 hover:bg-brand-500/25 transition-colors animate-pulse"
            >
              <Radio className="w-4 h-4 text-brand-400" />
              Active Trip: {trip.name}
            </Link>
          )}

          <Link
            to="/settings"
            className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
              location.pathname === '/settings'
                ? 'bg-slate-800 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            Privacy & Settings
          </Link>
        </nav>

        {/* Right User & Status */}
        <div className="flex items-center gap-3">
          {/* Socket Connection Pill */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300">
            <span
              className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected'
                  ? 'bg-emerald-400'
                  : 'bg-amber-400 animate-pulse'
              }`}
            />
            <span className="capitalize font-mono text-[11px]">{connectionStatus}</span>
          </div>

          {/* User Profile */}
          <div className="flex items-center gap-3 pl-2 border-l border-slate-800">
            <img
              src={user?.profile_image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || 'User'}`}
              alt={user?.name}
              className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 object-cover"
            />
            <div className="hidden lg:block text-left">
              <p className="text-xs font-semibold text-white leading-tight">{user?.name}</p>
              <p className="text-[10px] text-slate-400 leading-tight">{user?.email}</p>
            </div>

            <button
              onClick={handleLogout}
              title="Logout"
              className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
