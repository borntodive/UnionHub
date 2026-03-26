import { IsString, MinLength, MaxLength, IsUUID } from "class-validator";

export class CreateIssueDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title: string;

  @IsString()
  @MinLength(3)
  @MaxLength(10000)
  description: string;

  @IsUUID()
  categoryId: string;

  @IsUUID()
  urgencyId: string;
}
