import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, FastForward, Sliders, Sparkles, CheckCircle2, ShieldAlert, Coffee } from 'lucide-react';
import { getSocket } from '../../services/socket.js';
import useTripStore from '../../store/tripStore.js';

// Route waypoints from Delhi to Manali along NH44 / NH21
const routeWaypoints = [
  { lat: 28.6315, lng: 77.2167, name: 'Connaught Place, Delhi' },
  { lat: 28.7365, lng: 77.1510, name: 'Mukarba Chowk, Delhi' },
  { lat: 29.0264, lng: 77.0700, name: 'Murthal (Sukhdev Dhaba), Haryana' },
  { lat: 29.2330, lng: 77.0120, name: 'Samalkha, Haryana' },
  { lat: 29.3909, lng: 76.9635, name: 'Panipat Toll Plaza' },
  { lat: 29.6857, lng: 76.9905, name: 'Karnal Oasis Resort' },
  { lat: 29.9695, lng: 76.8783, name: 'Kurukshetra Highway' },
  { lat: 30.3782, lng: 76.7767, name: 'Ambala Cantt' },
  { lat: 30.6425, lng: 76.8173, name: 'Zirakpur Junction' },
  { lat: 30.7333, lng: 76.7794, name: 'Chandigarh Bypass' },
  { lat: 30.9664, lng: 76.5331, name: 'Rupnagar, Punjab' },
  { lat: 31.1812, lng: 76.5684, name: 'Kiratpur Sahib' },
  { lat: 31.2333, lng: 76.7167, name: 'Swarghat, Himachal' },
  { lat: 31.3400, lng: 76.7600, name: 'Bilaspur Lake View' },
  { lat: 31.5333, lng: 76.9000, name: 'Sundernagar' },
  { lat: 31.7087, lng: 76.9320, name: 'Mandi Town' },
  { lat: 31.8764, lng: 77.1541, name: 'Bhuntar Airport, Kullu' },
  { lat: 31.9579, lng: 77.1095, name: 'Kullu Valley' },
  { lat: 32.2396, lng: 77.1887, name: 'Manali Mall Road' }
];

export function DemoController() {
  const { trip, isSimulationActive, setSimulationActive } = useTripStore();
  const [speedMultiplier, setSpeedMultiplier] = useState(2); // 1x, 2x, 5x, 10x
  const [stepIndex, setStepIndex] = useState(0);
  const [simAmanStopped, setSimAmanStopped] = useState(false);
  const [simKaranSplit, setSimKaranSplit] = useState(false);
  const timerRef = useRef(null);

  // Simulated traveler profiles
  const simulatedMembers = [
    { id: 'sim-rahul', name: 'Rahul (Convoy Leader)', offset: 0, baseSpeed: 55, img: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Rahul' },
    { id: 'sim-aman', name: 'Aman', offset: -0.015, baseSpeed: 50, img: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aman' },
    { id: 'sim-priya', name: 'Priya', offset: -0.005, baseSpeed: 52, img: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Priya' },
    { id: 'sim-karan', name: 'Karan', offset: -0.060, baseSpeed: 45, img: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Karan' },
    { id: 'sim-neha', name: 'Neha (Scout)', offset: 0.025, baseSpeed: 60, img: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Neha' },
  ];

  // Helper interpolation between waypoints
  const getSimCoords = (index, offset = 0) => {
    const total = routeWaypoints.length - 1;
    const progress = Math.max(0, Math.min(total, index / 10));
    const lowerIdx = Math.floor(progress);
    const upperIdx = Math.min(total, lowerIdx + 1);
    const fraction = progress - lowerIdx;

    const p1 = routeWaypoints[lowerIdx];
    const p2 = routeWaypoints[upperIdx];

    const lat = p1.lat + (p2.lat - p1.lat) * fraction + (offset * 0.4);
    const lng = p1.lng + (p2.lng - p1.lng) * fraction + (offset * 0.2);

    return { lat, lng };
  };

  const emitSimulatedStep = (currentStep, forceAmanStop = simAmanStopped, forceKaranSplit = simKaranSplit) => {
    if (!trip) return;
    const socket = getSocket();

    simulatedMembers.forEach((member) => {
      let speed = member.baseSpeed + (Math.random() * 6 - 3);
      let offset = member.offset;

      // Special Scenario: Aman stopped at Murthal (near step 20)
      if (member.id === 'sim-aman') {
        if (forceAmanStop) {
          speed = 0; // Stationary
          // Lock coordinate to Murthal
          const murthal = routeWaypoints[2];
          socket.emit('location:update', {
            tripId: trip.id,
            isSimulated: true,
            simulatedUserId: member.id,
            simulatedUserName: member.name,
            simulatedUserImage: member.img,
            latitude: murthal.lat,
            longitude: murthal.lng,
            accuracy: 5,
            speed: 0,
            heading: 0,
            timestamp: Date.now()
          });
          return;
        }
      }

      // Special Scenario: Karan falling 7.8 km behind convoy
      if (member.id === 'sim-karan') {
        if (forceKaranSplit) {
          offset = -0.15; // 8+ km behind
          speed = 25;
        } else {
          offset = -0.01; // rejoined convoy
          speed = 58;
        }
      }

      const coords = getSimCoords(currentStep, offset);

      socket.emit('location:update', {
        tripId: trip.id,
        isSimulated: true,
        simulatedUserId: member.id,
        simulatedUserName: member.name,
        simulatedUserImage: member.img,
        latitude: coords.lat,
        longitude: coords.lng,
        accuracy: 8,
        speed,
        heading: 350,
        timestamp: Date.now()
      });
    });
  };

  // Simulation Loop
  useEffect(() => {
    if (isSimulationActive) {
      const intervalMs = Math.max(800, 3000 / speedMultiplier);
      timerRef.current = setInterval(() => {
        setStepIndex((prev) => {
          const next = prev + 1;
          emitSimulatedStep(next);
          return next;
        });
      }, intervalMs);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isSimulationActive, speedMultiplier, simAmanStopped, simKaranSplit, trip?.id]);

  const handleTogglePlay = () => {
    const nextState = !isSimulationActive;
    setSimulationActive(nextState);
    if (nextState) {
      emitSimulatedStep(stepIndex);
    }
  };

  const handleReset = () => {
    setSimulationActive(false);
    setStepIndex(0);
    setSimAmanStopped(false);
    setSimKaranSplit(false);
    emitSimulatedStep(0, false, false);
  };

  const triggerAmanStop = () => {
    const next = !simAmanStopped;
    setSimAmanStopped(next);
    emitSimulatedStep(stepIndex, next, simKaranSplit);
  };

  const triggerKaranSplit = () => {
    const next = !simKaranSplit;
    setSimKaranSplit(next);
    emitSimulatedStep(stepIndex, simAmanStopped, next);
  };

  return (
    <div className="bg-slate-900/95 border border-brand-500/30 rounded-2xl p-3 sm:p-4 shadow-2xl backdrop-blur-md">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-amber-400 font-display">
            Simulation & Interview Demo Mode
          </span>
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            (5 simulated travelers on Delhi → Manali route)
          </span>
        </div>

        {/* Speed Multiplier */}
        <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800 text-xs">
          <span className="text-slate-500 mr-1 text-[11px]">Speed:</span>
          {[1, 2, 5, 10].map((s) => (
            <button
              key={s}
              onClick={() => setSpeedMultiplier(s)}
              className={`px-1.5 py-0.5 rounded font-mono font-semibold transition-colors ${
                speedMultiplier === s
                  ? 'bg-brand-500 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      {/* Main Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Playback Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleTogglePlay}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold shadow-lg transition-all ${
              isSimulationActive
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                : 'bg-brand-600 hover:bg-brand-500 text-white shadow-brand-500/20'
            }`}
          >
            {isSimulationActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span>{isSimulationActive ? 'Pause Simulation' : 'Start Simulation'}</span>
          </button>

          <button
            onClick={handleReset}
            title="Reset Simulation"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Scenario Triggers */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={triggerAmanStop}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              simAmanStopped
                ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 shadow-rose-500/20'
                : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <span>🛑</span>
            <span>{simAmanStopped ? 'Resume Aman' : 'Stop Aman at Murthal'}</span>
          </button>

          <button
            onClick={triggerKaranSplit}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              simKaranSplit
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-amber-500/20'
                : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <span>⚠</span>
            <span>{simKaranSplit ? 'Rejoin Karan' : 'Split Karan (7.8km Behind)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default DemoController;
