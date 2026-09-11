# Projeto Igreja — resumo da conversa

**Data:** 2026-09-08
**Contexto:** igreja de origem (~300 membros) vira cliente pagante. Quatro frentes.
Base de código existente: `cifras-app`. Infra: VPS própria.

---

## 1. Decisões tomadas nesta conversa

| Questão | Decisão |
|---|---|
| Escalas do louvor (estava fora de escopo no `rumo.md`) | **Reverter e pôr no produto** |
| Relação com o `cifras-app` | **Monorepo, apps separados**, SSO, cadastro de pessoas compartilhado |
| Alvo da tesouraria | **Lançamento + pendência fiscal**; dízimos, ofertas, ofertas designadas. Controle básico de igreja, não ERP |
| Natureza comercial | **Cliente pagante** |
| Importação de acervo do Drive | **Adiada, com gatilho** — migração manual na implantação (ver §6) |

---

## 2. O conflito com o que já estava decidido

O `docs/rumo.md` (04/09) colocou **escalas, disponibilidade, confirmação e substituto**
explicitamente fora de escopo, com o motivo registrado: *"núcleo do Planning Center,
grátis até 5 usuários, sem vantagem nossa"*. O `CLAUDE.md` manda parar e perguntar
nesse caso.

**A premissa estava factualmente errada.** O plano gratuito do Planning Center
Services em 2026 é **1 tipo de serviço com recursos limitados**, não "até 5 usuários".
Cinco tipos custam US$ 14/mês; ilimitado, US$ 99/mês. Somado a interface em inglês e
cobrança em dólar para voluntários brasileiros, a conclusão se inverte.

**A vantagem competitiva** não é fazer o que o Planning Center faz — é fazer em
português, no preço de igreja brasileira, e **amarrado à cifra que a banda já usa**.
A escala que sabe o setlist e o tom de cada música do culto é o que o concorrente
não tem, porque a biblioteca dele é dele e a nossa é da igreja.

### Pendente de escrita no repositório

- `docs/rumo.md` — remover escalas do "fora de escopo", registrando o dado corrigido
  e a razão nova. E acrescentar a entrada da importação adiada (§6).
- `CLAUDE.md` — a regra **"sem banco de dados"** vira **"acervo em arquivo,
  operação em banco"** (§3).
- Sprint 4 (isolamento por igreja) deixa de ser urgente: a igreja-cliente é a
  igreja de origem. Não há segunda igreja para isolar ainda.

---

## 3. Arquitetura

Um repositório, um VPS, quatro processos com deploy independente, um banco.
O que atravessa os apps é **pessoa** — o mesmo ser humano é membro no cadastro,
contribuinte na tesouraria e tecladista na escala.

```
integra-igreja/
  nucleo/          Igreja, Pessoa, Sessão, Papel, Permissão, Auditoria (Postgres)
  apps/
    membresia/     ficha, situação, família, rol, cartas
    tesouraria/    lançamento, fundo, documento fiscal, fechamento
    escala/        disponibilidade, escala mensal, convite, confirmação
    cifras/        o app atual — acervo .cifra continua em arquivo
  comum/           design system (ui.ts), datas, dinheiro, PDF
  infra/           compose, migrações, backup, seeds
```

### A regra "sem banco de dados", reformulada

Ela existe por um motivo válido: o **acervo de cifras é a fonte da verdade e vive em
arquivo de texto versionado**. Os 341 `.cifra` não vão para dentro de Postgres.

Mas disponibilidade, escala, ficha de membro e lançamento financeiro mudam o tempo
todo, precisam de histórico, de quem alterou e quando, e de transação.
Formulação nova: **acervo em arquivo, operação em banco**.

A regra *offline primeiro* também sobrevive, com escopo declarado:
**ler funciona offline; escrever não**. Confirmar presença exige conexão, e o app
diz isso em vez de fingir que salvou.

### O ponto de encontro: o culto

Hoje o servidor de cifras é sem estado e só leitura — o culto nasce na URL e o
setlist viaja no link. A escala precisa que o culto exista no banco.

**Proposta:** o app de escala é dono do `culto`; o app de cifras continua sem estado.
Da escala sai um botão *"abrir culto no painel musical"* que gera o link com o setlist
embutido. O acoplamento é uma URL, não um schema.

### Stack

Manter Node 23+ / TypeScript / Fastify / páginas renderizadas no servidor — é o que
já está de pé e o que funciona em celular ruim de igreja. Postgres.
**Sem framework novo.** `igreja_id` em toda tabela desde a primeira migração (custa
quase nada e preserva a opção de vender depois; sem tela de multi-tenant).

---

## 4. Os módulos

### A — Membresia (do zero)

Não existe cadastro. O rol de membros é papel, e ninguém sabe quantos membros ativos
a igreja tem — problema estatutário, porque o quórum de assembleia depende do rol.

- **Pessoa** no núcleo, lida pelos outros três apps.
- **Situação com histórico datado**, não campo mutável:
  `visitante → congregado → membro → afastado → transferido → falecido`.
- **Marcos**: conversão, batismo, recepção (batismo/carta/aclamação), transferência.
- **Família** — núcleo familiar com papéis.
- **Cargo e ministério** — é exatamente a tabela que o módulo de escala lê.
- **Carta de transferência** — gera o documento.
- Entrega no dia um: rol em PDF para a assembleia, busca, e **aniversariantes do mês**
  (o relatório que a secretaria mais usa, e o que mantém o cadastro vivo).

### B — Tesouraria (do zero, núcleo do projeto)

**A dor:** lança no papel, relança no Excel. Emite recibo no ato, mas a nota fiscal
chega depois — às vezes no mês seguinte. O fechamento sai errado.

**A causa:** um lançamento tem **duas datas** — a do dinheiro e a do documento — e o
Excel só guarda uma. Ou o fechamento espera a nota (e atrasa) ou fecha sem ela
(e fica errado).

Estados do lançamento:

```
Lançado → Documento pendente → Documento anexado → Conferido
```

- **Lançado** — dinheiro saiu. Data, valor, fundo, quem autorizou, comprovante provisório.
- **Documento pendente** — o caixa fecha assim mesmo.
- **Documento anexado** — NF de setembro que chega em outubro anexa ao lançamento de
  setembro; não vira lançamento novo.
- **Conferido** — segunda pessoa confere valor, CNPJ e fundo.

**A regra que conserta o fechamento:** o caixa fecha pelo movimento financeiro, que é
fato consumado, e **carrega a lista de pendências fiscais como anexo, não como
bloqueio**.

**Receitas, no vocabulário de igreja:**

- **Dízimo** — nominal, vinculado à pessoa, gera recibo e demonstrativo anual.
  *No Brasil dízimo não é dedutível no IRPF* — o recibo é pastoral, não fiscal.
  Não invista em complexidade que ninguém usa na declaração.
- **Oferta** — anônima, por culto, com **contagem a duas pessoas** registrada.
  É o controle interno que protege o tesoureiro.
- **Oferta designada** — missões, construção, ação social. Não é etiqueta: é **fundo
  com saldo próprio e restrição de uso**. O sistema impede, não só avisa.

**Norma de apoio:** ITG 2002 (R1), do CFC, para entidade sem finalidade de lucros
(inclui organização religiosa). Item 10 exige registros segregados e identificáveis
por tipo de atividade. Item 9 trata de doações e subvenções. Item 19 manda reconhecer
**trabalho voluntário pelo valor justo** — conversa a ter com o contador.

**Pacote do contador:** arquivo único no fechamento — movimento em PDF e CSV,
documentos fiscais em PDF e XML, lista de pendências, extrato por fundo. Digital.

**Ideia para matar o problema na raiz (fase 4):** com **certificado digital A1**,
consultar a **Distribuição de DFe da SEFAZ** e receber automaticamente toda NF-e
emitida contra o CNPJ da igreja — a nota chega antes do papel.
Ressalvas: cobre NF-e (mercadoria); **NFS-e é municipal** e varia por prefeitura;
o certificado é custo anual da igreja. O fluxo manual precisa funcionar sozinho antes.

### C — Escala do ministério de louvor

- **Disponibilidade por ausência, não por presença.** Padrão é disponível; marca-se
  os domingos em que *não* pode. Voluntário não preenche formulário mensal.
- **Escala mensal** por culto × função. Sugestão automática respeitando
  disponibilidade, **rodízio por quem tocou menos**, função habilitada e teto de
  escalas/mês. A máquina sugere, o diretor decide.
- **Convite → confirmação/recusa → substituto.** Recusa sem substituto é o estado
  que precisa gritar na tela.
- **Histórico** — quem tocou quando; é o que torna o rodízio justo em vez de político.
- **Notificação:** começar por link compartilhável no grupo que já existe.
  WhatsApp Business API tem custo e aprovação, e não é necessária na v1.
- **A amarração com as cifras é o diferencial**: a escala mostra o setlist e o tom, e
  abre direto no painel musical.

### D — E-mail com domínio próprio (configuração, não software)

1. Registrar o domínio **`.org.br`** no Registro.br (exige CNPJ).
2. Tentar **Google Workspace for Nonprofits** primeiro — sem custo, análise de 3 a 5
   dias úteis, exige relação clara entre missão declarada e domínio.
   *A verificar:* a página em português do Google exclui explicitamente órgão de
   governo, hospital e escola, mas **não declara a política para organização
   religiosa**. Não afirmar elegibilidade antes de submeter.
3. Plano B: Zoho Mail com domínio próprio, ou Workspace pago.
4. **Não hospedar e-mail na VPS.** Entrega, listas de bloqueio, reputação de IP e
   manutenção de SPF/DKIM/DMARC são trabalho contínuo que ninguém na igreja assume.
5. Contas por função (`secretaria@`, `tesouraria@`, `pastor@`), com os Gmail atuais
   em encaminhamento por seis meses.

**Comece esta frente na primeira semana** — é bloqueada por terceiros, e o tempo de
espera não conflita com o tempo de código.

---

## 5. Ordem de entrega

| Fase | Entrega | Critério de aceitação |
|---|---|---|
| 0 | Infra e domínio: fechar a porta 5432, Postgres novo, backup automatizado e testado, domínio registrado, e-mail submetido | Restaurar um backup em máquina limpa |
| 1 | Núcleo + Membresia | A secretaria para de usar o caderno; o rol impresso bate com o do sistema |
| 2 | Tesouraria — fluxo manual | **Dois meses em paralelo com o Excel, os dois batendo**, antes de desligar o Excel |
| 3 | Escala | A escala do mês sai sem nenhuma mensagem no grupo perguntando quem pode |
| 4 | Tesouraria — automação fiscal (A1 + DFe) | A nota entra no sistema antes do papel chegar à mesa |

**Alternativa considerada:** inverter 2 e 3, entregando escala primeiro (parte do
código existe, vitória mais rápida). Não recomendado porque a tesouraria é a dor
declarada, e escala é o único módulo com substituto gratuito no mercado — o mais
seguro de deixar por último. **Não mexer na fase 1.**

---

## 6. Importação do acervo do Drive — adiada, com gatilho

**Origem:** observação de que toda igreja guarda cifras em Google Docs no Drive,
e a ideia de um campo onde a pessoa cola o link da pasta.

### A decisão

**Nas primeiras igrejas, você mesmo faz a migração**, com os scripts que já existem.
Nenhuma tela precisa ser construída para vender.

**Gatilho para reabrir:** quando a migração manual passar de **um dia de trabalho por
igreja**, ou na **quarta igreja** — o que vier primeiro.

**Por que migração como serviço é melhor, e não só mais barata:**

- Remove a maior objeção da venda: *"me manda a pasta que eu trago tudo"*.
- Acervo estranho vira descoberta, não cliente perdido em silêncio.
- Você ainda não sabe o que automatizar — um acervo (o seu) não é amostra.

**Instrumente cada migração:** tempo gasto, causas de falha, quantas exigiram
curadoria. É o que transforma o gatilho em decisão com evidência.

### O que continua valendo mesmo com o adiamento

- **`acervo/<igreja>/`** — necessário para a segunda igreja existir, com ou sem
  import. O `importar-lote.mjs` já recebe o destino por parâmetro.
- **A tela de curadoria** — os 59 arquivos que não entram são trabalho *seu* em toda
  migração manual. Texto cru à esquerda, resultado à direita, corrigir e reimportar
  um arquivo só. **Se paga na segunda migração**, e é a mesma tela que a
  funcionalidade vai precisar depois.
- **Um motor só** — quando a funcionalidade chegar, ela envolve o `acervoDrive.mjs`
  numa tela. Não construir um segundo caminho.

### A pesquisa, para não ser refeita

**O escopo de OAuth decide a funcionalidade inteira:**

| Escopo | Classificação | Custo |
|---|---|---|
| `drive.readonly` (colar o link) | **restrito** | Avaliação CASA anual e permanente; relatos de ~US$ 540/ano no laboratório mais barato, 2 a 6 semanas, repetido a cada 12 meses |
| `drive.file` (Picker do Google) | **não-sensível** | Nenhuma CASA. É o escopo que o Google marca como recomendado |
| nenhum (envio de zip) | n/a | Zero |

**A ironia:** colar o link é o caminho mais caro. O seletor do próprio Google resolve
a mesma necessidade com UX melhor e escopo gratuito.

**Não pedir para a igreja tornar a pasta pública.** Seria instruir cada cliente a
publicar na web aberta uma pasta com centenas de letras protegidas — o oposto do
limite jurídico que o `rumo.md` defende.

**Incerteza declarada:** não foi possível confirmar na documentação do Google se
selecionar uma **pasta** no Picker com `drive.file` concede acesso aos arquivos
**dentro** dela. É meia hora de protótipo — fazer **quando** for construir, não antes.

**A armadilha de fidelidade que o repositório já pagou** (`bruto/MANIFESTO.md`):
ler Google Docs pela via normal devolve markdown, que escapa **todo sustenido como
`\#`**, fabrica `**` a partir do negrito e troca CRLF por `\n\n`.
Regra herdada: exportar como `text/plain`. Aceitação: *hexdump com `#` literal,
BOM e CRLF preservados*.

**O zip do Drive traz `.docx`, não texto.** Isso escapa do bug do `\#`, mas cria
outro risco: **linha posicional depende de espaços múltiplos**, e extração que
colapsa espaços desalinha o acorde da sílaba, em silêncio.
Teste: exportar um documento já convertido como `.docx`, extrair, e exigir igualdade
byte a byte com o `.txt` cru em `bruto/txt/`.

**Outros achados:** o Apps Script atual exclui subpastas por construção
(`getFiles()` não é recursivo) — num produto, subpasta é regra. E **80% do motor já
existe**: `acervoDrive.mjs`, `medir-importacao.mjs`, `analisar-duplicatas.mjs`,
`importar-lote.mjs`, testados contra 421 documentos reais (86% de taxa, 341 `.cifra`,
21 cópias descartadas, 59 pendentes de curadoria).

### Perguntar ao amigo da outra igreja

É a única amostra de um acervo que não é o seu:

- A pasta tem subpastas? (a sua tinha: `Cultos`, `docx-originais`)
- São Google Docs nativos ou `.docx` enviados? (na sua, 399 de 400 eram nativos)
- O nome do arquivo carrega tom e tessitura? (`_C_masculino`)
- Quantos arquivos, e quantas músicas distintas? (na sua, 421 → 341)
- **Peça uma cópia de dez documentos.** Vale mais que as quatro respostas juntas.

---

## 7. LGPD — não é detalhe de rodapé

Cadastro de membros de igreja é, **por definição legal**, banco de dado pessoal
sensível: a LGPD, no **art. 5º, II**, lista textualmente *"convicção religiosa"* e
*"filiação a organização de caráter religioso"*.

**Ao contrário do GDPR (art. 9.2.d), a LGPD não tem exceção para entidade
religiosa** — aplica-se sem carve-out. As bases praticáveis do **art. 11** são o
**consentimento específico e destacado** (inciso I) e, em parte da doutrina, a
**execução de contrato** (o vínculo associativo). Há divergência real:
**traga um parecer antes de decidir a base.**

**O que isso obriga no código, em qualquer das bases:**

- **Consentimento é campo, com data e versão do texto aceito** — não é caixinha.
- **Foto de menor exige consentimento de quem tem a guarda**, separado.
- **Auditoria de acesso** — quem abriu a ficha de quem. Em comunidade pequena o risco
  real é interno.
- **Papéis com escopo estreito** — tesoureiro não vê ficha pastoral; secretaria não vê
  contribuição nominal; líder de ministério vê só o próprio ministério.
- **Eliminação e portabilidade**, com a exceção honesta da retenção estatutária do rol.

**Cláusula de contrato:** a igreja é **controladora**, você é **operador**
(art. 5º, VI e VII); o art. 39 exige tratamento conforme instrução do controlador.
Inclusive o que acontece com os dados se a prestação acabar.
**É a cláusula que protege você.**

### Obrigações contábeis — o que não prometer

A imunidade tributária (CF, art. 150, VI, "b") afasta impostos, **não afasta
obrigações acessórias nem escrituração**. Com empregados ou ministro remunerado
entram eSocial, DCTFWeb e EFD-Reinf; a ITG 2002 (R1), item 22, lista as
demonstrações exigidas (BP, DRE, DMPL, DFC, Notas Explicativas).

**Deixar explícito na proposta:** o sistema é **controle de caixa e origem de
documento**, e alimenta o contador. Não é escrituração contábil, não gera
demonstração, não substitui contador.

---

## 8. Riscos

| Risco | Por que é real | Mitigação |
|---|---|---|
| Escopo | Quatro frentes, um desenvolvedor. O maior risco e o mais provável | Contrato por fase, com aceite e pagamento por fase |
| Erro em dinheiro | Bug na tesouraria vira desconfiança sobre pessoas, não sobre software | Dois meses em paralelo com o Excel; trilha de auditoria imutável — lançamento se estorna, nunca se apaga |
| Voluntário não usa | Software de igreja morre por abandono; login é a barreira que mata | Escala e disponibilidade por link, sem senha. Login só onde há dado sensível |
| Você é o único | Se você sair, a igreja fica com um sistema que ninguém opera — e com os dados dela dentro | Repositório e backups em conta da igreja desde o dia um; documentar como restaurar |
| Postgres exposto | `biblioteca-postgres` já está em `0.0.0.0:5432` na VPS, e vai passar a guardar dado sensível e financeiro | Fase 0, antes de qualquer código novo |

---

## 9. O que ainda precisa ser respondido

**Com o contador**

- A nota atrasada entra em qual mês — reemite o pacote fechado ou entra no seguinte
  com referência cruzada? Define o modelo de fechamento.
- O sistema registra trabalho voluntário (ITG 2002 R1, item 19)?

**Com a igreja**

- Quem pode ver contribuição nominal — tesoureiro, pastor, conselho?
  É governança antes de ser permissão no código.
- O CNPJ está regular e há certificado digital? (domínio `.org.br`, Workspace
  for Nonprofits, e automação de NF-e da fase 4)

**Com você**

- Quem é dono do código? Licença de uso para a igreja com a propriedade ficando com
  você é o arranjo que preserva as duas coisas — e precisa estar no contrato.
- A fase 3 (escala) sobe para segunda? É a única inversão que eu consideraria.

---

## 10. Próximo passo pendente desta conversa

Escrever no repositório, em `docs/rumo.md` e `CLAUDE.md`:

1. Reversão da decisão sobre **escalas**, com o dado corrigido do Planning Center.
2. Entrada da **importação adiada**, com motivo e gatilho.
3. Reformulação da regra **"sem banco de dados"** → *acervo em arquivo, operação em
   banco*.

---

## Referências

**Documentos produzidos nesta conversa**

- Plano do projeto — https://claude.ai/code/artifact/8e108064-87e3-4224-aae3-f38299da83bb
- Especificação da importação — https://claude.ai/code/artifact/32c56554-aa15-4718-95ad-22cb23412a75

**Fontes externas**

- CFC — [ITG 2002 (R1), Entidade sem Finalidade de Lucros](https://intranet.mprj.mp.br/documents/112957/15346886/itg_2002_r1.pdf) (itens 9, 10, 19, 22)
- Planalto — [Lei 13.709/2018 (LGPD)](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm), art. 5º II e VI–VII, art. 11, art. 39
- ConJur — [Adequação de igrejas e instituições religiosas à LGPD](https://www.conjur.com.br/2021-mar-15/opiniao-adequacao-igrejas-instituicoes-religiosas-lgpd/)
- IPB — [Proteção de dados na igreja e nos concílios](https://www.ipb.org.br/content/Downloads/LGPD_VF.pdf)
- Google — [Choose Google Drive API scopes](https://developers.google.com/workspace/drive/api/guides/api-specific-auth)
- Google — [Restricted scope verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification) e [Security Assessment](https://support.google.com/cloud/answer/13465431?hl=en)
- Google — [Ativar o Google Workspace for Nonprofits](https://support.google.com/nonprofits/answer/3367223?hl=pt-br) e [elegibilidade](https://www.google.com/nonprofits/eligibility/)
- ChurchMemberPro — [Planning Center Pricing 2026](https://churchmemberpro.com/blog/planning-center-pricing-guide/)
- Relato de custo de CASA — [What I wish I'd known before touching an OAuth restricted scope](https://yurudeep.com/posts/aicoding/2026/20260717/en/)

**Do repositório `cifras-app`**

`CLAUDE.md` · `PRODUCT.md` · `DESIGN.md` · `docs/rumo.md` ·
`docs/achados-google-docs.md` · `docs/plano-camada-formato.md` ·
`bruto/MANIFESTO.md` · `docker-compose.yml` · `scripts/acervoDrive.mjs`
