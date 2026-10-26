/* Kozi – service worker : appli installable et utilisable hors ligne.
   Changer VERSION à chaque mise à jour importante pour forcer le rafraîchissement. */
const VERSION="kozi-v7";
const CORE=["./", "index.html", "manifest.webmanifest", "annonce-banniere-01.jpg", "annonce-banniere-02.jpg", "annonce-banniere-03.jpg", "annonce-banniere-04.jpg", "annonce-banniere-05.jpg", "annonce-banniere-06.jpg", "annonce-banniere-07.jpg", "annonce-banniere-08.jpg", "annonce-banniere-09.jpg", "annonce-fiche-01.jpg", "annonce-fiche-02.jpg", "annonce-fiche-03.jpg", "annonce-fiche-04.jpg", "annonce-fiche-05.jpg", "annonce-fiche-06.jpg", "annonce-fiche-07.jpg", "annonce-fiche-08.jpg", "annonce-fiche-09.jpg", "favicon-48.png", "icone-192.png", "icone-512.png", "icone-apple-180.png", "icone-maskable-512.png", "logo-fond.jpg", "logo.png", "photo-par-defaut.jpg"];
const OPTIONAL=["prix-statbel.json","aides-renovation.json"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(VERSION).then(async c=>{await c.addAll(CORE);await Promise.all(OPTIONAL.map(u=>c.add(u).catch(()=>{})))}).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{
  const r=e.request;if(r.method!=="GET")return;const u=new URL(r.url);if(u.origin!==location.origin)return;
  const fresh=r.mode==="navigate"||/\.(html|json|webmanifest)$/.test(u.pathname);
  if(fresh){ // réseau d"abord : l"utilisateur reçoit toujours la dernière version, le cache sert hors ligne
    e.respondWith(fetch(r).then(res=>{if(res.ok){const cp=res.clone();caches.open(VERSION).then(c=>c.put(r.mode==="navigate"?"index.html":r,cp))}return res})
      .catch(()=>caches.match(r,{ignoreSearch:true}).then(m=>m||caches.match("index.html"))));return}
  e.respondWith(caches.match(r).then(m=>m||fetch(r).then(res=>{if(res.ok){const cp=res.clone();caches.open(VERSION).then(c=>c.put(r,cp))}return res})));
});
