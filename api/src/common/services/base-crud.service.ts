import { NotFoundException, ConflictException } from "@nestjs/common";
import { Repository, FindOptionsWhere, FindOptionsOrder } from "typeorm";

export interface HasCodice {
  id: string;
  codice: string;
}

export abstract class BaseCrudService<
  Entity extends HasCodice,
  CreateDto extends { codice: string },
  UpdateDto extends { codice?: string },
> {
  constructor(
    protected readonly repository: Repository<Entity>,
    protected readonly entityName: string,
  ) {}

  async findAll(): Promise<Entity[]> {
    return this.repository.find({
      order: { codice: "ASC" } as FindOptionsOrder<Entity>,
    });
  }

  async findById(id: string): Promise<Entity> {
    const entity = await this.repository.findOne({
      where: { id } as FindOptionsWhere<Entity>,
    });
    if (!entity) {
      throw new NotFoundException(`${this.entityName} not found`);
    }
    return entity;
  }

  async findByCodice(codice: string): Promise<Entity | null> {
    return this.repository.findOne({
      where: { codice: codice.toUpperCase() } as FindOptionsWhere<Entity>,
    });
  }

  async create(dto: CreateDto): Promise<Entity> {
    const existing = await this.findByCodice(dto.codice);
    if (existing) {
      throw new ConflictException(`${this.entityName} code already exists`);
    }
    const entity = this.repository.create({
      ...dto,
      codice: dto.codice.toUpperCase(),
    } as unknown as Entity);
    return this.repository.save(entity);
  }

  async update(id: string, dto: UpdateDto): Promise<Entity> {
    const entity = await this.findById(id);
    if (dto.codice && dto.codice.toUpperCase() !== entity.codice) {
      const existing = await this.findByCodice(dto.codice);
      if (existing) {
        throw new ConflictException(`${this.entityName} code already exists`);
      }
    }
    if (dto.codice) {
      dto.codice = dto.codice.toUpperCase();
    }
    Object.assign(entity, dto);
    return this.repository.save(entity);
  }

  async remove(id: string): Promise<void> {
    const entity = await this.findById(id);
    await this.repository.remove(entity);
  }
}
