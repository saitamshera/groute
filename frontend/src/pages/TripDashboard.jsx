import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Users, ChevronRight } from 'lucide-react';
import api from '../services/api.js';
import useTripStore, { selectTravelers } from '../store/tripStore.js';
import useAuthStore from '../store/authStore.js';
import useSocket from '../hooks/useSocket.js';
import useGeolocation from '../hooks/useGeolocation.js';

import GoogleMapContainer from '../components/map/GoogleMapContainer.jsx';
import TopTripBar from '../components/common/TopTripBar.jsx';
import FloatingMapControls from '../components/map/FloatingMapControls.jsx';
import GroupDrawer from '../components/common/GroupDrawer.jsx';
import StopModal from '../components/stops/StopModal.jsx';
import AlertBanner from '../components/common/AlertBanner.jsx';
import DemoController from '../components/simulation/DemoController.jsx';

export function TripDashboard() {
  const { tripId } = useParams();
  const {
    trip,
    members,
    fetchTripDetails,
    isLoadingTrip,
    liveLocations,
    setDrawerOpen,
    setActiveDrawerTab
  } = useTripStore();

  const { user } = useAuthStore();
  const [showSimPanel, setShowSimPanel] = useState(true);

  // Hook real-time websocket and GPS tracking
  useSocket(tripId);
  useGeolocation(tripId);

  useEffect(() => {
    fetchTripDetails(tripId);
  }, [tripId]);

  const handleStartTrip = async () => {
    try {
      await api.startTrip(tripId);
      fetchTripDetails(tripId);
    } catch (err) {
      alert(err.message || 'Failed to start trip');
    }
  };

  const handleEndTrip = async () => {
    if (!window.confirm('Are you sure you want to complete this trip? Live convoy tracking will be marked completed.')) return;
    try {
      await api.endTrip(tripId);
      fetchTripDetails(tripId);
    } catch (err) {
      alert(err.message || 'Failed to end trip');
    }
  };

  if (isLoadingTrip || !trip) {
    return (
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center bg-[#f8f9fa] text-[#5f6368]">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-4 border-[#1a73e8] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-[#202124]">Connecting to live convoy...</p>
        </div>
      </div>
    );
  }

  const travelers = selectTravelers(members, liveLocations, user?.id, trip?.destination);
  const leaderTraveler = travelers.find(t => t.isLeader);
  const arrivedCount = travelers.filter(t => t.status === 'ARRIVED').length;
  const movingCount = travelers.filter(t => t.status === 'MOVING' || t.status === 'REJOINED').length;
  const stoppedCount = travelers.filter(t => t.status === 'STOPPED' || t.status === 'POSSIBLE_STOP').length;
  const splitCount = travelers.filter(t => t.status === 'SPLIT' || t.status === 'FALLING_BEHIND').length;

  return (
    <div className="relative w-full h-[calc(100vh-3.5rem)] overflow-hidden bg-[#f1f3f4] select-none">
      {/* 1. HERO FULL-BLEED MAP VIEWPORT */}
      <div className="absolute inset-0 z-0 w-full h-full">
        <GoogleMapContainer />
      </div>

      {/* 2. FLOATING TOP SEARCH / ROUTE BAR */}
      <TopTripBar
        onStartTrip={handleStartTrip}
        onEndTrip={handleEndTrip}
      />

      {/* 3. FLOATING ACTIONABLE ALERTS */}
      <AlertBanner />

      {/* 4. POPOVER STOP DETAILS CARD */}
      <StopModal />

      {/* 5. ALL CONVOY ARRIVED CELEBRATION FLOATING PILL */}
      {arrivedCount === travelers.length && travelers.length > 0 && (
        <div className="absolute top-16 left-1/2 transform -translate-x-1/2 z-30 pointer-events-auto animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#137333] text-white shadow-xl text-xs font-bold border border-[#ceead6]">
            <span>🎉</span>
            <span>All travelers have reached {trip.destination || 'the destination'}! ({arrivedCount}/{travelers.length})</span>
          </div>
        </div>
      )}

      {/* 6. SLEEK BOTTOM CONVOY STATUS BAR (Google Maps style) */}
      <div className="absolute bottom-3 sm:bottom-4 left-1/2 transform -translate-x-1/2 z-20 pointer-events-auto flex items-center gap-1.5 sm:gap-2 max-w-[95vw] sm:max-w-2xl">
        <button
          onClick={() => {
            setActiveDrawerTab('MEMBERS');
            setDrawerOpen(true);
          }}
          className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/95 backdrop-blur-md border border-[#dadce0] shadow-md hover:shadow-lg hover:bg-white text-xs font-bold text-[#202124] transition-all flex-wrap sm:flex-nowrap"
        >
          <div className="flex items-center gap-1.5 text-[#1a73e8]">
            <Users className="w-3.5 h-3.5" />
            <span>{travelers.length} Travelers</span>
          </div>

          {leaderTraveler && (
            <span className="hidden md:inline-flex items-center gap-1 text-[9px] font-extrabold text-[#b06000] bg-[#fef7e0] px-2 py-0.2 rounded-full border border-[#feefc3]">
              👑 {leaderTraveler.name}
            </span>
          )}

          <div className="h-3 w-px bg-[#dadce0]" />

          <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-[11px]">
            {movingCount > 0 && (
              <span className="text-[#137333] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1e8e3e] animate-pulse" />
                <span>{movingCount} moving</span>
              </span>
            )}
            {stoppedCount > 0 && (
              <span className="text-[#d93025] flex items-center gap-1">
                <span>🔴</span>
                <span>{stoppedCount} stopped</span>
              </span>
            )}
            {splitCount > 0 && (
              <span className="text-[#b06000] flex items-center gap-1">
                <span>⚠</span>
                <span>{splitCount} behind</span>
              </span>
            )}
            {arrivedCount > 0 && (
              <span className="text-[#137333] flex items-center gap-1">
                <span>🏁</span>
                <span>{arrivedCount} arrived</span>
              </span>
            )}
            {movingCount === 0 && stoppedCount === 0 && splitCount === 0 && arrivedCount === 0 && (
              <span className="text-[#5f6368]">Standby</span>
            )}
          </div>

          <div className="h-3 w-px bg-[#dadce0] hidden sm:block" />

          <span className="text-[#1a73e8] hidden sm:flex items-center gap-0.5 hover:underline text-[11px]">
            <span>View Group</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </button>

        {showSimPanel && <DemoController />}
      </div>

      {/* 7. FLOATING GROUP MEMBERS & TIMELINE DRAWER / 3-STATE BOTTOM SHEET */}
      <GroupDrawer />

      {/* 8. FLOATING MAP ACTION CONTROLS (Right side) */}
      <FloatingMapControls
        showSimPanel={showSimPanel}
        setShowSimPanel={setShowSimPanel}
      />
    </div>
  );
}

export default TripDashboard;

