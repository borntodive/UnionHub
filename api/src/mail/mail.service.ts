import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";
import { User } from "../users/entities/user.entity";

export interface RsaRlsContact {
  nome: string;
  cognome: string;
  telefono?: string | null;
  isRsa: boolean;
  isRls: boolean;
}

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

  async sendWelcomeEmail(
    user: User,
    plainPassword: string,
    contacts: RsaRlsContact[] = [],
  ): Promise<void> {
    const from = this.configService.get<string>(
      "MAIL_FROM",
      "UnionHub <noreply@unionhub.app>",
    );
    const appName = "UnionHub";
    const iosUrl = this.configService.get<string>("APP_STORE_URL", "");
    const androidUrl = this.configService.get<string>("PLAY_STORE_URL", "");

    // ── Section 2: app download links + QR codes ──────────────────────────────
    const qrSize = "140x140";
    const qrBase =
      "https://api.qrserver.com/v1/create-qr-code/?size=" + qrSize + "&data=";

    const buildStoreCell = (label: string, url: string, badgeLabel: string) => {
      if (!url) return "";
      const qrSrc = qrBase + encodeURIComponent(url);
      return `
        <td align="center" style="padding:0 16px;">
          <img src="${qrSrc}" width="140" height="140"
               alt="QR ${badgeLabel}"
               style="display:block;border:1px solid #e0e0e0;border-radius:6px;margin-bottom:10px;" />
          <a href="${url}"
             style="display:inline-block;padding:8px 20px;background:#177246;color:#ffffff;
                    font-size:13px;font-weight:bold;border-radius:20px;text-decoration:none;">
            ${badgeLabel}
          </a>
          <p style="margin:6px 0 0;font-size:12px;color:#888;">${label}</p>
        </td>`;
    };

    const iosCell = buildStoreCell("iPhone / iPad", iosUrl, "App Store");
    const androidCell = buildStoreCell("Android", androidUrl, "Google Play");
    const hasStoreLinks = iosUrl || androidUrl;

    const storeBlock = hasStoreLinks
      ? `
              <p style="margin:24px 0 6px;font-size:15px;font-weight:bold;color:#177246;">
                Scarica l'app
              </p>
              <p style="margin:0 0 16px;font-size:14px;color:#555;line-height:1.5;">
                Inquadra il QR code con la fotocamera del tuo smartphone oppure
                clicca sul pulsante corrispondente al tuo dispositivo.
              </p>
              <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  ${iosCell}
                  ${androidCell}
                </tr>
              </table>`
      : "";

    // ── Section 3: RSA / RLS contacts ─────────────────────────────────────────
    const rsaList = contacts.filter((c) => c.isRsa);
    const rlsList = contacts.filter((c) => c.isRls);

    const buildContactRows = (list: RsaRlsContact[]) =>
      list.length === 0
        ? `<tr>
             <td colspan="2" style="font-size:13px;color:#aaa;padding:10px 16px;
                                    font-style:italic;">
               Nessun rappresentante registrato
             </td>
           </tr>`
        : list
            .map(
              (c, i) => `
          <tr style="background:${i % 2 === 0 ? "#ffffff" : "#fafafa"};">
            <td style="font-size:14px;color:#333;padding:10px 16px;
                       border-top:1px solid #eee;">
              ${c.nome} ${c.cognome}
            </td>
            <td style="font-size:14px;color:#555;padding:10px 16px;
                       border-top:1px solid #eee;">
              ${c.telefono || "—"}
            </td>
          </tr>`,
            )
            .join("");

    const html = `
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Benvenuto nella FIT-CISL</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border-radius:8px;overflow:hidden;
                      box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:#177246;padding:28px 32px;text-align:center;">
              <p style="margin:0 0 4px;font-size:11px;font-weight:bold;color:#a8d5bc;
                        text-transform:uppercase;letter-spacing:2px;">
                Federazione Italiana Trasporti
              </p>
              <span style="font-size:24px;font-weight:bold;color:#ffffff;letter-spacing:1px;">
                FIT-CISL · Piloti Malta Air
              </span>
            </td>
          </tr>

          <!-- Language banner -->
          <tr>
            <td style="background:#f0f7f3;padding:10px 36px;text-align:center;
                       border-bottom:1px solid #d4eadc;">
              <p style="margin:0;font-size:12px;color:#177246;">
                🇮🇹 <strong>Italiano</strong> &nbsp;·&nbsp;
                <a href="#english" style="color:#177246;text-decoration:underline;">
                  🇬🇧 English version below
                </a>
              </p>
            </td>
          </tr>

          <!-- ─── SEZIONE 1 — Benvenuto nel sindacato ─── -->
          <tr>
            <td style="padding:36px 36px 28px;">
              <p style="margin:0 0 6px;font-size:15px;color:#555;">
                Ciao <strong style="color:#222;">${user.nome}</strong>,
              </p>
              <p style="margin:0 0 16px;font-size:15px;color:#444;line-height:1.7;">
                a nome di tutta la <strong>Rappresentanza Sindacale Aziendale FIT-CISL
                Piloti Malta Air</strong>, siamo lieti di darti il benvenuto nella nostra
                organizzazione sindacale.
              </p>
              <p style="margin:0 0 16px;font-size:15px;color:#444;line-height:1.7;">
                La FIT-CISL è il sindacato di riferimento per i lavoratori del settore
                trasporti in Italia e, attraverso la propria struttura aziendale, si
                impegna quotidianamente a tutelare i diritti e gli interessi di ogni
                iscritto, promuovendo relazioni industriali fondate sul dialogo, sulla
                trasparenza e sul rispetto reciproco.
              </p>
              <p style="margin:0;font-size:15px;color:#444;line-height:1.7;">
                La tua adesione rappresenta per noi un valore importante: insieme
                possiamo costruire un ambiente di lavoro più equo e sicuro per tutti
                i colleghi.
              </p>
            </td>
          </tr>

          <!-- ─── SEZIONE 2 — App + credenziali ─── -->
          <tr>
            <td style="padding:0 36px 28px;">
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="border-top:2px solid #177246;">
                <tr>
                  <td style="padding-top:24px;">
                    <p style="margin:0 0 6px;font-size:18px;font-weight:bold;color:#177246;">
                      ${appName} — la tua app sindacale
                    </p>
                    <p style="margin:0 0 20px;font-size:14px;color:#555;line-height:1.6;">
                      Per facilitare la comunicazione e offrire servizi utili direttamente
                      sul tuo smartphone, mettiamo a disposizione l'app ufficiale
                      <strong>${appName}</strong>. Con un unico strumento puoi:
                    </p>

                    <!-- Feature list -->
                    <table width="100%" cellpadding="0" cellspacing="0"
                           style="background:#f0f7f3;border-left:3px solid #177246;
                                  border-radius:0 6px 6px 0;margin-bottom:24px;">
                      <tr>
                        <td style="padding:16px 20px;">
                          <table width="100%" cellpadding="0" cellspacing="8">
                            <tr>
                              <td style="font-size:17px;width:28px;vertical-align:top;padding-top:1px;">📋</td>
                              <td style="font-size:14px;color:#333;line-height:1.5;vertical-align:top;">
                                Consultare e aggiornare il proprio
                                <strong>profilo professionale</strong>
                                (base, contratto, grado e dati di iscrizione).
                              </td>
                            </tr>
                            <tr>
                              <td style="font-size:17px;width:28px;vertical-align:top;padding-top:1px;">📣</td>
                              <td style="font-size:14px;color:#333;line-height:1.5;vertical-align:top;">
                                Inviare <strong>segnalazioni e richieste</strong>
                                direttamente alla rappresentanza sindacale.
                              </td>
                            </tr>
                            <tr>
                              <td style="font-size:17px;width:28px;vertical-align:top;padding-top:1px;">📄</td>
                              <td style="font-size:14px;color:#333;line-height:1.5;vertical-align:top;">
                                Accedere in qualsiasi momento ai
                                <strong>documenti sindacali</strong>,
                                comunicati e contratti.
                              </td>
                            </tr>
                            <tr>
                              <td style="font-size:17px;width:28px;vertical-align:top;padding-top:1px;">💶</td>
                              <td style="font-size:14px;color:#333;line-height:1.5;vertical-align:top;">
                                Utilizzare il <strong>calcolatore busta paga</strong>
                                per stimare la retribuzione netta in base ai parametri
                                del proprio contratto.
                              </td>
                            </tr>
                            <tr>
                              <td style="font-size:17px;width:28px;vertical-align:top;padding-top:1px;">✈️</td>
                              <td style="font-size:14px;color:#333;line-height:1.5;vertical-align:top;">
                                Verificare i limiti di volo e di riposo con il
                                <strong>calcolatore FTL</strong>
                                (EASA Part-ORO.FTL / OMA Malta Air).
                              </td>
                            </tr>
                            <tr>
                              <td style="font-size:17px;width:28px;vertical-align:top;padding-top:1px;">🔔</td>
                              <td style="font-size:14px;color:#333;line-height:1.5;vertical-align:top;">
                                Ricevere <strong>notifiche in tempo reale</strong>
                                su aggiornamenti, comunicati e risposte alle proprie
                                segnalazioni.
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <!-- Credentials box -->
                    <p style="margin:0 0 10px;font-size:15px;font-weight:bold;color:#222;">
                      Le tue credenziali di accesso:
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0"
                           style="background:#f8f9fa;border:1px solid #e0e0e0;
                                  border-radius:6px;margin-bottom:14px;">
                      <tr>
                        <td style="padding:20px 24px;">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="font-size:11px;color:#888;padding-bottom:3px;
                                         text-transform:uppercase;letter-spacing:0.8px;">
                                Username
                              </td>
                            </tr>
                            <tr>
                              <td style="font-size:22px;font-weight:bold;color:#177246;
                                         font-family:monospace;padding-bottom:14px;">
                                ${user.crewcode}
                              </td>
                            </tr>
                            <tr>
                              <td style="font-size:11px;color:#888;padding-bottom:3px;
                                         text-transform:uppercase;letter-spacing:0.8px;">
                                Password temporanea
                              </td>
                            </tr>
                            <tr>
                              <td style="font-size:22px;font-weight:bold;color:#333;
                                         font-family:monospace;">
                                ${plainPassword}
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    <p style="margin:0 0 4px;font-size:13px;color:#e53935;font-weight:bold;">
                      ⚠️ Al primo accesso ti verrà chiesto di impostare una nuova password.
                    </p>
                    <p style="margin:0 0 0;font-size:13px;color:#666;line-height:1.6;">
                      Scegli una password sicura e non condividerla con nessuno.
                    </p>

                    ${storeBlock}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ─── SEZIONE 3 — Contatti RSA e RLS ─── -->
          <tr>
            <td style="padding:0 36px 28px;">
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="border-top:2px solid #177246;">
                <tr>
                  <td style="padding-top:24px;">
                    <p style="margin:0 0 6px;font-size:18px;font-weight:bold;color:#177246;">
                      I tuoi rappresentanti sindacali
                    </p>
                    <p style="margin:0 0 20px;font-size:14px;color:#555;line-height:1.6;">
                      Per qualsiasi necessità i nostri rappresentanti sono a tua
                      completa disposizione.
                    </p>

                    <!-- RSA -->
                    <p style="margin:0 0 8px;font-size:12px;font-weight:bold;color:#177246;
                               text-transform:uppercase;letter-spacing:1px;">
                      RSA — Rappresentanza Sindacale Aziendale
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0"
                           style="border:1px solid #e0e0e0;border-radius:6px;
                                  margin-bottom:20px;overflow:hidden;">
                      <tr style="background:#f0f7f3;">
                        <td style="padding:8px 16px;font-size:11px;font-weight:bold;
                                   color:#177246;text-transform:uppercase;letter-spacing:0.5px;
                                   width:60%;">
                          Nome
                        </td>
                        <td style="padding:8px 16px;font-size:11px;font-weight:bold;
                                   color:#177246;text-transform:uppercase;letter-spacing:0.5px;">
                          Telefono
                        </td>
                      </tr>
                      ${buildContactRows(rsaList)}
                    </table>

                    <!-- RLS -->
                    <p style="margin:0 0 8px;font-size:12px;font-weight:bold;color:#177246;
                               text-transform:uppercase;letter-spacing:1px;">
                      RLS — Rappresentante dei Lavoratori per la Sicurezza
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0"
                           style="border:1px solid #e0e0e0;border-radius:6px;overflow:hidden;">
                      <tr style="background:#f0f7f3;">
                        <td style="padding:8px 16px;font-size:11px;font-weight:bold;
                                   color:#177246;text-transform:uppercase;letter-spacing:0.5px;
                                   width:60%;">
                          Nome
                        </td>
                        <td style="padding:8px 16px;font-size:11px;font-weight:bold;
                                   color:#177246;text-transform:uppercase;letter-spacing:0.5px;">
                          Telefono
                        </td>
                      </tr>
                      ${buildContactRows(rlsList)}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ─── SEZIONE 4 — Ringraziamenti e firma ─── -->
          <tr>
            <td style="padding:0 36px 36px;">
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="border-top:2px solid #177246;">
                <tr>
                  <td style="padding-top:24px;">
                    <p style="margin:0 0 14px;font-size:15px;color:#444;line-height:1.7;">
                      Ti ringraziamo ancora per aver scelto di aderire alla
                      <strong>FIT-CISL</strong>. La tua fiducia è per noi motivo di
                      impegno e responsabilità.
                    </p>
                    <p style="margin:0 0 24px;font-size:15px;color:#444;line-height:1.7;">
                      Siamo certi che questa collaborazione sarà proficua e ci
                      auguriamo di poterti supportare al meglio nel tuo percorso
                      professionale. Non esitare a contattarci per qualsiasi esigenza.
                    </p>
                    <p style="margin:0 0 4px;font-size:15px;color:#444;">
                      Cordiali saluti,
                    </p>
                    <p style="margin:0 0 2px;font-size:15px;font-weight:bold;color:#177246;">
                      RSA FIT-CISL Piloti Malta Air
                    </p>
                    <p style="margin:0;font-size:13px;color:#888;">
                      Federazione Italiana Trasporti — CISL
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ─── ENGLISH DIVIDER ─── -->
          <tr>
            <td id="english" style="background:#177246;padding:20px 36px;text-align:center;">
              <p style="margin:0 0 4px;font-size:11px;font-weight:bold;color:#a8d5bc;
                        text-transform:uppercase;letter-spacing:2px;">
                Federazione Italiana Trasporti
              </p>
              <span style="font-size:22px;font-weight:bold;color:#ffffff;letter-spacing:1px;">
                FIT-CISL · Malta Air Pilots
              </span>
            </td>
          </tr>

          <!-- ─── SECTION 1 — Welcome to the union ─── -->
          <tr>
            <td style="padding:36px 36px 28px;">
              <p style="margin:0 0 6px;font-size:15px;color:#555;">
                Hi <strong style="color:#222;">${user.nome}</strong>,
              </p>
              <p style="margin:0 0 16px;font-size:15px;color:#444;line-height:1.7;">
                on behalf of the entire <strong>RSA FIT-CISL Malta Air Pilots</strong>,
                we are delighted to welcome you to our union.
              </p>
              <p style="margin:0 0 16px;font-size:15px;color:#444;line-height:1.7;">
                FIT-CISL is the reference trade union for transport workers in Italy and,
                through its company-level representation, works every day to protect the
                rights and interests of every member, promoting industrial relations built
                on dialogue, transparency and mutual respect.
              </p>
              <p style="margin:0;font-size:15px;color:#444;line-height:1.7;">
                Your membership is important to us: together we can build a fairer and
                safer working environment for all our colleagues.
              </p>
            </td>
          </tr>

          <!-- ─── SECTION 2 — App + credentials ─── -->
          <tr>
            <td style="padding:0 36px 28px;">
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="border-top:2px solid #177246;">
                <tr>
                  <td style="padding-top:24px;">
                    <p style="margin:0 0 6px;font-size:18px;font-weight:bold;color:#177246;">
                      ${appName} — your union app
                    </p>
                    <p style="margin:0 0 20px;font-size:14px;color:#555;line-height:1.6;">
                      To make communication easier and provide useful services directly
                      on your smartphone, we offer the official <strong>${appName}</strong>
                      app. With a single tool you can:
                    </p>

                    <!-- Feature list EN -->
                    <table width="100%" cellpadding="0" cellspacing="0"
                           style="background:#f0f7f3;border-left:3px solid #177246;
                                  border-radius:0 6px 6px 0;margin-bottom:24px;">
                      <tr>
                        <td style="padding:16px 20px;">
                          <table width="100%" cellpadding="0" cellspacing="8">
                            <tr>
                              <td style="font-size:17px;width:28px;vertical-align:top;padding-top:1px;">📋</td>
                              <td style="font-size:14px;color:#333;line-height:1.5;vertical-align:top;">
                                View and update your <strong>professional profile</strong>
                                (base, contract, grade and membership details).
                              </td>
                            </tr>
                            <tr>
                              <td style="font-size:17px;width:28px;vertical-align:top;padding-top:1px;">📣</td>
                              <td style="font-size:14px;color:#333;line-height:1.5;vertical-align:top;">
                                Submit <strong>reports and requests</strong>
                                directly to your union representatives.
                              </td>
                            </tr>
                            <tr>
                              <td style="font-size:17px;width:28px;vertical-align:top;padding-top:1px;">📄</td>
                              <td style="font-size:14px;color:#333;line-height:1.5;vertical-align:top;">
                                Access <strong>union documents</strong>,
                                circulars and contracts at any time.
                              </td>
                            </tr>
                            <tr>
                              <td style="font-size:17px;width:28px;vertical-align:top;padding-top:1px;">💶</td>
                              <td style="font-size:14px;color:#333;line-height:1.5;vertical-align:top;">
                                Use the <strong>payslip calculator</strong>
                                to estimate your net salary based on your contract parameters.
                              </td>
                            </tr>
                            <tr>
                              <td style="font-size:17px;width:28px;vertical-align:top;padding-top:1px;">✈️</td>
                              <td style="font-size:14px;color:#333;line-height:1.5;vertical-align:top;">
                                Check flight and rest limits with the
                                <strong>FTL calculator</strong>
                                (EASA Part-ORO.FTL / Malta Air OMA).
                              </td>
                            </tr>
                            <tr>
                              <td style="font-size:17px;width:28px;vertical-align:top;padding-top:1px;">🔔</td>
                              <td style="font-size:14px;color:#333;line-height:1.5;vertical-align:top;">
                                Receive <strong>real-time notifications</strong>
                                on updates, circulars and replies to your reports.
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <!-- Credentials box EN -->
                    <p style="margin:0 0 10px;font-size:15px;font-weight:bold;color:#222;">
                      Your login credentials:
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0"
                           style="background:#f8f9fa;border:1px solid #e0e0e0;
                                  border-radius:6px;margin-bottom:14px;">
                      <tr>
                        <td style="padding:20px 24px;">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="font-size:11px;color:#888;padding-bottom:3px;
                                         text-transform:uppercase;letter-spacing:0.8px;">
                                Username
                              </td>
                            </tr>
                            <tr>
                              <td style="font-size:22px;font-weight:bold;color:#177246;
                                         font-family:monospace;padding-bottom:14px;">
                                ${user.crewcode}
                              </td>
                            </tr>
                            <tr>
                              <td style="font-size:11px;color:#888;padding-bottom:3px;
                                         text-transform:uppercase;letter-spacing:0.8px;">
                                Temporary password
                              </td>
                            </tr>
                            <tr>
                              <td style="font-size:22px;font-weight:bold;color:#333;
                                         font-family:monospace;">
                                ${plainPassword}
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    <p style="margin:0 0 4px;font-size:13px;color:#e53935;font-weight:bold;">
                      ⚠️ You will be asked to set a new password on your first login.
                    </p>
                    <p style="margin:0;font-size:13px;color:#666;line-height:1.6;">
                      Please choose a strong password and do not share it with anyone.
                    </p>

                    ${storeBlock}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ─── SECTION 3 — RSA / RLS contacts ─── -->
          <tr>
            <td style="padding:0 36px 28px;">
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="border-top:2px solid #177246;">
                <tr>
                  <td style="padding-top:24px;">
                    <p style="margin:0 0 6px;font-size:18px;font-weight:bold;color:#177246;">
                      Your union representatives
                    </p>
                    <p style="margin:0 0 20px;font-size:14px;color:#555;line-height:1.6;">
                      Our representatives are always available for any question or need.
                    </p>

                    <!-- RSA EN -->
                    <p style="margin:0 0 8px;font-size:12px;font-weight:bold;color:#177246;
                               text-transform:uppercase;letter-spacing:1px;">
                      RSA — Company Union Representatives
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0"
                           style="border:1px solid #e0e0e0;border-radius:6px;
                                  margin-bottom:20px;overflow:hidden;">
                      <tr style="background:#f0f7f3;">
                        <td style="padding:8px 16px;font-size:11px;font-weight:bold;
                                   color:#177246;text-transform:uppercase;letter-spacing:0.5px;
                                   width:60%;">Name</td>
                        <td style="padding:8px 16px;font-size:11px;font-weight:bold;
                                   color:#177246;text-transform:uppercase;letter-spacing:0.5px;">
                          Phone</td>
                      </tr>
                      ${buildContactRows(rsaList)}
                    </table>

                    <!-- RLS EN -->
                    <p style="margin:0 0 8px;font-size:12px;font-weight:bold;color:#177246;
                               text-transform:uppercase;letter-spacing:1px;">
                      RLS — Workers' Safety Representative
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0"
                           style="border:1px solid #e0e0e0;border-radius:6px;overflow:hidden;">
                      <tr style="background:#f0f7f3;">
                        <td style="padding:8px 16px;font-size:11px;font-weight:bold;
                                   color:#177246;text-transform:uppercase;letter-spacing:0.5px;
                                   width:60%;">Name</td>
                        <td style="padding:8px 16px;font-size:11px;font-weight:bold;
                                   color:#177246;text-transform:uppercase;letter-spacing:0.5px;">
                          Phone</td>
                      </tr>
                      ${buildContactRows(rlsList)}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ─── SECTION 4 — Closing & signature ─── -->
          <tr>
            <td style="padding:0 36px 36px;">
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="border-top:2px solid #177246;">
                <tr>
                  <td style="padding-top:24px;">
                    <p style="margin:0 0 14px;font-size:15px;color:#444;line-height:1.7;">
                      Thank you again for choosing to join <strong>FIT-CISL</strong>.
                      Your trust is a source of commitment and responsibility for us.
                    </p>
                    <p style="margin:0 0 24px;font-size:15px;color:#444;line-height:1.7;">
                      We are confident this will be a rewarding partnership and look
                      forward to supporting you throughout your professional journey.
                      Do not hesitate to reach out whenever you need us.
                    </p>
                    <p style="margin:0 0 4px;font-size:15px;color:#444;">
                      Kind regards,
                    </p>
                    <p style="margin:0 0 2px;font-size:15px;font-weight:bold;color:#177246;">
                      RSA FIT-CISL Malta Air Pilots
                    </p>
                    <p style="margin:0;font-size:13px;color:#888;">
                      Federazione Italiana Trasporti — CISL
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8f9fa;padding:16px 36px;text-align:center;
                       border-top:1px solid #eee;">
              <p style="margin:0;font-size:11px;color:#bbb;line-height:1.6;">
                FIT-CISL · Federazione Italiana Trasporti<br/>
                This is an automated message — please do not reply to this email.
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

  async sendRegistrationFormToSecretary(
    user: User,
    pdfBuffer: Buffer,
    originalFilename: string,
  ): Promise<void> {
    const secretaryEmail = this.configService.get<string>("MAIL_SECRETARY", "");
    if (!secretaryEmail) {
      this.logger.warn(
        "MAIL_SECRETARY not configured — skipping secretary notification",
      );
      return;
    }

    const from = this.configService.get<string>(
      "MAIL_FROM",
      "UnionHub <noreply@unionhub.app>",
    );
    const ruoloLabel =
      user.ruolo === "pilot"
        ? "Pilota"
        : user.ruolo === "cabin_crew"
          ? "Cabin Crew"
          : (user.ruolo ?? "—");

    const html = `
<!DOCTYPE html>
<html lang="it">
<head><meta charset="UTF-8" /><title>Nuovo modulo di iscrizione</title></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#177246;padding:24px 32px;">
            <span style="font-size:20px;font-weight:bold;color:#ffffff;">FIT-CISL · Nuovo modulo di iscrizione</span>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            <p style="margin:0 0 16px;font-size:15px;color:#333;">
              È stato caricato un nuovo modulo di iscrizione per il seguente socio:
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa;border:1px solid #e0e0e0;border-radius:6px;margin-bottom:24px;">
              <tr><td style="padding:20px 24px;">
                <table width="100%" cellpadding="0" cellspacing="6">
                  <tr>
                    <td style="font-size:13px;color:#888;width:130px;">Nome</td>
                    <td style="font-size:14px;font-weight:bold;color:#333;">${user.nome} ${user.cognome}</td>
                  </tr>
                  <tr>
                    <td style="font-size:13px;color:#888;">Crewcode</td>
                    <td style="font-size:14px;font-weight:bold;color:#177246;font-family:monospace;">${user.crewcode}</td>
                  </tr>
                  <tr>
                    <td style="font-size:13px;color:#888;">Email</td>
                    <td style="font-size:14px;color:#333;">${user.email}</td>
                  </tr>
                  <tr>
                    <td style="font-size:13px;color:#888;">Ruolo</td>
                    <td style="font-size:14px;color:#333;">${ruoloLabel}</td>
                  </tr>
                </table>
              </td></tr>
            </table>
            <p style="margin:0;font-size:13px;color:#888;">
              Il modulo è allegato a questa email in formato PDF.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f8f9fa;padding:16px 32px;text-align:center;border-top:1px solid #eee;">
            <p style="margin:0;font-size:12px;color:#aaa;">
              FIT-CISL · Questa è un'email automatica, non rispondere a questo messaggio.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    try {
      await this.transporter.sendMail({
        from,
        to: secretaryEmail,
        subject: `Modulo iscrizione — ${user.cognome} ${user.nome} (${user.crewcode})`,
        html,
        attachments: [
          {
            filename: originalFilename.endsWith(".pdf")
              ? originalFilename
              : `${originalFilename}.pdf`,
            content: pdfBuffer,
            contentType: "application/pdf",
          },
        ],
      });
      this.logger.log(
        `Registration form sent to secretary for ${user.crewcode}`,
      );
    } catch (err: any) {
      this.logger.error(
        `Failed to send registration form to secretary for ${user.crewcode}: ${err.message}`,
      );
    }
  }
}
