import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UsersService } from "./users.service";
import { UsersController } from "./users.controller";
import { User } from "./entities/user.entity";
import { UserStatusHistory } from "./entities/user-status-history.entity";
import { PdfExtractionService } from "./services/pdf-extraction.service";
import { FileStorageService } from "./services/file-storage.service";
import { PdfImageService } from "./services/pdf-image.service";
import { BasesModule } from "../bases/bases.module";
import { ContractsModule } from "../contracts/contracts.module";
import { GradesModule } from "../grades/grades.module";
import { MailModule } from "../mail/mail.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserStatusHistory]),
    BasesModule,
    ContractsModule,
    GradesModule,
    MailModule,
  ],
  controllers: [UsersController],
  providers: [
    UsersService,
    PdfExtractionService,
    FileStorageService,
    PdfImageService,
  ],
  exports: [UsersService],
})
export class UsersModule {}
