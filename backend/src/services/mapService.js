import { haversineDistanceKm } from '../utils/geo.js';

const geocodeCache = new Map();

// Known waypoint database for instant and realistic offline reverse geocoding
const knownWaypoints = [
  { name: 'Connaught Place, New Delhi', lat: 28.6315, lng: 77.2167, radiusKm: 8 },
  { name: 'Mukarba Chowk, Delhi', lat: 28.7365, lng: 77.1510, radiusKm: 6 },
  { name: 'Murthal (Sukhdev Dhaba), Haryana', lat: 29.0264, lng: 77.0700, radiusKm: 5 },
  { name: 'Samalkha, Haryana', lat: 29.2330, lng: 77.0120, radiusKm: 6 },
  { name: 'Panipat Toll Plaza, Haryana', lat: 29.3909, lng: 76.9635, radiusKm: 8 },
  { name: 'Karnal Oasis Resort, Haryana', lat: 29.6857, lng: 76.9905, radiusKm: 8 },
  { name: 'Kurukshetra, Haryana', lat: 29.9695, lng: 76.8783, radiusKm: 8 },
  { name: 'Ambala Cantt Highway, Haryana', lat: 30.3782, lng: 76.7767, radiusKm: 10 },
  { name: 'Zirakpur Junction, Punjab', lat: 30.6425, lng: 76.8173, radiusKm: 7 },
  { name: 'Chandigarh Bypass', lat: 30.7333, lng: 76.7794, radiusKm: 10 },
  { name: 'Rupnagar (Ropar), Punjab', lat: 30.9664, lng: 76.5331, radiusKm: 8 },
  { name: 'Kiratpur Sahib, Punjab', lat: 31.1812, lng: 76.5684, radiusKm: 7 },
  { name: 'Swarghat, Himachal Pradesh', lat: 31.2333, lng: 76.7167, radiusKm: 7 },
  { name: 'Bilaspur Lake View, Himachal Pradesh', lat: 31.3400, lng: 76.7600, radiusKm: 8 },
  { name: 'Sundernagar, Himachal Pradesh', lat: 31.5333, lng: 76.9000, radiusKm: 8 },
  { name: 'Mandi Town, Himachal Pradesh', lat: 31.7087, lng: 76.9320, radiusKm: 8 },
  { name: 'Pandoh Dam, Himachal Pradesh', lat: 31.6700, lng: 77.0500, radiusKm: 6 },
  { name: 'Aut Tunnel, Himachal Pradesh', lat: 31.7333, lng: 77.2000, radiusKm: 6 },
  { name: 'Bhuntar Airport Area, Kullu', lat: 31.8764, lng: 77.1541, radiusKm: 6 },
  { name: 'Kullu Valley, Himachal Pradesh', lat: 31.9579, lng: 77.1095, radiusKm: 8 },
  { name: 'Naggar Castle Highway, Himachal', lat: 32.1158, lng: 77.1700, radiusKm: 6 },
  { name: 'Mall Road, Manali, Himachal Pradesh', lat: 32.2396, lng: 77.1887, radiusKm: 6 },
  { name: 'Old Manali, Himachal Pradesh', lat: 32.2548, lng: 77.1751, radiusKm: 5 },
  { name: 'Solang Valley, Manali', lat: 32.3166, lng: 77.1575, radiusKm: 6 }
];

export const mapService = {
  /**
   * Reverse Geocode Lat/Lng into human-readable location name
   */
  async reverseGeocode(latitude, longitude) {
    const cacheKey = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
    if (geocodeCache.has(cacheKey)) {
      return geocodeCache.get(cacheKey);
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (apiKey) {
      try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.status === 'OK' && data.results && data.results.length > 0) {
          // Format a nice concise place name
          const result = data.results[0];
          let placeName = result.formatted_address;
          
          // Try to extract neighborhood or locality
          const localityComp = result.address_components.find(c => 
            c.types.includes('locality') || c.types.includes('sublocality') || c.types.includes('point_of_interest')
          );
          const stateComp = result.address_components.find(c => c.types.includes('administrative_area_level_1'));
          
          if (localityComp) {
            placeName = `${localityComp.long_name}${stateComp ? `, ${stateComp.short_name}` : ''}`;
          }

          geocodeCache.set(cacheKey, placeName);
          return placeName;
        }
      } catch (err) {
        console.warn('[MapService] Google Geocoding API call failed:', err.message);
      }
    }

    // Match against known points database
    let closest = null;
    let minDistance = Infinity;

    for (const wp of knownWaypoints) {
      const dist = haversineDistanceKm(latitude, longitude, wp.lat, wp.lng);
      if (dist < minDistance && dist <= wp.radiusKm) {
        minDistance = dist;
        closest = wp.name;
      }
    }

    if (closest) {
      geocodeCache.set(cacheKey, closest);
      return closest;
    }

    // Generic descriptive fallback
    const fallback = `Highway Point (${latitude.toFixed(3)}°N, ${longitude.toFixed(3)}°E)`;
    geocodeCache.set(cacheKey, fallback);
    return fallback;
  },

  /**
   * Calculate Route Polyline & details between Origin and Destination
   */
  async calculateRoute(origin, destination) {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (apiKey) {
      try {
        const originStr = typeof origin === 'object' ? `${origin.lat},${origin.lng}` : origin;
        const destStr = typeof destination === 'object' ? `${destination.lat},${destination.lng}` : destination;
        const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(originStr)}&destination=${encodeURIComponent(destStr)}&key=${apiKey}`;
        
        const response = await fetch(url);
        const data = await response.json();

        if (data.status === 'OK' && data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const leg = route.legs[0];

          return {
            polyline: route.overview_polyline.points,
            distance: leg.distance.text,
            duration: leg.duration.text,
            start_address: leg.start_address,
            end_address: leg.end_address,
            start_location: leg.start_location,
            end_location: leg.end_location,
            steps: leg.steps.map(s => ({
              instructions: s.html_instructions.replace(/<[^>]*>?/gm, ''),
              distance: s.distance.text,
              duration: s.duration.text,
              end_location: s.end_location
            }))
          };
        }
      } catch (err) {
        console.warn('[MapService] Google Directions API failed, using standard route coordinates:', err.message);
      }
    }

    // Standard high-resolution route points for Delhi -> Manali
    const defaultRoute = {
      distance: '535 km',
      duration: '11 hours 30 mins',
      start_address: typeof origin === 'string' ? origin : 'New Delhi, India',
      end_address: typeof destination === 'string' ? destination : 'Manali, Himachal Pradesh',
      start_location: { lat: 28.6315, lng: 77.2167 },
      end_location: { lat: 32.2396, lng: 77.1887 },
      waypoints: knownWaypoints.map(w => ({ lat: w.lat, lng: w.lng, name: w.name }))
    };

    return defaultRoute;
  },

  /**
   * Calculate ETA for an individual from current coordinate to destination
   */
  calculateIndividualEta(currentLat, currentLng, destLat, destLng, currentSpeedKmh = 45) {
    const distanceKm = haversineDistanceKm(currentLat, currentLng, destLat, destLng);
    
    // Average road circuity factor on Indian highways/hills is approx 1.25x
    const roadDistanceKm = distanceKm * 1.25;
    
    // Effective speed considering mountain/city slowdowns
    let effectiveSpeed = currentSpeedKmh > 10 ? currentSpeedKmh : 40;
    if (currentLat > 31.2) {
      // Mountain highway speed limitation
      effectiveSpeed = Math.min(effectiveSpeed, 35);
    }
    
    const hours = roadDistanceKm / effectiveSpeed;
    const totalMinutes = Math.round(hours * 60);

    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;

    return {
      distanceKm: Math.round(roadDistanceKm * 10) / 10,
      totalMinutes,
      formattedEta: h > 0 ? `${h}h ${m}m` : `${m} mins`,
      arrivalTimestamp: new Date(Date.now() + totalMinutes * 60 * 1000).toISOString()
    };
  },

  /**
   * Calculate Clustered Group ETA (reflecting the true group arrival considering trailing members)
   */
  calculateGroupEta(activeMembers, destLat, destLng) {
    if (!activeMembers || activeMembers.length === 0) {
      return { formattedEta: 'Calculating...', totalMinutes: 0 };
    }

    const memberEtas = activeMembers.map(m => {
      const eta = this.calculateIndividualEta(
        m.latitude,
        m.longitude,
        destLat,
        destLng,
        m.speed || 40
      );
      return eta.totalMinutes;
    });

    // Group ETA is weighted towards the trailing 80th percentile so everyone arrives together
    memberEtas.sort((a, b) => a - b);
    const slowestIndex = Math.min(memberEtas.length - 1, Math.floor(memberEtas.length * 0.8));
    const groupMinutes = memberEtas[slowestIndex];

    const h = Math.floor(groupMinutes / 60);
    const m = groupMinutes % 60;

    return {
      formattedEta: h > 0 ? `${h}h ${m}m` : `${m} mins`,
      totalMinutes: groupMinutes,
      arrivalTimestamp: new Date(Date.now() + groupMinutes * 60 * 1000).toISOString()
    };
  }
};

export default mapService;
