# AI Audit — UnionHub Monorepo

> Phase 0 deliverable for Plan B: Integration & Unified AI Service.
> Produced by scanning the codebase on 2026-05-07.
> **Decisions signed off 2026-05-07 — see §3 for resolved items.**

---

## 1. Touchpoint Inventory

### 1.1 `api/src/ai/ai.service.ts` — Current `AiService`

| Field                | Value                                                                                    |
| -------------------- | ---------------------------------------------------------------------------------------- |
| Location             | `api/src/ai/ai.service.ts`                                                               |
| Function             | Entry-point for all backend AI calls: rewrite, translate, generic generate, health-check |
| Current model        | OpenRouter → `OPENROUTER_TRANSLATION_MODEL` (default `google/gemma-3-27b-it:free`)       |
| Current SDK          | `openai` npm package with baseURL override to `https://openrouter.ai/api/v1`             |
| Input                | String (plain text or HTML)                                                              |
| Output               | String (generated text)                                                                  |
| Frequency            | Per-request (admin-triggered)                                                            |
| Quality requirements | Medium-strict; HTML structure must be preserved in translation                           |
| Caller               | `documents.service.ts`, `issues.service.ts`                                              |
| Data sensitivity     | Union-confidential (document content, member data)                                       |

**Known issues:**

- Gemma 3 does not support the `system` role via OpenAI API → workaround inlines system prompt into user message (brittle).
- No retry logic. Free-tier OpenRouter often returns 429/503 mid-stream.
- No response caching. Same document translated repeatedly hits the API each time.
- No cost or latency tracking.

**Categorization: MIGRATE** — replace OpenRouter with direct Anthropic SDK; swap model to `claude-haiku-4-5-20251001`. Native system role support eliminates the Gemma workaround.

---

### 1.2 `api/src/documents/documents.service.ts` — Document AI Pipeline

| Field                | Value                                                                                |
| -------------------- | ------------------------------------------------------------------------------------ |
| Location             | `api/src/documents/documents.service.ts` (lines 151–400)                             |
| Functions            | `processDocument()`, `regenerateAi()`, `translate()`, `translateTitleIfNeeded()`     |
| Current model        | Delegates entirely to `AiService` (same OpenRouter model)                            |
| Current SDK          | Via `AiService`                                                                      |
| Input                | Document HTML or plain text (union communications, typically 200–4000 chars)         |
| Output               | AI-rewritten Italian content + English translation; title translation                |
| Frequency            | Per-request, admin-triggered manually                                                |
| Quality requirements | High: aviation/union terminology must be correct; HTML tags must survive translation |
| Caller               | Admin in web app or mobile app                                                       |
| Data sensitivity     | Union-confidential                                                                   |

**Categorization: MIGRATE** — no code changes needed here once `AiService` is swapped. The callers already use the service abstraction.

---

### 1.3 `api/src/issues/issues.service.ts` — Issue Summary Generation

| Field                | Value                                                                   |
| -------------------- | ----------------------------------------------------------------------- |
| Location             | `api/src/issues/issues.service.ts` (lines 266–295)                      |
| Function             | `generateSummary()` — summarize open issues grouped by category/urgency |
| Current model        | Delegates to `AiService.generate()` (same OpenRouter model)             |
| Current SDK          | Via `AiService`                                                         |
| Input                | Plain-text list of open member segnalazioni                             |
| Output               | Summary string (rendered into a PDF)                                    |
| Frequency            | Per-request (Admin+, manual trigger)                                    |
| Quality requirements | Medium: Italian only, no markdown in output, accurate grouping          |
| Caller               | Admin UI (web app or mobile)                                            |
| Data sensitivity     | Member PII + union-confidential                                         |

**Categorization: MIGRATE** — same as documents; delegates via `AiService`, no changes needed in issues.service after AiService migration.

---

### 1.4 `api/src/rag/rag.service.ts` — Old LangChain RAG

| Field                | Value                                                                                                                                                                                                                  |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Location             | `api/src/rag/rag.service.ts`                                                                                                                                                                                           |
| Function             | Index markdown KB docs (chunks) + chat endpoint with vector retrieval + LLM generation                                                                                                                                 |
| Current model        | Embeddings: `OPENROUTER_EMBEDDING_MODEL` (`nomic-ai/nomic-embed-text-v2` via OpenRouter); Chat: `OPENROUTER_CHAT_MODEL` (`llama-3.3-70b-instruct:free`); Query transform: `anthropic/claude-sonnet-4-5` via OpenRouter |
| Current SDK          | `openai` (OpenRouter), `@langchain/classic`, `@langchain/textsplitters`                                                                                                                                                |
| Input                | Question string + conversation history                                                                                                                                                                                 |
| Output               | `{ answer: string; sources: string[] }`                                                                                                                                                                                |
| Frequency            | Per user message                                                                                                                                                                                                       |
| Quality requirements | High: must cite sources; Italian responses required                                                                                                                                                                    |
| Caller               | `ChatbotScreen.tsx` via `POST /rag/chat` (Admin+ only)                                                                                                                                                                 |
| Data sensitivity     | Union-confidential (KB docs + query logs)                                                                                                                                                                              |
| DB tables            | `wiki_embeddings` (pgvector, 1536 dims, OpenAI text-embedding-3-small format)                                                                                                                                          |

**Notes:**

- `findRelevantChunks()` method exists but is **not called** — `chat()` instead calls `wikiService.searchPages()`. The chunk-based indexing path is effectively dead code.
- LangChain dependency (`@langchain/classic`, `@langchain/textsplitters`) is used only here.
- `wiki_embeddings` table is populated by `indexDocuments()` but is never searched anymore.

**Categorization: DEPRECATE** — functionally superseded by `WikiService`. Remove after WikiService migration is complete. LangChain dependencies can be dropped.

---

### 1.5 `api/src/wiki/wiki.service.ts` — Wiki-based KB (current production RAG)

| Field                | Value                                                                                                |
| -------------------- | ---------------------------------------------------------------------------------------------------- |
| Location             | `api/src/wiki/wiki.service.ts`                                                                       |
| Functions            | `ingestSources()`, `searchPages()`, `createPage()`, `updatePage()`, `getIndex()`, `lint()`           |
| Current model        | Embeddings: `OPENROUTER_EMBEDDING_MODEL` (`openai/text-embedding-3-small` via OpenRouter, 1536 dims) |
| Current SDK          | `openai` (OpenRouter)                                                                                |
| Input                | Markdown source files from `./knowledge-base/` directory                                             |
| Output               | Structured `wiki_pages` table with embeddings; semantic search results                               |
| Frequency            | Ingest: manual (SuperAdmin); search: per RAG chat message                                            |
| Quality requirements | High: embedding quality determines retrieval accuracy                                                |
| Caller               | `RagService.chat()` (search); `WikiController` (ingest/CRUD)                                         |
| Data sensitivity     | Union-confidential (KB content)                                                                      |
| DB table             | `wiki_pages` (pgvector, 1536 dims)                                                                   |

**Notes:**

- This is the **active** KB backend. `RagService.chat()` calls `wikiService.searchPages()`.
- Embeddings are generated via OpenRouter, NOT via the Python service.
- No reranking in the current pipeline (reranker is defined in Python but never called from NestJS).
- Generation (the LLM answer) still happens in `RagService.chat()` via OpenRouter.

**Categorization: REPLACE** — this is the KB Assistant migration target. Rebuild under `ai/kb/` with Voyage embeddings + Anthropic generation. The `wiki_pages` table structure is largely reusable; content can be re-embedded.

---

### 1.6 `python/` — Python FastAPI Microservice

| Field            | Value                                                                                                                                                            |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Location         | `python/` (Dockerfile, main.py, routers/, services/)                                                                                                             |
| Functions        | `POST /embed/batch` (BAAI/bge-m3, 1024 dims), `POST /rerank` (BAAI/bge-reranker-v2-m3), `POST /parse/pdf` (pdfplumber + PyMuPDF), `POST /chunk` (text splitting) |
| Current model    | `BAAI/bge-m3` (local, sentence-transformers); `BAAI/bge-reranker-v2-m3` (local CrossEncoder)                                                                     |
| Current SDK      | `sentence-transformers`, `pdfplumber`, `pymupdf`                                                                                                                 |
| Input            | Text arrays (embed), query+passages (rerank), file path (parse)                                                                                                  |
| Output           | Float vectors, ranked passages, structured PDF text                                                                                                              |
| Frequency        | N/A — **service is built but not called by any NestJS code**                                                                                                     |
| Caller           | Nobody currently                                                                                                                                                 |
| Data sensitivity | Union-confidential (document content)                                                                                                                            |

**Notes:**

- The Python service was built as part of an earlier Plan A/B iteration. It pre-loads models at startup.
- Docker Compose file (`docker-compose.rag.yml`) exists and includes this service + Redis.
- NestJS RAG and Wiki services bypass it entirely, using OpenRouter for embeddings instead.
- **Decision point for Andrea**: keep Python local embeddings (BAAI/bge-m3) or use Voyage API (Plan B spec recommendation). See §3 below.

**Categorization: KEEP-AS-IS or DEPRECATE** (Andrea's call — see §3).

---

### 1.7 `apps/mobile/src/screens/ChatbotScreen.tsx` — Mobile Chat UI

| Field                | Value                                                          |
| -------------------- | -------------------------------------------------------------- |
| Location             | `apps/mobile/src/screens/ChatbotScreen.tsx`                    |
| Function             | Chat UI for RAG/KB assistant                                   |
| Current SDK          | `ragApi.chat()` → `POST /rag/chat`                             |
| Input                | User text message + conversation history                       |
| Output               | Answer + sources (page titles)                                 |
| Frequency            | Per user message                                               |
| Quality requirements | Medium latency (<5s preferred); sources must display correctly |
| Caller               | Admin+ users via Drawer nav                                    |
| Data sensitivity     | Conversation logs include user query history                   |

**Notes:**

- No streaming (waits for full response before rendering).
- No conversation persistence (history lives in component state only).
- Sources shown as collapsible list of wiki page titles.

**Categorization: MIGRATE** — update endpoint to new `ai/kb` path. Streaming and conversation persistence are Phase 5 enhancements.

---

### 1.8 `apps/mobile/src/api/rag.ts` — RAG API Client

| Field          | Value                                                                                                                                                            |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Location       | `apps/mobile/src/api/rag.ts`                                                                                                                                     |
| Function       | Typed API client for all RAG + Wiki operations                                                                                                                   |
| Endpoints used | `POST /rag/chat`, `GET /rag/status`, `POST /rag/reindex`, `GET /rag/progress`, `POST /wiki/ingest`, `GET /wiki/index`, `GET /wiki/page/:slug`, `POST /wiki/lint` |
| Caller         | `ChatbotScreen.tsx` and (presumably) admin RAG management screens                                                                                                |

**Categorization: MIGRATE** — update endpoint URLs when new `ai/kb` module is ready.

---

## 2. What is NOT present (confirming absence)

| Feature                                  | Status                                                               |
| ---------------------------------------- | -------------------------------------------------------------------- |
| Audio/voice transcription                | Not implemented anywhere                                             |
| Content moderation                       | Not implemented                                                      |
| Recommendation engine                    | Not implemented                                                      |
| Telegram/Telegraf AI                     | Not present in codebase                                              |
| Web app (`apps/web`) direct AI calls     | None — web app is pure UI                                            |
| Image/vision processing (beyond env var) | Env var `VISION_TABLE_MODEL` exists but no code uses it              |
| Redis-based AI caching                   | Redis configured in docker-compose but not used by any AI code       |
| Cohere reranker in NestJS                | Env var `COHERE_RERANK_MODEL` exists but no NestJS code calls Cohere |

---

## 3. Open Decision Points (requires Andrea's input)

### 3.1 Embeddings: Voyage vs Python local vs OpenRouter ✅ DECIDED

Three options for the new KB embedding pipeline:

| Option | Provider               | Model                           | Dims | Cost               | Latency     | Quality                  | Privacy    |
| ------ | ---------------------- | ------------------------------- | ---- | ------------------ | ----------- | ------------------------ | ---------- |
| A      | Voyage API             | `voyage-3-large`                | 1024 | ~$0.06/MTok        | ~200ms      | Excellent                | Cloud      |
| B      | Python service (local) | `BAAI/bge-m3`                   | 1024 | Free (compute)     | ~50ms local | Excellent (multilingual) | On-premise |
| C      | OpenRouter (current)   | `openai/text-embedding-3-small` | 1536 | ~$0.02/MTok via OR | ~300ms      | Good                     | Cloud      |

Option B is already built and working. Option A is what Plan B spec recommends. Option C is current state.

**Decision: Option B — Python local (BAAI/bge-m3).** Privacy (union-confidential docs stay on-premise), superior Italian recall, zero cost, service already built.

### 3.2 Generation model: Haiku 4.5 only vs tiered

Plan B spec says "everything through `claude-haiku-4-5-20251001`". For the RAG chatbot, generation quality matters more than for translation. Consider:

- RAG generation: Haiku 4.5 (fast, cheap, good for grounded Q&A)
- Translation: Haiku 4.5 (proven good at HTML-preserving translation)
- Issue summary: Haiku 4.5 (structured output from a list)

All three are reasonable with Haiku 4.5. Sonnet 4.6 would be a bump if RAG quality is insufficient.

### 3.3 Python service fate ✅ DECIDED

**Decision: keep and integrate.** Python service provides embeddings (bge-m3) + reranking (bge-reranker-v2-m3) + PDF parsing. All three will be used in the new `ai/kb/` pipeline.

### 3.2 Generation model: Haiku 4.5 only vs tiered ✅ DECIDED

**Decision: Haiku 4.5 for all functions.** Bump to Sonnet only if RAG quality is insufficient after testing.

### 3.4 Wiki tables: migrate vs rebuild

`wiki_pages` table (1536-dim embeddings from OpenAI text-embedding-3-small) is the current active KB. When moving to a new embedding model (Voyage voyage-3-large, 1024 dims, or bge-m3 1024 dims), dimensions change → must re-embed all pages. Since KB content comes from markdown files, the cleanest approach is: **delete and re-ingest** from source files rather than trying to convert existing embeddings.

### 3.5 RAG access control: Admin+ only vs all members ✅ DECIDED

**Decision: Admin+ only now.** To open to all members later: remove `@Roles(UserRole.ADMIN, UserRole.SUPERADMIN)` decorator, keep only `@UseGuards(JwtAuthGuard)`. One line.

---

## 4. Summary: Migration Plan

| Touchpoint                               | Category          | Action                                                                    | Priority       |
| ---------------------------------------- | ----------------- | ------------------------------------------------------------------------- | -------------- |
| `AiService` (translate/rewrite/generate) | MIGRATE           | Swap OpenRouter → Anthropic SDK + Haiku 4.5; add retry + caching          | P1             |
| `DocumentsService` AI pipeline           | MIGRATE           | No changes needed once AiService is swapped                               | P1 (automatic) |
| `IssuesService.generateSummary`          | MIGRATE           | No changes needed once AiService is swapped                               | P1 (automatic) |
| `WikiService` (KB embeddings + search)   | REPLACE           | Rebuild under `ai/kb/` with new embedding provider + Anthropic generation | P1             |
| `RagService` (LangChain chunks)          | DEPRECATE         | Remove after WikiService migration; drop LangChain deps                   | P2             |
| Python FastAPI service                   | KEEP/DEPRECATE    | Andrea decides (§3.1)                                                     | P2             |
| `ChatbotScreen` + `ragApi`               | MIGRATE           | Update endpoint URL; add streaming in Phase 5                             | P3             |
| Redis                                    | INTEGRATE         | Use for AI response cache (translation cache first)                       | P3             |
| Cohere reranker                          | INTEGRATE or DROP | Integrate if keeping Python service; otherwise remove env var             | P3             |

---

## 5. Current AI Env Vars (to be consolidated)

```bash
# Current (to be removed or renamed)
OPENROUTER_API_KEY
OPENROUTER_MODEL
OPENROUTER_TRANSLATION_MODEL
OPENROUTER_CHAT_MODEL
OPENROUTER_EMBEDDING_MODEL
OPENROUTER_EMBED_MODEL          # legacy duplicate
COHERE_RERANK_MODEL             # configured but unused
VISION_TABLE_MODEL              # configured but unused
KNOWLEDGE_BASE_PATH
REDIS_URL                       # used by docker-compose, not yet by AI code

# Target (Plan B consolidated prefix)
AI_ANTHROPIC_API_KEY
AI_VOYAGE_API_KEY               # if Voyage chosen
AI_GENERATION_MODEL=claude-haiku-4-5-20251001
AI_TRANSLATION_MODEL=claude-haiku-4-5-20251001
AI_EMBEDDING_MODEL=voyage-3-large   # or bge-m3 if local
AI_KB_DATA_PATH
AI_DISABLED=false
```

---

## 6. Database Tables (AI-related)

| Table             | Purpose                            | Dims | Status                                                    |
| ----------------- | ---------------------------------- | ---- | --------------------------------------------------------- |
| `wiki_embeddings` | Old chunk-based RAG (legacy)       | 1536 | Dead — not searched; only `indexDocuments()` writes to it |
| `wiki_pages`      | Current active KB (wiki-based RAG) | 1536 | Active — searched by `RagService.chat()`                  |
| `ai.usage_log`    | Cost/latency telemetry             | —    | Does not exist yet (Plan B target)                        |

**Action on migration:**

- `wiki_embeddings` → drop (after removing `RagService`)
- `wiki_pages` → re-embed with new model after source re-ingest
- `ai.usage_log` → create as part of Phase 2

---

## 7. Implementation Decisions (all resolved 2026-05-07)

| Decision            | Choice                                                   |
| ------------------- | -------------------------------------------------------- |
| Embeddings provider | Python local — BAAI/bge-m3 (1024 dims)                   |
| Reranker            | Python local — BAAI/bge-reranker-v2-m3                   |
| Generation model    | `claude-haiku-4-5-20251001` (direct Anthropic SDK)       |
| OpenRouter          | Remove entirely                                          |
| Branch strategy     | One PR per phase                                         |
| KB access control   | Admin+ now; one-line change to open to all members later |
| Python service      | Keep and integrate                                       |

_Audit signed off. Phase 1 architecture confirmed. Proceeding to Phase 2 implementation._
