import { Module } from "@nestjs/common";
import { HybridRagService } from "./hybrid-rag.service";
import { HybridRagController } from "./hybrid-rag.controller";

@Module({
  controllers: [HybridRagController],
  providers: [HybridRagService],
})
export class HybridRagModule {}
