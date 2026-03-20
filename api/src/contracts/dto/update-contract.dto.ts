import { IsString, IsOptional, MinLength, MaxLength } from "class-validator";

export class UpdateContractDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  codice?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nome?: string;
}
