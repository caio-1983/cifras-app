/**
 * As páginas do site. A cifra em si NÃO é renderizada aqui — sai de
 * `gerador-ts/html.ts::escrever`, o emissor portado e travado byte a byte
 * contra o Python em `tests/emissorPort.test.ts`. Este módulo só põe o cromo
 * em volta (busca, seletor de tom, navegação).
 *
 * A mesma separação vale pro CSS: `CSS` vem do emissor e não é tocado — é ele
 * que carrega o padrão visual (Arial, laranja #ff6600 na cifra, azul #0000ff
 * nos rótulos, roxo #9900ff nas anotações, escuro #1b1b1b na letra) e o
 * `@page{size:A4}`/`page-break-before` da impressão. O que este módulo
 * acrescenta vive dentro de `@media screen`, para que **imprimir continue
 * produzindo exatamente o documento validado em produção**.
 */
import { CSS, escrever, esc } from '../gerador-ts/html.ts';
import type { MusicaIndexada, Repertorio } from './repertorio.ts';
import { TONS } from './tons.ts';

/**
 * Camada de tela. Só `@media screen` — nada aqui alcança a impressão.
 *
 * Mobile primeiro, e o "mobile" aqui é específico: músico com celular ou
 * tablet na estante, lendo a uma distância de braço, muitas vezes com as mãos
 * ocupadas. Daí as três decisões que mandam no resto:
 *
 * 1. Fonte grande por padrão (não 12pt, que é medida de papel) e controle de
 *    tamanho que persiste — ninguém quer dar pinch-zoom a cada música.
 * 2. Alvo de toque grande. Nada que exija precisão.
 * 3. A cifra rola na horizontal em vez de quebrar linha. Quebrar destrói o
 *    alinhamento do acorde sobre a sílaba, que é o ponto da linha posicional.
 */
const CSS_TELA = `
@media screen{
  :root{--esc:1.35;--tinta:#1b1b1b;--fundo:#fff;--fraco:#5b5b5b;--borda:#d8d8d8;--acento:#ff6600}
  html{-webkit-text-size-adjust:100%}
  body{max-width:none;margin:0;padding:0;background:var(--fundo);
       font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif}
  /* A cifra mantém Arial e as proporções do padrão; só a escala muda. */
  .cifra p{font-size:calc(12pt * var(--esc));line-height:1.35}
  .cifra .h{font-size:calc(15pt * var(--esc))}
  /* Acorde e anotação nunca quebram: o alinhamento depende disso. */
  .cifra .c,.cifra .a{white-space:nowrap}
  .cifra{overflow-x:auto;-webkit-overflow-scrolling:touch;padding:1rem 1rem 6rem}

  .barra{position:sticky;top:0;z-index:2;background:var(--fundo);
         border-bottom:1px solid var(--borda);padding:.6rem .75rem}
  .barra a.voltar{display:inline-flex;align-items:center;justify-content:center;
         min-width:44px;min-height:44px;color:var(--tinta);text-decoration:none;
         font-size:1.35rem;flex:0 0 auto}
  .topo{display:flex;align-items:center;gap:.5rem}
  /* Item de flex não encolhe abaixo do conteúdo sem isto, e a barra estoura
     a largura da tela — o botão de fonte sai do enquadramento no celular. */
  .topo>*{min-width:0}
  .titulo{font-weight:700;font-size:1.05rem;overflow:hidden;text-overflow:ellipsis;
          white-space:nowrap;flex:1 1 auto}

  .busca{flex:1 1 auto;min-height:52px;padding:.6rem .8rem;
         font-size:1.15rem;border:2px solid var(--borda);border-radius:10px;
         background:var(--fundo);color:var(--tinta)}
  .busca:focus{outline:none;border-color:var(--acento)}

  .lista{list-style:none;margin:0;padding:.25rem .75rem 6rem}
  .lista li{border-bottom:1px solid var(--borda)}
  /* Duas linhas, não uma: no celular o nome do artista ao lado do título
     empurra o tom para fora da tela. Título em cima, artista e tom embaixo. */
  .lista a{display:block;min-height:64px;padding:.75rem .25rem;
           text-decoration:none;color:var(--tinta)}
  .lista .nome{display:block;font-weight:700;font-size:1.15rem;line-height:1.25}
  .lista .sub{display:flex;align-items:baseline;gap:.5rem;margin-top:.15rem}
  .lista .art{color:var(--fraco);font-size:.95rem;flex:1 1 auto;min-width:0;
              overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .lista .tom{flex:0 0 auto;font-weight:700;color:var(--acento);font-size:.95rem;
              border:1px solid var(--acento);border-radius:6px;padding:.05rem .4rem}
  .vazio{padding:2rem .75rem;color:var(--fraco);font-size:1.1rem}

  /* Seletor de tom: fila que rola na horizontal, alvo grande, sem menu. */
  .tons{display:flex;gap:.4rem;overflow-x:auto;-webkit-overflow-scrolling:touch;
        padding:.5rem .75rem;border-bottom:1px solid var(--borda);
        position:sticky;top:0;z-index:2;background:var(--fundo)}
  .tons a{flex:0 0 auto;min-width:56px;min-height:52px;display:flex;
          flex-direction:column;align-items:center;justify-content:center;
          border:2px solid var(--borda);border-radius:10px;text-decoration:none;
          color:var(--tinta);font-weight:700;font-size:1.15rem;padding:0 .55rem}
  .tons a .enar{font-weight:400;font-size:.7rem;color:var(--fraco);line-height:1}
  .tons a[aria-current=true]{background:var(--acento);border-color:var(--acento);color:#fff}
  .tons a[aria-current=true] .enar{color:#ffe2cf}
  .tons .origem{box-shadow:inset 0 -4px 0 var(--acento)}

  .fonte{display:flex;gap:.4rem;align-items:center}
  .fonte button{min-width:48px;min-height:44px;font-size:1.1rem;font-weight:700;
                border:2px solid var(--borda);border-radius:10px;
                background:var(--fundo);color:var(--tinta);cursor:pointer}

  .rodape{padding:1rem .75rem 2rem;color:var(--fraco);font-size:.9rem}
}
@media print{
  .barra,.tons,.fonte,.rodape{display:none!important}
  .cifra{overflow:visible;padding:0}
}
`;

/** Envelope comum. `noindex` em toda página — isto é ferramenta interna. */
function pagina(titulo: string, corpo: string, scripts = ''): string {
  return (
    '<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<meta name="robots" content="noindex, nofollow">' +
    `<title>${esc(titulo)}</title>` +
    `<style>${CSS}${CSS_TELA}</style></head><body>${corpo}${scripts}</body></html>`
  );
}

/**
 * Escala de fonte, aplicada antes da primeira pintura para não piscar.
 * `localStorage` pode lançar (navegador com dados de site bloqueados), então
 * tudo dentro de try/catch — a página tem que funcionar sem ele.
 */
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
 * Troca de tom sem recarregar a página inteira. Progressive enhancement puro:
 * os tons são links de verdade (`?tom=X`), e sem JS a navegação normal
 * funciona igual. Com JS, busca só o fragmento e troca o miolo.
 *
 * Sem framework, de propósito — o requisito era "só se for simples".
 */
const SCRIPT_TOM = `<script>
(function(){
  var alvo=document.getElementById('cifra');
  // O seletor tem 16 tons e rola: sem isto, abrir uma música em G mostra a
  // fila começando em C, com o tom atual fora da tela.
  var atual=document.querySelector('.tons a[aria-current=true]');
  if(atual)atual.scrollIntoView({block:'nearest',inline:'center'});
  if(!alvo||!window.fetch||!window.history.pushState)return;
  document.addEventListener('click',function(e){
    var a=e.target.closest('.tons a');
    if(!a||e.metaKey||e.ctrlKey||e.shiftKey||e.button)return;
    e.preventDefault();
    var url=a.getAttribute('href');
    fetch(url+'&fragmento=1',{headers:{'Accept':'text/html'}})
      .then(function(r){if(!r.ok)throw 0;return r.text()})
      .then(function(html){
        alvo.innerHTML=html;
        document.querySelectorAll('.tons a').forEach(function(o){
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

export function paginaLista(rep: Repertorio): string {
  const itens = rep.todas
    .map(
      (m) =>
        `<li data-busca="${esc(`${m.titulo} ${m.artista}`.toLowerCase())}">` +
        `<a href="/musica/${esc(m.slug)}">` +
        `<span class=nome>${esc(m.titulo)}</span>` +
        `<span class=sub><span class=art>${esc(m.artista)}</span>` +
        `<span class=tom>${esc(m.tom)}</span></span>` +
        '</a></li>',
    )
    .join('');

  const corpo =
    '<div class=barra><div class=topo>' +
    '<input class=busca id=busca type=search autocomplete=off ' +
    'placeholder="Buscar por título ou artista" aria-label="Buscar por título ou artista">' +
    '</div></div>' +
    `<ul class=lista id=lista>${itens}</ul>` +
    '<p class=vazio id=vazio hidden>Nenhuma música com esse nome.</p>' +
    `<p class=rodape>${rep.todas.length} músicas.</p>`;

  // Busca no cliente: são 13 músicas, não vale um ida-e-volta ao servidor.
  // `normalize('NFD')` + corte de diacrítico pra "coracao" achar "Coração".
  const script = `<script>
(function(){
  var b=document.getElementById('busca'),l=document.getElementById('lista'),v=document.getElementById('vazio');
  function limpar(s){return s.normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase()}
  b.addEventListener('input',function(){
    var q=limpar(b.value.trim()),n=0;
    l.querySelectorAll('li').forEach(function(li){
      var bate=!q||limpar(li.dataset.busca).indexOf(q)>=0;
      li.hidden=!bate; if(bate)n++;
    });
    v.hidden=n>0;
  });
})();
</script>`;

  return pagina('Cifras', corpo, script);
}

/** Só o miolo da cifra — o que a troca de tom sem recarregar busca. */
export function fragmentoCifra(m: MusicaIndexada, tom: string): string {
  // `momento` é propriedade do papel da música num culto, não da música: uma
  // página solta não deve anunciar "Ofertório" sem contexto. Ver o TODO de
  // modelagem em `gerador-ts/html.ts::OpcoesEmissao`.
  return escrever(m, tom, false, { momento: false });
}

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
    '<div class=barra><div class=topo>' +
    '<a class=voltar href="/" aria-label="Voltar para a lista">&larr;</a>' +
    `<span class=titulo>${esc(m.titulo)}</span>` +
    '<span class=fonte>' +
    '<button type=button data-fonte="-" aria-label="Diminuir a fonte">A&minus;</button>' +
    '<button type=button data-fonte="+" aria-label="Aumentar a fonte">A+</button>' +
    '</span></div></div>' +
    `<nav class=tons aria-label="Trocar o tom">${tons}</nav>` +
    `<div class=cifra id=cifra>${fragmentoCifra(m, tom)}</div>`;

  return pagina(`${m.titulo} — ${tom}`, corpo, SCRIPT_FONTE + SCRIPT_TOM);
}

export function paginaNaoEncontrada(): string {
  return pagina(
    'Não encontrada',
    '<div class=barra><div class=topo><a class=voltar href="/">&larr;</a>' +
      '<span class=titulo>Não encontrada</span></div></div>' +
      '<p class=vazio>Essa música não está no repertório.</p>',
  );
}
