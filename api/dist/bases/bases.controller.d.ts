import { BasesService } from './bases.service';
import { CreateBaseDto } from './dto/create-base.dto';
import { UpdateBaseDto } from './dto/update-base.dto';
export declare class BasesController {
    private readonly basesService;
    constructor(basesService: BasesService);
    findAll(): Promise<import("./entities/base.entity").Base[]>;
    findOne(id: string): Promise<import("./entities/base.entity").Base>;
    create(createBaseDto: CreateBaseDto): Promise<import("./entities/base.entity").Base>;
    update(id: string, updateBaseDto: UpdateBaseDto): Promise<import("./entities/base.entity").Base>;
    remove(id: string): Promise<void>;
}
