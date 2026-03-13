import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Grade } from './entities/grade.entity';
import { CreateGradeDto } from './dto/create-grade.dto';
import { UpdateGradeDto } from './dto/update-grade.dto';
import { Ruolo } from '../common/enums/ruolo.enum';

@Injectable()
export class GradesService {
  constructor(
    @InjectRepository(Grade)
    private gradesRepository: Repository<Grade>,
  ) {}

  async findAll(): Promise<Grade[]> {
    return this.gradesRepository.find({
      order: { ruolo: 'ASC', codice: 'ASC' },
    });
  }

  async findByRuolo(ruolo: Ruolo): Promise<Grade[]> {
    return this.gradesRepository.find({
      where: { ruolo },
      order: { codice: 'ASC' },
    });
  }

  async findById(id: string): Promise<Grade> {
    const grade = await this.gradesRepository.findOne({
      where: { id },
    });

    if (!grade) {
      throw new NotFoundException('Grade not found');
    }

    return grade;
  }

  async findByCodice(codice: string): Promise<Grade | null> {
    return this.gradesRepository.findOne({
      where: { codice: codice.toUpperCase() },
    });
  }

  async create(createGradeDto: CreateGradeDto): Promise<Grade> {
    // Check for duplicate codice
    const existing = await this.findByCodice(createGradeDto.codice);
    if (existing) {
      throw new ConflictException('Grade code already exists');
    }

    const grade = this.gradesRepository.create({
      ...createGradeDto,
      codice: createGradeDto.codice.toUpperCase(),
    });

    return this.gradesRepository.save(grade);
  }

  async update(id: string, updateGradeDto: UpdateGradeDto): Promise<Grade> {
    const grade = await this.findById(id);

    if (!grade) {
      throw new NotFoundException('Grade not found');
    }

    // Check for duplicate codice if changing
    if (updateGradeDto.codice && updateGradeDto.codice.toUpperCase() !== grade.codice) {
      const existing = await this.findByCodice(updateGradeDto.codice);
      if (existing) {
        throw new ConflictException('Grade code already exists');
      }
    }

    if (updateGradeDto.codice) {
      updateGradeDto.codice = updateGradeDto.codice.toUpperCase();
    }

    Object.assign(grade, updateGradeDto);
    return this.gradesRepository.save(grade);
  }

  async remove(id: string): Promise<void> {
    const grade = await this.findById(id);

    if (!grade) {
      throw new NotFoundException('Grade not found');
    }

    await this.gradesRepository.remove(grade);
  }
}
