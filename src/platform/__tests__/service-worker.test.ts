import { describe, expect, it, vi } from 'vitest';
import { registerAppWorker } from '../pwa/service-worker';

function registrationWith(update: () => Promise<void>) {
  return { update } as unknown as ServiceWorkerRegistration;
}

function registrarReturning(registration: ServiceWorkerRegistration) {
  return {
    register: vi.fn().mockResolvedValue(registration),
  } as unknown as Pick<ServiceWorkerContainer, 'register'>;
}

describe('quiet app-worker updates', () => {
  it('does nothing when service workers are unavailable', async () => {
    await expect(registerAppWorker(null)).resolves.toBeNull();
  });

  it('registers the shared worker and quietly checks for an update', async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    const registration = registrationWith(update);
    const serviceWorkers = registrarReturning(registration);

    await expect(registerAppWorker(serviceWorkers)).resolves.toBe(registration);
    expect(serviceWorkers.register).toHaveBeenCalledWith('/sw.js', {
      scope: '/',
    });
    expect(update).toHaveBeenCalledOnce();
  });

  it('keeps a valid registration when its update check is offline', async () => {
    const registration = registrationWith(
      vi.fn().mockRejectedValue(new Error('offline'))
    );

    await expect(
      registerAppWorker(registrarReturning(registration))
    ).resolves.toBe(registration);
  });
});
