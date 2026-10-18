import React, { useState } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { resetMemory } from '../api';

export default function ResetConfirmModal({ isOpen, onClose, onResetComplete }) {
  if (!isOpen) return null;

  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    try {
      setLoading(true);
      await resetMemory();
      if (onResetComplete) onResetComplete();
      onClose();
    } catch (err) {
      console.error("Failed to reset memory:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md glass-panel p-6 border-rose-500/40 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-200"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-3 text-rose-400">
          <div className="w-10 h-10 rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100">
              Reset Temporal AI Memory?
            </h3>
            <p className="text-xs text-rose-300/80 font-mono">
              Destructive Memory Operation
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed mb-5">
          This will immediately purge all tracked weak signal clusters, clear historical transitions, remove all 384-dimensional vector embeddings, and re-initialize the Qdrant vector collection to zero.
        </p>

        <div className="flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-slate-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="btn-danger px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-rose-950/50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{loading ? 'Purging Memory...' : 'Confirm Reset / Clear All'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
