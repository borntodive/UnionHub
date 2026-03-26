import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Card } from "../components/Card";
import { useAuthStore } from "../store/authStore";

interface LoginForm {
  crewcode: string;
  password: string;
}

const QUICK_USERS = [
  { label: "SuperAdmin", crewcode: "SUPERADMIN", password: "password" },
  { label: "Admin Piloti", crewcode: "ADMINPILOT", password: "password" },
  { label: "Admin CC", crewcode: "ADMINCC", password: "password" },
  { label: "SO0001", crewcode: "SO0001", password: "password" },
  { label: "JFO0001", crewcode: "JFO0001", password: "password" },
  { label: "FO0001", crewcode: "FO0001", password: "password" },
  { label: "CPT0001", crewcode: "CPT0001", password: "password" },
  { label: "LTC0001", crewcode: "LTC0001", password: "password" },
  { label: "CC0001", crewcode: "CC0001", password: "password" },
  { label: "SEPE0001", crewcode: "SEPE0001", password: "password" },
];

const IS_DEV = import.meta.env.DEV;

export function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginForm>();

  const loginMutation = useMutation({
    mutationFn: async (data: LoginForm) => {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL ?? "http://localhost:3000/api/v1"}/auth/login`,
        data,
      );
      return res.data;
    },
    onSuccess: (data) => {
      setAuth(data);
      navigate("/", { replace: true });
    },
  });

  const quickLogin = (crewcode: string, password: string) => {
    loginMutation.mutate({ crewcode, password });
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #177246, #0f5233)" }}
          >
            <span className="text-white text-2xl font-bold">U</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">UnionHub</h1>
          <p className="text-sm text-gray-500 mt-1">Accedi al tuo account</p>
        </div>

        <Card>
          <form
            onSubmit={handleSubmit((data) => loginMutation.mutate(data))}
            className="flex flex-col gap-4"
          >
            <Input
              label="Crewcode"
              placeholder="Es. CPT0001"
              autoCapitalize="characters"
              autoComplete="username"
              {...register("crewcode", { required: "Campo obbligatorio" })}
              error={errors.crewcode?.message}
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              {...register("password", { required: "Campo obbligatorio" })}
              error={errors.password?.message}
            />

            {loginMutation.isError && (
              <p className="text-sm text-red-500 text-center">
                Credenziali non valide. Riprova.
              </p>
            )}

            <Button
              type="submit"
              fullWidth
              loading={loginMutation.isPending}
              className="mt-2"
            >
              Accedi
            </Button>
          </form>
        </Card>

        {/* Quick Login — DEV only */}
        {IS_DEV && (
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">
              Quick Login (DEV)
            </p>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_USERS.map((u) => (
                <button
                  key={u.crewcode}
                  type="button"
                  onClick={() => quickLogin(u.crewcode, u.password)}
                  disabled={loginMutation.isPending}
                  className="px-2.5 py-1 text-xs font-medium bg-white border border-amber-300 rounded-lg text-amber-800 hover:bg-amber-100 transition-colors disabled:opacity-50"
                >
                  {u.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
