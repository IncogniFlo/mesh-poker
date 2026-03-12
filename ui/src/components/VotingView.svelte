<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { GameState, FibCard } from '../lib/types';
  import CardDeck from './CardDeck.svelte';
  import ParticipantList from './ParticipantList.svelte';
  import RoundHistory from './RoundHistory.svelte';

  export let state: GameState;
  export let myKey: string;
  export let isModerator: boolean = false;

  const dispatch = createEventDispatcher();

  $: amObserver = state.participants[myKey]?.isObserver ?? false;
  $: votedCount = Object.values(state.participants).filter((p) => p.hasVoted).length;
  $: totalCount = Object.keys(state.participants).length;

  function handleSelect(event: CustomEvent<{ value: FibCard }>) {
    dispatch('vote', { value: event.detail.value });
  }
</script>

<section class="voting">
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

  <div class="status-bar" role="status" aria-live="polite">
    <span class="progress">{votedCount}/{totalCount} voted</span>
    {#if isModerator}
      <button
        class="btn btn-reveal"
        on:click={() => dispatch('reveal')}
        disabled={votedCount === 0}
        aria-label="Reveal all cards"
      >
        Reveal Cards
      </button>
    {:else}
      <span class="moderator-hint">Waiting for moderator to reveal…</span>
    {/if}
  </div>

  {#if amObserver}
    <div class="observer-notice" role="status">
      You are observing this session.
      <button
        class="btn-role"
        on:click={() => dispatch('changeRole', { isObserver: false })}
      >
        Switch to voter
      </button>
    </div>
  {:else}
    <div class="deck-section">
      <h3>Pick your card</h3>
      <CardDeck cards={state.cardValues} selectedCard={state.myVote} on:select={handleSelect} />
      {#if state.myVote !== null}
        <p class="my-pick" aria-live="polite">
          Your pick: <strong>{state.myVote}</strong>
        </p>
      {/if}
      <button
        class="btn-role btn-role-obs"
        on:click={() => dispatch('changeRole', { isObserver: true })}
      >
        Switch to observer
      </button>
    </div>
  {/if}

  <div class="section">
    <h3>Participants</h3>
    <ParticipantList {state} />
  </div>

  <RoundHistory history={state.roundHistory} sessionName={state.sessionName ?? 'Session'} />
</section>

<style>
  .voting {
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

  .status-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: var(--bg-card);
    border: 1px solid var(--border-dim);
    border-radius: 8px;
    padding: 0.75rem 1rem;
  }

  .progress {
    font-size: 0.95rem;
    color: var(--text-medium);
  }

  .observer-notice {
    background: var(--bg-card);
    border: 1px solid var(--border-dim);
    border-radius: 8px;
    padding: 1.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    color: var(--text-dim);
    font-style: italic;
    font-size: 0.9rem;
    flex-wrap: wrap;
  }

  .moderator-hint {
    font-size: 0.85rem;
    color: var(--text-dim);
    font-style: italic;
  }

  .deck-section {
    background: var(--bg-card);
    border: 1px solid var(--border-dim);
    border-radius: 8px;
    padding: 1.5rem;
    text-align: center;
  }

  .deck-section h3 {
    margin: 0 0 1.25rem 0;
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-dim);
  }

  .my-pick {
    margin: 1rem 0 0 0;
    color: var(--blue-light);
    font-size: 0.95rem;
  }

  .btn-role {
    display: inline-block;
    margin-top: 1rem;
    background: transparent;
    border: 1px solid var(--border-medium);
    border-radius: 6px;
    color: var(--text-dim);
    font-size: 0.8rem;
    font-style: normal;
    padding: 0.3rem 0.75rem;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
  }

  .btn-role:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  .btn-role-obs {
    display: block;
    margin: 0.75rem auto 0;
  }

  .section h3 {
    margin: 0 0 0.75rem 0;
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-dim);
  }

  .btn {
    padding: 0.5rem 1.25rem;
    border: none;
    border-radius: 6px;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;
  }

  .btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .btn-reveal {
    background: var(--yellow-primary);
    color: var(--bg-card);
  }

  .btn-reveal:hover:not(:disabled) {
    background: var(--yellow-hover);
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
