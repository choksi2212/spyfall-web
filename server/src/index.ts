import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });
import cors from "cors";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import type { Category, HostSettings } from "./types.js";
import { RoomManager } from "./room.js";
import { WordService } from "./wordService.js";

const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || "0.0.0.0";
const isProd = process.env.NODE_ENV === "production";
/** Dev: reflect browser Origin so LAN (e.g. http://192.168.x.x:5173) works. Prod: single origin. */
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";
const corsOrigin: string | boolean | string[] = isProd ? CLIENT_ORIGIN : true;

const app = express();
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: corsOrigin, credentials: true },
});

const wordService = new WordService();
await wordService.load();
const mgr = new RoomManager(io, wordService);

io.on("connection", (socket) => {
  socket.on(
    "create_room",
    (payload: { playerName: string }, ack?: (r: unknown) => void) => {
      const name = String(payload?.playerName ?? "");
      const res = mgr.createRoom(socket.id, name);
      if (res.ok) {
        socket.join(`room:${res.code}`);
        ack?.({ ok: true, code: res.code, playerId: res.playerId });
      } else ack?.(res);
    }
  );

  socket.on(
    "join_room",
    (payload: { code: string; playerName: string }, ack?: (r: unknown) => void) => {
      const code = String(payload?.code ?? "");
      const name = String(payload?.playerName ?? "");
      const res = mgr.joinRoom(socket.id, code, name);
      if (res.ok) {
        const upper = code.trim().toUpperCase();
        socket.join(`room:${upper}`);
        ack?.({ ok: true, playerId: res.playerId, code: upper });
      } else ack?.(res);
    }
  );

  socket.on(
    "resume",
    (payload: { code: string; playerId: string }, ack?: (r: unknown) => void) => {
      const code = String(payload?.code ?? "").trim().toUpperCase();
      const playerId = String(payload?.playerId ?? "");
      const room = mgr.rooms.get(code);
      if (!room) {
        ack?.({ ok: false, error: "Room gone" });
        return;
      }
      const p = room.players.get(playerId);
      if (!p || p.leftPermanently) {
        ack?.({ ok: false, error: "Cannot resume" });
        return;
      }
      mgr.socketToRoom.set(socket.id, code);
      mgr.socketToPlayer.set(socket.id, { roomCode: code, playerId });
      room.attachSocket(playerId, socket.id);
      socket.join(`room:${code}`);
      ack?.({ ok: true });
      room.broadcastPublic();
    }
  );

  socket.on("update_settings", (payload: Partial<HostSettings>) => {
    const b = mgr.getBinding(socket.id);
    if (!b) return;
    const room = mgr.rooms.get(b.roomCode);
    if (!room) return;
    const cat = payload.category as Category | undefined;
    const next: Partial<HostSettings> = { ...payload };
    if (cat) next.category = cat;
    const r = room.updateSettings(b.playerId, next);
    if (r.ok) room.broadcastPublic();
  });

  socket.on("start_game", () => {
    const b = mgr.getBinding(socket.id);
    if (!b) return;
    const room = mgr.rooms.get(b.roomCode);
    if (!room) return;
    const r = room.startGame(b.playerId);
    if (!r.ok) socket.emit("error_msg", { message: r.error });
  });

  socket.on("lobby_chat", (payload: { text: string }) => {
    const b = mgr.getBinding(socket.id);
    if (!b) return;
    const room = mgr.rooms.get(b.roomCode);
    if (!room) return;
    const r = room.postLobbyChat(b.playerId, String(payload?.text ?? ""));
    if (r.ok) room.broadcastPublic();
  });

  socket.on("discussion_chat", (payload: { text: string }) => {
    const b = mgr.getBinding(socket.id);
    if (!b) return;
    const room = mgr.rooms.get(b.roomCode);
    if (!room) return;
    const r = room.postDiscussionChat(b.playerId, String(payload?.text ?? ""));
    if (r.ok) room.broadcastPublic();
  });

  socket.on("submit_clue", (payload: { text: string }) => {
    const b = mgr.getBinding(socket.id);
    if (!b) return;
    const room = mgr.rooms.get(b.roomCode);
    if (!room) return;
    const r = room.submitClue(b.playerId, String(payload?.text ?? ""));
    if (r.ok) room.broadcastPublic();
    else socket.emit("error_msg", { message: r.error });
  });

  socket.on("vote", (payload: { targetId: string }) => {
    const b = mgr.getBinding(socket.id);
    if (!b) return;
    const room = mgr.rooms.get(b.roomCode);
    if (!room) return;
    const r = room.vote(b.playerId, String(payload?.targetId ?? ""));
    if (r.ok) room.broadcastPublic();
    else socket.emit("error_msg", { message: r.error });
  });

  socket.on("leave_game", () => {
    mgr.permanentLeave(socket.id);
  });

  socket.on("disconnect", () => {
    mgr.leaveAll(socket.id);
  });
});

httpServer.listen(PORT, HOST, () => {
  const lanHint = HOST === "0.0.0.0" ? `  (LAN: http://<this-machine-ip>:${PORT})` : "";
  console.log(
    `[spyfall] listening ${HOST}:${PORT}${lanHint}  cors: ${isProd ? CLIENT_ORIGIN : "dev (any origin)"}`
  );
  if (!process.env.SUPABASE_URL) console.warn("[spyfall] SUPABASE_URL missing — DB persistence off");
});
