import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Contract } from "./entities/contract.entity";
import { CreateContractDto } from "./dto/create-contract.dto";
import { UpdateContractDto } from "./dto/update-contract.dto";

@Injectable()
export class ContractsService {
  constructor(
    @InjectRepository(Contract)
    private contractsRepository: Repository<Contract>,
  ) {}

  async findAll(): Promise<Contract[]> {
    return this.contractsRepository.find({
      order: { codice: "ASC" },
    });
  }

  async findById(id: string): Promise<Contract> {
    const contract = await this.contractsRepository.findOne({
      where: { id },
    });

    if (!contract) {
      throw new NotFoundException("Contract not found");
    }

    return contract;
  }

  async findByCodice(codice: string): Promise<Contract | null> {
    return this.contractsRepository.findOne({
      where: { codice: codice.toUpperCase() },
    });
  }

  async create(createContractDto: CreateContractDto): Promise<Contract> {
    // Check for duplicate codice
    const existing = await this.findByCodice(createContractDto.codice);
    if (existing) {
      throw new ConflictException("Contract code already exists");
    }

    const contract = this.contractsRepository.create({
      ...createContractDto,
      codice: createContractDto.codice.toUpperCase(),
    });

    return this.contractsRepository.save(contract);
  }

  async update(
    id: string,
    updateContractDto: UpdateContractDto,
  ): Promise<Contract> {
    const contract = await this.findById(id);

    if (!contract) {
      throw new NotFoundException("Contract not found");
    }

    // Check for duplicate codice if changing
    if (
      updateContractDto.codice &&
      updateContractDto.codice.toUpperCase() !== contract.codice
    ) {
      const existing = await this.findByCodice(updateContractDto.codice);
      if (existing) {
        throw new ConflictException("Contract code already exists");
      }
    }

    if (updateContractDto.codice) {
      updateContractDto.codice = updateContractDto.codice.toUpperCase();
    }

    Object.assign(contract, updateContractDto);
    return this.contractsRepository.save(contract);
  }

  async remove(id: string): Promise<void> {
    const contract = await this.findById(id);

    if (!contract) {
      throw new NotFoundException("Contract not found");
    }

    await this.contractsRepository.remove(contract);
  }
}
