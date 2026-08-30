import { create } from 'zustand';
import api from '../services/api.js';
import { getSocket } from '../services/socket.js';

/**
 * Universal Selector: Merges database group members and real-time live reporting travelers
 * into a deduplicated, rich, intelligently sorted traveler array.
 */
export function selectTravelers(members = [], liveLocations = {}, currentUserId = null) {
  const memberMap = new Map();

  // 1. Ingest database registered group members
  (members || []).forEach((m) => {
    if (m && m.id) {
      memberMap.set(m.id, {
        id: m.id,
        name: m.name || 'Traveler',
        email: m.email || '',
        profile_image: m.profile_image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${m.name || m.id}`,
        role: m.role || 'MEMBER',
        location_sharing: m.location_sharing !== false
      });
    }
  });

  // 2. Ingest/Merge live reporting members from Redis/Socket.IO
  Object.values(liveLocations || {}).forEach((loc) => {
    if (loc && (loc.userId || loc.id)) {
      const id = loc.userId || loc.id;
      const existing = memberMap.get(id) || {};
      memberMap.set(id, {
        ...existing,
        id,
        name: loc.userName || existing.name || 'Traveler',
        profile_image: loc.userImage || existing.profile_image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${loc.userName || id}`,
        role: existing.role || 'MEMBER',
        location_sharing: loc.locationSharing !== false
      });
    }
  });

  const now = Date.now();

  // 3. Compile full traveler intelligence state
  const travelers = Array.from(memberMap.values()).map((traveler) => {
    const loc = (liveLocations && liveLocations[traveler.id]) || {};
    const isMe = traveler.id === currentUserId;
    const isSharingOff = traveler.location_sharing === false || loc.locationSharing === false || loc.status === 'LOCATION_OFF';

    // Freshness & Stale Calculation
    const timestamp = loc.timestamp || (loc.lastSeen ? new Date(loc.lastSeen).getTime() : null);
    const ageSeconds = timestamp ? Math.max(0, Math.round((now - timestamp) / 1000)) : null;
    const isStale = ageSeconds !== null && ageSeconds > 180; // older than 3 mins

    // Status resolution (exclusive, non-conflicting)
    let status = 'OFFLINE';
    if (isSharingOff) {
      status = 'LOCATION_OFF';
    } else if (isStale) {
      status = 'STALE';
    } else if (loc.status) {
      status = loc.status; // 'MOVING' | 'POSSIBLE_STOP' | 'STOPPED' | 'SPLIT' | 'REJOINED'
    } else if (loc.latitude && loc.longitude) {
      status = (loc.speed && loc.speed > 3) ? 'MOVING' : 'STOPPED';
    }

    // Stop duration calculation
    let stopDurationText = null;
    if (status === 'STOPPED' || status === 'POSSIBLE_STOP') {
      if (loc.stoppedSince) {
        const stopStartMs = new Date(loc.stoppedSince).getTime();
        const stoppedSec = Math.max(0, Math.round((now - stopStartMs) / 1000));
        const stopMin = Math.round(stoppedSec / 60);
        stopDurationText = stopMin < 1 ? 'Just stopped' : `${stopMin} min`;
      } else if (loc.stopDurationSeconds) {
        const stopMin = Math.round(loc.stopDurationSeconds / 60);
        stopDurationText = stopMin < 1 ? 'Just stopped' : `${stopMin} min`;
      }
    }

    // Best Location Name (City / Highway / Landmark)
    let locationName = loc.stoppedLocationName || loc.locationName || null;
    if (!locationName && loc.latitude && loc.longitude) {
      locationName = `${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}`;
    }

    return {
      ...traveler,
      isMe,
      status,
      speed: (status === 'STOPPED' || status === 'POSSIBLE_STOP') ? 0 : (loc.speed !== undefined ? loc.speed : null),
      heading: loc.heading || 0,
      latitude: loc.latitude || null,
      longitude: loc.longitude || null,
      accuracy: loc.accuracy || null,
      distanceFromGroupKm: loc.distanceFromGroupKm !== undefined ? loc.distanceFromGroupKm : null,
      eta: loc.eta || null,
      locationName: locationName || (isSharingOff ? 'Location sharing off' : 'Location unavailable'),
      stoppedLocationName: loc.stoppedLocationName || null,
      stoppedSince: loc.stoppedSince || null,
      stopDurationText,
      lastSeen: timestamp,
      ageSeconds,
      isStale,
      isSharingOff
    };
  });

  // 4. Intelligent Sorting: Current User -> Split/Behind -> Stopped -> Moving -> Offline
  return travelers.sort((a, b) => {
    if (a.isMe && !b.isMe) return -1;
    if (!a.isMe && b.isMe) return 1;

    const rank = (s) => {
      if (s === 'SPLIT' || s === 'FALLING_BEHIND') return 1;
      if (s === 'STOPPED' || s === 'POSSIBLE_STOP') return 2;
      if (s === 'MOVING' || s === 'REJOINED') return 3;
      if (s === 'STALE') return 4;
      return 5;
    };

    const rankA = rank(a.status);
    const rankB = rank(b.status);
    if (rankA !== rankB) return rankA - rankB;

    return a.name.localeCompare(b.name);
  });
}

export const useTripStore = create((set, get) => ({
  trip: null,
  group: null,
  isOwner: false,
  members: [],
  liveLocations: {},
  stops: [],
  events: [],
  groupCenter: null,
  groupEta: { formattedEta: 'Calculating...', totalMinutes: 0 },
  
  // UI & Interaction states
  selectedMemberId: null,
  selectedStop: null,
  activeAlert: null,
  isSharingLocation: true,
  isLoadingTrip: true,
  connectionStatus: 'connected',

  // Map camera focus & coordination state
  mapFocus: null, // { lat, lng, zoom, fitGroup, targetId, timestamp }
  layerVisibility: { route: true, stops: true, members: true },
  isDrawerOpen: true,
  activeDrawerTab: 'MEMBERS', // 'MEMBERS' | 'TIMELINE'

  // Simulation mode states
  isSimulationActive: false,
  simulationSpeed: 1, // 1x, 2x, 5x, 10x
  simulationScenario: 'standard',

  // Actions
  fetchTripDetails: async (tripId) => {
    set({ isLoadingTrip: true });
    try {
      const data = await api.getTripDetails(tripId);
      set({
        trip: data.trip,
        group: data.group,
        isOwner: data.isOwner,
        members: data.members || [],
        liveLocations: data.liveLocations || {},
        stops: data.stops || [],
        events: data.events || [],
        isLoadingTrip: false
      });
      return data;
    } catch (err) {
      console.error('[TripStore] Fetch error:', err);
      set({ isLoadingTrip: false });
      throw err;
    }
  },

  setTripData: (data) => set(data),

  setLiveLocations: (locations) => {
    set((state) => {
      // Auto-sync members with any incoming reporting traveler
      const newMembers = [...state.members];
      Object.values(locations || {}).forEach((loc) => {
        if (loc && (loc.userId || loc.id)) {
          const id = loc.userId || loc.id;
          const exists = newMembers.some((m) => m.id === id);
          if (!exists) {
            newMembers.push({
              id,
              name: loc.userName || 'Traveler',
              email: '',
              profile_image: loc.userImage || '',
              role: 'MEMBER',
              location_sharing: loc.locationSharing !== false,
              joined_at: new Date().toISOString()
            });
          }
        }
      });

      return {
        liveLocations: locations,
        members: newMembers
      };
    });
  },

  updateMemberLocation: (location) => {
    set((state) => {
      const userId = location.userId || location.id;
      if (!userId) return state;

      // Auto-sync members array
      const newMembers = [...state.members];
      const memberIndex = newMembers.findIndex((m) => m.id === userId);
      if (memberIndex === -1) {
        newMembers.push({
          id: userId,
          name: location.userName || 'Traveler',
          email: '',
          profile_image: location.userImage || '',
          role: 'MEMBER',
          location_sharing: location.locationSharing !== false,
          joined_at: new Date().toISOString()
        });
      } else if (location.userName) {
        newMembers[memberIndex] = {
          ...newMembers[memberIndex],
          name: location.userName || newMembers[memberIndex].name,
          profile_image: location.userImage || newMembers[memberIndex].profile_image
        };
      }

      return {
        liveLocations: {
          ...state.liveLocations,
          [userId]: location
        },
        members: newMembers
      };
    });
  },

  setGroupCenterAndEta: (groupCenter, groupEta) => {
    set({ groupCenter, groupEta });
  },

  addEvent: (event) => {
    set((state) => {
      if (state.events.some(e => e.id === event.id)) return state;
      const updatedEvents = [event, ...state.events];

      let alert = null;
      if (event.event_type === 'MEMBER_FELL_BEHIND' || event.event_type === 'GROUP_SPLIT') {
        alert = {
          type: 'warning',
          title: 'Separation Alert',
          message: event.metadata?.message || `${event.user_name} is falling behind the convoy!`,
          targetUserId: event.user_id,
          userName: event.user_name,
          actionLabel: `View ${event.user_name}`,
          timestamp: Date.now()
        };
      } else if (event.event_type === 'STOP_STARTED') {
        alert = {
          type: 'danger',
          title: 'Stop Detected',
          message: `${event.user_name} stopped at ${event.location_name || 'Highway'}`,
          targetStopId: event.metadata?.stopId,
          targetUserId: event.user_id,
          userName: event.user_name,
          locationName: event.location_name,
          actionLabel: 'View Stop',
          timestamp: Date.now()
        };
      } else if (event.event_type === 'MEMBER_REJOINED') {
        alert = {
          type: 'success',
          title: 'Member Rejoined',
          message: event.metadata?.message || `${event.user_name} rejoined the convoy!`,
          targetUserId: event.user_id,
          userName: event.user_name,
          actionLabel: `View ${event.user_name}`,
          timestamp: Date.now()
        };
      }

      return {
        events: updatedEvents,
        ...(alert && { activeAlert: alert })
      };
    });
  },

  addStop: (stop) => {
    set((state) => ({
      stops: [stop, ...state.stops.filter(s => s.id !== stop.id)]
    }));
  },

  updateStop: (stop) => {
    set((state) => ({
      stops: state.stops.map(s => s.id === stop.id ? { ...s, ...stop } : s)
    }));
  },

  updateMemberStatus: (userId, status, locationSharing) => {
    set((state) => {
      const loc = state.liveLocations[userId];
      if (!loc) return state;
      return {
        liveLocations: {
          ...state.liveLocations,
          [userId]: {
            ...loc,
            status: status || loc.status,
            ...(locationSharing !== undefined && { locationSharing })
          }
        }
      };
    });
  },

  setSelectedMemberId: (id) => set({ selectedMemberId: id }),

  setSelectedStop: (stop) => set({ selectedStop: stop }),

  clearActiveAlert: () => set({ activeAlert: null }),

  // Map camera focus and navigation actions
  focusLocation: (lat, lng, zoom = 14) => {
    set({
      mapFocus: { lat, lng, zoom, timestamp: Date.now() }
    });
  },

  fitConvoy: () => {
    set({
      mapFocus: { fitGroup: true, timestamp: Date.now() }
    });
  },

  focusMember: (userId) => {
    const loc = get().liveLocations[userId];
    if (loc && loc.latitude && loc.longitude) {
      set({
        selectedMemberId: userId,
        mapFocus: {
          lat: loc.latitude,
          lng: loc.longitude,
          zoom: 15,
          targetId: userId,
          timestamp: Date.now()
        }
      });
    } else {
      set({ selectedMemberId: userId });
    }
  },

  focusStop: (stop) => {
    if (stop && stop.latitude && stop.longitude) {
      set({
        selectedStop: stop,
        mapFocus: {
          lat: stop.latitude,
          lng: stop.longitude,
          zoom: 15,
          targetId: stop.id,
          timestamp: Date.now()
        }
      });
    } else {
      set({ selectedStop: stop });
    }
  },

  toggleLayer: (layerName) => {
    set((state) => ({
      layerVisibility: {
        ...state.layerVisibility,
        [layerName]: !state.layerVisibility[layerName]
      }
    }));
  },

  setDrawerOpen: (isOpen) => set({ isDrawerOpen: isOpen }),
  setActiveDrawerTab: (tab) => set({ activeDrawerTab: tab, isDrawerOpen: tab !== null }),

  toggleLocationSharing: () => {
    const nextVal = !get().isSharingLocation;
    set({ isSharingLocation: nextVal });
    const socket = getSocket();
    const trip = get().trip;
    if (socket && trip) {
      if (nextVal) {
        socket.emit('location:sharing:start', { tripId: trip.id });
      } else {
        socket.emit('location:sharing:stop', { tripId: trip.id });
      }
    }
  },

  setSimulationActive: (active) => set({ isSimulationActive: active }),
  setSimulationSpeed: (speed) => set({ simulationSpeed: speed }),
  setSimulationScenario: (scenario) => set({ simulationScenario: scenario }),
  setConnectionStatus: (status) => set({ connectionStatus: status }),

  resetTrip: () => set({
    trip: null,
    group: null,
    members: [],
    liveLocations: {},
    stops: [],
    events: [],
    groupCenter: null,
    groupEta: { formattedEta: 'Calculating...', totalMinutes: 0 },
    selectedMemberId: null,
    selectedStop: null,
    activeAlert: null,
    mapFocus: null,
    isSimulationActive: false
  })
}));

export default useTripStore;
