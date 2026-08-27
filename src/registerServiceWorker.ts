/** Registers the app-shell service worker in production builds only. */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return

  window.addEventListener('load', () => {
    // The build id in the query string makes the script itself change on every
    // deploy, which is what triggers the browser to fetch and install it.
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js?v=${__BUILD_ID__}`, {
        scope: import.meta.env.BASE_URL,
      })
      .catch(() => {
        // Offline support is a bonus; a failed registration must not break the app.
      })
  })
}
