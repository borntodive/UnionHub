# Technical reference (AI index)

UnionHub / UnionConnect — quick index for agents. Read `CLAUDE.md` and `AGENTS.md` for full detail.

## Stack

| Layer  | Technology                                          |
| ------ | --------------------------------------------------- |
| API    | NestJS 11, TypeORM 0.3, PostgreSQL 15+              |
| Mobile | Expo 52, React Native 0.83, TanStack Query, Zustand |
| Auth   | JWT access 15m + refresh 30d, crewcode login        |
| PDF    | Puppeteer (`generateWithHtml`)                      |
| AI     | Ollama local or OpenRouter (`OLLAMA_CLOUD`)         |
| Push   | Expo Push API                                       |

## Architectural decisions

- Single `users` table (no separate members)
- Admin data scope by professional `ruolo`
- English identifiers in code; UI via i18n (en/it)
- Mobile path: **`apps/mobile/`** (not `app/`)

## Module rules (backend)

| Module        | Responsibility                      |
| ------------- | ----------------------------------- |
| auth          | Login, refresh, password change     |
| users         | CRUD, profile gate fields, import   |
| documents     | Rich text, translation, PDF         |
| issues        | Segnalazioni, categories, urgencies |
| notifications | Visible + silent broadcast          |
| cla-contracts | Versioned CLA for payslip           |

## Security

- `JWT_SECRET` ≥ 32 chars; bcrypt passwords
- CORS: `CORS_ORIGIN` required in production (no `*`)
- GDPR: field visibility in `serialize()` by role

## TDD commands

```bash
cd api && npm test
cd api && npm run test:e2e
cd apps/mobile && npm test
```

Backend unit tests: `api/src/**/*.service.spec.ts`.

## Documentation map

| Doc                                                          | Purpose              |
| ------------------------------------------------------------ | -------------------- |
| [01-ux-design.md](./01-ux-design.md)                         | UX / design system   |
| [02-use-cases.md](./02-use-cases.md)                         | Scenarios            |
| [03-frontend-architecture.md](./03-frontend-architecture.md) | Mobile architecture  |
| [04-backend-architecture.md](./04-backend-architecture.md)   | API architecture     |
| [architecture.mermaid](./architecture.mermaid)               | System diagram       |
| [status.md](./status.md)                                     | AI memory / pitfalls |
| [../tasks/tasks.md](../tasks/tasks.md)                       | Active tasks         |
| [../AGENTS.md](../AGENTS.md)                                 | Agent guide          |
| [../CLAUDE.md](../CLAUDE.md)                                 | Commands & checklist |
