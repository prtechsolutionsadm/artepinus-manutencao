// Service worker do PWA.
// - Arquivos estáticos: cache-first.
// - Páginas: rede primeiro. As páginas usadas sem internet ("/" e "/requisicoes/nova") ficam
//   guardadas para abrir offline; as demais mostram a tela "sem conexão".
// - Push: mostra a notificação e abre a página ao tocar.
const ESTATICO = "artepinus-estatico-v4";
const PAGINAS = "artepinus-paginas-v1";
const OFFLINE = "/offline.html";
const PAGINAS_OFFLINE = ["/", "/requisicoes/nova"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(ESTATICO).then((c) => c.addAll([OFFLINE, "/logo.svg", "/icons/icon-192.png"])));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== ESTATICO && k !== PAGINAS).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

async function guardarEstatico(request, res) {
  if (res.ok) (await caches.open(ESTATICO)).put(request, res.clone());
  return res;
}

/** Guarda a página e os arquivos que ela usa, para abrir sem internet. */
async function guardarPagina(caminho, res) {
  if (!res.ok || res.redirected || !PAGINAS_OFFLINE.includes(caminho)) return;
  const html = await res.clone().text();
  await (await caches.open(PAGINAS)).put(caminho, new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } }));
  const arquivos = [...new Set(html.match(/\/_next\/static\/[^"'\s)]+/g) || [])];
  const cache = await caches.open(ESTATICO);
  await Promise.all(
    arquivos.map(async (url) => {
      if (await cache.match(url)) return;
      try {
        const r = await fetch(url);
        if (r.ok) await cache.put(url, r);
      } catch {}
    })
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || url.pathname === "/logo.svg" || url.pathname === "/marca.svg") {
    event.respondWith(caches.match(request).then((hit) => hit || fetch(request).then((res) => guardarEstatico(request, res))));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          event.waitUntil(guardarPagina(url.pathname, res.clone()));
          return res;
        })
        .catch(async () => (await caches.open(PAGINAS)).match(url.pathname).then((hit) => hit || caches.match(OFFLINE)))
    );
  }
});

self.addEventListener("message", (event) => {
  // O app pede para atualizar as páginas offline (logo após o login e quando volta a conexão)
  if (event.data?.tipo === "aquecer") {
    event.waitUntil(
      Promise.all(
        PAGINAS_OFFLINE.map((p) =>
          fetch(p, { credentials: "same-origin" })
            .then((res) => guardarPagina(p, res))
            .catch(() => {})
        )
      )
    );
  }
  // Ao sair: apaga as páginas guardadas (elas têm dados do usuário)
  if (event.data?.tipo === "limpar") event.waitUntil(caches.delete(PAGINAS));
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
