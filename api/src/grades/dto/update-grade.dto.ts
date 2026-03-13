import { IsString, IsOptional, IsEnum, MinLength, MaxLength } from 'class-validator';
import { Ruolo } from '../../common/enums/ruolo.enum';

export class UpdateGradeDto {
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

  @IsOptional()
  @IsEnum(Ruolo)
  ruolo?: Ruolo;
}
