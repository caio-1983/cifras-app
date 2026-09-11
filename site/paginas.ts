/**
 * As telas de **preparação** do painel: culto, biblioteca, busca, histórico,
 * cifra solta, configurações. A tela de **execução** é outro módulo
 * (`site/execucao.ts`) porque é outra experiência, não uma variação desta.
 *
 * A cifra em si NÃO é renderizada aqui — sai de
 * `gerador-ts/html.ts::escrever`, o emissor portado e travado byte a byte
 * contra o Python em `tests/emissorPort.test.ts`. Este módulo só põe o painel
 * em volta. Mesma disciplina para o CSS: as cores e a Arial vêm da constante
 * `CSS` do emissor; o que se acrescenta vive em `@media screen`, para que
 * **imprimir continue produzindo o documento validado em produção**.
 *
 * Estado
 * ------
 * O servidor é só leitura e sem estado. A setlist efetiva chega pelo
 * `?ordem=` (ver `site/setlist.ts`) e cada ação — reordenar, remover,
 * adicionar, transpor, escolher a música atual — é um **link de verdade** que
 * já carrega o `?ordem=` resultante. Sem JavaScript o painel inteiro
 * funciona; com JavaScript o rascunho ainda persiste no aparelho
 * (`localStorage`) e o link fica pronto para copiar para o celular.
 */
import { CSS, escrever, esc } from '../gerador-ts/html.ts';
import type { MusicaIndexada, Repertorio } from './repertorio.ts';
import {
  NOME_MES,
  PERIODOS,
  PERIODOS_OFERECIDOS,
  identidadeDoCulto,
  segmentoCulto,
  type Culto,
  type EntradaCulto,
} from './cultos.ts';
import { TONS, passoDeTom } from './tons.ts';
import { codificarOrdem } from './setlist.ts';
import type { ProblemaSetlist } from './setlistTexto.ts';
import { CSS_UI, CSS_CIFRA, paginaPainel, envelope, icone, botaoTema } from './ui.ts';

/** CSS das telas de preparação. Só tela — o papel não conhece nada disto. */
const CSS_PREPARO = `
@media screen{
  /* ------------------------------------------------ cabeçalho do culto */
  .culto-topo{display:flex;flex-wrap:wrap;align-items:center;gap:14px;
      padding-bottom:16px;border-bottom:1px solid var(--line)}
  .culto-topo .quem{flex:1 1 240px;min-width:0}
  .culto-topo h1{font-size:24px;letter-spacing:-.02em}
  .culto-topo .sub{margin:5px 0 0;color:var(--muted);font-size:13.5px}
  .culto-topo .acoes{display:flex;align-items:center;gap:10px;flex-wrap:wrap}

  /* Setlist e música atual lado a lado: o mockup põe as duas num olhar só, e
     é o que a preparação pede — mexer na ordem sem perder a cifra de vista.
     Abaixo de 1080px voltam a empilhar, com a setlist primeiro. */
  .culto-grade{display:grid;gap:16px;margin-top:18px;align-items:start}
  @media (min-width:1080px){
    .culto-grade{grid-template-columns:minmax(0,1fr) minmax(0,1.08fr)}
    /* Grudado no topo e limitado à viewport: quem rola é a prévia, para o
       título e os passos ficarem sempre à mão enquanto se confere a cifra. */
    .culto-grade .atual{position:sticky;top:24px;display:flex;
        flex-direction:column;max-height:calc(100vh - 48px)}
    .culto-grade .atual .previa{flex:1 1 auto;min-height:0}
  }
  /* No celular a ação principal do culto ocupa a largura: é o alvo que se
     acerta com o polegar, de pé. */
  @media (max-width:560px){
    .culto-topo .acoes{width:100%}
    .culto-topo .acoes .btn-grande{flex:1 1 auto}
  }

  /* Estado quieto quando a ordem é a do culto; o azul da marca fica reservado
     para a setlist alterada, que é o que precisa ser notado. */
  .rascunho{display:flex;flex-wrap:wrap;align-items:center;gap:10px;
      margin-top:14px;padding:10px 14px;border-radius:var(--raio);
      background:var(--surface);border:1px solid var(--line);
      color:var(--muted);font-size:13.5px}
  .rascunho b{color:var(--ink)}
  .rascunho[data-estado=alterada]{background:var(--acento-fraco);
      border-color:transparent;color:var(--ink)}
  .rascunho[data-estado=alterada] b{color:var(--acento)}
  /* "Criei manhã e noite" é confirmação, não alerta: fica no tom quieto, e o
     que ganha ênfase é o botão que leva ao outro culto. */
  .rascunho[data-estado=irmaos] b{color:var(--acento)}
  .rascunho .btn{min-height:36px;padding:6px 12px;font-size:13px}

  /* ------------------------------------------------ setlist */
  .setlist{list-style:none;margin:0;padding:0}
  /* No estreito o título fica com a linha inteira e os controles descem para
     uma faixa própria. Antes o tom dividia a primeira linha com o nome, e o
     que sobrava para o título eram ~150px — "EU VOU CONSTRUIR" virava
     reticências. Descer a faixa também é o que dá espaço para o alvo de 44px
     sem encostar um controle no outro. */
  .setlist li{display:grid;
      grid-template-columns:auto auto minmax(0,1fr) auto;
      grid-template-areas:"marca num nome nome" "ctl ctl ctl ctl";
      align-items:center;gap:6px 10px;padding:12px 14px;
      border-bottom:1px solid var(--line)}
  /* A faixa de controles do estreito. \`space-between\` em vez de coluna de
     grade porque a coluna \`minmax(0,1fr)\` encolhia sob o conteúdo e fazia o
     grupo do tom transbordar até encostar nas setas — medido 0px de folga a
     360px, pior que os 4px que a correção veio consertar. */
  .setlist .controles{grid-area:ctl;display:flex;align-items:center;
      justify-content:space-between;gap:12px;min-width:0}
  .setlist li:last-child{border-bottom:0}
  /* A barra de acento de 3px na borda saiu: era redundante — o fundo
     \`--acento-fraco\`, o \`▶\` e o número em acento já dizem qual é a música
     atual, três vezes. Barra lateral colorida em item de lista é decoração
     com cara de sistema, e este realce não precisava dela. */
  .setlist li[data-atual=true]{background:var(--acento-fraco)}
  .setlist .marca{grid-area:marca;width:14px;text-align:center;
      color:var(--acento);font-size:11px;line-height:1}
  .setlist .num{grid-area:num;font-family:ui-monospace,Menlo,monospace;
      font-size:13px;font-weight:700;color:var(--muted);min-width:22px}
  .setlist li[data-atual=true] .num{color:var(--acento)}
  .setlist .nome{grid-area:nome;min-width:0;text-decoration:none;display:block}
  .setlist .nome b{display:block;font-size:15.5px;font-weight:600;
      line-height:1.25;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .setlist .nome span{display:block;margin-top:2px;color:var(--muted);
      font-size:12.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  /* display:inline explícito: a regra acima faz de todo span um bloco, e o
     momento tem que ficar na mesma linha do artista. */
  .setlist .nome span.papel{display:inline;color:var(--anot);font-weight:600}
  .setlist .tom{grid-area:tom;display:flex;align-items:center;gap:4px}
  /* O menu de tom é absoluto: o cartão da setlist não pode recortá-lo. */
  .setlist-cartao{overflow:visible}
  .menu-tom{position:relative}
  .menu-tom>summary{list-style:none;cursor:pointer}
  .menu-tom>summary::-webkit-details-marker{display:none}
  .menu-tom[open]>summary{background:var(--acento);color:#fff}
  /* Só no estreito, onde o menu é folha: o véu escurece a página e explica
     sozinho que tocar fora fecha. Na faixa larga o menu abre ao lado sem
     tapar nada, e véu ali seria drama por nada. */
  @media (max-width:699px){
    .menu-tom[open]::before{content:"";position:fixed;inset:0;z-index:55;
        background:rgba(10,12,20,.45)}
  }
  /* As outras linhas recuam enquanto um menu está aberto. É par visual do
     \`inert\` que o script põe nelas: antes dava para clicar no \`+\` da música
     2 com o menu da 1 aberto e transpor a música errada sem perceber. */
  .setlist[data-menu-aberto] li{transition:opacity .15s ease-out}
  .setlist[data-menu-aberto] li:not([data-menu-dono]){opacity:.45}
  @media (prefers-reduced-motion:reduce){
    .setlist[data-menu-aberto] li{transition:none}
  }
  :root[data-theme=dark] .menu-tom[open]>summary{color:#0b1220}
  @media (prefers-color-scheme:dark){
    :root:not([data-theme=light]) .menu-tom[open]>summary{color:#0b1220}
  }
  /* ONDE o menu abre é decisão de conteúdo, não de conveniência de CSS.
     Ele cobria as músicas de baixo — e a informação escondida era justamente
     a que se precisa ao transpor: o tom das OUTRAS músicas do culto. Quem
     troca o tom da 3 está comparando com o da 2 e o da 4.

     Na faixa larga ele passa a abrir à DIREITA da pastilha, sobre a coluna
     de ações, onde não mora nenhum tom. As pastilhas das demais linhas ficam
     à esquerda do menu e continuam visíveis. No estreito vira folha inferior:
     sobe do rodapé, na zona do polegar, e a lista continua legível acima. */
  .menu-lista{position:fixed;left:0;right:0;bottom:0;top:auto;z-index:60;
      display:grid;grid-template-columns:repeat(4,minmax(44px,1fr));gap:8px;
      padding:14px 14px calc(14px + env(safe-area-inset-bottom));
      border-radius:16px 16px 0 0;background:var(--surface);
      border:1px solid var(--line);border-bottom:0;
      box-shadow:0 -8px 20px rgba(10,12,20,.30)}
  @media (min-width:700px){
    .menu-lista{position:absolute;left:calc(100% + 8px);right:auto;top:50%;
        bottom:auto;transform:translateY(-50%);width:216px;
        grid-template-columns:repeat(4,minmax(46px,1fr));gap:4px;padding:8px;
        border-radius:12px;border-bottom:1px solid var(--line);
        box-shadow:0 8px 20px rgba(10,12,20,.28)}
  }
  .menu-lista a{display:flex;flex-direction:column;align-items:center;
      justify-content:center;gap:1px;min-height:44px;border-radius:8px;
      background:var(--raised);color:var(--ink);text-decoration:none;
      font-family:ui-monospace,Menlo,monospace;font-weight:700;font-size:15px}
  .menu-lista a:hover{background:var(--acento-fraco)}
  /* O tom escolhido usa o laranja da cifra, como o seletor da página da
     música: aqui o tom é ESCOLHA sobre a cifra, não etiqueta de lista. */
  .menu-lista a[aria-current=true]{background:var(--cifra);color:#0b1220}
  .menu-lista a[aria-current=true] .enar{color:inherit;opacity:.8}
  .menu-lista .origem{box-shadow:inset 0 -3px 0 var(--cifra)}
  .menu-lista .enar{font-family:var(--sans);font-weight:500;font-size:11px;
      color:var(--muted);line-height:1}
  .menu-abrir{grid-column:1/-1;margin-top:2px;min-height:40px!important;
      font-family:var(--sans)!important;font-size:13px!important;
      font-weight:600!important;color:var(--muted)!important;
      background:transparent!important}
  .menu-abrir:hover{color:var(--ink)!important;background:var(--raised)!important}
  .setlist .tom .passo{width:30px;height:30px;display:grid;place-items:center;
      border-radius:8px;color:var(--muted);text-decoration:none;font-weight:700;
      font-size:15px;background:var(--raised)}
  .setlist .tom .passo:hover{color:var(--ink)}
  .setlist .acoes{grid-area:acoes;display:flex;justify-content:flex-end;gap:2px}
  .setlist .acoes a,.setlist .acoes span{width:34px;height:34px;display:grid;
      place-items:center;border-radius:8px;color:var(--muted);
      text-decoration:none;font-size:14px}
  .setlist .acoes a:hover{background:var(--raised);color:var(--ink)}
  .setlist .acoes .remover:hover{color:var(--alerta)}
  /* A 25% a seta sumia. Ela é \`aria-hidden\` e não recebe foco — é reserva de
     espaço — mas "não dá para subir a primeira" é informação, e informação
     invisível não informa. Mesmo tratamento do \`.passos .desligado\`. */
  .setlist .acoes span{color:var(--muted);opacity:.5}
  @media (min-width:700px){
    .setlist li{grid-template-columns:auto auto minmax(0,1fr) auto auto;
        grid-template-areas:"marca num nome tom acoes"}
    /* O envoltório se dissolve: tom e ações voltam a ser itens da grade da
       linha, exatamente como antes de ele existir. */
    .setlist .controles{display:contents}
    /* Tom e ações são grupos diferentes: um mexe na música, o outro na ordem.
       A separação é o que impede errar o alvo com a mão apressada. */
    .setlist .acoes{margin-left:14px;padding-left:12px;
        border-left:1px solid var(--line)}
    .setlist li[data-atual=true] .acoes{border-left-color:transparent}
  }


  .adicionar{margin:0}
  .adicionar summary{display:inline-flex;list-style:none;cursor:pointer;
      min-height:38px;padding:0 13px;font-size:13.5px}
  .adicionar summary::-webkit-details-marker{display:none}
  .adicionar .caixa{margin-top:12px;padding:14px;border:1px solid var(--line);
      border-radius:14px;background:var(--surface)}
  /* Dentro do cartão a caixa de adicionar é rodapé, não cartão aninhado. */
  .cartao-rodape .adicionar .caixa{border:0;padding:0;background:none}
  .escolher{list-style:none;margin:12px 0 0;padding:0;max-height:320px;
      overflow-y:auto}
  .escolher a{display:flex;align-items:center;gap:12px;padding:10px 8px;
      border-radius:8px;text-decoration:none}
  .escolher a:hover{background:var(--raised)}
  .escolher .nome{flex:1 1 auto;min-width:0}
  .escolher .nome b{display:block;font-size:14.5px;font-weight:600}
  .escolher .nome span{display:block;color:var(--muted);font-size:12.5px}

  /* ------------------------------------------------ música atual */
  .atual .cartao-topo h3{font-size:21px;letter-spacing:-.015em}
  .atual .etiquetas{display:flex;flex-wrap:wrap;align-items:center;gap:7px;
      margin-top:7px}
  .atual .etiquetas .chip{min-height:28px;padding:0 11px;font-size:12.5px}
  /* A prévia é conferência, não leitura de palco: escala própria, menor que a
     da execução, para caber mais música na tela. O --esc local vence o que o
     controle de fonte põe no <html> porque está mais perto do elemento. */
  .previa{--esc:1;max-height:56vh;overflow:auto;padding:16px}
  .passos{display:flex;align-items:center;justify-content:space-between;gap:10px;
      padding:12px 16px;border-top:1px solid var(--line);background:var(--ground)}
  .passos .conta{font-family:ui-monospace,Menlo,monospace;font-size:13px;
      font-weight:700;color:var(--muted)}
  .passos .btn{min-height:40px}
  /* Cor explícita em vez de \`opacity:.35\`: a 35% o rótulo ficava ilegível, e
     saber que "Anterior" existe (e está no fim) é informação. Desligado se lê
     pela ausência de borda e pelo tom apagado, não por quase sumir. */
  .passos .desligado{color:var(--muted);border-color:transparent;
      background:transparent;cursor:default}

  /* ------------------------------------------------ biblioteca */
  /* Campo, filtros e lista vivem no mesmo cartão: procurar é uma ação só. */
  .busca-topo{display:grid;gap:12px;padding:16px;
      border-bottom:1px solid var(--line)}
  /* Três campos lado a lado no computador, empilhados no celular. */
  .campos-busca{display:grid;gap:10px;
      grid-template-columns:repeat(auto-fit,minmax(180px,1fr))}
  .campo-busca{display:grid;gap:5px;font-size:12px;font-weight:600;
      color:var(--muted);text-transform:uppercase;letter-spacing:.04em}
  /* O seletor de tema herda a classe .campo inteira e acrescenta só a seta:
     filtrar por tema é irmão de filtrar por nome, e tem que parecer. A seta é
     desenhada em gradiente para não depender de imagem externa. */
  .campo-select{appearance:none;-webkit-appearance:none;cursor:pointer;
      padding-right:36px;
      background-image:linear-gradient(45deg,transparent 50%,currentColor 50%),
          linear-gradient(135deg,currentColor 50%,transparent 50%);
      background-position:calc(100% - 20px) calc(50% + 1px),
          calc(100% - 15px) calc(50% + 1px);
      background-size:5px 5px;background-repeat:no-repeat}
  .lista{list-style:none;margin:0;padding:0}
  .lista li{border-bottom:1px solid var(--line)}
  .lista li:last-child{border-bottom:0}
  .lista a{display:flex;align-items:center;gap:12px;min-height:64px;
      padding:10px 16px;text-decoration:none}
  .lista a:hover{background:var(--raised)}
  .lista .nome{flex:1 1 auto;min-width:0}
  .lista .nome b{display:block;font-size:16px;font-weight:600;line-height:1.25}
  .lista .nome span{display:block;margin-top:2px;color:var(--muted);font-size:13px}

  /* ------------------------------------------------ hinário */
  /* O número do hino é o identificador, e a coluna dele é o que o olho
     percorre — é assim que se lê o índice de um hinário impresso. Largura
     fixa e tabular-nums para 25, 66 e 422 empilharem pela unidade; se
     cada número tivesse a largura do próprio texto, a coluna serrilharia e
     deixaria de ser coluna. Alinhado à direita pelo mesmo motivo.
     Tratamento exclusivo desta tela: em nenhuma outra o número identifica.
     Sem régua separando do título: os números alinhados já são a coluna, e
     um filete que só se enxerga de perto é decoração, não estrutura. */
  .num-hino{flex:0 0 auto;width:3.6ch;text-align:right;
      font-variant-numeric:tabular-nums;font-feature-settings:"tnum";
      font-size:19px;font-weight:600;line-height:1;color:var(--ink)}
  /* A linha do hinário tem UMA linha de texto, não duas: os 64px da lista de
     músicas foram medidos para título + artista, e aqui virariam ar. Índice
     se lê por densidade. Continua acima dos 44px de alvo de toque. */
  #hinos a{min-height:52px}
  .contagem{margin:18px 0 0;max-width:68ch;color:var(--muted);font-size:13px}

  /* ------------------------------------------------ cifra solta */
  .cifra-topo{position:sticky;top:0;z-index:15;display:flex;align-items:center;
      gap:8px;padding:9px 12px;background:var(--surface);
      border-bottom:1px solid var(--line)}
  .cifra-topo .quem{flex:1 1 auto;min-width:0}
  .cifra-topo .quem b{display:block;font-size:15px;font-weight:700;
      overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .cifra-topo .quem span{display:block;font-size:12px;color:var(--muted);
      overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .seletor-tons{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;
      -webkit-overflow-scrolling:touch;padding:9px 12px;background:var(--surface);
      border-bottom:1px solid var(--line);position:sticky;top:59px;z-index:14}
  .seletor-tons::-webkit-scrollbar{display:none}
  .seletor-tons a{flex:0 0 auto;min-width:54px;min-height:48px;display:flex;
      flex-direction:column;align-items:center;justify-content:center;gap:1px;
      border-radius:var(--raio);background:var(--raised);color:var(--ink);
      text-decoration:none;font-weight:700;font-size:16px;padding:0 10px;
      font-family:ui-monospace,Menlo,monospace}
  .seletor-tons a .enar{font-family:var(--sans);font-weight:500;font-size:11px;
      color:var(--muted);line-height:1}
  .seletor-tons a[aria-current=true]{background:var(--cifra);color:#0b1220}
  .seletor-tons a[aria-current=true] .enar{color:inherit;opacity:.8}
  .seletor-tons .origem{box-shadow:inset 0 -3px 0 var(--cifra)}
  /* A cifra solta sai do chão e vai para a superfície. Não é enfeite: sobre
     \`--ground\` o laranja \`#ff6600\` mede 2,73:1 e sobre o branco 2,94:1 — o
     mesmo do papel. O fundo tingido do painel estava piorando a leitura da
     cifra em relação à folha impressa, e a cifra é o que se veio ler. */
  .cifra-solta{padding:16px 14px 40px;background:var(--surface);min-height:70vh}
  .grupo-fonte{display:flex;gap:4px;flex:0 0 auto}
  .grupo-fonte button{min-width:42px;min-height:40px;border-radius:8px;
      background:var(--raised);font-weight:700;font-size:14px}

  /* ------------------------------------------------ histórico */
  .cultos{list-style:none;margin:14px 0 0;padding:0;display:grid;gap:10px}
  .cultos a{display:flex;align-items:center;gap:14px;padding:15px;
      border:1px solid var(--line);border-radius:14px;background:var(--surface);
      text-decoration:none}
  .cultos a:hover{border-color:var(--acento)}
  .cultos .nome{flex:1 1 auto;min-width:0}
  .cultos .nome b{display:block;font-size:16px;font-weight:600}
  .cultos .nome span{display:block;margin-top:2px;color:var(--muted);font-size:13px}
  .cultos .tons{display:flex;gap:5px;flex-wrap:wrap;justify-content:flex-end}
  /* O culto do aparelho traz um botão fora do link — o link é o cartão
     inteiro, e "Apagar" não pode ser um clique errado dentro dele. */
  .cultos li{display:flex;align-items:center;gap:10px}
  .cultos li>a{flex:1 1 auto;min-width:0}
  .cultos li>.btn{flex:0 0 auto;min-height:38px;padding:0 13px;font-size:13px}

  /* ------------------------------------------------ abrir culto */
  .criar-culto{margin:14px 0 24px}
  .form-criar{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:16px}
  .form-criar label{display:grid;gap:6px;min-width:0;color:var(--muted);
      font-size:13px;font-weight:600}
  .form-criar label.larga{grid-column:1/-1}
  .form-criar .opc{font-weight:500;text-transform:none}
  .form-criar .campo{color:var(--ink)}
  .modal-acoes{grid-column:1/-1;display:flex;justify-content:flex-end;gap:8px;
      margin-top:2px}
  .modal-acoes .btn{min-height:48px}
  @media (max-width:560px){
    .form-criar{grid-template-columns:1fr}
    .modal-acoes .btn{flex:1 1 auto}
  }

  /* O modal é o mesmo cartão, centrado. Sem <dialog> aberto ele não existe na
     tela — e o formulário continua acessível pelo <noscript>. */
  .modal{border:0;padding:0;max-width:min(560px,94vw);width:100%;
      border-radius:16px;background:var(--surface);color:var(--ink);
      box-shadow:0 24px 60px rgba(10,12,20,.35)}
  .modal::backdrop{background:rgba(10,12,20,.55)}
  .modal-topo{padding:20px 20px 0}
  .modal-topo h2{font-size:20px;letter-spacing:-.015em}
  .modal-topo .sub{margin:6px 0 0;color:var(--muted);font-size:13.5px}
  .modal .erro{margin:14px 20px 0;padding:10px 14px;border-radius:var(--raio);
      background:var(--acento-fraco);color:var(--alerta);font-size:13.5px}
  .modal .erro ul{margin:0;padding-left:18px}
  .modal .erro li+li{margin-top:4px}
  /* A setlist digitada é o único campo que cresce: seis linhas cabem um culto
     inteiro sem rolar, e monoespaçada porque tom é dado. */
  .campo-alto{min-height:auto;padding:10px 14px;line-height:1.5;resize:vertical;
      font-family:ui-monospace,Menlo,monospace;font-size:14px}

  /* ------------------------------------------------ período (vários)
     Manhã e noite do mesmo domingo costumam ter a mesma setlist. A caixa
     marcável diz isso sozinha; o <select> anterior dizia o contrário. */
  .periodos{grid-column:1/-1;margin:0;padding:0;border:0;min-width:0}
  .periodos legend{padding:0;margin-bottom:6px;color:var(--muted);
      font-size:13px;font-weight:600}
  .periodo-linha{display:flex;gap:8px;flex-wrap:wrap}
  .periodo-op{display:block;flex:1 1 auto;min-width:96px}
  .periodo-op input{position:absolute;opacity:0;width:0;height:0}
  .periodo-op span{display:block;padding:11px 14px;border:1px solid var(--line);
      border-radius:var(--raio);background:var(--surface);color:var(--ink);
      font-size:14px;font-weight:600;text-align:center;cursor:pointer;
      min-height:44px;line-height:22px}
  .periodo-op input:checked+span{border-color:var(--acento);
      background:var(--acento-fraco);color:var(--acento)}
  .periodo-op input:focus-visible+span{outline:2px solid var(--acento);
      outline-offset:2px}

  /* ------------------------------------------------ qual versão?
     58 dos 343 títulos do acervo se repetem. Quando a linha digitada alcança
     mais de uma, os títulos são IDÊNTICOS — o que decide é o tom e os
     primeiros acordes, então é isso que cada opção mostra. */
  .escolhas{grid-column:1/-1;margin-top:2px;padding:14px;
      border:1px solid var(--acento);border-radius:var(--raio);
      background:var(--acento-fraco)}
  .escolhas h3{margin:0;font-size:15px;letter-spacing:-.01em}
  .escolhas>.sub{margin:3px 0 0;color:var(--muted);font-size:13px}
  .escolha-grupo+.escolha-grupo{margin-top:16px;padding-top:16px;
      border-top:1px solid var(--line)}
  .escolha-linha{margin:12px 0 8px;font-size:13.5px;color:var(--muted)}
  .escolha-linha b{color:var(--ink);font-weight:600}
  .versoes{display:grid;gap:6px}
  .versao{display:block}
  .versao input{position:absolute;opacity:0;width:0;height:0}
  .versao-cartao{display:grid;grid-template-columns:auto 1fr;gap:2px 12px;
      align-items:center;padding:10px 12px;border:1px solid var(--line);
      border-radius:var(--raio);background:var(--surface);cursor:pointer}
  .versao input:checked+.versao-cartao{border-color:var(--acento);
      box-shadow:inset 0 0 0 1px var(--acento)}
  .versao input:focus-visible+.versao-cartao{outline:2px solid var(--acento);
      outline-offset:2px}
  /* O tom é a variável da decisão: é o maior elemento do cartão. */
  .versao-tom{grid-row:1/3;display:flex;align-items:center;justify-content:center;
      min-width:52px;padding:8px 6px;border-radius:var(--raio);
      background:var(--acento-fraco);color:var(--acento);
      font-size:19px;font-weight:700;letter-spacing:-.02em}
  .versao input:checked+.versao-cartao .versao-tom{background:var(--acento);
      color:var(--surface)}
  .versao-quem{min-width:0}
  .versao-quem b{display:block;font-size:14px;font-weight:600;
      overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .versao-quem span{display:flex;align-items:center;gap:6px;flex-wrap:wrap;
      min-width:0;color:var(--muted);font-size:12.5px}
  /* Os primeiros acordes: a assinatura que o músico lê de relance. */
  .versao-cifra{display:flex;gap:9px;flex-wrap:wrap;
      font-family:ui-monospace,Menlo,monospace;font-size:13px;
      color:var(--ink);opacity:.75}
  .versao-cifra .sem-acorde{opacity:.6;font-style:italic;font-family:inherit}
  /* O capotraste é instrução de execução, não identidade: fica discreto, na
     mesma linha da legenda, sem virar um terceiro item da grade do cartão. */
  .versao-capo{padding:1px 7px;border-radius:999px;background:var(--acento-fraco);
      color:var(--acento);font-size:11px;font-weight:600;font-style:normal}
  /* Com versões para escolher o modal precisa de largura: a cifra tem que
     caber numa linha, é nela que a escolha se decide. */
  .modal-largo{max-width:min(760px,94vw)}
  .modal-largo .form-criar{max-height:min(72vh,760px);overflow-y:auto}
  @media (max-width:560px){
    .versao-cartao{grid-template-columns:auto 1fr}
    .versao-cifra{grid-column:1/-1;margin-top:2px}
    .versao-tom{grid-row:auto;min-width:46px;font-size:17px}
  }

  /* ------------------------------------------------ agenda */
  .lista-cultos{margin-top:6px}
  .lista-cultos .vazio{padding:22px 4px}
  .ultimo-culto{margin-top:16px}
  .ultimo-culto .cartao-topo h2{font-size:19px;letter-spacing:-.015em}
  .ultimo-culto .rot{display:block;color:var(--muted);font-size:11.5px;
      font-weight:700;letter-spacing:.09em;text-transform:uppercase}

  /* ------------------------------------------------ home
     A home responde quatro perguntas, nessa ordem: qual é o próximo culto,
     ele está preparado, o que já foi preparado no mês, e o que fazer agora.
     Tudo o mais é ruído — inclusive explicação de como o servidor guarda (ou
     não guarda) as coisas, que mudou para Configurações. */
  /* O chão da home.
     ---------------
     O mockup resolve o fundo com foto de congregação. Aqui não entra foto — e
     não é só falta de arquivo: o \`DESIGN.md\` fecha as saídas óbvias. O
     gradiente da marca "não entra na interface", e o acento aparece em ação,
     seleção e estado, "nunca em decoração". Fundo com a logo ampliada, faixa
     em azul→lima ou textura de cifra estariam todos fora por essa regra — e o
     de cifra ainda seria pior, porque num app de cifra um acorde decorativo se
     lê como dado.
     O que sobra é o que a regra permite e o mockup de fato mostra: LUZ. A
     mesma cena que decide o tema (\`DESIGN.md\`) decide o chão — sala iluminada,
     luz vindo de um lado. O neutro ganha uma diagonal: clareia no alto à
     direita, onde o olho termina o título e encontra o "Próximo culto", e
     assenta embaixo à esquerda, onde o trilho escuro já pesa. Nenhuma cor
     nova, nenhum acento, amplitude de ~3% de luminância — é profundidade, não
     enfeite.
     \`fixed\`: o chão é a sala e não rola junto com o painel. Só na home, que é
     a única tela com hero; as telas densas continuam no chão chapado. */
  /* As duas pontas da diagonal são tokens para o tema poder trocá-las sem
     reescrever a receita — mesma disciplina do resto do sistema. */
  body.home{--chao-luz:255,255,255; --chao-baixo:227,234,243;
      background:
        radial-gradient(120% 80% at 92% -8%,
          rgb(var(--chao-luz)) 0%,rgba(var(--chao-luz),0) 62%),
        radial-gradient(110% 90% at 4% 104%,
          rgb(var(--chao-baixo)) 0%,rgba(var(--chao-baixo),0) 58%),
        var(--ground);
      background-attachment:fixed}
  :root[data-theme=dark] body.home{--chao-luz:21,28,38; --chao-baixo:5,8,12}
  @media (prefers-color-scheme:dark){
    :root:not([data-theme=light]) body.home{--chao-luz:21,28,38;
        --chao-baixo:5,8,12}
  }
  /* No celular a luz vem de cima: não há canto direito livre — o cartão ocupa
     a largura inteira e a diagonal viraria mancha atrás do texto. \`fixed\`
     também sai: em Safari de iOS ele treme na rolagem. */
  @media (max-width:699px){
    body.home{background:
        radial-gradient(140% 40% at 70% 0%,
          rgb(var(--chao-luz)) 0%,rgba(var(--chao-luz),0) 70%),
        var(--ground);
        background-attachment:scroll}
  }

  .home-topo{display:flex;flex-wrap:wrap;align-items:flex-start;gap:16px;
      padding-bottom:6px}
  .home-topo .quem{flex:1 1 320px;min-width:0}
  .home-topo h1{font-size:clamp(26px,4.2vw,34px);letter-spacing:-.03em;
      line-height:1.12;text-wrap:balance}
  .home-topo .sub{margin:10px 0 0;max-width:46ch;color:var(--muted);
      font-size:15px;text-wrap:pretty}
  .home-topo .controles{display:flex;align-items:center;gap:4px;flex:0 0 auto}
  /* No celular a barra de topo já leva Configurações; aqui os dois ícones
     seriam o mesmo alvo duas vezes na mesma dobra. */
  @media (max-width:899px){.home-topo .controles{display:none}}

  /* Duas colunas no computador: o mês à esquerda (é uma grade e pede largura),
     o próximo culto à direita, onde o olho termina a leitura do título. */
  .home-grade{display:grid;gap:16px;margin-top:20px;align-items:start}
  @media (min-width:1000px){
    .home-grade{grid-template-columns:minmax(0,1.35fr) minmax(0,1fr)}
  }

  .mes-topo{display:flex;flex-wrap:wrap;align-items:flex-end;gap:12px;
      padding:18px 18px 0}
  .mes-topo .quem{flex:1 1 200px;min-width:0}
  /* Só a inicial: \`capitalize\` faria "Setembro De 2026". */
  .mes-topo h2{font-size:20px;letter-spacing:-.02em}
  .mes-topo h2::first-letter{text-transform:uppercase}
  .mes-topo .sub{margin:3px 0 0;color:var(--muted);font-size:13px}
  .mes-topo .conta{flex:0 0 auto;text-align:right}
  .mes-topo .conta b{display:inline-flex;align-items:center;min-height:28px;
      padding:0 11px;border-radius:999px;background:var(--raised);
      color:var(--muted);font-size:12.5px;font-weight:700}
  .barra{height:6px;margin:12px 18px 0;border-radius:999px;
      background:var(--raised);overflow:hidden}
  .barra i{display:block;height:100%;border-radius:999px;background:var(--viva);
      transition:width .35s ease-out}
  @media (prefers-reduced-motion:reduce){.barra i{transition:none}}

  /* Grade de domingos: quatro ou cinco por mês, e o dedo precisa de alvo. */
  .domingos{display:grid;gap:10px;padding:16px 18px 18px;
      grid-template-columns:repeat(auto-fit,minmax(120px,1fr))}
  .domingos a{display:flex;flex-direction:column;align-items:center;
      justify-content:center;gap:7px;min-height:104px;padding:14px 8px;
      border-radius:12px;border:1px solid var(--line);background:var(--surface);
      text-decoration:none;text-align:center}
  .domingos a:hover{border-color:var(--acento);background:var(--acento-fraco)}
  .domingos b{font-size:17px;font-weight:700;letter-spacing:-.01em}
  .domingos .rot{color:var(--muted);font-size:12px;font-weight:600}
  .domingos .bolha{width:26px;height:26px;border-radius:50%;
      border:2px solid var(--line);display:grid;place-items:center;
      color:transparent;font-size:14px;font-weight:700;line-height:1}
  .domingos [data-estado=preparado],.domingos [data-estado=realizado]{
      background:var(--viva-fraca);border-color:transparent}
  .domingos [data-estado=preparado] .bolha,
  .domingos [data-estado=realizado] .bolha{background:var(--viva);
      border-color:var(--viva);color:#fff}
  :root[data-theme=dark] .domingos [data-estado=preparado] .bolha,
  :root[data-theme=dark] .domingos [data-estado=realizado] .bolha{color:#0b1220}
  @media (prefers-color-scheme:dark){
    :root:not([data-theme=light]) .domingos [data-estado=preparado] .bolha,
    :root:not([data-theme=light]) .domingos [data-estado=realizado] .bolha{color:#0b1220}
  }
  .domingos [data-estado=preparado] .rot,
  .domingos [data-estado=realizado] .rot{color:var(--viva)}
  /* Hoje ganha anel, não cor: cor aqui já significa preparado. */
  .domingos [data-hoje]{box-shadow:0 0 0 2px var(--acento)}

  /* ---- domingo com mais de um culto (manhã e noite)
     UM cartão, dividido: o dia em cima, os períodos embaixo, metade para cada.
     O envoltório é o cartão (borda, fundo, raio) e toma o lugar que a célula
     ocupava na grade; a célula do dia vira o topo, sem moldura própria. A fita
     não pode ser filha da célula (seria <a> dentro de <a>) nem irmã solta
     (viraria mais uma "célula" no grid) — por isso o envoltório. */
  .dia-varios{display:flex;flex-direction:column;min-width:0;min-height:104px;
      border-radius:12px;border:1px solid var(--line);background:var(--surface);
      overflow:hidden}
  /* O topo perde borda, fundo e raio: quem os tem agora é o cartão inteiro. */
  .domingos .dia-varios>[data-dia]{flex:1 1 auto;min-height:0;gap:4px;
      padding:12px 8px;border:0;border-radius:0;background:none}
  .domingos .dia-varios>[data-dia]:hover{background:var(--acento-fraco)}
  /* A metade de baixo: dois períodos lado a lado, a régua entre eles. */
  .periodos-dia{display:flex;flex:0 0 auto;border-top:1px solid var(--line)}
  /* Cada período é um link de verdade — é o único caminho até o culto da noite
     a partir da grade. A altura e a direção vêm explícitas porque a regra
     genérica das células (104px, coluna) alcançaria estes links também. */
  .domingos .periodos-dia a{flex:1 1 0;height:38px;min-height:0;min-width:0;
      flex-direction:row;padding:6px 4px;border:0;border-radius:0;
      background:none;color:var(--muted);font-size:12px;font-weight:600;
      text-align:center;text-decoration:none;display:flex;align-items:center;
      justify-content:center;overflow:hidden;text-overflow:ellipsis;
      white-space:nowrap}
  /* A divisória do meio — é ela que faz o "dividido ao meio" se ler. */
  .domingos .periodos-dia a+a{border-left:1px solid var(--line)}
  /* Pronto usa o mesmo verde do dia preparado — a grade já ensinou essa cor. */
  .domingos .periodos-dia a[data-pronto="1"]{background:var(--viva-fraca);
      color:var(--viva)}
  .domingos .periodos-dia a:hover{background:var(--acento-fraco);
      color:var(--acento)}
  /* O cartão inteiro responde ao estado do dia, como as células simples. */
  .domingos .dia-varios[data-estado=preparado]{background:var(--viva-fraca);
      border-color:transparent}
  .domingos [data-hoje-dia]{box-shadow:0 0 0 2px var(--acento)}

  /* O próximo culto é o CTA da página — cartão inteiro em acento fraco. */
  .proximo{background:var(--acento-fraco);border-color:transparent}
  .proximo .corpo{padding:18px}
  .proximo .rot{display:flex;align-items:center;gap:7px;color:var(--acento);
      font-size:11.5px;font-weight:700;letter-spacing:.09em;
      text-transform:uppercase}
  .proximo .rot .icone{width:16px;height:16px}
  .proximo h2{margin-top:9px;font-size:clamp(20px,2.6vw,25px);
      letter-spacing:-.025em}
  .proximo .fatos{display:flex;flex-wrap:wrap;gap:8px 18px;margin:12px 0 0;
      color:var(--muted);font-size:13.5px;font-weight:600}
  .proximo .fatos span{display:inline-flex;align-items:center;gap:6px}
  .proximo .fatos .icone{width:16px;height:16px}
  .proximo .selo{display:flex;align-items:flex-start;gap:10px;margin-top:16px;
      padding:12px 14px;border-radius:12px;background:var(--aviso-fraco)}
  .proximo .selo b{display:block;color:var(--aviso);font-size:13.5px}
  .proximo .selo span{display:block;margin-top:2px;color:var(--muted);
      font-size:13px}
  .proximo .selo[data-estado=pronto]{background:var(--viva-fraca)}
  .proximo .selo[data-estado=pronto] b{color:var(--viva)}
  .proximo .btn-grande{width:100%;margin-top:16px}

  /* ---- ações rápidas */
  .acoes-rapidas{display:grid;gap:12px;margin-top:14px;
      grid-template-columns:repeat(auto-fit,minmax(210px,1fr))}
  .acao{display:flex;align-items:center;gap:13px;padding:15px;
      border-radius:14px;border:1px solid var(--line);background:var(--surface);
      box-shadow:var(--sombra);text-decoration:none;text-align:left;width:100%}
  /* No tablet o \`auto-fit\` daria três cards e um órfão na segunda linha. */
  @media (min-width:700px) and (max-width:1050px){
    .acoes-rapidas{grid-template-columns:repeat(2,minmax(0,1fr))}
  }
  .acao:hover{border-color:var(--acento)}
  .acao .bolha{flex:0 0 auto;width:42px;height:42px;border-radius:12px;
      display:grid;place-items:center;background:var(--raised);
      color:var(--muted)}
  .acao .bolha .icone{width:20px;height:20px}
  .acao b{display:block;font-size:15px;font-weight:600;letter-spacing:-.01em}
  .acao span{display:block;margin-top:2px;color:var(--muted);font-size:12.5px}
  .acao[data-tinta=acento] .bolha{background:var(--acento-fraco);
      color:var(--acento)}
  .acao[data-tinta=viva] .bolha{background:var(--viva-fraca);color:var(--viva)}
  /* Ação que ainda não existe não é botão morto nem promessa em azul: fica
     apagada e diz que vem depois. Ver o comentário de \`ACOES_RAPIDAS\`. */
  .acao[aria-disabled=true]{opacity:.55;cursor:default;box-shadow:none}
  .acao[aria-disabled=true]:hover{border-color:var(--line)}

  /* ---- últimos cultos */
  .tabela-cultos{width:100%;border-collapse:collapse;font-size:14px}
  .tabela-cultos th{padding:10px 16px;text-align:left;color:var(--muted);
      font-size:11px;font-weight:700;letter-spacing:.08em;
      text-transform:uppercase;border-bottom:1px solid var(--line)}
  .tabela-cultos td{padding:13px 16px;border-bottom:1px solid var(--line)}
  .tabela-cultos tr:last-child td{border-bottom:0}
  .tabela-cultos tbody tr:hover{background:var(--raised)}
  .tabela-cultos .nome{font-weight:600}
  .tabela-cultos .fim{text-align:right;white-space:nowrap}
  .tabela-cultos .btn{min-height:36px;padding:0 14px;font-size:13px}
  .tabela-cultos td.data{white-space:nowrap;font-variant-numeric:tabular-nums}
  /* "5 músicas" quebrando em duas linhas engorda a linha inteira no celular. */
  .tabela-cultos td.qtd{white-space:nowrap;color:var(--muted)}
  /* Estreito: a coluna "Nome" repete o que a data já diz, e é a primeira a
     sair. Rolagem horizontal de tabela na home seria armadilha no palco. */
  @media (max-width:700px){
    .tabela-cultos .corta{display:none}
    .tabela-cultos th,.tabela-cultos td{padding-left:14px;padding-right:14px}
  }
  .selo-status{display:inline-flex;align-items:center;gap:6px;min-height:26px;
      padding:0 10px;border-radius:999px;background:var(--raised);
      color:var(--muted);font-size:12.5px;font-weight:600;white-space:nowrap}
  .selo-status[data-estado=realizado]{background:var(--viva-fraca);
      color:var(--viva)}
  .ver-todos{display:inline-flex;align-items:center;gap:6px;
      color:var(--acento);font-size:13.5px;font-weight:600;text-decoration:none}
  .ver-todos:hover{text-decoration:underline}
  .cartao-topo .fim{margin-left:auto}
  @media (pointer:coarse),(max-width:699px){
    .tabela-cultos .btn{min-height:44px}
    .domingos a{min-height:112px}
  }

  /* ------------------------------------------------ configurações */
  .prefs{display:grid;gap:14px;margin-top:14px}
  .pref{display:flex;flex-wrap:wrap;align-items:center;gap:12px;padding:15px;
      border:1px solid var(--line);border-radius:14px;background:var(--surface)}
  .pref .quem{flex:1 1 200px;min-width:0}
  .pref .quem b{display:block;font-size:15px}
  .pref .quem span{display:block;margin-top:2px;color:var(--muted);font-size:13px}
  .pref .grupo{display:flex;gap:6px}

  /* ------------------------------------------------ atalhos */
  .atalhos{list-style:none;margin:12px 0 0;padding:0;display:grid;gap:8px}
  .atalhos li{display:flex;align-items:center;gap:8px;font-size:13.5px}
  .atalhos li span{color:var(--muted)}
  .atalhos+.aviso{margin-top:12px}
  .atalhos kbd{display:inline-grid;place-items:center;min-width:26px;height:26px;
      padding:0 6px;border-radius:6px;background:var(--raised);
      border:1px solid var(--line);border-bottom-width:2px;color:var(--ink);
      font-family:ui-monospace,Menlo,monospace;font-size:12.5px;font-weight:700}

  /* ---------------------------------------------- alvo de toque
     Última camada do arquivo de propósito: ela sobrescreve os tamanhos
     definidos acima, e só ganha isso ficando por último.

     Piso de 44px onde o dedo é o ponteiro. O critério é \`pointer:coarse\`
     antes da largura, porque o uso real inclui tablet na estante — largo, e
     mesmo assim sem precisão de mouse. No mouse os alvos continuam menores
     (30–34px, acima do mínimo de 24px da WCAG 2.2): é a mesma regra que o
     produto escreveu, "alvo de TOQUE de 44px", aplicada onde há toque.

     Não é enfeite. A 30px o \`−\` do tom ficava a 4px do \`↑\` da ordem — e
     errar o alvo trocava a ORDEM do culto quando se queria trocar o TOM.
     Dois erros diferentes, silenciosos, encostados. Por isso a folga entre
     os dois grupos cresce junto com o alvo. */
  @media (pointer:coarse),(max-width:699px){
    .setlist .tom{gap:6px}
    /* Sem \`flex:0 0 auto\` o flex espreme os passos quando a faixa aperta:
       medido 11px de largura a 360px, com a altura certa de 44. */
    .setlist .tom .passo{flex:0 0 auto;width:44px;height:44px}
    .setlist .tom .pastilha{min-width:54px;min-height:44px}
    .setlist .acoes{gap:6px}
    .setlist .acoes a,.setlist .acoes span{width:44px;height:44px;font-size:16px}
    .rascunho .btn,.cultos li>.btn{min-height:44px}
    .adicionar summary{min-height:44px}
    .passos .btn{min-height:44px}
    .grupo-fonte button{min-width:44px;min-height:44px}
    .escolher a{padding:12px 8px}
    .menu-lista a{min-height:48px}
  }
  /* Na faixa larga com dedo os dois grupos voltam para a mesma linha, e a
     divisória de 1px não basta para separar alvos de 44px. */
  @media (pointer:coarse) and (min-width:700px){
    .setlist .acoes{margin-left:18px;padding-left:16px}
  }
}
`;

const CSS_PAINEL = CSS + CSS_UI + CSS_CIFRA + CSS_PREPARO;

/** Busca sem acento: "coracao" tem que achar "Coração". */
const JS_LIMPAR = `function limpar(s){return (s||'').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase()}`;

/**
 * Filtro de lista, genérico: todo `input[data-filtro="<id da lista>"]` filtra
 * os `li[data-busca]` daquela lista e revela o `[data-vazio="<id>"]`.
 */
/**
 * O menu de tom: um aberto por vez, e fecha com Escape ou clique fora.
 *
 * Só isso — abrir, escolher e navegar já funcionam sem JavaScript, porque o
 * menu é `<details>` com `href` de verdade dentro.
 */
const SCRIPT_MENU_TOM = `<script>
(function(){
  function todos(){return document.querySelectorAll('details.menu-tom')}
  function fechar(exceto){
    todos().forEach(function(d){if(d!==exceto)d.open=false});
  }
  // Com um menu aberto, as demais linhas saem do alcance: \`inert\` tira do
  // clique, do foco e do leitor de tela de uma vez só. Sem isto, o \`+\` da
  // música vizinha continuava clicável ao lado do menu aberto — e transpor a
  // música errada é o tipo de erro que só se descobre no culto.
  function isolar(){
    document.querySelectorAll('ol.setlist').forEach(function(ol){
      var aberto=ol.querySelector('details.menu-tom[open]');
      var dono=aberto?aberto.closest('li'):null;
      if(dono)ol.setAttribute('data-menu-aberto','');else ol.removeAttribute('data-menu-aberto');
      Array.prototype.forEach.call(ol.children,function(li){
        if(li===dono)li.setAttribute('data-menu-dono','');else li.removeAttribute('data-menu-dono');
        // \`inert\` não é suportado em todo navegador da banda; onde não for,
        // o véu e o recuo continuam valendo e nada quebra.
        try{li.inert=!!dono&&li!==dono}catch(e){}
      });
      // No estreito a folha sobe do rodapé e tapava a própria linha dona —
      // ficar sem ver de que música é o menu é pior que não ver as vizinhas.
      // Trazer a linha para o alto deixa ela e as seguintes à vista acima da
      // folha. Na faixa larga o menu abre ao lado e não há o que rolar.
      if(dono&&window.matchMedia('(max-width:699px)').matches){
        var suave=!window.matchMedia('(prefers-reduced-motion:reduce)').matches;
        try{dono.scrollIntoView({block:'start',behavior:suave?'smooth':'auto'})}
        catch(e){dono.scrollIntoView(true)}
      }
    });
  }
  document.addEventListener('toggle',function(e){
    var d=e.target;
    if(!d.classList||!d.classList.contains('menu-tom'))return;
    if(d.open)fechar(d);
    isolar();
  },true);
  document.addEventListener('click',function(e){
    if(!e.target.closest('details.menu-tom')){fechar(null);isolar();}
  });
  document.addEventListener('keydown',function(e){
    if(e.key==='Escape'){
      // Devolve o foco para a pastilha que abriu: sair do menu pelo Escape e
      // cair no começo da página é perder o lugar na setlist.
      var aberto=document.querySelector('details.menu-tom[open]');
      var alvo=aberto?aberto.querySelector('summary'):null;
      fechar(null);isolar();
      if(alvo)alvo.focus();
    }
  });
})();
</script>`;

/**
 * Atalhos de teclado da preparação.
 *
 * Preparar culto é trabalho de mesa, repetitivo, com as duas mãos livres — é
 * exatamente o caso em que atalho paga. Antes eram 33 paradas de Tab do
 * título da primeira música até a ação principal do cartão da direita.
 *
 * Cada atalho **aciona um link que já existe na página**: `j`/`k` são os
 * mesmos passos da prévia, `[`/`]` são os mesmos `−`/`+` da música atual. Não
 * há caminho novo, nem estado novo, nem nada que só funcione com JavaScript —
 * quem não tem script continua clicando os mesmos links.
 */
const SCRIPT_ATALHOS = `<script>
(function(){
  function digitando(e){
    var a=document.activeElement;
    if(!a)return false;
    var t=a.tagName;
    return t==='INPUT'||t==='TEXTAREA'||t==='SELECT'||a.isContentEditable;
  }
  function ir(sel){
    var a=document.querySelector(sel);
    // \`<span class=desligado>\` não tem href: no fim da setlist a tecla não
    // faz nada, em vez de recarregar a mesma página.
    if(a&&a.href)a.click();
  }
  document.addEventListener('keydown',function(e){
    if(e.ctrlKey||e.metaKey||e.altKey||digitando(e))return;
    // Menu de tom aberto tem as próprias teclas (Escape fecha); não competir.
    if(document.querySelector('details.menu-tom[open]'))return;
    var k=e.key;
    if(k==='j'||k==='J'){e.preventDefault();ir('.passos a[data-passo=proxima]')}
    else if(k==='k'||k==='K'){e.preventDefault();ir('.passos a[data-passo=anterior]')}
    else if(k===']'){e.preventDefault();ir('.setlist li[data-atual=true] .tom .passo:last-of-type')}
    else if(k==='['){e.preventDefault();ir('.setlist li[data-atual=true] .tom .passo:first-of-type')}
    else if(k==='/'){
      var cx=document.querySelector('details.adicionar');
      var campo=document.querySelector('input[data-filtro]');
      if(!campo)return;
      e.preventDefault();
      if(cx)cx.open=true;
      campo.focus();campo.select();
    }
  });
})();
</script>`;

const SCRIPT_FILTRO = `<script>
(function(){
  ${JS_LIMPAR}
  // Os campos são agrupados POR LISTA antes de ligar o evento: a biblioteca
  // tem três (nome, tema, cantor) e eles têm que filtrar juntos. Um "aplicar"
  // por campo faria o último a rodar desfazer o que os outros esconderam.
  var porLista={};
  // \`select\` entra junto com \`input\`: o filtro de tema é uma lista porque o
  // vocabulário é fechado, mas filtra pelo mesmo caminho que os de texto.
  document.querySelectorAll('input[data-filtro],select[data-filtro]').forEach(function(campo){
    (porLista[campo.dataset.filtro]=porLista[campo.dataset.filtro]||[]).push(campo);
  });
  Object.keys(porLista).forEach(function(id){
    var lista=document.getElementById(id);
    if(!lista)return;
    var campos=porLista[id];
    var vazio=document.querySelector('[data-vazio="'+id+'"]');
    var conta=document.querySelector('[data-conta="'+id+'"]');
    function aplicar(){
      var tom=lista.dataset.tom||'',n=0;
      // Campo sem \`data-campo\` busca no índice geral (\`data-busca\`), que é o
      // que a lista de escolher música do culto usa.
      var termos=[];
      campos.forEach(function(c){
        var q=limpar(c.value.trim());
        if(q)termos.push({chave:c.dataset.campo||'busca',q:q});
      });
      lista.querySelectorAll('li').forEach(function(li){
        var bate=(!tom||li.dataset.tomOrigem===tom)&&termos.every(function(t){
          return limpar(li.dataset[t.chave]||'').indexOf(t.q)>=0;
        });
        li.hidden=!bate; if(bate)n++;
      });
      if(vazio)vazio.hidden=n>0;
      if(conta)conta.textContent=n;
    }
    // \`change\` além de \`input\` porque nem todo navegador dispara \`input\` ao
    // escolher no \`select\` — no celular, que é onde isto é usado, menos ainda.
    campos.forEach(function(c){
      c.addEventListener('input',aplicar);
      if(c.tagName==='SELECT')c.addEventListener('change',aplicar);
    });
    lista.addEventListener('filtrar',aplicar);
    aplicar();
  });
  // Chips de tom: filtram junto com o texto, sem recarregar.
  document.querySelectorAll('[data-chips]').forEach(function(nav){
    var lista=document.getElementById(nav.dataset.chips);
    if(!lista)return;
    nav.addEventListener('click',function(e){
      var b=e.target.closest('[data-tom-filtro]');
      if(!b)return;
      var v=b.dataset.tomFiltro;
      lista.dataset.tom=(lista.dataset.tom===v?'':v);
      nav.querySelectorAll('[data-tom-filtro]').forEach(function(o){
        o.setAttribute('aria-pressed',String(o.dataset.tomFiltro===lista.dataset.tom));
      });
      lista.dispatchEvent(new Event('filtrar'));
    });
  });
})();
</script>`;

// ---------------------------------------------------------------- culto

/**
 * Onde o aparelho anota os cultos que ele criou. É índice, não fonte: cada
 * setlist continua em `cifras:culto:novo/<nome>` e no link.
 */
const INDICE_NOVOS = 'cifras:cultos-novos';

/**
 * O link de uma ação do painel de culto — sempre com a setlist resultante e,
 * no culto criado na tela, com o nome, o tema e a data que o usuário
 * escreveu: eles vivem na URL, não no servidor.
 */
function linkCulto(culto: Culto, entradas: readonly EntradaCulto[], atual: number): string {
  const q = new URLSearchParams({
    ...identidadeDoCulto(culto),
    ordem: codificarOrdem(entradas),
    atual: String(atual),
  });
  return `/culto/${segmentoCulto(culto)}?${q}`;
}

function linkExecucao(culto: Culto, entradas: readonly EntradaCulto[], i: number): string {
  const q = new URLSearchParams({
    ...identidadeDoCulto(culto),
    ordem: codificarOrdem(entradas),
    i: String(i),
  });
  return `/executar/${segmentoCulto(culto)}?${q}`;
}

function trocar(entradas: readonly EntradaCulto[], a: number, b: number): EntradaCulto[] {
  const copia = entradas.slice();
  [copia[a], copia[b]] = [copia[b]!, copia[a]!];
  return copia;
}

function comTom(entradas: readonly EntradaCulto[], i: number, tom: string): EntradaCulto[] {
  const copia = entradas.slice();
  copia[i] = { ...copia[i]!, tom };
  return copia;
}

/**
 * O aviso de sair sem salvar.
 *
 * Só aparece quando há alteração depois do último "Salvar culto", e só para
 * links que **saem do culto** — trocar tom, reordenar e adicionar são links
 * para o próprio painel, e avisar a cada um deles seria alarme que se aprende
 * a ignorar. Iniciar o culto também não conta: a setlist viaja no link.
 */
const DIALOGO_SAIR =
  '<dialog class=modal id=dlg-sair aria-labelledby=tit-sair>' +
  '<div class=modal-topo><h2 id=tit-sair>Sair sem salvar?</h2>' +
  '<p class=sub>Este culto mudou depois do último salvamento neste aparelho.</p></div>' +
  '<div class=modal-acoes>' +
  '<button class=btn id=sair-cancelar type=button>Continuar aqui</button>' +
  '<button class=btn id=sair-descartar type=button>Sair sem salvar</button>' +
  '<button class="btn btn-forte" id=sair-salvar type=button>Salvar e sair</button>' +
  '</div></dialog>';

/**
 * O tom de uma música da setlist: a pastilha abre a lista dos 16 tons **ali
 * mesmo**, na linha, em vez de levar para outra tela.
 *
 * É `<details>` com links de verdade dentro, não um `<select>` nem um menu de
 * JavaScript: sem script o menu abre e escolher navega igual; com script ele
 * só ganha fechar por Escape e por clique fora (`SCRIPT_MENU_TOM`). Mesma
 * disciplina do resto do painel — toda ação é `href`.
 *
 * A cifra continua a um clique, no rodapé do menu: era o que a pastilha fazia
 * antes, e quem preparava usava.
 */
function menuDeTom(
  culto: Culto,
  entradas: readonly EntradaCulto[],
  i: number,
  atual: number,
): string {
  const e = entradas[i]!;
  const opcoes = TONS.map((o) => {
    const eAtual = o.tom === e.tom;
    const origem = o.tom === e.musica.tom ? ' origem' : '';
    const enar = o.enarmonico ? `<span class=enar>${esc(o.enarmonico)}</span>` : '';
    // Enarmônico não é sinônimo: `E → Gb` e `E → F#` são respostas diferentes
    // e as duas estão certas — por isso as 16 aparecem, não 12.
    return (
      `<a class="tom-opcao${origem}" href="${esc(linkCulto(culto, comTom(entradas, i, o.tom), atual))}" ` +
      `aria-current="${eAtual}" title="${esc(o.tom === e.musica.tom ? `${o.tom} — tom de origem` : o.tom)}">` +
      `<span>${esc(o.tom)}</span>${enar}</a>`
    );
  }).join('');

  return (
    '<details class=menu-tom>' +
    `<summary class=pastilha title="Trocar o tom de ${esc(e.musica.titulo)}" ` +
    `aria-label="Tom ${esc(e.tom)} — trocar">${esc(e.tom)}</summary>` +
    `<div class=menu-lista>${opcoes}` +
    `<a class=menu-abrir href="/musica/${esc(e.slug)}?tom=${encodeURIComponent(e.tom)}">` +
    `Abrir a cifra em ${esc(e.tom)}</a>` +
    '</div></details>'
  );
}

/**
 * Um passo da navegação da prévia: link quando há para onde ir, `<span>`
 * quando não há.
 *
 * O `<span>` não é detalhe de estilo — é o que tira o controle desligado do
 * teclado e do leitor de tela. Mesmo idioma de `site/execucao.ts`.
 */
function passo(ativo: boolean, href: string, rotulo: string, qual: 'anterior' | 'proxima'): string {
  // `data-passo` em vez de `:first-of-type`: quando um dos dois vira `<span>`,
  // o `<a>` restante passa a ser primeiro E último, e o atalho `k` andaria
  // para a frente. O seletor tem que dizer qual é qual.
  const atalho = qual === 'anterior' ? 'k' : 'j';
  return ativo
    ? `<a class=btn data-passo=${qual} title="${rotulo.replace(/&\w+;/g, '').trim()} — atalho: ${atalho}" ` +
      `href="${esc(href)}">${rotulo}</a>`
    : `<span class="btn desligado" data-passo=${qual} aria-disabled=true>${rotulo}</span>`;
}

/**
 * A tela principal: o culto atual, sua setlist e a música atual.
 *
 * `momento` (Ofertório, Apelo / Ceia) aparece aqui e **só aqui** entre as
 * telas de preparação, porque é propriedade do papel da música no culto — é
 * este o contexto que `docs/site.md` diz que falta na página solta.
 */
export function paginaCulto(
  rep: Repertorio,
  culto: Culto,
  entradas: EntradaCulto[],
  atual: number,
  extra: { irmaos?: readonly Culto[] } = {},
): string {
  // Os outros períodos do mesmo dia, criados na mesma submissão. Este culto
  // abre; os irmãos ficam registrados no aparelho e aparecem na agenda.
  const irmaos = extra.irmaos ?? [];
  // **O culto novo não tem ordem canônica.** As entradas dele são a setlist
  // que acabou de chegar pela URL — usá-las como "ordem original" faria o
  // script concluir "nada mudou" e apagar o rascunho a cada visita, que é
  // como a setlist salva sumia ao voltar para a agenda.
  const canonica = culto.novo ? '' : codificarOrdem(culto.entradas);
  // "Alterada" só faz sentido contra uma ordem que foi tocada. Culto criado
  // na tela não tem ordem canônica: tudo nele é rascunho, e dizer "alterada"
  // sugeriria um original que não existe.
  const alterada = !culto.novo && codificarOrdem(entradas) !== canonica;
  const atualEntrada = entradas[atual];

  const itens = entradas
    .map((e, i) => {
      const eAtual = i === atual;
      const acao = (
        rotulo: string,
        glifo: string,
        destino: EntradaCulto[] | null,
        novoAtual = atual,
        classe = '',
      ) =>
        destino === null
          ? `<span aria-hidden="true">${glifo}</span>`
          : `<a class="${classe}" href="${esc(linkCulto(culto, destino, novoAtual))}" ` +
            `title="${esc(rotulo)}" aria-label="${esc(rotulo)}">${glifo}</a>`;

      // Remover a música atual move o cursor para trás, para não apontar
      // depois do fim da setlist.
      const semEsta = entradas.filter((_, j) => j !== i);
      const atualDepois = i < atual || atual >= semEsta.length ? Math.max(0, atual - 1) : atual;

      const papel = e.musica.momento ? `<span class=papel>${esc(e.musica.momento)}</span> · ` : '';
      return (
        `<li data-atual="${eAtual}">` +
        `<span class=marca aria-hidden="true">${eAtual ? '&#9654;' : ''}</span>` +
        `<span class=num>${String(i + 1).padStart(2, '0')}</span>` +
        `<a class=nome href="${esc(linkCulto(culto, entradas, i))}">` +
        `<b>${esc(e.musica.titulo)}</b>` +
        `<span>${papel}${esc(e.musica.artista)}</span></a>` +
        '<span class=controles>' +
        '<span class=tom>' +
        `<a class=passo href="${esc(linkCulto(culto, comTom(entradas, i, passoDeTom(e.tom, -1)), atual))}" ` +
        `aria-label="Descer meio tom" title="Descer meio tom${eAtual ? ' — atalho: [' : ''}">&minus;</a>` +
        menuDeTom(culto, entradas, i, atual) +
        `<a class=passo href="${esc(linkCulto(culto, comTom(entradas, i, passoDeTom(e.tom, 1)), atual))}" ` +
        `aria-label="Subir meio tom" title="Subir meio tom${eAtual ? ' — atalho: ]' : ''}">+</a>` +
        '</span>' +
        // Tom e ações num envoltório só: no estreito ele é a faixa de
        // controles (flex, `space-between`, folga garantida entre os dois
        // grupos); a partir de 700px vira `display:contents` e os dois voltam
        // a ser itens da grade da linha, como sempre foram.
        '<span class=acoes>' +
        acao('Subir na ordem', '&uarr;', i > 0 ? trocar(entradas, i, i - 1) : null, i > 0 && atual === i ? i - 1 : atual) +
        acao('Descer na ordem', '&darr;', i < entradas.length - 1 ? trocar(entradas, i, i + 1) : null, i < entradas.length - 1 && atual === i ? i + 1 : atual) +
        // No culto do repertório a última música não sai — a setlist tocada
        // não fica vazia. No culto novo sai: montar é errar e desfazer.
        acao('Tirar do culto', '&times;', entradas.length > 1 || culto.novo ? semEsta : null, atualDepois, 'remover') +
        '</span></span></li>'
      );
    })
    .join('');

  // Só o que ainda não está na setlist — a mesma música duas vezes no culto
  // seria erro de operação, não recurso.
  const jaTem = new Set(entradas.map((e) => e.slug));
  const candidatas = rep.todas.filter((m) => !jaTem.has(m.slug));
  const adicionar =
    candidatas.length === 0
      ? '<p class=aviso>Todas as músicas do repertório já estão neste culto.</p>'
      : '<details class=adicionar><summary class="btn">+ Adicionar música</summary>' +
        '<div class=caixa>' +
        '<input class=campo type=search data-filtro=escolher autocomplete=off ' +
        'placeholder="Filtrar por título, artista ou nº do hino" aria-label="Filtrar músicas">' +
        '<ul class=escolher id=escolher>' +
        candidatas
          .map((m) => {
            // Hino entra no culto pelo mesmo caminho de qualquer música — o
            // que muda é como se pergunta por ele. Sem a referência aqui,
            // digitar "422" não acha nada, e o número é justamente o que quem
            // monta o culto tem na mão ("o pastor pediu o 422").
            const referencia = m.fonte && m.numero ? `${m.fonte} ${m.numero}` : '';
            const legenda = [m.artista, referencia].filter(Boolean).join(' · ');
            return (
              `<li data-busca="${esc(`${m.titulo} ${m.artista} ${referencia}`.trim().toLowerCase())}">` +
              `<a href="${esc(linkCulto(culto, [...entradas, { slug: m.slug, tom: m.tom, musica: m }], atual))}">` +
              `<span class=nome><b>${esc(m.titulo)}</b><span>${esc(legenda)}</span></span>` +
              `<span class=pastilha>${esc(m.tom)}</span></a></li>`
            );
          })
          .join('') +
        '</ul>' +
        '<p class=aviso data-vazio=escolher hidden>Nenhuma música com esse nome.</p>' +
        '</div></details>';

  const blocoAtual = atualEntrada
    ? '<div class="cartao atual">' +
      '<div class=cartao-topo><div class=quem>' +
      '<span class=rot>Música atual</span>' +
      `<h3>${esc(atualEntrada.musica.titulo)}</h3>` +
      '<div class=etiquetas>' +
      `<span class=chip>${esc(atualEntrada.musica.artista)}</span>` +
      `<span class=pastilha>${esc(atualEntrada.tom)}</span>` +
      (atualEntrada.musica.momento ? `<span class=chip>${esc(atualEntrada.musica.momento)}</span>` : '') +
      '</div></div>' +
      `<a class="btn btn-forte" href="${esc(linkExecucao(culto, entradas, atual))}">Executar daqui</a>` +
      `<a class=btn href="/musica/${esc(atualEntrada.slug)}?tom=${encodeURIComponent(atualEntrada.tom)}">Abrir cifra</a>` +
      '</div>' +
      `<div class="cifra previa">${fragmentoCifra(atualEntrada.musica, atualEntrada.tom)}</div>` +
      '<nav class=passos aria-label="Navegar na setlist">' +
      // Desligado é `<span>`, não `<a aria-disabled>`. `pointer-events:none`
      // bloqueia o mouse e **não** o teclado: quem tabulava chegava no
      // "Anterior" apagado, apertava Enter e recarregava a página. É também o
      // idioma que `site/execucao.ts` já usava — eram dois jeitos de dizer a
      // mesma coisa no mesmo produto.
      passo(atual > 0, linkCulto(culto, entradas, atual - 1), '&larr; Anterior', 'anterior') +
      `<span class=conta>${String(atual + 1).padStart(2, '0')} / ${String(entradas.length).padStart(2, '0')}</span>` +
      passo(
        atual < entradas.length - 1,
        linkCulto(culto, entradas, atual + 1),
        'Próxima &rarr;',
        'proxima',
      ) +
      '</nav></div>'
    : '<p class=vazio>Setlist vazia. Adicione uma música para começar.</p>';

  const miolo =
    '<header class=culto-topo><div class=quem>' +
    // Quem escreveu um nome ao abrir o culto vê o nome dele; a data vira
    // subtítulo. Sem nome, o título é o rótulo da convenção, como sempre.
    `<h1>${esc(culto.titulo || culto.rotulo)}</h1>` +
    // O período é o que a convenção do nome do arquivo carrega. Horário e
    // duração não existem no dado — e a tela não os inventa (docs/site.md).
    ((sub) => (sub ? `<p class=sub>${sub}</p>` : ''))(
      [
        culto.titulo ? esc(culto.rotulo) : null,
        culto.periodo ? esc(culto.periodo) : null,
        culto.tema ? `<span class=chip>${esc(culto.tema)}</span>` : null,
      ]
        .filter(Boolean)
        .join(' · '),
    ) +
    '</div><div class=acoes>' +
    '<span class=status id=status data-estado=preparando>Preparando</span>' +
    // Só o culto criado na tela tem o que salvar: o do repertório já é dado
    // versionado, e "salvar" ali prometeria escrita que não existe. Nasce
    // `hidden` porque quem salva é o script — sem JS não há onde guardar.
    (culto.novo ? '<button class=btn id=salvar type=button hidden>Salvar culto</button>' : '') +
    `<a class="btn btn-forte btn-grande" id=iniciar href="${esc(linkExecucao(culto, entradas, atual))}">Iniciar culto</a>` +
    '<button class="btn btn-fantasma" id=encerrar hidden type=button>Encerrar culto</button>' +
    '</div></header>' +
    (culto.novo ? DIALOGO_SAIR : '') +
    // Quem marcou manhã e noite precisa ver que os dois existem — e chegar no
    // outro sem voltar para a agenda. A setlist saiu igual; daqui em diante
    // cada um é um culto, e mudar este não mexe no outro.
    (irmaos.length
      ? '<p class=rascunho data-estado=irmaos><b>' +
        `${irmaos.length + 1} cultos criados</b> — mesma setlist, um por período. ` +
        'Cada um segue por conta a partir daqui. ' +
        irmaos
          .map(
            (c) =>
              `<a class=btn href="${esc(`/culto/${segmentoCulto(c)}?${new URLSearchParams({ ...identidadeDoCulto(c), ...(entradas.length ? { ordem: codificarOrdem(entradas) } : {}) })}`)}">` +
              `Abrir ${esc(c.periodo ?? c.nome)}</a>`,
          )
          .join('') +
        '</p>'
      : '') +
    (culto.novo
      ? '<p class=rascunho data-estado=alterada id=faixa-salvo><b>Culto novo</b> — ' +
        '<span id=estado-salvo>existe neste aparelho e no link; o servidor não guarda nada.</span> ' +
        '<button class=btn type=button id=copiar>Copiar link para o celular</button></p>'
      : alterada
        ? '<p class=rascunho data-estado=alterada><b>Setlist alterada</b> — vale neste aparelho e no link. ' +
          `<a class=btn href="${esc(`/culto/${segmentoCulto(culto)}?atual=${atual}&limpar=1`)}">Restaurar ordem do culto</a>` +
          '<button class=btn type=button id=copiar>Copiar link para o celular</button></p>'
        : '<p class=rascunho data-estado=canonica><b>Ordem do culto</b> — como foi tocado. ' +
          '<button class=btn type=button id=copiar>Copiar link para o celular</button></p>') +
    '<div class=culto-grade>' +
    '<section class="cartao setlist-cartao" aria-labelledby=tit-setlist>' +
    '<div class=cartao-topo><div class=quem>' +
    '<h2 id=tit-setlist>Setlist do culto</h2>' +
    `<p class=sub>${entradas.length} ${entradas.length === 1 ? 'música' : 'músicas'} · ` +
    `${culto.novo ? 'montada neste aparelho' : alterada ? 'ordem alterada neste aparelho' : 'ordem e tom em que foi tocado'}</p>` +
    '</div></div>' +
    (entradas.length === 0
      ? '<p class=vazio style="padding:24px 16px">Nenhuma música ainda. Comece adicionando.</p>'
      : `<ol class=setlist>${itens}</ol>`) +
    `<div class=cartao-rodape>${adicionar}</div>` +
    '</section>' +
    blocoAtual +
    '</div>';

  return paginaPainel({
    titulo: `${culto.rotulo} — Painel`,
    ativo: '/',
    css: CSS_PAINEL,
    miolo,
    largo: true,
    scripts:
      SCRIPT_FILTRO + SCRIPT_MENU_TOM + SCRIPT_ATALHOS + scriptCulto(culto, canonica, irmaos),
  });
}

/**
 * O rascunho da setlist e o estado do culto, no aparelho.
 *
 * Progressive enhancement: o painel já funciona sem isto (as ações são links
 * que carregam o `?ordem=`). O que o script acrescenta é (1) o rascunho
 * sobreviver a um recarregamento, (2) o estado ao vivo/encerrado, e (3) o
 * link pronto para copiar. `localStorage` pode lançar — tudo em try/catch.
 */
function scriptCulto(culto: Culto, canonica: string, irmaos: readonly Culto[] = []): string {
  // O irmão como a agenda o guarda. Vai junto porque o servidor não guarda
  // culto: sem entrar no índice do aparelho agora, o culto da noite se perde
  // quando esta aba fechar.
  const registroIrmaos = irmaos.map((c) => ({
    nome: c.nome,
    rotulo: c.rotulo,
    periodo: c.periodo,
    titulo: c.titulo ?? null,
    tema: c.tema ?? null,
    data: c.dataISO ?? null,
    id: new URLSearchParams(identidadeDoCulto(c)).toString(),
    salvo: null,
    em: null,
  }));

  return `<script>
(function(){
  var NOME=${JSON.stringify(culto.nome)};
  var IDX=${JSON.stringify(INDICE_NOVOS)};
  var IRMAOS=${JSON.stringify(registroIrmaos)};
  // A chave inclui o segmento: culto novo e culto do repertório com o mesmo
  // nome são coisas diferentes e não podem dividir rascunho.
  var K='cifras:culto:'+${JSON.stringify(culto.novo ? 'novo/' : '')}+NOME;
  var CANONICA=${JSON.stringify(canonica)};
  var url=new URL(location.href);
  var ordem=url.searchParams.get('ordem');

  function ler(k){try{return localStorage.getItem(k)}catch(e){return null}}
  function por(k,v){try{v===null?localStorage.removeItem(k):localStorage.setItem(k,v)}catch(e){}}

  // Culto criado na tela não existe no servidor: o índice do aparelho é o
  // único jeito de reencontrá-lo em /cultos depois de fechar a aba.
  ${
    culto.novo
      ? `try{
    var idx=JSON.parse(ler(IDX)||'[]');
    if(!(idx instanceof Array))idx=[];
    // O que já foi salvo sobrevive à visita: reescrever a entrada não pode
    // apagar o carimbo de "salvo".
    var antes=null;
    idx=idx.filter(function(c){if(c&&c.nome===NOME){antes=c;return false}return true});
    // Os irmãos entram primeiro, para o culto aberto ficar no topo da agenda.
    // Um irmão que já existe no aparelho não é reescrito: ele pode já ter
    // setlist própria, e "manhã e noite saíram iguais" não autoriza apagá-la.
    for(var j=IRMAOS.length-1;j>=0;j--){
      var ir=IRMAOS[j];
      var tem=false;
      for(var q=0;q<idx.length;q++)if(idx[q]&&idx[q].nome===ir.nome)tem=true;
      if(!tem){
        idx.unshift(ir);
        // A setlist do irmão também é gravada — "mesma setlist, um por
        // período" é a promessa que a criação fez. Sem isto o culto da noite
        // nascia vazio no aparelho e a agenda o mostrava como "setlist vazia",
        // mesmo tendo sido criado junto com a manhã, que estava cheia.
        // Só na criação: irmão que já existia não é tocado, acima.
        if(ordem)por('cifras:culto:novo/'+ir.nome,ordem);
      }
    }
    idx.unshift({nome:NOME,rotulo:${JSON.stringify(culto.rotulo)},periodo:${JSON.stringify(culto.periodo)},
      titulo:${JSON.stringify(culto.titulo ?? null)},tema:${JSON.stringify(culto.tema ?? null)},
      data:${JSON.stringify(culto.dataISO ?? null)},
      // A identidade já codificada: é com ela que a agenda remonta o link.
      id:${JSON.stringify(new URLSearchParams(identidadeDoCulto(culto)).toString())},
      salvo:antes?antes.salvo:null,em:antes?antes.em:null});
    por(IDX,JSON.stringify(idx.slice(0,40)));
  }catch(e){}`
      : ''
  }

  if(url.searchParams.get('limpar')==='1'){
    por(K,null);
  }else if(ordem){
    // A URL manda: foi ela que trouxe a ação que o usuário acabou de clicar.
    por(K,ordem===CANONICA?null:ordem);
  }else{
    // Sem ?ordem= na URL: se há rascunho guardado, é ele que vale.
    var salvo=ler(K);
    if(salvo&&salvo!==CANONICA){
      url.searchParams.set('ordem',salvo);
      location.replace(url.pathname+'?'+url.searchParams);
      return;
    }
  }

  // ------------------------------------------------ estado do culto
  var KE=K+':estado';
  var alvo=document.getElementById('status');
  var iniciar=document.getElementById('iniciar');
  var encerrar=document.getElementById('encerrar');
  var ROTULO={preparando:'Preparando','ao-vivo':'Ao vivo',encerrado:'Encerrado'};
  function pintar(){
    var e=ler(KE)||'preparando';
    if(!ROTULO[e])e='preparando';
    alvo.dataset.estado=e;
    alvo.textContent=ROTULO[e];
    iniciar.textContent=e==='ao-vivo'?'Voltar ao culto':'Iniciar culto';
    encerrar.hidden=e!=='ao-vivo';
  }
  iniciar.addEventListener('click',function(){por(KE,'ao-vivo')});
  encerrar.addEventListener('click',function(){por(KE,'encerrado');pintar()});
  pintar();

  // ------------------------------------------------ salvar no aparelho
  //
  // "Salvar" aqui é o que o produto pode prometer hoje: o culto e a setlist
  // ficam neste aparelho (e no link). **Não há escrita no servidor** — a
  // regra do projeto é sem banco, e prometer nuvem num botão seria mentira
  // que só se descobre no aparelho do outro músico.
  var salvar=document.getElementById('salvar');
  var estadoSalvo=document.getElementById('estado-salvo');

  function ordemAtual(){return (new URL(location.href)).searchParams.get('ordem')||''}
  function entradaNoIndice(){
    try{
      var l=JSON.parse(ler(IDX)||'[]');
      if(l instanceof Array)for(var i=0;i<l.length;i++)if(l[i]&&l[i].nome===NOME)return l[i];
    }catch(e){}
    return null;
  }
  function contar(o){var n=o?o.split(',').length:0;return n+(n===1?' música':' músicas')}
  function dizerEstado(){
    if(!estadoSalvo)return;
    var e=entradaNoIndice(),o=ordemAtual();
    if(!o)estadoSalvo.textContent='sem música ainda; adicione e salve.';
    else if(!e||!e.salvo)estadoSalvo.textContent='ainda não salvo neste aparelho.';
    else if(e.salvo===o)estadoSalvo.textContent='salvo neste aparelho, com '+contar(o)+'.';
    else estadoSalvo.textContent='alterado depois de salvo ('+contar(e.salvo)+' salvas).';
  }

  function salvarAgora(){
    try{
      var l=JSON.parse(ler(IDX)||'[]');
      if(!(l instanceof Array))l=[];
      var o=ordemAtual();
      l=l.map(function(c){
        if(c&&c.nome===NOME){c.salvo=o;c.em=new Date().toISOString()}
        return c;
      });
      por(IDX,JSON.stringify(l));
    }catch(e){}
    dizerEstado();
  }

  if(salvar){
    salvar.hidden=false;
    salvar.addEventListener('click',function(){
      salvarAgora();
      salvar.textContent='Culto salvo';
      setTimeout(function(){salvar.textContent='Salvar culto'},2000);
    });
    dizerEstado();
  }

  // --------------------------------------------- sair sem salvar
  //
  // O que está em jogo é o carimbo de salvo, não a setlist: o rascunho
  // continua neste aparelho de qualquer jeito. Por isso o aviso fala em
  // "mudou depois do último salvamento", e não em perder o culto.
  var dlgSair=document.getElementById('dlg-sair');
  var EXEC=${JSON.stringify('/executar/novo/' + encodeURIComponent(culto.nome))};
  var indoPara=null;
  var liberado=false;

  function sujo(){
    var o=ordemAtual();
    if(!o)return false; // culto ainda sem música não tem o que salvar
    var e=entradaNoIndice();
    return !e||e.salvo!==o;
  }
  // Editar não é sair: os links do próprio painel (e o de iniciar o culto,
  // que leva a setlist no ?ordem=) passam direto.
  function fica(a){
    var u=new URL(a.getAttribute('href'),location.href);
    return u.origin===location.origin&&(u.pathname===location.pathname||u.pathname===EXEC);
  }

  if(dlgSair){
    document.addEventListener('click',function(ev){
      var a=ev.target.closest('a[href]');
      if(!a||ev.metaKey||ev.ctrlKey||ev.shiftKey||ev.button||a.target==='_blank')return;
      if(fica(a)){liberado=true;return}
      if(!sujo())return;
      ev.preventDefault();
      indoPara=a.href;
      if(dlgSair.showModal)dlgSair.showModal();else dlgSair.setAttribute('open','');
    });
    function fecharSair(){
      if(dlgSair.close)dlgSair.close();else dlgSair.removeAttribute('open');
    }
    function sair(){liberado=true;location.href=indoPara}
    document.getElementById('sair-cancelar').addEventListener('click',function(){
      indoPara=null;fecharSair();
    });
    document.getElementById('sair-descartar').addEventListener('click',sair);
    document.getElementById('sair-salvar').addEventListener('click',function(){
      salvarAgora();sair();
    });
    // Fechar a aba ou recarregar não passa por link nenhum: aí quem avisa é
    // o navegador, com o texto dele.
    window.addEventListener('beforeunload',function(ev){
      if(liberado||!sujo())return;
      ev.preventDefault();ev.returnValue='';
    });
  }

  // ------------------------------------------------ link para o celular
  var copiar=document.getElementById('copiar');
  if(copiar)copiar.addEventListener('click',function(){
    var alvo=document.getElementById('iniciar').href;
    var pronto=function(){copiar.textContent='Link copiado';
      setTimeout(function(){copiar.textContent='Copiar link para o celular'},2000)};
    if(navigator.clipboard&&navigator.clipboard.writeText){
      navigator.clipboard.writeText(alvo).then(pronto,function(){prompt('Copie o link:',alvo)});
    }else{prompt('Copie o link:',alvo)}
  });
})();
</script>`;
}

// ---------------------------------------------------------- biblioteca

/**
 * A biblioteca: o acervo inteiro, com busca por **nome, tema e cantor/banda**.
 *
 * Os três campos filtram **juntos** (E, não OU): quem digita "adoração" no tema
 * e "Fernandinho" no cantor quer a interseção. Cada um lê o seu próprio
 * `data-` do item, e não um índice único concatenado, senão "Fernandinho" no
 * campo de nome acharia a música pelo artista.
 *
 * "Tema" é uma LISTA, não um campo de texto, e isso decorre do dado: o `temas:`
 * do `.cifra` tem vocabulário fechado (`src/temas.ts`), então digitar só
 * oferece o erro — "adoraçao", "louvores", "gratidao" — sem oferecer nada que
 * escolher de uma lista não ofereça. A lista mostra apenas os temas que ALGUMA
 * música tem, com a contagem: um tema do vocabulário que ninguém usou seria uma
 * opção que só leva a "nada com esses filtros".
 *
 * O casamento é por segmento delimitado (`|Adoração|`) e não por substring:
 * uma música tem vários temas no mesmo atributo, e substring faria um tema
 * contido no nome de outro trazer música errada.
 *
 * Hino de hinário entra pelo campo de NOME, pelo número: o acervo tem hinos do
 * HCC, e "hino 25" é como eles são chamados. Ver `fonte`/`numero` em
 * `site/repertorio.ts`.
 */
export function paginaBiblioteca(rep: Repertorio): string {
  const comTema = rep.todas.filter((m) => m.temas?.length).length;

  // Quantas músicas por tema, só dos que aparecem. Ordena por frequência e
  // desempata por nome: o topo da lista é o que mais serve, e a ordem é
  // estável entre recargas.
  const contagem = new Map<string, number>();
  for (const m of rep.todas) {
    for (const t of m.temas ?? []) contagem.set(t, (contagem.get(t) ?? 0) + 1);
  }
  const temasUsados = [...contagem.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pt-BR'),
  );

  const itens = rep.todas
    .map((m) => {
      // Num hinário o número É o nome: quem procura "hino 25" digita 25, não
      // "Tu és Fiel". Por isso ele entra no `data-titulo` (o campo "Nome da
      // música"), e não num filtro novo — hino é o mesmo objeto que música,
      // só com um segundo jeito de ser chamado.
      const referencia = m.fonte && m.numero ? `${m.fonte} ${m.numero}` : '';
      // A linha de baixo do cartão mostra o artista; num hino ela está vazia,
      // e é onde a referência do hinário cabe sem inventar cromo novo.
      const legenda = [m.artista, referencia].filter(Boolean).join(' · ');
      return (
        `<li data-titulo="${esc(`${m.titulo} ${referencia}`.trim())}" data-artista="${esc(m.artista)}" ` +
        // Delimitado nas duas pontas para o filtro casar segmento inteiro.
        `data-tema="${esc(m.temas?.length ? `|${m.temas.join('|')}|` : '')}" ` +
        `data-busca="${esc(`${m.titulo} ${m.artista} ${referencia}`.trim())}" data-tom-origem="${esc(m.tom)}">` +
        `<a href="/musica/${esc(m.slug)}">` +
        // Os temas NÃO entram na linha do cartão. Quando eram o `momento`, só 4
        // músicas os tinham e a linha quase nunca crescia; agora as 341 têm
        // três cada, e "HCC 52 · Glória de Deus, Adoração, Gratidão" empurra
        // para fora o que se procura numa lista — o nome e o artista. Quem
        // filtra por tema já sabe qual tema pediu; o dado vive no `data-tema`.
        `<span class=nome><b>${esc(m.titulo)}</b>` +
        `<span>${esc(legenda)}</span></span>` +
        `<span class=pastilha>${esc(m.tom)}</span></a></li>`
      );
    })
    .join('');

  // Os chips filtram por TOM DE ORIGEM, que é dado que existe em toda música.
  const tonsUsados = [...new Set(rep.todas.map((m) => m.tom))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const chips = tonsUsados
    .map((t) => `<button class=chip type=button data-tom-filtro="${esc(t)}" aria-pressed=false>${esc(t)}</button>`)
    .join('');

  const campo = (chave: string, rotulo: string, dica: string) =>
    `<label class=campo-busca>${esc(rotulo)}` +
    `<input class=campo type=search data-filtro=lista data-campo="${esc(chave)}" autocomplete=off ` +
    `placeholder="${esc(dica)}" aria-label="${esc(rotulo)}"></label>`;

  // O valor da opção é o segmento delimitado que o filtro procura no item.
  const opcoes =
    `<option value="">Todos os temas</option>` +
    temasUsados
      .map(([t, n]) => `<option value="|${esc(t)}|">${esc(t)} (${n})</option>`)
      .join('');
  const seletorTema =
    '<label class=campo-busca>Tema' +
    '<select class="campo campo-select" data-filtro=lista data-campo="tema" ' +
    `aria-label="Filtrar por tema">${opcoes}</select></label>`;

  const miolo =
    `<h1 class=secao-tit>Músicas<em>${rep.todas.length} no repertório</em></h1>` +
    '<div class=cartao><div class=busca-topo>' +
    '<div class=campos-busca>' +
    campo('titulo', 'Nome da música ou nº do hino', 'Ex.: O Grande Eu Sou, ou 25') +
    seletorTema +
    campo('artista', 'Cantor / banda', 'Ex.: Gabriela Rocha') +
    '</div>' +
    `<nav class="fila" data-chips=lista aria-label="Filtrar por tom">${chips}</nav>` +
    '</div>' +
    `<ul class=lista id=lista>${itens}</ul>` +
    '<p class=vazio data-vazio=lista hidden style="padding:28px 16px">Nada com esses filtros.</p>' +
    '</div>' +
    `<p class=contagem><span data-conta=lista>${rep.todas.length}</span> de ${rep.todas.length} músicas. ` +
    `Os três filtros valem juntos. O tema vem do campo <code>temas</code> do <code>.cifra</code>, ` +
    `que ${comTema} das ${rep.todas.length} músicas já tem preenchido — as demais não aparecem ` +
    `com um tema escolhido.</p>`;

  return paginaPainel({
    titulo: 'Músicas',
    ativo: '/musicas',
    css: CSS_PAINEL,
    miolo,
    scripts: SCRIPT_FILTRO,
  });
}

// -------------------------------------------------------------- hinário

/**
 * O hinário: o mesmo acervo, na ordem do livro.
 *
 * Existe como tela separada por uma razão só, e ela não é organizacional: um
 * hino é chamado pelo **número**, não pelo nome — "vamos no 422". `/musicas`
 * ordena por título, que é a ordem certa para música de banda e a errada para
 * hino. Duas ordens do mesmo acervo são dois destinos.
 *
 * Por isso a tela não repete os três campos da biblioteca. Tem um campo só, e
 * ele aceita o número — que é como a pergunta chega ("temos o 422?").
 *
 * **Não há botão de pôr no culto aqui, de propósito.** O culto não tem URL
 * fixa: ele é a setlist codificada na querystring (`docs/site.md`), então uma
 * tela que não sabe qual culto está aberto não tem para onde adicionar. O
 * caminho de acrescentar hino ao culto é o mesmo de qualquer música — o
 * "+ Adicionar música" de dentro do culto, que aceita o número do hino no
 * filtro. Um segundo caminho aqui seria um botão que às vezes não tem destino.
 */
export function paginaHinario(rep: Repertorio): string {
  // Com um hinário só, repetir "HCC" em toda linha não distingue nada — e o
  // número já está na coluna ao lado, em corpo maior. A linha de baixo só
  // ganha texto quando há mais de um livro no acervo, que é quando ela passa
  // a responder "de qual hinário?".
  const variosLivros = new Set(rep.hinos.map((m) => m.fonte)).size > 1;

  const itens = rep.hinos
    .map((m) => {
      const referencia = `${m.fonte} ${m.numero}`;
      return (
        `<li data-busca="${esc(`${m.titulo} ${referencia}`)}">` +
        `<a href="/musica/${esc(m.slug)}">` +
        `<span class=num-hino>${esc(m.numero!)}</span>` +
        `<span class=nome><b>${esc(m.titulo)}</b>` +
        (variosLivros ? `<span>${esc(m.fonte!)}</span>` : '') +
        '</span>' +
        `<span class=pastilha>${esc(m.tom)}</span></a></li>`
      );
    })
    .join('');

  // Nenhum hino cifrado ainda é o estado normal de uma igreja que está
  // começando — a tela diz o que fazer, não pede desculpa.
  const vazio =
    '<div class=cartao><p class=vazio style="padding:36px 20px">' +
    'Nenhum hino no acervo ainda. Um <code>.cifra</code> entra no hinário quando ' +
    'declara de que livro veio e o número dele:<br><br>' +
    '<code>fonte: HCC</code><br><code>numero: 422</code>' +
    '</p></div>';

  const lista =
    '<div class=cartao><div class=busca-topo>' +
    '<label class=campo-busca>Número do hino ou título' +
    '<input class=campo type=search data-filtro=hinos autocomplete=off ' +
    'placeholder="Ex.: 422, ou Grandioso és Tu" aria-label="Número do hino ou título"></label>' +
    '</div>' +
    `<ul class=lista id=hinos>${itens}</ul>` +
    '<p class=vazio data-vazio=hinos hidden style="padding:28px 16px">Esse hino não está no acervo.</p>' +
    '</div>' +
    `<p class=contagem><span data-conta=hinos>${rep.hinos.length}</span> de ${rep.hinos.length} ` +
    `${rep.hinos.length === 1 ? 'hino cifrado' : 'hinos cifrados'}. ` +
    'Um hino entra no culto por "+ Adicionar música", digitando o número.</p>';

  return paginaPainel({
    titulo: 'Hinário',
    ativo: '/hinario',
    css: CSS_PAINEL,
    miolo:
      `<h1 class=secao-tit>Hinário<em>${rep.hinos.length} no acervo</em></h1>` +
      (rep.hinos.length === 0 ? vazio : lista),
    scripts: SCRIPT_FILTRO,
  });
}

// -------------------------------------------------------------- agenda

/** A data de hoje como o `<input type=date>` a quer, no fuso de quem serve. */
function hojeISO(agora = new Date()): string {
  const dois = (n: number) => String(n).padStart(2, '0');
  return `${agora.getFullYear()}-${dois(agora.getMonth() + 1)}-${dois(agora.getDate())}`;
}

/** O que o usuário já tinha digitado — para o formulário voltar preenchido. */
export interface RascunhoCulto {
  nome?: string;
  data?: string;
  /**
   * Os períodos marcados. Plural porque manhã e noite do mesmo domingo
   * costumam ter a mesma setlist — marcar os dois cria os dois cultos, com o
   * mesmo ponto de partida e vida própria a partir dali.
   */
  periodos?: readonly string[];
  tema?: string;
  musicas?: string;
}

/**
 * O formulário de abrir culto.
 *
 * "Abrir" aqui é montar a URL do culto — o servidor é sem estado e não guarda
 * culto nenhum (`docs/site.md`). **Data e período** viram o nome na convenção
 * do padrão visual (`14SET_Noite`), que é a identidade do culto; **nome e
 * tema** são texto de quem preparou e viajam na query, junto com a setlist,
 * porque é o link que atravessa para o celular.
 *
 * A **setlist** é digitada de uma vez, uma música por linha com o tom no fim
 * — é como a ordem do culto já é escrita à mão, e evita cinco buscas e cinco
 * cliques para montar cinco músicas (`site/setlistTexto.ts`). Ela vira o
 * `?ordem=` no mesmo redirecionamento; não é campo guardado em lugar nenhum.
 */
function formCriarCulto(
  v: RascunhoCulto = {},
  ambiguas: readonly ProblemaSetlist[] = [],
  escolhas: Readonly<Record<string, string>> = {},
): string {
  const marcados = new Set(v.periodos ?? []);
  // Caixa, não lista: manhã e noite do mesmo dia são dois cultos, e marcar os
  // dois é o caminho normal de quem repete a setlist. `<select>` obrigava a
  // escolher um e refazer tudo para o outro.
  const periodos = PERIODOS_OFERECIDOS.map(
    (chave) =>
      '<label class=periodo-op>' +
      `<input type=checkbox name=periodo value="${esc(chave)}"` +
      `${marcados.has(chave) ? ' checked' : ''}>` +
      `<span>${esc(PERIODOS[chave]!)}</span></label>`,
  ).join('');

  return (
    '<form class=form-criar method=get action="/culto/novo">' +
    '<label class=larga>Nome do culto <span class=opc>(opcional)</span>' +
    `<input class=campo name=nome maxlength=60 autocomplete=off value="${esc(v.nome ?? '')}" ` +
    'placeholder="Culto de domingo"></label>' +
    `<label>Data<input class=campo type=date name=data required value="${esc(v.data || hojeISO())}"></label>` +
    '<fieldset class=periodos><legend>Período <span class=opc>(marque os que tiverem esta setlist)</span></legend>' +
    `<div class=periodo-linha>${periodos}</div></fieldset>` +
    '<label class=larga>Tema <span class=opc>(opcional)</span>' +
    `<input class=campo name=tema maxlength=40 autocomplete=off value="${esc(v.tema ?? '')}" ` +
    'placeholder="Gratidão"></label>' +
    '<label class=larga>Setlist <span class=opc>(opcional — uma música por linha, o tom no fim)</span>' +
    '<textarea class="campo campo-alto" name=musicas rows=6 autocomplete=off ' +
    'placeholder="VITORIOSO ÉS - G&#10;QUEBRANTADO (C)&#10;TEU TOQUE">' +
    `${esc(v.musicas ?? '')}</textarea></label>` +
    blocoEscolhas(ambiguas, escolhas) +
    '<div class=modal-acoes>' +
    '<button class=btn type=button data-fechar hidden>Cancelar</button>' +
    `<button class="btn btn-forte" type=submit>${ambiguas.length ? 'Confirmar e criar' : 'Criar culto'}</button>` +
    '</div></form>'
  );
}

/**
 * A pergunta que o acervo faz quando uma linha alcança mais de uma música.
 *
 * **É uma pergunta, não um erro.** 58 dos 343 títulos do acervo se repetem —
 * "VITORIOSO ÉS" tem seis transcrições — e nesses casos os títulos são
 * idênticos: quem digitou não escreveu nada errado, e não há texto que
 * desempate. O que separa uma versão da outra é o **tom** e os **acordes**,
 * então é isso que a tela mostra, com a cifra de verdade em cada opção.
 *
 * Cada linha ambígua vira um grupo de rádios; a resposta volta em
 * `escolha=LINHA=slug`. Rádio de verdade (não link) porque um culto pode ter
 * várias linhas ambíguas, e resolver uma de cada vez, recarregando, seria
 * pior que a trava que isto substitui.
 */
function blocoEscolhas(
  ambiguas: readonly ProblemaSetlist[],
  escolhas: Readonly<Record<string, string>>,
): string {
  if (ambiguas.length === 0) return '';

  const grupos = ambiguas
    .map((p) => {
      const candidatas = p.candidatas ?? [];
      const escolhida = escolhas[p.linha];
      // Duas versões podem ficar com o cartão idêntico: mesmo tom e mesmos
      // acordes (o acervo tem duas "VITORIOSO ÉS" em G assim). Aí nada do que
      // está na tela desempata, e o nome do arquivo é o único lugar onde a
      // diferença está escrita. Só nesse caso ele aparece — mostrar slug
      // sempre seria expor o encanamento a quem não precisa dele.
      const assinatura = (m: MusicaIndexada) => `${m.tom}|${primeirosAcordes(m)}`;
      const contagem = new Map<string, number>();
      for (const m of candidatas) {
        contagem.set(assinatura(m), (contagem.get(assinatura(m)) ?? 0) + 1);
      }

      const opcoes = candidatas
        .map((m, i) => {
          // Sem nada escolhido, a primeira vem marcada: o acervo lista a
          // versão sem sufixo primeiro, que é a que a banda tocou mais.
          const marcada = escolhida ? m.slug === escolhida : i === 0;
          const legenda = [
            m.artista,
            m.fonte && m.numero ? `${m.fonte} ${m.numero}` : '',
            (contagem.get(assinatura(m)) ?? 0) > 1 ? m.slug : '',
          ]
            .filter(Boolean)
            .join(' · ');
          return (
            '<label class=versao>' +
            `<input type=radio name=escolha value="${esc(`${p.linha}=${m.slug}`)}"` +
            `${marcada ? ' checked' : ''}>` +
            '<span class=versao-cartao>' +
            `<span class=versao-tom>${esc(m.tom)}</span>` +
            '<span class=versao-quem>' +
            `<b>${esc(m.titulo)}</b>` +
            // O capotraste, quando a transcrição o anuncia. É a diferença
            // entre duas versões que de resto são a mesma música no mesmo tom:
            // o violonista toca outra forma e soa igual. Vai junto da legenda
            // para o cartão continuar com dois filhos e a grade não quebrar.
            ((capo) =>
              legenda || capo
                ? '<span>' +
                  esc(legenda) +
                  (capo
                    ? `${legenda ? ' ' : ''}<em class=versao-capo>${esc(capo)}</em>`
                    : '') +
                  '</span>'
                : '')(capotrasteDe(m)) +
            '</span>' +
            // A prova real: os primeiros acordes. É o que distingue duas
            // transcrições do mesmo título, e o que o músico reconhece.
            `<span class=versao-cifra>${primeirosAcordes(m)}</span>` +
            '</span></label>'
          );
        })
        .join('');

      return (
        '<div class=escolha-grupo>' +
        `<p class=escolha-linha>Você escreveu <b>${esc(p.linha)}</b> — ` +
        `${candidatas.length} versões no acervo. Qual é a de vocês?</p>` +
        `<div class=versoes>${opcoes}</div></div>`
      );
    })
    .join('');

  return (
    '<section class=escolhas>' +
    `<h3>${ambiguas.length === 1 ? 'Uma linha tem mais de uma versão' : `${ambiguas.length} linhas têm mais de uma versão`}</h3>` +
    `<p class=sub>Os títulos são iguais; o tom e os acordes é que mudam.</p>${grupos}` +
    '</section>'
  );
}

/**
 * O capotraste que a transcrição anuncia ("CAPOTRASTE NA PRIMEIRA CASA"),
 * normalizado para caber no cartão.
 *
 * Vem do texto porque é lá que está: o `.cifra` não tem campo de capotraste, e
 * quem transcreveu escreveu a instrução como linha de letra. **Não se infere**
 * do descompasso entre o tom e o primeiro acorde — música pode começar fora da
 * tônica, e chamar isso de capotraste seria inventar dado sobre a cifra.
 */
function capotrasteDe(m: MusicaIndexada): string | null {
  for (const [tipo, dado] of m.corpo ?? []) {
    if (tipo !== 'let' || typeof dado !== 'string') continue;
    if (/capotraste|capo\b/i.test(dado)) {
      // "CAPOTRASTE NA PRIMEIRA CASA" vira "capotraste na 1ª casa": o cartão
      // tem uma linha, e a instrução inteira não cabe em caixa alta.
      const casa = /\b(primeir|segund|terceir|quart|quint|sext|s[eé]tim|oitav)/i.exec(dado);
      const numero = casa
        ? ['primeir', 'segund', 'terceir', 'quart', 'quint', 'sext', 'setim', 'oitav'].indexOf(
            casa[1]!.toLowerCase().replace('é', 'e'),
          ) + 1
        : Number(/\b(\d{1,2})[ªa]?\s*casa/i.exec(dado)?.[1] ?? 0);
      return numero > 0 ? `capotraste na ${numero}ª casa` : 'com capotraste';
    }
  }
  return null;
}

/**
 * Os primeiros acordes distintos da música — a assinatura que o músico lê de
 * relance para reconhecer a versão. Só acorde: a letra é obra de terceiro e
 * não precisa aparecer aqui para a escolha funcionar.
 */
function primeirosAcordes(m: MusicaIndexada, quantos = 6): string {
  const vistos: string[] = [];
  const engolir = (texto: string) => {
    // `|`, `%`, `:` são estrutura de compasso, não acorde (regra 2 do
    // CLAUDE.md). Repetição imediata também não entra: "| Db | % |" é um
    // acorde só para quem está reconhecendo a música de relance.
    for (const bruto of texto.split(/[\s|]+/)) {
      const limpo = bruto.trim();
      if (!limpo || limpo === '%' || /^[:|.\-]+$/.test(limpo)) continue;
      if (limpo !== vistos[vistos.length - 1]) vistos.push(limpo);
      if (vistos.length >= quantos) return true;
    }
    return false;
  };

  for (const [tipo, dado] of m.corpo ?? []) {
    if (tipo === 'cif' && typeof dado === 'string') {
      if (engolir(dado)) break;
    } else if (tipo === 'pos' && typeof dado === 'string') {
      // Linha posicional: o acorde fica sobre a sílaba, e o que sobra entre
      // eles é espaçamento — separar por espaço já devolve só os acordes.
      if (engolir(dado)) break;
    } else if (tipo === 'labc' && Array.isArray(dado)) {
      // `[Intro]` mais a progressão: o rótulo fica de fora, a cifra entra.
      if (engolir(String(dado[1] ?? ''))) break;
    }
  }

  return vistos.length
    ? vistos.map((a) => `<span>${esc(a)}</span>`).join('')
    : '<span class=sem-acorde>sem acordes no arquivo</span>';
}

/**
 * O modal de abrir culto, mais o mesmo formulário em `<noscript>`.
 *
 * `<dialog>` sem JavaScript não abre — por isso o botão nasce `hidden` e é o
 * script que o mostra, e por isso o `<noscript>` traz o formulário na página.
 * O painel inteiro funciona sem JS e abrir culto não podia ser a exceção.
 */
function blocoModalCulto(
  erros: readonly string[],
  rascunho: RascunhoCulto,
  ambiguas: readonly ProblemaSetlist[] = [],
  escolhas: Readonly<Record<string, string>> = {},
): string {
  return (
    // Com versões para escolher o modal cresce: as cifras precisam de largura
    // para caber numa linha, e é nelas que a escolha se decide.
    (ambiguas.length
      ? '<dialog class="modal modal-largo" id=dlg-culto aria-labelledby=tit-criar>'
      : '<dialog class=modal id=dlg-culto aria-labelledby=tit-criar>') +
    '<div class=modal-topo><h2 id=tit-criar>Novo culto</h2>' +
    // Como o culto é guardado (aparelho + link, sem estado no servidor) é
    // assunto de Configurações, não da tela de quem está marcando um culto.
    '<p class=sub>Escreva a setlist agora ou monte depois, no painel. ' +
    'O culto fica neste aparelho e no link que você compartilhar.</p></div>' +
    (erros.length
      ? `<div class=erro role=alert><ul>${erros.map((e) => `<li>${esc(e)}</li>`).join('')}</ul></div>`
      : '') +
    formCriarCulto(rascunho, ambiguas, escolhas) +
    '</dialog>' +
    '<noscript><section class="cartao criar-culto">' +
    '<div class=cartao-topo><div class=quem><h2>Novo culto</h2>' +
    '<p class=sub>Sem JavaScript o formulário abre aqui mesmo.</p></div></div>' +
    formCriarCulto(rascunho, ambiguas, escolhas) +
    '</section></noscript>'
  );
}

/**
 * As listas de culto que só o aparelho conhece.
 *
 * Sai vazio do servidor de propósito: ele não sabe — nem pode saber — que
 * cultos alguém abriu. Quem preenche é o `SCRIPT_CULTOS_LOCAIS`, a partir do
 * índice em `localStorage`.
 */
function blocoListaLocal(id: 'futuros' | 'meus', titulo: string, vazio: string): string {
  return (
    `<section class=lista-cultos id=${id} hidden>` +
    `<h2 class=secao-tit>${esc(titulo)}<em id=${id}-conta></em></h2>` +
    `<ul class=cultos id=${id}-lista></ul>` +
    `<p class=vazio id=${id}-vazio>${esc(vazio)}</p>` +
    '</section>'
  );
}

/**
 * Os cultos do aparelho, na tela.
 *
 * Preenche o que existir na página: `#futuros` só o que é de hoje em diante
 * (a agenda), `#meus` todos (o histórico). A data completa vem do índice —
 * o **nome** do culto não tem ano, e sem ano não dá para dizer o que é
 * futuro. Entrada sem data (culto aberto antes deste campo existir) aparece
 * na lista completa, nunca na agenda: chutar que é futuro seria inventar.
 */
const SCRIPT_CULTOS_LOCAIS = `<script>
(function(){
  var IDX=${JSON.stringify(INDICE_NOVOS)};
  var HOJE=(function(){
    var d=new Date(),p=function(n){return (n<10?'0':'')+n};
    return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate());
  })();

  function ler(k){try{return localStorage.getItem(k)}catch(e){return null}}
  function por(k,v){try{v===null?localStorage.removeItem(k):localStorage.setItem(k,v)}catch(e){}}
  function idx(){
    try{var v=JSON.parse(ler(IDX)||'[]');return v instanceof Array?v:[]}catch(e){return []}
  }
  function chave(nome){return 'cifras:culto:novo/'+nome}

  function apagar(nome){
    por(IDX,JSON.stringify(idx().filter(function(o){return o&&o.nome!==nome})));
    por(chave(nome),null);
    por(chave(nome)+':estado',null);
    pintarTudo();
  }

  function item(c){
    var ordem=ler(chave(c.nome))||'';
    var n=ordem?ordem.split(',').length:0;
    var q=(c.id||'')+(ordem?(c.id?'&':'')+'ordem='+encodeURIComponent(ordem):'');
    var li=document.createElement('li');
    var a=document.createElement('a');
    a.href='/culto/novo/'+encodeURIComponent(c.nome)+(q?'?'+q:'');
    var nome=document.createElement('span');nome.className='nome';
    var b=document.createElement('b');b.textContent=c.titulo||c.rotulo||c.nome;
    var sub=document.createElement('span');
    var salvo=!c.salvo?'não salvo':(c.salvo===ordem?'salvo':'alterado depois de salvo');
    sub.textContent=[c.titulo?c.rotulo:null,c.periodo,c.tema,
      n?(n+(n===1?' música':' músicas')):'setlist vazia',salvo].filter(Boolean).join(' · ');
    nome.appendChild(b);nome.appendChild(sub);
    a.appendChild(nome);
    li.appendChild(a);
    var x=document.createElement('button');
    x.type='button';x.className='btn';x.textContent='Apagar';
    x.setAttribute('aria-label','Apagar '+(c.titulo||c.rotulo||c.nome)+' deste aparelho');
    x.addEventListener('click',function(){apagar(c.nome)});
    li.appendChild(x);
    return li;
  }

  function pintar(id,cultos,rotulo){
    var secao=document.getElementById(id);
    if(!secao)return;
    var lista=document.getElementById(id+'-lista');
    var vazio=document.getElementById(id+'-vazio');
    var conta=document.getElementById(id+'-conta');
    // Lista vazia é seção que some: a home não mostra caixa vazia com texto
    // explicando que está vazia — quem não marcou nada tem a grade do mês.
    secao.hidden=cultos.length===0;
    if(conta)conta.textContent=cultos.length?cultos.length+' '+rotulo:'';
    if(vazio)vazio.hidden=cultos.length>0;
    lista.innerHTML='';
    cultos.forEach(function(c){lista.appendChild(item(c))});
  }

  function pintarTudo(){
    var todos=idx();
    // Do mais próximo para o mais distante: a agenda é sobre o que vem aí.
    var futuros=todos.filter(function(c){return c&&c.data&&c.data>=HOJE})
      .sort(function(a,b){return a.data<b.data?-1:a.data>b.data?1:0});
    pintar('futuros',futuros,futuros.length===1?'marcado':'marcados');
    pintar('meus',todos,todos.length===1?'aberto aqui':'abertos aqui');
  }
  pintarTudo();
})();
</script>`;

/**
 * Abre o modal. Sem `showModal` (navegador antigo), o diálogo abre na página.
 *
 * Qualquer `[data-abrir-culto]` abre: o botão de "Novo culto", o CTA do
 * próximo culto e cada domingo da grade do mês. Quem traz `data-data` já
 * chega com a data preenchida — clicar em 20/09 e ter que digitar 20/09 é o
 * tipo de trabalho que a grade existe para eliminar. Os que são `<a>` têm
 * `href` de verdade e continuam funcionando sem script.
 */
const SCRIPT_MODAL_CULTO = `<script>
(function(){
  var dlg=document.getElementById('dlg-culto');
  var gatilhos=document.querySelectorAll('[data-abrir-culto]');
  if(!dlg||!gatilhos.length)return;
  function mostrar(data){
    var d=dlg.querySelector('input[name=data]');
    if(d&&data)d.value=data;
    if(dlg.showModal)dlg.showModal();else dlg.setAttribute('open','');
    var campo=dlg.querySelector('input[name=nome]');
    if(campo)campo.focus();
  }
  Array.prototype.forEach.call(gatilhos,function(g){
    // Botão nasce escondido porque <dialog> não abre sem script; link não,
    // porque o href dele leva ao formulário mesmo sem JavaScript.
    if(g.tagName==='BUTTON')g.hidden=false;
    g.addEventListener('click',function(e){
      e.preventDefault();
      mostrar(g.getAttribute('data-data'));
    });
  });
  dlg.querySelectorAll('[data-fechar]').forEach(function(b){
    b.hidden=false;
    b.addEventListener('click',function(){
      if(dlg.close)dlg.close();else dlg.removeAttribute('open');
    });
  });
  // O 400 do formulário volta com o modal já aberto: o erro tem que estar
  // onde o usuário errou, não numa tela que ele fechou. A pergunta sobre qual
  // versão da música reabre pelo mesmo motivo — e leva o foco para ela, que é
  // o que falta responder, não para o nome do culto lá em cima.
  var perguntas=dlg.querySelector('.escolhas');
  if(dlg.querySelector('.erro')||perguntas){
    mostrar();
    if(perguntas){
      perguntas.scrollIntoView({block:'nearest'});
      var primeiro=perguntas.querySelector('input[type=radio]');
      if(primeiro)primeiro.focus();
    }
  }
})();
</script>`;

const DIAS_SEMANA = [
  'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
  'Quinta-feira', 'Sexta-feira', 'Sábado',
];

/** A data como o `<input type=date>` e o índice do aparelho a escrevem. */
function iso(d: Date): string {
  const dois = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}`;
}

/**
 * Os domingos do mês de `agora` — quatro ou cinco, conforme o mês cai.
 *
 * Nada de hardcoded: o mês, o ano e a quantidade de domingos saem do relógio.
 * O culto de domingo é a regra da casa; o que foge dela (sexta, ensaio) entra
 * como culto marcado e aparece na lista de próximos, não nesta grade.
 */
function domingosDoMes(agora: Date): { iso: string; dia: number; mes: number; ordinal: number }[] {
  const ano = agora.getFullYear();
  const mes = agora.getMonth();
  const domingos = [];
  const d = new Date(ano, mes, 1);
  d.setDate(1 + ((7 - d.getDay()) % 7));
  while (d.getMonth() === mes) {
    domingos.push({
      iso: iso(d),
      dia: d.getDate(),
      mes: mes + 1,
      ordinal: (mes + 1) * 100 + d.getDate(),
    });
    d.setDate(d.getDate() + 7);
  }
  return domingos;
}

/** O próximo domingo a partir de `agora` — hoje, se hoje for domingo. */
function proximoDomingo(agora: Date): Date {
  const d = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  d.setDate(d.getDate() + ((7 - d.getDay()) % 7));
  return d;
}

/** "Domingo, 20 de setembro" — sem ano, que é o que o rótulo de culto faz. */
function porExtenso(d: Date): string {
  return `${DIAS_SEMANA[d.getDay()]}, ${d.getDate()} de ${NOME_MES[d.getMonth()]}`;
}

const DOIS = (n: number) => String(n).padStart(2, '0');

/**
 * A grade dos domingos do mês, com quantos já estão prontos.
 *
 * O que o **servidor** sabe: quais domingos já foram tocados — o repertório
 * casa por dia e mês (o nome do culto não carrega ano, ver `site/cultos.ts`).
 * O que só o **aparelho** sabe: quais foram preparados aqui. Por isso a grade
 * sai do servidor com o que é fato e o `SCRIPT_HOME` a completa; sem
 * JavaScript ela continua correta, só não conhece os cultos deste aparelho.
 *
 * Domingo pendente abre o formulário de novo culto **com a data pronta** —
 * clicar em 20/09 e ter que digitar 20/09 seria trabalho inventado.
 */
function cartaoMes(rep: Repertorio, agora: Date): string {
  const domingos = domingosDoMes(agora);
  const hoje = iso(agora);
  const tocados = new Set(rep.cultos.map((c) => c.ordinal));
  const prontos = domingos.filter((d) => tocados.has(d.ordinal)).length;

  const celulas = domingos
    .map((d) => {
      const realizado = tocados.has(d.ordinal);
      const estado = realizado ? 'realizado' : 'pendente';
      const rotulo = realizado ? 'Realizado' : 'Pendente';
      const culto = realizado ? rep.cultos.find((c) => c.ordinal === d.ordinal) : undefined;
      const destino = culto
        ? `/culto/${segmentoCulto(culto)}`
        : `/culto/novo?data=${d.iso}`;
      const gatilho = culto ? '' : ` data-abrir-culto data-data="${d.iso}"`;
      return (
        `<a href="${destino}" data-dia data-data="${d.iso}" data-estado=${estado}` +
        (d.iso === hoje ? ' data-hoje' : '') +
        `${gatilho} aria-label="${DOIS(d.dia)}/${DOIS(d.mes)} — ${rotulo}">` +
        '<span class=bolha aria-hidden=true>✓</span>' +
        `<b>${DOIS(d.dia)}/${DOIS(d.mes)}</b>` +
        `<span class=rot>${rotulo}</span></a>`
      );
    })
    .join('');

  const mes = `${NOME_MES[agora.getMonth()]} de ${agora.getFullYear()}`;
  const pct = domingos.length ? Math.round((prontos / domingos.length) * 100) : 0;
  return (
    '<section class="cartao mes" id=mes>' +
    `<div class=mes-topo><div class=quem><h2>${esc(mes)}</h2>` +
    '<p class=sub>Cultos do mês (todo domingo)</p></div>' +
    `<div class=conta><b id=mes-conta>${prontos} de ${domingos.length} preparados</b></div></div>` +
    `<div class=barra role=presentation><i id=mes-barra style="width:${pct}%"></i></div>` +
    `<div class=domingos id=mes-domingos>${celulas}</div>` +
    '</section>'
  );
}

/**
 * O próximo culto — o principal CTA da página.
 *
 * O servidor só sabe apontar o próximo domingo; se ele já está preparado, e
 * com quantas músicas, é o `SCRIPT_HOME` que diz, porque essa resposta mora no
 * aparelho. **Horário e número de músicos não aparecem**: não existem no
 * modelo (`site/cultos.ts`), e a home não inventa fato para encher cartão.
 */
function cartaoProximo(rep: Repertorio, agora: Date): string {
  const d = proximoDomingo(agora);
  const data = iso(d);
  // O domingo que já está no repertório é um culto que existe — dizer "ainda
  // não preparado" ao lado da grade que o mostra pronto seria a home se
  // contradizendo em dois cartões vizinhos.
  const pronto = rep.cultos.find((c) => c.ordinal === (d.getMonth() + 1) * 100 + d.getDate());
  const n = pronto?.entradas.length ?? 0;

  const fatos = pronto
    ? [pronto.periodo, `${n} ${n === 1 ? 'música' : 'músicas'}`].filter(Boolean)
    : [];

  return (
    `<section class="cartao proximo" id=proximo data-iso="${data}"` +
    (pronto ? ' data-servidor=1' : '') +
    '><div class=corpo>' +
    `<span class=rot>${icone('agenda')}Próximo culto</span>` +
    `<h2 id=prox-quando>${esc(porExtenso(d))}</h2>` +
    `<div class=fatos id=prox-fatos${fatos.length ? '' : ' hidden'}>` +
    fatos.map((f) => `<span>${esc(f!)}</span>`).join('') +
    '</div>' +
    `<div class=selo id=prox-selo data-estado=${pronto ? 'pronto' : 'pendente'}>` +
    `<div><b id=prox-selo-tit>${pronto ? 'Culto preparado' : 'Ainda não preparado'}</b>` +
    `<span id=prox-selo-sub>${
      pronto
        ? 'Confira a ordem ou abra no celular para tocar.'
        : 'Monte o repertório e leve o link para o palco.'
    }</span></div></div>` +
    (pronto
      ? `<a class="btn btn-forte btn-grande" id=prox-acao href="/culto/${segmentoCulto(pronto)}">` +
        'Abrir culto <span aria-hidden=true>→</span></a>'
      : `<a class="btn btn-forte btn-grande" id=prox-acao href="/culto/novo?data=${data}"` +
        ` data-abrir-culto data-data="${data}">Preparar culto <span aria-hidden=true>→</span></a>`) +
    '</div></section>'
  );
}

/**
 * As quatro ações rápidas.
 *
 * "Novo culto" é secundária de propósito: o sistema já conhece os domingos, e
 * o caminho normal é clicar no domingo, não criar um culto do zero.
 *
 * **"Nova música" fica desabilitada** porque adicionar música ao acervo não
 * existe: o acervo entra por importação (`docs/plano-camada-formato.md`) e
 * cadastro na tela é sprint 2. Um card que abrisse qualquer outra coisa seria
 * mentira, e um card ausente esconderia que a lacuna existe.
 */
function acoesRapidas(): string {
  const card = (
    corpo: string,
    tinta: string,
    ic: 'mais' | 'musicas' | 'buscar' | 'historico',
    titulo: string,
    sub: string,
  ) =>
    corpo
      .replace('%tinta%', tinta)
      .replace(
        '%miolo%',
        `<span class=bolha>${icone(ic)}</span>` +
          `<span><b>${esc(titulo)}</b><span>${esc(sub)}</span></span>`,
      );

  const link = (href: string) => `<a class=acao data-tinta=%tinta% href="${href}">%miolo%</a>`;
  return (
    '<h2 class=secao-tit>Ações rápidas</h2>' +
    '<div class=acoes-rapidas>' +
    card(
      '<button class=acao data-tinta=%tinta% id=abrir-culto type=button hidden data-abrir-culto>%miolo%</button>',
      'acento',
      'mais',
      'Novo culto',
      'Fora do domingo, ou um segundo culto',
    ) +
    card(
      '<span class=acao data-tinta=%tinta% aria-disabled=true>%miolo%</span>',
      'viva',
      'musicas',
      'Nova música',
      'Em breve — o acervo entra por importação',
    ) +
    card(link('/musicas'), 'acento', 'buscar', 'Buscar música', 'Encontre no seu repertório') +
    card(link('/cultos'), 'acento', 'historico', 'Cultos anteriores', 'Veja o histórico') +
    '</div>'
  );
}

/** Os últimos cultos tocados. Sem ano, porque o dado não tem (`cultos.ts`). */
function tabelaUltimos(rep: Repertorio): string {
  if (rep.cultos.length === 0) return '';
  const linhas = rep.cultos
    .slice(0, 5)
    .map((c) => {
      const dia = c.ordinal % 100;
      const mes = (c.ordinal - dia) / 100;
      const data = c.ordinal ? `${DOIS(dia)}/${DOIS(mes)}` : '—';
      const nome = [c.rotulo, c.periodo].filter(Boolean).join(' · ');
      const n = c.entradas.length;
      return (
        `<tr><td class=data>${esc(data)}</td>` +
        `<td class="nome corta">${esc(nome)}</td>` +
        `<td class=qtd>${n} ${n === 1 ? 'música' : 'músicas'}</td>` +
        '<td><span class=selo-status data-estado=realizado>' +
        '<span aria-hidden=true>✓</span>Realizado</span></td>' +
        `<td class=fim><a class=btn href="/culto/${segmentoCulto(c)}">Abrir</a></td></tr>`
      );
    })
    .join('');

  return (
    '<section class="cartao ultimos">' +
    '<div class=cartao-topo><div class=quem><h2>Últimos cultos</h2></div>' +
    '<a class="ver-todos fim" href="/cultos">Ver todos <span aria-hidden=true>→</span></a></div>' +
    '<table class=tabela-cultos><thead><tr>' +
    '<th>Data</th><th class=corta>Nome</th><th>Músicas</th><th>Status</th>' +
    '<th class=fim><span class=so-leitor>Ação</span></th>' +
    `</tr></thead><tbody>${linhas}</tbody></table>` +
    '</section>'
  );
}

/**
 * Completa a home com o que **só o aparelho sabe**: quais domingos já têm
 * culto preparado aqui, e se o próximo já está pronto.
 *
 * O servidor não pode responder isso — ele não guarda culto (`docs/site.md`).
 * A grade e o cartão do próximo já saem corretos sem JavaScript; este script
 * só acrescenta o que o `localStorage` conhece.
 */
const SCRIPT_HOME = `<script>
(function(){
  var IDX=${JSON.stringify(INDICE_NOVOS)};
  var DIAS=${JSON.stringify(DIAS_SEMANA)};
  var MESES=${JSON.stringify(NOME_MES)};
  var grade=document.getElementById('mes-domingos');
  var prox=document.getElementById('proximo');
  if(!grade&&!prox)return;

  function ler(k){try{return localStorage.getItem(k)}catch(e){return null}}
  function idx(){
    try{var v=JSON.parse(ler(IDX)||'[]');return v instanceof Array?v:[]}catch(e){return []}
  }
  function hojeISO(){
    var d=new Date(),p=function(n){return (n<10?'0':'')+n};
    return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate());
  }
  function extenso(s){
    var p=s.split('-'),d=new Date(+p[0],+p[1]-1,+p[2]);
    return DIAS[d.getDay()]+', '+d.getDate()+' de '+MESES[d.getMonth()];
  }

  // Um culto do aparelho, resolvido: quantas músicas tem e para onde vai o
  // link — a setlist vive na chave dele, não no índice.
  function resolver(c){
    var ordem=ler('cifras:culto:novo/'+c.nome)||'';
    var n=ordem?ordem.split(',').length:0;
    var q=(c.id||'')+(ordem?(c.id?'&':'')+'ordem='+encodeURIComponent(ordem):'');
    return {n:n,href:'/culto/novo/'+encodeURIComponent(c.nome)+(q?'?'+q:''),
      periodo:c.periodo,titulo:c.titulo,rotulo:c.rotulo};
  }

  // Um dia pode ter mais de um culto — manhã e noite do mesmo domingo são
  // dois cultos, com setlist e link próprios. Por isso a chave guarda a LISTA:
  // ficar só com o "melhor" escondia o outro, e o da noite não tinha como ser
  // alcançado pela grade.
  var porData={};
  idx().forEach(function(c){
    if(!c||!c.data)return;
    (porData[c.data]=porData[c.data]||[]).push(resolver(c));
  });
  // Na ordem do dia, que é como a agenda fala: manhã, tarde, noite.
  var ORDEM_DIA=['Manhã','Tarde','Noite'];
  Object.keys(porData).forEach(function(d){
    porData[d].sort(function(a,b){
      return ORDEM_DIA.indexOf(a.periodo)-ORDEM_DIA.indexOf(b.periodo);
    });
  });
  /** O culto que representa o dia: o primeiro com setlist, senão o primeiro. */
  function principal(lista){
    for(var i=0;i<lista.length;i++)if(lista[i].n>0)return lista[i];
    return lista[0];
  }

  var HOJE=hojeISO();

  if(grade){
    var celulas=grade.querySelectorAll('[data-dia]');
    var prontos=0;
    Array.prototype.forEach.call(celulas,function(a){
      var d=a.getAttribute('data-data');
      var lista=porData[d];
      if(lista&&lista.length&&a.getAttribute('data-estado')!=='realizado'){
        var r=principal(lista);
        // O dia está preparado quando TODO culto dele tem setlist. Com a manhã
        // pronta e a noite vazia ainda falta trabalho, e dizer "Preparado" ali
        // esconderia justamente o que falta fazer.
        var faltando=lista.filter(function(x){return x.n===0}).length;
        var estado=r.n>0&&faltando===0?'preparado':'pendente';
        a.setAttribute('data-estado',estado);
        a.href=r.href;
        a.removeAttribute('data-abrir-culto');
        var rot=a.querySelector('.rot');
        // Com os períodos desenhados embaixo, "1/2 preparados" repetiria o que
        // as metades já mostram (verde/apagado). O topo diz quantos cultos o
        // dia tem — que é o que as metades NÃO dizem de relance.
        var texto=lista.length>1
          ?lista.length+' cultos'
          :(r.n>0?'Preparado':'Em preparo');
        if(rot)rot.textContent=texto;
        a.setAttribute('aria-label',a.querySelector('b').textContent+' — '+texto+
          (lista.length>1?': '+lista.map(function(x){
            return x.periodo+(x.n?' com '+x.n+(x.n===1?' música':' músicas'):' sem setlist');
          }).join(', '):r.n>0?', '+r.n+(r.n===1?' música':' músicas'):''));
        // Os períodos do dia, cada um com seu link: sem isto o culto da noite
        // não tinha como ser alcançado pela grade.
        //
        // A fita vai num envoltório junto com a célula — não DENTRO dela, que
        // seria <a> dentro de <a>, nem como irmã solta, que viraria mais uma
        // "célula" no grid. O envoltório ocupa o lugar que a célula ocupava.
        if(lista.length>1&&!a.parentNode.classList.contains('dia-varios')){
          var caixa=document.createElement('div');
          caixa.className='dia-varios';
          a.parentNode.insertBefore(caixa,a);
          caixa.appendChild(a);
          // A moldura passa a ser do cartão: é ele que mostra o estado do dia
          // e o anel de hoje, porque a célula lá dentro perdeu a borda.
          caixa.setAttribute('data-estado',estado);
          if(a.hasAttribute('data-hoje'))caixa.setAttribute('data-hoje-dia','');
          var fita=document.createElement('span');
          fita.className='periodos-dia';
          lista.forEach(function(x){
            var p=document.createElement('a');
            p.href=x.href;
            p.textContent=x.periodo||'Culto';
            p.setAttribute('data-pronto',x.n>0?'1':'0');
            p.title=(x.periodo||'Culto')+(x.n?' — '+x.n+(x.n===1?' música':' músicas'):' — sem setlist');
            p.setAttribute('aria-label',p.title);
            fita.appendChild(p);
          });
          caixa.appendChild(fita);
        }
      }
      var e=a.getAttribute('data-estado');
      if(e==='preparado'||e==='realizado')prontos++;
    });
    var conta=document.getElementById('mes-conta');
    var barra=document.getElementById('mes-barra');
    if(conta)conta.textContent=prontos+' de '+celulas.length+' preparados';
    if(barra)barra.style.width=(celulas.length?Math.round(prontos*100/celulas.length):0)+'%';
  }

  if(prox){
    // O próximo culto é o mais próximo entre o próximo domingo e o que já foi
    // marcado neste aparelho — culto de sexta é culto, e não pode ficar atrás
    // de um domingo que ainda nem existe.
    var alvo=prox.getAttribute('data-iso');
    var doServidor=prox.getAttribute('data-servidor');
    var trocou=false;
    Object.keys(porData).forEach(function(d){
      if(d>=HOJE&&d<alvo){alvo=d;trocou=true}
    });
    // O servidor já resolveu este dia pelo repertório: só se mexe se um culto
    // do aparelho for ANTES dele.
    if(doServidor&&!trocou)return;
    var doDia=porData[alvo]||[];
    // Com manhã e noite no mesmo dia, o cartão fala do primeiro que ainda
    // precisa de trabalho — é o que o "próximo culto" existe para responder.
    // Se os dois estão prontos, fala do primeiro do dia.
    var r=doDia.length
      ?(doDia.filter(function(x){return x.n===0})[0]||doDia[0])
      :undefined;
    var quando=document.getElementById('prox-quando');
    if(quando)quando.textContent=(r&&r.titulo)?r.titulo:extenso(alvo);
    var fatos=document.getElementById('prox-fatos');
    var partes=[];
    if(r&&r.titulo)partes.push(extenso(alvo));
    if(r&&r.periodo)partes.push(r.periodo);
    if(r&&r.n)partes.push(r.n+(r.n===1?' música':' músicas'));
    // O outro culto do dia não pode sumir do cartão: quem marcou manhã e
    // noite precisa ver que a noite existe, mesmo com a manhã em foco.
    if(doDia.length>1){
      partes.push(doDia.length+' cultos neste dia');
    }
    if(fatos){
      fatos.hidden=partes.length===0;
      fatos.innerHTML='';
      partes.forEach(function(t){
        var s=document.createElement('span');s.textContent=t;fatos.appendChild(s);
      });
    }
    var selo=document.getElementById('prox-selo');
    var tit=document.getElementById('prox-selo-tit');
    var sub=document.getElementById('prox-selo-sub');
    var acao=document.getElementById('prox-acao');
    if(r&&r.n>0){
      if(selo)selo.setAttribute('data-estado','pronto');
      if(tit)tit.textContent=doDia.length>1?'Cultos do dia preparados':'Culto preparado';
      if(sub)sub.textContent='Confira a ordem ou abra no celular para tocar.';
      if(acao){
        acao.href=r.href;
        acao.removeAttribute('data-abrir-culto');
        acao.innerHTML='Abrir '+(doDia.length>1?(r.periodo||'culto'):'culto')+
          ' <span aria-hidden="true">\\u2192</span>';
      }
    }else if(r){
      // Com dois cultos no dia, dizer só "a setlist está vazia" esconderia que
      // o outro já está pronto — e o que falta é justamente este.
      if(sub)sub.textContent=doDia.length>1
        ?'Falta montar a setlist '+(r.periodo?'da '+r.periodo.toLowerCase():'de um dos cultos')+'.'
        :'O culto existe neste aparelho, mas a setlist está vazia.';
      if(acao){
        acao.href=r.href;
        acao.removeAttribute('data-abrir-culto');
        acao.innerHTML='Montar '+(doDia.length>1&&r.periodo?r.periodo.toLowerCase():'setlist')+
          ' <span aria-hidden="true">\\u2192</span>';
      }
    }else if(acao){
      acao.href='/culto/novo?data='+alvo;
      acao.setAttribute('data-data',alvo);
    }
  }
})();
</script>`;

/**
 * A tela inicial: o painel de preparação do culto.
 *
 * Responde quatro perguntas, nesta ordem — qual é o próximo culto, se ele já
 * está preparado, o que do mês já foi preparado, e o que fazer agora. Como
 * culto de domingo é a regra da casa, a grade do mês é derivada do calendário
 * e não de cadastro nenhum; o estado de cada domingo vem do repertório (o que
 * já foi tocado) e do aparelho (o que foi preparado aqui).
 *
 * `agora` entra por parâmetro para o teste poder fixar o mês. Em produção é o
 * relógio do servidor, e o `SCRIPT_HOME` corrige pelo do aparelho.
 */
export function paginaAgenda(
  rep: Repertorio,
  opcoes: {
    erros?: readonly string[];
    rascunho?: RascunhoCulto;
    agora?: Date;
    /** Linhas da setlist que alcançam mais de uma música: viram pergunta. */
    ambiguas?: readonly ProblemaSetlist[];
    escolhas?: Readonly<Record<string, string>>;
  } = {},
): string {
  const agora = opcoes.agora ?? new Date();

  const cabecalho =
    '<header class=home-topo><div class=quem>' +
    '<h1>Preparado para o próximo culto?</h1>' +
    '<p class=sub>Organize as músicas, alinhe a equipe e conduza o culto com ' +
    'mais simplicidade.</p></div>' +
    '<div class=controles>' +
    // No computador não há barra de topo: sem isto, trocar o tema exigiria ir
    // a Configurações e voltar.
    botaoTema() +
    `<a class=icone-btn href="/configuracoes" aria-label="Configurações">${icone('config')}</a>` +
    `<a class=icone-btn href="/perfil" aria-label="Perfil">${icone('perfil')}</a>` +
    '</div></header>';

  return paginaPainel({
    titulo: 'Início',
    ativo: '/',
    css: CSS_PAINEL,
    largo: true,
    classeCorpo: 'home',
    miolo:
      cabecalho +
      `<div class=home-grade>${cartaoMes(rep, agora)}${cartaoProximo(rep, agora)}</div>` +
      blocoListaLocal('futuros', 'Próximos cultos marcados', '') +
      acoesRapidas() +
      tabelaUltimos(rep) +
      blocoModalCulto(
        opcoes.erros ?? [],
        opcoes.rascunho ?? {},
        opcoes.ambiguas ?? [],
        opcoes.escolhas ?? {},
      ),
    scripts: SCRIPT_MODAL_CULTO + SCRIPT_CULTOS_LOCAIS + SCRIPT_HOME,
  });
}

// ------------------------------------------------------------ histórico

/** O topo do histórico: quem quer abrir um culto vai para a agenda. */
const TOPO_HISTORICO =
  '<header class=culto-topo><div class=quem><h1>Cultos anteriores</h1>' +
  '<p class=sub>Os cultos que já foram tocados, com a ordem e os tons de cada um.</p></div>' +
  '<div class=acoes><a class="btn btn-forte" href="/">+ Novo culto</a></div></header>';

export function paginaHistorico(rep: Repertorio): string {
  if (rep.cultos.length === 0) {
    return paginaPainel({
      titulo: 'Cultos anteriores',
      ativo: '/cultos',
      css: CSS_PAINEL,
      miolo:
        TOPO_HISTORICO +
        blocoListaLocal('meus', 'Cultos abertos neste aparelho', '') +
        '<p class=vazio>Nenhum culto no repertório.</p>',
      scripts: SCRIPT_CULTOS_LOCAIS,
    });
  }

  const itens = rep.cultos
    .map((c, i) => {
      const tons = c.entradas.map((e) => `<span class=pastilha>${esc(e.tom)}</span>`).join('');
      const sub = [c.periodo, `${c.entradas.length} músicas`, i === 0 ? 'mais recente' : null]
        .filter(Boolean)
        .join(' · ');
      return (
        `<li><a href="/culto/${encodeURIComponent(c.nome)}">` +
        `<span class=nome><b>${esc(c.rotulo)}</b><span>${esc(sub)}</span></span>` +
        `<span class=tons>${tons}</span></a></li>`
      );
    })
    .join('');

  return paginaPainel({
    titulo: 'Cultos anteriores',
    ativo: '/cultos',
    css: CSS_PAINEL,
    miolo:
      TOPO_HISTORICO +
      blocoListaLocal('meus', 'Cultos abertos neste aparelho', '') +
      `<h2 class=secao-tit>Já tocados<em>${rep.cultos.length} no repertório</em></h2>` +
      `<ul class=cultos>${itens}</ul>` +
      '<p class=aviso>Cada culto abre no painel com a ordem e os tons em que foi tocado. ' +
      'Alterar a setlist ali não muda o histórico — o rascunho fica no aparelho e no link.</p>',
    scripts: SCRIPT_CULTOS_LOCAIS,
  });
}

// ----------------------------------------------------------- cifra solta

/** Só o miolo da cifra — o que a troca de tom sem recarregar busca. */
export function fragmentoCifra(m: MusicaIndexada, tom: string): string {
  // `momento` é propriedade do papel da música num culto, não da música: uma
  // página solta não deve anunciar "Ofertório" sem contexto. No painel de
  // culto ele aparece, porque lá existe o contexto.
  return escrever(m, tom, false, { momento: false });
}

const SCRIPT_FONTE = `<script>
(function(){
  var K='cifras:escala';
  function ler(){try{return parseFloat(localStorage.getItem(K))||1.35}catch(e){return 1.35}}
  function por(v){
    v=Math.min(2.6,Math.max(1,v));
    document.documentElement.style.setProperty('--esc',v);
    try{localStorage.setItem(K,v)}catch(e){}
  }
  por(ler());
  document.addEventListener('click',function(e){
    var b=e.target.closest('[data-fonte]');
    if(!b)return;
    e.preventDefault();
    por(ler()+(b.dataset.fonte==='+'?0.15:-0.15));
  });
})();
</script>`;

/**
 * Troca de tom sem recarregar. Progressive enhancement puro: os tons são
 * links de verdade (`?tom=X`) e sem JS a navegação normal funciona igual.
 */
const SCRIPT_TOM = `<script>
(function(){
  var alvo=document.getElementById('cifra');
  // O seletor tem 16 tons e rola: sem isto, abrir uma música em G mostra a
  // fila começando em C, com o tom atual fora da tela.
  var atual=document.querySelector('.seletor-tons a[aria-current=true]');
  if(atual)atual.scrollIntoView({block:'nearest',inline:'center'});
  if(!alvo||!window.fetch||!window.history.pushState)return;
  document.addEventListener('click',function(e){
    var a=e.target.closest('.seletor-tons a');
    if(!a||e.metaKey||e.ctrlKey||e.shiftKey||e.button)return;
    e.preventDefault();
    var url=a.getAttribute('href');
    fetch(url+'&fragmento=1',{headers:{'Accept':'text/html'}})
      .then(function(r){if(!r.ok)throw 0;return r.text()})
      .then(function(html){
        alvo.innerHTML=html;
        document.querySelectorAll('.seletor-tons a').forEach(function(o){
          o.setAttribute('aria-current',o===a?'true':'false');
        });
        history.pushState({},'',url);
        a.scrollIntoView({block:'nearest',inline:'center'});
        window.scrollTo(0,0);
      })
      .catch(function(){location.href=url});  // qualquer falha: navegação normal
  });
})();
</script>`;

export function paginaMusica(m: MusicaIndexada, tom: string): string {
  const tons = TONS.map((o) => {
    const atual = o.tom === tom;
    const origem = o.tom === m.tom ? ' origem' : '';
    const enar = o.enarmonico ? `<span class=enar>${esc(o.enarmonico)}</span>` : '';
    return (
      `<a class="tom${origem}" href="/musica/${esc(m.slug)}?tom=${encodeURIComponent(o.tom)}" ` +
      `aria-current="${atual}" title="${esc(o.tom === m.tom ? `${o.tom} — tom de origem` : o.tom)}">` +
      `<span>${esc(o.tom)}</span>${enar}</a>`
    );
  }).join('');

  const corpo =
    '<div class=cifra-topo>' +
    `<a class=icone-btn href="/musicas" aria-label="Voltar para as músicas">&larr;</a>` +
    `<span class=quem><b>${esc(m.titulo)}</b><span>${esc(m.artista)}</span></span>` +
    '<span class=grupo-fonte>' +
    '<button type=button data-fonte="-" aria-label="Diminuir a fonte">A&minus;</button>' +
    '<button type=button data-fonte="+" aria-label="Aumentar a fonte">A+</button>' +
    '</span></div>' +
    `<nav class=seletor-tons aria-label="Trocar o tom">${tons}</nav>` +
    `<div class="cifra cifra-solta" id=cifra>${fragmentoCifra(m, tom)}</div>`;

  return envelope({
    titulo: `${m.titulo} — ${tom}`,
    css: CSS_PAINEL,
    corpo,
    scripts: SCRIPT_FONTE + SCRIPT_TOM,
  });
}

// -------------------------------------------------- configurações / perfil

export function paginaConfiguracoes(): string {
  const miolo =
    '<h1 class=secao-tit>Configurações</h1>' +
    '<div class=prefs>' +
    '<div class=pref><span class=quem><b>Aparência</b>' +
    '<span>Claro para preparar, escuro para executar. A execução já abre no escuro.</span></span>' +
    '<span class=grupo>' +
    '<button class=chip type=button data-tema=auto>Automático</button>' +
    '<button class=chip type=button data-tema=light>Claro</button>' +
    '<button class=chip type=button data-tema=dark>Escuro</button>' +
    '</span></div>' +
    '<div class=pref><span class=quem><b>Tamanho da cifra</b>' +
    '<span>Vale em toda cifra, neste aparelho. Ajuste também disponível durante a execução.</span></span>' +
    '<span class=grupo>' +
    '<button class=chip type=button data-fonte="-">A&minus;</button>' +
    '<button class=chip type=button data-fonte="+">A+</button>' +
    '<span class=chip id=escala-atual>—</span>' +
    '</span></div>' +
    '<div class=pref><span class=quem><b>Rascunhos de setlist</b>' +
    '<span>As alterações de setlist ficam neste aparelho. Apagar volta todos os cultos à ordem tocada.</span></span>' +
    '<span class=grupo><button class="btn" type=button id=limpar-rascunhos>Apagar rascunhos</button></span></div>' +
    '</div>' +
    // Atalho que ninguém conhece não existe. A tela do culto não carrega a
    // legenda — seria cromo permanente numa tela que se orgulha de ser vazia —
    // então ela mora aqui, junto do resto do "como isto funciona", e nos
    // `title` dos próprios botões.
    '<h2 class=secao-tit>Atalhos de teclado <em>no painel do culto</em></h2>' +
    '<ul class=atalhos>' +
    '<li><kbd>j</kbd><kbd>k</kbd><span>Próxima e anterior música da setlist</span></li>' +
    '<li><kbd>[</kbd><kbd>]</kbd><span>Descer e subir meio tom na música atual</span></li>' +
    '<li><kbd>/</kbd><span>Abrir e focar o filtro de adicionar música</span></li>' +
    '<li><kbd>Esc</kbd><span>Fechar o menu de tom aberto</span></li>' +
    '</ul>' +
    '<p class=aviso>Cada atalho aciona um link que já existe na tela — os mesmos ' +
    'que o mouse usa. Nada aqui é a única forma de fazer a coisa.</p>' +
    '<h2 class=secao-tit>Acesso</h2>' +
    '<p class=aviso>O acervo tem letra de música protegida e este site é ferramenta interna da banda: ' +
    'não há login no aplicativo — o gate é HTTP basic auth no nginx, e o processo escuta em ' +
    '<code>127.0.0.1</code> para não ficar alcançável sem ele. Toda página sai com ' +
    '<code>noindex, nofollow</code> e o <code>robots.txt</code> bloqueia tudo.</p>';

  return paginaPainel({
    titulo: 'Configurações',
    ativo: '/configuracoes',
    css: CSS_PAINEL,
    miolo,
    scripts:
      SCRIPT_FONTE +
      `<script>
(function(){
  function ler(k){try{return localStorage.getItem(k)}catch(e){return null}}
  function por(k,v){try{v===null?localStorage.removeItem(k):localStorage.setItem(k,v)}catch(e){}}

  var atual=ler('cifras:tema')||'auto';
  function pintarTema(){
    document.querySelectorAll('[data-tema]').forEach(function(b){
      b.setAttribute('aria-pressed',String(b.dataset.tema===atual));
    });
    if(atual==='auto')document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme',atual);
  }
  document.querySelectorAll('[data-tema]').forEach(function(b){
    b.addEventListener('click',function(){
      atual=b.dataset.tema;
      por('cifras:tema',atual==='auto'?null:atual);
      pintarTema();
    });
  });
  pintarTema();

  var mostra=document.getElementById('escala-atual');
  function pintarEscala(){
    var v=getComputedStyle(document.documentElement).getPropertyValue('--esc');
    mostra.textContent=Math.round(parseFloat(v)*100)+'%';
  }
  document.addEventListener('click',function(e){
    if(e.target.closest('[data-fonte]'))setTimeout(pintarEscala,0);
  });
  pintarEscala();

  document.getElementById('limpar-rascunhos').addEventListener('click',function(e){
    try{
      Object.keys(localStorage).filter(function(k){return k.indexOf('cifras:culto:')===0})
        .forEach(function(k){localStorage.removeItem(k)});
    }catch(err){}
    e.target.textContent='Rascunhos apagados';
  });
})();
</script>`,
  });
}

export function paginaPerfil(): string {
  return paginaPainel({
    titulo: 'Perfil',
    ativo: '/perfil',
    css: CSS_PAINEL,
    miolo:
      '<h1 class=secao-tit>Perfil</h1>' +
      `<div class=painel><p style="margin-top:0">${icone('perfil')}</p>` +
      '<p><b>Não há conta de usuário neste aplicativo.</b></p>' +
      '<p class=aviso>Quem entra é a banda, autenticada pelo HTTP basic auth do nginx ' +
      '(ver <code>deploy/</code>). O aplicativo não guarda usuário, senha nem sessão — ' +
      'e o que é "seu" (tema, tamanho da cifra, rascunho de setlist) fica neste aparelho, ' +
      'em <code>localStorage</code>.</p>' +
      '<p><a class=btn href="/configuracoes">Preferências deste aparelho</a></p></div>',
  });
}

export function paginaNaoEncontrada(): string {
  return paginaPainel({
    titulo: 'Não encontrada',
    ativo: '',
    css: CSS_PAINEL,
    miolo:
      '<h1 class=secao-tit>Não encontrada</h1>' +
      '<p class=vazio>Essa página não existe no painel.</p>' +
      '<p><a class="btn btn-forte" href="/">Ir para o culto</a> ' +
      '<a class=btn href="/musicas">Ver as músicas</a></p>',
  });
}
