import { Controller, All, HttpCode, HttpStatus, Res } from "@nestjs/common";
import type { Response } from "express";

/** Deprecated — all RAG endpoints moved to POST /api/v1/ai/kb/ask */
@Controller("rag")
export class RagController {
  @All("*")
  @HttpCode(HttpStatus.GONE)
  gone(@Res() res: Response) {
    res.status(410).json({
      statusCode: 410,
      message:
        "RAG endpoints are deprecated. Use POST /api/v1/ai/kb/ask instead.",
    });
  }
}
