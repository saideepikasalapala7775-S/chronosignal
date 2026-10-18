# Chronosignal ⚡
> **Temporal AI Memory System for Detecting Emerging Trends from Weak Signals**

Chronosignal is a temporal AI intelligence memory system that identifies early, high-momentum technological and market trends before they reach mainstream consensus. By accumulating weak, scattered signals (arXiv preprints, GitHub releases, HackerNews threads, Discord messages, Reddit posts, X/Twitter discussions) over time, Chronosignal calculates compound velocity, source diversity, volume, and recency to promote emerging topics into active trends.

---

## 📐 Mathematical Scoring Formula & Normalization

All sub-metrics are strictly min-max normalized to `[0.0, 1.0]`:

$$\text{Norm\_Volume} = \min\left(1.0, \frac{\text{Total\_Signals}}{10.0}\right)$$

$$\text{Norm\_Velocity} = \min\left(1.0, \frac{\text{Velocity\_Ratio}}{5.0}\right) \quad \text{where} \quad \text{Velocity\_Ratio} = \frac{\text{Count\_24h}}{\max(1, \text{Count\_7d} - \text{Count\_24h})}$$

$$\text{Norm\_Diversity} = \min\left(1.0, \frac{\text{Unique\_Sources}}{4.0}\right)$$

$$\text{Norm\_Recency} = \exp(-0.05 \times \text{Hours\_Since\_Last\_Signal})$$

$$\mathbf{FINAL\ SCORE} = 100 \times \Big(0.20 \times \text{Norm\_Volume} + 0.35 \times \text{Norm\_Velocity} + 0.25 \times \text{Norm\_Diversity} + 0.20 \times \text{Norm\_Recency}\Big)$$

### Corrected Demo Metrics & Forward Spacing
- **Stage 1**: Base = -6.9 days (-165.6h, -163.6h, -161.6h)
- **Stage 2**: Base = -3.8 days (-91.2h, -89.2h, -87.2h)
- **Stage 3**: Base = -18 hours (-18h, -16h, -14h)
- **Stage 4**: Base = -2 hours (-2h, -1h, now) $\rightarrow$ Total 12 signals, Count_24h = 6
- **Breakdown at Stage 4**:
  - $\text{Volume} = 1.0 \times 0.20 = 0.20$
  - $\text{Velocity} = 0.20 \times 0.35 = 0.07$
  - $\text{Diversity} = 1.0 \times 0.25 = 0.25$
  - $\text{Recency} \approx 0.90 \text{ to } 1.0 \times 0.20 = 0.18 \text{ to } 0.20$
  - $\mathbf{\text{Final Score}} \approx \mathbf{70.0 - 72.0}$ ($\ge 60.0 \rightarrow$ Promotes to **Active**)

---

## 🔄 Finite State Machine & Audit Transitions

```
[Emerging] ──(Score >= 60, Count >= 4, Sources >= 2)──> [Active]
     │                                                    │
     │ (< 48h Grace Period)                               │ (Score < 55.0 Hysteresis)
     ▼                                                    ▼
 [Declining] <──(Age >= 48h & (Score < 40 or Inactive))── [Stable]
     │                                                    │
     │ (Inactive >= 14 Days)                              │ (Score >= 60 & Count_24h > 0)
     ▼                                                    ▼
[Historical] ──(New Matching Signal Revival)─────────> [Active]
```

### Transition Rules
1. **Grace Period Rule**: If Cluster Age (`now - first_seen`) $< 48$ hours, cluster CANNOT demote to Declining regardless of score. It remains at least `Emerging`.
2. **Emerging $\rightarrow$ Active**: `Score >= 60.0 AND Signal_Count >= 4 AND Unique_Sources >= 2`.
3. **Active $\rightarrow$ Stable**: Demotes ONLY if score drops below `55.0` (between 40.0 and 54.9). Score between 55.0 and 59.9 stays Active (Hysteresis gap).
4. **Stable $\rightarrow$ Active**: `Score >= 60.0 AND Count_24h > 0`.
5. **Active / Stable / Emerging $\rightarrow$ Declining**: `(Age >= 48h) AND (Score < 40.0 OR Inactive for >= 48h)`.
6. **Declining $\rightarrow$ Active / Emerging**: If a new signal arrives, promote directly to `Active` if `Score >= 60.0`, else `Emerging`.
7. **Declining $\rightarrow$ Historical**: No signals in past 14 days ($336$ hours).
8. **Historical $\rightarrow$ Revival**: Matching incoming signal reactivates cluster into `Emerging`.
9. **Audit Log**: Every transition is appended to `state_transitions` with `from`, `to`, `timestamp`, `reason`, and `score`.

---

## 🧬 Hash Embedding & Hybrid Similarity Clustering

- **Vector Dimension**: Exactly **384-dim** unit vector.
- **Hybrid Similarity Scoring (Hash Mode)**:
  $$\text{Combined\_Sim} = (0.7 \times \text{Cosine\_Similarity}) + (0.3 \times \text{Jaccard\_Token\_Overlap})$$
- **Similarity Thresholds**:
  - `MiniLM Mode`: Cosine Threshold = **0.62**
  - `Hash Fallback Mode`: Hybrid Threshold = **0.22**

---

## 🛡️ Deduplication Engine

1. **Exact Deduplication**: SHA-256 hash computed on `lowercase(whitespace_stripped(text)) + lowercase(source)`. Exact matches are dropped immediately.
2. **Near-Deduplication**: Cosine Similarity $> 0.92$ from the **SAME source** within **1 hour** is dropped as duplicate spam.

---

## 🚀 Quickstart & Verification

### 1. Run Test Suite
```bash
python -m pytest tests/test_chronosignal.py -v
```

### 2. Start Application
```bash
python run.py
```
Open **[http://localhost:8000](http://localhost:8000)** in your browser.

---

## 🖥️ UI Features & Views

1. **Emerging Trend Radar**:
   - 2D Polar spatial radar visualizer with sweeping beam and concentric zone boundaries (Active Core, Emerging, Stable, Declining, Historical).
   - Pulsating weak signal nodes with real-time hover inspection.
2. **Investigation Page**:
   - Sub-metric mathematical decomposition cards with progress meters and formulas.
   - Chronological state transition audit log with from/to badges and reasons.
   - Cited signals dossier with IDs, platform badges, timestamps, authors, and external URLs.
3. **Memory Explorer**:
   - Temporal signals ledger searchable by keyword, filterable by state and source.
4. **Ingestion & Demo Control**:
   - Step-by-step judge demo controller (Stages 1 to 4) with Auto-Play sequence.
   - Manual text, Multi-paste, and CSV upload with deduplication reporting.
   - Reset Memory button with safety confirmation modal.
