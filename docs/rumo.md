# Rumo do projeto — de ferramenta interna a produto

**Decidido em 2026-09-04.** Este documento é a fonte da verdade sobre escopo e
ordem. Onde ele divergir de outro doc mais antigo (`arquitetura.md`, em especial
a lista de Fases 0–5), vale este.

## O que mudou

O projeto nasceu como ferramenta interna da banda de uma igreja. Passa a ser
desenvolvido como **produto que será comercializado para outras igrejas**.

Existia um plano de nove sprints (igreja/usuários → biblioteca → repertório →
execução → sala do culto → escalas → inteligência → IA → comercial). Esse plano
foi revisado e **reduzido para cinco sprints, em outra ordem**. Três motivos:

1. **O encanamento vinha primeiro e não validava nada.** Contas, perfis,
   permissões e planos eram o sprint 1. Passam a ser o sprint 5, quando já
   existir quem pague.
2. **O diferencial vinha em quinto.** A Sala do Culto é a hipótese central do
   produto e **não precisa de contas** — um link com código já basta para
   testá-la. Sobe para o sprint 3.
3. **Dois módulos saíram.** Escalas duplicava o núcleo do Planning Center
   Services, que é grátis até 5 usuários. A biblioteca compartilhada com letra
   entre igrejas saiu por questão jurídica não resolvida (ver abaixo).

## A sequência nova

### Sprint 1 — Importação do acervo

437 arquivos em `.docx` e Google Docs. É o gargalo de todo o resto: sem acervo
não há biblioteca, busca, histórico nem produto. Exige antes as três mudanças
estruturais de formato levantadas em `achados-importacao.md` — posicional como
regra e não exceção, vocabulário aberto com normalização, e sintaxe própria para
anotação de execução.

### Sprint 2 — Biblioteca utilizável

O redesenho já especificado (acorde preso à sílaba, modo compacto, temas,
busca), montagem de culto na tela, e impressão.
**Critério de aceitação: a banda de origem para de usar Google Docs.**

### Sprint 3 — Sala do Culto, por link, sem cadastro

Líder conduz, músicos acompanham. Música atual, próxima, tom oficial, e a
exceção individual de tom (o caso do capotraste). Mudança de repertório no meio
do culto é requisito, não exceção.

### Sprint 4 — Isolamento por igreja

Uma segunda igreja com acervo próprio, separado. Ainda sem contas de usuário:
acesso por link com escopo de igreja. É o sprint que prova que o produto
funciona fora da realidade de quem o construiu.

### Sprint 5 — Contas e cobrança

Igreja, usuários, perfis, permissões, e o mínimo de assinatura: **um plano, um
preço**. Não construir quatro faixas — o plano antigo tinha
Básico/Intermediário/Avançado/Igreja, e precificar antes do primeiro cliente é
adivinhação.

## Fora de escopo, com o motivo

| Não construir | Por quê |
|---|---|
| Biblioteca compartilhada com letra entre igrejas | Questão jurídica aberta, sem parecer profissional. Ver abaixo |
| Escalas, disponibilidade, confirmação, substituto | Núcleo do Planning Center, grátis até 5 usuários, sem vantagem nossa |
| IA que gera cifra a partir de áudio | Resolve problema que só existe depois da biblioteca |
| Empacotar para Play Store / App Store | PWA cobre. Conta nova exige 12 testadores por 14 dias |
| Múltiplas faixas de plano | Um plano, um preço, até haver dado real |

## Três decisões de arquitetura que vêm com a guinada

Estas são caras de recauchutar depois. Valem desde o sprint 1.

### 1. Offline primeiro

A cifra tem que estar no aparelho **antes** do culto. A sincronização da Sala do
Culto é enfeite em cima disso. Cair a conexão significa perder o "o tom mudou",
nunca perder a música. Igreja com wi-fi ruim é a regra, e o culto é o único
momento em que o produto não pode falhar.

### 2. Conteúdo pertence à igreja, desde o modelo

Cada igreja traz e guarda o próprio acervo. Nada de conteúdo cruzando entre
igrejas. Escopo de igreja no modelo de dados desde o começo — enfiar
multi-tenancy depois é reescrever tudo.

### 3. Separar arranjo de letra no modelo

Hoje eles vivem juntos no `.cifra`. Separe-os agora:

- **arranjo** — título, artista, tom original, BPM, temas, mapa de seções,
  progressão harmônica
- **letra** — o texto cantado

Custa pouco agora e preserva as duas saídas: se algum dia houver
compartilhamento entre igrejas, ele pode ser só de arranjo, sem redistribuir
obra de terceiro. Se a questão jurídica for resolvida de outro jeito, nada se
perde. Sem essa separação, a decisão futura vira refatoração do acervo inteiro.

## Plano do Sprint 1 — estado e decisões (2026-09-04)

**As três mudanças estruturais de formato dos achados já estão implementadas e
verdes** (posicional como tipo comum, vocabulário aberto com sinônimos, anotação
`{...}`) — ver `plano-camada-formato.md`, item por item, e 346 testes passando.
O Sprint 1 não começa em formato; começa onde o trabalho parou de verdade.

Ordem:

0. **Exportação byte-fiel do Drive** — o gargalo real. `bruto/MANIFESTO.md`
   registra a interrupção: a via usada escapava sustenido (`\#`). 399 dos 400
   arquivos são Google Docs nativos, não `.docx`. Aceitação: hexdump com `#`
   literal, BOM e CRLF preservados. **Depende do usuário** (credencial e via:
   `rclone`, Baixar pasta, Takeout, ou export por `fileId` em `text/plain`).
1. **Separar arranjo de letra** — a única mudança de formato que falta, e é a
   decisão 3 acima. Vem antes do volume: importar 437 no formato de hoje faria
   a mudança virar reprocessamento do acervo inteiro.
2. **Cobertura antes do volume** — cada música importada entra no round-trip do
   `golden.test.ts` e no loop de `relayoutRepertorio.test.ts` (× 12 tons).
3. **Importação em lote, com relatório de taxa** — falhas agrupadas por causa:
   causa recorrente vira regra, caso único vira curadoria manual.
4. **Split de medley** — 3 arquivos do inventário servem duas músicas cada.
5. **Curadoria humana das que não entram** — o acervo tem cifras genuinamente
   incompletas (`TU ÉS BOM` é o precedente).

**437 é contagem de arquivos, não de músicas.** O acervo tem duplicata de tom por
música; o entregável do sprint é *músicas únicas importadas*. A tessitura que
vinha no nome do arquivo (`_C_masculino`) é preservada no campo `tessitura`.

Decisões tomadas:

- **Arranjo × letra: um arquivo, dois blocos.** O `.cifra` continua sendo um
  arquivo por música; a separação é dentro do corpo, e o serializador sabe
  emitir só o arranjo. Preserva o round-trip, as 139 fixtures e a curadoria num
  arquivo só. *A marcação exata ainda é passo de desenho* — o que ela não pode
  fazer é colidir com `[`, `{`, `~`, `|`, `%` ou `/`.
- **Lote 1: as 35 músicas ativas** já mapeadas em `bruto/inventario.tsv` (73
  arquivos deduplicados), não as 400.
- **O importador recebe o diretório de destino por parâmetro**, em vez de assumir
  `musicas/` — a mudança física para `acervo/<igreja>/` fica no Sprint 4, e o
  parâmetro evita que ela seja reescrita (decisão 2 acima).

## Sobre a questão jurídica, para não reintroduzir sem querer

Levantamento já feito: não existe licença coletiva no Brasil para reproduzir
letra em software; CCLI licencia a igreja, não um terceiro; ECAD e UBC arrecadam
execução pública, não reprodução. Distribuir letra entre igrejas **e cobrar por
isso** é o modelo de maior exposição, e não há parecer profissional ainda.

Portanto: **não propor nem implementar** biblioteca comum, cifra colaborativa
entre igrejas, catálogo público, nem importação de conteúdo de sites de cifra
para dentro da plataforma. Se algum requisito parecer exigir isso, **parar e
perguntar**.

## O que não muda

- `gerador/` é código validado em produção. Não reescrever os emissores.
- As 139 fixtures de `tests/fixtures-emissor/` continuam batendo byte a byte, e
  o md5 do culto 06SET (`39df11d417747ee3443f234f3a872c47`) continua sendo o
  critério de aceitação de qualquer mexida em saída.
- RTF para Google Docs, HTML para tela e impressão. Ver
  `achados-google-docs.md`.
- Toda mudança no núcleo roda contra `gerador/repertorio/` inteiro, não só
  contra os casos sintéticos.
- Teste por mutação: provar que o teste falha quando a regra é revertida.
