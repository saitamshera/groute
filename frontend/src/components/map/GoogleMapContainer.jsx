import React, { useState } from 'react';
import { GoogleMap, useJsApiLoader, Marker, Polyline, InfoWindow } from '@react-google-maps/api';
import CanvasMapVisualizer from './CanvasMapVisualizer.jsx';
import useTripStore from '../../store/tripStore.js';
import { Layers, Map as MapIcon, Key, Info } from 'lucide-react';

const libraries = ['places', 'geometry'];

const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#171e2e' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#171e2e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8ca1b8' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#d9e2ec' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#627d98' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#1b2d3e' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#243b53' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#172739' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9fb3c8' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#334e68' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#102a43' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#1f3448' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0b1320' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#486581' }] }
];

export function GoogleMapContainer() {
  const googleApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const [useVisualizer, setUseVisualizer] = useState(!googleApiKey);

  const {
    trip,
    liveLocations,
    stops,
    groupCenter,
    selectedMemberId,
    setSelectedMemberId,
    setSelectedStop
  } = useTripStore();

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: googleApiKey || '',
    libraries: googleApiKey ? libraries : []
  });

  const center = groupCenter
    ? { lat: groupCenter.latitude, lng: groupCenter.longitude }
    : { lat: trip?.origin_lat || 28.6315, lng: trip?.origin_lng || 77.2167 };

  // If no Google Maps API key is configured or user prefers visualizer or load error
  if (!googleApiKey || useVisualizer || loadError || !isLoaded) {
    return (
      <div className="relative w-full h-full">
        <CanvasMapVisualizer />

        {/* Mode & Setup Switcher Pill */}
        <div className="absolute top-4 left-4 z-40 flex items-center gap-2">
          {googleApiKey && isLoaded && (
            <button
              onClick={() => setUseVisualizer(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700 text-xs font-semibold text-white shadow-xl hover:bg-slate-800 transition-colors"
            >
              <MapIcon className="w-3.5 h-3.5 text-brand-400" />
              Switch to Google Maps JS
            </button>
          )}

          {!googleApiKey && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-750 text-xs text-slate-300 shadow-xl backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-brand-400" />
              <span className="font-semibold text-white">Cartographic Map Engine Active</span>
              <span className="text-[10px] text-slate-400 hidden md:inline">
                (Add VITE_GOOGLE_MAPS_API_KEY to enable Google Maps)
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden border border-slate-800">
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%' }}
        center={center}
        zoom={9}
        options={{
          styles: darkMapStyle,
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false
        }}
      >
        {/* Origin Marker */}
        {trip?.origin_lat && (
          <Marker
            position={{ lat: trip.origin_lat, lng: trip.origin_lng }}
            label={{ text: 'Origin', color: '#10b981', fontWeight: 'bold', fontSize: '11px' }}
          />
        )}

        {/* Destination Marker */}
        {trip?.destination_lat && (
          <Marker
            position={{ lat: trip.destination_lat, lng: trip.destination_lng }}
            label={{ text: '🏁 Destination', color: '#818cf8', fontWeight: 'bold', fontSize: '11px' }}
          />
        )}

        {/* Group Center Marker */}
        {groupCenter && (
          <Marker
            position={{ lat: groupCenter.latitude, lng: groupCenter.longitude }}
            icon={{
              path: window.google?.maps?.SymbolPath?.CIRCLE || 0,
              scale: 8,
              fillColor: '#3b82f6',
              fillOpacity: 0.9,
              strokeColor: '#ffffff',
              strokeWeight: 2
            }}
          />
        )}

        {/* Stop Markers */}
        {stops.map(stop => (
          <Marker
            key={stop.id}
            position={{ lat: stop.latitude, lng: stop.longitude }}
            onClick={() => setSelectedStop(stop)}
            icon={{
              url: 'data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="%23e11d48"><circle cx="12" cy="12" r="10" stroke="white" stroke-width="2"/></svg>'
            }}
          />
        ))}

        {/* Live Member Markers */}
        {Object.values(liveLocations).map(loc => {
          if (!loc.latitude || !loc.longitude) return null;
          return (
            <Marker
              key={loc.userId}
              position={{ lat: loc.latitude, lng: loc.longitude }}
              onClick={() => setSelectedMemberId(loc.userId)}
              title={`${loc.userName} - ${loc.status}`}
              icon={{
                path: window.google?.maps?.SymbolPath?.CIRCLE || 0,
                scale: 9,
                fillColor: loc.status === 'STOPPED' ? '#e11d48' : loc.status === 'SPLIT' ? '#f59e0b' : '#10b981',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 2
              }}
            />
          );
        })}
      </GoogleMap>

      {/* Switcher button */}
      <button
        onClick={() => setUseVisualizer(true)}
        className="absolute top-4 left-4 z-40 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700 text-xs font-semibold text-white shadow-xl hover:bg-slate-800 transition-colors"
      >
        <Layers className="w-3.5 h-3.5 text-brand-400" />
        Switch to Vector Visualizer
      </button>
    </div>
  );
}

export default GoogleMapContainer;
