const API_BASE = '/api';

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error(`Health check failed: ${res.statusText}`);
  return res.json();
}

export async function fetchClusters(state = null, search = null) {
  const params = new URLSearchParams();
  if (state) params.append('state', state);
  if (search) params.append('search', search);
  const url = `${API_BASE}/clusters${params.toString() ? '?' + params.toString() : ''}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch clusters: ${res.statusText}`);
  return res.json();
}

export async function fetchCluster(id) {
  const res = await fetch(`${API_BASE}/clusters/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch cluster ${id}: ${res.statusText}`);
  return res.json();
}

export async function fetchSignals(limit = 50, source = null) {
  const params = new URLSearchParams();
  params.append('limit', limit);
  if (source) params.append('source', source);
  const res = await fetch(`${API_BASE}/signals?${params.toString()}`);
  if (!res.ok) throw new Error(`Failed to fetch signals: ${res.statusText}`);
  return res.json();
}

export async function ingestSignal(signalData) {
  const res = await fetch(`${API_BASE}/signals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(signalData),
  });
  if (!res.ok) throw new Error(`Failed to ingest signal: ${res.statusText}`);
  return res.json();
}

export async function ingestBulkSignals(bulkData) {
  const res = await fetch(`${API_BASE}/signals/bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bulkData),
  });
  if (!res.ok) throw new Error(`Failed to ingest bulk signals: ${res.statusText}`);
  return res.json();
}

export async function uploadSignalsCSV(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/signals/upload-csv`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error(`Failed to upload CSV: ${res.statusText}`);
  return res.json();
}

export async function runDemoStep(stage, reset_first = false) {
  const res = await fetch(`${API_BASE}/demo/step`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stage, reset_first }),
  });
  if (!res.ok) throw new Error(`Failed to run demo step ${stage}: ${res.statusText}`);
  return res.json();
}

export async function resetMemory() {
  const res = await fetch(`${API_BASE}/demo/reset`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error(`Failed to reset memory: ${res.statusText}`);
  return res.json();
}
