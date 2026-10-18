import React from 'react';
import { 
  ArrowLeft, 
  Clock, 
  ExternalLink, 
  Layers, 
  CheckCircle2, 
  History, 
  Tag, 
  ShieldCheck, 
  TrendingUp, 
  Activity,
  FileText,
  User,
  Hash
} from 'lucide-react';

export default function InvestigationView({ cluster, onBack }) {
  if (!cluster) {
    return (
      <div className="glass-panel p-12 text-center text-slate-400">
        <Layers className="w-12 h-12 mx-auto text-slate-600 mb-3" />
        <h3 className="text-base font-bold text-slate-200">No Cluster Selected</h3>
        <p className="text-xs text-slate-400 mt-1 mb-4">Select an emerging cluster from the Trend Radar to launch a deep-dive investigation.</p>
        <button
          onClick={onBack}
          className="btn-primary px-4 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Radar
        </button>
      </div>
    );
  }

  const m = cluster.metrics || {
    total_signals: cluster.signal_count,
    count_24h: 0,
    count_7d: 0,
    unique_sources: cluster.unique_sources?.length || 0,
    hours_since_last_signal: 0,
    norm_volume: 0,
    norm_velocity: 0,
    norm_diversity: 0,
    norm_recency: 0,
    final_score: 0
  };

  const transitions = cluster.state_transitions || [];
  const signals = cluster.signals || [];

  return (
    <div className="space-y-6">
      
      {/* Investigation Top Navigation & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-5">
        <div>
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-mono mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Radar
          </button>
          
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-extrabold text-slate-100 tracking-wide">
              {cluster.name}
            </h2>
            <span className={`text-xs font-bold font-mono px-2.5 py-0.5 rounded-full ${
              cluster.state === 'Active' ? 'badge-active' :
              cluster.state === 'Emerging' ? 'badge-emerging' :
              cluster.state === 'Stable' ? 'badge-stable' :
              cluster.state === 'Declining' ? 'badge-declining' : 'badge-historical'
            }`}>
              {cluster.state}
            </span>
          </div>

          <p className="text-xs text-slate-400 mt-1 font-mono">
            Cluster ID: <span className="text-slate-300">{cluster.id}</span> • First Seen: {new Date(cluster.first_seen).toLocaleString()}
          </p>
        </div>

        {/* Big Score Gauge Box */}
        <div className="flex items-center gap-4 bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-right">
            <div className="text-[10px] font-mono uppercase text-slate-400">Emergence Score</div>
            <div className="text-3xl font-extrabold font-mono text-cyan-400">
              {m.final_score.toFixed(1)}
              <span className="text-xs text-slate-500 font-normal"> / 100</span>
            </div>
            <div className="text-[10px] text-emerald-400 font-mono">
              {m.final_score >= 60.0 ? '✓ Exceeds Active Threshold (60.0)' : 'Emerging trajectory'}
            </div>
          </div>
        </div>
      </div>

      {/* Mathematical Breakdown Formula Cards */}
      <div className="glass-panel p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Scoring Formula Decomposition
            </h3>
          </div>
          <span className="text-[11px] font-mono text-cyan-400">Strictly Min-Max Normalized [0.0 - 1.0]</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Volume Metric */}
          <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1">
              <span>Volume (20%)</span>
              <strong className="text-cyan-400">{(m.norm_volume * 100).toFixed(0)}%</strong>
            </div>
            <div className="text-lg font-bold font-mono text-slate-100">
              {(0.20 * m.norm_volume * 100).toFixed(1)} <span className="text-xs text-slate-500">pts</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded mt-2 overflow-hidden">
              <div className="bg-cyan-400 h-full" style={{ width: `${m.norm_volume * 100}%` }} />
            </div>
            <div className="text-[10px] font-mono text-slate-400 mt-2">
              Formula: min(1.0, {m.total_signals} / 10.0) = {m.norm_volume.toFixed(2)}
            </div>
          </div>

          {/* Velocity Metric */}
          <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1">
              <span>Velocity (35%)</span>
              <strong className="text-emerald-400">{(m.norm_velocity * 100).toFixed(0)}%</strong>
            </div>
            <div className="text-lg font-bold font-mono text-slate-100">
              {(0.35 * m.norm_velocity * 100).toFixed(1)} <span className="text-xs text-slate-500">pts</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded mt-2 overflow-hidden">
              <div className="bg-emerald-400 h-full" style={{ width: `${m.norm_velocity * 100}%` }} />
            </div>
            <div className="text-[10px] font-mono text-slate-400 mt-2">
              Ratio: {m.count_24h} / max(1, {m.count_7d} - {m.count_24h}) = {m.norm_velocity.toFixed(2)}
            </div>
          </div>

          {/* Diversity Metric */}
          <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1">
              <span>Diversity (25%)</span>
              <strong className="text-purple-400">{(m.norm_diversity * 100).toFixed(0)}%</strong>
            </div>
            <div className="text-lg font-bold font-mono text-slate-100">
              {(0.25 * m.norm_diversity * 100).toFixed(1)} <span className="text-xs text-slate-500">pts</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded mt-2 overflow-hidden">
              <div className="bg-purple-400 h-full" style={{ width: `${m.norm_diversity * 100}%` }} />
            </div>
            <div className="text-[10px] font-mono text-slate-400 mt-2">
              Formula: min(1.0, {m.unique_sources} / 4.0) = {m.norm_diversity.toFixed(2)}
            </div>
          </div>

          {/* Recency Metric */}
          <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1">
              <span>Recency (20%)</span>
              <strong className="text-amber-400">{(m.norm_recency * 100).toFixed(0)}%</strong>
            </div>
            <div className="text-lg font-bold font-mono text-slate-100">
              {(0.20 * m.norm_recency * 100).toFixed(1)} <span className="text-xs text-slate-500">pts</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded mt-2 overflow-hidden">
              <div className="bg-amber-400 h-full" style={{ width: `${m.norm_recency * 100}%` }} />
            </div>
            <div className="text-[10px] font-mono text-slate-400 mt-2">
              Formula: exp(-0.05 * {m.hours_since_last_signal}h) = {m.norm_recency.toFixed(2)}
            </div>
          </div>

        </div>

      </div>

      {/* State Transition History Log */}
      <div className="glass-panel p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              State Transition Audit Log ({transitions.length})
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-400">Audited State Machine Transitions</span>
        </div>

        {transitions.length === 0 ? (
          <div className="p-4 rounded-lg bg-slate-900/60 text-xs text-slate-400 text-center font-mono">
            No state transitions logged yet.
          </div>
        ) : (
          <div className="space-y-2.5">
            {transitions.map((t, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/90 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-mono text-[10px] font-bold">
                    {idx + 1}
                  </span>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px]">
                      {t.from_state || t.from || 'Initialization'}
                    </span>
                    <span className="text-cyan-400 font-bold">&rarr;</span>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      (t.to_state || t.to) === 'Active' ? 'badge-active' :
                      (t.to_state || t.to) === 'Emerging' ? 'badge-emerging' :
                      (t.to_state || t.to) === 'Stable' ? 'badge-stable' : 'badge-historical'
                    }`}>
                      {t.to_state || t.to}
                    </span>
                  </div>
                </div>

                <div className="text-slate-300 font-medium md:flex-1 md:px-4">
                  {t.reason}
                </div>

                <div className="text-[11px] font-mono text-slate-400 shrink-0">
                  {new Date(t.timestamp).toLocaleTimeString()} • {new Date(t.timestamp).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cited Signals Dossier */}
      <div className="glass-panel p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Cited Signals &amp; Corroborating Mentions ({signals.length})
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-400">Verified Evidence Trail</span>
        </div>

        <div className="space-y-3">
          {signals.map((sig, idx) => (
            <div
              key={sig.id}
              className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-all text-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2 font-mono text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/40">
                    ID: {sig.id}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">
                    {sig.source}
                  </span>
                  {sig.author && (
                    <span className="text-slate-400 flex items-center gap-1">
                      <User className="w-3 h-3" /> {sig.author}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(sig.timestamp).toLocaleString()}
                  </span>
                  {sig.url && (
                    <a
                      href={sig.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-cyan-400 hover:text-cyan-300 flex items-center gap-0.5 hover:underline"
                    >
                      <span>Source</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>

              <p className="text-slate-200 text-sm leading-relaxed mb-2 font-sans">
                "{sig.text}"
              </p>

              <div className="flex items-center gap-3 text-[10px] font-mono text-slate-500 pt-2 border-t border-slate-800/60">
                <span className="truncate max-w-[280px]">Hash: {sig.content_hash}</span>
                <span>Dim: 384</span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
