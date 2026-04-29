// Nidit Service Worker — push notifications + minimal offline fallback
// Volontairement minimal : pas de cache agressif (évite les problèmes de stale en preview Lovable).

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// === Push notifications ===
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'Nidit', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'Nidit';
  const options = {
    body: data.body || '',
    icon: '/favicon.png',
    badge: '/favicon.png',
    data: {
      url: data.url || '/',
      notification_id: data.notification_id || null,
      type: data.type || null,
    },
    vibrate: [120, 60, 120],
    tag: data.notification_id || data.type || 'nidit-default',
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          try {
            client.navigate(url);
            return client.focus();
          } catch (_) {
            return client.focus();
          }
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    }),
  );
});

self.addEventListener('pushsubscriptionchange', (event) => {
  // Best-effort: notify clients so they can re-subscribe
  event.waitUntil(
    self.clients.matchAll().then((clients) => {
      clients.forEach((c) => c.postMessage({ type: 'PUSH_SUBSCRIPTION_CHANGE' }));
    }),
  );
});
