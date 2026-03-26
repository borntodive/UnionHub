import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Calculator,
  Clock,
  Thermometer,
  AlertCircle,
  Users,
  BarChart2,
  FileText,
  MessageSquare,
} from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { usersApi } from "../api/users";
import { UserRole } from "@unionhub/shared/types";

interface QuickLinkProps {
  to: string;
  label: string;
  icon: React.ElementType;
  sub?: string;
}

function QuickLink({ to, label, icon: Icon, sub }: QuickLinkProps) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(to)}
      className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-gray-200 hover:border-[#177246]/40 hover:shadow-sm transition-all text-center"
    >
      <Icon size={22} className="text-[#177246]" />
      <div>
        <div className="text-sm font-medium text-gray-800">{label}</div>
        {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
      </div>
    </button>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="text-xs font-medium text-gray-400 uppercase tracking-wide">
        {label}
      </div>
      <div className="text-2xl font-bold text-gray-900 mt-1">{value}</div>
    </div>
  );
}

export function HomePage() {
  const { user } = useAuthStore();
  const isAdmin =
    user?.role === UserRole.ADMIN || user?.role === UserRole.SUPERADMIN;

  const { data: stats } = useQuery({
    queryKey: ["statistics"],
    queryFn: usersApi.getStatistics,
    enabled: isAdmin,
  });

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Welcome */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Ciao, {user?.nome}</h1>
        <p className="text-sm text-gray-500 mt-0.5">Benvenuto in UnionHub</p>
      </div>

      {/* Admin stats */}
      {isAdmin && stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard label="Soci attivi" value={stats.totalUsers} />
          <StatCard label="Piloti" value={stats.byRole.pilot} />
          <StatCard label="Cabin Crew" value={stats.byRole.cabin_crew} />
          <StatCard label="Nuovi iscritti" value={stats.recentRegistrations} />
        </div>
      )}

      {/* Tools */}
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
        Strumenti
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        <QuickLink to="/payslip" label="Busta Paga" icon={Calculator} />
        <QuickLink to="/ftl" label="FTL Calculator" icon={Clock} />
        <QuickLink to="/ctc" label="CTC Calculator" icon={Thermometer} />
        <QuickLink to="/documents" label="Documenti" icon={FileText} />
        <QuickLink to="/my-issues" label="Segnalazioni" icon={AlertCircle} />
      </div>

      {/* Admin management links */}
      {isAdmin && (
        <>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
            Gestione
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <QuickLink
              to="/members"
              label="Soci"
              icon={Users}
              sub={stats ? `${stats.totalUsers} iscritti` : undefined}
            />
            <QuickLink
              to="/admin/issues"
              label="Segnalazioni"
              icon={AlertCircle}
              sub="Gestisci"
            />
            <QuickLink
              to="/chatbot"
              label="Assistente AI"
              icon={MessageSquare}
              sub="RAG chatbot"
            />
            <QuickLink
              to="/admin/statistics"
              label="Statistiche"
              icon={BarChart2}
              sub="Rapporti"
            />
          </div>
        </>
      )}
    </div>
  );
}
