import React, { useRef, useState, useEffect } from 'react';
import { ZoomIn, ZoomOut, Compass, Navigation, Maximize2, MapPin, Eye } from 'lucide-react';
import useTripStore from '../../store/tripStore.js';
import { formatSpeed, formatDistance } from '../../utils/formatters.js';

export function CanvasMapVisualizer() {
  const {
    trip,
    liveLocations,
    stops,
    groupCenter,
    selectedMemberId,
    setSelectedMemberId,
    setSelectedStop
  } = useTripStore();

  const containerRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Map coordinate projection bounds (Standard Delhi -> Manali bounds or dynamic from points)
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

  // Mouse pan handlers
  const handleMouseDown = (e) => {
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

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Waypoints along Delhi-Manali NH44 / NH21 highway
  const routeWaypoints = [
    { name: 'Delhi', lat: 28.6315, lng: 77.2167 },
    { name: 'Murthal', lat: 29.0264, lng: 77.0700 },
    { name: 'Panipat', lat: 29.3909, lng: 76.9635 },
    { name: 'Karnal', lat: 29.6857, lng: 76.9905 },
    { name: 'Kurukshetra', lat: 29.9695, lng: 76.8783 },
    { name: 'Ambala', lat: 30.3782, lng: 76.7767 },
    { name: 'Chandigarh Bypass', lat: 30.7333, lng: 76.7794 },
    { name: 'Kiratpur', lat: 31.1812, lng: 76.5684 },
    { name: 'Bilaspur', lat: 31.3400, lng: 76.7600 },
    { name: 'Mandi', lat: 31.7087, lng: 76.9320 },
    { name: 'Kullu', lat: 31.9579, lng: 77.1095 },
    { name: 'Manali', lat: 32.2396, lng: 77.1887 }
  ];

  const originProj = projectCoords(trip?.origin_lat || 28.6315, trip?.origin_lng || 77.2167);
  const destProj = projectCoords(trip?.destination_lat || 32.2396, trip?.destination_lng || 77.1887);
  const centerProj = groupCenter ? projectCoords(groupCenter.latitude, groupCenter.longitude) : null;

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
      className="relative w-full h-full bg-[#090d16] overflow-hidden select-none cursor-grab active:cursor-grabbing rounded-2xl border border-slate-800"
    >
      {/* Map Background Grid & Cartographic Texture */}
      <div
        className="absolute inset-0 transition-transform duration-75"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'center center'
        }}
      >
        {/* Subtle coordinate grid lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#334155" strokeWidth="0.8" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        {/* Dynamic SVG Vector Route Layer */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
          {/* Route Glow Shadow */}
          <path
            d={pathD}
            fill="none"
            stroke="#2563eb"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="opacity-40 filter blur-[2px]"
          />
          {/* Main Highway Route Polyline */}
          <path
            d={pathD}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="2 0.5"
          />

          {/* Separation Alert Vectors (dotted line from split members to Group Centroid) */}
          {centerProj && Object.values(liveLocations).map((loc) => {
            if (loc.status === 'SPLIT' && loc.latitude) {
              const memProj = projectCoords(loc.latitude, loc.longitude);
              return (
                <g key={`split-line-${loc.userId}`}>
                  <line
                    x1={centerProj.x}
                    y1={centerProj.y}
                    x2={memProj.x}
                    y2={memProj.y}
                    stroke="#f59e0b"
                    strokeWidth="0.8"
                    strokeDasharray="1 1"
                    className="animate-pulse"
                  />
                </g>
              );
            }
            return null;
          })}
        </svg>

        {/* Highway Milestone Labels */}
        {routeWaypoints.map((wp, idx) => {
          const pt = projectCoords(wp.lat, wp.lng);
          return (
            <div
              key={idx}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-1 opacity-50"
              style={{ left: `${pt.x}%`, top: `${pt.y}%` }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
              <span className="text-[9px] font-mono text-slate-400 whitespace-nowrap bg-slate-900/60 px-1 rounded">
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
            <span className="px-2 py-0.5 rounded bg-emerald-500/90 text-white font-bold text-[10px] shadow-lg">
              Origin: {trip?.origin || 'Start'}
            </span>
            <div className="w-2.5 h-2.5 bg-emerald-500 rotate-45 transform -translate-y-1" />
          </div>
        </div>

        {/* Destination Pin */}
        <div
          className="absolute transform -translate-x-1/2 -translate-y-full z-10 pointer-events-auto"
          style={{ left: `${destProj.x}%`, top: `${destProj.y}%` }}
        >
          <div className="flex flex-col items-center">
            <span className="px-2 py-0.5 rounded bg-indigo-500/90 text-white font-bold text-[10px] shadow-lg">
              🏁 {trip?.destination || 'Destination'}
            </span>
            <div className="w-2.5 h-2.5 bg-indigo-500 rotate-45 transform -translate-y-1" />
          </div>
        </div>

        {/* Group Centroid Indicator */}
        {centerProj && (
          <div
            className="absolute transform -translate-x-1/2 -translate-y-1/2 z-15 pointer-events-none"
            style={{ left: `${centerProj.x}%`, top: `${centerProj.y}%` }}
          >
            <div className="relative flex items-center justify-center">
              <span className="w-12 h-12 rounded-full border border-brand-400/40 bg-brand-500/10 animate-ping-slow absolute" />
              <div className="w-4 h-4 rounded-full bg-brand-500 border-2 border-white flex items-center justify-center shadow-lg shadow-brand-500/50">
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
              </div>
              <span className="absolute -bottom-4 text-[9px] font-bold text-brand-300 bg-slate-900/90 px-1.5 py-0.5 rounded border border-brand-500/30 whitespace-nowrap">
                Group Center
              </span>
            </div>
          </div>
        )}

        {/* Stop Markers */}
        {stops.map((stop) => {
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
                <div className="w-8 h-8 rounded-full bg-rose-600 border-2 border-white shadow-xl shadow-rose-600/50 flex items-center justify-center text-sm font-bold animate-bounce">
                  🛑
                </div>
                <div className="absolute top-9 px-2 py-0.5 rounded bg-slate-900/95 border border-rose-500/40 text-[10px] font-semibold text-rose-300 shadow-md whitespace-nowrap">
                  {stop.location_name || 'Stop'}
                </div>
              </div>
            </div>
          );
        })}

        {/* Live Active Member Markers */}
        {Object.values(liveLocations).map((loc) => {
          if (!loc.latitude || !loc.longitude || loc.locationSharing === false || loc.status === 'LOCATION_OFF') {
            return null;
          }

          const proj = projectCoords(loc.latitude, loc.longitude);
          const isSelected = selectedMemberId === loc.userId;
          const isStopped = loc.status === 'STOPPED';
          const isSplit = loc.status === 'SPLIT';

          return (
            <div
              key={loc.userId}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedMemberId(loc.userId);
              }}
              className={`absolute transform -translate-x-1/2 -translate-y-1/2 z-30 cursor-pointer transition-all duration-300 pointer-events-auto ${
                isSelected ? 'scale-125 z-40' : 'hover:scale-110'
              }`}
              style={{ left: `${proj.x}%`, top: `${proj.y}%` }}
            >
              <div className="relative flex flex-col items-center group">
                {/* Pulse Radar for moving users */}
                {!isStopped && (
                  <span className="absolute -inset-2 rounded-full bg-brand-500/30 animate-radar pointer-events-none" />
                )}

                {/* Avatar with status ring */}
                <div
                  className={`relative w-10 h-10 rounded-full border-2 p-0.5 bg-slate-900 shadow-2xl transition-colors ${
                    isStopped
                      ? 'border-rose-500 ring-4 ring-rose-500/20'
                      : isSplit
                      ? 'border-amber-400 ring-4 ring-amber-400/30'
                      : isSelected
                      ? 'border-white ring-4 ring-brand-500/40'
                      : 'border-brand-500'
                  }`}
                >
                  <img
                    src={loc.userImage || `https://api.dicebear.com/7.x/avataaars/svg?seed=${loc.userName}`}
                    alt={loc.userName}
                    className="w-full h-full rounded-full object-cover"
                  />

                  {/* Micro state icon badge */}
                  <span
                    className={`absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white border border-slate-900 ${
                      isStopped ? 'bg-rose-500' : isSplit ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                  >
                    {isStopped ? '🛑' : isSplit ? '⚠' : '▶'}
                  </span>
                </div>

                {/* Floating Member Info Tag */}
                <div className="mt-1 px-2 py-0.5 rounded-md bg-slate-900/95 border border-slate-700/80 shadow-xl flex items-center gap-1.5 whitespace-nowrap">
                  <span className="text-[11px] font-bold text-white">{loc.userName}</span>
                  {loc.speed > 0 && (
                    <span className="text-[10px] font-mono font-semibold text-brand-300">
                      · {Math.round(loc.speed)} km/h
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Map Controls */}
      <div className="absolute top-4 right-4 z-40 flex flex-col gap-2 bg-slate-900/90 border border-slate-800 p-1.5 rounded-xl backdrop-blur-md shadow-xl">
        <button
          onClick={() => setZoom(z => Math.min(3, z + 0.25))}
          title="Zoom In"
          className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => setZoom(z => Math.max(0.75, z - 0.25))}
          title="Zoom Out"
          className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={resetView}
          title="Center Convoy Map"
          className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <Compass className="w-4 h-4" />
        </button>
      </div>

      {/* Map Legend */}
      <div className="absolute bottom-4 left-4 z-40 bg-slate-900/85 border border-slate-800/80 px-3 py-2 rounded-xl backdrop-blur-md text-[11px] text-slate-400 flex items-center gap-4 hidden sm:flex">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Moving
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-rose-500" /> Stop Detected
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-400" /> Falling Behind (&gt;5km)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-brand-500" /> Group Center
        </span>
      </div>
    </div>
  );
}

export default CanvasMapVisualizer;
