import { useState, useRef, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Send, X, Bot, Sparkles } from "lucide-react";
import { askFarmBot } from "@/lib/farmbot.functions";

type Msg = { role: "user" | "assistant"; content: string };

export function FarmBot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Oi! Sou o FarmBot 🌱 Posso te ajudar a se inscrever, pagar o Pix ou entrar na sala. Pergunta aí!" },
  ]);
  const ask = useServerFn(askFarmBot);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const send = async () => {
    const text = input.trim().slice(0, 1000);
    if (!text || loading) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const { reply } = await ask({ data: { messages: next.slice(-10) } });
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Erro de conexão. Tenta de novo." }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="farmbot-launcher animate-glow"
          aria-label="Abrir FarmBot"
        >
          <Bot className="h-5 w-5" />
          <span className="text-xs font-bold">FarmBot</span>
        </button>
      )}

      {open && (
        <div className="farmbot-panel animate-drawer">
          <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-[image:var(--gradient-hero)]">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div>
                <div className="text-sm font-bold flex items-center gap-1">FarmBot <Sparkles className="h-3 w-3 text-primary-glow" /></div>
                <div className="text-[10px] text-muted-foreground">assistente do Arena Brawl</div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="btn-ghost grid h-7 w-7 place-items-center rounded-md" aria-label="Fechar">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm animate-fade-up ${
                  m.role === "user"
                    ? "bg-[image:var(--gradient-hero)] text-white rounded-br-sm"
                    : "bg-surface-2 text-foreground rounded-bl-sm border border-border"
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm border border-border bg-surface-2 px-3 py-2 text-sm">
                  <span className="inline-flex gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary-glow" style={{ animationDelay: "0ms" }} />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary-glow" style={{ animationDelay: "120ms" }} />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary-glow" style={{ animationDelay: "240ms" }} />
                  </span>
                </div>
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); void send(); }}
            className="flex items-center gap-2 border-t border-border p-2"
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value.slice(0, 1000))}
              placeholder="Pergunta algo…"
              maxLength={1000}
              className="input-field !py-2 text-sm"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="btn-primary grid h-9 w-9 shrink-0 place-items-center rounded-md"
              aria-label="Enviar"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
