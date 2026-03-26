import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Award,
  Calendar,
  Shield,
  Pencil,
  UserX,
} from "lucide-react";
import { usersApi } from "../api/users";
import { Card } from "../components/Card";
import { useAuthStore } from "../store/authStore";
import { Ruolo, UserRole } from "@unionhub/shared/types";

const ruoloLabel = (r: Ruolo | null) =>
  r === Ruolo.PILOT ? "Pilota" : r === Ruolo.CABIN_CREW ? "Cabin Crew" : "—";

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
    <div className="flex items-start gap-3">
      <span className="text-gray-400 mt-0.5">{icon}</span>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-medium text-gray-900">{value}</p>
      </div>
    </div>
  );
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span
      className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${color}`}
    >
      {label}
    </span>
  );
}

export function MemberDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const isAdmin =
    currentUser?.role === UserRole.ADMIN ||
    currentUser?.role === UserRole.SUPERADMIN;
  const [deactivating, setDeactivating] = useState(false);

  const {
    data: member,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["user", id],
    queryFn: () => usersApi.getUserById(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-[#177246] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isError || !member) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>Socio non trovato.</p>
        <Link
          to="/members"
          className="mt-2 inline-block text-sm text-[#177246] hover:underline"
        >
          ← Torna ai soci
        </Link>
      </div>
    );
  }

  const handleDeactivate = async () => {
    if (!member) return;
    const reason = prompt(
      `Motivo disattivazione per ${member.nome} ${member.cognome} (opzionale):`,
    );
    if (reason === null) return; // cancelled
    setDeactivating(true);
    try {
      await usersApi.deactivateUser(member.id, reason || undefined);
      qc.invalidateQueries({ queryKey: ["users"] });
      qc.invalidateQueries({ queryKey: ["user", id] });
    } catch {
      alert("Impossibile disattivare il socio");
    } finally {
      setDeactivating(false);
    }
  };

  const formatDate = (d?: string | null) => {
    if (!d) return null;
    return new Date(d).toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Back + actions */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={() => navigate("/members")}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft size={16} /> Torna ai soci
        </button>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(`/members/${id}/edit`)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Pencil size={14} /> Modifica
            </button>
            {member.isActive && (
              <button
                onClick={handleDeactivate}
                disabled={deactivating}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                <UserX size={14} />
                {deactivating ? "…" : "Disattiva"}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Header card */}
      <Card className="p-6 mb-4">
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 rounded-2xl bg-[#177246]/10 text-[#177246] flex items-center justify-center text-xl font-bold flex-shrink-0">
            {member.nome?.[0]}
            {member.cognome?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900">
              {member.nome} {member.cognome}
            </h1>
            <p className="text-sm font-mono text-gray-500 mt-0.5">
              {member.crewcode}
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <Badge
                label={
                  member.role === UserRole.SUPERADMIN
                    ? "SuperAdmin"
                    : member.role === UserRole.ADMIN
                      ? "Admin"
                      : "Utente"
                }
                color={
                  member.role === UserRole.SUPERADMIN
                    ? "bg-red-100 text-red-700"
                    : member.role === UserRole.ADMIN
                      ? "bg-amber-100 text-amber-700"
                      : "bg-gray-100 text-gray-600"
                }
              />
              {member.ruolo && (
                <Badge
                  label={ruoloLabel(member.ruolo)}
                  color={
                    member.ruolo === Ruolo.PILOT
                      ? "bg-blue-100 text-blue-700"
                      : "bg-purple-100 text-purple-700"
                  }
                />
              )}
              {member.grade && (
                <Badge
                  label={member.grade.nome}
                  color="bg-green-100 text-green-700"
                />
              )}
              {!member.isActive && (
                <Badge label="Disattivato" color="bg-red-100 text-red-700" />
              )}
              {member.itud && (
                <Badge label="ITUD" color="bg-indigo-100 text-indigo-700" />
              )}
              {member.rsa && (
                <Badge label="RSA" color="bg-cyan-100 text-cyan-700" />
              )}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Contact */}
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Contatti</h2>
          <div className="space-y-3">
            <InfoRow
              icon={<Mail size={15} />}
              label="Email"
              value={member.email}
            />
            <InfoRow
              icon={<Phone size={15} />}
              label="Telefono"
              value={member.telefono}
            />
          </div>
        </Card>

        {/* Professional */}
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">
            Dati professionali
          </h2>
          <div className="space-y-3">
            <InfoRow
              icon={<MapPin size={15} />}
              label="Base"
              value={
                member.base
                  ? `${member.base.codice} – ${member.base.nome}`
                  : null
              }
            />
            <InfoRow
              icon={<Briefcase size={15} />}
              label="Contratto"
              value={member.contratto?.nome}
            />
            <InfoRow
              icon={<Award size={15} />}
              label="Grado"
              value={member.grade?.nome}
            />
          </div>
        </Card>

        {/* Dates */}
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Date</h2>
          <div className="space-y-3">
            <InfoRow
              icon={<Calendar size={15} />}
              label="Data iscrizione"
              value={formatDate(member.dataIscrizione)}
            />
            <InfoRow
              icon={<Calendar size={15} />}
              label="Data ingresso azienda"
              value={formatDate(member.dateOfEntry)}
            />
            <InfoRow
              icon={<Calendar size={15} />}
              label="Data nomina capitano"
              value={formatDate(member.dateOfCaptaincy)}
            />
            <InfoRow
              icon={<Calendar size={15} />}
              label="Registrato il"
              value={formatDate(member.createdAt)}
            />
          </div>
        </Card>

        {/* Notes */}
        {member.note && (
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Note</h2>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {member.note}
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
