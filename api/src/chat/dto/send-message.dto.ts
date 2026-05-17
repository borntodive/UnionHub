import {
  IsString,
  IsOptional,
  IsArray,
  IsUUID,
  MaxLength,
} from "class-validator";

export class SendMessageDto {
  @IsString()
  roomId: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  content?: string;

  @IsOptional()
  @IsArray()
  @IsUUID("4", { each: true })
  attachmentIds?: string[];
}
