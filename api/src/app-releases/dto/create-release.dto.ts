import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  Matches,
} from "class-validator";

export class CreateReleaseDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d+\.\d+\.\d+$/, { message: "version must be semver (x.y.z)" })
  version: string;

  @IsString()
  @IsOptional()
  @Matches(/^\d+\.\d+\.\d+$/, {
    message: "minVersion must be semver (x.y.z)",
  })
  minVersion?: string;

  @IsIn(["ios", "android", "all"])
  @IsOptional()
  platform?: string;

  @IsString()
  @IsOptional()
  releaseNotes?: string;
}
