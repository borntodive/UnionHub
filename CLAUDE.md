# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## ⚠️ PRODUCTION CHECKLIST — when the user says "sono pronto per la produzione"

STOP and remind the user to complete ALL of the following before building:

1. **Rimuovere il Quick Login** — in `app/src/screens/LoginScreen/LoginScreen.tsx`:
   - Eliminare la costante `QUICK_USERS` e tutto il blocco del selettore utenti rapidi dall'UI
   - Assicurarsi che al login venga mostrato solo il form manuale (crewcode + password)

2. **Usare il seed di produzione** — eseguire `npm run seed:prod` (non `npm run seed`):
   - Il seed prod crea **solo il SuperAdmin** (`SUPERADMIN` / password da configurare via env `DEFAULT_ADMIN_PASSWORD`)
   - File: `api/src/database/seeds/run-seed-prod.ts`
   - Script da aggiungere in `package.json`: `"seed:prod": "ts-node src/database/seeds/run-seed-prod.ts"`

3. **Ripristinare il cambio password obbligatorio** — impostare `mustChangePassword: true` per tutti gli utenti nel seed prod (il SuperAdmin dovrà cambiare password al primo accesso)

---

## Project Overview

UnionConnect (also referred to as UnionHub) is a mobile app for CISL aviation union member management. It consists of:

- **Backend API** (`api/`): NestJS 11 + TypeORM 0.3 + PostgreSQL
- **Frontend Mobile App** (`app/`): Expo 52 + React Native 0.83

## Common Commands

### Backend (api/)

```bash
cd api

# Development
npm run start:dev          # Start with hot reload on port 3000
npm run start:debug        # Start with debugger

# Database (TypeORM)
npm run migration:run      # Run pending migrations
npm run migration:generate -- -n MigrationName  # Generate migration from entities
npm run migration:revert   # Revert last migration
npm run seed               # Run database seeds

# Testing & Quality
npm run test               # Run Jest unit tests
npm run test:e2e           # Run end-to-end tests
npm run lint               # ESLint with auto-fix
npm run format             # Prettier formatting

# Production
npm run build              # Build for production
npm run start:prod         # Run production build
```

### Frontend (app/)

```bash
cd app

# Development
npx expo start             # Start Expo development server
npx expo start --android   # Run on Android
npx expo start --ios       # Run on iOS
npx expo start --web       # Run on web

# Build (via EAS)
npm run build:android:prod   # Production Android build
npm run build:ios:prod       # Production iOS build

# Testing & Quality
npm test                   # Run Jest tests
npm run lint               # ESLint check
```

## High-Level Architecture

### Backend Architecture (NestJS)

**Module Structure** (`api/src/`):

- `auth/` - JWT authentication with access (15min) + refresh (30 days) tokens
- `users/` - Unified user/member management (single table for auth + member data)
- `bases/` - Airport bases CRUD (FCO, MXP, etc.)
- `contracts/` - Contract types CRUD
- `grades/` - Professional grades by role (pilot/cabin_crew)
- `cla-contracts/` - Collective Labor Agreement with versioning
- `documents/` - Document management with PDF generation (Puppeteer/HTML)
- `notifications/` - Push notifications via Expo + silent broadcast for cache invalidation
- `ollama/` - AI integration (rewrite + translate + embeddings + chat streaming), HTML-aware prompts
- `issues/` - Issue/segnalazione management with AI summary and CSV export
- `issue-categories/` - Issue categories CRUD (sends silent push on change)
- `issue-urgencies/` - Issue urgencies CRUD (sends silent push on change)
- `knowledge-base/` - PDF knowledge base for RAG chatbot (Admin/SuperAdmin only)
- `chatbot/` - RAG chatbot with streaming SSE (Admin/SuperAdmin only)
- `database/` - TypeORM migrations and seeds
- `common/` - Shared enums (`UserRole`, `Ruolo`), decorators, filters, interceptors
- `config/` - App configuration (TypeORM, JWT, etc.)

**PDF Generation** (`api/src/documents/pdf.service.ts`):

- Always uses `generateWithHtml()` (Puppeteer) — never the pdf-lib template path
- FIT-CISL letterhead: Times New Roman/Tinos font, green separator lines (#177246), red/green institutional footer
- Joint letterhead: two logos (FIT-CISL left, ANPAC right), Avenir font, `Roma dd.MM.yy` date format, no footer
- `contentToHtml()` detects HTML anywhere in content (regex `/<[a-z][\s\S]*?>/i`) — preserves rich text from editor
- Logo assets in `api/templates/`: `logo.png`, `logo-joint-left.jpeg`, `logo-joint-right.png`, `whatsapp-qr.png`
- Templates dir resolved via `__dirname` (not `process.cwd()`) — required for Cleavr/pm2 where cwd ≠ app dir
- **Overflow prevention**: `page.evaluate()` runs after `setContent()` and before `pdf()` to detect and fix closing block overflow:
  - Scoped per section (`.page` for Italian, `.page-en` for English) to avoid cross-section false positives
  - Case 1: QR section spills to new page → `qr-section` hidden
  - Case 2: closing signature overflows → body `line-height` compressed from 2.0 to 1.5 (step 0.05); triggers when `sigPage > 0 && paragraphs exist on earlier pages`
  - Page height computed as `(297 - puppeteerTopMargin - puppeteerBottomMargin) * pxPerMm`; `pxPerMm` from `body.clientWidth / 210`
- **Puppeteer executable**: set `PUPPETEER_EXECUTABLE_PATH` env var; on Linux/Cleavr use `/usr/bin/chromium-browser`

**OllamaService** (`api/src/ollama/ollama.service.ts`):

- `isHtml(text)` detects HTML input via `text.trim().startsWith("<")`
- `rewriteAsUnionCommunication()` and `translateToEnglish()` both preserve HTML tag structure when input is HTML
- `generateEmbedding(text)` — calls `POST /api/embeddings` with `OLLAMA_EMBED_MODEL` (nomic-embed-text, 768 dims)
- `chatGenerate(prompt, system)` — blocking generation with `OLLAMA_CHATBOT_MODEL`
- `chatGenerateStream(prompt, system)` — AsyncGenerator yielding tokens via Ollama `stream:true` API

**KnowledgeBaseService** (`api/src/knowledge-base/`):

- Access: Admin + SuperAdmin only
- PDF upload → pdf-parse text extraction → chunking (300 words, 30 overlap, 2000 char max) → embeddings → pgvector
- Indexing runs **in background** (fire-and-forget); document `status` field: `pending → indexing → ready | error`
- Push notification sent to uploader when indexing completes/fails
- `semanticSearch()` uses cosine distance (`<=>`) on `knowledge_base_chunks`; filters by `accessLevel` and `ruolo`; only returns chunks from `status='ready'` documents
- **pgvector**: `embedding vector(768)` column NOT in TypeORM entity — created via raw SQL migration. All vector ops use `DataSource.query()`. Chunk inserts also use raw SQL to avoid TypeORM identity-map issues in long async loops
- IVFFlat index: create AFTER data is loaded (empty-table centroids break search)
- Role-based access: `accessLevel='all'` visible to all; `accessLevel='admin'` admin only. `ruolo` filter: admins bypass entirely; users see their role + null-ruolo docs

**ChatbotService** (`api/src/chatbot/`):

- Access: Admin + SuperAdmin only (`RolesGuard`)
- RAG pipeline: semantic search → conversation history → system prompt with context → Ollama generation → save messages
- `chat()` — blocking, returns full response
- `chatStream()` — AsyncGenerator yielding `{t}` tokens, then `{done, sources, conversationId}`
- Conversation history stored in `chat_messages` table (scoped by `userId + conversationId`)

**Streaming SSE** (`POST /chatbot/chat/stream`):

- Returns `text/event-stream` with explicit `res.status(200)`, `X-Accel-Buffering: no`, `res.flush()` after each write
- Frontend uses **`XMLHttpRequest` + `onprogress`** (NOT `fetch + ReadableStream` — RN/iOS buffers the full response before exposing `body`)
- XHR buffer sliced cumulatively: `newText = xhr.responseText.slice(lastIndex)`

**NotificationsService** (`api/src/notifications/notifications.service.ts`):

- `broadcastSilent(type)` — sends data-only push (no title/body) to all active devices
- `sendPushNotification(userId, title, body, data)` — sends visible push to a specific user
- Used by `IssueCategoriesService`, `IssueUrgenciesService`, and `KnowledgeBaseService`

**Backend Path Aliases** (tsconfig):

- `@/*` → `src/*`
- `@config/*`, `@common/*`, `@auth/*`, `@users/*`, `@bases/*`, `@contracts/*`, `@grades/*`

**Key Architectural Decisions**:

- **Single `users` table**: No separate `members` table. Every member IS a user.
- **Login via `crewcode` + `password`**: Not email-based.
- **Role scoping**: Admin users only see members of their own professional role (`pilot` or `cabin_crew`). SuperAdmin sees everything.
- **Default password**: "password" with `must_change_password=true` on first login.
- **All software in English**: UI labels, API messages, code identifiers, grade names (Commander, First Officer, etc.).

**Database Schema** (PostgreSQL):

- `users` - Unified auth + member data (crewcode, password, role, ruolo, nome, cognome, email, telefono, base_id, contratto_id, grade_id, note, itud, rsa, dataIscrizione, dateOfEntry, dateOfCaptaincy)
- `bases` - Operational bases (codice, nome)
- `contracts` - Contract types (codice, nome)
- `grades` - Professional grades (codice, nome, ruolo)
- `refresh_tokens` - Token blacklisting
- `device_tokens` - Push notification tokens
- `cla_contracts` / `cla_contract_history` - CLA with versioning
- `issues` - Member issue/segnalazione reports
- `issue_categories` - Issue categories (nameIt, nameEn, ruolo)
- `issue_urgencies` - Issue urgency levels (level, nameIt, nameEn)
- `knowledge_base_documents` - PDF metadata (title, filename, accessLevel, ruolo, extractedText, chunkCount, status)
- `knowledge_base_chunks` - Text chunks with `embedding vector(768)` (pgvector, IVFFlat index); column NOT in TypeORM entity
- `chat_messages` - Chatbot conversation history (userId, conversationId, role, content)

### Frontend Architecture (Expo + React Native)

**Directory Structure** (`app/src/`):

- `api/` - Axios client with interceptors for JWT refresh
- `components/` - Reusable UI components (incl. `RichTextEditor.tsx` — react-native-pell-rich-editor)
- `screens/` - Screen components organized by feature
- `navigation/` - React Navigation setup (role-based navigators)
- `store/` - Zustand state management with AsyncStorage persistence
  - `authStore.ts` - Auth state + tokens (persisted, with `onRehydrateStorage` to reset `isLoading`)
  - `offlineStore.ts` - Offline cache: categories, urgencies, pending issues queue
- `hooks/` - Custom React hooks
  - `useNetworkStatus.ts` - NetInfo monitoring + automatic pending-issue sync
  - `useNotifications.ts` - Push notifications + silent cache-invalidation handler; **must be mounted at app root** (`AppNavigator`) to be always active
- `payslip/` - Payslip calculator module with Italian tax calculations
- `ftl/` - FTL Calculator (EASA Part-ORO.FTL, Malta Air OMA)
- `chatbot/` - RAG chatbot (Admin/SuperAdmin only); streaming via XHR onprogress
  - `screens/ChatbotScreen.tsx` - bubble UI, progressive token rendering, sources badge
  - `api/chatbot.ts` - `chatbotApi` (Axios) + `chatStream()` (XHR streaming)
  - `store/useChatStore.ts` - conversationId (persisted UUID) + messages; `updateLastAssistantMessage` accepts string | updater fn | undefined
- `knowledge-base/` - PDF knowledge base management (Admin/SuperAdmin only)
  - `screens/KnowledgeBaseScreen.tsx` - upload modal, status badges (pending/indexing/ready/error), auto-poll
  - `api/knowledge-base.ts` - list/upload/delete/reindex
- `i18n/` - Internationalization (English/Italian)
- `theme/` - Colors, typography, spacing constants

**State Management**:

- **TanStack Query**: Server state (caching, background refetching)
- **Zustand**: Client state (auth, UI preferences, offline data) with persistence
- **React Hook Form**: All form handling

**Navigation** (`app/src/navigation/`):

- Drawer-based (`DrawerNavigator.tsx`). Screens conditionally registered by `UserRole`.
- `AppNavigator.tsx` handles auth vs app stack switching via `authStore`.
- **Screens in DrawerNavigator** (hidden from drawer list): `Documents`, `DocumentEditor`, `ReportIssue`, `MyIssues`, `Issues` — these have access to `navigation.openDrawer()`.
- **Screens in AppNavigator stack**: `MemberDetail`, `MemberEdit`, `MemberCreate`, `IssueDetail`, `PdfViewer`, admin config screens (Bases, Contracts, Grades, etc.).
- Drawer menu is **network-aware**: online-only items hidden when `offlineStore.isOnline === false`.

**Documents / PDF Viewer**:

- `DocumentEditorScreen` navigates back to `Documents` (not `goBack()`) on close.
- `PdfViewerScreen` — in-app PDF viewer using WebView + `expo-file-system/legacy`. Accessible via `navigation.navigate("PdfViewer", { documentId, title })`.

**Offline Support**:

- Offline-capable screens: Payslip Calculator, Settings, Report Issue (+ pending queue sync).
- `offlineStore` persists categories, urgencies, and `pendingIssues[]` to AsyncStorage.
- `useNetworkStatus` registers NetInfo listener once (stable deps), syncs queue on `isOnline: false→true` transition and on app mount.
- Silent push notifications (`CATEGORIES_UPDATED`, `URGENCIES_UPDATED`) invalidate TanStack Query cache without showing alerts.
- Drawer menu shows only offline-available items when offline: Home, Profile hidden, Payslip Calculator, Report Issue, Settings.

**Key Features**:

- Biometric authentication (Face ID / fingerprint)
- In-app PDF viewer (`PdfViewerScreen`) with share/download
- Rich text editor (`RichTextEditor`) using `react-native-pell-rich-editor`
- Push notifications via Expo (silent + visible); `KB_INDEXED`/`KB_INDEX_ERROR` invalidate the knowledge-base list
- Offline issue reporting with background sync
- Payslip calculator with Italian tax rules, persisted in Zustand; settings unified in the main Settings screen (two tabs: General / Payslip); admin-only Override tab in PayslipCalculator
  - **Tabs**: Input → Results → Contract → Reverse (all users) + Settings/Override (Admin+) + Debug (SuperAdmin)
  - **Contract tab** (`ContractScreen`): displays all contract amounts adjusted for part-time %, CU reduction, and legacy overrides; RSA and ITUD rows shown only if `user.rsa === true` / `user.itud === true`
  - **Reverse tab** (`ReverseScreen`): enter sector pay (€) → get hours at contract rate (HH:MM) + effective rate using Input tab SBH hours; enter diaria (€) → get days at contract rate + effective rate using Input tab diaria days
  - **Legacy contract flag**: available in both Settings (general) and Override (admin). In general mode stores `Δ = custom − contract` so future CLA updates preserve the relative difference; in override mode uses custom values directly (`legacyDirect: true`, injected at runtime, never persisted)

**Date Fields on Users**:

- `dateOfEntry` — date user entered the company. Optional in admin create and bulk import. **Required** when the user edits their own profile.
- `dateOfCaptaincy` — date user became captain. Only relevant for captain grades: `CPT`, `LTC`, `LCC`, `TRI`, `TRE`. Optional in admin create. **Required** when the user edits their own profile if their grade is a captain grade.
- Date format in UI: `DD/MM/YYYY`. Conversion to `YYYY-MM-DD` for PostgreSQL happens in `users.service.ts` for all three paths: `create()`, `reactivateUser()`, `update()`.
- Both fields are visible to all roles via `serialize()` (not admin-only).

**Profile Completion Gate**:

After login, `AppNavigator` checks three conditions in order before showing the main app:

1. `!isAuthenticated` → Login screen
2. `mustChangePassword` → ChangePassword screen (forced, no back)
3. `!!user.ruolo && (!user.dateOfEntry || (isCaptainGrade && !user.dateOfCaptaincy))` → `CompleteProfileScreen` (forced, no back)

`CompleteProfileScreen` uses `PATCH /users/me` and calls `setUser()` on success — the store update re-triggers the gate check in `AppNavigator`, automatically releasing the user to the main app without explicit navigation. SuperAdmin users (no `ruolo`) skip the gate entirely.

## Authentication Flow

1. User logs in with `crewcode` + `password` → receives `accessToken` + `refreshToken`
2. Tokens stored in AsyncStorage via Zustand persist (`onRehydrateStorage` calls `setLoading(false)`)
3. `AuthProvider` **only blocks rendering** until Zustand finishes rehydrating AsyncStorage — it does NOT validate the token on startup (race condition fix)
4. Axios interceptor adds `Authorization: Bearer <token>` header
5. On 401, client attempts automatic token refresh
6. On refresh failure: **only logs out if the server explicitly rejected the token (4xx response)**. Network errors (offline) do NOT trigger logout.
7. Biometric auth can be enabled after first successful login

**Why AuthProvider does NOT refresh the token on startup**: at mount time, AsyncStorage rehydration is still pending, so `refreshToken` is `null`. Doing validation here caused spurious logouts on every app update. Token refresh is handled lazily by the Axios interceptor on the first 401.

## API Endpoints

Base URL: `http://localhost:3000/api/v1`

Key endpoints:

- `POST /auth/login` - Login with crewcode/password
- `POST /auth/refresh` - Refresh access token
- `GET /auth/me` - Get current user profile
- `GET /users` - List users (role-scoped for Admin)
- `GET /users/me` - Get own profile (any authenticated user)
- `PATCH /users/me` - Update own profile fields e.g. dateOfEntry/dateOfCaptaincy (any authenticated user)
- `POST /users` - Create user (Admin+)
- `PATCH /users/:id` - Update user
- `GET /bases`, `/contracts`, `/grades` - Reference data
- `GET /documents` - List documents
- `POST /documents` - Create document
- `PATCH /documents/:id/translation` - Update English translation only
- `GET /documents/:id/pdf` - Generate/download PDF
- `GET /issues` - List all issues (Admin+)
- `GET /issues/my` - List current user's issues
- `POST /issues` - Create issue
- `GET /issue-categories` - List categories (filterable by ruolo)
- `GET /issue-urgencies` - List urgencies
- `POST /notifications/broadcast-silent` - Send silent push to all devices
- `GET /knowledge-base` - List KB documents (Admin+)
- `POST /knowledge-base/upload` - Upload PDF → returns 202, indexes in background
- `DELETE /knowledge-base/:id` - Delete document + chunks
- `POST /knowledge-base/:id/reindex` - Re-generate embeddings (background, 202)
- `POST /chatbot/chat` - Blocking chat (Admin+)
- `POST /chatbot/chat/stream` - SSE streaming chat (Admin+); `text/event-stream`
- `GET /chatbot/history/:conversationId` - Conversation history
- `DELETE /chatbot/history/:conversationId` - Clear conversation

## Environment Configuration

Copy `.env.example` to `.env` and configure:

```env
# Database
DB_USERNAME=unionhub
DB_PASSWORD=your_secure_password
DB_NAME=unionhub

# JWT
JWT_SECRET=your-super-secret-jwt-key-min-32-characters
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=30d

# Ollama (AI)
OLLAMA_MODEL=mistral               # document rewrite / translate
OLLAMA_CHATBOT_MODEL=llama3.2      # chatbot generation (stream:true)
OLLAMA_EMBED_MODEL=nomic-embed-text # embeddings 768 dims
OLLAMA_URL=http://localhost:11434
OLLAMA_CLOUD=false

# Chatbot RAG
CHATBOT_CHUNKS_LIMIT=5             # top-N chunks injected per message
CHATBOT_CONTEXT_MESSAGES=10        # previous messages sent as history

# Puppeteer (PDF generation)
PUPPETEER_EXECUTABLE_PATH=/Applications/Google Chrome.app/Contents/MacOS/Google Chrome

# Server
NODE_ENV=development
PORT=3000
```

## Default Credentials (after seed)

All accounts use `password` as the default password. `mustChangePassword` is `false` for all seed users.

- **SuperAdmin**: `SUPERADMIN` / `password`
- **Admin Pilot**: `ADMINPILOT` / `password`
- **Admin Cabin Crew**: `ADMINCC` / `password`
- **Pilots** (100 total, grade-coded crewcodes, 9 grades):
  - SO0001–SO0011 (Second Officer × 11)
  - JFO0001–JFO0011 (Junior First Officer × 11)
  - FO0001–FO0012 (First Officer × 12)
  - CPT0001–CPT0012 (Captain × 12)
  - LTC0001–LTC0011 (Line Training Captain × 11)
  - SFI0001–SFI0011 (Synthetic Flight Instructor × 11)
  - LCC0001–LCC0011 (Line Check Captain × 11)
  - TRI0001–TRI0010 (Type Rating Instructor × 10)
  - TRE0001–TRE0011 (Type Rating Examiner × 11)
- **Cabin Crew** (100 total, grade-coded crewcodes, 5 grades):
  - JU0001–JU0020 (Junior × 20)
  - JPU0001–JPU0020 (Junior Purser × 20)
  - CC0001–CC0020 (Cabin Crew × 20)
  - SEPE0001–SEPE0020 (Senior Purser Europe × 20)
  - SEPI0001–SEPI0020 (Senior Purser Intercontinental × 20)

## Code Conventions

### Backend (NestJS)

- Follow NestJS module pattern (controller, service, module, entity, dto)
- Use dependency injection
- DTOs with class-validator decorators
- TypeORM entities with proper relations
- Migrations: NEVER use `synchronize: true` in production

### Frontend (React Native)

- Functional components with hooks
- React Hook Form for all forms
- TanStack Query for server state
- Zustand for client state
- Theme constants from `@theme/*`
- Screens in DrawerNavigator use `navigation.openDrawer()` (not `goBack()`) for hamburger
- Screens that are entry points from the drawer use `navigation.navigate("ScreenName")` to go back (not `goBack()`)

### Naming

- Files: kebab-case for services, PascalCase for components/classes
- Classes/Interfaces: PascalCase
- Variables/functions: camelCase
- Constants: UPPER_SNAKE_CASE

## Documentation

`AGENTS.md` (root) contains the complete reference: full API endpoint list, database schema with enums, security model, PDF generation details, and adding-a-new-module guide.

Additional documentation in `docs/`:

- `01-ux-design.md` - UX/UI wireframes and design system
- `02-use-cases.md` - Use cases and scenarios
- `03-frontend-architecture.md` - Frontend architecture details
- `04-backend-architecture.md` - Backend architecture details
- `PAYSLIP_CALCULATOR_EXPO_SPEC.md` - Payslip calculator specification

## Troubleshooting

### Backend

```bash
# Check PostgreSQL
pg_isready

# Reset database (DEVELOPMENT ONLY)
dropdb unionhub && createdb unionhub
npm run migration:run
npm run seed

# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

### Frontend

```bash
# Clear Expo cache
npx expo start --clear

# Reset Metro bundler
npx expo start --reset-cache

# Clean node_modules
rm -rf node_modules && npm install
```

### Common Issues

- **Re-login required after every reload (Expo Go)**: Fixed via `onRehydrateStorage` in `authStore` — calls `setLoading(false)` after AsyncStorage hydration.
- **Logout on app update / OTA reload**: Fixed by removing token validation from `AuthProvider`. The old code read `refreshToken` before AsyncStorage rehydration completed (it was `null`), causing immediate `setLoading(false)` with no session. Now `AuthProvider` only shows a spinner until rehydration fires. A 3-second timeout in `AuthProvider` unblocks the UI if AsyncStorage fails entirely.
- **Logout when going offline**: Fixed in `api/client.ts` — token refresh catch only calls `logout()` when server returns an HTTP error response (not on network errors).
- **HTML tags visible in PDF**: `contentToHtml()` uses regex `/<[a-z][\s\S]*?>/i` to detect HTML anywhere in content, not just `startsWith("<")`.
- **Chatbot SSE not streaming (iOS)**: React Native's `fetch` buffers the full `text/event-stream` response on iOS before exposing `body`. Use `XMLHttpRequest` + `onprogress` instead — fires incrementally as bytes arrive.
- **Chatbot SSE Cloudflare 524**: Ollama generation exceeding 100s hits Cloudflare's proxy timeout. Ensure `X-Accel-Buffering: no` and `res.flush()` after each write so tokens reach Cloudflare as they're generated (keeps the connection alive).
- **pgvector FK violation during indexing**: TypeORM entity identity-map goes stale after many async Ollama calls. Use raw SQL `INSERT INTO knowledge_base_chunks … RETURNING id` instead of `chunkRepo.save()`.
- **IVFFlat index broken (empty table)**: Creating the IVFFlat index on an empty table produces broken centroids. Drop and recreate the index after loading data: `DROP INDEX … ; CREATE INDEX … USING ivfflat … WITH (lists = 10);`
- **pdf-parse v2 incompatibility**: v2 exports a class, not a function. Pin to v1.1.1 and import via `require("pdf-parse")` with explicit type annotation.
