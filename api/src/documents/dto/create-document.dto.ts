import { IsString, IsNotEmpty, IsOptional, IsEnum } from "class-validator";

export class CreateDocumentDto {
  @IsString()
  @IsNotEmpty()
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
  englishTranslation: string;
}

export class RejectDocumentDto {
  @IsString()
  @IsOptional()
  rejectionReason?: string;
}
