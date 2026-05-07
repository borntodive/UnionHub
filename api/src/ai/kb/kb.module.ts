import { Module } from "@nestjs/common";
import { KbService } from "./kb.service";
import { KbController } from "./kb.controller";
import { KbIngestionService } from "./kb-ingestion.service";
import { KbRetrievalService } from "./kb-retrieval.service";
import { KbGenerationService } from "./kb-generation.service";
import { AiModule } from "../ai.module";
import { PythonRagProvider } from "../providers/python-rag.provider";

@Module({
  imports: [AiModule],
  providers: [
    PythonRagProvider,
    KbIngestionService,
    KbRetrievalService,
    KbGenerationService,
    KbService,
  ],
  controllers: [KbController],
  exports: [KbService],
})
export class KbModule {}
