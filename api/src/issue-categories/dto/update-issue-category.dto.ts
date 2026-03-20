import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  IsEnum,
  IsBoolean,
} from "class-validator";
import { Ruolo } from "../../common/enums/ruolo.enum";

export class UpdateIssueCategoryDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nameIt?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nameEn?: string;

  @IsOptional()
  @IsEnum(Ruolo)
  ruolo?: Ruolo;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
