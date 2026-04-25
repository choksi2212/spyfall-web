export type Phase = "lobby" | "reveal" | "clues" | "discussion" | "voting" | "outcome" | "ended";

export type Category =
  | "sports"
  | "countries"
  | "objects"
  | "places"
  | "animals"
  | "transport"
  | "technology"
  | "science"
  | "random";

export interface HostSettings {
  spyCount: number;
  discussionSec: number;
  maxRounds: number;
  category: Category;
}

export interface ChatMessage {
  id: string;
  fromId: string;
  fromName: string;
  text: string;
  at: number;
}

export interface PublicPlayer {
  id: string;
  name: string;
  isSpectator: boolean;
  isConnected: boolean;
}

export interface ClueEntry {
  playerId: string;
  playerName: string;
  text: string;
}

export interface ClientGameState {
  roomCode: string;
  phase: Phase;
  hostId: string;
  you: {
    id: string;
    name: string;
    role: "citizen" | "spy" | null;
    word: string | null;
    revealEndsAt: number | null;
    isSpectator: boolean;
  };
  settings: HostSettings | null;
  canStart: boolean;
  startError: string | null;
  players: PublicPlayer[];
  clueOrder: string[];
  currentTurnPlayerId: string | null;
  clueTurnEndsAt: number | null;
  gallery: ClueEntry[];
  roundNumber: number;
  cyclesCompleted: number;
  discussionEndsAt: number | null;
  votingEndsAt: number | null;
  outcomeEndsAt: number | null;
  votesCast: number;
  votesNeeded: number;
  yourVoteTargetId: string | null;
  lastElimination: { name: string; wasSpy: boolean } | null;
  winner: "citizens" | "spies" | null;
  secretWordReveal: string | null;
  chat: ChatMessage[];
  lobbyChat: ChatMessage[];
  phaseEndsAt: number | null;
}
