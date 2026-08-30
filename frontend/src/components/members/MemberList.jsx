import React from 'react';
import { Users, Eye, EyeOff, AlertTriangle, Navigation, Clock, MapPin, Gauge } from 'lucide-react';
import useTripStore, { selectTravelers } from '../../store/tripStore.js';
import useAuthStore from '../../store/authStore.js';
import StatusBadge from '../common/StatusBadge.jsx';
import { formatDistance, formatSpeed, timeAgo, formatTime } from '../../utils/formatters.js';

export function MemberList() {
  const {
    members,
    liveLocations,
    selectedMemberId,
    focusMember,
    isSharingLocation,
    toggleLocationSharing
  } = useTripStore();

  const { user: currentUser } = useAuthStore();

  const travelers = selectTravelers(members, liveLocations, currentUser?.id);

  // Group status counts
  const movingCount = travelers.filter(t => t.status === 'MOVING' || t.status === 'REJOINED').length;
  const stoppedCount = travelers.filter(t => t.status === 'STOPPED' || t.status === 'POSSIBLE_STOP').length;
  const splitCount = travelers.filter(t => t.status === 'SPLIT' || t.status === 'FALLING_BEHIND').length;
  const offlineCount = travelers.filter(t => t.status === 'OFFLINE' || t.status === 'STALE' || t.status === 'LOCATION_OFF').length;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">
      {/* Subheader Toolbar with Summary Counts */}
      <div className="p-3 sm:p-4 border-b border-[#dadce0] bg-[#f8f9fa] space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-full bg-[#e8f0fe] text-[#1a73e8]">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-[#202124]">
                Travelers ({travelers.length})
              </h3>
              <p className="text-[11px] font-medium text-[#5f6368]">
                {movingCount > 0 && <span className="text-[#137333] font-semibold">{movingCount} Moving</span>}
                {stoppedCount > 0 && <span> · <span className="text-[#c5221f] font-semibold">{stoppedCount} Stopped</span></span>}
                {splitCount > 0 && <span> · <span className="text-[#b06000] font-semibold">{splitCount} Behind</span></span>}
                {offlineCount > 0 && <span> · <span className="text-[#80868b]">{offlineCount} Offline</span></span>}
              </p>
            </div>
          </div>

          {/* Location Privacy Toggle */}
          <button
            onClick={toggleLocationSharing}
            title={isSharingLocation ? 'Location sharing is ON (Click to disable)' : 'Location sharing is OFF (Click to enable)'}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-bold transition-all shadow-xs ${
              isSharingLocation
                ? 'bg-[#e6f4ea] text-[#137333] border border-[#ceead6] hover:bg-[#ceead6]'
                : 'bg-[#f1f3f4] text-[#5f6368] border border-[#dadce0]'
            }`}
          >
            {isSharingLocation ? <Eye className="w-3.5 h-3.5 text-[#1e8e3e]" /> : <EyeOff className="w-3.5 h-3.5 text-[#80868b]" />}
            <span>{isSharingLocation ? 'Sharing ON' : 'Sharing OFF'}</span>
          </button>
        </div>
      </div>

      {/* Members List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {travelers.map((traveler) => {
          const isSelected = selectedMemberId === traveler.id;
          const isStopped = traveler.status === 'STOPPED' || traveler.status === 'POSSIBLE_STOP';
          const isSplit = traveler.status === 'SPLIT' || traveler.status === 'FALLING_BEHIND';
          const isOffline = traveler.status === 'OFFLINE' || traveler.status === 'STALE';
          const isSharingOff = traveler.isSharingOff;

          return (
            <div
              key={traveler.id}
              onClick={() => focusMember(traveler.id)}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-[#e8f0fe] border-[#1a73e8] shadow-sm ring-1 ring-[#1a73e8]'
                  : 'bg-white hover:bg-[#f8f9fa] border-[#dadce0]'
              }`}
            >
              {/* Header: Avatar, Name, Badges, Status Pill */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* Avatar with Status Ring */}
                  <div className="relative shrink-0">
                    <img
                      src={traveler.profile_image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${traveler.name}`}
                      alt={traveler.name}
                      className="w-10 h-10 rounded-full bg-[#f1f3f4] border border-[#dadce0] object-cover"
                    />
                    {traveler.status === 'MOVING' && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#1e8e3e] ring-2 ring-white animate-pulse" />
                    )}
                    {isStopped && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#d93025] ring-2 ring-white" />
                    )}
                    {isSplit && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#f9ab00] ring-2 ring-white" />
                    )}
                    {(isOffline || isSharingOff) && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#80868b] ring-2 ring-white" />
                    )}
                  </div>

                  {/* Name & Freshness */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs sm:text-sm font-bold text-[#202124] truncate">
                        {traveler.name}
                      </span>
                      {traveler.isMe && (
                        <span className="text-[9px] uppercase font-extrabold px-1.5 py-0.2 rounded-full bg-[#1a73e8] text-white">
                          YOU
                        </span>
                      )}
                      {traveler.role === 'OWNER' && (
                        <span className="text-[10px]" title="Convoy Leader / Owner">👑</span>
                      )}
                    </div>

                    {/* Human readable location name */}
                    <div className="flex items-center gap-1 mt-0.5 text-[11px] text-[#5f6368] truncate">
                      <MapPin className="w-3 h-3 text-[#5f6368] shrink-0" />
                      <span className="truncate font-medium text-[#3c4043]">
                        {traveler.locationName}
                      </span>
                    </div>

                    {/* Freshness Update Time */}
                    <p className="text-[10px] text-[#80868b] mt-0.5">
                      {isSharingOff
                        ? 'Sharing disabled'
                        : isOffline
                        ? 'Location unavailable'
                        : traveler.lastSeen
                        ? `Updated ${timeAgo(traveler.lastSeen)}`
                        : 'Connecting...'}
                    </p>
                  </div>
                </div>

                {/* Status Badge */}
                <StatusBadge
                  status={traveler.status}
                  speed={traveler.speed}
                  distance={traveler.distanceFromGroupKm}
                />
              </div>

              {/* Stop Callout Banner if Stopped */}
              {isStopped && (
                <div className="mt-2.5 p-2 rounded-xl bg-[#fce8e6] border border-[#fad2cf] text-xs text-[#c5221f] flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 truncate">
                    <span>🛑</span>
                    <span className="truncate font-semibold">
                      {traveler.stoppedLocationName || 'Rest Stop'}
                    </span>
                  </div>
                  {traveler.stopDurationText && (
                    <span className="font-bold shrink-0 bg-white/80 px-2 py-0.5 rounded-full border border-[#fad2cf]">
                      {traveler.stopDurationText}
                    </span>
                  )}
                </div>
              )}

              {/* Split Warning Banner if Falling Behind */}
              {isSplit && (
                <div className="mt-2.5 p-2 rounded-xl bg-[#fef7e0] border border-[#feefc3] text-xs text-[#b06000] flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 truncate">
                    <AlertTriangle className="w-3.5 h-3.5 text-[#f9ab00] shrink-0" />
                    <span className="truncate font-bold">
                      {traveler.distanceFromGroupKm ? `${traveler.distanceFromGroupKm} km behind convoy` : 'Falling behind'}
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold bg-white/80 px-1.5 py-0.5 rounded-full border border-[#feefc3]">
                    Separated
                  </span>
                </div>
              )}

              {/* Live Convoy Telemetry Metrics Bar */}
              {!isSharingOff && !isOffline && traveler.latitude && (
                <div className="mt-2.5 pt-2 border-t border-[#f1f3f4] grid grid-cols-3 gap-1.5 text-center text-xs">
                  <div className="bg-[#f8f9fa] p-1.5 rounded-xl border border-[#dadce0]">
                    <span className="text-[9px] text-[#5f6368] block font-medium">Distance</span>
                    <span className={`font-mono font-bold text-[11px] ${isSplit ? 'text-[#b06000]' : 'text-[#202124]'}`}>
                      {traveler.distanceFromGroupKm !== null ? formatDistance(traveler.distanceFromGroupKm) : '--'}
                    </span>
                  </div>

                  <div className="bg-[#f8f9fa] p-1.5 rounded-xl border border-[#dadce0]">
                    <span className="text-[9px] text-[#5f6368] block font-medium">Speed</span>
                    <span className="font-mono font-bold text-[11px] text-[#202124]">
                      {isStopped ? '0 km/h' : traveler.speed !== null ? formatSpeed(traveler.speed) : '--'}
                    </span>
                  </div>

                  <div className="bg-[#f8f9fa] p-1.5 rounded-xl border border-[#dadce0]">
                    <span className="text-[9px] text-[#5f6368] block font-medium">ETA</span>
                    <span className="font-mono font-bold text-[11px] text-[#1a73e8]">
                      {traveler.eta || 'N/A'}
                    </span>
                  </div>
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
