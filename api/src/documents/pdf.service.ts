import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as puppeteer from 'puppeteer-core';
import { Document } from './entities/document.entity';

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  constructor(private configService: ConfigService) {}

  /**
   * Generate PDF with CISL letterhead
   */
  async generateDocumentPdf(document: Document): Promise<Buffer> {
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
    // Try to find Chrome/Chromium
    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || 
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    
    return puppeteer.launch({
      executablePath,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }

  /**
   * Generate HTML with CISL letterhead
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
