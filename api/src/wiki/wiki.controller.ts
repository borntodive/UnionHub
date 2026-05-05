import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
  Param,
  NotFoundException,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { SuperAdminGuard } from "../common/guards/super-admin.guard";
import { WikiService } from "./wiki.service";
import {
  WikiPage,
  WikiCategory,
  WikiPageInput,
  IngestProgress,
  LintIssue,
  WikiIndex,
  IngestResult,
} from "./wiki.types";

@Controller("wiki")
export class WikiController {
  constructor(private readonly wikiService: WikiService) {}

  /**
   * Ingest source documents into wiki (SuperAdmin only)
   */
  @Post("ingest")
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  async ingest(): Promise<IngestResult> {
    return this.wikiService.ingestSources();
  }

  /**
   * Get wiki page by slug (authenticated users)
   */
  @Get("page/:slug")
  @UseGuards(JwtAuthGuard)
  async getPage(@Param("slug") slug: string): Promise<WikiPage> {
    const page = await this.wikiService.findPageBySlug(slug);
    if (!page) {
      throw new NotFoundException("Page not found");
    }
    return page;
  }

  /**
   * Get wiki index (authenticated users)
   */
  @Get("index")
  @UseGuards(JwtAuthGuard)
  async getIndex(): Promise<WikiIndex> {
    return this.wikiService.getIndex();
  }

  /**
   * Get wiki log (authenticated users)
   */
  @Get("log")
  @UseGuards(JwtAuthGuard)
  async getLog(): Promise<{ content: string }> {
    const fs = await import("node:fs/promises");
    const logPath = require("path").join(process.cwd(), "wiki", "log.md");
    try {
      const content = await fs.readFile(logPath, "utf-8");
      return { content };
    } catch {
      return { content: "# Change Log\n\nNo changes yet." };
    }
  }

  /**
   * Lint wiki for issues (SuperAdmin only)
   */
  @Post("lint")
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  async lint(): Promise<LintIssue[]> {
    return this.wikiService.lint();
  }

  /**
   * Get ingest progress (SuperAdmin only)
   */
  @Get("progress")
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  getProgress(): IngestProgress {
    return this.wikiService.getProgress();
  }

  /**
   * Create a new wiki page (SuperAdmin only)
   */
  @Post("page")
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  async createPage(@Body() pageData: WikiPageInput): Promise<WikiPage> {
    return this.wikiService.createPage(pageData);
  }

  /**
   * Update a wiki page (SuperAdmin only)
   */
  @Post("page/:id")
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  async updatePage(
    @Param("id") id: string,
    @Body() updates: Partial<WikiPageInput>,
  ): Promise<WikiPage> {
    return this.wikiService.updatePage(id, updates);
  }
}
