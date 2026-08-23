# Padrão de cifras — Caio

Extraído da formatação real de `Quem é esse_F_Soprano` e `A MAIOR HONRA_Ab`
(Google Docs, pasta **Cifras**), confirmado estruturalmente em `ALGO NOVO VINDO_A`.

## Página

| Item | Valor |
|---|---|
| Fonte | Arial (documento inteiro) |
| Margens | 2,54 cm (72 pt) nos 4 lados |
| Tamanho da página | A4 retrato |
| Entrelinha | 1,15 |
| Espaço antes/depois do parágrafo | 0 |
| Alinhamento | Esquerda |

## Estilos por tipo de linha

| Elemento | Fonte | Tamanho | Cor | Estilo |
|---|---|---|---|---|
| Título da música (CAIXA ALTA) | Arial | 15 pt | preto / `#1B1B1B` | **negrito** |
| Artista / intérprete | Arial | 15 pt | preto / `#1B1B1B` | **negrito** |
| `Tom: X` | Arial | 12 pt | preto / `#1B1B1B` | **negrito** |
| Subtítulo de seção `[Verso]`, `[Refrão]`… | Arial | 12 pt | **azul `#0000FF`** | **negrito** |
| Repetições depois do subtítulo (`2x`, `4x`) | Arial | 12 pt | azul `#0000FF` | negrito (mesmo run do subtítulo) |
| Cifra / campo harmônico `\| Bb \| C \|` | Arial | 12 pt | **laranja `#FF6600`** | **negrito** |
| Letra | Arial | 12 pt | preto / `#1B1B1B` | normal |
| Observações de execução (`pausa`, `4ª vez`) | Arial | 12 pt | **roxo `#9900FF`** | negrito (+ itálico quando é instrução de levada) |

> **Laranja oficial: `#FF6600`.** Alguns arquivos antigos estão com `#EE6600`
> (ex.: `A MAIOR HONRA_Ab`) — devem ser corrigidos para `#FF6600`.

## Estrutura do documento

```
TÍTULO EM CAIXA ALTA          ← 15pt negrito
Nome do Artista               ← 15pt negrito
Tom: F                        ← 12pt negrito (opcional; às vezes só no nome do arquivo)

[Intro] | Bb | C | Dm | Am |  ← subtítulo azul + cifra laranja na MESMA linha

[Verso]                       ← subtítulo sozinho na linha
|: Bb | C | Am | Dm :|        ← cifra sozinha, ACIMA do bloco de letra
Linha de letra 1
Linha de letra 2
...
```

Regras observadas:

- Uma linha em branco separa cada bloco (subtítulo, cifra+letra).
- Seções curtas só de acordes (`[Intro]`, `[Interlúdio]`, `[Rampa]`, `[Fim]`)
  ficam com subtítulo e cifra na mesma linha.
- Seções com letra têm o subtítulo sozinho e a cifra em linha própria acima da letra.
- A cifra é por **compasso**, entre barras: `| Bb | C | Dm | Am |`.
- `%` = repete o compasso anterior. `|:` `:|` = repetição.
- Acordes de mesma barra separados por espaço: `| A9 A | A Asus4 A |`.
- Repetições vão ao lado do subtítulo: `[Refrão] 2x`, `[Ponte] 4x`.
- **Nada de seção só com a indicação.** Quando a estrutura repete uma seção
  (`[Refrão]`, `[Ponte]`…), o bloco inteiro é replicado — subtítulo, cifra e letra —
  e não apenas o subtítulo remetendo à seção anterior. Vale principalmente para o
  fim da música, onde o original costuma trazer só a sequência de indicações.
- Modulação ganha seu próprio subtítulo `[Modulação]` com a cifra de passagem.
- Nomes de arquivo: `NOME DA MÚSICA_Tom` (ex.: `A MAIOR HONRA_Ab`),
  com sufixo extra quando há variação: `_Soprano`, `_MSC`.

## Regra para acordes soltos (sem barras)

Cifras antigas às vezes trazem acordes posicionados sobre as sílabas, sem divisão
de compasso (ex.: `Am    F    C`). Ao converter para este padrão:

- **Converter** para `| Am | F | C |` quando a progressão já aparece em compasso
  definido em outro ponto da mesma música (mesma harmonia, mesmo ritmo harmônico).
- **Manter como está** quando a divisão não puder ser confirmada pela própria
  cifra — e sinalizar as linhas pendentes em vez de inventar as barras.

## Vocabulário de subtítulos

Estas são as divisões usadas. Nomes fora desta lista não devem ser inventados na
conversão — se uma seção do arquivo original não se encaixar em nenhuma delas,
sinalizar em vez de criar um rótulo novo.

**Seções com letra:**

| Subtítulo | Numeração |
|---|---|
| `[Verso 1]`, `[Verso 2]`, `[Verso 3]`… | numerar sempre, quantos houver |
| `[Pré-refrão]` | sem número |
| `[Refrão]` | `[Refrão 1]`, `[Refrão 2]`… quando houver mais de um diferente |
| `[Ponte]` | `[Ponte 1]`, `[Ponte 2]`… quando houver mais de uma diferente |
| `[Rampa]` | sem número |
| `[Tag]` | sem número — trecho curto repetido no fim |

Refrão e ponte só recebem número quando a música tem versões **diferentes** entre
si. Repetição da mesma seção não vira `[Refrão 2]` — repete `[Refrão]` com o bloco
inteiro, e a quantidade vai ao lado (`[Refrão] 2x`).

**Seções instrumentais** (subtítulo e cifra na mesma linha):
`[Intro]` · `[Interlúdio]` · `[Modulação]`

Anotações livres fora de colchetes (em roxo ou preto), ex.: `Saída da ponte 2x`,
`Bateria`, `Ataque no segundo tempo`, `Ataque normal`, `pausa`, `4ª vez`.

## Montagem dos cultos

Documento único reunindo as cifras completas do repertório, na ordem em que serão
tocadas.

- **Cada música começa em página nova** — quebra de página antes de cada título.
  Nunca emendar uma música no meio da folha.
- Cada música entra com a cifra inteira (cabeçalho, tom e todos os blocos), no
  mesmo padrão do arquivo individual — não é lista de links nem resumo.
- O tom de cada música é o do culto, que pode diferir do arquivo individual;
  transpor quando necessário.
- Nome do arquivo: `Culto_DDMMM_Periodo` (ex.: `Culto_23AGO_Manha`,
  `Culto_23AGO_Noite`), mês abreviado em maiúsculas.
- Local: pasta **Cultos** (dentro de Cifras), não na raiz do Drive.
