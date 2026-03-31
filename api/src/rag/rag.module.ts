import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BullModule } from "@nestjs/bullmq";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { OllamaModule } from "../ollama/ollama.module";
import { NotificationsModule } from "../notifications/notifications.module";

// Entities
import { RagDocument } from "./entities/rag-document.entity";
import { DocumentVersion } from "./entities/document-version.entity";
import { Chunk } from "./entities/chunk.entity";
import { ChunkEmbedding } from "./entities/chunk-embedding.entity";
import { IngestionJob } from "./entities/ingestion-job.entity";
import { IngestionStep } from "./entities/ingestion-step.entity";
import { QueryLog } from "./entities/query-log.entity";

// Services
import { PythonRagClientService } from "./services/python-rag-client.service";
import { RagDocumentService } from "./services/rag-document.service";
import { IngestionService } from "./services/ingestion.service";
import { RAG_INGESTION_QUEUE } from "./constants";
import { SearchService } from "./services/search.service";
import { RagQueryService } from "./services/rag-query.service";
import { RagHealthService } from "./services/rag-health.service";

// Processors
import { IngestionProcessor } from "./processors/ingestion.processor";

// Controllers
import { RagDocumentController } from "./controllers/rag-document.controller";
import { RagIngestionController } from "./controllers/rag-ingestion.controller";
import { RagQueryController } from "./controllers/rag-query.controller";
import { RagHealthController } from "./controllers/rag-health.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RagDocument,
      DocumentVersion,
      Chunk,
      ChunkEmbedding,
      IngestionJob,
      IngestionStep,
      QueryLog,
    ]),
    // BullMQ registered only inside RagModule so it can be removed without touching AppModule
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          url:
            configService.get<string>("REDIS_URL") || "redis://localhost:6379",
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({ name: RAG_INGESTION_QUEUE }),
    OllamaModule,
    NotificationsModule,
  ],
  controllers: [
    RagDocumentController,
    RagIngestionController,
    RagQueryController,
    RagHealthController,
  ],
  providers: [
    PythonRagClientService,
    RagDocumentService,
    IngestionService,
    IngestionProcessor,
    SearchService,
    RagQueryService,
    RagHealthService,
  ],
})
export class RagModule {}
