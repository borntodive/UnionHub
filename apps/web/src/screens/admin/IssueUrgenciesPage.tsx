import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  issueUrgenciesApi,
  CreateIssueUrgencyData,
  UpdateIssueUrgencyData,
} from "../../api/references";
import type { IssueUrgency } from "@unionhub/shared/types";
import {
  FormShell,
  ConfirmDeleteModal,
  ApiErrorBanner,
  inputCls,
  labelCls,
} from "./_components";

/* level → colour mapping (matches mobile app) */
const LEVEL_COLOR: Record<number, { ring: string; bg: string; text: string }> =
  {
    1: { ring: "ring-green-400", bg: "bg-green-100", text: "text-green-700" },
    2: { ring: "ring-lime-400", bg: "bg-lime-100", text: "text-lime-700" },
    3: { ring: "ring-amber-400", bg: "bg-amber-100", text: "text-amber-700" },
    4: { ring: "ring-red-400", bg: "bg-red-100", text: "text-red-700" },
    5: {
      ring: "ring-violet-400",
      bg: "bg-violet-100",
      text: "text-violet-700",
    },
  };

function LevelBadge({ level }: { level: number }) {
  const c = LEVEL_COLOR[level] ?? LEVEL_COLOR[3];
  return (
    <span
      className={`inline-flex items-center justify-center w-7 h-7 rounded-full ring-2 text-xs font-bold ${c.ring} ${c.bg} ${c.text}`}
    >
      {level}
    </span>
  );
}

/* ─── form modal ─────────────────────────────────────────────── */
type FormData = CreateIssueUrgencyData & { active: boolean };

function UrgencyModal({
  item,
  onClose,
  onSaved,
}: {
  item: IssueUrgency | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [apiError, setApiError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    defaultValues: item
      ? {
          nameIt: item.nameIt,
          nameEn: item.nameEn,
          level: item.level,
          active: item.active,
        }
      : { nameIt: "", nameEn: "", level: 1, active: true },
  });

  const onSubmit = async (data: FormData) => {
    setApiError(null);
    try {
      const level = Number(data.level);
      if (item) {
        const payload: UpdateIssueUrgencyData = {
          nameIt: data.nameIt,
          nameEn: data.nameEn,
          level,
          active: data.active,
        };
        await issueUrgenciesApi.updateUrgency(item.id, payload);
      } else {
        await issueUrgenciesApi.createUrgency({
          nameIt: data.nameIt,
          nameEn: data.nameEn,
          level,
        });
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
      title={item ? "Modifica urgenza" : "Nuova urgenza"}
      onClose={onClose}
    >
      {apiError && (
        <ApiErrorBanner
          message={apiError}
          onDismiss={() => setApiError(null)}
        />
      )}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className={labelCls}>Nome italiano *</label>
          <input
            {...register("nameIt", { required: "Campo obbligatorio" })}
            className={inputCls}
            placeholder="es. Alta"
          />
          {errors.nameIt && (
            <p className="text-xs text-red-500 mt-1">{errors.nameIt.message}</p>
          )}
        </div>
        <div>
          <label className={labelCls}>Nome inglese *</label>
          <input
            {...register("nameEn", { required: "Campo obbligatorio" })}
            className={inputCls}
            placeholder="es. High"
          />
          {errors.nameEn && (
            <p className="text-xs text-red-500 mt-1">{errors.nameEn.message}</p>
          )}
        </div>
        <div>
          <label className={labelCls}>Livello (1 = basso, 5 = massimo) *</label>
          <select
            {...register("level", {
              required: "Campo obbligatorio",
              valueAsNumber: true,
            })}
            className={inputCls}
          >
            {[1, 2, 3, 4, 5].map((l) => (
              <option key={l} value={l}>
                L{l}
              </option>
            ))}
          </select>
        </div>
        {item && (
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="urgency-active"
              {...register("active")}
              className="w-4 h-4 rounded accent-[#177246]"
            />
            <label
              htmlFor="urgency-active"
              className="text-sm text-gray-700 cursor-pointer"
            >
              Urgenza attiva
            </label>
          </div>
        )}
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
            {isSubmitting ? "Salvataggio…" : item ? "Salva" : "Crea"}
          </button>
        </div>
      </form>
    </FormShell>
  );
}

/* ─── page ───────────────────────────────────────────────────── */
export function IssueUrgenciesPage() {
  const [editing, setEditing] = useState<IssueUrgency | "new" | null>(null);
  const [deleting, setDeleting] = useState<IssueUrgency | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data: urgencies, isLoading } = useQuery({
    queryKey: ["issueUrgencies"],
    queryFn: issueUrgenciesApi.getUrgencies,
  });

  const sorted = useMemo(
    () => [...(urgencies ?? [])].sort((a, b) => a.level - b.level),
    [urgencies],
  );

  const refresh = () => qc.invalidateQueries({ queryKey: ["issueUrgencies"] });

  const handleDelete = async () => {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await issueUrgenciesApi.deleteUrgency(deleting.id);
      refresh();
      setDeleting(null);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } }).response?.data
          ?.message ?? "Impossibile eliminare l'urgenza";
      setApiError(msg);
      setDeleting(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleToggleActive = async (u: IssueUrgency) => {
    try {
      await issueUrgenciesApi.updateUrgency(u.id, { active: !u.active });
      refresh();
    } catch {
      /* noop */
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Livelli di urgenza
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {urgencies?.length ?? 0} livelli configurati
          </p>
        </div>
        <button
          onClick={() => setEditing("new")}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[#177246] text-white rounded-lg hover:bg-[#177246]/90 transition-colors"
        >
          <Plus size={15} />
          Nuovo livello
        </button>
      </div>

      {apiError && (
        <ApiErrorBanner
          message={apiError}
          onDismiss={() => setApiError(null)}
        />
      )}

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 border-4 border-[#177246] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-20">
                  Liv.
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Nome IT
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Nome EN
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-28">
                  Stato
                </th>
                <th className="px-4 py-3 w-20" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sorted.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-sm text-gray-400"
                  >
                    Nessun livello di urgenza
                  </td>
                </tr>
              ) : (
                sorted.map((u) => (
                  <tr
                    key={u.id}
                    className="group hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <LevelBadge level={u.level} />
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {u.nameIt}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{u.nameEn}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleActive(u)}
                        className={`text-xs font-medium px-2 py-0.5 rounded-full transition-colors cursor-pointer ${
                          u.active
                            ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        }`}
                        title={
                          u.active
                            ? "Clicca per disattivare"
                            : "Clicca per attivare"
                        }
                      >
                        {u.active ? "Attivo" : "Inattivo"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setEditing(u)}
                          className="p-1.5 text-gray-400 hover:text-[#177246] hover:bg-[#177246]/10 rounded-lg transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setDeleting(u)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {editing !== null && (
        <UrgencyModal
          key={editing === "new" ? "new" : editing.id}
          item={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={refresh}
        />
      )}
      {deleting && (
        <ConfirmDeleteModal
          name={`L${deleting.level} – ${deleting.nameIt}`}
          loading={deleteLoading}
          onConfirm={handleDelete}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
