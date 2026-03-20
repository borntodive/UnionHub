import { IsString, MinLength, MaxLength, IsEnum } from "class-validator";
import { Ruolo } from "../../common/enums/ruolo.enum";

export class CreateIssueCategoryDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nameIt: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nameEn: string;

  @IsEnum(Ruolo)
  ruolo: Ruolo;
}
