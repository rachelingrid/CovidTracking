# Gripetracking

**Rastreio de síndrome gripal, dia a dia, com foco em COVID-19. Funciona offline no celular.**

No início, a COVID-19 é muito parecida com uma gripe comum. Por isso, a qualquer sinal de gripe, principalmente forte ou com muita dor no corpo, a pessoa começa a registrar os sintomas. O foco em COVID-19 reflete o objetivo: juntar os sinais que apontam para COVID e para um quadro grave, e avisar a tempo de fazer o autoteste e de procurar o médico.

O paciente (ou o cuidador) registra os sintomas de cada dia, faz um teste simples de respiração e informa oxigênio e temperatura, se tiver os aparelhos. O app mostra se o quadro caminha para melhora ou piora, sinaliza quando procurar atendimento e gera um relatório em PDF para o médico, com a linha do tempo e as hipóteses a investigar.

> **Não é dispositivo médico.** Não faz diagnóstico, não prescreve medicamentos e não substitui avaliação profissional. Em emergência, ligue **192 (SAMU)**.

> **Restrição hídrica:** quem já tem restrição de líquidos, usa diurético ou remédio que mexe com o sal e a água do corpo deve procurar o médico imediatamente para controle de diurese e eletrólitos.

## O que o app faz

- **Linha do tempo única** por dia de doença (D-5 a D0 e em diante): cada dia é uma caixa colorida com os sintomas dentro; o sintoma que terminou aparece riscado no dia seguinte.
- **Cor de trajetória:** azul (remissão), amarelo (estável), laranja (piora), vermelho (piora com sinal de alarme).
- **Teste de respiração** com cronômetro de 6 segundos e índice de restrição inspiratória (graus 0 a 4).
- **Termômetros** de SRAG e de hipoxemia silenciosa.
- **Regras de encaminhamento** (ambulatório, médico no mesmo dia, hospital, emergência).
- **Condutas do dia:** hidratação com meta por peso, caminhada, refeições, sol, exercício respiratório, medicações tomadas (só registro) e sono.
- **Janela do autoteste** (D3 a D7) e **quarentena** (D0 a D7, prorrogada se houver febre).
- **Aviso a contatos** das janelas de incubação, com mensagem pronta; o app não guarda nomes nem contatos.
- **Leitura de laudos** de sangue e de tomografia de tórax por foto ou PDF, no próprio celular.
- **Relatório PDF** para o médico e **exportação CSV** sem nome e sem e-mail, para análise (por exemplo, no Octave).
- **Lembretes** na agenda do celular (arquivo .ics).
- **Sinais que apontam para COVID** e interpretação dos autotestes (positivo, ou dois negativos com 48 h de intervalo).
- **Vacinação contra COVID** por dose (5 perguntas: Pfizer, CoronaVac, AstraZeneca, Janssen, Moderna, Sputnik V, outra, nenhuma ou não sei).

## Pesquisa científica

Na abertura, o app apresenta um termo de consentimento **opcional** para uso dos dados em pesquisa. Quem autoriza pode tocar em **Enviar dados para a pesquisa** (em "Mais" ou ao encerrar o rastreio): o celular compartilha duas planilhas CSV, sem nome e sem e-mail, identificadas apenas por um código aleatório, para o e-mail da pesquisa. A autorização pode ser retirada a qualquer momento. O uso dos dados depende de aprovação do projeto em Comitê de Ética em Pesquisa (CEP).

## Privacidade

Todos os dados ficam apenas no navegador do celular. Nada é enviado a servidores; os dados só saem do aparelho quando o próprio usuário toca em "Enviar". O usuário pode exportar ou apagar seus dados a qualquer momento.

## Como usar

1. Abra o endereço do app no navegador do celular (Chrome no Android, Safari no iPhone).
2. Na primeira abertura com internet, o app fica guardado no aparelho. Depois funciona sem internet.
3. Para ter um ícone na tela inicial: menu do navegador › **Adicionar à tela inicial**.

## Publicação no GitHub Pages

1. Envie todos os arquivos desta pasta para a raiz do repositório.
2. No repositório: **Settings › Pages › Build and deployment › Source: Deploy from a branch**, branch `main`, pasta `/ (root)`.
3. Endereço do app: **https://rachelingrid.github.io/Gripetracking/**
4. Ao alterar qualquer arquivo, aumente a versão em `sw.js` (`VERSAO`) para os celulares baixarem a atualização.

## Estrutura

```
index.html              página do app
css/styles.css          aparência
js/data.js              sintomas, fases, glossário
js/engine.js            regras, escores, cores e termômetros (limiares em PARAM)
js/ocr.js               leitura de laudos
js/report.js            relatório PDF
js/app.js               telas
sw.js                   funcionamento offline
vendor/                 bibliotecas de terceiros (OCR, PDF), com as licenças
```

## Autoria e licença

© 2026 **Rachel Ingrid Pereira da Rocha Jannuzzi** · ORCID [0000-0002-0408-6302](https://orcid.org/0000-0002-0408-6302)

**Todos os direitos reservados.** Uso pessoal apenas pelo endereço publicado. **Proibidas a cópia, a modificação, a redistribuição e a comercialização** sem autorização escrita da autora. Veja [LICENSE](LICENSE).
