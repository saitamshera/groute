import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Play, Pause, RotateCcw, Sliders, Sparkles, ChevronUp, ChevronDown } from 'lucide-react';
import { getSocket } from '../../services/socket.js';
import useTripStore from '../../store/tripStore.js';
import useAuthStore from '../../store/authStore.js';

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

const defaultCohorts = [
  { key: 'leader', name: 'Rahul (Convoy Leader)', offset: 0, baseSpeed: 55, seed: 'Rahul' },
  { key: 'aman', name: 'Aman', offset: -0.015, baseSpeed: 50, seed: 'Aman' },
  { key: 'priya', name: 'Priya', offset: -0.005, baseSpeed: 52, seed: 'Priya' },
  { key: 'karan', name: 'Karan', offset: -0.060, baseSpeed: 45, seed: 'Karan' },
  { key: 'neha', name: 'Neha (Scout)', offset: 0.025, baseSpeed: 60, seed: 'Neha' },
];

export function DemoController() {
  const { trip, isSimulationActive, setSimulationActive } = useTripStore();
  const { user: currentUser } = useAuthStore();
  const [speedMultiplier, setSpeedMultiplier] = useState(2); // 1x, 2x, 5x, 10x
  const [stepIndex, setStepIndex] = useState(0);
  const [simAmanStopped, setSimAmanStopped] = useState(false);
  const [simAmanLongStop, setSimAmanLongStop] = useState(false);
  const [simKaranSplit, setSimKaranSplit] = useState(false);
  const [simRahulArrived, setSimRahulArrived] = useState(false);
  const [simAllArrived, setSimAllArrived] = useState(false);
  const [isMinimized, setIsMinimized] = useState(true); // Minimized by default
  const timerRef = useRef(null);

  // Dynamically map cohorts to prevent generating a second instance of the logged-in user
  const simulatedMembers = useMemo(() => {
    const userNameLower = (currentUser?.name || '').toLowerCase();
    let matchedKey = null;

    if (userNameLower.includes('aman')) matchedKey = 'aman';
    else if (userNameLower.includes('rahul')) matchedKey = 'leader';
    else if (userNameLower.includes('priya')) matchedKey = 'priya';
    else if (userNameLower.includes('karan')) matchedKey = 'karan';
    else if (userNameLower.includes('neha')) matchedKey = 'neha';
    else if (currentUser) matchedKey = 'leader';

    return defaultCohorts.map((cohort) => {
      if (cohort.key === matchedKey && currentUser) {
        return {
          id: currentUser.id,
          key: cohort.key,
          name: currentUser.name || cohort.name,
          offset: cohort.offset,
          baseSpeed: cohort.baseSpeed,
          img: currentUser.profile_image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.name}`,
          isCurrentUser: true
        };
      }

      return {
        id: `sim-${cohort.key}`,
        key: cohort.key,
        name: cohort.name,
        offset: cohort.offset,
        baseSpeed: cohort.baseSpeed,
        img: `https://api.dicebear.com/7.x/avataaars/svg?seed=${cohort.seed}`,
        isCurrentUser: false
      };
    });
  }, [currentUser?.id, currentUser?.name]);

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

  const emitSimulatedStep = (
    currentStep,
    forceAmanStop = simAmanStopped,
    forceAmanLong = simAmanLongStop,
    forceKaranSplit = simKaranSplit,
    forceRahulArrived = simRahulArrived,
    forceAllArrived = simAllArrived
  ) => {
    if (!trip) return;
    const socket = getSocket();

    simulatedMembers.forEach((member) => {
      let speed = member.baseSpeed + (Math.random() * 6 - 3);
      let offset = member.offset;

      // Special Scenario: ALL TRAVELERS ARRIVED AT MANALI
      if (forceAllArrived) {
        const dest = routeWaypoints[routeWaypoints.length - 1];
        socket.emit('location:update', {
          tripId: trip.id,
          isSimulated: !member.isCurrentUser,
          simulatedUserId: member.id,
          simulatedUserName: member.name,
          simulatedUserImage: member.img,
          latitude: dest.lat + (Math.random() * 0.002 - 0.001),
          longitude: dest.lng + (Math.random() * 0.002 - 0.001),
          accuracy: 5,
          speed: 0,
          heading: 0,
          timestamp: Date.now()
        });
        return;
      }

      // Special Scenario: RAHUL ARRIVED AT MANALI
      if (member.key === 'leader' && forceRahulArrived) {
        const dest = routeWaypoints[routeWaypoints.length - 1];
        socket.emit('location:update', {
          tripId: trip.id,
          isSimulated: !member.isCurrentUser,
          simulatedUserId: member.id,
          simulatedUserName: member.name,
          simulatedUserImage: member.img,
          latitude: dest.lat,
          longitude: dest.lng,
          accuracy: 5,
          speed: 0,
          heading: 0,
          timestamp: Date.now()
        });
        return;
      }

      // Special Scenario: Aman stopped / 10-min long stop at Murthal
      if (member.key === 'aman') {
        if (forceAmanLong || forceAmanStop) {
          const murthal = routeWaypoints[2];
          // If long stop, backdate timestamp by 11 minutes (660s) to trigger 10-min long stop alert
          const simulatedTimestamp = forceAmanLong ? Date.now() - 660000 : Date.now();
          socket.emit('location:update', {
            tripId: trip.id,
            isSimulated: !member.isCurrentUser,
            simulatedUserId: member.id,
            simulatedUserName: member.name,
            simulatedUserImage: member.img,
            latitude: murthal.lat,
            longitude: murthal.lng,
            accuracy: 5,
            speed: 0,
            heading: 0,
            timestamp: simulatedTimestamp
          });
          return;
        }
      }

      // Special Scenario: Karan falling 7.8 km behind convoy
      if (member.key === 'karan') {
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
        isSimulated: !member.isCurrentUser,
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
  }, [isSimulationActive, speedMultiplier, simAmanStopped, simAmanLongStop, simKaranSplit, simRahulArrived, simAllArrived, trip?.id, simulatedMembers]);

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
    setSimAmanLongStop(false);
    setSimKaranSplit(false);
    setSimRahulArrived(false);
    setSimAllArrived(false);
    emitSimulatedStep(0, false, false, false, false, false);
  };

  const triggerAmanStop = () => {
    const next = !simAmanStopped;
    setSimAmanStopped(next);
    setSimAmanLongStop(false);
    emitSimulatedStep(stepIndex, next, false, simKaranSplit, simRahulArrived, simAllArrived);
  };

  const triggerAmanLongStop = () => {
    const next = !simAmanLongStop;
    setSimAmanLongStop(next);
    setSimAmanStopped(next);
    emitSimulatedStep(stepIndex, next, next, simKaranSplit, simRahulArrived, simAllArrived);
  };

  const triggerKaranSplit = () => {
    const next = !simKaranSplit;
    setSimKaranSplit(next);
    emitSimulatedStep(stepIndex, simAmanStopped, simAmanLongStop, next, simRahulArrived, simAllArrived);
  };

  const triggerRahulArrival = () => {
    const next = !simRahulArrived;
    setSimRahulArrived(next);
    emitSimulatedStep(stepIndex, simAmanStopped, simAmanLongStop, simKaranSplit, next, simAllArrived);
  };

  const triggerAllArrival = () => {
    const next = !simAllArrived;
    setSimAllArrived(next);
    emitSimulatedStep(stepIndex, simAmanStopped, simAmanLongStop, simKaranSplit, simRahulArrived, next);
  };

  if (isMinimized) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-md text-[#202124] text-xs font-bold shadow-md border border-[#dadce0] pointer-events-auto">
        <button
          onClick={handleTogglePlay}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-colors ${
            isSimulationActive
              ? 'bg-[#fef7e0] text-[#b06000] border border-[#feefc3]'
              : 'bg-[#1a73e8] text-white'
          }`}
        >
          {isSimulationActive ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          <span>{isSimulationActive ? 'Pause' : 'Simulate'}</span>
        </button>

        <button
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-1 pl-1 text-[#5f6368] hover:text-[#202124] transition-colors"
          title="Expand Simulation Controls"
        >
          <span>⚡ Demo</span>
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white/95 backdrop-blur-md border border-[#dadce0] rounded-3xl p-3 sm:p-3.5 shadow-xl max-w-[95vw] sm:max-w-md w-full animate-in fade-in slide-in-from-bottom-2 duration-150">
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-[#f1f3f4]">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex h-2 w-2 relative shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#f9ab00] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#f9ab00]"></span>
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#b06000] truncate">
            Convoy Simulation
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Speed Multipliers */}
          <div className="flex items-center gap-0.5 bg-[#f8f9fa] px-1 py-0.5 rounded-full border border-[#dadce0] text-[10px]">
            {[1, 2, 5, 10].map((s) => (
              <button
                key={s}
                onClick={() => setSpeedMultiplier(s)}
                className={`px-1.5 py-0.2 rounded-full font-mono font-bold transition-colors ${
                  speedMultiplier === s
                    ? 'bg-[#1a73e8] text-white'
                    : 'text-[#5f6368] hover:text-[#202124]'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsMinimized(true)}
            className="p-1 rounded-full text-[#5f6368] hover:text-[#202124] hover:bg-[#f1f3f4]"
            title="Minimize"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Action Bar */}
      <div className="space-y-2">
        {/* Playback Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleTogglePlay}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shadow-xs transition-all ${
              isSimulationActive
                ? 'bg-[#fef7e0] border border-[#feefc3] text-[#b06000]'
                : 'bg-[#1a73e8] hover:bg-[#1557d0] text-white'
            }`}
          >
            {isSimulationActive ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            <span>{isSimulationActive ? 'Pause' : 'Start'}</span>
          </button>

          <button
            onClick={handleReset}
            title="Reset Simulation"
            className="p-1.5 rounded-full bg-white hover:bg-[#f1f3f4] border border-[#dadce0] text-[#5f6368] transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Quick Scenario Triggers */}
        <div className="flex flex-wrap items-center gap-1 text-xs">
          <button
            onClick={triggerAmanStop}
            className={`flex items-center gap-1 px-2 py-1 rounded-full font-bold border transition-all text-[11px] ${
              simAmanStopped && !simAmanLongStop
                ? 'bg-[#fce8e6] border-[#fad2cf] text-[#c5221f]'
                : 'bg-white border-[#dadce0] text-[#3c4043] hover:bg-[#f8f9fa]'
            }`}
          >
            <span>🛑</span>
            <span>{simAmanStopped && !simAmanLongStop ? 'Resume Aman' : 'Stop Aman'}</span>
          </button>

          <button
            onClick={triggerAmanLongStop}
            className={`flex items-center gap-1 px-2 py-1 rounded-full font-bold border transition-all text-[11px] ${
              simAmanLongStop
                ? 'bg-[#fce8e6] border-[#fad2cf] text-[#c5221f]'
                : 'bg-white border-[#dadce0] text-[#3c4043] hover:bg-[#f8f9fa]'
            }`}
            title="Trigger 10-Minute Stationary Stop at Murthal with nearby Petrol & Hotel"
          >
            <span>⚡</span>
            <span>{simAmanLongStop ? 'End Stop' : '10-Min Stop (Aman)'}</span>
          </button>

          <button
            onClick={triggerKaranSplit}
            className={`flex items-center gap-1 px-2 py-1 rounded-full font-bold border transition-all text-[11px] ${
              simKaranSplit
                ? 'bg-[#fef7e0] border-[#feefc3] text-[#b06000]'
                : 'bg-white border-[#dadce0] text-[#3c4043] hover:bg-[#f8f9fa]'
            }`}
          >
            <span>⚠</span>
            <span>{simKaranSplit ? 'Rejoin Karan' : 'Split Karan (7.8km)'}</span>
          </button>

          <button
            onClick={triggerRahulArrival}
            className={`flex items-center gap-1 px-2 py-1 rounded-full font-bold border transition-all text-[11px] ${
              simRahulArrived
                ? 'bg-[#e6f4ea] border-[#ceead6] text-[#137333]'
                : 'bg-white border-[#dadce0] text-[#3c4043] hover:bg-[#f8f9fa]'
            }`}
            title="Simulate Leader Rahul reaching destination"
          >
            <span>🏁</span>
            <span>{simRahulArrived ? 'Reset' : 'Simulate Arrival (Rahul)'}</span>
          </button>

          <button
            onClick={triggerAllArrival}
            className={`flex items-center gap-1 px-2 py-1 rounded-full font-bold border transition-all text-[11px] ${
              simAllArrived
                ? 'bg-[#e6f4ea] border-[#ceead6] text-[#137333]'
                : 'bg-white border-[#dadce0] text-[#3c4043] hover:bg-[#f8f9fa]'
            }`}
            title="Simulate all 5 convoy members reaching destination"
          >
            <span>🎉</span>
            <span>{simAllArrived ? 'Reset' : 'All Arrive'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default DemoController;
