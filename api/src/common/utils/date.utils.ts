import { BadRequestException } from "@nestjs/common";

/**
 * Converts a DD/MM/YYYY date string to YYYY-MM-DD (PostgreSQL format).
 * Throws BadRequestException if the input is not a valid DD/MM/YYYY string.
 */
export function parseDMY(dateStr: string): string {
  const parts = dateStr.split("/");
  if (parts.length !== 3) {
    throw new BadRequestException(
      `Invalid date format: ${dateStr}. Expected DD/MM/YYYY.`,
    );
  }
  const [d, m, y] = parts;
  if (!d || !m || !y || isNaN(+d) || isNaN(+m) || isNaN(+y)) {
    throw new BadRequestException(
      `Invalid date format: ${dateStr}. Expected DD/MM/YYYY.`,
    );
  }
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

/**
 * Converts a DD/MM/YYYY string to YYYY-MM-DD only if the input contains slashes
 * (i.e. it hasn't already been converted). Returns the input unchanged if it's
 * already in YYYY-MM-DD format or if it is falsy.
 */
export function parseDMYOptional(
  dateStr: string | undefined | null,
): string | undefined | null {
  if (!dateStr) return dateStr;
  if (dateStr.includes("/")) return parseDMY(dateStr);
  return dateStr;
}

/**
 * Normalizes a phone number: strips spaces, converts 00-prefix to +.
 * Returns the input unchanged if falsy.
 */
export function normalizePhone(s: string | undefined | null): string | undefined | null {
  if (!s) return s;
  const t = s.trim().replace(/\s+/g, "");
  return t.startsWith("00") ? "+" + t.slice(2) : t;
}

/**
 * Converts a string to Title Case (each word capitalized).
 * e.g. "mario rossi" → "Mario Rossi", "D'ORIANO" → "D'Oriano"
 * Returns the input unchanged if falsy.
 */
export function toTitleCase(s: string | undefined | null): string | undefined | null {
  if (!s) return s;
  return s
    .toLowerCase()
    .replace(/(?:^|[\s\-'])(\p{L})/gu, (_, c) => c.toUpperCase());
}
