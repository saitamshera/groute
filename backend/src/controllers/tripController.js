import { z } from 'zod';
import db from '../models/db.js';
import redisStore from '../services/redisStore.js';
import mapService from '../services/mapService.js';
import { v4 as uuidv4 } from 'uuid';

export const createTripSchema = z.object({
  body: z.object({
    group_id: z.string().min(1, 'Group ID is required'),
    name: z.string().min(2, 'Trip name must be at least 2 characters'),
    origin: z.string().min(1, 'Origin is required'),
    destination: z.string().min(1, 'Destination is required'),
    origin_lat: z.number(),
    origin_lng: z.number(),
    destination_lat: z.number(),
    destination_lng: z.number(),
    route_polyline: z.string().optional(),
    distance: z.string().optional(),
    estimated_duration: z.string().optional()
  })
});

export const tripController = {
  async createTrip(req, res) {
    try {
      const {
        group_id,
        name,
        origin,
        destination,
        origin_lat,
        origin_lng,
        destination_lat,
        destination_lng,
        route_polyline = '',
        distance = '',
        estimated_duration = ''
      } = req.body;

      // Verify membership & owner role
      const membership = db.tables.get('group_members').find(
        m => m.group_id === group_id && m.user_id === req.user.id
      );

      if (!membership) {
        return res.status(403).json({ error: 'You must be a group member to create a trip.' });
      }

      // If route details missing, calculate via mapService
      let routeData = { polyline: route_polyline, distance, duration: estimated_duration };
      if (!route_polyline) {
        const calculated = await mapService.calculateRoute(
          { lat: origin_lat, lng: origin_lng },
          { lat: destination_lat, lng: destination_lng }
        );
        routeData.polyline = calculated.polyline || '';
        routeData.distance = calculated.distance || '535 km';
        routeData.duration = calculated.duration || '11h 30m';
      }

      const trip = db.tables.insert('trips', {
        group_id,
        name: name.trim(),
        origin,
        destination,
        origin_lat,
        origin_lng,
        destination_lat,
        destination_lng,
        route_polyline: routeData.polyline,
        distance: routeData.distance,
        estimated_duration: routeData.duration,
        status: 'PLANNED',
        started_at: null,
        ended_at: null
      });

      // Add creator to trip_members with location sharing default
      db.tables.insert('trip_members', {
        trip_id: trip.id,
        user_id: req.user.id,
        location_sharing: true,
        sharing_started_at: new Date().toISOString(),
        sharing_ended_at: null
      });

      return res.status(201).json({
        message: 'Trip created successfully',
        trip
      });
    } catch (err) {
      console.error('[Trip] Create error:', err);
      return res.status(500).json({ error: 'Failed to create trip.' });
    }
  },

  async getTripDetails(req, res) {
    try {
      const { tripId } = req.params;
      const trip = db.tables.get('trips').find(t => t.id === tripId);

      if (!trip) {
        return res.status(404).json({ error: 'Trip not found.' });
      }

      // Verify membership
      const membership = db.tables.get('group_members').find(
        m => m.group_id === trip.group_id && m.user_id === req.user.id
      );

      if (!membership) {
        return res.status(403).json({ error: 'You do not have access to this trip.' });
      }

      const group = db.tables.get('groups').find(g => g.id === trip.group_id);
      const groupMembers = db.tables.get('group_members').filter(m => m.group_id === trip.group_id);
      const allUsers = db.tables.get('users');
      const tripMembers = db.tables.get('trip_members').filter(tm => tm.trip_id === tripId);

      // Build member list
      const members = groupMembers.map(gm => {
        const user = allUsers.find(u => u.id === gm.user_id);
        const tm = tripMembers.find(t => t.user_id === gm.user_id);
        return {
          id: gm.user_id,
          name: user ? user.name : 'Unknown',
          email: user ? user.email : '',
          profile_image: user ? user.profile_image : '',
          role: gm.role,
          location_sharing: tm ? tm.location_sharing : false,
          assigned_route_polyline: tm ? tm.assigned_route_polyline : null,
          joined_at: gm.joined_at
        };
      });

      // Get real-time locations from Redis
      const liveLocations = await redisStore.hgetall(`trip:${tripId}:locations`);
      
      // Get stops
      const stops = db.tables.get('stops').filter(s => s.trip_id === tripId);

      // Get timeline events
      const events = db.tables.get('trip_events')
        .filter(e => e.trip_id === tripId)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      const chatMessages = db.tables.get('chat_messages')
        .filter(message => message.trip_id === tripId)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

      return res.json({
        trip,
        group,
        isOwner: membership.role === 'OWNER',
        members,
        liveLocations,
        stops,
        events,
        chatMessages
      });
    } catch (err) {
      console.error('[Trip] Get details error:', err);
      return res.status(500).json({ error: 'Failed to fetch trip details.' });
    }
  },

  async startTrip(req, res) {
    try {
      const { tripId } = req.params;
      const trip = db.tables.get('trips').find(t => t.id === tripId);

      if (!trip) {
        return res.status(404).json({ error: 'Trip not found.' });
      }

      // Check owner permission
      const membership = db.tables.get('group_members').find(
        m => m.group_id === trip.group_id && m.user_id === req.user.id
      );

      if (!membership || membership.role !== 'OWNER') {
        return res.status(403).json({ error: 'Only the group owner can start the trip.' });
      }

      const startedAt = new Date().toISOString();
      const updatedTrip = db.tables.update('trips', t => t.id === tripId, {
        status: 'ACTIVE',
        started_at: startedAt
      });

      // Create TRIP_STARTED event
      const startEvent = {
        id: uuidv4(),
        trip_id: tripId,
        user_id: req.user.id,
        user_name: req.user.name,
        user_image: req.user.profile_image,
        event_type: 'TRIP_STARTED',
        latitude: trip.origin_lat,
        longitude: trip.origin_lng,
        metadata: {
          tripName: trip.name,
          origin: trip.origin,
          destination: trip.destination,
          startedAt
        },
        created_at: startedAt
      };
      db.tables.insert('trip_events', startEvent);

      return res.json({
        message: 'Trip started successfully',
        trip: updatedTrip,
        event: startEvent
      });
    } catch (err) {
      console.error('[Trip] Start trip error:', err);
      return res.status(500).json({ error: 'Failed to start trip.' });
    }
  },

  async endTrip(req, res) {
    try {
      const { tripId } = req.params;
      const trip = db.tables.get('trips').find(t => t.id === tripId);

      if (!trip) {
        return res.status(404).json({ error: 'Trip not found.' });
      }

      const membership = db.tables.get('group_members').find(
        m => m.group_id === trip.group_id && m.user_id === req.user.id
      );

      if (!membership || membership.role !== 'OWNER') {
        return res.status(403).json({ error: 'Only the group owner can complete the trip.' });
      }

      const endedAt = new Date().toISOString();
      const updatedTrip = db.tables.update('trips', t => t.id === tripId, {
        status: 'COMPLETED',
        ended_at: endedAt
      });

      // Turn off location sharing for all trip members
      const allTripMembers = db.tables.get('trip_members').filter(tm => tm.trip_id === tripId);
      for (const tm of allTripMembers) {
        db.tables.update('trip_members', m => m.id === tm.id, {
          location_sharing: false,
          sharing_ended_at: endedAt
        });
      }

      // Create TRIP_COMPLETED event
      const endEvent = {
        id: uuidv4(),
        trip_id: tripId,
        user_id: req.user.id,
        user_name: req.user.name,
        user_image: req.user.profile_image,
        event_type: 'TRIP_COMPLETED',
        latitude: trip.destination_lat,
        longitude: trip.destination_lng,
        metadata: {
          tripName: trip.name,
          endedAt
        },
        created_at: endedAt
      };
      db.tables.insert('trip_events', endEvent);
      db.tables.delete('chat_messages', message => message.trip_id === tripId);

      return res.json({
        message: 'Trip completed successfully',
        trip: updatedTrip,
        event: endEvent
      });
    } catch (err) {
      console.error('[Trip] End trip error:', err);
      return res.status(500).json({ error: 'Failed to complete trip.' });
    }
  },

  async updateMemberRoute(req, res) {
    try {
      const { tripId, userId } = req.params;
      const { route_polyline } = req.body;

      const trip = db.tables.get('trips').find(t => t.id === tripId);
      if (!trip) {
        return res.status(404).json({ error: 'Trip not found.' });
      }

      // Check permissions: Only the user or the trip owner can update it
      const membership = db.tables.get('group_members').find(
        m => m.group_id === trip.group_id && m.user_id === req.user.id
      );
      if (!membership || (membership.role !== 'OWNER' && req.user.id !== userId)) {
        return res.status(403).json({ error: 'Permission denied.' });
      }

      const tripMember = db.tables.get('trip_members').find(tm => tm.trip_id === tripId && tm.user_id === userId);
      if (!tripMember) {
        return res.status(404).json({ error: 'User is not a part of this trip.' });
      }

      const updated = db.tables.update('trip_members', tm => tm.id === tripMember.id, {
        assigned_route_polyline: route_polyline
      });

      return res.json({ message: 'Member route updated successfully', member: updated });
    } catch (err) {
      console.error('[Trip] Update member route error:', err);
      return res.status(500).json({ error: 'Failed to update member route.' });
    }
  },

  async getTripTimeline(req, res) {
    try {
      const { tripId } = req.params;
      const events = db.tables.get('trip_events')
        .filter(e => e.trip_id === tripId)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      return res.json({ events });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to fetch timeline.' });
    }
  },

  async getTripStops(req, res) {
    try {
      const { tripId } = req.params;
      const stops = db.tables.get('stops')
        .filter(s => s.trip_id === tripId)
        .sort((a, b) => new Date(b.started_at) - new Date(a.started_at));

      return res.json({ stops });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to fetch stops.' });
    }
  },

  async getTripLocations(req, res) {
    try {
      const { tripId } = req.params;
      const liveLocations = await redisStore.hgetall(`trip:${tripId}:locations`);
      return res.json({ locations: liveLocations });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to fetch locations.' });
    }
  },

  async getTripLocationHistory(req, res) {
    try {
      const { tripId } = req.params;
      const history = db.tables.get('locations')
        .filter(l => l.trip_id === tripId)
        .slice(-200); // Last 200 telemetry points

      return res.json({ history });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to fetch location history.' });
    }
  },

  async getUserActiveTrips(req, res) {
    try {
      const userGroupMemberships = db.tables.get('group_members').filter(m => m.user_id === req.user.id);
      const groupIds = userGroupMemberships.map(m => m.group_id);

      const allTrips = db.tables.get('trips').filter(t => groupIds.includes(t.group_id));
      const allGroups = db.tables.get('groups');

      const enriched = allTrips.map(trip => {
        const group = allGroups.find(g => g.id === trip.group_id);
        return {
          ...trip,
          group_name: group ? group.name : 'Group'
        };
      });

      return res.json({
        activeTrips: enriched.filter(t => t.status === 'ACTIVE'),
        recentTrips: enriched.filter(t => t.status !== 'ACTIVE').slice(-10)
      });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to fetch user trips.' });
    }
  },

  async getRecommendedTrips(req, res) {
    try {
      const cutoff = Date.now() - (30 * 24 * 60 * 60 * 1000);
      const routeMap = new Map();

      db.tables.get('trips')
        .filter(trip => {
          const createdAt = new Date(trip.created_at || trip.started_at || 0).getTime();
          return Number.isFinite(createdAt) && createdAt >= cutoff;
        })
        .sort((a, b) => new Date(b.created_at || b.started_at) - new Date(a.created_at || a.started_at))
        .forEach(trip => {
          const routeKey = `${trip.origin}|${trip.destination}`.toLowerCase();
          if (!routeMap.has(routeKey)) {
            routeMap.set(routeKey, {
              id: trip.id,
              name: trip.name,
              origin: trip.origin,
              destination: trip.destination,
              origin_lat: trip.origin_lat,
              origin_lng: trip.origin_lng,
              destination_lat: trip.destination_lat,
              destination_lng: trip.destination_lng,
              distance: trip.distance,
              estimated_duration: trip.estimated_duration,
              created_at: trip.created_at
            });
          }
        });

      return res.json({ recommendations: Array.from(routeMap.values()).slice(0, 6) });
    } catch (err) {
      console.error('[Trip] Recommendations error:', err);
      return res.status(500).json({ error: 'Failed to fetch trip recommendations.' });
    }
  },

  async getTripPOIs(req, res) {
    try {
      const { tripId } = req.params;
      const trip = db.tables.get('trips').find(t => t.id === tripId);
      if (!trip) {
        return res.status(404).json({ error: 'Trip not found.' });
      }

      // Verify membership
      const membership = db.tables.get('group_members').find(
        m => m.group_id === trip.group_id && m.user_id === req.user.id
      );

      if (!membership) {
        return res.status(403).json({ error: 'You do not have access to this trip.' });
      }

      const pois = await mapService.searchRouteCorridorPOIs(
        trip.origin_lat,
        trip.origin_lng,
        trip.destination_lat,
        trip.destination_lng
      );
      return res.json({ pois });
    } catch (err) {
      console.error('[Trip] Get POIs error:', err);
      return res.status(500).json({ error: 'Failed to fetch trip POIs.' });
    }
  }
};

export default tripController;
