"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var FileStorageService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileStorageService = void 0;
const common_1 = require("@nestjs/common");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const uuid_1 = require("uuid");
let FileStorageService = FileStorageService_1 = class FileStorageService {
    constructor() {
        this.logger = new common_1.Logger(FileStorageService_1.name);
        this.uploadDir = path.join(process.cwd(), 'uploads', 'registration-forms');
        this.ensureUploadDirExists();
    }
    ensureUploadDirExists() {
        if (!fs.existsSync(this.uploadDir)) {
            fs.mkdirSync(this.uploadDir, { recursive: true });
            this.logger.log(`Created upload directory: ${this.uploadDir}`);
        }
    }
    async savePdf(buffer, originalName, crewcode) {
        try {
            const userDir = path.join(this.uploadDir, crewcode);
            if (!fs.existsSync(userDir)) {
                fs.mkdirSync(userDir, { recursive: true });
            }
            const timestamp = Date.now();
            const sanitizedOriginal = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
            const filename = `${timestamp}_${(0, uuid_1.v4)().slice(0, 8)}_${sanitizedOriginal}`;
            const filePath = path.join(userDir, filename);
            await fs.promises.writeFile(filePath, buffer);
            const fileUrl = `/uploads/registration-forms/${crewcode}/${filename}`;
            this.logger.log(`Saved PDF for ${crewcode}: ${fileUrl}`);
            return { filePath, fileUrl };
        }
        catch (error) {
            this.logger.error(`Failed to save PDF: ${error.message}`, error.stack);
            throw new Error('Failed to save PDF file');
        }
    }
    getFilePathFromUrl(fileUrl) {
        const relativePath = fileUrl.replace(/^\/uploads\//, '');
        return path.join(process.cwd(), 'uploads', relativePath);
    }
    async deleteFile(fileUrl) {
        try {
            const filePath = this.getFilePathFromUrl(fileUrl);
            if (fs.existsSync(filePath)) {
                await fs.promises.unlink(filePath);
                this.logger.log(`Deleted file: ${filePath}`);
            }
        }
        catch (error) {
            this.logger.error(`Failed to delete file: ${error.message}`);
        }
    }
    fileExists(fileUrl) {
        try {
            const filePath = this.getFilePathFromUrl(fileUrl);
            return fs.existsSync(filePath);
        }
        catch {
            return false;
        }
    }
};
exports.FileStorageService = FileStorageService;
exports.FileStorageService = FileStorageService = FileStorageService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], FileStorageService);
//# sourceMappingURL=file-storage.service.js.map