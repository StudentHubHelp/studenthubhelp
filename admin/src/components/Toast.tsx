import React from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error';
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'success', onClose }) => {
  return (
    <div
      id="toast"
      className={`fixed bottom-5 right-5 z-[550] flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl text-sm font-medium border transition-all animate-in slide-in-from-bottom-5 duration-200 ${
        type === 'error'
          ? 'bg-rose-950/95 text-rose-100 border-rose-700/50 shadow-rose-950/50'
          : 'bg-emerald-950/95 text-emerald-100 border-emerald-700/50 shadow-emerald-950/50'
      }`}
    >
      {type === 'error' ? (
        <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
      ) : (
        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
      )}
      <span className="pr-2">{message}</span>
      <button
        onClick={onClose}
        className="p-1 rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white"
        title="Close"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
