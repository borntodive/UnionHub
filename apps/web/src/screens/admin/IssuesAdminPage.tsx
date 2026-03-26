import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  X,
  Download,
  ChevronRight,
  AlertCircle,
  Clock,
  CheckCircle,
} from "lucide-react";
import { issuesApi } from "../../api/issues";
import { issueCategoriesApi } from "../../api/references";
import { issueUrgenciesApi } from "../../api/references";
import { IssueStatus, Ruolo } from "@unionhub/shared/types";
import type {
  Issue,
  IssueCategory,
  IssueUrgency,
} from "@unionhub/shared/types";

/* ─── constants ──────────────────────────────────────────────── */
const STATUS_CFG = {
  [IssueStatus.OPEN]: {
    label: "Aperta",
    dot: "bg-emerald-500",
    badge: "bg-emerald-100 text-emerald-700",
    icon: <AlertCircle size={14} />,
  },
  [IssueStatus.IN_PROGRESS]: {
    label: "In corso",
    dot: "bg-amber-500",
    badge: "bg-amber-100 text-amber-700",
    icon: <Clock size={14} />,
  },
  [IssueStatus.SOLVED]: {
    label: "Risolta",
    dot: "bg-gray-400",
    badge: "bg-gray-100 text-gray-600",
    icon: <CheckCircle size={14} />,
  },
};

const LEVEL_COLOR: Record<number, string> = {
  1: "bg-green-100 text-green-700",
  2: "bg-lime-100 text-lime-700",
  3: "bg-amber-100 text-amber-700",
  4: "bg-red-100 text-red-700",
  5: "bg-violet-100 text-violet-700",
};

/* ─── detail panel ───────────────────────────────────────────── */
function IssueDetailPanel({
  issue,
  onClose,
  onUpdated,
}: {
  issue: Issue;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [notes, setNotes] = useState(issue.adminNotes ?? "");
  const [saving, setSaving] = useState(false);
  const [actioning, setActioning] = useState(false);
  const status = STATUS_CFG[issue.status];

  useEffect(() => {
    setNotes(issue.adminNotes ?? "");
  }, [issue.id, issue.adminNotes]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const saveNotes = async () => {
    setSaving(true);
    try {
      await issuesApi.updateIssue(issue.id, { adminNotes: notes });
      onUpdated();
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (newStatus: IssueStatus) => {
    setActioning(true);
    try {
      await issuesApi.updateIssue(issue.id, { status: newStatus });
      onUpdated();
    } finally {
      setActioning(false);
    }
  };

  const reopen = async () => {
    setActioning(true);
    try {
      await issuesApi.reopenIssue(issue.id);
      onUpdated();
    } finally {
      setActioning(false);
    }
  };

  return (
    <aside className="w-96 flex-shrink-0 border-l border-gray-200 bg-white flex flex-col overflow-hidden">
      {/* panel header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`w-2 h-2 rounded-full flex-shrink-0 ${status.dot}`}
          />
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${status.badge}`}
          >
            {status.label}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 flex-shrink-0"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 text-sm">
        {/* title */}
        <h3 className="font-bold text-gray-900 text-base leading-snug">
          {issue.title}
        </h3>

        {/* reporter */}
        {issue.user && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <div className="w-6 h-6 rounded-full bg-[#177246]/15 text-[#177246] flex items-center justify-center font-bold text-[10px] flex-shrink-0">
              {issue.user.nome?.[0]}
              {issue.user.cognome?.[0]}
            </div>
            <span>
              {issue.user.nome} {issue.user.cognome}
            </span>
            <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-[10px]">
              {issue.user.crewcode}
            </span>
          </div>
        )}

        {/* badges */}
        <div className="flex flex-wrap gap-1.5">
          {issue.category && (
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              {issue.category.nameIt}
            </span>
          )}
          {issue.urgency && (
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${LEVEL_COLOR[issue.urgency.level] ?? LEVEL_COLOR[3]}`}
            >
              L{issue.urgency.level} – {issue.urgency.nameIt}
            </span>
          )}
          {issue.ruolo && (
            <span className="text-xs bg-sky-50 text-sky-700 px-2 py-0.5 rounded-full">
              {issue.ruolo === Ruolo.PILOT ? "Pilota" : "Cabin Crew"}
            </span>
          )}
        </div>

        {/* dates */}
        <div className="text-xs text-gray-400 space-y-0.5">
          <p>
            Creata il{" "}
            {new Date(issue.createdAt).toLocaleDateString("it-IT", {
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
          {issue.solvedAt && (
            <p>
              Risolta il{" "}
              {new Date(issue.solvedAt).toLocaleDateString("it-IT", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
              {issue.solvedBy && (
                <span>
                  {" "}
                  da {issue.solvedBy.nome} {issue.solvedBy.cognome}
                </span>
              )}
            </p>
          )}
        </div>

        {/* description */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
            Descrizione
          </p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed bg-gray-50 rounded-lg px-3 py-2.5">
            {issue.description}
          </p>
        </div>

        {/* admin notes */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
            Note admin
          </p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="Aggiungi note interne…"
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#177246]/30 resize-none"
          />
          <button
            onClick={saveNotes}
            disabled={saving || notes === (issue.adminNotes ?? "")}
            className="mt-1.5 w-full py-1.5 text-xs font-medium text-white bg-[#177246] rounded-lg hover:bg-[#177246]/90 transition-colors disabled:opacity-40"
          >
            {saving ? "Salvataggio…" : "Salva note"}
          </button>
        </div>

        {/* actions */}
        <div className="space-y-2 pt-1">
          {issue.status === IssueStatus.OPEN && (
            <button
              onClick={() => changeStatus(IssueStatus.IN_PROGRESS)}
              disabled={actioning}
              className="w-full py-2 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors disabled:opacity-50"
            >
              Prendi in carico
            </button>
          )}
          {issue.status === IssueStatus.IN_PROGRESS && (
            <button
              onClick={() => changeStatus(IssueStatus.SOLVED)}
              disabled={actioning}
              className="w-full py-2 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-50"
            >
              Segna come risolta
            </button>
          )}
          {issue.status === IssueStatus.SOLVED && (
            <button
              onClick={reopen}
              disabled={actioning}
              className="w-full py-2 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              Riapri segnalazione
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}

/* ─── page ───────────────────────────────────────────────────── */
export function IssuesAdminPage() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<IssueStatus | "all">("all");
  const [filterRuolo, setFilterRuolo] = useState<Ruolo | "all">("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterUrgency, setFilterUrgency] = useState<number | 0>(0);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selected, setSelected] = useState<Issue | null>(null);
  const [exporting, setExporting] = useState(false);
  const qc = useQueryClient();

  const { data: issues, isLoading } = useQuery({
    queryKey: ["adminIssues"],
    queryFn: issuesApi.getIssues,
  });
  const { data: categories } = useQuery({
    queryKey: ["issueCategories"],
    queryFn: () => issueCategoriesApi.getCategories(),
  });
  const { data: urgencies } = useQuery({
    queryKey: ["issueUrgencies"],
    queryFn: issueUrgenciesApi.getUrgencies,
  });

  const filtered = useMemo(() => {
    let list = issues ?? [];
    if (filterStatus !== "all")
      list = list.filter((i) => i.status === filterStatus);
    if (filterRuolo !== "all")
      list = list.filter((i) => i.ruolo === filterRuolo);
    if (filterCategory !== "all")
      list = list.filter((i) => i.categoryId === filterCategory);
    if (filterUrgency !== 0)
      list = list.filter((i) => i.urgency?.level === filterUrgency);
    if (dateFrom)
      list = list.filter((i) => new Date(i.createdAt) >= new Date(dateFrom));
    if (dateTo)
      list = list.filter(
        (i) => new Date(i.createdAt) <= new Date(dateTo + "T23:59:59"),
      );
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q) ||
          i.user?.nome.toLowerCase().includes(q) ||
          i.user?.cognome.toLowerCase().includes(q) ||
          i.user?.crewcode.toLowerCase().includes(q),
      );
    }
    return list;
  }, [
    issues,
    filterStatus,
    filterRuolo,
    filterCategory,
    filterUrgency,
    dateFrom,
    dateTo,
    search,
  ]);

  const hasFilters =
    search ||
    filterStatus !== "all" ||
    filterRuolo !== "all" ||
    filterCategory !== "all" ||
    filterUrgency !== 0 ||
    dateFrom ||
    dateTo;

  const clearFilters = () => {
    setSearch("");
    setFilterStatus("all");
    setFilterRuolo("all");
    setFilterCategory("all");
    setFilterUrgency(0);
    setDateFrom("");
    setDateTo("");
  };

  const refreshSelected = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["adminIssues"] }).then(() => {
      const fresh = qc
        .getQueryData<Issue[]>(["adminIssues"])
        ?.find((i) => i.id === selected?.id);
      if (fresh) setSelected(fresh);
    });
  }, [qc, selected?.id]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await issuesApi.exportCsv();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `issues-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const statusCounts = useMemo(() => {
    const all = issues ?? [];
    return {
      open: all.filter((i) => i.status === IssueStatus.OPEN).length,
      inProgress: all.filter((i) => i.status === IssueStatus.IN_PROGRESS)
        .length,
      solved: all.filter((i) => i.status === IssueStatus.SOLVED).length,
    };
  }, [issues]);

  return (
    <div className="flex h-full overflow-hidden">
      {/* main list */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 bg-white flex-shrink-0">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Segnalazioni</h1>
            <div className="flex items-center gap-3 mt-1">
              {(
                [
                  [IssueStatus.OPEN, statusCounts.open, "emerald"],
                  [IssueStatus.IN_PROGRESS, statusCounts.inProgress, "amber"],
                  [IssueStatus.SOLVED, statusCounts.solved, "gray"],
                ] as const
              ).map(([status, count, color]) => (
                <button
                  key={status}
                  onClick={() =>
                    setFilterStatus(filterStatus === status ? "all" : status)
                  }
                  className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                    filterStatus === status
                      ? `text-${color}-700`
                      : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full bg-${color}-${color === "gray" ? "400" : "500"}`}
                  />
                  {STATUS_CFG[status].label} ({count})
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {exporting ? (
              <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
            ) : (
              <Download size={15} />
            )}
            Esporta CSV
          </button>
        </div>

        {/* filters */}
        <div className="flex gap-2 px-6 py-3 border-b border-gray-100 bg-gray-50/70 flex-shrink-0 flex-wrap">
          {/* search */}
          <div className="relative">
            <Search
              size={13}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca…"
              className="pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#177246]/30 w-44"
            />
          </div>

          <select
            value={filterRuolo}
            onChange={(e) => setFilterRuolo(e.target.value as Ruolo | "all")}
            className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#177246]/30 bg-white"
          >
            <option value="all">Tutti i ruoli</option>
            <option value={Ruolo.PILOT}>Piloti</option>
            <option value={Ruolo.CABIN_CREW}>Cabin Crew</option>
          </select>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#177246]/30 bg-white"
          >
            <option value="all">Tutte le categorie</option>
            {(categories ?? []).map((c: IssueCategory) => (
              <option key={c.id} value={c.id}>
                {c.nameIt}
              </option>
            ))}
          </select>

          <select
            value={filterUrgency}
            onChange={(e) => setFilterUrgency(Number(e.target.value))}
            className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#177246]/30 bg-white"
          >
            <option value={0}>Tutte le urgenze</option>
            {(urgencies ?? [])
              .sort((a: IssueUrgency, b: IssueUrgency) => a.level - b.level)
              .map((u: IssueUrgency) => (
                <option key={u.id} value={u.level}>
                  L{u.level} – {u.nameIt}
                </option>
              ))}
          </select>

          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#177246]/30"
            />
            <span className="text-xs text-gray-400">–</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#177246]/30"
            />
          </div>

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-2 py-1.5 hover:bg-white transition-colors"
            >
              <X size={11} />
              Rimuovi filtri
            </button>
          )}
        </div>

        {/* table */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <div className="w-7 h-7 border-4 border-[#177246] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <AlertCircle size={36} className="mb-3 opacity-30" />
              <p className="text-sm">
                {hasFilters ? "Nessun risultato" : "Nessuna segnalazione"}
              </p>
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-[#177246] hover:underline mt-2"
                >
                  Rimuovi i filtri
                </button>
              )}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Titolo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-36 hidden md:table-cell">
                    Utente
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-28 hidden lg:table-cell">
                    Categoria
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-20">
                    Urg.
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-28">
                    Stato
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-28 hidden xl:table-cell">
                    Data
                  </th>
                  <th className="px-4 py-3 w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {filtered.map((issue) => {
                  const s = STATUS_CFG[issue.status];
                  const isActive = selected?.id === issue.id;
                  return (
                    <tr
                      key={issue.id}
                      onClick={() => setSelected(isActive ? null : issue)}
                      className={`cursor-pointer transition-colors ${
                        isActive ? "bg-[#177246]/8" : "hover:bg-gray-50"
                      }`}
                    >
                      <td className="px-5 py-3">
                        <p className="font-medium text-gray-900 line-clamp-1">
                          {issue.title}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">
                          {issue.description}
                        </p>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <p className="text-gray-700 text-xs">
                          {issue.user?.nome} {issue.user?.cognome}
                        </p>
                        <p className="font-mono text-[10px] text-gray-400">
                          {issue.user?.crewcode}
                        </p>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {issue.category && (
                          <span className="text-xs text-gray-500">
                            {issue.category.nameIt}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {issue.urgency && (
                          <span
                            className={`text-xs font-bold px-1.5 py-0.5 rounded ${LEVEL_COLOR[issue.urgency.level] ?? LEVEL_COLOR[3]}`}
                          >
                            L{issue.urgency.level}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${s.badge}`}
                        >
                          {s.icon}
                          {s.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 hidden xl:table-cell">
                        {new Date(issue.createdAt).toLocaleDateString("it-IT", {
                          day: "2-digit",
                          month: "short",
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <ChevronRight
                          size={15}
                          className={`text-gray-300 transition-colors ${isActive ? "text-[#177246]" : ""}`}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* footer count */}
        <div className="px-6 py-2 border-t border-gray-100 bg-gray-50 text-xs text-gray-400 flex-shrink-0">
          {filtered.length} segnalazioni {hasFilters ? "filtrate" : "totali"}
        </div>
      </div>

      {/* side panel */}
      {selected && (
        <IssueDetailPanel
          key={selected.id}
          issue={selected}
          onClose={() => setSelected(null)}
          onUpdated={refreshSelected}
        />
      )}
    </div>
  );
}
