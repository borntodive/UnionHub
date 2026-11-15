# PRD — UnionConnect / UnionHub

**Documento generato tramite analisi diretta del codice** (non dei doc esistenti in `docs/`, risultati obsoleti rispetto allo stato reale — vedi [Nota sulla documentazione esistente](#nota-sulla-documentazione-esistente)).

- **Data analisi**: 2026-11-15
- **Commit di riferimento**: `148bd0eb6` (branch `main`, sincronizzato con `origin/main`)
- **Repository**: github.com/borntodive/UnionHub

---

## 0. Stato Git (verifica richiesta)

| Controllo                          | Risultato                                                                                           |
| ---------------------------------- | --------------------------------------------------------------------------------------------------- |
| Branch                             | `main`                                                                                              |
| Sincronizzazione con `origin/main` | ✅ Aggiornato, 0 commit locali non pushati, 0 commit remoti non scaricati                           |
| Commit pushati su GitHub           | ✅ Sì — ultimo commit pushato: `148bd0eb6 chore(repo): sync workspace changes, ignore graphify-out` |
| **Working tree pulito**            | ❌ **No** — modifiche non committate presenti (vedi sotto)                                          |

Modifiche **non commitate** al momento dell'analisi:

- `api/tsconfig.json` — aggiunta sezione `"types"` (node, jest, express, multer, bcrypt, better-sqlite3, nodemailer, mailparser, marked, pdf-parse, passport-jwt, uuid)
- `apps/mobile/App.tsx` — wrappa l'app in `GestureHandlerRootView` (richiesto da `react-native-gesture-handler`, probabilmente per gesture nelle nuove schermate chat/admin)
- `pnpm-lock.yaml` — rigenerato (grosso diff, probabile aggiornamento dipendenze)
- `.DS_Store` — file di sistema macOS, da ignorare
- `.codex/` — directory non tracciata

**Conclusione**: il codice è su GitHub ed è aggiornato, ma ci sono modifiche locali non ancora committate. Da valutare se committarle (sembrano un fix funzionale reale: senza `GestureHandlerRootView` i gesture handler di `react-native-gesture-handler` non funzionano correttamente).

---

## 1. Panoramica di prodotto

UnionConnect (UnionHub) è una piattaforma di gestione per un sindacato di lavoratori aeronautici (FIT-CISL, equipaggi Ryanair/Malta Air). È molto più ampia di quanto documentato nei file `docs/` esistenti: oltre a gestione iscritti, documenti e busta paga, **include ora una chat interna in tempo reale, un assistente AI con RAG su knowledge base sindacale, strumenti operativi per piloti (METAR/TAF/VOLMET/CTC), integrazione email Gmail, sincronizzazione contatti CardDAV, backup su cloud (Cloudflare R2) e distribuzione APK self-hosted**.

### Componenti del monorepo

| Componente         | Stack                                  | Ruolo                                                                           |
| ------------------ | -------------------------------------- | ------------------------------------------------------------------------------- |
| `api/`             | NestJS 11 + TypeORM 0.3 + PostgreSQL   | Backend unico per mobile e web                                                  |
| `apps/mobile/`     | Expo 52 + React Native 0.83 + React 19 | App principale (iOS/Android)                                                    |
| `apps/web/`        | Vite + React (SPA)                     | Backoffice/portale web — rispecchia quasi tutte le funzioni admin + calcolatori |
| `packages/shared/` | TS condiviso                           | Codice condiviso tra mobile e web                                               |

---

## 2. Ruoli e accesso

- **SuperAdmin** — nessun ruolo professionale, accesso totale (config, backup, release APK, KB AI, VOLMET, moderazione)
- **Admin (Pilot / Cabin Crew)** — scope sui soli membri del proprio ruolo professionale (`pilot` / `cabin_crew`)
- **User (iscritto)** — accesso al proprio profilo, documenti, segnalazioni, chat, calcolatori, assistente AI

Login via `crewcode` + `password` (non email). Password di default `"password"` con `mustChangePassword` obbligatorio al primo accesso. JWT access (15min) + refresh (30gg). Autenticazione biometrica supportata tramite token dedicati (`biometric_tokens`, revocabili, con scadenza).

---

## 3. Funzionalità implementate

### 3.1 Gestione iscritti (Users)

- CRUD completo, scoping per ruolo professionale su Admin
- Import massivo (`BulkImportScreen`), membri "pending" (in attesa di completamento profilo) e "deactivated" (soft delete)
- Gate di completamento profilo obbligatorio post-login (dati personali, contatto, base, contratto, grado, date di ingresso/comando)
- Flag `isUSO` (Union Support Officer), `rsa`, `itud` per visibilità differenziata su contenuti sindacali
- Dati anagrafici aeronautici: base operativa, contratto, grado (CRUD separati: `bases`, `contracts`, `grades`)

### 3.2 Documenti e PDF

- Editor rich-text (`react-native-pell-rich-editor`), workflow stati (draft → reviewing → approved → verified → published)
- Generazione PDF via Puppeteer con doppia carta intestata (FIT-CISL singola / FIT-CISL+ANPAC congiunta), QR code WhatsApp, anti-overflow automatico
- Traduzione AI italiano→inglese (preserva struttura HTML)
- Visualizzatore PDF in-app (WebView)

### 3.3 Segnalazioni (Issues)

- Creazione segnalazione con categoria/urgenza (CRUD dedicati, seedate di default), foto/allegati
- Workflow: open → solved (con `solvedBy` tracciato) → reopen
- **Riepilogo AI delle segnalazioni aperte** (genera summary + PDF) — endpoint `POST /issues/summary`
- Export CSV (`GET /issues/export`)
- Coda offline con sync automatico alla riconnessione (`useNetworkStatus`)

### 3.4 Chat interna (tempo reale) — _non documentata nei doc esistenti_

- WebSocket (Socket.IO, namespace `/chat`, autenticazione JWT) con stanze (room) scoped per ruolo/base
- Messaggi, reazioni (emoji pill), risposte (reply-to) con join sulla history, indicatore "sta scrivendo", presenza online
- Allegati (upload fino a 20MB), eliminazione/pin messaggi (solo Admin/SuperAdmin)
- Push silenziose agli utenti offline
- **Bot di moderazione AI**: si connette come utente bot (`BOT_MOD`), classifica ogni messaggio con un LLM e posta un warning automatico se il contenuto viola le linee guida sindacali

### 3.5 Assistente AI / Knowledge Base (RAG) — _non documentata nei doc esistenti_

- Chatbot (`ChatbotScreen`) che risponde a domande dei membri con citazioni (`[doc: ...]`) basate su una **knowledge base ingerita** (documenti `.md`/`.pdf`)
- Backend NestJS fa da proxy verso un **microservizio Hybrid RAG esterno** (Python, porta 8000 di default, health-check, ingestione, ricerca)
- Pannello admin (`KbAdminScreen`) per upload/ingest documenti nella KB
- Log di tutte le richieste AI con revisione da parte di Admin/SuperAdmin (`ChatRequestsScreen`, `ChatRequestDetailScreen`)
- `AiService` generico (provider **Anthropic Claude**) usato anche per: traduzione documenti, riscrittura testi, summary segnalazioni, **parsing automatico del turno di volo da foto/testo** (`POST /ai/parse-duty` — OCR del roster con estrazione struttura JSON voli/standby)

### 3.6 Strumenti professionali (piloti/cabin crew)

- **Payslip Calculator**: calcolo busta paga italiana (INPS/IRPEF), per ruolo, con tab Input/Risultati/Contratto/Reverse + Override admin + Debug SuperAdmin, basato su CLA contracts versionati
- **FTL Calculator**: Flight Time Limitations (EASA Part-ORO.FTL, Malta Air OMA)
- **CTC Calculator**: Cold Temperature Correction (ICAO Doc 9365)
- **METAR/TAF/Weather**: meteo live per aeroporto + piste + componenti vento (fonte esterna + cache DB), sincronizzazione piste da openAIP
- **VOLMET**: anagrafica frequenze radio VOLMET per regione/paese, sincronizzabile da openAIP (gestione SuperAdmin)

### 3.7 Integrazioni esterne

- **Gmail**: lettura casella di posta condivisa sindacale (inbox, singola email, allegati) via Gmail API, filtrabile per ruolo
- **CardDAV**: endpoint che genera un URL CardDAV per sincronizzare i contatti dei rappresentanti sindacali (RSA/RLS) direttamente in rubrica telefono (solo Admin+)
- **Mail transazionale** (SMTP/nodemailer): email di benvenuto con credenziali, link store, QR, contatti RSA/RLS/USO

### 3.8 Notifiche push

- Expo Push API: notifiche visibili (targeted/broadcast) e **silenziose** per invalidare cache (TanStack Query) su variazioni di categorie/urgenze/nuove release
- Notifica automatica di nuova versione app disponibile

### 3.9 Distribuzione app (self-hosted) — _non documentata nei doc esistenti_

- `app-releases`: upload APK (fino a 200MB) da SuperAdmin, download pubblico (diretto o "latest"), versionamento con `minVersion` per forzare update, note di rilascio
- Alla pubblicazione di una release viene inviata una notifica push broadcast a tutti i dispositivi

### 3.10 Backup & disaster recovery — _non documentata nei doc esistenti_

- Backup/restore del database PostgreSQL (`pg_dump`/restore) su **Cloudflare R2** (S3-compatible), cartelle `automatic/` e `manual/` con timestamp
- Throttling (1 backup manuale ogni 5 minuti), controllo spazio disco, solo SuperAdmin

### 3.11 Statistiche

- Dashboard statistiche: vista flat per Admin (Top Grade/Basi/Contratti), vista a 3 tab per SuperAdmin (Generale/Piloti/Cabin Crew)

### 3.12 Piattaforma web (`apps/web/`)

- Portale React/Vite che replica gran parte delle funzioni admin da desktop: membri (incl. disattivati), documenti, segnalazioni, statistiche, CLA contracts, basi/contratti/gradi, categorie/urgenze, payslip, FTL, CTC
- Non sembra includere chat, assistente AI, backup, release APK, METAR/VOLMET (funzioni rimaste solo su mobile)

### 3.13 Altro

- Internazionalizzazione completa EN/IT (`react-i18next`)
- Modalità offline per Payslip, Report Issue, Settings con coda di sync
- Autenticazione biometrica (Face ID/impronta) con token dedicati revocabili

---

## 4. Architettura tecnica (sintesi)

- **Backend**: NestJS a moduli (`api/src/<modulo>/{controller,service,module,entity,dto}`), TypeORM con migrazioni (mai `synchronize: true` in produzione), guardie JWT + RBAC (`RolesGuard`, `SuperAdminGuard`), rate limiting (`@nestjs/throttler`) su operazioni sensibili (backup)
- **Mobile**: Drawer navigation role-based, Zustand (stato client, persistito), TanStack Query (stato server), React Hook Form, offline-first su alcune schermate
- **Realtime**: Socket.IO con adapter Redis (`redis-io.adapter.ts`) per scalare la chat su più istanze
- **AI**: provider Anthropic Claude per generazione/traduzione/summary/OCR; microservizio RAG esterno separato (Python) per la knowledge base sindacale
- **Storage file**: filesystem locale (`uploads/`) per allegati/APK, Cloudflare R2 per i backup DB

---

## 5. Nota sulla documentazione esistente

I file in `docs/` (01-ux-design, 02-use-cases, 03/04-architecture, `status.md`, `technical.md`) e `AGENTS.md` risultano **significativamente disallineati rispetto al codice attuale**:

- Riferiscono ancora la cartella `app/` invece di `apps/mobile/` in alcuni punti, e un elenco moduli backend limitato a `auth, users, bases, contracts, grades, cla-contracts, documents, notifications, ollama, database, config`
- **Non menzionano affatto**: `chat` (realtime + moderazione AI), `ai`/`hybrid-rag` (assistente AI/KB), `metar`, `volmet`, `carddav`, `gmail`, `backups`, `app-releases`, `biometric-tokens`, `apps/web`
- `docs/status.md` è datato 2026-05-19, quindi precede l'introduzione di queste funzionalità

**Raccomandazione**: questo PRD riflette lo stato reale del codice al commit `148bd0eb6`; valutare un aggiornamento di `AGENTS.md`/`docs/status.md`/`docs/technical.md` per non disorientare futuri agenti/sviluppatori.

---

## 6. Rischi/gap noti (dal codice)

- `api/test/` e2e risultava vuoto nei doc — da verificare se ancora vero data la crescita del backend
- CORS `*` bloccato solo a runtime in produzione (richiede `CORS_ORIGIN` esplicito)
- Moderazione AI e RAG dipendono da servizi esterni (Anthropic API, microservizio Hybrid RAG) — nessun fallback descritto se non disponibili (health-check presente, ma comportamento "disabled" silenzioso per la moderazione se l'utente bot non esiste)
- Modifiche non committate in `apps/mobile/App.tsx` e `api/tsconfig.json` sembrano fix reali (non temporanei) — rischio di perderle se non commitate
