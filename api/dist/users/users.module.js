"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const users_service_1 = require("./users.service");
const users_controller_1 = require("./users.controller");
const user_entity_1 = require("./entities/user.entity");
const user_status_history_entity_1 = require("./entities/user-status-history.entity");
const pdf_extraction_service_1 = require("./services/pdf-extraction.service");
const file_storage_service_1 = require("./services/file-storage.service");
const pdf_image_service_1 = require("./services/pdf-image.service");
const bases_module_1 = require("../bases/bases.module");
const contracts_module_1 = require("../contracts/contracts.module");
const grades_module_1 = require("../grades/grades.module");
let UsersModule = class UsersModule {
};
exports.UsersModule = UsersModule;
exports.UsersModule = UsersModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([user_entity_1.User, user_status_history_entity_1.UserStatusHistory]),
            bases_module_1.BasesModule,
            contracts_module_1.ContractsModule,
            grades_module_1.GradesModule,
        ],
        controllers: [users_controller_1.UsersController],
        providers: [users_service_1.UsersService, pdf_extraction_service_1.PdfExtractionService, file_storage_service_1.FileStorageService, pdf_image_service_1.PdfImageService],
        exports: [users_service_1.UsersService],
    })
], UsersModule);
//# sourceMappingURL=users.module.js.map