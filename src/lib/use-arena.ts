import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  defaultState, fetchState, persistState,
  loadSession, saveSession, loadAdmin, saveAdmin,
  type ArenaState, type Session,
} from "./arena-store";

export function useArena() {
  const [state, setState] = useState<ArenaState>(defaultState);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [session, setSessionState] = useState<Session>(() => loadSession());
  const [isAdmin, setIsAdminState] = useState<boolean>(() => loadAdmin());
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    let alive = true;
    fetchState().then((s) => {
      if (!alive) return;
      setState(s);
      setLoading(false);
    });

    const channel = supabase
      .channel("arena_state_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "arena_state" },
        (payload) => {
          const row = (payload.new ?? payload.old) as { data?: ArenaState } | null;
          if (row?.data) setState((prev) => ({ ...prev, ...row.data! }));
        }
      )
      .subscribe((status) => {
        setConnected(status === "SUBSCRIBED");
      });

    return () => { alive = false; supabase.removeChannel(channel); };
  }, []);

  const update = useCallback((updater: (s: ArenaState) => ArenaState) => {
    const next = updater(stateRef.current);
    setState(next);
    void persistState(next);
  }, []);

  const setSession = useCallback((s: Session) => { saveSession(s); setSessionState(s); }, []);
  const setIsAdmin = useCallback((v: boolean) => { saveAdmin(v); setIsAdminState(v); }, []);

  return { state, update, session, setSession, isAdmin, setIsAdmin, loading, connected };
}
