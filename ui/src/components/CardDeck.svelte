<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { CardValue } from '../lib/types';

  export let cards: CardValue[];
  export let selectedCard: CardValue | null = null;

  const dispatch = createEventDispatcher<{ select: { value: CardValue } }>();
</script>

<div class="card-deck" role="group" aria-label="Card deck">
  {#each cards as card}
    <button
      class="card"
      class:selected={selectedCard === card}
      on:click={() => dispatch('select', { value: card })}
      aria-pressed={selectedCard === card}
      aria-label="Card {card}"
    >
      {card}
    </button>
  {/each}
</div>

<style>
  .card-deck {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    justify-content: center;
  }

  .card {
    width: 64px;
    height: 96px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.4rem;
    font-weight: 700;
    border: 2px solid var(--border-medium);
    border-radius: 10px;
    background: var(--bg-card);
    color: var(--text-primary);
    cursor: pointer;
    transition: all 0.15s;
  }

  .card:hover {
    border-color: var(--blue-accent);
    background: var(--bg-hover);
    transform: translateY(-4px);
  }

  .card:focus-visible {
    outline: 2px solid var(--blue-accent);
    outline-offset: 2px;
  }

  .card.selected {
    border-color: var(--blue-accent);
    background: var(--blue-dark);
    color: var(--blue-light);
    transform: translateY(-8px);
    box-shadow: 0 8px 16px rgba(99, 179, 237, 0.2);
  }
</style>
