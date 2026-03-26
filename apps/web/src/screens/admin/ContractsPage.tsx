import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { contractsApi, CreateContractData } from "../../api/references";
import type { Contract } from "@unionhub/shared/types";
import {
  FormShell,
  ConfirmDeleteModal,
  ApiErrorBanner,
  inputCls,
  labelCls,
} from "./_components";

/* ─── form modal ─────────────────────────────────────────────── */
function ContractModal({
  item,
  onClose,
  onSaved,
}: {
  item: Contract | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [apiError, setApiError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateContractData>({
    defaultValues: item ?? { codice: "", nome: "" },
  });

  const onSubmit = async (data: CreateContractData) => {
    setApiError(null);
    try {
      const payload = { ...data, codice: data.codice.toUpperCase() };
      if (item) {
        await contractsApi.updateContract(item.id, payload);
      } else {
        await contractsApi.createContract(payload);
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
      title={item ? "Modifica contratto" : "Nuovo contratto"}
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
            placeholder="es. AH"
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
            placeholder="es. Malta Air"
          />
          {errors.nome && (
            <p className="text-xs text-red-500 mt-1">{errors.nome.message}</p>
          )}
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
export function ContractsPage() {
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Contract | "new" | null>(null);
  const [deleting, setDeleting] = useState<Contract | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data: contracts, isLoading } = useQuery({
    queryKey: ["contracts"],
    queryFn: contractsApi.getContracts,
  });

  const filtered = useMemo(() => {
    if (!search) return contracts ?? [];
    const q = search.toLowerCase();
    return (contracts ?? []).filter(
      (c) =>
        c.codice.toLowerCase().includes(q) || c.nome.toLowerCase().includes(q),
    );
  }, [contracts, search]);

  const refresh = () => qc.invalidateQueries({ queryKey: ["contracts"] });

  const handleDelete = async () => {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await contractsApi.deleteContract(deleting.id);
      refresh();
      setDeleting(null);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } }).response?.data
          ?.message ?? "Impossibile eliminare il contratto";
      setApiError(msg);
      setDeleting(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contratti</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {contracts?.length ?? 0} contratti configurati
          </p>
        </div>
        <button
          onClick={() => setEditing("new")}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[#177246] text-white rounded-lg hover:bg-[#177246]/90 transition-colors"
        >
          <Plus size={15} />
          Nuovo contratto
        </button>
      </div>

      {apiError && (
        <ApiErrorBanner
          message={apiError}
          onDismiss={() => setApiError(null)}
        />
      )}

      {/* search */}
      <div className="relative mb-4 max-w-sm">
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

      {/* table */}
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
                <th className="px-4 py-3 w-20" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-10 text-center text-sm text-gray-400"
                  >
                    {search ? "Nessun risultato" : "Nessun contratto"}
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr
                    key={c.id}
                    className="group hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                        {c.codice}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {c.nome}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setEditing(c)}
                          className="p-1.5 text-gray-400 hover:text-[#177246] hover:bg-[#177246]/10 rounded-lg transition-colors"
                          title="Modifica"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setDeleting(c)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Elimina"
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

      {/* modals */}
      {editing !== null && (
        <ContractModal
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
