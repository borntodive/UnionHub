import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { gradesApi, CreateGradeData } from "../../api/references";
import { Ruolo } from "@unionhub/shared/types";
import type { Grade } from "@unionhub/shared/types";
import {
  FormShell,
  ConfirmDeleteModal,
  ApiErrorBanner,
  inputCls,
  labelCls,
} from "./_components";

const RUOLO_LABEL: Record<Ruolo, string> = {
  [Ruolo.PILOT]: "Pilota",
  [Ruolo.CABIN_CREW]: "Cabin Crew",
};

const RUOLO_BADGE: Record<Ruolo, string> = {
  [Ruolo.PILOT]: "bg-sky-100 text-sky-700",
  [Ruolo.CABIN_CREW]: "bg-violet-100 text-violet-700",
};

/* ─── form modal ─────────────────────────────────────────────── */
function GradeModal({
  item,
  onClose,
  onSaved,
}: {
  item: Grade | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [apiError, setApiError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateGradeData>({
    defaultValues: item ?? { codice: "", nome: "", ruolo: Ruolo.PILOT },
  });

  const onSubmit = async (data: CreateGradeData) => {
    setApiError(null);
    try {
      const payload = { ...data, codice: data.codice.toUpperCase() };
      if (item) {
        await gradesApi.updateGrade(item.id, payload);
      } else {
        await gradesApi.createGrade(payload);
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
      title={item ? "Modifica grado" : "Nuovo grado"}
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
          <label className={labelCls}>Codice *</label>
          <input
            {...register("codice", { required: "Campo obbligatorio" })}
            className={inputCls}
            placeholder="es. CPT"
            style={{ textTransform: "uppercase" }}
          />
          {errors.codice && (
            <p className="text-xs text-red-500 mt-1">{errors.codice.message}</p>
          )}
        </div>
        <div>
          <label className={labelCls}>Nome *</label>
          <input
            {...register("nome", { required: "Campo obbligatorio" })}
            className={inputCls}
            placeholder="es. Captain"
          />
          {errors.nome && (
            <p className="text-xs text-red-500 mt-1">{errors.nome.message}</p>
          )}
        </div>
        <div>
          <label className={labelCls}>Ruolo *</label>
          <select
            {...register("ruolo", { required: true })}
            className={inputCls}
          >
            <option value={Ruolo.PILOT}>Pilota</option>
            <option value={Ruolo.CABIN_CREW}>Cabin Crew</option>
          </select>
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
            {isSubmitting ? "Salvataggio…" : item ? "Salva" : "Crea"}
          </button>
        </div>
      </form>
    </FormShell>
  );
}

/* ─── page ───────────────────────────────────────────────────── */
export function GradesPage() {
  const [search, setSearch] = useState("");
  const [filterRuolo, setFilterRuolo] = useState<Ruolo | "all">("all");
  const [editing, setEditing] = useState<Grade | "new" | null>(null);
  const [deleting, setDeleting] = useState<Grade | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data: grades, isLoading } = useQuery({
    queryKey: ["grades"],
    queryFn: gradesApi.getGrades,
  });

  const filtered = useMemo(() => {
    let list = grades ?? [];
    if (filterRuolo !== "all")
      list = list.filter((g) => g.ruolo === filterRuolo);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (g) =>
          g.codice.toLowerCase().includes(q) ||
          g.nome.toLowerCase().includes(q),
      );
    }
    return list;
  }, [grades, search, filterRuolo]);

  const refresh = () => qc.invalidateQueries({ queryKey: ["grades"] });

  const handleDelete = async () => {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await gradesApi.deleteGrade(deleting.id);
      refresh();
      setDeleting(null);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } }).response?.data
          ?.message ?? "Impossibile eliminare il grado";
      setApiError(msg);
      setDeleting(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gradi</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {grades?.length ?? 0} gradi configurati
          </p>
        </div>
        <button
          onClick={() => setEditing("new")}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[#177246] text-white rounded-lg hover:bg-[#177246]/90 transition-colors"
        >
          <Plus size={15} />
          Nuovo grado
        </button>
      </div>

      {apiError && (
        <ApiErrorBanner
          message={apiError}
          onDismiss={() => setApiError(null)}
        />
      )}

      {/* filters */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca codice o nome…"
            className="pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#177246]/30 w-full"
          />
        </div>
        <select
          value={filterRuolo}
          onChange={(e) => setFilterRuolo(e.target.value as Ruolo | "all")}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#177246]/30 bg-white"
        >
          <option value="all">Tutti i ruoli</option>
          <option value={Ruolo.PILOT}>Piloti</option>
          <option value={Ruolo.CABIN_CREW}>Cabin Crew</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 border-4 border-[#177246] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-28">
                  Codice
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Nome
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-32">
                  Ruolo
                </th>
                <th className="px-4 py-3 w-20" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-10 text-center text-sm text-gray-400"
                  >
                    {search || filterRuolo !== "all"
                      ? "Nessun risultato"
                      : "Nessun grado"}
                  </td>
                </tr>
              ) : (
                filtered.map((g) => (
                  <tr
                    key={g.id}
                    className="group hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                        {g.codice}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {g.nome}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${RUOLO_BADGE[g.ruolo]}`}
                      >
                        {RUOLO_LABEL[g.ruolo]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setEditing(g)}
                          className="p-1.5 text-gray-400 hover:text-[#177246] hover:bg-[#177246]/10 rounded-lg transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setDeleting(g)}
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
        <GradeModal
          key={editing === "new" ? "new" : editing.id}
          item={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={refresh}
        />
      )}
      {deleting && (
        <ConfirmDeleteModal
          name={deleting.nome}
          loading={deleteLoading}
          onConfirm={handleDelete}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
