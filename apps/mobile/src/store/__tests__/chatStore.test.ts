jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => undefined),
  removeItem: jest.fn(async () => undefined),
}));

import { useChatStore } from "../chatStore";
import type { ChatMessage } from "../../api/chat";

const msg = (id: string, createdAt: string): ChatMessage => ({
  id,
  roomId: "pilot-generale",
  sender: { id: "u1", nome: "Mario", cognome: "Rossi" },
  content: `m-${id}`,
  isPinned: false,
  deletedAt: null,
  createdAt,
  attachments: [],
});

beforeEach(() => {
  useChatStore.setState({ messagesByRoom: {}, outboxByRoom: {} });
});

describe("chatStore messages", () => {
  it("merges, dedupes by id and sorts ascending by createdAt", () => {
    const { mergeRoomMessages } = useChatStore.getState();
    mergeRoomMessages("r", [
      msg("b", "2026-01-02T00:00:00Z"),
      msg("a", "2026-01-01T00:00:00Z"),
    ]);
    mergeRoomMessages("r", [
      msg("a", "2026-01-01T00:00:00Z"), // duplicate
      msg("c", "2026-01-03T00:00:00Z"),
    ]);
    const ids = useChatStore.getState().messagesByRoom["r"].map((m) => m.id);
    expect(ids).toEqual(["a", "b", "c"]);
  });

  it("removeRoomMessage drops the matching id", () => {
    const s = useChatStore.getState();
    s.setRoomMessages("r", [msg("a", "2026-01-01T00:00:00Z"), msg("b", "x")]);
    s.removeRoomMessage("r", "a");
    expect(
      useChatStore.getState().messagesByRoom["r"].map((m) => m.id),
    ).toEqual(["b"]);
  });

  it("updateRoomMessage patches in place", () => {
    const s = useChatStore.getState();
    s.setRoomMessages("r", [msg("a", "2026-01-01T00:00:00Z")]);
    s.updateRoomMessage("r", "a", { isPinned: true });
    expect(useChatStore.getState().messagesByRoom["r"][0].isPinned).toBe(true);
  });
});

describe("chatStore outbox", () => {
  const outgoing = {
    clientMsgId: "c1",
    roomId: "r",
    content: "hi",
    attachmentIds: [] as string[],
    createdAt: "2026-01-01T00:00:00Z",
    status: "sending" as const,
    sender: { id: "u1", nome: "Mario", cognome: "Rossi" },
  };

  it("enqueues once and ignores duplicate clientMsgId", () => {
    const s = useChatStore.getState();
    s.enqueueOutbox(outgoing);
    s.enqueueOutbox(outgoing);
    expect(useChatStore.getState().outboxByRoom["r"]).toHaveLength(1);
  });

  it("setOutboxStatus then resolveOutbox removes the entry", () => {
    const s = useChatStore.getState();
    s.enqueueOutbox(outgoing);
    s.setOutboxStatus("r", "c1", "failed");
    expect(useChatStore.getState().outboxByRoom["r"][0].status).toBe("failed");
    s.resolveOutbox("r", "c1");
    expect(useChatStore.getState().outboxByRoom["r"]).toHaveLength(0);
  });
});
