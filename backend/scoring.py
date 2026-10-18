"""Chronosignal Scoring Engine:
Implements strict mathematical scoring formula with min-max normalization.
"""
from __future__ import annotations
import math
from datetime import datetime, timezone
from typing import List, Optional
from backend.models import ScoreMetrics, Signal


def compute_metrics(
    signals: List[Signal],
    now: Optional[datetime] = None,
) -> ScoreMetrics:
    """Calculates strictly normalized sub-metrics and final score for a cluster.
    
    Sub-metrics min-max normalized to [0.0, 1.0]:
    - Norm_Volume = min(1.0, Total_Signals / 10.0)
    - Norm_Velocity = min(1.0, Velocity_Ratio / 5.0)
      where Velocity_Ratio = Count_24h / max(1, Count_7d - Count_24h)
    - Norm_Diversity = min(1.0, Unique_Sources / 4.0)
    - Norm_Recency = exp(-0.05 * Hours_Since_Last_Signal)
    
    FINAL SCORE = 100 * (0.20 * Norm_Volume + 0.35 * Norm_Velocity + 0.25 * Norm_Diversity + 0.20 * Norm_Recency)
    """
    if now is None:
        now = datetime.now(timezone.utc)
    elif now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)

    total_signals = len(signals)
    if total_signals == 0:
        return ScoreMetrics(
            total_signals=0,
            count_24h=0,
            count_7d=0,
            unique_sources=0,
            hours_since_last_signal=999.0,
            norm_volume=0.0,
            norm_velocity=0.0,
            norm_diversity=0.0,
            norm_recency=0.0,
            final_score=0.0,
        )

    # Normalize signal timestamps to UTC
    timestamps = []
    sources = set()
    for s in signals:
        ts = s.timestamp
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)
        timestamps.append(ts)
        if s.source:
            sources.add(s.source.strip().lower())

    # Count signals in 24 hours and 7 days relative to `now`
    count_24h = sum(1 for ts in timestamps if 0 <= (now - ts).total_seconds() <= 24 * 3600)
    count_7d = sum(1 for ts in timestamps if 0 <= (now - ts).total_seconds() <= 7 * 24 * 3600)

    # Velocity ratio and normalized velocity
    denom = max(1, count_7d - count_24h)
    velocity_ratio = count_24h / float(denom)
    norm_velocity = max(0.0, min(1.0, velocity_ratio / 5.0))

    # Normalized volume
    norm_volume = max(0.0, min(1.0, total_signals / 10.0))

    # Normalized diversity
    unique_sources = len(sources)
    norm_diversity = max(0.0, min(1.0, unique_sources / 4.0))

    # Normalized recency
    latest_ts = max(timestamps)
    hours_diff = (now - latest_ts).total_seconds() / 3600.0
    hours_since_last_signal = max(0.0, hours_diff)
    norm_recency = max(0.0, min(1.0, math.exp(-0.05 * hours_since_last_signal)))

    # Final score strictly weighted: 0.20, 0.35, 0.25, 0.20
    final_score = 100.0 * (
        0.20 * norm_volume
        + 0.35 * norm_velocity
        + 0.25 * norm_diversity
        + 0.20 * norm_recency
    )

    # Round final score to 2 decimal places for clean display and consistency
    final_score = round(final_score, 2)

    return ScoreMetrics(
        total_signals=total_signals,
        count_24h=count_24h,
        count_7d=count_7d,
        unique_sources=unique_sources,
        hours_since_last_signal=round(hours_since_last_signal, 2),
        norm_volume=round(norm_volume, 4),
        norm_velocity=round(norm_velocity, 4),
        norm_diversity=round(norm_diversity, 4),
        norm_recency=round(norm_recency, 4),
        final_score=final_score,
    )
