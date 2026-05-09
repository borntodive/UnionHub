import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { HybridRagService } from "./hybrid-rag.service";
import { HybridRagController } from "./hybrid-rag.controller";
import { ChatRequest } from "./entities/chat-request.entity";

@Module({
  imports: [TypeOrmModule.forFeature([ChatRequest])],
  controllers: [HybridRagController],
  providers: [HybridRagService],
})
export class HybridRagModule {}
