import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
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
