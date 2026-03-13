import { Injectable } from '@angular/core';
import { StorageService } from '../storage.service';
import moment from 'moment';
import { PayslipData } from '../../data/payslip';

@Injectable({
  providedIn: 'root',
})
export class PayrollService {
  constructor(
    private storageService: StorageService,
    private payslipData: PayslipData
  ) {}
  private readonly SETTINGS_STORAGE_KEY = 'payslipSettings';

  async getActiveContractSettings(): Promise<{
    company: string | null;
    role: string | null;
    rank: string | null;
  }> {
    try {
      const savedSettings = await this.storageService.get(
        this.SETTINGS_STORAGE_KEY
      );
      if (savedSettings) {
        return {
          company: savedSettings.company || null,
          role: savedSettings.role || null,
          rank: savedSettings.rank || null,
        };
      }
      return { company: null, role: null, rank: null };
    } catch (error) {
      console.error('Error loading active contract settings:', error);
      return { company: null, role: null, rank: null };
    }
  }

  private getClaRankKey(companyData: any, rank: string): string | null {
    if (!companyData.claRanks) {
      return null;
    }

    const rankLower = rank.toLowerCase();
    const claRanks = companyData.claRanks as Record<string, string[]>;

    // Find which claRank key contains this rank
    for (const [key, ranks] of Object.entries(claRanks)) {
      if (Array.isArray(ranks) && ranks.includes(rankLower)) {
        return key;
      }
    }

    return null;
  }

  /**
   * Get the union rank key for a given rank
   * Maps the actual rank to the union rank key used for union fees
   * @param companyData Company data containing unionRanks
   * @param rank The actual rank (lowercase)
   * @returns The union rank key (e.g., 'cpt', 'fo', 'cc') or null
   */
  private getUnionRankKey(companyData: any, rank: string): string | null {
    if (!companyData.unionRanks) {
      return null;
    }

    const rankLower = rank.toLowerCase();
    const unionRanks = companyData.unionRanks as Record<string, string[]>;

    // Find which unionRank key contains this rank
    for (const [key, ranks] of Object.entries(unionRanks)) {
      if (Array.isArray(ranks) && ranks.includes(rankLower)) {
        return key;
      }
    }

    return null;
  }

  /**
   * Get the union fee for a given rank
   * @param companyData Company data containing unionFees and unionRanks
   * @param rank The actual rank (lowercase)
   * @returns The union fee amount or 0 if not found
   */
  private getUnionFee(companyData: any, rank: string): number {
    if (!companyData.unionFees || !companyData.unionRanks) {
      return 0;
    }

    const unionRankKey = this.getUnionRankKey(companyData, rank);
    if (!unionRankKey) {
      return 0;
    }

    const unionFees = companyData.unionFees as Record<string, number>;
    return unionFees[unionRankKey] || 0;
  }

  /**
   * Get active corrections for a given date and role
   * Returns all corrections that are active up to the given date
   * @param companyCode Company code
   * @param role Role (pilot or cc)
   * @param date Date to check corrections against (defaults to current date)
   * @returns Array of active corrections
   */
  private getActiveCorrections(
    companyCode: string,
    role: string,
    date: moment.Moment = moment()
  ): any[] {
    const companyData =
      this.payslipData.companies[
        companyCode as keyof typeof this.payslipData.companies
      ];
    if (!companyData || !companyData.claCorrection) {
      return [];
    }

    const roleKey = role.toLowerCase();
    const claCorrections = companyData.claCorrection as Record<string, any[]>;
    const roleCorrections = claCorrections[roleKey];

    if (!Array.isArray(roleCorrections)) {
      return [];
    }

    // Filter corrections that are active (date <= given date)
    return roleCorrections.filter((correction) => {
      if (!correction.date) {
        return false;
      }
      return moment(correction.date).isSameOrBefore(date, 'day');
    });
  }

  /**
   * Apply CLA corrections to contract data
   * @param contractData Original contract data
   * @param companyCode Company code
   * @param role Role (pilot or cc)
   * @param rank Rank (lowercase)
   * @param date Date to check corrections against (defaults to current date)
   * @returns Contract data with corrections applied
   */
  applyClaCorrections(
    contractData: any,
    companyCode: string,
    role: string,
    rank: string,
    date: moment.Moment = moment()
  ): any {
    // Create a deep copy to avoid mutating original
    const correctedData = JSON.parse(JSON.stringify(contractData));

    const companyData =
      this.payslipData.companies[
        companyCode as keyof typeof this.payslipData.companies
      ];
    if (!companyData) {
      return correctedData;
    }

    // Get the CLA rank key for this rank
    const claRankKey = this.getClaRankKey(companyData, rank);
    if (!claRankKey) {
      return correctedData;
    }

    // Get all active corrections for this date
    const activeCorrections = this.getActiveCorrections(
      companyCode,
      role,
      date
    );

    // Apply each correction
    activeCorrections.forEach((correction) => {
      if (!correction.corrections) {
        return;
      }

      // Get the correction for this CLA rank key
      const rankCorrection = correction.corrections[claRankKey];
      if (!rankCorrection) {
        return;
      }

      // Apply each correction (e.g., ffp: 3000/12 means add to ffp)
      Object.entries(rankCorrection).forEach(([key, value]) => {
        if (typeof value === 'number' && correctedData[key] !== undefined) {
          correctedData[key] = (correctedData[key] || 0) + value;
        }
      });
    });

    return correctedData;
  }

  /**
   * Get the active contract data directly with corrections applied
   * Returns the specific contract configuration based on company, role, and rank
   * @param date Optional date to check corrections against (defaults to current date)
   * @returns Promise with the active contract data or null
   */
  async getActiveContract(date: moment.Moment = moment()): Promise<any> {
    const settings = await this.getActiveContractSettings();

    const { company, role, rank } = settings;

    // If any required setting is missing, return null
    if (!company || !role || !rank) {
      return null;
    }

    // Get company data
    const companyData =
      this.payslipData.companies[
        company as keyof typeof this.payslipData.companies
      ];
    if (!companyData || !companyData.claTables) {
      return null;
    }

    // Get role data using type assertion for dynamic property access
    const roleKey = role.toLowerCase();
    console.log('roleKey', roleKey);
    const claTables = companyData.claTables as Record<string, any>;
    const roleData = claTables[roleKey];
    if (!roleData) {
      return null;
    }

    // Get rank data
    const rankKey = rank.toLowerCase();
    const rankData = roleData[rankKey];
    if (!rankData) {
      return null;
    }

    // Apply CLA corrections
    const correctedContractData = this.applyClaCorrections(
      rankData,
      company,
      role,
      rank,
      date
    );

    // Get and add union fee to contract data
    const unionFee = this.getUnionFee(companyData, rank);
    correctedContractData.maxContributoAziendaleTfr =
      companyData.maxContributoAziendaleTfr;
    correctedContractData.cuReduction = companyData.cuReduction;
    correctedContractData.unpayedLeaveDays = companyData.unpayedLeaveDays;
    correctedContractData.inpsDays = companyData.inpsDays;
    correctedContractData.unpayedLeaveDays = this.getUnpayedLeaveDays(
      companyData,
      role
    );
    correctedContractData.unionFee = unionFee;

    return {
      company,
      role,
      rank,
      contractData: correctedContractData,
      originalContractData: rankData,
      companyData,
      appliedCorrections: this.getActiveCorrections(company, role, date),
      unionFee,
    };
  }
  private getUnpayedLeaveDays(companyData: any, role: string): number {
    return companyData.unpayedLeaveDays[role.toLowerCase()];
  }
  //#########SERVE??????????######
  async getActiveCompanies(): Promise<typeof this.payslipData.companies> {
    const settings = await this.getActiveContractSettings();
    const { company, role } = settings;

    // If no company or role is set, return empty object
    if (!company || !role) {
      return {} as typeof this.payslipData.companies;
    }

    // Find the company data
    const companyData =
      this.payslipData.companies[
        company as keyof typeof this.payslipData.companies
      ];
    if (!companyData) {
      return {} as typeof this.payslipData.companies;
    }

    // Filter claTables to only include the active role
    const roleKey = role.toLowerCase();
    const claTables = companyData.claTables as Record<string, any>;
    const filteredClaTables: Record<string, any> = {};
    if (claTables && claTables[roleKey]) {
      filteredClaTables[roleKey] = claTables[roleKey];
    }

    // Return filtered company data
    return {
      [company]: {
        ...companyData,
        claTables: filteredClaTables,
      },
    } as typeof this.payslipData.companies;
  }
}
