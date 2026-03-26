/**
 * Shared form for creating and editing members.
 * Used by MemberCreatePage (/members/new) and MemberEditPage (/members/:id/edit).
 */
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader,
  X,
} from "lucide-react";
import {
  usersApi,
  type CreateUserData,
  type UpdateUserData,
  type ExtractedPdfData,
} from "../api/users";
import { basesApi, contractsApi, gradesApi } from "../api/references";
import { useAuthStore } from "../store/authStore";
import { Ruolo, UserRole } from "@unionhub/shared/types";

/* captain-grade codes — dateOfCaptaincy required */
const CAPTAIN_GRADES = ["CPT", "LTC", "LCC", "TRI", "TRE"];

/* date helpers — API stores YYYY-MM-DD, form uses DD/MM/YYYY display */
const toDisplay = (iso?: string | null): string => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};
const toIso = (display: string): string | undefined => {
  if (!display.trim()) return undefined;
  const parts = display.split("/");
  if (parts.length !== 3) return undefined;
  const [d, m, y] = parts;
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
};

/* ─── form type ─────────────────────────────────────────────── */
interface FormFields {
  crewcode: string;
  nome: string;
  cognome: string;
  email: string;
  telefono: string;
  ruolo: Ruolo | "";
  role: UserRole | "";
  baseId: string;
  contrattoId: string;
  gradeId: string;
  note: string;
  itud: boolean;
  rsa: boolean;
  rls: boolean;
  isUSO: boolean;
  dataIscrizione: string;
  dateOfEntry: string;
  dateOfCaptaincy: string;
}

const inputCls =
  "w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#177246]/30 focus:border-[#177246]";
const labelCls = "block text-xs font-medium text-gray-700 mb-1.5";

/* ─── component ─────────────────────────────────────────────── */
export function MemberFormPage({ mode }: { mode: "create" | "edit" }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const isSuperAdmin = currentUser?.role === UserRole.SUPERADMIN;

  /* existing member data (edit only) */
  const { data: member, isLoading: memberLoading } = useQuery({
    queryKey: ["user", id],
    queryFn: () => usersApi.getUserById(id!),
    enabled: mode === "edit" && !!id,
  });

  /* reference data */
  const { data: bases } = useQuery({
    queryKey: ["bases"],
    queryFn: basesApi.getBases,
  });
  const { data: contracts } = useQuery({
    queryKey: ["contracts"],
    queryFn: contractsApi.getContracts,
  });
  const { data: grades } = useQuery({
    queryKey: ["grades"],
    queryFn: gradesApi.getGrades,
  });

  /* pdf state */
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [extractionStatus, setExtractionStatus] = useState<
    "idle" | "extracting" | "success" | "error"
  >("idle");
  const [extractedData, setExtractedData] = useState<ExtractedPdfData | null>(
    null,
  );

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
    setError,
    setValue,
  } = useForm<FormFields>({
    defaultValues: {
      crewcode: "",
      nome: "",
      cognome: "",
      email: "",
      telefono: "",
      ruolo: "",
      role: "",
      baseId: "",
      contrattoId: "",
      gradeId: "",
      note: "",
      itud: false,
      rsa: false,
      rls: false,
      isUSO: false,
      dataIscrizione: "",
      dateOfEntry: "",
      dateOfCaptaincy: "",
    },
  });

  /* populate form when editing */
  useEffect(() => {
    if (mode === "edit" && member) {
      reset({
        crewcode: member.crewcode,
        nome: member.nome,
        cognome: member.cognome,
        email: member.email,
        telefono: member.telefono ?? "",
        ruolo: member.ruolo ?? "",
        role: member.role ?? "",
        baseId: member.base?.id ?? "",
        contrattoId: member.contratto?.id ?? "",
        gradeId: member.grade?.id ?? "",
        note: member.note ?? "",
        itud: member.itud ?? false,
        rsa: member.rsa ?? false,
        rls: member.rls ?? false,
        isUSO: member.isUSO ?? false,
        dataIscrizione: toDisplay(member.dataIscrizione),
        dateOfEntry: toDisplay(member.dateOfEntry),
        dateOfCaptaincy: toDisplay(member.dateOfCaptaincy),
      });
    }
  }, [member, mode, reset]);

  const watchedRuolo = watch("ruolo");
  const watchedGradeId = watch("gradeId");

  /* filter contracts and grades by ruolo */
  const filteredContracts =
    watchedRuolo && contracts
      ? contracts.filter(
          (c) =>
            c.nome
              .toLowerCase()
              .includes(watchedRuolo === Ruolo.PILOT ? "pilot" : "cabin") ||
            true, // show all; backend is source of truth
        )
      : (contracts ?? []);

  const filteredGrades =
    watchedRuolo && grades
      ? grades.filter((g) => g.ruolo === watchedRuolo)
      : (grades ?? []);

  /* show dateOfCaptaincy if selected grade is captain-level */
  const selectedGrade = grades?.find((g) => g.id === watchedGradeId);
  const isCaptainGrade = selectedGrade
    ? CAPTAIN_GRADES.includes(selectedGrade.codice)
    : false;

  /* pdf handling */
  const handlePdfChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPdfFile(file);

    const role = watchedRuolo as Ruolo | "";
    if (!role) {
      alert(
        "Seleziona prima il ruolo professionale (Pilota / Cabin Crew) prima di caricare il PDF.",
      );
      setPdfFile(null);
      e.target.value = "";
      return;
    }

    setExtractionStatus("extracting");
    setExtractedData(null);
    try {
      const data = await usersApi.extractPdf(file, role);
      setExtractedData(data);
      setExtractionStatus("success");
      // pre-fill form fields
      if (data.crewcode) setValue("crewcode", data.crewcode);
      if (data.nome) setValue("nome", data.nome);
      if (data.cognome) setValue("cognome", data.cognome);
      if (data.email) setValue("email", data.email);
      if (data.telefono) setValue("telefono", data.telefono);
      if (data.baseId) setValue("baseId", data.baseId);
      if (data.contrattoId) setValue("contrattoId", data.contrattoId);
      if (data.gradeId) setValue("gradeId", data.gradeId);
      if (data.dataIscrizione) setValue("dataIscrizione", data.dataIscrizione);
      if (data.ruolo) setValue("ruolo", data.ruolo);
    } catch {
      setExtractionStatus("error");
    }
  };

  const onSubmit = async (data: FormFields) => {
    try {
      if (mode === "create") {
        const payload: CreateUserData = {
          crewcode: data.crewcode.trim().toUpperCase(),
          nome: data.nome.trim(),
          cognome: data.cognome.trim(),
          email: data.email.trim(),
          telefono: data.telefono.trim() || undefined,
          ruolo: (data.ruolo as Ruolo) || undefined,
          role: (data.role as UserRole) || undefined,
          baseId: data.baseId || undefined,
          contrattoId: data.contrattoId || undefined,
          gradeId: data.gradeId || undefined,
          note: data.note.trim() || undefined,
          itud: data.itud,
          rsa: data.rsa,
          rls: data.rls,
          isUSO: data.isUSO,
          dataIscrizione: toIso(data.dataIscrizione),
          dateOfEntry: toIso(data.dateOfEntry),
          dateOfCaptaincy: isCaptainGrade
            ? toIso(data.dateOfCaptaincy)
            : undefined,
        };
        const newUser = await usersApi.createUser(payload);
        // upload registration PDF if selected (non-blocking — don't fail if it errors)
        if (pdfFile) {
          try {
            await usersApi.uploadRegistrationForm(newUser.id, pdfFile);
          } catch {
            /* PDF upload failure doesn't block member creation */
          }
        }
        qc.invalidateQueries({ queryKey: ["users"] });
        navigate("/members");
      } else {
        const payload: UpdateUserData = {
          nome: data.nome.trim(),
          cognome: data.cognome.trim(),
          email: data.email.trim(),
          telefono: data.telefono.trim() || undefined,
          ruolo: (data.ruolo as Ruolo) || null,
          role: (data.role as UserRole) || undefined,
          baseId: data.baseId || undefined,
          contrattoId: data.contrattoId || undefined,
          gradeId: data.gradeId || undefined,
          note: data.note.trim() || undefined,
          itud: data.itud,
          rsa: data.rsa,
          rls: data.rls,
          isUSO: data.isUSO,
          dataIscrizione: toIso(data.dataIscrizione),
          dateOfEntry: toIso(data.dateOfEntry),
          dateOfCaptaincy: isCaptainGrade
            ? toIso(data.dateOfCaptaincy)
            : undefined,
        };
        await usersApi.updateUser(id!, payload);
        qc.invalidateQueries({ queryKey: ["users"] });
        qc.invalidateQueries({ queryKey: ["user", id] });
        navigate(`/members/${id}`);
      }
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } }).response?.data
          ?.message ?? "Errore durante il salvataggio";
      setError("root", { message: msg });
    }
  };

  if (mode === "edit" && memberLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-[#177246] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <button
        onClick={() =>
          navigate(mode === "edit" ? `/members/${id}` : "/members")
        }
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-5 transition-colors"
      >
        <ArrowLeft size={16} />
        {mode === "edit" ? "Torna al dettaglio" : "Torna ai soci"}
      </button>

      <h1 className="text-xl font-bold text-gray-900 mb-6">
        {mode === "create" ? "Nuovo socio" : "Modifica socio"}
      </h1>

      {errors.root && (
        <div className="p-3 mb-4 bg-red-50 text-red-700 rounded-lg text-sm">
          {errors.root.message}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* PDF upload (create only) */}
        {mode === "create" && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-1">
              Modulo di iscrizione PDF
            </h2>
            <p className="text-xs text-gray-400 mb-4">
              Carica il PDF per compilare automaticamente i campi. Seleziona
              prima il ruolo professionale.
            </p>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-xl p-5 text-center cursor-pointer hover:border-[#177246] transition-colors"
            >
              {pdfFile ? (
                <div className="flex items-center justify-center gap-2 text-sm text-gray-700">
                  <FileText size={16} className="text-[#177246] shrink-0" />
                  <span className="font-medium truncate max-w-xs">
                    {pdfFile.name}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPdfFile(null);
                      setExtractionStatus("idle");
                      setExtractedData(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="ml-1 text-gray-400 hover:text-gray-600"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="text-gray-400 text-sm">
                  <Upload size={20} className="mx-auto mb-1" />
                  Clicca per selezionare un PDF
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={handlePdfChange}
            />

            {/* extraction status */}
            {extractionStatus === "extracting" && (
              <div className="flex items-center gap-2 mt-3 text-sm text-blue-600">
                <Loader size={14} className="animate-spin" />
                Estrazione dati in corso…
              </div>
            )}
            {extractionStatus === "success" && extractedData && (
              <div className="flex items-start gap-2 mt-3 p-3 bg-emerald-50 rounded-lg text-sm text-emerald-700">
                <CheckCircle size={15} className="mt-0.5 shrink-0" />
                <div>
                  <span className="font-medium">
                    Dati estratti con{" "}
                    {Math.round(extractedData.confidence * 100)}% di confidenza
                  </span>{" "}
                  ({extractedData.extractionMethod}) — verifica i campi
                  compilati prima di salvare.
                </div>
              </div>
            )}
            {extractionStatus === "error" && (
              <div className="flex items-center gap-2 mt-3 p-3 bg-red-50 rounded-lg text-sm text-red-600">
                <AlertCircle size={15} className="shrink-0" />
                Impossibile estrarre i dati dal PDF. Compila i campi
                manualmente.
              </div>
            )}
          </div>
        )}

        {/* Dati anagrafici */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">
            Dati anagrafici
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mode === "create" && (
              <div>
                <label className={labelCls}>Crewcode *</label>
                <input
                  {...register("crewcode", {
                    required: "Campo obbligatorio",
                  })}
                  className={inputCls}
                  placeholder="es. CPT0001"
                  style={{ textTransform: "uppercase" }}
                />
                {errors.crewcode && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.crewcode.message}
                  </p>
                )}
              </div>
            )}
            <div>
              <label className={labelCls}>Nome *</label>
              <input
                {...register("nome", { required: "Campo obbligatorio" })}
                className={inputCls}
              />
              {errors.nome && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.nome.message}
                </p>
              )}
            </div>
            <div>
              <label className={labelCls}>Cognome *</label>
              <input
                {...register("cognome", { required: "Campo obbligatorio" })}
                className={inputCls}
              />
              {errors.cognome && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.cognome.message}
                </p>
              )}
            </div>
            <div>
              <label className={labelCls}>Email *</label>
              <input
                {...register("email", { required: "Campo obbligatorio" })}
                type="email"
                className={inputCls}
              />
              {errors.email && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.email.message}
                </p>
              )}
            </div>
            <div>
              <label className={labelCls}>Telefono</label>
              <input {...register("telefono")} className={inputCls} />
            </div>
          </div>
        </div>

        {/* Ruolo e contratto */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">
            Ruolo professionale
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Ruolo professionale</label>
              <select {...register("ruolo")} className={inputCls}>
                <option value="">— Seleziona —</option>
                <option value={Ruolo.PILOT}>Pilota</option>
                <option value={Ruolo.CABIN_CREW}>Cabin Crew</option>
              </select>
            </div>
            {isSuperAdmin && (
              <div>
                <label className={labelCls}>Ruolo sistema</label>
                <select {...register("role")} className={inputCls}>
                  <option value="">— Seleziona —</option>
                  <option value={UserRole.USER}>Utente</option>
                  <option value={UserRole.ADMIN}>Admin</option>
                  <option value={UserRole.SUPERADMIN}>SuperAdmin</option>
                </select>
              </div>
            )}
            <div>
              <label className={labelCls}>Base</label>
              <select {...register("baseId")} className={inputCls}>
                <option value="">— Nessuna —</option>
                {(bases ?? []).map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.codice} – {b.nome}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Contratto</label>
              <select {...register("contrattoId")} className={inputCls}>
                <option value="">— Nessuno —</option>
                {filteredContracts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Grado</label>
              <select {...register("gradeId")} className={inputCls}>
                <option value="">— Nessuno —</option>
                {filteredGrades.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.codice} – {g.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Date */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Date</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Data iscrizione (GG/MM/AAAA)</label>
              <input
                {...register("dataIscrizione")}
                className={inputCls}
                placeholder="01/01/2024"
              />
            </div>
            <div>
              <label className={labelCls}>
                Data ingresso azienda (GG/MM/AAAA)
              </label>
              <input
                {...register("dateOfEntry")}
                className={inputCls}
                placeholder="01/01/2024"
              />
            </div>
            {isCaptainGrade && (
              <div>
                <label className={labelCls}>
                  Data nomina capitano (GG/MM/AAAA)
                </label>
                <input
                  {...register("dateOfCaptaincy")}
                  className={inputCls}
                  placeholder="01/01/2024"
                />
              </div>
            )}
          </div>
        </div>

        {/* Flags */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Flag</h2>
          <div className="flex flex-wrap gap-6">
            {[
              { name: "itud" as const, label: "ITUD" },
              { name: "rsa" as const, label: "RSA" },
              { name: "rls" as const, label: "RLS" },
              { name: "isUSO" as const, label: "USO" },
            ].map(({ name, label }) => (
              <label
                key={name}
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="checkbox"
                  {...register(name)}
                  className="w-4 h-4 rounded accent-[#177246]"
                />
                <span className="text-sm text-gray-700">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Note */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Note</h2>
          <textarea
            {...register("note")}
            rows={3}
            className={`${inputCls} resize-none`}
            placeholder="Note interne…"
          />
        </div>

        {/* actions */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() =>
              navigate(mode === "edit" ? `/members/${id}` : "/members")
            }
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Annulla
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 text-sm font-medium bg-[#177246] text-white rounded-lg hover:bg-[#177246]/90 disabled:opacity-50 transition-colors"
          >
            {isSubmitting
              ? "Salvataggio…"
              : mode === "create"
                ? "Crea socio"
                : "Salva modifiche"}
          </button>
        </div>
      </form>
    </div>
  );
}
