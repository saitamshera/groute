import React, { useState } from 'react';
import { X, Users, Copy, Check, ArrowRight } from 'lucide-react';
import api from '../services/api.js';

export function CreateGroupModal({ isOpen, onClose, onGroupCreated }) {
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [createdGroup, setCreatedGroup] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsLoading(true);
    setError('');

    try {
      const data = await api.createGroup({ name: name.trim() });
      setCreatedGroup(data.group);
      if (onGroupCreated) onGroupCreated(data.group);
    } catch (err) {
      setError(err.message || 'Failed to create group.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!createdGroup?.invite_code) return;
    navigator.clipboard.writeText(createdGroup.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleClose = () => {
    setName('');
    setCreatedGroup(null);
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {!createdGroup ? (
          <div>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Create Travel Group</h3>
                <p className="text-xs text-slate-400">Plan and track trips with your friends</p>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Group Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Manali Road Trip, Ladakh Riders"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || !name.trim()}
                className="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm shadow-lg shadow-brand-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>{isLoading ? 'Creating Group...' : 'Create Group'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        ) : (
          <div className="text-center py-2 animate-in fade-in">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto mb-4">
              <Check className="w-7 h-7" />
            </div>

            <h3 className="text-xl font-bold text-white mb-1">Group Created!</h3>
            <p className="text-sm text-slate-400 mb-6">
              Share this invite code with your friends to let them join <span className="text-white font-semibold">{createdGroup.name}</span>.
            </p>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 mb-6">
              <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold block mb-1">
                Unique Group Invite Code
              </span>
              <div className="flex items-center justify-center gap-3">
                <span className="text-2xl font-mono font-extrabold tracking-widest text-brand-400">
                  {createdGroup.invite_code}
                </span>
                <button
                  onClick={handleCopy}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                  title="Copy Invite Code"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              {copied && <span className="text-[11px] text-emerald-400 mt-1 block">Copied to clipboard!</span>}
            </div>

            <button
              onClick={handleClose}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm transition-colors"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default CreateGroupModal;
