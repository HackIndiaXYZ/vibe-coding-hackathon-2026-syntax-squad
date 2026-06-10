import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, useRef, useEffect, useMemo } from "react";
import { Send, Bot, User as UserIcon, Loader2, Sparkles, Plus, MessageSquare, Trash2, History, Square, BookMarked, Library } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ReactMarkdown from "@/lib/markdown";
import { toast } from "sonner";
import { PYQDialog } from "@/components/PYQDialog";
import { Link } from "@tanstack/react-router";
import { askAssistant } from "@/lib/ai.functions";

export const Route = createFileRoute("/_authenticated/assistant")({
  head: () => ({ meta: [{ title: "AI Assistant — StudySync AI" }] }),
  component: Assistant,
});

type Msg = { role: "user" | "assistant"; content: string };
type Session = { id: string; title: string; updatedAt: number; messages: Msg[] };

const STORAGE_KEY = "studysync_assistant_sessions_v1";
const ACTIVE_KEY = "studysync_assistant_active_v1";

const WELCOME: Msg = {
  role: "assistant",
  content:
    "Hi! I'm StudySync AI — ask me anything across any subject or level. I can help with coding, study plans, explanations, PYQs, and revision.",
};

const SUGGESTIONS = [
  "Explain quantum entanglement simply",
  "Help me plan for JEE/NEET prep",
  "Write a Python script to scrape headlines",
  "Build me a 1-week revision plan",
];

function loadSessions(): Session[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Session[]) : [];
  } catch {
    return [];
  }
}

function newSession(): Session {
  return { id: crypto.randomUUID(), title: "New chat", updatedAt: Date.now(), messages: [WELCOME] };
}

/** Build compact cross-chat memory from ALL sessions (most recent first). */
function buildMemory(sessions: Session[], activeId: string): string {
  const others = sessions
    .filter((s) => s.id !== activeId)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 5);
  const lines: string[] = [];
  for (const s of others) {
    const pairs: string[] = [];
    const msgs = s.messages.filter((m) => m.content && m.content !== WELCOME.content);
    for (let i = 0; i < msgs.length && pairs.length < 2; i++) {
      const m = msgs[i];
      if (m.role === "user") {
        const next = msgs[i + 1];
        const q = m.content.replace(/\s+/g, " ").slice(0, 160);
        const a = next?.role === "assistant" ? next.content.replace(/\s+/g, " ").slice(0, 220) : "";
        pairs.push(a ? `Q: ${q}\nA: ${a}` : `Q: ${q}`);
      }
    }
    if (pairs.length) lines.push(`• Chat "${s.title}":\n${pairs.join("\n")}`);
  }
  return lines.join("\n\n");
}

function Assistant() {
  const [sessions, setSessions] = useState<Session[]>(() => {
    const s = loadSessions();
    return s.length ? s : [newSession()];
  });
  const [activeId, setActiveId] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem(ACTIVE_KEY) || "";
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestIdRef = useRef(0);
  const [pyqOpen, setPyqOpen] = useState(false);
  const [pyqMode, setPyqMode] = useState<"pyq" | "sample">("pyq");
  const callAssistant = useServerFn(askAssistant);


  const active = useMemo(
    () => sessions.find((s) => s.id === activeId) ?? sessions[0],
    [sessions, activeId],
  );

  useEffect(() => {
    if (!activeId && sessions[0]) setActiveId(sessions[0].id);
  }, [activeId, sessions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    if (active?.id) localStorage.setItem(ACTIVE_KEY, active.id);
  }, [active?.id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [active?.messages, loading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [active?.id, loading]);

  const updateActive = (updater: (s: Session) => Session) => {
    setSessions((prev) => prev.map((s) => (s.id === active.id ? updater(s) : s)));
  };

  const createNew = () => {
    const s = newSession();
    setSessions((prev) => [s, ...prev]);
    setActiveId(s.id);
    setShowHistory(false);
  };

  const removeSession = (id: string) => {
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== id);
      if (next.length === 0) {
        const s = newSession();
        setActiveId(s.id);
        return [s];
      }
      if (id === activeId) setActiveId(next[0].id);
      return next;
    });
  };

  const stop = () => {
    requestIdRef.current += 1;
    setLoading(false);
  };

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || loading || !active) return;
    const nextMsgs: Msg[] = [...active.messages, { role: "user", content }];
    const titleFromFirst =
      active.messages.filter((m) => m.role === "user").length === 0
        ? content.slice(0, 40)
        : active.title;
    // Append user msg + empty assistant placeholder we'll stream into.
    updateActive((s) => ({
      ...s,
      messages: [...nextMsgs, { role: "assistant", content: "" }],
      updatedAt: Date.now(),
      title: titleFromFirst,
    }));
    setInput("");
    setLoading(true);

    const memory = buildMemory(sessions, active.id);
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    try {
      const response = await callAssistant({
        data: {
          messages: [
            ...(memory
              ? [
                  {
                    role: "system" as const,
                    content: `Long-term memory from prior chats:\n${memory}`,
                  },
                ]
              : []),
            ...nextMsgs.map((m) => ({ role: m.role, content: m.content })),
          ],
        },
      });
      if (requestIdRef.current !== requestId) return;
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== active.id) return s;
          const msgs = [...s.messages];
          msgs[msgs.length - 1] = { role: "assistant", content: response.reply || "(no response)" };
          return { ...s, messages: msgs, updatedAt: Date.now() };
        }),
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed";
      if (requestIdRef.current === requestId) {
        toast.error(msg);
      }
      // Remove the empty assistant placeholder on error
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== active.id) return s;
          const msgs = [...s.messages];
          const last = msgs[msgs.length - 1];
          if (last?.role === "assistant" && !last.content) msgs.pop();
          return { ...s, messages: msgs };
        }),
      );
    } finally {
      if (requestIdRef.current === requestId) {
        setLoading(false);
      }
    }
  };

  if (!active) return null;

  const sortedSessions = [...sessions].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-6xl gap-4">
      {/* History sidebar */}
      <aside
        className={`${showHistory ? "flex" : "hidden"} md:flex w-64 shrink-0 flex-col rounded-2xl border bg-card p-3 shadow-card`}
      >
        <Button onClick={createNew} className="mb-3 w-full bg-gradient-primary shadow-glow" size="sm">
          <Plus className="mr-2 h-4 w-4" /> New chat
        </Button>
        <div className="flex-1 space-y-1 overflow-y-auto">
          {sortedSessions.map((s) => (
            <div
              key={s.id}
              className={`group flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm ${
                s.id === active.id ? "bg-accent" : "hover:bg-accent/50"
              }`}
            >
              <button
                onClick={() => {
                  setActiveId(s.id);
                  setShowHistory(false);
                }}
                className="flex flex-1 items-center gap-2 truncate text-left"
              >
                <MessageSquare className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate">{s.title || "New chat"}</span>
              </button>
              <button
                onClick={() => removeSession(s.id)}
                className="opacity-0 transition-opacity group-hover:opacity-100"
                aria-label="Delete"
              >
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
              </button>
            </div>
          ))}
        </div>
      </aside>

      {/* Main chat */}
      <div className="flex flex-1 flex-col">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight md:text-3xl">
              <Sparkles className="h-6 w-6 text-primary md:h-7 md:w-7" /> AI Assistant
            </h1>
            <p className="text-xs text-muted-foreground md:text-sm">
              Remembers prior chats • coding help • study plans • PYQs
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setPyqMode("pyq"); setPyqOpen(true); }}
            >
              <BookMarked className="mr-1 h-4 w-4" /> PYQ
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setPyqMode("sample"); setPyqOpen(true); }}
            >
              <Sparkles className="mr-1 h-4 w-4" /> Sample Qs
            </Button>
            <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
              <Link to="/question-bank"><Library className="mr-1 h-4 w-4" /> Bank</Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="md:hidden"
              onClick={() => setShowHistory((v) => !v)}
            >
              <History className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={createNew} className="hidden md:inline-flex">
              <Plus className="mr-1 h-4 w-4" /> New
            </Button>
          </div>
        </div>


        <div className="flex-1 overflow-y-auto rounded-2xl border bg-card p-4 shadow-card">
          <div className="space-y-4">
            {active.messages.map((m, i) => {
              const isStreamingLast =
                loading && i === active.messages.length - 1 && m.role === "assistant";
              return (
                <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      m.role === "user" ? "bg-secondary" : "bg-gradient-primary shadow-glow"
                    }`}
                  >
                    {m.role === "user" ? (
                      <UserIcon className="h-4 w-4" />
                    ) : (
                      <Bot className="h-4 w-4 text-primary-foreground" />
                    )}
                  </div>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                      m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                    }`}
                  >
                    {m.role === "assistant" ? (
                      m.content ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown>{m.content}</ReactMarkdown>
                          {isStreamingLast && (
                            <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-primary align-middle" />
                          )}
                        </div>
                      ) : (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )
                    ) : (
                      <p className="whitespace-pre-wrap text-sm">{m.content}</p>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={endRef} />
          </div>
        </div>

        {active.messages.length <= 1 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="rounded-full border bg-card px-3 py-1.5 text-xs hover:bg-accent"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="mt-3 flex gap-2"
        >
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything…"
            maxLength={4000}
            disabled={loading}
            autoFocus
          />
          {loading ? (
            <Button type="button" onClick={stop} variant="outline">
              <Square className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={!input.trim()}
              className="bg-gradient-primary shadow-glow"
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
        </form>
      </div>
      <PYQDialog open={pyqOpen} onOpenChange={setPyqOpen} initialMode={pyqMode} />
    </div>

  );
}
