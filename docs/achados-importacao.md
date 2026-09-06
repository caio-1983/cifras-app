# Teste do formato contra o acervo real

Amostra de 5 cifras escolhidas **de propósito** entre as mais difíceis do Drive.
Objetivo: descobrir o que o formato `.cifra` não comporta antes de converter 437.

| Arquivo | Por que foi escolhido |
|---|---|
| `RUJA O LEÃO_Am` | Tom menor · 100% posicional |
| `Um Só_Cm_TomGeral` | Tom menor · anotações inline · seções por referência |
| `Vitorioso És - Com Muito Louvor - Agnus Dei_F` | Medley de 3 músicas · modos mistos |
| `MEU MELHOR.docx` | Sem tom no nome · acordes complexos · `.docx` de 2022 |
| `SÓ TU ÉS SANTO - TOM_C.docx` | `.docx` de 2021 · rótulos em `{chave}` |

**Resultado: nenhuma das cinco converte limpo.** Abaixo, o que quebra.

---

## 1. Cifra posicional é a regra, não a exceção

O formato tratou o prefixo `~` como caso raro — uma linha em `O Grande Eu Sou`.
No acervo real:

- `Ruja o Leão` — posicional do começo ao fim, nenhuma linha em compasso
- `Um Só` — idem
- `Vitorioso És` — **versos em compasso, refrão posicional, na mesma música**

Marcar o modo dominante com um prefixo de exceção está invertido. Pior: o
relayout posicional era a parte mais frágil do núcleo, testada só com um caso —
e é ela que vai processar a maioria do acervo.

## 2. Notação de compasso usada posicionalmente

Em `Um Só`:

```
                       | Cm |         | Bb |
Ele é a ressurreição e a vida
              | F/A |          | Ab |
A ressurreição e a vida
```

Barras de compasso **e** alinhamento por coluna ao mesmo tempo. O formato trata
linha-de-compasso e linha-posicional como tipos mutuamente exclusivos. Aqui é
um híbrido — e o parser vai classificar como compasso e destruir o alinhamento.

## 3. O vocabulário fechado não sobrevive

Rótulos encontrados fora da lista de nove, **só nesta amostra**:

`[Intro teclado]` · `[Intro todos FORTE]` · `[Só piano]` · `[Solo]` ·
`[Turnaround] (Intro)` · `[Instrumental]` · `[Versos]` · `[Pontes 1 e 2]` ·
`[Pontes 3 e 4]` · `[Transição]` · `[Final]` · `Todos`

E fora de colchete: `INTRO`, `Volta na INTRO`, `Introdução:`, `{solo}`.

Cinco arquivos, cinco convenções. A regra "sinalizar para curadoria manual" faria
o importador sinalizar praticamente tudo. Precisa ser **vocabulário aberto com
normalização** (mapa de sinônimos + rótulo livre permitido), não fechado com
rejeição.

## 4. Colchete também é usado para anotação inline

Em `Um Só`, dentro da linha de cifra:

```
Eb [dois ataques]
Cm [um ataque]
[Verso 1] 1ªVEZ - Bumbo em SEMÍNIMA
```

`[` é o sinal de subtítulo no formato. Aqui aparece no meio de uma linha de
cifra e depois de um subtítulo. Anotação de execução precisa de sintaxe própria
que não colida — e ela é frequente no acervo (`Bateria`, `Saída da ponte 2x`,
`Ataque no segundo tempo`, `pausa`, `4ª vez`).

## 5. Repetição dentro e fora do colchete, no mesmo arquivo

`Um Só` tem `[Refrão] 2X` e `[Refrão 2X]`. Maiúsculo e minúsculo (`2X` / `2x`)
também convivem no acervo.

## 6. Seção só com indicação

`[Turnaround] (Intro)`, `[Versos]`, `[Refrão 2X]` aparecem sem conteúdo,
remetendo a uma seção anterior. A regra de replicar o bloco inteiro vale para os
documentos novos, mas o acervo é todo assim — o importador vai precisar
**resolver a referência** e materializar o bloco, o que exige entender a
estrutura, não só copiar linhas.

## 7. Medley: três músicas num arquivo

`Vitorioso És - Com Muito Louvor - Agnus Dei` traz três músicas em sequência, e
os títulos das duas seguintes aparecem como **texto solto em itálico**, não como
subtítulo. Decisão de modelagem pendente: uma entrada com marcador de
sub-música, ou três entradas ligadas por um encadeamento.

Complicador: o hífen separa músicas aqui, mas separa artista em
`SÓ TU ÉS SANTO – MORADA`. Mesmo separador, dois significados.

## 8. Acordes que o parser ainda não vê

De `MEU MELHOR`:

```
F#m7(5-)      meia-diminuta em notação brasileira
Gm7(11)
Ab7M          maj7 escrito como 7M
```

**`7M` e `7+` convivem no acervo para a mesma coisa.** Também aparecem `G4`,
`Dm7/A`, `G/A`.

**Diminuto tem pelo menos três grafias diferentes no acervo**, e nem todas
estão certas: `°` (símbolo de grau, sem barrinha embaixo — a grafia
correta), `º` (indicador ordinal masculino, com barrinha embaixo — errado,
mas é o que sai fácil de copiar/colar de PDF ou Word) e `o` minúsculo solto
(`D#o`, no formato antigo do item 11). O parser não liga — o sufixo do
acorde é opaco, aceita qualquer um dos três sem mudar nada no código — mas
qualquer etapa de extração de texto (`.docx`, PDF, OCR) precisa capturar o
símbolo certo, porque aqui a grafia exata **é** o produto: cifra fiel ao que
o artista tocou, não uma versão genérica. Errar `°` por `º` na importação é
o tipo de erro que passa no teste automatizado e falha na entrega.

## 9. Sintaxe de compasso mais solta que a especificada

```
|Am|G|F Dm7| Am        sem espaços, sem barra final
| C | % | % | % | % |
| Dm7 |  /  /  /  C/E |
|: C F | Am G | Em F | Am G :|
```

## 10. Detalhes menores, mas que atrapalham

- **Melisma na letra:** `estreme__ça`, `San__to`, `Coroa__mos` — sublinhados
  prolongam a sílaba e entram na contagem de coluna do relayout
- **Tom embrulhado em link:** `Tom: [Am](url-do-cifraclub)`
- **`TOM:` vs `Tom:`** e `Introdução:` como campo de cabeçalho no corpo —
  resolvido: `normalizarCabecalhoBruto` normaliza a chave pra minúsculo, e
  o rótulo `Introdução:` seguido de cifra na mesma linha (achado real,
  `ESTAMOS DE PÉ`) é resolvido por `normalizarSubtitulo`
- **Artista embutido no título** com travessão — resolvido pra arquivo
  único (medley já é arquivo separado, decisão do usuário):
  `normalizarCabecalhoBruto` separa `TÍTULO – ARTISTA` quando o traço tem
  espaço dos dois lados (achado real, `ESTAMOS DE PÉ – MARCUS SALLES`)
- **Tab (`\t`) em linha de acorde crua**, achado real (`ESTAMOS DE PÉ`):
  tab conta 1 caractere mas ocupa várias colunas visuais — sem expandir
  pra espaço antes de virar `~`, o realinhamento na hora de transpor erra a
  coluna. Resolvido: `expandirTabs`, expande até a próxima parada de 8
  (padrão de editor/terminal), não troca tab por espaço 1-por-1.

## 11. Cabeçalho sem `titulo:`/`tom:`/`---` (fora da amostra original de 5)

`RENOVA-ME`, colado à parte depois do documento inicial, não usa o formato de
cabeçalho do `.cifra` de jeito nenhum:

```
RENOVA-ME
Tom: Eb (masculino)
```

Sem `titulo:`, sem `---`, título solto na primeira linha (já em caixa alta,
que é o formato que o campo `titulo` espera — só falta a chave). O corpo
inteiro, por outro lado, **já parseia limpo hoje, sem mudar nada** —
inclusive `Aº`/`Dº` (diminuto), que não tínhamos testado antes.

`Tom: Eb (masculino)` tem um problema além de grafia: o qualificador
`(masculino)` não é parte do tom, é indicação de tessitura/faixa vocal —
convenção comum em cifra de igreja. **Decisão pendente, não técnica:**
descartar essa informação na importação, ou guardar em algum campo do
cabeçalho? Não faz sentido eu decidir isso sozinho.

## 12. Formato antigo, ainda mais distante do `.cifra` (fora de escopo por ora)

Cifra colada no estilo `GRAÇAS TE DAMOS – RENASCER PRAISE` é de uma
convenção anterior que não está mais em uso — não faz parte da importação
atual, mas fica registrado porque essas cifras existem no acervo e vão
precisar de conversão eventualmente:

```
GRAÇAS TE DAMOS – RENASCER PRAISE
TOM:A

Intro: |  A  Dm6/A  |  A  Dm6/A  |  A  Dm6/A  |  A  G13  |

       A  Bm7(13)     A9/C#     D7M         F7M     D/E
Por tudo que    és, por tudo que tens fei    -   to
```

Padrões novos, diferentes dos 10 achados originais:

- Título e artista no mesmo travessão (`–`, en dash, não hífen comum) — mais
  um caso do complicador já registrado no item 7 (mesmo separador, dois
  significados)
- `TOM:A` grudado, sem espaço
- `Intro:` com dois-pontos (não colchete) e compassos já na mesma linha
- Cifra 100% posicional, sem `~` nenhum — o de sempre, mas aqui nem título de
  seção separa: o compasso e a cifra posicional se alternam livremente
- Melisma com hífen em vez de sublinhado (`Tu--a`, `vi--------ver`) — mesma
  ideia do item 10, símbolo diferente
- Diminuto como `o` minúsculo solto (`D#o`), terceira grafia diferente (ver
  item 8)
- Extensão com alteração descrita por letra, não símbolo: `C#7(9b)`,
  `G#m4(7)` — `9b` é nona bemol por extenso, não `b9`
- Espaçamento com tabs reais em vez de espaço, pelo menos numa linha

Nenhuma ação agora — só não pode ser esquecido quando a importação em massa
começar.

---

## 13. Achados do primeiro teste contra o acervo de verdade (2026-08-23)

Com o orquestrador do importador (`src/importador.ts`) pronto, testei contra
duas cifras reais lidas direto do Drive pós-conversão pra Google Doc — não
mais os 2-3 exemplos colados manualmente antes. Achados novos, todos já
corrigidos:

- **BOM + `\r\n`**: texto exportado de Google Doc convertido vem com BOM no
  início e quebra de linha `\r\n`. Sem limpar isso, o `\r` sobra como
  caractere de verdade em cada linha (desalinha coluna de linha posicional)
  e o BOM gruda um caractere invisível no título. Corrigido no início do
  `importarCifraCrua`.
- **Espaço sobrando no fim de linha de cifra**: mesma origem (exportação de
  Doc). Sem significado, removido sempre.
- **Duas linhas em branco entre blocos**: espaçamento de parágrafo do Word
  vira duas linhas em branco na exportação, não uma. Colapsado pra uma só,
  que é o padrão dos `.cifra` curados.
- **Artista em linha própria, sem travessão** (`OUSADO AMOR` / `ISAIAS SAAD`
  / `Tom: F` — três linhas soltas): `normalizarCabecalhoBruto` só sabia
  separar título/artista quando os dois vinham na MESMA linha com travessão
  (`TÍTULO – ARTISTA`, achado item 7 original). Sem essa forma, o algoritmo
  parava de reconhecer campo de cabeçalho na primeira linha que não é
  "chave: valor" — e como a linha do artista não é, `Tom: F` nunca era
  alcançado: o tom inteiro se perdia, virando lixo no corpo. Corrigido:
  linha logo após o título que não é "chave: valor" nem já parece início de
  corpo (`[`/`{`/`~`/`|`) vira `artista`.
- **`[Fim]` como sinônimo de `[Final]`**: não estava na tabela de sinônimos
  (só `final`/`Final`). Sem o sinônimo, `[Fim]` (com cifra própria, sem
  corpo abaixo — instrumental de fechamento) não batia com
  `ROTULOS_SEM_CORPO_ABAIXO` e era tratado como seção-só-com-indicação
  vazia, disparando erro de materialização por não achar ocorrência
  anterior. Corrigido adicionando `fim` como variante de `Final`.

Duas músicas reais entraram em `musicas/` por esse caminho:
`santo-espirito.cifra` e `ousado-amor.cifra`, as duas no round-trip do
`golden.test.ts`.

A terceira música testada (`TU ÉS BOM`) não achou bug — achou um caso
diferente, que **não é corrigível em código**: o documento fonte tem uma
nota-resumo solta no topo (`INTRO A B` / `refrão` / `C`, sem colchete nem
chave — anotação do transcritor, não estrutura do formato) e a letra real
do refrão (`"Te adorarei, aleluia!..."`) nunca foi marcada com `{refrão}`
no corpo — só o trecho do verso (`"Senhor, Tu és bom..."`) aparece antes
dela, sem rótulo nenhum. O importador **recusou corretamente** materializar
o `{refrão}` de repetição mais adiante, por não achar ocorrência anterior
rotulada — é o comportamento certo (falhar alto em vez de adivinhar), não
um bug a esconder. Resolvido com curadoria humana: confirmei com o usuário
qual trecho é o verso e qual é o refrão, inseri `[Verso]`/`[Refrão]` nos
lugares certos manualmente antes de rodar o importador, e descartei a
nota-resumo do topo (não faz parte da cifra em si). `musicas/tu-es-bom.cifra`
resultante está no round-trip do `golden.test.ts` — mas, diferente das
outras duas, não é candidato a virar regra automática no importador: é
evidência de que o acervo tem cifras genuinamente incompletas, que vão
continuar precisando de revisão manual antes de importar.

---

## 14. Documento de duas colunas achatado na exportação (2026-09-06)

`COMO AGRADECER A JESUS?` (HCC 422) entrou no acervo com o corpo inteiro
errado: `INTRO`, `A` e `refrão` viraram **letra cantada** (`>INTRO`), `B`
virou linha posicional (`~B` — "B" é um acorde válido, e a detecção de
posicional não tem como saber que ali era rótulo), e as linhas de acorde
perderam o `~`, então o parser as leu como compasso. O efeito prático é o
pior possível: **o arquivo passa em tudo** — round-trip, 12 tons, o
`acervo.test.ts` inteiro — e mesmo assim os acordes saem fora da sílaba na
primeira transposição, porque o relayout só recalcula coluna de linha
marcada com `~`.

A causa está no documento de origem, e é visível no `.txt` cru:

```
   1  COMO AGRADECER A JESUS?
   2  TOM: Bb
   5  INTRO
  18  A
  37  B
  38  refrão
  91  | Bb/D  Ab/C  | G7/B  Cm |  Bb/F  F |
  96  Bb9                F/A      Fm/Ab     G7(5+)    G7
  97  Como agradecer a Jesus o que fez por mim
```

Os rótulos estão em **uma coluna** do Google Doc e o conteúdo em outra; a
exportação para texto achata as duas, e o que sobra é a lista de rótulos no
topo, separada do corpo por dezenas de linhas em branco. A distância entre
os rótulos (13, 19, 1 linha) é o espaço vertical que cada bloco ocupava na
coluna da direita — daí `B` e `refrão` virem colados: são o **mesmo bloco**,
nomeado duas vezes.

**O sintoma é mensurável e o dump inteiro pode ser varrido por ele:** uma
corrida de 8 ou mais linhas em branco consecutivas. São **19 arquivos** dos
421, e o campeão (`digno-de-gloria.txt`) tem 65 seguidas. Pelo menos dois
deles (`digno-de-gloria`, `alfa-e-omega`) já estão em `musicas/`, o que
significa que entraram com o mesmo defeito silencioso.

Não vira regra automática: nada no texto diz qual rótulo pertence a qual
bloco — a adjacência de `B`/`refrão` é inferência humana, e um dos quatro
rótulos (`B`) não tem conteúdo próprio. É **triagem** automática e curadoria
manual, como o item 13 previu para as cifras incompletas.

E é achado sobre o teste, não só sobre o dado: `acervo.test.ts` prova que o
núcleo digere o arquivo, não que o arquivo está certo. Um `.cifra` sem
nenhuma linha `~` num acervo que é majoritariamente posicional (item 1) é
suspeito por construção — vale como heurística de triagem.

---

## Conclusão

O formato foi desenhado a partir das cifras que já estavam limpas — e por isso
tratou como exceção justamente o que é maioria. Três mudanças estruturais antes
de qualquer importação em massa:

1. **Posicional vira cidadão de primeira classe**, não exceção prefixada. E o
   relayout precisa de bateria de teste à altura, porque vai rodar em quase tudo.
2. **Vocabulário aberto com normalização.** Mapa de sinônimos (`Introdução`,
   `INTRO`, `{intro}` → `[Intro]`) e rótulo livre preservado quando não houver
   equivalente.
3. **Sintaxe própria para anotação de execução**, que não colida com `[`.

E duas decisões que são suas, não do código: como modelar medley, e o que fazer
com seção que só referencia outra.

O lado bom: nada disso invalida o núcleo. Transposição por intervalo, parser de
acorde e serialização continuam de pé — o que precisa mudar é a camada de
formato em volta.
