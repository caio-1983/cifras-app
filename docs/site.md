# O site (`site/`) — Painel de Operação Musical

`cifras.integrasolutions.com.br` — ferramenta interna da banda, atrás de senha.

O conceito é um só: **preparar o culto no computador e executar o culto pelo
celular.** A tela principal não é a biblioteca, é o culto.

```
Preparar culto → montar setlist → iniciar culto → executar pelo celular
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
| `GET /` | o culto mais recente (302 para `/culto/:nome`) |
| `GET /culto/:nome` | painel do culto: setlist, tons, música atual |
| `GET /culto/:nome?ordem=…&atual=2` | a setlist preparada, com o cursor |
| `GET /executar/:nome?ordem=…&i=2` | **modo execução** — a tela do celular |
| `GET /musicas` | o repertório, com busca |
| `GET /buscar` | a mesma busca, com o campo em foco |
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
| `site/ui.ts` | design system: tokens, casca de navegação, primitivas |
| `site/paginas.ts` | as telas de **preparação** |
| `site/execucao.ts` | a tela de **execução** |
| `site/tons.ts` | os tons oferecidos e o passo de meio tom |

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

## A navegação tem quatro destinos

`Culto`, `Músicas`, `Buscar`, `Cultos anteriores` — mais `Configurações` e
`Perfil` no rodapé. Transposição, escala de fonte, filtro por tom e troca de
música moram **dentro** da tela que precisa delas. Menu não é catálogo de
funções: quem está no palco procura a música, não o item de menu.

## O estado de operação é a URL

Preparar num aparelho e executar em outro exige que a ordem preparada
atravesse. Sem banco, quem atravessa é o link:

```
/executar/06SET?ordem=vitorioso-es:G,quebrantado:C&i=1
```

Daí três consequências, todas deliberadas:

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

## Fora de escopo, de propósito

**Montagem de culto na tela existe** desde o painel de operação — mas monta a
partir dos cultos que já existem, e a montagem é rascunho no aparelho e no
link. O que continua fora:

- **Criar culto novo, com data.** O painel prepara sobre um culto existente. O
  culto nasce em `gerador/repertorio/__init__.py`, porque é lá que ele é dado.
- **Salvar a setlist alterada** como culto — exigiria escrita, e a fonte da
  verdade é arquivo versionado.
- **Culto ao vivo compartilhado** entre celulares (o operador troca a música e
  a banda vê trocar). Exigiria estado de servidor, e hoje não há nenhum.
- **Edição de cifra, upload, banco, login** — e a importação do acervo de 437
  arquivos, que tem decisão de formato pendente (`docs/achados-importacao.md`)
  e vem antes de qualquer uma destas.
- **Tema de música** (`Adoração`, `Louvor`…) e **duração** — não existem no
  dado. Ver a seção da busca.
