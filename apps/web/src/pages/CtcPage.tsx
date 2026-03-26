import { useState } from "react";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Card } from "../components/Card";
import {
  getCorrectionFt,
  getCorrectionM,
  roundUpTo100,
} from "@unionhub/shared/ftl";
import { Plus, Trash2 } from "lucide-react";

interface AltRow {
  id: string;
  label: string;
  publishedAlt: string;
}

interface CtcResult {
  label: string;
  published: number;
  correction: number | null;
  corrected: number | null;
  aboveMsa: boolean;
  noCorrection: boolean;
}

export function CtcPage() {
  const [unit, setUnit] = useState<"ft" | "m">("ft");
  const [roundUp, setRoundUp] = useState(true);
  const [tempStr, setTempStr] = useState("");
  const [elevStr, setElevStr] = useState("");
  const [msaStr, setMsaStr] = useState("");
  const [rows, setRows] = useState<AltRow[]>([
    { id: "1", label: "MSA", publishedAlt: "" },
    { id: "2", label: "FAF", publishedAlt: "" },
    { id: "3", label: "MDA/DA", publishedAlt: "" },
  ]);

  const addRow = () =>
    setRows((r) => [
      ...r,
      { id: Date.now().toString(), label: "", publishedAlt: "" },
    ]);

  const removeRow = (id: string) =>
    setRows((r) => r.filter((row) => row.id !== id));

  const updateRow = (id: string, field: keyof AltRow, value: string) =>
    setRows((r) =>
      r.map((row) => (row.id === id ? { ...row, [field]: value } : row)),
    );

  const tempC = parseFloat(tempStr);
  const elev = parseFloat(elevStr);
  const msa = msaStr ? parseFloat(msaStr) : null;
  const isValidBase = !isNaN(tempC) && !isNaN(elev);
  const noCorrection = isValidBase && tempC > 0;

  const results: CtcResult[] = rows.map((row) => {
    const published = parseFloat(row.publishedAlt);
    if (isNaN(published))
      return {
        label: row.label,
        published: 0,
        correction: null,
        corrected: null,
        aboveMsa: false,
        noCorrection: false,
      };
    if (noCorrection)
      return {
        label: row.label,
        published,
        correction: 0,
        corrected: published,
        aboveMsa: false,
        noCorrection: true,
      };
    if (!isValidBase)
      return {
        label: row.label,
        published,
        correction: null,
        corrected: null,
        aboveMsa: false,
        noCorrection: false,
      };
    if (msa !== null && published > msa)
      return {
        label: row.label,
        published,
        correction: null,
        corrected: null,
        aboveMsa: true,
        noCorrection: false,
      };

    const height = published - elev;
    if (height <= 0)
      return {
        label: row.label,
        published,
        correction: 0,
        corrected: published,
        aboveMsa: false,
        noCorrection: false,
      };

    const rawCorrection =
      unit === "ft"
        ? getCorrectionFt(tempC, height)
        : getCorrectionM(tempC, height);

    const correctedRaw = published + rawCorrection;
    const corrected = roundUp
      ? roundUpTo100(correctedRaw)
      : Math.round(correctedRaw);
    return {
      label: row.label,
      published,
      correction: rawCorrection,
      corrected,
      aboveMsa: false,
      noCorrection: false,
    };
  });

  const unitLabel = unit === "ft" ? "ft" : "m";

  return (
    <div className="flex h-full min-h-0">
      {/* Form */}
      <div className="flex-1 overflow-y-auto p-6 min-w-0 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">CTC Calculator</h1>
            <p className="text-sm text-gray-500">
              Cold Temperature Correction — ICAO Doc 9365
            </p>
          </div>
          {/* Unit toggle */}
          <div className="flex rounded-lg border border-gray-300 overflow-hidden">
            {(["ft", "m"] as const).map((u) => (
              <button
                key={u}
                onClick={() => setUnit(u)}
                className={`px-4 py-1.5 text-sm font-semibold transition-colors ${
                  unit === u
                    ? "bg-[#177246] text-white"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                {u}
              </button>
            ))}
          </div>
        </div>

        <Card padding="md">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">
            Parametri aeroporto
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <Input
              label={`Temperatura (°C)`}
              placeholder="-15"
              value={tempStr}
              onChange={(e) => setTempStr(e.target.value)}
              hint="Temperatura OAT all'aeroporto"
            />
            <Input
              label={`Elevazione aeroporto (${unitLabel})`}
              placeholder={unit === "ft" ? "1000" : "300"}
              value={elevStr}
              onChange={(e) => setElevStr(e.target.value)}
            />
            <Input
              label={`MSA filtro (${unitLabel}) — opzionale`}
              placeholder=""
              value={msaStr}
              onChange={(e) => setMsaStr(e.target.value)}
              hint="Altitudini sopra questo valore non vengono corrette"
            />
          </div>
          <div className="mt-4 flex items-center gap-2">
            <input
              type="checkbox"
              id="roundup"
              checked={roundUp}
              onChange={(e) => setRoundUp(e.target.checked)}
              className="rounded border-gray-300 text-[#177246] focus:ring-[#177246]"
            />
            <label htmlFor="roundup" className="text-sm text-gray-700">
              Arrotonda a 100 {unitLabel} superiori
            </label>
          </div>
          {noCorrection && (
            <div className="mt-3 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">
              ✓ Temperatura &gt; 0°C — nessuna correzione necessaria
            </div>
          )}
        </Card>

        <Card padding="md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Altitudini
            </h3>
            <Button variant="outline" size="sm" onClick={addRow}>
              <Plus size={14} /> Aggiungi
            </Button>
          </div>
          <div className="space-y-3">
            {rows.map((row) => (
              <div key={row.id} className="flex gap-3 items-end">
                <div className="w-36">
                  <Input
                    label="Label"
                    placeholder="FAF, DA, MDA…"
                    value={row.label}
                    onChange={(e) => updateRow(row.id, "label", e.target.value)}
                  />
                </div>
                <div className="flex-1">
                  <Input
                    label={`Altitudine pubblicata (${unitLabel})`}
                    placeholder={unit === "ft" ? "3000" : "900"}
                    value={row.publishedAlt}
                    onChange={(e) =>
                      updateRow(row.id, "publishedAlt", e.target.value)
                    }
                  />
                </div>
                <button
                  onClick={() => removeRow(row.id)}
                  className="mb-0.5 p-2 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Results */}
      <div className="w-[420px] flex-shrink-0 border-l border-gray-200 bg-white overflow-y-auto p-5">
        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4">
          Correzioni
        </h2>

        {!isValidBase ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <div className="text-4xl mb-3">🌡️</div>
            <p className="text-sm text-center">
              Inserisci temperatura ed elevazione aeroporto
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs text-gray-500">
                  <th className="text-left pb-2 pr-3 font-semibold">Punto</th>
                  <th className="text-right pb-2 pr-3 font-semibold">Pubbl.</th>
                  <th className="text-right pb-2 pr-3 font-semibold">Corr.</th>
                  <th className="text-right pb-2 font-semibold">Corretta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {results.map((r, i) => (
                  <tr
                    key={i}
                    className={
                      r.corrected !== null &&
                      !r.noCorrection &&
                      r.correction !== null &&
                      r.correction > 0
                        ? "bg-amber-50"
                        : ""
                    }
                  >
                    <td className="py-2.5 pr-3 font-medium text-gray-800">
                      {r.label || `—`}
                    </td>
                    <td className="py-2.5 pr-3 text-right text-gray-600 font-mono">
                      {r.published ? `${r.published} ${unitLabel}` : "—"}
                    </td>
                    <td className="py-2.5 pr-3 text-right font-mono">
                      {r.aboveMsa ? (
                        <span className="text-gray-400 text-xs">Sopra MSA</span>
                      ) : r.noCorrection ? (
                        <span className="text-green-600 text-xs">N/A</span>
                      ) : r.correction !== null ? (
                        <span
                          className={
                            r.correction > 0
                              ? "text-amber-700 font-semibold"
                              : "text-gray-500"
                          }
                        >
                          {r.correction > 0 ? `+${r.correction}` : r.correction}{" "}
                          {unitLabel}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-2.5 text-right font-mono font-bold">
                      {r.aboveMsa ? (
                        <span className="text-gray-400 text-xs italic">
                          sopra MSA
                        </span>
                      ) : r.corrected !== null ? (
                        <span
                          className={
                            r.corrected !== r.published
                              ? "text-[#177246]"
                              : "text-gray-600"
                          }
                        >
                          {r.corrected} {unitLabel}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
