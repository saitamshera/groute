import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Users, Copy, Check, Plus, Navigation, Shield, Trash2, ArrowLeft, Radio, Calendar } from 'lucide-react';
import api from '../services/api.js';
import useAuthStore from '../store/authStore.js';
import { timeAgo } from '../utils/formatters.js';

export function GroupDetails() {
  const { groupId } = useParams();
  const { user: currentUser } = useAuthStore();
  const navigate = useNavigate();

  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [trips, setTrips] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const loadGroup = async () => {
    setIsLoading(true);
    try {
      const data = await api.getGroupDetails(groupId);
      setGroup(data.group);
      setMembers(data.members || []);
      setTrips(data.trips || []);
    } catch (err) {
      setError(err.message || 'Failed to load group');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadGroup();
  }, [groupId]);

  const handleCopyCode = () => {
    if (!group?.invite_code) return;
    navigator.clipboard.writeText(group.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm('Are you sure you want to remove this member from the group?')) return;
    try {
      await api.removeMember(groupId, userId);
      loadGroup();
    } catch (err) {
      alert(err.message || 'Failed to remove member');
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center text-slate-400">
        Loading group details...
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center">
        <div className="glass-panel p-8 rounded-2xl">
          <p className="text-rose-400 text-sm mb-4">{error || 'Group not found'}</p>
          <Link to="/dashboard" className="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-semibold">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Navigation Header */}
      <div className="flex items-center gap-3">
        <Link
          to="/dashboard"
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Travel Group</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{group.name}</h1>
        </div>
      </div>

      {/* Hero Invite Code & Info Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Invite Code Box */}
        <div className="glass-panel p-6 rounded-2xl border border-brand-500/30 flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-brand-400 block mb-1">
              Group Invite Code
            </span>
            <p className="text-xs text-slate-400 mb-4">
              Share this code with friends so they can join this group from their dashboard.
            </p>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="font-mono text-2xl font-black tracking-widest text-white">
              {group.invite_code}
            </span>
            <button
              onClick={handleCopyCode}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Group Stats */}
        <div className="md:col-span-2 glass-panel p-6 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Convoy Management
              </span>
              <p className="text-sm text-slate-300">
                You are {group.isOwner ? 'the Group Owner' : 'a Group Member'}.
              </p>
            </div>

            <Link
              to={`/trips/new?group=${group.id}`}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs shadow-lg shadow-brand-500/25 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Plan New Trip</span>
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-800 text-center">
            <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[11px] text-slate-400 block">Total Members</span>
              <span className="text-lg font-bold text-white">{members.length}</span>
            </div>
            <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[11px] text-slate-400 block">Planned Trips</span>
              <span className="text-lg font-bold text-brand-400">{trips.length}</span>
            </div>
            <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[11px] text-slate-400 block">Created</span>
              <span className="text-xs font-semibold text-slate-300">{timeAgo(group.created_at)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Grid: Members & Trips */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Members List (Left 1 col) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white font-display">Members ({members.length})</h3>
          </div>

          <div className="space-y-2.5">
            {members.map((mem) => (
              <div
                key={mem.id}
                className="glass-card p-3.5 rounded-xl flex items-center justify-between border border-slate-800"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={mem.profile_image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${mem.name}`}
                    alt={mem.name}
                    className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 object-cover shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">{mem.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{mem.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                      mem.role === 'OWNER'
                        ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {mem.role}
                  </span>

                  {group.isOwner && mem.id !== currentUser?.id && (
                    <button
                      onClick={() => handleRemoveMember(mem.id)}
                      title="Remove Member"
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Trips List (Right 2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white font-display">Group Road Trips</h3>
          </div>

          {trips.length === 0 ? (
            <div className="glass-card rounded-2xl p-8 text-center text-slate-400 text-xs">
              No trips planned for this group yet.{' '}
              <Link to={`/trips/new?group=${group.id}`} className="text-brand-400 font-semibold underline">
                Create one now
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {trips.map((trip) => {
                const isActive = trip.status === 'ACTIVE';
                return (
                  <div
                    key={trip.id}
                    className={`glass-card p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                      isActive ? 'border-brand-500/40 bg-brand-500/5' : 'border-slate-800'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                            isActive
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {trip.status}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">{trip.distance}</span>
                      </div>

                      <h4 className="text-base font-bold text-white mb-2">{trip.name}</h4>

                      <div className="space-y-1 text-xs text-slate-300">
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          <span className="truncate">{trip.origin}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                          <span className="truncate">{trip.destination}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">
                        {trip.estimated_duration || 'Est. Duration N/A'}
                      </span>

                      <Link
                        to={`/trips/${trip.id}`}
                        className="px-3.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs shadow-md transition-colors"
                      >
                        {isActive ? 'View Live Map' : 'Trip Details'}
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default GroupDetails;
