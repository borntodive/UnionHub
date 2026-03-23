import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { Response } from "express";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ChatbotService } from "./chatbot.service";
import { ChatDto } from "./dto/chat.dto";

@Controller("chatbot")
@UseGuards(JwtAuthGuard)
@SkipThrottle()
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @Post("chat")
  chat(@Body() dto: ChatDto, @Req() req: any) {
    return this.chatbotService.chat(dto.message, dto.conversationId, req.user);
  }

  /**
   * Streaming endpoint — returns text/event-stream (SSE).
   * Each event is `data: <JSON>\n\n`:
   *   { t: string }       — a token fragment
   *   { done: true, sources, conversationId }  — stream complete
   *   { error: string }   — generation error
   *
   * Using @Res() bypasses NestJS response serialization so we can write
   * raw SSE chunks. X-Accel-Buffering: no disables nginx proxy buffering.
   */
  @Post("chat/stream")
  async chatStream(
    @Body() dto: ChatDto,
    @Req() req: any,
    @Res() res: Response,
  ) {
    // Explicit 200 — NestJS defaults POST to 201 before the handler runs.
    res.status(200);
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    // Disable nginx / Cloudflare proxy buffering so chunks reach the client
    // immediately instead of being held until the response closes.
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    // flush() drains any compression middleware buffer after each write so
    // tokens are delivered in real-time rather than batched.
    const flush = () => (res as any).flush?.();

    try {
      for await (const event of this.chatbotService.chatStream(
        dto.message,
        dto.conversationId,
        req.user,
      )) {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
        flush();
      }
    } catch (err) {
      res.write(
        `data: ${JSON.stringify({ error: "Stream error: " + err.message })}\n\n`,
      );
      flush();
    }

    res.end();
  }

  @Get("history/:conversationId")
  getHistory(@Param("conversationId") conversationId: string, @Req() req: any) {
    return this.chatbotService.getHistory(conversationId, req.user.userId);
  }

  @Delete("history/:conversationId")
  @HttpCode(HttpStatus.NO_CONTENT)
  clearHistory(
    @Param("conversationId") conversationId: string,
    @Req() req: any,
  ) {
    return this.chatbotService.clearHistory(conversationId, req.user.userId);
  }
}
