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
import { RetrievalMode } from "./ask-query.dto";

export class SearchQueryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  query: string;

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
  @Max(50)
  topK?: number;
}
