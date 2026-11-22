/* Ancien service worker de Valou, désormais retiré : il gardait sur les téléphones une vieille version de hoono.be.
   Celui-ci efface les copies gardées, se désinstalle, puis recharge les pages ouvertes avec la version en ligne. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) await caches.delete(k);
    await self.registration.unregister();
    for (const c of await self.clients.matchAll({ type: "window" })) c.navigate(c.url);
  })());
});
