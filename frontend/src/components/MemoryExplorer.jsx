import React, { useState } from 'react';
import { 
  Database, 
  Search, 
  Filter, 
  Clock, 
  ExternalLink, 
  Layers, 
  Sparkles,
  User,
  Hash,
  ChevronDown
} from 'lucide-react';

export default function MemoryExplorer({ clusters, signals, onSelectCluster }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSource, setSelectedSource] = useState('ALL');
  const [selectedState, setSelectedState] = useState('ALL');

  // Derive unique sources
  const sources = ['ALL', ...Array.from(new Set(signals.map(s => s.source)))];
  const states = ['ALL', 'Active', 'Emerging', 'Stable', 'Declining', 'Historical'];

  // Filter signals
  const filteredSignals = signals.filter(s => {
    // Source filter
    if (selectedSource !== 'ALL' && s.source.toLowerCase() !== selectedSource.toLowerCase()) {
      return false;
    }
    // Search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchText = s.text.toLowerCase().includes(q);
      const matchSource = s.source.toLowerCase().includes(q);
      const matchAuthor = (s.author || '').toLowerCase().includes(q);
      if (!matchText && !matchSource && !matchAuthor) return false;
    }
    // State filter (via cluster lookup)
    if (selectedState !== 'ALL') {
      const parentCluster = clusters.find(c => c.id === s.cluster_id);
      if (!parentCluster || parentCluster.state !== selectedState) return false;
    }
    return true;
  });

  return (
    <div className="space-y-5">
      
      {/* Explorer Controls Bar */}
      <div className="glass-panel p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Search Bar */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search temporal memory signals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>

        {/* Source & State Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          
          {/* State Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
            <span>State:</span>
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded px-2 py-1 focus:outline-none focus:border-cyan-500"
            >
              {states.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          {/* Source Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
            <span>Source:</span>
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded px-2 py-1 focus:outline-none focus:border-cyan-500"
            >
              {sources.map(src => (
                <option key={src} value={src}>{src}</option>
              ))}
            </select>
          </div>

          <div className="text-xs font-mono text-cyan-400 pl-2">
            {filteredSignals.length} signals found
          </div>

        </div>

      </div>

      {/* Signals Timeline List */}
      <div className="glass-panel p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Temporal Signals Memory Ledger
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-400">Indexed in Qdrant Vector Collection</span>
        </div>

        {filteredSignals.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            No signals match the current filters or memory is empty.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSignals.map((sig) => {
              const cluster = clusters.find(c => c.id === sig.cluster_id);

              return (
                <div
                  key={sig.id}
                  className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-cyan-500/30 transition-all text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2 font-mono text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/40">
                        {sig.source}
                      </span>
                      
                      {cluster && (
                        <button
                          onClick={() => onSelectCluster(cluster)}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold flex items-center gap-1 transition-colors"
                        >
                          <Layers className="w-3 h-3 text-cyan-400" />
                          <span>{cluster.name}</span>
                        </button>
                      )}

                      {cluster && (
                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                          cluster.state === 'Active' ? 'badge-active' :
                          cluster.state === 'Emerging' ? 'badge-emerging' :
                          cluster.state === 'Stable' ? 'badge-stable' : 'badge-historical'
                        }`}>
                          {cluster.state}
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
                          <span>Open</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>

                  <p className="text-slate-200 text-sm leading-relaxed mb-2 font-sans">
                    {sig.text}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-[10px] font-mono text-slate-500">
                    <span className="truncate max-w-[260px]">Hash: {sig.content_hash}</span>
                    <span>Qdrant Point: Indexed</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
