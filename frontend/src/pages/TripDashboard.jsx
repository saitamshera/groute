import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Navigation,
  Play,
  CheckCircle,
  Clock,
  MapPin,
  Users,
  Radio,
  Sliders,
  Layers,
  ArrowLeft,
  ChevronUp,
  ChevronDown,
  Shield,
  Eye,
  EyeOff
} from 'lucide-react';
import api from '../services/api.js';
import useTripStore from '../store/tripStore.js';
import useAuthStore from '../store/authStore.js';
import useSocket from '../hooks/useSocket.js';
import useGeolocation from '../hooks/useGeolocation.js';

import GoogleMapContainer from '../components/map/GoogleMapContainer.jsx';
import MemberList from '../components/members/MemberList.jsx';
import TripTimeline from '../components/timeline/TripTimeline.jsx';
import StopModal from '../components/stops/StopModal.jsx';
import AlertBanner from '../components/common/AlertBanner.jsx';
import DemoController from '../components/simulation/DemoController.jsx';

export function TripDashboard() {
  const { tripId } = useParams();
  const { user } = useAuthStore();
  const {
    trip,
    group,
    isOwner,
    fetchTripDetails,
    isLoadingTrip,
    groupEta,
    isSharingLocation,
    toggleLocationSharing
  } = useTripStore();

  const [activeTabMobile, setActiveTabMobile] = useState('MAP'); // 'MAP' | 'MEMBERS' | 'TIMELINE'
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
    if (!window.confirm('Are you sure you want to end this trip? All live location sharing will be stopped.')) return;
    try {
      await api.endTrip(tripId);
      fetchTripDetails(tripId);
    } catch (err) {
      alert(err.message || 'Failed to end trip');
    }
  };

  if (isLoadingTrip || !trip) {
    return (
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center text-slate-400">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium">Connecting to live group convoy...</p>
        </div>
      </div>
    );
  }

  const isActive = trip.status === 'ACTIVE';

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-slate-950">
      {/* Floating Active Alerts */}
      <AlertBanner />

      {/* Popover Stop Details Modal */}
      <StopModal />

      {/* 1. TOP TRIP HEADER BAR */}
      <div className="bg-slate-900/90 border-b border-slate-800/90 px-4 sm:px-6 py-3 shrink-0 backdrop-blur-md z-20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Title & Origin/Dest */}
          <div className="flex items-center gap-3 min-w-0">
            <Link
              to="/dashboard"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-bold text-white truncate font-display">
                  {trip.name}
                </h1>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider ${
                    isActive
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 animate-pulse'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {trip.status}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5 truncate">
                <span>{trip.origin}</span>
                <span>→</span>
                <span className="text-slate-300 font-semibold">{trip.destination}</span>
              </div>
            </div>
          </div>

          {/* Group ETA, Privacy, Owner Actions */}
          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            {/* Clustered Group ETA Card */}
            <div className="bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 flex items-center gap-2.5">
              <div className="p-1 rounded bg-brand-500/10 text-brand-400">
                <Clock className="w-3.5 h-3.5" />
              </div>
              <div className="text-left">
                <span className="text-[10px] text-slate-500 uppercase block font-semibold leading-tight">
                  Group ETA
                </span>
                <span className="font-mono text-xs font-bold text-brand-300 leading-tight">
                  {groupEta?.formattedEta || 'Calculating...'}
                </span>
              </div>
            </div>

            {/* Owner Start/End Trip Buttons */}
            {isOwner && (
              <>
                {trip.status === 'PLANNED' && (
                  <button
                    onClick={handleStartTrip}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Start Trip</span>
                  </button>
                )}

                {isActive && (
                  <button
                    onClick={handleEndTrip}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-rose-600/80 text-slate-300 hover:text-white font-bold text-xs border border-slate-700 transition-colors"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Complete Trip</span>
                  </button>
                )}
              </>
            )}

            {/* Simulation Toggle Button */}
            <button
              onClick={() => setShowSimPanel(!showSimPanel)}
              className={`p-2 rounded-xl border text-xs font-bold transition-colors ${
                showSimPanel
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
              title="Toggle Simulation Bar"
            >
              <Sliders className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Tabs */}
      <div className="md:hidden flex items-center bg-slate-900 border-b border-slate-800 text-xs font-semibold">
        <button
          onClick={() => setActiveTabMobile('MAP')}
          className={`flex-1 py-2.5 text-center border-b-2 transition-colors ${
            activeTabMobile === 'MAP'
              ? 'border-brand-500 text-white bg-slate-800/40'
              : 'border-transparent text-slate-400'
          }`}
        >
          Live Map
        </button>
        <button
          onClick={() => setActiveTabMobile('MEMBERS')}
          className={`flex-1 py-2.5 text-center border-b-2 transition-colors ${
            activeTabMobile === 'MEMBERS'
              ? 'border-brand-500 text-white bg-slate-800/40'
              : 'border-transparent text-slate-400'
          }`}
        >
          Members
        </button>
        <button
          onClick={() => setActiveTabMobile('TIMELINE')}
          className={`flex-1 py-2.5 text-center border-b-2 transition-colors ${
            activeTabMobile === 'TIMELINE'
              ? 'border-brand-500 text-white bg-slate-800/40'
              : 'border-transparent text-slate-400'
          }`}
        >
          Timeline
        </button>
      </div>

      {/* 2. MAIN 3-PANE WORKSPACE */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden p-3 sm:p-4 gap-3 sm:gap-4">
        {/* LEFT / CENTER: Interactive Map Workspace */}
        <div
          className={`flex-1 flex flex-col min-w-0 h-full ${
            activeTabMobile !== 'MAP' ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Live Map Frame */}
          <div className="flex-1 relative min-h-[300px] rounded-2xl overflow-hidden shadow-2xl">
            <GoogleMapContainer />
          </div>

          {/* Bottom Simulation Bar */}
          {showSimPanel && (
            <div className="mt-3 shrink-0 animate-in slide-in-from-bottom-2 duration-200">
              <DemoController />
            </div>
          )}
        </div>

        {/* RIGHT: Members List Panel (Desktop right pane, Mobile tab) */}
        <div
          className={`w-full md:w-80 lg:w-96 shrink-0 h-full flex flex-col ${
            activeTabMobile !== 'MEMBERS' ? 'hidden md:flex' : 'flex'
          }`}
        >
          <div className="h-1/2 pb-1.5">
            <MemberList />
          </div>

          <div className="h-1/2 pt-1.5">
            <TripTimeline />
          </div>
        </div>

        {/* Mobile-only Timeline Tab */}
        <div
          className={`w-full h-full flex flex-col md:hidden ${
            activeTabMobile !== 'TIMELINE' ? 'hidden' : 'flex'
          }`}
        >
          <TripTimeline />
        </div>
      </div>
    </div>
  );
}

export default TripDashboard;
