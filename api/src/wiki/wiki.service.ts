import {
  Injectable,
  Logger,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { OpenAI } from "openai";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import {
  WikiPage,
  WikiCategory,
  IngestProgress,
  IngestPhase,
  LintIssue,
  WikiIndex,
  WikiPageInput,
  WikiPageCreateInput,
  IngestResult,
} from "./wiki.types";

interface WikiPageWithEmbedding extends WikiPage {
  embedding?: number[];
}

interface WikiPageForCreation {
  title: string;
  slug: string;
  content: string;
  path: string;
  category: WikiCategory;
  tags: string[];
  sourceDocument?: string;
  metadata: Record<string, unknown>;
}

@Injectable()
export class WikiService {
  private readonly logger = new Logger(WikiService.name);
  private readonly openai: OpenAI;
  private readonly wikiPath: string;
  private readonly knowledgeBasePath: string;

  private ingestProgress: IngestProgress = {
    isRunning: false,
    phase: "idle",
    current: 0,
    total: 0,
    message: "",
    percent: 0,
  };

  constructor(
    private configService: ConfigService,
    @InjectDataSource() private dataSource: DataSource,
  ) {
    const apiKey = this.configService.get<string>("OPENROUTER_API_KEY");
    if (!apiKey) {
      throw new Error("OPENROUTER_API_KEY is not defined");
    }

    this.openai = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey,
    });

    this.wikiPath = path.join(process.cwd(), "wiki");
    this.knowledgeBasePath =
      this.configService.get<string>("KNOWLEDGE_BASE_PATH") ||
      path.join(process.cwd(), "knowledge-base");
  }

  /**
   * Get current ingest progress
   */
  getProgress(): IngestProgress {
    return this.ingestProgress;
  }

  /**
   * Initialize wiki directory structure
   */
  async initializeWiki(): Promise<void> {
    const dirs = [
      this.wikiPath,
      path.join(this.wikiPath, "entities"),
      path.join(this.wikiPath, "concepts"),
      path.join(this.wikiPath, "sources"),
      path.join(this.wikiPath, "comparisons"),
      path.join(this.wikiPath, "queries"),
    ];

    for (const dir of dirs) {
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (error) {
        this.logger.warn(`Could not create directory ${dir}: ${error.message}`);
      }
    }

    // Create schema.md if not exists
    const schemaPath = path.join(this.wikiPath, "schema.md");
    try {
      await fs.access(schemaPath);
    } catch {
      await fs.writeFile(schemaPath, this.getDefaultSchemaContent(), "utf-8");
    }

    // Create index.md if not exists
    const indexPath = path.join(this.wikiPath, "index.md");
    try {
      await fs.access(indexPath);
    } catch {
      await fs.writeFile(
        indexPath,
        "# Wiki Index\n\n_Auto-generated_\n",
        "utf-8",
      );
    }

    // Create log.md if not exists
    const logPath = path.join(this.wikiPath, "log.md");
    try {
      await fs.access(logPath);
    } catch {
      await fs.writeFile(
        logPath,
        "# Wiki Change Log\n\n## " +
          new Date().toISOString().split("T")[0] +
          "\n\n- Wiki initialized\n",
        "utf-8",
      );
    }
  }

  /**
   * Ingest source documents into wiki
   */
  async ingestSources(): Promise<IngestResult> {
    try {
      this.updateProgress(
        "discovering",
        0,
        0,
        "Discovering source documents...",
      );

      await this.initializeWiki();

      // Find all markdown files in knowledge-base
      const sourceFiles = await this.discoverSourceFiles();

      if (sourceFiles.length === 0) {
        this.updateProgress("error", 0, 0, "No source documents found");
        throw new InternalServerErrorException("No source documents found");
      }

      this.updateProgress(
        "parsing",
        0,
        sourceFiles.length,
        "Parsing source documents...",
      );

      let pagesCreated = 0;
      let pagesUpdated = 0;

      for (let i = 0; i < sourceFiles.length; i++) {
        const sourcePath = sourceFiles[i];
        this.updateProgress(
          "parsing",
          i + 1,
          sourceFiles.length,
          `Parsing ${path.basename(sourcePath)}...`,
        );

        const pages = await this.parseSourceDocument(sourcePath);

        for (const page of pages) {
          const existing = await this.findPageBySlug(page.slug);

          if (existing) {
            await this.updatePageInternal(existing.id, page);
            pagesUpdated++;
          } else {
            await this.createPageInternal(page);
            pagesCreated++;
          }
        }
      }

      // Update index.md
      await this.rebuildIndex();

      // Log the ingest
      await this.logChange(
        `Ingest completed: ${pagesCreated} pages created, ${pagesUpdated} pages updated`,
      );

      this.updateProgress(
        "done",
        sourceFiles.length,
        sourceFiles.length,
        "Ingest complete",
      );

      return { pagesCreated, pagesUpdated };
    } catch (error) {
      this.logger.error("Ingest failed:", error);
      this.updateProgress("error", 0, 0, `Ingest failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Parse a source document into wiki pages
   */
  private async parseSourceDocument(
    sourcePath: string,
  ): Promise<WikiPageForCreation[]> {
    const content = await fs.readFile(sourcePath, "utf-8");
    const filename = path.basename(sourcePath, ".md");
    const relativePath = path.relative(this.knowledgeBasePath, sourcePath);

    // Determine category from path
    let category: WikiCategory = "sources";

    const pages: Omit<
      WikiPageWithEmbedding,
      "id" | "createdAt" | "updatedAt"
    >[] = [];

    // Create main source page
    const mainSlug = this.slugify(filename);
    pages.push({
      title: filename.replace(/-/g, " "),
      slug: mainSlug,
      content: this.formatAsWikiPage(content, filename),
      path: `${category}/${mainSlug}.md`,
      category,
      tags: this.extractTags(content),
      sourceDocument: relativePath,
      metadata: {
        type: "source",
        originalFile: filename,
      },
    });

    // Extract sections as separate concept pages
    const sections = this.extractSections(content);
    for (const section of sections) {
      const sectionSlug = this.slugify(`${filename}-${section.heading}`);
      pages.push({
        title: `${section.heading} (${filename})`,
        slug: sectionSlug,
        content: this.formatSectionAsWikiPage(section, filename, mainSlug),
        path: `concepts/${sectionSlug}.md`,
        category: "concepts",
        tags: [...this.extractTags(section.content), filename.toLowerCase()],
        sourceDocument: relativePath,
        metadata: {
          type: "section",
          sourcePage: mainSlug,
          heading: section.heading,
        },
      });
    }

    return pages;
  }

  /**
   * Create a new wiki page
   */
  async createPage(page: WikiPageInput): Promise<WikiPage> {
    const pageForCreation: WikiPageForCreation = {
      title: page.title,
      slug: page.slug,
      content: page.content,
      path: page.path,
      category: page.category,
      tags: page.tags,
      sourceDocument: page.sourceDocument,
      metadata: page.metadata || {},
    };
    return this.createPageInternal(pageForCreation);
  }

  /**
   * Internal create page method
   */
  private async createPageInternal(
    page: WikiPageForCreation,
  ): Promise<WikiPage> {
    const embedModel =
      this.configService.get<string>("OPENROUTER_EMBEDDING_MODEL") ||
      "openai/text-embedding-3-small";

    // Generate embedding
    const embedding = await this.generateEmbedding(page.content, embedModel);

    const result = await this.dataSource.query(
      `INSERT INTO wiki_pages (title, slug, content, path, category, tags, source_document, embedding, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, created_at, updated_at`,
      [
        page.title,
        page.slug,
        page.content,
        page.path,
        page.category,
        page.tags,
        page.sourceDocument || null,
        `[${embedding.join(",")}]`,
        JSON.stringify(page.metadata || {}),
      ],
    );

    const row = result[0];
    return {
      ...page,
      id: row.id,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  /**
   * Update an existing wiki page
   */
  async updatePage(
    id: string,
    updates: Partial<WikiPageInput>,
  ): Promise<WikiPage> {
    return this.updatePageInternal(id, updates);
  }

  /**
   * Internal update page method
   */
  private async updatePageInternal(
    id: string,
    updates: Partial<WikiPageInput>,
  ): Promise<WikiPage> {
    const current = await this.findPageById(id);
    if (!current) {
      throw new InternalServerErrorException(`Page not found: ${id}`);
    }

    const embedModel =
      this.configService.get<string>("OPENROUTER_EMBEDDING_MODEL") ||
      "openai/text-embedding-3-small";

    // Regenerate embedding if content changed
    let embedding: number[] | undefined;
    if (updates.content && updates.content !== current.content) {
      embedding = await this.generateEmbedding(updates.content, embedModel);
    }

    const result = await this.dataSource.query(
      `UPDATE wiki_pages
       SET title = COALESCE($1, title),
           slug = COALESCE($2, slug),
           content = COALESCE($3, content),
           path = COALESCE($4, path),
           category = COALESCE($5, category),
           tags = COALESCE($6, tags),
           source_document = COALESCE($7, source_document),
           embedding = COALESCE($8, embedding),
           metadata = COALESCE($9, metadata)
       WHERE id = $10
       RETURNING updated_at`,
      [
        updates.title ?? current.title,
        updates.slug ?? current.slug,
        updates.content ?? current.content,
        updates.path ?? current.path,
        updates.category ?? current.category,
        updates.tags ?? current.tags,
        updates.sourceDocument ?? current.sourceDocument,
        embedding ? `[${embedding.join(",")}]` : null,
        updates.metadata !== undefined
          ? JSON.stringify(updates.metadata)
          : JSON.stringify(current.metadata),
        id,
      ],
    );

    return {
      ...current,
      ...updates,
      updatedAt: new Date(result[0].updated_at),
    };
  }

  /**
   * Find page by slug
   */
  async findPageBySlug(slug: string): Promise<WikiPage | null> {
    const result = await this.dataSource.query(
      `SELECT id, title, slug, content, path, category, tags, source_document, created_at, updated_at, metadata
       FROM wiki_pages WHERE slug = $1`,
      [slug],
    );

    if (result.length === 0) return null;

    const row = result[0];
    return {
      id: row.id,
      title: row.title,
      slug: row.slug,
      content: row.content,
      path: row.path,
      category: row.category,
      tags: row.tags || [],
      sourceDocument: row.source_document,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      metadata: row.metadata || {},
    };
  }

  /**
   * Find page by ID
   */
  async findPageById(id: string): Promise<WikiPage | null> {
    const result = await this.dataSource.query(
      `SELECT id, title, slug, content, path, category, tags, source_document, created_at, updated_at, metadata
       FROM wiki_pages WHERE id = $1`,
      [id],
    );

    if (result.length === 0) return null;

    const row = result[0];
    return {
      id: row.id,
      title: row.title,
      slug: row.slug,
      content: row.content,
      path: row.path,
      category: row.category,
      tags: row.tags || [],
      sourceDocument: row.source_document,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      metadata: row.metadata || {},
    };
  }

  /**
   * Search pages by semantic similarity
   */
  async searchPages(
    queryEmbedding: number[],
    limit: number = 5,
    category?: WikiCategory,
  ): Promise<Array<WikiPage & { similarity: number }>> {
    const vectorStr = `[${queryEmbedding.join(",")}]`;

    let query = `
      SELECT id, title, slug, content, path, category, tags, source_document, created_at, updated_at, metadata,
             1 - (embedding <=> $1::vector) as similarity
      FROM wiki_pages
      WHERE embedding IS NOT NULL
    `;

    const params: (string | number)[] = [vectorStr];
    let paramIndex = 2;

    if (category) {
      query += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    query += ` ORDER BY embedding <=> $1::vector LIMIT $${paramIndex}`;
    params.push(limit);

    const results = await this.dataSource.query(query, params);

    return results.map((row: unknown) => ({
      id: (row as { id: string }).id,
      title: (row as { title: string }).title,
      slug: (row as { slug: string }).slug,
      content: (row as { content: string }).content,
      path: (row as { path: string }).path,
      category: (row as { category: WikiCategory }).category,
      tags: (row as { tags: string[] }).tags || [],
      sourceDocument: (row as { source_document: string }).source_document,
      createdAt: new Date((row as { created_at: string }).created_at),
      updatedAt: new Date((row as { updated_at: string }).updated_at),
      metadata: (row as { metadata: Record<string, unknown> }).metadata || {},
      similarity: (row as { similarity: number }).similarity,
    }));
  }

  /**
   * Get wiki index
   */
  async getIndex(): Promise<WikiIndex> {
    const result = await this.dataSource.query(
      `SELECT title, slug, category, path, tags, updated_at
       FROM wiki_pages
       ORDER BY category, title`,
    );

    return {
      pages: result.map((row: unknown) => ({
        title: (row as { title: string }).title,
        slug: (row as { slug: string }).slug,
        category: (row as { category: WikiCategory }).category,
        path: (row as { path: string }).path,
        tags: (row as { tags: string[] }).tags || [],
      })),
      lastUpdated:
        result.length > 0
          ? new Date(
              Math.max(
                ...result.map((r: { updated_at: string }) =>
                  new Date(r.updated_at).getTime(),
                ),
              ),
            ).toISOString()
          : new Date().toISOString(),
    };
  }

  /**
   * Lint wiki - find issues
   */
  async lint(): Promise<LintIssue[]> {
    const issues: LintIssue[] = [];

    // Get all pages
    const allPages = await this.dataSource.query(
      `SELECT slug, content, tags FROM wiki_pages`,
    );

    const allSlugs = new Set(allPages.map((p: { slug: string }) => p.slug));

    // Track inbound links
    const inboundLinks = new Map<string, number>();
    for (const p of allPages) {
      inboundLinks.set(p.slug, 0);
    }

    for (const page of allPages) {
      const links = this.extractWikiLinks(page.content);

      // Check for broken links and track inbound links
      for (const link of links) {
        if (allSlugs.has(link)) {
          const count = inboundLinks.get(link) || 0;
          inboundLinks.set(link, count + 1);
        } else {
          issues.push({
            type: "broken-link",
            severity: "warning",
            message: `Broken link to [[${link}]]`,
            path: page.slug,
          });
        }
      }

      // Check for missing tags
      if (!page.tags || page.tags.length === 0) {
        issues.push({
          type: "missing-tags",
          severity: "warning",
          message: "Page has no tags",
          path: page.slug,
        });
      }
    }

    // Check for orphan pages (no inbound links)
    for (const [slug, count] of inboundLinks) {
      if (count === 0) {
        issues.push({
          type: "orphan",
          severity: "warning",
          message: "Page has no inbound links",
          path: slug,
        });
      }
    }

    return issues;
  }

  /**
   * Update progress
   */
  private updateProgress(
    phase: IngestPhase,
    current: number,
    total: number,
    message: string,
  ): void {
    this.ingestProgress = {
      isRunning: phase !== "idle" && phase !== "done" && phase !== "error",
      phase,
      current,
      total,
      message,
      percent: total > 0 ? Math.round((current / total) * 100) : 0,
    };
  }

  /**
   * Discover all markdown source files
   */
  private async discoverSourceFiles(): Promise<string[]> {
    const files: string[] = [];

    try {
      const entries = await fs.readdir(this.knowledgeBasePath, {
        withFileTypes: true,
      });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const dirPath = path.join(this.knowledgeBasePath, entry.name);
          const dirFiles = await fs.readdir(dirPath);

          for (const file of dirFiles) {
            if (file.endsWith(".md")) {
              files.push(path.join(dirPath, file));
            }
          }
        }
      }
    } catch (error) {
      this.logger.error(`Error reading knowledge-base: ${error.message}`);
    }

    return files;
  }

  /**
   * Slugify text for URLs
   */
  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  /**
   * Generate embedding for text
   */
  private async generateEmbedding(
    text: string,
    model: string,
  ): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model,
      input: text.substring(0, 8191), // OpenAI limit
    });
    return response.data[0]?.embedding || [];
  }

  /**
   * Extract tags from content
   */
  private extractTags(content: string): string[] {
    const tags: Set<string> = new Set();

    // Extract from YAML frontmatter
    const tagMatch = content.match(/tags:\s*\[(.*?)\]/);
    if (tagMatch) {
      tagMatch[1].split(",").forEach((tag) => tags.add(tag.trim()));
    }

    // Extract common terms
    const commonTerms = [
      "salary",
      "leave",
      "roster",
      "ftl",
      "sector",
      "base",
      "contract",
      "grade",
      "pilot",
      "cabin",
      "pay",
      "allowance",
      "seniority",
    ];
    const lowerContent = content.toLowerCase();

    for (const term of commonTerms) {
      if (lowerContent.includes(term)) {
        tags.add(term);
      }
    }

    return Array.from(tags);
  }

  /**
   * Extract sections from markdown content
   */
  private extractSections(
    content: string,
  ): Array<{ heading: string; content: string }> {
    const sections: Array<{ heading: string; content: string }> = [];
    const lines = content.split("\n");
    let currentSection: { heading: string; content: string[] } | null = null;

    for (const line of lines) {
      const headingMatch = line.match(/^(#{2,3})\s+(.+)$/);
      if (headingMatch) {
        if (currentSection) {
          sections.push({
            heading: currentSection.heading,
            content: currentSection.content.join("\n"),
          });
        }
        currentSection = { heading: headingMatch[2], content: [] };
      } else if (currentSection) {
        currentSection.content.push(line);
      }
    }

    if (currentSection) {
      sections.push({
        heading: currentSection.heading,
        content: currentSection.content.join("\n"),
      });
    }

    // Limit sections per document
    return sections.slice(0, 20);
  }

  /**
   * Extract wiki links from content
   */
  private extractWikiLinks(content: string): string[] {
    const matches = content.matchAll(/\[\[([^\]]+)\]\]/g);
    return Array.from(matches).map((m) => m[1]);
  }

  /**
   * Format content as a wiki page
   */
  private formatAsWikiPage(content: string, title: string): string {
    return `# ${title}

**Source:** Original document
**Tags:** ${this.extractTags(content).join(", ")}

## Content

${content}
`;
  }

  /**
   * Format section as a wiki page
   */
  private formatSectionAsWikiPage(
    section: { heading: string; content: string },
    sourceTitle: string,
    sourceSlug: string,
  ): string {
    return `# ${section.heading}

**Source:** [[${sourceSlug}]]
**Tags:** ${this.extractTags(section.content).join(", ")}

${section.content}
`;
  }

  /**
   * Rebuild the wiki index
   */
  private async rebuildIndex(): Promise<void> {
    const index = await this.getIndex();

    let indexContent = "# Wiki Index\n\n";
    indexContent += `**Last Updated:** ${new Date(
      index.lastUpdated,
    ).toLocaleString()}\n\n`;

    const byCategory: Record<WikiCategory, typeof index.pages> = {
      entities: [],
      concepts: [],
      sources: [],
      comparisons: [],
      queries: [],
    };

    for (const page of index.pages) {
      byCategory[page.category].push(page);
    }

    for (const [category, pages] of Object.entries(byCategory)) {
      if (pages.length > 0) {
        indexContent += `## ${
          category.charAt(0).toUpperCase() + category.slice(1)
        }\n\n`;
        for (const page of pages) {
          indexContent += `- [[${page.slug}]] - ${page.title}\n`;
        }
        indexContent += "\n";
      }
    }

    await fs.writeFile(
      path.join(this.wikiPath, "index.md"),
      indexContent,
      "utf-8",
    );
  }

  /**
   * Log a change to the wiki
   */
  private async logChange(message: string): Promise<void> {
    const logPath = path.join(this.wikiPath, "log.md");
    const timestamp = new Date().toISOString();
    const entry = `\n## ${timestamp.split("T")[0]}\n\n- ${message}\n`;

    await fs.appendFile(logPath, entry, "utf-8");
  }

  /**
   * Get default schema content
   */
  private getDefaultSchemaContent(): string {
    return `# Wiki Schema

This document defines the conventions and structure for the UnionHub knowledge base wiki.

## Page Format

Each wiki page should follow this structure:

\`\`\`markdown
# Page Title

**Category:** (entities|concepts|sources|comparisons|queries)
**Tags:** tag1, tag2, tag3
**Source:** Original document reference (if applicable)

## Overview
Brief description of the page content.

## Key Points
- Key point 1
- Key point 2

## Related Pages
- [[RelatedPageSlug]]

## References
- Source document, section, page number
\`\`\`

## Categories

- **entities:** People, organizations, locations
- **concepts:** Ideas, definitions, procedures
- **sources:** Original documents (CLA, manuals)
- **comparisons:** Side-by-side comparisons
- **queries:** Common questions and answers

## Linking

Use [[PageName]] syntax for internal wiki links (Obsidian-style).

## Tags

Tags should be:
- Lowercase
- Comma-separated
- Relevant for searchability

Common tags: salary, leave, roster, ftl, sector, base, contract, grade, pilot, cabin
`;
  }
}
