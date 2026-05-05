import { PartialType } from "@nestjs/mapped-types";
import { CreateVolmetDto } from "./create-volmet.dto";

export class UpdateVolmetDto extends PartialType(CreateVolmetDto) {}
