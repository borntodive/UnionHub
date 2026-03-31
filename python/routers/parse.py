from fastapi import APIRouter, HTTPException
from models.schemas import ParsePdfRequest, ParsePdfResponse
from services.pdf_parser import parse_pdf

router = APIRouter()


@router.post("/parse/pdf", response_model=ParsePdfResponse)
async def parse_pdf_endpoint(req: ParsePdfRequest) -> ParsePdfResponse:
    try:
        return parse_pdf(req.file_path, req.document_id)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF parsing failed: {e}")
