from fastapi import APIRouter, HTTPException
from models.schemas import EmbedBatchRequest, EmbedBatchResponse
from services.embedder import embed_batch, get_embedder

router = APIRouter()


@router.post("/embed/batch", response_model=EmbedBatchResponse)
async def embed_batch_endpoint(req: EmbedBatchRequest) -> EmbedBatchResponse:
    if not req.texts:
        raise HTTPException(status_code=400, detail="texts array must not be empty")
    try:
        embedder = get_embedder(req.model)
        vectors = embed_batch(req.texts, req.model)
        return EmbedBatchResponse(
            embeddings=vectors,
            model=req.model,
            dimensions=embedder.get_sentence_embedding_dimension() or 1024,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Embedding failed: {e}")
