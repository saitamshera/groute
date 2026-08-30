import React from 'react';
import { Users, Navigation, Clock, ShieldCheck, Eye, EyeOff, Radio, AlertTriangle } from 'lucide-react';
import useTripStore from '../../store/tripStore.js';
import useAuthStore from '../../store/authStore.js';
import StatusBadge from '../common/StatusBadge.jsx';
import { formatDistance, formatSpeed, timeAgo } from '../../utils/formatters.js';

export function MemberList() {
  const {
    members,
    liveLocations,
    selectedMemberId,
    setSelectedMemberId,
    isSharingLocation,
    toggleLocationSharing,
    trip
  } = useTripStore();

  const { user: currentUser } = useAuthStore();

  return (
    <div className="flex flex-col h-full bg-slate-900/90 border border-slate-800/90 rounded-2xl overflow-hidden backdrop-blur-md">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-brand-500/10 text-brand-400">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Group Members</h3>
            <p className="text-[11px] text-slate-400">{members.length} travelers in group</p>
          </div>
        </div>

        {/* Location Sharing Privacy Toggle */}
        <button
          onClick={toggleLocationSharing}
          title={isSharingLocation ? 'Location sharing is ON (Click to disable)' : 'Location sharing is OFF (Click to enable)'}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            isSharingLocation
              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25'
              : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-750'
          }`}
        >
          {isSharingLocation ? <Eye className="w-3.5 h-3.5 text-emerald-400" /> : <EyeOff className="w-3.5 h-3.5 text-slate-500" />}
          <span>{isSharingLocation ? 'Sharing ON' : 'Sharing OFF'}</span>
        </button>
      </div>

      {/* Members List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {members.map((member) => {
          const loc = liveLocations[member.id] || {};
          const isSelected = selectedMemberId === member.id;
          const isMe = member.id === currentUser?.id;
          const isStopped = loc.status === 'STOPPED';
          const isSplit = loc.status === 'SPLIT';
          const isOffline = loc.status === 'OFFLINE';
          const isSharingOff = loc.status === 'LOCATION_OFF' || loc.locationSharing === false;

          return (
            <div
              key={member.id}
              onClick={() => setSelectedMemberId(member.id)}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-brand-500/15 border-brand-500/60 shadow-lg shadow-brand-500/10'
                  : 'bg-slate-850/80 hover:bg-slate-800/90 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              {/* Top Row: Avatar, Name, Status */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative shrink-0">
                    <img
                      src={member.profile_image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.name}`}
                      alt={member.name}
                      className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 object-cover"
                    />
                    {loc.status === 'MOVING' && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-900 animate-pulse" />
                    )}
                    {isStopped && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-slate-900" />
                    )}
                    {isSplit && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-slate-900 animate-ping" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-white truncate">
                        {member.name}
                      </span>
                      {isMe && (
                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-brand-500/20 text-brand-300 border border-brand-500/30">
                          You
                        </span>
                      )}
                      {member.role === 'OWNER' && (
                        <span className="text-[10px] font-semibold text-amber-400" title="Group Owner">
                          👑
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-400">
                      {isOffline
                        ? 'Offline'
                        : isSharingOff
                        ? 'Location sharing off'
                        : loc.lastSeen
                        ? `Updated ${timeAgo(loc.lastSeen)}`
                        : 'Waiting for GPS...'}
                    </p>
                  </div>
                </div>

                {/* Status Badge */}
                <StatusBadge status={loc.status || (isSharingOff ? 'LOCATION_OFF' : 'MOVING')} speed={loc.speed} distance={loc.distanceFromGroupKm} />
              </div>

              {/* Bottom Metrics Details */}
              {!isOffline && !isSharingOff && loc.latitude && (
                <div className="mt-2.5 pt-2.5 border-t border-slate-800/80 grid grid-cols-3 gap-2 text-center text-xs">
                  {/* Distance from Group Center */}
                  <div className="bg-slate-900/60 p-1.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">From Group</span>
                    <span className={`font-mono font-semibold ${isSplit ? 'text-amber-400' : 'text-slate-300'}`}>
                      {formatDistance(loc.distanceFromGroupKm || 0)}
                    </span>
                  </div>

                  {/* Live Speed */}
                  <div className="bg-slate-900/60 p-1.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">Live Speed</span>
                    <span className="font-mono font-semibold text-slate-300">
                      {formatSpeed(loc.speed || 0)}
                    </span>
                  </div>

                  {/* Individual ETA */}
                  <div className="bg-slate-900/60 p-1.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">ETA</span>
                    <span className="font-mono font-semibold text-brand-300">
                      {loc.eta || 'N/A'}
                    </span>
                  </div>
                </div>
              )}

              {/* Stop Info Banner */}
              {isStopped && loc.stoppedLocationName && (
                <div className="mt-2 p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-1.5">
                  <span className="text-sm">🛑</span>
                  <span className="truncate">Stopped at {loc.stoppedLocationName}</span>
                </div>
              )}

              {/* Split Alert Banner */}
              {isSplit && (
                <div className="mt-2 p-2 rounded-lg bg-amber-500/15 border border-amber-500/30 text-xs text-amber-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="truncate">{loc.distanceFromGroupKm} km behind the convoy</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default MemberList;
