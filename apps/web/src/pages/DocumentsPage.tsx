import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import {
  FileText,
  Download,
  Eye,
  X,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  Search,
} from "lucide-react";
import { documentsApi } from "../api/documents";
import type {
  Document,
  DocumentStatus,
  CreateDocumentData,
} from "../api/documents";
import { Card } from "../components/Card";
import { useAuthStore } from "../store/authStore";
import { UserRole } from "@unionhub/shared/types";

/* ─── status config ──────────────────────────────────────────── */
const STATUS: Record<
  DocumentStatus,
  { label: string; badge: string; icon: React.ReactNode }
> = {
  draft: {
    label: "Bozza",
    badge: "bg-gray-100 text-gray-600",
    icon: <Clock size={11} />,
  },
  reviewing: {
    label: "In revisione",
    badge: "bg-blue-100 text-blue-700",
    icon: <Clock size={11} />,
  },
  approved: {
    label: "Approvato",
    badge: "bg-amber-100 text-amber-700",
    icon: <CheckCircle size={11} />,
  },
  verified: {
    label: "Verificato",
    badge: "bg-indigo-100 text-indigo-700",
    icon: <CheckCircle size={11} />,
  },
  published: {
    label: "Pubblicato",
    badge: "bg-emerald-100 text-emerald-700",
    icon: <CheckCircle size={11} />,
  },
  rejected: {
    label: "Rifiutato",
    badge: "bg-red-100 text-red-700",
    icon: <AlertCircle size={11} />,
  },
};

const UNION_LABEL: Record<string, string> = {
  "fit-cisl": "FIT-CISL",
  joint: "Congiunta",
};
const RUOLO_LABEL: Record<string, string> = {
  pilot: "Piloti",
  cabin_crew: "Cabin Crew",
};

/* ─── pdf viewer ─────────────────────────────────────────────── */
function PdfViewerModal({
  doc,
  isAdmin,
  onClose,
}: {
  doc: Document;
  isAdmin: boolean;
  onClose: () => void;
}) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const blobRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    documentsApi
      .getPdfBlobUrl(doc.id, isAdmin)
      .then((url) => {
        if (!cancelled) {
          blobRef.current = url;
          setPdfUrl(url);
        }
      })
      .catch(() => !cancelled && setLoadError(true));

    return () => {
      cancelled = true;
      if (blobRef.current) URL.revokeObjectURL(blobRef.current);
    };
  }, [doc.id, isAdmin]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await documentsApi.downloadPdf(doc.id, doc.title, isAdmin);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/80"
      onClick={onClose}
    >
      {/* topbar */}
      <div
        className="flex items-center justify-between px-5 py-3 bg-gray-900 text-white flex-shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 min-w-0">
          <FileText size={17} className="text-gray-400 flex-shrink-0" />
          <span className="font-medium text-sm truncate">{doc.title}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white bg-white/10 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
          >
            {downloading ? (
              <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Download size={13} />
            )}
            Scarica
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* iframe */}
      <div
        className="flex-1 overflow-hidden bg-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        {loadError ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <AlertCircle size={32} className="mb-3 opacity-50" />
            <p className="text-sm">Impossibile caricare il PDF.</p>
          </div>
        ) : !pdfUrl ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        ) : (
          <iframe
            src={pdfUrl}
            className="w-full h-full border-0"
            title={doc.title}
          />
        )}
      </div>
    </div>
  );
}

/* ─── new document modal (admin) ─────────────────────────────── */
function NewDocumentModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateDocumentData>();

  const onSubmit = async (data: CreateDocumentData) => {
    await documentsApi.createDocument(data);
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
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Nuovo documento</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Titolo *
            </label>
            <input
              {...register("title", { required: "Campo obbligatorio" })}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#177246]/30"
              placeholder="Titolo del comunicato"
            />
            {errors.title && (
              <p className="text-xs text-red-500 mt-1">
                {errors.title.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contenuto *
            </label>
            <textarea
              {...register("content", { required: "Campo obbligatorio" })}
              rows={6}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#177246]/30 resize-none"
              placeholder="Testo del comunicato…"
            />
            {errors.content && (
              <p className="text-xs text-red-500 mt-1">
                {errors.content.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo lettera
              </label>
              <select
                {...register("union")}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#177246]/30"
              >
                <option value="fit-cisl">FIT-CISL</option>
                <option value="joint">Congiunta</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Destinatari
              </label>
              <select
                {...register("ruolo")}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#177246]/30"
              >
                <option value="pilot">Piloti</option>
                <option value="cabin_crew">Cabin Crew</option>
              </select>
            </div>
          </div>

          <p className="text-xs text-gray-400">
            Il documento verrà creato come bozza. Potrai avviare la revisione AI
            e la pubblicazione dall'app mobile.
          </p>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[#177246] text-white rounded-lg hover:bg-[#177246]/90 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Plus size={15} />
              )}
              {isSubmitting ? "Creazione…" : "Crea bozza"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── document card ──────────────────────────────────────────── */
function DocumentCard({
  doc,
  isAdmin,
  onView,
}: {
  doc: Document;
  isAdmin: boolean;
  onView: (doc: Document) => void;
}) {
  const [downloading, setDownloading] = useState(false);
  const status = STATUS[doc.status];
  const hasPdf = doc.finalPdfUrl !== null;

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setDownloading(true);
    try {
      await documentsApi.downloadPdf(doc.id, doc.title, isAdmin);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Card className="p-4 flex flex-col gap-3 hover:shadow-md transition-shadow">
      {/* title row */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#177246]/10 text-[#177246] flex items-center justify-center flex-shrink-0">
          <FileText size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2">
            {doc.title}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {UNION_LABEL[doc.union] ?? doc.union} ·{" "}
            {RUOLO_LABEL[doc.ruolo] ?? doc.ruolo}
          </p>
        </div>
      </div>

      {/* meta row */}
      <div className="flex items-center justify-between gap-2">
        <span
          className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${status?.badge}`}
        >
          {status?.icon}
          {status?.label}
        </span>
        <span className="text-xs text-gray-400 flex-shrink-0">
          {new Date(doc.createdAt).toLocaleDateString("it-IT", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
        </span>
      </div>

      {doc.author && (
        <p className="text-xs text-gray-400 -mt-1">
          {doc.author.nome} {doc.author.cognome}
        </p>
      )}

      {/* action buttons */}
      {hasPdf && (
        <div className="flex gap-2 pt-1 border-t border-gray-100">
          <button
            onClick={() => onView(doc)}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-[#177246] border border-[#177246]/30 rounded-lg hover:bg-[#177246]/5 transition-colors"
          >
            <Eye size={13} />
            Visualizza
          </button>
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {downloading ? (
              <div className="w-3 h-3 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
            ) : (
              <Download size={13} />
            )}
            Scarica
          </button>
        </div>
      )}
    </Card>
  );
}

/* ─── main page ──────────────────────────────────────────────── */
export function DocumentsPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const isAdmin =
    user?.role === UserRole.ADMIN || user?.role === UserRole.SUPERADMIN;

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<DocumentStatus | "all">(
    "all",
  );
  const [filterRuolo, setFilterRuolo] = useState<
    "all" | "pilot" | "cabin_crew"
  >("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [viewerDoc, setViewerDoc] = useState<Document | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const { data: documents, isLoading } = useQuery({
    queryKey: ["documents", isAdmin ? "all" : "published"],
    queryFn: isAdmin
      ? documentsApi.getDocuments
      : documentsApi.getPublishedDocuments,
  });

  const filtered = useMemo(() => {
    let list = documents ?? [];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((d) => d.title.toLowerCase().includes(q));
    }
    if (filterStatus !== "all")
      list = list.filter((d) => d.status === filterStatus);
    if (filterRuolo !== "all")
      list = list.filter((d) => d.ruolo === filterRuolo);
    if (dateFrom)
      list = list.filter((d) => new Date(d.createdAt) >= new Date(dateFrom));
    if (dateTo)
      list = list.filter(
        (d) => new Date(d.createdAt) <= new Date(dateTo + "T23:59:59"),
      );
    return list;
  }, [documents, search, filterStatus, filterRuolo, dateFrom, dateTo]);

  const hasFilters =
    search ||
    filterStatus !== "all" ||
    filterRuolo !== "all" ||
    dateFrom ||
    dateTo;

  const clearFilters = () => {
    setSearch("");
    setFilterStatus("all");
    setFilterRuolo("all");
    setDateFrom("");
    setDateTo("");
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documenti</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isLoading
              ? "Caricamento…"
              : `${filtered.length} ${isAdmin ? "totali" : "pubblicati"}`}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[#177246] text-white rounded-lg hover:bg-[#177246]/90 transition-colors"
          >
            <Plus size={16} />
            Nuovo documento
          </button>
        )}
      </div>

      {/* filters */}
      <div className="flex gap-2 mb-5 flex-wrap items-center">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca titolo…"
            className="pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#177246]/30 w-48"
          />
        </div>

        {isAdmin && (
          <select
            value={filterStatus}
            onChange={(e) =>
              setFilterStatus(e.target.value as DocumentStatus | "all")
            }
            className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#177246]/30 bg-white"
          >
            <option value="all">Tutti gli stati</option>
            {Object.entries(STATUS).map(([key, val]) => (
              <option key={key} value={key}>
                {val.label}
              </option>
            ))}
          </select>
        )}

        <select
          value={filterRuolo}
          onChange={(e) =>
            setFilterRuolo(e.target.value as "all" | "pilot" | "cabin_crew")
          }
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#177246]/30 bg-white"
        >
          <option value="all">Tutti i ruoli</option>
          <option value="pilot">Piloti</option>
          <option value="cabin_crew">Cabin Crew</option>
        </select>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#177246]/30"
          />
          <span className="text-xs text-gray-400">–</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#177246]/30"
          />
        </div>

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 px-2 py-1 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <X size={12} />
            Rimuovi filtri
          </button>
        )}
      </div>

      {/* content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-[#177246] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <FileText size={40} className="mb-3 opacity-30" />
          <p className="text-sm font-medium">
            {hasFilters ? "Nessun risultato" : "Nessun documento"}
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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((doc) => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              isAdmin={isAdmin}
              onView={setViewerDoc}
            />
          ))}
        </div>
      )}

      {/* PDF viewer modal */}
      {viewerDoc && (
        <PdfViewerModal
          doc={viewerDoc}
          isAdmin={isAdmin}
          onClose={() => setViewerDoc(null)}
        />
      )}

      {/* create modal */}
      {showCreate && (
        <NewDocumentModal
          onClose={() => setShowCreate(false)}
          onCreated={() =>
            queryClient.invalidateQueries({ queryKey: ["documents"] })
          }
        />
      )}
    </div>
  );
}
