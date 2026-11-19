// Service Worker com suporte a Push Notifications e Web Share Target
const CACHE_NAME = 'streaming-support-v6';
const SHARE_CACHE = 'tbi-share-target-v1';
const APP_URL = self.location.origin;

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME && key !== SHARE_CACHE).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// ——— WEB SHARE TARGET ———
// Intercepta o POST enviado pelo Android quando o usuário compartilha um arquivo para este PWA
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Verifica se é o endpoint do share target
  if (url.pathname === '/share-comprovante' && event.request.method === 'POST') {
    event.respondWith(handleShareTarget(event.request));
    return;
  }

  // Ignora requisições que não sejam GET ou que sejam para APIs externas
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('supabase.co')) return;

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

/**
 * Processa o arquivo compartilhado pelo Android via Share Target API:
 * 1. Extrai o arquivo do FormData do POST
 * 2. Salva no cache especial 'tbi-share-target-v1'
 * 3. Redireciona o app para /?pwa_share=comprovante
 */
async function handleShareTarget(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('comprovante');

    if (file && (file instanceof File || file instanceof Blob)) {
      const cache = await caches.open(SHARE_CACHE);
      const fileResponse = new Response(file, {
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
          'X-File-Name': (file instanceof File ? file.name : 'comprovante') || 'comprovante',
          'X-File-Size': String(file.size || 0)
        }
      });
      await cache.put('/tbi-shared-file', fileResponse);
    }
  } catch (err) {
    console.error('[SW] Erro ao processar share target:', err);
  }

  // Redireciona para o app com indicador de arquivo compartilhado
  return Response.redirect('/?pwa_share=comprovante', 303);
}



// ——— PUSH NOTIFICATION ———

self.addEventListener('push', (event) => {
  let data = {
    title: '🔔 Suporte Streaming',
    body: 'Novo informe publicado!',
    icon: '/logo.png',
    badge: '/logo.png',
    url: '/'
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/logo.png',
    badge: data.badge || '/logo.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/' },
    actions: [
      { action: 'open', title: 'Ver agora' },
      { action: 'close', title: 'Fechar' }
    ],
    requireInteraction: false,
    tag: 'streaming-notification',
    renotify: true
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Ao clicar na notificação, abrir ou focar o app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') return;

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Se o app já está aberto, foca nele
      for (const client of clientList) {
        if (client.url.includes(APP_URL) && 'focus' in client) {
          return client.focus();
        }
      }
      // Caso contrário, abre uma nova aba
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
