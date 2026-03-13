import { Repository } from 'typeorm';
import { Base } from './entities/base.entity';
import { CreateBaseDto } from './dto/create-base.dto';
import { UpdateBaseDto } from './dto/update-base.dto';
export declare class BasesService {
    private basesRepository;
    constructor(basesRepository: Repository<Base>);
    findAll(): Promise<Base[]>;
    findById(id: string): Promise<Base>;
    findByCodice(codice: string): Promise<Base | null>;
    create(createBaseDto: CreateBaseDto): Promise<Base>;
    update(id: string, updateBaseDto: UpdateBaseDto): Promise<Base>;
    remove(id: string): Promise<void>;
}
