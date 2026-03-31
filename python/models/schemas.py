from __future__ import annotations
from typing import Any, Optional
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# /parse/pdf
# ---------------------------------------------------------------------------

class ParsePdfRequest(BaseModel):
    document_id: str
    file_path: str


class Section(BaseModel):
    title: str
    code: Optional[str] = None
    page_start: int
    page_end: int
    text: str


class Table(BaseModel):
    page: int
    section_code: Optional[str] = None
    section_title: Optional[str] = None
    headers: list[str]
    rows: list[list[str]]
    caption: Optional[str] = None


class ParsePdfResponse(BaseModel):
    document_id: str
    page_count: int
    sections: list[Section]
    tables: list[Table]


# ---------------------------------------------------------------------------
# /chunk/build
# ---------------------------------------------------------------------------

class ChunkBuildRequest(BaseModel):
    document_id: str
    sections: list[Section]
    tables: list[Table]
    chunk_size: int = Field(default=512, ge=64, le=2048)
    chunk_overlap: int = Field(default=64, ge=0, le=256)


class ChunkItem(BaseModel):
    section_code: Optional[str] = None
    section_title: Optional[str] = None
    page_start: Optional[int] = None
    page_end: Optional[int] = None
    chunk_type: str  # text | table | header | list
    chunk_index: int
    text_content: str
    table_json: Optional[dict[str, Any]] = None
    token_count: int


class ChunkBuildResponse(BaseModel):
    document_id: str
    chunks: list[ChunkItem]


# ---------------------------------------------------------------------------
# /embed/batch
# ---------------------------------------------------------------------------

class EmbedBatchRequest(BaseModel):
    texts: list[str]
    model: str = "BAAI/bge-m3"


class EmbedBatchResponse(BaseModel):
    embeddings: list[list[float]]
    model: str
    dimensions: int


# ---------------------------------------------------------------------------
# /rerank
# ---------------------------------------------------------------------------

class RerankRequest(BaseModel):
    query: str
    passages: list[str]
    top_k: int = Field(default=10, ge=1, le=50)


class RerankResult(BaseModel):
    index: int
    score: float
    text: str


class RerankResponse(BaseModel):
    results: list[RerankResult]


# ---------------------------------------------------------------------------
# /health
# ---------------------------------------------------------------------------

class HealthResponse(BaseModel):
    status: str
    models: dict[str, bool]
