// Local storage store for the arena — works on any static host (GitHub Pages).
// All state is persisted client-side and broadcasted via 'storage' events across tabs.

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

export type ArenaState = {
  settings: Settings;
  registered: Player[]; // currently registered for tournament
  history: Player[]; // all-time known players (for ranking)
};

const KEY = "arena_brawl_state_v1";
const SESSION_KEY = "arena_brawl_session_v1";
const ADMIN_KEY = "arena_brawl_admin_v1";

const defaultState: ArenaState = {
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
};

export function loadState(): ArenaState {
  if (typeof window === "undefined") return defaultState;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw);
    return { ...defaultState, ...parsed, settings: { ...defaultState.settings, ...parsed.settings } };
  } catch {
    return defaultState;
  }
}

export function saveState(state: ArenaState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(state));
  // trigger cross-tab sync + custom event for same-tab listeners
  window.dispatchEvent(new StorageEvent("storage", { key: KEY }));
  window.dispatchEvent(new CustomEvent("arena:update"));
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
  window.dispatchEvent(new CustomEvent("arena:update"));
}

export function loadAdmin(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(ADMIN_KEY) === "1";
}
export function saveAdmin(v: boolean) {
  if (typeof window === "undefined") return;
  if (v) localStorage.setItem(ADMIN_KEY, "1");
  else localStorage.removeItem(ADMIN_KEY);
  window.dispatchEvent(new CustomEvent("arena:update"));
}

export function uid() { return Math.random().toString(36).slice(2, 10); }

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
