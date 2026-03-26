import {
  r as u,
  g as j,
  k as g,
  s as c,
  j as e,
  t as p,
  C as f,
  u as N,
  v,
  X as w,
} from "./index-DFehVeka.js";
import { i as h } from "./issues--cc66UpF.js";
import { i as I, a as S } from "./references-o1kGQSUn.js";
import { P as z } from "./plus-CDecntoB.js";
import { S as C } from "./send-vLQnFnYU.js";
const k = {
  [c.OPEN]: { label: "Aperta", class: "bg-emerald-100 text-emerald-700" },
  [c.IN_PROGRESS]: { label: "In corso", class: "bg-amber-100 text-amber-700" },
  [c.SOLVED]: { label: "Risolta", class: "bg-gray-100 text-gray-600" },
};
function q({ onClose: a, onCreated: n }) {
  const i = N((s) => s.user),
    { data: t } = g({
      queryKey: ["issueCategories", i == null ? void 0 : i.ruolo],
      queryFn: () => I.getCategories((i == null ? void 0 : i.ruolo) ?? void 0),
    }),
    { data: d } = g({ queryKey: ["issueUrgencies"], queryFn: S.getUrgencies }),
    {
      register: o,
      handleSubmit: x,
      formState: { errors: l, isSubmitting: r },
    } = v(),
    y = async (s) => {
      (await h.createIssue(s), n(), a());
    };
  return e.jsx("div", {
    className:
      "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40",
    onClick: a,
    children: e.jsxs("div", {
      className: "bg-white rounded-2xl shadow-2xl w-full max-w-lg",
      onClick: (s) => s.stopPropagation(),
      children: [
        e.jsxs("div", {
          className:
            "flex items-center justify-between p-6 border-b border-gray-100",
          children: [
            e.jsx("h2", {
              className: "text-lg font-bold text-gray-900",
              children: "Nuova segnalazione",
            }),
            e.jsx("button", {
              onClick: a,
              className: "text-gray-400 hover:text-gray-600",
              children: e.jsx(w, { size: 20 }),
            }),
          ],
        }),
        e.jsxs("form", {
          onSubmit: x(y),
          className: "p-6 space-y-4",
          children: [
            e.jsxs("div", {
              children: [
                e.jsx("label", {
                  className: "block text-sm font-medium text-gray-700 mb-1",
                  children: "Titolo *",
                }),
                e.jsx("input", {
                  ...o("title", { required: "Campo obbligatorio" }),
                  className:
                    "w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#177246]/30",
                  placeholder: "Titolo breve della segnalazione",
                }),
                l.title &&
                  e.jsx("p", {
                    className: "text-xs text-red-500 mt-1",
                    children: l.title.message,
                  }),
              ],
            }),
            e.jsxs("div", {
              children: [
                e.jsx("label", {
                  className: "block text-sm font-medium text-gray-700 mb-1",
                  children: "Descrizione *",
                }),
                e.jsx("textarea", {
                  ...o("description", { required: "Campo obbligatorio" }),
                  rows: 4,
                  className:
                    "w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#177246]/30 resize-none",
                  placeholder: "Descrivi il problema in dettaglio…",
                }),
                l.description &&
                  e.jsx("p", {
                    className: "text-xs text-red-500 mt-1",
                    children: l.description.message,
                  }),
              ],
            }),
            e.jsxs("div", {
              className: "grid grid-cols-2 gap-4",
              children: [
                e.jsxs("div", {
                  children: [
                    e.jsx("label", {
                      className: "block text-sm font-medium text-gray-700 mb-1",
                      children: "Categoria *",
                    }),
                    e.jsxs("select", {
                      ...o("categoryId", {
                        required: "Seleziona una categoria",
                      }),
                      className:
                        "w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#177246]/30",
                      children: [
                        e.jsx("option", { value: "", children: "Seleziona…" }),
                        t == null
                          ? void 0
                          : t
                              .filter((s) => s.active)
                              .map((s) =>
                                e.jsx(
                                  "option",
                                  { value: s.id, children: s.nameIt },
                                  s.id,
                                ),
                              ),
                      ],
                    }),
                    l.categoryId &&
                      e.jsx("p", {
                        className: "text-xs text-red-500 mt-1",
                        children: l.categoryId.message,
                      }),
                  ],
                }),
                e.jsxs("div", {
                  children: [
                    e.jsx("label", {
                      className: "block text-sm font-medium text-gray-700 mb-1",
                      children: "Urgenza *",
                    }),
                    e.jsxs("select", {
                      ...o("urgencyId", { required: "Seleziona l'urgenza" }),
                      className:
                        "w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#177246]/30",
                      children: [
                        e.jsx("option", { value: "", children: "Seleziona…" }),
                        d == null
                          ? void 0
                          : d
                              .filter((s) => s.active)
                              .sort((s, b) => b.level - s.level)
                              .map((s) =>
                                e.jsxs(
                                  "option",
                                  {
                                    value: s.id,
                                    children: ["L", s.level, " – ", s.nameIt],
                                  },
                                  s.id,
                                ),
                              ),
                      ],
                    }),
                    l.urgencyId &&
                      e.jsx("p", {
                        className: "text-xs text-red-500 mt-1",
                        children: l.urgencyId.message,
                      }),
                  ],
                }),
              ],
            }),
            e.jsxs("div", {
              className: "flex justify-end gap-3 pt-2",
              children: [
                e.jsx("button", {
                  type: "button",
                  onClick: a,
                  className:
                    "px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors",
                  children: "Annulla",
                }),
                e.jsxs("button", {
                  type: "submit",
                  disabled: r,
                  className:
                    "flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[#177246] text-white rounded-lg hover:bg-[#177246]/90 transition-colors disabled:opacity-50",
                  children: [
                    e.jsx(C, { size: 15 }),
                    r ? "Invio…" : "Invia segnalazione",
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    }),
  });
}
function m({ issue: a }) {
  const [n, i] = u.useState(!1),
    t = k[a.status];
  return e.jsxs(f, {
    className: "p-4",
    children: [
      e.jsxs("div", {
        className: "flex items-start justify-between gap-3",
        children: [
          e.jsxs("div", {
            className: "flex-1 min-w-0",
            children: [
              e.jsxs("div", {
                className: "flex items-center gap-2 flex-wrap",
                children: [
                  e.jsx("h3", {
                    className: "font-semibold text-gray-900 text-sm",
                    children: a.title,
                  }),
                  e.jsx("span", {
                    className: `text-xs font-medium px-2 py-0.5 rounded-full ${t == null ? void 0 : t.class}`,
                    children: t == null ? void 0 : t.label,
                  }),
                  a.category &&
                    e.jsx("span", {
                      className:
                        "text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full",
                      children: a.category.nameIt,
                    }),
                  a.urgency &&
                    e.jsxs("span", {
                      className:
                        "text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-mono",
                      children: ["L", a.urgency.level],
                    }),
                ],
              }),
              e.jsx("p", {
                className: "text-xs text-gray-400 mt-1",
                children: new Date(a.createdAt).toLocaleDateString("it-IT"),
              }),
            ],
          }),
          e.jsx("button", {
            onClick: () => i(!n),
            className: "text-gray-400 hover:text-gray-600 flex-shrink-0",
            children: e.jsx(p, { size: 16 }),
          }),
        ],
      }),
      n &&
        e.jsxs("div", {
          className: "mt-3 pt-3 border-t border-gray-100 space-y-2",
          children: [
            e.jsx("p", {
              className: "text-sm text-gray-700 whitespace-pre-wrap",
              children: a.description,
            }),
            a.adminNotes &&
              e.jsxs("div", {
                className: "bg-amber-50 rounded-lg p-3",
                children: [
                  e.jsx("p", {
                    className: "text-xs font-medium text-amber-700 mb-1",
                    children: "Note admin",
                  }),
                  e.jsx("p", {
                    className: "text-xs text-amber-800",
                    children: a.adminNotes,
                  }),
                ],
              }),
          ],
        }),
    ],
  });
}
function D() {
  const [a, n] = u.useState(!1),
    i = j(),
    { data: t, isLoading: d } = g({
      queryKey: ["myIssues"],
      queryFn: h.getMyIssues,
    }),
    o = (t ?? []).filter((r) => r.status === c.OPEN),
    x = (t ?? []).filter((r) => r.status === c.IN_PROGRESS),
    l = (t ?? []).filter((r) => r.status === c.SOLVED);
  return e.jsxs("div", {
    className: "p-6 max-w-3xl mx-auto",
    children: [
      e.jsxs("div", {
        className: "flex items-center justify-between mb-6",
        children: [
          e.jsxs("div", {
            children: [
              e.jsx("h1", {
                className: "text-2xl font-bold text-gray-900",
                children: "Le mie segnalazioni",
              }),
              e.jsxs("p", {
                className: "text-sm text-gray-500 mt-0.5",
                children: [(t == null ? void 0 : t.length) ?? 0, " totali"],
              }),
            ],
          }),
          e.jsxs("button", {
            onClick: () => n(!0),
            className:
              "flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[#177246] text-white rounded-lg hover:bg-[#177246]/90 transition-colors",
            children: [e.jsx(z, { size: 16 }), "Nuova segnalazione"],
          }),
        ],
      }),
      d
        ? e.jsx("div", {
            className: "flex items-center justify-center py-16",
            children: e.jsx("div", {
              className:
                "w-8 h-8 border-4 border-[#177246] border-t-transparent rounded-full animate-spin",
            }),
          })
        : (t ?? []).length === 0
          ? e.jsxs("div", {
              className:
                "flex flex-col items-center justify-center py-16 text-gray-400",
              children: [
                e.jsx(p, { size: 40, className: "mb-3 opacity-40" }),
                e.jsx("p", {
                  className: "text-sm mb-1",
                  children: "Nessuna segnalazione inviata",
                }),
                e.jsx("button", {
                  onClick: () => n(!0),
                  className: "text-xs text-[#177246] hover:underline mt-1",
                  children: "Crea la prima",
                }),
              ],
            })
          : e.jsxs("div", {
              className: "space-y-5",
              children: [
                o.length > 0 &&
                  e.jsxs("section", {
                    children: [
                      e.jsxs("h2", {
                        className:
                          "text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3",
                        children: ["Aperte (", o.length, ")"],
                      }),
                      e.jsx("div", {
                        className: "space-y-2",
                        children: o.map((r) => e.jsx(m, { issue: r }, r.id)),
                      }),
                    ],
                  }),
                x.length > 0 &&
                  e.jsxs("section", {
                    children: [
                      e.jsxs("h2", {
                        className:
                          "text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3",
                        children: ["In corso (", x.length, ")"],
                      }),
                      e.jsx("div", {
                        className: "space-y-2",
                        children: x.map((r) => e.jsx(m, { issue: r }, r.id)),
                      }),
                    ],
                  }),
                l.length > 0 &&
                  e.jsxs("section", {
                    children: [
                      e.jsxs("h2", {
                        className:
                          "text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3",
                        children: ["Risolte (", l.length, ")"],
                      }),
                      e.jsx("div", {
                        className: "space-y-2",
                        children: l.map((r) => e.jsx(m, { issue: r }, r.id)),
                      }),
                    ],
                  }),
              ],
            }),
      a &&
        e.jsx(q, {
          onClose: () => n(!1),
          onCreated: () => i.invalidateQueries({ queryKey: ["myIssues"] }),
        }),
    ],
  });
}
export { D as MyIssuesPage };
