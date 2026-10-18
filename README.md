# Chronosignal

Temporal AI memory system that detects emerging trends from weak signals: small, scattered mentions that are insignificant alone but meaningful when accumulated over time.

## How it works

Signal ingestion, then 384-dim embeddings, then Qdrant similarity search, then cluster merge, then temporal scoring, then state adjudication, then the Trend Radar with an evidence-based explanation.

## Scoring

Every sub-metric is normalized to the range 0 to 1:

- Volume = min(1, total_signals / 10)
- Velocity = min(1, ratio / 5), where ratio = count_24h / max(1, count_7d - count_24h)
- Diversity = min(1, unique_sources / 4)
- Recency = exp(-0.05 * hours_since_last_signal)

Score = 100 * (0.20 * Volume + 0.35 * Velocity + 0.25 * Diversity + 0.20 * Recency)

## Trend states

Emerging, Active, Stable, Declining, Historical. A cluster is promoted to Active at a score of 60 or more (with at least 4 signals from 2 sources). A grace period protects clusters younger than 48 hours from demotion, and demotion from Active happens only below 55 (hysteresis).

## Features

- Trend Radar, Investigation view (score breakdown, transition log) and Memory Explorer
- Manual, multi-paste and CSV signal ingestion with duplicate detection
- Step-by-step demo: Stage 1 to 4 takes one trend from Emerging to Active (score 72.0)
- Qdrant Cloud vector memory (cosine, 384-dim), with a hash-embedding fallback

## Run locally (Windows)

```
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python run.py
```

Open http://localhost:8000

To use Qdrant Cloud, create a `.env` file with:

```
QDRANT_URL=your_cluster_url:6333
QDRANT_API_KEY=your_api_key
```

Without these, the app runs with an in-memory store.

## Tests

```
python -m pytest -q
```

## Stack

Python, FastAPI, Qdrant, NumPy, React, Vite
