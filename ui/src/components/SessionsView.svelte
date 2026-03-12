<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { SessionSummary } from '../lib/types';

  export let sessions: Record<string, SessionSummary>;

  const dispatch = createEventDispatcher();

  let joinById = '';
  let idError = '';

  // UUID v4 format validation
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  function handleJoinById(isObserver: boolean) {
    const id = joinById.trim();
    if (!id) return;
    if (!UUID_RE.test(id)) {
      idError = 'Invalid session ID — expected UUID format';
      return;
    }
    idError = '';
    dispatch('joinById', { sessionId: id, isObserver });
    joinById = '';
  }

  // Clear error as soon as input looks valid
  $: if (idError && UUID_RE.test(joinById.trim())) idError = '';

  $: sessionList = Object.values(sessions);
  $: waitingSessions = sessionList.filter((s) => s.phase === 'WAITING');
  $: activeSessions = sessionList.filter((s) => s.phase !== 'WAITING');
</script>

<section class="sessions">
  <div class="toolbar">
    <button class="btn btn-primary" on:click={() => dispatch('create')}>
      + New Session
    </button>
  </div>

  {#if sessionList.length === 0}
    <div class="empty-state" role="status">
      <p>No sessions found. Create one to get started!</p>
    </div>
  {/if}

  {#if waitingSessions.length > 0}
    <div class="group">
      <h3 class="group-label">Waiting</h3>
      {#each waitingSessions as session (session.id)}
        <div class="session-card">
          <div class="session-info">
            <span class="session-name">{session.name}</span>
            <span class="session-meta">
              {session.moderatorNickname} · {session.participantCount}
              {session.participantCount === 1 ? 'participant' : 'participants'}
            </span>
          </div>
          <div class="join-actions">
            <button
              class="btn btn-join"
              aria-label="Join {session.name}"
              on:click={() => dispatch('join', { sessionId: session.id, isObserver: false })}
            >
              Join
            </button>
            <button
              class="btn btn-observe"
              aria-label="Observe {session.name}"
              on:click={() => dispatch('join', { sessionId: session.id, isObserver: true })}
            >
              Observe
            </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}

  {#if activeSessions.length > 0}
    <div class="group">
      <h3 class="group-label">In Progress</h3>
      {#each activeSessions as session (session.id)}
        <div class="session-card">
          <div class="session-info">
            <span class="session-name">{session.name}</span>
            <span class="session-meta">
              {session.moderatorNickname} · {session.participantCount}
              {session.participantCount === 1 ? 'participant' : 'participants'}
            </span>
          </div>
          <div class="join-actions">
            <button
              class="btn btn-join"
              aria-label="Join {session.name}"
              on:click={() => dispatch('join', { sessionId: session.id, isObserver: false })}
            >
              Join
            </button>
            <button
              class="btn btn-observe"
              aria-label="Observe {session.name}"
              on:click={() => dispatch('join', { sessionId: session.id, isObserver: true })}
            >
              Observe
            </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}

  <div class="join-by-id-section">
    <h3 class="group-label">Join private session</h3>
    <div class="join-by-id-row">
      <input
        type="text"
        placeholder="Paste session ID…"
        bind:value={joinById}
        on:keydown={(e) => e.key === 'Enter' && handleJoinById(false)}
        class="id-input"
        class:id-input-error={!!idError}
        aria-label="Private session ID"
        aria-describedby={idError ? 'id-error' : undefined}
        autocomplete="off"
        spellcheck="false"
      />
      <button class="btn btn-join" disabled={!joinById.trim()} on:click={() => handleJoinById(false)}>
        Join
      </button>
      <button class="btn btn-observe" disabled={!joinById.trim()} on:click={() => handleJoinById(true)}>
        Observe
      </button>
    </div>
    {#if idError}
      <p id="id-error" class="id-error" role="alert">{idError}</p>
    {/if}
  </div>
</section>

<style>
  .sessions {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .toolbar {
    display: flex;
    justify-content: flex-end;
  }

  .empty-state {
    background: var(--bg-card);
    border: 1px solid var(--border-dim);
    border-radius: 8px;
    padding: 2rem;
    text-align: center;
    color: var(--text-dim);
  }

  .group-label {
    margin: 0 0 0.75rem 0;
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-dim);
  }

  .group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .session-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: var(--bg-card);
    border: 1px solid var(--border-dim);
    border-radius: 8px;
    padding: 1rem 1.25rem;
  }

  .session-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .session-name {
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .session-meta {
    font-size: 0.8rem;
    color: var(--text-medium);
  }

  .btn {
    padding: 0.5rem 1.25rem;
    border: none;
    border-radius: 6px;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;
  }

  .btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .btn-primary {
    background: var(--blue-primary);
    color: white;
  }

  .btn-primary:hover {
    background: var(--blue-hover);
  }

  .join-actions {
    display: flex;
    gap: 0.5rem;
  }

  .btn-join {
    background: var(--bg-hover);
    color: var(--text-primary);
    border: 1px solid var(--border-medium);
  }

  .btn-join:hover:not(:disabled) {
    background: var(--border-medium);
  }

  .btn-observe {
    background: transparent;
    color: var(--text-medium);
    border: 1px solid var(--border-medium);
  }

  .btn-observe:hover:not(:disabled) {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  /* Private join section */
  .join-by-id-section {
    border-top: 1px solid var(--border-dim);
    padding-top: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .join-by-id-row {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .id-input {
    flex: 1;
    background: var(--bg-base);
    border: 1px solid var(--border-medium);
    border-radius: 6px;
    color: var(--text-primary);
    font-size: 0.85rem;
    font-family: monospace;
    padding: 0.5rem 0.75rem;
    outline: none;
    transition: border-color 0.15s;
  }

  .id-input:focus {
    border-color: var(--blue-primary);
  }

  .id-input.id-input-error {
    border-color: var(--red-text);
  }

  .id-error {
    margin: 0;
    font-size: 0.8rem;
    color: var(--red-text);
  }
</style>
