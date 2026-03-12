export type CardValue = string;

export type CardSetType = 'fibonacci' | 'tshirt' | 'custom';

export const CARD_PRESETS: Record<Exclude<CardSetType, 'custom'>, CardValue[]> = {
  fibonacci: ['1', '2', '3', '5', '8', '13', '21', '?'],
  tshirt:    ['XS', 'S', 'M', 'L', 'XL', 'XXL', '?'],
};

// Keep FibCard as alias for backward compatibility in signal types
export type FibCard = CardValue;
export const FIB_CARDS = CARD_PRESETS.fibonacci;

export type AgentPubKeyB64 = string;

export type Phase = 'WAITING' | 'VOTING' | 'REVEALED';

export interface Participant {
  nickname: string;
  isObserver: boolean;
  hasVoted: boolean;
  vote: CardValue | null;
  /** Date.now() timestamp — updated on each received heartbeat signal */
  lastSeen: number;
  /** Set when leave_session is received during REVEALED phase; removed at next reset. */
  hasLeft?: boolean;
}

/** Persistent record of one completed round, stored in roundHistory. */
export interface RoundResult {
  roundNumber: number;
  consensusValue: string | null;
  avg: string | null;
  min: number | null;
  max: number | null;
  distribution: { card: string; count: number }[];
  /** Per-person votes for display and export. */
  votes: { nickname: string; vote: string | null }[];
}

export type PokerSignal =
  | { type: 'join';             sessionId: string; nickname: string; isObserver: boolean }
  | { type: 'start_session';    sessionId: string; moderator: AgentPubKeyB64; cardValues: CardValue[] }
  | { type: 'vote';             sessionId: string; agentKey: AgentPubKeyB64; value: CardValue }
  | { type: 'reveal';           sessionId: string }
  | { type: 'reset';            sessionId: string }
  | { type: 'close_session';    sessionId: string }
  | { type: 'leave_session';    sessionId: string; agentKey: AgentPubKeyB64 }
  | { type: 'heartbeat';        sessionId: string; agentKey: AgentPubKeyB64 }
  | { type: 'change_role';      sessionId: string; agentKey: AgentPubKeyB64; isObserver: boolean }
  | { type: 'sync';             sessionId: string; phase: Phase; moderator: AgentPubKeyB64;
                                 cardValues: CardValue[];
                                 participants: Record<AgentPubKeyB64, {
                                   nickname: string; isObserver: boolean;
                                   hasVoted: boolean; vote: CardValue | null;
                                 }>;
                                 roundHistory: RoundResult[] }
  | { type: 'session_announced'; id: string; name: string; moderatorKey: AgentPubKeyB64;
                                  moderatorNickname: string; phase: Phase; participantCount: number;
                                  cardValues: CardValue[]; isPrivate: boolean }
  | { type: 'query_sessions' };

export interface SessionSummary {
  id: string;
  name: string;
  moderatorKey: AgentPubKeyB64;
  moderatorNickname: string;
  phase: Phase;
  participantCount: number;
  cardValues: CardValue[];
  isPrivate: boolean;
}

export interface GameState {
  sessionId: string | null;
  sessionName: string | null;
  cardValues: CardValue[];
  phase: Phase;
  moderator: AgentPubKeyB64 | null;
  participants: Record<AgentPubKeyB64, Participant>;
  /** Tracks join order for moderator failover election. */
  joinOrder: AgentPubKeyB64[];
  myKey: AgentPubKeyB64 | null;
  myVote: CardValue | null;
  /** All completed rounds, newest first. Grows with each "New Round" click. */
  roundHistory: RoundResult[];
}

export const initialGameState: GameState = {
  sessionId: null,
  sessionName: null,
  cardValues: CARD_PRESETS.fibonacci,
  phase: 'WAITING',
  moderator: null,
  participants: {},
  joinOrder: [],
  myKey: null,
  myVote: null,
  roundHistory: [],
};
