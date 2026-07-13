self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  const payload = event.data ? event.data.json() : {};

  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const hasVisibleClient = clients.some((client) => client.visibilityState === 'visible');

    clients.forEach((client) => {
      client.postMessage({
        type: 'nuurpath-notification-received',
        notification: payload.data || null,
      });
    });

    if (hasVisibleClient) {
      return;
    }

    await self.registration.showNotification(payload.title || 'NuurPath Alert', {
      body: payload.body || 'You have a new notification.',
      icon: '/nuurpath-logo.png',
      badge: '/nuurpath-logo.png',
      tag: payload.tag || `nuurpath-alert-${Date.now()}`,
      renotify: true,
      data: payload.data || {},
      vibrate: [140, 80, 140],
    });
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = new URL(event.notification.data?.url || '/admin', self.location.origin).toString();

  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });

    for (const client of clients) {
      if (client.url === targetUrl && 'focus' in client) {
        return client.focus();
      }
    }

    if (clients.length > 0) {
      const [firstClient] = clients;
      if ('navigate' in firstClient) {
        await firstClient.navigate(targetUrl);
      }
      if ('focus' in firstClient) {
        return firstClient.focus();
      }
    }

    if (self.clients.openWindow) {
      return self.clients.openWindow(targetUrl);
    }

    return undefined;
  })());
});
