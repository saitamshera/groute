import { haversineDistanceKm, haversineDistanceMeters, calculateCentroid } from '../utils/geo.js';
import mapService from './mapService.js';
import redisStore from './redisStore.js';
import db from '../models/db.js';
import { v4 as uuidv4 } from 'uuid';

// In-memory state tracking buffers for state-machine transitions
const memberStateBuffers = new Map(); // key: `${tripId}:${userId}`

function getMemberBuffer(tripId, userId) {
  const key = `${tripId}:${userId}`;
  if (!memberStateBuffers.has(key)) {
    memberStateBuffers.set(key, {
      lastLocations: [],
      currentStatus: 'MOVING',
      stopCandidateStartTime: null,
      activeStopId: null,
      activeStopStartTime: null,
      activeStopLocationName: null,
      activeStopCoords: null,
      splitCandidateStartTime: null,
      isSplitAlerted: false,
      lastEmittedRejoinTime: 0
    });
  }
  return memberStateBuffers.get(key);
}

export const eventEngine = {
  /**
   * Main pipeline: Ingest a raw location telemetry update, process through
   * detection engines, update Redis, persist if needed, and return generated events.
   */
  async processLocationUpdate({ tripId, userId, latitude, longitude, accuracy = 10, speed = 0, heading = 0, timestamp = Date.now() }) {
    // 1. Fetch trip details
    const trip = db.tables.get('trips').find(t => t.id === tripId);
    if (!trip) {
      throw new Error(`Trip ${tripId} not found`);
    }

    const user = db.tables.get('users').find(u => u.id === userId);
    const userName = user ? user.name : 'Group Member';
    const userImage = user ? user.profile_image : '';

    const buffer = getMemberBuffer(tripId, userId);
    const generatedEvents = [];

    const stopTimeThreshold = parseInt(process.env.STOP_DETECTION_TIME_MS || '20000', 10);
    const splitDistanceThreshold = parseFloat(process.env.SPLIT_DISTANCE_KM || '5.0');
    const rejoinDistanceThreshold = parseFloat(process.env.REJOIN_DISTANCE_KM || '2.0');

    // 2. Accuracy sanity check
    const isLowAccuracy = accuracy > 100;

    // Maintain a rolling history buffer of recent GPS coordinates (last 10 updates)
    const currentPoint = { latitude, longitude, speed, heading, accuracy, timestamp };
    buffer.lastLocations.push(currentPoint);
    if (buffer.lastLocations.length > 10) {
      buffer.lastLocations.shift();
    }

    // 3. STOP DETECTION STATE MACHINE
    // Speed threshold < 3.0 km/h and spatial drift < 50 meters
    const isSpeedStationary = speed < 3.0;
    
    // Calculate maximum displacement across recent window
    let maxDisplacementMeters = 0;
    if (buffer.lastLocations.length > 1) {
      const first = buffer.lastLocations[0];
      maxDisplacementMeters = haversineDistanceMeters(first.latitude, first.longitude, latitude, longitude);
    }
    const isSpatialStationary = maxDisplacementMeters < 50;

    if (isSpeedStationary && isSpatialStationary && !isLowAccuracy) {
      if (!buffer.stopCandidateStartTime) {
        buffer.stopCandidateStartTime = timestamp;
        buffer.currentStatus = 'POSSIBLE_STOP';
      } else {
        const stationaryDuration = timestamp - buffer.stopCandidateStartTime;
        
        // If stationary condition persists past threshold -> Confirm STOPPED
        if (stationaryDuration >= stopTimeThreshold && buffer.currentStatus !== 'STOPPED') {
          buffer.currentStatus = 'STOPPED';
          buffer.activeStopStartTime = buffer.stopCandidateStartTime;
          buffer.activeStopCoords = { latitude, longitude };

          // Reverse geocode place name
          const locationName = await mapService.reverseGeocode(latitude, longitude);
          buffer.activeStopLocationName = locationName;

          // Record stop in database
          const stopRecord = db.tables.insert('stops', {
            trip_id: tripId,
            user_id: userId,
            latitude,
            longitude,
            location_name: locationName,
            started_at: new Date(buffer.activeStopStartTime).toISOString(),
            ended_at: null,
            duration_seconds: 0
          });
          buffer.activeStopId = stopRecord.id;

          // Generate STOP_STARTED Event
          const stopEvent = {
            id: uuidv4(),
            trip_id: tripId,
            user_id: userId,
            user_name: userName,
            user_image: userImage,
            event_type: 'STOP_STARTED',
            latitude,
            longitude,
            location_name: locationName,
            metadata: {
              locationName,
              startedAt: new Date(buffer.activeStopStartTime).toISOString()
            },
            created_at: new Date().toISOString()
          };
          db.tables.insert('trip_events', stopEvent);
          generatedEvents.push(stopEvent);
        }
      }
    } else if ((speed >= 5.0 || maxDisplacementMeters > 75) && !isLowAccuracy) {
      // Movement has resumed!
      if (buffer.currentStatus === 'STOPPED' && buffer.activeStopId) {
        const endedAt = new Date().toISOString();
        const durationSeconds = Math.round((timestamp - buffer.activeStopStartTime) / 1000);
        const durationMinutes = Math.max(1, Math.round(durationSeconds / 60));

        // Update stop in database
        db.tables.update('stops', s => s.id === buffer.activeStopId, {
          ended_at: endedAt,
          duration_seconds: durationSeconds
        });

        // Generate STOP_ENDED Event
        const stopEndEvent = {
          id: uuidv4(),
          trip_id: tripId,
          user_id: userId,
          user_name: userName,
          user_image: userImage,
          event_type: 'STOP_ENDED',
          latitude,
          longitude,
          location_name: buffer.activeStopLocationName,
          metadata: {
            locationName: buffer.activeStopLocationName,
            durationSeconds,
            durationMinutes,
            startedAt: new Date(buffer.activeStopStartTime).toISOString(),
            endedAt
          },
          created_at: new Date().toISOString()
        };
        db.tables.insert('trip_events', stopEndEvent);
        generatedEvents.push(stopEndEvent);

        // Reset stop tracking
        buffer.activeStopId = null;
        buffer.activeStopStartTime = null;
        buffer.activeStopLocationName = null;
      }

      buffer.stopCandidateStartTime = null;
      buffer.currentStatus = 'MOVING';
    }

    // 4. Update Current Member's Redis State
    const individualEta = mapService.calculateIndividualEta(
      latitude,
      longitude,
      trip.destination_lat,
      trip.destination_lng,
      speed
    );

    const memberLocationState = {
      userId,
      userName,
      userImage,
      latitude,
      longitude,
      accuracy,
      speed: Math.round(speed * 10) / 10,
      heading: Math.round(heading),
      timestamp,
      status: buffer.currentStatus,
      stoppedLocationName: buffer.activeStopLocationName,
      stoppedSince: buffer.activeStopStartTime ? new Date(buffer.activeStopStartTime).toISOString() : null,
      eta: individualEta.formattedEta,
      distanceToDestinationKm: individualEta.distanceKm,
      lastSeen: new Date(timestamp).toISOString(),
      isStale: false,
      locationSharing: true
    };

    await redisStore.hset(`trip:${tripId}:locations`, userId, memberLocationState);

    // 5. GROUP CENTROID & SPLIT / REJOIN ENGINE
    const allLocations = await redisStore.hgetall(`trip:${tripId}:locations`);
    const activeLocations = Object.values(allLocations).filter(loc => {
      // Exclude explicitly disabled location sharing
      if (loc.locationSharing === false) return false;
      // Freshness check: if timestamp is modern Date.now() timestamp, ensure < 180s old
      if (loc.timestamp > 1000000000000) {
        const ageSeconds = (Date.now() - loc.timestamp) / 1000;
        return ageSeconds < 180;
      }
      return true;
    });

    const centroid = calculateCentroid(activeLocations.map(l => ({ latitude: l.latitude, longitude: l.longitude })));

    let groupEta = { formattedEta: 'N/A', totalMinutes: 0 };
    if (centroid) {
      groupEta = mapService.calculateGroupEta(activeLocations, trip.destination_lat, trip.destination_lng);

      // Calculate each member's distance from centroid and evaluate Split/Rejoin
      for (const loc of activeLocations) {
        const distFromCentroidKm = haversineDistanceKm(loc.latitude, loc.longitude, centroid.latitude, centroid.longitude);
        loc.distanceFromGroupKm = Math.round(distFromCentroidKm * 10) / 10;

        const memBuffer = getMemberBuffer(tripId, loc.userId);

        // Group Split / Falling Behind Detection
        if (distFromCentroidKm >= splitDistanceThreshold && !isLowAccuracy) {
          if (!memBuffer.isSplitAlerted) {
            memBuffer.isSplitAlerted = true;
            memBuffer.currentStatus = 'SPLIT';
            loc.status = 'SPLIT';

            const splitEvent = {
              id: uuidv4(),
              trip_id: tripId,
              user_id: loc.userId,
              user_name: loc.userName,
              user_image: loc.userImage,
              event_type: 'MEMBER_FELL_BEHIND',
              latitude: loc.latitude,
              longitude: loc.longitude,
              metadata: {
                distanceKm: loc.distanceFromGroupKm,
                message: `${loc.userName} is ${loc.distanceFromGroupKm} km behind the group`
              },
              created_at: new Date().toISOString()
            };
            db.tables.insert('trip_events', splitEvent);
            generatedEvents.push(splitEvent);
          }
        } else if (distFromCentroidKm <= rejoinDistanceThreshold) {
          // Rejoin condition
          if (memBuffer.isSplitAlerted) {
            memBuffer.isSplitAlerted = false;
            memBuffer.lastEmittedRejoinTime = Date.now();
            memBuffer.currentStatus = 'MOVING';
            loc.status = 'REJOINED';

            const rejoinEvent = {
              id: uuidv4(),
              trip_id: tripId,
              user_id: loc.userId,
              user_name: loc.userName,
              user_image: loc.userImage,
              event_type: 'MEMBER_REJOINED',
              latitude: loc.latitude,
              longitude: loc.longitude,
              metadata: {
                distanceKm: loc.distanceFromGroupKm,
                message: `${loc.userName} has rejoined the group`
              },
              created_at: new Date().toISOString()
            };
            db.tables.insert('trip_events', rejoinEvent);
            generatedEvents.push(rejoinEvent);
          }
        }

        // Save updated distance and status
        await redisStore.hset(`trip:${tripId}:locations`, loc.userId, loc);

        if (loc.userId === userId) {
          memberLocationState.distanceFromGroupKm = loc.distanceFromGroupKm;
          memberLocationState.status = loc.status;
        }
      }
    }

    // 6. Record raw telemetry in historical locations table (throttled)
    db.tables.insert('locations', {
      trip_id: tripId,
      user_id: userId,
      latitude,
      longitude,
      accuracy,
      speed,
      heading,
      recorded_at: new Date(timestamp).toISOString()
    });

    // 7. Get fresh compiled trip locations snapshot
    const latestLocationsMap = await redisStore.hgetall(`trip:${tripId}:locations`);

    return {
      updatedLocation: memberLocationState,
      allLocations: latestLocationsMap,
      groupCenter: centroid,
      groupEta,
      events: generatedEvents
    };
  }
};

export default eventEngine;
