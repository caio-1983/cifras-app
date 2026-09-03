# Port dos emissores (RTF/HTML) para TypeScript

`gerador/rtf.py` e `gerador/html.py` só existiam em Python — o site é
TypeScript. Consequência prática: `limpar_letra` (limpeza de melisma) nunca
rodava do lado TS, `cora_ção` apareceria com o sublinhado na tela. Esta
tarefa portou os dois emissores para `gerador-ts/`, com fidelidade byte a
byte contra a implementação Python de referência.

`gerador/rtf.py` e `gerador/html.py` **não foram tocados** — nem reescritos,
nem "melhorados". Continuam a implementação de referência e o gerador de
fixtures, exatamente como estavam antes (com uma correção pontual, ver
"Achado 2" abaixo).

## O contrato: fixtures antes do código

Antes de escrever qualquer TypeScript, `gerador/scripts/gerar_fixtures_emissor.py`
gerou `tests/fixtures-emissor/` a partir dos emissores Python — 139 arquivos:

- as 13 músicas de `gerador.repertorio.REPERTORIO`, cada uma no tom de
  origem, em 3 tons distantes (regra determinística: origem + 3/+6/+9
  posições no ciclo cromático de 12 tons — terça menor, trítono, sexta
  menor) e em C (pedido à parte) — em RTF e HTML;
- os 3 cultos de `CULTOS` — em RTF e HTML;
- uma música sintética **adversarial**, isolada, com `momento` + quebra de
  página forçada (par que hoje só ocorre uma vez, embutido no meio do culto
  06SET), reunindo no mesmo lugar: letra com `\ { } & < >`, linha de
  compasso com espaço múltiplo no início E no fim, melisma com 1/2/4
  sublinhados, anotação roxa, e um caractere fora do plano básico (emoji).

Inventário completo e a regra de tons em `tests/fixtures-emissor/MANIFESTO.md`.

Os dados de entrada (as 13 músicas + cultos + adversarial) também foram
gerados, não transcritos à mão: `gerador/scripts/gerar_dados_ts.py` usa
`json.dumps` sobre o `REPERTORIO`/`CULTOS` Python pra produzir
`gerador-ts/dados-repertorio.ts` caractere por caractere idêntico à fonte —
transcrever treze músicas de letra e cifra à mão seria o jeito mais fácil de
furar fidelidade antes mesmo de chegar no emissor.

## O port

- `gerador-ts/transpor.ts` — porta `passos_e_semitons`, `transpor_compasso`,
  `transpor_linha`, `limpar_letra`. Reaproveita as primitivas de nota/acorde
  do núcleo (`parseTom`, `deltaEntreTons`, `parseAcorde`, `transporNota`,
  `formatarAcorde`), já provadas equivalentes ao Python em
  `docs/reconciliacao-transpositores.md`. `transporLinha` foi a exceção
  durante o port (algoritmo autocontido) e deixou de ser quando o achado 1
  fechou — hoje reaproveita `colunaAbsoluta` como todo o resto.
- `gerador-ts/modelo.ts` — porta `validar` (sem a variável `vistos`, morta
  no próprio Python — não fazia sentido portar código sem efeito).
- `gerador-ts/rtf.ts` — porta `esc`, `par`, `escrever`, `documento`, com a
  correção do `\u` fora do BMP já aplicada (ver "Achado 2").
- `gerador-ts/html.ts` — porta `esc`, `duro`, `escrever`, `documento`,
  `slug`.

## Achado 1: `colunaAbsoluta` (núcleo) e `transpor_linha` (gerador) divergem
na colisão exata

Achado testando o port contra fixture de música real (`VITORIOSO ÉS`), não
contra os 88 casos sintéticos de `test_transpor.py` nem contra as 5 fixtures
hand-checked da Fase 0 — nenhum dos dois tinha um acorde transposto
terminando **exatamente** onde o próximo item começa. `transpor_linha`
sempre insere um espaço separador nesse caso; `colunaAbsoluta` só insere
quando há sobreposição de verdade (gap negativo), deixando colado quando o
gap é zero.

Corrigido primeiro só no port (`transporLinha` virou porte direto do
algoritmo Python, autocontido), com o núcleo intocado e a questão em aberto.

**Fechado depois, no núcleo** — `colunaAbsoluta` adotou a regra do gerador e
`transporLinha` voltou a reaproveitá-la, agora como casca fina (tokeniza,
transpõe, chama). Existe uma implementação de relayout posicional, não duas.
O motivo que decidiu: dois acordes colados formam um token que se lê como
outro acorde (`Gb/Bb` + `Cb` → `Gb/BbCb`) — ambiguidade, não estética. E a
regra não é a condição Python crua: o núcleo distingue colisão por
alargamento de adjacência da origem (o `~` é item colado no primeiro
acorde), senão corromperia todo o acervo. Detalhe, medições e provas em
`docs/reconciliacao-transpositores.md`, seção "Fechamento (03/09)".

## Achado 2: `\uN` do RTF, fora do plano básico, gerava escape inválido

Achado com a fixture adversarial (propositalmente hostil), não com nenhuma
música real — nenhuma letra em português tem caractere fora do BMP.
`gerador/rtf.py::esc` emitia um `\uN` só pra qualquer caractere não-ASCII,
mas `\uN` do RTF é inteiro de 16 bits **com sinal** (máx ±32767); um
caractere fora do BMP (`🎵` = 127925) estoura essa faixa num escape só.
Corrigido — com autorização e o cálculo do par substituto fornecidos pelo
usuário — em `gerador/rtf.py::esc` (a ÚNICA mudança feita no emissor Python
de referência nesta tarefa; ver commit/diff da função). Regenerada só
`adversarial.rtf`; as outras 137 fixtures ficaram com o mesmo md5 —
confirma que nenhuma música real tem caractere fora do BMP escondido.
Detalhe completo em `docs/achados-google-docs.md`.

## Critério de aceitação

- [x] toda fixture de `tests/fixtures-emissor/` reproduzida byte a byte
  pelo TS — `tests/emissorPort.test.ts`, 139 casos, todos passando
- [x] `test_culto_06set_bate_com_o_publicado` continua passando do lado
  Python, md5 `39df11d417747ee3443f234f3a872c47`
- [x] o TS gera esse mesmo md5 pro culto 06SET — travado explicitamente em
  `tests/emissorPort.test.ts`
- [x] typecheck limpo, suíte inteira verde dos dois lados (289 TS, 93 Python)

## O que fica pendente, deliberadamente

- `gerador/rtf.py`/`gerador/html.py` continuam a implementação de
  referência — não foram apagados.
- ~~`colunaAbsoluta` do núcleo não foi corrigida (achado 1) — item aberto.~~
  **Fechado em 03/09**, ver achado 1.
- `gerador/repertorio/` continua Python, não virou `.cifra` — fora do
  escopo (o formato ainda tem mudança estrutural pendente, ver
  `docs/achados-importacao.md`).
- Ligar o parser `.cifra` ao formato de `gerador-ts/modelo.ts` (pra emitir
  cifras importadas de verdade, não só o repertório de 13 músicas) é o
  próximo passo natural, não feito aqui.
