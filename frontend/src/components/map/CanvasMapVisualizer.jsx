import React, { useRef, useState, useEffect } from 'react';
import useTripStore, { selectTravelers } from '../../store/tripStore.js';
import useAuthStore from '../../store/authStore.js';
import { Navigation } from 'lucide-react';

export function CanvasMapVisualizer() {
  const {
    trip,
    members,
    liveLocations,
    stops,
    groupCenter,
    selectedMemberId,
    setSelectedMemberId,
    setSelectedStop,
    mapFocus,
    layerVisibility
  } = useTripStore();

  const { user: currentUser } = useAuthStore();
  const containerRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const travelers = selectTravelers(members, liveLocations, currentUser?.id);

  // Map coordinate projection bounds (Standard Delhi -> Manali bounds or dynamic)
  const defaultBounds = {
    minLat: 28.4,
    maxLat: 32.5,
    minLng: 76.4,
    maxLng: 77.5
  };

  // Convert GPS (lat, lng) to canvas (x%, y%)
  const projectCoords = (lat, lng) => {
    const latSpan = defaultBounds.maxLat - defaultBounds.minLat;
    const lngSpan = defaultBounds.maxLng - defaultBounds.minLng;

    // Invert lat because higher lat is North (top of map)
    const yPct = ((defaultBounds.maxLat - lat) / latSpan) * 100;
    const xPct = ((lng - defaultBounds.minLng) / lngSpan) * 100;

    return {
      x: Math.max(5, Math.min(95, xPct)),
      y: Math.max(5, Math.min(95, yPct))
    };
  };

  // React to mapFocus triggers
  useEffect(() => {
    if (!mapFocus) return;

    if (mapFocus.fitGroup) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    } else if (mapFocus.lat && mapFocus.lng) {
      const proj = projectCoords(mapFocus.lat, mapFocus.lng);
      const targetZoom = mapFocus.zoom ? Math.min(2.5, mapFocus.zoom / 7) : 1.6;
      setZoom(targetZoom);
      const container = containerRef.current;
      if (container) {
        const width = container.clientWidth;
        const height = container.clientHeight;
        const targetX = (proj.x / 100) * width;
        const targetY = (proj.y / 100) * height;
        const panX = (width / 2 - targetX) * (targetZoom - 0.2);
        const panY = (height / 2 - targetY) * (targetZoom - 0.2);
        setPan({ x: panX, y: panY });
      }
    }
  }, [mapFocus]);

  // Mouse pan handlers
  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.15 : 0.15;
    setZoom((prev) => Math.max(0.75, Math.min(3.5, prev + delta)));
  };

  // Highway Waypoints along Delhi-Manali NH44 / NH21 highway
  const routeWaypoints = [
    { name: 'Delhi', lat: 28.6315, lng: 77.2167 },
    { name: 'Murthal', lat: 29.0264, lng: 77.0700 },
    { name: 'Panipat', lat: 29.3909, lng: 76.9635 },
    { name: 'Karnal', lat: 29.6857, lng: 76.9905 },
    { name: 'Kurukshetra', lat: 29.9695, lng: 76.8783 },
    { name: 'Ambala', lat: 30.3782, lng: 76.7767 },
    { name: 'Chandigarh', lat: 30.7333, lng: 76.7794 },
    { name: 'Kiratpur', lat: 31.1812, lng: 76.5684 },
    { name: 'Bilaspur', lat: 31.3400, lng: 76.7600 },
    { name: 'Mandi', lat: 31.7087, lng: 76.9320 },
    { name: 'Kullu', lat: 31.9579, lng: 77.1095 },
    { name: 'Manali', lat: 32.2396, lng: 77.1887 }
  ];

  const originProj = projectCoords(trip?.origin_lat || 28.6315, trip?.origin_lng || 77.2167);
  const destProj = projectCoords(trip?.destination_lat || 32.2396, trip?.destination_lng || 77.1887);
  const centerProj = groupCenter && groupCenter.latitude ? projectCoords(groupCenter.latitude, groupCenter.longitude) : null;

  // Build SVG path string for route
  const pathD = routeWaypoints.reduce((acc, wp, idx) => {
    const pt = projectCoords(wp.lat, wp.lng);
    return `${acc} ${idx === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`;
  }, '');

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      className="relative w-full h-full bg-[#f1f3f4] overflow-hidden select-none cursor-grab active:cursor-grabbing"
    >
      {/* Map Background Grid & Cartographic Canvas Layer */}
      <div
        className="absolute inset-0 transition-transform duration-100 ease-out"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'center center'
        }}
      >
        {/* Cartographic Coordinate Grid */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="light-carto-grid" width="80" height="80" patternUnits="userSpaceOnUse">
              <path d="M 80 0 L 0 0 0 80" fill="none" stroke="#dadce0" strokeWidth="0.8" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#light-carto-grid)" />
        </svg>

        {/* Dynamic Vector Route Layer */}
        {layerVisibility?.route && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
            {/* Route Casing */}
            <path
              d={pathD}
              fill="none"
              stroke="#8ab4f8"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="opacity-70"
            />
            {/* Highway Route Polyline */}
            <path
              d={pathD}
              fill="none"
              stroke="#1a73e8"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Separation Alert Vectors (dotted line from split members to Group Centroid) */}
            {centerProj && travelers.map((t) => {
              if ((t.status === 'SPLIT' || t.status === 'FALLING_BEHIND') && t.latitude && t.longitude) {
                const memProj = projectCoords(t.latitude, t.longitude);
                return (
                  <g key={`split-line-${t.id}`}>
                    <line
                      x1={centerProj.x}
                      y1={centerProj.y}
                      x2={memProj.x}
                      y2={memProj.y}
                      stroke="#f9ab00"
                      strokeWidth="1.2"
                      strokeDasharray="1.5 1"
                      className="animate-pulse"
                    />
                  </g>
                );
              }
              return null;
            })}
          </svg>
        )}

        {/* Highway Milestone Labels */}
        {layerVisibility?.route && routeWaypoints.map((wp, idx) => {
          const pt = projectCoords(wp.lat, wp.lng);
          return (
            <div
              key={idx}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-1 opacity-75"
              style={{ left: `${pt.x}%`, top: `${pt.y}%` }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#5f6368]" />
              <span className="text-[10px] font-medium text-[#5f6368] whitespace-nowrap bg-white/90 px-1.5 py-0.2 rounded border border-[#dadce0] shadow-xs">
                {wp.name}
              </span>
            </div>
          );
        })}

        {/* Origin Pin */}
        <div
          className="absolute transform -translate-x-1/2 -translate-y-full z-10 pointer-events-auto"
          style={{ left: `${originProj.x}%`, top: `${originProj.y}%` }}
        >
          <div className="flex flex-col items-center">
            <span className="px-2.5 py-1 rounded-full bg-[#1e8e3e] text-white font-bold text-[10px] shadow-md flex items-center gap-1 border border-white">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              Origin: {trip?.origin || 'Start'}
            </span>
            <div className="w-2 h-2 bg-[#1e8e3e] rotate-45 transform -translate-y-1 border-r border-b border-white" />
          </div>
        </div>

        {/* Destination Pin */}
        <div
          className="absolute transform -translate-x-1/2 -translate-y-full z-10 pointer-events-auto"
          style={{ left: `${destProj.x}%`, top: `${destProj.y}%` }}
        >
          <div className="flex flex-col items-center">
            <span className="px-2.5 py-1 rounded-full bg-[#d93025] text-white font-bold text-[10px] shadow-md flex items-center gap-1 border border-white">
              🏁 {trip?.destination || 'Destination'}
            </span>
            <div className="w-2 h-2 bg-[#d93025] rotate-45 transform -translate-y-1 border-r border-b border-white" />
          </div>
        </div>

        {/* Group Centroid Indicator */}
        {centerProj && (
          <div
            className="absolute transform -translate-x-1/2 -translate-y-1/2 z-15 pointer-events-none"
            style={{ left: `${centerProj.x}%`, top: `${centerProj.y}%` }}
          >
            <div className="relative flex items-center justify-center">
              <span className="w-12 h-12 rounded-full border border-[#1a73e8]/40 bg-[#1a73e8]/10 animate-ping-slow absolute" />
              <div className="w-4 h-4 rounded-full bg-[#1a73e8] border-2 border-white flex items-center justify-center shadow-md">
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
              </div>
              <span className="absolute -bottom-4 text-[9px] font-bold text-[#1a73e8] bg-white px-2 py-0.2 rounded-full border border-[#1a73e8]/30 whitespace-nowrap shadow-xs">
                Convoy Hub
              </span>
            </div>
          </div>
        )}

        {/* Stop Markers */}
        {layerVisibility?.stops && stops.map((stop) => {
          if (!stop.latitude || !stop.longitude) return null;
          const proj = projectCoords(stop.latitude, stop.longitude);
          return (
            <div
              key={stop.id}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedStop(stop);
              }}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer hover:scale-110 transition-transform pointer-events-auto"
              style={{ left: `${proj.x}%`, top: `${proj.y}%` }}
            >
              <div className="relative group flex flex-col items-center">
                <div className="w-7 h-7 rounded-full bg-[#d93025] border-2 border-white shadow-md flex items-center justify-center text-xs font-bold text-white">
                  🛑
                </div>
                <div className="absolute top-8 px-2 py-0.5 rounded-md bg-white border border-[#dadce0] text-[10px] font-bold text-[#d93025] shadow-xs whitespace-nowrap">
                  {stop.location_name || 'Stop'}
                </div>
              </div>
            </div>
          );
        })}

        {/* Live Active Member Markers (Every reporting traveler) */}
        {layerVisibility?.members && travelers.map((t) => {
          if (!t.latitude || !t.longitude || t.isSharingOff || t.status === 'OFFLINE') {
            return null;
          }

          const proj = projectCoords(t.latitude, t.longitude);
          const isSelected = selectedMemberId === t.id;
          const isStopped = t.status === 'STOPPED' || t.status === 'POSSIBLE_STOP';
          const isSplit = t.status === 'SPLIT' || t.status === 'FALLING_BEHIND';

          return (
            <div
              key={t.id}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedMemberId(t.id);
              }}
              className={`absolute transform -translate-x-1/2 -translate-y-1/2 z-30 cursor-pointer transition-all duration-300 pointer-events-auto ${
                isSelected ? 'scale-120 z-40' : 'hover:scale-110'
              }`}
              style={{ left: `${proj.x}%`, top: `${proj.y}%` }}
            >
              <div className="relative flex flex-col items-center group">
                {/* Direction Heading Pointer (when moving with heading) */}
                {!isStopped && t.heading !== undefined && (
                  <div
                    className="absolute -top-3 w-4 h-4 text-[#1a73e8] transition-transform pointer-events-none"
                    style={{ transform: `rotate(${t.heading}deg)` }}
                  >
                    <Navigation className="w-3.5 h-3.5 fill-[#1a73e8]" />
                  </div>
                )}

                {/* Radar pulse ring for moving users */}
                {!isStopped && (
                  <span className="absolute -inset-1.5 rounded-full bg-[#1a73e8]/20 animate-radar pointer-events-none" />
                )}

                {/* Custom Google Maps Marker Pin */}
                <div
                  className={`relative w-9 h-9 rounded-full border-2 p-0.5 bg-white shadow-md transition-colors ${
                    isStopped
                      ? 'border-[#d93025] ring-3 ring-[#d93025]/20'
                      : isSplit
                      ? 'border-[#f9ab00] ring-3 ring-[#f9ab00]/25'
                      : t.isMe
                      ? 'border-[#1a73e8] ring-3 ring-[#1a73e8]/30'
                      : 'border-[#1e8e3e]'
                  }`}
                >
                  <img
                    src={t.profile_image}
                    alt={t.name}
                    className="w-full h-full rounded-full object-cover"
                  />

                  {/* Micro state icon badge */}
                  <span
                    className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold text-white border border-white ${
                      isStopped ? 'bg-[#d93025]' : isSplit ? 'bg-[#f9ab00]' : t.isMe ? 'bg-[#1a73e8]' : 'bg-[#1e8e3e]'
                    }`}
                  >
                    {isStopped ? '🛑' : isSplit ? '⚠' : t.isMe ? '★' : '▶'}
                  </span>
                </div>

                {/* Floating Member Info Tag */}
                <div className="mt-1 px-2 py-0.5 rounded-full bg-white border border-[#dadce0] shadow-sm flex items-center gap-1 whitespace-nowrap">
                  <span className="text-[10px] font-bold text-[#202124]">
                    {t.name}
                  </span>
                  {t.isMe && (
                    <span className="text-[8px] uppercase font-extrabold px-1 rounded-full bg-[#1a73e8] text-white">
                      YOU
                    </span>
                  )}
                  {t.speed !== null && t.speed > 0 && !isStopped && (
                    <span className="text-[9px] font-mono font-semibold text-[#1a73e8]">
                      · {Math.round(t.speed)} km/h
                    </span>
                  )}
                  {isStopped && (
                    <span className="text-[9px] font-semibold text-[#d93025]">
                      · Stopped
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default CanvasMapVisualizer;
