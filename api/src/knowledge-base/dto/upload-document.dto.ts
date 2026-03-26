import {
  IsString,
  IsNotEmpty,
  IsIn,
  IsOptional,
  MaxLength,
} from "class-validator";

export class UploadDocumentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsIn(["all", "admin"])
  accessLevel: "all" | "admin";

  @IsOptional()
  @IsIn(["pilot", "cabin_crew"])
  ruolo?: string;
}
