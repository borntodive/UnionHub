import {
  IsString,
  IsOptional,
  IsArray,
  IsUUID,
  MaxLength,
} from "class-validator";

export class SendMessageDto {
  @IsString()
  @MaxLength(100)
  roomId: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  content?: string;

  @IsOptional()
  @IsArray()
  @IsUUID("4", { each: true })
  attachmentIds?: string[];

  // Client-generated id, echoed back on `new_message` so the sender can
  // reconcile its optimistic copy. Never persisted.
  @IsOptional()
  @IsString()
  @MaxLength(64)
  clientMsgId?: string;
}
