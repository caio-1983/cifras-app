# Reconciliação dos dois transpositores (gerador × núcleo da Fase 0)

`gerador/` chegou pronto, validado em produção (cultos de 23/08, 28/08,
30/08 e 06/09/2026), escrito em paralelo à Fase 0. Cada um tinha seu próprio
transpositor. Este documento fecha a reconciliação entre os dois.

## As duas metades

1. **Python contra as fixtures da Fase 0** — já feita antes desta tarefa,
   em `gerador/tests/test_cruzado_fase0.py`: roda `gerador/transpor.py`
   contra as 5 fixtures conferidas à mão de `tests/esperado/` e reproduz as
   cinco byte a byte, incluindo linha posicional (`~`).
2. **Núcleo TS contra os testes do gerador** — feita aqui, em
   `tests/cruzadoGerador.test.ts`: os 88 casos de
   `gerador/tests/test_transpor.py` (grafia enarmônica, notação brasileira,
   baixo invertido, estrutura, compasso, posicional, identidade, ida-e-volta,
   erro de tom), copiados como pares entrada/esperado literais e rodados
   contra `transporMusicaTexto` — a função pública real do núcleo, exercendo
   a cadeia inteira (cabeçalho → classificação de linha → tokenização →
   parse de acorde → transposição → formatação → relayout → serialização).

## Resultado

**100% de acordo contra os dois conjuntos de teste — com uma ressalva
descoberta depois, fora dos dois conjuntos, ver "Correção" abaixo.**

Os dois algoritmos — escritos por processos diferentes, em linguagens
diferentes — convergiram sozinhos na mesma grafia enarmônica, no mesmo
tratamento de sufixo brasileiro, no mesmo cálculo de baixo invertido, e nos
mesmos dois algoritmos de relayout (substituição no lugar para compasso,
reancoragem por coluna para posicional). Isso inclui o caso mais sensível da
varredura de `test_nao_produz_grafia_absurda` (12 tons × 6 acordes, checando
ausência de acidente duplo) e o precedente documentado do próprio `gerador`
(`F7M` de C para Gb → `Cb7M`, correto porque a escala de Gb maior contém
`Cb` de verdade).

Não houve, portanto, nenhum caso para decidir "núcleo ou teste está errado"
— não havia divergência a arbitrar.

## Correção (03/09): a conclusão acima estava incompleta

O port dos emissores (`gerador-ts/`, mesma tarefa que trouxe a fixture
adversarial e o bug do `\u` fora do BMP) achou uma divergência real entre
`colunaAbsoluta` (núcleo, usada por toda linha posicional `~` do parser
`.cifra`) e `transpor_linha` (gerador) — **num caso que nenhum dos dois
conjuntos de teste usados na reconciliação cobria.**

O caso: quando um acorde transposto termina **exatamente** na coluna onde o
próximo item começa (nem sobra, nem falta espaço — colisão "em cima da
hora", não uma sobreposição de verdade). Exemplo real, `VITORIOSO ÉS`
(E → Db), linha `| A | F#m |`:

| | resultado |
|---|---|
| núcleo (`colunaAbsoluta`) | `\| Gb\| Ebm \|` — sem espaço antes do 2º `\|` |
| gerador (`transpor_linha`) | `\| Gb \| Ebm \|` — com espaço |

A condição Python é `if len(out) < col: preenche / elif out: um espaço` — o
`elif` cobre IGUAL **e** MAIOR que a coluna, não só sobreposição de verdade.
`colunaAbsoluta` só insere espaço quando o gap é negativo (sobreposição real);
gap zero fica colado. Nenhum dos 88 casos de `test_transpor.py` tem um
acorde emendando exatamente no fim do anterior, e nenhuma das 5 fixtures
hand-checked da Fase 0 (`tests/esperado/`) tem esse padrão de espaçamento
original — por isso passou batido nas duas metades da reconciliação.

**Corrigido primeiro só no port do emissor** —
`gerador-ts/transpor.ts::transporLinha` virou um porte direto e autocontido
do algoritmo Python. `src/relayout.ts::colunaAbsoluta` ficou como estava, e
o item foi registrado como pendente. **Fechado em 03/09** — ver a seção
seguinte.

## Fechamento (03/09): `colunaAbsoluta` adota a regra, e vira implementação única

### Por que o espaço, e não a colisão

O argumento original era legibilidade: `Gb |` lê melhor que `Gb|`. Isso é
opinião. Medindo os dois algoritmos sobre as 177 linhas posicionais do
repertório × 12 tons (2124 comparações, 19 divergentes — 16 em
`VITORIOSO ÉS`, 3 em `NÃO HÁ UM NOME IGUAL`), apareceu o argumento que não
é opinião:

```
NÃO HÁ UM NOME IGUAL, F -> Gb
  orig: " F/A    Bb      F/A  Bb  C     Bb  F/A  Dm"
  núcl: " Gb/Bb  Cb      Gb/BbCb  Db    Cb  Gb/BbEbm"
  ger : " Gb/Bb  Cb      Gb/Bb Cb Db    Cb  Gb/Bb Ebm"
```

`Gb/BbCb` **não é um acorde feio — é um acorde diferente.** Dois acordes
colados formam um token que se lê como outra coisa; o mesmo vale para
`F#/A#G#m`. A escolha não é entre bonito e feio, é entre correto e ambíguo.
É este o motivo que sustenta a decisão, e é ele que sobrevive a alguém
questioná-la depois. O caso do `VITORIOSO ÉS` (`Gb|`, acorde contra barra de
compasso) é o benigno — não gera ambiguidade, e sozinho não teria decidido
nada.

### O que quase deu errado: gap zero tem duas causas, não uma

Portar a condição Python crua para `colunaAbsoluta` **teria corrompido o
acervo inteiro.** Os dois domínios não são o mesmo:

- O Python tokeniza com `\S+` sobre texto cru. Dois itens adjacentes são
  impossíveis (seriam um token só), então `gap == 0` **só pode** ser colisão
  por alargamento.
- O núcleo trabalha sobre itens já separados pelo parser — e o marcador `~`
  é um item, na coluna 0, colado no primeiro acorde:
  `~Am ... ` → `[[0,"~"], [1,"Am"], ...]`, gap zero em todo tom.

Medido em `musicas/*.cifra` (240 linhas posicionais × 12 tons), separando as
duas causas:

| causa de `gap <= 0` | ocorrências |
|---|---|
| adjacência **original** (o fonte já tinha colado: `~Am`) | **48** |
| colisão por **alargamento** (o fonte tinha folga, o acorde comeu) | **0** |
| sobreposição real (`gap < 0`) | 0 |

Os 48 são fidelidade à grafia de origem. A regra crua inseriria espaço
depois de todo `~`, deslocando uma coluna cada acorde de cada linha
posicional de `o-grande-eu-sou` e `ruja-o-leao` — e derrubando as fixtures
conferidas à mão de `tests/esperado/`. Confirmado por mutação: sem a
distinção, 15 testes quebram, incluindo os golden files.

### A regra

```
gapOriginal = coluna − (fim original do item anterior)

colisão  ⟺  não é o primeiro item  ∧  gapOriginal > 0  ∧  gap <= 0
colisão            → 1 espaço
caso contrário     → max(0, gap)     // adjacência da origem é preservada,
                                     // inclusive quando o alargamento a
                                     // comprime (gap < 0): não existe
                                     // inserir espaço negativo
```

No domínio do gerador `gapOriginal >= 1` sempre, então a regra colapsa
exatamente no `if len(out) < col: preenche / elif out: um espaço` do Python
— inclusive no primeiro item (`out == ''` ⇒ preenche a indentação, nunca
prefixa espaço). **Equivalência preservada onde o Python roda; correção só
onde ele nunca rodou.** É isso que permitiu a unificação.

### Adjacência legítima existe fora do `~`

A pergunta natural é se o `gapOriginal` não seria dispensável tirando o `~`
da lista de itens antes do relayout (como `test_cruzado_fase0.py` faz:
`'~' + transpor_linha(linha[1:], ...)`). Não seria — o `~` é só o caso mais
frequente, não a única fonte:

```
"~{dois ataques}Am        G"  →  [[0,"~"], [1,"{dois ataques}"], [15,"Am"], [25,"G"]]
```

O tokenizador do núcleo (`\{[^{}]*\}|\S+`) separa anotação de acorde mesmo
sem espaço entre eles, produzindo adjacência de origem sem nenhum `~`
envolvido. `gapOriginal` é a solução geral e fica, independentemente do
marcador.

### Deduplicação

`gerador-ts/transpor.ts::transporLinha` deixou de ser um algoritmo
autocontido e virou uma casca fina: tokeniza com `\S+`, transpõe cada token,
e chama `colunaAbsoluta`. **Existe uma implementação de relayout posicional,
não duas.** A divergência não foi "resolvida nos dois lados" — deixou de
poder existir.

### Provas

| teste | o que trava |
|---|---|
| `tests/relayout.test.ts` | as duas causas de `gap <= 0`, lado a lado, incluindo o ramo `gapOriginal == 0 && gap < 0` |
| `tests/cruzadoGerador.test.ts` | núcleo e gerador dando a MESMA saída na colisão exata; o caso `Gb/Bb`+`Cb`; o `~` sem espaço |
| `tests/relayoutRepertorio.test.ts` | as 13 músicas × 12 tons (nenhum token fundido), `VITORIOSO ÉS` com saída literal, `PAI DE MULTIDÕES` (nenhum acorde recua da sílaba), e o acervo `.cifra` × 12 tons |
| `tests/emissorPort.test.ts` | as 139 fixtures geradas pelo Python continuam byte a byte |
| `tests/golden.test.ts` | as fixtures conferidas à mão da Fase 0 |

Mutação nas duas direções conferida: voltar a regra antiga (`gap < 0`)
quebra o repertório e as fixtures do emissor; tirar a guarda `gapOriginal`
quebra os golden files do acervo.

### Consequência: o papel do Python mudou

`transpor_linha` não precisa de `gapOriginal` — no domínio dele (`\S+` sobre
texto cru) a regra é equivalente, e isso está provado. Mas a equivalência
vale **só enquanto o domínio for esse**. O Python passou a ser a
implementação mais estreita das duas, e a fronteira é a anotação inline
dentro de linha posicional:

```
{dobra}Am        G

  Python (\S+)                  →  {dobra}Am        A
  núcleo (\{[^{}]*\}|\S+)       →  {dobra}Bm        A
```

`\S+` engole `{dobra}Am` num token só, `NOTA_RE` não casa, e o acorde
**atravessa sem ser transposto** — ao lado de um `G` que foi. Não é
diferença de espaçamento: é acorde errado. (Com anotação de mais de uma
palavra o `\S+` quebra no espaço interno e o resultado é o mesmo.) O núcleo
trata certo porque o tokenizador dele separa anotação de acorde.

Hoje isso não dá sintoma: nenhuma das 13 músicas tem anotação inline em
`pos()`. Mas **as fixtures são geradas pelo Python**, então no dia em que
uma ganhar, a fixture registraria o comportamento pior como contrato — e o
port TS "falharia" por estar certo.

A conclusão prática é que `gerador/rtf.py` e `gerador/html.py` deixaram de
ser *referência* e passaram a ser **âncora histórica**: o que prova que a
saída de hoje é a mesma que a banda tocou. Quando o site estiver no ar, as
fixtures devem passar a ser geradas do TS, com o md5 do culto 06SET
(`39df11d417747ee3443f234f3a872c47`) como o elo que prova que a troca de
gerador não mexeu em nada. Enquanto essa troca não acontece, não adicionar
anotação inline em linha `pos()` do `repertorio/`.

## O único ponto que exigiu decisão antes disso: melisma

`gerador/transpor.py` tem uma quinta função, `limpar_letra`, que remove o
sublinhado de melisma (`cora_ção` → `coração`). Ela não tem equivalente no
núcleo. Antes de decidir se isso era uma lacuna a preencher, conferi onde
`limpar_letra` é chamada em `gerador/rtf.py` e `gerador/html.py`:

```python
elif tipo == 'let':
    out.append(par(esc(limpar_letra(txt))))
```

**Só ali — na hora de emitir uma linha de letra.** Nunca é chamada de
`transpor_compasso` nem `transpor_linha`. Ou seja: no próprio `gerador`,
limpeza de melisma **não é parte da transposição** — é uma etapa de
formatação de saída, irmã do escape de RTF/HTML, não do cálculo de
intervalo.

**Veredito: não é uma lacuna do núcleo de transposição.** O núcleo hoje
preserva o sublinhado tal como veio em qualquer linha de letra (decisão já
documentada em `docs/achados-importacao.md`, item "Melisma": o `_` é só um
caractere comum para fins de contagem de coluna). Quando o núcleo tiver um
emissor (RTF/HTML/HTTP) alimentado pelo parser `.cifra`, ele vai precisar de
um passo equivalente a `limpar_letra` na hora de imprimir — mas isso
pertence à camada de emissão que ainda não existe, não à transposição.
`tests/cruzadoGerador.test.ts` documenta o comportamento atual do núcleo
(preserva o `_`) em vez de portar uma função que não tem onde encaixar hoje.

## Decisão: `gerador/transpor.py` fica

Confirmado com o usuário antes de começar: **`gerador/transpor.py` não foi
apagado.** `rtf.py`, `html.py` e `modelo.py` importam direto de lá
(`passos_e_semitons`, `transpor_compasso`, `transpor_linha`, `limpar_letra`,
`NOTA_RE`) — e são código Python de produção, enquanto o núcleo é
TypeScript/Node. Não existe (e esta tarefa não construiu) uma ponte de
execução entre as duas linguagens — isso exigiria subprocess ou API, fora do
escopo declarado ("não construa API nem servidor").

Como os dois algoritmos estão **provados equivalentes contra os testes que
existiam** (e, desde o fechamento de 03/09, o relayout posicional é uma
implementação só — `colunaAbsoluta`),
"unificar" deixou de significar "escolher um arquivo" e passou a significar
"confirmar que é o mesmo algoritmo, expresso em duas linguagens porque os
emissores de produção precisam de Python". Nenhuma correção foi necessária
em `gerador/transpor.py`; o núcleo TS (`src/relayout.ts`) também não foi
alterado — a única correção ficou isolada no port do emissor
(`gerador-ts/transpor.ts`), como explicado acima.

Se um dia os emissores migrarem pra rodar sobre o parser `.cifra` (ver
"Depois disso" em `PROXIMO-PASSO.md` — ligar o parser ao `modelo.py`), essa
migração pode se apoiar no núcleo TS pra quase tudo — a colisão exata em
`colunaAbsoluta` já está resolvida, então não há mais diferença de
espaçamento em linha posicional a herdar.

## Placar

Reconciliação do transpositor (`tests/cruzadoGerador.test.ts`, 14 blocos —
13 originais + 1 do achado da colisão exata, ver "Correção (03/09)" acima):

| Suíte | Antes | Depois |
|---|---|---|
| `npm test` (núcleo TS) | 136 | 150 |
| `pytest gerador/tests` (gerador) | 93 | 93 (inalterado) |

Fechamento da colisão (03/09):

| Suíte | Antes | Depois |
|---|---|---|
| `npm test` | 289 | **300** (+11: 6 em `relayout`, 1 em `cruzadoGerador`, 4 em `relayoutRepertorio`) |
| `pytest gerador/tests` | 93 | **93** (Python não foi tocado) |

Port do emissor (`gerador-ts/`, `tests/emissorPort.test.ts`,
`tests/fixtures-emissor/`) — ver `docs/port-emissor.md`:

| Suíte | Antes do port | Depois do port |
|---|---|---|
| `npm test` (núcleo + reconciliação + port) | 150 | **289** (+139, fixture a fixture) |
| `pytest gerador/tests` (gerador, inalterado) | 93 | **93** |
| `test_culto_06set_bate_com_o_publicado` (md5, Python) | passa | **passa** — `39df11d417747ee3443f234f3a872c47` |
| md5 do 06SET pelo port TS | — | **passa** — mesmo hash, travado em `tests/emissorPort.test.ts` |

`npx tsc --noEmit` limpo em todos os pontos de checagem.
