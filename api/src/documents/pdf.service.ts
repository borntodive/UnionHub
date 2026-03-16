import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as puppeteer from 'puppeteer-core';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';
import { Document } from './entities/document.entity';

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);
  private readonly templatePath: string;

  constructor(private configService: ConfigService) {
    this.templatePath = path.join(process.cwd(), 'templates', 'letterhead.pdf');
  }

  /**
   * Check if custom template exists
   */
  hasCustomTemplate(): boolean {
    return fs.existsSync(this.templatePath);
  }

  /**
   * Generate PDF with custom letterhead template
   */
  async generateDocumentPdf(document: Document): Promise<Buffer> {
    this.logger.debug(`Template path: ${this.templatePath}`);
    this.logger.debug(`Template exists: ${this.hasCustomTemplate()}`);
    
    if (this.hasCustomTemplate()) {
      this.logger.debug('Using custom template');
      return this.generateWithTemplate(document);
    } else {
      this.logger.debug('Using HTML fallback');
      return this.generateWithHtml(document);
    }
  }

  /**
   * Generate PDF using custom template PDF
   */
  private async generateWithTemplate(document: Document): Promise<Buffer> {
    try {
      // Load template
      const templateBytes = fs.readFileSync(this.templatePath);
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
      const today = new Date().toLocaleDateString('it-IT', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
      
      firstPage.drawText(today, {
        x: width - 150,
        y: height - 100,
        size: 10,
        font,
        color: rgb(0.4, 0.4, 0.4),
      });
      
      // Add title (remove newlines for PDF rendering)
      const title = document.title.replace(/\n/g, ' ');
      const titleWidth = boldFont.widthOfTextAtSize(title, 16);
      firstPage.drawText(title, {
        x: (width - titleWidth) / 2,
        y: height - 180,
        size: 16,
        font: boldFont,
        color: rgb(0.09, 0.45, 0.27), // CISL green
      });
      
      // Add content (wrapped text)
      const content = document.aiReviewedContent || document.originalContent;
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
        const headerText = 'English Translation / Traduzione Inglese';
        const headerWidth = boldFont.widthOfTextAtSize(headerText, 12);
        engPage.drawText(headerText, {
          x: width - headerWidth - 60,
          y: height - 100,
          size: 12,
          font: boldFont,
          color: rgb(0.85, 0.05, 0.2), // CISL red
        });
        
        // English title (use translated title or fallback to Italian, remove newlines)
        const engTitle = (document.englishTitle || document.title).replace(/\n/g, ' ');
        const engTitleWidth = boldFont.widthOfTextAtSize(engTitle, 16);
        engPage.drawText(engTitle, {
          x: (width - engTitleWidth) / 2,
          y: height - 180,
          size: 16,
          font: boldFont,
          color: rgb(0.09, 0.45, 0.27),
        });
        
        // English content (same margin as Italian)
        const engLines = this.wrapText(document.englishTranslation, 70);
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
      }
      
      // Save PDF
      const pdfBytes = await pdfDoc.save();
      return Buffer.from(pdfBytes);
      
    } catch (error) {
      this.logger.error('Failed to generate PDF with template:', error);
      // Fallback to HTML generation
      return this.generateWithHtml(document);
    }
  }

  /**
   * Generate PDF using HTML (fallback)
   */
  private async generateWithHtml(document: Document): Promise<Buffer> {
    const browser = await this.launchBrowser();
    
    try {
      const page = await browser.newPage();
      
      const html = this.generateHtml(document);
      
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
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
    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || 
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    
    return puppeteer.launch({
      executablePath,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }

  /**
   * Wrap text to fit within max width
   */
  private wrapText(text: string, maxChars: number): string[] {
    const lines: string[] = [];
    const paragraphs = text.split('\n');
    
    for (const paragraph of paragraphs) {
      const words = paragraph.split(' ');
      let currentLine = '';
      
      for (const word of words) {
        if ((currentLine + word).length > maxChars) {
          lines.push(currentLine.trim());
          currentLine = word + ' ';
        } else {
          currentLine += word + ' ';
        }
      }
      
      if (currentLine.trim()) {
        lines.push(currentLine.trim());
      }
      
      // Add empty line between paragraphs
      lines.push('');
    }
    
    return lines;
  }

  /**
   * Generate HTML with CISL letterhead (fallback)
   */
  private generateHtml(document: Document): string {
    const today = new Date().toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    return `
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${document.title}</title>
  <style>
    @page {
      margin: 0;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Times New Roman', Georgia, serif;
      font-size: 12pt;
      line-height: 1.6;
      color: #333;
    }
    
    .letterhead {
      background: linear-gradient(135deg, #177246 0%, #0f5735 100%);
      color: white;
      padding: 30px 40px;
      text-align: center;
    }
    
    .letterhead-logo {
      font-size: 28pt;
      font-weight: bold;
      margin-bottom: 10px;
      letter-spacing: 2px;
    }
    
    .letterhead-org {
      font-size: 14pt;
      font-weight: 600;
      margin-bottom: 5px;
    }
    
    .letterhead-dept {
      font-size: 11pt;
      opacity: 0.9;
    }
    
    .content {
      padding: 40px;
      max-width: 100%;
    }
    
    .date {
      text-align: right;
      margin-bottom: 30px;
      font-style: italic;
      color: #666;
    }
    
    .title {
      font-size: 16pt;
      font-weight: bold;
      margin-bottom: 30px;
      text-align: center;
      color: #177246;
      text-transform: uppercase;
    }
    
    .body-text {
      text-align: justify;
      white-space: pre-wrap;
    }
    
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 2px solid #177246;
      font-size: 10pt;
      color: #666;
    }
    
    .footer-contact {
      text-align: center;
    }
    
    .english-version {
      page-break-before: always;
      padding: 40px;
    }
    
    .english-header {
      background: #f5f5f5;
      padding: 15px 20px;
      margin-bottom: 30px;
      border-left: 4px solid #DA0E32;
    }
    
    .english-label {
      font-size: 10pt;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
  </style>
</head>
<body>
  <!-- Italian Version -->
  <div class="letterhead">
    <div class="letterhead-logo">CISL</div>
    <div class="letterhead-org">Confederazione Italiana Sindacati Lavoratori</div>
    <div class="letterhead-dept">Trasporti - Sezione Aerea</div>
  </div>
  
  <div class="content">
    <div class="date">${today}</div>
    
    <h1 class="title">${document.title}</h1>
    
    <div class="body-text">${document.aiReviewedContent || document.originalContent}</div>
    
    <div class="footer">
      <div class="footer-contact">
        <strong>CISL Trasporti</strong> | Via dei Frentani, 4 - 00185 Roma<br>
        Tel: +39 06 4425.1 | Email: trasporti@cisl.it | www.cisl.it
      </div>
    </div>
  </div>
  
  ${document.englishTranslation ? `
  <!-- English Version -->
  <div class="english-version">
    <div class="english-header">
      <div class="english-label">English Translation / Traduzione Inglese</div>
    </div>
    
    <h1 class="title">${document.title}</h1>
    
    <div class="body-text">${document.englishTranslation}</div>
    
    <div class="footer">
      <div class="footer-contact">
        <strong>CISL Transport</strong> | Via dei Frentani, 4 - 00185 Rome, Italy<br>
        Phone: +39 06 4425.1 | Email: trasporti@cisl.it | www.cisl.it
      </div>
    </div>
  </div>
  ` : ''}
</body>
</html>
    `;
  }
}
