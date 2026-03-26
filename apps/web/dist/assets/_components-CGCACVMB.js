import { j as e, X as i } from "./index-DFehVeka.js";
function o({ title: t, onClose: s, children: r }) {
  return e.jsx("div", {
    className:
      "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40",
    onClick: s,
    children: e.jsxs("div", {
      className: "bg-white rounded-2xl shadow-2xl w-full max-w-md",
      onClick: (n) => n.stopPropagation(),
      children: [
        e.jsxs("div", {
          className:
            "flex items-center justify-between px-6 py-4 border-b border-gray-100",
          children: [
            e.jsx("h2", { className: "font-bold text-gray-900", children: t }),
            e.jsx("button", {
              onClick: s,
              className: "p-1 text-gray-400 hover:text-gray-600 rounded-lg",
              children: e.jsx(i, { size: 18 }),
            }),
          ],
        }),
        e.jsx("div", { className: "px-6 py-5", children: r }),
      ],
    }),
  });
}
function d({ name: t, loading: s, onConfirm: r, onClose: n }) {
  return e.jsx("div", {
    className:
      "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50",
    onClick: n,
    children: e.jsxs("div", {
      className: "bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full",
      onClick: (l) => l.stopPropagation(),
      children: [
        e.jsx("h3", {
          className: "font-bold text-gray-900 mb-1",
          children: "Conferma eliminazione",
        }),
        e.jsxs("p", {
          className: "text-sm text-gray-500 mb-5",
          children: [
            "Elimina",
            " ",
            e.jsxs("span", {
              className: "font-medium text-gray-800",
              children: ["«", t, "»"],
            }),
            "?",
            " ",
            e.jsx("span", {
              className: "text-red-500",
              children: "Questa azione non può essere annullata.",
            }),
          ],
        }),
        e.jsxs("div", {
          className: "flex gap-3 justify-end",
          children: [
            e.jsx("button", {
              onClick: n,
              className:
                "px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors",
              children: "Annulla",
            }),
            e.jsx("button", {
              onClick: r,
              disabled: s,
              className:
                "px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50",
              children: s ? "Eliminazione…" : "Elimina",
            }),
          ],
        }),
      ],
    }),
  });
}
function x({ message: t, onDismiss: s }) {
  return e.jsxs("div", {
    className:
      "flex items-center justify-between gap-3 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4",
    children: [
      e.jsxs("span", { children: ["⚠ ", t] }),
      e.jsx("button", {
        onClick: s,
        className: "text-red-400 hover:text-red-600 flex-shrink-0",
        children: e.jsx(i, { size: 15 }),
      }),
    ],
  });
}
const c =
    "w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#177246]/30",
  m = "block text-sm font-medium text-gray-700 mb-1";
export { x as A, d as C, o as F, c as i, m as l };
