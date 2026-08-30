/**
 * Calculate Great-Circle distance between two coordinates in kilometers using the Haversine formula
 */
export function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate Great-Circle distance in meters
 */
export function haversineDistanceMeters(lat1, lon1, lat2, lon2) {
  return haversineDistanceKm(lat1, lon1, lat2, lon2) * 1000;
}

function toRad(degrees) {
  return (degrees * Math.PI) / 180;
}

/**
 * Calculate geographic centroid (average lat/lng) for a collection of points
 */
export function calculateCentroid(points) {
  if (!points || points.length === 0) return null;
  if (points.length === 1) {
    return {
      latitude: points[0].latitude,
      longitude: points[0].longitude
    };
  }

  let x = 0;
  let y = 0;
  let z = 0;

  for (const p of points) {
    const latRad = toRad(p.latitude);
    const lngRad = toRad(p.longitude);
    x += Math.cos(latRad) * Math.cos(lngRad);
    y += Math.cos(latRad) * Math.sin(lngRad);
    z += Math.sin(latRad);
  }

  const total = points.length;
  x = x / total;
  y = y / total;
  z = z / total;

  const centralLng = Math.atan2(y, x);
  const centralSquareRoot = Math.sqrt(x * x + y * y);
  const centralLat = Math.atan2(z, centralSquareRoot);

  return {
    latitude: (centralLat * 180) / Math.PI,
    longitude: (centralLng * 180) / Math.PI
  };
}

/**
 * Calculate compass bearing between two points in degrees
 */
export function calculateBearing(lat1, lon1, lat2, lon2) {
  const y = Math.sin(toRad(lon2 - lon1)) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lon2 - lon1));
  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return (bearing + 360) % 360;
}

/**
 * Check if coordinate is within radius (in meters)
 */
export function isWithinRadius(lat1, lon1, lat2, lon2, radiusMeters) {
  return haversineDistanceMeters(lat1, lon1, lat2, lon2) <= radiusMeters;
}
