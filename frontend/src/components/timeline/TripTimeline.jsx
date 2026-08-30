import React, { useState } from 'react';
import { Clock, AlertTriangle, MapPin, CheckCircle2, Navigation, Flag, Filter, UserCheck, ShieldAlert } from 'lucide-react';
import useTripStore from '../../store/tripStore.js';
import { formatTime, timeAgo } from '../../utils/formatters.js';

export function TripTimeline() {
  const { events, setSelectedMemberId, setSelectedStop, stops } = useTripStore();
  const [filter, setFilter] = useState('ALL'); // 'ALL' | 'STOPS' | 'ALERTS'

  const getEventVisuals = (event) => {
    switch (event.event_type) {
      case 'TRIP_STARTED':
        return {
          icon: <Navigation className="w-4 h-4 text-emerald-400" />,
          badgeBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
          title: 'Trip Started',
          description: `${event.user_name} initiated the trip.`
        };
      case 'STOP_STARTED':
        return {
          icon: <span className="text-base leading-none">🛑</span>,
          badgeBg: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
          title: `${event.user_name} stopped`,
          description: `Stopped at ${event.location_name || event.metadata?.locationName || 'Highway Rest Point'}`
        };
      case 'STOP_ENDED':
        const durationText = event.metadata?.durationMinutes ? `${event.metadata.durationMinutes} min` : 'a short break';
        return {
          icon: <Navigation className="w-4 h-4 text-blue-400" />,
          badgeBg: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
          title: `${event.user_name} resumed driving`,
          description: `Resumed travel after ${durationText} at ${event.location_name || 'Rest Area'}`
        };
      case 'MEMBER_FELL_BEHIND':
      case 'GROUP_SPLIT':
        const dist = event.metadata?.distanceKm || '5+';
        return {
          icon: <AlertTriangle className="w-4 h-4 text-amber-400" />,
          badgeBg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
          title: 'Group Separation Alert',
          description: `${event.user_name} is ${dist} km behind the group center.`
        };
      case 'MEMBER_REJOINED':
        return {
          icon: <CheckCircle2 className="w-4 h-4 text-cyan-400" />,
          badgeBg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
          title: 'Member Rejoined',
          description: `${event.user_name} is back with the group convoy!`
        };
      case 'TRIP_COMPLETED':
        return {
          icon: <Flag className="w-4 h-4 text-purple-400" />,
          badgeBg: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
          title: 'Destination Reached',
          description: `Trip marked completed. Group arrived safely.`
        };
      default:
        return {
          icon: <UserCheck className="w-4 h-4 text-slate-400" />,
          badgeBg: 'bg-slate-800 text-slate-400 border-slate-700',
          title: event.event_type.replace('_', ' '),
          description: event.metadata?.message || 'Activity recorded'
        };
    }
  };

  const filteredEvents = events.filter(e => {
    if (filter === 'STOPS') return e.event_type === 'STOP_STARTED' || e.event_type === 'STOP_ENDED';
    if (filter === 'ALERTS') return e.event_type === 'MEMBER_FELL_BEHIND' || e.event_type === 'GROUP_SPLIT';
    return true;
  });

  const handleEventClick = (event) => {
    if (event.user_id) {
      setSelectedMemberId(event.user_id);
    }
    if (event.event_type === 'STOP_STARTED' || event.event_type === 'STOP_ENDED') {
      const matchedStop = stops.find(s => s.user_id === event.user_id || s.id === event.metadata?.stopId);
      if (matchedStop) {
        setSelectedStop(matchedStop);
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/90 border border-slate-800/90 rounded-2xl overflow-hidden backdrop-blur-md">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-brand-500/10 text-brand-400">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Live Trip Timeline</h3>
            <p className="text-[11px] text-slate-400">Auto-detected travel events</p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-2 py-0.5 rounded font-medium transition-colors ${
              filter === 'ALL' ? 'bg-brand-500 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            All ({events.length})
          </button>
          <button
            onClick={() => setFilter('STOPS')}
            className={`px-2 py-0.5 rounded font-medium transition-colors ${
              filter === 'STOPS' ? 'bg-brand-500 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Stops
          </button>
          <button
            onClick={() => setFilter('ALERTS')}
            className={`px-2 py-0.5 rounded font-medium transition-colors ${
              filter === 'ALERTS' ? 'bg-brand-500 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Alerts
          </button>
        </div>
      </div>

      {/* Timeline Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredEvents.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center text-center p-4 text-slate-500">
            <Clock className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-sm font-medium">No timeline events recorded yet</p>
            <p className="text-xs text-slate-600 mt-0.5">Events like stops, separation alerts, and progress will appear in real time</p>
          </div>
        ) : (
          <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
            {filteredEvents.map((event, idx) => {
              const visuals = getEventVisuals(event);
              return (
                <div
                  key={event.id || idx}
                  onClick={() => handleEventClick(event)}
                  className="relative group cursor-pointer transition-transform hover:-translate-y-0.5"
                >
                  {/* Timeline Dot */}
                  <div className="absolute -left-6 top-1.5 w-4 h-4 rounded-full bg-slate-900 border-2 border-slate-700 group-hover:border-brand-400 flex items-center justify-center transition-colors">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 group-hover:bg-brand-400" />
                  </div>

                  {/* Card Content */}
                  <div className="bg-slate-850/90 hover:bg-slate-800 border border-slate-800/80 hover:border-slate-700 p-3 rounded-xl transition-all shadow-sm">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`p-1 rounded-md border text-xs flex items-center justify-center ${visuals.badgeBg}`}>
                          {visuals.icon}
                        </span>
                        <span className="text-xs font-bold text-slate-200 group-hover:text-brand-300 transition-colors">
                          {visuals.title}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-500 whitespace-nowrap">
                        {formatTime(event.created_at)}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 pl-6 leading-relaxed">
                      {visuals.description}
                    </p>

                    {event.location_name && (
                      <div className="mt-2 pl-6 flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                        <MapPin className="w-3 h-3 text-brand-400" />
                        <span className="truncate">{event.location_name}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default TripTimeline;
