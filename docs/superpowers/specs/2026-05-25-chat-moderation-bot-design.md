# Chat Moderation Bot — Design Spec

**Date:** 2026-05-25  
**Status:** Approved

## Overview

Add an AI-powered moderation bot to the union chat. The bot operates as a decoupled NestJS service that connects as a WebSocket client to the existing `ChatGateway`, listens for new messages, and posts a public warning in the same room when a message violates union chat guidelines.

No changes to `ChatGateway`, `ChatService`, or the mobile frontend are required.

## Goals

- Detect and publicly warn on: offensive language, spam/flood, and off-topic content
- Zero latency impact on the message-send flow
- Reuse existing `AiService` + `AnthropicProvider` (Claude Haiku)
- Appear in chat as a real user (`BOT_MOD`) so the warning is a normal `new_message` event

## Non-Goals

- Blocking or deleting messages (message stays visible after warning)
- Moderation dashboard or admin review queue
- Rate limiting or throttling per-user (beyond bot's own loop guard)

## Architecture

### Approach: Decoupled WS Client

```
User → send_message → ChatGateway → save DB → broadcast new_message
                                                        ↓
                                           ModerationService (WS client)
                                                        ↓
                                           loop guard: skip if sender = BOT_MOD
                                                        ↓
                                           AiService.generate(content, MODERATION_SYSTEM)
                                                        ↓
                                    "OK" → nothing   "FLAG: reason" → bot emits send_message
```

### Bot User

A dedicated DB user `BOT_MOD` is added to both the dev seed and the prod seed:

| Field              | Value                                 |
| ------------------ | ------------------------------------- |
| crewcode           | `BOT_MOD`                             |
| role               | `SUPERADMIN` (sees all rooms)         |
| ruolo              | `null`                                |
| nome               | `Moderatore`                          |
| cognome            | `CISL`                                |
| isActive           | `true`                                |
| mustChangePassword | `false`                               |
| password           | random UUID (never used for UI login) |

`ModerationService` logs in via `POST /auth/login` on startup to obtain an access token, then reconnects with a fresh token before expiry (15-min window — reconnect every 14 minutes).

### ModerationService

**File:** `api/src/moderation/moderation.service.ts`  
**Module:** `api/src/moderation/moderation.module.ts`

Lifecycle:

1. `onModuleInit` → login as `BOT_MOD`, connect Socket.IO client to `ws://localhost:{PORT}/chat`
2. On connect → join all rooms (gateway auto-joins based on JWT role)
3. Listen `new_message` → call `classifyMessage()`
4. `classifyMessage()`:
   - Skip if `message.sender.id === this.botUserId` (loop guard)
   - Skip if `message.content` is null/empty (attachment-only message)
   - Call `AiService.generate(content, MODERATION_SYSTEM_PROMPT)` with `maxTokens: 80`
   - Parse response: starts with `"FLAG:"` → extract reason, emit warning
5. `onModuleDestroy` → disconnect socket

**Token refresh:** `setInterval` at 14 minutes calls `POST /auth/refresh` and reconnects socket with new token.

**Error handling:** classify failures are caught and logged — never crash the service or block the chat.

### Moderation System Prompt

```
Sei il moderatore automatico della chat sindacale CISL.
Analizza il messaggio e rispondi SOLO con:
- "OK" se il messaggio è appropriato per una chat sindacale/lavorativa
- "FLAG: motivo" se contiene:
  • linguaggio offensivo o insulti verso persone
  • spam o messaggi ripetitivi senza contenuto
  • contenuto completamente estraneo al lavoro o al sindacato

Sii tollerante con tono informale e sfogo lavorativo legittimo.
Il motivo deve essere in italiano, massimo 80 caratteri.
Non aggiungere altro testo oltre "OK" o "FLAG: motivo".
```

### Warning Message Format

When `FLAG` is detected, the bot emits `send_message` to the same `roomId`:

```
⚠️ Attenzione: questo messaggio potrebbe non rispettare le linee guida della chat sindacale. [motivo]
```

The message appears as a normal bubble from **Moderatore CISL**, styled identically to any other message. No frontend changes needed.

## Files to Create / Modify

| File                                                  | Action                        |
| ----------------------------------------------------- | ----------------------------- |
| `api/src/moderation/moderation.module.ts`             | Create                        |
| `api/src/moderation/moderation.service.ts`            | Create                        |
| `api/src/moderation/prompts/moderation.prompt.ts`     | Create                        |
| `api/src/app.module.ts`                               | Add `ModerationModule` import |
| `api/src/database/seeds/run-seed.ts`                  | Add `BOT_MOD` user            |
| `api/src/database/seeds/run-seed-prod.ts`             | Add `BOT_MOD` user            |
| `api/src/database/migrations/XXXX-AddIsBotToUsers.ts` | Add `isBot` boolean column    |
| `api/src/users/entities/user.entity.ts`               | Add `isBot` field             |
| `api/package.json`                                    | Add `socket.io-client` dep    |

## Token Cost Estimate

Claude Haiku (`claude-haiku-4-5-20251001`):

- Input: ~150 tokens/message (system prompt ~100 + content ~50)
- Output: 2–10 tokens (`"OK"` or `"FLAG: motivo breve"`)
- Cost: ~$0.0003/1000 messages — negligible

## Constraints

- `ModerationService` must **not** import `ChatGateway` directly — only communicates via WS socket client
- Must use `AiService` (not `AnthropicProvider` directly) to keep telemetry logging
- `BOT_MOD` crewcode must be excluded from user listings in the admin panel (filter `role !== SUPERADMIN || crewcode !== 'BOT_MOD'` — or add an `isBot` flag to `users` table)
- Socket client uses `socket.io-client` — **must be added as a new dependency** (`npm install socket.io-client` in `api/`)
- Add `isBot: boolean` column (default `false`) to `users` entity + migration. Set `true` for `BOT_MOD`. Use this flag to exclude the bot from member listings, stats, exports, and the admin panel — cleaner than filtering by crewcode everywhere.
- Attachment-only messages (no text content) are skipped — acceptable for v1.
- Non-Italian messages: Haiku handles multilingual input; warning is always in Italian — acceptable for this union context.
