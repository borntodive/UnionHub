import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BasesService } from './bases.service';
import { BasesController } from './bases.controller';
import { Base } from './entities/base.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Base])],
  controllers: [BasesController],
  providers: [BasesService],
  exports: [BasesService],
})
export class BasesModule {}
