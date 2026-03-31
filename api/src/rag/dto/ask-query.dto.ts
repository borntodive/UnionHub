import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from "class-validator";

export enum RetrievalMode {
  LEXICAL = "lexical",
  SEMANTIC = "semantic",
  HYBRID = "hybrid",
}

export class AskQueryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  question: string;

  @IsOptional()
  @IsArray()
  @IsUUID("4", { each: true })
  documentIds?: string[];

  @IsOptional()
  @IsEnum(RetrievalMode)
  retrievalMode?: RetrievalMode;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  topK?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  maxContextChunks?: number;
}
