import {
  IsString,
  IsEmail,
  IsOptional,
  IsUUID,
  MinLength,
  MaxLength,
  IsBoolean,
  IsEnum,
} from "class-validator";
import { WhatsappStatus } from "../../common/enums/whatsapp-status.enum";

export class UpdateMeDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nome?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  cognome?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  telefono?: string;

  @IsOptional()
  @IsUUID()
  baseId?: string;

  @IsOptional()
  @IsUUID()
  contrattoId?: string;

  @IsOptional()
  @IsUUID()
  gradeId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  dateOfEntry?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  dateOfCaptaincy?: string;

  @IsOptional()
  @IsEnum(WhatsappStatus)
  whatsappStatus?: WhatsappStatus | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  registrationFormUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  language?: string;

  @IsOptional()
  @IsBoolean()
  itud?: boolean;

  @IsOptional()
  @IsBoolean()
  rsa?: boolean;

  @IsOptional()
  @IsBoolean()
  rls?: boolean;

  @IsOptional()
  @IsBoolean()
  isUSO?: boolean;

  @IsOptional()
  @IsBoolean()
  employmentConfirmed?: boolean;
}
