import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Navigation, AlertTriangle } from 'lucide-react';
import api from '../services/api.js';
import useTripStore from '../store/tripStore.js';
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
    fetchTripDetails,
    isLoadingTrip,
    groupEta,
    liveLocations
  } = useTripStore();

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

  const isActive = trip.status === 'ACTIVE';
  const stoppedCount = Object.values(liveLocations).filter(l => l.status === 'STOPPED').length;
  const splitCount = Object.values(liveLocations).filter(l => l.status === 'SPLIT').length;

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] overflow-hidden bg-[#f1f3f4] select-none">
      {/* 1. HERO FULL-BLEED MAP VIEWPORT */}
      <div className="absolute inset-0 z-0 w-full h-full">
        <GoogleMapContainer />
      </div>

      {/* 2. FLOATING TOP SEARCH / ROUTE BAR */}
      <TopTripBar
        onStartTrip={handleStartTrip}
        onEndTrip={handleEndTrip}
        showSimPanel={showSimPanel}
        setShowSimPanel={setShowSimPanel}
      />

      {/* 3. FLOATING ACTIONABLE ALERTS */}
      <AlertBanner />

      {/* 4. POPOVER STOP DETAILS CARD */}
      <StopModal />

      {/* 5. FLOATING TRIP SUMMARY CARD (Bottom-Left on Desktop) */}
      <div className="hidden lg:flex absolute bottom-6 left-4 z-20 pointer-events-auto">
        <div className="bg-white border border-[#dadce0] p-3.5 rounded-3xl shadow-lg max-w-xs space-y-2 text-xs">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 font-bold text-[#202124] truncate">
              <Navigation className="w-3.5 h-3.5 text-[#1a73e8] transform -rotate-45" />
              <span className="truncate">{trip.origin} → {trip.destination}</span>
            </div>
            <span
              className={`px-2 py-0.2 rounded-full text-[10px] font-extrabold uppercase ${
                isActive
                  ? 'bg-[#e6f4ea] text-[#137333] border border-[#ceead6]'
                  : 'bg-[#f1f3f4] text-[#5f6368] border border-[#dadce0]'
              }`}
            >
              {trip.status}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#f1f3f4]">
            <div className="bg-[#f8f9fa] p-2 rounded-2xl border border-[#dadce0] text-center">
              <span className="text-[10px] text-[#5f6368] block font-medium">Group ETA</span>
              <span className="font-mono font-bold text-[#1a73e8] text-xs">
                {groupEta?.formattedEta || '3:15 PM'}
              </span>
            </div>
            <div className="bg-[#f8f9fa] p-2 rounded-2xl border border-[#dadce0] text-center">
              <span className="text-[10px] text-[#5f6368] block font-medium">Distance</span>
              <span className="font-mono font-bold text-[#202124] text-xs">
                {trip.distance || '535 km'}
              </span>
            </div>
          </div>

          {/* Convoy Health status */}
          <div className="flex items-center gap-1.5 pt-1 text-[11px]">
            {splitCount > 0 ? (
              <span className="text-[#b06000] font-semibold flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-[#f9ab00]" /> {splitCount} traveler falling behind
              </span>
            ) : stoppedCount > 0 ? (
              <span className="text-[#d93025] font-semibold flex items-center gap-1">
                <span>🛑</span> {stoppedCount} traveler stopped
              </span>
            ) : (
              <span className="text-[#137333] font-semibold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#1e8e3e] animate-pulse" /> Convoy in sync
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 6. FLOATING GROUP MEMBERS & TIMELINE DRAWER / BOTTOM SHEET */}
      <GroupDrawer />

      {/* 7. FLOATING MAP ACTION CONTROLS (Right side) */}
      <FloatingMapControls
        showSimPanel={showSimPanel}
        setShowSimPanel={setShowSimPanel}
      />

      {/* 8. FLOATING SIMULATION & DEMO CONTROLLER (Bottom-Center) */}
      {showSimPanel && (
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-20 pointer-events-auto px-4 max-w-xl w-full hidden sm:flex justify-center">
          <DemoController />
        </div>
      )}
    </div>
  );
}

export default TripDashboard;

