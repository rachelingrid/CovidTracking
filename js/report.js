/* COVID Tracking — relatório de encaminhamento em PDF, gerado no celular.
   © 2026 Rachel Ingrid Pereira da Rocha Jannuzzi. Todos os direitos reservados. */
'use strict';

const Relatorio = (() => {
  const limpa = t => String(t == null ? '' : t)
    .replace(/₂/g, '2').replace(/≥/g, '>=').replace(/≤/g, '<=').replace(/[“”]/g, '"').replace(/[‘’]/g, "'")
    .replace(/→/g, '->');

  function gerar(r, isoRef) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const M = 16, W = 210 - 2 * M;
    let y = M;

    const pagina = h => { if (y + h > 280) { rodape(); doc.addPage(); y = M; } };
    const texto = (t, o = {}) => {
      doc.setFont('helvetica', o.b ? 'bold' : 'normal');
      doc.setFontSize(o.s || 10);
      doc.setTextColor(...(o.c || [30, 30, 30]));
      const linhas = doc.splitTextToSize(limpa(t), o.w || W - (o.x || 0));
      linhas.forEach(l => { pagina(5); doc.text(l, M + (o.x || 0), y); y += (o.s || 10) * 0.45 + 1; });
    };
    const titulo = t => { y += 3; pagina(10); texto(t, { b: true, s: 12, c: [12, 68, 124] }); doc.setDrawColor(200); doc.line(M, y - 3, M + W, y - 3); y += 1; };
    const item = t => texto('•  ' + t, { x: 2 });
    function rodape() {
      doc.setFont('helvetica', 'italic'); doc.setFontSize(8); doc.setTextColor(110);
      doc.text(limpa('Relatório gerado a partir de autorrelato. Não substitui avaliação clínica.'), M, 290);
      doc.text(limpa('COVID Tracking · © 2026 Rachel Ingrid Pereira da Rocha Jannuzzi'), M + W, 290, { align: 'right' });
    }

    const datas = datasRegistradas(r);
    const iso = isoRef || datas[datas.length - 1] || hojeISO();
    const av = avaliarRegras(r, iso);
    const agora = new Date();

    texto('COVID Tracking — Relatório de encaminhamento', { b: true, s: 16 });
    texto('Gerado em ' + agora.toLocaleDateString('pt-BR') + ' às ' + agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) +
      ' · referente a ' + dataBR(iso) + ' (' + rotuloDia(diaDoenca(r, iso)) + ')', { s: 9, c: [90, 90, 90] });

    titulo('1. Motivo do encaminhamento');
    if (av.regras.length) av.regras.forEach(g => item(COR[g.nivel].nome + ': ' + g.motivo + '. Orientação dada: ' + g.orient));
    else item('Sem regra de encaminhamento disparada; relatório gerado a pedido do paciente.');

    titulo('2. Identificação e âncoras');
    const com = (r.comorb || []).map(k => (COMORBIDADES.find(c => c[0] === k) || [k, k])[1]);
    item('Paciente: ' + (r.nome || '-') + (r.para === 'terceiro' ? ' (rastreio feito por cuidador)' : '') +
      ' · ' + (r.idade || '-') + ' anos · ' + (r.sexo || '-') + ' · ' + (r.peso || '-') + ' kg · ' + (r.altura || '-') + ' cm');
    item('Comorbidades: ' + (com.length ? com.join(', ') : 'nenhuma informada') + ' · Vacinação: ' + (r.vacina || 'não informada'));
    item('Uso de diurético, mineralocorticoide ou restrição hídrica: ' + (r.restricao ? 'SIM' : 'não'));
    item('Início dos sintomas (D0): ' + dataBR(r.d0) + (r.dataContato ? ' · contato provável: ' + dataBR(r.dataContato) : ''));
    const testes = datas.filter(d => r.registros[d].teste && r.registros[d].teste !== 'nao').map(d => rotuloDia(diaDoenca(r, d)) + ' ' + r.registros[d].teste);
    item('Autoteste: ' + (testes.length ? testes.join('; ') : 'não registrado'));
    if (r.email) item('Contato: ' + r.email);

    titulo('3. Linha do tempo');
    datas.forEach(d => {
      const g = r.registros[d];
      const cor = corDia(r, d);
      const sint = (g.sint || []).map(id => SINT[id] ? SINT[id].tec : id).join(', ') || 'sem sintomas';
      const sinais = [g.spo2 ? 'SpO2 ' + g.spo2 + '%' : '', g.temp ? 'T ' + g.temp + ' °C' : '', g.fc ? 'FC ' + g.fc : '',
        g.resp && g.resp.g != null ? 'teste resp. grau ' + g.resp.g + (g.resp.motivo === 'pontada' ? ' (dor em pontada)' : g.resp.motivo === 'ar' ? ' (ar não entra)' : '') : ''].filter(Boolean).join(' · ');
      texto(rotuloDia(diaDoenca(r, d)) + ' (' + dataCurta(d) + ') · ' + (cor ? COR[cor].nome : '-'), { b: true, s: 9.5 });
      texto(sint + (sinais ? ' · ' + sinais : ''), { s: 9, x: 4 });
      const c = g.cond || {};
      const cond = [c.agua ? 'água ' + c.agua + ' L' : '', c.cam != null ? c.cam + '/3 caminhadas' : '', c.ref != null ? c.ref + '/3 refeições' : '',
        c.sono ? c.sono + ' h sono' : '', c.med ? 'medicações: ' + c.med : ''].filter(Boolean).join(' · ');
      if (cond) texto('Condutas: ' + cond, { s: 8.5, x: 4, c: [90, 90, 90] });
      y += 0.5;
    });

    titulo('4. Exames (valores conferidos pelo paciente)');
    const ex = (r.exames || []).slice().sort((a, b) => a.data < b.data ? -1 : 1);
    if (!ex.length) item('Nenhum exame registrado.');
    ex.forEach(e => {
      if (e.tipo === 'sangue') {
        const v = e.v, p = [];
        if (v.leuc != null) p.push('leucócitos ' + v.leuc); if (v.linf != null) p.push('linfócitos ' + v.linf);
        if (v.hb != null) p.push('Hb ' + v.hb); if (v.ht != null) p.push('Ht ' + v.ht + '%'); if (v.plaq != null) p.push('plaquetas ' + v.plaq);
        if (v.pcr != null) p.push('PCR ' + v.pcr); if (v.ddim != null) p.push('D-dímero ' + v.ddim);
        if (v.ureia != null) p.push('ureia ' + v.ureia); if (v.creat != null) p.push('creatinina ' + v.creat);
        item('Sangue · ' + dataBR(e.data) + ' (' + rotuloDia(diaDoenca(r, e.data)) + '): ' + (p.join(', ') || 'sem valores'));
      } else {
        item('Tomografia de tórax · ' + dataBR(e.data) + ' (' + rotuloDia(diaDoenca(r, e.data)) + '): ' +
          (e.achados && e.achados.length ? e.achados.join(', ') : 'sem achados marcados') + (e.pct ? ' · ' + e.pct + '% de acometimento' : ''));
      }
    });

    titulo('5. Hipóteses a investigar (a critério médico)');
    const hip = [];
    av.regras.forEach(g => g.hip.forEach(h => { if (!hip.includes(h)) hip.push(h); }));
    hipotesesExames(r).forEach(h => hip.push(h));
    if (r.restricao) hip.push('Paciente em uso de diurético/mineralocorticoide ou com restrição hídrica: considerar controle rigoroso de diurese e eletrólitos');
    ['conjunt', 'paralisia'].forEach(id => {
      const d1 = datas.find(d => conjunto(r.registros[d]).has(id));
      if (d1) hip.push(SINT[id].tec + ' iniciada em ' + rotuloDia(diaDoenca(r, d1)) + ': cronologia relevante para diferenciar acometimento viral direto de alteração perfusional');
    });
    if (!hip.length) hip.push('Sem hipóteses adicionais geradas pelas regras do aplicativo.');
    hip.forEach(item);

    rodape();
    return doc;
  }

  async function compartilhar(r, isoRef) {
    const doc = gerar(r, isoRef);
    const nome = 'relatorio-covid-' + (r.nome || 'paciente').toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + hojeISO() + '.pdf';
    const blob = doc.output('blob');
    const file = new File([blob], nome, { type: 'application/pdf' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: 'Relatório COVID Tracking' }); return 'compartilhado'; }
      catch (e) { if (e.name === 'AbortError') return 'cancelado'; }
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = nome; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    return 'baixado';
  }

  return { gerar, compartilhar };
})();
