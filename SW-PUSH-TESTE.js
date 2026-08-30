/* Service Worker isolado para diagnóstico do Push ADM */
const CACHE_NAME = "push-diagnostico-v1";

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    await caches.open(CACHE_NAME);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", event => {
  event.waitUntil((async () => {
    let data = {};
    try {
      data = event.data ? event.data.json() : {};
    } catch (_) {
      data = { mensagem: event.data ? event.data.text() : "" };
    }

    const titulo = data.titulo || "TESTE ADM";
    const mensagem = data.mensagem || "Push recebido pelo Service Worker.";
    const url = data.url || "/";

    console.log("[PUSH-TESTE] Push recebido:", data);

    await self.registration.showNotification(titulo, {
      body: mensagem,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: "push-diagnostico-" + Date.now(),
      renotify: true,
      data: { url }
    });
  })());
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({type:"window", includeUncontrolled:true}).then(async clients => {
      for (const client of clients) {
        if ("focus" in client) {
          try { await client.navigate(new URL(url, self.location.origin).href); } catch (_) {}
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(new URL(url, self.location.origin).href);
    })
  );
});
