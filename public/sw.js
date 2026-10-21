// Service worker do PWA: guarda os arquivos estáticos e mostra uma página
// offline quando não há conexão. Dados sempre vêm da rede (nada sensível em cache).
const CACHE = "artepinus-v3";
const OFFLINE = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll([OFFLINE, "/logo.svg"])));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            const copia = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copia));
            return res;
          })
      )
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE)));
  }
});

// ---- Notificações push ----
self.addEventListener("push", (event) => {
  let dados = { titulo: "Manutenção Artepinus", mensagem: "", link: "/" };
  try {
    dados = { ...dados, ...event.data.json() };
  } catch {
    if (event.data) dados.mensagem = event.data.text();
  }
  event.waitUntil(
    Promise.all([
      self.registration.showNotification(dados.titulo, {
        body: dados.mensagem,
        icon: "/icons/icon-192.png",
        badge: "/icons/badge-96.png",
        data: { link: dados.link },
        tag: dados.link,
        renotify: true,
      }),
      // Avisa as abas abertas para atualizarem o sininho
      self.clients.matchAll({ type: "window" }).then((abas) => abas.forEach((a) => a.postMessage({ tipo: "notificacao" }))),
    ])
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destino = new URL(event.notification.data?.link || "/", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((abas) => {
      const aba = abas.find((a) => a.url.startsWith(self.location.origin));
      if (aba) return aba.navigate(destino).then((a) => (a || aba).focus());
      return self.clients.openWindow(destino);
    })
  );
});
