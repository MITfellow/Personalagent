/** Service-worker registration with an "update ready" callback. */
export function registerServiceWorker(onUpdateReady: () => void) {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  if (!import.meta.env.PROD) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        if (reg.waiting) onUpdateReady();
        reg.addEventListener('updatefound', () => {
          const next = reg.installing;
          if (!next) return;
          next.addEventListener('statechange', () => {
            if (next.state === 'installed' && navigator.serviceWorker.controller) onUpdateReady();
          });
        });
        // check for a new build every 30 minutes of uptime
        setInterval(() => reg.update().catch(() => {}), 30 * 60 * 1000);
      })
      .catch(() => {
        /* offline support is a progressive enhancement */
      });
  });
}

export async function applyUpdate() {
  if (!('serviceWorker' in navigator)) return window.location.reload();
  const reg = await navigator.serviceWorker.getRegistration();
  reg?.waiting?.postMessage({ type: 'SKIP_WAITING' });
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloaded) return;
    reloaded = true;
    window.location.reload();
  });
  setTimeout(() => window.location.reload(), 1200);
}
