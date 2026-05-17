import { IsOptional, IsString, IsNumberString } from "class-validator";

export class GetMessagesDto {
  @IsOptional()
  @IsString()
  before?: string; // ISO timestamp cursor

  @IsOptional()
  @IsNumberString()
  limit?: string; // default 50, max 100
}
