/* COVID Tracking — dados de referência (sintomas, fases, glossário, textos).
   © 2026 Rachel Ingrid Pereira da Rocha Jannuzzi. Todos os direitos reservados. */
'use strict';

const FASES = {
  1: { nome: 'Fase de replicação viral',
       leigo: 'O vírus está se multiplicando e você pode transmitir para outras pessoas.' },
  2: { nome: 'Fase de extravasamento capilar',
       leigo: 'Líquido sai dos vasos para os tecidos: sede, urina escura e cansaço.' },
  3: { nome: 'Fase de reequilíbrio volêmico',
       leigo: 'O corpo recupera o líquido: você urina mais, a boca seca de manhã e podem surgir formigamentos.' },
  4: { nome: 'Fase inflamatória/perfusional',
       leigo: 'Inflamação por circulação reduzida (oligoemia), com risco de pneumonia e de lesões em outros órgãos.' }
};

/* peso: número = soma no escore; 0 = sintoma esperado (não conta como piora);
   'A' = sinal de alarme (soma 4 e aciona regra própria). */
const SINTOMAS = [
  // Nariz e garganta
  { id: 'ard_naso',  g: 'nariz', leigo: 'Ardência no nariz ou no fundo do nariz', tec: 'Disestesia nasal / nasofaríngea', fase: 1, peso: 1 },
  { id: 'ard_far',   g: 'nariz', leigo: 'Ardência na garganta', tec: 'Disestesia faríngea', fase: 1, peso: 1 },
  { id: 'nariz_seco',g: 'nariz', leigo: 'Nariz seco', tec: 'Xeromicteria', fase: 1, peso: 1 },
  { id: 'garg_seca', g: 'nariz', leigo: 'Garganta seca', tec: 'Xerose faríngea', fase: 1, peso: 1 },
  { id: 'odino',     g: 'nariz', leigo: 'Dor ao engolir', tec: 'Odinofagia', fase: 1, peso: 1 },
  { id: 'coriza',    g: 'nariz', leigo: 'Coriza ou nariz entupido', tec: 'Rinorreia / obstrução nasal', fase: 1, peso: 1 },
  { id: 'anosmia',   g: 'nariz', leigo: 'Perda de olfato ou paladar', tec: 'Anosmia / ageusia', fase: 1, peso: 1 },
  { id: 'amigdal',   g: 'nariz', leigo: 'Garganta inflamada com placas ou pus', tec: 'Amigdalite', fase: 4, peso: 2 },
  { id: 'conjunt',   g: 'nariz', leigo: 'Olho vermelho e irritado', tec: 'Conjuntivite', fase: 1, peso: 1, pesquisa: true },
  // Geral e líquidos
  { id: 'febre',     g: 'geral', leigo: 'Febre (37,8 °C ou mais)', tec: 'Febre', fase: 1, peso: 2 },
  { id: 'sede',      g: 'geral', leigo: 'Sede intensa', tec: 'Polidipsia', fase: 2, peso: 2 },
  { id: 'urina_esc', g: 'geral', leigo: 'Urina escura ou pouca urina', tec: 'Urina concentrada / oligúria', fase: 2, peso: 2 },
  { id: 'astenia',   g: 'geral', leigo: 'Cansaço extremo', tec: 'Astenia', fase: 2, peso: 2 },
  { id: 'poliuria',  g: 'geral', leigo: 'Urinar muito mais que o normal', tec: 'Poliúria', fase: 3, peso: 0 },
  { id: 'boca_seca', g: 'geral', leigo: 'Boca seca ao acordar', tec: 'Xerostomia matinal', fase: 3, peso: 0 },
  { id: 'cefaleia',  g: 'geral', leigo: 'Dor de cabeça', tec: 'Cefaleia', fase: 3, peso: 1 },
  { id: 'mialgia',   g: 'geral', leigo: 'Dor no corpo', tec: 'Mialgia', fase: 4, peso: 2 },
  { id: 'itu',       g: 'geral', leigo: 'Ardência ao urinar, urina turva ou com cheiro forte', tec: 'Sinais de infecção urinária', fase: 4, peso: 3 },
  // Pele e nervos
  { id: 'prurido',   g: 'pele', leigo: 'Coceira em mãos e pés', tec: 'Prurido em extremidades', fase: 3, peso: 1 },
  { id: 'parest',    g: 'pele', leigo: 'Formigamento em mãos e pés', tec: 'Parestesias', fase: 3, peso: 1 },
  { id: 'queim_pp',  g: 'pele', leigo: 'Queimação na sola dos pés ou na palma das mãos', tec: 'Disestesia palmoplantar', fase: 3, peso: 1 },
  { id: 'paralisia', g: 'pele', leigo: 'Rosto torto ou boca caída de um lado', tec: 'Paralisia facial periférica', fase: 4, peso: 'A', pesquisa: true },
  // Respiração
  { id: 'tosse',     g: 'resp', leigo: 'Tosse', tec: 'Tosse', fase: 4, peso: 2 },
  { id: 'disp_esf',  g: 'resp', leigo: 'Falta de ar aos pequenos esforços', tec: 'Dispneia aos esforços', fase: 4, peso: 3 },
  { id: 'restr',     g: 'resp', leigo: 'Respiração curta, dificuldade de encher o pulmão', tec: 'Restrição inspiratória', fase: 4, peso: 3 },
  // Sinais de alerta
  { id: 'tosse_inc', g: 'alerta', leigo: 'Tosse seca que impede falar ou dormir', tec: 'Tosse seca incapacitante', fase: 4, peso: 'A' },
  { id: 'pleur',     g: 'alerta', leigo: 'Dor em pontada ao respirar fundo', tec: 'Dor pleurítica', fase: 4, peso: 'A' },
  { id: 'hemopt',    g: 'alerta', leigo: 'Tosse com sangue', tec: 'Hemoptise', fase: 4, peso: 'A' },
  { id: 'disp_rep',  g: 'alerta', leigo: 'Falta de ar parado, em repouso', tec: 'Dispneia de repouso', fase: 4, peso: 'A' },
  { id: 'dor_tor',   g: 'alerta', leigo: 'Dor no peito', tec: 'Dor torácica', fase: 4, peso: 'A' },
  { id: 'confusao',  g: 'alerta', leigo: 'Confusão ou sonolência excessiva', tec: 'Alteração do nível de consciência', fase: 4, peso: 'A' },
  { id: 'cianose',   g: 'alerta', leigo: 'Lábios ou dedos arroxeados', tec: 'Cianose', fase: 4, peso: 'A' },
  { id: 'sincope',   g: 'alerta', leigo: 'Desmaio', tec: 'Síncope', fase: 4, peso: 'A' },
  { id: 'anuria',    g: 'alerta', leigo: 'Quase não urinou nas últimas 12 horas', tec: 'Oligúria importante', fase: 4, peso: 'A' },
  { id: 'avc',       g: 'alerta', leigo: 'Fraqueza em braço ou perna, ou fala enrolada', tec: 'Déficit neurológico focal', fase: 4, peso: 'A' }
];
const SINT = Object.fromEntries(SINTOMAS.map(s => [s.id, s]));

const GRUPOS = [
  ['nariz', 'Nariz, garganta e olhos'],
  ['geral', 'Corpo, sede e urina'],
  ['pele', 'Pele, nervos e rosto'],
  ['resp', 'Respiração'],
  ['alerta', 'Sinais de alerta']
];

const COMORBIDADES = [
  ['has', 'Pressão alta'], ['dm', 'Diabetes'], ['cardio', 'Doença do coração'],
  ['renal', 'Doença dos rins'], ['pulm', 'Doença do pulmão (asma, DPOC)'],
  ['obes', 'Obesidade'], ['imuno', 'Imunidade baixa (quimioterapia, transplante, corticoide contínuo)'],
  ['gest', 'Gestante']
];

const MEDS_HIDRICOS = [
  'Diuréticos: furosemida (Lasix), hidroclorotiazida, clortalidona, indapamida, espironolactona (Aldactone)',
  'Mineralocorticoide: fludrocortisona (Florinefe)',
  'Inibidores de SGLT2: dapagliflozina (Forxiga), empagliflozina (Jardiance)'
];

const RESPIRA = [
  { g: 0, txt: 'Completei os 6 segundos sem incômodo' },
  { g: 1, txt: 'Completei, mas com incômodo ou peito preso' },
  { g: 2, txt: 'Parei antes dos 6 segundos, sem tossir' },
  { g: 3, txt: 'Tossi ao encher o peito' },
  { g: 4, txt: 'Não consegui nem começar a encher o peito' }
];

const GLOSSARIO = [
  ['Astenia', 'Cansaço extremo, falta de força.'],
  ['Cianose', 'Cor arroxeada em lábios ou dedos, por falta de oxigênio.'],
  ['Dessaturação', 'Queda do oxigênio no sangue, medida pelo oxímetro (SpO₂).'],
  ['Disestesia', 'Sensação anormal e desagradável, como ardência ou queimação.'],
  ['Dispneia', 'Falta de ar.'],
  ['Dor pleurítica', 'Dor em pontada que piora ao respirar fundo; pode indicar inflamação da pleura, a membrana que envolve o pulmão.'],
  ['Hemoptise', 'Tosse com sangue.'],
  ['Hipoxemia silenciosa', 'Oxigênio baixo no sangue sem falta de ar. Por isso o oxímetro é importante.'],
  ['Mialgia', 'Dor muscular.'],
  ['Odinofagia', 'Dor ao engolir.'],
  ['Oligoemia', 'Redução do volume de sangue que circula pelos tecidos.'],
  ['Oligúria', 'Pouca urina.'],
  ['Parestesia', 'Formigamento ou dormência.'],
  ['Poliúria', 'Urinar muito mais que o normal.'],
  ['Polidipsia', 'Sede intensa.'],
  ['SpO₂', 'Saturação de oxigênio: o quanto do sangue está carregando oxigênio. O normal é 95% ou mais.'],
  ['SRAG', 'Síndrome respiratória aguda grave: comprometimento importante do pulmão, com falta de ar.'],
  ['Vidro fosco', 'Achado da tomografia que mostra o pulmão parcialmente ocupado por líquido inflamatório.'],
  ['Xeromicteria', 'Ressecamento do nariz.'],
  ['Xerostomia', 'Boca seca.']
];

const COR = {
  azul:     { bg: '#B5D4F4', fg: '#0C447C', nome: 'Azul', sig: 'remissão' },
  amarelo:  { bg: '#FAC775', fg: '#633806', nome: 'Amarelo', sig: 'estável' },
  laranja:  { bg: '#EF9F27', fg: '#412402', nome: 'Laranja', sig: 'piora' },
  vermelho: { bg: '#E24B4A', fg: '#FFFFFF', nome: 'Vermelho', sig: 'piora com sinal de alarme' },
  cinza:    { bg: '#D3D1C7', fg: '#444441', nome: 'Cinza', sig: 'antes dos sintomas' }
};
const NIVEL_ORDEM = ['azul', 'amarelo', 'laranja', 'vermelho'];

/* ---------- vacinação (5 doses) ---------- */
const VACINAS = ['Não sei', 'Nenhuma', 'Pfizer (Comirnaty)', 'CoronaVac (Butantan)', 'AstraZeneca (Fiocruz)', 'Janssen', 'Moderna', 'Sputnik V', 'Outra'];
const ORDINAIS = ['primeira', 'segunda', 'terceira', 'quarta', 'quinta'];
function textoVacinas(r) {
  if (Array.isArray(r.vacinas)) return r.vacinas.map((v, i) => (i + 1) + 'ª ' + (v || '-')).join(' · ');
  return r.vacina || 'não informada';
}

/* ---------- sinais que apontam para COVID (mais que para outras gripes) ---------- */
const SINAIS_COVID = ['anosmia', 'sede', 'urina_esc', 'parest', 'queim_pp', 'prurido', 'conjunt', 'ard_naso'];

/* ---------- pesquisa ---------- */
const PESQUISA = {
  email: 'th.inova.care@gmail.com',
  pesquisadora: 'Rachel Ingrid Pereira da Rocha Jannuzzi',
  versaoTermo: '1.0'
};
const VERSAO_APP = '1.1.0';
