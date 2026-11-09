/**
 * PWA update and install helpers.
 * The service worker caches shell/static resources only.
 * Sensitive data (customer, financial, business) is never cached.
 */

import { registerSW } from 'virtual:pwa-register';

export interface PwaUpdateState {
  needRefresh: boolean;
  offlineReady: boolean;
}

let updateSW: ((reloadPage?: boolean) => Promise<void>) | undefined;

/**
 * Register the service worker and return control callbacks.
 * Uses 'prompt' strategy — user must confirm updates.
 */
export function registerServiceWorker(onUpdate: (state: PwaUpdateState) => void): void {
  updateSW = registerSW({
    onRegisteredSW(_swUrl, _registration) {
      // SW registered — periodic update check
      if (_registration) {
        setInterval(
          () => {
            void _registration.update();
          },
          60 * 60 * 1000, // Check hourly
        );
      }
    },
    onNeedRefresh() {
      onUpdate({ needRefresh: true, offlineReady: false });
    },
    onOfflineReady() {
      onUpdate({ needRefresh: false, offlineReady: true });
    },
  });
}

/** Apply pending service worker update */
export async function applyUpdate(): Promise<void> {
  if (updateSW) {
    await updateSW(true);
  }
}
