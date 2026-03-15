import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateDocumentDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  content: string;
}

export class ReviewDocumentDto {
  @IsString()
  @IsNotEmpty()
  content: string;
}

export class ApproveDocumentDto {
  @IsString()
  @IsOptional()
  reviewedContent?: string;
}
