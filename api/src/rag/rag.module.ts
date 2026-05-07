import { Module } from "@nestjs/common";
import { RagController } from "./rag.controller";
import { RagService } from "./rag.service";

/** Deprecated — kept only to serve 410 responses on old /rag/* endpoints. */
@Module({
  controllers: [RagController],
  providers: [RagService],
})
export class RagModule {}
