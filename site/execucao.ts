/**
 * MODO EXECUÇÃO — a tela do culto acontecendo.
 *
 * É outra experiência, não uma variação do painel: quem está aqui está de pé,
 * com o celular na estante, tocando. Por isso a tela não tem casca de
 * navegação, nem cartão, nem indicador administrativo. Tem cifra.
 *
 * As cinco prioridades, na ordem, mandam no layout: **cifra**, música atual,
 * tom, navegação, setlist. O que não é uma dessas cinco fica atrás do menu.
 *
 * Escuro por decisão, não por preferência
 * ---------------------------------------
 * A página abre com `data-theme=dark` no `<html>` — palco é escuro, e a
 * mesma tela clara que é boa para preparar cega quem está lendo às 19h com a
 * luz apagada. Dá para trocar no menu, e a escolha persiste.
 *
 * A cifra continua saindo de `gerador-ts/html.ts::escrever`
 * — nenhuma renderização é reimplementada aqui. O que muda é a tinta (via as
 * variáveis de `ui.ts`, só em `@media screen`) e a escala.
 *
 * Sem estado no servidor
 * ----------------------
 * A setlist chega no `?ordem=` e a música atual no `?i=` (ver
 * `site/setlist.ts`). Toda navegação é link de verdade: sem JavaScript,
 * anterior/próxima/setlist/tom funcionam por recarga. Com JavaScript entram
 * o gesto de deslizar, o autoscroll e a troca de tom sem recarregar.
 */
import { CSS, esc } from '../gerador-ts/html.ts';
import type { Culto, EntradaCulto } from './cultos.ts';
import { TONS, CICLO, CLASSE_DE_ALTURA, passoDeTom } from './tons.ts';
import { codificarOrdem } from './setlist.ts';
import { CSS_UI, CSS_CIFRA, envelope, icone } from './ui.ts';
import { fragmentoCifra } from './paginas.ts';

const CSS_EXEC = `
@media screen{
  body{background:var(--ground);overscroll-behavior-y:contain}

  /* ---------------------------------------------------- topo */
  .exec-topo{position:sticky;top:0;z-index:20;display:flex;align-items:center;
      gap:8px;padding:8px 10px;background:var(--surface);
      border-bottom:1px solid var(--line)}
  .exec-quem{flex:1 1 auto;min-width:0;text-align:left;padding:2px 4px;
      border-radius:8px}
  .exec-quem b{display:block;font-size:14.5px;font-weight:700;line-height:1.2;
      overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .exec-quem span{display:block;font-size:11.5px;color:var(--muted);
      margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .exec-quem .papel{color:var(--anot);font-weight:600}
  .exec-topo .pastilha{min-height:34px;min-width:48px;font-size:15px}

  /* ---------------------------------------------------- a cifra */
  .exec-cifra{padding:18px 16px calc(96px + env(safe-area-inset-bottom))}
  /* Leitura a uma distância de braço: entrelinha maior e respiro entre
     blocos. O alinhamento do acorde sobre a sílaba é do emissor e continua
     intacto — só a escala muda. */
  .exec-cifra p{line-height:1.55}
  .exec-cifra .h{letter-spacing:-.01em}

  /* ---------------------------------------------------- rodapé */
  .exec-rodape{position:fixed;left:0;right:0;bottom:0;z-index:25;display:flex;
      align-items:center;gap:8px;padding:8px 10px calc(8px + env(safe-area-inset-bottom));
      background:var(--surface);border-top:1px solid var(--line)}
  .exec-rodape .btn{flex:1 1 0;min-height:50px;min-width:0}
  .exec-rodape .meio{flex:0 0 auto;display:flex;flex-direction:column;
      align-items:center;gap:1px;min-width:92px;min-height:50px;
      justify-content:center;border-radius:var(--raio);background:var(--raised)}
  .exec-rodape .meio b{font-family:ui-monospace,Menlo,monospace;font-size:14px}
  .exec-rodape .meio span{font-size:10px;font-weight:700;letter-spacing:.1em;
      color:var(--muted)}
  .exec-rodape .desligado{opacity:.3;pointer-events:none}

  /* ---------------------------------------------------- gavetas */
  .exec-gaveta{position:fixed;inset:0;z-index:40;display:flex;
      flex-direction:column;justify-content:flex-end;
      background:rgba(0,0,0,.55)}
  .exec-gaveta .folha{background:var(--surface);border-top:1px solid var(--line);
      border-radius:16px 16px 0 0;max-height:86vh;overflow-y:auto;
      padding:14px 14px calc(18px + env(safe-area-inset-bottom))}
  .exec-gaveta .puxador{display:flex;align-items:center;gap:10px;
      margin:0 0 10px}
  .exec-gaveta .puxador h2{flex:1 1 auto;font-size:12px;font-weight:700;
      letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}

  .exec-setlist{list-style:none;margin:0;padding:0}
  .exec-setlist a{display:flex;align-items:center;gap:12px;min-height:60px;
      padding:8px 6px;text-decoration:none;border-radius:var(--raio)}
  .exec-setlist a:hover{background:var(--raised)}
  .exec-setlist .marca{flex:0 0 auto;width:22px;text-align:center;
      color:var(--muted);font-size:14px}
  .exec-setlist .num{flex:0 0 auto;font-family:ui-monospace,Menlo,monospace;
      font-size:13px;font-weight:700;color:var(--muted)}
  .exec-setlist .nome{flex:1 1 auto;min-width:0}
  .exec-setlist .nome b{display:block;font-size:16px;font-weight:600;
      overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .exec-setlist .nome span{display:block;color:var(--muted);font-size:12.5px}
  .exec-setlist [aria-current=true]{background:var(--acento-fraco)}
  .exec-setlist [aria-current=true] .marca,
  .exec-setlist [aria-current=true] .num{color:var(--acento)}
  .exec-setlist .feita b{color:var(--muted);font-weight:500}

  .bloco-menu{padding:14px 0;border-top:1px solid var(--line)}
  .bloco-menu:first-of-type{border-top:0}
  .bloco-menu h3{font-size:12px;font-weight:700;letter-spacing:.09em;
      text-transform:uppercase;color:var(--muted);margin:0 0 10px}
  .stepper{display:flex;align-items:center;justify-content:center;gap:14px}
  .stepper .valor{font-family:ui-monospace,Menlo,monospace;font-size:34px;
      font-weight:700;color:var(--cifra);min-width:96px;text-align:center}
  .stepper .passo{width:56px;height:56px;display:grid;place-items:center;
      border-radius:14px;background:var(--raised);color:var(--ink);
      font-size:24px;font-weight:700;text-decoration:none}
  .stepper .rot{font-size:11px;color:var(--muted);text-align:center;
      display:block;margin-top:2px}
  .grade-tons{display:grid;grid-template-columns:repeat(auto-fill,minmax(64px,1fr));
      gap:7px;margin-top:12px}
  .grade-tons a{display:flex;flex-direction:column;align-items:center;
      justify-content:center;gap:1px;min-height:52px;border-radius:var(--raio);
      background:var(--raised);color:var(--ink);text-decoration:none;
      font-family:ui-monospace,Menlo,monospace;font-weight:700;font-size:16px}
  .grade-tons a .enar{font-family:var(--sans);font-weight:500;font-size:10px;
      color:var(--muted)}
  .grade-tons a[aria-current=true]{background:var(--cifra);color:#fff}
  .grade-tons a[aria-current=true] .enar{color:#ffe6d5}
  .grade-tons .origem{box-shadow:inset 0 -3px 0 var(--cifra)}
  .linha-menu{display:flex;flex-wrap:wrap;align-items:center;gap:8px}
  .linha-menu .btn{min-height:46px}
  .linha-menu .rot{flex:1 1 100px;color:var(--muted);font-size:13px}
}
`;

function linkExec(nome: string, entradas: readonly EntradaCulto[], i: number): string {
  const q = new URLSearchParams({ ordem: codificarOrdem(entradas), i: String(i) });
  return `/executar/${encodeURIComponent(nome)}?${q}`;
}

function comTom(entradas: readonly EntradaCulto[], i: number, tom: string): EntradaCulto[] {
  const copia = entradas.slice();
  copia[i] = { ...copia[i]!, tom };
  return copia;
}

export function paginaExecucao(
  culto: Culto,
  entradas: EntradaCulto[],
  i: number,
): string {
  const atual = entradas[i]!;
  const total = entradas.length;
  const conta = `${String(i + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;
  const voltar = `/culto/${encodeURIComponent(culto.nome)}?${new URLSearchParams({
    ordem: codificarOrdem(entradas),
    atual: String(i),
  })}`;

  const anterior = i > 0 ? linkExec(culto.nome, entradas, i - 1) : null;
  const proxima = i < total - 1 ? linkExec(culto.nome, entradas, i + 1) : null;

  // ------------------------------------------------------------ setlist
  const itensSetlist = entradas
    .map((e, j) => {
      const marca = j < i ? '&check;' : j === i ? '&#9654;' : '&#9675;';
      const classe = j < i ? ' class=feita' : '';
      return (
        `<li><a href="${esc(linkExec(culto.nome, entradas, j))}" aria-current="${j === i}"${classe}>` +
        `<span class=marca>${marca}</span>` +
        `<span class=num>${String(j + 1).padStart(2, '0')}</span>` +
        `<span class=nome><b>${esc(e.musica.titulo)}</b>` +
        `<span>${esc(e.musica.artista)}</span></span>` +
        `<span class=pastilha>${esc(e.tom)}</span></a></li>`
      );
    })
    .join('');

  // ------------------------------------------------------------ tom
  // `data-passo` diz de quanto é o salto: depois de uma troca de tom sem
  // recarregar, o destino do stepper muda e o script o recalcula a partir da
  // grade (ver `scriptExec`). Sem isso, `+` continuaria apontando para o
  // sucessor do tom ANTIGO.
  const passo = (delta: number, rotulo: string, glifo: string) =>
    `<a class=passo data-tom-link data-passo="${delta}" ` +
    `href="${esc(linkExec(culto.nome, comTom(entradas, i, passoDeTom(atual.tom, delta)), i))}" ` +
    `data-tom="${esc(passoDeTom(atual.tom, delta))}" data-slug="${esc(atual.slug)}" ` +
    `aria-label="${esc(rotulo)}">${glifo}</a>`;

  const gradeTons = TONS.map((o) => {
    const eAtual = o.tom === atual.tom;
    const origem = o.tom === atual.musica.tom ? ' class=origem' : '';
    const enar = o.enarmonico ? `<span class=enar>${esc(o.enarmonico)}</span>` : '';
    return (
      `<a${origem} data-tom-link data-tom="${esc(o.tom)}" data-slug="${esc(atual.slug)}" ` +
      `href="${esc(linkExec(culto.nome, comTom(entradas, i, o.tom), i))}" ` +
      `aria-current="${eAtual}" title="${esc(o.tom === atual.musica.tom ? `${o.tom} — tom de origem` : o.tom)}">` +
      `<span>${esc(o.tom)}</span>${enar}</a>`
    );
  }).join('');

  const papel = atual.musica.momento
    ? `<span class=papel>${esc(atual.musica.momento)}</span> · `
    : '';

  const corpo =
    '<header class=exec-topo>' +
    `<a class=icone-btn href="${esc(voltar)}" aria-label="Voltar para o culto">&larr;</a>` +
    '<button class=exec-quem type=button data-abre=gaveta-setlist ' +
    'aria-label="Abrir a setlist">' +
    `<b>${esc(atual.musica.titulo)}</b>` +
    `<span>${papel}${esc(conta)} &middot; ${esc(culto.rotulo)}</span></button>` +
    `<span class=pastilha id=pastilha-tom>${esc(atual.tom)}</span>` +
    '<button class=icone-btn type=button data-abre=gaveta-menu aria-label="Abrir os controles">' +
    '<svg class=icone viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="1.4"/>' +
    '<circle cx="12" cy="12" r="1.4"/><circle cx="12" cy="19" r="1.4"/></svg></button>' +
    '</header>' +
    `<main class="cifra exec-cifra" id=cifra>${fragmentoCifra(atual.musica, atual.tom)}</main>` +
    '<nav class=exec-rodape aria-label="Navegar no culto">' +
    (anterior
      ? `<a class=btn href="${esc(anterior)}" rel=prev id=ir-anterior>&larr; Anterior</a>`
      : '<span class="btn desligado" aria-disabled=true>&larr; Anterior</span>') +
    `<button class=meio type=button data-abre=gaveta-setlist><b>${esc(conta)}</b><span>SETLIST</span></button>` +
    (proxima
      ? `<a class=btn href="${esc(proxima)}" rel=next id=ir-proxima>Próxima &rarr;</a>`
      : '<span class="btn desligado" aria-disabled=true>Próxima &rarr;</span>') +
    '</nav>' +
    // ------------------------------------------------------ gaveta setlist
    '<div class=exec-gaveta id=gaveta-setlist hidden role=dialog aria-modal=true ' +
    'aria-label="Setlist do culto"><div class=folha>' +
    '<div class=puxador><h2>Setlist</h2>' +
    '<button class="btn btn-fantasma" type=button data-fecha>Fechar</button></div>' +
    `<ul class=exec-setlist>${itensSetlist}</ul>` +
    '</div></div>' +
    // --------------------------------------------------------- gaveta menu
    '<div class=exec-gaveta id=gaveta-menu hidden role=dialog aria-modal=true ' +
    'aria-label="Controles da execução"><div class=folha>' +
    '<div class=puxador><h2>Controles</h2>' +
    '<button class="btn btn-fantasma" type=button data-fecha>Fechar</button></div>' +
    '<div class=bloco-menu><h3>Tom atual</h3>' +
    '<div class=stepper>' +
    passo(-1, 'Descer meio tom', '&minus;') +
    `<span class=valor id=tom-valor>${esc(atual.tom)}` +
    `<span class=rot>origem ${esc(atual.musica.tom)}</span></span>` +
    passo(1, 'Subir meio tom', '+') +
    '</div>' +
    `<div class=grade-tons>${gradeTons}</div>` +
    '<p class=aviso style="margin:10px 0 0">O passo anda pela grafia com bemol. ' +
    'As duas grafias de um mesmo som (Gb e F#) são respostas diferentes e as duas ' +
    'estão certas — escolha na grade.</p>' +
    '</div>' +
    '<div class=bloco-menu><h3>Leitura</h3>' +
    '<div class=linha-menu><span class=rot>Tamanho da cifra</span>' +
    '<button class=btn type=button data-fonte="-" aria-label="Diminuir a cifra">A&minus;</button>' +
    '<button class=btn type=button data-fonte="+" aria-label="Aumentar a cifra">A+</button></div>' +
    '<div class=linha-menu style="margin-top:10px"><span class=rot>Rolagem automática</span>' +
    '<button class=btn type=button id=auto-liga aria-pressed=false>Ativar</button>' +
    '<button class=btn type=button id=auto-menos aria-label="Mais devagar">&minus;</button>' +
    '<span class=chip id=auto-vel>1&times;</span>' +
    '<button class=btn type=button id=auto-mais aria-label="Mais rápido">+</button></div>' +
    '<div class=linha-menu style="margin-top:10px"><span class=rot>Aparência</span>' +
    '<button class=chip type=button data-tema=dark>Escuro</button>' +
    '<button class=chip type=button data-tema=light>Claro</button></div>' +
    '</div>' +
    '<div class=bloco-menu><h3>Culto</h3><div class=linha-menu>' +
    `<a class=btn href="${esc(voltar)}">Voltar ao painel</a>` +
    `<a class=btn href="/musica/${esc(atual.slug)}?tom=${encodeURIComponent(atual.tom)}">Abrir cifra solta</a>` +
    '</div></div>' +
    '</div></div>';

  return envelope({
    titulo: `${atual.musica.titulo} — ${atual.tom} — execução`,
    css: CSS + CSS_UI + CSS_CIFRA + CSS_EXEC,
    tema: 'dark',
    corpo,
    scripts: scriptExec(),
  });
}

/**
 * Os gestos, o autoscroll e a troca de tom sem recarregar.
 *
 * Tudo aqui é acréscimo: sem JavaScript a tela continua completa, porque
 * anterior, próxima, setlist e tom são links de verdade. `localStorage` pode
 * lançar, então toda leitura e escrita vai em try/catch.
 */
function scriptExec(): string {
  return `<script>
(function(){
  var doc=document.documentElement;
  // Gerados de \`site/tons.ts\` (que os deriva do núcleo): o ciclo do passo e a
  // classe de altura de cada tom oferecido.
  var CICLO=${JSON.stringify(CICLO)},PC=${JSON.stringify(CLASSE_DE_ALTURA)};
  function ler(k,padrao){try{var v=localStorage.getItem(k);return v===null?padrao:v}catch(e){return padrao}}
  function por(k,v){try{localStorage.setItem(k,v)}catch(e){}}

  // ------------------------------------------------ tema (o escuro é o padrão)
  var tema=ler('cifras:tema:exec','dark');
  function pintarTema(){
    doc.setAttribute('data-theme',tema);
    document.querySelectorAll('[data-tema]').forEach(function(b){
      b.setAttribute('aria-pressed',String(b.dataset.tema===tema));
    });
  }
  document.querySelectorAll('[data-tema]').forEach(function(b){
    b.addEventListener('click',function(){tema=b.dataset.tema;por('cifras:tema:exec',tema);pintarTema()});
  });
  pintarTema();

  // ------------------------------------------------ escala da cifra
  var KE='cifras:escala';
  function escala(){var v=parseFloat(ler(KE,'1.35'));return isFinite(v)?v:1.35}
  function porEscala(v){
    v=Math.min(2.6,Math.max(1,Math.round(v*100)/100));
    doc.style.setProperty('--esc',v);por(KE,v);
  }
  porEscala(escala());
  document.addEventListener('click',function(e){
    var b=e.target.closest('[data-fonte]');
    if(!b)return;
    e.preventDefault();
    porEscala(escala()+(b.dataset.fonte==='+'?0.15:-0.15));
  });

  // ------------------------------------------------ gavetas
  function abrir(id){
    var g=document.getElementById(id);
    if(!g)return;
    g.hidden=false;
    var atual=g.querySelector('[aria-current=true]');
    if(atual)atual.scrollIntoView({block:'center'});
  }
  function fecharTudo(){
    document.querySelectorAll('.exec-gaveta').forEach(function(g){g.hidden=true});
  }
  document.addEventListener('click',function(e){
    var a=e.target.closest('[data-abre]');
    if(a){abrir(a.dataset.abre);return}
    if(e.target.closest('[data-fecha]')){fecharTudo();return}
    // Clique no véu (fora da folha) fecha — alvo grande, sem precisão.
    var g=e.target.closest('.exec-gaveta');
    if(g&&!e.target.closest('.folha'))fecharTudo();
  });
  document.addEventListener('keydown',function(e){
    if(e.key==='Escape'){fecharTudo();return}
    if(e.target&&/^(INPUT|TEXTAREA)$/.test(e.target.tagName))return;
    if(e.key==='ArrowRight')irPara('ir-proxima');
    if(e.key==='ArrowLeft')irPara('ir-anterior');
  });
  function irPara(id){var a=document.getElementById(id);if(a)location.href=a.href}

  // ------------------------------------------------ deslizar entre músicas
  // Só gesto horizontal decidido: 60px de deslocamento e o dobro do
  // movimento vertical. Rolar a cifra não pode trocar de música.
  var x0=null,y0=null,travado=false;
  addEventListener('touchstart',function(e){
    if(e.touches.length!==1||document.querySelector('.exec-gaveta:not([hidden])'))return;
    x0=e.touches[0].clientX;y0=e.touches[0].clientY;travado=false;
  },{passive:true});
  addEventListener('touchmove',function(e){
    if(x0===null||travado)return;
    var dx=e.touches[0].clientX-x0,dy=e.touches[0].clientY-y0;
    if(Math.abs(dy)>Math.abs(dx)){travado=true;return}
    if(Math.abs(dx)<60)return;
    travado=true;
    irPara(dx<0?'ir-proxima':'ir-anterior');
  },{passive:true});
  addEventListener('touchend',function(){x0=null;y0=null},{passive:true});

  // ------------------------------------------------ rolagem automática
  var KV='cifras:autoscroll';
  var vel=Math.min(5,Math.max(1,parseInt(ler(KV,'1'),10)||1));
  var ligado=false,resto=0,ultimo=0,quadro=null;
  var btn=document.getElementById('auto-liga'),mostra=document.getElementById('auto-vel');
  function pintarVel(){if(mostra)mostra.textContent=vel+'\\u00d7'}
  function passoScroll(t){
    if(!ligado)return;
    if(!ultimo)ultimo=t;
    // ~14 px/s por nível: devagar o suficiente para acompanhar cantando.
    resto+=(t-ultimo)/1000*14*vel;ultimo=t;
    var inteiro=Math.floor(resto);
    if(inteiro>0){
      resto-=inteiro;
      var antes=scrollY;
      scrollBy(0,inteiro);
      if(scrollY===antes&&antes>0)return desligar(); // chegou ao fim
    }
    quadro=requestAnimationFrame(passoScroll);
  }
  function ligar(){
    ligado=true;ultimo=0;resto=0;
    if(btn){btn.textContent='Parar';btn.setAttribute('aria-pressed','true')}
    quadro=requestAnimationFrame(passoScroll);
  }
  function desligar(){
    ligado=false;
    if(quadro)cancelAnimationFrame(quadro);
    if(btn){btn.textContent='Ativar';btn.setAttribute('aria-pressed','false')}
  }
  if(btn)btn.addEventListener('click',function(){ligado?desligar():ligar()});
  var menos=document.getElementById('auto-menos'),mais=document.getElementById('auto-mais');
  if(menos)menos.addEventListener('click',function(){vel=Math.max(1,vel-1);por(KV,vel);pintarVel()});
  if(mais)mais.addEventListener('click',function(){vel=Math.min(5,vel+1);por(KV,vel);pintarVel()});
  pintarVel();
  // Tocar na cifra pausa: a mão do músico é o botão mais próximo.
  document.getElementById('cifra').addEventListener('click',function(){if(ligado)desligar()});

  // ------------------------------------------------ tom sem recarregar
  var alvo=document.getElementById('cifra');
  if(!window.fetch||!window.history.replaceState)return;
  document.addEventListener('click',function(e){
    var a=e.target.closest('[data-tom-link]');
    if(!a||e.metaKey||e.ctrlKey||e.shiftKey||e.button)return;
    e.preventDefault();
    var tom=a.dataset.tom,slug=a.dataset.slug,destino=a.getAttribute('href');
    fetch('/musica/'+encodeURIComponent(slug)+'?tom='+encodeURIComponent(tom)+'&fragmento=1',
          {headers:{'Accept':'text/html'}})
      .then(function(r){if(!r.ok)throw 0;return r.text()})
      .then(function(html){
        alvo.innerHTML=html;
        document.getElementById('pastilha-tom').textContent=tom;
        var valor=document.getElementById('tom-valor');
        if(valor)valor.firstChild.nodeValue=tom;
        // O ?ordem= do destino já traz o tom novo: trocar a URL agora faz o
        // link do celular (e o recarregar) continuar valendo.
        history.replaceState({},'',destino);
        document.querySelectorAll('.grade-tons [data-tom-link]').forEach(function(o){
          o.setAttribute('aria-current',String(o.dataset.tom===tom));
        });
        recalcularLinks(destino);
        recalcularPasso(tom);
      })
      .catch(function(){location.href=destino});
  });

  /**
   * Depois de trocar o tom, todo link de NAVEGAÇÃO tem que carregar a ordem
   * nova — anterior, próxima, setlist, voltar ao painel.
   *
   * Os links de tom ficam de fora de propósito: cada um já aponta para "a
   * ordem com esta música neste tom", e isso continua verdade depois da
   * troca. Reescrevê-los com a ordem nova faria todos apontarem para o mesmo
   * tom.
   */
  function recalcularLinks(destino){
    var ordem=new URL(destino,location.origin).searchParams.get('ordem');
    if(!ordem)return;
    document.querySelectorAll('a[href]:not([data-tom-link])').forEach(function(a){
      var u;
      try{u=new URL(a.href)}catch(e){return}
      if(!u.searchParams.has('ordem'))return;
      u.searchParams.set('ordem',ordem);
      a.href=u.pathname+'?'+u.searchParams;
    });
  }

  /** O stepper aponta para o vizinho do tom ATUAL — reaponta pela grade. */
  function recalcularPasso(tom){
    var pc=PC[tom];
    document.querySelectorAll('[data-passo]').forEach(function(a){
      if(pc===undefined)return;
      var novo=CICLO[((pc+Number(a.dataset.passo))%12+12)%12];
      var naGrade=document.querySelector('.grade-tons [data-tom="'+novo+'"]');
      if(!naGrade)return;
      a.href=naGrade.getAttribute('href');
      a.dataset.tom=novo;
    });
  }
})();
</script>`;
}
