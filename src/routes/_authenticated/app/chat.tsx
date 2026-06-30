import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listThreads, createThread, getThreadMessages, deleteThread } from "@/lib/cfa.functions";
import { chatStream } from "@/lib/ai-chat.functions";
import { useT } from "@/i18n/LanguageProvider";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, MessageSquare, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

export const Route = createFileRoute("/_authenticated/app/chat")({
  component: ChatPage,
});

type Msg = { role: "user" | "assistant"; content: string };

function ChatPage() {
  const { t } = useT();
  const qc = useQueryClient();
  const [threadId, setThreadId] = useState<string | null>(null);
  const [pending, setPending] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const threads = useQuery({ queryKey: ["threads"], queryFn: () => listThreads({ data: {} }) });
  const messages = useQuery({
    queryKey: ["messages", threadId],
    queryFn: () => threadId ? getThreadMessages({ data: { thread_id: threadId } }) : null,
    enabled: !!threadId,
  });

  useEffect(() => { setPending([]); }, [threadId]);
  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.data, pending]);

  const newThread = useMutation({
    mutationFn: () => createThread({ data: { scope_type: "global", title: "New chat" } }),
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["threads"] });
      setThreadId(row.id);
    },
  });
  const del = useMutation({
    mutationFn: (id: string) => deleteThread({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["threads"] }); setThreadId(null); },
  });

  const send = async () => {
    if (!input.trim() || streaming) return;
    let tid = threadId;
    if (!tid) {
      const created = await createThread({ data: { scope_type: "global", title: input.slice(0, 60) } });
      tid = created.id;
      setThreadId(tid);
      qc.invalidateQueries({ queryKey: ["threads"] });
    }
    const userText = input;
    setInput("");
    setPending((p) => [...p, { role: "user", content: userText }, { role: "assistant", content: "" }]);
    setStreaming(true);
    try {
      const result = await chatStream({ data: { thread_id: tid, message: userText } });
      const text: string = result.text;
      setPending((p) => {
        const copy = [...p];
        copy[copy.length - 1] = { role: "assistant", content: text };
        return copy;
      });
      // refresh persisted messages
      await qc.invalidateQueries({ queryKey: ["messages", tid] });
      setPending([]);
    } catch (err) {
      setPending((p) => {
        const copy = [...p];
        copy[copy.length - 1] = { role: "assistant", content: err instanceof Error ? err.message : "Error" };
        return copy;
      });
    } finally {
      setStreaming(false);
    }
  };

  const persisted: Msg[] = (messages.data?.messages ?? []).map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
  const allMsgs = pending.length ? [...persisted, ...pending] : persisted;

  return (
    <div className="grid md:grid-cols-[260px_1fr] gap-6 h-[calc(100vh-10rem)]">
      <Card className="p-3 space-y-2 overflow-y-auto">
        <Button size="sm" className="w-full" onClick={() => newThread.mutate()}>
          <Plus className="size-3.5" /> {t.chat.newThread}
        </Button>
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground pt-2">{t.chat.threads}</div>
        {threads.data?.map((th) => (
          <div key={th.id} className={`group flex items-center gap-1 rounded-md px-2 py-1.5 text-sm hover:bg-accent ${threadId === th.id ? "bg-accent" : ""}`}>
            <button className="flex-1 text-left truncate" onClick={() => setThreadId(th.id)}>
              <MessageSquare className="size-3 inline mr-1" /> {th.title}
            </button>
            <button onClick={() => del.mutate(th.id)} className="opacity-0 group-hover:opacity-100 transition-opacity">
              <Trash2 className="size-3 text-muted-foreground" />
            </button>
          </div>
        ))}
      </Card>

      <Card className="flex flex-col">
        <div ref={scrollerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {!threadId && pending.length === 0 && (
            <div className="text-center text-sm text-muted-foreground mt-12">{t.chat.placeholder}</div>
          )}
          {allMsgs.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                {m.role === "assistant" ? (
                  m.content ? <div className="prose prose-sm dark:prose-invert max-w-none"><ReactMarkdown>{m.content}</ReactMarkdown></div> : <span className="opacity-70">{t.chat.thinking}</span>
                ) : (
                  <div className="whitespace-pre-wrap">{m.content}</div>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="border-t p-3 flex gap-2">
          <Textarea
            rows={2}
            placeholder={t.chat.placeholder}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            className="resize-none"
          />
          <Button onClick={send} disabled={!input.trim() || streaming}>
            <Send className="size-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
}
