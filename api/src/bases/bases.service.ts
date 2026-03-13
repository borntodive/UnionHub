import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Base } from './entities/base.entity';
import { CreateBaseDto } from './dto/create-base.dto';
import { UpdateBaseDto } from './dto/update-base.dto';

@Injectable()
export class BasesService {
  constructor(
    @InjectRepository(Base)
    private basesRepository: Repository<Base>,
  ) {}

  async findAll(): Promise<Base[]> {
    return this.basesRepository.find({
      order: { codice: 'ASC' },
    });
  }

  async findById(id: string): Promise<Base> {
    const base = await this.basesRepository.findOne({
      where: { id },
    });

    if (!base) {
      throw new NotFoundException('Base not found');
    }

    return base;
  }

  async findByCodice(codice: string): Promise<Base | null> {
    return this.basesRepository.findOne({
      where: { codice: codice.toUpperCase() },
    });
  }

  async create(createBaseDto: CreateBaseDto): Promise<Base> {
    // Check for duplicate codice
    const existing = await this.findByCodice(createBaseDto.codice);
    if (existing) {
      throw new ConflictException('Base code already exists');
    }

    const base = this.basesRepository.create({
      ...createBaseDto,
      codice: createBaseDto.codice.toUpperCase(),
    });

    return this.basesRepository.save(base);
  }

  async update(id: string, updateBaseDto: UpdateBaseDto): Promise<Base> {
    const base = await this.findById(id);

    if (!base) {
      throw new NotFoundException('Base not found');
    }

    // Check for duplicate codice if changing
    if (updateBaseDto.codice && updateBaseDto.codice.toUpperCase() !== base.codice) {
      const existing = await this.findByCodice(updateBaseDto.codice);
      if (existing) {
        throw new ConflictException('Base code already exists');
      }
    }

    if (updateBaseDto.codice) {
      updateBaseDto.codice = updateBaseDto.codice.toUpperCase();
    }

    Object.assign(base, updateBaseDto);
    return this.basesRepository.save(base);
  }

  async remove(id: string): Promise<void> {
    const base = await this.findById(id);

    if (!base) {
      throw new NotFoundException('Base not found');
    }

    await this.basesRepository.remove(base);
  }
}
