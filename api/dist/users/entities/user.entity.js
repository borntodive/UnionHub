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
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const typeorm_1 = require("typeorm");
const user_role_enum_1 = require("../../common/enums/user-role.enum");
const ruolo_enum_1 = require("../../common/enums/ruolo.enum");
const base_entity_1 = require("../../bases/entities/base.entity");
const contract_entity_1 = require("../../contracts/entities/contract.entity");
const grade_entity_1 = require("../../grades/entities/grade.entity");
const user_status_history_entity_1 = require("./user-status-history.entity");
let User = class User {
    get fullName() {
        return `${this.nome} ${this.cognome}`;
    }
    serialize(forRole) {
        const base = {
            id: this.id,
            crewcode: this.crewcode,
            role: this.role,
            ruolo: this.ruolo,
            nome: this.nome,
            cognome: this.cognome,
            email: this.email,
            telefono: this.telefono,
            base: this.base,
            contratto: this.contratto,
            grade: this.grade,
            isActive: this.isActive,
            mustChangePassword: this.mustChangePassword,
            registrationFormUrl: this.registrationFormUrl,
            dataIscrizione: this.dataIscrizione,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
        };
        if (forRole === user_role_enum_1.UserRole.ADMIN || forRole === user_role_enum_1.UserRole.SUPERADMIN) {
            return {
                ...base,
                note: this.note,
                itud: this.itud,
                rsa: this.rsa,
                deactivatedAt: this.deactivatedAt,
                statusLog: this.statusLog,
            };
        }
        return base;
    }
};
exports.User = User;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], User.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, unique: true }),
    __metadata("design:type", String)
], User.prototype, "crewcode", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255 }),
    __metadata("design:type", String)
], User.prototype, "password", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: user_role_enum_1.UserRole,
        default: user_role_enum_1.UserRole.USER,
    }),
    __metadata("design:type", String)
], User.prototype, "role", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], User.prototype, "mustChangePassword", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], User.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ruolo_enum_1.Ruolo,
        enumName: 'ruolo_enum',
        nullable: true,
    }),
    __metadata("design:type", Object)
], User.prototype, "ruolo", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100 }),
    __metadata("design:type", String)
], User.prototype, "nome", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100 }),
    __metadata("design:type", String)
], User.prototype, "cognome", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, unique: true }),
    __metadata("design:type", String)
], User.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 30, nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "telefono", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "baseId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => base_entity_1.Base, (base) => base.users, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'baseId' }),
    __metadata("design:type", Object)
], User.prototype, "base", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "contrattoId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => contract_entity_1.Contract, (contract) => contract.users, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'contrattoId' }),
    __metadata("design:type", Object)
], User.prototype, "contratto", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "gradeId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => grade_entity_1.Grade, (grade) => grade.users, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'gradeId' }),
    __metadata("design:type", Object)
], User.prototype, "grade", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "note", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], User.prototype, "itud", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], User.prototype, "rsa", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 500, nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "registrationFormUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date', nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "dataIscrizione", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], User.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], User.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "deactivatedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "statusLog", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => user_status_history_entity_1.UserStatusHistory, (history) => history.user),
    __metadata("design:type", Array)
], User.prototype, "statusHistory", void 0);
exports.User = User = __decorate([
    (0, typeorm_1.Entity)('users'),
    (0, typeorm_1.Index)(['crewcode'], { unique: true }),
    (0, typeorm_1.Index)(['email'], { unique: true }),
    (0, typeorm_1.Index)(['role']),
    (0, typeorm_1.Index)(['ruolo']),
    (0, typeorm_1.Index)(['isActive'])
], User);
//# sourceMappingURL=user.entity.js.map