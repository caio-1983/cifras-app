# Publicar no Google Docs: o que funciona e o que não

Tudo aqui foi testado contra o Drive real e verificado no **PDF exportado pelo
próprio Google** — não na aparência do documento na tela. Essa distinção não é
detalhe: três versões foram entregues quebradas porque pareciam certas.

## Resumo

| | Quebra de página | Tamanho A4 | Envio pela API |
|---|---|---|---|
| HTML | **não**, em nenhuma das 5 formas | **não**, sai Letter | texto — confere byte a byte |
| `.docx` | sim | sim | binário — exige base64 |
| **RTF** | **sim** | **sim** | **texto — confere byte a byte** |

**RTF é a saída para Google Docs.** HTML continua sendo a saída para a tela e
para impressão pelo navegador, onde `page-break-before` e `@page` funcionam.

## O importador HTML descarta toda quebra de página

Cinco mecanismos testados, num documento-sonda com sete marcadores. O PDF
exportado saiu com **uma única página** e todos os marcadores empilhados:

| Mecanismo | Resultado |
|---|---|
| `.pb{page-break-before:always}` em classe CSS | descartado |
| `style="page-break-before:always"` no `<p>` | descartado |
| `<div style="page-break-before:always">` | descartado |
| `<br clear=all style="page-break-before:always">` | descartado |
| `<hr style="page-break-before:always">` | descartado — **e desenha uma régua cinza** |
| `style="break-before:page"` | descartado |
| `style="page-break-after:always"` | descartado |

O `<hr>` é a pior das opções: não quebra e ainda deixa um traço horizontal
visível no meio da página. Foi assim que a primeira versão do culto de 06/09 foi
entregue.

## O importador HTML também ignora `@page`

`@page{size:A4}` é descartado. O documento sai em **Letter (612×792pt)** em vez
de A4 (595×842pt). Como o corpo tem largura fixa, o efeito prático é quanta
cifra cabe por página — e portanto onde ela quebra.

## Por que RTF e não `.docx`

Os dois preservam quebra e tamanho de página. A diferença está no envio.

O `.docx` é binário: enviar exige transcrever base64 no parâmetro da chamada. Na
prática isso falha — houve pelo menos uma corrupção real nesse ponto, um zip de
13KB cujo final foi inventado, quebrando o diretório central. Base64 não tem
redundância semântica, então erro de transcrição não é detectável por leitura.

RTF é ASCII puro. O conteúdo enviado pode ser gravado em disco e comparado com
`cmp`/`md5sum` contra o original **antes** de subir. O `Culto_06SET` foi
publicado assim: md5 `39df11d417747ee3443f234f3a872c47` idêntico na origem e no
staging.

## Detalhes de RTF que importam

| Coisa | Como |
|---|---|
| Quebra de página | `\page` no início do parágrafo |
| A4 | `\paperw11906\paperh16838` (twips) |
| Margem 72pt | `\margl1440\margr1440\margt1440\margb1440` |
| Entrelinha 1.15 | `\sl276\slmult1` (1.15 × 240) |
| Acentuado dentro do BMP | `\u<decimal>?` — mantém o arquivo ASCII |
| Caractere fora do BMP (`𝄞`, emoji) | **par substituto UTF-16**, dois `\u<decimal>?` — um só estoura a faixa de 16 bits com sinal |
| **Alinhamento por coluna** | **`\~` (espaço inquebrável), não espaço comum** |

O primeiro é o que mais quebra silenciosamente: com espaço comum o Docs colapsa
os espaços múltiplos e todo acorde de linha posicional sai de cima da sílaba.

O segundo (par substituto) só apareceu com a fixture adversarial de
`tests/fixtures-emissor/` (03/09) — nenhuma música real do acervo tem
caractere fora do BMP, então o bug (escape de um `\u` só, com valor fora da
faixa de 16 bits com sinal — `\uN` aceita no máximo ±32767) nunca deu sintoma
visível em produção. Corrigido em `gerador/rtf.py`, função `esc`. Ver
`docs/reconciliacao-transpositores.md`/histórico do port TS para o cálculo.

## Como verificar depois de publicar

Não confie na tela. Exporte o Doc em PDF pela API (`exportMimeType:
"application/pdf"`) e confira:

1. número de páginas
2. `mediabox` — 595×842 é A4; 612×792 é Letter (o Google arredonda para 596)
3. primeira linha de cada página — cada música tem que estar no topo de uma
4. operadores de traço no content stream (`S`, `s`, `l`) — devem ser zero;
   `re` + `f` sozinho é só o fundo branco da página
5. espaços múltiplos preservados nas linhas de cifra

`gerador/tests/test_repertorio.py` trava o item 1 e o 3 por md5. Os demais
precisam do PDF.

## Histórico

| Data | O que se acreditava | O que era |
|---|---|---|
| 18/08 | classe CSS `.pb` funcionava | nunca funcionou; cultos de 23 e 30/08 saíram emendados |
| 26/08 | `<hr>` inline resolvia | não quebra e desenha régua |
| 26/08 | `.docx` era o caminho | funciona, mas o envio binário é o ponto frágil |
| 01/09 | **RTF** | verificado no PDF do Google: 12 páginas, A4, correto |
| 03/09 | `esc` cobria acentuado | não cobria — caractere fora do BMP saía como `\uN` único, fora da faixa de 16 bits, RTF inválido |

A lição que sobra: **toda afirmação sobre o importador precisa de PDF como
prova.** As três primeiras vieram de sondagem mal interpretada. A quarta veio
de uma fixture desenhada pra ser hostil — nenhum PDF real ia mostrar isso,
porque nenhuma música real tem o caractere que o expõe.
