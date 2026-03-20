import { IsString, MinLength, MaxLength, IsNotEmpty } from "class-validator";

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  crewcode: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(100)
  password: string;
}
