import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class UploadDocumentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  manualPart?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  issue?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  revision?: string;

  @IsOptional()
  @IsDateString()
  revisionDate?: string;
}
