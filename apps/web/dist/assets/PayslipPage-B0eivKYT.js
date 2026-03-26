import {
  u as F,
  U as w,
  r as j,
  j as e,
  I as r,
  B as k,
  C as g,
} from "./index-lyt0rc2Z.js";
import {
  u as P,
  g as D,
  c as R,
  a as I,
  R as O,
} from "./usePayslipStore-BZAQ1n-W.js";
const d = (t) =>
  t.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
function c({ label: t, item: s, highlight: i }) {
  return s.total === 0
    ? null
    : e.jsxs("tr", {
        className: i ? "bg-gray-50 font-semibold" : "",
        children: [
          e.jsx("td", {
            className: `py-1.5 pr-3 text-sm ${s.isDeduction === !0 ? "text-red-600" : "text-gray-800"}`,
            children: t,
          }),
          e.jsx("td", {
            className: "py-1.5 pr-2 text-right text-sm font-mono",
            children: s.isDeduction === !0 ? `(${d(s.total)})` : d(s.total),
          }),
          e.jsx("td", {
            className: "py-1.5 pr-2 text-right text-xs text-gray-500 font-mono",
            children: s.taxable !== 0 ? d(s.taxable) : "—",
          }),
        ],
      });
}
function A({ result: t }) {
  var i, o;
  const s = t.payslipItems;
  return e.jsxs("div", {
    className: "space-y-4",
    children: [
      e.jsxs("div", {
        className: "grid grid-cols-2 gap-3",
        children: [
          e.jsxs("div", {
            className:
              "rounded-lg bg-green-50 border border-green-200 p-3 text-center",
            children: [
              e.jsx("div", {
                className:
                  "text-xs text-green-600 font-medium uppercase tracking-wide",
                children: "Netto",
              }),
              e.jsx("div", {
                className: "text-xl font-bold text-green-700 mt-0.5",
                children: d(t.netPayment),
              }),
            ],
          }),
          e.jsxs("div", {
            className:
              "rounded-lg bg-gray-50 border border-gray-200 p-3 text-center",
            children: [
              e.jsx("div", {
                className:
                  "text-xs text-gray-500 font-medium uppercase tracking-wide",
                children: "Lordo",
              }),
              e.jsx("div", {
                className: "text-xl font-bold text-gray-700 mt-0.5",
                children: d(t.grossPay),
              }),
            ],
          }),
          e.jsxs("div", {
            className:
              "rounded-lg bg-blue-50 border border-blue-200 p-3 text-center",
            children: [
              e.jsx("div", {
                className:
                  "text-xs text-blue-600 font-medium uppercase tracking-wide",
                children: "Imponibile",
              }),
              e.jsx("div", {
                className: "text-lg font-bold text-blue-700 mt-0.5",
                children: d(t.taxArea),
              }),
            ],
          }),
          e.jsxs("div", {
            className:
              "rounded-lg bg-yellow-50 border border-yellow-200 p-3 text-center",
            children: [
              e.jsx("div", {
                className:
                  "text-xs text-yellow-600 font-medium uppercase tracking-wide",
                children: "Tax-free",
              }),
              e.jsx("div", {
                className: "text-lg font-bold text-yellow-700 mt-0.5",
                children: d(t.taxFreeArea),
              }),
            ],
          }),
        ],
      }),
      e.jsx("div", {
        className: "overflow-x-auto",
        children: e.jsxs("table", {
          className: "w-full",
          children: [
            e.jsx("thead", {
              children: e.jsxs("tr", {
                className: "border-b border-gray-200",
                children: [
                  e.jsx("th", {
                    className:
                      "text-left text-xs font-semibold text-gray-500 pb-2 pr-3",
                    children: "Voce",
                  }),
                  e.jsx("th", {
                    className:
                      "text-right text-xs font-semibold text-gray-500 pb-2 pr-2",
                    children: "Totale",
                  }),
                  e.jsx("th", {
                    className:
                      "text-right text-xs font-semibold text-gray-500 pb-2",
                    children: "Imponibile",
                  }),
                ],
              }),
            }),
            e.jsxs("tbody", {
              className: "divide-y divide-gray-100",
              children: [
                e.jsx(c, { label: "Stipendio base", item: s.basic }),
                e.jsx(c, { label: "FFP", item: s.ffp }),
                e.jsx(c, { label: "SBH", item: s.sbh }),
                e.jsx(c, { label: "Diaria volo", item: s.flyDiaria }),
                e.jsx(c, { label: "Diaria no-fly", item: s.noFlyDiaria }),
                e.jsx(c, { label: "OOB", item: s.oob }),
                e.jsx(c, { label: "WOFF", item: s.woff }),
                e.jsx(c, { label: "Ferie", item: s.al }),
                e.jsx(c, { label: "Sim pay", item: s.simPay }),
                e.jsx(c, { label: "Training pay", item: s.trainingPay }),
                e.jsx(c, { label: "CC Training", item: s.ccTraining }),
                e.jsx(c, { label: "ITUD", item: s.itud }),
                e.jsx(c, { label: "RSA", item: s.rsa }),
                e.jsx(c, { label: "Commissioni", item: s.commissions }),
                e.jsx(c, { label: "Festività", item: s.bankHolydays }),
                (i = s.additionalPayments) == null
                  ? void 0
                  : i.map((l, n) =>
                      e.jsx(
                        c,
                        {
                          label: `Voce aggiuntiva ${n + 1}`,
                          item: { ...l, isDeduction: !1 },
                        },
                        `ap-${n}`,
                      ),
                    ),
                e.jsx(c, { label: "Sindacato", item: s.union, highlight: !0 }),
                (o = s.additionalDeductions) == null
                  ? void 0
                  : o.map((l, n) =>
                      e.jsx(
                        c,
                        {
                          label: `Trattenuta ${n + 1}`,
                          item: { ...l, isDeduction: !0 },
                        },
                        `ad-${n}`,
                      ),
                    ),
              ],
            }),
          ],
        }),
      }),
      e.jsxs("div", {
        className: "border-t border-gray-200 pt-3 space-y-1.5 text-sm",
        children: [
          e.jsxs("div", {
            className: "flex justify-between",
            children: [
              e.jsx("span", { className: "text-gray-600", children: "INPS" }),
              e.jsxs("span", {
                className: "font-mono text-red-600",
                children: ["(", d(t.areaINPS.contribuzioneTotale), ")"],
              }),
            ],
          }),
          e.jsxs("div", {
            className: "flex justify-between",
            children: [
              e.jsx("span", { className: "text-gray-600", children: "IRPEF" }),
              e.jsxs("span", {
                className: "font-mono text-red-600",
                children: ["(", d(t.areaIRPEF.ritenute), ")"],
              }),
            ],
          }),
          t.areaIRPEF.addizionaliComunali > 0 &&
            e.jsxs("div", {
              className: "flex justify-between",
              children: [
                e.jsx("span", {
                  className: "text-gray-600",
                  children: "Add. comunali",
                }),
                e.jsxs("span", {
                  className: "font-mono text-red-600",
                  children: ["(", d(t.areaIRPEF.addizionaliComunali), ")"],
                }),
              ],
            }),
          t.areaIRPEF.addizionaliRegionali > 0 &&
            e.jsxs("div", {
              className: "flex justify-between",
              children: [
                e.jsx("span", {
                  className: "text-gray-600",
                  children: "Add. regionali",
                }),
                e.jsxs("span", {
                  className: "font-mono text-red-600",
                  children: ["(", d(t.areaIRPEF.addizionaliRegionali), ")"],
                }),
              ],
            }),
          t.areaIRPEF.trattamentoIntegrativo !== 0 &&
            e.jsxs("div", {
              className: "flex justify-between",
              children: [
                e.jsx("span", {
                  className: "text-gray-600",
                  children: "Tratt. integrativo",
                }),
                e.jsx("span", {
                  className: "font-mono text-green-600",
                  children: d(t.areaIRPEF.trattamentoIntegrativo),
                }),
              ],
            }),
          e.jsxs("div", {
            className:
              "flex justify-between border-t border-gray-200 pt-2 font-bold",
            children: [
              e.jsx("span", { children: "NETTO" }),
              e.jsx("span", {
                className: "text-green-700",
                children: d(t.netPayment),
              }),
            ],
          }),
        ],
      }),
    ],
  });
}
function T({ settings: t, hasRSA: s, hasITUD: i, seniorityYears: o }) {
  const l = I(t.company || "RYR", t.role, t.rank);
  if (!l)
    return e.jsx("div", {
      className: "flex-1 overflow-y-auto p-6 flex items-center justify-center",
      children: e.jsx("p", {
        className: "text-sm text-gray-400",
        children: "Dati contrattuali non disponibili per questa qualifica.",
      }),
    });
  const n = t.parttime ? t.parttimePercentage : 1,
    p = t.cu ? O.cuReduction : 1,
    x = t.legacy
      ? t.legacyDirect
        ? t.legacyCustom.ffp
        : l.ffp + t.legacyDeltas.ffp
      : l.ffp,
    b = t.legacy
      ? t.legacyDirect
        ? t.legacyCustom.sbh
        : l.sbh + t.legacyDeltas.sbh
      : l.sbh,
    h = t.legacy
      ? t.legacyDirect
        ? t.legacyCustom.al
        : l.al + t.legacyDeltas.al
      : l.al,
    m = [
      { label: "Stipendio base", value: l.basic * n, unit: "/mese" },
      { label: "FFP", value: x * n * p, unit: "/mese" },
      { label: "SBH rate", value: b, unit: "/ora" },
      { label: "Ferie (AL)", value: h * n, unit: "/giorno" },
      { label: "Diaria", value: l.diaria, unit: "/giorno" },
      { label: "OOB", value: l.oob, unit: "/notte" },
    ];
  return (
    t.role === "pil" &&
      l.woff &&
      m.push({ label: "WOFF", value: l.woff, unit: "/giorno" }),
    l.allowance &&
      m.push({ label: "Allowance", value: l.allowance * n, unit: "/mese" }),
    s && l.rsa && m.push({ label: "RSA", value: l.rsa, unit: "/mese" }),
    i && l.itud && m.push({ label: "ITUD", value: l.itud, unit: "/giorno" }),
    e.jsxs("div", {
      className: "flex-1 overflow-y-auto p-6",
      children: [
        e.jsxs("div", {
          className: "flex items-center gap-3 mb-4 flex-wrap",
          children: [
            e.jsxs("h2", {
              className: "text-lg font-bold text-gray-900",
              children: ["Contratto CLA — ", t.rank.toUpperCase()],
            }),
            t.legacy &&
              e.jsx("span", {
                className:
                  "text-xs bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full",
                children: "Override legacy attivo",
              }),
            o !== null &&
              e.jsxs("span", {
                className:
                  "text-xs bg-indigo-100 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full",
                children: ["Anzianità: ", o, " anni"],
              }),
          ],
        }),
        (t.parttime || t.cu) &&
          e.jsxs("div", {
            className:
              "mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700 space-y-0.5",
            children: [
              t.parttime &&
                e.jsxs("div", {
                  children: [
                    "Part-time ",
                    (t.parttimePercentage * 100).toFixed(0),
                    "% applicato",
                  ],
                }),
              t.cu &&
                e.jsx("div", {
                  children:
                    "Riduzione nuovo comandante (CU) −10% applicata su FFP",
                }),
            ],
          }),
        e.jsx(g, {
          padding: "md",
          children: e.jsxs("table", {
            className: "w-full text-sm",
            children: [
              e.jsx("thead", {
                children: e.jsxs("tr", {
                  className: "border-b border-gray-200 text-left",
                  children: [
                    e.jsx("th", {
                      className:
                        "pb-2 pr-4 text-xs font-semibold text-gray-500 uppercase tracking-wide",
                      children: "Voce",
                    }),
                    e.jsx("th", {
                      className:
                        "pb-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide",
                      children: "Importo",
                    }),
                    e.jsx("th", {
                      className:
                        "pb-2 pl-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide",
                      children: "Unità",
                    }),
                  ],
                }),
              }),
              e.jsx("tbody", {
                className: "divide-y divide-gray-100",
                children: m.map((u) =>
                  e.jsxs(
                    "tr",
                    {
                      children: [
                        e.jsx("td", {
                          className: "py-2 pr-4 text-gray-700",
                          children: u.label,
                        }),
                        e.jsx("td", {
                          className:
                            "py-2 text-right font-mono font-medium text-gray-900",
                          children: d(u.value),
                        }),
                        e.jsx("td", {
                          className:
                            "py-2 pl-3 text-right text-xs text-gray-400 whitespace-nowrap",
                          children: u.unit,
                        }),
                      ],
                    },
                    u.label,
                  ),
                ),
              }),
            ],
          }),
        }),
      ],
    })
  );
}
function B({ settings: t }) {
  const [s, i] = j.useState(""),
    [o, l] = j.useState(""),
    n = I(t.company || "RYR", t.role, t.rank),
    p = t.parttime ? t.parttimePercentage : 1,
    x = n ? n.sbh * p : 0,
    b = n ? n.diaria : 0,
    h = parseFloat(s) || 0,
    m = parseFloat(o) || 0,
    u = x > 0 && h > 0 ? h / x : null,
    f =
      u !== null
        ? `${Math.floor(u).toString().padStart(2, "0")}:${Math.round(
            (u % 1) * 60,
          )
            .toString()
            .padStart(2, "0")}`
        : null,
    v = b > 0 && m > 0 ? m / b : null;
  return e.jsxs("div", {
    className: "flex-1 overflow-y-auto p-6 space-y-6",
    children: [
      e.jsx("h2", {
        className: "text-lg font-bold text-gray-900",
        children: "Calcolatore inverso",
      }),
      e.jsxs("div", {
        className: "grid grid-cols-1 md:grid-cols-2 gap-6",
        children: [
          e.jsxs(g, {
            padding: "md",
            children: [
              e.jsx("h3", {
                className:
                  "text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide",
                children: "Settori → Ore",
              }),
              e.jsx(r, {
                label: "Importo settori (€)",
                type: "number",
                min: 0,
                step: "0.01",
                placeholder: "es. 5000",
                value: s,
                onChange: (y) => i(y.target.value),
              }),
              f
                ? e.jsxs("div", {
                    className:
                      "mt-4 p-4 bg-green-50 border border-green-200 rounded-lg text-center",
                    children: [
                      e.jsx("div", {
                        className:
                          "text-xs text-green-600 font-medium uppercase tracking-wide mb-1",
                        children: "Ore equivalenti",
                      }),
                      e.jsx("div", {
                        className:
                          "text-3xl font-bold text-green-700 font-mono",
                        children: f,
                      }),
                      e.jsxs("div", {
                        className: "text-xs text-gray-500 mt-2",
                        children: ["Tariffa SBH: ", d(x), "/ora"],
                      }),
                    ],
                  })
                : !n &&
                  e.jsx("p", {
                    className: "text-xs text-gray-400 mt-2",
                    children: "Dati contrattuali non disponibili",
                  }),
            ],
          }),
          e.jsxs(g, {
            padding: "md",
            children: [
              e.jsx("h3", {
                className:
                  "text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide",
                children: "Diaria → Giorni",
              }),
              e.jsx(r, {
                label: "Importo diaria (€)",
                type: "number",
                min: 0,
                step: "0.01",
                placeholder: "es. 1500",
                value: o,
                onChange: (y) => l(y.target.value),
              }),
              v !== null
                ? e.jsxs("div", {
                    className:
                      "mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg text-center",
                    children: [
                      e.jsx("div", {
                        className:
                          "text-xs text-blue-600 font-medium uppercase tracking-wide mb-1",
                        children: "Giorni equivalenti",
                      }),
                      e.jsx("div", {
                        className: "text-3xl font-bold text-blue-700 font-mono",
                        children: v.toFixed(1),
                      }),
                      e.jsxs("div", {
                        className: "text-xs text-gray-500 mt-2",
                        children: ["Tariffa diaria: ", d(b), "/giorno"],
                      }),
                    ],
                  })
                : !n &&
                  e.jsx("p", {
                    className: "text-xs text-gray-400 mt-2",
                    children: "Dati contrattuali non disponibili",
                  }),
            ],
          }),
        ],
      }),
    ],
  });
}
function E({
  overrideITUD: t,
  setOverrideITUD: s,
  overrideRSA: i,
  setOverrideRSA: o,
}) {
  const l = (n, p) =>
    `text-xs px-2.5 py-1 rounded-lg font-medium border transition-colors ${n ? p : "text-gray-400 border-gray-200 hover:border-gray-300 hover:text-gray-600"}`;
  return e.jsxs("div", {
    className: "flex-1 overflow-y-auto p-6 space-y-4 max-w-lg",
    children: [
      e.jsx("h2", {
        className: "text-lg font-bold text-gray-900",
        children: "Override admin",
      }),
      e.jsx("div", {
        className:
          "p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700",
        children:
          'Gli override si applicano al prossimo calcolo (torna al tab Input e premi "Calcola"). Non vengono salvati.',
      }),
      e.jsxs(g, {
        padding: "md",
        children: [
          e.jsx("h3", {
            className:
              "text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide",
            children: "Flag utente",
          }),
          e.jsxs("div", {
            className: "space-y-4",
            children: [
              e.jsxs("div", {
                className: "flex items-center justify-between",
                children: [
                  e.jsxs("div", {
                    children: [
                      e.jsx("div", {
                        className: "text-sm font-medium text-gray-800",
                        children: "ITUD",
                      }),
                      e.jsx("div", {
                        className: "text-xs text-gray-400",
                        children: "Forza inclusione ITUD",
                      }),
                    ],
                  }),
                  e.jsxs("div", {
                    className: "flex items-center gap-1",
                    children: [
                      e.jsx("button", {
                        onClick: () => s(null),
                        className: l(
                          t === null,
                          "bg-gray-100 text-gray-700 border-gray-200",
                        ),
                        children: "Auto",
                      }),
                      e.jsx("button", {
                        onClick: () => s(!0),
                        className: l(
                          t === !0,
                          "bg-green-100 text-green-700 border-green-200",
                        ),
                        children: "Sì",
                      }),
                      e.jsx("button", {
                        onClick: () => s(!1),
                        className: l(
                          t === !1,
                          "bg-red-100 text-red-600 border-red-200",
                        ),
                        children: "No",
                      }),
                    ],
                  }),
                ],
              }),
              e.jsxs("div", {
                className: "flex items-center justify-between",
                children: [
                  e.jsxs("div", {
                    children: [
                      e.jsx("div", {
                        className: "text-sm font-medium text-gray-800",
                        children: "RSA",
                      }),
                      e.jsx("div", {
                        className: "text-xs text-gray-400",
                        children: "Forza inclusione RSA",
                      }),
                    ],
                  }),
                  e.jsxs("div", {
                    className: "flex items-center gap-1",
                    children: [
                      e.jsx("button", {
                        onClick: () => o(null),
                        className: l(
                          i === null,
                          "bg-gray-100 text-gray-700 border-gray-200",
                        ),
                        children: "Auto",
                      }),
                      e.jsx("button", {
                        onClick: () => o(!0),
                        className: l(
                          i === !0,
                          "bg-green-100 text-green-700 border-green-200",
                        ),
                        children: "Sì",
                      }),
                      e.jsx("button", {
                        onClick: () => o(!1),
                        className: l(
                          i === !1,
                          "bg-red-100 text-red-600 border-red-200",
                        ),
                        children: "No",
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      (t !== null || i !== null) &&
        e.jsxs("div", {
          className:
            "p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-700",
          children: [
            "Override attivo:",
            " ",
            t !== null && `ITUD = ${t ? "sì" : "no"}`,
            t !== null && i !== null && ", ",
            i !== null && `RSA = ${i ? "sì" : "no"}`,
          ],
        }),
    ],
  });
}
function M() {
  const t = P(),
    { user: s } = F(),
    i =
      (s == null ? void 0 : s.role) === w.ADMIN ||
      (s == null ? void 0 : s.role) === w.SUPERADMIN,
    [o, l] = j.useState("input"),
    [n, p] = j.useState(null),
    [x, b] = j.useState(null),
    h = ["fo", "cpt", "ltc", "sfi", "lcc", "tri", "tre", "so", "jfo"],
    m = ["ju", "jpu", "cc", "sepe", "sepi"],
    u = t.settings.role === "pil" ? h : m,
    f = j.useMemo(() => {
      var C;
      if (!s) return null;
      const a = D({
        gradeCode: (C = s.grade) == null ? void 0 : C.codice,
        dateOfEntry: s.dateOfEntry,
        dateOfCaptaincy: s.dateOfCaptaincy,
      });
      if (!a) return null;
      const N = new Date().toISOString().split("T")[0];
      return R(a, N);
    }, [s]),
    v = [
      { id: "input", label: "Input" },
      { id: "contract", label: "Contratto" },
      { id: "reverse", label: "Reverse" },
      ...(i ? [{ id: "override", label: "Override" }] : []),
    ],
    y = () => {
      var N;
      const a = {
        itud: n !== null ? n : s == null ? void 0 : s.itud,
        rsa: x !== null ? x : s == null ? void 0 : s.rsa,
        dateOfEntry: s == null ? void 0 : s.dateOfEntry,
        dateOfCaptaincy: s == null ? void 0 : s.dateOfCaptaincy,
        gradeCode:
          (N = s == null ? void 0 : s.grade) == null ? void 0 : N.codice,
      };
      t.calculate(a);
    },
    S = () =>
      e.jsxs("div", {
        className: "flex items-center gap-1 border-b border-gray-200 mb-0 pb-0",
        children: [
          v.map((a) =>
            e.jsx(
              "button",
              {
                onClick: () => l(a.id),
                className: `px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${o === a.id ? "border-[#177246] text-[#177246]" : "border-transparent text-gray-500 hover:text-gray-700"}`,
                children: a.label,
              },
              a.id,
            ),
          ),
          (n !== null || x !== null) &&
            e.jsx("span", {
              className:
                "ml-2 text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full",
              children: "Override",
            }),
        ],
      });
  return e.jsxs("div", {
    className: "flex h-full min-h-0",
    children: [
      e.jsxs("aside", {
        className:
          "w-64 flex-shrink-0 border-r border-gray-200 bg-white overflow-y-auto p-4 space-y-4",
        children: [
          e.jsx("h2", {
            className:
              "text-sm font-bold text-gray-700 uppercase tracking-wide",
            children: "Impostazioni",
          }),
          e.jsxs("div", {
            className: "space-y-3",
            children: [
              e.jsxs("div", {
                children: [
                  e.jsx("label", {
                    className: "text-xs font-medium text-gray-600 block mb-1",
                    children: "Ruolo",
                  }),
                  e.jsxs("select", {
                    value: t.settings.role,
                    onChange: (a) =>
                      t.setSettings({
                        role: a.target.value,
                        rank: a.target.value === "pil" ? "fo" : "cc",
                      }),
                    className:
                      "w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#177246]",
                    children: [
                      e.jsx("option", { value: "pil", children: "Pilota" }),
                      e.jsx("option", { value: "cc", children: "Cabin Crew" }),
                    ],
                  }),
                ],
              }),
              e.jsxs("div", {
                children: [
                  e.jsx("label", {
                    className: "text-xs font-medium text-gray-600 block mb-1",
                    children: "Qualifica",
                  }),
                  e.jsx("select", {
                    value: t.settings.rank,
                    onChange: (a) => t.setSettings({ rank: a.target.value }),
                    className:
                      "w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#177246]",
                    children: u.map((a) =>
                      e.jsx(
                        "option",
                        { value: a, children: a.toUpperCase() },
                        a,
                      ),
                    ),
                  }),
                ],
              }),
              e.jsxs("div", {
                children: [
                  e.jsx("label", {
                    className: "text-xs font-medium text-gray-600 block mb-1",
                    children: "Base",
                  }),
                  e.jsx("select", {
                    value: t.settings.base,
                    onChange: (a) => t.setSettings({ base: a.target.value }),
                    className:
                      "w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#177246]",
                    children: [
                      "BGY",
                      "FCO",
                      "MXP",
                      "NAP",
                      "PMO",
                      "CTA",
                      "BLQ",
                    ].map((a) => e.jsx("option", { value: a, children: a }, a)),
                  }),
                ],
              }),
              e.jsxs("div", {
                className: "flex items-center gap-2",
                children: [
                  e.jsx("input", {
                    type: "checkbox",
                    id: "parttime",
                    checked: t.settings.parttime,
                    onChange: (a) =>
                      t.setSettings({ parttime: a.target.checked }),
                    className:
                      "rounded border-gray-300 text-[#177246] focus:ring-[#177246]",
                  }),
                  e.jsx("label", {
                    htmlFor: "parttime",
                    className: "text-sm text-gray-700",
                    children: "Part-time",
                  }),
                ],
              }),
              t.settings.parttime &&
                e.jsxs("div", {
                  children: [
                    e.jsx("label", {
                      className: "text-xs font-medium text-gray-600 block mb-1",
                      children: "% Part-time",
                    }),
                    e.jsxs("select", {
                      value: t.settings.parttimePercentage,
                      onChange: (a) =>
                        t.setSettings({
                          parttimePercentage: Number(a.target.value),
                        }),
                      className:
                        "w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#177246]",
                      children: [
                        e.jsx("option", { value: 0.5, children: "50%" }),
                        e.jsx("option", { value: 0.6, children: "60%" }),
                        e.jsx("option", { value: 0.75, children: "75%" }),
                        e.jsx("option", { value: 0.8, children: "80%" }),
                        e.jsx("option", { value: 0.9, children: "90%" }),
                      ],
                    }),
                  ],
                }),
              e.jsxs("div", {
                className: "flex items-center gap-2",
                children: [
                  e.jsx("input", {
                    type: "checkbox",
                    id: "cu",
                    checked: t.settings.cu,
                    onChange: (a) => t.setSettings({ cu: a.target.checked }),
                    className:
                      "rounded border-gray-300 text-[#177246] focus:ring-[#177246]",
                  }),
                  e.jsx("label", {
                    htmlFor: "cu",
                    className: "text-xs text-gray-700",
                    children: "Nuovo comandante (CU -10%)",
                  }),
                ],
              }),
              e.jsxs("div", {
                className: "flex items-center gap-2",
                children: [
                  e.jsx("input", {
                    type: "checkbox",
                    id: "coniuge",
                    checked: t.settings.coniugeCarico,
                    onChange: (a) =>
                      t.setSettings({ coniugeCarico: a.target.checked }),
                    className:
                      "rounded border-gray-300 text-[#177246] focus:ring-[#177246]",
                  }),
                  e.jsx("label", {
                    htmlFor: "coniuge",
                    className: "text-xs text-gray-700",
                    children: "Coniuge a carico",
                  }),
                ],
              }),
              e.jsxs("div", {
                className: "flex items-center gap-2",
                children: [
                  e.jsx("input", {
                    type: "checkbox",
                    id: "btc",
                    checked: t.settings.btc,
                    onChange: (a) => t.setSettings({ btc: a.target.checked }),
                    className:
                      "rounded border-gray-300 text-[#177246] focus:ring-[#177246]",
                  }),
                  e.jsx("label", {
                    htmlFor: "btc",
                    className: "text-xs text-gray-700",
                    children: "Contratto BTC",
                  }),
                ],
              }),
              e.jsx("hr", { className: "border-gray-200" }),
              e.jsx("p", {
                className:
                  "text-xs font-medium text-gray-600 uppercase tracking-wide",
                children: "Imposte locali",
              }),
              e.jsx(r, {
                label: "Sindacato (€)",
                type: "number",
                value: t.settings.union,
                onChange: (a) =>
                  t.setSettings({ union: Number(a.target.value) }),
              }),
              e.jsx(r, {
                label: "Add. regionali (€)",
                type: "number",
                step: "0.01",
                value: t.settings.addRegionali,
                onChange: (a) =>
                  t.setSettings({ addRegionali: Number(a.target.value) }),
              }),
              e.jsx(r, {
                label: "Add. comunali (€)",
                type: "number",
                step: "0.01",
                value: t.settings.addComunali,
                onChange: (a) =>
                  t.setSettings({ addComunali: Number(a.target.value) }),
              }),
              e.jsx(r, {
                label: "Acconto add. comunali (€)",
                type: "number",
                step: "0.01",
                value: t.settings.accontoAddComunali,
                onChange: (a) =>
                  t.setSettings({ accontoAddComunali: Number(a.target.value) }),
              }),
            ],
          }),
        ],
      }),
      e.jsxs("div", {
        className: "flex-1 flex min-w-0 overflow-hidden",
        children: [
          e.jsxs("div", {
            className: "flex-1 flex flex-col min-w-0 overflow-hidden",
            children: [
              e.jsxs("div", {
                className:
                  "flex-shrink-0 px-6 pt-4 pb-0 bg-white border-b border-gray-200",
                children: [
                  e.jsxs("div", {
                    className: "flex items-center justify-between mb-3",
                    children: [
                      e.jsx("h1", {
                        className: "text-xl font-bold text-gray-900",
                        children: "Calcolatore Busta Paga",
                      }),
                      e.jsx(k, {
                        variant: "ghost",
                        size: "sm",
                        onClick: () => {
                          (t.reset(), p(null), b(null));
                        },
                        children: "Reset",
                      }),
                    ],
                  }),
                  e.jsx(S, {}),
                ],
              }),
              o === "input" &&
                e.jsxs("div", {
                  className: "flex-1 overflow-y-auto p-6 space-y-6",
                  children: [
                    e.jsxs(g, {
                      padding: "md",
                      children: [
                        e.jsx("h3", {
                          className:
                            "text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide",
                          children: "Dati di base",
                        }),
                        e.jsxs("div", {
                          className: "grid grid-cols-2 gap-4",
                          children: [
                            e.jsxs("div", {
                              children: [
                                e.jsx("label", {
                                  className:
                                    "text-xs font-medium text-gray-600 block mb-1",
                                  children: "Mese di riferimento",
                                }),
                                e.jsx("input", {
                                  type: "month",
                                  value: t.input.date.slice(0, 7),
                                  onChange: (a) =>
                                    t.setInput({
                                      date: a.target.value + "-01",
                                    }),
                                  className:
                                    "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#177246]",
                                }),
                              ],
                            }),
                            e.jsx(r, {
                              label: "SBH (HH:MM)",
                              placeholder: "85:00",
                              value: t.input.sbh,
                              onChange: (a) =>
                                t.setInput({ sbh: a.target.value }),
                            }),
                            e.jsx(r, {
                              label: "Giorni INPS",
                              type: "number",
                              min: 0,
                              max: 26,
                              value: t.input.inpsDays,
                              onChange: (a) =>
                                t.setInput({
                                  inpsDays: Number(a.target.value),
                                }),
                            }),
                          ],
                        }),
                      ],
                    }),
                    e.jsxs(g, {
                      padding: "md",
                      children: [
                        e.jsx("h3", {
                          className:
                            "text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide",
                          children: "Diarie e OOB",
                        }),
                        e.jsxs("div", {
                          className: "grid grid-cols-3 gap-4",
                          children: [
                            e.jsx(r, {
                              label: "Diaria volo (gg)",
                              type: "number",
                              min: 0,
                              value: t.input.flyDiaria,
                              onChange: (a) =>
                                t.setInput({
                                  flyDiaria: Number(a.target.value),
                                }),
                            }),
                            e.jsx(r, {
                              label: "Diaria no-fly (gg)",
                              type: "number",
                              min: 0,
                              value: t.input.noFlyDiaria,
                              onChange: (a) =>
                                t.setInput({
                                  noFlyDiaria: Number(a.target.value),
                                }),
                            }),
                            e.jsx(r, {
                              label: "Notti OOB",
                              type: "number",
                              min: 0,
                              value: t.input.oob,
                              onChange: (a) =>
                                t.setInput({ oob: Number(a.target.value) }),
                            }),
                            t.settings.role === "pil" &&
                              e.jsx(r, {
                                label: "Solo nazionali",
                                type: "number",
                                min: 0,
                                value: t.input.onlyNationalFly,
                                onChange: (a) =>
                                  t.setInput({
                                    onlyNationalFly: Number(a.target.value),
                                  }),
                              }),
                            t.settings.role === "cc" &&
                              e.jsx(r, {
                                label: "OOB non pianificati",
                                type: "number",
                                min: 0,
                                value: t.input.oobUnplanned,
                                onChange: (a) =>
                                  t.setInput({
                                    oobUnplanned: Number(a.target.value),
                                  }),
                              }),
                          ],
                        }),
                      ],
                    }),
                    e.jsxs(g, {
                      padding: "md",
                      children: [
                        e.jsx("h3", {
                          className:
                            "text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide",
                          children: "Assenze",
                        }),
                        e.jsxs("div", {
                          className: "grid grid-cols-3 gap-4",
                          children: [
                            e.jsx(r, {
                              label: "Ferie (gg)",
                              type: "number",
                              min: 0,
                              value: t.input.al,
                              onChange: (a) =>
                                t.setInput({ al: Number(a.target.value) }),
                            }),
                            e.jsx(r, {
                              label: "Aspettativa (gg)",
                              type: "number",
                              min: 0,
                              value: t.input.ul,
                              onChange: (a) =>
                                t.setInput({ ul: Number(a.target.value) }),
                            }),
                            e.jsx(r, {
                              label: "Congedo parentale (gg)",
                              type: "number",
                              min: 0,
                              value: t.input.parentalDays,
                              onChange: (a) =>
                                t.setInput({
                                  parentalDays: Number(a.target.value),
                                }),
                            }),
                            e.jsx(r, {
                              label: "Legge 104 (gg)",
                              type: "number",
                              min: 0,
                              value: t.input.days104,
                              onChange: (a) =>
                                t.setInput({ days104: Number(a.target.value) }),
                            }),
                            t.settings.role === "pil" &&
                              e.jsx(r, {
                                label: "WOFF",
                                type: "number",
                                min: 0,
                                value: t.input.woff,
                                onChange: (a) =>
                                  t.setInput({ woff: Number(a.target.value) }),
                              }),
                            t.settings.role === "cc" &&
                              e.jsx(r, {
                                label: "Festività (gg)",
                                type: "number",
                                min: 0,
                                value: t.input.bankHolydays,
                                onChange: (a) =>
                                  t.setInput({
                                    bankHolydays: Number(a.target.value),
                                  }),
                              }),
                          ],
                        }),
                      ],
                    }),
                    t.settings.role === "pil" &&
                      e.jsxs(g, {
                        padding: "md",
                        children: [
                          e.jsx("h3", {
                            className:
                              "text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide",
                            children: "Training / Simulatore",
                          }),
                          e.jsxs("div", {
                            className: "grid grid-cols-3 gap-4",
                            children: [
                              e.jsx(r, {
                                label: "Settori training",
                                type: "number",
                                min: 0,
                                value: t.input.trainingSectors,
                                onChange: (a) =>
                                  t.setInput({
                                    trainingSectors: Number(a.target.value),
                                  }),
                              }),
                              e.jsx(r, {
                                label: "Giorni sim",
                                type: "number",
                                min: 0,
                                value: t.input.simDays,
                                onChange: (a) =>
                                  t.setInput({
                                    simDays: Number(a.target.value),
                                  }),
                              }),
                            ],
                          }),
                        ],
                      }),
                    e.jsxs(g, {
                      padding: "md",
                      children: [
                        e.jsx("h3", {
                          className:
                            "text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide",
                          children: "Altri campi",
                        }),
                        e.jsxs("div", {
                          className: "grid grid-cols-3 gap-4",
                          children: [
                            e.jsx(r, {
                              label: "ITUD (gg)",
                              type: "number",
                              min: 0,
                              value: t.input.itud,
                              onChange: (a) =>
                                t.setInput({ itud: Number(a.target.value) }),
                            }),
                            e.jsx(r, {
                              label: "Pregresso IRPEF (€)",
                              type: "number",
                              step: "0.01",
                              value: t.input.pregressoIrpef,
                              onChange: (a) =>
                                t.setInput({
                                  pregressoIrpef: Number(a.target.value),
                                }),
                            }),
                            t.settings.role === "cc" &&
                              e.jsx(r, {
                                label: "Commissioni (€)",
                                type: "number",
                                step: "0.01",
                                value: t.input.commissions,
                                onChange: (a) =>
                                  t.setInput({
                                    commissions: Number(a.target.value),
                                  }),
                              }),
                          ],
                        }),
                      ],
                    }),
                    e.jsx("div", {
                      className: "flex gap-3",
                      children: e.jsxs(k, {
                        onClick: y,
                        loading: t.isCalculating,
                        size: "lg",
                        fullWidth: !0,
                        children: [
                          "Calcola busta paga",
                          (n !== null || x !== null) &&
                            e.jsx("span", {
                              className: "ml-2 text-xs opacity-75",
                              children: "(con override)",
                            }),
                        ],
                      }),
                    }),
                    t.error &&
                      e.jsx("div", {
                        className:
                          "rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700",
                        children: t.error,
                      }),
                  ],
                }),
              o === "contract" &&
                e.jsx(T, {
                  settings: t.settings,
                  hasRSA: (s == null ? void 0 : s.rsa) ?? !1,
                  hasITUD: (s == null ? void 0 : s.itud) ?? !1,
                  seniorityYears: f,
                }),
              o === "reverse" && e.jsx(B, { settings: t.settings }),
              o === "override" &&
                i &&
                e.jsx(E, {
                  overrideITUD: n,
                  setOverrideITUD: p,
                  overrideRSA: x,
                  setOverrideRSA: b,
                }),
            ],
          }),
          o === "input" &&
            e.jsxs("div", {
              className:
                "w-[352px] flex-shrink-0 border-l border-gray-200 bg-white overflow-y-auto p-5",
              children: [
                e.jsx("h2", {
                  className:
                    "text-sm font-bold text-gray-700 uppercase tracking-wide mb-4",
                  children: "Risultati",
                }),
                t.result
                  ? e.jsx(A, { result: t.result })
                  : e.jsxs("div", {
                      className:
                        "flex flex-col items-center justify-center h-48 text-gray-400",
                      children: [
                        e.jsx("div", {
                          className: "text-4xl mb-3",
                          children: "💰",
                        }),
                        e.jsxs("p", {
                          className: "text-sm",
                          children: [
                            "Inserisci i dati e premi",
                            e.jsx("br", {}),
                            "«Calcola» per vedere i risultati",
                          ],
                        }),
                      ],
                    }),
              ],
            }),
        ],
      }),
    ],
  });
}
export { M as PayslipPage };
