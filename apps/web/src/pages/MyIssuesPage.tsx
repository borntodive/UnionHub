import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Plus, X, Send } from "lucide-react";
import { useForm } from "react-hook-form";
import { issuesApi, CreateIssueData } from "../api/issues";
import { issueCategoriesApi, issueUrgenciesApi } from "../api/references";
import { useAuthStore } from "../store/authStore";
import { IssueStatus } from "@unionhub/shared/types";
import type { Issue } from "@unionhub/shared/types";
import { Card } from "../components/Card";

const statusConfig = {
  [IssueStatus.OPEN]: {
    label: "Aperta",
    class: "bg-emerald-100 text-emerald-700",
  },
  [IssueStatus.IN_PROGRESS]: {
    label: "In corso",
    class: "bg-amber-100 text-amber-700",
  },
  [IssueStatus.SOLVED]: {
    label: "Risolta",
    class: "bg-gray-100 text-gray-600",
  },
};

function NewIssueModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const currentUser = useAuthStore((s) => s.user);
  const { data: categories } = useQuery({
    queryKey: ["issueCategories", currentUser?.ruolo],
    queryFn: () =>
      issueCategoriesApi.getCategories(currentUser?.ruolo ?? undefined),
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
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">
            Nuova segnalazione
          </h2>
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
              placeholder="Titolo breve della segnalazione"
            />
            {errors.title && (
              <p className="text-xs text-red-500 mt-1">
                {errors.title.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descrizione *
            </label>
            <textarea
              {...register("description", { required: "Campo obbligatorio" })}
              rows={4}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#177246]/30 resize-none"
              placeholder="Descrivi il problema in dettaglio…"
            />
            {errors.description && (
              <p className="text-xs text-red-500 mt-1">
                {errors.description.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categoria *
              </label>
              <select
                {...register("categoryId", {
                  required: "Seleziona una categoria",
                })}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#177246]/30"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Urgenza *
              </label>
              <select
                {...register("urgencyId", { required: "Seleziona l'urgenza" })}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#177246]/30"
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
              <Send size={15} />
              {isSubmitting ? "Invio…" : "Invia segnalazione"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function IssueCard({ issue }: { issue: Issue }) {
  const [expanded, setExpanded] = useState(false);
  const status = statusConfig[issue.status];
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-900 text-sm">
              {issue.title}
            </h3>
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${status?.class}`}
            >
              {status?.label}
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
          <p className="text-xs text-gray-400 mt-1">
            {new Date(issue.createdAt).toLocaleDateString("it-IT")}
          </p>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-gray-400 hover:text-gray-600 flex-shrink-0"
        >
          <AlertCircle size={16} />
        </button>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
          <p className="text-sm text-gray-700 whitespace-pre-wrap">
            {issue.description}
          </p>
          {issue.adminNotes && (
            <div className="bg-amber-50 rounded-lg p-3">
              <p className="text-xs font-medium text-amber-700 mb-1">
                Note admin
              </p>
              <p className="text-xs text-amber-800">{issue.adminNotes}</p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export function MyIssuesPage() {
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();

  const { data: issues, isLoading } = useQuery({
    queryKey: ["myIssues"],
    queryFn: issuesApi.getMyIssues,
  });

  const open = (issues ?? []).filter((i) => i.status === IssueStatus.OPEN);
  const inProgress = (issues ?? []).filter(
    (i) => i.status === IssueStatus.IN_PROGRESS,
  );
  const solved = (issues ?? []).filter((i) => i.status === IssueStatus.SOLVED);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Le mie segnalazioni
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {issues?.length ?? 0} totali
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[#177246] text-white rounded-lg hover:bg-[#177246]/90 transition-colors"
        >
          <Plus size={16} />
          Nuova segnalazione
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-[#177246] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (issues ?? []).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <AlertCircle size={40} className="mb-3 opacity-40" />
          <p className="text-sm mb-1">Nessuna segnalazione inviata</p>
          <button
            onClick={() => setShowForm(true)}
            className="text-xs text-[#177246] hover:underline mt-1"
          >
            Crea la prima
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {open.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Aperte ({open.length})
              </h2>
              <div className="space-y-2">
                {open.map((i) => (
                  <IssueCard key={i.id} issue={i} />
                ))}
              </div>
            </section>
          )}
          {inProgress.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                In corso ({inProgress.length})
              </h2>
              <div className="space-y-2">
                {inProgress.map((i) => (
                  <IssueCard key={i.id} issue={i} />
                ))}
              </div>
            </section>
          )}
          {solved.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Risolte ({solved.length})
              </h2>
              <div className="space-y-2">
                {solved.map((i) => (
                  <IssueCard key={i.id} issue={i} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {showForm && (
        <NewIssueModal
          onClose={() => setShowForm(false)}
          onCreated={() =>
            queryClient.invalidateQueries({ queryKey: ["myIssues"] })
          }
        />
      )}
    </div>
  );
}
