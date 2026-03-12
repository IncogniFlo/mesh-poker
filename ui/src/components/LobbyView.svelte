<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { GameState } from '../lib/types';
  import ParticipantList from './ParticipantList.svelte';

  export let state: GameState;
  export let isModerator: boolean = false;
  export let isPrivate: boolean = false;

  const dispatch = createEventDispatcher();

  $: participantCount = Object.keys(state.participants).length;

  // ── Copy session ID to clipboard ───────────────────────────────────────────
  let copied = false;
  async function copyId() {
    if (!state.sessionId) return;
    try {
      await navigator.clipboard.writeText(state.sessionId);
      copied = true;
      setTimeout(() => (copied = false), 2000);
    } catch {
      // Fallback: the code element has user-select:all so manual copy still works
    }
  }
</script>

<section class="lobby">
  <div class="session-header">
    <h2>{state.sessionName ?? 'Session'}</h2>
    {#if isModerator}
      <button class="btn btn-close" on:click={() => dispatch('close')}>
        Close Session
      </button>
    {:else}
      <button class="btn btn-leave" on:click={() => dispatch('leave')}>
        Leave
      </button>
    {/if}
  </div>

  {#if isPrivate && isModerator && state.sessionId}
    <div class="session-id-box">
      <span class="session-id-label">Session ID — share to invite:</span>
      <div class="session-id-row">
        <code class="session-id" aria-label="Session ID">{state.sessionId}</code>
        <button class="btn-copy" on:click={copyId} aria-label="Copy session ID to clipboard">
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
    </div>
  {/if}

  <div class="status-box">
    <p class="hint">
      {#if participantCount === 0}
        Joining…
      {:else if participantCount === 1}
        1 participant online. Click "Start Session" to begin voting.
      {:else}
        {participantCount} participants online. Click "Start Session" to begin voting.
      {/if}
    </p>
  </div>

  <div class="section">
    <h3>Participants</h3>
    <ParticipantList {state} />
  </div>

  {#if isModerator}
    <button
      class="btn btn-primary"
      on:click={() => dispatch('start')}
      disabled={participantCount === 0}
    >
      Start Session
    </button>
  {:else}
    <p class="waiting-hint">Waiting for the moderator to start the session…</p>
  {/if}
</section>

<style>
  .lobby {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .session-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .session-header h2 {
    margin: 0;
    font-size: 1.3rem;
    color: var(--text-primary);
  }

  /* Session ID box */
  .session-id-box {
    background: var(--bg-card);
    border: 1px solid var(--border-medium);
    border-radius: 8px;
    padding: 0.75rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .session-id-label {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-dim);
  }

  .session-id-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .session-id {
    font-family: monospace;
    font-size: 0.8rem;
    color: var(--blue-light);
    word-break: break-all;
    user-select: all;
    flex: 1;
  }

  .btn-copy {
    flex-shrink: 0;
    background: var(--bg-hover);
    border: 1px solid var(--border-medium);
    border-radius: 6px;
    color: var(--text-medium);
    font-size: 0.8rem;
    font-weight: 600;
    padding: 0.3rem 0.75rem;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
    white-space: nowrap;
  }

  .btn-copy:hover {
    background: var(--blue-primary);
    color: #fff;
    border-color: var(--blue-primary);
  }

  /* Status box */
  .status-box {
    background: var(--bg-card);
    border: 1px solid var(--border-dim);
    border-radius: 8px;
    padding: 1.25rem 1.5rem;
  }

  .hint {
    margin: 0;
    color: var(--text-medium);
    font-size: 0.9rem;
  }

  .section h3 {
    margin: 0 0 0.75rem 0;
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-dim);
  }

  /* Buttons */
  .btn {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 6px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.15s;
  }

  .btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .btn-primary {
    background: var(--blue-primary);
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background: var(--blue-hover);
  }

  .waiting-hint {
    margin: 0;
    color: var(--text-dim);
    font-size: 0.9rem;
    font-style: italic;
    text-align: center;
  }

  .btn-leave,
  .btn-close {
    background: transparent;
    border: 1px solid var(--border-medium);
    color: var(--text-medium);
    padding: 0.4rem 0.9rem;
    font-size: 0.85rem;
  }

  .btn-leave:hover,
  .btn-close:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  .btn-close {
    border-color: var(--red-bg);
    color: var(--red-text);
  }

  .btn-close:hover {
    background: var(--red-bg);
    color: #fff5f5;
  }
</style>
