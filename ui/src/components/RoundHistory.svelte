<script lang="ts">
  import type { RoundResult } from '../lib/types';

  export let history: RoundResult[];
  export let sessionName: string;
  /** If provided, shown as the first (current) entry with a live badge. */
  export let currentRound: RoundResult | null = null;

  $: allRounds = currentRound ? [currentRound, ...history] : history;
  $: totalCount = allRounds.length;

  // Per-round copied state: index into allRounds
  let copiedIndex: number | null = null;
  let copiedAll = false;

  function formatRound(r: RoundResult, label: string): string {
    return [
      `Planning Poker — ${sessionName}`,
      label,
      '',
      r.consensusValue ? `Consensus: ${r.consensusValue}` : 'No consensus',
      ...(r.avg !== null ? [`Average: ${r.avg}  |  Min: ${r.min}  |  Max: ${r.max}`] : []),
      '',
      'Distribution:',
      ...r.distribution.map(({ card, count }) => `  ${card}: ${count} vote${count !== 1 ? 's' : ''}`),
      '',
      'Votes:',
      ...r.votes.map((v) => `  ${v.nickname}: ${v.vote ?? '–'}`),
    ].join('\n');
  }

  function exportRound(r: RoundResult, index: number, isCurrent: boolean) {
    const label = isCurrent ? `Round ${r.roundNumber} (current)` : `Round ${r.roundNumber}`;
    const text = formatRound(r, label);
    navigator.clipboard.writeText(text).then(() => {
      copiedIndex = index;
      setTimeout(() => (copiedIndex = null), 2000);
    }).catch(() => download(text, `round-${r.roundNumber}.txt`));
  }

  function exportAll() {
    const rounds = allRounds.map((r, i) => {
      const isCurrent = currentRound !== null && i === 0;
      const label = isCurrent ? `Round ${r.roundNumber} (current)` : `Round ${r.roundNumber}`;
      return ['═'.repeat(32), label, '═'.repeat(32), formatRound(r, label)].join('\n');
    });
    const text = [
      `Planning Poker — ${sessionName}`,
      `Exported: ${new Date().toLocaleString()}`,
      '',
      ...rounds,
    ].join('\n\n');
    navigator.clipboard.writeText(text).then(() => {
      copiedAll = true;
      setTimeout(() => (copiedAll = false), 2000);
    }).catch(() => download(text, `${sessionName.replace(/\s+/g, '-')}-all-rounds.txt`));
  }

  function download(text: string, filename: string) {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
</script>

{#if totalCount > 0}
  <div class="history-section">
    <!-- Always-visible header with toggle + Export All -->
    <details class="history-details">
      <summary class="history-summary">
        <span class="history-title">
          Round History
          <span class="history-count">{totalCount}</span>
        </span>
        <!-- Export All sits outside the toggle chevron area -->
        <button
          class="btn-export-all"
          on:click|stopPropagation={exportAll}
          aria-label="Export all rounds"
        >
          {copiedAll ? '✓ Copied' : 'Export All'}
        </button>
      </summary>

      <div class="history-body">
        {#each allRounds as round, i}
          {@const isCurrent = currentRound !== null && i === 0}
          <div class="round-card" class:round-card-current={isCurrent}>
            <div class="round-card-header">
              <div class="round-card-title">
                <span class="round-number">Round {round.roundNumber}</span>
                {#if isCurrent}
                  <span class="badge-current">Current</span>
                {/if}
              </div>
              <button
                class="btn-export-round"
                on:click={() => exportRound(round, i, isCurrent)}
                aria-label="Export round {round.roundNumber}"
              >
                {copiedIndex === i ? '✓' : 'Export'}
              </button>
            </div>

            <div class="round-result">
              {#if round.consensusValue}
                <span class="badge-consensus">Consensus: <strong>{round.consensusValue}</strong></span>
              {:else}
                <span class="badge-no-consensus">No consensus</span>
              {/if}
              {#if round.avg !== null}
                <span class="round-stats">
                  Avg <strong>{round.avg}</strong> · Min <strong>{round.min}</strong> · Max <strong>{round.max}</strong>
                </span>
              {/if}
            </div>

            {#if round.distribution.length > 0}
              <div class="round-dist">
                {#each round.distribution as { card, count }}
                  <span class="dist-chip">{card}: {count}</span>
                {/each}
              </div>
            {/if}

            <details class="round-votes">
              <summary>Votes ({round.votes.length})</summary>
              <ul>
                {#each round.votes as v}
                  <li>
                    <span class="voter-name">{v.nickname}</span>
                    <span class="voter-vote">{v.vote ?? '–'}</span>
                  </li>
                {/each}
              </ul>
            </details>
          </div>
        {/each}
      </div>
    </details>
  </div>
{/if}

<style>
  /* ── Outer section — clear visual break from preceding content ── */
  .history-section {
    border-top: 2px solid var(--border-medium);
    padding-top: 1.25rem;
    margin-top: 0.25rem;
  }

  /* ── Collapsible wrapper ── */
  .history-details {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .history-summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: pointer;
    user-select: none;
    list-style: none;
    padding: 0.1rem 0 0.85rem 0;
    gap: 0.75rem;
  }

  /* Hide default marker */
  .history-summary::-webkit-details-marker { display: none; }

  .history-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.85rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--text-medium);
  }

  /* Chevron on the title */
  .history-title::before {
    content: '▶';
    font-size: 0.6rem;
    color: var(--text-dim);
    transition: transform 0.15s;
    display: inline-block;
  }

  .history-details[open] .history-title::before {
    transform: rotate(90deg);
  }

  .history-count {
    background: var(--bg-hover);
    color: var(--text-dim);
    border-radius: 10px;
    padding: 0.05rem 0.5rem;
    font-size: 0.75rem;
    font-weight: 700;
  }

  .btn-export-all {
    background: var(--blue-primary);
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 0.78rem;
    font-weight: 600;
    padding: 0.3rem 0.8rem;
    cursor: pointer;
    transition: background 0.15s;
    flex-shrink: 0;
  }

  .btn-export-all:hover {
    background: var(--blue-hover);
  }

  /* ── History body ── */
  .history-body {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  /* ── Individual round card ── */
  .round-card {
    background: var(--bg-card);
    border: 1px solid var(--border-dim);
    border-radius: 8px;
    padding: 0.85rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .round-card-current {
    border-color: var(--blue-accent);
    background: color-mix(in srgb, var(--bg-card) 92%, var(--blue-accent) 8%);
  }

  .round-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .round-card-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .round-number {
    font-size: 0.8rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-dim);
  }

  .badge-current {
    background: var(--blue-primary);
    color: white;
    font-size: 0.7rem;
    font-weight: 700;
    padding: 0.1rem 0.45rem;
    border-radius: 8px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .btn-export-round {
    background: transparent;
    border: 1px solid var(--border-medium);
    border-radius: 5px;
    color: var(--text-dim);
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.2rem 0.6rem;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
  }

  .btn-export-round:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  .round-result {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
  }

  .badge-consensus {
    background: var(--green-bg);
    border: 1px solid var(--green-border);
    color: var(--green-light);
    padding: 0.15rem 0.55rem;
    border-radius: 10px;
    font-size: 0.82rem;
  }

  .badge-no-consensus {
    background: var(--red-bg);
    color: var(--red-text);
    padding: 0.15rem 0.55rem;
    border-radius: 10px;
    font-size: 0.82rem;
  }

  .round-stats {
    font-size: 0.82rem;
    color: var(--text-medium);
  }

  .round-dist {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
  }

  .dist-chip {
    background: var(--bg-hover);
    color: var(--blue-light);
    border-radius: 4px;
    padding: 0.1rem 0.45rem;
    font-size: 0.77rem;
    font-family: monospace;
    font-weight: 600;
  }

  /* Collapsible per-round votes */
  .round-votes summary {
    font-size: 0.8rem;
    color: var(--text-dim);
    cursor: pointer;
    user-select: none;
    list-style: none;
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }

  .round-votes summary::-webkit-details-marker { display: none; }

  .round-votes summary::before {
    content: '▶';
    font-size: 0.6rem;
    transition: transform 0.15s;
    display: inline-block;
  }

  .round-votes[open] summary::before {
    transform: rotate(90deg);
  }

  .round-votes ul {
    list-style: none;
    margin: 0.4rem 0 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .round-votes li {
    display: flex;
    justify-content: space-between;
    font-size: 0.85rem;
    padding: 0.2rem 0.5rem;
    background: var(--bg-base);
    border-radius: 4px;
  }

  .voter-name { color: var(--text-medium); }

  .voter-vote {
    font-weight: 700;
    color: var(--blue-light);
    font-family: monospace;
  }
</style>
