import { create } from 'zustand';
import api from '../services/api.js';
import { getSocket } from '../services/socket.js';

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

  setLiveLocations: (locations) => set({ liveLocations: locations }),

  updateMemberLocation: (location) => {
    set((state) => ({
      liveLocations: {
        ...state.liveLocations,
        [location.userId]: location
      }
    }));
  },

  setGroupCenterAndEta: (groupCenter, groupEta) => {
    set({ groupCenter, groupEta });
  },

  addEvent: (event) => {
    set((state) => {
      // Check duplicate
      if (state.events.some(e => e.id === event.id)) return state;
      const updatedEvents = [event, ...state.events];

      // If significant event, set active banner alert
      let alert = null;
      if (event.event_type === 'MEMBER_FELL_BEHIND' || event.event_type === 'GROUP_SPLIT') {
        alert = { type: 'warning', message: event.metadata?.message || `${event.user_name} fell behind!`, timestamp: Date.now() };
      } else if (event.event_type === 'STOP_STARTED') {
        alert = { type: 'info', message: `${event.user_name} stopped at ${event.location_name || 'Highway'}`, timestamp: Date.now() };
      } else if (event.event_type === 'MEMBER_REJOINED') {
        alert = { type: 'success', message: event.metadata?.message || `${event.user_name} rejoined the group!`, timestamp: Date.now() };
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
    isSimulationActive: false
  })
}));

export default useTripStore;
