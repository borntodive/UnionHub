import { User } from "../users/entities/user.entity";
import { Ruolo } from "../common/enums/ruolo.enum";

function escapeVCard(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;")
    .replace(/\n/g, "\\n");
}

export function generateVCard(user: User): string {
  const nome = escapeVCard(user.nome || "");
  const cognome = escapeVCard(user.cognome || "");
  const ruoloLabel =
    user.ruolo === Ruolo.PILOT
      ? "Piloti"
      : user.ruolo === Ruolo.CABIN_CREW
        ? "Cabin Crew"
        : "Staff";

  const baseCode = user.base?.codice ?? "";
  const gradeNome = user.grade?.nome ?? "";

  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${nome} ${cognome}`.trim(),
    `N:${cognome};${nome};;;`,
    `ORG:${escapeVCard(baseCode)}`,
    `NOTE:CREWCODE:${user.crewcode}`,
  ];

  if (gradeNome) {
    lines.push(`TITLE:${escapeVCard(gradeNome)}`);
  }

  if (user.email) {
    lines.push(`EMAIL;TYPE=WORK:${escapeVCard(user.email)}`);
  }
  if (user.telefono) {
    lines.push(`TEL;TYPE=WORK:${escapeVCard(user.telefono)}`);
  }

  lines.push("END:VCARD");
  return lines.join("\r\n") + "\r\n";
}

export function getVCardEtag(user: User): string {
  return `"${new Date(user.updatedAt).getTime()}"`;
}
