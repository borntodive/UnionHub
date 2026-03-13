"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BasesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const base_entity_1 = require("./entities/base.entity");
let BasesService = class BasesService {
    constructor(basesRepository) {
        this.basesRepository = basesRepository;
    }
    async findAll() {
        return this.basesRepository.find({
            order: { codice: 'ASC' },
        });
    }
    async findById(id) {
        const base = await this.basesRepository.findOne({
            where: { id },
        });
        if (!base) {
            throw new common_1.NotFoundException('Base not found');
        }
        return base;
    }
    async findByCodice(codice) {
        return this.basesRepository.findOne({
            where: { codice: codice.toUpperCase() },
        });
    }
    async create(createBaseDto) {
        const existing = await this.findByCodice(createBaseDto.codice);
        if (existing) {
            throw new common_1.ConflictException('Base code already exists');
        }
        const base = this.basesRepository.create({
            ...createBaseDto,
            codice: createBaseDto.codice.toUpperCase(),
        });
        return this.basesRepository.save(base);
    }
    async update(id, updateBaseDto) {
        const base = await this.findById(id);
        if (!base) {
            throw new common_1.NotFoundException('Base not found');
        }
        if (updateBaseDto.codice && updateBaseDto.codice.toUpperCase() !== base.codice) {
            const existing = await this.findByCodice(updateBaseDto.codice);
            if (existing) {
                throw new common_1.ConflictException('Base code already exists');
            }
        }
        if (updateBaseDto.codice) {
            updateBaseDto.codice = updateBaseDto.codice.toUpperCase();
        }
        Object.assign(base, updateBaseDto);
        return this.basesRepository.save(base);
    }
    async remove(id) {
        const base = await this.findById(id);
        if (!base) {
            throw new common_1.NotFoundException('Base not found');
        }
        await this.basesRepository.remove(base);
    }
};
exports.BasesService = BasesService;
exports.BasesService = BasesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(base_entity_1.Base)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], BasesService);
//# sourceMappingURL=bases.service.js.map