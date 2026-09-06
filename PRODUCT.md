# Product

## Register

product

## Users

**O diretor musical** prepara o culto sentado, no computador, dias antes: escolhe
as músicas, define o tom de cada uma, ordena a setlist. É ele quem conhece o
acervo inteiro e quem responde quando o tom não serve para a voz do dia.

**A banda** — vocal, teclado, violão, baixo, bateria — executa em pé, com o
celular ou tablet na estante, lendo a uma distância de braço, sob luz de palco,
quase sempre com as mãos ocupadas no instrumento. Níveis técnicos e idades
muito diferentes: parte da banda não é de músicos profissionais.

O trabalho a ser feito é um só, em dois momentos: **preparar o culto no
computador e executar o culto pelo celular.** Entre os dois momentos o que
atravessa é um link — a rede da igreja não é confiável e o servidor é só
leitura, sem estado.

A partir do sprint 4, o mesmo par de papéis se repete em **outras igrejas**: o
produto deixa de ser ferramenta de uma banda e passa a ser vendido.

## Product Purpose

Guardar cada música **uma vez** e transpor para qualquer tom na hora de exibir —
substituindo a pasta de Google Docs onde cada tom era um arquivo novo e cada
correção precisava ser feita em cinco lugares.

Sucesso, hoje, tem critério concreto e verificável: **a banda de origem para de
usar Google Docs**. Depois disso, sucesso é outra igreja fazer o mesmo sem que
ninguém deste projeto esteja na sala.

O que o produto entrega que uma pasta de arquivos não entrega: transposição com
grafia enarmônica correta, setlist que viaja por link para a estante, e uma tela
de execução que existe só para ser lida no palco.

## Brand Personality

**Confiável · direto · sem cerimônia.**

É ferramenta de trabalho num momento que não admite improviso. A tela não pede
atenção; ela responde. O tom de voz é o do diretor musical falando com a banda:
frases curtas, vocabulário de música em português (tom, cifra, refrão, culto,
setlist), nada de linguagem de software.

Emocionalmente o alvo é **certeza**: quem abre a cifra no palco não deve ter um
segundo de dúvida sobre qual música, qual tom, qual seção. A interface não
celebra, não parabeniza, não anima nada que não seja mudança de estado.

A marca — Integra Music, gradiente azul→verde-lima sobre navy — entra na
identidade cromática do produto, mas o **laranja `#ff6600` da cifra é anterior à
marca e não se mexe**: é o padrão visual do papel, validado em produção, e a
banda o reconhece de longe. Detalhes de aplicação vão para `DESIGN.md`.

## Anti-references

- **SaaS genérico de dashboard.** Grade de cards iguais, big-number hero, stats
  de apoio, gradiente roxo, ilustração de estoque. Este produto é operação, não
  relatório: não há métrica para exibir e inventar uma seria mentira.
- **App de karaokê ou player de música.** Neon, animação festiva, visualizador
  de onda, capa de álbum. O contexto é culto, não show.
- **Sites de cifra (Cifra Club e afins).** Anúncio, densidade caótica, cromo
  acumulado em volta da cifra. Aqui a cifra é a única coisa que importa na tela.
- **Google Docs com botões em volta.** É de onde a banda está saindo. Se a tela
  parecer o documento antigo com cromo web, não houve produto — houve migração.

Coisas que já foram tentadas e recusadas dentro do próprio projeto, e continuam
recusadas: duração por música, tema, horário, "salvo há 2 min", alça de
arrastar, foto de perfil. **Tela cheia de palpite é pior que tela honesta e mais
vazia** — nenhum desses dados existe.

## Design Principles

1. **O dado manda na tela.** A interface só mostra o que existe no acervo. Campo
   que o dado não tem não vira rótulo cinza de enfeite, e a tela diz por que
   está ausente em vez de preencher com estimativa.

2. **Duas experiências, um vocabulário.** Preparação (desktop, claro) e execução
   (celular, escuro) são os mesmos tokens com valores diferentes, nunca dois
   CSS. É o que faz as duas metades do produto se reconhecerem — e é por isso
   que a lateral escura existe no modo claro.

3. **No palco, a cifra é a tela inteira.** No modo ao vivo pelo celular tudo que
   não for a cifra é subordinado: cromo mínimo, alvo grande, nada que exija
   precisão de toque. Todo pixel gasto com interface é pixel tirado da leitura.

4. **Sem conexão ainda é culto.** A cifra está no aparelho antes de começar.
   Cair a rede pode custar o "o tom mudou", nunca a música. Na prática: links de
   verdade, funcionamento sem JavaScript, nada que dependa de ida ao servidor
   para ler.

5. **A promessa da tela é a verdade do sistema.** Botão que diz "salvar" salva
   onde diz salvar — e diz em qual aparelho. Não se promete nuvem, sincronia ou
   compartilhamento que o servidor sem estado não faz. Mentira de rótulo só se
   descobre no celular do outro músico, durante o culto.

## Accessibility & Inclusion

**WCAG 2.2 AA como piso, com um requisito próprio acima dele: legibilidade de
palco.**

- Contraste ≥4.5:1 em texto de corpo e ≥3:1 em texto grande, incluindo
  placeholder. Na **cifra e na letra o alvo é folgado, não no limite** — a
  leitura acontece a um braço de distância, com luz baixa, por músico de 50+ e
  muitas vezes sem óculos.
- Escala de fonte controlável (`A−`/`A+`) persistida no aparelho. O padrão não é
  12pt: 12pt é medida de papel.
- Alvo de toque mínimo de 44px em toda ação; nada que exija precisão com as mãos
  ocupadas. Seletor de tom é fila de botões que rola, não menu suspenso.
- Foco visível em todo elemento interativo e operação completa por teclado —
  as setas navegam entre músicas na execução.
- `prefers-reduced-motion` respeitado em toda animação, sem exceção; o autoscroll
  da cifra é opt-in e para ao toque.
- Modo escuro é **decisão**, não preferência do sistema, na execução: o palco é
  escuro. O modo claro continua disponível e a escolha persiste no aparelho.
- Cor nunca é o único portador de informação: estado ao vivo, tom e seção têm
  rótulo em texto além da cor — parte da banda tem daltonismo não declarado, e o
  gradiente azul→verde da marca é justamente o eixo mais arriscado.
