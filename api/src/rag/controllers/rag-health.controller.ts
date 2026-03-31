import { Controller, Get } from "@nestjs/common";
import { RagHealthService } from "../services/rag-health.service";

@Controller("health")
export class RagHealthController {
  constructor(private readonly ragHealthService: RagHealthService) {}

  @Get("rag")
  async check() {
    return this.ragHealthService.check();
  }
}
