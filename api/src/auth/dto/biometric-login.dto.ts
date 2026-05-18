import { IsNotEmpty, IsString } from "class-validator";

export class BiometricLoginDto {
  @IsString()
  @IsNotEmpty()
  biometricToken: string;
}
