<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { GameState, CardValue } from '../lib/types';
  import ParticipantList from './ParticipantList.svelte';
  import RoundHistory from './RoundHistory.svelte';

  export let state: GameState;
  export let isModerator: boolean = false;

  const dispatch = createEventDispatcher();

  function toNumber(v: CardValue | null): number | null {
    if (v === null) return null;
    const n = Number(v);
    return isNaN(n) ? null : n;
  }

  $: numericVotes = Object.values(state.participants)
    .map((p) => toNumber(p.vote))
    .filter((n): n is number => n !== null);

  $: avg =
    numericVotes.length > 0
      ? (numericVotes.reduce((a, b) => a + b, 0) / numericVotes.length).toFixed(1)
      : null;

  $: min = numericVotes.length > 0 ? Math.min(...numericVotes) : null;
  $: max = numericVotes.length > 0 ? Math.max(...numericVotes) : null;

  $: allVotes = Object.values(state.participants)
    .filter((p) => !p.isObserver)
    .map((p) => p.vote)
    .filter((v): v is CardValue => v !== null);

  $: hasConsensus =
    allVotes.length > 0 &&
    new Set(allVotes).size === 1 &&
    allVotes.length === Object.values(state.participants).filter((p) => !p.isObserver).length;
  $: consensusValue = hasConsensus ? allVotes[0] : null;

  $: voteCounts = state.cardValues
    .map((card) => ({ card, count: allVotes.filter((v) => v === card).length }))
    .filter((entry) => entry.count > 0);

  $: maxCount = Math.max(...voteCounts.map((e) => e.count), 1);

  // Build the current round as a RoundResult for display in history
  $: currentRound = {
    roundNumber: state.roundHistory.length + 1,
    consensusValue: consensusValue ?? null,
    avg,
    min,
    max,
    distribution: voteCounts,
    votes: Object.values(state.participants)
      .filter((p) => !p.isObserver)
      .map((p) => ({ nickname: p.nickname, vote: p.vote })),
  };
</script>

<section class="reveal">
  <div class="session-header">
    <h2>{state.sessionName ?? 'Session'}</h2>
    <div class="header-actions">
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
  </div>

  <div class="result-banner" class:consensus={hasConsensus}>
    {#if hasConsensus}
      <span class="consensus-label">Consensus!</span>
      <span class="consensus-value">{consensusValue}</span>
    {:else}
      <span class="no-consensus">No consensus</span>
    {/if}
  </div>

  {#if avg !== null}
    <div class="stats" role="group" aria-label="Vote statistics">
      <div class="stat">
        <span class="stat-label">Avg</span>
        <span class="stat-value">{avg}</span>
      </div>
      <div class="stat">
        <span class="stat-label">Min</span>
        <span class="stat-value">{min}</span>
      </div>
      <div class="stat">
        <span class="stat-label">Max</span>
        <span class="stat-value">{max}</span>
      </div>
    </div>
  {/if}

  {#if voteCounts.length >= 1}
    <div class="section">
      <h3>Distribution</h3>
      <div class="bar-chart" role="img" aria-label="Vote distribution chart">
        {#each voteCounts as { card, count }}
          <div class="bar-col" title="{card}: {count} vote{count !== 1 ? 's' : ''}">
            <span class="bar-count" aria-hidden="true">{count}</span>
            <div class="bar-track">
              <div class="bar-fill" style="height: {(count / maxCount) * 100}%"></div>
            </div>
            <span class="bar-label" aria-hidden="true">{card}</span>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <div class="section">
    <h3>Votes</h3>
    <ParticipantList {state} showVotes={true} />
  </div>

  {#if isModerator}
    <button class="btn btn-reset" on:click={() => dispatch('reset')}>
      New Round
    </button>
  {/if}

  <RoundHistory
    history={state.roundHistory}
    sessionName={state.sessionName ?? 'Session'}
    {currentRound}
  />
</section>

<style>
  .reveal {
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

  .header-actions {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .result-banner {
    background: var(--bg-card);
    border: 2px solid var(--border-medium);
    border-radius: 12px;
    padding: 2rem;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }

  .result-banner.consensus {
    border-color: var(--green-border);
    background: var(--green-bg);
  }

  .consensus-label {
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--green-medium);
  }

  .consensus-value {
    font-size: 3rem;
    font-weight: 800;
    color: var(--green-light);
  }

  .no-consensus {
    font-size: 1.2rem;
    color: var(--red-text);
  }

  .stats {
    display: flex;
    gap: 1rem;
    justify-content: center;
  }

  .stat {
    background: var(--bg-card);
    border: 1px solid var(--border-dim);
    border-radius: 8px;
    padding: 0.75rem 1.5rem;
    text-align: center;
    flex: 1;
  }

  .stat-label {
    display: block;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-dim);
    margin-bottom: 0.25rem;
  }

  .stat-value {
    display: block;
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--blue-light);
  }

  /* Distribution bar chart — centered */
  .bar-chart {
    display: flex;
    align-items: flex-end;
    justify-content: center;
    gap: 0.75rem;
    height: 120px;
    padding: 0 0.25rem;
  }

  .bar-col {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.3rem;
    width: 2ch;
    flex: 0 0 auto;
    height: 100%;
  }

  .bar-count {
    font-size: 0.75rem;
    color: var(--text-medium);
    font-weight: 600;
    line-height: 1;
  }

  .bar-track {
    flex: 1;
    width: 100%;
    display: flex;
    align-items: flex-end;
    background: var(--bg-card);
    border-radius: 4px 4px 0 0;
    overflow: hidden;
  }

  .bar-fill {
    width: 100%;
    background: var(--blue-primary);
    border-radius: 4px 4px 0 0;
    min-height: 4px;
    transition: height 0.3s ease;
  }

  .bar-label {
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--blue-light);
    font-family: monospace;
  }

  .section h3 {
    margin: 0 0 0.75rem 0;
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-dim);
  }

  .btn {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 6px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;
  }

  .btn-reset {
    background: var(--purple-primary);
    color: var(--purple-light);
  }

  .btn-reset:hover {
    background: var(--purple-hover);
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
