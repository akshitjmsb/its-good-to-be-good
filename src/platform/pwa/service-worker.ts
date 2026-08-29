type ServiceWorkerRegistrar = Pick<ServiceWorkerContainer, 'register'>;

function browserServiceWorkers(): ServiceWorkerRegistrar | null {
  if (
    typeof navigator === 'undefined' ||
    !('serviceWorker' in navigator)
  ) {
    return null;
  }
  return navigator.serviceWorker;
}

/**
 * Keep the notification worker current without caching or reloading the page.
 * A failed update check is harmless: the installed worker remains available.
 */
export async function registerAppWorker(
  serviceWorkers: ServiceWorkerRegistrar | null = browserServiceWorkers()
): Promise<ServiceWorkerRegistration | null> {
  if (!serviceWorkers) return null;

  try {
    const registration = await serviceWorkers.register('/sw.js', {
      scope: '/',
    });
    try {
      await registration.update();
    } catch {
      // An update check can fail while offline; keep the current registration.
    }
    return registration;
  } catch (error) {
    console.error('Could not register the app worker:', error);
    return null;
  }
}
