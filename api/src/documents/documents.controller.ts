import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Request,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { CreateDocumentDto, ReviewDocumentDto, ApproveDocumentDto } from './dto/create-document.dto';

interface RequestWithUser extends Request {
  user: {
    userId: string;
    crewcode: string;
    role: UserRole;
  };
}

/**
 * Documents Controller
 * Manage union communications with AI assistance
 * ADMIN and SUPERADMIN access
 */
@Controller('documents')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  async findAll() {
    return this.documentsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.documentsService.findById(id);
  }

  @Post()
  async create(
    @Body() dto: CreateDocumentDto,
    @Request() req: RequestWithUser,
  ) {
    return this.documentsService.create(dto, {
      userId: req.user.userId,
      crewcode: req.user.crewcode,
    });
  }

  @Post(':id/review')
  async review(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewDocumentDto,
  ) {
    return this.documentsService.review(id, dto);
  }

  @Post(':id/approve')
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveDocumentDto,
    @Request() req: RequestWithUser,
  ) {
    return this.documentsService.approve(id, dto, {
      userId: req.user.userId,
      crewcode: req.user.crewcode,
    });
  }

  @Post(':id/publish')
  async publish(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: RequestWithUser,
  ) {
    return this.documentsService.publish(id, {
      userId: req.user.userId,
      crewcode: req.user.crewcode,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    await this.documentsService.delete(id);
  }

  @Get('health/ollama')
  async checkOllamaHealth() {
    return this.documentsService.checkOllamaHealth();
  }
}
