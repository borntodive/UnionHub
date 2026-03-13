import { GradesService } from './grades.service';
import { Ruolo } from '../common/enums/ruolo.enum';
import { CreateGradeDto } from './dto/create-grade.dto';
import { UpdateGradeDto } from './dto/update-grade.dto';
export declare class GradesController {
    private readonly gradesService;
    constructor(gradesService: GradesService);
    findAll(ruolo?: Ruolo): Promise<import("./entities/grade.entity").Grade[]>;
    findOne(id: string): Promise<import("./entities/grade.entity").Grade>;
    create(createGradeDto: CreateGradeDto): Promise<import("./entities/grade.entity").Grade>;
    update(id: string, updateGradeDto: UpdateGradeDto): Promise<import("./entities/grade.entity").Grade>;
    remove(id: string): Promise<void>;
}
