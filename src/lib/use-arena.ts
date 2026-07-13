import { useEffect, useState, useCallback } from "react";
import {
  loadState, saveState, loadSession, saveSession, loadAdmin, saveAdmin,
  type ArenaState, type Session,
} from "./arena-store";

export function useArena() {
  const [state, setState] = useState<ArenaState>(() => loadState());
  const [session, setSessionState] = useState<Session>(() => loadSession());
  const [isAdmin, setIsAdminState] = useState<boolean>(() => loadAdmin());

  useEffect(() => {
    const sync = () => {
      setState(loadState());
      setSessionState(loadSession());
      setIsAdminState(loadAdmin());
    };
    window.addEventListener("storage", sync);
    window.addEventListener("arena:update", sync as EventListener);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("arena:update", sync as EventListener);
    };
  }, []);

  const update = useCallback((updater: (s: ArenaState) => ArenaState) => {
    const next = updater(loadState());
    saveState(next);
    setState(next);
  }, []);

  const setSession = useCallback((s: Session) => { saveSession(s); setSessionState(s); }, []);
  const setIsAdmin = useCallback((v: boolean) => { saveAdmin(v); setIsAdminState(v); }, []);

  return { state, update, session, setSession, isAdmin, setIsAdmin };
}
