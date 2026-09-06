# O site (`site/`) — Painel de Operação Musical

`cifras.integrasolutionsia.com.br` — ferramenta interna da banda, atrás de senha.

O conceito é um só: **preparar o culto no computador e executar o culto pelo
celular.** A tela de trabalho não é a biblioteca, é o culto — e a inicial é a
home de operação, que diz qual é o próximo culto, se ele está preparado, e
leva a ele em um toque.

```
Abrir culto → montar setlist → iniciar culto → executar pelo celular
           → trocar música / tom → encerrar
```

Deploy em [`deploy/README.md`](../deploy/README.md).

## Forma

Servidor Node pequeno (Fastify), renderizando no servidor. **Sem framework de
front-end, sem build de SPA, sem banco e sem sessão.** O acervo é
`dados/repertorio.json`; o estado de operação é a URL. Reiniciar não perde
nada.

| Rota | O que faz |
|---|---|
| `GET /` | **a home**: domingos do mês, próximo culto, ações rápidas, últimos cultos |
| `GET /culto/novo?data=…&periodo=…&nome=…&tema=…&musicas=…` | abre um culto: monta nome e setlist, redireciona |
| `GET /culto/novo/:nome?titulo=…&tema=…&d=…` | painel de um culto aberto na tela |
| `GET /executar/novo/:nome` | a execução desse culto |
| `GET /culto/:nome` | painel do culto: setlist, tons, música atual |
| `GET /culto/:nome?ordem=…&atual=2` | a setlist preparada, com o cursor |
| `GET /executar/:nome?ordem=…&i=2` | **modo execução** — a tela do celular |
| `GET /musicas` | a biblioteca: o repertório, com busca por nome, tema e cantor |
| `GET /cultos` | cultos anteriores |
| `GET /musica/:slug?tom=G` | cifra solta, transposta |
| `GET /musica/:slug?tom=G&fragmento=1` | só o miolo (troca de tom sem recarregar) |
| `GET /configuracoes`, `GET /perfil` | preferências deste aparelho; por que não há login |
| `GET /saude` | healthcheck do systemd, fora do basic auth |
| `GET /robots.txt` | bloqueia tudo |

| Módulo | Papel |
|---|---|
| `site/servidor.ts` | rotas, configuração por ambiente, encerramento limpo |
| `site/repertorio.ts` | carrega o JSON — **o único ponto que muda** quando o acervo virar `.cifra` |
| `site/cultos.ts` | o culto resolvido: setlist, rótulo derivado do nome do arquivo |
| `site/setlist.ts` | a ordem em execução, codificada na URL |
| `site/setlistTexto.ts` | a setlist digitada em texto, lida contra o repertório |
| `site/ui.ts` | design system: tokens, casca de navegação, primitivas |
| `site/paginas.ts` | as telas de **preparação** |
| `site/execucao.ts` | a tela de **execução** |
| `site/tons.ts` | os tons oferecidos e o passo de meio tom |

## A forma da tela de preparação

O painel do culto é **duas colunas no desktop** (a partir de 1080px): setlist à
esquerda, música atual à direita, grudada no topo e limitada à viewport — quem
rola é a prévia, para o título e os passos ficarem sempre à mão enquanto se
confere a cifra. Abaixo disso as duas empilham, com a setlist primeiro.

Três decisões de cor sustentam isso:

- **A lateral é a única superfície escura do modo claro** (`--rail`). Não é
  enfeite: é a tela de execução aparecendo dentro da tela de preparação, e é o
  que faz as duas metades do produto se reconhecerem. No escuro ela clareia em
  vez de escurecer, senão some no chão.
- **A pastilha de tom usa o acento, não o laranja da cifra.** Tom como
  *etiqueta* (linha de lista) é cromo; tom como *escolha sobre a cifra* (o
  seletor de 16 e a grade da execução) continua no laranja `--cifra`. Dois
  papéis, duas cores — a distinção tem que sobreviver à distância de um braço.
- **O azul da marca é alarme, não decoração.** A faixa do rascunho fica quieta
  (superfície + borda) enquanto a ordem é a do culto, e só acende quando a
  setlist foi alterada, que é o que precisa ser notado.

### O que a tela não mostra, de propósito

O modelo visual que originou este layout trazia duração por música e total do
culto, tema (`Adoração`, `Louvor`), ano, horário, "salvo há 2 min", alça de
arrastar e foto de perfil. **Nenhum dos sete existe aqui:** os quatro primeiros
não estão no dado (ver a seção da busca e "Os cultos são dado real"); "salvo"
seria mentira num servidor só de leitura; alça que não arrasta promete o que os
links `↑ ↓` fazem; e não há conta de usuário. Tela cheia de palpite é pior que
tela honesta e mais vazia.

## Duas experiências, um vocabulário

Preparação e execução usam os mesmos tokens com valores diferentes — não são
dois CSS. O que muda é o papel:

| | Preparação (desktop) | Execução (celular) |
|---|---|---|
| Fundo | claro | **escuro, por decisão** (`data-theme=dark` no `<html>`) |
| Foco | organizar, buscar, montar | ler, navegar, transpor |
| Casca | lateral no desktop, abas no celular | **nenhuma** |
| Cifra | prévia compacta (`--esc:1`) | grande, entrelinha 1,55 |

Na execução: deslizar troca de música (60 px e o dobro do movimento vertical,
para rolar a cifra não virar troca de música), tocar no título abre a setlist,
as setas do teclado navegam, e há autoscroll com cinco velocidades (~14 px/s
por nível) que para ao toque na cifra.

No escuro, os três tons do padrão são clareados (`#ff9147` na cifra, `#8fb4ff`
nos rótulos, `#c9a3ff` nas anotações) porque `#0000ff` sobre `#0d0f12` é
ilegível. **É a mesma tinta ajustada ao fundo, e vale só na tela** — o papel
continua com a original.

## Atalhos de teclado na preparação

Preparar culto é trabalho de mesa, repetitivo, com as duas mãos livres. Antes
eram 33 paradas de `Tab` do título da primeira música até a ação principal do
cartão da direita.

| Tecla | O que faz |
|---|---|
| `j` / `k` | próxima e anterior música da setlist |
| `[` / `]` | descer e subir meio tom na música atual |
| `/` | abre e foca o filtro de adicionar música |
| `Esc` | fecha o menu de tom, devolvendo o foco à pastilha |

**Cada atalho aciona um link que já existe na tela** — os mesmos `href`s que o
mouse usa. Nada aqui é o único caminho para nada, e nada depende de JavaScript
para funcionar (sem script, clica-se o mesmo link). No fim da setlist a tecla
não faz nada em vez de recarregar a mesma página, porque o passo desligado é
`<span>` e não tem `href`.

A legenda mora em `/configuracoes`, junto do resto do "como isto funciona", e
nos `title` dos próprios botões. Legenda fixa na tela do culto seria cromo
permanente numa tela que se orgulha de ser vazia.

## O menu de tom não esconde tom

O menu abria para baixo e cobria as músicas seguintes — e o que ele escondia era
justamente o que se precisa ao transpor: **o tom das outras músicas do culto.**
Quem troca o tom da 3 está comparando com o da 2 e o da 4.

- **Na faixa larga** ele abre à **direita** da pastilha, sobre a coluna de
  ações, onde não mora nenhum tom. As pastilhas das demais linhas ficam à
  esquerda do menu e continuam visíveis.
- **No estreito** ele é folha inferior, com véu, e a linha dona sobe para o alto
  da tela — a folha tapava a própria música que estava sendo alterada, que é
  pior que tapar as vizinhas.
- **As outras linhas ficam `inert` e recuam para 45%** enquanto ele está aberto.
  Antes dava para clicar no `+` da música vizinha ao lado do menu aberto e
  transpor a música errada sem perceber.

## A navegação é de conteúdo, não de funções

`Início`, `Músicas`, `Hinário`, `Cultos anteriores` — mais `Configurações` e
`Perfil` no rodapé. Transposição, escala de fonte, filtro por tom e troca de
música moram **dentro** da tela que precisa delas. Menu não é catálogo de
funções: quem está no palco procura a música, não o item de menu.

`Buscar` **deixou de ser destino**: a busca é o topo de `Músicas`, que é onde
o acervo está. `Hinário` entrou pelo teste oposto e passou: não é função nem
filtro salvo, é o mesmo acervo em **outra ordem**. Hino se chama pelo número
("vamos no 422"), e `/musicas` ordena por título — a ordem errada para isso.
Duas ordens do mesmo acervo são dois destinos; por isso `Hinário` mora no
grupo `Biblioteca`, ao lado de `Músicas`, e não num grupo próprio.

**Não há botão de "pôr no culto" na tela do hinário.** O culto não tem URL
fixa — ele é a setlist codificada na querystring —, então uma tela que não
sabe qual culto está aberto não teria para onde adicionar. Hino entra no culto
pelo mesmo `+ Adicionar música` de qualquer música; o que mudou é que o filtro
de lá passou a casar com o número do hino.

## O estado de operação é a URL

Preparar num aparelho e executar em outro exige que a ordem preparada
atravesse. Sem banco, quem atravessa é o link:

```
/executar/06SET?ordem=vitorioso-es:G,quebrantado:C&i=1
```

Daí três consequências, todas deliberadas:

- **O tom troca na própria linha.** A pastilha abre um `<details>` com as 16
  grafias ali mesmo — antes ela levava para a página da cifra, o que tirava
  quem estava preparando de dentro do culto. As opções são `href`s: sem
  JavaScript o menu abre e escolher navega igual; o script só acrescenta
  fechar por Escape, por clique fora, e um menu aberto por vez. A cifra
  continua a um clique, no rodapé do menu.
- **Toda ação da setlist é link de verdade.** Reordenar, remover, adicionar,
  transpor e escolher a música atual são `href`s que já carregam o `?ordem=`
  resultante, calculado no servidor. Sem JavaScript o painel inteiro funciona
  — e a rede da igreja não é confiável.
- **O rascunho local é conveniência, não fonte.** O painel guarda a ordem
  alterada em `localStorage` (`cifras:culto:<nome>`) só para sobreviver a um
  recarregamento, e reescreve o link. "Copiar link para o celular" é o que
  leva a setlist para a estante.
- **Sem `?ordem=`, vale a ordem tocada.** Parâmetro inválido cai na ordem
  canônica, e tom inválido no tom de origem — mesma política do `?tom=`: quem
  abriu quer o culto, não um 400.

O status do culto (preparando / ao vivo / encerrado) também é do aparelho. Não
há culto "ao vivo" compartilhado entre celulares — seria estado de servidor.

## Os cultos são dado real, não exemplo de tela

A setlist vem de `CULTOS` em `gerador/repertorio/__init__.py` — os cultos de
28/08, 30/08 e 06/09 que **já foram tocados** — e chega ao site por
`dados/repertorio.json` como `[slug, tom]`. Ordem e tom são o dado.

O rótulo ("Culto de 06 de setembro") é derivado do nome do arquivo pela
convenção do padrão visual (`DDMMM` + período). **O que a convenção não
carrega, a tela não mostra:** não há ano, horário, dia da semana nem duração de
música no dado, e o painel não completa nenhum dos quatro para parecer mais
cheio.

Culto com música fora do repertório é descartado inteiro — meio culto na tela
é pior que culto nenhum.

## A renderização da cifra não é deste código

A cifra sai de `gerador-ts/html.ts::escrever` — o emissor portado, travado
byte a byte contra o Python em `tests/emissorPort.test.ts` (139 fixtures).
`site/paginas.ts` só põe o cromo em volta. O CSS do padrão visual (Arial,
laranja `#ff6600` na cifra, azul `#0000ff` nos rótulos, roxo `#9900ff` nas
anotações, escuro `#1b1b1b` na letra) vem da constante `CSS` do emissor e não
é tocado.

Cada regra desse emissor custou um erro real. Reimplementar a renderização
para "ficar mais bonito no site" é o jeito mais rápido de perder o
alinhamento do acorde sobre a sílaba.

## Busca: por tom, porque tema não existe no dado

A busca filtra por título e artista (sem acento: "coracao" acha "Coração") e os
chips filtram por **tom de origem**. Não há filtro por tema — `Adoração`,
`Louvor`, `Fé` — porque **o repertório não tem campo de tema**. Chutar três
rótulos por música a partir da letra encheria a tela de dado inventado, e a
tela diz isso em vez de exibir palpite. Quando o campo existir (a decisão de
formato está em `docs/achados-importacao.md`), os chips passam a servi-lo.

## Mobile primeiro, e o que isso quer dizer aqui

O uso real é músico com celular ou tablet na estante, lendo a uma distância
de braço, muitas vezes com as mãos ocupadas. As decisões saem daí:

- **Fonte grande por padrão** (não 12pt, que é medida de papel) e controle
  `A−`/`A+` que persiste em `localStorage`. Ninguém quer dar pinch-zoom a
  cada música.
- **Alvo de toque grande** — 44px mínimo, nada que exija precisão. O seletor
  de tom é uma fila de botões que rola, não um menu suspenso.
- **A cifra rola na horizontal em vez de quebrar linha.** Quebrar destrói o
  alinhamento do acorde sobre a sílaba, que é o ponto da linha posicional.
- **O tom atual entra em cena sozinho** — são 16 tons; abrir uma música em G
  mostrando a fila começando em C esconde a resposta.

Conferido no Chromium a 360px de viewport, em todas as telas do painel
(culto, execução, busca, músicas, cultos, configurações, cifra solta):
`scrollWidth == clientWidth`, nenhum erro de console.

## Impressão

Tudo que o site acrescenta vive dentro de `@media screen`. O `@page{size:A4}`
e o `page-break-before` do emissor ficam intactos, e o cromo (casca de
navegação, controles, cromo da execução) é escondido em `@media print`.

Conferido no PDF, não na tela — a disciplina que `docs/achados-google-docs.md`
cobra: `MediaBox` 595×842 (A4), e num documento de três músicas cada uma
começa no topo de uma página (p1, p3, p8).

> No navegador `page-break-before` e `@page` funcionam. É o importador do
> **Google Docs** que os descarta — por isso a saída para Docs continua sendo
> RTF. Não confunda os dois caminhos.

## Seletor de tom: 16, não 12

Transpor por intervalo preserva a letra da nota justamente para que a grafia
do destino seja uma **escolha**. Um seletor só com bemóis esconde metade das
respostas certas:

```
E -> Gb   =>   | Gb | Cb | Ebm |
E -> F#   =>   | F# | B  | D#m |
```

As duas estão corretas; qual serve depende de quem lê. Por isso o seletor
oferece as duas grafias onde as duas são usadas na prática: `Db/C#`, `Gb/F#`,
`Ab/G#`, `Bb/A#`, além de `F#`. `Eb` vai sozinho porque `D#` não é usado como
tom na prática da banda.

Conferido: as 13 músicas emitem sem erro nos 16 tons (208 combinações),
nenhuma produzindo acidente duplo.

Tom desconhecido no `?tom=` cai no tom de origem em vez de dar erro — o link
pode ter vindo de um favorito antigo, e o músico quer a cifra, não um 400.

### O passo de meio tom, e por que ele não substitui o seletor

Setlist e execução têm `−1`/`+1`, que é o que se quer com uma mão no
instrumento. Mas um stepper precisa de **uma** resposta por passo, e "duas
grafias do mesmo som" não é uma sequência. Então o passo anda por um ciclo de
doze na grafia com bemol (`CICLO` em `site/tons.ts`), e a escolha enarmônica
continua explícita na grade de 16.

O ciclo é indexado por classe de altura (`CICLO[semitom(tom)]`), derivada do
núcleo — não é tabela de nota digitada à mão, que é justamente onde entra erro
de enarmonia. Partir de `F#` e subir dá `G`; descer dá `F`.

Na execução, trocar o tom não recarrega a página: o `fetch` do fragmento troca
o miolo e a URL é reescrita com a ordem nova. O stepper é reapontado a partir
da grade — sem isso, `+` continuaria apontando para o sucessor do tom antigo.

## Troca de tom sem recarregar

Progressive enhancement, sem framework: os tons são links de verdade
(`?tom=X`) e sem JavaScript a navegação normal funciona igual. Com JS, um
`fetch` do fragmento troca só o miolo. Qualquer falha cai na navegação normal.

## Gate de acesso

O acervo tem letra de música protegida. **Não há login no Node** — o gate é
HTTP basic auth no nginx, e o processo escuta em `127.0.0.1` para não ficar
alcançável sem ele. Trocar `CIFRAS_HOST` para `0.0.0.0` abre o acervo.

Toda página sai com `noindex, nofollow` na meta e no cabeçalho
`X-Robots-Tag`, e `robots.txt` bloqueia tudo.

## Pendência de modelagem: `momento`

`momento` (Ofertório, Apelo / Ceia) hoje é campo da música. **Não é.** É
propriedade do papel da música num culto: `QUEBRANTADO` não é "a música do
Ofertório", foi a música do Ofertório num culto específico.

Sintoma: sem tratamento, `/musica/quebrantado` anunciaria "Ofertório" sem
contexto nenhum. O site desliga a emissão (`escrever(..., { momento: false })`);
dentro de documento de culto ele continua saindo, que é onde faz sentido.

O painel agora expõe a assimetria: no `/culto/:nome` e na execução o momento
aparece no **cromo** (linha da setlist, topo da execução), porque ali existe o
contexto; a cifra emitida continua sem ele. Ou seja, hoje o painel exibe o
momento da música certa por coincidência — a música só está em um culto. Com a
mesma música em dois cultos e papéis diferentes, a tela mostraria o mesmo
rótulo nos dois. É o mesmo remendo, agora visível na tela.

**Isso é remendo, não solução.** O certo é `momento` sair da música e ir para
a entrada do culto: `CULTOS` hoje guarda `[musica, tom]` e deveria guardar
`[musica, tom, momento]`. A mudança mexe em `gerador/modelo.py`,
`gerador/repertorio/`, nos dois emissores e nas fixtures — não cabia nesta
etapa. Enquanto não acontece, o parâmetro `OpcoesEmissao.momento` é o que
segura.

## O JSON é ponte temporária

`dados/repertorio.json` é gerado de `gerador/repertorio/*.py` (ver
`gerador/scripts/exportar_repertorio_json.py`). Quando o formato `.cifra`
estabilizar (`docs/achados-importacao.md`), `site/repertorio.ts` passa a ler
`musicas/*.cifra` pelo parser do núcleo e o JSON some. O resto do site fala
`MusicaDados`, então a troca fica contida naquele módulo.

## A home (`/`) e o culto que nasce na tela

`/` era um redirecionamento para o culto mais recente do repertório; depois
virou a agenda dos cultos deste aparelho. Hoje é a **home de operação**, e ela
existe para responder quatro perguntas, nesta ordem:

1. **Qual é o próximo culto?** — o cartão `#proximo`, que é o CTA da página.
2. **Ele já está preparado?** — o selo do cartão: verde quando sim, amarelo
   quando não. Amarelo é só alerta; azul continua sendo a única tinta de ação.
3. **O que do mês já foi preparado?** — a grade dos domingos, com "X de N
   preparados" e barra.
4. **O que preciso fazer agora?** — as quatro ações rápidas.

**A grade do mês sai do calendário, não de cadastro.** Culto de domingo é a
regra da casa: `domingosDoMes` deriva os domingos do mês corrente (quatro ou
cinco, conforme o mês cai) e cada domingo é clicável. O estado de cada um vem
de duas fontes, e a divisão é a mesma do resto do painel:

| Estado | Quem sabe | Como |
|---|---|---|
| Realizado | o **servidor** | o repertório casa por dia e mês — o nome do culto não carrega ano |
| Preparado / Em preparo | o **aparelho** | `SCRIPT_HOME` lê o índice em `localStorage` e a setlist da chave do culto |
| Pendente | ninguém | é o estado inicial |

Por isso a grade sai do servidor já correta e o script só **acrescenta** o que
o aparelho conhece: sem JavaScript a home continua respondendo as quatro
perguntas, só não conhece os cultos abertos neste aparelho. Domingo pendente
abre o formulário **com a data já preenchida** — clicar em 20/09 e ter que
digitar 20/09 seria trabalho inventado; o `href` do link leva ao mesmo lugar
sem script.

**O que a home não mostra**: horário e número de músicos não existem no modelo
(ver `site/cultos.ts`), e a home não os inventa para encher cartão. Data de
culto tocado sai sem ano, pelo mesmo motivo. E como o servidor guarda o culto
(aparelho + link, sem estado) saiu da home: é assunto de Configurações, não de
quem está marcando um culto.

O card **Nova música** aparece desabilitado: adicionar música ao acervo não
existe — o acervo entra por importação (`docs/plano-camada-formato.md`) e
cadastro na tela é sprint 2. Um card que abrisse outra coisa seria mentira; um
card ausente esconderia a lacuna.

Na lateral, `/` é **Início** — a operação. O culto aberto não é item de menu
porque não tem URL fixa: ele nasce do domingo que se clica ou do botão de novo
culto. Continuam sendo três destinos.

**Abrir culto** é um modal com quatro campos:

| Campo | Vai para | Por quê |
|---|---|---|
| Data (obrigatória) | o **nome**: `14SET` | é a identidade do culto, na convenção do padrão visual |
| Período (obrigatório) | o sufixo do nome: `14SET_Noite` | dois cultos no mesmo dia são dois cultos: sem o sufixo dividiriam nome, URL e rascunho. Oferece manhã, tarde e noite (`PERIODOS_OFERECIDOS`) |
| Nome do culto | `?titulo=` | texto livre não pode entrar no nome: ele é URL e chave de rascunho |
| Tema | `?tema=` | idem |
| Setlist | `?ordem=` | uma música por linha, o tom no fim — vira a ordem de sempre |

**A setlist é digitada de uma vez** (`site/setlistTexto.ts`), como a ordem do
culto já é escrita no papel:

```
1. VITORIOSO ÉS - G
2. EU VOU CONSTRUIR (C)
   TEU TOQUE
```

Numeração, acento faltando, caixa, linha em branco entre blocos, tom entre
parênteses ou depois de `-`, `–`, `|` ou `:` — tudo isso é lido. Sem tom
escrito vale o tom de origem da música. Duas regras existem para não montar
culto errado em silêncio:

- **O tom só é separado do título se for tom de verdade.** `DEUS É DEUS -
  PARTE 2` não vira "DEUS É DEUS" no tom "PARTE 2".
- **Linha que não casa não é descartada** — nem prefixo ambíguo escolhe
  sozinho. O formulário reabre com tudo que foi digitado e diz, linha por
  linha, o que não entendeu. Setlist com uma música a menos, montada sem
  avisar, só se descobre no culto.

A data completa também viaja, em `?d=`, porque **a convenção do nome não tem
ano** — e sem ano não há como dizer o que ainda está por vir. Ela só é aceita
se concordar com o nome: `?d=` de outro dia (link editado à mão) é descartado
e o rótulo volta a ser o da convenção, sem ano.

**Abrir não escreve nada.** O formulário é um GET para `/culto/novo`, que monta
o nome e redireciona para `/culto/novo/14SET_Noite?titulo=…&tema=…&d=…`. Dali
em diante é o painel de sempre: a setlist viaja no `?ordem=`, e `titulo`,
`tema` e `d` acompanham **todo** link do painel (`identidadeDoCulto`) — sem
isso o primeiro clique na setlist apagaria o que o usuário acabou de escrever.
O rascunho fica em `localStorage`, sob `cifras:culto:novo/<nome>`, separado da
chave do culto do repertório de mesmo nome. `/executar/novo/:nome` é a mesma
execução, e setlist vazia volta para a preparação.

`<dialog>` não abre sem JavaScript — por isso o botão nasce `hidden` e o
`<noscript>` traz o mesmo formulário na página. O painel inteiro funciona sem
JS e abrir culto não podia ser a exceção.

Como o servidor não sabe que cultos alguém abriu, as listas vêm de um índice
local (`cifras:cultos-novos`), escrito pelo painel do culto novo: `/` mostra só
o que é **de hoje em diante**, `/cultos` mostra todos. Entrada sem data (culto
aberto antes deste campo existir) aparece na lista completa e nunca na agenda —
chutar que é futuro seria inventar. É conveniência: o que atravessa continua
sendo o link, e limpar os dados do navegador apaga a lista. A tela diz isso.

### Salvar culto

O painel do culto aberto na tela tem **Salvar culto**; o do repertório não —
lá o culto já é dado versionado, e um botão prometeria escrita que não existe.

**"Salvar" é neste aparelho, e a tela diz isso.** O botão carimba a setlist
atual no índice local (`salvo` + `em`) e a faixa passa a dizer "salvo neste
aparelho, com 5 músicas" ou "alterado depois de salvo"; a agenda mostra o
mesmo em cada linha. Não há escrita no servidor — a regra do projeto é sem
banco, e prometer nuvem num botão é mentira que só se descobre no aparelho do
outro músico. Salvar de verdade, para a igreja inteira, é sprint 2 em diante e
depende da decisão sobre onde o dado mora (`docs/rumo.md`).

O rascunho continua sendo salvo sozinho a cada clique, para um recarregamento
não custar o culto. O que o botão acrescenta é o carimbo: qual versão é a que
o usuário considera pronta.

Sair do culto com alteração posterior ao último salvamento abre um aviso —
**Continuar aqui / Sair sem salvar / Salvar e sair**. Ele só vale para links
que saem do culto: trocar tom, reordenar e adicionar são links para o próprio
painel, e avisar a cada um seria alarme que se aprende a ignorar; iniciar o
culto também passa, porque a setlist viaja no link. Fechar a aba não passa por
link nenhum — aí quem avisa é o navegador, com o texto dele.

O que está em jogo é **o carimbo, não a setlist**: o rascunho fica no aparelho
de qualquer jeito, e é ele que a agenda abre. Por isso o aviso fala em "mudou
depois do último salvamento" e não promete perda de culto.

Diferenças em relação ao culto do repertório, todas deliberadas: não existe
"setlist alterada" (não há ordem tocada para comparar), não existe "restaurar
ordem do culto", e a última música pode ser removida — montar é errar e
desfazer.

## Fora de escopo, de propósito

**Montagem de culto na tela existe** desde o painel de operação, e agora o
culto também pode **nascer** na tela — mas segue sendo rascunho no aparelho e
no link. O que continua fora:

- **Salvar a setlist alterada** como culto — exigiria escrita, e a fonte da
  verdade é arquivo versionado.
- **Culto ao vivo compartilhado** entre celulares (o operador troca a música e
  a banda vê trocar). Exigiria estado de servidor, e hoje não há nenhum.
- **Edição de cifra, upload, banco, login** — e a importação do acervo de 437
  arquivos, que tem decisão de formato pendente (`docs/achados-importacao.md`)
  e vem antes de qualquer uma destas.
- **Tema de música** (`Adoração`, `Louvor`…) e **duração** — não existem no
  dado. Ver a seção da busca.
