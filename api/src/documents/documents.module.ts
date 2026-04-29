import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DocumentsController } from "./documents.controller";
import { DocumentsPublicController } from "./documents-public.controller";
import { DocumentsService } from "./documents.service";
import { PdfService } from "./pdf.service";
import { Document } from "./entities/document.entity";
import { AiModule } from "../ai/ai.module";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Document]),
    AiModule,
    NotificationsModule,
  ],
  controllers: [DocumentsController, DocumentsPublicController],
  providers: [DocumentsService, PdfService],
  exports: [DocumentsService, PdfService],
})
export class DocumentsModule {}
