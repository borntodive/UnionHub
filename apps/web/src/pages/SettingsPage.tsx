import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Card } from "../components/Card";
import { usersApi } from "../api/users";
import { useAuthStore } from "../store/authStore";
import { usePayslipStore } from "../payslip/usePayslipStore";

const CAPTAIN_GRADES = ["CPT", "LTC", "LCC", "TRI", "TRE"];

function isCaptainGrade(grade?: { codice?: string } | null): boolean {
  return CAPTAIN_GRADES.includes(grade?.codice?.toUpperCase() ?? "");
}

interface ProfileForm {
  dateOfEntry: string;
  dateOfCaptaincy?: string;
}

function ProfileSection() {
  const { user, setUser } = useAuthStore();
  const [saved, setSaved] = useState(false);
  const needsCaptaincy = !!user?.grade && isCaptainGrade(user.grade);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileForm>({
    defaultValues: {
      dateOfEntry: user?.dateOfEntry ? user.dateOfEntry.split("T")[0] : "",
      dateOfCaptaincy: user?.dateOfCaptaincy
        ? user.dateOfCaptaincy.split("T")[0]
        : "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: ProfileForm) => {
      const payload: { dateOfEntry?: string; dateOfCaptaincy?: string } = {};
      if (data.dateOfEntry) payload.dateOfEntry = data.dateOfEntry;
      if (needsCaptaincy && data.dateOfCaptaincy)
        payload.dateOfCaptaincy = data.dateOfCaptaincy;
      return usersApi.updateMe(payload);
    },
    onSuccess: (updated) => {
      if (user) setUser({ ...user, ...updated });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  return (
    <Card padding="md">
      <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4">
        Profilo
      </h2>

      <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <span className="text-xs text-gray-400 uppercase tracking-wide">
            Nome
          </span>
          <p className="font-medium text-gray-800 mt-0.5">
            {user?.nome} {user?.cognome}
          </p>
        </div>
        <div>
          <span className="text-xs text-gray-400 uppercase tracking-wide">
            Crewcode
          </span>
          <p className="font-medium text-gray-800 mt-0.5">{user?.crewcode}</p>
        </div>
        <div>
          <span className="text-xs text-gray-400 uppercase tracking-wide">
            Email
          </span>
          <p className="font-medium text-gray-800 mt-0.5">
            {user?.email ?? "—"}
          </p>
        </div>
        <div>
          <span className="text-xs text-gray-400 uppercase tracking-wide">
            Base
          </span>
          <p className="font-medium text-gray-800 mt-0.5">
            {user?.base?.codice ?? "—"}
          </p>
        </div>
      </div>

      <hr className="border-gray-100 mb-4" />

      <form
        onSubmit={handleSubmit((d) => mutation.mutate(d))}
        className="space-y-3"
      >
        <Input
          label="Data di assunzione"
          type="date"
          {...register("dateOfEntry")}
          error={errors.dateOfEntry?.message}
        />

        {needsCaptaincy && (
          <Input
            label="Data nomina comandante"
            type="date"
            {...register("dateOfCaptaincy")}
            error={errors.dateOfCaptaincy?.message}
          />
        )}

        {mutation.isError && (
          <p className="text-sm text-red-500">Errore durante il salvataggio.</p>
        )}

        <div className="flex items-center gap-3 pt-1">
          <Button type="submit" size="sm" loading={mutation.isPending}>
            Salva modifiche
          </Button>
          {saved && (
            <span className="flex items-center gap-1 text-sm text-green-600">
              <CheckCircle size={14} />
              Salvato
            </span>
          )}
        </div>
      </form>
    </Card>
  );
}

function PayslipSettingsSection() {
  const store = usePayslipStore();

  const rankLabel = (role: string, rank: string) => {
    if (!rank) return "—";
    return rank.toUpperCase();
  };

  return (
    <Card padding="md">
      <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4">
        Impostazioni Busta Paga
      </h2>
      <p className="text-xs text-gray-500 mb-4">
        Configura ruolo, qualifica e base dal calcolatore (sidebar sinistra). Le
        impostazioni vengono salvate automaticamente.
      </p>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <span className="text-xs text-gray-400 uppercase tracking-wide">
            Ruolo
          </span>
          <p className="font-medium text-gray-800 mt-0.5">
            {store.settings.role === "pil" ? "Pilota" : "Cabin Crew"}
          </p>
        </div>
        <div>
          <span className="text-xs text-gray-400 uppercase tracking-wide">
            Qualifica
          </span>
          <p className="font-medium text-gray-800 mt-0.5">
            {rankLabel(store.settings.role, store.settings.rank)}
          </p>
        </div>
        <div>
          <span className="text-xs text-gray-400 uppercase tracking-wide">
            Base
          </span>
          <p className="font-medium text-gray-800 mt-0.5">
            {store.settings.base || "—"}
          </p>
        </div>
        <div>
          <span className="text-xs text-gray-400 uppercase tracking-wide">
            Part-time
          </span>
          <p className="font-medium text-gray-800 mt-0.5">
            {store.settings.parttime
              ? `${(store.settings.parttimePercentage * 100).toFixed(0)}%`
              : "No"}
          </p>
        </div>
        {store.settings.cu && (
          <div className="col-span-2">
            <span className="text-xs text-gray-400 uppercase tracking-wide">
              Nuovo comandante (CU)
            </span>
            <p className="font-medium text-gray-800 mt-0.5">Sì (−10%)</p>
          </div>
        )}
        {store.settings.legacy && (
          <div className="col-span-2">
            <span className="text-xs text-gray-400 uppercase tracking-wide">
              Override contratto legacy
            </span>
            <p className="font-medium text-amber-700 mt-0.5">Attivo</p>
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-gray-100">
        <a
          href="/payslip"
          className="text-sm text-[#177246] hover:underline font-medium"
        >
          Apri calcolatore busta paga →
        </a>
      </div>
    </Card>
  );
}

export function SettingsPage() {
  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Impostazioni</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Gestisci il tuo profilo e le preferenze
        </p>
      </div>

      <ProfileSection />
      <PayslipSettingsSection />
    </div>
  );
}
