import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import {
  issueCategoriesApi,
  CreateIssueCategoryData,
  UpdateIssueCategoryData,
} from "../../api/references";
import { Ruolo } from "@unionhub/shared/types";
import type { IssueCategory } from "@unionhub/shared/types";
import {
  FormShell,
  ConfirmDeleteModal,
  ApiErrorBanner,
  inputCls,
  labelCls,
} from "./_components";

const RUOLO_BADGE: Record<Ruolo, string> = {
  [Ruolo.PILOT]: "bg-sky-100 text-sky-700",
  [Ruolo.CABIN_CREW]: "bg-violet-100 text-violet-700",
};
const RUOLO_LABEL: Record<Ruolo, string> = {
  [Ruolo.PILOT]: "Piloti",
  [Ruolo.CABIN_CREW]: "Cabin Crew",
};

/* ─── form modal ─────────────────────────────────────────────── */
type FormData = CreateIssueCategoryData & { active: boolean };

function CategoryModal({
  item,
  onClose,
  onSaved,
}: {
  item: IssueCategory | null;
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
          ruolo: item.ruolo,
          active: item.active,
        }
      : { nameIt: "", nameEn: "", ruolo: Ruolo.PILOT, active: true },
  });

  const onSubmit = async (data: FormData) => {
    setApiError(null);
    try {
      if (item) {
        const payload: UpdateIssueCategoryData = {
          nameIt: data.nameIt,
          nameEn: data.nameEn,
          ruolo: data.ruolo,
          active: data.active,
        };
        await issueCategoriesApi.updateCategory(item.id, payload);
      } else {
        await issueCategoriesApi.createCategory({
          nameIt: data.nameIt,
          nameEn: data.nameEn,
          ruolo: data.ruolo,
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
      title={item ? "Modifica categoria" : "Nuova categoria"}
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
            placeholder="es. Problemi contrattuali"
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
            placeholder="es. Contract issues"
          />
          {errors.nameEn && (
            <p className="text-xs text-red-500 mt-1">{errors.nameEn.message}</p>
          )}
        </div>
        <div>
          <label className={labelCls}>Ruolo *</label>
          <select
            {...register("ruolo", { required: true })}
            className={inputCls}
          >
            <option value={Ruolo.PILOT}>Piloti</option>
            <option value={Ruolo.CABIN_CREW}>Cabin Crew</option>
          </select>
        </div>
        {item && (
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="active"
              {...register("active")}
              className="w-4 h-4 rounded accent-[#177246]"
            />
            <label
              htmlFor="active"
              className="text-sm text-gray-700 cursor-pointer"
            >
              Categoria attiva
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
export function IssueCategoriesPage() {
  const [search, setSearch] = useState("");
  const [filterRuolo, setFilterRuolo] = useState<Ruolo | "all">("all");
  const [editing, setEditing] = useState<IssueCategory | "new" | null>(null);
  const [deleting, setDeleting] = useState<IssueCategory | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data: categories, isLoading } = useQuery({
    queryKey: ["issueCategories"],
    queryFn: () => issueCategoriesApi.getCategories(),
  });

  const filtered = useMemo(() => {
    let list = categories ?? [];
    if (filterRuolo !== "all")
      list = list.filter((c) => c.ruolo === filterRuolo);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.nameIt.toLowerCase().includes(q) ||
          c.nameEn.toLowerCase().includes(q),
      );
    }
    return list;
  }, [categories, search, filterRuolo]);

  const refresh = () => qc.invalidateQueries({ queryKey: ["issueCategories"] });

  const handleDelete = async () => {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await issueCategoriesApi.deleteCategory(deleting.id);
      refresh();
      setDeleting(null);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } }).response?.data
          ?.message ?? "Impossibile eliminare la categoria";
      setApiError(msg);
      setDeleting(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleToggleActive = async (cat: IssueCategory) => {
    try {
      await issueCategoriesApi.updateCategory(cat.id, { active: !cat.active });
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
            Categorie segnalazioni
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {categories?.length ?? 0} categorie configurate
          </p>
        </div>
        <button
          onClick={() => setEditing("new")}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[#177246] text-white rounded-lg hover:bg-[#177246]/90 transition-colors"
        >
          <Plus size={15} />
          Nuova categoria
        </button>
      </div>

      {apiError && (
        <ApiErrorBanner
          message={apiError}
          onDismiss={() => setApiError(null)}
        />
      )}

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
            placeholder="Cerca nome…"
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
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Nome IT
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Nome EN
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-32">
                  Ruolo
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-28">
                  Stato
                </th>
                <th className="px-4 py-3 w-20" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-sm text-gray-400"
                  >
                    Nessuna categoria
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr
                    key={c.id}
                    className="group hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {c.nameIt}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{c.nameEn}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${RUOLO_BADGE[c.ruolo]}`}
                      >
                        {RUOLO_LABEL[c.ruolo]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleActive(c)}
                        className={`text-xs font-medium px-2 py-0.5 rounded-full transition-colors cursor-pointer ${
                          c.active
                            ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        }`}
                        title={
                          c.active
                            ? "Clicca per disattivare"
                            : "Clicca per attivare"
                        }
                      >
                        {c.active ? "Attiva" : "Inattiva"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setEditing(c)}
                          className="p-1.5 text-gray-400 hover:text-[#177246] hover:bg-[#177246]/10 rounded-lg transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setDeleting(c)}
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
        <CategoryModal
          key={editing === "new" ? "new" : editing.id}
          item={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={refresh}
        />
      )}
      {deleting && (
        <ConfirmDeleteModal
          name={deleting.nameIt}
          loading={deleteLoading}
          onConfirm={handleDelete}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
