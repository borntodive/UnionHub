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
  @MaxLength(100000)
  content: string;

  @IsEnum(["fit-cisl", "joint"])
  @IsOptional()
  union?: "fit-cisl" | "joint";

  @IsEnum(["pilot", "cabin_crew"])
  @IsOptional()
  ruolo?: "pilot" | "cabin_crew";
}

export class ReviewDocumentDto {
  @IsString()
  @IsNotEmpty()
  content: string;
}

export class ApproveDocumentDto {
  @IsString()
  @IsOptional()
  reviewedContent?: string;
}

export class UpdateTranslationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50000)
  englishTranslation: string;
}

export class RejectDocumentDto {
  @IsString()
  @IsOptional()
  rejectionReason?: string;
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
