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

export type Phase =
  | "lobby"
  | "reveal"
  | "clues"
  | "discussion"
  | "voting"
  | "outcome"
  | "ended";

export type Role = "citizen" | "spy";

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

/** Sanitized state sent to one client */
export interface ClientGameState {
  roomCode: string;
  phase: Phase;
  hostId: string;
  you: {
    id: string;
    name: string;
    role: Role | null;
    /** Word only during reveal window for citizens, round 1 */
    word: string | null;
    revealEndsAt: number | null;
    isSpectator: boolean;
  };
  settings: HostSettings | null;
  canStart: boolean;
  startError: string | null;
  players: PublicPlayer[];
  /** Clue phase */
  clueOrder: string[];
  currentTurnPlayerId: string | null;
  clueTurnEndsAt: number | null;
  gallery: ClueEntry[];
  roundNumber: number;
  cyclesCompleted: number;
  discussionEndsAt: number | null;
  votingEndsAt: number | null;
  outcomeEndsAt: number | null;
  /** Voting */
  votesCast: number;
  votesNeeded: number;
  /** Your current vote target (only during voting). */
  yourVoteTargetId: string | null;
  /** After vote resolution */
  lastElimination: {
    name: string;
    wasSpy: boolean;
  } | null;
  /** End */
  winner: "citizens" | "spies" | null;
  secretWordReveal: string | null;
  chat: ChatMessage[];
  lobbyChat: ChatMessage[];
  phaseEndsAt: number | null;
}
