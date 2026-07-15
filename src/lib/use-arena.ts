import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  defaultState, fetchState, persistState,
  loadSession, saveSession, loadAdmin, saveAdmin,
  type ArenaState, type Session,
} from "./arena-store";

async function ensureAnonymousSession(): Promise<void> {
  const { data, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (data.session) return;

  const { error: signInError } = await supabase.auth.signInAnonymously();
  if (signInError) throw signInError;
}

export function useArena() {
  const [state, setState] = useState<ArenaState>(defaultState);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [session, setSessionState] = useState<Session>(() => loadSession());
  const [isAdmin, setIsAdminState] = useState<boolean>(() => loadAdmin());
  const stateRef = useRef(state);
  const writeQueueRef = useRef<Promise<void>>(Promise.resolve());
  stateRef.current = state;

  useEffect(() => {
    let alive = true;
    let channel: ReturnType<typeof supabase.channel> | undefined;

    const connect = async () => {
      try {
        // Finish authentication before enabling writes. Previously this ran in
        // parallel, so the first action on a new Vercel domain was rejected.
        await ensureAnonymousSession();
      } catch (error) {
        console.error("[arena] anon sign-in failed", error);
      }

      const freshState = await fetchState();
      if (!alive) return;
      stateRef.current = freshState;
      setState(freshState);
      setLoading(false);

      channel = supabase
        .channel("arena_state_changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "arena_state", filter: "id=eq.1" },
          (payload) => {
            const row = payload.new as { data?: ArenaState } | null;
            if (!row?.data) return;
            stateRef.current = row.data;
            setState(row.data);
          },
        )
        .subscribe((status) => {
          if (alive) setConnected(status === "SUBSCRIBED");
        });
    };

    void connect();

    return () => {
      alive = false;
      if (channel) void supabase.removeChannel(channel);
    };
  }, []);

  const update = useCallback((updater: (s: ArenaState) => ArenaState) => {
    const next = updater(stateRef.current);
    stateRef.current = next;
    setState(next);

    // Preserve action order and re-check auth before every database write.
    writeQueueRef.current = writeQueueRef.current
      .then(async () => {
        await ensureAnonymousSession();
        await persistState(next);
      })
      .catch(async (error) => {
        console.error("[arena] queued write failed", error);
        const freshState = await fetchState();
        stateRef.current = freshState;
        setState(freshState);
      });
  }, []);

  const setSession = useCallback((s: Session) => { saveSession(s); setSessionState(s); }, []);
  const setIsAdmin = useCallback((v: boolean) => { saveAdmin(v); setIsAdminState(v); }, []);

  return { state, update, session, setSession, isAdmin, setIsAdmin, loading, connected };
}
