import {
  DestroyRef,
  inject,
  Injectable,
  signal,
  computed,
  effect,
} from '@angular/core';
import {
  NonNullableFormBuilder,
  Validators,
  FormArray,
  FormGroup,
  FormControl,
} from '@angular/forms';
import { SettingsService } from './settings.service';
import { RosterService, CompanyRole } from '../roster.service';
import { Settings } from 'src/app/interfaces/payroll';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../auth.service';

type CompanyRoleCode =
  | 'pilot'
  | 'pil'
  | 'pilot'
  | 'cabinCrew'
  | 'cc'
  | 'cabin_crew'
  | 'cabin crew'
  | 'unknown';

type AdditionalPaymentGroup = FormGroup<{
  amount: FormControl<number>;
  tax: FormControl<number>;
  isSLR: FormControl<boolean>;
  isConguaglio: FormControl<boolean>;
}>;

type AdditionalDeductionGroup = FormGroup<{
  amount: FormControl<number>;
  tax: FormControl<number>;
  isConguaglio: FormControl<boolean>;
}>;

type NumericControlName =
  | 'flyDiaria'
  | 'noFlyDiaria'
  | 'al'
  | 'oob'
  | 'ul'
  | 'parentalDays'
  | 'days104'
  | 'onlyNationalFly'
  | 'landingInOffDay'
  | 'ccTrainingDays'
  | 'commissions'
  | 'bankHolydays'
  | 'oobUnplanned'
  | 'trainingSectors'
  | 'simDays'
  | 'woff'
  | 'pregressoIrpef';

type OptionalNumericControlName = 'itud';

const COMPANY_ROLE_STORAGE_KEY = 'companyRole';

const DEFAULT_SETTINGS: Settings = {
  rank: '',
  btc: false,
  ltcBonus: false,
  parttime: false,
  parttimePercentage: 0,
  tfrContribution: 0,
  addComunali: 0,
  accontoAddComunali: 0,
  addRegionali: 0,
  cu: false,
  union: 0,

  coniugeCarico: false,
  prevMonthLeavePayment: false,

  legacy: false,
  legacyRates: {
    ffp: 0,
    al: 0,
    sbh: 0,
  },
  role: '',
  company: '',
  voluntaryPensionContribution: 0,
  triAndLtc: false,
};

@Injectable({
  providedIn: 'root',
})
export class PayrollInputStore {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly settingsService = inject(SettingsService);
  private readonly rosterService = inject(RosterService);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly role = signal<CompanyRoleCode>('unknown');
  private readonly ccInstructor = signal<boolean>(false);
  private readonly ltc = signal<boolean>(false);
  private readonly simInstructor = signal<boolean>(false);
  private readonly workingDaysInMonth = signal<number>(0);
  private readonly hasItud = signal<boolean>(false);
  private readonly isRSA = signal<boolean>(false);
  readonly settings = signal<Settings>(DEFAULT_SETTINGS);
  readonly form = this.fb.group({
    date: this.fb.control<string>(this.getDefaultReferenceMonthIso()),
    sbh: this.fb.control<number>(2, {
      validators: [Validators.min(0), Validators.max(150)],
    }),
    flyDiaria: this.fb.control<number>(2, {
      validators: [Validators.min(0)],
    }),
    noFlyDiaria: this.fb.control<number>(0, {
      validators: [Validators.min(0)],
    }),
    al: this.fb.control<number>(2, {
      validators: [Validators.min(0)],
    }),
    oob: this.fb.control<number>(0, {
      validators: [Validators.min(0)],
    }),
    ul: this.fb.control<number>(0, {
      validators: [Validators.min(0)],
    }),
    parentalDays: this.fb.control<number>(0, {
      validators: [Validators.min(0)],
    }),
    days104: this.fb.control<number>(0, {
      validators: [Validators.min(0)],
    }),
    onlyNationalFly: this.fb.control<number>(0, {
      validators: [Validators.min(0)],
    }),
    landingInOffDay: this.fb.control<number>(0, {
      validators: [Validators.min(0)],
    }),
    ccTrainingDays: this.fb.control<number>(0, {
      validators: [Validators.min(0)],
    }),
    commissions: this.fb.control<number>(0),
    bankHolydays: this.fb.control<number>(0, {
      validators: [Validators.min(0)],
    }),
    oobUnplanned: this.fb.control<number>(0, {
      validators: [Validators.min(0)],
    }),
    trainingSectors: this.fb.control<number>(0, {
      validators: [Validators.min(0)],
    }),
    simDays: this.fb.control<number>(0, {
      validators: [Validators.min(0)],
    }),
    woff: this.fb.control<number>(0, {
      validators: [Validators.min(0)],
    }),
    pregressoIrpef: this.fb.control<number>(0),
    itud: this.fb.control<number | null>(null, {
      validators: [Validators.min(0)],
    }),
    additional: this.fb.array<AdditionalPaymentGroup>([]),
    additionalDeductions: this.fb.array<AdditionalDeductionGroup>([]),
  });

  readonly vm = computed(() => ({
    form: this.form,
    role: this.role(),
    isCcInstructor: this.ccInstructor(),
    isLtc: this.ltc(),
    isRSA: this.isRSA(),
    isSimInstructor: this.simInstructor(),
    workingDaysInMonth: this.workingDaysInMonth(),
    hasItud: this.hasItud(),
    settings: this.settings(),
  }));

  private initialized = false;

  constructor() {
    this.settingsService.settingsChanges$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((settings) => this.handleSettingsUpdated(settings));
    void this.init();
    effect(() => {
      const currentRole = this.role();
      void this.updateWorkingDays(this.form.controls.date.value, currentRole);
    });
  }
  async init(): Promise<void> {
    if (this.initialized) {
      return;
    }
    this.initialized = true;
    this.hasItud.set(false);
    const currentMember = await this.authService.getCurrentMember();
    this.isRSA.set(currentMember?.isRsa ?? false);

    this.hasItud.set(currentMember?.hasItud ?? false);
    await this.settingsService.loadSettings();
    this.form.controls.date.valueChanges.subscribe((value) => {
      void this.updateWorkingDays(value, this.role());
    });

    console.log('this.form.controls.date.value', this.form.controls.date.value);
    console.log('this.role()', this.role());
    void this.updateWorkingDays(this.form.controls.date.value, this.role());
  }
  private mapSettingsStateToSettings(state: Settings): Settings {
    return {
      ...DEFAULT_SETTINGS,
      ...state,
      parttimePercentage:
        state.parttimePercentage ?? DEFAULT_SETTINGS.parttimePercentage,
      legacyRates: {
        ...DEFAULT_SETTINGS.legacyRates,
        ...(state.legacyRates ?? {}),
      },
    };
  }
  setWorkingDaysInMonth(value: number): void {
    this.workingDaysInMonth.set(value);
  }

  setHasItud(value: boolean): void {
    this.hasItud.set(value);
  }

  get additionalPayments(): FormArray<AdditionalPaymentGroup> {
    return this.form.controls.additional;
  }

  get additionalDeductions(): FormArray<AdditionalDeductionGroup> {
    return this.form.controls.additionalDeductions;
  }

  addAdditionalPayment(): void {
    this.additionalPayments.push(this.createAdditionalPaymentGroup());
  }

  removeAdditionalPayment(index: number): void {
    if (index >= 0 && index < this.additionalPayments.length) {
      this.additionalPayments.removeAt(index);
    }
  }

  addAdditionalDeduction(): void {
    this.additionalDeductions.push(this.createAdditionalDeductionGroup());
  }

  removeAdditionalDeduction(index: number): void {
    if (index >= 0 && index < this.additionalDeductions.length) {
      this.additionalDeductions.removeAt(index);
    }
  }

  updateAdditionalPaymentTax(index: number, tax: number): void {
    const group = this.additionalPayments.at(index);
    if (!group) {
      return;
    }
    group.controls.tax.setValue(tax);
    group.controls.isConguaglio.setValue(tax === 999);
  }

  toggleAdditionalPaymentSlr(index: number, isSlr: boolean): void {
    const group = this.additionalPayments.at(index);
    if (!group) {
      return;
    }
    group.controls.isSLR.setValue(isSlr);
    if (isSlr) {
      group.controls.tax.setValue(100);
    }
  }

  updateAdditionalDeductionTax(index: number, tax: number): void {
    const group = this.additionalDeductions.at(index);
    if (!group) {
      return;
    }
    group.controls.tax.setValue(tax);
    group.controls.isConguaglio.setValue(tax === 999);
  }

  setNumeric(control: NumericControlName, value: unknown): void {
    const controlRef = this.form.controls[control];
    if (!controlRef) {
      return;
    }
    controlRef.setValue(this.toNumber(value));
  }

  setOptionalNumeric(
    control: OptionalNumericControlName,
    value: unknown
  ): void {
    const controlRef = this.form.controls[control];
    if (!controlRef) {
      return;
    }

    if (value === '' || value === null || value === undefined) {
      controlRef.setValue(null);
      return;
    }

    controlRef.setValue(this.toNumber(value));
  }

  setSbh(value: string): void {
    const [hoursPart = '0', minutesPart = '0'] = value.split(':');
    const hours = Math.min(
      Math.max(Number.parseInt(hoursPart, 10) || 0, 0),
      150
    );
    const minutes = Math.min(
      Math.max(Number.parseInt(minutesPart, 10) || 0, 0),
      59
    );
    const decimalValue = Math.min(hours + minutes / 60, 150);
    this.form.controls.sbh.setValue(decimalValue);
  }

  setDate(value: string): void {
    this.form.controls.date.setValue(value);
  }

  setAdditionalAmount(index: number, value: unknown): void {
    const group = this.additionalPayments.at(index);
    if (!group) {
      return;
    }
    group.controls.amount.setValue(this.toNumber(value));
  }

  setAdditionalDeductionAmount(index: number, value: unknown): void {
    const group = this.additionalDeductions.at(index);
    if (!group) {
      return;
    }
    group.controls.amount.setValue(this.toNumber(value));
  }

  reset(): void {
    this.form.reset({
      date: this.getDefaultReferenceMonthIso(),
      sbh: 0,
      flyDiaria: 0,
      noFlyDiaria: 0,
      al: 0,
      oob: 0,
      ul: 0,
      parentalDays: 0,
      days104: 0,
      onlyNationalFly: 0,
      landingInOffDay: 0,
      ccTrainingDays: 0,
      commissions: 0,
      bankHolydays: 0,
      oobUnplanned: 0,
      trainingSectors: 0,
      simDays: 0,
      woff: 0,
      pregressoIrpef: 0,
      itud: null,
    });
    this.additionalPayments.clear();
    this.additionalDeductions.clear();
  }

  private createAdditionalPaymentGroup(): AdditionalPaymentGroup {
    return this.fb.group({
      amount: this.fb.control<number>(0, {
        validators: [Validators.required],
      }),
      tax: this.fb.control<number>(100, {
        validators: [Validators.required],
      }),
      isSLR: this.fb.control<boolean>(false),
      isConguaglio: this.fb.control<boolean>(false),
    });
  }

  private createAdditionalDeductionGroup(): AdditionalDeductionGroup {
    return this.fb.group({
      amount: this.fb.control<number>(0, {
        validators: [Validators.required],
      }),
      tax: this.fb.control<number>(100, {
        validators: [Validators.required],
      }),
      isConguaglio: this.fb.control<boolean>(false),
    });
  }

  get isLtc() {
    return this.ltc();
  }
  get isSimInstructor() {
    return this.simInstructor();
  }
  private toRoleCode(raw: string | null): CompanyRoleCode {
    switch (raw?.toLowerCase()) {
      case 'pil':
      case 'pilot':
        return 'pilot';
      case 'cc':
      case 'cabincrew':
      case 'cabin_crew':
      case 'cabin crew':
        return 'cabinCrew';
      default:
        return 'unknown';
    }
  }

  private toRosterRole(role: CompanyRoleCode): CompanyRole | null {
    if (role === 'pilot') {
      return 'Pilot';
    }
    if (role === 'cabinCrew') {
      return 'Cabin Crew';
    }
    return null;
  }
  get isCCInstructor() {
    return this.ccInstructor();
  }
  private getDefaultReferenceMonthIso(): string {
    const today = new Date();
    const currentDay = today.getUTCDate();
    if (currentDay < 20) {
      const previousMonth = new Date(
        Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1)
      );
      return previousMonth.toISOString();
    }
    const currentMonth = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)
    );
    return currentMonth.toISOString();
  }
  private handleSettingsUpdated(state: Settings): void {
    if (!state) {
      this.settings.set(DEFAULT_SETTINGS);
      this.role.set('unknown');
      this.ccInstructor.set(false);
      this.ltc.set(false);
      this.simInstructor.set(false);
      return;
    }
    const mappedSettings = this.mapSettingsStateToSettings(state);
    this.settings.set(mappedSettings);
    const storedRole = state.role ?? '';
    this.role.set(this.toRoleCode(storedRole));
    this.ccInstructor.set(this.computeIsCCInstructor(state));
    this.ltc.set(this.computeIsLtc(state));
    this.simInstructor.set(this.computeIsSimInstructor(state));
  }

  private computeIsCCInstructor(settings: Settings): boolean {
    const rank = (settings.rank ?? '').toLowerCase();
    return rank === 'sepi' || rank === 'sepe';
  }

  private computeIsLtc(settings: Settings): boolean {
    const rank = (settings.rank ?? '').toLowerCase();
    if (!rank) {
      return false;
    }
    if (rank === 'ltc' || rank === 'tre') {
      return true;
    }
    return rank === 'tri' && settings.triAndLtc;
  }

  private computeIsSimInstructor(settings: Settings): boolean {
    const rank = (settings.rank ?? '').toLowerCase();
    return rank === 'tri' || rank === 'tre' || rank === 'sfi';
  }

  private toNumber(value: unknown): number {
    if (value === null || value === undefined || value === '') {
      return 0;
    }

    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : 0;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private async updateWorkingDays(
    dateIso: string | null | undefined,
    role: CompanyRoleCode
  ): Promise<void> {
    try {
      console.log('updateWorkingDays', dateIso, role);
      const rosterRole = this.toRosterRole(role);
      if (!dateIso || !rosterRole) {
        this.setWorkingDaysInMonth(0);
        return;
      }
      console.log('dateIso', dateIso);
      console.log('rosterRole', rosterRole);
      const selectedDate = new Date(dateIso);
      if (Number.isNaN(selectedDate.getTime())) {
        this.setWorkingDaysInMonth(0);
        return;
      }

      const baseIndex =
        (await this.rosterService.getBaseIndexAt2025(rosterRole)) ?? 0;
      const year = selectedDate.getFullYear();
      const monthIndex0 = selectedDate.getMonth();
      const monthPlan = this.rosterService.buildMonth(
        year,
        monthIndex0,
        rosterRole,
        baseIndex
      );
      const workingDays = this.rosterService.countOnDays(monthPlan);
      this.setWorkingDaysInMonth(workingDays);
    } catch (error) {
      console.error('Error calculating working days', error);
      this.setWorkingDaysInMonth(0);
    }
  }
}
