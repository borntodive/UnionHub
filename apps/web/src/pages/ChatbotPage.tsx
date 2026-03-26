import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Send,
  Trash2,
  Bot,
  User as UserIcon,
  BookOpen,
  Plus,
  MessageSquare,
} from "lucide-react";
import { chatbotApi, chatStream } from "../api/chatbot";

/* ─── env ────────────────────────────────────────────────────── */
const API_BASE_URL: string =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  "http://localhost:3000/api/v1";

/* ─── conversation index in localStorage ────────────────────── */
interface ConvMeta {
  id: string;
  title: string; // first user message (truncated to 60 chars)
  updatedAt: string;
}

const STORAGE_KEY = "uh_conversations";

function loadConversations(): ConvMeta[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveConversations(list: ConvMeta[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function upsertConversation(id: string, title: string) {
  const list = loadConversations();
  const idx = list.findIndex((c) => c.id === id);
  const entry: ConvMeta = {
    id,
    title: title.slice(0, 60),
    updatedAt: new Date().toISOString(),
  };
  if (idx >= 0) {
    list[idx] = entry;
  } else {
    list.unshift(entry);
  }
  saveConversations(list);
}

function deleteConversation(id: string) {
  saveConversations(loadConversations().filter((c) => c.id !== id));
}

/* ─── local message type ─────────────────────────────────────── */
interface LocalMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Array<{ title: string; accessLevel: string }>;
  streaming?: boolean;
}

/* ─── message bubble ─────────────────────────────────────────── */
function MessageBubble({ msg }: { msg: LocalMessage }) {
  const isUser = msg.role === "user";
  const [showSources, setShowSources] = useState(false);

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs mt-0.5 ${
          isUser ? "bg-[#177246] text-white" : "bg-gray-100 text-gray-500"
        }`}
      >
        {isUser ? <UserIcon size={13} /> : <Bot size={13} />}
      </div>
      <div
        className={`max-w-[80%] flex flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}
      >
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
            isUser
              ? "bg-[#177246] text-white rounded-tr-sm"
              : "bg-white border border-gray-200 text-gray-800 shadow-sm rounded-tl-sm"
          }`}
        >
          {msg.content || (msg.streaming ? "" : "…")}
          {msg.streaming && (
            <span className="inline-flex gap-0.5 ml-1.5 align-middle">
              {[0, 0.15, 0.3].map((d) => (
                <span
                  key={d}
                  className="w-1 h-1 bg-current rounded-full animate-bounce"
                  style={{ animationDelay: `${d}s`, animationDuration: "0.8s" }}
                />
              ))}
            </span>
          )}
        </div>
        {msg.sources && msg.sources.length > 0 && (
          <button
            onClick={() => setShowSources(!showSources)}
            className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600 transition-colors"
          >
            <BookOpen size={11} />
            {msg.sources.length} fonte{msg.sources.length > 1 ? "i" : ""}
          </button>
        )}
        {showSources && msg.sources && (
          <div className="flex flex-wrap gap-1.5 max-w-full">
            {msg.sources.map((s, i) => (
              <span
                key={i}
                className="text-[11px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full"
              >
                {s.title}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── main page ──────────────────────────────────────────────── */
export function ChatbotPage() {
  const [conversations, setConversations] =
    useState<ConvMeta[]>(loadConversations);
  const [activeId, setActiveId] = useState<string>(() => {
    const existing = loadConversations();
    return existing[0]?.id ?? crypto.randomUUID();
  });
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<(() => void) | null>(null);
  const queryClient = useQueryClient();

  // scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // load history when switching conversation
  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ["chatHistory", activeId],
    queryFn: () => chatbotApi.getHistory(activeId),
    staleTime: Infinity,
  });

  useEffect(() => {
    setMessages(
      (history ?? []).map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
      })),
    );
    setError(null);
  }, [activeId, history]);

  /* ── new conversation ── */
  const startNew = useCallback(() => {
    if (isStreaming) {
      abortRef.current?.();
    }
    const id = crypto.randomUUID();
    setActiveId(id);
    setMessages([]);
    setInput("");
    setError(null);
    setConversations(loadConversations());
  }, [isStreaming]);

  /* ── switch conversation ── */
  const switchTo = (id: string) => {
    if (id === activeId || isStreaming) return;
    abortRef.current?.();
    setActiveId(id);
    setInput("");
    setError(null);
  };

  /* ── delete conversation ── */
  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await chatbotApi.clearHistory(id).catch(() => {});
    deleteConversation(id);
    queryClient.removeQueries({ queryKey: ["chatHistory", id] });
    const remaining = loadConversations();
    setConversations(remaining);
    if (activeId === id) {
      const next = remaining[0];
      if (next) {
        setActiveId(next.id);
      } else {
        setActiveId(crypto.randomUUID());
        setMessages([]);
      }
    }
  };

  /* ── send message ── */
  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    setInput("");
    setError(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    const userMsgId = crypto.randomUUID();
    const asstMsgId = crypto.randomUUID();

    setMessages((prev) => [
      ...prev,
      { id: userMsgId, role: "user", content: text },
      { id: asstMsgId, role: "assistant", content: "", streaming: true },
    ]);
    setStreaming(true);

    // register conversation if first message
    upsertConversation(activeId, text);
    setConversations(loadConversations());

    abortRef.current = chatStream(
      text,
      activeId,
      API_BASE_URL,
      (token) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === asstMsgId ? { ...m, content: m.content + token } : m,
          ),
        );
      },
      (sources, newId) => {
        if (newId !== activeId) {
          upsertConversation(newId, text);
          setActiveId(newId);
        }
        setMessages((prev) =>
          prev.map((m) =>
            m.id === asstMsgId ? { ...m, streaming: false, sources } : m,
          ),
        );
        setStreaming(false);
        setConversations(loadConversations());
        queryClient.invalidateQueries({ queryKey: ["chatHistory"] });
      },
      (errMsg) => {
        setError(errMsg);
        setMessages((prev) => prev.filter((m) => m.id !== asstMsgId));
        setStreaming(false);
      },
    );
  }, [input, isStreaming, activeId, queryClient]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
  };

  const activeTitle = conversations.find((c) => c.id === activeId)?.title;

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── left sidebar: conversation list ── */}
      <aside className="w-56 flex-shrink-0 bg-gray-50 border-r border-gray-200 flex flex-col overflow-hidden">
        <div className="p-3 flex-shrink-0">
          <button
            onClick={startNew}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium bg-[#177246] text-white rounded-xl hover:bg-[#177246]/90 transition-colors"
          >
            <Plus size={15} /> Nuova chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-0.5">
          {conversations.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">
              Nessuna conversazione
            </p>
          ) : (
            conversations.map((c) => {
              const isActive = c.id === activeId;
              return (
                <div
                  key={c.id}
                  onClick={() => switchTo(c.id)}
                  className={`group flex items-start gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                    isActive
                      ? "bg-[#177246]/10 text-[#177246]"
                      : "hover:bg-gray-100 text-gray-700"
                  }`}
                >
                  <MessageSquare
                    size={13}
                    className="mt-0.5 flex-shrink-0 opacity-60"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate leading-snug">
                      {c.title || "Nuova chat"}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {new Date(c.updatedAt).toLocaleDateString("it-IT", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDelete(c.id, e)}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all flex-shrink-0 mt-0.5"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* ── main chat area ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* top bar */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-200 bg-white flex-shrink-0">
          <div className="w-8 h-8 rounded-xl bg-[#177246] text-white flex items-center justify-center flex-shrink-0">
            <Bot size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-sm truncate">
              {activeTitle ?? "Nuova conversazione"}
            </p>
            <p className="text-[11px] text-gray-400">
              Assistente UnionHub · RAG sulla knowledge base
            </p>
          </div>
        </div>

        {/* messages */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4 bg-gray-50/50">
          {historyLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-4 border-[#177246] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 py-16">
              <Bot size={44} className="mb-4 opacity-20" />
              <p className="text-sm font-medium">Come posso aiutarti?</p>
              <p className="text-xs mt-1 opacity-60">
                Fai una domanda sulla knowledge base del sindacato.
              </p>
            </div>
          ) : (
            messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)
          )}
          {error && (
            <div className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              ⚠️ {error}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* input */}
        <div className="px-5 py-4 border-t border-gray-200 bg-white flex-shrink-0">
          <div
            className="flex items-end gap-3 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3
            focus-within:ring-2 focus-within:ring-[#177246]/25 focus-within:border-[#177246] transition-all"
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              disabled={isStreaming}
              rows={1}
              placeholder="Scrivi un messaggio… (Invio per inviare, Shift+Invio per andare a capo)"
              className="flex-1 bg-transparent resize-none text-sm text-gray-800 placeholder-gray-400 focus:outline-none disabled:opacity-50 leading-relaxed"
              style={{ minHeight: 22, maxHeight: 120 }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isStreaming}
              className="w-8 h-8 rounded-xl bg-[#177246] text-white flex items-center justify-center hover:bg-[#177246]/90 transition-colors disabled:opacity-35 disabled:cursor-not-allowed flex-shrink-0"
            >
              {isStreaming ? (
                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Send size={14} />
              )}
            </button>
          </div>
          <p className="text-[11px] text-gray-400 mt-2 text-center">
            Le risposte si basano sulla knowledge base. Verifica sempre le
            informazioni critiche.
          </p>
        </div>
      </div>
    </div>
  );
}
