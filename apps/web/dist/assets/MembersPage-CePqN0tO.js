import {
  Q as je,
  i as de,
  h as ve,
  b as Ne,
  d as we,
  e as T,
  u as ke,
  U as V,
  f as Ce,
  g as Pe,
  r as o,
  k as K,
  j as e,
  R as j,
  X as W,
  l as Ie,
  m as _,
  M as Se,
  n as Re,
  A as ze,
} from "./index-DFehVeka.js";
import { b as Ee, c as Ae, g as Me } from "./references-o1kGQSUn.js";
import { P as Fe } from "./plus-CDecntoB.js";
import { U as Be } from "./upload-B89mvuMj.js";
import { D as Oe } from "./download-Ci9Ep0F2.js";
import { S as Te } from "./search-CAlZuJmR.js";
import { M as Le, P as Ue, C as B } from "./phone-B0_M_i75.js";
import { C as $e } from "./chevron-down-Dve3aoGY.js";
var qe = class extends je {
  constructor(t, r) {
    super(t, r);
  }
  bindMethods() {
    (super.bindMethods(),
      (this.fetchNextPage = this.fetchNextPage.bind(this)),
      (this.fetchPreviousPage = this.fetchPreviousPage.bind(this)));
  }
  setOptions(t) {
    super.setOptions({ ...t, behavior: de() });
  }
  getOptimisticResult(t) {
    return ((t.behavior = de()), super.getOptimisticResult(t));
  }
  fetchNextPage(t) {
    return this.fetch({ ...t, meta: { fetchMore: { direction: "forward" } } });
  }
  fetchPreviousPage(t) {
    return this.fetch({ ...t, meta: { fetchMore: { direction: "backward" } } });
  }
  createResult(t, r) {
    var f, I;
    const { state: l } = t,
      d = super.createResult(t, r),
      { isFetching: g, isRefetching: v, isError: c, isRefetchError: m } = d,
      N =
        (I = (f = l.fetchMeta) == null ? void 0 : f.fetchMore) == null
          ? void 0
          : I.direction,
      z = c && N === "forward",
      k = g && N === "forward",
      E = c && N === "backward",
      p = g && N === "backward";
    return {
      ...d,
      fetchNextPage: this.fetchNextPage,
      fetchPreviousPage: this.fetchPreviousPage,
      hasNextPage: Ne(r, l.data),
      hasPreviousPage: ve(r, l.data),
      isFetchNextPageError: z,
      isFetchingNextPage: k,
      isFetchPreviousPageError: E,
      isFetchingPreviousPage: p,
      isRefetchError: m && !z && !E,
      isRefetching: v && !k && !p,
    };
  }
};
function De(t, r) {
  return we(t, qe);
}
/**
 * @license lucide-react v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const Qe = T("ArrowRight", [
  ["path", { d: "M5 12h14", key: "1ays0h" }],
  ["path", { d: "m12 5 7 7-7 7", key: "xquz4c" }],
]);
/**
 * @license lucide-react v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const Ge = T("ChevronUp", [
  ["path", { d: "m18 15-6-6-6 6", key: "153udz" }],
]);
/**
 * @license lucide-react v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const Ke = T("ChevronsUpDown", [
  ["path", { d: "m7 15 5 5 5-5", key: "1hf1tw" }],
  ["path", { d: "m7 9 5-5 5 5", key: "sgt6xg" }],
]);
/**
 * @license lucide-react v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const _e = T("SlidersHorizontal", [
    ["line", { x1: "21", x2: "14", y1: "4", y2: "4", key: "obuewd" }],
    ["line", { x1: "10", x2: "3", y1: "4", y2: "4", key: "1q6298" }],
    ["line", { x1: "21", x2: "12", y1: "12", y2: "12", key: "1iu8h1" }],
    ["line", { x1: "8", x2: "3", y1: "12", y2: "12", key: "ntss68" }],
    ["line", { x1: "21", x2: "16", y1: "20", y2: "20", key: "14d8ph" }],
    ["line", { x1: "12", x2: "3", y1: "20", y2: "20", key: "m0wm8r" }],
    ["line", { x1: "14", x2: "14", y1: "2", y2: "6", key: "14e1ph" }],
    ["line", { x1: "8", x2: "8", y1: "10", y2: "14", key: "1i6ji0" }],
    ["line", { x1: "16", x2: "16", y1: "18", y2: "22", key: "1lctlv" }],
  ]),
  xe = 25,
  ue = (t) =>
    t === j.PILOT ? "Pilota" : t === j.CABIN_CREW ? "Cabin Crew" : "—",
  he = (t) =>
    t === j.PILOT
      ? "bg-blue-50 text-blue-700 border border-blue-200"
      : t === j.CABIN_CREW
        ? "bg-purple-50 text-purple-700 border border-purple-200"
        : "bg-gray-100 text-gray-400",
  O = (t) =>
    t
      ? new Date(t).toLocaleDateString("it-IT", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      : "—";
function Ve({ col: t, active: r, dir: l }) {
  return r
    ? l === "asc"
      ? e.jsx(Ge, { size: 13, className: "text-[#177246] ml-0.5" })
      : e.jsx($e, { size: 13, className: "text-[#177246] ml-0.5" })
    : e.jsx(Ke, { size: 13, className: "text-gray-300 ml-0.5" });
}
function P({ label: t, col: r, sort: l, onSort: d }) {
  return e.jsx("th", {
    className:
      "text-left px-4 py-3 font-medium text-gray-600 text-xs uppercase tracking-wide cursor-pointer select-none whitespace-nowrap hover:text-gray-900 transition-colors group",
    onClick: () => d(r),
    children: e.jsxs("span", {
      className: "inline-flex items-center gap-0.5",
      children: [t, e.jsx(Ve, { col: r, active: l.key === r, dir: l.dir })],
    }),
  });
}
function We({ nome: t, cognome: r }) {
  return e.jsxs("div", {
    className:
      "w-8 h-8 rounded-full bg-[#177246]/10 text-[#177246] flex items-center justify-center font-semibold text-xs flex-shrink-0",
    children: [t == null ? void 0 : t[0], r == null ? void 0 : r[0]],
  });
}
function h({ icon: t, label: r, value: l }) {
  return l
    ? e.jsxs("div", {
        className:
          "flex gap-3 items-start py-2 border-b border-gray-50 last:border-0",
        children: [
          e.jsx("span", {
            className: "text-gray-400 mt-0.5 flex-shrink-0",
            children: t,
          }),
          e.jsxs("div", {
            className: "min-w-0",
            children: [
              e.jsx("p", {
                className: "text-[11px] text-gray-400 uppercase tracking-wide",
                children: r,
              }),
              e.jsx("p", {
                className: "text-sm text-gray-800 mt-0.5 break-words",
                children: l,
              }),
            ],
          }),
        ],
      })
    : null;
}
function He({ member: t, onClose: r }) {
  var l, d, g, v;
  return (
    o.useEffect(() => {
      const c = (m) => {
        m.key === "Escape" && r();
      };
      return (
        window.addEventListener("keydown", c),
        () => window.removeEventListener("keydown", c)
      );
    }, [r]),
    e.jsxs("div", {
      className:
        "flex flex-col h-full bg-white border-l border-gray-200 overflow-hidden",
      children: [
        e.jsxs("div", {
          className:
            "flex items-start justify-between p-5 border-b border-gray-100 flex-shrink-0",
          children: [
            e.jsxs("div", {
              className: "flex items-center gap-3 min-w-0",
              children: [
                e.jsxs("div", {
                  className:
                    "w-12 h-12 rounded-2xl bg-[#177246]/10 text-[#177246] flex items-center justify-center text-lg font-bold flex-shrink-0",
                  children: [
                    (l = t.nome) == null ? void 0 : l[0],
                    (d = t.cognome) == null ? void 0 : d[0],
                  ],
                }),
                e.jsxs("div", {
                  className: "min-w-0",
                  children: [
                    e.jsxs("h2", {
                      className: "font-bold text-gray-900 truncate",
                      children: [t.nome, " ", t.cognome],
                    }),
                    e.jsx("p", {
                      className: "text-xs font-mono text-gray-500 mt-0.5",
                      children: t.crewcode,
                    }),
                  ],
                }),
              ],
            }),
            e.jsx("button", {
              onClick: r,
              className:
                "text-gray-400 hover:text-gray-600 p-1 flex-shrink-0 mt-0.5",
              children: e.jsx(W, { size: 18 }),
            }),
          ],
        }),
        e.jsx("div", {
          className:
            "flex flex-wrap gap-1.5 px-5 py-3 border-b border-gray-100 flex-shrink-0",
          children: [
            t.role === V.SUPERADMIN
              ? { l: "SuperAdmin", c: "bg-red-100 text-red-700" }
              : t.role === V.ADMIN
                ? { l: "Admin", c: "bg-amber-100 text-amber-700" }
                : null,
            t.ruolo ? { l: ue(t.ruolo), c: he(t.ruolo) } : null,
            t.grade
              ? {
                  l: t.grade.nome,
                  c: "bg-green-50 text-green-700 border border-green-200",
                }
              : null,
            t.isActive
              ? null
              : { l: "Disattivato", c: "bg-red-100 text-red-700" },
            t.itud ? { l: "ITUD", c: "bg-indigo-100 text-indigo-700" } : null,
            t.rsa ? { l: "RSA", c: "bg-cyan-100 text-cyan-700" } : null,
          ]
            .filter(Boolean)
            .map((c, m) =>
              e.jsx(
                "span",
                {
                  className: `text-xs font-medium px-2 py-0.5 rounded-full ${c.c}`,
                  children: c.l,
                },
                m,
              ),
            ),
        }),
        e.jsxs("div", {
          className: "flex-1 overflow-y-auto px-5 py-3",
          children: [
            e.jsxs("div", {
              className: "space-y-0",
              children: [
                e.jsx(h, {
                  icon: e.jsx(Le, { size: 14 }),
                  label: "Email",
                  value: t.email,
                }),
                e.jsx(h, {
                  icon: e.jsx(Ue, { size: 14 }),
                  label: "Telefono",
                  value: t.telefono,
                }),
                e.jsx(h, {
                  icon: e.jsx(Se, { size: 14 }),
                  label: "Base",
                  value: t.base ? `${t.base.codice} – ${t.base.nome}` : null,
                }),
                e.jsx(h, {
                  icon: e.jsx(Re, { size: 14 }),
                  label: "Contratto",
                  value: (g = t.contratto) == null ? void 0 : g.nome,
                }),
                e.jsx(h, {
                  icon: e.jsx(ze, { size: 14 }),
                  label: "Grado",
                  value: (v = t.grade) == null ? void 0 : v.nome,
                }),
                e.jsx(h, {
                  icon: e.jsx(B, { size: 14 }),
                  label: "Iscrizione",
                  value: O(t.dataIscrizione),
                }),
                e.jsx(h, {
                  icon: e.jsx(B, { size: 14 }),
                  label: "Ingresso",
                  value: O(t.dateOfEntry),
                }),
                e.jsx(h, {
                  icon: e.jsx(B, { size: 14 }),
                  label: "Capitano dal",
                  value: O(t.dateOfCaptaincy),
                }),
                e.jsx(h, {
                  icon: e.jsx(B, { size: 14 }),
                  label: "Registrato",
                  value: O(t.createdAt),
                }),
              ],
            }),
            t.note &&
              e.jsxs("div", {
                className: "mt-4 p-3 bg-gray-50 rounded-xl",
                children: [
                  e.jsx("p", {
                    className:
                      "text-[11px] uppercase tracking-wide text-gray-400 mb-1",
                    children: "Note",
                  }),
                  e.jsx("p", {
                    className: "text-sm text-gray-700 whitespace-pre-wrap",
                    children: t.note,
                  }),
                ],
              }),
          ],
        }),
      ],
    })
  );
}
function at() {
  var re;
  const t = ke((s) => s.user),
    r = (t == null ? void 0 : t.role) === V.SUPERADMIN,
    l = Ce(),
    d = Pe(),
    [g, v] = o.useState(""),
    [c, m] = o.useState(""),
    N = o.useMemo(() => ({ timer: 0 }), []),
    z = (s) => {
      (v(s),
        clearTimeout(N.timer),
        (N.timer = window.setTimeout(() => m(s), 300)));
    },
    [k, E] = o.useState(!1),
    [p, L] = o.useState(),
    [f, I] = o.useState(),
    [S, H] = o.useState(),
    [A, X] = o.useState(),
    [x, ge] = o.useState({ key: "cognome", dir: "asc" }),
    C = (s) =>
      ge((a) => ({
        key: s,
        dir: a.key === s && a.dir === "asc" ? "desc" : "asc",
      })),
    [y, J] = o.useState(null),
    Y = o.useMemo(
      () => ({
        search: c || void 0,
        ruolo: p,
        baseId: f,
        contrattoId: S,
        gradeId: A,
      }),
      [c, p, f, S, A],
    ),
    { data: U } = K({ queryKey: ["bases"], queryFn: Ee.getBases }),
    { data: $ } = K({ queryKey: ["contracts"], queryFn: Ae.getContracts }),
    { data: q } = K({ queryKey: ["grades"], queryFn: Me.getGrades }),
    {
      data: w,
      isLoading: D,
      isFetchingNextPage: Z,
      hasNextPage: me,
      fetchNextPage: pe,
    } = De({
      queryKey: ["users", Y],
      queryFn: ({ pageParam: s = 1 }) =>
        _.getUsersPaginated({ page: s, perPage: xe, ...Y }),
      getNextPageParam: (s) => {
        const a = Math.ceil(s.total / xe);
        return s.page < a ? s.page + 1 : void 0;
      },
      initialPageParam: 1,
    }),
    ee = o.useMemo(
      () => (w == null ? void 0 : w.pages.flatMap((s) => s.data)) ?? [],
      [w],
    ),
    Q =
      ((re = w == null ? void 0 : w.pages[0]) == null ? void 0 : re.total) ?? 0,
    R = o.useMemo(() => {
      const s = [...ee];
      return (
        s.sort((a, n) => {
          var ae, oe, le, ne, ie, ce;
          let i = "",
            b = "";
          switch (x.key) {
            case "nome":
              ((i = a.nome ?? ""), (b = n.nome ?? ""));
              break;
            case "cognome":
              ((i = a.cognome ?? ""), (b = n.cognome ?? ""));
              break;
            case "ruolo":
              ((i = a.ruolo ?? ""), (b = n.ruolo ?? ""));
              break;
            case "base":
              ((i = ((ae = a.base) == null ? void 0 : ae.codice) ?? ""),
                (b = ((oe = n.base) == null ? void 0 : oe.codice) ?? ""));
              break;
            case "grade":
              ((i = ((le = a.grade) == null ? void 0 : le.nome) ?? ""),
                (b = ((ne = n.grade) == null ? void 0 : ne.nome) ?? ""));
              break;
            case "contratto":
              ((i = ((ie = a.contratto) == null ? void 0 : ie.nome) ?? ""),
                (b = ((ce = n.contratto) == null ? void 0 : ce.nome) ?? ""));
              break;
          }
          return x.dir === "asc"
            ? i.localeCompare(b, "it")
            : b.localeCompare(i, "it");
        }),
        s
      );
    }, [ee, x]),
    M = [p, f, S, A].filter(Boolean).length,
    fe = () => {
      (L(void 0), I(void 0), H(void 0), X(void 0));
    },
    ye = async () => {
      try {
        const s = await _.exportCsv({ ruolo: p, baseId: f, contrattoId: S }),
          a = new Blob([s], { type: "text/csv;charset=utf-8;" }),
          n = URL.createObjectURL(a);
        (Object.assign(document.createElement("a"), {
          href: n,
          download: "soci.csv",
        }).click(),
          URL.revokeObjectURL(n));
      } catch {
        alert("Errore esportazione CSV");
      }
    },
    F = o.useRef(null),
    [u, G] = o.useState(null),
    [te, se] = o.useState(!1),
    be = async (s) => {
      var n;
      const a = (n = s.target.files) == null ? void 0 : n[0];
      if (a) {
        (se(!0), G(null));
        try {
          const i = await _.bulkImport(a);
          (G(i), d.invalidateQueries({ queryKey: ["members"] }));
        } catch {
          alert("Errore durante l'importazione");
        } finally {
          (se(!1), F.current && (F.current.value = ""));
        }
      }
    };
  return e.jsxs("div", {
    className: "flex h-full overflow-hidden",
    children: [
      e.jsx("div", {
        className: "flex-1 flex flex-col overflow-hidden min-w-0",
        children: e.jsxs("div", {
          className: "flex-1 overflow-y-auto p-6",
          children: [
            e.jsxs("div", {
              className: "flex items-center justify-between mb-5",
              children: [
                e.jsxs("div", {
                  children: [
                    e.jsxs("div", {
                      className: "flex items-center gap-2",
                      children: [
                        e.jsx("h1", {
                          className: "text-xl font-bold text-gray-900",
                          children: "Soci",
                        }),
                        !r &&
                          (t == null ? void 0 : t.ruolo) &&
                          e.jsx("span", {
                            className: `text-xs font-medium px-2 py-0.5 rounded-full ${t.ruolo === j.PILOT ? "bg-blue-50 text-blue-700 border border-blue-200" : "bg-purple-50 text-purple-700 border border-purple-200"}`,
                            children:
                              t.ruolo === j.PILOT ? "Piloti" : "Cabin Crew",
                          }),
                      ],
                    }),
                    e.jsxs("p", {
                      className: "text-sm text-gray-500 mt-0.5",
                      children: [
                        D ? "…" : `${Q} iscritti`,
                        R.length !== Q && !D && ` · ${R.length} caricati`,
                      ],
                    }),
                  ],
                }),
                e.jsxs("div", {
                  className: "flex items-center gap-2",
                  children: [
                    e.jsxs("button", {
                      onClick: () => l("/members/new"),
                      className:
                        "flex items-center gap-2 px-3 py-2 text-sm font-medium bg-[#177246] text-white rounded-lg hover:bg-[#177246]/90 transition-colors",
                      children: [e.jsx(Fe, { size: 15 }), " Nuovo socio"],
                    }),
                    e.jsxs("button", {
                      onClick: () => {
                        var s;
                        return (s = F.current) == null ? void 0 : s.click();
                      },
                      disabled: te,
                      className:
                        "flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50",
                      children: [
                        e.jsx(Be, { size: 15 }),
                        " ",
                        te ? "Importazione…" : "Importa CSV",
                      ],
                    }),
                    e.jsx("input", {
                      ref: F,
                      type: "file",
                      accept: ".csv,.xlsx,.xls",
                      className: "hidden",
                      onChange: be,
                    }),
                    e.jsxs("button", {
                      onClick: ye,
                      className:
                        "flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors",
                      children: [e.jsx(Oe, { size: 15 }), " Esporta CSV"],
                    }),
                  ],
                }),
              ],
            }),
            u &&
              e.jsxs("div", {
                className: `mb-4 p-3 rounded-lg border text-sm flex items-start justify-between gap-3 ${u.errors.length === 0 ? "bg-green-50 border-green-200 text-green-800" : "bg-amber-50 border-amber-200 text-amber-800"}`,
                children: [
                  e.jsxs("div", {
                    children: [
                      e.jsxs("div", {
                        className: "font-medium",
                        children: [
                          "Importazione completata: ",
                          u.created,
                          " soci creati",
                          u.errors.length > 0 && `, ${u.errors.length} errori`,
                        ],
                      }),
                      u.errors.length > 0 &&
                        e.jsxs("ul", {
                          className: "mt-1 text-xs space-y-0.5",
                          children: [
                            u.errors
                              .slice(0, 5)
                              .map((s, a) =>
                                e.jsxs(
                                  "li",
                                  {
                                    children: ["Riga ", s.row, ": ", s.message],
                                  },
                                  a,
                                ),
                              ),
                            u.errors.length > 5 &&
                              e.jsxs("li", {
                                children: [
                                  "… e altri ",
                                  u.errors.length - 5,
                                  " errori",
                                ],
                              }),
                          ],
                        }),
                    ],
                  }),
                  e.jsx("button", {
                    onClick: () => G(null),
                    className:
                      "text-gray-400 hover:text-gray-600 flex-shrink-0",
                    children: e.jsx(W, { size: 14 }),
                  }),
                ],
              }),
            e.jsxs("div", {
              className: "flex gap-2 mb-3",
              children: [
                e.jsxs("div", {
                  className: "relative flex-1 max-w-sm",
                  children: [
                    e.jsx(Te, {
                      size: 15,
                      className:
                        "absolute left-3 top-1/2 -translate-y-1/2 text-gray-400",
                    }),
                    e.jsx("input", {
                      value: g,
                      onChange: (s) => z(s.target.value),
                      placeholder: "Cerca nome, cognome, crewcode…",
                      className:
                        "w-full pl-9 pr-9 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#177246]/25 focus:border-[#177246]",
                    }),
                    g &&
                      e.jsx("button", {
                        onClick: () => {
                          (v(""), m(""));
                        },
                        className:
                          "absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600",
                        children: e.jsx(W, { size: 14 }),
                      }),
                  ],
                }),
                e.jsxs("button", {
                  onClick: () => E(!k),
                  className: `relative flex items-center gap-2 px-3 py-2 text-sm font-medium border rounded-lg transition-colors ${k || M > 0 ? "bg-[#177246] text-white border-[#177246]" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"}`,
                  children: [
                    e.jsx(_e, { size: 15 }),
                    "Filtri",
                    M > 0 &&
                      e.jsx("span", {
                        className:
                          "w-4 h-4 bg-white/30 text-white text-[10px] rounded-full flex items-center justify-center leading-none",
                        children: M,
                      }),
                  ],
                }),
              ],
            }),
            k &&
              e.jsxs("div", {
                className:
                  "bg-white border border-gray-200 rounded-xl p-4 mb-4 grid grid-cols-2 md:grid-cols-4 gap-3",
                children: [
                  r &&
                    e.jsxs("div", {
                      children: [
                        e.jsx("label", {
                          className:
                            "block text-xs font-medium text-gray-500 mb-1",
                          children: "Ruolo",
                        }),
                        e.jsxs("select", {
                          value: p ?? "",
                          onChange: (s) => L(s.target.value || void 0),
                          className:
                            "w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#177246]/25",
                          children: [
                            e.jsx("option", { value: "", children: "Tutti" }),
                            e.jsx("option", {
                              value: j.PILOT,
                              children: "Piloti",
                            }),
                            e.jsx("option", {
                              value: j.CABIN_CREW,
                              children: "Cabin Crew",
                            }),
                          ],
                        }),
                      ],
                    }),
                  e.jsxs("div", {
                    children: [
                      e.jsx("label", {
                        className:
                          "block text-xs font-medium text-gray-500 mb-1",
                        children: "Base",
                      }),
                      e.jsxs("select", {
                        value: f ?? "",
                        onChange: (s) => I(s.target.value || void 0),
                        className:
                          "w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#177246]/25",
                        children: [
                          e.jsx("option", { value: "", children: "Tutte" }),
                          U == null
                            ? void 0
                            : U.map((s) =>
                                e.jsxs(
                                  "option",
                                  {
                                    value: s.id,
                                    children: [s.codice, " – ", s.nome],
                                  },
                                  s.id,
                                ),
                              ),
                        ],
                      }),
                    ],
                  }),
                  e.jsxs("div", {
                    children: [
                      e.jsx("label", {
                        className:
                          "block text-xs font-medium text-gray-500 mb-1",
                        children: "Contratto",
                      }),
                      e.jsxs("select", {
                        value: S ?? "",
                        onChange: (s) => H(s.target.value || void 0),
                        className:
                          "w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#177246]/25",
                        children: [
                          e.jsx("option", { value: "", children: "Tutti" }),
                          $ == null
                            ? void 0
                            : $.map((s) =>
                                e.jsx(
                                  "option",
                                  { value: s.id, children: s.nome },
                                  s.id,
                                ),
                              ),
                        ],
                      }),
                    ],
                  }),
                  e.jsxs("div", {
                    children: [
                      e.jsx("label", {
                        className:
                          "block text-xs font-medium text-gray-500 mb-1",
                        children: "Grado",
                      }),
                      e.jsxs("select", {
                        value: A ?? "",
                        onChange: (s) => X(s.target.value || void 0),
                        className:
                          "w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#177246]/25",
                        children: [
                          e.jsx("option", { value: "", children: "Tutti" }),
                          q == null
                            ? void 0
                            : q.map((s) =>
                                e.jsx(
                                  "option",
                                  { value: s.id, children: s.nome },
                                  s.id,
                                ),
                              ),
                        ],
                      }),
                    ],
                  }),
                  M > 0 &&
                    e.jsx("div", {
                      className: "col-span-full",
                      children: e.jsx("button", {
                        onClick: fe,
                        className: "text-xs text-red-500 hover:underline",
                        children: "Rimuovi filtri",
                      }),
                    }),
                ],
              }),
            e.jsx("div", {
              className:
                "bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm",
              children: D
                ? e.jsx("div", {
                    className: "flex items-center justify-center py-16",
                    children: e.jsx("div", {
                      className:
                        "w-7 h-7 border-4 border-[#177246] border-t-transparent rounded-full animate-spin",
                    }),
                  })
                : R.length === 0
                  ? e.jsxs("div", {
                      className:
                        "flex flex-col items-center py-16 text-gray-400",
                      children: [
                        e.jsx(Ie, { size: 36, className: "mb-2 opacity-30" }),
                        e.jsx("p", {
                          className: "text-sm",
                          children: "Nessun socio trovato",
                        }),
                      ],
                    })
                  : e.jsxs(e.Fragment, {
                      children: [
                        e.jsx("div", {
                          className: "overflow-x-auto",
                          children: e.jsxs("table", {
                            className: "w-full text-sm",
                            children: [
                              e.jsx("thead", {
                                className:
                                  "bg-gray-50 border-b border-gray-200",
                                children: e.jsxs("tr", {
                                  children: [
                                    e.jsx(P, {
                                      label: "Cognome",
                                      col: "cognome",
                                      sort: x,
                                      onSort: C,
                                    }),
                                    e.jsx(P, {
                                      label: "Nome",
                                      col: "nome",
                                      sort: x,
                                      onSort: C,
                                    }),
                                    e.jsx(P, {
                                      label: "Ruolo",
                                      col: "ruolo",
                                      sort: x,
                                      onSort: C,
                                    }),
                                    e.jsx(P, {
                                      label: "Grado",
                                      col: "grade",
                                      sort: x,
                                      onSort: C,
                                    }),
                                    e.jsx(P, {
                                      label: "Base",
                                      col: "base",
                                      sort: x,
                                      onSort: C,
                                    }),
                                    e.jsx(P, {
                                      label: "Contratto",
                                      col: "contratto",
                                      sort: x,
                                      onSort: C,
                                    }),
                                    e.jsx("th", { className: "px-4 py-3" }),
                                  ],
                                }),
                              }),
                              e.jsx("tbody", {
                                className: "divide-y divide-gray-100",
                                children: R.map((s) => {
                                  var a, n, i;
                                  return e.jsxs(
                                    "tr",
                                    {
                                      onClick: () => J(s),
                                      className: `cursor-pointer transition-colors hover:bg-[#177246]/4 ${(y == null ? void 0 : y.id) === s.id ? "bg-[#177246]/8" : ""}`,
                                      children: [
                                        e.jsx("td", {
                                          className: "px-4 py-3",
                                          children: e.jsxs("div", {
                                            className:
                                              "flex items-center gap-3",
                                            children: [
                                              e.jsx(We, {
                                                nome: s.nome,
                                                cognome: s.cognome,
                                              }),
                                              e.jsx("span", {
                                                className:
                                                  "font-medium text-gray-900",
                                                children: s.cognome,
                                              }),
                                            ],
                                          }),
                                        }),
                                        e.jsx("td", {
                                          className: "px-4 py-3 text-gray-700",
                                          children: s.nome,
                                        }),
                                        e.jsx("td", {
                                          className: "px-4 py-3",
                                          children: e.jsx("span", {
                                            className: `text-xs font-medium px-2 py-0.5 rounded-full ${he(s.ruolo)}`,
                                            children: ue(s.ruolo),
                                          }),
                                        }),
                                        e.jsx("td", {
                                          className:
                                            "px-4 py-3 text-gray-600 text-sm",
                                          children:
                                            ((a = s.grade) == null
                                              ? void 0
                                              : a.nome) ?? "—",
                                        }),
                                        e.jsx("td", {
                                          className:
                                            "px-4 py-3 font-mono text-gray-500 text-xs",
                                          children:
                                            ((n = s.base) == null
                                              ? void 0
                                              : n.codice) ?? "—",
                                        }),
                                        e.jsx("td", {
                                          className:
                                            "px-4 py-3 text-gray-500 text-xs truncate max-w-[120px]",
                                          children:
                                            ((i = s.contratto) == null
                                              ? void 0
                                              : i.nome) ?? "—",
                                        }),
                                        e.jsx("td", {
                                          className: "px-4 py-3 text-right",
                                          children: e.jsx(Qe, {
                                            size: 15,
                                            className: `transition-colors ${(y == null ? void 0 : y.id) === s.id ? "text-[#177246]" : "text-gray-300"}`,
                                          }),
                                        }),
                                      ],
                                    },
                                    s.id,
                                  );
                                }),
                              }),
                            ],
                          }),
                        }),
                        me &&
                          e.jsx("div", {
                            className:
                              "flex justify-center py-3 border-t border-gray-100",
                            children: e.jsx("button", {
                              onClick: () => pe(),
                              disabled: Z,
                              className:
                                "px-4 py-1.5 text-sm font-medium text-[#177246] border border-[#177246]/40 rounded-lg hover:bg-[#177246]/5 transition-colors disabled:opacity-50",
                              children: Z
                                ? "Caricamento…"
                                : `Carica altri (${Q - R.length} rimanenti)`,
                            }),
                          }),
                      ],
                    }),
            }),
          ],
        }),
      }),
      y &&
        e.jsx("div", {
          className:
            "w-80 flex-shrink-0 border-l border-gray-200 overflow-hidden shadow-sm transition-all",
          children: e.jsx(He, { member: y, onClose: () => J(null) }),
        }),
    ],
  });
}
export { at as MembersPage };
