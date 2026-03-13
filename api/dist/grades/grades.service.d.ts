import { Repository } from 'typeorm';
import { Grade } from './entities/grade.entity';
import { CreateGradeDto } from './dto/create-grade.dto';
import { UpdateGradeDto } from './dto/update-grade.dto';
import { Ruolo } from '../common/enums/ruolo.enum';
export declare class GradesService {
    private gradesRepository;
    constructor(gradesRepository: Repository<Grade>);
    findAll(): Promise<Grade[]>;
    findByRuolo(ruolo: Ruolo): Promise<Grade[]>;
    findById(id: string): Promise<Grade>;
    findByCodice(codice: string): Promise<Grade | null>;
    create(createGradeDto: CreateGradeDto): Promise<Grade>;
    update(id: string, updateGradeDto: UpdateGradeDto): Promise<Grade>;
    remove(id: string): Promise<void>;
}
