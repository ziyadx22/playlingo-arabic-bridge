const APP_SW_PATH = "/sw.js";
const PROJECT_ID = "53e74cb1-51db-4d24-b884-0a82d0c66b50";
const PREVIEW_LABEL = /^(?:id-preview|preview)(?:-[a-z0-9]+)?--.+$/;
const PLATFORM_SUFFIXES = [".lovable.app", ".gpt-eng.com", ".gptengineer.run"];
const EXACT_PREVIEW_HOSTS = new Set([
  "id-preview--53e74cb1-51db-4d24-b884-0a82d0c66b50.lovable.app",
  ...PLATFORM_SUFFIXES.map((suffix) => `project--${PROJECT_ID}-dev${suffix}`),
]);

function isPreviewHostname(hostname: string): boolean {
  if (EXACT_PREVIEW_HOSTS.has(hostname)) return true;

  const firstLabel = hostname.split(".")[0] ?? "";
  const isPlatformHost = PLATFORM_SUFFIXES.some((suffix) => hostname.endsWith(suffix));
  if (isPlatformHost && PREVIEW_LABEL.test(firstLabel)) return true;

  return (
    hostname === "lovableproject.com" ||
    hostname.endsWith(".lovableproject.com") ||
    hostname === "lovableproject-dev.com" ||
    hostname.endsWith(".lovableproject-dev.com") ||
    hostname === "beta.lovable.dev" ||
    hostname.endsWith(".beta.lovable.dev")
  );
}

async function unregisterAppServiceWorker(): Promise<void> {
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    const appRegistrations = registrations.filter((registration) =>
      [registration.active, registration.waiting, registration.installing].some(
        (worker) => worker !== null && new URL(worker.scriptURL).pathname === APP_SW_PATH,
      ),
    );
    await Promise.allSettled(appRegistrations.map((registration) => registration.unregister()));
  } catch {
    // A blocked or unavailable service-worker container needs no further action.
  }
}

/** The app's only service-worker registrar. Preview and dev contexts actively remove stale app workers. */
export async function registerPwa(): Promise<void> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  const hostname = window.location.hostname.toLowerCase();
  const refused =
    !import.meta.env.PROD ||
    window.self !== window.top ||
    isPreviewHostname(hostname) ||
    new URLSearchParams(window.location.search).get("sw") === "off";

  if (refused) {
    await unregisterAppServiceWorker();
    return;
  }

  try {
    await navigator.serviceWorker.register(APP_SW_PATH, { scope: "/" });
  } catch (error) {
    console.error("MZGTA service worker registration failed", error);
  }
}
