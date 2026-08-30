import React, { useEffect } from 'react';
import { AlertTriangle, MapPin, CheckCircle2, X } from 'lucide-react';
import useTripStore from '../../store/tripStore.js';

export function AlertBanner() {
  const { activeAlert, clearActiveAlert } = useTripStore();

  useEffect(() => {
    if (activeAlert) {
      const timer = setTimeout(() => {
        clearActiveAlert();
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [activeAlert, clearActiveAlert]);

  if (!activeAlert) return null;

  const typeStyles = {
    warning: 'bg-amber-500/20 border-amber-500/50 text-amber-200',
    danger: 'bg-rose-500/20 border-rose-500/50 text-rose-200',
    info: 'bg-blue-500/20 border-blue-500/50 text-blue-200',
    success: 'bg-emerald-500/20 border-emerald-500/50 text-emerald-200'
  };

  const icons = {
    warning: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 animate-bounce" />,
    danger: <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 animate-pulse" />,
    info: <MapPin className="w-5 h-5 text-blue-400 shrink-0" />,
    success: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
  };

  const style = typeStyles[activeAlert.type] || typeStyles.info;
  const icon = icons[activeAlert.type] || icons.info;

  return (
    <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 max-w-xl w-full px-4 animate-in fade-in slide-in-from-top-4 duration-300">
      <div className={`p-4 rounded-xl border backdrop-blur-md shadow-2xl flex items-center justify-between gap-3 ${style}`}>
        <div className="flex items-center gap-3">
          {icon}
          <div>
            <p className="text-sm font-medium leading-snug">{activeAlert.message}</p>
          </div>
        </div>
        <button
          onClick={clearActiveAlert}
          className="p-1 rounded-lg hover:bg-white/10 transition-colors opacity-70 hover:opacity-100"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default AlertBanner;
