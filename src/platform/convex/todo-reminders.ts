import { api } from '../../../convex/_generated/api';
import { ensureFreshAuth } from '../auth/session';
import { convex } from './client';

export type ReminderReadiness = 'ready' | 'notifications-off' | 'offline';

function applicationServerKey(value: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let index = 0; index < raw.length; index += 1) {
    bytes[index] = raw.charCodeAt(index);
  }
  return bytes;
}

export async function registerTodoReminderWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    return await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  } catch (error) {
    console.error('Could not register the reminder worker:', error);
    return null;
  }
}

export async function ensureTodoReminderDelivery(): Promise<ReminderReadiness> {
  if (!navigator.onLine) return 'offline';
  if (!('Notification' in window) || !('PushManager' in window)) {
    return 'notifications-off';
  }
  const registration = await registerTodoReminderWorker();
  if (!registration) return 'notifications-off';
  const permission =
    Notification.permission === 'default'
      ? await Notification.requestPermission()
      : Notification.permission;
  if (permission !== 'granted') return 'notifications-off';

  try {
    await ensureFreshAuth();
    const publicKey = await convex.query(api.todoReminders.publicKey, {});
    if (!publicKey) return 'notifications-off';
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey(publicKey),
      });
    }
    const json = subscription.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) {
      return 'notifications-off';
    }
    await convex.mutation(api.todoReminders.subscribe, {
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    });
    return 'ready';
  } catch (error) {
    console.error('Could not prepare To Do reminders:', error);
    return navigator.onLine ? 'notifications-off' : 'offline';
  }
}
