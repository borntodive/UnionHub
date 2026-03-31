import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RagQueryService } from "../services/rag-query.service";
import { AskQueryDto } from "../dto/ask-query.dto";
import { SearchQueryDto } from "../dto/search-query.dto";

@Controller("rag")
@UseGuards(JwtAuthGuard)
export class RagQueryController {
  constructor(private readonly ragQueryService: RagQueryService) {}

  @Post("ask")
  async ask(@Body() dto: AskQueryDto) {
    return this.ragQueryService.ask(dto);
  }

  @Post("search")
  async search(@Body() dto: SearchQueryDto) {
    return this.ragQueryService.rawSearch(dto);
  }
}
