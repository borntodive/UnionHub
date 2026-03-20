import { IsString, MinLength, MaxLength, IsEnum } from "class-validator";
import { Ruolo } from "../../common/enums/ruolo.enum";

export class CreateGradeDto {
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  codice: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nome: string;

  @IsEnum(Ruolo)
  ruolo: Ruolo;
}
