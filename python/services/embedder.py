"""
Embedding service — singleton SentenceTransformer loaded once at startup.
Model: BAAI/bge-m3 (1024-dimensional multilingual embeddings)
"""
from __future__ import annotations

from sentence_transformers import SentenceTransformer

_embedder: SentenceTransformer | None = None
_loaded_model: str | None = None


def get_embedder(model: str = "BAAI/bge-m3") -> SentenceTransformer:
    global _embedder, _loaded_model
    if _embedder is None or _loaded_model != model:
        # Force CPU: MPS on macOS causes memory pressure and socket hangs
        _embedder = SentenceTransformer(model, device="cpu")
        _loaded_model = model
    return _embedder


def embed_batch(texts: list[str], model: str = "BAAI/bge-m3") -> list[list[float]]:
    embedder = get_embedder(model)
    vectors = embedder.encode(texts, normalize_embeddings=True, show_progress_bar=False)
    return [v.tolist() for v in vectors]


def is_loaded() -> bool:
    return _embedder is not None
