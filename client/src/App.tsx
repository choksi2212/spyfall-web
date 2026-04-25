import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  bindApi,
  clearSession,
  createSocket,
  persistSession,
  readSession,
} from "./lib/socket";
import type { ClientGameState } from "./types";
import { Landing } from "./screens/Landing";
import { Lobby } from "./screens/Lobby";
import { GameScreen } from "./screens/GameScreen";

export default function App() {
  const socket = useMemo(() => createSocket(), []);
  const api = useMemo(() => bindApi(socket), [socket]);
  const [connected, setConnected] = useState(false);
  const [state, setState] = useState<ClientGameState | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [resumeState, setResumeState] = useState<"idle" | "trying">("idle");

  useEffect(() => {
    api.onState((s) => setState(s));
    api.onErrorMsg((m) => {
      setToast(m);
      setTimeout(() => setToast(null), 3200);
    });
    const onConnect = () => {
      setConnected(true);
      const saved = readSession();
      if (saved) {
        void (async () => {
          setResumeState("trying");
          const watchdog = window.setTimeout(() => {
            clearSession();
            setState(null);
            setResumeState("idle");
            setToast("Resume timed out. Please join again.");
          }, 10_000);

          try {
            const r = await api.resume(saved.code, saved.playerId);
            if (!("ok" in r) || !r.ok) {
              clearSession();
              setState(null);
              setToast((r as { error?: string })?.error ?? "Cannot resume");
            }
          } finally {
            window.clearTimeout(watchdog);
            setResumeState("idle");
          }
        })();
      }
    };
    socket.on("connect", onConnect);
    socket.on("disconnect", () => {
      setConnected(false);
      setResumeState("idle");
    });
    socket.connect();

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect");
      socket.removeAllListeners();
      socket.close();
    };
  }, [api, socket]);

  // Persist the latest known session so refresh is always recoverable.
  useEffect(() => {
    if (!state?.roomCode || !state?.you?.id) return;
    persistSession(state.roomCode, state.you.id);
  }, [state?.roomCode, state?.you?.id]);

  const onCreated = useCallback(
    async (name: string) => {
      const r = await api.createRoom(name);
      if ("ok" in r && r.ok) {
        persistSession(r.code, r.playerId);
      } else setToast((r as { error: string }).error);
    },
    [api]
  );

  const onJoined = useCallback(
    async (code: string, name: string) => {
      const r = await api.joinRoom(code, name);
      if ("ok" in r && r.ok) {
        persistSession(r.code, r.playerId);
      } else setToast((r as { error: string }).error);
    },
    [api]
  );

  const leaveForever = useCallback(() => {
    api.leaveGame();
    clearSession();
    setState(null);
  }, [api]);

  const view = !state ? (
    resumeState === "trying" ? (
      <div className="vd-panel rounded-2xl p-6 text-center">
        <p className="font-display text-xs uppercase tracking-widest text-mystic-gold">Rejoining</p>
        <p className="vd-subtitle mt-2 text-mystic-mist">Calling you back to the circle…</p>
      </div>
    ) : (
      <Landing key="land" connected={connected} onCreate={onCreated} onJoin={onJoined} />
    )
  ) : state.phase === "lobby" ? (
    <Lobby key="lobby" api={api} state={state} onLeave={leaveForever} />
  ) : (
    <GameScreen key="game" api={api} state={state} onLeave={leaveForever} />
  );

  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden">
      <div className="vd-fog" aria-hidden />
      <div className="vd-vignette" aria-hidden />
      <header className="relative z-50 shrink-0 px-4 pt-4 text-center">
        <h1 className="vd-title text-2xl sm:text-3xl text-mystic-gold">SPYFALL</h1>
        <p className="vd-subtitle mt-1 text-sm text-mystic-mist">secrets of mystic falls</p>
        {!connected && (
          <p className="mt-2 text-xs uppercase tracking-widest text-mystic-crimson">connecting…</p>
        )}
      </header>
      <main
        className={`relative z-10 mx-auto w-full flex-1 min-h-0 px-4 pb-4 pt-4 ${
          state?.phase === "lobby"
            ? "max-w-6xl overflow-hidden"
            : state
              ? "max-w-4xl"
              : "max-w-lg"
        }`}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={state?.phase ?? "x"}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="h-full min-h-0"
          >
            {view}
          </motion.div>
        </AnimatePresence>
      </main>
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed bottom-6 left-1/2 z-[100] w-[90vw] max-w-sm -translate-x-1/2 rounded border border-mystic-crimson/50 bg-black/85 px-4 py-3 text-center font-body text-sm text-mystic-pale shadow-glow"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
