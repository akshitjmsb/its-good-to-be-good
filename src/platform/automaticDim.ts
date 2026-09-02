const DIM_CLASS = 'system-dimmed';
const SYNC_INTERVAL_MS = 30_000;

export function isAutomaticDimHour(hour: number): boolean {
  return hour < 5 || hour >= 18;
}

export function applyAutomaticDim(
  body: Pick<HTMLElement, 'classList'>,
  now: Date = new Date()
): void {
  body.classList.toggle(DIM_CLASS, isAutomaticDimHour(now.getHours()));
}

let activeCleanup: (() => void) | null = null;

/** Keep every system surface aligned with the device's local day. */
export function initializeAutomaticDim(): void {
  if (activeCleanup || typeof document === 'undefined') return;

  const sync = () => applyAutomaticDim(document.body);
  const syncWhenVisible = () => {
    if (document.visibilityState === 'visible') sync();
  };

  sync();
  const intervalId = window.setInterval(sync, SYNC_INTERVAL_MS);
  document.addEventListener('visibilitychange', syncWhenVisible);

  activeCleanup = () => {
    window.clearInterval(intervalId);
    document.removeEventListener('visibilitychange', syncWhenVisible);
    activeCleanup = null;
  };
  window.addEventListener('beforeunload', activeCleanup, { once: true });
}
