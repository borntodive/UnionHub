import { PartialType } from "@nestjs/mapped-types";
import { CreateClaContractDto } from "./create-cla-contract.dto";

export class UpdateClaContractDto extends PartialType(CreateClaContractDto) {}
