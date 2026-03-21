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

    // displayHeaderFooter renders headerTemplate/footerTemplate in the margin
    // area on EVERY page — the only reliable way to have repeating header/footer
    // in Puppeteer (position:fixed only works correctly on page 1).
    const topMargin = isJoint ? "36mm" : "38mm";
    const bottomMargin = isJoint ? "20mm" : "36mm";

    const browser = await this.launchBrowser();
    try {
      const page = await browser.newPage();
      const html = this.generateHtml(document, qrBase64);
      // Forward browser console output to NestJS logger so page.evaluate() logs are visible
      page.on("console", (msg) =>
        this.logger.debug(`[browser:${msg.type()}] ${msg.text()}`),
      );
      await page.setContent(html, { waitUntil: "networkidle0" });

      // Detect and fix closing block overflow.
      // We shadow `document` with the browser DOM document to avoid the TS name
      // conflict with the imported NestJS Document entity in this file.
      await page.evaluate(
        (topMarginMm: number, bottomMarginMm: number) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const doc: any = (globalThis as any).document;

          // body has `width: 210mm` in CSS — use it to convert mm → px reliably.
          // mm-ruler with position:absolute has offsetWidth=0 in headless Puppeteer.
          const bodyWidthPx: number =
            doc.body.clientWidth || doc.documentElement.clientWidth || 794; // fallback: 210mm @ 96dpi
          const pxPerMm = bodyWidthPx / 210;
          // Content area per page = physical A4 height minus Puppeteer pdf() margins
          const pageHeightPx = (297 - topMarginMm - bottomMarginMm) * pxPerMm;
          console.log(
            `[overflow] bodyWidthPx=${bodyWidthPx} pxPerMm=${pxPerMm.toFixed(3)} pageHeightPx=${pageHeightPx.toFixed(1)}`,
          );

          const win: any = globalThis as any;
          function getAbsTop(el: HTMLElement): number {
            return el.getBoundingClientRect().top + win.scrollY;
          }
          function getPage(el: HTMLElement): number {
            return Math.floor(getAbsTop(el) / pageHeightPx);
          }

          // Scope to the Italian section only (.page, not .page-en).
          // querySelectorAll on the whole doc would include English paragraphs,
          // making lastParaPage artificially large and breaking the comparison.
          const italianSection = doc.querySelector(".page") as HTMLElement;
          if (!italianSection) return;

          const signature = italianSection.querySelector(
            ".closing-signature",
          ) as HTMLElement;
          const qrSection = italianSection.querySelector(
            ".qr-section",
          ) as HTMLElement;
          if (!signature) return;

          const bodyParagraphs = Array.from(
            italianSection.querySelectorAll(".body-paragraph"),
          ) as HTMLElement[];
          const lastPara = bodyParagraphs[bodyParagraphs.length - 1];
          const lastParaPage = lastPara ? getPage(lastPara) : 0;
          const sigPage = getPage(signature);
          console.log(
            `[overflow] lastParaPage=${lastParaPage}, sigPage=${sigPage}, qrPage=${qrSection ? getPage(qrSection) : "N/A"}, pageHeightPx=${pageHeightPx.toFixed(1)}`,
          );
          if (sigPage > lastParaPage) {
            // Case 2: signature overflows → reduce line-height until it fits
            let lh = 2.0;
            const MIN_LH = 1.5;
            while (
              lh > MIN_LH &&
              getPage(signature as HTMLElement) > lastParaPage
            ) {
              lh = Math.round((lh - 0.05) * 100) / 100;
              bodyParagraphs.forEach((p) => {
                p.style.lineHeight = String(lh);
                p.style.marginBottom = lh * 0.4 + "em";
              });
            }
            if (qrSection) qrSection.style.display = "none";
          } else if (qrSection) {
            const qrPage = getPage(qrSection);
            console.debug(`sigPage=${sigPage}, qrPage=${qrPage}`);
            if (qrPage > sigPage) {
              // Case 1: only QR overflows → hide it
              qrSection.style.display = "none";
              console.debug(
                `Hid QR section to prevent overflow (qrPage=${qrPage})`,
              );
            }
          }

          // ── Same logic for the English section (.page-en) ──────────────
          const englishSection = doc.querySelector(".page-en") as HTMLElement;
          if (!englishSection) return;

          const sigEn = englishSection.querySelector(
            ".closing-signature",
          ) as HTMLElement;
          const qrEn = englishSection.querySelector(
            ".qr-section",
          ) as HTMLElement;
          if (!sigEn) return;

          const parasEn = Array.from(
            englishSection.querySelectorAll(".body-paragraph"),
          ) as HTMLElement[];
          const lastParaEn = parasEn[parasEn.length - 1];
          const lastParaEnPage = lastParaEn ? getPage(lastParaEn) : 0;
          const sigEnPage = getPage(sigEn);
          console.log(
            `[overflow:en] lastParaPage=${lastParaEnPage}, sigPage=${sigEnPage}, qrPage=${qrEn ? getPage(qrEn) : "N/A"}`,
          );
          if (sigEnPage > lastParaEnPage) {
            // Case 2 EN: signature overflows → reduce line-height
            let lh = 2.0;
            const MIN_LH = 1.5;
            while (lh > MIN_LH && getPage(sigEn) > lastParaEnPage) {
              lh = Math.round((lh - 0.05) * 100) / 100;
              parasEn.forEach((p) => {
                p.style.lineHeight = String(lh);
                p.style.marginBottom = lh * 0.4 + "em";
              });
            }
            if (qrEn) qrEn.style.display = "none";
          } else if (qrEn) {
            const qrEnPage = getPage(qrEn);
            if (qrEnPage > sigEnPage) {
              // Case 1 EN: only QR overflows → hide it
              qrEn.style.display = "none";
              console.debug(`Hid EN QR section (qrPage=${qrEnPage})`);
            }
          }
        },
        isJoint ? 36 : 38, // Puppeteer margin.top (matches topMargin variable above)
        isJoint ? 20 : 36, // Puppeteer margin.bottom (matches bottomMargin variable)
      );

      const pdf = await page.pdf({
        format: "A4",
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: this.buildHeaderTemplate(isJoint, logos),
        footerTemplate: this.buildFooterTemplate(isJoint),
        margin: {
          top: topMargin,
          right: "22mm",
          bottom: bottomMargin,
          left: "22mm",
        },
      });
      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }

  /**
   * Build Puppeteer headerTemplate (rendered in top margin on every page).
   *
   * <img> tags in headerTemplate don't load data URIs in Puppeteer's isolated
   * header context. Use CSS background-image instead, which is allowed.
   * height:100% collapses to 0 when the parent has no explicit height — use
   * an explicit px height matching margin.top (38mm ≈ 143px at 96dpi).
   */
  private buildHeaderTemplate(
    isJoint: boolean,
    logos: Record<string, string | null | undefined>,
  ): string {
    // Use mm to match margin.top exactly, regardless of Puppeteer's internal DPI.
    const h = isJoint ? "36mm" : "38mm";
    const px = `-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;font-size:10px;`;

    if (isJoint) {
      const leftBg = logos.left
        ? `background:url('data:image/${logos.leftMime};base64,${logos.left}') no-repeat left center / auto 75%;`
        : "";
      const rightBg = logos.right
        ? `background:url('data:image/${logos.rightMime};base64,${logos.right}') no-repeat right center / auto 75%;`
        : "";
      return (
        `<div style="${px}display:table;width:100%;height:${h};margin:0;padding:0;box-sizing:border-box;border-bottom:1px solid #177246;">` +
        `<div style="${px}display:table-cell;width:38%;height:${h};padding-left:22mm;${leftBg}"></div>` +
        `<div style="${px}display:table-cell;width:62%;height:${h};padding-right:22mm;${rightBg}"></div>` +
        `</div>`
      );
    }

    const logoBg = logos.single
      ? `background:url('data:image/${logos.singleMime};base64,${logos.single}') no-repeat 10mm center / auto 72%;`
      : "";
    return `<div style="${px}display:block;width:100%;height:${h};margin:0;padding:0 22mm;box-sizing:border-box;border-bottom:1px solid #177246;${logoBg}"></div>`;
  }

  /**
   * Build Puppeteer footerTemplate (rendered in bottom margin on every page).
   * Joint documents have no institutional footer.
   */
  private buildFooterTemplate(isJoint: boolean): string {
    if (isJoint) {
      return `<div style="font-size:10px;width:100%;"></div>`;
    }
    return `<div style="-webkit-print-color-adjust:exact;print-color-adjust:exact;font-size:10px;width:100%;margin:0;padding:3px 0 0;position:relative;font-family:'Times New Roman',Times,serif;text-align:center;line-height:1.25;color:#000;box-sizing:border-box;"><div style="position:absolute;top:0;left:0;width:100%;height:1px;background:#177246;"></div><p style="font-weight:bold;color:#CC0000;margin:0;font-size:9px;">Dipartimento Trasporto Aereo</p><p style="font-weight:bold;margin:1px 0 0;color:#CC0000;font-size:7.5px;">Sede di Roma: Via A. Musa, 4 - 00161 ROMA - Tel. 06/44286354 Fax 06/44286410</p><p style="font-weight:bold;margin:1px 0 0;color:#CC0000;font-size:7.5px;">Sede di Fiumicino: Aeroporto L. Da Vinci Tel./Fax 06/659550339</p><p style="margin:1px 0 0;color:#177246;font-size:7px;"><span>C.F. 80421120587 - </span><span style="font-weight:bold;">e-mail: fit.trasportoaereo@cisl.it \u2013 PEC: fitcislnazionale@postecert.it - </span><span>Website: www.fitcisl.org</span></p><p style="margin:1px 0 0;color:#177246;font-size:7px;">Aderente a: International Transport Workers' Federation ITF - European Transport Workers' Federation ETF</p></div>`;
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
        return `<p class="body-paragraph">`;
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

    let italianContent = this.contentToHtml(
      document.aiReviewedContent || document.originalContent,
    );
    if (!isJoint) {
      // For joint communications, add a standard opening line at the end of the content
      italianContent +=
        '<p class="body-content">Come sempre, i vostri rappresentanti FIT-CISL restano a disposizione per qualsiasi dubbio o chiarimento.</p>';
    }
    let englishContent = document.englishTranslation
      ? this.contentToHtml(document.englishTranslation)
      : "";
    if (englishContent && !isJoint) {
      // For joint communications, add a standard opening line at the end of the content
      englishContent +=
        '<p class="body-content">As always, your FIT-CISL representatives remain available for any questions or clarifications.</p>';
    }
    const englishTitle = document.englishTitle || document.title;

    const qrImg = qrBase64
      ? `<img src="data:image/png;base64,${qrBase64}" width="110" height="110" style="display:block;margin:8px auto 0;">`
      : "";

    // ── Closing sections ──────────────────────────────────────────────────
    const jointSignatures = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-top:16mm;font-size:11pt;">
        <strong>FIT-CISL Malta Air Pilot Board</strong>
        <strong>ANPAC Malta Air Company Council</strong>
      </div>`;

    const closingIt = isJoint
      ? `<div class="closing-signature">${jointSignatures}</div>`
      : `<div class="closing-signature">
           <p class="closing-center"><strong>RSA FIT-CISL PILOTI MALTA AIR</strong></p>
           <p class="closing-center" style="color:#177246;"><strong>READY2B FIT-CISL</strong></p>
         </div>
         ${
           qrBase64
             ? `<div class="qr-section">
           <p class="closing-center" style="font-size:9pt;color:#666;margin-top:8px;">Resta aggiornato — entra nel gruppo WhatsApp:</p>
           ${qrImg}
         </div>`
             : ""
         }`;

    const closingEn = isJoint
      ? `<div class="closing-signature">${jointSignatures}</div>`
      : `<div class="closing-signature">
           <p class="closing-center"><strong>RSA FIT-CISL PILOTI MALTA AIR</strong></p>
           <p class="closing-center" style="color:#177246;"><strong>READY2B FIT-CISL</strong></p>
         </div>
         ${
           qrBase64
             ? `<div class="qr-section">
           <p class="closing-center" style="font-size:9pt;color:#666;margin-top:8px;">Stay updated — join the WhatsApp group:</p>
           ${qrImg}
         </div>`
             : ""
         }`;

    return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <title>${this.esc(document.title)}</title>
  <style>
    @page { size: A4; margin: ${isJoint ? "36mm" : "45mm"} 22mm ${isJoint ? "20mm" : "36mm"} 22mm; }
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

    .page     { padding-bottom: 4mm; padding-left: 14mm; padding-right: 14mm; }
    .page-en  { padding-bottom: 4mm; padding-left: 14mm; padding-right: 14mm; page-break-before: always; }

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
      margin-bottom: 12pt;
      line-height: 2.0;
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
      margin-top: 14pt;
      margin-bottom: 6pt;
      color: #000;
    }

    .closing-center {
      text-align: center;
      margin-top: 6pt;
      font-size: 11pt;
    }

    #mm-ruler { width: 10mm; height: 1px; position: absolute; visibility: hidden; }
  </style>
</head>
<body>
  <div id="mm-ruler"></div>
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
