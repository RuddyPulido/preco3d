// Guarda os arquivos para o app abrir sem internet.
// Com internet, busca sempre a versão nova (e atualiza a cópia guardada);
// sem internet, ou se a rede demorar mais de 3 s, usa a cópia guardada.

const CACHE = 'preco3d-v1';
const ARQUIVOS = [
  './',
  'index.html',
  'estilo.css',
  'app.js',
  'calculadora.js',
  'formato.js',
  'manifest.webmanifest',
  'icones/icone.svg',
  'icones/icone-192.png',
  'icones/icone-512.png',
  'icones/icone-maskable-512.png',
  'icones/apple-touch-icon.png',
];

self.addEventListener('install', (evento) => {
  evento.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ARQUIVOS)));
  self.skipWaiting();
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (evento) => {
  const { request } = evento;
  if (request.method !== 'GET' || new URL(request.url).origin !== location.origin) return;
  evento.respondWith(buscar(request));
});

async function buscar(request) {
  const cache = await caches.open(CACHE);
  try {
    // no-cache: confere com o servidor em vez de usar a cópia de 10 min do navegador
    const resposta = await comPrazo(fetch(request, { cache: 'no-cache' }), 3000);
    if (resposta.ok) cache.put(request, resposta.clone());
    return resposta;
  } catch {
    return (await cache.match(request, { ignoreSearch: true })) ?? Response.error();
  }
}

function comPrazo(promessa, ms) {
  return new Promise((resolver, rejeitar) => {
    const relogio = setTimeout(() => rejeitar(new Error('demorou')), ms);
    promessa.then(
      (v) => { clearTimeout(relogio); resolver(v); },
      (e) => { clearTimeout(relogio); rejeitar(e); },
    );
  });
}
