"""
Chunking service.
Splits sections into overlapping text chunks and emits each table as a standalone chunk.
"""
from __future__ import annotations

import json
from typing import Optional

from models.schemas import ChunkBuildResponse, ChunkItem, Section, Table


def _estimate_tokens(text: str) -> int:
    """Fast approximation: words * 1.3."""
    return int(len(text.split()) * 1.3)


def _split_text(text: str, chunk_size: int, overlap: int) -> list[str]:
    """Split text into overlapping chunks at sentence boundaries where possible."""
    sentences = [s.strip() for s in text.replace("\n", " ").split(". ") if s.strip()]
    chunks: list[str] = []
    current_tokens = 0
    current_sentences: list[str] = []

    for sentence in sentences:
        tok = _estimate_tokens(sentence)
        if current_tokens + tok > chunk_size and current_sentences:
            chunks.append(". ".join(current_sentences) + ".")
            # Keep overlap sentences
            overlap_tokens = 0
            overlap_sentences: list[str] = []
            for s in reversed(current_sentences):
                t = _estimate_tokens(s)
                if overlap_tokens + t <= overlap:
                    overlap_sentences.insert(0, s)
                    overlap_tokens += t
                else:
                    break
            current_sentences = overlap_sentences
            current_tokens = overlap_tokens

        current_sentences.append(sentence)
        current_tokens += tok

    if current_sentences:
        chunks.append(". ".join(current_sentences) + ".")

    return chunks or [text]


def build_chunks(
    document_id: str,
    sections: list[Section],
    tables: list[Table],
    chunk_size: int = 512,
    chunk_overlap: int = 64,
) -> ChunkBuildResponse:
    chunks: list[ChunkItem] = []
    idx = 0

    for section in sections:
        text = section.text.strip()
        if not text:
            continue

        tokens = _estimate_tokens(text)

        if tokens <= chunk_size:
            # Short section — one chunk
            chunk_type = "header" if tokens < 30 else "text"
            chunks.append(ChunkItem(
                section_code=section.code,
                section_title=section.title,
                page_start=section.page_start,
                page_end=section.page_end,
                chunk_type=chunk_type,
                chunk_index=idx,
                text_content=text,
                token_count=tokens,
            ))
            idx += 1
        else:
            # Long section — sliding window
            parts = _split_text(text, chunk_size, chunk_overlap)
            for part in parts:
                chunks.append(ChunkItem(
                    section_code=section.code,
                    section_title=section.title,
                    page_start=section.page_start,
                    page_end=section.page_end,
                    chunk_type="text",
                    chunk_index=idx,
                    text_content=part,
                    token_count=_estimate_tokens(part),
                ))
                idx += 1

    # Each table is a separate chunk
    for table in tables:
        table_data = {"headers": table.headers, "rows": table.rows}
        text_repr = f"Table: {', '.join(table.headers)}"
        if table.caption:
            text_repr = f"{table.caption}\n{text_repr}"

        chunks.append(ChunkItem(
            section_code=table.section_code,
            section_title=table.section_title,
            page_start=table.page,
            page_end=table.page,
            chunk_type="table",
            chunk_index=idx,
            text_content=text_repr,
            table_json=table_data,
            token_count=_estimate_tokens(text_repr),
        ))
        idx += 1

    return ChunkBuildResponse(document_id=document_id, chunks=chunks)
