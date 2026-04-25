import { io, type Socket } from "socket.io-client";
import type { ClientGameState, HostSettings } from "../types";

/**
 * In dev, talk to the game server on :3001 on the **same host as the page** so LAN
 * devices (http://192.168.x.x:5173) hit the PC's API, not localhost on the phone.
 * Optional override: VITE_SOCKET_URL. Production: set VITE_SOCKET_URL to your API origin.
 */
function devSocketUrl(): string {
  if (typeof window === "undefined") return "http://localhost:3001";
  return `${window.location.protocol}//${window.location.hostname}:3001`;
}

const URL =
  import.meta.env.VITE_SOCKET_URL ||
  (import.meta.env.DEV ? devSocketUrl() : "");

export function createSocket(): Socket {
  return io(URL || undefined, {
    path: "/socket.io",
    transports: ["websocket", "polling"],
    autoConnect: false,
  });
}

export function persistSession(code: string, playerId: string) {
  localStorage.setItem("spyfall_code", code);
  localStorage.setItem("spyfall_pid", playerId);
  // Helps persistence across switching between localhost / LAN IP on the same machine.
  // Hash does not hit the server and survives refresh.
  if (typeof window !== "undefined") {
    const c = encodeURIComponent(code);
    const p = encodeURIComponent(playerId);
    window.location.hash = `#code=${c}&pid=${p}`;
  }
}

function readSessionFromHash(): { code: string; playerId: string } | null {
  if (typeof window === "undefined") return null;
  const h = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
  if (!h) return null;
  const params = new URLSearchParams(h);
  const code = params.get("code");
  const playerId = params.get("pid");
  if (!code || !playerId) return null;
  return { code: decodeURIComponent(code), playerId: decodeURIComponent(playerId) };
}

export function readSession(): { code: string; playerId: string } | null {
  const code = localStorage.getItem("spyfall_code");
  const playerId = localStorage.getItem("spyfall_pid");
  if (code && playerId) return { code, playerId };
  const fromHash = readSessionFromHash();
  if (fromHash) {
    // Rehydrate localStorage for subsequent loads.
    localStorage.setItem("spyfall_code", fromHash.code);
    localStorage.setItem("spyfall_pid", fromHash.playerId);
  }
  return fromHash;
}

export function clearSession() {
  localStorage.removeItem("spyfall_code");
  localStorage.removeItem("spyfall_pid");
  if (typeof window !== "undefined") window.location.hash = "";
}

export type AckOk<T> = { ok: true } & T;
export type AckErr = { ok: false; error: string };

export async function emitAck<T>(
  socket: Socket,
  event: string,
  payload?: object
): Promise<T | AckErr> {
  return new Promise((resolve) => {
    socket.timeout(8000).emit(event, payload ?? {}, (res: unknown) => {
      resolve(res as T | AckErr);
    });
  });
}

export type ClientApi = {
  createRoom: (playerName: string) => Promise<{ ok: true; code: string; playerId: string } | AckErr>;
  joinRoom: (code: string, playerName: string) => Promise<{ ok: true; code: string; playerId: string } | AckErr>;
  resume: (code: string, playerId: string) => Promise<{ ok: true } | AckErr>;
  updateSettings: (s: Partial<HostSettings>) => void;
  startGame: () => void;
  lobbyChat: (text: string) => void;
  discussionChat: (text: string) => void;
  submitClue: (text: string) => void;
  vote: (targetId: string) => void;
  leaveGame: () => void;
  onState: (cb: (s: ClientGameState) => void) => void;
  onErrorMsg: (cb: (m: string) => void) => void;
};

export function bindApi(socket: Socket): ClientApi {
  return {
    createRoom: (playerName) => emitAck(socket, "create_room", { playerName }),
    joinRoom: (code, playerName) => emitAck(socket, "join_room", { code, playerName }),
    resume: (code, playerId) => emitAck(socket, "resume", { code, playerId }),
    updateSettings: (s) => socket.emit("update_settings", s),
    startGame: () => socket.emit("start_game"),
    lobbyChat: (text) => socket.emit("lobby_chat", { text }),
    discussionChat: (text) => socket.emit("discussion_chat", { text }),
    submitClue: (text) => socket.emit("submit_clue", { text }),
    vote: (targetId) => socket.emit("vote", { targetId }),
    leaveGame: () => socket.emit("leave_game"),
    onState: (cb) => socket.on("state", cb),
    onErrorMsg: (cb) => socket.on("error_msg", (p: { message?: string }) => cb(p?.message ?? "Error")),
  };
}
