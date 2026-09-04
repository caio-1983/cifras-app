# Sistema de Cifras

Sistema para o diretor musical e a banda: guarda cada música **uma vez** e
transpõe para qualquer tom na hora de exibir.

**Desde 2026-09-04 é produto, não ferramenta interna** — será comercializado
para outras igrejas. O escopo e a ordem dos cinco sprints estão em
`docs/rumo.md`, que é a fonte da verdade sobre rumo; a lista de Fases 0–5 do
`docs/arquitetura.md` é histórica. **Leia `docs/rumo.md` antes de propor
qualquer coisa nova** — ele registra também o que está fora de escopo e por quê.

Resumo da sequência: **1** importação das 437 · **2** biblioteca utilizável
(critério: a banda de origem para de usar Google Docs) · **3** Sala do Culto por
link, sem cadastro · **4** isolamento por igreja · **5** contas e cobrança, um
plano e um preço.

## Três decisões que valem desde já

1. **Offline primeiro.** A cifra está no aparelho antes do culto. Cair a conexão
   pode custar o "o tom mudou", nunca a música.
2. **Conteúdo pertence à igreja, desde o modelo.** Escopo de igreja no modelo de
   dados desde o começo; nada de conteúdo cruzando entre igrejas.
3. **Arranjo separado de letra.** Arranjo (título, artista, tom, BPM, temas,
   mapa de seções, progressão) e letra são coisas distintas no modelo — é o que
   permite compartilhar arranjo sem redistribuir obra de terceiro.

## Limite jurídico — não reintroduzir por engano

Não existe licença coletiva no Brasil para reproduzir letra em software; CCLI
licencia a igreja, não um terceiro. **Não proponha nem implemente** biblioteca
comum entre igrejas, cifra colaborativa, catálogo público, nem importação de
conteúdo de sites de cifra. Se um requisito parecer exigir isso, **pare e
pergunte**. Detalhe em `docs/rumo.md`.

## Onde o projeto está

- **Núcleo pronto** — parser `.cifra` + transpositor, verde contra as transposições
  conferidas à mão em `tests/esperado/`.
- **Emissores em produção** — os cultos de 23/08, 28/08, 30/08 e 06/09 de 2026
  saíram de `gerador/` e foram tocados. Portados para TS em `gerador-ts/`, byte a
  byte contra o Python.
- **Site no ar, como Painel de Operação Musical** — `site/`. A tela principal é o
  **culto**: setlist (reordenar, remover, adicionar, transpor, música atual) e um
  **modo execução** escuro para o celular no palco. O conceito é preparar no
  computador e executar pelo celular; o que atravessa é o link, porque o servidor
  é só leitura e sem estado (`docs/site.md`).
- **Camada de formato pronta** — as três mudanças estruturais dos achados de
  importação estão implementadas e testadas: posicional é tipo comum, subtítulo
  tem vocabulário aberto com mapa de sinônimos (`src/sinonimosSubtitulo.ts`),
  anotação de execução usa `{...}`, seção-referência é materializada
  (`src/materializacaoSecoes.ts`), e `src/importador.ts` orquestra tudo. Três
  músicas reais já entraram por esse caminho.
- **Sprint 1 em curso: a importação em massa das 437 do Drive.** O que falta é
  volume e as pontas registradas em `docs/plano-camada-formato.md`: extração de
  texto de `.docx`, split de medley, e a separação arranjo/letra da decisão nova.
  O inventário do Drive está em `bruto/`.

A montagem de culto na tela existe, mas **monta sobre culto que já existe** e o
resultado é rascunho no aparelho e no link. Criar culto novo, salvar setlist,
Sala do Culto compartilhada entre celulares, edição, upload e login continuam
fora — são os sprints 2 a 5, e a importação vem antes.

## Mapa

| Diretório | O que é |
|---|---|
| `src/` | o núcleo: parser `.cifra`, transpositor, relayout, serializador |
| `musicas/` | o acervo em `.cifra` — a fonte da verdade |
| `gerador/` | Python **validado em produção**: modelo, transposição, emissores RTF/HTML |
| `gerador/repertorio/` | 13 músicas modeladas à mão; massa de teste real |
| `gerador-ts/` | port TS dos emissores, travado byte a byte contra o Python |
| `site/` | o painel: servidor Fastify, design system (`ui.ts`), preparação (`paginas.ts`), execução (`execucao.ts`) |
| `dados/` | `repertorio.json` — **gerado**, ponte temporária até o `.cifra` (músicas **e** cultos) |
| `bruto/` | inventário do Drive e manifesto do dump (base da Fase 1) |
| `deploy/` | systemd, nginx, certbot |

## Contexto essencial

| Assunto | Onde |
|---|---|
| **Rumo, sprints, fora de escopo, limite jurídico** | `docs/rumo.md` |
| Formato `.cifra` — leia antes de mexer no parser | `docs/formato-cifra.md` |
| Estado da camada de formato/importador, item por item | `docs/plano-camada-formato.md` |
| Padrão visual (cores, fonte, estrutura) | `docs/padrao-visual.md` |
| Arquitetura e fases | `docs/arquitetura.md` |
| Publicar no Google Docs | `docs/achados-google-docs.md` |
| O site: decisões, pendências, escopo | `docs/site.md` |
| O que o `.cifra` ainda não comporta | `docs/achados-importacao.md` |

## Regras do projeto

- **Sem banco de dados.** A fonte da verdade são os arquivos `.cifra` em `musicas/`.
  Continua valendo nos sprints 1 e 2. Os sprints 4 e 5 (isolamento por igreja,
  contas) põem essa regra em xeque — o escopo de igreja pode viver como diretório
  por igreja, mas a decisão é do usuário e não foi tomada. Não introduza banco
  sem perguntar.
- **Sem dependência de biblioteca de ChordPro.** A notação aqui é brasileira
  (`F7+`, `Eb4`, `G9`) e as libs prontas a corrompem.
- Português nos nomes de domínio (musica, tom, refrao, compasso) — é o vocabulário
  do usuário e evita tradução mental.
- **`dados/repertorio.json` é gerado, não fonte.** A fonte é `gerador/repertorio/*.py`;
  regenere com `python gerador/scripts/exportar_repertorio_json.py`. Editar à mão
  quebra o teste de deriva, que existe justamente para isso.
- **O acervo tem letra de música protegida.** O site é ferramenta interna da banda:
  `noindex`, `robots.txt` bloqueando tudo, e basic auth no nginx. O processo escuta
  em `127.0.0.1` de propósito — expor a porta abre o acervo.

## Transposição — os três erros que não podem acontecer

1. **Grafia enarmônica.** Transpor não é somar semitons. A grafia certa depende da
   armadura do tom de destino: em Ab o quarto grau é `Db`, nunca `C#`; em D a
   sensível é `C#`, nunca `Db`. Escolha a grafia pela armadura, não por tabela fixa.
   Pelo mesmo motivo o destino é uma **escolha**: `E → Gb` e `E → F#` são respostas
   diferentes e as duas estão certas.
2. **Notação brasileira.** `7+` é maj7, `4` é sus4, `9` é add9. Baixo invertido em
   `A/C#` transpõe os dois lados. `%`, `|:` e `:|` são estrutura, não acorde.
3. **Linhas posicionais** (prefixo `~`). O acorde fica sobre a sílaba, e o nome muda
   de largura ao transpor (`Em7` → `F#m7`). Recalcule o espaçamento para manter cada
   acorde sobre a mesma sílaba. Quando o alargamento come a folga, entra 1 espaço de
   separação — dois acordes colados formam um token que se lê como **outro acorde**
   (`Gb/Bb` + `Cb` = `Gb/BbCb`). Adjacência que já vinha do fonte é preservada.

## Emissão

- **RTF para Google Docs, HTML para tela e impressão.** O importador do Docs descarta
  toda forma de quebra de página e ignora `@page{size:A4}` — cinco mecanismos
  testados, todos descartados. No navegador os dois funcionam. Não repita as três
  tentativas que já falharam: `docs/achados-google-docs.md`.
- **Não reimplemente a renderização.** Cada regra dos emissores custou um erro real
  (a quebra de página levou três tentativas; o `\~` do RTF só apareceu conferindo o
  PDF). Quem precisa de HTML chama `gerador-ts/html.ts::escrever` e põe o cromo em
  volta, como `site/paginas.ts` faz.
- **Afirmação sobre documento publicado precisa de PDF como prova**, não da aparência
  na tela. Três versões foram entregues quebradas porque pareciam certas.

## Testes

`tests/esperado/` contém transposições **conferidas à mão**. São o critério de
aceitação do núcleo: o transpositor tem que reproduzi-las exatamente.

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

Ao mudar uma regra, confira por **mutação** que o teste pega: reverta a regra e veja
a suíte quebrar. Suíte grande que não é submetida a isso não prova nada.

```
npm test                  # núcleo + reconciliação + port dos emissores + site
npx tsc --noEmit
python -m pytest gerador/tests -q
```

`gerador/tests/test_repertorio.py` é o mais valioso: reproduz cultos que já foram
tocados, travados por md5 (o do 06SET é `39df11d417747ee3443f234f3a872c47`). Se ele
quebrar, a saída mudou em relação ao que a banda usou — o que pode ser intencional,
mas nunca é acidental.
