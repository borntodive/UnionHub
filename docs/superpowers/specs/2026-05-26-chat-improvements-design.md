# Chat Improvements Design

**Date:** 2026-05-26  
**Scope:** UnionHub mobile chat — 4 feature groups in a single sprint  
**Approach:** Sequential implementation (A), one spec, one PR  
**Use case:** Active peer-to-peer discussion between union members

---

## Overview

Four independent but coordinated improvements to the existing WebSocket-based chat system (`api/src/chat/`, `apps/mobile/src/screens/chat/`). Implementation order follows DB dependency: UX polish (no DB) → typing indicator (no DB) → reactions (new table) → reply/thread (new column).

---

## Feature 1: UX Polish

### Date Separators

Transform `messages[]` in `ChatRoomScreen` into a mixed array before rendering:

```ts
type ListItem = ChatMessage | { type: "separator"; date: string; key: string };
```

Group messages by calendar day. Insert a separator item between groups with label "Oggi", "Ieri", or `DD/MM/YYYY`. `renderItem` handles both types. No API changes.

### Scroll-to-Bottom Button

- Track scroll position via `FlatList.onScroll` → `isAtBottom` ref (threshold: bottom offset < 100px).
- When `isAtBottom === false` and a new message arrives via `onNewMessage`, increment `newMessageCount` state instead of auto-scrolling.
- Render a FAB `↓` (absolute positioned, bottom-right above input bar) with a badge showing `newMessageCount` when > 0.
- Tap → `flatListRef.current.scrollToEnd({ animated: true })` + reset `newMessageCount = 0`.
- When user is at bottom, auto-scroll as before and keep count at 0.

### Unread Badge on Drawer

**Backend changes:**

- Add `lastReadAt` nullable timestamp column to a new `chat_read_receipts` table: `(userId, roomId, lastReadAt)` — unique on `(userId, roomId)`.
- `GET /chat/rooms` response enriched: each room object gets `unreadCount: number` (COUNT of messages with `createdAt > lastReadAt` for the requesting user) and `lastMessagePreview: string | null`.
- New endpoint: `POST /chat/rooms/:roomId/read` — upserts `lastReadAt = NOW()` for the requesting user. Called when `ChatRoomScreen` mounts.

**Frontend changes:**

- `chatApi.getRooms()` response type updated to include `unreadCount`.
- `ChatRoomsScreen` renders a green badge pill `unreadCount` on each room row when > 0.
- `DrawerNavigator` chat item shows total unread sum: reads `QUERY_KEYS.chatRooms` from TanStack Query cache via `useQuery` (same key, stale data tolerated — refetch happens when `ChatRoomsScreen` mounts).
- On `ChatRoomScreen` mount: call `POST /chat/rooms/:roomId/read`, invalidate `QUERY_KEYS.chatRooms`.

> **Note:** `CHAT_FOR_ALL_USERS` is currently `false` — push notifications for new messages only reach admins. The unread badge is accurate when the user opens ChatRoomsScreen (fresh fetch) but does not update in real-time in the background for regular members. This is acceptable for now; enabling `CHAT_FOR_ALL_USERS` in a future step will make it real-time.

---

## Feature 2: Typing Indicator + Online Presence

### Typing Indicator

**Backend** (`chat.gateway.ts`) — no DB:

```ts
@SubscribeMessage("typing_start")
handleTypingStart(client: Socket, { roomId }: { roomId: string }): void {
  const user: User = client.data.user;
  if (!user || !this.chatService.canAccessRoom(...)) return;
  client.to(roomId).emit("user_typing", { userId: user.id, nome: user.nome, cognome: user.cognome });
}

@SubscribeMessage("typing_stop")
handleTypingStop(client: Socket, { roomId }: { roomId: string }): void {
  const user: User = client.data.user;
  if (!user) return;
  client.to(roomId).emit("user_stopped_typing", { userId: user.id });
}
```

**Frontend** (`useChatSocket.ts`):

- Expose `emitTypingStart(roomId)` and `emitTypingStop(roomId)`.
- Add `onUserTyping` and `onUserStoppedTyping` callbacks.
- `typingUsers` state: `{ userId: string; nome: string; cognome: string }[]`.
- Auto-clear: each `user_typing` event resets a 3-second timeout per userId; on expiry remove from `typingUsers`.

**Frontend** (`ChatRoomScreen`):

- `TextInput.onChangeText`: debounced (500ms leading) → emit `typing_start`. On send or blur → emit `typing_stop`.
- Render above input bar when `typingUsers.length > 0`: `"Mario R. sta scrivendo…"` or `"Mario R., Luca B. stanno scrivendo…"` or `"Mario R. e altri stanno scrivendo…"` (max 2 names).

### Online Presence in ChatRoomsScreen

**Backend** (`chat.gateway.ts`): expose `async getOnlineCount(roomId: string): Promise<number>` — calls `this.server.in(roomId).fetchSockets()`.

**Backend** (`chat.controller.ts`): `GET /chat/rooms` injects `ChatGateway` and adds `onlineCount` to each room object.

**Frontend** (`ChatRoomsScreen`): show green dot + `"N online"` label on each room row when `onlineCount > 0`.

---

## Feature 3: Reactions

### Database

New migration — table `chat_reactions`:

| Column      | Type       | Notes                                |
| ----------- | ---------- | ------------------------------------ |
| `id`        | uuid PK    |                                      |
| `messageId` | uuid FK    | → `chat_messages(id)` CASCADE DELETE |
| `userId`    | uuid FK    | → `users(id)` CASCADE DELETE         |
| `emoji`     | varchar(8) |                                      |
| `createdAt` | timestamp  |                                      |

Unique constraint on `(messageId, userId, emoji)`.

Add `@OneToMany(() => ChatReaction, r => r.message)` on `ChatMessage` entity.

### Backend

New WS events in `chat.gateway.ts`:

- `add_reaction { messageId, roomId, emoji }` → verify room access → upsert `chat_reactions` → emit `reaction_updated` to room.
- `remove_reaction { messageId, roomId, emoji }` → delete matching row → emit `reaction_updated` to room.

`reaction_updated` payload: `{ messageId, reactions: ReactionCount[] }` where:

```ts
interface ReactionCount {
  emoji: string;
  count: number;
  reactedByMe: boolean;
}
```

Aggregated in `ChatService.getReactions(messageId, requestingUserId)`: `GROUP BY emoji` + left join on requesting userId for `reactedByMe`.

`getHistory()` adds `leftJoinAndSelect("m.reactions", "reactions")` and maps to `ReactionCount[]` per message (passing `userId` of the requesting user).

Allowed emojis (validated server-side): `["👍","❤️","😂","😮","😢"]`.

### Frontend

`ChatRoomScreen`:

- Long-press on bubble → ActionSheet shows 5 emoji options + "Elimina" (admin only, as existing). Selecting emoji → `socket.emit("add_reaction", ...)` if not already reacted, else `remove_reaction`.
- Below each bubble: horizontal row of pills `[emoji count]`. Pills where `reactedByMe === true` get `borderColor: colors.primary`, `backgroundColor: colors.primaryLight`. Tap on pill → toggle.
- `useChatSocket` adds `onReactionUpdated` callback → updates `messages[]` in-place by `messageId`.
- `ChatMessage` type updated: `reactions?: ReactionCount[]`.

---

## Feature 4: Reply/Thread

### Database

Migration: add nullable column `replyToId uuid REFERENCES chat_messages(id) ON DELETE SET NULL` to `chat_messages`.

Entity:

```ts
@ManyToOne(() => ChatMessage, { nullable: true, onDelete: "SET NULL", eager: false })
@JoinColumn({ name: "replyToId" })
replyTo?: ChatMessage | null;

@Column({ nullable: true })
replyToId?: string | null;
```

### Backend

`getHistory()` adds:

```ts
.leftJoinAndSelect("m.replyTo", "replyTo")
.leftJoinAndSelect("replyTo.sender", "replyToSender")
```

`SendMessageDto` adds `replyToId?: string` (optional, validated as UUID).

`saveMessage()`: if `replyToId` present, verify that message exists in the same `roomId` before saving. Throws `BadRequestException` if not found or wrong room.

`ChatMessage` response includes:

```ts
replyTo?: {
  id: string;
  content: string | null;
  sender: { nome: string; cognome: string };
} | null;
```

### Frontend

**Swipe-to-reply gesture** (`ChatRoomScreen`):

- Use `Swipeable` from `react-native-gesture-handler` (already installed). Each message row wrapped in `Swipeable` with `renderRightActions` returning null and `onSwipeableOpen("left")` → set `replyingTo: ChatMessage` state + haptic feedback + immediately call `swipeableRef.current.close()`.
- Haptic feedback: `expo-haptics` must be added (`npx expo install expo-haptics`). Call `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)`. Import guarded in try/catch to avoid crash if unavailable.
- No left-action rendered (avoids conflict with FlatList horizontal scroll). `overshootLeft={false}`.

**Reply preview bar** (above input bar, visible when `replyingTo != null`):

- Fixed-height bar: `↩ Nome — preview (40 chars)…` + `✕` button to clear.
- `KAV keyboardVerticalOffset` remains unchanged (bar is inside the same View hierarchy, not above KAV).

**Quoted message in bubble** (when `item.replyTo` present):

- Block at top of bubble: `backgroundColor: rgba(0,0,0,0.07)`, left border `3px solid colors.primary`, padding `6px`.
- `"↩ Nome: testo…"` — single line, truncated at 40 chars.
- Tap on quote block → find `replyTo.id` index in `messages[]` → `flatListRef.current.scrollToIndex({ index, animated: true })`. If index not in loaded history (pagination gap), show toast "Messaggio non più disponibile".

**`sendMessage()` updated**: accepts optional `replyToId?: string`. `handleSend` passes `replyingTo?.id`, then clears `replyingTo` state on success.

---

## Implementation Order

1. **UX Polish** — no DB, no WS. Frontend only (except `lastReadAt` endpoint). Deployable standalone.
2. **Typing indicator** — WS events only, no DB. Add to gateway + useChatSocket + ChatRoomScreen.
3. **Reactions** — migration + WS events + frontend. Requires `ChatMessage` type update.
4. **Reply/thread** — migration + DTO + getHistory join + swipe UI. Most complex, last.

## Files Touched

| File                                               | Features                                        |
| -------------------------------------------------- | ----------------------------------------------- |
| `api/src/chat/chat.gateway.ts`                     | 2, 3, 4                                         |
| `api/src/chat/chat.service.ts`                     | 1 (unread), 3, 4                                |
| `api/src/chat/chat.controller.ts`                  | 1 (unread), 2 (onlineCount)                     |
| `api/src/chat/entities/chat-message.entity.ts`     | 3, 4                                            |
| `api/src/database/migrations/`                     | 1 (read_receipts), 3 (reactions), 4 (replyToId) |
| `apps/mobile/src/hooks/useChatSocket.ts`           | 2, 3, 4                                         |
| `apps/mobile/src/screens/chat/ChatRoomScreen.tsx`  | 1, 2, 3, 4                                      |
| `apps/mobile/src/screens/chat/ChatRoomsScreen.tsx` | 1 (badge), 2 (presence)                         |
| `apps/mobile/src/navigation/DrawerNavigator.tsx`   | 1 (total badge)                                 |
| `apps/mobile/src/api/chat.ts`                      | 1, 3, 4                                         |
| `apps/mobile/src/i18n/it.json` + `en.json`         | 1, 2, 3, 4                                      |

## New Dependencies

| Package        | Command                         | Why                               |
| -------------- | ------------------------------- | --------------------------------- |
| `expo-haptics` | `npx expo install expo-haptics` | Haptic feedback on swipe-to-reply |
