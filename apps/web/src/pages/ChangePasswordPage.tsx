import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Card } from "../components/Card";
import apiClient from "../api/client";
import { useAuthStore } from "../store/authStore";

interface ChangePasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export function ChangePasswordPage() {
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ChangePasswordForm>();

  const mutation = useMutation({
    mutationFn: async (data: ChangePasswordForm) => {
      const res = await apiClient.patch("/auth/change-password", {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      return res.data;
    },
    onSuccess: () => {
      if (user) setUser({ ...user, mustChangePassword: false });
      navigate("/", { replace: true });
    },
  });

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Cambia password</h1>
          <p className="text-sm text-gray-500 mt-1">
            È richiesto il cambio password al primo accesso.
          </p>
        </div>

        <Card>
          <form
            onSubmit={handleSubmit((data) => mutation.mutate(data))}
            className="flex flex-col gap-4"
          >
            <Input
              label="Password attuale"
              type="password"
              {...register("currentPassword", {
                required: "Campo obbligatorio",
              })}
              error={errors.currentPassword?.message}
            />
            <Input
              label="Nuova password"
              type="password"
              {...register("newPassword", {
                required: "Campo obbligatorio",
                minLength: { value: 8, message: "Minimo 8 caratteri" },
              })}
              error={errors.newPassword?.message}
            />
            <Input
              label="Conferma nuova password"
              type="password"
              {...register("confirmPassword", {
                required: "Campo obbligatorio",
                validate: (v) =>
                  v === watch("newPassword") || "Le password non coincidono",
              })}
              error={errors.confirmPassword?.message}
            />

            {mutation.isError && (
              <p className="text-sm text-red-500 text-center">
                Errore. Controlla la password attuale.
              </p>
            )}

            <Button type="submit" fullWidth loading={mutation.isPending}>
              Conferma
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
