import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, UserPlus, Users, Navigation, Radio, MapPin, Calendar, Clock, ChevronRight, Sparkles, Compass } from 'lucide-react';
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

  // Quick Starter: Create Delhi -> Manali demo trip if user has none
  const handleQuickDemoTrip = async () => {
    try {
      // Create a demo group first if none
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

      // Auto start trip
      await api.startTrip(trip.trip.id);
      navigate(`/trips/${trip.trip.id}`);
    } catch (err) {
      console.error('[Dashboard] Quick demo trip error:', err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome & Action Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-6 sm:p-8 rounded-3xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs uppercase tracking-wider font-semibold text-brand-400">
              Travel Command Center
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Welcome back, <span className="text-brand-400">{user?.name}</span>!
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Track your road trip convoys, monitor stop durations, and detect group separations in real-time.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsJoinGroupOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 font-semibold text-xs transition-colors border border-slate-700"
          >
            <UserPlus className="w-4 h-4 text-slate-400" />
            <span>Join Group</span>
          </button>

          <button
            onClick={() => setIsCreateGroupOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 font-semibold text-xs transition-colors border border-slate-700"
          >
            <Plus className="w-4 h-4 text-slate-400" />
            <span>Create Group</span>
          </button>

          <Link
            to="/trips/new"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs shadow-lg shadow-brand-500/25 transition-all"
          >
            <Navigation className="w-4 h-4 transform -rotate-45" />
            <span>Plan Trip</span>
          </Link>
        </div>
      </div>

      {/* ACTIVE TRIPS (HIGHLIGHTED HERO CARDS) */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h2 className="text-lg font-bold text-white font-display">Active Road Trips</h2>
          </div>
          {activeTrips.length > 0 && (
            <span className="text-xs font-semibold text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              {activeTrips.length} Live Convoy{activeTrips.length > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {activeTrips.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center border border-dashed border-slate-800">
            <div className="w-12 h-12 rounded-2xl bg-brand-500/10 text-brand-400 flex items-center justify-center mx-auto mb-3">
              <Radio className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">No Active Trips Right Now</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mb-5">
              Start a planned trip with your group or launch the interactive demonstration mode.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={handleQuickDemoTrip}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-brand-500/20 transition-all"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Launch Delhi → Manali Demo Trip</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeTrips.map((trip) => (
              <div
                key={trip.id}
                className="glass-card p-5 rounded-2xl border border-brand-500/30 hover:border-brand-500/60 shadow-xl shadow-brand-500/5 transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      LIVE CONVOY
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      Group: <strong className="text-slate-200">{trip.group_name}</strong>
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white group-hover:text-brand-400 transition-colors">
                    {trip.name}
                  </h3>

                  <div className="mt-3 space-y-1.5 text-xs text-slate-300">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                      <span className="truncate">{trip.origin}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-400 shrink-0" />
                      <span className="truncate">{trip.destination}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between">
                  <div className="text-xs text-slate-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>Started {timeAgo(trip.started_at)}</span>
                  </div>

                  <Link
                    to={`/trips/${trip.id}`}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-md shadow-brand-500/25 transition-all"
                  >
                    <span>Enter Live Map</span>
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* TWO COLUMN GRID: GROUPS & RECENT TRIPS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* User Groups (Left 2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-brand-400" />
              <h2 className="text-lg font-bold text-white font-display">Your Travel Groups</h2>
            </div>
            <button
              onClick={() => setIsCreateGroupOpen(true)}
              className="text-xs font-semibold text-brand-400 hover:text-brand-300 transition-colors"
            >
              + New Group
            </button>
          </div>

          {groups.length === 0 ? (
            <div className="glass-card rounded-2xl p-6 text-center text-slate-400 text-xs">
              You haven't joined any groups yet. Create or join one to travel together!
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {groups.map((grp) => (
                <Link
                  key={grp.id}
                  to={`/groups/${grp.id}`}
                  className="glass-card p-4 rounded-xl border border-slate-800 hover:border-slate-700 transition-all hover:bg-slate-800/60 group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-bold text-white group-hover:text-brand-400 transition-colors truncate">
                      {grp.name}
                    </h4>
                    {grp.isOwner && (
                      <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                        Owner
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 mt-3 pt-2.5 border-t border-slate-800/80">
                    <span className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-500" />
                      {grp.memberCount} member{grp.memberCount === 1 ? '' : 's'}
                    </span>
                    <span className="font-mono text-slate-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-[11px]">
                      {grp.invite_code}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Trips / History (Right 1 col) */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-brand-400" />
            <h2 className="text-lg font-bold text-white font-display">Recent Trips</h2>
          </div>

          {recentTrips.length === 0 ? (
            <div className="glass-card rounded-2xl p-6 text-center text-slate-400 text-xs">
              No previous trips completed yet.
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentTrips.map((trip) => (
                <Link
                  key={trip.id}
                  to={`/trips/${trip.id}`}
                  className="glass-card p-3.5 rounded-xl border border-slate-800 hover:border-slate-700 flex items-center justify-between transition-colors group"
                >
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-200 group-hover:text-brand-300 truncate">
                      {trip.name}
                    </h4>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      {trip.origin} → {trip.destination}
                    </p>
                  </div>
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
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
