# App Releases — Update Notifications & Version Banner

**Date:** 2026-05-18  
**Status:** Approved for implementation

## Context

When a new native build is published (iOS App Store or Android APK at `https://unionhub.app/`), users need two things:

1. A push notification telling them to update
2. An in-app modal/banner if they open the app without being on the latest version

OTA updates (handled by `expo-updates`) need the same banner treatment for consistency.

The SuperAdmin triggers the notification manually from a new "Releases" screen in the admin drawer.

---

## Architecture Overview

```
SuperAdmin taps "Pubblica e notifica"
       │
       ▼
POST /app-releases  (NestJS)
       │
       ├─→ Insert into app_releases table
       │
       └─→ NotificationsService.broadcastNotification(
               title, body, { type: "APP_VERSION_AVAILABLE", version, minVersion, platform },
               platform filter
           )
               │
               └─→ Expo Push API → devices

On app startup / foreground:
       │
       ├─→ useVersionCheck() → GET /app-releases/latest?platform=ios|android
       │       └─→ compare with Constants.expoConfig.version
       │               └─→ if outdated → UpdateModal shown
       │
       └─→ useOTAUpdate() (existing, refactored)
               └─→ Updates.checkForUpdateAsync()
                       └─→ if OTA available → UpdateModal shown
```

---

## Backend

### New Module: `api/src/app-releases/`

**File structure:**

```
api/src/app-releases/
  app-releases.module.ts
  app-releases.controller.ts
  app-releases.service.ts
  entities/app-release.entity.ts
  dto/create-release.dto.ts
```

**Entity: `app-release.entity.ts`**

```typescript
@Entity("app_releases")
export class AppRelease {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  version: string; // e.g. "1.0.7"

  @Column({ nullable: true })
  minVersion: string | null; // null = no force update

  @Column({ default: "all" })
  platform: string; // "ios" | "android" | "all"

  @Column({ type: "text", nullable: true })
  releaseNotes: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
```

**Migration:** `api/src/database/migrations/1779100000000-AddAppReleasesTable.ts`

Creates `app_releases` table with the columns above.

**DTO: `CreateReleaseDto`**

```typescript
export class CreateReleaseDto {
  @IsString()
  @IsNotEmpty()
  version: string;

  @IsString()
  @IsOptional()
  minVersion?: string;

  @IsIn(["ios", "android", "all"])
  @IsOptional()
  platform?: string; // default "all"

  @IsString()
  @IsOptional()
  releaseNotes?: string;
}
```

**Service: `AppReleasesService`**

- `create(dto)` — saves release, then calls `NotificationsService.broadcastVersionNotification(dto)`:
  - title: `"Nuova versione ${dto.version} disponibile 🚀"`
  - body: `dto.releaseNotes?.substring(0, 100) ?? "Aggiorna l'app per le ultime novità"`
  - data: `{ type: "APP_VERSION_AVAILABLE", version, minVersion, platform }`
  - platform filter: if `dto.platform !== "all"` → filter tokens by `platform = dto.platform`

- `getLatest(platform: string)` — returns latest release where `platform IN (platform, 'all')` ordered by `createdAt DESC LIMIT 1`. Use TypeORM `In([platform, 'all'])` operator in `findOne({ where: { platform: In([platform, 'all']) }, order: { createdAt: 'DESC' } })`

- `findAll()` — returns all releases DESC for admin list

**Controller: `AppReleasesController`**

```
POST /app-releases          @Roles(UserRole.SUPER_ADMIN)   → create release + push
GET  /app-releases/latest   public (no @UseGuards)         → ?platform=ios|android
GET  /app-releases          @Roles(UserRole.SUPER_ADMIN)   → list all
```

### Modified: `NotificationsService`

Add `broadcastVersionNotification({ version, minVersion, platform, releaseNotes })`:

- Fetches active tokens filtered by platform if not "all":
  ```typescript
  const where =
    platform !== "all" ? { isActive: true, platform } : { isActive: true };
  ```
- Sends visible push (title + body + data)

Note: `device_tokens.platform` already stores `"ios"` or `"android"` — the mobile sends `Platform.OS` on registration (`useNotifications.ts:94`). No migration needed.

---

## Mobile

### New: `apps/mobile/src/hooks/useVersionCheck.ts`

```typescript
export function useVersionCheck() {
  const [state, setState] = useState<{
    hasUpdate: boolean;
    isForced: boolean;
    latestVersion: string | null;
    releaseNotes: string | null;
  }>({
    hasUpdate: false,
    isForced: false,
    latestVersion: null,
    releaseNotes: null,
  });

  // Check on mount + foreground
  useEffect(() => {
    checkVersion();
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") checkVersion();
    });
    return () => sub.remove();
  }, []);

  async function checkVersion() {
    const platform = Platform.OS; // "ios" | "android"
    const current = Constants.expoConfig?.version ?? "0.0.0";
    const data = await api.getLatestRelease(platform);
    if (!data) return;

    const isNewer = compareVersions(data.version, current) > 0;
    if (!isNewer) return;

    const isForced =
      !!data.minVersion && compareVersions(current, data.minVersion) < 0;

    setState({
      hasUpdate: true,
      isForced,
      latestVersion: data.version,
      releaseNotes: data.releaseNotes,
    });
  }

  return state;
}
```

**Version comparison utility** `apps/mobile/src/utils/compareVersions.ts`:

- `compareVersions(a, b): number` — splits by `.`, compares `[major, minor, patch]` numerically
- Returns `1` if `a > b`, `-1` if `a < b`, `0` if equal

### Modified: `apps/mobile/src/hooks/useOTAUpdate.ts`

Remove internal `Alert.alert()` calls. Expose state instead:

```typescript
return {
  hasOTAUpdate: updateInfo?.isAvailable ?? false,
  otaVersion: updateInfo?.manifest?.extra?.expoClient?.version ?? null,
  otaDate: updateInfo?.manifest?.createdAt ?? null,
  downloadAndInstall, // existing function, no change
  isDownloading, // new: boolean state during fetch
  checkForUpdate: checkForUpdateManual,
  isChecking,
};
```

### New: `apps/mobile/src/components/UpdateModal.tsx`

Props: `nativeUpdate` (from `useVersionCheck`) + `otaUpdate` (from `useOTAUpdate`).

**Priority:** show native update modal first if `hasUpdate`. Show OTA modal if `hasOTAUpdate` and no native update.

**Modal content (native build):**

- Title: "Nuova versione disponibile"
- Body: `"La versione ${latestVersion} è disponibile.\n${releaseNotes ?? ''}"`
- Buttons:
  - "Aggiorna ora" → `Linking.openURL(updateUrl)` where:
    - iOS: `IOS_APP_STORE_URL` (constant, configured when published)
    - Android: `` `https://unionhub.app/UnionHub_${latestVersion.replace(/\./g, '_')}.apk` ``
  - "Più tardi" (hidden if `isForced`) → `setDismissed(true)`

**Banner sticky** (visible when `dismissed && hasUpdate`):

- Fixed `View` at top of screen (absolute, z-index 999), yellow/orange background
- Tapping it sets `dismissed(false)` → reopens modal
- Text: `"Aggiornamento disponibile: v${latestVersion}"`

**OTA modal content:**

- Title: "Aggiornamento disponibile"
- Body: info about OTA (same text as before, from the removed Alert)
- Buttons: "Più tardi" + "Aggiorna ora" → `downloadAndInstall()`

### Modified: `apps/mobile/App.tsx`

```tsx
// existing: useOTAUpdate() — now just exposes state
const otaUpdate = useOTAUpdate();
// new:
const nativeUpdate = useVersionCheck();

// Render in JSX:
<UpdateModal nativeUpdate={nativeUpdate} otaUpdate={otaUpdate} />;
```

### New: `apps/mobile/src/api/releases.ts`

```typescript
export async function getLatestRelease(platform: string) {
  const res = await apiClient.get(`/app-releases/latest?platform=${platform}`);
  return res.data as {
    version: string;
    minVersion: string | null;
    releaseNotes: string | null;
  } | null;
}

export async function createRelease(dto: CreateReleasePayload) {
  return apiClient.post("/app-releases", dto);
}
```

### New: `apps/mobile/src/screens/admin/ReleasesScreen.tsx`

**Visible in drawer: SuperAdmin only**

Layout:

- Header with hamburger
- **Create Release card:**
  - `TextInput` — Versione (e.g. "1.0.7")
  - `TextInput` — Versione minima (optional, placeholder "Solo per force update")
  - Segmented control — Piattaforma: `Tutte | iOS | Android`
  - `TextInput` multiline — Note di rilascio (optional)
  - `Button` "Pubblica e notifica" → calls `createRelease(dto)` → success toast
- **FlatList** — past releases (GET /app-releases), each row: version badge + platform chip + date + notes excerpt

Uses React Hook Form + TanStack Query (`useQuery` for list, `useMutation` for create).

### Navigation

**`DrawerNavigator.tsx`:** Add `Releases` screen entry visible only for `UserRole.SUPER_ADMIN`, icon `"rocket-outline"` (Ionicons).

**Navigation types** (`navigation/types.ts` or equivalent): Add `Releases: undefined` to drawer param list.

**`AppNavigator.tsx`:** Import and register `ReleasesScreen`.

---

## Constants

`apps/mobile/src/constants/updateUrls.ts` (new):

```typescript
export const IOS_APP_STORE_URL =
  "https://apps.apple.com/app/unionhub/idXXXXXXXXXX"; // replace with actual App Store ID after first submission
```

---

## Notification Handler

In `useNotifications.ts` — add handler for `APP_VERSION_AVAILABLE` type:

- Set to `shouldShowAlert: true` (it's a visible notification, not silent)
- On tap (`responseListener`): trigger version check re-run or open UpdateModal

---

## Verification

1. **Backend:**

   ```bash
   cd api && npm run migration:run
   # POST /app-releases with SuperAdmin token → 201, push sent
   # GET /app-releases/latest?platform=ios → returns latest iOS or all release
   # GET /app-releases/latest?platform=android → returns latest android or all release
   ```

2. **Mobile — notification:**
   - Run app on simulator/device
   - Send release from admin panel
   - Device receives visible push notification with title "Nuova versione X.X.X disponibile 🚀"

3. **Mobile — version check banner:**
   - Temporarily set `Constants.expoConfig.version` mock to an old version (or insert a release newer than current in DB)
   - Restart app → UpdateModal appears with "Più tardi" + "Aggiorna ora"
   - Tap "Più tardi" → sticky banner appears at top
   - Tap banner → modal reopens

4. **OTA check:**
   - Existing `useOTAUpdate` flow still works (check with `Updates.checkForUpdateAsync()`)
   - OTA modal appears via `UpdateModal` component (not via Alert directly)

5. **Force update:**
   - Insert release with `minVersion = currentVersion` → "Più tardi" button hidden

6. **Platform filter:**
   - Create Android-only release → iOS devices don't see update modal
   - Create iOS-only release → Android devices don't see update modal

---

## Files to Create / Modify

| File                                                               | Action                                       |
| ------------------------------------------------------------------ | -------------------------------------------- |
| `api/src/app-releases/entities/app-release.entity.ts`              | Create                                       |
| `api/src/app-releases/dto/create-release.dto.ts`                   | Create                                       |
| `api/src/app-releases/app-releases.service.ts`                     | Create                                       |
| `api/src/app-releases/app-releases.controller.ts`                  | Create                                       |
| `api/src/app-releases/app-releases.module.ts`                      | Create                                       |
| `api/src/database/migrations/1779100000000-AddAppReleasesTable.ts` | Create                                       |
| `api/src/app.module.ts`                                            | Modify — import AppReleasesModule            |
| `api/src/notifications/notifications.service.ts`                   | Modify — add `broadcastVersionNotification`  |
| `apps/mobile/src/hooks/useVersionCheck.ts`                         | Create                                       |
| `apps/mobile/src/hooks/useOTAUpdate.ts`                            | Modify — remove alerts, expose state         |
| `apps/mobile/src/components/UpdateModal.tsx`                       | Create                                       |
| `apps/mobile/src/utils/compareVersions.ts`                         | Create                                       |
| `apps/mobile/src/api/releases.ts`                                  | Create                                       |
| `apps/mobile/src/constants/updateUrls.ts`                          | Create                                       |
| `apps/mobile/src/screens/admin/ReleasesScreen.tsx`                 | Create                                       |
| `apps/mobile/App.tsx`                                              | Modify — mount useVersionCheck + UpdateModal |
| `apps/mobile/src/navigation/DrawerNavigator.tsx`                   | Modify — add Releases entry (SuperAdmin)     |
| Navigation types file                                              | Modify — add ReleasesScreen                  |
