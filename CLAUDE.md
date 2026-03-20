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
- `ollama/` - AI integration (rewrite + translate), HTML-aware prompts
- `issues/` - Issue/segnalazione management with AI summary and CSV export
- `issue-categories/` - Issue categories CRUD (sends silent push on change)
- `issue-urgencies/` - Issue urgencies CRUD (sends silent push on change)
- `database/` - TypeORM migrations and seeds
- `common/` - Shared enums (`UserRole`, `Ruolo`), decorators, filters, interceptors
- `config/` - App configuration (TypeORM, JWT, etc.)

**PDF Generation** (`api/src/documents/pdf.service.ts`):

- Always uses `generateWithHtml()` (Puppeteer) — never the pdf-lib template path
- FIT-CISL letterhead: Times New Roman/Tinos font, green separator lines (#177246), red/green institutional footer
- Joint letterhead: two logos (FIT-CISL left, ANPAC right), Avenir font, `Roma dd.MM.yy` date format, no footer
- `contentToHtml()` detects HTML anywhere in content (regex `/<[a-z][\s\S]*?>/i`) — preserves rich text from editor
- Logo assets in `api/templates/`: `logo.png`, `logo-joint-left.jpeg`, `logo-joint-right.png`, `whatsapp-qr.png`

**OllamaService** (`api/src/ollama/ollama.service.ts`):

- `isHtml(text)` detects HTML input via `text.trim().startsWith("<")`
- `rewriteAsUnionCommunication()` and `translateToEnglish()` both preserve HTML tag structure when input is HTML

**NotificationsService** (`api/src/notifications/notifications.service.ts`):

- `broadcastSilent(type)` — sends data-only push (no title/body) to all active devices
- Used by `IssueCategoriesService` and `IssueUrgenciesService` after every create/update/remove

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
  - `useNotifications.ts` - Push notifications + silent cache-invalidation handler
- `payslip/` - Payslip calculator module with Italian tax calculations
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
- Push notifications via Expo (silent + visible)
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
OLLAMA_MODEL=mistral
OLLAMA_URL=http://localhost:11434
OLLAMA_CLOUD=false

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
