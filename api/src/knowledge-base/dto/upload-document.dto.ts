import { IsString, IsNotEmpty, IsIn, IsOptional } from "class-validator";

export class UploadDocumentDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsIn(["all", "admin"])
  accessLevel: "all" | "admin";

  @IsOptional()
  @IsIn(["pilot", "cabin_crew"])
  ruolo?: string;
}
