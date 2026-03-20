import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  IsInt,
  Min,
  Max,
  IsBoolean,
} from "class-validator";

export class UpdateIssueUrgencyDto {
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
  @IsInt()
  @Min(1)
  @Max(5)
  level?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
