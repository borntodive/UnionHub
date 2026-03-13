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
const file_storage_service_1 = require("./services/file-storage.service");
const pdf_image_service_1 = require("./services/pdf-image.service");
const bases_service_1 = require("../bases/bases.service");
const contracts_service_1 = require("../contracts/contracts.service");
const grades_service_1 = require("../grades/grades.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const user_role_enum_1 = require("../common/enums/user-role.enum");
const create_user_dto_1 = require("./dto/create-user.dto");
const update_user_dto_1 = require("./dto/update-user.dto");
const ruolo_enum_1 = require("../common/enums/ruolo.enum");
let UsersController = class UsersController {
    constructor(usersService, pdfExtractionService, fileStorageService, pdfImageService, basesService, contractsService, gradesService) {
        this.usersService = usersService;
        this.pdfExtractionService = pdfExtractionService;
        this.fileStorageService = fileStorageService;
        this.pdfImageService = pdfImageService;
        this.basesService = basesService;
        this.contractsService = contractsService;
        this.gradesService = gradesService;
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
            const [bases, contracts, grades] = await Promise.all([
                this.basesService.findAll(),
                this.contractsService.findAll(),
                this.gradesService.findAll(),
            ]);
            const matched = this.pdfExtractionService.matchToEntities(extracted, bases.map(b => ({ id: b.id, codice: b.codice, nome: b.nome })), contracts.map(c => ({ id: c.id, codice: c.codice, nome: c.nome })), grades.map(g => ({ id: g.id, codice: g.codice, nome: g.nome })));
            if (!matched.contrattoId) {
                const defaultContract = contracts.find(c => role === ruolo_enum_1.Ruolo.CABIN_CREW
                    ? c.codice === 'MAY-CC'
                    : c.codice === 'MAY-PI');
                if (defaultContract) {
                    matched.contrattoId = defaultContract.id;
                }
            }
            console.log('Extracted and matched:', matched);
            return matched;
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
    async uploadRegistrationForm(req, id, file) {
        if (!file) {
            throw new Error('No PDF file provided');
        }
        const requestingUser = await this.usersService.findById(req.user.userId);
        const user = await this.usersService.findById(id);
        if (!user) {
            throw new Error('User not found');
        }
        if (user.registrationFormUrl) {
            await this.fileStorageService.deleteFile(user.registrationFormUrl);
        }
        const { fileUrl } = await this.fileStorageService.savePdf(file.buffer, file.originalname, user.crewcode);
        const updated = await this.usersService.update(id, { registrationFormUrl: fileUrl }, requestingUser);
        return updated.serialize(requestingUser.role);
    }
    async getRegistrationForm(req, id, download) {
        const requestingUser = await this.usersService.findById(req.user.userId);
        const user = await this.usersService.findById(id);
        if (!user) {
            throw new Error('User not found');
        }
        if (requestingUser.role === user_role_enum_1.UserRole.USER && requestingUser.id !== id) {
            throw new Error('Access denied');
        }
        if (requestingUser.role === user_role_enum_1.UserRole.ADMIN &&
            requestingUser.ruolo &&
            user.ruolo !== requestingUser.ruolo) {
            throw new Error('Access denied');
        }
        if (!user.registrationFormUrl) {
            throw new Error('No registration form found for this user');
        }
        const filePath = this.fileStorageService.getFilePathFromUrl(user.registrationFormUrl);
        if (!this.fileStorageService.fileExists(user.registrationFormUrl)) {
            throw new Error('File not found');
        }
        return {
            fileUrl: user.registrationFormUrl,
            filePath,
            filename: filePath.split('/').pop(),
            download: download === 'true',
        };
    }
    async getRegistrationFormPreview(req, id) {
        const requestingUser = await this.usersService.findById(req.user.userId);
        const user = await this.usersService.findById(id);
        if (!user) {
            throw new Error('User not found');
        }
        if (requestingUser.role === user_role_enum_1.UserRole.USER && requestingUser.id !== id) {
            throw new Error('Access denied');
        }
        if (requestingUser.role === user_role_enum_1.UserRole.ADMIN &&
            requestingUser.ruolo &&
            user.ruolo !== requestingUser.ruolo) {
            throw new Error('Access denied');
        }
        if (!user.registrationFormUrl) {
            throw new Error('No registration form found for this user');
        }
        const filePath = this.fileStorageService.getFilePathFromUrl(user.registrationFormUrl);
        if (!this.fileStorageService.fileExists(user.registrationFormUrl)) {
            throw new Error('File not found');
        }
        const pdfBuffer = await require('fs').promises.readFile(filePath);
        const base64Image = await this.pdfImageService.convertFirstPageToImage(pdfBuffer);
        return {
            imageBase64: base64Image,
            mimeType: 'image/png',
        };
    }
    async convertPdfToImage(pdfBase64) {
        if (!pdfBase64) {
            throw new Error('No PDF data provided');
        }
        try {
            const pdfBuffer = Buffer.from(pdfBase64, 'base64');
            const base64Image = await this.pdfImageService.convertFirstPageToImage(pdfBuffer);
            return {
                imageBase64: base64Image,
                mimeType: 'image/png',
            };
        }
        catch (error) {
            console.error('PDF conversion error:', error);
            throw new Error('Failed to convert PDF to image');
        }
    }
    async findAllDeactivated(req, search, page, perPage) {
        const requestingUser = await this.usersService.findById(req.user.userId);
        return this.usersService.findAllDeactivated({
            search,
            page: page ? parseInt(page, 10) : 1,
            perPage: perPage ? parseInt(perPage, 10) : 20,
        }, requestingUser);
    }
    async reactivateDeactivatedUser(req, id) {
        const requestingUser = await this.usersService.findById(req.user.userId);
        const user = await this.usersService.reactivateDeactivatedUser(id, requestingUser);
        return user.serialize(requestingUser.role);
    }
    async permanentlyDelete(req, id) {
        const requestingUser = await this.usersService.findById(req.user.userId);
        await this.usersService.permanentlyDelete(id, requestingUser);
    }
    async exportToCsv(req, ruolo, baseId, contrattoId) {
        const requestingUser = await this.usersService.findById(req.user.userId);
        return this.usersService.exportToCsv({ ruolo, baseId, contrattoId }, requestingUser);
    }
    async getDashboardStatistics(req) {
        const requestingUser = await this.usersService.findById(req.user.userId);
        return this.usersService.getDashboardStatistics(requestingUser);
    }
    async bulkImport(req, file, ruolo) {
        if (!file) {
            throw new Error('No file provided');
        }
        const requestingUser = await this.usersService.findById(req.user.userId);
        const fileExtension = file.originalname.substring(file.originalname.lastIndexOf('.')).toLowerCase();
        if (!['.csv', '.xlsx', '.xls'].includes(fileExtension)) {
            throw new Error('Unsupported file format. Use CSV or Excel (.xlsx, .xls)');
        }
        return this.usersService.bulkImport(file.buffer, fileExtension, requestingUser, ruolo);
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
__decorate([
    (0, common_1.Post)(':id/registration-form'),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN, user_role_enum_1.UserRole.SUPERADMIN),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('pdf', {
        storage: (0, multer_1.memoryStorage)(),
        limits: { fileSize: 10 * 1024 * 1024 },
    })),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "uploadRegistrationForm", null);
__decorate([
    (0, common_1.Get)(':id/registration-form'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Query)('download')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getRegistrationForm", null);
__decorate([
    (0, common_1.Get)(':id/registration-form/preview'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getRegistrationFormPreview", null);
__decorate([
    (0, common_1.Post)('convert-pdf-to-image'),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN, user_role_enum_1.UserRole.SUPERADMIN),
    __param(0, (0, common_1.Body)('pdfBase64')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "convertPdfToImage", null);
__decorate([
    (0, common_1.Get)('deactivated/list'),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.SUPERADMIN),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('search')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('perPage')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "findAllDeactivated", null);
__decorate([
    (0, common_1.Post)('deactivated/:id/reactivate'),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.SUPERADMIN),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "reactivateDeactivatedUser", null);
__decorate([
    (0, common_1.Delete)('deactivated/:id/permanent'),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.SUPERADMIN),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "permanentlyDelete", null);
__decorate([
    (0, common_1.Get)('export/csv'),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN, user_role_enum_1.UserRole.SUPERADMIN),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('ruolo')),
    __param(2, (0, common_1.Query)('baseId')),
    __param(3, (0, common_1.Query)('contrattoId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "exportToCsv", null);
__decorate([
    (0, common_1.Get)('statistics/dashboard'),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN, user_role_enum_1.UserRole.SUPERADMIN),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getDashboardStatistics", null);
__decorate([
    (0, common_1.Post)('import/bulk'),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN, user_role_enum_1.UserRole.SUPERADMIN),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', { storage: (0, multer_1.memoryStorage)() })),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.UploadedFile)()),
    __param(2, (0, common_1.Body)('ruolo')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "bulkImport", null);
exports.UsersController = UsersController = __decorate([
    (0, common_1.Controller)('users'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        pdf_extraction_service_1.PdfExtractionService,
        file_storage_service_1.FileStorageService,
        pdf_image_service_1.PdfImageService,
        bases_service_1.BasesService,
        contracts_service_1.ContractsService,
        grades_service_1.GradesService])
], UsersController);
//# sourceMappingURL=users.controller.js.map