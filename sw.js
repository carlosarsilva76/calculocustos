/* Service Worker — Planos de Tratamento · Dentalsaúde
   Estratégia:
   - Faz cache dos ficheiros da própria app (abrir offline / rápido).
   - NUNCA faz cache de pedidos ao Supabase (dados têm de ser sempre frescos).
   Sempre que mudares a app, incrementa a versão em CACHE_NOME para forçar atualização.
*/
const CACHE_NOME = "planos-dentalsaude-v4";
const FICHEIROS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-512-maskable.png"
];

// Instalar: guardar os ficheiros da app em cache
self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE_NOME).then(c => c.addAll(FICHEIROS)).then(() => self.skipWaiting())
  );
});

// Ativar: limpar caches antigas de versões anteriores
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(chaves =>
      Promise.all(chaves.filter(k => k !== CACHE_NOME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Pedidos:
self.addEventListener("fetch", e => {
  const url = e.request.url;

  // 1) Nunca intercetar Supabase nem o SDK (sempre rede, dados frescos)
  if (url.includes("supabase.co") || url.includes("supabase-js") || url.includes("jsdelivr.net")) {
    return; // deixa ir direto à rede
  }

  // 2) Para os ficheiros da app: tenta cache primeiro, senão rede (e guarda)
  e.respondWith(
    caches.match(e.request).then(resp => {
      if (resp) return resp;
      return fetch(e.request).then(r => {
        // só guarda respostas válidas do mesmo sítio
        if (r && r.status === 200 && r.type === "basic") {
          const clone = r.clone();
          caches.open(CACHE_NOME).then(c => c.put(e.request, clone));
        }
        return r;
      }).catch(() => caches.match("./index.html")); // fallback offline
    })
  );
});
