# Índice do HCC — número, título, categoria

`hcc-indice.tsv`: 440 hinos do **Hinário para o Culto Cristão** (JUERP), com
número, título e a categoria temática impressa na página.

## Para que serve

Um hino é chamado pelo **número**, não pelo nome. Sem este índice, marcar um
`.cifra` com `fonte: HCC` / `numero: N` exigia abrir o livro impresso, hino por
hino. Com ele, o casamento por título é automático — e foi assim que três hinos
que já estavam no acervo **sem marca nenhuma** foram encontrados (80, o 25 em E,
e a segunda transcrição do 329).

A coluna `categoria` é o vocabulário temático do próprio hinário
(`DEUS-PAI, ADORAÇÃO E LOUVOR`, `IGREJA, CEIA DO SENHOR`, `VIDA CRISTÃ,
GRATIDÃO`…). É candidata natural a alimentar o campo `momento`, que hoje quase
nenhuma música do acervo preenche — mas isso é decisão de modelagem que ainda
não foi tomada.

## Como foi levantado

Os PDFs (`HCC/`, fora do repositório — ver `.gitignore`) são **scan de 1 bit**,
sem camada de texto além do carimbo de copyright. Não há OCR instalado na
máquina. O caminho usado:

1. Recortar a tarja superior de cada página (categoria + título + número) com
   `pymupdf`, a 140 dpi.
2. Empilhar 20 tarjas por folha → 22 imagens.
3. Ler as 22 folhas e transcrever.

Conferência: 440 linhas para 440 PDFs, e **nenhum número repetido**.

## O que este arquivo NÃO é

Não é o hinário. **Não há uma nota nem um acorde aqui** — e não há nos PDFs
tampouco: a partitura é SATB a quatro vozes, sem sigla de acorde nenhuma. Cifra
de hino só existe transcrita à mão a partir das vozes.

## Cuidado ao casar por título

Título igual **não** é hino igual. Cinco casamentos exatos ou quase exatos
foram rejeitados conferindo a primeira estrofe impressa contra a letra do
`.cifra` — todos são música contemporânea que herdou o título de um hino:

| Nº | Título do hino | Primeira estrofe do HCC | O que o acervo tem |
|---|---|---|---|
| 2 | Santo! Santo! Santo! | "Deus onipotente!" | "Digno de toda glória" |
| 23 | Não a nós, Senhor | "não a nós, Senhor, mas ao teu nome dá" | "Já não vivo eu" |
| 206 | Santo Espírito divino | "és o Criador" | "Não há nada igual" |
| 392 | Aviva-nos, Senhor! | "Oh, dá-nos teu poder!" | "Levantamos nossa voz" |
| 407 | Bem-aventurado é aquele | "que tem no Senhor o auxílio" | "está firmado em tua casa" |

**A regra: confirmar pela letra, nunca pelo título.** Um número errado no campo
certo é pior que campo vazio.

## Situação jurídica — está impressa em cada página

Cada página traz o próprio crédito de direito autoral, então o status é
auditável hino a hino em vez de presumido. O hino 25, por exemplo:

> © Copyright 1923. Renovado 1951 por Hope Publishing Co. […] Todos os direitos
> reservados. Usado com permissão.
> © Copyright da tradução 1990 Joan L. Sutton e JUERP.

Ou seja: a permissão é da **JUERP**, não transferível, e a tradução é de 1990 —
não domínio público. A suposição de que "hinário é hino antigo, logo livre" é
falsa para pelo menos parte do livro. Colher essa linha (tarja inferior da
página) na mesma técnica acima daria uma coluna de status por hino; para um
produto que será comercializado (`docs/rumo.md`), essa coluna vale mais que as
cifras. **Não foi feito ainda.**
