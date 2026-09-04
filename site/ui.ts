/**
 * O design system do painel: tokens, casca de navegação e primitivas.
 *
 * Duas experiências, um vocabulário
 * ---------------------------------
 * **Preparação** (desktop, fundo claro) e **execução** (celular, fundo
 * escuro) usam os mesmos tokens com valores diferentes — não são dois CSS.
 * O que muda é o papel: preparar é organizar, executar é ler.
 *
 * O que NÃO se mexe
 * -----------------
 * A cifra sai de `gerador-ts/html.ts::escrever` e o CSS do padrão visual vem
 * da constante `CSS` do mesmo emissor. Aqui só se acrescenta, e **só dentro
 * de `@media screen`**, para que imprimir continue produzindo o documento
 * validado em produção (A4, quebra de página, Arial, laranja `#ff6600`).
 *
 * No escuro os três tons do padrão são clareados (`--cifra`, `--rotulo`,
 * `--anot`) porque `#0000ff` sobre `#0f1113` é ilegível — é a mesma tinta,
 * ajustada para o fundo, e vale só na tela. O papel continua com a original.
 */
import { esc } from '../gerador-ts/html.ts';

/** Tokens + casca. Tudo em `@media screen`. */
export const CSS_UI = `
@media screen{
  :root{
    --ground:#f6f6f8; --surface:#fff; --raised:#eef0f4; --line:#e2e5ea;
    --ink:#16181d; --muted:#666d78;
    --acento:#5b2ee5; --acento-forte:#4a22c9; --acento-fraco:#f0ebff;
    --viva:#0f9d58; --alerta:#c4320a;
    --cifra:#ff6600; --rotulo:#0000ff; --anot:#9900ff; --letra:#1b1b1b;
    --sans:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;
    --raio:10px; --esc:1.35;
    --sombra:0 1px 2px rgba(16,18,29,.05);
    /* O trilho é a única superfície escura do modo claro — e é de propósito:
       ele é a tela de execução aparecendo dentro da tela de preparação. */
    --rail:#141227; --rail-ink:#eceafb; --rail-muted:#8f8ab0;
    --rail-hover:#231f42; --rail-linha:rgba(255,255,255,.09);
  }
  /* Escolha explícita: a execução abre com \`data-theme=dark\` no <html>. */
  :root[data-theme=dark]{
    --ground:#0d0f12; --surface:#14171b; --raised:#1e232a; --line:#282e36;
    --ink:#eceef1; --muted:#949ba6;
    --acento:#a78bfa; --acento-forte:#c4b5fd; --acento-fraco:#241b3d;
    --viva:#34d399; --alerta:#fca5a5;
    --cifra:#ff9147; --rotulo:#8fb4ff; --anot:#c9a3ff; --letra:#eceef1;
    --sombra:0 1px 2px rgba(0,0,0,.4);
    --rail:#171b21; --rail-ink:#eceef1; --rail-muted:#949ba6;
    --rail-hover:#1e232a; --rail-linha:rgba(255,255,255,.08);
  }
  @media (prefers-color-scheme:dark){
    :root:not([data-theme=light]){
      --ground:#0d0f12; --surface:#14171b; --raised:#1e232a; --line:#282e36;
      --ink:#eceef1; --muted:#949ba6;
      --acento:#a78bfa; --acento-forte:#c4b5fd; --acento-fraco:#241b3d;
      --viva:#34d399; --alerta:#fca5a5;
      --cifra:#ff9147; --rotulo:#8fb4ff; --anot:#c9a3ff; --letra:#eceef1;
      --sombra:0 1px 2px rgba(0,0,0,.4);
      --rail:#171b21; --rail-ink:#eceef1; --rail-muted:#949ba6;
      --rail-hover:#1e232a; --rail-linha:rgba(255,255,255,.08);
    }
  }

  *{box-sizing:border-box}
  html{-webkit-text-size-adjust:100%}
  body{margin:0;padding:0;max-width:none;background:var(--ground);color:var(--ink);
       font-family:var(--sans);font-size:15px;line-height:1.45}
  a{color:inherit}
  button{font:inherit;color:inherit;background:none;border:0;cursor:pointer}
  :focus-visible{outline:2px solid var(--acento);outline-offset:2px;border-radius:6px}
  [hidden]{display:none!important}
  h1,h2,h3{margin:0;line-height:1.2}

  /* ---------------------------------------------------- casca */
  .app{min-height:100vh}
  .lateral{display:none}
  .conteudo{min-width:0;padding-bottom:calc(64px + env(safe-area-inset-bottom))}
  .miolo{max-width:920px;margin:0 auto;padding:16px 16px 48px}
  /* A tela do culto é de duas colunas no desktop e precisa de mais folga que
     uma lista de leitura. As demais telas continuam em 920px. */
  .miolo.largo{max-width:1240px}

  /* barra de topo do celular */
  .barra-topo{position:sticky;top:0;z-index:20;display:flex;align-items:center;
      gap:10px;padding:10px 14px;background:var(--surface);
      border-bottom:1px solid var(--line)}
  .barra-topo .marca{flex:1 1 auto;min-width:0;font-weight:700;font-size:15px;
      letter-spacing:-.01em}
  .barra-topo .marca span{display:block;font-weight:500;font-size:11.5px;
      color:var(--muted);letter-spacing:.04em;text-transform:uppercase}
  .icone-btn{flex:0 0 auto;width:40px;height:40px;display:grid;place-items:center;
      border-radius:var(--raio);color:var(--muted);text-decoration:none}
  .icone-btn:hover{background:var(--raised);color:var(--ink)}
  .icone{width:20px;height:20px;display:block;fill:none;stroke:currentColor;
      stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}

  /* navegação inferior do celular */
  .abas{position:fixed;left:0;right:0;bottom:0;z-index:30;display:flex;
      background:var(--surface);border-top:1px solid var(--line);
      padding-bottom:env(safe-area-inset-bottom)}
  .abas a{flex:1 1 0;min-width:0;display:flex;flex-direction:column;
      align-items:center;justify-content:center;gap:3px;min-height:60px;
      text-decoration:none;color:var(--muted);font-size:11px;font-weight:600}
  .abas a[aria-current=page]{color:var(--acento)}
  .abas a span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%}

  /* ---------------------------------------------------- primitivas */
  .secao-tit{display:flex;align-items:baseline;gap:10px;margin:26px 0 10px;
      font-size:11.5px;font-weight:700;letter-spacing:.09em;
      text-transform:uppercase;color:var(--muted)}
  .secao-tit:first-child{margin-top:6px}
  .secao-tit em{font-style:normal;font-weight:600;letter-spacing:0;
      text-transform:none;font-size:12.5px}

  .btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;
      min-height:44px;padding:0 16px;border-radius:var(--raio);font-weight:600;
      font-size:14.5px;text-decoration:none;border:1px solid var(--line);
      background:var(--surface);color:var(--ink);white-space:nowrap}
  .btn:hover{border-color:var(--muted)}
  .btn-forte{background:var(--acento);border-color:var(--acento);color:#fff}
  .btn-forte:hover{background:var(--acento-forte);border-color:var(--acento-forte)}
  :root[data-theme=dark] .btn-forte{color:#16181d}
  @media (prefers-color-scheme:dark){
    :root:not([data-theme=light]) .btn-forte{color:#16181d}
    :root:not([data-theme=light]) .chip[aria-current=true],
    :root:not([data-theme=light]) .chip[aria-pressed=true]{color:#16181d}
  }
  .btn-fantasma{border-color:transparent;background:transparent;color:var(--muted)}
  .btn-fantasma:hover{background:var(--raised);color:var(--ink)}
  .btn-grande{min-height:52px;padding:0 22px;font-size:16px}

  .chip{display:inline-flex;align-items:center;min-height:36px;padding:0 13px;
      border-radius:999px;background:var(--raised);color:var(--muted);
      font-size:13px;font-weight:600;text-decoration:none;white-space:nowrap}
  .chip[aria-current=true],.chip[aria-pressed=true]{background:var(--acento);color:#fff}
  :root[data-theme=dark] .chip[aria-current=true],
  :root[data-theme=dark] .chip[aria-pressed=true]{color:#16181d}
  .fila{display:flex;gap:7px;overflow-x:auto;scrollbar-width:none;
      -webkit-overflow-scrolling:touch;padding:2px 0}
  .fila::-webkit-scrollbar{display:none}

  /* Pastilha de tom: monoespaçada porque tom é dado, não texto.
     Aqui ela é ETIQUETA — o tom de uma linha de lista — e usa o acento. O
     laranja \`--cifra\` fica reservado para onde o tom é ESCOLHA sobre a cifra
     (o seletor de 16 e a grade da execução), para os dois papéis não se
     confundirem à distância de um braço. */
  .pastilha{flex:0 0 auto;display:inline-flex;align-items:center;
      justify-content:center;min-width:42px;min-height:30px;padding:0 8px;
      border-radius:8px;background:var(--acento-fraco);color:var(--acento);
      font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-weight:700;
      font-size:14px;text-decoration:none}
  .pastilha-forte{background:var(--cifra);color:#fff}

  .status{display:inline-flex;align-items:center;gap:7px;font-size:12.5px;
      font-weight:600;color:var(--muted)}
  .status::before{content:"";width:8px;height:8px;border-radius:50%;
      background:var(--muted)}
  .status[data-estado=ao-vivo]{color:var(--viva)}
  .status[data-estado=ao-vivo]::before{background:var(--viva);
      box-shadow:0 0 0 3px color-mix(in srgb,var(--viva) 22%,transparent)}
  .status[data-estado=encerrado]{color:var(--muted)}

  .campo{width:100%;min-height:48px;padding:10px 14px;font:inherit;font-size:16px;
      border:1px solid var(--line);border-radius:var(--raio);
      background:var(--surface);color:var(--ink)}
  .campo::placeholder{color:var(--muted)}
  .campo:focus{outline:none;border-color:var(--acento);
      box-shadow:0 0 0 3px var(--acento-fraco)}

  .painel{background:var(--surface);border:1px solid var(--line);
      border-radius:14px;padding:16px}

  /* Cartão: superfície branca com cabeçalho de rótulo. É a unidade de
     composição da tela do culto. */
  .cartao{background:var(--surface);border:1px solid var(--line);
      border-radius:14px;box-shadow:var(--sombra);overflow:hidden}
  .cartao-topo{display:flex;flex-wrap:wrap;align-items:center;gap:10px;
      padding:14px 16px;border-bottom:1px solid var(--line)}
  .cartao-topo .quem{flex:1 1 180px;min-width:0}
  .cartao-topo h2,.cartao-topo h3{font-size:16px;letter-spacing:-.01em}
  .cartao-topo .rot{display:block;margin-bottom:3px;font-size:11px;
      font-weight:700;letter-spacing:.09em;text-transform:uppercase;
      color:var(--muted)}
  .cartao-topo .sub{margin:4px 0 0;color:var(--muted);font-size:12.5px}
  .cartao-rodape{padding:11px 16px;border-top:1px solid var(--line);
      background:var(--ground);color:var(--muted);font-size:12.5px}
  .aviso{color:var(--muted);font-size:13.5px;line-height:1.55}
  .vazio{padding:28px 4px;color:var(--muted);font-size:15px}

  /* ---------------------------------------------------- desktop */
  @media (min-width:900px){
    .app{display:grid;grid-template-columns:248px minmax(0,1fr)}
    .abas,.barra-topo{display:none}
    .conteudo{padding-bottom:0}
    .miolo{padding:32px 40px 64px}
    .lateral{display:flex;flex-direction:column;gap:3px;position:sticky;top:0;
        height:100vh;padding:18px 12px;background:var(--rail);
        color:var(--rail-ink);border-right:0}
    .lateral .marca{display:flex;align-items:center;gap:11px;
        padding:6px 8px 22px;font-weight:700;font-size:17px;
        letter-spacing:-.02em}
    .lateral .marca .selo{flex:0 0 auto;width:34px;height:34px;display:grid;
        place-items:center;border-radius:10px;background:var(--acento);
        color:#fff}
    .lateral .marca .selo .icone{width:19px;height:19px}
    .lateral .marca .nome{min-width:0}
    .lateral .marca .nome span{display:block;font-weight:500;font-size:10.5px;
        color:var(--rail-muted);letter-spacing:.08em;text-transform:uppercase;
        margin-top:2px}
    .grupo-nav{margin-top:16px;padding:0 10px 7px;font-size:10px;font-weight:700;
        letter-spacing:.13em;text-transform:uppercase;color:var(--rail-muted)}
    .lateral a{display:flex;align-items:center;gap:11px;min-height:42px;
        padding:0 11px;border-radius:var(--raio);text-decoration:none;
        color:var(--rail-muted);font-size:14.5px;font-weight:500}
    .lateral a:hover{background:var(--rail-hover);color:var(--rail-ink)}
    /* Pílula cheia no destino atual: a lateral é escura, então o acento
       preenche em vez de tingir — tinta fraca sobre fundo escuro some. */
    .lateral a[aria-current=page]{background:var(--acento);color:#fff;
        font-weight:600}
    .lateral :focus-visible{outline-color:var(--rail-ink)}
    /* No escuro o acento clareia (\`#a78bfa\`), e branco sobre ele não se lê —
       mesma correção que o \`.btn-forte\` já faz. */
    :root[data-theme=dark] .lateral a[aria-current=page],
    :root[data-theme=dark] .lateral .marca .selo{color:#16181d}
    @media (prefers-color-scheme:dark){
      :root:not([data-theme=light]) .lateral a[aria-current=page],
      :root:not([data-theme=light]) .lateral .marca .selo{color:#16181d}
    }
    .lateral .rodape-nav{margin-top:auto;padding-top:12px;
        border-top:1px solid var(--rail-linha)}
  }
}
@media print{
  .lateral,.abas,.barra-topo,.exec-topo,.exec-rodape,.exec-gaveta,
  .btn,.chip,.fila,.aviso,.so-tela{display:none!important}
  .conteudo,.miolo{padding:0!important;max-width:none!important}
}
`;

/** A cifra do emissor, na tela: escala, tinta do tema, sem quebra de linha. */
export const CSS_CIFRA = `
@media screen{
  /* Especificidade acima do CSS do emissor (\`.c\`, \`p\`), e só na tela: no
     papel continua saindo a tinta validada em produção. */
  .cifra p{font-size:calc(12pt * var(--esc));line-height:1.4;color:var(--letra)}
  .cifra .h{font-size:calc(15pt * var(--esc))}
  .cifra .c{color:var(--cifra)}
  .cifra .l{color:var(--rotulo)}
  .cifra .a{color:var(--anot)}
  /* Acorde e anotação nunca quebram: o alinhamento sobre a sílaba depende
     disso — daí a rolagem horizontal em vez de reflow. */
  .cifra .c,.cifra .a{white-space:nowrap}
  .cifra{overflow-x:auto;-webkit-overflow-scrolling:touch}
}
@media print{
  .cifra{overflow:visible;padding:0}
}
`;

export interface ItemNav {
  href: string;
  rotulo: string;
  /** Rótulo curto da aba do celular, quando o de desktop é longo. */
  curto?: string;
  icone: keyof typeof ICONES;
  /** Aparece na navegação inferior do celular? */
  aba?: boolean;
}

/** Traços de 24×24, `stroke=currentColor`. Sem biblioteca de ícones. */
const ICONES = {
  culto: '<path d="M4 19V6.5a1 1 0 0 1 .7-.95l6-1.8a1 1 0 0 1 1.3.95V19"/><path d="M12 19V8.2l6.3 1.9a1 1 0 0 1 .7.95V19"/><path d="M3 19h18"/>',
  musicas: '<circle cx="7" cy="17.5" r="2.5"/><circle cx="17" cy="15.5" r="2.5"/><path d="M9.5 17.5v-11l10-2v11"/>',
  buscar: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>',
  historico: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  config: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1v.3a2 2 0 1 1-4 0v-.2a1.6 1.6 0 0 0-2.7-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3 15a2 2 0 1 1 0-4h.2A1.6 1.6 0 0 0 4.4 8.3l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 10 4.4a2 2 0 1 1 4 0v.2a1.6 1.6 0 0 0 2.7 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.6 1.6 0 0 0 21 11a2 2 0 1 1 0 4h-.2a1.6 1.6 0 0 0-1.4 1"/>',
  perfil: '<circle cx="12" cy="8.5" r="3.5"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/>',
} as const;

export function icone(nome: keyof typeof ICONES): string {
  return `<svg class=icone viewBox="0 0 24 24" aria-hidden="true">${ICONES[nome]}</svg>`;
}

/**
 * A navegação inteira do painel — quatro destinos, e nada mais.
 *
 * Transposição, escala de fonte, filtro por tom e troca de música moram
 * **dentro** da tela que precisa delas. Menu não é catálogo de funções: quem
 * está no palco procura a música, não o item de menu.
 */
export const NAV: { grupo: string; itens: ItemNav[] }[] = [
  {
    grupo: 'Operação',
    itens: [
      { href: '/', rotulo: 'Culto', icone: 'culto', aba: true },
      { href: '/musicas', rotulo: 'Músicas', icone: 'musicas', aba: true },
    ],
  },
  { grupo: 'Biblioteca', itens: [{ href: '/buscar', rotulo: 'Buscar', icone: 'buscar', aba: true }] },
  {
    grupo: 'Histórico',
    itens: [{ href: '/cultos', rotulo: 'Cultos anteriores', curto: 'Cultos', icone: 'historico', aba: true }],
  },
];

const NAV_RODAPE: ItemNav[] = [
  { href: '/configuracoes', rotulo: 'Configurações', icone: 'config' },
  { href: '/perfil', rotulo: 'Perfil', icone: 'perfil' },
];

function itemLateral(item: ItemNav, ativo: string): string {
  const atual = item.href === ativo ? ' aria-current=page' : '';
  return `<a href="${item.href}"${atual}>${icone(item.icone)}<span>${esc(item.rotulo)}</span></a>`;
}

function lateral(ativo: string): string {
  const grupos = NAV.map(
    (g) =>
      `<div class=grupo-nav>${esc(g.grupo)}</div>` + g.itens.map((i) => itemLateral(i, ativo)).join(''),
  ).join('');
  const rodape = NAV_RODAPE.map((i) => itemLateral(i, ativo)).join('');
  return (
    '<nav class=lateral aria-label="Navegação principal">' +
    `<div class=marca><span class=selo>${icone('musicas')}</span>` +
    '<span class=nome>Cifras<span>Painel de operação</span></span></div>' +
    grupos +
    `<div class=rodape-nav>${rodape}</div></nav>`
  );
}

function abas(ativo: string): string {
  const itens = NAV.flatMap((g) => g.itens)
    .filter((i) => i.aba)
    .map((i) => {
      const atual = i.href === ativo ? ' aria-current=page' : '';
      return `<a href="${i.href}"${atual}>${icone(i.icone)}<span>${esc(i.curto ?? i.rotulo)}</span></a>`;
    })
    .join('');
  return `<nav class=abas aria-label="Navegação">${itens}</nav>`;
}

function barraTopo(): string {
  return (
    '<div class=barra-topo>' +
    '<div class=marca>Cifras<span>Painel de operação</span></div>' +
    `<a class=icone-btn href="/configuracoes" aria-label="Configurações">${icone('config')}</a>` +
    '</div>'
  );
}

/**
 * Aplica o tema salvo antes da primeira pintura, para a tela não piscar
 * branco antes de escurecer. `localStorage` pode lançar (navegador com dados
 * de site bloqueados) — tudo em try/catch, e a página funciona sem ele.
 */
export const SCRIPT_TEMA = `<script>
(function(){
  try{
    var t=localStorage.getItem('cifras:tema');
    if(t==='dark'||t==='light')document.documentElement.setAttribute('data-theme',t);
  }catch(e){}
})();
</script>`;

/** Envelope de página. `noindex` sempre: isto é ferramenta interna da banda. */
export function envelope(opcoes: {
  titulo: string;
  css: string;
  corpo: string;
  scripts?: string;
  /** `data-theme` fixo — a execução abre no escuro. */
  tema?: 'dark' | 'light';
  classeCorpo?: string;
}): string {
  const tema = opcoes.tema ? ` data-theme=${opcoes.tema}` : '';
  const classe = opcoes.classeCorpo ? ` class="${opcoes.classeCorpo}"` : '';
  return (
    `<!doctype html><html lang="pt-BR"${tema}><head><meta charset="UTF-8">` +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<meta name="robots" content="noindex, nofollow">' +
    '<meta name="color-scheme" content="light dark">' +
    `<title>${esc(opcoes.titulo)}</title>` +
    `<style>${opcoes.css}</style>${opcoes.tema ? '' : SCRIPT_TEMA}</head>` +
    `<body${classe}>${opcoes.corpo}${opcoes.scripts ?? ''}</body></html>`
  );
}

/** Página de preparação: casca de navegação + miolo. */
export function paginaPainel(opcoes: {
  titulo: string;
  ativo: string;
  css: string;
  miolo: string;
  scripts?: string;
  /** Duas colunas no desktop — hoje só a tela do culto. */
  largo?: boolean;
}): string {
  return envelope({
    titulo: opcoes.titulo,
    css: opcoes.css,
    scripts: opcoes.scripts,
    corpo:
      '<div class=app>' +
      lateral(opcoes.ativo) +
      '<div class=conteudo>' +
      barraTopo() +
      `<main class="miolo${opcoes.largo ? ' largo' : ''}">${opcoes.miolo}</main>` +
      '</div></div>' +
      abas(opcoes.ativo),
  });
}
