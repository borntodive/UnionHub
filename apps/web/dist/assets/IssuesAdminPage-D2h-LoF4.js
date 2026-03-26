import {
  r as l,
  g as K,
  k as z,
  s as o,
  j as e,
  R as P,
  X as $,
  t as U,
  z as Q,
} from "./index-DFehVeka.js";
import { i as S } from "./issues--cc66UpF.js";
import { i as M, a as W } from "./references-o1kGQSUn.js";
import { D as X } from "./download-Ci9Ep0F2.js";
import { S as H } from "./search-CAlZuJmR.js";
import { C as J } from "./chevron-right-BdOGgnZE.js";
import { C as Y } from "./circle-check-big-Cy9f-Vvd.js";
const A = {
    [o.OPEN]: {
      label: "Aperta",
      dot: "bg-emerald-500",
      badge: "bg-emerald-100 text-emerald-700",
      icon: e.jsx(U, { size: 14 }),
    },
    [o.IN_PROGRESS]: {
      label: "In corso",
      dot: "bg-amber-500",
      badge: "bg-amber-100 text-amber-700",
      icon: e.jsx(Q, { size: 14 }),
    },
    [o.SOLVED]: {
      label: "Risolta",
      dot: "bg-gray-400",
      badge: "bg-gray-100 text-gray-600",
      icon: e.jsx(Y, { size: 14 }),
    },
  },
  E = {
    1: "bg-green-100 text-green-700",
    2: "bg-lime-100 text-lime-700",
    3: "bg-amber-100 text-amber-700",
    4: "bg-red-100 text-red-700",
    5: "bg-violet-100 text-violet-700",
  };
function Z({ issue: s, onClose: p, onUpdated: i }) {
  var N, n;
  const [y, x] = l.useState(s.adminNotes ?? ""),
    [b, g] = l.useState(!1),
    [h, d] = l.useState(!1),
    f = A[s.status];
  (l.useEffect(() => {
    x(s.adminNotes ?? "");
  }, [s.id, s.adminNotes]),
    l.useEffect(() => {
      const c = (k) => {
        k.key === "Escape" && p();
      };
      return (
        window.addEventListener("keydown", c),
        () => window.removeEventListener("keydown", c)
      );
    }, [p]));
  const m = async () => {
      g(!0);
      try {
        (await S.updateIssue(s.id, { adminNotes: y }), i());
      } finally {
        g(!1);
      }
    },
    j = async (c) => {
      d(!0);
      try {
        (await S.updateIssue(s.id, { status: c }), i());
      } finally {
        d(!1);
      }
    },
    u = async () => {
      d(!0);
      try {
        (await S.reopenIssue(s.id), i());
      } finally {
        d(!1);
      }
    };
  return e.jsxs("aside", {
    className:
      "w-96 flex-shrink-0 border-l border-gray-200 bg-white flex flex-col overflow-hidden",
    children: [
      e.jsxs("div", {
        className:
          "flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0",
        children: [
          e.jsxs("div", {
            className: "flex items-center gap-2 min-w-0",
            children: [
              e.jsx("span", {
                className: `w-2 h-2 rounded-full flex-shrink-0 ${f.dot}`,
              }),
              e.jsx("span", {
                className: `text-xs font-medium px-2 py-0.5 rounded-full ${f.badge}`,
                children: f.label,
              }),
            ],
          }),
          e.jsx("button", {
            onClick: p,
            className: "p-1 text-gray-400 hover:text-gray-600 flex-shrink-0",
            children: e.jsx($, { size: 16 }),
          }),
        ],
      }),
      e.jsxs("div", {
        className: "flex-1 overflow-y-auto px-5 py-4 space-y-4 text-sm",
        children: [
          e.jsx("h3", {
            className: "font-bold text-gray-900 text-base leading-snug",
            children: s.title,
          }),
          s.user &&
            e.jsxs("div", {
              className: "flex items-center gap-2 text-xs text-gray-500",
              children: [
                e.jsxs("div", {
                  className:
                    "w-6 h-6 rounded-full bg-[#177246]/15 text-[#177246] flex items-center justify-center font-bold text-[10px] flex-shrink-0",
                  children: [
                    (N = s.user.nome) == null ? void 0 : N[0],
                    (n = s.user.cognome) == null ? void 0 : n[0],
                  ],
                }),
                e.jsxs("span", {
                  children: [s.user.nome, " ", s.user.cognome],
                }),
                e.jsx("span", {
                  className:
                    "font-mono bg-gray-100 px-1.5 py-0.5 rounded text-[10px]",
                  children: s.user.crewcode,
                }),
              ],
            }),
          e.jsxs("div", {
            className: "flex flex-wrap gap-1.5",
            children: [
              s.category &&
                e.jsx("span", {
                  className:
                    "text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full",
                  children: s.category.nameIt,
                }),
              s.urgency &&
                e.jsxs("span", {
                  className: `text-xs font-medium px-2 py-0.5 rounded-full ${E[s.urgency.level] ?? E[3]}`,
                  children: ["L", s.urgency.level, " – ", s.urgency.nameIt],
                }),
              s.ruolo &&
                e.jsx("span", {
                  className:
                    "text-xs bg-sky-50 text-sky-700 px-2 py-0.5 rounded-full",
                  children: s.ruolo === P.PILOT ? "Pilota" : "Cabin Crew",
                }),
            ],
          }),
          e.jsxs("div", {
            className: "text-xs text-gray-400 space-y-0.5",
            children: [
              e.jsxs("p", {
                children: [
                  "Creata il",
                  " ",
                  new Date(s.createdAt).toLocaleDateString("it-IT", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                ],
              }),
              s.solvedAt &&
                e.jsxs("p", {
                  children: [
                    "Risolta il",
                    " ",
                    new Date(s.solvedAt).toLocaleDateString("it-IT", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    }),
                    s.solvedBy &&
                      e.jsxs("span", {
                        children: [
                          " ",
                          "da ",
                          s.solvedBy.nome,
                          " ",
                          s.solvedBy.cognome,
                        ],
                      }),
                  ],
                }),
            ],
          }),
          e.jsxs("div", {
            children: [
              e.jsx("p", {
                className:
                  "text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5",
                children: "Descrizione",
              }),
              e.jsx("p", {
                className:
                  "text-sm text-gray-700 whitespace-pre-wrap leading-relaxed bg-gray-50 rounded-lg px-3 py-2.5",
                children: s.description,
              }),
            ],
          }),
          e.jsxs("div", {
            children: [
              e.jsx("p", {
                className:
                  "text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5",
                children: "Note admin",
              }),
              e.jsx("textarea", {
                value: y,
                onChange: (c) => x(c.target.value),
                rows: 4,
                placeholder: "Aggiungi note interne…",
                className:
                  "w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#177246]/30 resize-none",
              }),
              e.jsx("button", {
                onClick: m,
                disabled: b || y === (s.adminNotes ?? ""),
                className:
                  "mt-1.5 w-full py-1.5 text-xs font-medium text-white bg-[#177246] rounded-lg hover:bg-[#177246]/90 transition-colors disabled:opacity-40",
                children: b ? "Salvataggio…" : "Salva note",
              }),
            ],
          }),
          e.jsxs("div", {
            className: "space-y-2 pt-1",
            children: [
              s.status === o.OPEN &&
                e.jsx("button", {
                  onClick: () => j(o.IN_PROGRESS),
                  disabled: h,
                  className:
                    "w-full py-2 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors disabled:opacity-50",
                  children: "Prendi in carico",
                }),
              s.status === o.IN_PROGRESS &&
                e.jsx("button", {
                  onClick: () => j(o.SOLVED),
                  disabled: h,
                  className:
                    "w-full py-2 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-50",
                  children: "Segna come risolta",
                }),
              s.status === o.SOLVED &&
                e.jsx("button", {
                  onClick: u,
                  disabled: h,
                  className:
                    "w-full py-2 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50",
                  children: "Riapri segnalazione",
                }),
            ],
          }),
        ],
      }),
    ],
  });
}
function oe() {
  const [s, p] = l.useState(""),
    [i, y] = l.useState("all"),
    [x, b] = l.useState("all"),
    [g, h] = l.useState("all"),
    [d, f] = l.useState(0),
    [m, j] = l.useState(""),
    [u, N] = l.useState(""),
    [n, c] = l.useState(null),
    [k, T] = l.useState(!1),
    R = K(),
    { data: I, isLoading: q } = z({
      queryKey: ["adminIssues"],
      queryFn: S.getIssues,
    }),
    { data: _ } = z({
      queryKey: ["issueCategories"],
      queryFn: () => M.getCategories(),
    }),
    { data: V } = z({ queryKey: ["issueUrgencies"], queryFn: W.getUrgencies }),
    D = l.useMemo(() => {
      let t = I ?? [];
      if (
        (i !== "all" && (t = t.filter((a) => a.status === i)),
        x !== "all" && (t = t.filter((a) => a.ruolo === x)),
        g !== "all" && (t = t.filter((a) => a.categoryId === g)),
        d !== 0 &&
          (t = t.filter((a) => {
            var r;
            return ((r = a.urgency) == null ? void 0 : r.level) === d;
          })),
        m && (t = t.filter((a) => new Date(a.createdAt) >= new Date(m))),
        u &&
          (t = t.filter(
            (a) => new Date(a.createdAt) <= new Date(u + "T23:59:59"),
          )),
        s)
      ) {
        const a = s.toLowerCase();
        t = t.filter((r) => {
          var v, w, C;
          return (
            r.title.toLowerCase().includes(a) ||
            r.description.toLowerCase().includes(a) ||
            ((v = r.user) == null
              ? void 0
              : v.nome.toLowerCase().includes(a)) ||
            ((w = r.user) == null
              ? void 0
              : w.cognome.toLowerCase().includes(a)) ||
            ((C = r.user) == null
              ? void 0
              : C.crewcode.toLowerCase().includes(a))
          );
        });
      }
      return t;
    }, [I, i, x, g, d, m, u, s]),
    L = s || i !== "all" || x !== "all" || g !== "all" || d !== 0 || m || u,
    F = () => {
      (p(""), y("all"), b("all"), h("all"), f(0), j(""), N(""));
    },
    G = l.useCallback(() => {
      R.invalidateQueries({ queryKey: ["adminIssues"] }).then(() => {
        var a;
        const t =
          (a = R.getQueryData(["adminIssues"])) == null
            ? void 0
            : a.find((r) => r.id === (n == null ? void 0 : n.id));
        t && c(t);
      });
    }, [R, n == null ? void 0 : n.id]),
    B = async () => {
      T(!0);
      try {
        const t = await S.exportCsv(),
          a = URL.createObjectURL(t),
          r = document.createElement("a");
        ((r.href = a),
          (r.download = `issues-${new Date().toISOString().slice(0, 10)}.csv`),
          r.click(),
          URL.revokeObjectURL(a));
      } finally {
        T(!1);
      }
    },
    O = l.useMemo(() => {
      const t = I ?? [];
      return {
        open: t.filter((a) => a.status === o.OPEN).length,
        inProgress: t.filter((a) => a.status === o.IN_PROGRESS).length,
        solved: t.filter((a) => a.status === o.SOLVED).length,
      };
    }, [I]);
  return e.jsxs("div", {
    className: "flex h-full overflow-hidden",
    children: [
      e.jsxs("div", {
        className: "flex-1 flex flex-col overflow-hidden min-w-0",
        children: [
          e.jsxs("div", {
            className:
              "flex items-center justify-between px-6 py-5 border-b border-gray-200 bg-white flex-shrink-0",
            children: [
              e.jsxs("div", {
                children: [
                  e.jsx("h1", {
                    className: "text-2xl font-bold text-gray-900",
                    children: "Segnalazioni",
                  }),
                  e.jsx("div", {
                    className: "flex items-center gap-3 mt-1",
                    children: [
                      [o.OPEN, O.open, "emerald"],
                      [o.IN_PROGRESS, O.inProgress, "amber"],
                      [o.SOLVED, O.solved, "gray"],
                    ].map(([t, a, r]) =>
                      e.jsxs(
                        "button",
                        {
                          onClick: () => y(i === t ? "all" : t),
                          className: `flex items-center gap-1.5 text-xs font-medium transition-colors ${i === t ? `text-${r}-700` : "text-gray-400 hover:text-gray-600"}`,
                          children: [
                            e.jsx("span", {
                              className: `w-1.5 h-1.5 rounded-full bg-${r}-${r === "gray" ? "400" : "500"}`,
                            }),
                            A[t].label,
                            " (",
                            a,
                            ")",
                          ],
                        },
                        t,
                      ),
                    ),
                  }),
                ],
              }),
              e.jsxs("button", {
                onClick: B,
                disabled: k,
                className:
                  "flex items-center gap-2 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50",
                children: [
                  k
                    ? e.jsx("div", {
                        className:
                          "w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin",
                      })
                    : e.jsx(X, { size: 15 }),
                  "Esporta CSV",
                ],
              }),
            ],
          }),
          e.jsxs("div", {
            className:
              "flex gap-2 px-6 py-3 border-b border-gray-100 bg-gray-50/70 flex-shrink-0 flex-wrap",
            children: [
              e.jsxs("div", {
                className: "relative",
                children: [
                  e.jsx(H, {
                    size: 13,
                    className:
                      "absolute left-3 top-1/2 -translate-y-1/2 text-gray-400",
                  }),
                  e.jsx("input", {
                    type: "text",
                    value: s,
                    onChange: (t) => p(t.target.value),
                    placeholder: "Cerca…",
                    className:
                      "pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#177246]/30 w-44",
                  }),
                ],
              }),
              e.jsxs("select", {
                value: x,
                onChange: (t) => b(t.target.value),
                className:
                  "text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#177246]/30 bg-white",
                children: [
                  e.jsx("option", { value: "all", children: "Tutti i ruoli" }),
                  e.jsx("option", { value: P.PILOT, children: "Piloti" }),
                  e.jsx("option", {
                    value: P.CABIN_CREW,
                    children: "Cabin Crew",
                  }),
                ],
              }),
              e.jsxs("select", {
                value: g,
                onChange: (t) => h(t.target.value),
                className:
                  "text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#177246]/30 bg-white",
                children: [
                  e.jsx("option", {
                    value: "all",
                    children: "Tutte le categorie",
                  }),
                  (_ ?? []).map((t) =>
                    e.jsx("option", { value: t.id, children: t.nameIt }, t.id),
                  ),
                ],
              }),
              e.jsxs("select", {
                value: d,
                onChange: (t) => f(Number(t.target.value)),
                className:
                  "text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#177246]/30 bg-white",
                children: [
                  e.jsx("option", { value: 0, children: "Tutte le urgenze" }),
                  (V ?? [])
                    .sort((t, a) => t.level - a.level)
                    .map((t) =>
                      e.jsxs(
                        "option",
                        {
                          value: t.level,
                          children: ["L", t.level, " – ", t.nameIt],
                        },
                        t.id,
                      ),
                    ),
                ],
              }),
              e.jsxs("div", {
                className: "flex items-center gap-1.5",
                children: [
                  e.jsx("input", {
                    type: "date",
                    value: m,
                    onChange: (t) => j(t.target.value),
                    className:
                      "text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#177246]/30",
                  }),
                  e.jsx("span", {
                    className: "text-xs text-gray-400",
                    children: "–",
                  }),
                  e.jsx("input", {
                    type: "date",
                    value: u,
                    onChange: (t) => N(t.target.value),
                    className:
                      "text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#177246]/30",
                  }),
                ],
              }),
              L &&
                e.jsxs("button", {
                  onClick: F,
                  className:
                    "flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-2 py-1.5 hover:bg-white transition-colors",
                  children: [e.jsx($, { size: 11 }), "Rimuovi filtri"],
                }),
            ],
          }),
          e.jsx("div", {
            className: "flex-1 overflow-y-auto",
            children: q
              ? e.jsx("div", {
                  className: "flex justify-center py-16",
                  children: e.jsx("div", {
                    className:
                      "w-7 h-7 border-4 border-[#177246] border-t-transparent rounded-full animate-spin",
                  }),
                })
              : D.length === 0
                ? e.jsxs("div", {
                    className:
                      "flex flex-col items-center justify-center py-16 text-gray-400",
                    children: [
                      e.jsx(U, { size: 36, className: "mb-3 opacity-30" }),
                      e.jsx("p", {
                        className: "text-sm",
                        children: L
                          ? "Nessun risultato"
                          : "Nessuna segnalazione",
                      }),
                      L &&
                        e.jsx("button", {
                          onClick: F,
                          className:
                            "text-xs text-[#177246] hover:underline mt-2",
                          children: "Rimuovi i filtri",
                        }),
                    ],
                  })
                : e.jsxs("table", {
                    className: "w-full text-sm",
                    children: [
                      e.jsx("thead", {
                        className:
                          "bg-gray-50 border-b border-gray-200 sticky top-0 z-10",
                        children: e.jsxs("tr", {
                          children: [
                            e.jsx("th", {
                              className:
                                "px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider",
                              children: "Titolo",
                            }),
                            e.jsx("th", {
                              className:
                                "px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-36 hidden md:table-cell",
                              children: "Utente",
                            }),
                            e.jsx("th", {
                              className:
                                "px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-28 hidden lg:table-cell",
                              children: "Categoria",
                            }),
                            e.jsx("th", {
                              className:
                                "px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-20",
                              children: "Urg.",
                            }),
                            e.jsx("th", {
                              className:
                                "px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-28",
                              children: "Stato",
                            }),
                            e.jsx("th", {
                              className:
                                "px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-28 hidden xl:table-cell",
                              children: "Data",
                            }),
                            e.jsx("th", { className: "px-4 py-3 w-8" }),
                          ],
                        }),
                      }),
                      e.jsx("tbody", {
                        className: "divide-y divide-gray-100 bg-white",
                        children: D.map((t) => {
                          var v, w, C;
                          const a = A[t.status],
                            r = (n == null ? void 0 : n.id) === t.id;
                          return e.jsxs(
                            "tr",
                            {
                              onClick: () => c(r ? null : t),
                              className: `cursor-pointer transition-colors ${r ? "bg-[#177246]/8" : "hover:bg-gray-50"}`,
                              children: [
                                e.jsxs("td", {
                                  className: "px-5 py-3",
                                  children: [
                                    e.jsx("p", {
                                      className:
                                        "font-medium text-gray-900 line-clamp-1",
                                      children: t.title,
                                    }),
                                    e.jsx("p", {
                                      className:
                                        "text-xs text-gray-400 mt-0.5 line-clamp-1",
                                      children: t.description,
                                    }),
                                  ],
                                }),
                                e.jsxs("td", {
                                  className: "px-4 py-3 hidden md:table-cell",
                                  children: [
                                    e.jsxs("p", {
                                      className: "text-gray-700 text-xs",
                                      children: [
                                        (v = t.user) == null ? void 0 : v.nome,
                                        " ",
                                        (w = t.user) == null
                                          ? void 0
                                          : w.cognome,
                                      ],
                                    }),
                                    e.jsx("p", {
                                      className:
                                        "font-mono text-[10px] text-gray-400",
                                      children:
                                        (C = t.user) == null
                                          ? void 0
                                          : C.crewcode,
                                    }),
                                  ],
                                }),
                                e.jsx("td", {
                                  className: "px-4 py-3 hidden lg:table-cell",
                                  children:
                                    t.category &&
                                    e.jsx("span", {
                                      className: "text-xs text-gray-500",
                                      children: t.category.nameIt,
                                    }),
                                }),
                                e.jsx("td", {
                                  className: "px-4 py-3",
                                  children:
                                    t.urgency &&
                                    e.jsxs("span", {
                                      className: `text-xs font-bold px-1.5 py-0.5 rounded ${E[t.urgency.level] ?? E[3]}`,
                                      children: ["L", t.urgency.level],
                                    }),
                                }),
                                e.jsx("td", {
                                  className: "px-4 py-3",
                                  children: e.jsxs("span", {
                                    className: `inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${a.badge}`,
                                    children: [a.icon, a.label],
                                  }),
                                }),
                                e.jsx("td", {
                                  className:
                                    "px-4 py-3 text-xs text-gray-400 hidden xl:table-cell",
                                  children: new Date(
                                    t.createdAt,
                                  ).toLocaleDateString("it-IT", {
                                    day: "2-digit",
                                    month: "short",
                                  }),
                                }),
                                e.jsx("td", {
                                  className: "px-4 py-3",
                                  children: e.jsx(J, {
                                    size: 15,
                                    className: `text-gray-300 transition-colors ${r ? "text-[#177246]" : ""}`,
                                  }),
                                }),
                              ],
                            },
                            t.id,
                          );
                        }),
                      }),
                    ],
                  }),
          }),
          e.jsxs("div", {
            className:
              "px-6 py-2 border-t border-gray-100 bg-gray-50 text-xs text-gray-400 flex-shrink-0",
            children: [D.length, " segnalazioni ", L ? "filtrate" : "totali"],
          }),
        ],
      }),
      n && e.jsx(Z, { issue: n, onClose: () => c(null), onUpdated: G }, n.id),
    ],
  });
}
export { oe as IssuesAdminPage };
