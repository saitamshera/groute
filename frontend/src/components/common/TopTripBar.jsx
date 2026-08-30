import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  Clock,
  Play,
  CheckCircle,
  Users,
  ChevronDown
} from 'lucide-react';
import useTripStore, { selectTravelers } from '../../store/tripStore.js';
import useAuthStore from '../../store/authStore.js';
import api from '../../services/api.js';

export function TopTripBar({ onStartTrip, onEndTrip, showSimPanel, setShowSimPanel }) {
  const {
    trip,
    group,
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
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

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
    <div className="absolute top-4 left-4 right-4 z-30 pointer-events-none flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      {/* Search & Trip Navigation Bar */}
      <div className="pointer-events-auto w-full sm:w-auto flex items-center gap-2 bg-white border border-[#dadce0] p-1.5 sm:p-2 rounded-full shadow-md">
        {/* Back Button */}
        <Link
          to="/dashboard"
          title="Back to Dashboard"
          className="p-2 rounded-full text-[#5f6368] hover:text-[#202124] hover:bg-[#f1f3f4] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>

        {/* Route / Search Display */}
        <button
          onClick={() => setIsDetailsOpen(!isDetailsOpen)}
          className="flex items-center gap-2 px-2.5 py-1 rounded-full hover:bg-[#f1f3f4] transition-colors text-left min-w-0"
        >
          <div className="p-1.5 rounded-full bg-[#e8f0fe] text-[#1a73e8] shrink-0">
            <Search className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-bold text-[#202124] truncate">
                {trip.origin} → {trip.destination}
              </span>
              <span
                className={`px-2 py-0.2 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                  isActive
                    ? 'bg-[#e6f4ea] text-[#137333] border border-[#ceead6]'
                    : 'bg-[#f1f3f4] text-[#5f6368] border border-[#dadce0]'
                }`}
              >
                {trip.status}
              </span>
            </div>
            <p className="text-[10px] text-[#5f6368] truncate">
              {trip.name} · {group?.name || 'Convoy'}
            </p>
          </div>
          <ChevronDown className={`w-3.5 h-3.5 text-[#5f6368] transition-transform ${isDetailsOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Clustered Group ETA Pill */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f8f9fa] border border-[#dadce0] text-xs shrink-0">
          <Clock className="w-3.5 h-3.5 text-[#1a73e8]" />
          <div className="text-left">
            <span className="text-[9px] text-[#5f6368] uppercase block font-semibold leading-tight">ETA</span>
            <span className="font-mono text-xs font-bold text-[#1a73e8] leading-tight">
              {groupEta?.formattedEta || 'Calculating...'}
            </span>
          </div>
        </div>

        {/* Owner Quick Action */}
        {isOwner && (
          <div className="hidden sm:flex items-center gap-1 shrink-0 pl-1 border-l border-[#e0e3e7]">
            {trip.status === 'PLANNED' && (
              <button
                onClick={onStartTrip}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#1e8e3e] hover:bg-[#137333] text-white font-bold text-xs shadow-sm transition-all"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Start Trip</span>
              </button>
            )}

            {isActive && (
              <button
                onClick={onEndTrip}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white hover:bg-[#fce8e6] text-[#d93025] font-bold text-xs border border-[#dadce0] hover:border-[#d93025] transition-colors"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Complete</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Convoy Travelers Quick Trigger Pill (Top-Right) */}
      <div className="pointer-events-auto flex items-center gap-2">
        <button
          onClick={() => handleToggleDrawer('MEMBERS')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-full border shadow-md transition-all text-xs font-bold ${
            isDrawerOpen && activeDrawerTab === 'MEMBERS'
              ? 'bg-[#1a73e8] text-white border-[#1a73e8] shadow-md'
              : 'bg-white text-[#202124] border-[#dadce0] hover:bg-[#f8f9fa]'
          }`}
        >
          <Users className="w-4 h-4 text-[#1a73e8]" />
          <span>{members.length} Travelers</span>

          {/* Micro status notification bubbles */}
          {stoppedCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-[#d93025] text-white text-[10px] font-bold">
              {stoppedCount} 🛑
            </span>
          )}
          {splitCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-[#f9ab00] text-[#202124] text-[10px] font-bold">
              {splitCount} ⚠
            </span>
          )}
        </button>
      </div>

      {/* Trip Details Dropdown Card */}
      {isDetailsOpen && (
        <div className="pointer-events-auto absolute top-16 left-0 w-full sm:w-96 bg-white border border-[#dadce0] p-4 rounded-3xl shadow-xl animate-in fade-in slide-in-from-top-2 duration-150 text-xs space-y-3 z-40">
          <div className="flex items-center justify-between pb-2 border-b border-[#f1f3f4]">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#1a73e8]">Trip Overview</span>
              <h4 className="text-sm font-bold text-[#202124]">{trip.name}</h4>
            </div>
            <button
              onClick={() => setIsDetailsOpen(false)}
              className="text-[#5f6368] hover:text-[#202124] font-bold"
            >
              ✕
            </button>
          </div>

          <div className="space-y-2 text-[#3c4043]">
            <div className="flex items-center justify-between">
              <span className="text-[#5f6368]">Origin:</span>
              <span className="font-semibold text-[#202124]">{trip.origin}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#5f6368]">Destination:</span>
              <span className="font-semibold text-[#202124]">{trip.destination}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#5f6368]">Estimated Distance:</span>
              <span className="font-mono font-semibold">{trip.distance || '535 km'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#5f6368]">Group ETA:</span>
              <span className="font-mono font-bold text-[#1a73e8]">
                {groupEta?.formattedEta || 'Calculating...'}
              </span>
            </div>
          </div>

          {/* Owner Buttons for mobile */}
          {isOwner && (
            <div className="pt-2 border-t border-[#f1f3f4] flex gap-2">
              {trip.status === 'PLANNED' && (
                <button
                  onClick={onStartTrip}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#1e8e3e] hover:bg-[#137333] text-white font-bold text-xs shadow-sm transition-colors"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Start Live Trip</span>
                </button>
              )}

              {isActive && (
                <button
                  onClick={onEndTrip}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-white hover:bg-[#fce8e6] text-[#d93025] border border-[#dadce0] font-bold text-xs shadow-sm transition-colors"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Complete Trip</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default TopTripBar;
