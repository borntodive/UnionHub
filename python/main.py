"""
UnionHub RAG — Python FastAPI micro-service
Handles: PDF parsing, chunking, batch embeddings, reranking
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import parse, chunk, embed, rerank, health
from services.embedder import get_embedder
from services.reranker import get_reranker

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("rag-python")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Pre-load ML models at startup so the first request is fast
    logger.info("Loading embedding model (BAAI/bge-m3)…")
    get_embedder("BAAI/bge-m3")
    logger.info("Loading reranker model (BAAI/bge-reranker-v2-m3)…")
    get_reranker()
    logger.info("All models loaded — service ready.")
    yield


app = FastAPI(
    title="UnionHub RAG Python Service",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(parse.router)
app.include_router(chunk.router)
app.include_router(embed.router)
app.include_router(rerank.router)
app.include_router(health.router)
