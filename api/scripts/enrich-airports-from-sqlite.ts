/**
 * Enrichment script: reads Navigraph AIRAC SQLite → generates TypeScript seed files
 * for volmet.seed.ts (airports) and runway-seed-data.json (runways).
 *
 * Run: npx ts-node --project tsconfig.json scripts/enrich-airports-from-sqlite.ts
 */

import Database from "better-sqlite3";
import * as fs from "fs";
import * as path from "path";

const SQLITE_PATH =
  process.env.SQLITE_PATH ||
  "/Users/andreacovelli/Downloads/Navigraph AIRAC 2604/simcontrol_native_2604/simcontrol.navdb";

// ── ICAO → VOLMET station mapping from Ryanair EFB ────────────────────────────
// Format: icao → { volmetFrequencies, volmetName, handlingFrequency }
// Source: Ryanair Destination Frequencies EFB document

const EFB_DATA: Record<
  string,
  {
    frequencies: string[];
    volmetName?: string;
    handlingFrequency?: string;
    region: string;
  }
> = {
  // ── ITALY ───────────────────────────────────────────────────────────────────
  LIRF: {
    frequencies: ["126.000"],
    volmetName: "Roma VOLMET",
    handlingFrequency: "131.425",
    region: "Italy",
  },
  LIRA: {
    frequencies: ["126.000"],
    volmetName: "Roma VOLMET",
    handlingFrequency: "131.725",
    region: "Italy",
  },
  LIMC: {
    frequencies: ["126.600"],
    volmetName: "Milano VOLMET",
    handlingFrequency: "131.975",
    region: "Italy",
  },
  LIME: {
    frequencies: ["126.600"],
    volmetName: "Milano VOLMET",
    handlingFrequency: "130.475",
    region: "Italy",
  },
  LIML: {
    frequencies: ["126.600"],
    volmetName: "Milano VOLMET",
    handlingFrequency: "130.475",
    region: "Italy",
  },
  LIBD: {
    frequencies: ["126.000"],
    volmetName: "Roma VOLMET",
    handlingFrequency: "130.475",
    region: "Italy",
  },
  LIBP: {
    frequencies: ["126.000"],
    volmetName: "Roma VOLMET",
    handlingFrequency: "130.475",
    region: "Italy",
  },
  LICC: {
    frequencies: ["126.000"],
    volmetName: "Roma VOLMET",
    handlingFrequency: "130.475",
    region: "Italy",
  },
  LIEO: {
    frequencies: ["126.000"],
    volmetName: "Roma VOLMET",
    handlingFrequency: "130.475",
    region: "Italy",
  },
  LIEE: {
    frequencies: ["126.000"],
    volmetName: "Roma VOLMET",
    handlingFrequency: "130.475",
    region: "Italy",
  },
  LICJ: {
    frequencies: ["126.000"],
    volmetName: "Roma VOLMET",
    handlingFrequency: "130.475",
    region: "Italy",
  },
  LIPE: {
    frequencies: ["126.000", "126.600"],
    volmetName: "Roma/Milano VOLMET",
    handlingFrequency: "130.475",
    region: "Italy",
  },
  LIPZ: {
    frequencies: ["126.000"],
    volmetName: "Roma VOLMET",
    handlingFrequency: "130.475",
    region: "Italy",
  },
  LIRN: {
    frequencies: ["126.000"],
    volmetName: "Roma VOLMET",
    handlingFrequency: "130.475",
    region: "Italy",
  },
  LIRQ: {
    frequencies: ["126.000"],
    volmetName: "Roma VOLMET",
    handlingFrequency: "130.475",
    region: "Italy",
  },
  LIPU: {
    frequencies: ["126.000"],
    volmetName: "Roma VOLMET",
    handlingFrequency: "130.475",
    region: "Italy",
  },
  LIBF: {
    frequencies: ["126.000"],
    volmetName: "Roma VOLMET",
    handlingFrequency: "130.475",
    region: "Italy",
  },
  LICA: {
    frequencies: ["126.000"],
    volmetName: "Roma VOLMET",
    handlingFrequency: "130.475",
    region: "Italy",
  },
  LIBN: {
    frequencies: ["126.000"],
    volmetName: "Roma VOLMET",
    handlingFrequency: "130.475",
    region: "Italy",
  },
  LIPH: {
    frequencies: ["126.000"],
    volmetName: "Roma VOLMET",
    handlingFrequency: "130.475",
    region: "Italy",
  },
  LIPX: {
    frequencies: ["126.000"],
    volmetName: "Roma VOLMET",
    handlingFrequency: "130.475",
    region: "Italy",
  },
  LICY: {
    frequencies: ["126.000"],
    volmetName: "Roma VOLMET",
    region: "Italy",
  },
  LICD: {
    frequencies: ["126.000"],
    volmetName: "Roma VOLMET",
    region: "Italy",
  },
  LICB: {
    frequencies: ["126.000"],
    volmetName: "Roma VOLMET",
    region: "Italy",
  },
  LIRJ: {
    frequencies: ["126.000"],
    volmetName: "Roma VOLMET",
    region: "Italy",
  },
  LICZ: {
    frequencies: ["126.000"],
    volmetName: "Roma VOLMET",
    region: "Italy",
  },
  LIRY: {
    frequencies: ["126.000"],
    volmetName: "Roma VOLMET",
    region: "Italy",
  },

  // ── UNITED KINGDOM ──────────────────────────────────────────────────────────
  EGLL: {
    frequencies: ["135.375"],
    volmetName: "London VOLMET Main",
    handlingFrequency: "131.525",
    region: "United Kingdom",
  },
  EGSS: {
    frequencies: ["135.375"],
    volmetName: "London VOLMET Main",
    handlingFrequency: "131.525",
    region: "United Kingdom",
  },
  EGGW: {
    frequencies: ["135.375"],
    volmetName: "London VOLMET Main",
    handlingFrequency: "131.525",
    region: "United Kingdom",
  },
  EGKK: {
    frequencies: ["135.375"],
    volmetName: "London VOLMET Main",
    handlingFrequency: "131.525",
    region: "United Kingdom",
  },
  EGLC: {
    frequencies: ["135.375"],
    volmetName: "London VOLMET Main",
    region: "United Kingdom",
  },
  EGCC: {
    frequencies: ["128.175"],
    volmetName: "London VOLMET North",
    handlingFrequency: "131.525",
    region: "United Kingdom",
  },
  EGPH: {
    frequencies: ["128.175"],
    volmetName: "London VOLMET North",
    handlingFrequency: "131.525",
    region: "United Kingdom",
  },
  EGPF: {
    frequencies: ["128.175"],
    volmetName: "London VOLMET North",
    handlingFrequency: "131.525",
    region: "United Kingdom",
  },
  EGBB: {
    frequencies: ["135.375"],
    volmetName: "London VOLMET Main",
    handlingFrequency: "131.525",
    region: "United Kingdom",
  },
  EGNX: {
    frequencies: ["128.175"],
    volmetName: "London VOLMET North",
    handlingFrequency: "131.525",
    region: "United Kingdom",
  },
  EGNT: {
    frequencies: ["128.175"],
    volmetName: "London VOLMET North",
    region: "United Kingdom",
  },
  EGPD: {
    frequencies: ["128.175"],
    volmetName: "London VOLMET North",
    region: "United Kingdom",
  },
  EGHI: {
    frequencies: ["135.375"],
    volmetName: "London VOLMET Main",
    region: "United Kingdom",
  },
  EGTE: {
    frequencies: ["135.375"],
    volmetName: "London VOLMET Main",
    region: "United Kingdom",
  },
  EGSH: {
    frequencies: ["135.375"],
    volmetName: "London VOLMET Main",
    region: "United Kingdom",
  },
  EGBJ: {
    frequencies: ["135.375"],
    volmetName: "London VOLMET Main",
    region: "United Kingdom",
  },
  EGAC: {
    frequencies: ["128.175"],
    volmetName: "London VOLMET North",
    region: "United Kingdom",
  },
  EGAA: {
    frequencies: ["128.175"],
    volmetName: "London VOLMET North",
    region: "United Kingdom",
  },
  EGNM: {
    frequencies: ["128.175"],
    volmetName: "London VOLMET North",
    region: "United Kingdom",
  },

  // ── IRELAND ─────────────────────────────────────────────────────────────────
  EIDW: {
    frequencies: ["135.675"],
    volmetName: "Shannon VOLMET",
    handlingFrequency: "131.525",
    region: "Ireland",
  },
  EICK: {
    frequencies: ["135.675"],
    volmetName: "Shannon VOLMET",
    region: "Ireland",
  },
  EINN: {
    frequencies: ["135.675"],
    volmetName: "Shannon VOLMET",
    region: "Ireland",
  },
  EIDL: {
    frequencies: ["135.675"],
    volmetName: "Shannon VOLMET",
    region: "Ireland",
  },

  // ── SPAIN ────────────────────────────────────────────────────────────────────
  LEMD: {
    frequencies: ["127.675"],
    volmetName: "Madrid VOLMET",
    handlingFrequency: "131.475",
    region: "Spain",
  },
  LEBL: {
    frequencies: ["127.675"],
    volmetName: "Madrid VOLMET",
    handlingFrequency: "131.475",
    region: "Spain",
  },
  LEVC: {
    frequencies: ["127.675"],
    volmetName: "Madrid VOLMET",
    handlingFrequency: "131.475",
    region: "Spain",
  },
  LEAL: {
    frequencies: ["127.675"],
    volmetName: "Madrid VOLMET",
    handlingFrequency: "131.475",
    region: "Spain",
  },
  LEMG: {
    frequencies: ["127.675"],
    volmetName: "Madrid VOLMET",
    handlingFrequency: "131.475",
    region: "Spain",
  },
  LEZL: {
    frequencies: ["127.675"],
    volmetName: "Madrid VOLMET",
    handlingFrequency: "131.475",
    region: "Spain",
  },
  LEBB: {
    frequencies: ["127.675"],
    volmetName: "Madrid VOLMET",
    region: "Spain",
  },
  LEGO: {
    frequencies: ["127.675"],
    volmetName: "Madrid VOLMET",
    region: "Spain",
  },
  LEGR: {
    frequencies: ["127.675"],
    volmetName: "Madrid VOLMET",
    region: "Spain",
  },
  LEVT: {
    frequencies: ["127.675"],
    volmetName: "Madrid VOLMET",
    region: "Spain",
  },
  LEAM: {
    frequencies: ["127.675"],
    volmetName: "Madrid VOLMET",
    region: "Spain",
  },
  LEPA: {
    frequencies: ["127.675"],
    volmetName: "Madrid VOLMET",
    handlingFrequency: "131.475",
    region: "Spain - Balearics",
  },
  LEIB: {
    frequencies: ["127.675"],
    volmetName: "Madrid VOLMET",
    handlingFrequency: "131.475",
    region: "Spain - Balearics",
  },
  LEMH: {
    frequencies: ["127.675"],
    volmetName: "Madrid VOLMET",
    region: "Spain - Balearics",
  },
  LXGB: {
    frequencies: ["127.675"],
    volmetName: "Madrid VOLMET",
    region: "Spain",
  },
  GCFV: {
    frequencies: ["127.675"],
    volmetName: "Canarias VOLMET",
    handlingFrequency: "131.475",
    region: "Spain - Canary Islands",
  },
  GCTS: {
    frequencies: ["127.675"],
    volmetName: "Canarias VOLMET",
    handlingFrequency: "131.475",
    region: "Spain - Canary Islands",
  },
  GCXO: {
    frequencies: ["127.675"],
    volmetName: "Canarias VOLMET",
    handlingFrequency: "131.475",
    region: "Spain - Canary Islands",
  },
  GCLP: {
    frequencies: ["127.675"],
    volmetName: "Canarias VOLMET",
    handlingFrequency: "131.475",
    region: "Spain - Canary Islands",
  },
  GCRR: {
    frequencies: ["127.675"],
    volmetName: "Canarias VOLMET",
    handlingFrequency: "131.475",
    region: "Spain - Canary Islands",
  },
  GCLA: {
    frequencies: ["127.675"],
    volmetName: "Canarias VOLMET",
    region: "Spain - Canary Islands",
  },

  // ── FRANCE ───────────────────────────────────────────────────────────────────
  LFPG: {
    frequencies: ["126.450"],
    volmetName: "Paris VOLMET",
    handlingFrequency: "131.425",
    region: "France",
  },
  LFPO: {
    frequencies: ["126.450"],
    volmetName: "Paris VOLMET",
    handlingFrequency: "131.425",
    region: "France",
  },
  LFMT: {
    frequencies: ["126.450"],
    volmetName: "Paris VOLMET",
    region: "France",
  },
  LFBT: {
    frequencies: ["126.450"],
    volmetName: "Paris VOLMET",
    region: "France",
  },
  LFBD: {
    frequencies: ["126.450"],
    volmetName: "Paris VOLMET",
    region: "France",
  },
  LFRS: {
    frequencies: ["126.450"],
    volmetName: "Paris VOLMET",
    region: "France",
  },
  LFRB: {
    frequencies: ["126.450"],
    volmetName: "Paris VOLMET",
    region: "France",
  },
  LFST: {
    frequencies: ["126.450"],
    volmetName: "Paris VOLMET",
    region: "France",
  },
  LFLB: {
    frequencies: ["126.450"],
    volmetName: "Paris VOLMET",
    region: "France",
  },
  LFMN: {
    frequencies: ["126.450"],
    volmetName: "Paris VOLMET",
    region: "France",
  },
  LFKJ: {
    frequencies: ["126.450"],
    volmetName: "Paris VOLMET",
    region: "France - Corsica",
  },
  LFKB: {
    frequencies: ["126.450"],
    volmetName: "Paris VOLMET",
    region: "France - Corsica",
  },
  LFRO: {
    frequencies: ["126.450"],
    volmetName: "Paris VOLMET",
    region: "France",
  },
  LFBZ: {
    frequencies: ["126.450"],
    volmetName: "Paris VOLMET",
    region: "France",
  },
  LFRN: {
    frequencies: ["126.450"],
    volmetName: "Paris VOLMET",
    region: "France",
  },
  LFML: {
    frequencies: ["126.450"],
    volmetName: "Paris VOLMET",
    region: "France",
  },

  // ── GERMANY ──────────────────────────────────────────────────────────────────
  EDDF: {
    frequencies: ["126.425"],
    volmetName: "Frankfurt VOLMET",
    handlingFrequency: "131.525",
    region: "Germany",
  },
  EDDB: {
    frequencies: ["126.425"],
    volmetName: "Frankfurt VOLMET",
    handlingFrequency: "131.525",
    region: "Germany",
  },
  EDDM: {
    frequencies: ["126.425"],
    volmetName: "Frankfurt VOLMET",
    handlingFrequency: "131.525",
    region: "Germany",
  },
  EDDS: {
    frequencies: ["126.425"],
    volmetName: "Frankfurt VOLMET",
    region: "Germany",
  },
  EDDH: {
    frequencies: ["127.000"],
    volmetName: "Amsterdam VOLMET",
    region: "Germany",
  },
  EDDK: {
    frequencies: ["126.425"],
    volmetName: "Frankfurt VOLMET",
    region: "Germany",
  },
  EDDL: {
    frequencies: ["126.425"],
    volmetName: "Frankfurt VOLMET",
    region: "Germany",
  },
  EDDN: {
    frequencies: ["126.425"],
    volmetName: "Frankfurt VOLMET",
    region: "Germany",
  },
  EDDC: {
    frequencies: ["126.425"],
    volmetName: "Frankfurt VOLMET",
    region: "Germany",
  },
  EDLV: {
    frequencies: ["127.000"],
    volmetName: "Amsterdam VOLMET",
    region: "Germany",
  },

  // ── NETHERLANDS ──────────────────────────────────────────────────────────────
  EHAM: {
    frequencies: ["127.000"],
    volmetName: "Amsterdam VOLMET",
    handlingFrequency: "131.525",
    region: "Netherlands",
  },
  EHRD: {
    frequencies: ["127.000"],
    volmetName: "Amsterdam VOLMET",
    region: "Netherlands",
  },
  EHEH: {
    frequencies: ["127.000"],
    volmetName: "Amsterdam VOLMET",
    region: "Netherlands",
  },

  // ── BELGIUM ──────────────────────────────────────────────────────────────────
  EBBR: {
    frequencies: ["127.000"],
    volmetName: "Amsterdam VOLMET",
    handlingFrequency: "131.525",
    region: "Belgium",
  },
  EBCI: {
    frequencies: ["127.000"],
    volmetName: "Amsterdam VOLMET",
    region: "Belgium",
  },
  EBLG: {
    frequencies: ["127.000"],
    volmetName: "Amsterdam VOLMET",
    region: "Belgium",
  },

  // ── LUXEMBOURG ───────────────────────────────────────────────────────────────
  ELLX: {
    frequencies: ["127.000"],
    volmetName: "Amsterdam VOLMET",
    region: "Luxembourg",
  },

  // ── SWITZERLAND ──────────────────────────────────────────────────────────────
  LSGG: {
    frequencies: ["126.425"],
    volmetName: "Frankfurt VOLMET",
    handlingFrequency: "131.525",
    region: "Switzerland",
  },
  LSZH: {
    frequencies: ["126.425"],
    volmetName: "Frankfurt VOLMET",
    handlingFrequency: "131.525",
    region: "Switzerland",
  },

  // ── AUSTRIA ──────────────────────────────────────────────────────────────────
  LOWW: {
    frequencies: ["126.425"],
    volmetName: "Frankfurt VOLMET",
    handlingFrequency: "131.525",
    region: "Austria",
  },
  LOWI: {
    frequencies: ["126.425"],
    volmetName: "Frankfurt VOLMET",
    region: "Austria",
  },

  // ── POLAND ───────────────────────────────────────────────────────────────────
  EPWA: {
    frequencies: ["126.425"],
    volmetName: "Warsaw VOLMET",
    handlingFrequency: "131.525",
    region: "Poland",
  },
  EPKK: {
    frequencies: ["126.425"],
    volmetName: "Warsaw VOLMET",
    handlingFrequency: "131.525",
    region: "Poland",
  },
  EPGD: {
    frequencies: ["126.425"],
    volmetName: "Warsaw VOLMET",
    region: "Poland",
  },
  EPWR: {
    frequencies: ["126.425"],
    volmetName: "Warsaw VOLMET",
    region: "Poland",
  },
  EPKT: {
    frequencies: ["126.425"],
    volmetName: "Warsaw VOLMET",
    region: "Poland",
  },
  EPPO: {
    frequencies: ["126.425"],
    volmetName: "Warsaw VOLMET",
    region: "Poland",
  },
  EPRZ: {
    frequencies: ["126.425"],
    volmetName: "Warsaw VOLMET",
    region: "Poland",
  },
  EPLL: {
    frequencies: ["126.425"],
    volmetName: "Warsaw VOLMET",
    region: "Poland",
  },
  EPBY: {
    frequencies: ["126.425"],
    volmetName: "Warsaw VOLMET",
    region: "Poland",
  },
  EPSC: {
    frequencies: ["126.425"],
    volmetName: "Warsaw VOLMET",
    region: "Poland",
  },
  EPBG: {
    frequencies: ["126.425"],
    volmetName: "Warsaw VOLMET",
    region: "Poland",
  },

  // ── CZECH REPUBLIC ───────────────────────────────────────────────────────────
  LKPR: {
    frequencies: ["126.425"],
    volmetName: "Frankfurt VOLMET",
    handlingFrequency: "131.525",
    region: "Czech Republic",
  },

  // ── SLOVAKIA ──────────────────────────────────────────────────────────────────
  LZIB: {
    frequencies: ["126.425"],
    volmetName: "Frankfurt VOLMET",
    region: "Slovakia",
  },

  // ── HUNGARY ──────────────────────────────────────────────────────────────────
  LHBP: {
    frequencies: ["126.425"],
    volmetName: "Budapest VOLMET",
    handlingFrequency: "131.525",
    region: "Hungary",
  },

  // ── ROMANIA ──────────────────────────────────────────────────────────────────
  LROP: {
    frequencies: ["126.450"],
    volmetName: "Bucharest VOLMET",
    handlingFrequency: "131.525",
    region: "Romania",
  },
  LRSB: {
    frequencies: ["126.450"],
    volmetName: "Bucharest VOLMET",
    region: "Romania",
  },
  LRCK: {
    frequencies: ["126.450"],
    volmetName: "Bucharest VOLMET",
    region: "Romania",
  },
  LRCL: {
    frequencies: ["126.450"],
    volmetName: "Bucharest VOLMET",
    region: "Romania",
  },

  // ── BULGARIA ──────────────────────────────────────────────────────────────────
  LBSF: {
    frequencies: ["126.450"],
    volmetName: "Sofia VOLMET",
    handlingFrequency: "131.525",
    region: "Bulgaria",
  },
  LBWN: {
    frequencies: ["126.450"],
    volmetName: "Sofia VOLMET",
    region: "Bulgaria",
  },
  LBBG: {
    frequencies: ["126.450"],
    volmetName: "Sofia VOLMET",
    region: "Bulgaria",
  },
  LBPD: {
    frequencies: ["126.450"],
    volmetName: "Sofia VOLMET",
    region: "Bulgaria",
  },

  // ── CROATIA ──────────────────────────────────────────────────────────────────
  LDZA: {
    frequencies: ["126.425"],
    volmetName: "Zagreb VOLMET",
    handlingFrequency: "131.525",
    region: "Croatia",
  },
  LDSP: {
    frequencies: ["126.425"],
    volmetName: "Zagreb VOLMET",
    region: "Croatia",
  },
  LDDU: {
    frequencies: ["126.425"],
    volmetName: "Zagreb VOLMET",
    region: "Croatia",
  },
  LDZD: {
    frequencies: ["126.425"],
    volmetName: "Zagreb VOLMET",
    region: "Croatia",
  },

  // ── SLOVENIA ──────────────────────────────────────────────────────────────────
  LJLJ: {
    frequencies: ["126.425"],
    volmetName: "Zagreb VOLMET",
    region: "Slovenia",
  },

  // ── SERBIA ────────────────────────────────────────────────────────────────────
  LYBE: {
    frequencies: ["126.425"],
    volmetName: "Belgrade VOLMET",
    region: "Serbia",
  },

  // ── NORTH MACEDONIA ──────────────────────────────────────────────────────────
  LWSK: {
    frequencies: ["126.425"],
    volmetName: "Belgrade VOLMET",
    region: "North Macedonia",
  },

  // ── ALBANIA ──────────────────────────────────────────────────────────────────
  LATI: {
    frequencies: ["126.425"],
    volmetName: "Rome VOLMET",
    region: "Albania",
  },

  // ── BOSNIA ────────────────────────────────────────────────────────────────────
  LQSA: {
    frequencies: ["126.425"],
    volmetName: "Zagreb VOLMET",
    region: "Bosnia Herzegovina",
  },
  LQMO: {
    frequencies: ["126.425"],
    volmetName: "Zagreb VOLMET",
    region: "Bosnia Herzegovina",
  },

  // ── MONTENEGRO ────────────────────────────────────────────────────────────────
  LYPG: {
    frequencies: ["126.425"],
    volmetName: "Belgrade VOLMET",
    region: "Montenegro",
  },

  // ── KOSOVO ────────────────────────────────────────────────────────────────────
  BKPR: {
    frequencies: ["126.425"],
    volmetName: "Belgrade VOLMET",
    region: "Kosovo",
  },

  // ── MOLDOVA ──────────────────────────────────────────────────────────────────
  LUKK: {
    frequencies: ["126.450"],
    volmetName: "Kiev VOLMET",
    region: "Moldova",
  },

  // ── LITHUANIA ─────────────────────────────────────────────────────────────────
  EYVI: {
    frequencies: ["126.425"],
    volmetName: "Helsinki VOLMET",
    region: "Lithuania",
  },

  // ── LATVIA ────────────────────────────────────────────────────────────────────
  EVRA: {
    frequencies: ["126.425"],
    volmetName: "Helsinki VOLMET",
    region: "Latvia",
  },

  // ── ESTONIA ──────────────────────────────────────────────────────────────────
  EETN: {
    frequencies: ["126.425"],
    volmetName: "Helsinki VOLMET",
    region: "Estonia",
  },

  // ── DENMARK ──────────────────────────────────────────────────────────────────
  EKCH: {
    frequencies: ["127.000"],
    volmetName: "Amsterdam VOLMET",
    handlingFrequency: "131.525",
    region: "Denmark",
  },
  EKBI: {
    frequencies: ["127.000"],
    volmetName: "Amsterdam VOLMET",
    region: "Denmark",
  },

  // ── NORWAY ────────────────────────────────────────────────────────────────────
  ENGM: {
    frequencies: ["127.000"],
    volmetName: "Stockholm VOLMET",
    region: "Norway",
  },
  ENBR: {
    frequencies: ["127.000"],
    volmetName: "Stockholm VOLMET",
    region: "Norway",
  },

  // ── SWEDEN ────────────────────────────────────────────────────────────────────
  ESSA: {
    frequencies: ["127.000"],
    volmetName: "Stockholm VOLMET",
    handlingFrequency: "131.525",
    region: "Sweden",
  },
  ESGG: {
    frequencies: ["127.000"],
    volmetName: "Stockholm VOLMET",
    region: "Sweden",
  },
  ESMS: {
    frequencies: ["127.000"],
    volmetName: "Stockholm VOLMET",
    region: "Sweden",
  },

  // ── FINLAND ──────────────────────────────────────────────────────────────────
  EFHK: {
    frequencies: ["127.000"],
    volmetName: "Helsinki VOLMET",
    handlingFrequency: "131.525",
    region: "Finland",
  },
  EFTP: {
    frequencies: ["127.000"],
    volmetName: "Helsinki VOLMET",
    region: "Finland",
  },

  // ── PORTUGAL ──────────────────────────────────────────────────────────────────
  LPPT: {
    frequencies: ["127.675"],
    volmetName: "Madrid VOLMET",
    handlingFrequency: "131.475",
    region: "Portugal",
  },
  LPFR: {
    frequencies: ["127.675"],
    volmetName: "Madrid VOLMET",
    handlingFrequency: "131.475",
    region: "Portugal",
  },
  LPPR: {
    frequencies: ["127.675"],
    volmetName: "Madrid VOLMET",
    handlingFrequency: "131.475",
    region: "Portugal",
  },
  LPMA: {
    frequencies: ["127.675"],
    volmetName: "Madrid VOLMET",
    region: "Portugal",
  },
  LPLA: {
    frequencies: ["127.675"],
    volmetName: "Madrid VOLMET",
    region: "Portugal - Azores",
  },
  LPPD: {
    frequencies: ["127.675"],
    volmetName: "Madrid VOLMET",
    region: "Portugal - Azores",
  },

  // ── GREECE ────────────────────────────────────────────────────────────────────
  LGAV: {
    frequencies: ["126.450"],
    volmetName: "Athens VOLMET",
    handlingFrequency: "131.475",
    region: "Greece",
  },
  LGTH: {
    frequencies: ["126.450"],
    volmetName: "Athens VOLMET",
    region: "Greece",
  },
  LGRP: {
    frequencies: ["126.450"],
    volmetName: "Athens VOLMET",
    handlingFrequency: "131.475",
    region: "Greece",
  },
  LGIR: {
    frequencies: ["126.450"],
    volmetName: "Athens VOLMET",
    handlingFrequency: "131.475",
    region: "Greece",
  },
  LGSK: {
    frequencies: ["126.450"],
    volmetName: "Athens VOLMET",
    region: "Greece",
  },
  LGMK: {
    frequencies: ["126.450"],
    volmetName: "Athens VOLMET",
    region: "Greece",
  },
  LGKF: {
    frequencies: ["126.450"],
    volmetName: "Athens VOLMET",
    region: "Greece",
  },
  LGZA: {
    frequencies: ["126.450"],
    volmetName: "Athens VOLMET",
    region: "Greece",
  },
  LGKR: {
    frequencies: ["126.450"],
    volmetName: "Athens VOLMET",
    handlingFrequency: "131.475",
    region: "Greece",
  },
  LGPZ: {
    frequencies: ["126.450"],
    volmetName: "Athens VOLMET",
    region: "Greece",
  },
  LGST: {
    frequencies: ["126.450"],
    volmetName: "Athens VOLMET",
    region: "Greece",
  },
  LGKO: {
    frequencies: ["126.450"],
    volmetName: "Athens VOLMET",
    handlingFrequency: "131.475",
    region: "Greece",
  },
  LGHI: {
    frequencies: ["126.450"],
    volmetName: "Athens VOLMET",
    region: "Greece",
  },
  LGPL: {
    frequencies: ["126.450"],
    volmetName: "Athens VOLMET",
    region: "Greece",
  },
  LGSM: {
    frequencies: ["126.450"],
    volmetName: "Athens VOLMET",
    region: "Greece",
  },
  LGMT: {
    frequencies: ["126.450"],
    volmetName: "Athens VOLMET",
    region: "Greece",
  },
  LGLM: {
    frequencies: ["126.450"],
    volmetName: "Athens VOLMET",
    region: "Greece",
  },
  LGKP: {
    frequencies: ["126.450"],
    volmetName: "Athens VOLMET",
    region: "Greece",
  },

  // ── CYPRUS ────────────────────────────────────────────────────────────────────
  LCPH: {
    frequencies: ["126.450"],
    volmetName: "Nicosia VOLMET",
    region: "Cyprus",
  },
  LCLK: {
    frequencies: ["126.450"],
    volmetName: "Nicosia VOLMET",
    region: "Cyprus",
  },

  // ── MALTA ──────────────────────────────────────────────────────────────────────
  LMML: {
    frequencies: ["126.000"],
    volmetName: "Roma VOLMET",
    handlingFrequency: "131.425",
    region: "Malta",
  },

  // ── TURKEY ────────────────────────────────────────────────────────────────────
  LTBA: {
    frequencies: ["126.450"],
    volmetName: "Istanbul VOLMET",
    region: "Turkey",
  },
  LTFJ: {
    frequencies: ["126.450"],
    volmetName: "Istanbul VOLMET",
    region: "Turkey",
  },
  LTAI: {
    frequencies: ["126.450"],
    volmetName: "Istanbul VOLMET",
    region: "Turkey",
  },
  LTBS: {
    frequencies: ["126.450"],
    volmetName: "Istanbul VOLMET",
    region: "Turkey",
  },
  LTBJ: {
    frequencies: ["126.450"],
    volmetName: "Istanbul VOLMET",
    region: "Turkey",
  },
  LTFH: {
    frequencies: ["126.450"],
    volmetName: "Istanbul VOLMET",
    region: "Turkey",
  },
  LTCG: {
    frequencies: ["126.450"],
    volmetName: "Istanbul VOLMET",
    region: "Turkey",
  },
  LTFC: {
    frequencies: ["126.450"],
    volmetName: "Istanbul VOLMET",
    region: "Turkey",
  },
  LTCA: {
    frequencies: ["126.450"],
    volmetName: "Istanbul VOLMET",
    region: "Turkey",
  },
  LTAZ: {
    frequencies: ["126.450"],
    volmetName: "Istanbul VOLMET",
    region: "Turkey",
  },
  LTDE: {
    frequencies: ["126.450"],
    volmetName: "Istanbul VOLMET",
    region: "Turkey",
  },
  LTCC: {
    frequencies: ["126.450"],
    volmetName: "Istanbul VOLMET",
    region: "Turkey",
  },

  // ── ISRAEL ────────────────────────────────────────────────────────────────────
  LLBG: {
    frequencies: ["126.450"],
    volmetName: "Tel Aviv VOLMET",
    region: "Israel",
  },

  // ── JORDAN ────────────────────────────────────────────────────────────────────
  OJAI: {
    frequencies: ["126.450"],
    volmetName: "Amman VOLMET",
    region: "Jordan",
  },

  // ── GEORGIA ──────────────────────────────────────────────────────────────────
  UGTB: {
    frequencies: ["126.450"],
    volmetName: "Tbilisi VOLMET",
    region: "Georgia",
  },

  // ── ARMENIA ──────────────────────────────────────────────────────────────────
  UDYZ: {
    frequencies: ["126.450"],
    volmetName: "Yerevan VOLMET",
    region: "Armenia",
  },

  // ── AZERBAIJAN ────────────────────────────────────────────────────────────────
  UBBB: {
    frequencies: ["126.450"],
    volmetName: "Baku VOLMET",
    region: "Azerbaijan",
  },

  // ── MOROCCO ──────────────────────────────────────────────────────────────────
  GMTT: {
    frequencies: ["127.675"],
    volmetName: "Casablanca VOLMET",
    region: "Morocco",
  },
  GMMN: {
    frequencies: ["127.675"],
    volmetName: "Casablanca VOLMET",
    region: "Morocco",
  },
  GMME: {
    frequencies: ["127.675"],
    volmetName: "Casablanca VOLMET",
    region: "Morocco",
  },
  GMMX: {
    frequencies: ["127.675"],
    volmetName: "Casablanca VOLMET",
    region: "Morocco",
  },
  GMAD: {
    frequencies: ["127.675"],
    volmetName: "Casablanca VOLMET",
    region: "Morocco",
  },
  GMFN: {
    frequencies: ["127.675"],
    volmetName: "Casablanca VOLMET",
    region: "Morocco",
  },
  GMMZ: {
    frequencies: ["127.675"],
    volmetName: "Casablanca VOLMET",
    region: "Morocco",
  },

  // ── TUNISIA ──────────────────────────────────────────────────────────────────
  DTTA: {
    frequencies: ["126.450"],
    volmetName: "Tunis VOLMET",
    region: "Tunisia",
  },
  DTTB: {
    frequencies: ["126.450"],
    volmetName: "Tunis VOLMET",
    region: "Tunisia",
  },
  DTTJ: {
    frequencies: ["126.450"],
    volmetName: "Tunis VOLMET",
    region: "Tunisia",
  },
  DTMB: {
    frequencies: ["126.450"],
    volmetName: "Tunis VOLMET",
    region: "Tunisia",
  },

  // ── EGYPT ──────────────────────────────────────────────────────────────────────
  HECA: {
    frequencies: ["126.450"],
    volmetName: "Cairo VOLMET",
    region: "Egypt",
  },
  HEGN: {
    frequencies: ["126.450"],
    volmetName: "Cairo VOLMET",
    region: "Egypt",
  },
  HESH: {
    frequencies: ["126.450"],
    volmetName: "Cairo VOLMET",
    region: "Egypt",
  },

  // ── UKRAINE ──────────────────────────────────────────────────────────────────
  UKBB: {
    frequencies: ["126.450"],
    volmetName: "Kiev VOLMET",
    region: "Ukraine",
  },
  UKKK: {
    frequencies: ["126.450"],
    volmetName: "Kiev VOLMET",
    region: "Ukraine",
  },
};

// ── Country code mapping (icao_code 2-letter → ISO 2-letter) ─────────────────
const ICAO_PREFIX_TO_COUNTRY: Record<string, string> = {
  LI: "IT",
  LF: "FR",
  LE: "ES",
  LD: "HR",
  LJ: "SI",
  LK: "CZ",
  LZ: "SK",
  LH: "HU",
  LO: "AT",
  LM: "MT",
  LC: "CY",
  LB: "BG",
  LR: "RO",
  LY: "RS",
  LW: "MK",
  LQ: "BA",
  LT: "TR",
  LS: "CH",
  LL: "IL",
  LX: "GI",
  EG: "GB",
  EI: "IE",
  EH: "NL",
  EB: "BE",
  EL: "LU",
  EK: "DK",
  ED: "DE",
  EF: "FI",
  EE: "EE",
  EV: "LV",
  EY: "LT",
  EN: "NO",
  ES: "SE",
  EP: "PL",
  LU: "MD",
  UK: "UA",
  UG: "GE",
  UD: "AM",
  UB: "AZ",
  GC: "ES",
  GM: "MA",
  DT: "TN",
  HE: "EG",
  OJ: "JO",
  BK: "XK",
  LP: "PT",
};

// ── Surface code mapping ──────────────────────────────────────────────────────
const SURFACE_CODE: Record<number, string> = {
  101: "Asphalt",
  102: "Concrete",
  103: "Grass",
  104: "Sand",
  105: "Gravel",
  106: "Dirt",
  107: "Snow",
  108: "Ice",
};

function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(/[\s\/\-]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function getCountryFromIcao(icao: string): string {
  const prefix2 = icao.slice(0, 2).toUpperCase();
  const prefix1 = icao.slice(0, 1).toUpperCase();
  return (
    ICAO_PREFIX_TO_COUNTRY[prefix2] || ICAO_PREFIX_TO_COUNTRY[prefix1] || "XX"
  );
}

interface AirportRow {
  airport_identifier: string;
  airport_name: string;
  airport_ref_latitude: number;
  airport_ref_longitude: number;
  elevation: number;
  iata_ata_designator: string;
  icao_code: string;
}

interface CommRow {
  communication_type: string;
  communication_frequency: number | string;
}

interface RunwayRow {
  runway_identifier: string;
  runway_magnetic_bearing: number;
  runway_length: number;
  runway_width: number;
  surface_code: number;
}

function main() {
  const db = new Database(SQLITE_PATH, { readonly: true });

  const icaos = Object.keys(EFB_DATA).sort();
  console.log(`Processing ${icaos.length} airports...`);

  const airportSeedLines: string[] = [];
  const runwayData: Record<string, RunwayRow[]> = {};

  for (const icao of icaos) {
    const efb = EFB_DATA[icao];

    // Query airport basic info
    const airport = db
      .prepare(
        `SELECT airport_identifier, airport_name, airport_ref_latitude,
         airport_ref_longitude, elevation, iata_ata_designator, icao_code
         FROM tbl_airports WHERE airport_identifier = ?`,
      )
      .get(icao) as AirportRow | undefined;

    if (!airport) {
      console.warn(`  [WARN] ${icao} not found in SQLite`);
    }

    // Query ATIS
    const atisRow = db
      .prepare(
        `SELECT communication_frequency FROM tbl_airport_communication
         WHERE airport_identifier = ? AND communication_type = 'ATI'
         ORDER BY communication_frequency ASC LIMIT 1`,
      )
      .get(icao) as { communication_frequency: string } | undefined;

    const name = airport ? toTitleCase(airport.airport_name) : icao;
    const iata = (airport?.iata_ata_designator || "").trim() || undefined;
    const lat = airport
      ? parseFloat(airport.airport_ref_latitude.toString())
      : undefined;
    const lon = airport
      ? parseFloat(airport.airport_ref_longitude.toString())
      : undefined;
    const country = airport
      ? ICAO_PREFIX_TO_COUNTRY[airport.icao_code] || getCountryFromIcao(icao)
      : getCountryFromIcao(icao);
    const atis =
      atisRow?.communication_frequency != null
        ? String(atisRow.communication_frequency).trim()
        : undefined;

    const freqsStr = efb.frequencies.map((f) => `"${f}"`).join(", ");

    const lines: string[] = [];
    lines.push(`  {`);
    lines.push(`    icao: "${icao}",`);
    if (iata) lines.push(`    iata: "${iata}",`);
    lines.push(`    name: "${name}",`);
    lines.push(`    city: "${name}",`);
    lines.push(`    country: "${country}",`);
    if (lat !== undefined) lines.push(`    latitude: ${lat.toFixed(6)},`);
    if (lon !== undefined) lines.push(`    longitude: ${lon.toFixed(6)},`);
    lines.push(`    frequencies: [${freqsStr}],`);
    lines.push(`    region: "${efb.region}",`);
    if (efb.volmetName) lines.push(`    volmetName: "${efb.volmetName}",`);
    if (atis) lines.push(`    atis: "${atis}",`);
    if (efb.handlingFrequency)
      lines.push(`    handlingFrequency: "${efb.handlingFrequency}",`);
    lines.push(`    isActive: true,`);
    lines.push(`  },`);
    airportSeedLines.push(lines.join("\n"));

    // Query runways
    const runways = db
      .prepare(
        `SELECT runway_identifier, runway_magnetic_bearing, runway_length,
         runway_width, surface_code
         FROM tbl_runways WHERE airport_identifier = ?
         ORDER BY runway_identifier`,
      )
      .all(icao) as RunwayRow[];

    if (runways.length > 0) {
      runwayData[icao] = runways;
    }
  }

  db.close();

  // ── Write volmet seed ────────────────────────────────────────────────────────
  const volmetSeed = `import { Volmet } from "../../volmet/entities/volmet.entity";

export const VOLMET_DATA: Partial<Volmet>[] = [
${airportSeedLines.join("\n")}
];
`;

  const seedPath = path.resolve(
    __dirname,
    "../src/database/seeds/volmet.seed.ts",
  );
  fs.writeFileSync(seedPath, volmetSeed, "utf8");
  console.log(`\nWrote ${airportSeedLines.length} airports → ${seedPath}`);

  // ── Write runway seed data ────────────────────────────────────────────────────
  const runwaySeedLines: string[] = [];
  for (const [icao, runways] of Object.entries(runwayData)) {
    for (const rw of runways) {
      const num = rw.runway_identifier.replace(/^RW/, "");
      const heading = Math.round(rw.runway_magnetic_bearing);
      // SQLite stores feet; convert to meters (same unit as openAIP sync)
      const length = rw.runway_length
        ? Math.round(rw.runway_length * 0.3048)
        : null;
      const width = rw.runway_width
        ? Math.round(rw.runway_width * 0.3048)
        : null;
      const surface = SURFACE_CODE[rw.surface_code] ?? undefined;
      const surfacePart = surface ? `, surface: "${surface}"` : "";
      runwaySeedLines.push(
        `  { icao: "${icao}", number: "${num}", heading: ${heading}, length: ${length}, width: ${width}${surfacePart} },`,
      );
    }
  }

  const runwaySeed = `import { Runway } from "../../metar/entities/runway.entity";

export const RUNWAY_DATA: Partial<Runway>[] = [
${runwaySeedLines.join("\n")}
];
`;

  const runwaySeedPath = path.resolve(
    __dirname,
    "../src/database/seeds/runway.seed.ts",
  );
  fs.writeFileSync(runwaySeedPath, runwaySeed, "utf8");
  console.log(
    `Wrote ${runwaySeedLines.length} runways (${Object.keys(runwayData).length} airports) → ${runwaySeedPath}`,
  );
}

main();
