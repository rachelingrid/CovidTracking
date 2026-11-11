/* COVID Tracking — service worker: guarda o app no celular para funcionar sem internet.
   © 2026 Rachel Ingrid Pereira da Rocha Jannuzzi. Todos os direitos reservados. */
const VERSAO = 'covidtracking-v1.1.0';
const ARQUIVOS = [
  './', 'index.html', 'manifest.webmanifest', 'css/styles.css',
  'js/data.js', 'js/engine.js', 'js/ocr.js', 'js/report.js', 'js/app.js',
  'icons/icon-192.png', 'icons/icon-512.png',
  'vendor/jspdf.umd.min.js', 'vendor/pdfjs/pdf.min.js', 'vendor/pdfjs/pdf.worker.min.js',
  'vendor/tesseract/tesseract.min.js', 'vendor/tesseract/worker.min.js',
  'vendor/tesseract/tesseract-core-simd-lstm.wasm.js', 'vendor/tesseract/tesseract-core-lstm.wasm.js',
  'vendor/tessdata/por.traineddata.gz'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSAO).then(c => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(r => r || fetch(e.request).then(resp => {
      if (resp.ok) { const cp = resp.clone(); caches.open(VERSAO).then(c => c.put(e.request, cp)); }
      return resp;
    }).catch(() => caches.match('index.html')))
  );
});
