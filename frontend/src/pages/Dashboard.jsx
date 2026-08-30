import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  UserPlus,
  Users,
  Navigation,
  Radio,
  MapPin,
  Calendar,
  Clock,
  ChevronRight,
  Sparkles,
  Search,
  ArrowRight
} from 'lucide-react';
import api from '../services/api.js';
import useAuthStore from '../store/authStore.js';
import CreateGroupModal from './CreateGroupModal.jsx';
import JoinGroupModal from './JoinGroupModal.jsx';
import { formatTime, timeAgo } from '../utils/formatters.js';

export function Dashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [groups, setGroups] = useState([]);
  const [activeTrips, setActiveTrips] = useState([]);
  const [recentTrips, setRecentTrips] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isJoinGroupOpen, setIsJoinGroupOpen] = useState(false);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const [groupsRes, tripsRes] = await Promise.all([
        api.getGroups(),
        api.getActiveTrips()
      ]);
      setGroups(groupsRes.groups || []);
      setActiveTrips(tripsRes.activeTrips || []);
      setRecentTrips(tripsRes.recentTrips || []);
    } catch (err) {
      console.error('[Dashboard] Data load error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleQuickDemoTrip = async () => {
    try {
      let targetGroupId = groups[0]?.id;
      if (!targetGroupId) {
        const newGroup = await api.createGroup({ name: 'Manali Road Trip' });
        targetGroupId = newGroup.group.id;
      }

      const trip = await api.createTrip({
        group_id: targetGroupId,
        name: 'Delhi to Manali Expedition',
        origin: 'New Delhi, India',
        destination: 'Manali, Himachal Pradesh',
        origin_lat: 28.6315,
        origin_lng: 77.2167,
        destination_lat: 32.2396,
        destination_lng: 77.1887,
        distance: '535 km',
        estimated_duration: '11h 30m'
      });

      await api.startTrip(trip.trip.id);
      navigate(`/trips/${trip.trip.id}`);
    } catch (err) {
      console.error('[Dashboard] Quick demo trip error:', err);
    }
  };

  const activeTrip = activeTrips[0];

  const filteredGroups = groups.filter((g) =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredRecentTrips = recentTrips.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.origin?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.destination?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* 1. GOOGLE MAPS SEARCH BAR */}
      <div className="relative max-w-2xl mx-auto md:mx-0">
        <div className="relative flex items-center bg-white border border-[#dadce0] rounded-full shadow-sm hover:shadow-md transition-shadow px-4 py-2.5">
          <Search className="w-4 h-4 text-[#5f6368] mr-3 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search your trips, convoys or groups..."
            className="w-full bg-transparent text-sm text-[#202124] placeholder-[#80868b] focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs text-[#5f6368] hover:text-[#202124] font-bold ml-2 px-1"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 2. COMPACT GREETING & ACTION HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#202124]">
            Good afternoon, {user?.name || 'Traveler'}
          </h1>
          <p className="text-xs sm:text-sm text-[#5f6368] mt-0.5">
            Monitor active road trip convoys, travel milestones, and live member positions.
          </p>
        </div>

        {/* Google Maps Style Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => setIsJoinGroupOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white hover:bg-[#f1f3f4] text-[#3c4043] border border-[#dadce0] text-xs font-bold transition-colors shadow-xs"
          >
            <UserPlus className="w-3.5 h-3.5 text-[#5f6368]" />
            <span>Join Group</span>
          </button>

          <button
            onClick={() => setIsCreateGroupOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white hover:bg-[#f1f3f4] text-[#3c4043] border border-[#dadce0] text-xs font-bold transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 text-[#5f6368]" />
            <span>New Group</span>
          </button>

          <Link
            to="/trips/new"
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#1a73e8] hover:bg-[#1557d0] text-white text-xs font-bold shadow-sm hover:shadow transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Plan Trip</span>
          </Link>
        </div>
      </div>

      {/* 3. ACTIVE TRIP HERO MAP PREVIEW CARD */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#5f6368]">
            Active Trip
          </h2>
          {activeTrips.length > 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#137333] px-2.5 py-0.5 rounded-full bg-[#e6f4ea] border border-[#ceead6]">
              <span className="w-2 h-2 rounded-full bg-[#1e8e3e] animate-pulse" />
              Live Convoy Tracking
            </span>
          )}
        </div>

        {activeTrip ? (
          <div className="relative bg-white border border-[#dadce0] rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            {/* Map Preview Canvas Frame */}
            <div className="relative h-64 sm:h-72 w-full bg-[#f1f3f4] overflow-hidden">
              {/* Stylized Light Cartographic Background Map */}
              <svg className="w-full h-full" viewBox="0 0 800 300" preserveAspectRatio="none">
                {/* Light landmass & roads */}
                <rect width="800" height="300" fill="#f8f9fa" />
                <path d="M 0 50 Q 200 40 400 60 T 800 50" stroke="#ffffff" strokeWidth="18" fill="none" />
                <path d="M 0 150 Q 200 120 400 180 T 800 140" stroke="#ffffff" strokeWidth="24" fill="none" />
                <path d="M 0 240 Q 300 220 500 260 T 800 240" stroke="#ffffff" strokeWidth="16" fill="none" />

                {/* Highway Route Polyline */}
                <path
                  d="M 120 220 C 240 180, 420 140, 680 70"
                  stroke="#aecbfa"
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                />
                <path
                  d="M 120 220 C 240 180, 420 140, 680 70"
                  stroke="#1a73e8"
                  strokeWidth="4"
                  fill="none"
                  strokeLinecap="round"
                />

                {/* Milestone Waypoint Circles */}
                <circle cx="120" cy="220" r="7" fill="#1e8e3e" stroke="#ffffff" strokeWidth="2" />
                <circle cx="280" cy="180" r="5" fill="#1a73e8" stroke="#ffffff" strokeWidth="2" />
                <circle cx="440" cy="135" r="5" fill="#f9ab00" stroke="#ffffff" strokeWidth="2" />
                <circle cx="560" cy="100" r="5" fill="#1a73e8" stroke="#ffffff" strokeWidth="2" />
                <circle cx="680" cy="70" r="7" fill="#d93025" stroke="#ffffff" strokeWidth="2" />
              </svg>

              {/* Waypoint Badges */}
              <div className="absolute left-[13%] bottom-[16%] transform -translate-x-1/2">
                <span className="px-2 py-0.5 rounded-md bg-white border border-[#dadce0] text-[10px] font-bold text-[#137333] shadow-xs">
                  🟢 {activeTrip.origin}
                </span>
              </div>

              <div className="absolute right-[13%] top-[14%] transform translate-x-1/2">
                <span className="px-2 py-0.5 rounded-md bg-white border border-[#dadce0] text-[10px] font-bold text-[#d93025] shadow-xs">
                  🏁 {activeTrip.destination}
                </span>
              </div>

              {/* Member Marker Bubbles on preview */}
              <div className="absolute left-[35%] top-[54%] transform -translate-x-1/2 -translate-y-1/2">
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white border border-[#1a73e8] text-[10px] font-bold text-[#1a73e8] shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1e8e3e] animate-pulse" />
                  <span>Rahul (Leader)</span>
                </div>
              </div>

              <div className="absolute left-[54%] top-[40%] transform -translate-x-1/2 -translate-y-1/2">
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white border border-[#f9ab00] text-[10px] font-bold text-[#b06000] shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#f9ab00]" />
                  <span>Aman (Murthal)</span>
                </div>
              </div>

              <div className="absolute left-[68%] top-[28%] transform -translate-x-1/2 -translate-y-1/2">
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white border border-[#dadce0] text-[10px] font-bold text-[#5f6368] shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1e8e3e]" />
                  <span>Priya & Neha</span>
                </div>
              </div>

              {/* Floating Bottom Card Over Map */}
              <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:max-w-md bg-white/95 backdrop-blur-md p-3.5 rounded-2xl border border-[#dadce0] shadow-md flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-bold text-[#202124] truncate">
                      {activeTrip.origin} → {activeTrip.destination}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#5f6368] mt-0.5 truncate">
                    {activeTrip.name} · {activeTrip.group_name || 'Convoy'}
                  </p>
                  <div className="flex items-center gap-3 text-[11px] text-[#5f6368] mt-1">
                    <span>⏱️ Group ETA 3:15 PM</span>
                    <span>·</span>
                    <span>5 travelers</span>
                  </div>
                </div>

                <Link
                  to={`/trips/${activeTrip.id}`}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#1a73e8] hover:bg-[#1557d0] text-white font-bold text-xs shrink-0 shadow-sm transition-all"
                >
                  <span>View Trip</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-[#dadce0] rounded-3xl p-8 text-center shadow-xs">
            <div className="w-12 h-12 rounded-full bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center mx-auto mb-3">
              <Navigation className="w-6 h-6 transform -rotate-45" />
            </div>
            <h3 className="text-base font-bold text-[#202124] mb-1">No Active Trips</h3>
            <p className="text-xs text-[#5f6368] max-w-sm mx-auto mb-5">
              Start a trip to see your group moving together on the map with real-time stops, speed, and separation alerts.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <Link
                to="/trips/new"
                className="px-4 py-2 rounded-full bg-[#1a73e8] hover:bg-[#1557d0] text-white text-xs font-bold shadow-xs transition-colors"
              >
                Plan a trip
              </Link>
              <button
                onClick={handleQuickDemoTrip}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white hover:bg-[#f1f3f4] text-[#3c4043] border border-[#dadce0] text-xs font-bold shadow-xs transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#f9ab00]" />
                <span>Launch Delhi → Manali Demo</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. TWO COLUMN SECTION: YOUR GROUPS & RECENT TRIPS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        {/* Your Groups */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#5f6368]">
              Your Groups
            </h2>
            <button
              onClick={() => setIsCreateGroupOpen(true)}
              className="text-xs font-bold text-[#1a73e8] hover:text-[#1557d0]"
            >
              + New Group
            </button>
          </div>

          {filteredGroups.length === 0 ? (
            <div className="bg-white border border-[#dadce0] rounded-2xl p-6 text-center text-[#5f6368] text-xs">
              No travel groups yet. Create or join one to travel together!
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredGroups.map((grp) => (
                <Link
                  key={grp.id}
                  to={`/groups/${grp.id}`}
                  className="bg-white border border-[#dadce0] hover:border-[#1a73e8] p-3.5 rounded-2xl flex items-center justify-between transition-all hover:shadow-sm group"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-[#202124] group-hover:text-[#1a73e8] transition-colors truncate">
                        {grp.name}
                      </h4>
                      {grp.isOwner && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-[#fef7e0] text-[#b06000] border border-[#feefc3]">
                          Owner
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#5f6368] mt-0.5">
                      {grp.memberCount} member{grp.memberCount === 1 ? '' : 's'} · Invite Code: <span className="font-mono font-semibold text-[#202124]">{grp.invite_code}</span>
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#80868b] group-hover:text-[#1a73e8] shrink-0 transition-colors" />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Trips */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#5f6368]">
              Recent Trips
            </h2>
          </div>

          {filteredRecentTrips.length === 0 ? (
            <div className="bg-white border border-[#dadce0] rounded-2xl p-6 text-center text-[#5f6368] text-xs">
              No previous trips completed yet.
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredRecentTrips.map((trip) => (
                <Link
                  key={trip.id}
                  to={`/trips/${trip.id}`}
                  className="bg-white border border-[#dadce0] hover:border-[#1a73e8] p-3.5 rounded-2xl flex items-center justify-between transition-all hover:shadow-sm group"
                >
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-[#202124] group-hover:text-[#1a73e8] truncate">
                      {trip.name}
                    </h4>
                    <p className="text-[11px] text-[#5f6368] truncate mt-0.5">
                      {trip.origin} → {trip.destination}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#f1f3f4] text-[#5f6368] border border-[#dadce0] shrink-0">
                    {trip.status}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <CreateGroupModal
        isOpen={isCreateGroupOpen}
        onClose={() => setIsCreateGroupOpen(false)}
        onGroupCreated={loadDashboardData}
      />
      <JoinGroupModal
        isOpen={isJoinGroupOpen}
        onClose={() => setIsJoinGroupOpen(false)}
        onGroupJoined={loadDashboardData}
      />
    </div>
  );
}

export default Dashboard;
