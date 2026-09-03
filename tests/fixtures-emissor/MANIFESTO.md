# Fixtures do emissor — contrato do port TS

Geradas por `gerador/scripts/gerar_fixtures_emissor.py` a partir de
`gerador/rtf.py`/`gerador/html.py` (implementação de referência, validada
em produção). Regenerar só quando o comportamento do emissor Python mudar
de propósito — o contrato do port TS depende destes arquivos ficarem
parados.

## Tons distantes: regra determinística

Para cada música, os 3 "tons distantes" são origem + 3, +6 e +9 posições
no ciclo cromático de 12 tons ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'].
(terça menor, trítono, sexta menor). Escolha mecânica, não musical —
garante variedade de armadura (sustenido/bemol) sem juízo de valor. Além
desses três, todas também saem em `C` (pedido à parte) — nas
duas músicas que já nascem em C, o arquivo `_C` é idêntico ao de origem
(caso "mesmo tom não muda nada", documentado, não é falha de geração).

## Inventário

| slug | tom origem | tons distantes | + |
|---|---|---|---|
| `a-maior-honra` | Ab | B, D, F | C |
| `ah-jesus` | G | Bb, Db, E | C |
| `alem-do-impossivel` | C | Eb, Gb, A | C |
| `emaus` | B | D, F, Ab | C |
| `eu-me-rendo` | B | D, F, Ab | C |
| `eu-vou-construir` | C | Eb, Gb, A | C |
| `exaltamos-yahweh` | E | G, Bb, Db | C |
| `nao-ha-um-nome-igual` | F | Ab, B, D | C |
| `pai-de-multidoes` | B | D, F, Ab | C |
| `quebrantado` | G | Bb, Db, E | C |
| `teu-toque` | Bb | Db, E, G | C |
| `tua-forte-mao` | F | Ab, B, D | C |
| `vitorioso-es` | G | Bb, Db, E | C |

13 músicas × (1 origem + 3 distantes + 1 extra) × 2 formatos (RTF/HTML) = 130 arquivos de música, mais 3 cultos × 2 formatos = 6 arquivos de culto, mais 2 (RTF+HTML) da música adversarial.

## Cultos

| nome | músicas (na ordem, com o tom tocado) |
|---|---|
| `06SET` | VITORIOSO ÉS (G), EU VOU CONSTRUIR (C), TEU TOQUE (Bb), QUEBRANTADO (C), A MAIOR HONRA (Ab) |
| `28AGO_Sexta` | ALÉM DO IMPOSSÍVEL (C), EU ME RENDO (G), PAI DE MULTIDÕES (B) |
| `30AGO_Noite` | EXALTAMOS YAHWEH (F), EMAÚS (B), NÃO HÁ UM NOME IGUAL (F), TUA FORTE MÃO (Ab) |

## Música adversarial (`adversarial.rtf`/`.html`)

Sintética, não é repertório real. Isolada num documento de uma música só,
com `momento` (Ofertório) + quebra de página forçada — hoje esse par só
ocorre uma vez, embutido no meio dos cinco arquivos do culto 06SET; aqui
fica testável sem depender do resto do culto. Cobre no mesmo lugar:

- letra com `\ { } & < >` (escape de RTF e de HTML ao mesmo tempo)
- linha de compasso com espaço múltiplo no início E no fim
- melisma com 1, 2 e 4 sublinhados (`cora_ção`, `San__to`, `x____y`)
- anotação de execução (roxo)
- `ü` (acento incomum no acervo) e um caractere fora do plano básico
  (força o ramo `n - 65536` do `\u` do RTF — nenhuma letra em português
  chega lá, mas o código tem esse ramo e precisa ser exercitado)
