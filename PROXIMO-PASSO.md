# Próximo passo: reconciliar o gerador com a Fase 0

Chegou um diretório novo, `gerador/`, com código que já rodou em produção — os
cultos de 23/08, 28/08, 30/08 e 06/09 de 2026 saíram dele e foram tocados.

Ele **duplica a transposição** com o núcleo da Fase 0. Esta é a tarefa de
resolver isso, antes de qualquer tela.

## O que já se sabe

`gerador/tests/test_cruzado_fase0.py` já rodou o transpositor do gerador contra
as cinco fixtures conferidas à mão em `tests/esperado/`. **As cinco passam byte
a byte**, incluindo as linhas posicionais.

Então os dois transpositores concordam em tudo que as fixtures cobrem. Isto aqui
não é caça a divergência — é escolher qual dos dois fica.

## Prompt para o Claude Code

> Chegou o diretório `gerador/` — código validado em produção, leia
> `gerador/README.md` primeiro. Ele duplica a transposição com o núcleo da Fase 0.
>
> **Tarefa: descobrir qual transpositor cobre mais, e ficar com um só.**
>
> 1. Escreva um teste que roda o núcleo da Fase 0 contra os casos de
>    `gerador/tests/test_transpor.py`. São 88 asserções cobrindo grafia
>    enarmônica, notação brasileira (`7+`, `7M`, `4`, `9`, `(5-)`, `(11)`,
>    `sus4`), baixo invertido nos dois lados, literais de estrutura
>    (`|`, `|:`, `:|`, `%`, `/`), preservação de coluna em linha posicional,
>    preservação de espaçamento em linha de compasso, melisma e ida-e-volta.
>
> 2. Rode. **Não conserte nada ainda.** Relate o placar: quantos passam, e para
>    cada falha, o caso exato, o obtido e o esperado.
>
> 3. Para cada falha, decida — e argumente — se quem está errado é o núcleo ou
>    o teste. Precedente: um teste do gerador afirmava que `Cb` nunca podia
>    aparecer; falhou em `F7M` de C para Gb → `Cb7M`, e a investigação mostrou
>    que a escala de Gb maior contém `Cb` mesmo. O teste é que estava errado.
>    **Assuma que o esperado está certo até provar o contrário, mas prove.**
>
> 4. Só então unifique. Se o núcleo passar em tudo, apague `gerador/transpor.py`
>    e aponte os emissores para o núcleo. Se falhar, o mais barato costuma ser
>    levar os casos que faltam para o núcleo e só depois apagar.
>
> **Critério de aceitação, inegociável:**
> `gerador/tests/test_repertorio.py::test_culto_06set_bate_com_o_publicado`
> continua passando. Ele regenera o culto de 06/09 e compara por md5
> (`39df11d417747ee3443f234f3a872c47`) com o arquivo que está no Drive. Se
> quebrar, a saída mudou em relação ao documento que a banda usou.
>
> **Não** reescreva `gerador/rtf.py` nem `gerador/html.py`. Cada regra ali custou
> um erro real — a quebra de página levou três tentativas até chegar em RTF, e o
> `\~` do espaço inquebrável só apareceu conferindo o PDF exportado pelo Google.
> Está tudo em `docs/achados-google-docs.md`.

## Depois disso

Só depois de existir um transpositor só é que faz sentido a próxima etapa: ligar
o parser `.cifra` ao `gerador/modelo.py` e começar a servir isso na web.

Ordem sugerida daí em diante, e o porquê:

1. **Site mínimo, só leitura, com as 13 músicas do `repertorio/`.** Lista, busca,
   escolher tom, imprimir. Sobe na VPS, no domínio, com HTTPS. Pouco conteúdo de
   propósito: põe o risco de infraestrutura na frente, quando ainda é barato
   descobrir que a cifra ficou ilegível no celular.
2. **Montagem de culto na tela.** Escolher músicas, tom de cada, ordem, momento
   — e gerar o documento. Hoje isso é Python escrito à mão.
3. **Importação do acervo.** É a parte cara, e tem decisão pendente: o teste com
   cinco arquivos difíceis mostrou que nenhum converte limpo
   (`docs/achados-importacao.md`). Não pode ser o que bloqueia o site existir.
4. **Login e edição.**
