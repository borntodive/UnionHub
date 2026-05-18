import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Grade } from "./entities/grade.entity";
import { CreateGradeDto } from "./dto/create-grade.dto";
import { UpdateGradeDto } from "./dto/update-grade.dto";
import { Ruolo } from "../common/enums/ruolo.enum";
import { BaseCrudService } from "../common/services/base-crud.service";

@Injectable()
export class GradesService extends BaseCrudService<
  Grade,
  CreateGradeDto,
  UpdateGradeDto
> {
  constructor(
    @InjectRepository(Grade)
    private gradesRepository: Repository<Grade>,
  ) {
    super(gradesRepository, "Grade");
  }

  async findAll(): Promise<Grade[]> {
    return this.gradesRepository.find({
      order: { ruolo: "ASC", codice: "ASC" },
    });
  }

  async findByRuolo(ruolo: Ruolo): Promise<Grade[]> {
    return this.gradesRepository.find({
      where: { ruolo },
      order: { codice: "ASC" },
    });
  }
}
