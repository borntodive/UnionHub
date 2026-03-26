import { c as V, p as q, a as H } from "./index-DFehVeka.js";
const g = {
    maxContributoAziendaleTfr: 2,
    cuReduction: 0.9,
    unpayedLeaveDays: { pil: 17, cc: 19 },
    unionFees: { cpt: 40, fo: 20, cc: 5 },
    claTables: {
      pil: {
        tre: {
          basic: 15e3 / 13,
          ffp: 79044 / 12,
          sbh: 35870 / 850,
          al: 4785 / 29,
          oob: 160,
          woff: 900,
          allowance: 8e3 / 12,
          diaria: 8831 / 190,
          rsa: 51.92,
          itud: 120,
          training: {
            nonBtc: {
              allowance: 6500 / 12,
              simDiaria: [
                { min: 1, max: 999, pay: { ffp: 0, sectorPay: 267.38 } },
              ],
              bonus: { sectorEquivalent: 3 },
            },
            btc: {
              allowance: 7079 / 12,
              bonus: { sectorEquivalent: 3 },
              simDiaria: [
                { min: 1, max: 10, pay: { ffp: 150, sectorPay: 108.83 } },
                { min: 11, max: 999, pay: { ffp: 0, sectorPay: 217.65 } },
              ],
            },
          },
        },
        tri: {
          basic: 15e3 / 13,
          ffp: 79044 / 12,
          sbh: 35870 / 850,
          al: 4785 / 29,
          oob: 160,
          woff: 900,
          allowance: 8e3 / 12,
          diaria: 8831 / 190,
          rsa: 51.92,
          itud: 120,
          training: {
            nonBtc: {
              allowance: 5079 / 12,
              simDiaria: [
                { min: 1, max: 999, pay: { ffp: 0, sectorPay: 267.38 } },
              ],
              bonus: { sectorEquivalent: 3 },
            },
            btc: {
              allowance: 5079 / 12,
              bonus: { sectorEquivalent: 3 },
              simDiaria: [
                { min: 1, max: 10, pay: { ffp: 150, sectorPay: 108.83 } },
                { min: 11, max: 999, pay: { ffp: 0, sectorPay: 217.65 } },
              ],
            },
          },
        },
        ltc: {
          basic: 15e3 / 13,
          ffp: 79044 / 12,
          sbh: 35870 / 850,
          al: 4785 / 29,
          oob: 160,
          woff: 900,
          allowance: 8e3 / 12,
          diaria: 8831 / 190,
          rsa: 51.92,
          itud: 120,
          training: {
            allowance: 14e3 / 12,
            bonus: {
              pay: [
                { min: 0, max: 21, pay: 0 },
                { min: 22, max: 29, pay: 40 },
                { min: 30, max: 50, pay: 60 },
              ],
              minSectors: 21,
            },
          },
        },
        lcc: {
          basic: 15e3 / 13,
          ffp: 79044 / 12,
          sbh: 35870 / 850,
          al: 4785 / 29,
          oob: 160,
          woff: 900,
          allowance: 8e3 / 12,
          diaria: 8831 / 190,
          rsa: 51.92,
          itud: 120,
          training: { allowance: 5e3 / 12 },
        },
        cpt: {
          basic: 15e3 / 13,
          ffp: 79044 / 12,
          sbh: 35870 / 850,
          al: 4785 / 29,
          oob: 160,
          woff: 900,
          allowance: 8e3 / 12,
          diaria: 8831 / 190,
          rsa: 51.92,
          itud: 120,
          training: null,
        },
        sfi: {
          basic: 5e3 / 13,
          ffp: 38132 / 12,
          sbh: 15479 / 850,
          al: 3828 / 29,
          oob: 155,
          woff: 450,
          allowance: 7500 / 12,
          diaria: 8831 / 190,
          rsa: 51.92,
          itud: 120,
          training: {
            nonBtc: {
              allowance: 6e3 / 12,
              simDiaria: [
                { min: 1, max: 999, pay: { ffp: 0, sectorPay: 100.5 } },
              ],
            },
            btc: {
              allowance: 6e3 / 12,
              simDiaria: [
                { min: 1, max: 10, pay: { ffp: 93.75, sectorPay: 61.65 } },
                { min: 11, max: 999, pay: { ffp: 0, sectorPay: 123.3 } },
              ],
            },
          },
        },
        fo: {
          basic: 5e3 / 13,
          ffp: 38132 / 12,
          sbh: 15479 / 850,
          al: 3828 / 29,
          oob: 155,
          woff: 450,
          allowance: 7500 / 12,
          diaria: 8831 / 190,
          rsa: 51.92,
          itud: 120,
          training: null,
        },
        jfo: {
          basic: 5e3 / 13,
          ffp: 35432 / 12,
          sbh: 13566 / 850,
          al: 3828 / 29,
          oob: 155,
          woff: 450,
          allowance: 7500 / 12,
          diaria: 8831 / 190,
          rsa: 51.92,
          itud: 120,
          training: null,
        },
        so: {
          basic: 5e3 / 13,
          ffp: 14698 / 12,
          sbh: 15640 / 850,
          al: 225 / 29,
          oob: 155,
          woff: 138,
          allowance: 7500 / 12,
          diaria: 8831 / 190,
          rsa: 51.92,
          itud: 120,
          training: null,
        },
      },
      cc: {
        sepe: {
          basic: 5e3 / 13,
          ffp: 13262.76 / 12,
          sbh: 6.88,
          al: 41.29,
          oob: 28,
          woff: 0,
          allowance: 3230 / 12,
          diaria: 72.29,
          rsa: 51.92,
          itud: 120,
          training: { allowance: 2905 / 12, simDiaria: [] },
        },
        sepi: {
          basic: 5e3 / 13,
          ffp: 13262.76 / 12,
          sbh: 6.88,
          al: 41.29,
          oob: 28,
          woff: 0,
          allowance: 3230 / 12,
          diaria: 72.29,
          rsa: 52.92,
          itud: 120,
          training: { allowance: 1905 / 12, simDiaria: [] },
        },
        pu: {
          basic: 5e3 / 13,
          ffp: 938.5,
          sbh: 6.88,
          al: 41.29,
          oob: 28,
          woff: 0,
          allowance: 60.84 + 208.34,
          diaria: 40,
          rsa: 52.92,
          itud: 120,
          training: null,
        },
        jpu: {
          basic: 307.69,
          ffp: 676.07,
          sbh: 5.7,
          al: 35.03,
          oob: 28,
          woff: 0,
          allowance: 60.84,
          diaria: 40,
          rsa: 52.92,
          itud: 120,
          training: null,
        },
        ju: {
          basic: 230.77,
          ffp: 567.98,
          sbh: 4.69,
          al: 29.06,
          oob: 28,
          woff: 0,
          allowance: 60.84,
          diaria: 40,
          rsa: 52.92,
          itud: 120,
          training: null,
        },
      },
    },
    claCorrection: {
      pil: [
        { date: "2023-04-15", corrections: null },
        {
          date: "2025-04-15",
          corrections: { cpt: { ffp: 3e3 / 12 }, fo: { ffp: 1600 / 12 } },
        },
        {
          date: "2026-04-15",
          corrections: { cpt: { ffp: 3e3 / 12 }, fo: { ffp: 1600 / 12 } },
        },
      ],
      cc: [
        { date: "2023-04-15", corrections: null },
        {
          date: "2025-04-15",
          corrections: {
            ju: { ffp: 500 / 12 },
            pu: { ffp: 750 / 12 },
            jpu: { ffp: 750 / 12 },
          },
        },
      ],
    },
  },
  K = 46.48,
  G = { 2024: 56.87, 2025: 56.87 },
  m = {
    ivs: 0.0919,
    ivsAdd: 0.0359,
    cigs: 0.003,
    fsta: 0.00167,
    fis: 0.0026667,
    pensionFactor: 0.33,
  },
  v = {
    2023: [
      { limit: 15e3, rate: 0.23 },
      { limit: 28e3, rate: 0.25 },
      { limit: 5e4, rate: 0.35 },
      { limit: 1 / 0, rate: 0.43 },
    ],
    2024: [
      { limit: 28e3, rate: 0.23 },
      { limit: 5e4, rate: 0.35 },
      { limit: 1 / 0, rate: 0.43 },
    ],
    2025: [
      { limit: 28e3, rate: 0.23 },
      { limit: 5e4, rate: 0.35 },
      { limit: 1 / 0, rate: 0.43 },
    ],
    2026: [
      { limit: 28e3, rate: 0.23 },
      { limit: 5e4, rate: 0.33 },
      { limit: 1 / 0, rate: 0.43 },
    ],
  };
function C(n, t, a) {
  if (n !== "RYR") return null;
  const i = t === "pilot" || t === "pil" ? "pil" : "cc",
    o = g.claTables[i];
  return (o && o[a.toLowerCase()]) || null;
}
function W(n, t, a) {
  if (n !== "RYR") return [];
  const i = t === "pilot" || t === "pil" ? "pil" : "cc",
    o = g.claCorrection[i];
  if (!o) return [];
  const e = new Date(a);
  return o.filter((s) => new Date(s.date) <= e);
}
function X(n, t, a) {
  if (!n) return null;
  const i = { ...n };
  return (
    t.forEach((o) => {
      if (!o.corrections) return;
      const e = o.corrections[a.toLowerCase()];
      e &&
        Object.entries(e).forEach(([s, r]) => {
          r !== void 0 && s in i && (i[s] = i[s] + r);
        });
    }),
    i
  );
}
function J(n, t) {
  const a =
    t === "pilot" || t === "pil"
      ? ["cpt", "tre", "tri", "ltc", "lcc"].includes(n)
        ? "cpt"
        : "fo"
      : "cc";
  return g.unionFees[a] || 0;
}
function Z(n) {
  const t = n === "pilot" || n === "pil" ? "pil" : "cc";
  return g.unpayedLeaveDays[t] || 17;
}
function c(n, t = 100, a = null, i = !1, o = !1) {
  const e = n * (t / 100),
    s = n - e,
    r = a && a > 0 ? n / a : null;
  return {
    total: n,
    taxable: e,
    taxFree: s,
    isDeduction: i,
    quantity: a,
    unit: r,
    isSectorPay: o,
  };
}
function A(n, t, a) {
  return {
    basicQuota: c(n, 100, a, !0),
    ffpQuota: c(t, 50, a, !0),
    total: c(n + t, 100, a, !0),
  };
}
function R(n, t, a = !1, i = !1) {
  const o = n * (t / 100),
    e = n - o;
  return { total: n, taxable: o, taxFree: e, isSLR: a, isConguaglio: i };
}
function $(n, t) {
  const a = [...t].sort((e, s) => e.min - s.min);
  let i = 0,
    o = n;
  for (const e of a) {
    if (o <= 0) break;
    const s = e.max - e.min + 1,
      r = Math.min(o, s);
    r > 0 && ((i += r * e.pay), (o -= r));
  }
  return i;
}
function tt(n, t) {
  const a = [...t].sort((e, s) => e.min - s.min);
  let i = 0,
    o = 0;
  for (const e of a)
    if (n >= e.min) {
      const s = Math.min(n, e.max) - e.min + 1;
      ((i += s * e.pay.ffp), (o += s * e.pay.sectorPay));
    }
  return { ffp: i, sectorPay: o };
}
function at(n, t, a = 46.48) {
  const i = n * t,
    o = Math.min(t, a),
    e = n * o,
    s = i - e;
  return { total: i, taxable: s, taxFree: e };
}
function it(n) {
  return Object.values(n).reduce((t, a) => t + a, 0);
}
function nt(n, t) {
  let a = 0,
    i = 0;
  for (const o of t) {
    const e = o.limit === 1 / 0 ? n : o.limit;
    if (n > e) ((a += (e - i) * o.rate), (i = e));
    else {
      a += (n - i) * o.rate;
      break;
    }
  }
  return a / 12;
}
function et(n, t, a) {
  let i = 0;
  return (
    n <= 15e3
      ? (i = 1955)
      : n <= 28e3
        ? (i = 1910 + 1190 * ((28e3 - n) / 13e3))
        : n <= 5e4 && (i = 1910 * ((5e4 - n) / 22e3)),
    t === 2024 && n >= 25e3 && n <= 35e3 && (i += 65),
    i / 365
  );
}
function ot(n, t) {
  if (t >= 2025) return 0;
  let a = 0;
  return (
    n <= 15e3
      ? (a = 800 - (110 * n) / 15e3)
      : n <= 29e3
        ? (a = 690)
        : n <= 29200
          ? (a = 700)
          : n <= 34700
            ? (a = 710)
            : n <= 35e3
              ? (a = 720)
              : n <= 35100
                ? (a = 710)
                : n <= 35200
                  ? (a = 700)
                  : n <= 4e4
                    ? (a = 690)
                    : n <= 8e4 && (a = 690 * ((8e4 - n) / 4e4)),
    a / 12
  );
}
function z(n, t) {
  if (n <= 0) return { percentage: 0, amount: 0 };
  const a = n * 12;
  if (t === 2024) {
    if (n <= 1923) return { percentage: 0.07, amount: n * 0.07 };
    if (n <= 2692) return { percentage: 0.06, amount: n * 0.06 };
  } else if (t >= 2025) {
    if (a <= 8500) return { percentage: 0.071, amount: n * 0.071 };
    if (a <= 15e3) return { percentage: 0.053, amount: n * 0.053 };
    if (a <= 2e4) return { percentage: 0.048, amount: n * 0.048 };
    if (a <= 32e3) {
      const i = 83.33333333333333;
      return { percentage: i / n, amount: i };
    } else if (a <= 4e4) {
      const o = (1e3 * (4e4 - a)) / 8e3 / 12;
      return { percentage: o / n, amount: o };
    }
  }
  return { percentage: 0, amount: 0 };
}
function st(n, t) {
  return t === 2024
    ? { ...z(n, t), concorreImponibileIRPEF: !0 }
    : { percentage: 0, amount: 0, concorreImponibileIRPEF: !1 };
}
function rt(n, t, a, i) {
  return n > 28e3 ? 0 : n <= 15e3 && t > a ? 1200 / 365 : 0;
}
function ct(n) {
  const [t, a] = n.split(":").map(Number);
  return t + a / 60;
}
function lt(n) {
  return new Date(n).getFullYear();
}
function ut(n) {
  return new Date(n).getMonth() === 11;
}
class ft {
  constructor(t, a, i = {}) {
    ((this.input = t),
      (this.settings = a),
      (this.userFlags = i),
      (this.year = lt(t.date)),
      (this.month = new Date(t.date).getMonth() + 1));
    const o = C(a.company, a.role, a.rank);
    if (o) {
      const e = W(a.company, a.role, t.date),
        s = X(o, e, a.rank);
      if (!s) {
        this.contractData = null;
        return;
      }
      if (a.legacy) {
        const r = a.legacyCustom,
          l = a.legacyDeltas;
        a.legacyDirect && r
          ? (this.contractData = {
              ...s,
              ffp: r.ffp > 0 ? r.ffp : s.ffp,
              sbh: r.sbh > 0 ? r.sbh : s.sbh,
              al: r.al > 0 ? r.al : s.al,
            })
          : l
            ? (this.contractData = {
                ...s,
                ffp: s.ffp + l.ffp,
                sbh: s.sbh + l.sbh,
                al: s.al + l.al,
              })
            : (this.contractData = s);
      } else this.contractData = s;
    } else this.contractData = null;
  }
  async calculatePayroll() {
    if (!this.contractData) return null;
    const t = this.calculatePayslipItems(),
      a = this.calculateSectorPay(t),
      { taxArea: i, taxFreeArea: o, grossPay: e } = this.calculateTaxAreas(t),
      s = this.calculateINPS(i),
      r = this.calculateTFR(t, s.imponibile),
      l = this.calculateFondoPensione(r.retribuzioneUtileTFR),
      u = this.calculateIRPEF(i, s, t.additionalPayments);
    ((u.fondoPensione = l),
      (u.retribuzioneUtileTFR = r.retribuzioneUtileTFR),
      (u.tfr = r.tfr));
    const f = e + s.esenzioneIVS.amount + u.trattamentoIntegrativo,
      d =
        s.contribuzioneTotale +
        u.ritenute +
        u.fondoPensione.volontaria +
        u.addizionaliRegionali +
        u.addizionaliComunali +
        u.accontoAddizionaliComunali,
      b = f - d;
    return {
      payslipItems: t,
      sectorPay: a,
      taxArea: i,
      taxFreeArea: o,
      grossPay: e,
      areaINPS: s,
      areaIRPEF: u,
      netPayment: b,
      totaleCompetenze: f,
      totaleTrattenute: d,
    };
  }
  calculatePayslipItems() {
    var x;
    const t = this.contractData,
      a = this.settings.parttime ? this.settings.parttimePercentage : 1,
      i = this.settings.cu ? 0.9 : 1,
      o = t.basic * a * i,
      e = c(o, 100, t.basicDays || 1),
      s = ut(this.input.date) ? c(o, 100) : c(0, 100),
      r = this.calculateFFP(a, i),
      l = c(r, 50),
      u = at(this.input.flyDiaria, t.diaria, K),
      f = {
        total: u.total,
        taxable: u.taxable,
        taxFree: u.taxFree,
        isDeduction: !1,
        quantity: this.input.flyDiaria,
        unit: t.diaria,
        isSectorPay: !1,
      },
      d = c(this.input.noFlyDiaria * t.diaria, 100, this.input.noFlyDiaria),
      b = c(this.input.al * t.al * i, 50, this.input.al),
      D = t.woff
        ? c(t.woff * this.input.woff * i, 50, this.input.woff)
        : c(0, 50),
      y = c(this.input.oob * t.oob, 100, this.input.oob),
      P = this.userFlags.rsa ? c(t.rsa, 100) : c(0, 100),
      h = t.oob
        ? c(this.input.oobUnplanned * t.oob, 100, this.input.oobUnplanned)
        : c(0, 100),
      w = this.calculateLeave(this.input.ul, e.total, l.total, !1),
      T = c(this.calculateSimPay() * i, 50, this.input.simDays),
      L = c(this.calculateTrainingPay() * i, 50, this.input.trainingSectors),
      E = this.calculateLeave(this.input.parentalDays, e.total, l.total, !0),
      I = this.calculateLeave(this.input.days104, e.total, l.total, !0),
      F = ct(this.input.sbh),
      k = c(F * t.sbh, 50, F),
      M = t.itud || 120,
      B = c(this.input.itud * M, 50, this.input.itud),
      N = this.input.additional.map((p) =>
        R(p.amount, p.tax, p.isSLR, p.isConguaglio),
      ),
      U = this.input.additionalDeductions.map((p) =>
        R(p.amount, p.tax, !1, p.isConguaglio),
      ),
      _ = J(this.settings.rank, this.settings.role),
      Q = c(_, 0, 1, !0),
      j = c(this.input.commissions * i, 100),
      O = c(this.input.bankHolydays * t.al, 50, this.input.bankHolydays),
      Y = c(
        this.input.ccTrainingDays *
          (((x = t.training) == null ? void 0 : x.allowance) || 0) *
          i,
        50,
        this.input.ccTrainingDays,
      );
    return {
      basic: e,
      basic13th: s,
      ffp: l,
      flyDiaria: f,
      noFlyDiaria: d,
      ccTraining: Y,
      al: b,
      woff: D,
      oob: y,
      rsa: P,
      oobUnplanned: h,
      ul: w,
      simPay: T,
      trainingPay: L,
      parentalLeave: E,
      leave104: I,
      sbh: k,
      itud: B,
      additionalPayments: N,
      additionalDeductions: U,
      union: Q,
      commissions: j,
      bankHolydays: O,
    };
  }
  calculateFFP(t = 1, a = 1) {
    var s, r;
    const i = this.contractData;
    let o = i.ffp * t * a + i.allowance;
    if (
      ((s = i.training) != null && s.allowance && (o += i.training.allowance),
      this.isInstructor() && i.training)
    ) {
      const l = i.training;
      this.settings.btc && l.btc
        ? (o += l.btc.allowance)
        : l.nonBtc && (o += l.nonBtc.allowance);
    }
    if (this.settings.rank === "tre" || this.settings.triAndLtc) {
      const l = C(this.settings.company, this.settings.role, "ltc");
      (r = l == null ? void 0 : l.training) != null &&
        r.allowance &&
        (o += l.training.allowance);
    }
    return o;
  }
  calculateSimPay() {
    var o;
    if (
      !this.isInstructor() ||
      !((o = this.contractData) != null && o.training)
    )
      return 0;
    const t = this.contractData.training;
    let a = [];
    if (
      (this.settings.btc && t.btc
        ? (a = t.btc.simDiaria)
        : t.nonBtc && (a = t.nonBtc.simDiaria),
      a.length === 0)
    )
      return 0;
    const { sectorPay: i } = tt(this.input.simDays, a);
    return i;
  }
  calculateTrainingPay() {
    var a, i, o;
    if (
      !this.settings.triAndLtc ||
      !(
        (o =
          (i = (a = this.contractData) == null ? void 0 : a.training) == null
            ? void 0
            : i.bonus) != null && o.pay
      )
    )
      return 0;
    let t = this.input.trainingSectors;
    return (
      this.contractData.training.bonus.sectorEquivalent &&
        (t += Math.floor(
          this.input.simDays /
            this.contractData.training.bonus.sectorEquivalent,
        )),
      $(t, this.contractData.training.bonus.pay)
    );
  }
  calculateLeave(t, a, i, o) {
    if (t === 0)
      return {
        basicQuota: c(0, 100, 0, !0),
        ffpQuota: c(0, 50, 0, !0),
        total: c(0, 100, 0, !0),
      };
    if (o) {
      const e = (a * t) / 26,
        s = (i * t) / 26;
      return A(e, s, t);
    } else {
      const e = Z(this.settings.role),
        s = ((a + a / 12) * t) / e,
        r = (i * t) / e;
      return A(s, r, t);
    }
  }
  calculateSectorPay(t) {
    const a = t.ffp.total / 12;
    return c(a, 50, null, !1, !0);
  }
  calculateTaxAreas(t) {
    let a = 0,
      i = 0;
    const o = [
      t.basic,
      t.basic13th,
      t.ffp,
      t.flyDiaria,
      t.noFlyDiaria,
      t.ccTraining,
      t.al,
      t.woff,
      t.oob,
      t.rsa,
      t.oobUnplanned,
      t.simPay,
      t.trainingPay,
      t.sbh,
      t.itud,
      t.commissions,
      t.bankHolydays,
      t.parentalLeave.total,
      t.leave104.total,
      ...t.additionalPayments.map((e) => ({
        total: e.total,
        taxable: e.taxable,
        isDeduction: !1,
      })),
    ];
    for (const e of o) {
      if ("isDeduction" in e && e.isDeduction) continue;
      const s = e.total,
        r = "taxable" in e ? e.taxable : s;
      ((a += r), (i += s - r));
    }
    ((a -= t.ul.total.total),
      (a -= t.parentalLeave.total.total),
      (a -= t.leave104.total.total),
      (a -= t.union.total));
    for (const e of t.additionalDeductions) a -= e.total;
    return { taxArea: a, taxFreeArea: i, grossPay: a + i };
  }
  calculateINPS(t) {
    const i = (G[this.year] || 56.87) * this.input.inpsDays,
      o = Math.max(t, i),
      e = {
        ivs: o * m.ivs,
        ivsAdd: o * m.ivsAdd,
        fis: o * m.fis,
        cigs: o * m.cigs,
        fsta: o * m.fsta,
      },
      s = it(e),
      r = st(o, this.year);
    return {
      imponibile: o,
      contribuzione: e,
      contribuzioneTotale: s,
      pensionAcc: o * m.pensionFactor,
      esenzioneIVS: {
        percentage: r.percentage,
        amount: r.amount,
        concorreImponibileIRPEF: r.concorreImponibileIRPEF,
      },
    };
  }
  calculateIRPEF(t, a, i) {
    const o = a.contribuzioneTotale,
      e = i.filter((h) => h.isSLR).reduce((h, w) => h + w.total, 0),
      s = t - o + e,
      r = s * 12,
      l = v[this.year] || v[2024],
      u = nt(r, l),
      f = et(r, this.year, new Date(this.input.date)) * 30,
      d = this.settings.coniugeCarico ? ot(r, this.year) : 0,
      b = z(s, this.year),
      D = Math.max(0, u - f - d - b.amount),
      y = s > 0 ? D / s : 0,
      P = rt(r, u, f + d, new Date(this.input.date));
    return {
      imponibile: s,
      lordo: u,
      detrazioniLavoroDipendente: f,
      ritenute: D,
      aliquotaMedia: y,
      trattamentoIntegrativo: P,
      taglioCuneoFiscale: b,
      fondoPensione: { totale: 0, volontaria: 0, aziendale: 0 },
      addizionaliComunali: this.settings.addComunali,
      accontoAddizionaliComunali: this.settings.accontoAddComunali,
      addizionaliRegionali: this.settings.addRegionali,
      detrazioneConiuge: d,
      retribuzioneUtileTFR: 0,
      tfr: 0,
    };
  }
  calculateTFR(t, a) {
    const i =
        t.basic.total +
        t.ffp.total +
        t.basic13th.total +
        t.noFlyDiaria.total +
        t.rsa.total +
        t.additionalPayments.reduce((e, s) => e + s.total, 0) -
        t.ul.basicQuota.total -
        t.ul.ffpQuota.total,
      o = i / 13.5 - a * 0.005;
    return { retribuzioneUtileTFR: i, tfr: o };
  }
  calculateFondoPensione(t) {
    const a = (t * this.settings.voluntaryPensionContribution) / 100,
      i = g.maxContributoAziendaleTfr,
      o = this.settings.voluntaryPensionContribution >= i ? i : 0,
      e = (t * o) / 100;
    return { totale: a + e, volontaria: a, aziendale: e };
  }
  isInstructor() {
    return ["sfi", "tri", "tre"].includes(this.settings.rank);
  }
}
async function dt(n, t, a = {}) {
  return new ft(n, t, a).calculatePayroll();
}
const S = {
    date: new Date().toISOString().split("T")[0],
    sbh: "00:00",
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
    inpsDays: 26,
  },
  pt = {
    company: "RYR",
    role: "pil",
    rank: "fo",
    base: "BGY",
    union: 20,
    parttime: !1,
    parttimePercentage: 1,
    coniugeCarico: !1,
    prevMonthLeavePayment: !1,
    tfrContribution: 0,
    addComunali: 0,
    accontoAddComunali: 0,
    addRegionali: 0,
    legacy: !1,
    legacyCustom: { ffp: 0, sbh: 0, al: 0 },
    legacyDeltas: { ffp: 0, sbh: 0, al: 0 },
    triAndLtc: !1,
    btc: !1,
    cu: !1,
    voluntaryPensionContribution: 0,
  },
  mt = V()(
    q(
      (n, t) => ({
        input: { ...S },
        settings: { ...pt },
        result: null,
        isCalculating: !1,
        error: null,
        setInput: (a) => n((i) => ({ input: { ...i.input, ...a } })),
        setSettings: (a) => n((i) => ({ settings: { ...i.settings, ...a } })),
        calculate: async (a = {}) => {
          const { input: i, settings: o } = t();
          n({ isCalculating: !0, error: null });
          try {
            const e = await dt(i, { ...o, legacyDirect: !1 }, a);
            n(
              e
                ? { result: e, isCalculating: !1 }
                : { error: "Errore nel calcolo", isCalculating: !1 },
            );
          } catch (e) {
            n({
              error: e instanceof Error ? e.message : "Errore sconosciuto",
              isCalculating: !1,
            });
          }
        },
        reset: () => n({ input: { ...S }, result: null, error: null }),
        addAdditionalPayment: (a) =>
          n((i) => ({
            input: { ...i.input, additional: [...i.input.additional, a] },
          })),
        updateAdditionalPayment: (a, i) =>
          n((o) => ({
            input: {
              ...o.input,
              additional: o.input.additional.map((e, s) => (s === a ? i : e)),
            },
          })),
        removeAdditionalPayment: (a) =>
          n((i) => ({
            input: {
              ...i.input,
              additional: i.input.additional.filter((o, e) => e !== a),
            },
          })),
        addAdditionalDeduction: (a) =>
          n((i) => ({
            input: {
              ...i.input,
              additionalDeductions: [...i.input.additionalDeductions, a],
            },
          })),
        updateAdditionalDeduction: (a, i) =>
          n((o) => ({
            input: {
              ...o.input,
              additionalDeductions: o.input.additionalDeductions.map((e, s) =>
                s === a ? i : e,
              ),
            },
          })),
        removeAdditionalDeduction: (a) =>
          n((i) => ({
            input: {
              ...i.input,
              additionalDeductions: i.input.additionalDeductions.filter(
                (o, e) => e !== a,
              ),
            },
          })),
      }),
      {
        name: "payslip-web-storage",
        storage: H(() => localStorage),
        partialize: (n) => ({ settings: n.settings }),
      },
    ),
  );
export { g as R, C as g, mt as u };
