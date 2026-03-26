import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  UserCheck,
  Trash2,
  History,
  X,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { usersApi } from "../api/users";
import { Ruolo } from "@unionhub/shared/types";
import type { User, StatusLogEntry } from "@unionhub/shared/types";

const ITEMS_PER_PAGE = 20;

/* ─── history modal ─────────────────────────────────────────── */
function HistoryModal({
  member,
  onClose,
}: {
  member: User;
  onClose: () => void;
}) {
  const log = member.statusLog ?? [];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            Storico — {member.nome} {member.cognome}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-6 max-h-80 overflow-y-auto">
          {log.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">
              Nessuno storico disponibile
            </p>
          ) : (
            <ol className="space-y-3">
              {[...log].reverse().map((entry: StatusLogEntry, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs shrink-0 ${
                      entry.isActive ? "bg-emerald-500" : "bg-red-400"
                    }`}
                  >
                    {entry.isActive ? "✓" : "✗"}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {entry.isActive ? "Riattivato" : "Disattivato"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(entry.timestamp).toLocaleString("it-IT")}
                      {entry.performedBy && ` · da ${entry.performedBy}`}
                    </p>
                    {entry.reason && (
                      <p className="text-xs text-gray-500 mt-0.5 italic">
                        "{entry.reason}"
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── page ───────────────────────────────────────────────────── */
export function DeactivatedMembersPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [historyMember, setHistoryMember] = useState<User | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["deactivatedUsers", page, search],
    queryFn: () =>
      usersApi.getDeactivatedUsers({
        page,
        perPage: ITEMS_PER_PAGE,
        search: search || undefined,
      }),
  });

  const members = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));

  const refresh = () =>
    qc.invalidateQueries({ queryKey: ["deactivatedUsers"] });

  const handleSearch = (v: string) => {
    setSearch(v);
    setPage(1);
  };

  const handleReactivate = async (member: User) => {
    if (!confirm(`Riattivare ${member.nome} ${member.cognome}?`)) return;
    try {
      await usersApi.reactivateUser(member.id);
      refresh();
    } catch (e: unknown) {
      setApiError(
        (e as { response?: { data?: { message?: string } } }).response?.data
          ?.message ?? "Impossibile riattivare il socio",
      );
    }
  };

  const handleDelete = async (member: User) => {
    if (
      !confirm(
        `ELIMINAZIONE DEFINITIVA di ${member.nome} ${member.cognome}.\nQuesto non può essere annullato. Continuare?`,
      )
    )
      return;
    try {
      await usersApi.deleteUser(member.id);
      refresh();
    } catch (e: unknown) {
      setApiError(
        (e as { response?: { data?: { message?: string } } }).response?.data
          ?.message ?? "Impossibile eliminare il socio",
      );
    }
  };

  const ruoloLabel = (r: Ruolo | null) =>
    r === Ruolo.PILOT ? "Pilota" : r === Ruolo.CABIN_CREW ? "Cabin Crew" : null;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Soci disattivati</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {total} soci disattivati
          </p>
        </div>
      </div>

      {apiError && (
        <div className="flex items-center justify-between p-3 mb-4 bg-red-50 text-red-700 rounded-lg text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle size={15} />
            <span>{apiError}</span>
          </div>
          <button onClick={() => setApiError(null)}>
            <X size={15} />
          </button>
        </div>
      )}

      {/* search */}
      <div className="relative mb-4 max-w-sm">
        <Search
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Cerca nome, cognome, crewcode…"
          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#177246]/25 focus:border-[#177246]"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 border-4 border-[#177246] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : members.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">
          Nessun socio disattivato{search && " per questa ricerca"}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Socio
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-32 hidden md:table-cell">
                  Ruolo
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                  Email
                </th>
                <th className="px-4 py-3 w-32" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {members.map((member) => {
                const rl = ruoloLabel(member.ruolo);
                return (
                  <tr
                    key={member.id}
                    className="group hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gray-200 text-gray-500 flex items-center justify-center text-xs font-bold shrink-0">
                          {member.nome?.[0]}
                          {member.cognome?.[0]}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {member.nome} {member.cognome}
                          </p>
                          <p className="text-xs font-mono text-gray-400">
                            {member.crewcode}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {rl && (
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            member.ruolo === Ruolo.PILOT
                              ? "bg-blue-50 text-blue-700"
                              : "bg-purple-50 text-purple-700"
                          }`}
                        >
                          {rl}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-gray-500">
                      {member.email}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => setHistoryMember(member)}
                          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Storico"
                        >
                          <History size={14} />
                        </button>
                        <button
                          onClick={() => handleReactivate(member)}
                          className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Riattiva"
                        >
                          <UserCheck size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(member)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Elimina definitivamente"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-600">
              <span>
                Pagina {page} di {totalPages}
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {historyMember && (
        <HistoryModal
          member={historyMember}
          onClose={() => setHistoryMember(null)}
        />
      )}
    </div>
  );
}
