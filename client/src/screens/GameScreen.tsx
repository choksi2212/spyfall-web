import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { ClientApi } from "../lib/socket";
import type { ClientGameState } from "../types";

type Props = {
  api: ClientApi;
  state: ClientGameState;
  onLeave: () => void;
};

function useNow(interval = 250) {
  const [n, setN] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setN(Date.now()), interval);
    return () => window.clearInterval(id);
  }, [interval]);
  return n;
}

export function GameScreen({ api, state, onLeave }: Props) {
  const now = useNow();
  const [clue, setClue] = useState("");
  const [msg, setMsg] = useState("");
  const you = state.you;
  const spec = you.isSpectator;

  const activePlayers = useMemo(
    () => state.players.filter((p) => !p.isSpectator),
    [state.players]
  );

  const nameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of state.players) m.set(p.id, p.name);
    return m;
  }, [state.players]);

  const discussionScrollRef = useRef<HTMLDivElement>(null);
  const lastDiscussionMsgId = state.chat.at(-1)?.id ?? "";
  useEffect(() => {
    if (state.phase !== "discussion") return;
    if (!lastDiscussionMsgId) return;
    const el = discussionScrollRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [state.phase, lastDiscussionMsgId]);

  if (state.phase === "reveal") {
    const msLeft = state.you.revealEndsAt ? Math.max(0, state.you.revealEndsAt - now) : 0;
    return (
      <div className="vd-panel relative flex min-h-[320px] flex-col items-center justify-center rounded-2xl p-6 text-center">
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-b from-mystic-crimson/10 to-transparent" />
        <p className="font-display text-xs uppercase tracking-[0.4em] text-mystic-gold">The veil lifts</p>
        {you.role === "spy" && (
          <motion.div
            initial={{ scale: 0.94, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative z-10 mt-6"
          >
            <p className="font-display text-2xl uppercase tracking-widest text-mystic-crimson">You are the spy</p>
            <p className="vd-subtitle mt-3 max-w-xs text-mystic-mist">You never saw the word. Mingle. Misdirect. Survive.</p>
          </motion.div>
        )}
        {you.role === "citizen" && state.you.word && (
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative z-10 mt-8 font-display text-4xl uppercase tracking-wide text-mystic-pale"
          >
            {state.you.word}
          </motion.p>
        )}
        {spec && (
          <p className="vd-subtitle relative z-10 mt-8 text-mystic-mist">You watch from the shadows. The living still play.</p>
        )}
        <p className="relative z-10 mt-6 font-display text-sm text-mystic-gold/80">
          {(msLeft / 1000).toFixed(1)}s
        </p>
      </div>
    );
  }

  if (state.phase === "clues") {
    const turnId = state.currentTurnPlayerId;
    const isYourTurn = !spec && turnId === you.id;
    const deadline = state.clueTurnEndsAt;
    const clueLeft = deadline ? Math.max(0, deadline - now) : 0;
    const reviewOnly = !turnId && deadline != null && clueLeft > 0;

    return (
      <div className="space-y-4">
        <div className="vd-panel rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <p className="font-display text-xs uppercase tracking-widest text-mystic-gold">
              Round {state.roundNumber} — whispers
            </p>
            <button
              type="button"
              className="vd-btn-ghost rounded-lg px-2 py-1 text-[10px] uppercase tracking-widest"
              onClick={onLeave}
            >
              Leave
            </button>
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_360px] lg:items-start">
            <div className="vd-panel rounded-2xl p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-display text-xs uppercase tracking-widest text-mystic-gold/80">
                    {reviewOnly ? "Review" : "Turn"}
                  </p>
                  <p className="font-display text-lg text-mystic-pale">
                    {reviewOnly
                      ? "Read the gallery"
                      : turnId
                        ? nameById.get(turnId)
                        : "…"}
                  </p>
                </div>
                <p className="font-display text-base text-mystic-crimson">{(clueLeft / 1000).toFixed(1)}s</p>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {activePlayers.map((p) => {
                  const active = p.id === turnId;
                  return (
                    <span
                      key={p.id}
                      className={`rounded-full border px-3 py-1 font-display text-[11px] uppercase tracking-wider ${
                        active
                          ? "border-mystic-gold bg-mystic-crimson/35 text-mystic-gold"
                          : "border-white/10 text-mystic-mist"
                      }`}
                    >
                      {p.name}
                    </span>
                  );
                })}
              </div>

              {reviewOnly && (
                <p className="mt-4 text-center font-body text-sm text-mystic-mist">
                  Discussion begins in{" "}
                  <span className="text-mystic-gold">{(clueLeft / 1000).toFixed(1)}s</span>
                </p>
              )}
              {!reviewOnly && !isYourTurn && !spec && (
                <p className="mt-4 text-center font-body text-sm text-mystic-mist">
                  The moon turns to{" "}
                  <span className="text-mystic-gold">{turnId ? nameById.get(turnId) : "…"}</span>
                </p>
              )}
              {spec && (
                <p className="mt-4 text-center font-body text-sm text-mystic-mist">You observe in silence.</p>
              )}

              {isYourTurn && (
                <form
                  className="mt-4 space-y-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    api.submitClue(clue.trim().slice(0, 80));
                    setClue("");
                  }}
                >
                  <p className="text-center font-display text-xs text-mystic-crimson">
                    Your turn — {(clueLeft / 1000).toFixed(1)}s
                  </p>
                  <input
                    className="vd-input w-full rounded-lg px-3 py-3 font-body text-center text-lg"
                    maxLength={80}
                    value={clue}
                    onChange={(e) => setClue(e.target.value)}
                    placeholder="One message. Make it count."
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="vd-btn-primary w-full rounded-xl py-2 font-display text-xs uppercase tracking-widest"
                  >
                    Seal clue
                  </button>
                </form>
              )}
            </div>

            <div className="vd-panel rounded-2xl p-4">
              <p className="mb-2 text-center font-display text-xs uppercase tracking-widest text-mystic-gold/80">
                Gallery
              </p>
              <div className="space-y-2 font-body text-sm text-mystic-pale/90">
                {state.gallery.length === 0 ? (
                  <p className="text-center text-mystic-mist/70">No clues yet.</p>
                ) : (
                  state.gallery.map((g) => (
                    <div
                      key={`${g.playerId}-${g.text}`}
                      className="rounded-xl border border-white/10 bg-black/35 px-3 py-2"
                    >
                      <div className="font-display text-[11px] uppercase tracking-wider text-mystic-gold/90">
                        {g.playerName}
                      </div>
                      <div className="mt-0.5 break-words text-mystic-pale/95">{g.text}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (state.phase === "discussion") {
    const end = state.discussionEndsAt ?? 0;
    const left = Math.max(0, end - now);
    const canChat = !spec;

    return (
      <div className="flex h-[min(58vh,calc(100dvh-14rem))] min-h-[280px] w-full min-w-0 flex-col sm:h-[min(62vh,calc(100dvh-13rem))] lg:h-[calc(100dvh-9.5rem)] lg:max-h-[calc(100dvh-9.5rem)]">
        <div className="vd-panel flex h-full min-h-0 flex-col overflow-hidden rounded-2xl">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-mystic-gold/15 px-4 py-3">
            <div>
              <p className="font-display text-xs uppercase tracking-widest text-mystic-gold">Council</p>
              <p className="vd-subtitle mt-0.5 text-xs text-mystic-mist/90">Discussion — speak, accuse, defend</p>
            </div>
            <div className="text-right">
              <span className="font-display text-2xl text-mystic-crimson">{Math.ceil(left / 1000)}s</span>
              <button
                type="button"
                className="vd-btn-ghost ml-3 rounded-lg px-3 py-1 font-display text-[11px] uppercase tracking-widest text-mystic-mist"
                onClick={onLeave}
              >
                Leave room
              </button>
            </div>
          </div>

          <div
            ref={discussionScrollRef}
            className="vd-chat-scroll space-y-2 px-4 py-3 font-body text-base text-mystic-pale/95"
          >
            {state.chat.length === 0 ? (
              <p className="text-center text-mystic-mist/70">No messages yet. Start the council…</p>
            ) : (
              state.chat.map((m) => (
                <p key={m.id} className="break-words leading-relaxed">
                  <span className="font-display text-[11px] uppercase tracking-wide text-mystic-gold/95">
                    {m.fromName}
                  </span>
                  <span className="text-mystic-mist/60"> · </span>
                  {m.text}
                </p>
              ))
            )}
          </div>

          {canChat ? (
            <form
              className="shrink-0 border-t border-mystic-gold/15 p-3"
              onSubmit={(e) => {
                e.preventDefault();
                const t = msg.trim();
                if (!t) return;
                api.discussionChat(t);
                setMsg("");
              }}
            >
              <div className="flex gap-2">
                <input
                  className="vd-input min-w-0 flex-1 rounded-lg px-3 py-2.5 text-base"
                  value={msg}
                  maxLength={500}
                  onChange={(e) => setMsg(e.target.value)}
                  placeholder="Speak…"
                  autoComplete="off"
                />
                <button
                  type="submit"
                  className="vd-btn-ghost shrink-0 rounded-lg px-4 py-2 text-xs uppercase tracking-widest"
                >
                  Send
                </button>
              </div>
            </form>
          ) : (
            <div className="shrink-0 border-t border-mystic-gold/15 px-4 py-3 text-center text-sm text-mystic-mist">
              Spectating. No voice.
            </div>
          )}
        </div>
      </div>
    );
  }

  if (state.phase === "outcome") {
    const end = state.outcomeEndsAt ?? 0;
    const left = Math.max(0, end - now);
    return (
      <div className="vd-panel rounded-2xl p-6 text-center">
        <p className="font-display text-xs uppercase tracking-widest text-mystic-gold">Verdict</p>
        {state.lastElimination ? (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 font-display text-xl uppercase tracking-wide text-mystic-pale"
          >
            {state.lastElimination.name} was{" "}
            <span className={state.lastElimination.wasSpy ? "text-mystic-crimson" : "text-emerald-300"}>
              {state.lastElimination.wasSpy ? "a spy" : "innocent"}
            </span>
          </motion.p>
        ) : (
          <p className="vd-subtitle mt-4 text-mystic-mist">The council could not agree. No one falls tonight.</p>
        )}
        <p className="mt-4 font-display text-sm text-mystic-gold/70">{(left / 1000).toFixed(1)}s</p>
      </div>
    );
  }

  if (state.phase === "voting") {
    const end = state.votingEndsAt ?? 0;
    const left = Math.max(0, end - now);
    const canVote = !spec;

    return (
      <div className="vd-panel rounded-2xl p-4">
        <p className="font-display text-xs uppercase tracking-widest text-mystic-gold">Judgment</p>
        <p className="mt-1 font-body text-sm text-mystic-mist">
          Votes {state.votesCast}/{state.votesNeeded} · {(left / 1000).toFixed(1)}s
        </p>
        <ul className="mt-4 space-y-2">
          {activePlayers
            .filter((p) => p.id !== you.id)
            .map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  disabled={!canVote}
                  className={`w-full rounded-xl py-3 text-center font-display text-sm uppercase tracking-widest disabled:opacity-30 ${
                    state.yourVoteTargetId === p.id
                      ? "vd-btn-primary border-mystic-gold/60"
                      : "vd-btn-ghost"
                  }`}
                  onClick={() => api.vote(p.id)}
                >
                  {p.name}
                </button>
              </li>
            ))}
        </ul>
        {!canVote && (
          <p className="mt-3 text-center text-xs text-mystic-mist">The dead do not vote.</p>
        )}
      </div>
    );
  }

  if (state.phase === "ended") {
    const win = state.winner;
    return (
      <div className="vd-panel rounded-2xl p-6 text-center">
        <motion.p
          initial={{ scale: 1.08, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`font-display text-3xl uppercase tracking-[0.2em] ${
            win === "citizens" ? "text-emerald-300" : "text-mystic-crimson"
          }`}
        >
          {win === "citizens" ? "Town wins" : "Spies win"}
        </motion.p>
        <p className="vd-subtitle mt-4 text-mystic-mist">The word was revealed at last.</p>
        <p className="mt-2 font-display text-2xl text-mystic-gold">{state.secretWordReveal}</p>
        <p className="mt-6 text-sm text-mystic-mist/80">
          Returning to the lobby…
        </p>
        <button
          type="button"
          className="vd-btn-ghost mt-4 w-full rounded-xl py-3 font-display text-sm uppercase tracking-widest text-mystic-mist"
          onClick={onLeave}
        >
          Leave room
        </button>
      </div>
    );
  }

  return (
    <div className="vd-panel rounded-2xl p-4 text-center text-mystic-mist">
      <p className="font-body">The spirits are restless... unknown phase.</p>
    </div>
  );
}
