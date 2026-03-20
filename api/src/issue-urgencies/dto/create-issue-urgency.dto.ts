import {
  IsString,
  MinLength,
  MaxLength,
  IsInt,
  Min,
  Max,
} from "class-validator";

export class CreateIssueUrgencyDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nameIt: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nameEn: string;

  @IsInt()
  @Min(1)
  @Max(5)
  level: number;
}
