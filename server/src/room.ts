import { randomInt } from "node:crypto";
import { nanoid } from "nanoid";
import type { Server } from "socket.io";
import type {
  ChatMessage,
  ClientGameState,
  ClueEntry,
  HostSettings,
  Phase,
  PublicPlayer,
  Role,
} from "./types.js";
import { persistHostChange, persistRoomCreated } from "./supabaseClient.js";
import type { WordService } from "./wordService.js";

const CLUE_MAX = 80;
const REVEAL_MS = 3000;
const CLUE_TURN_MS = 20_000;
/** Pause after the last clue so everyone can read the gallery before discussion. */
const CLUE_REVIEW_MS = 5000;
const VOTE_MS = 15_000;
const END_TO_LOBBY_MS = 7000;
const LOBBY_CHAT_MAX = 500;
const DISCUSSION_CHAT_MAX = 500;
const NAME_MAX = 20;
const DISCONNECT_REMOVE_MS = 20_000;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

interface InternalPlayer {
  id: string;
  name: string;
  role: Role;
  socketId: string | null;
  eliminated: boolean;
  leftPermanently: boolean;
}

export class Room {
  readonly code: string;
  hostId: string;
  players = new Map<string, InternalPlayer>();
  leftPlayerNamesLower = new Set<string>();
  phase: Phase = "lobby";
  settings: HostSettings = {
    spyCount: 1,
    discussionSec: 120,
    maxRounds: 4,
    category: "random",
  };
  secretWord = "";
  resolvedCategory: string | null = null;
  roundNumber = 0;
  cyclesCompleted = 0;
  clueOrder: string[] = [];
  currentClueIndex = 0;
  gallery: ClueEntry[] = [];
  votes = new Map<string, string>();
  lobbyMessages: ChatMessage[] = [];
  discussionMessages: ChatMessage[] = [];
  lastElimination: { name: string; wasSpy: boolean } | null = null;
  winner: "citizens" | "spies" | null = null;
  revealEndsAt: number | null = null;
  clueTurnEndsAt: number | null = null;
  discussionEndsAt: number | null = null;
  votingEndsAt: number | null = null;
  outcomeEndsAt: number | null = null;
  timers: ReturnType<typeof setTimeout>[] = [];
  io: Server;
  roomChannel: string;
  wordService: WordService;

  constructor(code: string, io: Server, wordService: WordService) {
    this.code = code;
    this.io = io;
    this.wordService = wordService;
    this.roomChannel = `room:${code}`;
    this.hostId = "";
  }

  private clearTimers() {
    for (const t of this.timers) clearTimeout(t);
    this.timers = [];
  }

  private schedule(fn: () => void, ms: number) {
    const t = setTimeout(() => {
      this.timers = this.timers.filter((x) => x !== t);
      fn();
    }, ms);
    this.timers.push(t);
  }

  participatingIds(): string[] {
    return [...this.players.values()]
      .filter((p) => !p.eliminated && !p.leftPermanently)
      .map((p) => p.id);
  }

  spyIdsAlive(): string[] {
    return [...this.players.values()]
      .filter((p) => !p.eliminated && !p.leftPermanently && p.role === "spy")
      .map((p) => p.id);
  }

  private broadcast() {
    for (const p of this.players.values()) {
      if (!p.socketId || p.leftPermanently) continue;
      const s = this.serializeFor(p.id);
      this.io.to(p.socketId).emit("state", s);
    }
  }

  broadcastPublic() {
    this.broadcast();
  }

  nameTaken(name: string): boolean {
    const l = name.trim().toLowerCase();
    if (this.leftPlayerNamesLower.has(l)) return true;
    return [...this.players.values()].some((p) => p.name.trim().toLowerCase() === l);
  }

  createPlayer(name: string, socketId: string): { ok: true; id: string } | { ok: false; error: string } {
    const n = name.trim().slice(0, NAME_MAX);
    if (n.length < 1) return { ok: false, error: "Name required" };
    if (this.nameTaken(n)) return { ok: false, error: "Name already taken" };
    const id = nanoid(10);
    const p: InternalPlayer = {
      id,
      name: n,
      role: "citizen",
      socketId,
      eliminated: false,
      leftPermanently: false,
    };
    this.players.set(id, p);
    if (!this.hostId) this.hostId = id;
    return { ok: true, id };
  }

  attachSocket(playerId: string, socketId: string) {
    const p = this.players.get(playerId);
    if (p) p.socketId = socketId;
  }

  setHostIfGone(oldHost: string, rng: () => number = Math.random) {
    if (this.hostId !== oldHost) return;
    const candidates = [...this.players.values()].filter(
      (p) => !p.leftPermanently && p.id !== oldHost && p.socketId
    );
    if (candidates.length === 0) {
      const any = [...this.players.values()].find((p) => !p.leftPermanently && p.id !== oldHost);
      this.hostId = any?.id ?? this.hostId;
    } else {
      this.hostId = candidates[Math.floor(rng() * candidates.length)]!.id;
    }
    void persistHostChange(this.code, this.hostId);
  }

  disconnectSocket(socketId: string) {
    for (const p of this.players.values()) {
      if (p.socketId === socketId) {
        const wasHost = p.id === this.hostId;
        p.socketId = null;
        if (wasHost) this.setHostIfGone(p.id);

        // If they don't come back soon (e.g. truly left), remove them from the coven list.
        const pid = p.id;
        this.schedule(() => {
          const cur = this.players.get(pid);
          if (!cur || cur.leftPermanently) return;
          if (cur.socketId) return; // reconnected (refresh)
          this.leavePermanently(pid);
          this.broadcastPublic();
        }, DISCONNECT_REMOVE_MS);
        break;
      }
    }
  }

  leavePermanently(playerId: string) {
    const p = this.players.get(playerId);
    if (!p) return;
    p.leftPermanently = true;
    p.socketId = null;
    this.leftPlayerNamesLower.add(p.name.trim().toLowerCase());
    if (playerId === this.hostId) this.setHostIfGone(playerId);
  }

  updateSettings(playerId: string, s: Partial<HostSettings>): { ok: true } | { ok: false; error: string } {
    if (playerId !== this.hostId) return { ok: false, error: "Only host" };
    if (this.phase !== "lobby") return { ok: false, error: "Game in progress" };
    if (s.spyCount !== undefined) this.settings.spyCount = Math.max(1, Math.min(12, s.spyCount));
    if (s.discussionSec !== undefined)
      this.settings.discussionSec = Math.max(30, Math.min(600, s.discussionSec));
    if (s.maxRounds !== undefined) this.settings.maxRounds = Math.max(1, Math.min(20, s.maxRounds));
    if (s.category !== undefined) this.settings.category = s.category;
    return { ok: true };
  }

  startGame(playerId: string): { ok: true } | { ok: false; error: string } {
    if (playerId !== this.hostId) return { ok: false, error: "Only host can start" };
    if (this.phase !== "lobby") return { ok: false, error: "Already started" };
    const ids = this.participatingIds();
    if (ids.length < 3) return { ok: false, error: "Need at least 3 players" };
    if (this.settings.spyCount >= ids.length) {
      return { ok: false, error: "Spies must be less than players" };
    }
    this.clearTimers();
    const { word, resolvedCategory } = this.wordService.pickWord(this.settings.category);
    this.secretWord = word;
    this.resolvedCategory = resolvedCategory;
    for (const p of this.players.values()) p.role = "citizen";
    const spySlots = shuffle(ids).slice(0, this.settings.spyCount);
    for (const sid of spySlots) {
      const pl = this.players.get(sid);
      if (pl) pl.role = "spy";
    }
    this.roundNumber = 1;
    this.cyclesCompleted = 0;
    this.gallery = [];
    this.clueOrder = [];
    this.currentClueIndex = 0;
    this.votes.clear();
    this.discussionMessages = [];
    this.lastElimination = null;
    this.winner = null;
    this.phase = "reveal";
    this.revealEndsAt = Date.now() + REVEAL_MS;
    this.schedule(() => this.afterReveal(), REVEAL_MS);
    this.broadcastPublic();
    return { ok: true };
  }

  private afterReveal() {
    if (this.phase !== "reveal") return;
    this.revealEndsAt = null;
    this.startCluePhase();
  }

  private startCluePhase() {
    this.phase = "clues";
    this.gallery = [];
    const ids = this.participatingIds();
    this.clueOrder = shuffle(ids);
    this.currentClueIndex = 0;
    this.beginCurrentClueTurn();
  }

  private beginCurrentClueTurn() {
    const id = this.clueOrder[this.currentClueIndex];
    if (!id) {
      this.startDiscussion();
      return;
    }
    this.clueTurnEndsAt = Date.now() + CLUE_TURN_MS;
    this.schedule(() => this.autoClueTimeout(), CLUE_TURN_MS);
    this.broadcastPublic();
  }

  private autoClueTimeout() {
    if (this.phase !== "clues") return;
    const id = this.clueOrder[this.currentClueIndex];
    if (!id) return;
    const already = this.gallery.some((g) => g.playerId === id);
    if (!already) {
      const p = this.players.get(id);
      this.gallery.push({
        playerId: id,
        playerName: p?.name ?? "?",
        text: "no clue",
      });
    }
    this.advanceClue();
  }

  private advanceClue() {
    this.clueTurnEndsAt = null;
    this.currentClueIndex++;
    if (this.currentClueIndex >= this.clueOrder.length) {
      this.clueTurnEndsAt = Date.now() + CLUE_REVIEW_MS;
      this.schedule(() => {
        if (this.phase !== "clues") return;
        this.startDiscussion();
      }, CLUE_REVIEW_MS);
      this.broadcastPublic();
    } else {
      this.beginCurrentClueTurn();
    }
  }

  submitClue(playerId: string, text: string): { ok: true } | { ok: false; error: string } {
    if (this.phase !== "clues") return { ok: false, error: "Not clue phase" };
    const p = this.players.get(playerId);
    if (!p || p.eliminated || p.leftPermanently) return { ok: false, error: "Cannot play" };
    const expected = this.clueOrder[this.currentClueIndex];
    if (expected !== playerId) return { ok: false, error: "Not your turn" };
    const t = text.trim().slice(0, CLUE_MAX);
    const clueText = t.length === 0 ? "no clue" : t;
    const dup = this.gallery.some((g) => g.playerId === playerId);
    if (dup) return { ok: false, error: "Already submitted" };
    this.gallery.push({ playerId, playerName: p.name, text: clueText });
    this.clearTimers();
    this.advanceClue();
    return { ok: true };
  }

  private startDiscussion() {
    this.phase = "discussion";
    this.clueTurnEndsAt = null;
    const ms = this.settings.discussionSec * 1000;
    this.discussionEndsAt = Date.now() + ms;
    this.schedule(() => this.startVoting(), ms);
    this.broadcastPublic();
  }

  private startVoting() {
    if (this.phase !== "discussion") return;
    this.phase = "voting";
    this.discussionEndsAt = null;
    this.votes.clear();
    this.votingEndsAt = Date.now() + VOTE_MS;
    this.schedule(() => this.resolveVote(), VOTE_MS);
    this.broadcastPublic();
  }

  vote(playerId: string, targetId: string): { ok: true } | { ok: false; error: string } {
    if (this.phase !== "voting") return { ok: false, error: "Not voting" };
    const voter = this.players.get(playerId);
    if (!voter || voter.eliminated || voter.leftPermanently) return { ok: false, error: "Cannot vote" };
    if (playerId === targetId) return { ok: false, error: "Cannot vote self" };
    const target = this.players.get(targetId);
    if (!target || target.eliminated || target.leftPermanently) return { ok: false, error: "Invalid target" };
    this.votes.set(playerId, targetId);
    const need = this.participatingIds().length;
    if (this.votes.size >= need) {
      this.clearTimers();
      this.resolveVote();
    }
    return { ok: true };
  }

  private resolveVote() {
    if (this.phase !== "voting") return;
    this.votingEndsAt = null;
    const counts = new Map<string, number>();
    for (const pid of this.participatingIds()) counts.set(pid, 0);
    for (const [, tid] of this.votes) {
      if (!counts.has(tid)) continue;
      counts.set(tid, (counts.get(tid) ?? 0) + 1);
    }
    let max = -1;
    for (const v of counts.values()) max = Math.max(max, v);
    const top = [...counts.entries()].filter(([, c]) => c === max).map(([id]) => id);
    let eliminatedId: string | null = null;
    if (top.length === 1 && max > 0) eliminatedId = top[0]!;

    if (eliminatedId) {
      const ep = this.players.get(eliminatedId);
      if (ep) {
        ep.eliminated = true;
        this.lastElimination = { name: ep.name, wasSpy: ep.role === "spy" };
      }
    } else {
      this.lastElimination = null;
    }

    this.cyclesCompleted++;

    const spiesAlive = this.spyIdsAlive().length;
    const alive = this.participatingIds().length;
    const innocentsAlive = Math.max(0, alive - spiesAlive);
    if (spiesAlive === 0) {
      this.endGame("citizens");
      this.broadcastPublic();
      return;
    }
    // If spies are equal/more than innocents, spies can force the outcome.
    if (spiesAlive >= innocentsAlive && alive > 0) {
      this.endGame("spies");
      this.broadcastPublic();
      return;
    }
    if (this.cyclesCompleted >= this.settings.maxRounds && spiesAlive > 0) {
      this.endGame("spies");
      this.broadcastPublic();
      return;
    }

    this.roundNumber++;
    this.votes.clear();
    this.phase = "outcome";
    const pauseMs = eliminatedId ? 4000 : 2500;
    this.outcomeEndsAt = Date.now() + pauseMs;
    this.schedule(() => {
      this.outcomeEndsAt = null;
      this.lastElimination = null;
      this.phase = "clues";
      this.gallery = [];
      this.clueOrder = shuffle(this.participatingIds());
      this.currentClueIndex = 0;
      this.beginCurrentClueTurn();
      this.broadcastPublic();
    }, pauseMs);
    this.broadcastPublic();
  }

  private endGame(w: "citizens" | "spies") {
    this.clearTimers();
    this.phase = "ended";
    this.winner = w;
    this.revealEndsAt = null;
    this.clueTurnEndsAt = null;
    this.discussionEndsAt = null;
    this.votingEndsAt = null;
    this.outcomeEndsAt = null;

    // After a short pause, return everyone to the lobby so they can chat / start again.
    this.schedule(() => {
      // Guard: room may have been restarted manually (future) or host left.
      if (this.phase !== "ended") return;
      this.resetToLobby();
      this.broadcastPublic();
    }, END_TO_LOBBY_MS);
  }

  private resetToLobby() {
    this.clearTimers();
    this.phase = "lobby";
    this.winner = null;
    this.lastElimination = null;
    this.votes.clear();
    this.gallery = [];
    this.clueOrder = [];
    this.currentClueIndex = 0;
    this.roundNumber = 0;
    this.cyclesCompleted = 0;
    this.revealEndsAt = null;
    this.clueTurnEndsAt = null;
    this.discussionEndsAt = null;
    this.votingEndsAt = null;
    this.outcomeEndsAt = null;
    this.secretWord = "";
    this.resolvedCategory = null;
    this.discussionMessages = [];

    // Everyone comes back alive for the next game.
    for (const p of this.players.values()) {
      if (p.leftPermanently) continue;
      p.eliminated = false;
      p.role = "citizen";
    }

    // If the host left, pick a new host from remaining connected players.
    const host = this.players.get(this.hostId);
    if (!host || host.leftPermanently) {
      const next = [...this.players.values()].find((p) => !p.leftPermanently);
      if (next) this.hostId = next.id;
    }
  }

  postLobbyChat(playerId: string, text: string): { ok: true } | { ok: false; error: string } {
    if (this.phase !== "lobby") return { ok: false, error: "Not in lobby" };
    const p = this.players.get(playerId);
    if (!p || p.leftPermanently) return { ok: false, error: "Cannot chat" };
    const t = text.trim().slice(0, LOBBY_CHAT_MAX);
    if (!t) return { ok: false, error: "Empty" };
    const msg: ChatMessage = {
      id: nanoid(8),
      fromId: p.id,
      fromName: p.name,
      text: t,
      at: Date.now(),
    };
    this.lobbyMessages.push(msg);
    if (this.lobbyMessages.length > 200) this.lobbyMessages.splice(0, this.lobbyMessages.length - 200);
    return { ok: true };
  }

  postDiscussionChat(playerId: string, text: string): { ok: true } | { ok: false; error: string } {
    if (this.phase !== "discussion") return { ok: false, error: "Not discussion" };
    const p = this.players.get(playerId);
    if (!p || p.leftPermanently || p.eliminated) return { ok: false, error: "Cannot chat" };
    const t = text.trim().slice(0, DISCUSSION_CHAT_MAX);
    if (!t) return { ok: false, error: "Empty" };
    const msg: ChatMessage = {
      id: nanoid(8),
      fromId: p.id,
      fromName: p.name,
      text: t,
      at: Date.now(),
    };
    this.discussionMessages.push(msg);
    if (this.discussionMessages.length > 300)
      this.discussionMessages.splice(0, this.discussionMessages.length - 300);
    return { ok: true };
  }

  serializeFor(playerId: string): ClientGameState {
    const you = this.players.get(playerId);
    const now = Date.now();
    const participating = this.participatingIds();
    const canStart =
      this.phase === "lobby" &&
      participating.length >= 3 &&
      this.settings.spyCount < participating.length;

    let startError: string | null = null;
    if (this.phase === "lobby" && participating.length < 3) startError = "Need at least 3 players";
    else if (this.phase === "lobby" && this.settings.spyCount >= participating.length)
      startError = "Too many spies";

    const publicPlayers: PublicPlayer[] = [...this.players.values()]
      .filter((p) => !p.leftPermanently)
      .map((p) => ({
        id: p.id,
        name: p.name,
        isSpectator: p.eliminated,
        isConnected: !!p.socketId,
      }));

    let word: string | null = null;
    let revealEndsAt: number | null = null;
    if (
      this.phase === "reveal" &&
      you &&
      you.role === "citizen" &&
      this.roundNumber === 1 &&
      this.revealEndsAt &&
      now < this.revealEndsAt
    ) {
      word = this.secretWord;
      revealEndsAt = this.revealEndsAt;
    }

    const role: Role | null =
      this.phase === "lobby" ? null : you ? you.role : null;

    const chat =
      this.phase === "discussion" ||
      this.phase === "voting" ||
      this.phase === "outcome" ||
      this.phase === "ended"
        ? this.discussionMessages
        : [];

    const secretWordReveal = this.phase === "ended" ? this.secretWord : null;
    const yourVoteTargetId = this.phase === "voting" ? this.votes.get(playerId) ?? null : null;

    return {
      roomCode: this.code,
      phase: this.phase,
      hostId: this.hostId,
      you: {
        id: you?.id ?? "",
        name: you?.name ?? "",
        role,
        word,
        revealEndsAt,
        isSpectator: you?.eliminated ?? false,
      },
      settings: { ...this.settings },
      canStart,
      startError,
      players: publicPlayers,
      clueOrder: this.clueOrder,
      currentTurnPlayerId: this.clueOrder[this.currentClueIndex] ?? null,
      clueTurnEndsAt: this.clueTurnEndsAt,
      gallery: [...this.gallery],
      roundNumber: this.roundNumber,
      cyclesCompleted: this.cyclesCompleted,
      discussionEndsAt: this.discussionEndsAt,
      votingEndsAt: this.votingEndsAt,
      outcomeEndsAt: this.outcomeEndsAt,
      votesCast: this.votes.size,
      votesNeeded: participating.length,
      yourVoteTargetId,
      lastElimination: this.lastElimination,
      winner: this.winner,
      secretWordReveal,
      chat,
      lobbyChat: this.phase === "lobby" ? this.lobbyMessages : [],
      phaseEndsAt:
        this.phase === "reveal"
          ? this.revealEndsAt
          : this.phase === "discussion"
            ? this.discussionEndsAt
            : this.phase === "voting"
              ? this.votingEndsAt
              : this.phase === "outcome"
                ? this.outcomeEndsAt
                : null,
    };
  }
}

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateRoomCode(): string {
  let s = "";
  for (let i = 0; i < 6; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]!;
  return s;
}

export class RoomManager {
  rooms = new Map<string, Room>();
  socketToRoom = new Map<string, string>();
  socketToPlayer = new Map<string, { roomCode: string; playerId: string }>();
  io: Server;
  wordService: WordService;

  constructor(io: Server, wordService: WordService) {
    this.io = io;
    this.wordService = wordService;
  }

  createRoom(socketId: string, playerName: string): { ok: true; code: string; playerId: string } | { ok: false; error: string } {
    let code = generateRoomCode();
    while (this.rooms.has(code)) code = generateRoomCode();
    const room = new Room(code, this.io, this.wordService);
    const r = room.createPlayer(playerName, socketId);
    if (!r.ok) return r;
    room.hostId = r.id;
    this.rooms.set(code, room);
    this.socketToRoom.set(socketId, code);
    this.socketToPlayer.set(socketId, { roomCode: code, playerId: r.id });
    void persistRoomCreated(code, r.id);
    room.broadcastPublic();
    return { ok: true, code, playerId: r.id };
  }

  joinRoom(
    socketId: string,
    code: string,
    playerName: string
  ): { ok: true; playerId: string } | { ok: false; error: string } {
    const room = this.rooms.get(code.trim().toUpperCase());
    if (!room) return { ok: false, error: "Room not found" };
    if (room.phase !== "lobby") return { ok: false, error: "Game already started" };
    const r = room.createPlayer(playerName, socketId);
    if (!r.ok) return r;
    this.socketToRoom.set(socketId, code.trim().toUpperCase());
    this.socketToPlayer.set(socketId, { roomCode: code.trim().toUpperCase(), playerId: r.id });
    room.broadcastPublic();
    return { ok: true, playerId: r.id };
  }

  getRoomBySocket(socketId: string): Room | null {
    const code = this.socketToRoom.get(socketId);
    if (!code) return null;
    return this.rooms.get(code) ?? null;
  }

  getBinding(socketId: string) {
    return this.socketToPlayer.get(socketId);
  }

  leaveAll(socketId: string) {
    const b = this.socketToPlayer.get(socketId);
    if (!b) return;
    const room = this.rooms.get(b.roomCode);
    if (room) {
      room.disconnectSocket(socketId);
      room.broadcastPublic();
    }
    this.socketToRoom.delete(socketId);
    this.socketToPlayer.delete(socketId);
  }

  permanentLeave(socketId: string) {
    const b = this.socketToPlayer.get(socketId);
    if (!b) return;
    const room = this.rooms.get(b.roomCode);
    if (room) {
      room.leavePermanently(b.playerId);
      room.broadcastPublic();
    }
    this.socketToRoom.delete(socketId);
    this.socketToPlayer.delete(socketId);
  }
}
