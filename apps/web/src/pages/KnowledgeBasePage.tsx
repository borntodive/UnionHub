import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Upload,
  Trash2,
  RefreshCw,
  FileText,
  X,
  CheckCircle,
  AlertCircle,
  Clock,
  Loader,
  BookOpen,
} from "lucide-react";
import {
  knowledgeBaseApi,
  type KbDocument,
  type KbAccessLevel,
} from "../api/knowledge-base";
import { Ruolo } from "@unionhub/shared/types";

/* ─── helpers ───────────────────────────────────────────────── */
function StatusBadge({ status }: { status: KbDocument["status"] }) {
  const map = {
    pending: {
      cls: "bg-gray-100 text-gray-600",
      icon: <Clock size={12} />,
      label: "In attesa",
    },
    indexing: {
      cls: "bg-blue-100 text-blue-700",
      icon: <Loader size={12} className="animate-spin" />,
      label: "Indicizzazione…",
    },
    ready: {
      cls: "bg-emerald-100 text-emerald-700",
      icon: <CheckCircle size={12} />,
      label: "Pronto",
    },
    error: {
      cls: "bg-red-100 text-red-700",
      icon: <AlertCircle size={12} />,
      label: "Errore",
    },
  };
  const { cls, icon, label } = map[status] ?? map.pending;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}
    >
      {icon} {label}
    </span>
  );
}

function AccessBadge({ level }: { level: KbAccessLevel }) {
  return (
    <span
      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
        level === "admin"
          ? "bg-amber-100 text-amber-700"
          : "bg-gray-100 text-gray-600"
      }`}
    >
      {level === "admin" ? "Solo admin" : "Tutti"}
    </span>
  );
}

/* ─── upload modal ───────────────────────────────────────────── */
function UploadModal({
  onClose,
  onUploaded,
}: {
  onClose: () => void;
  onUploaded: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [accessLevel, setAccessLevel] = useState<KbAccessLevel>("admin");
  const [ruolo, setRuolo] = useState<Ruolo | "">("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const canSubmit = !!file && title.trim().length > 0 && !loading;

  const handleSubmit = async () => {
    if (!canSubmit || !file) return;
    setLoading(true);
    setError(null);
    try {
      await knowledgeBaseApi.uploadDocument(
        file,
        title.trim(),
        accessLevel,
        ruolo || null,
      );
      onUploaded();
      onClose();
    } catch (e: unknown) {
      setError(
        (e as { response?: { data?: { message?: string } } }).response?.data
          ?.message ?? "Errore durante il caricamento",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            Carica documento
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* file picker */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              File PDF *
            </label>
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-[#177246] transition-colors"
            >
              {file ? (
                <div className="flex items-center justify-center gap-2 text-sm text-gray-700">
                  <FileText size={16} className="text-[#177246]" />
                  <span className="font-medium truncate max-w-xs">
                    {file.name}
                  </span>
                </div>
              ) : (
                <div className="text-gray-400 text-sm">
                  <Upload size={20} className="mx-auto mb-1" />
                  Clicca per selezionare un PDF
                </div>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>

          {/* title */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Titolo *
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="es. CCNL Piloti 2024"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#177246]/30 focus:border-[#177246]"
            />
          </div>

          {/* access level */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Visibilità
            </label>
            <div className="flex rounded-lg border border-gray-300 overflow-hidden text-sm">
              {(["all", "admin"] as KbAccessLevel[]).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setAccessLevel(lvl)}
                  className={`flex-1 py-2 font-medium transition-colors ${
                    accessLevel === lvl
                      ? "bg-[#177246] text-white"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {lvl === "all" ? "Tutti" : "Solo admin"}
                </button>
              ))}
            </div>
          </div>

          {/* ruolo */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Ruolo (opzionale)
            </label>
            <div className="flex rounded-lg border border-gray-300 overflow-hidden text-sm">
              {(["", Ruolo.PILOT, Ruolo.CABIN_CREW] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRuolo(r)}
                  className={`flex-1 py-2 font-medium transition-colors ${
                    ruolo === r
                      ? "bg-[#177246] text-white"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {r === "" ? "Tutti" : r === Ruolo.PILOT ? "Piloti" : "CC"}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
          >
            Annulla
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[#177246] text-white rounded-lg hover:bg-[#177246]/90 disabled:opacity-50 transition-colors"
          >
            {loading ? (
              <Loader size={14} className="animate-spin" />
            ) : (
              <Upload size={14} />
            )}
            {loading ? "Caricamento…" : "Carica"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── page ───────────────────────────────────────────────────── */
export function KnowledgeBasePage() {
  const [showUpload, setShowUpload] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reindexingId, setReindexingId] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data: docs, isLoading } = useQuery({
    queryKey: ["knowledgeBase"],
    queryFn: knowledgeBaseApi.getDocuments,
    refetchInterval: (query) => {
      const data = query.state.data as KbDocument[] | undefined;
      return data?.some(
        (d) => d.status === "indexing" || d.status === "pending",
      )
        ? 10_000
        : false;
    },
  });

  // auto-poll while any doc is indexing
  const hasIndexing = docs?.some(
    (d) => d.status === "indexing" || d.status === "pending",
  );
  useEffect(() => {
    if (!hasIndexing) return;
    const timer = setInterval(
      () => qc.invalidateQueries({ queryKey: ["knowledgeBase"] }),
      10_000,
    );
    return () => clearInterval(timer);
  }, [hasIndexing, qc]);

  const refresh = () => qc.invalidateQueries({ queryKey: ["knowledgeBase"] });

  const handleDelete = async (doc: KbDocument) => {
    if (!confirm(`Eliminare "${doc.title}"?`)) return;
    setDeletingId(doc.id);
    try {
      await knowledgeBaseApi.deleteDocument(doc.id);
      refresh();
    } catch {
      setApiError("Impossibile eliminare il documento");
    } finally {
      setDeletingId(null);
    }
  };

  const handleReindex = async (doc: KbDocument) => {
    if (!confirm(`Reindicizzare "${doc.title}"?`)) return;
    setReindexingId(doc.id);
    try {
      await knowledgeBaseApi.reindexDocument(doc.id);
      refresh();
    } catch {
      setApiError("Impossibile reindicizzare il documento");
    } finally {
      setReindexingId(null);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Base di conoscenza
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {docs?.length ?? 0} documenti · usati dall'assistente AI
          </p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[#177246] text-white rounded-lg hover:bg-[#177246]/90 transition-colors"
        >
          <Upload size={15} /> Carica PDF
        </button>
      </div>

      {apiError && (
        <div className="flex items-center justify-between p-3 mb-4 bg-red-50 text-red-700 rounded-lg text-sm">
          <span>{apiError}</span>
          <button onClick={() => setApiError(null)}>
            <X size={15} />
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 border-4 border-[#177246] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !docs?.length ? (
        <div className="flex flex-col items-center justify-center py-24 text-center text-gray-400">
          <BookOpen size={40} className="mb-3 opacity-40" />
          <p className="font-medium">Nessun documento</p>
          <p className="text-sm mt-1">
            Carica PDF per alimentare la base di conoscenza dell'AI
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Documento
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-32">
                  Stato
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-28">
                  Visibilità
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-28 hidden md:table-cell">
                  Ruolo
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-20 hidden lg:table-cell">
                  Chunks
                </th>
                <th className="px-4 py-3 w-24" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {docs.map((doc) => (
                <tr
                  key={doc.id}
                  className="group hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <FileText
                        size={16}
                        className={
                          doc.status === "ready"
                            ? "text-[#177246]"
                            : "text-gray-400"
                        }
                      />
                      <div>
                        <p className="font-medium text-gray-900">{doc.title}</p>
                        <p className="text-xs text-gray-400 font-mono">
                          {doc.filename}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={doc.status} />
                  </td>
                  <td className="px-4 py-3">
                    <AccessBadge level={doc.accessLevel} />
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-xs text-gray-500">
                    {doc.ruolo === Ruolo.PILOT
                      ? "Piloti"
                      : doc.ruolo === Ruolo.CABIN_CREW
                        ? "Cabin Crew"
                        : "Tutti"}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-xs text-gray-500">
                    {doc.chunkCount > 0 ? doc.chunkCount : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleReindex(doc)}
                        disabled={
                          reindexingId === doc.id || doc.status === "indexing"
                        }
                        className="p-1.5 text-gray-400 hover:text-[#177246] hover:bg-[#177246]/10 rounded-lg transition-colors disabled:opacity-40"
                        title="Reindicizza"
                      >
                        {reindexingId === doc.id ? (
                          <Loader size={14} className="animate-spin" />
                        ) : (
                          <RefreshCw size={14} />
                        )}
                      </button>
                      <button
                        onClick={() => handleDelete(doc)}
                        disabled={deletingId === doc.id}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                        title="Elimina"
                      >
                        {deletingId === doc.id ? (
                          <Loader size={14} className="animate-spin" />
                        ) : (
                          <Trash2 size={14} />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onUploaded={refresh}
        />
      )}
    </div>
  );
}
