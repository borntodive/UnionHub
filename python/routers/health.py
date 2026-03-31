from fastapi import APIRouter
from models.schemas import HealthResponse
from services import embedder as emb_svc
from services import reranker as rnk_svc

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health_endpoint() -> HealthResponse:
    return HealthResponse(
        status="ok",
        models={
            "embedder": emb_svc.is_loaded(),
            "reranker": rnk_svc.is_loaded(),
        },
    )
