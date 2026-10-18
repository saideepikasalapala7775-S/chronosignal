import React from 'react';
import { 
  Radar, 
  Search, 
  Database, 
  PlusCircle, 
  RotateCcw, 
  Cpu, 
  Layers, 
  ShieldCheck, 
  Clock 
} from 'lucide-react';

export default function Header({ 
  health, 
  activeTab, 
  setActiveTab, 
  onOpenIngest, 
  onOpenReset,
  selectedCluster
}) {
  const embeddingMode = health?.embedding_mode || 'Hash-Fallback';
  const qdrantStatus = health?.qdrant_status || 'Connected';
  const clusterCount = health?.cluster_count ?? 0;
  const signalCount = health?.signal_count ?? 0;
  const activeNow = health?.active_now ? new Date(health.active_now).toLocaleTimeString() : 'Live';

  return (
    <header className="border-b border-cyan-500/10 bg-[#07090e]/80 backdrop-blur-md sticky top-0 z-40 px-4 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Brand & Tagline */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-2.5">
            <div className="relative flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-tr from-cyan-600 to-sky-400 p-[1px] shadow-lg shadow-cyan-500/20">
              <div className="w-full h-full bg-[#090d16] rounded-lg flex items-center justify-center">
                <Radar className="w-5 h-5 text-cyan-400 animate-spin" style={{ animationDuration: '14s' }} />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-extrabold tracking-wider bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-400 bg-clip-text text-transparent">
                  CHRONOSIGNAL
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/40">
                  v2.0
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
                Temporal AI Memory & Weak Signal Radar
              </p>
            </div>
          </div>

          {/* System Status Pills (Mobile compact) */}
          <div className="flex md:hidden items-center gap-2 text-xs">
            <span className="flex items-center gap-1 px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300 font-mono text-[11px]">
              <Cpu className="w-3 h-3 text-cyan-400" />
              {embeddingMode}
            </span>
          </div>
        </div>

        {/* View Navigation Tabs */}
        <nav className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900/90 border border-slate-800/80 shadow-inner">
          <button
            onClick={() => setActiveTab('radar')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'radar'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Radar className="w-3.5 h-3.5" />
            <span>Trend Radar</span>
          </button>

          <button
            onClick={() => setActiveTab('investigation')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'investigation'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Investigation</span>
            {selectedCluster && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('explorer')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'explorer'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Memory Explorer</span>
          </button>
        </nav>

        {/* System Diagnostics & Action Buttons */}
        <div className="flex items-center gap-3">
          
          {/* Vector & Model Badges (Desktop) */}
          <div className="hidden lg:flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900/90 border border-slate-800 text-[11px] font-mono text-slate-300" title="Vector Database">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Qdrant (384-dim)</span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-cyan-950/40 border border-cyan-800/30 text-[11px] font-mono text-cyan-300" title="Embedding Model">
              <Cpu className="w-3 h-3 text-cyan-400" />
              <span>{embeddingMode}</span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900/90 border border-slate-800 text-[11px] font-mono text-slate-400" title="Signals in Memory">
              <Layers className="w-3 h-3 text-sky-400" />
              <span>{clusterCount} clusters / {signalCount} sigs</span>
            </div>
          </div>

          {/* Action: Ingest Signal */}
          <button
            onClick={onOpenIngest}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition-all hover:scale-[1.02] shadow-sm"
          >
            <PlusCircle className="w-3.5 h-3.5 text-cyan-400" />
            <span>Ingest</span>
          </button>

          {/* Action: Reset Memory */}
          <button
            onClick={onOpenReset}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-rose-300 hover:bg-rose-950/30 border border-transparent hover:border-rose-900/40 transition-all"
            title="Reset Memory / Clear All"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>

        </div>

      </div>
    </header>
  );
}
