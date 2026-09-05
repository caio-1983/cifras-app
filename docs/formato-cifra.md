# Formato `.cifra`

Cada arquivo é uma música, guardada **no tom original**. O tom de exibição é
escolhido na hora de renderizar.

## Estrutura

```
titulo: O GRANDE EU SOU
artista: Nazareno
tom: C
momento: adoracao
---
[Intro] | C | Dm G/B | C | Dm G/B |

[Verso 1]
| C | Dm G/B | C | Dm G/B |
Quero viver perto de Ti, Sei que és real e vives em mim
```

Cabeçalho em YAML, `---`, corpo.

| Campo | Obrigatório | Observação |
|---|---|---|
| `titulo` | sim | Caixa alta, como aparece impresso |
| `artista` | não | Intérprete de referência |
| `tom` | sim | Tom em que o corpo está escrito |
| `momento` | não | `adoracao`, `celebracao`, `ceia`, `oferta`, `natal` |
| `tessitura` | não | Faixa vocal a que o tom armazenado serve melhor (`masculino`, `feminino`) — informação editorial do arranjo original, não recalculada. Nunca dentro do valor de `tom`: um campo próprio, porque `tom` só guarda a nota. |

## Tipos de linha no corpo

| Tipo | Como reconhecer | Exemplo |
|---|---|---|
| Subtítulo | Começa com `[` | `[Refrão] 2x` |
| Subtítulo + cifra | `[...]` seguido de compassos na mesma linha | `[Intro] \| C \| Dm G/B \|` |
| Cifra | Começa com `\|` ou `\|:` | `\| Am \| F \| C \| G \|` |
| Cifra posicional | Começa com `~` | `~Am        Em7       F7+` |
| Letra | Começa com `>` | `>Ele é o Grande Eu Sou` |
| Separador | Linha vazia | separa blocos |

No acervo real, a maioria das músicas é posicional do início ao fim — algumas
misturam compasso e posicional na mesma música, alternando por seção. Cifra
posicional não é um caso raro: é só mais um tipo de linha, tão comum quanto
compasso.

Uma linha entre chaves sozinha (`{refrão}`, `{solo}`) nunca é válida — é
sinal de um rótulo de seção que ainda não foi convertido para `[...]`. O
parser recusa esse caso em vez de deixá-lo virar letra da música por engano
(ver "Anotação de execução" abaixo).

Linha sem nenhum desses marcadores é **erro**, não letra. Antes a letra era o
"qualquer outra coisa" da classificação, e por isso um rótulo de seção não
convertido ou uma nota solta do transcritor viravam texto cantado em silêncio.

Continuação de cifra (segunda linha de uma intro longa) é uma linha de cifra
comum, indentada.

## Letra marcada com `>` — arranjo e letra separados

Toda linha cantada começa com `>`, na coluna 0, como `~` e `|`:

```
~Am        Em7       F7+
>Ele é o Grande Eu Sou
```

Dois motivos:

1. **Separar arranjo de letra.** O arranjo é o arquivo sem as linhas `>`; a
   letra é só elas. Extrair vira um filtro (`src/arranjoLetra.ts`), sem
   remontar nada — e o arquivo continua um só, com as duas coisas
   intercaladas, que é o que preserva o acorde sobre a sílaba e a ordem das
   partes. Guardar em dois blocos separados perderia a intercalação: uma
   seção com 3 linhas de cifra e 5 de letra não se remonta por contagem.
   Isso permite compartilhar arranjo — que é fato musical — sem redistribuir
   obra de terceiro (ver `rumo.md`).
2. **A coluna passa a bater na tela.** Sem o prefixo, `~Am` põe o `A` na
   coluna 1 e a letra começa na 0: o acorde soa sobre a sílaba certa (o
   parser desconta o `~`), mas aparece um caractere à direita para quem
   confere à mão. Com os dois prefixos, o que se lê é o que soa.

O `>` é sintaxe, não conteúdo: o modelo guarda a letra limpa e o serializador
repõe o prefixo.

## Compassos

- Delimitados por `|`: `| Am | F | C | G |` são quatro compassos
- Acordes no mesmo compasso separados por espaço: `| G Am Em7 | F |`
- `%` repete o compasso anterior
- `|:` e `:|` delimitam repetição
- `/` marca tempo sem troca de acorde: `| Ab / / Eb/G |`

## Cifra posicional (`~`)

Para acordes posicionados sobre a sílaba, sem divisão de compasso:

```
~Am        Em7       F7+
Ele é o Grande Eu Sou
```

A coluna de cada acorde é significativa. Ao transpor, o nome muda de largura
(`Em7` → `F#m7`) e o espaçamento **precisa ser recalculado** para manter cada
acorde sobre a mesma sílaba da linha seguinte.

Regra de conversão para compassos: converter `~` em `| |` só quando a progressão
já aparece em compasso definido em outro ponto da mesma música. Caso contrário,
manter posicional — nunca inventar a divisão.

`~` também pode prefixar uma linha que contém barras de compasso, quando a
posição delas é alinhada à sílaba da letra abaixo, e não uma divisão de
compasso de verdade:

```
~                       | Cm |         | Bb |
Ele é a ressurreição e a vida
```

O parser trata as barras como itens literais de qualquer forma — a diferença
entre este caso e uma linha de compasso comum é só o `~`, que troca o modo de
realinhamento na hora de transpor (coluna absoluta, preservando a sílaba) em
vez de largura preservada (que faz a barra deslizar).

## Vocabulário de subtítulos

**Aberto, com normalização.** O acervo real usa dezenas de variantes para os
mesmos rótulos (`INTRO`, `Introdução:`, `{intro}`, `[Intro teclado]`) e
convenções que não se repetem de arquivo para arquivo. Fechar a lista e
rejeitar o que não bate faria o importador sinalizar quase tudo para
curadoria manual — o que inverteria o objetivo.

A regra é: normalizar pelo que reconhecer, preservar o resto como rótulo
livre.

**Núcleo com letra:** `[Verso 1]`, `[Verso 2]`… · `[Pré-refrão]` · `[Refrão]` ·
`[Ponte]` · `[Rampa]` · `[Tag]`

`[Refrão]` e `[Ponte]` recebem número (`[Ponte 2]`) apenas quando a música tem
versões **diferentes** entre si. Repetição da mesma seção não vira `[Refrão 2]`:
repete `[Refrão]` e a quantidade vai ao lado (`[Refrão] 2x`).

**Instrumentais** (cifra na mesma linha do subtítulo, nunca têm corpo
abaixo — nem quando vazios, isso não é seção-referência): `[Intro]` ·
`[Interlúdio]` · `[Modulação]` · `[Final]`

Variantes reconhecidas normalizam para o rótulo do núcleo acima (mapa de
sinônimos mantido pelo importador, não pelo parser — o parser aceita
qualquer texto dentro de `[...]`). Rótulo sem equivalente conhecido
(`[Turnaround] (Intro)`, `Todos`) é preservado como texto livre, nunca
rejeitado.

Seção que só remete a uma anterior sem repetir o conteúdo (`[Refrão 2x]`
sozinho, sem cifra nem letra abaixo) não é um tipo de linha válido no
formato final — o importador materializa o bloco (copia o conteúdo da seção
referenciada) antes de gravar o `.cifra`. O arquivo gravado nunca tem uma
seção vazia.

## Anotação de execução

Instrução de regência dentro de uma linha de cifra ou posicional (`Eb
{dois ataques}`, `Cm {um ataque}`, `{pausa}`) usa **chaves**, nunca
colchetes — `[...]` já é o delimitador de subtítulo. O parser trata um
trecho `{...}` como um item literal único (não transposto, não interpretado
como acorde), mesmo que tenha espaços internos.

```
~Eb                  {dois ataques}
Adoramos o Teu nome
```

Chaves não aparecem em nenhum outro lugar da gramática, então não colidem
com parênteses (que já fazem parte do sufixo do acorde, `E7(#5)(#9)`) nem
com colchetes.

**Uma linha que seja só `{...}`, sem acorde nenhum ao lado, é erro, não
letra.** Anotação de execução sempre acompanha um acorde na mesma linha; se
aparecer sozinha, é sinal de um rótulo de seção do documento original
(`{refrão}`, `{solo}`, `{estrofe_1}`) que não foi convertido para `[...]`
na curadoria. O parser recusa esse caso — deixar passar como letra faria um
arquivo mal curado ser aceito sem aviso nenhum.

## Notação de acordes

Notação brasileira. O parser precisa aceitar:

| Elemento | Exemplos |
|---|---|
| Tríades | `C`, `Am`, `F#m` |
| Sétimas | `G7`, `Bbm7`, `F7+` (maj7), `C#m7` |
| Suspensos | `Asus4`, `Eb4`, `Bsus4` |
| Com nona | `G9`, `F9`, `Ab9`, `Eb9` |
| Sexta | `Eb6` |
| Baixo invertido | `A/C#`, `G/B`, `Ab/Eb` — transpõe os dois lados |
| Alterações e extensões | `E7(#5)(#9)`, `F#m7(5-)`, `Gm7(11)` |
| Maj7 alternativo | `Ab7M` — equivalente a `7+`; o parser aceita as duas grafias e não as normaliza entre si (o sufixo nunca é transposto, e a grafia de origem é preservada) |

## Medley e seções compartilhadas entre músicas

Não existe sintaxe própria para medley nem para "seção que remete a outra
música" — cada `.cifra` continua sendo uma música, um tom. Um medley (três
músicas tocadas em sequência) vira três arquivos `.cifra` normais; a
sequência de execução é responsabilidade do culto (`cultos/*.yml`), não do
formato da música. Isso evita duplicar uma música que aparece em mais de
uma combinação de medley.

## Renderização

Cores e tipografia do padrão impresso estão em `padrao-visual.md`:
Arial, letra 12pt preto `#1b1b1b`, cifra 12pt negrito laranja `#ff6600`,
subtítulo 12pt negrito azul `#0000ff`, título e artista 15pt negrito.
Na montagem de culto, **cada música começa em página nova**.
