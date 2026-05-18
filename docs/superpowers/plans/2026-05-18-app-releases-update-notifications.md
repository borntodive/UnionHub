# App Releases — Update Notifications & Version Banner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow SuperAdmin to publish a new app release (push notification + DB record) from a dedicated screen, while all clients show an in-app modal/banner when a newer build or OTA update is available.

**Architecture:** New NestJS `app-releases` module stores release records and triggers filtered push notifications via the existing `NotificationsService`. On the mobile side, a new `useVersionCheck` hook polls `GET /app-releases/latest` at startup and on foreground; both it and the refactored `useOTAUpdate` hook feed a single `UpdateModal` component mounted in `App.tsx`.

**Tech Stack:** NestJS 11 + TypeORM 0.3 + PostgreSQL (backend); Expo 52 + React Native 0.83, TanStack Query, React Hook Form, Zustand (mobile).

---

## File Map

| File                                                               | Action | Responsibility                            |
| ------------------------------------------------------------------ | ------ | ----------------------------------------- |
| `api/src/app-releases/entities/app-release.entity.ts`              | Create | TypeORM entity for `app_releases` table   |
| `api/src/app-releases/dto/create-release.dto.ts`                   | Create | Validation DTO for POST body              |
| `api/src/app-releases/app-releases.service.ts`                     | Create | Business logic: save release, call push   |
| `api/src/app-releases/app-releases.controller.ts`                  | Create | HTTP routes: POST, GET /latest, GET list  |
| `api/src/app-releases/app-releases.module.ts`                      | Create | NestJS module wiring                      |
| `api/src/database/migrations/1779100000000-AddAppReleasesTable.ts` | Create | DB migration                              |
| `api/src/app.module.ts`                                            | Modify | Import `AppReleasesModule`                |
| `api/src/notifications/notifications.service.ts`                   | Modify | Add `broadcastVersionNotification` method |
| `apps/mobile/src/utils/compareVersions.ts`                         | Create | Pure semver comparison utility            |
| `apps/mobile/src/constants/updateUrls.ts`                          | Create | iOS App Store URL constant                |
| `apps/mobile/src/api/releases.ts`                                  | Create | API calls for releases                    |
| `apps/mobile/src/api/queryKeys.ts`                                 | Modify | Add `appReleases` key                     |
| `apps/mobile/src/hooks/useVersionCheck.ts`                         | Create | Polls backend for latest version          |
| `apps/mobile/src/hooks/useOTAUpdate.ts`                            | Modify | Remove internal alerts, expose state      |
| `apps/mobile/src/components/UpdateModal.tsx`                       | Create | Unified update modal + sticky banner      |
| `apps/mobile/App.tsx`                                              | Modify | Mount `useVersionCheck` + `UpdateModal`   |
| `apps/mobile/src/screens/admin/ReleasesScreen.tsx`                 | Create | SuperAdmin publish screen                 |
| `apps/mobile/src/navigation/types.ts`                              | Modify | Add `Releases` to param lists             |
| `apps/mobile/src/navigation/DrawerNavigator.tsx`                   | Modify | Register + show Releases screen           |

---

## Task 1: Backend — Entity, DTO, and Migration

**Files:**

- Create: `api/src/app-releases/entities/app-release.entity.ts`
- Create: `api/src/app-releases/dto/create-release.dto.ts`
- Create: `api/src/database/migrations/1779100000000-AddAppReleasesTable.ts`

- [ ] **Step 1: Create the entity**

```typescript
// api/src/app-releases/entities/app-release.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from "typeorm";

@Entity("app_releases")
export class AppRelease {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  version: string;

  @Column({ nullable: true, type: "varchar" })
  minVersion: string | null;

  @Column({ default: "all" })
  platform: string; // "ios" | "android" | "all"

  @Column({ type: "text", nullable: true })
  releaseNotes: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
```

- [ ] **Step 2: Create the DTO**

```typescript
// api/src/app-releases/dto/create-release.dto.ts
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  Matches,
} from "class-validator";

export class CreateReleaseDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d+\.\d+\.\d+$/, { message: "version must be semver (x.y.z)" })
  version: string;

  @IsString()
  @IsOptional()
  @Matches(/^\d+\.\d+\.\d+$/, {
    message: "minVersion must be semver (x.y.z)",
  })
  minVersion?: string;

  @IsIn(["ios", "android", "all"])
  @IsOptional()
  platform?: string;

  @IsString()
  @IsOptional()
  releaseNotes?: string;
}
```

- [ ] **Step 3: Create the migration**

```typescript
// api/src/database/migrations/1779100000000-AddAppReleasesTable.ts
import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAppReleasesTable1779100000000 implements MigrationInterface {
  name = "AddAppReleasesTable1779100000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "app_releases" (
        "id"           uuid              NOT NULL DEFAULT uuid_generate_v4(),
        "version"      character varying NOT NULL,
        "minVersion"   character varying,
        "platform"     character varying NOT NULL DEFAULT 'all',
        "releaseNotes" text,
        "createdAt"    TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_app_releases" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "app_releases"`);
  }
}
```

- [ ] **Step 4: Run the migration to verify it works**

```bash
cd api && npm run migration:run
```

Expected output: `query: CREATE TABLE "app_releases" ...` followed by success.

- [ ] **Step 5: Commit**

```bash
git add api/src/app-releases/entities/app-release.entity.ts \
        api/src/app-releases/dto/create-release.dto.ts \
        api/src/database/migrations/1779100000000-AddAppReleasesTable.ts
git commit -m "feat(app-releases): add entity, DTO, and migration for app_releases table"
```

---

## Task 2: Backend — NotificationsService — `broadcastVersionNotification`

**Files:**

- Modify: `api/src/notifications/notifications.service.ts`

- [ ] **Step 1: Write a unit test for the new method**

```typescript
// api/src/notifications/notifications.service.spec.ts
// (create file if it doesn't exist, otherwise add test)
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { NotificationsService } from "./notifications.service";
import { DeviceToken } from "./entities/device-token.entity";

describe("NotificationsService.broadcastVersionNotification", () => {
  let service: NotificationsService;
  let mockRepo: any;

  beforeEach(async () => {
    mockRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: getRepositoryToken(DeviceToken), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    jest
      .spyOn(service as any, "sendExpoNotifications")
      .mockResolvedValue(undefined);
  });

  it("filters tokens by platform when platform is not 'all'", async () => {
    mockRepo.find.mockResolvedValue([
      {
        token: "ExponentPushToken[ios-token]",
        platform: "ios",
        isActive: true,
      },
    ]);

    await service.broadcastVersionNotification({
      version: "1.0.7",
      minVersion: null,
      platform: "ios",
      releaseNotes: "Bug fixes",
    });

    expect(mockRepo.find).toHaveBeenCalledWith({
      where: { isActive: true, platform: "ios" },
    });
  });

  it("sends to all tokens when platform is 'all'", async () => {
    mockRepo.find.mockResolvedValue([
      {
        token: "ExponentPushToken[ios-token]",
        platform: "ios",
        isActive: true,
      },
      {
        token: "ExponentPushToken[android-token]",
        platform: "android",
        isActive: true,
      },
    ]);

    await service.broadcastVersionNotification({
      version: "1.0.7",
      minVersion: null,
      platform: "all",
      releaseNotes: null,
    });

    expect(mockRepo.find).toHaveBeenCalledWith({ where: { isActive: true } });
  });
});
```

- [ ] **Step 2: Run to verify test fails**

```bash
cd api && npm test -- --testPathPattern=notifications.service.spec --no-coverage
```

Expected: FAIL — `broadcastVersionNotification is not a function`

- [ ] **Step 3: Add the method to `NotificationsService`**

Open `api/src/notifications/notifications.service.ts` and add after the `broadcastSilent` method (around line 205):

```typescript
async broadcastVersionNotification(opts: {
  version: string;
  minVersion: string | null | undefined;
  platform: string | undefined;
  releaseNotes: string | null | undefined;
}): Promise<void> {
  const { version, minVersion, platform, releaseNotes } = opts;
  const where =
    platform && platform !== "all"
      ? { isActive: true, platform }
      : { isActive: true };

  const tokens = await this.deviceTokenRepository.find({ where });
  if (tokens.length === 0) return;

  const title = `Nuova versione ${version} disponibile 🚀`;
  const body =
    releaseNotes?.substring(0, 100) ??
    "Aggiorna l'app per le ultime novità";

  const batchSize = 100;
  for (let i = 0; i < tokens.length; i += batchSize) {
    const batch = tokens.slice(i, i + batchSize);
    const messages = batch.map((t) => ({
      to: t.token,
      sound: "default" as const,
      title,
      body,
      data: {
        type: "APP_VERSION_AVAILABLE",
        version,
        minVersion: minVersion ?? null,
        platform: platform ?? "all",
      },
    }));
    await this.sendExpoNotifications(messages);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd api && npm test -- --testPathPattern=notifications.service.spec --no-coverage
```

Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add api/src/notifications/notifications.service.ts \
        api/src/notifications/notifications.service.spec.ts
git commit -m "feat(notifications): add broadcastVersionNotification with platform filtering"
```

---

## Task 3: Backend — `AppReleasesService`

**Files:**

- Create: `api/src/app-releases/app-releases.service.ts`

- [ ] **Step 1: Write a failing unit test**

```typescript
// api/src/app-releases/app-releases.service.spec.ts
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { AppReleasesService } from "./app-releases.service";
import { AppRelease } from "./entities/app-release.entity";
import { NotificationsService } from "../notifications/notifications.service";

describe("AppReleasesService", () => {
  let service: AppReleasesService;
  let mockRepo: any;
  let mockNotifications: any;

  beforeEach(async () => {
    mockRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
    };
    mockNotifications = {
      broadcastVersionNotification: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppReleasesService,
        { provide: getRepositoryToken(AppRelease), useValue: mockRepo },
        { provide: NotificationsService, useValue: mockNotifications },
      ],
    }).compile();

    service = module.get<AppReleasesService>(AppReleasesService);
  });

  describe("create", () => {
    it("saves the release and triggers push notification", async () => {
      const dto = { version: "1.0.7", platform: "all" };
      const saved = {
        id: "uuid-1",
        ...dto,
        minVersion: null,
        releaseNotes: null,
        createdAt: new Date(),
      };
      mockRepo.create.mockReturnValue(saved);
      mockRepo.save.mockResolvedValue(saved);

      const result = await service.create(dto as any);

      expect(mockRepo.save).toHaveBeenCalled();
      expect(
        mockNotifications.broadcastVersionNotification,
      ).toHaveBeenCalledWith({
        version: "1.0.7",
        minVersion: undefined,
        platform: "all",
        releaseNotes: undefined,
      });
      expect(result).toEqual(saved);
    });
  });

  describe("getLatest", () => {
    it("returns the latest release matching platform or all", async () => {
      const release = { id: "uuid-1", version: "1.0.7", platform: "all" };
      mockRepo.findOne.mockResolvedValue(release);

      const result = await service.getLatest("ios");

      expect(mockRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ order: { createdAt: "DESC" } }),
      );
      expect(result).toEqual(release);
    });

    it("returns null when no release exists", async () => {
      mockRepo.findOne.mockResolvedValue(null);
      const result = await service.getLatest("android");
      expect(result).toBeNull();
    });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd api && npm test -- --testPathPattern=app-releases.service.spec --no-coverage
```

Expected: FAIL — `Cannot find module './app-releases.service'`

- [ ] **Step 3: Implement the service**

```typescript
// api/src/app-releases/app-releases.service.ts
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In } from "typeorm";
import { AppRelease } from "./entities/app-release.entity";
import { CreateReleaseDto } from "./dto/create-release.dto";
import { NotificationsService } from "../notifications/notifications.service";

@Injectable()
export class AppReleasesService {
  constructor(
    @InjectRepository(AppRelease)
    private readonly appReleaseRepository: Repository<AppRelease>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(dto: CreateReleaseDto): Promise<AppRelease> {
    const release = this.appReleaseRepository.create({
      version: dto.version,
      minVersion: dto.minVersion ?? null,
      platform: dto.platform ?? "all",
      releaseNotes: dto.releaseNotes ?? null,
    });

    const saved = await this.appReleaseRepository.save(release);

    await this.notificationsService.broadcastVersionNotification({
      version: dto.version,
      minVersion: dto.minVersion,
      platform: dto.platform,
      releaseNotes: dto.releaseNotes,
    });

    return saved;
  }

  async getLatest(platform: string): Promise<AppRelease | null> {
    return this.appReleaseRepository.findOne({
      where: { platform: In([platform, "all"]) },
      order: { createdAt: "DESC" },
    });
  }

  async findAll(): Promise<AppRelease[]> {
    return this.appReleaseRepository.find({ order: { createdAt: "DESC" } });
  }
}
```

- [ ] **Step 4: Run tests**

```bash
cd api && npm test -- --testPathPattern=app-releases.service.spec --no-coverage
```

Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add api/src/app-releases/app-releases.service.ts \
        api/src/app-releases/app-releases.service.spec.ts
git commit -m "feat(app-releases): add AppReleasesService with create, getLatest, findAll"
```

---

## Task 4: Backend — Controller, Module, and App.Module wiring

**Files:**

- Create: `api/src/app-releases/app-releases.controller.ts`
- Create: `api/src/app-releases/app-releases.module.ts`
- Modify: `api/src/app.module.ts`

- [ ] **Step 1: Create the controller**

```typescript
// api/src/app-releases/app-releases.controller.ts
import { Controller, Get, Post, Body, Query, UseGuards } from "@nestjs/common";
import { AppReleasesService } from "./app-releases.service";
import { CreateReleaseDto } from "./dto/create-release.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { UserRole } from "../common/enums/user-role.enum";

@Controller("app-releases")
export class AppReleasesController {
  constructor(private readonly appReleasesService: AppReleasesService) {}

  // Public — no guard — the mobile checks this on startup to detect outdated builds
  @Get("latest")
  async getLatest(@Query("platform") platform: string = "all") {
    return this.appReleasesService.getLatest(platform);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN)
  async create(@Body() dto: CreateReleaseDto) {
    return this.appReleasesService.create(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN)
  async findAll() {
    return this.appReleasesService.findAll();
  }
}
```

- [ ] **Step 2: Create the module**

```typescript
// api/src/app-releases/app-releases.module.ts
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AppReleasesService } from "./app-releases.service";
import { AppReleasesController } from "./app-releases.controller";
import { AppRelease } from "./entities/app-release.entity";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [TypeOrmModule.forFeature([AppRelease]), NotificationsModule],
  controllers: [AppReleasesController],
  providers: [AppReleasesService],
})
export class AppReleasesModule {}
```

- [ ] **Step 3: Register in `app.module.ts`**

Open `api/src/app.module.ts`. Add the import at the top of the imports list:

```typescript
import { AppReleasesModule } from "./app-releases/app-releases.module";
```

Then add `AppReleasesModule` to the `imports` array (place it after `ChatModule`):

```typescript
    ChatModule,
    AppReleasesModule,
```

- [ ] **Step 4: Verify the backend starts and endpoints respond**

```bash
cd api && npm run start:dev
```

In another terminal:

```bash
# Public: no token required
curl http://localhost:3000/api/v1/app-releases/latest?platform=ios
# Expected: null (no releases yet) or 404

# SuperAdmin login first, then:
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"crewcode":"SUPERADMIN","password":"password"}' | jq -r '.accessToken')

curl -X POST http://localhost:3000/api/v1/app-releases \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"version":"1.0.7","platform":"all","releaseNotes":"Test release"}'
# Expected: 201 with the created release object

curl http://localhost:3000/api/v1/app-releases/latest?platform=ios
# Expected: {"id":"...","version":"1.0.7","platform":"all",...}

curl http://localhost:3000/api/v1/app-releases \
  -H "Authorization: Bearer $TOKEN"
# Expected: array with one item
```

- [ ] **Step 5: Commit**

```bash
git add api/src/app-releases/app-releases.controller.ts \
        api/src/app-releases/app-releases.module.ts \
        api/src/app.module.ts
git commit -m "feat(app-releases): add controller, module, and wire into AppModule"
```

---

## Task 5: Mobile — `compareVersions` utility and `updateUrls` constant

**Files:**

- Create: `apps/mobile/src/utils/compareVersions.ts`
- Create: `apps/mobile/src/constants/updateUrls.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// apps/mobile/src/utils/compareVersions.test.ts
import { compareVersions } from "./compareVersions";

describe("compareVersions", () => {
  it("returns 1 when a is greater than b", () => {
    expect(compareVersions("1.0.7", "1.0.6")).toBe(1);
    expect(compareVersions("2.0.0", "1.9.9")).toBe(1);
    expect(compareVersions("1.1.0", "1.0.99")).toBe(1);
  });

  it("returns -1 when a is less than b", () => {
    expect(compareVersions("1.0.5", "1.0.6")).toBe(-1);
    expect(compareVersions("0.9.9", "1.0.0")).toBe(-1);
  });

  it("returns 0 when versions are equal", () => {
    expect(compareVersions("1.0.6", "1.0.6")).toBe(0);
    expect(compareVersions("2.3.4", "2.3.4")).toBe(0);
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
cd apps/mobile && npm test -- --testPathPattern=compareVersions --watchAll=false
```

Expected: FAIL — `Cannot find module './compareVersions'`

- [ ] **Step 3: Implement `compareVersions`**

```typescript
// apps/mobile/src/utils/compareVersions.ts
export function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const na = pa[i] ?? 0;
    const nb = pb[i] ?? 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd apps/mobile && npm test -- --testPathPattern=compareVersions --watchAll=false
```

Expected: PASS (5 tests)

- [ ] **Step 5: Create the constants file**

```typescript
// apps/mobile/src/constants/updateUrls.ts
// Replace idXXXXXXXXXX with the actual App Store ID after first iOS submission.
export const IOS_APP_STORE_URL =
  "https://apps.apple.com/app/unionhub/idXXXXXXXXXX";

export function getAndroidApkUrl(version: string): string {
  return `https://unionhub.app/UnionHub_${version.replace(/\./g, "_")}.apk`;
}
```

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/utils/compareVersions.ts \
        apps/mobile/src/utils/compareVersions.test.ts \
        apps/mobile/src/constants/updateUrls.ts
git commit -m "feat(mobile): add compareVersions utility and updateUrls constants"
```

---

## Task 6: Mobile — API module and query keys

**Files:**

- Create: `apps/mobile/src/api/releases.ts`
- Modify: `apps/mobile/src/api/queryKeys.ts`

- [ ] **Step 1: Create `releases.ts`**

```typescript
// apps/mobile/src/api/releases.ts
import apiClient from "./client";

export interface AppReleaseLatest {
  id: string;
  version: string;
  minVersion: string | null;
  platform: string;
  releaseNotes: string | null;
  createdAt: string;
}

export interface AppRelease extends AppReleaseLatest {}

export interface CreateReleasePayload {
  version: string;
  minVersion?: string;
  platform?: "ios" | "android" | "all";
  releaseNotes?: string;
}

export const releasesApi = {
  getLatest: async (platform: string): Promise<AppReleaseLatest | null> => {
    const res = await apiClient.get<AppReleaseLatest | null>(
      `/app-releases/latest?platform=${platform}`,
    );
    return res.data;
  },

  getAll: async (): Promise<AppRelease[]> => {
    const res = await apiClient.get<AppRelease[]>("/app-releases");
    return res.data;
  },

  create: async (payload: CreateReleasePayload): Promise<AppRelease> => {
    const res = await apiClient.post<AppRelease>("/app-releases", payload);
    return res.data;
  },
};
```

- [ ] **Step 2: Add query keys**

Open `apps/mobile/src/api/queryKeys.ts`. Add at the end of the `QUERY_KEYS` object (before the closing `} as const`):

```typescript
  // App releases
  appReleasesLatest: (platform: string) =>
    ["appReleasesLatest", platform] as const,
  appReleases: ["appReleases"] as const,
```

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/api/releases.ts \
        apps/mobile/src/api/queryKeys.ts
git commit -m "feat(mobile): add releases API module and query keys"
```

---

## Task 7: Mobile — `useVersionCheck` hook

**Files:**

- Create: `apps/mobile/src/hooks/useVersionCheck.ts`

- [ ] **Step 1: Implement the hook**

```typescript
// apps/mobile/src/hooks/useVersionCheck.ts
import { useState, useEffect } from "react";
import { AppState, AppStateStatus, Platform } from "react-native";
import Constants from "expo-constants";
import { releasesApi } from "../api/releases";
import { compareVersions } from "../utils/compareVersions";

export interface VersionCheckState {
  hasUpdate: boolean;
  isForced: boolean;
  latestVersion: string | null;
  releaseNotes: string | null;
}

export function useVersionCheck(): VersionCheckState {
  const [state, setState] = useState<VersionCheckState>({
    hasUpdate: false,
    isForced: false,
    latestVersion: null,
    releaseNotes: null,
  });

  useEffect(() => {
    checkVersion();

    const sub = AppState.addEventListener(
      "change",
      (nextState: AppStateStatus) => {
        if (nextState === "active") {
          checkVersion();
        }
      },
    );

    return () => sub.remove();
  }, []);

  async function checkVersion() {
    try {
      const platform = Platform.OS; // "ios" | "android"
      const current = Constants.expoConfig?.version ?? "0.0.0";
      const data = await releasesApi.getLatest(platform);

      if (!data) return;

      if (compareVersions(data.version, current) <= 0) return;

      const isForced =
        !!data.minVersion && compareVersions(current, data.minVersion) < 0;

      setState({
        hasUpdate: true,
        isForced,
        latestVersion: data.version,
        releaseNotes: data.releaseNotes,
      });
    } catch {
      // Network failure — silent, try again on next foreground
    }
  }

  return state;
}
```

- [ ] **Step 2: Manually verify (no automated test — requires mocking Expo APIs)**

The hook calls `releasesApi.getLatest` and `Constants.expoConfig.version`. Verification is done end-to-end in Task 10. For now, verify TypeScript compilation:

```bash
cd apps/mobile && npx tsc --noEmit 2>&1 | grep useVersionCheck
```

Expected: no errors on `useVersionCheck.ts`

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/hooks/useVersionCheck.ts
git commit -m "feat(mobile): add useVersionCheck hook for native build update detection"
```

---

## Task 8: Mobile — Refactor `useOTAUpdate` to expose state

**Files:**

- Modify: `apps/mobile/src/hooks/useOTAUpdate.ts`

The current implementation calls `Alert.alert` internally. We need to expose state instead so `UpdateModal` can render the UI.

- [ ] **Step 1: Rewrite `useOTAUpdate.ts`**

Replace the full content of `apps/mobile/src/hooks/useOTAUpdate.ts`:

```typescript
import { useEffect, useState } from "react";
import { AppState, AppStateStatus } from "react-native";
import * as Updates from "expo-updates";

export interface OTAUpdateState {
  hasOTAUpdate: boolean;
  otaVersion: string | null;
  otaDate: string | null;
  isChecking: boolean;
  isDownloading: boolean;
  checkForUpdate: () => Promise<void>;
  downloadAndInstall: () => Promise<void>;
}

export function useOTAUpdate(): OTAUpdateState {
  const [hasOTAUpdate, setHasOTAUpdate] = useState(false);
  const [otaVersion, setOtaVersion] = useState<string | null>(null);
  const [otaDate, setOtaDate] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    checkForUpdate();

    const sub = AppState.addEventListener(
      "change",
      (nextState: AppStateStatus) => {
        if (nextState === "active") {
          checkForUpdate();
        }
      },
    );

    return () => sub.remove();
  }, []);

  async function checkForUpdate() {
    if (isChecking) return;

    try {
      setIsChecking(true);

      if (!Updates.isEnabled) return;

      const update = await Updates.checkForUpdateAsync();

      if (update.isAvailable) {
        setHasOTAUpdate(true);
        setOtaVersion(
          (update as any).manifest?.extra?.expoClient?.version ?? null,
        );
        setOtaDate((update as any).manifest?.createdAt ?? null);
      }
    } catch (error) {
      console.error("OTA check failed:", error);
    } finally {
      setIsChecking(false);
    }
  }

  async function downloadAndInstall() {
    try {
      setIsDownloading(true);
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
    } catch (error) {
      console.error("OTA install failed:", error);
      setIsDownloading(false);
    }
  }

  return {
    hasOTAUpdate,
    otaVersion,
    otaDate,
    isChecking,
    isDownloading,
    checkForUpdate,
    downloadAndInstall,
  };
}
```

- [ ] **Step 2: Check TypeScript compiles**

```bash
cd apps/mobile && npx tsc --noEmit 2>&1 | grep useOTAUpdate
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/hooks/useOTAUpdate.ts
git commit -m "refactor(mobile): useOTAUpdate exposes state instead of showing internal alerts"
```

---

## Task 9: Mobile — `UpdateModal` component

**Files:**

- Create: `apps/mobile/src/components/UpdateModal.tsx`

- [ ] **Step 1: Create the component**

```typescript
// apps/mobile/src/components/UpdateModal.tsx
import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Platform,
  ActivityIndicator,
} from "react-native";
import { VersionCheckState } from "../hooks/useVersionCheck";
import { OTAUpdateState } from "../hooks/useOTAUpdate";
import { IOS_APP_STORE_URL, getAndroidApkUrl } from "../constants/updateUrls";
import { colors, spacing, typography, borderRadius } from "../theme";

interface UpdateModalProps {
  nativeUpdate: VersionCheckState;
  otaUpdate: OTAUpdateState;
}

export function UpdateModal({ nativeUpdate, otaUpdate }: UpdateModalProps) {
  const [dismissed, setDismissed] = useState(false);

  const showNativeModal = nativeUpdate.hasUpdate && !dismissed;
  const showOTAModal =
    otaUpdate.hasOTAUpdate && !nativeUpdate.hasUpdate && !dismissed;
  const showBanner =
    (nativeUpdate.hasUpdate || otaUpdate.hasOTAUpdate) && dismissed;

  function handleNativeUpdate() {
    const url =
      Platform.OS === "ios"
        ? IOS_APP_STORE_URL
        : getAndroidApkUrl(nativeUpdate.latestVersion!);
    Linking.openURL(url);
  }

  function handleDismiss() {
    setDismissed(true);
  }

  function handleBannerPress() {
    setDismissed(false);
  }

  return (
    <>
      {/* Native build update modal */}
      <Modal
        visible={showNativeModal}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <View style={styles.overlay}>
          <View style={styles.card}>
            <Text style={styles.title}>Nuova versione disponibile</Text>
            <Text style={styles.body}>
              {`La versione ${nativeUpdate.latestVersion} è disponibile.`}
              {nativeUpdate.releaseNotes
                ? `\n\n${nativeUpdate.releaseNotes}`
                : ""}
            </Text>
            <TouchableOpacity style={styles.primaryButton} onPress={handleNativeUpdate}>
              <Text style={styles.primaryButtonText}>Aggiorna ora</Text>
            </TouchableOpacity>
            {!nativeUpdate.isForced && (
              <TouchableOpacity style={styles.secondaryButton} onPress={handleDismiss}>
                <Text style={styles.secondaryButtonText}>Più tardi</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {/* OTA update modal */}
      <Modal
        visible={showOTAModal}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <View style={styles.overlay}>
          <View style={styles.card}>
            <Text style={styles.title}>Aggiornamento disponibile</Text>
            <Text style={styles.body}>
              {`È disponibile ${otaUpdate.otaVersion ? `la versione ${otaUpdate.otaVersion}` : "un aggiornamento"}`}
              {otaUpdate.otaDate
                ? ` del ${new Date(otaUpdate.otaDate).toLocaleDateString("it-IT")}`
                : ""}
              {`.\n\nL'app si riavvierà automaticamente dopo il download.`}
            </Text>
            {otaUpdate.isDownloading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={colors.primary} />
                <Text style={styles.loadingText}>Download in corso...</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={otaUpdate.downloadAndInstall}
              >
                <Text style={styles.primaryButtonText}>Aggiorna ora</Text>
              </TouchableOpacity>
            )}
            {!otaUpdate.isDownloading && (
              <TouchableOpacity style={styles.secondaryButton} onPress={handleDismiss}>
                <Text style={styles.secondaryButtonText}>Più tardi</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {/* Sticky banner shown after dismissal */}
      {showBanner && (
        <TouchableOpacity
          style={styles.banner}
          onPress={handleBannerPress}
          activeOpacity={0.85}
        >
          <Text style={styles.bannerText}>
            {nativeUpdate.hasUpdate
              ? `Aggiornamento disponibile: v${nativeUpdate.latestVersion} — Tocca per aggiornare`
              : "Aggiornamento OTA disponibile — Tocca per aggiornare"}
          </Text>
        </TouchableOpacity>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    width: "100%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  body: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  secondaryButton: {
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: colors.textSecondary,
    fontSize: 15,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  banner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "#F59E0B",
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    zIndex: 999,
    alignItems: "center",
  },
  bannerText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 13,
    textAlign: "center",
  },
});
```

- [ ] **Step 2: Check TypeScript**

```bash
cd apps/mobile && npx tsc --noEmit 2>&1 | grep UpdateModal
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/components/UpdateModal.tsx
git commit -m "feat(mobile): add UpdateModal component with native build and OTA update flows"
```

---

## Task 10: Mobile — Wire `useVersionCheck` + `UpdateModal` into `App.tsx`

**Files:**

- Modify: `apps/mobile/App.tsx`

- [ ] **Step 1: Update `AppContent` in `App.tsx`**

Open `apps/mobile/App.tsx`. Add the two new imports after the existing hook imports:

```typescript
import { useVersionCheck } from "./src/hooks/useVersionCheck";
import { UpdateModal } from "./src/components/UpdateModal";
```

Then update the `AppContent` function:

```typescript
function AppContent() {
  // Initialize push notifications
  useNotifications();

  // Check for OTA updates — exposes state for UpdateModal
  const otaUpdate = useOTAUpdate();

  // Check for new native builds via backend
  const nativeUpdate = useVersionCheck();

  // Monitor network status and sync pending offline data
  useNetworkStatus();

  return (
    <AuthProvider>
      <StatusBar style="light" backgroundColor="#177246" />
      <AppNavigator />
      <UpdateModal nativeUpdate={nativeUpdate} otaUpdate={otaUpdate} />
    </AuthProvider>
  );
}
```

- [ ] **Step 2: Check TypeScript**

```bash
cd apps/mobile && npx tsc --noEmit 2>&1 | grep -E "App\.tsx|UpdateModal|useVersionCheck"
```

Expected: no errors

- [ ] **Step 3: Start Expo and verify end-to-end**

```bash
cd apps/mobile && npx expo start --clear
```

Then:

1. Open the app on a simulator/device (must be logged in)
2. In DB, insert a release newer than `1.0.6`:

   ```bash
   TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"crewcode":"SUPERADMIN","password":"password"}' | jq -r '.accessToken')

   curl -X POST http://localhost:3000/api/v1/app-releases \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"version":"1.0.7","platform":"all","releaseNotes":"Prima release di test"}'
   ```

3. Background and foreground the app (triggers `AppState` listener)
4. Verify: `UpdateModal` appears with "Nuova versione disponibile" title
5. Tap "Più tardi" → banner appears at top of screen
6. Tap banner → modal reopens

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/App.tsx
git commit -m "feat(mobile): mount useVersionCheck and UpdateModal in AppContent"
```

---

## Task 11: Mobile — `ReleasesScreen` (SuperAdmin publish screen)

**Files:**

- Create: `apps/mobile/src/screens/admin/ReleasesScreen.tsx`

- [ ] **Step 1: Create the screen**

```typescript
// apps/mobile/src/screens/admin/ReleasesScreen.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Menu, Rocket } from "lucide-react-native";
import { releasesApi, AppRelease } from "../../api/releases";
import { QUERY_KEYS } from "../../api/queryKeys";
import { colors, spacing, typography, borderRadius } from "../../theme";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";

const PLATFORMS = [
  { label: "Tutte", value: "all" },
  { label: "iOS", value: "ios" },
  { label: "Android", value: "android" },
] as const;

type PlatformValue = "all" | "ios" | "android";

export const ReleasesScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

  const [version, setVersion] = useState("");
  const [minVersion, setMinVersion] = useState("");
  const [platform, setPlatform] = useState<PlatformValue>("all");
  const [releaseNotes, setReleaseNotes] = useState("");

  const { data: releases = [], isLoading, refetch } = useQuery({
    queryKey: QUERY_KEYS.appReleases,
    queryFn: releasesApi.getAll,
  });

  const createMutation = useMutation({
    mutationFn: releasesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.appReleases });
      setVersion("");
      setMinVersion("");
      setPlatform("all");
      setReleaseNotes("");
      Alert.alert(
        "Notifica inviata",
        "La release è stata pubblicata e la push è stata inviata a tutti i dispositivi.",
      );
    },
    onError: (error: any) => {
      Alert.alert(
        "Errore",
        error.response?.data?.message || "Impossibile pubblicare la release.",
      );
    },
  });

  function handlePublish() {
    if (!version.trim()) {
      Alert.alert("Versione richiesta", "Inserisci il numero di versione (es. 1.0.7).");
      return;
    }
    Alert.alert(
      "Conferma pubblicazione",
      `Vuoi pubblicare la versione ${version} (${platform}) e inviare la push a tutti i dispositivi?`,
      [
        { text: "Annulla", style: "cancel" },
        {
          text: "Pubblica",
          onPress: () =>
            createMutation.mutate({
              version: version.trim(),
              minVersion: minVersion.trim() || undefined,
              platform,
              releaseNotes: releaseNotes.trim() || undefined,
            }),
        },
      ],
    );
  }

  function renderRelease({ item }: { item: AppRelease }) {
    const date = new Date(item.createdAt).toLocaleDateString("it-IT");
    const platformLabel =
      item.platform === "all" ? "Tutte" : item.platform === "ios" ? "iOS" : "Android";
    return (
      <Card style={styles.releaseCard}>
        <View style={styles.releaseHeader}>
          <View style={styles.versionBadge}>
            <Text style={styles.versionBadgeText}>v{item.version}</Text>
          </View>
          <View style={styles.platformChip}>
            <Text style={styles.platformChipText}>{platformLabel}</Text>
          </View>
          <Text style={styles.releaseDate}>{date}</Text>
        </View>
        {item.minVersion && (
          <Text style={styles.minVersion}>Min: {item.minVersion}</Text>
        )}
        {item.releaseNotes && (
          <Text style={styles.releaseNotes} numberOfLines={2}>
            {item.releaseNotes}
          </Text>
        )}
      </Card>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top > 0 ? 0 : spacing.sm }]}>
        <TouchableOpacity onPress={() => (navigation as any).openDrawer()}>
          <Menu size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Releases</Text>
        <Rocket size={24} color={colors.white} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Form */}
          <Card style={styles.formCard}>
            <Text style={styles.sectionTitle}>Pubblica nuova release</Text>

            <Text style={styles.label}>Versione *</Text>
            <TextInput
              style={styles.input}
              value={version}
              onChangeText={setVersion}
              placeholder="es. 1.0.7"
              placeholderTextColor={colors.textSecondary}
              keyboardType="decimal-pad"
            />

            <Text style={styles.label}>Versione minima (force update)</Text>
            <TextInput
              style={styles.input}
              value={minVersion}
              onChangeText={setMinVersion}
              placeholder="Lascia vuoto per nessun force update"
              placeholderTextColor={colors.textSecondary}
              keyboardType="decimal-pad"
            />

            <Text style={styles.label}>Piattaforma</Text>
            <View style={styles.segmentedControl}>
              {PLATFORMS.map((p) => (
                <TouchableOpacity
                  key={p.value}
                  style={[
                    styles.segment,
                    platform === p.value && styles.segmentActive,
                  ]}
                  onPress={() => setPlatform(p.value)}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      platform === p.value && styles.segmentTextActive,
                    ]}
                  >
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Note di rilascio</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={releaseNotes}
              onChangeText={setReleaseNotes}
              placeholder="Descrivi le modifiche di questa versione..."
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={4}
            />

            <Button
              onPress={handlePublish}
              loading={createMutation.isPending}
              title="Pubblica e notifica"
            />
          </Card>

          {/* Release history */}
          <Text style={styles.historyTitle}>Storico release</Text>
          {isLoading ? (
            <Text style={styles.loadingText}>Caricamento...</Text>
          ) : releases.length === 0 ? (
            <Text style={styles.emptyText}>Nessuna release pubblicata.</Text>
          ) : (
            releases.map((item) => (
              <View key={item.id}>{renderRelease({ item })}</View>
            ))
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 56,
  },
  headerTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "bold",
  },
  content: { padding: spacing.md, gap: spacing.md },
  formCard: { gap: spacing.sm },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  label: { ...typography.caption, color: colors.textSecondary, marginBottom: 2 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 15,
    marginBottom: spacing.sm,
  },
  textArea: { height: 90, textAlignVertical: "top" },
  segmentedControl: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.md,
    overflow: "hidden",
    marginBottom: spacing.sm,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  segmentActive: { backgroundColor: colors.primary },
  segmentText: { color: colors.primary, fontWeight: "500", fontSize: 14 },
  segmentTextActive: { color: "#fff" },
  historyTitle: {
    ...typography.h3,
    color: colors.text,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  releaseCard: { marginBottom: spacing.sm },
  releaseHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  versionBadge: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  versionBadgeText: { color: "#fff", fontWeight: "bold", fontSize: 12 },
  platformChip: {
    backgroundColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  platformChipText: { color: colors.text, fontSize: 12 },
  releaseDate: { color: colors.textSecondary, fontSize: 12, marginLeft: "auto" },
  minVersion: { color: "#EF4444", fontSize: 12, marginBottom: spacing.xs },
  releaseNotes: { color: colors.textSecondary, fontSize: 13 },
  loadingText: { color: colors.textSecondary, textAlign: "center", padding: spacing.lg },
  emptyText: { color: colors.textSecondary, textAlign: "center", padding: spacing.lg },
});
```

- [ ] **Step 2: Check TypeScript**

```bash
cd apps/mobile && npx tsc --noEmit 2>&1 | grep ReleasesScreen
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/screens/admin/ReleasesScreen.tsx
git commit -m "feat(mobile): add ReleasesScreen for SuperAdmin build publishing"
```

---

## Task 12: Mobile — Navigation wiring

**Files:**

- Modify: `apps/mobile/src/navigation/types.ts`
- Modify: `apps/mobile/src/navigation/DrawerNavigator.tsx`

- [ ] **Step 1: Add `Releases` to navigation types**

Open `apps/mobile/src/navigation/types.ts`.

In `RootStackParamList`, add after `KbAdmin: undefined;`:

```typescript
Releases: undefined;
```

In `DrawerParamList`, add after `KbAdmin: undefined;`:

```typescript
Releases: undefined;
```

- [ ] **Step 2: Import `ReleasesScreen` in `DrawerNavigator.tsx`**

Open `apps/mobile/src/navigation/DrawerNavigator.tsx`. Add the import alongside the other admin screen imports:

```typescript
import { ReleasesScreen } from "../screens/admin/ReleasesScreen";
```

Also add the `Rocket` icon import to the lucide-react-native import block:

```typescript
import {
  // ... existing icons ...
  Rocket,
} from "lucide-react-native";
```

- [ ] **Step 3: Add the drawer screen registration**

Inside the `{isSuperAdmin && ...}` block in the `<Drawer.Navigator>` (around line 947 where `Backups` is registered), add `ReleasesScreen` as a new `Drawer.Screen`. Find the last screen in the `isSuperAdmin` block and add after it:

```tsx
<Drawer.Screen
  name="Releases"
  component={ReleasesScreen}
  options={{
    title: "Releases",
    drawerItemStyle: { display: "none" },
    headerShown: false,
  }}
/>
```

- [ ] **Step 4: Add the drawer menu item in `CustomDrawerContent`**

Inside the `{isSuperAdmin && ...}` block in `CustomDrawerContent` (around line 463), add a new `MenuItem` in the SuperAdmin section after the existing Backups/KbAdmin entries:

```tsx
<MenuItem
  icon={<Rocket size={22} color={colors.primary} />}
  label="Releases"
  onPress={() => {
    props.navigation.navigate("Releases");
    props.navigation.closeDrawer();
  }}
/>
```

- [ ] **Step 5: Check TypeScript**

```bash
cd apps/mobile && npx tsc --noEmit 2>&1 | grep -E "types\.ts|DrawerNavigator"
```

Expected: no errors

- [ ] **Step 6: Full manual end-to-end test**

```bash
cd apps/mobile && npx expo start --clear
```

1. Log in as `SUPERADMIN / password`
2. Open drawer → should see "Releases" entry in the SuperAdmin section
3. Navigate to Releases → form appears with Version, Min Version, Piattaforma, Note
4. Fill in `1.0.8`, select `Tutte`, tap "Pubblica e notifica"
5. Confirmation alert → tap "Pubblica"
6. Success alert: "Notifica inviata"
7. Past release appears in the list below
8. On a device with push notifications enabled: receive "Nuova versione 1.0.8 disponibile 🚀" push
9. Background + foreground app → `UpdateModal` appears (version 1.0.8 > 1.0.6)
10. Tap "Più tardi" → sticky banner appears
11. Tap banner → modal reopens
12. Log in as a regular user → no "Releases" entry in drawer

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/src/navigation/types.ts \
        apps/mobile/src/navigation/DrawerNavigator.tsx
git commit -m "feat(mobile): wire ReleasesScreen into navigation for SuperAdmin"
```

---

## Spec Self-Review Checklist

- [x] **Push notification on new build** → Task 2 (`broadcastVersionNotification`) + Task 4 (`POST /app-releases`)
- [x] **Platform filter (iOS/Android/all)** → Task 2 filters by `device_tokens.platform`; Task 11 segmented control
- [x] **`GET /app-releases/latest` public** → Task 4 controller (no `@UseGuards` on that route)
- [x] **In-app modal on startup** → Task 7 (`useVersionCheck`) + Task 9 (`UpdateModal`) + Task 10 (App.tsx)
- [x] **OTA unified into UpdateModal** → Task 8 (refactor `useOTAUpdate`) + Task 9
- [x] **Soft block ("Più tardi")** → Task 9 secondary button → `setDismissed(true)` → banner
- [x] **Hard block (force update)** → Task 9 hides "Più tardi" when `nativeUpdate.isForced`
- [x] **`minVersion` field** → Task 1 entity/DTO, Task 3 service, Task 11 form
- [x] **Android APK URL** → Task 5 `getAndroidApkUrl`
- [x] **iOS App Store URL** → Task 5 `IOS_APP_STORE_URL` constant (placeholder, replace after submission)
- [x] **Sticky banner after dismiss** → Task 9 `showBanner` condition
- [x] **SuperAdmin Releases screen** → Task 11 + Task 12
- [x] **Drawer entry visible only to SuperAdmin** → Task 12 `{isSuperAdmin && ...}` block
- [x] **Navigation types updated** → Task 12 Step 1
- [x] **`useNotifications` handles `APP_VERSION_AVAILABLE` silently** → Already handled: the `setNotificationHandler` only silences `CATEGORIES_UPDATED` and `URGENCIES_UPDATED`; `APP_VERSION_AVAILABLE` will display as a regular visible notification by default. No extra handler code needed.
