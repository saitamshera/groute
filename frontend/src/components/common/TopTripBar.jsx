import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  Play,
  CheckCircle,
  Users,
  Navigation
} from 'lucide-react';
import useTripStore, { selectTravelers } from '../../store/tripStore.js';
import useAuthStore from '../../store/authStore.js';

export function TopTripBar({ onStartTrip, onEndTrip }) {
  const {
    trip,
    isOwner,
    groupEta,
    members,
    liveLocations,
    isDrawerOpen,
    setDrawerOpen,
    activeDrawerTab,
    setActiveDrawerTab
  } = useTripStore();

  const { user } = useAuthStore();

  if (!trip) return null;

  const isActive = trip.status === 'ACTIVE';
  const travelers = selectTravelers(members, liveLocations, user?.id);
  const stoppedCount = travelers.filter(t => t.status === 'STOPPED' || t.status === 'POSSIBLE_STOP').length;
  const splitCount = travelers.filter(t => t.status === 'SPLIT' || t.status === 'FALLING_BEHIND').length;

  const handleToggleDrawer = (tab = 'MEMBERS') => {
    if (isDrawerOpen && activeDrawerTab === tab) {
      setDrawerOpen(false);
    } else {
      setActiveDrawerTab(tab);
      setDrawerOpen(true);
    }
  };

  return (
    <div className="absolute top-2.5 sm:top-3 left-2.5 right-2.5 sm:left-4 sm:right-4 z-30 pointer-events-none flex items-center justify-between gap-1.5 sm:gap-2">
      {/* Sleek Compact Google Maps Navigation Bar */}
      <div className="pointer-events-auto flex items-center gap-1 sm:gap-2 bg-white/95 backdrop-blur-md border border-[#dadce0] p-1 sm:p-1.5 rounded-full shadow-md hover:shadow-lg transition-all min-w-0 max-w-[calc(100vw-110px)] sm:max-w-xl">
        {/* Back Button */}
        <Link
          to="/dashboard"
          title="Back to Dashboard"
          className="p-1.5 sm:p-2 rounded-full text-[#5f6368] hover:text-[#202124] hover:bg-[#f1f3f4] transition-colors shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>

        {/* Route Title & Status */}
        <div className="flex items-center gap-1 sm:gap-1.5 px-1 sm:px-2 min-w-0">
          <Navigation className="w-3.5 h-3.5 text-[#1a73e8] shrink-0 transform -rotate-45 hidden xs:block" />
          <span className="text-xs sm:text-sm font-bold text-[#202124] truncate leading-tight">
            {trip.origin} → {trip.destination}
          </span>
          <span
            className={`hidden sm:inline-flex px-2 py-0.2 rounded-full text-[9px] font-extrabold uppercase shrink-0 ${
              isActive
                ? 'bg-[#e6f4ea] text-[#137333] border border-[#ceead6]'
                : 'bg-[#f1f3f4] text-[#5f6368] border border-[#dadce0]'
            }`}
          >
            {isActive ? '● Live' : trip.status}
          </span>
        </div>

        {/* Clustered Group ETA */}
        <div className="hidden md:flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#f8f9fa] border border-[#dadce0] text-xs shrink-0">
          <Clock className="w-3 h-3 text-[#1a73e8]" />
          <span className="font-mono font-bold text-[#1a73e8] text-[11px]">
            {groupEta?.formattedEta || 'Calculating...'}
          </span>
        </div>

        {/* Owner Action Buttons */}
        {isOwner && trip.status === 'PLANNED' && (
          <button
            onClick={onStartTrip}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#1e8e3e] hover:bg-[#137333] text-white font-bold text-xs shadow-xs transition-colors shrink-0"
          >
            <Play className="w-3 h-3" />
            <span className="hidden sm:inline">Start</span>
          </button>
        )}

        {isOwner && isActive && (
          <button
            onClick={onEndTrip}
            className="flex items-center gap-1 px-2 py-1 rounded-full bg-white hover:bg-[#fce8e6] text-[#d93025] font-bold text-xs border border-[#dadce0] hover:border-[#d93025] transition-colors shrink-0"
          >
            <CheckCircle className="w-3 h-3" />
            <span className="hidden sm:inline">End</span>
          </button>
        )}
      </div>

      {/* Convoy Travelers Quick Trigger Pill (Top-Right) */}
      <div className="pointer-events-auto shrink-0">
        <button
          onClick={() => handleToggleDrawer('MEMBERS')}
          className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-full border shadow-md transition-all text-xs font-bold shrink-0 ${
            isDrawerOpen && activeDrawerTab === 'MEMBERS'
              ? 'bg-[#1a73e8] text-white border-[#1a73e8]'
              : 'bg-white/95 backdrop-blur-md text-[#202124] border-[#dadce0] hover:bg-[#f8f9fa]'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>{travelers.length}</span>
          <span className="hidden sm:inline">Travelers</span>

          {/* Micro status alerts */}
          {stoppedCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-[#d93025] text-white text-[9px] font-bold">
              {stoppedCount} 🛑
            </span>
          )}
          {splitCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-[#f9ab00] text-[#202124] text-[9px] font-bold">
              {splitCount} ⚠
            </span>
          )}
        </button>
      </div>
    </div>
  );
}

export default TopTripBar;
