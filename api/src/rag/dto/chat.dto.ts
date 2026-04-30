import { IsArray, IsNotEmpty, IsString } from "class-validator";

export class ChatDto {
  @IsNotEmpty()
  @IsString()
  question: string;

  @IsArray()
  history: ChatMessage[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}
