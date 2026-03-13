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
exports.UsersController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const users_service_1 = require("./users.service");
const pdf_extraction_service_1 = require("./services/pdf-extraction.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const user_role_enum_1 = require("../common/enums/user-role.enum");
const create_user_dto_1 = require("./dto/create-user.dto");
const update_user_dto_1 = require("./dto/update-user.dto");
const ruolo_enum_1 = require("../common/enums/ruolo.enum");
let UsersController = class UsersController {
    constructor(usersService, pdfExtractionService) {
        this.usersService = usersService;
        this.pdfExtractionService = pdfExtractionService;
    }
    async findAll(req, role, ruolo, baseId, contrattoId, gradeId, isActive, search, page, perPage) {
        const requestingUser = await this.usersService.findById(req.user.userId);
        return this.usersService.findAll({
            role,
            ruolo,
            baseId,
            contrattoId,
            gradeId,
            isActive: isActive !== undefined ? isActive === 'true' : undefined,
            search,
            page: page ? parseInt(page, 10) : 1,
            perPage: perPage ? parseInt(perPage, 10) : 20,
        }, requestingUser);
    }
    async getRecentUsers(req, limit) {
        const requestingUser = await this.usersService.findById(req.user.userId);
        return this.usersService.getRecentUsers(limit ? parseInt(limit, 10) : 5, requestingUser);
    }
    async countByRole(ruolo) {
        const count = await this.usersService.countByRole(ruolo);
        return { ruolo, count };
    }
    async findOne(req, id) {
        const requestingUser = await this.usersService.findById(req.user.userId);
        const user = await this.usersService.findById(id);
        if (requestingUser.role === user_role_enum_1.UserRole.USER && requestingUser.id !== id) {
            return null;
        }
        if (requestingUser.role === user_role_enum_1.UserRole.ADMIN &&
            requestingUser.ruolo &&
            user.ruolo !== requestingUser.ruolo) {
            return null;
        }
        return user.serialize(requestingUser.role);
    }
    async create(req, createUserDto) {
        const requestingUser = await this.usersService.findById(req.user.userId);
        const user = await this.usersService.create(createUserDto, requestingUser);
        return user.serialize(requestingUser.role);
    }
    async update(req, id, updateUserDto) {
        const requestingUser = await this.usersService.findById(req.user.userId);
        const user = await this.usersService.update(id, updateUserDto, requestingUser);
        return user.serialize(requestingUser.role);
    }
    async remove(req, id) {
        const requestingUser = await this.usersService.findById(req.user.userId);
        await this.usersService.remove(id, requestingUser);
    }
    async extractPdf(req, file, role) {
        if (!file) {
            console.log('No file received');
            return {
                crewcode: '',
                nome: '',
                cognome: '',
                email: '',
                telefono: '',
                baseId: '',
                contrattoId: '',
                gradeId: '',
                confidence: 0,
                extractionMethod: 'manual',
                rawFields: {},
            };
        }
        console.log('File received:', file.originalname, 'Size:', file.size, 'Buffer exists:', !!file.buffer);
        try {
            const extracted = await this.pdfExtractionService.extractFromPdf(file.buffer, role || ruolo_enum_1.Ruolo.PILOT);
            return extracted;
        }
        catch (error) {
            console.error('PDF extraction error:', error);
            return {
                crewcode: '',
                nome: '',
                cognome: '',
                email: '',
                telefono: '',
                baseId: '',
                contrattoId: '',
                gradeId: '',
                confidence: 0,
                extractionMethod: 'manual',
                rawFields: {},
            };
        }
    }
};
exports.UsersController = UsersController;
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN, user_role_enum_1.UserRole.SUPERADMIN),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('role')),
    __param(2, (0, common_1.Query)('ruolo')),
    __param(3, (0, common_1.Query)('baseId')),
    __param(4, (0, common_1.Query)('contrattoId')),
    __param(5, (0, common_1.Query)('gradeId')),
    __param(6, (0, common_1.Query)('isActive')),
    __param(7, (0, common_1.Query)('search')),
    __param(8, (0, common_1.Query)('page')),
    __param(9, (0, common_1.Query)('perPage')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('recent'),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN, user_role_enum_1.UserRole.SUPERADMIN),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getRecentUsers", null);
__decorate([
    (0, common_1.Get)('count-by-role'),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN, user_role_enum_1.UserRole.SUPERADMIN),
    __param(0, (0, common_1.Query)('ruolo')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "countByRole", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN, user_role_enum_1.UserRole.SUPERADMIN),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_user_dto_1.CreateUserDto]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "create", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN, user_role_enum_1.UserRole.SUPERADMIN),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_user_dto_1.UpdateUserDto]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN, user_role_enum_1.UserRole.SUPERADMIN),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)('extract-pdf'),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN, user_role_enum_1.UserRole.SUPERADMIN),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('pdf', {
        storage: (0, multer_1.memoryStorage)(),
        limits: { fileSize: 10 * 1024 * 1024 },
    })),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.UploadedFile)()),
    __param(2, (0, common_1.Body)('role')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "extractPdf", null);
exports.UsersController = UsersController = __decorate([
    (0, common_1.Controller)('users'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        pdf_extraction_service_1.PdfExtractionService])
], UsersController);
//# sourceMappingURL=users.controller.js.map