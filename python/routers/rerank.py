from fastapi import APIRouter, HTTPException
from models.schemas import RerankRequest, RerankResponse, RerankResult
from services.reranker import rerank

router = APIRouter()


@router.post("/rerank", response_model=RerankResponse)
async def rerank_endpoint(req: RerankRequest) -> RerankResponse:
    if not req.passages:
        raise HTTPException(status_code=400, detail="passages array must not be empty")
    try:
        results = rerank(req.query, req.passages, req.top_k)
        return RerankResponse(results=[RerankResult(**r) for r in results])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Reranking failed: {e}")
