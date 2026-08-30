import { useState, useEffect, useRef } from 'react';
import { getSocket } from '../services/socket.js';
import { useTripStore } from '../store/tripStore.js';
import { useAuthStore } from '../store/authStore.js';

export function useGeolocation(tripId) {
  const [gpsStatus, setGpsStatus] = useState('idle'); // 'idle' | 'tracking' | 'error' | 'denied'
  const [gpsError, setGpsError] = useState(null);
  const lastSentTimeRef = useRef(0);
  const watchIdRef = useRef(null);

  const { trip, isSharingLocation } = useTripStore();
  const { user } = useAuthStore();

  useEffect(() => {
    // Only track if trip is ACTIVE and user has sharing enabled
    const shouldTrack = trip && trip.status === 'ACTIVE' && isSharingLocation && user;

    if (!shouldTrack) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
        setGpsStatus('idle');
      }
      return;
    }

    if (!('geolocation' in navigator)) {
      setGpsStatus('error');
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }

    const socket = getSocket();

    const options = {
      enableHighAccuracy: true,
      maximumAge: 3000,
      timeout: 10000
    };

    const handleSuccess = (position) => {
      setGpsStatus('tracking');
      setGpsError(null);

      const now = Date.now();
      // Throttle: Send at most once every 3.5 seconds
      if (now - lastSentTimeRef.current < 3500) {
        return;
      }
      lastSentTimeRef.current = now;

      const { latitude, longitude, accuracy, speed, heading } = position.coords;

      // Convert speed from m/s to km/h (if available)
      const speedKmh = speed !== null && speed >= 0 ? (speed * 3.6) : 0;

      socket.emit('location:update', {
        tripId,
        latitude,
        longitude,
        accuracy: accuracy || 10,
        speed: speedKmh,
        heading: heading || 0,
        timestamp: position.timestamp || now
      });
    };

    const handleError = (error) => {
      console.warn('[Geolocation] Error:', error.message);
      if (error.code === error.PERMISSION_DENIED) {
        setGpsStatus('denied');
        setGpsError('Location permission denied. Please allow location access to share live GPS.');
      } else if (error.code === error.POSITION_UNAVAILABLE) {
        setGpsStatus('error');
        setGpsError('GPS signal unavailable. Trying to acquire fix...');
      } else if (error.code === error.TIMEOUT) {
        setGpsStatus('error');
        setGpsError('GPS acquisition timed out. Retrying...');
      }
    };

    setGpsStatus('tracking');
    watchIdRef.current = navigator.geolocation.watchPosition(handleSuccess, handleError, options);

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [tripId, trip?.status, isSharingLocation, user?.id]);

  return { gpsStatus, gpsError };
}

export default useGeolocation;
