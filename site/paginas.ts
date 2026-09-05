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
  PERIODOS,
  PERIODOS_OFERECIDOS,
  identidadeDoCulto,
  segmentoCulto,
  type Culto,
  type EntradaCulto,
} from './cultos.ts';
import { TONS, passoDeTom } from './tons.ts';
import { codificarOrdem } from './setlist.ts';
import { CSS_UI, CSS_CIFRA, paginaPainel, envelope, icone } from './ui.ts';

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

  /* Estado quieto quando a ordem é a do culto; o lilás fica reservado para a
     setlist alterada, que é o que precisa ser notado. */
  .rascunho{display:flex;flex-wrap:wrap;align-items:center;gap:10px;
      margin-top:14px;padding:10px 14px;border-radius:var(--raio);
      background:var(--surface);border:1px solid var(--line);
      color:var(--muted);font-size:13.5px}
  .rascunho b{color:var(--ink)}
  .rascunho[data-estado=alterada]{background:var(--acento-fraco);
      border-color:transparent;color:var(--ink)}
  .rascunho[data-estado=alterada] b{color:var(--acento)}
  .rascunho .btn{min-height:36px;padding:0 12px;font-size:13px}

  /* ------------------------------------------------ setlist */
  .setlist{list-style:none;margin:0;padding:0}
  .setlist li{display:grid;
      grid-template-columns:auto auto minmax(0,1fr) auto;
      grid-template-areas:"marca num nome tom" ". . acoes acoes";
      align-items:center;gap:4px 10px;padding:12px 14px;
      border-bottom:1px solid var(--line)}
  .setlist li:last-child{border-bottom:0}
  /* A música atual ganha barra de acento na borda viva do cartão — o realce
     tem que sobreviver à lista sem margem lateral. */
  .setlist li[data-atual=true]{background:var(--acento-fraco);
      box-shadow:inset 3px 0 0 var(--acento)}
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
  :root[data-theme=dark] .menu-tom[open]>summary{color:#16181d}
  @media (prefers-color-scheme:dark){
    :root:not([data-theme=light]) .menu-tom[open]>summary{color:#16181d}
  }
  .menu-lista{position:absolute;right:0;top:calc(100% + 6px);z-index:40;
      display:grid;grid-template-columns:repeat(4,minmax(46px,1fr));gap:4px;
      padding:8px;border-radius:12px;background:var(--surface);
      border:1px solid var(--line);box-shadow:0 14px 34px rgba(10,12,20,.22)}
  /* No celular a linha é estreita: o menu sai alinhado à direita e não
     estoura a tela. */
  @media (max-width:420px){.menu-lista{right:-6px;grid-template-columns:repeat(4,minmax(44px,1fr))}}
  .menu-lista a{display:flex;flex-direction:column;align-items:center;
      justify-content:center;gap:1px;min-height:44px;border-radius:8px;
      background:var(--raised);color:var(--ink);text-decoration:none;
      font-family:ui-monospace,Menlo,monospace;font-weight:700;font-size:15px}
  .menu-lista a:hover{background:var(--acento-fraco)}
  /* O tom escolhido usa o laranja da cifra, como o seletor da página da
     música: aqui o tom é ESCOLHA sobre a cifra, não etiqueta de lista. */
  .menu-lista a[aria-current=true]{background:var(--cifra);color:#fff}
  .menu-lista a[aria-current=true] .enar{color:#ffe6d5}
  .menu-lista .origem{box-shadow:inset 0 -3px 0 var(--cifra)}
  .menu-lista .enar{font-family:var(--sans);font-weight:500;font-size:10px;
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
  .setlist .acoes span{opacity:.25}
  @media (min-width:700px){
    .setlist li{grid-template-columns:auto auto minmax(0,1fr) auto auto;
        grid-template-areas:"marca num nome tom acoes"}
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
  .passos .desligado{opacity:.35;pointer-events:none}

  /* ------------------------------------------------ biblioteca */
  /* Campo, filtros e lista vivem no mesmo cartão: procurar é uma ação só. */
  .busca-topo{display:grid;gap:12px;padding:16px;
      border-bottom:1px solid var(--line)}
  /* Três campos lado a lado no computador, empilhados no celular. */
  .campos-busca{display:grid;gap:10px;
      grid-template-columns:repeat(auto-fit,minmax(180px,1fr))}
  .campo-busca{display:grid;gap:5px;font-size:12px;font-weight:600;
      color:var(--muted);text-transform:uppercase;letter-spacing:.04em}
  .lista{list-style:none;margin:0;padding:0}
  .lista li{border-bottom:1px solid var(--line)}
  .lista li:last-child{border-bottom:0}
  .lista a{display:flex;align-items:center;gap:12px;min-height:64px;
      padding:10px 16px;text-decoration:none}
  .lista a:hover{background:var(--raised)}
  .lista .nome{flex:1 1 auto;min-width:0}
  .lista .nome b{display:block;font-size:16px;font-weight:600;line-height:1.25}
  .lista .nome span{display:block;margin-top:2px;color:var(--muted);font-size:13px}
  .contagem{margin:18px 0 0;color:var(--muted);font-size:13px}

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
  .seletor-tons a .enar{font-family:var(--sans);font-weight:500;font-size:10px;
      color:var(--muted);line-height:1}
  .seletor-tons a[aria-current=true]{background:var(--cifra);color:#fff}
  .seletor-tons a[aria-current=true] .enar{color:#ffe6d5}
  .seletor-tons .origem{box-shadow:inset 0 -3px 0 var(--cifra)}
  .cifra-solta{padding:16px 14px 40px}
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

  /* ------------------------------------------------ agenda */
  .lista-cultos{margin-top:6px}
  .lista-cultos .vazio{padding:22px 4px}
  .ultimo-culto{margin-top:16px}
  .ultimo-culto .cartao-topo h2{font-size:19px;letter-spacing:-.015em}
  .ultimo-culto .rot{display:block;color:var(--muted);font-size:11.5px;
      font-weight:700;letter-spacing:.09em;text-transform:uppercase}

  /* ------------------------------------------------ configurações */
  .prefs{display:grid;gap:14px;margin-top:14px}
  .pref{display:flex;flex-wrap:wrap;align-items:center;gap:12px;padding:15px;
      border:1px solid var(--line);border-radius:14px;background:var(--surface)}
  .pref .quem{flex:1 1 200px;min-width:0}
  .pref .quem b{display:block;font-size:15px}
  .pref .quem span{display:block;margin-top:2px;color:var(--muted);font-size:13px}
  .pref .grupo{display:flex;gap:6px}
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
  document.addEventListener('toggle',function(e){
    var d=e.target;
    if(d.classList&&d.classList.contains('menu-tom')&&d.open)fechar(d);
  },true);
  document.addEventListener('click',function(e){
    if(!e.target.closest('details.menu-tom'))fechar(null);
  });
  document.addEventListener('keydown',function(e){
    if(e.key==='Escape')fechar(null);
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
  document.querySelectorAll('input[data-filtro]').forEach(function(campo){
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
    campos.forEach(function(c){c.addEventListener('input',aplicar)});
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
): string {
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
        '<span class=tom>' +
        `<a class=passo href="${esc(linkCulto(culto, comTom(entradas, i, passoDeTom(e.tom, -1)), atual))}" ` +
        `aria-label="Descer meio tom">&minus;</a>` +
        menuDeTom(culto, entradas, i, atual) +
        `<a class=passo href="${esc(linkCulto(culto, comTom(entradas, i, passoDeTom(e.tom, 1)), atual))}" ` +
        `aria-label="Subir meio tom">+</a>` +
        '</span>' +
        '<span class=acoes>' +
        acao('Subir na ordem', '&uarr;', i > 0 ? trocar(entradas, i, i - 1) : null, i > 0 && atual === i ? i - 1 : atual) +
        acao('Descer na ordem', '&darr;', i < entradas.length - 1 ? trocar(entradas, i, i + 1) : null, i < entradas.length - 1 && atual === i ? i + 1 : atual) +
        // No culto do repertório a última música não sai — a setlist tocada
        // não fica vazia. No culto novo sai: montar é errar e desfazer.
        acao('Tirar do culto', '&times;', entradas.length > 1 || culto.novo ? semEsta : null, atualDepois, 'remover') +
        '</span></li>'
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
        'placeholder="Filtrar por título ou artista" aria-label="Filtrar músicas">' +
        '<ul class=escolher id=escolher>' +
        candidatas
          .map(
            (m) =>
              `<li data-busca="${esc(`${m.titulo} ${m.artista}`.toLowerCase())}">` +
              `<a href="${esc(linkCulto(culto, [...entradas, { slug: m.slug, tom: m.tom, musica: m }], atual))}">` +
              `<span class=nome><b>${esc(m.titulo)}</b><span>${esc(m.artista)}</span></span>` +
              `<span class=pastilha>${esc(m.tom)}</span></a></li>`,
          )
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
      `<a class="btn${atual === 0 ? ' desligado' : ''}" href="${esc(linkCulto(culto, entradas, Math.max(0, atual - 1)))}"` +
      `${atual === 0 ? ' aria-disabled=true' : ''}>&larr; Anterior</a>` +
      `<span class=conta>${String(atual + 1).padStart(2, '0')} / ${String(entradas.length).padStart(2, '0')}</span>` +
      `<a class="btn${atual >= entradas.length - 1 ? ' desligado' : ''}" href="${esc(linkCulto(culto, entradas, Math.min(entradas.length - 1, atual + 1)))}"` +
      `${atual >= entradas.length - 1 ? ' aria-disabled=true' : ''}>Próxima &rarr;</a>` +
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
    scripts: SCRIPT_FILTRO + SCRIPT_MENU_TOM + scriptCulto(culto, canonica),
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
function scriptCulto(culto: Culto, canonica: string): string {
  return `<script>
(function(){
  var NOME=${JSON.stringify(culto.nome)};
  var IDX=${JSON.stringify(INDICE_NOVOS)};
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
 * "Tema" é o campo `momento` do `.cifra` — o vocabulário que o acervo já tem
 * (adoracao, celebracao). Poucas músicas o trazem hoje, e a tela diz isso em
 * vez de fingir que o filtro cobre as 343.
 */
export function paginaBiblioteca(rep: Repertorio): string {
  const comTema = rep.todas.filter((m) => m.momento).length;

  const itens = rep.todas
    .map(
      (m) =>
        `<li data-titulo="${esc(m.titulo)}" data-artista="${esc(m.artista)}" ` +
        `data-tema="${esc(m.momento ?? '')}" ` +
        `data-busca="${esc(`${m.titulo} ${m.artista}`)}" data-tom-origem="${esc(m.tom)}">` +
        `<a href="/musica/${esc(m.slug)}">` +
        `<span class=nome><b>${esc(m.titulo)}</b>` +
        `<span>${esc(m.artista)}${m.momento ? ` · ${esc(m.momento)}` : ''}</span></span>` +
        `<span class=pastilha>${esc(m.tom)}</span></a></li>`,
    )
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

  const miolo =
    `<h1 class=secao-tit>Músicas<em>${rep.todas.length} no repertório</em></h1>` +
    '<div class=cartao><div class=busca-topo>' +
    '<div class=campos-busca>' +
    campo('titulo', 'Nome da música', 'Ex.: O Grande Eu Sou') +
    campo('tema', 'Tema', 'Ex.: adoracao') +
    campo('artista', 'Cantor / banda', 'Ex.: Gabriela Rocha') +
    '</div>' +
    `<nav class="fila" data-chips=lista aria-label="Filtrar por tom">${chips}</nav>` +
    '</div>' +
    `<ul class=lista id=lista>${itens}</ul>` +
    '<p class=vazio data-vazio=lista hidden style="padding:28px 16px">Nada com esses filtros.</p>' +
    '</div>' +
    `<p class=contagem><span data-conta=lista>${rep.todas.length}</span> de ${rep.todas.length} músicas. ` +
    `Os três campos filtram juntos. O tema vem do campo <code>momento</code> do <code>.cifra</code>, ` +
    `que ${comTema} das ${rep.todas.length} músicas ainda tem preenchido.</p>`;

  return paginaPainel({
    titulo: 'Músicas',
    ativo: '/musicas',
    css: CSS_PAINEL,
    miolo,
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
  periodo?: string;
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
function formCriarCulto(v: RascunhoCulto = {}): string {
  const escolhido = (chave: string) => (v.periodo === chave ? ' selected' : '');
  // O `value=""` na primeira opção é o que faz o `required` do `<select>`
  // valer: sem ele o navegador considera a lista sempre respondida.
  const opcoes = [
    `<option value="" disabled${v.periodo ? '' : ' selected'}>Escolha o período</option>`,
  ]
    .concat(
      PERIODOS_OFERECIDOS.map(
        (chave) =>
          `<option value="${esc(chave)}"${escolhido(chave)}>${esc(PERIODOS[chave]!)}</option>`,
      ),
    )
    .join('');

  return (
    '<form class=form-criar method=get action="/culto/novo">' +
    '<label class=larga>Nome do culto <span class=opc>(opcional)</span>' +
    `<input class=campo name=nome maxlength=60 autocomplete=off value="${esc(v.nome ?? '')}" ` +
    'placeholder="Culto de domingo"></label>' +
    `<label>Data<input class=campo type=date name=data required value="${esc(v.data || hojeISO())}"></label>` +
    `<label>Período<select class=campo name=periodo required>${opcoes}</select></label>` +
    '<label class=larga>Tema <span class=opc>(opcional)</span>' +
    `<input class=campo name=tema maxlength=40 autocomplete=off value="${esc(v.tema ?? '')}" ` +
    'placeholder="Gratidão"></label>' +
    '<label class=larga>Setlist <span class=opc>(opcional — uma música por linha, o tom no fim)</span>' +
    '<textarea class="campo campo-alto" name=musicas rows=6 autocomplete=off ' +
    'placeholder="VITORIOSO ÉS - G&#10;QUEBRANTADO (C)&#10;TEU TOQUE">' +
    `${esc(v.musicas ?? '')}</textarea></label>` +
    '<div class=modal-acoes>' +
    '<button class=btn type=button data-fechar hidden>Cancelar</button>' +
    '<button class="btn btn-forte" type=submit>Criar culto</button>' +
    '</div></form>'
  );
}

/**
 * O modal de abrir culto, mais o mesmo formulário em `<noscript>`.
 *
 * `<dialog>` sem JavaScript não abre — por isso o botão nasce `hidden` e é o
 * script que o mostra, e por isso o `<noscript>` traz o formulário na página.
 * O painel inteiro funciona sem JS e abrir culto não podia ser a exceção.
 */
function blocoModalCulto(erros: readonly string[], rascunho: RascunhoCulto): string {
  return (
    '<dialog class=modal id=dlg-culto aria-labelledby=tit-criar>' +
    '<div class=modal-topo><h2 id=tit-criar>Novo culto</h2>' +
    '<p class=sub>Escreva a setlist agora ou monte depois, no painel. O culto ' +
    'fica neste aparelho e no link — o servidor não guarda nada.</p></div>' +
    (erros.length
      ? `<div class=erro role=alert><ul>${erros.map((e) => `<li>${esc(e)}</li>`).join('')}</ul></div>`
      : '') +
    formCriarCulto(rascunho) +
    '</dialog>' +
    '<noscript><section class="cartao criar-culto">' +
    '<div class=cartao-topo><div class=quem><h2>Novo culto</h2>' +
    '<p class=sub>Sem JavaScript o formulário abre aqui mesmo.</p></div></div>' +
    formCriarCulto(rascunho) +
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
    `<section class=lista-cultos id=${id}${id === 'meus' ? ' hidden' : ''}>` +
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
    if(id==='meus')secao.hidden=cultos.length===0;
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

/** Abre o modal. Sem `showModal` (navegador antigo), o diálogo abre na página. */
const SCRIPT_MODAL_CULTO = `<script>
(function(){
  var dlg=document.getElementById('dlg-culto');
  var abrir=document.getElementById('abrir-culto');
  if(!dlg||!abrir)return;
  abrir.hidden=false;
  function mostrar(){
    if(dlg.showModal)dlg.showModal();else dlg.setAttribute('open','');
    var campo=dlg.querySelector('input[name=nome]');
    if(campo)campo.focus();
  }
  abrir.addEventListener('click',mostrar);
  dlg.querySelectorAll('[data-fechar]').forEach(function(b){
    b.hidden=false;
    b.addEventListener('click',function(){
      if(dlg.close)dlg.close();else dlg.removeAttribute('open');
    });
  });
  // O 400 do formulário volta com o modal já aberto: o erro tem que estar
  // onde o usuário errou, não numa tela que ele fechou.
  if(dlg.querySelector('.erro'))mostrar();
})();
</script>`;

/**
 * A tela inicial: a agenda de cultos.
 *
 * Era um redirecionamento para o culto mais recente do repertório, o que
 * deixava o culto **aberto neste aparelho** inalcançável pelo menu — o
 * servidor não sabe que ele existe. Agora a tela lista o que vem aí, oferece
 * abrir um culto novo, e mantém o último culto tocado a um toque.
 */
export function paginaAgenda(
  rep: Repertorio,
  opcoes: { erros?: readonly string[]; rascunho?: RascunhoCulto } = {},
): string {
  const ultimo = rep.cultos[0];

  const blocoUltimo = ultimo
    ? '<section class="cartao ultimo-culto">' +
      '<div class=cartao-topo><div class=quem><span class=rot>Último culto tocado</span>' +
      `<h2>${esc(ultimo.rotulo)}</h2>` +
      `<p class=sub>${esc([ultimo.periodo, `${ultimo.entradas.length} músicas`].filter(Boolean).join(' · '))}</p>` +
      '</div>' +
      `<a class="btn btn-forte" href="/culto/${segmentoCulto(ultimo)}">Abrir</a>` +
      '<a class=btn href="/cultos">Ver anteriores</a>' +
      '</div></section>'
    : '<p class=aviso>Nenhum culto no repertório ainda. Os tocados vêm de ' +
      '<code>gerador/repertorio/__init__.py</code> por <code>dados/repertorio.json</code>.</p>';

  return paginaPainel({
    titulo: 'Culto',
    ativo: '/',
    css: CSS_PAINEL,
    miolo:
      '<header class=culto-topo><div class=quem><h1>Culto</h1>' +
      '<p class=sub>Os cultos marcados neste aparelho. Abrir um culto monta o ' +
      'link — o servidor não guarda nada.</p></div>' +
      '<div class=acoes>' +
      '<button class="btn btn-forte btn-grande" id=abrir-culto type=button hidden>+ Novo culto</button>' +
      '</div></header>' +
      blocoModalCulto(opcoes.erros ?? [], opcoes.rascunho ?? {}) +
      blocoListaLocal(
        'futuros',
        'Próximos cultos',
        'Nenhum culto marcado de hoje em diante. Abra um culto para começar.',
      ) +
      blocoUltimo,
    scripts: SCRIPT_MODAL_CULTO + SCRIPT_CULTOS_LOCAIS,
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
