import type { IWeaveService } from './weaveService';
import type { PokerSignal } from './types';

/**
 * MockWeaveService for standalone development (no Moss running).
 * Echoes all broadcasts back to registered handlers after 50ms,
 * simulating the full signal loop in a single browser tab.
 */
export class MockWeaveService implements IWeaveService {
  myAgentKey: string = 'mock-agent-alice';
  myNickname: string = 'Alice (dev)';

  private handlers: Array<(signal: PokerSignal, fromKey: string) => void> = [];

  async broadcast(signal: PokerSignal): Promise<void> {
    // Echo back to self after 50ms delay (simulating network round-trip)
    setTimeout(() => {
      const fromKey = this.extractFromKey(signal);
      for (const handler of this.handlers) {
        handler(signal, fromKey);
      }
    }, 50);
  }

  onSignal(handler: (signal: PokerSignal, fromKey: string) => void): () => void {
    this.handlers.push(handler);
    return () => {
      this.handlers = this.handlers.filter((h) => h !== handler);
    };
  }

  private extractFromKey(signal: PokerSignal): string {
    if (signal.type === 'vote') return signal.agentKey;
    if (signal.type === 'start_session') return signal.moderator;
    if (signal.type === 'session_announced') return signal.moderatorKey;
    // For join/reveal/reset/query_sessions, treat sender as self
    return this.myAgentKey;
  }
}
