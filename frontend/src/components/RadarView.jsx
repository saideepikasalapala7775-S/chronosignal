import React, { useState } from 'react';
import { 
  Radio, 
  TrendingUp, 
  Layers, 
  Clock, 
  ExternalLink, 
  Zap, 
  ChevronRight,
  ShieldAlert,
  Sparkles
} from 'lucide-react';

export default function RadarView({ clusters, onSelectCluster, activeNow }) {
  const [hoveredCluster, setHoveredCluster] = useState(null);

  // Radar coordinate calculations
  // Center is (250, 250), radius = 220
  const CX = 250;
  const CY = 250;
  const MAX_R = 210;

  const getCoordinates = (cluster, index, total) => {
    const score = cluster.metrics?.final_score || 0;
    // Map score 0 -> 100 to distance from center (higher score = closer to center)
    // Distance from center: score 100 is at r=40, score 0 is at r=200
    const r = Math.max(35, Math.min(MAX_R - 15, MAX_R - (score / 100.0) * (MAX_R - 40)));
    
    // Spread angle around circle evenly or with hash
    const angleStep = (2 * Math.PI) / Math.max(1, total);
    const angle = index * angleStep - Math.PI / 2;

    const x = CX + r * Math.cos(angle);
    const y = CY + r * Math.sin(angle);
    return { x, y, r, angle };
  };

  const getStateColor = (state) => {
    switch (state) {
      case 'Active': return '#10b981';
      case 'Emerging': return '#00f2fe';
      case 'Stable': return '#f59e0b';
      case 'Declining': return '#f43f5e';
      case 'Historical': return '#94a3b8';
      default: return '#38bdf8';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Radar Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Radar Graphic Column */}
        <div className="lg:col-span-7 glass-panel p-5 flex flex-col items-center relative overflow-hidden">
          
          <div className="w-full flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Temporal Spatial Radar
              </h3>
            </div>
            <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span>Real-time Sweep</span>
            </div>
          </div>

          {/* SVG Radar Visualizer */}
          <div className="relative w-full max-w-[460px] aspect-square flex items-center justify-center">
            
            <svg viewBox="0 0 500 500" className="w-full h-full select-none">
              <defs>
                {/* Radial Gradient for Active Center Core */}
                <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#00f2fe" stopOpacity="0.25" />
                  <stop offset="60%" stopColor="#10b981" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="#090d16" stopOpacity="0" />
                </radialGradient>

                {/* Radar Sweep Gradient */}
                <linearGradient id="sweepGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#00f2fe" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#00f2fe" stopOpacity="0" />
                </linearGradient>

                {/* Glow filter */}
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Background Concentric Radar Rings */}
              {/* Outer ring: Historical */}
              <circle cx={CX} cy={CY} r={MAX_R} fill="#090d16" stroke="rgba(148, 163, 184, 0.15)" strokeWidth="1" />
              {/* Ring 4: Declining */}
              <circle cx={CX} cy={CY} r={MAX_R * 0.78} fill="none" stroke="rgba(244, 63, 94, 0.18)" strokeWidth="1" strokeDasharray="3 3" />
              {/* Ring 3: Stable */}
              <circle cx={CX} cy={CY} r={MAX_R * 0.58} fill="none" stroke="rgba(245, 158, 11, 0.2)" strokeWidth="1" />
              {/* Ring 2: Emerging */}
              <circle cx={CX} cy={CY} r={MAX_R * 0.38} fill="none" stroke="rgba(0, 242, 254, 0.25)" strokeWidth="1.2" strokeDasharray="4 2" />
              {/* Center Core: Active */}
              <circle cx={CX} cy={CY} r={MAX_R * 0.20} fill="url(#centerGlow)" stroke="#10b981" strokeWidth="1.5" />

              {/* Crosshair Lines */}
              <line x1={CX} y1={25} x2={CX} y2={475} stroke="rgba(56, 189, 248, 0.12)" strokeWidth="1" />
              <line x1={25} y1={CY} x2={475} y2={CY} stroke="rgba(56, 189, 248, 0.12)" strokeWidth="1" />
              <line x1={90} y1={90} x2={410} y2={410} stroke="rgba(56, 189, 248, 0.08)" strokeWidth="1" strokeDasharray="2 2" />
              <line x1={90} y1={410} x2={410} y2={90} stroke="rgba(56, 189, 248, 0.08)" strokeWidth="1" strokeDasharray="2 2" />

              {/* Rotating Sweep Beam */}
              <g className="animate-radar-sweep">
                <path
                  d={`M ${CX} ${CY} L ${CX} ${CY - MAX_R} A ${MAX_R} ${MAX_R} 0 0 1 ${CX + MAX_R * 0.707} ${CY - MAX_R * 0.707} Z`}
                  fill="url(#sweepGradient)"
                />
                <line x1={CX} y1={CY} x2={CX} y2={CY - MAX_R} stroke="#00f2fe" strokeWidth="1.5" />
              </g>

              {/* Radar Zone Labels */}
              <text x={CX + 6} y={CY - MAX_R * 0.20 + 12} fill="#10b981" fontSize="9" fontFamily="monospace" fontWeight="bold">ACTIVE CORE</text>
              <text x={CX + 6} y={CY - MAX_R * 0.38 + 12} fill="#00f2fe" fontSize="9" fontFamily="monospace">EMERGING</text>
              <text x={CX + 6} y={CY - MAX_R * 0.58 + 12} fill="#f59e0b" fontSize="9" fontFamily="monospace">STABLE</text>
              <text x={CX + 6} y={CY - MAX_R * 0.78 + 12} fill="#f43f5e" fontSize="9" fontFamily="monospace">DECLINING</text>
              <text x={CX + 6} y={CY - MAX_R + 12} fill="#94a3b8" fontSize="9" fontFamily="monospace">HISTORICAL</text>

              {/* Plotted Cluster Nodes */}
              {clusters.map((cluster, idx) => {
                const { x, y } = getCoordinates(cluster, idx, clusters.length);
                const color = getStateColor(cluster.state);
                const isHovered = hoveredCluster?.id === cluster.id;
                const score = cluster.metrics?.final_score || 0;

                return (
                  <g
                    key={cluster.id}
                    className="cursor-pointer transition-transform duration-200"
                    onMouseEnter={() => setHoveredCluster(cluster)}
                    onMouseLeave={() => setHoveredCluster(null)}
                    onClick={() => onSelectCluster(cluster)}
                  >
                    {/* Pulsing ring for Active or Emerging */}
                    {(cluster.state === 'Active' || cluster.state === 'Emerging') && (
                      <circle
                        cx={x}
                        cy={y}
                        r={isHovered ? 20 : 14}
                        fill="none"
                        stroke={color}
                        strokeWidth="1"
                        className="animate-ping"
                        style={{ animationDuration: cluster.state === 'Active' ? '1.8s' : '3s' }}
                      />
                    )}

                    {/* Outer glow ring */}
                    <circle
                      cx={x}
                      cy={y}
                      r={isHovered ? 13 : 9}
                      fill={color}
                      fillOpacity={0.2}
                      stroke={color}
                      strokeWidth={isHovered ? 2.5 : 1.5}
                      filter="url(#glow)"
                    />

                    {/* Inner core dot */}
                    <circle
                      cx={x}
                      cy={y}
                      r={isHovered ? 6 : 4}
                      fill={color}
                    />

                    {/* Cluster Name Tag */}
                    <text
                      x={x + 12}
                      y={y + 4}
                      fill={isHovered ? '#ffffff' : '#cbd5e1'}
                      fontSize={isHovered ? "11" : "10"}
                      fontFamily="sans-serif"
                      fontWeight={isHovered ? "bold" : "500"}
                      className="drop-shadow-md select-none"
                    >
                      {cluster.name.split(' ').slice(0, 2).join(' ')} ({score.toFixed(0)})
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Hover Tooltip Overlay */}
            {hoveredCluster && (
              <div className="absolute bottom-4 left-4 right-4 bg-slate-950/95 border border-cyan-500/40 rounded-lg p-2.5 backdrop-blur-md shadow-2xl pointer-events-none text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-100">{hoveredCluster.name}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                    hoveredCluster.state === 'Active' ? 'badge-active' : 'badge-emerging'
                  }`}>
                    {hoveredCluster.state}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1.5 font-mono text-[11px] text-slate-400">
                  <span>Score: <strong className="text-cyan-400">{hoveredCluster.metrics?.final_score.toFixed(1)}</strong></span>
                  <span>Signals: <strong className="text-slate-200">{hoveredCluster.signal_count}</strong></span>
                  <span>Sources: <strong className="text-slate-200">{hoveredCluster.unique_sources?.length}</strong></span>
                </div>
              </div>
            )}

          </div>

          <div className="mt-3 flex items-center justify-center gap-4 text-[10px] font-mono text-slate-400">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Active (&gt;=60)</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-cyan-400" /> Emerging</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400" /> Stable</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-400" /> Declining</span>
          </div>

        </div>

        {/* Radar Insights & Metric Explanation Column */}
        <div className="lg:col-span-5 space-y-4">
          
          <div className="glass-panel p-5">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Weak Signal Accumulation Formula
              </h3>
            </div>
            
            <p className="text-xs text-slate-300 leading-relaxed mb-3">
              Chronosignal computes four min-max normalized temporal dimensions to separate organic compound trends from isolated noise bursts:
            </p>

            <div className="space-y-2 text-xs font-mono">
              <div className="p-2 rounded bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <span className="text-cyan-300">Norm_Volume (20%)</span>
                <span className="text-slate-400">min(1.0, Total / 10.0)</span>
              </div>
              <div className="p-2 rounded bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <span className="text-emerald-300">Norm_Velocity (35%)</span>
                <span className="text-slate-400">C_24h / max(1, C_7d - C_24h)</span>
              </div>
              <div className="p-2 rounded bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <span className="text-purple-300">Norm_Diversity (25%)</span>
                <span className="text-slate-400">min(1.0, Sources / 4.0)</span>
              </div>
              <div className="p-2 rounded bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <span className="text-amber-300">Norm_Recency (20%)</span>
                <span className="text-slate-400">exp(-0.05 * Hours_Last)</span>
              </div>
            </div>

            <div className="mt-3 p-2.5 rounded-lg bg-cyan-950/30 border border-cyan-800/40 text-[11px] text-cyan-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>
                <strong>Grace Period Rule:</strong> Clusters under 48 hours old are immune to demotion, giving faint signals time to form cross-source consensus.
              </span>
            </div>
          </div>

          {/* Quick Summary Counts */}
          <div className="grid grid-cols-2 gap-3">
            <div className="glass-panel p-3.5">
              <div className="text-[10px] font-mono uppercase text-slate-400">Tracked Clusters</div>
              <div className="text-2xl font-extrabold font-mono text-cyan-400 mt-0.5">{clusters.length}</div>
              <div className="text-[10px] text-slate-400 mt-1">Across 384-dim vector space</div>
            </div>

            <div className="glass-panel p-3.5">
              <div className="text-[10px] font-mono uppercase text-slate-400">Active Breakouts</div>
              <div className="text-2xl font-extrabold font-mono text-emerald-400 mt-0.5">
                {clusters.filter(c => c.state === 'Active').length}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">Score &gt;= 60.0 &amp; Multi-source</div>
            </div>
          </div>

        </div>

      </div>

      {/* Detected Clusters Feed Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>Detected Emerging Memory Clusters ({clusters.length})</span>
          </h3>
          <span className="text-xs text-slate-400">Click any card to launch full investigation</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clusters.map((cluster) => {
            const m = cluster.metrics || {};
            const score = m.final_score ?? 0;

            return (
              <div
                key={cluster.id}
                onClick={() => onSelectCluster(cluster)}
                className="glass-panel p-4 cursor-pointer hover:border-cyan-400/60 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded ${
                      cluster.state === 'Active' ? 'badge-active' :
                      cluster.state === 'Emerging' ? 'badge-emerging' :
                      cluster.state === 'Stable' ? 'badge-stable' :
                      cluster.state === 'Declining' ? 'badge-declining' : 'badge-historical'
                    }`}>
                      {cluster.state}
                    </span>

                    <div className="flex items-center gap-1 font-mono text-xs">
                      <span className="text-slate-400">Score:</span>
                      <strong className="text-cyan-400 font-extrabold">{score.toFixed(1)}</strong>
                    </div>
                  </div>

                  <h4 className="text-sm font-bold text-slate-100 group-hover:text-cyan-300 transition-colors line-clamp-1 mb-1">
                    {cluster.name}
                  </h4>

                  <p className="text-xs text-slate-400 line-clamp-2 mb-3">
                    {cluster.summary}
                  </p>
                </div>

                <div>
                  {/* Metric Progress Bars */}
                  <div className="grid grid-cols-4 gap-1.5 py-2 border-t border-slate-800/80 text-[10px] font-mono text-slate-400">
                    <div>
                      <div>Vol: {(m.norm_volume || 0).toFixed(1)}</div>
                      <div className="w-full bg-slate-800 h-1 rounded mt-0.5 overflow-hidden">
                        <div className="bg-cyan-400 h-full" style={{ width: `${(m.norm_volume || 0) * 100}%` }} />
                      </div>
                    </div>
                    <div>
                      <div>Vel: {(m.norm_velocity || 0).toFixed(1)}</div>
                      <div className="w-full bg-slate-800 h-1 rounded mt-0.5 overflow-hidden">
                        <div className="bg-emerald-400 h-full" style={{ width: `${(m.norm_velocity || 0) * 100}%` }} />
                      </div>
                    </div>
                    <div>
                      <div>Div: {(m.norm_diversity || 0).toFixed(1)}</div>
                      <div className="w-full bg-slate-800 h-1 rounded mt-0.5 overflow-hidden">
                        <div className="bg-purple-400 h-full" style={{ width: `${(m.norm_diversity || 0) * 100}%` }} />
                      </div>
                    </div>
                    <div>
                      <div>Rec: {(m.norm_recency || 0).toFixed(1)}</div>
                      <div className="w-full bg-slate-800 h-1 rounded mt-0.5 overflow-hidden">
                        <div className="bg-amber-400 h-full" style={{ width: `${(m.norm_recency || 0) * 100}%` }} />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-[11px] text-slate-400">
                    <span className="font-mono">{cluster.signal_count} signals ({cluster.unique_sources?.length} sources)</span>
                    <span className="text-cyan-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5 text-xs font-semibold">
                      Investigate <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
