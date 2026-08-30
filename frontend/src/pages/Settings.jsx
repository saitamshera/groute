import React, { useState } from 'react';
import { Shield, Eye, Lock, MapPin, Key, User, Check, Smartphone, Info } from 'lucide-react';
import useAuthStore from '../store/authStore.js';

export function Settings() {
  const { user, updateProfile } = useAuthStore();
  const [name, setName] = useState(user?.name || '');
  const [profileImage, setProfileImage] = useState(user?.profile_image || '');
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await updateProfile({ name, profile_image: profileImage });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2500);
    } catch (err) {
      alert('Failed to update profile');
    }
  };

  const avatars = [
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Rahul',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Aman',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Priya',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Karan',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Neha',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Simran'
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <span className="text-xs uppercase tracking-wider text-brand-400 font-semibold">User Controls</span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Privacy & Settings</h1>
      </div>

      {/* PRIVACY GUARANTEES (REQUIRED SECTION) */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-brand-500/30 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-brand-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Location Sharing & Privacy Policy</h2>
            <p className="text-xs text-slate-400">Explicit granular control over your GPS telemetry</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-1.5">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
              <Eye className="w-4 h-4" />
              <span>Trip-Only Visibility</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Your location is shared <strong>only with members of your active trip</strong>. It is never public or discoverable.
            </p>
          </div>

          <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-1.5">
            <div className="flex items-center gap-2 text-brand-400 text-xs font-bold">
              <Lock className="w-4 h-4" />
              <span>Automatic Termination</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              When the trip ends or you toggle sharing off, <strong>broadcasting immediately halts</strong> and GPS recording stops.
            </p>
          </div>

          <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-1.5">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-bold">
              <Smartphone className="w-4 h-4" />
              <span>Accuracy & Battery Guard</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              GPS broadcasts are throttled to <strong>once every 3.5 seconds</strong> while moving to preserve mobile battery.
            </p>
          </div>
        </div>
      </div>

      {/* PROFILE SETTINGS */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800">
        <h2 className="text-lg font-bold text-white mb-4">Profile Information</h2>

        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">Select Avatar</label>
            <div className="flex items-center gap-3 flex-wrap">
              {avatars.map((av, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setProfileImage(av)}
                  className={`w-12 h-12 rounded-full border-2 p-0.5 transition-all ${
                    profileImage === av ? 'border-brand-500 scale-110' : 'border-slate-700 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={av} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Display Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full max-w-md px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-750 text-white text-sm focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs shadow-lg shadow-brand-500/25 transition-all"
            >
              Save Profile Changes
            </button>
            {isSaved && (
              <span className="text-xs text-emerald-400 flex items-center gap-1 font-semibold">
                <Check className="w-4 h-4" /> Saved!
              </span>
            )}
          </div>
        </form>
      </div>

      {/* GOOGLE MAPS API SETUP GUIDE */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-3">
        <div className="flex items-center gap-2 text-slate-200">
          <Key className="w-4 h-4 text-brand-400" />
          <h3 className="text-sm font-bold">Google Maps Platform Integration</h3>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          GroupRoute includes an ultra-fast SVG cartographic visualizer by default. To switch to the Google Maps JS SDK, add your Google Maps API key in the environment variables:
        </p>
        <pre className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs font-mono text-brand-300 overflow-x-auto">
          VITE_GOOGLE_MAPS_API_KEY=AIzaSy...
        </pre>
      </div>
    </div>
  );
}

export default Settings;
