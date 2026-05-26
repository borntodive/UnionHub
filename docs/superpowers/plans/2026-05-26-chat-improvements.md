# Chat Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add four features to the existing WebSocket chat: UX polish (date separators, scroll-to-bottom FAB, unread badge), typing indicator + online presence, emoji reactions, and swipe-to-reply/thread.

**Architecture:** Sequential implementation in dependency order — no-DB features first, then DB migrations for reactions and reply. All features share `ChatRoomScreen`, `useChatSocket`, and `chat.gateway.ts`; each task produces a self-contained commit. New entities (`ChatReadReceipt`, `ChatReaction`) are added to `ChatModule.TypeOrmModule.forFeature()` in their respective tasks.

**Tech Stack:** NestJS 11 + TypeORM 0.3 + PostgreSQL (backend); Expo 52 + React Native 0.83 + TanStack Query + Zustand + react-native-gesture-handler (frontend).

---

## File Map

| File                                                                  | Created/Modified | Tasks                   |
| --------------------------------------------------------------------- | ---------------- | ----------------------- |
| `api/src/chat/entities/chat-read-receipt.entity.ts`                   | Create           | 1                       |
| `api/src/database/migrations/1780000000000-CreateChatReadReceipts.ts` | Create           | 1                       |
| `api/src/chat/chat.service.ts`                                        | Modify           | 2, 10, 14               |
| `api/src/chat/chat.controller.ts`                                     | Modify           | 3, 10                   |
| `api/src/chat/chat.module.ts`                                         | Modify           | 1, 13                   |
| `api/src/chat/chat.service.spec.ts`                                   | Modify           | 2, 14                   |
| `apps/mobile/src/api/chat.ts`                                         | Modify           | 4, 16, 19               |
| `apps/mobile/src/screens/chat/ChatRoomScreen.tsx`                     | Modify           | 5, 6, 8, 12, 17, 21, 22 |
| `apps/mobile/src/screens/chat/ChatRoomsScreen.tsx`                    | Modify           | 7, 12                   |
| `apps/mobile/src/navigation/DrawerNavigator.tsx`                      | Modify           | 7                       |
| `apps/mobile/src/hooks/useChatSocket.ts`                              | Modify           | 11, 16                  |
| `api/src/chat/entities/chat-reaction.entity.ts`                       | Create           | 13                      |
| `api/src/database/migrations/1780100000000-CreateChatReactions.ts`    | Create           | 13                      |
| `api/src/chat/chat.gateway.ts`                                        | Modify           | 9, 15                   |
| `api/src/database/migrations/1780200000000-AddReplyToMessage.ts`      | Create           | 18                      |
| `apps/mobile/src/i18n/it.json`                                        | Modify           | 5, 7, 12, 17, 21        |
| `apps/mobile/src/i18n/en.json`                                        | Modify           | 5, 7, 12, 17, 21        |

---

## FEATURE 1: UX Polish

---

### Task 1: Create `chat_read_receipts` entity + migration

**Files:**

- Create: `api/src/chat/entities/chat-read-receipt.entity.ts`
- Create: `api/src/database/migrations/1780000000000-CreateChatReadReceipts.ts`
- Modify: `api/src/chat/chat.module.ts`

- [ ] **Step 1: Create the entity**

```ts
// api/src/chat/entities/chat-read-receipt.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, Index } from "typeorm";

@Entity("chat_read_receipts")
@Index(["userId", "roomId"], { unique: true })
export class ChatReadReceipt {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  userId: string;

  @Column({ type: "varchar", length: 100 })
  roomId: string;

  @Column({ type: "timestamptz" })
  lastReadAt: Date;
}
```

- [ ] **Step 2: Create the migration**

```ts
// api/src/database/migrations/1780000000000-CreateChatReadReceipts.ts
import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateChatReadReceipts1780000000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`
      CREATE TABLE "chat_read_receipts" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "roomId" varchar(100) NOT NULL,
        "lastReadAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_chat_read_receipts_user_room" UNIQUE ("userId", "roomId")
      )
    `);
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`DROP TABLE "chat_read_receipts"`);
  }
}
```

- [ ] **Step 3: Register entity in ChatModule**

In `api/src/chat/chat.module.ts`, add `ChatReadReceipt` to the imports and TypeOrmModule:

```ts
import { ChatReadReceipt } from "./entities/chat-read-receipt.entity";

// in TypeOrmModule.forFeature([...]):
TypeOrmModule.forFeature([ChatMessage, ChatAttachment, User, Base, ChatReadReceipt]),
```

- [ ] **Step 4: Run migration**

```bash
cd api && npm run migration:run
```

Expected: `CreateChatReadReceipts1780000000000 has been executed successfully.`

- [ ] **Step 5: Commit**

```bash
git add api/src/chat/entities/chat-read-receipt.entity.ts \
        api/src/database/migrations/1780000000000-CreateChatReadReceipts.ts \
        api/src/chat/chat.module.ts
git commit -m "feat(chat): add chat_read_receipts entity and migration"
```

---

### Task 2: `ChatService` — `markRoomRead`, `getUnreadCount`, enriched `getRoomsForUser`

**Files:**

- Modify: `api/src/chat/chat.service.ts`
- Modify: `api/src/chat/chat.service.spec.ts`

- [ ] **Step 1: Write failing tests**

Add to `api/src/chat/chat.service.spec.ts`:

```ts
import { IsNull } from "typeorm";
import { ChatReadReceipt } from "./entities/chat-read-receipt.entity";

// Add to the mock provider list in each describe block:
// { provide: getRepositoryToken(ChatReadReceipt), useValue: readReceiptRepo }

describe("ChatService.markRoomRead", () => {
  it("upserts a read receipt record", async () => {
    const upsertFn = jest.fn().mockResolvedValue(undefined);
    const module = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: getRepositoryToken(ChatMessage), useValue: {} },
        { provide: getRepositoryToken(ChatAttachment), useValue: {} },
        { provide: getRepositoryToken(User), useValue: {} },
        { provide: getRepositoryToken(Base), useValue: {} },
        {
          provide: getRepositoryToken(ChatReadReceipt),
          useValue: { upsert: upsertFn },
        },
        { provide: NotificationsService, useValue: {} },
      ],
    }).compile();
    const svc = module.get(ChatService);
    await svc.markRoomRead("user-1", "pilot-generale");
    expect(upsertFn).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1", roomId: "pilot-generale" }),
      { conflictPaths: ["userId", "roomId"] },
    );
  });
});

describe("ChatService.getUnreadCount", () => {
  it("returns 0 when user has read up to now", async () => {
    const countFn = jest.fn().mockResolvedValue(0);
    const findOneFn = jest.fn().mockResolvedValue({ lastReadAt: new Date() });
    const qb: any = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getCount: countFn,
    };
    const module = await Test.createTestingModule({
      providers: [
        ChatService,
        {
          provide: getRepositoryToken(ChatMessage),
          useValue: { createQueryBuilder: () => qb },
        },
        { provide: getRepositoryToken(ChatAttachment), useValue: {} },
        { provide: getRepositoryToken(User), useValue: {} },
        { provide: getRepositoryToken(Base), useValue: {} },
        {
          provide: getRepositoryToken(ChatReadReceipt),
          useValue: { findOne: findOneFn },
        },
        { provide: NotificationsService, useValue: {} },
      ],
    }).compile();
    const svc = module.get(ChatService);
    const count = await svc.getUnreadCount("user-1", "pilot-generale");
    expect(count).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd api && npm run test -- --testPathPattern=chat.service.spec
```

Expected: FAIL — `markRoomRead is not a function`

- [ ] **Step 3: Update `ChatService`**

Add `ChatReadReceipt` import and repo injection, add interface, and new methods:

```ts
// api/src/chat/chat.service.ts — add to imports
import { ChatReadReceipt } from "./entities/chat-read-receipt.entity";

// Add to interface:
export interface ChatRoomWithMeta extends ChatRoom {
  unreadCount: number;
  lastMessagePreview: string | null;
}

// Add to constructor params:
@InjectRepository(ChatReadReceipt)
private readonly readReceiptRepo: Repository<ChatReadReceipt>,

// Add methods:
async markRoomRead(userId: string, roomId: string): Promise<void> {
  await this.readReceiptRepo.upsert(
    { userId, roomId, lastReadAt: new Date() },
    { conflictPaths: ["userId", "roomId"] },
  );
}

async getUnreadCount(userId: string, roomId: string): Promise<number> {
  const receipt = await this.readReceiptRepo.findOne({
    where: { userId, roomId },
  });
  const qb = this.messageRepo
    .createQueryBuilder("m")
    .where("m.roomId = :roomId", { roomId })
    .andWhere("m.deletedAt IS NULL");
  if (receipt) {
    qb.andWhere("m.createdAt > :lastReadAt", { lastReadAt: receipt.lastReadAt });
  }
  return qb.getCount();
}
```

Update `getRoomsForUser` to collect rooms into a single variable (instead of three early returns) and enrich at the end:

```ts
async getRoomsForUser(userId: string): Promise<ChatRoomWithMeta[]> {
  const user = await this.usersRepo.findOne({
    where: { id: userId },
    relations: ["base"],
  });
  if (!user || !user.isActive) return [];

  const bases = await this.basesRepo.find();

  let rooms: ChatRoom[];

  if (user.role === UserRole.SUPERADMIN) {
    rooms = [
      ...this.buildRoomsForRuolo(Ruolo.PILOT, bases),
      ...this.buildRoomsForRuolo(Ruolo.CABIN_CREW, bases),
    ];
  } else if (!user.ruolo) {
    return [];
  } else if (user.role === UserRole.ADMIN) {
    rooms = this.buildRoomsForRuolo(user.ruolo, bases);
  } else {
    const ruoloLabel = user.ruolo === Ruolo.PILOT ? "Piloti" : "Cabin Crew";
    const prefix = user.ruolo;
    rooms = [{ id: `${prefix}-generale`, name: `${ruoloLabel} - Generale` }];
    if (user.base) {
      rooms.push({
        id: `${prefix}-${user.base.id}`,
        name: `${ruoloLabel} - ${user.base.nome}`,
      });
    }
  }

  return Promise.all(
    rooms.map(async (room) => ({
      ...room,
      unreadCount: await this.getUnreadCount(userId, room.id),
      lastMessagePreview: await this.getLastMessagePreview(room.id),
    })),
  );
}

private async getLastMessagePreview(roomId: string): Promise<string | null> {
  const msg = await this.messageRepo.findOne({
    where: { roomId, deletedAt: IsNull() },
    order: { createdAt: "DESC" },
  });
  if (!msg) return null;
  return msg.content?.slice(0, 60) ?? "📎 allegato";
}
```

Also add `IsNull` import from typeorm at the top of the file. The old `getRoomsForUser` body is completely replaced — do not merge, overwrite.

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd api && npm run test -- --testPathPattern=chat.service.spec
```

Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add api/src/chat/chat.service.ts api/src/chat/chat.service.spec.ts
git commit -m "feat(chat): add markRoomRead, getUnreadCount, enrich getRoomsForUser"
```

---

### Task 3: Controller — `POST /chat/rooms/:roomId/read`

**Files:**

- Modify: `api/src/chat/chat.controller.ts`

- [ ] **Step 1: Add the endpoint**

In `api/src/chat/chat.controller.ts`, add after the `getRooms` handler:

```ts
@Post("rooms/:roomId/read")
@HttpCode(HttpStatus.NO_CONTENT)
async markRead(
  @Req() req: any,
  @Param("roomId") roomId: string,
): Promise<void> {
  await this.chatService.markRoomRead(req.user.userId, roomId);
}
```

Also add `Post` to the existing `@nestjs/common` import if not already present (it is).

- [ ] **Step 2: Verify build**

```bash
cd api && npm run build 2>&1 | tail -5
```

Expected: no TypeScript errors

- [ ] **Step 3: Commit**

```bash
git add api/src/chat/chat.controller.ts
git commit -m "feat(chat): add POST /chat/rooms/:roomId/read endpoint"
```

---

### Task 4: Frontend API client — update `ChatRoom` type + add `markRoomRead`

**Files:**

- Modify: `apps/mobile/src/api/chat.ts`

- [ ] **Step 1: Update `ChatRoom` interface and add method**

```ts
// apps/mobile/src/api/chat.ts

export interface ChatRoom {
  id: string;
  name: string;
  unreadCount: number;
  lastMessagePreview: string | null;
  onlineCount: number; // will be populated in Task 10; default 0 until then
}

// add to chatApi object:
markRoomRead: async (roomId: string): Promise<void> =>
  void (await apiClient.post(`/chat/rooms/${roomId}/read`)),
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/src/api/chat.ts
git commit -m "feat(chat): add ChatRoom.unreadCount + markRoomRead API method"
```

---

### Task 5: Frontend — date separators in `ChatRoomScreen`

**Files:**

- Modify: `apps/mobile/src/screens/chat/ChatRoomScreen.tsx`
- Modify: `apps/mobile/src/i18n/it.json`
- Modify: `apps/mobile/src/i18n/en.json`

- [ ] **Step 1: Add i18n keys**

In `apps/mobile/src/i18n/it.json`, inside `"unionChat"`:

```json
"today": "Oggi",
"yesterday": "Ieri"
```

In `apps/mobile/src/i18n/en.json`, inside `"unionChat"`:

```json
"today": "Today",
"yesterday": "Yesterday"
```

- [ ] **Step 2: Add `buildListItems` utility and types inside `ChatRoomScreen.tsx`**

Add near the top of the file (after imports):

```ts
type DateSeparator = { type: "separator"; label: string; key: string };
type ListItem = ChatMessage | DateSeparator;

function buildListItems(
  messages: ChatMessage[],
  todayLabel: string,
  yesterdayLabel: string,
): ListItem[] {
  const items: ListItem[] = [];
  let lastDateStr: string | null = null;
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  for (const msg of messages) {
    const d = new Date(msg.createdAt);
    const dateStr = d.toDateString();
    if (dateStr !== lastDateStr) {
      lastDateStr = dateStr;
      let label: string;
      if (dateStr === today.toDateString()) label = todayLabel;
      else if (dateStr === yesterday.toDateString()) label = yesterdayLabel;
      else
        label = d.toLocaleDateString("it-IT", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
      items.push({ type: "separator", label, key: `sep-${dateStr}` });
    }
    items.push(msg);
  }
  return items;
}
```

- [ ] **Step 3: Use `buildListItems` in the component and update `renderItem`**

Inside `ChatRoomScreen`:

```ts
const { t } = useTranslation(); // already exists

const listItems = useMemo(
  () =>
    buildListItems(
      messages.filter((m) => !m.deletedAt),
      t("unionChat.today"),
      t("unionChat.yesterday"),
    ),
  [messages, t],
);
```

Replace the FlatList's `data` prop from `messages.filter((m) => !m.deletedAt)` to `listItems`.

Replace `keyExtractor`:

```ts
keyExtractor={(item) =>
  "type" in item ? item.key : item.id
}
```

Update `renderItem`:

```ts
renderItem={({ item }: { item: ListItem }) => {
  if ("type" in item) {
    return (
      <View style={styles.dateSeparatorContainer}>
        <View style={styles.dateSeparatorLine} />
        <Text style={styles.dateSeparatorText}>{item.label}</Text>
        <View style={styles.dateSeparatorLine} />
      </View>
    );
  }
  return renderMessage({ item });
}}
```

- [ ] **Step 4: Add separator styles**

In the `StyleSheet.create({...})` block:

```ts
dateSeparatorContainer: {
  flexDirection: "row",
  alignItems: "center",
  marginVertical: spacing.md,
  paddingHorizontal: spacing.md,
},
dateSeparatorLine: {
  flex: 1,
  height: 1,
  backgroundColor: colors.border,
},
dateSeparatorText: {
  color: colors.textTertiary,
  fontSize: typography.sizes.xs,
  marginHorizontal: spacing.sm,
},
```

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/screens/chat/ChatRoomScreen.tsx \
        apps/mobile/src/i18n/it.json \
        apps/mobile/src/i18n/en.json
git commit -m "feat(chat): add date separators in message list"
```

---

### Task 6: Frontend — scroll-to-bottom FAB

**Files:**

- Modify: `apps/mobile/src/screens/chat/ChatRoomScreen.tsx`

- [ ] **Step 1: Add state and scroll tracking**

Add inside `ChatRoomScreen`:

```ts
const [newMessageCount, setNewMessageCount] = useState(0);
const isAtBottomRef = useRef(true);

const handleScroll = useCallback((event: any) => {
  const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
  const distanceFromBottom =
    contentSize.height - contentOffset.y - layoutMeasurement.height;
  isAtBottomRef.current = distanceFromBottom < 100;
  if (isAtBottomRef.current) setNewMessageCount(0);
}, []);
```

- [ ] **Step 2: Update `onNewMessage` to respect scroll position**

Update the existing `onNewMessage` callback:

```ts
const onNewMessage = useCallback(
  (msg: ChatMessage) => {
    if (msg.roomId !== roomId) return;
    setMessages((prev) => [...prev, msg]);
    if (isAtBottomRef.current) {
      setTimeout(
        () => flatListRef.current?.scrollToEnd({ animated: true }),
        100,
      );
    } else {
      setNewMessageCount((c) => c + 1);
    }
  },
  [roomId],
);
```

- [ ] **Step 3: Add FAB to the JSX**

Inside the `View` wrapping the `FlatList` and `inputBar`, after the `FlatList`, add:

```tsx
{
  newMessageCount > 0 && (
    <TouchableOpacity
      style={styles.scrollFab}
      onPress={() => {
        flatListRef.current?.scrollToEnd({ animated: true });
        setNewMessageCount(0);
      }}
    >
      <Text style={styles.scrollFabIcon}>↓</Text>
      <View style={styles.scrollFabBadge}>
        <Text style={styles.scrollFabBadgeText}>
          {newMessageCount > 99 ? "99+" : newMessageCount}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
```

Add `onScroll={handleScroll}` and `scrollEventThrottle={100}` to the `FlatList`.

- [ ] **Step 4: Add FAB styles**

```ts
scrollFab: {
  position: "absolute",
  bottom: 80,
  right: spacing.md,
  width: 44,
  height: 44,
  borderRadius: 22,
  backgroundColor: colors.primary,
  justifyContent: "center",
  alignItems: "center",
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.2,
  shadowRadius: 4,
  elevation: 4,
},
scrollFabIcon: { color: colors.textInverse, fontSize: 20 },
scrollFabBadge: {
  position: "absolute",
  top: -4,
  right: -4,
  backgroundColor: colors.error,
  borderRadius: 10,
  minWidth: 18,
  height: 18,
  justifyContent: "center",
  alignItems: "center",
  paddingHorizontal: 4,
},
scrollFabBadgeText: {
  color: colors.textInverse,
  fontSize: typography.sizes.xs,
  fontWeight: typography.weights.bold,
},
```

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/screens/chat/ChatRoomScreen.tsx
git commit -m "feat(chat): add scroll-to-bottom FAB with unread count"
```

---

### Task 7: Frontend — unread badge in `ChatRoomsScreen` + `DrawerNavigator`

**Files:**

- Modify: `apps/mobile/src/screens/chat/ChatRoomsScreen.tsx`
- Modify: `apps/mobile/src/navigation/DrawerNavigator.tsx`
- Modify: `apps/mobile/src/i18n/it.json`
- Modify: `apps/mobile/src/i18n/en.json`

- [ ] **Step 1: Update `ChatRoomsScreen` to show per-room badge**

In `ChatRoomsScreen`, update `renderRoom`:

```tsx
const renderRoom = ({ item }: { item: ChatRoom }) => (
  <TouchableOpacity
    style={styles.roomItem}
    onPress={() =>
      navigation.navigate("ChatRoom", {
        roomId: item.id,
        roomName: item.name,
      })
    }
  >
    <View style={styles.roomIcon}>
      <Text style={styles.roomHash}>#</Text>
    </View>
    <Text style={styles.roomName}>{item.name}</Text>
    {item.unreadCount > 0 && (
      <View style={styles.unreadBadge}>
        <Text style={styles.unreadBadgeText}>
          {item.unreadCount > 99 ? "99+" : item.unreadCount}
        </Text>
      </View>
    )}
  </TouchableOpacity>
);
```

Add styles:

```ts
unreadBadge: {
  backgroundColor: colors.primary,
  borderRadius: 10,
  minWidth: 20,
  height: 20,
  justifyContent: "center",
  alignItems: "center",
  paddingHorizontal: 5,
},
unreadBadgeText: {
  color: colors.textInverse,
  fontSize: typography.sizes.xs,
  fontWeight: typography.weights.bold,
},
```

- [ ] **Step 2: Update `DrawerNavigator` — add total unread badge to Chat menu item**

In `DrawerNavigator.tsx`, inside `CustomDrawerContent`, add:

```ts
import { useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "../api/queryKeys";
import { ChatRoom } from "../api/chat";

// inside CustomDrawerContent, alongside existing state:
const queryClient = useQueryClient();
const chatRooms =
  queryClient.getQueryData<ChatRoom[]>(QUERY_KEYS.chatRooms) ?? [];
const totalUnread = chatRooms.reduce((sum, r) => sum + (r.unreadCount ?? 0), 0);
```

Then update the existing `ChatRooms` `MenuItem`:

```tsx
{
  isOnline && (CHAT_FOR_ALL_USERS || isAdmin) && (
    <MenuItem
      icon={<MessageCircle size={22} color={colors.primary} />}
      label={t("navigation.unionChat")}
      badge={totalUnread > 0 ? totalUnread : undefined}
      onPress={() => {
        props.navigation.navigate("ChatRooms");
        props.navigation.closeDrawer();
      }}
    />
  );
}
```

- [ ] **Step 3: Add i18n keys** (no new keys needed for badge — uses number)

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/screens/chat/ChatRoomsScreen.tsx \
        apps/mobile/src/navigation/DrawerNavigator.tsx
git commit -m "feat(chat): add unread badge on room list and drawer item"
```

---

### Task 8: Frontend — mark-read on `ChatRoomScreen` mount

**Files:**

- Modify: `apps/mobile/src/screens/chat/ChatRoomScreen.tsx`

- [ ] **Step 1: Call `markRoomRead` on mount**

Add to `ChatRoomScreen`, after the existing `useQuery` for history:

```ts
const queryClient = useQueryClient(); // already imported

useEffect(() => {
  chatApi.markRoomRead(roomId).catch(() => {});
  return () => {
    // Also mark as read when leaving the room
    chatApi.markRoomRead(roomId).catch(() => {});
  };
}, [roomId]);

// After a new message arrives and user is at bottom, also mark as read:
// (already handled because isAtBottomRef.current auto-scrolls, and we invalidate on mount)
```

Also in `onNewMessage`, after auto-scrolling when `isAtBottomRef.current === true`:

```ts
if (isAtBottomRef.current) {
  setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  chatApi.markRoomRead(roomId).catch(() => {});
} else {
  setNewMessageCount((c) => c + 1);
}
```

After the scroll-to-bottom FAB tap, also mark as read:

```ts
onPress={() => {
  flatListRef.current?.scrollToEnd({ animated: true });
  setNewMessageCount(0);
  chatApi.markRoomRead(roomId).catch(() => {});
}}
```

- [ ] **Step 2: Invalidate `chatRooms` query after marking read**

Replace the raw `chatApi.markRoomRead(roomId).catch(() => {})` calls with a helper:

```ts
const markRead = useCallback(() => {
  chatApi
    .markRoomRead(roomId)
    .then(() =>
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.chatRooms }),
    )
    .catch(() => {});
}, [roomId, queryClient]);
```

Then call `markRead()` instead of the inline calls above.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/screens/chat/ChatRoomScreen.tsx
git commit -m "feat(chat): mark room as read on enter/exit and when scrolled to bottom"
```

---

## FEATURE 2: Typing Indicator + Online Presence

---

### Task 9: Backend — `typing_start` / `typing_stop` WS events

**Files:**

- Modify: `api/src/chat/chat.gateway.ts`

- [ ] **Step 1: Add two `@SubscribeMessage` handlers**

In `api/src/chat/chat.gateway.ts`, after `handlePinMessage`:

```ts
@SubscribeMessage("typing_start")
handleTypingStart(
  @ConnectedSocket() client: Socket,
  @MessageBody() data: { roomId: string },
): void {
  const user: User = client.data.user;
  if (
    !user ||
    !this.chatService.canAccessRoom(
      { role: user.role, ruolo: user.ruolo, baseId: user.base?.id },
      data.roomId,
    )
  ) {
    return;
  }
  client.to(data.roomId).emit("user_typing", {
    userId: user.id,
    nome: user.nome,
    cognome: user.cognome,
  });
}

@SubscribeMessage("typing_stop")
handleTypingStop(
  @ConnectedSocket() client: Socket,
  @MessageBody() data: { roomId: string },
): void {
  const user: User = client.data.user;
  if (!user) return;
  client.to(data.roomId).emit("user_stopped_typing", { userId: user.id });
}
```

- [ ] **Step 2: Verify build**

```bash
cd api && npm run build 2>&1 | tail -5
```

Expected: no TypeScript errors

- [ ] **Step 3: Commit**

```bash
git add api/src/chat/chat.gateway.ts
git commit -m "feat(chat): add typing_start/typing_stop WS events"
```

---

### Task 10: Backend — `getOnlineCount` + enrich `GET /chat/rooms`

**Files:**

- Modify: `api/src/chat/chat.gateway.ts`
- Modify: `api/src/chat/chat.controller.ts`

- [ ] **Step 1: Add `getOnlineCount` to gateway**

In `api/src/chat/chat.gateway.ts`, after `getOnlineUserIds`:

```ts
async getOnlineCount(roomId: string): Promise<number> {
  const sockets = await this.server.in(roomId).fetchSockets();
  return sockets.length;
}
```

- [ ] **Step 2: Inject `ChatGateway` into controller and enrich rooms response**

In `api/src/chat/chat.controller.ts`:

```ts
import { ChatGateway } from "./chat.gateway";

// constructor:
constructor(
  private readonly chatService: ChatService,
  private readonly chatGateway: ChatGateway,
) {}

// Update getRooms:
@Get("rooms")
async getRooms(@Req() req: any) {
  const rooms = await this.chatService.getRoomsForUser(req.user.userId);
  const enriched = await Promise.all(
    rooms.map(async (room) => ({
      ...room,
      onlineCount: await this.chatGateway.getOnlineCount(room.id),
    })),
  );
  return enriched;
}
```

In `api/src/chat/chat.module.ts`, ensure `ChatGateway` is in `providers` (already is) and `exports: [ChatGateway]` is NOT needed since controller and gateway are in the same module.

- [ ] **Step 3: Verify build**

```bash
cd api && npm run build 2>&1 | tail -5
```

Expected: no TypeScript errors

- [ ] **Step 4: Commit**

```bash
git add api/src/chat/chat.gateway.ts api/src/chat/chat.controller.ts
git commit -m "feat(chat): expose onlineCount per room in GET /chat/rooms"
```

---

### Task 11: Frontend — `useChatSocket` typing emitters + callbacks

**Files:**

- Modify: `apps/mobile/src/hooks/useChatSocket.ts`

- [ ] **Step 1: Update `UseChatSocketOptions` interface and add new state/handlers**

Replace the contents of `apps/mobile/src/hooks/useChatSocket.ts`:

```ts
import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { ChatMessage, ReactionCount } from "../api/chat";
import { API_BASE_URL } from "../api/client";

const API_BASE = API_BASE_URL.replace("/api/v1", "");

export interface TypingUser {
  userId: string;
  nome: string;
  cognome: string;
}

interface UseChatSocketOptions {
  accessToken: string | null;
  roomId: string;
  onNewMessage: (message: ChatMessage) => void;
  onMessageDeleted: (data: { messageId: string; roomId: string }) => void;
  onMessagePinned: (data: {
    messageId: string;
    roomId: string;
    isPinned: boolean;
  }) => void;
  onUserTyping?: (user: TypingUser) => void;
  onUserStoppedTyping?: (data: { userId: string }) => void;
  onReactionUpdated?: (data: {
    messageId: string;
    reactions: ReactionCount[];
  }) => void;
}

export function useChatSocket({
  accessToken,
  roomId,
  onNewMessage,
  onMessageDeleted,
  onMessagePinned,
  onUserTyping,
  onUserStoppedTyping,
  onReactionUpdated,
}: UseChatSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const onNewMessageRef = useRef(onNewMessage);
  const onMessageDeletedRef = useRef(onMessageDeleted);
  const onMessagePinnedRef = useRef(onMessagePinned);
  const onUserTypingRef = useRef(onUserTyping);
  const onUserStoppedTypingRef = useRef(onUserStoppedTyping);
  const onReactionUpdatedRef = useRef(onReactionUpdated);

  useEffect(() => {
    onNewMessageRef.current = onNewMessage;
  }, [onNewMessage]);
  useEffect(() => {
    onMessageDeletedRef.current = onMessageDeleted;
  }, [onMessageDeleted]);
  useEffect(() => {
    onMessagePinnedRef.current = onMessagePinned;
  }, [onMessagePinned]);
  useEffect(() => {
    onUserTypingRef.current = onUserTyping;
  }, [onUserTyping]);
  useEffect(() => {
    onUserStoppedTypingRef.current = onUserStoppedTyping;
  }, [onUserStoppedTyping]);
  useEffect(() => {
    onReactionUpdatedRef.current = onReactionUpdated;
  }, [onReactionUpdated]);

  useEffect(() => {
    if (!accessToken) return;

    const socket = io(`${API_BASE}/chat`, {
      auth: { token: accessToken },
      transports: ["websocket"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    socket.on("connect", () => setIsConnected(true));
    socket.on("disconnect", () => setIsConnected(false));
    socket.on("new_message", (msg: ChatMessage) =>
      onNewMessageRef.current(msg),
    );
    socket.on(
      "message_deleted",
      (data: { messageId: string; roomId: string }) =>
        onMessageDeletedRef.current(data),
    );
    socket.on(
      "message_pinned",
      (data: { messageId: string; roomId: string; isPinned: boolean }) =>
        onMessagePinnedRef.current(data),
    );
    socket.on("user_typing", (user: TypingUser) =>
      onUserTypingRef.current?.(user),
    );
    socket.on("user_stopped_typing", (data: { userId: string }) =>
      onUserStoppedTypingRef.current?.(data),
    );
    socket.on(
      "reaction_updated",
      (data: { messageId: string; reactions: ReactionCount[] }) =>
        onReactionUpdatedRef.current?.(data),
    );

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [accessToken]);

  const sendMessage = useCallback(
    (
      content: string | undefined,
      attachmentIds: string[] = [],
      replyToId?: string,
    ): boolean => {
      if (!socketRef.current?.connected) return false;
      socketRef.current.emit("send_message", {
        roomId,
        content,
        attachmentIds,
        replyToId,
      });
      return true;
    },
    [roomId],
  );

  const deleteMessage = useCallback(
    (messageId: string) => {
      if (!socketRef.current?.connected) return;
      socketRef.current.emit("delete_message", { messageId, roomId });
    },
    [roomId],
  );

  const pinMessage = useCallback((messageId: string, pin: boolean) => {
    if (!socketRef.current?.connected) return;
    socketRef.current.emit("pin_message", { messageId, pin });
  }, []);

  const emitTypingStart = useCallback(() => {
    socketRef.current?.emit("typing_start", { roomId });
  }, [roomId]);

  const emitTypingStop = useCallback(() => {
    socketRef.current?.emit("typing_stop", { roomId });
  }, [roomId]);

  const emitAddReaction = useCallback(
    (messageId: string, emoji: string) => {
      socketRef.current?.emit("add_reaction", { messageId, roomId, emoji });
    },
    [roomId],
  );

  const emitRemoveReaction = useCallback(
    (messageId: string, emoji: string) => {
      socketRef.current?.emit("remove_reaction", { messageId, roomId, emoji });
    },
    [roomId],
  );

  return {
    isConnected,
    sendMessage,
    deleteMessage,
    pinMessage,
    emitTypingStart,
    emitTypingStop,
    emitAddReaction,
    emitRemoveReaction,
  };
}
```

- [ ] **Step 2: Add `ReactionCount` to `chat.ts` API types** (will be fully populated in Task 16; add placeholder now)

In `apps/mobile/src/api/chat.ts`, add:

```ts
export interface ReactionCount {
  emoji: string;
  count: number;
  reactedByMe: boolean;
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/hooks/useChatSocket.ts apps/mobile/src/api/chat.ts
git commit -m "feat(chat): extend useChatSocket with typing, reaction, reply emitters"
```

---

### Task 12: Frontend — typing indicator UI + online presence in rooms screen

**Files:**

- Modify: `apps/mobile/src/screens/chat/ChatRoomScreen.tsx`
- Modify: `apps/mobile/src/screens/chat/ChatRoomsScreen.tsx`
- Modify: `apps/mobile/src/i18n/it.json`
- Modify: `apps/mobile/src/i18n/en.json`

- [ ] **Step 1: Add i18n keys**

In `apps/mobile/src/i18n/it.json`, inside `"unionChat"`:

```json
"typing": "{{names}} sta scrivendo…",
"typingMultiple": "{{names}} stanno scrivendo…",
"typingOthers": "{{names}} e altri stanno scrivendo…",
"online": "{{count}} online"
```

In `apps/mobile/src/i18n/en.json`, inside `"unionChat"`:

```json
"typing": "{{names}} is typing…",
"typingMultiple": "{{names}} are typing…",
"typingOthers": "{{names}} and others are typing…",
"online": "{{count}} online"
```

- [ ] **Step 2: Add typing state to `ChatRoomScreen`**

Add inside `ChatRoomScreen`:

```ts
import { TypingUser } from "../../hooks/useChatSocket";

const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
const typingTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>(
  {},
);

const onUserTyping = useCallback((user: TypingUser) => {
  setTypingUsers((prev) => {
    const filtered = prev.filter((u) => u.userId !== user.userId);
    return [...filtered, user];
  });
  clearTimeout(typingTimeoutsRef.current[user.userId]);
  typingTimeoutsRef.current[user.userId] = setTimeout(() => {
    setTypingUsers((prev) => prev.filter((u) => u.userId !== user.userId));
    delete typingTimeoutsRef.current[user.userId];
  }, 3000);
}, []);

const onUserStoppedTyping = useCallback(({ userId }: { userId: string }) => {
  clearTimeout(typingTimeoutsRef.current[userId]);
  delete typingTimeoutsRef.current[userId];
  setTypingUsers((prev) => prev.filter((u) => u.userId !== userId));
}, []);
```

Pass callbacks to `useChatSocket`:

```ts
const { isConnected, sendMessage, deleteMessage, emitTypingStart, emitTypingStop, ... } = useChatSocket({
  accessToken,
  roomId,
  onNewMessage,
  onMessageDeleted,
  onMessagePinned,
  onUserTyping,
  onUserStoppedTyping,
  // onReactionUpdated added in Task 17
});
```

- [ ] **Step 3: Wire typing emit to TextInput**

Add a debounce ref:

```ts
const typingDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
```

Update `TextInput.onChangeText`:

```ts
onChangeText={(text) => {
  setInputText(text);
  if (isConnected) {
    if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
    emitTypingStart();
    typingDebounceRef.current = setTimeout(() => {
      emitTypingStop();
    }, 2000);
  }
}}
```

Update `handleSend` to call `emitTypingStop()` before sending:

```ts
const handleSend = () => {
  emitTypingStop();
  if (typingDebounceRef.current) {
    clearTimeout(typingDebounceRef.current);
    typingDebounceRef.current = null;
  }
  // ... rest of existing handleSend
};
```

- [ ] **Step 4: Add typing indicator banner above input bar**

Add a `formatTypingText` helper:

```ts
function formatTypingText(
  users: TypingUser[],
  t: (key: string, opts?: object) => string,
  currentUserId: string,
): string | null {
  const others = users.filter((u) => u.userId !== currentUserId);
  if (others.length === 0) return null;
  const names = others
    .slice(0, 2)
    .map((u) => `${u.nome} ${u.cognome[0]}.`)
    .join(", ");
  if (others.length === 1) return t("unionChat.typing", { names });
  if (others.length === 2) return t("unionChat.typingMultiple", { names });
  return t("unionChat.typingOthers", {
    names: `${others[0].nome} ${others[0].cognome[0]}.`,
  });
}
```

In the JSX, between `FlatList` and `inputBar`:

```tsx
{
  (() => {
    const typingText = formatTypingText(typingUsers, t, user?.id ?? "");
    return typingText ? (
      <View style={styles.typingBanner}>
        <Text style={styles.typingText}>{typingText}</Text>
      </View>
    ) : null;
  })();
}
```

Add styles:

```ts
typingBanner: {
  paddingHorizontal: spacing.md,
  paddingVertical: 4,
  backgroundColor: colors.background,
},
typingText: {
  color: colors.textTertiary,
  fontSize: typography.sizes.xs,
  fontStyle: "italic",
},
```

- [ ] **Step 5: Online presence in `ChatRoomsScreen`**

In `ChatRoomsScreen`, update `renderRoom` to show online indicator after `unreadBadge`:

```tsx
{
  item.onlineCount > 0 && (
    <View style={styles.onlineIndicator}>
      <View style={styles.onlineDot} />
      <Text style={styles.onlineText}>
        {t("unionChat.online", { count: item.onlineCount })}
      </Text>
    </View>
  );
}
```

Add styles:

```ts
onlineIndicator: {
  flexDirection: "row",
  alignItems: "center",
  gap: 4,
},
onlineDot: {
  width: 6,
  height: 6,
  borderRadius: 3,
  backgroundColor: colors.success,
},
onlineText: {
  color: colors.textTertiary,
  fontSize: typography.sizes.xs,
},
```

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/screens/chat/ChatRoomScreen.tsx \
        apps/mobile/src/screens/chat/ChatRoomsScreen.tsx \
        apps/mobile/src/i18n/it.json \
        apps/mobile/src/i18n/en.json
git commit -m "feat(chat): add typing indicator and online presence"
```

---

## FEATURE 3: Reactions

---

### Task 13: Create `chat_reactions` entity + migration

**Files:**

- Create: `api/src/chat/entities/chat-reaction.entity.ts`
- Create: `api/src/database/migrations/1780100000000-CreateChatReactions.ts`
- Modify: `api/src/chat/chat.module.ts`
- Modify: `api/src/chat/entities/chat-message.entity.ts`

- [ ] **Step 1: Create `ChatReaction` entity**

```ts
// api/src/chat/entities/chat-reaction.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { ChatMessage } from "./chat-message.entity";
import { User } from "../../users/entities/user.entity";

@Entity("chat_reactions")
@Index(["messageId", "userId", "emoji"], { unique: true })
export class ChatReaction {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  messageId: string;

  @ManyToOne(() => ChatMessage, (m) => m.reactions, { onDelete: "CASCADE" })
  @JoinColumn({ name: "messageId" })
  message: ChatMessage;

  @Column({ type: "uuid" })
  userId: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: User;

  @Column({ type: "varchar", length: 8 })
  emoji: string;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;
}
```

- [ ] **Step 2: Add `reactions` relation to `ChatMessage` entity**

In `api/src/chat/entities/chat-message.entity.ts`, add after `attachments`:

```ts
import { ChatReaction } from "./chat-reaction.entity";

@OneToMany(() => ChatReaction, (r) => r.message, { eager: false })
reactions: ChatReaction[];
```

- [ ] **Step 3: Create migration**

```ts
// api/src/database/migrations/1780100000000-CreateChatReactions.ts
import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateChatReactions1780100000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`
      CREATE TABLE "chat_reactions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "messageId" uuid NOT NULL REFERENCES "chat_messages"("id") ON DELETE CASCADE,
        "userId" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "emoji" varchar(8) NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_chat_reactions_msg_user_emoji" UNIQUE ("messageId", "userId", "emoji")
      )
    `);
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`DROP TABLE "chat_reactions"`);
  }
}
```

- [ ] **Step 4: Register entity in `ChatModule`**

```ts
import { ChatReaction } from "./entities/chat-reaction.entity";
TypeOrmModule.forFeature([ChatMessage, ChatAttachment, User, Base, ChatReadReceipt, ChatReaction]),
```

- [ ] **Step 5: Run migration**

```bash
cd api && npm run migration:run
```

Expected: `CreateChatReactions1780100000000 has been executed successfully.`

- [ ] **Step 6: Commit**

```bash
git add api/src/chat/entities/chat-reaction.entity.ts \
        api/src/chat/entities/chat-message.entity.ts \
        api/src/database/migrations/1780100000000-CreateChatReactions.ts \
        api/src/chat/chat.module.ts
git commit -m "feat(chat): add chat_reactions entity and migration"
```

---

### Task 14: `ChatService` — `getReactions`, `toggleReaction`, update `getHistory`

**Files:**

- Modify: `api/src/chat/chat.service.ts`
- Modify: `api/src/chat/chat.service.spec.ts`

- [ ] **Step 1: Write failing tests**

Add to `api/src/chat/chat.service.spec.ts`:

```ts
import { ChatReaction } from "./entities/chat-reaction.entity";

describe("ChatService.getReactions", () => {
  it("aggregates reactions and marks reactedByMe", async () => {
    const mockReactions: Partial<ChatReaction>[] = [
      { emoji: "👍", userId: "user-1" },
      { emoji: "👍", userId: "user-2" },
      { emoji: "❤️", userId: "user-1" },
    ];
    const findFn = jest.fn().mockResolvedValue(mockReactions);
    const module = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: getRepositoryToken(ChatMessage), useValue: {} },
        { provide: getRepositoryToken(ChatAttachment), useValue: {} },
        { provide: getRepositoryToken(User), useValue: {} },
        { provide: getRepositoryToken(Base), useValue: {} },
        { provide: getRepositoryToken(ChatReadReceipt), useValue: {} },
        {
          provide: getRepositoryToken(ChatReaction),
          useValue: { find: findFn },
        },
        { provide: NotificationsService, useValue: {} },
      ],
    }).compile();
    const svc = module.get(ChatService);
    const result = await svc.getReactions("msg-1", "user-1");
    expect(result).toEqual(
      expect.arrayContaining([
        { emoji: "👍", count: 2, reactedByMe: true },
        { emoji: "❤️", count: 1, reactedByMe: true },
      ]),
    );
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd api && npm run test -- --testPathPattern=chat.service.spec
```

Expected: FAIL — `getReactions is not a function`

- [ ] **Step 3: Implement `getReactions` and `toggleReaction` in `ChatService`**

Add imports and repo injection:

```ts
import { ChatReaction } from "./entities/chat-reaction.entity";

export interface ReactionCount {
  emoji: string;
  count: number;
  reactedByMe: boolean;
}

const ALLOWED_EMOJIS = ["👍", "❤️", "😂", "😮", "😢"];

// In constructor:
@InjectRepository(ChatReaction)
private readonly reactionRepo: Repository<ChatReaction>,

// Methods:
async getReactions(messageId: string, requestingUserId: string): Promise<ReactionCount[]> {
  const reactions = await this.reactionRepo.find({ where: { messageId } });
  const grouped = new Map<string, { count: number; reactedByMe: boolean }>();
  for (const r of reactions) {
    const existing = grouped.get(r.emoji) ?? { count: 0, reactedByMe: false };
    grouped.set(r.emoji, {
      count: existing.count + 1,
      reactedByMe: existing.reactedByMe || r.userId === requestingUserId,
    });
  }
  return Array.from(grouped.entries()).map(([emoji, { count, reactedByMe }]) => ({
    emoji,
    count,
    reactedByMe,
  }));
}

async toggleReaction(
  messageId: string,
  userId: string,
  emoji: string,
): Promise<void> {
  if (!ALLOWED_EMOJIS.includes(emoji)) {
    throw new BadRequestException("Invalid emoji");
  }
  const existing = await this.reactionRepo.findOne({
    where: { messageId, userId, emoji },
  });
  if (existing) {
    await this.reactionRepo.delete({ messageId, userId, emoji });
  } else {
    await this.reactionRepo.save(
      this.reactionRepo.create({ messageId, userId, emoji }),
    );
  }
}
```

Update `getHistory()` — add reaction join and update the `return` statement:

```ts
// 1. Add to the query builder (alongside existing leftJoinAndSelect calls):
.leftJoinAndSelect("m.reactions", "reactions")

// 2. Replace the final `return messages.reverse();` with:
const reversed = messages.reverse();
return reversed.map((msg) => ({
  ...msg,
  reactions: this.aggregateReactions(msg.reactions ?? [], userId),
})) as unknown as ChatMessage[];
// The cast is needed because the entity has `reactions: ChatReaction[]`
// but we return `reactions: ReactionCount[]`. TypeScript would otherwise error.
```

Add the private helper method to `ChatService`:

```ts
private aggregateReactions(
  reactions: ChatReaction[],
  requestingUserId: string,
): ReactionCount[] {
  const grouped = new Map<string, { count: number; reactedByMe: boolean }>();
  for (const r of reactions) {
    const existing = grouped.get(r.emoji) ?? { count: 0, reactedByMe: false };
    grouped.set(r.emoji, {
      count: existing.count + 1,
      reactedByMe: existing.reactedByMe || r.userId === requestingUserId,
    });
  }
  return Array.from(grouped.entries()).map(([emoji, { count, reactedByMe }]) => ({
    emoji,
    count,
    reactedByMe,
  }));
}
```

Note: `getHistory(userId, roomId, dto)` signature unchanged — `userId` (first param) is used for the reaction mapping.

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd api && npm run test -- --testPathPattern=chat.service.spec
```

Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add api/src/chat/chat.service.ts api/src/chat/chat.service.spec.ts
git commit -m "feat(chat): add getReactions, toggleReaction, enrich getHistory with reactions"
```

---

### Task 15: Backend — `add_reaction` / `remove_reaction` WS events

**Files:**

- Modify: `api/src/chat/chat.gateway.ts`

- [ ] **Step 1: Add two WS handlers**

In `api/src/chat/chat.gateway.ts`, after `handleTypingStop`:

```ts
@SubscribeMessage("add_reaction")
async handleAddReaction(
  @ConnectedSocket() client: Socket,
  @MessageBody() data: { messageId: string; roomId: string; emoji: string },
): Promise<void> {
  const user: User = client.data.user;
  if (
    !user ||
    !this.chatService.canAccessRoom(
      { role: user.role, ruolo: user.ruolo, baseId: user.base?.id },
      data.roomId,
    )
  ) {
    client.emit("error", { code: "FORBIDDEN", message: "Access denied" });
    return;
  }
  try {
    await this.chatService.toggleReaction(data.messageId, user.id, data.emoji);
    const reactions = await this.chatService.getReactions(data.messageId, user.id);
    this.server.to(data.roomId).emit("reaction_updated", {
      messageId: data.messageId,
      reactions,
    });
  } catch (err: any) {
    this.logger.error("add_reaction failed", err);
    client.emit("error", { code: "REACTION_FAILED", message: err.message });
  }
}

@SubscribeMessage("remove_reaction")
async handleRemoveReaction(
  @ConnectedSocket() client: Socket,
  @MessageBody() data: { messageId: string; roomId: string; emoji: string },
): Promise<void> {
  // Identical logic — toggleReaction handles both add and remove
  await this.handleAddReaction(client, data);
}
```

- [ ] **Step 2: Verify build**

```bash
cd api && npm run build 2>&1 | tail -5
```

Expected: no TypeScript errors

- [ ] **Step 3: Commit**

```bash
git add api/src/chat/chat.gateway.ts
git commit -m "feat(chat): add add_reaction/remove_reaction WS events"
```

---

### Task 16: Frontend — `ChatMessage` type update + `onReactionUpdated`

**Files:**

- Modify: `apps/mobile/src/api/chat.ts`

- [ ] **Step 1: Update `ChatMessage` interface**

In `apps/mobile/src/api/chat.ts`:

```ts
// ReactionCount already added in Task 11

export interface ChatMessage {
  id: string;
  roomId: string;
  sender: { id: string; nome: string; cognome: string };
  content: string | null;
  isPinned: boolean;
  deletedAt: string | null;
  createdAt: string;
  attachments: ChatAttachment[];
  reactions: ReactionCount[]; // new
  replyTo?: {
    // new (will be used in Task 19)
    id: string;
    content: string | null;
    sender: { nome: string; cognome: string };
  } | null;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/src/api/chat.ts
git commit -m "feat(chat): add reactions and replyTo fields to ChatMessage type"
```

---

### Task 17: Frontend — reaction pills UI + long-press ActionSheet

**Files:**

- Modify: `apps/mobile/src/screens/chat/ChatRoomScreen.tsx`
- Modify: `apps/mobile/src/i18n/it.json`
- Modify: `apps/mobile/src/i18n/en.json`

- [ ] **Step 1: Add i18n keys**

In `apps/mobile/src/i18n/it.json`, inside `"unionChat"`:

```json
"reactTitle": "Reagisci",
"deleteMessage": "Elimina messaggio",
"confirmDelete": "Sei sicuro?"
```

In `apps/mobile/src/i18n/en.json`, inside `"unionChat"`:

```json
"reactTitle": "React",
"deleteMessage": "Delete message",
"confirmDelete": "Are you sure?"
```

- [ ] **Step 2: Wire `onReactionUpdated` callback**

Add in `ChatRoomScreen`:

```ts
const onReactionUpdated = useCallback(
  ({
    messageId,
    reactions,
  }: {
    messageId: string;
    reactions: ReactionCount[];
  }) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, reactions } : m)),
    );
  },
  [],
);
```

Pass to `useChatSocket`:

```ts
const { ..., emitAddReaction, emitRemoveReaction } = useChatSocket({
  ...
  onReactionUpdated,
});
```

- [ ] **Step 3: Update `renderMessage` to add long-press ActionSheet and reaction pills**

Replace the `TouchableOpacity` wrapper in `renderMessage`:

```tsx
const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢"];

const handleLongPress = (item: ChatMessage) => {
  const options = [
    ...REACTION_EMOJIS,
    ...(isAdmin ? [t("unionChat.deleteMessage")] : []),
    t("common.cancel"),
  ];
  const cancelIndex = options.length - 1;
  const destructiveIndex = isAdmin ? REACTION_EMOJIS.length : undefined;

  if (Platform.OS === "ios") {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex: cancelIndex,
        destructiveButtonIndex: destructiveIndex,
      },
      (index) => {
        if (index < REACTION_EMOJIS.length) {
          const emoji = REACTION_EMOJIS[index];
          const alreadyReacted = item.reactions?.some(
            (r) => r.emoji === emoji && r.reactedByMe,
          );
          if (alreadyReacted) emitRemoveReaction(item.id, emoji);
          else emitAddReaction(item.id, emoji);
        } else if (isAdmin && index === REACTION_EMOJIS.length) {
          handleDeleteMessage(item.id);
        }
      },
    );
  } else {
    Alert.alert(t("unionChat.reactTitle"), undefined, [
      ...REACTION_EMOJIS.map((emoji) => ({
        text: emoji,
        onPress: () => {
          const alreadyReacted = item.reactions?.some(
            (r) => r.emoji === emoji && r.reactedByMe,
          );
          if (alreadyReacted) emitRemoveReaction(item.id, emoji);
          else emitAddReaction(item.id, emoji);
        },
      })),
      ...(isAdmin
        ? [
            {
              text: t("unionChat.deleteMessage"),
              style: "destructive" as const,
              onPress: () => handleDeleteMessage(item.id),
            },
          ]
        : []),
      { text: t("common.cancel"), style: "cancel" as const },
    ]);
  }
};
```

Update bubble `onLongPress`:

```tsx
<TouchableOpacity
  style={[styles.bubble, isOwn && styles.bubbleOwn]}
  onLongPress={() => handleLongPress(item)}
>
```

After the timestamp inside the bubble, add reaction pills:

```tsx
{
  item.reactions && item.reactions.length > 0 && (
    <View style={styles.reactionsRow}>
      {item.reactions.map((r) => (
        <TouchableOpacity
          key={r.emoji}
          style={[
            styles.reactionPill,
            r.reactedByMe && styles.reactionPillActive,
          ]}
          onPress={() => {
            if (r.reactedByMe) emitRemoveReaction(item.id, r.emoji);
            else emitAddReaction(item.id, r.emoji);
          }}
        >
          <Text style={styles.reactionPillEmoji}>{r.emoji}</Text>
          <Text style={styles.reactionPillCount}>{r.count}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
```

- [ ] **Step 4: Add reaction styles**

```ts
reactionsRow: {
  flexDirection: "row",
  flexWrap: "wrap",
  gap: 4,
  marginTop: 4,
},
reactionPill: {
  flexDirection: "row",
  alignItems: "center",
  gap: 2,
  backgroundColor: colors.surfaceVariant,
  borderRadius: 12,
  paddingHorizontal: 6,
  paddingVertical: 3,
  borderWidth: 1,
  borderColor: "transparent",
},
reactionPillActive: {
  borderColor: colors.primary,
  backgroundColor: colors.primaryLight,
},
reactionPillEmoji: { fontSize: 13 },
reactionPillCount: {
  fontSize: typography.sizes.xs,
  color: colors.textSecondary,
},
```

- [ ] **Step 5: Add `common.cancel` i18n key if missing**

Check `apps/mobile/src/i18n/it.json` for `"common": { "cancel": "Annulla" }`. If not present, add it. Same for `en.json` with `"Cancel"`.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/screens/chat/ChatRoomScreen.tsx \
        apps/mobile/src/i18n/it.json \
        apps/mobile/src/i18n/en.json
git commit -m "feat(chat): add emoji reactions with pills and long-press ActionSheet"
```

---

## FEATURE 4: Reply/Thread

---

### Task 18: Backend — migration + entity `replyToId`

**Files:**

- Create: `api/src/database/migrations/1780200000000-AddReplyToMessage.ts`
- Modify: `api/src/chat/entities/chat-message.entity.ts`

- [ ] **Step 1: Create migration**

```ts
// api/src/database/migrations/1780200000000-AddReplyToMessage.ts
import { MigrationInterface, QueryRunner } from "typeorm";

export class AddReplyToMessage1780200000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`
      ALTER TABLE "chat_messages"
      ADD COLUMN "replyToId" uuid REFERENCES "chat_messages"("id") ON DELETE SET NULL
    `);
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`
      ALTER TABLE "chat_messages" DROP COLUMN "replyToId"
    `);
  }
}
```

- [ ] **Step 2: Update entity**

In `api/src/chat/entities/chat-message.entity.ts`, add after the `reactions` relation:

```ts
@Column({ type: "uuid", nullable: true })
replyToId: string | null;

@ManyToOne(() => ChatMessage, { nullable: true, onDelete: "SET NULL", eager: false })
@JoinColumn({ name: "replyToId" })
replyTo: ChatMessage | null;
```

- [ ] **Step 3: Run migration**

```bash
cd api && npm run migration:run
```

Expected: `AddReplyToMessage1780200000000 has been executed successfully.`

- [ ] **Step 4: Commit**

```bash
git add api/src/database/migrations/1780200000000-AddReplyToMessage.ts \
        api/src/chat/entities/chat-message.entity.ts
git commit -m "feat(chat): add replyToId column to chat_messages"
```

---

### Task 19: Backend — `SendMessageDto`, `saveMessage` validation, `getHistory` join

**Files:**

- Modify: `api/src/chat/dto/send-message.dto.ts`
- Modify: `api/src/chat/chat.service.ts`
- Modify: `api/src/chat/chat.service.spec.ts`

- [ ] **Step 1: Update `SendMessageDto`**

In `api/src/chat/dto/send-message.dto.ts`, add:

```ts
@IsOptional()
@IsUUID("4")
replyToId?: string;
```

- [ ] **Step 2: Write failing test**

Add to `api/src/chat/chat.service.spec.ts`:

```ts
describe("ChatService.saveMessage replyToId validation", () => {
  it("throws BadRequestException when replyToId belongs to a different room", async () => {
    const mockReplyMsg = { id: "reply-1", roomId: "cabin_crew-generale" };
    const messageRepo = {
      create: jest.fn((x) => x),
      save: jest.fn(),
      findOne: jest.fn().mockResolvedValue(mockReplyMsg),
    };
    const module = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: getRepositoryToken(ChatMessage), useValue: messageRepo },
        { provide: getRepositoryToken(ChatAttachment), useValue: {} },
        { provide: getRepositoryToken(User), useValue: {} },
        { provide: getRepositoryToken(Base), useValue: {} },
        { provide: getRepositoryToken(ChatReadReceipt), useValue: {} },
        { provide: getRepositoryToken(ChatReaction), useValue: {} },
        { provide: NotificationsService, useValue: {} },
      ],
    }).compile();
    const svc = module.get(ChatService);
    const u = mockUser({ role: UserRole.SUPERADMIN, ruolo: null });
    await expect(
      svc.saveMessage(
        u as User,
        {
          roomId: "pilot-generale",
          content: "reply",
          replyToId: "reply-1",
        } as SendMessageDto,
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
```

- [ ] **Step 3: Run test to confirm it fails**

```bash
cd api && npm run test -- --testPathPattern=chat.service.spec
```

Expected: FAIL — test throws but saveMessage doesn't validate `replyToId` yet

- [ ] **Step 4: Update `saveMessage` to validate `replyToId`**

In `ChatService.saveMessage`, after the `canAccessRoom` check:

```ts
if (dto.replyToId) {
  const replyMsg = await this.messageRepo.findOne({
    where: { id: dto.replyToId },
  });
  if (!replyMsg || replyMsg.roomId !== dto.roomId) {
    throw new BadRequestException("Invalid replyToId");
  }
}

// In the create call, add replyToId:
const message = this.messageRepo.create({
  roomId: dto.roomId,
  senderId: user.id,
  content: dto.content ?? null,
  replyToId: dto.replyToId ?? null,
});
```

Update the final `findOne` in `saveMessage` to also load `replyTo`:

```ts
return this.messageRepo.findOne({
  where: { id: saved.id },
  relations: [
    "sender",
    "attachments",
    "reactions",
    "replyTo",
    "replyTo.sender",
  ],
}) as Promise<ChatMessage>;
```

- [ ] **Step 5: Update `getHistory` to join `replyTo`**

In `getHistory`, add to the query builder:

```ts
.leftJoinAndSelect("m.replyTo", "replyTo")
.leftJoinAndSelect("replyTo.sender", "replyToSender")
```

- [ ] **Step 6: Run tests to confirm they pass**

```bash
cd api && npm run test -- --testPathPattern=chat.service.spec
```

Expected: All tests PASS

- [ ] **Step 7: Commit**

```bash
git add api/src/chat/dto/send-message.dto.ts \
        api/src/chat/chat.service.ts \
        api/src/chat/chat.service.spec.ts
git commit -m "feat(chat): add replyToId to SendMessageDto, validate in saveMessage, join in getHistory"
```

---

### Task 20: Frontend — update `sendMessage` call + `chat.ts` API type

**Files:**

- Modify: `apps/mobile/src/api/chat.ts`
- Modify: `apps/mobile/src/screens/chat/ChatRoomScreen.tsx`

- [ ] **Step 1: `ChatMessage.replyTo` is already typed** (added in Task 16)

Verify `apps/mobile/src/api/chat.ts` has the `replyTo` field on `ChatMessage`. No changes needed if Task 16 was completed.

- [ ] **Step 2: Update `handleSend` in `ChatRoomScreen` to pass `replyToId`**

Add state near existing state declarations:

```ts
const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
```

Update `handleSend`:

```ts
const handleSend = () => {
  emitTypingStop();
  const text = inputText.trim();
  if (!text) return;
  if (!isConnected) {
    setPendingSend({
      content: text,
      attachmentIds: [],
      replyToId: replyingTo?.id,
    });
    setSendFailed(true);
    return;
  }
  const ok = sendMessage(text, [], replyingTo?.id);
  if (!ok) {
    setPendingSend({
      content: text,
      attachmentIds: [],
      replyToId: replyingTo?.id,
    });
    setSendFailed(true);
    return;
  }
  setInputText("");
  setReplyingTo(null);
  setPendingSend(null);
  setSendFailed(false);
};
```

Update `pendingSend` type:

```ts
const [pendingSend, setPendingSend] = useState<{
  content?: string;
  attachmentIds: string[];
  replyToId?: string;
} | null>(null);
```

Update `handleRetrySend`:

```ts
const ok = sendMessage(
  pendingSend.content,
  pendingSend.attachmentIds,
  pendingSend.replyToId,
);
```

Update the `useEffect` that auto-retries on reconnect:

```ts
const ok = sendMessage(
  pendingSend.content,
  pendingSend.attachmentIds,
  pendingSend.replyToId,
);
```

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/screens/chat/ChatRoomScreen.tsx
git commit -m "feat(chat): wire replyToId into handleSend and pendingSend"
```

---

### Task 21: Frontend — swipe-to-reply + reply preview bar

**Files:**

- Modify: `apps/mobile/src/screens/chat/ChatRoomScreen.tsx`
- Modify: `apps/mobile/src/i18n/it.json`
- Modify: `apps/mobile/src/i18n/en.json`

- [ ] **Step 1: Add i18n keys**

In `apps/mobile/src/i18n/it.json`, inside `"unionChat"`:

```json
"replyTo": "Risposta a {{name}}",
"cancelReply": "Annulla risposta"
```

In `apps/mobile/src/i18n/en.json`, inside `"unionChat"`:

```json
"replyTo": "Replying to {{name}}",
"cancelReply": "Cancel reply"
```

- [ ] **Step 2: Import `Swipeable` and create per-message refs**

Add to imports at the top of `ChatRoomScreen.tsx`:

```ts
import Swipeable from "react-native-gesture-handler/Swipeable";
```

Add a map of swipeable refs:

```ts
const swipeableRefs = useRef<Map<string, Swipeable | null>>(new Map());
```

- [ ] **Step 3: Wrap each message bubble in `Swipeable`**

Update `renderMessage` to wrap the row in a `Swipeable`:

```tsx
const renderMessage = ({ item }: { item: ChatMessage }) => {
  const isOwn = item.sender.id === user?.id;
  return (
    <Swipeable
      ref={(ref) => swipeableRefs.current.set(item.id, ref)}
      renderLeftActions={() => null}
      overshootLeft={false}
      friction={2}
      onSwipeableOpen={(direction) => {
        if (direction === "left") {
          setReplyingTo(item);
          swipeableRefs.current.get(item.id)?.close();
        }
      }}
    >
      <View style={[styles.messageRow, isOwn && styles.messageRowOwn]}>
        {/* ... existing message row content ... */}
      </View>
    </Swipeable>
  );
};
```

- [ ] **Step 4: Add reply preview bar above input bar**

In the JSX, between the typing banner and the `inputBar`:

```tsx
{
  replyingTo && (
    <View style={styles.replyPreviewBar}>
      <View style={styles.replyPreviewContent}>
        <Text style={styles.replyPreviewLabel}>
          {t("unionChat.replyTo", {
            name: `${replyingTo.sender.nome} ${replyingTo.sender.cognome}`,
          })}
        </Text>
        <Text style={styles.replyPreviewText} numberOfLines={1}>
          {replyingTo.content ?? "📎 allegato"}
        </Text>
      </View>
      <TouchableOpacity onPress={() => setReplyingTo(null)}>
        <Text style={styles.replyPreviewClose}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}
```

- [ ] **Step 5: Add reply preview styles**

```ts
replyPreviewBar: {
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: colors.surfaceVariant,
  borderLeftWidth: 3,
  borderLeftColor: colors.primary,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  gap: spacing.sm,
},
replyPreviewContent: { flex: 1 },
replyPreviewLabel: {
  color: colors.primary,
  fontSize: typography.sizes.xs,
  fontWeight: typography.weights.semibold,
},
replyPreviewText: {
  color: colors.textSecondary,
  fontSize: typography.sizes.xs,
  marginTop: 2,
},
replyPreviewClose: {
  color: colors.textTertiary,
  fontSize: 16,
  paddingHorizontal: 4,
},
```

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/screens/chat/ChatRoomScreen.tsx \
        apps/mobile/src/i18n/it.json \
        apps/mobile/src/i18n/en.json
git commit -m "feat(chat): add swipe-to-reply gesture and reply preview bar"
```

---

### Task 22: Frontend — quoted message bubble + scroll to original

**Files:**

- Modify: `apps/mobile/src/screens/chat/ChatRoomScreen.tsx`
- Modify: `apps/mobile/src/i18n/it.json`
- Modify: `apps/mobile/src/i18n/en.json`

- [ ] **Step 1: Add i18n key**

In `apps/mobile/src/i18n/it.json`, inside `"unionChat"`:

```json
"messageNotAvailable": "Messaggio non più disponibile"
```

In `apps/mobile/src/i18n/en.json`, inside `"unionChat"`:

```json
"messageNotAvailable": "Message no longer available"
```

- [ ] **Step 2: Add quoted block inside bubble**

In `renderMessage`, inside the bubble `TouchableOpacity`, at the very top (before `senderName`):

```tsx
{
  item.replyTo && (
    <TouchableOpacity
      style={[styles.quotedBlock, isOwn && styles.quotedBlockOwn]}
      onPress={() => {
        const visibleMessages = messages.filter((m) => !m.deletedAt);
        const index = visibleMessages.findIndex(
          (m) => m.id === item.replyTo!.id,
        );
        if (index === -1) {
          Alert.alert("", t("unionChat.messageNotAvailable"));
          return;
        }
        flatListRef.current?.scrollToIndex({
          index,
          animated: true,
          viewPosition: 0.5,
        });
      }}
    >
      <Text style={styles.quotedSender}>
        ↩ {item.replyTo.sender.nome} {item.replyTo.sender.cognome}
      </Text>
      <Text style={styles.quotedText} numberOfLines={1}>
        {item.replyTo.content
          ? item.replyTo.content.slice(0, 40)
          : "📎 allegato"}
      </Text>
    </TouchableOpacity>
  );
}
```

- [ ] **Step 3: Add quoted block styles**

```ts
quotedBlock: {
  backgroundColor: "rgba(0,0,0,0.07)",
  borderLeftWidth: 3,
  borderLeftColor: colors.primary,
  borderRadius: borderRadius.sm,
  padding: 6,
  marginBottom: 4,
},
quotedBlockOwn: {
  backgroundColor: "rgba(255,255,255,0.15)",
  borderLeftColor: "rgba(255,255,255,0.6)",
},
quotedSender: {
  color: colors.primary,
  fontSize: 10,
  fontWeight: typography.weights.semibold,
  marginBottom: 2,
},
quotedText: {
  color: colors.textSecondary,
  fontSize: typography.sizes.xs,
},
```

- [ ] **Step 4: Add `onScrollToIndexFailed` fallback to FlatList**

Some indices may not be rendered yet. Add to FlatList:

```ts
onScrollToIndexFailed={(info) => {
  setTimeout(() => {
    flatListRef.current?.scrollToIndex({
      index: info.index,
      animated: true,
      viewPosition: 0.5,
    });
  }, 200);
}}
```

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/screens/chat/ChatRoomScreen.tsx \
        apps/mobile/src/i18n/it.json \
        apps/mobile/src/i18n/en.json
git commit -m "feat(chat): add quoted message bubble with scroll-to-original"
```

---

## Final Verification

- [ ] **Start backend and run all chat tests**

```bash
cd api && npm run test -- --testPathPattern=chat
```

Expected: All tests pass

- [ ] **Start backend**

```bash
cd api && npm run start:dev
```

Expected: No errors, `CreateChatReadReceipts`, `CreateChatReactions`, `AddReplyToMessage` migrations listed as executed.

- [ ] **Start frontend**

```bash
cd apps/mobile && npx expo start --clear
```

Expected: No TypeScript errors, app loads, chat rooms visible with unread counts.

- [ ] **Manual smoke test checklist**

1. Open ChatRooms → see unread badge on rooms with unread messages
2. Open a room → unread badge clears, date separators visible, scroll FAB appears when scrolled up
3. Type in input → other user session shows typing indicator
4. Send message with emoji long-press → reaction pill appears on both sides
5. Swipe-right on a message → reply preview bar appears, send → quoted block visible in sent message
6. Tap quoted block → scrolls to original message

- [ ] **Final commit (if any uncommitted changes)**

```bash
git status
# commit any remaining changes
```
