import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Card } from "../components/Card";
import { usersApi } from "../api/users";
import { useAuthStore } from "../store/authStore";

const CAPTAIN_GRADES = ["CPT", "LTC", "LCC", "TRI", "TRE"];

function isCaptainGrade(grade?: { codice?: string } | null): boolean {
  return CAPTAIN_GRADES.includes(grade?.codice?.toUpperCase() ?? "");
}

interface ProfileForm {
  dateOfEntry: string;
  dateOfCaptaincy?: string;
}

export function CompleteProfilePage() {
  const { user, setUser } = useAuthStore();
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
      const [y, m, d] = data.dateOfEntry.split("-");
      const dateOfEntry = `${y}-${m}-${d}`;
      const payload: { dateOfEntry: string; dateOfCaptaincy?: string } = {
        dateOfEntry,
      };
      if (needsCaptaincy && data.dateOfCaptaincy) {
        const [cy, cm, cd] = data.dateOfCaptaincy.split("-");
        payload.dateOfCaptaincy = `${cy}-${cm}-${cd}`;
      }
      return usersApi.updateMe(payload);
    },
    onSuccess: (updated) => {
      if (user) setUser({ ...user, ...updated });
    },
  });

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[#177246]/10 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">📋</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Completa il profilo
          </h1>
          <p className="text-sm text-gray-500 mt-2">
            Per continuare è necessario inserire alcune date obbligatorie.
          </p>
        </div>

        <Card>
          <form
            onSubmit={handleSubmit((data) => mutation.mutate(data))}
            className="flex flex-col gap-4"
          >
            <Input
              label="Data di assunzione *"
              type="date"
              {...register("dateOfEntry", {
                required: "Campo obbligatorio",
              })}
              error={errors.dateOfEntry?.message}
            />

            {needsCaptaincy && (
              <Input
                label="Data nomina comandante *"
                type="date"
                {...register("dateOfCaptaincy", {
                  required: needsCaptaincy
                    ? "Campo obbligatorio per comandanti"
                    : false,
                })}
                error={errors.dateOfCaptaincy?.message}
              />
            )}

            {mutation.isError && (
              <p className="text-sm text-red-500 text-center">
                Errore durante il salvataggio. Riprova.
              </p>
            )}

            <Button type="submit" fullWidth loading={mutation.isPending}>
              Salva e continua
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
