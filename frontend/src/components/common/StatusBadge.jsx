import React from 'react';

export function StatusBadge({ status, speed, distance }) {
  const normalized = (status || 'MOVING').toUpperCase();

  const configs = {
    MOVING: {
      bg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
      dot: 'bg-emerald-400 animate-pulse',
      label: 'Moving'
    },
    STOPPED: {
      bg: 'bg-rose-500/15 border-rose-500/30 text-rose-400',
      dot: 'bg-rose-500',
      label: 'Stopped'
    },
    POSSIBLE_STOP: {
      bg: 'bg-amber-500/15 border-amber-500/30 text-amber-400',
      dot: 'bg-amber-400 animate-ping',
      label: 'Stationary'
    },
    SPLIT: {
      bg: 'bg-red-500/20 border-red-500/40 text-red-400',
      dot: 'bg-red-500 animate-ping',
      label: 'Falling Behind'
    },
    REJOINED: {
      bg: 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400',
      dot: 'bg-cyan-400',
      label: 'Rejoined'
    },
    LOCATION_OFF: {
      bg: 'bg-slate-700/30 border-slate-600/30 text-slate-400',
      dot: 'bg-slate-500',
      label: 'Location Off'
    },
    OFFLINE: {
      bg: 'bg-zinc-800/40 border-zinc-700/30 text-zinc-400',
      dot: 'bg-zinc-600',
      label: 'Offline'
    },
    STALE: {
      bg: 'bg-yellow-500/15 border-yellow-500/30 text-yellow-400',
      dot: 'bg-yellow-500',
      label: 'Stale GPS'
    }
  };

  const config = configs[normalized] || configs.MOVING;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      <span>{config.label}</span>
      {normalized === 'MOVING' && speed !== undefined && speed > 0 && (
        <span className="opacity-80 font-mono">· {Math.round(speed)} km/h</span>
      )}
      {normalized === 'SPLIT' && distance !== undefined && (
        <span className="opacity-90 font-mono">· {distance} km</span>
      )}
    </span>
  );
}

export default StatusBadge;
