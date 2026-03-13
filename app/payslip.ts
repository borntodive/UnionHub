import moment from 'moment';
import { Injectable, inject } from '@angular/core';
import { Payslip, PayslipItem } from '../interfaces/payroll';
import { StorageService } from '../services/storage.service';

@Injectable({
  providedIn: 'root',
})
export class PayslipData {
  private storageService = inject(StorageService);

  /**
   * Original companies data structure
   * Use getActiveCompanies() to get filtered companies based on settings
   */
  public companies = {
    RYR: {
      maxContributoAziendaleTfr: 2,
      cuReduction: 0.9,
      unpayedLeaveDays: {
        pil: 17,
        cc: 19,
      },
      inpsDays: 26,
      unionFees: {
        cpt: 40,
        fo: 20,
        cc: 5,
      },
      claRanks: {
        cpt: ['cpt', 'tre', 'tri', 'ltc', 'lcc'],
        fo: ['fo', 'sfi', 'jfo', 'so'],
        cc: ['sepe', 'sepi', 'pu', 'jpu', 'ju'],
      },
      unionRanks: {
        cpt: ['cpt', 'tre', 'tri', 'ltc', 'lcc'],
        fo: ['fo', 'sfi', 'jfo', 'so'],
        cc: ['sepe', 'sepi', 'pu', 'jpu', 'ju'],
      },
      claTables: {
        pil: {
          tre: {
            basic: 15000 / 13,
            ffp: 79044 / 12,
            sbh: 35870 / 850,
            al: 4785 / 29,
            oob: 160,
            woff: 900,
            allowance: 8000 / 12,
            diaria: 8831 / 190,
            training: {
              nonBtc: {
                allowance: 6500 / 12,
                simDiaria: [
                  {
                    min: 1,
                    max: 999,
                    pay: {
                      ffp: 0,
                      sectorPay: 267.38,
                    },
                  },
                ],
                bonus: {
                  sectorEquivalent: 3,
                },
              },
              btc: {
                allowance: 7079 / 12,
                bonus: {
                  sectorEquivalent: 3,
                },
                simDiaria: [
                  {
                    min: 1,
                    max: 10,
                    pay: {
                      ffp: 150,
                      sectorPay: 108.83,
                    },
                  },
                  {
                    min: 11,
                    max: 999,
                    pay: {
                      ffp: 0,
                      sectorPay: 217.65,
                    },
                  },
                ],
              },
            },
            rsa: 51.92,
          },
          tri: {
            basic: 15000 / 13,
            ffp: 79044 / 12,
            sbh: 35870 / 850,
            al: 4785 / 29,
            oob: 160,
            woff: 900,
            allowance: 8000 / 12,
            diaria: 8831 / 190,
            training: {
              nonBtc: {
                allowance: 5079 / 12,
                simDiaria: [
                  {
                    min: 1,
                    max: 999,
                    pay: {
                      ffp: 0,
                      sectorPay: 267.38,
                    },
                  },
                ],
                bonus: {
                  sectorEquivalent: 3,
                },
              },
              btc: {
                allowance: 5079 / 12,
                bonus: {
                  sectorEquivalent: 3,
                },
                simDiaria: [
                  {
                    min: 1,
                    max: 10,
                    pay: {
                      ffp: 150,
                      sectorPay: 108.83,
                    },
                  },
                  {
                    min: 11,
                    max: 999,
                    pay: {
                      ffp: 0,
                      sectorPay: 217.65,
                    },
                  },
                ],
              },
            },
            rsa: 51.92,
          },
          ltc: {
            basic: 15000 / 13,
            ffp: 79044 / 12,
            sbh: 35870 / 850,
            al: 4785 / 29,
            oob: 160,
            woff: 900,
            allowance: 8000 / 12,
            diaria: 8831 / 190,
            training: {
              allowance: 14000 / 12,
              bonus: {
                pay: [
                  { min: 0, max: 21, pay: 0 },
                  { min: 22, max: 29, pay: 40 },
                  { min: 30, max: 50, pay: 60 },
                ],
                minSectors: 21,
              },
            },
            rsa: 51.92,
          },
          lcc: {
            basic: 15000 / 13,
            ffp: 79044 / 12,
            sbh: 35870 / 850,
            al: 4785 / 29,
            oob: 160,
            woff: 900,
            allowance: 8000 / 12,
            diaria: 8831 / 190,
            training: {
              allowance: 5000 / 12,
            },
            rsa: 51.92,
          },
          cpt: {
            basic: 15000 / 13,
            ffp: 79044 / 12,
            sbh: 35870 / 850,
            al: 4785 / 29,
            oob: 160,
            woff: 900,
            itud: 120,
            allowance: 8000 / 12,
            diaria: 8831 / 190,
            training: null,
            rsa: 51.92,
          },
          sfi: {
            basic: 5000 / 13,
            ffp: 38132 / 12,
            sbh: 15479 / 850,
            al: 3828 / 29,
            oob: 155,
            woff: 450,
            allowance: 7500 / 12,
            diaria: 8831 / 190,
            training: {
              nonBtc: {
                allowance: 6000 / 12,
                simDiaria: [
                  {
                    min: 1,
                    max: 999,
                    pay: {
                      ffp: 0,
                      sectorPay: 100.5,
                    },
                  },
                ],
              },
              btc: {
                allowance: 6000 / 12,
                simDiaria: [
                  {
                    min: 1,
                    max: 10,
                    pay: {
                      ffp: 93.75,
                      sectorPay: 61.65,
                    },
                  },
                  {
                    min: 11,
                    max: 999,
                    pay: {
                      ffp: 0,
                      sectorPay: 123.3,
                    },
                  },
                ],
              },
            },
            rsa: 51.92,
          },
          fo: {
            basic: 5000 / 13,
            ffp: 38132 / 12,
            sbh: 15479 / 850,
            al: 3828 / 29,
            oob: 155,
            woff: 450,
            itud: 120,
            allowance: 7500 / 12,
            diaria: 8831 / 190,
            training: null,
            rsa: 51.92,
          },
          jfo: {
            basic: 5000 / 13,
            ffp: 35432 / 12,
            sbh: 13566 / 850,
            al: 3828 / 29,
            oob: 155,
            woff: 450,
            allowance: 7500 / 12,
            diaria: 8831 / 190,
            training: null,
            rsa: 51.92,
          },
          so: {
            basic: 5000 / 13,
            ffp: 14698 / 12,
            sbh: 15640 / 850,
            al: 225 / 29,
            oob: 155,
            woff: 138,
            allowance: 7500 / 12,
            diaria: 8831 / 190,
            training: null,
            rsa: 51.92,
          },
        },
        cc: {
          sepe: {
            basic: 5000 / 13,
            ffp: 13262.76 / 12,
            sbh: 6.88,
            al: 41.29,
            oob: 28,
            oobUnplanned: 42,
            itud: 35,
            allowance: (730 + 2500) / 12,
            diaria: 72.29,
            trainingDiaria: 46.94,
            training: {
              allowance: 2905 / 12,
            },
            rsa: 51.92,
          },
          sepi: {
            basic: 5000 / 13,
            ffp: 13262.76 / 12,
            sbh: 6.88,
            al: 41.29,
            oob: 28,
            itud: 35,
            oobUnplanned: 42,
            allowance: (730 + 2500) / 12,
            diaria: 72.29,
            trainingDiaria: 46.94,
            training: {
              allowance: 1905 / 12,
            },
            rsa: 52.92,
          },
          pu: {
            basic: 5000 / 13,
            ffp: 938.5,
            sbh: 6.88,
            al: 41.29,
            oob: 28,
            itud: 35,
            oobUnplanned: 42,
            allowance: 60.84 + 208.34,
            diaria: 40,
            trainingDiaria: 46.94,
            rsa: 52.92,
          },
          jpu: {
            basic: 307.69,
            ffp: 676.07,
            sbh: 5.7,
            al: 35.03,
            oob: 28,
            itud: 35,
            oobUnplanned: 42,
            allowance: 60.84,
            diaria: 40,
            trainingDiaria: 40.3,
            rsa: 52.92,
          },
          ju: {
            basic: 230.77,
            ffp: 567.98,
            itud: 35,
            sbh: 4.69,
            al: 29.06,
            oob: 28,
            oobUnplanned: 42,
            allowance: 60.84,
            diaria: 40,
            trainingDiaria: 36.3,
            rsa: 52.92,
          },
        },
      },
      claCorrection: {
        pil: [
          {
            date: moment('2023-04-15'),
            corrections: null,
          },
          {
            date: moment('2025-04-15'),
            corrections: {
              cpt: {
                ffp: 3000 / 12,
              },
              fo: {
                ffp: 1600 / 12,
              },
            },
          },
          {
            date: moment('2026-04-15'),
            corrections: {
              cpt: {
                ffp: 3000 / 12,
              },
              fo: {
                ffp: 1600 / 12,
              },
            },
          },
        ],
        cc: [
          {
            date: moment('2023-04-15'),
            corrections: null,
          },
          {
            date: moment('2025-04-15'),
            corrections: {
              ju: {
                ffp: 500 / 12,
              },
              pu: {
                ffp: 750 / 12,
              },
              jpu: {
                ffp: 750 / 12,
              },
            },
          },
        ],
      },
    },
  };

  maxTaxFreeDiaria = 46.48;
  maxTaxFreeContributoVolotarioFondoPensione = 5164.56;
  INPSfactors = {
    ivs: 0.0919,
    ivsAdd: 0.0359,
    cigs: 0.003,
    fsta: 0.00167,
    fis: 0.0026667,
    pensionFactor: 0.33,
  };
  minImponibileInpsPerDay = [
    {
      year: 2024,
      amount: 56.87,
    },
    {
      year: 2025,
      amount: 56.87,
    },
  ];
  aliquoteIrpef = [
    {
      anno: 2023,
      aliquote: {
        15000: 0.23,
        28000: 0.25,
        50000: 0.35,
        9999999: 0.43,
      },
      approved: true,
    },
    {
      anno: 2024,
      aliquote: {
        28000: 0.23,
        50000: 0.35,
        9999999: 0.43,
      },
      approved: true,
    },
    {
      anno: 2025,
      aliquote: {
        28000: 0.23,
        50000: 0.35,
        9999999: 0.43,
      },
      approved: true,
    },
  ];
  public detrazioniLavoroDipendente = [
    {
      anno: 2024,
      get(irpef: number) {
        let detrazione = 0;
        if (irpef <= 15000) {
          detrazione = 1955;
        } else if (irpef <= 28000) {
          detrazione = 1910 + 1190 * ((28000 - irpef) / 13000);
        } else if (irpef <= 50000) {
          detrazione = 1910 * ((50000 - irpef) / 22000);
        }

        if (irpef >= 25000 && irpef <= 35000) {
          detrazione += 65;
        }
        return detrazione / 365;
      },
      approved: true,
    },
    {
      anno: 2025,
      get(irpef: number) {
        let detrazione = 0;
        if (irpef <= 15000) {
          detrazione = 1955;
        } else if (irpef <= 28000) {
          detrazione = 1910 + 1190 * ((28000 - irpef) / 13000);
        } else if (irpef <= 50000) {
          detrazione = 1910 * ((50000 - irpef) / 22000);
        }
        // Bonus 65 euro rimosso per il 2025 secondo la Legge di Bilancio 2024
        return detrazione / 365;
      },
      approved: true,
    },
  ];
  public detrazioniConiuge = [
    {
      anno: 2024,
      get(irpef: number) {
        let detrazione = 0;
        if (irpef <= 15000) {
          detrazione = 800 - (110 * irpef) / 15000;
        } else if (irpef <= 29000) {
          detrazione = 690;
        } else if (irpef <= 29200) {
          detrazione = 700;
        } else if (irpef <= 34700) {
          detrazione = 710;
        } else if (irpef <= 35000) {
          detrazione = 720;
        } else if (irpef <= 35100) {
          detrazione = 710;
        } else if (irpef <= 35200) {
          detrazione = 700;
        } else if (irpef <= 40000) {
          detrazione = 690;
        } else if (irpef <= 80000) {
          detrazione = 690 * ((80000 - irpef) / 40000);
        }
        return detrazione / 12;
      },
      approved: true,
    },
    {
      anno: 2025,
      get(irpef: number) {
        let detrazione = 0;
        return detrazione / 12;
      },
      approved: true,
    },
  ];
  public taglioCuneoFiscale = [
    {
      anno: 2024,
      get(inps: number) {
        let detrazione = 0;
        if (inps <= 1923) {
          detrazione = 0.07;
        } else if (inps <= 2692) {
          detrazione = 0.06;
        }
        return detrazione;
      },
      concorreImponibileIRPEF: true,
      approved: true,
    },
    {
      anno: 2025,
      get(inps: number) {
        const redditoAnnuo = inps * 12;
        // Per redditi fino a 20.000€ - Indennità percentuale
        if (redditoAnnuo <= 8500) {
          return 0.071; // 7.1%
        } else if (redditoAnnuo <= 15000) {
          return 0.053; // 5.3%
        } else if (redditoAnnuo <= 20000) {
          return 0.048; // 4.8%
        }

        // Per redditi da 20.001€ a 40.000€ - Detrazione fissa annuale
        else if (redditoAnnuo <= 32000) {
          return 1000 / redditoAnnuo; // Detrazione fissa di 1000€ convertita in percentuale sul reddito
        } else if (redditoAnnuo <= 40000) {
          // Calcolo del décalage
          const detrazioneDecalage = (1000 * (40000 - redditoAnnuo)) / 8000;
          return detrazioneDecalage / redditoAnnuo; // Conversione in percentuale sul reddito
        }

        return 0; // Nessuna detrazione/indennità per redditi superiori a 40.000€
      },
      concorreImponibileIRPEF: false,
      approved: true,
    },
  ];
  public esenzioneIVS = [
    {
      anno: 2024,
      get(inps: number) {
        let detrazione = 0;
        if (inps <= 1923) {
          detrazione = 0.07;
        } else if (inps <= 2692) {
          detrazione = 0.06;
        }
        return detrazione;
      },
      concorreImponibileIRPEF: true,
      approved: true,
    },
    {
      anno: 2025,
      get(inps: number) {
        return 0; // Nessuna detrazione/indennità per redditi superiori a 40.000€
      },
      concorreImponibileIRPEF: false,
      approved: true,
    },
  ];
  public trattamentoIntegrativo = [
    {
      anno: 2024,
      get(
        redditoComplessivo: number,
        impostaLorda: number,
        detrazioni: number,
        date: number
      ) {
        const dayInMonth = moment(date).daysInMonth();
        const bonus = (1200 / 365) * dayInMonth;
        // Il trattamento integrativo spetta solo se il reddito complessivo non supera 28.000€
        if (redditoComplessivo > 28000) {
          return 0;
        }

        // Per redditi fino a 15.000€, il trattamento spetta se l'imposta lorda è maggiore delle detrazioni
        console.log(redditoComplessivo, impostaLorda, detrazioni);
        if (redditoComplessivo <= 15000) {
          return impostaLorda > detrazioni ? bonus : 0; // 100€ mensili = 1200€ annui
        }

        return 0;
      },
      approved: true,
    },
    {
      anno: 2025,
      get(
        redditoComplessivo: number,
        impostaLorda: number,
        detrazioni: number,
        date: number
      ) {
        const dayInMonth = moment(date).daysInMonth();
        const bonus = (1200 / 365) * dayInMonth;
        // Nel 2025 il trattamento integrativo rimane invariato rispetto al 2024
        if (redditoComplessivo > 28000) {
          return 0;
        }

        if (redditoComplessivo <= 15000) {
          return impostaLorda > detrazioni ? bonus : 0;
        }

        /*  if (redditoComplessivo <= 28000) {
          const differenza = impostaLorda - detrazioni;
          if (differenza > 0) {
            return bonus;
          }
        } */

        return 0;
      },
      approved: true,
    },
  ];
}
