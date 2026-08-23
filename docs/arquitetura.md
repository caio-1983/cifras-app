# Minisistema de cifras — proposta técnica

Baseado nas decisões: uso pelo **diretor + banda no palco**, edição principal
só sua (com edição rápida eventual no domingo), e **migração definitiva** do
Google Drive.

---

## 1. A mudança de fundo

Hoje um arquivo = uma música **em um tom**. Por isso 44 músicas viraram 106
arquivos.

No sistema, uma música é guardada **uma vez**, no seu tom original, e o tom de
exibição é escolhido na hora. `Digno de Tudo` deixa de ter versão C, D e F:
tem uma entrada só, e você abre em C quando quiser C.

O culto deixa de ser um documento de 20 páginas e passa a ser uma lista:

```
Culto 23/08/2026 — Noite
  1. O Grande Eu Sou      → D
  2. Ao Único             → Ab
  3. Digno de Tudo        → C
  4. Caminho no Deserto   → G
```

A visualização e o PDF são gerados a partir disso. Trocar o tom de uma música
no sábado à noite é mudar uma letra, não refazer o documento.

---

## 2. Onde os dados vivem

**Arquivos de texto, versionados em git. Sem banco de dados.**

```
repo/
├── musicas/
│   ├── digno-de-tudo.cifra
│   ├── ao-unico.cifra
│   └── ...
├── cultos/
│   ├── 2026-08-23-noite.yml
│   └── 2026-08-23-manha.yml
└── site/
```

Um arquivo `.cifra` é praticamente o que você já escreve:

```
titulo: DIGNO DE TUDO
artista: Paula Ferro
tom: D
momento: adoracao

[Intro] |: G9 | A :|

[Verso 1]
| G | A D/F# | G A | D |
Os santos e os anjos se prostram aos Teus pés
```

Por que não banco:

- Com 437 músicas, banco só acrescenta backup, migração e mais uma peça pra
  quebrar
- Git dá **histórico e desfazer de graça** — se uma edição de domingo estragar
  algo, dá pra voltar
- Backup é `git push`
- Se o sistema morrer daqui a três anos, você continua com 437 arquivos de
  texto legíveis. Um dump de banco não tem essa propriedade.

---

## 3. Arquitetura

| Camada | Escolha | Por quê |
|---|---|---|
| Backend | App pequena (Python/FastAPI ou Node/Express) | Precisa de rotas de edição; não dá pra ser 100% estático |
| Dados | Arquivos `.cifra` + git | Ver acima |
| Frontend | HTML renderizado no servidor + JS mínimo | Funciona em qualquer celular, sem app pra instalar |
| Transposição | No servidor, via URL | `/musica/digno-de-tudo?tom=C` — link direto e compartilhável |
| Offline | PWA com service worker | Igreja com wifi ruim é regra, não exceção |
| PDF | CSS de impressão + imprimir do navegador | Evita biblioteca de PDF inteira; a quebra de página por música já é sua regra |
| Acesso | Leitura com senha única da banda; edição com seu login | Simples sem ser aberto na internet |
| Hospedagem | VPS + nginx ou Caddy (HTTPS automático) | Folgado pra esse porte |

**Offline merece atenção**: se a banda depende do wifi da igreja no meio do
culto, o sistema falha exatamente na hora que não pode falhar. O PWA guarda o
repertório do culto no aparelho — abriu uma vez em casa, funciona no palco sem
rede.

---

## 4. Os três problemas técnicos de verdade

Não são detalhes: são onde um transpositor ingênuo produz cifra errada.

### 4.1 Grafia enarmônica

Transpor não é somar semitons. `A#` e `Bb` são a mesma tecla e cifras
diferentes — e a certa depende do tom de destino. Em Ab, o quarto grau é `Db`,
nunca `C#`. Em D, a sensível é `C#`, nunca `Db`.

O transpositor precisa conhecer a armadura do tom de destino e escolher a
grafia por ali. É o tipo de erro que você percebe na primeira leitura.

### 4.2 Notação brasileira

Sua cifra usa `F7+` (maj7), `Eb4` (sus4), `G9` (add9), `Bbm7`, `A/C#`. As
bibliotecas prontas de ChordPro são feitas pra notação americana e transformam
`F7+` em coisa que não existe. O parser precisa ser escrito pro seu vocabulário
— o que é factível justamente porque ele é consistente.

Também precisa preservar `%`, `|:` `:|` e as barras de compasso, que são
estrutura e não acorde.

### 4.3 Linhas de acorde solto

Aquele caso do `Bm  F#m7  G7+` sobre a sílaba. Transpondo, o nome do acorde
muda de largura e o alinhamento quebra — `F#m7` tem 4 caracteres, `Em7` tem 3.

Solução: marcar essas linhas como posicionais, renderizar em fonte monoespaçada
e recalcular o espaçamento depois de transpor, mantendo cada acorde sobre a
mesma sílaba. Sem isso, transpor estraga a cifra em vez de ajudar.

---

## 5. Fases

### Fase 0 — Parser e transpositor

O núcleo. Ler `.cifra`, entender seções, compassos e acordes, transpor com
grafia correta. **Tudo depende disso e é aqui que mora o risco** — vale validar
com um protótipo antes de qualquer tela.

Teste de aceitação: pegar as cifras que já estão no padrão, transpor pelo
sistema e comparar com as versões que você já fez à mão. Se `O Grande Eu Sou`
em C transposto der exatamente a sua versão em D e em G, o parser está de pé.

### Fase 1 — Importação

Converter as 437 do Drive. As que já seguem o padrão entram automático; as
outras precisam de curadoria — principalmente as 57 sem tom no nome e as oito
convenções de nomenclatura. **É a fase mais cara, e é a mesma curadoria que a
reorganização do Drive já exigiria.**

### Fase 2 — Leitura no palco

Busca, abrir música, escolher tom, PWA offline. É quando a banda começa a usar.

### Fase 3 — Montagem de culto

Criar culto, escolher músicas e tons, gerar visualização e PDF. É quando você
para de montar documento no sábado.

### Fase 4 — Edição pelo navegador

Editar a cifra pelo site, com commit automático no git. Inclui a "edição
simples de domingo" pelo celular.

### Fase 5 — Histórico

Última vez tocada, mais tocadas, repertório parado. Os 255 documentos da pasta
Cultos já são esse histórico — dá pra importar e começar com anos de dados em
vez de zero.

---

## 6. Riscos

| Risco | Mitigação |
|---|---|
| A importação consumir mais tempo que o esperado | Importar por lote, começando pelo repertório ativo (~120 músicas), não pelas 437 |
| Transposição errada passar despercebida | Validar contra as cifras que você já transpôs à mão |
| Sistema fora do ar num domingo | PDF do culto gerado e salvo com antecedência — o papel nunca cai |
| Manutenção virar peso | Sem banco e sem dependência exótica; se parar de mexer por um ano, continua rodando |
| Você perder acesso aos dados | São arquivos de texto em git, espelhados fora do VPS |

---

## 7. Ponto de partida sugerido

Fase 0 isolada, como protótipo, antes de decidir qualquer outra coisa: parser +
transpositor rodando nas suas cifras reais, com a comparação contra as versões
que você já fez à mão.

Se o núcleo funcionar, o resto é trabalho conhecido. Se não funcionar, é melhor
descobrir agora do que depois de importar 437 músicas.
