import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import * as puppeteer from "puppeteer-core";
import { Issue } from "./entities/issue.entity";
import { CreateIssueDto } from "./dto/create-issue.dto";
import { UpdateIssueDto } from "./dto/update-issue.dto";
import { IssueStatus } from "../common/enums/issue-status.enum";
import { UserRole } from "../common/enums/user-role.enum";
import { Ruolo } from "../common/enums/ruolo.enum";
import { OllamaService } from "../ollama/ollama.service";
import { NotificationsService } from "../notifications/notifications.service";

@Injectable()
export class IssuesService {
  constructor(
    @InjectRepository(Issue)
    private readonly repo: Repository<Issue>,
    private readonly ollamaService: OllamaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(
    dto: CreateIssueDto,
    userId: string,
    ruolo: Ruolo,
  ): Promise<Issue> {
    const issue = this.repo.create({ ...dto, userId, ruolo });
    const saved = await this.repo.save(issue);

    // Notify admins — fire and forget
    this.notificationsService
      .notifyAdmins(ruolo, "Nuova segnalazione", dto.title, {
        type: "NEW_ISSUE",
        issueId: saved.id,
      })
      .catch(() => {
        /* ignore notification errors */
      });

    return saved;
  }

  async findAll(requestingUser: {
    userId: string;
    role: UserRole;
    ruolo?: Ruolo;
  }): Promise<Issue[]> {
    const qb = this.repo
      .createQueryBuilder("issue")
      .leftJoinAndSelect("issue.user", "user")
      .leftJoinAndSelect("issue.category", "category")
      .leftJoinAndSelect("issue.urgency", "urgency")
      .leftJoinAndSelect("issue.solvedBy", "solvedBy")
      .orderBy("issue.createdAt", "DESC");

    if (requestingUser.role === UserRole.ADMIN && requestingUser.ruolo) {
      qb.where("issue.ruolo = :ruolo", { ruolo: requestingUser.ruolo });
    }

    return qb.getMany();
  }

  async findMyIssues(userId: string): Promise<Issue[]> {
    return this.repo.find({
      where: { userId },
      relations: ["category", "urgency"],
      order: { createdAt: "DESC" },
    });
  }

  async findById(id: string): Promise<Issue> {
    const issue = await this.repo.findOne({
      where: { id },
      relations: ["user", "category", "urgency", "solvedBy"],
    });
    if (!issue) throw new NotFoundException("Issue not found");
    return issue;
  }

  async update(
    id: string,
    dto: UpdateIssueDto,
    adminUser: { userId: string; role: UserRole; ruolo?: Ruolo },
  ): Promise<Issue> {
    const issue = await this.findById(id);

    if (
      adminUser.role === UserRole.ADMIN &&
      adminUser.ruolo &&
      issue.ruolo !== adminUser.ruolo
    ) {
      throw new ForbiddenException(
        "Cannot update issues outside your role scope",
      );
    }

    if (dto.status !== undefined) {
      issue.status = dto.status;
      if (dto.status === IssueStatus.SOLVED) {
        issue.solvedAt = new Date();
        issue.solvedById = adminUser.userId;
      } else if (dto.status === IssueStatus.OPEN) {
        issue.solvedAt = null;
        issue.solvedById = null;
      }
    }
    if (dto.adminNotes !== undefined) {
      issue.adminNotes = dto.adminNotes;
    }

    const saved = await this.repo.save(issue);

    // Notify the issue creator if status changed
    if (dto.status !== undefined) {
      const statusLabels: Record<IssueStatus, string> = {
        [IssueStatus.OPEN]: "Aperta",
        [IssueStatus.IN_PROGRESS]: "In lavorazione",
        [IssueStatus.SOLVED]: "Risolta",
      };
      this.notificationsService
        .sendPushNotification(
          issue.userId,
          "Aggiornamento segnalazione",
          `"${issue.title}" — ${statusLabels[dto.status]}`,
          {
            type: "ISSUE_STATUS_UPDATED",
            issueId: saved.id,
            status: dto.status,
          },
        )
        .catch(() => {
          /* ignore */
        });
    }

    return saved;
  }

  async reopen(
    id: string,
    requestingUser: { userId: string; role: UserRole; ruolo?: Ruolo },
  ): Promise<Issue> {
    const issue = await this.findById(id);

    // Only the issue owner or an admin can reopen
    const isOwner = issue.userId === requestingUser.userId;
    const isAdmin =
      requestingUser.role === UserRole.ADMIN ||
      requestingUser.role === UserRole.SUPERADMIN;
    if (!isOwner && !isAdmin) {
      throw new ForbiddenException("Cannot reopen this issue");
    }

    issue.status = IssueStatus.OPEN;
    issue.solvedAt = null;
    issue.solvedById = null;
    return this.repo.save(issue);
  }

  async remove(id: string): Promise<void> {
    const issue = await this.findById(id);
    await this.repo.remove(issue);
  }

  async generateSummary(requestingUser: {
    userId: string;
    role: UserRole;
    ruolo?: Ruolo;
  }): Promise<{ summary: string; pdfBase64: string }> {
    const issues = await this.findAll(requestingUser);
    const openIssues = issues.filter((i) => i.status !== IssueStatus.SOLVED);

    if (openIssues.length === 0) {
      return {
        summary: "Nessuna segnalazione aperta da analizzare.",
        pdfBase64: "",
      };
    }

    const issueText = openIssues
      .map(
        (i) =>
          `- [${i.category?.nameIt || "N/A"}] [Urgenza ${i.urgency?.level || "?"}: ${i.urgency?.nameIt || "N/A"}] ${i.title}: ${i.description}`,
      )
      .join("\n");

    const systemPrompt = `Sei un assistente sindacale. Analizza le seguenti segnalazioni e fornisci un riassunto conciso delle problematiche principali, raggruppandole per categoria e urgenza. Rispondi in italiano con testo semplice, senza markdown.`;
    const prompt = `Segnalazioni aperte:\n${issueText}\n\nRiassunto:`;

    const summary = await this.ollamaService.generate(prompt, systemPrompt);
    const pdfBuffer = await this.generateSummaryPdf(summary, openIssues.length);
    const pdfBase64 = pdfBuffer.toString("base64");

    return { summary, pdfBase64 };
  }

  private async generateSummaryPdf(
    summaryText: string,
    issueCount: number,
  ): Promise<Buffer> {
    const today = new Date().toLocaleDateString("it-IT", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const html = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <style>
    @page { margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11pt; color: #222; }
    .header {
      background: linear-gradient(135deg, #177246 0%, #0f5735 100%);
      color: white; padding: 28px 40px; display: flex;
      align-items: center; justify-content: space-between;
    }
    .header-logo { font-size: 26pt; font-weight: 900; letter-spacing: 3px; }
    .header-info { text-align: right; font-size: 10pt; opacity: 0.9; line-height: 1.6; }
    .header-org { font-size: 13pt; font-weight: 600; }
    .content { padding: 36px 48px; }
    .meta { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 28px; }
    .doc-title { font-size: 15pt; font-weight: 700; color: #177246; text-transform: uppercase; letter-spacing: 1px; }
    .doc-date { font-size: 9pt; color: #888; font-style: italic; }
    .divider { border: none; border-top: 2px solid #177246; margin-bottom: 24px; }
    .stat-row { display: flex; gap: 16px; margin-bottom: 28px; }
    .stat-box {
      background: #f0f8f4; border: 1px solid #c8e6d8; border-radius: 6px;
      padding: 14px 20px; flex: 1; text-align: center;
    }
    .stat-value { font-size: 22pt; font-weight: 800; color: #177246; }
    .stat-label { font-size: 8pt; color: #555; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px; }
    .section-title { font-size: 11pt; font-weight: 700; color: #177246; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
    .summary-box {
      background: #fafafa; border-left: 4px solid #177246;
      padding: 18px 22px; border-radius: 0 6px 6px 0;
      font-size: 10.5pt; line-height: 1.75; color: #333; white-space: pre-wrap;
    }
    .footer {
      margin-top: 48px; padding-top: 16px; border-top: 1px solid #ddd;
      font-size: 8.5pt; color: #999; text-align: center; line-height: 1.6;
    }
    .footer strong { color: #177246; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="header-logo">CISL</div>
      <div class="header-org">FIT-CISL Trasporti Aerei</div>
    </div>
    <div class="header-info">
      Report AI Segnalazioni<br>Uso interno riservato
    </div>
  </div>
  <div class="content">
    <div class="meta">
      <div class="doc-title">Riepilogo Segnalazioni</div>
      <div class="doc-date">${today}</div>
    </div>
    <hr class="divider">
    <div class="stat-row">
      <div class="stat-box">
        <div class="stat-value">${issueCount}</div>
        <div class="stat-label">Segnalazioni aperte</div>
      </div>
    </div>
    <div class="section-title">Analisi AI</div>
    <div class="summary-box">${summaryText.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
    <div class="footer">
      <strong>CISL FIT-CISL</strong> — Documento generato automaticamente da UnionConnect<br>
      ${today} · Riservato all'uso interno
    </div>
  </div>
</body>
</html>`;

    const executablePath =
      process.env.PUPPETEER_EXECUTABLE_PATH ||
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

    const browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle0" });
      const pdf = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "0", right: "0", bottom: "0", left: "0" },
      });
      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }

  async exportCsv(requestingUser: {
    userId: string;
    role: UserRole;
    ruolo?: Ruolo;
  }): Promise<string> {
    const issues = await this.findAll(requestingUser);

    const header =
      "ID,Title,Category,Urgency Level,Status,Submitter,Ruolo,Admin Notes,Solved At,Created At";
    const rows = issues.map((i) =>
      [
        i.id,
        `"${(i.title || "").replace(/"/g, '""')}"`,
        `"${(i.category?.nameEn || "").replace(/"/g, '""')}"`,
        i.urgency?.level || "",
        i.status,
        i.user?.crewcode || "",
        i.ruolo,
        `"${(i.adminNotes || "").replace(/"/g, '""')}"`,
        i.solvedAt ? i.solvedAt.toISOString() : "",
        i.createdAt.toISOString(),
      ].join(","),
    );

    return [header, ...rows].join("\n");
  }
}
