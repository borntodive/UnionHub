import { inject, Injectable } from '@angular/core';
import { PayrollService } from './payroll.service';
import { PayslipHelper } from 'src/app/helpers/payslip.helper';
import {
  AdditionalDeductionInput,
  AdditionalInput,
  AdditionalItem,
  FondoPensione,
  IRPEF,
  Payroll,
  Payslip,
  PayslipItem,
  Settings,
} from 'src/app/interfaces/payroll';
import { PayslipData } from 'src/app/data/payslip';
import moment from 'moment';
import { range } from 'lodash';
import { PayrollInputStore } from './payroll-input.store';
type SettingsWithInstructor = Settings & {
  isCCInstructor?: () => boolean;
};

@Injectable({
  providedIn: 'root',
})
export class PayrollCalculatorService {
  private readonly payslipHelper = inject(PayslipHelper);
  private readonly payrollService = inject(PayrollService);
  private readonly payslipData = inject(PayslipData);
  private readonly payrollInputStore = inject(PayrollInputStore);
  private settings: any | null = null;
  private input: any | null = null;
  private activeContractData: any | null = null;
  private store: any | null = null;
  private MAX_TAX_FREE_DIARIA = this.payslipData.maxTaxFreeDiaria;
  constructor() {}

  async calculatePayroll(
    contract: any,
    vm: PayrollInputStore['vm']
  ): Promise<Payroll> {
    const snapshot = vm();
    this.store = snapshot;

    this.activeContractData = contract;
    this.input = snapshot.form.value;
    this.settings = snapshot.settings;

    const payslipItems = await this.calculatePayslipItems();
    console.log('payslipItems', payslipItems);
    const sectorPay = this.payslipHelper.calculatePayslipItem(
      this.payslipHelper.calculateSectorPay(payslipItems, contract),
      50
    );
    const {
      taxArea,
      taxFreeArea,
      grossPay,
      totalContributions,
      totalDeductions,
    } = this.payslipHelper.calculateTaxAreas(payslipItems);

    const areaINPS = this.payslipHelper.calculateContributiInps(
      Math.round(taxArea),
      this.input.date,
      this.activeContractData.inpsDays
    );
    console.log('areaINPS', areaINPS);
    const tfr = this.payslipHelper.calculateTFR(
      payslipItems,
      this.settings.rank,
      areaINPS.imponibile
    );
    const fondoPensione: FondoPensione =
      this.payslipHelper.calculateFondoPensione(
        tfr.retribuzioneUtileTFR,
        this.settings.tfrContribution,
        this.activeContractData
      );
    const contributiIRPEF = this.payslipHelper.calculateContributiIrpef(
      taxArea,
      areaINPS,
      payslipItems.additionalPayments,
      this.input.date,
      this.settings.coniugeCarico,
      fondoPensione.volontaria,
      this.input.pregressoIrpef
    );
    const areaIRPEF: IRPEF = {
      addizionaliComunali: this.settings.addComunali,
      accontoAddizionaliComunali: this.settings.accontoAddComunali,
      addizionaliRegionali: this.settings.addRegionali,
      ...contributiIRPEF,
      ...tfr,
      fondoPensione,
    } as unknown as IRPEF;

    const { positiveConguaglio, negativeConguaglio } = this.calculateConguaglio(
      this.input.additional,
      this.input.additionalDeductions
    );

    const totaleCompetenze =
      totalContributions +
      this.payslipHelper.calculateAdditionalTaxFree(
        payslipItems.additionalPayments
      ) +
      areaINPS.esenzioneIVS.amount +
      areaIRPEF.trattamentoIntegrativo +
      positiveConguaglio;
    // positiveConguaglio;

    const totaleTrattenute =
      totalDeductions +
      areaINPS.contribuzioneTotale +
      contributiIRPEF.ritenute +
      fondoPensione.volontaria +
      areaIRPEF.addizionaliComunali +
      areaIRPEF.accontoAddizionaliComunali +
      areaIRPEF.addizionaliRegionali +
      negativeConguaglio;

    const netPayment = totaleCompetenze - totaleTrattenute;
    console.log('netPayment', netPayment);
    return {
      payslipItems,
      sectorPay,
      taxArea,
      taxFreeArea,
      grossPay,
      areaINPS,
      areaIRPEF,
      netPayment,
      totaleCompetenze,
      totaleTrattenute,
    };
  }
  private async calculatePayslipItems(): Promise<Payslip> {
    const basic = this.payslipHelper.calculatePayslipItem(
      this.activeContractData.basic,
      100,
      this.activeContractData.basicDays
    );
    const basic13th = this.payslipHelper.calculatePayslipItem(
      await this.calculateBasic13th(),
      100
    );
    const ffp = this.payslipHelper.calculatePayslipItem(
      this.calculateFfp(),
      50
    );
    const { flyDiaria, noFlyDiaria } = this.calculateDiaria();
    console.log('flyDiaria', flyDiaria);
    const ccTraining = this.payslipHelper.calculatePayslipItem(
      this.calculateCCTraining(),
      50,
      this.input?.ccTrainingDays ?? 0,
      false,
      true
    );
    const commissions = this.payslipHelper.calculatePayslipItem(
      this.input?.commissions ?? 0,
      100
    );
    const al = this.payslipHelper.calculatePayslipItem(
      this.calculateAl(),
      50,
      this.input?.al ?? 0,
      false,
      true
    );
    const bankHolydays = this.payslipHelper.calculatePayslipItem(
      this.calculatebankHolydays(),
      50,
      this.input?.bankHolydays ?? 0,
      false,
      true
    );
    const woff = this.payslipHelper.calculatePayslipItem(
      this.calculateWoff(),
      50,
      this.input?.woff ?? 0,
      false,
      true
    );
    const oob = this.payslipHelper.calculatePayslipItem(
      this.calculateOob(),
      100
    );
    const union = this.payslipHelper.calculatePayslipItem(
      this.settings.unionFee,
      0,
      1,
      true
    );
    const oobUnplanned = this.payslipHelper.calculatePayslipItem(
      this.calculateOobUnplanned(),
      100
    );
    const ul = this.calculateUl(basic.total, ffp.total);
    const simPay = this.payslipHelper.calculatePayslipItem(
      this.calculateSimPay(),
      50,
      this.input?.simDays ?? 0,
      false,
      true
    );
    const trainingPay = this.payslipHelper.calculatePayslipItem(
      this.calculateTrainingPay(),
      50,
      this.input?.trainingSectors ?? 0,
      false,
      true
    );
    const sbh = this.payslipHelper.calculatePayslipItem(
      this.calculateSBH(),
      50,
      this.input?.sbh ?? 0,
      false,
      true
    );
    const itud = this.payslipHelper.calculatePayslipItem(
      this.calculateItud(),
      50,
      this.input?.itud ?? 0,
      false,
      true
    );

    const rsa = this.payslipHelper.calculatePayslipItem(
      this.store.isRSA ? this.activeContractData.rsa : 0,
      100,
      1,
      false,
      false
    );
    const parentalLeave = this.calculateparentalLeave(ffp.total);
    const leave104 = this.calculateLeave104(ffp.total);
    const additionalPayments = this.calculateAdditionalPayments();
    const additionalDeductions = this.calculateAdditionalDeductions();
    return {
      basic,
      basic13th,
      ffp,
      flyDiaria,
      noFlyDiaria,
      ccTraining,
      al,
      woff,
      oob,
      oobUnplanned,
      ul,
      simPay,
      trainingPay,
      parentalLeave,
      leave104,
      sbh,
      itud,
      additionalPayments,
      commissions,
      rsa,
      bankHolydays,
      union,
      additionalDeductions,
    };
  }
  private calculateSectorPay(): PayslipItem | null {
    return null;
  }
  private calculateConguaglio(
    additionals: AdditionalInput[],
    deductions: AdditionalDeductionInput[]
  ): { positiveConguaglio: number; negativeConguaglio: number } {
    let positiveConguaglio = 0;
    let negativeConguaglio = 0;
    for (const additional of additionals) {
      if (additional.isConguaglio) {
        positiveConguaglio += additional.amount;
      }
    }
    for (const deduction of deductions) {
      if (deduction.isConguaglio) {
        negativeConguaglio += deduction.amount;
      }
    }
    return {
      positiveConguaglio,
      negativeConguaglio,
    };
  }
  private calculateDiaria() {
    if (!this.store.isCCInstructor) {
      console.log('calculateDiaria', this.calculateFlyDiaria());
      console.log('calculateNoFlyDiaria', this.calculateNoFlyDiaria());
      return {
        flyDiaria: this.payslipHelper.calculatePayslipItem(
          this.calculateFlyDiaria(),
          0,
          this.input?.flyDiaria ?? 0
        ),
        noFlyDiaria: this.payslipHelper.calculatePayslipItem(
          this.calculateNoFlyDiaria(),
          100,
          this.input?.noFlyDiaria ?? 0
        ),
      };
    } else {
      const { flyDiaria, noFlyDiaria } = this.calculateOnlyNationalFlyDiaria();
      return {
        flyDiaria: this.payslipHelper.calculatePayslipItem(
          flyDiaria,
          0,
          this.input?.flyDiaria ?? 0
        ),
        noFlyDiaria: this.payslipHelper.calculatePayslipItem(
          noFlyDiaria,
          100,
          this.input?.noFlyDiaria ?? 0
        ),
      };
    }
  }
  private calculateOnlyNationalFlyDiaria() {
    let flyDiaria =
      (this.input?.flyDiaria - this.input?.onlyNationalFly) *
      this.activeContractData.diaria;
    let noFlyDiaria = this.input?.noFlyDiaria * this.activeContractData.diaria;
    const taxFreeFlyDiaria =
      this.input.onlyNationalFly * this.MAX_TAX_FREE_DIARIA;
    const taxableFlyDiaria =
      this.input?.onlyNationalFly *
      (this.activeContractData.diaria - this.MAX_TAX_FREE_DIARIA);
    flyDiaria += taxFreeFlyDiaria;
    noFlyDiaria += taxableFlyDiaria;
    return {
      flyDiaria,
      noFlyDiaria,
    };
  }

  private async calculateBasic13th() {
    let b13 = 0;
    let c = 0;
    if (this.payslipHelper.isDecember(moment(this.input?.date ?? new Date()))) {
      for (const month of range(0, 12)) {
        const fakeDate = moment(
          'this.momentDate.year()-' + month + '-28',
          'YYYY-MM-DD'
        ).set({
          hour: 0,
          minute: 0,
          second: 0,
        });

        const cuCla = await this.payrollService.getActiveContract(fakeDate);
        b13 += cuCla.contractData.basic;
        c++;
      }
    }
    return b13 / 12;
  }

  public calculateFfp() {
    console.log(this.calculateTrainingAllowance());
    let ffp =
      this.activeContractData.ffp +
      this.activeContractData.allowance +
      this.calculateTrainingAllowance();

    if (this.store.isSimInstructor) {
      ffp += this.calculateSimAllowance();
    }

    return ffp;
  }

  private getTrainersRates(tri = false) {
    return {
      simDiaria: [
        {
          min: 1,
          max: 999,
          pay: {
            ffp: 0,
            sectorPay: 0,
          },
        },
      ],
      allowance: 0,
    };
  }
  private calculateSimAllowance() {
    const simRates = this.getTrainersRates();
    if (!simRates?.simDiaria) return 0;

    const diarias = simRates.simDiaria;
    const simDays = this.input?.simDays ?? 0;
    diarias.sort((a: any, b: any) => a.min - b.min);
    let allowance = 0;
    for (const diaria of diarias) {
      // Calcoliamo solo i settori che rientrano in questo livello
      if (simDays >= diaria.min) {
        const daysAtRate = Math.min(simDays, diaria.max) - diaria.min + 1;
        allowance += daysAtRate * diaria.pay.ffp;
      }
    }
    return allowance;
  }
  public calculateTrainingAllowance() {
    const simRates = this.getTrainersRates();
    const trainingAllowance = this.activeContractData?.training?.allowance;
    if (!simRates?.allowance && !trainingAllowance) return 0;

    let allowance = trainingAllowance ? trainingAllowance : 0;
    if (simRates?.allowance) allowance += simRates.allowance;
    if (
      this.settings.rank === 'tre' ||
      (this.settings.rank === 'tri' && this.settings.triAndLtc)
    ) {
      allowance += this.activeContractData?.training?.allowance ?? 0;
      if (this.settings.rank === 'tre')
        allowance += this.getTrainersRates(true).allowance;
    }

    return allowance;
  }
  private calculateFlyDiaria() {
    console.log('calculateFlyDiaria', this.activeContractData.diaria);
    const dayOffDiaria =
      (this.input?.landingInOffDay * this.activeContractData.diaria) / 2;
    return (
      this.input?.flyDiaria * this.activeContractData.diaria + dayOffDiaria
    );
  }
  private calculateNoFlyDiaria() {
    return this.input?.noFlyDiaria * this.activeContractData.diaria;
  }

  private calculateCCTraining() {
    if (!this.activeContractData?.trainingDiaria) return 0;
    return this.input?.ccTrainingDays * this.activeContractData.trainingDiaria;
  }

  private calculateAl() {
    return this.input?.al * this.activeContractData.al;
  }
  private calculatebankHolydays() {
    return this.input?.bankHolydays * this.activeContractData.al;
  }
  private calculateWoff() {
    if (!this.activeContractData?.woff) return 0;
    return this.activeContractData.woff * this.input?.woff;
  }
  private calculateOob() {
    return this.input?.oob * this.activeContractData.oob;
  }
  private calculateOobUnplanned() {
    if (!this.activeContractData?.oobUnplanned) return 0;
    return this.input?.oobUnplanned * this.activeContractData.oob;
  }

  private calculateUl(basic: number, ffp: number) {
    return this.payslipHelper.calculateLeaveItem(
      this.input?.ul ?? 0,
      basic,
      ffp,
      this.settings.prevMonthLeavePayment,
      false,
      null,
      this.settings.rank,
      this.activeContractData
    );
  }

  private calculateSimPay() {
    const simRates = this.getTrainersRates();
    if (!simRates?.simDiaria) return 0;

    const diarias = simRates.simDiaria;
    const simDays = this.input?.simDays ?? 0;
    diarias.sort((a: any, b: any) => a.min - b.min);
    let simPay = 0;
    for (const diaria of diarias) {
      // Calcoliamo solo i settori che rientrano in questo livello
      if (simDays >= diaria.min) {
        const daysAtRate = Math.min(simDays, diaria.max) - diaria.min + 1;
        simPay += daysAtRate * diaria.pay.sectorPay;
      }
    }
    return simPay;
  }

  private calculateTrainingPay() {
    if (!this.settings.isLtc) return 0;

    let sectors = this.input?.trainingSectors ?? 0;
    if (this.activeContractData?.training?.bonus?.sectorEquivalent) {
      sectors += Math.floor(
        this.input?.simDays ??
          0 / this.activeContractData.training.bonus.sectorEquivalent
      );
    }
    const rates = this.activeContractData?.training?.bonus?.pay;
    let trainingPay = 0;
    // Ordiniamo i livelli di paga in base al minimo di settori per sicurezza
    rates.sort((a: any, b: any) => a.min - b.min);

    for (const rate of rates) {
      // Calcoliamo solo i settori che rientrano in questo livello
      if (sectors >= rate.min) {
        const sectorsAtRate = Math.min(sectors, rate.max) - rate.min + 1;
        trainingPay += sectorsAtRate * rate.pay;
      }
    }

    return trainingPay;
  }
  private calculateSBH() {
    const sbh = this.input?.sbh ?? 0;
    return this.activeContractData.sbh * sbh;
  }

  private calculateItud() {
    return this.input?.itud * this.activeContractData.itud;
  }
  private calculateAdditionalPayments() {
    let additionalPayments: AdditionalItem[] = [];
    for (const add of this.input?.additional ?? []) {
      let val = this.payslipHelper.calculatePayslipItem(
        add.amount,
        add.tax
      ) as unknown as AdditionalItem;
      val.isSLR = add.isSLR;
      additionalPayments.push(val);
    }
    return additionalPayments;
  }
  private calculateAdditionalDeductions() {
    let additionalDeductions: AdditionalItem[] = [];
    for (const add of this.input?.additionalDeductions ?? []) {
      let val = this.payslipHelper.calculatePayslipItem(
        add.amount,
        add.tax,
        null,
        true
      ) as unknown as AdditionalItem;
      val.isConguaglio = add.isConguaglio;

      additionalDeductions.push(val);
    }
    return additionalDeductions;
  }
  private calculateparentalLeave(ffp: number) {
    return this.payslipHelper.calculateLeaveItem(
      this.input?.parentalDays ?? 0,
      this.activeContractData.basic,
      ffp,
      this.settings.prevMonthLeavePayment,
      true,
      moment(this.input?.date ?? new Date()),
      this.settings.rank,
      this.activeContractData
    );
  }
  private calculateLeave104(ffp: number) {
    return this.payslipHelper.calculateLeaveItem(
      this.input?.days104 ?? 0,
      this.activeContractData.basic,
      ffp,
      this.settings.prevMonthLeavePayment,
      true,
      moment(this.input?.date ?? new Date()),
      this.settings.rank,
      this.activeContractData
    );
  }
}
