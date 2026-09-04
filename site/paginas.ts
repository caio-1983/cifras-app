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
import type { Culto, EntradaCulto } from './cultos.ts';
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
const SCRIPT_FILTRO = `<script>
(function(){
  ${JS_LIMPAR}
  document.querySelectorAll('input[data-filtro]').forEach(function(campo){
    var lista=document.getElementById(campo.dataset.filtro);
    if(!lista)return;
    var vazio=document.querySelector('[data-vazio="'+campo.dataset.filtro+'"]');
    var conta=document.querySelector('[data-conta="'+campo.dataset.filtro+'"]');
    function aplicar(){
      var q=limpar(campo.value.trim()),tom=lista.dataset.tom||'',n=0;
      lista.querySelectorAll('li').forEach(function(li){
        var bate=(!q||limpar(li.dataset.busca).indexOf(q)>=0)
              && (!tom||li.dataset.tomOrigem===tom);
        li.hidden=!bate; if(bate)n++;
      });
      if(vazio)vazio.hidden=n>0;
      if(conta)conta.textContent=n;
    }
    campo.addEventListener('input',aplicar);
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

/** O link de uma ação do painel de culto — sempre com a setlist resultante. */
function linkCulto(nome: string, entradas: readonly EntradaCulto[], atual: number): string {
  const q = new URLSearchParams({ ordem: codificarOrdem(entradas), atual: String(atual) });
  return `/culto/${encodeURIComponent(nome)}?${q}`;
}

function linkExecucao(nome: string, entradas: readonly EntradaCulto[], i: number): string {
  const q = new URLSearchParams({ ordem: codificarOrdem(entradas), i: String(i) });
  return `/executar/${encodeURIComponent(nome)}?${q}`;
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
  const canonica = codificarOrdem(culto.entradas);
  const alterada = codificarOrdem(entradas) !== canonica;
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
          : `<a class="${classe}" href="${esc(linkCulto(culto.nome, destino, novoAtual))}" ` +
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
        `<a class=nome href="${esc(linkCulto(culto.nome, entradas, i))}">` +
        `<b>${esc(e.musica.titulo)}</b>` +
        `<span>${papel}${esc(e.musica.artista)}</span></a>` +
        '<span class=tom>' +
        `<a class=passo href="${esc(linkCulto(culto.nome, comTom(entradas, i, passoDeTom(e.tom, -1)), atual))}" ` +
        `aria-label="Descer meio tom">&minus;</a>` +
        `<a class=pastilha href="/musica/${esc(e.slug)}?tom=${encodeURIComponent(e.tom)}" ` +
        `title="Abrir a cifra em ${esc(e.tom)}">${esc(e.tom)}</a>` +
        `<a class=passo href="${esc(linkCulto(culto.nome, comTom(entradas, i, passoDeTom(e.tom, 1)), atual))}" ` +
        `aria-label="Subir meio tom">+</a>` +
        '</span>' +
        '<span class=acoes>' +
        acao('Subir na ordem', '&uarr;', i > 0 ? trocar(entradas, i, i - 1) : null, i > 0 && atual === i ? i - 1 : atual) +
        acao('Descer na ordem', '&darr;', i < entradas.length - 1 ? trocar(entradas, i, i + 1) : null, i < entradas.length - 1 && atual === i ? i + 1 : atual) +
        acao('Tirar do culto', '&times;', entradas.length > 1 ? semEsta : null, atualDepois, 'remover') +
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
              `<a href="${esc(linkCulto(culto.nome, [...entradas, { slug: m.slug, tom: m.tom, musica: m }], atual))}">` +
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
      `<a class="btn btn-forte" href="${esc(linkExecucao(culto.nome, entradas, atual))}">Executar daqui</a>` +
      `<a class=btn href="/musica/${esc(atualEntrada.slug)}?tom=${encodeURIComponent(atualEntrada.tom)}">Abrir cifra</a>` +
      '</div>' +
      `<div class="cifra previa">${fragmentoCifra(atualEntrada.musica, atualEntrada.tom)}</div>` +
      '<nav class=passos aria-label="Navegar na setlist">' +
      `<a class="btn${atual === 0 ? ' desligado' : ''}" href="${esc(linkCulto(culto.nome, entradas, Math.max(0, atual - 1)))}"` +
      `${atual === 0 ? ' aria-disabled=true' : ''}>&larr; Anterior</a>` +
      `<span class=conta>${String(atual + 1).padStart(2, '0')} / ${String(entradas.length).padStart(2, '0')}</span>` +
      `<a class="btn${atual >= entradas.length - 1 ? ' desligado' : ''}" href="${esc(linkCulto(culto.nome, entradas, Math.min(entradas.length - 1, atual + 1)))}"` +
      `${atual >= entradas.length - 1 ? ' aria-disabled=true' : ''}>Próxima &rarr;</a>` +
      '</nav></div>'
    : '<p class=vazio>Setlist vazia. Adicione uma música para começar.</p>';

  const miolo =
    '<header class=culto-topo><div class=quem>' +
    `<h1>${esc(culto.rotulo)}</h1>` +
    // O período é o que a convenção do nome do arquivo carrega. Não há ano,
    // horário nem duração no dado — e a tela não os inventa (docs/site.md).
    (culto.periodo ? `<p class=sub>${esc(culto.periodo)}</p>` : '') +
    '</div><div class=acoes>' +
    '<span class=status id=status data-estado=preparando>Preparando</span>' +
    `<a class="btn btn-forte btn-grande" id=iniciar href="${esc(linkExecucao(culto.nome, entradas, atual))}">Iniciar culto</a>` +
    '<button class="btn btn-fantasma" id=encerrar hidden type=button>Encerrar culto</button>' +
    '</div></header>' +
    (alterada
      ? '<p class=rascunho data-estado=alterada><b>Setlist alterada</b> — vale neste aparelho e no link. ' +
        `<a class=btn href="${esc(`/culto/${encodeURIComponent(culto.nome)}?atual=${atual}&limpar=1`)}">Restaurar ordem do culto</a>` +
        '<button class=btn type=button id=copiar>Copiar link para o celular</button></p>'
      : '<p class=rascunho data-estado=canonica><b>Ordem do culto</b> — como foi tocado. ' +
        '<button class=btn type=button id=copiar>Copiar link para o celular</button></p>') +
    '<div class=culto-grade>' +
    '<section class="cartao setlist-cartao" aria-labelledby=tit-setlist>' +
    '<div class=cartao-topo><div class=quem>' +
    '<h2 id=tit-setlist>Setlist do culto</h2>' +
    `<p class=sub>${entradas.length} ${entradas.length === 1 ? 'música' : 'músicas'} · ` +
    `${alterada ? 'ordem alterada neste aparelho' : 'ordem e tom em que foi tocado'}</p>` +
    '</div></div>' +
    `<ol class=setlist>${itens}</ol>` +
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
    scripts: SCRIPT_FILTRO + scriptCulto(culto.nome, canonica),
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
function scriptCulto(nome: string, canonica: string): string {
  return `<script>
(function(){
  var K='cifras:culto:'+${JSON.stringify(nome)};
  var CANONICA=${JSON.stringify(canonica)};
  var url=new URL(location.href);
  var ordem=url.searchParams.get('ordem');

  function ler(k){try{return localStorage.getItem(k)}catch(e){return null}}
  function por(k,v){try{v===null?localStorage.removeItem(k):localStorage.setItem(k,v)}catch(e){}}

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

/** Painel sem nenhum culto no repertório — estado vazio honesto. */
export function paginaSemCulto(rep: Repertorio): string {
  return paginaPainel({
    titulo: 'Culto — Painel',
    ativo: '/',
    css: CSS_PAINEL,
    miolo:
      '<header class=culto-topo><div class=quem><h1>Nenhum culto</h1>' +
      '<p class=sub>O painel monta a setlist a partir dos cultos do repertório.</p>' +
      '</div></header>' +
      '<p class=aviso>Os cultos vêm de <code>CULTOS</code> em ' +
      '<code>gerador/repertorio/__init__.py</code> e chegam ao site por ' +
      '<code>dados/repertorio.json</code>. Regenere com ' +
      '<code>python gerador/scripts/exportar_repertorio_json.py</code>.</p>' +
      `<p><a class="btn btn-forte" href="/musicas">Ver as ${rep.todas.length} músicas</a></p>`,
  });
}

// ---------------------------------------------------------- biblioteca

/** Lista e busca. `foco` distingue "Músicas" (navegar) de "Buscar" (procurar). */
export function paginaBiblioteca(rep: Repertorio, opcoes: { foco: boolean }): string {
  const itens = rep.todas
    .map(
      (m) =>
        `<li data-busca="${esc(`${m.titulo} ${m.artista}`.toLowerCase())}" data-tom-origem="${esc(m.tom)}">` +
        `<a href="/musica/${esc(m.slug)}">` +
        `<span class=nome><b>${esc(m.titulo)}</b>` +
        `<span>${esc(m.artista)}${m.momento ? ` · ${esc(m.momento)}` : ''}</span></span>` +
        `<span class=pastilha>${esc(m.tom)}</span></a></li>`,
    )
    .join('');

  // Os chips filtram por TOM DE ORIGEM, que é dado que existe. Filtro por
  // tema (Adoração, Louvor, Fé…) espera o campo: ver o comentário abaixo.
  const tonsUsados = [...new Set(rep.todas.map((m) => m.tom))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const chips = tonsUsados
    .map((t) => `<button class=chip type=button data-tom-filtro="${esc(t)}" aria-pressed=false>${esc(t)}</button>`)
    .join('');

  const miolo =
    `<h1 class=secao-tit>${opcoes.foco ? 'Buscar' : 'Músicas'}<em>${rep.todas.length} no repertório</em></h1>` +
    '<div class=cartao><div class=busca-topo>' +
    `<input class=campo type=search data-filtro=lista autocomplete=off${opcoes.foco ? ' autofocus' : ''} ` +
    'placeholder="Buscar música ou artista" aria-label="Buscar música ou artista">' +
    `<nav class="fila" data-chips=lista aria-label="Filtrar por tom">${chips}</nav>` +
    '</div>' +
    `<ul class=lista id=lista>${itens}</ul>` +
    '<p class=vazio data-vazio=lista hidden style="padding:28px 16px">Nada com esse nome nesse filtro.</p>' +
    '</div>' +
    `<p class=contagem><span data-conta=lista>${rep.todas.length}</span> de ${rep.todas.length} músicas. ` +
    'O filtro é por tom de origem — o repertório ainda não tem o campo de tema.</p>';

  return paginaPainel({
    titulo: opcoes.foco ? 'Buscar' : 'Músicas',
    ativo: opcoes.foco ? '/buscar' : '/musicas',
    css: CSS_PAINEL,
    miolo,
    scripts: SCRIPT_FILTRO,
  });
}

// ------------------------------------------------------------ histórico

export function paginaHistorico(rep: Repertorio): string {
  if (rep.cultos.length === 0) {
    return paginaPainel({
      titulo: 'Cultos anteriores',
      ativo: '/cultos',
      css: CSS_PAINEL,
      miolo: '<h1 class=secao-tit>Cultos anteriores</h1><p class=vazio>Nenhum culto no repertório.</p>',
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
      `<h1 class=secao-tit>Cultos anteriores<em>${rep.cultos.length} tocados</em></h1>` +
      `<ul class=cultos>${itens}</ul>` +
      '<p class=aviso>Cada culto abre no painel com a ordem e os tons em que foi tocado. ' +
      'Alterar a setlist ali não muda o histórico — o rascunho fica no aparelho e no link.</p>',
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
