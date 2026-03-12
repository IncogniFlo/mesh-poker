import App from './App.svelte';
import { MockWeaveService } from './lib/mockWeaveService';
import type { IWeaveService } from './lib/weaveService';

async function bootstrap() {
  let service: IWeaveService;

  try {
    const { WeaveClient, isWeaveContext } = await import('@theweave/api');

    // WeaveClient.connect() waits for the Moss iframe to be ready.
    // Race it against a timeout to detect standalone mode.
    const client = await Promise.race([
      WeaveClient.connect(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
    ]);

    if (client && isWeaveContext()) {
      const { encodeHashToBase64 } = await import('@holochain/client');
      const renderInfo = client.renderInfo;

      // renderInfo.appletClient is an AppClient (has myPubKey)
      const myKey = encodeHashToBase64(renderInfo.appletClient.myPubKey);

      let nickname = myKey.slice(0, 8);
      try {
        const profile = await renderInfo.profilesClient.getAgentProfile(
          renderInfo.appletClient.myPubKey
        );
        nickname = profile?.entry?.nickname ?? nickname;
      } catch {
        // profile might not exist yet
      }

      const { WeaveService } = await import('./lib/weaveService');
      service = new WeaveService(client, myKey, nickname);
    } else {
      service = new MockWeaveService();
    }
  } catch (e) {
    console.warn('Not in Weave context, using mock service', e);
    service = new MockWeaveService();
  }

  new App({
    target: document.getElementById('app')!,
    props: { service },
  });
}

bootstrap();
