import { IsNotEmpty, IsUUID } from "class-validator";

export class IngestionStartDto {
  @IsUUID("4")
  @IsNotEmpty()
  documentId: string;
}
