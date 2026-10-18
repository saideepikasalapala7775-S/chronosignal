"""Chronosignal Cluster Engine:
Manages signal ingestion, exact and near deduplication, Qdrant vector indexing,
hybrid clustering, centroid updates, and lifecycle management.
"""
from __future__ import annotations
import hashlib
import re
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional, Set, Tuple
import numpy as np
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, PointStruct, VectorParams

from backend.embedding import (
    EMBEDDING_DIM,
    compute_similarity,
    cosine_similarity,
    get_embedding,
    get_embedding_mode,
    get_similarity_threshold,
)
from backend.models import (
    Cluster,
    ClusterState,
    IngestResult,
    ScoreMetrics,
    Signal,
    SignalIngestRequest,
    StateTransition,
)
from backend.scoring import compute_metrics
from backend.state_machine import evaluate_cluster_state

QDRANT_COLLECTION = "chronosignal_vectors"


class ClusterEngine:
    def __init__(self, qdrant_url: Optional[str] = None, qdrant_api_key: Optional[str] = None):
        self.qdrant_status = "Disconnected"
        self._is_cloud = bool(qdrant_url)
        try:
            if qdrant_url:
                self.qdrant = QdrantClient(url=qdrant_url, api_key=qdrant_api_key or None)
                self._init_qdrant_collection()
                self.qdrant_status = f"Qdrant Cloud ({qdrant_url})"
            else:
                self.qdrant = QdrantClient(":memory:")
                self._init_qdrant_collection()
                self.qdrant_status = "Connected (In-Memory / Managed)"
        except Exception as e:
            self.qdrant = None
            self.qdrant_status = f"Failed ({str(e)})"

        self.clusters: Dict[str, Cluster] = {}
        self.signals: Dict[str, Signal] = {}
        self.exact_hashes: Set[str] = set()

    def _init_qdrant_collection(self) -> None:
        if not self.qdrant:
            return
        collections = [c.name for c in self.qdrant.get_collections().collections]
        if QDRANT_COLLECTION not in collections:
            self.qdrant.create_collection(
                collection_name=QDRANT_COLLECTION,
                vectors_config=VectorParams(size=EMBEDDING_DIM, distance=Distance.COSINE),
            )

    @staticmethod
    def compute_exact_hash(text: str, source: str) -> str:
        """Exact Deduplication: SHA-256 on lowercased, whitespace-stripped text + same source."""
        norm_text = re.sub(r"\s+", " ", text.strip().lower())
        norm_source = source.strip().lower()
        key = f"{norm_text}|{norm_source}".encode("utf-8")
        return hashlib.sha256(key).hexdigest()

    def _check_near_duplicate(
        self,
        new_vec: List[float],
        source: str,
        timestamp: datetime,
    ) -> bool:
        """Near-Deduplication: Cosine Similarity > 0.92 from SAME source within 1 hour."""
        norm_source = source.strip().lower()
        if timestamp.tzinfo is None:
            timestamp = timestamp.replace(tzinfo=timezone.utc)

        for sig in self.signals.values():
            if sig.source.strip().lower() != norm_source:
                continue
            sig_ts = sig.timestamp
            if sig_ts.tzinfo is None:
                sig_ts = sig_ts.replace(tzinfo=timezone.utc)

            # Within 1 hour (3600 seconds)
            time_diff = abs((timestamp - sig_ts).total_seconds())
            if time_diff <= 3600.0 and sig.embedding:
                cos_sim = cosine_similarity(new_vec, sig.embedding)
                if cos_sim > 0.92:
                    return True
        return False

    @staticmethod
    def extract_cluster_name(texts: List[str]) -> str:
        """Generates an intuitive topic name from top key phrases across cluster signals."""
        words: Dict[str, int] = {}
        stopwords = {
            "the", "a", "an", "and", "or", "in", "on", "at", "to", "for", "with",
            "is", "are", "was", "were", "this", "that", "it", "from", "by", "as",
            "of", "we", "new", "our", "using", "first", "paper", "release", "just",
            "been", "into", "their", "have", "has", "show", "shows", "about",
        }
        for t in texts:
            found = re.findall(r"\b[a-zA-Z\-]{3,}\b", t.lower())
            for w in found:
                if w not in stopwords:
                    words[w] = words.get(w, 0) + 1

        top_words = sorted(words.items(), key=lambda x: x[1], reverse=True)[:3]
        if top_words:
            return " ".join(w[0].capitalize() for w in top_words)
        return "Emerging Signal Cluster"

    def ingest_signal(
        self,
        req: SignalIngestRequest,
        now: Optional[datetime] = None,
    ) -> IngestResult:
        """Ingests a signal with deduplication, clustering, vector indexing, and lifecycle evaluation."""
        if now is None:
            now = datetime.now(timezone.utc)
        elif now.tzinfo is None:
            now = now.replace(tzinfo=timezone.utc)

        signal_ts = req.timestamp if req.timestamp is not None else now
        if signal_ts.tzinfo is None:
            signal_ts = signal_ts.replace(tzinfo=timezone.utc)

        # 1. Exact Deduplication check
        exact_hash = self.compute_exact_hash(req.text, req.source)
        if exact_hash in self.exact_hashes:
            return IngestResult(
                status="duplicate_exact",
                reason="Exact duplicate text and source dropped via SHA-256 filter.",
            )

        # Generate embedding vector
        vec = get_embedding(req.text)

        # 2. Near-Deduplication check (Cosine > 0.92 from SAME source within 1 hour)
        if self._check_near_duplicate(vec, req.source, signal_ts):
            return IngestResult(
                status="duplicate_near",
                reason="Near-duplicate spam dropped: Cosine > 0.92 from same source within 1 hour.",
            )

        # Create Signal object
        sig_id = str(uuid.uuid4())[:8]
        signal = Signal(
            id=sig_id,
            text=req.text.strip(),
            source=req.source.strip(),
            url=req.url,
            author=req.author,
            timestamp=signal_ts,
            content_hash=exact_hash,
            embedding=vec,
        )

        threshold = get_similarity_threshold()
        best_cluster: Optional[Cluster] = None
        best_similarity = -1.0

        # 3. Find matching cluster
        for cluster in self.clusters.values():
            if not cluster.signals:
                continue

            # Compare against centroid and individual signals in cluster
            candidate_sims = []
            if cluster.centroid:
                cluster_rep_text = " ".join([s.text for s in cluster.signals[-3:]])
                eff_c, _, _ = compute_similarity(
                    signal.text,
                    vec,
                    cluster_rep_text,
                    cluster.centroid,
                )
                candidate_sims.append(eff_c)

            for s in cluster.signals:
                if s.embedding:
                    eff_s, _, _ = compute_similarity(signal.text, vec, s.text, s.embedding)
                    candidate_sims.append(eff_s)

            if candidate_sims:
                best_cluster_sim = max(candidate_sims)
                if best_cluster_sim >= threshold and best_cluster_sim > best_similarity:
                    best_similarity = best_cluster_sim
                    best_cluster = cluster

        if best_cluster is not None:
            # Add to existing cluster
            signal.cluster_id = best_cluster.id
            best_cluster.signals.append(signal)
            best_cluster.signal_count = len(best_cluster.signals)

            # Update unique sources
            sources = sorted(list(set(s.source for s in best_cluster.signals)))
            best_cluster.unique_sources = sources

            # Update last_seen
            if signal_ts > best_cluster.last_seen:
                best_cluster.last_seen = signal_ts

            # Update centroid
            curr_c = np.array(best_cluster.centroid, dtype=np.float32)
            new_v = np.array(vec, dtype=np.float32)
            updated_c = curr_c + (new_v - curr_c) / float(len(best_cluster.signals))
            norm = np.linalg.norm(updated_c)
            if norm > 0:
                updated_c = updated_c / norm
            best_cluster.centroid = updated_c.tolist()

            # Refresh name and keywords
            all_texts = [s.text for s in best_cluster.signals]
            best_cluster.name = self.extract_cluster_name(all_texts)
            best_cluster.keywords = list(set(re.findall(r"\b[a-zA-Z\-]{4,}\b", " ".join(all_texts).lower())))[:8]

            # Re-evaluate metrics and state machine
            metrics = compute_metrics(best_cluster.signals, now=now)
            best_cluster.metrics = metrics
            evaluate_cluster_state(
                best_cluster,
                now=now,
                new_signal_added=True,
                metrics=metrics,
            )

            # Store records
            self.signals[sig_id] = signal
            self.exact_hashes.add(exact_hash)

            # Qdrant update
            if self.qdrant:
                try:
                    self.qdrant.upsert(
                        collection_name=QDRANT_COLLECTION,
                        points=[
                            PointStruct(
                                id=int(hashlib.md5(sig_id.encode()).hexdigest()[:8], 16),
                                vector=vec,
                                payload={
                                    "id": sig_id,
                                    "cluster_id": best_cluster.id,
                                    "source": signal.source,
                                    "text": signal.text,
                                    "timestamp": signal_ts.isoformat(),
                                },
                            )
                        ],
                    )
                except Exception:
                    pass

            return IngestResult(
                signal_id=sig_id,
                cluster_id=best_cluster.id,
                cluster_name=best_cluster.name,
                cluster_state=best_cluster.state.value,
                status="ingested",
                score=metrics.final_score,
            )

        else:
            # 4. Create new cluster
            cluster_id = f"cl-{uuid.uuid4().hex[:6]}"
            signal.cluster_id = cluster_id
            cluster_name = self.extract_cluster_name([signal.text])
            cluster_keywords = list(set(re.findall(r"\b[a-zA-Z\-]{4,}\b", signal.text.lower())))[:8]

            initial_metrics = compute_metrics([signal], now=now)
            first_transition = StateTransition(
                from_state=None,
                to_state=ClusterState.EMERGING.value,
                timestamp=signal_ts,
                reason="Cluster initialized from weak signal detection",
                score=initial_metrics.final_score,
            )

            new_cluster = Cluster(
                id=cluster_id,
                name=cluster_name,
                summary=signal.text[:140] + ("..." if len(signal.text) > 140 else ""),
                state=ClusterState.EMERGING,
                first_seen=signal_ts,
                last_seen=signal_ts,
                signals=[signal],
                signal_count=1,
                unique_sources=[signal.source],
                centroid=vec,
                keywords=cluster_keywords,
                metrics=initial_metrics,
                state_transitions=[first_transition],
            )

            # Run state machine on new cluster
            evaluate_cluster_state(
                new_cluster,
                now=now,
                new_signal_added=True,
                metrics=initial_metrics,
            )

            self.clusters[cluster_id] = new_cluster
            self.signals[sig_id] = signal
            self.exact_hashes.add(exact_hash)

            # Qdrant update
            if self.qdrant:
                try:
                    self.qdrant.upsert(
                        collection_name=QDRANT_COLLECTION,
                        points=[
                            PointStruct(
                                id=int(hashlib.md5(sig_id.encode()).hexdigest()[:8], 16),
                                vector=vec,
                                payload={
                                    "id": sig_id,
                                    "cluster_id": cluster_id,
                                    "source": signal.source,
                                    "text": signal.text,
                                    "timestamp": signal_ts.isoformat(),
                                },
                            )
                        ],
                    )
                except Exception:
                    pass

            return IngestResult(
                signal_id=sig_id,
                cluster_id=new_cluster.id,
                cluster_name=new_cluster.name,
                cluster_state=new_cluster.state.value,
                status="cluster_created",
                score=initial_metrics.final_score,
            )

    def advance_time(self, now: datetime) -> List[StateTransition]:
        """Advances clock and re-evaluates all cluster states, returning any triggered transitions."""
        if now.tzinfo is None:
            now = now.replace(tzinfo=timezone.utc)

        all_transitions: List[StateTransition] = []
        for cluster in self.clusters.values():
            metrics = compute_metrics(cluster.signals, now=now)
            cluster.metrics = metrics
            new_state, transition = evaluate_cluster_state(
                cluster,
                now=now,
                new_signal_added=False,
                metrics=metrics,
            )
            if transition:
                all_transitions.append(transition)
        return all_transitions

    def reset(self) -> Tuple[int, int]:
        """Clears all clusters, signals, and Qdrant vectors."""
        num_clusters = len(self.clusters)
        num_signals = len(self.signals)
        self.clusters.clear()
        self.signals.clear()
        self.exact_hashes.clear()
        if self.qdrant:
            try:
                self.qdrant.delete_collection(QDRANT_COLLECTION)
                self._init_qdrant_collection()
            except Exception:
                pass
        return num_clusters, num_signals
