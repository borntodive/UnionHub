import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ChatMessage } from "./entities/chat-message.entity";
import { ChatbotService } from "./chatbot.service";
import { ChatbotController } from "./chatbot.controller";
import { KnowledgeBaseModule } from "../knowledge-base/knowledge-base.module";
import { OllamaModule } from "../ollama/ollama.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatMessage]),
    KnowledgeBaseModule,
    OllamaModule,
  ],
  providers: [ChatbotService],
  controllers: [ChatbotController],
})
export class ChatbotModule {}
