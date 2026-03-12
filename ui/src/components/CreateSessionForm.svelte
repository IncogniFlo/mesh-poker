<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { CARD_PRESETS, type CardSetType, type CardValue } from '../lib/types';

  const dispatch = createEventDispatcher();

  let name = '';
  let cardSetType: CardSetType = 'fibonacci';
  let isObserver = false;
  let isPrivate = false;
  let customInput = '';

  $: customValues = customInput
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  let cardValues: CardValue[] = CARD_PRESETS.fibonacci;
  $: cardValues = cardSetType === 'custom' ? customValues : CARD_PRESETS[cardSetType as Exclude<CardSetType, 'custom'>];

  $: previewCards = cardValues.slice(0, 10);
  $: canSubmit = name.trim().length > 0 && (cardSetType !== 'custom' || customValues.length >= 2);

  function handleSubmit() {
    if (!canSubmit) return;
    dispatch('create', { name: name.trim(), cardValues, isObserver, isPrivate });
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && e.target instanceof HTMLInputElement) handleSubmit();
  }
</script>

<section class="form-section">
  <h2>New Session</h2>

  <div class="field">
    <label for="session-name">Session name</label>
    <input
      id="session-name"
      type="text"
      placeholder="e.g. Sprint 42"
      bind:value={name}
      on:keydown={handleKeydown}
      autofocus
    />
  </div>

  <div class="field">
    <label>Card set</label>
    <div class="card-set-options">
      <label class="radio-option" class:active={cardSetType === 'fibonacci'}>
        <input type="radio" bind:group={cardSetType} value="fibonacci" />
        Fibonacci
        <span class="preview-inline">1 2 3 5 8 13 21</span>
      </label>
      <label class="radio-option" class:active={cardSetType === 'tshirt'}>
        <input type="radio" bind:group={cardSetType} value="tshirt" />
        T-Shirt
        <span class="preview-inline">XS S M L XL XXL</span>
      </label>
      <label class="radio-option" class:active={cardSetType === 'custom'}>
        <input type="radio" bind:group={cardSetType} value="custom" />
        Custom
      </label>
    </div>

    {#if cardSetType === 'custom'}
      <div class="custom-input-wrap">
        <input
          type="text"
          placeholder="e.g. 1, 2, 4, 8, 16"
          bind:value={customInput}
          class="custom-input"
        />
        {#if customValues.length > 0}
          <div class="card-preview">
            {#each previewCards as card}
              <span class="card-chip">{card}</span>
            {/each}
            {#if cardValues.length > 10}
              <span class="card-chip muted">+{cardValues.length - 10}</span>
            {/if}
          </div>
        {/if}
      </div>
    {:else}
      <div class="card-preview">
        {#each cardValues as card}
          <span class="card-chip">{card}</span>
        {/each}
      </div>
    {/if}
  </div>

  <label class="checkbox-option">
    <input type="checkbox" bind:checked={isPrivate} />
    Private session (join by ID only)
  </label>

  <label class="checkbox-option">
    <input type="checkbox" bind:checked={isObserver} />
    Join as observer (no voting)
  </label>

  <div class="actions">
    <button class="btn btn-cancel" on:click={() => dispatch('cancel')}>
      Cancel
    </button>
    <button class="btn btn-primary" on:click={handleSubmit} disabled={!canSubmit}>
      Create
    </button>
  </div>
</section>

<style>
  .form-section {
    background: var(--bg-card);
    border: 1px solid var(--border-dim);
    border-radius: 12px;
    padding: 2rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    max-width: 520px;
    margin: 2rem auto;
  }

  h2 {
    margin: 0;
    font-size: 1.2rem;
    color: var(--text-primary);
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  label {
    font-size: 0.85rem;
    color: var(--text-medium);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  input[type='text'] {
    background: var(--bg-base);
    border: 1px solid var(--border-medium);
    border-radius: 6px;
    color: var(--text-primary);
    font-size: 1rem;
    padding: 0.6rem 0.75rem;
    outline: none;
    transition: border-color 0.15s;
    width: 100%;
    box-sizing: border-box;
  }

  input[type='text']:focus {
    border-color: var(--blue-primary);
  }

  .card-set-options {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .radio-option {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.6rem 0.75rem;
    border: 1px solid var(--border-dim);
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.9rem;
    color: var(--text-medium);
    text-transform: none;
    letter-spacing: 0;
    transition: border-color 0.15s, background 0.15s;
  }

  .radio-option.active {
    border-color: var(--blue-primary);
    background: var(--blue-deep);
    color: var(--text-primary);
  }

  .radio-option input[type='radio'] {
    accent-color: var(--blue-primary);
    width: auto;
    padding: 0;
    border: none;
    background: none;
  }

  .preview-inline {
    margin-left: auto;
    font-size: 0.75rem;
    color: var(--text-dim);
    font-family: monospace;
  }

  .custom-input-wrap {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-top: 0.4rem;
  }

  .custom-input {
    font-family: monospace;
  }

  .card-preview {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    margin-top: 0.25rem;
  }

  .card-chip {
    background: var(--bg-hover);
    color: var(--blue-light);
    border-radius: 4px;
    padding: 0.15rem 0.5rem;
    font-size: 0.8rem;
    font-family: monospace;
    font-weight: 600;
  }

  .card-chip.muted {
    color: var(--text-dim);
    background: var(--bg-card);
  }

  .checkbox-option {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    font-size: 0.9rem;
    color: var(--text-medium);
    cursor: pointer;
    text-transform: none;
    letter-spacing: 0;
  }

  .checkbox-option input[type='checkbox'] {
    accent-color: var(--blue-primary);
    width: auto;
    padding: 0;
    border: none;
    background: none;
  }

  .actions {
    display: flex;
    gap: 0.75rem;
    justify-content: flex-end;
  }

  .btn {
    padding: 0.6rem 1.25rem;
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

  .btn-primary {
    background: var(--blue-primary);
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background: var(--blue-hover);
  }

  .btn-cancel {
    background: var(--bg-hover);
    color: var(--text-medium);
  }

  .btn-cancel:hover {
    background: var(--border-medium);
  }
</style>
