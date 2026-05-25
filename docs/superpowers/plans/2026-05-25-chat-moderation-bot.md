# Chat Moderation Bot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a decoupled AI moderation bot that listens to all chat rooms via WebSocket client and posts a public warning when a message violates union chat guidelines.

**Architecture:** `ModerationService` connects to `/chat` as a Socket.IO client, authenticated as bot user `BOT_MOD` (SuperAdmin, `isBot=true`). On each `new_message` event, it calls `AiService.generate()` with a classification prompt; if Haiku responds with `FLAG: reason`, the bot emits a warning message back into the same room as a normal `send_message`. Zero changes to gateway, chat service, or frontend.

**Tech Stack:** NestJS (existing), `socket.io-client` (new dep), Claude Haiku via existing `AiService` + `AnthropicProvider`, TypeORM migrations (existing pattern), Jest (existing).

---

### Task 1: Install socket.io-client

**Files:**

- Modify: `api/package.json` (via npm install)

- [ ] **Step 1: Install the package**

```bash
cd api && npm install socket.io-client
```

Expected output: `added N packages` with `socket.io-client` in `dependencies`.

- [ ] **Step 2: Verify types are included**

```bash
ls node_modules/socket.io-client/build/esm/index.d.ts
```

Expected: file exists (types ship with the package, no `@types/` needed).

- [ ] **Step 3: Commit**

```bash
git add api/package.json api/package-lock.json
git commit -m "chore(api): add socket.io-client dependency"
```

---

### Task 2: Add `isBot` field to User entity and run migration

**Files:**

- Modify: `api/src/users/entities/user.entity.ts`
- Create: `api/src/database/migrations/1779400000000-AddIsBotToUsers.ts`

- [ ] **Step 1: Add `isBot` column to the entity**

In `api/src/users/entities/user.entity.ts`, add after the `isUSO` field (around line 121):

```typescript
  @Column({ type: "boolean", default: false })
  isBot: boolean;
```

- [ ] **Step 2: Create the migration file**

Create `api/src/database/migrations/1779400000000-AddIsBotToUsers.ts`:

```typescript
import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIsBotToUsers1779400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "isBot" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "isBot"`,
    );
  }
}
```

- [ ] **Step 3: Register the migration in the database config**

Open `api/src/config/database.config.ts`. Confirm it auto-loads migrations from the `migrations/` directory (pattern `src/database/migrations/*.ts`). If the config uses explicit array, add the new migration class.

- [ ] **Step 4: Run the migration**

```bash
cd api && npm run migration:run
```

Expected output: `query: ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "isBot"...` then `Migration AddIsBotToUsers1779400000000 has been executed successfully`.

- [ ] **Step 5: Commit**

```bash
git add api/src/users/entities/user.entity.ts api/src/database/migrations/1779400000000-AddIsBotToUsers.ts
git commit -m "feat(users): add isBot boolean column to users table"
```

---

### Task 3: Seed the BOT_MOD user in both seed files

**Files:**

- Modify: `api/src/database/seeds/run-seed.ts`
- Modify: `api/src/database/seeds/run-seed-prod.ts`

- [ ] **Step 1: Add `crypto` import to run-seed.ts**

At the top of `api/src/database/seeds/run-seed.ts`, after the existing imports, add:

```typescript
import * as crypto from "crypto";
```

- [ ] **Step 2: Add BOT_MOD upsert to run-seed.ts**

Find the block that seeds the SuperAdmin user (around where it checks `where: { crewcode: "COVEAN" }`). After that block, add:

```typescript
// ── Bot Moderator ─────────────────────────────────────────────────────────
const existingBot = await usersRepository.findOne({
  where: { crewcode: "BOT_MOD" },
});
if (!existingBot) {
  await usersRepository.save(
    usersRepository.create({
      crewcode: "BOT_MOD",
      password: await bcrypt.hash(crypto.randomUUID(), 10),
      role: UserRole.SUPERADMIN,
      ruolo: null,
      nome: "Moderatore",
      cognome: "CISL",
      email: "bot.moderatore@cisl.internal",
      isActive: true,
      mustChangePassword: false,
      isBot: true,
    }),
  );
  console.log("✓ BOT_MOD user created");
}
```

- [ ] **Step 3: Add `crypto` import to run-seed-prod.ts**

Open `api/src/database/seeds/run-seed-prod.ts`. Add:

```typescript
import * as crypto from "crypto";
```

- [ ] **Step 4: Add BOT_MOD upsert to run-seed-prod.ts**

Find the SuperAdmin seed block in `run-seed-prod.ts`. After it, add the same block as Step 2 (same code, copy exactly).

- [ ] **Step 5: Run the dev seed to verify**

```bash
cd api && npm run seed
```

Expected: `✓ BOT_MOD user created` in the output (or no error if it already existed).

- [ ] **Step 6: Verify in DB**

```bash
psql -U unionhub -d unionhub -c "SELECT crewcode, nome, cognome, role, \"isBot\" FROM users WHERE crewcode = 'BOT_MOD';"
```

Expected: one row with `isBot = true`, `role = superadmin`.

- [ ] **Step 7: Commit**

```bash
git add api/src/database/seeds/run-seed.ts api/src/database/seeds/run-seed-prod.ts
git commit -m "feat(seed): add BOT_MOD moderator bot user to dev and prod seeds"
```

---

### Task 4: Exclude bot users from member listings

**Files:**

- Modify: `api/src/users/users.service.ts`

- [ ] **Step 1: Add `isBot = false` filter to `findAll`**

In `api/src/users/users.service.ts`, in the `findAll` method, find the queryBuilder construction (around line 260):

```typescript
    const queryBuilder = this.baseUserQuery()
      .where(where)
      .andWhere("user.isActive = :isActive", {
```

Add `.andWhere("user.isBot = false")` immediately after `.where(where)`:

```typescript
    const queryBuilder = this.baseUserQuery()
      .where(where)
      .andWhere("user.isBot = false")
      .andWhere("user.isActive = :isActive", {
```

- [ ] **Step 2: Verify the dev server still starts**

```bash
cd api && npm run start:dev
```

Expected: no TypeScript errors, server starts on port 3000.

- [ ] **Step 3: Commit**

```bash
git add api/src/users/users.service.ts
git commit -m "feat(users): exclude bot users from member listings"
```

---

### Task 5: Create moderation prompt

**Files:**

- Create: `api/src/moderation/prompts/moderation.prompt.ts`

- [ ] **Step 1: Create the prompts directory and file**

```bash
mkdir -p api/src/moderation/prompts
```

Create `api/src/moderation/prompts/moderation.prompt.ts`:

```typescript
export const MODERATION_SYSTEM_PROMPT = `Sei il moderatore automatico della chat sindacale CISL.
Analizza il messaggio e rispondi SOLO con:
- "OK" se il messaggio è appropriato per una chat sindacale/lavorativa
- "FLAG: motivo" se contiene:
  • linguaggio offensivo o insulti verso persone
  • spam o messaggi ripetitivi senza contenuto
  • contenuto completamente estraneo al lavoro o al sindacato

Sii tollerante con tono informale e sfogo lavorativo legittimo.
Il motivo deve essere in italiano, massimo 80 caratteri.
Non aggiungere altro testo oltre "OK" o "FLAG: motivo".`;
```

- [ ] **Step 2: Commit**

```bash
git add api/src/moderation/prompts/moderation.prompt.ts
git commit -m "feat(moderation): add moderation system prompt"
```

---

### Task 6: Create ModerationService with unit tests

**Files:**

- Create: `api/src/moderation/moderation.service.ts`
- Create: `api/src/moderation/moderation.service.spec.ts`

- [ ] **Step 1: Write the failing tests first**

Create `api/src/moderation/moderation.service.spec.ts`:

```typescript
import { Test, TestingModule } from "@nestjs/testing";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { getRepositoryToken } from "@nestjs/typeorm";
import { ModerationService } from "./moderation.service";
import { AiService } from "../ai/ai.service";
import { User } from "../users/entities/user.entity";

const mockAiService = {
  generate: jest.fn(),
};

const mockUsersRepo = {
  findOne: jest.fn(),
};

describe("ModerationService.classifyMessage", () => {
  let service: ModerationService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ModerationService,
        { provide: AiService, useValue: mockAiService },
        {
          provide: JwtService,
          useValue: { sign: jest.fn().mockReturnValue("fake-token") },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue("secret") },
        },
        { provide: getRepositoryToken(User), useValue: mockUsersRepo },
      ],
    }).compile();
    service = module.get(ModerationService);
    // Set botUserId as if onModuleInit ran
    (service as any).botUserId = "bot-id-123";
  });

  it("returns null when sender is the bot (loop guard)", async () => {
    const msg = {
      sender: { id: "bot-id-123" },
      content: "test",
      roomId: "pilot-generale",
    };
    const result = await service.classifyMessage(msg as any);
    expect(result).toBeNull();
    expect(mockAiService.generate).not.toHaveBeenCalled();
  });

  it("returns null when content is null (attachment-only message)", async () => {
    const msg = {
      sender: { id: "user-abc" },
      content: null,
      roomId: "pilot-generale",
    };
    const result = await service.classifyMessage(msg as any);
    expect(result).toBeNull();
    expect(mockAiService.generate).not.toHaveBeenCalled();
  });

  it("returns null when content is empty string", async () => {
    const msg = {
      sender: { id: "user-abc" },
      content: "  ",
      roomId: "pilot-generale",
    };
    const result = await service.classifyMessage(msg as any);
    expect(result).toBeNull();
    expect(mockAiService.generate).not.toHaveBeenCalled();
  });

  it("returns null when AI responds OK", async () => {
    mockAiService.generate.mockResolvedValue("OK");
    const msg = {
      sender: { id: "user-abc" },
      content: "Ciao a tutti",
      roomId: "pilot-generale",
    };
    const result = await service.classifyMessage(msg as any);
    expect(result).toBeNull();
    expect(mockAiService.generate).toHaveBeenCalledWith(
      "Ciao a tutti",
      expect.stringContaining("moderatore automatico"),
      undefined,
    );
  });

  it("returns the reason when AI responds FLAG", async () => {
    mockAiService.generate.mockResolvedValue(
      "FLAG: linguaggio offensivo rilevato",
    );
    const msg = {
      sender: { id: "user-abc" },
      content: "insulto pesante",
      roomId: "pilot-generale",
    };
    const result = await service.classifyMessage(msg as any);
    expect(result).toBe("linguaggio offensivo rilevato");
  });

  it("returns null and logs error when AI call throws", async () => {
    mockAiService.generate.mockRejectedValue(new Error("timeout"));
    const msg = {
      sender: { id: "user-abc" },
      content: "messaggio normale",
      roomId: "pilot-generale",
    };
    const result = await service.classifyMessage(msg as any);
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests — expect FAIL (service doesn't exist yet)**

```bash
cd api && npx jest moderation.service.spec.ts --no-coverage
```

Expected: `Cannot find module './moderation.service'`

- [ ] **Step 3: Create the ModerationService**

Create `api/src/moderation/moderation.service.ts`:

```typescript
import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { io, Socket } from "socket.io-client";
import { AiService } from "../ai/ai.service";
import { User } from "../users/entities/user.entity";
import { ChatMessage } from "../chat/entities/chat-message.entity";
import { MODERATION_SYSTEM_PROMPT } from "./prompts/moderation.prompt";

const TOKEN_REFRESH_INTERVAL_MS = 14 * 60 * 1000;

@Injectable()
export class ModerationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ModerationService.name);
  private socket: Socket | null = null;
  private refreshInterval: ReturnType<typeof setInterval> | null = null;
  botUserId: string | null = null;

  constructor(
    private readonly aiService: AiService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.connect();
      this.refreshInterval = setInterval(async () => {
        this.socket?.disconnect();
        await this.connect();
      }, TOKEN_REFRESH_INTERVAL_MS);
    } catch (err) {
      this.logger.error("ModerationService failed to initialize", err);
    }
  }

  onModuleDestroy(): void {
    if (this.refreshInterval) clearInterval(this.refreshInterval);
    this.socket?.disconnect();
  }

  private async connect(): Promise<void> {
    const botUser = await this.usersRepo.findOne({
      where: { crewcode: "BOT_MOD", isBot: true },
    });
    if (!botUser) {
      this.logger.warn("BOT_MOD user not found in DB — moderation disabled");
      return;
    }

    this.botUserId = botUser.id;
    const secret = this.configService.get<string>("JWT_SECRET");
    const token = this.jwtService.sign(
      { sub: botUser.id, crewcode: botUser.crewcode, role: botUser.role },
      { secret, expiresIn: "15m" },
    );

    const port = this.configService.get<number>("PORT") ?? 3000;
    this.socket = io(`http://localhost:${port}/chat`, {
      auth: { token },
      transports: ["websocket"],
      reconnection: false,
    });

    this.socket.on("connect", () =>
      this.logger.log("ModerationService connected to chat gateway"),
    );
    this.socket.on("disconnect", () =>
      this.logger.warn("ModerationService disconnected from chat gateway"),
    );
    this.socket.on("new_message", (msg: ChatMessage) => {
      this.handleNewMessage(msg).catch(() => {});
    });
  }

  private async handleNewMessage(msg: ChatMessage): Promise<void> {
    const reason = await this.classifyMessage(msg);
    if (!reason) return;

    const warning = `⚠️ Attenzione: questo messaggio potrebbe non rispettare le linee guida della chat sindacale. [${reason}]`;
    this.socket?.emit("send_message", {
      roomId: msg.roomId,
      content: warning,
    });
  }

  async classifyMessage(msg: ChatMessage): Promise<string | null> {
    if (msg.sender?.id === this.botUserId) return null;
    const content = msg.content;
    if (!content || !content.trim()) return null;

    try {
      const response = await this.aiService.generate(
        content,
        MODERATION_SYSTEM_PROMPT,
        undefined,
      );
      const trimmed = response.trim();
      if (trimmed.startsWith("FLAG:")) {
        return trimmed.slice("FLAG:".length).trim();
      }
      return null;
    } catch (err) {
      this.logger.error("classifyMessage AI call failed", err);
      return null;
    }
  }
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
cd api && npx jest moderation.service.spec.ts --no-coverage
```

Expected: all 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add api/src/moderation/moderation.service.ts api/src/moderation/moderation.service.spec.ts
git commit -m "feat(moderation): add ModerationService with AI classification and unit tests"
```

---

### Task 7: Wire ModerationModule into the app

**Files:**

- Create: `api/src/moderation/moderation.module.ts`
- Modify: `api/src/app.module.ts`

- [ ] **Step 1: Create the module**

Create `api/src/moderation/moderation.module.ts`:

```typescript
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ModerationService } from "./moderation.service";
import { AiModule } from "../ai/ai.module";
import { User } from "../users/entities/user.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>("JWT_SECRET"),
      }),
      inject: [ConfigService],
    }),
    AiModule,
  ],
  providers: [ModerationService],
})
export class ModerationModule {}
```

- [ ] **Step 2: Add ModerationModule to app.module.ts**

In `api/src/app.module.ts`, add the import at the top:

```typescript
import { ModerationModule } from "./moderation/moderation.module";
```

Then add `ModerationModule` to the `imports` array after `ChatModule`:

```typescript
    ChatModule,
    ModerationModule,
    AppReleasesModule,
```

- [ ] **Step 3: Run all tests to check nothing broke**

```bash
cd api && npm test -- --no-coverage
```

Expected: all existing tests pass, `moderation.service.spec.ts` passes.

- [ ] **Step 4: Commit**

```bash
git add api/src/moderation/moderation.module.ts api/src/app.module.ts
git commit -m "feat(moderation): wire ModerationModule into AppModule"
```

---

### Task 8: End-to-end validation

No new files — manual test against the running server.

- [ ] **Step 1: Start the dev server**

```bash
cd api && npm run start:dev
```

Expected log line: `ModerationService connected to chat gateway`

If you see `BOT_MOD user not found in DB — moderation disabled`, run `npm run seed` first then restart.

- [ ] **Step 2: Open the mobile app and log in as a pilot**

Use crewcode `FO0001` / password `password`. Navigate to **Chat → Piloti - Generale**.

- [ ] **Step 3: Send a clearly appropriate message**

Send: `Ciao a tutti, oggi c'è il briefing alle 9`

Expected: message appears, **no** warning from Moderatore CISL within 5 seconds.

- [ ] **Step 4: Send a clearly inappropriate message**

Send: `vaffanculo` (offensive language)

Expected: within ~2 seconds, a second bubble from **Moderatore CISL** appears:
`⚠️ Attenzione: questo messaggio potrebbe non rispettare le linee guida della chat sindacale. [linguaggio offensivo rilevato]`

- [ ] **Step 5: Verify bot is excluded from member list**

Log in as SuperAdmin (`SUPERADMIN` / `password`). Navigate to Members. Search for `Moderatore`. Confirm no result appears.

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat(moderation): complete chat moderation bot implementation"
```
