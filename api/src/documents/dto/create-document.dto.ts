import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  MaxLength,
} from "class-validator";

export class CreateDocumentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsEnum(["fit-cisl", "joint"])
  @IsOptional()
  union?: "fit-cisl" | "joint";

  @IsEnum(["pilot", "cabin_crew"])
  @IsOptional()
  ruolo?: "pilot" | "cabin_crew";
}

export class UpdateTranslationDto {
  @IsString()
  @IsNotEmpty()
  englishTranslation: string;

  @IsString()
  @IsOptional()
  englishTitle?: string;
}

export class UpdateDocumentDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  title?: string;

  @IsString()
  @IsOptional()
  content?: string;
}

export class UploadDocumentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsEnum(["fit-cisl", "joint"])
  @IsOptional()
  union?: "fit-cisl" | "joint";

  @IsEnum(["pilot", "cabin_crew"])
  @IsOptional()
  ruolo?: "pilot" | "cabin_crew";
}
