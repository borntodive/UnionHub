import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClaContract } from './entities/cla-contract.entity';
import { ClaContractHistory } from './entities/cla-contract-history.entity';
import { CreateClaContractDto } from './dto/create-cla-contract.dto';
import { UpdateClaContractDto } from './dto/update-cla-contract.dto';

interface UserInfo {
  userId: string;
  crewcode: string;
}

@Injectable()
export class ClaContractsService {
  constructor(
    @InjectRepository(ClaContract)
    private claContractRepository: Repository<ClaContract>,
    @InjectRepository(ClaContractHistory)
    private historyRepository: Repository<ClaContractHistory>,
  ) {}

  // Find all contracts (optionally filter by year)
  async findAll(year?: number): Promise<ClaContract[]> {
    const query = this.claContractRepository.createQueryBuilder('contract')
      .orderBy('contract.role', 'ASC')
      .addOrderBy('contract.rank', 'ASC');

    if (year) {
      query.where('contract.effectiveYear = :year', { year });
    } else {
      query.where('contract.isActive = true');
    }

    return query.getMany();
  }

  // Find contract by ID
  async findById(id: string): Promise<ClaContract> {
    const contract = await this.claContractRepository.findOne({
      where: { id },
    });

    if (!contract) {
      throw new NotFoundException('CLA Contract not found');
    }

    return contract;
  }

  // Find contract by company, role, rank for a specific date
  async findByRank(
    company: string, 
    role: string, 
    rank: string, 
    date?: Date
  ): Promise<ClaContract | null> {
    const targetDate = date || new Date();
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth() + 1; // 1-12

    // Find the contract that is active for this date
    // A contract is valid if:
    // - effectiveYear < year OR (effectiveYear == year AND effectiveMonth <= month)
    // - AND (endYear is NULL OR endYear > year OR (endYear == year AND endMonth >= month))
    const query = this.claContractRepository.createQueryBuilder('contract')
      .where('contract.company = :company', { company })
      .andWhere('contract.role = :role', { role })
      .andWhere('contract.rank = :rank', { rank })
      .andWhere('contract.isActive = true')
      .andWhere(
        '(contract.effectiveYear < :year OR (contract.effectiveYear = :year AND contract.effectiveMonth <= :month))',
        { year, month }
      )
      .andWhere(
        '(contract.endYear IS NULL OR contract.endYear > :year OR (contract.endYear = :year AND contract.endMonth >= :month))',
        { year, month }
      );

    // Order by effective date descending to get the most recent applicable contract
    return query
      .orderBy('contract.effectiveYear', 'DESC')
      .addOrderBy('contract.effectiveMonth', 'DESC')
      .getOne();
  }

  // Get history for a contract
  async getHistory(contractId: string): Promise<ClaContractHistory[]> {
    return this.historyRepository.find({
      where: { contractId },
      order: { createdAt: 'DESC' },
    });
  }

  // Create new contract
  async create(
    createDto: CreateClaContractDto,
    user: UserInfo,
  ): Promise<ClaContract> {
    // Check for duplicate
    const existing = await this.claContractRepository.findOne({
      where: {
        company: createDto.company,
        role: createDto.role,
        rank: createDto.rank,
        effectiveYear: createDto.effectiveYear || new Date().getFullYear(),
        isActive: true,
      },
    });

    if (existing) {
      throw new ConflictException(
        `Active contract already exists for ${createDto.company}/${createDto.role}/${createDto.rank} in year ${createDto.effectiveYear || new Date().getFullYear()}`
      );
    }

    const contract = this.claContractRepository.create({
      ...createDto,
      createdBy: user.userId,
    });

    const saved = await this.claContractRepository.save(contract);

    // Log to history
    await this.logHistory(saved, 'CREATE', user);

    return saved;
  }

  // Update contract (creates new version, keeps old)
  async update(
    id: string,
    updateDto: UpdateClaContractDto,
    user: UserInfo,
  ): Promise<ClaContract> {
    const contract = await this.findById(id);
    const oldData = { ...contract };

    // Calculate changes
    const changes = this.calculateChanges(oldData, updateDto);

    // Update fields
    Object.assign(contract, updateDto, { updatedBy: user.userId });
    contract.version += 1;

    const saved = await this.claContractRepository.save(contract);

    // Log to history with changes
    await this.logHistory(saved, 'UPDATE', user, changes);

    return saved;
  }

  // Soft delete (deactivate)
  async deactivate(id: string, user: UserInfo): Promise<void> {
    const contract = await this.findById(id);

    contract.isActive = false;
    contract.updatedBy = user.userId;

    await this.claContractRepository.save(contract);
    await this.logHistory(contract, 'DEACTIVATE', user);
  }

  // Reactivate
  async activate(id: string, user: UserInfo): Promise<ClaContract> {
    const contract = await this.findById(id);

    contract.isActive = true;
    contract.updatedBy = user.userId;

    const saved = await this.claContractRepository.save(contract);
    await this.logHistory(saved, 'ACTIVATE', user);

    return saved;
  }

  // Clone contract for new year
  async cloneForYear(
    id: string,
    targetYear: number,
    user: UserInfo,
    isActive: boolean = true,
    effectiveMonth: number = 1,
  ): Promise<ClaContract> {
    const source = await this.findById(id);

    // Check if already exists for target year
    const existing = await this.claContractRepository.findOne({
      where: {
        company: source.company,
        role: source.role,
        rank: source.rank,
        effectiveYear: targetYear,
      },
    });

    if (existing) {
      throw new ConflictException(
        `Contract already exists for year ${targetYear}`
      );
    }

    // Create new contract with same data
    const clone = this.claContractRepository.create({
      company: source.company,
      role: source.role,
      rank: source.rank,
      basic: source.basic,
      ffp: source.ffp,
      sbh: source.sbh,
      al: source.al,
      oob: source.oob,
      woff: source.woff,
      allowance: source.allowance,
      diaria: source.diaria,
      rsa: source.rsa,
      trainingConfig: source.trainingConfig,
      effectiveYear: targetYear,
      effectiveMonth,
      isActive,
      createdBy: user.userId,
    });

    const saved = await this.claContractRepository.save(clone);
    const statusNote = isActive ? '' : ' (INACTIVE - pending review)';
    await this.logHistory(saved, 'CREATE', user, undefined, `Cloned from ${source.id}${statusNote} [Starts: ${effectiveMonth}/${targetYear}]`);

    return saved;
  }

  // Close a contract by setting end date and deactivating
  async close(
    id: string,
    endYear: number,
    endMonth: number,
    user: UserInfo,
  ): Promise<ClaContract> {
    const contract = await this.findById(id);

    // Validate end date is after effective date
    if (endYear < contract.effectiveYear || 
        (endYear === contract.effectiveYear && endMonth < contract.effectiveMonth)) {
      throw new ConflictException('End date must be after effective date');
    }

    const oldValues = {
      endYear: contract.endYear,
      endMonth: contract.endMonth,
      isActive: contract.isActive,
    };

    contract.endYear = endYear;
    contract.endMonth = endMonth;
    contract.isActive = false;

    const saved = await this.claContractRepository.save(contract);

    await this.logHistory(saved, 'UPDATE', user, [
      { field: 'endYear', oldValue: oldValues.endYear, newValue: endYear },
      { field: 'endMonth', oldValue: oldValues.endMonth, newValue: endMonth },
      { field: 'isActive', oldValue: oldValues.isActive, newValue: false },
    ], 'Contract closed');

    return saved;
  }

  // Delete all contracts for a specific year
  async deleteAllForYear(year: number, user: UserInfo): Promise<{ deleted: number }> {
    // Find all contracts for the year
    const contracts = await this.claContractRepository.find({
      where: { effectiveYear: year },
    });

    if (contracts.length === 0) {
      throw new NotFoundException(`No contracts found for year ${year}`);
    }

    // Log deletion for each contract before removing
    for (const contract of contracts) {
      await this.logHistory(contract, 'DELETE', user, undefined, `Bulk delete for year ${year}`);
    }

    // Delete all contracts
    const result = await this.claContractRepository.delete({ effectiveYear: year });

    return { deleted: result.affected || 0 };
  }

  // Private: Log to history
  private async logHistory(
    contract: ClaContract,
    action: string,
    user: UserInfo,
    changes?: { field: string; oldValue: any; newValue: any }[],
    note?: string,
  ): Promise<void> {
    const history = this.historyRepository.create({
      contractId: action === 'DELETE' ? null : contract.id,
      action,
      performedBy: user.userId,
      performerCrewcode: user.crewcode,
      dataSnapshot: {
        company: contract.company,
        role: contract.role,
        rank: contract.rank,
        basic: contract.basic,
        ffp: contract.ffp,
        sbh: contract.sbh,
        al: contract.al,
        oob: contract.oob,
        woff: contract.woff,
        allowance: contract.allowance,
        diaria: contract.diaria,
        rsa: contract.rsa,
        trainingConfig: contract.trainingConfig,
        effectiveYear: contract.effectiveYear,
        isActive: contract.isActive,
        version: contract.version,
      },
      changes,
    });

    await this.historyRepository.save(history);
  }

  // Private: Calculate changes between old and new data
  private calculateChanges(
    oldData: ClaContract,
    newData: UpdateClaContractDto,
  ): { field: string; oldValue: any; newValue: any }[] {
    const changes: { field: string; oldValue: any; newValue: any }[] = [];
    const fieldsToCompare: (keyof UpdateClaContractDto)[] = [
      'basic', 'ffp', 'sbh', 'al', 'oob', 'woff',
      'allowance', 'diaria', 'rsa', 'trainingConfig', 'isActive'
    ];

    for (const field of fieldsToCompare) {
      const newValue = newData[field];
      const oldValue = (oldData as any)[field];
      if (newValue !== undefined && newValue !== oldValue) {
        changes.push({
          field,
          oldValue,
          newValue,
        });
      }
    }

    return changes;
  }
}
