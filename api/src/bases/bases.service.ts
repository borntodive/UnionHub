import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Base } from "./entities/base.entity";
import { CreateBaseDto } from "./dto/create-base.dto";
import { UpdateBaseDto } from "./dto/update-base.dto";
import { BaseCrudService } from "../common/services/base-crud.service";

@Injectable()
export class BasesService extends BaseCrudService<
  Base,
  CreateBaseDto,
  UpdateBaseDto
> {
  constructor(
    @InjectRepository(Base)
    private basesRepository: Repository<Base>,
  ) {
    super(basesRepository, "Base");
  }
}
