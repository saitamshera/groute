import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import useTripStore, { selectTravelers } from '../../store/tripStore.js';
import useAuthStore from '../../store/authStore.js';

// Fix Leaflet default marker icon path issue in bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ─── Custom Marker Icons ──────────────────────────────────────

function createTravelerIcon(traveler) {
  const isLeader = traveler.isLeader;
  const isStopped = traveler.status === 'STOPPED' || traveler.status === 'POSSIBLE_STOP';
  const isSplit = traveler.status === 'SPLIT' || traveler.status === 'FALLING_BEHIND';
  const isArrived = traveler.status === 'ARRIVED';

  let bgColor = '#1e8e3e'; // green - moving
  let emoji = '🚗';
  if (isLeader) { bgColor = '#1a73e8'; emoji = '👑'; }
  if (isStopped) { bgColor = '#d93025'; emoji = '🛑'; }
  if (isSplit) { bgColor = '#f9ab00'; emoji = '⚠️'; }
  if (isArrived) { bgColor = '#7627bb'; emoji = '🏁'; }

  const name = traveler.name?.split(' ')[0] || '?';

  return L.divIcon({
    className: 'leaflet-traveler-marker',
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%);">
        <div style="background:${bgColor};color:#fff;border-radius:16px;padding:3px 8px;font-size:11px;font-weight:700;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.25);border:2px solid #fff;display:flex;align-items:center;gap:3px;">
          <span style="font-size:12px;">${emoji}</span>
          <span>${name}</span>
        </div>
        <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid ${bgColor};margin-top:-1px;"></div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

function createOriginIcon() {
  return L.divIcon({
    className: 'leaflet-origin-marker',
    html: `<div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%);">
      <div style="background:#137333;color:#fff;border-radius:16px;padding:3px 10px;font-size:11px;font-weight:700;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.25);border:2px solid #fff;">🟢 Start</div>
      <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid #137333;margin-top:-1px;"></div>
    </div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

function createDestinationIcon() {
  return L.divIcon({
    className: 'leaflet-dest-marker',
    html: `<div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%);">
      <div style="background:#d93025;color:#fff;border-radius:16px;padding:3px 10px;font-size:11px;font-weight:700;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.25);border:2px solid #fff;">🏁 Destination</div>
      <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid #d93025;margin-top:-1px;"></div>
    </div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

function createPOIIcon(type) {
  const isFuel = type === 'FUEL' || type === 'petrol';
  const emoji = isFuel ? '⛽' : '🏨';
  const bg = isFuel ? '#e8f0fe' : '#f3e8fd';
  const border = isFuel ? '#1a73e8' : '#7627bb';

  return L.divIcon({
    className: 'leaflet-poi-marker',
    html: `<div style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;background:${bg};border:2px solid ${border};border-radius:50%;font-size:14px;box-shadow:0 2px 6px rgba(0,0,0,0.18);transform:translate(-50%,-50%);">${emoji}</div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}


// ─── Map Camera Controller ────────────────────────────────────

function MapCameraController({ mapFocus, trip, travelers, stops }) {
  const map = useMap();

  useEffect(() => {
    if (!mapFocus) return;

    if (mapFocus.fitGroup) {
      const points = [];
      if (trip?.origin_lat) points.push([Number(trip.origin_lat), Number(trip.origin_lng)]);
      if (trip?.destination_lat) points.push([Number(trip.destination_lat), Number(trip.destination_lng)]);
      travelers.forEach(t => {
        if (t.latitude && t.longitude && !t.isSharingOff && t.status !== 'OFFLINE') {
          points.push([Number(t.latitude), Number(t.longitude)]);
        }
      });
      (stops || []).forEach(st => {
        if (st?.latitude && st?.longitude) {
          points.push([Number(st.latitude), Number(st.longitude)]);
        }
      });
      if (points.length > 0) {
        map.fitBounds(points, { padding: [50, 50], maxZoom: 14 });
      }
    } else if (mapFocus.lat && mapFocus.lng) {
      map.flyTo([Number(mapFocus.lat), Number(mapFocus.lng)], mapFocus.zoom || 14, { duration: 0.8 });
    }
  }, [mapFocus, trip, travelers, stops, map]);

  return null;
}


// ─── Route Fetcher (OSRM — free, follows real roads) ─────────

function useOSRMRoute(origin, destination) {
  const [routeCoords, setRouteCoords] = useState(null);

  useEffect(() => {
    if (!origin || !destination) return;

    const oLat = Number(origin.lat);
    const oLng = Number(origin.lng);
    const dLat = Number(destination.lat);
    const dLng = Number(destination.lng);

    if (!oLat || !dLat) return;

    // OSRM uses lng,lat format
    const url = `https://router.project-osrm.org/route/v1/driving/${oLng},${oLat};${dLng},${dLat}?overview=full&geometries=geojson`;

    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (data.code === 'Ok' && data.routes?.[0]?.geometry?.coordinates) {
          // GeoJSON is [lng, lat] — Leaflet needs [lat, lng]
          const coords = data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
          setRouteCoords(coords);
        }
      })
      .catch(err => {
        console.warn('[OSRMRoute] Failed to fetch road route:', err);
      });
  }, [origin?.lat, origin?.lng, destination?.lat, destination?.lng]);

  return routeCoords;
}


// ─── Fallback waypoint polyline (NH44/NH21 Delhi-Manali) ──────

const FALLBACK_ROUTE_WAYPOINTS = [
  [28.6315, 77.2167], // CP Delhi
  [28.7365, 77.1510], // Mukarba Chowk
  [29.0264, 77.0700], // Murthal
  [29.2330, 77.0120], // Samalkha
  [29.3909, 76.9635], // Panipat
  [29.6857, 76.9905], // Karnal
  [29.9695, 76.8783], // Kurukshetra
  [30.3782, 76.7767], // Ambala
  [30.7333, 76.7794], // Chandigarh
  [31.1812, 76.5684], // Kiratpur
  [31.3400, 76.7600], // Bilaspur
  [31.7087, 76.9320], // Mandi
  [31.9579, 77.1095], // Kullu
  [32.2396, 77.1887], // Manali
];


// ─── Main Component ───────────────────────────────────────────

export function GoogleMapContainer(props = {}) {
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

  // Route endpoints
  const origin = trip?.origin_lat ? { lat: trip.origin_lat, lng: trip.origin_lng } : null;
  const destination = trip?.destination_lat ? { lat: trip.destination_lat, lng: trip.destination_lng } : null;

  // Fetch REAL road route geometry from OSRM (free, no key needed)
  const osrmRoute = useOSRMRoute(origin, destination);

  // Use OSRM road geometry if available, else use fallback waypoints
  const routeCoords = osrmRoute || (origin && destination ? FALLBACK_ROUTE_WAYPOINTS : []);

  // Initial center & zoom
  const center = useMemo(() => {
    if (groupCenter?.latitude) return [Number(groupCenter.latitude), Number(groupCenter.longitude)];
    if (trip?.origin_lat) return [Number(trip.origin_lat), Number(trip.origin_lng)];
    return [30.0, 77.0]; // Midpoint Delhi-Manali
  }, [groupCenter?.latitude, groupCenter?.longitude, trip?.origin_lat, trip?.origin_lng]);

  // Fuel and hotel POIs
  const fuelPOIs = pois.filter(p => p.type === 'FUEL' || p.type === 'petrol');
  const hotelPOIs = pois.filter(p => p.type === 'HOTEL' || p.type === 'hotel');

  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={center}
        zoom={7}
        style={{ width: '100%', height: '100%' }}
        zoomControl={false}
        attributionControl={false}
      >
        {/* Real OpenStreetMap Tiles — real roads, real geography, real labels */}
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          maxZoom={19}
        />

        {/* Map camera controller (responds to store mapFocus changes) */}
        <MapCameraController
          mapFocus={mapFocus}
          trip={trip}
          travelers={travelers}
          stops={stops}
        />

        {/* ─── ROUTE LAYER ─── */}
        {layerVisibility?.route && routeCoords.length > 0 && (
          <>
            {/* Glow/shadow layer */}
            <Polyline
              positions={routeCoords}
              pathOptions={{
                color: '#4285f4',
                weight: 8,
                opacity: 0.3,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
            {/* Main route line */}
            <Polyline
              positions={routeCoords}
              pathOptions={{
                color: '#1a73e8',
                weight: 5,
                opacity: 0.85,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </>
        )}

        {/* ─── ORIGIN MARKER ─── */}
        {origin && (
          <Marker
            position={[Number(origin.lat), Number(origin.lng)]}
            icon={createOriginIcon()}
          >
            <Popup>
              <div style={{ fontFamily: 'system-ui', fontSize: '13px' }}>
                <strong>🟢 Origin</strong><br/>
                {trip?.origin || 'Connaught Place, New Delhi'}
              </div>
            </Popup>
          </Marker>
        )}

        {/* ─── DESTINATION MARKER ─── */}
        {destination && (
          <Marker
            position={[Number(destination.lat), Number(destination.lng)]}
            icon={createDestinationIcon()}
          >
            <Popup>
              <div style={{ fontFamily: 'system-ui', fontSize: '13px' }}>
                <strong>🏁 Destination</strong><br/>
                {trip?.destination || 'Mall Road, Manali'}
              </div>
            </Popup>
          </Marker>
        )}

        {/* ─── TRAVELER MARKERS ─── */}
        {layerVisibility?.members && travelers.map(t => {
          if (!t.latitude || !t.longitude || t.isSharingOff || t.status === 'OFFLINE') return null;
          const isStopped = t.status === 'STOPPED' || t.status === 'POSSIBLE_STOP';
          const isSplit = t.status === 'SPLIT' || t.status === 'FALLING_BEHIND';
          const isArrived = t.status === 'ARRIVED';

          return (
            <Marker
              key={t.id}
              position={[Number(t.latitude), Number(t.longitude)]}
              icon={createTravelerIcon(t)}
              eventHandlers={{
                click: () => setSelectedMemberId(selectedMemberId === t.id ? null : t.id),
              }}
            >
              <Popup>
                <div style={{ fontFamily: 'system-ui', fontSize: '12px', minWidth: '160px' }}>
                  <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '4px' }}>
                    {t.isLeader ? '👑 ' : ''}{t.name}{t.isMe ? ' (You)' : ''}
                  </div>
                  <div style={{ color: '#5f6368', marginBottom: '2px' }}>
                    📍 {t.locationName || 'En route'}
                  </div>
                  <div style={{ marginBottom: '2px' }}>
                    <strong>Status:</strong>{' '}
                    {isArrived ? '✓ Arrived' : isStopped ? '🛑 Stopped' : isSplit ? '⚠ Behind' : '🟢 Moving'}
                  </div>
                  <div style={{ marginBottom: '2px' }}>
                    <strong>Speed:</strong> {isArrived || isStopped ? '0' : Math.round(t.speed || 0)} km/h
                  </div>
                  <div style={{ marginBottom: '2px' }}>
                    <strong>Position:</strong> {t.relativePositionText || 'With group'}
                  </div>
                  {t.eta && <div><strong>ETA:</strong> {t.eta}</div>}
                  {isStopped && t.stoppedLocationName && (
                    <div style={{ marginTop: '4px', padding: '4px 6px', background: '#fce8e6', borderRadius: '8px', color: '#c5221f', fontSize: '11px' }}>
                      🛑 {t.stoppedLocationName}
                      {t.stopDurationText ? ` · ${t.stopDurationText}` : ''}
                      {t.isLongStop ? ' ⚠ 10+ min' : ''}
                    </div>
                  )}
                  {isStopped && t.nearbyPetrol && (
                    <div style={{ marginTop: '2px', fontSize: '11px', color: '#202124' }}>
                      ⛽ Near: {t.nearbyPetrol.name}
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* ─── SPLIT CONNECTOR LINES ─── */}
        {layerVisibility?.members && travelers.map(t => {
          if (!t.latitude || !t.longitude) return null;
          const isSplit = t.status === 'SPLIT' || t.status === 'FALLING_BEHIND';
          if (!isSplit || !groupCenter?.latitude) return null;

          return (
            <Polyline
              key={`split-${t.id}`}
              positions={[
                [Number(groupCenter.latitude), Number(groupCenter.longitude)],
                [Number(t.latitude), Number(t.longitude)]
              ]}
              pathOptions={{
                color: '#f9ab00',
                weight: 2,
                opacity: 0.8,
                dashArray: '8, 6',
              }}
            />
          );
        })}

        {/* ─── STOP MARKERS ─── */}
        {layerVisibility?.stops && (stops || []).map(stop => (
          <Marker
            key={stop.id}
            position={[Number(stop.latitude), Number(stop.longitude)]}
            eventHandlers={{ click: () => setSelectedStop(stop) }}
          >
            <Popup>
              <div style={{ fontFamily: 'system-ui', fontSize: '12px' }}>
                <strong>🛑 Stop</strong><br/>
                {stop.location_name || 'Rest Point'}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* ─── FUEL POI MARKERS ─── */}
        {layerVisibility?.petrol && fuelPOIs.map(poi => (
          <Marker
            key={poi.id}
            position={[Number(poi.latitude), Number(poi.longitude)]}
            icon={createPOIIcon('FUEL')}
            eventHandlers={{ click: () => setSelectedPOI(poi) }}
          >
            <Popup>
              <div style={{ fontFamily: 'system-ui', fontSize: '12px' }}>
                <strong>⛽ {poi.name}</strong><br/>
                <span style={{ color: '#5f6368' }}>{poi.address || 'Along route'}</span>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* ─── HOTEL POI MARKERS ─── */}
        {layerVisibility?.hotels && hotelPOIs.map(poi => (
          <Marker
            key={poi.id}
            position={[Number(poi.latitude), Number(poi.longitude)]}
            icon={createPOIIcon('HOTEL')}
            eventHandlers={{ click: () => setSelectedPOI(poi) }}
          >
            <Popup>
              <div style={{ fontFamily: 'system-ui', fontSize: '12px' }}>
                <strong>🏨 {poi.name}</strong><br/>
                <span style={{ color: '#5f6368' }}>{poi.address || 'Along route'}</span>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* ─── FLOATING SELECTED TRAVELER CARD ─── */}
      {selectedMemberId && (() => {
        const sel = travelers.find(t => t.id === selectedMemberId);
        if (!sel) return null;
        const isStopped = sel.status === 'STOPPED' || sel.status === 'POSSIBLE_STOP';
        const isSplit = sel.status === 'SPLIT' || sel.status === 'FALLING_BEHIND';
        const isArrived = sel.status === 'ARRIVED';

        return (
          <div className="absolute bottom-22 sm:bottom-6 left-3 sm:left-4 z-[1000] max-w-[calc(100vw-24px)] sm:max-w-xs w-full bg-white/95 backdrop-blur-md border border-[#dadce0] p-3 rounded-2xl shadow-xl space-y-2 pointer-events-auto text-xs">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold ${sel.isLeader ? 'bg-[#1a73e8]' : isStopped ? 'bg-[#d93025]' : isSplit ? 'bg-[#f9ab00]' : isArrived ? 'bg-[#7627bb]' : 'bg-[#1e8e3e]'}`}>
                  {sel.name?.[0] || '?'}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h4 className="text-xs font-bold text-[#202124] truncate">{sel.name}</h4>
                    {sel.isLeader && (
                      <span className="text-[9px] font-extrabold px-1.5 rounded-full bg-[#fef7e0] text-[#b06000] border border-[#feefc3]">👑 LEADER</span>
                    )}
                    {sel.isMe && (
                      <span className="text-[8px] font-extrabold uppercase px-1.5 rounded-full bg-[#1a73e8] text-white">YOU</span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#5f6368] truncate font-medium">{sel.locationName}</p>
                </div>
              </div>
              <button onClick={() => setSelectedMemberId(null)} className="p-1 text-[#5f6368] hover:text-[#202124] hover:bg-[#f1f3f4] rounded-full text-xs font-bold">✕</button>
            </div>

            <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-[#f1f3f4] text-xs">
              <div className="bg-[#f8f9fa] p-1.5 rounded-xl border border-[#dadce0] text-center">
                <span className="text-[9px] text-[#5f6368] block font-medium">Status</span>
                <span className={`font-bold text-[11px] ${isArrived ? 'text-[#137333]' : isStopped ? 'text-[#d93025]' : isSplit ? 'text-[#b06000]' : 'text-[#137333]'}`}>
                  {isArrived ? '✓ Arrived' : isStopped ? 'Stopped' : isSplit ? 'Behind' : 'Moving'}
                </span>
              </div>
              <div className="bg-[#f8f9fa] p-1.5 rounded-xl border border-[#dadce0] text-center">
                <span className="text-[9px] text-[#5f6368] block font-medium">Speed</span>
                <span className="font-mono font-bold text-[11px] text-[#202124]">{isArrived || isStopped ? '0' : Math.round(sel.speed || 0)} km/h</span>
              </div>
              <div className="bg-[#f8f9fa] p-1.5 rounded-xl border border-[#dadce0] text-center">
                <span className="text-[9px] text-[#5f6368] block font-medium">Position</span>
                <span className="font-bold text-[10px] text-[#202124] leading-tight block truncate" title={sel.relativePositionText}>
                  {sel.relativePositionText || 'With group'}
                </span>
              </div>
            </div>

            {isStopped && (
              <div className="space-y-1">
                <p className="text-[11px] text-[#c5221f] font-semibold bg-[#fce8e6] px-2.5 py-1 rounded-xl">
                  🛑 Stopped for {sel.stopDurationText || '0 min'} {sel.isLongStop ? '⚠ (10+ min)' : ''}
                </p>
                {sel.nearbyPetrol && (
                  <p className="text-[10px] text-[#202124] bg-[#f8f9fa] px-2 py-0.5 rounded-lg border border-[#dadce0]">
                    ⛽ {sel.nearbyPetrol.name} ({sel.nearbyPetrol.distanceText})
                  </p>
                )}
                {sel.nearbyHotel && (
                  <p className="text-[10px] text-[#202124] bg-[#f8f9fa] px-2 py-0.5 rounded-lg border border-[#dadce0]">
                    🏨 {sel.nearbyHotel.name} ({sel.nearbyHotel.distanceText})
                  </p>
                )}
              </div>
            )}
            {isSplit && (
              <p className="text-[11px] text-[#b06000] font-semibold bg-[#fef7e0] px-2.5 py-1 rounded-xl">
                {sel.distanceFromGroupKm ? `⚠ ${sel.distanceFromGroupKm} km behind convoy` : '⚠ Falling behind convoy'}
              </p>
            )}
            {isArrived && (
              <p className="text-[11px] text-[#137333] font-semibold bg-[#e6f4ea] px-2.5 py-1 rounded-xl">
                ✓ Reached destination {sel.arrivedAtTimeText ? `at ${sel.arrivedAtTimeText}` : ''}
              </p>
            )}
          </div>
        );
      })()}

      {/* ─── FLOATING SELECTED POI CARD ─── */}
      {selectedPOI && (
        <div className="absolute bottom-22 sm:bottom-6 left-3 sm:left-4 z-[1000] max-w-[calc(100vw-24px)] sm:max-w-xs w-full bg-white/95 backdrop-blur-md border border-[#dadce0] p-3 rounded-2xl shadow-xl space-y-2 pointer-events-auto text-xs">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-2xl bg-[#e8f0fe] border border-[#d2e3fc] flex items-center justify-center text-base shrink-0">
                {selectedPOI.type === 'FUEL' || selectedPOI.type === 'petrol' ? '⛽' : '🏨'}
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-[#202124] truncate">{selectedPOI.name}</h4>
                <p className="text-[11px] text-[#5f6368] truncate font-medium">{selectedPOI.address || 'Along route corridor'}</p>
              </div>
            </div>
            <button onClick={() => setSelectedPOI(null)} className="p-1 text-[#5f6368] hover:text-[#202124] hover:bg-[#f1f3f4] rounded-full text-xs font-bold">✕</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default GoogleMapContainer;
