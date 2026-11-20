/* ============================================================
   PortaLink Service Worker
   - Firebase Messaging (preservado) para push em background
   - Notification click handler (abre/foca o app)
   - Cache offline para os arquivos do app
   - Keep-alive via periodic sync (quando suportado)
============================================================ */
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBWNX3xRTBEybD0FmW85c1eL_3mSZujMlY",
  authDomain: "doorvi-video.firebaseapp.com",
  databaseURL: "https://doorvi-video-default-rtdb.firebaseio.com",
  projectId: "doorvi-video",
  storageBucket: "doorvi-video.firebasestorage.app",
  messagingSenderId: "869461304542",
  appId: "1:869461304542:web:35fffbe8fb1b2a00a38e4f"
});

const messaging = firebase.messaging();

/* Push recebido em background (tela apagada / app fechado) */
messaging.onBackgroundMessage((payload) => {
  const data = payload.notification || payload.data || {};
  const title = data.title || '🔔 PortaLink';
  const body = data.body || 'Visitante chamando no interfone';
  self.registration.showNotification(title, {
    body: body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [600,200,600,200,600,200,1000],
    tag: 'porteiro',
    renotify: true,
    requireInteraction: true,
    data: { url: self.registration.scope + 'eu.html' }
  });
});

/* Push event direto (fallback caso onBackgroundMessage não dispare) */
self.addEventListener('push', (event) => {
  let payload = { title: '🔔 PortaLink', body: 'Visitante chamando no interfone' };
  try {
    if (event.data) {
      const d = event.data.json();
      if (d.notification) payload = d.notification;
      else if (d.data) payload = d.data;
    }
  } catch (e) {
    if (event.data) payload.body = event.data.text();
  }
  event.waitUntil(
    self.registration.showNotification(payload.title || '🔔 PortaLink', {
      body: payload.body || 'Visitante chamando',
      icon: 'https://cdn-icons-png.flaticon.com/512/1946/1946436.png',
      badge: 'https://cdn-icons-png.flaticon.com/512/1946/1946436.png',
      vibrate: [600,200,600,200,600,200,1000],
      tag: 'porteiro',
      renotify: true,
      requireInteraction: true,
      data: { url: self.registration.scope + 'eu.html' }
    })
  );
});

/* Clique na notificação: abre/foca o app do morador */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || (self.registration.scope + 'eu.html');
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('eu.html') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});

/* Periodic Background Sync — mantém o SW vivo (Chrome Android, quando suportado) */
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'porteiro-keepalive') {
    event.waitUntil(self.registration.update());
  }
});

/* Install / Activate / Fetch */
self.addEventListener('install', (e) => { self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(clients.claim()); });

const CACHE = 'portalink-v7';
const ASSETS = ['/eu.html', '/index.html', '/manifest.json', '/favicon.svg', '/icon-192.png', '/icon-512.png', '/icon-maskable-192.png', '/icon-maskable-512.png', '/apple-touch-icon.png'];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS).catch(() => {})));
});
self.addEventListener('activate', (e) => {
  // limpa caches antigos pra o celular pegar a versão nova do eu.html
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
});
self.addEventListener('fetch', (e) => {
  // network-first para HTML, fallback cache (suporte offline básico)
  e.respondWith(
    fetch(e.request)
      .then((resp) => {
        if (e.request.method === 'GET' && resp && resp.status === 200 && e.request.url.startsWith(self.location.origin)) {
          const copy = resp.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        }
        return resp;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('/eu.html')))
  );
});
