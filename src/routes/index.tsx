import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Trophy, LogOut, LogIn, Copy, Check, MessageCircle, DoorOpen, Shield,
  Users, Zap, Crown, Lock, Unlock, Plus, Minus, Trash2,
  ChevronDown, ChevronUp, Gift, Sparkles, Flag, Medal, Radio,
  DollarSign, QrCode, Clock,
} from "lucide-react";

import { useArena } from "@/lib/use-arena";
import { uid, upsertHistory, pushFeed, type Player } from "@/lib/arena-store";
import { FarmBot } from "@/components/FarmBot";



export const Route = createFileRoute("/")({
  component: ArenaPage,
});

function ArenaPage() {
  const { state, update, session, setSession, isAdmin, setIsAdmin, loading, connected } = useArena();
  const { settings, registered, history, feed } = state;

  const filled = registered.length;
  const remaining = Math.max(0, settings.totalSlots - filled);
  const progressPct = settings.totalSlots > 0 ? Math.min(100, (filled / settings.totalSlots) * 100) : 0;

  const currentPlayer = useMemo(() => {
    if (!session) return null;
    return registered.find((p) => p.phone === session.phone) || null;
  }, [session, registered]);

  const historyPlayer = useMemo(() => {
    if (!session) return null;
    return history.find((p) => p.phone === session.phone) || null;
  }, [session, history]);

  const hasFreeEntry = (historyPlayer?.matchesPlayed ?? 0) >= settings.freeEntryThreshold;

  if (loading) return <LoadingScreen connected={connected} />;

  return (
    <>
      <OnlineBadge connected={connected} />
      <div className="mx-auto min-h-screen w-full max-w-3xl px-4 py-6 sm:py-10">
        <Header />
        <StatsBar filled={filled} total={settings.totalSlots} remaining={remaining} pct={progressPct} />
        <SessionBar session={session} onLogout={() => { setSession(null); toast.info("Você saiu da conta"); }} />

        {!settings.diaryOpen && filled < settings.totalSlots && <DiaryClosed />}

        {settings.diaryOpen && (
          <>
            {!session && <LoginCard onLogin={(name, phone) => { setSession({ name, phone }); toast.success(`Bem-vindo, ${name.split(" ")[0]}!`); }} />}

            {session && !currentPlayer && remaining > 0 && (
              <RegisterCard
                session={session}
                onRegister={(nick) => {
                  update((s) => {
                    if (s.registered.find((p) => p.phone === session.phone)) return s;
                    const player: Player = {
                      id: uid(),
                      name: session.name,
                      phone: session.phone,
                      nick,
                      registeredAt: Date.now(),
                      paid: false,
                      matchesPlayed: s.history.find((h) => h.phone === session.phone)?.matchesPlayed ?? 0,
                    };
                    let next = { ...s, registered: [...s.registered, player] };
                    next = upsertHistory(next, player);
                    next = pushFeed(next, { type: "inscricao", message: `${nick} garantiu vaga no diário` });
                    return next;
                  });
                  toast.success("✅ Sua vaga foi garantida!");
                }}
              />
            )}

            {session && !currentPlayer && remaining === 0 && <SlotsFull />}

            {currentPlayer && (
              <SpotSecuredCard player={currentPlayer} settings={settings} hasFreeEntry={hasFreeEntry} />
            )}
          </>
        )}

        <LiveFeed feed={feed} />
        <PlayersList registered={registered} />
        <Ranking history={history} />

        <AdminSection
          isAdmin={isAdmin}
          onLogin={(pwd) => {
            if (pwd === settings.adminPassword) { setIsAdmin(true); toast.success("Modo admin ativado"); return true; }
            return false;
          }}
          onLogout={() => { setIsAdmin(false); toast.info("Você saiu do modo admin"); }}
          state={state}
          update={update}
        />

        <footer className="mt-10 pb-10 text-center text-xs text-muted-foreground">
          © Arena Brawl Diário {new Date().getFullYear()} • Tempo real via Lovable Cloud
        </footer>
      </div>
    </>
  );
}

/* ---------- Loading screen ---------- */
function LoadingScreen({ connected }: { connected: boolean }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center px-6">
      <div className="card-surface w-full max-w-sm p-8 text-center animate-fade-up">
        <div className="mx-auto mb-6 grid h-20 w-20 place-items-center">
          <div className="loader-ring" />
        </div>
        <div className="mb-1 flex items-center justify-center gap-2 text-lg font-black">
          <Sparkles className="h-5 w-5 text-primary-glow" /> Arena Brawl Diário
        </div>
        <p className="text-sm text-muted-foreground">
          {connected ? "Sincronizando dados…" : "Conectando ao servidor…"}
        </p>
        <div className="mt-6 flex items-center justify-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
          <Radio className="h-3 w-3" /> Tempo real
        </div>
      </div>
    </div>
  );
}

/* ---------- Floating Online badge ---------- */
function OnlineBadge({ connected }: { connected: boolean }) {
  return (
    <div className="floating-online animate-fade-up">
      <span className={connected ? "live-dot" : "live-dot"} style={connected ? undefined : { background: "oklch(0.7 0.2 60)", boxShadow: "0 0 10px oklch(0.7 0.2 60)" }} />
      {connected ? "Online" : "Conectando"}
    </div>
  );
}

/* ---------- Header ---------- */
function Header() {
  return (
    <header className="mb-6 flex items-center gap-3">
      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[image:var(--gradient-hero)] animate-glow">
        <Trophy className="h-6 w-6 text-white" />
      </div>
      <div className="min-w-0">
        <h1 className="truncate text-xl font-black tracking-tight sm:text-2xl">Arena Brawl Diário</h1>
        <p className="truncate text-xs text-muted-foreground">Inscrições • Pix • Sala liberada pelo admin</p>
      </div>
    </header>
  );
}

/* ---------- Stats + Progress ---------- */
function StatsBar({ filled, total, remaining, pct }: { filled: number; total: number; remaining: number; pct: number }) {
  return (
    <section className="card-surface mb-4 p-5 animate-fade-up">
      <div className="grid grid-cols-3 gap-3 text-center">
        <Stat label="Vagas" value={total} icon={<Users className="h-4 w-4" />} />
        <Stat label="Inscritos" value={filled} icon={<Zap className="h-4 w-4" />} highlight />
        <Stat label="Restantes" value={remaining} icon={<Crown className="h-4 w-4" />} />
      </div>
      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>{filled}/{total} vagas preenchidas</span>
          <span className="font-semibold text-primary-glow tabular-nums">{Math.round(pct)}%</span>
        </div>
        <div className="progress-shell">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value, icon, highlight }: { label: string; value: number; icon: React.ReactNode; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border border-border p-3 ${highlight ? "bg-primary/10" : "bg-surface-2/50"}`}>
      <div className="mb-1 flex items-center justify-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
        {icon}<span>{label}</span>
      </div>
      <div className={`text-2xl font-black tabular-nums ${highlight ? "text-primary-glow" : ""}`}>{value}</div>
    </div>
  );
}

/* ---------- Session Bar ---------- */
function SessionBar({ session, onLogout }: { session: { name: string; phone: string } | null; onLogout: () => void }) {
  if (!session) return null;
  return (
    <div className="mb-4 flex items-center justify-between rounded-xl border border-border bg-surface-2/50 px-4 py-2.5 text-sm animate-fade-up">
      <div className="min-w-0 truncate">
        Logado como <span className="font-semibold text-primary-glow">{session.name}</span>
      </div>
      <button onClick={onLogout} className="btn-ghost flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold">
        <LogOut className="h-3.5 w-3.5" /> Sair
      </button>
    </div>
  );
}

/* ---------- Login ---------- */
function LoginCard({ onLogin }: { onLogin: (name: string, phone: string) => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const canSubmit = name.trim().length >= 2 && phone.replace(/\D/g, "").length >= 8;
  return (
    <section className="card-surface mb-4 p-5 animate-fade-up">
      <h2 className="mb-1 flex items-center gap-2 text-lg font-bold"><LogIn className="h-5 w-5 text-primary-glow" /> Entrar</h2>
      <p className="mb-4 text-sm text-muted-foreground">Faça login para se inscrever. Use seu nome e celular.</p>
      <div className="grid gap-3">
        <input className="input-field" placeholder="Seu nome completo" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="input-field" placeholder="Seu celular (só números)" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} inputMode="numeric" />
        <button disabled={!canSubmit} onClick={() => onLogin(name.trim(), phone.replace(/\D/g, ""))} className="btn-primary rounded-md py-2.5 font-semibold">Entrar</button>
      </div>
    </section>
  );
}

/* ---------- Register ---------- */
function RegisterCard({ session, onRegister }: { session: { name: string; phone: string }; onRegister: (nick: string) => void }) {
  const [nick, setNick] = useState("");
  return (
    <section className="card-surface mb-4 p-5 animate-fade-up">
      <h2 className="mb-1 flex items-center gap-2 text-lg font-bold"><Zap className="h-5 w-5 text-primary-glow" /> Garantir vaga</h2>
      <p className="mb-4 text-sm text-muted-foreground">Confirme seus dados e escolha seu nick.</p>
      <div className="grid gap-3">
        <input className="input-field opacity-70" value={session.name} disabled />
        <input className="input-field opacity-70" value={session.phone} disabled />
        <input className="input-field" placeholder="Nick do jogo" value={nick} onChange={(e) => setNick(e.target.value)} />
        <button disabled={!nick.trim()} onClick={() => onRegister(nick.trim())} className="btn-primary rounded-md py-2.5 font-semibold">
          Garantir minha vaga
        </button>
      </div>
    </section>
  );
}

function SlotsFull() {
  return (
    <section className="card-surface mb-4 border-warning/50 p-5 text-center animate-fade-up">
      <h2 className="text-lg font-bold text-warning">Inscrições encerradas</h2>
      <p className="mt-1 text-sm text-muted-foreground">As vagas já foram preenchidas.</p>
    </section>
  );
}

function DiaryClosed() {
  return (
    <section className="card-surface mb-4 p-5 text-center animate-fade-up">
      <h2 className="text-lg font-bold">Diário fechado</h2>
      <p className="mt-1 text-sm text-muted-foreground">As inscrições não estão abertas no momento.</p>
    </section>
  );
}

/* ---------- Spot secured (payment) ---------- */
function SpotSecuredCard({ player, settings, hasFreeEntry }: { player: Player; settings: { pixKey: string; entryFee: string; whatsappNumber: string; whatsappMessage: string; roomUnlocked: boolean; roomLink: string; freeEntryThreshold: number }; hasFreeEntry: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(settings.pixKey);
      setCopied(true);
      toast.success("Chave Pix copiada!");
      setTimeout(() => setCopied(false), 1500);
    } catch { toast.error("Falha ao copiar"); }
  };
  const waLink = `https://wa.me/${settings.whatsappNumber.replace(/\D/g, "")}?text=${encodeURIComponent(
    `${settings.whatsappMessage}\nNick: ${player.nick} • Nome: ${player.name}`
  )}`;
  return (
    <section className="card-surface mb-4 p-5 animate-fade-up">
      <h2 className="mb-1 flex items-center gap-2 text-lg font-bold text-success"><Check className="h-5 w-5" /> Vaga garantida!</h2>
      <p className="mb-4 text-sm text-muted-foreground">Sua inscrição foi feita com sucesso.</p>

      {hasFreeEntry ? (
        <div className="mb-4 rounded-xl border border-success/40 bg-success/10 p-4">
          <div className="flex items-center gap-2 font-bold text-success"><Gift className="h-5 w-5" /> Entrada grátis!</div>
          <p className="mt-1 text-sm text-muted-foreground">Você completou {settings.freeEntryThreshold} partidas e ganhou entrada gratuita.</p>
        </div>
      ) : (
        <div className="mb-4 rounded-2xl border border-primary/30 bg-[image:var(--gradient-card)] p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary-glow">
              <DollarSign className="h-4 w-4" /> Pagamento via Pix
            </div>
            <span className="text-2xl font-black text-primary-glow tabular-nums">{settings.entryFee}</span>
          </div>

          <div className="mb-3 rounded-xl border border-border bg-background/60 p-3">
            <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              <KeyRound className="h-3 w-3" /> Chave Pix
            </div>
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-md bg-surface-2/60 px-3 py-2 font-mono text-sm">{settings.pixKey}</code>
              <button onClick={copy} className="btn-primary flex shrink-0 items-center gap-1 rounded-md px-3 py-2 text-sm">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? "Ok" : "Copiar"}
              </button>
            </div>
          </div>

          <ol className="mb-3 space-y-1.5 rounded-xl bg-surface-2/40 p-3 text-xs text-muted-foreground">
            <li><span className="font-bold text-foreground">1.</span> Copie a chave Pix acima</li>
            <li><span className="font-bold text-foreground">2.</span> Pague o valor de <span className="font-bold text-primary-glow">{settings.entryFee}</span> no app do seu banco</li>
            <li><span className="font-bold text-foreground">3.</span> Envie o comprovante para o admin no WhatsApp</li>
          </ol>

          <a href={waLink} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-md bg-success/15 py-2.5 text-sm font-bold text-success hover:bg-success/25 transition">
            <MessageCircle className="h-4 w-4" /> Avisar admin no WhatsApp
          </a>
        </div>
      )}

      <div className="rounded-xl border border-border bg-surface-2/50 p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <DoorOpen className="h-4 w-4 text-primary-glow" /> Sala do campeonato
        </div>
        {settings.roomUnlocked && settings.roomLink ? (
          <a href={settings.roomLink} target="_blank" rel="noreferrer" className="btn-primary flex items-center justify-center gap-2 rounded-md py-2.5 font-semibold">
            <DoorOpen className="h-4 w-4" /> Entrar na sala
          </a>
        ) : (
          <div className="flex items-center justify-center gap-2 rounded-md bg-background/60 p-3 text-center text-sm text-muted-foreground">
            <Lock className="h-3.5 w-3.5" /> Aguarde o admin liberar a sala
          </div>
        )}
      </div>
    </section>
  );
}

/* ---------- Live Feed ---------- */
function LiveFeed({ feed }: { feed: FeedEvent[] }) {
  const items = feed.slice(0, 8);
  const icon = (t: FeedEvent["type"]) => {
    if (t === "inscricao") return <Zap className="h-3.5 w-3.5 text-primary-glow" />;
    if (t === "pagamento") return <Check className="h-3.5 w-3.5 text-success" />;
    if (t === "sala") return <DoorOpen className="h-3.5 w-3.5 text-warning" />;
    if (t === "vencedor") return <Trophy className="h-3.5 w-3.5 text-warning" />;
    return <Flag className="h-3.5 w-3.5 text-primary-glow" />;
  };
  return (
    <section className="card-surface mb-4 p-5 animate-fade-up">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
        <Radio className="h-5 w-5 text-primary-glow animate-pulse" /> Feed ao vivo
        <span className="chip ml-1"><span className="live-dot" /> tempo real</span>
      </h2>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sem atividade ainda. Fique de olho aqui!</p>
      ) : (
        <ul className="grid gap-2">
          {items.map((e) => (
            <li key={e.id} className="flex items-center gap-3 rounded-lg border border-border bg-surface-2/40 p-2.5 text-sm animate-feed-in">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-surface-2">{icon(e.type)}</span>
              <span className="min-w-0 flex-1 truncate">{e.message}</span>
              <span className="shrink-0 text-[10px] uppercase text-muted-foreground tabular-nums">{timeAgo(e.at)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function timeAgo(t: number) {
  const s = Math.max(1, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60); if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

/* ---------- Players list ---------- */
function PlayersList({ registered }: { registered: Player[] }) {
  return (
    <section className="card-surface mb-4 p-5 animate-fade-up">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-bold"><Users className="h-5 w-5 text-primary-glow" /> Inscritos <span className="chip ml-1">{registered.length}</span></h2>
      {registered.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum inscrito ainda. Seja o primeiro!</p>
      ) : (
        <ul className="grid gap-2">
          {registered.map((p, i) => (
            <li key={p.id} className="flex items-center gap-3 rounded-lg border border-border bg-surface-2/40 p-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[image:var(--gradient-hero)] text-sm font-black">{i + 1}</div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{p.nick || p.name}</div>
                <div className="truncate text-xs text-muted-foreground">{p.name}</div>
              </div>
              {p.paid && <span className="chip !text-success !border-success/40 !bg-success/15">Pago</span>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ---------- Ranking (podium + rest) ---------- */
function Ranking({ history }: { history: Player[] }) {
  const sorted = [...history].sort((a, b) => (b.matchesPlayed || 0) - (a.matchesPlayed || 0));
  const top3 = sorted.slice(0, 3);
  const rest = sorted.slice(3, 15);
  const max = sorted[0]?.matchesPlayed || 1;

  return (
    <section className="card-surface mb-4 p-5 animate-fade-up">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
        <Crown className="h-5 w-5 text-warning" /> Ranking geral
        <span className="chip ml-1">top {Math.min(15, sorted.length)}</span>
      </h2>

      {sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground">Ainda não há dados de partidas.</p>
      ) : (
        <>
          {/* Podium */}
          {top3.length > 0 && (
            <div className="mb-5 grid grid-cols-3 items-end gap-2">
              {[1, 0, 2].map((idx, col) => {
                const p = top3[idx];
                if (!p) return <div key={col} />;
                const heights = ["h-16", "h-24", "h-12"];
                const heightIdx = idx === 0 ? 1 : idx === 1 ? 0 : 2;
                const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉";
                const glow = idx === 0 ? "from-yellow-400/40 to-yellow-600/10 border-yellow-400/50" :
                             idx === 1 ? "from-slate-300/30 to-slate-500/10 border-slate-300/40" :
                                         "from-amber-600/30 to-amber-800/10 border-amber-600/40";
                return (
                  <div key={p.id} className="flex flex-col items-center gap-2 animate-podium" style={{ animationDelay: `${col * 120}ms` }}>
                    <div className={`grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br ${glow} border-2 text-2xl ${idx === 0 ? "animate-glow" : ""}`}>
                      {medal}
                    </div>
                    <div className="w-full min-w-0 text-center">
                      <div className="truncate text-sm font-bold">{p.nick || p.name}</div>
                      <div className="text-[10px] tabular-nums text-muted-foreground">{p.matchesPlayed} partidas</div>
                    </div>
                    <div className={`w-full ${heights[heightIdx]} rounded-t-lg bg-gradient-to-t ${glow} border border-b-0`} />
                  </div>
                );
              })}
            </div>
          )}

          {/* Rest */}
          {rest.length > 0 && (
            <ul className="grid gap-2">
              {rest.map((p, i) => {
                const pct = Math.max(6, ((p.matchesPlayed || 0) / max) * 100);
                return (
                  <li key={p.id} className="rounded-lg border border-border bg-surface-2/40 p-3">
                    <div className="mb-1.5 flex items-center gap-2 text-sm">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-surface-2 text-xs font-bold tabular-nums text-muted-foreground">{i + 4}</span>
                      <span className="min-w-0 flex-1 truncate font-semibold">{p.nick || p.name}</span>
                      <span className="chip shrink-0 tabular-nums"><Medal className="h-3 w-3" /> {p.matchesPlayed}</span>
                    </div>
                    <div className="progress-shell h-2">
                      <div className="progress-fill" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

/* ---------- Admin ---------- */
function AdminSection({
  isAdmin, onLogin, onLogout, state, update,
}: {
  isAdmin: boolean;
  onLogin: (pwd: string) => boolean;
  onLogout: () => void;
  state: import("@/lib/arena-store").ArenaState;
  update: (u: (s: import("@/lib/arena-store").ArenaState) => import("@/lib/arena-store").ArenaState) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pwd, setPwd] = useState("");
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"config" | "ranking" | "players">("config");

  return (
    <section className="card-surface mb-4 overflow-hidden animate-fade-up">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between p-4 text-left">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary-glow" />
          <span className="font-bold">Área do admin</span>
          {isAdmin && <span className="chip">conectado</span>}
        </div>
        {open ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
      </button>

      {open && (
        <div className="border-t border-border p-4 animate-drawer">
          {!isAdmin ? (
            <div className="grid gap-3">
              <h3 className="flex items-center gap-2 font-semibold"><Lock className="h-4 w-4" /> Login do admin</h3>
              <input type="password" className="input-field" placeholder="Senha" value={pwd}
                onChange={(e) => { setPwd(e.target.value); setError(""); }}
                onKeyDown={(e) => { if (e.key === "Enter") { if (!onLogin(pwd)) setError("Senha incorreta"); else setPwd(""); } }} />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <button className="btn-primary rounded-md py-2.5 font-semibold"
                onClick={() => { if (!onLogin(pwd)) setError("Senha incorreta"); else setPwd(""); }}>
                Entrar como admin
              </button>
            </div>
          ) : (
            <>
              <div className="mb-4 flex gap-1 rounded-lg bg-surface-2/60 p-1">
                {(["config","ranking","players"] as const).map((t) => (
                  <button key={t} onClick={() => setTab(t)}
                    className={`flex-1 rounded-md py-2 text-xs font-semibold uppercase tracking-wide transition ${tab===t?"bg-[image:var(--gradient-hero)] text-white shadow-lg":"text-muted-foreground hover:text-foreground"}`}>
                    {t === "config" ? "Config" : t === "ranking" ? "Ranking" : "Inscritos"}
                  </button>
                ))}
              </div>

              {tab === "config" && <AdminConfig state={state} update={update} />}
              {tab === "ranking" && <AdminRanking state={state} update={update} />}
              {tab === "players" && <AdminPlayers state={state} update={update} />}

              <div className="mt-5 border-t border-border pt-4">
                <button onClick={onLogout} className="btn-ghost flex w-full items-center justify-center gap-2 rounded-md py-2.5 font-semibold">
                  <LogOut className="h-4 w-4" /> Sair do admin
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}

function AdminConfig({ state, update }: {
  state: import("@/lib/arena-store").ArenaState;
  update: (u: (s: import("@/lib/arena-store").ArenaState) => import("@/lib/arena-store").ArenaState) => void;
}) {
  const s = state.settings;
  const [form, setForm] = useState(s);
  useEffect(() => setForm(s), [s]);
  const [newPwd, setNewPwd] = useState("");

  const save = () => {
    update((st) => ({ ...st, settings: { ...st.settings, ...form } }));
    toast.success("Configurações salvas");
  };

  const toggleRoom = () => {
    update((st) => {
      const unlocked = !st.settings.roomUnlocked;
      let next = { ...st, settings: { ...st.settings, roomUnlocked: unlocked } };
      if (unlocked) next = pushFeed(next, { type: "sala", message: "Admin liberou a sala do campeonato!" });
      return next;
    });
    toast.success(s.roomUnlocked ? "Sala ocultada" : "Sala liberada!");
  };

  const finalizeDiary = () => {
    if (state.registered.length === 0) { toast.error("Sem inscritos"); return; }
    if (!confirm(`Finalizar diário? Isso vai adicionar +1 partida para os ${state.registered.length} inscritos.`)) return;
    update((st) => {
      const ids = new Set(st.registered.map((p) => p.id));
      const phones = new Set(st.registered.map((p) => p.phone));
      const history = st.history.map((p) =>
        ids.has(p.id) || phones.has(p.phone) ? { ...p, matchesPlayed: (p.matchesPlayed || 0) + 1 } : p
      );
      let next = { ...st, history };
      next = pushFeed(next, { type: "diario", message: `Diário finalizado! +1 partida para ${st.registered.length} jogadores` });
      return next;
    });
    toast.success("Diário finalizado! Rankings atualizados.");
  };

  return (
    <div className="grid gap-3">
      <label className="text-xs font-semibold uppercase text-muted-foreground">Quantidade de vagas</label>
      <div className="flex items-center gap-2">
        <button className="btn-ghost grid h-10 w-10 place-items-center rounded-md" onClick={() => setForm({ ...form, totalSlots: Math.max(1, form.totalSlots - 1) })}><Minus className="h-4 w-4" /></button>
        <input type="number" className="input-field text-center" value={form.totalSlots} onChange={(e) => setForm({ ...form, totalSlots: Math.max(1, +e.target.value || 1) })} />
        <button className="btn-ghost grid h-10 w-10 place-items-center rounded-md" onClick={() => setForm({ ...form, totalSlots: form.totalSlots + 1 })}><Plus className="h-4 w-4" /></button>
      </div>

      <label className="text-xs font-semibold uppercase text-muted-foreground">Valor da inscrição</label>
      <input className="input-field" value={form.entryFee} onChange={(e) => setForm({ ...form, entryFee: e.target.value })} />

      <label className="text-xs font-semibold uppercase text-muted-foreground">Chave Pix</label>
      <input className="input-field" value={form.pixKey} onChange={(e) => setForm({ ...form, pixKey: e.target.value })} />

      <label className="text-xs font-semibold uppercase text-muted-foreground">Link da sala</label>
      <input className="input-field" value={form.roomLink} onChange={(e) => setForm({ ...form, roomLink: e.target.value })} placeholder="https://..." />

      <label className="text-xs font-semibold uppercase text-muted-foreground">WhatsApp (com DDD)</label>
      <input className="input-field" value={form.whatsappNumber} onChange={(e) => setForm({ ...form, whatsappNumber: e.target.value })} />

      <label className="text-xs font-semibold uppercase text-muted-foreground">Mensagem automática</label>
      <input className="input-field" value={form.whatsappMessage} onChange={(e) => setForm({ ...form, whatsappMessage: e.target.value })} />

      <label className="text-xs font-semibold uppercase text-muted-foreground">Partidas p/ entrada grátis</label>
      <input type="number" className="input-field" value={form.freeEntryThreshold} onChange={(e) => setForm({ ...form, freeEntryThreshold: Math.max(1, +e.target.value || 1) })} />

      <button onClick={save} className="btn-primary rounded-md py-2.5 font-semibold">Salvar configurações</button>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <button onClick={toggleRoom}
          className={`flex items-center justify-center gap-2 rounded-md py-2.5 text-sm font-semibold ${s.roomUnlocked ? "btn-danger" : "btn-primary"}`}>
          {s.roomUnlocked ? <><Lock className="h-4 w-4" /> Ocultar sala</> : <><Unlock className="h-4 w-4" /> Liberar sala</>}
        </button>
        <button onClick={() => { update((st) => ({ ...st, settings: { ...st.settings, diaryOpen: !st.settings.diaryOpen } })); toast.info(s.diaryOpen ? "Diário fechado" : "Diário aberto"); }}
          className="btn-ghost rounded-md py-2.5 text-sm font-semibold">
          {s.diaryOpen ? "Fechar diário" : "Abrir diário"}
        </button>
      </div>

      <button onClick={finalizeDiary} className="btn-primary mt-2 flex items-center justify-center gap-2 rounded-md py-3 font-bold">
        <Flag className="h-4 w-4" /> Finalizar diário (+1 partida p/ inscritos)
      </button>

      <div className="mt-4 border-t border-border pt-4">
        <label className="text-xs font-semibold uppercase text-muted-foreground">Alterar senha do admin</label>
        <div className="mt-2 flex gap-2">
          <input type="password" className="input-field" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} placeholder="Nova senha" />
          <button onClick={() => { if (newPwd.trim()) { update((st) => ({ ...st, settings: { ...st.settings, adminPassword: newPwd } })); setNewPwd(""); toast.success("Senha alterada"); } }}
            className="btn-primary shrink-0 rounded-md px-4 text-sm font-semibold">Alterar</button>
        </div>
      </div>
    </div>
  );
}

function AdminRanking({ state, update }: {
  state: import("@/lib/arena-store").ArenaState;
  update: (u: (s: import("@/lib/arena-store").ArenaState) => import("@/lib/arena-store").ArenaState) => void;
}) {
  const history = state.history;
  const setMatches = (id: string, v: number) => update((st) => ({
    ...st,
    history: st.history.map((p) => p.id === id ? { ...p, matchesPlayed: Math.max(0, v) } : p),
    registered: st.registered.map((p) => p.id === id ? { ...p, matchesPlayed: Math.max(0, v) } : p),
  }));

  if (history.length === 0) return <p className="text-sm text-muted-foreground">Ainda não há jogadores no histórico.</p>;

  return (
    <div className="grid gap-2">
      <p className="text-xs text-muted-foreground">Ajuste quantas partidas cada jogador já jogou.</p>
      {history.map((p) => (
        <div key={p.id} className="rounded-lg border border-border bg-surface-2/40 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate font-semibold">{p.nick || p.name}</div>
              <div className="truncate text-xs text-muted-foreground">{p.phone}</div>
            </div>
            <span className="chip tabular-nums">{p.matchesPlayed}</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-ghost grid h-9 w-9 place-items-center rounded-md" onClick={() => setMatches(p.id, (p.matchesPlayed || 0) - 1)}><Minus className="h-4 w-4" /></button>
            <input type="number" className="input-field text-center" value={p.matchesPlayed}
              onChange={(e) => setMatches(p.id, +e.target.value || 0)} />
            <button className="btn-ghost grid h-9 w-9 place-items-center rounded-md" onClick={() => setMatches(p.id, (p.matchesPlayed || 0) + 1)}><Plus className="h-4 w-4" /></button>
          </div>
        </div>
      ))}
    </div>
  );
}

function AdminPlayers({ state, update }: {
  state: import("@/lib/arena-store").ArenaState;
  update: (u: (s: import("@/lib/arena-store").ArenaState) => import("@/lib/arena-store").ArenaState) => void;
}) {
  const registered = state.registered;
  const [finalizeOpen, setFinalizeOpen] = useState(false);
  const [winnerId, setWinnerId] = useState("");

  const removePlayer = (id: string) => update((st) => ({ ...st, registered: st.registered.filter((p) => p.id !== id) }));

  const togglePaid = (id: string) => {
    const player = state.registered.find((p) => p.id === id);
    update((st) => {
      const nowPaid = !st.registered.find((p) => p.id === id)?.paid;
      let next = {
        ...st,
        registered: st.registered.map((p) => p.id === id ? { ...p, paid: !p.paid } : p),
      };
      if (nowPaid && player) {
        next = pushFeed(next, { type: "pagamento", message: `${player.nick || player.name} pagou a inscrição` });
      }
      return next;
    });
  };

  const confirmFinalize = () => {
    const winner = state.registered.find((p) => p.id === winnerId);
    update((st) => {
      let next: import("@/lib/arena-store").ArenaState = { ...st, registered: [] };
      if (winner) {
        next = pushFeed(next, { type: "vencedor", message: `🏆 ${winner.nick || winner.name} venceu o campeonato!` });
      }
      return next;
    });

    setFinalizeOpen(false);
    setWinnerId("");
    toast.success(winner ? `${winner.nick || winner.name} declarado vencedor!` : "Partida finalizada");
  };

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">Inscritos ({registered.length})</span>
        {registered.length > 0 && (
          <button onClick={() => setFinalizeOpen(true)} className="btn-danger flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold">
            <Flag className="h-3.5 w-3.5" /> Finalizar partida
          </button>
        )}
      </div>

      {finalizeOpen && (
        <div className="rounded-xl border border-primary/40 bg-primary/10 p-4 animate-fade-up">
          <div className="mb-2 flex items-center gap-2 text-sm font-bold text-primary-glow">
            <Trophy className="h-4 w-4" /> Selecione o vencedor
          </div>
          <p className="mb-3 text-xs text-muted-foreground">Não altera o ranking. Só registra o vencedor no feed e limpa a lista.</p>
          <select value={winnerId} onChange={(e) => setWinnerId(e.target.value)} className="input-field mb-3">
            <option value="">— Sem vencedor —</option>
            {registered.map((p) => (
              <option key={p.id} value={p.id}>{p.nick || p.name}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <button onClick={() => setFinalizeOpen(false)} className="btn-ghost flex-1 rounded-md py-2 text-sm font-semibold">Cancelar</button>
            <button onClick={confirmFinalize} className="btn-primary flex-1 rounded-md py-2 text-sm font-semibold">Confirmar</button>
          </div>
        </div>
      )}

      {registered.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sem inscritos no momento.</p>
      ) : (
        registered.map((p) => (
          <div key={p.id} className="flex items-center gap-3 rounded-lg border border-border bg-surface-2/40 p-3">
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold">{p.nick || p.name}</div>
              <div className="truncate text-xs text-muted-foreground">{p.name} • {p.phone}</div>
            </div>
            <button onClick={() => togglePaid(p.id)} className={`chip shrink-0 ${p.paid ? "!text-success !border-success/40 !bg-success/15" : ""}`}>{p.paid ? "Pago" : "Marcar pago"}</button>
            <button onClick={() => removePlayer(p.id)} className="btn-ghost grid h-9 w-9 shrink-0 place-items-center rounded-md text-destructive"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))
      )}
    </div>
  );
}
