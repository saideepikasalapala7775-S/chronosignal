import React, { useState } from 'react';
import { 
  Play, 
  FastForward, 
  Clock, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  TrendingUp,
  Activity
} from 'lucide-react';
import { runDemoStep, resetMemory } from '../api';

export default function DemoController({ 
  currentStage, 
  setCurrentStage, 
  onStageExecuted,
  primaryCluster,
  isAutoPlaying,
  setIsAutoPlaying
}) {
  const [loadingStage, setLoadingStage] = useState(null);

  const stagesMeta = [
    {
      num: 1,
      title: "Stage 1: Faint Whispers",
      timeOffset: "-6.9 Days (-165.6h)",
      sources: "arXiv, HackerNews, Reddit",
      signalsCount: 3,
      desc: "Initial weak isolated mentions. Grace period rule prevents premature demotion.",
      expectedState: "Emerging"
    },
    {
      num: 2,
      title: "Stage 2: Cross-Source Echoes",
      timeOffset: "-3.8 Days (-91.2h)",
      sources: "Discord, GitHub, X/Twitter",
      signalsCount: 6,
      desc: "Diversity accumulates across 6 platforms. Centroid updates in 384-dim vector space.",
      expectedState: "Emerging"
    },
    {
      num: 3,
      title: "Stage 3: Velocity Spike",
      timeOffset: "-18 Hours (-18h to -14h)",
      sources: "arXiv, HackerNews, X",
      signalsCount: 9,
      desc: "Count_24h surges. Velocity ratio accelerates momentum.",
      expectedState: "Emerging (Pre-Breakout)"
    },
    {
      num: 4,
      title: "Stage 4: Active Trend Breakout",
      timeOffset: "-2 Hours to Now (0h)",
      sources: "GitHub, Reddit, Discord",
      signalsCount: 12,
      desc: "12 signals, 6 sources. Volume 1.0, Velocity 0.20, Diversity 1.0, Recency 1.0 -> Score >= 60.0 (≈70-72) -> ACTIVE!",
      expectedState: "Active"
    }
  ];

  const handleStepClick = async (stageNum, resetFirst = false) => {
    try {
      setLoadingStage(stageNum);
      const res = await runDemoStep(stageNum, resetFirst);
      setCurrentStage(stageNum);
      if (onStageExecuted) onStageExecuted(res);
    } catch (err) {
      console.error("Demo step failed:", err);
    } finally {
      setLoadingStage(null);
    }
  };

  const handleAutoPlay = async () => {
    if (isAutoPlaying) return;
    setIsAutoPlaying(true);
    try {
      // Start from reset + stage 1
      await handleStepClick(1, true);
      await new Promise(r => setTimeout(r, 1400));
      await handleStepClick(2, false);
      await new Promise(r => setTimeout(r, 1400));
      await handleStepClick(3, false);
      await new Promise(r => setTimeout(r, 1400));
      await handleStepClick(4, false);
    } catch (e) {
      console.error("Autoplay sequence error:", e);
    } finally {
      setIsAutoPlaying(false);
    }
  };

  const score = primaryCluster?.metrics?.final_score ?? 0;
  const state = primaryCluster?.state ?? 'Emerging';

  return (
    <div className="w-full glass-panel p-4 md:p-5 border-cyan-500/20 mb-6 relative overflow-hidden">
      
      {/* Background ambient gradient */}
      <div className="absolute -right-20 -top-20 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-4">
        
        <div>
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-md bg-cyan-500/20 text-cyan-400 font-mono text-xs font-bold">
              <Activity className="w-3.5 h-3.5" />
            </span>
            <h2 className="text-sm md:text-base font-bold text-slate-100 uppercase tracking-wider">
              Judge & Demo Step-by-Step Playback
            </h2>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/60">
              Deterministic Math Engine
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Simulates temporal signal progression across 7 days with forward timestamp spacing to demonstrate how weak whispers crystallize into an Active trend.
          </p>
        </div>

        {/* Global Auto-Play and Live Score Pill */}
        <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
          
          {primaryCluster && (
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800">
              <div className="text-right">
                <div className="text-[10px] uppercase font-mono text-slate-400">Trend Score</div>
                <div className="text-sm font-extrabold font-mono text-cyan-400">{score.toFixed(1)} / 100</div>
              </div>
              <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                state === 'Active' ? 'badge-active' :
                state === 'Emerging' ? 'badge-emerging' :
                state === 'Stable' ? 'badge-stable' : 'badge-historical'
              }`}>
                {state}
              </span>
            </div>
          )}

          <button
            onClick={handleAutoPlay}
            disabled={isAutoPlaying}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 hover:brightness-110 shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50"
          >
            {isAutoPlaying ? (
              <>
                <span className="w-3 h-3 rounded-full border-2 border-slate-950 border-t-transparent animate-spin" />
                <span>Simulating...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Auto-Play Demo (1-4)</span>
              </>
            )}
          </button>

        </div>

      </div>

      {/* 4 Stage Stepper Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {stagesMeta.map((s) => {
          const isActive = currentStage === s.num;
          const isPassed = currentStage > s.num;
          const isLoading = loadingStage === s.num;

          return (
            <button
              key={s.num}
              onClick={() => handleStepClick(s.num, s.num === 1 && currentStage === 0)}
              disabled={isAutoPlaying}
              className={`text-left p-3.5 rounded-xl border transition-all relative flex flex-col justify-between ${
                isActive
                  ? 'bg-gradient-to-b from-cyan-950/60 to-slate-900 border-cyan-400/80 shadow-md shadow-cyan-500/20 ring-1 ring-cyan-400/50'
                  : isPassed
                  ? 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700'
                  : 'bg-slate-900/20 border-slate-800/60 hover:border-slate-700 text-slate-300'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 font-mono text-xs">
                    <span className={`w-5 h-5 rounded flex items-center justify-center font-bold text-[11px] ${
                      isActive ? 'bg-cyan-400 text-slate-950' : isPassed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-300'
                    }`}>
                      {isPassed ? '✓' : s.num}
                    </span>
                    <span className="font-semibold text-slate-200">Stage {s.num}</span>
                  </div>
                  
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                    s.expectedState === 'Active' ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' : 'bg-cyan-950 text-cyan-400 border border-cyan-800/40'
                  }`}>
                    {s.expectedState}
                  </span>
                </div>

                <div className="text-[11px] font-mono text-cyan-300/80 mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {s.timeOffset}
                </div>

                <div className="text-xs text-slate-300 font-medium line-clamp-2 mb-2">
                  {s.desc}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span>{s.signalsCount} Signals</span>
                <span className="text-slate-500 truncate max-w-[110px]" title={s.sources}>{s.sources}</span>
              </div>

              {isLoading && (
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs rounded-xl flex items-center justify-center gap-2 text-cyan-400 text-xs font-mono">
                  <span className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                  <span>Ingesting...</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

    </div>
  );
}
