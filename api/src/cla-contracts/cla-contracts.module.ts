import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ClaContractsController } from "./cla-contracts.controller";
import { ClaContractsPublicController } from "./cla-contracts-public.controller";
import { ClaContractsService } from "./cla-contracts.service";
import { ClaContract } from "./entities/cla-contract.entity";
import { ClaContractHistory } from "./entities/cla-contract-history.entity";

@Module({
  imports: [TypeOrmModule.forFeature([ClaContract, ClaContractHistory])],
  controllers: [ClaContractsController, ClaContractsPublicController],
  providers: [ClaContractsService],
  exports: [ClaContractsService],
})
export class ClaContractsModule {}
