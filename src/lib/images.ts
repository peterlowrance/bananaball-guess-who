// Image preloading. Warms the browser HTTP cache + the SW runtime cache for a
// set of player headshots so a lesson's images are ready (and offline-safe)
// before the questions render.
import type { Player } from '../data/types';

const warmed = new Set<string>();

/** Preload a batch of player headshots. Resolves when all settle (or timeout). */
export function preloadPlayerImages(players: readonly Player[], timeoutMs = 5000): Promise<void> {
  const urls = players.map((p) => p.image_url).filter((u) => !warmed.has(u));
  if (urls.length === 0) return Promise.resolve();
  return new Promise((resolve) => {
    let remaining = urls.length;
    const done = () => {
      if (--remaining <= 0) resolve();
    };
    const timer = setTimeout(resolve, timeoutMs);
    for (const url of urls) {
      const img = new Image();
      img.onload = img.onerror = () => {
        warmed.add(url);
        done();
        if (remaining <= 0) clearTimeout(timer);
      };
      img.src = url;
    }
  });
}

/** Fire-and-forget warm of a unit's images on idle (no await needed). */
export function warmUnitImages(players: readonly Player[]): void {
  const run = () => void preloadPlayerImages(players, 8000);
  if ('requestIdleCallback' in window) {
    (window as unknown as { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(run);
  } else {
    setTimeout(run, 500);
  }
}
