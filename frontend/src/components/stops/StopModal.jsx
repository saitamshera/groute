import React from 'react';
import { X, MapPin, Clock, User, Navigation } from 'lucide-react';
import useTripStore from '../../store/tripStore.js';
import { formatTime, formatDuration } from '../../utils/formatters.js';

export function StopModal() {
  const { selectedStop, setSelectedStop } = useTripStore();

  if (!selectedStop) return null;

  const isOngoing = !selectedStop.ended_at;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl p-6 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={() => setSelectedStop(null)}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-2xl">
            🛑
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-rose-400 px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20">
                {isOngoing ? 'Ongoing Stop' : 'Completed Stop'}
              </span>
            </div>
            <h3 className="text-lg font-bold text-white mt-1 leading-tight">
              {selectedStop.location_name || 'Highway Waypoint'}
            </h3>
          </div>
        </div>

        {/* Details Grid */}
        <div className="space-y-3 bg-slate-850/80 p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400 flex items-center gap-2">
              <User className="w-4 h-4 text-brand-400" /> Traveler
            </span>
            <span className="font-semibold text-white">
              {selectedStop.user_name || 'Group Member'}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" /> Started At
            </span>
            <span className="font-mono text-slate-200">
              {formatTime(selectedStop.started_at)}
            </span>
          </div>

          {selectedStop.ended_at && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400 flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" /> Resumed At
              </span>
              <span className="font-mono text-slate-200">
                {formatTime(selectedStop.ended_at)}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between text-sm pt-2 border-t border-slate-800">
            <span className="text-slate-400 font-medium">Total Stop Duration</span>
            <span className="font-bold text-rose-300 font-mono text-base">
              {isOngoing ? 'Currently Stopped' : formatDuration(selectedStop.duration_seconds)}
            </span>
          </div>
        </div>

        {/* Coordinates */}
        <div className="mt-4 flex items-center justify-between text-xs text-slate-400 px-1">
          <span className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-slate-500" />
            {selectedStop.latitude?.toFixed(4)}°N, {selectedStop.longitude?.toFixed(4)}°E
          </span>
          <span className="text-slate-500">Auto-Detected by GroupRoute Engine</span>
        </div>

        <button
          onClick={() => setSelectedStop(null)}
          className="w-full mt-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}

export default StopModal;
