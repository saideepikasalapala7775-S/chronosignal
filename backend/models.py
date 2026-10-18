"""Chronosignal Pydantic models, Enums, and Transition Log schemas.
"""
from __future__ import annotations
from datetime import datetime
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict


class ClusterState(str, Enum):
    EMERGING = "Emerging"
    ACTIVE = "Active"
    STABLE = "Stable"
    DECLINING = "Declining"
    HISTORICAL = "Historical"


class StateTransition(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    from_state: Optional[str] = Field(None, alias="from")
    to_state: str = Field(..., alias="to")
    timestamp: datetime
    reason: str
    score: Optional[float] = None


class Signal(BaseModel):
    id: str
    text: str
    source: str
    url: Optional[str] = None
    author: Optional[str] = None
    timestamp: datetime
    content_hash: str
    cluster_id: Optional[str] = None
    embedding: Optional[List[float]] = None


class ScoreMetrics(BaseModel):
    total_signals: int
    count_24h: int
    count_7d: int
    unique_sources: int
    hours_since_last_signal: float
    norm_volume: float
    norm_velocity: float
    norm_diversity: float
    norm_recency: float
    final_score: float


class Cluster(BaseModel):
    id: str
    name: str
    summary: str
    state: ClusterState
    first_seen: datetime
    last_seen: datetime
    signals: List[Signal] = Field(default_factory=list)
    signal_count: int = 0
    unique_sources: List[str] = Field(default_factory=list)
    centroid: Optional[List[float]] = None
    keywords: List[str] = Field(default_factory=list)
    metrics: Optional[ScoreMetrics] = None
    state_transitions: List[StateTransition] = Field(default_factory=list)


class SignalIngestRequest(BaseModel):
    text: str
    source: str
    url: Optional[str] = None
    author: Optional[str] = None
    timestamp: Optional[datetime] = None  # None indicates "current time" or simulated "now"


class BulkSignalIngestRequest(BaseModel):
    signals: List[SignalIngestRequest]
    simulate_now: Optional[datetime] = None


class IngestResult(BaseModel):
    signal_id: Optional[str] = None
    cluster_id: Optional[str] = None
    cluster_name: Optional[str] = None
    cluster_state: Optional[str] = None
    status: str  # "ingested", "cluster_created", "duplicate_exact", "duplicate_near"
    reason: Optional[str] = None
    score: Optional[float] = None


class DemoStepRequest(BaseModel):
    stage: int
    reset_first: bool = False


class HealthResponse(BaseModel):
    status: str
    qdrant_status: str
    embedding_mode: str
    vector_dimension: int
    cluster_count: int
    signal_count: int
    active_now: datetime


class ResetResponse(BaseModel):
    status: str
    message: str
    cleared_clusters: int
    cleared_signals: int
