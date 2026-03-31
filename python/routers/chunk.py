from fastapi import APIRouter, HTTPException
from models.schemas import ChunkBuildRequest, ChunkBuildResponse
from services.chunker import build_chunks

router = APIRouter()


@router.post("/chunk/build", response_model=ChunkBuildResponse)
async def chunk_build_endpoint(req: ChunkBuildRequest) -> ChunkBuildResponse:
    try:
        return build_chunks(
            document_id=req.document_id,
            sections=req.sections,
            tables=req.tables,
            chunk_size=req.chunk_size,
            chunk_overlap=req.chunk_overlap,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chunking failed: {e}")
