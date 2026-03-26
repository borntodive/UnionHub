import {
  c as D,
  p as I,
  a as _,
  r as j,
  j as t,
  B as W,
  C as u,
  I as h,
} from "./index-DFehVeka.js";
const w = { type: "none", startTime: "", callTime: "", splitDuty: !1 },
  F = {
    reportTime: "",
    sectors: 2,
    wakeTime: "04:30",
    standby: { ...w },
    dutyStart: "",
    finishTime: "",
    isHomeBase: !0,
    currentFdp: "12:00",
    extType: "planned",
  },
  L = D()(
    I(
      (e) => ({
        ...F,
        standby: { ...w },
        set: (a) => e((n) => ({ ...n, ...a })),
        reset: () => e({ ...F, standby: { ...w } }),
      }),
      { name: "ftl-web-storage", storage: _(() => localStorage) },
    ),
  ),
  P = [
    {
      from: 360,
      to: 810,
      limits: [780, 750, 720, 690, 660, 630, 600, 570, 540],
    },
    {
      from: 810,
      to: 840,
      limits: [765, 735, 705, 675, 645, 615, 585, 555, 540],
    },
    {
      from: 840,
      to: 870,
      limits: [750, 720, 690, 660, 630, 600, 570, 540, 540],
    },
    {
      from: 870,
      to: 900,
      limits: [735, 705, 675, 645, 615, 585, 555, 540, 540],
    },
    {
      from: 900,
      to: 930,
      limits: [720, 690, 660, 630, 600, 570, 540, 540, 540],
    },
    {
      from: 930,
      to: 960,
      limits: [705, 675, 645, 615, 585, 555, 540, 540, 540],
    },
    {
      from: 960,
      to: 990,
      limits: [690, 660, 630, 600, 570, 540, 540, 540, 540],
    },
    {
      from: 990,
      to: 1020,
      limits: [675, 645, 615, 585, 555, 540, 540, 540, 540],
    },
    {
      from: 1020,
      to: 300,
      limits: [660, 630, 600, 570, 540, 540, 540, 540, 540],
    },
    {
      from: 300,
      to: 315,
      limits: [720, 690, 660, 630, 600, 570, 540, 540, 540],
    },
    {
      from: 315,
      to: 330,
      limits: [735, 705, 675, 645, 615, 585, 555, 540, 540],
    },
    {
      from: 330,
      to: 345,
      limits: [750, 720, 690, 660, 630, 600, 570, 540, 540],
    },
    {
      from: 345,
      to: 360,
      limits: [765, 735, 705, 675, 645, 615, 585, 555, 540],
    },
  ],
  $ = 120,
  z = 360,
  O = 1080,
  R = 540;
function X(e, a) {
  return e.from <= e.to ? a >= e.from && a < e.to : a >= e.from || a < e.to;
}
function G(e) {
  return P.find((a) => X(a, e));
}
function U(e) {
  return e <= 2 ? 0 : e >= 10 ? 8 : e - 2;
}
function Y(e, a) {
  const n = e + a;
  let r = 0;
  for (const l of [0, 1440]) {
    const o = $ + l,
      d = z + l,
      s = Math.max(e, o),
      i = Math.min(n, d);
    i > s && (r += i - s);
  }
  return r;
}
function x(e) {
  const [a, n] = e.split(":").map(Number);
  return a * 60 + n;
}
function N(e) {
  const a = Math.floor(e / 60),
    n = e % 60;
  return `${String(a).padStart(2, "0")}:${String(n).padStart(2, "0")}`;
}
function J(e, a, n) {
  const r = (a - e + 1440) % 1440,
    l = 1380,
    o = 420;
  let d = 0;
  for (let s = 0; s <= 1; s++) {
    const i = l + s * 1440,
      c = o + (s + 1) * 1440,
      p = e + s * 0,
      v = e + r,
      b = Math.max(p, i),
      y = Math.min(v, c);
    y > b && (d += y - b);
  }
  return Math.max(0, r - d);
}
function K(e, a) {
  if (e >= 1200 && e < 1380) return 1140;
  const r = e >= 1380 || e < 420 ? 420 : 600;
  let l = a;
  return (
    r === 420 && a >= 1380 && (l = a - 1440),
    ((Math.min(r, l) % 1440) + 1440) % 1440
  );
}
function C(e, a, n) {
  const r = G(e),
    l = r ? r.limits[U(a)] : R;
  let o = Number.MAX_SAFE_INTEGER,
    d = null;
  const s = (n == null ? void 0 : n.type) ?? "none";
  if (s === "home" && n != null && n.startTime) {
    const g = x(n.startTime),
      m = n.callTime ? x(n.callTime) : e;
    d = K(g, m);
    const k = (e - d + 1440) % 1440;
    o = O - k;
  }
  let i = 0,
    c = Number.MAX_SAFE_INTEGER;
  if (s === "airport" && n != null && n.startTime) {
    const g = x(n.startTime),
      m = (e - g + 1440) % 1440;
    ((i = Math.max(m - 240, 0)), (c = Math.max(0, 960 - m)));
  } else if (s === "home" && n != null && n.startTime) {
    const g = x(n.startTime),
      m = n.callTime ? x(n.callTime) : null,
      S =
        m !== null && (m >= 1380 || m < 420) && m !== null
          ? (e - m + 1440) % 1440
          : J(g, e),
      M = n.splitDuty ? 480 : 360;
    S > M && (i = S - M);
  }
  const p = l - i,
    v = o < p && o < c,
    b = i > 0,
    y = c < p && c < o && c !== Number.MAX_SAFE_INTEGER,
    T = Math.max(R, Math.min(p, o, c)),
    A = Y(e, T),
    H = e >= 300 && e < 360,
    E = (e + T) % 1440,
    B = (e >= 120 && e < 300) || (e < 120 && E >= 120 && E < 360);
  return {
    maxFdp: T,
    tableMax: l,
    awakeMax: o,
    assumedWakeMinutes: d,
    limitedByAwake: v,
    limitedByStandby: b,
    limitedBy16hCap: y,
    standbyReduction: i,
    woclEncroachmentMin: A,
    isEarlyStart: H,
    isNightDuty: B,
  };
}
function V(e, a) {
  return { minRest: a ? Math.max(e, 720) : Math.max(e, 600) };
}
function q(e, a, n, r, l) {
  const o = C(e, a, l),
    d = n === "planned" ? 60 : 120,
    s = o.maxFdp + d;
  if (
    l &&
    (l.type === "airport" || l.type === "home") &&
    o.awakeMax !== Number.MAX_SAFE_INTEGER &&
    s > o.awakeMax
  )
    return { allowed: !1, extendedFdp: s, reason: "awakeRuleViolated" };
  if (n === "planned") {
    if (e < 300 || (e >= 360 && e < 375) || e >= 1140)
      return { allowed: !1, extendedFdp: s, reason: "reportTimeNotAllowed" };
    const c = r / 60;
    if (c > 2 && a > 2)
      return { allowed: !1, extendedFdp: s, reason: "maxSectorsExceeded" };
    if (c > 0 && c <= 2 && a > 4)
      return { allowed: !1, extendedFdp: s, reason: "maxSectorsExceeded" };
    if (c === 0 && a > 5)
      return { allowed: !1, extendedFdp: s, reason: "maxSectorsExceeded" };
  }
  return { allowed: !0, extendedFdp: s };
}
function f({ ok: e, label: a }) {
  return t.jsx("span", {
    className: `inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${e ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`,
    children: a,
  });
}
function Z() {
  const e = L(),
    [a, n] = j.useState("fdp"),
    r = j.useMemo(() => {
      if (!e.reportTime) return null;
      try {
        const s = x(e.reportTime);
        return C(s, e.sectors, e.standby.type !== "none" ? e.standby : void 0);
      } catch {
        return null;
      }
    }, [e.reportTime, e.sectors, e.standby]),
    l = j.useMemo(() => {
      if (!e.reportTime || !e.currentFdp) return null;
      try {
        const s = x(e.reportTime),
          i = (r == null ? void 0 : r.woclEncroachmentMin) ?? 0;
        return q(
          s,
          e.sectors,
          e.extType,
          i,
          e.standby.type !== "none" ? e.standby : void 0,
        );
      } catch {
        return null;
      }
    }, [e.reportTime, e.sectors, e.extType, e.currentFdp, r, e.standby]),
    o = j.useMemo(() => {
      if (!e.dutyStart || !e.finishTime) return null;
      try {
        const s = x(e.dutyStart);
        let i = x(e.finishTime);
        i <= s && (i += 1440);
        const c = i - s;
        return V(c, e.isHomeBase);
      } catch {
        return null;
      }
    }, [e.dutyStart, e.finishTime, e.isHomeBase]),
    d = [
      { id: "fdp", label: "FDP Massimo" },
      { id: "extension", label: "Estensione" },
      { id: "rest", label: "Riposo Minimo" },
    ];
  return t.jsxs("div", {
    className: "flex h-full min-h-0",
    children: [
      t.jsxs("div", {
        className: "flex-1 overflow-y-auto p-6 min-w-0",
        children: [
          t.jsxs("div", {
            className: "flex items-center justify-between mb-6",
            children: [
              t.jsx("h1", {
                className: "text-xl font-bold text-gray-900",
                children: "FTL Calculator",
              }),
              t.jsx(W, {
                variant: "ghost",
                size: "sm",
                onClick: () => e.reset(),
                children: "Reset",
              }),
            ],
          }),
          t.jsx("div", {
            className: "flex border-b border-gray-200 mb-6 gap-1",
            children: d.map((s) =>
              t.jsx(
                "button",
                {
                  onClick: () => n(s.id),
                  className: `px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${a === s.id ? "bg-white border border-b-white border-gray-200 text-[#177246] -mb-px" : "text-gray-500 hover:text-gray-700"}`,
                  children: s.label,
                },
                s.id,
              ),
            ),
          }),
          a === "fdp" &&
            t.jsxs("div", {
              className: "space-y-5",
              children: [
                t.jsxs(u, {
                  padding: "md",
                  children: [
                    t.jsx("h3", {
                      className:
                        "text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide",
                      children: "Report & Settori",
                    }),
                    t.jsxs("div", {
                      className: "grid grid-cols-3 gap-4",
                      children: [
                        t.jsx(h, {
                          label: "Report time (HH:MM)",
                          placeholder: "06:00",
                          value: e.reportTime,
                          onChange: (s) =>
                            e.set({ reportTime: s.target.value }),
                        }),
                        t.jsxs("div", {
                          children: [
                            t.jsx("label", {
                              className:
                                "text-xs font-medium text-gray-600 block mb-1.5",
                              children: "Settori",
                            }),
                            t.jsx("div", {
                              className: "flex gap-1 flex-wrap",
                              children: [1, 2, 3, 4, 5, 6, 7, 8].map((s) =>
                                t.jsx(
                                  "button",
                                  {
                                    onClick: () => e.set({ sectors: s }),
                                    className: `w-9 h-9 rounded-lg text-sm font-semibold transition-colors ${e.sectors === s ? "bg-[#177246] text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`,
                                    children: s,
                                  },
                                  s,
                                ),
                              ),
                            }),
                          ],
                        }),
                        t.jsx(h, {
                          label: "Wake time (HH:MM)",
                          placeholder: "04:30",
                          value: e.wakeTime,
                          onChange: (s) => e.set({ wakeTime: s.target.value }),
                        }),
                      ],
                    }),
                  ],
                }),
                t.jsxs(u, {
                  padding: "md",
                  children: [
                    t.jsx("h3", {
                      className:
                        "text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide",
                      children: "Standby",
                    }),
                    t.jsxs("div", {
                      className: "grid grid-cols-2 gap-4",
                      children: [
                        t.jsxs("div", {
                          children: [
                            t.jsx("label", {
                              className:
                                "text-xs font-medium text-gray-600 block mb-1",
                              children: "Tipo standby",
                            }),
                            t.jsxs("select", {
                              value: e.standby.type,
                              onChange: (s) =>
                                e.set({
                                  standby: {
                                    ...e.standby,
                                    type: s.target.value,
                                  },
                                }),
                              className:
                                "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#177246]",
                              children: [
                                t.jsx("option", {
                                  value: "none",
                                  children: "Nessuno",
                                }),
                                t.jsx("option", {
                                  value: "airport",
                                  children: "Airport standby",
                                }),
                                t.jsx("option", {
                                  value: "home",
                                  children: "Home standby",
                                }),
                                t.jsx("option", {
                                  value: "reserve",
                                  children: "Reserve",
                                }),
                              ],
                            }),
                          ],
                        }),
                        e.standby.type !== "none" &&
                          t.jsxs(t.Fragment, {
                            children: [
                              t.jsx(h, {
                                label: "Inizio standby (HH:MM)",
                                placeholder: "00:00",
                                value: e.standby.startTime,
                                onChange: (s) =>
                                  e.set({
                                    standby: {
                                      ...e.standby,
                                      startTime: s.target.value,
                                    },
                                  }),
                              }),
                              t.jsx(h, {
                                label: "Call time (HH:MM)",
                                placeholder: "00:00",
                                value: e.standby.callTime,
                                onChange: (s) =>
                                  e.set({
                                    standby: {
                                      ...e.standby,
                                      callTime: s.target.value,
                                    },
                                  }),
                              }),
                            ],
                          }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
          a === "extension" &&
            t.jsxs(u, {
              padding: "md",
              children: [
                t.jsx("h3", {
                  className:
                    "text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide",
                  children: "Parametri Estensione",
                }),
                t.jsxs("div", {
                  className: "grid grid-cols-2 gap-4",
                  children: [
                    t.jsx(h, {
                      label: "FDP corrente (HH:MM)",
                      placeholder: "12:00",
                      value: e.currentFdp,
                      onChange: (s) => e.set({ currentFdp: s.target.value }),
                    }),
                    t.jsxs("div", {
                      children: [
                        t.jsx("label", {
                          className:
                            "text-xs font-medium text-gray-600 block mb-1",
                          children: "Tipo estensione",
                        }),
                        t.jsxs("select", {
                          value: e.extType,
                          onChange: (s) => e.set({ extType: s.target.value }),
                          className:
                            "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#177246]",
                          children: [
                            t.jsx("option", {
                              value: "planned",
                              children: "Pianificata",
                            }),
                            t.jsx("option", {
                              value: "discretionary",
                              children: "Discrezionale",
                            }),
                          ],
                        }),
                      ],
                    }),
                  ],
                }),
                t.jsx("p", {
                  className: "text-xs text-gray-500 mt-3",
                  children:
                    "Il report time e i settori vengono presi dal tab FDP.",
                }),
              ],
            }),
          a === "rest" &&
            t.jsxs(u, {
              padding: "md",
              children: [
                t.jsx("h3", {
                  className:
                    "text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide",
                  children: "Dati Servizio",
                }),
                t.jsxs("div", {
                  className: "grid grid-cols-2 gap-4",
                  children: [
                    t.jsx(h, {
                      label: "Inizio duty (HH:MM)",
                      placeholder: "06:00",
                      value: e.dutyStart,
                      onChange: (s) => e.set({ dutyStart: s.target.value }),
                    }),
                    t.jsx(h, {
                      label: "Fine duty (HH:MM)",
                      placeholder: "18:30",
                      value: e.finishTime,
                      onChange: (s) => e.set({ finishTime: s.target.value }),
                    }),
                    t.jsxs("div", {
                      className: "flex items-center gap-2 col-span-2",
                      children: [
                        t.jsx("input", {
                          type: "checkbox",
                          id: "homeBase",
                          checked: e.isHomeBase,
                          onChange: (s) =>
                            e.set({ isHomeBase: s.target.checked }),
                          className:
                            "rounded border-gray-300 text-[#177246] focus:ring-[#177246]",
                        }),
                        t.jsx("label", {
                          htmlFor: "homeBase",
                          className: "text-sm text-gray-700",
                          children: "Home base (riposo aumentato)",
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
        ],
      }),
      t.jsxs("div", {
        className:
          "w-80 flex-shrink-0 border-l border-gray-200 bg-white overflow-y-auto p-5 space-y-4",
        children: [
          t.jsx("h2", {
            className:
              "text-sm font-bold text-gray-700 uppercase tracking-wide",
            children: "Risultati",
          }),
          r &&
            t.jsxs(u, {
              padding: "sm",
              shadow: "none",
              className: "border-[#177246]/30",
              children: [
                t.jsx("div", {
                  className:
                    "text-xs font-semibold text-[#177246] uppercase tracking-wide mb-3",
                  children: "FDP Massimo",
                }),
                t.jsx("div", {
                  className: "text-4xl font-bold text-gray-900 mb-1",
                  children: N(r.maxFdp),
                }),
                t.jsxs("div", {
                  className: "text-xs text-gray-500 mb-3",
                  children: ["Tabella: ", N(r.tableMax)],
                }),
                t.jsxs("div", {
                  className: "flex flex-wrap gap-1.5",
                  children: [
                    r.isEarlyStart &&
                      t.jsx(f, { ok: !1, label: "Early start" }),
                    r.isNightDuty && t.jsx(f, { ok: !1, label: "Night duty" }),
                    r.limitedByAwake &&
                      t.jsx(f, { ok: !1, label: "18h awake" }),
                    r.woclEncroachmentMin > 0 &&
                      t.jsx(f, {
                        ok: !1,
                        label: `WOCL +${r.woclEncroachmentMin}min`,
                      }),
                    r.standbyReduction > 0 &&
                      t.jsx(f, {
                        ok: !0,
                        label: `SBY −${r.standbyReduction}min`,
                      }),
                  ],
                }),
              ],
            }),
          l &&
            t.jsxs(u, {
              padding: "sm",
              shadow: "none",
              className: "border-blue-200",
              children: [
                t.jsx("div", {
                  className:
                    "text-xs font-semibold text-blue-600 uppercase tracking-wide mb-3",
                  children: "Estensione",
                }),
                l.allowed
                  ? t.jsxs(t.Fragment, {
                      children: [
                        t.jsx("div", {
                          className: "text-3xl font-bold text-gray-900 mb-1",
                          children: N(l.extendedFdp),
                        }),
                        t.jsx(f, { ok: !0, label: "Consentita" }),
                      ],
                    })
                  : t.jsxs(t.Fragment, {
                      children: [
                        t.jsx(f, { ok: !1, label: "Non consentita" }),
                        l.reason &&
                          t.jsx("p", {
                            className: "text-xs text-gray-500 mt-2",
                            children: l.reason,
                          }),
                      ],
                    }),
              ],
            }),
          o &&
            t.jsxs(u, {
              padding: "sm",
              shadow: "none",
              className: "border-purple-200",
              children: [
                t.jsx("div", {
                  className:
                    "text-xs font-semibold text-purple-600 uppercase tracking-wide mb-3",
                  children: "Riposo Minimo",
                }),
                t.jsx("div", {
                  className: "text-3xl font-bold text-gray-900",
                  children: N(o.minRest),
                }),
              ],
            }),
          !r &&
            !o &&
            t.jsxs("div", {
              className:
                "flex flex-col items-center justify-center h-48 text-gray-400",
              children: [
                t.jsx("div", { className: "text-4xl mb-3", children: "✈️" }),
                t.jsx("p", {
                  className: "text-sm text-center",
                  children: "Inserisci il report time per vedere i limiti FTL",
                }),
              ],
            }),
        ],
      }),
    ],
  });
}
export { Z as FtlPage };
