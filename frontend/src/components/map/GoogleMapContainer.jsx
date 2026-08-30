import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Marker, Polyline } from '@react-google-maps/api';
import CanvasMapVisualizer from './CanvasMapVisualizer.jsx';
import useTripStore, { selectTravelers } from '../../store/tripStore.js';
import useAuthStore from '../../store/authStore.js';
import { Layers, Map as MapIcon, Key, AlertCircle, RefreshCw } from 'lucide-react';

const libraries = ['places', 'geometry'];

// Official Google Maps Light Theme Styling
const googleMapsLightStyle = [
  { elementType: 'geometry', stylers: [{ color: '#f8f9fa' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'on' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#3c4043' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }, { weight: 3 }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#dadce0' }] },
  { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#202124' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#eeeeee' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#5f6368' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#e6f4ea' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#137333' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#e0e3e7' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#5f6368' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#fee6b9' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#fcd790' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#3c4043' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#f1f3f4' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c5e1f9' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#185abc' }] }
];

export function GoogleMapContainer(props = {}) {
  const rawKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  const hasValidKeyFormat = Boolean(rawKey && rawKey.trim().length > 10 && !rawKey.startsWith('your_'));
  
  const [useVisualizer, setUseVisualizer] = useState(!hasValidKeyFormat);
  const mapRef = useRef(null);

  const {
    trip,
    members,
    liveLocations,
    stops,
    pois: storePOIs,
    selectedPOI,
    setSelectedPOI,
    groupCenter,
    selectedMemberId,
    setSelectedMemberId,
    setSelectedStop,
    mapFocus,
    layerVisibility
  } = useTripStore();

  const rawPois = props?.pois !== undefined ? props.pois : storePOIs;
  const pois = Array.isArray(rawPois) ? rawPois : [];

  const { user: currentUser } = useAuthStore();
  const travelers = selectTravelers(members, liveLocations, currentUser?.id);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: hasValidKeyFormat ? rawKey : '',
    libraries: hasValidKeyFormat ? libraries : []
  });

  const centerLat = Number(groupCenter?.latitude) || Number(trip?.origin_lat) || 28.6315;
  const centerLng = Number(groupCenter?.longitude) || Number(trip?.origin_lng) || 77.2167;
  const center = { lat: centerLat, lng: centerLng };

  const onLoad = useCallback((map) => {
    mapRef.current = map;
  }, []);

  const onUnmount = useCallback(() => {
    mapRef.current = null;
  }, []);

  // React to store camera focus changes safely
  useEffect(() => {
    if (!mapRef.current || !window.google?.maps || !mapFocus) return;

    try {
      if (mapFocus.fitGroup) {
        const bounds = new window.google.maps.LatLngBounds();
        let pointCount = 0;

        if (trip?.origin_lat && trip?.origin_lng) {
          bounds.extend({ lat: Number(trip.origin_lat), lng: Number(trip.origin_lng) });
          pointCount++;
        }
        if (trip?.destination_lat && trip?.destination_lng) {
          bounds.extend({ lat: Number(trip.destination_lat), lng: Number(trip.destination_lng) });
          pointCount++;
        }
        travelers.forEach((t) => {
          if (t.latitude && t.longitude && !t.isSharingOff && t.status !== 'OFFLINE') {
            bounds.extend({ lat: Number(t.latitude), lng: Number(t.longitude) });
            pointCount++;
          }
        });
        (stops || []).forEach((st) => {
          if (st && st.latitude && st.longitude) {
            bounds.extend({ lat: Number(st.latitude), lng: Number(st.longitude) });
            pointCount++;
          }
        });

        if (pointCount > 0 && mapRef.current) {
          mapRef.current.fitBounds(bounds, 80);
        }
      } else if (mapFocus.lat && mapFocus.lng) {
        mapRef.current.panTo({ lat: Number(mapFocus.lat), lng: Number(mapFocus.lng) });
        if (mapFocus.zoom) {
          mapRef.current.setZoom(mapFocus.zoom);
        }
      }
    } catch (err) {
      console.warn('[GoogleMapContainer] Camera focus warning:', err);
    }
  }, [mapFocus, trip, travelers, stops]);

  // Route path coordinates with numbers
  const routePath = trip?.origin_lat && trip?.destination_lat
    ? [
        { lat: Number(trip.origin_lat), lng: Number(trip.origin_lng) },
        { lat: 29.0264, lng: 77.0700 }, // Murthal
        { lat: 29.3909, lng: 76.9635 }, // Panipat
        { lat: 30.3782, lng: 76.7767 }, // Ambala
        { lat: 31.7087, lng: 76.9320 }, // Mandi
        { lat: Number(trip.destination_lat), lng: Number(trip.destination_lng) }
      ]
    : [];

  // When user requests Canvas Visualizer or when Google Maps is not active
  if (useVisualizer) {
    return (
      <div className="relative w-full h-full">
        <CanvasMapVisualizer />

        {/* Mode Switcher Pill */}
        {hasValidKeyFormat && (
          <div className="absolute top-20 left-4 z-20 flex items-center gap-2">
            <button
              onClick={() => setUseVisualizer(false)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white text-[#202124] text-xs font-bold shadow-md border border-[#dadce0] hover:bg-[#f8f9fa] transition-all"
            >
              <MapIcon className="w-3.5 h-3.5 text-[#1a73e8]" />
              <span>Switch to Google Maps JS</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  // If loading Google Maps JS API
  if (!isLoaded && !loadError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#f8f9fa] text-[#5f6368]">
        <div className="text-center space-y-3 p-6 bg-white border border-[#dadce0] rounded-3xl shadow-sm max-w-sm">
          <div className="w-8 h-8 border-3 border-[#1a73e8] border-t-transparent rounded-full animate-spin mx-auto" />
          <h3 className="text-sm font-bold text-[#202124]">Loading Google Maps Platform...</h3>
          <p className="text-xs text-[#5f6368]">Initializing Maps JavaScript API SDK</p>
        </div>
      </div>
    );
  }

  // If Google Maps JS API failed to load or has invalid key
  if (loadError || !hasValidKeyFormat) {
    return (
      <div className="relative w-full h-full">
        {/* Render Canvas Visualizer so map is functional */}
        <CanvasMapVisualizer pois={pois} />

        {/* Honest, Clear Google Maps Status Alert */}
        <div className="absolute top-20 left-4 right-4 sm:right-auto sm:max-w-md z-20 bg-white/95 backdrop-blur-md p-4 rounded-3xl border border-[#dadce0] shadow-xl space-y-2.5">
          <div className="flex items-start gap-2.5">
            <div className="p-2 rounded-full bg-[#fef7e0] text-[#b06000] shrink-0 mt-0.5">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#202124]">Google Maps JS Platform Notice</h4>
              <p className="text-[11px] text-[#5f6368] leading-relaxed mt-0.5">
                Google Maps JavaScript API requires an authorized Google Cloud API key (<code className="text-[#1a73e8] font-mono">AIzaSy...</code>) with Maps JS API enabled.
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-[#f1f3f4] flex items-center justify-between gap-2">
            <span className="text-[10px] text-[#137333] font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1e8e3e]" /> Live Vector Cartography Active
            </span>
            <button
              onClick={() => setUseVisualizer(true)}
              className="px-3 py-1 rounded-full bg-[#f8f9fa] hover:bg-[#f1f3f4] text-[#3c4043] border border-[#dadce0] text-xs font-bold transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    );
  }

  // REAL GOOGLE MAPS RENDERER
  return (
    <div className="relative w-full h-full">
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%' }}
        center={center}
        zoom={9}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={{
          styles: googleMapsLightStyle,
          disableDefaultUI: true,
          zoomControl: false,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false
        }}
      >
        {/* Route Polyline Layer */}
        {layerVisibility?.route && routePath.length > 0 && (
          <>
            <Polyline
              path={routePath}
              options={{
                strokeColor: '#8ab4f8',
                strokeOpacity: 0.7,
                strokeWeight: 7
              }}
            />
            <Polyline
              path={routePath}
              options={{
                strokeColor: '#1a73e8',
                strokeOpacity: 1,
                strokeWeight: 4
              }}
            />
          </>
        )}

        {/* Origin Marker */}
        {trip?.origin_lat && (
          <Marker
            position={{ lat: Number(trip.origin_lat), lng: Number(trip.origin_lng) }}
            label={{ text: '🟢 Origin', color: '#137333', fontWeight: 'bold', fontSize: '10px' }}
          />
        )}

        {/* Destination Marker */}
        {trip?.destination_lat && (
          <Marker
            position={{ lat: Number(trip.destination_lat), lng: Number(trip.destination_lng) }}
            label={{ text: '🏁 Destination', color: '#d93025', fontWeight: 'bold', fontSize: '10px' }}
          />
        )}

        {/* Group Centroid Marker */}
        {groupCenter && groupCenter.latitude && (
          <Marker
            position={{ lat: Number(groupCenter.latitude), lng: Number(groupCenter.longitude) }}
            title="Group Centroid Hub"
          />
        )}

        {/* Stop Markers */}
        {layerVisibility?.stops && (stops || []).map((stop) => (
          <Marker
            key={stop.id}
            position={{ lat: Number(stop.latitude), lng: Number(stop.longitude) }}
            onClick={() => setSelectedStop(stop)}
            title={`Stop: ${stop.location_name || 'Rest Point'}`}
          />
        ))}

        {/* POI Markers: Petrol Stations ⛽ */}
        {layerVisibility?.petrol && (pois || []).filter(p => p.type === 'petrol').map((poi) => (
          <Marker
            key={poi.id}
            position={{ lat: Number(poi.latitude), lng: Number(poi.longitude) }}
            onClick={() => setSelectedPOI(poi)}
            title={`⛽ ${poi.name}`}
          />
        ))}

        {/* POI Markers: Hotels 🏨 */}
        {layerVisibility?.hotels && (pois || []).filter(p => p.type === 'hotel').map((poi) => (
          <Marker
            key={poi.id}
            position={{ lat: Number(poi.latitude), lng: Number(poi.longitude) }}
            onClick={() => setSelectedPOI(poi)}
            title={`🏨 ${poi.name}`}
          />
        ))}

        {/* Member Markers & Split Connectors (Every active reporting traveler) */}
        {layerVisibility?.members && travelers.map((t) => {
          if (!t.latitude || !t.longitude || t.isSharingOff || t.status === 'OFFLINE') return null;
          const isSelected = selectedMemberId === t.id;
          const isStopped = t.status === 'STOPPED' || t.status === 'POSSIBLE_STOP';
          const isSplit = t.status === 'SPLIT' || t.status === 'FALLING_BEHIND';
          const isLeader = t.isLeader;
          const isArrived = t.status === 'ARRIVED';

          return (
            <React.Fragment key={t.id}>
              {/* Split connector line to group center */}
              {isSplit && groupCenter && groupCenter.latitude && (
                <Polyline
                  path={[
                    { lat: Number(groupCenter.latitude), lng: Number(groupCenter.longitude) },
                    { lat: Number(t.latitude), lng: Number(t.longitude) }
                  ]}
                  options={{
                    strokeColor: '#f9ab00',
                    strokeOpacity: 0.9,
                    strokeWeight: 2.5
                  }}
                />
              )}

              <Marker
                position={{ lat: Number(t.latitude), lng: Number(t.longitude) }}
                onClick={() => setSelectedMemberId(isSelected ? null : t.id)}
                title={`${isLeader ? '👑 LEADER: ' : ''}${t.name} (${isArrived ? 'Arrived' : t.status})`}
              />
            </React.Fragment>
          );
        })}
      </GoogleMap>

      {/* Switch to Vector Visualizer Button */}
      <button
        onClick={() => setUseVisualizer(true)}
        className="absolute top-20 left-4 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-md text-[#202124] text-xs font-bold shadow-md border border-[#dadce0] hover:bg-[#f8f9fa] transition-all"
      >
        <Layers className="w-3.5 h-3.5 text-[#1a73e8]" />
        <span>Switch to Vector Visualizer</span>
      </button>

      {/* PROGRESSIVE DISCLOSURE: FLOATING SELECTED TRAVELER CARD */}
      {selectedMemberId && (() => {
        const sel = travelers.find(t => t.id === selectedMemberId);
        if (!sel) return null;

        const isStopped = sel.status === 'STOPPED' || sel.status === 'POSSIBLE_STOP';
        const isSplit = sel.status === 'SPLIT' || sel.status === 'FALLING_BEHIND';
        const isArrived = sel.status === 'ARRIVED';
        const isLeader = sel.isLeader;

        return (
          <div className="absolute bottom-22 sm:bottom-6 left-3 sm:left-4 z-40 max-w-[calc(100vw-24px)] sm:max-w-xs w-full bg-white/95 backdrop-blur-md border border-[#dadce0] p-3 rounded-3xl shadow-xl space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-150 pointer-events-auto text-xs">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src={sel.profile_image}
                  alt={sel.name}
                  className="w-9 h-9 rounded-full bg-[#f1f3f4] border border-[#dadce0] object-cover"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h4 className="text-xs font-bold text-[#202124] truncate">{sel.name}</h4>
                    {isLeader && (
                      <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-full bg-[#fef7e0] text-[#b06000] border border-[#feefc3]">
                        👑 LEADER
                      </span>
                    )}
                    {sel.isMe && (
                      <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.2 rounded-full bg-[#1a73e8] text-white">
                        YOU
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#5f6368] truncate font-medium">
                    {sel.locationName}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedMemberId(null)}
                className="p-1 text-[#5f6368] hover:text-[#202124] hover:bg-[#f1f3f4] rounded-full text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {/* Status & Metrics Bar */}
            <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-[#f1f3f4] text-xs">
              <div className="bg-[#f8f9fa] p-1.5 rounded-xl border border-[#dadce0] text-center">
                <span className="text-[9px] text-[#5f6368] block font-medium">Status</span>
                <span className={`font-bold text-[11px] ${isArrived ? 'text-[#137333]' : isStopped ? 'text-[#d93025]' : isSplit ? 'text-[#b06000]' : 'text-[#137333]'}`}>
                  {isArrived ? '✓ Arrived' : isStopped ? '🛑 Stopped' : isSplit ? '⚠ Behind' : '🟢 Moving'}
                </span>
              </div>
              <div className="bg-[#f8f9fa] p-1.5 rounded-xl border border-[#dadce0] text-center">
                <span className="text-[9px] text-[#5f6368] block font-medium">Speed</span>
                <span className="font-mono font-bold text-[11px] text-[#202124]">
                  {isArrived || isStopped ? '0 km/h' : sel.speed !== null ? `${Math.round(sel.speed)} km/h` : '--'}
                </span>
              </div>
            </div>

            {/* Additional Context Banners */}
            {isArrived && (
              <p className="text-[11px] text-[#137333] font-semibold bg-[#e6f4ea] px-2.5 py-1 rounded-xl border border-[#ceead6]">
                Reached destination {sel.arrivedAtTimeText ? `at ${sel.arrivedAtTimeText}` : ''}
              </p>
            )}
            {isStopped && (
              <div className="space-y-1">
                <p className="text-[11px] text-[#c5221f] font-semibold bg-[#fce8e6] px-2.5 py-1 rounded-xl">
                  Stopped for {sel.stopDurationText || '0 min'} {sel.isLongStop ? '⚠ (Stationary 10+ min)' : ''}
                </p>
                {sel.nearbyPetrol && (
                  <p className="text-[10px] text-[#202124] bg-[#f8f9fa] px-2 py-0.5 rounded-lg border border-[#dadce0]">
                    ⛽ Petrol nearby: <span className="font-semibold">{sel.nearbyPetrol.name} ({sel.nearbyPetrol.distanceText})</span>
                  </p>
                )}
                {sel.nearbyHotel && (
                  <p className="text-[10px] text-[#202124] bg-[#f8f9fa] px-2 py-0.5 rounded-lg border border-[#dadce0]">
                    🏨 Hotel nearby: <span className="font-semibold">{sel.nearbyHotel.name} ({sel.nearbyHotel.distanceText})</span>
                  </p>
                )}
              </div>
            )}
            {isSplit && (
              <p className="text-[11px] text-[#b06000] font-semibold bg-[#fef7e0] px-2.5 py-1 rounded-xl">
                {sel.distanceFromGroupKm ? `${sel.distanceFromGroupKm} km behind convoy` : 'Falling behind convoy'}
              </p>
            )}
          </div>
        );
      })()}

      {/* PROGRESSIVE DISCLOSURE: FLOATING SELECTED POI CARD (Bottom-Left) */}
      {selectedPOI && (
        <div className="absolute bottom-22 sm:bottom-6 left-3 sm:left-4 z-40 max-w-[calc(100vw-24px)] sm:max-w-xs w-full bg-white/95 backdrop-blur-md border border-[#dadce0] p-3 rounded-3xl shadow-xl space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-150 pointer-events-auto text-xs">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-2xl bg-[#e8f0fe] border border-[#d2e3fc] flex items-center justify-center text-base shrink-0">
                {selectedPOI.icon || (selectedPOI.type === 'petrol' ? '⛽' : '🏨')}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h4 className="text-xs font-bold text-[#202124] truncate">{selectedPOI.name}</h4>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-[#f1f3f4] text-[#5f6368]">
                    {selectedPOI.categoryText || (selectedPOI.type === 'petrol' ? 'Petrol Station' : 'Hotel')}
                  </span>
                </div>
                <p className="text-[11px] text-[#5f6368] truncate font-medium">
                  {selectedPOI.address || 'Along Highway Route'}
                </p>
              </div>
            </div>

            <button
              onClick={() => setSelectedPOI(null)}
              className="p-1 text-[#5f6368] hover:text-[#202124] hover:bg-[#f1f3f4] rounded-full text-xs font-bold"
            >
              ✕
            </button>
          </div>

          {selectedPOI.distanceText && (
            <div className="pt-1 border-t border-[#f1f3f4] flex items-center justify-between text-xs">
              <span className="text-[#5f6368] font-medium text-[11px]">Distance from route:</span>
              <span className="font-bold text-[#1a73e8] font-mono text-[11px]">{selectedPOI.distanceText}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default GoogleMapContainer;
