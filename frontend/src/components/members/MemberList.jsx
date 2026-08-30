import React from 'react';
import { Users, Eye, EyeOff, AlertTriangle, Navigation, Clock, MapPin, Gauge, CheckCircle2 } from 'lucide-react';
import useTripStore, { selectTravelers } from '../../store/tripStore.js';
import useAuthStore from '../../store/authStore.js';
import StatusBadge from '../common/StatusBadge.jsx';
import { formatDistance, formatSpeed, timeAgo } from '../../utils/formatters.js';

export function MemberList() {
  const {
    members,
    liveLocations,
    trip,
    selectedMemberId,
    focusMember,
    isSharingLocation,
    toggleLocationSharing
  } = useTripStore();

  const { user: currentUser } = useAuthStore();

  const travelers = selectTravelers(members, liveLocations, currentUser?.id, trip?.destination);

  // Group status counts
  const leaderTraveler = travelers.find(t => t.isLeader);
  const arrivedCount = travelers.filter(t => t.status === 'ARRIVED').length;
  const movingCount = travelers.filter(t => t.status === 'MOVING' || t.status === 'REJOINED').length;
  const stoppedCount = travelers.filter(t => t.status === 'STOPPED' || t.status === 'POSSIBLE_STOP').length;
  const splitCount = travelers.filter(t => t.status === 'SPLIT' || t.status === 'FALLING_BEHIND').length;
  const offlineCount = travelers.filter(t => t.status === 'OFFLINE' || t.status === 'STALE' || t.status === 'LOCATION_OFF').length;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">
      {/* Subheader Toolbar with Convoy Hierarchy Summary */}
      <div className="p-3 border-b border-[#dadce0] bg-[#f8f9fa] space-y-2 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-full bg-[#e8f0fe] text-[#1a73e8] shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-xs sm:text-sm font-bold text-[#202124]">
                  Travelers ({travelers.length})
                </h3>
                {leaderTraveler && (
                  <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-full bg-[#fef7e0] text-[#b06000] border border-[#feefc3] shrink-0">
                    👑 {leaderTraveler.name} · Leader
                  </span>
                )}
              </div>
              <p className="text-[10px] font-medium text-[#5f6368] truncate mt-0.5">
                {movingCount > 0 && <span className="text-[#137333] font-semibold">🟢 {movingCount} Moving</span>}
                {stoppedCount > 0 && <span> · <span className="text-[#c5221f] font-semibold">🔴 {stoppedCount} Stopped</span></span>}
                {splitCount > 0 && <span> · <span className="text-[#b06000] font-semibold">⚠ {splitCount} Behind</span></span>}
                {arrivedCount > 0 && <span> · <span className="text-[#137333] font-semibold">🏁 {arrivedCount} Arrived</span></span>}
              </p>
            </div>
          </div>

          {/* Location Privacy Toggle */}
          <button
            onClick={toggleLocationSharing}
            title={isSharingLocation ? 'Location sharing is ON (Click to disable)' : 'Location sharing is OFF (Click to enable)'}
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold transition-all shrink-0 ${
              isSharingLocation
                ? 'bg-[#e6f4ea] text-[#137333] border border-[#ceead6] hover:bg-[#ceead6]'
                : 'bg-[#f1f3f4] text-[#5f6368] border border-[#dadce0]'
            }`}
          >
            {isSharingLocation ? <Eye className="w-3 h-3 text-[#1e8e3e]" /> : <EyeOff className="w-3 h-3 text-[#80868b]" />}
            <span className="hidden xs:inline">{isSharingLocation ? 'Sharing ON' : 'Sharing OFF'}</span>
          </button>
        </div>
      </div>

      {/* Members List */}
      <div className="flex-1 overflow-y-auto p-2.5 sm:p-3 space-y-2">
        {travelers.map((traveler) => {
          const isSelected = selectedMemberId === traveler.id;
          const isLeader = traveler.isLeader;
          const isArrived = traveler.status === 'ARRIVED';
          const isStopped = traveler.status === 'STOPPED' || traveler.status === 'POSSIBLE_STOP';
          const isSplit = traveler.status === 'SPLIT' || traveler.status === 'FALLING_BEHIND';
          const isOffline = traveler.status === 'OFFLINE' || traveler.status === 'STALE';
          const isSharingOff = traveler.isSharingOff;

          return (
            <div
              key={traveler.id}
              onClick={() => focusMember(traveler.id)}
              className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-[#e8f0fe] border-[#1a73e8] shadow-sm ring-1 ring-[#1a73e8]'
                  : isLeader
                  ? 'bg-[#fffdf7] hover:bg-[#fff9e6] border-[#fce8b2]'
                  : isArrived
                  ? 'bg-[#f6fbf7] hover:bg-[#eef8f0] border-[#ceead6]'
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
                      className={`w-9 h-9 rounded-full bg-[#f1f3f4] border object-cover ${
                        isLeader ? 'border-[#f9ab00] ring-2 ring-[#f9ab00]/40' : isArrived ? 'border-[#1e8e3e] ring-2 ring-[#1e8e3e]/30' : 'border-[#dadce0]'
                      }`}
                    />
                    {isArrived && (
                      <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-[#1e8e3e] ring-2 ring-white flex items-center justify-center text-[8px] text-white font-extrabold">✓</span>
                    )}
                    {isLeader && !isArrived && (
                      <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-[#f9ab00] ring-2 ring-white flex items-center justify-center text-[7px] text-white">👑</span>
                    )}
                    {!isLeader && !isArrived && traveler.status === 'MOVING' && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#1e8e3e] ring-2 ring-white animate-pulse" />
                    )}
                    {isStopped && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#d93025] ring-2 ring-white" />
                    )}
                    {isSplit && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#f9ab00] ring-2 ring-white" />
                    )}
                    {(isOffline || isSharingOff) && !isArrived && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#80868b] ring-2 ring-white" />
                    )}
                  </div>

                  {/* Name & Freshness */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs sm:text-sm font-bold text-[#202124] truncate">
                        {traveler.name}
                      </span>
                      {isLeader && (
                        <span className="text-[9px] uppercase font-extrabold px-1.5 py-0.2 rounded-full bg-[#fef7e0] text-[#b06000] border border-[#feefc3]">
                          👑 LEADER
                        </span>
                      )}
                      {traveler.isMe && (
                        <span className="text-[8px] uppercase font-extrabold px-1.5 py-0.2 rounded-full bg-[#1a73e8] text-white">
                          YOU
                        </span>
                      )}
                      {isArrived && (
                        <span className="text-[8px] uppercase font-extrabold px-1.5 py-0.2 rounded-full bg-[#e6f4ea] text-[#137333] border border-[#ceead6]">
                          🏁 ARRIVED
                        </span>
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
                    <p className="text-[10px] text-[#80868b] mt-0.5 truncate">
                      {isArrived
                        ? `Reached at ${traveler.arrivedAtTimeText || 'destination'}`
                        : isSharingOff
                        ? 'Sharing disabled'
                        : isOffline
                        ? 'Location unavailable'
                        : traveler.lastSeen
                        ? `Updated ${timeAgo(traveler.lastSeen)}`
                        : 'Connecting...'}
                    </p>
                  </div>
                </div>

                {/* Status & Speed Badge */}
                <StatusBadge
                  status={traveler.status}
                  speed={traveler.speed}
                  distance={traveler.distanceFromGroupKm}
                />
              </div>

              {/* Stop Callout Banner with Proximity POIs */}
              {isStopped && (
                <div className="mt-2 p-2 rounded-xl bg-[#fce8e6] border border-[#fad2cf] text-xs text-[#c5221f] space-y-1">
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 truncate">
                      <span>🛑</span>
                      <span className="truncate font-semibold">
                        {traveler.stoppedLocationName || 'Rest Stop'}
                      </span>
                    </div>
                    {traveler.stopDurationText && (
                      <span className="font-bold shrink-0 bg-white/80 px-1.5 py-0.2 rounded-full border border-[#fad2cf] text-[10px]">
                        {traveler.stopDurationText}
                      </span>
                    )}
                  </div>
                  {traveler.isLongStop && (
                    <div className="text-[10px] font-bold text-[#b06000] bg-[#fff8e1] px-2 py-0.5 rounded-md border border-[#ffe082]">
                      ⚠ Stationary for 10+ minutes
                    </div>
                  )}
                  {traveler.nearbyPetrol && (
                    <div className="text-[10px] text-[#202124] bg-white/90 px-2 py-0.5 rounded-md border border-[#fad2cf] flex items-center gap-1">
                      <span>⛽</span>
                      <span className="truncate font-medium">{traveler.nearbyPetrol.name} ({traveler.nearbyPetrol.distanceText})</span>
                    </div>
                  )}
                  {traveler.nearbyHotel && (
                    <div className="text-[10px] text-[#202124] bg-white/90 px-2 py-0.5 rounded-md border border-[#fad2cf] flex items-center gap-1">
                      <span>🏨</span>
                      <span className="truncate font-medium">{traveler.nearbyHotel.name} ({traveler.nearbyHotel.distanceText})</span>
                    </div>
                  )}
                </div>
              )}

              {/* Split Warning Banner with Exact Separation Distance */}
              {isSplit && (
                <div className="mt-2 p-2 rounded-xl bg-[#fef7e0] border border-[#feefc3] text-xs text-[#b06000] flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 truncate">
                    <AlertTriangle className="w-3.5 h-3.5 text-[#f9ab00] shrink-0" />
                    <span className="truncate font-bold">
                      {traveler.distanceFromGroupKm ? `⚠ ${traveler.distanceFromGroupKm} km behind convoy` : 'Falling behind'}
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold bg-white/80 px-1.5 py-0.2 rounded-full border border-[#feefc3] shrink-0">
                    Separated
                  </span>
                </div>
              )}

              {/* Arrived Banner */}
              {isArrived && (
                <div className="mt-2 p-2 rounded-xl bg-[#e6f4ea] border border-[#ceead6] text-xs text-[#137333] flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 truncate">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#1e8e3e] shrink-0" />
                    <span className="truncate font-bold">
                      Arrived at {trip?.destination || 'Destination'}
                    </span>
                  </div>
                  {traveler.arrivedAtTimeText && (
                    <span className="text-[10px] font-semibold bg-white px-1.5 py-0.2 rounded-full border border-[#ceead6] shrink-0">
                      {traveler.arrivedAtTimeText}
                    </span>
                  )}
                </div>
              )}

              {/* Live Convoy Telemetry Metrics Bar */}
              {!isSharingOff && !isOffline && traveler.latitude && !isArrived && (
                <div className="mt-2 pt-1.5 border-t border-[#f1f3f4] grid grid-cols-3 gap-1.5 text-center text-xs">
                  <div className="bg-[#f8f9fa] p-1.5 rounded-xl border border-[#dadce0]">
                    <span className="text-[9px] text-[#5f6368] block font-medium">Position</span>
                    <span className={`font-mono font-bold text-[11px] ${isSplit ? 'text-[#b06000]' : isLeader ? 'text-[#b06000]' : 'text-[#202124]'}`}>
                      {isLeader ? 'Leader' : traveler.distanceFromGroupKm !== null ? `${formatDistance(traveler.distanceFromGroupKm)}` : 'With Convoy'}
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
