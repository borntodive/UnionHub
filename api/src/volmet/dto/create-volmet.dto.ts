import {
  IsString,
  MinLength,
  MaxLength,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsOptional,
  IsNumber,
  Min,
  Max,
} from "class-validator";

export class CreateVolmetDto {
  @IsString()
  @MinLength(4)
  @MaxLength(4)
  icao: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(3)
  iata?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  city: string;

  @IsString()
  @MinLength(2)
  @MaxLength(2)
  country: string;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  frequencies: string[];

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  region: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  volmetName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  atis?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  handlingFrequency?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
