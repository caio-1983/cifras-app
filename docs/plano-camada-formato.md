# Plano — camada de formato (resposta aos achados de importação)

**Status: aprovado, com uma correção e as duas decisões respondidas — ver
seções marcadas abaixo.**

## Progresso da Fase 1 (importador)

- [x] Normalização de espaçamento solto ao redor de `|`/`|:`/`:|` (item 9) —
  `src/normalizacao.ts`, `normalizarEspacamentoCompasso`. Testado contra o
  exemplo do achado (`|Am|G|F Dm7| Am`) e contra idempotência em linhas já
  bem espaçadas, sem depender de arquivo real.
- [x] Mapa de sinônimos de subtítulo (item 3) — `src/sinonimosSubtitulo.ts`,
  `normalizarSubtitulo`. Cobre todas as variantes cruas citadas no achado
  (`INTRO`, `Introdução:`, `{intro}`, `{solo}`, `[Só piano]`, `[Intro
  teclado]`, `[Intro todos FORTE]`, `[Instrumental]`, `[Versos]`, `[Pontes 1
  e 2]`, `[Transição]`, `[Final]`, numeração de `Verso`/`Ponte`) e devolve
  `reconhecido: false` para rótulo sem sinônimo, preservando o texto original
  em vez de inventar. **Fora do escopo desta função, de propósito:**
  reconhecer "Volta na INTRO" como referência a `[Intro]` (isso é
  materialização de seção referenciada, decisão b) e decidir se uma
  repetição da mesma seção deveria virar `[Refrão 2]` (depende do conteúdo,
  é curadoria humana).
- [x] Normalização de cabeçalho cru sem `titulo:`/`tom:`/`---` (achado novo,
  fora dos 5 originais — `RENOVA-ME`) — `src/normalizacaoCabecalho.ts`,
  `normalizarCabecalhoBruto`. Reconhece título solto na primeira linha +
  `Tom: X (qualificador)`, separando o qualificador num campo novo
  `tessitura` (decisão do usuário: informação de faixa vocal, própria pra
  ajudar a escolher tom no dia a dia e é ponto de venda — não é parte do
  `tom`, não é recalculada, é preservada como veio). Resolve de graça o
  `TOM:`/`Tom:` do item 10 do achado, já que normaliza a chave pra
  minúsculo. Campo `tessitura` documentado em `formato-cifra.md`; não
  exigiu mudança em `cabecalho.ts` — `parseCabecalho` já aceita campo
  extra sem validação de lista fechada.
- [x] Título com travessão (`TÍTULO – ARTISTA`) — `normalizarCabecalhoBruto`
  separa quando o traço tem espaço dos dois lados (achado real,
  `ESTAMOS DE PÉ – MARCUS SALLES`); sem espaço ao redor não separa (não
  corta título com hífen de verdade, tipo `MEIA-NOITE`)
- [x] `normalizarCabecalhoBruto` agora consome todas as linhas em branco
  entre cabeçalho e corpo, não só uma (bug pego pelo achado real, que tinha
  duas)
- [x] `normalizarSubtitulo` generalizado: `rótulo:` (não só terminando em
  `:`) e `{rótulo}`/`[rótulo]` aceitam cifra depois na mesma linha,
  reformatada com espaço único (`Introdução: | A | % | ... |` →
  `[Intro] | A | % | ... |`); `estrofe_N` (separador `_`) reconhecido como
  sinônimo de `Verso N`
- [x] `expandirTabs` (`src/normalizacao.ts`) — expande tab até a próxima
  parada de 8 antes de qualquer linha virar posicional; achado real
  encontrado em `ESTAMOS DE PÉ`
- [x] Detecção de linha de acorde crua sem `~` (item 1/2) —
  `src/deteccaoPosicionalCrua.ts`. **Vocabulário de sufixo deliberadamente
  mais restrito que `acorde.ts`**: o parser real é opaco a sufixo (aceita
  qualquer texto, o que o torna robusto), mas usar essa mesma regra pra
  ADIVINHAR se uma linha é cifra teria falso positivo constante — "Ele",
  "Deus", "Estamos" também "parseiam" como acorde com sufixo lixo no
  parser permissivo. `pareceAcordeRestrito` só aceita o vocabulário de
  sufixo já visto no acervo (achados 1-12). Mitigação de ambiguidade
  residual (`Do`/`Fa` maiúsculo no início de frase batem igual a raiz +
  diminuto): decisão por LINHA inteira, não por token solto — testado
  contra as 5 linhas de acorde reais do refrão (todas aceitas) e as 5
  linhas de letra reais intercaladas (todas rejeitadas). `~` é só
  prefixado, nunca reformata a linha — testado round-trip completo pelo
  parser real (`classificarLinha`), coluna preservada.
- [x] **Orquestrador do importador** (`src/importador.ts`,
  `importarCifraCrua`) — encadeia as peças acima na ordem que faz cada uma
  funcionar certo: separa cabeçalho → expande tabs → normaliza subtítulo
  (só em linha candidata: começa com `[`/`{`, ou "rótulo: resto" *e*
  reconhecido — evita transformar letra com dois pontos em subtítulo
  falso) → materializa seção referenciada → marca linha de cifra crua sem
  `~` (por último, pra decidir "tem continuidade" já sobre a estrutura
  final, com seções materializadas). Valida o resultado com `parseMusica`
  antes de devolver — nunca produz `.cifra` que não parseia. Testado
  ponta a ponta contra o caso real completo do achado (`ESTAMOS DE PÉ`):
  cabeçalho com travessão, tabs em linha de cifra, `{estrofe_N}` → `[Verso
  N]`, `[Refrão]` repetido 3x materializando corpo idêntico, `[Verso 2]`
  repetido com cifra própria + letra copiada. `tests/importador.test.ts`.
  **Achado real adicional (2026-08-23, primeiro teste contra conteúdo de
  verdade do Drive pós-conversão — `SANTO ESPÍRITO`):** texto exportado de
  Google Doc convertido vem com BOM no início, quebra de linha `\r\n`,
  espaço sobrando no fim de linha de cifra, e duas linhas em branco entre
  blocos (espaçamento de parágrafo do Word). Os três primeiros quebrariam
  a coluna de linha posicional ou grudariam lixo no título; o quarto é só
  estético. Adicionado ao importador: limpeza de BOM/`\r\n` no começo do
  pipeline, remoção de espaço/tab no fim de cada linha, e colapso de
  linhas em branco consecutivas no fim. `musicas/santo-espirito.cifra`
  agora é um `.cifra` real gerado por esse caminho, no round-trip do
  `golden.test.ts`.
- [ ] Extração de texto de `.docx` — depende de arquivo real (achado
  2026-08-23: extrair texto direto de `.docx` cru colapsa o espaçamento
  múltiplo usado no alinhamento posicional; é preciso converter pra
  Google Doc primeiro — ver memória `referencia-drive-acervo`)
- [x] Materialização de seção referenciada (decisão b) —
  `src/materializacaoSecoes.ts`, `materializarSecoesReferenciadas`. Testado
  contra o caso real completo (`ESTAMOS DE PÉ`): `[Verso 2]` repetido (o
  marcador mantém a cifra própria — já estava lá — e só ganha a letra que
  faltava) e `[Refrão]` repetido duas vezes (marcador puro, corpo inteiro
  copiado). Regra pra achar "vazio": só rótulos que normalmente têm corpo
  abaixo (`esperaCorpoAbaixo`, nova em `sinonimosSubtitulo.ts` — exclui
  `Intro`/`Interlúdio`/`Modulação`/`Final`, que são inline por definição e
  nunca "estão vazios", mesmo sem nada depois). Copia sempre da primeira
  ocorrência **não vazia** de mesmo rótulo, nunca do marcador vazio em si;
  insere separador em branco só quando ainda não existe um. Lança erro
  citando rótulo e linha se não achar ocorrência anterior pra copiar.
- [ ] Split de medley em três entradas (decisão a) — depende de arquivo real

Baseado em `achados-importacao.md`. Antes de propor qualquer coisa, testei os 5
pontos contra o parser atual (`src/`) pra separar o que já funciona do que
realmente precisa mudar. Resultado: **3 dos 5 pontos já são resolvidos pelo
motor que existe hoje**, sem tocar em código. Só um exige mudança real no
núcleo. Isso muda o tamanho do trabalho.

## Impacto nos arquivos `.cifra` existentes

**Nenhuma mudança abaixo exige alterar os 3 `.cifra` do acervo atual nem os 5
golden-files.** Também testei `ruja-o-leao.cifra` contra o parser e o
transpositor de hoje, sem nenhuma alteração: ele já faz parse completo (51
linhas de corpo, zero erro) e já transpõe (testei para Bm) preservando
corretamente o realinhamento posicional, inclusive nas linhas com baixo
invertido (`Dm7/A` → `Em7/B`) e o `G4` alterado (`G4` → `A4`). Não vou usar
esse resultado como golden — é só verificação de que o motor atual já aguenta
o arquivo, conforme você pediu.

Se algum passo abaixo, na hora de implementar, acabar exigindo tocar num
arquivo existente, aviso antes.

---

## Diagnóstico ponto a ponto

### 1. Cifra posicional é a regra, não a exceção

**O que já funciona:** o motor (`relayout.ts`, `tipos.ts`) não tem nenhuma
suposição de que posicional é raro — `ruja-o-leao.cifra`, que é posicional do
início ao fim, passa sem alteração nenhuma no código.

**O que não funciona:** a *narrativa*. `formato-cifra.md` descreve `~` como
uma seção pequena depois das regras de compasso, e a bateria de testes tem um
caso só (`o-grande-eu-sou.cifra`, uma linha). Isso é dívida de documentação e
de cobertura, não de arquitetura.

**Repensando o prefixo `~`:** considerei três alternativas.

- Manter `~` explícito por linha (como é hoje).
- Inverter: compasso vira o marcado, posicional vira o padrão implícito.
- Um modo de seção (ex.: `[Só piano]` liga modo posicional até o próximo
  subtítulo), pra não repetir `~` em música 100% posicional.

Recomendo **manter `~` explícito por linha**, e não escolher as outras duas.
Motivo: cada linha fica autocontida — o parser decide o tipo olhando só a
própria linha, sem precisar saber "em que modo eu estou" a partir de linhas
anteriores. Isso é o que hoje torna `classificarLinha` uma função pura e
sem estado, e é exatamente a propriedade que salva o caso do item 2 (abaixo).
Um modo de seção quebraria justamente no caso que `Vitorioso És` já mostra
(compasso e posicional dentro da mesma música, alternando por seção) — teria
que decidir onde o modo liga/desliga, e errar isso silenciosamente
desalinha a cifra inteira daquele ponto em diante. O custo de digitar `~` em
toda linha não recai sobre você no domingo: é decidido uma vez, na
curadoria/importação de cada música.

**O que muda de verdade:** só documentação (reescrever a seção do
`formato-cifra.md` para apresentar `~` como tipo comum, não exceção) e a
bateria de testes, abaixo.

### 2. Notação de compasso usada posicionalmente (o híbrido)

Testei o exemplo do achado — uma linha com barras de compasso, alinhada por
coluna — prefixando com `~`:

```
~                       | Cm |         | Bb |
```

Resultado: **já parseia e já re-serializa igual**, porque `tokenizarTrecho`
trata `|` como item literal independente do tipo de linha, e `colunaAbsoluta`
não faz nenhuma suposição sobre o que é um item — só preserva a coluna
original de cada um. O tipo `posicional` já aceita barras misturadas com
acordes hoje.

**O que falta não é código, é a regra de classificação.** O parser só decide
"isto é posicional" quando a linha já chega com `~`. No acervo cru (sem
curadoria), essa linha não tem `~` — tem barras, e o parser de hoje classifica
qualquer linha começada por `|` como `cifra` (relayout de largura preservada),
que é o comportamento errado pra esse caso. Ou seja: **isso é uma decisão de
importação** ("essa linha de barras está alinhada à sílaba de baixo, marca com
`~`"), não uma lacuna do núcleo. Fica para o desenho do importador (Fase 1);
não exige mudar `tipos.ts`, `relayout.ts` ou `serializador.ts` agora.

### 3. Vocabulário de subtítulos aberto

Hoje **não existe nenhuma validação de vocabulário no código** —
`classificarLinha` aceita qualquer texto dentro de `[...]` sem checar contra
lista nenhuma. A lista fechada só existe em prosa, no `formato-cifra.md`,
como instrução para um importador que ainda não foi construído.

Ação proposta, sem mudança de núcleo:

1. Reescrever a seção "Vocabulário de subtítulos" do `formato-cifra.md`,
   trocando "sinalizar para curadoria manual" por vocabulário aberto com
   normalização.
2. Desenhar (para a Fase 1, não para agora) um mapa de sinônimos
   raw → canônico, com fallback de rótulo livre preservado quando não houver
   equivalente. Rascunho de forma, a refinar quando o importador for
   construído:

   | Entrada crua | Canônico |
   |---|---|
   | `INTRO`, `Introdução:`, `{intro}` | `[Intro]` |
   | `{solo}`, `[Só piano]`, `[Solo]` | `[Solo]` (ou rótulo próprio — a decidir se "só piano" é informação a preservar) |
   | `Volta na INTRO` | referência a `[Intro]` (ver decisão b) |
   | `[Turnaround] (Intro)`, `Todos` | sem equivalente → preservado como rótulo livre |

   Esse mapa vai crescer com o acervo real; não faz sentido fechá-lo agora
   com 5 arquivos de amostra.

### 4. Anotação de execução dentro da linha de cifra

**Este é o único dos 5 pontos que quebra de verdade hoje.** Reproduzi:

```
| Eb [dois ataques] | Gm7 |   →  ERRO: nota inválida: "[dois"
~Eb [dois ataques]    Cm      →  ERRO: nota inválida: "[dois"
```

(Uma anotação sozinha numa linha própria, tipo `Eb [dois ataques]` sem mais
nada ao redor, já não quebra — cai em `letra` porque a linha não começa com
`[`. O problema é só quando a anotação aparece *dentro* de uma linha de
compasso ou posicional, porque `tokenizarTrecho` separa por espaço em branco e
tenta interpretar `[dois` e `ataques]` como acordes.)

**Proposta:** reservar `{...}` para anotação de execução, e ensinar
`tokenizarTrecho` a reconhecer um trecho `{...}` (com espaços internos) como
um item literal único, do mesmo jeito que hoje reconhece `|`, `%`, `/`. Isso
funciona em linha de compasso e em linha posicional sem mudar `relayout.ts`
nem `serializador.ts` — um item literal já atravessa transposição e relayout
sem ser tocado.

Por que `{...}` e não `(...)`: parênteses já são usados dentro do sufixo do
acorde (`E7(#5)(#9)`, e agora também `F#m7(5-)`, `Gm7(11)` — ver item 5).
Reaproveitar parênteses para anotação criaria ambiguidade real entre "isto é
parte do acorde" e "isto é uma anotação". Chaves não são usadas em lugar
nenhum da gramática atual.

Nota de amarração com o item 3: o acervo cru também usa `{intro}`, `{solo}`
como sinônimo de subtítulo — mas isso é resolvido inteiramente na importação,
antes do texto virar `.cifra`. No formato final, `{...}` **só** significa
anotação de execução; nunca aparece como sinônimo de subtítulo depois de
curado.

Esta é a única mudança de código proposta no núcleo (`src/linhas.ts`, dentro
de `tokenizarTrecho`), e é aditiva: não muda o comportamento de nenhuma linha
que não contenha `{`.

**Correção incorporada — risco de falha silenciosa:** no acervo cru, `{...}`
também é usado como rótulo de seção (`{solo}` em `SÓ TU ÉS SANTO`,
`{estrofe_1}`, `{refrão}`, `{ponte}` em outras cifras). Depois que `{...}`
passar a significar anotação, uma linha que seja *só* `{refrão}` — sem
acorde ao lado — não bate com nenhum dos casos especiais (`[`, `~`, `|`) e
cairia em `letra` sem erro nenhum: um arquivo meio-curado passaria batido,
com o rótulo de seção virando letra da música.

Guarda obrigatória: uma linha cujo conteúdo inteiro (depois de `trim`) seja
um único bloco `{...}` lança erro, citando arquivo e número da linha, dizendo
que é provavelmente um rótulo de seção não convertido. A regra que sustenta
isso: anotação de execução legítima nunca aparece sozinha numa linha — ela
sempre acompanha um acorde. Isso exige que `classificarLinha` (e por tabela
`parseMusica`) saibam o número da linha (e, quando disponível, o nome do
arquivo) para montar a mensagem — hoje nenhuma função do parser carrega essa
informação; vai ser um parâmetro de contexto opcional, sem quebrar as
chamadas existentes que não o fornecem.

### 5. Parser de acorde: `F#m7(5-)`, `Gm7(11)`, `Ab7M`, `7M` vs `7+`

Testei os quatro contra `parseAcorde` de hoje — **todos já funcionam, sem
nenhuma mudança**:

```
F#m7(5-) → sufixo "m7(5-)"  → formata de volta "F#m7(5-)"
Gm7(11)  → sufixo "m7(11)"  → formata de volta "Gm7(11)"
Ab7M     → sufixo "7M"      → formata de volta "Ab7M"
G4, Dm7/A, G/A → todos ok
```

Motivo: o parser nunca valida o sufixo contra uma lista — captura tudo que
sobra depois da nota como string opaca. Isso é o que o torna imune a notações
que a amostra de 5 arquivos ainda não mostrou. Transposição não toca no
sufixo (só raiz e baixo), então `7M` e `7+` já transpõem corretamente hoje,
cada um preservando sua própria grafia.

**Decidido: não normalizar `7M` → `7+`.** Os dois já transpõem certo, a
grafia vem da fonte original, e normalizar perderia fidelidade ao documento
de origem sem nenhum ganho funcional — `parseAcorde` continua opaco em
relação a sufixo, sem tabela de sinônimo nenhuma.

---

## Achados extras (fora dos 5 pontos, mas testei porque apareciam na amostra)

- **Item 9, sintaxe sem espaço ao redor de `|`:** `|Am|G|F Dm7| Am` quebra
  hoje (`ERRO: nota inválida: "|Am|G|F"`), porque `tokenizarTrecho` separa por
  espaço em branco. As outras variantes soltas do achado (espaços múltiplos,
  `|:`/`:|`, vários `/`) já funcionam sem mudança. Recomendo tratar o caso sem
  espaço como normalização de espaçamento **na importação** (inserir espaço
  ao redor de cada `|` antes do parse), não relaxar o tokenizador — manter o
  parser estrito sobre espaçamento é o que garante que a coluna de cada item,
  usada no relayout, seja confiável.
- **Melisma (`estreme__ça`):** já funciona hoje sem risco nenhum — o
  sublinhado é só um caractere comum pra fins de contagem de coluna, e a
  linha de letra nunca é reprocessada pelo relayout (só a linha `~`
  correspondente é, e suas colunas já vêm fixas do arquivo). Único cuidado:
  o importador não deve normalizar/remover sublinhados antes de medir a
  coluna de um acorde na cifra crua, ou vai desalinhar.
- **Tom embrulhado em link (`Tom: [Am](url)`), `TOM:` vs `Tom:`,
  `Introdução:` como campo no corpo, artista embutido no título com
  travessão:** são limpeza de texto na curadoria (Fase 1), não afetam
  `parseCabecalho` nem `classificarLinha` do jeito que estão.
- **Repetição `2X`/`2x`, dentro e fora do colchete:** já é texto livre
  preservado hoje (o `subtitulo` guarda a linha inteira como string), sem
  risco técnico. Normalizar caixa (`2X` → `2x`) é decisão de estilo pro
  importador, não uma correção de bug.

---

## Bateria de testes de relayout proposta

Hoje `relayout.test.ts` cobre casos sintéticos bons, mas só um golden-file
real usa `~` (uma linha, em `o-grande-eu-sou.cifra`). Como posicional vai
processar a maioria do acervo, proponho ampliar em duas frentes:

**Golden/round-trip com arquivos reais** (sem inventar transposição nova):
- Adicionar `ruja-o-leao.cifra` ao loop de round-trip do `golden.test.ts`
  (transpor pro próprio tom `Am` e comparar com o original) — mesmo padrão já
  usado para `o-grande-eu-sou` e `ao-unico`, sem exigir nenhuma transposição
  conferida à mão. Cobre: tom menor, posicional 100%, baixo invertido em
  linha posicional (`Dm7/A`), melisma, subtítulo composto (`[Intro todos
  FORTE]`).
- Quando você tiver uma transposição de `ruja-o-leao` conferida à mão (em
  outro tom), aí sim vira golden-file de transposição de verdade.

**Casos sintéticos novos em `relayout.test.ts`** (unidade, sem depender de
arquivo real):
- Linha posicional com barras misturadas (o híbrido do item 2), incluindo
  transposição que muda a largura de um acorde dentro da barra.
- Linha posicional onde a transposição *encolhe* um acorde (`F#m7` → `Fm`,
  4→2 caracteres) — hoje só há teste de alargamento; encolher não deveria
  colidir, mas também não deveria acumular espaço deslocando os itens
  seguintes pra frente da coluna original.
- Duas linhas posicionais consecutivas (como em `ruja-o-leao`, refrão
  repetido com colunas diferentes) — garantir que o relayout de uma linha
  não vaza estado pra outra.
- Linha posicional com anotação `{...}` (depois do item 4 implementado) —
  garantir que o item de anotação atravessa relayout como literal, sem ser
  afetado por transposição nem por colisão de largura.

---

## Sequenciamento recomendado

1. **Doc, sem código:** reescrever `formato-cifra.md` — posicional como tipo
   comum (item 1), `~` explicitamente permitido com barras dentro (item 2),
   vocabulário aberto (item 3). Risco zero, destrava o entendimento
   compartilhado antes de mexer em código.
2. **Testes primeiro:** ampliar a bateria (round-trip de `ruja-o-leao` +
   casos sintéticos de relayout acima) — os golden-files de transposição
   atuais continuam intactos, isso só soma cobertura.
3. **Único código de núcleo:** implementar `{...}` em `tokenizarTrecho`
   (item 4), com os testes da bateria nova cobrindo o caso.
4. **Fase 1 (não agora):** mapa de sinônimos de subtítulo, normalização de
   sufixo de acorde (`7M`→`7+`), normalização de espaçamento solto (item 9),
   heurística de detecção do híbrido barras+posicional, e as duas decisões
   abaixo — todas vivem no importador, não no núcleo validado pela Fase 0.

---

## Duas decisões — respondidas

### a) Medley — DECIDIDO: três entradas ligadas, não arquivo único

Motivo dado: no acervo, sub-músicas de medley se repetem em combinações
diferentes (`Ao Único` aparece em 4 medleys; `Nada Além do Sangue` aparece
sozinho e dentro de 2). Um arquivo-medley copiaria a mesma música em cada
combinação — recriando exatamente a duplicação que o sistema existe para
eliminar. O título do conjunto não precisa de lugar no formato: medley é um
culto pequeno, e `cultos/*.yml` já modela sequência de música + tom.

Consequência para o formato: **nenhuma sintaxe nova**. Cada sub-música do
medley vira um `.cifra` normal, um tom só. Documentado em
`formato-cifra.md`, seção "Medley e seções compartilhadas entre músicas".

### b) Seção só com indicação — DECIDIDO: materializar na importação

Motivo dado: é a mesma regra que já vale nos documentos do usuário ("nada de
seção só com a indicação"), e no palco indireção é modo de falha — resolver
uma referência em tempo de exibição é um jeito a mais de o sistema falhar
bem na hora que não pode falhar.

Mitigação definida para o risco de duplicação (divergência entre cópias do
mesmo refrão materializado em pontos diferentes do arquivo): **o importador
precisa garantir que as cópias saiam idênticas entre si**, byte a byte, para
que qualquer edição futura que quebre essa igualdade apareça no diff do git
— ou seja, divergência vira um evento visível (um diff estranho), não uma
falha silenciosa. Isso é responsabilidade do importador (Fase 1); o núcleo
não precisa de nenhuma checagem de igualdade entre seções, porque o `.cifra`
gravado nunca tem uma seção vazia — ver `formato-cifra.md`.

---

## Resumo do que muda de fato

| Onde | O que |
|---|---|
| `docs/formato-cifra.md` | Reescrito: posicional como tipo comum, `~` aceita barras dentro, vocabulário aberto, anotação `{...}`, medley sem sintaxe nova |
| `src/linhas.ts` | `tokenizarTrecho` reconhece `{...}` como item literal único; `classificarLinha` ganha guarda para linha que é só `{...}` (erro citando arquivo:linha) e um parâmetro de contexto opcional (`numeroLinha`, `nomeArquivo`) pra montar essa mensagem |
| `src/index.ts` | `parseMusica` passa a calcular o número de linha de cada linha do corpo e aceita um `nomeArquivo` opcional, repassado ao `classificarLinha` |
| `tests/acorde.test.ts` | Regressão dos casos do achado que já passavam sem mudança: `F#m7(5-)`, `Gm7(11)`, `Ab7M` |
| `tests/linhas.test.ts` | Anotação `{...}` dentro de cifra/posicional; guarda de linha só-com-chaves (com e sem contexto) |
| `tests/relayout.test.ts` | Casos novos: híbrido barras+posicional, encolhimento, linhas consecutivas, item de anotação atravessando relayout |
| `tests/golden.test.ts` | `ruja-o-leao.cifra` entra no round-trip (não na lista de golden de transposição) |
| Importador (Fase 1, não agora) | Mapa de sinônimos de subtítulo, normalização de espaçamento solto (item 9), heurística do híbrido barras+posicional, materialização de seção referenciada (decisão b), três arquivos por medley (decisão a). **Sem** normalização de sufixo `7M`/`7+` — decidido manter as duas grafias. |

Nada disso invalida o núcleo — confirma a conclusão do próprio
`achados-importacao.md`. A superfície real de mudança na Fase 0 é pequena: o
tokenizador ganha um caso novo mais uma guarda, e a bateria de testes fica à
altura do que o motor já faz.
