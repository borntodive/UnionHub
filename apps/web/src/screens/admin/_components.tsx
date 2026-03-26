import { X } from "lucide-react";

/* ─── shared tiny components reused across all admin CRUD pages ─ */

export function FormShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDeleteModal({
  name,
  loading,
  onConfirm,
  onClose,
}: {
  name: string;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-bold text-gray-900 mb-1">Conferma eliminazione</h3>
        <p className="text-sm text-gray-500 mb-5">
          Elimina{" "}
          <span className="font-medium text-gray-800">
            &laquo;{name}&raquo;
          </span>
          ?{" "}
          <span className="text-red-500">
            Questa azione non può essere annullata.
          </span>
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            Annulla
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
          >
            {loading ? "Eliminazione…" : "Elimina"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ApiErrorBanner({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4">
      <span>⚠ {message}</span>
      <button
        onClick={onDismiss}
        className="text-red-400 hover:text-red-600 flex-shrink-0"
      >
        <X size={15} />
      </button>
    </div>
  );
}

export const inputCls =
  "w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#177246]/30";

export const labelCls = "block text-sm font-medium text-gray-700 mb-1";
