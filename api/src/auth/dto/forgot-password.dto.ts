import { IsEmail, IsOptional, IsString } from "class-validator";

export class ForgotPasswordDto {
  @IsEmail({}, { message: "Invalid email format" })
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  crewcode?: string;
}
