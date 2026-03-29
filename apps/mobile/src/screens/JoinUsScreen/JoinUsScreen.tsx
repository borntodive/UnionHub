import React, { useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Switch,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { WebView } from "react-native-webview";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Check, X, FileText } from "lucide-react-native";

import { colors, spacing, typography, borderRadius } from "../../theme";
import { Input } from "../../components/Input";
import { Button } from "../../components/Button";
import { Select } from "../../components/Select";
import { RootStackParamList } from "../../navigation/types";
import { authApi, PublicRegisterPayload } from "../../api/auth";
import apiClient from "../../api/client";

type Nav = NativeStackNavigationProp<RootStackParamList>;

// ─── Privacy texts ─────────────────────────────────────────────────────────
const PRIVACY_TEXT_1 = `INFORMATIVA ESSENZIALE ISCRITTI
FIT-CISL — Federazione Italiana Trasporti

Titolare del trattamento: FIT-CISL (da ora in poi il Titolare)
Contatto: federazione_fit@cisl.it

Responsabile della protezione dei dati (DPO): dpo_fitcisl@protectiontrade.it

─────────────────────────────────────────

CHI SONO I DESTINATARI?

I responsabili esterni del trattamento ed eventuali ulteriori titolari: strutture della FIT CISL; strutture CISL nonché enti o organismi pubblici o privati, società, associazioni promosse e/o collegate e/o collaterali alla CISL e/o alle Federazioni CISL in virtù del rapporto associativo e partecipativo; amministrazione finanziaria ed enti pubblici e/o istituzionali e/o assicurativi; consulenti esterni in materia contabile e fiscale; consulenti legali; revisori contabili (se esterni alla organizzazione del Titolare); provider servizi informatici; servizi di comunicazione interni all'Organizzazione CISL.

─────────────────────────────────────────

COSA SARÀ FATTO DEI TUOI DATI PERSONALI?

I dati personali saranno trattati:

• Per l'esecuzione e la gestione del rapporto con il socio/iscritto.
Il trattamento avviene in base a: attività preordinante alla partecipazione associativa e/o alla candidatura e/o alla gestione della carica ricoperta; adesione sindacale/delega/mandato congressuale; adempimento di attività statutarie; gestione del rapporto dall'instaurazione alla sua definizione; gestione dei servizi tra i quali richiesta di certificazione/documentazione/informazioni agli Istituti previdenziali.
I dati personali che ti riguardano sono: nome, cognome*; codice fiscale*; luogo e data di nascita*; indirizzo fisico e telematico*; numero di telefono fisso e/o mobile*; dati relativi all'inquadramento ed al luogo lavorativo/azienda ove presti la tua attività lavorativa; dati derivanti dal documento d'identità*; se necessari allo svolgimento di servizi/pratiche da te richiesti, i dati assicurativi, previdenziali, legali, fiscali, in via eventuale i dati relativi al tuo stato di salute*; la tua adesione a sindacati; la quota della tua trattenuta sindacale/versata in un'unica quota.

• Per l'archiviazione e la conservazione.
Il trattamento avviene in base a: mandato/delega per tutta la sua durata; partecipazione associativa per tutta la sua durata; adempimento di obblighi conseguenti al rapporto instaurato, quali quelli fiscali e/o amministrativi/contabili nonché all'esercizio dei diritti derivanti dal rapporto.
I dati personali che ti riguardano sono: nome, cognome*; codice fiscale*; indirizzo fisico e telematico*; dati fiscali, amministrativi/contabili; dati derivanti dal documento d'identità*; dati relativi alla partecipazione associativa e/o alla carica ricoperta.

• Per l'adempimento degli obblighi di sicurezza informatica.
Il trattamento avviene in base a: adempimento di obblighi discendenti dal rapporto instaurato, legittimo interesse del titolare del trattamento o di terzi e destinatari.
I dati personali che ti riguardano sono: indirizzo telematico; log di accesso a piattaforme dedicate.

• Per fini statistici.
Il trattamento avviene in base a: legittimo interesse del Titolare. I dati personali che ti riguardano sono: nazionalità; indirizzo fisico e CAP*; luogo e data di nascita*; dati relativi all'inquadramento/qualifica e al luogo lavorativo/azienda ove presti la tua attività lavorativa; sesso; lingua; titolo di studio.

─────────────────────────────────────────

QUALI DATI PERSONALI CHE VERRANNO TRATTATI POSSONO NON ESSERE STATI RICEVUTI DA TE?

• I dati fiscali, amministrativi/contabili/legali a esclusione dei dati relativi a condanne penali e reati/relativi allo stato di salute. Informazioni relative alla partecipazione associativa e/o alla carica elettiva. Dati informatici (indirizzo telematico, log di accesso alle piattaforme dedicate).

─────────────────────────────────────────

QUALI SONO LE FONTI PRESSO CUI È AVVENUTA LA RACCOLTA DEI DATI PERSONALI?

• Altri titolari del trattamento, es. strutture della FIT CISL (Nazionale, regionali, interregionali e territoriali); le strutture CISL, nonché enti, società, associazioni promosse e/o collegate e/o collaterali alla CISL e/o Federazioni CISL in virtù del rapporto associativo e partecipativo; elenchi tenuti da enti assicurativi, enti pubblici o equiparati o sotto il controllo dell'autorità pubblica in base a specifica normativa nazionale; provider servizi informatici.

I tuoi dati, raccolti o comunque trattati dal Titolare, indicati con (*) si intendono necessari e il loro mancato conferimento comporta l'impossibilità per il Titolare di dar seguito alle attività relative al trattamento principale.

Il Titolare ti informa che puoi esercitare in qualsiasi momento il diritto di reclamo all'Autorità competente e gli altri diritti previsti dagli artt. 15 e ss. del Regolamento Europeo (UE) 2016/679.`;

const PRIVACY_TEXT_2 = `CONSENSO FACOLTATIVO — COMUNICAZIONI PROMOZIONALI DEL TITOLARE
FIT-CISL — Federazione Italiana Trasporti

Se hai ricevuto la presente informativa e ne hai compreso il contenuto, il Titolare ti chiede se presti il consenso al trattamento, secondo le modalità sopra previste, per l'invio di comunicazioni di carattere promozionale di servizi/attività forniti dal Titolare.

I dati personali che ti riguardano sono: nome, cognome*; indirizzo fisico e telematico*; numero di telefono fisso e/o mobile*.

Il mancato conferimento di questo consenso non pregiudica la gestione del rapporto associativo sindacale.

Puoi revocare questo consenso in qualsiasi momento contattando: federazione_fit@cisl.it`;

const PRIVACY_TEXT_3 = `CONSENSO FACOLTATIVO — COMUNICAZIONE A TERZI
FIT-CISL — Federazione Italiana Trasporti

Per la comunicazione a terzi (alle strutture CISL, nonché enti, società, associazioni promosse e/o collegate e/o collaterali alla CISL e/o Federazioni CISL in virtù del rapporto associativo e partecipativo) per la promozione di servizi/attività.

Il trattamento avviene in base a: tuo specifico consenso.

Se hai ricevuto la presente informativa e ne hai compreso il contenuto, il Titolare ti chiede se presti il consenso al trattamento, secondo le modalità previste, ivi compresa la comunicazione a terzi dei tuoi dati personali per l'invio di comunicazioni di carattere promozionale di servizi/attività delle strutture CISL, nonché enti, società, associazioni promosse e/o collegate e/o collaterali alla CISL e/o Federazioni CISL in virtù del rapporto associativo e partecipativo.

Il mancato conferimento di questo consenso non pregiudica la gestione del rapporto associativo sindacale.

Puoi revocare questo consenso in qualsiasi momento contattando: federazione_fit@cisl.it`;

// ─── Signature Canvas HTML ─────────────────────────────────────────────────
const SIGNATURE_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; background: #fff; }
    canvas { border: 2px dashed #ccc; border-radius: 8px; display: block;
             width: 100%; height: 100%; touch-action: none; cursor: crosshair; }
  </style>
</head>
<body>
<canvas id="c"></canvas>
<script>
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');
  let drawing = false;
  let hasContent = false;

  function resize() {
    const data = canvas.toDataURL();
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const img = new Image();
    img.onload = () => ctx.drawImage(img, 0, 0);
    img.src = data;
  }

  window.addEventListener('resize', resize);
  resize();

  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    if (e.touches) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  canvas.addEventListener('touchstart', (e) => { e.preventDefault(); drawing = true; const p = getPos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); });
  canvas.addEventListener('touchmove', (e) => { e.preventDefault(); if (!drawing) return; hasContent = true; const p = getPos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); });
  canvas.addEventListener('touchend', () => { drawing = false; });

  canvas.addEventListener('mousedown', (e) => { drawing = true; const p = getPos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); });
  canvas.addEventListener('mousemove', (e) => { if (!drawing) return; hasContent = true; const p = getPos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); });
  canvas.addEventListener('mouseup', () => { drawing = false; });

  window.clearSignature = function() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasContent = false;
  };

  window.getSignature = function() {
    if (!hasContent) { window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'empty' })); return; }
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'signature', data: canvas.toDataURL('image/png') }));
  };
</script>
</body>
</html>
`;

// ─── Interfaces ────────────────────────────────────────────────────────────
interface Grade {
  id: string;
  codice: string;
  nome: string;
  ruolo: string;
}
interface Base {
  id: string;
  codice: string;
  nome: string;
}

// ─── Component ────────────────────────────────────────────────────────────
export const JoinUsScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const [step, setStep] = useState(1);
  const webViewRef = useRef<WebView>(null);
  const signatureResolverRef = useRef<((sig: string | null) => void) | null>(
    null,
  );

  const __DEV__ = process.env.NODE_ENV !== "production";

  // ── Form state
  const [nome, setNome] = useState(__DEV__ ? "Mario" : "");
  const [cognome, setCognome] = useState(__DEV__ ? "Rossi" : "");
  const [codiceFiscale, setCodiceFiscale] = useState(
    __DEV__ ? "RSSMRA85M01H501Z" : "",
  );
  const [natoA, setNatoA] = useState(__DEV__ ? "Roma" : "");
  const [dataNascita, setDataNascita] = useState(__DEV__ ? "01/08/1985" : "");
  const [residenteA, setResidenteA] = useState(__DEV__ ? "Milano" : "");
  const [cap, setCap] = useState(__DEV__ ? "20121" : "");
  const [provincia, setProvincia] = useState(__DEV__ ? "MI" : "");
  const [via, setVia] = useState(__DEV__ ? "Corso Buenos Aires" : "");
  const [numeroCivico, setNumeroCivico] = useState(__DEV__ ? "12" : "");

  const [crewcode, setCrewcode] = useState(__DEV__ ? "DEVTEST01" : "");
  const [ruolo, setRuolo] = useState<"pilot" | "cabin_crew" | "">(
    __DEV__ ? "pilot" : "",
  );
  const [gradeId, setGradeId] = useState("");
  const [baseId, setBaseId] = useState("");
  const [email, setEmail] = useState(
    __DEV__ ? "mario.rossi.dev@example.com" : "",
  );
  const [telefono, setTelefono] = useState(__DEV__ ? "+393331234567" : "");
  const [tipoRapporto, setTipoRapporto] = useState(__DEV__ ? "FULL_TIME" : "");

  const [luogo, setLuogo] = useState(__DEV__ ? "Milano" : "");
  const [attivista, setAttivista] = useState("");
  const [signatureBase64, setSignatureBase64] = useState("");

  // consenso1 = obbligatorio (privacy, non va nel PDF)
  // consenso2 = facoltativo (promo Titolare → PDF "Consenso1")
  // consenso3 = facoltativo (promo CISL terzi → PDF "Consenso2")
  const [consenso1, setConsenso1] = useState(__DEV__);
  const [consenso2, setConsenso2] = useState(false);
  const [consenso3, setConsenso3] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // ── Modal / preview state
  const [privacyModal, setPrivacyModal] = useState<0 | 1 | 2 | 3>(0);
  const [showPreview, setShowPreview] = useState(false);
  const [tempId, setTempId] = useState<string | null>(null);
  const [previewFileUri, setPreviewFileUri] = useState<string | null>(null);

  // ── Data fetching
  const { data: gradesData } = useQuery<Grade[]>({
    queryKey: ["grades-public"],
    queryFn: async () => {
      const res = await apiClient.get("/auth/register/grades");
      return res.data;
    },
  });

  const { data: basesData } = useQuery<Base[]>({
    queryKey: ["bases-public"],
    queryFn: async () => {
      const res = await apiClient.get("/auth/register/bases");
      return res.data;
    },
  });

  const filteredGrades = (gradesData || []).filter(
    (g) => !ruolo || g.ruolo === ruolo,
  );

  // ── Signature capture
  const captureSignature = useCallback((): Promise<string | null> => {
    return new Promise((resolve) => {
      signatureResolverRef.current = resolve;
      webViewRef.current?.injectJavaScript("window.getSignature(); true;");
    });
  }, []);

  const handleWebViewMessage = useCallback((event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === "signature") {
        signatureResolverRef.current?.(msg.data);
      } else if (msg.type === "empty") {
        signatureResolverRef.current?.(null);
      }
      signatureResolverRef.current = null;
    } catch {
      signatureResolverRef.current?.(null);
      signatureResolverRef.current = null;
    }
  }, []);

  // ── Navigation
  const goNext = async () => {
    if (step === 1) {
      if (
        !nome ||
        !cognome ||
        !codiceFiscale ||
        !natoA ||
        !dataNascita ||
        !residenteA ||
        !cap ||
        !provincia ||
        !via ||
        !numeroCivico
      ) {
        Alert.alert("Campi mancanti", "Compila tutti i campi personali.");
        return;
      }
    }
    if (step === 2) {
      if (
        !crewcode ||
        !ruolo ||
        !gradeId ||
        !baseId ||
        !email ||
        !telefono ||
        !tipoRapporto
      ) {
        Alert.alert("Campi mancanti", "Compila tutti i campi lavorativi.");
        return;
      }
    }
    if (step === 3) {
      if (!luogo) {
        Alert.alert("Campi mancanti", "Inserisci il luogo di firma.");
        return;
      }
      if (!consenso1) {
        Alert.alert(
          "Consenso obbligatorio",
          "Devi accettare il Consenso 1 per procedere.",
        );
        return;
      }
      const sig = await captureSignature();
      if (!sig) {
        Alert.alert(
          "Firma mancante",
          "Firma nel campo apposito prima di continuare.",
        );
        return;
      }
      const capturedSig = sig;
      setSignatureBase64(capturedSig);

      // Generate the PDF on the server and store a temp reference
      setIsPreparing(true);
      try {
        const result = await authApi.prepare({
          nome,
          cognome,
          email,
          crewcode,
          telefono,
          ruolo,
          gradeId,
          baseId,
          codiceFiscale,
          natoA,
          dataNascita,
          residenteA,
          cap,
          provincia,
          via,
          numeroCivico,
          tipoRapporto,
          luogo,
          signatureBase64: capturedSig,
          consenso1: consenso2, // promo Titolare → PDF Consenso1
          consenso2: consenso3, // promo CISL terzi → PDF Consenso2
          attivista: attivista || undefined,
        });
        setTempId(result.tempId);
        setPreviewFileUri(null); // will be loaded on demand
      } catch (err: any) {
        const msg =
          err?.response?.data?.message ||
          "Errore nella generazione del modulo. Riprova.";
        Alert.alert("Errore", Array.isArray(msg) ? msg.join("\n") : msg);
        setIsPreparing(false);
        return;
      }
      setIsPreparing(false);
    }
    setStep((s) => s + 1);
  };

  const goBack = () => {
    if (step === 1) {
      navigation.navigate("Login");
    } else {
      // Going back from step 4 invalidates the temp PDF
      if (step === 4) {
        setTempId(null);
        setPreviewFileUri(null);
      }
      setStep((s) => s - 1);
    }
  };

  const handleShowPreview = () => {
    if (!tempId) return;
    // Build the HTTP URL for the temp PDF — the WebView loads it directly,
    // avoiding any file:// / sandbox issues inside a Modal.
    if (!previewFileUri) {
      const baseUrl = (apiClient.defaults.baseURL ?? "").replace(/\/$/, "");
      setPreviewFileUri(`${baseUrl}/auth/register/preview-file/${tempId}`);
    }
    setShowPreview(true);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const payload: PublicRegisterPayload = {
        nome,
        cognome,
        email,
        crewcode,
        telefono,
        ruolo,
        gradeId,
        baseId,
        codiceFiscale,
        natoA,
        dataNascita,
        residenteA,
        cap,
        provincia,
        via,
        numeroCivico,
        tipoRapporto,
        luogo,
        consenso1: consenso2, // promo Titolare → PDF Consenso1
        consenso2: consenso3, // promo CISL terzi → PDF Consenso2
        signatureBase64,
        attivista: attivista || undefined,
        tempId: tempId ?? undefined,
      };
      await authApi.register(payload);
      setSubmitted(true);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || "Errore durante l'invio. Riprova.";
      Alert.alert("Errore", Array.isArray(msg) ? msg.join("\n") : msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Success screen
  if (submitted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Check size={40} color={colors.textInverse} />
          </View>
          <Text style={styles.successTitle}>Richiesta inviata!</Text>
          <Text style={styles.successText}>
            La tua richiesta di adesione è stata inviata con successo.{"\n\n"}
            Riceverai una email all'indirizzo{" "}
            <Text style={styles.successEmail}>{email}</Text> quando un
            amministratore approverà la tua iscrizione.
          </Text>
          <Button
            title="Torna al Login"
            onPress={() => navigation.navigate("Login")}
            style={styles.backToLoginBtn}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.headerBtn}>
          <ArrowLeft size={24} color={colors.textInverse} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Unisciti a noi</Text>
        <View style={styles.headerBtn} />
      </View>

      {/* Progress bar */}
      <View style={styles.progressContainer}>
        {[1, 2, 3, 4].map((s) => (
          <View
            key={s}
            style={[
              styles.progressStep,
              s <= step
                ? styles.progressStepActive
                : styles.progressStepInactive,
            ]}
          >
            <Text
              style={[
                styles.progressStepText,
                s <= step
                  ? styles.progressStepTextActive
                  : styles.progressStepTextInactive,
              ]}
            >
              {s}
            </Text>
          </View>
        ))}
      </View>

      {/* Content area */}
      <View style={styles.contentArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* ── STEP 1: Dati personali ── */}
            {step === 1 && (
              <View>
                <Text style={styles.stepTitle}>Step 1 — Dati Personali</Text>

                <Input
                  label="Nome *"
                  value={nome}
                  onChangeText={setNome}
                  containerStyle={styles.input}
                />
                <Input
                  label="Cognome *"
                  value={cognome}
                  onChangeText={setCognome}
                  containerStyle={styles.input}
                />
                <Input
                  label="Codice Fiscale *"
                  value={codiceFiscale}
                  onChangeText={(v) => setCodiceFiscale(v.toUpperCase())}
                  autoCapitalize="characters"
                  containerStyle={styles.input}
                />
                <Input
                  label="Nato/a a (città) *"
                  value={natoA}
                  onChangeText={setNatoA}
                  containerStyle={styles.input}
                />
                <Input
                  label="Data di Nascita (GG/MM/AAAA) *"
                  value={dataNascita}
                  onChangeText={setDataNascita}
                  placeholder="01/01/1990"
                  keyboardType="numbers-and-punctuation"
                  containerStyle={styles.input}
                />
                <Input
                  label="Residente a (città) *"
                  value={residenteA}
                  onChangeText={setResidenteA}
                  containerStyle={styles.input}
                />
                <View style={styles.row}>
                  <View style={styles.rowCol2}>
                    <Input
                      label="CAP *"
                      value={cap}
                      onChangeText={setCap}
                      keyboardType="numeric"
                      containerStyle={styles.input}
                    />
                  </View>
                  <View style={styles.rowCol1}>
                    <Input
                      label="Provincia *"
                      value={provincia}
                      onChangeText={(v) => setProvincia(v.toUpperCase())}
                      autoCapitalize="characters"
                      maxLength={2}
                      containerStyle={styles.input}
                    />
                  </View>
                </View>
                <View style={styles.row}>
                  <View style={styles.rowCol3}>
                    <Input
                      label="Via / Piazza *"
                      value={via}
                      onChangeText={setVia}
                      containerStyle={styles.input}
                    />
                  </View>
                  <View style={styles.rowCol1}>
                    <Input
                      label="N° Civico *"
                      value={numeroCivico}
                      onChangeText={setNumeroCivico}
                      containerStyle={styles.input}
                    />
                  </View>
                </View>
              </View>
            )}

            {/* ── STEP 2: Dati lavorativi ── */}
            {step === 2 && (
              <View>
                <Text style={styles.stepTitle}>Step 2 — Dati Lavorativi</Text>

                <Input
                  label="Crewcode *"
                  value={crewcode}
                  onChangeText={(v) => setCrewcode(v.toUpperCase())}
                  autoCapitalize="characters"
                  containerStyle={styles.input}
                />

                <Text style={styles.fieldLabel}>Ruolo *</Text>
                <View style={styles.radioGroup}>
                  {[
                    { label: "Pilota", value: "pilot" },
                    { label: "Cabin Crew", value: "cabin_crew" },
                  ].map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        styles.radioOption,
                        ruolo === opt.value && styles.radioOptionSelected,
                      ]}
                      onPress={() => {
                        setRuolo(opt.value as any);
                        setGradeId("");
                      }}
                    >
                      <Text
                        style={[
                          styles.radioOptionText,
                          ruolo === opt.value && styles.radioOptionTextSelected,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Select
                  label="Qualifica *"
                  value={gradeId}
                  options={(filteredGrades || []).map((g) => ({
                    label: `${g.codice} – ${g.nome}`,
                    value: g.id,
                  }))}
                  onValueChange={(v) => setGradeId(v ?? "")}
                  placeholder="Seleziona qualifica"
                />

                <Select
                  label="Base Operativa *"
                  value={baseId}
                  options={(basesData || []).map((b) => ({
                    label: `${b.codice} – ${b.nome}`,
                    value: b.id,
                  }))}
                  onValueChange={(v) => setBaseId(v ?? "")}
                  placeholder="Seleziona base"
                />

                <Input
                  label="Email *"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  containerStyle={styles.input}
                />
                <Input
                  label="Cellulare *"
                  value={telefono}
                  onChangeText={setTelefono}
                  keyboardType="phone-pad"
                  containerStyle={styles.input}
                />

                <Text style={styles.fieldLabel}>Tipo Rapporto *</Text>
                <View style={styles.radioGroup}>
                  {[
                    { label: "Full Time", value: "FULL_TIME" },
                    { label: "T. Indeterminato", value: "TEMPO_INDETERMINATO" },
                    {
                      label: "Part Time T.I.",
                      value: "PART_TIME_INDETERMINATO",
                    },
                  ].map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        styles.radioOption,
                        tipoRapporto === opt.value &&
                          styles.radioOptionSelected,
                      ]}
                      onPress={() => setTipoRapporto(opt.value)}
                    >
                      <Text
                        style={[
                          styles.radioOptionText,
                          tipoRapporto === opt.value &&
                            styles.radioOptionTextSelected,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Input
                  label="Attivista (facoltativo)"
                  value={attivista}
                  onChangeText={setAttivista}
                  placeholder="Crewcode o nome dell'attivista"
                  containerStyle={styles.input}
                />
              </View>
            )}

            {/* ── STEP 3: Firma + Consensi ── */}
            {step === 3 && (
              <View>
                <Text style={styles.stepTitle}>Step 3 — Firma e Consensi</Text>
                <Input
                  label="Luogo di firma (città) *"
                  value={luogo}
                  onChangeText={setLuogo}
                  containerStyle={styles.input}
                />

                <Text style={styles.fieldLabel}>Firma qui sotto *</Text>
                <View style={styles.signatureContainer}>
                  <WebView
                    ref={webViewRef}
                    source={{ html: SIGNATURE_HTML }}
                    style={styles.signatureWebView}
                    scrollEnabled={false}
                    onMessage={handleWebViewMessage}
                    javaScriptEnabled
                  />
                </View>
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={() =>
                    webViewRef.current?.injectJavaScript(
                      "window.clearSignature(); true;",
                    )
                  }
                >
                  <Text style={styles.clearButtonText}>Cancella firma</Text>
                </TouchableOpacity>

                <Text style={styles.sectionTitle}>Consensi Privacy</Text>

                {/* Consenso 1 — obbligatorio, non va nel PDF */}
                <View style={styles.consentBlock}>
                  <View style={styles.consentRow}>
                    <Switch
                      value={consenso1}
                      onValueChange={setConsenso1}
                      trackColor={{ true: colors.primary }}
                    />
                    <Text style={styles.consentText}>
                      <Text style={styles.consentRequired}>
                        [Obbligatorio]{" "}
                      </Text>
                      Ho letto l'informativa e acconsento al trattamento dei
                      miei dati per le finalità sindacali indicate nel modulo.
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.leggiBtn}
                    onPress={() => setPrivacyModal(1)}
                  >
                    <Text style={styles.leggiBtnText}>
                      Leggi informativa completa →
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Consenso 2 — facoltativo, → PDF Consenso1 */}
                <View style={styles.consentBlock}>
                  <View style={styles.consentRow}>
                    <Switch
                      value={consenso2}
                      onValueChange={setConsenso2}
                      trackColor={{ true: colors.primary }}
                    />
                    <Text style={styles.consentText}>
                      <Text style={styles.consentOptional}>[Facoltativo] </Text>
                      Presti il consenso al trattamento per l'invio di
                      comunicazioni di carattere promozionale di
                      servizi/attività forniti dal Titolare.
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.leggiBtn}
                    onPress={() => setPrivacyModal(2)}
                  >
                    <Text style={styles.leggiBtnText}>
                      Leggi informativa completa →
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Consenso 3 — facoltativo, → PDF Consenso2 */}
                <View style={styles.consentBlock}>
                  <View style={styles.consentRow}>
                    <Switch
                      value={consenso3}
                      onValueChange={setConsenso3}
                      trackColor={{ true: colors.primary }}
                    />
                    <Text style={styles.consentText}>
                      <Text style={styles.consentOptional}>[Facoltativo] </Text>
                      Presti il consenso al trattamento, ivi compresa la
                      comunicazione a terzi dei tuoi dati personali per l'invio
                      di comunicazioni promozionali delle strutture CISL e
                      organismi collegati.
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.leggiBtn}
                    onPress={() => setPrivacyModal(3)}
                  >
                    <Text style={styles.leggiBtnText}>
                      Leggi informativa completa →
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ── STEP 4: Riepilogo + Consensi ── */}
            {step === 4 && (
              <View>
                <Text style={styles.stepTitle}>Step 4 — Riepilogo e Invio</Text>

                <View style={styles.summaryCard}>
                  <SummaryRow label="Nome" value={`${nome} ${cognome}`} />
                  <SummaryRow label="Codice Fiscale" value={codiceFiscale} />
                  <SummaryRow label="Nato/a a" value={natoA} />
                  <SummaryRow label="Data nascita" value={dataNascita} />
                  <SummaryRow
                    label="Residenza"
                    value={`${via} ${numeroCivico}, ${cap} ${residenteA} (${provincia})`}
                  />
                  <SummaryRow label="Crewcode" value={crewcode} />
                  <SummaryRow
                    label="Ruolo"
                    value={ruolo === "pilot" ? "Pilota" : "Cabin Crew"}
                  />
                  <SummaryRow label="Email" value={email} />
                  <SummaryRow label="Cellulare" value={telefono} />
                  <SummaryRow label="Tipo rapporto" value={tipoRapporto} />
                  <SummaryRow label="Luogo firma" value={luogo} />
                </View>

                {/* Preview button */}
                <TouchableOpacity
                  style={styles.previewButton}
                  onPress={handleShowPreview}
                >
                  <FileText size={16} color={colors.primary} />
                  <Text style={styles.previewButtonText}>
                    Vedi anteprima modulo
                  </Text>
                </TouchableOpacity>

                <Button
                  title="Invia richiesta"
                  onPress={handleSubmit}
                  loading={isSubmitting}
                  disabled={isSubmitting}
                  size="lg"
                  style={styles.submitButton}
                />
              </View>
            )}

            {/* Navigation buttons */}
            {step < 4 && (
              <Button
                title={isPreparing ? "Generazione modulo..." : "Avanti →"}
                onPress={goNext}
                loading={isPreparing}
                disabled={isPreparing}
                size="lg"
                style={styles.nextButton}
              />
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>

      {/* ── Privacy Modal ── */}
      <Modal
        visible={privacyModal !== 0}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setPrivacyModal(0)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {privacyModal === 1
                ? "Informativa sul Trattamento dei Dati"
                : privacyModal === 2
                  ? "Consenso — Comunicazioni del Titolare"
                  : "Consenso — Comunicazione a Terzi CISL"}
            </Text>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setPrivacyModal(0)}
            >
              <X size={22} color={colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView
            contentContainerStyle={styles.modalScrollContent}
            showsVerticalScrollIndicator
          >
            <Text style={styles.modalBodyText}>
              {privacyModal === 1
                ? PRIVACY_TEXT_1
                : privacyModal === 2
                  ? PRIVACY_TEXT_2
                  : PRIVACY_TEXT_3}
            </Text>
          </ScrollView>
          <View style={styles.modalFooter}>
            <Button
              title="Ho letto"
              onPress={() => setPrivacyModal(0)}
              size="lg"
            />
          </View>
        </SafeAreaView>
      </Modal>

      {/* ── Preview Modal ── */}
      <Modal
        visible={showPreview}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPreview(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Anteprima modulo</Text>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setShowPreview(false)}
            >
              <X size={22} color={colors.text} />
            </TouchableOpacity>
          </View>
          {previewFileUri ? (
            <WebView
              source={{ uri: previewFileUri }}
              style={{ flex: 1 }}
              startInLoadingState
              renderLoading={() => (
                <View
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <ActivityIndicator size="large" color={colors.primary} />
                </View>
              )}
            />
          ) : (
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

// ─── Summary Row ───────────────────────────────────────────────────────────
const SummaryRow: React.FC<{ label: string; value: string }> = ({
  label,
  value,
}) => (
  <View style={styles.summaryRow}>
    <Text style={styles.summaryLabel}>{label}</Text>
    <Text style={styles.summaryValue}>{value || "—"}</Text>
  </View>
);

// ─── Styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary },
  contentArea: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    minHeight: 56,
  },
  headerBtn: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.textInverse,
    textAlign: "center",
  },
  progressContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  progressStep: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  progressStepActive: { backgroundColor: colors.primary },
  progressStepInactive: {
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.border,
  },
  progressStepText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  progressStepTextActive: { color: colors.textInverse },
  progressStepTextInactive: { color: colors.textTertiary },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  stepTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  input: { marginBottom: spacing.md },
  row: { flexDirection: "row", gap: spacing.sm },
  rowCol1: { flex: 1 },
  rowCol2: { flex: 2 },
  rowCol3: { flex: 3 },
  fieldLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  radioGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  radioOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  radioOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + "15",
  },
  radioOptionText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  radioOptionTextSelected: {
    color: colors.primary,
    fontWeight: typography.weights.medium,
  },
  signatureContainer: {
    height: 200,
    borderRadius: borderRadius.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  signatureWebView: { flex: 1, backgroundColor: "#fff" },
  clearButton: {
    alignSelf: "flex-end",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.error,
    marginBottom: spacing.md,
  },
  clearButtonText: {
    fontSize: typography.sizes.sm,
    color: colors.error,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryRow: {
    flexDirection: "row",
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  summaryLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    width: 120,
  },
  summaryValue: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.text,
    fontWeight: typography.weights.medium,
  },
  previewButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    alignSelf: "flex-start",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primary + "10",
    marginBottom: spacing.lg,
  },
  previewButtonText: {
    fontSize: typography.sizes.sm,
    color: colors.primary,
    fontWeight: typography.weights.medium,
  },
  sectionTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  consentBlock: {
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  consentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  consentText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.text,
    lineHeight: 20,
  },
  consentRequired: { color: colors.error, fontWeight: typography.weights.bold },
  consentOptional: {
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
  leggiBtn: {
    paddingLeft: 52, // align with text (Switch width ~44 + gap ~8)
  },
  leggiBtnText: {
    fontSize: typography.sizes.xs,
    color: colors.primary,
    textDecorationLine: "underline",
  },
  nextButton: { marginTop: spacing.lg },
  submitButton: { marginTop: spacing.lg },
  successContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  successTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  successText: {
    fontSize: typography.sizes.base,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: spacing.xl,
  },
  successEmail: {
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  backToLoginBtn: { width: "100%" },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  modalTitle: {
    flex: 1,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  modalScrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  modalBodyText: {
    fontSize: typography.sizes.sm,
    color: colors.text,
    lineHeight: 22,
  },
  modalFooter: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
});
