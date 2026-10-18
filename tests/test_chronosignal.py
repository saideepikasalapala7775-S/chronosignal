"""Chronosignal Unit and Integration Test Suite:
Tests mathematical scoring formula, demo stage metrics (assert score >= 60.0 at Stage 4),
state transitions, grace period rule, hysteresis gap, revival logic,
hash embedding dimension (384-dim), hybrid similarity, and exact/near deduplication.
"""
from __future__ import annotations
import math
from datetime import datetime, timedelta, timezone
import pytest

from backend.cluster_engine import ClusterEngine
from backend.demo_data import get_demo_stages
from backend.embedding import (
    EMBEDDING_DIM,
    compute_jaccard_similarity,
    compute_similarity,
    cosine_similarity,
    get_embedding_mode,
    hash_fallback_embedding,
)
from backend.models import (
    Cluster,
    ClusterState,
    Signal,
    SignalIngestRequest,
    StateTransition,
)
from backend.scoring import compute_metrics
from backend.state_machine import evaluate_cluster_state


def test_hash_fallback_embedding_dimension():
    """Verify that Hash Fallback Embedding dimension is strictly 384-dim."""
    emb = hash_fallback_embedding("Liquid neural network time-series dynamics")
    assert len(emb) == 384
    assert isinstance(emb, list)
    assert all(isinstance(x, float) for x in emb)
    # Unit length check
    norm = math.sqrt(sum(x * x for x in emb))
    assert pytest.approx(norm, rel=1e-3) == 1.0


def test_hybrid_similarity_formula():
    """Verify hybrid similarity calculation: 0.7 * Cosine + 0.3 * Jaccard."""
    text1 = "liquid neural networks edge deployment"
    text2 = "liquid neural networks continuous learning edge"
    vec1 = hash_fallback_embedding(text1)
    vec2 = hash_fallback_embedding(text2)

    cos_sim = cosine_similarity(vec1, vec2)
    jacc_sim = compute_jaccard_similarity(text1, text2)
    expected_hybrid = (0.7 * cos_sim) + (0.3 * jacc_sim)

    eff_sim, c, j = compute_similarity(text1, vec1, text2, vec2)
    assert pytest.approx(cos_sim, rel=1e-4) == c
    assert pytest.approx(jacc_sim, rel=1e-4) == j
    if get_embedding_mode() == "Hash-Fallback":
        assert pytest.approx(expected_hybrid, rel=1e-4) == eff_sim
        assert eff_sim >= 0.22


def test_mathematical_scoring_and_demo_stage4():
    """Strictly tests mathematical scoring formula and verifies Stage 4 score >= 60.0 (≈ 70.0)."""
    now = datetime(2026, 10, 18, 12, 0, 0, tzinfo=timezone.utc)
    stages = get_demo_stages(now)

    all_signals = []
    engine = ClusterEngine()

    # Ingest Stage 1, 2, 3, 4 sequentially
    for stage_num in [1, 2, 3, 4]:
        for req in stages[stage_num]:
            res = engine.ingest_signal(req, now=now)
            assert res.status in ["cluster_created", "ingested"]

    assert len(engine.clusters) == 1
    cluster = list(engine.clusters.values())[0]

    # Verify counts
    assert cluster.signal_count == 12
    metrics = cluster.metrics
    assert metrics is not None

    # Expected sub-metrics verification:
    # Volume: 12 signals -> min(1.0, 12 / 10.0) = 1.0
    assert metrics.norm_volume == 1.0

    # Signals in 24h: Stage 3 (3) + Stage 4 (3) = 6
    assert metrics.count_24h == 6

    # Signals in 7d: all 12 are within 168 hours
    assert metrics.count_7d == 12

    # Velocity ratio: 6 / max(1, 12 - 6) = 6 / 6 = 1.0
    # Norm_Velocity: min(1.0, 1.0 / 5.0) = 0.20
    assert pytest.approx(metrics.norm_velocity, rel=1e-2) == 0.20

    # Diversity: unique sources = arXiv, HackerNews, Reddit, Discord, GitHub, X/Twitter = 6 sources
    # min(1.0, 6 / 4.0) = 1.0
    assert metrics.norm_diversity == 1.0

    # Recency: last signal at now -> hours = 0.0 -> exp(0) = 1.0
    assert metrics.norm_recency >= 0.90

    # Final Score test assertion: MUST PASS score >= 60.0 (≈ 70.0 - 72.0)
    assert metrics.final_score >= 60.0
    assert metrics.final_score >= 69.0

    # Cluster MUST be Active at Stage 4
    assert cluster.state == ClusterState.ACTIVE

    # Verify State Transition Log exists and records transition to Active
    assert len(cluster.state_transitions) >= 1
    active_transitions = [t for t in cluster.state_transitions if t.to_state == "Active"]
    assert len(active_transitions) >= 1
    assert active_transitions[0].from_state == "Emerging"
    assert "Score reached" in active_transitions[0].reason or ">= 60.0" in active_transitions[0].reason


def test_grace_period_rule():
    """Bug 1 Fix: If Cluster Age < 48 hours, DO NOT demote to Declining regardless of score."""
    now = datetime(2026, 10, 18, 12, 0, 0, tzinfo=timezone.utc)
    first_seen = now - timedelta(hours=24)  # 24h old, within 48h grace period

    cluster = Cluster(
        id="test-grace",
        name="Early Signal",
        summary="A weak signal with low volume",
        state=ClusterState.EMERGING,
        first_seen=first_seen,
        last_seen=first_seen,
        signals=[
            Signal(
                id="sig1",
                text="Weak whisper mention",
                source="arXiv",
                timestamp=first_seen,
                content_hash="hash1",
            )
        ],
        signal_count=1,
        unique_sources=["arXiv"],
    )

    # Even if score is low (< 40.0) and inactive for 24h, age is < 48h
    new_state, transition = evaluate_cluster_state(cluster, now=now, new_signal_added=False)
    assert new_state == ClusterState.EMERGING
    assert cluster.state == ClusterState.EMERGING
    assert transition is None


def test_active_to_stable_hysteresis_gap():
    """Active -> Stable ONLY if score drops below 55.0 (between 40.0 and 54.9)."""
    now = datetime(2026, 10, 18, 12, 0, 0, tzinfo=timezone.utc)
    cluster = Cluster(
        id="test-hysteresis",
        name="Hysteresis Cluster",
        summary="Cluster testing 55.0 threshold",
        state=ClusterState.ACTIVE,
        first_seen=now - timedelta(hours=30),
        last_seen=now - timedelta(hours=1),
        signals=[],
        signal_count=4,
        unique_sources=["arXiv", "Reddit"],
    )

    # Simulated metrics with score 57.0 (>= 55.0) -> MUST STAY ACTIVE
    from backend.models import ScoreMetrics
    metrics_high = ScoreMetrics(
        total_signals=5,
        count_24h=2,
        count_7d=5,
        unique_sources=2,
        hours_since_last_signal=1.0,
        norm_volume=0.5,
        norm_velocity=0.5,
        norm_diversity=0.5,
        norm_recency=0.95,
        final_score=57.0,
    )
    new_state, _ = evaluate_cluster_state(cluster, now=now, new_signal_added=False, metrics=metrics_high)
    assert new_state == ClusterState.ACTIVE

    # Simulated metrics with score 52.0 (< 55.0) -> Demotes to STABLE
    metrics_low = ScoreMetrics(
        total_signals=5,
        count_24h=1,
        count_7d=5,
        unique_sources=2,
        hours_since_last_signal=2.0,
        norm_volume=0.5,
        norm_velocity=0.3,
        norm_diversity=0.5,
        norm_recency=0.90,
        final_score=52.0,
    )
    new_state, transition = evaluate_cluster_state(cluster, now=now, new_signal_added=False, metrics=metrics_low)
    assert new_state == ClusterState.STABLE
    assert transition is not None
    assert transition.from_state == "Active"
    assert transition.to_state == "Stable"


def test_declining_to_historical_and_revival():
    """Declining -> Historical (no signals in 14 days) and Historical -> Revival (Emerging)."""
    now = datetime(2026, 10, 18, 12, 0, 0, tzinfo=timezone.utc)
    old_ts = now - timedelta(days=15)  # 15 days ago > 14 days

    cluster = Cluster(
        id="test-historical",
        name="Forgotten Trend",
        summary="Old trend dormant for 15 days",
        state=ClusterState.DECLINING,
        first_seen=old_ts - timedelta(days=2),
        last_seen=old_ts,
        signals=[
            Signal(
                id="sig_old",
                text="Ancient optical computing breakthrough",
                source="arXiv",
                timestamp=old_ts,
                content_hash="h_old",
            )
        ],
        signal_count=1,
        unique_sources=["arXiv"],
    )

    # Inactive for 15 days -> Transitions to Historical
    new_state, transition = evaluate_cluster_state(cluster, now=now, new_signal_added=False)
    assert new_state == ClusterState.HISTORICAL
    assert transition is not None
    assert transition.to_state == "Historical"

    # New signal arrives -> Revives to Emerging
    new_state_revived, rev_trans = evaluate_cluster_state(cluster, now=now, new_signal_added=True)
    assert new_state_revived == ClusterState.EMERGING
    assert rev_trans is not None
    assert rev_trans.from_state == "Historical"
    assert rev_trans.to_state == "Emerging"


def test_exact_deduplication():
    """Exact Deduplication: SHA-256 on lowercased, whitespace-stripped text + same source."""
    engine = ClusterEngine()
    req1 = SignalIngestRequest(
        text="Liquid neural networks for edge computing   ",
        source="  arXiv ",
        timestamp=datetime.now(timezone.utc),
    )
    res1 = engine.ingest_signal(req1)
    assert res1.status == "cluster_created"

    # Ingest same text with different spacing and casing from same source
    req2 = SignalIngestRequest(
        text="   LIQUID  neural   networks for   edge computing",
        source="arXiv",
        timestamp=datetime.now(timezone.utc),
    )
    res2 = engine.ingest_signal(req2)
    assert res2.status == "duplicate_exact"
    assert len(engine.signals) == 1


def test_near_deduplication():
    """Near-Deduplication: Cosine Similarity > 0.92 from SAME source within 1 hour -> Drop as duplicate spam."""
    now = datetime.now(timezone.utc)
    engine = ClusterEngine()

    req1 = SignalIngestRequest(
        text="Continuous depth liquid time constant networks edge deployment telemetry",
        source="Discord",
        timestamp=now - timedelta(minutes=10),
    )
    res1 = engine.ingest_signal(req1)
    assert res1.status == "cluster_created"

    # Almost identical spam post from SAME source within 10 minutes
    req2 = SignalIngestRequest(
        text="Continuous depth liquid time constant networks edge deployment telemetry!",
        source="Discord",
        timestamp=now - timedelta(minutes=5),
    )
    res2 = engine.ingest_signal(req2)
    assert res2.status in ["duplicate_exact", "duplicate_near"]
    assert len(engine.signals) == 1


def test_api_health_and_demo_playback():
    """Tests the full API flow: health check -> demo stages 1 to 4 -> cluster validation."""
    from fastapi.testclient import TestClient
    from backend.main import app

    client = TestClient(app)

    # 1. Health check endpoint test
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    # Accepts "Qdrant Cloud (...)" or "Connected (In-Memory / Managed)"
    assert "Qdrant" in data["qdrant_status"] or "Connected" in data["qdrant_status"]
    assert data["embedding_mode"] in ["MiniLM", "Hash-Fallback"]
    assert data["vector_dimension"] == 384

    # 2. Reset memory
    res_reset = client.post("/api/demo/reset")
    assert res_reset.status_code == 200
    assert res_reset.json()["status"] == "success"

    # 3. Play demo stages 1 to 4
    for stage_idx in [1, 2, 3, 4]:
        res_stage = client.post("/api/demo/step", json={"stage": stage_idx, "reset_first": False})
        assert res_stage.status_code == 200
        stage_data = res_stage.json()
        assert stage_data["stage"] == stage_idx

    # 4. Query clusters via API
    res_clusters = client.get("/api/clusters")
    assert res_clusters.status_code == 200
    clusters = res_clusters.json()
    assert len(clusters) >= 1

    # Find the liquid neural networks cluster
    active_cluster = next((c for c in clusters if c["state"] == "Active"), None)
    assert active_cluster is not None
    assert active_cluster["signal_count"] >= 12
    assert active_cluster["metrics"]["final_score"] >= 60.0
    assert len(active_cluster["state_transitions"]) >= 1


def test_api_manual_ingest_and_exact_dedup():
    """Tests manual signal ingestion and exact duplicate rejection via API."""
    from fastapi.testclient import TestClient
    from backend.main import app

    client = TestClient(app)
    client.post("/api/demo/reset")

    # Ingest signal
    res = client.post(
        "/api/signals",
        json={
            "text": "Neuromorphic liquid sensors testing underway",
            "source": "arXiv",
            "url": "https://arxiv.org/abs/2603.999",
            "author": "tester",
        },
    )
    assert res.status_code == 200
    assert res.json()["status"] in ["cluster_created", "ingested"]

    # Ingest identical signal from same source -> duplicate_exact
    res_dup = client.post(
        "/api/signals",
        json={
            "text": "  neuromorphic liquid SENSORS testing underway  ",
            "source": "arXiv",
        },
    )
    assert res_dup.status_code == 200
    assert res_dup.json()["status"] == "duplicate_exact"

