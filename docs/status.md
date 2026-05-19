# Project status (AI memory)

**Last updated:** 2026-05-19

## Stable

- JWT auth (crewcode + password), refresh, profile completion gate
- Member CRUD with role-scoped Admin views
- Documents: editor, AI translate, PDF via Puppeteer letterhead
- Issues: categories, urgencies, offline queue + sync
- Payslip calculator (pilots / cabin crew) with CLA versioning
- Push: visible notifications + silent cache invalidation
- Reference data: bases, contracts, grades, CLA contracts

## Pitfalls (do not regress)

| Topic | Note |
|-------|------|
| Mobile path | Use **`apps/mobile/`** — docs/AGENTS may still say `app/` |
| PDF | Always **`generateWithHtml()`**; detect HTML with regex, not only `startsWith("<")` |
| Auth startup | No refresh on mount; rehydrate AsyncStorage first |
| Offline logout | Refresh failure must not logout on network errors (only 4xx) |
| Migrations | Never `synchronize: true` in production |
| ENUM reset | `reset-tables.sh` drops enum types, not only tables |
| Payslip TDD | Complex tax logic — add tests when changing calculator |

## Environment

- API: `api/.env` from `.env.example`
- Puppeteer: `PUPPETEER_EXECUTABLE_PATH` on server
- Production: see `CLAUDE.md` checklist (seed:prod, CORS, Quick Login removal)
