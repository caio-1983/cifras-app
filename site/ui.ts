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
 * `--anot`) porque `#0000ff` sobre `#0b0f14` é ilegível — é a mesma tinta,
 * ajustada para o fundo, e vale só na tela. O papel continua com a original.
 *
 * De onde vem a cor
 * -----------------
 * Os neutros e o acento saem da logo (`IntegraMusic.png`): o gradiente
 * azul→verde-lima sobre navy. O **azul** é o acento — ação, seleção, foco; o
 * **verde-lima** é reservado a "ao vivo", que é estado e não ação; o **navy**
 * é o trilho e o fundo da execução. O laranja `--cifra` é anterior à marca e
 * não entra nessa conta: é o padrão do papel. Justificativa e contrastes
 * conferidos em `DESIGN.md`.
 */
import { esc } from '../gerador-ts/html.ts';

/** O nome do produto, num lugar só — aba, lateral e barra do topo. */
const NOME_PRODUTO = 'Integra Music';

/** Tokens + casca. Tudo em `@media screen`. */
export const CSS_UI = `
@media screen{
  :root{
    --ground:#f4f7fb; --surface:#fff; --raised:#e9eef5; --line:#dde4ed;
    --ink:#141820; --muted:#5f6874;
    --acento:#0072bd; --acento-forte:#00609f; --acento-fraco:#ebf4fd;
    --viva:#267d30; --alerta:#b6322b;
    /* Verde é estado positivo (preparado, realizado) e amarelo é só alerta —
       nunca ação. O azul continua sendo a única tinta de ação da tela. */
    --viva-fraca:#e7f5e9; --aviso:#8a5a00; --aviso-fraco:#fdf4e3;
    --cifra:#ff6600; --rotulo:#0000ff; --anot:#9900ff; --letra:#1b1b1b;
    --sans:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;
    --raio:10px; --esc:1.35;
    --sombra:0 1px 2px rgba(16,18,29,.05);
    /* O trilho é a única superfície escura do modo claro — e é de propósito:
       ele é a tela de execução aparecendo dentro da tela de preparação. */
    --rail:#0d1e2f; --rail-ink:#e9eff6; --rail-muted:#96a3b3;
    --rail-hover:#16293c; --rail-linha:rgba(255,255,255,.10);
  }
  /* Escolha explícita: a execução abre com \`data-theme=dark\` no <html>. */
  :root[data-theme=dark]{
    --ground:#0b0f14; --surface:#13171d; --raised:#1c222b; --line:#262e39;
    --ink:#e9edf2; --muted:#939dab;
    --acento:#69c1fc; --acento-forte:#8ad0ff; --acento-fraco:#0f2940;
    --viva:#6ed889; --alerta:#f19e97;
    --viva-fraca:#12301c; --aviso:#f0c471; --aviso-fraco:#33270f;
    --cifra:#ff9147; --rotulo:#8fb4ff; --anot:#c9a3ff; --letra:#e9edf2;
    --sombra:0 1px 2px rgba(0,0,0,.4);
    --rail:#161c24; --rail-ink:#e9edf2; --rail-muted:#9aa4b2;
    --rail-hover:#202935; --rail-linha:rgba(255,255,255,.08);
  }
  @media (prefers-color-scheme:dark){
    :root:not([data-theme=light]){
      --ground:#0b0f14; --surface:#13171d; --raised:#1c222b; --line:#262e39;
      --ink:#e9edf2; --muted:#939dab;
      --acento:#69c1fc; --acento-forte:#8ad0ff; --acento-fraco:#0f2940;
      --viva:#6ed889; --alerta:#f19e97;
    --viva-fraca:#12301c; --aviso:#f0c471; --aviso-fraco:#33270f;
      --cifra:#ff9147; --rotulo:#8fb4ff; --anot:#c9a3ff; --letra:#e9edf2;
      --sombra:0 1px 2px rgba(0,0,0,.4);
      --rail:#161c24; --rail-ink:#e9edf2; --rail-muted:#9aa4b2;
      --rail-hover:#202935; --rail-linha:rgba(255,255,255,.08);
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

  /* O \`p\` do emissor é regra de PAPEL, e ela vazava para o cromo.
     \`gerador-ts/html.ts\` define \`p{margin:0;font-family:Arial;font-size:12pt;
     line-height:1.15;color:#1b1b1b}\` — o padrão do Google Docs. Como
     \`CSS_PAINEL\` concatena o CSS do emissor, TODO parágrafo do painel herdava
     as cinco: os avisos e subtítulos saíam em Arial no meio de uma interface
     em fonte de sistema, com entrelinha 1,15 (medido) em vez de 1,45.

     O \`color\` era o mais perigoso dos cinco: \`#1b1b1b\` sobre \`--ground\`
     escuro é quase invisível, e só não apareceu porque hoje toda classe de
     parágrafo define a própria cor. O próximo \`<p>\` sem classe nasceria cego.

     \`margin:0\` é o único que fica: o painel conta com ele e dá as margens
     por classe. Isto vale só na tela — no papel a regra do emissor continua
     intacta, que é o documento validado em produção. \`.cifra p\` recupera as
     suas em \`CSS_CIFRA\`, logo abaixo. */
  p{font-family:var(--sans);font-size:inherit;line-height:inherit;color:inherit}

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
  .barra-topo .marca .selo-topo{height:20px;width:auto;max-width:52px;
      object-fit:contain;vertical-align:-4px;margin-right:7px}
  .barra-topo .marca{flex:1 1 auto;min-width:0;font-weight:700;font-size:15px;
      letter-spacing:-.01em;display:flex;align-items:center;
      text-decoration:none;color:inherit}

  /* Sol no escuro, lua no claro: o ícone mostra o que o toque FAZ. A troca é
     por CSS para nascer certa, sem esperar script e sem piscar. */
  .tema-btn .ico-sol,.tema-btn .ico-lua{display:none}
  .tema-btn .ico-lua{display:block}
  :root[data-theme=dark] .tema-btn .ico-lua{display:none}
  :root[data-theme=dark] .tema-btn .ico-sol{display:block}
  @media (prefers-color-scheme:dark){
    :root:not([data-theme=light]) .tema-btn .ico-lua{display:none}
    :root:not([data-theme=light]) .tema-btn .ico-sol{display:block}
  }
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
  :root[data-theme=dark] .btn-forte{color:#0b1220}
  @media (prefers-color-scheme:dark){
    :root:not([data-theme=light]) .btn-forte{color:#0b1220}
    :root:not([data-theme=light]) .chip[aria-current=true],
    :root:not([data-theme=light]) .chip[aria-pressed=true]{color:#0b1220}
  }
  .btn-fantasma{border-color:transparent;background:transparent;color:var(--muted)}
  .btn-fantasma:hover{background:var(--raised);color:var(--ink)}
  .btn-grande{min-height:52px;padding:0 22px;font-size:16px}

  .chip{display:inline-flex;align-items:center;min-height:36px;padding:0 13px;
      border-radius:999px;background:var(--raised);color:var(--muted);
      font-size:13px;font-weight:600;text-decoration:none;white-space:nowrap}
  .chip[aria-current=true],.chip[aria-pressed=true]{background:var(--acento);color:#fff}
  :root[data-theme=dark] .chip[aria-current=true],
  :root[data-theme=dark] .chip[aria-pressed=true]{color:#0b1220}
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
  .pastilha-forte{background:var(--cifra);color:#0b1220}

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
  .aviso{max-width:68ch;color:var(--muted);font-size:13.5px;line-height:1.55;
      text-wrap:pretty}
  .vazio{padding:28px 4px;color:var(--muted);font-size:15px}
  /* Cabeçalho de coluna que só existe para o leitor de tela: a coluna de ação
     é óbvia no olho e um rótulo "Ação" ali seria ruído. */
  .so-leitor{position:absolute;width:1px;height:1px;padding:0;margin:-1px;
      overflow:hidden;clip-path:inset(50%);white-space:nowrap}

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
        padding:6px 8px 18px;font-weight:700;font-size:17px;
        letter-spacing:-.02em;text-decoration:none;color:inherit;
        min-height:0;border-radius:0}
    .lateral .marca:hover{background:none;color:inherit}
    /* A marca traz as próprias cores, então o slot não tinge nada: só
       reserva a altura e deixa a imagem caber inteira. object-fit:contain
       com largura automática aceita marca quadrada ou deitada sem recortar —
       é o que faz trocar a logo ser trocar o arquivo. */
    .lateral .marca .selo{flex:0 0 auto;height:34px;width:auto;max-width:88px;
        object-fit:contain;object-position:left center}
    .lateral .marca .nome{min-width:0}
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
    /* No escuro o acento clareia (\`#69c1fc\`), e branco sobre ele não se lê —
       mesma correção que o \`.btn-forte\` já faz. */
    :root[data-theme=dark] .lateral a[aria-current=page]{color:#0b1220}
    @media (prefers-color-scheme:dark){
      :root:not([data-theme=light]) .lateral a[aria-current=page]{color:#0b1220}
    }
    .lateral .rodape-nav{margin-top:auto;padding-top:12px;
        border-top:1px solid var(--rail-linha)}
  }
}
@media print{
  .lateral,.abas,.barra-topo,.exec-topo,.exec-rodape,.exec-gaveta,
  .btn,.chip,.fila,.aviso,.so-tela{display:none!important}
  .conteudo,.miolo{padding:0!important;max-width:none!important}
  /* O chão da home é luz de tela; no papel vira mancha cinza. Fica por último
     de propósito: a primeira regra deste bloco é a lista de \`display:none\`, e
     há teste ancorado nela. */
  body.home{background:none!important}
}
`;

/** A cifra do emissor, na tela: escala, tinta do tema, sem quebra de linha. */
export const CSS_CIFRA = `
@media screen{
  /* Especificidade acima do CSS do emissor (\`.c\`, \`p\`), e só na tela: no
     papel continua saindo a tinta validada em produção. */
  /* A Arial volta aqui, e não é preferência estética: o alinhamento do acorde
     sobre a sílaba foi calculado pelo emissor contra ESTA fonte. Trocar a
     família da cifra desalinha a linha posicional — é o erro que o núcleo
     inteiro existe para não cometer. */
  .cifra p{font-family:Arial,sans-serif;
      font-size:calc(12pt * var(--esc));line-height:1.4;color:var(--letra)}
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
  inicio: '<path d="M4 10.5 12 4l8 6.5"/><path d="M6 9.6V20h12V9.6"/><path d="M10 20v-5h4v5"/>',
  mais: '<path d="M12 5v14"/><path d="M5 12h14"/>',
  agenda: '<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 9.5h17"/><path d="M8 3.5v3M16 3.5v3"/>',
  culto:'<path d="M4 19V6.5a1 1 0 0 1 .7-.95l6-1.8a1 1 0 0 1 1.3.95V19"/><path d="M12 19V8.2l6.3 1.9a1 1 0 0 1 .7.95V19"/><path d="M3 19h18"/>',
  musicas: '<circle cx="7" cy="17.5" r="2.5"/><circle cx="17" cy="15.5" r="2.5"/><path d="M9.5 17.5v-11l10-2v11"/>',
  // Livro fechado com fita de marcador: o hinário é um livro, e a fita é o
  // que o distingue do ícone de música (notas) e do de culto (o templo).
  hinario: '<path d="M5 4.5h11.5A2.5 2.5 0 0 1 19 7v13H7.5A2.5 2.5 0 0 1 5 17.5Z"/><path d="M5 17.5A2.5 2.5 0 0 1 7.5 15H19"/><path d="M10.5 4.5v6l2-1.5 2 1.5v-6"/>',
  buscar: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>',
  historico: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  config: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1v.3a2 2 0 1 1-4 0v-.2a1.6 1.6 0 0 0-2.7-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3 15a2 2 0 1 1 0-4h.2A1.6 1.6 0 0 0 4.4 8.3l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 10 4.4a2 2 0 1 1 4 0v.2a1.6 1.6 0 0 0 2.7 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.6 1.6 0 0 0 21 11a2 2 0 1 1 0 4h-.2a1.6 1.6 0 0 0-1.4 1"/>',
  perfil: '<circle cx="12" cy="8.5" r="3.5"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/>',
  sol: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.2M12 19.3v2.2M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6"/>',
  lua: '<path d="M20 13.5A8.2 8.2 0 0 1 10.5 4a8.5 8.5 0 1 0 9.5 9.5Z"/>',
} as const;

export function icone(nome: keyof typeof ICONES): string {
  return `<svg class=icone viewBox="0 0 24 24" aria-hidden="true">${ICONES[nome]}</svg>`;
}

/**
 * A navegação inteira do painel — destinos de **conteúdo**, e nada mais.
 *
 * **Início** é a operação: a home responde qual é o próximo culto, se ele está
 * preparado e o que fazer agora. O culto aberto não é item de menu porque não
 * tem URL fixa — ele nasce do domingo que se clica ou do botão de novo culto.
 *
 * Transposição, escala de fonte, filtro por tom e troca de música moram
 * **dentro** da tela que precisa delas. Menu não é catálogo de funções: quem
 * está no palco procura a música, não o item de menu. Buscar, pelo mesmo
 * motivo, não é destino: é o topo de **Músicas**, que é onde o acervo está.
 *
 * **Hinário** é a exceção que confirma a regra, e por isso mora no mesmo grupo
 * de Músicas em vez de virar um quarto grupo. Não é uma função a mais nem um
 * filtro da biblioteca com nome bonito: é a mesma música acessada por outra
 * chave. Ninguém procura hino pelo nome — diz o número ("vamos no 422"), e
 * `/musicas` é ordenada por título, que é a ordem errada para isso. Duas
 * ordens do mesmo acervo são dois destinos; um filtro salvo não seria.
 */
export const NAV: { grupo: string; itens: ItemNav[] }[] = [
  {
    grupo: 'Operação',
    itens: [{ href: '/', rotulo: 'Início', icone: 'inicio', aba: true }],
  },
  {
    grupo: 'Biblioteca',
    itens: [
      { href: '/musicas', rotulo: 'Músicas', icone: 'musicas', aba: true },
      { href: '/hinario', rotulo: 'Hinário', icone: 'hinario', aba: true },
    ],
  },
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
    // A marca é o caminho de volta que todo mundo tenta primeiro.
    '<a class=marca href="/"><img class=selo src="/estatico/marca.png" alt="">' +
    `<span class=nome>${NOME_PRODUTO}</span></a>` +
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

/**
 * O botão de tema, no canto direito de toda tela de preparação.
 *
 * Estava só em Configurações, e trocar o tema virava uma viagem de ida sem
 * volta óbvia: quem entra por causa da aparência não está procurando um
 * destino, está ajustando a tela em que já estava.
 *
 * O ícone troca por **CSS**, não por script: mostra a ação (sol no escuro, lua
 * no claro) e já nasce certo, sem piscar. O nome acessível não pode depender
 * de CSS, então é neutro e verdadeiro nos dois estados. Nasce `hidden` porque
 * sem JavaScript ele não faria nada — o tema mora no aparelho, e o servidor
 * não tem onde guardá-lo.
 *
 * Alternar é claro↔escuro. **Automático continua em Configurações**: é a
 * terceira opção, e um botão de um toque que passeia por três estados não diz
 * onde vai parar.
 */
export function botaoTema(): string {
  return (
    '<button class="icone-btn tema-btn" data-trocar-tema type=button hidden ' +
    'aria-label="Alternar entre tema claro e escuro" title="Alternar tema">' +
    `<span class=ico-sol>${icone('sol')}</span>` +
    `<span class=ico-lua>${icone('lua')}</span></button>`
  );
}

/**
 * Aplica o tema alternado e guarda a escolha. Vive em toda tela de preparação,
 * junto do botão.
 */
export const SCRIPT_TROCA_TEMA = `<script>
(function(){
  // Todos: a home tem o botão no cabeçalho (computador) e na barra de topo
  // (celular). Um está sempre escondido por CSS, mas os dois existem.
  var botoes=document.querySelectorAll('[data-trocar-tema]');
  for(var i=0;i<botoes.length;i++)botoes[i].hidden=false;
  function trocar(){
    var r=document.documentElement;
    var escuro=r.getAttribute('data-theme')==='dark'||
      (!r.getAttribute('data-theme')&&window.matchMedia&&
       window.matchMedia('(prefers-color-scheme:dark)').matches);
    var novo=escuro?'light':'dark';
    r.setAttribute('data-theme',novo);
    try{localStorage.setItem('cifras:tema',novo)}catch(e){}
    // Configurações mostra os três estados; se ela estiver aberta, o grupo
    // acompanha em vez de contradizer o que a tela acabou de fazer.
    var g=document.querySelectorAll('[data-tema]');
    for(var j=0;j<g.length;j++)
      g[j].setAttribute('aria-pressed',String(g[j].getAttribute('data-tema')===novo));
  }
  for(var k=0;k<botoes.length;k++)botoes[k].addEventListener('click',trocar);
})();
</script>`;

function barraTopo(): string {
  return (
    '<div class=barra-topo>' +
    '<a class=marca href="/"><img class=selo-topo src="/estatico/marca.png" alt="">' +
    `${NOME_PRODUTO}</a>` +
    botaoTema() +
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
    `<title>${esc(opcoes.titulo)} · ${NOME_PRODUTO}</title>` +
    '<link rel=icon href="/estatico/icone.png" type="image/png">' +
    '<link rel="apple-touch-icon" href="/estatico/icone.png">' +
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
  /** Classe no `<body>`, para a tela que tem chão próprio (hoje só a home). */
  classeCorpo?: string;
}): string {
  return envelope({
    titulo: opcoes.titulo,
    css: opcoes.css,
    classeCorpo: opcoes.classeCorpo,
    corpo:
      '<div class=app>' +
      lateral(opcoes.ativo) +
      '<div class=conteudo>' +
      barraTopo() +
      `<main class="miolo${opcoes.largo ? ' largo' : ''}">${opcoes.miolo}</main>` +
      '</div></div>' +
      abas(opcoes.ativo),
    scripts: (opcoes.scripts ?? '') + SCRIPT_TROCA_TEMA,
  });
}
