import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Navigation, MapPin, Calendar, Clock, ArrowRight, ArrowLeft, Route, Check } from 'lucide-react';
import api from '../services/api.js';

// Popular road trip presets for quick 1-click selection
const tripPresets = [
  {
    name: 'Delhi to Manali Expedition',
    origin: 'Connaught Place, New Delhi',
    destination: 'Mall Road, Manali, Himachal Pradesh',
    origin_lat: 28.6315,
    origin_lng: 77.2167,
    destination_lat: 32.2396,
    destination_lng: 77.1887,
    distance: '535 km',
    duration: '11h 30m'
  },
  {
    name: 'Mumbai to Goa Scenic Coastal Highway',
    origin: 'Bandra West, Mumbai',
    destination: 'Panaji, Goa',
    origin_lat: 19.0596,
    origin_lng: 72.8295,
    destination_lat: 15.4909,
    destination_lng: 73.8278,
    distance: '585 km',
    duration: '10h 45m'
  },
  {
    name: 'Bengaluru to Coorg Coffee Trails',
    origin: 'Indiranagar, Bengaluru',
    destination: 'Madikeri, Coorg, Karnataka',
    origin_lat: 12.9716,
    origin_lng: 77.5946,
    destination_lat: 12.4244,
    destination_lng: 75.7382,
    distance: '248 km',
    duration: '5h 15m'
  }
];

export function CreateTrip() {
  const [searchParams] = useSearchParams();
  const initialGroupId = searchParams.get('group') || '';
  const navigate = useNavigate();

  const [groups, setGroups] = useState([]);
  const [groupId, setGroupId] = useState(initialGroupId);
  const [tripName, setTripName] = useState('Delhi to Manali Road Trip');
  const [origin, setOrigin] = useState('Connaught Place, New Delhi');
  const [destination, setDestination] = useState('Mall Road, Manali, Himachal Pradesh');
  const [originLat, setOriginLat] = useState(28.6315);
  const [originLng, setOriginLng] = useState(77.2167);
  const [destLat, setDestLat] = useState(32.2396);
  const [destLng, setDestLng] = useState(77.1887);
  const [distance, setDistance] = useState('535 km');
  const [duration, setDuration] = useState('11h 30m');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchGroups() {
      try {
        const data = await api.getGroups();
        setGroups(data.groups || []);
        if (!groupId && data.groups && data.groups.length > 0) {
          setGroupId(data.groups[0].id);
        }
      } catch (err) {
        console.error('Failed to load groups:', err);
      }
    }
    fetchGroups();
  }, []);

  const handleApplyPreset = (preset) => {
    setTripName(preset.name);
    setOrigin(preset.origin);
    setDestination(preset.destination);
    setOriginLat(preset.origin_lat);
    setOriginLng(preset.origin_lng);
    setDestLat(preset.destination_lat);
    setDestLng(preset.destination_lng);
    setDistance(preset.distance);
    setDuration(preset.duration);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!groupId) {
      setError('Please select or create a group first.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const data = await api.createTrip({
        group_id: groupId,
        name: tripName.trim(),
        origin: origin.trim(),
        destination: destination.trim(),
        origin_lat: originLat,
        origin_lng: originLng,
        destination_lat: destLat,
        destination_lng: destLng,
        distance,
        estimated_duration: duration
      });

      navigate(`/trips/${data.trip.id}`);
    } catch (err) {
      setError(err.message || 'Failed to create trip.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          to="/dashboard"
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">New Journey</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Plan Group Road Trip</h1>
        </div>
      </div>

      {/* Quick Highway Presets */}
      <div>
        <span className="text-xs font-semibold text-slate-400 block mb-2.5">
          Select a Popular Highway Route Preset:
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {tripPresets.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleApplyPreset(preset)}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                tripName === preset.name
                  ? 'bg-brand-500/15 border-brand-500/50 shadow-md shadow-brand-500/10'
                  : 'bg-slate-850/80 hover:bg-slate-800 border-slate-800'
              }`}
            >
              <p className="text-xs font-bold text-white leading-snug">{preset.name}</p>
              <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
                <span className="font-mono">{preset.distance}</span>
                <span className="font-mono">{preset.duration}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Trip Form */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800">
        {error && (
          <div className="mb-6 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleCreate} className="space-y-6">
          {/* Group Selector */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Select Travel Group</label>
            {groups.length === 0 ? (
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                <span>No groups available. Please create a group first.</span>
                <Link to="/dashboard" className="text-brand-400 font-bold underline">
                  Create Group
                </Link>
              </div>
            ) : (
              <select
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-750 text-white text-sm focus:outline-none focus:border-brand-500 transition-colors"
              >
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.invite_code})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Trip Name */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Trip Name</label>
            <input
              type="text"
              required
              value={tripName}
              onChange={(e) => setTripName(e.target.value)}
              placeholder="e.g. Manali Expedition 2026"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-750 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>

          {/* Origin & Destination */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Origin</label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-emerald-400 absolute left-3.5 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  placeholder="Starting point"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-750 text-white text-sm focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Destination</label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-indigo-400 absolute left-3.5 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="Final Destination"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-750 text-white text-sm focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Route Preview Summary Card */}
          <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-brand-500/10 text-brand-400">
                <Route className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Estimated Distance & Duration</p>
                <p className="text-[11px] text-slate-400">Calculated via Road Geodesic Matrix</p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-right">
              <div>
                <span className="text-[10px] text-slate-500 uppercase block">Distance</span>
                <span className="font-mono text-sm font-bold text-slate-200">{distance}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block">Est. Time</span>
                <span className="font-mono text-sm font-bold text-brand-400">{duration}</span>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !groupId}
            className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-sm shadow-lg shadow-brand-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <span>{isLoading ? 'Creating Trip...' : 'Create & Proceed to Live Map'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

export default CreateTrip;
