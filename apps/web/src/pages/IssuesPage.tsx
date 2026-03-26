import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, RefreshCw, Download, Plus, Send, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { issuesApi, CreateIssueData } from "../api/issues";
import { issueCategoriesApi, issueUrgenciesApi } from "../api/references";
import { useAuthStore } from "../store/authStore";
import { UserRole, IssueStatus } from "@unionhub/shared/types";
import type { Issue } from "@unionhub/shared/types";

/* ─── status config ──────────────────────────────────────────── */
const STATUS = {
  [IssueStatus.OPEN]: {
    label: "Aperta",
    dot: "bg-emerald-400",
    badge: "bg-emerald-100 text-emerald-700",
  },
  [IssueStatus.IN_PROGRESS]: {
    label: "In corso",
    dot: "bg-amber-400",
    badge: "bg-amber-100 text-amber-700",
  },
  [IssueStatus.SOLVED]: {
    label: "Risolta",
    dot: "bg-gray-300",
    badge: "bg-gray-100 text-gray-500",
  },
} as const;

/* ─── create issue modal ─────────────────────────────────────── */
function NewIssueModal({
  ruolo,
  onClose,
  onCreated,
}: {
  ruolo?: string | null;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { data: categories } = useQuery({
    queryKey: ["issueCategories", ruolo],
    queryFn: () => issueCategoriesApi.getCategories(ruolo ?? undefined),
  });
  const { data: urgencies } = useQuery({
    queryKey: ["issueUrgencies"],
    queryFn: issueUrgenciesApi.getUrgencies,
  });
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateIssueData>();

  const onSubmit = async (data: CreateIssueData) => {
    await issuesApi.createIssue(data);
    onCreated();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">Nuova segnalazione</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Titolo *
            </label>
            <input
              {...register("title", { required: "Obbligatorio" })}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#177246]/25 focus:border-[#177246]"
              placeholder="Titolo breve"
            />
            {errors.title && (
              <p className="text-xs text-red-500 mt-1">
                {errors.title.message}
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Descrizione *
            </label>
            <textarea
              {...register("description", { required: "Obbligatorio" })}
              rows={4}
              resize-none
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#177246]/25 focus:border-[#177246] resize-none"
              placeholder="Descrivi il problema in dettaglio…"
            />
            {errors.description && (
              <p className="text-xs text-red-500 mt-1">
                {errors.description.message}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Categoria *
              </label>
              <select
                {...register("categoryId", { required: "Obbligatorio" })}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#177246]/25"
              >
                <option value="">Seleziona…</option>
                {categories
                  ?.filter((c) => c.active)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nameIt}
                    </option>
                  ))}
              </select>
              {errors.categoryId && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.categoryId.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Urgenza *
              </label>
              <select
                {...register("urgencyId", { required: "Obbligatorio" })}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#177246]/25"
              >
                <option value="">Seleziona…</option>
                {urgencies
                  ?.filter((u) => u.active)
                  .sort((a, b) => b.level - a.level)
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      L{u.level} – {u.nameIt}
                    </option>
                  ))}
              </select>
              {errors.urgencyId && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.urgencyId.message}
                </p>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[#177246] text-white rounded-xl hover:bg-[#177246]/90 disabled:opacity-50"
            >
              <Send size={14} />
              {isSubmitting ? "Invio…" : "Invia"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── issue detail panel ─────────────────────────────────────── */
function IssuePanel({
  issue,
  isAdmin,
  onClose,
  onUpdated,
}: {
  issue: Issue;
  isAdmin: boolean;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState(issue.adminNotes ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setNotes(issue.adminNotes ?? "");
  }, [issue.id, issue.adminNotes]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const update = async (status?: IssueStatus, saveNotes?: boolean) => {
    setSaving(true);
    try {
      await issuesApi.updateIssue(issue.id, {
        ...(status ? { status } : {}),
        ...(saveNotes !== undefined ? { adminNotes: notes } : {}),
      });
      queryClient.invalidateQueries({ queryKey: ["adminIssues"] });
      onUpdated();
    } finally {
      setSaving(false);
    }
  };

  const reopen = async () => {
    await issuesApi.reopenIssue(issue.id);
    queryClient.invalidateQueries({ queryKey: ["adminIssues"] });
    onUpdated();
  };

  const st = STATUS[issue.status];

  return (
    <div className="flex flex-col h-full bg-white">
      {/* header */}
      <div className="flex items-start gap-3 p-5 border-b border-gray-100 flex-shrink-0">
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-gray-900 leading-snug">
            {issue.title}
          </h2>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${st.badge}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
              {st.label}
            </span>
            {issue.category && (
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                {issue.category.nameIt}
              </span>
            )}
            {issue.urgency && (
              <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-mono">
                L{issue.urgency.level}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 flex-shrink-0 mt-0.5"
        >
          <X size={17} />
        </button>
      </div>

      {/* body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* reporter */}
        <div>
          <p className="text-[11px] uppercase tracking-wide text-gray-400 mb-1">
            Segnalato da
          </p>
          <p className="text-sm font-medium text-gray-900">
            {issue.user?.nome} {issue.user?.cognome}
            <span className="text-gray-400 font-mono ml-1 font-normal">
              ({issue.user?.crewcode})
            </span>
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {new Date(issue.createdAt).toLocaleString("it-IT")}
          </p>
        </div>

        {/* description */}
        <div>
          <p className="text-[11px] uppercase tracking-wide text-gray-400 mb-1">
            Descrizione
          </p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-xl p-3 leading-relaxed">
            {issue.description}
          </p>
        </div>

        {/* admin notes */}
        {isAdmin && (
          <div>
            <label className="block text-[11px] uppercase tracking-wide text-gray-400 mb-1">
              Note admin
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#177246]/25 resize-none"
              placeholder="Note interne (visibili solo agli admin)…"
            />
          </div>
        )}

        {/* resolved info */}
        {issue.status === IssueStatus.SOLVED && issue.solvedBy && (
          <div className="bg-emerald-50 rounded-xl p-3 text-xs text-emerald-700">
            Risolta da{" "}
            <strong>
              {issue.solvedBy.nome} {issue.solvedBy.cognome}
            </strong>
            {issue.solvedAt &&
              ` il ${new Date(issue.solvedAt).toLocaleDateString("it-IT")}`}
          </div>
        )}
      </div>

      {/* actions */}
      {isAdmin && (
        <div className="p-4 border-t border-gray-100 flex-shrink-0 space-y-2">
          <div className="flex flex-wrap gap-2">
            {issue.status !== IssueStatus.IN_PROGRESS &&
              issue.status !== IssueStatus.SOLVED && (
                <button
                  onClick={() => update(IssueStatus.IN_PROGRESS)}
                  disabled={saving}
                  className="flex-1 py-1.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 disabled:opacity-50 transition-colors"
                >
                  Prendi in carico
                </button>
              )}
            {issue.status !== IssueStatus.SOLVED && (
              <button
                onClick={() => update(IssueStatus.SOLVED)}
                disabled={saving}
                className="flex-1 py-1.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 disabled:opacity-50 transition-colors"
              >
                Segna risolta
              </button>
            )}
            {issue.status === IssueStatus.SOLVED && (
              <button
                onClick={reopen}
                disabled={saving}
                className="flex-1 py-1.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
              >
                Riapri
              </button>
            )}
          </div>
          <button
            onClick={() => update(undefined, true)}
            disabled={saving}
            className="w-full py-1.5 text-xs font-medium bg-[#177246] text-white rounded-lg hover:bg-[#177246]/90 disabled:opacity-50 transition-colors"
          >
            {saving ? "Salvo…" : "Salva note"}
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── main page ──────────────────────────────────────────────── */
export function IssuesPage() {
  const currentUser = useAuthStore((s) => s.user);
  const isAdmin =
    currentUser?.role === UserRole.ADMIN ||
    currentUser?.role === UserRole.SUPERADMIN;

  const [filterStatus, setFilterStatus] = useState<IssueStatus | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selected, setSelected] = useState<Issue | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const queryClient = useQueryClient();

  const {
    data: issues,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["adminIssues"],
    queryFn: issuesApi.getIssues,
  });

  const filtered = useMemo(() => {
    let list = issues ?? [];
    if (filterStatus) list = list.filter((i) => i.status === filterStatus);
    if (dateFrom)
      list = list.filter((i) => new Date(i.createdAt) >= new Date(dateFrom));
    if (dateTo)
      list = list.filter(
        (i) => new Date(i.createdAt) <= new Date(dateTo + "T23:59:59"),
      );
    return list;
  }, [issues, filterStatus, dateFrom, dateTo]);

  const counts = {
    all: issues?.length ?? 0,
    [IssueStatus.OPEN]:
      issues?.filter((i) => i.status === IssueStatus.OPEN).length ?? 0,
    [IssueStatus.IN_PROGRESS]:
      issues?.filter((i) => i.status === IssueStatus.IN_PROGRESS).length ?? 0,
    [IssueStatus.SOLVED]:
      issues?.filter((i) => i.status === IssueStatus.SOLVED).length ?? 0,
  };

  const hasDateFilter = dateFrom || dateTo;

  const handleExport = async () => {
    try {
      const blob = await issuesApi.exportCsv();
      const url = URL.createObjectURL(blob);
      Object.assign(document.createElement("a"), {
        href: url,
        download: "segnalazioni.csv",
      }).click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Errore esportazione");
    }
  };

  // Keep selected in sync if list refreshes
  const refreshSelected = () => {
    if (selected) {
      const fresh = (issues ?? []).find((i) => i.id === selected.id);
      if (fresh) setSelected(fresh);
    }
    refetch();
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── main ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <div className="flex-1 overflow-y-auto p-6">
          {/* header */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Segnalazioni</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {counts.all} totali · {filtered.length} visualizzate
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => refetch()}
                className="p-2 text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <RefreshCw size={15} />
              </button>
              {isAdmin && (
                <button
                  onClick={handleExport}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Download size={15} /> CSV
                </button>
              )}
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-[#177246] text-white rounded-lg hover:bg-[#177246]/90 transition-colors"
              >
                <Plus size={15} /> Nuova
              </button>
            </div>
          </div>

          {/* filter bar */}
          <div className="flex flex-wrap gap-2 mb-4 items-center">
            {/* status tabs */}
            {(
              [
                null,
                IssueStatus.OPEN,
                IssueStatus.IN_PROGRESS,
                IssueStatus.SOLVED,
              ] as const
            ).map((s) => {
              const label = s === null ? "Tutte" : STATUS[s].label;
              const count = s === null ? counts.all : counts[s];
              const active = filterStatus === s;
              return (
                <button
                  key={String(s)}
                  onClick={() => setFilterStatus(s)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    active
                      ? "bg-[#177246] text-white"
                      : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {s && (
                    <span className={`w-2 h-2 rounded-full ${STATUS[s].dot}`} />
                  )}
                  {label}
                  <span
                    className={`text-[11px] px-1.5 py-0.5 rounded-full leading-none ${active ? "bg-white/20" : "bg-gray-100 text-gray-500"}`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}

            {/* date separator */}
            <div className="h-5 w-px bg-gray-200 mx-1 hidden sm:block" />

            {/* date range */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-400">Dal</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#177246]/25"
              />
              <span className="text-xs text-gray-400">al</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#177246]/25"
              />
              {hasDateFilter && (
                <button
                  onClick={() => {
                    setDateFrom("");
                    setDateTo("");
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-7 h-7 border-4 border-[#177246] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-gray-400">
                <AlertCircle size={36} className="mb-2 opacity-30" />
                <p className="text-sm">Nessuna segnalazione</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Segnalazione
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Utente
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Categoria
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Urgenza
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Stato
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Data
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.map((issue) => {
                      const st = STATUS[issue.status];
                      const active = selected?.id === issue.id;
                      return (
                        <tr
                          key={issue.id}
                          onClick={() => setSelected(issue)}
                          className={`cursor-pointer transition-colors hover:bg-[#177246]/4 ${active ? "bg-[#177246]/8" : ""}`}
                        >
                          <td className="px-4 py-3 max-w-xs">
                            <p className="font-medium text-gray-900 truncate">
                              {issue.title}
                            </p>
                            <p className="text-xs text-gray-400 truncate mt-0.5">
                              {issue.description}
                            </p>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-gray-600">
                            {issue.user?.crewcode ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500">
                            {issue.category?.nameIt ?? "—"}
                          </td>
                          <td className="px-4 py-3">
                            {issue.urgency && (
                              <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-mono">
                                L{issue.urgency.level}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${st.badge}`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${st.dot}`}
                              />
                              {st.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                            {new Date(issue.createdAt).toLocaleDateString(
                              "it-IT",
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── side panel ── */}
      {selected && (
        <div className="w-80 flex-shrink-0 border-l border-gray-200 overflow-hidden">
          <IssuePanel
            key={selected.id}
            issue={selected}
            isAdmin={isAdmin}
            onClose={() => setSelected(null)}
            onUpdated={refreshSelected}
          />
        </div>
      )}

      {/* create modal */}
      {showCreate && (
        <NewIssueModal
          ruolo={currentUser?.ruolo}
          onClose={() => setShowCreate(false)}
          onCreated={() =>
            queryClient.invalidateQueries({ queryKey: ["adminIssues"] })
          }
        />
      )}
    </div>
  );
}
