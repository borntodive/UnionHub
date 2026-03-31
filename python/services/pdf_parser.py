"""
PDF parsing service.
Uses pdfplumber for text/table extraction and pymupdf for structural analysis.
"""
from __future__ import annotations

import re
from pathlib import Path
from typing import Optional

import pdfplumber
import fitz  # pymupdf

from models.schemas import ParsePdfResponse, Section, Table


# Section heading pattern — matches "1", "1.2", "1.2.3", "A.1.2", etc.
_SECTION_CODE_RE = re.compile(
    r"^([A-Z]?\d+(?:\.\d+){0,5})\s+(.+)$"
)

# Repeated header/footer tokens (page numbers, document codes, short lines)
_IGNORE_LINE_RE = re.compile(r"^\s*(\d{1,4}|Issue \d+|Rev \d+|OMA.*)\s*$", re.IGNORECASE)


def _detect_section_code(text: str) -> tuple[Optional[str], str]:
    """Return (code, clean_title) for a heading line, or (None, text) if not a section heading."""
    m = _SECTION_CODE_RE.match(text.strip())
    if m:
        return m.group(1), m.group(2).strip()
    return None, text.strip()


def _is_repeated_noise(line: str) -> bool:
    return bool(_IGNORE_LINE_RE.match(line)) and len(line.strip()) < 60


def parse_pdf(file_path: str, document_id: str) -> ParsePdfResponse:
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"PDF not found: {file_path}")

    sections: list[Section] = []
    tables: list[Table] = []

    # --- Use pymupdf to detect headings by font size ---
    mupdf_doc = fitz.open(str(path))
    page_count = len(mupdf_doc)

    # Build a font-size → is_heading heuristic from the first 10 pages
    font_sizes: list[float] = []
    for page_idx in range(min(10, page_count)):
        page = mupdf_doc[page_idx]
        for block in page.get_text("dict", flags=fitz.TEXT_PRESERVE_WHITESPACE)["blocks"]:
            if block["type"] != 0:
                continue
            for line in block["lines"]:
                for span in line["spans"]:
                    font_sizes.append(span["size"])

    median_size = sorted(font_sizes)[len(font_sizes) // 2] if font_sizes else 11.0
    heading_threshold = median_size * 1.15  # 15% larger than median = likely heading

    mupdf_doc.close()

    # --- Use pdfplumber for structured extraction ---
    current_section: Optional[dict] = None
    current_text_lines: list[str] = []
    current_section_code: Optional[str] = None
    current_page_start: int = 1

    with pdfplumber.open(str(path)) as pdf:
        all_pages = pdf.pages

        for page_idx, page in enumerate(all_pages):
            page_num = page_idx + 1

            # Extract tables from this page first
            page_tables = page.extract_tables()
            table_bboxes = [t.bbox for t in page.find_tables()] if page_tables else []

            for t_idx, raw_table in enumerate(page_tables):
                if not raw_table or len(raw_table) < 2:
                    continue
                headers = [str(cell or "").strip() for cell in raw_table[0]]
                rows = [
                    [str(cell or "").strip() for cell in row]
                    for row in raw_table[1:]
                ]
                tables.append(Table(
                    page=page_num,
                    section_code=current_section_code,
                    section_title=current_section["title"] if current_section else None,
                    headers=headers,
                    rows=rows,
                ))

            # Extract text (excluding table bounding boxes)
            words = page.extract_words(keep_blank_chars=False)
            raw_text = page.extract_text(x_tolerance=3, y_tolerance=3) or ""

            for line in raw_text.splitlines():
                line_stripped = line.strip()
                if not line_stripped or _is_repeated_noise(line_stripped):
                    continue

                code, title = _detect_section_code(line_stripped)

                if code:
                    # Save previous section
                    if current_section is not None:
                        sections.append(Section(
                            title=current_section["title"],
                            code=current_section["code"],
                            page_start=current_page_start,
                            page_end=page_num,
                            text="\n".join(current_text_lines).strip(),
                        ))
                    current_section = {"code": code, "title": title}
                    current_section_code = code
                    current_page_start = page_num
                    current_text_lines = []
                else:
                    current_text_lines.append(line_stripped)

        # Flush last section
        if current_section is not None:
            sections.append(Section(
                title=current_section["title"],
                code=current_section["code"],
                page_start=current_page_start,
                page_end=page_count,
                text="\n".join(current_text_lines).strip(),
            ))
        elif current_text_lines:
            # Document with no section headings — treat entire doc as one section
            sections.append(Section(
                title="Document",
                code=None,
                page_start=1,
                page_end=page_count,
                text="\n".join(current_text_lines).strip(),
            ))

    return ParsePdfResponse(
        document_id=document_id,
        page_count=page_count,
        sections=sections,
        tables=tables,
    )
