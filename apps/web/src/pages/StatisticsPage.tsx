import { useQuery } from "@tanstack/react-query";
import { usersApi } from "../api/users";
import { Download, Users, Plane, UserRound } from "lucide-react";

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: number | string;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
        {label}
      </p>
      <p className={`text-3xl font-bold ${color ?? "text-gray-900"}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

export function StatisticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["statistics"],
    queryFn: usersApi.getStatistics,
  });

  const handleExport = async () => {
    try {
      const csv = await usersApi.exportCsv();
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-[#177246] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Statistiche</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Panoramica degli iscritti
          </p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Download size={15} /> Esporta CSV
        </button>
      </div>

      {/* top stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Totale iscritti"
          value={data.totalUsers}
          color="text-[#177246]"
        />
        <StatCard
          label="Piloti"
          value={data.byRole.pilot}
          sub={`${Math.round((data.byRole.pilot / Math.max(data.totalUsers, 1)) * 100)}% del totale`}
        />
        <StatCard
          label="Cabin Crew"
          value={data.byRole.cabin_crew}
          sub={`${Math.round((data.byRole.cabin_crew / Math.max(data.totalUsers, 1)) * 100)}% del totale`}
        />
        <StatCard
          label="Nuove iscrizioni"
          value={data.recentRegistrations}
          sub="ultimi 30 giorni"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* by base */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">
            Per base operativa
          </h2>
          {data.byBase.length === 0 ? (
            <p className="text-sm text-gray-400">Nessun dato</p>
          ) : (
            <div className="space-y-3">
              {data.byBase
                .sort((a, b) => b.count - a.count)
                .map((row) => (
                  <div key={row.base} className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-700 w-16 shrink-0">
                      {row.base}
                    </span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-[#177246] h-2 rounded-full"
                        style={{
                          width: `${(row.count / Math.max(data.totalUsers, 1)) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm text-gray-500 w-8 text-right shrink-0">
                      {row.count}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* by contract */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">
            Per contratto
          </h2>
          {data.byContract.length === 0 ? (
            <p className="text-sm text-gray-400">Nessun dato</p>
          ) : (
            <div className="space-y-3">
              {data.byContract
                .sort((a, b) => b.count - a.count)
                .map((row) => (
                  <div key={row.contract} className="flex items-center gap-3">
                    <span
                      className="text-sm font-medium text-gray-700 shrink-0 truncate"
                      style={{ maxWidth: "9rem" }}
                      title={row.contract}
                    >
                      {row.contract}
                    </span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{
                          width: `${(row.count / Math.max(data.totalUsers, 1)) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm text-gray-500 w-8 text-right shrink-0">
                      {row.count}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* itud / rsa */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          label="Soci ITUD"
          value={data.itudCount}
          sub={`${Math.round((data.itudCount / Math.max(data.totalUsers, 1)) * 100)}% degli iscritti`}
          color="text-indigo-600"
        />
        <StatCard
          label="Soci RSA"
          value={data.rsaCount}
          sub={`${Math.round((data.rsaCount / Math.max(data.totalUsers, 1)) * 100)}% degli iscritti`}
          color="text-cyan-600"
        />
      </div>
    </div>
  );
}
