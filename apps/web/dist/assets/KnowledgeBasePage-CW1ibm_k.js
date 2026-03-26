import {
  w as v,
  r,
  g as R,
  k as T,
  j as e,
  X as z,
  y as B,
  F as I,
  R as f,
  t as S,
  z as E,
} from "./index-DFehVeka.js";
import { U as k } from "./upload-B89mvuMj.js";
import { L as C } from "./loader-BqyEZcbY.js";
import { R as L } from "./refresh-cw-SB2bGrMU.js";
import { T as P } from "./trash-2-tYxbyunj.js";
import { C as A } from "./circle-check-big-Cy9f-Vvd.js";
const w = {
  getDocuments: async () => (await v.get("/knowledge-base")).data,
  uploadDocument: async (a, d, l, c) => {
    const i = new FormData();
    return (
      i.append("file", a),
      i.append("title", d),
      i.append("accessLevel", l),
      c && i.append("ruolo", c),
      (
        await v.post("/knowledge-base/upload", i, {
          headers: { "Content-Type": "multipart/form-data" },
        })
      ).data
    );
  },
  deleteDocument: async (a) => {
    await v.delete(`/knowledge-base/${a}`);
  },
  reindexDocument: async (a) => {
    await v.post(`/knowledge-base/${a}/reindex`);
  },
};
function F({ status: a }) {
  const d = {
      pending: {
        cls: "bg-gray-100 text-gray-600",
        icon: e.jsx(E, { size: 12 }),
        label: "In attesa",
      },
      indexing: {
        cls: "bg-blue-100 text-blue-700",
        icon: e.jsx(C, { size: 12, className: "animate-spin" }),
        label: "Indicizzazione…",
      },
      ready: {
        cls: "bg-emerald-100 text-emerald-700",
        icon: e.jsx(A, { size: 12 }),
        label: "Pronto",
      },
      error: {
        cls: "bg-red-100 text-red-700",
        icon: e.jsx(S, { size: 12 }),
        label: "Errore",
      },
    },
    { cls: l, icon: c, label: i } = d[a] ?? d.pending;
  return e.jsxs("span", {
    className: `inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${l}`,
    children: [c, " ", i],
  });
}
function $({ level: a }) {
  return e.jsx("span", {
    className: `text-xs font-medium px-2 py-0.5 rounded-full ${a === "admin" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"}`,
    children: a === "admin" ? "Solo admin" : "Tutti",
  });
}
function U({ onClose: a, onUploaded: d }) {
  const [l, c] = r.useState(null),
    [i, m] = r.useState(""),
    [u, p] = r.useState("admin"),
    [o, n] = r.useState(""),
    [g, h] = r.useState(!1),
    [x, j] = r.useState(null),
    N = r.useRef(null),
    t = !!l && i.trim().length > 0 && !g,
    b = async () => {
      var s, y;
      if (!(!t || !l)) {
        (h(!0), j(null));
        try {
          (await w.uploadDocument(l, i.trim(), u, o || null), d(), a());
        } catch (D) {
          j(
            ((y = (s = D.response) == null ? void 0 : s.data) == null
              ? void 0
              : y.message) ?? "Errore durante il caricamento",
          );
        } finally {
          h(!1);
        }
      }
    };
  return e.jsx("div", {
    className:
      "fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4",
    children: e.jsxs("div", {
      className: "bg-white rounded-2xl shadow-xl w-full max-w-md",
      children: [
        e.jsxs("div", {
          className:
            "flex items-center justify-between px-6 py-4 border-b border-gray-100",
          children: [
            e.jsx("h2", {
              className: "text-base font-semibold text-gray-900",
              children: "Carica documento",
            }),
            e.jsx("button", {
              onClick: a,
              className:
                "p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100",
              children: e.jsx(z, { size: 18 }),
            }),
          ],
        }),
        e.jsxs("div", {
          className: "p-6 space-y-4",
          children: [
            x &&
              e.jsxs("div", {
                className:
                  "flex items-start gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm",
                children: [
                  e.jsx(S, { size: 15, className: "mt-0.5 shrink-0" }),
                  e.jsx("span", { children: x }),
                ],
              }),
            e.jsxs("div", {
              children: [
                e.jsx("label", {
                  className: "block text-xs font-medium text-gray-700 mb-1.5",
                  children: "File PDF *",
                }),
                e.jsx("div", {
                  onClick: () => {
                    var s;
                    return (s = N.current) == null ? void 0 : s.click();
                  },
                  className:
                    "border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-[#177246] transition-colors",
                  children: l
                    ? e.jsxs("div", {
                        className:
                          "flex items-center justify-center gap-2 text-sm text-gray-700",
                        children: [
                          e.jsx(I, { size: 16, className: "text-[#177246]" }),
                          e.jsx("span", {
                            className: "font-medium truncate max-w-xs",
                            children: l.name,
                          }),
                        ],
                      })
                    : e.jsxs("div", {
                        className: "text-gray-400 text-sm",
                        children: [
                          e.jsx(k, { size: 20, className: "mx-auto mb-1" }),
                          "Clicca per selezionare un PDF",
                        ],
                      }),
                }),
                e.jsx("input", {
                  ref: N,
                  type: "file",
                  accept: ".pdf,application/pdf",
                  className: "hidden",
                  onChange: (s) => {
                    var y;
                    return c(
                      ((y = s.target.files) == null ? void 0 : y[0]) ?? null,
                    );
                  },
                }),
              ],
            }),
            e.jsxs("div", {
              children: [
                e.jsx("label", {
                  className: "block text-xs font-medium text-gray-700 mb-1.5",
                  children: "Titolo *",
                }),
                e.jsx("input", {
                  value: i,
                  onChange: (s) => m(s.target.value),
                  placeholder: "es. CCNL Piloti 2024",
                  className:
                    "w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#177246]/30 focus:border-[#177246]",
                }),
              ],
            }),
            e.jsxs("div", {
              children: [
                e.jsx("label", {
                  className: "block text-xs font-medium text-gray-700 mb-1.5",
                  children: "Visibilità",
                }),
                e.jsx("div", {
                  className:
                    "flex rounded-lg border border-gray-300 overflow-hidden text-sm",
                  children: ["all", "admin"].map((s) =>
                    e.jsx(
                      "button",
                      {
                        type: "button",
                        onClick: () => p(s),
                        className: `flex-1 py-2 font-medium transition-colors ${u === s ? "bg-[#177246] text-white" : "text-gray-600 hover:bg-gray-50"}`,
                        children: s === "all" ? "Tutti" : "Solo admin",
                      },
                      s,
                    ),
                  ),
                }),
              ],
            }),
            e.jsxs("div", {
              children: [
                e.jsx("label", {
                  className: "block text-xs font-medium text-gray-700 mb-1.5",
                  children: "Ruolo (opzionale)",
                }),
                e.jsx("div", {
                  className:
                    "flex rounded-lg border border-gray-300 overflow-hidden text-sm",
                  children: ["", f.PILOT, f.CABIN_CREW].map((s) =>
                    e.jsx(
                      "button",
                      {
                        type: "button",
                        onClick: () => n(s),
                        className: `flex-1 py-2 font-medium transition-colors ${o === s ? "bg-[#177246] text-white" : "text-gray-600 hover:bg-gray-50"}`,
                        children:
                          s === "" ? "Tutti" : s === f.PILOT ? "Piloti" : "CC",
                      },
                      s,
                    ),
                  ),
                }),
              ],
            }),
          ],
        }),
        e.jsxs("div", {
          className:
            "flex justify-end gap-3 px-6 py-4 border-t border-gray-100",
          children: [
            e.jsx("button", {
              onClick: a,
              className: "px-4 py-2 text-sm text-gray-600 hover:text-gray-800",
              children: "Annulla",
            }),
            e.jsxs("button", {
              onClick: b,
              disabled: !t,
              className:
                "flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[#177246] text-white rounded-lg hover:bg-[#177246]/90 disabled:opacity-50 transition-colors",
              children: [
                g
                  ? e.jsx(C, { size: 14, className: "animate-spin" })
                  : e.jsx(k, { size: 14 }),
                g ? "Caricamento…" : "Carica",
              ],
            }),
          ],
        }),
      ],
    }),
  });
}
function _() {
  const [a, d] = r.useState(!1),
    [l, c] = r.useState(null),
    [i, m] = r.useState(null),
    [u, p] = r.useState(null),
    o = R(),
    { data: n, isLoading: g } = T({
      queryKey: ["knowledgeBase"],
      queryFn: w.getDocuments,
      refetchInterval: (t) => {
        const b = t.state.data;
        return b != null &&
          b.some((s) => s.status === "indexing" || s.status === "pending")
          ? 1e4
          : !1;
      },
    }),
    h =
      n == null
        ? void 0
        : n.some((t) => t.status === "indexing" || t.status === "pending");
  r.useEffect(() => {
    if (!h) return;
    const t = setInterval(
      () => o.invalidateQueries({ queryKey: ["knowledgeBase"] }),
      1e4,
    );
    return () => clearInterval(t);
  }, [h, o]);
  const x = () => o.invalidateQueries({ queryKey: ["knowledgeBase"] }),
    j = async (t) => {
      if (confirm(`Eliminare "${t.title}"?`)) {
        c(t.id);
        try {
          (await w.deleteDocument(t.id), x());
        } catch {
          p("Impossibile eliminare il documento");
        } finally {
          c(null);
        }
      }
    },
    N = async (t) => {
      if (confirm(`Reindicizzare "${t.title}"?`)) {
        m(t.id);
        try {
          (await w.reindexDocument(t.id), x());
        } catch {
          p("Impossibile reindicizzare il documento");
        } finally {
          m(null);
        }
      }
    };
  return e.jsxs("div", {
    className: "p-6 max-w-5xl mx-auto",
    children: [
      e.jsxs("div", {
        className: "flex items-center justify-between mb-6",
        children: [
          e.jsxs("div", {
            children: [
              e.jsx("h1", {
                className: "text-2xl font-bold text-gray-900",
                children: "Base di conoscenza",
              }),
              e.jsxs("p", {
                className: "text-sm text-gray-500 mt-0.5",
                children: [
                  (n == null ? void 0 : n.length) ?? 0,
                  " documenti · usati dall'assistente AI",
                ],
              }),
            ],
          }),
          e.jsxs("button", {
            onClick: () => d(!0),
            className:
              "flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[#177246] text-white rounded-lg hover:bg-[#177246]/90 transition-colors",
            children: [e.jsx(k, { size: 15 }), " Carica PDF"],
          }),
        ],
      }),
      u &&
        e.jsxs("div", {
          className:
            "flex items-center justify-between p-3 mb-4 bg-red-50 text-red-700 rounded-lg text-sm",
          children: [
            e.jsx("span", { children: u }),
            e.jsx("button", {
              onClick: () => p(null),
              children: e.jsx(z, { size: 15 }),
            }),
          ],
        }),
      g
        ? e.jsx("div", {
            className: "flex justify-center py-16",
            children: e.jsx("div", {
              className:
                "w-7 h-7 border-4 border-[#177246] border-t-transparent rounded-full animate-spin",
            }),
          })
        : n != null && n.length
          ? e.jsx("div", {
              className:
                "bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden",
              children: e.jsxs("table", {
                className: "w-full text-sm",
                children: [
                  e.jsx("thead", {
                    className: "bg-gray-50 border-b border-gray-200",
                    children: e.jsxs("tr", {
                      children: [
                        e.jsx("th", {
                          className:
                            "px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider",
                          children: "Documento",
                        }),
                        e.jsx("th", {
                          className:
                            "px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-32",
                          children: "Stato",
                        }),
                        e.jsx("th", {
                          className:
                            "px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-28",
                          children: "Visibilità",
                        }),
                        e.jsx("th", {
                          className:
                            "px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-28 hidden md:table-cell",
                          children: "Ruolo",
                        }),
                        e.jsx("th", {
                          className:
                            "px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-20 hidden lg:table-cell",
                          children: "Chunks",
                        }),
                        e.jsx("th", { className: "px-4 py-3 w-24" }),
                      ],
                    }),
                  }),
                  e.jsx("tbody", {
                    className: "divide-y divide-gray-100",
                    children: n.map((t) =>
                      e.jsxs(
                        "tr",
                        {
                          className: "group hover:bg-gray-50 transition-colors",
                          children: [
                            e.jsx("td", {
                              className: "px-4 py-3",
                              children: e.jsxs("div", {
                                className: "flex items-center gap-2.5",
                                children: [
                                  e.jsx(I, {
                                    size: 16,
                                    className:
                                      t.status === "ready"
                                        ? "text-[#177246]"
                                        : "text-gray-400",
                                  }),
                                  e.jsxs("div", {
                                    children: [
                                      e.jsx("p", {
                                        className: "font-medium text-gray-900",
                                        children: t.title,
                                      }),
                                      e.jsx("p", {
                                        className:
                                          "text-xs text-gray-400 font-mono",
                                        children: t.filename,
                                      }),
                                    ],
                                  }),
                                ],
                              }),
                            }),
                            e.jsx("td", {
                              className: "px-4 py-3",
                              children: e.jsx(F, { status: t.status }),
                            }),
                            e.jsx("td", {
                              className: "px-4 py-3",
                              children: e.jsx($, { level: t.accessLevel }),
                            }),
                            e.jsx("td", {
                              className:
                                "px-4 py-3 hidden md:table-cell text-xs text-gray-500",
                              children:
                                t.ruolo === f.PILOT
                                  ? "Piloti"
                                  : t.ruolo === f.CABIN_CREW
                                    ? "Cabin Crew"
                                    : "Tutti",
                            }),
                            e.jsx("td", {
                              className:
                                "px-4 py-3 hidden lg:table-cell text-xs text-gray-500",
                              children: t.chunkCount > 0 ? t.chunkCount : "—",
                            }),
                            e.jsx("td", {
                              className: "px-4 py-3",
                              children: e.jsxs("div", {
                                className:
                                  "flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity",
                                children: [
                                  e.jsx("button", {
                                    onClick: () => N(t),
                                    disabled:
                                      i === t.id || t.status === "indexing",
                                    className:
                                      "p-1.5 text-gray-400 hover:text-[#177246] hover:bg-[#177246]/10 rounded-lg transition-colors disabled:opacity-40",
                                    title: "Reindicizza",
                                    children:
                                      i === t.id
                                        ? e.jsx(C, {
                                            size: 14,
                                            className: "animate-spin",
                                          })
                                        : e.jsx(L, { size: 14 }),
                                  }),
                                  e.jsx("button", {
                                    onClick: () => j(t),
                                    disabled: l === t.id,
                                    className:
                                      "p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40",
                                    title: "Elimina",
                                    children:
                                      l === t.id
                                        ? e.jsx(C, {
                                            size: 14,
                                            className: "animate-spin",
                                          })
                                        : e.jsx(P, { size: 14 }),
                                  }),
                                ],
                              }),
                            }),
                          ],
                        },
                        t.id,
                      ),
                    ),
                  }),
                ],
              }),
            })
          : e.jsxs("div", {
              className:
                "flex flex-col items-center justify-center py-24 text-center text-gray-400",
              children: [
                e.jsx(B, { size: 40, className: "mb-3 opacity-40" }),
                e.jsx("p", {
                  className: "font-medium",
                  children: "Nessun documento",
                }),
                e.jsx("p", {
                  className: "text-sm mt-1",
                  children:
                    "Carica PDF per alimentare la base di conoscenza dell'AI",
                }),
              ],
            }),
      a && e.jsx(U, { onClose: () => d(!1), onUploaded: x }),
    ],
  });
}
export { _ as KnowledgeBasePage };
