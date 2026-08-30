import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Navigation, MapPin, Calendar, Clock, ArrowRight, ArrowLeft, Route, Check, Plus, UserPlus, Sparkles } from 'lucide-react';
import api from '../services/api.js';
import CreateGroupModal from './CreateGroupModal.jsx';
import JoinGroupModal from './JoinGroupModal.jsx';

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
  const [isLoadingGroups, setIsLoadingGroups] = useState(true);
  const [error, setError] = useState('');

  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isJoinGroupOpen, setIsJoinGroupOpen] = useState(false);

  const fetchGroups = async () => {
    setIsLoadingGroups(true);
    try {
      const data = await api.getGroups();
      const loadedGroups = data.groups || [];
      setGroups(loadedGroups);
      if (loadedGroups.length > 0) {
        if (!groupId || !loadedGroups.some(g => g.id === groupId)) {
          setGroupId(loadedGroups[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load groups:', err);
    } finally {
      setIsLoadingGroups(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const handleGroupCreatedOrJoined = (newGroup) => {
    if (newGroup && newGroup.id) {
      setGroups((prev) => {
        const exists = prev.some(g => g.id === newGroup.id);
        if (exists) return prev;
        return [newGroup, ...prev];
      });
      setGroupId(newGroup.id);
      setError('');
    }
    fetchGroups();
  };

  const handleQuickCreateGroup = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await api.createGroup({ name: 'Himalayan Convoy 2026' });
      if (data.group) {
        handleGroupCreatedOrJoined(data.group);
      }
    } catch (err) {
      setError(err.message || 'Failed to create group');
    } finally {
      setIsLoading(false);
    }
  };

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
      setError('Please select or create a travel group first.');
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
        origin_lat: Number(originLat),
        origin_lng: Number(originLng),
        destination_lat: Number(destLat),
        destination_lng: Number(destLng),
        distance,
        estimated_duration: duration
      });

      if (!data || !data.trip || !data.trip.id) {
        throw new Error('Trip was created but no trip ID was returned by server.');
      }

      // Automatically activate trip for immediate live convoy tracking
      try {
        await api.startTrip(data.trip.id);
      } catch (startErr) {
        console.warn('Trip created, start warning:', startErr);
      }

      navigate(`/trips/${data.trip.id}`);
    } catch (err) {
      console.error('[CreateTrip] Error creating trip:', err);
      setError(err.message || 'Failed to create trip. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          to="/dashboard"
          className="p-2 rounded-full bg-white hover:bg-[#f1f3f4] text-[#5f6368] border border-[#dadce0] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <span className="text-xs uppercase tracking-wider text-[#5f6368] font-bold">New Journey</span>
          <h1 className="text-xl sm:text-2xl font-bold text-[#202124]">Plan Group Road Trip</h1>
        </div>
      </div>

      {/* Quick Highway Presets */}
      <div>
        <span className="text-xs font-bold text-[#5f6368] block mb-2.5">
          Select a Popular Highway Route Preset:
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {tripPresets.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleApplyPreset(preset)}
              className={`p-3.5 rounded-2xl border text-left transition-all ${
                tripName === preset.name
                  ? 'bg-[#e8f0fe] border-[#1a73e8] shadow-xs'
                  : 'bg-white hover:bg-[#f8f9fa] border-[#dadce0]'
              }`}
            >
              <p className="text-xs font-bold text-[#202124] leading-snug">{preset.name}</p>
              <div className="flex items-center justify-between text-[11px] text-[#5f6368] mt-2">
                <span className="font-mono">{preset.distance}</span>
                <span className="font-mono font-semibold text-[#1a73e8]">{preset.duration}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Trip Form */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#dadce0] shadow-sm">
        {error && (
          <div className="mb-6 p-3 rounded-2xl bg-[#fce8e6] border border-[#fad2cf] text-[#c5221f] text-xs font-bold">
            {error}
          </div>
        )}

        <form onSubmit={handleCreate} className="space-y-5">
          {/* Group Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-[#3c4043]">Select Travel Group</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsJoinGroupOpen(true)}
                  className="text-xs font-bold text-[#1a73e8] hover:text-[#1557d0] flex items-center gap-1"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Join Code</span>
                </button>
                <span className="text-[#dadce0]">·</span>
                <button
                  type="button"
                  onClick={() => setIsCreateGroupOpen(true)}
                  className="text-xs font-bold text-[#1a73e8] hover:text-[#1557d0] flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Group</span>
                </button>
              </div>
            </div>

            {groups.length === 0 ? (
              <div className="p-4 rounded-2xl bg-[#f8f9fa] border border-[#dadce0] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#5f6368] font-medium">
                    No travel groups found. Create or join a group to start planning your road trip.
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateGroupOpen(true)}
                    className="px-3.5 py-1.5 rounded-full bg-[#1a73e8] hover:bg-[#1557d0] text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Travel Group</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleQuickCreateGroup}
                    className="px-3.5 py-1.5 rounded-full bg-white hover:bg-[#f1f3f4] text-[#3c4043] border border-[#dadce0] text-xs font-bold transition-colors flex items-center gap-1 shadow-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#f9ab00]" />
                    <span>Quick Create Demo Group</span>
                  </button>
                </div>
              </div>
            ) : (
              <select
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#dadce0] text-[#202124] text-sm focus:outline-none focus:border-[#1a73e8] transition-colors"
              >
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} (Code: {g.invite_code}) {g.isOwner ? '• Owner' : '• Member'}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Trip Name */}
          <div>
            <label className="block text-xs font-bold text-[#3c4043] mb-1.5">Trip Name</label>
            <input
              type="text"
              required
              value={tripName}
              onChange={(e) => setTripName(e.target.value)}
              placeholder="e.g. Manali Expedition 2026"
              className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#dadce0] text-[#202124] placeholder-[#80868b] text-sm focus:outline-none focus:border-[#1a73e8] transition-colors"
            />
          </div>

          {/* Origin & Destination */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#3c4043] mb-1.5">Origin</label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-[#1e8e3e] absolute left-3.5 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  placeholder="Starting point"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-[#dadce0] text-[#202124] text-sm focus:outline-none focus:border-[#1a73e8] transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#3c4043] mb-1.5">Destination</label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-[#d93025] absolute left-3.5 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="Final Destination"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-[#dadce0] text-[#202124] text-sm focus:outline-none focus:border-[#1a73e8] transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Route Preview Summary Card */}
          <div className="bg-[#f8f9fa] p-4 rounded-2xl border border-[#dadce0] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-[#e8f0fe] text-[#1a73e8]">
                <Route className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#202124]">Estimated Distance & Duration</p>
                <p className="text-[11px] text-[#5f6368]">Calculated via Road Geodesic Matrix</p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-right">
              <div>
                <span className="text-[10px] text-[#5f6368] uppercase block font-medium">Distance</span>
                <span className="font-mono text-sm font-bold text-[#202124]">{distance}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#5f6368] uppercase block font-medium">Est. Time</span>
                <span className="font-mono text-sm font-bold text-[#1a73e8]">{duration}</span>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !groupId}
            className="w-full py-3 rounded-full bg-[#1a73e8] hover:bg-[#1557d0] text-white font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <span>{isLoading ? 'Creating Trip...' : 'Create & Proceed to Live Map'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Modals */}
      <CreateGroupModal
        isOpen={isCreateGroupOpen}
        onClose={() => setIsCreateGroupOpen(false)}
        onGroupCreated={handleGroupCreatedOrJoined}
      />
      <JoinGroupModal
        isOpen={isJoinGroupOpen}
        onClose={() => setIsJoinGroupOpen(false)}
        onGroupJoined={handleGroupCreatedOrJoined}
      />
    </div>
  );
}

export default CreateTrip;
