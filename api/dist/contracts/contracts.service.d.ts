import { Repository } from 'typeorm';
import { Contract } from './entities/contract.entity';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
export declare class ContractsService {
    private contractsRepository;
    constructor(contractsRepository: Repository<Contract>);
    findAll(): Promise<Contract[]>;
    findById(id: string): Promise<Contract>;
    findByCodice(codice: string): Promise<Contract | null>;
    create(createContractDto: CreateContractDto): Promise<Contract>;
    update(id: string, updateContractDto: UpdateContractDto): Promise<Contract>;
    remove(id: string): Promise<void>;
}
