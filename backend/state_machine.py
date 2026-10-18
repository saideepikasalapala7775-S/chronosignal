"""Chronosignal State Machine Engine:
Implements deterministic cluster lifecycle transitions, grace period rule,
hysteresis gap, and transition audit logging.
"""
from __future__ import annotations
from datetime import datetime, timezone
from typing import Optional, Tuple
from backend.models import Cluster, ClusterState, ScoreMetrics, StateTransition
from backend.scoring import compute_metrics


def evaluate_cluster_state(
    cluster: Cluster,
    now: Optional[datetime] = None,
    new_signal_added: bool = False,
    metrics: Optional[ScoreMetrics] = None,
) -> Tuple[ClusterState, Optional[StateTransition]]:
    """Evaluates cluster state transitions based on strict rules and audit logging.
    
    States: Emerging, Active, Stable, Declining, Historical.
    
    Rules:
    - GRACE PERIOD RULE (Fixes Bug 1): If Cluster Age (now - first_seen) < 48 hours,
      DO NOT demote to Declining regardless of score. Must remain at least 'Emerging'.
    - Emerging -> Active: Score >= 60.0 AND Signal_Count >= 4 AND Unique_Sources >= 2
    - Active -> Stable: Score drops between 40.0 and 54.9 (Hysteresis gap: Demote ONLY if < 55.0)
    - Stable -> Active: Score >= 60.0 AND new signals in past 24 hours
    - Active / Stable / Emerging -> Declining: (Age >= 48h) AND (Score < 40.0 OR No new signals in past 48 hours)
    - Declining -> Emerging / Active (Fixes Bug 2): If a new signal arrives in a Declining cluster,
      re-evaluate Score and promote to Active if Score >= 60.0, else transition to Emerging.
    - Declining -> Historical: No signals in past 14 days
    - Historical -> Revival (Emerging): If a new signal matches an existing Historical cluster vector,
      reactivate cluster to Emerging.
    """
    if now is None:
        now = datetime.now(timezone.utc)
    elif now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)

    first_seen = cluster.first_seen
    if first_seen.tzinfo is None:
        first_seen = first_seen.replace(tzinfo=timezone.utc)

    cluster_age_hours = max(0.0, (now - first_seen).total_seconds() / 3600.0)

    if metrics is None:
        metrics = compute_metrics(cluster.signals, now=now)
    cluster.metrics = metrics

    score = metrics.final_score
    signal_count = metrics.total_signals
    unique_sources = metrics.unique_sources
    count_24h = metrics.count_24h
    hours_since_last_signal = metrics.hours_since_last_signal

    current_state = cluster.state
    new_state = current_state
    transition_reason = ""

    # Rule: Historical -> Revival (Emerging)
    if current_state == ClusterState.HISTORICAL:
        if new_signal_added:
            new_state = ClusterState.EMERGING
            transition_reason = f"Historical cluster revived by incoming signal (score {score:.1f})"
            # Check if immediately qualified for Active upon revival
            if score >= 60.0 and signal_count >= 4 and unique_sources >= 2:
                new_state = ClusterState.ACTIVE
                transition_reason = f"Historical cluster revived directly to Active (score {score:.1f} >= 60.0)"
        else:
            return current_state, None

    # Rule: Declining -> Historical or Revival to Emerging / Active
    elif current_state == ClusterState.DECLINING:
        if new_signal_added:
            # Fixes Bug 2: promote to Active if Score >= 60.0, else transition to Emerging
            if score >= 60.0 and signal_count >= 4 and unique_sources >= 2:
                new_state = ClusterState.ACTIVE
                transition_reason = f"Declining cluster revived to Active on new signal (score {score:.1f} >= 60.0)"
            else:
                new_state = ClusterState.EMERGING
                transition_reason = f"Declining cluster revived to Emerging on new signal (score {score:.1f})"
        else:
            # Declining -> Historical: No signals in past 14 days (14 * 24 = 336 hours)
            if hours_since_last_signal >= 14 * 24:
                new_state = ClusterState.HISTORICAL
                transition_reason = f"No new signals in {hours_since_last_signal:.1f} hours (>= 14 days threshold)"

    # Rule: Active / Stable / Emerging evaluations
    else:
        # Check demotion to Declining first (Active / Stable / Emerging -> Declining)
        # MUST RESPECT GRACE PERIOD RULE:
        # "If Cluster Age (now - first_seen) < 48 hours, DO NOT demote to Declining regardless of score."
        can_demote_to_declining = cluster_age_hours >= 48.0
        should_decline = (score < 40.0) or (hours_since_last_signal >= 48.0)

        if can_demote_to_declining and should_decline:
            new_state = ClusterState.DECLINING
            if score < 40.0 and hours_since_last_signal >= 48.0:
                transition_reason = f"Demoted to Declining: score {score:.1f} < 40.0 and inactive for {hours_since_last_signal:.1f}h (age {cluster_age_hours:.1f}h >= 48h)"
            elif score < 40.0:
                transition_reason = f"Demoted to Declining: score {score:.1f} < 40.0 (age {cluster_age_hours:.1f}h >= 48h)"
            else:
                transition_reason = f"Demoted to Declining: inactive for {hours_since_last_signal:.1f}h >= 48h"
        else:
            # Cluster is not declining. Apply state-specific rules:
            if current_state == ClusterState.EMERGING:
                # Emerging -> Active: Score >= 60.0 AND Signal_Count >= 4 AND Unique_Sources >= 2
                if score >= 60.0 and signal_count >= 4 and unique_sources >= 2:
                    new_state = ClusterState.ACTIVE
                    transition_reason = f"Score reached {score:.1f} >= 60.0 with {signal_count} signals across {unique_sources} sources"

            elif current_state == ClusterState.ACTIVE:
                # Active -> Stable: Score drops between 40.0 and 54.9 (Hysteresis gap: Demote ONLY if < 55.0)
                # Note: if score is >= 55.0, cluster stays Active!
                if score < 55.0:
                    new_state = ClusterState.STABLE
                    transition_reason = f"Score dropped to {score:.1f} (< 55.0 hysteresis boundary)"

            elif current_state == ClusterState.STABLE:
                # Stable -> Active: Score >= 60.0 AND new signals in past 24 hours
                if score >= 60.0 and count_24h > 0:
                    new_state = ClusterState.ACTIVE
                    transition_reason = f"Score recovered to {score:.1f} >= 60.0 with {count_24h} signals in past 24h"

    transition = None
    if new_state != current_state:
        transition = StateTransition(
            from_state=current_state.value,
            to_state=new_state.value,
            timestamp=now,
            reason=transition_reason,
            score=score,
        )
        cluster.state = new_state
        cluster.state_transitions.append(transition)

    return new_state, transition
