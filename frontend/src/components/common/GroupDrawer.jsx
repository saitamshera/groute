import React, { useState } from 'react';
import { Users, Clock, ChevronDown, ChevronUp, X } from 'lucide-react';
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
    liveLocations
  } = useTripStore();

  const { user } = useAuthStore();
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);

  if (!isDrawerOpen) return null;

  const travelers = selectTravelers(members, liveLocations, user?.id);
  const stoppedCount = travelers.filter(t => t.status === 'STOPPED' || t.status === 'POSSIBLE_STOP').length;
  const splitCount = travelers.filter(t => t.status === 'SPLIT' || t.status === 'FALLING_BEHIND').length;

  return (
    <>
      {/* DESKTOP FLOATING DRAWER (Right side of screen over the map) */}
      <div className="hidden md:flex absolute top-20 right-4 bottom-6 z-20 w-88 lg:w-96 flex-col bg-white border border-[#dadce0] rounded-3xl shadow-xl overflow-hidden pointer-events-auto animate-in fade-in slide-in-from-right-4 duration-200">
        {/* Navigation Tabs Header */}
        <div className="p-2.5 border-b border-[#dadce0] flex items-center justify-between bg-[#f8f9fa]">
          <div className="flex items-center gap-1 bg-[#f1f3f4] p-1 rounded-full text-xs">
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

      {/* MOBILE EXPANDABLE BOTTOM SHEET */}
      <div
        className={`md:hidden fixed inset-x-0 bottom-0 z-30 bg-white border-t border-[#dadce0] rounded-t-3xl shadow-2xl transition-all duration-300 pointer-events-auto flex flex-col ${
          isMobileExpanded ? 'h-[75vh]' : 'h-18'
        }`}
      >
        {/* Sheet Drag / Tap Header Bar */}
        <div
          onClick={() => setIsMobileExpanded(!isMobileExpanded)}
          className="p-3 flex items-center justify-between cursor-pointer border-b border-[#f1f3f4] shrink-0"
        >
          {/* Handle Indicator */}
          <div className="w-10 h-1 bg-[#dadce0] rounded-full mx-auto absolute top-2 left-1/2 transform -translate-x-1/2" />

          <div className="flex items-center gap-2 pt-1">
            <span className="font-bold text-xs text-[#202124]">
              {travelers.length} Travelers in Convoy
            </span>
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
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-[#f1f3f4] p-0.5 rounded-full text-[11px]">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveDrawerTab('MEMBERS');
                  setIsMobileExpanded(true);
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
                  setIsMobileExpanded(true);
                }}
                className={`px-2 py-0.5 rounded-full font-bold ${
                  activeDrawerTab === 'TIMELINE' ? 'bg-[#1a73e8] text-white' : 'text-[#5f6368]'
                }`}
              >
                Timeline
              </button>
            </div>

            <button className="p-1 text-[#5f6368]">
              {isMobileExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Sheet Content when expanded */}
        {isMobileExpanded && (
          <div className="flex-1 overflow-hidden p-1">
            {activeDrawerTab === 'MEMBERS' ? <MemberList /> : <TripTimeline />}
          </div>
        )}
      </div>
    </>
  );
}

export default GroupDrawer;
