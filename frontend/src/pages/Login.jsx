import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Navigation, Lock, Mail, ArrowRight, Sparkles } from 'lucide-react';
import useAuthStore from '../store/authStore.js';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const { login, isLoading, error } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setLocalError(err.message || 'Login failed.');
    }
  };

  const handleDemoLogin = async (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    try {
      await login(demoEmail, demoPass);
      navigate('/dashboard');
    } catch (err) {
      // If demo user doesn't exist, create it automatically
      const name = demoEmail.split('@')[0];
      const capitalized = name.charAt(0).toUpperCase() + name.slice(1);
      const { register } = useAuthStore.getState();
      await register(capitalized, demoEmail, demoPass);
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 items-center justify-center shadow-xl shadow-brand-500/25 mb-4">
            <Navigation className="w-7 h-7 text-white transform -rotate-45" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Group<span className="text-brand-400">Route</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">Real-Time Group Travel & Location Intelligence</p>
        </div>

        {/* Login Card */}
        <div className="glass-panel rounded-2xl p-6 sm:p-8 shadow-2xl border border-slate-800">
          <h2 className="text-xl font-bold text-white mb-6">Welcome Back</h2>

          {(localError || error) && (
            <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium">
              {localError || error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 transform -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="rahul@example.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-750 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 transform -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-750 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm shadow-lg shadow-brand-500/25 transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
            >
              <span>{isLoading ? 'Signing In...' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* 1-Click Demo Accounts */}
          <div className="mt-6 pt-5 border-t border-slate-800/80">
            <div className="flex items-center gap-1.5 mb-3 text-xs font-semibold text-slate-400">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Quick Demo 1-Click Login</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleDemoLogin('rahul@example.com', 'password123')}
                className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-750 text-xs text-left transition-colors"
              >
                <p className="font-semibold text-slate-200">Rahul (Owner)</p>
                <p className="text-[10px] text-slate-400">rahul@example.com</p>
              </button>
              <button
                type="button"
                onClick={() => handleDemoLogin('aman@example.com', 'password123')}
                className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-750 text-xs text-left transition-colors"
              >
                <p className="font-semibold text-slate-200">Aman (Member)</p>
                <p className="text-[10px] text-slate-400">aman@example.com</p>
              </button>
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-slate-400">
            Don't have an account?{' '}
            <Link to="/register" className="text-brand-400 font-semibold hover:underline">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
