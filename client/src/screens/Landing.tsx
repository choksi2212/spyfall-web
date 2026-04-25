import { useState } from "react";
import { motion } from "framer-motion";

type Props = {
  connected: boolean;
  onCreate: (name: string) => void;
  onJoin: (code: string, name: string) => void;
};

export function Landing({ connected, onCreate, onJoin }: Props) {
  const [mode, setMode] = useState<"pick" | "create" | "join">("pick");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  return (
    <div className="vd-panel relative overflow-hidden rounded-2xl p-6">
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-mystic-crimson/15 blur-2xl" />
      {mode === "pick" && (
        <div className="space-y-4">
          <p className="vd-subtitle text-center text-mystic-mist">
            Enter the manor. Only those invited may join.
          </p>
          <button
            type="button"
            disabled={!connected}
            className="vd-btn-primary w-full rounded-xl px-4 py-3 font-display text-sm uppercase tracking-[0.2em] text-mystic-pale disabled:opacity-40"
            onClick={() => setMode("create")}
          >
            Host a room
          </button>
          <button
            type="button"
            disabled={!connected}
            className="vd-btn-ghost w-full rounded-xl px-4 py-3 font-display text-sm uppercase tracking-[0.2em] text-mystic-gold disabled:opacity-40"
            onClick={() => setMode("join")}
          >
            Join a room
          </button>
        </div>
      )}
      {mode !== "pick" && (
        <motion.form
          className="space-y-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onSubmit={(e) => {
            e.preventDefault();
            const n = name.trim().slice(0, 20);
            if (n.length < 1) return;
            if (mode === "create") void onCreate(n);
            else void onJoin(code.trim().toUpperCase(), n);
          }}
        >
          <label className="block">
            <span className="font-display text-xs uppercase tracking-widest text-mystic-gold/80">
              Your name
            </span>
            <input
              className="vd-input mt-1 w-full rounded-lg px-3 py-2 font-body text-lg"
              maxLength={20}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Elena, Damon, Stefan…"
            />
          </label>
          {mode === "join" && (
            <label className="block">
              <span className="font-display text-xs uppercase tracking-widest text-mystic-gold/80">
                Room code
              </span>
              <input
                className="vd-input mt-1 w-full rounded-lg px-3 py-2 font-body text-lg tracking-widest"
                maxLength={8}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="XXXXXX"
              />
            </label>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              className="vd-btn-ghost flex-1 rounded-xl py-2 font-display text-xs uppercase tracking-widest text-mystic-mist"
              onClick={() => setMode("pick")}
            >
              Back
            </button>
            <button
              type="submit"
              disabled={!connected || name.trim().length < 1 || (mode === "join" && code.trim().length < 4)}
              className="vd-btn-primary flex-[2] rounded-xl py-2 font-display text-xs uppercase tracking-widest text-mystic-pale disabled:opacity-40"
            >
              {mode === "create" ? "Create" : "Enter"}
            </button>
          </div>
        </motion.form>
      )}
    </div>
  );
}
