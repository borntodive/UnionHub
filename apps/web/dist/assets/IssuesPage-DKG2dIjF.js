import {
  u as A,
  U as z,
  r as p,
  g as O,
  k as C,
  s as r,
  j as e,
  X as D,
  t as q,
  v as T,
} from "./index-DFehVeka.js";
import { i as N } from "./issues--cc66UpF.js";
import { i as V, a as U } from "./references-o1kGQSUn.js";
import { R as $ } from "./refresh-cw-SB2bGrMU.js";
import { D as F } from "./download-Ci9Ep0F2.js";
import { P as G } from "./plus-CDecntoB.js";
import { S as K } from "./send-vLQnFnYU.js";
const S = {
  [r.OPEN]: {
    label: "Aperta",
    dot: "bg-emerald-400",
    badge: "bg-emerald-100 text-emerald-700",
  },
  [r.IN_PROGRESS]: {
    label: "In corso",
    dot: "bg-amber-400",
    badge: "bg-amber-100 text-amber-700",
  },
  [r.SOLVED]: {
    label: "Risolta",
    dot: "bg-gray-300",
    badge: "bg-gray-100 text-gray-500",
  },
};
function _({ ruolo: s, onClose: c, onCreated: x }) {
  const { data: y } = C({
      queryKey: ["issueCategories", s],
      queryFn: () => V.getCategories(s ?? void 0),
    }),
    { data: d } = C({ queryKey: ["issueUrgencies"], queryFn: U.getUrgencies }),
    {
      register: m,
      handleSubmit: g,
      formState: { errors: n, isSubmitting: o },
    } = T(),
    h = async (a) => {
      (await N.createIssue(a), x(), c());
    };
  return e.jsx("div", {
    className:
      "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40",
    onClick: c,
    children: e.jsxs("div", {
      className: "bg-white rounded-2xl shadow-2xl w-full max-w-lg",
      onClick: (a) => a.stopPropagation(),
      children: [
        e.jsxs("div", {
          className:
            "flex items-center justify-between p-5 border-b border-gray-100",
          children: [
            e.jsx("h2", {
              className: "font-bold text-gray-900",
              children: "Nuova segnalazione",
            }),
            e.jsx("button", {
              onClick: c,
              className: "text-gray-400 hover:text-gray-600",
              children: e.jsx(D, { size: 18 }),
            }),
          ],
        }),
        e.jsxs("form", {
          onSubmit: g(h),
          className: "p-5 space-y-4",
          children: [
            e.jsxs("div", {
              children: [
                e.jsx("label", {
                  className: "block text-xs font-medium text-gray-600 mb-1",
                  children: "Titolo *",
                }),
                e.jsx("input", {
                  ...m("title", { required: "Obbligatorio" }),
                  className:
                    "w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#177246]/25 focus:border-[#177246]",
                  placeholder: "Titolo breve",
                }),
                n.title &&
                  e.jsx("p", {
                    className: "text-xs text-red-500 mt-1",
                    children: n.title.message,
                  }),
              ],
            }),
            e.jsxs("div", {
              children: [
                e.jsx("label", {
                  className: "block text-xs font-medium text-gray-600 mb-1",
                  children: "Descrizione *",
                }),
                e.jsx("textarea", {
                  ...m("description", { required: "Obbligatorio" }),
                  rows: 4,
                  "resize-none": !0,
                  className:
                    "w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#177246]/25 focus:border-[#177246] resize-none",
                  placeholder: "Descrivi il problema in dettaglio…",
                }),
                n.description &&
                  e.jsx("p", {
                    className: "text-xs text-red-500 mt-1",
                    children: n.description.message,
                  }),
              ],
            }),
            e.jsxs("div", {
              className: "grid grid-cols-2 gap-3",
              children: [
                e.jsxs("div", {
                  children: [
                    e.jsx("label", {
                      className: "block text-xs font-medium text-gray-600 mb-1",
                      children: "Categoria *",
                    }),
                    e.jsxs("select", {
                      ...m("categoryId", { required: "Obbligatorio" }),
                      className:
                        "w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#177246]/25",
                      children: [
                        e.jsx("option", { value: "", children: "Seleziona…" }),
                        y == null
                          ? void 0
                          : y
                              .filter((a) => a.active)
                              .map((a) =>
                                e.jsx(
                                  "option",
                                  { value: a.id, children: a.nameIt },
                                  a.id,
                                ),
                              ),
                      ],
                    }),
                    n.categoryId &&
                      e.jsx("p", {
                        className: "text-xs text-red-500 mt-1",
                        children: n.categoryId.message,
                      }),
                  ],
                }),
                e.jsxs("div", {
                  children: [
                    e.jsx("label", {
                      className: "block text-xs font-medium text-gray-600 mb-1",
                      children: "Urgenza *",
                    }),
                    e.jsxs("select", {
                      ...m("urgencyId", { required: "Obbligatorio" }),
                      className:
                        "w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#177246]/25",
                      children: [
                        e.jsx("option", { value: "", children: "Seleziona…" }),
                        d == null
                          ? void 0
                          : d
                              .filter((a) => a.active)
                              .sort((a, b) => b.level - a.level)
                              .map((a) =>
                                e.jsxs(
                                  "option",
                                  {
                                    value: a.id,
                                    children: ["L", a.level, " – ", a.nameIt],
                                  },
                                  a.id,
                                ),
                              ),
                      ],
                    }),
                    n.urgencyId &&
                      e.jsx("p", {
                        className: "text-xs text-red-500 mt-1",
                        children: n.urgencyId.message,
                      }),
                  ],
                }),
              ],
            }),
            e.jsxs("div", {
              className: "flex justify-end gap-2 pt-1",
              children: [
                e.jsx("button", {
                  type: "button",
                  onClick: c,
                  className:
                    "px-4 py-2 text-sm text-gray-500 hover:text-gray-700",
                  children: "Annulla",
                }),
                e.jsxs("button", {
                  type: "submit",
                  disabled: o,
                  className:
                    "flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[#177246] text-white rounded-xl hover:bg-[#177246]/90 disabled:opacity-50",
                  children: [e.jsx(K, { size: 14 }), o ? "Invio…" : "Invia"],
                }),
              ],
            }),
          ],
        }),
      ],
    }),
  });
}
function Q({ issue: s, isAdmin: c, onClose: x, onUpdated: y }) {
  var v, l, w;
  const d = O(),
    [m, g] = p.useState(s.adminNotes ?? ""),
    [n, o] = p.useState(!1);
  (p.useEffect(() => {
    g(s.adminNotes ?? "");
  }, [s.id, s.adminNotes]),
    p.useEffect(() => {
      const u = (f) => {
        f.key === "Escape" && x();
      };
      return (
        window.addEventListener("keydown", u),
        () => window.removeEventListener("keydown", u)
      );
    }, [x]));
  const h = async (u, f) => {
      o(!0);
      try {
        (await N.updateIssue(s.id, {
          ...(u ? { status: u } : {}),
          ...(f !== void 0 ? { adminNotes: m } : {}),
        }),
          d.invalidateQueries({ queryKey: ["adminIssues"] }),
          y());
      } finally {
        o(!1);
      }
    },
    a = async () => {
      (await N.reopenIssue(s.id),
        d.invalidateQueries({ queryKey: ["adminIssues"] }),
        y());
    },
    b = S[s.status];
  return e.jsxs("div", {
    className: "flex flex-col h-full bg-white",
    children: [
      e.jsxs("div", {
        className:
          "flex items-start gap-3 p-5 border-b border-gray-100 flex-shrink-0",
        children: [
          e.jsxs("div", {
            className: "flex-1 min-w-0",
            children: [
              e.jsx("h2", {
                className: "font-bold text-gray-900 leading-snug",
                children: s.title,
              }),
              e.jsxs("div", {
                className: "flex items-center gap-2 mt-1.5 flex-wrap",
                children: [
                  e.jsxs("span", {
                    className: `inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${b.badge}`,
                    children: [
                      e.jsx("span", {
                        className: `w-1.5 h-1.5 rounded-full ${b.dot}`,
                      }),
                      b.label,
                    ],
                  }),
                  s.category &&
                    e.jsx("span", {
                      className:
                        "text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full",
                      children: s.category.nameIt,
                    }),
                  s.urgency &&
                    e.jsxs("span", {
                      className:
                        "text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-mono",
                      children: ["L", s.urgency.level],
                    }),
                ],
              }),
            ],
          }),
          e.jsx("button", {
            onClick: x,
            className: "text-gray-400 hover:text-gray-600 flex-shrink-0 mt-0.5",
            children: e.jsx(D, { size: 17 }),
          }),
        ],
      }),
      e.jsxs("div", {
        className: "flex-1 overflow-y-auto p-5 space-y-5",
        children: [
          e.jsxs("div", {
            children: [
              e.jsx("p", {
                className:
                  "text-[11px] uppercase tracking-wide text-gray-400 mb-1",
                children: "Segnalato da",
              }),
              e.jsxs("p", {
                className: "text-sm font-medium text-gray-900",
                children: [
                  (v = s.user) == null ? void 0 : v.nome,
                  " ",
                  (l = s.user) == null ? void 0 : l.cognome,
                  e.jsxs("span", {
                    className: "text-gray-400 font-mono ml-1 font-normal",
                    children: [
                      "(",
                      (w = s.user) == null ? void 0 : w.crewcode,
                      ")",
                    ],
                  }),
                ],
              }),
              e.jsx("p", {
                className: "text-xs text-gray-400 mt-0.5",
                children: new Date(s.createdAt).toLocaleString("it-IT"),
              }),
            ],
          }),
          e.jsxs("div", {
            children: [
              e.jsx("p", {
                className:
                  "text-[11px] uppercase tracking-wide text-gray-400 mb-1",
                children: "Descrizione",
              }),
              e.jsx("p", {
                className:
                  "text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-xl p-3 leading-relaxed",
                children: s.description,
              }),
            ],
          }),
          c &&
            e.jsxs("div", {
              children: [
                e.jsx("label", {
                  className:
                    "block text-[11px] uppercase tracking-wide text-gray-400 mb-1",
                  children: "Note admin",
                }),
                e.jsx("textarea", {
                  value: m,
                  onChange: (u) => g(u.target.value),
                  rows: 3,
                  className:
                    "w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#177246]/25 resize-none",
                  placeholder: "Note interne (visibili solo agli admin)…",
                }),
              ],
            }),
          s.status === r.SOLVED &&
            s.solvedBy &&
            e.jsxs("div", {
              className:
                "bg-emerald-50 rounded-xl p-3 text-xs text-emerald-700",
              children: [
                "Risolta da",
                " ",
                e.jsxs("strong", {
                  children: [s.solvedBy.nome, " ", s.solvedBy.cognome],
                }),
                s.solvedAt &&
                  ` il ${new Date(s.solvedAt).toLocaleDateString("it-IT")}`,
              ],
            }),
        ],
      }),
      c &&
        e.jsxs("div", {
          className: "p-4 border-t border-gray-100 flex-shrink-0 space-y-2",
          children: [
            e.jsxs("div", {
              className: "flex flex-wrap gap-2",
              children: [
                s.status !== r.IN_PROGRESS &&
                  s.status !== r.SOLVED &&
                  e.jsx("button", {
                    onClick: () => h(r.IN_PROGRESS),
                    disabled: n,
                    className:
                      "flex-1 py-1.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 disabled:opacity-50 transition-colors",
                    children: "Prendi in carico",
                  }),
                s.status !== r.SOLVED &&
                  e.jsx("button", {
                    onClick: () => h(r.SOLVED),
                    disabled: n,
                    className:
                      "flex-1 py-1.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 disabled:opacity-50 transition-colors",
                    children: "Segna risolta",
                  }),
                s.status === r.SOLVED &&
                  e.jsx("button", {
                    onClick: a,
                    disabled: n,
                    className:
                      "flex-1 py-1.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors",
                    children: "Riapri",
                  }),
              ],
            }),
            e.jsx("button", {
              onClick: () => h(void 0, !0),
              disabled: n,
              className:
                "w-full py-1.5 text-xs font-medium bg-[#177246] text-white rounded-lg hover:bg-[#177246]/90 disabled:opacity-50 transition-colors",
              children: n ? "Salvo…" : "Salva note",
            }),
          ],
        }),
    ],
  });
}
function Z() {
  const s = A((t) => t.user),
    c =
      (s == null ? void 0 : s.role) === z.ADMIN ||
      (s == null ? void 0 : s.role) === z.SUPERADMIN,
    [x, y] = p.useState(null),
    [d, m] = p.useState(""),
    [g, n] = p.useState(""),
    [o, h] = p.useState(null),
    [a, b] = p.useState(!1),
    v = O(),
    {
      data: l,
      isLoading: w,
      refetch: u,
    } = C({ queryKey: ["adminIssues"], queryFn: N.getIssues }),
    f = p.useMemo(() => {
      let t = l ?? [];
      return (
        x && (t = t.filter((i) => i.status === x)),
        d && (t = t.filter((i) => new Date(i.createdAt) >= new Date(d))),
        g &&
          (t = t.filter(
            (i) => new Date(i.createdAt) <= new Date(g + "T23:59:59"),
          )),
        t
      );
    }, [l, x, d, g]),
    k = {
      all: (l == null ? void 0 : l.length) ?? 0,
      [r.OPEN]:
        (l == null ? void 0 : l.filter((t) => t.status === r.OPEN).length) ?? 0,
      [r.IN_PROGRESS]:
        (l == null
          ? void 0
          : l.filter((t) => t.status === r.IN_PROGRESS).length) ?? 0,
      [r.SOLVED]:
        (l == null ? void 0 : l.filter((t) => t.status === r.SOLVED).length) ??
        0,
    },
    R = d || g,
    L = async () => {
      try {
        const t = await N.exportCsv(),
          i = URL.createObjectURL(t);
        (Object.assign(document.createElement("a"), {
          href: i,
          download: "segnalazioni.csv",
        }).click(),
          URL.revokeObjectURL(i));
      } catch {
        alert("Errore esportazione");
      }
    },
    P = () => {
      if (o) {
        const t = (l ?? []).find((i) => i.id === o.id);
        t && h(t);
      }
      u();
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
                    e.jsx("h1", {
                      className: "text-xl font-bold text-gray-900",
                      children: "Segnalazioni",
                    }),
                    e.jsxs("p", {
                      className: "text-sm text-gray-500 mt-0.5",
                      children: [
                        k.all,
                        " totali · ",
                        f.length,
                        " visualizzate",
                      ],
                    }),
                  ],
                }),
                e.jsxs("div", {
                  className: "flex gap-2",
                  children: [
                    e.jsx("button", {
                      onClick: () => u(),
                      className:
                        "p-2 text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors",
                      children: e.jsx($, { size: 15 }),
                    }),
                    c &&
                      e.jsxs("button", {
                        onClick: L,
                        className:
                          "flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors",
                        children: [e.jsx(F, { size: 15 }), " CSV"],
                      }),
                    e.jsxs("button", {
                      onClick: () => b(!0),
                      className:
                        "flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-[#177246] text-white rounded-lg hover:bg-[#177246]/90 transition-colors",
                      children: [e.jsx(G, { size: 15 }), " Nuova"],
                    }),
                  ],
                }),
              ],
            }),
            e.jsxs("div", {
              className: "flex flex-wrap gap-2 mb-4 items-center",
              children: [
                [null, r.OPEN, r.IN_PROGRESS, r.SOLVED].map((t) => {
                  const i = t === null ? "Tutte" : S[t].label,
                    I = t === null ? k.all : k[t],
                    j = x === t;
                  return e.jsxs(
                    "button",
                    {
                      onClick: () => y(t),
                      className: `flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${j ? "bg-[#177246] text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`,
                      children: [
                        t &&
                          e.jsx("span", {
                            className: `w-2 h-2 rounded-full ${S[t].dot}`,
                          }),
                        i,
                        e.jsx("span", {
                          className: `text-[11px] px-1.5 py-0.5 rounded-full leading-none ${j ? "bg-white/20" : "bg-gray-100 text-gray-500"}`,
                          children: I,
                        }),
                      ],
                    },
                    String(t),
                  );
                }),
                e.jsx("div", {
                  className: "h-5 w-px bg-gray-200 mx-1 hidden sm:block",
                }),
                e.jsxs("div", {
                  className: "flex items-center gap-1.5",
                  children: [
                    e.jsx("span", {
                      className: "text-xs text-gray-400",
                      children: "Dal",
                    }),
                    e.jsx("input", {
                      type: "date",
                      value: d,
                      onChange: (t) => m(t.target.value),
                      className:
                        "text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#177246]/25",
                    }),
                    e.jsx("span", {
                      className: "text-xs text-gray-400",
                      children: "al",
                    }),
                    e.jsx("input", {
                      type: "date",
                      value: g,
                      onChange: (t) => n(t.target.value),
                      className:
                        "text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#177246]/25",
                    }),
                    R &&
                      e.jsx("button", {
                        onClick: () => {
                          (m(""), n(""));
                        },
                        className: "text-gray-400 hover:text-gray-600",
                        children: e.jsx(D, { size: 14 }),
                      }),
                  ],
                }),
              ],
            }),
            e.jsx("div", {
              className:
                "bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm",
              children: w
                ? e.jsx("div", {
                    className: "flex items-center justify-center py-16",
                    children: e.jsx("div", {
                      className:
                        "w-7 h-7 border-4 border-[#177246] border-t-transparent rounded-full animate-spin",
                    }),
                  })
                : f.length === 0
                  ? e.jsxs("div", {
                      className:
                        "flex flex-col items-center py-16 text-gray-400",
                      children: [
                        e.jsx(q, { size: 36, className: "mb-2 opacity-30" }),
                        e.jsx("p", {
                          className: "text-sm",
                          children: "Nessuna segnalazione",
                        }),
                      ],
                    })
                  : e.jsx("div", {
                      className: "overflow-x-auto",
                      children: e.jsxs("table", {
                        className: "w-full text-sm",
                        children: [
                          e.jsx("thead", {
                            className: "bg-gray-50 border-b border-gray-200",
                            children: e.jsxs("tr", {
                              children: [
                                e.jsx("th", {
                                  className:
                                    "text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide",
                                  children: "Segnalazione",
                                }),
                                e.jsx("th", {
                                  className:
                                    "text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide",
                                  children: "Utente",
                                }),
                                e.jsx("th", {
                                  className:
                                    "text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide",
                                  children: "Categoria",
                                }),
                                e.jsx("th", {
                                  className:
                                    "text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide",
                                  children: "Urgenza",
                                }),
                                e.jsx("th", {
                                  className:
                                    "text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide",
                                  children: "Stato",
                                }),
                                e.jsx("th", {
                                  className:
                                    "text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide",
                                  children: "Data",
                                }),
                              ],
                            }),
                          }),
                          e.jsx("tbody", {
                            className: "divide-y divide-gray-100",
                            children: f.map((t) => {
                              var j, E;
                              const i = S[t.status],
                                I = (o == null ? void 0 : o.id) === t.id;
                              return e.jsxs(
                                "tr",
                                {
                                  onClick: () => h(t),
                                  className: `cursor-pointer transition-colors hover:bg-[#177246]/4 ${I ? "bg-[#177246]/8" : ""}`,
                                  children: [
                                    e.jsxs("td", {
                                      className: "px-4 py-3 max-w-xs",
                                      children: [
                                        e.jsx("p", {
                                          className:
                                            "font-medium text-gray-900 truncate",
                                          children: t.title,
                                        }),
                                        e.jsx("p", {
                                          className:
                                            "text-xs text-gray-400 truncate mt-0.5",
                                          children: t.description,
                                        }),
                                      ],
                                    }),
                                    e.jsx("td", {
                                      className:
                                        "px-4 py-3 font-mono text-xs text-gray-600",
                                      children:
                                        ((j = t.user) == null
                                          ? void 0
                                          : j.crewcode) ?? "—",
                                    }),
                                    e.jsx("td", {
                                      className:
                                        "px-4 py-3 text-xs text-gray-500",
                                      children:
                                        ((E = t.category) == null
                                          ? void 0
                                          : E.nameIt) ?? "—",
                                    }),
                                    e.jsx("td", {
                                      className: "px-4 py-3",
                                      children:
                                        t.urgency &&
                                        e.jsxs("span", {
                                          className:
                                            "text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-mono",
                                          children: ["L", t.urgency.level],
                                        }),
                                    }),
                                    e.jsx("td", {
                                      className: "px-4 py-3",
                                      children: e.jsxs("span", {
                                        className: `inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${i.badge}`,
                                        children: [
                                          e.jsx("span", {
                                            className: `w-1.5 h-1.5 rounded-full ${i.dot}`,
                                          }),
                                          i.label,
                                        ],
                                      }),
                                    }),
                                    e.jsx("td", {
                                      className:
                                        "px-4 py-3 text-xs text-gray-500 whitespace-nowrap",
                                      children: new Date(
                                        t.createdAt,
                                      ).toLocaleDateString("it-IT"),
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
            }),
          ],
        }),
      }),
      o &&
        e.jsx("div", {
          className:
            "w-80 flex-shrink-0 border-l border-gray-200 overflow-hidden",
          children: e.jsx(
            Q,
            { issue: o, isAdmin: c, onClose: () => h(null), onUpdated: P },
            o.id,
          ),
        }),
      a &&
        e.jsx(_, {
          ruolo: s == null ? void 0 : s.ruolo,
          onClose: () => b(!1),
          onCreated: () => v.invalidateQueries({ queryKey: ["adminIssues"] }),
        }),
    ],
  });
}
export { Z as IssuesPage };
