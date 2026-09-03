# gerador

Motor de saída: pega uma música modelada, transpõe e emite documento.

**Isto rodou em produção.** Os cultos de 23/08, 28/08, 30/08 e 06/09 de 2026
saíram daqui e foram tocados. O teste `test_culto_06set_bate_com_o_publicado`
reproduz byte a byte o documento que está no Drive.

## Mapa

| Arquivo | O que faz |
|---|---|
| `transpor.py` | núcleo: intervalo, nota, acorde, linha de compasso, linha posicional |
| `modelo.py` | a música como dado; construtores de linha; `validar()` |
| `rtf.py` | emissor RTF — **a saída para Google Docs** |
| `html.py` | emissor HTML — a saída para tela e impressão pelo navegador |
| `repertorio/` | treze músicas reais modeladas à mão |
| `tests/` | 83 testes, vários vindos de bug real |

## Uso

```python
from gerador import modelo as md, rtf, html

emaus = md.musica('EMAÚS', 'Morada', 'B', corpo=[
    md.labc('[Intro]', '| E G#m | F# B/D# |'), md.B,
    md.lab('[Verso 1]'),
    md.pos('                                  E                      B'),
    md.let('Quem é esse que vem, nos abraçando'),
])

rtf.documento([(emaus, 'G')], 'culto.rtf')   # -> subir no Drive como application/rtf
html.documento([(emaus, 'G')])               # -> servir no site
```

Documento de culto é só uma lista maior; a partir da segunda, cada música começa
em página nova:

```python
rtf.documento([(vitorioso, 'G'), (construir, 'C'), (quebrantado, 'C')], 'culto.rtf')
```

## As três coisas que não podem quebrar

**1. Transposição é por intervalo, não por semitom.** Somar semitons e escolher
a grafia por tabela fixa produz `C/Fb` ao levar Ao Único de C para Ab. Aqui a
letra da nota é preservada por construção, então a grafia sai certa sem tabela
de exceção. Ver o cabeçalho de `transpor.py`.

**2. `cif` e `pos` são algoritmos diferentes.** Linha de compasso substitui o
token no lugar; linha posicional reancora por coluna. Classificar errado destrói
o alinhamento — e a linha posicional é a maioria do acervo real, não a exceção
(ver `docs/achados-importacao.md`). O bug histórico: `| Bb9 | C |` virando
`| F9  | G |` com espaço dobrado.

**3. RTF para Docs, HTML para o site.** O importador do Google Docs descarta
toda forma de quebra de página em HTML e ignora `@page{size:A4}`. Ver
`docs/achados-google-docs.md` — cinco mecanismos testados, todos descartados.

## Como isso conversa com a Fase 0

A Fase 0 (parser `.cifra` + transpositor) e o gerador foram escritos em
paralelo e cada um tinha seu transpositor. **A reconciliação está feita, nos
dois sentidos, e o resultado é bom: 100% de acordo, sem nenhuma divergência.**

`tests/test_cruzado_fase0.py` roda `gerador/transpor.py` contra as cinco
fixtures conferidas à mão em `tests/esperado/` e **reproduz as cinco byte a
byte** — incluindo as linhas posicionais (`~`), o caso mais frágil.

`tests/cruzadoGerador.test.ts` (no núcleo TS) faz o caminho inverso: roda os
88 casos daqui — `7M` além de `7+`, `(5-)`, `(11)`, baixo invertido nos dois
lados, estrutura, compasso, posicional, identidade, ida-e-volta, erro de tom
— contra `transporMusicaTexto`. **Bateu tudo, já na primeira tentativa.**

Detalhe completo, incluindo o único ponto que precisou de decisão (melisma —
`limpar_letra` não é transposição em nenhum dos dois lados, só é chamada na
hora de emitir) em `docs/reconciliacao-transpositores.md`.

**Decisão: `gerador/transpor.py` fica.** `rtf.py`/`html.py`/`modelo.py` são
Python de produção importando direto dele; o núcleo é TypeScript/Node; não
existe ponte de execução entre os dois (e construir uma seria escopo de API/
servidor, não desta tarefa). Com os dois algoritmos provados equivalentes,
"unificar" passou a significar isso — provar, não escolher um arquivo pra
apagar.

Próximos passos, agora que existe um algoritmo só, provado nos dois lados:

1. **Ligar o parser ao modelo.** O parser produz o que `modelo.py` descreve; se
   a estrutura interna divergir, escrever um adaptador em vez de reescrever os
   emissores — eles são a parte validada em produção.
2. **Converter `repertorio/` para `.cifra`** quando o formato estabilizar. Aí
   sim as treze músicas viram os primeiros arquivos do acervo, e este diretório
   some.

Uma ressalva sobre o teste cruzado original (Python→fixtures): o leitor de
`.cifra` dentro dele é mínimo, e a primeira versão dele errou — classificou
linha `~` como texto porque a heurística era "contém `|`", e linha posicional
não tem barra. As duas fixtures de `o-grande-eu-sou` falharam até isso ser
corrigido. Serve de aviso: **a distinção entre linha de compasso e linha
posicional é onde o parser erra.**

O que **não** conviria fazer é reescrever os emissores do zero. Cada regra que
está neles custou um erro real: a quebra de página levou três tentativas, o
alinhamento por coluna levou um bug em culto, e o `\~` do RTF só apareceu
conferindo o PDF exportado.

## Testes

```
pytest gerador/tests -q
```

`test_repertorio.py` é o mais valioso: reproduz cultos que já foram tocados. Se
ele quebrar, a saída mudou em relação ao que a banda usou — o que pode ser
intencional, mas nunca é acidental.
