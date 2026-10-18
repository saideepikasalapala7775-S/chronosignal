"""Chronosignal Embedding Engine:
Supports MiniLM (sentence-transformers) with automatic, deterministic 384-dimensional Hash Fallback
and Hybrid Similarity scoring (0.7 * Cosine + 0.3 * Jaccard).
"""
from __future__ import annotations
import hashlib
import re
from typing import List, Set, Tuple
import numpy as np

MINILM_COSINE_THRESHOLD = 0.62
HASH_FALLBACK_HYBRID_THRESHOLD = 0.22
EMBEDDING_DIM = 384

_model = None
_mode = "Hash-Fallback"

try:
    from sentence_transformers import SentenceTransformer  # type: ignore
    try:
        _model = SentenceTransformer("all-MiniLM-L6-v2")
        _mode = "MiniLM"
    except Exception:
        _model = None
        _mode = "Hash-Fallback"
except ImportError:
    _model = None
    _mode = "Hash-Fallback"


def get_embedding_mode() -> str:
    return _mode


def tokenize(text: str) -> Set[str]:
    """Tokenize lowercased text into set of alphanumeric words."""
    if not text:
        return set()
    return set(re.findall(r"\b[a-zA-Z0-9_\-]{2,}\b", text.lower()))


def compute_jaccard_similarity(text1: str, text2: str) -> float:
    """Calculates Jaccard token overlap between two strings."""
    tokens1 = tokenize(text1)
    tokens2 = tokenize(text2)
    if not tokens1 or not tokens2:
        return 0.0
    intersection = tokens1.intersection(tokens2)
    union = tokens1.union(tokens2)
    return len(intersection) / float(len(union))


def hash_fallback_embedding(text: str, dim: int = EMBEDDING_DIM) -> List[float]:
    """Generates an exact 384-dimensional feature-hashed unit vector for text."""
    v = np.zeros(dim, dtype=np.float32)
    words = re.findall(r"\b[a-zA-Z0-9_\-]+\b", text.lower())
    if not words:
        return v.tolist()

    for word in words:
        # Full word hash
        h = int(hashlib.md5(word.encode("utf-8")).hexdigest(), 16)
        idx = h % dim
        sign = 1.0 if ((h >> 16) & 1) == 0 else -1.0
        v[idx] += sign

        # Subword n-grams for character-level morphological similarity
        for i in range(len(word) - 2):
            sub = word[i : i + 3]
            hs = int(hashlib.sha256(sub.encode("utf-8")).hexdigest(), 16)
            idx_s = hs % dim
            sign_s = 1.0 if ((hs >> 16) & 1) == 0 else -1.0
            v[idx_s] += 0.5 * sign_s

    norm = float(np.linalg.norm(v))
    if norm > 0.0:
        v = v / norm
    return v.tolist()


def get_embedding(text: str) -> List[float]:
    """Generate 384-dim embedding vector using active mode."""
    if _mode == "MiniLM" and _model is not None:
        try:
            emb = _model.encode(text, normalize_embeddings=True)
            return emb.tolist()
        except Exception:
            return hash_fallback_embedding(text)
    return hash_fallback_embedding(text)


def cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
    """Compute cosine similarity between two vectors."""
    a = np.array(vec1, dtype=np.float32)
    b = np.array(vec2, dtype=np.float32)
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    dot = float(np.dot(a, b) / (norm_a * norm_b))
    return max(-1.0, min(1.0, dot))


def compute_similarity(
    text1: str,
    vec1: List[float],
    text2: str,
    vec2: List[float],
) -> Tuple[float, float, float]:
    """Computes similarity based on active mode.
    Returns: (effective_similarity, cosine_similarity, jaccard_overlap)
    """
    cos_sim = cosine_similarity(vec1, vec2)
    jacc_sim = compute_jaccard_similarity(text1, text2)

    if _mode == "MiniLM":
        effective = cos_sim
    else:
        # Strict requirement: Combined_Sim = (0.7 * Cosine_Similarity) + (0.3 * Jaccard_Token_Overlap)
        effective = (0.7 * cos_sim) + (0.3 * jacc_sim)

    return effective, cos_sim, jacc_sim


def get_similarity_threshold() -> float:
    """Return similarity threshold for active embedding mode."""
    if _mode == "MiniLM":
        return MINILM_COSINE_THRESHOLD
    return HASH_FALLBACK_HYBRID_THRESHOLD
