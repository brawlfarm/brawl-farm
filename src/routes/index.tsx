import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
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
import { adminLogin, adminLogout, adminStatus } from "@/lib/admin-auth.functions";




export const Route = createFileRoute("/")({
  component: ArenaPage,
});

function ArenaPage() {
  const { state, update, updateAtomic, session, setSession, isAdmin, setIsAdmin, loading, connected } = useArena();
  const { settings, registered, history, feed } = state;

  // Show ONLY new feed events (arrived after mount) as toasts.
  // Prevents old events from re-firing when the page opens/reloads.
  const seenIds = useRef<Set<string>>(new Set());
  const mountTime = useRef<number>(Date.now());
  const bootstrapped = useRef(false);
  useEffect(() => {
    if (!bootstrapped.current) {
      // Mark every existing event as seen; dismiss any leftover toasts.
      feed.forEach((f) => seenIds.current.add(f.id));
      mountTime.current = Date.now();
      bootstrapped.current = true;
      toast.dismiss();
      return;
    }
    const fresh = feed.filter(
      (f) => !seenIds.current.has(f.id) && f.at >= mountTime.current - 500,
    );
    fresh.reverse().forEach((f) => {
      seenIds.current.add(f.id);
      const icon =
        f.type === "vencedor" ? "🏆" :
        f.type === "pagamento" ? "💸" :
        f.type === "sala" ? "🚪" :
        f.type === "diario" ? "🏁" : "⚡";
      toast(`${icon} ${f.message}`, { id: f.id, duration: 3500 });
    });
    // Also mark any old-but-unseen events as seen so they never fire.
    feed.forEach((f) => seenIds.current.add(f.id));
  }, [feed]);


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

  const hasFreeEntry = (() => {
    const played = historyPlayer?.matchesPlayed ?? 0;
    const threshold = settings.freeEntryThreshold || 0;
    return played > 0 && threshold > 0 && played % threshold === 0;
  })();

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
                onRegister={async (nick) => {
                  const result = await updateAtomic((s) => {
                    if (s.registered.find((p) => p.phone === session.phone)) {
                      return { error: "Você já está inscrito" };
                    }
                    if (s.registered.length >= s.settings.totalSlots) {
                      return { error: "Vagas esgotadas" };
                    }
                    if (!s.settings.diaryOpen) {
                      return { error: "Inscrições fechadas" };
                    }
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
                    return { next };
                  });
                  if (result.ok) {
                    toast.success("✅ Sua vaga foi garantida!");
                  } else {
                    toast.error(result.error || "Não foi possível concluir a inscrição");
                  }
                }}
              />
            )}


            {session && !currentPlayer && remaining === 0 && <SlotsFull />}

            {currentPlayer && (
              <SpotSecuredCard
                player={currentPlayer}
                settings={settings}
                hasFreeEntry={hasFreeEntry}
                onLeave={() => {
                  update((s) => ({ ...s, registered: s.registered.filter((p) => p.id !== currentPlayer.id) }));
                  toast.info("Você saiu da sala");
                }}
              />
            )}
          </>
        )}

        <PlayersList registered={registered} />
        <Ranking history={history} />



        <AdminSection
          isAdmin={isAdmin}
          setIsAdmin={setIsAdmin}
          state={state}
          update={update}
        />


        <footer className="footer-mono mt-10 pb-10 text-center text-xs text-muted-foreground/60">
          © Pietro Henrique
        </footer>
      </div>
      <FarmBot />
    </>
  );
}


/* ---------- Loading screen ---------- */
function LoadingScreen({ connected }: { connected: boolean }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center px-6">
      <div className="text-center animate-fade-up">
        <div className="mx-auto mb-5 loader-dots" />
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
          {connected ? "Sincronizando…" : "Conectando ao servidor…"}
        </p>
      </div>
    </div>
  );
}

/* ---------- Floating Online badge ---------- */
function OnlineBadge({ connected }: { connected: boolean }) {
  return (
    <div className="floating-online animate-fade-up">
      <span className="live-dot" style={connected ? undefined : { background: "#f59e0b", boxShadow: "0 0 10px #f59e0b" }} />
      {connected ? "Online" : "Conectando"}
    </div>
  );
}

/* ---------- Header ---------- */
function Header() {
  return (
    <header className="mb-6 text-center animate-fade-up">
      <h1 className="title-gradient animate-glow text-4xl sm:text-5xl font-normal leading-none">
        Diário Brawl Farm
      </h1>
      <p className="mt-3 text-[11px] uppercase tracking-[0.4em] text-muted-foreground">
        Inscrições • Pix • Sala liberada pelo admin
      </p>
    </header>
  );
}

/* ---------- Stats + Progress ---------- */
function StatsBar({ filled, total, remaining, pct }: { filled: number; total: number; remaining: number; pct: number }) {
  const fillClass =
    pct >= 100 ? "progress-fill progress-fill-high" :
    pct >= 80 ? "progress-fill progress-fill-high" :
    pct >= 50 ? "progress-fill progress-fill-medium" :
    "progress-fill";
  return (
    <section className="card-surface mb-4 p-6 animate-fade-up">
      <div className="grid grid-cols-3 gap-2.5 mb-3">
        <Stat label="Vagas" value={total} icon={<Users className="h-[18px] w-[18px]" />} />
        <Stat label="Inscritos" value={filled} icon={<Zap className="h-[18px] w-[18px]" />} />
        <Stat label="Restantes" value={remaining} icon={<Crown className="h-[18px] w-[18px]" />} />
      </div>
      <div className="mt-1">
        <div className="progress-shell">
          <div className={fillClass} style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-1.5 text-center text-xs text-muted-foreground">
          {filled}/{total} vagas preenchidas · {Math.round(pct)}%
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="mini-stat">
      <div className="text-primary-glow flex justify-center">{icon}</div>
      <div className="mt-1 text-[26px] font-extrabold leading-none text-white tabular-nums">{value}</div>
      <div className="mt-1 text-[11px] uppercase tracking-wide">{label}</div>
    </div>
  );
}


/* ---------- Session Bar ---------- */
function SessionBar({ session, onLogout }: { session: { name: string; phone: string } | null; onLogout: () => void }) {
  if (!session) return null;
  return (
    <div className="user-bar mb-4 flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm animate-fade-up">
      <div className="flex min-w-0 items-center gap-2 truncate">
        <span className="text-primary-glow text-lg">👤</span>
        <span className="truncate">Logado como <span className="font-bold text-[#c4b5fd]">{session.name}</span></span>
      </div>
      <button onClick={onLogout} className="btn-logout flex shrink-0 items-center gap-1.5 px-4 py-1.5 text-xs">
        <LogOut className="h-3.5 w-3.5" /> Sair
      </button>
    </div>
  );
}

/* ---------- Login ---------- */
function LoginCard({ onLogin }: { onLogin: (name: string, phone: string) => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const cleanName = name.trim().slice(0, 60);
  const cleanPhone = phone.replace(/\D/g, "").slice(0, 15);
  const canSubmit = cleanName.length >= 2 && cleanPhone.length >= 8;
  return (
    <section className="card-surface mb-4 p-5 animate-fade-up">
      <h2 className="mb-1 flex items-center gap-2 text-lg font-bold"><LogIn className="h-5 w-5 text-primary-glow" /> Entrar</h2>
      <p className="mb-4 text-sm text-muted-foreground">Faça login para se inscrever. Use seu nome e celular.</p>
      <div className="grid gap-3">
        <input className="input-field" placeholder="Seu nome completo" value={name} onChange={(e) => setName(e.target.value.slice(0, 60))} maxLength={60} />
        <input className="input-field" placeholder="Seu celular (só números)" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 15))} inputMode="numeric" maxLength={15} />
        <button disabled={!canSubmit} onClick={() => onLogin(cleanName, cleanPhone)} className="btn-primary rounded-md py-2.5 font-semibold">Entrar</button>
      </div>
    </section>
  );
}


/* ---------- Register ---------- */
function RegisterCard({ session, onRegister }: { session: { name: string; phone: string }; onRegister: (nick: string) => void }) {
  const [nick, setNick] = useState("");
  const cleanNick = nick.trim().slice(0, 20);
  const valid = cleanNick.length >= 2 && /^[\p{L}\p{N}_\-. ]+$/u.test(cleanNick);
  return (
    <section className="card-surface mb-4 p-5 animate-fade-up">
      <h2 className="mb-1 flex items-center gap-2 text-lg font-bold"><Zap className="h-5 w-5 text-primary-glow" /> Garantir vaga</h2>
      <p className="mb-4 text-sm text-muted-foreground">Confirme seus dados e escolha seu nick.</p>
      <div className="grid gap-3">
        <input className="input-field opacity-70" value={session.name} disabled />
        <input className="input-field opacity-70" value={session.phone} disabled />
        <input className="input-field" placeholder="Nick do jogo (2-20 caracteres)" value={nick} onChange={(e) => setNick(e.target.value.slice(0, 20))} maxLength={20} />
        <button disabled={!valid} onClick={() => onRegister(cleanNick)} className="btn-primary rounded-md py-2.5 font-semibold">
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
function SpotSecuredCard({ player, settings, hasFreeEntry, onLeave }: { player: Player; settings: { pixKey: string; entryFee: string; whatsappNumber: string; whatsappMessage: string; roomUnlocked: boolean; roomLink: string; freeEntryThreshold: number }; hasFreeEntry: boolean; onLeave: () => void }) {
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
        <div className="mb-4">
          <div className="valor-display mb-4 px-4 py-4 text-center">
            <div className="text-[11px] uppercase tracking-[1px] text-muted-foreground">Valor da inscrição</div>
            <div className="title-gradient mt-1 text-[36px] leading-none">{settings.entryFee}</div>
          </div>

          <div className="pix-box p-[18px]">
            <div className="mb-2 flex items-center gap-2 text-sm font-bold">
              <QrCode className="h-4 w-4 text-primary-glow" /> Chave Pix
            </div>
            <div className="pix-code mb-3 px-3.5 py-3 text-[15px]">
              {settings.pixKey}
            </div>
            <button onClick={copy} className="btn-primary flex w-full items-center justify-center gap-2 rounded-[14px] px-5 py-3.5 text-[15px]">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? "Chave copiada!" : "Copiar chave Pix"}
            </button>
          </div>

          <a href={waLink} target="_blank" rel="noreferrer" className="btn-green mt-3 flex w-full items-center justify-center gap-2 rounded-[14px] px-5 py-3.5 text-[15px]">
            <MessageCircle className="h-4 w-4" /> Avisar admin no WhatsApp
          </a>

          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            Após pagar, o admin confirma sua inscrição no site.
          </p>
        </div>
      )}


      <div className="pix-box p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-bold">
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

      <button
        onClick={() => { if (confirm("Tem certeza que quer sair da sala? Sua inscrição será cancelada.")) onLeave(); }}
        className="btn-ghost mt-3 flex w-full items-center justify-center gap-2 rounded-md py-2.5 text-sm font-semibold"
      >
        <LogOut className="h-4 w-4" /> Sair da sala
      </button>
    </section>
  );
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

/* ---------- Ranking (list style, like reference) ---------- */
function Ranking({ history }: { history: Player[] }) {
  const [expanded, setExpanded] = useState(false);
  const sorted = [...history]
    .filter((p) => (p.matchesPlayed || 0) > 0)
    .sort((a, b) => (b.matchesPlayed || 0) - (a.matchesPlayed || 0));
  const shown = expanded ? sorted.slice(0, 50) : sorted.slice(0, 10);

  return (
    <section className="card-surface mb-4 p-5 animate-fade-up">
      <h2 className="mb-1 flex items-center gap-2 text-lg font-bold">
        <Crown className="h-5 w-5 text-warning" /> Ranking
      </h2>
      <p className="mb-4 text-xs text-muted-foreground">Jogadores mais ativos — por partidas jogadas</p>

      {sorted.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-surface-2/30 p-6 text-center text-sm text-muted-foreground">
          Ainda não há partidas registradas.
        </div>
      ) : (
        <>
          <ul className="flex flex-col gap-2">
            {shown.map((p, i) => {
              const pos = i + 1;
              const isTop1 = pos === 1;
              const isTop2 = pos === 2;
              const isTop3 = pos === 3;
              const rowBg =
                isTop1 ? "bg-gradient-to-r from-yellow-400/15 to-transparent border-yellow-400/40" :
                isTop2 ? "bg-gradient-to-r from-slate-300/15 to-transparent border-slate-300/40" :
                isTop3 ? "bg-gradient-to-r from-amber-600/15 to-transparent border-amber-600/40" :
                         "bg-surface-2/40 border-border";
              const posColor =
                isTop1 ? "text-yellow-400" :
                isTop2 ? "text-slate-300" :
                isTop3 ? "text-amber-500" :
                         "text-muted-foreground";
              const medal = isTop1 ? "🥇" : isTop2 ? "🥈" : isTop3 ? "🥉" : null;
              return (
                <li key={p.id} className={`flex items-center gap-3 rounded-lg border p-2.5 transition hover:border-primary/40 ${rowBg} animate-fade-up`} style={{ animationDelay: `${i * 30}ms` }}>
                  <span className={`w-8 shrink-0 text-center text-lg font-black tabular-nums ${posColor}`}>{pos}</span>
                  {medal && <span className="shrink-0 text-lg">{medal}</span>}
                  <span className="min-w-0 flex-1 truncate text-sm font-bold">{p.nick || p.name}</span>
                  <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
                    {p.matchesPlayed} {p.matchesPlayed === 1 ? "partida" : "partidas"}
                  </span>
                </li>
              );
            })}
          </ul>

          {sorted.length > 10 && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="btn-ghost mt-3 w-full rounded-md py-2 text-xs font-semibold uppercase tracking-wide"
            >
              {expanded ? "Mostrar menos" : `Ver todos (${sorted.length})`}
            </button>
          )}
        </>
      )}
    </section>
  );
}


/* ---------- Admin ---------- */
function AdminSection({
  isAdmin, setIsAdmin, state, update,
}: {
  isAdmin: boolean;
  setIsAdmin: (v: boolean) => void;
  state: import("@/lib/arena-store").ArenaState;
  update: (u: (s: import("@/lib/arena-store").ArenaState) => import("@/lib/arena-store").ArenaState) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pwd, setPwd] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"config" | "ranking" | "players">("config");

  const loginFn = useServerFn(adminLogin);
  const logoutFn = useServerFn(adminLogout);
  const statusFn = useServerFn(adminStatus);

  // Hydrate from server-side session cookie; local flag alone is not trusted.
  useEffect(() => {
    let alive = true;
    statusFn({})
      .then((r) => { if (alive) setIsAdmin(Boolean(r?.isAdmin)); })
      .catch(() => {});
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogin = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const r = await loginFn({ data: { password: pwd } });
      if (r?.ok) { setIsAdmin(true); setPwd(""); toast.success("Modo admin ativado"); }
      else setError("Senha incorreta");
    } catch (e) {
      setError(String((e as Error).message || "Falha no login"));
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = async () => {
    try { await logoutFn({}); } catch { /* ignore */ }
    setIsAdmin(false);
    toast.info("Você saiu do modo admin");
  };

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
              <input type="password" className="input-field" placeholder="Senha" value={pwd} disabled={busy}
                onChange={(e) => { setPwd(e.target.value); setError(""); }}
                onKeyDown={(e) => { if (e.key === "Enter") void handleLogin(); }} />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <button className="btn-primary rounded-md py-2.5 font-semibold" disabled={busy}
                onClick={() => void handleLogin()}>
                {busy ? "Verificando..." : "Entrar como admin"}
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
                <button onClick={() => void handleLogout()} className="btn-ghost flex w-full items-center justify-center gap-2 rounded-md py-2.5 font-semibold">
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
  const [finalizeOpen, setFinalizeOpen] = useState(false);
  const [winnerId, setWinnerId] = useState("");
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

  const openFinalize = () => {
    if (state.registered.length === 0) { toast.error("Sem inscritos"); return; }
    setWinnerId("");
    setFinalizeOpen(true);
  };

  const confirmFinalize = () => {
    const winner = state.registered.find((p) => p.id === winnerId);
    const count = state.registered.length;
    update((st) => {
      const ids = new Set(st.registered.map((p) => p.id));
      const phones = new Set(st.registered.map((p) => p.phone));
      const history = st.history.map((p) =>
        ids.has(p.id) || phones.has(p.phone) ? { ...p, matchesPlayed: (p.matchesPlayed || 0) + 1 } : p
      );
      let next: import("@/lib/arena-store").ArenaState = { ...st, history, registered: [] };
      next = pushFeed(next, { type: "diario", message: `Diário finalizado! +1 partida para ${count} jogadores` });
      if (winner) {
        next = pushFeed(next, { type: "vencedor", message: `🏆 ${winner.nick || winner.name} venceu o campeonato!` });
      }
      return next;
    });
    setFinalizeOpen(false);
    setWinnerId("");
    toast.success(winner ? `${winner.nick || winner.name} venceu! Diário finalizado.` : "Diário finalizado!");
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

      <button onClick={openFinalize} className="btn-primary mt-2 flex items-center justify-center gap-2 rounded-md py-3 font-bold">
        <Flag className="h-4 w-4" /> Finalizar diário (+1 partida p/ inscritos)
      </button>

      {finalizeOpen && (
        <div className="rounded-xl border border-primary/40 bg-primary/10 p-4 animate-fade-up">
          <div className="mb-2 flex items-center gap-2 text-sm font-bold text-primary-glow">
            <Trophy className="h-4 w-4" /> Selecione o vencedor (opcional)
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            Isso vai adicionar +1 partida para os {state.registered.length} inscritos e limpar a lista. Selecionar o vencedor não altera o ranking, apenas registra no feed.
          </p>
          <select value={winnerId} onChange={(e) => setWinnerId(e.target.value)} className="input-field mb-3">
            <option value="">— Sem vencedor —</option>
            {state.registered.map((p) => (
              <option key={p.id} value={p.id}>{p.nick || p.name}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <button onClick={() => setFinalizeOpen(false)} className="btn-ghost flex-1 rounded-md py-2 text-sm font-semibold">Cancelar</button>
            <button onClick={confirmFinalize} className="btn-primary flex-1 rounded-md py-2 text-sm font-semibold">Confirmar</button>
          </div>
        </div>
      )}


      <div className="mt-4 border-t border-border pt-4">
        <p className="text-xs text-muted-foreground">
          🔒 A senha do admin agora fica armazenada de forma segura no servidor (variável de ambiente <code>ADMIN_PASSWORD</code>) e nunca trafega pelo banco público. Para alterá-la, atualize o segredo do projeto.
        </p>
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

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">Inscritos ({registered.length})</span>
      </div>

      {registered.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sem inscritos no momento.</p>
      ) : (
        registered.map((p) => (
          <div key={p.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-lg border border-border bg-surface-2/40 p-3 sm:flex">
            <div className="min-w-0 sm:flex-1">
              <div className="truncate font-semibold">{p.nick || p.name}</div>
              <div className="truncate text-xs text-muted-foreground">{p.name} • {p.phone}</div>
            </div>
            <div className="flex shrink-0 items-center gap-2 justify-self-end">
              <button onClick={() => togglePaid(p.id)} className={`chip shrink-0 ${p.paid ? "!text-success !border-success/40 !bg-success/15" : ""}`}>{p.paid ? "Pago" : "Marcar pago"}</button>
              <button onClick={() => removePlayer(p.id)} aria-label="Remover inscrito" className="btn-ghost grid h-9 w-9 shrink-0 place-items-center rounded-md text-destructive"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

