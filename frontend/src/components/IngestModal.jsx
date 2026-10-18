import React, { useState } from 'react';
import { 
  X, 
  PlusCircle, 
  FileText, 
  Upload, 
  Clipboard, 
  CheckCircle2, 
  AlertTriangle,
  Clock
} from 'lucide-react';
import { ingestSignal, ingestBulkSignals, uploadSignalsCSV } from '../api';

export default function IngestModal({ isOpen, onClose, onIngested }) {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState('manual');
  
  // Manual Tab Form State
  const [text, setText] = useState('');
  const [source, setSource] = useState('arXiv');
  const [customSource, setCustomSource] = useState('');
  const [url, setUrl] = useState('');
  const [author, setAuthor] = useState('');
  const [timeOffsetHours, setTimeOffsetHours] = useState('0');

  // Multi-paste State
  const [multiPasteText, setMultiPasteText] = useState('');

  // CSV State
  const [csvFile, setCsvFile] = useState(null);

  // Status message
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;

    try {
      setLoading(true);
      setFeedback(null);
      const effectiveSource = source === 'Custom' ? customSource : source;

      // Compute timestamp offset if specified
      let ts = new Date();
      const offset = parseFloat(timeOffsetHours);
      if (!isNaN(offset) && offset > 0) {
        ts = new Date(Date.now() - offset * 3600 * 1000);
      }

      const res = await ingestSignal({
        text: text.trim(),
        source: effectiveSource || 'Manual',
        url: url.trim() || null,
        author: author.trim() || null,
        timestamp: ts.toISOString(),
      });

      setFeedback(res);
      if (res.status === 'ingested' || res.status === 'cluster_created') {
        setText('');
        if (onIngested) onIngested(res);
      }
    } catch (err) {
      setFeedback({ status: 'error', reason: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleMultiPasteSubmit = async () => {
    if (!multiPasteText.trim()) return;

    try {
      setLoading(true);
      setFeedback(null);
      const lines = multiPasteText.split('\n').map(l => l.trim()).filter(l => l.length > 5);
      
      const signals = lines.map(line => ({
        text: line,
        source: 'MultiPaste',
        timestamp: new Date().toISOString()
      }));

      const results = await ingestBulkSignals({ signals });
      setFeedback({
        status: 'bulk_complete',
        results: results,
        reason: `Processed ${results.length} lines: ${results.filter(r => r.status.includes('cluster') || r.status === 'ingested').length} ingested, ${results.filter(r => r.status.includes('duplicate')).length} duplicate dropped.`
      });
      setMultiPasteText('');
      if (onIngested) onIngested();
    } catch (err) {
      setFeedback({ status: 'error', reason: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCsvUpload = async () => {
    if (!csvFile) return;

    try {
      setLoading(true);
      setFeedback(null);
      const results = await uploadSignalsCSV(csvFile);
      setFeedback({
        status: 'csv_complete',
        results: results,
        reason: `Processed CSV (${results.length} rows): ${results.filter(r => r.status.includes('cluster') || r.status === 'ingested').length} signals ingested, ${results.filter(r => r.status.includes('duplicate')).length} duplicates eliminated.`
      });
      setCsvFile(null);
      if (onIngested) onIngested();
    } catch (err) {
      setFeedback({ status: 'error', reason: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg glass-panel p-6 border-cyan-500/30 relative">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <PlusCircle className="w-5 h-5 text-cyan-400" />
          <h3 className="text-base font-bold text-slate-100">
            Ingest Signal into Temporal Memory
          </h3>
        </div>

        {/* Ingest Tabs */}
        <div className="flex border-b border-slate-800 mb-4 text-xs font-semibold">
          <button
            onClick={() => { setActiveTab('manual'); setFeedback(null); }}
            className={`flex items-center gap-1.5 pb-2.5 px-3 border-b-2 transition-all ${
              activeTab === 'manual'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Manual Text</span>
          </button>

          <button
            onClick={() => { setActiveTab('multipaste'); setFeedback(null); }}
            className={`flex items-center gap-1.5 pb-2.5 px-3 border-b-2 transition-all ${
              activeTab === 'multipaste'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clipboard className="w-3.5 h-3.5" />
            <span>Multi-Paste</span>
          </button>

          <button
            onClick={() => { setActiveTab('csv'); setFeedback(null); }}
            className={`flex items-center gap-1.5 pb-2.5 px-3 border-b-2 transition-all ${
              activeTab === 'csv'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>CSV Upload</span>
          </button>
        </div>

        {/* Feedback Alert Banner */}
        {feedback && (
          <div className={`p-3 rounded-lg mb-4 text-xs font-mono flex items-start gap-2 ${
            feedback.status === 'cluster_created' || feedback.status === 'ingested' || feedback.status === 'csv_complete' || feedback.status === 'bulk_complete'
              ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
              : feedback.status.includes('duplicate')
              ? 'bg-amber-950/60 border border-amber-800 text-amber-300'
              : 'bg-rose-950/60 border border-rose-800 text-rose-300'
          }`}>
            {feedback.status.includes('duplicate') ? (
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
            )}
            <div>
              <strong className="uppercase">{feedback.status}:</strong> {feedback.reason || (
                feedback.status === 'cluster_created' ? `Created new cluster "${feedback.cluster_name}" (Score: ${feedback.score?.toFixed(1)})` :
                feedback.status === 'ingested' ? `Corroborated with cluster "${feedback.cluster_name}" (New score: ${feedback.score?.toFixed(1)})` :
                'Signal ingested successfully.'
              )}
            </div>
          </div>
        )}

        {/* Manual Ingestion Form */}
        {activeTab === 'manual' && (
          <form onSubmit={handleManualSubmit} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Signal Text / Mention *</label>
              <textarea
                rows={3}
                required
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="e.g., Breakthrough paper on continuous neural ODEs showing 10x parameter efficiency on edge sensors..."
                className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-sans"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Source Platform</label>
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="w-full p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="arXiv">arXiv</option>
                  <option value="HackerNews">HackerNews</option>
                  <option value="Reddit">Reddit</option>
                  <option value="GitHub">GitHub</option>
                  <option value="Discord">Discord</option>
                  <option value="X/Twitter">X/Twitter</option>
                  <option value="Custom">Custom...</option>
                </select>
              </div>

              {source === 'Custom' ? (
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Custom Source Name</label>
                  <input
                    type="text"
                    value={customSource}
                    onChange={(e) => setCustomSource(e.target.value)}
                    placeholder="e.g. Substack"
                    className="w-full p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Time Offset</label>
                  <select
                    value={timeOffsetHours}
                    onChange={(e) => setTimeOffsetHours(e.target.value)}
                    className="w-full p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="0">Just now (0h)</option>
                    <option value="2">2 hours ago</option>
                    <option value="18">18 hours ago</option>
                    <option value="91.2">3.8 days ago (-91h)</option>
                    <option value="165.6">6.9 days ago (-165h)</option>
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">URL (Optional)</label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Author / Handle</label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="@researcher"
                  className="w-full p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary px-4 py-2 rounded-lg font-semibold flex items-center gap-1.5"
              >
                {loading ? 'Processing...' : 'Ingest Signal'}
              </button>
            </div>
          </form>
        )}

        {/* Multi-paste Tab */}
        {activeTab === 'multipaste' && (
          <div className="space-y-3.5 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Paste Multiple Signals (One per line)
              </label>
              <textarea
                rows={6}
                value={multiPasteText}
                onChange={(e) => setMultiPasteText(e.target.value)}
                placeholder="Signal 1: Mention of photonic compute benchmark...&#10;Signal 2: Discussion of optical interconnect transceiver...&#10;Signal 3: Startup raises funding for silicon photonics..."
                className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-sans"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleMultiPasteSubmit}
                disabled={loading || !multiPasteText.trim()}
                className="btn-primary px-4 py-2 rounded-lg font-semibold flex items-center gap-1.5"
              >
                {loading ? 'Ingesting...' : 'Ingest Batch'}
              </button>
            </div>
          </div>
        )}

        {/* CSV Upload Tab */}
        {activeTab === 'csv' && (
          <div className="space-y-4 text-xs">
            <div className="p-6 border-2 border-dashed border-slate-800 hover:border-cyan-500/50 rounded-xl text-center cursor-pointer transition-colors">
              <Upload className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
              <p className="text-slate-300 font-semibold mb-1">
                {csvFile ? csvFile.name : 'Select or drop signals CSV file'}
              </p>
              <p className="text-slate-500 text-[11px]">
                Supported columns: <code>text</code>, <code>source</code>, <code>url</code>, <code>author</code>, <code>timestamp</code>
              </p>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setCsvFile(e.target.files[0])}
                className="mt-3 block w-full text-xs text-slate-400 file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-cyan-950 file:text-cyan-300 hover:file:bg-cyan-900"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCsvUpload}
                disabled={loading || !csvFile}
                className="btn-primary px-4 py-2 rounded-lg font-semibold flex items-center gap-1.5"
              >
                {loading ? 'Uploading...' : 'Process CSV'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
