# Mesh Poker

A Planning Poker applet for [The Weave / Moss](https://theweave.social) — a Holochain-based collaboration platform.

Teams use Planning Poker to estimate work items together. Each participant votes privately, cards are revealed simultaneously, and the group discusses until consensus is reached. All communication is ephemeral peer-to-peer signaling — no data is written to the DHT.

## Features

- Fibonacci, T-Shirt and custom card sets
- Public and private (invite-by-ID) sessions
- Observer mode (watch without voting)
- Switch between voter and observer mid-session
- Real-time vote progress, reveal, and statistics (avg, min, max, distribution)
- Round history with per-round export
- Moderator failover if the moderator disconnects
- Late joiners sync automatically to the current round state

## Testing

### Standalone UI (no Moss required)

```bash
cd ui
npm install
npm run dev
```

Opens at `http://localhost:5173`. Uses a mock service that echoes signals locally — good for layout and flow testing with a single agent.

### Multi-agent testing with Moss

Requires the [Nix dev shell](https://nixos.org/download) for the Holochain toolchain:

```bash
nix develop
npm run build:dna    # builds the Holochain DNA
npm run build:happ   # bundles the .happ file
```

Then in two separate terminals:

```bash
# Terminal 1
npm run weave:alice

# Terminal 2
npm run weave:bob
```

Alice and Bob each get their own Moss window and can interact as separate agents.

## Tech Stack

- **UI:** Svelte 4, TypeScript, Vite 5
- **Backend:** Holochain HDK 0.6 (ephemeral signals only, no DHT entries)
- **Weave API:** `@theweave/api` 0.6.6
