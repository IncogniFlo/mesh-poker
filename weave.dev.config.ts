import { defineConfig } from '@theweave/cli/defineConfig.js';

export default defineConfig({
  groups: [
    {
      name: 'Planning Poker Dev',
      networkSeed: 'planning-poker-dev-seed-001',
      icon: {
        type: 'filesystem',
        path: './images/icon.png',
      },
      creatingAgent: {
        agentIdx: 1,
        agentProfile: {
          nickname: 'Alice',
        },
      },
      joiningAgents: [
        {
          agentIdx: 2,
          agentProfile: {
            nickname: 'Bob',
          },
        },
      ],
      applets: [
        {
          name: 'Planning Poker',
          instanceName: 'planning-poker',
          registeringAgent: 1,
          joiningAgents: [2],
        },
      ],
    },
  ],
  applets: [
    {
      name: 'Planning Poker',
      subtitle: 'Estimate story points together',
      description: 'Fibonacci planning poker for agile teams',
      icon: {
        type: 'filesystem',
        path: './images/icon.png',
      },
      source: {
        type: 'filesystem',
        path: './workdir/mesh_poker.webhapp',
      },
    },
  ],
  toolCurations: [],
});
