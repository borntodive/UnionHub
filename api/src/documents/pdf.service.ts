import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as puppeteer from "puppeteer-core";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import * as fs from "fs";
import * as path from "path";
import { Document } from "./entities/document.entity";

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);
  private readonly fitCislTemplatePath: string;
  private readonly jointTemplatePath: string;
  private readonly qrImagePath: string;

  constructor(private configService: ConfigService) {
    this.fitCislTemplatePath = path.join(
      process.cwd(),
      "templates",
      "letterhead.pdf",
    );
    this.jointTemplatePath = path.join(
      process.cwd(),
      "templates",
      "letterhead-joint.pdf",
    );
    this.qrImagePath = path.join(process.cwd(), "templates", "whatsapp-qr.png");
  }

  /**
   * Get template path based on union type
   */
  private getTemplatePath(union: string): string {
    return union === "joint"
      ? this.jointTemplatePath
      : this.fitCislTemplatePath;
  }

  /**
   * Check if custom template exists for union
   */
  hasCustomTemplate(union: string = "fit-cisl"): boolean {
    const templatePath = this.getTemplatePath(union);
    return fs.existsSync(templatePath);
  }

  /**
   * Generate PDF with custom letterhead template
   */
  async generateDocumentPdf(document: Document): Promise<Buffer> {
    return this.generateWithHtml(document);
  }

  /**
   * Generate PDF using custom template PDF
   */
  private async generateWithTemplate(
    document: Document,
    templatePath: string,
  ): Promise<Buffer> {
    try {
      // Load template
      const templateBytes = fs.readFileSync(templatePath);
      const pdfDoc = await PDFDocument.load(templateBytes);

      // Get first page
      const pages = pdfDoc.getPages();
      const firstPage = pages[0];

      // Add text to the page
      const { width, height } = firstPage.getSize();

      // Embed font
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      // Add date (top right)
      const today = new Date().toLocaleDateString("it-IT", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

      firstPage.drawText(today, {
        x: width - 150,
        y: height - 100,
        size: 10,
        font,
        color: rgb(0.4, 0.4, 0.4),
      });

      // Add title (remove newlines for PDF rendering)
      const title = document.title.replace(/\n/g, " ");
      const titleWidth = boldFont.widthOfTextAtSize(title, 16);
      firstPage.drawText(title, {
        x: (width - titleWidth) / 2,
        y: height - 180,
        size: 16,
        font: boldFont,
        color: rgb(0.09, 0.45, 0.27), // CISL green
      });

      // Add content (wrapped text)
      const content = this.normalizeLineBreaks(
        document.aiReviewedContent || document.originalContent,
      );
      const lines = this.wrapText(content, 70);
      let yPosition = height - 220;

      let currentPage = firstPage;
      for (const line of lines) {
        if (yPosition < 100) {
          // Add new page from template
          const templatePdf = await PDFDocument.load(templateBytes);
          const [templatePage] = await pdfDoc.copyPages(templatePdf, [0]);
          currentPage = pdfDoc.addPage(templatePage);
          yPosition = height - 100;
        }

        currentPage.drawText(line, {
          x: 60,
          y: yPosition,
          size: 11,
          font,
          color: rgb(0.2, 0.2, 0.2),
        });
        yPosition -= 16;
      }

      // Add English translation if available (on new page with template)
      if (document.englishTranslation) {
        // Add new page from template for English
        const templatePdf = await PDFDocument.load(templateBytes);
        const [templatePage] = await pdfDoc.copyPages(templatePdf, [0]);
        const engPage = pdfDoc.addPage(templatePage);

        // English header (right aligned)
        const headerText = "English Translation / Traduzione Inglese";
        const headerWidth = boldFont.widthOfTextAtSize(headerText, 12);
        engPage.drawText(headerText, {
          x: width - headerWidth - 60,
          y: height - 100,
          size: 12,
          font: boldFont,
          color: rgb(0.85, 0.05, 0.2), // CISL red
        });

        // English title (use translated title or fallback to Italian, remove newlines)
        const engTitle = (document.englishTitle || document.title).replace(
          /\n/g,
          " ",
        );
        const engTitleWidth = boldFont.widthOfTextAtSize(engTitle, 16);
        engPage.drawText(engTitle, {
          x: (width - engTitleWidth) / 2,
          y: height - 180,
          size: 16,
          font: boldFont,
          color: rgb(0.09, 0.45, 0.27),
        });

        // English content (same margin as Italian)
        const engLines = this.wrapText(
          this.normalizeLineBreaks(document.englishTranslation),
          70,
        );
        let engYPosition = height - 220;
        let currentEngPage = engPage;

        for (const line of engLines) {
          if (engYPosition < 100) {
            // Add new page from template
            const templatePdf2 = await PDFDocument.load(templateBytes);
            const [newTemplatePage] = await pdfDoc.copyPages(templatePdf2, [0]);
            currentEngPage = pdfDoc.addPage(newTemplatePage);
            engYPosition = height - 100;
          }

          currentEngPage.drawText(line, {
            x: 60,
            y: engYPosition,
            size: 10,
            font,
            color: rgb(0.3, 0.3, 0.3),
          });
          engYPosition -= 14;
        }

        // Add English closing text
        await this.addClosingText(
          currentEngPage,
          pdfDoc,
          width,
          engYPosition - 15,
          true,
          boldFont,
          font,
          document.union,
        );
      }

      // Add Italian closing text
      await this.addClosingText(
        currentPage,
        pdfDoc,
        width,
        yPosition - 15,
        false,
        boldFont,
        font,
        document.union,
      );

      // Save PDF
      const pdfBytes = await pdfDoc.save();
      return Buffer.from(pdfBytes);
    } catch (error) {
      this.logger.error("Failed to generate PDF with template:", error);
      // Fallback to HTML generation
      return this.generateWithHtml(document);
    }
  }

  /**
   * Add closing text at the end of content
   */
  private async addClosingText(
    page: any,
    pdfDoc: any,
    width: number,
    startY: number,
    isEnglish: boolean,
    boldFont: any,
    font: any,
    union: string = "fit-cisl",
  ): Promise<void> {
    const isJoint = union === "joint";

    let yPos = startY;

    // Check if we need a new page
    if (yPos < 150) {
      // Not enough space, will be handled by caller
      return;
    }

    if (isJoint) {
      // For joint communications - only show the two boards side by side
      const leftText = "FIT-CISL Malta Air Pilot Board";
      const rightText = "ANPAC Malta Air Company Council";

      const leftWidth = boldFont.widthOfTextAtSize(leftText, 10);
      const rightWidth = boldFont.widthOfTextAtSize(rightText, 10);

      // Position them side by side with some spacing
      const spacing = 60;
      const totalWidth = leftWidth + spacing + rightWidth;
      const startX = (width - totalWidth) / 2;

      page.drawText(leftText, {
        x: startX,
        y: yPos,
        size: 10,
        font: boldFont,
        color: rgb(0, 0, 0),
      });

      page.drawText(rightText, {
        x: startX + leftWidth + spacing,
        y: yPos,
        size: 10,
        font: boldFont,
        color: rgb(0, 0, 0),
      });
    } else {
      // Single union - FIT-CISL only - full closing section

      // Closing text
      const closingText = isEnglish
        ? "As always, your FIT-CISL representatives remain available for any questions or clarifications."
        : "Come sempre, i vostri rappresentanti FIT-CISL restano a disposizione per qualsiasi dubbio o chiarimento.";

      page.drawText(closingText, {
        x: 60,
        y: yPos,
        size: 9,
        font,
        color: rgb(0.3, 0.3, 0.3),
      });

      yPos -= 30;

      // RSA FIT-CISL PILOTI MALTA AIR
      const rsaText = "RSA FIT-CISL PILOTI MALTA AIR";
      const rsaWidth = boldFont.widthOfTextAtSize(rsaText, 12);
      page.drawText(rsaText, {
        x: (width - rsaWidth) / 2,
        y: yPos,
        size: 12,
        font: boldFont,
        color: rgb(0, 0, 0),
      });

      yPos -= 20;

      // READY2B FIT-CISL (in green)
      const readyText = "READY2B FIT-CISL";
      const readyWidth = boldFont.widthOfTextAtSize(readyText, 11);
      page.drawText(readyText, {
        x: (width - readyWidth) / 2,
        y: yPos,
        size: 11,
        font: boldFont,
        color: rgb(0.09, 0.45, 0.27), // CISL green
      });

      yPos -= 25;

      // Stay updated / Resta aggiornato
      const stayUpdated = isEnglish ? "Stay updated:" : "Resta aggiornato:";
      const stayWidth = font.widthOfTextAtSize(stayUpdated, 10);
      page.drawText(stayUpdated, {
        x: (width - stayWidth) / 2,
        y: yPos,
        size: 10,
        font,
        color: rgb(0.4, 0.4, 0.4),
      });

      yPos -= 18;

      // enter Whatsapp group / entra nel gruppo Whatsapp
      const whatsappText = isEnglish
        ? "enter Whatsapp group"
        : "entra nel gruppo Whatsapp";
      const whatsappWidth = font.widthOfTextAtSize(whatsappText, 9);
      page.drawText(whatsappText, {
        x: (width - whatsappWidth) / 2,
        y: yPos,
        size: 9,
        font,
        color: rgb(0.09, 0.45, 0.27),
      });

      // Add QR code image if available
      try {
        if (fs.existsSync(this.qrImagePath)) {
          this.logger.debug(`Embedding QR code from ${this.qrImagePath}`);
          const qrImageBytes = fs.readFileSync(this.qrImagePath);
          const qrImage = await pdfDoc.embedPng(qrImageBytes);
          const qrSize = 80;
          page.drawImage(qrImage, {
            x: (width - qrSize) / 2,
            y: yPos - qrSize - 10,
            width: qrSize,
            height: qrSize,
          });
        } else {
          this.logger.debug(`QR code not found at ${this.qrImagePath}`);
        }
      } catch (error) {
        this.logger.warn(`Failed to embed QR code: ${error.message}`);
      }
    }
  }

  /**
   * Read a file as base64, returning null if not found
   */
  private readBase64(filePath: string): string | null {
    try {
      return fs.existsSync(filePath)
        ? fs.readFileSync(filePath).toString("base64")
        : null;
    } catch {
      return null;
    }
  }

  /**
   * Generate PDF using HTML + Puppeteer (supports text justification)
   */
  private async generateWithHtml(document: Document): Promise<Buffer> {
    const templatesDir = path.join(process.cwd(), "templates");
    const isJoint = document.union === "joint";

    const logos = isJoint
      ? {
          left: this.readBase64(
            path.join(templatesDir, "logo-joint-left.jpeg"),
          ),
          leftMime: "jpeg",
          right: this.readBase64(
            path.join(templatesDir, "logo-joint-right.png"),
          ),
          rightMime: "png",
        }
      : {
          single: this.readBase64(path.join(templatesDir, "logo.png")),
          singleMime: "png",
        };

    const qrBase64 = this.readBase64(this.qrImagePath);

    const browser = await this.launchBrowser();
    try {
      const page = await browser.newPage();
      const html = this.generateHtml(document, logos, qrBase64);
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

  /**
   * Launch browser
   */
  private async launchBrowser(): Promise<puppeteer.Browser> {
    const executablePath =
      process.env.PUPPETEER_EXECUTABLE_PATH ||
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

    return puppeteer.launch({
      executablePath,
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  }

  /**
   * Wrap text to fit within max width
   */
  private wrapText(text: string, maxChars: number): string[] {
    const lines: string[] = [];
    const paragraphs = text.split("\n");

    for (const paragraph of paragraphs) {
      const words = paragraph.split(" ");
      let currentLine = "";

      for (const word of words) {
        if ((currentLine + word).length > maxChars) {
          lines.push(currentLine.trim());
          currentLine = word + " ";
        } else {
          currentLine += word + " ";
        }
      }

      if (currentLine.trim()) {
        lines.push(currentLine.trim());
      }

      // Add empty line between paragraphs
      lines.push("");
    }

    return lines;
  }

  /**
   * Normalize line breaks: join soft wraps (single \n) into spaces,
   * preserve real paragraph breaks (\n\n or more). Text content is unchanged.
   */
  private normalizeLineBreaks(text: string): string {
    return text
      .split(/\n{2,}/) // split on real paragraph breaks
      .map((para) => para.replace(/\n/g, " ").replace(/  +/g, " ").trim())
      .filter(Boolean)
      .join("\n\n");
  }

  /**
   * Convert content to HTML paragraphs for PDF rendering.
   * If the content is already HTML (from the rich text editor), inject the
   * body-paragraph class on every <p> tag and pass through directly.
   * Otherwise treat as plain text and convert paragraphs.
   */
  private contentToHtml(text: string): string {
    const trimmed = text.trim();

    // Detect HTML content: check for any HTML tag anywhere in the string.
    // Handles cases like "Gentili Colleghe,<div>..." where text precedes the first tag.
    const hasHtmlTags = /<[a-z][\s\S]*?>/i.test(trimmed);

    if (hasHtmlTags) {
      // If the content doesn't start with a tag, wrap the leading text in a <p> first
      const normalised = trimmed.startsWith("<")
        ? trimmed
        : trimmed.replace(/^([^<]+)/, (leadingText) => {
            const escaped = leadingText
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;");
            return `<p class="body-paragraph">${escaped.trim()}</p>`;
          });

      // Inject body-paragraph class on every <p> tag
      return normalised.replace(/<p(\s[^>]*)?>/gi, (_, attrs) => {
        if (attrs && /class=/i.test(attrs)) {
          return `<p${attrs.replace(/class="([^"]*)"/i, 'class="$1 body-paragraph"')}>`;
        }
        return `<p${attrs || ""} class="body-paragraph">`;
      });
    }

    // Plain-text fallback (legacy documents)
    const normalized = this.normalizeLineBreaks(trimmed);
    return normalized
      .split("\n\n")
      .map((para) => {
        const p = para.trim();
        if (!p) return "";
        const escaped = p
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
        return `<p class="body-paragraph">${escaped}</p>`;
      })
      .filter(Boolean)
      .join("\n");
  }

  /**
   * Escape HTML special characters
   */
  private esc(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  /**
   * Generate HTML faithful to the letterhead PDF (fit-cisl or joint).
   *
   * FIT-CISL geometry (letterhead.meta-2.json, 595.4×841.8pt):
   *   Logo:          left 6.550%  top 3.273%  width 30.215%  height 5.660%
   *   Top rule:      top ~10.4%
   *   Bottom rule:   top ~89.5%
   *   Footer:        top 91.72%  (Times New Roman 10.7px, centered)
   *
   * Joint geometry (letterhead-joint.meta.json, 595×842pt):
   *   Logo left  (FIT-CISL): left 9.529%  top 4.500%  width 27.328%  height 5.130%
   *   Logo right (ANPAC):    left 46.202%  top 4.489%  width 40.394%  height 4.179%
   *   Top rule:  top ~11.5%  (below both logos)
   *   No institutional footer (clean joint header only)
   *
   * position:fixed makes elements repeat on every PDF page.
   */
  private generateHtml(
    document: Document,
    logos: Record<string, string | null | undefined>,
    qrBase64: string | null = null,
  ): string {
    const isJoint = document.union === "joint";

    const now = new Date();
    // Joint uses compact "Roma dd.MM.yy" format (matches letterhead-joint.html reference)
    const today = isJoint
      ? `Roma ${String(now.getDate()).padStart(2, "0")}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getFullYear()).slice(-2)}`
      : now.toLocaleDateString("it-IT", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });

    const italianContent = this.contentToHtml(
      document.aiReviewedContent || document.originalContent,
    );
    const englishContent = document.englishTranslation
      ? this.contentToHtml(document.englishTranslation)
      : "";
    const englishTitle = document.englishTitle || document.title;

    const qrImg = qrBase64
      ? `<img src="data:image/png;base64,${qrBase64}" width="110" height="110" style="display:block;margin:8px auto 0;">`
      : "";

    // ── Letterhead HTML (fixed elements) ──────────────────────────────────
    let letterheadHtml: string;
    let topPadding: string;

    if (isJoint) {
      // Two logos side by side, no footer
      const leftImg = logos.left
        ? `<img src="data:image/${logos.leftMime};base64,${logos.left}" alt="Logo FIT-CISL" style="width:100%;height:100%;object-fit:contain;">`
        : "";
      const rightImg = logos.right
        ? `<img src="data:image/${logos.rightMime};base64,${logos.right}" alt="Logo ANPAC" style="width:100%;height:100%;object-fit:contain;">`
        : "";

      letterheadHtml = `
  <!-- Joint: FIT-CISL logo (left) — bbox_pt [56.7, 37.9, 219.3, 81.09] on 595×842 -->
  <div aria-hidden="true" style="position:fixed;left:9.529%;top:4.500%;width:27.328%;height:5.130%;">${leftImg}</div>
  <!-- Joint: ANPAC logo (right) — bbox_pt [274.9, 37.8, 515.25, 73.0] on 595×842 -->
  <div aria-hidden="true" style="position:fixed;left:46.202%;top:4.489%;width:40.394%;height:4.179%;">${rightImg}</div>
  `;

      // top: 11.5% of 297mm ≈ 34.2mm → use 36mm; no bottom footer rule needed
      topPadding = "36mm";
    } else {
      // Single FIT-CISL logo + institutional footer
      const singleImg = logos.single
        ? `<img src="data:image/${logos.singleMime};base64,${logos.single}" alt="Logo FIT CISL – Trasporto Aereo" style="width:100%;height:100%;object-fit:contain;">`
        : "";

      letterheadHtml = `
  <!-- FIT-CISL logo — bbox_pt [39, 27.55, 218.9, 75.2] on 595.4×841.8 -->
  <div aria-hidden="true" style="position:fixed;left:6.550%;top:3.273%;width:30.215%;height:5.660%;">${singleImg}</div>
  <!-- Separator below logo — CISL green, aligned to content margins (left 22mm, right 22mm) -->
  <div aria-hidden="true" style="position:fixed;top:10.4%;left:10.476%;width:79.048%;height:1pt;background:#177246;"></div>
  <!-- Separator above footer — CISL green, full width -->
  <div aria-hidden="true" style="position:fixed;top:89.5%;left:0;width:100%;height:1pt;background:#177246;"></div>
  <!-- Institutional footer — top 91.72% from letterhead.meta-2.json -->
  <footer aria-hidden="true" style="position:fixed;top:91.72%;left:0;width:100%;text-align:center;font-family:'Times New Roman',Times,serif;font-size:10.7px;line-height:1.15;color:#000;">
    <p style="font-weight:bold;color:#CC0000;">Dipartimento Trasporto Aereo</p>
    <p style="font-weight:bold;margin-top:5px;color:#CC0000;">Sede di Roma: Via A. Musa, 4 - 00161 ROMA - Tel. 06/44286354 Fax 06/44286410</p>
    <p style="font-weight:bold;margin-top:5px;color:#CC0000;">Sede di Fiumicino: Aeroporto L. Da Vinci Tel./Fax 06/659550339</p>
    <p style="margin-top:5px;color:#177246;"><span>C.F. 80421120587 - </span><span style="font-weight:bold;">e-mail: fit.trasportoaereo@cisl.it – PEC: fitcislnazionale@postecert.it - </span><span>Website: www.fitcisl.org</span></p>
    <p style="margin-top:5px;color:#177246;">Aderente a: International Transport Workers' Federation ITF - European Transport Workers' Federation ETF</p>
  </footer>`;

      // top 10.4% of 297mm ≈ 30.9mm → 33mm; bottom 10.5% ≈ 31.2mm → 34mm
      topPadding = "33mm";
    }

    const bottomPadding = isJoint ? "20mm" : "34mm";

    // ── Closing sections ──────────────────────────────────────────────────
    const jointSignatures = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-top:16mm;font-size:11pt;">
        <strong>FIT-CISL Malta Air Pilot Board</strong>
        <strong>ANPAC Malta Air Company Council</strong>
      </div>`;

    const closingIt = isJoint
      ? jointSignatures
      : `<p class="closing-text">Come sempre, i vostri rappresentanti FIT-CISL restano a disposizione per qualsiasi dubbio o chiarimento.</p>
         <p class="closing-center"><strong>RSA FIT-CISL PILOTI MALTA AIR</strong></p>
         <p class="closing-center" style="color:#177246;"><strong>READY2B FIT-CISL</strong></p>
         ${qrBase64 ? `<p class="closing-center" style="font-size:9pt;color:#666;margin-top:8px;">Resta aggiornato — entra nel gruppo WhatsApp:</p>${qrImg}` : ""}`;

    const closingEn = isJoint
      ? jointSignatures
      : `<p class="closing-text">As always, your FIT-CISL representatives remain available for any questions or clarifications.</p>
         <p class="closing-center"><strong>RSA FIT-CISL PILOTI MALTA AIR</strong></p>
         <p class="closing-center" style="color:#177246;"><strong>READY2B FIT-CISL</strong></p>
         ${qrBase64 ? `<p class="closing-center" style="font-size:9pt;color:#666;margin-top:8px;">Stay updated — join the WhatsApp group:</p>${qrImg}` : ""}`;

    return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <title>${this.esc(document.title)}</title>
  <style>
    @page { size: A4; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }

    html, body {
      width: 210mm;
      /* FIT-CISL: Times New Roman / Tinos (per letterhead.meta-2.json font detection)
         Joint:    Avenir (per letterhead-joint.meta.json AvenirLT detection) */
      font-family: ${
        isJoint
          ? "'Avenir', 'Avenir Next', system-ui, -apple-system, Helvetica, sans-serif"
          : "'Times New Roman', Tinos, Georgia, serif"
      };
      font-size: 11pt;
      line-height: 1.6;
      color: #000;
    }

    .page     { padding: ${topPadding} 22mm ${bottomPadding}; }
    .page-en  { padding: ${topPadding} 22mm ${bottomPadding}; page-break-before: always; }

    .date {
      text-align: right;
      margin-bottom: ${isJoint ? "4mm" : "6mm"};
      font-size: 10pt;
      ${isJoint ? "" : "font-style: italic;"}
      color: #333;
      line-height: 1.6;
    }

    /* Title: black, bold, centered — no uppercase, no green */
    .doc-title {
      font-size: 12pt;
      font-weight: bold;
      margin-bottom: 8mm;
      text-align: center;
      color: #000;
    }

    /* Paragraphs: justified, generous spacing to match letterhead reference */
    .body-paragraph {
      text-align: justify;
      hyphens: auto;
      word-break: break-word;
      margin-bottom: 12pt;
      line-height: 1.6;
    }

    /* Rich text editor elements */
    strong, b { font-weight: bold; }
    em, i { font-style: italic; }
    u { text-decoration: underline; }

    ul, ol {
      margin: 0 0 12pt 1.6em;
      padding: 0;
      text-align: justify;
    }
    li {
      margin-bottom: 4pt;
      line-height: 1.6;
    }
    li p { margin: 0; }

    /* Headings from rich editor */
    h1, h2, h3 {
      font-weight: bold;
      margin-bottom: 4pt;
      line-height: 1.3;
    }
    h1 { font-size: 13pt; }
    h2 { font-size: 12pt; }
    h3 { font-size: 11pt; }

    .en-label {
      font-size: 8pt;
      color: #DA0E32;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      font-weight: 700;
      border-left: 3px solid #DA0E32;
      padding-left: 8px;
      margin-bottom: 7mm;
    }

    /* Closing paragraph — same font and spacing as body paragraphs */
    .closing-text {
      text-align: justify;
      hyphens: auto;
      word-break: break-word;
      font-size: 11pt;
      line-height: 1.6;
      margin-top: 12pt;
      margin-bottom: 6pt;
      color: #000;
    }

    .closing-center {
      text-align: center;
      margin-top: 6pt;
      font-size: 11pt;
    }
  </style>
</head>
<body>
${letterheadHtml}

  <!-- Italian content -->
  <div class="page">
    <div class="date">
      ${today}
      ${isJoint ? `<br><span style="font-style:italic;font-size:9pt;color:#555;">___English text at the bottom___</span>` : ""}
    </div>
    ${isJoint ? "" : `<h1 class="doc-title">${this.esc(document.title)}</h1>`}
${italianContent}
${closingIt}
  </div>

  ${
    document.englishTranslation
      ? `<!-- English translation -->
  <div class="page-en">
    <div class="en-label">English Translation / Traduzione Inglese</div>
    ${isJoint ? "" : `<h1 class="doc-title">${this.esc(englishTitle)}</h1>`}
${englishContent}
${closingEn}
  </div>`
      : ""
  }

</body>
</html>`;
  }
}
