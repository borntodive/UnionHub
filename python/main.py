"""
UnionHub RAG — Python FastAPI micro-service
Handles: batch embeddings, reranking
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import embed, rerank, health
from services.embedder import get_embedder
from services.reranker import get_reranker

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("rag-python")


@asynccontextmanager
async def lifespan(app: FastAPI):
    import asyncio
    from functools import partial
    from services.embedder import embed_batch

    logger.info("Loading embedding model (BAAI/bge-m3)…")
    get_embedder("BAAI/bge-m3")
    logger.info("Loading reranker model (BAAI/bge-reranker-v2-m3)…")
    get_reranker()
    # Warm up: run one real inference so first client request is not cold
    logger.info("Warming up embedding model…")
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, partial(embed_batch, ["warmup"], "BAAI/bge-m3"))
    logger.info("All models loaded and warm — service ready.")
    yield


app = FastAPI(
    title="UnionHub RAG Python Service",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(embed.router)
app.include_router(rerank.router)
app.include_router(health.router)
