import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  Max,
  IsObject,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

class SimDiariaTierDto {
  @IsInt()
  @Min(1)
  min: number;

  @IsInt()
  @Min(1)
  max: number;

  @IsObject()
  pay: {
    ffp: number;
    sectorPay: number;
  };
}

class TrainingBonusDto {
  @IsOptional()
  @IsObject({ each: true })
  pay?: { min: number; max: number; pay: number }[];

  @IsOptional()
  @IsInt()
  minSectors?: number;

  @IsOptional()
  @IsInt()
  sectorEquivalent?: number;
}

class TrainingConfigDto {
  @IsOptional()
  @IsNumber()
  allowance?: number;

  @IsOptional()
  @IsObject()
  nonBtc?: {
    allowance: number;
    simDiaria: SimDiariaTierDto[];
    bonus?: { sectorEquivalent: number };
  };

  @IsOptional()
  @IsObject()
  btc?: {
    allowance: number;
    simDiaria: SimDiariaTierDto[];
    bonus?: { sectorEquivalent: number };
  };

  @IsOptional()
  @ValidateNested()
  @Type(() => TrainingBonusDto)
  bonus?: TrainingBonusDto;
}

export class CreateClaContractDto {
  @IsString()
  company: string = "RYR";

  @IsString()
  role: string; // 'pil' or 'cc'

  @IsString()
  rank: string; // 'cpt', 'fo', 'tri', etc.

  @IsNumber()
  @Min(0)
  basic: number;

  @IsNumber()
  @Min(0)
  ffp: number;

  @IsNumber()
  @Min(0)
  sbh: number;

  @IsNumber()
  @Min(0)
  al: number;

  @IsNumber()
  @Min(0)
  oob: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  woff?: number;

  @IsNumber()
  @Min(0)
  allowance: number;

  @IsNumber()
  @Min(0)
  diaria: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  rsa?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  itud?: number;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => TrainingConfigDto)
  trainingConfig?: TrainingConfigDto;

  @IsOptional()
  @IsInt()
  @Min(2020)
  @Max(2100)
  effectiveYear?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  effectiveMonth?: number;

  @IsOptional()
  @IsInt()
  @Min(2020)
  @Max(2100)
  endYear?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  endMonth?: number | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
