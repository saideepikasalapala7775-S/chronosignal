"""Chronosignal FastAPI Application:
Exposes REST endpoints for trend intelligence, temporal scoring,
signal ingestion, CSV uploads, demo step playback, and health diagnostics.
"""
from __future__ import annotations
import csv
import io
import os
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.cluster_engine import ClusterEngine
from backend.demo_data import get_ambient_background_signals, get_demo_stages
from backend.embedding import EMBEDDING_DIM, get_embedding_mode
from backend.models import (
    BulkSignalIngestRequest,
    Cluster,
    ClusterState,
    DemoStepRequest,
    HealthResponse,
    IngestResult,
    ResetResponse,
    Signal,
    SignalIngestRequest,
)

from dotenv import load_dotenv

# Load .env from project root (works in dev and when run via run.py)
load_dotenv()

app = FastAPI(
    title="Chronosignal Temporal AI Memory API",
    description="Detects emerging trends from weak signals with strict mathematical scoring, vector clustering, and state machine transitions.",
    version="2.0.0",
)

# CORS middleware for development and production web clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

engine = ClusterEngine(
    qdrant_url=os.getenv("QDRANT_URL") or None,
    qdrant_api_key=os.getenv("QDRANT_API_KEY") or None,
)
simulated_now: Optional[datetime] = None


def get_current_now() -> datetime:
    global simulated_now
    if simulated_now is not None:
        return simulated_now
    return datetime.now(timezone.utc)


@app.get("/api/health", response_model=HealthResponse)
def health_check() -> HealthResponse:
    """Returns Qdrant connection status, active embedding mode (MiniLM vs Hash-Fallback), and memory counts."""
    now = get_current_now()
    return HealthResponse(
        status="healthy",
        qdrant_status=engine.qdrant_status,
        embedding_mode=get_embedding_mode(),
        vector_dimension=EMBEDDING_DIM,
        cluster_count=len(engine.clusters),
        signal_count=len(engine.signals),
        active_now=now,
    )


@app.get("/api/clusters", response_model=List[Cluster])
def list_clusters(
    state: Optional[str] = Query(None, description="Filter by state (Emerging, Active, Stable, Declining, Historical)"),
    search: Optional[str] = Query(None, description="Search keyword in cluster name or keywords"),
) -> List[Cluster]:
    """Lists all clusters ordered by final score descending."""
    now = get_current_now()
    # Advance time to keep metrics refreshed
    engine.advance_time(now)

    results = list(engine.clusters.values())

    if state:
        results = [c for c in results if c.state.value.lower() == state.lower()]

    if search:
        q = search.lower()
        results = [
            c for c in results
            if q in c.name.lower() or any(q in kw.lower() for kw in c.keywords) or any(q in s.text.lower() for s in c.signals)
        ]

    # Sort by final score descending
    results.sort(key=lambda c: (c.metrics.final_score if c.metrics else 0.0), reverse=True)
    return results


@app.get("/api/clusters/{cluster_id}", response_model=Cluster)
def get_cluster(cluster_id: str) -> Cluster:
    """Gets detailed cluster object with investigation log and cited signals."""
    if cluster_id not in engine.clusters:
        raise HTTPException(status_code=404, detail="Cluster not found")
    now = get_current_now()
    cluster = engine.clusters[cluster_id]
    engine.advance_time(now)
    return cluster


@app.get("/api/signals", response_model=List[Signal])
def list_signals(
    limit: int = Query(50, ge=1, le=500),
    source: Optional[str] = Query(None),
) -> List[Signal]:
    """Lists recent ingested signals across all clusters."""
    signals = list(engine.signals.values())
    if source:
        signals = [s for s in signals if s.source.lower() == source.lower()]
    signals.sort(key=lambda s: s.timestamp, reverse=True)
    return signals[:limit]


@app.post("/api/signals", response_model=IngestResult)
def ingest_signal(req: SignalIngestRequest) -> IngestResult:
    """Ingest a single weak signal with SHA-256 exact & cosine near deduplication."""
    now = get_current_now()
    result = engine.ingest_signal(req, now=now)
    return result


@app.post("/api/signals/bulk", response_model=List[IngestResult])
def ingest_bulk_signals(req: BulkSignalIngestRequest) -> List[IngestResult]:
    """Ingest multiple signals in batch with deduplication reporting."""
    global simulated_now
    if req.simulate_now:
        simulated_now = req.simulate_now

    now = get_current_now()
    results = []
    for s_req in req.signals:
        res = engine.ingest_signal(s_req, now=now)
        results.append(res)
    return results


@app.post("/api/signals/upload-csv", response_model=List[IngestResult])
async def upload_signals_csv(file: UploadFile = File(...)) -> List[IngestResult]:
    """Upload CSV file containing signals (columns: text/content, source, url, author, timestamp)."""
    now = get_current_now()
    contents = await file.read()
    try:
        decoded = contents.decode("utf-8")
    except UnicodeDecodeError:
        decoded = contents.decode("latin-1")

    reader = csv.DictReader(io.StringIO(decoded))
    results = []

    for row in reader:
        # Resolve text column
        text = row.get("text") or row.get("content") or row.get("signal") or row.get("message")
        if not text:
            continue

        source = row.get("source") or "CSV_Import"
        url = row.get("url") or row.get("link")
        author = row.get("author") or row.get("user")

        ts_str = row.get("timestamp") or row.get("date") or row.get("time")
        ts = None
        if ts_str:
            try:
                ts = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
            except Exception:
                ts = None

        s_req = SignalIngestRequest(
            text=text,
            source=source,
            url=url,
            author=author,
            timestamp=ts or now,
        )
        res = engine.ingest_signal(s_req, now=now)
        results.append(res)

    return results


@app.post("/api/demo/step", response_model=dict)
def run_demo_step(req: DemoStepRequest) -> dict:
    """Executes a specific demo stage with mathematically spaced forward timestamps."""
    global simulated_now
    now = datetime.now(timezone.utc)
    simulated_now = now

    if req.reset_first:
        engine.reset()

    if req.stage not in [1, 2, 3, 4]:
        raise HTTPException(status_code=400, detail="Demo stage must be 1, 2, 3, or 4")

    # Ingest ambient clusters if empty
    if len(engine.clusters) == 0:
        for amb in get_ambient_background_signals(now):
            engine.ingest_signal(amb, now=now)

    stages = get_demo_stages(now)
    stage_signals = stages[req.stage]
    results = []
    for s_req in stage_signals:
        res = engine.ingest_signal(s_req, now=now)
        results.append(res.model_dump())

    # Get primary cluster metrics
    primary_cluster = None
    for c in engine.clusters.values():
        if "Liquid" in c.name or any("liquid" in kw.lower() for kw in c.keywords):
            primary_cluster = c
            break

    if not primary_cluster and engine.clusters:
        primary_cluster = list(engine.clusters.values())[0]

    return {
        "stage": req.stage,
        "signals_ingested": len(results),
        "results": results,
        "primary_cluster": primary_cluster.model_dump() if primary_cluster else None,
        "embedding_mode": get_embedding_mode(),
        "total_clusters": len(engine.clusters),
        "total_signals": len(engine.signals),
    }


@app.post("/api/demo/reset", response_model=ResetResponse)
def reset_memory() -> ResetResponse:
    """Reset Memory / Clear All API button. Purges all signals, clusters, and vector indices."""
    global simulated_now
    simulated_now = None
    num_c, num_s = engine.reset()
    return ResetResponse(
        status="success",
        message="Chronosignal temporal memory fully purged and vector index re-initialized.",
        cleared_clusters=num_c,
        cleared_signals=num_s,
    )


# Serve built frontend static files if frontend/dist exists
frontend_dist = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "dist")
if os.path.exists(frontend_dist):
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="static")
