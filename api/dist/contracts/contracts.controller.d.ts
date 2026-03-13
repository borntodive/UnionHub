import { ContractsService } from './contracts.service';
import { UserRole } from '../common/enums/user-role.enum';
import { Ruolo } from '../common/enums/ruolo.enum';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
interface RequestWithUser extends Request {
    user: {
        userId: string;
        crewcode: string;
        role: UserRole;
        ruolo: Ruolo | null;
    };
}
export declare class ContractsController {
    private readonly contractsService;
    constructor(contractsService: ContractsService);
    findAll(req: RequestWithUser): Promise<import("./entities/contract.entity").Contract[]>;
    findOne(id: string): Promise<import("./entities/contract.entity").Contract>;
    create(createContractDto: CreateContractDto): Promise<import("./entities/contract.entity").Contract>;
    update(id: string, updateContractDto: UpdateContractDto): Promise<import("./entities/contract.entity").Contract>;
    remove(id: string): Promise<void>;
}
export {};
