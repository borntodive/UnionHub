import { useState } from "react";
import { usePayslipStore } from "../payslip/usePayslipStore";
import { useAuthStore } from "../store/authStore";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Card } from "../components/Card";
import { UserRole } from "@unionhub/shared/types";
import type { Payroll, PayslipSettings } from "@unionhub/shared/payslip";
import { getContractData, RYR_CONFIG } from "@unionhub/shared/payslip";

type Tab = "input" | "contract" | "reverse" | "override";

const fmt = (n: number) =>
  n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });

/* ─── ResultRow ─────────────────────────────────────────────── */
function ResultRow({
  label,
  item,
  highlight,
}: {
  label: string;
  item: {
    total: number;
    taxable: number;
    taxFree: number;
    isDeduction?: boolean;
  };
  highlight?: boolean;
}) {
  if (item.total === 0) return null;
  return (
    <tr className={highlight ? "bg-gray-50 font-semibold" : ""}>
      <td
        className={`py-1.5 pr-3 text-sm ${item.isDeduction === true ? "text-red-600" : "text-gray-800"}`}
      >
        {label}
      </td>
      <td className="py-1.5 pr-2 text-right text-sm font-mono">
        {item.isDeduction === true ? `(${fmt(item.total)})` : fmt(item.total)}
      </td>
      <td className="py-1.5 pr-2 text-right text-xs text-gray-500 font-mono">
        {item.taxable !== 0 ? fmt(item.taxable) : "—"}
      </td>
    </tr>
  );
}

/* ─── PayslipResults ─────────────────────────────────────────── */
function PayslipResults({ result }: { result: Payroll }) {
  const p = result.payslipItems;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-center">
          <div className="text-xs text-green-600 font-medium uppercase tracking-wide">
            Netto
          </div>
          <div className="text-xl font-bold text-green-700 mt-0.5">
            {fmt(result.netPayment)}
          </div>
        </div>
        <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 text-center">
          <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">
            Lordo
          </div>
          <div className="text-xl font-bold text-gray-700 mt-0.5">
            {fmt(result.grossPay)}
          </div>
        </div>
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-center">
          <div className="text-xs text-blue-600 font-medium uppercase tracking-wide">
            Imponibile
          </div>
          <div className="text-lg font-bold text-blue-700 mt-0.5">
            {fmt(result.taxArea)}
          </div>
        </div>
        <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3 text-center">
          <div className="text-xs text-yellow-600 font-medium uppercase tracking-wide">
            Tax-free
          </div>
          <div className="text-lg font-bold text-yellow-700 mt-0.5">
            {fmt(result.taxFreeArea)}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left text-xs font-semibold text-gray-500 pb-2 pr-3">
                Voce
              </th>
              <th className="text-right text-xs font-semibold text-gray-500 pb-2 pr-2">
                Totale
              </th>
              <th className="text-right text-xs font-semibold text-gray-500 pb-2">
                Imponibile
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            <ResultRow label="Stipendio base" item={p.basic} />
            <ResultRow label="FFP" item={p.ffp} />
            <ResultRow label="SBH" item={p.sbh} />
            <ResultRow label="Diaria volo" item={p.flyDiaria} />
            <ResultRow label="Diaria no-fly" item={p.noFlyDiaria} />
            <ResultRow label="OOB" item={p.oob} />
            <ResultRow label="WOFF" item={p.woff} />
            <ResultRow label="Ferie" item={p.al} />
            <ResultRow label="Sim pay" item={p.simPay} />
            <ResultRow label="Training pay" item={p.trainingPay} />
            <ResultRow label="CC Training" item={p.ccTraining} />
            <ResultRow label="ITUD" item={p.itud} />
            <ResultRow label="RSA" item={p.rsa} />
            <ResultRow label="Commissioni" item={p.commissions} />
            <ResultRow label="Festività" item={p.bankHolydays} />
            {p.additionalPayments?.map((item, i) => (
              <ResultRow
                key={`ap-${i}`}
                label={`Voce aggiuntiva ${i + 1}`}
                item={{ ...item, isDeduction: false }}
              />
            ))}
            <ResultRow label="Sindacato" item={p.union} highlight />
            {p.additionalDeductions?.map((item, i) => (
              <ResultRow
                key={`ad-${i}`}
                label={`Trattenuta ${i + 1}`}
                item={{ ...item, isDeduction: true }}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="border-t border-gray-200 pt-3 space-y-1.5 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">INPS</span>
          <span className="font-mono text-red-600">
            ({fmt(result.areaINPS.contribuzioneTotale)})
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">IRPEF</span>
          <span className="font-mono text-red-600">
            ({fmt(result.areaIRPEF.ritenute)})
          </span>
        </div>
        {result.areaIRPEF.addizionaliComunali > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-600">Add. comunali</span>
            <span className="font-mono text-red-600">
              ({fmt(result.areaIRPEF.addizionaliComunali)})
            </span>
          </div>
        )}
        {result.areaIRPEF.addizionaliRegionali > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-600">Add. regionali</span>
            <span className="font-mono text-red-600">
              ({fmt(result.areaIRPEF.addizionaliRegionali)})
            </span>
          </div>
        )}
        {result.areaIRPEF.trattamentoIntegrativo !== 0 && (
          <div className="flex justify-between">
            <span className="text-gray-600">Tratt. integrativo</span>
            <span className="font-mono text-green-600">
              {fmt(result.areaIRPEF.trattamentoIntegrativo)}
            </span>
          </div>
        )}
        <div className="flex justify-between border-t border-gray-200 pt-2 font-bold">
          <span>NETTO</span>
          <span className="text-green-700">{fmt(result.netPayment)}</span>
        </div>
      </div>
    </div>
  );
}

/* ─── ContractTab ────────────────────────────────────────────── */
function ContractTab({
  settings,
  hasRSA,
  hasITUD,
}: {
  settings: PayslipSettings;
  hasRSA: boolean;
  hasITUD: boolean;
}) {
  const contract = getContractData(
    settings.company || "RYR",
    settings.role,
    settings.rank,
  );

  if (!contract) {
    return (
      <div className="flex-1 overflow-y-auto p-6 flex items-center justify-center">
        <p className="text-sm text-gray-400">
          Dati contrattuali non disponibili per questa qualifica.
        </p>
      </div>
    );
  }

  const pt = settings.parttime ? settings.parttimePercentage : 1;
  const cuFactor = settings.cu ? RYR_CONFIG.cuReduction : 1;

  const effFFP = settings.legacy
    ? settings.legacyDirect
      ? settings.legacyCustom.ffp
      : contract.ffp + settings.legacyDeltas.ffp
    : contract.ffp;
  const effSBH = settings.legacy
    ? settings.legacyDirect
      ? settings.legacyCustom.sbh
      : contract.sbh + settings.legacyDeltas.sbh
    : contract.sbh;
  const effAL = settings.legacy
    ? settings.legacyDirect
      ? settings.legacyCustom.al
      : contract.al + settings.legacyDeltas.al
    : contract.al;

  const rows: { label: string; value: number; unit: string }[] = [
    { label: "Stipendio base", value: contract.basic * pt, unit: "/mese" },
    { label: "FFP", value: effFFP * pt * cuFactor, unit: "/mese" },
    { label: "SBH rate", value: effSBH, unit: "/ora" },
    { label: "Ferie (AL)", value: effAL * pt, unit: "/giorno" },
    { label: "Diaria", value: contract.diaria, unit: "/giorno" },
    { label: "OOB", value: contract.oob, unit: "/notte" },
  ];
  if (settings.role === "pil" && contract.woff)
    rows.push({ label: "WOFF", value: contract.woff, unit: "/giorno" });
  if (contract.allowance)
    rows.push({
      label: "Allowance",
      value: contract.allowance * pt,
      unit: "/mese",
    });
  if (hasRSA && contract.rsa)
    rows.push({ label: "RSA", value: contract.rsa, unit: "/mese" });
  if (hasITUD && contract.itud)
    rows.push({ label: "ITUD", value: contract.itud, unit: "/giorno" });

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-lg font-bold text-gray-900">
          Contratto CLA — {settings.rank.toUpperCase()}
        </h2>
        {settings.legacy && (
          <span className="text-xs bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
            Override legacy attivo
          </span>
        )}
      </div>

      {(settings.parttime || settings.cu) && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700 space-y-0.5">
          {settings.parttime && (
            <div>
              Part-time {(settings.parttimePercentage * 100).toFixed(0)}%
              applicato
            </div>
          )}
          {settings.cu && (
            <div>Riduzione nuovo comandante (CU) −10% applicata su FFP</div>
          )}
        </div>
      )}

      <Card padding="md">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left">
              <th className="pb-2 pr-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Voce
              </th>
              <th className="pb-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Importo
              </th>
              <th className="pb-2 pl-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Unità
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => (
              <tr key={row.label}>
                <td className="py-2 pr-4 text-gray-700">{row.label}</td>
                <td className="py-2 text-right font-mono font-medium text-gray-900">
                  {fmt(row.value)}
                </td>
                <td className="py-2 pl-3 text-right text-xs text-gray-400 whitespace-nowrap">
                  {row.unit}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

/* ─── ReverseTab ─────────────────────────────────────────────── */
function ReverseTab({ settings }: { settings: PayslipSettings }) {
  const [sectorPayInput, setSectorPayInput] = useState("");
  const [diariaInput, setDiariaInput] = useState("");

  const contract = getContractData(
    settings.company || "RYR",
    settings.role,
    settings.rank,
  );
  const pt = settings.parttime ? settings.parttimePercentage : 1;
  const sbhRate = contract ? contract.sbh * pt : 0;
  const diariaRate = contract ? contract.diaria : 0;

  const sectorPay = parseFloat(sectorPayInput) || 0;
  const diariaAmt = parseFloat(diariaInput) || 0;

  const totalHours = sbhRate > 0 && sectorPay > 0 ? sectorPay / sbhRate : null;
  const hoursHHMM =
    totalHours !== null
      ? `${Math.floor(totalHours).toString().padStart(2, "0")}:${Math.round(
          (totalHours % 1) * 60,
        )
          .toString()
          .padStart(2, "0")}`
      : null;
  const totalDays =
    diariaRate > 0 && diariaAmt > 0 ? diariaAmt / diariaRate : null;

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <h2 className="text-lg font-bold text-gray-900">Calcolatore inverso</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Sector pay → hours */}
        <Card padding="md">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">
            Settori → Ore
          </h3>
          <Input
            label="Importo settori (€)"
            type="number"
            min={0}
            step="0.01"
            placeholder="es. 5000"
            value={sectorPayInput}
            onChange={(e) => setSectorPayInput(e.target.value)}
          />
          {hoursHHMM ? (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg text-center">
              <div className="text-xs text-green-600 font-medium uppercase tracking-wide mb-1">
                Ore equivalenti
              </div>
              <div className="text-3xl font-bold text-green-700 font-mono">
                {hoursHHMM}
              </div>
              <div className="text-xs text-gray-500 mt-2">
                Tariffa SBH: {fmt(sbhRate)}/ora
              </div>
            </div>
          ) : (
            !contract && (
              <p className="text-xs text-gray-400 mt-2">
                Dati contrattuali non disponibili
              </p>
            )
          )}
        </Card>

        {/* Diaria → days */}
        <Card padding="md">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">
            Diaria → Giorni
          </h3>
          <Input
            label="Importo diaria (€)"
            type="number"
            min={0}
            step="0.01"
            placeholder="es. 1500"
            value={diariaInput}
            onChange={(e) => setDiariaInput(e.target.value)}
          />
          {totalDays !== null ? (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
              <div className="text-xs text-blue-600 font-medium uppercase tracking-wide mb-1">
                Giorni equivalenti
              </div>
              <div className="text-3xl font-bold text-blue-700 font-mono">
                {totalDays.toFixed(1)}
              </div>
              <div className="text-xs text-gray-500 mt-2">
                Tariffa diaria: {fmt(diariaRate)}/giorno
              </div>
            </div>
          ) : (
            !contract && (
              <p className="text-xs text-gray-400 mt-2">
                Dati contrattuali non disponibili
              </p>
            )
          )}
        </Card>
      </div>
    </div>
  );
}

/* ─── OverrideTab ────────────────────────────────────────────── */
function OverrideTab({
  overrideITUD,
  setOverrideITUD,
  overrideRSA,
  setOverrideRSA,
}: {
  overrideITUD: boolean | null;
  setOverrideITUD: (v: boolean | null) => void;
  overrideRSA: boolean | null;
  setOverrideRSA: (v: boolean | null) => void;
}) {
  const btnCls = (active: boolean, color: string) =>
    `text-xs px-2.5 py-1 rounded-lg font-medium border transition-colors ${
      active
        ? color
        : "text-gray-400 border-gray-200 hover:border-gray-300 hover:text-gray-600"
    }`;

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4 max-w-lg">
      <h2 className="text-lg font-bold text-gray-900">Override admin</h2>

      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
        Gli override si applicano al prossimo calcolo (torna al tab Input e
        premi "Calcola"). Non vengono salvati.
      </div>

      <Card padding="md">
        <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">
          Flag utente
        </h3>
        <div className="space-y-4">
          {/* ITUD */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-800">ITUD</div>
              <div className="text-xs text-gray-400">Forza inclusione ITUD</div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setOverrideITUD(null)}
                className={btnCls(
                  overrideITUD === null,
                  "bg-gray-100 text-gray-700 border-gray-200",
                )}
              >
                Auto
              </button>
              <button
                onClick={() => setOverrideITUD(true)}
                className={btnCls(
                  overrideITUD === true,
                  "bg-green-100 text-green-700 border-green-200",
                )}
              >
                Sì
              </button>
              <button
                onClick={() => setOverrideITUD(false)}
                className={btnCls(
                  overrideITUD === false,
                  "bg-red-100 text-red-600 border-red-200",
                )}
              >
                No
              </button>
            </div>
          </div>

          {/* RSA */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-800">RSA</div>
              <div className="text-xs text-gray-400">Forza inclusione RSA</div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setOverrideRSA(null)}
                className={btnCls(
                  overrideRSA === null,
                  "bg-gray-100 text-gray-700 border-gray-200",
                )}
              >
                Auto
              </button>
              <button
                onClick={() => setOverrideRSA(true)}
                className={btnCls(
                  overrideRSA === true,
                  "bg-green-100 text-green-700 border-green-200",
                )}
              >
                Sì
              </button>
              <button
                onClick={() => setOverrideRSA(false)}
                className={btnCls(
                  overrideRSA === false,
                  "bg-red-100 text-red-600 border-red-200",
                )}
              >
                No
              </button>
            </div>
          </div>
        </div>
      </Card>

      {(overrideITUD !== null || overrideRSA !== null) && (
        <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-700">
          Override attivo:{" "}
          {overrideITUD !== null && `ITUD = ${overrideITUD ? "sì" : "no"}`}
          {overrideITUD !== null && overrideRSA !== null && ", "}
          {overrideRSA !== null && `RSA = ${overrideRSA ? "sì" : "no"}`}
        </div>
      )}
    </div>
  );
}

/* ─── PayslipPage ────────────────────────────────────────────── */
export function PayslipPage() {
  const store = usePayslipStore();
  const { user } = useAuthStore();
  const isAdmin =
    user?.role === UserRole.ADMIN || user?.role === UserRole.SUPERADMIN;

  const [activeTab, setActiveTab] = useState<Tab>("input");
  const [overrideITUD, setOverrideITUD] = useState<boolean | null>(null);
  const [overrideRSA, setOverrideRSA] = useState<boolean | null>(null);

  const pilotRanks = [
    "fo",
    "cpt",
    "ltc",
    "sfi",
    "lcc",
    "tri",
    "tre",
    "so",
    "jfo",
  ];
  const ccRanks = ["ju", "jpu", "cc", "sepe", "sepi"];
  const ranks = store.settings.role === "pil" ? pilotRanks : ccRanks;

  const tabs: { id: Tab; label: string }[] = [
    { id: "input", label: "Input" },
    { id: "contract", label: "Contratto" },
    { id: "reverse", label: "Reverse" },
    ...(isAdmin ? ([{ id: "override", label: "Override" }] as const) : []),
  ];

  const handleCalculate = () => {
    const userFlags: { itud?: boolean; rsa?: boolean } = {};
    if (overrideITUD !== null) userFlags.itud = overrideITUD;
    if (overrideRSA !== null) userFlags.rsa = overrideRSA;
    store.calculate(userFlags);
  };

  const TabBar = () => (
    <div className="flex items-center gap-1 border-b border-gray-200 mb-0 pb-0">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === tab.id
              ? "border-[#177246] text-[#177246]"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          {tab.label}
        </button>
      ))}
      {(overrideITUD !== null || overrideRSA !== null) && (
        <span className="ml-2 text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">
          Override
        </span>
      )}
    </div>
  );

  return (
    <div className="flex h-full min-h-0">
      {/* Settings sidebar */}
      <aside className="w-64 flex-shrink-0 border-r border-gray-200 bg-white overflow-y-auto p-4 space-y-4">
        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
          Impostazioni
        </h2>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">
              Ruolo
            </label>
            <select
              value={store.settings.role}
              onChange={(e) =>
                store.setSettings({
                  role: e.target.value as "pil" | "cc",
                  rank: e.target.value === "pil" ? "fo" : "cc",
                })
              }
              className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#177246]"
            >
              <option value="pil">Pilota</option>
              <option value="cc">Cabin Crew</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">
              Qualifica
            </label>
            <select
              value={store.settings.rank}
              onChange={(e) => store.setSettings({ rank: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#177246]"
            >
              {ranks.map((r) => (
                <option key={r} value={r}>
                  {r.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">
              Base
            </label>
            <select
              value={store.settings.base}
              onChange={(e) => store.setSettings({ base: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#177246]"
            >
              {["BGY", "FCO", "MXP", "NAP", "PMO", "CTA", "BLQ"].map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="parttime"
              checked={store.settings.parttime}
              onChange={(e) =>
                store.setSettings({ parttime: e.target.checked })
              }
              className="rounded border-gray-300 text-[#177246] focus:ring-[#177246]"
            />
            <label htmlFor="parttime" className="text-sm text-gray-700">
              Part-time
            </label>
          </div>

          {store.settings.parttime && (
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">
                % Part-time
              </label>
              <select
                value={store.settings.parttimePercentage}
                onChange={(e) =>
                  store.setSettings({
                    parttimePercentage: Number(e.target.value),
                  })
                }
                className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#177246]"
              >
                <option value={0.5}>50%</option>
                <option value={0.6}>60%</option>
                <option value={0.75}>75%</option>
                <option value={0.8}>80%</option>
                <option value={0.9}>90%</option>
              </select>
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="cu"
              checked={store.settings.cu}
              onChange={(e) => store.setSettings({ cu: e.target.checked })}
              className="rounded border-gray-300 text-[#177246] focus:ring-[#177246]"
            />
            <label htmlFor="cu" className="text-xs text-gray-700">
              Nuovo comandante (CU -10%)
            </label>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="coniuge"
              checked={store.settings.coniugeCarico}
              onChange={(e) =>
                store.setSettings({ coniugeCarico: e.target.checked })
              }
              className="rounded border-gray-300 text-[#177246] focus:ring-[#177246]"
            />
            <label htmlFor="coniuge" className="text-xs text-gray-700">
              Coniuge a carico
            </label>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="btc"
              checked={store.settings.btc}
              onChange={(e) => store.setSettings({ btc: e.target.checked })}
              className="rounded border-gray-300 text-[#177246] focus:ring-[#177246]"
            />
            <label htmlFor="btc" className="text-xs text-gray-700">
              Contratto BTC
            </label>
          </div>

          <hr className="border-gray-200" />
          <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">
            Imposte locali
          </p>

          <Input
            label="Sindacato (€)"
            type="number"
            value={store.settings.union}
            onChange={(e) =>
              store.setSettings({ union: Number(e.target.value) })
            }
          />
          <Input
            label="Add. regionali (€)"
            type="number"
            step="0.01"
            value={store.settings.addRegionali}
            onChange={(e) =>
              store.setSettings({ addRegionali: Number(e.target.value) })
            }
          />
          <Input
            label="Add. comunali (€)"
            type="number"
            step="0.01"
            value={store.settings.addComunali}
            onChange={(e) =>
              store.setSettings({ addComunali: Number(e.target.value) })
            }
          />
          <Input
            label="Acconto add. comunali (€)"
            type="number"
            step="0.01"
            value={store.settings.accontoAddComunali}
            onChange={(e) =>
              store.setSettings({
                accontoAddComunali: Number(e.target.value),
              })
            }
          />
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex min-w-0 overflow-hidden">
        {/* Tab bar + content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Tab header */}
          <div className="flex-shrink-0 px-6 pt-4 pb-0 bg-white border-b border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-xl font-bold text-gray-900">
                Calcolatore Busta Paga
              </h1>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  store.reset();
                  setOverrideITUD(null);
                  setOverrideRSA(null);
                }}
              >
                Reset
              </Button>
            </div>
            <TabBar />
          </div>

          {/* Tab content */}
          {activeTab === "input" && (
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <Card padding="md">
                <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">
                  Dati di base
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">
                      Mese di riferimento
                    </label>
                    <input
                      type="month"
                      value={store.input.date.slice(0, 7)}
                      onChange={(e) =>
                        store.setInput({ date: e.target.value + "-01" })
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#177246]"
                    />
                  </div>
                  <Input
                    label="SBH (HH:MM)"
                    placeholder="85:00"
                    value={store.input.sbh}
                    onChange={(e) => store.setInput({ sbh: e.target.value })}
                  />
                  <Input
                    label="Giorni INPS"
                    type="number"
                    min={0}
                    max={26}
                    value={store.input.inpsDays}
                    onChange={(e) =>
                      store.setInput({ inpsDays: Number(e.target.value) })
                    }
                  />
                </div>
              </Card>

              <Card padding="md">
                <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">
                  Diarie e OOB
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <Input
                    label="Diaria volo (gg)"
                    type="number"
                    min={0}
                    value={store.input.flyDiaria}
                    onChange={(e) =>
                      store.setInput({ flyDiaria: Number(e.target.value) })
                    }
                  />
                  <Input
                    label="Diaria no-fly (gg)"
                    type="number"
                    min={0}
                    value={store.input.noFlyDiaria}
                    onChange={(e) =>
                      store.setInput({ noFlyDiaria: Number(e.target.value) })
                    }
                  />
                  <Input
                    label="Notti OOB"
                    type="number"
                    min={0}
                    value={store.input.oob}
                    onChange={(e) =>
                      store.setInput({ oob: Number(e.target.value) })
                    }
                  />
                  {store.settings.role === "pil" && (
                    <Input
                      label="Solo nazionali"
                      type="number"
                      min={0}
                      value={store.input.onlyNationalFly}
                      onChange={(e) =>
                        store.setInput({
                          onlyNationalFly: Number(e.target.value),
                        })
                      }
                    />
                  )}
                  {store.settings.role === "cc" && (
                    <Input
                      label="OOB non pianificati"
                      type="number"
                      min={0}
                      value={store.input.oobUnplanned}
                      onChange={(e) =>
                        store.setInput({
                          oobUnplanned: Number(e.target.value),
                        })
                      }
                    />
                  )}
                </div>
              </Card>

              <Card padding="md">
                <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">
                  Assenze
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <Input
                    label="Ferie (gg)"
                    type="number"
                    min={0}
                    value={store.input.al}
                    onChange={(e) =>
                      store.setInput({ al: Number(e.target.value) })
                    }
                  />
                  <Input
                    label="Aspettativa (gg)"
                    type="number"
                    min={0}
                    value={store.input.ul}
                    onChange={(e) =>
                      store.setInput({ ul: Number(e.target.value) })
                    }
                  />
                  <Input
                    label="Congedo parentale (gg)"
                    type="number"
                    min={0}
                    value={store.input.parentalDays}
                    onChange={(e) =>
                      store.setInput({
                        parentalDays: Number(e.target.value),
                      })
                    }
                  />
                  <Input
                    label="Legge 104 (gg)"
                    type="number"
                    min={0}
                    value={store.input.days104}
                    onChange={(e) =>
                      store.setInput({ days104: Number(e.target.value) })
                    }
                  />
                  {store.settings.role === "pil" && (
                    <Input
                      label="WOFF"
                      type="number"
                      min={0}
                      value={store.input.woff}
                      onChange={(e) =>
                        store.setInput({ woff: Number(e.target.value) })
                      }
                    />
                  )}
                  {store.settings.role === "cc" && (
                    <Input
                      label="Festività (gg)"
                      type="number"
                      min={0}
                      value={store.input.bankHolydays}
                      onChange={(e) =>
                        store.setInput({
                          bankHolydays: Number(e.target.value),
                        })
                      }
                    />
                  )}
                </div>
              </Card>

              {store.settings.role === "pil" && (
                <Card padding="md">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">
                    Training / Simulatore
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <Input
                      label="Settori training"
                      type="number"
                      min={0}
                      value={store.input.trainingSectors}
                      onChange={(e) =>
                        store.setInput({
                          trainingSectors: Number(e.target.value),
                        })
                      }
                    />
                    <Input
                      label="Giorni sim"
                      type="number"
                      min={0}
                      value={store.input.simDays}
                      onChange={(e) =>
                        store.setInput({ simDays: Number(e.target.value) })
                      }
                    />
                  </div>
                </Card>
              )}

              <Card padding="md">
                <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">
                  Altri campi
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <Input
                    label="ITUD (gg)"
                    type="number"
                    min={0}
                    value={store.input.itud}
                    onChange={(e) =>
                      store.setInput({ itud: Number(e.target.value) })
                    }
                  />
                  <Input
                    label="Pregresso IRPEF (€)"
                    type="number"
                    step="0.01"
                    value={store.input.pregressoIrpef}
                    onChange={(e) =>
                      store.setInput({
                        pregressoIrpef: Number(e.target.value),
                      })
                    }
                  />
                  {store.settings.role === "cc" && (
                    <Input
                      label="Commissioni (€)"
                      type="number"
                      step="0.01"
                      value={store.input.commissions}
                      onChange={(e) =>
                        store.setInput({
                          commissions: Number(e.target.value),
                        })
                      }
                    />
                  )}
                </div>
              </Card>

              <div className="flex gap-3">
                <Button
                  onClick={handleCalculate}
                  loading={store.isCalculating}
                  size="lg"
                  fullWidth
                >
                  Calcola busta paga
                  {(overrideITUD !== null || overrideRSA !== null) && (
                    <span className="ml-2 text-xs opacity-75">
                      (con override)
                    </span>
                  )}
                </Button>
              </div>

              {store.error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  {store.error}
                </div>
              )}
            </div>
          )}

          {activeTab === "contract" && (
            <ContractTab
              settings={store.settings}
              hasRSA={user?.rsa ?? false}
              hasITUD={user?.itud ?? false}
            />
          )}

          {activeTab === "reverse" && <ReverseTab settings={store.settings} />}

          {activeTab === "override" && isAdmin && (
            <OverrideTab
              overrideITUD={overrideITUD}
              setOverrideITUD={setOverrideITUD}
              overrideRSA={overrideRSA}
              setOverrideRSA={setOverrideRSA}
            />
          )}
        </div>

        {/* Results panel — only in input tab */}
        {activeTab === "input" && (
          <div className="w-[352px] flex-shrink-0 border-l border-gray-200 bg-white overflow-y-auto p-5">
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4">
              Risultati
            </h2>
            {store.result ? (
              <PayslipResults result={store.result} />
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                <div className="text-4xl mb-3">💰</div>
                <p className="text-sm">
                  Inserisci i dati e premi
                  <br />
                  «Calcola» per vedere i risultati
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
