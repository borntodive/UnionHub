import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  IsUUID,
  MinLength,
  MaxLength,
  IsBoolean,
  IsDateString,
} from "class-validator";
import { UserRole } from "../../common/enums/user-role.enum";
import { Ruolo } from "../../common/enums/ruolo.enum";

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  crewcode?: string;

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
  @IsEnum(Ruolo)
  ruolo?: Ruolo;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

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
  note?: string;

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
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  registrationFormUrl?: string;

  @IsOptional()
  @IsString()
  dataIscrizione?: string;

  @IsOptional()
  @IsString()
  dateOfEntry?: string;

  @IsOptional()
  @IsString()
  dateOfCaptaincy?: string;
}
