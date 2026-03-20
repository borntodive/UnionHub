import { IsOptional, IsEnum, IsString } from "class-validator";
import { IssueStatus } from "../../common/enums/issue-status.enum";

export class UpdateIssueDto {
  @IsOptional()
  @IsEnum(IssueStatus)
  status?: IssueStatus;

  @IsOptional()
  @IsString()
  adminNotes?: string;
}
