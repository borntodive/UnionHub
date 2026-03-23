import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { KnowledgeBaseDocument } from "./entities/knowledge-base-document.entity";
import { KnowledgeBaseChunk } from "./entities/knowledge-base-chunk.entity";
import { KnowledgeBaseService } from "./knowledge-base.service";
import { KnowledgeBaseController } from "./knowledge-base.controller";
import { OllamaModule } from "../ollama/ollama.module";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([KnowledgeBaseDocument, KnowledgeBaseChunk]),
    OllamaModule,
    NotificationsModule,
  ],
  providers: [KnowledgeBaseService],
  controllers: [KnowledgeBaseController],
  exports: [KnowledgeBaseService],
})
export class KnowledgeBaseModule {}
