/**
 * HeartbeatManager — schedules recurring intervals and clears them all at once.
 * Replaces individual setInterval/clearInterval calls scattered across App.svelte.
 */
export class HeartbeatManager {
  private intervals: ReturnType<typeof setInterval>[] = [];

  /** Add a recurring interval. Returns this for chaining. */
  schedule(fn: () => void, ms: number): this {
    this.intervals.push(setInterval(fn, ms));
    return this;
  }

  /** Cancel all scheduled intervals. */
  clear(): void {
    this.intervals.forEach(clearInterval);
    this.intervals = [];
  }
}
