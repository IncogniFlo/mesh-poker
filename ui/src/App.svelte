<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { gameStore } from './lib/gameStore';
  import { sessionStore } from './lib/sessionStore';
  import { HeartbeatManager } from './lib/heartbeat';
  import type { IWeaveService } from './lib/weaveService';
  import type { PokerSignal, SessionSummary } from './lib/types';
  import SessionsView from './components/SessionsView.svelte';
  import CreateSessionForm from './components/CreateSessionForm.svelte';
  import LobbyView from './components/LobbyView.svelte';
  import VotingView from './components/VotingView.svelte';
  import RevealView from './components/RevealView.svelte';

  export let service: IWeaveService;

  let view: 'sessions' | 'creating' | 'game' = 'sessions';
  let currentSessionId: string | null = null;
  let isPrivateSession = false;
  let unsubscribeSignal: (() => void) | null = null;
  const heartbeat = new HeartbeatManager();

  // ── Announcement helpers ───────────────────────────────────────────────────

  function buildAnnouncement(state: typeof $gameStore, forJoiner = false) {
    if (!state.sessionId) return null;
    if (isPrivateSession && !forJoiner) return null;
    return {
      type: 'session_announced' as const,
      id: state.sessionId,
      name: state.sessionName ?? '',
      moderatorKey: service.myAgentKey,
      moderatorNickname: service.myNickname,
      phase: state.phase,
      participantCount: Object.keys(state.participants).length,
      cardValues: state.cardValues,
      isPrivate: isPrivateSession,
    };
  }

  // ── Heartbeat management ───────────────────────────────────────────────────

  /**
   * Start all in-session intervals.
   * - All participants: send `heartbeat` every 15s + stale cleanup every 10s.
   * - Moderator additionally: broadcast `session_announced` every 15s.
   */
  function startHeartbeats(asModerator: boolean) {
    heartbeat.clear();
    if (!currentSessionId) return;

    // Participant liveness signal
    heartbeat.schedule(() => {
      if (currentSessionId) {
        service.broadcast({
          type: 'heartbeat',
          sessionId: currentSessionId,
          agentKey: service.myAgentKey,
        });
      }
    }, 15_000);

    // Remove participants not seen for >45s
    heartbeat.schedule(() => gameStore.cleanupStale(Date.now(), 45_000), 10_000);

    // Moderator keeps session discoverable
    if (asModerator) {
      heartbeat.schedule(() => {
        const ann = buildAnnouncement($gameStore);
        if (ann) service.broadcast(ann);
      }, 15_000);
    }
  }

  // ── Signal router ──────────────────────────────────────────────────────────

  function handleSignal(signal: PokerSignal, fromKey: string) {
    const effectiveFromKey = fromKey || service.myAgentKey;

    if (signal.type === 'query_sessions') {
      const state = $gameStore;
      if (state.sessionId && state.moderator === service.myAgentKey) {
        const ann = buildAnnouncement(state);
        if (ann) service.broadcast(ann);
      }
      return;
    }

    if (signal.type === 'session_announced') {
      if (signal.id === currentSessionId) {
        gameStore.updateSessionMeta(signal.name, signal.cardValues);
      }
      if (!signal.isPrivate) {
        const summary: SessionSummary = {
          id: signal.id,
          name: signal.name,
          moderatorKey: signal.moderatorKey,
          moderatorNickname: signal.moderatorNickname,
          phase: signal.phase,
          participantCount: signal.participantCount,
          cardValues: signal.cardValues,
          isPrivate: signal.isPrivate,
        };
        sessionStore.upsert(summary);
      }
      return;
    }

    if (signal.type === 'close_session') {
      sessionStore.remove(signal.sessionId);
      if (signal.sessionId === currentSessionId) {
        currentSessionId = null;
        isPrivateSession = false;
        heartbeat.clear();
        gameStore.reset();
        view = 'sessions';
      }
      return;
    }

    // Game signals — only process if they belong to our current session
    if ('sessionId' in signal && signal.sessionId === currentSessionId) {
      // Re-announce ourselves to new joiners
      if (signal.type === 'join' && effectiveFromKey !== service.myAgentKey) {
        const knownKeys = Object.keys($gameStore.participants);
        if (!knownKeys.includes(effectiveFromKey)) {
          const myParticipant = $gameStore.participants[service.myAgentKey];
          service.broadcast({
            type: 'join',
            sessionId: currentSessionId!,
            nickname: service.myNickname,
            isObserver: myParticipant?.isObserver ?? false,
          });
        }

        // Moderator: sync full session state to late joiners when a round is already running
        if (
          $gameStore.moderator === service.myAgentKey &&
          $gameStore.phase !== 'WAITING'
        ) {
          const s = $gameStore;
          service.broadcast({
            type: 'sync',
            sessionId: currentSessionId!,
            phase: s.phase,
            moderator: service.myAgentKey,
            cardValues: s.cardValues,
            roundHistory: s.roundHistory,
            // In VOTING: strip actual votes to keep them secret; preserve hasVoted flag
            participants: Object.fromEntries(
              Object.entries(s.participants).map(([key, p]) => [
                key,
                {
                  nickname: p.nickname,
                  isObserver: p.isObserver,
                  hasVoted: p.hasVoted,
                  vote: s.phase === 'REVEALED' ? p.vote : null,
                },
              ]),
            ),
          });
        }
      }

      // Detect if I'm about to gain moderator via failover
      const iWasModerator = $gameStore.moderator === service.myAgentKey;
      const currentModeratorLeaving =
        signal.type === 'leave_session' &&
        signal.agentKey === $gameStore.moderator &&
        signal.agentKey !== service.myAgentKey;

      gameStore.dispatch(signal, effectiveFromKey);

      // Moderator failover: restart heartbeats with announcement role
      if (currentModeratorLeaving && !iWasModerator && $gameStore.moderator === service.myAgentKey) {
        startHeartbeats(true);
      }

      // Moderator re-announces after phase changes and new joins
      if ($gameStore.moderator === service.myAgentKey) {
        if (signal.type === 'join') {
          const ann = buildAnnouncement($gameStore, true);
          if (ann) service.broadcast(ann);
        } else if (
          signal.type === 'start_session' ||
          signal.type === 'reveal' ||
          signal.type === 'reset'
        ) {
          const ann = buildAnnouncement($gameStore);
          if (ann) service.broadcast(ann);
        }
      }
    }
  }

  onMount(async () => {
    unsubscribeSignal = service.onSignal(handleSignal);
    await service.broadcast({ type: 'query_sessions' });
    setTimeout(() => service.broadcast({ type: 'query_sessions' }), 3_000);
  });

  onDestroy(() => {
    unsubscribeSignal?.();
    heartbeat.clear();
  });

  // ── Event handlers ─────────────────────────────────────────────────────────

  async function handleCreateSession(
    event: CustomEvent<{ name: string; cardValues: string[]; isObserver: boolean; isPrivate: boolean }>,
  ) {
    const { name, cardValues, isObserver, isPrivate } = event.detail;
    const id = crypto.randomUUID();
    currentSessionId = id;
    isPrivateSession = isPrivate;
    gameStore.startSession(id, name, service.myAgentKey, service.myAgentKey, cardValues);
    view = 'game';
    if (!isPrivate) {
      await service.broadcast({
        type: 'session_announced',
        id,
        name,
        moderatorKey: service.myAgentKey,
        moderatorNickname: service.myNickname,
        phase: 'WAITING',
        participantCount: 1,
        cardValues,
        isPrivate: false,
      });
    }
    startHeartbeats(true);
    await service.broadcast({ type: 'join', sessionId: id, nickname: service.myNickname, isObserver });
  }

  async function handleJoinByID(event: CustomEvent<{ sessionId: string; isObserver: boolean }>) {
    const { sessionId, isObserver } = event.detail;
    currentSessionId = sessionId;
    gameStore.startSession(sessionId, sessionId.slice(0, 8) + '…', service.myAgentKey);
    view = 'game';
    startHeartbeats(false);
    await service.broadcast({ type: 'join', sessionId, nickname: service.myNickname, isObserver });
  }

  async function handleJoinSession(event: CustomEvent<{ sessionId: string; isObserver: boolean }>) {
    const { sessionId, isObserver } = event.detail;
    const session = $sessionStore[sessionId];
    currentSessionId = sessionId;
    gameStore.startSession(sessionId, session?.name ?? sessionId, service.myAgentKey,
                           undefined, session?.cardValues);
    view = 'game';
    startHeartbeats(false);
    await service.broadcast({ type: 'join', sessionId, nickname: service.myNickname, isObserver });
  }

  async function handleCloseSession() {
    if (!currentSessionId) return;
    await service.broadcast({ type: 'close_session', sessionId: currentSessionId });
    isPrivateSession = false;
    // Remaining cleanup handled in signal handler
  }

  async function handleLeaveSession() {
    if (currentSessionId) {
      await service.broadcast({
        type: 'leave_session',
        sessionId: currentSessionId,
        agentKey: service.myAgentKey,
      });
    }
    currentSessionId = null;
    isPrivateSession = false;
    heartbeat.clear();
    gameStore.reset();
    view = 'sessions';
  }

  async function handleStartSession() {
    if (!currentSessionId) return;
    await service.broadcast({
      type: 'start_session',
      sessionId: currentSessionId,
      moderator: service.myAgentKey,
      cardValues: $gameStore.cardValues,
    });
  }

  async function handleVote(event: CustomEvent<{ value: import('./lib/types').FibCard }>) {
    if (!currentSessionId) return;
    await service.broadcast({
      type: 'vote',
      sessionId: currentSessionId,
      agentKey: service.myAgentKey,
      value: event.detail.value,
    });
  }

  async function handleReveal() {
    if (!currentSessionId) return;
    await service.broadcast({ type: 'reveal', sessionId: currentSessionId });
  }

  async function handleReset() {
    if (!currentSessionId) return;
    await service.broadcast({ type: 'reset', sessionId: currentSessionId });
  }

  async function handleChangeRole(event: CustomEvent<{ isObserver: boolean }>) {
    if (!currentSessionId) return;
    await service.broadcast({
      type: 'change_role',
      sessionId: currentSessionId,
      agentKey: service.myAgentKey,
      isObserver: event.detail.isObserver,
    });
  }

  $: phase = $gameStore.phase;
  $: isModerator = $gameStore.moderator === service.myAgentKey;
</script>

<main>
  <header>
    <h1>Planning Poker</h1>
    <span class="agent-tag">
      {service.myNickname}
      <small>({service.myAgentKey.slice(0, 8)}…)</small>
    </span>
  </header>

  {#if view === 'sessions'}
    <SessionsView
      sessions={$sessionStore}
      on:create={() => (view = 'creating')}
      on:join={handleJoinSession}
      on:joinById={handleJoinByID}
    />
  {:else if view === 'creating'}
    <CreateSessionForm
      on:create={handleCreateSession}
      on:cancel={() => (view = 'sessions')}
    />
  {:else if view === 'game'}
    {#if phase === 'WAITING'}
      <LobbyView
        state={$gameStore}
        {isModerator}
        isPrivate={isPrivateSession}
        on:start={handleStartSession}
        on:close={handleCloseSession}
        on:leave={handleLeaveSession}
      />
    {:else if phase === 'VOTING'}
      <VotingView
        state={$gameStore}
        myKey={service.myAgentKey}
        {isModerator}
        on:vote={handleVote}
        on:reveal={handleReveal}
        on:changeRole={handleChangeRole}
        on:close={handleCloseSession}
        on:leave={handleLeaveSession}
      />
    {:else if phase === 'REVEALED'}
      <RevealView
        state={$gameStore}
        {isModerator}
        on:reset={handleReset}
        on:close={handleCloseSession}
        on:leave={handleLeaveSession}
      />
    {/if}
  {/if}
</main>

<style>
  /* ── CSS design tokens ───────────────────────────────────────────────────── */
  :global(:root) {
    --bg-base:          #0f1117;
    --bg-card:          #1a202c;
    --bg-hover:         #2d3748;
    --border-dim:       #2d3748;
    --border-medium:    #4a5568;
    --text-dim:         #718096;
    --text-medium:      #a0aec0;
    --text-primary:     #e2e8f0;
    --blue-accent:      #63b3ed;
    --blue-primary:     #3182ce;
    --blue-hover:       #2b6cb0;
    --blue-light:       #90cdf4;
    --blue-dark:        #2a4365;
    --blue-deep:        #1e3a5f;
    --green-border:     #38a169;
    --green-bg:         #1c3a2b;
    --green-dark:       #276749;
    --green-light:      #9ae6b4;
    --green-medium:     #68d391;
    --red-text:         #fc8181;
    --red-bg:           #822727;
    --yellow-primary:   #d69e2e;
    --yellow-hover:     #b7791f;
    --purple-primary:   #553c9a;
    --purple-hover:     #44337a;
    --purple-light:     #e9d8fd;
    --orange-bg:        #744210;
    --orange-text:      #fbd38d;
  }

  :global(*, *::before, *::after) {
    box-sizing: border-box;
  }

  :global(body) {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: var(--bg-base);
    color: var(--text-primary);
    min-height: 100vh;
  }

  main {
    max-width: 800px;
    margin: 0 auto;
    padding: 1.5rem;
  }

  header {
    display: flex;
    align-items: baseline;
    gap: 1rem;
    margin-bottom: 2rem;
    border-bottom: 1px solid var(--border-dim);
    padding-bottom: 1rem;
  }

  h1 {
    margin: 0;
    font-size: 1.5rem;
    color: var(--blue-accent);
  }

  .agent-tag {
    font-size: 0.85rem;
    color: var(--text-medium);
  }

  .agent-tag small {
    font-family: monospace;
    color: var(--text-dim);
  }
</style>
