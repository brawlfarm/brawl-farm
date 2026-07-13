// Backend-shared arena state via Lovable Cloud (Supabase).
import { supabase } from "@/integrations/supabase/client";

export type Player = {
  id: string;
  name: string;
  phone: string;
  nick?: string;
  registeredAt?: number;
  paid?: boolean;
  matchesPlayed: number;
};

export type Settings = {
  totalSlots: number;
  entryFee: string;
  pixKey: string;
  roomLink: string;
  roomUnlocked: boolean;
  diaryOpen: boolean;
  adminPassword: string;
  whatsappNumber: string;
  whatsappMessage: string;
  freeEntryThreshold: number;
};

export type FeedEvent = {
  id: string;
  type: "inscricao" | "pagamento" | "sala" | "vencedor" | "diario";
  message: string;
  at: number;
};

export type ArenaState = {
  settings: Settings;
  registered: Player[];
  history: Player[];
  feed: FeedEvent[];
};

const SESSION_KEY = "arena_brawl_session_v1";
const ADMIN_KEY = "arena_brawl_admin_v1";

export const defaultState: ArenaState = {
  settings: {
    totalSlots: 9,
    entryFee: "R$ 10,00",
    pixKey: "seu-pix@exemplo.com",
    roomLink: "",
    roomUnlocked: false,
    diaryOpen: true,
    adminPassword: "admin123",
    whatsappNumber: "5511999999999",
    whatsappMessage: "Olá! Paguei o Pix da inscrição do campeonato.",
    freeEntryThreshold: 10,
  },
  registered: [],
  history: [],
  feed: [],
};

function merge(raw: Partial<ArenaState> | null | undefined): ArenaState {
  const s = raw ?? {};
  return {
    ...defaultState,
    ...s,
    settings: { ...defaultState.settings, ...(s.settings ?? {}) },
    registered: s.registered ?? [],
    history: s.history ?? [],
    feed: s.feed ?? [],
  };
}

export async function fetchState(): Promise<ArenaState> {
  const { data, error } = await supabase
    .from("arena_state")
    .select("data")
    .eq("id", 1)
    .maybeSingle();
  if (error) {
    console.error("[arena] fetch error", error);
    return defaultState;
  }
  return merge((data?.data as Partial<ArenaState>) ?? null);
}

export async function persistState(next: ArenaState): Promise<void> {
  const { error } = await supabase
    .from("arena_state")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .upsert({ id: 1, data: next as any, updated_at: new Date().toISOString() });
  if (error) console.error("[arena] persist error", error);
}

export type Session = { name: string; phone: string } | null;

export function loadSession(): Session {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); } catch { return null; }
}
export function saveSession(s: Session) {
  if (typeof window === "undefined") return;
  if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  else localStorage.removeItem(SESSION_KEY);
}

export function loadAdmin(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(ADMIN_KEY) === "1";
}
export function saveAdmin(v: boolean) {
  if (typeof window === "undefined") return;
  if (v) localStorage.setItem(ADMIN_KEY, "1");
  else localStorage.removeItem(ADMIN_KEY);
}

export function uid() { return Math.random().toString(36).slice(2, 10); }

export function pushFeed(state: ArenaState, evt: Omit<FeedEvent, "id" | "at">): ArenaState {
  const event: FeedEvent = { ...evt, id: uid(), at: Date.now() };
  return { ...state, feed: [event, ...state.feed].slice(0, 30) };
}

export function upsertHistory(state: ArenaState, player: Player): ArenaState {
  const idx = state.history.findIndex(
    (p) => p.phone === player.phone || (p.nick && player.nick && p.nick.toLowerCase() === player.nick.toLowerCase())
  );
  const history = [...state.history];
  if (idx >= 0) {
    history[idx] = { ...history[idx], ...player, matchesPlayed: history[idx].matchesPlayed };
  } else {
    history.push({ ...player, matchesPlayed: player.matchesPlayed ?? 0 });
  }
  return { ...state, history };
}
