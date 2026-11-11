/* COVID Tracking — interface.
   © 2026 Rachel Ingrid Pereira da Rocha Jannuzzi. Todos os direitos reservados. */
'use strict';

/* ================= armazenamento (só no celular) ================= */
const CHAVE = 'covidtracking.v1';
let DB = carregar();
function carregar() {
  try { return JSON.parse(localStorage.getItem(CHAVE)) || { aceite: false, ativo: null, rastreios: {} }; }
  catch (e) { return { aceite: false, ativo: null, rastreios: {} }; }
}
function salvar() {
  try { localStorage.setItem(CHAVE, JSON.stringify(DB)); }
  catch (e) { toast('Não foi possível salvar: memória do navegador cheia.'); }
}
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
const R = () => DB.rastreios[DB.ativo] || null;

/* ================= estado da tela ================= */
const UI = { view: null, dataSel: null, rascunho: null, exame: null, editando: false };
const $ = s => document.querySelector(s);
const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const app = () => document.getElementById('app');

function toast(msg) {
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
  document.body.appendChild(t); setTimeout(() => t.remove(), 2800);
}
function modal(html, onReady) {
  const m = document.createElement('div'); m.className = 'modal';
  m.innerHTML = '<div role="dialog" aria-modal="true">' + html + '</div>';
  document.body.appendChild(m);
  m.addEventListener('click', e => { if (e.target === m || e.target.closest('[data-fechar]')) m.remove(); });
  if (onReady) onReady(m);
  return m;
}

function ir(view, extra) {
  UI.view = view; Object.assign(UI, extra || {});
  render(); window.scrollTo(0, 0);
}

function render() {
  if (!DB.aceite) return vAviso();
  if (DB.pesquisa == null) return vPesquisa();
  const r = R();
  if (!r || UI.view === 'cadastro') return vCadastro(UI.editando ? r : null);
  const v = UI.view || 'inicio';
  ({ inicio: vInicio, registrar: vRegistrar, exames: vExames, mais: vMais, restricao: vRestricao }[v] || vInicio)(r);
  if (v !== 'restricao') abas(v);
}

function abas(atual) {
  let n = document.querySelector('nav.tabs');
  if (!n) { n = document.createElement('nav'); n.className = 'tabs'; document.body.appendChild(n); }
  const t = [['inicio', '🏠', 'Início'], ['registrar', '📝', 'Registrar'], ['exames', '🔬', 'Exames'], ['mais', '☰', 'Mais']];
  n.innerHTML = t.map(([v, i, l]) => '<button data-tab="' + v + '" class="' + (v === atual ? 'on' : '') + '"><span aria-hidden="true">' + i + '</span>' + l + '</button>').join('');
  n.onclick = e => { const b = e.target.closest('[data-tab]'); if (b) ir(b.dataset.tab, { dataSel: null, rascunho: null, exame: null }); };
}
function semAbas() { const n = document.querySelector('nav.tabs'); if (n) n.remove(); }

/* ================= aviso inicial ================= */
function vAviso() {
  semAbas();
  app().innerHTML = `
  <h1>COVID Tracking</h1>
  <p class="sub">Rastreio da gripe, dia a dia, com foco em COVID-19.</p>
  <div class="card">
    <h3 style="margin-top:0">Começou com sintomas de gripe? Comece a registrar.</h3>
    <p>No início, a COVID-19 é muito parecida com uma gripe comum. Por isso, a qualquer sinal de gripe, principalmente se estiver forte ou com muita dor no corpo, comece o monitoramento anotando seus sintomas todos os dias.</p>
    <p><b>Por que o nome COVID Tracking?</b> O objetivo é juntar os sinais e sintomas que apontam para COVID e para um quadro grave, e avisar você a tempo de:</p>
    <ul class="l">
      <li>fazer o autoteste no momento certo;</li>
      <li>procurar o médico quando for preciso;</li>
      <li>levar ao médico um relatório com tudo o que aconteceu desde o primeiro dia.</li>
    </ul>
  </div>
  <div class="banner red"><b>Restrição hídrica</b>Se você já tem restrição de líquidos por qualquer motivo, procure seu médico imediatamente para controle rigoroso da urina e dos sais do sangue (eletrólitos).</div>
  <div class="card">
    <h3 style="margin-top:0">O que o app não faz</h3>
    <ul class="l">
      <li>Não faz diagnóstico, não prescreve medicamentos e não substitui consulta médica.</li>
      <li>Em emergência, ligue <b>192 (SAMU)</b> ou vá ao pronto-socorro.</li>
    </ul>
    <h3>Seus dados</h3>
    <p class="sub">Tudo fica guardado apenas neste celular. Nada sai do aparelho sem você tocar em "Enviar". Você pode exportar ou apagar seus dados quando quiser.</p>
  </div>
  <label class="opt"><input type="checkbox" id="ok"> Li e concordo. Entendo que dados de saúde são dados sensíveis e autorizo guardá-los neste aparelho (LGPD).</label>
  <button class="pri full" id="seg" disabled style="margin-top:12px">Continuar</button>
  <p class="foot">© 2026 Rachel Ingrid Pereira da Rocha Jannuzzi · Todos os direitos reservados</p>`;
  $('#ok').onchange = e => { $('#seg').disabled = !e.target.checked; };
  $('#seg').onclick = () => { DB.aceite = true; salvar(); ir(DB.pesquisa == null ? null : 'cadastro'); };
}

/* ================= termo de consentimento para pesquisa (opcional) ================= */
function textoTermo() {
  return `
    <p>Os registros feitos neste app podem ajudar a entender como a gripe e a COVID-19 evoluem e quais sinais anunciam um quadro grave.</p>
    <p><b>Pesquisadora responsável:</b> ${PESQUISA.pesquisadora}. Contato: ${PESQUISA.email}.</p>
    <ul class="l">
      <li><b>Participar é opcional.</b> O app funciona igual se você não autorizar.</li>
      <li><b>O que é usado:</b> idade, sexo, peso, doenças prévias, vacinação, sintomas por dia, medidas, teste de respiração, condutas e exames registrados.</li>
      <li><b>O que não é enviado:</b> nome, e-mail e qualquer dado das pessoas que você avisou. Cada rastreio recebe um código aleatório.</li>
      <li><b>Como os dados chegam à pesquisadora:</b> só quando você tocar em "Enviar dados para a pesquisa", por e-mail ou outro aplicativo que você escolher.</li>
      <li><b>Uso:</b> apenas pesquisa científica, em projeto aprovado por Comitê de Ética em Pesquisa (CEP). Resultados são publicados só em conjunto, sem identificar ninguém.</li>
      <li><b>Você pode desistir</b> a qualquer momento, sem prejuízo, em "Mais › Pesquisa". Para retirar dados já enviados, escreva para ${PESQUISA.email} informando o código do rastreio.</li>
      <li><b>Riscos e benefícios:</b> não há procedimento físico; o risco é o de exposição de dados, reduzido por não enviar nome nem e-mail. Não há pagamento nem custo.</li>
    </ul>
    <p class="sub">Termo versão ${PESQUISA.versaoTermo}.</p>`;
}
function vPesquisa(voltarPara) {
  semAbas();
  app().innerHTML = `
  <h1>Pesquisa científica</h1>
  <p class="sub">Termo de consentimento livre e esclarecido · leia com calma</p>
  <div class="card">${textoTermo()}</div>
  <p><b>Você autoriza o uso dos seus dados, sem nome e sem e-mail, em pesquisa científica?</b></p>
  <button class="pri full" id="sim">Sim, autorizo</button>
  <button class="full" id="nao" style="margin-top:8px">Não autorizo</button>`;
  const fim = v => {
    DB.pesquisa = v; DB.pesquisaData = new Date().toISOString(); DB.pesquisaTermo = PESQUISA.versaoTermo; salvar();
    toast(v ? 'Obrigada! Autorização registrada.' : 'Tudo bem. O app funciona normalmente.');
    if (voltarPara) ir(voltarPara); else ir(R() ? 'inicio' : 'cadastro');
  };
  $('#sim').onclick = () => fim(true);
  $('#nao').onclick = () => fim(false);
}

/* ================= cadastro ================= */
function vCadastro(r) {
  semAbas();
  const v = r || { para: 'eu', comorb: [] };
  const hoje = hojeISO();
  app().innerHTML = `
  <h1>${r ? 'Editar cadastro' : 'Novo rastreio'}</h1>
  <form id="f" autocomplete="off">
    <label>Este rastreio é para</label>
    <div class="seg" id="para"><button type="button" data-v="eu" class="${v.para === 'eu' ? 'on' : ''}">Mim</button><button type="button" data-v="terceiro" class="${v.para === 'terceiro' ? 'on' : ''}">Outra pessoa</button></div>
    <label for="nome" id="lnome">${v.para === 'terceiro' ? 'Nome da pessoa acompanhada' : 'Seu nome ou apelido'}</label>
    <input id="nome" required maxlength="60" value="${esc(v.nome)}">
    <label for="email">Seu e-mail</label>
    <input id="email" type="email" required value="${esc(v.email)}" placeholder="nome@exemplo.com">
    <div class="grid2">
      <div><label for="idade">Idade</label><input id="idade" type="number" inputmode="numeric" min="0" max="120" required value="${esc(v.idade)}"></div>
      <div><label for="sexo">Sexo</label><select id="sexo">${['Feminino', 'Masculino', 'Outro'].map(s => `<option ${v.sexo === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
      <div><label for="peso">Peso (kg)</label><input id="peso" type="number" inputmode="decimal" step="0.1" min="2" max="300" required value="${esc(v.peso)}"></div>
      <div><label for="altura">Altura (cm)</label><input id="altura" type="number" inputmode="numeric" min="40" max="230" value="${esc(v.altura)}"></div>
    </div>

    <div class="card" style="border-color:var(--bad)">
      <h3 style="margin-top:0">Uso de remédios que mexem com o sal e a água do corpo</h3>
      <p>Você usa diurético ou remédio que mexe com o sal e a água do corpo, ou precisa medir sua urina e o quanto de água bebe por dia?</p>
      <ul class="l sub">${MEDS_HIDRICOS.map(m => '<li>' + m + '</li>').join('')}</ul>
      <div class="seg" id="restr"><button type="button" data-v="1" class="${v.restricao === true ? 'on' : ''}">Sim</button><button type="button" data-v="0" class="${v.restricao === false ? 'on' : ''}">Não</button></div>
    </div>

    <label>Doenças que já tem</label>
    <div class="card" style="padding:4px 14px">${COMORBIDADES.map(([k, l]) => `<label class="opt"><input type="checkbox" name="com" value="${k}" ${(v.comorb || []).includes(k) ? 'checked' : ''}> ${l}</label>`).join('')}</div>
    <h2>Vacinação contra COVID</h2>
    <p class="sub">Responda uma pergunta por dose. Se não lembrar, escolha "Não sei". O nome da vacina costuma estar no cartão de vacina ou no app Meu SUS Digital.</p>
    <div class="card" id="vacs">${ORDINAIS.map((o, i) => {
      const val = (v.vacinas || [])[i] || '';
      const base = val.startsWith('Outra: ') ? 'Outra' : val;
      return `<div class="vac" data-i="${i}">
        <label for="vac${i}">Qual foi a ${o} dose de vacina contra COVID que ${v.para === 'terceiro' ? 'a pessoa tomou' : 'você tomou'}?</label>
        <select id="vac${i}"><option value="">Selecione</option>${VACINAS.map(x => `<option ${base === x ? 'selected' : ''}>${x}</option>`).join('')}</select>
        <input id="vacout${i}" placeholder="Qual vacina?" maxlength="40" value="${esc(val.startsWith('Outra: ') ? val.slice(7) : '')}" ${base === 'Outra' ? '' : 'hidden'} style="margin-top:6px">
      </div>`; }).join('')}
      <label for="vacmais">Tomou mais de 5 doses? Quantas no total? (opcional)</label>
      <input id="vacmais" type="number" inputmode="numeric" min="6" max="20" value="${esc(v.vacinasTotal)}">
    </div>

    <h2>Âncoras de tempo</h2>
    <label for="d0">Dia em que os sintomas de gripe começaram (D0)</label>
    <p class="sub" style="margin:0 0 4px">Febre, dor no corpo, garganta, nariz escorrendo ou ardendo: conte do primeiro sintoma.</p>
    <input id="d0" type="date" required max="${hoje}" value="${esc(v.d0 || hoje)}">
    <label for="dc">Dia do contato com alguém doente (se souber)</label>
    <input id="dc" type="date" max="${hoje}" value="${esc(v.dataContato)}">
    <p id="erro" class="banner red" hidden></p>
    <button class="pri full" style="margin-top:16px">${r ? 'Salvar alterações' : 'Iniciar rastreio'}</button>
    ${(r || Object.keys(DB.rastreios).length) ? '<button type="button" class="full" id="canc" style="margin-top:8px">Cancelar</button>' : ''}
  </form>`;
  let para = v.para, restr = v.restricao;
  $('#para').onclick = e => { const b = e.target.closest('[data-v]'); if (!b) return; para = b.dataset.v;
    $('#para').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    $('#lnome').textContent = para === 'terceiro' ? 'Nome da pessoa acompanhada' : 'Seu nome ou apelido'; };
  $('#restr').onclick = e => { const b = e.target.closest('[data-v]'); if (!b) return; restr = b.dataset.v === '1';
    $('#restr').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); };
  const ajustaVac = () => {
    let nenhuma = false;
    ORDINAIS.forEach((_, i) => {
      const sel = $('#vac' + i);
      if (nenhuma) { sel.value = 'Nenhuma'; sel.disabled = true; } else sel.disabled = false;
      $('#vacout' + i).hidden = sel.value !== 'Outra';
      if (sel.value === 'Nenhuma') nenhuma = true;
    });
  };
  $('#vacs').onchange = ajustaVac; ajustaVac();
  const c = $('#canc'); if (c) c.onclick = () => { if (!DB.ativo) DB.ativo = Object.keys(DB.rastreios)[0]; ir('inicio', { editando: false }); };
  $('#f').onsubmit = e => {
    e.preventDefault();
    const vacinas = ORDINAIS.map((_, i) => { const x = $('#vac' + i).value; return x === 'Outra' ? 'Outra: ' + ($('#vacout' + i).value.trim() || 'não informada') : x; });
    const faltaVac = vacinas.findIndex(x => !x);
    if (faltaVac >= 0) { const er = $('#erro'); er.hidden = false; er.textContent = 'Responda à pergunta da ' + ORDINAIS[faltaVac] + ' dose de vacina (se não lembrar, escolha "Não sei").'; er.scrollIntoView({ block: 'center' }); return; }
    if (restr == null) { const er = $('#erro'); er.hidden = false; er.textContent = 'Responda à pergunta sobre diurético e remédios que mexem com sal e água.'; er.scrollIntoView({ block: 'center' }); return; }
    const novo = r || { id: 'CT-' + Math.random().toString(36).slice(2, 8).toUpperCase(), criado: new Date().toISOString(), registros: {}, exames: [], contatos: { avisados: 0, risco: 0 } };
    Object.assign(novo, {
      para, nome: $('#nome').value.trim(), email: $('#email').value.trim(), idade: Number($('#idade').value),
      sexo: $('#sexo').value, peso: Number($('#peso').value), altura: $('#altura').value ? Number($('#altura').value) : null,
      restricao: restr, comorb: [...document.querySelectorAll('input[name=com]:checked')].map(x => x.value),
      vacinas, vacinasTotal: $('#vacmais').value ? Number($('#vacmais').value) : null, d0: $('#d0').value, dataContato: $('#dc').value || null
    });
    DB.rastreios[novo.id] = novo; DB.ativo = novo.id; salvar();
    if (restr && !r) ir('restricao', { editando: false }); else ir('inicio', { editando: false });
  };
}

function vRestricao() {
  semAbas();
  app().innerHTML = `
  <h1>Atenção</h1>
  <div class="banner red" style="font-size:16px"><b>Procure desde já orientação médica</b>
  Quem usa diurético, remédio que mexe com o sal e a água do corpo, ou precisa medir a urina e a água que bebe, precisa de controle rigoroso da urina e dos sais do sangue (eletrólitos) durante a COVID.</div>
  <p>O rastreio continua normalmente, mas o app <b>não vai calcular uma meta de água</b> para você. Siga a orientação do seu médico sobre quanto beber.</p>
  <p class="sub">Essa informação vai constar no relatório para o médico.</p>
  <button class="pri full" id="ok" style="margin-top:12px">Entendi, continuar</button>`;
  $('#ok').onclick = () => ir('inicio');
}

/* ================= início ================= */
function ultimoRegistro(r) { const d = datasRegistradas(r); return d.length ? d[d.length - 1] : null; }

function vInicio(r) {
  const hoje = hojeISO(), dh = diaDoenca(r, hoje);
  const ult = ultimoRegistro(r);
  const reg = ult ? r.registros[ult] : null;
  let status = '';
  if (r.encerrado) {
    status = `<div class="banner info"><b>Rastreio encerrado</b>Mesmo casos leves podem deixar sequelas. Se surgir cansaço, falta de ar, alteração de memória ou de sono nas próximas semanas, registre e procure seu médico.</div>`;
  } else if (!reg) {
    status = `<div class="status" style="background:var(--acc-bg);color:var(--acc-ink)"><div class="t">Faça o primeiro registro</div><p>Marque os sintomas de hoje e faça o teste de respiração.</p></div>`;
  } else {
    const av = avaliarRegras(r, ult), cor = corDia(r, ult), top = av.regras[0];
    const nv = av.nivel;
    const c = COR[nv];
    status = `<div class="status" style="background:${c.bg};color:${c.fg}">
      <div class="t">${c.nome} · ${top ? esc(top.orient) : 'em observação'}</div>
      <p>${top ? esc(top.motivo) + '.' : esc(orientacaoAzul(reg))}</p>
      <p>Trajetória em ${dataCurta(ult)}: <b>${COR[cor].nome.toLowerCase()} (${COR[cor].sig})</b>${ult !== hoje ? ' · ainda sem registro hoje' : ''}</p>
      ${nv !== 'azul' ? '<div class="acts"><button id="rel">📄 Gerar relatório para o médico</button></div>' : ''}
    </div>`;
  }
  const fase = reg ? faseProvavel(reg) : null;
  const teste = r.encerrado ? null : avisoTeste(r, dh);
  const covid = blocoGripeCovid(r);
  const fq = fimQuarentena(r);
  const quar = !r.encerrado && dh <= fq ? `<div class="banner info"><b>Quarentena até ${rotuloDia(fq)} (${dataCurta(somaDias(r.d0, fq))})</b>Possível período de replicação viral: evite contato próximo e use máscara perto de outras pessoas.${fq > 7 ? ' Prorrogada porque houve febre.' : ''}</div>` : '';
  const sug = !r.encerrado && sugerirEncerramento(r);

  app().innerHTML = `
  <p class="sub" style="margin:0">Rastreio de: <b>${esc(r.nome)}</b> · ${esc(r.idade)} anos · ${esc(r.peso)} kg</p>
  <h1>${rotuloDia(dh)} · ${dh >= 0 ? 'dia ' + dh + ' de doença' : 'antes dos sintomas'}</h1>
  ${r.restricao ? '<div class="banner red"><b>Restrição hídrica / diurético</b>Mantenha acompanhamento médico para controle da urina e dos eletrólitos.</div>' : ''}
  ${status}
  ${fase ? `<p class="sub"><b>Fase provável:</b> ${fase.nome}. ${fase.leigo}</p>` : ''}
  ${covid}
  ${teste ? `<div class="banner info"><b>🔔 Autoteste</b>${esc(teste)}</div>` : ''}
  ${quar}
  <h2>Linha do tempo</h2>
  ${linhaDoTempo(r)}
  <div class="legend">
    ${['azul', 'amarelo', 'laranja', 'vermelho'].map(k => `<span><i style="background:${COR[k].bg}"></i>${COR[k].sig}</span>`).join('')}
    <span><s>riscado</s> = sintoma terminou</span>
  </div>
  ${reg ? termometros(r, ult) : ''}
  <div class="grid2" style="margin-top:16px">
    <button class="pri" id="reg">📝 Registrar hoje</button>
    <button id="rel2">📄 Relatório</button>
  </div>
  ${sug ? `<div class="card"><b>3 dias seguidos sem sintomas</b><p class="sub">Você pode encerrar o rastreio. Continue atento: mesmo casos leves podem deixar sequelas.</p><button id="enc" class="full">Encerrar rastreio</button></div>` : ''}
  ${blocoContatos(r)}
  <p class="foot">Não substitui avaliação médica · Emergência: 192</p>`;

  const rolar = document.querySelector('.tl'); if (rolar) rolar.scrollLeft = rolar.scrollWidth;
  $('#reg').onclick = () => ir('registrar', { dataSel: hoje, rascunho: null });
  const rel = () => gerarRelatorio(r); if ($('#rel')) $('#rel').onclick = rel; $('#rel2').onclick = rel;
  if ($('#enc')) $('#enc').onclick = () => encerrar(r);
  document.querySelectorAll('.day[data-d]').forEach(el => el.onclick = () => {
    const d = el.dataset.d;
    if (d < r.d0) return modal(`<h3 style="margin-top:0">${rotuloDia(diaDoenca(r, d))} · ${dataBR(d)}</h3><p>${diaDoenca(r, d) >= -2 ? 'Período de possível transmissão antes dos sintomas. Veja abaixo como avisar quem esteve com você.' : 'Período provável de contato com o vírus. Tente lembrar onde esteve e com quem.'}</p><button class="full" data-fechar>Fechar</button>`);
    if (d > hoje) return;
    ir('registrar', { dataSel: d, rascunho: null });
  });
  ligarContatos(r);
}

function linhaDoTempo(r) {
  const hoje = hojeISO(), dh = diaDoenca(r, hoje);
  const datas = datasRegistradas(r);
  const ultDia = datas.length ? diaDoenca(r, datas[datas.length - 1]) : 0;
  const ini = -5, fim = Math.max(dh, ultDia, 0) + 2;
  const fq = fimQuarentena(r);
  const col = n => n - ini + 1;
  let cel = '', cond = '';
  for (let n = ini; n <= fim; n++) {
    const iso = somaDias(r.d0, n), reg = r.registros[iso];
    const exs = (r.exames || []).filter(e => e.data === iso).map(e => e.tipo === 'sangue' ? '🩸' : '🩻').join('');
    const cab = `<div class="h">${rotuloDia(n)}${iso === hoje ? ' · hoje' : ''}</div><div class="d">${dataCurta(iso)}</div>${exs ? '<span class="ex" aria-label="exame">' + exs + '</span>' : ''}`;
    const hojeCls = iso === hoje ? ' hoje' : '';
    let box;
    if (n < 0) box = `<div class="day${hojeCls}" data-d="${iso}" style="background:${COR.cinza.bg};color:${COR.cinza.fg};grid-column:${col(n)};grid-row:1">${cab}<div class="s">${n >= -2 ? 'possível transmissão' : 'contato provável'}</div></div>`;
    else if (reg) {
      const c = COR[corDia(r, iso)];
      const atual = conjunto(reg);
      const prevD = datas.filter(d => d < iso).pop();
      const prev = prevD ? conjunto(r.registros[prevD]) : new Set();
      const curto = id => esc(SINT[id] ? SINT[id].tec.split(' / ')[0] : id);
      let s = [...atual].map(id => `<p class="s">${curto(id)}</p>`).join('');
      s += [...prev].filter(id => !atual.has(id)).map(id => `<p class="s x">${curto(id)}</p>`).join('');
      if (!atual.size) s += '<p class="s">sem sintomas</p>';
      if (reg.spo2) s += `<p class="s" style="margin-top:4px">SpO₂ ${esc(reg.spo2)}%</p>`;
      box = `<div class="day${hojeCls}" data-d="${iso}" style="background:${c.bg};color:${c.fg};grid-column:${col(n)};grid-row:1">${cab}${s}</div>`;
    } else box = `<div class="day vazio${hojeCls}" data-d="${iso}" style="grid-column:${col(n)};grid-row:1">${cab}<div class="s">${iso <= hoje ? 'sem registro' : ''}</div></div>`;
    cel += box;
    cond += reg ? `<div class="cond" style="grid-column:${col(n)};grid-row:2">${celCondutas(r, reg)}</div>` : '';
  }
  const bands = `
    <div class="band contato" style="grid-column:${col(-5)} / span 4;grid-row:3">Contato provável</div>
    <div class="band avisar" style="grid-column:${col(-2)} / span 3;grid-row:4">Avisar contatos</div>
    <div class="band quar" style="grid-column:${col(0)} / span ${Math.min(fq, fim) + 1};grid-row:5">Quarentena · possível replicação</div>`;
  return `<div class="tl"><div class="tlg">${cel}${cond}${bands}</div></div>`;
}

function celCondutas(r, reg) {
  const c = reg.cond || {};
  const p = [];
  const meta = metaHidratacao(r, reg);
  if (c.agua != null && c.agua !== '') {
    const ok = meta ? c.agua * 1000 >= meta : null;
    p.push(`<p class="${ok == null ? '' : ok ? 'ok' : 'no'}">💧 ${esc(c.agua)}${meta ? ' / ' + (meta / 1000).toFixed(1) : ''} L</p>`);
  }
  if (c.cam != null) p.push(`<p class="${c.cam >= 3 ? 'ok' : 'no'}">🚶 ${c.cam}/3 caminhadas</p>`);
  if (c.ref != null) p.push(`<p class="${c.ref >= 3 ? 'ok' : 'no'}">🍽️ ${c.ref}/3 refeições</p>`);
  if (c.sol != null) p.push(`<p class="${c.sol ? 'ok' : ''}">☀️ ${c.sol ? 'sol' : 'sem sol'}</p>`);
  if (c.exr != null) p.push(`<p class="${c.exr ? 'ok' : 'no'}">🫁 ${c.exr ? 'respiração feita' : 'sem respiração'}</p>`);
  if (c.med) p.push(`<p>💊 ${esc(c.med)}</p>`);
  if (c.sono != null && c.sono !== '') p.push(`<p class="${c.sono >= 7 ? 'ok' : 'no'}">🌙 ${esc(c.sono)} h sono</p>`);
  return p.join('') || '<p class="muted">sem condutas</p>';
}

function termometros(r, iso) {
  const reg = r.registros[iso], dia = diaDoenca(r, iso);
  const g = termometroSRAG(reg), h = termometroHipoxemia(reg, dia);
  const barra = (nivel) => `<div class="gauge">${NIVEL_ORDEM.map(k => `<div style="background:${COR[k].bg}"></div>`).join('')}</div>
    <div class="gmark">${nivel == null ? '' : `<span style="left:${12.5 + nivel * 25}%">▲</span>`}</div>`;
  return `<h2>Termômetros · ${rotuloDia(dia)}</h2><div class="grid2">
    <div><p class="sub" style="margin:0 0 6px">SRAG</p>${barra(g.nivel)}<p class="sub" style="margin-top:8px">${esc(g.txt)}</p></div>
    <div><p class="sub" style="margin:0 0 6px">Hipoxemia silenciosa</p>${barra(h.nivel)}<p class="sub" style="margin-top:8px">${esc(h.txt)}</p></div>
  </div>`;
}

function blocoContatos(r) {
  const d2 = somaDias(r.d0, -2), d5 = somaDias(r.d0, -5), dm = somaDias(r.d0, -2);
  const msg = `Estou com COVID, com sintomas desde ${dataBR(r.d0)}. Estivemos juntos entre ${dataCurta(d2)} e ${dataCurta(r.d0)}. Fique atento a sintomas nos próximos dias e considere fazer um teste.`;
  const c = r.contatos || { avisados: 0, risco: 0 };
  return `<details id="contatos"><summary>📣 Avisar quem esteve com você</summary><div>
    <p><b>${dataCurta(d5)} a ${dataCurta(dm)} · contato provável:</b> tente lembrar onde esteve e com quem, para saber de onde veio a transmissão.</p>
    <p><b>${dataCurta(d2)} a ${dataCurta(r.d0)} · possível transmissão:</b> a pessoa pode transmitir 1 a 2 dias antes dos sintomas. Avise quem esteve com você.</p>
    <h3>Como lembrar onde esteve</h3>
    <ul class="l">
      <li><b>Google Maps:</b> toque na sua foto no canto superior e em "Sua linha do tempo". Só existe se o Histórico de Localização estava ativado.</li>
      <li><b>iPhone:</b> Ajustes › Privacidade › Serviços de Localização › Serviços do Sistema › Locais Importantes.</li>
      <li>Agenda, fotos da galeria (data e local), conversas e extrato do cartão.</li>
    </ul>
    <h3>Quem avisar primeiro</h3>
    <p class="sub">Gestantes, maiores de 60 anos, pessoas com doenças crônicas e com imunidade baixa (quimioterapia, transplante, corticoide contínuo).</p>
    <h3>Mensagem pronta</h3>
    <div class="msg" id="msgtxt">${esc(msg)}</div>
    <div class="grid2" style="margin-top:8px"><button id="copiar">Copiar</button><button id="enviar">Enviar</button></div>
    <h3>Quantas pessoas você avisou?</h3>
    <p class="sub">O app não guarda nomes nem contatos, só os números.</p>
    <div class="grid2"><div><label for="av">Avisadas</label><input id="av" type="number" min="0" inputmode="numeric" value="${c.avisados}"></div>
    <div><label for="ri">Do grupo de risco</label><input id="ri" type="number" min="0" inputmode="numeric" value="${c.risco}"></div></div>
    <p class="sub" style="margin-top:8px">Avisar ou não é decisão sua.</p>
  </div></details>`;
}
function ligarContatos(r) {
  const txt = () => $('#msgtxt').textContent;
  $('#copiar').onclick = async () => { try { await navigator.clipboard.writeText(txt()); toast('Mensagem copiada'); } catch (e) { toast('Não foi possível copiar'); } };
  $('#enviar').onclick = async () => {
    if (navigator.share) { try { await navigator.share({ text: txt() }); } catch (e) {} }
    else location.href = 'https://wa.me/?text=' + encodeURIComponent(txt());
  };
  const upd = () => { r.contatos = { avisados: Number($('#av').value) || 0, risco: Number($('#ri').value) || 0 }; salvar(); };
  $('#av').onchange = upd; $('#ri').onchange = upd;
}

async function gerarRelatorio(r) {
  if (!datasRegistradas(r).length) return toast('Faça pelo menos um registro antes de gerar o relatório.');
  toast('Gerando relatório…');
  try {
    if (!window.jspdf) await new Promise((ok, er) => { const s = document.createElement('script'); s.src = 'vendor/jspdf.umd.min.js'; s.onload = ok; s.onerror = er; document.head.appendChild(s); });
    const res = await Relatorio.compartilhar(r);
    if (res === 'baixado') toast('Relatório salvo em Downloads');
  } catch (e) { console.error(e); toast('Erro ao gerar o relatório'); }
}

function blocoGripeCovid(r) {
  const st = situacaoTeste(r);
  const sc = sinaisCovid(r).map(id => SINT[id].leigo.toLowerCase());
  if (st === 'positivo') return `<div class="banner warn"><b>COVID confirmada pelo autoteste</b>Continue registrando todos os dias. Fique atento à fase de sede e urina escura e aos sinais de alerta.</div>`;
  if (st === 'negativos') return `<div class="banner info"><b>Dois autotestes negativos</b>Pode ser outra virose. Continue registrando: os sinais de alerta valem para qualquer gripe forte.${sc.length ? ' Como há sinais que lembram COVID, comente com o médico.' : ''}</div>`;
  if (sc.length) return `<div class="banner warn"><b>Sinais que apontam para COVID</b>Você registrou: ${esc(sc.join('; '))}. Faça o autoteste na janela certa (D3 a D7).</div>`;
  return `<p class="sub"><b>Gripe ou COVID?</b> No começo são parecidas. Registrando todo dia, o app junta os sinais que apontam para COVID e para gravidade.</p>`;
}

function encerrar(r) {
  modal(`<h3 style="margin-top:0">Encerrar o rastreio?</h3>
    <p>Mesmo casos leves podem deixar sequelas. Muitas pessoas evoluem com COVID longa, inclusive sem ter tido sintomas fortes.</p>
    <p>Se surgir cansaço persistente, falta de ar, palpitação, alteração de memória, de concentração ou de sono nas próximas semanas, reabra o rastreio em "Mais" e procure seu médico.</p>
    <div class="grid2"><button data-fechar>Voltar</button><button class="pri" id="sim">Encerrar</button></div>`,
    m => { m.querySelector('#sim').onclick = () => { r.encerrado = hojeISO(); salvar(); m.remove(); ir('inicio'); if (DB.pesquisa) convitePesquisa(r); }; });
}

/* ================= registrar ================= */
function vRegistrar(r) {
  const hoje = hojeISO();
  const iso = UI.dataSel || hoje;
  if (!UI.rascunho || UI.rascunho._iso !== iso) {
    const ex = r.registros[iso];
    UI.rascunho = ex ? JSON.parse(JSON.stringify(ex)) : { sint: [], cond: {} };
    UI.rascunho._iso = iso; UI.rascunho.cond = UI.rascunho.cond || {};
  }
  const g = UI.rascunho, sel = new Set(g.sint);
  const dia = diaDoenca(r, iso);
  const chips = GRUPOS.map(([k, nome]) => `<h3 ${k === 'alerta' ? 'style="color:var(--bad)"' : ''}>${nome}</h3><div class="chips">${
    SINTOMAS.filter(s => s.g === k).map(s => `<button type="button" class="chip ${k === 'alerta' ? 'alerta' : ''} ${sel.has(s.id) ? 'on' : ''}" data-s="${s.id}">${esc(s.leigo)}<small>${esc(s.tec)}</small></button>`).join('')}</div>`).join('');
  const resp = g.resp || {};
  app().innerHTML = `
  <h1>Registro do dia</h1>
  <div class="grid2"><div><label for="data">Data</label><input id="data" type="date" min="${r.d0}" max="${hoje}" value="${iso}"></div>
  <div><label>&nbsp;</label><p style="margin:10px 0 0;font-weight:600">${rotuloDia(dia)} · dia ${dia} de doença</p></div></div>
  ${r.registros[iso] ? '<p class="sub">Editando o registro já salvo deste dia.</p>' : ''}

  <h2>Sintomas de hoje</h2>
  <p class="sub">Toque em todos que você sentiu. O nome técnico aparece embaixo.</p>
  ${chips}

  <h2>Teste de respiração</h2>
  <div class="card">
    <p>Sentado e em repouso, <b>encha o peito de ar devagar, contando 6 segundos</b>, e depois solte o ar devagar. Não force.</p>
    <div class="row"><button type="button" id="ini">▶ Iniciar</button><div class="count" id="cnt">6</div></div>
    <div class="breath"><div id="bar"></div></div>
    <p class="sub" style="margin-bottom:0">Como foi?</p>
    ${RESPIRA.map(o => `<label class="opt"><input type="radio" name="resp" value="${o.g}" ${resp.g === o.g ? 'checked' : ''}> ${o.txt}</label>`).join('')}
    <div id="motivo" ${resp.g >= 2 ? '' : 'hidden'}>
      <p class="sub" style="margin:10px 0 0"><b>Por que parou?</b></p>
      <label class="opt"><input type="radio" name="mot" value="pontada" ${resp.motivo === 'pontada' ? 'checked' : ''}> Senti dor em pontada</label>
      <label class="opt"><input type="radio" name="mot" value="ar" ${resp.motivo === 'ar' ? 'checked' : ''}> O ar não entra</label>
      <label class="opt"><input type="radio" name="mot" value="outro" ${resp.motivo === 'outro' ? 'checked' : ''}> Outro motivo</label>
    </div>
  </div>

  <h2>Medidas</h2>
  <p class="sub">Preencha se tiver o aparelho.</p>
  <div class="grid3">
    <div><label for="spo2">SpO₂ (%)</label><input id="spo2" type="number" inputmode="numeric" min="50" max="100" value="${esc(g.spo2Primeira || g.spo2)}"></div>
    <div><label for="temp">Temp. (°C)</label><input id="temp" type="number" inputmode="decimal" step="0.1" min="33" max="43" value="${esc(g.temp)}"></div>
    <div><label for="fc">Pulso (bpm)</label><input id="fc" type="number" inputmode="numeric" min="30" max="220" value="${esc(g.fc)}"></div>
  </div>
  <div id="conf" class="banner warn" ${num(g.spo2Primeira || g.spo2) != null && num(g.spo2Primeira || g.spo2) < 95 ? '' : 'hidden'}>
    <b>Confirme a medida</b>Fique 5 minutos sentado em repouso, aqueça a mão, tire o esmalte do dedo e meça de novo.
    <label for="spo2b">Segunda medida (%)</label><input id="spo2b" type="number" inputmode="numeric" min="50" max="100" value="${esc(g.spo2Primeira ? g.spo2 : '')}">
  </div>
  <label for="teste">Autoteste de COVID hoje</label>
  <select id="teste">${[['nao', 'Não fiz'], ['positivo', 'Positivo'], ['negativo', 'Negativo']].map(([v, l]) => `<option value="${v}" ${(g.teste || 'nao') === v ? 'selected' : ''}>${l}</option>`).join('')}</select>

  <h2>O que você fez hoje</h2>
  <div class="card" id="condutas"></div>

  <button class="pri full" id="salvar" style="margin-top:8px">Salvar registro</button>`;

  const lerForm = () => {
    g.sint = [...document.querySelectorAll('.chip.on')].map(b => b.dataset.s);
    const rg = document.querySelector('input[name=resp]:checked');
    const mt = document.querySelector('input[name=mot]:checked');
    g.resp = rg ? { g: Number(rg.value), motivo: Number(rg.value) >= 2 && mt ? mt.value : null } : null;
    const s1 = num($('#spo2').value), s2 = num($('#spo2b').value);
    if (s1 != null && s1 < 95 && s2 != null) { g.spo2Primeira = s1; g.spo2 = s2; } else { g.spo2 = s1; delete g.spo2Primeira; }
    g.temp = num($('#temp').value); g.fc = num($('#fc').value); g.teste = $('#teste').value;
  };
  $('#condutas').innerHTML = formCondutas(r, iso, g); ligarCondutas(g);
  const desenhaCondutas = () => { lerForm(); atualizarCondutas(r, iso, g); };

  $('#data').onchange = e => { if (e.target.value) ir('registrar', { dataSel: e.target.value, rascunho: null }); };
  document.querySelectorAll('.chip').forEach(b => b.onclick = () => { b.classList.toggle('on'); desenhaCondutas(); });
  document.querySelectorAll('input[name=resp]').forEach(i => i.onchange = () => { $('#motivo').hidden = Number(i.value) < 2; });
  $('#spo2').oninput = () => { const v = num($('#spo2').value); $('#conf').hidden = !(v != null && v < 95); };
  ['spo2', 'spo2b', 'temp'].forEach(id => $('#' + id).onchange = desenhaCondutas);
  let tm = null;
  $('#ini').onclick = () => {
    if (tm) return;
    let s = 6; $('#cnt').textContent = s; const bar = $('#bar'); bar.style.transition = 'none'; bar.style.width = '0';
    requestAnimationFrame(() => { bar.style.transition = 'width 6s linear'; bar.style.width = '100%'; });
    tm = setInterval(() => { s--; $('#cnt').textContent = s; if (s <= 0) { clearInterval(tm); tm = null; $('#cnt').textContent = '✓'; if (navigator.vibrate) navigator.vibrate(150); } }, 1000);
  };
  desenhaCondutas();
  $('#salvar').onclick = () => {
    lerForm();
    if (g.resp && g.resp.g >= 2 && !g.resp.motivo) { toast('Informe por que parou o teste de respiração.'); $('#motivo').scrollIntoView({ block: 'center' }); return; }
    const reg = JSON.parse(JSON.stringify(g)); delete reg._iso;
    reg.salvo = new Date().toISOString();
    r.registros[iso] = reg; salvar();
    const av = avaliarRegras(r, iso);
    UI.rascunho = null;
    ir('inicio');
    if (av.nivel === 'vermelho' || av.nivel === 'laranja') {
      const t = av.regras[0];
      modal(`<div class="status" style="background:${COR[t.nivel].bg};color:${COR[t.nivel].fg};margin:0 0 12px"><div class="t">${COR[t.nivel].nome}</div><p><b>${esc(t.orient)}</b></p><p>${esc(t.motivo)}.</p></div>
        <p class="sub">Leve o relatório para o médico: ele traz a linha do tempo e as hipóteses a investigar.</p>
        <div class="grid2"><button data-fechar>Fechar</button><button class="pri" id="mrel">📄 Relatório</button></div>`,
        m => { m.querySelector('#mrel').onclick = () => { m.remove(); gerarRelatorio(r); }; });
    } else toast('Registro salvo');
  };
}

function segHTML(c, k, max) { return `<div class="seg" data-k="${k}">${Array.from({ length: max + 1 }, (_, i) => `<button type="button" data-v="${i}" class="${c[k] === i ? 'on' : ''}">${i}</button>`).join('')}</div>`; }
function snHTML(c, k) { return `<div class="seg" data-k="${k}"><button type="button" data-v="1" class="${c[k] === 1 ? 'on' : ''}">Sim</button><button type="button" data-v="0" class="${c[k] === 0 ? 'on' : ''}">Não</button></div>`; }

/* Parte fixa: os campos de texto não são recriados enquanto o usuário digita. */
function formCondutas(r, iso, g) {
  const c = g.cond;
  return `
  <h3 style="margin-top:0">💧 Hidratação</h3>
  <div id="hmeta"></div>
  <label for="agua">Quanto bebeu (litros)</label><input id="agua" type="number" inputmode="decimal" step="0.1" min="0" max="10" value="${esc(c.agua)}">
  <h3>🚶 Caminhada</h3><div id="cambox"></div>
  <h3>🍽️ Alimentação</h3>
  <p class="sub">Mínimo de 3 refeições. Quantas fez?</p>${segHTML(c, 'ref', 5)}
  <h3>☀️ Sol</h3><div id="solbox"></div>
  <h3>🫁 Exercício respiratório</h3>
  <p class="sub">10 minutos de respiração tranquila, como na meditação, sem esforço. Pare se tossir ou sentir dor. Fez hoje?</p>${snHTML(c, 'exr')}
  <h3>💊 Medicações tomadas</h3>
  <p class="sub">Apenas registro. O app não sugere medicamentos.</p>
  <input id="med" maxlength="120" value="${esc(c.med)}" placeholder="Ex.: dipirona 1 g às 8 h e 16 h">
  <h3>🌙 Sono</h3>
  <label for="sono">Horas dormidas na última noite (meta: 7 h)</label><input id="sono" type="number" inputmode="decimal" step="0.5" min="0" max="24" value="${esc(c.sono)}">`;
}
/* Parte dinâmica: meta de água, bloqueio da caminhada e do sol, conforme sintomas, SpO2 e temperatura. */
function atualizarCondutas(r, iso, g) {
  const c = g.cond;
  const tmp = Object.assign({}, r, { registros: Object.assign({}, r.registros, { [iso]: g }) });
  const meta = metaHidratacao(r, g);
  const bc = bloqueioCaminhada(tmp, iso);
  const bs = bloqueioSol(g);
  $('#hmeta').innerHTML = r.restricao ? '<p class="banner red" style="margin:4px 0">Sem meta: siga a orientação do seu médico sobre quanto beber.</p>'
    : meta ? `<p class="sub">Meta de hoje: <b>${(meta / 1000).toFixed(1)} L</b> (${PARAM.hidratacaoMlKg} mL por kg${num(g.temp) > 37 ? ' + febre' : ''}).</p>` : '<p class="sub">Informe o peso no cadastro para calcular a meta.</p>';
  $('#cambox').innerHTML = bc ? `<p class="banner red" style="margin:4px 0">${esc(bc)}</p>` : '<p class="sub">500 passos divididos em 3 vezes ao longo do dia. Quantas vezes fez?</p>' + segHTML(c, 'cam', 3);
  if (bs) delete c.sol;
  $('#solbox').innerHTML = bs ? `<p class="banner warn" style="margin:4px 0">${esc(bs)}</p>` : '<p class="sub">Exposição confortável por volta do meio-dia, no máximo 15 minutos, sem filtro e com o máximo de pele possível. Mesmo pouca, a exposição é necessária. Tomou sol?</p>' + snHTML(c, 'sol');
}
function ligarCondutas(g) {
  const c = g.cond;
  $('#condutas').onclick = e => {
    const b = e.target.closest('.seg [data-v]'); if (!b || b.disabled) return;
    const s = b.closest('.seg');
    c[s.dataset.k] = Number(b.dataset.v);
    s.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
  };
  const bind = (id, k, f) => { const el = $('#' + id); el.oninput = () => { c[k] = f(el.value); }; };
  bind('agua', 'agua', num); bind('sono', 'sono', num); bind('med', 'med', v => v.trim());
}

/* ================= exames ================= */
function vExames(r) {
  const ex = UI.exame;
  const lista = (r.exames || []).slice().sort((a, b) => a.data < b.data ? 1 : -1);
  if (ex && ex.etapa === 'conferir') return vConferir(r, ex);
  app().innerHTML = `
  <h1>Exames</h1>
  <p class="sub">Fotografe o laudo ou anexe o PDF. A leitura é feita no próprio celular, sem internet. Você confere os valores antes de salvar.</p>
  <label>Tipo de exame</label>
  <div class="seg" id="tipo"><button type="button" data-v="sangue" class="${(!ex || ex.tipo === 'sangue') ? 'on' : ''}">🩸 Sangue</button><button type="button" data-v="tc" class="${ex && ex.tipo === 'tc' ? 'on' : ''}">🩻 Tomografia de tórax</button></div>
  <div class="grid2" style="margin-top:12px">
    <label class="btn" style="margin:0;color:var(--ink)">📷 Fotografar laudo<input type="file" accept="image/*" capture="environment" id="foto" hidden></label>
    <label class="btn" style="margin:0;color:var(--ink)">📎 Anexar PDF ou imagem<input type="file" accept="application/pdf,image/*" id="arq" hidden></label>
  </div>
  <button class="full" id="manual" style="margin-top:8px">⌨️ Digitar os valores</button>
  <div id="lendo" hidden class="card"><p id="lst">Preparando a leitura…</p><div class="prog"><div id="pb"></div></div>
    <p class="sub">Na primeira vez pode demorar um pouco mais.</p></div>
  <h2>Exames registrados</h2>
  ${lista.length ? lista.map(e => `<div class="card"><div class="row" style="justify-content:space-between"><b>${e.tipo === 'sangue' ? '🩸 Sangue' : '🩻 Tomografia'} · ${dataBR(e.data)} (${rotuloDia(diaDoenca(r, e.data))})</b><button class="danger" data-del="${e.id}" style="padding:6px 10px">Apagar</button></div><p class="sub">${esc(resumoExame(e))}</p></div>`).join('')
    : '<p class="sub">Nenhum exame ainda.</p>'}`;
  let tipo = ex ? ex.tipo : 'sangue';
  $('#tipo').onclick = e => { const b = e.target.closest('[data-v]'); if (!b) return; tipo = b.dataset.v; $('#tipo').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); };
  const ler = async f => {
    if (!f) return;
    $('#lendo').hidden = false;
    try {
      const txt = await OCR.lerArquivo(f, (st, p) => { $('#lst').textContent = st + '…'; $('#pb').style.width = Math.round((p || 0) * 100) + '%'; });
      const d = tipo === 'sangue' ? OCR.sangue(txt) : OCR.tc(txt);
      ir('exames', { exame: Object.assign({ etapa: 'conferir', tipo, texto: txt }, d) });
    } catch (e) {
      console.error(e); $('#lendo').hidden = true;
      toast('Não consegui ler o arquivo. Tente uma foto mais nítida ou digite os valores.');
    }
  };
  $('#foto').onchange = e => ler(e.target.files[0]);
  $('#arq').onchange = e => ler(e.target.files[0]);
  $('#manual').onclick = () => ir('exames', { exame: { etapa: 'conferir', tipo, v: {}, achados: [], pct: null, data: null, texto: '' } });
  document.querySelectorAll('[data-del]').forEach(b => b.onclick = () => {
    if (!confirm('Apagar este exame?')) return;
    r.exames = r.exames.filter(e => e.id !== b.dataset.del); salvar(); render();
  });
}
function resumoExame(e) {
  if (e.tipo === 'tc') return (e.achados.length ? e.achados.join(', ') : 'sem achados marcados') + (e.pct ? ' · ' + e.pct + '% de acometimento' : '');
  const n = { leuc: 'Leucócitos', linf: 'Linfócitos', hb: 'Hb', ht: 'Ht', plaq: 'Plaquetas', pcr: 'PCR', ddim: 'D-dímero', ureia: 'Ureia', creat: 'Creatinina' };
  const alt = avaliarHemograma(e.v);
  return Object.keys(n).filter(k => e.v[k] != null).map(k => n[k] + ' ' + e.v[k]).join(' · ') + (alt.length ? ' — ' + alt.join(', ') : '');
}
const CAMPOS_SANGUE = [['leuc', 'Leucócitos', '/mm³'], ['linf', 'Linfócitos (absoluto)', '/mm³'], ['hb', 'Hemoglobina', 'g/dL'], ['ht', 'Hematócrito', '%'],
  ['plaq', 'Plaquetas', '/mm³'], ['pcr', 'PCR (proteína C reativa)', 'como no laudo'], ['ddim', 'D-dímero', 'como no laudo'], ['ureia', 'Ureia', 'mg/dL'], ['creat', 'Creatinina', 'mg/dL']];
function vConferir(r, ex) {
  app().innerHTML = `
  <h1>Confira os valores</h1>
  <div class="banner warn"><b>Confira com o laudo</b>A leitura automática pode errar vírgulas e unidades. Corrija o que estiver diferente.</div>
  <label for="dt">Data da coleta ou do exame</label><input id="dt" type="date" max="${hojeISO()}" value="${esc(ex.data || hojeISO())}">
  ${ex.tipo === 'sangue' ? `<table class="vals">${CAMPOS_SANGUE.map(([k, l, u]) => `<tr><td>${l}<br><small>${u}</small></td><td style="width:42%"><input data-c="${k}" inputmode="decimal" value="${esc(ex.v[k] != null ? ex.v[k] : '')}"></td></tr>`).join('')}</table>`
    : `<label>Achados no laudo</label><div class="card" style="padding:4px 14px">${OCR.ACHADOS_TC.map(a => `<label class="opt"><input type="checkbox" name="ach" value="${a}" ${ex.achados.includes(a) ? 'checked' : ''}> ${a}</label>`).join('')}</div>
       <label for="pct">Percentual de acometimento (se o laudo informar)</label><input id="pct" type="number" min="0" max="100" inputmode="numeric" value="${esc(ex.pct)}">`}
  ${ex.texto ? `<details><summary>Ver texto lido</summary><div><pre style="white-space:pre-wrap;font-size:12px">${esc(ex.texto)}</pre></div></details>` : ''}
  <div class="grid2" style="margin-top:12px"><button id="canc">Cancelar</button><button class="pri" id="ok">Confirmar e salvar</button></div>`;
  $('#canc').onclick = () => ir('exames', { exame: null });
  $('#ok').onclick = () => {
    const data = $('#dt').value;
    if (!data) return toast('Informe a data do exame.');
    const e = { id: 'e' + Date.now().toString(36), tipo: ex.tipo, data, conferido: true };
    if (ex.tipo === 'sangue') {
      e.v = {};
      document.querySelectorAll('[data-c]').forEach(i => { const v = i.value.trim(); if (v) { const n = OCR.numBR(v); if (isFinite(n)) e.v[i.dataset.c] = n; } });
    } else {
      e.achados = [...document.querySelectorAll('input[name=ach]:checked')].map(x => x.value);
      e.pct = num($('#pct').value);
    }
    r.exames = r.exames || []; r.exames.push(e); salvar();
    toast('Exame salvo na linha do tempo'); ir('exames', { exame: null });
  };
}

/* ================= mais ================= */
function vMais(r) {
  const outros = Object.values(DB.rastreios);
  app().innerHTML = `
  <h1>Mais</h1>
  <h2>Rastreios</h2>
  ${outros.map(o => `<div class="card row" style="justify-content:space-between"><div><b>${esc(o.nome)}</b><br><small>D0 ${dataBR(o.d0)}${o.encerrado ? ' · encerrado' : ''}</small></div>${o.id === r.id ? '<small>ativo</small>' : `<button data-at="${o.id}">Abrir</button>`}</div>`).join('')}
  <div class="grid2"><button id="novo">＋ Novo rastreio</button><button id="edit">✏️ Editar cadastro</button></div>

  <h2>Lembretes</h2>
  <p class="sub">Cria lembretes na agenda do celular: registro diário por 14 dias e autoteste no D3.</p>
  <div class="grid2"><div><label for="hl">Horário</label><input id="hl" type="time" value="${esc(r.horaLembrete || '20:00')}"></div><div><label>&nbsp;</label><button class="full" id="ics">📅 Criar lembretes</button></div></div>

  <details><summary>As fases da doença</summary><div>${Object.entries(FASES).map(([n, f]) => `<p><b>${n}. ${f.nome}</b><br><span class="sub">${f.leigo}</span></p>`).join('')}
    <p class="sub">Modelo fisiopatológico da autora, usado para organizar os sintomas. As janelas de cada fase variam de pessoa para pessoa.</p></div></details>
  <details><summary>Glossário</summary><div>${GLOSSARIO.map(([t, d]) => `<p><b>${t}:</b> <span class="sub">${d}</span></p>`).join('')}</div></details>
  <details><summary>Cores e termômetros</summary><div>
    <p><b>Cor do dia</b> mostra a tendência: azul (melhorando), amarelo (estável), laranja (piorando), vermelho (sinal de alarme, procure atendimento).</p>
    <p><b>Termômetro de SRAG</b> soma falta de ar, dificuldade de encher o pulmão, tosse, teste de respiração e oxigênio.</p>
    <p><b>Hipoxemia silenciosa</b> aparece quando o oxigênio cai sem falta de ar, principalmente na primeira semana.</p></div></details>

  <h2>Pesquisa científica</h2>
  <div class="card">
    <p style="margin-top:0">Autorização: <b>${DB.pesquisa ? 'autorizada' : 'não autorizada'}</b>${DB.pesquisaData ? ' em ' + dataBR(DB.pesquisaData.slice(0, 10)) : ''}</p>
    <p class="sub">Código deste rastreio: <b>${esc(r.id)}</b>${r.pesquisaEnviado ? ' · último envio em ' + dataBR(r.pesquisaEnviado.slice(0, 10)) : ''}</p>
    ${DB.pesquisa ? '<button class="pri full" id="envp">📤 Enviar dados para a pesquisa</button>' : ''}
    <div class="grid2" style="margin-top:8px"><button id="termo">Ler o termo</button><button id="mudap">${DB.pesquisa ? 'Retirar autorização' : 'Autorizar'}</button></div>
  </div>

  <h2>Dados</h2>
  <p class="sub">Exporta tabelas sem nome e sem e-mail, para análise (por exemplo, no Octave).</p>
  <div class="grid2"><button id="csv1">⬇️ Registros (CSV)</button><button id="csv2">⬇️ Exames (CSV)</button></div>
  <button class="full" id="enc" style="margin-top:8px">${r.encerrado ? '↩️ Reabrir rastreio' : '🏁 Encerrar rastreio'}</button>
  <button class="full danger" id="apagar" style="margin-top:8px">🗑️ Apagar este rastreio</button>

  <h2>Sobre</h2>
  <p class="sub">COVID Tracking · rastreio da gripe com foco em COVID-19. Não faz diagnóstico, não prescreve e não substitui avaliação médica. Em emergência, ligue 192.</p>
  <p class="sub">© 2026 Rachel Ingrid Pereira da Rocha Jannuzzi. Todos os direitos reservados. Proibidas a cópia, a redistribuição e o uso comercial sem autorização escrita da autora.</p>
  <p class="foot">Versão ${VERSAO_APP}</p>`;
  document.querySelectorAll('[data-at]').forEach(b => b.onclick = () => { DB.ativo = b.dataset.at; salvar(); ir('inicio'); });
  $('#novo').onclick = () => { DB.ativo = null; ir('cadastro', { editando: false }); };
  $('#edit').onclick = () => ir('cadastro', { editando: true });
  $('#ics').onclick = () => { r.horaLembrete = $('#hl').value || '20:00'; salvar(); baixar(icsLembretes(r), 'lembretes-covid-tracking.ics', 'text/calendar'); };
  if ($('#envp')) $('#envp').onclick = () => enviarPesquisa(r);
  $('#termo').onclick = () => modal('<h3 style="margin-top:0">Termo de consentimento</h3>' + textoTermo() + '<button class="full" data-fechar>Fechar</button>');
  $('#mudap').onclick = () => {
    if (DB.pesquisa) {
      if (!confirm('Retirar a autorização? Novos dados não serão enviados. Para retirar dados já enviados, escreva para ' + PESQUISA.email + ' com o código ' + r.id + '.')) return;
      DB.pesquisa = false; DB.pesquisaData = new Date().toISOString(); salvar(); render();
    } else vPesquisa('mais');
  };
  $('#csv1').onclick = () => baixar(csvRegistros(r), 'covidtracking-registros-' + r.id + '.csv', 'text/csv');
  $('#csv2').onclick = () => baixar(csvExames(r), 'covidtracking-exames-' + r.id + '.csv', 'text/csv');
  $('#enc').onclick = () => { if (r.encerrado) { delete r.encerrado; salvar(); ir('inicio'); } else encerrar(r); };
  $('#apagar').onclick = () => {
    if (!confirm('Apagar todos os dados de "' + r.nome + '"? Não dá para desfazer.')) return;
    delete DB.rastreios[r.id]; DB.ativo = Object.keys(DB.rastreios)[0] || null; salvar(); ir(DB.ativo ? 'inicio' : 'cadastro');
  };
}

function convitePesquisa(r) {
  modal(`<h3 style="margin-top:0">Enviar seus dados para a pesquisa?</h3>
    <p>Você autorizou o uso dos seus dados em pesquisa. Enviar agora ajuda a entender como a gripe e a COVID evoluem.</p>
    <p class="sub">Vão só as tabelas, sem nome e sem e-mail. Código: <b>${esc(r.id)}</b>.</p>
    <div class="grid2"><button data-fechar>Agora não</button><button class="pri" id="envm">📤 Enviar</button></div>`,
    m => { m.querySelector('#envm').onclick = () => { m.remove(); enviarPesquisa(r); }; });
}
async function enviarPesquisa(r) {
  if (!DB.pesquisa) return toast('A autorização para pesquisa não foi dada.');
  if (!datasRegistradas(r).length) return toast('Faça pelo menos um registro antes de enviar.');
  const assunto = 'COVID Tracking - dados de pesquisa - ' + r.id;
  const corpo = 'Dados de pesquisa do rastreio ' + r.id + ' (termo v' + PESQUISA.versaoTermo + ', app v' + VERSAO_APP + ').';
  const f1 = new File([csvRegistros(r)], 'covidtracking-' + r.id + '-registros.csv', { type: 'text/csv' });
  const f2 = new File([csvExames(r)], 'covidtracking-' + r.id + '-exames.csv', { type: 'text/csv' });
  const marca = () => { r.pesquisaEnviado = new Date().toISOString(); salvar(); };
  modal(`<h3 style="margin-top:0">Enviar para a pesquisa</h3>
    <p>1. Toque em <b>Enviar</b> e escolha o <b>Gmail</b> ou outro app de e-mail.</p>
    <p>2. No destinatário, coloque:</p>
    <div class="msg row" style="justify-content:space-between"><b>${PESQUISA.email}</b><button id="cpe" style="padding:6px 10px">Copiar</button></div>
    <p>3. Confira se as duas planilhas estão anexadas e envie.</p>
    <div class="grid2" style="margin-top:12px"><button data-fechar>Cancelar</button><button class="pri" id="go">📤 Enviar</button></div>`, m => {
    m.querySelector('#cpe').onclick = async () => { try { await navigator.clipboard.writeText(PESQUISA.email); toast('E-mail copiado'); } catch (e) {} };
    m.querySelector('#go').onclick = async () => {
      try { await navigator.clipboard.writeText(PESQUISA.email); } catch (e) {}
      if (navigator.canShare && navigator.canShare({ files: [f1, f2] })) {
        try { await navigator.share({ files: [f1, f2], title: assunto, text: corpo + ' Enviar para ' + PESQUISA.email }); marca(); m.remove(); toast('Obrigada por contribuir com a pesquisa!'); return; }
        catch (e) { if (e.name === 'AbortError') return; }
      }
      // Sem compartilhamento de arquivos (ex.: computador): baixa as planilhas e abre o e-mail para anexar
      baixar(csvRegistros(r), f1.name, 'text/csv');
      setTimeout(() => baixar(csvExames(r), f2.name, 'text/csv'), 400);
      setTimeout(() => { location.href = 'mailto:' + PESQUISA.email + '?subject=' + encodeURIComponent(assunto) + '&body=' + encodeURIComponent(corpo + '\n\nAnexe os dois arquivos .csv que acabaram de ser baixados.'); }, 900);
      marca(); m.remove();
    };
  });
}

function baixar(conteudo, nome, tipo) {
  const blob = new Blob([conteudo], { type: tipo + ';charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nome;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
}
const csvCel = v => { const s = v == null ? '' : String(v); return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
function csvRegistros(r) {
  const cab = ['id_rastreio', 'dia', 'data', 'idade', 'sexo', 'peso', 'restricao_hidrica', 'comorbidades', 'vac_d1', 'vac_d2', 'vac_d3', 'vac_d4', 'vac_d5', 'vac_total', 'd0', 'consentimento_pesquisa', 'versao_app', 'cor', 'escore', 'nivel_regra', 'regras',
    'fase_max', 'resp_grau', 'resp_motivo', 'spo2', 'spo2_primeira', 'temp', 'fc', 'autoteste', 'srag_nivel', 'hipox_nivel',
    ...SINTOMAS.map(s => 's_' + s.id), 'agua_L', 'meta_agua_L', 'caminhadas', 'refeicoes', 'sol', 'exerc_resp', 'sono_h', 'medicacoes', 'contatos_avisados', 'contatos_risco'];
  const lin = datasRegistradas(r).map(d => {
    const g = r.registros[d], s = conjunto(g), c = g.cond || {}, av = avaliarRegras(r, d), dia = diaDoenca(r, d);
    const meta = metaHidratacao(r, g);
    return [r.id, dia, d, r.idade, r.sexo, r.peso, r.restricao ? 1 : 0, (r.comorb || []).join('|'), ...[0, 1, 2, 3, 4].map(i => (r.vacinas || [])[i] || (i === 0 ? r.vacina || '' : '')), r.vacinasTotal, r.d0, DB.pesquisa ? 1 : 0, VERSAO_APP, corDia(r, d), escoreDia(g), av.nivel,
      av.regras.map(x => x.id).join('|'), faseMaxima(g), g.resp ? g.resp.g : '', g.resp ? g.resp.motivo || '' : '', g.spo2, g.spo2Primeira, g.temp, g.fc, g.teste || '',
      termometroSRAG(g).nivel, termometroHipoxemia(g, dia).nivel, ...SINTOMAS.map(x => s.has(x.id) ? 1 : 0),
      c.agua, meta ? (meta / 1000).toFixed(2) : '', c.cam, c.ref, c.sol, c.exr, c.sono, c.med, (r.contatos || {}).avisados, (r.contatos || {}).risco].map(csvCel).join(';');
  });
  return '﻿' + cab.join(';') + '\n' + lin.join('\n') + '\n';
}
function csvExames(r) {
  const cab = ['id_rastreio', 'dia', 'data', 'tipo', 'leuc', 'linf', 'hb', 'ht', 'plaq', 'pcr', 'ddim', 'ureia', 'creat', 'tc_achados', 'tc_pct'];
  const lin = (r.exames || []).map(e => { const v = e.v || {};
    return [r.id, diaDoenca(r, e.data), e.data, e.tipo, v.leuc, v.linf, v.hb, v.ht, v.plaq, v.pcr, v.ddim, v.ureia, v.creat, (e.achados || []).join('|'), e.pct].map(csvCel).join(';'); });
  return '﻿' + cab.join(';') + '\n' + lin.join('\n') + '\n';
}
function icsLembretes(r) {
  const [h, m] = (r.horaLembrete || '20:00').split(':');
  const hoje = hojeISO().replace(/-/g, '');
  const d3 = somaDias(r.d0, 3) < hojeISO() ? null : somaDias(r.d0, 3).replace(/-/g, '');
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const ev = (uid, dt, resumo, desc, rrule) => ['BEGIN:VEVENT', 'UID:' + uid + '@covidtracking', 'DTSTAMP:' + stamp, 'DTSTART:' + dt, 'DURATION:PT10M',
    'SUMMARY:' + resumo, 'DESCRIPTION:' + desc, rrule || '', 'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + resumo, 'TRIGGER:PT0M', 'END:VALARM', 'END:VEVENT'].filter(Boolean).join('\r\n');
  const evs = [ev(r.id + '-diario', hoje + 'T' + h + m + '00', 'COVID Tracking: registro do dia', 'Abra o COVID Tracking e registre sintomas\\, respiração e condutas.', 'RRULE:FREQ=DAILY;COUNT=14')];
  if (d3) evs.push(ev(r.id + '-teste', d3 + 'T090000', 'COVID Tracking: dia do autoteste', 'Janela ideal do autoteste de farmácia: D3 a D7.'));
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//COVID Tracking//PT-BR', 'CALSCALE:GREGORIAN', ...evs, 'END:VCALENDAR'].join('\r\n') + '\r\n';
}

/* ================= início do app ================= */
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(e => console.warn('SW', e));
}
render();
