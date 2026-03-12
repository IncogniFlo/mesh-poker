import { writable } from 'svelte/store';
import type { GameState, PokerSignal, RoundResult } from './types';
import { initialGameState } from './types';

function computeRoundResult(state: GameState, roundNumber: number): RoundResult {
  const nonObservers = Object.values(state.participants).filter((p) => !p.isObserver);
  const allVotes = nonObservers.map((p) => p.vote).filter((v): v is string => v !== null);

  const toNumber = (v: string): number | null => {
    const n = Number(v);
    return isNaN(n) ? null : n;
  };

  const numericVotes = allVotes.map(toNumber).filter((n): n is number => n !== null);
  const avg =
    numericVotes.length > 0
      ? (numericVotes.reduce((a, b) => a + b, 0) / numericVotes.length).toFixed(1)
      : null;
  const min = numericVotes.length > 0 ? Math.min(...numericVotes) : null;
  const max = numericVotes.length > 0 ? Math.max(...numericVotes) : null;

  const hasConsensus =
    allVotes.length > 0 &&
    new Set(allVotes).size === 1 &&
    allVotes.length === nonObservers.length;
  const consensusValue = hasConsensus ? allVotes[0] : null;

  const distribution = state.cardValues
    .map((card) => ({ card, count: allVotes.filter((v) => v === card).length }))
    .filter((e) => e.count > 0);

  const votes = nonObservers.map((p) => ({ nickname: p.nickname, vote: p.vote }));

  return { roundNumber, consensusValue, avg, min, max, distribution, votes };
}

function createGameStore() {
  const { subscribe, set, update } = writable<GameState>({ ...initialGameState });

  function dispatch(signal: PokerSignal, fromKey: string) {
    update((state) => reduce(state, signal, fromKey));
  }

  function setMyKey(key: string) {
    update((state) => ({ ...state, myKey: key }));
  }

  function startSession(
    sessionId: string,
    sessionName: string,
    myKey: string,
    moderator?: string,
    cardValues?: string[],
  ) {
    set({
      ...initialGameState,
      sessionId,
      sessionName,
      myKey,
      moderator: moderator ?? null,
      cardValues: cardValues ?? initialGameState.cardValues,
    });
  }

  function updateSessionMeta(sessionName: string, cardValues: string[]) {
    update((state) => ({ ...state, sessionName, cardValues }));
  }

  /**
   * Remove participants whose lastSeen timestamp is older than `threshold` ms.
   * Also handles moderator failover: if the stale participant was the moderator,
   * the next non-observer in join order is elected.
   */
  function cleanupStale(now: number, threshold: number) {
    update((state) => {
      const fresh: typeof state.participants = {};
      const newJoinOrder: string[] = [];

      for (const key of state.joinOrder) {
        const p = state.participants[key];
        if (p && now - (p.lastSeen ?? now) < threshold) {
          fresh[key] = p;
          newJoinOrder.push(key);
        }
      }
      for (const [key, p] of Object.entries(state.participants)) {
        if (!(key in fresh) && now - (p.lastSeen ?? now) < threshold) {
          fresh[key] = p;
        }
      }

      if (Object.keys(fresh).length === Object.keys(state.participants).length) {
        return state;
      }

      let moderator = state.moderator;
      if (moderator && !(moderator in fresh)) {
        moderator = newJoinOrder.find((k) => fresh[k] && !fresh[k].isObserver) ?? null;
      }

      return { ...state, participants: fresh, joinOrder: newJoinOrder, moderator };
    });
  }

  function reset() {
    set({ ...initialGameState });
  }

  return { subscribe, dispatch, setMyKey, startSession, updateSessionMeta, cleanupStale, reset };
}

function reduce(state: GameState, signal: PokerSignal, fromKey: string): GameState {
  switch (signal.type) {
    case 'join': {
      const existing = state.participants[fromKey];
      const newParticipants = {
        ...state.participants,
        [fromKey]: {
          nickname: signal.nickname || fromKey.slice(0, 8),
          isObserver: signal.isObserver,
          hasVoted: existing?.hasVoted ?? false,
          vote: existing?.vote ?? null,
          lastSeen: Date.now(),
        },
      };
      const newJoinOrder = state.joinOrder.includes(fromKey)
        ? state.joinOrder
        : [...state.joinOrder, fromKey];
      return { ...state, participants: newParticipants, joinOrder: newJoinOrder };
    }

    case 'heartbeat': {
      if (!state.participants[signal.agentKey]) return state;
      return {
        ...state,
        participants: {
          ...state.participants,
          [signal.agentKey]: {
            ...state.participants[signal.agentKey],
            lastSeen: Date.now(),
          },
        },
      };
    }

    case 'change_role': {
      if (!state.participants[signal.agentKey]) return state;
      const current = state.participants[signal.agentKey];
      return {
        ...state,
        participants: {
          ...state.participants,
          [signal.agentKey]: {
            ...current,
            isObserver: signal.isObserver,
            hasVoted: signal.isObserver ? false : current.hasVoted,
            vote: signal.isObserver ? null : current.vote,
          },
        },
        myVote: signal.agentKey === state.myKey && signal.isObserver ? null : state.myVote,
      };
    }

    case 'start_session': {
      if (state.phase !== 'WAITING') return state;
      return {
        ...state,
        phase: 'VOTING',
        moderator: signal.moderator,
        cardValues: signal.cardValues ?? state.cardValues,
        participants: Object.fromEntries(
          Object.entries(state.participants).map(([key, p]) => [
            key,
            { ...p, hasVoted: false, vote: null },
          ]),
        ),
        myVote: null,
      };
    }

    case 'vote': {
      if (state.phase !== 'VOTING') return state;
      const isMe = signal.agentKey === state.myKey;
      return {
        ...state,
        participants: {
          ...state.participants,
          [signal.agentKey]: {
            ...state.participants[signal.agentKey],
            hasVoted: true,
            vote: signal.value,
          },
        },
        myVote: isMe ? signal.value : state.myVote,
      };
    }

    case 'sync': {
      // Only apply when we're a late joiner stuck in WAITING
      if (state.phase !== 'WAITING') return state;
      const now = Date.now();
      return {
        ...state,
        phase: signal.phase,
        moderator: signal.moderator,
        cardValues: signal.cardValues,
        roundHistory: signal.roundHistory,
        participants: {
          ...Object.fromEntries(
            Object.entries(signal.participants).map(([key, p]) => [
              key,
              { ...p, lastSeen: now },
            ]),
          ),
          // Keep our own entry if already set (e.g. join was already processed)
          ...( state.participants[state.myKey!]
               ? { [state.myKey!]: state.participants[state.myKey!] }
               : {} ),
        },
      };
    }

    case 'reveal': {
      if (state.phase !== 'VOTING') return state;
      return { ...state, phase: 'REVEALED' };
    }

    case 'leave_session': {
      // During REVEALED phase keep participants so their votes stay visible,
      // but mark them as hasLeft so the next reset can clean them out.
      if (state.phase === 'REVEALED') {
        const newJoinOrder = state.joinOrder.filter((k) => k !== signal.agentKey);
        let moderator = state.moderator;
        if (state.moderator === signal.agentKey) {
          moderator =
            newJoinOrder.find((k) => state.participants[k] && !state.participants[k].isObserver) ?? null;
        }
        return {
          ...state,
          joinOrder: newJoinOrder,
          moderator,
          participants: {
            ...state.participants,
            ...(state.participants[signal.agentKey]
              ? { [signal.agentKey]: { ...state.participants[signal.agentKey], hasLeft: true } }
              : {}),
          },
        };
      }

      const remaining = { ...state.participants };
      delete remaining[signal.agentKey];
      const newJoinOrder = state.joinOrder.filter((k) => k !== signal.agentKey);

      let moderator = state.moderator;
      if (state.moderator === signal.agentKey) {
        moderator = newJoinOrder.find((k) => remaining[k] && !remaining[k].isObserver) ?? null;
      }

      return { ...state, participants: remaining, joinOrder: newJoinOrder, moderator };
    }

    case 'reset': {
      // Save completed round to history (newest first), go directly back to VOTING.
      // Remove participants who left during the REVEALED phase.
      const roundResult = computeRoundResult(state, state.roundHistory.length + 1);
      return {
        ...state,
        phase: 'VOTING',
        myVote: null,
        roundHistory: [roundResult, ...state.roundHistory],
        participants: Object.fromEntries(
          Object.entries(state.participants)
            .filter(([, p]) => !p.hasLeft)
            .map(([key, p]) => [key, { ...p, hasVoted: false, vote: null }]),
        ),
        joinOrder: state.joinOrder.filter((k) => !state.participants[k]?.hasLeft),
      };
    }

    default:
      return state;
  }
}

export const gameStore = createGameStore();
