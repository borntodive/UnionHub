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
  isUSO: boolean;
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
      "FIT-CISL Malta Air Pilot Board <pilmalta.fitcisl@gmail.com>",
    );
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

    // ── Section 3: RSA / RLS / USO contacts ──────────────────────────────────
    const rsaList = contacts.filter((c) => c.isRsa);
    const rlsList = contacts.filter((c) => c.isRls);
    const usoList = contacts.filter((c) => c.isUSO);

    const buildContactRows = (
      list: RsaRlsContact[],
      emptyLabel = "Nessun rappresentante registrato",
    ) =>
      list.length === 0
        ? `<tr>
             <td colspan="2" style="font-size:13px;color:#aaa;padding:10px 16px;
                                    font-style:italic;">
               ${emptyLabel}
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
               style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:#177246;padding:28px 32px;text-align:center;">
              <p style="margin:0 0 4px;font-size:11px;font-weight:bold;color:#a8d5bc;text-transform:uppercase;letter-spacing:2px;">
                Federazione Italiana Trasporti
              </p>
              <span style="font-size:24px;font-weight:bold;color:#ffffff;letter-spacing:1px;">
                FIT-CISL · Piloti Malta Air
              </span>
            </td>
          </tr>

          <!-- Language banner -->
          <tr>
            <td style="background:#f0f7f3;padding:10px 36px;text-align:center;border-bottom:1px solid #d4eadc;">
              <p style="margin:0;font-size:12px;color:#177246;">
                🇮🇹 <strong>Italiano</strong> &nbsp;·&nbsp;
                <a href="#english" style="color:#177246;text-decoration:underline;">🇬🇧 English version below</a>
              </p>
            </td>
          </tr>

          <!-- SEZIONE 1 -->
          <tr>
            <td style="padding:36px 36px 28px;">
              <p style="margin:0 0 8px;font-size:15px;color:#555;">
                Ciao <strong style="color:#222;">${user.nome}</strong>,
              </p>
              <p style="margin:0 0 16px;font-size:15px;color:#444;line-height:1.7;">
                a nome della <strong>Rappresentanza Sindacale Aziendale FIT-CISL Piloti Malta Air</strong>,
                siamo lieti di darti il benvenuto nella nostra organizzazione sindacale.
              </p>
              <p style="margin:0 0 16px;font-size:15px;color:#444;line-height:1.7;">
                Entrare nella <strong>CISL</strong> significa far parte di una delle principali organizzazioni
                sindacali italiane, impegnata nella tutela e nella valorizzazione del lavoro attraverso
                il dialogo, la contrattazione e la partecipazione.
              </p>
              <p style="margin:0 0 16px;font-size:15px;color:#444;line-height:1.7;">
                All'interno della Confederazione, la <strong>FIT-CISL</strong> rappresenta i lavoratori
                del settore trasporti e, nel nostro contesto, opera nell'ambito dell'aviazione,
                supportando i professionisti del trasporto aereo e del sistema aeroportuale.
              </p>
              <p style="margin:0;font-size:15px;color:#444;line-height:1.7;">
                La tua iscrizione rafforza la nostra comunità e contribuisce a rendere più forte
                la rappresentanza dei lavoratori, a tutela dei diritti, della sicurezza e della dignità professionale.
              </p>
            </td>
          </tr>

          <!-- SEZIONE 2 -->
          <tr>
            <td style="padding:0 36px 28px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="border-top:2px solid #177246;">
                <tr>
                  <td style="padding-top:24px;">
                    <p style="margin:0 0 6px;font-size:18px;font-weight:bold;color:#177246;">
                      UnionHub — la tua app sindacale
                    </p>
                    <p style="margin:0 0 20px;font-size:14px;color:#555;line-height:1.6;">
                      Per facilitare la comunicazione e offrire servizi utili direttamente sul tuo smartphone,
                      mettiamo a disposizione l'app ufficiale <strong>UnionHub</strong>. Con un unico strumento puoi:
                    </p>

                    <table width="100%" cellpadding="0" cellspacing="0"
                           style="background:#f0f7f3;border-left:3px solid #177246;border-radius:0 6px 6px 0;margin-bottom:24px;">
                      <tr>
                        <td style="padding:16px 20px;">
                          <table width="100%" cellpadding="0" cellspacing="8">
                            <tr>
                              <td style="font-size:17px;width:28px;vertical-align:top;">📋</td>
                              <td style="font-size:14px;color:#333;line-height:1.5;vertical-align:top;">
                                Consultare e aggiornare il tuo <strong>profilo professionale</strong>.
                              </td>
                            </tr>
                            <tr>
                              <td style="font-size:17px;width:28px;vertical-align:top;">📣</td>
                              <td style="font-size:14px;color:#333;line-height:1.5;vertical-align:top;">
                                Inviare <strong>segnalazioni e richieste</strong> direttamente alla rappresentanza sindacale.
                              </td>
                            </tr>
                            <tr>
                              <td style="font-size:17px;width:28px;vertical-align:top;">📄</td>
                              <td style="font-size:14px;color:#333;line-height:1.5;vertical-align:top;">
                                Accedere a <strong>documenti sindacali</strong>, comunicati e contratti.
                              </td>
                            </tr>
                            <tr>
                              <td style="font-size:17px;width:28px;vertical-align:top;">💶</td>
                              <td style="font-size:14px;color:#333;line-height:1.5;vertical-align:top;">
                                Utilizzare il <strong>calcolatore busta paga</strong> per stimare la retribuzione netta.
                              </td>
                            </tr>
                            <tr>
                              <td style="font-size:17px;width:28px;vertical-align:top;">✈️</td>
                              <td style="font-size:14px;color:#333;line-height:1.5;vertical-align:top;">
                                Verificare i limiti di volo e riposo con il <strong>calcolatore FTL</strong>.
                              </td>
                            </tr>
                            <tr>
                              <td style="font-size:17px;width:28px;vertical-align:top;">🔔</td>
                              <td style="font-size:14px;color:#333;line-height:1.5;vertical-align:top;">
                                Ricevere <strong>notifiche in tempo reale</strong> su aggiornamenti e comunicazioni.
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <p style="margin:0 0 10px;font-size:15px;font-weight:bold;color:#222;">
                      Le tue credenziali di accesso
                    </p>

                    <table width="100%" cellpadding="0" cellspacing="0"
                           style="background:#f8f9fa;border:1px solid #e0e0e0;border-radius:6px;margin-bottom:14px;">
                      <tr>
                        <td style="padding:20px 24px;">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="font-size:11px;color:#888;padding-bottom:3px;text-transform:uppercase;letter-spacing:0.8px;">
                                Username
                              </td>
                            </tr>
                            <tr>
                              <td style="font-size:22px;font-weight:bold;color:#177246;font-family:monospace;padding-bottom:14px;">
                                ${user.crewcode}
                              </td>
                            </tr>
                            <tr>
                              <td style="font-size:11px;color:#888;padding-bottom:3px;text-transform:uppercase;letter-spacing:0.8px;">
                                Password temporanea
                              </td>
                            </tr>
                            <tr>
                              <td style="font-size:22px;font-weight:bold;color:#333;font-family:monospace;">
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
                    <p style="margin:0;font-size:13px;color:#666;line-height:1.6;">
                      Ti invitiamo a scegliere una password sicura e a non condividerla con nessuno.
                    </p>

                    ${storeBlock}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- SEZIONE 3 -->
          <tr>
            <td style="padding:0 36px 28px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="border-top:2px solid #177246;">
                <tr>
                  <td style="padding-top:24px;">
                    <p style="margin:0 0 6px;font-size:18px;font-weight:bold;color:#177246;">
                      I tuoi riferimenti sindacali
                    </p>
                    <p style="margin:0 0 14px;font-size:14px;color:#555;line-height:1.6;">
                      Per ogni esigenza, i nostri rappresentanti sono a tua disposizione.
                    </p>

                    <table width="100%" cellpadding="0" cellspacing="0"
                           style="background:#f8f9fa;border:1px solid #e6e6e6;border-radius:6px;margin-bottom:20px;">
                      <tr>
                        <td style="padding:16px 18px;">
                          <p style="margin:0 0 10px;font-size:13px;color:#333;line-height:1.6;">
                            <strong style="color:#177246;">RSA</strong> — rappresentano i lavoratori nei rapporti con l'azienda
                            e seguono le principali questioni sindacali e contrattuali.
                          </p>
                          <p style="margin:0 0 10px;font-size:13px;color:#333;line-height:1.6;">
                            <strong style="color:#177246;">RLS</strong> — si occupano dei temi legati alla salute,
                            alla sicurezza e alle condizioni di lavoro.
                          </p>
                          <p style="margin:0;font-size:13px;color:#333;line-height:1.6;">
                            <strong style="color:#177246;">Collaboratore Sindacale</strong> — affianca RSA e RLS,
                            facilita la comunicazione con gli iscritti e offre un primo punto di ascolto e orientamento.
                          </p>
                        </td>
                      </tr>
                    </table>

                    <!-- RSA -->
                    <p style="margin:0 0 8px;font-size:12px;font-weight:bold;color:#177246;text-transform:uppercase;letter-spacing:1px;">
                      RSA — Rappresentanza Sindacale Aziendale
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0"
                           style="border:1px solid #e0e0e0;border-radius:6px;margin-bottom:20px;overflow:hidden;">
                      <tr style="background:#f0f7f3;">
                        <td style="padding:8px 16px;font-size:11px;font-weight:bold;color:#177246;text-transform:uppercase;letter-spacing:0.5px;width:60%;">Nome</td>
                        <td style="padding:8px 16px;font-size:11px;font-weight:bold;color:#177246;text-transform:uppercase;letter-spacing:0.5px;">Telefono</td>
                      </tr>
                      ${buildContactRows(rsaList)}
                    </table>

                    <!-- RLS -->
                    <p style="margin:0 0 8px;font-size:12px;font-weight:bold;color:#177246;text-transform:uppercase;letter-spacing:1px;">
                      RLS — Rappresentante dei Lavoratori per la Sicurezza
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0"
                           style="border:1px solid #e0e0e0;border-radius:6px;overflow:hidden;margin-bottom:20px;">
                      <tr style="background:#f0f7f3;">
                        <td style="padding:8px 16px;font-size:11px;font-weight:bold;color:#177246;text-transform:uppercase;letter-spacing:0.5px;width:60%;">Nome</td>
                        <td style="padding:8px 16px;font-size:11px;font-weight:bold;color:#177246;text-transform:uppercase;letter-spacing:0.5px;">Telefono</td>
                      </tr>
                      ${buildContactRows(rlsList)}
                    </table>

                    <!-- Collaboratore Sindacale -->
                    <p style="margin:0 0 8px;font-size:12px;font-weight:bold;color:#177246;text-transform:uppercase;letter-spacing:1px;">
                      Collaboratore Sindacale
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0"
                           style="border:1px solid #e0e0e0;border-radius:6px;overflow:hidden;">
                      <tr style="background:#f0f7f3;">
                        <td style="padding:8px 16px;font-size:11px;font-weight:bold;color:#177246;text-transform:uppercase;letter-spacing:0.5px;width:60%;">Nome</td>
                        <td style="padding:8px 16px;font-size:11px;font-weight:bold;color:#177246;text-transform:uppercase;letter-spacing:0.5px;">Telefono</td>
                      </tr>
                      ${buildContactRows(usoList, "Nessun collaboratore registrato")}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- SEZIONE 4 -->
          <tr>
            <td style="padding:0 36px 36px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="border-top:2px solid #177246;">
                <tr>
                  <td style="padding-top:24px;">
                    <p style="margin:0 0 14px;font-size:15px;color:#444;line-height:1.7;">
                      Ti ringraziamo per aver scelto di aderire alla <strong>FIT-CISL</strong>.
                      La tua fiducia rappresenta per noi un impegno concreto.
                    </p>
                    <p style="margin:0 0 24px;font-size:15px;color:#444;line-height:1.7;">
                      Siamo a tua disposizione per accompagnarti e supportarti nel tuo percorso professionale.
                      Non esitare a contattarci per qualsiasi necessità.
                    </p>
                    <p style="margin:0 0 4px;font-size:15px;color:#444;">Cordiali saluti,</p>
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

          <!-- ENGLISH HEADER -->
          <tr>
            <td id="english" style="background:#177246;padding:20px 36px;text-align:center;">
              <p style="margin:0 0 4px;font-size:11px;font-weight:bold;color:#a8d5bc;text-transform:uppercase;letter-spacing:2px;">
                Federazione Italiana Trasporti
              </p>
              <span style="font-size:22px;font-weight:bold;color:#ffffff;letter-spacing:1px;">
                FIT-CISL · Malta Air Pilots
              </span>
            </td>
          </tr>

          <!-- EN SECTION 1 -->
          <tr>
            <td style="padding:36px 36px 28px;">
              <p style="margin:0 0 8px;font-size:15px;color:#555;">
                Hi <strong style="color:#222;">${user.nome}</strong>,
              </p>
              <p style="margin:0 0 16px;font-size:15px;color:#444;line-height:1.7;">
                on behalf of the <strong>RSA FIT-CISL Malta Air Pilots</strong>,
                we are pleased to welcome you to our union.
              </p>
              <p style="margin:0 0 16px;font-size:15px;color:#444;line-height:1.7;">
                By joining <strong>CISL</strong>, you become part of one of Italy's main trade union organisations,
                committed to protecting and promoting workers through dialogue, collective bargaining and participation.
              </p>
              <p style="margin:0 0 16px;font-size:15px;color:#444;line-height:1.7;">
                Within the Confederation, <strong>FIT-CISL</strong> represents transport workers and,
                in our specific context, operates in the aviation sector, supporting professionals working
                in air transport and within the airport system.
              </p>
              <p style="margin:0;font-size:15px;color:#444;line-height:1.7;">
                Your membership strengthens our community and helps reinforce workers' representation,
                protecting rights, safety and professional dignity.
              </p>
            </td>
          </tr>

          <!-- EN SECTION 2 -->
          <tr>
            <td style="padding:0 36px 28px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="border-top:2px solid #177246;">
                <tr>
                  <td style="padding-top:24px;">
                    <p style="margin:0 0 6px;font-size:18px;font-weight:bold;color:#177246;">
                      UnionHub — your union app
                    </p>
                    <p style="margin:0 0 20px;font-size:14px;color:#555;line-height:1.6;">
                      To make communication easier and provide useful services directly on your smartphone,
                      we offer the official <strong>UnionHub</strong> app. With a single tool you can:
                    </p>

                    <table width="100%" cellpadding="0" cellspacing="0"
                           style="background:#f0f7f3;border-left:3px solid #177246;border-radius:0 6px 6px 0;margin-bottom:24px;">
                      <tr>
                        <td style="padding:16px 20px;">
                          <table width="100%" cellpadding="0" cellspacing="8">
                            <tr>
                              <td style="font-size:17px;width:28px;vertical-align:top;">📋</td>
                              <td style="font-size:14px;color:#333;line-height:1.5;vertical-align:top;">
                                View and update your <strong>professional profile</strong>.
                              </td>
                            </tr>
                            <tr>
                              <td style="font-size:17px;width:28px;vertical-align:top;">📣</td>
                              <td style="font-size:14px;color:#333;line-height:1.5;vertical-align:top;">
                                Submit <strong>reports and requests</strong> directly to union representatives.
                              </td>
                            </tr>
                            <tr>
                              <td style="font-size:17px;width:28px;vertical-align:top;">📄</td>
                              <td style="font-size:14px;color:#333;line-height:1.5;vertical-align:top;">
                                Access <strong>union documents</strong>, circulars and agreements.
                              </td>
                            </tr>
                            <tr>
                              <td style="font-size:17px;width:28px;vertical-align:top;">💶</td>
                              <td style="font-size:14px;color:#333;line-height:1.5;vertical-align:top;">
                                Use the <strong>payslip calculator</strong> to estimate your net salary.
                              </td>
                            </tr>
                            <tr>
                              <td style="font-size:17px;width:28px;vertical-align:top;">✈️</td>
                              <td style="font-size:14px;color:#333;line-height:1.5;vertical-align:top;">
                                Check flight and rest limits with the <strong>FTL calculator</strong>.
                              </td>
                            </tr>
                            <tr>
                              <td style="font-size:17px;width:28px;vertical-align:top;">🔔</td>
                              <td style="font-size:14px;color:#333;line-height:1.5;vertical-align:top;">
                                Receive <strong>real-time notifications</strong> on updates and communications.
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <p style="margin:0 0 10px;font-size:15px;font-weight:bold;color:#222;">
                      Your login credentials
                    </p>

                    <table width="100%" cellpadding="0" cellspacing="0"
                           style="background:#f8f9fa;border:1px solid #e0e0e0;border-radius:6px;margin-bottom:14px;">
                      <tr>
                        <td style="padding:20px 24px;">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="font-size:11px;color:#888;padding-bottom:3px;text-transform:uppercase;letter-spacing:0.8px;">
                                Username
                              </td>
                            </tr>
                            <tr>
                              <td style="font-size:22px;font-weight:bold;color:#177246;font-family:monospace;padding-bottom:14px;">
                                ${user.crewcode}
                              </td>
                            </tr>
                            <tr>
                              <td style="font-size:11px;color:#888;padding-bottom:3px;text-transform:uppercase;letter-spacing:0.8px;">
                                Temporary password
                              </td>
                            </tr>
                            <tr>
                              <td style="font-size:22px;font-weight:bold;color:#333;font-family:monospace;">
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

          <!-- EN SECTION 3 -->
          <tr>
            <td style="padding:0 36px 28px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="border-top:2px solid #177246;">
                <tr>
                  <td style="padding-top:24px;">
                    <p style="margin:0 0 6px;font-size:18px;font-weight:bold;color:#177246;">
                      Your union contacts
                    </p>
                    <p style="margin:0 0 14px;font-size:14px;color:#555;line-height:1.6;">
                      Our representatives are available whenever you may need support.
                    </p>

                    <table width="100%" cellpadding="0" cellspacing="0"
                           style="background:#f8f9fa;border:1px solid #e6e6e6;border-radius:6px;margin-bottom:20px;">
                      <tr>
                        <td style="padding:16px 18px;">
                          <p style="margin:0 0 10px;font-size:13px;color:#333;line-height:1.6;">
                            <strong style="color:#177246;">RSA</strong> — represent workers in dealings with the company
                            and handle the main union and contractual matters.
                          </p>
                          <p style="margin:0 0 10px;font-size:13px;color:#333;line-height:1.6;">
                            <strong style="color:#177246;">RLS</strong> — focus on health, safety and working conditions.
                          </p>
                          <p style="margin:0;font-size:13px;color:#333;line-height:1.6;">
                            <strong style="color:#177246;">Union Support Officer</strong> — supports RSA and RLS,
                            facilitates communication with members and provides a first point of contact.
                          </p>
                        </td>
                      </tr>
                    </table>

                    <p style="margin:0 0 8px;font-size:12px;font-weight:bold;color:#177246;text-transform:uppercase;letter-spacing:1px;">
                      RSA — Company Union Representatives
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0"
                           style="border:1px solid #e0e0e0;border-radius:6px;margin-bottom:20px;overflow:hidden;">
                      <tr style="background:#f0f7f3;">
                        <td style="padding:8px 16px;font-size:11px;font-weight:bold;color:#177246;text-transform:uppercase;letter-spacing:0.5px;width:60%;">Name</td>
                        <td style="padding:8px 16px;font-size:11px;font-weight:bold;color:#177246;text-transform:uppercase;letter-spacing:0.5px;">Phone</td>
                      </tr>
                      ${buildContactRows(rsaList)}
                    </table>

                    <p style="margin:0 0 8px;font-size:12px;font-weight:bold;color:#177246;text-transform:uppercase;letter-spacing:1px;">
                      RLS — Workers' Safety Representative
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0"
                           style="border:1px solid #e0e0e0;border-radius:6px;overflow:hidden;margin-bottom:20px;">
                      <tr style="background:#f0f7f3;">
                        <td style="padding:8px 16px;font-size:11px;font-weight:bold;color:#177246;text-transform:uppercase;letter-spacing:0.5px;width:60%;">Name</td>
                        <td style="padding:8px 16px;font-size:11px;font-weight:bold;color:#177246;text-transform:uppercase;letter-spacing:0.5px;">Phone</td>
                      </tr>
                      ${buildContactRows(rlsList, "No representative registered")}
                    </table>

                    <p style="margin:0 0 8px;font-size:12px;font-weight:bold;color:#177246;text-transform:uppercase;letter-spacing:1px;">
                      Union Support Officer
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0"
                           style="border:1px solid #e0e0e0;border-radius:6px;overflow:hidden;">
                      <tr style="background:#f0f7f3;">
                        <td style="padding:8px 16px;font-size:11px;font-weight:bold;color:#177246;text-transform:uppercase;letter-spacing:0.5px;width:60%;">Name</td>
                        <td style="padding:8px 16px;font-size:11px;font-weight:bold;color:#177246;text-transform:uppercase;letter-spacing:0.5px;">Phone</td>
                      </tr>
                      ${buildContactRows(usoList, "No support officer registered")}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- EN SECTION 4 -->
          <tr>
            <td style="padding:0 36px 36px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="border-top:2px solid #177246;">
                <tr>
                  <td style="padding-top:24px;">
                    <p style="margin:0 0 14px;font-size:15px;color:#444;line-height:1.7;">
                      Thank you for choosing to join <strong>FIT-CISL</strong>.
                      Your trust represents a concrete commitment for us.
                    </p>
                    <p style="margin:0 0 24px;font-size:15px;color:#444;line-height:1.7;">
                      We are here to support you throughout your professional journey.
                      Please do not hesitate to contact us whenever you need assistance.
                    </p>
                    <p style="margin:0 0 4px;font-size:15px;color:#444;">Kind regards,</p>
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
            <td style="background:#f8f9fa;padding:16px 36px;text-align:center;border-top:1px solid #eee;">
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
        subject: `Benvenuto in FIT-CISL, ${user.nome}! / Welcome to FIT-CISL, ${user.nome}!`,
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
      "FIT-CISL Malta Air Pilot Board <pilmalta.fitcisl@gmail.com>",
    );
    const ruoloAbbr =
      user.ruolo === "pilot"
        ? "PIL"
        : user.ruolo === "cabin_crew"
          ? "CC"
          : (user.ruolo ?? "");
    const attachmentFilename = `MAY - ${ruoloAbbr} - ${user.cognome.toUpperCase()} ${user.nome.toUpperCase()}.pdf`;

    const ruoloLabel =
      user.ruolo === "pilot"
        ? "Pilota"
        : user.ruolo === "cabin_crew"
          ? "Cabin Crew"
          : (user.ruolo ?? "—");
    const baseLabel = user.base
      ? `${user.base.codice} — ${user.base.nome}`
      : "—";
    const gradeLabel = user.grade ? user.grade.codice : "—";

    const html = `
<!DOCTYPE html>
<html lang="it">
<head><meta charset="UTF-8" /><title>Modulo iscrizione</title></head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background:#ffffff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:24px;">
    <tr><td>
      <p style="margin:0 0 20px;font-size:15px;color:#222;">Buongiorno,</p>
      <p style="margin:0 0 20px;font-size:15px;color:#222;">
        in allegato il modulo di iscrizione di:
      </p>
      <table cellpadding="0" cellspacing="0"
             style="border:1px solid #ddd;border-radius:6px;overflow:hidden;
                    min-width:320px;">
        <tr style="background:#f0f7f3;">
          <td style="padding:8px 16px;font-size:12px;font-weight:bold;color:#177246;
                     text-transform:uppercase;letter-spacing:0.5px;width:140px;">
            Campo
          </td>
          <td style="padding:8px 16px;font-size:12px;font-weight:bold;color:#177246;
                     text-transform:uppercase;letter-spacing:0.5px;">
            Valore
          </td>
        </tr>
        <tr style="background:#ffffff;">
          <td style="padding:9px 16px;font-size:13px;color:#555;border-top:1px solid #eee;">
            Nome
          </td>
          <td style="padding:9px 16px;font-size:14px;font-weight:bold;color:#222;
                     border-top:1px solid #eee;">
            ${user.nome} ${user.cognome}
          </td>
        </tr>
        <tr style="background:#fafafa;">
          <td style="padding:9px 16px;font-size:13px;color:#555;border-top:1px solid #eee;">
            Crewcode
          </td>
          <td style="padding:9px 16px;font-size:14px;font-weight:bold;color:#177246;
                     font-family:monospace;border-top:1px solid #eee;">
            ${user.crewcode}
          </td>
        </tr>
        <tr style="background:#ffffff;">
          <td style="padding:9px 16px;font-size:13px;color:#555;border-top:1px solid #eee;">
            Ruolo
          </td>
          <td style="padding:9px 16px;font-size:14px;color:#222;border-top:1px solid #eee;">
            ${ruoloLabel}
          </td>
        </tr>
        <tr style="background:#fafafa;">
          <td style="padding:9px 16px;font-size:13px;color:#555;border-top:1px solid #eee;">
            Base
          </td>
          <td style="padding:9px 16px;font-size:14px;color:#222;border-top:1px solid #eee;">
            ${baseLabel}
          </td>
        </tr>
        <tr style="background:#ffffff;">
          <td style="padding:9px 16px;font-size:13px;color:#555;border-top:1px solid #eee;">
            Grado
          </td>
          <td style="padding:9px 16px;font-size:14px;color:#222;border-top:1px solid #eee;">
            ${gradeLabel}
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
            filename: attachmentFilename,
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
