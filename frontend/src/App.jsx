import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import DemoController from './components/DemoController';
import RadarView from './components/RadarView';
import InvestigationView from './components/InvestigationView';
import MemoryExplorer from './components/MemoryExplorer';
import IngestModal from './components/IngestModal';
import ResetConfirmModal from './components/ResetConfirmModal';
import { fetchHealth, fetchClusters, fetchSignals } from './api';
import { Sparkles, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [health, setHealth] = useState(null);
  const [clusters, setClusters] = useState([]);
  const [signals, setSignals] = useState([]);
  const [activeTab, setActiveTab] = useState('radar');
  const [selectedCluster, setSelectedCluster] = useState(null);
  const [currentStage, setCurrentStage] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [isIngestOpen, setIsIngestOpen] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const loadData = async () => {
    try {
      const [hData, cData, sData] = await Promise.all([
        fetchHealth(),
        fetchClusters(),
        fetchSignals(100),
      ]);
      setHealth(hData);
      setClusters(cData);
      setSignals(sData);

      // Keep selected cluster in sync
      if (selectedCluster) {
        const updated = cData.find(c => c.id === selectedCluster.id);
        if (updated) setSelectedCluster(updated);
      } else if (cData.length > 0) {
        setSelectedCluster(cData[0]);
      }
    } catch (err) {
      console.error("Error loading Chronosignal data:", err);
    }
  };

  useEffect(() => {
    loadData();
    // Auto-refresh health & clusters every 6 seconds
    const interval = setInterval(loadData, 6000);
    return () => clearInterval(interval);
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleStageExecuted = (res) => {
    loadData();
    if (res?.primary_cluster) {
      setSelectedCluster(res.primary_cluster);
      if (res.primary_cluster.state === 'Active') {
        showToast(`🎉 Trend Transition: "${res.primary_cluster.name}" reached score ${res.primary_cluster.metrics?.final_score} and transitioned to ACTIVE!`);
      } else {
        showToast(`Stage ${res.stage} ingested: ${res.signals_ingested} signals added to memory.`);
      }
    }
  };

  const handleSelectCluster = (cluster) => {
    setSelectedCluster(cluster);
    setActiveTab('investigation');
  };

  const primaryCluster = clusters.find(c => c.name.toLowerCase().includes('liquid')) || clusters[0];

  return (
    <div className="min-h-screen flex flex-col">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-cyan-950 to-slate-900 border border-cyan-400 p-3.5 rounded-xl shadow-2xl flex items-center gap-3 text-xs text-slate-100 font-medium animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Navigation Header */}
      <Header
        health={health}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenIngest={() => setIsIngestOpen(true)}
        onOpenReset={() => setIsResetOpen(true)}
        selectedCluster={selectedCluster}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6">
        
        {/* Interactive Judge Demo Controller */}
        <DemoController
          currentStage={currentStage}
          setCurrentStage={setCurrentStage}
          onStageExecuted={handleStageExecuted}
          primaryCluster={primaryCluster}
          isAutoPlaying={isAutoPlaying}
          setIsAutoPlaying={setIsAutoPlaying}
        />

        {/* View Switching */}
        {activeTab === 'radar' && (
          <RadarView
            clusters={clusters}
            onSelectCluster={handleSelectCluster}
            activeNow={health?.active_now}
          />
        )}

        {activeTab === 'investigation' && (
          <InvestigationView
            cluster={selectedCluster}
            onBack={() => setActiveTab('radar')}
          />
        )}

        {activeTab === 'explorer' && (
          <MemoryExplorer
            clusters={clusters}
            signals={signals}
            onSelectCluster={handleSelectCluster}
          />
        )}

      </main>

      {/* Modals */}
      <IngestModal
        isOpen={isIngestOpen}
        onClose={() => setIsIngestOpen(false)}
        onIngested={() => { loadData(); showToast("Signal ingested into memory."); }}
      />

      <ResetConfirmModal
        isOpen={isResetOpen}
        onClose={() => setIsResetOpen(false)}
        onResetComplete={() => {
          setCurrentStage(0);
          setSelectedCluster(null);
          loadData();
          showToast("Memory successfully reset.");
        }}
      />

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-4 px-4 text-center text-[11px] text-slate-500 font-mono">
        CHRONOSIGNAL TEMPORAL AI MEMORY • QDRANT VECTOR CLUSTERING • 384-DIM HASH HYBRID SIMILARITY
      </footer>

    </div>
  );
}
