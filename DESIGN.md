# Design

O sistema visual do Integra Music. A fonte executável é a constante `CSS_UI` em
`site/ui.ts`; este documento diz **por quê**. Se os dois divergirem, o código
está certo e este arquivo está velho.

## Theme

**Claro na preparação, escuro na execução — por decisão, não por preferência do
sistema.**

A cena que decide: o diretor musical monta o culto na terça à tarde, sentado,
num monitor, sala iluminada. A banda lê a cifra no domingo à noite, de pé, com o
celular na estante, sob luz de palco baixa e refletor apontado para o rosto. Não
há um tema que sirva aos dois: `/executar/*` abre com `data-theme=dark` fixo no
`<html>` e as telas de preparação seguem a preferência do aparelho.

**Duas experiências, um vocabulário.** Não são dois CSS — são os mesmos tokens
com valores diferentes. É o que faz as duas metades do produto se reconhecerem.

**A troca de tema fica no canto direito de toda tela de preparação** — no
cabeçalho da home no computador, na barra de topo no celular. Ela morava só em
Configurações, e isso fazia de "escurecer a tela" uma viagem: quem entra por
causa da aparência não está procurando um destino, está ajustando a tela em que
já estava. O botão alterna **claro↔escuro** e o ícone mostra a ação (sol no
escuro, lua no claro), trocado por CSS para nascer certo sem piscar.
**Automático continua só em Configurações**: é o terceiro estado, e um botão de
um toque que passeia por três não diz onde vai parar.

**A marca é link para o início**, nas duas navegações. É o caminho de volta que
todo mundo tenta primeiro, e Configurações não tem aba própria no celular —
sem isso, quem entrava lá só saía pela barra inferior, que se lê como destino,
não como volta.

Tudo que o painel acrescenta vive dentro de `@media screen`. A impressão continua
saindo do emissor validado em produção (A4, Arial, laranja `#ff6600`), intocada.

## Color

### Estratégia

**Restrained.** Neutros tingidos + um acento, abaixo de 10% da superfície. O
acento aparece em ação primária, seleção corrente e indicador de estado — nunca
em decoração. A exceção deliberada é o trilho da navegação, que é uma superfície
escura inteira dentro do modo claro (ver abaixo).

### De onde vem a cor

Da logo (`IntegraMusic.png`), amostrada do arquivo:

| Papel na logo | Valor amostrado | OKLCH |
|---|---|---|
| Azul do gradiente | `#00baf4` → `#008cf1` | `oklch(0.74 0.147 230)` → `oklch(0.63 0.180 250)` |
| Verde do gradiente | `#0df022` | `oklch(0.83 0.275 143)` |
| Lima do gradiente | `#9af624` | `oklch(0.88 0.236 132)` |
| Fundo | `#000615` | `oklch(0.12 0.040 254)` |

Três regras de tradução, e é o que separa "usar as cores da logo" de "colar a
logo na interface":

1. **O azul é o acento.** Ação, seleção, foco. É a metade da marca que aguenta
   ser cor de trabalho.
2. **O verde-lima é reservado a "ao vivo".** Estado, não ação. Verde e azul
   nunca disputam o mesmo significado na mesma tela.
3. **O navy é o trilho e a execução.** A superfície escura do produto é a cor de
   fundo da logo, não um cinza qualquer.

O gradiente em si **não entra na interface**. Ele é a assinatura da marca, e vive
na marca (`site/estatico/marca.png`). Gradiente em botão, faixa ou texto é
decoração, e este produto não tem espaço para decoração.

**O laranja `#ff6600` da cifra está fora dessa conta.** Ele é o padrão visual do
papel, anterior à marca, validado em produção e reconhecido de longe pela banda.
Não é token de tema: é dado.

### Tokens — modo claro

```
--ground        #f4f7fb   fundo da página (neutro tingido, C≈0.006 no hue 245)
--surface       #ffffff   cartão, painel, barra
--raised        #e9eef5   chip em repouso, hover de ícone
--line          #dde4ed   borda
--ink           #141820   texto
--muted         #5f6874   texto secundário e rótulo
--acento        #0072bd   ação primária, seleção corrente, foco
--acento-forte  #00609f   hover da ação primária
--acento-fraco  #ebf4fd   fundo de pastilha, anel de foco, faixa de alerta
--viva          #267d30   culto ao vivo
--alerta        #b6322b   erro
--rail          #0d1e2f   trilho da navegação (o navy da logo)
--rail-ink      #e9eff6   texto do trilho
--rail-muted    #96a3b3   texto secundário do trilho
--rail-hover    #16293c   hover no trilho
```

Os neutros são tingidos ~0.006–0.012 de croma **no hue do azul da marca** (245),
não "para o quente" nem "para o frio" por reflexo. `--ground` é um off-white
azulado, não um creme.

### Tokens — modo escuro

```
--ground        #0b0f14   --surface  #13171d   --raised  #1c222b   --line  #262e39
--ink           #e9edf2   --muted    #939dab
--acento        #69c1fc   --acento-forte #8ad0ff   --acento-fraco #0f2940
--viva          #6ed889   --alerta   #f19e97
--rail          #161c24   --rail-hover #202935
```

Duas regras que o escuro obriga:

- **O trilho clareia em vez de escurecer.** No claro ele é a superfície mais
  escura; no escuro ele é mais claro que o chão, senão some. O papel dele é
  "estar acima", não "ser escuro".
- **Sobre o acento claro, o texto é `#0b1220`** (o navy da logo), nunca branco.
  Vale para `.btn-forte`, `.chip[aria-current]`, o item corrente do trilho e o
  `summary` do menu de tom.

### Os três tons do padrão do papel

`--cifra`, `--rotulo`, `--anot` e `--letra` reproduzem o padrão do Google Docs
(`docs/padrao-visual.md`). No escuro eles clareiam (`#ff9147`, `#8fb4ff`,
`#c9a3ff`) porque `#0000ff` sobre `#0b0f14` é ilegível — **é a mesma tinta
ajustada ao fundo, e vale só na tela.** O papel continua com a original.

### Dois papéis para o tom, duas cores

- **Tom como etiqueta** (a pastilha na linha de uma lista) usa `--acento`.
- **Tom como escolha sobre a cifra** (a grade de 16 e o seletor da execução) usa
  `--cifra`.

A distinção tem que sobreviver à distância de um braço, com luz baixa. Uma cor só
para os dois papéis é o tipo de economia que custa uma música no tom errado.

### Contraste — conferido, não estimado

| Par | Razão | Exigência |
|---|---|---|
| `--ink` sobre `--ground` (claro) | 16.6:1 | ≥4.5 ✓ |
| `--muted` sobre `--ground` | 5.3:1 | ≥4.5 ✓ |
| `--muted` sobre `--raised` | 4.8:1 | ≥4.5 ✓ |
| `#fff` sobre `--acento` | 5.2:1 | ≥4.5 ✓ |
| `--acento` sobre `--acento-fraco` | 4.6:1 | ≥4.5 ✓ |
| `--viva` sobre `--ground` | 4.8:1 | ≥4.5 ✓ |
| `--alerta` sobre `--ground` | 5.6:1 | ≥4.5 ✓ |
| `--rail-muted` sobre `--rail` | 6.0:1 | ≥4.5 ✓ |
| `--ink` sobre `--surface` (escuro) | 15.3:1 | ≥4.5 ✓ |
| `--muted` sobre `--ground` (escuro) | 7.0:1 | ≥4.5 ✓ |
| `#0b1220` sobre `--acento` (escuro) | 9.1:1 | ≥4.5 ✓ |
| `--viva` sobre `--ground` (escuro) | 10.8:1 | ≥4.5 ✓ |

**Sobre o laranja, o texto é escuro.** `.pastilha-forte`, a grade de 16 tons e o
seletor da execução usam `#0b1220` sobre `--cifra`, não branco: **6.38:1** no
claro e **8.37:1** no escuro (era 2.94 e 2.24). O rótulo enarmônico é o mesmo
`#0b1220` a `opacity:.8` — **4.97:1** — em 11px, não mais `#ffe6d5` a 10px, que
media 2.45:1 e 1.87:1. O `#ff6600` não mudou: mudou o que se escreve em cima.

**O que continua fora de AA, e por quê:** os acordes dentro da cifra
(`.c`, `#ff6600` sobre branco) medem **2.94:1**, contra os 3:1 exigidos para
texto grande. É a tinta do padrão do papel — mesma razão que a folha impressa
tem — e mexer nela mudaria o documento validado em produção. A tela da cifra
solta usa `--surface` em vez de `--ground` justamente para não ficar **abaixo**
do papel: sobre o fundo tingido media 2.73:1.

Varredura completa (Chromium, computed styles, `/culto`, `/musica`, `/musicas`,
`/cultos`, claro e escuro): **zero falhas em elementos de interface**; as únicas
restantes são os acordes acima.

**Cor nunca é o único portador de informação.** "Ao vivo", tom e seção têm
rótulo em texto além da cor — e o eixo azul→verde da marca é justamente o mais
arriscado para daltonismo.

## Typography

**Uma família só**, a pilha do sistema:

```
--sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif
```

Sem fonte web, sem par de famílias. Register de produto: uma sans bem ajustada
carrega título, botão, rótulo, corpo e dado. Fonte web também seria requisição
de rede num produto que precisa funcionar com a internet da igreja caindo.

Escala **fixa em px, não fluida** — o `clamp()` é ferramenta de página de marca e
só atrapalha aqui:

| Papel | Tamanho | Peso |
|---|---|---|
| Corpo | 15px / 1.45 | 400 |
| Título de cartão | 16px, `letter-spacing:-.01em` | 700 |
| Botão | 14.5px | 600 |
| Chip, rodapé de cartão | 12.5–13px | 600 |
| Rótulo de seção | 11.5px, caixa alta, `letter-spacing:.09em` | 700 |
| Aba do celular | 11px | 600 |
| Campo de formulário | **16px** | 400 |

O campo é 16px por um motivo específico: abaixo disso o iOS dá zoom sozinho ao
focar, e o músico perde o enquadramento da tela.

**A cifra tem escala própria.** `--esc` multiplica o 12pt do emissor: `1.35` na
preparação, maior na execução, com `A−`/`A+` persistido no aparelho. 12pt é
medida de papel — na estante, a um braço de distância, não serve.

A pastilha de tom é monoespaçada (`ui-monospace, SFMono-Regular, Menlo`) porque
**tom é dado, não texto**. É a única exceção à família única, e é semântica.

## Layout

- Miolo em 920px; a tela do culto vai a 1240px porque é a única de duas colunas.
- **Uma quebra estrutural em 900px**: abaixo, barra de topo + abas fixas no
  rodapé; acima, trilho lateral de 248px. Responsividade aqui é estrutural
  (colapsar navegação), nunca tipografia fluida.
- O painel do culto vira duas colunas a partir de 1080px: setlist à esquerda,
  música atual à direita, grudada no topo e limitada à viewport — quem rola é a
  prévia.
- `--raio: 10px` nos controles, 14px nos cartões.
- **Alvo de toque de 44px onde o ponteiro é grosso.** O critério é
  `@media (pointer:coarse),(max-width:699px)`, não só largura — o uso real
  inclui tablet na estante, que é largo e mesmo assim não tem precisão de
  mouse. No mouse os alvos ficam em 30–34px, acima do mínimo de 24px da WCAG
  2.2. Na linha da setlist o piso vale para os passos `−`/`+`, a pastilha de
  tom e as ações `↑ ↓ ×`, e a folga entre os dois grupos vai junto: transpor e
  reordenar são erros diferentes e não podem ficar encostados.
- Na faixa estreita a linha da setlist é **duas faixas**: título com a largura
  inteira em cima, controles embaixo num flex `space-between`. Coluna de grade
  não servia — `minmax(0,1fr)` encolhia sob o conteúdo e o grupo do tom
  transbordava até encostar nas setas.
- `env(safe-area-inset-bottom)` nas abas — o produto vive em iPhone com notch.
- **A cifra rola na horizontal em vez de quebrar linha.** Quebrar destrói o
  alinhamento do acorde sobre a sílaba, que é o ponto da linha posicional.

### O chão da home

A home é a única tela com hero — as outras são densas e começam a trabalhar na
primeira linha. Ela é também a única com chão próprio: `body.home` troca o
preenchimento chapado por uma **diagonal de luz** no mesmo neutro. Clareia no
alto à direita, onde o olho termina o título e encontra o "Próximo culto";
assenta embaixo à esquerda, onde o trilho escuro já pesa. Amplitude de ~3% de
luminância, `background-attachment:fixed` — o chão é a sala, e o painel desliza
sobre ele.

O que ficou de fora, e por quê:

| Descartado | Motivo |
|---|---|
| Foto de congregação (o que o mockup usa) | não existe arquivo, e atrás de um painel operacional a foto disputa com a leitura dos cartões |
| Gradiente azul→lima da marca | "o gradiente **não entra na interface**" — é assinatura, e vive na marca |
| Logo ampliada como marca-d'água | acento em decoração, que a estratégia de cor proíbe |
| Textura de cifra (acordes ao fundo) | num app de cifra, acorde decorativo **se lê como dado** |
| Pentagrama | é o clichê de "música" e ainda erra o produto: esta banda lê cifra, não partitura |

As duas pontas são tokens (`--chao-luz`, `--chao-baixo`) para o tema trocá-las
sem reescrever a receita. No celular a luz desce para o topo — não há canto
direito livre — e o `fixed` sai, porque treme na rolagem do Safari de iOS. No
papel o chão é anulado: luz de tela vira mancha cinza impressa.

## Components

Vocabulário fechado, definido em `site/ui.ts`:

`.btn` / `.btn-forte` / `.btn-fantasma` / `.btn-grande` · `.chip` · `.pastilha` /
`.pastilha-forte` · `.campo` · `.painel` · `.cartao` (+ `-topo`, `-rodape`) ·
`.status[data-estado]` · `.secao-tit` · `.fila` · `.vazio` · `.aviso`

- Ícones são traços de 24×24 com `stroke=currentColor`, definidos inline em
  `ICONES`. **Sem biblioteca de ícones** — um estilo só, sem peso de rede.
- Todo estado interativo tem foco visível: `outline: 2px solid var(--acento)`
  com `outline-offset: 2px`. No trilho o anel troca para `--rail-ink`.
- **Vazio ensina, não decora.** `.vazio` diz por que não há nada e o que fazer.
- **Nada de modal por reflexo.** O único `<dialog>` do painel é "Abrir culto", e
  ele nasce `hidden` com o mesmo formulário em `<noscript>` — o painel inteiro
  funciona sem JavaScript.
- **Controle desligado é `<span>`, nunca `<a aria-disabled>`.**
  `pointer-events:none` bloqueia o mouse e não o teclado: o "Anterior" apagado
  recebia foco e recarregava a página no Enter. E o apagado usa cor, não
  `opacity:.35`, que deixava o rótulo ilegível.
- **O menu de tom abre onde não esconde tom.** Na faixa larga, à direita da
  pastilha, sobre a coluna de ações; no estreito, folha inferior com véu, com a
  linha dona rolada para o alto. Enquanto ele está aberto as outras linhas ficam
  `inert` e recuam para 45% — antes dava para clicar no `+` da música vizinha e
  transpor a errada sem perceber.
- **Atalhos de teclado acionam links que já existem.** `j`/`k` (música
  anterior/próxima), `[`/`]` (meio tom na atual), `/` (filtro), `Esc` (fechar o
  menu). Nenhum é o único caminho para nada, e a legenda mora em
  `/configuracoes` — atalho que ninguém conhece não existe, mas legenda fixa na
  tela do culto seria cromo permanente.
- **Cards não são a resposta padrão.** A setlist é lista, não grade de cartões; o
  cartão é a unidade de composição só na tela do culto. Cartão dentro de cartão
  nunca.

## Motion

Mínima e funcional. 150–250 ms, transmitindo estado — nunca decoração, nunca
sequência de entrada na carga da página. Quem abre o painel está indo trabalhar.

A única animação com peso é o **autoscroll da cifra** na execução: cinco
velocidades (~14 px/s por nível), opt-in, que para ao toque na cifra. É controle
de leitura, não efeito.

Toda animação futura respeita `prefers-reduced-motion: reduce`, sem exceção.

## O que não se mexe

- A renderização da cifra sai de `gerador-ts/html.ts::escrever`, travada byte a
  byte contra o Python em 139 fixtures. O painel põe o cromo em volta e mais
  nada.
- O CSS acrescentado aqui fica **dentro de `@media screen`**. `@page{size:A4}` e
  `page-break-before` do emissor continuam intactos.
- **A regra `p` do emissor é de papel e não vale na tela.** Ela define
  `margin:0; font-family:Arial; font-size:12pt; line-height:1.15; color:#1b1b1b`
  e, por concatenação em `CSS_PAINEL`, vazava para todo parágrafo do painel — os
  avisos saíam em Arial no meio de uma interface em fonte de sistema, com
  entrelinha 1,15. `CSS_UI` devolve família, corpo, entrelinha e cor ao herdado
  (só `margin:0` fica); `CSS_CIFRA` recupera as do emissor em `.cifra p`,
  **incluindo a Arial** — o alinhamento do acorde sobre a sílaba foi calculado
  contra essa fonte, e trocá-la desalinha a linha posicional.
- Afirmação sobre documento impresso precisa de PDF como prova, não da aparência
  na tela.
