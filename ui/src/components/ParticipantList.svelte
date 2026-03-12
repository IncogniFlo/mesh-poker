<script lang="ts">
  import type { GameState } from '../lib/types';

  export let state: GameState;
  export let showVotes: boolean = false;
</script>

<ul class="participant-list" aria-label="Participants">
  {#each Object.entries(state.participants) as [key, participant]}
    <li class="participant" class:is-me={key === state.myKey}>
      <span class="name">{participant.nickname}{key === state.myKey ? ' (you)' : ''}</span>
      {#if participant.isObserver}
        <span class="badge observer" aria-label="observing">observing</span>
      {:else if showVotes && state.phase === 'REVEALED'}
        <span class="badge vote" aria-label="voted {participant.vote ?? 'no vote'}">
          {participant.vote ?? '–'}
        </span>
      {:else if state.phase === 'VOTING'}
        <span
          class="badge"
          class:voted={participant.hasVoted}
          class:waiting={!participant.hasVoted}
          aria-label={participant.hasVoted ? 'voted' : 'waiting'}
        >
          {participant.hasVoted ? '✓' : '…'}
        </span>
      {:else}
        <span class="badge joined" aria-label="joined">joined</span>
      {/if}
    </li>
  {/each}
</ul>

<style>
  .participant-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .participant {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.6rem 1rem;
    background: var(--bg-card);
    border-radius: 6px;
    border: 1px solid var(--border-dim);
  }

  .participant.is-me {
    border-color: var(--blue-accent);
  }

  .name {
    font-size: 0.95rem;
  }

  .badge {
    font-size: 0.8rem;
    font-weight: 600;
    padding: 0.2rem 0.6rem;
    border-radius: 12px;
  }

  .badge.observer {
    background: var(--bg-hover);
    color: var(--text-dim);
    font-style: italic;
  }

  .badge.joined {
    background: var(--bg-hover);
    color: var(--text-medium);
  }

  .badge.voted {
    background: var(--green-dark);
    color: var(--green-light);
  }

  .badge.waiting {
    background: var(--orange-bg);
    color: var(--orange-text);
  }

  .badge.vote {
    background: var(--blue-dark);
    color: var(--blue-light);
    font-size: 1rem;
    min-width: 2rem;
    text-align: center;
  }
</style>
