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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const bcrypt = __importStar(require("bcrypt"));
const users_service_1 = require("../users/users.service");
const refresh_token_entity_1 = require("../refresh-tokens/entities/refresh-token.entity");
const typeorm_1 = require("typeorm");
const typeorm_2 = require("@nestjs/typeorm");
let AuthService = class AuthService {
    constructor(usersService, jwtService, configService, refreshTokenRepository) {
        this.usersService = usersService;
        this.jwtService = jwtService;
        this.configService = configService;
        this.refreshTokenRepository = refreshTokenRepository;
    }
    async login(loginDto, ipAddress, userAgent) {
        const user = await this.usersService.findByCrewcode(loginDto.crewcode);
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid crewcode or password');
        }
        const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
        if (!isPasswordValid) {
            throw new common_1.UnauthorizedException('Invalid crewcode or password');
        }
        if (!user.isActive) {
            throw new common_1.UnauthorizedException('Account is deactivated');
        }
        const tokens = await this.generateTokens(user, ipAddress, userAgent);
        const isDev = process.env.NODE_ENV === 'development';
        const serializedUser = user.serialize(user.role);
        if (isDev) {
            serializedUser.mustChangePassword = false;
        }
        return {
            ...tokens,
            user: serializedUser,
        };
    }
    async refreshTokens(refreshToken, ipAddress, userAgent) {
        const tokenEntity = await this.refreshTokenRepository.findOne({
            where: { token: refreshToken },
            relations: ['user'],
        });
        if (!tokenEntity || !tokenEntity.isValid()) {
            throw new common_1.UnauthorizedException('Invalid or expired refresh token');
        }
        tokenEntity.isRevoked = true;
        await this.refreshTokenRepository.save(tokenEntity);
        const tokens = await this.generateTokens(tokenEntity.user, ipAddress, userAgent);
        const isDev = process.env.NODE_ENV === 'development';
        const serializedUser = tokenEntity.user.serialize(tokenEntity.user.role);
        if (isDev) {
            serializedUser.mustChangePassword = false;
        }
        return {
            ...tokens,
            user: serializedUser,
        };
    }
    async logout(refreshToken) {
        const tokenEntity = await this.refreshTokenRepository.findOne({
            where: { token: refreshToken },
        });
        if (tokenEntity) {
            tokenEntity.isRevoked = true;
            await this.refreshTokenRepository.save(tokenEntity);
        }
    }
    async logoutAllDevices(userId) {
        await this.refreshTokenRepository.update({ userId, isRevoked: false }, { isRevoked: true });
    }
    async changePassword(userId, changePasswordDto, isForced = false) {
        const user = await this.usersService.findById(userId);
        if (!user) {
            throw new common_1.UnauthorizedException('User not found');
        }
        if (!isForced && 'currentPassword' in changePasswordDto) {
            const isCurrentPasswordValid = await bcrypt.compare(changePasswordDto.currentPassword, user.password);
            if (!isCurrentPasswordValid) {
                throw new common_1.BadRequestException('Current password is incorrect');
            }
        }
        const hashedPassword = await bcrypt.hash(changePasswordDto.newPassword, 10);
        await this.usersService.updatePassword(userId, hashedPassword);
        await this.usersService.updateMustChangePassword(userId, false);
        await this.logoutAllDevices(userId);
    }
    async getProfile(userId) {
        const user = await this.usersService.findById(userId);
        if (!user) {
            throw new common_1.UnauthorizedException('User not found');
        }
        return user.serialize(user.role);
    }
    async generateTokens(user, ipAddress, userAgent) {
        const payload = {
            sub: user.id,
            crewcode: user.crewcode,
            role: user.role,
            ruolo: user.ruolo,
        };
        const accessToken = this.jwtService.sign(payload, {
            secret: this.configService.get('JWT_SECRET'),
            expiresIn: '15m',
        });
        const refreshToken = this.jwtService.sign(payload, {
            secret: this.configService.get('JWT_SECRET'),
            expiresIn: '30d',
        });
        const refreshExpirationDays = parseInt(this.configService.get('JWT_REFRESH_EXPIRATION', '30d').replace('d', ''), 10);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + refreshExpirationDays);
        const refreshTokenEntity = this.refreshTokenRepository.create({
            userId: user.id,
            token: refreshToken,
            expiresAt,
            ipAddress: ipAddress || null,
            userAgent: userAgent || null,
        });
        await this.refreshTokenRepository.save(refreshTokenEntity);
        const accessExpirationMinutes = parseInt(this.configService.get('JWT_ACCESS_EXPIRATION', '15m').replace('m', ''), 10);
        const expiresIn = accessExpirationMinutes * 60;
        return {
            accessToken,
            refreshToken,
            expiresIn,
        };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, typeorm_2.InjectRepository)(refresh_token_entity_1.RefreshToken)),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        jwt_1.JwtService,
        config_1.ConfigService,
        typeorm_1.Repository])
], AuthService);
//# sourceMappingURL=auth.service.js.map