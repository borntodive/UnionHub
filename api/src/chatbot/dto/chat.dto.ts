import { IsString, IsNotEmpty, IsUUID, MaxLength } from "class-validator";

export class ChatDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  message: string;

  @IsUUID()
  conversationId: string;
}
