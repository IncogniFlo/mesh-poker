import type { PokerSignal } from './types';

export interface IWeaveService {
  myAgentKey: string;
  myNickname: string;
  broadcast(signal: PokerSignal): Promise<void>;
  onSignal(handler: (signal: PokerSignal, fromKey: string) => void): () => void;
}

interface SignalEnvelope {
  fromKey: string;
  signal: PokerSignal;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function encode(envelope: SignalEnvelope): Uint8Array {
  return encoder.encode(JSON.stringify(envelope));
}

function decode(bytes: Uint8Array): SignalEnvelope {
  return JSON.parse(decoder.decode(bytes));
}

export class WeaveService implements IWeaveService {
  myAgentKey: string;
  myNickname: string;

  private client: any;
  private handlers: Array<(signal: PokerSignal, fromKey: string) => void> = [];

  constructor(client: any, agentKey: string, nickname: string) {
    this.client = client;
    this.myAgentKey = agentKey;
    this.myNickname = nickname;
  }

  async broadcast(signal: PokerSignal): Promise<void> {
    const envelope: SignalEnvelope = { fromKey: this.myAgentKey, signal };
    await this.client.sendRemoteSignal(encode(envelope));
    // sendRemoteSignal does not loop back to the sender — echo locally
    for (const handler of this.handlers) {
      handler(signal, this.myAgentKey);
    }
  }

  onSignal(handler: (signal: PokerSignal, fromKey: string) => void): () => void {
    this.handlers.push(handler);
    const unsubRemote = this.client.onRemoteSignal((payload: Uint8Array) => {
      try {
        const { fromKey, signal } = decode(payload);
        handler(signal, fromKey);
      } catch (e) {
        console.warn('Failed to decode remote signal', e);
      }
    });
    return () => {
      this.handlers = this.handlers.filter((h) => h !== handler);
      unsubRemote();
    };
  }
}
