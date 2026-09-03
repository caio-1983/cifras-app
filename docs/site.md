# O site (`site/`)

`cifras.integrasolutions.com.br` — as 13 músicas do repertório, só leitura,
com busca e troca de tom. Ferramenta interna da banda, atrás de senha.

Deploy em [`deploy/README.md`](../deploy/README.md).

## Forma

Servidor Node pequeno (Fastify), renderizando no servidor. **Sem framework de
front-end, sem build de SPA, sem banco.** O estado do site é o arquivo
`dados/repertorio.json`; reiniciar não perde nada.

| Rota | O que faz |
|---|---|
| `GET /` | lista das 13, busca por título e artista |
| `GET /musica/:slug` | cifra no tom de origem |
| `GET /musica/:slug?tom=G` | cifra transposta |
| `GET /musica/:slug?tom=G&fragmento=1` | só o miolo (troca de tom sem recarregar) |
| `GET /saude` | healthcheck do systemd, fora do basic auth |
| `GET /robots.txt` | bloqueia tudo |

| Módulo | Papel |
|---|---|
| `site/servidor.ts` | rotas, configuração por ambiente, encerramento limpo |
| `site/repertorio.ts` | carrega o JSON — **o único ponto que muda** quando o acervo virar `.cifra` |
| `site/paginas.ts` | o cromo em volta da cifra (busca, seletor, navegação) |
| `site/tons.ts` | os tons oferecidos |

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

Conferido a 360px de viewport: nenhuma página tem rolagem horizontal
(`scrollWidth` 345 ≤ 360).

## Impressão

Tudo que o site acrescenta vive dentro de `@media screen`. O `@page{size:A4}`
e o `page-break-before` do emissor ficam intactos, e o cromo (barra, seletor,
controle de fonte) é escondido em `@media print`.

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

Montagem de culto na tela, edição, upload, banco de dados, sistema de login,
e a importação do acervo de 437 arquivos — cada um vem depois, e o acervo tem
decisão de formato pendente. O *mecanismo* de quebra de página entre músicas
já existe e está testado; o que não existe é a tela que monta o culto.
