import {
  IsString,
  IsEmail,
  IsEnum,
  IsUUID,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
} from "class-validator";
import { Ruolo } from "../../common/enums/ruolo.enum";

export class PublicRegisterDto {
  // ── Saved to DB ──────────────────────────────────────────────────
  @IsString()
  @IsNotEmpty()
  nome: string;

  @IsString()
  @IsNotEmpty()
  cognome: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  crewcode: string;

  @IsString()
  @IsNotEmpty()
  telefono: string;

  @IsEnum(Ruolo)
  ruolo: Ruolo;

  @IsUUID()
  gradeId: string;

  @IsUUID()
  baseId: string;

  // ── PDF only (not saved to DB) ────────────────────────────────────
  @IsString()
  @IsNotEmpty()
  codiceFiscale: string;

  @IsString()
  @IsNotEmpty()
  natoA: string;

  @IsString()
  @IsNotEmpty()
  dataNascita: string; // DD/MM/YYYY

  @IsString()
  @IsNotEmpty()
  residenteA: string;

  @IsString()
  @IsNotEmpty()
  cap: string;

  @IsString()
  @IsNotEmpty()
  provincia: string;

  @IsString()
  @IsNotEmpty()
  via: string;

  @IsString()
  @IsNotEmpty()
  numeroCivico: string;

  @IsString()
  @IsNotEmpty()
  tipoRapporto: string; // FULL_TIME | TEMPO_INDETERMINATO | PART_TIME_INDETERMINATO

  @IsString()
  @IsNotEmpty()
  luogo: string;

  @IsBoolean()
  consenso1: boolean;

  @IsBoolean()
  consenso2: boolean;

  // ── Firma ─────────────────────────────────────────────────────────
  @IsString()
  @IsNotEmpty()
  signatureBase64: string; // data:image/png;base64,...

  // ── Attivista (optional) ──────────────────────────────────────────
  @IsOptional()
  @IsString()
  attivista?: string;

  // ── Temp PDF reference (optional — set by /auth/register/prepare) ─
  @IsOptional()
  @IsString()
  tempId?: string;
}
