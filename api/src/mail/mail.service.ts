import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";
import { User } from "../users/entities/user.entity";

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>(
        "MAIL_HOST",
        "sandbox.smtp.mailtrap.io",
      ),
      port: this.configService.get<number>("MAIL_PORT", 587),
      auth: {
        user: this.configService.get<string>("MAIL_USER", ""),
        pass: this.configService.get<string>("MAIL_PASS", ""),
      },
    });
  }

  async sendWelcomeEmail(user: User, plainPassword: string): Promise<void> {
    const from = this.configService.get<string>(
      "MAIL_FROM",
      "UnionHub <noreply@unionhub.app>",
    );
    const appName = "UnionHub";

    const html = `
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Benvenuto in ${appName}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:#177246;padding:28px 32px;text-align:center;">
              <span style="font-size:22px;font-weight:bold;color:#ffffff;letter-spacing:1px;">
                FIT-CISL · ${appName}
              </span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;font-size:16px;color:#333;">
                Ciao <strong>${user.nome} ${user.cognome}</strong>,
              </p>
              <p style="margin:0 0 24px;font-size:15px;color:#555;line-height:1.6;">
                Il tuo account ${appName} è stato creato. Puoi accedere all'app con le seguenti credenziali:
              </p>

              <!-- Credentials box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa;border:1px solid #e0e0e0;border-radius:6px;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-size:13px;color:#888;padding-bottom:4px;text-transform:uppercase;letter-spacing:0.5px;">Username</td>
                      </tr>
                      <tr>
                        <td style="font-size:20px;font-weight:bold;color:#177246;font-family:monospace;padding-bottom:16px;">${user.crewcode}</td>
                      </tr>
                      <tr>
                        <td style="font-size:13px;color:#888;padding-bottom:4px;text-transform:uppercase;letter-spacing:0.5px;">Password temporanea</td>
                      </tr>
                      <tr>
                        <td style="font-size:20px;font-weight:bold;color:#333;font-family:monospace;">${plainPassword}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;font-size:14px;color:#e53935;font-weight:bold;">
                ⚠️ Al primo accesso ti verrà chiesto di cambiare la password.
              </p>
              <p style="margin:0 0 24px;font-size:14px;color:#555;line-height:1.6;">
                Ti consigliamo di scegliere una password sicura e di non condividerla con nessuno.
              </p>

              <p style="margin:0;font-size:14px;color:#888;border-top:1px solid #eee;padding-top:20px;line-height:1.6;">
                Per assistenza contatta il tuo amministratore di riferimento.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8f9fa;padding:16px 32px;text-align:center;border-top:1px solid #eee;">
              <p style="margin:0;font-size:12px;color:#aaa;">
                FIT-CISL · Federazione Italiana Trasporti<br/>
                Questa è un'email automatica, non rispondere a questo messaggio.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    try {
      await this.transporter.sendMail({
        from,
        to: user.email,
        subject: `Benvenuto in ${appName} — le tue credenziali di accesso`,
        html,
      });
      this.logger.log(`Welcome email sent to ${user.email} (${user.crewcode})`);
    } catch (err: any) {
      // Never block user creation for email failures
      this.logger.error(
        `Failed to send welcome email to ${user.email}: ${err.message}`,
      );
    }
  }
}
