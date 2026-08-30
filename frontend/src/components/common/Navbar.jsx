import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Navigation, LogOut, Radio } from 'lucide-react';
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
    <header className="sticky top-0 z-40 w-full bg-white border-b border-[#dadce0] shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-2">
        {/* Brand Logo */}
        <Link to="/dashboard" className="flex items-center gap-2 group shrink-0 min-w-0">
          <div className="w-8 h-8 rounded-full bg-[#e8f0fe] flex items-center justify-center border border-[#d2e3fc] shadow-xs group-hover:scale-105 transition-transform shrink-0">
            <Navigation className="w-4 h-4 text-[#1a73e8] transform -rotate-45" />
          </div>
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-display text-base sm:text-lg font-bold tracking-tight text-[#202124]">
              Group<span className="text-[#1a73e8]">Route</span>
            </span>
            <span className="text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.2 rounded-full bg-[#e6f4ea] text-[#137333] border border-[#ceead6] shrink-0">
              Live
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1.5">
          <Link
            to="/dashboard"
            className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
              location.pathname === '/dashboard'
                ? 'bg-[#e8f0fe] text-[#1a73e8]'
                : 'text-[#5f6368] hover:text-[#202124] hover:bg-[#f1f3f4]'
            }`}
          >
            Dashboard
          </Link>

          {trip && trip.status === 'ACTIVE' && (
            <Link
              to={`/trips/${trip.id}`}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#e6f4ea] text-[#137333] border border-[#ceead6] hover:bg-[#ceead6] transition-colors"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#1e8e3e] animate-pulse" />
              <span className="truncate max-w-[150px]">{trip.name}</span>
            </Link>
          )}

          <Link
            to="/settings"
            className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
              location.pathname === '/settings'
                ? 'bg-[#e8f0fe] text-[#1a73e8]'
                : 'text-[#5f6368] hover:text-[#202124] hover:bg-[#f1f3f4]'
            }`}
          >
            Settings
          </Link>
        </nav>

        {/* Right User & Live Status */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Socket Connection Pill */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#f8f9fa] border border-[#dadce0] text-xs text-[#5f6368]">
            <span
              className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected'
                  ? 'bg-[#1e8e3e]'
                  : 'bg-[#f9ab00] animate-pulse'
              }`}
            />
            <span className="capitalize font-mono text-[10px] text-[#3c4043]">{connectionStatus}</span>
          </div>

          {/* User Profile */}
          <div className="flex items-center gap-2 pl-2 border-l border-[#dadce0]">
            <img
              src={user?.profile_image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || 'User'}`}
              alt={user?.name}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#f1f3f4] border border-[#dadce0] object-cover"
            />
            <div className="hidden lg:block text-left">
              <p className="text-xs font-bold text-[#202124] leading-tight truncate max-w-[120px]">{user?.name}</p>
              <p className="text-[10px] text-[#5f6368] leading-tight truncate max-w-[120px]">{user?.email}</p>
            </div>

            <button
              onClick={handleLogout}
              title="Logout"
              className="p-1.5 rounded-full text-[#5f6368] hover:text-[#d93025] hover:bg-[#fce8e6] transition-colors"
            >
              <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
