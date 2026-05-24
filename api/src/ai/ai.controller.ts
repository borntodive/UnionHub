import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { IsOptional, IsString } from "class-validator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AiService, ParsedDuty } from "./ai.service";

class ParseDutyDto {
  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsString()
  text?: string;
}

@UseGuards(JwtAuthGuard)
@Controller("ai")
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post("parse-duty")
  @HttpCode(HttpStatus.OK)
  parseDuty(@Body() body: ParseDutyDto): Promise<ParsedDuty> {
    return this.aiService.parseDuty({ image: body.image, text: body.text });
  }
}
