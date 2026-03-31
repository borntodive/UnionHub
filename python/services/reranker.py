"""
Reranking service — CrossEncoder loaded once at startup.
Model: BAAI/bge-reranker-v2-m3 via sentence-transformers CrossEncoder.
"""
from __future__ import annotations

from sentence_transformers import CrossEncoder

_reranker: CrossEncoder | None = None


def get_reranker() -> CrossEncoder:
    global _reranker
    if _reranker is None:
        _reranker = CrossEncoder("BAAI/bge-reranker-v2-m3", max_length=512)
    return _reranker


def rerank(query: str, passages: list[str], top_k: int = 10) -> list[dict]:
    """
    Returns a list of dicts sorted by descending score:
    [{"index": int, "score": float, "text": str}, ...]
    """
    reranker = get_reranker()
    pairs = [[query, p] for p in passages]
    scores: list[float] = reranker.predict(pairs).tolist()

    indexed = [
        {"index": i, "score": float(scores[i]), "text": passages[i]}
        for i in range(len(passages))
    ]
    indexed.sort(key=lambda x: x["score"], reverse=True)
    return indexed[:top_k]


def is_loaded() -> bool:
    return _reranker is not None
