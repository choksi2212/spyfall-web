import { useEffect, useMemo, useRef, useState } from "react";
import type { ClientApi } from "../lib/socket";
import type { Category, ClientGameState, HostSettings } from "../types";

const CATS: { id: Category; label: string }[] = [
  { id: "random", label: "Random" },
  { id: "sports", label: "Sports" },
  { id: "countries", label: "Countries" },
  { id: "objects", label: "Objects" },
  { id: "places", label: "Places" },
  { id: "animals", label: "Animals" },
  { id: "transport", label: "Transport" },
  { id: "technology", label: "Technology" },
  { id: "science", label: "Science" },
];

type Props = {
  api: ClientApi;
  state: ClientGameState;
  onLeave: () => void;
};

export function Lobby({ api, state, onLeave }: Props) {
  const [chat, setChat] = useState("");
  const isHost = state.you.id === state.hostId;
  const s = state.settings!;
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const lastLobbyMsgId = state.lobbyChat.at(-1)?.id ?? "";

  const settings = useMemo(
    () => ({
      spyCount: s.spyCount,
      discussionSec: s.discussionSec,
      maxRounds: s.maxRounds,
      category: s.category,
    }),
    [s]
  );

  const pushSettings = (patch: Partial<HostSettings>) => {
    api.updateSettings({ ...settings, ...patch });
  };

  // Jump to latest whenever anyone sends (including while you were reading older messages).
  useEffect(() => {
    if (!lastLobbyMsgId) return;
    const el = chatScrollRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [lastLobbyMsgId]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
      {/* Left: room + host settings + coven — no column scroll; natural height */}
      <aside className="flex w-full min-w-0 flex-col gap-2 lg:w-[min(100%,360px)] lg:shrink-0 xl:w-[380px]">
        <div className="vd-panel rounded-2xl p-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="font-display text-xs uppercase tracking-widest text-mystic-gold/70">Room</p>
              <p className="font-display text-2xl tracking-[0.25em] text-mystic-pale">{state.roomCode}</p>
            </div>
            <button
              type="button"
              className="vd-btn-ghost shrink-0 rounded-lg px-3 py-1 font-display text-[10px] uppercase tracking-widest text-mystic-mist"
              onClick={onLeave}
            >
              Leave
            </button>
          </div>
          <p className="mt-1.5 font-body text-sm text-mystic-mist">
            Share the code. When the circle is ready, the host begins the ritual.
          </p>
        </div>

        {isHost && (
          <div className="vd-panel space-y-2 rounded-2xl p-3">
            <p className="font-display text-xs uppercase tracking-widest text-mystic-gold">Host settings</p>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-sm">
                <span className="text-mystic-mist">Spies</span>
                <input
                  type="number"
                  min={1}
                  max={12}
                  className="vd-input mt-1 w-full rounded-lg px-2 py-1 text-sm"
                  value={s.spyCount}
                  onChange={(e) => pushSettings({ spyCount: Number(e.target.value) })}
                />
              </label>
              <label className="block text-sm">
                <span className="text-mystic-mist">Discussion (sec)</span>
                <input
                  type="number"
                  min={30}
                  max={600}
                  className="vd-input mt-1 w-full rounded-lg px-2 py-1 text-sm"
                  value={s.discussionSec}
                  onChange={(e) => pushSettings({ discussionSec: Number(e.target.value) })}
                />
              </label>
              <label className="col-span-2 block text-sm">
                <span className="text-mystic-mist">Max rounds</span>
                <input
                  type="number"
                  min={1}
                  max={20}
                  className="vd-input mt-1 w-full rounded-lg px-2 py-1 text-sm"
                  value={s.maxRounds}
                  onChange={(e) => pushSettings({ maxRounds: Number(e.target.value) })}
                />
              </label>
            </div>
            <div>
              <p className="mb-1 text-xs text-mystic-mist">Category</p>
              <div className="flex flex-wrap gap-1.5">
                {CATS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={`rounded-full border px-2.5 py-1 font-display text-[10px] uppercase tracking-wider ${
                      s.category === c.id
                        ? "border-mystic-gold bg-mystic-crimson/30 text-mystic-gold"
                        : "border-white/10 text-mystic-mist"
                    }`}
                    onClick={() => pushSettings({ category: c.id })}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="vd-panel rounded-2xl p-3">
          <p className="font-display text-xs uppercase tracking-widest text-mystic-gold">Coven</p>
          <ul className="mt-2 space-y-1 font-body text-mystic-pale">
            {state.players.map((p) => (
              <li key={p.id} className="flex justify-between text-sm">
                <span>
                  {p.name}
                  {p.id === state.hostId ? (
                    <span className="ml-2 text-[10px] uppercase tracking-widest text-mystic-gold">host</span>
                  ) : null}
                </span>
                <span className={p.isConnected ? "text-emerald-400/80" : "text-mystic-mist"}>
                  {p.isConnected ? "●" : "○"}
                </span>
              </li>
            ))}
          </ul>
          {isHost && (
            <button
              type="button"
              disabled={!state.canStart}
              className="vd-btn-primary mt-4 w-full rounded-xl py-3 font-display text-sm uppercase tracking-[0.25em] text-mystic-pale disabled:opacity-35"
              onClick={() => api.startGame()}
            >
              Begin the night
            </button>
          )}
          {state.startError && (
            <p className="mt-2 text-center text-xs text-mystic-crimson">{state.startError}</p>
          )}
        </div>
      </aside>

      {/* Right: explicit height so only this column scrolls inside the message area */}
      <section className="flex h-[min(58vh,calc(100dvh-14rem))] min-h-[280px] w-full min-w-0 flex-1 flex-col sm:h-[min(62vh,calc(100dvh-13rem))] lg:h-[calc(100dvh-9.5rem)] lg:max-h-[calc(100dvh-9.5rem)]">
        <div className="vd-panel flex h-full min-h-0 flex-col overflow-hidden rounded-2xl">
          <div className="shrink-0 border-b border-mystic-gold/15 px-4 py-3">
            <p className="font-display text-xs uppercase tracking-widest text-mystic-gold">Whispers</p>
            <p className="vd-subtitle mt-0.5 text-xs text-mystic-mist/90">Lobby — speak softly</p>
          </div>

          <div
            ref={chatScrollRef}
            className="vd-chat-scroll space-y-2 px-4 py-3 font-body text-sm text-mystic-pale/95"
          >
            {state.lobbyChat.length === 0 ? (
              <p className="text-center text-mystic-mist/70">No messages yet. Break the silence…</p>
            ) : (
              state.lobbyChat.map((m) => (
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

          <form
            className="shrink-0 border-t border-mystic-gold/15 p-3"
            onSubmit={(e) => {
              e.preventDefault();
              const t = chat.trim();
              if (!t) return;
              api.lobbyChat(t);
              setChat("");
            }}
          >
            <div className="flex gap-2">
              <input
                className="vd-input min-w-0 flex-1 rounded-lg px-3 py-2 text-sm"
                value={chat}
                maxLength={500}
                onChange={(e) => setChat(e.target.value)}
                placeholder="Speak softly…"
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
        </div>
      </section>
    </div>
  );
}
