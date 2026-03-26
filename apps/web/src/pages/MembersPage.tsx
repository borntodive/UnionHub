import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  useQuery,
  useInfiniteQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Search,
  SlidersHorizontal,
  Users,
  X,
  Download,
  Upload,
  Plus,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Award,
  Calendar,
  ArrowRight,
} from "lucide-react";
import { usersApi } from "../api/users";
import { basesApi, contractsApi, gradesApi } from "../api/references";
import { useAuthStore } from "../store/authStore";
import { UserRole, Ruolo } from "@unionhub/shared/types";
import type { User } from "@unionhub/shared/types";

/* ─── constants ─────────────────────────────────────────────── */
const ITEMS_PER_PAGE = 25;

type SortKey = "nome" | "cognome" | "ruolo" | "base" | "grade" | "contratto";
type SortDir = "asc" | "desc";

/* ─── helpers ───────────────────────────────────────────────── */
const ruoloLabel = (r: Ruolo | null) =>
  r === Ruolo.PILOT ? "Pilota" : r === Ruolo.CABIN_CREW ? "Cabin Crew" : "—";

const ruoloBadge = (r: Ruolo | null) =>
  r === Ruolo.PILOT
    ? "bg-blue-50 text-blue-700 border border-blue-200"
    : r === Ruolo.CABIN_CREW
      ? "bg-purple-50 text-purple-700 border border-purple-200"
      : "bg-gray-100 text-gray-400";

const fmt = (d?: string | null) =>
  d
    ? new Date(d).toLocaleDateString("it-IT", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "—";

/* ─── sub-components ────────────────────────────────────────── */
function SortIcon({
  col,
  active,
  dir,
}: {
  col: string;
  active: boolean;
  dir: SortDir;
}) {
  if (!active)
    return <ChevronsUpDown size={13} className="text-gray-300 ml-0.5" />;
  return dir === "asc" ? (
    <ChevronUp size={13} className="text-[#177246] ml-0.5" />
  ) : (
    <ChevronDown size={13} className="text-[#177246] ml-0.5" />
  );
}

function Th({
  label,
  col,
  sort,
  onSort,
}: {
  label: string;
  col: SortKey;
  sort: { key: SortKey; dir: SortDir };
  onSort: (k: SortKey) => void;
}) {
  return (
    <th
      className="text-left px-4 py-3 font-medium text-gray-600 text-xs uppercase tracking-wide cursor-pointer select-none whitespace-nowrap hover:text-gray-900 transition-colors group"
      onClick={() => onSort(col)}
    >
      <span className="inline-flex items-center gap-0.5">
        {label}
        <SortIcon col={col} active={sort.key === col} dir={sort.dir} />
      </span>
    </th>
  );
}

function Avatar({ nome, cognome }: { nome?: string; cognome?: string }) {
  return (
    <div className="w-8 h-8 rounded-full bg-[#177246]/10 text-[#177246] flex items-center justify-center font-semibold text-xs flex-shrink-0">
      {nome?.[0]}
      {cognome?.[0]}
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string | null;
}) {
  if (!value) return null;
  return (
    <div className="flex gap-3 items-start py-2 border-b border-gray-50 last:border-0">
      <span className="text-gray-400 mt-0.5 flex-shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] text-gray-400 uppercase tracking-wide">
          {label}
        </p>
        <p className="text-sm text-gray-800 mt-0.5 break-words">{value}</p>
      </div>
    </div>
  );
}

function MemberPanel({
  member,
  onClose,
}: {
  member: User;
  onClose: () => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between p-5 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-[#177246]/10 text-[#177246] flex items-center justify-center text-lg font-bold flex-shrink-0">
            {member.nome?.[0]}
            {member.cognome?.[0]}
          </div>
          <div className="min-w-0">
            <h2 className="font-bold text-gray-900 truncate">
              {member.nome} {member.cognome}
            </h2>
            <p className="text-xs font-mono text-gray-500 mt-0.5">
              {member.crewcode}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 p-1 flex-shrink-0 mt-0.5"
        >
          <X size={18} />
        </button>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-1.5 px-5 py-3 border-b border-gray-100 flex-shrink-0">
        {[
          member.role === UserRole.SUPERADMIN
            ? { l: "SuperAdmin", c: "bg-red-100 text-red-700" }
            : member.role === UserRole.ADMIN
              ? { l: "Admin", c: "bg-amber-100 text-amber-700" }
              : null,
          member.ruolo
            ? { l: ruoloLabel(member.ruolo), c: ruoloBadge(member.ruolo) }
            : null,
          member.grade
            ? {
                l: member.grade.nome,
                c: "bg-green-50 text-green-700 border border-green-200",
              }
            : null,
          !member.isActive
            ? { l: "Disattivato", c: "bg-red-100 text-red-700" }
            : null,
          member.itud
            ? { l: "ITUD", c: "bg-indigo-100 text-indigo-700" }
            : null,
          member.rsa ? { l: "RSA", c: "bg-cyan-100 text-cyan-700" } : null,
        ]
          .filter(Boolean)
          .map((b, i) => (
            <span
              key={i}
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${b!.c}`}
            >
              {b!.l}
            </span>
          ))}
      </div>

      {/* Details */}
      <div className="flex-1 overflow-y-auto px-5 py-3">
        <div className="space-y-0">
          <InfoRow
            icon={<Mail size={14} />}
            label="Email"
            value={member.email}
          />
          <InfoRow
            icon={<Phone size={14} />}
            label="Telefono"
            value={member.telefono}
          />
          <InfoRow
            icon={<MapPin size={14} />}
            label="Base"
            value={
              member.base ? `${member.base.codice} – ${member.base.nome}` : null
            }
          />
          <InfoRow
            icon={<Briefcase size={14} />}
            label="Contratto"
            value={member.contratto?.nome}
          />
          <InfoRow
            icon={<Award size={14} />}
            label="Grado"
            value={member.grade?.nome}
          />
          <InfoRow
            icon={<Calendar size={14} />}
            label="Iscrizione"
            value={fmt(member.dataIscrizione)}
          />
          <InfoRow
            icon={<Calendar size={14} />}
            label="Ingresso"
            value={fmt(member.dateOfEntry)}
          />
          <InfoRow
            icon={<Calendar size={14} />}
            label="Capitano dal"
            value={fmt(member.dateOfCaptaincy)}
          />
          <InfoRow
            icon={<Calendar size={14} />}
            label="Registrato"
            value={fmt(member.createdAt)}
          />
        </div>
        {member.note && (
          <div className="mt-4 p-3 bg-gray-50 rounded-xl">
            <p className="text-[11px] uppercase tracking-wide text-gray-400 mb-1">
              Note
            </p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {member.note}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── main component ─────────────────────────────────────────── */
export function MembersPage() {
  const currentUser = useAuthStore((s) => s.user);
  const isSuperAdmin = currentUser?.role === UserRole.SUPERADMIN;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // search
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const debounceRef = useMemo(() => ({ timer: 0 }), []);
  const handleSearch = (v: string) => {
    setSearch(v);
    clearTimeout(debounceRef.timer);
    debounceRef.timer = window.setTimeout(() => setDebouncedSearch(v), 300);
  };

  // filters
  const [showFilters, setShowFilters] = useState(false);
  const [filterRuolo, setFilterRuolo] = useState<Ruolo | undefined>();
  const [filterBaseId, setFilterBaseId] = useState<string | undefined>();
  const [filterContrattoId, setFilterContrattoId] = useState<
    string | undefined
  >();
  const [filterGradeId, setFilterGradeId] = useState<string | undefined>();

  // sorting (client-side on current page batch)
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({
    key: "cognome",
    dir: "asc",
  });
  const toggleSort = (key: SortKey) =>
    setSort((prev) => ({
      key,
      dir: prev.key === key && prev.dir === "asc" ? "desc" : "asc",
    }));

  // panel
  const [panelMember, setPanelMember] = useState<User | null>(null);

  const filters = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      ruolo: filterRuolo,
      baseId: filterBaseId,
      contrattoId: filterContrattoId,
      gradeId: filterGradeId,
    }),
    [
      debouncedSearch,
      filterRuolo,
      filterBaseId,
      filterContrattoId,
      filterGradeId,
    ],
  );

  const { data: basesData } = useQuery({
    queryKey: ["bases"],
    queryFn: basesApi.getBases,
  });
  const { data: contractsData } = useQuery({
    queryKey: ["contracts"],
    queryFn: contractsApi.getContracts,
  });
  const { data: gradesData } = useQuery({
    queryKey: ["grades"],
    queryFn: gradesApi.getGrades,
  });

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useInfiniteQuery({
      queryKey: ["users", filters],
      queryFn: ({ pageParam = 1 }) =>
        usersApi.getUsersPaginated({
          page: pageParam as number,
          perPage: ITEMS_PER_PAGE,
          ...filters,
        }),
      getNextPageParam: (last) => {
        const totalPages = Math.ceil(last.total / ITEMS_PER_PAGE);
        return last.page < totalPages ? last.page + 1 : undefined;
      },
      initialPageParam: 1,
    });

  const allMembers = useMemo(
    () => data?.pages.flatMap((p) => p.data) ?? [],
    [data],
  );
  const total = data?.pages[0]?.total ?? 0;

  const sorted = useMemo(() => {
    const arr = [...allMembers];
    arr.sort((a, b) => {
      let va = "",
        vb = "";
      switch (sort.key) {
        case "nome":
          va = a.nome ?? "";
          vb = b.nome ?? "";
          break;
        case "cognome":
          va = a.cognome ?? "";
          vb = b.cognome ?? "";
          break;
        case "ruolo":
          va = a.ruolo ?? "";
          vb = b.ruolo ?? "";
          break;
        case "base":
          va = a.base?.codice ?? "";
          vb = b.base?.codice ?? "";
          break;
        case "grade":
          va = a.grade?.nome ?? "";
          vb = b.grade?.nome ?? "";
          break;
        case "contratto":
          va = a.contratto?.nome ?? "";
          vb = b.contratto?.nome ?? "";
          break;
      }
      return sort.dir === "asc"
        ? va.localeCompare(vb, "it")
        : vb.localeCompare(va, "it");
    });
    return arr;
  }, [allMembers, sort]);

  const activeFiltersCount = [
    filterRuolo,
    filterBaseId,
    filterContrattoId,
    filterGradeId,
  ].filter(Boolean).length;
  const clearFilters = () => {
    setFilterRuolo(undefined);
    setFilterBaseId(undefined);
    setFilterContrattoId(undefined);
    setFilterGradeId(undefined);
  };

  const handleExport = async () => {
    try {
      const csv = await usersApi.exportCsv({
        ruolo: filterRuolo,
        baseId: filterBaseId,
        contrattoId: filterContrattoId,
      });
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement("a"), {
        href: url,
        download: "soci.csv",
      });
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Errore esportazione CSV");
    }
  };

  const importInputRef = useRef<HTMLInputElement>(null);
  const [importResult, setImportResult] = useState<{
    created: number;
    errors: { row: number; message: string }[];
  } | null>(null);
  const [importing, setImporting] = useState(false);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    try {
      const result = await usersApi.bulkImport(file);
      setImportResult(result);
      queryClient.invalidateQueries({ queryKey: ["members"] });
    } catch {
      alert("Errore durante l'importazione");
    } finally {
      setImporting(false);
      if (importInputRef.current) importInputRef.current.value = "";
    }
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── main content ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <div className="flex-1 overflow-y-auto p-6">
          {/* header */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-gray-900">Soci</h1>
                {!isSuperAdmin && currentUser?.ruolo && (
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      currentUser.ruolo === Ruolo.PILOT
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : "bg-purple-50 text-purple-700 border border-purple-200"
                    }`}
                  >
                    {currentUser.ruolo === Ruolo.PILOT
                      ? "Piloti"
                      : "Cabin Crew"}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-0.5">
                {isLoading ? "…" : `${total} iscritti`}
                {sorted.length !== total &&
                  !isLoading &&
                  ` · ${sorted.length} caricati`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate("/members/new")}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-[#177246] text-white rounded-lg hover:bg-[#177246]/90 transition-colors"
              >
                <Plus size={15} /> Nuovo socio
              </button>
              <button
                onClick={() => importInputRef.current?.click()}
                disabled={importing}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <Upload size={15} />{" "}
                {importing ? "Importazione…" : "Importa CSV"}
              </button>
              <input
                ref={importInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={handleImport}
              />
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Download size={15} /> Esporta CSV
              </button>
            </div>
          </div>

          {/* Import result banner */}
          {importResult && (
            <div
              className={`mb-4 p-3 rounded-lg border text-sm flex items-start justify-between gap-3 ${
                importResult.errors.length === 0
                  ? "bg-green-50 border-green-200 text-green-800"
                  : "bg-amber-50 border-amber-200 text-amber-800"
              }`}
            >
              <div>
                <div className="font-medium">
                  Importazione completata: {importResult.created} soci creati
                  {importResult.errors.length > 0 &&
                    `, ${importResult.errors.length} errori`}
                </div>
                {importResult.errors.length > 0 && (
                  <ul className="mt-1 text-xs space-y-0.5">
                    {importResult.errors.slice(0, 5).map((err, i) => (
                      <li key={i}>
                        Riga {err.row}: {err.message}
                      </li>
                    ))}
                    {importResult.errors.length > 5 && (
                      <li>… e altri {importResult.errors.length - 5} errori</li>
                    )}
                  </ul>
                )}
              </div>
              <button
                onClick={() => setImportResult(null)}
                className="text-gray-400 hover:text-gray-600 flex-shrink-0"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* search + filter bar */}
          <div className="flex gap-2 mb-3">
            <div className="relative flex-1 max-w-sm">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Cerca nome, cognome, crewcode…"
                className="w-full pl-9 pr-9 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#177246]/25 focus:border-[#177246]"
              />
              {search && (
                <button
                  onClick={() => {
                    setSearch("");
                    setDebouncedSearch("");
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`relative flex items-center gap-2 px-3 py-2 text-sm font-medium border rounded-lg transition-colors ${
                showFilters || activeFiltersCount > 0
                  ? "bg-[#177246] text-white border-[#177246]"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              }`}
            >
              <SlidersHorizontal size={15} />
              Filtri
              {activeFiltersCount > 0 && (
                <span className="w-4 h-4 bg-white/30 text-white text-[10px] rounded-full flex items-center justify-center leading-none">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>

          {/* filter panel */}
          {showFilters && (
            <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
              {isSuperAdmin && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Ruolo
                  </label>
                  <select
                    value={filterRuolo ?? ""}
                    onChange={(e) =>
                      setFilterRuolo((e.target.value as Ruolo) || undefined)
                    }
                    className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#177246]/25"
                  >
                    <option value="">Tutti</option>
                    <option value={Ruolo.PILOT}>Piloti</option>
                    <option value={Ruolo.CABIN_CREW}>Cabin Crew</option>
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Base
                </label>
                <select
                  value={filterBaseId ?? ""}
                  onChange={(e) => setFilterBaseId(e.target.value || undefined)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#177246]/25"
                >
                  <option value="">Tutte</option>
                  {basesData?.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.codice} – {b.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Contratto
                </label>
                <select
                  value={filterContrattoId ?? ""}
                  onChange={(e) =>
                    setFilterContrattoId(e.target.value || undefined)
                  }
                  className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#177246]/25"
                >
                  <option value="">Tutti</option>
                  {contractsData?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Grado
                </label>
                <select
                  value={filterGradeId ?? ""}
                  onChange={(e) =>
                    setFilterGradeId(e.target.value || undefined)
                  }
                  className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#177246]/25"
                >
                  <option value="">Tutti</option>
                  {gradesData?.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.nome}
                    </option>
                  ))}
                </select>
              </div>
              {activeFiltersCount > 0 && (
                <div className="col-span-full">
                  <button
                    onClick={clearFilters}
                    className="text-xs text-red-500 hover:underline"
                  >
                    Rimuovi filtri
                  </button>
                </div>
              )}
            </div>
          )}

          {/* table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-7 h-7 border-4 border-[#177246] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : sorted.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-gray-400">
                <Users size={36} className="mb-2 opacity-30" />
                <p className="text-sm">Nessun socio trovato</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <Th
                          label="Cognome"
                          col="cognome"
                          sort={sort}
                          onSort={toggleSort}
                        />
                        <Th
                          label="Nome"
                          col="nome"
                          sort={sort}
                          onSort={toggleSort}
                        />
                        <Th
                          label="Ruolo"
                          col="ruolo"
                          sort={sort}
                          onSort={toggleSort}
                        />
                        <Th
                          label="Grado"
                          col="grade"
                          sort={sort}
                          onSort={toggleSort}
                        />
                        <Th
                          label="Base"
                          col="base"
                          sort={sort}
                          onSort={toggleSort}
                        />
                        <Th
                          label="Contratto"
                          col="contratto"
                          sort={sort}
                          onSort={toggleSort}
                        />
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {sorted.map((m) => (
                        <tr
                          key={m.id}
                          onClick={() => setPanelMember(m)}
                          className={`cursor-pointer transition-colors hover:bg-[#177246]/4 ${
                            panelMember?.id === m.id ? "bg-[#177246]/8" : ""
                          }`}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <Avatar nome={m.nome} cognome={m.cognome} />
                              <span className="font-medium text-gray-900">
                                {m.cognome}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-700">{m.nome}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`text-xs font-medium px-2 py-0.5 rounded-full ${ruoloBadge(m.ruolo)}`}
                            >
                              {ruoloLabel(m.ruolo)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600 text-sm">
                            {m.grade?.nome ?? "—"}
                          </td>
                          <td className="px-4 py-3 font-mono text-gray-500 text-xs">
                            {m.base?.codice ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs truncate max-w-[120px]">
                            {m.contratto?.nome ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <ArrowRight
                              size={15}
                              className={`transition-colors ${panelMember?.id === m.id ? "text-[#177246]" : "text-gray-300"}`}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {hasNextPage && (
                  <div className="flex justify-center py-3 border-t border-gray-100">
                    <button
                      onClick={() => fetchNextPage()}
                      disabled={isFetchingNextPage}
                      className="px-4 py-1.5 text-sm font-medium text-[#177246] border border-[#177246]/40 rounded-lg hover:bg-[#177246]/5 transition-colors disabled:opacity-50"
                    >
                      {isFetchingNextPage
                        ? "Caricamento…"
                        : `Carica altri (${total - sorted.length} rimanenti)`}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── side panel ── */}
      {panelMember && (
        <div className="w-80 flex-shrink-0 border-l border-gray-200 overflow-hidden shadow-sm transition-all">
          <MemberPanel
            member={panelMember}
            onClose={() => setPanelMember(null)}
          />
        </div>
      )}
    </div>
  );
}
