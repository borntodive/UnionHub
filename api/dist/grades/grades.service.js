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
exports.GradesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const grade_entity_1 = require("./entities/grade.entity");
let GradesService = class GradesService {
    constructor(gradesRepository) {
        this.gradesRepository = gradesRepository;
    }
    async findAll() {
        return this.gradesRepository.find({
            order: { ruolo: 'ASC', codice: 'ASC' },
        });
    }
    async findByRuolo(ruolo) {
        return this.gradesRepository.find({
            where: { ruolo },
            order: { codice: 'ASC' },
        });
    }
    async findById(id) {
        const grade = await this.gradesRepository.findOne({
            where: { id },
        });
        if (!grade) {
            throw new common_1.NotFoundException('Grade not found');
        }
        return grade;
    }
    async findByCodice(codice) {
        return this.gradesRepository.findOne({
            where: { codice: codice.toUpperCase() },
        });
    }
    async create(createGradeDto) {
        const existing = await this.findByCodice(createGradeDto.codice);
        if (existing) {
            throw new common_1.ConflictException('Grade code already exists');
        }
        const grade = this.gradesRepository.create({
            ...createGradeDto,
            codice: createGradeDto.codice.toUpperCase(),
        });
        return this.gradesRepository.save(grade);
    }
    async update(id, updateGradeDto) {
        const grade = await this.findById(id);
        if (!grade) {
            throw new common_1.NotFoundException('Grade not found');
        }
        if (updateGradeDto.codice && updateGradeDto.codice.toUpperCase() !== grade.codice) {
            const existing = await this.findByCodice(updateGradeDto.codice);
            if (existing) {
                throw new common_1.ConflictException('Grade code already exists');
            }
        }
        if (updateGradeDto.codice) {
            updateGradeDto.codice = updateGradeDto.codice.toUpperCase();
        }
        Object.assign(grade, updateGradeDto);
        return this.gradesRepository.save(grade);
    }
    async remove(id) {
        const grade = await this.findById(id);
        if (!grade) {
            throw new common_1.NotFoundException('Grade not found');
        }
        await this.gradesRepository.remove(grade);
    }
};
exports.GradesService = GradesService;
exports.GradesService = GradesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(grade_entity_1.Grade)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], GradesService);
//# sourceMappingURL=grades.service.js.map