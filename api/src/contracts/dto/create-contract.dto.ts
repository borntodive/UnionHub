import { IsString, MinLength, MaxLength } from "class-validator";

export class CreateContractDto {
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  codice: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nome: string;
}
