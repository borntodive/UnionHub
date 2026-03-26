import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Pencil,
  Power,
  PowerOff,
  Copy,
  Trash2,
  ChevronDown,
} from "lucide-react";
import {
  claContractsApi,
  ClaContract,
  CreateClaContractData,
} from "../../api/cla-contracts";
import { useForm } from "react-hook-form";
import {
  FormShell,
  ConfirmDeleteModal,
  ApiErrorBanner,
  inputCls,
  labelCls,
} from "./_components";

const fmt = (n: number) =>
  Number(n).toLocaleString("it-IT", { style: "currency", currency: "EUR" });

/* ─── Form Modal ────────────────────────────────────────────── */
function ClaContractModal({
  item,
  defaultYear,
  onClose,
  onSaved,
}: {
  item: ClaContract | null;
  defaultYear: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [apiError, setApiError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateClaContractData>({
    defaultValues: item
      ? {
          company: item.company,
          role: item.role,
          rank: item.rank,
          basic: Number(item.basic),
          ffp: Number(item.ffp),
          sbh: Number(item.sbh),
          al: Number(item.al),
          oob: Number(item.oob),
          woff: Number(item.woff),
          allowance: Number(item.allowance),
          diaria: Number(item.diaria),
          rsa: Number(item.rsa),
          itud: Number(item.itud),
          effectiveYear: item.effectiveYear,
          effectiveMonth: item.effectiveMonth,
          isActive: item.isActive,
        }
      : {
          company: "RYR",
          role: "pil",
          rank: "fo",
          basic: 0,
          ffp: 0,
          sbh: 0,
          al: 0,
          oob: 0,
          woff: 0,
          allowance: 0,
          diaria: 0,
          rsa: 51.92,
          itud: 120,
          effectiveYear: defaultYear,
          effectiveMonth: 1,
          isActive: true,
        },
  });

  const role = watch("role");

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

  const onSubmit = async (data: CreateClaContractData) => {
    setApiError(null);
    try {
      const payload = {
        ...data,
        basic: Number(data.basic),
        ffp: Number(data.ffp),
        sbh: Number(data.sbh),
        al: Number(data.al),
        oob: Number(data.oob),
        woff: Number(data.woff),
        allowance: Number(data.allowance),
        diaria: Number(data.diaria),
        rsa: Number(data.rsa),
        itud: Number(data.itud),
        effectiveYear: Number(data.effectiveYear),
        effectiveMonth: Number(data.effectiveMonth ?? 1),
      };
      if (item) {
        await claContractsApi.update(item.id, payload);
      } else {
        await claContractsApi.create(payload);
      }
      onSaved();
      onClose();
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } }).response?.data
          ?.message ?? "Errore durante il salvataggio";
      setApiError(msg);
    }
  };

  return (
    <FormShell
      title={item ? "Modifica contratto CLA" : "Nuovo contratto CLA"}
      onClose={onClose}
    >
      {apiError && (
        <ApiErrorBanner
          message={apiError}
          onDismiss={() => setApiError(null)}
        />
      )}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>Anno *</label>
            <input
              type="number"
              className={inputCls}
              {...register("effectiveYear", {
                required: true,
                valueAsNumber: true,
              })}
            />
          </div>
          <div>
            <label className={labelCls}>Mese *</label>
            <select
              className={inputCls}
              {...register("effectiveMonth", { valueAsNumber: true })}
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {(i + 1).toString().padStart(2, "0")}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Società</label>
            <input className={inputCls} {...register("company")} disabled />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Ruolo *</label>
            <select
              className={inputCls}
              {...register("role", { required: true })}
            >
              <option value="pil">Pilota</option>
              <option value="cc">Cabin Crew</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Qualifica *</label>
            <select
              className={inputCls}
              {...register("rank", { required: true })}
            >
              {(role === "pil" ? pilotRanks : ccRanks).map((r) => (
                <option key={r} value={r}>
                  {r.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </div>

        <hr className="border-gray-100" />
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Importi contrattuali
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Stipendio base (€/mese)</label>
            <input
              type="number"
              step="0.01"
              className={inputCls}
              {...register("basic", { required: true, valueAsNumber: true })}
            />
          </div>
          <div>
            <label className={labelCls}>FFP (€/mese)</label>
            <input
              type="number"
              step="0.01"
              className={inputCls}
              {...register("ffp", { required: true, valueAsNumber: true })}
            />
          </div>
          <div>
            <label className={labelCls}>SBH (€/ora)</label>
            <input
              type="number"
              step="0.0001"
              className={inputCls}
              {...register("sbh", { required: true, valueAsNumber: true })}
            />
          </div>
          <div>
            <label className={labelCls}>AL/Ferie (€/giorno)</label>
            <input
              type="number"
              step="0.01"
              className={inputCls}
              {...register("al", { required: true, valueAsNumber: true })}
            />
          </div>
          <div>
            <label className={labelCls}>Diaria (€/giorno)</label>
            <input
              type="number"
              step="0.0001"
              className={inputCls}
              {...register("diaria", { required: true, valueAsNumber: true })}
            />
          </div>
          <div>
            <label className={labelCls}>OOB (€/notte)</label>
            <input
              type="number"
              step="0.01"
              className={inputCls}
              {...register("oob", { valueAsNumber: true })}
            />
          </div>
          <div>
            <label className={labelCls}>WOFF (€/giorno)</label>
            <input
              type="number"
              step="0.01"
              className={inputCls}
              {...register("woff", { valueAsNumber: true })}
            />
          </div>
          <div>
            <label className={labelCls}>Allowance (€/mese)</label>
            <input
              type="number"
              step="0.01"
              className={inputCls}
              {...register("allowance", { valueAsNumber: true })}
            />
          </div>
          <div>
            <label className={labelCls}>RSA (€/mese)</label>
            <input
              type="number"
              step="0.01"
              className={inputCls}
              {...register("rsa", { valueAsNumber: true })}
            />
          </div>
          <div>
            <label className={labelCls}>ITUD (€/giorno)</label>
            <input
              type="number"
              step="0.01"
              className={inputCls}
              {...register("itud", { valueAsNumber: true })}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="isActive"
            className="rounded border-gray-300 text-[#177246] focus:ring-[#177246]"
            {...register("isActive")}
          />
          <label htmlFor="isActive" className="text-sm text-gray-700">
            Attivo
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
          >
            Annulla
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium bg-[#177246] text-white rounded-lg hover:bg-[#177246]/90 disabled:opacity-50"
          >
            {isSubmitting ? "Salvataggio…" : "Salva"}
          </button>
        </div>
      </form>
    </FormShell>
  );
}

/* ─── Clone Modal ───────────────────────────────────────────── */
function CloneModal({
  item,
  onClose,
  onCloned,
}: {
  item: ClaContract;
  onClose: () => void;
  onCloned: () => void;
}) {
  const [year, setYear] = useState(item.effectiveYear + 1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClone = async () => {
    setLoading(true);
    setError(null);
    try {
      await claContractsApi.cloneForYear(item.id, year);
      onCloned();
      onClose();
    } catch (e: unknown) {
      setError(
        (e as { response?: { data?: { message?: string } } }).response?.data
          ?.message ?? "Errore durante la clonazione",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-gray-900 mb-4">Clona per anno</h2>
        <p className="text-sm text-gray-500 mb-4">
          Clonerà <strong>{item.rank.toUpperCase()}</strong> ({item.role}) dal{" "}
          {item.effectiveYear} per l'anno:
        </p>
        <input
          type="number"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4"
        />
        {error && <p className="text-sm text-red-500 mb-3">{error}</p>}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
          >
            Annulla
          </button>
          <button
            onClick={handleClone}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium bg-[#177246] text-white rounded-lg hover:bg-[#177246]/90 disabled:opacity-50"
          >
            {loading ? "Clonazione…" : "Clona"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── ClaContractsPage ──────────────────────────────────────── */
export function ClaContractsPage() {
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [filterRole, setFilterRole] = useState<"all" | "pil" | "cc">("all");
  const [editItem, setEditItem] = useState<ClaContract | null | "new">(null);
  const [cloneItem, setCloneItem] = useState<ClaContract | null>(null);
  const [deleteItem, setDeleteItem] = useState<ClaContract | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ["cla-contracts", selectedYear],
    queryFn: () => claContractsApi.findAll(selectedYear),
  });

  const filtered = useMemo(
    () =>
      filterRole === "all"
        ? contracts
        : contracts.filter((c) => c.role === filterRole),
    [contracts, filterRole],
  );

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["cla-contracts"] });

  const handleToggleActive = async (item: ClaContract) => {
    try {
      if (item.isActive) {
        await claContractsApi.deactivate(item.id);
      } else {
        await claContractsApi.activate(item.id);
      }
      refresh();
    } catch {
      alert("Errore durante l'aggiornamento");
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    setDeleting(true);
    try {
      await claContractsApi.deactivate(deleteItem.id);
      refresh();
      setDeleteItem(null);
    } catch {
      alert("Errore durante l'eliminazione");
    } finally {
      setDeleting(false);
    }
  };

  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - 2 + i);

  const groupByRank = useMemo(() => {
    const map: Record<string, ClaContract[]> = {};
    for (const c of filtered) {
      if (!map[c.role]) map[c.role] = [];
      map[c.role].push(c);
    }
    return map;
  }, [filtered]);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            CCNL — CLA Contracts
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Gestisci gli importi contrattuali per anno
          </p>
        </div>
        <button
          onClick={() => setEditItem("new")}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-[#177246] text-white rounded-lg hover:bg-[#177246]/90"
        >
          <Plus size={15} /> Nuovo contratto
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="pl-3 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#177246] appearance-none"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
        </div>

        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          {(["all", "pil", "cc"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setFilterRole(r)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                filterRole === r
                  ? "bg-[#177246] text-white"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {r === "all" ? "Tutti" : r === "pil" ? "Piloti" : "Cabin Crew"}
            </button>
          ))}
        </div>

        <span className="text-sm text-gray-400">
          {filtered.length} contratti
        </span>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-[#177246] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-sm">
            Nessun contratto CLA per l'anno {selectedYear}
          </p>
          <button
            onClick={() => setEditItem("new")}
            className="text-xs text-[#177246] hover:underline mt-2"
          >
            Crea il primo
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupByRank).map(([role, items]) => (
            <div key={role}>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
                {role === "pil" ? "Piloti" : "Cabin Crew"}
              </h2>
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Qualifica
                      </th>
                      <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Basic
                      </th>
                      <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        FFP
                      </th>
                      <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        SBH/h
                      </th>
                      <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Diaria/g
                      </th>
                      <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        AL/g
                      </th>
                      <th className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">
                        Stato
                      </th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {items.map((item) => (
                      <tr
                        key={item.id}
                        className={item.isActive ? "" : "opacity-50 bg-gray-50"}
                      >
                        <td className="px-4 py-3 font-semibold text-gray-900">
                          {item.rank.toUpperCase()}
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-gray-700">
                          {fmt(Number(item.basic))}
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-gray-700">
                          {fmt(Number(item.ffp))}
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-gray-700">
                          {fmt(Number(item.sbh))}
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-gray-700">
                          {fmt(Number(item.diaria))}
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-gray-700">
                          {fmt(Number(item.al))}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              item.isActive
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {item.isActive ? "Attivo" : "Inattivo"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleToggleActive(item)}
                              className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100"
                              title={item.isActive ? "Disattiva" : "Attiva"}
                            >
                              {item.isActive ? (
                                <PowerOff size={14} />
                              ) : (
                                <Power size={14} />
                              )}
                            </button>
                            <button
                              onClick={() => setEditItem(item)}
                              className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100"
                              title="Modifica"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => setCloneItem(item)}
                              className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100"
                              title="Clona per anno"
                            >
                              <Copy size={14} />
                            </button>
                            <button
                              onClick={() => setDeleteItem(item)}
                              className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                              title="Elimina"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {editItem !== null && (
        <ClaContractModal
          item={editItem === "new" ? null : editItem}
          defaultYear={selectedYear}
          onClose={() => setEditItem(null)}
          onSaved={refresh}
        />
      )}

      {cloneItem && (
        <CloneModal
          item={cloneItem}
          onClose={() => setCloneItem(null)}
          onCloned={refresh}
        />
      )}

      {deleteItem && (
        <ConfirmDeleteModal
          name={`${deleteItem.rank.toUpperCase()} (${deleteItem.role}, ${deleteItem.effectiveYear})`}
          onClose={() => setDeleteItem(null)}
          onConfirm={handleDelete}
          loading={deleting}
        />
      )}
    </div>
  );
}
