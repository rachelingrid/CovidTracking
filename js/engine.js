/* Gripetracking — motor de regras (escores, cor de trajetória, termômetros, encaminhamento).
   Os limiares estão reunidos em PARAM para calibração com os dados coletados.
   © 2026 Rachel Ingrid Pereira da Rocha Jannuzzi. Todos os direitos reservados. */
'use strict';

const PARAM = {
  toleranciaTrajetoria: 1,      // diferença mínima de escore para mudar de cor
  absolutoAzul: 3,              // dias sem histórico: escore ≤ 3 → azul
  absolutoAmarelo: 7,           // ≤ 7 → amarelo; acima → laranja
  pontosRespira: { 0: 0, 1: 1, 2: 2, 3: 4, 4: 5 },
  quarentenaMinima: 7,          // D0 a D7
  febreDiasLimite: 5,           // febre além de D5 → laranja
  idadeITU: 60,
  hidratacaoMlKg: 30,
  hidratacaoMlPorGrau: 500,
  janelaTeste: [3, 7]
};

/* ---------- datas (sempre AAAA-MM-DD, sem fuso) ---------- */
function hojeISO() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function isoParaUTC(iso) { const [a, m, d] = iso.split('-').map(Number); return Date.UTC(a, m - 1, d); }
function somaDias(iso, n) {
  const t = new Date(isoParaUTC(iso) + n * 86400000);
  return t.getUTCFullYear() + '-' + String(t.getUTCMonth() + 1).padStart(2, '0') + '-' + String(t.getUTCDate()).padStart(2, '0');
}
function difDias(a, b) { return Math.round((isoParaUTC(a) - isoParaUTC(b)) / 86400000); }
function diaDoenca(r, iso) { return difDias(iso, r.d0); }
function rotuloDia(n) { return n === 0 ? 'D0' : (n < 0 ? 'D' + n : 'D' + n); }
function dataBR(iso) { const [a, m, d] = iso.split('-'); return d + '/' + m + '/' + a; }
function dataCurta(iso) { const [, m, d] = iso.split('-'); return d + '/' + m; }

/* ---------- registros ---------- */
function datasRegistradas(r) { return Object.keys(r.registros || {}).sort(); }
function anteriores(r, iso) { return datasRegistradas(r).filter(d => d < iso); }
function conjunto(reg) { return new Set((reg && reg.sint) || []); }

function pontosSintoma(s) { return s.peso === 'A' ? 4 : s.peso; }
function escoreDia(reg) {
  if (!reg) return 0;
  let p = 0;
  (reg.sint || []).forEach(id => { if (SINT[id]) p += pontosSintoma(SINT[id]); });
  if (reg.resp && reg.resp.g != null) p += PARAM.pontosRespira[reg.resp.g] || 0;
  const s = num(reg.spo2);
  if (s != null) { if (s < 90) p += 4; else if (s < 92) p += 3; else if (s < 95) p += 2; }
  return p;
}
function faseMaxima(reg) {
  let f = 0;
  (reg && reg.sint || []).forEach(id => { const s = SINT[id]; if (s && s.peso !== 0 && s.fase > f) f = s.fase; });
  return f;
}
function semSintomas(reg) { return !(reg.sint || []).some(id => SINT[id] && SINT[id].peso !== 0); }
function num(v) { if (v === '' || v == null) return null; const n = Number(String(v).replace(',', '.')); return isFinite(n) ? n : null; }

/* ---------- cor de trajetória ---------- */
function corDia(r, iso) {
  const reg = r.registros[iso];
  if (!reg) return null;
  if (avaliarRegras(r, iso).nivel === 'vermelho') return 'vermelho';
  const esc = escoreDia(reg);
  if (esc === 0) return 'azul';
  const prev = anteriores(r, iso);
  if (prev.length === 0) return esc <= PARAM.absolutoAzul ? 'azul' : (esc <= PARAM.absolutoAmarelo ? 'amarelo' : 'laranja');
  // Entrada nas fases 2 (extravasamento) ou 4 (inflamatória) é piora; a fase 3 (reequilíbrio) é recuperação.
  const fasesAntes = new Set();
  prev.forEach(d => (r.registros[d].sint || []).forEach(id => { const s = SINT[id]; if (s && s.peso !== 0) fasesAntes.add(s.fase); }));
  const fasesHoje = new Set((reg.sint || []).map(id => SINT[id]).filter(s => s && s.peso !== 0).map(s => s.fase));
  if ([2, 4].some(f => fasesHoje.has(f) && !fasesAntes.has(f))) return 'laranja';
  const ult = prev.slice(-2).map(d => escoreDia(r.registros[d]));
  const media = ult.reduce((a, b) => a + b, 0) / ult.length;
  const dif = esc - media;
  // Igual ao dia anterior = estável, mesmo que a média de 48 h ainda esteja subindo
  if (Math.abs(esc - ult[ult.length - 1]) <= PARAM.toleranciaTrajetoria && dif > -PARAM.toleranciaTrajetoria) return 'amarelo';
  if (dif >= PARAM.toleranciaTrajetoria) return 'laranja';
  if (dif <= -PARAM.toleranciaTrajetoria) return 'azul';
  return 'amarelo';
}

/* ---------- termômetros ---------- */
function termometroSRAG(reg) {
  if (!reg) return null;
  const s = conjunto(reg);
  let p = 0;
  if (s.has('disp_esf')) p += 3;
  if (s.has('restr')) p += 3;
  if (s.has('tosse')) p += 1;
  if (s.has('tosse_inc')) p += 4;
  if (s.has('pleur')) p += 2;
  if (s.has('disp_rep')) p += 6;
  if (s.has('cianose')) p += 6;
  if (reg.resp && reg.resp.g != null) p += PARAM.pontosRespira[reg.resp.g] || 0;
  const o = num(reg.spo2);
  if (o != null) { if (o < 90) p += 6; else if (o < 92) p += 4; else if (o < 95) p += 2; }
  const nivel = p <= 1 ? 0 : p <= 3 ? 1 : p <= 5 ? 2 : 3;
  const txt = ['Sem sinais de comprometimento pulmonar', 'Sinais leves: observar', 'Possível comprometimento pulmonar', 'Alta possibilidade de SRAG'][nivel];
  return { nivel, pontos: p, txt };
}
function termometroHipoxemia(reg, dia) {
  if (!reg) return null;
  const o = num(reg.spo2);
  if (o == null) return { nivel: null, txt: 'Sem medida de oxímetro' };
  const s = conjunto(reg);
  const temResp = ['disp_esf', 'restr', 'disp_rep', 'cianose'].some(k => s.has(k));
  const nivel = o >= 95 ? 0 : o >= 93 ? 1 : o >= 90 ? 2 : 3;
  if (temResp) return { nivel, txt: 'SpO₂ ' + o + '% com falta de ar (ver SRAG)', silenciosa: false };
  let txt = 'SpO₂ ' + o + '% · sem sinais';
  if (nivel > 0) txt = 'SpO₂ ' + o + '% sem falta de ar' + (dia <= 7 ? ' · fenótipo de hipoxemia silenciosa' : '');
  return { nivel, txt, silenciosa: nivel > 0 && dia <= 7 };
}

/* ---------- quarentena e janelas ---------- */
function fimQuarentena(r) {
  let ultimaFebre = -1;
  datasRegistradas(r).forEach(d => { if (conjunto(r.registros[d]).has('febre') || (num(r.registros[d].temp) || 0) >= 37.8) ultimaFebre = Math.max(ultimaFebre, diaDoenca(r, d)); });
  return Math.max(PARAM.quarentenaMinima, ultimaFebre + 1);
}
function avisoTeste(r, diaHoje) {
  const regs = datasRegistradas(r).map(d => r.registros[d]);
  if (regs.some(g => g.teste === 'positivo')) return null;
  const negs = datasRegistradas(r).filter(d => r.registros[d].teste === 'negativo').map(d => diaDoenca(r, d));
  if (negs.length) {
    const u = Math.max(...negs);
    if (u <= 4 && diaHoje < u + 2) return 'Teste negativo no ' + rotuloDia(u) + '. No início a sensibilidade é menor: repita no ' + rotuloDia(u + 2) + '.';
    if (u <= 4 && diaHoje >= u + 2 && diaHoje <= PARAM.janelaTeste[1] + 2) return 'Hoje é dia de repetir o autoteste (negativo no ' + rotuloDia(u) + ').';
    return null;
  }
  if (diaHoje < PARAM.janelaTeste[0]) return 'A janela ideal para o autoteste de farmácia é do D3 ao D7 (a partir de ' + dataCurta(somaDias(r.d0, 3)) + ').';
  if (diaHoje <= PARAM.janelaTeste[1]) return 'Você está na janela ideal para o autoteste (D3 a D7). Registre o resultado no registro de hoje.';
  return null;
}

/* ---------- fase provável ---------- */
function faseProvavel(reg) { const f = faseMaxima(reg); return f ? { n: f, ...FASES[f] } : null; }

/* ---------- regras de encaminhamento ---------- */
function febreDia(reg) { return conjunto(reg).has('febre') || (num(reg.temp) || 0) >= 37.8; }

function avaliarRegras(r, iso) {
  const reg = r.registros[iso];
  const out = [];
  if (!reg) return { nivel: null, regras: out };
  const s = conjunto(reg);
  const dia = diaDoenca(r, iso);
  const o = num(reg.spo2);
  const temSint = !semSintomas(reg);
  const pleur = s.has('pleur') || (reg.resp && reg.resp.motivo === 'pontada');
  const add = (nivel, id, motivo, orient, hip) => out.push({ nivel, id, motivo, orient, hip: hip || [] });

  // Vermelho
  if (o != null && o < 90) add('vermelho', 'spo2_90', 'SpO₂ abaixo de 90% (' + o + '%)', 'Procure um hospital agora.',
    ['Hipoxemia: considerar gasometria arterial e imagem de tórax', 'Avaliar extensão de acometimento parenquimatoso']);
  if (s.has('hemopt')) add('vermelho', 'hemopt', 'Tosse com sangue (hemoptise)', 'Procure com urgência a emergência de um hospital de grande porte.',
    ['Investigar origem da hemoptise; considerar TC de tórax', 'Considerar lesão vascular pulmonar no contexto de endotelite']);
  if (s.has('tosse_inc')) add('vermelho', 'tosse_inc', 'Tosse seca incapacitante', 'Procure um hospital de grande porte, com tomografia.',
    ['Considerar TC de tórax para avaliar acometimento intersticial (vidro fosco)']);
  if (pleur) add('vermelho', 'pleur', 'Dor em pontada ao respirar (dor pleurítica)', 'Procure um hospital.',
    ['Considerar TC de tórax e hemograma', 'Com hemograma sem alteração, considerar componente inflamatório vascular local', 'Diagnóstico diferencial com tromboembolismo pulmonar conforme julgamento clínico']);
  if (s.has('itu') && (r.idade || 0) > PARAM.idadeITU) add('vermelho', 'itu60', 'Sinais de infecção urinária em pessoa com mais de 60 anos', 'Procure uma emergência.',
    ['Considerar ITU em contexto de urina concentrada e hemoconcentração', 'Urina tipo 1, urocultura, função renal e eletrólitos']);
  if (s.has('avc')) add('vermelho', 'avc', 'Fraqueza em braço ou perna, ou fala alterada', 'Ligue 192 (SAMU) ou vá imediatamente a uma emergência: pode ser AVC.',
    ['Suspeita de evento cerebrovascular: avaliação neurológica imediata']);
  const graves = ['disp_rep', 'dor_tor', 'confusao', 'cianose', 'sincope', 'anuria'].filter(k => s.has(k));
  if (graves.length) add('vermelho', 'graves', graves.map(k => SINT[k].leigo).join('; '), 'Procure uma emergência agora.',
    graves.map(k => 'Sinal de gravidade: ' + SINT[k].tec.toLowerCase()));

  // Laranja
  if (s.has('paralisia') && !s.has('avc')) add('laranja', 'paralisia', 'Paralisia facial periférica', 'Procure avaliação médica em até 72 horas do início: o tratamento nessa janela melhora a recuperação.',
    ['Considerar reativação herpética (HSV/VZV) e investigação conforme julgamento clínico', 'Pesquisar vesículas em conduto auditivo e palato (Ramsay Hunt)', 'Excluir sinais centrais', 'Janela de corticoterapia de 72 h a partir do início']);
  if (o != null && o >= 90 && o < 95 && temSint) add('laranja', 'spo2_94', 'SpO₂ entre 90% e 94% com sintomas (' + o + '%)', 'Procure avaliação médica hoje.',
    ['Dessaturação sintomática: considerar imagem de tórax e reavaliação clínica']);
  if (febreDia(reg) && dia > PARAM.febreDiasLimite) add('laranja', 'febre5', 'Febre após o 5º dia de doença', 'Procure avaliação médica hoje e leve este relatório. Pode ser necessário hemograma.',
    ['Considerar hemograma (leucograma, linfócitos, hematócrito para hemoconcentração) e PCR', 'Considerar infecção secundária (pneumonia comunitária, ITU) em contexto de oligoemia']);
  else if (febreDia(reg)) {
    const prev = anteriores(r, iso);
    const teveFebre = prev.findIndex(d => febreDia(r.registros[d]));
    if (teveFebre >= 0 && prev.slice(teveFebre).some(d => !febreDia(r.registros[d])))
      add('laranja', 'febre_bif', 'Febre que voltou depois de melhorar', 'Procure avaliação médica hoje e leve este relatório.',
        ['Curva febril bifásica: considerar hemograma, PCR e infecção secundária']);
  }
  if (reg.resp && reg.resp.g >= 3) add('laranja', 'respira', 'Teste de respiração alterado (grau ' + reg.resp.g + ')', 'Possível comprometimento do pulmão: procure avaliação médica hoje.',
    ['Restrição inspiratória: considerar imagem de tórax para avaliar vidro fosco perialveolar e subpleural']);

  // Amarelo
  if (o != null && o >= 90 && o < 95 && !temSint) add('amarelo', 'spo2_sil', 'SpO₂ abaixo de 95% sem sintomas (' + o + '%)' + (dia <= 7 ? ' · possível hipoxemia silenciosa' : ''), 'Procure um ambulatório médico.',
    ['Possível hipoxemia silenciosa: confirmar SpO₂ e considerar imagem de tórax']);
  if (febreDia(reg) && s.has('tosse')) add('amarelo', 'febre_tosse', 'Febre com tosse', 'Procure avaliação médica.',
    ['Considerar imagem de tórax a critério médico']);

  out.sort((a, b) => NIVEL_ORDEM.indexOf(b.nivel) - NIVEL_ORDEM.indexOf(a.nivel));
  return { nivel: out.length ? out[0].nivel : 'azul', regras: out };
}

function orientacaoAzul(reg) {
  const s = conjunto(reg);
  if (s.has('mialgia') || s.has('astenia'))
    return 'Foque em hidratação e descanso. Procure um médico de confiança para rastrear COVID e faça um teste de farmácia.';
  if (semSintomas(reg)) return 'Sem sintomas hoje. Continue registrando: mesmo casos leves podem deixar sequelas.';
  return 'Siga em observação: hidrate-se, descanse e registre os sintomas todos os dias.';
}

/* ---------- condutas ---------- */
function metaHidratacao(r, reg) {
  if (r.restricao) return null;
  const peso = num(r.peso);
  if (!peso) return null;
  const t = reg ? num(reg.temp) : null;
  const extra = t && t > 37 ? Math.round((t - 37) * PARAM.hidratacaoMlPorGrau) : 0;
  return Math.round(peso * PARAM.hidratacaoMlKg + extra);
}
function bloqueioCaminhada(r, iso) {
  const reg = r.registros[iso];
  if (!reg) return null;
  const s = conjunto(reg);
  const o = num(reg.spo2);
  const prev = anteriores(r, iso).map(d => num(r.registros[d].spo2)).filter(v => v != null);
  const queda = o != null && ((prev.length && prev[prev.length - 1] - o >= 3) || o < 95);
  if (s.has('disp_esf') || s.has('disp_rep') || s.has('dor_tor') || queda)
    return 'Você relatou falta de ar, dor no peito ou queda do oxigênio: suspenda as caminhadas e busque orientação médica.';
  return null;
}
function bloqueioSol(reg) { return reg && febreDia(reg) ? 'Com febre, não faça exposição ao sol hoje.' : null; }

/* ---------- exames ---------- */
function avaliarHemograma(v) {
  const alt = [];
  if (v.leuc != null) { if (v.leuc > 11000) alt.push('leucocitose'); else if (v.leuc < 4000) alt.push('leucopenia'); }
  if (v.linf != null && v.linf < 1000) alt.push('linfopenia');
  if (v.plaq != null && v.plaq < 150000) alt.push('plaquetopenia');
  if (v.ht != null && v.ht > 50) alt.push('hematócrito elevado (hemoconcentração)');
  return alt;
}
function hipotesesExames(r) {
  const ex = (r.exames || []).slice().sort((a, b) => a.data < b.data ? -1 : 1);
  const hemo = ex.filter(e => e.tipo === 'sangue').pop();
  const tc = ex.filter(e => e.tipo === 'tc').pop();
  const hip = [];
  if (hemo) {
    const alt = avaliarHemograma(hemo.v);
    if (alt.length) hip.push('Hemograma de ' + dataBR(hemo.data) + ' com ' + alt.join(', '));
  }
  if (tc && tc.achados && tc.achados.length) {
    const leucNormal = hemo && hemo.v.leuc != null && hemo.v.leuc >= 4000 && hemo.v.leuc <= 11000;
    if (leucNormal) hip.push('TC com alteração (' + tc.achados.join(', ') + ') e leucograma sem alteração: processo inflamatório; investigar componente inflamatório vascular local');
    else hip.push('TC com alteração: ' + tc.achados.join(', ') + (tc.pct ? ' (' + tc.pct + '% de acometimento)' : ''));
  }
  return hip;
}

function sugerirEncerramento(r) {
  const ds = datasRegistradas(r).slice(-3);
  if (ds.length < 3) return false;
  return ds.every(d => semSintomas(r.registros[d])) && difDias(ds[2], ds[0]) === 2;
}

/* ---------- gripe x COVID ---------- */
function sinaisCovid(r) {
  const vistos = new Set();
  datasRegistradas(r).forEach(d => (r.registros[d].sint || []).forEach(id => { if (SINAIS_COVID.includes(id)) vistos.add(id); }));
  return [...vistos];
}
function situacaoTeste(r) {
  const ds = datasRegistradas(r);
  if (ds.some(d => r.registros[d].teste === 'positivo')) return 'positivo';
  const negs = ds.filter(d => r.registros[d].teste === 'negativo');
  if (negs.length >= 2 && difDias(negs[negs.length - 1], negs[0]) >= 2) return 'negativos';
  if (negs.length) return 'negativo';
  return 'sem';
}
