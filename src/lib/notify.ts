/** Thin, safe wrapper around the Notification API. */

export function notificationsSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function notificationsAllowed() {
  return notificationsSupported() && Notification.permission === 'granted';
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!notificationsSupported()) return 'denied';
  if (Notification.permission !== 'default') return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}

/** Only fires for background tabs — foreground gets the in-app sound instead. */
export function notify(title: string, body: string, tag?: string) {
  if (!notificationsAllowed()) return;
  if (typeof document !== 'undefined' && !document.hidden) return;
  try {
    const n = new Notification(title, {
      body,
      tag,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      silent: false,
    });
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch {
    /* some browsers require a service-worker registration; ignore */
  }
}
