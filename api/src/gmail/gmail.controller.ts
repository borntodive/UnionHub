import { Controller, Get, Param, Query, UseGuards, Req } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { Ruolo } from "../common/enums/ruolo.enum";
import { GmailService } from "./gmail.service";

@Controller("gmail")
@UseGuards(JwtAuthGuard)
export class GmailController {
  constructor(private readonly gmailService: GmailService) {}

  @Get("inbox")
  listEmails(
    @Req() req: any,
    @Query("pageToken") pageToken?: string,
    @Query("ruolo") ruolo?: string,
  ) {
    return this.gmailService.listEmails(
      req.user.userId,
      pageToken,
      ruolo ? this.parseRuoloOptional(ruolo) : undefined,
    );
  }

  @Get("inbox/:id")
  getEmail(
    @Req() req: any,
    @Param("id") id: string,
    @Query("ruolo") ruolo?: string,
  ) {
    return this.gmailService.getEmail(
      req.user.userId,
      id,
      ruolo ? this.parseRuoloOptional(ruolo) : undefined,
    );
  }

  @Get("inbox/:id/attachment")
  getAttachment(
    @Req() req: any,
    @Param("id") messageId: string,
    @Query("attachmentId") attachmentId: string,
    @Query("ruolo") ruolo?: string,
  ) {
    return this.gmailService.getAttachment(
      req.user.userId,
      messageId,
      attachmentId,
      ruolo ? this.parseRuoloOptional(ruolo) : undefined,
    );
  }

  private parseRuoloOptional(value: string): Ruolo | undefined {
    if (value === Ruolo.PILOT || value === Ruolo.CABIN_CREW)
      return value as Ruolo;
    return undefined;
  }
}
