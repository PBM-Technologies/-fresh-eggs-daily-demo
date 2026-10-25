/**
 * Registers the manifest and service worker only when served over http(s)
 * from a host that also serves manifest.webmanifest and sw.js (the GitHub
 * Pages build copies them next to index.html). Opening the single file from
 * disk skips all of this, so the standalone build never breaks.
 */
export function registerPwa() {
  if (typeof window === 'undefined') return;
  const { protocol } = window.location;
  if (protocol !== 'http:' && protocol !== 'https:') return;
  const base = new URL('./', window.location.href);
  const manifestUrl = new URL('manifest.webmanifest', base).href;
  fetch(manifestUrl, { method: 'HEAD' })
    .then((res) => {
      if (!res.ok) return;
      if (!document.querySelector('link[rel="manifest"]')) {
        const link = document.createElement('link');
        link.rel = 'manifest';
        link.href = manifestUrl;
        document.head.appendChild(link);
        const touch = document.createElement('link');
        touch.rel = 'apple-touch-icon';
        touch.href = new URL('icon.svg', base).href;
        document.head.appendChild(touch);
      }
      if ('serviceWorker' in navigator && window.isSecureContext) {
        navigator.serviceWorker.register(new URL('sw.js', base).href, { scope: base.pathname }).catch(() => {
          /* offline support is a bonus; ignore failures */
        });
      }
    })
    .catch(() => {});
}
