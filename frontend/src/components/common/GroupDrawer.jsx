import React, { useState } from 'react';
import { Users, Clock, ChevronDown, ChevronUp, X, ChevronsUp, ChevronsDown } from 'lucide-react';
import useTripStore, { selectTravelers } from '../../store/tripStore.js';
import useAuthStore from '../../store/authStore.js';
import MemberList from '../members/MemberList.jsx';
import TripTimeline from '../timeline/TripTimeline.jsx';

export function GroupDrawer() {
  const {
    isDrawerOpen,
    setDrawerOpen,
    activeDrawerTab,
    setActiveDrawerTab,
    members,
    events,
    liveLocations,
    trip
  } = useTripStore();

  const { user } = useAuthStore();
  // 3 Mobile sheet states: 'COLLAPSED', 'PARTIAL', 'FULL'
  const [mobileSheetState, setMobileSheetState] = useState('COLLAPSED');

  const travelers = selectTravelers(members, liveLocations, user?.id, trip?.destination);
  const leaderTraveler = travelers.find(t => t.isLeader);
  const movingCount = travelers.filter(t => t.status === 'MOVING' || t.status === 'REJOINED').length;
  const stoppedCount = travelers.filter(t => t.status === 'STOPPED' || t.status === 'POSSIBLE_STOP').length;
  const splitCount = travelers.filter(t => t.status === 'SPLIT' || t.status === 'FALLING_BEHIND').length;
  const arrivedCount = travelers.filter(t => t.status === 'ARRIVED').length;

  const cycleMobileSheet = () => {
    if (mobileSheetState === 'COLLAPSED') setMobileSheetState('PARTIAL');
    else if (mobileSheetState === 'PARTIAL') setMobileSheetState('FULL');
    else setMobileSheetState('COLLAPSED');
  };

  return (
    <>
      {/* 1. DESKTOP FLOATING DRAWER (Right side of screen over the map) */}
      {isDrawerOpen && (
        <div className="hidden md:flex absolute top-18 right-4 bottom-6 z-50 w-88 lg:w-96 flex-col bg-white border border-[#dadce0] rounded-3xl shadow-xl overflow-hidden pointer-events-auto animate-in fade-in slide-in-from-right-4 duration-200">
          {/* Navigation Tabs Header */}
          <div className="p-2.5 border-b border-[#dadce0] flex items-center justify-between bg-[#f8f9fa]">
            <div className="flex items-center gap-1 bg-[#f1f3f4] p-0.5 rounded-full text-xs">
              <button
                onClick={() => setActiveDrawerTab('MEMBERS')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold transition-all ${
                  activeDrawerTab === 'MEMBERS'
                    ? 'bg-white text-[#1a73e8] shadow-xs'
                    : 'text-[#5f6368] hover:text-[#202124]'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Travelers ({travelers.length})</span>
              </button>

              <button
                onClick={() => setActiveDrawerTab('TIMELINE')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold transition-all ${
                  activeDrawerTab === 'TIMELINE'
                    ? 'bg-white text-[#1a73e8] shadow-xs'
                    : 'text-[#5f6368] hover:text-[#202124]'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Timeline ({events.length})</span>
              </button>
            </div>

            <button
              onClick={() => setDrawerOpen(false)}
              className="p-1.5 rounded-full text-[#5f6368] hover:text-[#202124] hover:bg-[#f1f3f4] transition-colors"
              title="Close Panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-hidden">
            {activeDrawerTab === 'MEMBERS' ? <MemberList /> : <TripTimeline />}
          </div>
        </div>
      )}

      {/* 2. MOBILE 3-STATE EXPANDABLE BOTTOM SHEET */}
      <div
        className={`md:hidden fixed inset-x-0 bottom-0 z-50 bg-white border-t border-[#dadce0] rounded-t-3xl shadow-2xl transition-all duration-300 pointer-events-auto flex flex-col ${
          mobileSheetState === 'FULL'
            ? 'h-[82vh]'
            : mobileSheetState === 'PARTIAL'
            ? 'h-[45vh]'
            : 'h-14'
        }`}
      >
        {/* Sheet Drag Handle & Peek Bar */}
        <div
          onClick={cycleMobileSheet}
          className="p-2.5 px-3.5 flex items-center justify-between cursor-pointer border-b border-[#f1f3f4] shrink-0 bg-white rounded-t-3xl relative"
        >
          {/* Top Pill Handle Indicator */}
          <div className="w-9 h-1 bg-[#dadce0] rounded-full absolute top-1.5 left-1/2 transform -translate-x-1/2" />

          {/* Left Summary Info */}
          <div className="flex items-center gap-2 pt-1 min-w-0">
            <span className="font-bold text-xs text-[#202124] truncate">
              {travelers.length} Travelers
            </span>
            <div className="flex items-center gap-1 shrink-0 text-[10px]">
              {movingCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-[#e6f4ea] text-[#137333] font-bold">
                  🟢 {movingCount}
                </span>
              )}
              {stoppedCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-[#fce8e6] text-[#c5221f] font-bold">
                  🛑 {stoppedCount}
                </span>
              )}
              {splitCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-[#fef7e0] text-[#b06000] font-bold">
                  ⚠ {splitCount}
                </span>
              )}
              {arrivedCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-[#e6f4ea] text-[#137333] font-bold">
                  🏁 {arrivedCount}
                </span>
              )}
            </div>
          </div>

          {/* Right Action & Tab Selectors */}
          <div className="flex items-center gap-1.5 shrink-0 pt-1">
            {mobileSheetState !== 'COLLAPSED' && (
              <div className="flex items-center gap-0.5 bg-[#f1f3f4] p-0.5 rounded-full text-[10px]">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveDrawerTab('MEMBERS');
                  }}
                  className={`px-2 py-0.5 rounded-full font-bold ${
                    activeDrawerTab === 'MEMBERS' ? 'bg-[#1a73e8] text-white' : 'text-[#5f6368]'
                  }`}
                >
                  Travelers
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveDrawerTab('TIMELINE');
                  }}
                  className={`px-2 py-0.5 rounded-full font-bold ${
                    activeDrawerTab === 'TIMELINE' ? 'bg-[#1a73e8] text-white' : 'text-[#5f6368]'
                  }`}
                >
                  Timeline
                </button>
              </div>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation();
                cycleMobileSheet();
              }}
              className="p-1 rounded-full text-[#5f6368] hover:bg-[#f1f3f4]"
              title={mobileSheetState === 'FULL' ? 'Collapse' : 'Expand'}
            >
              {mobileSheetState === 'FULL' ? (
                <ChevronDown className="w-4 h-4" />
              ) : mobileSheetState === 'PARTIAL' ? (
                <ChevronsUp className="w-4 h-4 text-[#1a73e8]" />
              ) : (
                <ChevronUp className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Sheet Content when Partial or Full */}
        {mobileSheetState !== 'COLLAPSED' && (
          <div className="flex-1 overflow-y-auto">
            {activeDrawerTab === 'MEMBERS' ? <MemberList /> : <TripTimeline />}
          </div>
        )}
      </div>
    </>
  );
}

export default GroupDrawer;
