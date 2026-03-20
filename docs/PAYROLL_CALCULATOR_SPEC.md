# Specifiche Calcolatore Buste Paga - UnionConnect

## 1. Panoramica

Il calcolatore di buste paga è una funzionalità accessibile a **tutti gli utenti** (piloti e cabin crew) per stimare la propria retribuzione mensile in base ai voli effettuati e alle voci contrattuali previste dal CLA Ryanair/Malta Air.

## 2. Accesso

- **Chi può accedere**: Tutti gli utenti autenticati (role: USER, ADMIN, SUPERADMIN)
- **Ruoli supportati**: Piloti (pilot) e Cabin Crew (cabin_crew)
- **Navigazione**: Menu laterale → "Calcolatore Busta Paga"

## 3. Architettura Dati

### 3.1 Entità Principali

```typescript
// Configurazione CLA - Memorizzata nel backend
interface CLAConfiguration {
  id: string;
  company: "RYR" | "MAY"; // Ryanair o Malta Air
  ruolo: "pilot" | "cabin_crew";
  grado: string; // Es: "cpt", "fo", "sepe", "pu", etc.
  annoValidita: number;

  // Voci retributive (tutte mensili)
  voci: {
    basic: number; // Stipendio base (/13)
    ffp: number; // Fixed Flight Pay (/12)
    sbh: number; // Scheduled Block Hours (€/ora)
    al: number; // Annual Leave (€/giorno)
    oob: number; // Out Of Base
    oobUnplanned?: number; // Out Of Base Unplanned (solo CC)
    woff?: number; // Week Off (solo piloti)
    itud?: number; // ITUD - Union Day (giorni sindacale)
    allowance: number; // Allowance mensile
    diaria: number; // Diaria base (€/giorno)
    trainingDiaria?: number; // Diaria in training (solo CC)
    rsa: number; // Rimborso Rappresentante Sindacale
  };

  // Configurazione training (opzionale, solo per alcuni gradi)
  training?: {
    nonBtc?: {
      allowance: number;
      simDiaria: SimDiariaConfig[];
      bonus?: { sectorEquivalent: number };
    };
    btc?: {
      allowance: number;
      bonus?: { sectorEquivalent: number };
      simDiaria: SimDiariaConfig[];
    };
    // Per LTC
    allowance?: number;
    bonus?: {
      pay: { min: number; max: number; pay: number }[];
      minSectors: number;
    };
  };
}

interface SimDiariaConfig {
  min: number; // Range minimo giorni
  max: number; // Range massimo giorni
  pay: {
    ffp: number; // Flight Duty Pay
    sectorPay: number; // Pagamento a settore
  };
}

// Correzioni CLA per anno (aumenti contrattuali)
interface CLACorrection {
  date: string; // ISO date
  grado: string;
  voci: Partial<Record<string, number>>;
}
```

### 3.2 Parametri di Calcolo Utente (Form Input)

```typescript
interface PayrollInput {
  // Dati base (sempre visibili)
  date: string; // ISO date (YYYY-MM-DD)

  // Attività di volo (sempre visibile)
  sbh: number; // Scheduled Block Hours (ore)

  // Diarie (sempre visibili)
  flyDiaria: number; // Giorni di diaria in volo
  noFlyDiaria: number; // Giorni di diaria senza volo
  onlyNationalFly?: number; // Voli nazionali (per istruttori CC)

  // ↓↓↓ SOLO CABIN CREW ↓↓↓
  landingInOffDay: number; // Atterraggi in giorno off (1/2 diaria)
  bankHolydays: number; // Giorni festività bancarie
  oobUnplanned: number; // Out Of Base non pianificato
  ccTrainingDays: number; // Giorni training CC

  // ↓↓↓ SOLO PILOTI ↓↓↓
  woff: number; // Week Off

  // Presenze/assenze (sempre visibili)
  al: number; // Giorni Annual Leave
  oob: number; // Out Of Base pianificato
  ul: number; // Unpaid Leave

  // ↓↓↓ SOLO LTC/LCC ↓↓↓
  trainingSectors: number; // Settori training

  // ↓↓↓ SOLO SFI, TRI, TRE (istruttori) ↓↓↓
  simDays: number; // Giorni in simulatore

  // ↓↓↓ SOLO SE user.itud === true ↓↓↓
  itud: number; // Giorni ITUD (Union Day)

  // Parental leave (sempre visibile)
  parentalDays: number; // Giorni congedo parentale
  days104: number; // Giorni legge 104

  // Altri pagamenti (sempre visibili)
  commissions: number; // Provvigioni
  additional: AdditionalInput[]; // Pagamenti aggiuntivi
  additionalDeductions: AdditionalDeductionInput[]; // Detrazioni aggiuntive

  // Conguagli (sempre visibile)
  pregressoIrpef: number; // Irpef pregressa da conguagliare
}
```

### 3.3 Visibilità Campi per Ruolo/Grado/Flag

| Campo             | Visibile per  | Condizione                             |
| ----------------- | ------------- | -------------------------------------- |
| `landingInOffDay` | Cabin Crew    | `role === 'cabin_crew'`                |
| `bankHolydays`    | Cabin Crew    | `role === 'cabin_crew'`                |
| `oobUnplanned`    | Cabin Crew    | `role === 'cabin_crew'`                |
| `ccTrainingDays`  | Cabin Crew    | `role === 'cabin_crew'`                |
| `woff`            | Piloti        | `role === 'pilot'`                     |
| `trainingSectors` | LTC, LCC      | `rank === 'ltc' \|\| rank === 'lcc'`   |
| `simDays`         | SFI, TRI, TRE | `['sfi', 'tri', 'tre'].includes(rank)` |
| `itud`            | Tutti         | `user.itud === true` (flag utente)     |
| `rsa`             | Tutti         | `user.rsa === true` (flag utente)      |

interface AdditionalInput {
amount: number;
tax: number; // % tassazione (0, 50, 100)
isSLR: boolean; // Sick Leave Return
isConguaglio: boolean;
}

interface AdditionalDeductionInput {
amount: number;
tax: number;
isConguaglio: boolean;
}

````

### 3.3 Risultato Calcolo (Payroll)

```typescript
interface Payroll {
  // Voci busta paga dettagliate
  payslipItems: Payslip;

  // Pagamento a settore (per info)
  sectorPay: PayslipItem;

  // Aree tassazione
  taxArea: number;                 // Area tassabile (100%)
  taxFreeArea: number;             // Area non tassabile
  grossPay: number;                // Lordo totale

  // Contributi INPS
  areaINPS: {
    imponibile: number;
    ivs: number;
    ivsAdd: number;
    cigs: number;
    fsta: number;
    fis: number;
    contribuzioneTotale: number;
    esenzioneIVS: { amount: number; concorreImponibile: boolean };
  };

  // IRPEF e tasse
  areaIRPEF: IRPEF;

  // Totali
  totaleCompetenze: number;
  totaleTrattenute: number;
  netPayment: number;              // NETTO DA PAGARE
}

interface Payslip {
  basic: PayslipItem;              // Stipendio base
  basic13th: PayslipItem;          // Tredicesima (solo dicembre)
  ffp: PayslipItem;                // Fixed Flight Pay
  flyDiaria: PayslipItem;          // Diaria in volo
  noFlyDiaria: PayslipItem;        // Diaria senza volo
  ccTraining: PayslipItem;         // Training CC
  al: PayslipItem;                 // Annual Leave
  woff: PayslipItem;               // Week Off
  oob: PayslipItem;                // Out Of Base
  oobUnplanned: PayslipItem;       // OOB Unplanned
  ul: PayslipItem;                 // Unpaid Leave
  simPay: PayslipItem;             // Pay simulatore
  trainingPay: PayslipItem;        // Pay training (LTC)
  parentalLeave: PayslipItem;      // Congedo parentale
  leave104: PayslipItem;           // Legge 104
  sbh: PayslipItem;                // Scheduled Block Hours
  itud: PayslipItem;               // ITUD
  additionalPayments: AdditionalItem[];  // Altri pagamenti
  commissions: PayslipItem;        // Provvigioni
  rsa: PayslipItem;                // Rimborso rappresentante sindacale
  bankHolydays: PayslipItem;       // Festività bancarie
  union: PayslipItem;              // Quota sindacale
  additionalDeductions: AdditionalItem[]; // Altre detrazioni
}

interface PayslipItem {
  code: string;
  description: string;
  amount: number;                  // Importo unitario
  quantity: number;                // Quantità
  total: number;                   // Importo totale
  taxable: number;                 % tassazione (0, 50, 100)
  isDeduction: boolean;            // Se è una detrazione
  isAdditional: boolean;           // Se è un pagamento aggiuntivo
}

interface IRPEF {
  // Imponibile
  imponibile: number;

  // IRPEF lorda per scaglioni
  irpefScaglioni: { scaglione: string; amount: number; rate: number }[];
  impostaLorda: number;

  // Detrazioni
  detrazioniLavoroDipendente: number;
  detrazioniConiuge: number;

  // Taglio cuneo fiscale
  taglioCuneoFiscale: number;
  taglioCuneoFiscaleConcorre: boolean;

  // Trattamento integrativo
  trattamentoIntegrativo: number;

  // Totale ritenute
  ritenute: number;                // IRPEF netta da pagare

  // Addizionali
  addizionaliRegionali: number;
  addizionaliComunali: number;
  accontoAddizionaliComunali: number;

  // TFR
  retribuzioneUtileTFR: number;
  tfrMaturato: number;
  contributoAziendaleTFR: number;

  // Fondo pensione
  fondoPensione: {
    volontaria: number;            // Contributo volontario
    maxDeducibile: number;
  };
}
````

## 4. Logica di Calcolo Dettagliata

### 4.1 Flusso di Calcolo

1. **Caricamento configurazione**
   - Recupera dati CLA per company/ruolo/grado/anno
   - Applica correzioni CLA attive per la data
   - Carica settings utente (quota sindacale, addizionali, etc.)

2. **Calcolo voci busta paga**
   - Basic (proporzionale ai giorni lavorativi)
   - Basic13th (solo dicembre, media mensile)
   - FFP + Allowance + Training Allowance
   - Diarie (fly/noFly con gestione tax-free)
   - SBH (ore × tariffa)
   - AL, WOFF, OOB, OOB Unplanned
   - ITUD (giorni × tariffa)
   - Training pay (per LTC e istruttori)
   - Parental Leave, Leave 104, UL
   - RSA (se flag attivo)
   - Union fee (detrazione)

3. **Calcolo aree tassazione**
   - Tax Area: voci tassate al 100% + 50% diarie oltre soglia
   - Tax Free Area: voci tax-free + 50% diarie sotto soglia

4. **Calcolo contributi INPS**
   - IVS (9.19%), IVS Add (3.59%), CIGS (0.3%), FSTA (0.167%), FIS (0.267%)
   - Esenzione IVS (se applicabile per anno)
   - Minimo imponibile giornaliero: 56.87€

5. **Calcolo IRPEF**
   - Scaglioni IRPEF per anno
   - Detrazioni lavoro dipendente
   - Detrazioni coniuge (se a carico)
   - Taglio cuneo fiscale
   - Trattamento integrativo

6. **Calcolo TFR e Fondo Pensione**
   - Retribuzione utile TFR
   - TFR maturato mensile
   - Contributo aziendale TFR (max 2%)
   - Contributo volontario (max deducibile 5.164,56€/anno)

7. **Totali finali**
   - Totale competenze
   - Totale trattenute
   - Netto da pagare

### 4.2 Regole Specifiche

#### Diaria Tax-Free

```
MAX_TAX_FREE_DIARIA = 46.48€

Per ogni giorno di diaria:
- Primi 46.48€ → TAX_FREE (0%)
- Oltre 46.48€ → 50% tassabile

Esempio: diaria 72.29€
- Tax-free: 46.48€
- Taxable 50%: (72.29 - 46.48) × 0.5 = 12.91€
- Totale imponibile: 12.91€
```

#### FFP (Fixed Flight Pay)

```
FFP =
  baseFFP
  + allowance
  + trainingAllowance
  + simAllowance (se istruttore)
  + correzioni CLA

Tassazione: 50%
```

#### Training Allowance

```
Per TRE/TRI (non BTC): 6500/12 = 541.67€
Per TRE/TRI (BTC): 7079/12 = 589.92€
Per SFI (non BTC): 6000/12 = 500.00€
Per SFI (BTC): 6000/12 = 500.00€
Per LTC: 14000/12 = 1166.67€
Per LCC: 5000/12 = 416.67€
Per SEPE: 2905/12 = 242.08€
Per SEPI: 1905/12 = 158.75€
```

#### Sim Pay (solo SFI, TRI, TRE)

```
VISIBILITÀ: ['sfi', 'tri', 'tre'].includes(rank)

Calcolo a scaglioni in base ai giorni simulatore:
- 1-10 giorni: tariffa base
- 11+ giorni: tariffa aumentata

Esempio TRE non BTC:
- Qualsiasi giorno: 267.38€ sectorPay
```

#### Training Pay (solo LTC/LCC)

```
VISIBILITÀ: rank === 'ltc' || rank === 'lcc'

Settori totali = trainingSectors + (simDays / sectorEquivalent)

Bonus a scaglioni:
- 0-21 settori: 0€
- 22-29 settori: 40€/settore
- 30-50 settori: 60€/settore

Minimo settori per bonus: 21
```

#### Tredicesima (Basic13th)

```
Solo nel mese di DICEMBRE:
- Calcola media dei basic degli ultimi 12 mesi
- Applica correzioni CLA per ogni mese
- Divide per 12
```

#### Unpaid Leave (UL)

```
Giorni UL = giorni di assenza non retribuita
Max giorni: PIL = 17, CC = 19

Calcolo:
- Se giorni ≤ max: detrazione proporzionale
- Se giorni > max: detrazione totale basic + FFP
```

#### Congedo Parentale

```
30% di (basic + FFP) per i giorni di congedo
```

#### Legge 104

```
Come parental leave ma con calcolo diverso su base giornaliera
```

#### TFR

```
RetribuzioneUtileTFR =
  lordoTassabile
  + esenzioneIVS
  - contributiINPS

TFRMensile = RetribuzioneUtileTFR × 0.00698 (1/13.5 × 0.0941)

ContributoAziendale = min(TFRMensile × 0.5, maxContributoAziendale)
```

## 5. Dati CLA - Tabelle Retributive

### 4.1 Piloti (RYR)

| Grado   | Basic (€/mese) | FFP (€/mese) | SBH (€/ora) | AL (€/giorno) | OOB (€) | WOFF (€) | Allowance (€/mese) | Diaria (€/giorno) | RSA (€) |
| ------- | -------------- | ------------ | ----------- | ------------- | ------- | -------- | ------------------ | ----------------- | ------- |
| **TRE** | 1.153,85       | 6.587,00     | 42,20       | 165,00        | 160     | 900      | 666,67             | 46,48             | 51,92   |
| **TRI** | 1.153,85       | 6.587,00     | 42,20       | 165,00        | 160     | 900      | 666,67             | 46,48             | 51,92   |
| **LTC** | 1.153,85       | 6.587,00     | 42,20       | 165,00        | 160     | 900      | 666,67             | 46,48             | 51,92   |
| **LCC** | 1.153,85       | 6.587,00     | 42,20       | 165,00        | 160     | 900      | 666,67             | 46,48             | 51,92   |
| **CPT** | 1.153,85       | 6.587,00     | 42,20       | 165,00        | 160     | 900      | 666,67             | 46,48             | 51,92   |
| **SFI** | 384,62         | 3.177,67     | 18,21       | 132,00        | 155     | 450      | 625,00             | 46,48             | 51,92   |
| **FO**  | 384,62         | 3.177,67     | 18,21       | 132,00        | 155     | 450      | 625,00             | 46,48             | 51,92   |
| **JFO** | 384,62         | 2.952,67     | 15,96       | 132,00        | 155     | 450      | 625,00             | 46,48             | 51,92   |
| **SO**  | 384,62         | 1.224,83     | 18,40       | 7,76          | 155     | 138      | 625,00             | 46,48             | 51,92   |

**Note Piloti:**

- **Basic**: Stipendio base (15000/13 per CPT/LTC, 5000/13 per FO)
- **FFP**: Fixed Flight Pay mensile (79044/12 per CPT, 38132/12 per FO)
- **SBH**: Scheduled Block Hours (€/ora) (35870/850 per CPT, 15479/850 per FO)
- **AL**: Annual Leave (4785/29 per CPT, 3828/29 per FO)
- **OOB**: Out Of Base
- **WOFF**: Week Off
- **ITUD**: Giorni sindacale (120€ per CPT/FO, 35€ per CC)

### 4.2 Cabin Crew (RYR)

| Grado    | Basic (€/mese) | FFP (€/mese) | SBH (€/blocco) | AL (€/giorno) | OOB (€) | OOB Unplanned (€) | Allowance (€/mese) | Diaria (€) | Training Diaria (€) | RSA (€) |
| -------- | -------------- | ------------ | -------------- | ------------- | ------- | ----------------- | ------------------ | ---------- | ------------------- | ------- |
| **SEPE** | 384,62         | 1.105,23     | 6,88           | 41,29         | 28      | 42                | 269,17             | 72,29      | 46,94               | 51,92   |
| **SEPI** | 384,62         | 1.105,23     | 6,88           | 41,29         | 28      | 42                | 269,17             | 72,29      | 46,94               | 52,92   |
| **PU**   | 384,62         | 938,50       | 6,88           | 41,29         | 28      | 42                | 269,18             | 40,00      | 46,94               | 52,92   |
| **JPU**  | 307,69         | 676,07       | 5,70           | 35,03         | 28      | 42                | 60,84              | 40,00      | 40,30               | 52,92   |
| **JU**   | 230,77         | 567,98       | 4,69           | 29,06         | 28      | 42                | 60,84              | 40,00      | 36,30               | 52,92   |

**Note Cabin Crew:**

- **Basic**: Stipendio base (5000/13)
- **FFP**: Flight Duty Pay mensile (13262.76/12 per SEPE/SEPI)
- **SBH**: Standby Pay a blocco
- **AL**: Annual Leave
- **OOB**: Out Of Base pianificato
- **OOB Unplanned**: Out Of Base non pianificato
- **Allowance**: (730+2500)/12 per SEPE/SEPI, 60.84+208.34 per PU
- **ITUD**: 35€ per tutti i gradi

### 4.3 Training Pay

#### Piloti TRE/TRI (non BTC):

- Allowance: 541,67 €/mese (6500/12)
- Sim Diaria: 267,38 €/settore (qualsiasi numero di giorni)
- Bonus: 3 settori equivalenti

#### Piloti TRE/TRI (BTC):

- Allowance: 589,92 €/mese (7079/12)
- Sim Diaria (1-10 giorni): 150€ FFP + 108,83€ sector pay
- Sim Diaria (11+ giorni): 0€ FFP + 217,65€ sector pay
- Bonus: 3 settori equivalenti

#### Piloti SFI (non BTC):

- Allowance: 500,00 €/mese (6000/12)
- Sim Diaria: 100,50 €/settore

#### Piloti SFI (BTC):

- Allowance: 500,00 €/mese (6000/12)
- Sim Diaria (1-10 giorni): 93,75€ FFP + 61,65€ sector pay
- Sim Diaria (11+ giorni): 0€ FFP + 123,30€ sector pay

#### Piloti LTC:

- Allowance: 1.166,67 €/mese (14000/12)
- Bonus settori:
  - 0-21 settori: 0€
  - 22-29 settori: 40€
  - 30-50 settori: 60€
- Minimo settori per bonus: 21

#### Piloti LCC:

- Allowance: 416,67 €/mese (5000/12)

#### Cabin Crew SEPE:

- Allowance: 242,08 €/mese (2905/12)

#### Cabin Crew SEPI:

- Allowance: 158,75 €/mese (1905/12)

## 5. Aliquote e Detrazioni Fiscali

### 5.1 Contributi INPS (IVS)

| Voce            | Aliquota   |
| --------------- | ---------- |
| IVS base        | 9,19%      |
| IVS Addizionale | 3,59%      |
| CIGS            | 0,30%      |
| FSTA            | 0,167%     |
| FIS             | 0,26667%   |
| **Totale**      | **13,52%** |

**Fattore pensionistico**: 0.33

**Minimo imponibile INPS giornaliero**:

- 2024-2025: 56,87 €

### 5.2 IRPEF - Scaglioni

**2024-2025:**
| Fino a (€) | Aliquota |
|------------|----------|
| 28.000 | 23% |
| 50.000 | 35% |
| Oltre | 43% |

**2023:**
| Fino a (€) | Aliquota |
|------------|----------|
| 15.000 | 23% |
| 28.000 | 25% |
| 50.000 | 35% |
| Oltre | 43% |

### 5.3 Detrazioni Lavoro Dipendente

**2024:**

- Fino a 15.000€: 1.955€/anno
- 15.000€ - 28.000€: 1.910 + 1.190 × ((28.000 - reddito) / 13.000)
- 28.000€ - 50.000€: 1.910 × ((50.000 - reddito) / 22.000)
- 25.000€ - 35.000€: +65€ bonus

**2025:**

- Come 2024 ma **senza bonus 65€**

### 5.4 Detrazioni Coniuge

**2024:**

- Fino a 15.000€: 800 - (110 × reddito) / 15.000
- 15.000€ - 29.000€: 690€
- 29.000€ - 29.200€: 700€
- 29.200€ - 34.700€: 710€
- 34.700€ - 35.000€: 720€
- 35.000€ - 35.100€: 710€
- 35.100€ - 35.200€: 700€
- 35.200€ - 40.000€: 690€
- 40.000€ - 80.000€: 690 × ((80.000 - reddito) / 40.000)

**2025:**

- Nessuna detrazione coniuge (0)

### 5.5 Taglio Cuneo Fiscale

**2024:**

- Fino a 1.923€: 7%
- 1.923€ - 2.692€: 6%
- Concorre all'imponibile IRPEF: SÌ

**2025:**

- Fino a 8.500€: 7,1%
- 8.500€ - 15.000€: 5,3%
- 15.000€ - 20.000€: 4,8%
- 20.000€ - 32.000€: 1.000€/anno (come % sul reddito)
- 32.000€ - 40.000€: calcolo con décalage
- Oltre 40.000€: 0%
- Concorre all'imponibile IRPEF: NO

### 5.6 Esenzione IVS

**2024:**

- Come Taglio Cuneo Fiscale 2024

**2025:**

- Nessuna esenzione (0)

### 5.7 Trattamento Integrativo

**2024-2025:**

- Spetta solo se reddito ≤ 28.000€
- Fino a 15.000€: 100€/mese (1.200€/anno) se imposta lorda > detrazioni
- 15.000€ - 28.000€: 0 (commentato nel codice)

## 6. Settings Utente (da salvare in AsyncStorage)

```typescript
interface PayrollSettings {
  // Configurazione contratto
  company: "RYR" | "MAY";
  role: "pilot" | "cabin_crew";
  rank: string; // Grado selezionato

  // Flags stato (derivati da user + selezione manuale)
  isRSA: boolean; // Da user.rsa
  isLtc: boolean; // rank === 'ltc'
  isSimInstructor: boolean; // ['sfi','tri','tre'].includes(rank)
  isCCInstructor: boolean; // Flag manuale (solo CC)
  triAndLtc: boolean; // TRI che fa anche LTC (flag manuale)

  // Dati personali fiscali
  coniugeCarico: boolean; // Coniuge a carico?
  addRegionali: number; // % addizionale regionale
  addComunali: number; // % addizionale comunale
  accontoAddComunali: number; // Acconto addizionale comunale

  // Quote sindacali (da claTables)
  unionFee: number; // Quota mensile

  // TFR
  tfrContribution: number; // Contributo volontario TFR

  // Storico
  prevMonthLeavePayment: number; // Pagamento ferie mese precedente
}
```

### 6.1 Flag Utente dal Profilo

I seguenti flag vengono letti direttamente dal profilo utente (`user`):

| Flag   | Source      | Descrizione                    |
| ------ | ----------- | ------------------------------ |
| `itud` | `user.itud` | Abilita campo ITUD nel form    |
| `rsa`  | `user.rsa`  | Abilita voce RSA in busta paga |

````

## 8. Regole di Calcolo

### 6.1 Tassazione Diaria

- **Max diaria tax-free**: 46,48 €/giorno
- Diaria oltre soglia: tassata al 50%

### 6.2 Contributo Volontario Fondo Pensione

- **Max deducibile**: 5.164,56 €/anno

### 6.3 TFR

- **Max contributo aziendale TFR**: 2% (configurazione aziendale)

### 6.4 Giorni INPS

- **Giorni INPS mensili standard**: 26

### 6.5 CU (Certificazione Unica)

- **Riduzione CU**: 0.9 (90%)

### 6.6 Giorni Unpaid Leave

| Ruolo | Giorni |
|-------|--------|
| Piloti | 17 |
| Cabin Crew | 19 |

### 6.7 Quote Sindacali (mensili)

| Grado | Quota (€) |
|-------|-----------|
| CPT | 40 |
| FO | 20 |
| CC | 5 |

## 7. Correzioni CLA (Aumenti Contrattuali)

Le correzioni CLA sono aumenti contrattuali programmati con date di applicazione specifiche. Il sistema deve supportare due modalità:

### 7.1 Modalità di Applicazione

| Modalità | Descrizione | Uso |
|----------|-------------|-----|
| **Standard** | Applica solo correzioni con data ≤ data selezionata | Calcolo busta paga passata/presente |
| **Previsione** | Applica TUTTE le correzioni conosciute, anche future | Simulazione aumenti futuri |

### 7.2 Toggle Previsione in UI

```typescript
interface CalculationMode {
  type: 'standard' | 'preview';
  previewDate?: string;  // Se type='preview', data fino a cui applicare correzioni
}
````

**Comportamento:**

- **Standard**: `correction.date ≤ input.date` → applica
- **Previsione**: `correction.date ≤ previewDate` → applica (anche se > oggi)

### 7.3 Correzioni Programmate

#### Piloti

| Data       | Grado | Voce | Importo        | Stato       |
| ---------- | ----- | ---- | -------------- | ----------- |
| 15/04/2025 | CPT   | FFP  | +250,00 €/mese | Programmato |
| 15/04/2025 | FO    | FFP  | +133,33 €/mese | Programmato |
| 15/04/2026 | CPT   | FFP  | +250,00 €/mese | Programmato |
| 15/04/2026 | FO    | FFP  | +133,33 €/mese | Programmato |

#### Cabin Crew

| Data       | Grado | Voce | Importo       | Stato       |
| ---------- | ----- | ---- | ------------- | ----------- |
| 15/04/2025 | JU    | FFP  | +41,67 €/mese | Programmato |
| 15/04/2025 | PU    | FFP  | +62,50 €/mese | Programmato |
| 15/04/2025 | JPU   | FFP  | +62,50 €/mese | Programmato |

### 7.4 Esempio di Calcolo con Previsione

```
Scenario: Oggi è Gennaio 2025, utente vuole simulare busta paga Maggio 2025

Modalità STANDARD (solo correzioni attive):
- Data selezionata: 2025-05-01
- Correzzioni applicabili: nessuna (prima del 15/04/2025)
- FFP CPT: 6.587,00 € (valore base)

Modalità PREVISIONE (con aumenti futuri):
- Data selezionata: 2025-05-01
- Preview date: 2025-12-31 (applica tutto fino a fine anno)
- Correzzioni applicabili: 15/04/2025
- FFP CPT: 6.587,00 + 250,00 = 6.837,00 €
```

### 7.5 Implementazione

```typescript
// Applica correzioni CLA
function applyCLACorrections(
  baseConfig: CLAConfiguration,
  corrections: CLACorrection[],
  calculationDate: string, // Data della busta paga
  previewDate?: string, // Se definito, modalità previsione
): CLAConfiguration {
  const effectiveDate = previewDate || calculationDate;

  const activeCorrections = corrections.filter((c) =>
    moment(c.date).isSameOrBefore(effectiveDate, "day"),
  );

  // Applica ogni correzione in ordine cronologico
  activeCorrections
    .sort((a, b) => moment(a.date).diff(moment(b.date)))
    .forEach((correction) => {
      Object.entries(correction.voci).forEach(([key, value]) => {
        if (typeof value === "number") {
          baseConfig.voci[key] = (baseConfig.voci[key] || 0) + value;
        }
      });
    });

  return baseConfig;
}
```

### 7.6 UI per Previsione

```
┌─────────────────────────────────────┐
│  Calcolatore Busta Paga             │
├─────────────────────────────────────┤
│                                     │
│  Data: [Maggio 2025 ▼]              │
│                                     │
│  [✓] Mostra aumenti futuri          │
│      fino a: [Dicembre 2025 ▼]      │
│      ↑ Toggle per modalità          │
│      previsione                     │
│                                     │
│  [CALCOLA]                          │
│                                     │
└─────────────────────────────────────┘

Risultato con previsione attiva:
┌─────────────────────────────────────┐
│  FFP: 6.837,00 €                    │
│  ↑ Include aumento del 15/04/2025   │
│  [i] Vedi dettaglio aumenti         │
└─────────────────────────────────────┘
```

## 9. Struttura File Frontend

```
app/src/
├── services/
│   ├── payroll/
│   │   ├── data/
│   │   │   ├── cla-config.ts           # Dati CLA hardcoded
│   │   │   ├── tax-rates.ts            # Aliquote fiscali per anno
│   │   │   └── corrections.ts          # Correzioni CLA
│   │   ├── types/
│   │   │   ├── payroll.types.ts        # Interface TypeScript
│   │   │   └── cla.types.ts            # Tipi CLA
│   │   ├── utils/
│   │   │   ├── calculations.ts         # Funzioni calcolo
│   │   │   ├── tax-calculator.ts       # Calcolo tasse
│   │   │   └── inps-calculator.ts      # Calcolo contributi
│   │   ├── payroll.service.ts          # Service principale
│   │   └── payroll-calculator.ts       # Engine calcolo
├── screens/
│   └── PayrollScreen/
│       ├── PayrollScreen.tsx
│       ├── components/
│       │   ├── PayrollInputForm.tsx
│       │   ├── PayrollResult.tsx
│       │   ├── TaxBreakdown.tsx
│       │   └── PayslipItemList.tsx
│       └── hooks/
│           └── usePayrollCalculator.ts
└── store/
    └── payrollStore.ts                 # Stato calcoli (Zustand)
```

## 12. Architettura Offline

Il calcolatore funziona **completamente offline** nel frontend. Nessuna API backend necessaria.

### 8.1 Storage Locale

```typescript
// Dati CLA statici nel codice (TypeScript)
// Storico calcoli in AsyncStorage

interface StoredCalculation {
  id: string;
  dataCalcolo: string;
  input: PayrollInput;
  result: PayrollResult;
}

// Chiavi AsyncStorage:
// - 'payroll_calculations': StoredCalculation[]
// - 'payroll_last_input': PayrollInput (ultimo input per precompilazione)
```

### 8.2 Persistenza

- Configurazioni CLA: **Hardcoded** nel codice TypeScript
- Storico calcoli: **AsyncStorage** (solo su device utente)
- Nessuna sincronizzazione server
- Export/import JSON per backup manuale

## 9. API Backend (NON UTILIZZATE - Solo per riferimento)

~~GET /payroll/config/:company/:ruolo/:anno/:grado~~
~~POST /payroll/calculate~~
~~GET /payroll/history~~
~~POST /payroll/history~~
~~DELETE /payroll/history/:id~~

### 8.1 Endpoints

```
GET   /payroll/config/:company/:ruolo/:anno/:grado    # Configurazione CLA
POST  /payroll/calculate                              # Calcolo busta paga
GET   /payroll/history                                # Storico calcoli utente
POST  /payroll/history                                # Salva calcolo
DELETE /payroll/history/:id                           # Elimina calcolo
```

### 8.2 Request/Response

**POST /payroll/calculate**

```json
{
  "input": {
    "mese": 1,
    "anno": 2025,
    "grado": "cpt",
    "oreVolo": 85,
    "giorniLavorati": 20,
    "giorniFerie": 2,
    "giorniMalattia": 0,
    "giorniOOB": 5,
    "giorniWoff": 8,
    "giorniTraining": 0,
    "giorniITUD": 3,
    "giorniUnpaidLeave": 0
  }
}
```

**Response**

```json
{
  "voci": [
    { "codice": "basic", "descrizione": "Stipendio Base", "importoTotale": 1153.85 },
    { "codice": "ffp", "descrizione": "Flight Duty Pay", "importoTotale": 6587.00 },
    ...
  ],
  "totali": {
    "lordoTotale": 12500.00,
    "contributiINPS": 1690.00,
    "irpefNetta": 1850.00,
    "nettoDaPagare": 8960.00
  }
}
```

## 10. Interfaccia Utente

### 9.1 Schermate

1. **PayrollCalculatorScreen**
   - Selettore mese/anno
   - Selettore grado (dropdown con gradi disponibili per ruolo)
   - Form input:
     - Ore di volo
     - Blocchi servizio (CC)
     - Giorni OOB
     - Giorni WOFF (Piloti)
     - Giorni training (se applicabile)
     - Giorni ITUD
     - Giorni ferie/malattia
   - Pulsante "Calcola"

2. **PayrollResultScreen**
   - Riepilogo voci (accordion):
     - Voci fisse
     - Voci variabili
     - Maggiorazioni
     - Trattenute
   - Card totali:
     - Lordo
     - Netto
     - Tassazione effettiva
   - Grafico: suddivisione lordo/netto/tasse
   - Pulsanti: "Salva", "Condividi" (PDF), "Modifica"

3. **PayrollHistoryScreen**
   - Lista calcoli salvati per mese/anno
   - Confronto tra mesi
   - Export PDF

### 9.2 Componenti UI

- `PayrollInputForm`: Form dinamico per input
- `PayrollResultCard`: Card risultato
- `TaxBreakdownChart`: Grafico a torta/donut
- `PayrollHistoryItem`: Item lista storico
- `GradeSelector`: Selettore grado con info retribuzione

## 13. Database Schema (NON UTILIZZATO - Solo per riferimento)

~~-- Configurazione CLA~~
~~CREATE TABLE cla_configurations~~

```sql
-- Configurazione CLA
CREATE TABLE cla_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company VARCHAR(10) NOT NULL, -- 'RYR', 'MAY'
  ruolo VARCHAR(20) NOT NULL, -- 'pilot', 'cabin_crew'
  grado VARCHAR(20) NOT NULL,
  anno_validita INTEGER NOT NULL,
  voci JSONB NOT NULL,
  training JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(company, ruolo, grado, anno_validita)
);

-- Correzioni CLA
CREATE TABLE cla_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company VARCHAR(10) NOT NULL,
  ruolo VARCHAR(20) NOT NULL,
  data_applicazione DATE NOT NULL,
  grado VARCHAR(20) NOT NULL,
  voci_corrette JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Calcoli utente
CREATE TABLE payroll_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  mese INTEGER NOT NULL,
  anno INTEGER NOT NULL,
  grado VARCHAR(20) NOT NULL,
  input JSONB NOT NULL,
  voci JSONB NOT NULL,
  totali JSONB NOT NULL,
  tax_breakdown JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, mese, anno)
);
```

## 14. Open Questions

- [ ] Qual è il company code per Malta Air? (MAY?)
- [ ] Ci sono differenze CLA tra Ryanair e Malta Air?
- [ ] Serve integrazione con roster import (CSV/pdf roster)?
- [ ] Serve calcolo automatico basato su roster caricato?
- [ ] Quali dati precompilare dall'utente (grado, base, etc.)?
- [ ] Serve confronto anno su anno?
- [ ] Serve simulatore "cosa cambia se passo di grado"?

---

## Prossimi Passi

1. **Validare dati CLA** con fonte ufficiale
2. **Definire company code** Malta Air
3. **Creare seed dati** per configurazioni CLA
4. **Implementare API** calcolo
5. **Implementare frontend** screen e componenti
6. **Test calcoli** con buste paga reali
