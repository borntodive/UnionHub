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
import { UserRole } from "@common/enums/user-role.enum";
import { Ruolo } from "@common/enums/ruolo.enum";

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

  // User context fields (populated from JWT, not sent by client)
  userRole?: UserRole;
  userRuolo?: Ruolo;
}
