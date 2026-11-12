/* Gripetracking — leitura de laudos no próprio celular (sem internet).
   Foto: Tesseract.js (português). PDF digital: pdf.js; PDF escaneado: pdf.js + Tesseract.
   © 2026 Rachel Ingrid Pereira da Rocha Jannuzzi. Todos os direitos reservados. */
'use strict';

const OCR = (() => {
  const base = new URL('./', location.href).href;
  let workerPromise = null;
  let progresso = () => {};

  function carregarScript(src) {
    return new Promise((ok, erro) => {
      if (document.querySelector('script[data-src="' + src + '"]')) return ok();
      const s = document.createElement('script');
      s.src = src; s.dataset.src = src; s.onload = ok; s.onerror = () => erro(new Error('Falha ao carregar ' + src));
      document.head.appendChild(s);
    });
  }

  async function worker() {
    if (!workerPromise) {
      workerPromise = (async () => {
        await carregarScript('vendor/tesseract/tesseract.min.js');
        return Tesseract.createWorker('por', 1, {
          workerPath: base + 'vendor/tesseract/worker.min.js',
          corePath: base + 'vendor/tesseract/',
          langPath: base + 'vendor/tessdata',
          gzip: true,
          workerBlobURL: false,
          logger: m => { if (m.status === 'recognizing text') progresso('Lendo o texto', m.progress); }
        });
      })();
      workerPromise.catch(() => { workerPromise = null; });
    }
    return workerPromise;
  }

  async function ocrImagem(img) {
    progresso('Preparando a leitura', 0);
    const w = await worker();
    const { data } = await w.recognize(img);
    return data.text || '';
  }

  async function pdfLib() {
    const lib = await import(base + 'vendor/pdfjs/pdf.min.js');
    lib.GlobalWorkerOptions.workerSrc = base + 'vendor/pdfjs/pdf.worker.min.js';
    return lib;
  }

  async function lerPDF(file) {
    const lib = await pdfLib();
    const doc = await lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
    let texto = '';
    for (let p = 1; p <= Math.min(doc.numPages, 6); p++) {
      const pg = await doc.getPage(p);
      const tc = await pg.getTextContent();
      let linhaY = null, linha = [];
      tc.items.forEach(it => {
        const y = Math.round(it.transform[5]);
        if (linhaY !== null && Math.abs(y - linhaY) > 3) { texto += linha.join(' ') + '\n'; linha = []; }
        linhaY = y; linha.push(it.str);
      });
      texto += linha.join(' ') + '\n';
    }
    if (texto.replace(/\s/g, '').length > 60) return texto;
    // PDF escaneado: renderiza as páginas e aplica OCR
    texto = '';
    for (let p = 1; p <= Math.min(doc.numPages, 3); p++) {
      const pg = await doc.getPage(p);
      const vp = pg.getViewport({ scale: 2 });
      const cv = document.createElement('canvas');
      cv.width = vp.width; cv.height = vp.height;
      await pg.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise;
      texto += await ocrImagem(cv) + '\n';
    }
    return texto;
  }

  async function lerArquivo(file, onProg) {
    progresso = onProg || (() => {});
    if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) return lerPDF(file);
    return ocrImagem(file);
  }

  /* ---------- interpretação ---------- */
  const semAcento = t => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const RE_NUM = /\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:[.,]\d+)?/g;

  function numBR(s) {
    if (s.includes(',') && s.includes('.')) return Number(s.replace(/\./g, '').replace(',', '.'));
    if (s.includes(',')) return Number(s.replace(',', '.'));
    if (/^\d{1,3}(\.\d{3})+$/.test(s)) return Number(s.replace(/\./g, ''));
    return Number(s);
  }

  function numerosApos(linha, re) {
    const m = linha.match(re);
    const resto = m ? linha.slice(m.index + m[0].length) : linha;
    return (resto.match(RE_NUM) || []).map(numBR).filter(n => isFinite(n));
  }

  function buscar(linhas, re, exclui) {
    for (const l of linhas) {
      if (!re.test(l)) continue;
      if (exclui && exclui.test(l)) continue;
      const ns = numerosApos(l, re);
      if (ns.length) return ns;
    }
    return null;
  }

  function dataColeta(texto) {
    const linhas = texto.split('\n');
    const re = /(\d{2})\/(\d{2})\/(\d{4})/;
    let alvo = linhas.find(l => /coleta|realizad|exame em|data do exame/i.test(l) && re.test(l));
    const m = (alvo || texto).match(re);
    if (!m) return null;
    const iso = m[3] + '-' + m[2] + '-' + m[1];
    return /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(iso) ? iso : null;
  }

  function sangue(texto) {
    const L = semAcento(texto).split('\n');
    const v = {};
    const leuc = buscar(L, /leucocitos|globulos brancos/, /urina|sedimento/);
    if (leuc) { let n = leuc[0]; if (n < 100) n *= 1000; v.leuc = Math.round(n); }
    const linf = buscar(L, /linfocitos/, /atipico|reativo/);
    if (linf) {
      const abs = linf.find(n => n >= 100);
      if (abs) v.linf = Math.round(abs);
      else if (v.leuc && linf[0] < 100) v.linf = Math.round(linf[0] * v.leuc / 100);
    }
    const hb = buscar(L, /hemoglobina/, /corpuscular|glicada|hcm|chcm/);
    if (hb) { const n = hb.find(x => x >= 3 && x <= 25); if (n) v.hb = n; }
    const ht = buscar(L, /hematocrito/);
    if (ht) { const n = ht.find(x => x >= 10 && x <= 75); if (n) v.ht = n; }
    const plaq = buscar(L, /plaquetas/, /volume|vpm/);
    if (plaq) { let n = plaq[0]; if (n < 1000) n *= 1000; v.plaq = Math.round(n); }
    const pcr = buscar(L, /proteina c reativa|\bpcr\b/, /rt-?pcr|sars|covid/);
    if (pcr) v.pcr = pcr[0];
    const dd = buscar(L, /d-?\s?dimero/);
    if (dd) v.ddim = dd[0];
    const ur = buscar(L, /\bureia\b/);
    if (ur) { const n = ur.find(x => x >= 2 && x <= 400); if (n) v.ureia = n; }
    const cr = buscar(L, /creatinina/, /clearance|depuracao|urinaria/);
    if (cr) { const n = cr.find(x => x >= 0.1 && x <= 25); if (n) v.creat = n; }
    return { v, data: dataColeta(texto) };
  }

  const ACHADOS_TC = [
    ['vidro fosco', /vidro\s*fosco|vidro\s*despolido/],
    ['consolidação', /consolida/],
    ['espessamento', /espessamento/],
    ['derrame pleural', /derrame\s*pleural/],
    ['atelectasia', /atelectasia/],
    ['pavimentação em mosaico', /pavimenta|crazy/],
    ['opacidade', /opacidade/]
  ];

  function tc(texto) {
    const t = semAcento(texto);
    const achados = ACHADOS_TC.filter(([, re]) => re.test(t)).map(([n]) => n);
    let pct = null;
    const m = t.match(/(?:acometimento|comprometimento|extensao)[^%\n]{0,60}?(\d{1,3})\s*%/) || t.match(/(\d{1,3})\s*%/);
    if (m && Number(m[1]) <= 100) pct = Number(m[1]);
    return { achados, pct, data: dataColeta(texto) };
  }

  return { lerArquivo, sangue, tc, numBR, ACHADOS_TC: ACHADOS_TC.map(a => a[0]) };
})();
