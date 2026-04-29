import { IsEnum, IsOptional } from "class-validator";
import { DocumentVisibility } from "@common/enums/document-visibility.enum";

export class UpdateRagDocumentDto {
  @IsEnum(DocumentVisibility)
  @IsOptional()
  visibility?: DocumentVisibility;
}
