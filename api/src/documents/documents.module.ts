import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { PdfService } from './pdf.service';
import { Document } from './entities/document.entity';
import { OllamaModule } from '../ollama/ollama.module';

@Module({
  imports: [TypeOrmModule.forFeature([Document]), OllamaModule],
  controllers: [DocumentsController],
  providers: [DocumentsService, PdfService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
