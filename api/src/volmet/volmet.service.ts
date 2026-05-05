import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, ILike } from "typeorm";
import { Volmet } from "./entities/volmet.entity";
import { CreateVolmetDto } from "./dto/create-volmet.dto";
import { UpdateVolmetDto } from "./dto/update-volmet.dto";

@Injectable()
export class VolmetService {
  constructor(
    @InjectRepository(Volmet)
    private volmetRepository: Repository<Volmet>,
  ) {}

  async findAll(activeOnly: boolean = false): Promise<Volmet[]> {
    return this.volmetRepository.find({
      where: activeOnly ? { isActive: true } : undefined,
      order: { icao: "ASC" },
    });
  }

  async findByRegion(region: string): Promise<Volmet[]> {
    return this.volmetRepository.find({
      where: { region, isActive: true },
      order: { icao: "ASC" },
    });
  }

  async search(query: string): Promise<Volmet[]> {
    return this.volmetRepository.find({
      where: [
        { icao: ILike(`${query}%`) },
        { name: ILike(`${query}%`) },
        { city: ILike(`${query}%`) },
      ],
      order: { icao: "ASC" },
    });
  }

  async findById(id: string): Promise<Volmet> {
    const volmet = await this.volmetRepository.findOne({
      where: { id },
    });

    if (!volmet) {
      throw new NotFoundException("VOLMET entry not found");
    }

    return volmet;
  }

  async findByIcao(icao: string): Promise<Volmet | null> {
    return this.volmetRepository.findOne({
      where: { icao: icao.toUpperCase() },
    });
  }

  async create(createVolmetDto: CreateVolmetDto): Promise<Volmet> {
    const existing = await this.findByIcao(createVolmetDto.icao);
    if (existing) {
      throw new ConflictException(
        "VOLMET entry with this ICAO code already exists",
      );
    }

    const volmet = this.volmetRepository.create({
      ...createVolmetDto,
      icao: createVolmetDto.icao.toUpperCase(),
    });

    return this.volmetRepository.save(volmet);
  }

  async update(id: string, updateVolmetDto: UpdateVolmetDto): Promise<Volmet> {
    const volmet = await this.findById(id);

    if (updateVolmetDto.icao) {
      updateVolmetDto.icao = updateVolmetDto.icao.toUpperCase();
    }

    Object.assign(volmet, updateVolmetDto);
    return this.volmetRepository.save(volmet);
  }

  async remove(id: string): Promise<void> {
    const volmet = await this.findById(id);
    await this.volmetRepository.remove(volmet);
  }

  async getRegions(): Promise<string[]> {
    const result = await this.volmetRepository
      .createQueryBuilder("volmet")
      .select("DISTINCT volmet.region", "region")
      .where("volmet.isActive = :isActive", { isActive: true })
      .orderBy("volmet.region", "ASC")
      .getRawMany();

    return result.map((r) => r.region);
  }
}
