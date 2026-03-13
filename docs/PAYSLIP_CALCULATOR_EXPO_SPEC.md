# Payslip Calculator - Expo (React Native) Specification

## Overview

This document specifies the implementation of an Italian aviation union payslip calculator for Expo (React Native). The calculator handles complex Italian tax calculations (INPS/IRPEF) specific to airline pilots and cabin crew.

---

## 1. Data Models

### 1.1 Core Interfaces (TypeScript)

```typescript
// Payslip Item - Base unit for all payslip entries
interface PayslipItem {
  total: number;
  taxable: number;
  taxFree: number;
  isDeduction: boolean;
  quantity: number | null;
  unit: number | null;
  isSectorPay: boolean;
}

// Leave Item - For unpaid leave, parental leave, etc.
interface LeaveItem {
  basicQuota: PayslipItem;
  ffpQuota: PayslipItem;
  total: PayslipItem;
}

// Additional Payment/Deduction
interface AdditionalItem {
  total: number;
  taxable: number;
  taxFree: number;
  isSLR: boolean;        // Statutory Leave Refund
  isConguaglio: boolean; // Adjustment
}

// Complete Payslip Structure
interface Payslip {
  basic: PayslipItem;
  basic13th: PayslipItem;
  ffp: PayslipItem;           // Fixed Flight Pay
  flyDiaria: PayslipItem;     // Flying per diem
  noFlyDiaria: PayslipItem;   // Non-flying per diem
  ccTraining: PayslipItem;    // Cabin crew training
  al: PayslipItem;            // Annual leave
  woff: PayslipItem;          // Working days off
  oob: PayslipItem;           // Out of base nights
  rsa: PayslipItem;           // Rep allowance
  oobUnplanned: PayslipItem;  // Unplanned OOB
  ul: LeaveItem;              // Unpaid leave
  simPay: PayslipItem;        // Simulator pay
  trainingPay: PayslipItem;  // Training bonus
  parentalLeave: LeaveItem;
  leave104: LeaveItem;        // Law 104 leave
  sbh: PayslipItem;           // Scheduled block hours
  itud: PayslipItem;          // ITU days
  additionalPayments: AdditionalItem[];
  additionalDeductions: AdditionalItem[];
  union: PayslipItem;
  commissions: PayslipItem;
  bankHolydays: PayslipItem;
}

// INPS (Social Security) Calculation
interface INPS {
  imponibile: number;           // Taxable amount
  contribuzione: {
    ivs: number;
    ivsAdd: number;
    fis: number;
    cigs: number;
    fsta: number;
  };
  contribuzioneTotale: number;
  pensionAcc: number;
  esenzioneIVS: {
    percentage: number;
    amount: number;
    concorreImponibileIRPEF: boolean;
  };
}

// IRPEF (Income Tax) Calculation
interface IRPEF {
  imponibile: number;
  lordo: number;                    // Gross tax
  detrazioniLavoroDipendente: number;
  ritenute: number;                 // Net tax withheld
  aliquotaMedia: number;            // Average tax rate
  trattamentoIntegrativo: number;   // Bonus L. 21/2020
  taglioCuneoFiscale: {
    percentage: number;
    amount: number;
  };
  fondoPensione: {
    totale: number;
    volontaria: number;
    aziendale: number;
  };
  addizionaliComunali: number;
  accontoAddizionaliComunali: number;
  addizionaliRegionali: number;
  detrazioneConiuge: number;
  retribuzioneUtileTFR: number;
  tfr: number;
}

// Final Payroll Result
interface Payroll {
  payslipItems: Payslip;
  sectorPay: PayslipItem;
  taxArea: number;
  taxFreeArea: number;
  grossPay: number;
  areaINPS: INPS;
  areaIRPEF: IRPEF;
  netPayment: number;
  totaleCompetenze: number;     // Total earnings
  totaleTrattenute: number;     // Total deductions
}
```

### 1.2 Input Models

```typescript
interface Input {
  date: string;           // ISO date (reference month)
  sbh: string;            // Scheduled block hours (format: "HH:MM")
  flyDiaria: number;
  noFlyDiaria: number;
  onlyNationalFly: number;
  al: number;             // Annual leave days
  woff: number;           // Working days off
  oob: number;            // Out of base nights
  ul: number;             // Unpaid leave days
  additional: AdditionalInput[];
  additionalDeductions: AdditionalDeductionInput[];
  parentalDays: number;
  days104: number;         // Law 104 leave days
  trainingSectors: number;
  simDays: number;
  itud: number;
  oobUnplanned: number;
  ccTrainingDays: number;
  pregressoIrpef: number;  // Previous IRPEF balance
  commissions: number;
  landingInOffDay: number;
  bankHolydays: number;
  inpsDays: number;
}

interface AdditionalInput {
  amount: number;
  tax: number;            // 0, 50, 100, or 999 (conguaglio)
  isSLR: boolean;
  isConguaglio: boolean;
}

interface AdditionalDeductionInput {
  amount: number;
  tax: number;
  isConguaglio: boolean;
}
```

### 1.3 Settings Model

```typescript
interface Settings {
  company: string;        // e.g., 'RYR'
  role: string;             // 'pil' | 'cc'
  rank: string;             // e.g., 'cpt', 'fo', 'sepe'
  union: number;          // Union fee
  parttime: boolean;
  parttimePercentage: number;  // 0.5, 0.66, 0.75
  coniugeCarico: boolean;      // Spouse dependent
  prevMonthLeavePayment: boolean;
  tfrContribution: number;
  addComunali: number;           // Municipal taxes
  accontoAddComunali: number;
  addRegionali: number;        // Regional taxes
  legacy: boolean;
  triAndLtc: boolean;            // TRI acting as LTC
  btc: boolean;                  // BTC-based contract
  cu: boolean;                   // New captain
  voluntaryPensionContribution: number;
}
```

---

## 2. Business Logic / Calculator Engine

### 2.1 Core Calculator Service

```typescript
class PayslipCalculator {
  // Main entry point
  async calculatePayroll(
    contractData: ContractData,
    input: Input,
    settings: Settings
  ): Promise<Payroll> {
    const payslipItems = this.calculatePayslipItems(contractData, input, settings);
    const sectorPay = this.calculateSectorPay(payslipItems);
    const taxAreas = this.calculateTaxAreas(payslipItems);

    const areaINPS = this.calculateINPS(
      taxAreas.taxArea,
      input.date,
      contractData.inpsDays
    );

    const tfr = this.calculateTFR(payslipItems, settings.rank, areaINPS.imponibile);
    const fondoPensione = this.calculateFondoPensione(
      tfr.retribuzioneUtileTFR,
      settings.tfrContribution,
      contractData
    );

    const areaIRPEF = this.calculateIRPEF(
      taxAreas.taxArea,
      areaINPS,
      payslipItems.additionalPayments,
      input.date,
      settings
    );

    return this.buildPayrollResult(
      payslipItems,
      sectorPay,
      taxAreas,
      areaINPS,
      areaIRPEF
    );
  }

  // Calculate individual payslip items
  private calculatePayslipItems(
    contractData: ContractData,
    input: Input,
    settings: Settings
  ): Payslip {
    return {
      basic: this.calculateBasic(contractData),
      basic13th: this.calculateBasic13th(input.date, contractData),
      ffp: this.calculateFFP(contractData, settings),
      flyDiaria: this.calculateFlyDiaria(input, contractData),
      noFlyDiaria: this.calculateNoFlyDiaria(input, contractData),
      al: this.calculateAL(input.al, contractData),
      sbh: this.calculateSBH(input.sbh, contractData),
      // ... other items
    };
  }
}
```

### 2.2 Key Calculation Rules

#### Basic Pay Calculation
```typescript
// Basic = monthly base salary (from contract data based on rank)
// 13th Month = only in December, average of previous 12 months

function calculateBasic(contractData: ContractData): PayslipItem {
  return {
    total: contractData.basic,
    taxable: contractData.basic,
    taxFree: 0,
    isDeduction: false,
    quantity: contractData.basicDays || 1,
    unit: contractData.basic / (contractData.basicDays || 1),
    isSectorPay: false
  };
}
```

#### FFP (Fixed Flight Pay)
```typescript
// FFP = base FFP + allowance + training allowance
// Different rates for instructors
function calculateFFP(
  contractData: ContractData,
  settings: Settings
): number {
  let ffp = contractData.ffp + contractData.allowance;

  if (isInstructor(settings.rank)) {
    ffp += calculateTrainingAllowance(contractData, settings);
  }

  return ffp;
}
```

#### Diaria (Per Diem) Calculation
```typescript
// Flying diaria: tax-free up to €46.48/day, rest taxable
// Non-flying diaria: fully taxable
const MAX_TAX_FREE_DIARIA = 46.48;

function calculateDiaria(
  flyDays: number,
  noFlyDays: number,
  diariaRate: number
): { flyDiaria: PayslipItem; noFlyDiaria: PayslipItem } {
  const flyTotal = flyDays * diariaRate;
  const taxFree = Math.min(flyTotal, flyDays * MAX_TAX_FREE_DIARIA);

  return {
    flyDiaria: {
      total: flyTotal,
      taxable: flyTotal - taxFree,
      taxFree,
      // ...
    },
    noFlyDiaria: {
      total: noFlyDays * diariaRate,
      taxable: noFlyDays * diariaRate,
      taxFree: 0,
      // ...
    }
  };
}
```

#### SBH (Scheduled Block Hours)
```typescript
// Decimal hours to HH:MM conversion
// Pay = hours * hourly rate
function calculateSBH(
  sbhDecimal: number,
  contractData: ContractData
): PayslipItem {
  const total = sbhDecimal * contractData.sbh;
  return createPayslipItem(total, 50, sbhDecimal, false, true);
}

// Convert decimal hours to HH:MM format
function formatSbh(decimalHours: number): string {
  const hours = Math.floor(decimalHours);
  const minutes = Math.round((decimalHours - hours) * 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}
```

#### Leave Calculations (Unpaid, Parental, 104)
```typescript
function calculateLeave(
  days: number,
  basic: number,
  ffp: number,
  isStatutory: boolean,
  date: Date,
  settings: Settings
): LeaveItem {
  if (isStatutory) {
    // Statutory leave: calculated on actual month days
    const monthDays = getDaysInMonth(date);
    const basicQuota = (basic * days) / monthDays;
    const ffpQuota = (ffp * days) / monthDays;

    return {
      basicQuota: createPayslipItem(basicQuota, 100, days, true),
      ffpQuota: createPayslipItem(ffpQuota, 50, days, true),
      total: createPayslipItem(basicQuota + ffpQuota, 100, days, true)
    };
  } else {
    // Contractual leave: uses contract-defined unpaid leave days
    const ulDays = settings.unpayedLeaveDays;
    const basicQuota = ((basic + basic/12) * days) / ulDays;
    const ffpQuota = (ffp * days) / ulDays;

    return {
      basicQuota: createPayslipItem(basicQuota, 100, days, true),
      ffpQuota: createPayslipItem(ffpQuota, 50, days, true),
      total: createPayslipItem(basicQuota + ffpQuota, 100, days, true)
    };
  }
}
```

### 2.3 INPS (Social Security) Calculation

```typescript
function calculateINPS(
  taxableAmount: number,
  year: number,
  inpsDays: number
): INPS {
  // Minimum daily taxable amount
  const minDailyAmount = getMinImponibile(year); // e.g., €56.87 for 2024/2025
  const minImponibile = minDailyAmount * inpsDays;

  const imponibile = Math.max(taxableAmount, minImponibile);

  // INPS contribution rates
  const rates = {
    ivs: 0.0919,
    ivsAdd: 0.0359,
    cigs: 0.003,
    fsta: 0.00167,
    fis: 0.0026667
  };

  const contribuzione = {
    ivs: imponibile * rates.ivs,
    ivsAdd: imponibile * rates.ivsAdd,
    fis: imponibile * rates.fis,
    cigs: imponibile * rates.cigs,
    fsta: imponibile * rates.fsta
  };

  return {
    imponibile,
    contribuzione,
    contribuzioneTotale: sumValues(contribuzione),
    pensionAcc: imponibile * 0.33,
    esenzioneIVS: calculateIVSExemption(imponibile, year)
  };
}
```

### 2.4 IRPEF (Income Tax) Calculation

```typescript
function calculateIRPEF(
  taxableArea: number,
  inps: INPS,
  additionalPayments: AdditionalItem[],
  date: Date,
  settings: Settings
): IRPEF {
  const year = date.getFullYear();
  const inpsContribution = sumValues(inps.contribuzione);

  // Taxable income after INPS
  const imponibile = taxableArea - inpsContribution +
                     calculateSLRPayments(additionalPayments);

  // Annual projection
  const annualIncome = imponibile * 12;

  // Calculate gross tax using tax brackets
  const irpefLorda = calculateTaxBrackets(annualIncome, year);

  // Apply deductions
  const detrazioniLavoro = calculateWorkDeductions(annualIncome, year, date);
  const detrazioniConiuge = settings.coniugeCarico ?
    calculateSpouseDeductions(annualIncome, year) : 0;

  // Tax cut (cuneo fiscale)
  const taglioCuneo = calculateCuneoFiscale(imponibile, year);

  // Net tax
  const ritenute = irpefLorda - detrazioniLavoro - detrazioniConiuge - taglioCuneo.amount;

  return {
    imponibile,
    lordo: irpefLorda,
    detrazioniLavoroDipendente: detrazioniLavoro,
    ritenute: Math.max(0, ritenute),
    aliquotaMedia: ritenute / imponibile,
    trattamentoIntegrativo: calculateBonus(annualIncome, irpefLorda, detrazioniLavoro, date),
    taglioCuneoFiscale: taglioCuneo,
    // ... other fields
  };
}

// Italian IRPEF Tax Brackets (2024)
const TAX_BRACKETS_2024 = [
  { limit: 28000, rate: 0.23 },
  { limit: 50000, rate: 0.35 },
  { limit: Infinity, rate: 0.43 }
];

function calculateTaxBrackets(annualIncome: number, year: number): number {
  const brackets = getBracketsForYear(year);
  let tax = 0;
  let previousLimit = 0;

  for (const bracket of brackets) {
    if (annualIncome > bracket.limit) {
      tax += (bracket.limit - previousLimit) * bracket.rate;
      previousLimit = bracket.limit;
    } else {
      tax += (annualIncome - previousLimit) * bracket.rate;
      break;
    }
  }

  return tax / 12; // Monthly
}
```

### 2.5 TFR (Severance Pay) Calculation

```typescript
function calculateTFR(
  payslip: Payslip,
  rank: string,
  imponibileINPS: number
): { retribuzioneUtileTFR: number; tfr: number } {
  const retribuzioneUtileTFR =
    payslip.basic.total +
    payslip.ffp.total +
    payslip.basic13th.total +
    payslip.noFlyDiaria.total +
    payslip.rsa.total +
    calculateAdditionalBeforeTax(payslip.additionalPayments) -
    payslip.ul.basicQuota.total -
    payslip.ul.ffpQuota.total;

  // TFR = (RUT / 13.5) - (INPS imponibile * 0.5%)
  const tfr = (retribuzioneUtileTFR / 13.5) - (imponibileINPS * 0.005);

  return { retribuzioneUtileTFR, tfr };
}
```

### 2.6 Pension Fund Calculation

```typescript
function calculateFondoPensione(
  retribuzioneUtileTFR: number,
  contributionPercent: number,
  contractData: ContractData
): FondoPensione {
  const volontaria = (retribuzioneUtileTFR * contributionPercent) / 100;

  // Company matches up to maxContributoAziendaleTfr
  const percAziendale = contributionPercent >= contractData.maxContributoAziendaleTfr
    ? contractData.maxContributoAziendaleTfr
    : 0;
  const aziendale = (retribuzioneUtileTFR * percAziendale) / 100;

  return {
    totale: volontaria + aziendale,
    volontaria,
    aziendale
  };
}
```

---

## 3. Contract Data Structure

### 3.1 Company Configuration

```typescript
interface CompanyConfig {
  maxContributoAziendaleTfr: number;  // Max company TFR contribution %
  cuReduction: number;                 // New captain reduction
  unpayedLeaveDays: {
    pil: number;                       // 17 for pilots
    cc: number;                        // 19 for cabin crew
  };
  inpsDays: number;                    // 26
  unionFees: {
    cpt: number;                       // 40
    fo: number;                        // 20
    cc: number;                        // 5
  };
  claRanks: {                          // CLA rank mappings
    cpt: string[];
    fo: string[];
    cc: string[];
  };
  claTables: {                         // Pay tables by role/rank
    pil: Record<Rank, RankContract>;
    cc: Record<Rank, RankContract>;
  };
  claCorrection: {                     // Annual corrections
    pil: ClaCorrection[];
    cc: ClaCorrection[];
  };
}

interface RankContract {
  basic: number;           // Monthly base
  ffp: number;             // Monthly FFP
  sbh: number;             // Per hour rate
  al: number;              // Per day rate
  oob: number;             // Per night rate
  woff: number;            // Per day rate
  allowance: number;       // Monthly allowance
  diaria: number;          // Per day rate
  training: TrainingConfig | null;
  rsa: number;             // Monthly
}

interface TrainingConfig {
  allowance: number;
  simDiaria: SimDiariaTier[];
  bonus?: {
    sectorEquivalent: number;
    pay?: TieredPay[];
  };
}
```

### 3.2 Rank-Specific Examples (Ryanair)

| Rank | Basic/Month | FFP/Month | SBH/Hour | Diaria/Day |
|------|-------------|-----------|----------|------------|
| CPT | €1,153.85 | €6,587 | €42.20 | €46.48 |
| FO | €384.62 | €3,177.67 | €18.21 | €46.48 |
| SEPE | €384.62 | €1,105.23 | €6.88 | €72.29 |
| PU | €384.62 | €938.50 | €6.88 | €40.00 |

---

## 4. UI/UX Specification

### 4.1 App Structure

```
PayslipCalculator/
├── App.tsx
├── navigation/
│   └── BottomTabs.tsx
├── screens/
│   ├── InputScreen.tsx       # Main input form
│   ├── ResultScreen.tsx      # Payroll results
│   ├── SettingsScreen.tsx    # Configuration
│   └── ToolboxScreen.tsx     # Utilities
├── components/
│   ├── input/
│   │   ├── MonthPicker.tsx
│   │   ├── SbhPicker.tsx     # HH:MM picker
│   │   ├── NumberInput.tsx
│   │   ├── AdditionalPayments.tsx
│   │   ├── PilotInputs.tsx
│   │   ├── CabinCrewInputs.tsx
│   │   ├── LtcInputs.tsx
│   │   └── SimInstructorInputs.tsx
│   ├── results/
│   │   ├── PayslipCard.tsx
│   │   ├── PayslipItemRow.tsx
│   │   ├── INPSCard.tsx
│   │   ├── IRPEFCard.tsx
│   │   └── TotalCard.tsx
│   └── settings/
│       ├── CompanySelect.tsx
│       ├── RankSelect.tsx
│       └── ToggleSetting.tsx
├── store/
│   ├── usePayrollStore.ts    # Zustand state management
│   └── useSettingsStore.ts
├── services/
│   ├── PayslipCalculator.ts
│   ├── ContractService.ts
│   └── StorageService.ts
├── data/
│   └── contractData.ts         # Contract tables
├── types/
│   └── index.ts
└── utils/
    ├── formatters.ts           # Currency, dates
    └── calculations.ts         # Math helpers
```

### 4.2 Navigation Structure

Use React Navigation with bottom tabs:

```typescript
// Bottom Tab Navigator
<Tab.Navigator>
  <Tab.Screen
    name="Input"
    component={InputScreen}
    options={{ tabBarIcon: CreateIcon }}
  />
  <Tab.Screen
    name="Results"
    component={ResultScreen}
    options={{ tabBarIcon: CalculatorIcon }}
  />
  <Tab.Screen
    name="Settings"
    component={SettingsScreen}
    options={{ tabBarIcon: SettingsIcon }}
  />
  <Tab.Screen
    name="Toolbox"
    component={ToolboxScreen}
    options={{ tabBarIcon: BuildIcon }}
  />
</Tab.Navigator>
```

### 4.3 Input Screen

**Layout:**
- Scrollable form with collapsible sections
- Cards for grouping related inputs
- FAB (Floating Action Button) for "Calculate"

**Sections:**

```typescript
// Input Screen Structure
<ScrollView>
  <Card title="Reference Period">
    <MonthPicker value={date} onChange={setDate} />
    <InfoRow label="Working Days" value={workingDays} />
  </Card>

  <Card title="Standard Inputs">
    <SbhPicker value={sbh} onChange={setSbh} />
    <NumberInput label="Flying Diaria" value={flyDiaria} onChange={...} />
    <NumberInput label="Non-Flying Diaria" value={noFlyDiaria} onChange={...} />
    <NumberInput label="Annual Leave" value={al} onChange={...} />
    <NumberInput label="Out of Base" value={oob} onChange={...} />
    <NumberInput label="Unpaid Leave" value={ul} onChange={...} />
    <NumberInput label="Parental Leave" value={parentalDays} onChange={...} />
    <NumberInput label="104 Leave" value={days104} onChange={...} />
  </Card>

  {/* Role-specific inputs */}
  {role === 'pilot' && <PilotInputs />}
  {role === 'cabin_crew' && <CabinCrewInputs />}
  {isLtc && <LtcInputs />}
  {isSimInstructor && <SimInstructorInputs />}

  <Card title="Additional Payments">
    <Button title="Add Payment" onPress={addPayment} />
    {additionalPayments.map(payment => (
      <AdditionalPaymentRow
        amount={payment.amount}
        tax={payment.tax}
        isSLR={payment.isSLR}
        onRemove={...}
      />
    ))}
  </Card>

  <Card title="Additional Deductions">
    <Button title="Add Deduction" onPress={addDeduction} />
    {/* Similar to payments */}
  </Card>

  <Button
    title="Calculate Payroll"
    onPress={calculate}
    variant="primary"
    size="large"
  />
</ScrollView>
```

**SBH Picker Component:**
```typescript
// Custom HH:MM picker using @react-native-picker/picker
function SbhPicker({ value, onChange }) {
  const [hours, minutes] = parseSbh(value);

  return (
    <View style={styles.sbhPicker}>
      <Picker
        selectedValue={hours}
        onValueChange={(h) => onChange(formatSbh(h, minutes))}
      >
        {Array.from({length: 151}, (_, i) => (
          <Picker.Item key={i} label={`${i}h`} value={i} />
        ))}
      </Picker>
      <Picker
        selectedValue={minutes}
        onValueChange={(m) => onChange(formatSbh(hours, m))}
      >
        {Array.from({length: 60}, (_, i) => (
          <Picker.Item key={i} label={`${i}m`} value={i} />
        ))}
      </Picker>
    </View>
  );
}
```

### 4.4 Results Screen

**Layout:**
- Scrollable list with expandable cards
- Color-coded sections
- Currency formatting

```typescript
// Results Screen Structure
<ScrollView>
  {/* Warning Banner */}
  {!hasApprovedRates && (
    <WarningBanner
      message="Tax rates for current year not yet approved"
    />
  )}

  <Card title="Standard Payments" expandable>
    <PayslipItemRow label="Basic Pay" item={payroll.payslipItems.basic} />
    {payroll.payslipItems.basic13th.total > 0 && (
      <PayslipItemRow label="13th Salary" item={payroll.payslipItems.basic13th} />
    )}
    <PayslipItemRow label="Fixed Flight Pay" item={payroll.payslipItems.ffp} />
    <PayslipItemRow label="Flying Diaria" item={payroll.payslipItems.flyDiaria} />
    <PayslipItemRow label="Non-Flying Diaria" item={payroll.payslipItems.noFlyDiaria} />
    {/* ... other items */}
    <PayslipItemRow
      label="Sector Pay"
      item={payroll.sectorPay}
      showDetails
      onShowDetails={() => setShowSectorDetails(true)}
    />
  </Card>

  {showSectorDetails && (
    <Card title="Sector Pay Details">
      {payroll.payslipItems.ccTraining.total > 0 && (
        <PayslipItemRow label="Training Days" item={payroll.payslipItems.ccTraining} />
      )}
      {/* ... other sector pay items */}
    </Card>
  )}

  {hasAdditionalPayments(payroll) && (
    <Card title="Additional Payments" expandable>
      {payroll.payslipItems.additionalPayments.map((item, i) => (
        <PayslipItemRow key={i} label={`Additional ${i+1}`} item={item} />
      ))}
    </Card>
  )}

  {hasDeductions(payroll) && (
    <Card title="Deductions" expandable>
      {/* Union fees, leaves, etc. */}
    </Card>
  )}

  <SummaryCard
    beforeTax={payroll.grossPay}
    taxArea={payroll.taxArea}
    taxFreeArea={payroll.taxFreeArea}
  />

  <INPSCard
    inps={payroll.areaINPS}
    onToggleDetails={() => setShowINPSDetails(!showINPSDetails)}
  />

  {showINPSDetails && <INPSDetails inps={payroll.areaINPS} />}

  <IRPEFCard
    irpef={payroll.areaIRPEF}
    onToggleDetails={() => setShowIRPEFDetails(!showIRPEFDetails)}
  />

  {showIRPEFDetails && <IRPEFDetails irpef={payroll.areaIRPEF} />}

  <TotalCard
    totaleCompetenze={payroll.totaleCompetenze}
    totaleTrattenute={payroll.totaleTrattenute}
    netPayment={payroll.netPayment}
  />
</ScrollView>
```

**Payslip Item Row Component:**
```typescript
function PayslipItemRow({ label, item, showDetails, onShowDetails }) {
  return (
    <View style={styles.row}>
      <View style={styles.labelContainer}>
        <Text style={styles.label}>{label}</Text>
        {item.quantity !== null && (
          <Text style={styles.quantity}>{item.quantity} × {formatCurrency(item.unit)}</Text>
        )}
      </View>
      <View style={styles.values}>
        <Text style={styles.total}>{formatCurrency(item.total)}</Text>
        {item.taxable !== item.total && (
          <Text style={styles.taxable}>Taxable: {formatCurrency(item.taxable)}</Text>
        )}
        {item.taxFree > 0 && (
          <Text style={styles.taxFree}>Tax-free: {formatCurrency(item.taxFree)}</Text>
        )}
      </View>
      {showDetails && (
        <TouchableOpacity onPress={onShowDetails}>
          <InfoIcon />
        </TouchableOpacity>
      )}
    </View>
  );
}
```

### 4.5 Settings Screen

```typescript
// Settings Screen Structure
<ScrollView>
  <Card title="Contract Configuration">
    <Select
      label="Company"
      value={settings.company}
      options={companies}
      onChange={handleCompanyChange}
      disabled={!isSuperAdmin}
    />
    <Select
      label="Role"
      value={settings.role}
      options={filteredRoles}
      onChange={handleRoleChange}
      disabled={!settings.company}
    />
    <Select
      label="Rank"
      value={settings.rank}
      options={filteredRanks}
      onChange={handleRankChange}
    />
  </Card>

  <Card title="Contract Options">
    {rank === 'cpt' && (
      <Toggle label="New Captain (CU)" value={settings.cu} onChange={...} />
    )}
    {(rank === 'tri' || rank === 'tre') && (
      <Toggle label="BTC Based" value={settings.btc} onChange={...} />
    )}
    {rank === 'tri' && (
      <Toggle label="LTC Position" value={settings.triAndLtc} onChange={...} />
    )}
    <Toggle label="Part-time" value={settings.parttime} onChange={...} />
    {settings.parttime && (
      <Select
        label="Part-time %"
        value={settings.parttimePercentage}
        options={[
          { label: '50%', value: 0.5 },
          { label: '66%', value: 0.66 },
          { label: '75%', value: 0.75 }
        ]}
      />
    )}
    <Toggle label="Previous Month Leave Payment" value={settings.prevMonthLeavePayment} onChange={...} />
    <Toggle label="Coniuge a Carico" value={settings.coniugeCarico} onChange={...} />
  </Card>

  <Card title="Deductions">
    <NumberInput
      label="Union Fee"
      value={settings.union}
      onChange={...}
      suffix="€"
    />
    <NumberInput
      label="Voluntary Pension Contribution"
      value={settings.voluntaryPensionContribution}
      onChange={...}
      suffix="%"
    />
    <NumberInput label="Addizionali Comunali" value={settings.addComunali} onChange={...} />
    <NumberInput label="Acconto Addizionali Comunali" value={settings.accontoAddComunali} onChange={...} />
    <NumberInput label="Addizionali Regionali" value={settings.addRegionali} onChange={...} />
    <Toggle label="Legacy Calculation" value={settings.legacy} onChange={...} />
  </Card>
</ScrollView>
```

### 4.6 UI Improvements for React Native

1. **Animated Transitions:**
   - Use `react-native-reanimated` for smooth card expansions
   - Number count-up animations for totals

2. **Swipe Gestures:**
   - Swipe between tabs (Input ↔ Results)
   - Swipe to delete additional payments

3. **Haptic Feedback:**
   - Light impact on button presses
   - Success haptic on calculation complete

4. **Skeleton Loading:**
   - While loading contract data
   - While calculating payroll

5. **Pull-to-Refresh:**
   - On Results screen to recalculate

6. **Charts (Optional):**
   - Pie chart for tax breakdown using `react-native-chart-kit`
   - Bar chart comparing monthly net pay

---

## 5. State Management (Zustand)

```typescript
// store/usePayrollStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface PayrollState {
  // Input form state
  input: Input;
  settings: Settings;

  // Computed/cached values
  workingDaysInMonth: number;

  // Results
  payroll: Payroll | null;
  isCalculating: boolean;
  error: string | null;

  // Actions
  setDate: (date: string) => void;
  setSbh: (value: string) => void;  // HH:MM format
  setNumeric: (key: keyof Input, value: number) => void;
  addAdditionalPayment: () => void;
  removeAdditionalPayment: (index: number) => void;
  updateAdditionalPayment: (index: number, updates: Partial<AdditionalInput>) => void;
  addAdditionalDeduction: () => void;
  removeAdditionalDeduction: (index: number) => void;
  updateAdditionalDeduction: (index: number, updates: Partial<AdditionalDeductionInput>) => void;
  updateSettings: (updates: Partial<Settings>) => void;
  calculate: () => Promise<void>;
  reset: () => void;
}

const DEFAULT_INPUT: Input = {
  date: getDefaultReferenceMonth(),
  sbh: '0:00',
  flyDiaria: 0,
  noFlyDiaria: 0,
  onlyNationalFly: 0,
  al: 0,
  woff: 0,
  oob: 0,
  ul: 0,
  additional: [],
  additionalDeductions: [],
  parentalDays: 0,
  days104: 0,
  trainingSectors: 0,
  simDays: 0,
  itud: 0,
  oobUnplanned: 0,
  ccTrainingDays: 0,
  pregressoIrpef: 0,
  commissions: 0,
  landingInOffDay: 0,
  bankHolydays: 0,
  inpsDays: 0
};

export const usePayrollStore = create<PayrollState>()(
  persist(
    (set, get) => ({
      input: DEFAULT_INPUT,
      settings: DEFAULT_SETTINGS,
      workingDaysInMonth: 0,
      payroll: null,
      isCalculating: false,
      error: null,

      setDate: (date) => {
        set({ input: { ...get().input, date } });
        get().updateWorkingDays();
      },

      setSbh: (value) => {
        const decimal = sbhToDecimal(value);
        set({ input: { ...get().input, sbh: value } });
      },

      setNumeric: (key, value) => {
        set({ input: { ...get().input, [key]: value } });
      },

      addAdditionalPayment: () => {
        const payments = [...get().input.additional, { amount: 0, tax: 100, isSLR: false, isConguaglio: false }];
        set({ input: { ...get().input, additional: payments } });
      },

      removeAdditionalPayment: (index) => {
        const payments = get().input.additional.filter((_, i) => i !== index);
        set({ input: { ...get().input, additional: payments } });
      },

      updateAdditionalPayment: (index, updates) => {
        const payments = get().input.additional.map((p, i) =>
          i === index ? { ...p, ...updates } : p
        );
        set({ input: { ...get().input, additional: payments } });
      },

      updateSettings: (updates) => {
        set({ settings: { ...get().settings, ...updates } });
      },

      calculate: async () => {
        set({ isCalculating: true, error: null });
        try {
          const { input, settings } = get();
          const contractData = await getContractData(settings);
          const calculator = new PayslipCalculator();
          const payroll = await calculator.calculatePayroll(contractData, input, settings);
          set({ payroll, isCalculating: false });
        } catch (err) {
          set({ error: err.message, isCalculating: false });
        }
      },

      reset: () => {
        set({
          input: DEFAULT_INPUT,
          payroll: null,
          workingDaysInMonth: 0
        });
      }
    }),
    {
      name: 'payroll-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        input: state.input,
        settings: state.settings
      })
    }
  )
);
```

---

## 6. Dependencies

```json
{
  "dependencies": {
    "react": "18.2.0",
    "react-native": "0.72.x",
    "expo": "~49.0.0",

    // Navigation
    "@react-navigation/native": "^6.1.9",
    "@react-navigation/bottom-tabs": "^6.5.11",
    "@react-navigation/native-stack": "^6.9.17",
    "react-native-screens": "~3.22.0",
    "react-native-safe-area-context": "4.6.3",

    // State Management
    "zustand": "^4.4.7",
    "@react-native-async-storage/async-storage": "1.18.2",

    // UI Components
    "react-native-paper": "^5.11.1",
    "react-native-vector-icons": "^10.0.2",
    "@react-native-picker/picker": "2.4.10",

    // Date & Time
    "date-fns": "^2.30.0",

    // Animations
    "react-native-reanimated": "~3.3.0",

    // Utilities
    "lodash": "^4.17.21",
    "@types/lodash": "^4.14.202",
    "currency.js": "^2.0.4"
  }
}
```

---

## 7. File Structure

```
payslip-calculator-expo/
├── app/
│   ├── (tabs)/
│   │   ├── _layout.tsx
│   │   ├── input.tsx
│   │   ├── results.tsx
│   │   ├── settings.tsx
│   │   └── toolbox.tsx
│   ├── _layout.tsx
│   └── index.tsx
├── components/
│   ├── ui/
│   │   ├── Card.tsx
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Select.tsx
│   │   └── Toggle.tsx
│   ├── input/
│   │   ├── MonthPicker.tsx
│   │   ├── SbhPicker.tsx
│   │   ├── AdditionalPaymentList.tsx
│   │   ├── PilotInputs.tsx
│   │   ├── CabinCrewInputs.tsx
│   │   ├── LtcInputs.tsx
│   │   └── SimInstructorInputs.tsx
│   └── results/
│       ├── PayslipCard.tsx
│       ├── PayslipItemRow.tsx
│       ├── INPSDetails.tsx
│       ├── IRPEFDetails.tsx
│       └── TotalSummary.tsx
├── hooks/
│   ├── usePayroll.ts
│   ├── useSettings.ts
│   └── useContractData.ts
├── lib/
│   ├── calculator/
│   │   ├── index.ts
│   │   ├── PayslipCalculator.ts
│   │   ├── INPSCalculator.ts
│   │   ├── IRPEFCalculator.ts
│   │   └── TFRCalculator.ts
│   ├── data/
│   │   ├── contractData.ts
│   │   ├── taxBrackets.ts
│   │   └── deductions.ts
│   ├── utils/
│   │   ├── formatters.ts
│   │   ├── parsers.ts
│   │   └── calculations.ts
│   └── types/
│       └── index.ts
├── store/
│   ├── usePayrollStore.ts
│   └── useSettingsStore.ts
├── assets/
│   └── icons/
├── constants/
│   └── index.ts
└── package.json
```

---

## 8. Key Implementation Notes

### 8.1 Date Handling
- Always use ISO 8601 format for storage: `YYYY-MM-DD`
- Display dates in Italian format: `MM/YYYY` for reference month
- Use `date-fns` for all date manipulation

### 8.2 Number Formatting
```typescript
// Currency
const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR'
  }).format(value);

// Percentage
const formatPercent = (value: number): string =>
  new Intl.NumberFormat('it-IT', {
    style: 'percent',
    minimumFractionDigits: 1
  }).format(value);

// Hours (HH:MM)
const formatHours = (decimalHours: number): string => {
  const hours = Math.floor(decimalHours);
  const minutes = Math.round((decimalHours - hours) * 60);
  return `${hours}:${minutes.toString().padStart(2, '0')}`;
};
```

### 8.3 Validation
- All numeric inputs should have min/max validation
- SBH: max 150 hours
- Days inputs: max 31
- Percentage inputs: 0-100

### 8.4 Performance
- Use `useMemo` for expensive calculations
- Debounce settings saves
- Lazy load contract data

---

## 9. Testing Checklist

### Unit Tests
- [ ] PayslipCalculator.calculatePayroll()
- [ ] INPS calculation with minimum thresholds
- [ ] IRPEF bracket calculations
- [ ] TFR calculation
- [ ] Pension fund calculation
- [ ] Leave calculations (statutory vs contractual)

### Integration Tests
- [ ] Complete flow: Input → Calculate → Display Results
- [ ] Settings persistence
- [ ] Contract data loading

### UI Tests
- [ ] SBH picker conversion
- [ ] Month picker default value
- [ ] Additional payments add/remove
- [ ] Settings dependent fields (part-time %)

---

## 10. Appendix: Italian Tax Terms

| Term | English | Description |
|------|---------|-------------|
| INPS | Social Security | Social security contributions (IVS, FIS, CIGS, FSTA) |
| IRPEF | Income Tax | Personal income tax with progressive brackets |
| TFR | Severance Pay | Trattamento di Fine Rapporto - severance pay |
| Diaria | Per Diem | Daily allowance for travel |
| FFP | Flight Pay | Fixed flight pay component |
| SBH | Block Hours | Scheduled flight hours |
| AL | Annual Leave | Paid vacation days |
| OOB | Out of Base | Nights spent away from base |
| Imponibile | Taxable Amount | Amount subject to taxation |
| Detrazione | Deduction | Tax deduction/credit |
| Ritenuta | Withholding | Tax withheld from paycheck |
| Conguaglio | Adjustment | Year-end tax adjustment |
