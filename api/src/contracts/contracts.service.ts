import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Contract } from "./entities/contract.entity";
import { CreateContractDto } from "./dto/create-contract.dto";
import { UpdateContractDto } from "./dto/update-contract.dto";
import { BaseCrudService } from "../common/services/base-crud.service";

@Injectable()
export class ContractsService extends BaseCrudService<
  Contract,
  CreateContractDto,
  UpdateContractDto
> {
  constructor(
    @InjectRepository(Contract)
    private contractsRepository: Repository<Contract>,
  ) {
    super(contractsRepository, "Contract");
  }
}
