# Sistema de Cifras

Sistema para o diretor musical e a banda da igreja: guarda cada música **uma vez**
e transpõe para qualquer tom na hora de exibir.

## Contexto essencial

- **Formato dos arquivos `.cifra`:** `docs/formato-cifra.md` — leia antes de mexer
  no parser. É a especificação do formato real usado pelo usuário há anos.
- **Arquitetura e fases:** `docs/arquitetura.md`
- **Fase atual: 0** — parser + transpositor. Sem interface, sem servidor, sem banco.
  Não construa telas nem API antes do núcleo passar nos testes.

## Regras do projeto

- **Sem banco de dados.** A fonte da verdade são os arquivos `.cifra` em `musicas/`.
- **Sem dependência de biblioteca de ChordPro.** A notação aqui é brasileira
  (`F7+`, `Eb4`, `G9`) e as libs prontas a corrompem.
- Português nos nomes de domínio (musica, tom, refrao, compasso) — é o vocabulário
  do usuário e evita tradução mental.

## Transposição — os três erros que não podem acontecer

1. **Grafia enarmônica.** Transpor não é somar semitons. A grafia certa depende da
   armadura do tom de destino: em Ab o quarto grau é `Db`, nunca `C#`; em D a
   sensível é `C#`, nunca `Db`. Escolha a grafia pela armadura, não por tabela fixa.
2. **Notação brasileira.** `7+` é maj7, `4` é sus4, `9` é add9. Baixo invertido em
   `A/C#` transpõe os dois lados. `%`, `|:` e `:|` são estrutura, não acorde.
3. **Linhas posicionais** (prefixo `~`). O acorde fica sobre a sílaba, e o nome muda
   de largura ao transpor (`Em7` → `F#m7`). Recalcule o espaçamento para manter cada
   acorde sobre a mesma sílaba.

## Testes

`tests/esperado/` contém transposições **conferidas à mão**. São o critério de
aceitação da Fase 0: o transpositor tem que reproduzi-las exatamente.

```
musicas/o-grande-eu-sou.cifra  (C)  → tests/esperado/o-grande-eu-sou_D.cifra
                                    → tests/esperado/o-grande-eu-sou_G.cifra
musicas/ao-unico.cifra         (C)  → tests/esperado/ao-unico_Ab.cifra
```

Escreva o teste antes do transpositor. Se um caso falhar, investigue se o esperado
está errado antes de "consertar" o código — mas assuma que o esperado está certo até
provar o contrário.

**Toda mudança no núcleo roda contra `gerador/repertorio/` inteiro, não só contra os
casos sintéticos** (`tests/relayoutRepertorio.test.ts` é o modelo: 13 músicas × 12
tons). Três bugs deste projeto passaram por teste sintético e só apareceram em música
real: a linha `~` no teste cruzado, o `\uN` fora do BMP, e a colisão do
`colunaAbsoluta`. Teste sintético prova que o código faz o que você pensou; só música
real prova que você pensou na coisa certa.
